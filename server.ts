import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sqlcipher from "@journeyapps/sqlcipher";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const { Database } = sqlcipher;
const isProd = process.env.NODE_ENV === "production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Encrypted Database
const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;
if (!DB_ENCRYPTION_KEY) {
  console.error("FATAL: DB_ENCRYPTION_KEY environment variable is required");
  process.exit(1);
}

const dbPath = process.env.NODE_ENV === "production" 
  ? "/app/data/messages.db" 
  : "messages.db";

const db = new Database(dbPath);
db.run(`PRAGMA KEY = "${DB_ENCRYPTION_KEY}"`);

// Verify encryption
try {
  db.get("SELECT count(*) as count FROM sqlite_master");
} catch (err) {
  console.error("FATAL: Database encryption key is incorrect or database is corrupt");
  process.exit(1);
}

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    is_password_protected INTEGER,
    expires_at DATETIME NOT NULL,
    view_count INTEGER DEFAULT 0,
    max_views INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Helper functions
const run = (db: Database, sql: string, params?: any[]) => {
  return new Promise<void>((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
};

const get = (db: Database, sql: string, params?: any[]) => {
  return new Promise<any>((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function startServer() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.options('*', cors());
  app.use(express.json({ limit: '10mb' }));
  
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // No-store for message endpoints to prevent caching
    if (req.path.startsWith('/api/messages')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    next();
  });

  // Health check endpoint for Docker/container orchestration
  app.get("/health", async (req, res) => {
    try {
      await get(db, "SELECT 1");
      res.json({ status: "healthy", encrypted: true });
    } catch (err) {
      res.status(503).json({ status: "unhealthy", error: "Database inaccessible" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    const { encryptedContent, isPasswordProtected, expiresInMinutes, maxViews } = req.body;

    if (!encryptedContent) {
      return res.status(400).json({ error: "Encrypted content is required" });
    }

    // Validate and clamp inputs
    const safeExpiresInMinutes = Math.min(Math.max(Number(expiresInMinutes) || 60, 1), 10080); // 1 min to 7 days
    const safeMaxViews = Math.min(Math.max(Number(maxViews) || 1, 1), 100); // 1 to 100 views

    const id = uuidv4();
    const expiresAt = new Date(Date.now() + safeExpiresInMinutes * 60 * 1000).toISOString();
    
    // Store pre-encrypted content directly - server cannot decrypt
    // Store password protection flag for metadata only (no hash)
    try {
      await run(db, "INSERT INTO messages (id, content, is_password_protected, expires_at, max_views) VALUES (?, ?, ?, ?, ?)", 
        [id, encryptedContent, isPasswordProtected ? 1 : 0, expiresAt, safeMaxViews]);
      
      res.json({ id, expiresAt });
    } catch (err) {
      if (!isProd) console.error(err);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Fetch encrypted message (read-only)
  app.get("/api/messages/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const message = await get(db, "SELECT * FROM messages WHERE id = ?", [id]);

      if (!message) {
        return res.status(404).json({ error: "Message not found or already destroyed" });
      }

      // Check expiration
      if (new Date(message.expires_at) < new Date()) {
        await run(db, "DELETE FROM messages WHERE id = ?", [id]);
        return res.status(410).json({ error: "Message has expired" });
      }

      // Return encrypted content without deleting/incrementing
      res.json({ 
        encryptedContent: message.content
      });
    } catch (err) {
      if (!isProd) console.error(err);
      res.status(500).json({ error: "Failed to retrieve message" });
    }
  });

  // Confirm view (increment or delete after successful decryption)
  app.post("/api/messages/:id/view", async (req, res) => {
    const { id } = req.params;

    try {
      // Begin transaction for atomicity
      await run(db, "BEGIN IMMEDIATE TRANSACTION");
      
      const message = await get(db, "SELECT * FROM messages WHERE id = ?", [id]);

      if (!message) {
        await run(db, "ROLLBACK");
        return res.status(404).json({ error: "Message not found or already destroyed" });
      }

      // Double-check expiration
      if (new Date(message.expires_at) < new Date()) {
        await run(db, "DELETE FROM messages WHERE id = ?", [id]);
        await run(db, "COMMIT");
        return res.status(410).json({ error: "Message has expired" });
      }

      // Check if this is the last view and delete atomically if so
      const newViewCount = message.view_count + 1;
      const isLastView = newViewCount >= message.max_views;
      
      if (isLastView) {
        await run(db, "DELETE FROM messages WHERE id = ?", [id]);
      } else {
        await run(db, "UPDATE messages SET view_count = ? WHERE id = ?", [newViewCount, id]);
      }
      
      await run(db, "COMMIT");

      res.json({ 
        success: true,
        isLastView: isLastView
      });
    } catch (err) {
      try {
        await run(db, "ROLLBACK");
      } catch (rollbackErr) {
        // Ignore rollback errors
      }
      if (!isProd) console.error(err);
      res.status(500).json({ error: "Failed to confirm view" });
    }
  });

  // Cleanup expired messages periodically
  setInterval(async () => {
    try {
      await run(db, "DELETE FROM messages WHERE expires_at < datetime('now')");
    } catch (err) {
      // Silent cleanup
    }
  }, 60000);

  // Static files and catch-all route (MUST come after API routes)
  // Force production mode - serve static files
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  // Catch-all for SPA - only if not an API route
  app.get("*", (req, res) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(3000, "0.0.0.0", () => {
    if (!isProd) console.log(`Server running on http://localhost:3000`);
  });
}

startServer();
