/**
 * LocoHelp Frontend Security Module
 * Implements:
 * 1. Strict File Upload Validation (Allowlist: JPEG, PNG, WebP <= 2MB; PDF with %PDF- header <= 5MB; blocks double extensions, SVG, HTML, executables)
 * 2. XSS & Injection Sanitization (Strips <script>, <iframe>, onerror, javascript:, etc.)
 * 3. Client-side Anti-Spam Cooldowns (30s post creation cooldown, 60s OTP resend cooldown)
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  errorHi?: string;
  mimeType?: string;
  isPdf?: boolean;
}

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/bmp'
]);
const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'jfif', 'gif', 'avif', 'heic', 'heif', 'bmp']);
const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB raw file limit (supports high-res mobile cameras, auto-compressed to WebP before save)
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;  // 10MB

// Dangerous extensions that must never appear as the file extension or penultimate extension
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'html', 'htm', 'svg', 'svgz',
  'php', 'phtml', 'py', 'rb', 'pl', 'sh', 'bash', 'bat', 'cmd', 'ps1', 'vbs',
  'msi', 'dll', 'so', 'dylib', 'bin', 'apk', 'jar', 'war', 'ear', 'scr',
  'hta', 'cpl', 'wasm', 'swf', 'xhtml', 'xml', 'sql', 'env'
]);

/**
 * Checks if a filename has a dangerous double extension (e.g. .pdf.exe, .jpg.js) or blocked extension
 */
export function hasDangerousOrDoubleExtension(fileName: string, allowPdf: boolean): { blocked: boolean; reasonEn?: string; reasonHi?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { blocked: false };
  }

  const cleanName = fileName.trim();
  if (cleanName.includes('\0') || cleanName.includes('..') || cleanName.includes('/') || cleanName.includes('\\')) {
    return { blocked: true, reasonEn: 'Invalid characters in file name.', reasonHi: 'फ़ाइल नाम में अमान्य अक्षर हैं।' };
  }

  const parts = cleanName.toLowerCase().split('.');
  if (parts.length < 2) {
    // Mobile gallery pickers sometimes provide filenames without an extension; allow MIME/magic byte check to verify
    return { blocked: false };
  }

  const extParts = parts.slice(1);
  const finalExt = extParts[extParts.length - 1];
  const prevExt = extParts.length >= 2 ? extParts[extParts.length - 2] : '';

  // Block if the final extension or the immediately preceding extension is a dangerous executable/script extension
  if (BLOCKED_EXTENSIONS.has(finalExt) || (prevExt && BLOCKED_EXTENSIONS.has(prevExt))) {
    const bad = BLOCKED_EXTENSIONS.has(finalExt) ? finalExt : prevExt;
    return {
      blocked: true,
      reasonEn: `Security Block: ".${bad}" files and executable/script double extensions (like .pdf.exe or .jpg.js) are strictly prohibited.`,
      reasonHi: `सुरक्षा ब्लॉक: ".${bad}" फ़ाइलें और डबल एक्सटेंशन (जैसे .pdf.exe या .jpg.js) सख्त वर्जित हैं।`
    };
  }

  const isAllowedImageExt = ALLOWED_IMAGE_EXTS.has(finalExt) || /^\d+$/.test(finalExt) || finalExt === 'mpo' || finalExt === 'tmp';
  const isAllowedPdfExt = allowPdf && finalExt === 'pdf';

  if (!isAllowedImageExt && !isAllowedPdfExt) {
    return {
      blocked: true,
      reasonEn: allowPdf
        ? 'Only JPG, PNG, WebP images (up to 25MB) and PDF files (up to 10MB) are allowed.'
        : 'Only JPG, PNG, and WebP images (up to 25MB) are allowed.',
      reasonHi: allowPdf
        ? 'केवल JPG, PNG, WebP इमेज (25MB तक) और PDF फ़ाइलें (10MB तक) ही मान्य हैं।'
        : 'केवल JPG, PNG और WebP इमेज (25MB तक) ही मान्य हैं।'
    };
  }

  return { blocked: false };
}

/**
 * Strictly validates an uploaded File on the client using extension, MIME allowlist, size limits, and binary magic headers.
 */
export async function validateUploadedFile(
  file: File | null | undefined,
  options?: { allowPdf?: boolean; maxSizeBytes?: number }
): Promise<FileValidationResult> {
  if (!file) {
    return { valid: false, error: 'No file selected.', errorHi: 'कोई फ़ाइल नहीं चुनी गई।' };
  }

  const allowPdf = options?.allowPdf ?? false;

  // 1. Validate filename & block double extensions / SVG / HTML / executables
  const extCheck = hasDangerousOrDoubleExtension(file.name, allowPdf);
  if (extCheck.blocked) {
    return {
      valid: false,
      error: extCheck.reasonEn,
      errorHi: extCheck.reasonHi
    };
  }

  const hasExt = file.name.includes('.');
  const finalExt = hasExt ? (file.name.toLowerCase().split('.').pop() || '') : '';
  const mime = (file.type || '').toLowerCase().trim();

  // Explicitly block SVG and HTML MIME types
  if (mime.includes('svg') || mime.includes('html') || mime.includes('javascript') || mime.includes('xml') || mime.includes('executable')) {
    return {
      valid: false,
      error: 'Security Block: HTML, SVG, and executable files are strictly prohibited.',
      errorHi: 'सुरक्षा ब्लॉक: HTML, SVG और एग्जीक्यूटेबल फ़ाइलें सख्त वर्जित हैं।'
    };
  }

  // 2. Check PDF validation if file is PDF
  if (finalExt === 'pdf' || mime === 'application/pdf') {
    if (!allowPdf) {
      return {
        valid: false,
        error: 'PDF files are not allowed in this field. Please upload a JPG, PNG, or WebP image (max 25MB).',
        errorHi: 'यहाँ PDF फ़ाइल मान्य नहीं है। कृपया JPG, PNG या WebP इमेज (अधिकतम 25MB) अपलोड करें।'
      };
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      return {
        valid: false,
        error: 'PDF file size exceeds the 10MB maximum limit.',
        errorHi: 'PDF फ़ाइल का आकार 10MB की अधिकतम सीमा से अधिक है।'
      };
    }

    if (file.size < 8) {
      return {
        valid: false,
        error: 'PDF file is empty or corrupted.',
        errorHi: 'PDF फ़ाइल खाली या खराब है।'
      };
    }

    // Verify %PDF- magic header
    try {
      const headerBuffer = await file.slice(0, 512).arrayBuffer();
      const bytes = new Uint8Array(headerBuffer);
      // %PDF- in ASCII is 0x25, 0x50, 0x44, 0x46, 0x2D
      const isPdfHeader =
        bytes.length >= 5 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2d;

      if (!isPdfHeader) {
        return {
          valid: false,
          error: 'Security Block: File does not contain a valid "%PDF-" header.',
          errorHi: 'सुरक्षा ब्लॉक: फ़ाइल में मान्य "%PDF-" हेडर नहीं है।'
        };
      }
    } catch (e) {
      return {
        valid: false,
        error: 'Could not verify PDF file header.',
        errorHi: 'PDF फ़ाइल हेडर सत्यापित नहीं हो सका।'
      };
    }

    return { valid: true, mimeType: 'application/pdf', isPdf: true };
  }

  // 3. Image Validation (Android WebView camera intents sometimes set mime to 'application/octet-stream' or '')
  const mimeOk = !mime || mime === 'application/octet-stream' || ALLOWED_IMAGE_MIMES.has(mime) || mime.startsWith('image/');
  const extOk = !finalExt || ALLOWED_IMAGE_EXTS.has(finalExt) || /^\d+$/.test(finalExt) || finalExt === 'mpo' || finalExt === 'tmp';
  if (!mimeOk || !extOk) {
    return {
      valid: false,
      error: 'Only safe images (JPEG, PNG, WebP) are allowed.',
      errorHi: 'केवल सुरक्षित इमेज (JPEG, PNG, WebP) की अनुमति है।'
    };
  }

  const maxImgSize = options?.maxSizeBytes ?? MAX_IMAGE_SIZE_BYTES;
  if (file.size > maxImgSize) {
    const mbLimit = Math.round(maxImgSize / (1024 * 1024));
    return {
      valid: false,
      error: `Image size exceeds the ${mbLimit}MB limit. Please choose a smaller image.`,
      errorHi: `इमेज का साइज़ ${mbLimit}MB से अधिक है। कृपया छोटी इमेज चुनें।`
    };
  }

  if (file.size < 12) {
    return {
      valid: false,
      error: 'Image file is empty or corrupted.',
      errorHi: 'इमेज फ़ाइल खाली या खराब है।'
    };
  }

  // Verify magic bytes for images and check for embedded scripts
  try {
    const headerBuffer = await file.slice(0, 512).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);

    const isExe =
      (bytes[0] === 0x4d && bytes[1] === 0x5a) || // MZ
      (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46); // ELF
    if (isExe) {
      return {
        valid: false,
        error: 'Security Block: Executable file is strictly prohibited.',
        errorHi: 'सुरक्षा ब्लॉक: एग्जीक्यूटेबल फ़ाइल सख्त वर्जित है।'
      };
    }

    // Check first 512 bytes for disguised HTML/SVG/Script tags
    const textSample = new TextDecoder('utf-8', { fatal: false }).decode(bytes).toLowerCase();
    if (
      textSample.includes('<script') ||
      textSample.includes('<iframe') ||
      textSample.includes('<svg') ||
      textSample.includes('<!doctype html') ||
      textSample.includes('javascript:') ||
      textSample.includes('onerror=')
    ) {
      return {
        valid: false,
        error: 'Security Block: Malicious script or HTML content detected inside file.',
        errorHi: 'सुरक्षा ब्लॉक: फ़ाइल में संदिग्ध स्क्रिप्ट या HTML कोड पाया गया।'
      };
    }
  } catch (e) {
    return {
      valid: false,
      error: 'Failed to inspect image file header.',
      errorHi: 'इमेज फ़ाइल की जांच करने में त्रुटि।'
    };
  }

  return { valid: true, mimeType: mime, isPdf: false };
}

/**
 * XSS & Injection Sanitizer for user text inputs
 * Strips <script>, <iframe>, <svg>, <object>, <embed>, onerror/onload event handlers, and javascript: URIs
 */
export function sanitizeText(input: unknown, maxLength?: number): string {
  if (typeof input !== 'string') return '';
  if (!input) return '';

  // Do not corrupt valid base64 data URLs for allowed images/PDFs
  if (
    input.startsWith('data:image/jpeg;base64,') ||
    input.startsWith('data:image/png;base64,') ||
    input.startsWith('data:image/webp;base64,') ||
    input.startsWith('data:application/pdf;base64,')
  ) {
    return input;
  }

  let cleaned = input
    // Remove <script>...</script> blocks
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    // Remove <iframe>...</iframe> blocks
    .replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, '')
    // Remove <object>, <embed>, <svg>, <style>, <link>, <meta> tags
    .replace(/<\s*(script|iframe|object|embed|svg|style|link|meta|applet|form)[^>]*>/gi, '')
    .replace(/<\s*\/\s*(script|iframe|object|embed|svg|style|link|meta|applet|form)\s*>/gi, '')
    // Strip inline event handlers like onerror=, onload=, onclick=, onmouseover=
    .replace(/\bon[a-z]{2,25}\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '')
    // Strip javascript:, vbscript:, data:text/html protocols
    .replace(/(javascript|vbscript|data\s*:\s*text\/html|data\s*:\s*image\/svg\+xml)\s*:/gi, '')
    // Strip remaining HTML tags
    .replace(/<\/?[a-z][^>]*>/gi, '')
    // Escape stray angle brackets to prevent tag injection
    .replace(/</g, '‹')
    .replace(/>/g, '›')
    .trim();

  return typeof maxLength === 'number' && maxLength > 0 ? cleaned.slice(0, maxLength) : cleaned;
}

/**
 * Deeply sanitizes all string fields in an object or array before sending to API or saving
 */
export function sanitizePayload<T>(payload: T): T {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload === 'string') {
    return sanitizeText(payload) as unknown as T;
  }
  if (Array.isArray(payload)) {
    return payload.map(item => sanitizePayload(item)) as unknown as T;
  }
  if (typeof payload === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload as Record<string, any>)) {
      result[key] = sanitizePayload(value);
    }
    return result as T;
  }
  return payload;
}

// ==========================================
// CLIENT-SIDE COOLDOWN HELPERS (30s POSTS, 60s OTP)
// ==========================================

const POST_COOLDOWN_MS = 3 * 1000; // 3 seconds
const OTP_COOLDOWN_MS = 60 * 1000;  // 60 seconds

export function getPostCooldownRemainingSeconds(): number {
  try {
    const last = Number(localStorage.getItem('locohelp_last_post_timestamp') || '0');
    if (!last) return 0;
    const elapsed = Date.now() - last;
    if (elapsed < POST_COOLDOWN_MS) {
      return Math.ceil((POST_COOLDOWN_MS - elapsed) / 1000);
    }
  } catch (e) {}
  return 0;
}

export function recordPostCreatedTimestamp(): void {
  try {
    localStorage.setItem('locohelp_last_post_timestamp', String(Date.now()));
  } catch (e) {}
}

export function getOtpCooldownRemainingSeconds(identifier?: string): number {
  try {
    const key = identifier
      ? `locohelp_otp_cooldown_${identifier.trim().toLowerCase()}`
      : 'locohelp_otp_cooldown_global';
    const lastSpecific = Number(localStorage.getItem(key) || '0');
    const lastGlobal = Number(localStorage.getItem('locohelp_otp_cooldown_global') || '0');
    const last = Math.max(lastSpecific, lastGlobal);
    if (!last) return 0;
    const elapsed = Date.now() - last;
    if (elapsed < OTP_COOLDOWN_MS) {
      return Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
    }
  } catch (e) {}
  return 0;
}

export function recordOtpSentTimestamp(identifier?: string): void {
  try {
    const now = String(Date.now());
    localStorage.setItem('locohelp_otp_cooldown_global', now);
    if (identifier) {
      localStorage.setItem(`locohelp_otp_cooldown_${identifier.trim().toLowerCase()}`, now);
    }
  } catch (e) {}
}

// ==========================================
// STRICT 3 MOBILE OTPs PER DAY (24H / IST DAY) CLIENT GUARD
// Synchronized with PostgreSQL mobile_otp_daily_limits table
// ==========================================
export const MAX_DAILY_MOBILE_OTP = 3;

function getIstDayKeyClient(): string {
  try {
    const istTime = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    return istTime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function getDailyMobileOtpStatus(phone?: string): {
  usedToday: number;
  remainingToday: number;
  maxPerDay: number;
  dailyLimitReached: boolean;
} {
  try {
    const dayKey = getIstDayKeyClient();
    const digits = String(phone || '').replace(/\D/g, '').slice(-10);
    const phoneKey = digits.length === 10
      ? `locohelp_mobile_otp_daily_${digits}_${dayKey}`
      : `locohelp_mobile_otp_daily_device_${dayKey}`;
    const deviceKey = `locohelp_mobile_otp_daily_device_${dayKey}`;

    const phoneUsed = Number(localStorage.getItem(phoneKey) || '0');
    const deviceUsed = Number(localStorage.getItem(deviceKey) || '0');
    const usedToday = Math.min(MAX_DAILY_MOBILE_OTP, Math.max(phoneUsed, digits.length === 10 ? phoneUsed : deviceUsed));
    const remainingToday = Math.max(0, MAX_DAILY_MOBILE_OTP - usedToday);

    return {
      usedToday,
      remainingToday,
      maxPerDay: MAX_DAILY_MOBILE_OTP,
      dailyLimitReached: usedToday >= MAX_DAILY_MOBILE_OTP
    };
  } catch {
    return {
      usedToday: 0,
      remainingToday: MAX_DAILY_MOBILE_OTP,
      maxPerDay: MAX_DAILY_MOBILE_OTP,
      dailyLimitReached: false
    };
  }
}

export function syncDailyMobileOtpCount(phone: string, usedCount: number): {
  usedToday: number;
  remainingToday: number;
  maxPerDay: number;
  dailyLimitReached: boolean;
} {
  try {
    const dayKey = getIstDayKeyClient();
    const digits = String(phone || '').replace(/\D/g, '').slice(-10);
    const clamped = Math.max(0, Math.min(MAX_DAILY_MOBILE_OTP, Number(usedCount) || 0));
    if (digits.length === 10) {
      localStorage.setItem(`locohelp_mobile_otp_daily_${digits}_${dayKey}`, String(clamped));
    }
    localStorage.setItem(`locohelp_mobile_otp_daily_device_${dayKey}`, String(clamped));
  } catch {}
  return getDailyMobileOtpStatus(phone);
}

export function recordDailyMobileOtpSent(phone: string, serverUsedCount?: number): {
  usedToday: number;
  remainingToday: number;
  maxPerDay: number;
  dailyLimitReached: boolean;
} {
  const current = getDailyMobileOtpStatus(phone);
  const nextUsed =
    typeof serverUsedCount === 'number'
      ? Math.max(current.usedToday + 1, serverUsedCount)
      : current.usedToday + 1;
  return syncDailyMobileOtpCount(phone, nextUsed);
}

// ==========================================
// SILENT BACKGROUND COMMUNITY GUIDELINES & ABUSE FILTER (SYSTEM SECURITY BLOCK)
// Enforces strict anti-abuse across Hindi, Gujarati, Hinglish, and English without exposing words on UI
// ==========================================

const BLOCKED_ROMAN_TOKENS = new Set([
  // Hindi / Hinglish & Gujarati Romanized abusive tokens
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
  'suar', 'suwar', 'ullu', 'bhadwa', 'bhadwe', 'bhadva', 'bhadve', 'dalla', 'dalal',
  'jhant', 'jhaat', 'jhatu', 'jhaatu', 'mutthal', 'chudai', 'chod', 'chodna', 'chodu', 'chodू',
  // Gujarati specific Romanized abusive tokens
  'pikina', 'pikino', 'pikini', 'gandina', 'gandino', 'gandini',
  'chodina', 'chodino', 'loda', 'lodaa', 'bhosadina', 'bhosadino', 'chodu', 'chodva',
  'raand', 'randva', 'randvo', 'bhadvo', 'bhadvi', 'navri', 'navro',
  // English abusive & explicit tokens
  'fuck', 'fucker', 'fucking', 'motherfucker', 'motherfucking', 'fck', 'fuk', 'fuq',
  'bitch', 'bitches', 'sonofabitch', 'asshole', 'arsehole', 'bastard', 'cunt',
  'dick', 'dickhead', 'cock', 'pussy', 'whore', 'slut', 'prostitute', 'escort',
  'porn', 'porno', 'xxx', 'nude', 'nudes', 'sexchat', 'callgirl', 'callgirls', 'randi'
]);

const BLOCKED_NATIVE_SCRIPT_SUBSTRINGS = [
  // Hindi (Devanagari)
  'मादरचोद', 'बहनचोद', 'बेहनचोद', 'भेनचोद', 'बेटीचोद', 'भोसड़ी', 'भोसडी', 'भोसड़ा', 'भोसदिके', 'भोसड़ीके',
  'चूतिया', 'चुतिया', 'चूतिये', 'चूत', 'लंड', 'लौड़ा', 'लौडा', 'लवड़ा', 'लवडे', 'लौड़े',
  'गांड', 'गाण्ड', 'गांडू', 'गाण्डू', 'रंडी', 'रंड़ी', 'छिनाल', 'हरामी', 'हरामखोर', 'हरामजादा', 'हरामज़ादा',
  'भड़वा', 'भडवा', 'भड़वे', 'झाटू', 'झांटू', 'चोदू', 'चुदाई', 'चोदना',
  // Gujarati (ગુજરાતી લિપિ)
  'માદરચોદ', 'બહેનચોદ', 'બેનચોદ', 'ભોસડી', 'ભોસડા', 'ભોસડીના', 'ભોસડીનો',
  'ચૂતિયા', 'ચુતિયા', 'ચોદુ', 'ચોદૂ', 'ચોદવા', 'ચોદીના', 'ચોદીનો',
  'ગાંડ', 'ગાંડુ', 'ગાંડું', 'ગાંડીના', 'ગાંડીનો', 'પીકીના', 'પીકીનો',
  'લંડ', 'લોડા', 'લોડો', 'લવડા', 'રાંડ', 'ભડવો', 'ભડવા', 'હરામી', 'હરામખોર'
];

const BLOCKED_MULTIWORD_PHRASES = [
  'teri maa ki', 'teri ma ki', 'teri bhen ki', 'teri behen ki',
  'maa chod', 'bhen chod', 'gand mar', 'gaand maar', 'muh me le',
  'tari maa ni', 'tari ben ni', 'gand mara', 'call girl', 'sex service', 'paid sex'
];

function normalizeRomanWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[0]/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/[$5]/g, 's')
    .replace(/[^a-z]/g, '')
    // Collapse 3+ repeated letters down to 1 or 2 (e.g. "chuuuutiya" -> "chutiya")
    .replace(/([a-z])\1{2,}/g, '$1');
}

export interface SystemSecurityBlockResult {
  blocked: boolean;
  messageEn: string;
  messageHi: string;
  messageGu: string;
  getMessage: (lang?: string) => string;
}

export function checkSystemSecurityBlock(...inputs: (string | undefined | null | string[])[]): SystemSecurityBlockResult {
  const messageEn = '⚠️ System Security Block: Your post violates our Community Guidelines. Violating platform rules will result in strict legal action.';
  const messageHi = '⚠️ System Security Block: आपकी पोस्ट हमारे कम्युनिटी नियमों (Community Guidelines) के विरुद्ध है। नियम तोड़ने पर सख्त कानूनी कार्यवाही की जाएगी।';
  const messageGu = '⚠️ System Security Block: તમારી પોસ્ટ અમારા કોમ્યુનિટી નિયમો (Community Guidelines) ની વિરુદ્ધ છે. નિયમ તોડવા પર કડક કાયદેસરની કાર્યવાહી કરવામાં આવશે.';

  const getMessage = (lang?: string) => {
    const l = (lang || '').toUpperCase();
    if (l === 'GU') return messageGu;
    if (l === 'HI') return messageHi;
    return messageHi; // Default Hindi/Gujarati friendly warning or English if EN
  };

  const getLocalized = (lang?: string) => {
    const l = (lang || '').toUpperCase();
    if (l === 'GU') return messageGu;
    if (l === 'EN') return messageEn;
    return messageHi;
  };

  const combinedText = inputs
    .flat()
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .join(' ');

  if (!combinedText) {
    return { blocked: false, messageEn, messageHi, messageGu, getMessage: getLocalized };
  }

  const lower = combinedText.toLowerCase();

  // 1. Check Devanagari & Gujarati script substrings
  for (const nativeWord of BLOCKED_NATIVE_SCRIPT_SUBSTRINGS) {
    if (combinedText.includes(nativeWord)) {
      return { blocked: true, messageEn, messageHi, messageGu, getMessage: getLocalized };
    }
  }

  // 2. Check multi-word phrases
  const cleanedSpaces = lower.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const phrase of BLOCKED_MULTIWORD_PHRASES) {
    if (cleanedSpaces.includes(phrase)) {
      return { blocked: true, messageEn, messageHi, messageGu, getMessage: getLocalized };
    }
  }

  // 3. Check individual Roman words (with obfuscation normalization)
  const rawTokens = lower.split(/[\s,.;:!?/\\|()[\]{}"'`~_+=<>-]+/).filter(Boolean);
  for (const rawToken of rawTokens) {
    const directClean = rawToken.replace(/[^a-z]/g, '');
    if (directClean && BLOCKED_ROMAN_TOKENS.has(directClean)) {
      return { blocked: true, messageEn, messageHi, messageGu, getMessage: getLocalized };
    }
    const normalized = normalizeRomanWord(rawToken);
    if (normalized && normalized.length >= 3 && BLOCKED_ROMAN_TOKENS.has(normalized)) {
      return { blocked: true, messageEn, messageHi, messageGu, getMessage: getLocalized };
    }
  }

  return { blocked: false, messageEn, messageHi, messageGu, getMessage: getLocalized };
}
