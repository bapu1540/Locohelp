import { Intent } from '../../types';
import { getConnectedTwinDistricts } from '../../data/panIndiaLocations';

/**
 * LOCKED MODULE: Live Broadcast Posts Sync & Feed Visibility
 * Ensures that any post created by User A is immediately visible on User B's phone
 * across all devices, prioritizing same-city and twin-city posts at the top
 * while never hiding active posts due to a different default city on another phone.
 */
export function filterAndSortLiveBroadcastPosts(params: {
  baseCategoryIntents: any[];
  activeHeaderDistrict: string;
  userArea?: string;
  newlyCreatedId?: string | null;
  myPostIdsList?: string[];
  activeUser?: { uid?: string; email?: string } | null;
}): any[] {
  const {
    baseCategoryIntents,
    activeHeaderDistrict,
    userArea = '',
    newlyCreatedId = null,
  } = params;

  const cleanDistrict = (activeHeaderDistrict || '').trim().toLowerCase();
  const connectedDistricts = getConnectedTwinDistricts(cleanDistrict);
  const prefArea = (userArea || '').trim().toLowerCase();

  // Keep ALL active posts visible across all phones so User A's post is never hidden on User B's phone
  return baseCategoryIntents
    .slice()
    .sort((a, b) => {
      // 1. Pin newly created post at the very top immediately
      if (newlyCreatedId) {
        if (a.id === newlyCreatedId && b.id !== newlyCreatedId) return -1;
        if (b.id === newlyCreatedId && a.id !== newlyCreatedId) return 1;
      }

      // 2. Strictly chronological (Newest posts first within 15 minutes so a fresh post from any phone is immediately at the top)
      const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
      const nowMs = Date.now();
      const FIFTEEN_MINS_MS = 15 * 60 * 1000;
      const aIsFresh = aTime > 0 && nowMs - aTime <= FIFTEEN_MINS_MS;
      const bIsFresh = bTime > 0 && nowMs - bTime <= FIFTEEN_MINS_MS;

      if (aIsFresh && !bIsFresh) return -1;
      if (bIsFresh && !aIsFresh) return 1;
      if (aIsFresh && bIsFresh && bTime !== aTime) {
        return bTime - aTime;
      }

      // 3. District & Twin-City priority for older posts
      const aCity = (a.resolvedCity || a.city || '').toLowerCase();
      const bCity = (b.resolvedCity || b.city || '').toLowerCase();
      const aArea = (a.resolvedArea || a.area || '').toLowerCase();
      const bArea = (b.resolvedArea || b.area || '').toLowerCase();

      const getDistrictRank = (cityStr: string) => {
        if (!cleanDistrict || cleanDistrict === 'all') return 0;
        if (!cityStr) return 2;
        if (
          cityStr === cleanDistrict ||
          cityStr.includes(cleanDistrict) ||
          cleanDistrict.includes(cityStr)
        ) {
          return 0;
        }
        if (connectedDistricts.some(d => cityStr.includes(d) || d.includes(cityStr))) {
          return 1;
        }
        return 2;
      };

      const aRank = getDistrictRank(aCity);
      const bRank = getDistrictRank(bCity);
      if (aRank !== bRank) return aRank - bRank;

      if (prefArea) {
        const aAreaMatch = aArea.includes(prefArea) ? 0 : 1;
        const bAreaMatch = bArea.includes(prefArea) ? 0 : 1;
        if (aAreaMatch !== bAreaMatch) return aAreaMatch - bAreaMatch;
      }

      if (bTime !== aTime) return bTime - aTime;

      return (a.computedKm || 0.5) - (b.computedKm || 0.5);
    });
}
