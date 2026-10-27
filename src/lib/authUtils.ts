import { getCurrentUser } from '../auth';

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
 * Gets current user profile object with canonical UID matching getCurrentUser()
 */
export function getUserProfile(): { uid: string; displayName: string; email: string; photoURL?: string; isGuest: boolean } {
  const current = getCurrentUser();
  if (current && !current.isGuest && current.uid !== 'guest_user') {
    let photo = current.photoURL;
    try {
      if (!photo) {
        photo = localStorage.getItem('locohelp_profile_photo') || localStorage.getItem('locohelp_last_logged_in_photo') || undefined;
      }
    } catch {}
    return {
      uid: current.uid,
      displayName: current.displayName || (current.email ? current.email.split('@')[0] : 'Community Member'),
      email: current.email || '',
      photoURL: photo,
      isGuest: false
    };
  }

  return {
    uid: 'guest_user',
    displayName: 'Guest User',
    email: '',
    isGuest: true
  };
}
