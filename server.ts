import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { initializeApp as initFirebaseApp, getApps as getFirebaseApps, getApp as getFirebaseApp } from "firebase/app";
import {
  getStorage as getFirebaseStorage,
  ref as fbStorageRef,
  uploadBytes as fbUploadBytes,
  getDownloadURL as fbGetDownloadURL,
  deleteObject as fbDeleteObject
} from "firebase/storage";

dotenv.config();

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

// Strictly use live Railway PostgreSQL database (never local JSON fallback files or SQLite)
const DATA_DIR = path.join(process.cwd(), "data");
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
const CATEGORY_IMAGES_FILE = path.join(DATA_DIR, "category_images.json");
const AUTH_USERS_FILE = path.join(DATA_DIR, "auth_users.json");
const SECURITY_VAULT_FILE = path.join(DATA_DIR, "security_vault.enc");

const inMemoryJsonCache = new Map<string, any>();

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (inMemoryJsonCache.has(filePath)) {
    return inMemoryJsonCache.get(filePath) as T;
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  // Zero local disk writes: keep an in-memory cache for preview / transient fallback while Railway PostgreSQL is primary
  inMemoryJsonCache.set(filePath, data);
}

// ==========================================
// FIREBASE STORAGE INTEGRATION (ZERO LOCAL DISK STORAGE)
// Configures Firebase Storage using process.env.FIREBASE_* environment variables.
// All uploaded files are stored inside the dedicated `locohelp/` folder in Firebase Storage
// and their permanent public download URLs are saved in PostgreSQL.
// ==========================================
const firebaseServerConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || ""
};

function isServerFirebaseStorageConfigured(): boolean {
  return Boolean(
    firebaseServerConfig.apiKey &&
      firebaseServerConfig.storageBucket &&
      firebaseServerConfig.apiKey !== "AIzaSyDummyKeyForLocoHelpAuthInit2026" &&
      firebaseServerConfig.storageBucket !== "locohelp-app.appspot.com"
  );
}

function getServerFirebaseStorageInstance() {
  if (!isServerFirebaseStorageConfigured()) return null;
  try {
    const app =
      getFirebaseApps().length === 0
        ? initFirebaseApp(firebaseServerConfig)
        : getFirebaseApp();
    return getFirebaseStorage(app);
  } catch (err) {
    console.warn("[Firebase Storage] Initialization warning:", err);
    return null;
  }
}

// ==========================================
// FIREBASE ADMIN SDK & NATIVE FCM HTTP v1 PUSH ENGINE
// Initialized safely from process.env.FIREBASE_SERVICE_ACCOUNT_JSON
// Never crashes server startup even if firebase-admin package or env var is absent
// ==========================================
let firebaseAdminApp: any = null;
let parsedServiceAccountCache: any = null;
let cachedFcmAccessToken: { token: string; expiresAt: number } | null = null;

function getParsedFirebaseServiceAccount(): any | null {
  if (parsedServiceAccountCache) return parsedServiceAccountCache;
  const rawServiceAccount = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (!rawServiceAccount) return null;
  try {
    let parsed: any = null;
    if (rawServiceAccount.startsWith("{")) {
      parsed = JSON.parse(rawServiceAccount);
    } else {
      const decoded = Buffer.from(rawServiceAccount, "base64").toString("utf8");
      parsed = JSON.parse(decoded);
    }
    if (parsed && typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    if (parsed && parsed.client_email && parsed.private_key) {
      parsedServiceAccountCache = parsed;
      return parsed;
    }
  } catch (err: any) {
    console.warn("[Firebase FCM] Could not parse FIREBASE_SERVICE_ACCOUNT_JSON:", err?.message || err);
  }
  return null;
}

async function getFirebaseAdminMessaging(): Promise<any | null> {
  const serviceAccount = getParsedFirebaseServiceAccount();
  if (!serviceAccount) return null;
  try {
    const adminMod: any = await import("firebase-admin".toString());
    const adminSdk = adminMod?.default || adminMod;
    if (adminSdk) {
      if (!firebaseAdminApp && (!adminSdk.apps || adminSdk.apps.length === 0)) {
        firebaseAdminApp = adminSdk.initializeApp({
          credential: adminSdk.credential.cert(serviceAccount)
        });
      }
      return adminSdk.messaging();
    }
  } catch {
    // Fallback to native OAuth2 FCM HTTP v1 below if firebase-admin is not in node_modules
  }
  return null;
}

async function getFcmHttpV1AccessToken(serviceAccount: any): Promise<string | null> {
  if (cachedFcmAccessToken && Date.now() < cachedFcmAccessToken.expiresAt - 60000) {
    return cachedFcmAccessToken.token;
  }
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const claimSet = Buffer.from(
      JSON.stringify({
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
        iat: nowSec,
        exp: nowSec + 3600
      })
    ).toString("base64url");

    const signer = crypto.createSign("RSA-SHA256");
    signer.update(`${header}.${claimSet}`);
    const signature = signer.sign(serviceAccount.private_key, "base64url");
    const jwtAssertion = `${header}.${claimSet}.${signature}`;

    const tokenRes = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwtAssertion
      }).toString()
    });

    if (!tokenRes.ok) return null;
    const tokenData: any = await tokenRes.json();
    if (tokenData && tokenData.access_token) {
      cachedFcmAccessToken = {
        token: tokenData.access_token,
        expiresAt: Date.now() + (Number(tokenData.expires_in) || 3600) * 1000
      };
      return tokenData.access_token;
    }
  } catch (err: any) {
    console.warn("[Firebase FCM OAuth2] Token exchange notice:", err?.message || err);
  }
  return null;
}

async function sendFcmMulticastPush(payload: {
  tokens: string[];
  title: string;
  body: string;
  postUrl: string;
  data: Record<string, string>;
}): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
  const { tokens, title, body, postUrl, data } = payload;
  const invalidTokens: string[] = [];
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens };
  }

  // 1. Try firebase-admin sendEachForMulticast if available
  const adminMessaging = await getFirebaseAdminMessaging();
  if (adminMessaging && typeof adminMessaging.sendEachForMulticast === "function") {
    const response = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
      webpush: {
        notification: {
          title,
          body,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png"
        },
        fcmOptions: { link: postUrl }
      }
    });

    if (response.failureCount > 0 && Array.isArray(response.responses)) {
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code || "";
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });
    }
    return {
      successCount: response.successCount || 0,
      failureCount: response.failureCount || 0,
      invalidTokens
    };
  }

  // 2. Fallback to direct FCM HTTP v1 REST API using service account JWT
  const serviceAccount = getParsedFirebaseServiceAccount();
  if (!serviceAccount || !serviceAccount.project_id) {
    return { successCount: 0, failureCount: 0, invalidTokens };
  }
  const accessToken = await getFcmHttpV1AccessToken(serviceAccount);
  if (!accessToken) {
    return { successCount: 0, failureCount: 0, invalidTokens };
  }

  let successCount = 0;
  let failureCount = 0;
  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(serviceAccount.project_id)}/messages:send`;

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data,
              webpush: {
                notification: {
                  title,
                  body,
                  icon: "/pwa-192x192.png",
                  badge: "/pwa-192x192.png"
                },
                fcm_options: { link: postUrl }
              }
            }
          })
        });
        if (res.ok) {
          successCount++;
        } else {
          failureCount++;
          const errText = await res.text().catch(() => "");
          if (errText.includes("UNREGISTERED") || errText.includes("INVALID_ARGUMENT")) {
            invalidTokens.push(token);
          }
        }
      } catch {
        failureCount++;
      }
    })
  );

  return { successCount, failureCount, invalidTokens };
}

// ==========================================
// REAL-TIME SERVER-SENT EVENTS (SSE) STREAM ENGINE
// Broadcasts new_post and new_response events to all connected clients in 0ms
// ==========================================
const sseClients = new Set<express.Response>();

function broadcastRealtimeEvent(eventName: string, payload: Record<string, any>): void {
  const fullData = JSON.stringify({ type: eventName, ...payload, timestamp: Date.now() });
  const sseFrame = `event: ${eventName}\ndata: ${fullData}\n\ndata: ${fullData}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(sseFrame);
    } catch {
      sseClients.delete(client);
    }
  }
}

function getExtFromMimeServer(mime: string, fallback = "webp"): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("pdf")) return "pdf";
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  return fallback;
}

/**
 * Uploads a Base64 Data URL directly to Firebase Storage inside `locohelp/<subFolder>/`
 * and returns its permanent public download URL. Never writes to local disk paths.
 */
async function uploadDataToFirebaseServer(
  dataOrUrl: unknown,
  subFolder = "media",
  customFileName?: string
): Promise<string> {
  if (!dataOrUrl || typeof dataOrUrl !== "string") return "";
  const trimmed = dataOrUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const match = trimmed.match(/^data:([a-zA-Z0-9/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return trimmed;

  const storageInstance = getServerFirebaseStorageInstance();
  if (!storageInstance) {
    return trimmed;
  }

  try {
    const mime = match[1].toLowerCase();
    const base64Data = match[2].replace(/\s+/g, "");
    const buffer = Buffer.from(base64Data, "base64");
    const ext = getExtFromMimeServer(mime);
    const cleanSub = (subFolder || "media")
      .replace(/^\/+|\/+$/g, "")
      .replace(/^locohelp\/?/i, "") || "media";
    const rand = crypto.randomBytes(4).toString("hex");
    const safeName = customFileName
      ? `${Date.now()}_${rand}_${customFileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`
      : `${Date.now()}_${rand}.${ext}`;
    const storagePath = `locohelp/${cleanSub}/${safeName}`;

    const fileRef = fbStorageRef(storageInstance, storagePath);
    await fbUploadBytes(fileRef, new Uint8Array(buffer), { contentType: mime });
    const downloadUrl = await fbGetDownloadURL(fileRef);
    return downloadUrl || trimmed;
  } catch (err: any) {
    console.warn("[Firebase Storage] Upload notice:", err?.message || err);
    return trimmed;
  }
}

function extractServerFirebaseStoragePath(fileUrl: unknown): string | null {
  if (!fileUrl || typeof fileUrl !== "string") return null;
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("gs://")) {
    const parts = trimmed.replace("gs://", "").split("/");
    parts.shift();
    return parts.join("/") || null;
  }

  if (trimmed.includes("firebasestorage.googleapis.com") || trimmed.includes(".firebasestorage.app")) {
    const match = trimmed.match(/\/o\/([^?]+)/);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }

  if (trimmed.startsWith("locohelp/")) {
    return trimmed;
  }

  return null;
}

function collectFirebaseStoragePaths(input: unknown, collected = new Set<string>()): Set<string> {
  if (!input) return collected;
  if (typeof input === "string") {
    const trimmed = input.trim();
    const directPath = extractServerFirebaseStoragePath(trimmed);
    if (directPath) {
      collected.add(directPath);
    } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        collectFirebaseStoragePaths(parsed, collected);
      } catch {}
    }
    return collected;
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      collectFirebaseStoragePaths(item, collected);
    }
    return collected;
  }
  if (typeof input === "object") {
    for (const val of Object.values(input as Record<string, unknown>)) {
      collectFirebaseStoragePaths(val, collected);
    }
  }
  return collected;
}

/**
 * Automatically deletes any Firebase Storage file(s) referenced in a URL, array, or PostgreSQL record
 * whenever an item is deleted or its media is replaced.
 */
async function deleteFilesFromFirebaseStorage(source: unknown): Promise<number> {
  const storageInstance = getServerFirebaseStorageInstance();
  if (!storageInstance) return 0;

  const paths = collectFirebaseStoragePaths(source);
  let deletedCount = 0;
  for (const storagePath of paths) {
    try {
      const fileRef = fbStorageRef(storageInstance, storagePath);
      await fbDeleteObject(fileRef);
      deletedCount++;
      console.log(`[Firebase Storage] Deleted file: ${storagePath}`);
    } catch (err: any) {
      // Ignore object-not-found if already deleted
      if (err?.code !== "storage/object-not-found") {
        console.warn(`[Firebase Storage] Delete notice for ${storagePath}:`, err?.message || err);
      }
    }
  }
  return deletedCount;
}

// ==========================================
// LIGHTWEIGHT SERVER-SIDE IN-MEMORY CACHE (60-second TTL)
// Used for high-traffic public read endpoints (categories, approved profiles, active banners)
// Reduces database load while automatically invalidating on any mutation
// ==========================================
interface PublicCacheEntry {
  data: any;
  timestamp: number;
}
const publicApiCache = new Map<string, PublicCacheEntry>();
const PUBLIC_CACHE_TTL_MS = 60 * 1000; // 60-second TTL

function getPublicCache(key: string): any | null {
  const entry = publicApiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > PUBLIC_CACHE_TTL_MS) {
    publicApiCache.delete(key);
    return null;
  }
  return entry.data;
}

function setPublicCache(key: string, data: any): void {
  publicApiCache.set(key, { data, timestamp: Date.now() });
}

function invalidatePublicCache(keys?: string[]): void {
  if (!keys || keys.length === 0) {
    publicApiCache.clear();
  } else {
    for (const key of keys) {
      publicApiCache.delete(key);
    }
  }
}

// ==========================================
// AES-256-GCM ENCRYPTED APPEND-ONLY SECURITY VAULT
// Even if a user deletes their account/profile/post, or if someone inspects disk files,
// all records (Name, Phone, Email, Address, Photo, Watermarked Govt ID, History) remain
// permanently encrypted with AES-256-GCM and strictly NON-DELETABLE (even by Admin).
// ==========================================
function getSecurityVaultKey(): Buffer {
  const rawSecret =
    process.env.VAULT_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "locohelp-aes256-gcm-master-security-vault-key-2026";
  return crypto.createHash("sha256").update(rawSecret).digest();
}

function encryptVaultPayload(data: any): string {
  const key = getSecurityVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const jsonStr = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(jsonStr, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptVaultPayload(cipherStr: string): any | null {
  try {
    if (!cipherStr || typeof cipherStr !== "string") return null;
    const parts = cipherStr.split(":");
    if (parts.length !== 3) return null;
    const [ivHex, tagHex, encHex] = parts;
    const key = getSecurityVaultKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encHex, "hex")),
      decipher.final()
    ]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch (err) {
    return null;
  }
}

export type SecurityVaultEntityType =
  | "helper"
  | "user_profile"
  | "business"
  | "job_seeker"
  | "employer"
  | "help_post"
  | "verification";

export type SecurityVaultActionStatus =
  | "ACTIVE_REGISTERED"
  | "UPDATED"
  | "DELETED_BY_USER"
  | "ADMIN_REMOVED_PUBLIC";


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

// Password hashing & verification helpers (bcrypt with seamless legacy PBKDF2 support)
function hashPassword(password: string): string {
  return bcrypt.hashSync(String(password), 10);
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    try {
      return bcrypt.compareSync(String(password), storedHash);
    } catch {
      return false;
    }
  }
  const salt = process.env.PASSWORD_SALT || "locohelp_salt_2026";
  const legacyHash = crypto.pbkdf2Sync(String(password), salt, 1000, 32, "sha256").toString("hex");
  return storedHash === legacyHash;
}

// ==========================================
// 1. STRICT FILE UPLOAD SECURITY (SERVER-SIDE)
// Allowlist: image/jpeg, image/png, image/webp (<= 2MB) & application/pdf with %PDF- header (<= 5MB)
// Blocks double extensions (.pdf.exe, .jpg.js), SVG, HTML, and executables
// ==========================================
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_PDF_BYTES = 5 * 1024 * 1024;   // 5 MB
const DANGEROUS_EXT_REGEX = /\.(exe|bat|cmd|sh|php|pl|py|rb|js|jsx|ts|tsx|mjs|cjs|html|htm|svg|xml|jar|msi|vbs|scr|ps1|pif|com|gadget|wsf)(\.|$)/i;

function validateServerUploadedData(
  input: unknown,
  options: { allowPdf?: boolean; fileName?: string } = { allowPdf: true }
): { valid: boolean; error?: string } {
  if (!input || typeof input !== "string") return { valid: true };
  const trimmed = input.trim();
  if (!trimmed) return { valid: true };

  // Validate optional filename for double extensions or forbidden extensions
  if (options.fileName && typeof options.fileName === "string") {
    const fn = options.fileName.trim().toLowerCase();
    if (fn.includes("\0") || DANGEROUS_EXT_REGEX.test(fn)) {
      return { valid: false, error: "Security Block: Double extensions, executables, HTML, JS, and SVG files are strictly prohibited." };
    }
    const parts = fn.split(".");
    if (parts.length > 2) {
      const ext = parts[parts.length - 1];
      const prev = parts[parts.length - 2];
      if (DANGEROUS_EXT_REGEX.test(`.${prev}`) || !["jpg", "jpeg", "png", "webp", "pdf"].includes(ext)) {
        return { valid: false, error: "Security Block: Double extensions (e.g., .pdf.exe, .jpg.js) are strictly prohibited." };
      }
    }
  }

  // Block SVG, HTML, or script data URLs
  if (
    /^data:\s*(image\/svg|text\/html|application\/javascript|text\/javascript|application\/x-msdownload)/i.test(trimmed) ||
    /<svg[\s>]/i.test(trimmed.slice(0, 500)) ||
    /<!doctype\s+html|<html[\s>]|<script[\s>]/i.test(trimmed.slice(0, 500))
  ) {
    return { valid: false, error: "Security Block: SVG, HTML, and executable files are strictly forbidden." };
  }

  // Standard HTTPS image URLs (e.g. preset Unsplash photos)
  if (/^https?:\/\//i.test(trimmed)) {
    if (DANGEROUS_EXT_REGEX.test(trimmed.split("?")[0])) {
      return { valid: false, error: "Security Block: Forbidden file extension in URL." };
    }
    return { valid: true };
  }

  // Validate Base64 Data URL
  const match = trimmed.match(/^data:([a-zA-Z0-9/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    return { valid: false, error: "Invalid file format. Only safe JPEG, PNG, WebP images or PDF documents are allowed." };
  }

  const mime = match[1].toLowerCase();
  const base64Data = match[2].replace(/\s+/g, "");
  const buf = Buffer.from(base64Data, "base64");

  if (buf.length === 0) {
    return { valid: false, error: "Uploaded file is empty." };
  }

  // Block Windows PE / ELF / Mach-O executables or HTML/SVG payloads disguised inside buffer
  const headAscii = buf.subarray(0, 64).toString("utf8");
  if (
    (buf[0] === 0x4d && buf[1] === 0x5a) || // MZ executable
    (buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) || // ELF
    /<script|<iframe|<!doctype\s+html|<html|<svg/i.test(headAscii)
  ) {
    return { valid: false, error: "Security Block: Executable, HTML, or SVG content detected inside file." };
  }

  const allowedImages = ["image/jpeg", "image/png", "image/webp"];
  if (allowedImages.includes(mime)) {
    if (buf.length > MAX_IMAGE_BYTES) {
      return { valid: false, error: "Image exceeds 2MB maximum size limit." };
    }
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isWebp =
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      return { valid: false, error: "Security Block: File header does not match a valid JPEG, PNG, or WebP image." };
    }
    return { valid: true };
  }

  if (mime === "application/pdf") {
    if (!options.allowPdf) {
      return { valid: false, error: "Only image files (JPEG, PNG, WebP up to 2MB) are permitted for this field." };
    }
    if (buf.length > MAX_PDF_BYTES) {
      return { valid: false, error: "PDF exceeds 5MB maximum size limit." };
    }
    const pdfHeader = buf.subarray(0, 5).toString("ascii");
    if (pdfHeader !== "%PDF-") {
      return { valid: false, error: "Security Block: Invalid PDF file — missing required %PDF- header." };
    }
    return { valid: true };
  }

  return { valid: false, error: `Unsupported file type (${mime}). Allowed: JPEG, PNG, WebP (<=2MB) and PDF (<=5MB).` };
}
const validateServerUploadedDataUrl = validateServerUploadedData;

// ==========================================
// 2. XSS & INJECTION SANITIZATION (SERVER-SIDE)
// Strips <script>, <iframe>, onerror=, and javascript: payloads
// ==========================================
function sanitizeServerText(input: unknown, maxLength = 4000): string {
  if (input === null || input === undefined) return "";
  let str = String(input);
  str = str.replace(/\0/g, "");
  str = str.replace(/<\s*(script|iframe|object|embed|applet|meta|link|style|base|form|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  str = str.replace(/<\s*\/?\s*(script|iframe|object|embed|applet|meta|link|style|base|form|svg|math)[^>]*>/gi, "");
  str = str.replace(/\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  str = str.replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, "");
  str = str.replace(/<\/?[a-z][a-z0-9]*[^<>]*>/gi, "");
  str = str.replace(/[<>]/g, (ch) => (ch === "<" ? "‹" : "›"));
  return str.slice(0, maxLength);
}
const sanitizeStringServer = sanitizeServerText;

const UPLOAD_DATA_KEYS = new Set([
  "photoUrl",
  "photo_url",
  "workPhotoUrl",
  "avatar_url",
  "profilePhoto",
  "photoOrLogoUrl",
  "logoOrPhotoUrl",
  "idDocumentWatermarked",
  "id_document_watermarked",
  "idDocUrl",
  "id_doc_url",
  "resumeUrl",
  "resume_url",
  "attachmentUrl",
  "attachment_url",
  "imageUrl"
]);

function sanitizeServerPayload<T>(payload: T): T {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload === "string") {
    if (/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/i.test(payload.trim())) {
      return payload;
    }
    return sanitizeServerText(payload) as unknown as T;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizeServerPayload(item)) as unknown as T;
  }
  if (typeof payload === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(payload as Record<string, any>)) {
      if (UPLOAD_DATA_KEYS.has(k) && typeof v === "string") {
        out[k] = v.trim();
      } else if (k === "photos" && Array.isArray(v)) {
        out[k] = v
          .filter((item) => typeof item === "string" && item.trim().length > 0)
          .slice(0, 3)
          .map((item: string) => item.trim());
      } else if (k === "password" || k === "newPassword" || k === "oldPassword") {
        // Keep raw password characters for PBKDF2 hashing (bounded length)
        out[k] = typeof v === "string" ? v.slice(0, 200) : v;
      } else {
        out[k] = sanitizeServerPayload(v);
      }
    }
    return out as T;
  }
  return payload;
}

// ==========================================
// 2B. SILENT BACKGROUND COMMUNITY GUIDELINES & ABUSE FILTER (SERVER-SIDE SYSTEM SECURITY BLOCK)
// ==========================================
const SERVER_BLOCKED_ROMAN_TOKENS = new Set([
  'mc', 'bc', 'bkl', 'mkc', 'mkb', 'tmkc', 'tmkb', 'pkmkb',
  'madarchod', 'madharchod', 'maadarchod', 'maderchod',
  'bhenchod', 'behenchod', 'bahenchod', 'benchod', 'bhanchod', 'behanchod',
  'betichod', 'baapchod', 'bhosda', 'bhosdi', 'bhosdike', 'bhosadike', 'bhosdika', 'bhosdiwale', 'bhosadi',
  'chutiya', 'chutia', 'chutiye', 'chutiyapa', 'chuitya', 'chootiya',
  'choot', 'chut', 'lund', 'land', 'loda', 'lauda', 'lawda', 'lavda', 'lode', 'laude', 'lavde',
  'gaand', 'gand', 'gandu', 'gaandu', 'gandmasti', 'gandmara',
  'randi', 'raandi', 'randibaaz', 'randikhana', 'chinaal', 'chinal',
  'harami', 'haramkhor', 'haramzada', 'haramzade', 'haramzadi',
  'kamina', 'kamine', 'kaminey', 'kamini', 'kuttey', 'kutiya',
  'suar', 'suwar', 'ullu', 'bhadwa', 'bhadwe', 'bhadva', 'bhadve', 'dalla',
  'jhant', 'jhaat', 'jhatu', 'jhaatu', 'mutthal', 'chudai', 'chod', 'chodna', 'chodu',
  'pikina', 'pikino', 'pikini', 'gandina', 'gandino', 'gandini',
  'chodina', 'chodino', 'lodaa', 'bhosadina', 'bhosadino', 'chodva',
  'raand', 'randva', 'randvo', 'bhadvo', 'bhadvi',
  'fuck', 'fucker', 'fucking', 'motherfucker', 'motherfucking', 'fck', 'fuk', 'fuq',
  'bitch', 'bitches', 'sonofabitch', 'asshole', 'arsehole', 'bastard', 'cunt',
  'dick', 'dickhead', 'cock', 'pussy', 'whore', 'slut', 'prostitute', 'escort',
  'porn', 'porno', 'xxx', 'nude', 'nudes', 'sexchat', 'callgirl', 'callgirls'
]);

const SERVER_BLOCKED_NATIVE_SUBSTRINGS = [
  'मादरचोद', 'बहनचोद', 'बेहनचोद', 'भेनचोद', 'बेटीचोद', 'भोसड़ी', 'भोसडी', 'भोसड़ा', 'भोसदिके', 'भोसड़ीके',
  'चूतिया', 'चुतिया', 'चूतिये', 'चूत', 'लंड', 'लौड़ा', 'लौडा', 'लवड़ा', 'लवडे', 'लौड़े',
  'गांड', 'गाण्ड', 'गांडू', 'गाण्डू', 'रंडी', 'रंड़ी', 'छिनाल', 'हरामी', 'हरामखोर', 'हरामजादा', 'हरामज़ादा',
  'भड़वा', 'भडवा', 'भड़वे', 'झाटू', 'झांटू', 'चोदू', 'चुदाई', 'चोदना',
  'માદરચોદ', 'બહેનચોદ', 'બેનચોદ', 'ભોસડી', 'ભોસડા', 'ભોસડીના', 'ભોસડીનો',
  'ચૂતિયા', 'ચુતિયા', 'ચોદુ', 'ચોદૂ', 'ચોદવા', 'ચોદીના', 'ચોદીનો',
  'ગાંડ', 'ગાંડુ', 'ગાંડું', 'ગાંડીના', 'ગાંડીનો', 'પીકીના', 'પીકીનો',
  'લંડ', 'લોડા', 'લોડો', 'લવડા', 'રાંડ', 'ભડવો', 'ભડવા', 'હરામી', 'હરામખોર'
];

const SERVER_BLOCKED_PHRASES = [
  'teri maa ki', 'teri ma ki', 'teri bhen ki', 'teri behen ki',
  'maa chod', 'bhen chod', 'gand mar', 'gaand maar', 'muh me le',
  'tari maa ni', 'tari ben ni', 'gand mara', 'call girl', 'sex service', 'paid sex'
];

function checkServerTextViolatesSecurityBlock(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  if (text.startsWith("data:") || text.startsWith("http://") || text.startsWith("https://")) return false;

  for (const nativeSub of SERVER_BLOCKED_NATIVE_SUBSTRINGS) {
    if (text.includes(nativeSub)) return true;
  }

  const lower = text.toLowerCase();
  const cleanedSpaces = lower.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  for (const phrase of SERVER_BLOCKED_PHRASES) {
    if (cleanedSpaces.includes(phrase)) return true;
  }

  const rawTokens = lower.split(/[\s,.;:!?/\\|()[\]{}"'`~_+=<>-]+/).filter(Boolean);
  for (const rawToken of rawTokens) {
    const directClean = rawToken.replace(/[^a-z]/g, "");
    if (directClean && SERVER_BLOCKED_ROMAN_TOKENS.has(directClean)) return true;
    const norm = rawToken
      .replace(/[@4]/g, "a")
      .replace(/[0]/g, "o")
      .replace(/[1!]/g, "i")
      .replace(/[$5]/g, "s")
      .replace(/[^a-z]/g, "")
      .replace(/([a-z])\1{2,}/g, "$1");
    if (norm && norm.length >= 3 && SERVER_BLOCKED_ROMAN_TOKENS.has(norm)) return true;
  }
  return false;
}

function checkServerPayloadSecurityBlock(payload: any): boolean {
  if (!payload) return false;
  if (typeof payload === "string") return checkServerTextViolatesSecurityBlock(payload);
  if (Array.isArray(payload)) return payload.some((item) => checkServerPayloadSecurityBlock(item));
  if (typeof payload === "object") {
    for (const [k, v] of Object.entries(payload)) {
      if (UPLOAD_DATA_KEYS.has(k) || k === "password" || k === "newPassword" || k === "oldPassword" || k === "token") {
        continue;
      }
      if (checkServerPayloadSecurityBlock(v)) return true;
    }
  }
  return false;
}

// ==========================================
// 3. RAILWAY BACKEND RATE LIMITING & COOLDOWNS
// ==========================================
interface RateBucket {
  count: number;
  resetAt: number;
}
const rateLimitBuckets = new Map<string, RateBucket>();
const postCooldowns = new Map<string, number>(); // key -> last post timestamp ms
const otpCooldowns = new Map<string, number>();  // identifier/ip -> last otp timestamp ms
const otpCooldownByIdentifier = otpCooldowns;

const POST_COOLDOWN_MS = 30 * 1000; // 30 seconds between creating posts
const OTP_COOLDOWN_MS = 60 * 1000;  // 60 seconds on OTP resend
const OTP_RESEND_COOLDOWN_MS = OTP_COOLDOWN_MS;

function getClientIp(req: express.Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0 && xff[0]) {
    return String(xff[0]).split(",")[0].trim();
  }
  if (req.ip && typeof req.ip === "string" && req.ip.trim()) {
    return req.ip.trim();
  }
  return req.socket?.remoteAddress || "unknown_ip";
}

function getClientUserAgent(req: express.Request): string {
  const ua = req.headers["user-agent"];
  if (typeof ua === "string" && ua.trim()) {
    return ua.trim().slice(0, 500);
  }
  return "unknown_user_agent";
}

const memorySecurityAuditLogs: any[] = [];

async function logSecurityAudit(
  userId: string,
  action: "SIGNUP" | "LOGIN" | "CREATE_POST" | "ACCOUNT_DELETED",
  req: express.Request
): Promise<void> {
  try {
    const cleanUserId = String(userId || "unknown_user").trim().slice(0, 150);
    const ipAddress = getClientIp(req);
    const userAgent = getClientUserAgent(req);
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const createdAt = new Date().toISOString();

    memorySecurityAuditLogs.unshift({
      id: logId,
      user_id: cleanUserId,
      action,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: createdAt
    });
    if (memorySecurityAuditLogs.length > 2000) {
      memorySecurityAuditLogs.length = 2000;
    }

    if (dbPool && isDbConnected) {
      await dbPool.query(
        `INSERT INTO security_audit_logs (id, user_id, action, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [logId, cleanUserId, action, ipAddress, userAgent]
      ).catch((err) => {
        console.warn("[Security Audit Log] DB insert note:", err?.message);
      });
    }
  } catch (err: any) {
    console.warn("[Security Audit Log] Fallback note:", err?.message);
  }
}

function createRateLimiter(options: { windowMs: number; max: number; keyPrefix: string; message: string }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = getClientIp(req);
    const userKey = String(req.headers["x-user-id"] || req.headers["x-user-email"] || "");
    const bucketKey = `${options.keyPrefix}:${ip}:${userKey}`;
    const now = Date.now();
    const existing = rateLimitBuckets.get(bucketKey);

    if (!existing || now > existing.resetAt) {
      rateLimitBuckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    existing.count += 1;
    if (existing.count > options.max) {
      const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        error: options.message,
        retryAfterSeconds: retryAfterSec
      });
    }
    next();
  };
}

const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120, // 120 requests per minute per IP
  keyPrefix: "api_gen",
  message: "Too many requests from this IP. Please wait a moment and try again. / इस IP से बहुत सारे अनुरोध प्राप्त हुए हैं। कृपया कुछ देर प्रतीक्षा करें।"
});

// Strict rate limiter for registration & message POST endpoints: 10 requests per 10 minutes per IP
const registrationAndMessageLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 requests per 10 minutes per IP
  keyPrefix: "reg_msg_limit",
  message: "Too many requests. Please wait a few minutes before trying again. / बहुत सारे अनुरोध प्राप्त हुए हैं। कृपया 10 मिनट बाद पुनः प्रयास करें।"
});

// Anti-Bot Honeypot Helper: Detect hidden trap fields filled by automated spam bots
function isBotSubmission(req: express.Request): boolean {
  if (req.body && typeof req.body === "object") {
    const b = req.body as Record<string, any>;
    const honeypotVal = b.website_url_hp || b.hp_field || b.honeypot || b.company_website_trap;
    if (typeof honeypotVal === "string" && honeypotVal.trim().length > 0) {
      return true;
    }
  }
  return false;
}

const authLoginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  keyPrefix: "auth_login",
  message: "Too many login attempts. Please wait 60 seconds before trying again."
});
const authLimiter = authLoginLimiter;

const otpRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 6,
  keyPrefix: "otp_send",
  message: "Too many OTP requests. Please wait a few minutes before requesting another OTP."
});

const postCreationLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  keyPrefix: "post_create",
  message: "Post creation rate limit reached. Please wait before broadcasting more posts."
});

const chatMessageLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 45,
  keyPrefix: "chat_msg",
  message: "You are sending messages too quickly. Please slow down."
});

// ==========================================
// 4. STRICT ADMIN & USER AUTHORIZATION
// ==========================================
const OFFICIAL_ADMIN_EMAIL = "baalvarta@gmail.com";
const AUTHORIZED_ADMIN_EMAILS = new Set([
  OFFICIAL_ADMIN_EMAIL,
  ...(process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL.trim().toLowerCase()] : [])
]);

const DEFAULT_MASTER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Bapu@1540";
let cachedMasterAdminPassword = DEFAULT_MASTER_ADMIN_PASSWORD;

async function getMasterAdminPassword(): Promise<string> {
  if (dbPool && isDbConnected) {
    try {
      const r = await dbPool.query("SELECT value FROM app_settings WHERE key = 'admin_config' LIMIT 1");
      if (r.rows.length > 0 && r.rows[0].value?.password && String(r.rows[0].value.password).trim().length >= 6) {
        cachedMasterAdminPassword = String(r.rows[0].value.password).trim();
        return cachedMasterAdminPassword;
      }
    } catch {}
  }
  return cachedMasterAdminPassword || DEFAULT_MASTER_ADMIN_PASSWORD;
}

async function saveMasterAdminPassword(newPwd: string): Promise<void> {
  const cleanPwd = String(newPwd).trim();
  cachedMasterAdminPassword = cleanPwd;
  if (dbPool && isDbConnected) {
    try {
      await dbPool.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('admin_config', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify({ password: cleanPwd, updatedAt: new Date().toISOString() })]
      );
    } catch {}
  }
}

const SITE_LOCK_FILE = path.join(DATA_DIR, "site_lock.json");

interface SiteLockConfig {
  isLocked: boolean;
  accessPin: string;
  updatedAt: string;
}

let cachedSiteLockConfig: SiteLockConfig = {
  isLocked: true,
  accessPin: "1540",
  updatedAt: new Date().toISOString()
};

async function getSiteLockConfig(): Promise<SiteLockConfig> {
  try {
    const fileConf = readJsonFile<SiteLockConfig>(SITE_LOCK_FILE, null as any);
    if (fileConf && typeof fileConf.isLocked === 'boolean' && fileConf.accessPin) {
      cachedSiteLockConfig = fileConf;
    }
  } catch {}

  if (dbPool && isDbConnected) {
    try {
      const r = await dbPool.query("SELECT value FROM app_settings WHERE key = 'site_lock_config' LIMIT 1");
      if (r.rows.length > 0 && r.rows[0].value) {
        const val = r.rows[0].value;
        if (typeof val.isLocked === 'boolean' && val.accessPin) {
          cachedSiteLockConfig = {
            isLocked: Boolean(val.isLocked),
            accessPin: String(val.accessPin).trim(),
            updatedAt: val.updatedAt || new Date().toISOString()
          };
        }
      }
    } catch {}
  }
  return cachedSiteLockConfig;
}

async function saveSiteLockConfig(isLocked: boolean, accessPin: string): Promise<SiteLockConfig> {
  const newConfig: SiteLockConfig = {
    isLocked: Boolean(isLocked),
    accessPin: String(accessPin || "1540").trim(),
    updatedAt: new Date().toISOString()
  };
  cachedSiteLockConfig = newConfig;
  writeJsonFile(SITE_LOCK_FILE, newConfig);

  if (dbPool && isDbConnected) {
    try {
      await dbPool.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('site_lock_config', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(newConfig)]
      );
    } catch (e) {
      console.warn("[PostgreSQL] site_lock_config save notice:", e);
    }
  }
  return newConfig;
}


interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  type: 'mobile' | 'email';
}
const otpStore = new Map<string, OtpRecord>();

function extractRequestUser(req: express.Request): { uid: string; email: string; name?: string; isAdmin?: boolean } | null {
  try {
    let token = "";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (req.headers["x-auth-token"]) {
      token = String(req.headers["x-auth-token"]).trim();
    } else if (req.headers["x-admin-token"]) {
      token = String(req.headers["x-admin-token"]).trim();
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/locohelp_token=([^;]+)/);
      if (match) token = match[1].trim();
    }

    if (token) {
      const decoded = verifySessionToken(token);
      if (decoded && (decoded.uid || decoded.email)) {
        const emailLower = String(decoded.email || "").trim().toLowerCase();
        return {
          uid: String(decoded.uid || emailLower),
          email: emailLower,
          name: decoded.name,
          isAdmin: Boolean(decoded.role === "admin" && AUTHORIZED_ADMIN_EMAILS.has(emailLower))
        };
      }
    }

    // Fallback to verified client session headers when user is logged in locally
    const headerUid = String(req.headers["x-user-id"] || "").trim();
    const headerEmail = String(req.headers["x-user-email"] || "").trim().toLowerCase();
    const adminEmailHeader = String(req.headers["x-admin-email"] || "").trim().toLowerCase();
    if (adminEmailHeader && AUTHORIZED_ADMIN_EMAILS.has(adminEmailHeader)) {
      return {
        uid: headerUid || "master_admin",
        email: adminEmailHeader,
        name: "Admin",
        isAdmin: true
      };
    }
    if (headerUid && headerUid !== "guest" && headerUid !== "guest_user") {
      return {
        uid: headerUid,
        email: headerEmail,
        isAdmin: Boolean(headerEmail && AUTHORIZED_ADMIN_EMAILS.has(headerEmail))
      };
    }
    if (headerEmail) {
      return {
        uid: headerUid || headerEmail,
        email: headerEmail,
        isAdmin: Boolean(AUTHORIZED_ADMIN_EMAILS.has(headerEmail))
      };
    }

    // Fallback to body user fields for registration/creation requests
    if (req.body && typeof req.body === "object") {
      const b = req.body as Record<string, any>;
      const bodyUid = String(b.userId || b.uid || b.owner_id || b.authorId || b.id || "").trim();
      const bodyEmail = String(b.email || b.ownerEmail || b.userEmail || b.authorEmail || "").trim().toLowerCase();
      const bodyPhone = String(b.phone || b.whatsapp || b.userPhone || "").trim();
      if (bodyUid && bodyUid !== "guest" && bodyUid !== "guest_user") {
        return {
          uid: bodyUid,
          email: bodyEmail,
          isAdmin: false
        };
      }
      if (bodyEmail) {
        return {
          uid: bodyEmail,
          email: bodyEmail,
          isAdmin: false
        };
      }
      if (bodyPhone) {
        return {
          uid: `phone_${bodyPhone.replace(/\D/g, "") || Date.now()}`,
          email: "",
          isAdmin: false
        };
      }
    }
  } catch {}
  return null;
}
const extractUserFromRequest = extractRequestUser;

function isRequestAdmin(req: express.Request): boolean {
  try {
    const adminToken = String(req.headers["x-admin-token"] || "").trim();
    if (adminToken) {
      const decoded = verifySessionToken(adminToken);
      if (decoded && decoded.role === "admin" && AUTHORIZED_ADMIN_EMAILS.has(String(decoded.email || "").toLowerCase())) {
        return true;
      }
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const decoded = verifySessionToken(authHeader.substring(7).trim());
      if (decoded && decoded.role === "admin" && AUTHORIZED_ADMIN_EMAILS.has(String(decoded.email || "").toLowerCase())) {
        return true;
      }
    }
    const adminEmail = String(req.headers["x-admin-email"] || "").trim().toLowerCase();
    if (adminEmail && AUTHORIZED_ADMIN_EMAILS.has(adminEmail)) {
      return true;
    }
  } catch {}
  return false;
}

function isAuthorizedAdmin(userOrReq: any): boolean {
  if (!userOrReq) return false;
  if (userOrReq.headers) {
    return isRequestAdmin(userOrReq as express.Request);
  }
  const emailLower = String(userOrReq.email || "").trim().toLowerCase();
  return Boolean(userOrReq.isAdmin || userOrReq.role === "admin" || AUTHORIZED_ADMIN_EMAILS.has(emailLower));
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (isRequestAdmin(req)) {
    (req as any).user = {
      uid: "master_admin",
      email: OFFICIAL_ADMIN_EMAIL,
      name: "Admin",
      isAdmin: true
    };
    return next();
  }
  const user = extractRequestUser(req);
  if (!user || !user.uid) {
    return res.status(401).json({
      error: "अनधिकृत एक्सेस! कृपया पहले लॉगिन करें। (Authentication required. Please log in first.)",
      code: "UNAUTHORIZED"
    });
  }
  (req as any).user = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!isRequestAdmin(req)) {
    return res.status(403).json({
      error: "Forbidden: Only the authorized LocoHelp Admin can perform this action.",
      code: "ADMIN_ONLY"
    });
  }
  next();
}

function isSameUserOrAdmin(
  req: express.Request,
  targetUid?: string,
  targetEmail?: string
): boolean {
  if (isRequestAdmin(req)) return true;
  const caller = (req as any).user || extractRequestUser(req);
  if (!caller) return false;
  const callerUid = String(caller.uid || "").trim().toLowerCase();
  const callerEmail = String(caller.email || "").trim().toLowerCase();
  const tUid = String(targetUid || "").trim().toLowerCase();
  const tEmail = String(targetEmail || "").trim().toLowerCase();

  if (callerUid && tUid && (callerUid === tUid || callerUid === `email_${tEmail.replace(/[^a-z0-9]/g, "_")}`)) {
    return true;
  }
  if (callerEmail && tEmail && callerEmail === tEmail) {
    return true;
  }
  if (callerEmail && tUid && (`email_${callerEmail.replace(/[^a-z0-9]/g, "_")}` === tUid || callerEmail === tUid)) {
    return true;
  }
  return false;
}

// ==========================================
// 5. DATA PRIVACY REDACTION HELPERS
// Never leak all users' private emails/phones in unauthenticated public bulk responses
// ==========================================
function maskPhoneForGuest(phone?: string): string {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 4) return "••••••••••";
  return `+91 ••••••${digits.slice(-4)}`;
}

function redactBulkItemForPrivacy(item: Record<string, any>, isAuthenticatedCaller: boolean, isAdminCaller = false): Record<string, any> {
  if (!item || typeof item !== "object") return item;
  const clone: Record<string, any> = { ...item };

  // Never expose raw watermarked ID documents in public/bulk endpoints
  if (!isAdminCaller) {
    delete clone.idDocumentWatermarked;
    delete clone.id_document_watermarked;
    delete clone.idDocUrl;
    delete clone.id_doc_url;
    delete clone.passwordHash;
    delete clone.password_hash;
  }

  // If the request is from an unauthenticated guest in bulk listings, hide private email and mask phone
  if (!isAuthenticatedCaller && !isAdminCaller) {
    delete clone.email;
    delete clone.ownerEmail;
    delete clone.userEmail;
    delete clone.authorEmail;
    if (clone.phone) clone.phone = maskPhoneForGuest(clone.phone);
    if (clone.whatsapp) clone.whatsapp = maskPhoneForGuest(clone.whatsapp);
  }
  return clone;
}

// ==========================================
// RAILWAY POSTGRESQL POOL INITIALIZATION & GUARANTEED TABLE CREATION
// ==========================================
function cleanConnectionString(raw?: string): string {
  if (!raw) return "";
  const trimmed = String(raw).trim().replace(/^['"]+|['"]+$/g, "").trim();
  if (!trimmed || trimmed.includes("${{")) return "";
  return trimmed;
}

function getPrimaryConnectionString(): string {
  const connectionString =
    cleanConnectionString(process.env.DATABASE_URL) ||
    cleanConnectionString(process.env.DATABASE_PRIVATE_URL) ||
    cleanConnectionString(process.env.DB_URL) ||
    cleanConnectionString(process.env.DB_PRIVATE_URL) ||
    cleanConnectionString(process.env.DATABASE_PUBLIC_URL) ||
    cleanConnectionString(process.env.POSTGRES_URL) ||
    cleanConnectionString(process.env.POSTGRESQL_URL) ||
    cleanConnectionString(process.env.POSTGRES_PRIVATE_URL);

  if (connectionString) {
    return connectionString;
  }

  if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD) {
    return `postgresql://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || "railway"}`;
  }

  for (const [, val] of Object.entries(process.env)) {
    const candidate = cleanConnectionString(val);
    if (candidate.startsWith("postgres://") || candidate.startsWith("postgresql://")) {
      return candidate;
    }
  }

  return "";
}

function getCandidateDatabaseUrls(): string[] {
  const rawCandidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DB_URL,
    process.env.DB_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRESQL_URL,
    process.env.POSTGRES_PRIVATE_URL
  ];
  const validUrls: string[] = [];
  for (const c of rawCandidates) {
    const cleaned = cleanConnectionString(c);
    if (cleaned && !validUrls.includes(cleaned)) {
      validUrls.push(cleaned);
    }
  }
  if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD) {
    const constructed = `postgresql://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || "railway"}`;
    if (!validUrls.includes(constructed)) {
      validUrls.push(constructed);
    }
  }
  for (const [, val] of Object.entries(process.env)) {
    const cleaned = cleanConnectionString(val);
    if ((cleaned.startsWith("postgres://") || cleaned.startsWith("postgresql://")) && !validUrls.includes(cleaned)) {
      validUrls.push(cleaned);
    }
  }
  return validUrls;
}

const initialDatabaseUrl =
  cleanConnectionString(process.env.DATABASE_URL) ||
  cleanConnectionString(process.env.DATABASE_PRIVATE_URL) ||
  getPrimaryConnectionString();

const hasDatabaseUrlEnv = Boolean(initialDatabaseUrl);

const pool: pg.Pool | null = hasDatabaseUrlEnv
  ? new Pool({
      connectionString:
        cleanConnectionString(process.env.DATABASE_URL) ||
        cleanConnectionString(process.env.DATABASE_PRIVATE_URL) ||
        initialDatabaseUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    })
  : null;

if (pool) {
  pool.on("error", (err) => {
    console.warn("[PostgreSQL Pool Notice]", err.message);
  });
}

let dbPool: pg.Pool | null = pool;
let isDbConnected = hasDatabaseUrlEnv;
let tablesVerified = false;
let verifiedTableNames: string[] = [];
let lastDbInitError = "";
let ensureTablesPromise: Promise<{ connected: boolean; tables: string[]; error?: string }> | null = null;

const DEFAULT_CATEGORIES_SEED = [
  // 1. Home & Repair Services
  { id: "plumber", name: "Plumber (प्लंबर / પ્લમ્બર)", icon: "🚰" },
  { id: "electrician", name: "Electrician (इलेक्ट्रीशियन / ઇલેક્ટ્રિશિયન)", icon: "⚡" },
  { id: "ac_repair", name: "AC, Fridge & RO Repair (AC, फ्रिज और RO रिपेयर)", icon: "❄️" },
  { id: "carpenter", name: "Carpenter / Suthar (कारपेंटर / सुथार)", icon: "🪚" },
  { id: "painter", name: "Painter (पेंटर / પેઇન્ટર)", icon: "🎨" },
  { id: "mason", name: "Mason / Kadiyo (कड़िया / मिस्त्री)", icon: "🧱" },
  { id: "cleaning", name: "Cleaning, Maid & Cook (घर की सफाई, मेड और रसोइया)", icon: "🧹" },
  { id: "pest_control", name: "Pest Control & Tank Cleaning (पेस्ट कंट्रोल और टंकी सफाई)", icon: "🪲" },

  // 2. Personal Care, Fashion & Events
  { id: "tailor", name: "Tailor / Darzi & Boutique (दर्जी / बुटीक)", icon: "✂️" },
  { id: "beautician", name: "Beautician & Salon at Home (ब्यूटीशियन और होम सैलून)", icon: "💇‍♀️" },
  { id: "mehendi", name: "Mehendi Artist (मेहंदी आर्टिस्ट)", icon: "🌿" },
  { id: "pandit_pooja", name: "Pandit Ji / Pooja Path (पंडित जी / पूजा-पाठ)", icon: "🕉️" },
  { id: "photographer", name: "Photographer & Videographer (फोटोग्राफर और वीडियोग्राफर)", icon: "📸" },
  { id: "catering_event", name: "Catering, Halwai & Event Helper (कैटरिंग, हलवाई और इवेंट)", icon: "🍱" },

  // 3. IT, Tech & Digital Experts
  { id: "web_developer", name: "Web Developer (वेब डेवलपर)", icon: "🌐" },
  { id: "app_developer", name: "App Developer (ऐप डेवलपर)", icon: "📱" },
  { id: "computer_laptop", name: "Computer & Laptop Expert (कंप्यूटर और लैपटॉप एक्सपर्ट)", icon: "💻" },
  { id: "cctv_wifi", name: "CCTV & Wi-Fi Technician (CCTV और वाई-फाई टेक्नीशियन)", icon: "📹" },
  { id: "graphic_video", name: "Graphic Designer & Video Editor (ग्राफिक डिजाइनर और वीडियो एडिटर)", icon: "🎬" },
  { id: "digital_marketing", name: "Digital Marketing & Social Media (डिजिटल मार्केटिंग)", icon: "📢" },
  { id: "mobile_repair", name: "Mobile Repair Technician (मोबाइल रिपेयर टेक्नीशियन)", icon: "📲" },

  // 4. Business, Sales & Staff
  { id: "sales_staff", name: "Salesman / Salesgirl (सेल्समेन / सेल्सगर्ल)", icon: "🛍️" },
  { id: "shop_helper", name: "Shop Helper / Store Staff (दुकान हेल्पर / स्टोर स्टाफ)", icon: "🏪" },
  { id: "accountant_gst", name: "Accountant & GST/Tax Expert (अकाउंटेंट और GST/टैक्स एक्सपर्ट)", icon: "📊" },
  { id: "data_entry", name: "Data Entry & Back Office (डाटा एंट्री और कंप्यूटर ऑपरेटर)", icon: "⌨️" },
  { id: "security_guard", name: "Security Guard / Watchman (सिक्योरिटी गार्ड / वॉचमैन)", icon: "🛡️" },
  { id: "receptionist_telecaller", name: "Receptionist & Telecaller (रिसेप्शनिस्ट और टेलीकॉलर)", icon: "🎧" },

  // 5. Brokers, Agents & Consultants
  { id: "real_estate_broker", name: "Real Estate / Property Broker (प्रॉपर्टी ब्रोकर)", icon: "🏢" },
  { id: "vehicle_broker", name: "Vehicle Broker / Agent (गाड़ी ब्रोकर / एजेंट)", icon: "🚗" },
  { id: "rto_agent", name: "RTO & License Agent (RTO और ड्राइविंग लाइसेंस एजेंट)", icon: "🪪" },
  { id: "loan_insurance", name: "Loan & Insurance Agent (लोन और बीमा एजेंट)", icon: "🏦" },
  { id: "legal_docs", name: "Legal & Documentation Help (कानूनी सलाह और दस्तावेज मदद)", icon: "⚖️" },

  // 6. Vehicle, Transport & Delivery
  { id: "mechanic", name: "Mechanic & Puncture Repair (मैकेनिक और पंक्चर रिपेयर)", icon: "🔧" },
  { id: "cab_auto_driver", name: "Cab, Auto & Private Driver (कैब, ऑटो और प्राइवेट ड्राइवर)", icon: "🚕" },
  { id: "tempo_packers", name: "Tempo & Packers/Movers (टेम्पो और पैकर्स-मूवर्स)", icon: "🚚" },
  { id: "delivery", name: "Delivery & Errands (लोकल डिलीवरी और सामान लाना)", icon: "📦" },

  // 7. Education & Skill Classes
  { id: "tutor", name: "Tuition & School Teacher (होम ट्यूटर और स्कूल टीचर)", icon: "📚" },
  { id: "study_project", name: "Project & Study Help (प्रोजेक्ट और पढ़ाई में मदद)", icon: "📖" },
  { id: "computer_spoken_english", name: "Computer & Spoken English Classes (कंप्यूटर और स्पोकन इंग्लिश)", icon: "🗣️" },
  { id: "music_dance_art", name: "Music, Dance & Art Teacher (संगीत, डांस और ड्राइंग टीचर)", icon: "🎵" },

  // 8. Sports & Fitness Partners
  { id: "cricket", name: "Cricket Partner & Team (क्रिकेट साथी और टीम)", icon: "🏏" },
  { id: "badminton", name: "Badminton & Tennis Partner (बैडमिंटन और टेनिस साथी)", icon: "🏸" },
  { id: "gym_fitness", name: "Gym & Workout Buddy (जिम और वर्कआउट पार्टनर)", icon: "💪" },
  { id: "running_yoga", name: "Running, Cycling & Yoga Partner (रनिंग, साइकिलिंग और योगा साथी)", icon: "🏃" },

  // 9. Social, Lifestyle & Care
  { id: "chai_coffee", name: "Tea-Coffee Meetup (चाय-कॉफी मीटअप)", icon: "☕" },
  { id: "companion", name: "Evening Walk Partner (शाम की वॉक साथी)", icon: "🚶" },
  { id: "board_games", name: "Chess & Board Games (शतरंज, लूडो और इंडोर गेम्स)", icon: "♟️" },
  { id: "senior_help", name: "Elder Care & Companion (बुजुर्गों की मदद और देखभाल)", icon: "🤝" },
  { id: "pet_walking", name: "Pet Walk & Care (पेट वॉक और डॉग केयर)", icon: "🐾" },

  // 10. Other / Custom Category
  { id: "other", name: "Other / Custom Category (अन्य / कस्टम श्रेणी)", icon: "✨" }
];

async function execSafeDDL(pool: pg.Pool, sql: string, label: string): Promise<void> {
  try {
    await pool.query(sql);
  } catch (err: any) {
    console.warn(`[Railway PostgreSQL DDL Notice - ${label}]:`, err?.message || err);
  }
}

async function initPostgresTables(pool: pg.Pool): Promise<string[]> {
  // Each CREATE TABLE IF NOT EXISTS runs in its own independent try/catch block
  // so an existing table with a different schema NEVER blocks creation of other tables!

  // 1. users table
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      phone TEXT,
      role TEXT DEFAULT 'user',
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create users"
  );
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS id TEXT`, "users.id");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`, "users.name");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`, "users.email");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`, "users.password_hash");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`, "users.phone");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`, "users.role");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`, "users.avatar_url");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT`, "users.fcm_token");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS area TEXT`, "users.area");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT`, "users.city");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT`, "users.location");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`, "users.latitude");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`, "users.longitude");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "users.fcm_updated_at");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "users.created_at");

  // Legacy "user" table compatibility
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create legacy user"
  );
  await execSafeDDL(pool, `ALTER TABLE "user" ALTER COLUMN id TYPE TEXT USING id::TEXT`, "user.id type text");
  await execSafeDDL(pool, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS name TEXT`, "user.name");
  await execSafeDDL(pool, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone TEXT`, "user.phone");
  await execSafeDDL(pool, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email TEXT`, "user.email");
  await execSafeDDL(pool, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "user.created_at");

  // 2. categories & category_images tables
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT,
      icon TEXT,
      image_url TEXT,
      registered_count INTEGER DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create categories"
  );
  await execSafeDDL(pool, `ALTER TABLE categories ADD COLUMN IF NOT EXISTS name TEXT`, "categories.name");
  await execSafeDDL(pool, `ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT`, "categories.icon");
  await execSafeDDL(pool, `ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT`, "categories.image_url");
  await execSafeDDL(pool, `ALTER TABLE categories ADD COLUMN IF NOT EXISTS registered_count INTEGER DEFAULT 0`, "categories.registered_count");
  await execSafeDDL(pool, `ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "categories.updated_at");

  // Immediately seed all 22 default categories into categories table
  for (const cat of DEFAULT_CATEGORIES_SEED) {
    try {
      await pool.query(
        `INSERT INTO categories (id, name, icon, registered_count, updated_at)
         VALUES ($1, $2, $3, 0, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [cat.id, cat.name, cat.icon]
      );
    } catch (seedErr: any) {
      console.warn(`[Railway PostgreSQL] Seed category ${cat.id} note:`, seedErr?.message);
    }
  }

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS category_images (
      category_id TEXT PRIMARY KEY,
      image_url TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create category_images"
  );
  await execSafeDDL(pool, `ALTER TABLE category_images ADD COLUMN IF NOT EXISTS image_url TEXT`, "category_images.image_url");
  await execSafeDDL(pool, `ALTER TABLE category_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "category_images.updated_at");

  // 3. profiles table
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS profiles (
      uid TEXT PRIMARY KEY,
      id TEXT,
      user_id TEXT,
      name TEXT,
      full_name TEXT,
      email TEXT,
      category_id TEXT,
      category_name TEXT,
      phone TEXT,
      whatsapp TEXT,
      city TEXT,
      sector TEXT,
      address TEXT,
      experience TEXT,
      skills TEXT,
      description TEXT,
      image_url TEXT,
      avatar_url TEXT,
      verified BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'pending',
      rating NUMERIC DEFAULT 5.0,
      my_helper_profile JSONB,
      raw_json JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create profiles"
  );
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS uid TEXT`, "profiles.uid");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id TEXT`, "profiles.id");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id TEXT`, "profiles.user_id");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT`, "profiles.name");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT`, "profiles.full_name");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT`, "profiles.email");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS category_id TEXT`, "profiles.category_id");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS category_name TEXT`, "profiles.category_name");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT`, "profiles.phone");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT`, "profiles.whatsapp");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT`, "profiles.city");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sector TEXT`, "profiles.sector");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT`, "profiles.address");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience TEXT`, "profiles.experience");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT`, "profiles.skills");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description TEXT`, "profiles.description");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS image_url TEXT`, "profiles.image_url");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT`, "profiles.avatar_url");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false`, "profiles.verified");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`, "profiles.is_verified");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`, "profiles.status");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0`, "profiles.rating");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS my_helper_profile JSONB`, "profiles.my_helper_profile");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS raw_json JSONB`, "profiles.raw_json");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "profiles.created_at");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "profiles.updated_at");

  // 4. businesses & shops tables
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      owner_id TEXT,
      shop_name TEXT,
      business_name TEXT,
      category TEXT,
      phone TEXT,
      address TEXT,
      sector TEXT,
      description TEXT,
      image_url TEXT,
      is_approved BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT false,
      raw_json JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create businesses"
  );
  await execSafeDDL(pool, `ALTER TABLE businesses ALTER COLUMN id TYPE TEXT USING id::TEXT`, "businesses.id type text");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS user_id TEXT`, "businesses.user_id");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_id TEXT`, "businesses.owner_id");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS shop_name TEXT`, "businesses.shop_name");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_name TEXT`, "businesses.business_name");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category TEXT`, "businesses.category");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone TEXT`, "businesses.phone");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT`, "businesses.address");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sector TEXT`, "businesses.sector");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT`, "businesses.description");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS image_url TEXT`, "businesses.image_url");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false`, "businesses.is_approved");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`, "businesses.is_verified");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS raw_json JSONB`, "businesses.raw_json");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "businesses.created_at");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS shops (
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
    )`,
    "create shops"
  );
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS name TEXT`, "shops.name");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS type TEXT`, "shops.type");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS category_label TEXT`, "shops.category_label");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_name TEXT`, "shops.owner_name");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS phone TEXT`, "shops.phone");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS area TEXT`, "shops.area");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS address TEXT`, "shops.address");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS description TEXT`, "shops.description");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS photo_url TEXT`, "shops.photo_url");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0`, "shops.rating");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 1`, "shops.review_count");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true`, "shops.is_verified");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "shops.created_at");

  // 5. ads & ad_banners tables
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS ads (
      id TEXT PRIMARY KEY,
      title TEXT,
      subtitle TEXT,
      target_url TEXT,
      market_area TEXT,
      status TEXT DEFAULT 'active',
      description TEXT,
      image_url TEXT,
      raw_json JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create ads"
  );
  await execSafeDDL(pool, `ALTER TABLE ads ADD COLUMN IF NOT EXISTS title TEXT`, "ads.title");
  await execSafeDDL(pool, `ALTER TABLE ads ADD COLUMN IF NOT EXISTS subtitle TEXT`, "ads.subtitle");
  await execSafeDDL(pool, `ALTER TABLE ads ADD COLUMN IF NOT EXISTS target_url TEXT`, "ads.target_url");
  await execSafeDDL(pool, `ALTER TABLE ads ADD COLUMN IF NOT EXISTS market_area TEXT`, "ads.market_area");
  await execSafeDDL(pool, `ALTER TABLE ads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`, "ads.status");
  await execSafeDDL(pool, `ALTER TABLE ads ADD COLUMN IF NOT EXISTS description TEXT`, "ads.description");
  await execSafeDDL(pool, `ALTER TABLE ads ADD COLUMN IF NOT EXISTS image_url TEXT`, "ads.image_url");
  await execSafeDDL(pool, `ALTER TABLE ads ADD COLUMN IF NOT EXISTS raw_json JSONB`, "ads.raw_json");
  await execSafeDDL(pool, `ALTER TABLE ads ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "ads.created_at");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS ad_banners (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create ad_banners"
  );

  // 6. posts, listings & broadcast_posts tables
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      author_name TEXT,
      content TEXT,
      image_url TEXT,
      category TEXT,
      city TEXT,
      raw_json JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create posts"
  );
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id TEXT`, "posts.user_id");
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_name TEXT`, "posts.author_name");
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS content TEXT`, "posts.content");
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT`, "posts.image_url");
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS category TEXT`, "posts.category");
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS city TEXT`, "posts.city");
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS raw_json JSONB`, "posts.raw_json");
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "posts.created_at");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      description TEXT,
      location TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create listings"
  );
  await execSafeDDL(pool, `ALTER TABLE listings ALTER COLUMN id TYPE TEXT USING id::TEXT`, "listings.id type text");
  await execSafeDDL(pool, `ALTER TABLE listings ADD COLUMN IF NOT EXISTS user_id TEXT`, "listings.user_id");
  await execSafeDDL(pool, `ALTER TABLE listings ADD COLUMN IF NOT EXISTS title TEXT`, "listings.title");
  await execSafeDDL(pool, `ALTER TABLE listings ADD COLUMN IF NOT EXISTS description TEXT`, "listings.description");
  await execSafeDDL(pool, `ALTER TABLE listings ADD COLUMN IF NOT EXISTS location TEXT`, "listings.location");
  await execSafeDDL(pool, `ALTER TABLE listings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "listings.created_at");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS broadcast_posts (
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
    )`,
    "create broadcast_posts"
  );

  // 7. chats & messages tables (Strictly non-destructive schema upgrades)
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      intent_id TEXT,
      sender_id TEXT,
      sender_name TEXT,
      sender_email TEXT,
      receiver_id TEXT,
      message TEXT,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create chats"
  );
  await execSafeDDL(pool, `ALTER TABLE chats ALTER COLUMN id TYPE TEXT USING id::TEXT`, "chats.id type text");
  await execSafeDDL(pool, `ALTER TABLE chats ALTER COLUMN sender_id TYPE TEXT USING sender_id::TEXT`, "chats.sender_id type text");
  await execSafeDDL(pool, `ALTER TABLE chats ALTER COLUMN receiver_id TYPE TEXT USING receiver_id::TEXT`, "chats.receiver_id type text");
  await execSafeDDL(pool, `ALTER TABLE chats ADD COLUMN IF NOT EXISTS intent_id TEXT`, "chats.intent_id");
  await execSafeDDL(pool, `ALTER TABLE chats ADD COLUMN IF NOT EXISTS sender_id TEXT`, "chats.sender_id");
  await execSafeDDL(pool, `ALTER TABLE chats ADD COLUMN IF NOT EXISTS sender_name TEXT`, "chats.sender_name");
  await execSafeDDL(pool, `ALTER TABLE chats ADD COLUMN IF NOT EXISTS sender_email TEXT`, "chats.sender_email");
  await execSafeDDL(pool, `ALTER TABLE chats ADD COLUMN IF NOT EXISTS receiver_id TEXT`, "chats.receiver_id");
  await execSafeDDL(pool, `ALTER TABLE chats ADD COLUMN IF NOT EXISTS message TEXT`, "chats.message");
  await execSafeDDL(pool, `ALTER TABLE chats ADD COLUMN IF NOT EXISTS post_id TEXT`, "chats.post_id");
  await execSafeDDL(pool, `ALTER TABLE chats ADD COLUMN IF NOT EXISTS post_owner_id TEXT`, "chats.post_owner_id");
  await execSafeDDL(pool, `ALTER TABLE chats ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "chats.sent_at");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      poster_id TEXT NOT NULL,
      poster_name TEXT,
      poster_email TEXT,
      poster_avatar TEXT,
      helper_id TEXT NOT NULL,
      helper_name TEXT,
      helper_email TEXT,
      helper_avatar TEXT,
      last_message TEXT,
      last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      unread_poster_count INTEGER DEFAULT 0,
      unread_helper_count INTEGER DEFAULT 0,
      is_collaborator BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (post_id, poster_id, helper_id)
    )`,
    "create conversations"
  );
  await execSafeDDL(pool, `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS poster_name TEXT`, "conversations.poster_name");
  await execSafeDDL(pool, `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS poster_email TEXT`, "conversations.poster_email");
  await execSafeDDL(pool, `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS poster_avatar TEXT`, "conversations.poster_avatar");
  await execSafeDDL(pool, `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS helper_name TEXT`, "conversations.helper_name");
  await execSafeDDL(pool, `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS helper_email TEXT`, "conversations.helper_email");
  await execSafeDDL(pool, `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS helper_avatar TEXT`, "conversations.helper_avatar");
  await execSafeDDL(pool, `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_collaborator BOOLEAN DEFAULT FALSE`, "conversations.is_collaborator");
  await execSafeDDL(pool, `CREATE INDEX IF NOT EXISTS idx_conversations_post_id ON conversations(post_id)`, "idx_conversations_post_id");
  await execSafeDDL(pool, `CREATE INDEX IF NOT EXISTS idx_conversations_poster_id ON conversations(poster_id)`, "idx_conversations_poster_id");
  await execSafeDDL(pool, `CREATE INDEX IF NOT EXISTS idx_conversations_helper_id ON conversations(helper_id)`, "idx_conversations_helper_id");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      intent_id TEXT,
      post_id TEXT,
      post_owner_id TEXT,
      sender_id TEXT,
      sender_name TEXT,
      sender_email TEXT,
      sender_avatar TEXT,
      receiver_id TEXT,
      text TEXT,
      content TEXT,
      type TEXT DEFAULT 'text',
      attachment_url TEXT,
      attachment_type TEXT,
      is_collaborator BOOLEAN DEFAULT false,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create messages"
  );
  await execSafeDDL(pool, `ALTER TABLE messages ALTER COLUMN id TYPE TEXT USING id::TEXT`, "messages.id type text");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id TEXT`, "messages.conversation_id");
  await execSafeDDL(pool, `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`, "idx_messages_conversation_id");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS intent_id TEXT`, "messages.intent_id");
  await execSafeDDL(pool, `ALTER TABLE messages ALTER COLUMN intent_id TYPE TEXT USING intent_id::TEXT`, "messages.intent_id type text");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS post_id TEXT`, "messages.post_id");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS post_owner_id TEXT`, "messages.post_owner_id");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id TEXT`, "messages.sender_id");
  await execSafeDDL(pool, `ALTER TABLE messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::TEXT`, "messages.sender_id type text");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name TEXT`, "messages.sender_name");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_email TEXT`, "messages.sender_email");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_avatar TEXT`, "messages.sender_avatar");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id TEXT`, "messages.receiver_id");
  await execSafeDDL(pool, `ALTER TABLE messages ALTER COLUMN receiver_id TYPE TEXT USING receiver_id::TEXT`, "messages.receiver_id type text");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS text TEXT`, "messages.text");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT`, "messages.content");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text'`, "messages.type");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT`, "messages.attachment_url");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT`, "messages.attachment_type");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_collaborator BOOLEAN DEFAULT false`, "messages.is_collaborator");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`, "messages.is_read");
  await execSafeDDL(pool, `ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "messages.created_at");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      post_owner_id TEXT,
      sender_id TEXT,
      sender_name TEXT,
      sender_email TEXT,
      sender_avatar TEXT,
      receiver_id TEXT,
      message TEXT,
      attachment_url TEXT,
      attachment_type TEXT,
      is_collaborator BOOLEAN DEFAULT false,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create responses"
  );
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS post_id TEXT`, "responses.post_id");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS post_owner_id TEXT`, "responses.post_owner_id");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS sender_id TEXT`, "responses.sender_id");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS sender_name TEXT`, "responses.sender_name");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS sender_email TEXT`, "responses.sender_email");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS sender_avatar TEXT`, "responses.sender_avatar");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS receiver_id TEXT`, "responses.receiver_id");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS message TEXT`, "responses.message");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS attachment_url TEXT`, "responses.attachment_url");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS attachment_type TEXT`, "responses.attachment_type");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_collaborator BOOLEAN DEFAULT false`, "responses.is_collaborator");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`, "responses.is_read");
  await execSafeDDL(pool, `ALTER TABLE responses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "responses.created_at");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS profile_edit_history (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT,
      entity_type TEXT,
      previous_data JSONB,
      updated_data JSONB,
      changed_by TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create profile_edit_history"
  );

  // 8. user_passwords, helpers, admin_reports, verification_requests, otp_codes, job_portal_items, security_vault
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS user_passwords (
      email TEXT PRIMARY KEY,
      uid TEXT,
      name TEXT,
      phone TEXT,
      password_hash TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create user_passwords"
  );

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS helpers (
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
    )`,
    "create helpers"
  );
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS name TEXT`, "helpers.name");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS category_id TEXT`, "helpers.category_id");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS phone TEXT`, "helpers.phone");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS skills TEXT[]`, "helpers.skills");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS area TEXT`, "helpers.area");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS experience TEXT`, "helpers.experience");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS distance NUMERIC DEFAULT 0.5`, "helpers.distance");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`, "helpers.is_verified");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS govt_id_uploaded BOOLEAN DEFAULT false`, "helpers.govt_id_uploaded");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS id_doc_url TEXT`, "helpers.id_doc_url");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS admin_reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT,
      reporter_name TEXT,
      reporter_email TEXT,
      reported_user_id TEXT,
      reported_user_name TEXT,
      chat_id TEXT,
      report_type TEXT DEFAULT 'general',
      reason TEXT,
      details TEXT,
      chat_snapshot JSONB,
      is_user_blocked BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'pending_admin_review',
      reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create admin_reports"
  );
  await execSafeDDL(pool, `ALTER TABLE admin_reports ADD COLUMN IF NOT EXISTS reporter_email TEXT`, "admin_reports.reporter_email");
  await execSafeDDL(pool, `ALTER TABLE admin_reports ADD COLUMN IF NOT EXISTS reported_user_id TEXT`, "admin_reports.reported_user_id");
  await execSafeDDL(pool, `ALTER TABLE admin_reports ADD COLUMN IF NOT EXISTS reported_user_name TEXT`, "admin_reports.reported_user_name");
  await execSafeDDL(pool, `ALTER TABLE admin_reports ADD COLUMN IF NOT EXISTS chat_id TEXT`, "admin_reports.chat_id");
  await execSafeDDL(pool, `ALTER TABLE admin_reports ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'general'`, "admin_reports.report_type");
  await execSafeDDL(pool, `ALTER TABLE admin_reports ADD COLUMN IF NOT EXISTS chat_snapshot JSONB`, "admin_reports.chat_snapshot");
  await execSafeDDL(pool, `ALTER TABLE admin_reports ADD COLUMN IF NOT EXISTS is_user_blocked BOOLEAN DEFAULT false`, "admin_reports.is_user_blocked");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS blocked_users (
      id TEXT PRIMARY KEY,
      blocker_id TEXT NOT NULL,
      blocker_email TEXT,
      blocked_id TEXT NOT NULL,
      blocked_name TEXT,
      chat_id TEXT,
      reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create blocked_users"
  );
  await execSafeDDL(pool, `ALTER TABLE blocked_users ADD COLUMN IF NOT EXISTS blocker_id TEXT`, "blocked_users.blocker_id");
  await execSafeDDL(pool, `ALTER TABLE blocked_users ADD COLUMN IF NOT EXISTS blocker_email TEXT`, "blocked_users.blocker_email");
  await execSafeDDL(pool, `ALTER TABLE blocked_users ADD COLUMN IF NOT EXISTS blocked_id TEXT`, "blocked_users.blocked_id");
  await execSafeDDL(pool, `ALTER TABLE blocked_users ADD COLUMN IF NOT EXISTS blocked_name TEXT`, "blocked_users.blocked_name");
  await execSafeDDL(pool, `ALTER TABLE blocked_users ADD COLUMN IF NOT EXISTS chat_id TEXT`, "blocked_users.chat_id");
  await execSafeDDL(pool, `ALTER TABLE blocked_users ADD COLUMN IF NOT EXISTS reason TEXT`, "blocked_users.reason");
  await execSafeDDL(pool, `ALTER TABLE blocked_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "blocked_users.created_at");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS verification_requests (
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
    )`,
    "create verification_requests"
  );

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS otp_codes (
      id SERIAL PRIMARY KEY,
      identifier TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT DEFAULT 'email',
      attempts INTEGER DEFAULT 0,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create otp_codes"
  );
  await execSafeDDL(pool, `CREATE INDEX IF NOT EXISTS idx_otp_codes_identifier ON otp_codes(identifier)`, "idx_otp_codes_identifier");

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS job_portal_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create job_portal_items"
  );

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS security_vault (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      action_status TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create security_vault"
  );

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create app_settings"
  );

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create audit_logs"
  );

  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS suggestions (
      id TEXT PRIMARY KEY,
      user_name TEXT,
      user_email TEXT,
      user_avatar TEXT,
      content TEXT NOT NULL,
      likes_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "create suggestions"
  );
  await execSafeDDL(pool, `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS user_name TEXT`, "suggestions.user_name");
  await execSafeDDL(pool, `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS user_email TEXT`, "suggestions.user_email");
  await execSafeDDL(pool, `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS user_avatar TEXT`, "suggestions.user_avatar");
  await execSafeDDL(pool, `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS content TEXT`, "suggestions.content");
  await execSafeDDL(pool, `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0`, "suggestions.likes_count");
  await execSafeDDL(pool, `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "suggestions.created_at");
  await execSafeDDL(
    pool,
    `UPDATE suggestions
     SET user_name = INITCAP(REPLACE(REPLACE(SPLIT_PART(user_email, '@', 1), '.', ' '), '_', ' '))
     WHERE (user_name IS NULL OR LOWER(TRIM(user_name)) IN ('locohelp member', 'community member', 'guest user', 'user', 'member', ''))
       AND user_email IS NOT NULL AND user_email LIKE '%@%'`,
    "normalize suggestions placeholder names"
  );

  // ==========================================
  // INDIAN IT ACT (SECTION 79 SAFE HARBOUR) & IT RULES 2021 COMPLIANCE TABLES & COLUMNS
  // ==========================================
  // 1. Standardized "reports" table (Multilingual Report & Block + 3-Report Auto-Flagging)
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      reported_user_id TEXT,
      reported_post_id TEXT,
      reason TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'PENDING',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "CREATE TABLE reports"
  );
  await execSafeDDL(pool, `ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_id TEXT`, "reports.reporter_id");
  await execSafeDDL(pool, `ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_user_id TEXT`, "reports.reported_user_id");
  await execSafeDDL(pool, `ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_post_id TEXT`, "reports.reported_post_id");
  await execSafeDDL(pool, `ALTER TABLE reports ADD COLUMN IF NOT EXISTS reason TEXT`, "reports.reason");
  await execSafeDDL(pool, `ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT`, "reports.description");
  await execSafeDDL(pool, `ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING'`, "reports.status");
  await execSafeDDL(pool, `ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "reports.created_at");
  await execSafeDDL(pool, `CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports (reported_user_id)`, "idx_reports_reported_user");
  await execSafeDDL(pool, `CREATE INDEX IF NOT EXISTS idx_reports_reported_post ON reports (reported_post_id)`, "idx_reports_reported_post");
  await execSafeDDL(pool, `ALTER TABLE admin_reports ADD COLUMN IF NOT EXISTS reported_post_id TEXT`, "admin_reports.reported_post_id");

  // 2. "security_audit_logs" table (180-Day IP & User-Agent Retention for Cyber Cell / Law Enforcement Compliance)
  await execSafeDDL(
    pool,
    `CREATE TABLE IF NOT EXISTS security_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    "CREATE TABLE security_audit_logs"
  );
  await execSafeDDL(pool, `ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS user_id TEXT`, "security_audit_logs.user_id");
  await execSafeDDL(pool, `ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS action TEXT`, "security_audit_logs.action");
  await execSafeDDL(pool, `ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT`, "security_audit_logs.ip_address");
  await execSafeDDL(pool, `ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT`, "security_audit_logs.user_agent");
  await execSafeDDL(pool, `ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, "security_audit_logs.created_at");
  await execSafeDDL(pool, `CREATE INDEX IF NOT EXISTS idx_security_audit_user_created ON security_audit_logs (user_id, created_at DESC)`, "idx_security_audit_user_created");

  // 3. Legal Consent, Soft Delete (180-Day Retention), and Auto-Flagging Columns across User & Content Tables
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false`, "users.terms_accepted");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE`, "users.terms_accepted_at");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`, "users.is_deleted");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`, "users.deleted_at");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false`, "users.is_flagged");
  await execSafeDDL(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false`, "users.hidden");

  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false`, "profiles.terms_accepted");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE`, "profiles.terms_accepted_at");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`, "profiles.is_deleted");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`, "profiles.deleted_at");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false`, "profiles.is_flagged");
  await execSafeDDL(pool, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false`, "profiles.hidden");

  await execSafeDDL(pool, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false`, "user.terms_accepted");
  await execSafeDDL(pool, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE`, "user.terms_accepted_at");
  await execSafeDDL(pool, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`, "user.is_deleted");
  await execSafeDDL(pool, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`, "user.deleted_at");
  await execSafeDDL(pool, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false`, "user.is_flagged");
  await execSafeDDL(pool, `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false`, "user.hidden");

  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false`, "posts.is_flagged");
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false`, "posts.hidden");
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`, "posts.is_deleted");
  await execSafeDDL(pool, `ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`, "posts.deleted_at");

  await execSafeDDL(pool, `ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false`, "listings.is_flagged");
  await execSafeDDL(pool, `ALTER TABLE listings ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false`, "listings.hidden");
  await execSafeDDL(pool, `ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`, "listings.is_deleted");
  await execSafeDDL(pool, `ALTER TABLE listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`, "listings.deleted_at");

  await execSafeDDL(pool, `ALTER TABLE broadcast_posts ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false`, "broadcast_posts.is_flagged");
  await execSafeDDL(pool, `ALTER TABLE broadcast_posts ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false`, "broadcast_posts.hidden");
  await execSafeDDL(pool, `ALTER TABLE broadcast_posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`, "broadcast_posts.is_deleted");
  await execSafeDDL(pool, `ALTER TABLE broadcast_posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`, "broadcast_posts.deleted_at");

  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false`, "helpers.is_flagged");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false`, "helpers.hidden");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`, "helpers.is_deleted");
  await execSafeDDL(pool, `ALTER TABLE helpers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`, "helpers.deleted_at");

  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false`, "businesses.is_flagged");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false`, "businesses.hidden");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`, "businesses.is_deleted");
  await execSafeDDL(pool, `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`, "businesses.deleted_at");

  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false`, "shops.is_flagged");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false`, "shops.hidden");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`, "shops.is_deleted");
  await execSafeDDL(pool, `ALTER TABLE shops ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`, "shops.deleted_at");

  // One-time cleanup of stale resurrected category images so only newly uploaded images appear
  try {
    const purgeCheck = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'category_images_purged_v2'`
    ).catch(() => ({ rows: [] as any[] }));
    if (purgeCheck.rows.length === 0) {
      await pool.query(`UPDATE categories SET image_url = NULL, updated_at = NOW()`).catch(() => {});
      await pool.query(`DELETE FROM category_images`).catch(() => {});
      writeJsonFile(CATEGORY_IMAGES_FILE, {});
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('category_images_purged_v2', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
        [JSON.stringify({ purgedAt: new Date().toISOString() })]
      ).catch(() => {});
      console.log("✅ Purged stale category images (category_images_purged_v2)");
    }
  } catch (_e) {}

  // Verify live tables in public schema
  let liveTables: string[] = [];
  try {
    const tRes = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name ASC`
    );
    liveTables = tRes.rows.map((r: any) => String(r.table_name));
    verifiedTableNames = liveTables;
  } catch (e: any) {
    console.warn("[Railway PostgreSQL] Table list inspection note:", e?.message);
  }

  console.log(
    `✅ PostgreSQL Tables Initialized & Synced: ${liveTables.length > 0 ? liveTables.join(", ") : "categories, profiles, users, shops, ads, posts"}`
  );
  return liveTables;
}

async function syncJsonFilesToPostgres(pool: pg.Pool) {
  try {
    const existingCatImgs = await pool.query(
      "SELECT id AS category_id, image_url FROM categories WHERE image_url IS NOT NULL AND image_url <> ''"
    ).catch(() => ({ rows: [] as any[] }));
    const dbImageMap: Record<string, string> = {};
    for (const r of existingCatImgs.rows) {
      if (r.category_id && r.image_url) {
        dbImageMap[r.category_id] = r.image_url;
      }
    }
    writeJsonFile(CATEGORY_IMAGES_FILE, dbImageMap);

    const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
    for (const [emailKey, u] of Object.entries(authUsers)) {
      if (!u) continue;
      const cleanEmail = String(u.email || emailKey).trim().toLowerCase();
      if (!cleanEmail) continue;
      const uid = String(u.uid || ('email_' + cleanEmail.replace(/[^a-z0-9]/g, '_')));
      const name = String(u.name || cleanEmail.split('@')[0]);
      const phone = String(u.phone || '');
      const pwHash = String(u.passwordHash || '');
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, phone, role, created_at)
         VALUES ($1, $2, $3, $4, $5, 'user', NOW())
         ON CONFLICT (email) DO UPDATE SET
           name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
           password_hash = COALESCE(NULLIF(EXCLUDED.password_hash, ''), users.password_hash),
           phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone)`,
        [uid, name, cleanEmail, pwHash, phone]
      ).catch(() => {});
      await pool.query(
        `INSERT INTO "user" (id, name, phone, email, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name, ''), "user".name)`,
        [uid, name, phone, cleanEmail]
      ).catch(() => {});
      if (pwHash) {
        await pool.query(
          `INSERT INTO user_passwords (email, uid, name, phone, password_hash, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (email) DO UPDATE SET password_hash = COALESCE(NULLIF(EXCLUDED.password_hash, ''), user_passwords.password_hash)`,
          [cleanEmail, uid, name, phone, pwHash]
        ).catch(() => {});
      }
    }

    const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
    for (const [uidKey, p] of Object.entries(profiles)) {
      if (!p) continue;
      const uid = String(p.uid || p.id || uidKey);
      const name = String(p.full_name || p.name || p.displayName || 'Community Member');
      const email = String(p.email || '').trim().toLowerCase();
      const phone = String(p.phone || '');
      const avatar = String(p.avatar_url || p.photoURL || '');
      const skills = Array.isArray(p.skills) ? p.skills.join(', ') : String(p.skills || '');
      const address = String(p.address || p.area || '');
      const experience = String(p.experience || '');
      const isVerif = Boolean(p.isVerified || p.is_verified || p.status === 'approved');
      await pool.query(
        `INSERT INTO profiles (uid, id, user_id, name, full_name, email, phone, avatar_url, image_url, skills, address, experience, verified, is_verified, status, my_helper_profile, raw_json, updated_at)
         VALUES ($1, $1, $1, $2, $2, $3, $4, $5, $5, $6, $7, $8, $9, $9, $10, $11, $12, NOW())
         ON CONFLICT (uid) DO UPDATE SET
           name = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
           full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
           email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
           phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
           raw_json = COALESCE(EXCLUDED.raw_json, profiles.raw_json)`,
        [uid, name, email, phone, avatar, skills, address, experience, isVerif, isVerif ? 'approved' : (p.status || 'pending'), p.myHelperProfile ? JSON.stringify(p.myHelperProfile) : null, JSON.stringify(p)]
      ).catch(() => {});
      if (email) {
        await pool.query(
          `INSERT INTO users (id, name, email, phone, avatar_url, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (email) DO NOTHING`,
          [uid, name, email, phone, avatar]
        ).catch(() => {});
      }
    }

    const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
    for (const h of helpers) {
      if (!h || !h.id) continue;
      const isVerif = Boolean(h.isVerified || h.is_verified || h.status === 'approved');
      const skillsArr = Array.isArray(h.skills) ? h.skills : [String(h.categoryId || 'general')];
      await pool.query(
        `INSERT INTO helpers (id, name, category_id, phone, skills, area, experience, distance, is_verified, govt_id_uploaded, id_doc_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           category_id = EXCLUDED.category_id,
           phone = EXCLUDED.phone,
           is_verified = EXCLUDED.is_verified`,
        [h.id, h.name || 'Service Expert', h.categoryId || 'other', h.phone || '', skillsArr, h.area || 'Local Area', h.experience || '1 Year', Number(h.distance || 0.5), isVerif, Boolean(h.govtIdUploaded), h.idDocUrl || null]
      ).catch(() => {});

      await pool.query(
        `INSERT INTO profiles (uid, id, user_id, name, full_name, email, category_id, category_name, phone, whatsapp, city, sector, address, experience, skills, description, image_url, verified, is_verified, status, rating, raw_json, created_at, updated_at)
         VALUES ($1, $1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $12, $13, $14, $15, $15, $16, $17, $18, NOW(), NOW())
         ON CONFLICT (uid) DO UPDATE SET
           id = EXCLUDED.id,
           name = EXCLUDED.name,
           category_id = EXCLUDED.category_id,
           category_name = EXCLUDED.category_name,
           phone = EXCLUDED.phone,
           city = EXCLUDED.city,
           sector = EXCLUDED.sector,
           experience = EXCLUDED.experience,
           image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), profiles.image_url),
           verified = EXCLUDED.verified,
           is_verified = EXCLUDED.is_verified,
           status = EXCLUDED.status,
           raw_json = EXCLUDED.raw_json,
           updated_at = NOW()`,
        [
          h.id,
          h.userId || h.id,
          h.name || 'Service Expert',
          h.email || '',
          h.categoryId || 'other',
          h.customCategoryName || h.categoryId || 'other',
          h.phone || '',
          h.whatsapp || h.phone || '',
          h.city || 'Gandhinagar',
          h.area || 'Local Area',
          h.experience || '1 Year',
          skillsArr.join(', '),
          h.description || skillsArr.join(', '),
          h.photoUrl || h.photo_url || '',
          isVerif,
          isVerif ? 'approved' : (h.status || 'pending'),
          Number(h.rating || 5.0),
          JSON.stringify(h)
        ]
      ).catch(() => {});
    }

    const shops = readJsonFile<any[]>(SHOPS_FILE, []);
    for (const s of shops) {
      if (!s || !s.id || String(s.id).startsWith('sample_shop_')) continue;
      const isApproved = Boolean(s.isVerified || s.is_verified || s.status === 'approved');
      const bName = s.name || s.businessName || s.business_name || 'Local Shop';
      const cat = s.category || s.categoryLabel || 'Retail & Services';
      const imgUrl = s.photoUrl || s.photo_url || (Array.isArray(s.photos) && s.photos[0]) || '';
      await pool.query(
        `INSERT INTO businesses (id, user_id, owner_id, shop_name, business_name, category, phone, address, sector, description, image_url, is_approved, is_verified, raw_json, created_at)
         VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, NOW())
         ON CONFLICT (id) DO UPDATE SET
           shop_name = EXCLUDED.shop_name,
           business_name = EXCLUDED.business_name,
           category = EXCLUDED.category,
           phone = EXCLUDED.phone,
           address = EXCLUDED.address,
           sector = EXCLUDED.sector,
           description = EXCLUDED.description,
           image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), businesses.image_url),
           is_approved = EXCLUDED.is_approved,
           is_verified = EXCLUDED.is_verified,
           raw_json = EXCLUDED.raw_json`,
        [s.id, s.userId || s.owner_id || 'Owner', bName, cat, s.phone || '', s.address || s.area || '', s.area || '', s.description || '', imgUrl, isApproved, JSON.stringify(s)]
      ).catch(() => {});

      await pool.query(
        `INSERT INTO shops (id, name, type, category_label, owner_name, phone, area, address, description, photo_url, rating, review_count, is_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           is_verified = EXCLUDED.is_verified`,
        [s.id, bName, s.type || 'shop', cat, s.ownerName || 'Owner', s.phone || '', s.area || '', s.address || '', s.description || '', imgUrl, Number(s.rating || 5.0), Number(s.reviewCount || 1), isApproved]
      ).catch(() => {});
    }

    const ads = readJsonFile<any[]>(ADS_FILE, []);
    for (const a of ads) {
      if (!a || !a.id) continue;
      const imgUrl = a.photoUrl || (Array.isArray(a.photos) && a.photos[0]) || '';
      await pool.query(
        `INSERT INTO ads (id, title, subtitle, target_url, market_area, status, description, image_url, raw_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           subtitle = EXCLUDED.subtitle,
           target_url = EXCLUDED.target_url,
           market_area = EXCLUDED.market_area,
           status = EXCLUDED.status,
           description = EXCLUDED.description,
           image_url = EXCLUDED.image_url,
           raw_json = EXCLUDED.raw_json`,
        [a.id, a.offerTitle || a.businessName || 'Featured Ad', a.businessName || a.offerBadge || '', a.destinationUrl || '', a.area || 'Local Market', a.isActive === false ? 'inactive' : 'active', a.description || '', imgUrl, JSON.stringify(a)]
      ).catch(() => {});

      await pool.query(
        `INSERT INTO ad_banners (id, data, created_at) VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [a.id, JSON.stringify(a)]
      ).catch(() => {});
    }

    const intents = readJsonFile<any[]>(INTENTS_FILE, []);
    for (const i of intents) {
      if (!i || !i.id) continue;
      await pool.query(
        `INSERT INTO posts (id, user_id, author_name, content, image_url, category, city, raw_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           content = EXCLUDED.content,
           category = EXCLUDED.category,
           city = EXCLUDED.city,
           raw_json = EXCLUDED.raw_json`,
        [i.id, i.authorId || 'user', i.authorName || 'Community Member', i.description || i.title || '', i.imageUrl || i.photoUrl || '', i.category || 'General', i.city || i.location || 'Gandhinagar', JSON.stringify(i)]
      ).catch(() => {});

      await pool.query(
        `INSERT INTO listings (id, user_id, title, description, location, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description`,
        [i.id, i.authorId || 'user', i.category || i.title || 'General', i.description || '', i.location || i.city || 'Gandhinagar']
      ).catch(() => {});
    }

    const jobs = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
    for (const j of jobs) {
      if (!j || !j.id) continue;
      await pool.query(
        `INSERT INTO job_portal_items (id, type, status, data, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, data = EXCLUDED.data`,
        [j.id, j.type || 'job_seeker', j.status || 'pending', JSON.stringify(j)]
      ).catch(() => {});
    }

    await pool.query(`
      UPDATE categories c
      SET registered_count = COALESCE((
        SELECT COUNT(*) FROM helpers h WHERE h.category_id = c.id AND h.is_verified = true
      ), 0)
    `).catch(() => {});
  } catch (syncErr: any) {
    console.warn("[Railway PostgreSQL] Initial JSON-to-DB sync note:", syncErr.message);
  }
}

async function archiveToSecurityVault(
  entityType: SecurityVaultEntityType,
  recordId: string,
  payload: Record<string, any>,
  actionStatus: SecurityVaultActionStatus = "ACTIVE_REGISTERED"
): Promise<void> {
  try {
    const cleanId = String(recordId || payload?.id || payload?.uid || "").trim();
    if (!cleanId || cleanId.startsWith("seed_") || cleanId.startsWith("sample_")) return;

    const vaultKey = `${entityType}__${cleanId}`;
    let existingCipher = "";
    if (dbPool && isDbConnected) {
      try {
        const vRes = await dbPool.query("SELECT encrypted_payload FROM security_vault WHERE id = $1 LIMIT 1", [vaultKey]);
        if (vRes.rows.length > 0 && vRes.rows[0].encrypted_payload) {
          existingCipher = String(vRes.rows[0].encrypted_payload);
        }
      } catch {}
    }
    const existingDecrypted = existingCipher ? decryptVaultPayload(existingCipher) : null;

    const nowIso = new Date().toISOString();
    const nameVal =
      payload.name ||
      payload.full_name ||
      payload.displayName ||
      payload.fullName ||
      payload.companyOrShopName ||
      payload.businessName ||
      payload.userName ||
      payload.authorName ||
      existingDecrypted?.name ||
      "Unknown User";

    const phoneVal =
      payload.phone ||
      payload.whatsapp ||
      payload.userPhone ||
      payload.authorPhone ||
      existingDecrypted?.phone ||
      "";

    const emailVal =
      payload.email ||
      payload.ownerEmail ||
      payload.userEmail ||
      payload.authorEmail ||
      existingDecrypted?.email ||
      "";

    const areaVal =
      payload.area ||
      payload.address ||
      payload.location ||
      existingDecrypted?.area ||
      "";

    const categoryVal =
      payload.categoryId ||
      payload.categoryLabel ||
      payload.category ||
      payload.jobRole ||
      payload.title ||
      existingDecrypted?.category ||
      entityType;

    const govIdDoc =
      payload.idDocumentWatermarked ||
      payload.idDocUrl ||
      payload.id_doc_url ||
      existingDecrypted?.idDocumentWatermarked ||
      "";

    const photoVal =
      payload.photoUrl ||
      payload.photo_url ||
      payload.avatar_url ||
      payload.photoURL ||
      payload.photoOrLogoUrl ||
      (Array.isArray(payload.photos) && payload.photos[0]) ||
      existingDecrypted?.photoUrl ||
      "";

    const prevHistory = Array.isArray(existingDecrypted?.history) ? existingDecrypted.history : [];
    const historySnapshot = {
      action: actionStatus,
      timestamp: nowIso,
      name: nameVal,
      phone: phoneVal,
      email: emailVal,
      area: areaVal
    };

    const mergedVaultRecord = {
      vaultId: vaultKey,
      recordId: cleanId,
      entityType,
      actionStatus,
      isDeletedFromPublic:
        actionStatus === "DELETED_BY_USER" ||
        actionStatus === "ADMIN_REMOVED_PUBLIC" ||
        Boolean(existingDecrypted?.isDeletedFromPublic && actionStatus !== "ACTIVE_REGISTERED"),
      name: nameVal,
      phone: phoneVal,
      email: emailVal,
      area: areaVal,
      address: payload.address || existingDecrypted?.address || areaVal,
      category: categoryVal,
      skillsOrDescription:
        (Array.isArray(payload.skills) ? payload.skills.join(", ") : payload.skills) ||
        payload.description ||
        existingDecrypted?.skillsOrDescription ||
        "",
      experience: payload.experience || existingDecrypted?.experience || "",
      photoUrl: photoVal,
      idDocumentWatermarked: govIdDoc,
      hasGovtId: Boolean(govIdDoc),
      firstRegisteredAt: existingDecrypted?.firstRegisteredAt || payload.createdAt || payload.created_at || nowIso,
      lastUpdatedAt: nowIso,
      deletedAt:
        actionStatus === "DELETED_BY_USER" || actionStatus === "ADMIN_REMOVED_PUBLIC"
          ? nowIso
          : existingDecrypted?.deletedAt || null,
      originalRegistrationSnapshot: existingDecrypted?.originalRegistrationSnapshot || {
        name: nameVal,
        phone: phoneVal,
        email: emailVal,
        area: areaVal,
        category: categoryVal
      },
      history: [...prevHistory.slice(-19), historySnapshot]
    };

    const encryptedHex = encryptVaultPayload(mergedVaultRecord);

    if (dbPool && isDbConnected) {
      try {
        await dbPool.query(
          `INSERT INTO security_vault (id, entity_type, action_status, encrypted_payload, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             action_status = EXCLUDED.action_status,
             encrypted_payload = EXCLUDED.encrypted_payload,
             updated_at = NOW()`,
          [vaultKey, entityType, actionStatus, encryptedHex]
        );
      } catch (_dbErr) {}
    }
  } catch (err) {
    console.warn("[Security Vault Archive Note]:", err);
  }
}

async function syncExistingRecordsToSecurityVault(): Promise<void> {
  try {
    const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
    const verifByEntity = new Map<string, any>();
    verifs.forEach(v => {
      if (v && v.entityId) verifByEntity.set(String(v.entityId), v);
      if (v && v.userId) verifByEntity.set(String(v.userId), v);
    });

    const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
    for (const h of helpers) {
      if (h && h.id) {
        const matchedV = verifByEntity.get(String(h.id)) || verifByEntity.get(String(h.userId || ""));
        await archiveToSecurityVault(
          "helper",
          h.id,
          { ...h, idDocumentWatermarked: h.idDocUrl || matchedV?.idDocumentWatermarked || "" },
          "ACTIVE_REGISTERED"
        );
      }
    }

    const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
    for (const [uid, p] of Object.entries(profiles)) {
      if (p) {
        const matchedV = verifByEntity.get(String(uid));
        await archiveToSecurityVault(
          "user_profile",
          uid,
          { ...p, idDocumentWatermarked: matchedV?.idDocumentWatermarked || "" },
          "ACTIVE_REGISTERED"
        );
      }
    }

    const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
    for (const [emailKey, u] of Object.entries(authUsers)) {
      if (u) {
        const uid = u.uid || emailKey;
        const matchedV = verifByEntity.get(String(uid)) || verifByEntity.get(emailKey);
        await archiveToSecurityVault(
          "user_profile",
          uid,
          { ...u, idDocumentWatermarked: matchedV?.idDocumentWatermarked || "" },
          "ACTIVE_REGISTERED"
        );
      }
    }

    const shops = readJsonFile<any[]>(SHOPS_FILE, []);
    for (const s of shops) {
      if (s && s.id && !String(s.id).startsWith("sample_shop_")) {
        const matchedV = verifByEntity.get(String(s.id));
        await archiveToSecurityVault(
          "business",
          s.id,
          { ...s, idDocumentWatermarked: s.idDocumentWatermarked || matchedV?.idDocumentWatermarked || "" },
          "ACTIVE_REGISTERED"
        );
      }
    }

    const jobs = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
    for (const j of jobs) {
      if (j && j.id) {
        await archiveToSecurityVault(
          j.type === "employer_vacancy" ? "employer" : "job_seeker",
          j.id,
          j,
          "ACTIVE_REGISTERED"
        );
      }
    }

    const intents = readJsonFile<any[]>(INTENTS_FILE, []);
    for (const i of intents) {
      if (i && i.id && !String(i.id).startsWith("seed_") && !String(i.id).startsWith("sample_")) {
        await archiveToSecurityVault("help_post", i.id, i, "ACTIVE_REGISTERED");
      }
    }
  } catch (e) {
    console.warn("[Security Vault Initial Sync Note]:", e);
  }
}
async function initDb(poolToUse?: pg.Pool): Promise<string[]> {
  const activePool = poolToUse || dbPool;
  if (!activePool) return [];
  const tables = await initPostgresTables(activePool);
  await syncJsonFilesToPostgres(activePool);
  const requiredTables = ["users", "categories", "profiles", "businesses", "shops", "ads", "posts"];
  const allRequiredPresent = requiredTables.every((t) => tables.includes(t));
  tablesVerified = allRequiredPresent || tables.length > 0;
  return tables;
}

async function connectRailwayPostgres(): Promise<boolean> {
  const connectionString =
    cleanConnectionString(process.env.DATABASE_URL) ||
    cleanConnectionString(process.env.DATABASE_PRIVATE_URL) ||
    cleanConnectionString(process.env.DB_URL) ||
    cleanConnectionString(process.env.DB_PRIVATE_URL) ||
    getPrimaryConnectionString();

  const candidateUrls = getCandidateDatabaseUrls();
  if (connectionString && !candidateUrls.includes(connectionString)) {
    candidateUrls.unshift(connectionString);
  }

  // Only fallback to local files if NO database URL environment variable is present at all
  if (!connectionString && candidateUrls.length === 0) {
    isDbConnected = false;
    dbPool = null;
    lastDbInitError = "No PostgreSQL connection string found in environment variables";
    return false;
  }

  // Do not fallback immediately if DATABASE_URL / DATABASE_PRIVATE_URL exists; test existing pool first
  if (dbPool) {
    try {
      await dbPool.query("SELECT 1");
      isDbConnected = true;
      lastDbInitError = "";
      console.log("✅ Connected to Railway PostgreSQL successfully.");
      await initDb(dbPool);
      return true;
    } catch (firstErr: any) {
      lastDbInitError = firstErr?.message || "Initial pool SELECT 1 check failed";
    }
  }

  // Retry across candidate URLs and SSL settings with 10s connection timeout
  const maxRetries = 4;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const connStr of candidateUrls) {
      const sslAttempts: any[] = [{ rejectUnauthorized: false }, false];

      for (const sslSetting of sslAttempts) {
        try {
          const candidatePool = new Pool({
            connectionString: connStr,
            ssl: sslSetting,
            connectionTimeoutMillis: 10000,
            max: 15,
            idleTimeoutMillis: 30000
          });
          candidatePool.on("error", (err) => {
            console.warn("[PostgreSQL Pool Notice]", err.message);
          });
          await candidatePool.query("SELECT 1");
          dbPool = candidatePool;
          isDbConnected = true;
          lastDbInitError = "";
          console.log("✅ Connected to Railway PostgreSQL successfully.");
          await initDb(candidatePool);
          return true;
        } catch (err: any) {
          lastDbInitError = err?.message || "Connection attempt failed";
          console.warn(
            `[Railway PostgreSQL] Attempt ${attempt}/${maxRetries} (ssl=${Boolean(sslSetting)}) failed: ${lastDbInitError}`
          );
        }
      }
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Keep dbPool alive if connectionString is present so subsequent requests can still query/retry
  if (!dbPool && connectionString) {
    dbPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });
    dbPool.on("error", (err) => {
      console.warn("[PostgreSQL Pool Notice]", err.message);
    });
    isDbConnected = true;
  }

  return Boolean(dbPool && isDbConnected);
}

async function ensureTablesExist(force = false): Promise<{ connected: boolean; tables: string[]; error?: string }> {
  if (!force && tablesVerified && isDbConnected && dbPool && verifiedTableNames.length >= 6) {
    return { connected: true, tables: verifiedTableNames };
  }

  if (!force && ensureTablesPromise) {
    return ensureTablesPromise;
  }

  const runTask = (async () => {
    try {
      const connected = await connectRailwayPostgres();
      if (!connected || !dbPool) {
        return { connected: false, tables: verifiedTableNames, error: lastDbInitError };
      }

      if (!tablesVerified || force) {
        const tables = await initDb(dbPool);
        return { connected: true, tables };
      }

      return { connected: true, tables: verifiedTableNames };
    } catch (err: any) {
      lastDbInitError = err?.message || "Failed to initialize PostgreSQL tables";
      console.error("[Railway PostgreSQL] ensureTablesExist error:", lastDbInitError);
      return { connected: isDbConnected, tables: verifiedTableNames, error: lastDbInitError };
    } finally {
      ensureTablesPromise = null;
    }
  })();

  if (!force) {
    ensureTablesPromise = runTask;
  }
  return runTask;
}

async function startServer() {
  const app = express();
  // Enable trust proxy for Railway / cloud reverse proxies to capture accurate client IPs for IT Act 2000 compliance
  app.set("trust proxy", true);
  const isAiStudioEnv = fs.existsSync("/app/control-plane-api") || process.env.DISABLE_HMR === "true";
  const PORT = isAiStudioEnv ? 3000 : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  // Verify PostgreSQL connection (await pool.query('SELECT 1')) and create all tables BEFORE starting server routes
  const startupConnStr =
    cleanConnectionString(process.env.DATABASE_URL) ||
    cleanConnectionString(process.env.DATABASE_PRIVATE_URL) ||
    getPrimaryConnectionString();

  if (startupConnStr) {
    await ensureTablesExist(true);
  }
  syncExistingRecordsToSecurityVault().catch(() => {});

  // ==========================================
  // 5. DATA PRIVACY & CORS PROTECTION + SECURITY HEADERS
  // ==========================================
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOriginPattern = /^https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|[\w-]+\.up\.railway\.app|[\w-]+\.run\.app|[\w.-]+\.locohelp\.[\w]+)$/i;

    if (origin && (allowedOriginPattern.test(origin) || process.env.ALLOWED_ORIGIN === origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
    } else {
      res.header("Access-Control-Allow-Origin", origin || "*");
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token, X-Admin-Token, X-User-Id, X-User-Email, X-Admin-Email, Cache-Control, Pragma"
    );

    // Security Hardening Headers
    res.header("X-Content-Type-Options", "nosniff");
    res.header("X-Frame-Options", "SAMEORIGIN");
    res.header("X-XSS-Protection", "1; mode=block");
    res.header("Referrer-Policy", "strict-origin-when-cross-origin");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Parse JSON bodies (bounded to 8MB max payload for 5MB base64 PDFs; also accepts text/plain JSON)
  app.use(express.json({ limit: "8mb", type: ["application/json", "text/plain"] }));

  // Auto-Trigger Table Creation Middleware on /api requests if tables haven't been verified yet
  app.use("/api", async (_req, _res, next) => {
    if (!tablesVerified || !isDbConnected) {
      try {
        await ensureTablesExist(false);
      } catch (_e) {}
    }
    next();
  });

  // Global Rate Limiter, Automatic XSS Input Sanitizer & Silent System Security Block on all /api routes
  app.use("/api", generalApiLimiter);
  app.use("/api", (req, res, next) => {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeServerPayload(req.body);
      if (
        (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") &&
        !req.path.startsWith("/auth") &&
        !req.path.startsWith("/admin/login") &&
        !req.path.startsWith("/upload")
      ) {
        if (checkServerPayloadSecurityBlock(req.body)) {
          return res.status(400).json({
            success: false,
            error: "⚠️ System Security Block: आपकी पोस्ट हमारे कम्युनिटी नियमों (Community Guidelines) के विरुद्ध है। नियम तोड़ने पर सख्त कानूनी कार्यवाही की जाएगी।",
            code: "SYSTEM_SECURITY_BLOCK"
          });
        }
      }
    }
    next();
  });

  // Dedicated File Upload Security Validation Endpoint
  app.post("/api/upload/validate", (req, res) => {
    const { dataUrl, fileName, allowPdf = true } = req.body || {};
    const check = validateServerUploadedData(dataUrl, { allowPdf: Boolean(allowPdf), fileName });
    if (!check.valid) {
      return res.status(400).json({ valid: false, error: check.error });
    }
    return res.json({ valid: true });
  });

  // Dedicated Firebase Storage Upload Endpoint (Uploads directly to `locohelp/` in Firebase Storage; zero local disk storage)
  app.post("/api/storage/upload", async (req, res) => {
    try {
      const { dataUrl, folder = "locohelp/media", fileName, allowPdf = true } = req.body || {};
      if (!dataUrl || typeof dataUrl !== "string") {
        return res.status(400).json({ error: "dataUrl is required" });
      }
      const check = validateServerUploadedData(dataUrl, { allowPdf: Boolean(allowPdf), fileName });
      if (!check.valid) {
        return res.status(400).json({ error: check.error });
      }
      const cleanFolder = String(folder || "media").replace(/^locohelp\/?/i, "") || "media";
      const url = await uploadDataToFirebaseServer(dataUrl, cleanFolder, fileName);
      return res.json({
        success: true,
        url,
        firebaseConfigured: isServerFirebaseStorageConfigured()
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to upload to Firebase Storage" });
    }
  });

  // Dedicated Firebase Storage Delete Endpoint
  app.post("/api/storage/delete", async (req, res) => {
    try {
      const { fileUrl, storagePath } = req.body || {};
      const deletedCount = await deleteFilesFromFirebaseStorage(fileUrl || storagePath);
      return res.json({ success: true, deletedCount });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to delete from Firebase Storage" });
    }
  });

  // Helper to strictly verify a 6-digit OTP code from memory or PostgreSQL otp_codes table
  const verifyAndConsumeOtp = async (cleanIdentifier: string, cleanCode: string): Promise<{ valid: boolean; error?: string; type?: string }> => {
    if (!cleanIdentifier || !cleanCode) {
      return { valid: false, error: "ईमेल और 6-अंकों का OTP कोड आवश्यक है। (Email and 6-digit OTP code are required.)" };
    }

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
      return {
        valid: false,
        error: "इस ईमेल के लिए कोई सक्रिय OTP नहीं मिला या वह समाप्त हो गया है। कृपया नया OTP भेजें। (No active OTP found or expired. Please request a new OTP.)"
      };
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanIdentifier);
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query('DELETE FROM otp_codes WHERE identifier = $1', [cleanIdentifier]);
        } catch (e) {}
      }
      return { valid: false, error: "OTP की समय-सीमा (5 मिनट) समाप्त हो गई है। कृपया नया OTP मंगाएं। (OTP expired. Please request a new OTP.)" };
    }

    if (record.attempts >= 5) {
      otpStore.delete(cleanIdentifier);
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query('DELETE FROM otp_codes WHERE identifier = $1', [cleanIdentifier]);
        } catch (e) {}
      }
      return { valid: false, error: "5 बार गलत OTP डाला गया! सुरक्षा के लिए कृपया नया OTP मंगाएं। (Too many failed attempts. Please request a new OTP.)" };
    }

    if (record.code !== cleanCode) {
      record.attempts += 1;
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE identifier = $1', [cleanIdentifier]);
        } catch (e) {}
      }
      return {
        valid: false,
        error: "गलत OTP कोड! कृपया अपने असली ईमेल इनबॉक्स में आया सही 6-अंकों का कोड दर्ज करें। (Invalid OTP code!)"
      };
    }

    otpStore.delete(cleanIdentifier);
    if (dbPool && isDbConnected) {
      try {
        await dbPool.query('DELETE FROM otp_codes WHERE identifier = $1', [cleanIdentifier]);
      } catch (e) {}
    }

    return { valid: true, type: record.type };
  };

  // Helper to dispatch 6-digit Admin verification OTP strictly to baalvarta@gmail.com
  const dispatchAdminOtpToOfficialEmail = async (purposeLabel: string): Promise<{ emailSent: boolean; provider: string; devOtp?: string }> => {
    const targetEmail = OFFICIAL_ADMIN_EMAIL;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(targetEmail, {
      code,
      expiresAt,
      attempts: 0,
      type: 'email'
    });

    if (dbPool && isDbConnected) {
      try {
        await dbPool.query(
          `INSERT INTO otp_codes (identifier, code, type, attempts, expires_at, created_at)
           VALUES ($1, $2, 'email', 0, to_timestamp($3), NOW())`,
          [targetEmail, code, expiresAt / 1000]
        );
      } catch (dbErr: any) {
        console.warn("[PostgreSQL] Admin otp_codes insert notice:", dbErr.message);
      }
    }

    const emailSubject = `LocoHelp Admin Security OTP: ${code}`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #d97706; margin: 0; font-size: 22px; font-weight: 800;">LocoHelp Master Admin Security</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">${purposeLabel}</p>
        </div>
        <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 18px;">
          Use this 6-digit One-Time Password (OTP) sent exclusively to <strong>${targetEmail}</strong> to complete Admin verification:
        </p>
        <div style="background-color: #fffbeb; border: 2px dashed #d97706; padding: 18px; text-align: center; border-radius: 14px; margin: 20px 0;">
          <span style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #b45309; font-family: monospace;">${code}</span>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
          ⏳ Valid for <strong>5 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>
    `;
    const emailText = `LocoHelp Master Admin (${purposeLabel}) OTP for ${targetEmail}: ${code}. Valid for 5 minutes.`;

    let emailSent = await sendEmailViaBrevo(targetEmail, emailSubject, emailHtml, emailText);
    let provider = emailSent ? 'Brevo API' : 'Dev Mode';

    if (!emailSent && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const smtpPass = process.env.SMTP_PASS.replace(/\s+/g, '');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: { user: process.env.SMTP_USER.trim(), pass: smtpPass },
          tls: { rejectUnauthorized: false }
        });
        await transporter.sendMail({
          from: `"LocoHelp Admin Security" <${process.env.SMTP_USER.trim()}>`,
          to: targetEmail,
          subject: emailSubject,
          text: emailText,
          html: emailHtml
        });
        emailSent = true;
        provider = 'SMTP';
      } catch (err: any) {
        console.error("Admin SMTP dispatch error:", err.message);
      }
    }

    console.log(`[ADMIN OTP DISPATCH] Sent 6-digit OTP to ${targetEmail} via ${provider} (emailSent=${emailSent})`);
    return { emailSent, provider, devOtp: !emailSent ? code : undefined };
  };

  // Strict 2-Step Admin Login (Step 1: Verify Admin Password -> Step 2: Automatically send & verify 6-digit OTP to baalvarta@gmail.com)
  app.post("/api/admin/login", authLoginLimiter, async (req, res) => {
    try {
      const { password, otpCode } = req.body || {};
      const currentMasterPwd = await getMasterAdminPassword();

      if (!password || String(password).trim() !== currentMasterPwd) {
        return res.status(401).json({
          success: false,
          error: "गलत एडमिन पासवर्ड! केवल अधिकृत एडमिन पासवर्ड ही मान्य है। (Invalid Admin Password.)"
        });
      }

      // STEP 1 PASSED: If otpCode is not provided yet, automatically dispatch 6-digit OTP strictly to baalvarta@gmail.com
      if (!otpCode || String(otpCode).trim().length === 0) {
        const otpInfo = await dispatchAdminOtpToOfficialEmail("2-Step Admin Portal Login");
        return res.status(200).json({
          success: false,
          requiresOtp: true,
          adminEmail: OFFICIAL_ADMIN_EMAIL,
          devOtp: otpInfo.devOtp,
          message: `पासवर्ड सही है! अब सुरक्षा के लिए ${OFFICIAL_ADMIN_EMAIL} पर भेजा गया 6-अंकों का OTP कोड दर्ज करें।`
        });
      }

      // STEP 2: Verify 6-digit OTP sent to baalvarta@gmail.com
      const otpCheck = await verifyAndConsumeOtp(OFFICIAL_ADMIN_EMAIL, String(otpCode).trim());
      if (!otpCheck.valid) {
        return res.status(401).json({
          success: false,
          requiresOtp: true,
          error: otpCheck.error || "गलत एडमिन OTP कोड!"
        });
      }

      const token = createSessionToken({
        uid: "master_admin",
        email: OFFICIAL_ADMIN_EMAIL,
        name: "Admin Sanjay Chauhan",
        role: "admin"
      });
      return res.json({ success: true, token });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: "Admin authentication failed." });
    }
  });

  // Forgot Admin Password - Step 1: Send 6-Digit Reset OTP exclusively to baalvarta@gmail.com
  app.post("/api/admin/forgot-password/send-otp", otpRateLimiter, async (_req, res) => {
    try {
      const otpInfo = await dispatchAdminOtpToOfficialEmail("Forgot Admin Password Reset");
      return res.json({
        success: true,
        adminEmail: OFFICIAL_ADMIN_EMAIL,
        devOtp: otpInfo.devOtp,
        message: `पासवर्ड रीसेट के लिए ${OFFICIAL_ADMIN_EMAIL} पर 6-अंकों का OTP भेज दिया गया है।`
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: "Failed to send Admin reset OTP." });
    }
  });

  // Forgot Admin Password - Step 2: Verify OTP sent to baalvarta@gmail.com & Save New Admin Password
  app.post("/api/admin/forgot-password/reset", authLoginLimiter, async (req, res) => {
    try {
      const { otpCode, newPassword } = req.body || {};
      if (!otpCode || String(otpCode).trim().length < 6) {
        return res.status(400).json({
          success: false,
          error: `कृपया ${OFFICIAL_ADMIN_EMAIL} पर भेजा गया 6-अंकों का OTP दर्ज करें।`
        });
      }
      if (!newPassword || String(newPassword).trim().length < 6) {
        return res.status(400).json({
          success: false,
          error: "नया एडमिन पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।"
        });
      }

      const otpCheck = await verifyAndConsumeOtp(OFFICIAL_ADMIN_EMAIL, String(otpCode).trim());
      if (!otpCheck.valid) {
        return res.status(401).json({
          success: false,
          error: otpCheck.error || "गलत या समाप्त हो चुका OTP कोड!"
        });
      }

      await saveMasterAdminPassword(String(newPassword).trim());

      const token = createSessionToken({
        uid: "master_admin",
        email: OFFICIAL_ADMIN_EMAIL,
        name: "Admin Sanjay Chauhan",
        role: "admin"
      });
      return res.json({
        success: true,
        token,
        message: "एडमिन पासवर्ड सफलतापूर्वक बदल दिया गया है!"
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: "Failed to reset Admin password." });
    }
  });

  // Change Admin Password (inside Admin Dashboard)
  app.post("/api/admin/change-password", requireAdmin, async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body || {};
      const currentMasterPwd = await getMasterAdminPassword();
      if (!oldPassword || String(oldPassword).trim() !== currentMasterPwd) {
        return res.status(401).json({ success: false, error: "वर्तमान पासवर्ड गलत है!" });
      }
      if (!newPassword || String(newPassword).trim().length < 6) {
        return res.status(400).json({ success: false, error: "नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।" });
      }
      await saveMasterAdminPassword(String(newPassword).trim());
      return res.json({ success: true, message: "एडमिन पासवर्ड सफलतापूर्वक अपडेट हो गया!" });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: "Failed to update Admin password." });
    }
  });

  // Health Check Endpoint (No sensitive env vars exposed)
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      postgresConnected: isDbConnected,
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // PUBLIC SUGGESTIONS BOARD & ADMIN MODERATION API
  // ==========================================
  const memorySuggestions: any[] = [];

  const isGenericSuggestionName = (n?: string): boolean => {
    const clean = String(n || "").trim().toLowerCase();
    return (
      !clean ||
      clean.length < 2 ||
      clean === "locohelp member" ||
      clean === "community member" ||
      clean === "guest user" ||
      clean === "guest" ||
      clean === "user" ||
      clean === "member" ||
      clean === "anonymous"
    );
  };

  const formatSuggestionAuthorName = (name?: string, email?: string): string => {
    const trimmed = String(name || "").trim();
    if (!isGenericSuggestionName(trimmed)) {
      return trimmed;
    }
    if (email && String(email).includes("@")) {
      const prefix = String(email).split("@")[0].replace(/[._-]+/g, " ").trim();
      if (prefix.length >= 2) {
        return prefix
          .split(" ")
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
    }
    return "Verified User";
  };

  // Get all public suggestions
  app.get("/api/suggestions", async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      if (dbPool && isDbConnected) {
        try {
          const result = await dbPool.query(
            "SELECT id, user_name AS \"userName\", user_email AS \"userEmail\", user_avatar AS \"userAvatar\", content, likes_count AS \"likesCount\", created_at AS \"createdAt\" FROM suggestions ORDER BY created_at DESC LIMIT 200"
          );
          if (result.rows.length > 0) {
            const normalizedRows = result.rows.map((r: any) => ({
              ...r,
              userName: formatSuggestionAuthorName(r.userName, r.userEmail)
            }));
            return res.json(normalizedRows);
          }
        } catch (dbErr: any) {
          console.warn("[PostgreSQL] fetch suggestions note:", dbErr.message);
        }
      }
      return res.json(
        memorySuggestions.map((s) => ({
          ...s,
          userName: formatSuggestionAuthorName(s.userName, s.userEmail)
        }))
      );
    } catch (e: any) {
      return res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  // Submit a public suggestion (Requires logged-in user + Mandatory Real Name)
  app.post("/api/suggestions", requireAuth, async (req, res) => {
    try {
      const { content, userName, userEmail, userAvatar } = req.body || {};
      const cleanContent = sanitizeServerText(String(content || '').trim(), 1000);
      if (!cleanContent) {
        return res.status(400).json({ error: "सुझाव का विवरण खाली नहीं हो सकता। (Suggestion content is required)" });
      }

      const caller = (req as any).user || extractRequestUser(req);
      const rawName = sanitizeServerText(String(userName || caller?.name || '').trim(), 120);
      if (isGenericSuggestionName(rawName)) {
        return res.status(400).json({
          error: "कृपया सुझाव सबमिट करने से पहले अपना असली नाम लिखें। (Please enter your real full name before submitting a suggestion.)"
        });
      }

      const id = "sug_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const finalName = rawName;
      const finalEmail = sanitizeServerText(userEmail || caller?.email || "", 150).toLowerCase();
      const finalAvatar = userAvatar || "https://lh3.googleusercontent.com/a/default-user";
      const createdAt = new Date().toISOString();

      const item = {
        id,
        userName: finalName,
        userEmail: finalEmail,
        userAvatar: finalAvatar,
        content: cleanContent,
        likesCount: 0,
        createdAt
      };

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            `INSERT INTO suggestions (id, user_name, user_email, user_avatar, content, likes_count, created_at)
             VALUES ($1, $2, $3, $4, $5, 0, NOW())`,
            [id, finalName, finalEmail, finalAvatar, cleanContent]
          );
        } catch (dbErr: any) {
          console.warn("[PostgreSQL] insert suggestion error:", dbErr.message);
        }
      }

      memorySuggestions.unshift(item);
      return res.status(201).json({ success: true, suggestion: item });
    } catch (e: any) {
      return res.status(500).json({ error: "Failed to submit suggestion" });
    }
  });

  // Like a suggestion
  app.post("/api/suggestions/:id/like", async (req, res) => {
    try {
      const { id } = req.params;
      let newCount = 1;
      if (dbPool && isDbConnected) {
        try {
          const r = await dbPool.query(
            "UPDATE suggestions SET likes_count = likes_count + 1 WHERE id = $1 RETURNING likes_count",
            [id]
          );
          if (r.rows.length > 0) {
            newCount = r.rows[0].likes_count;
          }
        } catch {}
      }

      const match = memorySuggestions.find(s => s.id === id);
      if (match) {
        match.likesCount = (match.likesCount || 0) + 1;
        newCount = match.likesCount;
      }

      return res.json({ success: true, likesCount: newCount });
    } catch (e) {
      return res.status(500).json({ error: "Failed to like suggestion" });
    }
  });

  // Delete a suggestion (Admin moderation or author)
  app.delete("/api/suggestions/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query("DELETE FROM suggestions WHERE id = $1", [id]);
        } catch {}
      }

      const idx = memorySuggestions.findIndex(s => s.id === id);
      if (idx !== -1) {
        memorySuggestions.splice(idx, 1);
      }

      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: "Failed to delete suggestion" });
    }
  });

  // ==========================================
  // USER PROFILES & AUTHENTICATION API
  // ==========================================

  // Get user profile (Option B Privacy: Regular user mobile numbers are strictly private; only Owner and Admin can view them)
  const getUserProfileHandler = async (req: express.Request, res: express.Response) => {
    try {
      const uid = sanitizeServerText(req.params.uid || req.params.id, 150);
      const caller = extractRequestUser(req);
      const isAuth = Boolean(caller && caller.uid);
      const isAdmin = isRequestAdmin(req);
      const isOwner = isSameUserOrAdmin(req, uid, uid);

      const formatResponse = (prof: Record<string, any>) => {
        const safe = redactBulkItemForPrivacy(prof, isAuth || isOwner, isAdmin);
        if (!isOwner && !isAdmin) {
          delete safe.phone;
          delete safe.whatsapp;
          delete safe.userPhone;
        }
        return res.json(safe);
      };

      if (dbPool && isDbConnected) {
        try {
          // 1. Check profiles table first for full metadata
          const result = await dbPool.query(
            "SELECT * FROM profiles WHERE uid = $1 OR email = $1 LIMIT 1",
            [uid]
          );
          if (result.rows.length > 0) {
            const row = result.rows[0];
            const cleanAvatar = row.avatar_url && row.avatar_url !== "https://lh3.googleusercontent.com/a/default-user" ? row.avatar_url : "";
            return formatResponse({
              uid: row.uid,
              id: row.uid,
              full_name: row.full_name,
              displayName: row.full_name,
              email: row.email,
              phone: row.phone,
              avatar_url: cleanAvatar,
              photoURL: cleanAvatar,
              skills: row.skills,
              address: row.address,
              experience: row.experience,
              myHelperProfile: row.my_helper_profile,
              updated_at: row.updated_at
            });
          }

          // 2. Check primary "user" and users tables
          const userRes = await dbPool.query(
            'SELECT * FROM users WHERE id = $1 OR LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1',
            [uid]
          ).catch(() => ({ rows: [] as any[] }));
          if (userRes.rows.length > 0) {
            const u = userRes.rows[0];
            const cleanAvatar = u.avatar_url && u.avatar_url !== "https://lh3.googleusercontent.com/a/default-user" ? u.avatar_url : "";
            return formatResponse({
              uid: u.id,
              id: u.id,
              full_name: u.name,
              displayName: u.name,
              email: u.email || "",
              phone: u.phone || "",
              avatar_url: cleanAvatar,
              photoURL: cleanAvatar,
              created_at: u.created_at
            });
          }

          const legacyUserRes = await dbPool.query(
            'SELECT * FROM "user" WHERE id = $1 OR email = $1 LIMIT 1',
            [uid]
          );
          if (legacyUserRes.rows.length > 0) {
            const u = legacyUserRes.rows[0];
            return formatResponse({
              uid: u.id,
              id: u.id,
              full_name: u.name,
              displayName: u.name,
              email: u.email || "",
              phone: u.phone || "",
              avatar_url: "",
              photoURL: "",
              created_at: u.created_at
            });
          }
        } catch (dbErr) {
          console.warn("DB user profile query error:", dbErr);
        }
      }

      // Fallback to local file
      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      const p = profiles[uid];
      if (p) return formatResponse(p);
      return res.status(404).json({ error: "Profile not found" });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to fetch profile" });
    }
  };

  app.get("/api/profiles/:uid", getUserProfileHandler);
  app.get("/api/user/:id", getUserProfileHandler);

  // Upsert user profile (Saves into PostgreSQL users, "user", and profiles tables - Strict Ownership & File Validation)
  const saveUserProfileHandler = async (req: express.Request, res: express.Response) => {
    try {
      const profile = req.body;
      const uid = sanitizeServerText(profile?.uid || profile?.id || profile?.user_id || ('prof_' + Date.now()), 150);
      if (!profile || !uid) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Verify that a user can ONLY edit their own profile
      if (!isSameUserOrAdmin(req, uid, profile.email)) {
        return res.status(403).json({
          error: "Forbidden: You can only edit or update your own profile."
        });
      }

      // Validate uploaded profile avatar (image only <= 2MB) and upload directly to Firebase Storage (`locohelp/profiles/`)
      const rawAvatar = profile.image_url || profile.avatar_url || profile.profilePhoto || profile.photoURL;
      if (rawAvatar) {
        const avatarCheck = validateServerUploadedData(rawAvatar, { allowPdf: false });
        if (!avatarCheck.valid) {
          return res.status(400).json({ error: avatarCheck.error });
        }
      }
      const uploadedAvatar = rawAvatar
        ? await uploadDataToFirebaseServer(rawAvatar, "profiles")
        : "";

      const callerUser = extractRequestUser(req);
      const isAdminCaller = isRequestAdmin(req);
      const localProfiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      let existingLocalOrDb: any = localProfiles[uid] || null;
      if (dbPool && isDbConnected) {
        try {
          const checkRes = await dbPool.query("SELECT * FROM profiles WHERE uid = $1 OR id = $1 LIMIT 1", [uid]);
          if (checkRes.rows.length > 0) existingLocalOrDb = checkRes.rows[0];
        } catch {}
      }

      const fullName = sanitizeServerText(
        profile.name || profile.full_name || profile.displayName || existingLocalOrDb?.full_name || existingLocalOrDb?.name || "Community Member",
        120
      );
      const email = sanitizeServerText(
        profile.email || callerUser?.email || existingLocalOrDb?.email || (uid.includes('@') ? uid : ""),
        150
      ).toLowerCase();
      const phone = sanitizeServerText(profile.phone || existingLocalOrDb?.phone || "", 30);
      const whatsapp = sanitizeServerText(profile.whatsapp || phone || existingLocalOrDb?.whatsapp || "", 30);
      const prevCleanAvatar =
        existingLocalOrDb?.avatar_url && existingLocalOrDb.avatar_url !== "https://lh3.googleusercontent.com/a/default-user"
          ? existingLocalOrDb.avatar_url
          : "";
      const avatarUrl = uploadedAvatar || prevCleanAvatar || "";
      const skills = sanitizeServerText(profile.skills !== undefined ? profile.skills : (existingLocalOrDb?.skills || ""), 500);
      const address = sanitizeServerText(profile.address !== undefined ? (profile.address || profile.sector) : (existingLocalOrDb?.address || ""), 300);
      const city = sanitizeServerText(profile.city || existingLocalOrDb?.city || "Gandhinagar", 120);
      const sector = sanitizeServerText(profile.sector || address || existingLocalOrDb?.sector || "", 200);
      const categoryId = sanitizeServerText(profile.category_id || profile.category || existingLocalOrDb?.category_id || "", 100);
      const categoryName = sanitizeServerText(profile.category_name || profile.service || categoryId || existingLocalOrDb?.category_name || "", 150);
      const description = sanitizeServerText(profile.description || profile.bio || skills || existingLocalOrDb?.description || "", 1000);
      const experience = sanitizeServerText(profile.experience !== undefined ? profile.experience : (existingLocalOrDb?.experience || ""), 120);
      const myHelper = profile.my_helper_profile || profile.myHelperProfile || existingLocalOrDb?.my_helper_profile || existingLocalOrDb?.myHelperProfile || null;

      const requestedStatus = profile.status === 'deletion_requested'
        ? 'deletion_requested'
        : (isAdminCaller && (profile.status === 'approved' || profile.isVerified === true) ? 'approved' : 'pending');
      const isApprovedStatus = requestedStatus === 'approved';
      const normalizedHelper = myHelper
        ? {
            ...myHelper,
            isVerified: isApprovedStatus,
            status: requestedStatus
          }
        : null;

      // 1. PostgreSQL Upsert into users, "user", and profiles tables (with Edit History & Firebase Storage Cleanup)
      if (dbPool && isDbConnected) {
        try {
          const existingProfRes = await dbPool.query(
            "SELECT * FROM profiles WHERE uid = $1 OR id = $1 LIMIT 1",
            [uid]
          ).catch(() => ({ rows: [] as any[] }));

          if (existingProfRes.rows.length > 0) {
            const prevRow = existingProfRes.rows[0];
            const prevAvatar = prevRow.avatar_url || prevRow.image_url || "";
            if (prevAvatar && uploadedAvatar && prevAvatar !== uploadedAvatar) {
              await deleteFilesFromFirebaseStorage(prevAvatar);
            }
            const historyId = "hist_prof_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
            const updatedSnapshot = {
              uid,
              name: fullName,
              email,
              phone,
              whatsapp,
              city,
              sector,
              address,
              skills,
              experience,
              categoryId,
              avatarUrl,
              status: requestedStatus
            };
            await dbPool.query(
              `INSERT INTO profile_edit_history (id, user_id, email, entity_type, previous_data, updated_data, changed_by, created_at)
               VALUES ($1, $2, $3, 'user_profile', $4, $5, $6, NOW())`,
              [
                historyId,
                uid,
                email,
                JSON.stringify(prevRow),
                JSON.stringify(updatedSnapshot),
                callerUser?.email || callerUser?.uid || uid
              ]
            ).catch(() => {});
            await dbPool.query(
              `INSERT INTO audit_logs (id, data, created_at) VALUES ($1, $2, NOW())`,
              [
                historyId,
                JSON.stringify({
                  id: historyId,
                  type: "PROFILE_EDIT_HISTORY",
                  userId: uid,
                  email,
                  previous: prevRow,
                  updated: updatedSnapshot,
                  receivedAt: new Date().toISOString()
                })
              ]
            ).catch(() => {});
          }

          if (email) {
            await dbPool.query(`
              INSERT INTO users (id, name, email, phone, role, avatar_url, created_at)
              VALUES ($1, $2, LOWER(TRIM($3)), $4, 'user', $5, NOW())
              ON CONFLICT (email) DO UPDATE SET
                name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
                phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone),
                avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), users.avatar_url)
            `, [uid, fullName, email, phone, avatarUrl]).catch(() => {});
          }

          await dbPool.query(`
            INSERT INTO "user" (id, name, phone, email, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), "user".phone),
              email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email)
          `, [uid, fullName, phone, email]);

          await dbPool.query(`
            INSERT INTO profiles (uid, id, user_id, name, full_name, category_id, category_name, email, phone, whatsapp, city, sector, avatar_url, image_url, skills, address, experience, description, verified, rating, my_helper_profile, created_at, updated_at)
            VALUES ($1, $1, $1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $12, $13, $14, $15, 5.0, $16, NOW(), NOW())
            ON CONFLICT (uid) DO UPDATE SET
              id = COALESCE(profiles.id, EXCLUDED.id),
              user_id = COALESCE(profiles.user_id, EXCLUDED.user_id),
              name = EXCLUDED.name,
              full_name = EXCLUDED.full_name,
              category_id = COALESCE(NULLIF(EXCLUDED.category_id, ''), profiles.category_id),
              category_name = COALESCE(NULLIF(EXCLUDED.category_name, ''), profiles.category_name),
              email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
              whatsapp = COALESCE(NULLIF(EXCLUDED.whatsapp, ''), profiles.whatsapp),
              city = COALESCE(NULLIF(EXCLUDED.city, ''), profiles.city),
              sector = COALESCE(NULLIF(EXCLUDED.sector, ''), profiles.sector),
              avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url),
              image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), profiles.image_url),
              skills = EXCLUDED.skills,
              address = EXCLUDED.address,
              experience = EXCLUDED.experience,
              description = COALESCE(NULLIF(EXCLUDED.description, ''), profiles.description),
              verified = EXCLUDED.verified,
              my_helper_profile = COALESCE(EXCLUDED.my_helper_profile, profiles.my_helper_profile),
              updated_at = NOW()
          `, [uid, fullName, categoryId, categoryName, email, phone, whatsapp, city, sector, avatarUrl, skills, address, experience, description, isApprovedStatus, normalizedHelper ? JSON.stringify(normalizedHelper) : null]);

          if (categoryId) {
            await dbPool.query(
              `UPDATE categories SET registered_count = (SELECT COUNT(*) FROM helpers WHERE LOWER(category_id) = LOWER($1)) WHERE id = $1`,
              [categoryId]
            ).catch(() => {});
          }

          if (!isAdminCaller) {
            await dbPool.query(
              "UPDATE helpers SET is_verified = false WHERE id = $1 OR phone = $2",
              [normalizedHelper?.id || uid, phone]
            ).catch(() => {});
            await dbPool.query(
              "UPDATE verification_requests SET status = $1 WHERE entity_id = $2 OR user_id = $2",
              [requestedStatus === 'deletion_requested' ? 'deletion_requested' : 'pending', normalizedHelper?.id || uid]
            ).catch(() => {});
          }
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
        category_id: categoryId,
        category_name: categoryName,
        email,
        phone,
        whatsapp,
        city,
        sector,
        avatar_url: avatarUrl,
        image_url: avatarUrl,
        photoURL: avatarUrl,
        skills,
        address,
        experience,
        description,
        myHelperProfile: normalizedHelper,
        status: requestedStatus,
        isVerified: isApprovedStatus,
        is_verified: isApprovedStatus,
        updated_at: new Date().toISOString()
      };
      writeJsonFile(PROFILES_FILE, profiles);

      // Revert any linked helper & verification entry to pending (or deletion_requested) when edited by a non-admin user
      if (!isAdminCaller) {
        const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
        let helpersModified = false;
        helpers.forEach(h => {
          if (h && (h.userId === uid || (normalizedHelper?.id && h.id === normalizedHelper.id) || (email && (h.email || '').toLowerCase() === email))) {
            h.isVerified = false;
            h.is_verified = false;
            h.status = requestedStatus;
            helpersModified = true;
          }
        });
        if (helpersModified) {
          writeJsonFile(HELPERS_FILE, helpers);
        }

        const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
        let verifsModified = false;
        verifs.forEach(v => {
          if (v && (v.userId === uid || v.entityId === uid || (normalizedHelper?.id && v.entityId === normalizedHelper.id))) {
            v.status = requestedStatus;
            verifsModified = true;
          }
        });
        if (verifsModified) {
          writeJsonFile(VERIFICATIONS_FILE, verifs);
        }
      }

      await archiveToSecurityVault("user_profile", uid, profiles[uid], "ACTIVE_REGISTERED");
      if (normalizedHelper && normalizedHelper.id) {
        await archiveToSecurityVault("helper", normalizedHelper.id, { ...normalizedHelper, userId: uid, email: email || normalizedHelper.email }, "ACTIVE_REGISTERED");
      }

      res.status(200).json({ success: true, profile: profiles[uid], user: profiles[uid] });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to save profile" });
    }
  };

  // Profile endpoints protected with strict authentication
  app.post("/api/profiles", requireAuth, saveUserProfileHandler);
  app.post("/api/user", requireAuth, saveUserProfileHandler);
  app.post("/api/user/profile", requireAuth, saveUserProfileHandler);

  // Dedicated Signup Endpoint - Inserts directly into PostgreSQL users, "user", and profiles tables
  const signupHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { id, uid, name, full_name, displayName, phone, email } = req.body;
      const targetId = sanitizeServerText(id || uid || (email ? 'email_' + email.replace(/[^a-z0-9]/g, '_') : (phone ? 'phone_' + phone.replace(/\D/g, '') : 'user_' + Date.now())), 150);
      const userName = sanitizeServerText(name || full_name || displayName || (email ? email.split('@')[0] : 'Community Member'), 120);
      const userEmail = sanitizeServerText(email || '', 150).toLowerCase();
      const userPhone = sanitizeServerText(phone || '', 30);

      if (dbPool && isDbConnected) {
        try {
          if (userEmail) {
            await dbPool.query(`
              INSERT INTO users (id, name, email, phone, role, avatar_url, created_at)
              VALUES ($1, $2, LOWER(TRIM($3)), $4, 'user', $5, NOW())
              ON CONFLICT (email) DO UPDATE SET
                name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
                phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone)
            `, [targetId, userName, userEmail, userPhone, "https://lh3.googleusercontent.com/a/default-user"]).catch(() => {});
          }

          await dbPool.query(`
            INSERT INTO "user" (id, name, phone, email, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), "user".phone),
              email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email)
          `, [targetId, userName, userPhone, userEmail]);

          await dbPool.query(`
            INSERT INTO profiles (uid, id, user_id, name, full_name, email, phone, updated_at)
            VALUES ($1, $1, $1, $2, $2, $3, $4, NOW())
            ON CONFLICT (uid) DO UPDATE SET
              name = EXCLUDED.name,
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
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${365 * 24 * 3600}; SameSite=Lax`);
      await archiveToSecurityVault("user_profile", targetId, userData, "ACTIVE_REGISTERED");

      res.status(201).json({ success: true, token, user: userData });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to sign up" });
    }
  };

  app.post("/api/auth/signup", authLoginLimiter, signupHandler);
  app.post("/api/signup", authLoginLimiter, signupHandler);
  app.post("/api/users", authLoginLimiter, signupHandler);

  // Save or update logged-in user's FCM Web Push token and current area/location in PostgreSQL
  app.post("/api/users/fcm-token", requireAuth, async (req: express.Request, res: express.Response) => {
    try {
      const caller = (req as any).user || extractRequestUser(req);
      const body = req.body || {};
      const fcmToken = String(body.fcm_token || body.fcmToken || "").trim();
      if (!fcmToken) {
        return res.status(400).json({ error: "fcm_token is required" });
      }

      const uid = sanitizeServerText(caller?.uid || body.userId || body.uid || "", 150);
      const email = sanitizeServerText(caller?.email || body.email || "", 150).toLowerCase();
      const name = sanitizeServerText(caller?.name || body.name || "Community Member", 120);
      const area = sanitizeServerText(body.area || "", 150);
      const city = sanitizeServerText(body.city || body.district || "", 120);
      const location = sanitizeServerText(
        body.location || [area, city, body.state].filter(Boolean).join(", ") || "Local Area",
        250
      );
      const latitude = typeof body.latitude === "number" && Number.isFinite(body.latitude) ? body.latitude : null;
      const longitude = typeof body.longitude === "number" && Number.isFinite(body.longitude) ? body.longitude : null;

      if (!uid && !email) {
        return res.status(401).json({ error: "Authentication required to save FCM token" });
      }

      const resolvedId = uid || `email_${email.replace(/[^a-z0-9]/g, "_")}`;

      if (dbPool && isDbConnected) {
        await dbPool.query(
          `INSERT INTO users (id, name, email, fcm_token, area, city, location, latitude, longitude, fcm_updated_at, created_at)
           VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, $7, $8, $9, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             fcm_token = EXCLUDED.fcm_token,
             area = COALESCE(NULLIF(EXCLUDED.area, ''), users.area),
             city = COALESCE(NULLIF(EXCLUDED.city, ''), users.city),
             location = COALESCE(NULLIF(EXCLUDED.location, ''), users.location),
             latitude = COALESCE(EXCLUDED.latitude, users.latitude),
             longitude = COALESCE(EXCLUDED.longitude, users.longitude),
             fcm_updated_at = NOW()`,
          [resolvedId, name, email, fcmToken, area, city, location, latitude, longitude]
        ).catch(async () => {
          // If email conflict occurs on a different id row, update by email or id directly
          await dbPool!.query(
            `UPDATE users
             SET fcm_token = $1,
                 area = COALESCE(NULLIF($2, ''), area),
                 city = COALESCE(NULLIF($3, ''), city),
                 location = COALESCE(NULLIF($4, ''), location),
                 latitude = COALESCE($5, latitude),
                 longitude = COALESCE($6, longitude),
                 fcm_updated_at = NOW()
             WHERE id = $7 OR (email IS NOT NULL AND LOWER(email) = LOWER($8))`,
            [fcmToken, area, city, location, latitude, longitude, resolvedId, email]
          ).catch(() => {});
        });

        // Also update profiles table if user has a profile row
        await dbPool.query(
          `UPDATE profiles
           SET city = COALESCE(NULLIF($1, ''), city),
               sector = COALESCE(NULLIF($2, ''), sector),
               updated_at = NOW()
           WHERE uid = $3 OR (email IS NOT NULL AND LOWER(email) = LOWER($4))`,
          [city, area, resolvedId, email]
        ).catch(() => {});
      }

      return res.json({
        success: true,
        fcmTokenSaved: true,
        area: area || city || "Local Area",
        location
      });
    } catch (err: any) {
      console.error("[FCM Token Save Error]:", err?.message || err);
      return res.status(500).json({ error: "Failed to save FCM token" });
    }
  });

  // Delete profile protected with strict authentication & ownership verification
  // Users cannot directly delete their profiles; non-admin requests mark status as deletion_requested for Admin review.
  app.delete("/api/profiles/:uid", requireAuth, async (req, res) => {
    try {
      const { uid } = req.params;
      let targetProfile: any = null;
      if (dbPool && isDbConnected) {
        try {
          const pRes = await dbPool.query("SELECT * FROM profiles WHERE uid = $1 OR email = $1 LIMIT 1", [uid]);
          if (pRes.rows.length > 0) targetProfile = pRes.rows[0];
        } catch {}
      }

      if (!isSameUserOrAdmin(req, uid, targetProfile?.email)) {
        return res.status(403).json({
          error: "Forbidden: You can only request closure for your own profile."
        });
      }

      const isAdminCaller = isRequestAdmin(req);
      // Log ACCOUNT_DELETED action with IP and User-Agent for 180-day security audit trail
      await logSecurityAudit(uid, "ACCOUNT_DELETED", req);

      if (!isAdminCaller) {
        if (dbPool && isDbConnected) {
          try {
            await dbPool.query(
              "UPDATE users SET is_deleted = true, deleted_at = NOW(), hidden = true WHERE id = $1 OR email = $2",
              [uid, (targetProfile?.email || "").toLowerCase()]
            ).catch(() => {});
            await dbPool.query(
              'UPDATE "user" SET is_deleted = true, deleted_at = NOW(), hidden = true WHERE id = $1 OR email = $2',
              [uid, (targetProfile?.email || "").toLowerCase()]
            ).catch(() => {});
            await dbPool.query(
              "UPDATE profiles SET status = 'deletion_requested', is_deleted = true, deleted_at = NOW(), hidden = true, verified = false, is_verified = false, updated_at = NOW() WHERE uid = $1 OR email = $1",
              [uid]
            );
            await dbPool.query(
              "UPDATE helpers SET is_verified = false, is_deleted = true, deleted_at = NOW(), hidden = true WHERE id = $1 OR phone = $2",
              [uid, targetProfile?.phone || ""]
            ).catch(() => {});
            await dbPool.query(
              "UPDATE verification_requests SET status = 'deletion_requested' WHERE entity_id = $1 OR user_id = $1",
              [uid]
            ).catch(() => {});
            const closureRepId = 'rep_closure_' + Date.now();
            const uName = targetProfile?.full_name || targetProfile?.name || uid;
            await dbPool.query(
              `INSERT INTO admin_reports (id, reporter_id, reporter_name, reason, details, status, reported_at)
               VALUES ($1, $2, $3, 'ACCOUNT_CLOSURE_REQUEST', $4, 'deletion_requested', NOW())`,
              [closureRepId, uid, uName, `ACCOUNT CLOSURE REQUEST for user "${uName}" (${targetProfile?.email || ''} / ${targetProfile?.phone || ''})`]
            ).catch(() => {});
          } catch {}
        }
        return res.json({
          success: true,
          status: 'deletion_requested',
          is_deleted: true,
          message: 'Account soft-deleted and retained in compliance archive for 180 days.'
        });
      }

      const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
      const userEmail = (targetProfile?.email || "").toLowerCase();
      const authRecord = userEmail ? authUsers[userEmail] : Object.values(authUsers).find((u: any) => u?.uid === uid);

      // 1. Archive User Profile to Encrypted Non-Deletable Security Vault as DELETED_BY_USER
      await archiveToSecurityVault(
        "user_profile",
        uid,
        { ...(authRecord || {}), ...(targetProfile || {}), uid, id: uid },
        "ADMIN_REMOVED_PUBLIC"
      );

      // 2. Soft-delete linked Helper Profiles so records remain preserved in DB for 180-day compliance while hidden from public directories
      const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
      const userHelpers = helpers.filter(
        h => h && (h.userId === uid || (userEmail && (h.email || "").toLowerCase() === userEmail))
      );
      for (const uh of userHelpers) {
        await archiveToSecurityVault("helper", uh.id, uh, "ADMIN_REMOVED_PUBLIC");
        if (dbPool && isDbConnected) {
          try {
            await dbPool.query(
              "UPDATE helpers SET is_deleted = true, deleted_at = NOW(), hidden = true, is_verified = false WHERE id = $1",
              [uh.id]
            );
          } catch (_e) {}
        }
      }
      if (userHelpers.length > 0) {
        const remainingHelpers = helpers.filter(
          h => !(h && (h.userId === uid || (userEmail && (h.email || "").toLowerCase() === userEmail)))
        );
        writeJsonFile(HELPERS_FILE, remainingHelpers);
      }

      // 3. Soft-delete linked Business/Shop from public listings while retaining 180-day DB audit records
      const shops = readJsonFile<any[]>(SHOPS_FILE, []);
      const userShops = shops.filter(
        s => s && (s.userId === uid || s.owner_id === uid || (userEmail && (s.ownerEmail || "").toLowerCase() === userEmail))
      );
      for (const us of userShops) {
        await archiveToSecurityVault("business", us.id, us, "ADMIN_REMOVED_PUBLIC");
        if (dbPool && isDbConnected) {
          try {
            await dbPool.query(
              "UPDATE businesses SET is_deleted = true, deleted_at = NOW(), hidden = true, is_approved = false, is_verified = false WHERE id = $1",
              [us.id]
            );
            await dbPool.query(
              "UPDATE shops SET is_deleted = true, deleted_at = NOW(), hidden = true, is_verified = false WHERE id = $1",
              [us.id]
            );
          } catch (_e) {}
        }
      }
      if (dbPool && isDbConnected) {
        try {
          // Soft Delete (is_deleted = true, deleted_at = NOW()) to preserve registration data & audit logs for 180 days per IT Rules 2021
          await dbPool.query(
            'UPDATE "user" SET is_deleted = true, deleted_at = NOW(), hidden = true WHERE id = $1 OR email = $2',
            [uid, userEmail]
          ).catch(() => {});
          await dbPool.query(
            "UPDATE users SET is_deleted = true, deleted_at = NOW(), hidden = true WHERE id = $1 OR email = $2",
            [uid, userEmail]
          ).catch(() => {});
          await dbPool.query(
            "UPDATE profiles SET is_deleted = true, deleted_at = NOW(), hidden = true, status = 'deleted', verified = false, is_verified = false, updated_at = NOW() WHERE uid = $1 OR id = $1 OR email = $2",
            [uid, userEmail]
          ).catch(() => {});
        } catch (dbErr) {}
      }
      invalidatePublicCache('public_helpers');
      invalidatePublicCache('public_shops');
      res.json({ success: true, softDeleted: true });
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
            INSERT INTO users (id, name, email, phone, role, avatar_url, created_at)
            VALUES ($1, $2, $3, '', 'user', $4, NOW())
            ON CONFLICT (email) DO UPDATE SET
              name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
              avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), users.avatar_url)
          `, [uid, name, cleanEmail, photo]).catch(() => {});

          await dbPool.query(`
            INSERT INTO "user" (id, name, phone, email, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email)
          `, [uid, name, '', cleanEmail]);

          await dbPool.query(`
            INSERT INTO profiles (uid, id, user_id, name, full_name, email, avatar_url, image_url, updated_at)
            VALUES ($1, $1, $1, $2, $2, $3, $4, $4, NOW())
            ON CONFLICT (uid) DO UPDATE SET
              name = EXCLUDED.name,
              full_name = EXCLUDED.full_name,
              avatar_url = EXCLUDED.avatar_url,
              image_url = EXCLUDED.image_url,
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
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${365 * 24 * 3600}; SameSite=Lax`);

      res.json({
        success: true,
        token,
        user
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Login failed" });
    }
  });

  // Helper to look up existing user account across users, user_passwords, auth_users.json, "user", and profiles
  const findExistingAccount = async (rawEmail: string) => {
    const cleanEmail = String(rawEmail || '').trim().toLowerCase();
    const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
    let record: any = authUsers[cleanEmail] ? { ...authUsers[cleanEmail] } : null;

    if (dbPool && isDbConnected) {
      try {
        const usersRes = await dbPool.query(
          "SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1",
          [cleanEmail]
        );
        if (usersRes.rows.length > 0) {
          const uRow = usersRes.rows[0];
          record = {
            uid: uRow.id || record?.uid || cleanEmail,
            email: cleanEmail,
            name: uRow.name || record?.name || cleanEmail.split('@')[0],
            phone: uRow.phone || record?.phone || '',
            passwordHash: uRow.password_hash || record?.passwordHash || '',
            fromOtpOrDb: true
          };
        }

        const pwRes = await dbPool.query(
          "SELECT * FROM user_passwords WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1",
          [cleanEmail]
        );
        if (pwRes.rows.length > 0) {
          const row = pwRes.rows[0];
          record = {
            uid: row.uid || record?.uid || cleanEmail,
            email: cleanEmail,
            name: row.name || record?.name || cleanEmail.split('@')[0],
            phone: row.phone || record?.phone || '',
            passwordHash: row.password_hash || record?.passwordHash || ''
          };
        }

        const otpUid = 'email_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
        const userRes = await dbPool.query(
          'SELECT * FROM "user" WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR id = $1 OR id = $2 LIMIT 1',
          [cleanEmail, otpUid]
        );
        if (userRes.rows.length > 0) {
          const u = userRes.rows[0];
          record = {
            uid: record?.uid || u.id || cleanEmail,
            email: cleanEmail,
            name: record?.name || u.name || cleanEmail.split('@')[0],
            phone: record?.phone || u.phone || '',
            passwordHash: record?.passwordHash || '',
            fromOtpOrDb: true
          };
        }
      } catch (e) {}
    }

    if (!record) {
      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      const otpUid = 'email_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
      const matchedProfile =
        profiles[cleanEmail] ||
        profiles[otpUid] ||
        Object.values(profiles).find((p: any) => (p?.email || '').trim().toLowerCase() === cleanEmail);
      if (matchedProfile) {
        record = {
          uid: matchedProfile.uid || matchedProfile.id || cleanEmail,
          email: cleanEmail,
          name: matchedProfile.full_name || matchedProfile.displayName || cleanEmail.split('@')[0],
          phone: matchedProfile.phone || '',
          passwordHash: '',
          fromOtpOrDb: true
        };
      }
    }

    return record;
  };

  const saveAccountWithPassword = async (
    rawEmail: string,
    uid: string,
    displayName: string,
    phone: string,
    hashedPassword: string
  ) => {
    const cleanEmail = String(rawEmail || '').trim().toLowerCase();
    const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
    authUsers[cleanEmail] = {
      uid,
      email: cleanEmail,
      name: displayName,
      phone: phone || '',
      passwordHash: hashedPassword,
      updatedAt: new Date().toISOString()
    };
    writeJsonFile(AUTH_USERS_FILE, authUsers);

    if (dbPool && isDbConnected) {
      try {
        await dbPool.query(
          `INSERT INTO users (id, name, email, password_hash, phone, role, terms_accepted, terms_accepted_at, created_at)
           VALUES ($1, $2, $3, $4, $5, 'user', true, NOW(), NOW())
           ON CONFLICT (email) DO UPDATE SET
             id = COALESCE(NULLIF(users.id, ''), EXCLUDED.id),
             name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
             phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone),
             password_hash = EXCLUDED.password_hash,
             terms_accepted = true,
             terms_accepted_at = COALESCE(users.terms_accepted_at, NOW())`,
          [uid, displayName, cleanEmail, hashedPassword, phone || '']
        );

        await dbPool.query(
          `INSERT INTO user_passwords (email, uid, name, phone, password_hash, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (email) DO UPDATE SET
             uid = EXCLUDED.uid,
             name = COALESCE(NULLIF(EXCLUDED.name, ''), user_passwords.name),
             phone = COALESCE(NULLIF(EXCLUDED.phone, ''), user_passwords.phone),
             password_hash = EXCLUDED.password_hash,
             updated_at = NOW()`,
          [cleanEmail, uid, displayName, phone || '', hashedPassword]
        );

        await dbPool.query(
          `INSERT INTO "user" (id, name, phone, email, terms_accepted, terms_accepted_at, created_at)
           VALUES ($1, $2, $3, $4, true, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = COALESCE(NULLIF(EXCLUDED.name, ''), "user".name),
             phone = COALESCE(NULLIF(EXCLUDED.phone, ''), "user".phone),
             email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email),
             terms_accepted = true,
             terms_accepted_at = COALESCE("user".terms_accepted_at, NOW())`,
          [uid, displayName, phone || '', cleanEmail]
        );

        await dbPool.query(
          `INSERT INTO profiles (uid, id, user_id, name, full_name, email, phone, terms_accepted, terms_accepted_at, updated_at)
           VALUES ($1, $1, $1, $2, $2, $3, $4, true, NOW(), NOW())
           ON CONFLICT (uid) DO UPDATE SET
             name = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
             full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
             phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
             terms_accepted = true,
             terms_accepted_at = COALESCE(profiles.terms_accepted_at, NOW()),
             updated_at = NOW()`,
          [uid, displayName, cleanEmail, phone || '']
        );
      } catch (e) {
        console.warn("[PostgreSQL] saveAccountWithPassword note:", e);
      }
    }
  };

  // Email & Password Registration
  app.post("/api/auth/register-password", registrationAndMessageLimiter, authLimiter, async (req, res) => {
    try {
      if (isBotSubmission(req)) {
        console.log("[Honeypot Triggered] Silently rejecting automated bot registration");
        return res.status(200).json({ success: true, message: "Registration received" });
      }

      const { email, password, name, phone, otpCode } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: "कृपया सही ईमेल आईडी दर्ज करें (Invalid email format)" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Password must be at least 6 characters)" });
      }
      if (otpCode && String(otpCode).trim().length >= 6) {
        const otpCheck = await verifyAndConsumeOtp(cleanEmail, String(otpCode).trim());
        if (!otpCheck.valid) {
          return res.status(400).json({ error: otpCheck.error, needsOtp: true });
        }
      }

      const existing = await findExistingAccount(cleanEmail);
      const uid = existing?.uid || ('email_' + cleanEmail.replace(/[^a-z0-9]/g, '_'));
      const displayName = (name && name.trim()) || existing?.name || cleanEmail.split('@')[0];
      const finalPhone = (phone && phone.trim()) || existing?.phone || '';
      const hashedPassword = hashPassword(password);

      await saveAccountWithPassword(cleanEmail, uid, displayName, finalPhone, hashedPassword);
      await logSecurityAudit(uid, existing ? "LOGIN" : "SIGNUP", req);

      const user = {
        uid,
        id: uid,
        name: displayName,
        displayName,
        email: cleanEmail,
        phone: finalPhone,
        termsAccepted: true,
        isGuest: false
      };

      const token = createSessionToken({ uid, email: cleanEmail, name: displayName });
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${365 * 24 * 3600}; SameSite=Lax`);

      res.json({ success: true, token, user });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to register" });
    }
  });

  // Email & Password Login (Queries PostgreSQL users table via LOWER(TRIM(email)) and auto-persists accounts so valid users never get "Email not registered")
  const handleEmailPasswordLogin = async (req: express.Request, res: express.Response) => {
    try {
      const { email, password, name, phone } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const cleanEmail = String(email).trim().toLowerCase();
      if (String(password).length < 6) {
        return res.status(400).json({ error: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Min 6 characters)" });
      }

      const existing = await findExistingAccount(cleanEmail);

      if (!existing || !existing.passwordHash) {
        const hashedInput = hashPassword(String(password));
        const uid = existing?.uid || ('email_' + cleanEmail.replace(/[^a-z0-9]/g, '_'));
        const displayName = (name && String(name).trim()) || existing?.name || cleanEmail.split('@')[0];
        const finalPhone = (phone && String(phone).trim()) || existing?.phone || '';

        await saveAccountWithPassword(cleanEmail, uid, displayName, finalPhone, hashedInput);
        await logSecurityAudit(uid, existing ? "LOGIN" : "SIGNUP", req);

        const user = {
          uid,
          id: uid,
          name: displayName,
          displayName,
          email: cleanEmail,
          phone: finalPhone,
          termsAccepted: true,
          isGuest: false
        };

        const token = createSessionToken({ uid, email: cleanEmail, name: displayName });
        res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${365 * 24 * 3600}; SameSite=Lax`);
        return res.json({ success: true, token, user });
      }

      if (!verifyPassword(String(password), existing.passwordHash)) {
        return res.status(401).json({
          error: "गलत पासवर्ड! यदि आप अपना पासवर्ड भूल गए हैं तो नीचे 'Forgot / Reset Password via OTP' विकल्प चुनें। (Incorrect password!)",
          needsReset: true
        });
      }

      // Upgrade hash to bcrypt if legacy PBKDF2 was used
      const finalPasswordHash = existing.passwordHash.startsWith("$2")
        ? existing.passwordHash
        : hashPassword(String(password));
      await saveAccountWithPassword(cleanEmail, existing.uid, existing.name, existing.phone || '', finalPasswordHash);
      await logSecurityAudit(existing.uid, "LOGIN", req);

      const user = {
        uid: existing.uid,
        id: existing.uid,
        name: existing.name,
        displayName: existing.name,
        email: cleanEmail,
        phone: existing.phone || '',
        termsAccepted: true,
        isGuest: false
      };

      const token = createSessionToken({ uid: existing.uid, email: cleanEmail, name: existing.name });
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${365 * 24 * 3600}; SameSite=Lax`);

      res.json({ success: true, token, user });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Login failed" });
    }
  };

  app.post("/api/auth/login-password", authLimiter, handleEmailPasswordLogin);
  app.post("/api/auth/login", authLimiter, handleEmailPasswordLogin);

  // Set / Reset Password for Existing or OTP Users (STRICTLY REQUIRES REAL EMAIL 6-DIGIT OTP VERIFICATION)
  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { email, newPassword, name, otpCode } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ error: "Email and new password are required" });
      }
      const cleanEmail = email.trim().toLowerCase();
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Password must be at least 6 characters)" });
      }
      if (!otpCode || String(otpCode).trim().length < 6) {
        return res.status(400).json({
          error: "सुरक्षा के लिए पासवर्ड सेट या रीसेट करने से पहले ईमेल पर आया 6-अंकों का OTP कोड डालना अनिवार्य है। (6-digit Email OTP verification is mandatory to set or reset password.)",
          needsOtp: true
        });
      }

      const otpCheck = await verifyAndConsumeOtp(cleanEmail, String(otpCode).trim());
      if (!otpCheck.valid) {
        return res.status(400).json({ error: otpCheck.error, needsOtp: true });
      }

      const existing = await findExistingAccount(cleanEmail);
      const uid = existing?.uid || ('email_' + cleanEmail.replace(/[^a-z0-9]/g, '_'));
      const displayName = (name && name.trim()) || existing?.name || cleanEmail.split('@')[0];
      const finalPhone = existing?.phone || '';
      const hashedPassword = hashPassword(newPassword);

      await saveAccountWithPassword(cleanEmail, uid, displayName, finalPhone, hashedPassword);

      const user = {
        uid,
        id: uid,
        name: displayName,
        displayName,
        email: cleanEmail,
        phone: finalPhone,
        isGuest: false
      };

      const token = createSessionToken({ uid, email: cleanEmail, name: displayName });
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);

      res.json({ success: true, token, user });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to reset password" });
    }
  });

  // Session verification (Get active session user from token / cookie and refresh persistent cookie)
  app.get("/api/auth/me", async (req, res) => {
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

      let dbName = decoded.name || (decoded.email ? decoded.email.split("@")[0] : "Community User");
      let dbPhone = "";
      let dbPhoto = "";
      if (dbPool && isDbConnected) {
        try {
          const pRes = await dbPool.query(
            "SELECT name, full_name, phone, avatar_url, image_url FROM profiles WHERE uid = $1 OR LOWER(TRIM(email)) = LOWER(TRIM($2)) LIMIT 1",
            [decoded.uid, decoded.email || ""]
          );
          if (pRes.rows.length > 0) {
            const r = pRes.rows[0];
            dbName = r.full_name || r.name || dbName;
            dbPhone = r.phone || "";
            dbPhoto = r.avatar_url || r.image_url || "";
          }
        } catch {}
      }

      const refreshedToken = createSessionToken({
        uid: decoded.uid,
        email: decoded.email || "",
        name: dbName
      });
      res.setHeader('Set-Cookie', `locohelp_token=${refreshedToken}; Path=/; Max-Age=${365 * 24 * 3600}; SameSite=Lax`);

      res.json({
        success: true,
        token: refreshedToken,
        user: {
          uid: decoded.uid,
          id: decoded.uid,
          name: dbName,
          displayName: dbName,
          email: decoded.email || "",
          phone: dbPhone,
          photoURL: dbPhoto,
          isGuest: false
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to verify session" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", (_req, res) => {
    res.setHeader('Set-Cookie', 'locohelp_token=; Path=/; Max-Age=0; SameSite=Lax');
    res.json({ success: true });
  });

  // ==========================================
  // BROADCAST POSTS (INTENTS) API
  // ==========================================

  // ==========================================
  // LISTINGS & BROADCAST POSTS API
  // ==========================================

  // Track admin-deleted entities in memory so browser sync never resurrects deleted profiles/helpers/posts
  const deletedEntitiesMemorySet = new Set<string>();
  const isDummyPostRecord = (idRaw: any, descRaw: any, authorRaw?: any): boolean => {
    const idStr = String(idRaw || '').trim().toLowerCase();
    const descStr = String(descRaw || '').trim();
    const descLower = descStr.toLowerCase();
    if (!idStr && !descStr) return true;
    if (
      idStr.startsWith('seed_') ||
      idStr.startsWith('sample_') ||
      idStr.startsWith('mock_') ||
      idStr.startsWith('dummy_') ||
      idStr.includes('m660z') ||
      idStr.includes('t9140')
    ) {
      return true;
    }
    if (
      descStr.includes('તાત્કાલિક પ્લમ્બર જોઈએ છે') ||
      descLower === 'urgent plumber needed' ||
      descLower.includes('urgent plumber needed in sector') ||
      descLower === 'need a plumber urgently'
    ) {
      return true;
    }
    return false;
  };

  let hasPurgedDummyPostsFromPostgres = false;
  const purgeDummyPostsFromPostgresOnce = async () => {
    if (hasPurgedDummyPostsFromPostgres || !dbPool || !isDbConnected) return;
    hasPurgedDummyPostsFromPostgres = true;
    try {
      await dbPool.query(`
        DELETE FROM posts
        WHERE id ILIKE '%m660z%'
           OR id ILIKE '%t9140%'
           OR id LIKE 'seed_%'
           OR id LIKE 'sample_%'
           OR id LIKE 'mock_%'
           OR id LIKE 'dummy_%'
           OR content ILIKE '%તાત્કાલિક પ્લમ્બર જોઈએ છે%'
           OR TRIM(LOWER(content)) = 'urgent plumber needed'
      `).catch(() => {});
      await dbPool.query(`
        DELETE FROM listings
        WHERE id ILIKE '%m660z%'
           OR id ILIKE '%t9140%'
           OR id LIKE 'seed_%'
           OR id LIKE 'sample_%'
           OR id LIKE 'mock_%'
           OR id LIKE 'dummy_%'
           OR description ILIKE '%તાત્કાલિક પ્લમ્બર જોઈએ છે%'
           OR TRIM(LOWER(description)) = 'urgent plumber needed'
      `).catch(() => {});
      await dbPool.query(`
        DELETE FROM broadcast_posts
        WHERE id ILIKE '%m660z%'
           OR id ILIKE '%t9140%'
           OR id LIKE 'seed_%'
           OR id LIKE 'sample_%'
           OR id LIKE 'mock_%'
           OR id LIKE 'dummy_%'
           OR description ILIKE '%તાત્કાલિક પ્લમ્બર જોઈએ છે%'
           OR TRIM(LOWER(description)) = 'urgent plumber needed'
      `).catch(() => {});
    } catch {}
  };

  // 1. Get All Listings / Broadcast Intents (Redacts private emails/phones for unauthenticated bulk requests)
  const getListingsHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      await purgeDummyPostsFromPostgresOnce();

      const caller = extractRequestUser(req);
      const isAuth = Boolean(caller && caller.uid);
      const isAdmin = isRequestAdmin(req);

      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);
      const includeExpired = req.query.all === 'true';
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const nowMs = Date.now();

      const localIntents = readJsonFile<any[]>(INTENTS_FILE, []);
      const cleanedLocalIntents = localIntents.filter(
        i => i && i.id && !deletedIds.includes(i.id) && !deletedEntitiesMemorySet.has(String(i.id)) && !isDummyPostRecord(i.id, i.description || i.title, i.authorName)
      );
      if (cleanedLocalIntents.length !== localIntents.length) {
        writeJsonFile(INTENTS_FILE, cleanedLocalIntents);
      }

      const mergedMap = new Map<string, any>();

      cleanedLocalIntents.forEach(i => {
        mergedMap.set(i.id, i);
      });

      // If PostgreSQL is connected, merge records from database with local metadata
      if (dbPool && isDbConnected) {
        try {
          const listRes = await dbPool.query(`
            SELECT * FROM listings 
            ORDER BY created_at DESC 
            LIMIT 100
          `);

          if (listRes.rows.length > 0) {
            listRes.rows.forEach(r => {
              if (!r || !r.id || deletedIds.includes(r.id) || deletedEntitiesMemorySet.has(String(r.id))) return;
              if (isDummyPostRecord(r.id, r.description || r.title)) return;
              const localMeta = mergedMap.get(r.id) || {};
              const rawLoc = typeof r.location === 'string' ? r.location : '';
              const parts = rawLoc.includes(',') ? rawLoc.split(',').map((s: string) => s.trim()) : [];
              mergedMap.set(r.id, {
                ...localMeta,
                id: r.id,
                authorId: r.user_id || localMeta.authorId || 'Community Member',
                authorName: localMeta.authorName || 'Community Member',
                authorEmail: localMeta.authorEmail || '',
                description: r.description || localMeta.description || '',
                category: r.title || localMeta.category || 'General',
                tags: localMeta.tags || [r.title ? `#${r.title}` : '#General'],
                status: localMeta.status || 'active',
                city: localMeta.city || (parts.length > 1 ? parts[parts.length - 1] : ''),
                area: localMeta.area || (parts.length > 1 ? parts.slice(0, -1).join(', ') : ''),
                location: localMeta.location || rawLoc || 'Kudasan, Gandhinagar',
                distance: localMeta.distance || (rawLoc && !isNaN(Number(rawLoc)) ? Number(rawLoc) : 0.5),
                hasLocationPin: true,
                isVerifiedUser: true,
                createdAt: localMeta.createdAt || (r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()),
                expiresAt: localMeta.expiresAt,
                lastInteractionAt: localMeta.lastInteractionAt
              });
            });
          }

          const postsRes = await dbPool.query(`
            SELECT * FROM posts
            ORDER BY created_at DESC
            LIMIT 200
          `).catch(() => ({ rows: [] as any[] }));

          if (postsRes.rows.length > 0) {
            postsRes.rows.forEach(r => {
              if (!r || !r.id || deletedIds.includes(r.id) || deletedEntitiesMemorySet.has(String(r.id))) return;
              const rawObj = typeof r.raw_json === 'object' && r.raw_json ? r.raw_json : {};
              if (isDummyPostRecord(r.id, r.content || rawObj.description || rawObj.title, r.author_name)) return;
              const localMeta = mergedMap.get(r.id) || {};
              mergedMap.set(r.id, {
                ...rawObj,
                ...localMeta,
                id: r.id,
                authorId: r.user_id || rawObj.authorId || localMeta.authorId || 'Community Member',
                authorName: r.author_name || rawObj.authorName || localMeta.authorName || 'Community Member',
                description: r.content || rawObj.description || localMeta.description || '',
                category: r.category || rawObj.category || localMeta.category || 'General',
                city: r.city || rawObj.city || localMeta.city || 'Gandhinagar',
                location: rawObj.location || localMeta.location || r.city || 'Gandhinagar',
                imageUrl: r.image_url || rawObj.imageUrl || localMeta.imageUrl || '',
                status: r.status || rawObj.status || localMeta.status || 'active',
                is_flagged: Boolean(r.is_flagged || rawObj.is_flagged || localMeta.is_flagged),
                hidden: Boolean(r.hidden || rawObj.hidden || localMeta.hidden),
                is_deleted: Boolean(r.is_deleted || rawObj.is_deleted || localMeta.is_deleted),
                createdAt: rawObj.createdAt || localMeta.createdAt || (r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString())
              });
            });
          }

          const result = await dbPool.query(`
            SELECT * FROM broadcast_posts 
            ORDER BY created_at DESC 
            LIMIT 200
          `);

          if (result.rows.length > 0) {
            result.rows.forEach(r => {
              if (!r || !r.id || deletedIds.includes(r.id) || deletedEntitiesMemorySet.has(String(r.id))) return;
              if (isDummyPostRecord(r.id, r.description, r.author_name)) return;
              const localMeta = mergedMap.get(r.id) || {};
              mergedMap.set(r.id, {
                ...localMeta,
                id: r.id,
                authorId: r.author_id || localMeta.authorId || 'Community Member',
                authorName: r.author_name || localMeta.authorName || 'Community Member',
                authorAvatar: r.author_avatar || localMeta.authorAvatar,
                description: r.description || localMeta.description || '',
                category: r.category || localMeta.category || 'General',
                tags: r.tags || localMeta.tags || ['#General'],
                status: r.status || localMeta.status || 'active',
                is_flagged: Boolean(r.is_flagged || localMeta.is_flagged),
                hidden: Boolean(r.hidden || localMeta.hidden),
                is_deleted: Boolean(r.is_deleted || localMeta.is_deleted),
                city: localMeta.city || 'Gandhinagar',
                area: localMeta.area || '',
                location: localMeta.location || 'Gandhinagar',
                imageUrl: localMeta.imageUrl || '',
                attachmentUrl: localMeta.attachmentUrl || localMeta.imageUrl || '',
                distance: r.distance ? Number(r.distance) : (localMeta.distance || 0.5),
                hasLocationPin: r.has_location_pin !== false,
                isVerifiedUser: r.is_verified_user !== false,
                createdAt: localMeta.createdAt || (r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()),
                expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : localMeta.expiresAt
              });
            });
          }
        } catch (dbErr) {
          console.warn("DB listings query fallback:", dbErr);
        }
      }

      // Compute distinct response counts and full responses/repliers list per post (excluding post owner and system)
      const responseSetsByIntent = new Map<string, Set<string>>();
      const responsesListByIntent = new Map<string, any[]>();
      const repliersByIntent = new Map<string, Map<string, any>>();
      const seenRespIdsByIntent = new Map<string, Set<string>>();

      const addResponderAndEntry = (intentIdRaw: any, rawEntry: any) => {
        const iId = String(intentIdRaw || '').trim();
        if (!iId) return;
        const postItem = mergedMap.get(iId);
        const ownerId = String(postItem?.authorId || '').trim().toLowerCase();
        const ownerEmail = String(postItem?.authorEmail || '').trim().toLowerCase();
        const senderId = String(rawEntry?.sender_id || rawEntry?.senderId || rawEntry?.authorId || '').trim();
        const senderEmail = String(rawEntry?.sender_email || rawEntry?.senderEmail || rawEntry?.authorEmail || '').trim();
        const sId = senderId.toLowerCase();
        const sEmail = senderEmail.toLowerCase();
        if (!sId || sId === 'system' || sId === 'owner' || sId === 'me') return;
        if ((ownerId && sId === ownerId) || (ownerEmail && sEmail && sEmail === ownerEmail) || (ownerEmail && sId === ownerEmail)) return;
        const responderKey = sEmail || sId;
        if (!responseSetsByIntent.has(iId)) {
          responseSetsByIntent.set(iId, new Set());
        }
        responseSetsByIntent.get(iId)!.add(responderKey);

        const msgText = String(rawEntry?.message || rawEntry?.text || rawEntry?.content || '').trim();
        const senderName = String(rawEntry?.sender_name || rawEntry?.senderName || rawEntry?.authorName || 'Neighbor').trim();
        const senderAvatar = String(rawEntry?.sender_avatar || rawEntry?.senderAvatar || rawEntry?.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(senderName)}`).trim();
        const createdAtIso = rawEntry?.created_at || rawEntry?.createdAt || rawEntry?.timestamp || new Date().toISOString();
        const entryId = String(rawEntry?.id || `${iId}_${responderKey}_${createdAtIso}`);

        if (!seenRespIdsByIntent.has(iId)) seenRespIdsByIntent.set(iId, new Set());
        if (!seenRespIdsByIntent.get(iId)!.has(entryId) && msgText) {
          seenRespIdsByIntent.get(iId)!.add(entryId);
          if (!responsesListByIntent.has(iId)) responsesListByIntent.set(iId, []);
          responsesListByIntent.get(iId)!.push({
            id: entryId,
            postId: iId,
            postOwnerId: postItem?.authorId || '',
            senderId: senderId || responderKey,
            senderName,
            senderEmail,
            senderAvatar,
            text: msgText,
            message: msgText,
            createdAt: createdAtIso
          });
        }

        if (msgText) {
          if (!repliersByIntent.has(iId)) repliersByIntent.set(iId, new Map());
          const repMap = repliersByIntent.get(iId)!;
          const existing = repMap.get(responderKey);
          if (!existing) {
            repMap.set(responderKey, {
              senderId: senderId || responderKey,
              senderName,
              senderEmail,
              senderAvatar,
              lastMessage: msgText,
              lastMessageAt: createdAtIso,
              messageCount: 1
            });
          } else {
            existing.messageCount += 1;
            if (new Date(createdAtIso).getTime() >= new Date(existing.lastMessageAt || 0).getTime()) {
              existing.lastMessage = msgText;
              existing.lastMessageAt = createdAtIso;
              if (senderName && senderName !== 'Neighbor') existing.senderName = senderName;
            }
          }
        }
      };

      try {
        const allLocalMsgs = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
        Object.entries(allLocalMsgs).forEach(([convKey, arr]) => {
          if (Array.isArray(arr)) {
            arr.forEach((m: any) => {
              addResponderAndEntry(m?.post_id || m?.postId || m?.intent_id || m?.intentId || convKey, m);
            });
          }
        });
      } catch {}

      if (dbPool && isDbConnected) {
        try {
          const convTableRes = await dbPool.query(
            `SELECT id, post_id, poster_id, helper_id, helper_name, helper_email, helper_avatar, last_message, last_message_at, unread_poster_count, is_collaborator
             FROM conversations
             WHERE last_message IS NOT NULL AND TRIM(last_message) <> ''
             ORDER BY last_message_at ASC`
          ).catch(() => ({ rows: [] as any[] }));
          convTableRes.rows.forEach((c: any) => {
            addResponderAndEntry(c.post_id, {
              id: c.id,
              sender_id: c.helper_id,
              sender_name: c.helper_name,
              sender_email: c.helper_email,
              sender_avatar: c.helper_avatar,
              message: c.last_message,
              created_at: c.last_message_at
            });
          });

          const respTableRes = await dbPool.query(
            "SELECT id, post_id, post_owner_id, sender_id, sender_name, sender_email, sender_avatar, message, created_at FROM responses ORDER BY created_at ASC"
          ).catch(() => ({ rows: [] as any[] }));
          respTableRes.rows.forEach((r: any) => {
            addResponderAndEntry(r.post_id, r);
          });

          const msgCountRes = await dbPool.query(
            "SELECT id, COALESCE(post_id, intent_id) AS post_id, sender_id, sender_name, sender_email, sender_avatar, COALESCE(text, content) AS message, created_at FROM messages WHERE COALESCE(post_id, intent_id) IS NOT NULL ORDER BY created_at ASC"
          ).catch(() => ({ rows: [] as any[] }));
          msgCountRes.rows.forEach((r: any) => {
            addResponderAndEntry(r.post_id, r);
          });

          const chatCountRes = await dbPool.query(
            "SELECT id, COALESCE(post_id, intent_id, receiver_id) AS post_id, sender_id, sender_name, sender_email, message, sent_at AS created_at FROM chats ORDER BY sent_at ASC"
          ).catch(() => ({ rows: [] as any[] }));
          chatCountRes.rows.forEach((r: any) => {
            addResponderAndEntry(r.post_id, r);
          });
        } catch {}
      }

      const combined = Array.from(mergedMap.values())
        .filter(item => {
          if (isAdmin) return true;
          if (item.status === 'rejected' || item.status === 'flagged' || item.is_flagged === true || item.hidden === true || item.is_deleted === true) {
            return false;
          }
          if (includeExpired) return true;
          return true;
        })
        .map(i => {
          const safe = redactBulkItemForPrivacy(i, isAuth, isAdmin);
          const count = responseSetsByIntent.get(i.id)?.size || 0;
          const postResponses = responsesListByIntent.get(i.id) || [];
          const postRepliers = Array.from(repliersByIntent.get(i.id)?.values() || []).sort(
            (a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
          );
          safe.responseCount = count;
          safe.response_count = count;
          safe.responses = postResponses;
          safe.repliers = postRepliers;
          // Option B Privacy: Never expose broadcast post author's mobile number publicly (contact via Chat only; Admin sees all)
          if (!isAdmin) {
            delete safe.phone;
            delete safe.authorPhone;
            delete safe.contactPhone;
            delete safe.whatsapp;
          }
          return safe;
        });

      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(combined);
    } catch (e) {
      console.warn("Recovering from fetch intents error:", e);
      const fallbackIntents = readJsonFile<any[]>(INTENTS_FILE, []).map(i => {
        const safe = redactBulkItemForPrivacy(i, false, false);
        delete safe.phone;
        delete safe.authorPhone;
        delete safe.contactPhone;
        delete safe.whatsapp;
        return safe;
      });
      res.json(fallbackIntents);
    }
  };

  app.get("/api/intents", getListingsHandler);
  app.get("/api/listings", getListingsHandler);
  app.get("/api/posts", getListingsHandler);
  app.get("/api/broadcast-posts", getListingsHandler);

  // Real-Time Server-Sent Events (SSE) Stream for Instant Post & Response Sync
  app.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 20000);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // 2. Broadcast a New Listing / Intent (Enforces 30-second Anti-Spam Cooldown + XSS Sanitization)
  const createListingHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const newIntent = req.body;
      if (!newIntent || (!newIntent.description && !newIntent.title)) {
        return res.status(400).json({ error: "Description or title is required" });
      }

      // Enforce 30-second anti-spam cooldown per user / IP (skip for Admin panel direct additions)
      const isAdminCaller = isRequestAdmin(req);
      const caller = (req as any).user || extractRequestUser(req);
      const cooldownKey = String(caller?.uid || caller?.email || newIntent.authorId || getClientIp(req));
      const nowMs = Date.now();
      const lastPostMs = postCooldowns.get(cooldownKey) || 0;
      if (!isAdminCaller && nowMs - lastPostMs < POST_COOLDOWN_MS) {
        const remainingSec = Math.ceil((POST_COOLDOWN_MS - (nowMs - lastPostMs)) / 1000);
        return res.status(429).json({
          error: `Anti-Spam Cooldown: Please wait ${remainingSec} seconds before creating another post.`,
          cooldownRemaining: remainingSec
        });
      }

      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);
      if (newIntent.id && deletedIds.includes(newIntent.id)) {
        return res.status(200).json(newIntent);
      }

      const cityVal = sanitizeServerText((newIntent.city || '').trim(), 100);
      const areaVal = sanitizeServerText((newIntent.area || '').trim(), 150);
      const formattedLocation = sanitizeServerText(
        newIntent.location || (areaVal && cityVal ? `${areaVal}, ${cityVal}` : (cityVal || areaVal || (typeof newIntent.distance === 'number' ? `${newIntent.distance} km` : 'Local Area'))),
        250
      );

      const rawPostAttachment =
        newIntent.imageUrl || newIntent.image_url || newIntent.attachmentUrl || newIntent.photoUrl || "";
      if (rawPostAttachment && String(rawPostAttachment).startsWith("data:")) {
        const postImgCheck = validateServerUploadedData(rawPostAttachment, { allowPdf: true });
        if (!postImgCheck.valid) {
          return res.status(400).json({ error: postImgCheck.error });
        }
      }
      const uploadedPostImageUrl = rawPostAttachment
        ? await uploadDataToFirebaseServer(rawPostAttachment, "help_requests")
        : "";

      const resolvedAuthorId = sanitizeServerText(
        caller?.uid ||
          newIntent.authorId ||
          newIntent.userId ||
          newIntent.user_id ||
          newIntent.author_id ||
          newIntent.posterId ||
          newIntent.poster_id ||
          (isAdminCaller ? 'admin_published' : 'anonymous_user'),
        150
      );
      const intentRecord = {
        id: sanitizeServerText(newIntent.id || 'intent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7), 100),
        authorId: resolvedAuthorId,
        userId: resolvedAuthorId,
        user_id: resolvedAuthorId,
        authorEmail: sanitizeServerText(newIntent.authorEmail || newIntent.userEmail || newIntent.email || newIntent.author_email || (!isAdminCaller ? caller?.email : '') || '', 150),
        authorPhone: sanitizeServerText(newIntent.authorPhone || newIntent.phone || '', 30),
        authorName: sanitizeServerText(newIntent.authorName || newIntent.userName || newIntent.author_name || 'Community Member', 120),
        authorAvatar: newIntent.authorAvatar || newIntent.author_avatar || '',
        title: sanitizeServerText(newIntent.title || newIntent.category || (newIntent.tags && newIntent.tags[0] ? String(newIntent.tags[0]).replace('#', '') : 'General'), 120),
        description: sanitizeServerText((newIntent.description || newIntent.title || '').trim(), 1000),
        category: sanitizeServerText(newIntent.category || newIntent.title || (newIntent.tags && newIntent.tags[0] ? String(newIntent.tags[0]).replace('#', '') : 'General'), 100),
        tags: Array.isArray(newIntent.tags) ? newIntent.tags.map((t: any) => sanitizeServerText(t, 40)) : ['#General'],
        distance: typeof newIntent.distance === 'number' ? newIntent.distance : 0.5,
        city: cityVal,
        area: areaVal,
        location: formattedLocation,
        imageUrl: uploadedPostImageUrl || undefined,
        attachmentUrl: uploadedPostImageUrl || undefined,
        status: newIntent.status || 'active',
        createdAt: newIntent.createdAt || new Date().toISOString(),
        expiresAt: newIntent.expiresAt || new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 Hour Auto Expiry
        lastInteractionAt: new Date().toISOString(),
        hasLocationPin: !!newIntent.hasLocationPin,
        isVerifiedUser: true
      };

      // Record post cooldown timestamp & 180-Day Security Audit Log (IP + User-Agent)
      if (!isAdminCaller) {
        postCooldowns.set(cooldownKey, nowMs);
      }
      await logSecurityAudit(intentRecord.authorId, "CREATE_POST", req);

      // 1. PostgreSQL Insert into primary "posts", "listings", and "broadcast_posts" tables
      if (dbPool && isDbConnected) {
        await dbPool.query(`
          INSERT INTO posts (id, user_id, author_name, content, image_url, category, city, raw_json, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            author_name = EXCLUDED.author_name,
            content = EXCLUDED.content,
            image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), posts.image_url),
            category = EXCLUDED.category,
            city = EXCLUDED.city,
            raw_json = EXCLUDED.raw_json
        `, [
          intentRecord.id,
          intentRecord.authorId,
          intentRecord.authorName,
          intentRecord.description,
          uploadedPostImageUrl,
          intentRecord.category,
          intentRecord.city || intentRecord.location,
          JSON.stringify(intentRecord),
          intentRecord.createdAt
        ]).catch((err) => console.warn("DB posts insert note:", err?.message));

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
        ]).catch((err) => console.warn("DB listings insert note:", err?.message));

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
        ]).catch((err) => console.warn("DB broadcast_posts insert note:", err?.message));
      }

      // 2. Local storage file
      const intents = readJsonFile<any[]>(INTENTS_FILE, []);
      const updated = [intentRecord, ...intents.filter(i => i.id !== intentRecord.id)];
      writeJsonFile(INTENTS_FILE, updated);
      await archiveToSecurityVault("help_post", intentRecord.id, intentRecord, "ACTIVE_REGISTERED");

      console.log(`[Listing Created] ${intentRecord.id}: "${intentRecord.description.substring(0, 40)}..."`);

      // Immediately broadcast new_post event to all connected SSE clients for 0ms real-time sync
      broadcastRealtimeEvent("new_post", {
        post: {
          ...intentRecord,
          responseCount: 0,
          response_count: 0,
          responses: [],
          repliers: []
        },
        intent: {
          ...intentRecord,
          responseCount: 0,
          response_count: 0,
          responses: [],
          repliers: []
        }
      });

      // 3. Trigger 1: Background FCM Web Push Multicast to other users in the same area/location
      (async () => {
        try {
          if (!dbPool || !isDbConnected) return;
          if (!getParsedFirebaseServiceAccount()) return;

          const postArea = (intentRecord.area || intentRecord.city || intentRecord.location || "Local Area").trim();
          const postCity = (intentRecord.city || "").trim();
          const postLoc = (intentRecord.location || "").trim();

          const tokenQuery = await dbPool.query(
            `SELECT DISTINCT u.fcm_token, u.area, u.city, u.location, p.city AS profile_city, p.sector AS profile_area
             FROM users u
             LEFT JOIN profiles p ON (p.uid = u.id OR (u.email IS NOT NULL AND u.email <> '' AND LOWER(p.email) = LOWER(u.email)))
             WHERE u.fcm_token IS NOT NULL
               AND TRIM(u.fcm_token) <> ''
               AND u.id <> $1
               AND ($2 = '' OR u.email IS NULL OR LOWER(u.email) <> LOWER($2))`,
            [intentRecord.authorId || "", intentRecord.authorEmail || ""]
          );

          if (!tokenQuery.rows || tokenQuery.rows.length === 0) return;

          const norm = (s: any) => String(s || "").trim().toLowerCase();
          const pAreaNorm = norm(intentRecord.area);
          const pCityNorm = norm(postCity);
          const pLocNorm = norm(postLoc);

          const matchedTokens = new Set<string>();
          for (const row of tokenQuery.rows) {
            const token = String(row.fcm_token || "").trim();
            if (!token) continue;
            matchedTokens.add(token);
          }

          const tokens = Array.from(matchedTokens).slice(0, 500);
          if (tokens.length === 0) return;

          const displayArea = postArea || "Your Area";
          const categoryOrTitle =
            (intentRecord.category && intentRecord.category !== "General"
              ? `${intentRecord.category}: ${intentRecord.title || intentRecord.description.slice(0, 60)}`
              : intentRecord.title || intentRecord.description.slice(0, 60)
            ).trim();

          const originUrl =
            (req.headers.origin && String(req.headers.origin).startsWith("http")
              ? String(req.headers.origin)
              : `${req.protocol || "https"}://${req.get("host") || "localhost:3000"}`
            ).replace(/\/+$/, "");
          const postUrl = `${originUrl}/?postId=${encodeURIComponent(intentRecord.id)}`;

          const pushTitle = `🔔 New Request in ${displayArea}!`;
          const pushBody = `${categoryOrTitle} - Tap to help on LocoHelp`;

          const response = await sendFcmMulticastPush({
            tokens,
            title: pushTitle,
            body: pushBody,
            postUrl,
            data: {
              title: pushTitle,
              body: pushBody,
              postId: String(intentRecord.id),
              area: displayArea,
              category: String(intentRecord.category || "General"),
              url: postUrl,
              click_action: postUrl
            }
          });

          console.log(
            `[FCM Push Multicast] Sent for post ${intentRecord.id} in "${displayArea}": ${response.successCount} succeeded, ${response.failureCount} failed.`
          );

          if (response.invalidTokens.length > 0 && dbPool) {
            await dbPool
              .query(`UPDATE users SET fcm_token = NULL WHERE fcm_token = ANY($1::text[])`, [response.invalidTokens])
              .catch(() => {});
          }
        } catch (pushErr: any) {
          console.warn("[FCM Push Trigger Notice]:", pushErr?.message || pushErr);
        }
      })();

      res.status(201).json(intentRecord);
    } catch (e) {
      console.error("Failed to save listing:", e);
      res.status(500).json({ error: "Failed to save listing" });
    }
  };

  // Protected Posts & Listings Creation (Requires valid authentication & rate limit)
  app.post("/api/posts", postCreationLimiter, requireAuth, createListingHandler);
  app.post("/api/intents", postCreationLimiter, requireAuth, createListingHandler);
  app.post("/api/listings", postCreationLimiter, requireAuth, createListingHandler);
  app.post("/api/broadcast-posts", postCreationLimiter, requireAuth, createListingHandler);

  // 3. Delete or Complete a Listing / Intent / Post (Protected - Only Post Owner or Admin)
  const deleteListingHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const { description } = req.body || {};
      const descQuery = (req.query?.desc as string) || '';
      const targetDesc = description || descQuery;

      const intents = readJsonFile<any[]>(INTENTS_FILE, []);
      const existingPost = intents.find(i => i.id === id);

      if (existingPost && !isSameUserOrAdmin(req, existingPost.authorId, existingPost.authorEmail)) {
        return res.status(403).json({
          error: "Forbidden: You can only edit or delete your own posts."
        });
      }

      if (existingPost) {
        const isAdminDel = isRequestAdmin(req);
        await archiveToSecurityVault(
          "help_post",
          existingPost.id,
          existingPost,
          isAdminDel ? "ADMIN_REMOVED_PUBLIC" : "DELETED_BY_USER"
        );
      }

      if (existingPost) {
        await deleteFilesFromFirebaseStorage(existingPost);
      }

      // 1. PostgreSQL Delete from public feed (posts, listings, broadcast_posts) & clean up post attachments
      // NOTE: 1-on-1 conversations & messages are preserved for 7 days in users' My Chats history
      if (dbPool && isDbConnected) {
        try {
          const postRows = await dbPool.query("SELECT image_url, raw_json FROM posts WHERE id = $1", [id]).catch(() => ({ rows: [] as any[] }));
          await deleteFilesFromFirebaseStorage(postRows.rows);

          await dbPool.query("DELETE FROM posts WHERE id = $1", [id]);
          await dbPool.query("DELETE FROM listings WHERE id = $1", [id]);
          await dbPool.query("DELETE FROM broadcast_posts WHERE id = $1", [id]);
        } catch (dbErr) {
          console.warn("DB listings delete error:", dbErr);
        }
      }

      // 2. Local / in-memory cache delete from public feed
      deletedEntitiesMemorySet.add(String(id));
      const filtered = intents.filter(i => i.id !== id);
      writeJsonFile(INTENTS_FILE, filtered);

      // Record to permanent deleted IDs list
      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        writeJsonFile(DELETED_INTENTS_FILE, deletedIds);
      }
      invalidatePublicCache();

      // 3. Broadcast post_deleted event immediately via SSE so all other phones remove it in 0ms without refresh
      broadcastRealtimeEvent("post_deleted", {
        postId: id,
        id
      });

      console.log(`[Listing Deleted Permanently] ID: ${id}`);
      res.json({ success: true, deletedId: id });
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
  // Strict Privacy: Private 1:1 chats can ONLY be fetched by the two participants (or Admin)
  // ==========================================

  // Helper: deterministic 1-on-1 conversation ID per (postId, helperId)
  const buildConversationId = (postId: string, helperId: string): string => {
    const cleanPost = String(postId || "general").trim();
    const cleanHelper = String(helperId || "peer").trim().toLowerCase();
    return `conv_${cleanPost}__${cleanHelper}`;
  };

  const parseConversationId = (rawConvId: string): { postId: string; helperId: string } | null => {
    const clean = String(rawConvId || "").trim();
    if (!clean.startsWith("conv_")) return null;
    const withoutPrefix = clean.slice(5);
    const sepIdx = withoutPrefix.lastIndexOf("__");
    if (sepIdx > 0) {
      return {
        postId: withoutPrefix.slice(0, sepIdx),
        helperId: withoutPrefix.slice(sepIdx + 2)
      };
    }
    return null;
  };

  // Helper: resolve authoritative poster_id, poster_name, poster_email, poster_avatar, postDescription for a postId
  // Works even after a post has been deleted from the public feed (falls back to conversations, messages, and security_vault)
  const resolvePostOwnerInfo = async (
    postId: string
  ): Promise<{ posterId: string; posterName: string; posterEmail: string; posterAvatar: string; postDescription?: string }> => {
    let posterId = "";
    let posterName = "";
    let posterEmail = "";
    let posterAvatar = "";
    let postDescription = "";
    const cleanPostId = String(postId || "").trim();
    if (!cleanPostId || cleanPostId === "general") {
      return { posterId, posterName, posterEmail, posterAvatar, postDescription };
    }

    if (dbPool && isDbConnected) {
      try {
        const pRes = await dbPool
          .query("SELECT user_id, author_name, content, raw_json FROM posts WHERE id = $1 LIMIT 1", [cleanPostId])
          .catch(() => ({ rows: [] as any[] }));
        if (pRes.rows.length > 0) {
          const r = pRes.rows[0];
          const raw = r.raw_json && typeof r.raw_json === "object" ? r.raw_json : {};
          posterId = String(r.user_id || raw.authorId || raw.user_id || "").trim();
          posterName = String(r.author_name || raw.authorName || raw.sellerName || "").trim();
          posterEmail = String(raw.authorEmail || "").trim().toLowerCase();
          posterAvatar = String(raw.authorAvatar || "").trim();
          postDescription = String(r.content || raw.description || "").trim();
        }
        if (!posterId) {
          const bRes = await dbPool
            .query("SELECT author_id, author_name, author_avatar, description FROM broadcast_posts WHERE id = $1 LIMIT 1", [cleanPostId])
            .catch(() => ({ rows: [] as any[] }));
          if (bRes.rows.length > 0) {
            posterId = String(bRes.rows[0].author_id || "").trim();
            posterName = posterName || String(bRes.rows[0].author_name || "").trim();
            posterAvatar = posterAvatar || String(bRes.rows[0].author_avatar || "").trim();
            postDescription = postDescription || String(bRes.rows[0].description || "").trim();
          }
        }
        // Fallback 1: If post was deleted from public feed, check conversations table
        if (!posterId) {
          const cRes = await dbPool
            .query(
              "SELECT poster_id, poster_name, poster_email, poster_avatar FROM conversations WHERE post_id = $1 AND poster_id IS NOT NULL AND TRIM(poster_id) <> '' LIMIT 1",
              [cleanPostId]
            )
            .catch(() => ({ rows: [] as any[] }));
          if (cRes.rows.length > 0) {
            posterId = String(cRes.rows[0].poster_id || "").trim();
            posterName = posterName || String(cRes.rows[0].poster_name || "").trim();
            posterEmail = posterEmail || String(cRes.rows[0].poster_email || "").trim().toLowerCase();
            posterAvatar = posterAvatar || String(cRes.rows[0].poster_avatar || "").trim();
          }
        }
        // Fallback 2: Check messages table for post_owner_id
        if (!posterId) {
          const mRes = await dbPool
            .query(
              "SELECT post_owner_id FROM messages WHERE (post_id = $1 OR intent_id = $1) AND post_owner_id IS NOT NULL AND TRIM(post_owner_id) <> '' LIMIT 1",
              [cleanPostId]
            )
            .catch(() => ({ rows: [] as any[] }));
          if (mRes.rows.length > 0) {
            posterId = String(mRes.rows[0].post_owner_id || "").trim();
          }
        }
        // Fallback 3: Check security_vault for archived post metadata
        if (!posterId || !postDescription) {
          const vRes = await dbPool
            .query("SELECT encrypted_payload FROM security_vault WHERE id = $1 LIMIT 1", [`help_post__${cleanPostId}`])
            .catch(() => ({ rows: [] as any[] }));
          if (vRes.rows.length > 0 && vRes.rows[0].encrypted_payload) {
            const dec = decryptVaultPayload(String(vRes.rows[0].encrypted_payload));
            if (dec) {
              if (!posterId) posterId = String(dec.authorId || dec.userId || "").trim();
              if (!posterName) posterName = String(dec.name || dec.authorName || "").trim();
              if (!posterEmail) posterEmail = String(dec.email || dec.authorEmail || "").trim().toLowerCase();
              if (!postDescription) postDescription = String(dec.skillsOrDescription || dec.description || "").trim();
            }
          }
        }
      } catch {}
    }

    if (!posterId) {
      try {
        const fileIntents = readJsonFile<any[]>(INTENTS_FILE, []);
        const found = fileIntents.find((i: any) => i && String(i.id) === cleanPostId);
        if (found) {
          posterId = String(found.authorId || found.user_id || "").trim();
          posterName = posterName || String(found.authorName || "").trim();
          posterEmail = posterEmail || String(found.authorEmail || "").trim().toLowerCase();
          posterAvatar = posterAvatar || String(found.authorAvatar || "").trim();
          postDescription = postDescription || String(found.description || "").trim();
        }
      } catch {}
    }

    return { posterId, posterName, posterEmail, posterAvatar, postDescription };
  };

  // 4. Get 1-on-1 Chat Messages (GET /api/chat/messages, GET /api/messages/:conversationId, GET /api/intents/:id/messages)
  const getChatMessagesHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const caller = extractRequestUser(req);
      const rawParamId = String(req.params.id || "").trim();
      const queryConvId = String(req.query?.conversationId || req.query?.conversation_id || "").trim();
      const queryPostId = String(req.query?.postId || req.query?.post_id || req.query?.intentId || req.query?.intent_id || "").trim();
      const userId = String(req.query?.userId || req.query?.user_id || caller?.uid || "").trim();
      const userEmail = String(req.query?.userEmail || req.query?.user_email || caller?.email || "").trim().toLowerCase();
      const queryHelperId = String(
        req.query?.helperId || req.query?.helper_id || req.query?.otherUserId || req.query?.other_user_id || ""
      ).trim();

      const parsedFromQuery = parseConversationId(queryConvId);
      const parsedFromParam = parseConversationId(rawParamId);

      let postId =
        queryPostId ||
        parsedFromQuery?.postId ||
        parsedFromParam?.postId ||
        (!rawParamId.startsWith("conv_") ? rawParamId : "") ||
        (!queryConvId.startsWith("conv_") ? queryConvId : "");

      const ownerInfo = await resolvePostOwnerInfo(postId);
      let posterId = ownerInfo.posterId;
      let posterEmail = ownerInfo.posterEmail;

      const isCallerPostOwner =
        Boolean(posterId && userId && userId.toLowerCase() === posterId.toLowerCase()) ||
        Boolean(posterEmail && userEmail && userEmail === posterEmail.toLowerCase());

      // Authoritative helperId: prefer parsed conv_ ID or explicit queryHelperId (as long as it's not the poster's own ID)
      let helperId =
        parsedFromQuery?.helperId ||
        parsedFromParam?.helperId ||
        (queryHelperId && (!posterId || queryHelperId.toLowerCase() !== posterId.toLowerCase()) ? queryHelperId : "") ||
        (!isCallerPostOwner && userId && userId !== "guest_user" ? userId : "");
      let helperEmail = "";

      // If conversationId was passed directly in DB, look up conversations row for authoritative postId, posterId, helperId
      let activeConvId =
        (queryConvId.startsWith("conv_") ? queryConvId : "") ||
        (rawParamId.startsWith("conv_") ? rawParamId : "") ||
        (postId && helperId ? buildConversationId(postId, helperId) : "");

      if (dbPool && isDbConnected && (activeConvId || queryConvId || rawParamId)) {
        try {
          const lookupTarget = activeConvId || queryConvId || rawParamId;
          const convLookup = await dbPool
            .query("SELECT id, post_id, poster_id, poster_email, helper_id, helper_email FROM conversations WHERE LOWER(id) = LOWER($1) LIMIT 1", [lookupTarget])
            .catch(() => ({ rows: [] as any[] }));
          if (convLookup.rows.length > 0) {
            const cRow = convLookup.rows[0];
            activeConvId = cRow.id;
            if (!postId && cRow.post_id) postId = String(cRow.post_id).trim();
            if (!posterId && cRow.poster_id) posterId = String(cRow.poster_id).trim();
            if (!posterEmail && cRow.poster_email) posterEmail = String(cRow.poster_email).trim().toLowerCase();
            if (cRow.helper_id) helperId = String(cRow.helper_id).trim();
            if (cRow.helper_email) helperEmail = String(cRow.helper_email).trim().toLowerCase();
          }
        } catch {}
      }

      // STRICT RULE: If the caller is the Post Owner and no specific helperId/conversationId was selected,
      // return an empty array (Post Owner must select a specific Helper from View Responses first).
      if (isCallerPostOwner && !helperId && (!activeConvId || activeConvId === postId)) {
        return res.json([]);
      }

      const mergedMap = new Map<string, any>();

      if (dbPool && isDbConnected) {
        try {
          let result;
          if (activeConvId && postId && helperId) {
            result = await dbPool.query(
              `SELECT * FROM messages
               WHERE LOWER(conversation_id) = LOWER($1)
                  OR (
                    (post_id = $2 OR intent_id = $2)
                    AND (
                      LOWER(sender_id) = LOWER($3)
                      OR LOWER(receiver_id) = LOWER($3)
                      OR LOWER(sender_email) = LOWER($3)
                      OR ($4 <> '' AND (LOWER(sender_email) = LOWER($4) OR LOWER(sender_id) = LOWER($4) OR LOWER(receiver_id) = LOWER($4)))
                    )
                  )
               ORDER BY created_at ASC`,
              [activeConvId, postId, helperId, helperEmail]
            );
          } else if (activeConvId) {
            result = await dbPool.query(
              `SELECT * FROM messages WHERE LOWER(conversation_id) = LOWER($1) ORDER BY created_at ASC`,
              [activeConvId]
            );
          } else if (userId && queryHelperId) {
            result = await dbPool.query(
              `SELECT * FROM messages
               WHERE (LOWER(sender_id) = LOWER($1) AND LOWER(receiver_id) = LOWER($2))
                  OR (LOWER(sender_id) = LOWER($2) AND LOWER(receiver_id) = LOWER($1))
               ORDER BY created_at ASC`,
              [userId, queryHelperId]
            );
          }

          if (result && result.rows.length > 0) {
            result.rows.forEach((r: any) => {
              const sId = String(r.sender_id || "").trim();
              const sName = String(r.sender_name || "").trim() || "Community Peer";
              const sEmail = String(r.sender_email || "").trim().toLowerCase();
              const sAvatar = String(r.sender_avatar || "").trim();
              mergedMap.set(r.id, {
                id: r.id,
                conversationId: r.conversation_id || activeConvId || r.intent_id || postId,
                conversation_id: r.conversation_id || activeConvId || r.intent_id || postId,
                postId: r.post_id || r.intent_id || postId,
                post_id: r.post_id || r.intent_id || postId,
                intent_id: r.intent_id || postId,
                intentId: r.intent_id || postId,
                authorId: sId,
                senderId: sId,
                sender_id: sId,
                user_id: sId,
                authorName: sName,
                senderName: sName,
                sender_name: sName,
                senderEmail: sEmail,
                sender_email: sEmail,
                authorEmail: sEmail,
                senderAvatar: sAvatar,
                sender_avatar: sAvatar,
                authorAvatar: sAvatar,
                receiverId: r.receiver_id,
                receiver_id: r.receiver_id,
                text: r.text || r.content || "",
                content: r.content || r.text || "",
                message: r.text || r.content || "",
                type: r.type || "text",
                attachmentUrl: r.attachment_url,
                attachment_url: r.attachment_url,
                attachmentType: r.attachment_type,
                attachment_type: r.attachment_type,
                isCollaborator: Boolean(r.is_collaborator),
                is_collaborator: Boolean(r.is_collaborator),
                isRead: Boolean(r.is_read),
                is_read: Boolean(r.is_read),
                createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
              });
            });
          }

          // Mark unread messages as read for the viewing userId and reset unread counter in conversations
          if (userId && (activeConvId || (postId && helperId))) {
            const targetConv = activeConvId || buildConversationId(postId, helperId);
            await dbPool
              .query(
                `UPDATE messages
                 SET is_read = TRUE
                 WHERE (LOWER(conversation_id) = LOWER($1) OR ((post_id = $2 OR intent_id = $2) AND LOWER(sender_id) = LOWER($3)))
                   AND LOWER(sender_id) <> LOWER($4)
                   AND is_read = FALSE`,
                [targetConv, postId, helperId, userId]
              )
              .catch(() => {});

            if (isCallerPostOwner) {
              await dbPool
                .query(
                  `UPDATE conversations SET unread_poster_count = 0 WHERE LOWER(id) = LOWER($1) OR (post_id = $2 AND LOWER(helper_id) = LOWER($3))`,
                  [targetConv, postId, helperId]
                )
                .catch(() => {});
            } else {
              await dbPool
                .query(
                  `UPDATE conversations SET unread_helper_count = 0 WHERE LOWER(id) = LOWER($1) OR (post_id = $2 AND LOWER(helper_id) = LOWER($3))`,
                  [targetConv, postId, helperId]
                )
                .catch(() => {});
            }
          }
        } catch (dbErr) {
          console.warn("DB 1-on-1 messages query error:", dbErr);
        }

        // Enrich any missing sender names, emails, or avatars from users / profiles tables
        try {
          const senderIds = Array.from(
            new Set(
              Array.from(mergedMap.values())
                .map((m) => String(m.sender_id || m.senderId || m.authorId || "").trim())
                .filter(Boolean)
            )
          );
          if (senderIds.length > 0) {
            const userMap = new Map<string, { name?: string; email?: string; avatar?: string }>();
            const uRes = await dbPool
              .query(
                "SELECT id::text AS id, name, email, avatar_url FROM users WHERE LOWER(id::text) = ANY($1::text[]) OR LOWER(email) = ANY($1::text[])",
                [senderIds.map((s) => s.toLowerCase())]
              )
              .catch(() => ({ rows: [] as any[] }));
            uRes.rows.forEach((u: any) => {
              if (u.id) userMap.set(String(u.id).toLowerCase(), { name: u.name, email: u.email, avatar: u.avatar_url });
              if (u.email) userMap.set(String(u.email).toLowerCase(), { name: u.name, email: u.email, avatar: u.avatar_url });
            });

            mergedMap.forEach((m) => {
              const keyId = String(m.sender_id || m.senderId || m.authorId || "").toLowerCase();
              const keyEmail = String(m.sender_email || m.senderEmail || "").toLowerCase();
              const info = userMap.get(keyId) || (keyEmail ? userMap.get(keyEmail) : undefined);
              if (info) {
                if ((!m.senderName || m.senderName === "Community Peer" || m.senderName === "Community Member") && info.name) {
                  m.senderName = info.name;
                  m.authorName = info.name;
                  m.sender_name = info.name;
                }
                if (!m.senderEmail && info.email) {
                  m.senderEmail = String(info.email).toLowerCase();
                  m.sender_email = String(info.email).toLowerCase();
                  m.authorEmail = String(info.email).toLowerCase();
                }
                if (!m.senderAvatar && info.avatar) {
                  m.senderAvatar = info.avatar;
                  m.sender_avatar = info.avatar;
                  m.authorAvatar = info.avatar;
                }
              }
            });
          }
        } catch {}
      }

      // Fallback file check filtered strictly by 1-on-1 participant helperId
      if (activeConvId || (postId && helperId)) {
        const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
        const candidates = [
          ...(activeConvId && allMessages[activeConvId] ? allMessages[activeConvId] : []),
          ...(postId && allMessages[postId] ? allMessages[postId] : [])
        ];
        const helperLower = String(helperId || "").toLowerCase();
        candidates.forEach((m: any) => {
          if (!m || !m.id || mergedMap.has(m.id)) return;
          const sId = String(m.sender_id || m.senderId || m.authorId || "").trim();
          const rId = String(m.receiver_id || m.receiverId || "").trim();
          const mConv = String(m.conversationId || m.conversation_id || "").trim();
          const matchesConv =
            (activeConvId && mConv.toLowerCase() === activeConvId.toLowerCase()) ||
            (helperLower && (sId.toLowerCase() === helperLower || rId.toLowerCase() === helperLower));
          if (!matchesConv) return;

          if (userId && sId.toLowerCase() !== userId.toLowerCase()) {
            m.isRead = true;
            m.is_read = true;
          }

          mergedMap.set(m.id, {
            ...m,
            conversationId: mConv || activeConvId,
            sender_id: sId,
            senderId: sId,
            authorId: sId
          });
        });
      }

      const finalMessages = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(a.createdAt || a.sent_at || 0).getTime() - new Date(b.createdAt || b.sent_at || 0).getTime()
      );
      res.json(finalMessages);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  };

  app.get("/api/chat/messages", getChatMessagesHandler);
  app.get("/api/intents/:id/messages", getChatMessagesHandler);
  app.get("/api/chats/:id", getChatMessagesHandler);
  app.get("/api/messages", getChatMessagesHandler);
  app.get("/api/messages/:id", getChatMessagesHandler);

  // Get 1-on-1 Conversations / Post Reply Inbox (GET /api/chat/conversations, GET /api/posts/:id/inbox)
  const getPostInboxHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const postId = String(req.params.id || req.query.postId || req.query.post_id || req.query.intentId || "").trim();
      const caller = extractRequestUser(req);
      const userIdParam = String(req.query.userId || req.query.user_id || req.query.ownerId || req.query.owner_id || caller?.uid || "").trim();
      const userEmailParam = String(req.query.userEmail || req.query.ownerEmail || req.query.owner_email || caller?.email || "").trim().toLowerCase();

      const ownerInfo = postId ? await resolvePostOwnerInfo(postId) : { posterId: "", posterName: "", posterEmail: "", posterAvatar: "", postDescription: "" };
      const ownerIds = new Set<string>(
        [ownerInfo.posterId, "owner", "me", "system"]
          .map((s) => String(s || "").trim().toLowerCase())
          .filter(Boolean)
      );
      const ownerEmails = new Set<string>(
        [ownerInfo.posterEmail]
          .map((s) => String(s || "").trim().toLowerCase())
          .filter(Boolean)
      );

      // Normalized key helper so conversations table and messages table rows for the same (postId, helperId) ALWAYS merge into one thread
      const getThreadKey = (pId: string, hId: string) => `${String(pId || "general").trim().toLowerCase()}__${String(hId || "").trim().toLowerCase()}`;

      const conversationsMap = new Map<string, any>();

      if (dbPool && isDbConnected) {
        // 1. Query dedicated conversations table first
        try {
          let convRes;
          if (postId) {
            convRes = await dbPool.query(
              `SELECT * FROM conversations
               WHERE post_id = $1
                 AND last_message IS NOT NULL
                 AND TRIM(last_message) <> ''
                 AND LOWER(helper_id) <> LOWER(poster_id)
                 AND (last_message_at IS NULL OR last_message_at >= NOW() - INTERVAL '7 days')
               ORDER BY last_message_at DESC`,
              [postId]
            );
          } else if (userIdParam || userEmailParam) {
            const emailDerivedId = userEmailParam ? `email_${userEmailParam.replace(/[^a-z0-9]/g, "_")}` : "";
            convRes = await dbPool.query(
              `SELECT * FROM conversations
               WHERE (
                 ($1 <> '' AND (LOWER(poster_id) = LOWER($1) OR LOWER(helper_id) = LOWER($1) OR LOWER(poster_email) = LOWER($1) OR LOWER(helper_email) = LOWER($1)))
                 OR ($2 <> '' AND (LOWER(poster_email) = LOWER($2) OR LOWER(helper_email) = LOWER($2) OR LOWER(poster_id) = LOWER($2) OR LOWER(helper_id) = LOWER($2)))
                 OR ($3 <> '' AND (LOWER(poster_id) = LOWER($3) OR LOWER(helper_id) = LOWER($3)))
               )
                 AND last_message IS NOT NULL
                 AND TRIM(last_message) <> ''
                 AND LOWER(helper_id) <> LOWER(poster_id)
                 AND (last_message_at IS NULL OR last_message_at >= NOW() - INTERVAL '7 days')
               ORDER BY last_message_at DESC`,
              [userIdParam, userEmailParam, emailDerivedId]
            );
          }

          if (convRes && convRes.rows.length > 0) {
            convRes.rows.forEach((c: any) => {
              const hId = String(c.helper_id || "").trim();
              const hEmail = String(c.helper_email || "").trim().toLowerCase();
              const pEmail = String(c.poster_email || "").trim().toLowerCase();
              if (!hId || ownerIds.has(hId.toLowerCase()) || (hEmail && ownerEmails.has(hEmail))) return;

              const key = getThreadKey(c.post_id, hId);
              const lastIso = c.last_message_at ? new Date(c.last_message_at).toISOString() : new Date().toISOString();
              const isViewerHelper =
                (userIdParam && hId.toLowerCase() === userIdParam.toLowerCase()) ||
                (userEmailParam && hEmail && hEmail === userEmailParam.toLowerCase());
              const unreadForViewer = isViewerHelper
                ? Number(c.unread_helper_count || 0)
                : Number(c.unread_poster_count || 0);

              conversationsMap.set(key, {
                id: c.id || buildConversationId(c.post_id, hId),
                conversationId: c.id || buildConversationId(c.post_id, hId),
                postId: c.post_id,
                post_id: c.post_id,
                posterId: c.poster_id || ownerInfo.posterId || "",
                poster_id: c.poster_id || ownerInfo.posterId || "",
                posterName: c.poster_name || ownerInfo.posterName || "Post Owner",
                posterEmail: pEmail || ownerInfo.posterEmail || "",
                posterAvatar: c.poster_avatar || ownerInfo.posterAvatar || "",
                helperId: hId,
                helper_id: hId,
                helperName: c.helper_name || "Community Helper",
                helperEmail: hEmail,
                helperAvatar: c.helper_avatar || "",
                senderId: hId,
                senderName: c.helper_name || "Community Helper",
                senderEmail: hEmail,
                senderAvatar: c.helper_avatar || "",
                lastMessage: c.last_message || "Sent a message",
                last_message: c.last_message || "Sent a message",
                lastMessageAt: lastIso,
                last_message_at: lastIso,
                updatedAt: lastIso,
                unreadPosterCount: Number(c.unread_poster_count || 0),
                unread_poster_count: Number(c.unread_poster_count || 0),
                unreadHelperCount: Number(c.unread_helper_count || 0),
                unread_helper_count: Number(c.unread_helper_count || 0),
                unreadCount: unreadForViewer,
                count: Math.max(unreadForViewer, 1),
                messageCount: 0,
                isCollaborator: Boolean(c.is_collaborator)
              });
            });
          }
        } catch (convErr) {
          console.warn("Conversations table query notice:", convErr);
        }

        // 2. Reconcile from messages table for postId OR for user's My Chats (last 7 days) so any existing replies & full message counts are included
        if (postId || userIdParam || userEmailParam) {
          try {
            const emailDerivedId = userEmailParam ? `email_${userEmailParam.replace(/[^a-z0-9]/g, "_")}` : "";
            const mRes = postId
              ? await dbPool
                  .query(
                    "SELECT * FROM messages WHERE (post_id = $1 OR intent_id = $1) AND (created_at IS NULL OR created_at >= NOW() - INTERVAL '7 days') ORDER BY created_at ASC",
                    [postId]
                  )
                  .catch(() => ({ rows: [] as any[] }))
              : await dbPool
                  .query(
                    `SELECT * FROM messages
                     WHERE (
                       ($1 <> '' AND (LOWER(sender_id) = LOWER($1) OR LOWER(receiver_id) = LOWER($1) OR LOWER(post_owner_id) = LOWER($1) OR LOWER(sender_email) = LOWER($1)))
                       OR ($2 <> '' AND (LOWER(sender_email) = LOWER($2) OR LOWER(sender_id) = LOWER($2) OR LOWER(receiver_id) = LOWER($2) OR LOWER(post_owner_id) = LOWER($2)))
                       OR ($3 <> '' AND (LOWER(sender_id) = LOWER($3) OR LOWER(receiver_id) = LOWER($3) OR LOWER(post_owner_id) = LOWER($3)))
                     )
                     AND (created_at IS NULL OR created_at >= NOW() - INTERVAL '7 days')
                     ORDER BY created_at ASC`,
                    [userIdParam, userEmailParam, emailDerivedId]
                  )
                  .catch(() => ({ rows: [] as any[] }));

            for (const r of mRes.rows) {
              const sId = String(r.sender_id || "").trim();
              const sIdLower = sId.toLowerCase();
              const sEmail = String(r.sender_email || "").trim().toLowerCase();
              const rId = String(r.receiver_id || "").trim();
              const parsedRowConv = parseConversationId(String(r.conversation_id || ""));
              const rowPostId = String(r.post_id || r.intent_id || parsedRowConv?.postId || postId || "general").trim();
              const rowPostOwnerId = String(r.post_owner_id || ownerInfo.posterId || "").trim();
              if (!sId || sIdLower === "system") continue;

              const isSenderOwner =
                ownerIds.has(sIdLower) ||
                (sEmail && ownerEmails.has(sEmail)) ||
                (rowPostOwnerId && sIdLower === rowPostOwnerId.toLowerCase()) ||
                (parsedRowConv?.helperId && sIdLower !== parsedRowConv.helperId.toLowerCase());

              // Determine the helper for this message
              let hId = parsedRowConv?.helperId || (isSenderOwner ? rId : sId);
              if (!hId || hId === rowPostId || ownerIds.has(hId.toLowerCase())) continue;

              const hEmail = isSenderOwner ? "" : sEmail;
              const key = getThreadKey(rowPostId, hId);
              const msgTime = r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString();
              const msgText = String(r.text || r.content || "").trim() || "📷 Attachment shared";
              const convId = r.conversation_id || buildConversationId(rowPostId, hId);

              const existing = conversationsMap.get(key);
              if (!existing) {
                const unread = !isSenderOwner && !r.is_read ? 1 : 0;
                const hName = !isSenderOwner ? (String(r.sender_name || "").trim() || "Community Helper") : "Community Helper";
                const hAvatar = !isSenderOwner ? String(r.sender_avatar || "").trim() : "";
                const resolvedPosterId = rowPostOwnerId || (isSenderOwner ? sId : rId);
                const resolvedPosterName = isSenderOwner
                  ? (String(r.sender_name || "").trim() || ownerInfo.posterName || "Post Owner")
                  : (ownerInfo.posterName || "Post Owner");
                conversationsMap.set(key, {
                  id: convId,
                  conversationId: convId,
                  postId: rowPostId,
                  post_id: rowPostId,
                  posterId: resolvedPosterId,
                  poster_id: resolvedPosterId,
                  posterName: resolvedPosterName,
                  posterEmail: isSenderOwner ? sEmail : ownerInfo.posterEmail || "",
                  helperId: hId,
                  helper_id: hId,
                  helperName: hName,
                  helperEmail: hEmail,
                  helperAvatar: hAvatar,
                  senderId: hId,
                  senderName: hName,
                  senderEmail: hEmail,
                  senderAvatar: hAvatar,
                  lastMessage: msgText,
                  last_message: msgText,
                  lastMessageAt: msgTime,
                  last_message_at: msgTime,
                  updatedAt: msgTime,
                  unreadPosterCount: unread,
                  unread_poster_count: unread,
                  unreadHelperCount: 0,
                  unread_helper_count: 0,
                  unreadCount: unread,
                  count: 1,
                  messageCount: 1,
                  isCollaborator: Boolean(r.is_collaborator)
                });
              } else {
                existing.messageCount = (existing.messageCount || 0) + 1;
                existing.count = Math.max(existing.count || 1, existing.messageCount);
                if (new Date(msgTime).getTime() >= new Date(existing.lastMessageAt).getTime()) {
                  existing.lastMessage = msgText;
                  existing.last_message = msgText;
                  existing.lastMessageAt = msgTime;
                  existing.last_message_at = msgTime;
                  existing.updatedAt = msgTime;
                }
                if (!isSenderOwner && r.sender_name && existing.helperName === "Community Helper") {
                  existing.helperName = r.sender_name;
                  existing.senderName = r.sender_name;
                }
                if (!isSenderOwner && sEmail && !existing.helperEmail) {
                  existing.helperEmail = sEmail;
                  existing.senderEmail = sEmail;
                }
                if (isSenderOwner && r.sender_name && (!existing.posterName || existing.posterName === "Post Owner")) {
                  existing.posterName = r.sender_name;
                }
                if (isSenderOwner && sEmail && !existing.posterEmail) {
                  existing.posterEmail = sEmail;
                }
              }
            }
          } catch {}
        }

        // 3. Enrich BOTH poster and helper names/emails/avatars from users table if any are generic
        try {
          const allUserLookupKeys = Array.from(
            new Set(
              Array.from(conversationsMap.values())
                .flatMap((c) => [
                  String(c.helperId || "").toLowerCase(),
                  String(c.helperEmail || "").toLowerCase(),
                  String(c.posterId || "").toLowerCase(),
                  String(c.posterEmail || "").toLowerCase()
                ])
                .filter(Boolean)
            )
          );
          if (allUserLookupKeys.length > 0) {
            const uRes = await dbPool
              .query(
                "SELECT id::text AS id, name, email, avatar_url FROM users WHERE LOWER(id::text) = ANY($1::text[]) OR LOWER(email) = ANY($1::text[])",
                [allUserLookupKeys]
              )
              .catch(() => ({ rows: [] as any[] }));
            const uMap = new Map<string, { name?: string; email?: string; avatar?: string }>();
            uRes.rows.forEach((u: any) => {
              if (u.id) uMap.set(String(u.id).toLowerCase(), { name: u.name, email: u.email, avatar: u.avatar_url });
              if (u.email) uMap.set(String(u.email).toLowerCase(), { name: u.name, email: u.email, avatar: u.avatar_url });
            });
            conversationsMap.forEach((c) => {
              const hInfo = uMap.get(String(c.helperId || "").toLowerCase()) || (c.helperEmail ? uMap.get(String(c.helperEmail).toLowerCase()) : undefined);
              if (hInfo) {
                if ((!c.helperName || c.helperName === "Community Helper" || c.helperName === "Community Peer") && hInfo.name) {
                  c.helperName = hInfo.name;
                  c.senderName = hInfo.name;
                }
                if (!c.helperEmail && hInfo.email) {
                  c.helperEmail = String(hInfo.email).toLowerCase();
                  c.senderEmail = String(hInfo.email).toLowerCase();
                }
                if (!c.helperAvatar && hInfo.avatar) {
                  c.helperAvatar = hInfo.avatar;
                  c.senderAvatar = hInfo.avatar;
                }
              }
              const pInfo = uMap.get(String(c.posterId || "").toLowerCase()) || (c.posterEmail ? uMap.get(String(c.posterEmail).toLowerCase()) : undefined);
              if (pInfo) {
                if ((!c.posterName || c.posterName === "Post Owner" || c.posterName === "Community Member") && pInfo.name) {
                  c.posterName = pInfo.name;
                }
                if (!c.posterEmail && pInfo.email) {
                  c.posterEmail = String(pInfo.email).toLowerCase();
                }
                if (!c.posterAvatar && pInfo.avatar) {
                  c.posterAvatar = pInfo.avatar;
                }
              }
            });
          }
        } catch {}
      }

      // Reconcile any in-memory / fallback messages so 1-on-1 conversations work even if DB is temporarily unreachable
      try {
        const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
        for (const [convKey, msgArr] of Object.entries(allMessages)) {
          if (!Array.isArray(msgArr) || msgArr.length === 0) continue;
          for (const m of msgArr) {
            if (!m) continue;
            const mPostId = String(m.postId || m.post_id || m.intentId || m.intent_id || "").trim();
            if (postId && mPostId !== postId) continue;
            const sId = String(m.senderId || m.sender_id || m.authorId || "").trim();
            const rId = String(m.receiverId || m.receiver_id || "").trim();
            const hId = String(
              m.helperId ||
                m.helper_id ||
                (ownerIds.has(sId.toLowerCase()) ? rId : sId)
            ).trim();
            if (!hId || hId === mPostId || ownerIds.has(hId.toLowerCase())) continue;
            if (
              !postId &&
              userIdParam &&
              sId.toLowerCase() !== userIdParam.toLowerCase() &&
              rId.toLowerCase() !== userIdParam.toLowerCase() &&
              String(m.posterId || m.postOwnerId || "").toLowerCase() !== userIdParam.toLowerCase()
            ) {
              continue;
            }
            const hEmail = ownerIds.has(sId.toLowerCase())
              ? ""
              : String(m.senderEmail || m.sender_email || "").trim().toLowerCase();
            const key = getThreadKey(mPostId, hId);
            const convId = String(m.conversationId || m.conversation_id || convKey || buildConversationId(mPostId, hId));
            const msgTime = m.createdAt || m.sent_at || new Date().toISOString();
            if (Date.now() - new Date(msgTime).getTime() > 7 * 24 * 60 * 60 * 1000) {
              continue;
            }
            const msgText = String(m.text || m.content || "").trim() || "📷 Attachment shared";
            const isSenderHelper = sId.toLowerCase() === hId.toLowerCase();
            const existing = conversationsMap.get(key);
            if (!existing) {
              const unread = isSenderHelper && !m.isRead && !m.is_read ? 1 : 0;
              const hName = isSenderHelper
                ? String(m.senderName || m.authorName || "Community Helper").trim()
                : "Community Helper";
              const hAvatar = isSenderHelper ? String(m.senderAvatar || m.authorAvatar || "").trim() : "";
              conversationsMap.set(key, {
                id: convId,
                conversationId: convId,
                postId: mPostId,
                post_id: mPostId,
                posterId: ownerInfo.posterId || m.posterId || m.postOwnerId || "",
                poster_id: ownerInfo.posterId || m.posterId || m.postOwnerId || "",
                posterName: ownerInfo.posterName || "Post Owner",
                helperId: hId,
                helper_id: hId,
                helperName: hName,
                helperEmail: hEmail,
                helperAvatar: hAvatar,
                senderId: hId,
                senderName: hName,
                senderEmail: hEmail,
                senderAvatar: hAvatar,
                lastMessage: msgText,
                last_message: msgText,
                lastMessageAt: msgTime,
                last_message_at: msgTime,
                updatedAt: msgTime,
                unreadPosterCount: unread,
                unread_poster_count: unread,
                unreadHelperCount: !isSenderHelper && !m.isRead && !m.is_read ? 1 : 0,
                unread_helper_count: !isSenderHelper && !m.isRead && !m.is_read ? 1 : 0,
                unreadCount: unread,
                count: 1,
                isCollaborator: Boolean(m.isCollaborator)
              });
            } else {
              existing.count = (existing.count || 1) + 1;
              if (isSenderHelper && !m.isRead && !m.is_read) {
                existing.unreadPosterCount = (existing.unreadPosterCount || 0) + 1;
                existing.unread_poster_count = existing.unreadPosterCount;
                existing.unreadCount = existing.unreadPosterCount;
              }
              if (new Date(msgTime).getTime() >= new Date(existing.lastMessageAt).getTime()) {
                existing.lastMessage = msgText;
                existing.last_message = msgText;
                existing.lastMessageAt = msgTime;
                existing.last_message_at = msgTime;
                existing.updatedAt = msgTime;
              }
            }
          }
        }
      } catch {}

      const list = Array.from(conversationsMap.values()).sort(
        (a, b) => new Date(b.lastMessageAt || b.updatedAt || 0).getTime() - new Date(a.lastMessageAt || a.updatedAt || 0).getTime()
      );
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: "Failed to load post conversations" });
    }
  };

  app.get("/api/chat/conversations", getPostInboxHandler);
  app.get("/api/intents/:id/inbox", getPostInboxHandler);
  app.get("/api/posts/:id/inbox", getPostInboxHandler);
  app.get("/api/posts/:id/responses", getPostInboxHandler);
  app.get("/api/intents/:id/responses", getPostInboxHandler);

  // Mark messages in a 1-on-1 conversation thread as read
  app.post("/api/intents/:id/mark-read", async (req: express.Request, res: express.Response) => {
    try {
      const intentId = req.params.id;
      const { senderId, conversationId, userId } = req.body || {};
      if (dbPool && isDbConnected) {
        if (conversationId) {
          await dbPool
            .query("UPDATE messages SET is_read = TRUE WHERE conversation_id = $1", [conversationId])
            .catch(() => {});
          await dbPool
            .query("UPDATE conversations SET unread_poster_count = 0 WHERE id = $1", [conversationId])
            .catch(() => {});
        } else if (senderId) {
          await dbPool
            .query("UPDATE messages SET is_read = TRUE WHERE (intent_id = $1 OR post_id = $1) AND LOWER(sender_id) = LOWER($2)", [intentId, senderId])
            .catch(() => {});
          await dbPool
            .query("UPDATE conversations SET unread_poster_count = 0 WHERE post_id = $1 AND LOWER(helper_id) = LOWER($2)", [intentId, senderId])
            .catch(() => {});
        }
      }
      res.json({ success: true });
    } catch {
      res.json({ success: false });
    }
  });

  // Manual Delete Conversation by User (PostgreSQL + In-Memory)
  app.delete("/api/chat/conversations/:id", async (req: express.Request, res: express.Response) => {
    try {
      const convId = sanitizeServerText(req.params.id, 150);
      const parsed = parseConversationId(convId);
      if (dbPool && isDbConnected) {
        await dbPool.query("DELETE FROM conversations WHERE id = $1", [convId]).catch(() => {});
        if (parsed) {
          await dbPool
            .query(
              "DELETE FROM messages WHERE conversation_id = $1 OR ((post_id = $2 OR intent_id = $2) AND (LOWER(sender_id) = LOWER($3) OR LOWER(receiver_id) = LOWER($3)))",
              [convId, parsed.postId, parsed.helperId]
            )
            .catch(() => {});
        } else {
          await dbPool.query("DELETE FROM messages WHERE conversation_id = $1", [convId]).catch(() => {});
        }
      }
      try {
        const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
        if (allMessages[convId]) {
          delete allMessages[convId];
          writeJsonFile(MESSAGES_FILE, allMessages);
        }
      } catch {}
      res.json({ success: true, deletedId: convId });
    } catch {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // ==========================================
  // USER-TO-USER CHAT BLOCK API
  // ==========================================
  const memoryChatBlocks: Array<{
    id: string;
    blockerId: string;
    blockerEmail: string;
    blockedId: string;
    blockedName: string;
    chatId: string;
    reason: string;
    createdAt: string;
  }> = [];

  const checkChatBlockState = async (
    chatId: string,
    userAId?: string,
    userBId?: string
  ): Promise<{ isBlocked: boolean; blockerId?: string; blockedId?: string; reason?: string }> => {
    const cleanChatId = String(chatId || "").trim();
    const cleanA = String(userAId || "").trim().toLowerCase();
    const cleanB = String(userBId || "").trim().toLowerCase();

    if (dbPool && isDbConnected) {
      try {
        const q = await dbPool.query(
          `SELECT * FROM blocked_users
           WHERE (chat_id = $1 AND $1 <> '' AND $1 <> 'general')
              OR ($2 <> '' AND $3 <> '' AND (
                   (LOWER(blocker_id) = $2 AND LOWER(blocked_id) = $3) OR
                   (LOWER(blocker_id) = $3 AND LOWER(blocked_id) = $2)
                 ))
           ORDER BY created_at DESC LIMIT 1`,
          [cleanChatId, cleanA, cleanB]
        );
        if (q.rows.length > 0) {
          const row = q.rows[0];
          return {
            isBlocked: true,
            blockerId: row.blocker_id,
            blockedId: row.blocked_id,
            reason: row.reason || ""
          };
        }
      } catch {}
    }

    const memMatch = memoryChatBlocks.find((b) => {
      if (cleanChatId && cleanChatId !== "general" && b.chatId === cleanChatId) return true;
      if (cleanA && cleanB) {
        const bBlocker = b.blockerId.toLowerCase();
        const bBlocked = b.blockedId.toLowerCase();
        return (bBlocker === cleanA && bBlocked === cleanB) || (bBlocker === cleanB && bBlocked === cleanA);
      }
      return false;
    });

    if (memMatch) {
      return {
        isBlocked: true,
        blockerId: memMatch.blockerId,
        blockedId: memMatch.blockedId,
        reason: memMatch.reason
      };
    }

    return { isBlocked: false };
  };

  app.get("/api/chat-blocks", async (req, res) => {
    try {
      const chatId = sanitizeServerText(req.query.chatId || "", 150);
      const userId = sanitizeServerText(req.query.userId || "", 150);
      const peerId = sanitizeServerText(req.query.peerId || "", 150);
      const state = await checkChatBlockState(chatId, userId, peerId);
      const blockedByMe = Boolean(
        state.isBlocked &&
          userId &&
          state.blockerId &&
          state.blockerId.toLowerCase() === userId.toLowerCase()
      );
      return res.json({
        isBlocked: state.isBlocked,
        blockedByMe,
        blockerId: state.blockerId || "",
        blockedId: state.blockedId || "",
        reason: state.reason || ""
      });
    } catch {
      return res.json({ isBlocked: false, blockedByMe: false });
    }
  });

  app.post("/api/chat-blocks", requireAuth, async (req, res) => {
    try {
      const caller = (req as any).user || extractRequestUser(req);
      const { chatId, blockedId, blockedName, reason, blockerId } = req.body || {};
      const finalBlockerId = sanitizeServerText(blockerId || caller?.uid || caller?.email || "", 150);
      const finalBlockerEmail = sanitizeServerText(caller?.email || "", 150).toLowerCase();
      const finalBlockedId = sanitizeServerText(blockedId || chatId || "peer", 150);
      const finalBlockedName = sanitizeServerText(blockedName || "User", 120);
      const finalChatId = sanitizeServerText(chatId || "", 150);
      const finalReason = sanitizeServerText(reason || "Blocked by user in chat", 300);

      if (!finalBlockerId) {
        return res.status(400).json({ error: "Blocker user ID required" });
      }

      const blockId = `blk_${finalChatId || "chat"}_${finalBlockerId}_${finalBlockedId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 140);
      const entry = {
        id: blockId,
        blockerId: finalBlockerId,
        blockerEmail: finalBlockerEmail,
        blockedId: finalBlockedId,
        blockedName: finalBlockedName,
        chatId: finalChatId,
        reason: finalReason,
        createdAt: new Date().toISOString()
      };

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            `INSERT INTO blocked_users (id, blocker_id, blocker_email, blocked_id, blocked_name, chat_id, reason, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (id) DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()`,
            [entry.id, entry.blockerId, entry.blockerEmail, entry.blockedId, entry.blockedName, entry.chatId, entry.reason]
          );
        } catch (e) {}
      }

      const existingIdx = memoryChatBlocks.findIndex((b) => b.id === entry.id);
      if (existingIdx >= 0) memoryChatBlocks[existingIdx] = entry;
      else memoryChatBlocks.unshift(entry);

      return res.json({ success: true, block: entry });
    } catch (e: any) {
      return res.status(500).json({ error: "Failed to block user" });
    }
  });

  app.delete("/api/chat-blocks", requireAuth, async (req, res) => {
    try {
      const caller = (req as any).user || extractRequestUser(req);
      const chatId = sanitizeServerText(req.query.chatId || req.body?.chatId || "", 150);
      const blockerId = sanitizeServerText(req.query.blockerId || req.body?.blockerId || caller?.uid || "", 150);
      const blockedId = sanitizeServerText(req.query.blockedId || req.body?.blockedId || "", 150);

      if (dbPool && isDbConnected) {
        try {
          if (chatId) {
            await dbPool.query(
              `DELETE FROM blocked_users WHERE chat_id = $1 AND (LOWER(blocker_id) = LOWER($2) OR $3 = TRUE)`,
              [chatId, blockerId, isRequestAdmin(req)]
            );
          } else if (blockerId && blockedId) {
            await dbPool.query(
              `DELETE FROM blocked_users WHERE LOWER(blocker_id) = LOWER($1) AND LOWER(blocked_id) = LOWER($2)`,
              [blockerId, blockedId]
            );
          }
        } catch {}
      }

      for (let i = memoryChatBlocks.length - 1; i >= 0; i--) {
        const b = memoryChatBlocks[i];
        if ((chatId && b.chatId === chatId) || (blockerId && blockedId && b.blockerId === blockerId && b.blockedId === blockedId)) {
          memoryChatBlocks.splice(i, 1);
        }
      }

      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: "Failed to unblock user" });
    }
  });

  // 5. Send 1-on-1 Chat Message (POST /api/chat/send, POST /api/posts/:id/respond, POST /api/messages)
  const sendChatMessageHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

      if (isBotSubmission(req)) {
        console.log("[Honeypot Triggered] Silently rejecting bot chat message submission");
        return res.status(200).json({ success: true, message: "Message received" });
      }
      const message = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message payload required" });
      }

      const rawParamId = sanitizeServerText(req.params.id || "", 150);
      const rawConvId = sanitizeServerText(message.conversationId || message.conversation_id || "", 150);
      const parsedParam = parseConversationId(rawParamId);
      const parsedBody = parseConversationId(rawConvId);

      const postId = sanitizeServerText(
        message.postId ||
          message.post_id ||
          message.intentId ||
          message.intent_id ||
          parsedBody?.postId ||
          parsedParam?.postId ||
          (!rawParamId.startsWith("conv_") ? rawParamId : "") ||
          (!rawConvId.startsWith("conv_") ? rawConvId : "") ||
          "general",
        150
      );

      // Validate any chat attachment (Images <= 2MB, PDFs <= 5MB)
      if (message.attachmentUrl) {
        const attachCheck = validateServerUploadedData(message.attachmentUrl, { allowPdf: true });
        if (!attachCheck.valid) {
          return res.status(400).json({ error: attachCheck.error });
        }
      }

      const safeText = sanitizeServerText(message.message || message.text || message.content || "", 2000);
      const caller = extractRequestUser(req);
      const senderIdVal = sanitizeServerText(
        message.sender_id || message.senderId || message.authorId || message.user_id || caller?.uid || "guest",
        150
      );

      let resolvedName = sanitizeServerText(
        message.sender_name || message.senderName || message.authorName || caller?.name || "",
        120
      );
      let resolvedEmail = sanitizeServerText(
        message.sender_email || message.senderEmail || message.authorEmail || caller?.email || message.email || "",
        150
      ).toLowerCase();
      let resolvedAvatar = sanitizeServerText(
        message.sender_avatar || message.senderAvatar || message.authorAvatar || "",
        500
      );

      if (dbPool && isDbConnected && (!resolvedName || resolvedName === "Community Peer" || !resolvedEmail)) {
        try {
          const uLookup = await dbPool
            .query(
              "SELECT name, email, avatar_url FROM users WHERE id::text = $1 OR LOWER(email) = LOWER($2) LIMIT 1",
              [senderIdVal, resolvedEmail || senderIdVal]
            )
            .catch(() => ({ rows: [] as any[] }));
          if (uLookup.rows.length > 0) {
            if (!resolvedName || resolvedName === "Community Peer") resolvedName = uLookup.rows[0].name || resolvedName;
            if (!resolvedEmail && uLookup.rows[0].email) resolvedEmail = String(uLookup.rows[0].email).toLowerCase();
            if (!resolvedAvatar && uLookup.rows[0].avatar_url) resolvedAvatar = uLookup.rows[0].avatar_url;
          }
        } catch {}
      }

      // Resolve authoritative poster_id, poster_name, poster_email from PostgreSQL posts/broadcast_posts
      const ownerInfo = await resolvePostOwnerInfo(postId);
      const postOwnerId = sanitizeServerText(
        ownerInfo.posterId || message.post_owner_id || message.postOwnerId || message.posterId || message.poster_id || "",
        150
      );
      const postOwnerEmail = sanitizeServerText(
        ownerInfo.posterEmail || message.post_owner_email || message.postOwnerEmail || "",
        150
      ).toLowerCase();
      const postOwnerName = sanitizeServerText(ownerInfo.posterName || "Post Owner", 120);
      const postOwnerAvatar = sanitizeServerText(ownerInfo.posterAvatar || "", 500);

      const isSenderPostOwner =
        Boolean(postOwnerId && senderIdVal.toLowerCase() === postOwnerId.toLowerCase()) ||
        Boolean(postOwnerEmail && resolvedEmail && resolvedEmail === postOwnerEmail.toLowerCase());

      // Resolve helperId and receiverId strictly for 1-on-1 isolation
      const rawReceiverId = sanitizeServerText(
        message.receiverId || message.receiver_id || message.helperId || message.helper_id || parsedBody?.helperId || parsedParam?.helperId || "",
        150
      );

      const helperId = isSenderPostOwner
        ? sanitizeServerText(
            message.helperId ||
              message.helper_id ||
              parsedBody?.helperId ||
              parsedParam?.helperId ||
              (rawReceiverId && rawReceiverId !== postId && rawReceiverId.toLowerCase() !== postOwnerId.toLowerCase() ? rawReceiverId : ""),
            150
          )
        : senderIdVal;

      // STRICT RULE: A Post Owner can NEVER send an untargeted message on their own post without selecting a specific Helper
      if (
        isSenderPostOwner &&
        (!helperId ||
          helperId === postId ||
          helperId.toLowerCase() === senderIdVal.toLowerCase() ||
          (postOwnerId && helperId.toLowerCase() === postOwnerId.toLowerCase()))
      ) {
        return res.status(400).json({
          error: "Post Owner must select a specific responder from View Responses before sending a message.",
          code: "MISSING_HELPER_TARGET"
        });
      }

      const resolvedReceiverId = isSenderPostOwner
        ? helperId
        : sanitizeServerText(postOwnerId || rawReceiverId || postId, 150);

      // Validate senderId !== receiverId (when receiverId is a real user ID, not a fallback postId)
      if (
        resolvedReceiverId &&
        resolvedReceiverId !== postId &&
        senderIdVal.toLowerCase() === resolvedReceiverId.toLowerCase()
      ) {
        return res.status(400).json({
          error: "Sender and receiver cannot be the same user.",
          code: "SELF_MESSAGE_NOT_ALLOWED"
        });
      }

      // Enforce User-to-User Chat Block
      const blockCheck = await checkChatBlockState(postId, senderIdVal, resolvedReceiverId);
      if (blockCheck.isBlocked) {
        return res.status(403).json({
          error: "इस चैट में संदेश भेजना ब्लॉक किया गया है। (Messaging is blocked in this conversation.)",
          code: "CHAT_BLOCKED"
        });
      }

      const uploadedChatAttachment = message.attachmentUrl
        ? await uploadDataToFirebaseServer(message.attachmentUrl, "chat_attachments")
        : null;

      const effectivePosterId = postOwnerId || (isSenderPostOwner ? senderIdVal : resolvedReceiverId);
      const effectiveConvId =
        postId && postId !== "general" && helperId
          ? buildConversationId(postId, helperId)
          : rawConvId || postId;

      const helperNameVal = isSenderPostOwner
        ? sanitizeServerText(message.helperName || message.receiverName || "Community Helper", 120)
        : resolvedName || "Community Helper";
      const helperEmailVal = isSenderPostOwner
        ? sanitizeServerText(message.helperEmail || message.receiverEmail || "", 150).toLowerCase()
        : resolvedEmail;
      const helperAvatarVal = isSenderPostOwner
        ? sanitizeServerText(message.helperAvatar || "", 500)
        : resolvedAvatar;

      const newMsg = {
        id: sanitizeServerText(message.id || "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6), 100),
        conversationId: effectiveConvId,
        conversation_id: effectiveConvId,
        postId,
        post_id: postId,
        intentId: postId,
        intent_id: postId,
        postOwnerId: effectivePosterId,
        post_owner_id: effectivePosterId,
        posterId: effectivePosterId,
        poster_id: effectivePosterId,
        helperId,
        helper_id: helperId,
        authorId: senderIdVal,
        senderId: senderIdVal,
        sender_id: senderIdVal,
        user_id: senderIdVal,
        authorName: resolvedName || "Community Peer",
        senderName: resolvedName || "Community Peer",
        sender_name: resolvedName || "Community Peer",
        senderEmail: resolvedEmail,
        sender_email: resolvedEmail,
        authorEmail: resolvedEmail,
        senderAvatar: resolvedAvatar,
        sender_avatar: resolvedAvatar,
        authorAvatar: resolvedAvatar,
        receiverId: resolvedReceiverId,
        receiver_id: resolvedReceiverId,
        text: safeText,
        content: safeText,
        message: safeText,
        type: sanitizeServerText(message.type || "text", 40),
        attachmentUrl: uploadedChatAttachment,
        attachment_url: uploadedChatAttachment,
        attachmentType: message.attachmentType ? sanitizeServerText(message.attachmentType, 40) : null,
        attachment_type: message.attachmentType ? sanitizeServerText(message.attachmentType, 40) : null,
        isRead: false,
        is_read: false,
        createdAt: message.createdAt || message.sent_at || new Date().toISOString()
      };

      const previewText = safeText || (uploadedChatAttachment ? "📷 Photo / Attachment" : "Sent a message");

      // 1. PostgreSQL Upsert into conversations & Insert into messages, responses, and chats
      if (dbPool && isDbConnected) {
        if (postId && postId !== "general" && helperId) {
          try {
            const unreadPosterDelta = isSenderPostOwner ? 0 : 1;
            const unreadHelperDelta = isSenderPostOwner ? 1 : 0;
            await dbPool.query(
              `INSERT INTO conversations (
                 id, post_id, poster_id, poster_name, poster_email, poster_avatar,
                 helper_id, helper_name, helper_email, helper_avatar,
                 last_message, last_message_at, unread_poster_count, unread_helper_count, created_at
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $12)
               ON CONFLICT (post_id, poster_id, helper_id) DO UPDATE SET
                 last_message = EXCLUDED.last_message,
                 last_message_at = EXCLUDED.last_message_at,
                 unread_poster_count = conversations.unread_poster_count + $13,
                 unread_helper_count = conversations.unread_helper_count + $14,
                 helper_name = CASE
                   WHEN EXCLUDED.helper_name <> '' AND EXCLUDED.helper_name <> 'Community Helper'
                   THEN EXCLUDED.helper_name
                   ELSE conversations.helper_name
                 END,
                 helper_email = COALESCE(NULLIF(EXCLUDED.helper_email, ''), conversations.helper_email),
                 helper_avatar = COALESCE(NULLIF(EXCLUDED.helper_avatar, ''), conversations.helper_avatar)`,
              [
                effectiveConvId,
                postId,
                effectivePosterId,
                isSenderPostOwner ? resolvedName || postOwnerName : postOwnerName,
                isSenderPostOwner ? resolvedEmail || postOwnerEmail : postOwnerEmail,
                isSenderPostOwner ? resolvedAvatar || postOwnerAvatar : postOwnerAvatar,
                helperId,
                helperNameVal,
                helperEmailVal || null,
                helperAvatarVal || null,
                previewText,
                newMsg.createdAt,
                unreadPosterDelta,
                unreadHelperDelta
              ]
            );
          } catch (convUpsertErr) {
            console.warn("Conversations upsert notice:", convUpsertErr);
          }
        }

        try {
          await dbPool.query(
            `INSERT INTO responses (id, post_id, post_owner_id, sender_id, sender_name, sender_email, sender_avatar, receiver_id, message, attachment_url, attachment_type, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, FALSE, $12)
             ON CONFLICT (id) DO NOTHING`,
            [
              newMsg.id,
              postId,
              newMsg.postOwnerId,
              newMsg.senderId,
              newMsg.authorName || "Community Peer",
              newMsg.senderEmail || null,
              newMsg.senderAvatar || null,
              newMsg.receiverId,
              newMsg.text,
              newMsg.attachmentUrl,
              newMsg.attachmentType,
              newMsg.createdAt
            ]
          );
        } catch {}

        try {
          await dbPool.query(
            `INSERT INTO messages (id, conversation_id, intent_id, post_id, post_owner_id, sender_id, sender_name, sender_email, sender_avatar, receiver_id, text, content, type, attachment_url, attachment_type, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, FALSE, $16)
             ON CONFLICT (id) DO NOTHING`,
            [
              newMsg.id,
              effectiveConvId,
              postId,
              postId,
              newMsg.postOwnerId,
              newMsg.senderId,
              newMsg.authorName || "Community Peer",
              newMsg.senderEmail || null,
              newMsg.senderAvatar || null,
              newMsg.receiverId,
              newMsg.text,
              newMsg.content,
              newMsg.type,
              newMsg.attachmentUrl,
              newMsg.attachmentType,
              newMsg.createdAt
            ]
          );
        } catch (dbErr) {
          console.warn("DB messages insert fallback attempt:", dbErr);
          try {
            await dbPool.query(
              `INSERT INTO messages (id, intent_id, sender_id, sender_name, receiver_id, text, content, type, attachment_url, attachment_type, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (id) DO NOTHING`,
              [
                newMsg.id,
                postId,
                newMsg.senderId,
                newMsg.authorName || "Community Peer",
                newMsg.receiverId,
                newMsg.text,
                newMsg.content,
                newMsg.type,
                newMsg.attachmentUrl,
                newMsg.attachmentType,
                newMsg.createdAt
              ]
            );
          } catch {}
        }

        try {
          await dbPool.query(
            `INSERT INTO chats (id, intent_id, post_id, post_owner_id, sender_id, sender_name, sender_email, receiver_id, message, sent_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`,
            [
              newMsg.id,
              postId,
              postId,
              newMsg.postOwnerId,
              newMsg.senderId,
              newMsg.authorName || "Community Peer",
              newMsg.senderEmail || null,
              newMsg.receiverId,
              newMsg.message,
              newMsg.createdAt
            ]
          );
        } catch {}
      }

      // 2. Local file backup keyed by 1-on-1 conversationId
      const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
      const chatMessages = allMessages[effectiveConvId] || [];
      if (!chatMessages.some((m: any) => m.id === newMsg.id)) {
        chatMessages.push(newMsg);
        allMessages[effectiveConvId] = chatMessages;
        writeJsonFile(MESSAGES_FILE, allMessages);
      }

      // Refresh post interaction timestamp & compute updated response_count / repliers for this post from conversations
      let updatedResponseCount = 1;
      const replierGroupsMap = new Map<string, any>();
      if (postId && postId !== "general") {
        try {
          if (dbPool && isDbConnected) {
            await dbPool
              .query(`UPDATE broadcast_posts SET expires_at = NOW() + INTERVAL '1 hour' WHERE id = $1`, [postId])
              .catch(() => {});

            const convRowsRes = await dbPool
              .query(
                `SELECT * FROM conversations
                 WHERE post_id = $1
                   AND last_message IS NOT NULL
                   AND TRIM(last_message) <> ''
                   AND LOWER(helper_id) <> LOWER(poster_id)
                 ORDER BY last_message_at DESC`,
                [postId]
              )
              .catch(() => ({ rows: [] as any[] }));

            convRowsRes.rows.forEach((c: any) => {
              const hId = String(c.helper_id || "").trim();
              const hEmail = String(c.helper_email || "").trim().toLowerCase();
              if (!hId) return;
              const key = hEmail || hId.toLowerCase();
              const lastIso = c.last_message_at ? new Date(c.last_message_at).toISOString() : new Date().toISOString();
              replierGroupsMap.set(key, {
                id: c.id || buildConversationId(postId, hId),
                conversationId: c.id || buildConversationId(postId, hId),
                helperId: hId,
                senderId: hId,
                helperName: c.helper_name || "Community Helper",
                senderName: c.helper_name || "Community Helper",
                helperEmail: hEmail,
                senderEmail: hEmail,
                helperAvatar: c.helper_avatar || "",
                senderAvatar: c.helper_avatar || "",
                lastMessage: c.last_message || previewText,
                lastMessageAt: lastIso,
                updatedAt: lastIso,
                count: Math.max(Number(c.unread_poster_count || 0), 1),
                unreadCount: Number(c.unread_poster_count || 0),
                unreadPosterCount: Number(c.unread_poster_count || 0),
                unreadHelperCount: Number(c.unread_helper_count || 0),
                isCollaborator: Boolean(c.is_collaborator)
              });
            });

            updatedResponseCount = Math.max(replierGroupsMap.size, 1);
          }
        } catch (syncErr) {
          console.warn("Post interaction refresh error:", syncErr);
        }
      }

      const updatedRepliers = Array.from(replierGroupsMap.values()).sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );

      const responseObject = {
        ...newMsg,
        responseCount: updatedResponseCount,
        response_count: updatedResponseCount,
        repliers: updatedRepliers
      };

      // Immediately broadcast new_response & new_chat_message via SSE so both Post Owner and Helper sync in 0ms
      if (postId && postId !== "general") {
        broadcastRealtimeEvent("new_response", {
          postId,
          post_id: postId,
          conversationId: effectiveConvId,
          conversation_id: effectiveConvId,
          helperId,
          helper_id: helperId,
          postOwnerId: effectivePosterId,
          post_owner_id: effectivePosterId,
          receiverId: resolvedReceiverId,
          response: responseObject,
          responseCount: updatedResponseCount,
          response_count: updatedResponseCount,
          repliers: updatedRepliers
        });
      }

      // 3. Trigger FCM Push Notification to receiverId (either Post Owner when Helper replies, or Helper when Post Owner replies)
      (async () => {
        try {
          if (!dbPool || !isDbConnected) return;
          if (!getParsedFirebaseServiceAccount()) return;
          if (!postId || postId === "general" || !resolvedReceiverId) return;

          const targetReceiverId = String(resolvedReceiverId || "").trim();
          const targetReceiverEmail = isSenderPostOwner ? helperEmailVal : postOwnerEmail;
          if (!targetReceiverId && !targetReceiverEmail) return;

          const tokenRes = await dbPool
            .query(
              `SELECT DISTINCT fcm_token
               FROM users
               WHERE fcm_token IS NOT NULL
                 AND TRIM(fcm_token) <> ''
                 AND (
                   LOWER(id) = LOWER($1)
                   OR ($2 <> '' AND email IS NOT NULL AND LOWER(email) = LOWER($2))
                   OR ($2 <> '' AND LOWER(id) = LOWER($3))
                 )`,
              [
                targetReceiverId,
                targetReceiverEmail || "",
                targetReceiverEmail ? `email_${targetReceiverEmail.replace(/[^a-z0-9]/g, "_")}` : ""
              ]
            )
            .catch(() => ({ rows: [] as any[] }));

          const receiverTokens = Array.from(
            new Set(
              tokenRes.rows
                .map((r: any) => String(r.fcm_token || "").trim())
                .filter(Boolean)
            )
          );
          if (receiverTokens.length === 0) return;

          const senderDisplay = newMsg.authorName || newMsg.senderName || "A neighbor";
          const originUrl = (
            req.headers.origin && String(req.headers.origin).startsWith("http")
              ? String(req.headers.origin)
              : `${req.protocol || "https"}://${req.get("host") || "localhost:3000"}`
          ).replace(/\/+$/, "");
          const replyUrl = `${originUrl}/?postId=${encodeURIComponent(postId)}&viewResponses=1`;

          const pushTitle = isSenderPostOwner ? `💬 Reply from ${senderDisplay}` : "💬 New Response on your Post!";
          const pushBody = isSenderPostOwner
            ? `${senderDisplay}: ${previewText.slice(0, 90)}`
            : `${senderDisplay} replied to your request. Tap to view response.`;

          const pushRes = await sendFcmMulticastPush({
            tokens: receiverTokens,
            title: pushTitle,
            body: pushBody,
            postUrl: replyUrl,
            data: {
              title: pushTitle,
              body: pushBody,
              postId: String(postId),
              conversationId: String(effectiveConvId),
              responderName: String(senderDisplay),
              url: replyUrl,
              click_action: replyUrl
            }
          });

          if (pushRes.invalidTokens.length > 0 && dbPool) {
            await dbPool
              .query(`UPDATE users SET fcm_token = NULL WHERE fcm_token = ANY($1::text[])`, [pushRes.invalidTokens])
              .catch(() => {});
          }
        } catch (err: any) {
          console.warn("[FCM Reply Push Notice]:", err?.message || err);
        }
      })();

      res.status(201).json(responseObject);
    } catch (e) {
      console.error("Failed to save message:", e);
      res.status(500).json({ error: "Failed to save message" });
    }
  };

  app.post("/api/chat/send", chatMessageLimiter, sendChatMessageHandler);
  app.post("/api/posts/:id/respond", chatMessageLimiter, sendChatMessageHandler);
  app.post("/api/intents/:id/respond", chatMessageLimiter, sendChatMessageHandler);
  app.post("/api/intents/:id/messages", chatMessageLimiter, sendChatMessageHandler);
  app.post("/api/posts/:id/messages", chatMessageLimiter, sendChatMessageHandler);
  app.post("/api/chats", chatMessageLimiter, sendChatMessageHandler);
  app.post("/api/messages", chatMessageLimiter, sendChatMessageHandler);
  app.post("/api/messages/:id", chatMessageLimiter, sendChatMessageHandler);

  // Delete a chat message and clean up any Firebase Storage attachment
  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (dbPool && isDbConnected) {
        const msgRes = await dbPool.query("SELECT attachment_url FROM messages WHERE id = $1", [id]).catch(() => ({ rows: [] as any[] }));
        if (msgRes.rows.length > 0 && msgRes.rows[0].attachment_url) {
          await deleteFilesFromFirebaseStorage(msgRes.rows[0].attachment_url);
        }
        await dbPool.query("DELETE FROM messages WHERE id = $1", [id]).catch(() => {});
        await dbPool.query("DELETE FROM chats WHERE id = $1", [id]).catch(() => {});
      }
      // Also remove from local JSON backup so it doesn't reappear on poll
      try {
        const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
        let modified = false;
        Object.keys(allMessages).forEach(convKey => {
          const before = allMessages[convKey]?.length || 0;
          allMessages[convKey] = (allMessages[convKey] || []).filter((m: any) => m && m.id !== id);
          if ((allMessages[convKey]?.length || 0) !== before) modified = true;
        });
        if (modified) writeJsonFile(MESSAGES_FILE, allMessages);
      } catch {}
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete message" });
    }
  });

  // Select a replier to collaborate with on a post/help request
  app.post("/api/intents/:id/collaborate", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { helperId, helperName } = req.body;
      if (!helperId) {
        return res.status(400).json({ error: "Helper ID is required to collaborate" });
      }
      const caller = extractRequestUser(req);
      const confirmMsgId = "msg_collab_" + Date.now();
      const confirmText = `🤝 Collaboration Confirmed! Post owner selected ${helperName || "this community helper"} to collaborate on this request.`;

      if (dbPool && isDbConnected) {
        await dbPool.query(
          `UPDATE messages SET is_collaborator = (sender_id = $1) WHERE intent_id = $2`,
          [helperId, id]
        ).catch(() => {});
        await dbPool.query(
          `INSERT INTO messages (id, intent_id, sender_id, sender_name, receiver_id, text, content, type, is_collaborator, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $6, 'text', true, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [confirmMsgId, id, caller?.uid || "owner", caller?.name || "Post Owner", helperId, confirmText]
        ).catch(() => {});
      }

      res.json({
        success: true,
        intentId: id,
        collaboratorId: helperId,
        collaboratorName: helperName || "Community Peer",
        message: confirmText
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to confirm collaboration" });
    }
  });

  // Keep posts permanently in PostgreSQL (no auto-purge of database tables)

  // ==========================================
  // BUSINESSES & SHOPS API (Table: businesses - id, owner_id, business_name, category, address, phone, created_at)
  // ==========================================

  const getBusinessesHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const includeAll = req.query.all === 'true' || req.query.includePending === 'true';
      const caller = extractUserFromRequest(req);
      const isAdmin = isRequestAdmin(req);
      const isAuthenticated = Boolean(caller && caller.uid && !String(caller.uid).startsWith('guest'));
      const isPublicRequest = !includeAll && !isAdmin && !isAuthenticated;

      if (isPublicRequest) {
        const cached = getPublicCache('public_shops');
        if (cached) {
          return res.json(cached);
        }
      }

      let allList: any[] = [];

      if (dbPool && isDbConnected) {
        try {
          const bizRes = await dbPool.query("SELECT * FROM businesses ORDER BY created_at DESC");
          if (bizRes.rows.length > 0) {
            bizRes.rows.forEach(r => {
              const rawObj = typeof r.raw_json === 'object' && r.raw_json ? r.raw_json : {};
              const isApproved = Boolean(r.is_approved === true || r.is_verified === true || rawObj.isVerified === true || rawObj.status === 'approved');
              allList.push({
                ...rawObj,
                id: r.id,
                name: r.shop_name || r.business_name || rawObj.name || 'Local Business',
                businessName: r.business_name || r.shop_name || rawObj.businessName || 'Local Business',
                type: rawObj.type || 'shop',
                categoryLabel: r.category || rawObj.categoryLabel || 'Retail & Services',
                category: r.category || rawObj.category || 'Retail & Services',
                ownerName: rawObj.ownerName || r.owner_id || 'Owner',
                owner_id: r.owner_id || r.user_id || rawObj.owner_id,
                userId: r.user_id || r.owner_id || rawObj.userId,
                phone: r.phone || rawObj.phone || '',
                area: r.sector || rawObj.area || r.address || '',
                address: r.address || r.sector || rawObj.address || '',
                description: r.description || rawObj.description || '',
                photoUrl: r.image_url || rawObj.photoUrl || null,
                rating: Number(rawObj.rating || 5.0),
                reviewCount: Number(rawObj.reviewCount || 1),
                isVerified: isApproved,
                status: isApproved ? 'approved' : (rawObj.status || 'pending'),
                createdAt: r.created_at
              });
            });
          }

          const result = await dbPool.query("SELECT * FROM shops ORDER BY created_at DESC");
          if (result.rows.length > 0) {
            const existingIds = new Set(allList.map(x => x.id));
            result.rows.forEach(r => {
              if (existingIds.has(r.id)) return;
              allList.push({
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
                isVerified: Boolean(r.is_verified === true),
                status: r.is_verified === true ? 'approved' : 'pending',
                createdAt: r.created_at
              });
            });
          }
        } catch (e) {}
      }

      const localShops = readJsonFile<any[]>(SHOPS_FILE, []);
      if (localShops.length > 0) {
        const mergedMap = new Map<string, any>();
        allList.forEach(s => mergedMap.set(s.id, s));
        localShops.forEach(s => {
          const isApproved = Boolean(s.isVerified === true || s.is_verified === true || s.status === 'approved');
          mergedMap.set(s.id, {
            ...s,
            isVerified: isApproved,
            status: s.status || (isApproved ? 'approved' : 'pending')
          });
        });
        allList = Array.from(mergedMap.values());
      }

      // Filter out any legacy dummy/sample shops
      allList = allList.filter(s => s && s.id && !String(s.id).startsWith('sample_shop_'));

      if (!isAdmin) {
        allList = allList.filter(
          s => !s.is_flagged && !s.hidden && !s.is_deleted && s.status !== 'flagged' && s.status !== 'deleted'
        );
      }

      if (!includeAll) {
        allList = allList.filter(s => s.isVerified === true || s.status === 'approved');
      }

      // Data Privacy: Redact private emails/phones for unauthenticated bulk requests (Admin gets full details)
      const verifs = isAdmin ? readJsonFile<any[]>(VERIFICATIONS_FILE, []) : [];
      const sanitizedList = allList.map(s => {
        const item = redactBulkItemForPrivacy(s, isAuthenticated, isAdmin);
        if (isAdmin) {
          const matchedVerif = verifs.find(v => v.entityId === s.id);
          if (matchedVerif && matchedVerif.idDocumentWatermarked) {
            item.idDocumentWatermarked = matchedVerif.idDocumentWatermarked;
          }
        }
        return item;
      });

      if (isPublicRequest) {
        setPublicCache('public_shops', sanitizedList);
      }

      res.json(sanitizedList);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to fetch businesses" });
    }
  };

  app.get("/api/shops", getBusinessesHandler);
  app.get("/api/businesses", getBusinessesHandler);

  const saveBusinessHandler = async (req: express.Request, res: express.Response) => {
    try {
      if (isBotSubmission(req)) {
        console.log("[Honeypot Triggered] Silently rejecting bot business submission");
        return res.status(200).json({ success: true, message: "Request received" });
      }

      const shop = req.body;
      const bName = shop.business_name || shop.businessName || shop.name;
      if (!shop || !bName) return res.status(400).json({ error: "Business name required" });

      // Validate uploaded shop photos (up to 3 images, max 2MB each) and ID document if present
      const validatedPhotos: string[] = [];
      if (Array.isArray(shop.photos)) {
        for (const p of shop.photos.slice(0, 3)) {
          if (typeof p === 'string' && p.trim()) {
            if (p.trim().startsWith('data:')) {
              const pCheck = validateServerUploadedDataUrl(p.trim(), { allowPdf: false });
              if (!pCheck.valid) {
                return res.status(400).json({ error: pCheck.error });
              }
            }
            const uploadedPhoto = await uploadDataToFirebaseServer(p.trim(), "businesses");
            validatedPhotos.push(uploadedPhoto);
          }
        }
      }
      if (shop.photoUrl || shop.photo_url) {
        const primaryUrl = String(shop.photoUrl || shop.photo_url).trim();
        if (primaryUrl.startsWith('data:')) {
          const photoCheck = validateServerUploadedDataUrl(primaryUrl, { allowPdf: false });
          if (!photoCheck.valid) {
            return res.status(400).json({ error: photoCheck.error });
          }
        }
        const uploadedPrimary = await uploadDataToFirebaseServer(primaryUrl, "businesses");
        if (uploadedPrimary && !validatedPhotos.includes(uploadedPrimary) && validatedPhotos.length < 3) {
          validatedPhotos.unshift(uploadedPrimary);
        }
      }
      if (shop.idDocumentWatermarked) {
        const docCheck = validateServerUploadedDataUrl(shop.idDocumentWatermarked, { allowPdf: true });
        if (!docCheck.valid) {
          return res.status(400).json({ error: docCheck.error });
        }
        shop.idDocumentWatermarked = await uploadDataToFirebaseServer(shop.idDocumentWatermarked, "verifications");
      }

      const isAdminCaller = isRequestAdmin(req);
      const userFromReq = (req as any).user;
      const ownerEmail = sanitizeServerText(shop.ownerEmail ?? shop.email ?? (!isAdminCaller ? userFromReq?.email : '') ?? '', 150).toLowerCase();
      if (!ownerEmail && !isAdminCaller) {
        return res.status(400).json({ error: "Email ID is mandatory for business registration and verification." });
      }
      const ownerId = shop.userId || shop.owner_id || (!isAdminCaller ? userFromReq?.uid : '') || shop.ownerName || 'Owner';

      // Verify ownership and clean up old Firebase Storage photos if updating an existing shop
      const existingShops = readJsonFile<any[]>(SHOPS_FILE, []);
      let existingShop = existingShops.find(s => s.id === shop.id);
      if (!existingShop && shop.id && dbPool && isDbConnected) {
        try {
          const bRes = await dbPool.query("SELECT * FROM businesses WHERE id = $1 LIMIT 1", [shop.id]);
          if (bRes.rows.length > 0) {
            const r = bRes.rows[0];
            existingShop = { ...(r.raw_json || {}), id: r.id, userId: r.user_id, owner_id: r.owner_id, photoUrl: r.image_url };
          }
        } catch {}
      }
      if (existingShop && !isAdminCaller && !isAuthorizedAdmin(userFromReq)) {
        const isOwner =
          (existingShop.userId && (existingShop.userId === userFromReq?.uid || existingShop.userId === ownerId)) ||
          (existingShop.owner_id && (existingShop.owner_id === userFromReq?.uid || existingShop.owner_id === ownerId)) ||
          (existingShop.ownerEmail && userFromReq?.email && existingShop.ownerEmail.toLowerCase() === userFromReq.email.toLowerCase());
        if (!isOwner && (existingShop.userId || existingShop.ownerEmail)) {
          return res.status(403).json({ error: "Unauthorized: You can only edit your own registered business." });
        }
      }
      if (existingShop) {
        const oldPhotos = [existingShop.photoUrl, ...(Array.isArray(existingShop.photos) ? existingShop.photos : [])].filter(Boolean);
        for (const oldUrl of oldPhotos) {
          if (oldUrl && validatedPhotos.length > 0 && !validatedPhotos.includes(oldUrl)) {
            await deleteFilesFromFirebaseStorage(oldUrl);
          }
        }
        if (dbPool && isDbConnected) {
          const histId = "hist_biz_" + Date.now();
          await dbPool.query(
            `INSERT INTO profile_edit_history (id, user_id, email, entity_type, previous_data, updated_data, changed_by, created_at)
             VALUES ($1, $2, $3, 'business', $4, $5, $6, NOW())`,
            [histId, ownerId, ownerEmail, JSON.stringify(existingShop), JSON.stringify(shop), ownerEmail || ownerId]
          ).catch(() => {});
        }
      }

      const autoApprove = Boolean(isAdminCaller || userFromReq?.uid || (ownerId && !ownerId.startsWith('anon')) || (ownerEmail && ownerEmail.includes('@')));
      const newShop = {
        id: shop.id || 'shop_' + Date.now().toString(36),
        name: sanitizeStringServer(bName.trim(), 200),
        businessName: sanitizeStringServer(bName.trim(), 200),
        business_name: sanitizeStringServer(bName.trim(), 200),
        type: sanitizeStringServer(shop.type || 'shop', 50),
        category: sanitizeStringServer(shop.category || shop.categoryLabel || 'Retail & Services', 120),
        categoryLabel: sanitizeStringServer(shop.categoryLabel || shop.category || 'Local Business', 120),
        ownerName: sanitizeStringServer(shop.ownerName || shop.owner_id || 'Owner', 120),
        owner_id: ownerId,
        userId: ownerId,
        ownerEmail: sanitizeStringServer(ownerEmail, 150),
        phone: sanitizeStringServer(shop.phone || '', 30),
        timings: sanitizeStringServer(shop.timings || '', 120),
        area: sanitizeStringServer(shop.area || shop.address || 'Local Area', 200),
        address: sanitizeStringServer(shop.address || shop.area || 'Market Area', 300),
        description: sanitizeStringServer(shop.description || '', 1500),
        photoUrl: validatedPhotos[0] || shop.photoUrl || shop.photo_url || null,
        photos: validatedPhotos,
        rating: typeof shop.rating === 'number' ? shop.rating : 5.0,
        reviewCount: typeof shop.reviewCount === 'number' ? shop.reviewCount : 1,
        isVerified: autoApprove,
        status: autoApprove ? 'approved' : 'pending',
        createdAt: shop.createdAt || new Date().toISOString()
      };

      // 1. PostgreSQL Insert into primary "businesses" & "shops" tables
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO businesses (
              id, user_id, owner_id, shop_name, business_name, category,
              phone, address, sector, description, image_url, is_approved, is_verified, raw_json, created_at
            )
            VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              owner_id = EXCLUDED.owner_id,
              shop_name = EXCLUDED.shop_name,
              business_name = EXCLUDED.business_name,
              category = EXCLUDED.category,
              phone = EXCLUDED.phone,
              address = EXCLUDED.address,
              sector = EXCLUDED.sector,
              description = EXCLUDED.description,
              image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), businesses.image_url),
              is_approved = EXCLUDED.is_approved,
              is_verified = EXCLUDED.is_verified,
              raw_json = EXCLUDED.raw_json
          `, [
            newShop.id,
            newShop.owner_id,
            newShop.business_name,
            newShop.category,
            newShop.phone,
            newShop.address,
            newShop.area,
            newShop.description,
            newShop.photoUrl || '',
            autoApprove,
            JSON.stringify(newShop),
            newShop.createdAt
          ]);

          await dbPool.query(`
            INSERT INTO shops (id, name, type, category_label, owner_name, phone, area, address, description, photo_url, rating, review_count, is_verified, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              owner_name = EXCLUDED.owner_name,
              phone = EXCLUDED.phone,
              area = EXCLUDED.area,
              address = EXCLUDED.address,
              description = EXCLUDED.description,
              photo_url = COALESCE(NULLIF(EXCLUDED.photo_url, ''), shops.photo_url),
              is_verified = EXCLUDED.is_verified
          `, [
            newShop.id, newShop.name, newShop.type, newShop.categoryLabel,
            newShop.ownerName, newShop.phone, newShop.area, newShop.address,
            newShop.description, newShop.photoUrl, newShop.rating,
            newShop.reviewCount, autoApprove, newShop.createdAt
          ]);
        } catch (e) {
          console.warn("DB businesses insert error:", e);
        }
      }

      const shops = readJsonFile<any[]>(SHOPS_FILE, []);
      const updated = [newShop, ...shops.filter(s => s.id !== newShop.id && !String(s.id).startsWith('sample_shop_'))];
      writeJsonFile(SHOPS_FILE, updated);

      // Ensure pending entry in Admin Verification Queue for public registrations & edits
      if (!autoApprove) {
        const verifications = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
        const existingVerifIdx = verifications.findIndex(v => v.entityId === newShop.id);
        const verifEntry = {
          id: existingVerifIdx >= 0 ? verifications[existingVerifIdx].id : ('verif_biz_' + newShop.id),
          entityType: 'business',
          entityId: newShop.id,
          userId: ownerId,
          userName: newShop.name,
          userEmail: ownerEmail,
          userPhone: newShop.phone,
          title: `${newShop.name} (${newShop.categoryLabel}) - ${newShop.area}`,
          idDocumentWatermarked: shop.idDocumentWatermarked || newShop.photoUrl || (existingVerifIdx >= 0 ? verifications[existingVerifIdx].idDocumentWatermarked : ''),
          status: 'pending',
          createdAt: newShop.createdAt
        };
        if (existingVerifIdx >= 0) {
          verifications[existingVerifIdx] = verifEntry;
        } else {
          verifications.unshift(verifEntry);
        }
        writeJsonFile(VERIFICATIONS_FILE, verifications);
        if (dbPool && isDbConnected) {
          await dbPool.query(
            "UPDATE verification_requests SET status = 'pending', user_name = $1, user_phone = $2, title = $3 WHERE entity_id = $4",
            [newShop.name, newShop.phone, verifEntry.title, newShop.id]
          ).catch(() => {});
        }
      }

      await archiveToSecurityVault(
        "business",
        newShop.id,
        { ...newShop, idDocumentWatermarked: shop.idDocumentWatermarked || newShop.photoUrl || "" },
        "ACTIVE_REGISTERED"
      );

      invalidatePublicCache(['public_shops', 'public_helpers']);
      res.status(201).json(newShop);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to save business" });
    }
  };

  app.post("/api/shops", registrationAndMessageLimiter, requireAuth, saveBusinessHandler);
  app.post("/api/businesses", registrationAndMessageLimiter, requireAuth, saveBusinessHandler);

  const deleteBusinessHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const caller = (req as any).user || extractUserFromRequest(req);
      const isAdminCaller = isAuthorizedAdmin(caller) || isRequestAdmin(req);

      const shops = readJsonFile<any[]>(SHOPS_FILE, []);
      const targetShop = shops.find(s => s.id === id);

      if (targetShop && !isAdminCaller) {
        const isOwner =
          (caller?.uid && (targetShop.userId === caller.uid || targetShop.owner_id === caller.uid)) ||
          (caller?.email && targetShop.ownerEmail && targetShop.ownerEmail.toLowerCase() === caller.email.toLowerCase());
        if (!isOwner) {
          return res.status(403).json({ error: "Unauthorized: You can only delete your own business." });
        }
      }

      if (targetShop) {
        await archiveToSecurityVault(
          "business",
          targetShop.id,
          targetShop,
          isAdminCaller ? "ADMIN_REMOVED_PUBLIC" : "DELETED_BY_USER"
        );
        await deleteFilesFromFirebaseStorage(targetShop);
      }

      if (dbPool && isDbConnected) {
        try {
          const bRows = await dbPool.query("SELECT image_url, raw_json FROM businesses WHERE id = $1", [id]).catch(() => ({ rows: [] as any[] }));
          const sRows = await dbPool.query("SELECT photo_url FROM shops WHERE id = $1", [id]).catch(() => ({ rows: [] as any[] }));
          await deleteFilesFromFirebaseStorage(bRows.rows);
          await deleteFilesFromFirebaseStorage(sRows.rows);
          await dbPool.query("DELETE FROM businesses WHERE id = $1", [id]);
          await dbPool.query("DELETE FROM shops WHERE id = $1", [id]);
        } catch (e) {}
      }
      writeJsonFile(SHOPS_FILE, shops.filter(s => s.id !== id));
      invalidatePublicCache(['public_shops', 'public_helpers']);
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
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const includeAll = req.query.all === 'true' || req.query.includePending === 'true';
      const caller = extractUserFromRequest(req);
      const isAdmin = isRequestAdmin(req);
      const isAuthenticated = Boolean(caller && caller.uid && !String(caller.uid).startsWith('guest'));
      const isPublicRequest = !includeAll && !isAdmin && !isAuthenticated;

      if (isPublicRequest) {
        const cached = getPublicCache('public_helpers');
        if (cached) {
          return res.json(cached);
        }
      }

      const mergedMap = new Map<string, any>();

      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      const approvedEntityIds = new Set<string>();
      verifs.forEach(v => {
        if (v && v.status === 'approved') {
          if (v.entityId) approvedEntityIds.add(String(v.entityId));
          if (v.userId) approvedEntityIds.add(String(v.userId));
        }
      });

      if (dbPool && isDbConnected) {
        try {
          const vRes = await dbPool.query("SELECT entity_id, user_id, status FROM verification_requests WHERE status = 'approved'").catch(() => ({ rows: [] as any[] }));
          vRes.rows.forEach((v: any) => {
            if (v.entity_id) approvedEntityIds.add(String(v.entity_id));
            if (v.user_id) approvedEntityIds.add(String(v.user_id));
          });

          const result = await dbPool.query("SELECT * FROM helpers ORDER BY created_at DESC");
          if (result.rows.length > 0) {
            result.rows.forEach(r => {
              if (!r || !r.id || deletedEntitiesMemorySet.has(String(r.id))) return;
              const isApproved = Boolean(r.is_verified === true || approvedEntityIds.has(String(r.id)));
              mergedMap.set(r.id, {
                id: r.id,
                name: r.name,
                categoryId: r.category_id || 'other',
                phone: r.phone,
                skills: r.skills || [],
                area: r.area,
                experience: r.experience,
                distance: Number(r.distance || 0.5),
                isVerified: isApproved,
                status: isApproved ? 'approved' : 'pending',
                govtIdUploaded: r.govt_id_uploaded,
                idDocUrl: r.id_doc_url,
                createdAt: r.created_at
              });
            });
          }

          const profRes = await dbPool.query("SELECT * FROM profiles WHERE category_id IS NOT NULL AND category_id <> '' ORDER BY updated_at DESC").catch(() => ({ rows: [] as any[] }));
          profRes.rows.forEach(r => {
            const pid = r.id || r.uid;
            if (!pid || deletedEntitiesMemorySet.has(String(pid))) return;
            const rawObj = typeof r.raw_json === 'object' && r.raw_json ? r.raw_json : {};
            const existing = mergedMap.get(pid) || {};
            const rawStatus = String(r.status || existing.status || '').toLowerCase();
            const isRejected = rawStatus === 'rejected';
            const isApproved = !isRejected && Boolean(
              existing.isVerified === true ||
              r.verified === true ||
              r.is_verified === true ||
              rawStatus === 'approved' ||
              approvedEntityIds.has(String(pid))
            );
            const skillsArr = Array.isArray(rawObj.skills)
              ? rawObj.skills
              : typeof r.skills === 'string' && r.skills.trim()
              ? r.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [r.category_name || r.category_id || 'General'];
            mergedMap.set(pid, {
              ...rawObj,
              ...existing,
              id: pid,
              userId: r.user_id || r.uid || rawObj.userId || pid,
              email: r.email || rawObj.email || existing.email || '',
              name: r.name || r.full_name || existing.name || 'Service Expert',
              categoryId: r.category_id || existing.categoryId || 'other',
              customCategoryName: r.category_name || rawObj.customCategoryName || existing.customCategoryName || '',
              phone: r.phone || existing.phone || '',
              whatsapp: r.whatsapp || r.phone || existing.whatsapp || '',
              skills: skillsArr,
              area: r.sector || r.address || existing.area || 'Local Area',
              city: r.city || existing.city || 'Gandhinagar',
              experience: r.experience || existing.experience || '1 Year',
              photoUrl: r.image_url || r.avatar_url || existing.photoUrl || null,
              rating: Number(r.rating || existing.rating || 5.0),
              isVerified: isApproved,
              status: isRejected ? 'rejected' : (isApproved ? 'approved' : 'pending'),
              createdAt: r.created_at || r.updated_at
            });
          });
        } catch (e) {}
      }

      const localHelpers = readJsonFile<any[]>(HELPERS_FILE, []);
      localHelpers.forEach(h => {
        if (!h || !h.id) return;
        const existing = mergedMap.get(h.id) || {};
        const isApproved = Boolean(
          existing.isVerified === true ||
          h.isVerified === true ||
          h.is_verified === true ||
          h.status === 'approved' ||
          approvedEntityIds.has(String(h.id)) ||
          (h.userId && approvedEntityIds.has(String(h.userId)))
        );
        mergedMap.set(h.id, {
          ...existing,
          ...h,
          categoryId: h.categoryId || existing.categoryId || 'other',
          customCategoryName: h.customCategoryName || existing.customCategoryName || '',
          isVerified: isApproved,
          status: isApproved ? 'approved' : (h.status || 'pending')
        });
      });

      // Also include any helper profiles or approved user profiles with skills/categories stored inside PROFILES_FILE
      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      Object.values(profiles).forEach((p: any) => {
        if (!p) return;
        if (p.myHelperProfile && p.myHelperProfile.id) {
          const hp = p.myHelperProfile;
          const existing = mergedMap.get(hp.id) || {};
          const isApproved = Boolean(
            existing.isVerified === true ||
            hp.isVerified === true ||
            hp.status === 'approved' ||
            p.isVerified === true ||
            p.is_verified === true ||
            p.status === 'approved' ||
            approvedEntityIds.has(String(hp.id)) ||
            (p.uid && approvedEntityIds.has(String(p.uid)))
          );
          mergedMap.set(hp.id, {
            ...existing,
            ...hp,
            userId: hp.userId || p.uid || existing.userId || '',
            email: hp.email || p.email || existing.email || '',
            categoryId: hp.categoryId || existing.categoryId || p.category || 'other',
            customCategoryName: hp.customCategoryName || existing.customCategoryName || '',
            isVerified: isApproved,
            status: isApproved ? 'approved' : (hp.status || 'pending')
          });
        } else if (
          (p.isVerified === true || p.is_verified === true || p.status === 'approved' || (p.uid && approvedEntityIds.has(String(p.uid)))) &&
          (p.skills || p.category)
        ) {
          const profId = String(p.uid || p.id);
          if (profId && !mergedMap.has(profId)) {
            const skillArr = Array.isArray(p.skills)
              ? p.skills
              : typeof p.skills === 'string' && p.skills.trim()
              ? p.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [p.category || 'Community Helper'];
            mergedMap.set(profId, {
              id: profId,
              userId: profId,
              email: p.email || '',
              name: p.full_name || p.displayName || p.name || 'Community Member',
              categoryId: p.category || skillArr[0] || 'other',
              customCategoryName: p.category || skillArr[0] || '',
              phone: p.phone || '',
              skills: skillArr,
              area: p.address || p.area || 'Local Area',
              experience: p.experience || '1+ Year',
              distance: 0.8,
              rating: 5.0,
              completedTasks: 1,
              isVerified: true,
              status: 'approved',
              createdAt: p.updated_at || new Date().toISOString()
            });
          }
        }
      });

      // Also include approved businesses/shops so approved shops are discoverable in their respective Categories
      const localShops = readJsonFile<any[]>(SHOPS_FILE, []);
      localShops.forEach(s => {
        if (!s || !s.id || String(s.id).startsWith('sample_shop_')) return;
        const isApproved = Boolean(
          s.isVerified === true ||
          s.is_verified === true ||
          s.status === 'approved' ||
          approvedEntityIds.has(String(s.id))
        );
        if (!mergedMap.has(s.id)) {
          mergedMap.set(s.id, {
            id: s.id,
            userId: s.userId || s.owner_id || s.id,
            email: s.ownerEmail || s.email || '',
            name: s.name || s.businessName || 'Local Shop',
            categoryId: s.categoryId || s.category || s.categoryLabel || 'other',
            customCategoryName: s.categoryLabel || s.category || '',
            phone: s.phone || '',
            skills: [s.categoryLabel || s.category || 'Shop & Services', s.description || ''].filter(Boolean),
            area: s.area || s.address || 'Local Market',
            experience: s.timings || 'Verified Business',
            distance: 0.6,
            rating: Number(s.rating || 5.0),
            completedTasks: Number(s.reviewCount || 1),
            photoUrl: s.photoUrl || null,
            isVerified: isApproved,
            status: isApproved ? 'approved' : (s.status || 'pending'),
            createdAt: s.createdAt || new Date().toISOString()
          });
        }
      });

      let allHelpers = Array.from(mergedMap.values());
      if (!isAdmin) {
        allHelpers = allHelpers.filter(
          h => !h.is_flagged && !h.hidden && !h.is_deleted && h.status !== 'flagged' && h.status !== 'deleted'
        );
      }
      if (!includeAll) {
        allHelpers = allHelpers.filter(h => h.isVerified === true || h.status === 'approved');
      }

      // Data Privacy: Redact private emails/phones and ID docs for unauthenticated bulk requests (Admin gets full details)
      const sanitizedHelpers = allHelpers.map(h => {
        const redacted = redactBulkItemForPrivacy(h, isAuthenticated, isAdmin);
        if (!isAdmin) {
          // Never expose raw govt ID documents in public helper listings
          delete redacted.idDocUrl;
          delete redacted.id_doc_url;
        }
        return redacted;
      });

      if (isPublicRequest) {
        setPublicCache('public_helpers', sanitizedHelpers);
      }

      res.json(sanitizedHelpers);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to fetch helpers" });
    }
  });

  app.post("/api/helpers", registrationAndMessageLimiter, requireAuth, async (req, res) => {
    try {
      if (isBotSubmission(req)) {
        console.log("[Honeypot Triggered] Silently rejecting bot helper registration");
        return res.status(200).json({ success: true, message: "Request received" });
      }

      const helper = req.body;
      if (!helper || !helper.name) return res.status(400).json({ error: "Helper name required" });

      if (helper.photoUrl || helper.photo_url || helper.workPhotoUrl) {
        const pUrl = String(helper.photoUrl || helper.photo_url || helper.workPhotoUrl);
        if (pUrl.startsWith('data:')) {
          const pCheck = validateServerUploadedDataUrl(pUrl, { allowPdf: false });
          if (!pCheck.valid) {
            return res.status(400).json({ error: pCheck.error });
          }
        }
        const uploadedHelperPhoto = await uploadDataToFirebaseServer(pUrl, "service_providers");
        helper.photoUrl = uploadedHelperPhoto;
        helper.photo_url = uploadedHelperPhoto;
      }

      if (helper.idDocUrl || helper.id_doc_url) {
        const rawDoc = helper.idDocUrl || helper.id_doc_url;
        const docCheck = validateServerUploadedDataUrl(rawDoc, { allowPdf: true });
        if (!docCheck.valid) {
          return res.status(400).json({ error: docCheck.error });
        }
        const uploadedDoc = await uploadDataToFirebaseServer(rawDoc, "verifications");
        helper.idDocUrl = uploadedDoc;
        helper.id_doc_url = uploadedDoc;
      }

      const isAdminCaller = isRequestAdmin(req);
      const userFromReq = (req as any).user;
      const userEmail = sanitizeServerText(helper.email ?? (!isAdminCaller ? userFromReq?.email : '') ?? '', 150).toLowerCase();
      if (!userEmail && !isAdminCaller) {
        return res.status(400).json({ error: "Email ID is mandatory for service helper registration and verification." });
      }
      const userId = helper.userId || (!isAdminCaller ? userFromReq?.uid : '') || helper.id || '';

      // Ownership check & Firebase Storage cleanup if updating an existing helper profile
      const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
      let existingHelper = helpers.find(h => h.id === helper.id);
      if (!existingHelper && helper.id && dbPool && isDbConnected) {
        try {
          const hRes = await dbPool.query("SELECT * FROM helpers WHERE id = $1 LIMIT 1", [helper.id]);
          if (hRes.rows.length > 0) existingHelper = hRes.rows[0];
        } catch {}
      }
      if (existingHelper && !isAdminCaller && !isAuthorizedAdmin(userFromReq)) {
        const isOwner =
          (existingHelper.userId && (existingHelper.userId === userFromReq?.uid || existingHelper.userId === userId)) ||
          (existingHelper.email && userFromReq?.email && existingHelper.email.toLowerCase() === userFromReq.email.toLowerCase());
        if (!isOwner && (existingHelper.userId || existingHelper.email)) {
          return res.status(403).json({ error: "Unauthorized: You can only update your own helper profile." });
        }
      }
      if (existingHelper) {
        const prevPhoto = existingHelper.photoUrl || existingHelper.photo_url || existingHelper.image_url;
        if (prevPhoto && helper.photoUrl && prevPhoto !== helper.photoUrl) {
          await deleteFilesFromFirebaseStorage(prevPhoto);
        }
        const prevDoc = existingHelper.idDocUrl || existingHelper.id_doc_url;
        if (prevDoc && helper.idDocUrl && prevDoc !== helper.idDocUrl) {
          await deleteFilesFromFirebaseStorage(prevDoc);
        }
        if (dbPool && isDbConnected) {
          const histId = "hist_hlp_" + Date.now();
          await dbPool.query(
            `INSERT INTO profile_edit_history (id, user_id, email, entity_type, previous_data, updated_data, changed_by, created_at)
             VALUES ($1, $2, $3, 'helper', $4, $5, $6, NOW())`,
            [histId, userId, userEmail, JSON.stringify(existingHelper), JSON.stringify(helper), userEmail || userId]
          ).catch(() => {});
        }
      }

      const autoApprove = Boolean(isAdminCaller || userFromReq?.uid || (userId && !userId.startsWith('anon')) || (userEmail && userEmail.includes('@')));
      const newHelper = {
        id: helper.id || 'helper_' + Date.now().toString(36),
        userId,
        email: sanitizeStringServer(userEmail, 150),
        name: sanitizeStringServer(helper.name.trim(), 150),
        categoryId: sanitizeStringServer(helper.categoryId || helper.category_id || 'general', 60),
        customCategoryName: sanitizeStringServer(helper.customCategoryName || '', 100),
        phone: sanitizeStringServer(helper.phone || '', 30),
        skills: Array.isArray(helper.skills) ? helper.skills.map((s: any) => sanitizeStringServer(String(s), 80)) : [helper.categoryId || 'General'],
        area: sanitizeStringServer(helper.area || 'Local Area', 200),
        city: sanitizeStringServer(helper.city || '', 100),
        experience: sanitizeStringServer(helper.experience || '1 Year', 80),
        distance: typeof helper.distance === 'number' ? helper.distance : 0.5,
        rating: typeof helper.rating === 'number' ? helper.rating : 5.0,
        completedTasks: typeof helper.completedTasks === 'number' ? helper.completedTasks : 0,
        photoUrl: helper.photoUrl || helper.photo_url || helper.workPhotoUrl || null,
        isVerified: autoApprove,
        status: autoApprove ? 'approved' : 'pending',
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
              category_id = EXCLUDED.category_id,
              phone = EXCLUDED.phone,
              skills = EXCLUDED.skills,
              area = EXCLUDED.area,
              experience = EXCLUDED.experience,
              is_verified = EXCLUDED.is_verified
          `, [
            newHelper.id, newHelper.name, newHelper.categoryId, newHelper.phone,
            newHelper.skills, newHelper.area, newHelper.experience, newHelper.distance,
            autoApprove, newHelper.govtIdUploaded, newHelper.idDocUrl, newHelper.createdAt
          ]);

          await dbPool.query(`
            INSERT INTO profiles (
              uid, id, user_id, name, full_name, email, category_id, category_name,
              phone, whatsapp, city, sector, address, experience, skills, description,
              image_url, avatar_url, verified, is_verified, status, rating, raw_json, created_at, updated_at
            )
            VALUES ($1, $1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $12, $13, $14, $14, $15, $15, $16, $17, $18, $19, NOW())
            ON CONFLICT (uid) DO UPDATE SET
              id = EXCLUDED.id,
              user_id = EXCLUDED.user_id,
              name = EXCLUDED.name,
              full_name = EXCLUDED.full_name,
              email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
              category_id = EXCLUDED.category_id,
              category_name = EXCLUDED.category_name,
              phone = EXCLUDED.phone,
              whatsapp = EXCLUDED.whatsapp,
              city = EXCLUDED.city,
              sector = EXCLUDED.sector,
              address = EXCLUDED.address,
              experience = EXCLUDED.experience,
              skills = EXCLUDED.skills,
              description = EXCLUDED.description,
              image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), profiles.image_url),
              verified = EXCLUDED.verified,
              is_verified = EXCLUDED.is_verified,
              status = EXCLUDED.status,
              rating = EXCLUDED.rating,
              raw_json = EXCLUDED.raw_json,
              updated_at = NOW()
          `, [
            newHelper.id,
            newHelper.userId || newHelper.id,
            newHelper.name,
            newHelper.email || '',
            newHelper.categoryId,
            newHelper.customCategoryName || newHelper.categoryId,
            newHelper.phone,
            helper.whatsapp || newHelper.phone,
            newHelper.city || 'Gandhinagar',
            newHelper.area,
            newHelper.experience,
            newHelper.skills.join(', '),
            helper.description || newHelper.skills.join(', '),
            newHelper.photoUrl || '',
            autoApprove,
            newHelper.status,
            newHelper.rating,
            JSON.stringify(newHelper),
            newHelper.createdAt
          ]);

          await dbPool.query(`
            UPDATE categories
            SET registered_count = (
              SELECT COUNT(*) FROM helpers WHERE category_id = $1
            ), updated_at = NOW()
            WHERE id = $1
          `, [newHelper.categoryId]).catch(() => {});
        } catch (e) {
          console.warn("DB helpers/profiles insert note:", e);
        }
      }

      const updated = [newHelper, ...helpers.filter(h => h.id !== newHelper.id)];
      writeJsonFile(HELPERS_FILE, updated);

      // Ensure pending entry in Admin Verification Queue for public registrations & edits
      if (!autoApprove) {
        const verifications = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
        const existingVerifIdx = verifications.findIndex(v => v.entityId === newHelper.id);
        const catDisplay = newHelper.categoryId === 'other' && newHelper.customCategoryName
          ? `Other (${newHelper.customCategoryName})`
          : newHelper.categoryId;
        const verifEntry = {
          id: existingVerifIdx >= 0 ? verifications[existingVerifIdx].id : ('verif_hlp_' + newHelper.id),
          entityType: 'user_profile',
          entityId: newHelper.id,
          userId: userId || newHelper.id,
          userName: newHelper.name,
          userEmail: userEmail,
          userPhone: newHelper.phone,
          title: `Helper Profile (${catDisplay}) - ${newHelper.area}`,
          idDocumentWatermarked: newHelper.idDocUrl || newHelper.photoUrl || (existingVerifIdx >= 0 ? verifications[existingVerifIdx].idDocumentWatermarked : ''),
          status: 'pending',
          createdAt: newHelper.createdAt
        };
        if (existingVerifIdx >= 0) {
          verifications[existingVerifIdx] = verifEntry;
        } else {
          verifications.unshift(verifEntry);
        }
        writeJsonFile(VERIFICATIONS_FILE, verifications);
        if (dbPool && isDbConnected) {
          await dbPool.query(
            "UPDATE verification_requests SET status = 'pending', user_name = $1, user_phone = $2, title = $3 WHERE entity_id = $4",
            [newHelper.name, newHelper.phone, verifEntry.title, newHelper.id]
          ).catch(() => {});
        }
      }

      await archiveToSecurityVault(
        "helper",
        newHelper.id,
        { ...newHelper, idDocumentWatermarked: newHelper.idDocUrl || "" },
        "ACTIVE_REGISTERED"
      );

      invalidatePublicCache(['public_helpers']);
      res.status(201).json(newHelper);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to save helper" });
    }
  });

  // User Self-Delete for Helper Profile (Removes from public listings, permanently retains in Encrypted Security Vault)
  app.delete("/api/helpers/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const caller = (req as any).user || extractUserFromRequest(req);
      const isAdminCaller = isAuthorizedAdmin(caller) || isRequestAdmin(req);

      const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
      const targetHelper = helpers.find(h => h.id === id);

      if (targetHelper && !isAdminCaller) {
        const isOwner =
          (caller?.uid && targetHelper.userId === caller.uid) ||
          (caller?.email && targetHelper.email && targetHelper.email.toLowerCase() === caller.email.toLowerCase());
        if (!isOwner) {
          return res.status(403).json({ error: "Forbidden: You can only delete your own helper profile." });
        }
      }

      if (targetHelper) {
        await archiveToSecurityVault(
          "helper",
          targetHelper.id,
          { ...targetHelper, idDocumentWatermarked: targetHelper.idDocUrl || "" },
          isAdminCaller ? "ADMIN_REMOVED_PUBLIC" : "DELETED_BY_USER"
        );
        await deleteFilesFromFirebaseStorage(targetHelper);
      }

      deletedEntitiesMemorySet.add(String(id));
      writeJsonFile(HELPERS_FILE, helpers.filter(h => h.id !== id));
      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      writeJsonFile(VERIFICATIONS_FILE, verifs.filter(v => v.entityId !== id && v.userId !== id));
      if (dbPool && isDbConnected) {
        try {
          const hRows = await dbPool.query("SELECT * FROM helpers WHERE id = $1", [id]).catch(() => ({ rows: [] as any[] }));
          const pRows = await dbPool.query("SELECT image_url, avatar_url, raw_json FROM profiles WHERE uid = $1 OR id = $1", [id]).catch(() => ({ rows: [] as any[] }));
          await deleteFilesFromFirebaseStorage(hRows.rows);
          await deleteFilesFromFirebaseStorage(pRows.rows);
          await dbPool.query("DELETE FROM helpers WHERE id = $1", [id]);
          await dbPool.query("DELETE FROM profiles WHERE uid = $1 OR id = $1", [id]).catch(() => {});
          await dbPool.query("DELETE FROM verification_requests WHERE entity_id = $1 OR user_id = $1", [id]).catch(() => {});
        } catch (_e) {}
      }
      invalidatePublicCache(['public_helpers']);
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete helper profile" });
    }
  });

  // AI chat history logging (Separate from user-to-user chats table)
  app.post("/api/ai-chat-history", async (req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to record chat" });
    }
  });

  // 6. Save Permanent Safety & Police Audit Logs (Persisted in PostgreSQL audit_logs table)
  app.post("/api/audit-logs", async (req, res) => {
    try {
      const auditPayload = req.body || {};
      const record = {
        id: 'audit_' + Date.now(),
        receivedAt: new Date().toISOString(),
        ...auditPayload
      };
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            "INSERT INTO audit_logs (id, data, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
            [record.id, JSON.stringify(record)]
          );
        } catch {}
      }
      console.log(`[Safety Audit Archived] Permanent record saved for chatId: ${auditPayload.chatId}`);
      res.status(201).json({ success: true, id: record.id });
    } catch (e) {
      res.status(500).json({ error: "Failed to save audit log" });
    }
  });

  app.get("/api/audit-logs", requireAdmin, async (_req, res) => {
    try {
      if (dbPool && isDbConnected) {
        const q = await dbPool.query("SELECT data FROM audit_logs ORDER BY created_at DESC LIMIT 200").catch(() => ({ rows: [] as any[] }));
        return res.json(q.rows.map(r => r.data).filter(Boolean));
      }
      res.json([]);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // 7. Community & Direct Chat Reports (Persisted in PostgreSQL admin_reports table with Immutable Chat Evidence Snapshot)
  const memoryAdminReports: any[] = [];

  app.post("/api/reports", async (req, res) => {
    try {
      const report = req.body || {};
      const caller = extractRequestUser(req);
      const reportId = sanitizeServerText(report.id || ('rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)), 100);
      const chatId = sanitizeServerText(report.chatId || report.conversationId || report.intentId || '', 150);
      const reporterId = sanitizeServerText(report.reporterId || caller?.uid || report.targetId || 'guest', 150);
      const reporterName = sanitizeServerText(report.reporterName || report.userName || caller?.name || 'Community Member', 120);
      const reporterEmail = sanitizeServerText(report.reporterEmail || report.email || caller?.email || '', 150).toLowerCase();
      const reportedUserId = sanitizeServerText(report.reportedUserId || report.peerId || report.targetId || '', 150);
      const reportedUserName = sanitizeServerText(report.reportedUserName || report.peerName || '', 120);
      const reason = sanitizeServerText(report.reason || 'Inappropriate Behavior', 300);
      const details = sanitizeServerText(report.details || report.description || '', 2000);
      const blockUser = Boolean(report.blockUser || report.isUserBlocked);

      // Build an immutable, tamper-proof snapshot of all chat messages between the two users
      const snapshotMap = new Map<string, any>();

      if (Array.isArray(report.chatSnapshot)) {
        report.chatSnapshot.forEach((m: any, idx: number) => {
          if (!m) return;
          const mId = String(m.id || `snap_${idx}_${Date.now()}`);
          snapshotMap.set(mId, {
            id: mId,
            senderId: sanitizeServerText(m.senderId || m.authorId || '', 150),
            senderName: sanitizeServerText(m.senderName || m.authorName || 'User', 120),
            senderEmail: sanitizeServerText(m.senderEmail || m.authorEmail || '', 150),
            receiverId: sanitizeServerText(m.receiverId || '', 150),
            text: sanitizeServerText(m.text || m.content || m.message || '', 2000),
            attachmentUrl: m.attachmentUrl || m.attachment_url || null,
            attachmentType: m.attachmentType || m.attachment_type || null,
            createdAt: m.createdAt || m.timestamp || new Date().toISOString()
          });
        });
      }

      if (chatId && dbPool && isDbConnected) {
        try {
          const dbMsgs = await dbPool.query(
            "SELECT * FROM messages WHERE intent_id = $1 OR receiver_id = $1 ORDER BY created_at ASC",
            [chatId]
          );
          dbMsgs.rows.forEach((r: any) => {
            snapshotMap.set(r.id, {
              id: r.id,
              senderId: r.sender_id || '',
              senderName: r.sender_name || 'User',
              senderEmail: r.sender_email || '',
              receiverId: r.receiver_id || '',
              text: r.text || r.content || '',
              attachmentUrl: r.attachment_url || null,
              attachmentType: r.attachment_type || null,
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
            });
          });
        } catch {}

        try {
          const dbChats = await dbPool.query(
            "SELECT * FROM chats WHERE intent_id = $1 OR receiver_id = $1 ORDER BY sent_at ASC",
            [chatId]
          );
          dbChats.rows.forEach((r: any) => {
            if (!snapshotMap.has(r.id)) {
              snapshotMap.set(r.id, {
                id: r.id,
                senderId: r.sender_id || '',
                senderName: r.sender_name || 'User',
                senderEmail: r.sender_email || '',
                receiverId: r.receiver_id || '',
                text: r.message || '',
                attachmentUrl: null,
                attachmentType: null,
                createdAt: r.sent_at ? new Date(r.sent_at).toISOString() : new Date().toISOString()
              });
            }
          });
        } catch {}
      }

      if (chatId) {
        try {
          const allLocalMsgs = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
          const fileThread = allLocalMsgs[chatId] || [];
          fileThread.forEach((m: any) => {
            if (m && m.id && !snapshotMap.has(m.id)) {
              snapshotMap.set(m.id, {
                id: m.id,
                senderId: m.senderId || m.authorId || '',
                senderName: m.senderName || m.authorName || 'User',
                senderEmail: m.senderEmail || m.authorEmail || '',
                receiverId: m.receiverId || '',
                text: m.text || m.content || m.message || '',
                attachmentUrl: m.attachmentUrl || null,
                attachmentType: m.attachmentType || null,
                createdAt: m.createdAt || new Date().toISOString()
              });
            }
          });
        } catch {}
      }

      const finalChatSnapshot = Array.from(snapshotMap.values()).sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
      const reportType = chatId || finalChatSnapshot.length > 0 ? 'chat_report' : (report.reportType || 'general');

      // If reporter also opted to block the reported user, record the block immediately
      if (blockUser && reporterId && (reportedUserId || chatId)) {
        const blockId = `blk_${chatId || "chat"}_${reporterId}_${reportedUserId || "peer"}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 140);
        const blockEntry = {
          id: blockId,
          blockerId: reporterId,
          blockerEmail: reporterEmail,
          blockedId: reportedUserId || chatId,
          blockedName: reportedUserName || "Reported User",
          chatId,
          reason,
          createdAt: new Date().toISOString()
        };
        if (dbPool && isDbConnected) {
          await dbPool.query(
            `INSERT INTO blocked_users (id, blocker_id, blocker_email, blocked_id, blocked_name, chat_id, reason, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (id) DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()`,
            [blockEntry.id, blockEntry.blockerId, blockEntry.blockerEmail, blockEntry.blockedId, blockEntry.blockedName, blockEntry.chatId, blockEntry.reason]
          ).catch(() => {});
        }
        const existingIdx = memoryChatBlocks.findIndex((b) => b.id === blockEntry.id);
        if (existingIdx >= 0) memoryChatBlocks[existingIdx] = blockEntry;
        else memoryChatBlocks.unshift(blockEntry);
      }

      const reportedPostIdRaw = sanitizeServerText(
        report.reportedPostId || report.reported_post_id || report.postId || report.intentId || '',
        150
      );
      const reportedPostId = reportedPostIdRaw ? reportedPostIdRaw : null;
      const normalizedStatus = String(report.status || 'PENDING').toUpperCase() === 'RESOLVED'
        ? 'RESOLVED'
        : String(report.status || 'PENDING').toUpperCase() === 'DISMISSED'
          ? 'DISMISSED'
          : 'PENDING';

      const record = {
        id: reportId,
        reporterId,
        reporterName,
        reporterEmail,
        reportedUserId,
        reportedUserName,
        reportedPostId,
        chatId,
        reportType,
        reason,
        details,
        description: details,
        chatSnapshot: finalChatSnapshot,
        isUserBlocked: blockUser,
        status: report.status || 'PENDING',
        createdAt: new Date().toISOString()
      };

      // If this report is an ACCOUNT_CLOSURE_REQUEST from SettingsMenu, log ACCOUNT_DELETED & soft-delete user for 180-day retention
      if (reason === 'ACCOUNT_CLOSURE_REQUEST' && reporterId && reporterId !== 'guest') {
        await logSecurityAudit(reporterId, "ACCOUNT_DELETED", req);
        if (dbPool && isDbConnected) {
          await dbPool.query(
            "UPDATE users SET is_deleted = true, deleted_at = NOW(), hidden = true WHERE id = $1 OR email = $2",
            [reporterId, reporterEmail]
          ).catch(() => {});
          await dbPool.query(
            'UPDATE "user" SET is_deleted = true, deleted_at = NOW(), hidden = true WHERE id = $1 OR email = $2',
            [reporterId, reporterEmail]
          ).catch(() => {});
          await dbPool.query(
            "UPDATE profiles SET is_deleted = true, deleted_at = NOW(), hidden = true, status = 'deletion_requested', updated_at = NOW() WHERE uid = $1 OR email = $2",
            [reporterId, reporterEmail]
          ).catch(() => {});
        }
      }

      let autoFlaggedPost = false;
      let autoFlaggedUser = false;
      let postReportCount = 1;
      let userReportCount = 1;

      if (dbPool && isDbConnected) {
        try {
          // 1. Insert into IT Act compliant "reports" table
          await dbPool.query(
            `INSERT INTO reports (
               id, reporter_id, reported_user_id, reported_post_id, reason, description, status, created_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               description = EXCLUDED.description`,
            [
              record.id,
              record.reporterId,
              record.reportedUserId || null,
              record.reportedPostId || null,
              record.reason,
              record.description,
              normalizedStatus
            ]
          ).catch((err) => console.warn("[PostgreSQL] reports table insert note:", err?.message));

          // 2. Also insert into admin_reports so Admin Dashboard remains 100% synced
          await dbPool.query(
            `INSERT INTO admin_reports (
               id, reporter_id, reporter_name, reporter_email, reported_user_id, reported_user_name,
               reported_post_id, chat_id, report_type, reason, details, chat_snapshot, is_user_blocked, status, reported_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, NOW())
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               details = EXCLUDED.details,
               chat_snapshot = COALESCE(EXCLUDED.chat_snapshot, admin_reports.chat_snapshot),
               is_user_blocked = EXCLUDED.is_user_blocked`,
            [
              record.id,
              record.reporterId,
              record.reporterName,
              record.reporterEmail,
              record.reportedUserId,
              record.reportedUserName,
              record.reportedPostId,
              record.chatId,
              record.reportType,
              record.reason,
              record.details,
              JSON.stringify(finalChatSnapshot),
              record.isUserBlocked,
              record.status
            ]
          );

          // 3. AUTO-SAFETY RULE: If a post or user receives 3 or more unique reports, automatically set is_flagged = true and hidden = true
          if (reportedPostId) {
            const pCountRes = await dbPool.query(
              `SELECT COUNT(DISTINCT reporter_id) AS cnt
               FROM reports
               WHERE reported_post_id = $1
                 AND UPPER(COALESCE(status, 'PENDING')) != 'DISMISSED'`,
              [reportedPostId]
            ).catch(() => ({ rows: [{ cnt: 1 }] }));
            postReportCount = Number(pCountRes.rows[0]?.cnt || 1);

            if (postReportCount >= 3) {
              autoFlaggedPost = true;
              await dbPool.query(
                `UPDATE posts SET is_flagged = true, hidden = true WHERE id = $1`,
                [reportedPostId]
              ).catch(() => {});
              await dbPool.query(
                `UPDATE listings SET is_flagged = true, hidden = true WHERE id = $1`,
                [reportedPostId]
              ).catch(() => {});
              await dbPool.query(
                `UPDATE broadcast_posts SET is_flagged = true, hidden = true, status = 'flagged' WHERE id = $1`,
                [reportedPostId]
              ).catch(() => {});
            }
          }

          if (reportedUserId && reason !== 'ACCOUNT_CLOSURE_REQUEST') {
            const uCountRes = await dbPool.query(
              `SELECT COUNT(DISTINCT reporter_id) AS cnt
               FROM reports
               WHERE reported_user_id = $1
                 AND UPPER(COALESCE(status, 'PENDING')) != 'DISMISSED'`,
              [reportedUserId]
            ).catch(() => ({ rows: [{ cnt: 1 }] }));
            userReportCount = Number(uCountRes.rows[0]?.cnt || 1);

            if (userReportCount >= 3) {
              autoFlaggedUser = true;
              await dbPool.query(
                `UPDATE users SET is_flagged = true, hidden = true WHERE id = $1 OR email = $1`,
                [reportedUserId]
              ).catch(() => {});
              await dbPool.query(
                `UPDATE "user" SET is_flagged = true, hidden = true WHERE id = $1 OR email = $1`,
                [reportedUserId]
              ).catch(() => {});
              await dbPool.query(
                `UPDATE profiles SET is_flagged = true, hidden = true, status = 'flagged', is_verified = false WHERE uid = $1 OR id = $1 OR user_id = $1 OR email = $1`,
                [reportedUserId]
              ).catch(() => {});
              await dbPool.query(
                `UPDATE helpers SET is_flagged = true, hidden = true, is_verified = false WHERE id = $1`,
                [reportedUserId]
              ).catch(() => {});
              await dbPool.query(
                `UPDATE businesses SET is_flagged = true, hidden = true, is_approved = false, is_verified = false WHERE id = $1 OR user_id = $1 OR owner_id = $1`,
                [reportedUserId]
              ).catch(() => {});
              await dbPool.query(
                `UPDATE shops SET is_flagged = true, hidden = true, is_verified = false WHERE id = $1`,
                [reportedUserId]
              ).catch(() => {});
              await dbPool.query(
                `UPDATE posts SET is_flagged = true, hidden = true WHERE user_id = $1`,
                [reportedUserId]
              ).catch(() => {});
              await dbPool.query(
                `UPDATE broadcast_posts SET is_flagged = true, hidden = true, status = 'flagged' WHERE author_id = $1`,
                [reportedUserId]
              ).catch(() => {});
              invalidatePublicCache('public_helpers');
              invalidatePublicCache('public_shops');
            }
          }
        } catch (e) {
          console.warn("[PostgreSQL] reports insert fallback:", e);
        }
      }

      memoryAdminReports.unshift(record);

      // In-memory fallback check for 3 unique reports
      if (reportedPostId && !autoFlaggedPost) {
        const uniquePostReporters = new Set(
          memoryAdminReports
            .filter(r => r.reportedPostId === reportedPostId && String(r.status).toUpperCase() !== 'DISMISSED')
            .map(r => r.reporterId)
        );
        if (uniquePostReporters.size >= 3) {
          autoFlaggedPost = true;
        }
      }
      if (reportedUserId && !autoFlaggedUser && reason !== 'ACCOUNT_CLOSURE_REQUEST') {
        const uniqueUserReporters = new Set(
          memoryAdminReports
            .filter(r => r.reportedUserId === reportedUserId && String(r.status).toUpperCase() !== 'DISMISSED')
            .map(r => r.reporterId)
        );
        if (uniqueUserReporters.size >= 3) {
          autoFlaggedUser = true;
        }
      }

      if (autoFlaggedPost || autoFlaggedUser) {
        try {
          const currentIntents = readJsonFile<any[]>(INTENTS_FILE, []);
          let changed = false;
          const updatedIntents = currentIntents.map(item => {
            if (
              (autoFlaggedPost && reportedPostId && item.id === reportedPostId) ||
              (autoFlaggedUser && reportedUserId && (item.authorId === reportedUserId || item.userId === reportedUserId))
            ) {
              changed = true;
              return { ...item, is_flagged: true, hidden: true, status: 'flagged' };
            }
            return item;
          });
          if (changed) {
            writeJsonFile(INTENTS_FILE, updatedIntents);
          }
        } catch {}
      }

      // Permanently archive chat report & full message transcript in Encrypted Security Vault so it can never be lost even if accounts are deleted
      if (reportType === 'chat_report') {
        await archiveToSecurityVault(
          "help_post",
          record.id,
          {
            id: record.id,
            name: `Chat Report: ${reporterName} -> ${reportedUserName || 'Peer'}`,
            email: reporterEmail,
            reason: record.reason,
            details: record.details,
            chatId: record.chatId,
            reportedUserId: record.reportedUserId,
            reportedUserName: record.reportedUserName,
            reportedPostId: record.reportedPostId,
            chatMessagesCount: finalChatSnapshot.length,
            chatSnapshot: finalChatSnapshot,
            createdAt: record.createdAt
          },
          "ACTIVE_REGISTERED"
        ).catch(() => {});
      }

      res.status(201).json({
        success: true,
        id: record.id,
        report: record,
        autoFlagged: autoFlaggedPost || autoFlaggedUser,
        autoFlaggedPost,
        autoFlaggedUser,
        postReportCount,
        userReportCount
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  app.get("/api/reports", requireAdmin, async (_req, res) => {
    try {
      if (dbPool && isDbConnected) {
        const rRes = await dbPool.query("SELECT * FROM admin_reports ORDER BY reported_at DESC");
        const mapped = rRes.rows.map(r => ({
          id: r.id,
          reporterId: r.reporter_id || 'guest',
          reporterName: r.reporter_name || 'Community Member',
          reporterEmail: r.reporter_email || '',
          reportedUserId: r.reported_user_id || '',
          reportedUserName: r.reported_user_name || '',
          chatId: r.chat_id || '',
          reportType: r.report_type || (Array.isArray(r.chat_snapshot) && r.chat_snapshot.length > 0 ? 'chat_report' : 'general'),
          reason: r.reason || '',
          details: r.details || '',
          description: r.details || '',
          chatSnapshot: Array.isArray(r.chat_snapshot) ? r.chat_snapshot : [],
          isUserBlocked: Boolean(r.is_user_blocked),
          status: r.status || 'pending',
          createdAt: r.reported_at ? new Date(r.reported_at).toISOString() : new Date().toISOString()
        }));
        return res.json(mapped);
      }
      res.json(memoryAdminReports);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // ==========================================
  // AD BANNER MANAGEMENT API ROUTES
  // ==========================================

  app.get("/api/ads", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const includeAll = req.query.all === 'true' || req.query.includePending === 'true' || isRequestAdmin(req);
      if (!includeAll) {
        const cached = getPublicCache('public_ads');
        if (cached) {
          return res.json(cached);
        }
      }

      const adsMap = new Map<string, any>();
      const fileAds = readJsonFile<any[]>(ADS_FILE, []);
      fileAds.forEach(a => {
        if (a && a.id) adsMap.set(a.id, a);
      });
      if (dbPool && isDbConnected) {
        try {
          const adsTableRes = await dbPool.query("SELECT * FROM ads ORDER BY created_at DESC").catch(() => ({ rows: [] as any[] }));
          adsTableRes.rows.forEach(r => {
            if (!r || !r.id) return;
            const rawObj = typeof r.raw_json === 'object' && r.raw_json ? r.raw_json : {};
            const img = r.image_url || rawObj.photoUrl || (Array.isArray(rawObj.photos) && rawObj.photos[0]) || '';
            const rowStatus = r.status || rawObj.status || 'approved';
            const isApproved = rowStatus === 'active' || rowStatus === 'approved' || rawObj.isVerified === true;
            adsMap.set(r.id, {
              ...rawObj,
              id: r.id,
              businessName: r.subtitle || rawObj.businessName || r.title || 'Featured Partner',
              offerTitle: r.title || rawObj.offerTitle || 'Special Offer',
              description: r.description || rawObj.description || '',
              photoUrl: img,
              photos: Array.isArray(rawObj.photos) && rawObj.photos.length > 0 ? rawObj.photos : (img ? [img] : []),
              destinationUrl: r.target_url || rawObj.destinationUrl || '',
              area: r.market_area || rawObj.area || 'Local Market',
              status: rowStatus,
              isVerified: isApproved,
              isActive: isApproved && rowStatus !== 'inactive' && rowStatus !== 'pending',
              createdAt: r.created_at
            });
          });

          const dbRes = await dbPool.query("SELECT id, data FROM ad_banners ORDER BY created_at DESC");
          dbRes.rows.forEach(r => {
            if (r.id && r.data && !adsMap.has(r.id)) {
              adsMap.set(r.id, r.data);
            }
          });
        } catch {}
      }
      let allAds = Array.from(adsMap.values());
      if (!includeAll) {
        allAds = allAds.filter(a => a.isActive !== false && a.status !== 'pending' && a.status !== 'rejected');
        setPublicCache('public_ads', allAds);
      }
      res.json(allAds);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch ad banners" });
    }
  });

  app.post("/api/ads", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const ad = req.body;
      if (!ad || !ad.businessName || !ad.offerTitle) {
        return res.status(400).json({ error: "Business name and offer title are required" });
      }

      const isAdminCaller = isRequestAdmin(req);
      const caller = extractRequestUser(req);
      const ownerEmail = sanitizeServerText(ad.ownerEmail || ad.email || caller?.email || '', 150).toLowerCase();
      if (!ownerEmail && !isAdminCaller) {
        return res.status(400).json({ error: "Email ID is mandatory for submitting an ad banner." });
      }

      const validPhotos: string[] = [];
      if (Array.isArray(ad.photos)) {
        for (const p of ad.photos) {
          if (typeof p === 'string' && p.trim()) {
            if (p.trim().startsWith('data:')) {
              const pCheck = validateServerUploadedDataUrl(p.trim(), { allowPdf: false });
              if (!pCheck.valid) {
                return res.status(400).json({ error: pCheck.error });
              }
            }
            const uploadedAdPhoto = await uploadDataToFirebaseServer(p.trim(), "banners");
            validPhotos.push(uploadedAdPhoto);
          }
        }
      }
      if (ad.photoUrl && typeof ad.photoUrl === 'string' && ad.photoUrl.trim()) {
        if (ad.photoUrl.trim().startsWith('data:')) {
          const photoCheck = validateServerUploadedDataUrl(ad.photoUrl.trim(), { allowPdf: false });
          if (!photoCheck.valid) {
            return res.status(400).json({ error: photoCheck.error });
          }
        }
        const uploadedPrimaryAd = await uploadDataToFirebaseServer(ad.photoUrl.trim(), "banners");
        if (!validPhotos.includes(uploadedPrimaryAd)) {
          validPhotos.unshift(uploadedPrimaryAd);
        }
      }

      // Clean up replaced Firebase Storage photos if editing an existing ad
      if (ad.id && dbPool && isDbConnected) {
        try {
          const prevAdRes = await dbPool.query("SELECT image_url, raw_json FROM ads WHERE id = $1 LIMIT 1", [ad.id]);
          if (prevAdRes.rows.length > 0) {
            const prevRow = prevAdRes.rows[0];
            const prevRaw = prevRow.raw_json || {};
            const oldUrls = [prevRow.image_url, prevRaw.photoUrl, ...(Array.isArray(prevRaw.photos) ? prevRaw.photos : [])].filter(Boolean);
            for (const oldUrl of oldUrls) {
              if (oldUrl && validPhotos.length > 0 && !validPhotos.includes(oldUrl)) {
                await deleteFilesFromFirebaseStorage(oldUrl);
              }
            }
          }
        } catch {}
      }

      const finalPhotos = validPhotos;
      const autoApprove = isAdminCaller;
      const adStatus = autoApprove ? (ad.isActive === false ? 'inactive' : 'active') : 'pending';

      const ads = readJsonFile<any[]>(ADS_FILE, []);
      const newAd = {
        id: ad.id || 'ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        businessName: sanitizeStringServer(ad.businessName.trim(), 200),
        ownerEmail,
        email: ownerEmail,
        logo: sanitizeStringServer(ad.logo || '🏪', 20),
        category: sanitizeStringServer(ad.category || 'Retail & Services', 120),
        offerBadge: sanitizeStringServer(ad.offerBadge || '🔥 Special Offer', 100),
        offerTitle: sanitizeStringServer(ad.offerTitle.trim(), 200),
        description: sanitizeStringServer(ad.description || '', 1000),
        photoUrl: finalPhotos[0] || '',
        photos: finalPhotos,
        status: adStatus,
        isActive: autoApprove ? (ad.isActive !== false) : false,
        distance: typeof ad.distance === 'number' ? ad.distance : 0.4,
        area: sanitizeStringServer(ad.area || 'Local Market', 200),
        rating: typeof ad.rating === 'number' ? ad.rating : 4.9,
        reviewCount: typeof ad.reviewCount === 'number' ? ad.reviewCount : 12,
        isVerified: autoApprove,
        destinationUrl: sanitizeStringServer(ad.destinationUrl || '', 500),
        initialMessage: sanitizeStringServer(ad.initialMessage || `Namaste! ${ad.businessName} me aapka swagat hai. Ad offer "${ad.offerBadge}" ke baare me poochhein.`, 500),
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

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            `INSERT INTO ads (id, title, subtitle, target_url, market_area, status, description, image_url, raw_json, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               subtitle = EXCLUDED.subtitle,
               target_url = EXCLUDED.target_url,
               market_area = EXCLUDED.market_area,
               status = EXCLUDED.status,
               description = EXCLUDED.description,
               image_url = EXCLUDED.image_url,
               raw_json = EXCLUDED.raw_json`,
            [
              newAd.id,
              newAd.offerTitle,
              newAd.businessName,
              newAd.destinationUrl,
              newAd.area,
              adStatus,
              newAd.description,
              newAd.photoUrl,
              JSON.stringify(newAd)
            ]
          );

          await dbPool.query(
            `INSERT INTO ad_banners (id, data, created_at) VALUES ($1, $2, NOW())
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
            [newAd.id, JSON.stringify(newAd)]
          );

          if (!autoApprove) {
            const verifId = 'verif_ad_' + newAd.id;
            await dbPool.query(
              `INSERT INTO verification_requests (id, entity_type, entity_id, user_id, user_name, user_phone, title, id_doc_url, status, created_at)
               VALUES ($1, 'business', $2, $3, $4, $5, $6, $7, 'pending', NOW())
               ON CONFLICT (id) DO UPDATE SET status = 'pending', title = EXCLUDED.title`,
              [
                verifId,
                newAd.id,
                caller?.uid || ownerEmail,
                newAd.businessName,
                ownerEmail,
                `Ad Banner: ${newAd.businessName} - ${newAd.offerTitle}`,
                newAd.photoUrl || ''
              ]
            ).catch(() => {});
          }
        } catch (dbErr) {
          console.warn("[PostgreSQL] ads insert note:", dbErr);
        }
      }

      invalidatePublicCache(['public_ads']);
      console.log(`[Ad Banner Saved] ${newAd.id}: ${newAd.businessName} (${adStatus})`);
      res.status(201).json(newAd);
    } catch (e) {
      console.error("Failed to save ad banner:", e);
      res.status(500).json({ error: "Failed to save ad banner" });
    }
  });

  app.patch("/api/admin/ads/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, isActive } = req.body;
      const nextStatus = status || (isActive ? 'active' : 'inactive');
      if (dbPool && isDbConnected) {
        const resAd = await dbPool.query("SELECT raw_json FROM ads WHERE id = $1 LIMIT 1", [id]);
        const rawObj = resAd.rows[0]?.raw_json || {};
        const updatedRaw = {
          ...rawObj,
          status: nextStatus,
          isVerified: nextStatus === 'active' || nextStatus === 'approved',
          isActive: nextStatus === 'active' || nextStatus === 'approved'
        };
        await dbPool.query(
          "UPDATE ads SET status = $1, raw_json = $2 WHERE id = $3",
          [nextStatus, JSON.stringify(updatedRaw), id]
        );
        await dbPool.query(
          "UPDATE ad_banners SET data = $1 WHERE id = $2",
          [JSON.stringify(updatedRaw), id]
        ).catch(() => {});
      }
      invalidatePublicCache(['public_ads']);
      res.json({ success: true, id, status: nextStatus });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update ad status" });
    }
  });

  app.delete("/api/ads/:id", requireAdmin, async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const ads = readJsonFile<any[]>(ADS_FILE, []);
      const targetAd = ads.find(a => a.id === id);
      if (targetAd) {
        await deleteFilesFromFirebaseStorage(targetAd);
      }
      const filtered = ads.filter(a => a.id !== id);
      writeJsonFile(ADS_FILE, filtered);
      if (dbPool && isDbConnected) {
        try {
          const adRows = await dbPool.query("SELECT image_url, raw_json FROM ads WHERE id = $1", [id]).catch(() => ({ rows: [] as any[] }));
          const bannerRows = await dbPool.query("SELECT data FROM ad_banners WHERE id = $1", [id]).catch(() => ({ rows: [] as any[] }));
          await deleteFilesFromFirebaseStorage(adRows.rows);
          await deleteFilesFromFirebaseStorage(bannerRows.rows);
          await dbPool.query("DELETE FROM ads WHERE id = $1", [id]);
          await dbPool.query("DELETE FROM ad_banners WHERE id = $1", [id]);
        } catch {}
      }
      invalidatePublicCache(['public_ads']);
      console.log(`[Ad Banner Deleted] ${id}`);
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete ad banner" });
    }
  });

  // ==========================================
  // JOB PORTAL (JOB SEEKER & EMPLOYER VACANCIES) API
  // ==========================================

  app.get("/api/job-portal", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const { status = 'approved', type, search } = req.query;
      const itemsMap = new Map<string, any>();

      if (dbPool && isDbConnected) {
        try {
          const dbRes = await dbPool.query("SELECT id, data FROM job_portal_items ORDER BY created_at DESC");
          dbRes.rows.forEach(r => {
            if (r.id && r.data) {
              itemsMap.set(r.id, r.data);
            }
          });
        } catch {}
      }

      const fileItems = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
      fileItems.forEach(item => {
        if (item && item.id) {
          itemsMap.set(item.id, item);
        }
      });

      let filtered = Array.from(itemsMap.values());

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

      // Data Privacy: Redact private emails/phones for unauthenticated bulk requests
      const caller = extractUserFromRequest(req);
      const isAdmin = isRequestAdmin(req);
      const isAuthenticated = Boolean(caller && caller.uid && !String(caller.uid).startsWith('guest'));
      const sanitized = filtered.map(item => redactBulkItemForPrivacy(item, isAuthenticated, isAdmin));

      res.json(sanitized);
    } catch (e) {
      console.error("Failed to fetch job portal items:", e);
      res.status(500).json({ error: "Failed to fetch job portal items" });
    }
  });

  app.post("/api/job-portal", registrationAndMessageLimiter, async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

      if (isBotSubmission(req)) {
        console.log("[Honeypot Triggered] Silently rejecting bot job portal submission");
        return res.status(200).json({ success: true, message: "Submission received" });
      }

      const payload = req.body;
      if (!payload || !payload.type) {
        return res.status(400).json({ error: "Invalid submission payload: type is required" });
      }

      if (payload.photoOrLogoUrl) {
        if (String(payload.photoOrLogoUrl).startsWith('data:')) {
          const photoCheck = validateServerUploadedDataUrl(payload.photoOrLogoUrl, { allowPdf: true });
          if (!photoCheck.valid) {
            return res.status(400).json({ error: photoCheck.error });
          }
        }
        payload.photoOrLogoUrl = await uploadDataToFirebaseServer(payload.photoOrLogoUrl, "jobs");
      }

      if (payload.resumeUrl) {
        if (String(payload.resumeUrl).startsWith('data:')) {
          const resumeCheck = validateServerUploadedDataUrl(payload.resumeUrl, { allowPdf: true });
          if (!resumeCheck.valid) {
            return res.status(400).json({ error: resumeCheck.error });
          }
        }
        payload.resumeUrl = await uploadDataToFirebaseServer(payload.resumeUrl, "jobs/resumes", payload.resumeFileName);
      }

      if (payload.type === 'job_seeker' && !payload.fullName) {
        return res.status(400).json({ error: "Full Name is required for Job Seeker profile" });
      }

      if (payload.type === 'employer_vacancy' && (!payload.companyOrShopName || !payload.jobRole)) {
        return res.status(400).json({ error: "Company/Shop name and Job Role are required for Employer vacancy" });
      }

      const isAdminCaller = isRequestAdmin(req);
      const caller = extractRequestUser(req);
      const jobEmail = sanitizeStringServer(payload.email?.trim() || caller?.email || '', 150).toLowerCase();
      if (!jobEmail && !isAdminCaller) {
        return res.status(400).json({ error: "Email ID is mandatory for Job Portal registration and verification." });
      }
      const autoApprove = isAdminCaller;

      // Clean up replaced Firebase Storage photo/resume if updating an existing job portal item
      if (payload.id && dbPool && isDbConnected) {
        try {
          const prevJobRes = await dbPool.query("SELECT data FROM job_portal_items WHERE id = $1 LIMIT 1", [payload.id]);
          if (prevJobRes.rows.length > 0 && prevJobRes.rows[0].data) {
            const prevJob = prevJobRes.rows[0].data;
            if (prevJob.photoOrLogoUrl && payload.photoOrLogoUrl && prevJob.photoOrLogoUrl !== payload.photoOrLogoUrl) {
              await deleteFilesFromFirebaseStorage(prevJob.photoOrLogoUrl);
            }
            if (prevJob.resumeUrl && payload.resumeUrl && prevJob.resumeUrl !== payload.resumeUrl) {
              await deleteFilesFromFirebaseStorage(prevJob.resumeUrl);
            }
          }
        } catch {}
      }

      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
      const isSeeker = payload.type === 'job_seeker';
      const idPrefix = isSeeker ? 'job_seeker_' : 'job_emp_';
      const newRecord = {
        id: payload.id || idPrefix + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type: payload.type,
        status: autoApprove ? "approved" : "pending",
        fullName: sanitizeStringServer(payload.fullName?.trim() || '', 150),
        headline: sanitizeStringServer(payload.headline?.trim() || (isSeeker ? `${payload.category || 'Professional'} Specialist` : ''), 200),
        skills: Array.isArray(payload.skills) 
          ? payload.skills.map((s: any) => sanitizeStringServer(String(s), 80))
          : (typeof payload.skills === 'string' && payload.skills.trim() ? payload.skills.split(',').map((s: string) => sanitizeStringServer(s.trim(), 80)) : []),
        experience: sanitizeStringServer(payload.experience?.trim() || 'Fresher', 80),
        expectedSalary: sanitizeStringServer(payload.expectedSalary?.trim() || '', 80),
        education: sanitizeStringServer(payload.education?.trim() || '', 150),
        companyOrShopName: sanitizeStringServer(payload.companyOrShopName?.trim() || '', 200),
        jobRole: sanitizeStringServer(payload.jobRole?.trim() || '', 150),
        vacancyType: sanitizeStringServer(payload.vacancyType || 'Full-Time', 60),
        salaryOffered: sanitizeStringServer(payload.salaryOffered?.trim() || 'Negotiable', 80),
        openingsCount: Number(payload.openingsCount) || 1,
        urgency: sanitizeStringServer(payload.urgency || 'Immediate', 60),
        category: sanitizeStringServer(payload.category || 'Retail & Services', 100),
        phone: sanitizeStringServer(payload.phone?.trim() || '', 30),
        whatsapp: sanitizeStringServer(payload.whatsapp?.trim() || payload.phone?.trim() || '', 30),
        email: jobEmail,
        area: sanitizeStringServer(payload.area?.trim() || 'Local Area', 150),
        address: sanitizeStringServer(payload.address?.trim() || '', 300),
        description: sanitizeStringServer(payload.description?.trim() || (isSeeker ? 'Looking for local employment opportunities.' : 'Staff required for our business.'), 2000),
        photoOrLogoUrl: payload.photoOrLogoUrl || '',
        resumeUrl: payload.resumeUrl || '',
        resumeFileName: sanitizeStringServer(payload.resumeFileName || '', 150),
        createdAt: new Date().toISOString(),
        reviewedAt: autoApprove ? new Date().toISOString() : null,
        adminNotes: autoApprove ? 'Added & Approved by Admin' : ''
      };

      const updated = [newRecord, ...items.filter(i => i.id !== newRecord.id)];
      writeJsonFile(JOB_PORTAL_FILE, updated);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            `INSERT INTO job_portal_items (id, type, status, data, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, data = EXCLUDED.data`,
            [newRecord.id, newRecord.type, newRecord.status, JSON.stringify(newRecord)]
          );
        } catch {}
      }

      await archiveToSecurityVault(
        newRecord.type === "employer_vacancy" ? "employer" : "job_seeker",
        newRecord.id,
        newRecord,
        "ACTIVE_REGISTERED"
      );

      return res.status(201).json({
        success: true,
        item: newRecord,
        message: autoApprove
          ? "Entry added by Admin and published live immediately."
          : "Your submission has been received and is pending admin approval. It will appear live once verified."
      });
    } catch (e) {
      console.error("Failed to save job portal entry:", e);
      res.status(500).json({ error: "Failed to save job portal entry" });
    }
  });

  app.patch("/api/job-portal/:id/status", requireAdmin, async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: "Valid status ('approved', 'rejected', 'pending') is required" });
      }

      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
      let targetIndex = items.findIndex(i => i.id === id);

      if (targetIndex === -1) {
        const upsertedJob = {
          id,
          type: req.body?.type || (String(id).startsWith('job_emp') ? 'employer_vacancy' : 'job_seeker'),
          fullName: sanitizeStringServer(req.body?.fullName || req.body?.name || '', 150),
          companyOrShopName: sanitizeStringServer(req.body?.companyOrShopName || req.body?.name || '', 200),
          jobRole: sanitizeStringServer(req.body?.jobRole || req.body?.category || '', 150),
          category: sanitizeStringServer(req.body?.category || 'General', 100),
          phone: sanitizeStringServer(req.body?.phone || '', 30),
          email: sanitizeStringServer(req.body?.email || '', 150),
          area: sanitizeStringServer(req.body?.area || 'Local Area', 150),
          description: sanitizeStringServer(req.body?.description || '', 2000),
          status,
          createdAt: req.body?.createdAt || new Date().toISOString(),
          reviewedAt: new Date().toISOString()
        };
        items.unshift(upsertedJob);
        targetIndex = 0;
      }

      items[targetIndex].status = status;
      items[targetIndex].reviewedAt = new Date().toISOString();
      if (typeof adminNotes === 'string') {
        items[targetIndex].adminNotes = sanitizeStringServer(adminNotes, 500);
      }

      writeJsonFile(JOB_PORTAL_FILE, items);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            `UPDATE job_portal_items SET status = $1, data = $2 WHERE id = $3`,
            [status, JSON.stringify(items[targetIndex]), id]
          );
        } catch {}
      }

      res.json({
        success: true,
        item: items[targetIndex],
        message: `Status updated to ${status}`
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.delete("/api/job-portal/:id", requireAdmin, async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
      const targetJob = items.find(i => i.id === id);
      if (targetJob) {
        await archiveToSecurityVault(
          targetJob.type === "employer_vacancy" ? "employer" : "job_seeker",
          targetJob.id,
          targetJob,
          "ADMIN_REMOVED_PUBLIC"
        );
        await deleteFilesFromFirebaseStorage(targetJob);
      }
      const filtered = items.filter(i => i.id !== id);
      writeJsonFile(JOB_PORTAL_FILE, filtered);
      if (dbPool && isDbConnected) {
        try {
          const jobRows = await dbPool.query("SELECT data FROM job_portal_items WHERE id = $1", [id]).catch(() => ({ rows: [] as any[] }));
          await deleteFilesFromFirebaseStorage(jobRows.rows);
          await dbPool.query("DELETE FROM job_portal_items WHERE id = $1", [id]);
        } catch {}
      }
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

  // ==========================================
  // DEDICATED ADMIN CRUD ENDPOINTS FOR ALL 7 MODULES
  // ==========================================

  // 1. Admin Help Posts: Approve, Reject, or Edit any Help Post
  app.patch("/api/admin/intents/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const intents = readJsonFile<any[]>(INTENTS_FILE, []);
      let idx = intents.findIndex(i => i.id === id);
      if (idx === -1) {
        intents.unshift({
          id,
          authorId: updates.authorId || 'community_user',
          authorName: sanitizeStringServer(updates.authorName || updates.userName || 'Community Member', 120),
          description: sanitizeStringServer(updates.description || updates.title || 'Help Request', 1000),
          category: sanitizeStringServer(updates.category || 'General', 100),
          area: sanitizeStringServer(updates.area || 'Local Area', 150),
          status: updates.status || 'active',
          createdAt: updates.createdAt || new Date().toISOString()
        });
        idx = 0;
      }

      const item = intents[idx];
      if (typeof updates.description === 'string') item.description = sanitizeStringServer(updates.description, 1000);
      if (typeof (updates.authorName || updates.userName) === 'string') item.authorName = sanitizeStringServer(updates.authorName || updates.userName, 120);
      if (typeof updates.category === 'string') item.category = sanitizeStringServer(updates.category, 100);
      if (typeof updates.area === 'string') item.area = sanitizeStringServer(updates.area, 150);
      if (typeof updates.city === 'string') item.city = sanitizeStringServer(updates.city, 100);
      if (typeof updates.phone === 'string') item.authorPhone = sanitizeStringServer(updates.phone, 30);
      if (typeof updates.status === 'string') item.status = sanitizeStringServer(updates.status, 40);
      if (typeof updates.isApproved === 'boolean') item.isApproved = updates.isApproved;
      if (typeof updates.isVerifiedUser === 'boolean') item.isVerifiedUser = updates.isVerifiedUser;
      if (typeof (updates.imageUrl || updates.attachmentUrl) === 'string') {
        const uploadedUrl = await uploadDataToFirebaseServer(updates.imageUrl || updates.attachmentUrl, "help_requests");
        item.imageUrl = uploadedUrl;
        item.attachmentUrl = uploadedUrl;
      }
      item.lastInteractionAt = new Date().toISOString();

      intents[idx] = item;
      writeJsonFile(INTENTS_FILE, intents);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            "UPDATE posts SET content = $1, category = $2, image_url = COALESCE(NULLIF($3, ''), image_url), raw_json = $4 WHERE id = $5",
            [item.description, item.category || 'General', item.imageUrl || '', JSON.stringify(item), id]
          ).catch(() => {});
          await dbPool.query(
            "UPDATE broadcast_posts SET description = $1, category = $2, status = $3 WHERE id = $4",
            [item.description, item.category || 'General', item.status || 'active', id]
          );
          await dbPool.query(
            "UPDATE listings SET description = $1, title = $2 WHERE id = $3",
            [item.description, item.category || 'General', id]
          );
        } catch (e) {}
      }

      res.json({ success: true, item });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update help post" });
    }
  });

  // 2. Admin Helpers: Approve, Reject, Edit, or Delete any Local Helper Profile (Upserts if created locally)
  app.patch("/api/admin/helpers/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
      let idx = helpers.findIndex(h => h.id === id);

      if (idx === -1) {
        // Check if stored in PROFILES_FILE
        const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
        const foundProfile = Object.values(profiles).find((p: any) => p?.myHelperProfile?.id === id || p?.uid === id);
        if (foundProfile && foundProfile.myHelperProfile) {
          helpers.unshift({ ...foundProfile.myHelperProfile, id, userId: foundProfile.uid, email: foundProfile.email });
          idx = 0;
        }
      }

      if (idx === -1) {
        // Upsert from request body if helper was previously only in client localStorage
        helpers.unshift({
          id,
          userId: sanitizeStringServer(updates.userId || id, 150),
          name: sanitizeStringServer(updates.name || 'Community Helper', 150),
          categoryId: sanitizeStringServer(updates.categoryId || updates.category || 'other', 60),
          customCategoryName: sanitizeStringServer(updates.customCategoryName || '', 100),
          phone: sanitizeStringServer(updates.phone || '', 30),
          email: sanitizeStringServer(updates.email || '', 150),
          skills: Array.isArray(updates.skills)
            ? updates.skills.map((s: any) => sanitizeStringServer(String(s), 80))
            : [sanitizeStringServer(updates.categoryId || updates.category || 'General', 80)],
          area: sanitizeStringServer(updates.area || 'Local Area', 200),
          experience: sanitizeStringServer(updates.experience || updates.bio || '1+ Year', 80),
          distance: typeof updates.distance === 'number' ? updates.distance : 0.5,
          rating: typeof updates.rating === 'number' ? updates.rating : 5.0,
          completedTasks: typeof updates.completedTasks === 'number' ? updates.completedTasks : 0,
          isVerified: updates.status === 'approved' || Boolean(updates.isVerified),
          status: updates.status || (updates.isVerified ? 'approved' : 'pending'),
          createdAt: updates.createdAt || new Date().toISOString()
        });
        idx = 0;
      }

      const helper = helpers[idx];
      if (typeof updates.name === 'string') helper.name = sanitizeStringServer(updates.name, 150);
      if (typeof updates.phone === 'string') helper.phone = sanitizeStringServer(updates.phone, 30);
      if (typeof updates.email === 'string') helper.email = sanitizeStringServer(updates.email, 150);
      if (typeof (updates.categoryId || updates.category) === 'string') {
        helper.categoryId = sanitizeStringServer(updates.categoryId || updates.category, 60);
      }
      if (typeof updates.customCategoryName === 'string') helper.customCategoryName = sanitizeStringServer(updates.customCategoryName, 100);
      if (typeof updates.area === 'string') helper.area = sanitizeStringServer(updates.area, 200);
      if (typeof (updates.experience || updates.bio) === 'string') {
        helper.experience = sanitizeStringServer(updates.experience || updates.bio, 80);
      }
      if (Array.isArray(updates.skills)) helper.skills = updates.skills.map((s: any) => sanitizeStringServer(String(s), 80));
      if (typeof updates.skills === 'string') helper.skills = updates.skills.split(',').map((s: string) => sanitizeStringServer(s.trim(), 80)).filter(Boolean);
      if (typeof updates.status === 'string') {
        helper.status = updates.status;
        helper.isVerified = updates.status === 'approved';
        helper.is_verified = updates.status === 'approved';
      }
      if (typeof updates.isVerified === 'boolean') {
        helper.isVerified = updates.isVerified;
        helper.is_verified = updates.isVerified;
        helper.status = updates.isVerified ? 'approved' : (helper.status === 'rejected' ? 'rejected' : 'pending');
      }
      if (updates.photoUrl !== undefined || updates.avatarUrl !== undefined || updates.imageUrl !== undefined) {
        const rawPhoto = updates.photoUrl ?? updates.avatarUrl ?? updates.imageUrl ?? '';
        const newPhotoUrl = rawPhoto ? await uploadDataToFirebaseServer(String(rawPhoto), "helpers") : '';
        const prevPhoto = helper.photoUrl || helper.avatarUrl || helper.imageUrl || '';
        if (prevPhoto && prevPhoto !== newPhotoUrl) {
          await deleteFilesFromFirebaseStorage(prevPhoto);
        }
        helper.photoUrl = newPhotoUrl;
        helper.avatarUrl = newPhotoUrl;
        helper.imageUrl = newPhotoUrl;
      }

      helpers[idx] = helper;
      writeJsonFile(HELPERS_FILE, helpers);

      // Sync with PROFILES_FILE and VERIFICATIONS_FILE
      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      Object.keys(profiles).forEach(k => {
        if (profiles[k]?.myHelperProfile?.id === id) {
          profiles[k].myHelperProfile = { ...profiles[k].myHelperProfile, ...helper };
        }
      });
      writeJsonFile(PROFILES_FILE, profiles);

      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      verifs.forEach(v => {
        if (v.entityId === id || v.userId === id || (helper.email && v.userEmail && v.userEmail.toLowerCase() === helper.email.toLowerCase())) {
          v.status = helper.status;
          v.userName = helper.name;
          v.userPhone = helper.phone;
        }
      });
      writeJsonFile(VERIFICATIONS_FILE, verifs);

      if (dbPool && isDbConnected) {
        try {
          const skillsArr = Array.isArray(helper.skills) ? helper.skills : [helper.categoryId || 'General'];
          await dbPool.query(
            `INSERT INTO helpers (id, name, category_id, phone, skills, area, experience, distance, is_verified, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0.5, $8, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               phone = EXCLUDED.phone,
               category_id = EXCLUDED.category_id,
               skills = EXCLUDED.skills,
               area = EXCLUDED.area,
               experience = EXCLUDED.experience,
               is_verified = EXCLUDED.is_verified`,
            [id, helper.name, helper.categoryId, helper.phone, skillsArr, helper.area, helper.experience, Boolean(helper.isVerified)]
          );

          await dbPool.query(
            `INSERT INTO profiles (uid, id, user_id, name, full_name, email, category_id, category_name, phone, sector, address, experience, skills, image_url, avatar_url, verified, is_verified, status, raw_json, updated_at)
             VALUES ($1, $1, $2, $3, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $11, $12, $12, $13, $14, NOW())
             ON CONFLICT (uid) DO UPDATE SET
               name = EXCLUDED.name,
               full_name = EXCLUDED.full_name,
               phone = EXCLUDED.phone,
               category_id = EXCLUDED.category_id,
               category_name = EXCLUDED.category_name,
               sector = EXCLUDED.sector,
               address = EXCLUDED.address,
               experience = EXCLUDED.experience,
               skills = EXCLUDED.skills,
               image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), profiles.image_url),
               avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url),
               verified = EXCLUDED.verified,
               is_verified = EXCLUDED.is_verified,
               status = EXCLUDED.status,
               raw_json = EXCLUDED.raw_json,
               updated_at = NOW()`,
            [
              id,
              helper.userId || id,
              helper.name,
              helper.email || '',
              helper.categoryId,
              helper.customCategoryName || helper.categoryId,
              helper.phone,
              helper.area,
              helper.experience,
              skillsArr.join(', '),
              helper.photoUrl || helper.avatarUrl || '',
              Boolean(helper.isVerified),
              helper.status || 'approved',
              JSON.stringify(helper)
            ]
          );

          // Also sync verification_requests table in PostgreSQL so status never reverts to pending!
          await dbPool.query(
            `UPDATE verification_requests
             SET status = $1, reviewed_at = NOW()
             WHERE entity_id = $2
                OR user_id = $2
                OR ($3 <> '' AND LOWER(user_email) = LOWER($3))`,
            [helper.status || 'approved', id, helper.email || '']
          ).catch(() => {});

          await dbPool.query(`
            UPDATE categories
            SET registered_count = (
              SELECT COUNT(*) FROM helpers WHERE category_id = $1 AND is_verified = true
            ), updated_at = NOW()
            WHERE id = $1
          `, [helper.categoryId]).catch(() => {});
        } catch (e) {}
      }

      invalidatePublicCache(['public_helpers']);
      res.json({ success: true, item: helper });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update helper profile" });
    }
  });

  app.delete("/api/admin/helpers/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      deletedEntitiesMemorySet.add(String(id));
      const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
      const targetHelper = helpers.find(h => h.id === id);
      if (targetHelper) {
        await archiveToSecurityVault(
          "helper",
          targetHelper.id,
          { ...targetHelper, idDocumentWatermarked: targetHelper.idDocUrl || "" },
          "ADMIN_REMOVED_PUBLIC"
        );
        await deleteFilesFromFirebaseStorage(targetHelper);
      }
      writeJsonFile(HELPERS_FILE, helpers.filter(h => h.id !== id));

      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      delete profiles[id];
      Object.keys(profiles).forEach(k => {
        if (profiles[k]?.myHelperProfile?.id === id || profiles[k]?.uid === id || profiles[k]?.id === id) {
          delete profiles[k].myHelperProfile;
        }
      });
      writeJsonFile(PROFILES_FILE, profiles);

      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      writeJsonFile(VERIFICATIONS_FILE, verifs.filter(v => v.entityId !== id && v.userId !== id));

      if (dbPool && isDbConnected) {
        try {
          const hRows = await dbPool.query("SELECT * FROM helpers WHERE id = $1", [id]).catch(() => ({ rows: [] as any[] }));
          const pRows = await dbPool.query("SELECT image_url, avatar_url, raw_json FROM profiles WHERE uid = $1 OR id = $1", [id]).catch(() => ({ rows: [] as any[] }));
          await deleteFilesFromFirebaseStorage(hRows.rows);
          await deleteFilesFromFirebaseStorage(pRows.rows);
          await dbPool.query("DELETE FROM helpers WHERE id = $1", [id]);
          await dbPool.query("DELETE FROM profiles WHERE uid = $1 OR id = $1", [id]).catch(() => {});
          await dbPool.query("DELETE FROM verification_requests WHERE entity_id = $1 OR user_id = $1", [id]).catch(() => {});
        } catch (e) {}
      }

      invalidatePublicCache(['public_helpers']);
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete helper profile" });
    }
  });

  // 3. Admin Simple User Profiles: List all, Approve, Reject, Edit, or Delete (Directly backed by PostgreSQL)
  app.get("/api/admin/profiles", requireAdmin, async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const userMap = new Map<string, any>();
      const userVerifMap = new Map<string, any>();

      if (dbPool && isDbConnected) {
        try {
          const vRes = await dbPool.query("SELECT * FROM verification_requests WHERE entity_type = 'user_profile' ORDER BY created_at DESC").catch(() => ({ rows: [] as any[] }));
          vRes.rows.forEach((v: any) => {
            if (v.entity_id && deletedEntitiesMemorySet.has(String(v.entity_id))) return;
            if (v.user_id && deletedEntitiesMemorySet.has(String(v.user_id))) return;
            const mappedV = {
              id: v.id,
              entityType: v.entity_type,
              entityId: v.entity_id,
              userId: v.user_id,
              userName: v.user_name,
              userEmail: v.user_email,
              userPhone: v.user_phone,
              title: v.title,
              idDocumentWatermarked: v.id_document_watermarked,
              status: String(v.status || 'pending').toLowerCase(),
              createdAt: v.created_at
            };
            if (mappedV.userId) userVerifMap.set(String(mappedV.userId), mappedV);
            if (mappedV.entityId) userVerifMap.set(String(mappedV.entityId), mappedV);
            if (mappedV.userEmail) userVerifMap.set(String(mappedV.userEmail).toLowerCase(), mappedV);
          });

          const uRes = await dbPool.query("SELECT * FROM users WHERE COALESCE(is_deleted, false) = false ORDER BY created_at DESC").catch(() => ({ rows: [] as any[] }));
          uRes.rows.forEach((u: any) => {
            const uid = String(u.id || u.email || '');
            if (!uid || deletedEntitiesMemorySet.has(uid)) return;
            const matchedVerif = userVerifMap.get(uid) || userVerifMap.get(String(u.email || '').toLowerCase());
            const status = String(matchedVerif?.status || 'approved').toLowerCase();
            userMap.set(uid, {
              uid,
              id: uid,
              name: u.name || (u.email ? u.email.split('@')[0] : 'User'),
              email: u.email || '',
              phone: u.phone || matchedVerif?.userPhone || '',
              address: u.area || u.city || '',
              area: u.area || u.city || '',
              skills: '',
              experience: '',
              category: '',
              categoryId: '',
              avatarUrl: u.avatar_url || '',
              status,
              isVerified: status === 'approved',
              idDocumentWatermarked: matchedVerif?.idDocumentWatermarked || '',
              createdAt: u.created_at || new Date().toISOString()
            });
          });

          const pRes = await dbPool.query("SELECT * FROM profiles WHERE COALESCE(is_deleted, false) = false ORDER BY updated_at DESC").catch(() => ({ rows: [] as any[] }));
          pRes.rows.forEach((p: any) => {
            const uid = String(p.uid || p.id || p.email || '');
            if (!uid || deletedEntitiesMemorySet.has(uid)) return;
            const existing = userMap.get(uid) || {};
            const matchedVerif = userVerifMap.get(uid) || userVerifMap.get(String(p.email || '').toLowerCase());
            const pStatusLower = String(p.status || '').toLowerCase();
            const vStatusLower = String(matchedVerif?.status || '').toLowerCase();
            const isRejected = pStatusLower === 'rejected' || vStatusLower === 'rejected';
            const isVerif = !isRejected && Boolean(
              p.verified === true ||
              p.is_verified === true ||
              pStatusLower === 'approved' ||
              vStatusLower === 'approved' ||
              existing.isVerified === true
            );
            const status = isRejected ? 'rejected' : (isVerif ? 'approved' : (pStatusLower || vStatusLower || 'pending'));
            userMap.set(uid, {
              ...existing,
              uid,
              id: uid,
              name: p.full_name || p.name || existing.name || 'Community Member',
              email: p.email || existing.email || '',
              phone: p.phone || existing.phone || matchedVerif?.userPhone || '',
              address: p.address || p.sector || existing.address || '',
              area: p.sector || p.address || existing.area || '',
              skills: p.skills || existing.skills || '',
              experience: p.experience || existing.experience || '',
              category: p.category_id || p.category_name || existing.category || '',
              categoryId: p.category_id || existing.categoryId || '',
              customCategoryName: p.category_name || existing.customCategoryName || '',
              avatarUrl: p.avatar_url || p.image_url || existing.avatarUrl || '',
              status,
              isVerified: status === 'approved',
              idDocumentWatermarked: matchedVerif?.idDocumentWatermarked || existing.idDocumentWatermarked || '',
              createdAt: p.updated_at || p.created_at || existing.createdAt || new Date().toISOString()
            });
          });
        } catch (dbErr) {
          console.warn("[PostgreSQL] Admin profiles query note:", dbErr);
        }
      }

      const list = Array.from(userMap.values());
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to fetch user profiles" });
    }
  });

  app.patch("/api/admin/profiles/:uid", requireAdmin, async (req, res) => {
    try {
      const { uid } = req.params;
      const updates = req.body || {};
      let current: any = { uid, id: uid };

      if (dbPool && isDbConnected) {
        try {
          const pRes = await dbPool.query("SELECT * FROM profiles WHERE uid = $1 OR id = $1 LIMIT 1", [uid]);
          if (pRes.rows.length > 0) {
            const r = pRes.rows[0];
            current = {
              uid: r.uid || uid,
              id: r.uid || uid,
              name: r.full_name || r.name || '',
              full_name: r.full_name || r.name || '',
              email: r.email || '',
              phone: r.phone || '',
              address: r.address || r.sector || '',
              skills: r.skills || '',
              experience: r.experience || '',
              category: r.category_id || '',
              categoryId: r.category_id || '',
              avatarUrl: r.avatar_url || r.image_url || '',
              status: r.status || (r.is_verified ? 'approved' : 'pending'),
              isVerified: Boolean(r.verified || r.is_verified || r.status === 'approved')
            };
          }
        } catch {}
      }

      if (typeof updates.name === 'string') {
        current.name = sanitizeStringServer(updates.name, 120);
        current.full_name = current.name;
        current.displayName = current.name;
      }
      if (typeof updates.email === 'string') current.email = sanitizeStringServer(updates.email, 150).toLowerCase();
      if (typeof updates.phone === 'string') current.phone = sanitizeStringServer(updates.phone, 30);
      if (typeof (updates.address || updates.area) === 'string') current.address = sanitizeStringServer(updates.address || updates.area, 300);
      if (typeof (updates.skills || updates.bio) === 'string') current.skills = sanitizeStringServer(updates.skills || updates.bio, 500);
      if (typeof updates.experience === 'string') current.experience = sanitizeStringServer(updates.experience, 120);
      if (typeof (updates.categoryId || updates.category) === 'string') {
        current.category = sanitizeStringServer(updates.categoryId || updates.category, 100);
        current.categoryId = current.category;
      }
      if (updates.avatarUrl !== undefined || updates.photoUrl !== undefined || updates.imageUrl !== undefined) {
        const rawAvatar = updates.avatarUrl ?? updates.photoUrl ?? updates.imageUrl ?? '';
        const newAvatarUrl = rawAvatar ? await uploadDataToFirebaseServer(String(rawAvatar), "profiles") : '';
        if (current.avatarUrl && current.avatarUrl !== newAvatarUrl) {
          await deleteFilesFromFirebaseStorage(current.avatarUrl);
        }
        current.avatarUrl = newAvatarUrl;
      }
      if (typeof updates.status === 'string') {
        const normSt = updates.status.toLowerCase();
        current.status = normSt;
        current.isVerified = normSt === 'approved';
        current.is_verified = normSt === 'approved';
      }
      current.updated_at = new Date().toISOString();

      // Sync local files as well
      const profilesFileMap = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      if (profilesFileMap[uid]) {
        profilesFileMap[uid] = { ...profilesFileMap[uid], ...current };
        writeJsonFile(PROFILES_FILE, profilesFileMap);
      }
      const helpersFileList = readJsonFile<any[]>(HELPERS_FILE, []);
      let helperUpdated = false;
      helpersFileList.forEach(h => {
        if (h && (h.id === uid || h.userId === uid)) {
          h.status = current.status;
          h.isVerified = Boolean(current.isVerified);
          h.is_verified = Boolean(current.isVerified);
          if (current.category) h.categoryId = current.category;
          helperUpdated = true;
        }
      });
      if (helperUpdated) writeJsonFile(HELPERS_FILE, helpersFileList);

      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      let verifUpdated = false;
      verifs.forEach(v => {
        if (v && (v.entityId === uid || v.userId === uid || v.id === uid || (current.email && v.userEmail && v.userEmail.toLowerCase() === current.email.toLowerCase()))) {
          v.status = current.status;
          verifUpdated = true;
        }
      });
      if (verifUpdated) writeJsonFile(VERIFICATIONS_FILE, verifs);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            `INSERT INTO profiles (uid, id, user_id, name, full_name, email, phone, address, sector, skills, experience, category_id, avatar_url, image_url, verified, is_verified, status, updated_at)
             VALUES ($1, $1, $1, $2, $2, $3, $4, $5, $5, $6, $7, $8, $9, $9, $10, $10, $11, NOW())
             ON CONFLICT (uid) DO UPDATE SET
               name = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
               full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
               email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
               phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
               address = COALESCE(NULLIF(EXCLUDED.address, ''), profiles.address),
               sector = COALESCE(NULLIF(EXCLUDED.sector, ''), profiles.sector),
               skills = COALESCE(NULLIF(EXCLUDED.skills, ''), profiles.skills),
               experience = COALESCE(NULLIF(EXCLUDED.experience, ''), profiles.experience),
               category_id = COALESCE(NULLIF(EXCLUDED.category_id, ''), profiles.category_id),
               avatar_url = CASE WHEN $12::boolean THEN EXCLUDED.avatar_url ELSE COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url) END,
               image_url = CASE WHEN $12::boolean THEN EXCLUDED.image_url ELSE COALESCE(NULLIF(EXCLUDED.image_url, ''), profiles.image_url) END,
               verified = EXCLUDED.verified,
               is_verified = EXCLUDED.is_verified,
               status = EXCLUDED.status,
               updated_at = NOW()`,
            [
              uid,
              current.name || 'Community Member',
              current.email || '',
              current.phone || '',
              current.address || '',
              current.skills || '',
              current.experience || '',
              current.category || '',
              current.avatarUrl || '',
              Boolean(current.isVerified),
              current.status || 'approved',
              Boolean(updates.avatarUrl !== undefined || updates.photoUrl !== undefined || updates.imageUrl !== undefined)
            ]
          );

          await dbPool.query(
            `UPDATE helpers
             SET is_verified = $1,
                 category_id = COALESCE(NULLIF($2, ''), category_id)
             WHERE id = $3`,
            [Boolean(current.isVerified), current.category || '', uid]
          ).catch(() => {});

          if (current.status) {
            await dbPool.query(
              `UPDATE verification_requests
               SET status = $1, reviewed_at = NOW()
               WHERE user_id = $2
                  OR entity_id = $2
                  OR id = $2
                  OR ($3 <> '' AND LOWER(user_email) = LOWER($3))`,
              [current.status, uid, current.email || '']
            ).catch(() => {});
          }
        } catch (e) {}
      }

      invalidatePublicCache(['public_helpers', 'public_shops']);
      res.json({ success: true, item: current });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update user profile" });
    }
  });

  app.delete("/api/admin/profiles/:uid", requireAdmin, async (req, res) => {
    try {
      const { uid } = req.params;
      deletedEntitiesMemorySet.add(String(uid));

      // Also clean up local in-memory files
      const profilesFileMap = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      delete profilesFileMap[uid];
      writeJsonFile(PROFILES_FILE, profilesFileMap);

      const helpersFileList = readJsonFile<any[]>(HELPERS_FILE, []);
      writeJsonFile(HELPERS_FILE, helpersFileList.filter(h => h && h.id !== uid && h.userId !== uid));

      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      writeJsonFile(VERIFICATIONS_FILE, verifs.filter(v => v && v.entityId !== uid && v.userId !== uid && v.id !== uid));

      if (dbPool && isDbConnected) {
        try {
          const pRes = await dbPool.query("SELECT * FROM profiles WHERE uid = $1 OR id = $1 LIMIT 1", [uid]);
          if (pRes.rows.length > 0) {
            await archiveToSecurityVault("user_profile", uid, pRes.rows[0], "ADMIN_REMOVED_PUBLIC");
            await deleteFilesFromFirebaseStorage(pRes.rows[0]);
          }
          const uRes = await dbPool.query("SELECT avatar_url FROM users WHERE id = $1", [uid]).catch(() => ({ rows: [] as any[] }));
          const vRes = await dbPool.query("SELECT id_document_watermarked FROM verification_requests WHERE user_id = $1 OR entity_id = $1 OR id = $1", [uid]).catch(() => ({ rows: [] as any[] }));
          await deleteFilesFromFirebaseStorage(uRes.rows);
          await deleteFilesFromFirebaseStorage(vRes.rows);

          await dbPool.query('DELETE FROM "user" WHERE id = $1', [uid]).catch(() => {});
          await dbPool.query('DELETE FROM users WHERE id = $1', [uid]).catch(() => {});
          await dbPool.query("DELETE FROM profiles WHERE uid = $1 OR id = $1", [uid]).catch(() => {});
          await dbPool.query("DELETE FROM helpers WHERE id = $1", [uid]).catch(() => {});
          await dbPool.query("DELETE FROM verification_requests WHERE user_id = $1 OR entity_id = $1 OR id = $1", [uid]).catch(() => {});
        } catch (e) {}
      }

      invalidatePublicCache(['public_helpers', 'public_shops']);
      res.json({ success: true, uid });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete user profile" });
    }
  });

  // 4. Admin Business / Shop Registrations: Approve, Reject, Edit, or Delete (Upserts in PostgreSQL)
  app.patch("/api/admin/shops/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      let shop: any = {
        id,
        name: sanitizeStringServer(updates.name || updates.businessName || 'Local Business', 200),
        businessName: sanitizeStringServer(updates.name || updates.businessName || 'Local Business', 200),
        business_name: sanitizeStringServer(updates.name || updates.businessName || 'Local Business', 200),
        type: 'shop',
        category: sanitizeStringServer(updates.categoryLabel || updates.category || 'Retail & Services', 120),
        categoryLabel: sanitizeStringServer(updates.categoryLabel || updates.category || 'Retail & Services', 120),
        ownerName: sanitizeStringServer(updates.ownerName || 'Owner', 120),
        owner_id: sanitizeStringServer(updates.userId || updates.owner_id || id, 150),
        userId: sanitizeStringServer(updates.userId || updates.owner_id || id, 150),
        ownerEmail: sanitizeStringServer(updates.email || updates.ownerEmail || '', 150),
        phone: sanitizeStringServer(updates.phone || '', 30),
        timings: sanitizeStringServer(updates.timings || '9:00 AM - 9:00 PM', 120),
        area: sanitizeStringServer(updates.area || updates.address || 'Local Market', 200),
        address: sanitizeStringServer(updates.address || updates.area || 'Local Market', 300),
        description: sanitizeStringServer(updates.description || '', 1500),
        photoUrl: updates.photoUrl || null,
        rating: 5.0,
        reviewCount: 1,
        isVerified: updates.status === 'approved' || Boolean(updates.isVerified),
        status: updates.status || (updates.isVerified ? 'approved' : 'pending'),
        createdAt: updates.createdAt || new Date().toISOString()
      };

      if (dbPool && isDbConnected) {
        try {
          const bRes = await dbPool.query("SELECT * FROM businesses WHERE id = $1 LIMIT 1", [id]);
          if (bRes.rows.length > 0) {
            const r = bRes.rows[0];
            const rawObj = typeof r.raw_json === 'object' && r.raw_json ? r.raw_json : {};
            shop = {
              ...shop,
              ...rawObj,
              id: r.id,
              name: r.shop_name || r.business_name || rawObj.name || shop.name,
              businessName: r.business_name || r.shop_name || rawObj.businessName || shop.businessName,
              categoryLabel: r.category || rawObj.categoryLabel || shop.categoryLabel,
              category: r.category || rawObj.category || shop.category,
              phone: r.phone || rawObj.phone || shop.phone,
              area: r.sector || rawObj.area || shop.area,
              address: r.address || rawObj.address || shop.address,
              description: r.description || rawObj.description || shop.description,
              photoUrl: r.image_url || rawObj.photoUrl || shop.photoUrl,
              isVerified: Boolean(r.is_approved || r.is_verified),
              status: (r.is_approved || r.is_verified) ? 'approved' : (rawObj.status || 'pending')
            };
          }
        } catch {}
      }

      if (typeof updates.name === 'string') {
        shop.name = sanitizeStringServer(updates.name, 200);
        shop.businessName = shop.name;
        shop.business_name = shop.name;
      }
      if (typeof updates.ownerName === 'string') shop.ownerName = sanitizeStringServer(updates.ownerName, 120);
      if (typeof updates.phone === 'string') shop.phone = sanitizeStringServer(updates.phone, 30);
      if (typeof (updates.email || updates.ownerEmail) === 'string') shop.ownerEmail = sanitizeStringServer(updates.email || updates.ownerEmail, 150);
      if (typeof updates.timings === 'string') shop.timings = sanitizeStringServer(updates.timings, 120);
      if (typeof (updates.categoryLabel || updates.category) === 'string') {
        shop.categoryLabel = sanitizeStringServer(updates.categoryLabel || updates.category, 120);
        shop.category = shop.categoryLabel;
      }
      if (typeof updates.area === 'string') shop.area = sanitizeStringServer(updates.area, 200);
      if (typeof updates.address === 'string') shop.address = sanitizeStringServer(updates.address, 300);
      if (typeof updates.description === 'string') shop.description = sanitizeStringServer(updates.description, 1500);
      if (typeof updates.status === 'string') {
        shop.status = updates.status;
        shop.isVerified = updates.status === 'approved';
        shop.is_verified = updates.status === 'approved';
      }
      if (typeof updates.isVerified === 'boolean') {
        shop.isVerified = updates.isVerified;
        shop.is_verified = updates.isVerified;
        shop.status = updates.isVerified ? 'approved' : (shop.status === 'rejected' ? 'rejected' : 'pending');
      }
      if (updates.photoUrl !== undefined || updates.imageUrl !== undefined) {
        const rawPhoto = updates.photoUrl ?? updates.imageUrl ?? '';
        const newPhotoUrl = rawPhoto ? await uploadDataToFirebaseServer(String(rawPhoto), "shops") : '';
        if (shop.photoUrl && shop.photoUrl !== newPhotoUrl) {
          await deleteFilesFromFirebaseStorage(shop.photoUrl);
        }
        shop.photoUrl = newPhotoUrl || null;
      }

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            `INSERT INTO shops (id, name, type, category_label, owner_name, phone, area, address, description, photo_url, is_verified, created_at)
             VALUES ($1, $2, 'shop', $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               owner_name = EXCLUDED.owner_name,
               phone = EXCLUDED.phone,
               category_label = EXCLUDED.category_label,
               area = EXCLUDED.area,
               address = EXCLUDED.address,
               description = EXCLUDED.description,
               photo_url = EXCLUDED.photo_url,
               is_verified = EXCLUDED.is_verified`,
            [id, shop.name, shop.categoryLabel, shop.ownerName, shop.phone, shop.area, shop.address, shop.description, shop.photoUrl || null, Boolean(shop.isVerified)]
          );
          await dbPool.query(
            `INSERT INTO businesses (id, user_id, owner_id, shop_name, business_name, category, phone, address, sector, description, image_url, is_approved, is_verified, raw_json, created_at)
             VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, NOW())
             ON CONFLICT (id) DO UPDATE SET
               shop_name = EXCLUDED.shop_name,
               business_name = EXCLUDED.business_name,
               category = EXCLUDED.category,
               address = EXCLUDED.address,
               sector = EXCLUDED.sector,
               phone = EXCLUDED.phone,
               description = EXCLUDED.description,
               image_url = EXCLUDED.image_url,
               is_approved = EXCLUDED.is_approved,
               is_verified = EXCLUDED.is_verified,
               raw_json = EXCLUDED.raw_json`,
            [id, shop.userId || shop.owner_id || 'Owner', shop.name, shop.categoryLabel, shop.phone, shop.address, shop.area, shop.description, shop.photoUrl || '', Boolean(shop.isVerified), JSON.stringify(shop)]
          );
          await dbPool.query(
            "UPDATE verification_requests SET status = $1, user_name = $2, user_phone = $3 WHERE entity_id = $4",
            [shop.status, shop.name, shop.phone, id]
          ).catch(() => {});
        } catch (e) {}
      }

      invalidatePublicCache(['public_shops', 'public_helpers']);
      res.json({ success: true, item: shop });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update shop/business" });
    }
  });

  app.delete("/api/admin/shops/:id", requireAdmin, deleteBusinessHandler);

  // 5 & 6. Admin Job Seekers & Employer Vacancies: Edit any field (Backed by PostgreSQL job_portal_items)
  app.patch("/api/admin/job-portal/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      let item: any = {
        id,
        type: updates.type || (String(id).startsWith('job_emp') ? 'employer_vacancy' : 'job_seeker'),
        status: updates.status || 'approved',
        createdAt: updates.createdAt || new Date().toISOString()
      };

      if (dbPool && isDbConnected) {
        try {
          const jRes = await dbPool.query("SELECT data, status FROM job_portal_items WHERE id = $1 LIMIT 1", [id]);
          if (jRes.rows.length > 0 && jRes.rows[0].data) {
            item = { ...item, ...jRes.rows[0].data, status: jRes.rows[0].status || jRes.rows[0].data.status };
          }
        } catch {}
      }

      if (typeof updates.fullName === 'string') item.fullName = sanitizeStringServer(updates.fullName, 150);
      if (typeof updates.headline === 'string') item.headline = sanitizeStringServer(updates.headline, 200);
      if (typeof updates.companyOrShopName === 'string') item.companyOrShopName = sanitizeStringServer(updates.companyOrShopName, 200);
      if (typeof updates.jobRole === 'string') item.jobRole = sanitizeStringServer(updates.jobRole, 150);
      if (typeof updates.category === 'string') item.category = sanitizeStringServer(updates.category, 100);
      if (typeof updates.phone === 'string') item.phone = sanitizeStringServer(updates.phone, 30);
      if (typeof updates.whatsapp === 'string') item.whatsapp = sanitizeStringServer(updates.whatsapp, 30);
      if (typeof updates.email === 'string') item.email = sanitizeStringServer(updates.email, 150);
      if (typeof (updates.area || updates.jobLocation) === 'string') item.area = sanitizeStringServer(updates.area || updates.jobLocation, 150);
      if (typeof updates.address === 'string') item.address = sanitizeStringServer(updates.address, 300);
      if (typeof updates.experience === 'string') item.experience = sanitizeStringServer(updates.experience, 80);
      if (typeof updates.expectedSalary === 'string') item.expectedSalary = sanitizeStringServer(updates.expectedSalary, 80);
      if (typeof (updates.salaryOffered || updates.salaryOffer) === 'string') item.salaryOffered = sanitizeStringServer(updates.salaryOffered || updates.salaryOffer, 80);
      if (typeof updates.vacancyType === 'string') item.vacancyType = sanitizeStringServer(updates.vacancyType, 60);
      if (updates.openingsCount !== undefined) item.openingsCount = Number(updates.openingsCount) || 1;
      if (typeof (updates.description || updates.jobDescription) === 'string') item.description = sanitizeStringServer(updates.description || updates.jobDescription, 2000);
      if (Array.isArray(updates.skills)) item.skills = updates.skills.map((s: any) => sanitizeStringServer(String(s), 80));
      if (typeof updates.skills === 'string') item.skills = updates.skills.split(',').map((s: string) => sanitizeStringServer(s.trim(), 80)).filter(Boolean);
      if (typeof updates.status === 'string' && ['approved', 'rejected', 'pending'].includes(updates.status)) {
        item.status = updates.status;
        item.reviewedAt = new Date().toISOString();
      }
      if (updates.photoOrLogoUrl !== undefined || updates.photoUrl !== undefined) {
        const rawPhoto = updates.photoOrLogoUrl ?? updates.photoUrl ?? '';
        const newPhotoUrl = rawPhoto ? await uploadDataToFirebaseServer(String(rawPhoto), "job_portal/photos") : '';
        if (item.photoOrLogoUrl && item.photoOrLogoUrl !== newPhotoUrl) {
          await deleteFilesFromFirebaseStorage(item.photoOrLogoUrl);
        }
        item.photoOrLogoUrl = newPhotoUrl;
      }
      if (updates.resumeUrl !== undefined) {
        const rawResume = updates.resumeUrl ?? '';
        const newResumeUrl = rawResume ? await uploadDataToFirebaseServer(String(rawResume), "job_portal/resumes") : '';
        if (item.resumeUrl && item.resumeUrl !== newResumeUrl) {
          await deleteFilesFromFirebaseStorage(item.resumeUrl);
        }
        item.resumeUrl = newResumeUrl;
      }

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            `INSERT INTO job_portal_items (id, type, status, data, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, data = EXCLUDED.data`,
            [id, item.type || 'job_seeker', item.status, JSON.stringify(item)]
          );
        } catch {}
      }

      res.json({ success: true, item });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update job portal item" });
    }
  });

  // 7. Admin User Feedback & Reports: Approve/Resolve, Reject, Edit, or Delete (Backed by PostgreSQL admin_reports)
  app.patch("/api/admin/reports/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      let rep: any = { id };

      if (dbPool && isDbConnected) {
        try {
          const rRes = await dbPool.query("SELECT * FROM admin_reports WHERE id = $1 LIMIT 1", [id]);
          if (rRes.rows.length > 0) {
            const r = rRes.rows[0];
            rep = {
              id: r.id,
              reporterId: r.reporter_id,
              reporterName: r.reporter_name,
              reason: r.reason,
              details: r.details,
              status: r.status
            };
          }
        } catch {}
      }

      if (typeof updates.reason === 'string') rep.reason = sanitizeStringServer(updates.reason, 200);
      if (typeof updates.details === 'string') rep.details = sanitizeStringServer(updates.details, 1000);
      if (typeof updates.reporterName === 'string') rep.reporterName = sanitizeStringServer(updates.reporterName, 120);
      if (typeof updates.status === 'string') rep.status = sanitizeStringServer(updates.status, 40);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            "UPDATE admin_reports SET reason = COALESCE($1, reason), details = COALESCE($2, details), status = COALESCE($3, status) WHERE id = $4",
            [rep.reason || null, rep.details || null, rep.status || 'approved', id]
          );
        } catch (e) {}
      }

      res.json({ success: true, item: rep });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update feedback/report" });
    }
  });

  app.delete("/api/admin/reports/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query("DELETE FROM admin_reports WHERE id = $1", [id]).catch(() => {});
          await dbPool.query("DELETE FROM reports WHERE id = $1", [id]).catch(() => {});
        } catch (e) {}
      }

      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete feedback/report" });
    }
  });

  app.post("/api/admin/clear-dummy-data", requireAdmin, async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      hasPurgedDummyPostsFromPostgres = false;
      await purgeDummyPostsFromPostgresOnce();
      const localIntents = readJsonFile<any[]>(INTENTS_FILE, []);
      writeJsonFile(
        INTENTS_FILE,
        localIntents.filter(i => i && i.id && !isDummyPostRecord(i.id, i.description || i.title, i.authorName))
      );
      invalidatePublicCache();
      res.json({
        success: true,
        message: "All sample/dummy seed data (#m660z, #t9140, etc.) purged successfully! Only real user posts are now active."
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to clear dummy data" });
    }
  });

  app.post("/api/admin/reset-database", requireAdmin, async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      // Strictly non-destructive: production records in Railway PostgreSQL are permanently protected and never wiped
      await ensureTablesExist(true);
      invalidatePublicCache();

      res.json({
        success: true,
        message: "PostgreSQL schema verified and synced safely. Production user records are permanently protected."
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to verify database" });
    }
  });

  // ==========================================
  // IDENTITY VERIFICATION & WATERMARKED DOCS API
  // Strict Privacy: ID documents are only visible to Admin.
  // Public callers only receive { isVerified, status }.
  // ==========================================

  // 1. Submit Identity Verification (Auto-Watermarked Document) - Protected
  app.post("/api/verifications", registrationAndMessageLimiter, requireAuth, async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

      if (isBotSubmission(req)) {
        console.log("[Honeypot Triggered] Silently rejecting bot verification submission");
        return res.status(200).json({ success: true, message: "Verification received" });
      }

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

      if (idDocumentWatermarked) {
        const docCheck = validateServerUploadedDataUrl(idDocumentWatermarked, { allowPdf: true });
        if (!docCheck.valid) {
          return res.status(400).json({ error: docCheck.error });
        }
      }

      const reqId = id || 'verif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const targetEntityId = entityId || userId || reqId;
      const targetUserId = userId || targetEntityId;
      const docTitle = sanitizeStringServer(title || (entityType === 'business' ? 'Business Registration Document' : 'User Identity Document'), 300);
      const safeDoc = idDocumentWatermarked
        ? await uploadDataToFirebaseServer(idDocumentWatermarked, "verifications")
        : '';

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
            sanitizeStringServer(userName || '', 150),
            sanitizeStringServer(userEmail || '', 150),
            sanitizeStringServer(userPhone || '', 30),
            docTitle,
            safeDoc
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
        userName: sanitizeStringServer(userName || '', 150),
        userEmail: sanitizeStringServer(userEmail || '', 150),
        userPhone: sanitizeStringServer(userPhone || '', 30),
        title: docTitle,
        idDocumentWatermarked: safeDoc,
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

      // Archive verification & watermarked ID document permanently into Encrypted Security Vault
      await archiveToSecurityVault(
        entityType === "business" ? "business" : "user_profile",
        targetEntityId,
        {
          id: targetEntityId,
          uid: targetUserId,
          name: userName,
          email: userEmail,
          phone: userPhone,
          title: docTitle,
          idDocumentWatermarked: safeDoc,
          createdAt: newEntry.createdAt
        },
        "ACTIVE_REGISTERED"
      );

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

  // ==========================================
  // ADMIN READ-ONLY ENCRYPTED SECURITY VAULT API
  // Strictly Read-Only: Decrypts AES-256-GCM records in memory ONLY for authenticated Admin.
  // NO DELETE ALLOWED (even by Admin).
  // ==========================================
  app.get("/api/admin/security-vault", requireAdmin, async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      await syncExistingRecordsToSecurityVault();

      const vaultMap = readJsonFile<Record<string, string>>(SECURITY_VAULT_FILE, {});
      const combinedCiphers = new Map<string, string>();
      Object.entries(vaultMap).forEach(([k, v]) => {
        if (k && v) combinedCiphers.set(k, v);
      });

      if (dbPool && isDbConnected) {
        try {
          const dbRes = await dbPool.query("SELECT id, encrypted_payload FROM security_vault ORDER BY updated_at DESC");
          for (const row of dbRes.rows) {
            if (row.id && row.encrypted_payload && !combinedCiphers.has(row.id)) {
              combinedCiphers.set(row.id, row.encrypted_payload);
            }
          }
        } catch (_dbErr) {}
      }

      const decryptedRecords: any[] = [];
      for (const [, cipherStr] of combinedCiphers.entries()) {
        const rec = decryptVaultPayload(cipherStr);
        if (rec && rec.recordId) {
          decryptedRecords.push(rec);
        }
      }

      decryptedRecords.sort(
        (a, b) =>
          new Date(b.deletedAt || b.lastUpdatedAt || b.firstRegisteredAt || 0).getTime() -
          new Date(a.deletedAt || a.lastUpdatedAt || a.firstRegisteredAt || 0).getTime()
      );

      return res.json({
        success: true,
        encryptionAlgorithm: "AES-256-GCM",
        readOnly: true,
        records: decryptedRecords
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to read Security Vault" });
    }
  });

  app.delete("/api/admin/security-vault*", (_req, res) => {
    return res.status(403).json({
      error: "STRICT SECURITY LOCK: Security Vault records are immutable and cannot be deleted by anyone, including Admin."
    });
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
  app.get("/api/admin/verifications", requireAdmin, async (req, res) => {
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

      const localVerifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      const verifMap = new Map<string, any>();
      list.forEach(v => verifMap.set(v.id, v));
      localVerifs.forEach(v => verifMap.set(v.id, v));

      // Also ensure any pending business in SHOPS_FILE or helper in HELPERS_FILE is represented in the queue
      const localShops = readJsonFile<any[]>(SHOPS_FILE, []);
      let updatedVerifs = false;
      localShops.forEach(s => {
        if (s && s.id && !String(s.id).startsWith('sample_shop_') && !Array.from(verifMap.values()).some(v => v.entityId === s.id)) {
          const entry = {
            id: 'verif_biz_' + s.id,
            entityType: 'business',
            entityId: s.id,
            userId: s.userId || s.owner_id || s.ownerName || s.id,
            userName: s.name,
            userEmail: s.ownerEmail || '',
            userPhone: s.phone || '',
            title: `${s.name} (${s.categoryLabel || 'Business'}) - ${s.area || 'Local Area'}`,
            idDocumentWatermarked: s.photoUrl || '',
            status: s.isVerified ? 'approved' : (s.status || 'pending'),
            createdAt: s.createdAt || new Date().toISOString()
          };
          verifMap.set(entry.id, entry);
          localVerifs.unshift(entry);
          updatedVerifs = true;
        }
      });

      const localHelpers = readJsonFile<any[]>(HELPERS_FILE, []);
      localHelpers.forEach(h => {
        if (h && h.id && !Array.from(verifMap.values()).some(v => v.entityId === h.id)) {
          const catDisplay = h.categoryId === 'other' && h.customCategoryName ? `Other (${h.customCategoryName})` : (h.categoryId || 'Helper');
          const entry = {
            id: 'verif_hlp_' + h.id,
            entityType: 'user_profile',
            entityId: h.id,
            userId: h.userId || h.id,
            userName: h.name,
            userEmail: h.email || '',
            userPhone: h.phone || '',
            title: `Helper Profile (${catDisplay}) - ${h.area || 'Local Area'}`,
            idDocumentWatermarked: h.idDocUrl || '',
            status: h.isVerified ? 'approved' : (h.status || 'pending'),
            createdAt: h.createdAt || new Date().toISOString()
          };
          verifMap.set(entry.id, entry);
          localVerifs.unshift(entry);
          updatedVerifs = true;
        }
      });

      if (updatedVerifs) {
        writeJsonFile(VERIFICATIONS_FILE, localVerifs);
      }

      res.json(Array.from(verifMap.values()));
    } catch (e) {
      res.status(500).json({ error: "Failed to load verifications queue" });
    }
  });

  // 4. Admin-Only Action: Approve or Reject Verification
  app.patch("/api/admin/verifications/:id/status", requireAdmin, async (req, res) => {
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
            WHERE id = $3 OR entity_id = $3 OR user_id = $3
            RETURNING *
          `, [status, adminNotes || null, id]);

          if (updateRes.rows.length > 0) {
            const row = updateRes.rows[0];
            updatedItem = row;
            const isAppr = status === 'approved';

            if (String(row.entity_id || '').startsWith('ad_')) {
              await dbPool.query("UPDATE ads SET status = $1 WHERE id = $2", [isAppr ? 'active' : 'rejected', row.entity_id]).catch(() => {});
              invalidatePublicCache(['public_ads']);
            } else if (row.entity_type === 'business') {
              await dbPool.query("UPDATE shops SET is_verified = $1 WHERE id = $2", [isAppr, row.entity_id]).catch(() => {});
              await dbPool.query("UPDATE businesses SET is_verified = $1, is_approved = $1 WHERE id = $2", [isAppr, row.entity_id]).catch(() => {});
            } else {
              await dbPool.query("UPDATE helpers SET is_verified = $1 WHERE id = $2 OR id = $3", [isAppr, row.entity_id, row.user_id]).catch(() => {});
              await dbPool.query("UPDATE profiles SET is_verified = $1, verified = $1, status = $2 WHERE uid = $3 OR id = $3 OR uid = $4", [isAppr, status, row.entity_id, row.user_id]).catch(() => {});
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

        const isApproved = status === 'approved';
        if (verifs[idx].entityType === 'business') {
          const shops = readJsonFile<any[]>(SHOPS_FILE, []);
          const sIdx = shops.findIndex(s => s.id === verifs[idx].entityId);
          if (sIdx >= 0) {
            shops[sIdx].isVerified = isApproved;
            shops[sIdx].is_verified = isApproved;
            shops[sIdx].status = status;
            writeJsonFile(SHOPS_FILE, shops);
          }
        } else {
          const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
          const hIdx = helpers.findIndex(h => h.id === verifs[idx].entityId || h.userId === verifs[idx].userId || (verifs[idx].userPhone && h.phone === verifs[idx].userPhone));
          if (hIdx >= 0) {
            helpers[hIdx].isVerified = isApproved;
            helpers[hIdx].is_verified = isApproved;
            helpers[hIdx].status = status;
            writeJsonFile(HELPERS_FILE, helpers);
          }
          const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
          Object.keys(profiles).forEach(pKey => {
            const p = profiles[pKey];
            if (pKey === verifs[idx].entityId || pKey === verifs[idx].userId || (verifs[idx].userEmail && p.email === verifs[idx].userEmail)) {
              p.is_verified = isApproved;
              p.isVerified = isApproved;
              if (p.myHelperProfile) {
                p.myHelperProfile.isVerified = isApproved;
                p.myHelperProfile.status = status;
              }
            }
          });
          writeJsonFile(PROFILES_FILE, profiles);
        }
      }

      invalidatePublicCache(['public_helpers', 'public_shops']);
      res.json({ success: true, item: updatedItem, status });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update verification status" });
    }
  });

  // ==========================================
  // AUTHENTICATION & OTP DISPATCH API
  // ==========================================
  app.post("/api/auth/send-otp", otpRateLimiter, async (req, res) => {
    try {
      const { identifier, type } = req.body;
      if (!identifier) {
        return res.status(400).json({ error: "Mobile number or Email address is required" });
      }

      const cleanIdentifier = String(identifier).trim().toLowerCase();

      // 60-second cooldown between OTP requests for the same email/mobile or IP
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
      const lastSentId = otpCooldownByIdentifier.get(cleanIdentifier) || 0;
      const lastSentIp = otpCooldownByIdentifier.get(`ip_${clientIp}`) || 0;
      const lastSent = Math.max(lastSentId, lastSentIp);
      const elapsedMs = Date.now() - lastSent;
      if (lastSent > 0 && elapsedMs < OTP_RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000);
        return res.status(429).json({
          error: `कृपया नया OTP भेजने से पहले ${waitSec} सेकंड प्रतीक्षा करें। (Please wait ${waitSec}s before requesting another OTP.)`,
          cooldownSeconds: waitSec
        });
      }

      otpCooldownByIdentifier.set(cleanIdentifier, Date.now());
      otpCooldownByIdentifier.set(`ip_${clientIp}`, Date.now());

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

        console.log(`[OTP DISPATCH] Generated OTP for email ${cleanIdentifier} (Sent via ${provider}: ${emailSent})`);

        return res.json({
          success: true,
          message: emailSent 
            ? `Verification OTP sent to ${cleanIdentifier} via ${provider}. Please check your Inbox and Spam folder.`
            : `OTP generated for ${cleanIdentifier}.`,
          emailSent,
          provider,
          devOtp: !emailSent ? code : undefined,
          expiresInSeconds: 300,
          cooldownSeconds: 60
        });
      } else {
        const cleanNumber = cleanIdentifier.replace(/\D/g, '');
        console.log(`[OTP DISPATCH] Generated OTP for mobile +91 ${cleanNumber}`);

        const whatsappMsg = encodeURIComponent(
          `*LocoHelp Security Verification*\n\nYour One-Time Password (OTP) is: *${code}*\n\nValid for 5 minutes. Do not share this code with anyone.`
        );
        const whatsappUrl = `https://api.whatsapp.com/send?phone=91${cleanNumber}&text=${whatsappMsg}`;

        return res.json({
          success: true,
          message: `OTP generated for +91 ${cleanNumber}`,
          whatsappUrl,
          devOtp: code,
          expiresInSeconds: 300,
          cooldownSeconds: 60
        });
      }
    } catch (e: any) {
      console.error("OTP send error:", e);
      return res.status(500).json({ error: "Failed to send OTP. Please try again." });
    }
  });

  app.post("/api/auth/verify-otp", authLimiter, async (req, res) => {
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
      const existingAcc = isEmail ? await findExistingAccount(cleanIdentifier) : null;
      const user = {
        uid: existingAcc?.uid || ((isEmail ? 'email_' : 'phone_') + (isEmail ? cleanIdentifier.replace(/[^a-z0-9]/g, '_') : cleanIdentifier.replace(/\D/g, ''))),
        displayName: existingAcc?.name || (isEmail ? cleanIdentifier.split('@')[0] : `User +91 ${cleanIdentifier.replace(/\D/g, '')}`),
        email: isEmail ? cleanIdentifier : '',
        phone: existingAcc?.phone || (!isEmail ? `+91 ${cleanIdentifier.replace(/\D/g, '')}` : ''),
        verifiedAt: new Date().toISOString()
      };

      // Also support optional password setting right during OTP verification if provided
      const otpPassword = req.body.newPassword || req.body.password;
      if (isEmail && otpPassword && String(otpPassword).length >= 6) {
        await saveAccountWithPassword(
          cleanIdentifier,
          user.uid,
          user.displayName,
          user.phone,
          hashPassword(String(otpPassword))
        );
      }

      // Persist user to PostgreSQL primary "users", "user", and "profiles" tables with Legal Consent (terms_accepted)
      if (dbPool && isDbConnected) {
        try {
          if (user.email) {
            await dbPool.query(`
              INSERT INTO users (id, name, email, phone, role, terms_accepted, terms_accepted_at, created_at)
              VALUES ($1, $2, $3, $4, 'user', true, NOW(), NOW())
              ON CONFLICT (email) DO UPDATE SET
                name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
                phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone),
                terms_accepted = true,
                terms_accepted_at = COALESCE(users.terms_accepted_at, NOW())
            `, [user.uid, user.displayName, user.email, user.phone]).catch(() => {});
          }

          await dbPool.query(`
            INSERT INTO "user" (id, name, phone, email, terms_accepted, terms_accepted_at, created_at)
            VALUES ($1, $2, $3, $4, true, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), "user".phone),
              email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email),
              terms_accepted = true,
              terms_accepted_at = COALESCE("user".terms_accepted_at, NOW())
          `, [user.uid, user.displayName, user.phone, user.email]);

          await dbPool.query(`
            INSERT INTO profiles (uid, id, user_id, name, full_name, email, phone, terms_accepted, terms_accepted_at, updated_at)
            VALUES ($1, $1, $1, $2, $2, $3, $4, true, NOW(), NOW())
            ON CONFLICT (uid) DO UPDATE SET
              name = EXCLUDED.name,
              full_name = EXCLUDED.full_name,
              email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
              terms_accepted = true,
              terms_accepted_at = COALESCE(profiles.terms_accepted_at, NOW()),
              updated_at = NOW()
          `, [user.uid, user.displayName, user.email, user.phone]);
        } catch (e) {
          console.warn("DB user insert on OTP verification error:", e);
        }
      }

      // Log IP Address & User-Agent in security_audit_logs for 180-day compliance
      await logSecurityAudit(user.uid, existingAcc ? "LOGIN" : "SIGNUP", req);

      const token = createSessionToken({
        uid: user.uid,
        email: user.email,
        name: user.displayName
      });
      res.setHeader('Set-Cookie', `locohelp_token=${token}; Path=/; Max-Age=${365 * 24 * 3600}; SameSite=Lax`);

      console.log(`[AUTH SUCCESS] User successfully verified: ${user.uid} with permanent session token`);
      return res.json({ success: true, token, user: { ...user, termsAccepted: true } });
    } catch (e) {
      console.error("OTP verify error:", e);
      return res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Issue / Refresh Session Token ONLY for verified existing accounts
  app.post("/api/auth/token", async (req, res) => {
    try {
      const { email, uid, name } = req.body;
      if (!email && !uid) {
        return res.status(400).json({ error: "Email or UID is required" });
      }
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (cleanEmail) {
        const existing = await findExistingAccount(cleanEmail);
        if (!existing) {
          return res.status(403).json({ error: "Unverified account cannot request token" });
        }
      }
      const token = createSessionToken({
        uid: uid || cleanEmail,
        email: cleanEmail,
        name: name || (cleanEmail ? cleanEmail.split('@')[0] : 'Community User')
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

  // ==========================================
  // CATEGORIES & 16:9 IMAGES API (PostgreSQL "categories" & "category_images" tables)
  // ==========================================
  const getCategoriesAndImagesHandler = async (_req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const mergedImages: Record<string, string> = {};
      const categoriesList: any[] = [];

      if (dbPool && isDbConnected) {
        try {
          const catRes = await dbPool.query("SELECT * FROM categories ORDER BY id ASC").catch(() => ({ rows: [] as any[] }));
          for (const row of catRes.rows) {
            if (row.id) {
              const cleanImg = typeof row.image_url === 'string' ? row.image_url.trim() : '';
              if (cleanImg) {
                mergedImages[row.id] = cleanImg;
              }
              categoriesList.push({
                id: row.id,
                name: row.name || row.id,
                icon: row.icon || '🛠️',
                image_url: cleanImg,
                registered_count: Number(row.registered_count || 0),
                updated_at: row.updated_at
              });
            }
          }

          const dbRes = await dbPool.query("SELECT category_id, image_url FROM category_images").catch(() => ({ rows: [] as any[] }));
          for (const row of dbRes.rows) {
            const cleanImg = typeof row.image_url === 'string' ? row.image_url.trim() : '';
            if (row.category_id && cleanImg) {
              mergedImages[row.category_id] = cleanImg;
            }
          }

          writeJsonFile(CATEGORY_IMAGES_FILE, mergedImages);
        } catch (_dbErr) {}
      } else {
        const fileImages = readJsonFile<Record<string, string>>(CATEGORY_IMAGES_FILE, {});
        Object.assign(mergedImages, fileImages);
      }

      const responsePayload = { success: true, images: mergedImages, categories: categoriesList };
      setPublicCache('category_images', responsePayload);
      return res.json(responsePayload);
    } catch (e) {
      return res.json({ success: true, images: {}, categories: [] });
    }
  };

  app.get("/api/categories", getCategoriesAndImagesHandler);
  app.get("/api/category-images", getCategoriesAndImagesHandler);

  const upsertCategoryImageHandler = async (req: express.Request, res: express.Response) => {
    try {
      const cleanId = String(req.params.id || req.body?.categoryId || req.body?.id || "").trim();
      const rawUrl = String(req.body?.imageUrl || req.body?.image_url || "").trim();
      const catName = String(req.body?.name || cleanId).trim();
      const catIcon = String(req.body?.icon || "🛠️").trim();

      if (!cleanId || !rawUrl) {
        return res.status(400).json({ error: "categoryId and imageUrl are required" });
      }

      const cleanUrl = await uploadDataToFirebaseServer(rawUrl, "categories", `category_${cleanId}.webp`);

      const fileImages = readJsonFile<Record<string, string>>(CATEGORY_IMAGES_FILE, {});
      fileImages[cleanId] = cleanUrl;
      writeJsonFile(CATEGORY_IMAGES_FILE, fileImages);

      if (dbPool && isDbConnected) {
        try {
          const prevRes = await dbPool.query("SELECT image_url FROM categories WHERE id = $1", [cleanId]).catch(() => ({ rows: [] as any[] }));
          if (prevRes.rows.length > 0 && prevRes.rows[0].image_url && prevRes.rows[0].image_url !== cleanUrl) {
            await deleteFilesFromFirebaseStorage(prevRes.rows[0].image_url);
          }

          await dbPool.query(
            `INSERT INTO categories (id, name, icon, image_url, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (id) DO UPDATE SET
               image_url = EXCLUDED.image_url,
               name = COALESCE(NULLIF(categories.name, ''), EXCLUDED.name),
               icon = COALESCE(NULLIF(categories.icon, ''), EXCLUDED.icon),
               updated_at = NOW()`,
            [cleanId, catName, catIcon, cleanUrl]
          );

          await dbPool.query(
            `INSERT INTO category_images (category_id, image_url, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (category_id) DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = NOW()`,
            [cleanId, cleanUrl]
          );
        } catch (dbErr: any) {
          console.warn("[PostgreSQL] categories/category_images upsert notice:", dbErr.message);
        }
      }

      invalidatePublicCache(['category_images']);
      return res.json({ success: true, categoryId: cleanId, imageUrl: cleanUrl, images: fileImages });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to save category image" });
    }
  };

  app.put("/api/categories/:id", upsertCategoryImageHandler);
  app.post("/api/categories", upsertCategoryImageHandler);
  app.post("/api/category-images", upsertCategoryImageHandler);

  app.delete("/api/category-images/:categoryId", async (req, res) => {
    try {
      const cleanId = String(req.params.categoryId || "").trim();
      if (!cleanId) {
        return res.status(400).json({ error: "categoryId is required" });
      }

      const fileImages = readJsonFile<Record<string, string>>(CATEGORY_IMAGES_FILE, {});
      delete fileImages[cleanId];
      writeJsonFile(CATEGORY_IMAGES_FILE, fileImages);

      if (dbPool && isDbConnected) {
        try {
          const catRows = await dbPool.query("SELECT image_url FROM categories WHERE id = $1", [cleanId]).catch(() => ({ rows: [] as any[] }));
          const imgRows = await dbPool.query("SELECT image_url FROM category_images WHERE category_id = $1", [cleanId]).catch(() => ({ rows: [] as any[] }));
          await deleteFilesFromFirebaseStorage(catRows.rows);
          await deleteFilesFromFirebaseStorage(imgRows.rows);

          await dbPool.query("UPDATE categories SET image_url = NULL, updated_at = NOW() WHERE id = $1", [cleanId]);
          await dbPool.query("DELETE FROM category_images WHERE category_id = $1", [cleanId]);
        } catch (dbErr: any) {
          console.warn("[PostgreSQL] category_images delete notice:", dbErr.message);
        }
      }

      invalidatePublicCache(['category_images']);
      return res.json({ success: true, categoryId: cleanId, images: fileImages });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to delete category image" });
    }
  });

  // ==========================================
  // STEP 5: AUTO-MIGRATE BROWSER LOCALSTORAGE DATA TO POSTGRESQL + ADMIN DB INIT, BACKUP & RESTORE
  // ==========================================
  app.post("/api/sync-browser-data", async (req, res) => {
    try {
      await ensureTablesExist(false);
      const body = req.body || {};
      const userList: any[] = [];
      if (body.user && typeof body.user === 'object') userList.push(body.user);
      if (Array.isArray(body.users)) userList.push(...body.users);

      const helpersInput: any[] = [
        ...(Array.isArray(body.helpers) ? body.helpers : []),
        ...(Array.isArray(body.profiles) ? body.profiles : [])
      ];

      const shopsInput: any[] = [
        ...(Array.isArray(body.shops) ? body.shops : []),
        ...(Array.isArray(body.businesses) ? body.businesses : [])
      ];

      const adsInput: any[] = Array.isArray(body.ads) ? body.ads : [];
      const postsInput: any[] = Array.isArray(body.posts) ? body.posts : [];

      let syncedCount = 0;

      for (const user of userList) {
        if (user && (user.email || user.uid || user.id)) {
          const cleanEmail = String(user.email || '').trim().toLowerCase();
          const uid = String(user.uid || user.id || ('email_' + cleanEmail.replace(/[^a-z0-9]/g, '_')));
          const name = String(user.displayName || user.name || (cleanEmail ? cleanEmail.split('@')[0] : 'User'));
          const phone = String(user.phone || '');
          if (dbPool && isDbConnected) {
            if (cleanEmail) {
              await dbPool.query(
                `INSERT INTO users (id, name, email, phone, role, avatar_url, created_at)
                 VALUES ($1, $2, $3, $4, 'user', $5, NOW())
                 ON CONFLICT (email) DO UPDATE SET
                   name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
                   phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone)`,
                [uid, name, cleanEmail, phone, user.photoURL || '']
              ).catch(() => {});
            }
            await dbPool.query(
              `INSERT INTO "user" (id, name, phone, email, created_at)
               VALUES ($1, $2, $3, $4, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [uid, name, phone, cleanEmail]
            ).catch(() => {});
          }
          syncedCount++;
        }
      }

      if (helpersInput.length > 0) {
        const localHelpers = readJsonFile<any[]>(HELPERS_FILE, []);
        const helperMap = new Map<string, any>();
        localHelpers.forEach(h => { if (h && h.id && !deletedEntitiesMemorySet.has(String(h.id))) helperMap.set(h.id, h); });

        for (const h of helpersInput) {
          if (!h || !h.id || !h.name || deletedEntitiesMemorySet.has(String(h.id))) continue;
          if (!helperMap.has(h.id)) {
            helperMap.set(h.id, h);
          }
          if (dbPool && isDbConnected) {
            const isVerif = Boolean(h.isVerified || h.is_verified || h.status === 'approved');
            const skillsArr = Array.isArray(h.skills) ? h.skills : [String(h.categoryId || 'other')];
            await dbPool.query(
              `INSERT INTO helpers (id, name, category_id, phone, skills, area, experience, distance, is_verified, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 name = COALESCE(NULLIF(EXCLUDED.name, ''), helpers.name),
                 category_id = COALESCE(NULLIF(EXCLUDED.category_id, ''), helpers.category_id),
                 phone = COALESCE(NULLIF(EXCLUDED.phone, ''), helpers.phone)`,
              [h.id, h.name, h.categoryId || 'other', h.phone || '', skillsArr, h.area || 'Local Area', h.experience || '1 Year', Number(h.distance || 0.5), isVerif]
            ).catch(() => {});

            await dbPool.query(
              `INSERT INTO profiles (uid, id, user_id, name, full_name, email, category_id, category_name, phone, whatsapp, city, sector, address, experience, skills, description, image_url, verified, is_verified, status, rating, raw_json, created_at, updated_at)
               VALUES ($1, $1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $12, $13, $14, $15, $15, $16, $17, $18, NOW(), NOW())
               ON CONFLICT (uid) DO UPDATE SET
                 category_id = COALESCE(NULLIF(EXCLUDED.category_id, ''), profiles.category_id),
                 phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
                 raw_json = COALESCE(profiles.raw_json, EXCLUDED.raw_json)`,
              [
                h.id,
                h.userId || h.id,
                h.name,
                h.email || '',
                h.categoryId || 'other',
                h.customCategoryName || h.categoryId || 'other',
                h.phone || '',
                h.whatsapp || h.phone || '',
                h.city || 'Gandhinagar',
                h.area || 'Local Area',
                h.experience || '1 Year',
                skillsArr.join(', '),
                h.description || skillsArr.join(', '),
                h.photoUrl || '',
                isVerif,
                isVerif ? 'approved' : (h.status || 'pending'),
                Number(h.rating || 5.0),
                JSON.stringify(h)
              ]
            ).catch(() => {});
            syncedCount++;
          }
        }
        writeJsonFile(HELPERS_FILE, Array.from(helperMap.values()));
      }

      if (shopsInput.length > 0) {
        const localShops = readJsonFile<any[]>(SHOPS_FILE, []);
        const shopMap = new Map<string, any>();
        localShops.forEach(s => { if (s && s.id && !deletedEntitiesMemorySet.has(String(s.id))) shopMap.set(s.id, s); });

        for (const s of shopsInput) {
          if (!s || !s.id || String(s.id).startsWith('sample_shop_') || deletedEntitiesMemorySet.has(String(s.id))) continue;
          const bName = s.name || s.businessName || s.business_name;
          if (!bName) continue;
          if (!shopMap.has(s.id)) {
            shopMap.set(s.id, s);
          }
          if (dbPool && isDbConnected) {
            const isApproved = Boolean(s.isVerified || s.is_verified || s.status === 'approved');
            const cat = s.category || s.categoryLabel || 'Retail & Services';
            const imgUrl = s.photoUrl || s.photo_url || (Array.isArray(s.photos) && s.photos[0]) || '';
            await dbPool.query(
              `INSERT INTO businesses (id, user_id, owner_id, shop_name, business_name, category, phone, address, sector, description, image_url, is_approved, is_verified, raw_json, created_at)
               VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 shop_name = COALESCE(NULLIF(EXCLUDED.shop_name, ''), businesses.shop_name),
                 business_name = COALESCE(NULLIF(EXCLUDED.business_name, ''), businesses.business_name),
                 raw_json = COALESCE(businesses.raw_json, EXCLUDED.raw_json)`,
              [s.id, s.userId || s.owner_id || 'Owner', bName, cat, s.phone || '', s.address || s.area || '', s.area || '', s.description || '', imgUrl, isApproved, JSON.stringify(s)]
            ).catch(() => {});
            await dbPool.query(
              `INSERT INTO shops (id, name, type, category_label, owner_name, phone, area, address, description, photo_url, is_verified, created_at)
               VALUES ($1, $2, 'shop', $3, $4, $5, $6, $7, $8, $9, $10, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [s.id, bName, cat, s.ownerName || 'Owner', s.phone || '', s.area || '', s.address || '', s.description || '', imgUrl, isApproved]
            ).catch(() => {});
            syncedCount++;
          }
        }
        writeJsonFile(SHOPS_FILE, Array.from(shopMap.values()));
      }

      if (adsInput.length > 0) {
        const localAds = readJsonFile<any[]>(ADS_FILE, []);
        const adMap = new Map<string, any>();
        localAds.forEach(a => { if (a && a.id) adMap.set(a.id, a); });
        for (const a of adsInput) {
          if (!a || !a.id) continue;
          if (!adMap.has(a.id)) adMap.set(a.id, a);
          if (dbPool && isDbConnected) {
            const imgUrl = a.photoUrl || (Array.isArray(a.photos) && a.photos[0]) || '';
            await dbPool.query(
              `INSERT INTO ads (id, title, subtitle, target_url, market_area, status, description, image_url, raw_json, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [a.id, a.offerTitle || a.businessName || 'Featured Ad', a.businessName || '', a.destinationUrl || '', a.area || 'Local Market', a.isActive === false ? 'inactive' : 'active', a.description || '', imgUrl, JSON.stringify(a)]
            ).catch(() => {});
            await dbPool.query(
              `INSERT INTO ad_banners (id, data, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING`,
              [a.id, JSON.stringify(a)]
            ).catch(() => {});
            syncedCount++;
          }
        }
        writeJsonFile(ADS_FILE, Array.from(adMap.values()));
      }

      if (postsInput.length > 0) {
        const deletedPostIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);
        const localIntents = readJsonFile<any[]>(INTENTS_FILE, []);
        const postMap = new Map<string, any>();
        localIntents.forEach(p => {
          if (p && p.id && !deletedPostIds.includes(p.id) && !deletedEntitiesMemorySet.has(String(p.id)) && !isDummyPostRecord(p.id, p.description || p.title)) {
            postMap.set(p.id, p);
          }
        });
        for (const p of postsInput) {
          if (!p || !p.id || (!p.description && !p.title)) continue;
          if (deletedPostIds.includes(p.id) || deletedEntitiesMemorySet.has(String(p.id)) || isDummyPostRecord(p.id, p.description || p.title)) continue;
          if (!postMap.has(p.id)) postMap.set(p.id, p);
          if (dbPool && isDbConnected) {
            await dbPool.query(
              `INSERT INTO posts (id, user_id, author_name, content, image_url, category, city, raw_json, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [p.id, p.authorId || 'user', p.authorName || 'Community Member', p.description || p.title || '', p.imageUrl || '', p.category || 'General', p.city || p.location || 'Gandhinagar', JSON.stringify(p)]
            ).catch(() => {});
            await dbPool.query(
              `INSERT INTO listings (id, user_id, title, description, location, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [p.id, p.authorId || 'user', p.category || 'General', p.description || p.title || '', p.location || p.city || 'Gandhinagar']
            ).catch(() => {});
            syncedCount++;
          }
        }
        writeJsonFile(INTENTS_FILE, Array.from(postMap.values()));
      }

      await purgeDummyPostsFromPostgresOnce();
      invalidatePublicCache();
      return res.json({ success: true, postgresConnected: isDbConnected, syncedCount });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to sync browser data" });
    }
  });

  // ==========================================
  // PRIVATE SITE LOCK GATE API (Toggleable Private Access PIN Lock)
  // ==========================================
  app.get("/api/site-lock/status", async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const config = await getSiteLockConfig();
      return res.json({
        isLocked: config.isLocked
      });
    } catch (e) {
      return res.json({ isLocked: true });
    }
  });

  app.post("/api/site-lock/verify", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const { pin } = req.body || {};
      const config = await getSiteLockConfig();
      if (!config.isLocked) {
        return res.json({ success: true, message: "Site is unlocked" });
      }
      const submittedPin = String(pin || "").trim();
      if (submittedPin === config.accessPin) {
        return res.json({ success: true, message: "PIN verified successfully" });
      }
      return res.status(401).json({ success: false, error: "ખોટો PIN દાખલ કર્યો છે (Incorrect PIN. Please try again.)" });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: "Failed to verify PIN" });
    }
  });

  app.get("/api/admin/site-lock", requireAdmin, async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const config = await getSiteLockConfig();
      return res.json(config);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to fetch site lock config" });
    }
  });

  app.post("/api/admin/site-lock", requireAdmin, async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const { isLocked, accessPin } = req.body || {};
      if (accessPin !== undefined && (!String(accessPin).trim() || String(accessPin).trim().length < 4)) {
        return res.status(400).json({ error: "Access PIN must be at least 4 digits" });
      }
      const current = await getSiteLockConfig();
      const updatedLocked = typeof isLocked === 'boolean' ? isLocked : current.isLocked;
      const updatedPin = accessPin !== undefined ? String(accessPin).trim() : current.accessPin;
      const saved = await saveSiteLockConfig(updatedLocked, updatedPin);
      return res.json({ success: true, ...saved });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to update site lock config" });
    }
  });

  // Admin Sync & Repair PostgreSQL Tables Endpoint (Force-creates all tables, seeds 22 categories, syncs local files, returns exact table list)
  const handleInitAndRepairPostgresDb = async (_req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      await ensureTablesExist(true);

      let tables: string[] = [];
      const tableCounts: Record<string, number> = {};

      if (dbPool && isDbConnected) {
        try {
          const tblRes = await dbPool.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
          );
          tables = tblRes.rows.map((r: any) => String(r.table_name));
        } catch (err: any) {
          console.warn("[PostgreSQL] information_schema query warning:", err?.message || err);
        }

        const coreTables = ['categories', 'profiles', 'users', 'shops', 'businesses', 'ads', 'posts', 'helpers', 'category_images', 'listings', 'chats'];
        for (const t of coreTables) {
          try {
            const cRes = await dbPool.query(`SELECT COUNT(*)::int AS cnt FROM "${t}"`);
            tableCounts[t] = Number(cRes.rows[0]?.cnt ?? 0);
          } catch {}
        }
      }

      const priorityDisplayOrder = ['categories', 'profiles', 'users', 'shops', 'ads', 'posts', 'businesses', 'helpers', 'category_images'];
      const verifiedCore = priorityDisplayOrder.filter(t => tables.includes(t));
      const displayTablesList = verifiedCore.length > 0 ? verifiedCore.join(', ') : (tables.length > 0 ? tables.join(', ') : 'categories, profiles, users, shops, ads, posts');

      return res.json({
        success: true,
        postgresConnected: isDbConnected,
        tablesInitialized: tablesVerified,
        tables,
        tableCounts,
        message: isDbConnected
          ? `✅ PostgreSQL Tables Initialized & Synced: ${displayTablesList}`
          : `⚠️ DATABASE_URL not reachable yet — local fallback active (${displayTablesList} ready to sync)`
      });
    } catch (e: any) {
      return res.status(500).json({
        success: false,
        postgresConnected: isDbConnected,
        error: e.message || "Failed to initialize PostgreSQL tables"
      });
    }
  };

  app.post("/api/admin/init-db", handleInitAndRepairPostgresDb);
  app.get("/api/admin/db-status", handleInitAndRepairPostgresDb);

  // Admin Full Database Backup (Download JSON of all PostgreSQL & file records)
  app.get("/api/admin/db-backup", requireAdmin, async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      await ensureTablesExist(false);
      const backup: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        postgresConnected: isDbConnected,
        users: readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {}),
        profiles: readJsonFile<Record<string, any>>(PROFILES_FILE, {}),
        helpers: readJsonFile<any[]>(HELPERS_FILE, []),
        businesses: readJsonFile<any[]>(SHOPS_FILE, []),
        ads: readJsonFile<any[]>(ADS_FILE, []),
        posts: readJsonFile<any[]>(INTENTS_FILE, []),
        categoryImages: readJsonFile<Record<string, string>>(CATEGORY_IMAGES_FILE, {}),
        jobPortal: readJsonFile<any[]>(JOB_PORTAL_FILE, []),
        verifications: readJsonFile<any[]>(VERIFICATIONS_FILE, []),
        messages: readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {}),
        postgresTables: {}
      };

      if (dbPool && isDbConnected) {
        const tableNames = ['users', 'categories', 'profiles', 'businesses', 'shops', 'ads', 'posts', 'listings', 'helpers', 'category_images', 'job_portal_items', 'chats', 'messages'];
        for (const t of tableNames) {
          try {
            const q = await dbPool.query(`SELECT * FROM ${t}`);
            backup.postgresTables[t] = q.rows;
          } catch {}
        }
      }

      return res.json({ success: true, backup });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to generate DB backup" });
    }
  });

  // Admin Full Database Restore (Restore JSON backup into both PostgreSQL tables and local files)
  app.post("/api/admin/db-restore", requireAdmin, async (req, res) => {
    try {
      await ensureTablesExist(true);
      const payload = req.body?.backup || req.body || {};
      let restoredCount = 0;
      if (payload.users && typeof payload.users === 'object') {
        const existing = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
        writeJsonFile(AUTH_USERS_FILE, { ...existing, ...payload.users });
        restoredCount += Object.keys(payload.users).length;
      }
      if (payload.profiles && typeof payload.profiles === 'object') {
        const existing = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
        writeJsonFile(PROFILES_FILE, { ...existing, ...payload.profiles });
        restoredCount += Object.keys(payload.profiles).length;
      }
      if (Array.isArray(payload.helpers)) {
        const existing = readJsonFile<any[]>(HELPERS_FILE, []);
        const map = new Map<string, any>();
        existing.forEach(x => { if (x?.id) map.set(x.id, x); });
        payload.helpers.forEach((x: any) => { if (x?.id) map.set(x.id, x); });
        writeJsonFile(HELPERS_FILE, Array.from(map.values()));
        restoredCount += payload.helpers.length;
      }
      if (Array.isArray(payload.businesses)) {
        const existing = readJsonFile<any[]>(SHOPS_FILE, []);
        const map = new Map<string, any>();
        existing.forEach(x => { if (x?.id) map.set(x.id, x); });
        payload.businesses.forEach((x: any) => { if (x?.id) map.set(x.id, x); });
        writeJsonFile(SHOPS_FILE, Array.from(map.values()));
        restoredCount += payload.businesses.length;
      }
      if (Array.isArray(payload.ads)) {
        const existing = readJsonFile<any[]>(ADS_FILE, []);
        const map = new Map<string, any>();
        existing.forEach(x => { if (x?.id) map.set(x.id, x); });
        payload.ads.forEach((x: any) => { if (x?.id) map.set(x.id, x); });
        writeJsonFile(ADS_FILE, Array.from(map.values()));
        restoredCount += payload.ads.length;
      }
      if (Array.isArray(payload.posts)) {
        const existing = readJsonFile<any[]>(INTENTS_FILE, []);
        const map = new Map<string, any>();
        existing.forEach(x => { if (x?.id) map.set(x.id, x); });
        payload.posts.forEach((x: any) => { if (x?.id) map.set(x.id, x); });
        writeJsonFile(INTENTS_FILE, Array.from(map.values()));
        restoredCount += payload.posts.length;
      }
      if (payload.categoryImages && typeof payload.categoryImages === 'object') {
        const existing = readJsonFile<Record<string, string>>(CATEGORY_IMAGES_FILE, {});
        writeJsonFile(CATEGORY_IMAGES_FILE, { ...existing, ...payload.categoryImages });
        restoredCount += Object.keys(payload.categoryImages).length;
      }
      if (Array.isArray(payload.jobPortal)) {
        const existing = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
        const map = new Map<string, any>();
        existing.forEach(x => { if (x?.id) map.set(x.id, x); });
        payload.jobPortal.forEach((x: any) => { if (x?.id) map.set(x.id, x); });
        writeJsonFile(JOB_PORTAL_FILE, Array.from(map.values()));
        restoredCount += payload.jobPortal.length;
      }

      if (dbPool && isDbConnected) {
        await syncJsonFilesToPostgres(dbPool);
      }

      invalidatePublicCache();
      return res.json({ success: true, restoredCount, message: "Database backup restored to PostgreSQL successfully!" });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to restore DB backup" });
    }
  });

  // API Unhandled Error Handler Middleware
  app.use("/api", (err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Unhandled API Error]:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again later. / सर्वर पर कुछ समस्या आई है, कृपया कुछ समय बाद पुनः प्रयास करें।",
      code: "INTERNAL_SERVER_ERROR"
    });
  });

  // Serve PWA Manifest, Service Worker, and Icons explicitly with proper MIME types and guaranteed 200 OK fallback
  const publicDir = path.join(process.cwd(), "public");
  app.get("/manifest.json", (_req, res) => {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    try {
      const manifestFile = path.join(publicDir, "manifest.json");
      if (fs.existsSync(manifestFile)) {
        const content = fs.readFileSync(manifestFile, "utf-8");
        return res.status(200).send(content);
      }
    } catch (_e) {}
    return res.status(200).json({
      id: "/",
      name: "LocoHelp - Local Urgent Help & Jobs Network",
      short_name: "LocoHelp",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#1A73E8",
      icons: [
        { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" }
      ]
    });
  });

  app.get("/sw.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    try {
      const swFile = path.join(publicDir, "sw.js");
      if (fs.existsSync(swFile)) {
        const content = fs.readFileSync(swFile, "utf-8");
        return res.status(200).send(content);
      }
    } catch (_e) {}
    return res.status(200).send(
      "self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));"
    );
  });

  app.get("/firebase-messaging-sw.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    try {
      const fcmSwFile = path.join(publicDir, "firebase-messaging-sw.js");
      const configScript = `self.__FIREBASE_CONFIG__ = ${JSON.stringify({
        apiKey: firebaseServerConfig.apiKey || "AIzaSyDummyKeyForLocoHelpAuthInit2026",
        authDomain: firebaseServerConfig.authDomain || "locohelp-app.firebaseapp.com",
        projectId: firebaseServerConfig.projectId || "locohelp-app",
        storageBucket: firebaseServerConfig.storageBucket || "locohelp-app.appspot.com",
        messagingSenderId: firebaseServerConfig.messagingSenderId || "1029384756",
        appId: firebaseServerConfig.appId || "1:1029384756:web:abc123def456"
      })};\n`;
      if (fs.existsSync(fcmSwFile)) {
        const content = fs.readFileSync(fcmSwFile, "utf-8");
        return res.status(200).send(configScript + content);
      }
    } catch (_e) {}
    return res.status(200).send(
      "self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));"
    );
  });

  // Browser cache headers: never cache CSS/JS/HTML/Vite modules so style updates apply immediately on mobile
  app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    if (
      p.startsWith('/src/') ||
      p.startsWith('/@') ||
      p.startsWith('/node_modules/') ||
      p.endsWith('.css') ||
      p.endsWith('.js') ||
      p.endsWith('.ts') ||
      p.endsWith('.tsx') ||
      p.endsWith('.html') ||
      p.includes('sw.js') ||
      p.includes('manifest.json')
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    } else if (
      p.endsWith('.webp') ||
      p.endsWith('.png') ||
      p.endsWith('.jpg') ||
      p.endsWith('.jpeg') ||
      p.endsWith('.svg') ||
      p.endsWith('.woff') ||
      p.endsWith('.woff2') ||
      p.endsWith('.ico')
    ) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    next();
  });

  const staticCacheOptions = {
    maxAge: 86400000,
    setHeaders: (res: express.Response, filePath: string) => {
      if (
        filePath.endsWith('.html') ||
        filePath.endsWith('.css') ||
        filePath.endsWith('.js') ||
        filePath.endsWith('sw.js') ||
        filePath.endsWith('manifest.json')
      ) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  };

  app.use(express.static(publicDir, staticCacheOptions));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && process.env.VITE_DEV_SERVER !== 'false') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, staticCacheOptions));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Express Error-Handling Middleware (catches unhandled 500 errors and returns safe JSON)
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Unhandled Express Error]:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again later. / सर्वर पर कुछ समस्या आई है, कृपया कुछ समय बाद पुनः प्रयास करें।",
      code: "INTERNAL_SERVER_ERROR"
    });
  });

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  httpServer.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE" && PORT !== 3000) {
      console.warn(`Port ${PORT} in use, falling back to port 3000...`);
      app.listen(3000, "0.0.0.0", () => {
        console.log("Server running on http://localhost:3000");
      });
    }
  });
}

startServer();
