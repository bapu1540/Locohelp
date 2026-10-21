import { getCurrentUser } from '../auth';

export interface EntityOwnershipCandidate {
  id?: string;
  userId?: string;
  ownerEmail?: string;
  email?: string;
  phone?: string;
  authorId?: string;
}

/**
 * Checks whether the currently logged-in user is the owner of a given listing,
 * shop, job seeker profile, or employer vacancy.
 */
export function isEntityOwner(
  entity: EntityOwnershipCandidate | null | undefined,
  currentUserOverride?: any
): boolean {
  if (!entity) return false;

  const user = currentUserOverride !== undefined ? currentUserOverride : getCurrentUser();
  if (!user) return false;

  const userUid = String(user.uid || user.id || '').trim();
  const userEmail = String(user.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
  const rawUserPhone = user.phone || (userUid.startsWith('phone_') ? userUid.replace('phone_', '') : '');
  const userPhone = String(rawUserPhone || '').replace(/\D/g, '');

  const entityUid = String(entity.userId || entity.authorId || '').trim();
  const entityEmail = String(entity.ownerEmail || entity.email || '').trim().toLowerCase();
  const entityPhone = String(entity.phone || '').replace(/\D/g, '');
  const entityId = String(entity.id || '').trim();

  // 1. Direct UID matching
  if (userUid && entityUid && userUid === entityUid) {
    return true;
  }

  // 2. Email matching
  if (userEmail && entityEmail && userEmail === entityEmail) {
    return true;
  }

  // 3. Phone matching (at least 10 digits)
  if (userPhone && entityPhone && userPhone.length >= 10 && (userPhone.endsWith(entityPhone) || entityPhone.endsWith(userPhone))) {
    return true;
  }

  // 4. Stored local profile identifiers matching
  try {
    if (entityId) {
      const myBizRaw = localStorage.getItem('locohelp_my_business_profile');
      if (myBizRaw) {
        const myBiz = JSON.parse(myBizRaw);
        if (myBiz?.id === entityId) return true;
      }

      const myHelperRaw = localStorage.getItem('locohelp_my_helper_profile');
      if (myHelperRaw) {
        const myHelper = JSON.parse(myHelperRaw);
        if (myHelper?.id === entityId) return true;
      }

      const myPostIdsRaw = localStorage.getItem('locohelp_my_post_ids');
      if (myPostIdsRaw) {
        const myPostIds = JSON.parse(myPostIdsRaw);
        if (Array.isArray(myPostIds) && myPostIds.includes(entityId)) return true;
      }

      const myJobSeekerRaw = localStorage.getItem('locohelp_my_job_seeker');
      if (myJobSeekerRaw) {
        const mySeeker = JSON.parse(myJobSeekerRaw);
        if (mySeeker?.id === entityId) return true;
      }

      const myEmployerRaw = localStorage.getItem('locohelp_my_employer_vacancy');
      if (myEmployerRaw) {
        const myEmp = JSON.parse(myEmployerRaw);
        if (myEmp?.id === entityId) return true;
      }
    }
  } catch (e) {
    // ignore json errors
  }

  return false;
}
