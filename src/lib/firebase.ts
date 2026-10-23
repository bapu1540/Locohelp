import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';

const metaEnv = (import.meta as any).env || {};

// Default Firebase configuration with fallback parameters
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForLocoHelpAuthInit2026",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "locohelp-app.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "locohelp-app",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "locohelp-app.appspot.com",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:1029384756:web:abc123def456"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
// Force Google Account Selection on login so users pick their account every time
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function signInWithGoogle(): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const result: UserCredential = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      success: true,
      user: {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
        email: user.email || '',
        photoURL: user.photoURL || 'https://lh3.googleusercontent.com/a/default-user',
        phone: user.phoneNumber || ''
      }
    };
  } catch (err: any) {
    console.warn("Firebase Google Auth popup error/fallback:", err);
    return {
      success: false,
      error: err?.message || 'Google Sign-In failed'
    };
  }
}
