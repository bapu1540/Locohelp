/**
 * LOCKED MODULE: Authentic Rating & Admin Verification Badge Rules
 * Step 3 — Do not overwrite with fake 5.0 ratings or automatic verified ticks.
 *
 * Rules:
 * 1. A user/helper/shop only shows a star rating (e.g. 4.8 ★) when they have at least 1 real review (reviewCount > 0).
 *    When reviewCount === 0, they show "New / नया / નવું" instead of a fake 5.0 ★.
 * 2. The "✓ Verified" badge ONLY appears when the profile/entity has been approved by Admin
 *    (isVerified === true, is_verified === true, or status === 'approved').
 */

export interface RatingDisplayResult {
  hasReviews: boolean;
  ratingValue: number;
  ratingText: string;
  reviewCount: number;
  newLabel: string;
}

export function isEntityAdminVerified(entity: any): boolean {
  if (!entity || typeof entity !== 'object') return false;
  const rawStatus = String(entity.status || entity.approvalStatus || '').trim().toLowerCase();
  if (rawStatus === 'rejected' || rawStatus === 'deleted' || rawStatus === 'pending') {
    return false;
  }
  return Boolean(
    entity.isVerified === true ||
      entity.is_verified === true ||
      entity.verified === true ||
      entity.isApproved === true ||
      entity.is_approved === true ||
      rawStatus === 'approved'
  );
}

export function getAuthenticRatingInfo(
  entity: {
    rating?: number | string | null;
    reviewCount?: number | string | null;
    review_count?: number | string | null;
    reviews?: number | any[] | null;
  } | null | undefined,
  language: string = 'HI'
): RatingDisplayResult {
  const lang = String(language || 'HI').toUpperCase();
  const newLabel = lang === 'GU' ? 'નવું' : lang === 'EN' ? 'New' : 'नया';

  if (!entity) {
    return {
      hasReviews: false,
      ratingValue: 0,
      ratingText: newLabel,
      reviewCount: 0,
      newLabel,
    };
  }

  const arrayCount = Array.isArray(entity.reviews) ? entity.reviews.length : 0;
  const numericReviewsProp = typeof entity.reviews === 'number' ? entity.reviews : 0;
  const explicitCount = Number(entity.reviewCount ?? entity.review_count ?? numericReviewsProp ?? 0);
  const reviewCount = Math.max(
    0,
    Number.isFinite(explicitCount) ? explicitCount : 0,
    arrayCount
  );

  const parsedRating = Number(entity.rating ?? 0);
  const hasValidRating = Number.isFinite(parsedRating) && parsedRating > 0;

  if (reviewCount <= 0 || !hasValidRating) {
    return {
      hasReviews: false,
      ratingValue: 0,
      ratingText: newLabel,
      reviewCount: 0,
      newLabel,
    };
  }

  const clamped = Math.min(5, Math.max(1, parsedRating));
  return {
    hasReviews: true,
    ratingValue: Number(clamped.toFixed(1)),
    ratingText: clamped.toFixed(1),
    reviewCount,
    newLabel,
  };
}
