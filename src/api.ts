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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  try {
    const token = localStorage.getItem('locohelp_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }

    const savedUserRaw = localStorage.getItem('locohelp_user');
    if (savedUserRaw) {
      try {
        const parsedUser = JSON.parse(savedUserRaw);
        if (parsedUser && parsedUser.uid && parsedUser.uid !== 'guest_user') {
          headers['x-user-id'] = String(parsedUser.uid);
        }
        if (parsedUser && parsedUser.email) {
          headers['x-user-email'] = String(parsedUser.email).toLowerCase();
        }
      } catch {}
    }
    if (!headers['x-user-email']) {
      const lastEmail = localStorage.getItem('locohelp_last_logged_in_email');
      if (lastEmail) {
        headers['x-user-email'] = lastEmail.toLowerCase();
        if (!headers['x-user-id']) {
          headers['x-user-id'] = lastEmail.toLowerCase();
        }
      }
    }

    const adminToken = sessionStorage.getItem('locohelp_admin_token') || localStorage.getItem('locohelp_admin_token');
    const isAdminLoggedIn =
      sessionStorage.getItem('locohelp_admin_logged_in') === 'true' ||
      localStorage.getItem('locohelp_admin_logged_in') === 'true';
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
      if (!headers['Authorization']) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
    }
    if (isAdminLoggedIn || adminToken) {
      headers['x-admin-email'] = 'baalvarta@gmail.com';
      if (!headers['x-user-id']) {
        headers['x-user-id'] = 'master_admin';
      }
      if (!headers['x-user-email']) {
        headers['x-user-email'] = 'baalvarta@gmail.com';
      }
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
 * Fetches messages for a chat / conversation from the central server (`messages` table via GET /api/messages/:conversationId).
 */
export async function fetchChatMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`/api/messages/${encodeURIComponent(conversationId)}?_t=${Date.now()}`, {
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
 * Sends a message in a chat conversation to sync across devices (`messages` table via POST /api/messages).
 */
export async function sendChatMessage(conversationId: string, msg: Partial<ChatMessage> & { receiverId?: string; authorName?: string; senderEmail?: string; authorAvatar?: string }): Promise<ChatMessage> {
  const senderIdVal = sanitizeText(msg.authorId || (msg as any).senderId || (msg as any).sender_id || 'guest');
  const senderNameVal = sanitizeText((msg as any).authorName || (msg as any).senderName || '');
  const senderEmailVal = sanitizeText((msg as any).senderEmail || (msg as any).authorEmail || (msg as any).sender_email || '');
  const senderAvatarVal = (msg as any).authorAvatar || (msg as any).senderAvatar || '';
  const payload = {
    id: msg.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    conversationId,
    intentId: conversationId,
    intent_id: conversationId,
    authorId: senderIdVal,
    senderId: senderIdVal,
    sender_id: senderIdVal,
    user_id: senderIdVal,
    authorName: senderNameVal,
    senderName: senderNameVal,
    sender_name: senderNameVal,
    senderEmail: senderEmailVal,
    authorEmail: senderEmailVal,
    sender_email: senderEmailVal,
    senderAvatar: senderAvatarVal,
    authorAvatar: senderAvatarVal,
    receiverId: sanitizeText((msg as any).receiverId || conversationId),
    receiver_id: sanitizeText((msg as any).receiverId || conversationId),
    text: sanitizeText(msg.text || ''),
    content: sanitizeText(msg.text || ''),
    message: sanitizeText(msg.text || ''),
    type: msg.type || 'text',
    attachmentUrl: msg.attachmentUrl || null,
    attachmentType: msg.attachmentType || null,
    createdAt: msg.createdAt || new Date().toISOString()
  };

  try {
    const res = await fetch(`/api/messages?_t=${Date.now()}`, {
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
          if (a && a.id && !deletedIds.includes(a.id)) {
            const srv = mergedMap.get(a.id);
            mergedMap.set(a.id, srv ? { ...srv, ...a } : a);
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
  let deletedIds: string[] = [];
  try {
    const delRaw = localStorage.getItem('locohelp_deleted_jobs');
    if (delRaw) deletedIds = JSON.parse(delRaw);
  } catch {}

  let cachedItems: JobPortalItem[] = [];
  try {
    const cached = localStorage.getItem('locohelp_live_jobs_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        cachedItems = parsed.filter(i => i && i.id && !deletedIds.includes(String(i.id)));
      }
    }
  } catch {}

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
        const serverIds = new Set<string>();
        const map = new Map<string, JobPortalItem>();

        cachedItems.forEach(item => map.set(String(item.id), item));
        items.forEach(item => {
          if (item && item.id && !deletedIds.includes(String(item.id))) {
            serverIds.add(String(item.id));
            map.set(String(item.id), { ...(map.get(String(item.id)) || {}), ...item });
          }
        });

        const merged = Array.from(map.values());
        if (!params?.type || params.type === 'all') {
          try {
            localStorage.setItem('locohelp_live_jobs_cache', JSON.stringify(merged));
          } catch (e) {}
        }

        // Auto-recover any cached job portal items missing on server after container restart
        const missingOnServer = cachedItems.filter(i => i && i.id && !serverIds.has(String(i.id)));
        if (missingOnServer.length > 0) {
          missingOnServer.forEach(jobItem => {
            fetch('/api/job-portal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify(jobItem)
            }).catch(() => {});
          });
        }

        let filtered = merged;
        if (params?.status && params.status !== 'all') {
          filtered = filtered.filter(i => (i.status || 'approved') === params.status);
        } else if (!params?.status) {
          filtered = filtered.filter(i => !i.status || i.status === 'approved');
        }
        if (params?.type && params.type !== 'all') {
          filtered = filtered.filter(i => i.type === params.type);
        }
        return filtered;
      }
    }
  } catch (err) {
    console.warn("Job portal fetch notice (falling back to cache):", err);
  }

  let filtered = cachedItems;
  if (params?.status && params.status !== 'all') {
    filtered = filtered.filter(i => (i.status || 'approved') === params.status);
  } else if (!params?.status) {
    filtered = filtered.filter(i => !i.status || i.status === 'approved');
  }
  if (params?.type && params.type !== 'all') {
    filtered = filtered.filter(i => i.type === params.type);
  }
  return filtered;
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
    const delRaw = localStorage.getItem('locohelp_deleted_jobs');
    const deletedIds: string[] = delRaw ? JSON.parse(delRaw) : [];
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('locohelp_deleted_jobs', JSON.stringify(deletedIds));
    }
    const cached = localStorage.getItem('locohelp_live_jobs_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        localStorage.setItem('locohelp_live_jobs_cache', JSON.stringify(parsed.filter((i: any) => i.id !== id)));
      }
    }
  } catch {}

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
    const delRaw = localStorage.getItem('locohelp_deleted_helpers');
    const deletedIds: string[] = delRaw ? JSON.parse(delRaw) : [];
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('locohelp_deleted_helpers', JSON.stringify(deletedIds));
    }
  } catch {}

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
    const delRaw = localStorage.getItem('locohelp_deleted_shops');
    const deletedIds: string[] = delRaw ? JSON.parse(delRaw) : [];
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('locohelp_deleted_shops', JSON.stringify(deletedIds));
    }
  } catch {}

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
  let deletedCats: string[] = [];
  try {
    const delRaw = localStorage.getItem('locohelp_deleted_category_images');
    if (delRaw) deletedCats = JSON.parse(delRaw);
  } catch {}

  try {
    const res = await fetch(`/api/category-images?_t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.images && typeof data.images === 'object') {
        const cleanImages: Record<string, string> = {};
        Object.entries(data.images as Record<string, string>).forEach(([k, v]) => {
          if (v && typeof v === 'string' && !deletedCats.includes(k)) {
            cleanImages[k] = v;
          }
        });
        try {
          localStorage.setItem('locohelp_category_images', JSON.stringify(cleanImages));
        } catch {}
        return cleanImages;
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
    const delRaw = localStorage.getItem('locohelp_deleted_category_images');
    if (delRaw) {
      const delList: string[] = JSON.parse(delRaw).filter((c: string) => c !== categoryId);
      localStorage.setItem('locohelp_deleted_category_images', JSON.stringify(delList));
    }
  } catch {}

  try {
    // Also persist directly to PUT /api/categories/:id in PostgreSQL categories table
    fetch(`/api/categories/${encodeURIComponent(categoryId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ categoryId, image_url: imageUrl, imageUrl })
    }).catch(() => {});

    const res = await fetch('/api/category-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ categoryId, imageUrl })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to save category image' };
    }
    const merged = { ...getCachedCategoryImages(), ...(data.images || {}), [categoryId]: imageUrl };
    try {
      localStorage.setItem('locohelp_category_images', JSON.stringify(merged));
      window.dispatchEvent(new Event('locohelp_category_images_updated'));
    } catch {}
    return { success: true, images: merged };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error while saving category image' };
  }
}

export async function deleteCategoryImageOnServer(
  categoryId: string
): Promise<{ success: boolean; images?: Record<string, string>; error?: string }> {
  try {
    const delRaw = localStorage.getItem('locohelp_deleted_category_images');
    const delList: string[] = delRaw ? JSON.parse(delRaw) : [];
    if (!delList.includes(categoryId)) {
      delList.push(categoryId);
      localStorage.setItem('locohelp_deleted_category_images', JSON.stringify(delList));
    }
    const current = getCachedCategoryImages();
    delete current[categoryId];
    localStorage.setItem('locohelp_category_images', JSON.stringify(current));
  } catch {}

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
        window.dispatchEvent(new Event('locohelp_category_images_updated'));
      } catch {}
    }
    return { success: true, images: getCachedCategoryImages() };
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

// ==========================================
// AUTO-MIGRATE BROWSER LOCALSTORAGE TO POSTGRESQL
// ==========================================
export async function syncBrowserDataToPostgres(): Promise<void> {
  try {
    const users: any[] = [];
    const profiles: any[] = [];
    let categories: Record<string, string> = {};
    let businesses: any[] = [];
    let ads: any[] = [];
    let posts: any[] = [];

    try {
      const uRaw = localStorage.getItem('locohelp_user');
      if (uRaw) {
        const u = JSON.parse(uRaw);
        if (u && (u.uid || u.id || u.email)) {
          users.push(u);
        }
      }
    } catch {}

    try {
      const catRaw = localStorage.getItem('locohelp_category_images');
      if (catRaw) {
        categories = JSON.parse(catRaw) || {};
      }
    } catch {}

    try {
      const helpersRaw = localStorage.getItem('locohelp_free_helper_profiles');
      if (helpersRaw) {
        const parsed = JSON.parse(helpersRaw);
        if (Array.isArray(parsed)) profiles.push(...parsed);
      }
      const myHelperRaw = localStorage.getItem('locohelp_my_helper_profile');
      if (myHelperRaw) {
        const mh = JSON.parse(myHelperRaw);
        if (mh && mh.id && !profiles.some(p => p && p.id === mh.id)) {
          profiles.push(mh);
        }
      }
    } catch {}

    try {
      const shopsRaw = localStorage.getItem('locohelp_registered_shops');
      if (shopsRaw) {
        const parsed = JSON.parse(shopsRaw);
        if (Array.isArray(parsed)) businesses = parsed;
      }
    } catch {}

    try {
      const adsRaw = localStorage.getItem('locohelp_ad_banners');
      if (adsRaw) {
        const parsed = JSON.parse(adsRaw);
        if (Array.isArray(parsed)) ads = parsed;
      }
    } catch {}

    try {
      const postsRaw = localStorage.getItem('locohelp_custom_intents');
      if (postsRaw) {
        const parsed = JSON.parse(postsRaw);
        if (Array.isArray(parsed)) posts = parsed;
      }
    } catch {}

    // Always call /api/sync-browser-data on app load so ensureTablesExist() runs on the server
    await fetch('/api/sync-browser-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        user: users[0] || null,
        users,
        categories,
        categoryImages: categories,
        profiles,
        helpers: profiles,
        businesses,
        shops: businesses,
        ads,
        posts
      })
    });
  } catch (e) {
    // Non-blocking background sync
  }
}

// ==========================================
// ADMIN POSTGRESQL SYNC & REPAIR + DB BACKUP & RESTORE
// ==========================================
export async function initAndRepairPostgresDatabaseOnServer(): Promise<{
  success: boolean;
  postgresConnected?: boolean;
  tables?: string[];
  tableCounts?: Record<string, number>;
  message?: string;
  error?: string;
}> {
  try {
    await syncBrowserDataToPostgres();
    const res = await fetch('/api/admin/init-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        postgresConnected: Boolean(data.postgresConnected),
        error: data.error || 'Failed to sync & repair PostgreSQL tables'
      };
    }
    return {
      success: true,
      postgresConnected: Boolean(data.postgresConnected),
      tables: Array.isArray(data.tables) ? data.tables : [],
      tableCounts: data.tableCounts || {},
      message: data.message || '✅ PostgreSQL Tables Initialized & Synced: categories, profiles, users, shops, ads, posts'
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message || 'Network error while syncing PostgreSQL tables'
    };
  }
}

export async function downloadDatabaseBackupFromServer(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/admin/db-backup', {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to download DB backup' };
    }
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error while downloading DB backup' };
  }
}

export async function restoreDatabaseBackupOnServer(backupPayload: any): Promise<{ success: boolean; restoredCount?: number; error?: string }> {
  try {
    const res = await fetch('/api/admin/db-restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(backupPayload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to restore DB backup' };
    }
    return { success: true, restoredCount: data.restoredCount };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error while restoring DB backup' };
  }
}

// ==========================================
// PUBLIC SUGGESTIONS BOARD API
// ==========================================
export interface PublicSuggestion {
  id: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  content: string;
  likesCount: number;
  createdAt: string;
}

export async function fetchPublicSuggestions(): Promise<PublicSuggestion[]> {
  try {
    const res = await fetch(`/api/suggestions?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}
  return [];
}

export async function submitPublicSuggestion(
  content: string,
  userName?: string,
  userEmail?: string,
  userAvatar?: string
): Promise<{ success: boolean; suggestion?: PublicSuggestion; error?: string }> {
  try {
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ content, userName, userEmail, userAvatar })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, suggestion: data.suggestion };
    }
    return { success: false, error: data.error || 'Failed to submit suggestion' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error submitting suggestion' };
  }
}

export async function likePublicSuggestion(
  id: string
): Promise<{ success: boolean; likesCount?: number }> {
  try {
    const res = await fetch(`/api/suggestions/${encodeURIComponent(id)}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return { success: res.ok && data.success, likesCount: data.likesCount };
  } catch (e) {
    return { success: false };
  }
}

export async function deletePublicSuggestionOnServer(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/suggestions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return { success: res.ok && data.success, error: data.error };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error deleting suggestion' };
  }
}

export async function fetchSiteLockStatus(): Promise<{ isLocked: boolean }> {
  try {
    const res = await fetch(`/api/site-lock/status?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return { isLocked: Boolean(data.isLocked) };
    }
  } catch (e) {}
  return { isLocked: true };
}

export async function verifySiteLockPin(pin: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/site-lock/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Incorrect PIN' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error while verifying PIN' };
  }
}

export async function fetchAdminSiteLock(): Promise<{ isLocked: boolean; accessPin: string }> {
  try {
    const res = await fetch('/api/admin/site-lock', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      return { isLocked: Boolean(data.isLocked), accessPin: String(data.accessPin || '1540') };
    }
  } catch (e) {}
  return { isLocked: true, accessPin: '1540' };
}

export async function updateAdminSiteLock(
  isLocked: boolean,
  accessPin: string
): Promise<{ success: boolean; isLocked?: boolean; accessPin?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/site-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ isLocked, accessPin })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, isLocked: data.isLocked, accessPin: data.accessPin };
    }
    return { success: false, error: data.error || 'Failed to update site lock' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}



