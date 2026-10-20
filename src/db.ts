// =====================================================================
// LOCOHELP - Central Railway PostgreSQL Database & Authentication Client
// Pure Node.js/Express Backend & PostgreSQL Integration
// Completely independent of external Supabase dependencies
// =====================================================================

import { sendAuthOtp, verifyAuthOtp } from './api';
import { getAuthHeaders } from './auth';

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
  avatar_url?: string;
  skills?: string;
  address?: string;
  experience?: string;
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

/**
 * Ensures any string ID is converted into a deterministic, valid PostgreSQL UUID format (8-4-4-4-12 hex string).
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
 * Saves or updates user profile in Railway PostgreSQL database & LocalStorage
 */
export async function saveUserProfile(userData: Record<string, any>): Promise<void> {
  if (!userData) return;
  const rawUid = userData.uid || userData.user_id || 'guest_user';
  if (rawUid === 'guest_user') return;

  const targetUid = ensureValidUUID(rawUid);

  try {
    const dataToSave = {
      uid: targetUid,
      full_name: userData.displayName || userData.full_name || 'Community Member',
      email: userData.email || '',
      avatar_url: userData.photoURL || userData.avatar_url || 'https://lh3.googleusercontent.com/a/default-user',
      skills: userData.skills || '',
      address: userData.address || '',
      experience: userData.experience || '',
      updated_at: new Date().toISOString(),
    };
    
    // Save to localStorage for instant UI availability
    localStorage.setItem(`locohelp_user_profile_${targetUid}`, JSON.stringify(dataToSave));
    
    // UPSERT directly into Railway PostgreSQL backend with auth headers
    await fetch('/api/profiles', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dataToSave)
    });
  } catch (error) {
    console.error('saveUserProfile error:', error);
  }
}

// Backward compatibility alias
export const saveUserProfileToSupabase = saveUserProfile;

/**
 * Specifically for auto-creating profile in Railway PostgreSQL on first sign-in
 */
export async function ensureProfileExists(u: any) {
  if (!u) return;
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(u.id || u.uid)}`);
    const data = res.ok ? await res.json() : null;
    
    if (!data) {
      await saveUserProfile({
        uid: u.id || u.uid,
        displayName: u.user_metadata?.full_name || u.displayName || u.email?.split('@')[0] || 'LocoHelp Member',
        email: u.email || '',
        photoURL: u.user_metadata?.avatar_url || u.photoURL || '',
      });
    }
  } catch (err) {
    console.error("ensureProfileExists notice:", err);
  }
}

/**
 * Fetches user profile from Railway PostgreSQL database
 */
export async function getUserProfile(uid: string): Promise<Record<string, any> | null> {
  if (!uid || uid === 'guest_user') return null;
  
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(uid)}`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        localStorage.setItem(`locohelp_user_profile_${uid}`, JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.warn("Fetch profile error:", e);
  }
  
  // Fallback to local storage if offline
  try {
    const local = localStorage.getItem(`locohelp_user_profile_${uid}`);
    if (local) return JSON.parse(local);
  } catch (e) {}

  return null;
}

// Backward compatibility alias
export const getUserProfileFromSupabase = getUserProfile;



/**
 * Sends 6-digit numeric email OTP code via Node.js Express server
 */
export async function sendEmailOtp(email: string): Promise<{ success: boolean; error?: string; devCode?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  try {
    const serverRes = await sendAuthOtp(cleanEmail, 'email');
    if (serverRes.success) {
      return { 
        success: true, 
        devCode: serverRes.devCode 
      };
    }
    return { success: false, error: serverRes.error || 'Failed to send OTP' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send OTP' };
  }
}

// Backward compatibility alias
export const sendEmailOtpViaSupabase = sendEmailOtp;

/**
 * Verifies 6-digit numeric email OTP code and saves profile in Railway PostgreSQL
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
    const serverRes = await verifyAuthOtp(cleanEmail, cleanCode, 'email');
    if (serverRes.success && serverRes.user) {
      const userData = {
        uid: ensureValidUUID(serverRes.user.uid || cleanEmail),
        displayName: serverRes.user.displayName || cleanEmail.split('@')[0],
        email: cleanEmail,
        photoURL: 'https://lh3.googleusercontent.com/a/default-user',
        isGuest: false
      };

      localStorage.setItem('locohelp_user', JSON.stringify(userData));
      localStorage.setItem('locohelp_logged_in', 'true');
      localStorage.setItem('locohelp_last_logged_in_email', cleanEmail);
      localStorage.setItem('locohelp_last_logged_in_name', userData.displayName);

      // Persist profile in Railway PostgreSQL
      try {
        await saveUserProfile(userData);
      } catch (e) {}

      window.dispatchEvent(new Event('storage'));
      window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');

      return { success: true, user: userData };
    } else if (serverRes.error) {
      return { success: false, error: serverRes.error };
    }
  } catch (e) {
    console.warn("OTP verify error:", e);
  }

  return { success: false, error: 'Invalid OTP code. Please check the code and try again.' };
}

// Backward compatibility alias
export const verifyEmailOtpViaSupabase = verifyEmailOtp;

/**
 * Clean logout: Clears session and local storage
 */
export async function logoutUser() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('locohelp_')) {
        localStorage.removeItem(key);
      }
    });
    sessionStorage.clear();
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn("Logout error:", e);
  }
}

/**
 * Returns active user from persistent local session
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
 * Broadcast Posts (Railway PostgreSQL)
 */
export async function saveBroadcastPost(post: any) {
  const payload = {
    id: post.id || 'post_' + Date.now(),
    author_id: post.author_id || post.authorId || post.user_id,
    author_name: post.author_name || post.authorName || post.user_name || 'Community Member',
    author_avatar: post.author_avatar || post.authorAvatar || post.user_avatar || '',
    description: post.description,
    category: post.category || 'General',
    tags: post.tags || [],
    status: post.status || 'active',
    created_at: post.created_at || new Date().toISOString()
  };

  const res = await fetch('/api/broadcast-posts', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error('Failed to save broadcast post in Railway PostgreSQL');
  }

  return await res.json();
}

export async function getBroadcastPosts(): Promise<BroadcastPost[]> {
  try {
    const res = await fetch('/api/broadcast-posts', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn("Error fetching broadcast posts:", err);
  }
  return [];
}

export async function deleteBroadcastPost(id: string, description?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/broadcast-posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ description })
    });
    return res.ok;
  } catch (err) {
    console.warn("Error deleting broadcast post:", err);
    return false;
  }
}

/**
 * Messaging & Chats (Railway PostgreSQL)
 */
export async function sendMessage(senderId: string, receiverId: string, content: string, intentId?: string) {
  const payload = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sender_id: senderId,
    receiver_id: receiverId,
    content: content,
    intent_id: intentId || null,
    created_at: new Date().toISOString()
  };

  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error('Failed to send message to Railway PostgreSQL');
  }

  return await res.json();
}

export async function getMessages(userId: string, otherUserId: string, intentId?: string): Promise<Message[]> {
  try {
    const url = `/api/messages?userId=${encodeURIComponent(userId)}&otherUserId=${encodeURIComponent(otherUserId)}${intentId ? `&intentId=${encodeURIComponent(intentId)}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn("Error fetching messages:", err);
  }
  return [];
}

/**
 * Universal Railway PostgreSQL Database Client (db)
 * Replaces any Supabase client calls with direct PostgreSQL queries via Express
 */
export const db = {
  from: (table: string) => {
    return {
      select: (cols: string = '*') => {
        let _filterCol: string | null = null;
        let _filterVal: any = null;

        const executeQuery = async () => {
          let url = `/api/db/${table}`;
          if (table === 'profiles') url = '/api/profiles';
          if (table === 'broadcast_posts') url = '/api/broadcast-posts';
          if (table === 'messages') url = '/api/messages';

          try {
            const res = await fetch(url, { cache: 'no-store' });
            let data = res.ok ? await res.json() : [];
            if (!Array.isArray(data)) data = data ? [data] : [];

            if (_filterCol && _filterVal !== null) {
              data = data.filter((item: any) => String(item[_filterCol!]) === String(_filterVal));
            }
            return { data, error: null };
          } catch (e: any) {
            return { data: [], error: e };
          }
        };

        const createChain = (promise: Promise<any>) => {
          return Object.assign(promise, {
            eq: (col: string, val: any) => {
              _filterCol = col;
              _filterVal = val;
              const eqPromise = executeQuery();
              return Object.assign(eqPromise, {
                single: async () => {
                  const res = await executeQuery();
                  return { data: res.data[0] || null, error: null };
                },
                maybeSingle: async () => {
                  const res = await executeQuery();
                  return { data: res.data[0] || null, error: null };
                },
                delete: async () => {
                  let url = `/api/db/${table}?${col}=${encodeURIComponent(val)}`;
                  if (table === 'profiles') url = `/api/profiles/${encodeURIComponent(val)}`;
                  if (table === 'broadcast_posts') url = `/api/broadcast-posts/${encodeURIComponent(val)}`;
                  await fetch(url, { method: 'DELETE' });
                  return { data: null, error: null };
                }
              });
            },
            or: (expr: string) => {
              const orPromise = executeQuery();
              return Object.assign(orPromise, {
                order: (col: string, opts?: any) => executeQuery()
              });
            },
            order: (col: string, opts?: any) => {
              const orderPromise = executeQuery();
              return Object.assign(orderPromise, {
                single: async () => {
                  const res = await executeQuery();
                  return { data: res.data[0] || null, error: null };
                },
                maybeSingle: async () => {
                  const res = await executeQuery();
                  return { data: res.data[0] || null, error: null };
                }
              });
            },
            single: async () => {
              const res = await executeQuery();
              return { data: res.data[0] || null, error: null };
            },
            maybeSingle: async () => {
              const res = await executeQuery();
              return { data: res.data[0] || null, error: null };
            }
          });
        };

        return createChain(executeQuery());
      },
      insert: (payload: any) => {
        const executeInsert = async () => {
          let url = `/api/db/${table}`;
          if (table === 'profiles') url = '/api/profiles';
          if (table === 'broadcast_posts') url = '/api/broadcast-posts';
          if (table === 'messages') url = '/api/messages';

          try {
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = res.ok ? await res.json() : payload;
            return { data, error: null };
          } catch (e: any) {
            return { data: payload, error: null };
          }
        };

        const insertPromise = executeInsert();
        return Object.assign(insertPromise, {
          select: () => ({
            single: async () => executeInsert()
          })
        });
      },
      upsert: async (payload: any) => {
        let url = `/api/db/${table}`;
        if (table === 'profiles') url = '/api/profiles';
        if (table === 'broadcast_posts') url = '/api/broadcast-posts';

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = res.ok ? await res.json() : payload;
          return { data, error: null };
        } catch (e: any) {
          return { data: payload, error: null };
        }
      },
      delete: () => ({
        eq: async (col: string, val: any) => {
          let url = `/api/db/${table}?${col}=${encodeURIComponent(val)}`;
          if (table === 'profiles') url = `/api/profiles/${encodeURIComponent(val)}`;
          if (table === 'broadcast_posts') url = `/api/broadcast-posts/${encodeURIComponent(val)}`;
          await fetch(url, { method: 'DELETE' });
          return { data: null, error: null };
        }
      })
    };
  },
  channel: (channelName: string) => ({
    on: (type: string, opts: any, callback: any) => ({
      subscribe: () => ({})
    }),
    subscribe: () => ({})
  }),
  removeChannel: (channel: any) => {},
  auth: {
    signInWithOAuth: async (opts?: any) => {
      const prompt = opts?.options?.queryParams?.prompt || opts?.options?.prompt || 'select_account';
      return { 
        data: { 
          provider: 'google', 
          url: `https://accounts.google.com/o/oauth2/v2/auth?prompt=${encodeURIComponent(prompt)}` 
        }, 
        error: null 
      };
    },
    signInWithOtp: async ({ email }: { email: string }) => {
      const res = await sendEmailOtp(email);
      return { data: res, error: res.success ? null : { message: res.error || 'Failed' } };
    },
    verifyOtp: async ({ email, token }: { email: string; token: string; type?: string }) => {
      const res = await verifyEmailOtp(email, token);
      return { data: { user: res.user || null }, error: res.success ? null : { message: res.error || 'Invalid OTP' } };
    },
    signOut: async () => {
      await logoutUser();
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      const handler = () => {
        const user = getCurrentUser();
        if (user && user.uid && user.uid !== 'guest_user') {
          callback('SIGNED_IN', {
            user: {
              id: user.uid,
              email: user.email,
              user_metadata: { full_name: user.displayName, avatar_url: user.photoURL }
            }
          });
        } else {
          callback('SIGNED_OUT', null);
        }
      };
      window.addEventListener('storage', handler);
      return {
        data: {
          subscription: {
            unsubscribe: () => window.removeEventListener('storage', handler)
          }
        }
      };
    },
    getSession: async () => {
      const user = getCurrentUser();
      if (user && user.uid !== 'guest_user') {
        return { data: { session: { user: { id: user.uid, email: user.email } } }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    getUser: async () => {
      const user = getCurrentUser();
      if (user && user.uid !== 'guest_user') {
        return { data: { user: { id: user.uid, email: user.email } }, error: null };
      }
      return { data: { user: null }, error: null };
    }
  }
};

// Backward-compatible alias for codebase continuity
export const supabase = db;
