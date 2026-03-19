import express, { Request, Response, NextFunction } from "express";
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

const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;
if (!DB_ENCRYPTION_KEY) {
  console.error("FATAL: DB_ENCRYPTION_KEY environment variable is required");
  process.exit(1);
}

const APP_ORIGIN = process.env.APP_ORIGIN;
if (isProd && !APP_ORIGIN) {
  console.error("FATAL: APP_ORIGIN environment variable is required in production");
  process.exit(1);
}

const DB_PATH = isProd ? "/app/data/messages.db" : path.join(process.cwd(), "messages.db");
const PORT = Number(process.env.PORT || 3000);

const escapedKey = DB_ENCRYPTION_KEY.replace(/'/g, "''");

type DbLike = {
  run: (sql: string, params?: unknown[], cb?: (err: Error | null) => void) => void;
  get: (sql: string, params?: unknown[], cb?: (err: Error | null, row: unknown) => void) => void;
  exec: (sql: string, cb?: (err: Error | null) => void) => void;
};

type MessageRow = {
  id: string;
  content: string;
  is_password_protected: number;
  expires_at: string;
  view_count: number;
  max_views: number;
  created_at: string;
};

type CreateMessageBody = {
  encryptedContent?: unknown;
  isPasswordProtected?: unknown;
  expiresInMinutes?: unknown;
  maxViews?: unknown;
};

const db: DbLike = new Database(DB_PATH);

// ---------- DB helpers ----------

function run(dbConn: DbLike, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    dbConn.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function get<T>(dbConn: DbLike, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    dbConn.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

function exec(dbConn: DbLike, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    dbConn.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function withTransaction<T>(work: () => Promise<T>): Promise<T> {
  await run(db, "BEGIN IMMEDIATE TRANSACTION");
  try {
    const result = await work();
    await run(db, "COMMIT");
    return result;
  } catch (error) {
    try {
      await run(db, "ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw error;
  }
}

// ---------- Validation helpers ----------

function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function escapeCspSource(url: string): string {
  return url.replace(/'/g, "");
}

// ---------- Startup ----------

async function initializeDatabase(): Promise<void> {
  await exec(db, `PRAGMA key = '${escapedKey}'`);

  try {
    await get<{ count: number }>(db, "SELECT count(*) as count FROM sqlite_master");
  } catch {
    console.error("FATAL: Database encryption key is incorrect or database is corrupt");
    process.exit(1);
  }

  try {
    await exec(
      db,
      `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        is_password_protected INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT NOT NULL,
        view_count INTEGER NOT NULL DEFAULT 0,
        max_views INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);
      `
    );
  } catch {
    console.error("FATAL: Failed to create database schema");
    process.exit(1);
  }
}

// ---------- App ----------

async function startServer(): Promise<void> {
  await initializeDatabase();

  const app = express();

  const corsOptions = {
    origin: isProd ? APP_ORIGIN! : true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  };

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const createLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json({ limit: "2mb" }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const statsHost = "https://stats.securenotes.me";
    const csp = [
      "default-src 'self'",
      `script-src 'self' ${statsHost}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: ${statsHost}`,
      `connect-src 'self' ${statsHost}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", csp);

    if (req.path.startsWith("/api/messages")) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }

    next();
  });

  app.use("/api", apiLimiter);

  app.get("/health", async (_req: Request, res: Response) => {
    try {
      await get(db, "SELECT 1 as ok");
      res.json({ status: "healthy", encrypted: true });
    } catch {
      res.status(503).json({ status: "unhealthy", error: "Database inaccessible" });
    }
  });

  app.post("/api/messages", createLimiter, async (req: Request<{}, {}, CreateMessageBody>, res: Response) => {
    const { encryptedContent, isPasswordProtected, expiresInMinutes, maxViews } = req.body;

    if (typeof encryptedContent !== "string" || !encryptedContent.trim()) {
      return res.status(400).json({ error: "Encrypted content is required" });
    }

    if (encryptedContent.length > 2_000_000) {
      return res.status(400).json({ error: "Encrypted content is too large" });
    }

    const safeExpiresInMinutes = clampNumber(expiresInMinutes, 60, 1, 10080);
    const safeMaxViews = clampNumber(maxViews, 1, 1, 100);
    const safeIsPasswordProtected = Boolean(isPasswordProtected);

    const id = uuidv4();
    const expiresAt = new Date(Date.now() + safeExpiresInMinutes * 60 * 1000).toISOString();

    try {
      await run(
        db,
        `
        INSERT INTO messages (
          id,
          content,
          is_password_protected,
          expires_at,
          max_views
        ) VALUES (?, ?, ?, ?, ?)
        `,
        [id, encryptedContent, safeIsPasswordProtected ? 1 : 0, expiresAt, safeMaxViews]
      );

      return res.json({ id, expiresAt });
    } catch (error) {
      if (!isProd) console.error(error);
      return res.status(500).json({ error: "Failed to create message" });
    }
  });

  app.get("/api/messages/:id", async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    try {
      const message = await get<MessageRow>(db, "SELECT * FROM messages WHERE id = ?", [id]);

      if (!message) {
        return res.status(404).json({ error: "Message not found or already destroyed" });
      }

      if (new Date(message.expires_at).getTime() <= Date.now()) {
        await run(db, "DELETE FROM messages WHERE id = ?", [id]);
        return res.status(410).json({ error: "Message has expired" });
      }

      return res.json({
        encryptedContent: message.content,
      });
    } catch (error) {
      if (!isProd) console.error(error);
      return res.status(500).json({ error: "Failed to retrieve message" });
    }
  });

  app.post("/api/messages/:id/view", async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    try {
      const result = await withTransaction(async () => {
        const message = await get<MessageRow>(db, "SELECT * FROM messages WHERE id = ?", [id]);

        if (!message) {
          return { status: 404 as const, body: { error: "Message not found or already destroyed" } };
        }

        if (new Date(message.expires_at).getTime() <= Date.now()) {
          await run(db, "DELETE FROM messages WHERE id = ?", [id]);
          return { status: 410 as const, body: { error: "Message has expired" } };
        }

        const newViewCount = message.view_count + 1;
        const isLastView = newViewCount >= message.max_views;

        if (isLastView) {
          await run(db, "DELETE FROM messages WHERE id = ?", [id]);
        } else {
          await run(db, "UPDATE messages SET view_count = ? WHERE id = ?", [newViewCount, id]);
        }

        return {
          status: 200 as const,
          body: {
            success: true,
            isLastView,
            remainingViews: isLastView ? 0 : message.max_views - newViewCount,
          },
        };
      });

      return res.status(result.status).json(result.body);
    } catch (error) {
      if (!isProd) console.error(error);
      return res.status(500).json({ error: "Failed to confirm view" });
    }
  });

  setInterval(async () => {
    try {
      await run(db, "DELETE FROM messages WHERE expires_at < ?", [new Date().toISOString()]);
    } catch {
      // silent cleanup
    }
  }, 60_000);

  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));

  app.get("*", (req: Request, res: Response) => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      return res.status(404).json({ error: "API endpoint not found" });
    }

    if (req.path.startsWith("/view/")) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }

    return res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    if (!isProd) {
      console.log(`Server running on http://localhost:${PORT}`);
    }
  });
}

startServer().catch((error) => {
  console.error("FATAL: Failed to start server", error);
  process.exit(1);
});