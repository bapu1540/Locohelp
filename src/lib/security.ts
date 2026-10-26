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

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'jfif']);
const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB raw file limit (compressed to <500KB WebP before upload)
const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;   // 5MB

// Dangerous extensions that must never appear anywhere in the filename (including double extensions)
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'html', 'htm', 'svg', 'svgz',
  'php', 'phtml', 'py', 'rb', 'pl', 'sh', 'bash', 'bat', 'cmd', 'ps1', 'vbs',
  'msi', 'dll', 'so', 'dylib', 'bin', 'apk', 'jar', 'war', 'ear', 'com', 'scr',
  'hta', 'cpl', 'wasm', 'swf', 'xhtml', 'xml', 'json', 'sql', 'env'
]);

/**
 * Checks if a filename has a double extension (e.g. .pdf.exe, .jpg.js) or blocked extension
 */
export function hasDangerousOrDoubleExtension(fileName: string, allowPdf: boolean): { blocked: boolean; reasonEn?: string; reasonHi?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { blocked: true, reasonEn: 'Invalid file name.', reasonHi: 'अमान्य फ़ाइल नाम।' };
  }

  const cleanName = fileName.trim();
  if (cleanName.includes('\0') || cleanName.includes('..') || cleanName.includes('/') || cleanName.includes('\\')) {
    return { blocked: true, reasonEn: 'Invalid characters in file name.', reasonHi: 'फ़ाइल नाम में अमान्य अक्षर हैं।' };
  }

  const parts = cleanName.toLowerCase().split('.');
  if (parts.length < 2) {
    return { blocked: true, reasonEn: 'File must have a valid extension (.jpg, .png, .webp, .pdf).', reasonHi: 'फ़ाइल का मान्य एक्सटेंशन होना चाहिए (.jpg, .png, .webp, .pdf)।' };
  }

  const extParts = parts.slice(1);

  // Check if any segment matches a blocked extension (e.g. file.pdf.exe, photo.jpg.js, icon.svg)
  for (const part of extParts) {
    if (BLOCKED_EXTENSIONS.has(part)) {
      return {
        blocked: true,
        reasonEn: `Security Block: ".${part}" files and double extensions (like .pdf.exe or .jpg.js) are strictly prohibited.`,
        reasonHi: `सुरक्षा ब्लॉक: ".${part}" फ़ाइलें और डबल एक्सटेंशन (जैसे .pdf.exe या .jpg.js) सख्त वर्जित हैं।`
      };
    }
  }

  // Block double extensions where multiple file extensions are chained (e.g., document.pdf.jpg or image.jpg.png)
  if (extParts.length > 1) {
    const allowedAll = new Set([...ALLOWED_IMAGE_EXTS, 'pdf']);
    const extMatches = extParts.filter(p => allowedAll.has(p) || BLOCKED_EXTENSIONS.has(p) || /^[a-z]{2,4}$/.test(p));
    if (extMatches.length > 1) {
      return {
        blocked: true,
        reasonEn: 'Security Block: Double file extensions (e.g., .pdf.exe, .jpg.js) are not permitted.',
        reasonHi: 'सुरक्षा ब्लॉक: डबल फ़ाइल एक्सटेंशन (जैसे .pdf.exe, .jpg.js) की अनुमति नहीं है।'
      };
    }
  }

  const finalExt = extParts[extParts.length - 1];
  const isAllowedImageExt = ALLOWED_IMAGE_EXTS.has(finalExt);
  const isAllowedPdfExt = allowPdf && finalExt === 'pdf';

  if (!isAllowedImageExt && !isAllowedPdfExt) {
    return {
      blocked: true,
      reasonEn: allowPdf
        ? 'Only JPG, PNG, WebP images (up to 2MB) and PDF files (up to 5MB) are allowed.'
        : 'Only JPG, PNG, and WebP images (up to 2MB) are allowed.',
      reasonHi: allowPdf
        ? 'केवल JPG, PNG, WebP इमेज (2MB तक) और PDF फ़ाइलें (5MB तक) ही मान्य हैं।'
        : 'केवल JPG, PNG और WebP इमेज (2MB तक) ही मान्य हैं।'
    };
  }

  return { blocked: false };
}

/**
 * Strictly validates an uploaded File on the client using extension, MIME allowlist, size limits, and binary magic headers.
 */
export async function validateUploadedFile(
  file: File | null | undefined,
  options?: { allowPdf?: boolean }
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

  const finalExt = file.name.toLowerCase().split('.').pop() || '';
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
        error: 'PDF files are not allowed in this field. Please upload a JPG, PNG, or WebP image (max 2MB).',
        errorHi: 'यहाँ PDF फ़ाइल मान्य नहीं है। कृपया JPG, PNG या WebP इमेज (अधिकतम 2MB) अपलोड करें।'
      };
    }

    if (finalExt !== 'pdf' || mime !== 'application/pdf') {
      return {
        valid: false,
        error: 'Invalid PDF file: Must have both .pdf extension and application/pdf MIME type.',
        errorHi: 'अमान्य PDF फ़ाइल: .pdf एक्सटेंशन और सही PDF फॉरमेट होना आवश्यक है।'
      };
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      return {
        valid: false,
        error: 'PDF file size exceeds the 5MB maximum limit.',
        errorHi: 'PDF फ़ाइल का आकार 5MB की अधिकतम सीमा से अधिक है।'
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

  // 3. Image Validation (image/jpeg, image/png, image/webp ONLY, up to 2MB)
  if (!ALLOWED_IMAGE_MIMES.has(mime) || !ALLOWED_IMAGE_EXTS.has(finalExt)) {
    return {
      valid: false,
      error: 'Only safe images (JPEG, PNG, WebP) are allowed.',
      errorHi: 'केवल सुरक्षित इमेज (JPEG, PNG, WebP) की अनुमति है।'
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image size exceeds the 2MB limit. Please choose an image under 2MB.',
      errorHi: 'इमेज का साइज़ 2MB से अधिक है। कृपया 2MB से कम की इमेज चुनें।'
    };
  }

  if (file.size < 12) {
    return {
      valid: false,
      error: 'Image file is empty or corrupted.',
      errorHi: 'इमेज फ़ाइल खाली या खराब है।'
    };
  }

  // Verify magic bytes for JPEG, PNG, WebP and check for embedded scripts
  try {
    const headerBuffer = await file.slice(0, 512).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);

    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    const isWebp =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      return {
        valid: false,
        error: 'Security Block: File content does not match a valid JPEG, PNG, or WebP image header.',
        errorHi: 'सुरक्षा ब्लॉक: फ़ाइल एक मान्य JPEG, PNG या WebP इमेज नहीं है।'
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

const POST_COOLDOWN_MS = 30 * 1000; // 30 seconds
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
