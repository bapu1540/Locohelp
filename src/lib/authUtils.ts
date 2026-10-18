import { supabase } from '../supabase';

/**
 * Helper utility to check if current user is a Guest or Authenticated.
 * Once a user logs in with Google/Email, this returns false permanently
 * across page refreshes, browser reopens, and device restarts.
 */
export function isGuestUser(): boolean {
  // 1. Check persistent user object in localStorage
  try {
    const raw = localStorage.getItem('locohelp_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u && u.email && !u.uid?.startsWith('guest_') && u.isGuest !== true) {
          return false;
        }
      } catch (err) {
        console.warn("isGuestUser parse error:", err);
      }
    }

    // 2. Check persistent login flag & recorded email
    const loggedIn = localStorage.getItem('locohelp_logged_in');
    const lastEmail = localStorage.getItem('locohelp_last_logged_in_email');
    if (loggedIn === 'true' && lastEmail) {
      return false;
    }
  } catch (e) {}

  return true;
}

/**
 * Gets current user profile object
 */
export function getUserProfile(): { uid: string; displayName: string; email: string; photoURL?: string; isGuest: boolean } {
  // 1. Local Storage User
  try {
    const raw = localStorage.getItem('locohelp_user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed) {
          const isGuest = !parsed.email && (parsed.uid?.startsWith('guest_') || parsed.isGuest === true);
          return {
            uid: parsed.uid || 'user_' + Math.random().toString(36).substring(2, 8),
            displayName: parsed.displayName || parsed.email?.split('@')[0] || 'Community Member',
            email: parsed.email || '',
            photoURL: parsed.photoURL || undefined,
            isGuest
          };
        }
      } catch (err) {
        console.warn("getUserProfile parse error:", err);
      }
    }

    // 2. Check fallback recorded email
    const lastEmail = localStorage.getItem('locohelp_last_logged_in_email');
    const lastName = localStorage.getItem('locohelp_last_logged_in_name');
    const lastPhoto = localStorage.getItem('locohelp_last_logged_in_photo');
    if (lastEmail) {
      return {
        uid: 'user_' + lastEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        displayName: lastName || lastEmail.split('@')[0] || 'Community Member',
        email: lastEmail,
        photoURL: lastPhoto || undefined,
        isGuest: false
      };
    }
  } catch (e) {}

  return {
    uid: 'guest_user',
    displayName: 'Guest User',
    email: '',
    isGuest: true
  };
}
