// Google Analytics 4 (GA4) SPA & Privacy-Safe Tracking Utility
// Measurement ID: G-ZN184GR1M9

export const GA_MEASUREMENT_ID = 'G-ZN184GR1M9';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __LOCOHELP_GA_INITIALIZED__?: boolean;
  }
}

let lastTrackedPath = '';

const SCREEN_TITLES: Record<string, string> = {
  home: 'LocoHelp - Home',
  categories: 'LocoHelp - Categories',
  chat: 'LocoHelp - Messages',
  notifications: 'LocoHelp - Notifications',
  pro: 'LocoHelp - Register Service / Business',
  settings: 'LocoHelp - Settings',
  guidelines: 'LocoHelp - Community Guidelines',
  roadmap: 'LocoHelp - Roadmap',
  directory: 'LocoHelp - Local Directory',
  profile: 'LocoHelp - User Profile',
  support: 'LocoHelp - Help & Support',
  mesh: 'LocoHelp - Offline Mesh',
  leaderboard: 'LocoHelp - Leaderboard',
  professionals: 'LocoHelp - Verified Professionals',
  admin: 'LocoHelp - Admin Dashboard',
};

/**
 * Redacts any potential PII (emails, phone numbers, tokens) from a URL path or string
 * so personal user information is never sent to Google Analytics.
 */
function sanitizePathSegment(segment: string): string {
  if (!segment) return '';
  return segment
    .trim()
    .toLowerCase()
    // Remove email patterns
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted]')
    // Remove 10+ digit phone number patterns
    .replace(/\b\d{10,15}\b/g, '[redacted]')
    // Keep only safe URL slug characters
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Tracks virtual SPA page navigations in Google Analytics 4.
 * - Prevents duplicate consecutive page_view events.
 * - Never sends PII (names, phone numbers, emails, passwords, or private chat messages).
 */
export function trackSpaPageView(screen: string, selectedCategory?: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  const safeScreen = sanitizePathSegment(screen || 'home') || 'home';
  const safeCategory =
    safeScreen === 'categories' && selectedCategory && selectedCategory !== 'all'
      ? sanitizePathSegment(selectedCategory)
      : '';

  let virtualPath = safeScreen === 'home' ? '/' : `/${safeScreen}`;
  if (safeCategory) {
    virtualPath += `/${safeCategory}`;
  }

  // Deduplicate identical consecutive page_view calls
  if (virtualPath === lastTrackedPath) {
    return;
  }
  lastTrackedPath = virtualPath;

  const baseTitle = SCREEN_TITLES[safeScreen] || `LocoHelp - ${safeScreen}`;
  const pageTitle = safeCategory ? `${baseTitle} (${safeCategory})` : baseTitle;
  const cleanLocation = `${window.location.origin}${virtualPath}`;

  window.gtag('event', 'page_view', {
    send_to: GA_MEASUREMENT_ID,
    page_title: pageTitle,
    page_path: virtualPath,
    page_location: cleanLocation,
  });
}
