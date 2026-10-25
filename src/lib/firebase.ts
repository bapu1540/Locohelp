import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

const metaEnv = (import.meta as any).env || {};

// Configure Firebase using process.env.FIREBASE_* environment variables (with VITE_ fallbacks)
export const firebaseConfig = {
  apiKey:
    process.env.FIREBASE_API_KEY ||
    metaEnv.VITE_FIREBASE_API_KEY ||
    "AIzaSyDummyKeyForLocoHelpAuthInit2026",
  authDomain:
    process.env.FIREBASE_AUTH_DOMAIN ||
    metaEnv.VITE_FIREBASE_AUTH_DOMAIN ||
    "locohelp-app.firebaseapp.com",
  projectId:
    process.env.FIREBASE_PROJECT_ID ||
    metaEnv.VITE_FIREBASE_PROJECT_ID ||
    "locohelp-app",
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    metaEnv.VITE_FIREBASE_STORAGE_BUCKET ||
    "locohelp-app.appspot.com",
  messagingSenderId:
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "1029384756",
  appId:
    process.env.FIREBASE_APP_ID ||
    metaEnv.VITE_FIREBASE_APP_ID ||
    "1:1029384756:web:abc123def456"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const storage = getStorage(app);

export function isFirebaseStorageConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== "AIzaSyDummyKeyForLocoHelpAuthInit2026" &&
      firebaseConfig.storageBucket &&
      firebaseConfig.storageBucket !== "locohelp-app.appspot.com"
  );
}

function getExtensionFromMime(mime: string, fallback = 'webp'): string {
  const clean = (mime || '').toLowerCase();
  if (clean.includes('pdf')) return 'pdf';
  if (clean.includes('png')) return 'png';
  if (clean.includes('jpeg') || clean.includes('jpg')) return 'jpg';
  if (clean.includes('webp')) return 'webp';
  return fallback;
}

function fileOrBlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads any File, Blob, or Base64 Data URL directly to Firebase Storage inside the dedicated `locohelp/` folder
 * and returns its permanent public download URL. Never saves files to local disk paths.
 */
export async function uploadFileToFirebaseStorage(
  input: File | Blob | string,
  subFolder: string = 'media',
  customFileName?: string
): Promise<string> {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
  }

  const cleanSubFolder = (subFolder || 'media')
    .replace(/^\/+|\/+$/g, '')
    .replace(/^locohelp\/?/i, '') || 'media';
  const randSuffix = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now();

  // 1. Try direct client-side Firebase Storage SDK upload when configured
  if (isFirebaseStorageConfigured()) {
    try {
      if (typeof input === 'string' && input.startsWith('data:')) {
        const mimeMatch = input.match(/^data:([^;]+);base64,/i);
        const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
        const ext = getExtensionFromMime(mime);
        const safeName = customFileName
          ? customFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
          : `${timestamp}_${randSuffix}.${ext}`;
        const storagePath = `locohelp/${cleanSubFolder}/${safeName}`;
        const storageReference = ref(storage, storagePath);
        await uploadString(storageReference, input, 'data_url', { contentType: mime });
        const downloadUrl = await getDownloadURL(storageReference);
        if (downloadUrl) return downloadUrl;
      } else if (input instanceof Blob) {
        const fileObj = input as File;
        const mime = fileObj.type || 'image/webp';
        const ext = getExtensionFromMime(mime);
        const rawName = customFileName || fileObj.name || `${timestamp}_${randSuffix}.${ext}`;
        const safeName = `${timestamp}_${randSuffix}_${rawName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const storagePath = `locohelp/${cleanSubFolder}/${safeName}`;
        const storageReference = ref(storage, storagePath);
        await uploadBytes(storageReference, input, { contentType: mime });
        const downloadUrl = await getDownloadURL(storageReference);
        if (downloadUrl) return downloadUrl;
      }
    } catch (clientUploadErr) {
      console.warn('[Firebase Storage] Client SDK upload fallback to server endpoint:', clientUploadErr);
    }
  }

  // 2. Upload via backend /api/storage/upload (which uses server process.env.FIREBASE_* to upload to locohelp/)
  try {
    const dataUrl = typeof input === 'string' ? input : await fileOrBlobToDataUrl(input);
    const fileName =
      customFileName ||
      (typeof input === 'object' && 'name' in input ? (input as File).name : undefined);

    const res = await fetch('/api/storage/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl,
        folder: `locohelp/${cleanSubFolder}`,
        fileName
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (serverUploadErr) {
    console.warn('[Firebase Storage] Server upload fallback notice:', serverUploadErr);
  }

  // Fallback to in-memory data URL if Firebase credentials are not yet supplied in environment
  return typeof input === 'string' ? input : await fileOrBlobToDataUrl(input);
}

/**
 * Extracts internal Firebase Storage path (e.g. `locohelp/media/123.webp`) from a public download URL
 */
export function extractFirebaseStoragePath(fileUrl?: string | null): string | null {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('gs://')) {
    const parts = trimmed.replace('gs://', '').split('/');
    parts.shift();
    return parts.join('/') || null;
  }

  if (trimmed.includes('firebasestorage.googleapis.com') || trimmed.includes('.firebasestorage.app')) {
    const match = trimmed.match(/\/o\/([^?]+)/);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }

  if (trimmed.startsWith('locohelp/')) {
    return trimmed;
  }

  return null;
}

/**
 * Deletes a file from Firebase Storage given its public download URL or storage path
 */
export async function deleteFileFromFirebaseStorage(fileUrl?: string | null): Promise<boolean> {
  if (!fileUrl || typeof fileUrl !== 'string') return false;
  const storagePath = extractFirebaseStoragePath(fileUrl);
  if (!storagePath) return false;

  let deletedClient = false;
  if (isFirebaseStorageConfigured()) {
    try {
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
      deletedClient = true;
    } catch (e) {
      console.warn('[Firebase Storage] Client delete notice:', e);
    }
  }

  try {
    const res = await fetch('/api/storage/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl, storagePath })
    });
    if (res.ok) return true;
  } catch {}

  return deletedClient;
}

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

