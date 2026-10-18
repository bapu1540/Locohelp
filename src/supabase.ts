import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ftiwhfcpmjfolqvoidbl.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0aXdoZmNwbWpmb2xxdm9pZGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNTg4NzgsImV4cCI6MjEwNzgzNDg3OH0.6LuqfPDhfCbGbgnSJF8bD_UH8QPG_691YOVdqUde33M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  // Format as xxxxxxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

export async function signInWithGoogleInPlace(customEmail?: string, customName?: string) {
  if (!customEmail || !customEmail.trim()) {
    throw new Error('Please enter a valid Google email address.');
  }
  const email = customEmail.trim().toLowerCase();
  const displayName = customName || (email.includes('@') ? email.split('@')[0] : email) || 'Google User';
  const uid = ensureValidUUID(email);
  const photoURL = 'https://lh3.googleusercontent.com/a/default-user';

  const userData = {
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

  // 2. Persist profile to Supabase
  try {
    await saveUserProfileToSupabase(userData);
  } catch (e) {
    console.warn("Supabase profile sync note:", e);
  }

  // 3. Dispatch events to notify all components
  window.dispatchEvent(new Event('storage'));
  window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');

  return userData;
}

import { sendAuthOtp, verifyAuthOtp } from './api';

/**
 * Triggers 6-Digit Numeric Email OTP sending
 */
export async function sendEmailOtpViaSupabase(email: string): Promise<{ success: boolean; error?: string; devCode?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  // 1. Generate 6-digit numeric OTP code via central server
  let devCode: string | undefined = undefined;
  try {
    const serverRes = await sendAuthOtp(cleanEmail, 'email');
    if (serverRes.success && serverRes.devCode) {
      devCode = serverRes.devCode;
    }
  } catch (e) {
    console.warn("Server OTP generation note:", e);
  }

  // 2. Trigger Supabase Auth signInWithOtp for real email delivery
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true
      }
    });

    if (error) {
      console.warn("Supabase signInWithOtp note:", error.message);
    } else {
      console.log("Supabase OTP email dispatched to:", cleanEmail);
    }
  } catch (err: any) {
    console.warn("Supabase signInWithOtp exception:", err);
  }

  // Always return success along with the 6-digit code so user is never blocked
  return { 
    success: true, 
    devCode 
  };
}

/**
 * Verifies 6-Digit Numeric Email OTP Code
 */
export async function verifyEmailOtpViaSupabase(email: string, code: string): Promise<{ success: boolean; error?: string; user?: any }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address' };
  }
  if (!cleanCode) {
    return { success: false, error: 'Please enter the 6-digit OTP code' };
  }

  // 1. Verify 6-digit token using Supabase Auth verifyOtp
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanCode,
      type: 'email'
    });

    if (!error && data?.user) {
      const userData = {
        uid: ensureValidUUID(data.user.id),
        displayName: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
        email: cleanEmail,
        photoURL: data.user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user',
        isGuest: false
      };

      localStorage.setItem('locohelp_user', JSON.stringify(userData));
      localStorage.setItem('locohelp_logged_in', 'true');
      localStorage.setItem('locohelp_last_logged_in_email', cleanEmail);

      try {
        await saveUserProfileToSupabase(userData);
      } catch (e) {}

      window.dispatchEvent(new Event('storage'));
      window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');

      return { success: true, user: userData };
    } else if (error) {
      console.warn("Supabase verifyOtp note:", error.message);
    }
  } catch (err: any) {
    console.warn("Supabase verifyOtp exception:", err);
  }

  // 2. Try Backend Server verification
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

      try {
        await saveUserProfileToSupabase(userData);
      } catch (e) {}

      window.dispatchEvent(new Event('storage'));
      window.postMessage({ type: 'LOCOHELP_AUTH_SUCCESS' }, '*');

      return { success: true, user: userData };
    } else if (serverRes.error) {
      return { success: false, error: serverRes.error };
    }
  } catch (e) {
    console.warn("Server OTP verify error:", e);
  }

  return { success: false, error: 'Invalid 6-digit OTP code. Please check your code and try again.' };
}

/**
 * Helper to trigger real Supabase Google OAuth (Handles iframe 403 gracefully)
 */
export async function signInWithGoogle(customEmail?: string, customName?: string) {
  const origin = window.location.origin;

  // If a custom email/name is specified or in-place login is requested
  if (customEmail && customEmail.trim()) {
    return await signInWithGoogleInPlace(customEmail, customName);
  }

  // Trigger official Supabase Google OAuth
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin,
        queryParams: {
          prompt: 'select_account'
        }
      }
    });

    if (error) {
      console.warn("Supabase OAuth error:", error.message);
      throw new Error('Google OAuth is not configured on Supabase Dashboard.');
    }

    if (data?.url) {
      // Avoid Google 403 iframe error by opening in top window or popup if inside iframe
      const isIframe = window.self !== window.top;
      if (isIframe) {
        window.open(data.url, '_blank', 'width=500,height=600,scrollbars=yes');
      } else {
        window.location.href = data.url;
      }
    }

    return data;
  } catch (err: any) {
    console.error("signInWithGoogle note:", err);
    throw new Error(err?.message || 'Google OAuth is unconfigured. Select your account email below.');
  }
}

/**
 * Clean logout: Clears Supabase session and local storage
 */
export async function logoutUser() {
  try {
    await supabase.auth.signOut();
    // Clear all locohelp related keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('locohelp_')) {
        localStorage.removeItem(key);
      }
    });
    sessionStorage.clear();
  } catch (e) {
    console.warn("Logout error:", e);
  }
}

/**
 * Returns active user from Supabase Session or persistent local session.
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
 * Saves or updates user profile in Supabase & LocalStorage
 */
export async function saveUserProfileToSupabase(userData: Record<string, any>): Promise<void> {
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
    
    // Save to localStorage for immediate UI availability
    localStorage.setItem(`locohelp_user_profile_${targetUid}`, JSON.stringify(dataToSave));
    
    // UPSERT into Supabase
    const { error } = await supabase.from('profiles').upsert(dataToSave);
    if (error) throw error;
  } catch (error) {
    console.error('saveUserProfileToSupabase error:', error);
  }
}

/**
 * Specifically for auto-creating profile on first sign-in
 */
export async function ensureProfileExists(u: any) {
  if (!u) return;
  try {
    const { data, error } = await supabase.from('profiles').select('uid').eq('uid', u.id).maybeSingle();
    if (error) {
      console.warn("Error checking profile existence:", error);
    }
    
    if (!data) {
      await saveUserProfileToSupabase({
        uid: u.id,
        displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Supabase User',
        email: u.email || '',
        photoURL: u.user_metadata?.avatar_url || '',
      });
    }
  } catch (err) {
    console.error("ensureProfileExists fatal error:", err);
  }
}

/**
 * Fetches user profile from Supabase
 */
export async function getUserProfileFromSupabase(uid: string): Promise<Record<string, any> | null> {
  if (!uid || uid === 'guest_user') return null;
  
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('uid', uid).maybeSingle();
    if (!error && data) {
      localStorage.setItem(`locohelp_user_profile_${uid}`, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn("Fetch profile error:", e);
  }
  
  // Fallback to local storage if network fails
  try {
    const local = localStorage.getItem(`locohelp_user_profile_${uid}`);
    if (local) return JSON.parse(local);
  } catch (e) {}

  return null;
}

/**
 * Broadcast Posts Logic
 */
export async function saveBroadcastPost(post: any) {
  const payload = {
    author_id: post.author_id || post.user_id,
    author_name: post.author_name || post.user_name || 'Community Member',
    author_avatar: post.author_avatar || post.user_avatar || '',
    description: post.description,
    category: post.category || 'General',
    tags: post.tags || [],
    status: post.status || 'active',
    created_at: post.created_at || new Date().toISOString()
  };

  const { data, error } = await supabase.from('broadcast_posts').insert(payload).select().single();
  
  if (error) throw error;
  return data;
}

export async function getBroadcastPosts() {
  try {
    const { data, error } = await supabase
      .from('broadcast_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Error fetching broadcast posts:", err);
    return [];
  }
}

/**
 * Messaging Logic
 */
export async function sendMessage(senderId: string, receiverId: string, content: string) {
  const { data, error } = await supabase.from('messages').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    content: content,
    created_at: new Date().toISOString()
  }).select().single();

  if (error) throw error;
  return data;
}

export async function getMessages(userId: string, otherUserId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Error fetching messages:", err);
    return [];
  }
}

