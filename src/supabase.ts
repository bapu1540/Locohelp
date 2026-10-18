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
 * Helper to trigger real Supabase Google OAuth
 */
export async function signInWithGoogle() {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account'
        }
      }
    });
    if (error) {
      console.error("Supabase Auth Error:", error.message);
      throw error;
    }
  } catch (err) {
    console.error("signInWithGoogle fatal error:", err);
    throw err;
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
      if (parsed && parsed.uid && parsed.uid !== 'guest_user') return parsed;
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
  const targetUid = userData.uid || userData.user_id || 'guest_user';
  if (targetUid === 'guest_user') return;

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

