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
const CATEGORY_IMAGES_FILE = path.join(DATA_DIR, "category_images.json");

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
if (!fs.existsSync(CATEGORY_IMAGES_FILE)) writeJsonFile(CATEGORY_IMAGES_FILE, {});
const AUTH_USERS_FILE = path.join(DATA_DIR, "auth_users.json");
if (!fs.existsSync(AUTH_USERS_FILE)) writeJsonFile(AUTH_USERS_FILE, {});
const SECURITY_VAULT_FILE = path.join(DATA_DIR, "security_vault.enc");
if (!fs.existsSync(SECURITY_VAULT_FILE)) writeJsonFile(SECURITY_VAULT_FILE, {});

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

// Password hashing helper
function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT || "locohelp_salt_2026";
  return crypto.pbkdf2Sync(password, salt, 1000, 32, "sha256").toString("hex");
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
  return req.socket?.remoteAddress || "unknown_ip";
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
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, "admin_config.json");

function getMasterAdminPassword(): string {
  try {
    const cfg = readJsonFile<{ password?: string }>(ADMIN_CONFIG_FILE, {});
    if (cfg && cfg.password && String(cfg.password).trim().length >= 6) {
      return String(cfg.password).trim();
    }
  } catch {}
  return DEFAULT_MASTER_ADMIN_PASSWORD;
}

function saveMasterAdminPassword(newPwd: string): void {
  try {
    writeJsonFile(ADMIN_CONFIG_FILE, {
      password: String(newPwd).trim(),
      updatedAt: new Date().toISOString()
    });
  } catch {}
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
      CREATE TABLE IF NOT EXISTS user_passwords (
        email TEXT PRIMARY KEY,
        uid TEXT,
        name TEXT,
        phone TEXT,
        password_hash TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS category_images (
        category_id TEXT PRIMARY KEY,
        image_url TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS job_portal_items (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ad_banners (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS security_vault (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        action_status TEXT NOT NULL,
        encrypted_payload TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("[Railway PostgreSQL] All tables (user, businesses, chats, listings, otp_codes, verification_requests, category_images, job_portal_items, ad_banners, security_vault) verified and ready.");
  } catch (err: any) {
    console.warn("[Railway PostgreSQL] Table init note:", err.message);
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
    const vaultMap = readJsonFile<Record<string, string>>(SECURITY_VAULT_FILE, {});
    const existingCipher = vaultMap[vaultKey];
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
    vaultMap[vaultKey] = encryptedHex;
    writeJsonFile(SECURITY_VAULT_FILE, vaultMap);

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
setTimeout(() => {
  syncExistingRecordsToSecurityVault().catch(() => {});
}, 1500);


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
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token, X-Admin-Token, X-User-Id, X-User-Email, Cache-Control, Pragma"
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
      const currentMasterPwd = getMasterAdminPassword();

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

      saveMasterAdminPassword(String(newPassword).trim());

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
      const currentMasterPwd = getMasterAdminPassword();
      if (!oldPassword || String(oldPassword).trim() !== currentMasterPwd) {
        return res.status(401).json({ success: false, error: "वर्तमान पासवर्ड गलत है!" });
      }
      if (!newPassword || String(newPassword).trim().length < 6) {
        return res.status(400).json({ success: false, error: "नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।" });
      }
      saveMasterAdminPassword(String(newPassword).trim());
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
  // USER PROFILES & AUTHENTICATION API
  // ==========================================

  // Get user profile (Queries primary "user" table with fallback to profiles; redacts private contact info for unauthenticated callers)
  const getUserProfileHandler = async (req: express.Request, res: express.Response) => {
    try {
      const uid = sanitizeServerText(req.params.uid || req.params.id, 150);
      const caller = extractRequestUser(req);
      const isAuth = Boolean(caller && caller.uid);
      const isAdmin = isRequestAdmin(req);
      const isOwner = isSameUserOrAdmin(req, uid, uid);

      const formatResponse = (prof: Record<string, any>) => {
        const safe = redactBulkItemForPrivacy(prof, isAuth || isOwner, isAdmin);
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
            return formatResponse({
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

          // 2. Check primary "user" table
          const userRes = await dbPool.query(
            'SELECT * FROM "user" WHERE id = $1 OR email = $1 LIMIT 1',
            [uid]
          );
          if (userRes.rows.length > 0) {
            const u = userRes.rows[0];
            return formatResponse({
              uid: u.id,
              id: u.id,
              full_name: u.name,
              displayName: u.name,
              email: u.email || "",
              phone: u.phone || "",
              avatar_url: "https://lh3.googleusercontent.com/a/default-user",
              photoURL: "https://lh3.googleusercontent.com/a/default-user",
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

  // Upsert user profile (Saves into primary "user" table and profiles table - Strict Ownership & File Validation)
  const saveUserProfileHandler = async (req: express.Request, res: express.Response) => {
    try {
      const profile = req.body;
      const uid = sanitizeServerText(profile?.uid || profile?.id, 150);
      if (!profile || !uid) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Verify that a user can ONLY edit their own profile
      if (!isSameUserOrAdmin(req, uid, profile.email)) {
        return res.status(403).json({
          error: "Forbidden: You can only edit or update your own profile."
        });
      }

      // Validate uploaded profile avatar (image only <= 2MB)
      const rawAvatar = profile.avatar_url || profile.profilePhoto || profile.photoURL;
      if (rawAvatar) {
        const avatarCheck = validateServerUploadedData(rawAvatar, { allowPdf: false });
        if (!avatarCheck.valid) {
          return res.status(400).json({ error: avatarCheck.error });
        }
      }

      const fullName = sanitizeServerText(profile.name || profile.full_name || profile.displayName || "Community Member", 120);
      const email = sanitizeServerText(profile.email || "", 150).toLowerCase();
      const phone = sanitizeServerText(profile.phone || "", 30);
      const avatarUrl = rawAvatar || "https://lh3.googleusercontent.com/a/default-user";
      const skills = sanitizeServerText(profile.skills || "", 500);
      const address = sanitizeServerText(profile.address || "", 300);
      const experience = sanitizeServerText(profile.experience || "", 120);
      const myHelper = profile.my_helper_profile || profile.myHelperProfile || null;

      const isAdminCaller = isRequestAdmin(req);
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

      // 1. PostgreSQL Upsert into primary "user" table (Parameterized Query)
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
          `, [uid, fullName, email, phone, avatarUrl, skills, address, experience, normalizedHelper ? JSON.stringify(normalizedHelper) : null]);

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
        email,
        phone,
        avatar_url: avatarUrl,
        photoURL: avatarUrl,
        skills,
        address,
        experience,
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

  // Dedicated Signup Endpoint - Inserts directly into "user" table (id, name, phone, email, created_at)
  const signupHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { id, uid, name, full_name, displayName, phone, email } = req.body;
      const targetId = sanitizeServerText(id || uid || (email ? 'email_' + email.replace(/[^a-z0-9]/g, '_') : (phone ? 'phone_' + phone.replace(/\D/g, '') : 'user_' + Date.now())), 150);
      const userName = sanitizeServerText(name || full_name || displayName || (email ? email.split('@')[0] : 'Community Member'), 120);
      const userEmail = sanitizeServerText(email || '', 150).toLowerCase();
      const userPhone = sanitizeServerText(phone || '', 30);

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
      await archiveToSecurityVault("user_profile", targetId, userData, "ACTIVE_REGISTERED");

      res.status(201).json({ success: true, token, user: userData });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to sign up" });
    }
  };

  app.post("/api/auth/signup", authLoginLimiter, signupHandler);
  app.post("/api/signup", authLoginLimiter, signupHandler);
  app.post("/api/users", authLoginLimiter, signupHandler);

  // Delete profile protected with strict authentication & ownership verification
  // Users cannot directly delete their profiles; non-admin requests mark status as deletion_requested for Admin review.
  app.delete("/api/profiles/:uid", requireAuth, async (req, res) => {
    try {
      const { uid } = req.params;
      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      const targetProfile = profiles[uid];

      if (!isSameUserOrAdmin(req, uid, targetProfile?.email)) {
        return res.status(403).json({
          error: "Forbidden: You can only request closure for your own profile."
        });
      }

      const isAdminCaller = isRequestAdmin(req);
      if (!isAdminCaller) {
        if (targetProfile) {
          targetProfile.status = 'deletion_requested';
          targetProfile.isVerified = false;
          targetProfile.is_verified = false;
          if (targetProfile.myHelperProfile) {
            targetProfile.myHelperProfile.status = 'deletion_requested';
            targetProfile.myHelperProfile.isVerified = false;
          }
          writeJsonFile(PROFILES_FILE, profiles);
        }
        const reports = readJsonFile<any[]>(REPORTS_FILE, []);
        reports.unshift({
          id: 'rep_closure_' + Date.now(),
          reason: 'ACCOUNT_CLOSURE_REQUEST',
          description: `ACCOUNT CLOSURE REQUEST for user "${targetProfile?.full_name || targetProfile?.name || uid}"`,
          targetId: uid,
          reporterId: uid,
          userName: targetProfile?.full_name || targetProfile?.name || uid,
          userEmail: targetProfile?.email || '',
          userPhone: targetProfile?.phone || '',
          status: 'deletion_requested',
          createdAt: new Date().toISOString()
        });
        writeJsonFile(REPORTS_FILE, reports);
        return res.json({
          success: true,
          status: 'deletion_requested',
          message: 'Account closure request sent to Admin for review.'
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

      // 2. Also archive & remove any linked Helper Profile of this user from public listings
      const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
      const userHelpers = helpers.filter(
        h => h && (h.userId === uid || (userEmail && (h.email || "").toLowerCase() === userEmail))
      );
      for (const uh of userHelpers) {
        await archiveToSecurityVault("helper", uh.id, uh, "ADMIN_REMOVED_PUBLIC");
        if (dbPool && isDbConnected) {
          try {
            await dbPool.query("DELETE FROM helpers WHERE id = $1", [uh.id]);
          } catch (_e) {}
        }
      }
      if (userHelpers.length > 0) {
        const remainingHelpers = helpers.filter(
          h => !(h && (h.userId === uid || (userEmail && (h.email || "").toLowerCase() === userEmail)))
        );
        writeJsonFile(HELPERS_FILE, remainingHelpers);
      }

      // 3. Also archive & remove any linked Business/Shop of this user from public listings
      const shops = readJsonFile<any[]>(SHOPS_FILE, []);
      const userShops = shops.filter(
        s => s && (s.userId === uid || s.owner_id === uid || (userEmail && (s.ownerEmail || "").toLowerCase() === userEmail))
      );
      for (const us of userShops) {
        await archiveToSecurityVault("business", us.id, us, "ADMIN_REMOVED_PUBLIC");
        if (dbPool && isDbConnected) {
          try {
            await dbPool.query("DELETE FROM businesses WHERE id = $1", [us.id]);
            await dbPool.query("DELETE FROM shops WHERE id = $1", [us.id]);
          } catch (_e) {}
        }
      }
      if (userShops.length > 0) {
        const remainingShops = shops.filter(
          s => !(s && (s.userId === uid || s.owner_id === uid || (userEmail && (s.ownerEmail || "").toLowerCase() === userEmail)))
        );
        writeJsonFile(SHOPS_FILE, remainingShops);
      }

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query('DELETE FROM "user" WHERE id = $1', [uid]);
          await dbPool.query("DELETE FROM profiles WHERE uid = $1", [uid]);
        } catch (dbErr) {}
      }
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

  // Helper to look up existing user account across user_passwords, auth_users.json, "user", and profiles
  const findExistingAccount = async (cleanEmail: string) => {
    const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
    let record: any = authUsers[cleanEmail] ? { ...authUsers[cleanEmail] } : null;

    if (dbPool && isDbConnected) {
      try {
        const pwRes = await dbPool.query(
          "SELECT * FROM user_passwords WHERE email = $1 LIMIT 1",
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

        // Also check "user" and profiles tables for accounts created via OTP
        const otpUid = 'email_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
        const userRes = await dbPool.query(
          'SELECT * FROM "user" WHERE email = $1 OR id = $1 OR id = $2 LIMIT 1',
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
        Object.values(profiles).find((p: any) => (p?.email || '').toLowerCase() === cleanEmail);
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
    cleanEmail: string,
    uid: string,
    displayName: string,
    phone: string,
    hashedPassword: string
  ) => {
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
          `INSERT INTO "user" (id, name, phone, email, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = COALESCE(NULLIF(EXCLUDED.name, ''), "user".name),
             phone = COALESCE(NULLIF(EXCLUDED.phone, ''), "user".phone),
             email = COALESCE(NULLIF(EXCLUDED.email, ''), "user".email)`,
          [uid, displayName, phone || '', cleanEmail]
        );

        await dbPool.query(
          `INSERT INTO profiles (uid, full_name, email, phone, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (uid) DO UPDATE SET
             full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
             phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
             updated_at = NOW()`,
          [uid, displayName, cleanEmail, phone || '']
        );
      } catch (e) {}
    }
  };

  // Email & Password Registration (STRICTLY REQUIRES REAL EMAIL 6-DIGIT OTP VERIFICATION)
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
      if (!otpCode || String(otpCode).trim().length < 6) {
        return res.status(400).json({
          error: "असली ईमेल की पुष्टि के लिए ईमेल पर भेजा गया 6-अंकों का OTP कोड डालना अनिवार्य है। (6-digit Email OTP is required to verify your real email.)",
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
      const finalPhone = (phone && phone.trim()) || existing?.phone || '';
      const hashedPassword = hashPassword(password);

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
      res.status(500).json({ error: e.message || "Failed to register" });
    }
  });

  // Email & Password Login (STRICT SECURITY: Rejects any unregistered/random email or account without a verified password)
  app.post("/api/auth/login-password", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const cleanEmail = email.trim().toLowerCase();
      if (password.length < 6) {
        return res.status(400).json({ error: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Min 6 characters)" });
      }

      const existing = await findExistingAccount(cleanEmail);
      const hashedInput = hashPassword(password);

      // STRICT CHECK 1: Block any random/unregistered email address
      if (!existing) {
        return res.status(404).json({
          error: "यह ईमेल रजिस्टर्ड नहीं है! किसी भी नकली/रैंडम ईमेल से लॉगिन की अनुमति नहीं है। कृपया पहले 'Email OTP' से अपना असली ईमेल वेरिफाई करके अकाउंट बनाएं। (Email not registered! Please verify your real email via OTP first.)",
          needsOtp: true
        });
      }

      // STRICT CHECK 2: Block if user hasn't set a verified password yet
      if (!existing.passwordHash) {
        return res.status(401).json({
          error: "इस ईमेल के लिए अभी पासवर्ड सेट नहीं किया गया है। कृपया नीचे 'Set / Reset Password via OTP' चुनकर अपने ईमेल OTP से पासवर्ड सेट करें। (Password not set yet. Verify via Email OTP to set a password.)",
          needsReset: true,
          needsOtp: true
        });
      }

      // STRICT CHECK 3: Verify exact password hash match
      if (existing.passwordHash !== hashedInput) {
        return res.status(401).json({
          error: "गलत पासवर्ड! यदि आप अपना पासवर्ड भूल गए हैं तो नीचे 'Forgot / Reset Password via OTP' विकल्प चुनें। (Incorrect password!)",
          needsReset: true
        });
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

  // 1. Get All Listings / Broadcast Intents (Redacts private emails/phones for unauthenticated bulk requests)
  const getListingsHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const caller = extractRequestUser(req);
      const isAuth = Boolean(caller && caller.uid);
      const isAdmin = isRequestAdmin(req);

      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);
      const includeExpired = req.query.all === 'true';
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const nowMs = Date.now();

      const localIntents = readJsonFile<any[]>(INTENTS_FILE, []);
      const mergedMap = new Map<string, any>();

      localIntents.forEach(i => {
        if (i && i.id && !deletedIds.includes(i.id)) {
          mergedMap.set(i.id, i);
        }
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
              if (!r || !r.id || deletedIds.includes(r.id)) return;
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

          const result = await dbPool.query(`
            SELECT * FROM broadcast_posts 
            ORDER BY created_at DESC 
            LIMIT 100
          `);

          if (result.rows.length > 0) {
            result.rows.forEach(r => {
              if (!r || !r.id || deletedIds.includes(r.id)) return;
              const localMeta = mergedMap.get(r.id) || {};
              mergedMap.set(r.id, {
                ...localMeta,
                id: r.id,
                authorId: r.author_id || localMeta.authorId,
                authorName: r.author_name || localMeta.authorName || 'Community Member',
                authorAvatar: r.author_avatar || localMeta.authorAvatar,
                description: r.description || localMeta.description,
                category: r.category || localMeta.category,
                tags: r.tags || localMeta.tags || [],
                status: r.status || localMeta.status || 'active',
                city: localMeta.city || '',
                area: localMeta.area || '',
                location: localMeta.location || '',
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

      const combined = Array.from(mergedMap.values())
        .filter(item => {
          if (includeExpired || isAdmin) return true;
          if (item.status === 'rejected') return false;
          const createdMs = new Date(item.createdAt || item.created_at || nowMs).getTime();
          const interactMs = item.lastInteractionAt ? new Date(item.lastInteractionAt).getTime() : 0;
          const effectiveMs = Math.max(createdMs, interactMs);
          return (nowMs - effectiveMs) <= ONE_HOUR_MS;
        })
        .map(i => redactBulkItemForPrivacy(i, isAuth, isAdmin));

      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(combined);
    } catch (e) {
      console.warn("Recovering from fetch intents error:", e);
      const fallbackIntents = readJsonFile<any[]>(INTENTS_FILE, []).map(i => redactBulkItemForPrivacy(i, false, false));
      res.json(fallbackIntents);
    }
  };

  app.get("/api/intents", getListingsHandler);
  app.get("/api/listings", getListingsHandler);
  app.get("/api/posts", getListingsHandler);
  app.get("/api/broadcast-posts", getListingsHandler);

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

      const intentRecord = {
        id: sanitizeServerText(newIntent.id || 'intent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7), 100),
        authorId: sanitizeServerText(caller?.uid || newIntent.authorId || newIntent.user_id || newIntent.author_id || (isAdminCaller ? 'admin_published' : 'anonymous_user'), 150),
        authorEmail: sanitizeServerText(newIntent.authorEmail || newIntent.email || newIntent.author_email || (!isAdminCaller ? caller?.email : '') || '', 150),
        authorPhone: sanitizeServerText(newIntent.authorPhone || newIntent.phone || '', 30),
        authorName: sanitizeServerText(newIntent.authorName || newIntent.author_name || 'Community Member', 120),
        authorAvatar: newIntent.authorAvatar || newIntent.author_avatar || '',
        title: sanitizeServerText(newIntent.title || newIntent.category || (newIntent.tags && newIntent.tags[0] ? String(newIntent.tags[0]).replace('#', '') : 'General'), 120),
        description: sanitizeServerText((newIntent.description || newIntent.title || '').trim(), 1000),
        category: sanitizeServerText(newIntent.category || newIntent.title || (newIntent.tags && newIntent.tags[0] ? String(newIntent.tags[0]).replace('#', '') : 'General'), 100),
        tags: Array.isArray(newIntent.tags) ? newIntent.tags.map((t: any) => sanitizeServerText(t, 40)) : ['#General'],
        distance: typeof newIntent.distance === 'number' ? newIntent.distance : 0.5,
        city: cityVal,
        area: areaVal,
        location: formattedLocation,
        status: newIntent.status || 'active',
        createdAt: newIntent.createdAt || new Date().toISOString(),
        expiresAt: newIntent.expiresAt || new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 Hour Auto Expiry
        lastInteractionAt: new Date().toISOString(),
        hasLocationPin: !!newIntent.hasLocationPin,
        isVerifiedUser: true
      };

      // Record post cooldown timestamp
      if (!isAdminCaller) {
        postCooldowns.set(cooldownKey, nowMs);
      }

      // 1. PostgreSQL Insert into primary "listings" table (Parameterized Query)
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
      await archiveToSecurityVault("help_post", intentRecord.id, intentRecord, "ACTIVE_REGISTERED");

      console.log(`[Listing Created] ${intentRecord.id}: "${intentRecord.description.substring(0, 40)}..."`);
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

      // 1. PostgreSQL Delete from listings, broadcast_posts, chats, messages (Parameterized Queries)
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
  // Strict Privacy: Private 1:1 chats can ONLY be fetched by the two participants (or Admin)
  // ==========================================

  // 4. Get Chat Messages (GET /api/messages/:conversationId and GET /api/intents/:id/messages)
  const getChatMessagesHandler = async (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const { id } = req.params;
      const conversationId = (req.query?.conversationId as string) || (req.query?.intentId as string) || (req.query?.intent_id as string) || id || 'general';
      const userId = (req.query?.userId as string) || (req.query?.user_id as string) || '';
      const otherUserId = (req.query?.otherUserId as string) || (req.query?.other_user_id as string) || '';
      const targetChatKey = conversationId && conversationId !== 'general' ? conversationId : (userId && otherUserId ? [userId, otherUserId].sort().join('_') : (id || 'general'));

      const mergedMap = new Map<string, any>();

      if (dbPool && isDbConnected) {
        try {
          // 1. Query messages table by conversationId (intent_id) or participant IDs
          let result;
          if (userId && otherUserId && (!conversationId || conversationId === 'general')) {
            result = await dbPool.query(
              "SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) OR intent_id = $3 ORDER BY created_at ASC",
              [userId, otherUserId, targetChatKey]
            );
          } else {
            result = await dbPool.query(
              "SELECT * FROM messages WHERE intent_id = $1 OR receiver_id = $1 ORDER BY created_at ASC",
              [conversationId]
            );
          }

          if (result && result.rows.length > 0) {
            result.rows.forEach(r => {
              mergedMap.set(r.id, {
                id: r.id,
                conversationId: r.intent_id || conversationId,
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
              });
            });
          }

          // 2. Also query chats table for any legacy 1:1 messages
          let chatRes;
          if (userId && otherUserId && (!conversationId || conversationId === 'general')) {
            chatRes = await dbPool.query(
              "SELECT * FROM chats WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY sent_at ASC",
              [userId, otherUserId]
            );
          } else {
            chatRes = await dbPool.query(
              "SELECT * FROM chats WHERE receiver_id = $1 OR sender_id = $1 ORDER BY sent_at ASC",
              [conversationId]
            );
          }

          if (chatRes && chatRes.rows.length > 0) {
            chatRes.rows.forEach(r => {
              if (!mergedMap.has(r.id)) {
                mergedMap.set(r.id, {
                  id: r.id,
                  conversationId,
                  authorId: r.sender_id,
                  senderId: r.sender_id,
                  receiverId: r.receiver_id,
                  text: r.message || '',
                  content: r.message || '',
                  message: r.message || '',
                  type: 'text',
                  createdAt: r.sent_at ? new Date(r.sent_at).toISOString() : new Date().toISOString()
                });
              }
            });
          }
        } catch (dbErr) {
          console.warn("DB messages query error:", dbErr);
        }
      }

      const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
      const fileMessages = allMessages[targetChatKey] || allMessages[conversationId] || (id ? allMessages[id] : []) || [];
      fileMessages.forEach((m: any) => {
        if (m && m.id && !mergedMap.has(m.id)) {
          mergedMap.set(m.id, m);
        }
      });

      const finalMessages = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(a.createdAt || a.sent_at || 0).getTime() - new Date(b.createdAt || b.sent_at || 0).getTime()
      );
      res.json(finalMessages);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  };

  app.get("/api/intents/:id/messages", getChatMessagesHandler);
  app.get("/api/chats/:id", getChatMessagesHandler);
  app.get("/api/messages", getChatMessagesHandler);
  app.get("/api/messages/:id", getChatMessagesHandler);

  // 5. Send Chat Message (POST /api/messages & POST /api/intents/:id/messages)
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
      const conversationId = sanitizeServerText(
        req.params.id ||
        message.conversationId ||
        message.conversation_id ||
        message.intentId ||
        message.intent_id ||
        message.receiver_id ||
        message.receiverId ||
        'general',
        150
      );

      // Validate any chat attachment (Images <= 2MB, PDFs <= 5MB)
      if (message.attachmentUrl) {
        const attachCheck = validateServerUploadedData(message.attachmentUrl, { allowPdf: true });
        if (!attachCheck.valid) {
          return res.status(400).json({ error: attachCheck.error });
        }
      }

      const safeText = sanitizeServerText(message.message || message.text || message.content || '', 2000);
      const caller = extractRequestUser(req);
      const senderIdVal = sanitizeServerText(
        message.authorId || message.sender_id || message.senderId || caller?.uid || 'guest',
        150
      );
      const newMsg = {
        id: sanitizeServerText(message.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6), 100),
        conversationId,
        intentId: conversationId,
        authorId: senderIdVal,
        senderId: senderIdVal,
        authorName: sanitizeServerText(message.authorName || message.senderName || caller?.name || '', 120),
        senderEmail: sanitizeServerText(caller?.email || message.senderEmail || message.email || '', 150),
        receiverId: sanitizeServerText(message.receiverId || message.receiver_id || conversationId, 150),
        text: safeText,
        content: safeText,
        message: safeText,
        type: sanitizeServerText(message.type || 'text', 40),
        attachmentUrl: message.attachmentUrl || null,
        attachmentType: message.attachmentType ? sanitizeServerText(message.attachmentType, 40) : null,
        createdAt: message.createdAt || message.sent_at || new Date().toISOString()
      };

      // 1. PostgreSQL Insert into messages and chats tables (Parameterized Query)
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(`
            INSERT INTO messages (id, intent_id, sender_id, receiver_id, text, content, type, attachment_url, attachment_type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
          `, [
            newMsg.id,
            conversationId,
            newMsg.senderId,
            newMsg.receiverId,
            newMsg.text,
            newMsg.content,
            newMsg.type,
            newMsg.attachmentUrl,
            newMsg.attachmentType,
            newMsg.createdAt
          ]);

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
        } catch (dbErr) {
          console.warn("DB message insert error:", dbErr);
        }
      }

      // 2. Local file backup & refresh post interaction time
      const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
      const chatMessages = allMessages[conversationId] || [];
      if (!chatMessages.some((m: any) => m.id === newMsg.id)) {
        chatMessages.push(newMsg);
        allMessages[conversationId] = chatMessages;
        writeJsonFile(MESSAGES_FILE, allMessages);
      }

      // Refresh post interaction timestamp so active conversations extend post expiry
      if (conversationId && conversationId !== 'general') {
        try {
          const localIntents = readJsonFile<any[]>(INTENTS_FILE, []);
          let updatedIntents = false;
          localIntents.forEach(i => {
            if (i.id === conversationId) {
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
            `, [conversationId]).catch(() => {});
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

  app.post("/api/intents/:id/messages", registrationAndMessageLimiter, chatMessageLimiter, sendChatMessageHandler);
  app.post("/api/chats", registrationAndMessageLimiter, chatMessageLimiter, sendChatMessageHandler);
  app.post("/api/messages", registrationAndMessageLimiter, chatMessageLimiter, sendChatMessageHandler);
  app.post("/api/messages/:id", registrationAndMessageLimiter, chatMessageLimiter, sendChatMessageHandler);

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
          const result = await dbPool.query("SELECT * FROM shops ORDER BY created_at DESC");
          if (result.rows.length > 0) {
            allList = result.rows.map(r => ({
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
            }));
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
            validatedPhotos.push(p.trim());
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
        if (primaryUrl && !validatedPhotos.includes(primaryUrl) && validatedPhotos.length < 3) {
          validatedPhotos.unshift(primaryUrl);
        }
      }
      if (shop.idDocumentWatermarked) {
        const docCheck = validateServerUploadedDataUrl(shop.idDocumentWatermarked, { allowPdf: true });
        if (!docCheck.valid) {
          return res.status(400).json({ error: docCheck.error });
        }
      }

      const isAdminCaller = isRequestAdmin(req);
      const userFromReq = (req as any).user;
      const ownerEmail = shop.ownerEmail ?? shop.email ?? (!isAdminCaller ? userFromReq?.email : '') ?? '';
      const ownerId = shop.userId || shop.owner_id || (!isAdminCaller ? userFromReq?.uid : '') || shop.ownerName || 'Owner';

      // Verify ownership if updating an existing shop
      const existingShops = readJsonFile<any[]>(SHOPS_FILE, []);
      const existingShop = existingShops.find(s => s.id === shop.id);
      if (existingShop && !isAdminCaller && !isAuthorizedAdmin(userFromReq)) {
        const isOwner =
          (existingShop.userId && (existingShop.userId === userFromReq?.uid || existingShop.userId === ownerId)) ||
          (existingShop.owner_id && (existingShop.owner_id === userFromReq?.uid || existingShop.owner_id === ownerId)) ||
          (existingShop.ownerEmail && userFromReq?.email && existingShop.ownerEmail.toLowerCase() === userFromReq.email.toLowerCase());
        if (!isOwner && (existingShop.userId || existingShop.ownerEmail)) {
          return res.status(403).json({ error: "Unauthorized: You can only edit your own registered business." });
        }
      }

      const autoApprove = isAdminCaller;
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

          await dbPool.query(`
            INSERT INTO shops (id, name, type, category_label, owner_name, phone, area, address, description, photo_url, rating, review_count, is_verified, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              owner_name = EXCLUDED.owner_name,
              phone = EXCLUDED.phone,
              description = EXCLUDED.description,
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
      }

      if (dbPool && isDbConnected) {
        try {
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
          const result = await dbPool.query("SELECT * FROM helpers ORDER BY created_at DESC");
          if (result.rows.length > 0) {
            result.rows.forEach(r => {
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
      }

      if (helper.idDocUrl || helper.id_doc_url) {
        const docCheck = validateServerUploadedDataUrl(helper.idDocUrl || helper.id_doc_url, { allowPdf: true });
        if (!docCheck.valid) {
          return res.status(400).json({ error: docCheck.error });
        }
      }

      const isAdminCaller = isRequestAdmin(req);
      const userFromReq = (req as any).user;
      const userEmail = helper.email ?? (!isAdminCaller ? userFromReq?.email : '') ?? '';
      const userId = helper.userId || (!isAdminCaller ? userFromReq?.uid : '') || helper.id || '';

      // Ownership check if updating an existing helper profile
      const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
      const existingHelper = helpers.find(h => h.id === helper.id);
      if (existingHelper && !isAdminCaller && !isAuthorizedAdmin(userFromReq)) {
        const isOwner =
          (existingHelper.userId && (existingHelper.userId === userFromReq?.uid || existingHelper.userId === userId)) ||
          (existingHelper.email && userFromReq?.email && existingHelper.email.toLowerCase() === userFromReq.email.toLowerCase());
        if (!isOwner && (existingHelper.userId || existingHelper.email)) {
          return res.status(403).json({ error: "Unauthorized: You can only update your own helper profile." });
        }
      }

      const autoApprove = isAdminCaller;
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
        } catch (e) {}
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
      }

      writeJsonFile(HELPERS_FILE, helpers.filter(h => h.id !== id));
      if (dbPool && isDbConnected) {
        try {
          await dbPool.query("DELETE FROM helpers WHERE id = $1", [id]);
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

  app.get("/api/audit-logs", requireAdmin, (req, res) => {
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

  app.get("/api/reports", requireAdmin, (req, res) => {
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

  app.get("/api/ads", async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const cached = getPublicCache('public_ads');
      if (cached) {
        return res.json(cached);
      }

      const adsMap = new Map<string, any>();
      const fileAds = readJsonFile<any[]>(ADS_FILE, []);
      fileAds.forEach(a => {
        if (a && a.id) adsMap.set(a.id, a);
      });
      if (dbPool && isDbConnected) {
        try {
          const dbRes = await dbPool.query("SELECT id, data FROM ad_banners ORDER BY created_at DESC");
          dbRes.rows.forEach(r => {
            if (r.id && r.data && !adsMap.has(r.id)) {
              adsMap.set(r.id, r.data);
            }
          });
        } catch {}
      }
      const allAds = Array.from(adsMap.values());
      setPublicCache('public_ads', allAds);
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

      if (ad.photoUrl && String(ad.photoUrl).startsWith('data:')) {
        const photoCheck = validateServerUploadedDataUrl(ad.photoUrl, { allowPdf: false });
        if (!photoCheck.valid) {
          return res.status(400).json({ error: photoCheck.error });
        }
      }

      const ads = readJsonFile<any[]>(ADS_FILE, []);
      const newAd = {
        id: ad.id || 'ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        businessName: sanitizeStringServer(ad.businessName.trim(), 200),
        logo: sanitizeStringServer(ad.logo || '🏪', 20),
        category: sanitizeStringServer(ad.category || 'Retail & Services', 120),
        offerBadge: sanitizeStringServer(ad.offerBadge || '🔥 Special Offer', 100),
        offerTitle: sanitizeStringServer(ad.offerTitle.trim(), 200),
        description: sanitizeStringServer(ad.description || '', 1000),
        photoUrl: ad.photoUrl || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80',
        distance: typeof ad.distance === 'number' ? ad.distance : 0.4,
        area: sanitizeStringServer(ad.area || 'Local Market', 200),
        rating: typeof ad.rating === 'number' ? ad.rating : 4.9,
        reviewCount: typeof ad.reviewCount === 'number' ? ad.reviewCount : 12,
        isVerified: true,
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
            `INSERT INTO ad_banners (id, data, created_at) VALUES ($1, $2, NOW())
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
            [newAd.id, JSON.stringify(newAd)]
          );
        } catch {}
      }

      invalidatePublicCache(['public_ads']);
      console.log(`[Ad Banner Saved] ${newAd.id}: ${newAd.businessName}`);
      res.status(201).json(newAd);
    } catch (e) {
      console.error("Failed to save ad banner:", e);
      res.status(500).json({ error: "Failed to save ad banner" });
    }
  });

  app.delete("/api/ads/:id", requireAdmin, async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const ads = readJsonFile<any[]>(ADS_FILE, []);
      const filtered = ads.filter(a => a.id !== id);
      writeJsonFile(ADS_FILE, filtered);
      if (dbPool && isDbConnected) {
        try {
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

      if (payload.photoOrLogoUrl && String(payload.photoOrLogoUrl).startsWith('data:')) {
        const photoCheck = validateServerUploadedDataUrl(payload.photoOrLogoUrl, { allowPdf: true });
        if (!photoCheck.valid) {
          return res.status(400).json({ error: photoCheck.error });
        }
      }

      if (payload.resumeUrl && String(payload.resumeUrl).startsWith('data:')) {
        const resumeCheck = validateServerUploadedDataUrl(payload.resumeUrl, { allowPdf: true });
        if (!resumeCheck.valid) {
          return res.status(400).json({ error: resumeCheck.error });
        }
      }

      if (payload.type === 'job_seeker' && !payload.fullName) {
        return res.status(400).json({ error: "Full Name is required for Job Seeker profile" });
      }

      if (payload.type === 'employer_vacancy' && (!payload.companyOrShopName || !payload.jobRole)) {
        return res.status(400).json({ error: "Company/Shop name and Job Role are required for Employer vacancy" });
      }

      const isAdminCaller = isRequestAdmin(req);
      const autoApprove = isAdminCaller;

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
        email: sanitizeStringServer(payload.email?.trim() || '', 150),
        area: sanitizeStringServer(payload.area?.trim() || 'Local Area', 150),
        address: sanitizeStringServer(payload.address?.trim() || '', 300),
        description: sanitizeStringServer(payload.description?.trim() || (isSeeker ? 'Looking for local employment opportunities.' : 'Staff required for our business.'), 2000),
        photoOrLogoUrl: payload.photoOrLogoUrl || (isSeeker 
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80'),
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
      }
      const filtered = items.filter(i => i.id !== id);
      writeJsonFile(JOB_PORTAL_FILE, filtered);
      if (dbPool && isDbConnected) {
        try {
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
      item.lastInteractionAt = new Date().toISOString();

      intents[idx] = item;
      writeJsonFile(INTENTS_FILE, intents);

      if (dbPool && isDbConnected) {
        try {
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
        if (v.entityId === id) {
          v.status = helper.status;
          v.userName = helper.name;
          v.userPhone = helper.phone;
        }
      });
      writeJsonFile(VERIFICATIONS_FILE, verifs);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            "UPDATE helpers SET name = $1, phone = $2, category_id = $3, area = $4, experience = $5, is_verified = $6 WHERE id = $7",
            [helper.name, helper.phone, helper.categoryId, helper.area, helper.experience, Boolean(helper.isVerified), id]
          );
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
      const helpers = readJsonFile<any[]>(HELPERS_FILE, []);
      const targetHelper = helpers.find(h => h.id === id);
      if (targetHelper) {
        await archiveToSecurityVault(
          "helper",
          targetHelper.id,
          { ...targetHelper, idDocumentWatermarked: targetHelper.idDocUrl || "" },
          "ADMIN_REMOVED_PUBLIC"
        );
      }
      writeJsonFile(HELPERS_FILE, helpers.filter(h => h.id !== id));

      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      Object.keys(profiles).forEach(k => {
        if (profiles[k]?.myHelperProfile?.id === id) {
          delete profiles[k].myHelperProfile;
        }
      });
      writeJsonFile(PROFILES_FILE, profiles);

      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      writeJsonFile(VERIFICATIONS_FILE, verifs.filter(v => v.entityId !== id));

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query("DELETE FROM helpers WHERE id = $1", [id]);
        } catch (e) {}
      }

      invalidatePublicCache(['public_helpers']);
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete helper profile" });
    }
  });

  // 3. Admin Simple User Profiles: List all, Approve, Reject, Edit, or Delete
  app.get("/api/admin/profiles", requireAdmin, async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const userMap = new Map<string, any>();

      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      const userVerifMap = new Map<string, any>();
      verifs.forEach(v => {
        if (v && v.entityType === 'user_profile') {
          if (v.userId) userVerifMap.set(String(v.userId), v);
          if (v.entityId) userVerifMap.set(String(v.entityId), v);
          if (v.userEmail) userVerifMap.set(String(v.userEmail).toLowerCase(), v);
        }
      });

      const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
      Object.values(authUsers).forEach((u: any) => {
        if (!u) return;
        const uid = u.uid || u.email;
        if (!uid) return;
        const matchedVerif = userVerifMap.get(String(uid)) || userVerifMap.get(String(u.email || '').toLowerCase());
        const status = u.status || matchedVerif?.status || (u.isVerified ? 'approved' : 'approved');
        userMap.set(String(uid), {
          uid: String(uid),
          id: String(uid),
          name: u.name || (u.email ? u.email.split('@')[0] : 'User'),
          email: u.email || '',
          phone: u.phone || matchedVerif?.userPhone || '',
          address: u.address || '',
          skills: u.skills || '',
          experience: u.experience || '',
          status,
          isVerified: status === 'approved',
          idDocumentWatermarked: matchedVerif?.idDocumentWatermarked || '',
          createdAt: u.updatedAt || u.createdAt || new Date().toISOString()
        });
      });

      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      Object.values(profiles).forEach((p: any) => {
        if (!p) return;
        const uid = p.uid || p.id || p.email;
        if (!uid) return;
        const existing = userMap.get(String(uid)) || {};
        const matchedVerif = userVerifMap.get(String(uid)) || userVerifMap.get(String(p.email || '').toLowerCase());
        const isVerif = Boolean(p.isVerified || p.is_verified || matchedVerif?.status === 'approved' || existing.isVerified);
        const status = p.status || matchedVerif?.status || (isVerif ? 'approved' : 'pending');
        userMap.set(String(uid), {
          ...existing,
          uid: String(uid),
          id: String(uid),
          name: p.full_name || p.displayName || p.name || existing.name || 'Community Member',
          email: p.email || existing.email || '',
          phone: p.phone || existing.phone || matchedVerif?.userPhone || '',
          address: p.address || existing.address || '',
          skills: p.skills || existing.skills || '',
          experience: p.experience || existing.experience || '',
          avatarUrl: p.avatar_url || p.photoURL || existing.avatarUrl || '',
          status,
          isVerified: status === 'approved',
          idDocumentWatermarked: matchedVerif?.idDocumentWatermarked || existing.idDocumentWatermarked || '',
          createdAt: p.updated_at || existing.createdAt || new Date().toISOString()
        });
      });

      // Also include any standalone user_profile verification requests not yet in userMap
      verifs.forEach(v => {
        if (v && v.entityType === 'user_profile' && !String(v.id || '').startsWith('verif_hlp_')) {
          const key = String(v.userId || v.entityId || v.id);
          if (!userMap.has(key)) {
            userMap.set(key, {
              uid: key,
              id: key,
              name: v.userName || 'Community Member',
              email: v.userEmail || '',
              phone: v.userPhone || '',
              address: '',
              skills: v.title || '',
              experience: '',
              status: v.status || 'pending',
              isVerified: v.status === 'approved',
              idDocumentWatermarked: v.idDocumentWatermarked || '',
              createdAt: v.createdAt || new Date().toISOString()
            });
          }
        }
      });

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

      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      const current = profiles[uid] || { uid, id: uid };

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
      if (typeof updates.category === 'string') current.category = sanitizeStringServer(updates.category, 100);
      if (typeof updates.status === 'string') {
        current.status = updates.status;
        current.isVerified = updates.status === 'approved';
        current.is_verified = updates.status === 'approved';
      }
      current.updated_at = new Date().toISOString();
      profiles[uid] = current;
      writeJsonFile(PROFILES_FILE, profiles);

      const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
      Object.keys(authUsers).forEach(emailKey => {
        if (authUsers[emailKey]?.uid === uid || emailKey === current.email) {
          if (current.name) authUsers[emailKey].name = current.name;
          if (current.phone) authUsers[emailKey].phone = current.phone;
          if (current.status) authUsers[emailKey].status = current.status;
          authUsers[emailKey].isVerified = Boolean(current.isVerified);
        }
      });
      writeJsonFile(AUTH_USERS_FILE, authUsers);

      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      verifs.forEach(v => {
        if (v.userId === uid || v.entityId === uid) {
          if (current.status) v.status = current.status;
          if (current.name) v.userName = current.name;
          if (current.phone) v.userPhone = current.phone;
        }
      });
      writeJsonFile(VERIFICATIONS_FILE, verifs);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            "UPDATE profiles SET full_name = $1, email = $2, phone = $3, address = $4, skills = $5, experience = $6 WHERE uid = $7",
            [current.name || '', current.email || '', current.phone || '', current.address || '', current.skills || '', current.experience || '', uid]
          );
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
      const profiles = readJsonFile<Record<string, any>>(PROFILES_FILE, {});
      const targetProf = profiles[uid];
      const targetEmail = targetProf?.email?.toLowerCase();
      if (targetProf) {
        await archiveToSecurityVault("user_profile", uid, targetProf, "ADMIN_REMOVED_PUBLIC");
      }
      delete profiles[uid];
      writeJsonFile(PROFILES_FILE, profiles);

      const authUsers = readJsonFile<Record<string, any>>(AUTH_USERS_FILE, {});
      Object.keys(authUsers).forEach(k => {
        if (authUsers[k]?.uid === uid || k === uid.toLowerCase() || (targetEmail && k === targetEmail)) {
          delete authUsers[k];
        }
      });
      writeJsonFile(AUTH_USERS_FILE, authUsers);

      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      writeJsonFile(VERIFICATIONS_FILE, verifs.filter(v => v.userId !== uid && v.entityId !== uid));

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query('DELETE FROM "user" WHERE id = $1', [uid]);
          await dbPool.query("DELETE FROM profiles WHERE uid = $1", [uid]);
        } catch (e) {}
      }

      invalidatePublicCache(['public_helpers', 'public_shops']);
      res.json({ success: true, uid });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete user profile" });
    }
  });

  // 4. Admin Business / Shop Registrations: Approve, Reject, Edit, or Delete (Upserts if created locally)
  app.patch("/api/admin/shops/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const shops = readJsonFile<any[]>(SHOPS_FILE, []);
      let idx = shops.findIndex(s => s.id === id);
      if (idx === -1) {
        const bName = sanitizeStringServer(updates.name || updates.businessName || 'Local Business', 200);
        const cat = sanitizeStringServer(updates.categoryLabel || updates.category || 'Retail & Services', 120);
        shops.unshift({
          id,
          name: bName,
          businessName: bName,
          business_name: bName,
          type: 'shop',
          category: cat,
          categoryLabel: cat,
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
        });
        idx = 0;
      }

      const shop = shops[idx];
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

      shops[idx] = shop;
      writeJsonFile(SHOPS_FILE, shops);

      const verifs = readJsonFile<any[]>(VERIFICATIONS_FILE, []);
      verifs.forEach(v => {
        if (v.entityId === id) {
          v.status = shop.status;
          v.userName = shop.name;
          v.userPhone = shop.phone;
        }
      });
      writeJsonFile(VERIFICATIONS_FILE, verifs);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            "UPDATE shops SET name = $1, owner_name = $2, phone = $3, category_label = $4, area = $5, address = $6, description = $7, is_verified = $8 WHERE id = $9",
            [shop.name, shop.ownerName, shop.phone, shop.categoryLabel, shop.area, shop.address, shop.description, Boolean(shop.isVerified), id]
          );
          await dbPool.query(
            "UPDATE businesses SET business_name = $1, category = $2, address = $3, phone = $4 WHERE id = $5",
            [shop.name, shop.categoryLabel, shop.address, shop.phone, id]
          );
        } catch (e) {}
      }

      invalidatePublicCache(['public_shops', 'public_helpers']);
      res.json({ success: true, item: shop });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update shop/business" });
    }
  });

  app.delete("/api/admin/shops/:id", requireAdmin, deleteBusinessHandler);

  // 5 & 6. Admin Job Seekers & Employer Vacancies: Edit any field (Upserts if missing)
  app.patch("/api/admin/job-portal/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
      let idx = items.findIndex(i => i.id === id);
      if (idx === -1) {
        items.unshift({
          id,
          type: updates.type || (String(id).startsWith('job_emp') ? 'employer_vacancy' : 'job_seeker'),
          status: updates.status || 'approved',
          createdAt: updates.createdAt || new Date().toISOString()
        });
        idx = 0;
      }

      const item = items[idx];
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

      items[idx] = item;
      writeJsonFile(JOB_PORTAL_FILE, items);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            `UPDATE job_portal_items SET status = $1, data = $2 WHERE id = $3`,
            [item.status, JSON.stringify(item), id]
          );
        } catch {}
      }

      res.json({ success: true, item });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update job portal item" });
    }
  });

  // 7. Admin User Feedback & Reports: Approve/Resolve, Reject, Edit, or Delete
  app.patch("/api/admin/reports/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const reports = readJsonFile<any[]>(REPORTS_FILE, []);
      const idx = reports.findIndex(r => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Feedback / Report not found" });
      }

      const rep = reports[idx];
      if (typeof updates.reason === 'string') rep.reason = sanitizeStringServer(updates.reason, 200);
      if (typeof updates.details === 'string') rep.details = sanitizeStringServer(updates.details, 1000);
      if (typeof updates.reporterName === 'string') rep.reporterName = sanitizeStringServer(updates.reporterName, 120);
      if (typeof updates.status === 'string') rep.status = sanitizeStringServer(updates.status, 40);

      reports[idx] = rep;
      writeJsonFile(REPORTS_FILE, reports);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            "UPDATE admin_reports SET reason = $1, details = $2, status = $3 WHERE id = $4",
            [rep.reason || '', rep.details || '', rep.status || 'approved', id]
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
      const reports = readJsonFile<any[]>(REPORTS_FILE, []);
      writeJsonFile(REPORTS_FILE, reports.filter(r => r.id !== id));

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query("DELETE FROM admin_reports WHERE id = $1", [id]);
        } catch (e) {}
      }

      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete feedback/report" });
    }
  });

  app.post("/api/admin/clear-dummy-data", requireAdmin, async (req, res) => {
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

      invalidatePublicCache();

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

  app.post("/api/admin/reset-database", requireAdmin, async (req, res) => {
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

      invalidatePublicCache();

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
      const safeDoc = idDocumentWatermarked || '';

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
      if (isEmail && req.body.newPassword && String(req.body.newPassword).length >= 6) {
        await saveAccountWithPassword(
          cleanIdentifier,
          user.uid,
          user.displayName,
          user.phone,
          hashPassword(String(req.body.newPassword))
        );
      }

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
  // CATEGORY 16:9 IMAGES API (Public GET, Admin Add/Edit/Delete)
  // ==========================================
  app.get("/api/category-images", async (_req, res) => {
    try {
      const cached = getPublicCache('category_images');
      if (cached) {
        return res.json(cached);
      }

      const fileImages = readJsonFile<Record<string, string>>(CATEGORY_IMAGES_FILE, {});
      const merged: Record<string, string> = { ...fileImages };

      if (dbPool && isDbConnected) {
        try {
          const dbRes = await dbPool.query("SELECT category_id, image_url FROM category_images");
          for (const row of dbRes.rows) {
            if (row.category_id && row.image_url) {
              merged[row.category_id] = row.image_url;
            }
          }
        } catch (_dbErr) {}
      }

      const responsePayload = { success: true, images: merged };
      setPublicCache('category_images', responsePayload);
      return res.json(responsePayload);
    } catch (e) {
      return res.json({ success: true, images: {} });
    }
  });

  app.post("/api/category-images", async (req, res) => {
    try {
      const { categoryId, imageUrl } = req.body || {};
      const cleanId = String(categoryId || "").trim();
      const cleanUrl = String(imageUrl || "").trim();

      if (!cleanId || !cleanUrl) {
        return res.status(400).json({ error: "categoryId and imageUrl are required" });
      }

      const fileImages = readJsonFile<Record<string, string>>(CATEGORY_IMAGES_FILE, {});
      fileImages[cleanId] = cleanUrl;
      writeJsonFile(CATEGORY_IMAGES_FILE, fileImages);

      if (dbPool && isDbConnected) {
        try {
          await dbPool.query(
            `INSERT INTO category_images (category_id, image_url, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (category_id) DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = NOW()`,
            [cleanId, cleanUrl]
          );
        } catch (dbErr: any) {
          console.warn("[PostgreSQL] category_images upsert notice:", dbErr.message);
        }
      }

      invalidatePublicCache(['category_images']);
      return res.json({ success: true, categoryId: cleanId, imageUrl: cleanUrl, images: fileImages });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to save category image" });
    }
  });

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

  // Browser cache headers for static assets: Cache-Control: public, max-age=86400 (1 day)
  app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    if (
      p.endsWith('.webp') ||
      p.endsWith('.png') ||
      p.endsWith('.jpg') ||
      p.endsWith('.jpeg') ||
      p.endsWith('.svg') ||
      p.endsWith('.css') ||
      p.endsWith('.js') ||
      p.endsWith('.woff') ||
      p.endsWith('.woff2') ||
      p.endsWith('.ico')
    ) {
      if (!p.includes('sw.js')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
    next();
  });

  const staticCacheOptions = {
    maxAge: 86400000,
    setHeaders: (res: express.Response, filePath: string) => {
      if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
        res.setHeader('Cache-Control', 'no-cache');
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
