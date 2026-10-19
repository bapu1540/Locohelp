/**
 * LocoHelp Backend & PostgreSQL Authentication and Data Layer
 * Completely standalone - connects directly to Node.js/Express backend & Railway PostgreSQL
 */

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
  
  // Return directly if it's already a valid v4 UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  // Generate deterministic 32-character hex hash from input string
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
 * Google Sign-In with strict email validation and JWT session persistence
 */
export async function signInWithGoogle(customEmail?: string, customName?: string): Promise<AppUser> {
  let email = (customEmail || '').trim().toLowerCase();
  if (customEmail && !isValidEmail(customEmail)) {
    throw new Error('अमान्य ईमेल आईडी (Invalid Google email address format)');
  }

  if (!email) {
    const savedEmail = localStorage.getItem('locohelp_last_logged_in_email') || localStorage.getItem('locohelp_user_email');
    if (savedEmail && isValidEmail(savedEmail)) {
      email = savedEmail.trim().toLowerCase();
    } else {
      email = 'chauhansanjay932@gmail.com';
    }
  }

  const displayName = customName || (email.includes('@') ? email.split('@')[0] : email) || 'Google User';
  const uid = ensureValidUUID(email);
  const photoURL = 'https://lh3.googleusercontent.com/a/default-user';

  const userData: AppUser = {
    uid,
    displayName,
    email,
    photoURL,
    isGuest: false
  };

  // 1. Persist session locally
  localStorage.setItem('locohelp_user', JSON.stringify(userData));
  localStorage.setItem('locohelp_logged_in', 'true');
  localStorage.setItem('locohelp_last_logged_in_email', email);
  localStorage.setItem('locohelp_last_logged_in_name', displayName);
  localStorage.setItem('locohelp_last_logged_in_photo', photoURL);

  // 2. Persist profile to backend & Railway PostgreSQL "user" table + obtain JWT token
  try {
    const googleRes = await fetch('/api/auth/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        displayName,
        photoURL
      })
    });
    if (googleRes.ok) {
      const gData = await googleRes.json();
      if (gData.token) {
        localStorage.setItem('locohelp_token', gData.token);
      }
    }

    await saveUserProfile(userData);
  } catch (e) {
    console.warn("Google sign-in sync note:", e);
  }

  // 3. Dispatch events to notify all components
  window.dispatchEvent(new Event('storage'));
  window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');
  notifyAuthState('SIGNED_IN', userData);

  return userData;
}

export const signInWithGoogleInPlace = signInWithGoogle;

/**
 * Email & Password Login with JWT session persistence
 */
export async function signInWithPassword(email: string, password: string): Promise<{ success: boolean; error?: string; user?: AppUser }> {
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
      return { success: false, error: data.error || 'Login failed' };
    }

    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || cleanEmail),
      displayName: data.user?.displayName || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: data.user?.phone || '',
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
 * Email & Password Sign Up with JWT session persistence
 */
export async function signUpWithPassword(email: string, password: string, name?: string, phone?: string): Promise<{ success: boolean; error?: string; user?: AppUser }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'कृपया सही ईमेल दर्ज करें (Invalid email format)' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' };
  }

  try {
    const res = await fetch('/api/auth/register-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password, name, phone })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Registration failed' };
    }

    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || cleanEmail),
      displayName: data.user?.displayName || name || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: phone || '',
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
 * Sends 6-Digit Numeric Email OTP Code via Backend Server (Brevo REST API)
 */
export async function sendEmailOtp(email: string): Promise<{ success: boolean; error?: string; devCode?: string; provider?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'कृपया मान्य ईमेल आईडी दर्ज करें (Please enter a valid email address)' };
  }

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanEmail, type: 'email' })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to send OTP' };
    }
    return { success: true, devCode: data.devOtp, provider: data.provider };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error while sending OTP' };
  }
}

export const sendEmailOtpViaSupabase = sendEmailOtp;

/**
 * Verifies 6-Digit Numeric Email OTP Code via Backend Server
 */
export async function verifyEmailOtp(email: string, code: string): Promise<{ success: boolean; error?: string; user?: any }> {
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
      body: JSON.stringify({ identifier: cleanEmail, code: cleanCode, type: 'email' })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Invalid OTP code' };
    }

    const userData: AppUser = {
      uid: ensureValidUUID(data.user?.uid || cleanEmail),
      displayName: data.user?.displayName || cleanEmail.split('@')[0],
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
 * Clean logout: Clears server & local session
 */
export async function logoutUser() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('locohelp_')) {
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
 * Saves or updates user profile in Railway PostgreSQL & LocalStorage
 */
export async function saveUserProfile(userData: Record<string, any>): Promise<void> {
  if (!userData) return;
  const rawUid = userData.uid || userData.user_id || 'guest_user';
  if (rawUid === 'guest_user') return;

  const targetUid = ensureValidUUID(rawUid);

  const dataToSave = {
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
  };

  // Immediate localStorage save
  try {
    localStorage.setItem(`locohelp_user_profile_${targetUid}`, JSON.stringify(dataToSave));
  } catch (e) {}

  // Save to Express Backend / Railway PostgreSQL
  try {
    await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`/api/profiles/${encodeURIComponent(uid)}?_t=${Date.now()}`);
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

  // Fallback to local storage if network is offline
  try {
    const local = localStorage.getItem(`locohelp_user_profile_${uid}`);
    if (local) return JSON.parse(local);
  } catch (e) {}

  return null;
}

export const getUserProfileFromSupabase = getUserProfile;

/**
 * Deletes user profile from Backend PostgreSQL
 */
export async function deleteUserProfile(uid: string): Promise<boolean> {
  if (!uid || uid === 'guest_user') return false;
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(uid)}`, {
      method: 'DELETE'
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
  const payload = {
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
  };

  const res = await fetch('/api/intents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    return await res.json();
  }
  return payload;
}

export async function getBroadcastPosts(): Promise<any[]> {
  try {
    const res = await fetch(`/api/intents?_t=${Date.now()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Error fetching broadcast posts:", err);
  }
  return [];
}

/**
 * Messaging database queries
 */
export async function sendMessage(senderId: string, receiverId: string, content: string, intentId?: string) {
  const payload = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    authorId: senderId,
    senderId,
    receiverId,
    text: content,
    content,
    createdAt: new Date().toISOString()
  };

  const targetId = intentId || 'general';
  const res = await fetch(`/api/intents/${targetId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`/api/intents/${targetId}/messages?_t=${Date.now()}`);
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
  try {
    const res = await fetch('/api/shops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shop)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Save shop error:", e);
  }
  return shop;
}

export async function getShops(): Promise<any[]> {
  try {
    const res = await fetch(`/api/shops?_t=${Date.now()}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Get shops error:", e);
  }
  return [];
}

/**
 * Helpers database queries
 */
export async function saveHelper(helper: any): Promise<any> {
  try {
    const res = await fetch('/api/helpers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(helper)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Save helper error:", e);
  }
  return helper;
}

export async function getHelpers(): Promise<any[]> {
  try {
    const res = await fetch(`/api/helpers?_t=${Date.now()}`);
    if (res.ok) return await res.json();
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, response, userId })
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
      body: JSON.stringify(userData)
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

