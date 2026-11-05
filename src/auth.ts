/**
 * LocoHelp Backend & PostgreSQL Authentication and Data Layer
 * Completely standalone - connects directly to Node.js/Express backend & Railway PostgreSQL
 */

import {
  sanitizePayload,
  sanitizeText,
  getOtpCooldownRemainingSeconds,
  recordOtpSentTimestamp,
  MAX_DAILY_MOBILE_OTP,
  getDailyMobileOtpStatus,
  syncDailyMobileOtpCount,
  recordDailyMobileOtpSent
} from './lib/security';
import {
  sendFirebasePhoneOtp,
  verifyFirebasePhoneOtpCode,
  normalizeIndianPhoneE164
} from './lib/firebase';
export { signInWithGoogle } from './lib/firebase';


export interface AppUser {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  skills?: string;
  address?: string;
  experience?: string;
  updatedAt?: any;
  isGuest?: boolean;
}

export interface Profile {
  uid: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  skills?: string;
  address?: string;
  experience?: string;
  my_helper_profile?: any;
  updated_at?: string;
}

export interface BroadcastPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  description: string;
  category?: string;
  tags?: string[];
  status?: string;
  distance?: number;
  created_at: string;
  expires_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  intent_id?: string;
  created_at: string;
}

type AuthListener = (event: string, session: { user: any } | null) => void;
const authListeners = new Set<AuthListener>();

export function onAuthStateChange(callback: AuthListener) {
  authListeners.add(callback);
  return {
    data: {
      subscription: {
        unsubscribe: () => {
          authListeners.delete(callback);
        }
      }
    }
  };
}

export function notifyAuthState(event: string, user: any) {
  const session = user ? { user } : null;
  authListeners.forEach(listener => {
    try {
      listener(event, session);
    } catch (e) {
      console.warn("Auth listener notification error:", e);
    }
  });
}

/**
 * Legacy hash helper (preserves backward compatibility with records saved before unsigned bitshift fix)
 */
function computeLegacyUUIDVariants(str: string): string[] {
  if (!str) return [];
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const hex3Signed = Math.imul(h1, 31).toString(16).padStart(8, '0');
  const hex4Signed = Math.imul(h2, 127).toString(16).padStart(8, '0');
  const fullSigned = (hex1 + hex2 + hex3Signed + hex4Signed).slice(0, 32);
  const v1 = `${fullSigned.slice(0, 8)}-${fullSigned.slice(8, 12)}-4${fullSigned.slice(13, 16)}-a${fullSigned.slice(17, 20)}-${fullSigned.slice(20, 32)}`;
  return [v1.toLowerCase()];
}

/**
 * Ensures any string ID is converted into a valid PostgreSQL UUID format (8-4-4-4-12 hex string).
 * Strictly idempotent so calling it multiple times on the same ID always produces the exact same UUID.
 */
export function ensureValidUUID(str: string): string {
  if (!str) return '00000000-0000-4000-a000-000000000000';
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str.toLowerCase();

  // Repair any legacy UUID that had a '-' in the last segment due to signed Math.imul
  const legacyUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f-]{12}$/i;
  if (legacyUuidRegex.test(str)) {
    const parts = str.split('-');
    const firstFour = parts.slice(0, 4).join('-');
    const tail = parts.slice(4).join('0').slice(0, 12).padEnd(12, '0');
    return `${firstFour}-${tail}`.toLowerCase();
  }

  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const hex3 = (Math.imul(h1, 31) >>> 0).toString(16).padStart(8, '0');
  const hex4 = (Math.imul(h2, 127) >>> 0).toString(16).padStart(8, '0');

  const full = (hex1 + hex2 + hex3 + hex4).slice(0, 32);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`.toLowerCase();
}

/**
 * Returns active user from persistent local session or guest default.
 */
export function getCurrentUser(): AppUser {
  try {
    const saved = localStorage.getItem('locohelp_user');
    const lastEmail = (localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
    const lastPhone = (localStorage.getItem('locohelp_last_logged_in_phone') || '').replace(/\D/g, '').slice(-10);
    const lastName = localStorage.getItem('locohelp_last_logged_in_name') || '';

    if (saved) {
      const parsed = JSON.parse(saved);
      const effectiveEmail = (parsed?.email || lastEmail || (lastPhone.length === 10 ? `${lastPhone}@phone.locohelp.com` : '')).trim().toLowerCase();
      const rawUid = parsed?.uid && parsed.uid !== 'guest_user'
        ? String(parsed.uid)
        : (lastPhone.length === 10 ? `phone_${lastPhone}` : (effectiveEmail ? `email_${effectiveEmail.replace(/[^a-z0-9]/g, '_')}` : ''));

      if (rawUid && rawUid !== 'guest_user') {
        return {
          ...parsed,
          uid: ensureValidUUID(rawUid),
          email: effectiveEmail || parsed?.email || '',
          phone: parsed?.phone || (lastPhone.length === 10 ? `+91 ${lastPhone}` : undefined),
          displayName: parsed?.displayName || lastName || (effectiveEmail ? effectiveEmail.split('@')[0] : 'Community Member'),
          isGuest: false
        };
      }
    }

    if (lastEmail || lastPhone.length === 10) {
      const resolvedEmail = lastEmail || `${lastPhone}@phone.locohelp.com`;
      const rawId = lastPhone.length === 10 ? `phone_${lastPhone}` : `email_${resolvedEmail.replace(/[^a-z0-9]/g, '_')}`;
      return {
        uid: ensureValidUUID(rawId),
        displayName: lastName || (lastPhone.length === 10 ? `Member +91 ${lastPhone.slice(-4)}` : resolvedEmail.split('@')[0]) || 'Community Member',
        email: resolvedEmail,
        phone: lastPhone.length === 10 ? `+91 ${lastPhone}` : undefined,
        isGuest: false
      };
    }
  } catch (e) {}

  return {
    uid: 'guest_user',
    displayName: 'LocoHelper Member',
    email: '',
    isGuest: true
  };
}

/**
 * Builds a normalized set of all possible IDs and email/phone representations for a user
 * (including UUID, raw phone_ / email_ slug, email, and legacy UUID variants) so sender comparisons never fail.
 */
export function getUserIdentitySet(user?: { uid?: string; id?: string; email?: string; phone?: string } | null): Set<string> {
  const ids = new Set<string>();
  const target = user || getCurrentUser();
  if (!target) return ids;

  const addCandidate = (val?: string | null) => {
    if (!val) return;
    const clean = String(val).trim().toLowerCase();
    if (!clean || clean === 'guest' || clean === 'guest_user' || clean === 'anonymous_user' || clean === 'peer' || clean === 'community peer') {
      return;
    }
    ids.add(clean);
    ids.add(ensureValidUUID(clean).toLowerCase());
    computeLegacyUUIDVariants(clean).forEach(v => {
      ids.add(v);
      ids.add(ensureValidUUID(v).toLowerCase());
    });
  };

  const addPhoneIdentityVariants = (rawPhoneOrId?: string | null) => {
    if (!rawPhoneOrId) return;
    const str = String(rawPhoneOrId).trim().toLowerCase();
    let tenDigits = '';
    if (str.startsWith('phone_')) {
      const d = str.replace(/\D/g, '').slice(-10);
      if (d.length === 10) tenDigits = d;
    } else if (str.endsWith('@phone.locohelp.com')) {
      const d = str.split('@')[0].replace(/\D/g, '').slice(-10);
      if (d.length === 10) tenDigits = d;
    } else {
      const d = str.replace(/\D/g, '');
      if (d.length === 10 && /^[6-9]\d{9}$/.test(d)) {
        tenDigits = d;
      } else if (d.length === 12 && d.startsWith('91') && /^[6-9]\d{9}$/.test(d.slice(2))) {
        tenDigits = d.slice(2);
      }
    }
    if (tenDigits.length === 10) {
      addCandidate(`phone_${tenDigits}`);
      addCandidate(`${tenDigits}@phone.locohelp.com`);
      addCandidate(`email_${tenDigits}_phone_locohelp_com`);
      addCandidate(`otp_${tenDigits}_phone_locohelp_com`);
      addCandidate(tenDigits);
    }
  };

  addCandidate(target.uid);
  addCandidate((target as any).id);
  addPhoneIdentityVariants(target.uid);
  addPhoneIdentityVariants((target as any).id);
  addPhoneIdentityVariants((target as any).phone);

  // Also check raw stored uid/phone in localStorage if checking current user
  if (!user) {
    try {
      const rawSaved = localStorage.getItem('locohelp_user');
      if (rawSaved) {
        const parsed = JSON.parse(rawSaved);
        addCandidate(parsed?.uid);
        addCandidate(parsed?.id);
        addCandidate(parsed?.email);
        addPhoneIdentityVariants(parsed?.uid);
        addPhoneIdentityVariants(parsed?.phone);
        addPhoneIdentityVariants(parsed?.email);
      }
      const savedPhone = localStorage.getItem('locohelp_last_logged_in_phone');
      if (savedPhone) {
        addPhoneIdentityVariants(savedPhone);
      }
    } catch {}
  }

  const email = String(target.email || (!user ? localStorage.getItem('locohelp_last_logged_in_email') || '' : '')).trim().toLowerCase();
  if (email) {
    addCandidate(email);
    addCandidate(ensureValidUUID(email));
    addCandidate(`email_${email.replace(/[^a-z0-9]/g, '_')}`);
    addCandidate(`otp_${email.replace(/[^a-z0-9]/g, '_')}`);
    addPhoneIdentityVariants(email);
  }

  return ids;
}

/**
 * Safely determines if a chat message was sent by the specified user (defaults to current logged-in user).
 */
export function isMessageSentByUser(
  msg: any,
  user?: { uid?: string; id?: string; email?: string } | null
): boolean {
  if (!msg || typeof msg !== 'object') return false;
  if (msg.authorId === 'system' || msg.senderId === 'system' || msg.type === 'task_completed') return false;
  if (msg.authorId === 'my_user' || msg.senderId === 'my_user') return true;

  const targetUser = user || getCurrentUser();
  const targetEmail = String(
    targetUser?.email || (!user ? localStorage.getItem('locohelp_last_logged_in_email') || '' : '')
  ).trim().toLowerCase();

  const msgEmail = String(
    msg.sender_email || msg.senderEmail || msg.authorEmail || msg.email || ''
  ).trim().toLowerCase();

  // If both message and user have a valid email, email comparison is 100% definitive
  if (targetEmail && msgEmail) {
    return targetEmail === msgEmail;
  }

  const identitySet = getUserIdentitySet(targetUser);
  if (identitySet.size === 0) return false;

  const msgSenderCandidates = [
    msg.sender_id,
    msg.senderId,
    msg.authorId,
    msg.user_id,
    msg.userId,
    msgEmail
  ]
    .filter(Boolean)
    .map(v => String(v).trim().toLowerCase());

  for (const candidate of msgSenderCandidates) {
    if (candidate === 'guest' || candidate === 'guest_user' || candidate === 'peer') continue;
    if (identitySet.has(candidate) || identitySet.has(ensureValidUUID(candidate).toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Restores active user session from backend JWT/cookie (/api/auth/me) on app boot
 * so verified users are never forced to re-enter OTP on page refresh.
 */
export async function restoreSessionFromServer(): Promise<AppUser | null> {
  try {
    const token = localStorage.getItem('locohelp_token') || '';
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let fallbackUid = '';
    let fallbackEmail = (localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
    let fallbackPhone = (localStorage.getItem('locohelp_last_logged_in_phone') || '').replace(/\D/g, '').slice(-10);
    try {
      const savedRaw = localStorage.getItem('locohelp_user');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && !parsed.isGuest && parsed.uid && parsed.uid !== 'guest_user' && parsed.uid !== 'guest') {
          fallbackUid = String(parsed.uid).trim();
          if (!fallbackEmail && parsed.email) fallbackEmail = String(parsed.email).trim().toLowerCase();
          if (!fallbackPhone && parsed.phone) fallbackPhone = String(parsed.phone).replace(/\D/g, '').slice(-10);
        }
      }
    } catch {}

    const qs = new URLSearchParams();
    if (fallbackUid) qs.set('uid', fallbackUid);
    if (fallbackEmail) qs.set('email', fallbackEmail);
    if (fallbackPhone) qs.set('phone', fallbackPhone);
    const meUrl = qs.toString() ? `/api/auth/me?${qs.toString()}` : '/api/auth/me';

    const res = await fetch(meUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    if (!res.ok) {
      try {
        const errData = await res.json().catch(() => ({}));
        if (errData?.status === 'deleted' || errData?.status === 'not_found') {
          await logoutUser();
          return null;
        }
        // If browser still thinks user is logged in, verify account still exists in PostgreSQL
        if (localStorage.getItem('locohelp_logged_in') === 'true' || localStorage.getItem('locohelp_user')) {
          const localU = getCurrentUser();
          if (localU && !localU.isGuest && localU.uid !== 'guest_user') {
            const stRes = await fetch(
              `/api/users/approval-status?uid=${encodeURIComponent(localU.uid || '')}&email=${encodeURIComponent(localU.email || '')}&phone=${encodeURIComponent(localU.phone || '')}&_t=${Date.now()}`,
              { cache: 'no-store' }
            );
            if (stRes.ok) {
              const stData = await stRes.json();
              if (stData?.status === 'deleted' || stData?.status === 'not_found') {
                await logoutUser();
                return null;
              }
            }
          }
        }
      } catch {}
      return null;
    }
    const data = await res.json();
    if (!data || !data.success || !data.user) return null;

    const u = data.user;
    const userData: AppUser = {
      uid: ensureValidUUID(u.uid || u.id || u.email),
      displayName: sanitizeText(u.displayName || u.name || (u.email ? u.email.split('@')[0] : 'Community Member')),
      email: u.email || '',
      phone: u.phone || '',
      photoURL: u.photoURL || 'https://lh3.googleusercontent.com/a/default-user',
      isGuest: false
    };

    if (data.token) {
      localStorage.setItem('locohelp_token', data.token);
    }
    localStorage.setItem('locohelp_user', JSON.stringify(userData));
    localStorage.setItem('locohelp_logged_in', 'true');
    if (userData.email) {
      localStorage.setItem('locohelp_last_logged_in_email', userData.email);
      localStorage.setItem('locohelp_last_logged_in_name', userData.displayName);
    }
    if (userData.phone) {
      const cleanP = String(userData.phone).replace(/\D/g, '').slice(-10);
      if (cleanP.length === 10) {
        localStorage.setItem('locohelp_last_logged_in_phone', cleanP);
      }
    }
    notifyAuthState('SIGNED_IN', userData);
    return userData;
  } catch {
    return null;
  }
}

/**
 * Strict RFC 5322 compliant email validator
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Indian 10-digit mobile number validator & normalizer
 */
export function isValidPhone(phone: string): boolean {
  return normalizeIndianPhoneE164(phone).valid;
}

export function normalizeIndianPhone(phone: string): string {
  const norm = normalizeIndianPhoneE164(phone);
  return norm.valid ? norm.tenDigits : String(phone || '').replace(/\D/g, '').slice(-10);
}

export function isPhoneIdentifier(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (trimmed.includes('@') && !trimmed.toLowerCase().endsWith('@phone.locohelp.com')) {
    return false;
  }
  return normalizeIndianPhoneE164(trimmed).valid;
}

export function isValidEmailOrPhone(input: string): boolean {
  return isValidEmail(input) || isValidPhone(input);
}

export function trAuth(en: string, hi: string, gu: string): string {
  try {
    const lang = (localStorage.getItem('locohelp_language') || 'GU').toUpperCase();
    if (lang === 'GU') return gu;
    if (lang === 'HI') return hi;
    return en;
  } catch {
    return gu;
  }
}

export function localizeServerAuthError(
  rawError?: string,
  fallbackEn = 'Authentication failed. Please try again.',
  fallbackHi = 'प्रमाणीकरण विफल रहा। कृपया पुनः प्रयास करें।',
  fallbackGu = 'પ્રમાણીકરણ નિષ્ફળ રહ્યું. કૃપા કરીને ફરી પ્રયાસ કરો.'
): string {
  if (!rawError || typeof rawError !== 'string') {
    return trAuth(fallbackEn, fallbackHi, fallbackGu);
  }
  const err = rawError.trim();
  const lower = err.toLowerCase();

  if (lower.includes('mobile number not registered') || err.includes('यह मोबाइल नंबर अभी रजिस्टर नहीं है')) {
    return trAuth(
      'This mobile number is not registered yet. Please verify using Mobile OTP first.',
      'यह मोबाइल नंबर अभी रजिस्टर नहीं है। कृपया पहले मोबाइल OTP से वेरिफाई करके लॉगिन करें।',
      'આ મોબાઇલ નંબર હજુ રજિસ્ટર થયેલ નથી. કૃપા કરીને પહેલા મોબાઇલ OTP દ્વારા વેરિફાઈ કરીને લોગિન કરો.'
    );
  }
  if (lower.includes('email not registered') || err.includes('यह ईमेल अभी रजिस्टर नहीं है')) {
    return trAuth(
      'This email is not registered yet. Please use OTP Login or Create New Account first.',
      'यह ईमेल अभी रजिस्टर नहीं है। कृपया पहले OTP लॉगिन या नया अकाउंट बनाएं विकल्प चुनें।',
      'આ ઈમેલ હજુ રજિસ્ટર થયેલ નથી. કૃપા કરીને પહેલા OTP લોગિન અથવા નવું એકાઉન્ટ બનાવો વિકલ્પ પસંદ કરો.'
    );
  }
  if (lower.includes('password not set yet') || err.includes('अभी पासवर्ड सेट नहीं है')) {
    return trAuth(
      'Password is not set for this account yet. Please sign in via OTP or click "Forgot / Set Password via OTP" below.',
      'इस अकाउंट के लिए अभी पासवर्ड सेट नहीं है। कृपया OTP से लॉगिन करें या नीचे पासवर्ड सेट करें विकल्प चुनें।',
      'આ એકાઉન્ટ માટે હજુ પાસવર્ડ સેટ નથી. કૃપા કરીને OTP થી લોગિન કરો અથવા નીચે પાસવર્ડ સેટ કરો વિકલ્પ પસંદ કરો.'
    );
  }
  if (lower.includes('incorrect password') || err.includes('गलत पासवर्ड')) {
    return trAuth(
      'Incorrect password! If you forgot your password, click "Forgot / Set Password via OTP" below.',
      'गलत पासवर्ड! यदि आप पासवर्ड भूल गए हैं तो नीचे OTP से पासवर्ड रीसेट करें विकल्प चुनें।',
      'ખોટો પાસવર્ડ! જો તમે પાસવર્ડ ભૂલી ગયા હોવ તો નીચે OTP દ્વારા પાસવર્ડ રીસેટ કરો વિકલ્પ પસંદ કરો.'
    );
  }
  if (lower.includes('no active otp found') || err.includes('कोई सक्रिय OTP नहीं मिला')) {
    return trAuth(
      'No active OTP found or it has expired. Please request a new OTP.',
      'कोई सक्रिय OTP नहीं मिला या वह समाप्त हो गया है। कृपया नया OTP मंगाएं।',
      'કોઈ સક્રિય OTP મળ્યો નથી અથવા તેનો સમય પૂરો થઈ ગયો છે. કૃપા કરીને નવો OTP મંગાવો.'
    );
  }
  if (lower.includes('otp expired') || err.includes('समय-सीमा (5 मिनट) समाप्त')) {
    return trAuth(
      'OTP has expired (5 minutes limit). Please request a new OTP.',
      'OTP की समय-सीमा (5 मिनट) समाप्त हो गई है। कृपया नया OTP मंगाएं।',
      'OTP નો સમય (5 મિનિટ) પૂરો થઈ ગયો છે. કૃપા કરીને નવો OTP મંગાવો.'
    );
  }
  if (lower.includes('too many failed attempts') || err.includes('5 बार गलत OTP')) {
    return trAuth(
      'Too many incorrect OTP attempts. Please request a new OTP.',
      '5 बार गलत OTP डाला गया! सुरक्षा के लिए कृपया नया OTP मंगाएं।',
      '5 વાર ખોટો OTP નાખવામાં આવ્યો! સુરક્ષા માટે કૃપા કરીને નવો OTP મંગાવો.'
    );
  }
  if (lower.includes('invalid otp code') || err.includes('गलत OTP कोड')) {
    return trAuth(
      'Incorrect OTP code! Please enter the valid 6-digit code.',
      'गलत OTP कोड! कृपया सही 6-अंकों का कोड दर्ज करें।',
      'ખોટો OTP કોડ! કૃપા કરીને સાચો 6-અંકનો કોડ દાખલ કરો.'
    );
  }
  if (lower.includes('biometric passkey not found') || err.includes('फिंगरप्रिंट डेटा नहीं मिला')) {
    return trAuth(
      'Fingerprint login is not linked on this device yet. Please log in once using Mobile OTP or Password.',
      'इस फोन पर अभी फिंगरप्रिंट लॉगिन जुड़ा नहीं है। कृपया एक बार मोबाइल OTP या पासवर्ड से लॉगिन करें।',
      'આ ફોન પર હજુ ફિંગરપ્રિન્ટ લોગિન જોડાયેલ નથી. કૃપા કરીને એકવાર મોબાઇલ OTP અથવા પાસવર્ડથી લોગિન કરો.'
    );
  }
  if (lower.includes('at least 6 characters') || err.includes('कम से कम 6 अक्षरों')) {
    return trAuth(
      'Password must be at least 6 characters.',
      'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
      'પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરોનો હોવો જોઈએ.'
    );
  }
  if (lower.includes('invalid email') || err.includes('सही ईमेल आईडी')) {
    return trAuth(
      'Please enter a valid email address.',
      'कृपया सही ईमेल आईडी दर्ज करें।',
      'કૃપા કરીને સાચો ઈમેલ આઈડી દાખલ કરો.'
    );
  }
  if (lower.includes('invalid 10-digit') || err.includes('मान्य भारतीय मोबाइल नंबर')) {
    return trAuth(
      'Please enter a valid 10-digit Indian mobile number.',
      'कृपया 10-अंकों का सही मोबाइल नंबर दर्ज करें।',
      'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર દાખલ કરો.'
    );
  }

  return err;
}

/**
 * Fetches current daily Mobile OTP usage (out of 3 per day) from server + local storage
 */
export async function fetchMobileOtpDailyQuota(phone: string): Promise<{
  usedToday: number;
  remainingToday: number;
  maxPerDay: number;
  dailyLimitReached: boolean;
  cooldownRemaining: number;
}> {
  const norm = normalizeIndianPhoneE164(phone);
  const localStatus = getDailyMobileOtpStatus(norm.valid ? norm.tenDigits : phone);
  const cooldownKey = norm.valid ? `phone_${norm.tenDigits}` : '';
  const localCooldown = cooldownKey ? getOtpCooldownRemainingSeconds(cooldownKey) : 0;

  if (!norm.valid) {
    return {
      ...localStatus,
      cooldownRemaining: localCooldown
    };
  }

  try {
    const res = await fetch(`/api/auth/mobile-otp-quota?phone=${encodeURIComponent(norm.tenDigits)}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      const mergedUsed = Math.min(
        MAX_DAILY_MOBILE_OTP,
        Math.max(localStatus.usedToday, Number(data.usedToday) || 0)
      );
      if (mergedUsed > localStatus.usedToday) {
        syncDailyMobileOtpCount(norm.tenDigits, mergedUsed);
      }
      return {
        usedToday: mergedUsed,
        remainingToday: Math.max(0, MAX_DAILY_MOBILE_OTP - mergedUsed),
        maxPerDay: MAX_DAILY_MOBILE_OTP,
        dailyLimitReached: mergedUsed >= MAX_DAILY_MOBILE_OTP || Boolean(data.dailyLimitReached),
        cooldownRemaining: Math.max(localCooldown, Number(data.cooldownRemaining) || 0)
      };
    }
  } catch {}

  return {
    ...localStatus,
    cooldownRemaining: localCooldown
  };
}

function getDailyLimitExceededMessage(): string {
  return trAuth(
    '⚠️ Daily Mobile OTP limit (3/3) reached! To prevent spam & excess SMS charges, only 3 Mobile OTPs can be sent per day. Please sign in using Password or Email OTP, or try again tomorrow.',
    '⚠️ आज की मोबाइल OTP सीमा (3/3) पूरी हो चुकी है! सुरक्षा और बॉट-स्पैम रोकने के लिए 1 दिन में अधिकतम 3 बार ही मोबाइल OTP भेजा जा सकता है। कृपया "पासवर्ड" या "ईमेल OTP" से लॉगिन करें, या कल प्रयास करें।',
    '⚠️ આજની મોબાઇલ OTP મર્યાદા (3/3) પૂર્ણ થઈ ગઈ છે! સુરક્ષા અને બોટ-સ્પામ રોકવા માટે 1 દિવસમાં મહત્તમ 3 વાર જ મોબાઇલ OTP મોકલી શકાય છે. કૃપા કરીને "પાસવર્ડ" અથવા "ઈમેલ OTP" થી લોગિન કરો, અથવા આવતીકાલે પ્રયાસ કરો.'
  );
}

/**
 * Sends 6-Digit SMS OTP via Firebase Phone Authentication
 * Strictly enforces:
 * 1) Maximum 3 Mobile OTPs per Day (24h / IST calendar day) in PostgreSQL + Client Storage
 * 2) 60-Second Cooldown between consecutive OTP requests
 */
export async function sendMobileOtp(
  phone: string,
  recaptchaContainerId = 'recaptcha-container'
): Promise<{
  success: boolean;
  error?: string;
  phoneE164?: string;
  cooldownRemaining?: number;
  usedToday?: number;
  remainingToday?: number;
  maxPerDay?: number;
  dailyLimitReached?: boolean;
}> {
  const norm = normalizeIndianPhoneE164(phone);
  if (!norm.valid) {
    return {
      success: false,
      error: trAuth(
        'Please enter a valid 10-digit Indian mobile number.',
        'कृपया 10-अंकों का सही भारतीय मोबाइल नंबर दर्ज करें।',
        'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર દાખલ કરો.'
      )
    };
  }

  // 1. Check & reserve daily OTP slot on PostgreSQL server BEFORE invoking Firebase SMS
  const localQuota = getDailyMobileOtpStatus(norm.tenDigits);
  const cooldownKey = `phone_${norm.tenDigits}`;
  let serverUsedCount: number | undefined = undefined;
  let serverSlotReserved = false;
  try {
    const guardRes = await fetch('/api/auth/mobile-otp-guard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: norm.tenDigits, action: 'consume' })
    });
    const guardData = await guardRes.json().catch(() => ({}));

    if (!guardRes.ok || !guardData.success) {
      if (guardData.dailyLimitReached) {
        syncDailyMobileOtpCount(norm.tenDigits, MAX_DAILY_MOBILE_OTP);
        return {
          success: false,
          usedToday: MAX_DAILY_MOBILE_OTP,
          remainingToday: 0,
          maxPerDay: MAX_DAILY_MOBILE_OTP,
          dailyLimitReached: true,
          error: getDailyLimitExceededMessage()
        };
      }
      if (guardData.cooldownRemaining) {
        return {
          success: false,
          cooldownRemaining: Number(guardData.cooldownRemaining),
          usedToday: guardData.usedToday ?? localQuota.usedToday,
          remainingToday: guardData.remainingToday ?? localQuota.remainingToday,
          maxPerDay: MAX_DAILY_MOBILE_OTP,
          error: trAuth(
            `Please wait ${guardData.cooldownRemaining} seconds before requesting a new OTP.`,
            `कृपया नया OTP भेजने से पहले ${guardData.cooldownRemaining} सेकंड प्रतीक्षा करें।`,
            `કૃપા કરીને નવો OTP મોકલતા પહેલા ${guardData.cooldownRemaining} સેકન્ડ રાહ જુઓ.`
          )
        };
      }
    } else {
      serverSlotReserved = true;
      serverUsedCount = Number(guardData.usedToday) || localQuota.usedToday + 1;
    }
  } catch {}

  // 2. Trigger Firebase Phone Auth SMS
  const res = await sendFirebasePhoneOtp(norm.tenDigits, recaptchaContainerId);
  if (!res.success) {
    // Rollback server slot if Firebase failed before sending SMS
    if (serverSlotReserved) {
      fetch('/api/auth/mobile-otp-guard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: norm.tenDigits, action: 'rollback' })
      }).catch(() => {});
    }
    return {
      success: false,
      usedToday: localQuota.usedToday,
      remainingToday: localQuota.remainingToday,
      maxPerDay: MAX_DAILY_MOBILE_OTP,
      error:
        res.error ||
        trAuth(
          'Failed to send SMS OTP. Please try again.',
          'मोबाइल पर OTP भेजने में विफल। कृपया पुनः प्रयास करें।',
          'મોબાઇલ પર OTP મોકલવામાં નિષ્ફળ. કૃપા કરીને ફરી પ્રયાસ કરો.'
        )
    };
  }

  // 3. Record sent timestamp & daily count
  recordOtpSentTimestamp(cooldownKey);
  const updatedQuota = recordDailyMobileOtpSent(norm.tenDigits, serverUsedCount);

  return {
    success: true,
    phoneE164: res.phoneE164,
    cooldownRemaining: 60,
    usedToday: updatedQuota.usedToday,
    remainingToday: updatedQuota.remainingToday,
    maxPerDay: MAX_DAILY_MOBILE_OTP,
    dailyLimitReached: updatedQuota.dailyLimitReached
  };
}

/**
 * Verifies 6-Digit Firebase Phone OTP (or Server Fallback OTP in Incognito) & Creates/Restores Server JWT Session
 */
export async function verifyMobileOtp(
  phone: string,
  code: string,
  newPassword?: string,
  name?: string
): Promise<{ success: boolean; error?: string; user?: AppUser }> {
  const norm = normalizeIndianPhoneE164(phone);
  if (!norm.valid) {
    return {
      success: false,
      error: trAuth(
        'Please enter a valid 10-digit mobile number.',
        'कृपया 10-अंकों का सही मोबाइल नंबर दर्ज करें।',
        'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર દાખલ કરો.'
      )
    };
  }

  const cleanOtp = String(code || '').replace(/\D/g, '').trim();
  const isPlayStoreTestPhone = norm.tenDigits === '9999999999' && cleanOtp === '123456';
  const fbVerify = isPlayStoreTestPhone ? { success: false, idToken: undefined, error: undefined } : await verifyFirebasePhoneOtpCode(cleanOtp);

  try {
    const res = await fetch('/api/auth/verify-firebase-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: fbVerify.success ? fbVerify.idToken : undefined,
        otpCode: cleanOtp,
        phone: norm.tenDigits,
        newPassword: newPassword && newPassword.trim().length >= 4 ? newPassword.trim() : undefined,
        name: name ? sanitizeText(name) : undefined
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: localizeServerAuthError(
          data.error || fbVerify.error,
          'Invalid OTP code! Please try again.',
          'गलत OTP कोड! कृपया पुनः प्रयास करें।',
          'ખોટો OTP કોડ! કૃપા કરીને ફરી પ્રયાસ કરો.'
        )
      };
    }

    const resolvedEmail = data.user?.email || `${norm.tenDigits}@phone.locohelp.com`;
    const resolvedPhone = data.user?.phone || `+91 ${norm.tenDigits}`;
    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || `phone_${norm.tenDigits}`),
      displayName: sanitizeText(
        data.user?.displayName || name || `Member +91 ${norm.tenDigits.slice(-4)}`
      ),
      email: resolvedEmail,
      phone: resolvedPhone,
      photoURL: 'https://lh3.googleusercontent.com/a/default-user',
      isGuest: false
    };

    if (data.token) {
      localStorage.setItem('locohelp_token', data.token);
    }
    localStorage.setItem('locohelp_user', JSON.stringify(userData));
    localStorage.setItem('locohelp_logged_in', 'true');
    localStorage.setItem('locohelp_last_logged_in_email', resolvedEmail);
    localStorage.setItem('locohelp_last_logged_in_phone', norm.tenDigits);
    localStorage.setItem('locohelp_last_logged_in_name', userData.displayName);

    try {
      await saveUserProfile(userData);
    } catch {}

    window.dispatchEvent(new Event('storage'));
    window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');
    notifyAuthState('SIGNED_IN', userData);

    return { success: true, user: userData };
  } catch {
    return {
      success: false,
      error: trAuth(
        'Verification failed. Please check your connection and try again.',
        'वेरिफिकेशन विफल रहा। कृपया इंटरनेट जांचकर पुनः प्रयास करें।',
        'વેરિફિકેશન નિષ્ફળ રહ્યું. કૃપા કરીને ફરી પ્રયાસ કરો.'
      )
    };
  }
}

/**
 * Smart PostgreSQL Lookup for Phone Number / Identifier ("Login Once, Stay Logged In")
 */
export async function checkPhoneInPostgres(identifier: string): Promise<{
  exists: boolean;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  hasPassword?: boolean;
  hasBiometric?: boolean;
  credentialId?: string;
  isApproved?: boolean;
  approvalStatus?: string;
}> {
  try {
    const clean = String(identifier || '').trim();
    if (!clean) return { exists: false };
    const res = await fetch(`/api/auth/check-phone?phone=${encodeURIComponent(clean)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return { exists: false };
    const data = await res.json();
    return {
      exists: Boolean(data.exists),
      uid: data.uid || '',
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      hasPassword: Boolean(data.hasPassword),
      hasBiometric: Boolean(data.hasBiometric),
      credentialId: data.credentialId || '',
      isApproved: Boolean(data.isApproved),
      approvalStatus: data.approvalStatus || 'pending'
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Smart Unified Phone + 4-Digit PIN / Password Authentication
 * - Existing User: Logs in directly with saved PIN/Password (no repeated OTP needed)
 * - New User: Registers permanently in PostgreSQL with initial status = 'pending'
 */
export async function smartPhoneAuth(params: {
  phone: string;
  password: string;
  name?: string;
  mode?: string;
  afterOtpVerified?: boolean;
}): Promise<{
  success: boolean;
  isReturningUser?: boolean;
  isApproved?: boolean;
  approvalStatus?: string;
  needsReset?: boolean;
  needsOtp?: boolean;
  error?: string;
  user?: AppUser;
}> {
  const cleanInput = String(params.phone || '').trim().toLowerCase();
  const isPhone = isPhoneIdentifier(cleanInput);
  if (!isPhone && !isValidEmail(cleanInput)) {
    return {
      success: false,
      error: trAuth(
        'Please enter a valid 10-digit Mobile Number or Email ID.',
        'कृपया सही 10-अंकों का मोबाइल नंबर या ईमेल आईडी दर्ज करें।',
        'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર અથવા ઈમેલ આઈડી દાખલ કરો.'
      )
    };
  }
  const secret = String(params.password || '').trim();
  if (!secret || secret.length < 4) {
    return {
      success: false,
      error: trAuth(
        'Please enter at least a 4-digit PIN or Password.',
        'कृपया कम से कम 4 अंकों का PIN या पासवर्ड दर्ज करें।',
        'કૃપા કરીને ઓછામાં ઓછો 4 અંકનો PIN કે પાસવર્ડ દાખલ કરો.'
      )
    };
  }

  const normalizedIdentifier = isPhone ? normalizeIndianPhone(cleanInput) : cleanInput;

  try {
    const res = await fetch('/api/auth/smart-phone-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: normalizedIdentifier,
        identifier: normalizedIdentifier,
        password: secret,
        pin: secret,
        name: params.name ? sanitizeText(params.name) : undefined,
        mode: params.mode,
        afterOtpVerified: Boolean(params.afterOtpVerified)
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        needsReset: Boolean(data.needsReset),
        needsOtp: Boolean(data.needsOtp),
        error: localizeServerAuthError(
          data.error,
          'Incorrect PIN / Password. Please try again.',
          'गलत PIN या पासवर्ड! कृपया पुनः प्रयास करें।',
          'ખોટો PIN કે પાસવર્ડ! કૃપા કરીને ફરી પ્રયાસ કરો.'
        )
      };
    }

    const resolvedEmail =
      data.user?.email || (isPhone ? `${normalizedIdentifier}@phone.locohelp.com` : cleanInput);
    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || resolvedEmail),
      displayName: sanitizeText(
        data.user?.displayName ||
          params.name ||
          (isPhone ? `Member +91 ${normalizedIdentifier.slice(-4)}` : resolvedEmail.split('@')[0])
      ),
      email: resolvedEmail,
      phone: sanitizeText(data.user?.phone || (isPhone ? `+91 ${normalizedIdentifier}` : '')),
      photoURL: 'https://lh3.googleusercontent.com/a/default-user',
      isGuest: false
    };

    if (data.token) {
      localStorage.setItem('locohelp_token', data.token);
    }
    localStorage.setItem('locohelp_user', JSON.stringify(userData));
    localStorage.setItem('locohelp_logged_in', 'true');
    localStorage.setItem('locohelp_last_logged_in_email', resolvedEmail);
    if (isPhone) {
      localStorage.setItem('locohelp_last_logged_in_phone', normalizedIdentifier);
    } else if (data.user?.phone) {
      localStorage.setItem('locohelp_last_logged_in_phone', normalizeIndianPhone(data.user.phone));
    } else {
      localStorage.removeItem('locohelp_last_logged_in_phone');
    }
    localStorage.setItem('locohelp_last_logged_in_name', userData.displayName);

    try {
      await saveUserProfile(userData);
    } catch {}

    window.dispatchEvent(new Event('storage'));
    window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');
    notifyAuthState('SIGNED_IN', userData);

    return {
      success: true,
      isReturningUser: Boolean(data.isReturningUser),
      isApproved: Boolean(data.isApproved),
      approvalStatus: data.approvalStatus || 'pending',
      user: userData
    };
  } catch {
    return {
      success: false,
      error: trAuth(
        'Connection error. Please try again.',
        'कनेक्शन त्रुटि। कृपया पुनः प्रयास करें।',
        'કનેક્શન ભૂલ. કૃપા કરીને ફરી પ્રયાસ કરો.'
      )
    };
  }
}

/**
 * Email OR Mobile Number & Password Login with JWT session persistence (₹0 SMS OTP cost!)
 */
export async function signInWithPassword(identifier: string, password: string): Promise<{
  success: boolean;
  error?: string;
  needsOtp?: boolean;
  needsReset?: boolean;
  user?: AppUser;
}> {
  const cleanInput = identifier.trim().toLowerCase();
  const isPhone = isPhoneIdentifier(cleanInput);
  if (!isPhone && !isValidEmail(cleanInput)) {
    return {
      success: false,
      error: trAuth(
        'Please enter a valid 10-digit Mobile Number or Email ID.',
        'कृपया सही 10-अंकों का मोबाइल नंबर या ईमेल आईडी दर्ज करें।',
        'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર અથવા ઈમેલ આઈડી દાખલ કરો.'
      )
    };
  }
  if (!password || password.length < 4) {
    return {
      success: false,
      error: trAuth(
        'PIN / Password must be at least 4 characters.',
        'PIN / पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।',
        'PIN / પાસવર્ડ ઓછામાં ઓછો 4 અક્ષરોનો હોવો જોઈએ.'
      )
    };
  }

  const normalizedIdentifier = isPhone ? normalizeIndianPhone(cleanInput) : cleanInput;

  try {
    const res = await fetch('/api/auth/login-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedIdentifier,
        identifier: normalizedIdentifier,
        password
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        needsOtp: Boolean(data.needsOtp),
        needsReset: Boolean(data.needsReset),
        error: localizeServerAuthError(
          data.error,
          'Login failed. Please check your details.',
          'लॉगिन विफल रहा। कृपया जानकारी जांचें।',
          'લોગિન નિષ્ફળ રહ્યું. કૃપા કરીને વિગતો તપાસો.'
        )
      };
    }

    const resolvedEmail =
      data.user?.email || (isPhone ? `${normalizedIdentifier}@phone.locohelp.com` : cleanInput);
    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || resolvedEmail),
      displayName: sanitizeText(
        data.user?.displayName ||
          (isPhone ? `Member +91 ${normalizedIdentifier.slice(-4)}` : resolvedEmail.split('@')[0])
      ),
      email: resolvedEmail,
      phone: sanitizeText(data.user?.phone || (isPhone ? `+91 ${normalizedIdentifier}` : '')),
      photoURL: 'https://lh3.googleusercontent.com/a/default-user',
      isGuest: false
    };

    if (data.token) {
      localStorage.setItem('locohelp_token', data.token);
    }
    localStorage.setItem('locohelp_user', JSON.stringify(userData));
    localStorage.setItem('locohelp_logged_in', 'true');
    localStorage.setItem('locohelp_last_logged_in_email', resolvedEmail);
    if (isPhone) {
      localStorage.setItem('locohelp_last_logged_in_phone', normalizedIdentifier);
    } else if (data.user?.phone) {
      localStorage.setItem('locohelp_last_logged_in_phone', normalizeIndianPhone(data.user.phone));
    } else {
      localStorage.removeItem('locohelp_last_logged_in_phone');
    }
    localStorage.setItem('locohelp_last_logged_in_name', userData.displayName);

    window.dispatchEvent(new Event('storage'));
    window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');
    notifyAuthState('SIGNED_IN', userData);

    return { success: true, user: userData };
  } catch {
    return {
      success: false,
      error: trAuth(
        'Login request failed. Please try again.',
        'लॉगिन अनुरोध विफल रहा। कृपया पुनः प्रयास करें।',
        'લોગિન વિનંતી નિષ્ફળ રહી. કૃપા કરીને ફરી પ્રયાસ કરો.'
      )
    };
  }
}

/**
 * Email OR Mobile Number & Password Sign Up with mandatory 6-digit OTP verification
 */
export async function signUpWithPassword(
  identifier: string,
  password: string,
  name?: string,
  phone?: string,
  otpCode?: string
): Promise<{ success: boolean; error?: string; needsOtp?: boolean; user?: AppUser }> {
  const cleanInput = identifier.trim().toLowerCase();
  const isPhone = isPhoneIdentifier(cleanInput);

  if (!isPhone && !isValidEmail(cleanInput)) {
    return {
      success: false,
      error: trAuth(
        'Please enter a valid 10-digit Mobile Number or Email ID.',
        'कृपया सही 10-अंकों का मोबाइल नंबर या ईमेल आईडी दर्ज करें।',
        'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર અથવા ઈમેલ આઈડી દાખલ કરો.'
      )
    };
  }
  if (!password || password.length < 4) {
    return {
      success: false,
      error: trAuth(
        'PIN / Password must be at least 4 characters.',
        'PIN / पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।',
        'PIN / પાસવર્ડ ઓછામાં ઓછો 4 અક્ષરોનો હોવો જોઈએ.'
      )
    };
  }
  if (!otpCode || otpCode.trim().length < 6) {
    return {
      success: false,
      needsOtp: true,
      error: trAuth(
        '6-digit OTP code is mandatory to verify your account.',
        'अकाउंट वेरिफाई करने के लिए 6-अंकों का OTP कोड डालना अनिवार्य है।',
        'એકાઉન્ટ વેરિફાઈ કરવા માટે 6-અંકનો OTP કોડ નાખવો ફરજિયાત છે.'
      )
    };
  }

  // If signing up with Mobile Number, verify Firebase Phone OTP and save password on server
  if (isPhone) {
    return await verifyMobileOtp(cleanInput, otpCode.trim(), password, name);
  }

  const cleanEmail = cleanInput;
  const cleanName = name ? sanitizeText(name) : undefined;
  const cleanPhone = phone ? sanitizeText(phone) : undefined;

  try {
    const res = await fetch('/api/auth/register-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password,
        name: cleanName,
        phone: cleanPhone,
        otpCode: otpCode.trim()
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        needsOtp: Boolean(data.needsOtp),
        error: localizeServerAuthError(
          data.error,
          'Registration failed. Please try again.',
          'रजिस्ट्रेशन विफल रहा। कृपया पुनः प्रयास करें।',
          'રજિસ્ટ્રેશન નિષ્ફળ રહ્યું. કૃપા કરીને ફરી પ્રયાસ કરો.'
        )
      };
    }

    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || cleanEmail),
      displayName: sanitizeText(data.user?.displayName || cleanName || cleanEmail.split('@')[0]),
      email: cleanEmail,
      phone: cleanPhone || '',
      photoURL: 'https://lh3.googleusercontent.com/a/default-user',
      isGuest: false
    };

    if (data.token) {
      localStorage.setItem('locohelp_token', data.token);
    }
    localStorage.setItem('locohelp_user', JSON.stringify(userData));
    localStorage.setItem('locohelp_logged_in', 'true');
    localStorage.setItem('locohelp_last_logged_in_email', cleanEmail);
    localStorage.setItem('locohelp_last_logged_in_name', userData.displayName);

    window.dispatchEvent(new Event('storage'));
    window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');
    notifyAuthState('SIGNED_IN', userData);

    return { success: true, user: userData };
  } catch {
    return {
      success: false,
      error: trAuth(
        'Sign up request failed. Please try again.',
        'रजिस्ट्रेशन अनुरोध विफल रहा। कृपया पुनः प्रयास करें।',
        'રજિસ્ટ્રેશન વિનંતી નિષ્ફળ રહી. કૃપા કરીને ફરી પ્રયાસ કરો.'
      )
    };
  }
}

/**
 * Sends 6-Digit Numeric Email OTP Code via Backend Server (with 60-second anti-spam cooldown)
 */
export async function sendEmailOtp(email: string): Promise<{
  success: boolean;
  error?: string;
  provider?: string;
  cooldownRemaining?: number;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return {
      success: false,
      error: trAuth(
        'Please enter a valid email address.',
        'कृपया मान्य ईमेल आईडी दर्ज करें।',
        'કૃપા કરીને સાચો ઈમેલ આઈડી દાખલ કરો.'
      )
    };
  }

  const rem = getOtpCooldownRemainingSeconds(cleanEmail);
  if (rem > 0) {
    return {
      success: false,
      cooldownRemaining: rem,
      error: trAuth(
        `Please wait ${rem} seconds before resending OTP.`,
        `कृपया नया OTP भेजने से पहले ${rem} सेकंड प्रतीक्षा करें।`,
        `કૃપા કરીને નવો OTP મોકલતા પહેલા ${rem} સેકન્ડ રાહ જુઓ.`
      )
    };
  }

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanEmail, type: 'email' })
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        cooldownRemaining: data.cooldownRemaining,
        error: localizeServerAuthError(
          data.error,
          'Failed to send Email OTP.',
          'ईमेल OTP भेजने में विफल।',
          'ઈમેલ OTP મોકલવામાં નિષ્ફળ.'
        )
      };
    }
    recordOtpSentTimestamp(cleanEmail);
    return { success: true, provider: data.provider, cooldownRemaining: 60 };
  } catch {
    return {
      success: false,
      error: trAuth(
        'Network error while sending OTP. Please try again.',
        'OTP भेजते समय नेटवर्क समस्या आई। कृपया पुनः प्रयास करें।',
        'OTP મોકલતી વખતે નેટવર્ક સમસ્યા આવી. કૃપા કરીને ફરી પ્રયાસ કરો.'
      )
    };
  }
}

export const sendEmailOtpViaSupabase = sendEmailOtp;

/**
 * Sets or Resets Password for an existing / OTP user with mandatory 6-digit Mobile or Email OTP verification
 */
export async function resetUserPassword(
  identifier: string,
  newPassword: string,
  name?: string,
  otpCode?: string
): Promise<{ success: boolean; error?: string; needsOtp?: boolean; user?: AppUser }> {
  const cleanInput = identifier.trim().toLowerCase();
  const isPhone = isPhoneIdentifier(cleanInput);

  if (!isPhone && !isValidEmail(cleanInput)) {
    return {
      success: false,
      error: trAuth(
        'Please enter a valid 10-digit Mobile Number or Email ID.',
        'कृपया सही 10-अंकों का मोबाइल नंबर या ईमेल दर्ज करें।',
        'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર અથવા ઈમેલ દાખલ કરો.'
      )
    };
  }
  if (!newPassword || newPassword.length < 4) {
    return {
      success: false,
      error: trAuth(
        'PIN / Password must be at least 4 characters.',
        'PIN / पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।',
        'PIN / પાસવર્ડ ઓછામાં ઓછો 4 અક્ષરોનો હોવો જોઈએ.'
      )
    };
  }
  if (!otpCode || otpCode.trim().length < 6) {
    return {
      success: false,
      needsOtp: true,
      error: trAuth(
        '6-digit OTP code is mandatory to set or reset your password.',
        'पासवर्ड सेट या रीसेट करने के लिए 6-अंकों का OTP कोड डालना अनिवार्य है।',
        'પાસવર્ડ સેટ અથવા રીસેટ કરવા માટે 6-અંકનો OTP કોડ નાખવો ફરજિયાત છે.'
      )
    };
  }

  if (isPhone) {
    return await verifyMobileOtp(cleanInput, otpCode.trim(), newPassword, name);
  }

  const cleanEmail = cleanInput;
  const cleanName = name ? sanitizeText(name) : undefined;

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        newPassword,
        name: cleanName,
        otpCode: otpCode.trim()
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        needsOtp: Boolean(data.needsOtp),
        error: localizeServerAuthError(
          data.error,
          'Password update failed. Please try again.',
          'पासवर्ड अपडेट करने में विफल। कृपया पुनः प्रयास करें।',
          'પાસવર્ડ અપડેટ કરવામાં નિષ્ફળ. કૃપા કરીને ફરી પ્રયાસ કરો.'
        )
      };
    }

    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || cleanEmail),
      displayName: sanitizeText(data.user?.displayName || cleanName || cleanEmail.split('@')[0]),
      email: cleanEmail,
      phone: sanitizeText(data.user?.phone || ''),
      photoURL: 'https://lh3.googleusercontent.com/a/default-user',
      isGuest: false
    };

    if (data.token) {
      localStorage.setItem('locohelp_token', data.token);
    }
    localStorage.setItem('locohelp_user', JSON.stringify(userData));
    localStorage.setItem('locohelp_logged_in', 'true');
    localStorage.setItem('locohelp_last_logged_in_email', cleanEmail);
    localStorage.setItem('locohelp_last_logged_in_name', userData.displayName);

    window.dispatchEvent(new Event('storage'));
    window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');
    notifyAuthState('SIGNED_IN', userData);

    return { success: true, user: userData };
  } catch {
    return {
      success: false,
      error: trAuth(
        'Password reset request failed. Please try again.',
        'पासवर्ड रीसेट अनुरोध विफल रहा। कृपया पुनः प्रयास करें।',
        'પાસવર્ડ રીસેટ વિનંતી નિષ્ફળ રહી. કૃપા કરીને ફરી પ્રયાસ કરો.'
      )
    };
  }
}

/**
 * Verifies 6-Digit Numeric Email OTP Code via Backend Server (with optional password creation)
 */
export async function verifyEmailOtp(
  email: string,
  code: string,
  newPassword?: string,
  name?: string
): Promise<{ success: boolean; error?: string; user?: any }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!isValidEmail(cleanEmail)) {
    return {
      success: false,
      error: trAuth(
        'Please enter a valid email address.',
        'कृपया मान्य ईमेल दर्ज करें।',
        'કૃપા કરીને સાચો ઈમેલ દાખલ કરો.'
      )
    };
  }
  if (!cleanCode) {
    return {
      success: false,
      error: trAuth(
        'Please enter the 6-digit OTP code.',
        'कृपया 6-अंकों का OTP कोड दर्ज करें।',
        'કૃપા કરીને 6-અંકનો OTP કોડ દાખલ કરો.'
      )
    };
  }

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: cleanEmail,
        code: cleanCode,
        type: 'email',
        newPassword,
        name: name ? sanitizeText(name) : undefined
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: localizeServerAuthError(
          data.error,
          'Invalid OTP code.',
          'गलत OTP कोड।',
          'ખોટો OTP કોડ.'
        )
      };
    }

    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || cleanEmail),
      displayName: sanitizeText(data.user?.displayName || name || cleanEmail.split('@')[0]),
      email: cleanEmail,
      phone: sanitizeText(data.user?.phone || ''),
      photoURL: 'https://lh3.googleusercontent.com/a/default-user',
      isGuest: false
    };

    if (data.token) {
      localStorage.setItem('locohelp_token', data.token);
    }
    localStorage.setItem('locohelp_user', JSON.stringify(userData));
    localStorage.setItem('locohelp_logged_in', 'true');
    localStorage.setItem('locohelp_last_logged_in_email', cleanEmail);
    if (userData.phone) {
      localStorage.setItem('locohelp_last_logged_in_phone', normalizeIndianPhone(userData.phone));
    } else {
      localStorage.removeItem('locohelp_last_logged_in_phone');
    }
    localStorage.setItem('locohelp_last_logged_in_name', userData.displayName);

    try {
      await saveUserProfile(userData);
    } catch (e) {}

    window.dispatchEvent(new Event('storage'));
    window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');
    notifyAuthState('SIGNED_IN', userData);

    return { success: true, user: userData };
  } catch {
    return {
      success: false,
      error: trAuth(
        'Verification failed. Please try again.',
        'वेरिफिकेशन विफल रहा। कृपया पुनः प्रयास करें।',
        'વેરિફિકેશન નિષ્ફળ રહ્યું. કૃપા કરીને ફરી પ્રયાસ કરો.'
      )
    };
  }
}

export const verifyEmailOtpViaSupabase = verifyEmailOtp;

/**
 * Verifies the currently logged-in user's identity against the PostgreSQL database
 * (via bcrypt Password hash) before allowing sensitive actions like switching their mobile number from Private to Public.
 */
export async function verifyDatabaseReauth(options: {
  mode?: 'password';
  password?: string;
  setNewPassword?: boolean;
}): Promise<{
  success: boolean;
  noPasswordSet?: boolean;
  error?: string;
}> {
  const activeUser = getCurrentUser();
  if (!activeUser || activeUser.isGuest || activeUser.uid === 'guest_user') {
    return {
      success: false,
      error: trAuth(
        'Please sign in first.',
        'कृपया पहले लॉगिन करें।',
        'કૃપા કરીને પહેલા લોગિન કરો.'
      )
    };
  }

  const cleanPass = String(options.password || '').trim();
  if (cleanPass.length < 6) {
    return {
      success: false,
      error: trAuth(
        'Password must be at least 6 characters.',
        'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
        'પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરોનો હોવો જોઈએ.'
      )
    };
  }
  try {
    const res = await fetch('/api/auth/verify-reauth', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        mode: 'password',
        uid: activeUser.uid,
        email: activeUser.email || '',
        phone: activeUser.phone || '',
        password: cleanPass,
        setNewPassword: Boolean(options.setNewPassword)
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        noPasswordSet: Boolean(data.noPasswordSet),
        error: localizeServerAuthError(
          data.error,
          'Incorrect password. Please enter your registered LocoHelp password.',
          'गलत पासवर्ड! कृपया अपना सही LocoHelp पासवर्ड दर्ज करें।',
          'ખોટો પાસવર્ડ! કૃપા કરીને તમારો સાચો LocoHelp પાસવર્ડ દાખલ કરો.'
        )
      };
    }
    return { success: true };
  } catch {
    return {
      success: false,
      error: trAuth(
        'Network error while verifying password.',
        'पासवर्ड जांचते समय नेटवर्क समस्या आई।',
        'પાસવર્ડ તપાસતી વખતે નેટવર્ક સમસ્યા આવી.'
      )
    };
  }
}

/**
 * Clean logout: Clears server & local session while preserving manual user location
 */
export async function logoutUser() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    // Remove ONLY authentication/session keys — never delete cached profiles, shops, ads, or category images
    const sessionKeysToRemove = [
      'locohelp_user',
      'locohelp_logged_in',
      'locohelp_token',
      'locohelp_admin_token',
      'locohelp_admin_logged_in',
      'locohelp_last_logged_in_email',
      'locohelp_last_logged_in_phone',
      'locohelp_last_logged_in_name',
      'locohelp_profile_phone',
      'locohelp_account_approved',
      'locohelp_account_status'
    ];
    sessionKeysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    sessionStorage.clear();
    notifyAuthState('SIGNED_OUT', null);
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn("Logout error:", e);
  }
}

/**
 * Helper to retrieve session authentication headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  try {
    const token = localStorage.getItem('locohelp_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }

    const savedUserRaw = localStorage.getItem('locohelp_user');
    if (savedUserRaw) {
      try {
        const parsedUser = JSON.parse(savedUserRaw);
        if (parsedUser && parsedUser.uid && parsedUser.uid !== 'guest_user') {
          headers['x-user-id'] = String(parsedUser.uid);
        }
        if (parsedUser && parsedUser.email) {
          headers['x-user-email'] = String(parsedUser.email).toLowerCase();
        }
      } catch {}
    }
    if (!headers['x-user-email']) {
      const lastEmail = localStorage.getItem('locohelp_last_logged_in_email');
      if (lastEmail) {
        headers['x-user-email'] = lastEmail.toLowerCase();
        if (!headers['x-user-id']) {
          headers['x-user-id'] = lastEmail.toLowerCase();
        }
      }
    }

    const adminToken = sessionStorage.getItem('locohelp_admin_token') || localStorage.getItem('locohelp_admin_token');
    const isAdminLoggedIn =
      sessionStorage.getItem('locohelp_admin_logged_in') === 'true' ||
      localStorage.getItem('locohelp_admin_logged_in') === 'true';
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
      if (!headers['Authorization']) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
    }
    if (isAdminLoggedIn || adminToken) {
      headers['x-admin-email'] = 'baalvarta@gmail.com';
      if (!headers['x-user-id']) {
        headers['x-user-id'] = 'master_admin';
      }
      if (!headers['x-user-email']) {
        headers['x-user-email'] = 'baalvarta@gmail.com';
      }
    }
  } catch (e) {}
  return headers;
}

/**
 * Saves or updates user profile in Railway PostgreSQL & LocalStorage (XSS Sanitized)
 */
export async function saveUserProfile(userData: Record<string, any>): Promise<void> {
  if (!userData) return;
  const rawUid = userData.uid || userData.user_id || 'guest_user';
  if (rawUid === 'guest_user') return;

  const targetUid = ensureValidUUID(rawUid);

  let existingCached: Record<string, any> = {};
  try {
    const rawExisting = localStorage.getItem(`locohelp_user_profile_${targetUid}`);
    if (rawExisting) {
      existingCached = JSON.parse(rawExisting) || {};
    }
  } catch {}

  const rawAvatarCandidate = userData.liveSelfieUrl || userData.photoURL || userData.avatar_url || '';
  const cleanAvatar =
    rawAvatarCandidate && rawAvatarCandidate !== 'https://lh3.googleusercontent.com/a/default-user'
      ? rawAvatarCandidate
      : existingCached.avatar_url || '';

  const resolvedPhonePublic =
    userData.isPhonePublic !== undefined
      ? Boolean(userData.isPhonePublic)
      : userData.is_phone_public !== undefined
      ? Boolean(userData.is_phone_public)
      : existingCached.isPhonePublic ?? existingCached.is_phone_public ?? undefined;

  const payloadRaw: Record<string, any> = {
    uid: targetUid,
    full_name: userData.displayName || userData.full_name || existingCached.full_name || 'Community Member',
    email: userData.email || existingCached.email || '',
    phone: userData.phone || existingCached.phone || '',
    updated_at: new Date().toISOString(),
  };

  if (cleanAvatar) {
    payloadRaw.avatar_url = cleanAvatar;
  }
  if (resolvedPhonePublic !== undefined) {
    payloadRaw.is_phone_public = resolvedPhonePublic;
    payloadRaw.isPhonePublic = resolvedPhonePublic;
  }
  if (userData.skills !== undefined && String(userData.skills).trim() !== '') {
    payloadRaw.skills = userData.skills;
  } else if (existingCached.skills) {
    payloadRaw.skills = existingCached.skills;
  }
  if (userData.address !== undefined && String(userData.address).trim() !== '') {
    payloadRaw.address = userData.address;
  } else if (existingCached.address) {
    payloadRaw.address = existingCached.address;
  }
  if (userData.experience !== undefined && String(userData.experience).trim() !== '') {
    payloadRaw.experience = userData.experience;
  } else if (existingCached.experience) {
    payloadRaw.experience = existingCached.experience;
  }
  if (userData.myHelperProfile || userData.my_helper_profile || existingCached.my_helper_profile) {
    payloadRaw.my_helper_profile = userData.myHelperProfile || userData.my_helper_profile || existingCached.my_helper_profile;
  }

  const dataToSave = sanitizePayload(payloadRaw);

  try {
    localStorage.setItem(`locohelp_user_profile_${targetUid}`, JSON.stringify({ ...existingCached, ...dataToSave }));
  } catch (e) {}

  try {
    await fetch('/api/profiles', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dataToSave)
    });
  } catch (err) {
    console.warn("Profile save note:", err);
  }
}

export const saveUserProfileToSupabase = saveUserProfile;

/**
 * Fetches user profile from Backend PostgreSQL
 */
export async function getUserProfile(uid: string): Promise<Record<string, any> | null> {
  if (!uid || uid === 'guest_user') return null;

  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(uid)}?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.uid) {
        localStorage.setItem(`locohelp_user_profile_${uid}`, JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.warn("Fetch profile error:", e);
  }

  try {
    const local = localStorage.getItem(`locohelp_user_profile_${uid}`);
    if (local) return JSON.parse(local);
  } catch (e) {}

  return null;
}

export const getUserProfileFromSupabase = getUserProfile;

/**
 * Deletes user profile from Backend PostgreSQL (Owner or Admin only)
 */
export async function deleteUserProfile(uid: string): Promise<boolean> {
  if (!uid || uid === 'guest_user') return false;
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Ensures profile exists in database
 */
export async function ensureProfileExists(u: any) {
  if (!u) return;
  try {
    const uid = ensureValidUUID(u.id || u.uid);
    const existing = await getUserProfile(uid);
    if (!existing) {
      await saveUserProfile({
        uid,
        displayName: u.displayName || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Community Member',
        email: u.email || '',
        photoURL: u.photoURL || u.user_metadata?.avatar_url || '',
      });
    }
  } catch (err) {
    console.warn("ensureProfileExists error:", err);
  }
}

/**
 * Broadcast Posts database queries
 */
export async function saveBroadcastPost(post: any) {
  const payload = sanitizePayload({
    id: post.id || 'intent_' + Date.now(),
    authorId: post.author_id || post.authorId || post.user_id,
    authorName: post.author_name || post.authorName || 'Community Member',
    authorAvatar: post.author_avatar || post.authorAvatar || '',
    description: post.description,
    category: post.category || 'General',
    tags: post.tags || [],
    status: post.status || 'active',
    distance: post.distance || 0.5,
    createdAt: post.created_at || post.createdAt || new Date().toISOString()
  });

  const res = await fetch('/api/intents', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    return await res.json();
  }
  return payload;
}

export async function getBroadcastPosts(): Promise<any[]> {
  try {
    const res = await fetch(`/api/intents?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Error fetching broadcast posts:", err);
  }
  return [];
}

/**
 * Messaging database queries (XSS sanitized & participant-authorized)
 */
export async function sendMessage(senderId: string, receiverId: string, content: string, intentId?: string) {
  const cleanContent = sanitizeText(content);
  const payload = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    authorId: sanitizeText(senderId),
    senderId: sanitizeText(senderId),
    receiverId: sanitizeText(receiverId),
    text: cleanContent,
    content: cleanContent,
    createdAt: new Date().toISOString()
  };

  const targetId = intentId || 'general';
  const res = await fetch(`/api/intents/${encodeURIComponent(targetId)}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    return await res.json();
  }
  return payload;
}

export async function getMessages(userId: string, otherUserId: string, intentId?: string): Promise<any[]> {
  try {
    const targetId = intentId || 'general';
    const query = new URLSearchParams({
      _t: String(Date.now()),
      userId: userId || '',
      otherUserId: otherUserId || ''
    });
    const res = await fetch(`/api/intents/${encodeURIComponent(targetId)}/messages?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    }
  } catch (err) {
    console.warn("Error fetching messages:", err);
  }
  return [];
}

/**
 * Shops database queries
 */
export async function saveShop(shop: any): Promise<any> {
  const cleanShop = sanitizePayload(shop);
  try {
    const res = await fetch('/api/shops', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cleanShop)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Save shop error:", e);
  }
  return cleanShop;
}

let inflightShopsPromise: Promise<any[]> | null = null;

export async function getShops(includePending = false): Promise<any[]> {
  let deletedIds: string[] = [];
  try {
    const delRaw = localStorage.getItem('locohelp_deleted_shops');
    if (delRaw) deletedIds = JSON.parse(delRaw);
  } catch {}

  try {
    if (!includePending && inflightShopsPromise) {
      return await inflightShopsPromise;
    }
    const fetchTask = (async () => {
      const query = includePending ? `includePending=true&_t=${Date.now()}` : `_t=${Date.now()}`;
      const res = await fetch(`/api/shops?${query}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          const map = new Map<string, any>();
          if (!includePending) {
            try {
              const prevRaw = localStorage.getItem('locohelp_registered_shops');
              const prevList: any[] = prevRaw ? JSON.parse(prevRaw) : [];
              prevList.forEach(s => {
                if (s && s.id && !deletedIds.includes(String(s.id)) && s.status === 'pending') {
                  map.set(String(s.id), s);
                }
              });
            } catch {}
          }
          list.forEach(s => {
            if (s && s.id && !String(s.id).startsWith('sample_shop_') && !deletedIds.includes(String(s.id))) {
              map.set(String(s.id), s);
            }
          });

          const merged = Array.from(map.values());
          try {
            localStorage.setItem('locohelp_registered_shops', JSON.stringify(merged));
          } catch (e) {}

          if (!includePending) {
            return merged.filter(s => s.isVerified === true || s.status === 'approved');
          }
          return merged;
        }
      }
      throw new Error('Fallback to cached shops');
    })();

    if (!includePending) {
      inflightShopsPromise = fetchTask.finally(() => {
        inflightShopsPromise = null;
      });
      return await inflightShopsPromise;
    }
    return await fetchTask;
  } catch (e) {
    // Fallback below
  }

  let localShops: any[] = [];
  try {
    const existingRaw = localStorage.getItem('locohelp_registered_shops');
    const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
    localShops = existing.filter(
      s => s && s.id && !String(s.id).startsWith('sample_shop_') && !deletedIds.includes(String(s.id))
    );
  } catch {}

  if (!includePending) {
    return localShops.filter(s => s.isVerified === true || s.status === 'approved');
  }
  return localShops;
}

/**
 * Helpers database queries
 */
let memoryApprovedHelpersCache: any[] | null = null;
let inflightHelpersPromise: Promise<any[]> | null = null;

export function getCachedHelpersSync(includePending = false): any[] {
  if (!includePending && memoryApprovedHelpersCache && memoryApprovedHelpersCache.length > 0) {
    return memoryApprovedHelpersCache;
  }
  let deletedIds: string[] = [];
  try {
    const delRaw = localStorage.getItem('locohelp_deleted_helpers');
    if (delRaw) deletedIds = JSON.parse(delRaw);
  } catch {}
  try {
    const existingRaw = localStorage.getItem('locohelp_free_helper_profiles');
    const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
    const localHelpers = existing.filter(
      h => h && h.id && !/^h\d+/.test(String(h.id)) && !deletedIds.includes(String(h.id))
    );
    if (!includePending) {
      return localHelpers.filter(h => h.isVerified === true || h.status === 'approved');
    }
    return localHelpers;
  } catch {
    return [];
  }
}

export async function saveHelper(helper: any): Promise<any> {
  const cleanHelper = sanitizePayload(helper);
  try {
    const res = await fetch('/api/helpers', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cleanHelper)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Save helper error:", e);
  }
  return cleanHelper;
}

export async function getHelpers(includePending = false): Promise<any[]> {
  let deletedIds: string[] = [];
  try {
    const delRaw = localStorage.getItem('locohelp_deleted_helpers');
    if (delRaw) deletedIds = JSON.parse(delRaw);
  } catch {}

  try {
    if (!includePending && inflightHelpersPromise) {
      return await inflightHelpersPromise;
    }

    const fetchTask = (async () => {
      const query = includePending ? `includePending=true&_t=${Date.now()}` : `_t=${Date.now()}`;
      const res = await fetch(`/api/helpers?${query}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          const map = new Map<string, any>();
          if (!includePending) {
            try {
              const prevRaw = localStorage.getItem('locohelp_free_helper_profiles');
              const prevList: any[] = prevRaw ? JSON.parse(prevRaw) : [];
              prevList.forEach(h => {
                if (h && h.id && !/^h\d+/.test(String(h.id)) && !deletedIds.includes(String(h.id)) && h.status === 'pending') {
                  map.set(String(h.id), h);
                }
              });
            } catch {}
          }
          list.forEach(h => {
            if (h && h.id && !/^h\d+/.test(String(h.id)) && !deletedIds.includes(String(h.id))) {
              map.set(String(h.id), h);
            }
          });

          const merged = Array.from(map.values());
          const approvedOnly = merged.filter(h => h.isVerified === true || h.status === 'approved');
          memoryApprovedHelpersCache = approvedOnly;

          try {
            localStorage.setItem('locohelp_free_helper_profiles', JSON.stringify(merged));

            const myHelperRaw = localStorage.getItem('locohelp_my_helper_profile');
            if (myHelperRaw) {
              const myHelper = JSON.parse(myHelperRaw);
              const updatedMy = merged.find(h => h.id === myHelper.id || (myHelper.phone && h.phone === myHelper.phone));
              if (updatedMy) {
                localStorage.setItem('locohelp_my_helper_profile', JSON.stringify({ ...myHelper, ...updatedMy }));
              } else if (includePending) {
                localStorage.removeItem('locohelp_my_helper_profile');
              }
            }
          } catch (e) {}

          if (!includePending) {
            return approvedOnly;
          }
          return merged;
        }
      }
      throw new Error('Fallback to cached helpers');
    })();

    if (!includePending) {
      inflightHelpersPromise = fetchTask.finally(() => {
        inflightHelpersPromise = null;
      });
      return await inflightHelpersPromise;
    }
    return await fetchTask;
  } catch (e) {
    // Fallback below
  }

  return getCachedHelpersSync(includePending);
}

/**
 * AI chat history saving
 */
export async function saveChatHistory(prompt: string, response: string, userId?: string): Promise<void> {
  try {
    await fetch('/api/ai-chat-history', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        prompt: sanitizeText(prompt),
        response: sanitizeText(response),
        userId: userId ? sanitizeText(userId) : undefined
      })
    });
  } catch (e) {}
}

/**
 * Direct Table Insertion Helpers for PostgreSQL
 */

// 1. Table: user (id, name, phone, email, created_at)
export async function signupUser(userData: { id?: string; uid?: string; name: string; phone?: string; email?: string }): Promise<any> {
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizePayload(userData))
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Signup error:", e);
  }
  return { success: false };
}

// 2. Table: businesses (id, owner_id, business_name, category, address, phone, created_at)
export async function saveBusiness(biz: { id?: string; owner_id?: string; ownerName?: string; business_name?: string; name?: string; category?: string; address?: string; phone?: string }): Promise<any> {
  return await saveShop(biz);
}

// 3. Table: chats (id, sender_id, receiver_id, message, sent_at)
export async function sendChatMessage(sender_id: string, receiver_id: string, message: string): Promise<any> {
  return await sendMessage(sender_id, receiver_id, message);
}

// 4. Table: listings (id, user_id, title, description, location, created_at)
export async function saveListing(listing: { id?: string; user_id?: string; authorId?: string; title?: string; description: string; location?: string }): Promise<any> {
  return await saveBroadcastPost(listing);
}

