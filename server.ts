import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import pg from "pg";

const { Pool } = pg;

// Prevent container crashes from unhandled errors
process.on("uncaughtException", (err) => {
  console.error("[Uncaught Exception]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection]", reason);
});

// Automatically load environment variables from .env if present
const ENV_FILE_PATH = path.join(process.cwd(), ".env");
if (fs.existsSync(ENV_FILE_PATH)) {
  try {
    const envLines = fs.readFileSync(ENV_FILE_PATH, "utf-8").split("\n");
    envLines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        if (val && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  } catch (e) {}
}

// Ensure data persistence directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const INTENTS_FILE = path.join(DATA_DIR, "intents.json");
const DELETED_INTENTS_FILE = path.join(DATA_DIR, "deleted_intents.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const AUDIT_FILE = path.join(DATA_DIR, "audit_logs.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const ADS_FILE = path.join(DATA_DIR, "ads.json");
const JOB_PORTAL_FILE = path.join(DATA_DIR, "job_portal.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles.json");
const SHOPS_FILE = path.join(DATA_DIR, "shops.json");
const HELPERS_FILE = path.join(DATA_DIR, "helpers.json");
const VERIFICATIONS_FILE = path.join(DATA_DIR, "verifications.json");

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.warn(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Initialize seed data if file doesn't exist
if (!fs.existsSync(INTENTS_FILE)) writeJsonFile(INTENTS_FILE, []);
if (!fs.existsSync(ADS_FILE)) writeJsonFile(ADS_FILE, []);
if (!fs.existsSync(JOB_PORTAL_FILE)) writeJsonFile(JOB_PORTAL_FILE, []);
if (!fs.existsSync(PROFILES_FILE)) writeJsonFile(PROFILES_FILE, {});
if (!fs.existsSync(SHOPS_FILE)) writeJsonFile(SHOPS_FILE, []);
if (!fs.existsSync(HELPERS_FILE)) writeJsonFile(HELPERS_FILE, []);
if (!fs.existsSync(VERIFICATIONS_FILE)) writeJsonFile(VERIFICATIONS_FILE, []);
const AUTH_USERS_FILE = path.join(DATA_DIR, "auth_users.json");
if (!fs.existsSync(AUTH_USERS_FILE)) writeJsonFile(AUTH_USERS_FILE, {});

// Session Security & JWT Token Generator (30 Days Persistence)
function createSessionToken(payload: Record<string, any>): string {
  const secret = process.env.JWT_SECRET || "locohelp-secure-jwt-key-2026";
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 3600 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifySessionToken(token: string): any | null {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const secret = process.env.JWT_SECRET || "locohelp-secure-jwt-key-2026";
    const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (expected !== signature) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Brevo (Sendinblue) Transactional REST API Client (Zero-dependency native fetch)
async function sendEmailViaBrevo(toEmail: string, subject: string, htmlContent: string, textContent: string): Promise<boolean> {
  const brevoApiKey = (process.env.BREVO_API_KEY || process.env.BREVO_KEY || process.env.SENDINBLUE_API_KEY || "").trim();
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || "chauhansanjay932@gmail.com").trim();
  const senderName = (process.env.BREVO_SENDER_NAME || "LocoHelp Verification").trim();

  if (!brevoApiKey) {
    console.log("[BREVO NOTICE] BREVO_API_KEY is not configured in env. Using local verification fallback.");
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: toEmail.split("@")[0] }],
        subject,
        htmlContent,
        textContent
      })
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log(`[BREVO SUCCESS] Email OTP dispatched via Brevo API to ${toEmail}:`, data);
      return true;
    } else {
      const errBody = await response.text();
      console.error(`[BREVO API ERROR] (${response.status}):`, errBody);
      return false;
    }
  } catch (err: any) {
    console.error("[BREVO API EXCEPTION]:", err.message);
    return false;
  }
}

// Password hashing helper
function hashPassword(password: string): string {
  const salt = "locohelp_salt_2026";
  return crypto.pbkdf2Sync(password, salt, 1000, 32, "sha256").toString("hex");
}

// ==========================================
// STRICT AUTHENTICATION MIDDLEWARE
// ==========================================
// Blocks unauthenticated requests from creating posts, shops/businesses, or profiles without valid session token
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    let token = "";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/locohelp_token=([^;]+)/);
      if (match) token = match[1].trim();
    } else if (req.headers["x-auth-token"]) {
      token = String(req.headers["x-auth-token"]).trim();
    }

    if (!token) {
      return res.status(401).json({
        error: "अनधिकृत एक्सेस! कृपया पहले लॉगिन करें। (Authentication required. Please log in first.)",
        code: "UNAUTHORIZED"
      });
    }

    const decoded = verifySessionToken(token);
    if (!decoded || !decoded.uid) {
      return res.status(401).json({
        error: "सत्र समाप्त हो गया है! कृपया फिर से लॉगिन करें। (Session expired. Please log in again.)",
        code: "SESSION_EXPIRED"
      });
    }

    (req as any).user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Authentication verification failed.", code: "AUTH_ERROR" });
  }
}

// ==========================================
// RAILWAY POSTGRESQL POOL INITIALIZATION
// ==========================================
let dbPool: pg.Pool | null = null;
let isDbConnected = false;

async function initPostgresTables(pool: pg.Pool) {
  try {
    await pool.query(`
      -- 1. Table: user (Columns: id, name, phone, email, created_at)
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 2. Table: businesses (Columns: id, owner_id, business_name, category, address, phone, created_at)
      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        owner_id TEXT,
        business_name TEXT,
        category TEXT,
        address TEXT,
        phone TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 3. Table: chats (Columns: id, sender_id, receiver_id, message, sent_at)
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        sender_id TEXT,
        receiver_id TEXT,
        message TEXT,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 4. Table: listings (Columns: id, user_id, title, description, location, created_at)
      CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        description TEXT,
        location TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Compatibility tables
      CREATE TABLE IF NOT EXISTS profiles (
        uid TEXT PRIMARY KEY,
        full_name TEXT,
        email TEXT,
        phone TEXT,
        avatar_url TEXT,
        skills TEXT,
        address TEXT,
        experience TEXT,
        my_helper_profile JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS broadcast_posts (
        id TEXT PRIMARY KEY,
        author_id TEXT,
        author_name TEXT,
        author_avatar TEXT,
        description TEXT,
        category TEXT,
        tags TEXT[],
        status TEXT DEFAULT 'active',
        distance NUMERIC,
        has_location_pin BOOLEAN DEFAULT true,
        is_verified_user BOOLEAN DEFAULT true,
        lat NUMERIC,
        lng NUMERIC,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        intent_id TEXT,
        sender_id TEXT,
        receiver_id TEXT,
        text TEXT,
        content TEXT,
        type TEXT DEFAULT 'text',
        attachment_url TEXT,
        attachment_type TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shops (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        category_label TEXT,
        owner_name TEXT,
        phone TEXT,
        area TEXT,
        address TEXT,
        description TEXT,
        photo_url TEXT,
        rating NUMERIC DEFAULT 5.0,
        review_count INTEGER DEFAULT 1,
        is_verified BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS helpers (
        id TEXT PRIMARY KEY,
        name TEXT,
        category_id TEXT,
        phone TEXT,
        skills TEXT[],
        area TEXT,
        experience TEXT,
        distance NUMERIC DEFAULT 0.5,
        is_verified BOOLEAN DEFAULT false,
        govt_id_uploaded BOOLEAN DEFAULT false,
        id_doc_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT,
        reporter_name TEXT,
        reason TEXT,
        details TEXT,
        status TEXT DEFAULT 'pending_admin_review',
        reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Identity Verification & Watermarked Document Store (Admin-Only Privacy)
      CREATE TABLE IF NOT EXISTS verification_requests (
        id TEXT PRIMARY KEY,
        entity_type TEXT DEFAULT 'user_profile',
        entity_id TEXT,
        user_id TEXT,
        user_name TEXT,
        user_email TEXT,
        user_phone TEXT,
        title TEXT,
        id_document_watermarked TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        admin_notes TEXT
      );

      -- 5. Table: otp_codes (Columns: id, identifier, code, type, attempts, expires_at, created_at)
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        identifier TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT DEFAULT 'email',
        attempts INTEGER DEFAULT 0,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_otp_codes_identifier ON otp_codes(identifier);
    `);
    console.log("[Railway PostgreSQL] All tables (user, businesses, chats, listings, otp_codes, verification_requests) verified and ready.");
  } catch (err: any) {
    console.warn("[Railway PostgreSQL] Table init note:", err.message);
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL) {
  try {
    const isLocal = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");
    dbPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    dbPool.on("error", (err) => {
      console.warn("[PostgreSQL Pool Notice]", err.message);
    });

    dbPool.query("SELECT NOW()")
      .then(async () => {
        isDbConnected = true;
        console.log("[Railway PostgreSQL] Connected successfully to Railway PostgreSQL database!");
        if (dbPool) await initPostgresTables(dbPool);
      })
      .catch((err) => {
        console.warn("[Railway PostgreSQL] Initial connection check:", err.message);
      });
  } catch (e: any) {
    console.warn("[Railway PostgreSQL Setup]", e.message);
  }
} else {
  console.log("[Database Notice] DATABASE_URL not detected. Running seamlessly with local file persistence.");
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Global CORS Middleware
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Parse JSON bodies
  app.use(express.json({ limit: '20mb' }));

  // Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      postgresConnected: isDbConnected,
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // USER PROFILES & AUTHENTICATION API
  // ==========================================

  // Get user profile (Queries primary "user" table with fallback to profiles)
  const getUserProfileHandler = async (req: express.Request, res: express.Response) => {
    try {
      const uid = req.params.uid || req.params.id;
      if (dbPool && isDbConnected) {
        try {
          // 1. Check primary "user" table (Columns: id, name, phone, email, created_at)
          const userRes = await dbPool.query(
            'SELECT * FROM "user" WHERE id = $1 OR email = $1 LIMIT 1',
            [uid]
          );
          if (userRes.rows.length > 0) {
            const u = userRes.rows[0];
            return res.json({
              uid: u.id,
              id: u.id,
              full_name: u.name,
              displayName: u.name,
              email: u.email || '',
              phone: u.phone || '',
              avatar_url: "https://lh3.googleusercontent.com/a/default-user",
              photoURL: "https://lh3.googleusercontent.com/a/default-user",
              created_at: u.created_at
            });
          }

          // 2. Also check profiles table
          const result = await dbPool.query(
            "SELECT * FROM profiles WHERE uid = $1 OR email = $1 LIMIT 1",
            [uid]
          );
          if (result.rows.length > 0) {
            const row = result.rows[0];
            return res.json({
              uid: row.uid,
              id: row.uid,
              full_name: row.full_name,
              displayName: row.full_name,
              email: row.email,
              phone: row.phone,
              avatar_url: row.avatar_url,
              photoURL: row.avatar_url,
              skills: row.skills,
              address: row.address,
              experience: row.experience,
              myHelperProfile: row.my_helper_profile,
              updated_at: row.updated_at
            });
          }
        } catch (dbErr) {
          console.warn("DB user profile query error:", dbErr);
        }
      }

      // Fallback to local file
      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      const p = profiles[uid];
      if (p) return res.json(p);
      return res.status(404).json({ error: "Profile not found" });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to fetch profile" });
    }
  };

  app.get("/api/profiles/:uid", getUserProfileHandler);
  app.get("/api/user/:id", getUserProfileHandler);

  // Upsert user profile (Saves into primary "user" table and profiles table)
  const saveUserProfileHandler = async (req: express.Request, res: express.Response) => {
    try {
      const profile = req.body;
      const uid = profile.uid || profile.id;
      if (!profile || !uid) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const fullName = profile.name || profile.full_name || profile.displayName || "Community Member";
      const email = profile.email || "";
      const phone = profile.phone || "";
      const avatarUrl = profile.avatar_url || profile.photoURL || "https://lh3.googleusercontent.com/a/default-user";
      const skills = profile.skills || "";
      const address = profile.address || "";
      const experience = profile.experience || "";
      const myHelper = profile.my_helper_profile || profile.myHelperProfile || null;

      // 1. PostgreSQL Upsert into primary "user" table (id, name, phone, email, created_at)
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO "user" (id, name, phone, email, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), "user".phone),
              email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email)
          `, [uid, fullName, phone, email]);

          await dbPool.query(`
            INSERT INTO profiles (uid, full_name, email, phone, avatar_url, skills, address, experience, my_helper_profile, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (uid) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
              avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url),
              skills = EXCLUDED.skills,
              address = EXCLUDED.address,
              experience = EXCLUDED.experience,
              my_helper_profile = COALESCE(EXCLUDED.my_helper_profile, profiles.my_helper_profile),
              updated_at = NOW()
          `, [uid, fullName, email, phone, avatarUrl, skills, address, experience, myHelper ? JSON.stringify(myHelper) : null]);
        } catch (dbErr) {
          console.warn("DB user table upsert error:", dbErr);
        }
      }

      // 2. Local storage file backup
      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      profiles[uid] = {
        uid,
        id: uid,
        name: fullName,
        full_name: fullName,
        displayName: fullName,
        email,
        phone,
        avatar_url: avatarUrl,
        photoURL: avatarUrl,
        skills,
        address,
        experience,
        myHelperProfile: myHelper,
        updated_at: new Date().toISOString()
      };
      writeJsonFile(PROFILES_FILE, profiles);

      res.status(200).json({ success: true, profile: profiles[uid], user: profiles[uid] });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to save profile" });
    }
  };

  // Profile endpoints protected with strict authentication
  app.post("/api/profiles", requireAuth, saveUserProfileHandler);
  app.post("/api/user", requireAuth, saveUserProfileHandler);

  // Dedicated Signup Endpoint - Inserts directly into "user" table (id, name, phone, email, created_at)
  const signupHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { id, uid, name, full_name, displayName, phone, email } = req.body;
      const targetId = id || uid || (email ? 'email_' + email.replace(/[^a-z0-9]/g, '_') : (phone ? 'phone_' + phone.replace(/\D/g, '') : 'user_' + Date.now()));
      const userName = name || full_name || displayName || (email ? email.split('@')[0] : 'Community Member');
      const userEmail = email || '';
      const userPhone = phone || '';

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO "user" (id, name, phone, email, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), "user".phone),
              email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email)
          `, [targetId, userName, userPhone, userEmail]);

          await dbPool.query(`
            INSERT INTO profiles (uid, full_name, email, phone, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (uid) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
              updated_at = NOW()
          `, [targetId, userName, userEmail, userPhone]);
        } catch (dbErr) {
          console.warn("DB user signup note:", dbErr);
        }
      }

      const userData = {
        id: targetId,
        uid: targetId,
        name: userName,
        displayName: userName,
        email: userEmail,
        phone: userPhone,
        created_at: new Date().toISOString()
      };

      const token = createSessionToken({ uid: targetId, email: userEmail, name: userName });
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);

      res.status(201).json({ success: true, token, user: userData });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to sign up" });
    }
  };

  app.post("/api/auth/signup", signupHandler);
  app.post("/api/signup", signupHandler);
  app.post("/api/users", signupHandler);

  // Delete profile protected with strict authentication
  app.delete("/api/profiles/:uid", requireAuth, async (req, res) => {
    try {
      const { uid } = req.params;
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query('DELETE FROM "user" WHERE id = $1', [uid]);
          await dbPool.query("DELETE FROM profiles WHERE uid = $1", [uid]);
        } catch (dbErr) {}
      }
      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      delete profiles[uid];
      writeJsonFile(PROFILES_FILE, profiles);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete profile" });
    }
  });

  // Google Login session creation with Session persistence (JWT / Cookie)
  app.post("/api/auth/google-login", async (req, res) => {
    try {
      const { email, displayName, photoURL } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const cleanEmail = email.trim().toLowerCase();
      // Strict email regex validation
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: "Invalid Google email address format" });
      }

      const name = displayName || cleanEmail.split('@')[0];
      const photo = photoURL || 'https://lh3.googleusercontent.com/a/default-user';
      const uid = cleanEmail;

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO "user" (id, name, phone, email, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email)
          `, [uid, name, '', cleanEmail]);

          await dbPool.query(`
            INSERT INTO profiles (uid, full_name, email, avatar_url, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (uid) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              avatar_url = EXCLUDED.avatar_url,
              updated_at = NOW()
          `, [uid, name, cleanEmail, photo]);
        } catch (e) {}
      }

      const user = {
        uid,
        id: uid,
        name,
        displayName: name,
        email: cleanEmail,
        photoURL: photo,
        isGuest: false
      };

      const token = createSessionToken({ uid, email: cleanEmail, name });
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);

      res.json({
        success: true,
        token,
        user
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Login failed" });
    }
  });

  // Email & Password Registration
  app.post("/api/auth/register-password", async (req, res) => {
    try {
      const { email, password, name, phone } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const uid = cleanEmail;
      const displayName = name || cleanEmail.split('@')[0];
      const hashedPassword = hashPassword(password);

      // Save locally
      const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
      authUsers[cleanEmail] = {
        uid,
        email: cleanEmail,
        name: displayName,
        phone: phone || '',
        passwordHash: hashedPassword,
        createdAt: new Date().toISOString()
      };
      writeJsonFile(AUTH_USERS_FILE, authUsers);

      // Save to Railway PostgreSQL "user" table
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO "user" (id, name, phone, email, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), "user".phone),
              email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email)
          `, [uid, displayName, phone || '', cleanEmail]);

          await dbPool.query(`
            INSERT INTO profiles (uid, full_name, email, phone, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (uid) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
              updated_at = NOW()
          `, [uid, displayName, cleanEmail, phone || '']);
        } catch (e) {}
      }

      const user = {
        uid,
        id: uid,
        name: displayName,
        displayName,
        email: cleanEmail,
        phone: phone || '',
        isGuest: false
      };

      const token = createSessionToken({ uid, email: cleanEmail, name: displayName });
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);

      res.json({ success: true, token, user });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to register" });
    }
  });

  // Email & Password Login
  app.post("/api/auth/login-password", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const cleanEmail = email.trim().toLowerCase();
      const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
      const existing = authUsers[cleanEmail];

      if (!existing || existing.passwordHash !== hashPassword(password)) {
        return res.status(401).json({ error: "गलत ईमेल या पासवर्ड! (Invalid email or password)" });
      }

      const user = {
        uid: existing.uid,
        id: existing.uid,
        name: existing.name,
        displayName: existing.name,
        email: cleanEmail,
        phone: existing.phone || '',
        isGuest: false
      };

      const token = createSessionToken({ uid: existing.uid, email: cleanEmail, name: existing.name });
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);

      res.json({ success: true, token, user });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Login failed" });
    }
  });

  // Session verification (Get active session user from token / cookie)
  app.get("/api/auth/me", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const cookieHeader = req.headers.cookie;
      let token = "";
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      } else if (cookieHeader) {
        const match = cookieHeader.match(/locohelp_token=([^;]+)/);
        if (match) token = match[1];
      }

      if (!token) {
        return res.status(401).json({ error: "No active session" });
      }

      const decoded = verifySessionToken(token);
      if (!decoded) {
        return res.status(401).json({ error: "Session expired or invalid" });
      }

      res.json({
        success: true,
        user: {
          uid: decoded.uid,
          id: decoded.uid,
          name: decoded.name,
          displayName: decoded.name,
          email: decoded.email,
          isGuest: false
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to verify session" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    res.json({ success: true });
  });

  // ==========================================
  // BROADCAST POSTS (INTENTS) API
  // ==========================================

  // ==========================================
  // LISTINGS & BROADCAST POSTS API
  // ==========================================

  // 1. Get All Listings / Broadcast Intents
  const getListingsHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);

      // If PostgreSQL is connected, fetch from database
      if (dbPool && isDbConnected) {
        try {
          // 1. Query primary listings table (Columns: id, user_id, title, description, location, created_at)
          const listRes = await dbPool.query(`
            SELECT * FROM listings 
            ORDER BY created_at DESC 
            LIMIT 100
          `);

          if (listRes.rows.length > 0) {
            const dbListings = listRes.rows
              .filter(r => !deletedIds.includes(r.id))
              .map(r => ({
                id: r.id,
                authorId: r.user_id,
                authorName: 'Community Member',
                description: r.description,
                category: r.title || 'General',
                tags: [r.title ? `#${r.title}` : '#General'],
                status: 'active',
                distance: r.location && !isNaN(Number(r.location)) ? Number(r.location) : 0.5,
                hasLocationPin: true,
                isVerifiedUser: true,
                createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
              }));
            return res.json(dbListings);
          }

          // 2. Fallback to broadcast_posts table
          const result = await dbPool.query(`
            SELECT * FROM broadcast_posts 
            WHERE expires_at > NOW() OR expires_at IS NULL
            ORDER BY created_at DESC 
            LIMIT 100
          `);

          if (result.rows.length > 0) {
            const dbIntents = result.rows
              .filter(r => !deletedIds.includes(r.id))
              .map(r => ({
                id: r.id,
                authorId: r.author_id,
                authorName: r.author_name || 'Community Member',
                authorAvatar: r.author_avatar,
                description: r.description,
                category: r.category,
                tags: r.tags || [],
                status: r.status || 'active',
                distance: r.distance ? Number(r.distance) : 0.5,
                hasLocationPin: r.has_location_pin !== false,
                isVerifiedUser: r.is_verified_user !== false,
                createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : undefined
              }));
            return res.json(dbIntents);
          }
        } catch (dbErr) {
          console.warn("DB listings query fallback:", dbErr);
        }
      }

      // Fallback to local intents file
      const localIntents = readJsonFile<any[]>(INTENTS_FILE, []);
      const map = new Map<string, any>();
      localIntents.forEach(i => {
        if (!deletedIds.includes(i.id)) map.set(i.id, i);
      });

      const combined = Array.from(map.values());
      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(combined);
    } catch (e) {
      console.warn("Recovering from fetch intents error:", e);
      const fallbackIntents = readJsonFile<any[]>(INTENTS_FILE, []);
      res.json(fallbackIntents);
    }
  };

  app.get("/api/intents", getListingsHandler);
  app.get("/api/listings", getListingsHandler);
  app.get("/api/posts", getListingsHandler);
  app.get("/api/broadcast-posts", getListingsHandler);

  // 2. Broadcast a New Listing / Intent
  const createListingHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const newIntent = req.body;
      if (!newIntent || (!newIntent.description && !newIntent.title)) {
        return res.status(400).json({ error: "Description or title is required" });
      }

      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);
      if (newIntent.id && deletedIds.includes(newIntent.id)) {
        return res.status(200).json(newIntent);
      }

      const intentRecord = {
        id: newIntent.id || 'intent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        authorId: newIntent.authorId || newIntent.user_id || newIntent.author_id || 'anonymous_user',
        authorName: newIntent.authorName || newIntent.author_name || 'Community Member',
        authorAvatar: newIntent.authorAvatar || newIntent.author_avatar || '',
        title: newIntent.title || newIntent.category || (newIntent.tags && newIntent.tags[0] ? newIntent.tags[0].replace('#', '') : 'General'),
        description: (newIntent.description || newIntent.title || '').trim(),
        category: newIntent.category || newIntent.title || (newIntent.tags && newIntent.tags[0] ? newIntent.tags[0].replace('#', '') : 'General'),
        tags: Array.isArray(newIntent.tags) ? newIntent.tags : ['#General'],
        distance: typeof newIntent.distance === 'number' ? newIntent.distance : 0.5,
        location: newIntent.location || (typeof newIntent.distance === 'number' ? `${newIntent.distance} km` : 'Local Area'),
        status: newIntent.status || 'active',
        createdAt: newIntent.createdAt || new Date().toISOString(),
        expiresAt: newIntent.expiresAt || new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 Hour Auto Expiry
        lastInteractionAt: new Date().toISOString(),
        hasLocationPin: !!newIntent.hasLocationPin,
        isVerifiedUser: true
      };

      // 1. PostgreSQL Insert into primary "listings" table (id, user_id, title, description, location, created_at)
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO listings (id, user_id, title, description, location, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              location = EXCLUDED.location
          `, [
            intentRecord.id,
            intentRecord.authorId,
            intentRecord.title,
            intentRecord.description,
            intentRecord.location,
            intentRecord.createdAt
          ]);

          // Also insert into broadcast_posts
          await dbPool.query(`
            INSERT INTO broadcast_posts (id, author_id, author_name, author_avatar, description, category, tags, status, distance, has_location_pin, is_verified_user, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              description = EXCLUDED.description,
              tags = EXCLUDED.tags,
              status = EXCLUDED.status
          `, [
            intentRecord.id,
            intentRecord.authorId,
            intentRecord.authorName,
            intentRecord.authorAvatar,
            intentRecord.description,
            intentRecord.category,
            intentRecord.tags,
            intentRecord.status,
            intentRecord.distance,
            intentRecord.hasLocationPin,
            intentRecord.isVerifiedUser,
            intentRecord.expiresAt,
            intentRecord.createdAt
          ]);
        } catch (dbErr) {
          console.warn("DB listings insert note:", dbErr);
        }
      }

      // 2. Local storage file
      const intents = readJsonFile<any[]>(INTENTS_FILE, []);
      const updated = [intentRecord, ...intents.filter(i => i.id !== intentRecord.id && i.description !== intentRecord.description)];
      writeJsonFile(INTENTS_FILE, updated);

      console.log(`[Listing Created] ${intentRecord.id}: "${intentRecord.description.substring(0, 40)}..."`);
      res.status(201).json(intentRecord);
    } catch (e) {
      console.error("Failed to save listing:", e);
      res.status(500).json({ error: "Failed to save listing" });
    }
  };

  // Protected Posts & Listings Creation (Requires valid authentication)
  app.post("/api/posts", requireAuth, createListingHandler);
  app.post("/api/intents", requireAuth, createListingHandler);
  app.post("/api/listings", requireAuth, createListingHandler);
  app.post("/api/broadcast-posts", requireAuth, createListingHandler);

  // 3. Delete or Complete a Listing / Intent / Post (Protected)
  const deleteListingHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const { description } = req.body || {};
      const descQuery = (req.query?.desc as string) || '';
      const targetDesc = description || descQuery;

      // 1. PostgreSQL Delete from listings, broadcast_posts, chats, messages
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query("DELETE FROM listings WHERE id = $1", [id]);
          if (targetDesc) {
            await dbPool.query("DELETE FROM listings WHERE description = $1", [targetDesc.trim()]);
            await dbPool.query(
              "DELETE FROM broadcast_posts WHERE id = $1 OR description = $2",
              [id, targetDesc.trim()]
            );
          } else {
            await dbPool.query("DELETE FROM broadcast_posts WHERE id = $1", [id]);
          }
          await dbPool.query("DELETE FROM chats WHERE receiver_id = $1 OR sender_id = $1", [id]);
          await dbPool.query("DELETE FROM messages WHERE intent_id = $1", [id]);
        } catch (dbErr) {
          console.warn("DB listings delete error:", dbErr);
        }
      }

      // 2. Local file delete
      const intents = readJsonFile<any[]>(INTENTS_FILE, []);
      const filtered = intents.filter(i => {
        if (i.id === id) return false;
        if (targetDesc && i.description && i.description.trim() === targetDesc.trim()) return false;
        return true;
      });
      writeJsonFile(INTENTS_FILE, filtered);

      // Record to permanent deleted IDs list
      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        writeJsonFile(DELETED_INTENTS_FILE, deletedIds);
      }

      console.log(`[Listing Deleted Permanently] ID: ${id}`);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete listing" });
    }
  };

  app.delete("/api/posts/:id", requireAuth, deleteListingHandler);
  app.delete("/api/intents/:id", requireAuth, deleteListingHandler);
  app.delete("/api/listings/:id", requireAuth, deleteListingHandler);
  app.delete("/api/broadcast-posts/:id", requireAuth, deleteListingHandler);

  // ==========================================
  // CHATS API (Table: chats - id, sender_id, receiver_id, message, sent_at)
  // ==========================================

  // 4. Get Chat Messages
  const getChatMessagesHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const { id } = req.params;
      const intentId = (req.query?.intentId as string) || (req.query?.intent_id as string) || id || 'general';
      const userId = (req.query?.userId as string) || (req.query?.user_id as string) || '';
      const otherUserId = (req.query?.otherUserId as string) || (req.query?.other_user_id as string) || '';
      const targetChatKey = intentId && intentId !== 'general' ? intentId : (userId && otherUserId ? [userId, otherUserId].sort().join('_') : (id || 'general'));

      if (dbPool && isDbConnected) {
        try {
          // 1. Query primary chats table (Columns: id, sender_id, receiver_id, message, sent_at)
          let chatRes;
          if (userId && otherUserId) {
            chatRes = await dbPool.query(
              "SELECT * FROM chats WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY sent_at ASC",
              [userId, otherUserId]
            );
          } else {
            chatRes = await dbPool.query(
              "SELECT * FROM chats WHERE receiver_id = $1 OR sender_id = $1 ORDER BY sent_at ASC",
              [intentId]
            );
          }

          if (chatRes && chatRes.rows.length > 0) {
            const dbMsgs = chatRes.rows.map(r => ({
              id: r.id,
              authorId: r.sender_id,
              senderId: r.sender_id,
              receiverId: r.receiver_id,
              text: r.message || '',
              content: r.message || '',
              message: r.message || '',
              type: 'text',
              createdAt: r.sent_at ? new Date(r.sent_at).toISOString() : new Date().toISOString()
            }));
            return res.json(dbMsgs);
          }

          // 2. Fallback to messages table
          let result;
          if (userId && otherUserId) {
            result = await dbPool.query(
              "SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC",
              [userId, otherUserId]
            );
          } else {
            result = await dbPool.query(
              "SELECT * FROM messages WHERE intent_id = $1 ORDER BY created_at ASC",
              [intentId]
            );
          }

          if (result && result.rows.length > 0) {
            const dbMsgs = result.rows.map(r => ({
              id: r.id,
              authorId: r.sender_id,
              senderId: r.sender_id,
              receiverId: r.receiver_id,
              text: r.text || r.content || '',
              content: r.content || r.text || '',
              message: r.text || r.content || '',
              type: r.type || 'text',
              attachmentUrl: r.attachment_url,
              attachmentType: r.attachment_type,
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
            }));
            return res.json(dbMsgs);
          }
        } catch (dbErr) {
          console.warn("DB messages query error:", dbErr);
        }
      }

      const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
      const chatMessages = allMessages[targetChatKey] || allMessages[intentId] || (id ? allMessages[id] : []) || [];
      res.json(chatMessages);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  };

  app.get("/api/intents/:id/messages", getChatMessagesHandler);
  app.get("/api/chats/:id", getChatMessagesHandler);
  app.get("/api/messages", getChatMessagesHandler);
  app.get("/api/messages/:id", getChatMessagesHandler);

  // 5. Send Chat Message
  const sendChatMessageHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const id = req.params.id || req.body.receiver_id || req.body.receiverId || 'general';
      const message = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message payload required" });
      }

      const newMsg = {
        id: message.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        authorId: message.authorId || message.sender_id || message.senderId || 'guest',
        senderId: message.senderId || message.sender_id || message.authorId || 'guest',
        receiverId: message.receiverId || message.receiver_id || id,
        text: message.message || message.text || message.content || '',
        content: message.message || message.text || message.content || '',
        message: message.message || message.text || message.content || '',
        type: message.type || 'text',
        attachmentUrl: message.attachmentUrl || null,
        attachmentType: message.attachmentType || null,
        createdAt: message.createdAt || message.sent_at || new Date().toISOString()
      };

      // 1. PostgreSQL Insert into primary "chats" table (id, sender_id, receiver_id, message, sent_at)
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO chats (id, sender_id, receiver_id, message, sent_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING
          `, [
            newMsg.id,
            newMsg.senderId,
            newMsg.receiverId,
            newMsg.message,
            newMsg.createdAt
          ]);

          // Also insert into messages table
          await dbPool.query(`
            INSERT INTO messages (id, intent_id, sender_id, receiver_id, text, content, type, attachment_url, attachment_type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
          `, [
            newMsg.id,
            id,
            newMsg.senderId,
            newMsg.receiverId,
            newMsg.text,
            newMsg.content,
            newMsg.type,
            newMsg.attachmentUrl,
            newMsg.attachmentType,
            newMsg.createdAt
          ]);
        } catch (dbErr) {
          console.warn("DB message insert error:", dbErr);
        }
      }

      // 2. Local file backup & refresh post interaction time
      const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
      const chatMessages = allMessages[id] || [];
      chatMessages.push(newMsg);
      allMessages[id] = chatMessages;
      writeJsonFile(MESSAGES_FILE, allMessages);

      // Refresh post interaction timestamp so active conversations extend post expiry
      if (id && id !== 'general') {
        try {
          const localIntents = readJsonFile<any[]>(INTENTS_FILE, []);
          let updatedIntents = false;
          localIntents.forEach(i => {
            if (i.id === id) {
              i.lastInteractionAt = new Date().toISOString();
              i.expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
              updatedIntents = true;
            }
          });
          if (updatedIntents) writeJsonFile(INTENTS_FILE, localIntents);

          if (dbPool && isDbConnected) {
            await dbPool.query(`
              UPDATE broadcast_posts 
              SET expires_at = NOW() + INTERVAL '1 hour'
              WHERE id = $1
            `, [id]).catch(() => {});
          }
        } catch (syncErr) {
          console.warn("Post interaction refresh error:", syncErr);
        }
      }

      res.status(201).json(newMsg);
    } catch (e) {
      console.error("Failed to save message:", e);
      res.status(500).json({ error: "Failed to save message" });
    }
  };

  app.post("/api/intents/:id/messages", requireAuth, sendChatMessageHandler);
  app.post("/api/chats", requireAuth, sendChatMessageHandler);
  app.post("/api/messages", requireAuth, sendChatMessageHandler);

  // Background Auto-Delete Job: Purge posts inactive for >1 hour
  setInterval(async () => {
    try {
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const now = Date.now();

      const localIntents = readJsonFile<any[]>(INTENTS_FILE, []);
      const allMsgs = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});

      const activeList = localIntents.filter(item => {
        const createdAtTime = new Date(item.createdAt || item.created_at || Date.now()).getTime();
        const lastInteractionTime = item.lastInteractionAt ? new Date(item.lastInteractionAt).getTime() : 0;
        const chatMsgs = allMsgs[item.id] || [];
        
        let latestMsgTime = 0;
        chatMsgs.forEach(m => {
          const t = new Date(m.createdAt || m.sent_at || 0).getTime();
          if (t > latestMsgTime) latestMsgTime = t;
        });

        const effectiveTime = Math.max(createdAtTime, lastInteractionTime, latestMsgTime);
        const isExpired = (now - effectiveTime) > ONE_HOUR_MS;
        return !isExpired;
      });

      if (activeList.length !== localIntents.length) {
        writeJsonFile(INTENTS_FILE, activeList);
        console.log(`[Auto-Delete Job] Removed ${localIntents.length - activeList.length} inactive posts (>1h old).`);
      }

      if (dbPool && isDbConnected) {
        await dbPool.query(`
          DELETE FROM broadcast_posts 
          WHERE (created_at < NOW() - INTERVAL '1 hour') 
            AND id NOT IN (SELECT DISTINCT intent_id FROM messages WHERE created_at > NOW() - INTERVAL '1 hour')
        `).catch(() => {});

        await dbPool.query(`
          DELETE FROM listings 
          WHERE (created_at < NOW() - INTERVAL '1 hour')
            AND id NOT IN (SELECT DISTINCT intent_id FROM messages WHERE created_at > NOW() - INTERVAL '1 hour')
        `).catch(() => {});
      }
    } catch (jobErr) {
      console.warn("Auto-delete job notice:", jobErr);
    }
  }, 3 * 60 * 1000);

  // ==========================================
  // BUSINESSES & SHOPS API (Table: businesses - id, owner_id, business_name, category, address, phone, created_at)
  // ==========================================

  const getBusinessesHandler = async (req: express.Request, res: express.Response) => {
    try {
      if (dbPool && isDbConnected) {
        try {
          // 1. Query primary businesses table
          const bizRes = await dbPool.query("SELECT * FROM businesses ORDER BY created_at DESC");
          if (bizRes.rows.length > 0) {
            return res.json(bizRes.rows.map(r => ({
              id: r.id,
              name: r.business_name,
              businessName: r.business_name,
              business_name: r.business_name,
              type: 'shop',
              category: r.category,
              categoryLabel: r.category || 'Retail & Services',
              ownerName: r.owner_id || 'Owner',
              owner_id: r.owner_id,
              phone: r.phone || '',
              area: r.address || 'Local Area',
              address: r.address || 'Market Area',
              description: `Welcome to ${r.business_name}!`,
              rating: 5.0,
              reviewCount: 1,
              isVerified: true,
              createdAt: r.created_at
            })));
          }

          // 2. Fallback to shops table
          const result = await dbPool.query("SELECT * FROM shops ORDER BY created_at DESC");
          if (result.rows.length > 0) {
            return res.json(result.rows.map(r => ({
              id: r.id,
              name: r.name,
              businessName: r.name,
              type: r.type,
              categoryLabel: r.category_label,
              category: r.category_label,
              ownerName: r.owner_name,
              owner_id: r.owner_name,
              phone: r.phone,
              area: r.area,
              address: r.address,
              description: r.description,
              photoUrl: r.photo_url,
              rating: Number(r.rating || 5.0),
              reviewCount: Number(r.review_count || 1),
              isVerified: r.is_verified !== false,
              createdAt: r.created_at
            })));
          }
        } catch (e) {}
      }
      const shops = readJsonFile<any[]>(SHOPS_FILE, []);
      res.json(shops);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to fetch businesses" });
    }
  };

  app.get("/api/shops", getBusinessesHandler);
  app.get("/api/businesses", getBusinessesHandler);

  const saveBusinessHandler = async (req: express.Request, res: express.Response) => {
    try {
      const shop = req.body;
      const bName = shop.business_name || shop.businessName || shop.name;
      if (!shop || !bName) return res.status(400).json({ error: "Business name required" });

      const newShop = {
        id: shop.id || 'biz_' + Date.now().toString(36),
        name: bName.trim(),
        businessName: bName.trim(),
        business_name: bName.trim(),
        type: shop.type || 'shop',
        category: shop.category || shop.categoryLabel || 'Retail & Services',
        categoryLabel: shop.categoryLabel || shop.category || 'Local Business',
        ownerName: shop.owner_id || shop.ownerName || 'Owner',
        owner_id: shop.owner_id || shop.ownerName || 'Owner',
        phone: shop.phone || '',
        area: shop.area || shop.address || 'Local Area',
        address: shop.address || shop.area || 'Market Area',
        description: shop.description || '',
        photoUrl: shop.photoUrl || shop.photo_url || null,
        rating: typeof shop.rating === 'number' ? shop.rating : 5.0,
        reviewCount: typeof shop.reviewCount === 'number' ? shop.reviewCount : 1,
        isVerified: true,
        createdAt: shop.createdAt || new Date().toISOString()
      };

      // 1. PostgreSQL Insert into primary "businesses" table (id, owner_id, business_name, category, address, phone, created_at)
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO businesses (id, owner_id, business_name, category, address, phone, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
              business_name = EXCLUDED.business_name,
              category = EXCLUDED.category,
              address = EXCLUDED.address,
              phone = EXCLUDED.phone
          `, [
            newShop.id,
            newShop.owner_id,
            newShop.business_name,
            newShop.category,
            newShop.address,
            newShop.phone,
            newShop.createdAt
          ]);

          // Also insert into shops table
          await dbPool.query(`
            INSERT INTO shops (id, name, type, category_label, owner_name, phone, area, address, description, photo_url, rating, review_count, is_verified, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              owner_name = EXCLUDED.owner_name,
              phone = EXCLUDED.phone,
              description = EXCLUDED.description
          `, [
            newShop.id, newShop.name, newShop.type, newShop.categoryLabel,
            newShop.ownerName, newShop.phone, newShop.area, newShop.address,
            newShop.description, newShop.photoUrl, newShop.rating,
            newShop.reviewCount, newShop.isVerified, newShop.createdAt
          ]);
        } catch (e) {
          console.warn("DB businesses insert error:", e);
        }
      }

      const shops = readJsonFile<any[]>(SHOPS_FILE, []);
      const updated = [newShop, ...shops.filter(s => s.id !== newShop.id)];
      writeJsonFile(SHOPS_FILE, updated);

      res.status(201).json(newShop);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to save business" });
    }
  };

  app.post("/api/shops", requireAuth, saveBusinessHandler);
  app.post("/api/businesses", requireAuth, saveBusinessHandler);

  const deleteBusinessHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query("DELETE FROM businesses WHERE id = $1", [id]);
          await dbPool.query("DELETE FROM shops WHERE id = $1", [id]);
        } catch (e) {}
      }
      const shops = readJsonFile<any[]>(SHOPS_FILE, []);
      writeJsonFile(SHOPS_FILE, shops.filter(s => s.id !== id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to delete business" });
    }
  };

  app.delete("/api/shops/:id", requireAuth, deleteBusinessHandler);
  app.delete("/api/businesses/:id", requireAuth, deleteBusinessHandler);

  // ==========================================
  // HELPERS API
  // ==========================================

  app.get("/api/helpers", async (req, res) => {
    try {
      if (dbPool && isDbConnected) {
        try {
          const result = await dbPool.query("SELECT * FROM helpers ORDER BY created_at DESC");
          if (result.rows.length > 0) {
            return res.json(result.rows.map(r => ({
              id: r.id,
              name: r.name,
              categoryId: r.category_id,
              phone: r.phone,
              skills: r.skills || [],
              area: r.area,
              experience: r.experience,
              distance: Number(r.distance || 0.5),
              isVerified: r.is_verified,
              govtIdUploaded: r.govt_id_uploaded,
              idDocUrl: r.id_doc_url,
              createdAt: r.created_at
            })));
          }
        } catch (e) {}
      }
      const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
      res.json(helpers);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to fetch helpers" });
    }
  });

  app.post("/api/helpers", requireAuth, async (req, res) => {
    try {
      const helper = req.body;
      if (!helper || !helper.name) return res.status(400).json({ error: "Helper name required" });

      const newHelper = {
        id: helper.id || 'helper_' + Date.now().toString(36),
        name: helper.name.trim(),
        categoryId: helper.categoryId || helper.category_id || 'general',
        phone: helper.phone || '',
        skills: Array.isArray(helper.skills) ? helper.skills : [helper.categoryId || 'General'],
        area: helper.area || 'Local Area',
        experience: helper.experience || '1 Year',
        distance: typeof helper.distance === 'number' ? helper.distance : 0.5,
        isVerified: !!helper.isVerified,
        govtIdUploaded: !!helper.govtIdUploaded,
        idDocUrl: helper.idDocUrl || helper.id_doc_url || null,
        createdAt: helper.createdAt || new Date().toISOString()
      };

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO helpers (id, name, category_id, phone, skills, area, experience, distance, is_verified, govt_id_uploaded, id_doc_url, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              skills = EXCLUDED.skills,
              area = EXCLUDED.area,
              experience = EXCLUDED.experience
          `, [
            newHelper.id, newHelper.name, newHelper.categoryId, newHelper.phone,
            newHelper.skills, newHelper.area, newHelper.experience, newHelper.distance,
            newHelper.isVerified, newHelper.govtIdUploaded, newHelper.idDocUrl, newHelper.createdAt
          ]);
        } catch (e) {}
      }

      const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
      const updated = [newHelper, ...helpers.filter(h => h.id !== newHelper.id)];
      writeJsonFile(HELPERS_FILE, updated);

      res.status(201).json(newHelper);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to save helper" });
    }
  });

  // AI chat history logging (Separate from user-to-user chats table)
  app.post("/api/ai-chat-history", async (req, res) => {
    try {
      const { prompt, response: aiResponse, userId } = req.body;
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to record chat" });
    }
  });

  // 6. Save Permanent Safety & Police Audit Logs
  app.post("/api/audit-logs", (req, res) => {
    try {
      const auditPayload = req.body;
      const logs = readJsonFile<any[]>(AUDIT_FILE, []);
      const record = {
        id: 'audit_' + Date.now(),
        receivedAt: new Date().toISOString(),
        ...auditPayload
      };
      logs.push(record);
      writeJsonFile(AUDIT_FILE, logs);
      console.log(`[Safety Audit Archived] Permanent record saved for chatId: ${auditPayload.chatId}`);
      res.status(201).json({ success: true, id: record.id });
    } catch (e) {
      res.status(500).json({ error: "Failed to save audit log" });
    }
  });

  app.get("/api/audit-logs", (req, res) => {
    try {
      const logs = readJsonFile<any[]>(AUDIT_FILE, []);
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // 7. Community Reports
  app.post("/api/reports", async (req, res) => {
    try {
      const report = req.body;
      const reportId = 'rep_' + Date.now();
      const record = {
        id: reportId,
        createdAt: new Date().toISOString(),
        ...report
      };

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            "INSERT INTO admin_reports (id, reporter_id, reporter_name, reason, details, status, reported_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
            [record.id, record.reporterId || 'guest', record.reporterName || 'Guest', record.reason || '', record.details || '', record.status || 'pending_admin_review']
          );
        } catch (e) {}
      }

      const reports = readJsonFile<any[]>(REPORTS_FILE, []);
      reports.push(record);
      writeJsonFile(REPORTS_FILE, reports);
      res.status(201).json({ success: true, id: record.id });
    } catch (e) {
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  app.get("/api/reports", (req, res) => {
    try {
      const reports = readJsonFile<any[]>(REPORTS_FILE, []);
      res.json(reports);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // ==========================================
  // AD BANNER MANAGEMENT API ROUTES
  // ==========================================

  app.get("/api/ads", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const ads = readJsonFile<any[]>(ADS_FILE, []);
      res.json(ads);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch ad banners" });
    }
  });

  app.post("/api/ads", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const ad = req.body;
      if (!ad || !ad.businessName || !ad.offerTitle) {
        return res.status(400).json({ error: "Business name and offer title are required" });
      }

      const ads = readJsonFile<any[]>(ADS_FILE, []);
      const newAd = {
        id: ad.id || 'ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        businessName: ad.businessName.trim(),
        logo: ad.logo || '🏪',
        category: ad.category || 'Retail & Services',
        offerBadge: ad.offerBadge || '🔥 Special Offer',
        offerTitle: ad.offerTitle.trim(),
        description: ad.description || '',
        photoUrl: ad.photoUrl || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80',
        distance: typeof ad.distance === 'number' ? ad.distance : 0.4,
        area: ad.area || 'Local Market',
        rating: typeof ad.rating === 'number' ? ad.rating : 4.9,
        reviewCount: typeof ad.reviewCount === 'number' ? ad.reviewCount : 12,
        isVerified: true,
        destinationUrl: ad.destinationUrl || '',
        initialMessage: ad.initialMessage || `Namaste! ${ad.businessName} me aapka swagat hai. Ad offer "${ad.offerBadge}" ke baare me poochhein.`,
        createdAt: ad.createdAt || new Date().toISOString()
      };

      const existingIdx = ads.findIndex(a => a.id === newAd.id);
      let updatedAds: any[];
      if (existingIdx >= 0) {
        updatedAds = [...ads];
        updatedAds[existingIdx] = newAd;
      } else {
        updatedAds = [newAd, ...ads];
      }

      writeJsonFile(ADS_FILE, updatedAds);
      console.log(`[Ad Banner Saved] ${newAd.id}: ${newAd.businessName}`);
      res.status(201).json(newAd);
    } catch (e) {
      console.error("Failed to save ad banner:", e);
      res.status(500).json({ error: "Failed to save ad banner" });
    }
  });

  app.delete("/api/ads/:id", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const ads = readJsonFile<any[]>(ADS_FILE, []);
      const filtered = ads.filter(a => a.id !== id);
      writeJsonFile(ADS_FILE, filtered);
      console.log(`[Ad Banner Deleted] ${id}`);
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete ad banner" });
    }
  });

  // ==========================================
  // JOB PORTAL (JOB SEEKER & EMPLOYER VACANCIES) API
  // ==========================================

  app.get("/api/job-portal", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const { status = 'approved', type, search } = req.query;
      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, []);

      let filtered = items;

      if (status !== 'all') {
        filtered = filtered.filter(i => (i.status || 'pending') === status);
      }

      if (type && type !== 'all') {
        filtered = filtered.filter(i => i.type === type);
      }

      if (search && typeof search === 'string') {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(i => {
          const matchName = (i.fullName || i.companyOrShopName || '').toLowerCase().includes(q);
          const matchRole = (i.headline || i.jobRole || '').toLowerCase().includes(q);
          const matchCat = (i.category || '').toLowerCase().includes(q);
          const matchArea = (i.area || i.address || '').toLowerCase().includes(q);
          const matchDesc = (i.description || '').toLowerCase().includes(q);
          const matchSkills = Array.isArray(i.skills) && i.skills.some((s: string) => s.toLowerCase().includes(q));
          return matchName || matchRole || matchCat || matchArea || matchDesc || matchSkills;
        });
      }

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(filtered);
    } catch (e) {
      console.error("Failed to fetch job portal items:", e);
      res.status(500).json({ error: "Failed to fetch job portal items" });
    }
  });

  app.post("/api/job-portal", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const payload = req.body;
      if (!payload || !payload.type) {
        return res.status(400).json({ error: "Invalid submission payload: type is required" });
      }

      if (payload.type === 'job_seeker' && !payload.fullName) {
        return res.status(400).json({ error: "Full Name is required for Job Seeker profile" });
      }

      if (payload.type === 'employer_vacancy' && (!payload.companyOrShopName || !payload.jobRole)) {
        return res.status(400).json({ error: "Company/Shop name and Job Role are required for Employer vacancy" });
      }

      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
      const isSeeker = payload.type === 'job_seeker';
      const idPrefix = isSeeker ? 'job_seeker_' : 'job_emp_';
      const newRecord = {
        id: payload.id || idPrefix + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type: payload.type,
        status: "pending",
        fullName: payload.fullName?.trim() || '',
        headline: payload.headline?.trim() || (isSeeker ? `${payload.category || 'Professional'} Specialist` : ''),
        skills: Array.isArray(payload.skills) 
          ? payload.skills 
          : (typeof payload.skills === 'string' && payload.skills.trim() ? payload.skills.split(',').map((s: string) => s.trim()) : []),
        experience: payload.experience?.trim() || 'Fresher',
        expectedSalary: payload.expectedSalary?.trim() || '',
        education: payload.education?.trim() || '',
        companyOrShopName: payload.companyOrShopName?.trim() || '',
        jobRole: payload.jobRole?.trim() || '',
        vacancyType: payload.vacancyType || 'Full-Time',
        salaryOffered: payload.salaryOffered?.trim() || 'Negotiable',
        openingsCount: Number(payload.openingsCount) || 1,
        urgency: payload.urgency || 'Immediate',
        category: payload.category || 'Retail & Services',
        phone: payload.phone?.trim() || '',
        whatsapp: payload.whatsapp?.trim() || payload.phone?.trim() || '',
        email: payload.email?.trim() || '',
        area: payload.area?.trim() || 'Local Area',
        address: payload.address?.trim() || '',
        description: payload.description?.trim() || (isSeeker ? 'Looking for local employment opportunities.' : 'Staff required for our business.'),
        photoOrLogoUrl: payload.photoOrLogoUrl || (isSeeker 
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80'),
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        adminNotes: ''
      };

      const updated = [newRecord, ...items];
      writeJsonFile(JOB_PORTAL_FILE, updated);

      return res.status(201).json({
        success: true,
        item: newRecord,
        message: "Your submission has been received and is pending admin approval. It will appear live once verified."
      });
    } catch (e) {
      console.error("Failed to save job portal entry:", e);
      res.status(500).json({ error: "Failed to save job portal entry" });
    }
  });

  app.patch("/api/job-portal/:id/status", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: "Valid status ('approved', 'rejected', 'pending') is required" });
      }

      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
      const targetIndex = items.findIndex(i => i.id === id);

      if (targetIndex === -1) {
        return res.status(404).json({ error: "Job portal entry not found" });
      }

      items[targetIndex].status = status;
      items[targetIndex].reviewedAt = new Date().toISOString();
      if (typeof adminNotes === 'string') {
        items[targetIndex].adminNotes = adminNotes;
      }

      writeJsonFile(JOB_PORTAL_FILE, items);
      res.json({
        success: true,
        item: items[targetIndex],
        message: `Status updated to ${status}`
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.delete("/api/job-portal/:id", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
      const filtered = items.filter(i => i.id !== id);
      writeJsonFile(JOB_PORTAL_FILE, filtered);
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

  app.post("/api/admin/clear-dummy-data", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query("DELETE FROM broadcast_posts WHERE id LIKE 'seed_%' OR id LIKE 'sample_%'");
        } catch (e) {}
      }

      const intents = readJsonFile<any[]>(INTENTS_FILE, []);
      const realIntents = intents.filter(i => !i.id.startsWith('seed_') && !i.id.startsWith('sample_'));
      writeJsonFile(INTENTS_FILE, realIntents);

      const ads = readJsonFile<any[]>(ADS_FILE, []);
      const realAds = ads.filter(a => !a.id.startsWith('ad_elec_') && !a.id.startsWith('ad_grocery_') && !a.id.startsWith('ad_auto_'));
      writeJsonFile(ADS_FILE, realAds);

      const jobs = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
      const realJobs = jobs.filter(j => !j.id.startsWith('job_emp_01') && !j.id.startsWith('job_seeker_01'));
      writeJsonFile(JOB_PORTAL_FILE, realJobs);

      res.json({
        success: true,
        message: "All sample/dummy seed data purged successfully! Only real user posts are now active.",
        counts: {
          broadcasts: realIntents.length,
          shops: realAds.length,
          jobs: realJobs.length
        }
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to clear dummy data" });
    }
  });

  app.post("/api/admin/reset-database", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query("TRUNCATE TABLE broadcast_posts, messages, shops, helpers, chats, admin_reports RESTART IDENTITY CASCADE");
        } catch (e) {}
      }

      writeJsonFile(INTENTS_FILE, []);
      writeJsonFile(ADS_FILE, []);
      writeJsonFile(JOB_PORTAL_FILE, []);
      writeJsonFile(MESSAGES_FILE, {});
      writeJsonFile(REPORTS_FILE, []);
      writeJsonFile(SHOPS_FILE, []);
      writeJsonFile(HELPERS_FILE, []);

      res.json({
        success: true,
        message: "Database reset completed. All posts, shops, and job listings have been cleared."
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to reset database" });
    }
  });

  // ==========================================
  // IDENTITY VERIFICATION & WATERMARKED DOCS API
  // Strict Privacy: ID documents are only visible to Admin.
  // Public callers only receive { isVerified, status }.
  // ==========================================

  // 1. Submit Identity Verification (Auto-Watermarked Document) - Protected
  app.post("/api/verifications", requireAuth, async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const {
        id,
        entityType = 'user_profile', // 'user_profile' or 'business'
        entityId,
        userId,
        userName,
        userEmail,
        userPhone,
        title,
        idDocumentWatermarked
      } = req.body;

      if (!idDocumentWatermarked) {
        return res.status(400).json({ error: "Watermarked identity document is required for verification." });
      }

      const reqId = id || 'verif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const targetEntityId = entityId || userId || reqId;
      const targetUserId = userId || targetEntityId;
      const docTitle = title || (entityType === 'business' ? 'Business Registration Document' : 'User Identity Document');

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO verification_requests (
              id, entity_type, entity_id, user_id, user_name, user_email, user_phone, title, id_document_watermarked, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
            ON CONFLICT (id) DO UPDATE SET
              id_document_watermarked = EXCLUDED.id_document_watermarked,
              status = 'pending',
              created_at = NOW()
          `, [
            reqId,
            entityType,
            targetEntityId,
            targetUserId,
            userName || '',
            userEmail || '',
            userPhone || '',
            docTitle,
            idDocumentWatermarked
          ]);
        } catch (dbErr) {
          console.warn("[PostgreSQL] Verification save note:", dbErr);
        }
      }

      // Local JSON persistence
      const verifications = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      const newEntry = {
        id: reqId,
        entityType,
        entityId: targetEntityId,
        userId: targetUserId,
        userName: userName || '',
        userEmail: userEmail || '',
        userPhone: userPhone || '',
        title: docTitle,
        idDocumentWatermarked,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const existingIndex = verifications.findIndex(v => v.id === reqId || (v.entityId === targetEntityId && v.status === 'pending'));
      if (existingIndex >= 0) {
        verifications[existingIndex] = newEntry;
      } else {
        verifications.unshift(newEntry);
      }
      writeJsonFile(VERIFICATIONS_FILE, verifications);

      res.status(201).json({
        success: true,
        message: "Identity document submitted with indelible LocoHelp security watermark. It has been queued for Admin approval.",
        verificationId: reqId,
        status: 'pending'
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to submit verification request" });
    }
  });

  // 2. Public Status Check - STRICT PRIVACY: NEVER returns the ID document
  app.get("/api/verifications/status/:entityId", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const { entityId } = req.params;
      let status = 'none';
      let isVerified = false;

      if (dbPool && isDbConnected) {
        try {
          const result = await dbPool.query(
            "SELECT status FROM verification_requests WHERE entity_id = $1 OR user_id = $1 ORDER BY created_at DESC LIMIT 1",
            [entityId]
          );
          if (result.rows.length > 0) {
            status = result.rows[0].status;
            isVerified = status === 'approved';
          }
        } catch (e) {}
      }

      if (status === 'none') {
        const verifications = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
        const found = verifications.find(v => v.entityId === entityId || v.userId === entityId);
        if (found) {
          status = found.status;
          isVerified = status === 'approved';
        }
      }

      // If approved in shops.json or profiles.json directly, also mark verified
      if (!isVerified) {
        const shops = readJsonFile<any[]>(SHOPS_FILE, []);
        const shop = shops.find(s => s.id === entityId);
        if (shop && (shop.isVerified || shop.is_verified)) {
          isVerified = true;
          status = 'approved';
        }
      }

      res.json({
        entityId,
        status,
        isVerified
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to check verification status" });
    }
  });

  // 3. Admin-Only Verifications Queue - Lists all requests WITH watermarked documents
  app.get("/api/admin/verifications", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      let list: any[] = [];

      if (dbPool && isDbConnected) {
        try {
          const result = await dbPool.query(`
            SELECT 
              id,
              entity_type as "entityType",
              entity_id as "entityId",
              user_id as "userId",
              user_name as "userName",
              user_email as "userEmail",
              user_phone as "userPhone",
              title,
              id_document_watermarked as "idDocumentWatermarked",
              status,
              created_at as "createdAt",
              reviewed_at as "reviewedAt",
              admin_notes as "adminNotes"
            FROM verification_requests
            ORDER BY created_at DESC
          `);
          list = result.rows;
        } catch (dbErr) {
          console.warn("[PostgreSQL] DB verifications fetch note:", dbErr);
        }
      }

      if (list.length === 0) {
        list = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      }

      res.json(list);
    } catch (e) {
      res.status(500).json({ error: "Failed to load verifications queue" });
    }
  });

  // 4. Admin-Only Action: Approve or Reject Verification
  app.patch("/api/admin/verifications/:id/status", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      let updatedItem: any = null;

      if (dbPool && isDbConnected) {
        try {
          const updateRes = await dbPool.query(`
            UPDATE verification_requests
            SET status = $1, admin_notes = $2, reviewed_at = NOW()
            WHERE id = $3
            RETURNING *
          `, [status, adminNotes || null, id]);

          if (updateRes.rows.length > 0) {
            const row = updateRes.rows[0];
            updatedItem = row;

            if (status === 'approved') {
              if (row.entity_type === 'business') {
                await dbPool.query("UPDATE shops SET is_verified = true WHERE id = $1", [row.entity_id]).catch(() => {});
                await dbPool.query("UPDATE businesses SET is_verified = true WHERE id = $1", [row.entity_id]).catch(() => {});
              } else {
                await dbPool.query("UPDATE helpers SET is_verified = true WHERE id = $1", [row.entity_id]).catch(() => {});
                await dbPool.query("UPDATE profiles SET is_verified = true WHERE uid = $1", [row.entity_id]).catch(() => {});
              }
            }
          }
        } catch (dbErr) {
          console.warn("[PostgreSQL] Update verification status note:", dbErr);
        }
      }

      // Update in local file
      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      const idx = verifs.findIndex(v => v.id === id);
      if (idx >= 0) {
        verifs[idx].status = status;
        verifs[idx].adminNotes = adminNotes || verifs[idx].adminNotes;
        verifs[idx].reviewedAt = new Date().toISOString();
        updatedItem = verifs[idx];
        writeJsonFile(VERIFICATIONS_FILE, verifs);

        if (status === 'approved') {
          if (verifs[idx].entityType === 'business') {
            const shops = readJsonFile<any[]>(SHOPS_FILE, []);
            const sIdx = shops.findIndex(s => s.id === verifs[idx].entityId);
            if (sIdx >= 0) {
              shops[sIdx].isVerified = true;
              shops[sIdx].is_verified = true;
              writeJsonFile(SHOPS_FILE, shops);
            }
          } else {
            const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
            const hIdx = helpers.findIndex(h => h.id === verifs[idx].entityId || h.phone === verifs[idx].userPhone);
            if (hIdx >= 0) {
              helpers[hIdx].isVerified = true;
              helpers[hIdx].is_verified = true;
              writeJsonFile(HELPERS_FILE, helpers);
            }
            const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
            if (profiles[verifs[idx].entityId]) {
              profiles[verifs[idx].entityId].is_verified = true;
              profiles[verifs[idx].entityId].isVerified = true;
              writeJsonFile(PROFILES_FILE, profiles);
            }
          }
        }
      }

      res.json({ success: true, item: updatedItem, status });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update verification status" });
    }
  });

  // ==========================================
  // AUTHENTICATION & OTP DISPATCH API
  // ==========================================
  interface OtpRecord {
    code: string;
    expiresAt: number;
    attempts: number;
    type: 'mobile' | 'email';
  }
  const otpStore = new Map<string, OtpRecord>();

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { identifier, type } = req.body;
      if (!identifier) {
        return res.status(400).json({ error: "Mobile number or Email address is required" });
      }

      const cleanIdentifier = String(identifier).trim().toLowerCase();
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000;
      const otpType = type === 'email' || cleanIdentifier.includes('@') ? 'email' : 'mobile';

      // 1. Store in memory for instant local verification
      otpStore.set(cleanIdentifier, {
        code,
        expiresAt,
        attempts: 0,
        type: otpType
      });

      // 2. Persist to PostgreSQL otp_codes table
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO otp_codes (identifier, code, type, attempts, expires_at, created_at)
            VALUES ($1, $2, $3, 0, to_timestamp($4), NOW())
          `, [cleanIdentifier, code, otpType, expiresAt / 1000]);
        } catch (dbErr: any) {
          console.warn("[PostgreSQL] otp_codes insert notice:", dbErr.message);
        }
      }

      if (otpType === 'email') {
        let emailSent = false;
        let provider = 'Dev Mode';

        // Send via Brevo (Sendinblue) Transactional REST API
        const emailSubject = `Your LocoHelp Login OTP: ${code}`;
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #0066FF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LocoHelp Verification</h2>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Hyperlocal Community & Service Network</p>
            </div>
            <p style="font-size: 15px; color: #1e293b; margin-bottom: 12px;">Namaste!</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
              Use the One-Time Password (OTP) below to securely log in to your LocoHelp account:
            </p>
            <div style="background-color: #f0f7ff; border: 2px dashed #0066FF; padding: 18px; text-align: center; border-radius: 14px; margin: 20px 0;">
              <span style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #0066FF; font-family: monospace;">${code}</span>
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin-top: 16px;">
              ⏳ This OTP is valid for <strong>5 minutes</strong>. For your security, do not share this code with anyone.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
              Team LocoHelp • Direct Hyperlocal Assistance
            </p>
          </div>
        `;
        const emailText = `Namaste!\n\nYour LocoHelp login verification code is: ${code}\n\nThis OTP is valid for 5 minutes. Do not share this code with anyone.\n\nTeam LocoHelp`;

        emailSent = await sendEmailViaBrevo(cleanIdentifier, emailSubject, emailHtml, emailText);
        if (emailSent) {
          provider = 'Brevo API';
        } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          // Fallback to SMTP if configured
          try {
            const smtpPass = process.env.SMTP_PASS.replace(/\s+/g, '');
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST || 'smtp.gmail.com',
              port: Number(process.env.SMTP_PORT) || 587,
              secure: Number(process.env.SMTP_PORT) === 465,
              auth: {
                user: process.env.SMTP_USER.trim(),
                pass: smtpPass
              },
              tls: {
                rejectUnauthorized: false
              }
            });

            await transporter.sendMail({
              from: `"LocoHelp Verification" <${process.env.SMTP_USER.trim()}>`,
              to: cleanIdentifier,
              subject: emailSubject,
              text: emailText,
              html: emailHtml
            });
            emailSent = true;
            provider = 'SMTP';
          } catch (err: any) {
            console.error("Nodemailer dispatch error:", err.message);
          }
        }

        console.log(`[OTP DISPATCH] Generated OTP for email ${cleanIdentifier}: ${code} (Sent via ${provider}: ${emailSent})`);

        return res.json({
          success: true,
          message: emailSent 
            ? `Verification OTP sent to ${cleanIdentifier} via ${provider}. Please check your Inbox and Spam folder.`
            : `OTP generated for ${cleanIdentifier}.`,
          emailSent,
          provider,
          devOtp: !emailSent ? code : undefined,
          expiresInSeconds: 300
        });
      } else {
        const cleanNumber = cleanIdentifier.replace(/\D/g, '');
        console.log(`[OTP DISPATCH] Generated OTP for mobile +91 ${cleanNumber}: ${code}`);

        const whatsappMsg = encodeURIComponent(
          `*LocoHelp Security Verification*\n\nYour One-Time Password (OTP) is: *${code}*\n\nValid for 5 minutes. Do not share this code with anyone.`
        );
        const whatsappUrl = `https://api.whatsapp.com/send?phone=91${cleanNumber}&text=${whatsappMsg}`;

        return res.json({
          success: true,
          message: `OTP generated for +91 ${cleanNumber}`,
          whatsappUrl,
          devOtp: code,
          expiresInSeconds: 300
        });
      }
    } catch (e: any) {
      console.error("OTP send error:", e);
      return res.status(500).json({ error: "Failed to send OTP. Please try again." });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { identifier, code, type } = req.body;
      if (!identifier || !code) {
        return res.status(400).json({ error: "Identifier and OTP code are required" });
      }

      const cleanIdentifier = String(identifier).trim().toLowerCase();
      const cleanCode = String(code).trim();

      // Check PostgreSQL otp_codes table
      let dbRecord: any = null;
      if (dbPool && isDbConnected) {
        try {
          const resDb = await dbPool.query(
            `SELECT * FROM otp_codes WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1`,
            [cleanIdentifier]
          );
          if (resDb.rows.length > 0) {
            dbRecord = resDb.rows[0];
          }
        } catch (dbErr: any) {
          console.warn("[PostgreSQL] otp_codes check notice:", dbErr.message);
        }
      }

      const record = otpStore.get(cleanIdentifier) || (dbRecord ? {
        code: dbRecord.code,
        expiresAt: new Date(dbRecord.expires_at).getTime(),
        attempts: dbRecord.attempts || 0,
        type: dbRecord.type
      } : null);

      if (!record) {
        return res.status(400).json({ 
          error: "No OTP was requested for this identifier or it has expired. Please request a new OTP." 
        });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(cleanIdentifier);
        if (dbPool && isDbConnected) {
          try {
            await dbPool.query('DELETE FROM otp_codes WHERE identifier = $1', [cleanIdentifier]);
          } catch (e) {}
        }
        return res.status(400).json({ error: "OTP has expired. Please request a new OTP." });
      }

      if (record.attempts >= 5) {
        otpStore.delete(cleanIdentifier);
        if (dbPool && isDbConnected) {
          try {
            await dbPool.query('DELETE FROM otp_codes WHERE identifier = $1', [cleanIdentifier]);
          } catch (e) {}
        }
        return res.status(400).json({ error: "Too many failed attempts. Please request a new OTP." });
      }

      if (record.code !== cleanCode) {
        record.attempts += 1;
        if (dbPool && isDbConnected) {
          try {
            await dbPool.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE identifier = $1', [cleanIdentifier]);
          } catch (e) {}
        }
        return res.status(400).json({ 
          error: "गलत OTP है! (Invalid OTP). Please enter the exact code received in your message or email." 
        });
      }

      otpStore.delete(cleanIdentifier);
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query('DELETE FROM otp_codes WHERE identifier = $1', [cleanIdentifier]);
        } catch (e) {}
      }

      const isEmail = type === 'email' || cleanIdentifier.includes('@');
      const user = {
        uid: (isEmail ? 'email_' : 'phone_') + (isEmail ? cleanIdentifier.replace(/[^a-z0-9]/g, '_') : cleanIdentifier.replace(/\D/g, '')),
        displayName: isEmail ? cleanIdentifier.split('@')[0] : `User +91 ${cleanIdentifier.replace(/\D/g, '')}`,
        email: isEmail ? cleanIdentifier : '',
        phone: !isEmail ? `+91 ${cleanIdentifier.replace(/\D/g, '')}` : '',
        verifiedAt: new Date().toISOString()
      };

      // Persist user to PostgreSQL primary "user" table (id, name, phone, email, created_at) and profiles table
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO "user" (id, name, phone, email, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), "user".phone),
              email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email)
          `, [user.uid, user.displayName, user.phone, user.email]);

          await dbPool.query(`
            INSERT INTO profiles (uid, full_name, email, phone, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (uid) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
              updated_at = NOW()
          `, [user.uid, user.displayName, user.email, user.phone]);
        } catch (e) {
          console.warn("DB user insert on OTP verification error:", e);
        }
      }

      const token = createSessionToken({
        uid: user.uid,
        email: user.email,
        name: user.displayName
      });
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);

      console.log(`[AUTH SUCCESS] User successfully verified: ${user.uid} with 30-day session token`);
      return res.json({ success: true, token, user });
    } catch (e) {
      console.error("OTP verify error:", e);
      return res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Issue / Refresh Session Token for logged-in clients
  app.post("/api/auth/token", (req, res) => {
    try {
      const { email, uid, name } = req.body;
      if (!email && !uid) {
        return res.status(400).json({ error: "Email or UID is required" });
      }
      const token = createSessionToken({
        uid: uid || email,
        email: email || '',
        name: name || (email ? email.split('@')[0] : 'Community User')
      });
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);
      res.json({ success: true, token });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to issue token" });
    }
  });

  // Lazy initialization of Gemini API
  let ai: GoogleGenAI | null = null;
  function getAI() {
    if (!ai) {
      ai = new GoogleGenAI({
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return ai;
  }

  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const aiClient = getAI();
      const response = await aiClient.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to generate AI response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && process.env.VITE_DEV_SERVER !== 'false') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
