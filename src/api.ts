import { Intent, JobPortalItem } from './types';
import {
  sanitizePayload,
  sanitizeText,
  getPostCooldownRemainingSeconds,
  recordPostCreatedTimestamp,
  getOtpCooldownRemainingSeconds,
  recordOtpSentTimestamp
} from './lib/security';

export interface ChatMessage {
  id: string;
  authorId: string;
  text: string;
  type?: 'text' | 'pin' | 'identity_request' | 'identity_shared' | 'attachment' | 'task_completed';
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  createdAt: string;
}

/**
 * Helper to retrieve session authentication headers (including Admin authorization when logged into Admin panel)
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const token = localStorage.getItem('locohelp_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
    const adminToken = sessionStorage.getItem('locohelp_admin_token') || localStorage.getItem('locohelp_admin_token');
    const isAdminLoggedIn = sessionStorage.getItem('locohelp_admin_logged_in') === 'true';
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
      if (!headers['Authorization']) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
    }
    if (isAdminLoggedIn) {
      headers['x-admin-email'] = 'baalvarta@gmail.com';
    }
  } catch (e) {}
  return headers;
}

/**
 * Authenticates Admin with backend using Strict 2-Step Security (Step 1: Password -> Step 2: 6-Digit Email OTP sent to baalvarta@gmail.com)
 */
export async function loginAdminOnServer(
  password: string,
  otpCode?: string
): Promise<{
  success: boolean;
  token?: string;
  requiresOtp?: boolean;
  adminEmail?: string;
  devOtp?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, otpCode })
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      try {
        sessionStorage.setItem('locohelp_admin_token', data.token);
        localStorage.setItem('locohelp_admin_token', data.token);
      } catch (e) {}
      return { success: true, token: data.token };
    }
    return {
      success: false,
      requiresOtp: Boolean(data.requiresOtp),
      adminEmail: data.adminEmail || 'baalvarta@gmail.com',
      devOtp: data.devOtp,
      message: data.message,
      error: data.error || 'Admin authentication failed'
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error during admin login' };
  }
}

export const authenticateAdminOnServer = loginAdminOnServer;

/**
 * Sends a 6-digit Forgot Admin Password OTP strictly to baalvarta@gmail.com
 */
export async function sendAdminForgotPasswordOtpOnServer(): Promise<{
  success: boolean;
  adminEmail?: string;
  devOtp?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/forgot-password/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        adminEmail: data.adminEmail || 'baalvarta@gmail.com',
        devOtp: data.devOtp,
        message: data.message
      };
    }
    return { success: false, error: data.error || 'Failed to send Admin reset OTP' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error sending Admin OTP' };
  }
}

/**
 * Verifies the 6-digit OTP sent to baalvarta@gmail.com and resets the Master Admin Password
 */
export async function resetAdminPasswordWithOtpOnServer(
  otpCode: string,
  newPassword: string
): Promise<{
  success: boolean;
  token?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otpCode, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      try {
        sessionStorage.setItem('locohelp_admin_token', data.token);
        localStorage.setItem('locohelp_admin_token', data.token);
      } catch (e) {}
      return { success: true, token: data.token, message: data.message };
    }
    return { success: false, error: data.error || 'Failed to reset Admin password' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error resetting Admin password' };
  }
}

/**
 * Updates Admin password from inside the authenticated Admin Dashboard
 */
export async function changeAdminPasswordOnServer(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'Failed to change Admin password' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error changing Admin password' };
  }
}

/**
 * Fetches all active community broadcast intents from the server.
 * Merges with local storage to support instantaneous offline browsing.
 */
export async function fetchLiveIntents(): Promise<Intent[]> {
  try {
    const res = await fetch(`/api/intents?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...getAuthHeaders()
      }
    });
    if (res.ok) {
      const serverIntents: Intent[] = await res.json();
      if (Array.isArray(serverIntents)) {
        try {
          localStorage.setItem('locohelp_cached_intents', JSON.stringify(serverIntents));
        } catch (e) {}
        return serverIntents;
      }
    }
  } catch (err) {
    console.warn("Server fetch intents fallback to local storage:", err);
  }

  try {
    const cached = localStorage.getItem('locohelp_cached_intents') || localStorage.getItem('locohelp_custom_intents');
    if (cached) {
      const list: Intent[] = JSON.parse(cached);
      return list.filter(i => !i.id.startsWith('seed_') && !i.id.startsWith('sample_'));
    }
  } catch (e) {}

  return [];
}

/**
 * Broadcasts a new intent to all phones via central server (with XSS sanitization & 30s anti-spam cooldown).
 */
export async function broadcastIntentToServer(intent: Intent): Promise<Intent> {
  const cleanIntent = sanitizePayload(intent);

  const cooldownRem = getPostCooldownRemainingSeconds();
  if (cooldownRem > 0) {
    throw new Error(`Please wait ${cooldownRem} seconds before creating another post (30s anti-spam cooldown).`);
  }

  // Always save locally first so user never loses their post
  try {
    const stored = localStorage.getItem('locohelp_custom_intents');
    const existing: Intent[] = stored ? JSON.parse(stored) : [];
    localStorage.setItem('locohelp_custom_intents', JSON.stringify([cleanIntent, ...existing.slice(0, 50)]));
  } catch (e) {}

  try {
    const res = await fetch(`/api/intents?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      },
      body: JSON.stringify(cleanIntent)
    });

    if (res.status === 429) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Rate limit: Please wait 30 seconds before posting again.');
    }

    if (res.ok) {
      recordPostCreatedTimestamp();
      const saved = await res.json();
      return saved;
    }
  } catch (err: any) {
    if (err?.message && err.message.includes('wait')) {
      throw err;
    }
    console.warn("Failed to broadcast to server (operating offline):", err);
  }

  recordPostCreatedTimestamp();
  return cleanIntent;
}

/**
 * Deletes or completes an intent on server permanently (Protected: Owner or Admin only)
 */
export async function deleteIntentOnServer(id: string, description?: string): Promise<boolean> {
  try {
    const cleanDesc = description ? sanitizeText(description) : undefined;
    const url = `/api/intents/${encodeURIComponent(id)}?_t=${Date.now()}${cleanDesc ? `&desc=${encodeURIComponent(cleanDesc)}` : ''}`;
    const res = await fetch(url, { 
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ description: cleanDesc })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Fetches messages for a chat / intent from the central server (Authorized participants only).
 */
export async function fetchChatMessages(intentId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`/api/intents/${encodeURIComponent(intentId)}/messages?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...getAuthHeaders()
      }
    });
    if (res.ok) {
      const msgs = await res.json();
      return Array.isArray(msgs) ? msgs : [];
    }
  } catch (err) {
    console.warn("Failed to fetch messages from server:", err);
  }
  return [];
}

/**
 * Sends a message in an intent chat to sync with the other phone (XSS sanitized).
 */
export async function sendChatMessage(intentId: string, msg: Partial<ChatMessage>): Promise<ChatMessage> {
  const payload = {
    id: msg.id || 'msg_' + Date.now(),
    authorId: sanitizeText(msg.authorId || 'guest'),
    text: sanitizeText(msg.text || ''),
    type: msg.type || 'text',
    attachmentUrl: msg.attachmentUrl || null,
    attachmentType: msg.attachmentType || null,
    createdAt: msg.createdAt || new Date().toISOString()
  };

  try {
    const res = await fetch(`/api/intents/${encodeURIComponent(intentId)}/messages?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Failed to send message to server:", err);
  }

  return payload as ChatMessage;
}

/**
 * Posts safety & legal audit logs to the backend
 */
export async function logAuditRecord(auditPayload: any): Promise<void> {
  try {
    await fetch('/api/audit-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(sanitizePayload(auditPayload))
    });
  } catch (e) {
    console.warn("Audit log save note:", e);
  }
}

/**
 * Fetches all active ad banners from server with offline cache fallback (merges safely so added ads are never wiped)
 */
export async function fetchLiveAds(): Promise<any[]> {
  let deletedIds: string[] = [];
  try {
    const delRaw = localStorage.getItem('locohelp_deleted_ads');
    if (delRaw) deletedIds = JSON.parse(delRaw);
  } catch (e) {}

  let localAds: any[] = [];
  try {
    const stored = localStorage.getItem('locohelp_ad_banners');
    if (stored) {
      localAds = JSON.parse(stored).filter(
        (a: any) =>
          a &&
          a.id &&
          !deletedIds.includes(a.id) &&
          !a.id.startsWith('ad_elec_') &&
          !a.id.startsWith('ad_grocery_') &&
          !a.id.startsWith('ad_auto_')
      );
    }
  } catch (e) {}

  try {
    const res = await fetch(`/api/ads?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...getAuthHeaders()
      }
    });
    if (res.ok) {
      const serverAds = await res.json();
      if (Array.isArray(serverAds)) {
        const mergedMap = new Map<string, any>();
        serverAds.forEach((a: any) => {
          if (a && a.id && !deletedIds.includes(a.id)) {
            mergedMap.set(a.id, a);
          }
        });
        localAds.forEach((a: any) => {
          if (a && a.id && !deletedIds.includes(a.id) && !mergedMap.has(a.id)) {
            mergedMap.set(a.id, a);
          }
        });
        const merged = Array.from(mergedMap.values());
        try {
          localStorage.setItem('locohelp_ad_banners', JSON.stringify(merged));
        } catch (e) {}
        return merged;
      }
    }
  } catch (err) {
    console.warn("Server fetch ads fallback to local storage:", err);
  }

  return localAds;
}

/**
 * Creates or updates an ad banner on server
 */
export async function createAdOnServer(ad: any): Promise<any> {
  const cleanAd = sanitizePayload(ad);
  try {
    const stored = localStorage.getItem('locohelp_ad_banners');
    const existing = stored ? JSON.parse(stored) : [];
    const updated = [cleanAd, ...existing.filter((a: any) => a && a.id !== cleanAd.id)];
    localStorage.setItem('locohelp_ad_banners', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('locohelp_ads_updated'));
  } catch (e) {}

  try {
    const res = await fetch(`/api/ads?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      },
      body: JSON.stringify(cleanAd)
    });
    if (res.ok) {
      const saved = await res.json();
      window.dispatchEvent(new Event('locohelp_ads_updated'));
      return saved;
    }
  } catch (err) {
    console.warn("Failed to save ad to server (offline mode):", err);
  }
  return cleanAd;
}

/**
 * Deletes an ad banner from server (Admin Protected)
 */
export async function deleteAdOnServer(id: string): Promise<boolean> {
  // Never allow deleting the permanent LocoHelp official promo banner
  if (id === 'locohelp_official_promo_banner') return false;

  try {
    const delRaw = localStorage.getItem('locohelp_deleted_ads');
    const deletedIds: string[] = delRaw ? JSON.parse(delRaw) : [];
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('locohelp_deleted_ads', JSON.stringify(deletedIds));
    }

    const stored = localStorage.getItem('locohelp_ad_banners');
    if (stored) {
      const existing = JSON.parse(stored);
      const filtered = existing.filter((a: any) => a.id !== id);
      localStorage.setItem('locohelp_ad_banners', JSON.stringify(filtered));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('locohelp_ads_updated'));
    }
  } catch (e) {}

  try {
    const res = await fetch(`/api/ads/${encodeURIComponent(id)}?_t=${Date.now()}`, {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Sends OTP to Mobile or Email (with 60s resend cooldown)
 */
export async function sendAuthOtp(identifier: string, type: 'mobile' | 'email'): Promise<{ 
  success: boolean; 
  message?: string; 
  whatsappUrl?: string; 
  devCode?: string;
  emailSent?: boolean;
  cooldownRemaining?: number;
  error?: string; 
}> {
  const cleanId = sanitizeText(identifier).toLowerCase();
  const rem = getOtpCooldownRemainingSeconds(cleanId);
  if (rem > 0) {
    return {
      success: false,
      cooldownRemaining: rem,
      error: `Please wait ${rem} seconds before resending OTP (60s anti-spam cooldown).`
    };
  }

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanId, type })
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        cooldownRemaining: data.cooldownRemaining,
        error: data.error || 'Failed to send OTP'
      };
    }
    recordOtpSentTimestamp(cleanId);
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error while sending OTP' };
  }
}

/**
 * Verifies OTP on Server
 */
export async function verifyAuthOtp(identifier: string, code: string, type: 'mobile' | 'email'): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: sanitizeText(identifier).toLowerCase(),
        code: sanitizeText(code),
        type
      })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Invalid OTP' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error while verifying OTP' };
  }
}

// ==========================================
// JOB PORTAL (SEEKER & EMPLOYER) CLIENT API
// ==========================================

export async function fetchJobPortalItems(params?: {
  status?: 'approved' | 'pending' | 'rejected' | 'all';
  type?: 'job_seeker' | 'employer_vacancy' | 'all';
  search?: string;
}): Promise<JobPortalItem[]> {
  try {
    const query = new URLSearchParams();
    query.set('_t', Date.now().toString());
    if (params?.status) query.set('status', params.status);
    if (params?.type && params.type !== 'all') query.set('type', params.type);
    if (params?.search) query.set('search', sanitizeText(params.search));

    const res = await fetch(`/api/job-portal?${query.toString()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...getAuthHeaders()
      }
    });

    if (res.ok) {
      const items: JobPortalItem[] = await res.json();
      if (Array.isArray(items)) {
        if (!params?.type || params.type === 'all') {
          try {
            localStorage.setItem('locohelp_live_jobs_cache', JSON.stringify(items));
          } catch (e) {}
        }
        let filtered = items;
        if (params?.type && params.type !== 'all') {
          filtered = filtered.filter(i => i.type === params.type);
        }
        return filtered;
      }
    }
  } catch (err) {
    console.warn("Job portal fetch notice (falling back to cache):", err);
  }

  try {
    const cached = localStorage.getItem('locohelp_live_jobs_cache');
    if (cached) {
      const parsed: JobPortalItem[] = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        let filtered = parsed;
        if (params?.type && params.type !== 'all') {
          filtered = filtered.filter(i => i.type === params.type);
        }
        return filtered;
      }
    }
  } catch (e) {}

  return [];
}

/**
 * Submits a new Job Seeker profile or Employer job vacancy (XSS sanitized).
 * Always saves with status: "pending" on the server.
 */
export async function submitJobPortalItem(item: Partial<JobPortalItem>): Promise<{
  success: boolean;
  item?: JobPortalItem;
  message?: string;
  error?: string;
}> {
  try {
    const cleanItem = sanitizePayload(item);
    const res = await fetch(`/api/job-portal?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      },
      body: JSON.stringify(cleanItem)
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Submission failed' };
    }

    return {
      success: true,
      item: data.item,
      message: data.message || "Your submission has been received and is pending admin approval. It will appear live once verified."
    };
  } catch (err: any) {
    console.error("Job portal submit error:", err);
    return {
      success: false,
      error: err.message || 'Network error while submitting to job portal'
    };
  }
}

/**
 * Updates status of a Job Portal entry (Approve or Reject in Admin Panel - Admin Protected).
 */
export async function updateJobPortalStatus(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  adminNotes?: string
): Promise<{ success: boolean; item?: JobPortalItem; error?: string }> {
  try {
    const res = await fetch(`/api/job-portal/${encodeURIComponent(id)}/status?_t=${Date.now()}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ status, adminNotes: adminNotes ? sanitizeText(adminNotes) : undefined })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to update status' };
    }

    return { success: true, item: data.item };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error while updating status' };
  }
}

/**
 * Deletes a Job Portal entry permanently (Admin Protected).
 */
export async function deleteJobPortalItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/job-portal/${encodeURIComponent(id)}?_t=${Date.now()}`, {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Purges all sample/dummy seed data from server (Admin Protected).
 */
export async function purgeDummyDataOnServer(): Promise<{ success: boolean; message?: string; counts?: any }> {
  try {
    const res = await fetch(`/api/admin/clear-dummy-data?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      }
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to purge dummy data' };
  }
}

/**
 * Completely resets database to empty state (Admin Protected).
 */
export async function resetDatabaseOnServer(): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/admin/reset-database?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      }
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to reset database' };
  }
}

// ==========================================
// IDENTITY VERIFICATION & WATERMARKED DOCS API
// ==========================================

export interface VerificationRequestItem {
  id: string;
  entityType: 'user_profile' | 'business';
  entityId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  title: string;
  area?: string;
  category?: string;
  idDocumentType?: string;
  idDocumentWatermarked?: string; // Only present in Admin API
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  adminNotes?: string;
}

export type AdminVerificationItem = VerificationRequestItem;
export type JobPortalSubmission = JobPortalItem;
export type AdBannerItem = any;

/**
 * Submits an identity document with auto-watermark for verification
 */
export async function submitVerification(payload: {
  entityType: 'user_profile' | 'business';
  entityId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  title?: string;
  idDocumentWatermarked?: string;
}): Promise<{ success: boolean; message?: string; verificationId?: string; error?: string }> {
  try {
    const cleanPayload = sanitizePayload(payload);
    const res = await fetch('/api/verifications', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(cleanPayload)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to submit verification' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error while submitting verification' };
  }
}

/**
 * Public status check - Returns only verification status, strictly preserving document privacy
 */
export async function getVerificationStatus(entityId: string): Promise<{ status: string; isVerified: boolean }> {
  try {
    const res = await fetch(`/api/verifications/status/${encodeURIComponent(entityId)}?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}
  return { status: 'none', isVerified: false };
}

/**
 * Admin-Only: Fetches verification queue with watermarked documents
 */
export async function fetchAdminVerifications(): Promise<VerificationRequestItem[]> {
  try {
    const res = await fetch(`/api/admin/verifications?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn("Error fetching admin verifications:", e);
  }
  return [];
}

/**
 * Admin-Only: Approves or Rejects verification submission
 */
export async function updateAdminVerificationStatus(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  adminNotes?: string
): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    const res = await fetch(`/api/admin/verifications/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ status, adminNotes: adminNotes ? sanitizeText(adminNotes) : undefined })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to update status' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating verification status' };
  }
}

// ==========================================
// DEDICATED ADMIN CRUD HELPERS FOR ALL 7 MODULES
// ==========================================

export async function updateAdminIntentOnServer(
  id: string,
  updates: Record<string, any>
): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    const res = await fetch(`/api/admin/intents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(sanitizePayload(updates))
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Failed to update help post' };
    return { success: true, item: data.item };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

export async function updateAdminHelperOnServer(
  id: string,
  updates: Record<string, any>
): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    const res = await fetch(`/api/admin/helpers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(sanitizePayload(updates))
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Failed to update helper profile' };
    return { success: true, item: data.item };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

export async function deleteAdminHelperOnServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/helpers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function fetchAdminUserProfiles(): Promise<any[]> {
  try {
    const res = await fetch(`/api/admin/profiles?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {}
  return [];
}

export async function updateAdminUserProfileOnServer(
  uid: string,
  updates: Record<string, any>
): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    const res = await fetch(`/api/admin/profiles/${encodeURIComponent(uid)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(sanitizePayload(updates))
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Failed to update user profile' };
    return { success: true, item: data.item };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

export async function deleteAdminUserProfileOnServer(uid: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/profiles/${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function updateAdminShopOnServer(
  id: string,
  updates: Record<string, any>
): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    const res = await fetch(`/api/admin/shops/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(sanitizePayload(updates))
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Failed to update shop' };
    return { success: true, item: data.item };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

export async function deleteAdminShopOnServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/shops/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function updateAdminJobPortalItemOnServer(
  id: string,
  updates: Record<string, any>
): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    const res = await fetch(`/api/admin/job-portal/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(sanitizePayload(updates))
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Failed to update job portal item' };
    return { success: true, item: data.item };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

export async function fetchAdminReportsOnServer(): Promise<any[]> {
  try {
    const res = await fetch(`/api/reports?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {}
  return [];
}

export async function updateAdminReportOnServer(
  id: string,
  updates: Record<string, any>
): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    const res = await fetch(`/api/admin/reports/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(sanitizePayload(updates))
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Failed to update feedback/report' };
    return { success: true, item: data.item };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

export async function deleteAdminReportOnServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/reports/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export const fetchAdminUsersOnServer = fetchAdminUserProfiles;
export const updateAdminUserOnServer = updateAdminUserProfileOnServer;
export const deleteAdminUserOnServer = deleteAdminUserProfileOnServer;
export const updateAdminBusinessOnServer = updateAdminShopOnServer;
export const deleteAdminBusinessOnServer = deleteAdminShopOnServer;
export const updateAdminJobPortalOnServer = updateAdminJobPortalItemOnServer;

// ==========================================
// CATEGORY 16:9 CUSTOM IMAGES (Admin Add / Edit / Delete)
// ==========================================
export function getCachedCategoryImages(): Record<string, string> {
  try {
    const raw = localStorage.getItem('locohelp_category_images');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function fetchCategoryImages(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`/api/category-images?_t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.images && typeof data.images === 'object') {
        try {
          localStorage.setItem('locohelp_category_images', JSON.stringify(data.images));
        } catch {}
        return data.images;
      }
    }
  } catch (e) {}
  return getCachedCategoryImages();
}

export async function saveCategoryImageOnServer(
  categoryId: string,
  imageUrl: string
): Promise<{ success: boolean; images?: Record<string, string>; error?: string }> {
  try {
    const res = await fetch('/api/category-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ categoryId, imageUrl })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to save category image' };
    }
    if (data.images) {
      try {
        localStorage.setItem('locohelp_category_images', JSON.stringify(data.images));
      } catch {}
    }
    return { success: true, images: data.images };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error while saving category image' };
  }
}

export async function deleteCategoryImageOnServer(
  categoryId: string
): Promise<{ success: boolean; images?: Record<string, string>; error?: string }> {
  try {
    const res = await fetch(`/api/category-images/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to delete category image' };
    }
    if (data.images) {
      try {
        localStorage.setItem('locohelp_category_images', JSON.stringify(data.images));
      } catch {}
    }
    return { success: true, images: data.images };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error while deleting category image' };
  }
}

export interface SecurityVaultRecord {
  vaultKey: string;
  entityType: string;
  recordId: string;
  actionStatus: string;
  firstRegisteredAt: string;
  lastUpdatedAt: string;
  deletedAt: string | null;
  isDeletedFromPublic: boolean;
  name: string;
  phone: string;
  email: string;
  area: string;
  category: string;
  idDocumentWatermarked: string;
  photoUrl: string;
  latestSnapshot: Record<string, any>;
  originalRegistrationSnapshot: Record<string, any>;
  history: Array<{
    timestamp: string;
    action: string;
    snapshotSummary?: {
      name?: string;
      phone?: string;
      email?: string;
      area?: string;
    };
  }>;
}

export async function fetchAdminSecurityVault(): Promise<SecurityVaultRecord[]> {
  try {
    const res = await fetch('/api/admin/security-vault', {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.records) ? data.records : [];
  } catch (e) {
    return [];
  }
}

