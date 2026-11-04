import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  Auth
} from 'firebase/auth';
import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { saveUserFcmTokenOnServer } from '../api';

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
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/uploads/') || trimmed.startsWith('/assets/')) {
      return trimmed;
    }
  }

  const cleanSubFolder = (subFolder || 'media')
    .replace(/^\/+|\/+$/g, '')
    .replace(/^locohelp\/?/i, '') || 'media';
  const randSuffix = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now();

  const dataUrl = typeof input === 'string' ? input : await fileOrBlobToDataUrl(input);
  const fileName =
    customFileName ||
    (typeof input === 'object' && 'name' in input ? (input as File).name : undefined);

  // 1. Primary: Upload via backend /api/storage/upload (bypasses browser CORS & uploads directly to Firebase Storage or /uploads/)
  try {
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

  // 2. Fallback: Try direct client-side Firebase Storage SDK upload when configured
  if (isFirebaseStorageConfigured()) {
    try {
      if (dataUrl.startsWith('data:')) {
        const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/i);
        const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
        const ext = getExtensionFromMime(mime);
        const safeName = customFileName
          ? customFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
          : `${timestamp}_${randSuffix}.${ext}`;
        const storagePath = `locohelp/${cleanSubFolder}/${safeName}`;
        const storageReference = ref(storage, storagePath);
        await uploadString(storageReference, dataUrl, 'data_url', { contentType: mime });
        const downloadUrl = await getDownloadURL(storageReference);
        if (downloadUrl) return downloadUrl;
      }
    } catch (clientUploadErr) {
      console.warn('[Firebase Storage] Client SDK upload fallback notice:', clientUploadErr);
    }
  }

  // Fallback to in-memory data URL
  return dataUrl;
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

// ==========================================
// FIREBASE CLOUD MESSAGING (FCM) WEB PUSH NOTIFICATIONS
// ==========================================

let cachedMessagingInstance: Messaging | null = null;
let cachedRuntimePublicConfig: {
  firebaseConfig?: Record<string, string>;
  vapidKey?: string;
} | null = null;

async function getRuntimeFirebasePublicConfig(): Promise<{
  firebaseConfig: typeof firebaseConfig;
  vapidKey: string;
}> {
  const inlineVapidKey = String(
    (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY ||
      process.env.VITE_FIREBASE_VAPID_KEY ||
      ''
  ).trim();

  if (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== 'AIzaSyDummyKeyForLocoHelpAuthInit2026' &&
    inlineVapidKey
  ) {
    return { firebaseConfig, vapidKey: inlineVapidKey };
  }

  if (!cachedRuntimePublicConfig) {
    try {
      const res = await fetch('/api/firebase-public-config', { cache: 'no-store' });
      if (res.ok) {
        cachedRuntimePublicConfig = await res.json();
      }
    } catch {}
  }

  const serverCfg = cachedRuntimePublicConfig?.firebaseConfig || {};
  const mergedConfig = {
    apiKey:
      serverCfg.apiKey && serverCfg.apiKey !== 'AIzaSyDummyKeyForLocoHelpAuthInit2026'
        ? serverCfg.apiKey
        : firebaseConfig.apiKey,
    authDomain: serverCfg.authDomain || firebaseConfig.authDomain,
    projectId: serverCfg.projectId || firebaseConfig.projectId,
    storageBucket: serverCfg.storageBucket || firebaseConfig.storageBucket,
    messagingSenderId: serverCfg.messagingSenderId || firebaseConfig.messagingSenderId,
    appId: serverCfg.appId || firebaseConfig.appId
  };
  const resolvedVapidKey =
    inlineVapidKey || String(cachedRuntimePublicConfig?.vapidKey || '').trim();

  return {
    firebaseConfig: mergedConfig,
    vapidKey: resolvedVapidKey
  };
}

export async function getFirebaseMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (cachedMessagingInstance) return cachedMessagingInstance;
  try {
    const supported = await isSupported().catch(() => false);
    if (!supported) return null;

    const { firebaseConfig: liveConfig } = await getRuntimeFirebasePublicConfig();
    let targetApp = app;
    if (
      liveConfig.apiKey &&
      liveConfig.apiKey !== 'AIzaSyDummyKeyForLocoHelpAuthInit2026' &&
      firebaseConfig.apiKey === 'AIzaSyDummyKeyForLocoHelpAuthInit2026'
    ) {
      const existingRuntimeApp = getApps().find((a) => a.name === 'locohelp-fcm-runtime');
      targetApp = existingRuntimeApp || initializeApp(liveConfig, 'locohelp-fcm-runtime');
    }

    cachedMessagingInstance = getMessaging(targetApp);
    return cachedMessagingInstance;
  } catch (err) {
    console.warn('[FCM] Messaging initialization notice:', err);
    return null;
  }
}

export async function requestAndRegisterFcmToken(options?: {
  area?: string;
  city?: string;
  district?: string;
  state?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  userId?: string;
  email?: string;
  name?: string;
  silentIfDefault?: boolean;
}): Promise<{
  success: boolean;
  token?: string;
  permission?: NotificationPermission;
  error?: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, error: 'Notifications are not supported in this browser.' };
  }

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      if (options?.silentIfDefault) {
        return { success: false, permission, error: 'Notification permission not granted yet.' };
      }
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return {
        success: false,
        permission,
        error:
          permission === 'denied'
            ? 'Notification permission denied in browser settings.'
            : 'Notification permission not granted.'
      };
    }

    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        await navigator.serviceWorker.ready.catch(() => {});
      } catch (swErr) {
        console.warn('[FCM] Service worker registration notice:', swErr);
      }
    }

    const { vapidKey } = await getRuntimeFirebasePublicConfig();
    const messaging = await getFirebaseMessagingInstance();
    let fcmToken = '';

    if (messaging) {
      try {
        fcmToken = await getToken(messaging, {
          vapidKey: vapidKey || undefined,
          serviceWorkerRegistration: swRegistration
        });
      } catch (tokenErr: any) {
        console.warn('[FCM] getToken notice:', tokenErr?.message || tokenErr);
      }
    }

    if (!fcmToken) {
      try {
        fcmToken = localStorage.getItem('locohelp_fcm_token') || '';
      } catch {}
    }

    if (!fcmToken) {
      return {
        success: false,
        permission,
        error:
          'FCM token could not be retrieved. Ensure VITE_FIREBASE_VAPID_KEY and Firebase project credentials are configured.'
      };
    }

    let fallbackUserId = options?.userId || '';
    let fallbackEmail = options?.email || '';
    let fallbackName = options?.name || '';
    try {
      const savedUserRaw = localStorage.getItem('locohelp_user');
      if (savedUserRaw) {
        const parsedUser = JSON.parse(savedUserRaw);
        if (!fallbackUserId) fallbackUserId = parsedUser?.uid || parsedUser?.id || '';
        if (!fallbackEmail) fallbackEmail = parsedUser?.email || '';
        if (!fallbackName) fallbackName = parsedUser?.name || parsedUser?.displayName || '';
      }
      if (!fallbackUserId) {
        let deviceGuestId = localStorage.getItem('locohelp_device_push_id') || '';
        if (!deviceGuestId) {
          deviceGuestId = 'device_' + Math.random().toString(36).substring(2, 12);
          localStorage.setItem('locohelp_device_push_id', deviceGuestId);
        }
        fallbackUserId = deviceGuestId;
      }
    } catch {}

    const syncRes = await saveUserFcmTokenOnServer({
      fcmToken,
      area: options?.area,
      city: options?.city || options?.district,
      district: options?.district,
      state: options?.state,
      location: options?.location,
      latitude: options?.latitude,
      longitude: options?.longitude,
      userId: fallbackUserId,
      email: fallbackEmail,
      name: fallbackName
    });

    try {
      localStorage.setItem('locohelp_fcm_token', fcmToken);
      localStorage.setItem('locohelp_push_enabled', 'true');
    } catch {}

    return {
      success: syncRes.success,
      token: fcmToken,
      permission,
      error: syncRes.error
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to enable push notifications'
    };
  }
}

export async function subscribeToForegroundPushMessages(
  onNotificationReceived: (payload: { title: string; body: string; url?: string; postId?: string }) => void
): Promise<(() => void) | null> {
  try {
    const messaging = await getFirebaseMessagingInstance();
    if (!messaging) return null;

    const unsubscribe = onMessage(messaging, (payload) => {
      const title =
        payload?.notification?.title ||
        payload?.data?.title ||
        '🔔 New Local Request on LocoHelp!';
      const body =
        payload?.notification?.body ||
        payload?.data?.body ||
        'Tap to view and help on LocoHelp';
      const url = payload?.fcmOptions?.link || payload?.data?.url || '/';
      const postId = payload?.data?.postId || '';

      onNotificationReceived({ title, body, url, postId });
    });

    return unsubscribe;
  } catch {
    return null;
  }
}

// ==========================================
// FIREBASE PHONE AUTHENTICATION (MOBILE SMS OTP)
// Supports Indian 10-digit mobile numbers (+91) with invisible reCAPTCHA
// ==========================================
let cachedRuntimeAuthInstance: Auth | null = null;
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;
let activeConfirmationResult: ConfirmationResult | null = null;

export async function getFirebaseAuthInstance(): Promise<Auth> {
  if (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== 'AIzaSyDummyKeyForLocoHelpAuthInit2026'
  ) {
    return auth;
  }
  if (cachedRuntimeAuthInstance) {
    return cachedRuntimeAuthInstance;
  }
  try {
    const runtimeCfg = await getRuntimeFirebasePublicConfig();
    if (
      runtimeCfg.firebaseConfig.apiKey &&
      runtimeCfg.firebaseConfig.apiKey !== 'AIzaSyDummyKeyForLocoHelpAuthInit2026'
    ) {
      const existingRuntimeApp = getApps().find((a) => a.name === 'locohelp-runtime-auth');
      const runtimeApp =
        existingRuntimeApp || initializeApp(runtimeCfg.firebaseConfig, 'locohelp-runtime-auth');
      cachedRuntimeAuthInstance = getAuth(runtimeApp);
      return cachedRuntimeAuthInstance;
    }
  } catch (err) {
    console.warn('[Firebase Phone Auth] Runtime config fallback warning:', err);
  }
  return auth;
}

function clearRecaptchaVerifier(containerId: string) {
  try {
    if (activeRecaptchaVerifier) {
      activeRecaptchaVerifier.clear();
      activeRecaptchaVerifier = null;
    }
  } catch {}
  try {
    const existingEl = document.getElementById(containerId);
    if (existingEl) {
      existingEl.innerHTML = '';
    }
  } catch {}
}

function ensureRecaptchaContainerElement(containerId: string): HTMLElement {
  let el = document.getElementById(containerId);
  if (el && el.parentNode) {
    const freshEl = document.createElement('div');
    freshEl.id = containerId;
    el.parentNode.replaceChild(freshEl, el);
    return freshEl;
  }
  const newEl = document.createElement('div');
  newEl.id = containerId;
  newEl.style.position = 'fixed';
  newEl.style.bottom = '0px';
  newEl.style.right = '0px';
  newEl.style.zIndex = '9999';
  document.body.appendChild(newEl);
  return newEl;
}

export function normalizeIndianPhoneE164(rawPhone: string): {
  valid: boolean;
  tenDigits: string;
  e164: string;
} {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  let tenDigits = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    tenDigits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    tenDigits = digits.slice(1);
  }
  const valid = /^[6-9]\d{9}$/.test(tenDigits);
  return {
    valid,
    tenDigits,
    e164: valid ? `+91${tenDigits}` : ''
  };
}

function trFirebase(en: string, hi: string, gu: string): string {
  try {
    const lang = (localStorage.getItem('locohelp_language') || 'GU').toUpperCase();
    if (lang === 'GU') return gu;
    if (lang === 'HI') return hi;
    return en;
  } catch {
    return gu;
  }
}

export async function sendFirebasePhoneOtp(
  rawPhone: string,
  containerId = 'recaptcha-container'
): Promise<{
  success: boolean;
  phoneE164?: string;
  tenDigits?: string;
  error?: string;
}> {
  const norm = normalizeIndianPhoneE164(rawPhone);
  if (!norm.valid) {
    return {
      success: false,
      error: trFirebase(
        'Please enter a valid 10-digit Indian mobile number.',
        'कृपया 10-अंकों का सही मोबाइल नंबर दर्ज करें।',
        'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર દાખલ કરો.'
      )
    };
  }

  try {
    const authInstance = await getFirebaseAuthInstance();
    const activeApiKey = String(authInstance?.app?.options?.apiKey || '');
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

    // When Firebase client credentials are not configured (dummy fallback key) or running inside AI Studio preview (*.run.app),
    // skip browser-side reCAPTCHA/Firebase network call and gracefully use the server 6-digit OTP fallback.
    if (
      !activeApiKey ||
      activeApiKey === 'AIzaSyDummyKeyForLocoHelpAuthInit2026' ||
      currentHost.endsWith('.run.app')
    ) {
      return {
        success: false,
        phoneE164: norm.e164,
        tenDigits: norm.tenDigits,
        error: trFirebase(
          'Using instant server OTP verification.',
          'सर्वर OTP सत्यापन का उपयोग किया जा रहा है।',
          'સર્વર OTP ચકાસણીનો ઉપયોગ કરવામાં આવી રહ્યો છે.'
        )
      };
    }

    const currentLang = (localStorage.getItem('locohelp_language') || 'GU').toLowerCase();
    authInstance.languageCode = currentLang === 'gu' ? 'gu' : currentLang === 'hi' ? 'hi' : 'en';

    clearRecaptchaVerifier(containerId);
    const containerEl = ensureRecaptchaContainerElement(containerId);

    activeRecaptchaVerifier = new RecaptchaVerifier(authInstance, containerEl, {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        clearRecaptchaVerifier(containerId);
      }
    });

    const confirmationResult = await signInWithPhoneNumber(
      authInstance,
      norm.e164,
      activeRecaptchaVerifier
    );

    activeConfirmationResult = confirmationResult;
    (window as any).__locohelpConfirmationResult = confirmationResult;

    return {
      success: true,
      phoneE164: norm.e164,
      tenDigits: norm.tenDigits
    };
  } catch (err: any) {
    console.warn('[Firebase Phone Auth] send OTP fallback notice:', err?.code || err?.message || err);
    clearRecaptchaVerifier(containerId);

    const code = String(err?.code || '');
    const msg = String(err?.message || '');
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

    if (code === 'auth/invalid-phone-number') {
      return {
        success: false,
        error: trFirebase(
          'Invalid mobile number. Please enter a valid 10-digit number.',
          'अमान्य मोबाइल नंबर! कृपया 10-अंकों का सही नंबर दर्ज करें।',
          'અમાન્ય મોબાઇલ નંબર! કૃપા કરીને 10-અંકનો સાચો નંબર દાખલ કરો.'
        )
      };
    }
    if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') {
      return {
        success: false,
        error: trFirebase(
          'Too many OTP requests for this number. Please try again later or sign in with Password/Email.',
          'इस नंबर पर बहुत अधिक बार OTP मांगा गया है। कृपया कुछ देर बाद प्रयास करें या पासवर्ड/ईमेल से लॉगिन करें।',
          'આ નંબર પર વધુ પડતી વાર OTP માંગવામાં આવ્યો છે. કૃપા કરીને થોડી વાર પછી પ્રયાસ કરો અથવા પાસવર્ડ/ઈમેલથી લોગિન કરો.'
        )
      };
    }
    if (
      code === 'auth/unauthorized-domain' ||
      code === 'auth/captcha-check-failed' ||
      msg.includes('captcha-check-failed') ||
      msg.includes('Hostname match not found')
    ) {
      return {
        success: false,
        error: trFirebase(
          `Domain "${currentHost}" is not added in Firebase Authorized Domains yet. Add "${currentHost}" in Firebase Console -> Authentication -> Settings -> Authorized domains, or test on www.locohelp.com.`,
          `यह डोमेन (${currentHost}) अभी Firebase के Authorized Domains में जोड़ा नहीं गया है। कृपया Firebase Console -> Authentication -> Settings -> Authorized domains में "${currentHost}" जोड़ें या www.locohelp.com पर चेक करें।`,
          `આ ડોમેન (${currentHost}) હજુ Firebase ના Authorized Domains માં ઉમેરાયું નથી. કૃપા કરીને Firebase Console -> Authentication -> Settings -> Authorized domains માં "${currentHost}" ઉમેરો અથવા www.locohelp.com પર ચકાસો.`
        )
      };
    }
    if (code === 'auth/operation-not-allowed') {
      return {
        success: false,
        error: trFirebase(
          'Phone Sign-In is not enabled in Firebase Console -> Authentication -> Sign-in method.',
          'Firebase में Phone Sign-In अभी चालू नहीं है।',
          'Firebase માં Phone Sign-In હજુ ચાલુ નથી.'
        )
      };
    }
    return {
      success: false,
      error: trFirebase(
        'Could not send SMS OTP right now. Please try again or use Email OTP / Password.',
        'मोबाइल पर OTP भेजने में समस्या आई। कृपया पुनः प्रयास करें या ईमेल OTP / पासवर्ड का उपयोग करें।',
        'મોબાઇલ પર OTP મોકલવામાં સમસ્યા આવી. કૃપા કરીને ફરી પ્રયાસ કરો અથવા ઈમેલ OTP / પાસવર્ડનો ઉપયોગ કરો.'
      )
    };
  }
}

export async function verifyFirebasePhoneOtpCode(otpCode: string): Promise<{
  success: boolean;
  idToken?: string;
  phoneNumber?: string;
  firebaseUid?: string;
  error?: string;
}> {
  const cleanCode = String(otpCode || '').trim();
  if (!cleanCode || cleanCode.length < 6) {
    return {
      success: false,
      error: trFirebase(
        'Please enter the 6-digit OTP code.',
        'कृपया 6-अंकों का OTP कोड दर्ज करें।',
        'કૃપા કરીને 6-અંકનો OTP કોડ દાખલ કરો.'
      )
    };
  }

  const confirmation: ConfirmationResult | null =
    activeConfirmationResult || (window as any).__locohelpConfirmationResult || null;

  if (!confirmation) {
    return {
      success: false,
      error: trFirebase(
        'OTP session expired. Please tap "Send OTP" again.',
        'OTP सेशन समाप्त हो गया है। कृपया दुबारा "OTP भेजें" दबाएं।',
        'OTP સેશન સમાપ્ત થઈ ગયું છે. કૃપા કરીને ફરીથી "OTP મોકલો" દબાવો.'
      )
    };
  }

  try {
    const credential = await confirmation.confirm(cleanCode);
    const user = credential.user;
    const idToken = await user.getIdToken();
    return {
      success: true,
      idToken,
      phoneNumber: user.phoneNumber || '',
      firebaseUid: user.uid
    };
  } catch (err: any) {
    console.warn('[Firebase Phone Auth] verify OTP notice:', err?.code || err?.message || err);
    const code = String(err?.code || '');
    if (code === 'auth/invalid-verification-code') {
      return {
        success: false,
        error: trFirebase(
          'Incorrect OTP code! Please enter the exact 6-digit code sent to your mobile.',
          'गलत OTP कोड! कृपया अपने SMS में आया सही 6-अंकों का कोड डालें।',
          'ખોટો OTP કોડ! કૃપા કરીને તમારા SMS માં આવેલો સાચો 6-અંકનો કોડ નાખો.'
        )
      };
    }
    if (code === 'auth/code-expired') {
      return {
        success: false,
        error: trFirebase(
          'This OTP code has expired. Please request a new OTP.',
          'यह OTP कोड समाप्त हो गया है। कृपया नया OTP मंगाएं।',
          'આ OTP કોડનો સમય પૂરો થઈ ગયો છે. કૃપા કરીને નવો OTP મંગાવો.'
        )
      };
    }
    return {
      success: false,
      error: trFirebase(
        'Failed to verify OTP code. Please check the code and try again.',
        'OTP सत्यापित करने में विफल। कृपया कोड जांचकर पुनः प्रयास करें।',
        'OTP ચકાસવામાં નિષ્ફળ. કૃપા કરીને કોડ તપાસીને ફરી પ્રયાસ કરો.'
      )
    };
  }
}




