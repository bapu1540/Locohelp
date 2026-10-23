/**
 * LocoHelp Backend & PostgreSQL Authentication and Data Layer
 * Completely standalone - connects directly to Node.js/Express backend & Railway PostgreSQL
 */

import {
  sanitizePayload,
  sanitizeText,
  getOtpCooldownRemainingSeconds,
  recordOtpSentTimestamp
} from './lib/security';
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
 * Ensures any string ID is converted into a valid PostgreSQL UUID format (8-4-4-4-12 hex string).
 */
export function ensureValidUUID(str: string): string {
  if (!str) return '00000000-0000-4000-a000-000000000000';
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

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
  const hex3 = Math.imul(h1, 31).toString(16).padStart(8, '0');
  const hex4 = Math.imul(h2, 127).toString(16).padStart(8, '0');

  const full = (hex1 + hex2 + hex3 + hex4).slice(0, 32);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

/**
 * Returns active user from persistent local session or guest default.
 */
export function getCurrentUser(): AppUser {
  try {
    const saved = localStorage.getItem('locohelp_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.uid && parsed.uid !== 'guest_user') {
        return {
          ...parsed,
          uid: ensureValidUUID(parsed.uid)
        };
      }
    }
  } catch (e) {}

  return {
    uid: 'guest_user',
    displayName: 'LocoHelper Member',
    email: '',
  };
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
 * Email & Password Login with JWT session persistence (Strictly requires pre-registered verified account)
 */
export async function signInWithPassword(email: string, password: string): Promise<{
  success: boolean;
  error?: string;
  needsOtp?: boolean;
  needsReset?: boolean;
  user?: AppUser;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'कृपया सही ईमेल दर्ज करें (Invalid email format)' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' };
  }

  try {
    const res = await fetch('/api/auth/login-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        needsOtp: Boolean(data.needsOtp),
        needsReset: Boolean(data.needsReset),
        error: data.error || 'Login failed'
      };
    }

    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || cleanEmail),
      displayName: sanitizeText(data.user?.displayName || cleanEmail.split('@')[0]),
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
  } catch (err: any) {
    return { success: false, error: err?.message || 'Login request failed' };
  }
}

/**
 * Email & Password Sign Up with mandatory 6-digit Email OTP verification
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  name?: string,
  phone?: string,
  otpCode?: string
): Promise<{ success: boolean; error?: string; needsOtp?: boolean; user?: AppUser }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'कृपया सही ईमेल दर्ज करें (Invalid email format)' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' };
  }
  if (!otpCode || otpCode.trim().length < 6) {
    return {
      success: false,
      needsOtp: true,
      error: 'असली ईमेल वेरिफाई करने के लिए ईमेल पर आया 6-अंकों का OTP कोड डालना अनिवार्य है।'
    };
  }

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
        error: data.error || 'Registration failed'
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
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sign up request failed' };
  }
}

/**
 * Sends 6-Digit Numeric Email OTP Code via Backend Server (with 60-second anti-spam cooldown)
 */
export async function sendEmailOtp(email: string): Promise<{
  success: boolean;
  error?: string;
  devCode?: string;
  provider?: string;
  cooldownRemaining?: number;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'कृपया मान्य ईमेल आईडी दर्ज करें (Please enter a valid email address)' };
  }

  const rem = getOtpCooldownRemainingSeconds(cleanEmail);
  if (rem > 0) {
    return {
      success: false,
      cooldownRemaining: rem,
      error: `कृपया नया OTP भेजने से पहले ${rem} सेकंड प्रतीक्षा करें (Please wait ${rem}s before resending OTP)`
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
        error: data.error || 'Failed to send OTP'
      };
    }
    recordOtpSentTimestamp(cleanEmail);
    return { success: true, devCode: data.devOtp, provider: data.provider, cooldownRemaining: 60 };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error while sending OTP' };
  }
}

export const sendEmailOtpViaSupabase = sendEmailOtp;

/**
 * Sets or Resets Password for an existing / OTP user with mandatory 6-digit Email OTP verification
 */
export async function resetUserPassword(
  email: string,
  newPassword: string,
  name?: string,
  otpCode?: string
): Promise<{ success: boolean; error?: string; needsOtp?: boolean; user?: AppUser }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'कृपया सही ईमेल दर्ज करें (Invalid email format)' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' };
  }
  if (!otpCode || otpCode.trim().length < 6) {
    return {
      success: false,
      needsOtp: true,
      error: 'पासवर्ड सेट या रीसेट करने के लिए ईमेल पर आया 6-अंकों का OTP कोड डालना अनिवार्य है।'
    };
  }

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
        error: data.error || 'Password update failed'
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
  } catch (err: any) {
    return { success: false, error: err?.message || 'Password reset request failed' };
  }
}

/**
 * Verifies 6-Digit Numeric Email OTP Code via Backend Server (with optional password creation)
 */
export async function verifyEmailOtp(email: string, code: string, newPassword?: string): Promise<{ success: boolean; error?: string; user?: any }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'कृपया मान्य ईमेल दर्ज करें (Please enter a valid email address)' };
  }
  if (!cleanCode) {
    return { success: false, error: 'Please enter the 6-digit OTP code' };
  }

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanEmail, code: cleanCode, type: 'email', newPassword })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Invalid OTP code' };
    }

    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || cleanEmail),
      displayName: sanitizeText(data.user?.displayName || cleanEmail.split('@')[0]),
      email: cleanEmail,
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

    try {
      await saveUserProfile(userData);
    } catch (e) {}

    window.dispatchEvent(new Event('storage'));
    window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');
    notifyAuthState('SIGNED_IN', userData);

    return { success: true, user: userData };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Verification failed. Please try again.' };
  }
}

export const verifyEmailOtpViaSupabase = verifyEmailOtp;

/**
 * Clean logout: Clears server & local session while preserving manual user location
 */
export async function logoutUser() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    const preservedLocationKeys = new Set([
      'locohelp_user_location',
      'locohelp_selected_state',
      'locohelp_selected_city',
      'locohelp_selected_area'
    ]);
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('locohelp_') && !preservedLocationKeys.has(key)) {
        localStorage.removeItem(key);
      }
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
    const adminToken = sessionStorage.getItem('locohelp_admin_token') || localStorage.getItem('locohelp_admin_token');
    const isAdminLoggedIn = sessionStorage.getItem('locohelp_admin_logged_in') === 'true';
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
      if (!headers['Authorization']) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
    }
    if (isAdminLoggedIn) {
      headers['x-admin-email'] = 'baalvarta@gmail.com';
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

  const dataToSave = sanitizePayload({
    uid: targetUid,
    full_name: userData.displayName || userData.full_name || 'Community Member',
    email: userData.email || '',
    phone: userData.phone || '',
    avatar_url: userData.photoURL || userData.avatar_url || 'https://lh3.googleusercontent.com/a/default-user',
    skills: userData.skills || '',
    address: userData.address || '',
    experience: userData.experience || '',
    my_helper_profile: userData.myHelperProfile || userData.my_helper_profile || null,
    updated_at: new Date().toISOString(),
  });

  try {
    localStorage.setItem(`locohelp_user_profile_${targetUid}`, JSON.stringify(dataToSave));
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

export async function getShops(includePending = false): Promise<any[]> {
  try {
    const query = includePending ? `includePending=true&_t=${Date.now()}` : `_t=${Date.now()}`;
    const res = await fetch(`/api/shops?${query}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        try {
          const existingRaw = localStorage.getItem('locohelp_registered_shops');
          const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
          const map = new Map<string, any>();
          existing.filter(s => s && s.id && !String(s.id).startsWith('sample_shop_')).forEach(s => map.set(s.id, s));
          list.forEach(s => {
            if (s && s.id && !String(s.id).startsWith('sample_shop_')) {
              map.set(s.id, { ...(map.get(s.id) || {}), ...s });
            }
          });
          localStorage.setItem('locohelp_registered_shops', JSON.stringify(Array.from(map.values())));
        } catch (e) {}
        return list;
      }
    }
  } catch (e) {
    console.warn("Get shops error:", e);
  }
  return [];
}

/**
 * Helpers database queries
 */
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
  try {
    const query = includePending ? `includePending=true&_t=${Date.now()}` : `_t=${Date.now()}`;
    const res = await fetch(`/api/helpers?${query}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        try {
          const existingRaw = localStorage.getItem('locohelp_free_helper_profiles');
          const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
          const map = new Map<string, any>();
          existing.forEach(h => {
            if (h && h.id && !/^h\d+/.test(String(h.id))) {
              map.set(h.id, h);
            }
          });
          list.forEach(h => {
            if (h && h.id && !/^h\d+/.test(String(h.id))) {
              map.set(h.id, { ...(map.get(h.id) || {}), ...h });
            }
          });
          const merged = Array.from(map.values());
          localStorage.setItem('locohelp_free_helper_profiles', JSON.stringify(merged));

          const myHelperRaw = localStorage.getItem('locohelp_my_helper_profile');
          if (myHelperRaw) {
            const myHelper = JSON.parse(myHelperRaw);
            const updatedMy = list.find(h => h.id === myHelper.id || (myHelper.phone && h.phone === myHelper.phone));
            if (updatedMy) {
              localStorage.setItem('locohelp_my_helper_profile', JSON.stringify({ ...myHelper, ...updatedMy }));
            }
          }
        } catch (e) {}
        return list;
      }
    }
  } catch (e) {
    console.warn("Get helpers error:", e);
  }
  return [];
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

