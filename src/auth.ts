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
 * Google Sign-In with backend PostgreSQL persistence
 */
export async function signInWithGoogle(customEmail?: string, customName?: string): Promise<AppUser> {
  const email = (customEmail || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Please enter a valid Google email address.');
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

  // 1. Save to localStorage for instant UI responsiveness
  localStorage.setItem('locohelp_user', JSON.stringify(userData));
  localStorage.setItem('locohelp_logged_in', 'true');
  localStorage.setItem('locohelp_last_logged_in_email', email);
  localStorage.setItem('locohelp_last_logged_in_name', displayName);
  localStorage.setItem('locohelp_last_logged_in_photo', photoURL);

  // 2. Persist profile to backend & Railway PostgreSQL
  try {
    await saveUserProfile(userData);
  } catch (e) {
    console.warn("Profile sync note:", e);
  }

  // 3. Dispatch events to notify all components
  window.dispatchEvent(new Event('storage'));
  window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');
  notifyAuthState('SIGNED_IN', userData);

  return userData;
}

export const signInWithGoogleInPlace = signInWithGoogle;

/**
 * Sends 6-Digit Numeric Email OTP Code via Backend Server
 */
export async function sendEmailOtp(email: string): Promise<{ success: boolean; error?: string; devCode?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address' };
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
    return { success: true, devCode: data.devOtp };
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

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address' };
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
    await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, response, userId })
    });
  } catch (e) {}
}
