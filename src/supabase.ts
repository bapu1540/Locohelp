import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ftiwhtcpjmfqlqvoldbl.supabase.co';
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
 * Returns active user from Supabase Session or persistent local session.
 */
export function getCurrentUser(): AppUser {
  try {
    const saved = localStorage.getItem('locohelp_user');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}

  return {
    uid: 'guest_user',
    displayName: 'LocoHelper Member',
    email: 'helper@locohelp.local',
  };
}

/**
 * Saves or updates user profile in Supabase & LocalStorage
 */
export async function saveUserProfileToSupabase(userData: Record<string, any>): Promise<void> {
  if (!userData) return;
  const targetUid = userData.uid || 'guest_user';
  if (targetUid === 'guest_user') return;

  try {
    const dataToSave = {
      ...userData,
      uid: targetUid,
      last_active_at: new Date().toISOString(),
    };
    localStorage.setItem(`locohelp_user_profile_${targetUid}`, JSON.stringify(dataToSave));
    await supabase.from('users').upsert(dataToSave);
    await supabase.from('profiles').upsert(dataToSave);
  } catch (error) {
    console.warn('saveUserProfileToSupabase warning:', error);
  }
}

/**
 * Fetches user profile from Supabase or LocalStorage
 */
export async function getUserProfileFromSupabase(uid: string): Promise<Record<string, any> | null> {
  if (!uid || uid === 'guest_user') return null;
  try {
    const { data, error } = await supabase.from('users').select('*').eq('uid', uid).single();
    if (!error && data) return data;
  } catch (e) {}

  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('uid', uid).single();
    if (!error && data) return data;
  } catch (e) {}
  
  try {
    const local = localStorage.getItem(`locohelp_user_profile_${uid}`);
    if (local) return JSON.parse(local);
  } catch (e) {}

  return null;
}
