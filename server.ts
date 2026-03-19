import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sqlcipher from "@journeyapps/sqlcipher";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

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

// Escape key for SQL safety - use single quotes
const escapedKey = DB_ENCRYPTION_KEY.replace(/'/g, "''");

const dbPath = process.env.NODE_ENV === "production" 
  ? "/app/data/messages.db" 
  : "messages.db";

const db = new Database(dbPath);
db.run(`PRAGMA key = '${escapedKey}'`);

// Helper functions
const run = (db: any, sql: string, params?: any[]) => {
  return new Promise<void>((resolve, reject) => {
    db.run(sql, params, function(err: any) {
      if (err) reject(err);
      else resolve();
    });
  });
};

const get = (db: any, sql: string, params?: any[]) => {
  return new Promise<any>((resolve, reject) => {
    db.get(sql, params, (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const exec = (db: any, sql: string) => {
  return new Promise<void>((resolve, reject) => {
    db.exec(sql, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Verify encryption
try {
  await get(db, "SELECT count(*) as count FROM sqlite_master");
} catch (err) {
  console.error("FATAL: Database encryption key is incorrect or database is corrupt");
  process.exit(1);
}

// Create table
try {
  await exec(db, `
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
} catch (err) {
  console.error("FATAL: Failed to create database table");
  process.exit(1);
}

async function startServer() {
  const app = express();

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
  });

  const createLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 20, // 20 creates per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Middleware
  const allowedOrigin = isProd ? process.env.APP_ORIGIN : true;
  
  if (isProd && !allowedOrigin) {
    console.error("FATAL: APP_ORIGIN environment variable is required in production");
    process.exit(1);
  }

  const corsOptions = {
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  
  // Apply rate limiting to API endpoints
  app.use("/api/", apiLimiter);
  
  app.use(express.json({ limit: '2mb' }));
  
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' https://stats.securenotes.me; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://stats.securenotes.me; connect-src 'self' https://stats.securenotes.me; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
    // No-store for message endpoints to prevent caching
    if (req.path.startsWith('/api/messages')) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // UUID validation helper
  const isValidUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // Health check endpoint for Docker/container orchestration
  app.get("/health", async (req, res) => {
    try {
      await get(db, "SELECT 1");
      res.json({ status: "healthy", encrypted: true });
    } catch (err) {
      res.status(503).json({ status: "unhealthy", error: "Database inaccessible" });
    }
  });

  app.post("/api/messages", createLimiter, async (req, res) => {
    const { encryptedContent, isPasswordProtected, expiresInMinutes, maxViews } = req.body;

    // Validate encrypted content
    if (typeof encryptedContent !== "string" || !encryptedContent.trim()) {
      return res.status(400).json({ error: "Encrypted content is required" });
    }

    // Check content length
    if (encryptedContent.length > 2_000_000) {
      return res.status(400).json({ error: "Encrypted content is too large" });
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

    // Validate UUID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

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

    // Validate UUID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

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

    // Add no-store headers for view pages to prevent caching
    if (req.path.startsWith("/view/")) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }

    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(3000, "0.0.0.0", () => {
    if (!isProd) console.log(`Server running on http://localhost:3000`);
  });
}

startServer();
