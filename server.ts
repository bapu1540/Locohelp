import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import pg from "pg";

const { Pool } = pg;

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

// ==========================================
// RAILWAY POSTGRESQL POOL INITIALIZATION
// ==========================================
let dbPool: pg.Pool | null = null;
let isDbConnected = false;

async function initPostgresTables(pool: pg.Pool) {
  try {
    await pool.query(`
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

      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        prompt TEXT,
        response TEXT,
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
    `);
    console.log("[Railway PostgreSQL] Tables verified and ready.");
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
  const PORT = 3000;

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

  // Get user profile
  app.get("/api/profiles/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      if (dbPool && isDbConnected) {
        try {
          const result = await dbPool.query(
            "SELECT * FROM profiles WHERE uid = $1 OR email = $1 LIMIT 1",
            [uid]
          );
          if (result.rows.length > 0) {
            const row = result.rows[0];
            return res.json({
              uid: row.uid,
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
          console.warn("DB profile query error:", dbErr);
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
  });

  // Upsert user profile
  app.post("/api/profiles", async (req, res) => {
    try {
      const profile = req.body;
      if (!profile || !profile.uid) {
        return res.status(400).json({ error: "User UID is required" });
      }

      const uid = profile.uid;
      const fullName = profile.full_name || profile.displayName || "Community Member";
      const email = profile.email || "";
      const phone = profile.phone || "";
      const avatarUrl = profile.avatar_url || profile.photoURL || "https://lh3.googleusercontent.com/a/default-user";
      const skills = profile.skills || "";
      const address = profile.address || "";
      const experience = profile.experience || "";
      const myHelper = profile.my_helper_profile || profile.myHelperProfile || null;

      // 1. PostgreSQL Upsert
      if (dbPool && isDbConnected) {
        try {
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
          console.warn("DB profile upsert error:", dbErr);
        }
      }

      // 2. Local storage file backup
      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      profiles[uid] = {
        uid,
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

      res.status(200).json({ success: true, profile: profiles[uid] });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to save profile" });
    }
  });

  // Delete profile
  app.delete("/api/profiles/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      if (dbPool && isDbConnected) {
        try {
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

  // Google Login session creation
  app.post("/api/auth/google-login", async (req, res) => {
    try {
      const { email, displayName, photoURL } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const cleanEmail = email.trim().toLowerCase();
      const name = displayName || cleanEmail.split('@')[0];
      const photo = photoURL || 'https://lh3.googleusercontent.com/a/default-user';
      const uid = cleanEmail;

      if (dbPool && isDbConnected) {
        try {
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

      res.json({
        success: true,
        user: {
          uid,
          displayName: name,
          email: cleanEmail,
          photoURL: photo,
          isGuest: false
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Login failed" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    res.json({ success: true });
  });

  // ==========================================
  // BROADCAST POSTS (INTENTS) API
  // ==========================================

  // 1. Get All Broadcast Intents
  app.get("/api/intents", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);

      // If PostgreSQL is connected, fetch from database
      if (dbPool && isDbConnected) {
        try {
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
          console.warn("DB intents query fallback:", dbErr);
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
  });

  // 2. Broadcast a New Intent
  app.post("/api/intents", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const newIntent = req.body;
      if (!newIntent || !newIntent.description) {
        return res.status(400).json({ error: "Intent description is required" });
      }

      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);
      if (newIntent.id && deletedIds.includes(newIntent.id)) {
        return res.status(200).json(newIntent);
      }

      const intentRecord = {
        id: newIntent.id || 'intent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        authorId: newIntent.authorId || newIntent.author_id || 'anonymous_user',
        authorName: newIntent.authorName || newIntent.author_name || 'Community Member',
        authorAvatar: newIntent.authorAvatar || newIntent.author_avatar || '',
        description: newIntent.description.trim(),
        category: newIntent.category || (newIntent.tags && newIntent.tags[0] ? newIntent.tags[0].replace('#', '') : 'General'),
        tags: Array.isArray(newIntent.tags) ? newIntent.tags : ['#General'],
        distance: typeof newIntent.distance === 'number' ? newIntent.distance : Number((Math.random() * 0.4 + 0.1).toFixed(1)),
        status: newIntent.status || 'active',
        createdAt: newIntent.createdAt || new Date().toISOString(),
        expiresAt: newIntent.expiresAt || new Date(Date.now() + 1000 * 60 * 120).toISOString(),
        hasLocationPin: !!newIntent.hasLocationPin,
        isVerifiedUser: true
      };

      // 1. PostgreSQL Insert
      if (dbPool && isDbConnected) {
        try {
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
          console.warn("DB broadcast insert note:", dbErr);
        }
      }

      // 2. Local storage file
      const intents = readJsonFile<any[]>(INTENTS_FILE, []);
      const updated = [intentRecord, ...intents.filter(i => i.id !== intentRecord.id && i.description !== intentRecord.description)];
      writeJsonFile(INTENTS_FILE, updated);

      console.log(`[Broadcast Created] ${intentRecord.id}: "${intentRecord.description.substring(0, 40)}..."`);
      res.status(201).json(intentRecord);
    } catch (e) {
      console.error("Failed to save intent:", e);
      res.status(500).json({ error: "Failed to save intent" });
    }
  });

  // 3. Delete or Complete an Intent
  app.delete("/api/intents/:id", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const { description } = req.body || {};
      const descQuery = (req.query?.desc as string) || '';
      const targetDesc = description || descQuery;

      // 1. PostgreSQL Delete
      if (dbPool && isDbConnected) {
        try {
          if (targetDesc) {
            await dbPool.query(
              "DELETE FROM broadcast_posts WHERE id = $1 OR description = $2",
              [id, targetDesc.trim()]
            );
          } else {
            await dbPool.query("DELETE FROM broadcast_posts WHERE id = $1", [id]);
          }
          await dbPool.query("DELETE FROM messages WHERE intent_id = $1", [id]);
        } catch (dbErr) {
          console.warn("DB intent delete error:", dbErr);
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

      console.log(`[Post Deleted Permanently] ID: ${id}`);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete intent" });
    }
  });

  // ==========================================
  // CHAT MESSAGES API
  // ==========================================

  // 4. Get Chat Messages for an Intent
  app.get("/api/intents/:id/messages", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const { id } = req.params;

      if (dbPool && isDbConnected) {
        try {
          const result = await dbPool.query(
            "SELECT * FROM messages WHERE intent_id = $1 ORDER BY created_at ASC",
            [id]
          );
          if (result.rows.length > 0) {
            const dbMsgs = result.rows.map(r => ({
              id: r.id,
              authorId: r.sender_id,
              text: r.text || r.content || '',
              content: r.content || r.text || '',
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
      const chatMessages = allMessages[id] || [];
      res.json(chatMessages);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // 5. Send Chat Message in an Intent
  app.post("/api/intents/:id/messages", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const message = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message payload required" });
      }

      const newMsg = {
        id: message.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        authorId: message.authorId || message.senderId || 'guest',
        senderId: message.senderId || message.authorId || 'guest',
        receiverId: message.receiverId || '',
        text: message.text || message.content || '',
        content: message.content || message.text || '',
        type: message.type || 'text',
        attachmentUrl: message.attachmentUrl || null,
        attachmentType: message.attachmentType || null,
        createdAt: message.createdAt || new Date().toISOString()
      };

      // 1. PostgreSQL Insert
      if (dbPool && isDbConnected) {
        try {
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

      // 2. Local file backup
      const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
      const chatMessages = allMessages[id] || [];
      chatMessages.push(newMsg);
      allMessages[id] = chatMessages;
      writeJsonFile(MESSAGES_FILE, allMessages);

      res.status(201).json(newMsg);
    } catch (e) {
      console.error("Failed to save message:", e);
      res.status(500).json({ error: "Failed to save message" });
    }
  });

  // ==========================================
  // SHOPS & BUSINESSES API
  // ==========================================

  app.get("/api/shops", async (req, res) => {
    try {
      if (dbPool && isDbConnected) {
        try {
          const result = await dbPool.query("SELECT * FROM shops ORDER BY created_at DESC");
          if (result.rows.length > 0) {
            return res.json(result.rows.map(r => ({
              id: r.id,
              name: r.name,
              type: r.type,
              categoryLabel: r.category_label,
              ownerName: r.owner_name,
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
      res.status(500).json({ error: e.message || "Failed to fetch shops" });
    }
  });

  app.post("/api/shops", async (req, res) => {
    try {
      const shop = req.body;
      if (!shop || !shop.name) return res.status(400).json({ error: "Shop name required" });

      const newShop = {
        id: shop.id || 'shop_' + Date.now().toString(36),
        name: shop.name.trim(),
        type: shop.type || 'shop',
        categoryLabel: shop.categoryLabel || shop.category_label || 'Local Business',
        ownerName: shop.ownerName || shop.owner_name || 'Owner',
        phone: shop.phone || '',
        area: shop.area || 'Local Area',
        address: shop.address || 'Market Area',
        description: shop.description || '',
        photoUrl: shop.photoUrl || shop.photo_url || null,
        rating: typeof shop.rating === 'number' ? shop.rating : 5.0,
        reviewCount: typeof shop.reviewCount === 'number' ? shop.reviewCount : 1,
        isVerified: true,
        createdAt: shop.createdAt || new Date().toISOString()
      };

      if (dbPool && isDbConnected) {
        try {
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
        } catch (e) {}
      }

      const shops = readJsonFile<any[]>(SHOPS_FILE, []);
      const updated = [newShop, ...shops.filter(s => s.id !== newShop.id)];
      writeJsonFile(SHOPS_FILE, updated);

      res.status(201).json(newShop);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to save shop" });
    }
  });

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

  app.post("/api/helpers", async (req, res) => {
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

  // AI chat history logging
  app.post("/api/chats", async (req, res) => {
    try {
      const { prompt, response: aiResponse, userId } = req.body;
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            "INSERT INTO chats (user_id, prompt, response, created_at) VALUES ($1, $2, $3, NOW())",
            [userId || 'anonymous', prompt || '', aiResponse || '']
          );
        } catch (e) {}
      }
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

      otpStore.set(cleanIdentifier, {
        code,
        expiresAt,
        attempts: 0,
        type: type === 'email' ? 'email' : 'mobile'
      });

      if (type === 'email') {
        let emailSent = false;
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
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
              subject: `Your LocoHelp Login OTP: ${code}`,
              text: `Namaste!\n\nYour LocoHelp login verification code is: ${code}\n\nThis OTP is valid for 5 minutes. Do not share this code with anyone.\n\nTeam LocoHelp`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                  <h2 style="color: #0066FF; margin-bottom: 8px;">LocoHelp Verification</h2>
                  <p style="font-size: 14px; color: #475569;">Namaste! Use the One-Time Password (OTP) below to securely log in to LocoHelp:</p>
                  <div style="background-color: #f0f4ff; border: 2px dashed #0066FF; padding: 18px; text-align: center; border-radius: 12px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0066FF;">${code}</span>
                  </div>
                  <p style="font-size: 12px; color: #64748b;">This OTP will expire in 5 minutes. If you did not request this code, please ignore this email.</p>
                </div>
              `
            });
            emailSent = true;
          } catch (err: any) {
            console.error("Nodemailer dispatch error:", err.message);
          }
        }

        console.log(`[OTP DISPATCH] Generated OTP for email ${cleanIdentifier}: ${code} (Sent via Nodemailer: ${emailSent})`);

        return res.json({
          success: true,
          message: emailSent 
            ? `Verification OTP sent to ${cleanIdentifier}. Please check your Inbox and Spam folder.`
            : `OTP generated for ${cleanIdentifier}.`,
          emailSent,
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
      const record = otpStore.get(cleanIdentifier);

      if (!record) {
        return res.status(400).json({ 
          error: "No OTP was requested for this identifier or it has expired. Please request a new OTP." 
        });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(cleanIdentifier);
        return res.status(400).json({ error: "OTP has expired. Please request a new OTP." });
      }

      if (record.attempts >= 5) {
        otpStore.delete(cleanIdentifier);
        return res.status(400).json({ error: "Too many failed attempts. Please request a new OTP." });
      }

      if (record.code !== cleanCode) {
        record.attempts += 1;
        return res.status(400).json({ 
          error: "गलत OTP है! (Invalid OTP). Please enter the exact code received in your message or email." 
        });
      }

      otpStore.delete(cleanIdentifier);

      const isEmail = type === 'email' || cleanIdentifier.includes('@');
      const user = {
        uid: (isEmail ? 'email_' : 'phone_') + (isEmail ? cleanIdentifier.replace(/[^a-z0-9]/g, '_') : cleanIdentifier.replace(/\D/g, '')),
        displayName: isEmail ? cleanIdentifier.split('@')[0] : `User +91 ${cleanIdentifier.replace(/\D/g, '')}`,
        email: isEmail ? cleanIdentifier : '',
        phone: !isEmail ? `+91 ${cleanIdentifier.replace(/\D/g, '')}` : '',
        verifiedAt: new Date().toISOString()
      };

      // Persist user to PostgreSQL profiles table
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO profiles (uid, full_name, email, phone, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (uid) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              updated_at = NOW()
          `, [user.uid, user.displayName, user.email, user.phone]);
        } catch (e) {}
      }

      console.log(`[AUTH SUCCESS] User successfully verified: ${user.uid}`);
      return res.json({ success: true, user });
    } catch (e) {
      console.error("OTP verify error:", e);
      return res.status(500).json({ error: "Failed to verify OTP" });
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
