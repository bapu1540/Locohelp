import { Intent, JobPortalItem } from './types';

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
 * Helper to retrieve session authentication headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const token = localStorage.getItem('locohelp_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
  } catch (e) {}
  return headers;
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
        'Pragma': 'no-cache'
      }
    });
    if (res.ok) {
      const serverIntents: Intent[] = await res.json();
      if (Array.isArray(serverIntents)) {
        // Cache to localStorage for instant offline access
        try {
          localStorage.setItem('locohelp_cached_intents', JSON.stringify(serverIntents));
        } catch (e) {}
        return serverIntents;
      }
    }
  } catch (err) {
    console.warn("Server fetch intents fallback to local storage:", err);
  }

  // Fallback to local cache if network is offline
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
 * Broadcasts a new intent to all phones via central server.
 */
export async function broadcastIntentToServer(intent: Intent): Promise<Intent> {
  // Always save locally first so user never loses their post
  try {
    const stored = localStorage.getItem('locohelp_custom_intents');
    const existing: Intent[] = stored ? JSON.parse(stored) : [];
    localStorage.setItem('locohelp_custom_intents', JSON.stringify([intent, ...existing.slice(0, 50)]));
  } catch (e) {}

  try {
    const res = await fetch(`/api/intents?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      },
      body: JSON.stringify(intent)
    });

    if (res.ok) {
      const saved = await res.json();
      return saved;
    }
  } catch (err) {
    console.warn("Failed to broadcast to server (operating offline):", err);
  }

  return intent;
}

/**
 * Deletes or completes an intent on server permanently
 */
export async function deleteIntentOnServer(id: string, description?: string): Promise<boolean> {
  try {
    const url = `/api/intents/${id}?_t=${Date.now()}${description ? `&desc=${encodeURIComponent(description)}` : ''}`;
    const res = await fetch(url, { 
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ description })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Fetches messages for a chat / intent from the central server.
 */
export async function fetchChatMessages(intentId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`/api/intents/${intentId}/messages?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (res.ok) {
      const msgs = await res.json();
      return msgs;
    }
  } catch (err) {
    console.warn("Failed to fetch messages from server:", err);
  }
  return [];
}

/**
 * Sends a message in an intent chat to sync with the other phone.
 */
export async function sendChatMessage(intentId: string, msg: Partial<ChatMessage>): Promise<ChatMessage> {
  const payload = {
    id: msg.id || 'msg_' + Date.now(),
    authorId: msg.authorId || 'guest',
    text: msg.text || '',
    type: msg.type || 'text',
    attachmentUrl: msg.attachmentUrl || null,
    attachmentType: msg.attachmentType || null,
    createdAt: msg.createdAt || new Date().toISOString()
  };

  try {
    const res = await fetch(`/api/intents/${intentId}/messages?_t=${Date.now()}`, {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditPayload)
    });
  } catch (e) {
    console.warn("Audit log save note:", e);
  }
}

/**
 * Fetches all active ad banners from server with offline cache fallback
 */
export async function fetchLiveAds(): Promise<any[]> {
  try {
    const res = await fetch(`/api/ads?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (res.ok) {
      const ads = await res.json();
      if (Array.isArray(ads)) {
        try {
          localStorage.setItem('locohelp_ad_banners', JSON.stringify(ads));
        } catch (e) {}
        return ads;
      }
    }
  } catch (err) {
    console.warn("Server fetch ads fallback to local storage:", err);
  }

  try {
    const stored = localStorage.getItem('locohelp_ad_banners');
    if (stored) {
      const ads = JSON.parse(stored);
      return ads.filter((a: any) => !a.id.startsWith('ad_elec_') && !a.id.startsWith('ad_grocery_') && !a.id.startsWith('ad_auto_'));
    }
  } catch (e) {}

  return [];
}

/**
 * Creates or updates an ad banner on server
 */
export async function createAdOnServer(ad: any): Promise<any> {
  // Update local storage first
  try {
    const stored = localStorage.getItem('locohelp_ad_banners');
    const existing = stored ? JSON.parse(stored) : [];
    const updated = [ad, ...existing.filter((a: any) => a.id !== ad.id)];
    localStorage.setItem('locohelp_ad_banners', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}

  try {
    const res = await fetch(`/api/ads?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(ad)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Failed to save ad to server (offline mode):", err);
  }
  return ad;
}

/**
 * Deletes an ad banner from server
 */
export async function deleteAdOnServer(id: string): Promise<boolean> {
  // Update local storage
  try {
    const stored = localStorage.getItem('locohelp_ad_banners');
    if (stored) {
      const existing = JSON.parse(stored);
      const filtered = existing.filter((a: any) => a.id !== id);
      localStorage.setItem('locohelp_ad_banners', JSON.stringify(filtered));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {}

  try {
    const res = await fetch(`/api/ads/${id}?_t=${Date.now()}`, {
      method: 'DELETE',
      headers: { 'Cache-Control': 'no-cache' }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Sends OTP to Mobile or Email
 */
export async function sendAuthOtp(identifier: string, type: 'mobile' | 'email'): Promise<{ 
  success: boolean; 
  message?: string; 
  whatsappUrl?: string; 
  devCode?: string;
  emailSent?: boolean;
  error?: string; 
}> {
  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, type })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to send OTP' };
    }
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
      body: JSON.stringify({ identifier, code, type })
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

/**
 * Fetches Job Portal items from server (by default, only approved for public view).
 * For admin panel, pass { status: 'all' } or { status: 'pending' }.
 */
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
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`/api/job-portal?${query.toString()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
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

  // Fallback to cache for approved items if offline
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
 * Submits a new Job Seeker profile or Employer job vacancy.
 * Always saves with status: "pending" on the server.
 */
export async function submitJobPortalItem(item: Partial<JobPortalItem>): Promise<{
  success: boolean;
  item?: JobPortalItem;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/job-portal?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(item)
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
 * Updates status of a Job Portal entry (Approve or Reject in Admin Panel).
 */
export async function updateJobPortalStatus(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  adminNotes?: string
): Promise<{ success: boolean; item?: JobPortalItem; error?: string }> {
  try {
    const res = await fetch(`/api/job-portal/${id}/status?_t=${Date.now()}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ status, adminNotes })
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
 * Deletes a Job Portal entry permanently.
 */
export async function deleteJobPortalItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/job-portal/${id}?_t=${Date.now()}`, {
      method: 'DELETE',
      headers: { 'Cache-Control': 'no-cache' }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Purges all sample/dummy seed data from server.
 */
export async function purgeDummyDataOnServer(): Promise<{ success: boolean; message?: string; counts?: any }> {
  try {
    const res = await fetch(`/api/admin/clear-dummy-data?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to purge dummy data' };
  }
}

/**
 * Completely resets database to empty state.
 */
export async function resetDatabaseOnServer(): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/admin/reset-database?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
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
  idDocumentWatermarked?: string; // Only present in Admin API
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  adminNotes?: string;
}

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
  idDocumentWatermarked: string;
}): Promise<{ success: boolean; message?: string; verificationId?: string; error?: string }> {
  try {
    const res = await fetch('/api/verifications', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
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
    const res = await fetch(`/api/verifications/status/${encodeURIComponent(entityId)}?_t=${Date.now()}`);
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
      cache: 'no-store'
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes })
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



