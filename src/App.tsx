import React, { useState, useEffect } from 'react';
import { Screen, Intent } from './types';
import { LanguageProvider, useLanguage, SUPPORTED_LANGUAGES } from './i18n';
import { logoutUser, ensureProfileExists, onAuthStateChange, restoreSessionFromServer, getCurrentUser } from './auth';
import { syncBrowserDataToPostgres, fetchPostConversations, subscribeToRealtimeStream } from './api';
import { isGuestUser } from './lib/authUtils';
import LocoHelpLogo from './components/LocoHelpLogo';
import PanIndiaLocationModal from './components/PanIndiaLocationModal';
import LoginPromptModal from './components/LoginPromptModal';
import { getSavedUserLocation, getLocalizedLocationButtonText, UserManualLocation } from './data/panIndiaLocations';
import { motion, AnimatePresence } from 'motion/react';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ProScreen from './screens/ProScreen';
import SettingsMenu from './screens/SettingsMenu';
import GuidelinesScreen from './screens/GuidelinesScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import RoadmapScreen from './screens/RoadmapScreen';
import ReportModal from './screens/ReportModal';
import SearchDirectoryScreen from './screens/SearchDirectoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import SupportScreen from './screens/SupportScreen';
import MeshScreen from './screens/MeshScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import ProfessionalsScreen from './screens/ProfessionalsScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import AdminDashboard from './screens/AdminDashboard';
import NotFoundScreen from './screens/NotFoundScreen';
import { 
  Smartphone, 
  Monitor, 
  Radio, 
  Globe, 
  Search, 
  Trophy, 
  Wrench, 
  Settings, 
  User, 
  Plus, 
  Download, 
  ShieldCheck, 
  Sparkles,
  MapPin,
  Users,
  MessageSquare,
  ChevronRight,
  Heart,
  CheckCircle2,
  Bell,
  Store,
  MoreVertical,
  LogIn,
  LogOut,
  Check
} from 'lucide-react';
import { MASTER_CATEGORIES, getFreeHelperProfiles } from './data/categories';
import ErrorBoundary from './components/ErrorBoundary';
import { trackSpaPageView } from './lib/analytics';

import PrivateLockGate from './components/PrivateLockGate';
import FixedBottomNavBar from './components/FixedBottomNavBar';

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <PrivateLockGate>
          <AppContent />
        </PrivateLockGate>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { language, setLanguage, t, tr } = useLanguage();
  const [isGlobalLangOpen, setIsGlobalLangOpen] = useState(false);
  const [isGlobalMenuOpen, setIsGlobalMenuOpen] = useState(false);
  const [isGlobalLocationOpen, setIsGlobalLocationOpen] = useState(false);
  const [isGlobalLoginOpen, setIsGlobalLoginOpen] = useState(false);
  const [globalUserLocation, setGlobalUserLocation] = useState<UserManualLocation>(() => getSavedUserLocation());
  const [, setAuthTick] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [blockedAccountState, setBlockedAccountState] = useState<{
    isBlocked: boolean;
    reason?: string;
    blockedAt?: string;
  }>({ isBlocked: false });
  const [globalPushToast, setGlobalPushToast] = useState<{
    title: string;
    body: string;
    intent?: any;
  } | null>(null);

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  // Poll /api/users/approval-status to enforce immediate 100% Total Account Lockdown if Admin blocks this user/mobile/email
  useEffect(() => {
    let active = true;
    const checkBlockStatus = async () => {
      try {
        const u = getCurrentUser();
        const uid = String(u?.uid && !u.isGuest ? u.uid : '').trim();
        const email = String(u?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim();
        const phone = String(
          u?.phone ||
            localStorage.getItem('locohelp_profile_phone') ||
            localStorage.getItem('locohelp_last_logged_in_phone') ||
            ''
        ).trim();
        if (!uid && !email && !phone) {
          if (active) setBlockedAccountState({ isBlocked: false });
          return;
        }
        const qs = new URLSearchParams();
        if (uid) qs.set('uid', uid);
        if (email) qs.set('email', email);
        if (phone) qs.set('phone', phone);
        const res = await fetch(`/api/users/approval-status?${qs.toString()}`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!active) return;
        if (data?.isBlocked || data?.status === 'blocked') {
          setBlockedAccountState({
            isBlocked: true,
            reason:
              data.blockReason ||
              'સમુદાયના નિયમોના ઉલ્લંઘન અથવા રિપોર્ટને કારણે એડમિન દ્વારા તમારું એકાઉન્ટ બ્લોક કરવામાં આવ્યું છે.',
            blockedAt: data.blockedAt
          });
        } else {
          setBlockedAccountState({ isBlocked: false });
        }
      } catch {}
    };
    checkBlockStatus();
    const timer = setInterval(checkBlockStatus, 5000);
    window.addEventListener('storage', checkBlockStatus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('storage', checkBlockStatus);
    };
  }, []);

  // Automatically request Web Notification permission on first user interaction so Android TWA & Chrome can show system notifications
  useEffect(() => {
    const requestNotifPermOnce = () => {
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      } catch {}
    };
    window.addEventListener('click', requestNotifPermOnce, { once: true, passive: true });
    return () => window.removeEventListener('click', requestNotifPermOnce);
  }, []);

  // Poll + real-time stream for unread messages count & global new post / chat notifications across all screens
  useEffect(() => {
    let active = true;
    const refreshUnread = async () => {
      try {
        if (isGuestUser()) {
          if (active) setUnreadChatCount(0);
          return;
        }
        const u = getCurrentUser();
        const uid = String(u?.uid || '').trim();
        const email = String(u?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim();
        if (!uid && !email) {
          if (active) setUnreadChatCount(0);
          return;
        }
        const convs = await fetchPostConversations({ userId: uid || email, userEmail: email });
        if (!active) return;
        const total = (Array.isArray(convs) ? convs : []).reduce(
          (sum: number, c: any) => sum + (Number(c?.unreadCount) || 0),
          0
        );
        setUnreadChatCount(total);
      } catch {}
    };
    refreshUnread();
    const timer = setInterval(refreshUnread, 4000);
    const unsubStream = subscribeToRealtimeStream({
      onNewPost: (payload: any) => {
        const newPost: any = payload?.post || payload?.intent || payload;
        if (!newPost || !newPost.id) return;
        try {
          const postIdStr = String(newPost.id);
          const notifiedIds: string[] = JSON.parse(localStorage.getItem('locohelp_notified_post_ids') || '[]');
          if (notifiedIds.includes(postIdStr)) return;

          const u = getCurrentUser();
          const myUid = String(u?.uid || '').trim().toLowerCase();
          const myEmail = String(u?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
          const myEmailUid = myEmail ? 'email_' + myEmail.replace(/[^a-z0-9]/g, '_') : '';
          const postAuthorId = String(newPost.authorId || newPost.userId || '').trim().toLowerCase();
          const postAuthorEmail = String(newPost.authorEmail || '').trim().toLowerCase();
          const myPostIds: string[] = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');

          const isMyOwn = Boolean(
            myPostIds.includes(postIdStr) ||
            (myUid && postAuthorId && myUid === postAuthorId) ||
            (myEmailUid && postAuthorId && myEmailUid === postAuthorId) ||
            (myEmail && postAuthorEmail && myEmail === postAuthorEmail)
          );

          const nextNotified = [postIdStr, ...notifiedIds].slice(0, 150);
          localStorage.setItem('locohelp_notified_post_ids', JSON.stringify(nextNotified));
          if (isMyOwn) return;

          const areaLabel = newPost.area || newPost.city || newPost.location || 'Local Area';
          const catLabel = newPost.category || newPost.title || 'New Request';
          const descSnippet = String(newPost.description || newPost.title || '').slice(0, 80);
          const notifTitle = `🔔 New Post in ${areaLabel}`;
          const notifBody = `${catLabel}: ${descSnippet}`;

          setGlobalPushToast({ title: notifTitle, body: notifBody, intent: newPost });
          setTimeout(() => setGlobalPushToast(null), 6500);

          try {
            const existingNotifs = JSON.parse(localStorage.getItem('locohelp_notifications') || '[]');
            const notifId = `notif_post_${postIdStr}`;
            if (!existingNotifs.some((n: any) => n && n.id === notifId)) {
              const updatedNotifs = [
                {
                  id: notifId,
                  type: 'new_post',
                  title: notifTitle,
                  body: notifBody,
                  postId: postIdStr,
                  post: newPost,
                  createdAt: new Date().toISOString(),
                  isRead: false
                },
                ...existingNotifs
              ].slice(0, 50);
              localStorage.setItem('locohelp_notifications', JSON.stringify(updatedNotifs));
              window.dispatchEvent(new CustomEvent('locohelp_notifications_updated'));
            }
          } catch {}

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready
                .then((reg) => {
                  reg.showNotification(notifTitle, {
                    body: notifBody,
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-192x192.png',
                    data: { url: `/?postId=${encodeURIComponent(postIdStr)}` }
                  });
                })
                .catch(() => {});
            }
          }
        } catch {}
      },
      onNewResponse: () => {
        refreshUnread();
      }
    });
    const handleChatReadUpdated = (e: any) => {
      if (typeof e?.detail?.unreadCount === 'number') {
        if (active) setUnreadChatCount(e.detail.unreadCount);
        return;
      }
      refreshUnread();
    };
    window.addEventListener('locohelp_chat_read_updated', handleChatReadUpdated);
    window.addEventListener('storage', handleChatReadUpdated);
    return () => {
      active = false;
      clearInterval(timer);
      unsubStream();
      window.removeEventListener('locohelp_chat_read_updated', handleChatReadUpdated);
      window.removeEventListener('storage', handleChatReadUpdated);
    };
  }, []);

  useEffect(() => {
    const handleLocUpdate = (e: any) => {
      if (e?.detail?.district) {
        setGlobalUserLocation(e.detail);
      } else {
        setGlobalUserLocation(getSavedUserLocation());
      }
    };
    window.addEventListener('locohelp_location_changed', handleLocUpdate);
    return () => window.removeEventListener('locohelp_location_changed', handleLocUpdate);
  }, []);

  const checkAdminRoute = (): boolean => {
    try {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const hash = window.location.hash.toLowerCase().replace(/\/+$/, '');
      return path === '/bapu-admin' || hash === '#/bapu-admin' || hash === '#bapu-admin';
    } catch (e) {
      return false;
    }
  };

  const getScreenFromRoute = (): Screen => {
    try {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const hash = window.location.hash.toLowerCase().replace(/\/+$/, '');

      // Check admin route
      if (checkAdminRoute()) {
        return 'admin';
      }

      // Dedicated Google Play compliant public Privacy Policy & Data Deletion route (/privacy)
      if (
        path === '/privacy' ||
        path === '/privacy-policy' ||
        path === '/delete-account' ||
        path === '/data-deletion'
      ) {
        return 'privacy';
      }

      if (path === '/terms' || path === '/guidelines') {
        return 'guidelines';
      }

      // If root path
      if (!path || path === '') {
        if (hash) {
          const cleanHash = hash.replace(/^#\/?/, '');
          if (['privacy', 'privacy-policy', 'delete-account', 'data-deletion'].includes(cleanHash)) {
            return 'privacy';
          }
          if (['about', 'features', 'contact'].includes(cleanHash)) {
            return 'settings';
          }
          if (cleanHash === 'terms') {
            return 'guidelines';
          }
          const validScreens: Screen[] = [
            'home', 'categories', 'directory', 'chat', 'notifications',
            'pro', 'settings', 'guidelines', 'privacy', 'roadmap', 'profile',
            'support', 'mesh', 'leaderboard', 'professionals'
          ];
          if (validScreens.includes(cleanHash as Screen)) {
            return cleanHash as Screen;
          }
          return 'not_found';
        }
        return 'home';
      }

      // Unknown pathname (e.g. /unknown-page, /404, etc.)
      return 'not_found';
    } catch (e) {
      return 'home';
    }
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    return getScreenFromRoute();
  });

  const [activeIntent, setActiveIntent] = useState<Intent | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    reportedUserId?: string;
    reportedUserName?: string;
    reportedPostId?: string;
    reportedPostTitle?: string;
  }>({});
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const catParam = (params.get('category') || '').trim();
      return catParam || 'all';
    } catch {
      return 'all';
    }
  });

  useEffect(() => {
    const handleOpenReport = (e: any) => {
      const detail = e?.detail || {};
      setReportTarget({
        reportedUserId: detail.reportedUserId || '',
        reportedUserName: detail.reportedUserName || '',
        reportedPostId: detail.reportedPostId || '',
        reportedPostTitle: detail.reportedPostTitle || ''
      });
      setIsReportModalOpen(true);
    };
    const handleOpenTerms = () => {
      setIsGlobalLoginOpen(false);
      window.dispatchEvent(new CustomEvent('locohelp_close_all_modals'));
      setCurrentScreen('guidelines');
    };
    window.addEventListener('locohelp_open_report_modal', handleOpenReport);
    window.addEventListener('locohelp_open_terms', handleOpenTerms);
    return () => {
      window.removeEventListener('locohelp_open_report_modal', handleOpenReport);
      window.removeEventListener('locohelp_open_terms', handleOpenTerms);
    };
  }, []);

  // Track SPA virtual page views in Google Analytics 4 (privacy-safe, deduplicated)
  useEffect(() => {
    trackSpaPageView(currentScreen, selectedCategory);
  }, [currentScreen, selectedCategory]);

  // One-time cleanup of stale browser cache keys so authoritative PostgreSQL data is never overwritten
  useEffect(() => {
    try {
      if (localStorage.getItem('locohelp_cache_cleaned_v1') !== 'true') {
        [
          'locohelp_cached_intents',
          'locohelp_custom_intents',
          'locohelp_deleted_posts',
          'locohelp_deleted_descs',
          'locohelp_deleted_helpers',
          'locohelp_deleted_shops'
        ].forEach(k => localStorage.removeItem(k));
        localStorage.setItem('locohelp_cache_cleaned_v1', 'true');
      }
    } catch {}
    restoreSessionFromServer();
    syncBrowserDataToPostgres();
  }, []);

  // Listen to URL changes for '/bapu-admin', '/privacy', legal hashes (#terms, #privacy, #delete-account), and invalid routes
  useEffect(() => {
    const handleRouteChange = () => {
      const targetScreen = getScreenFromRoute();
      const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
      if (
        targetScreen === 'admin' ||
        targetScreen === 'privacy' ||
        targetScreen === 'not_found' ||
        ['terms', 'privacy', 'privacy-policy', 'delete-account', 'data-deletion', 'about', 'features', 'contact', 'guidelines', 'settings'].includes(hash)
      ) {
        setCurrentScreen(targetScreen);
      }
    };
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Listen to Supabase Auth state for seamless persistent login
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const u = session.user;
          // Auto-create profile if missing
          await ensureProfileExists(u);
          const resolvedUid = u.uid || u.id;
          const userData = {
            uid: resolvedUid,
            displayName: u.displayName || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Community Member',
            email: u.email || '',
            photoURL: u.photoURL || u.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user',
          };
          
          if (userData && userData.uid) {
            localStorage.setItem('locohelp_user', JSON.stringify(userData));
            localStorage.setItem('locohelp_logged_in', 'true');
            if (u.email) {
              localStorage.setItem('locohelp_last_logged_in_email', u.email);
              localStorage.setItem('locohelp_last_logged_in_name', userData.displayName);
              if (userData.photoURL) localStorage.setItem('locohelp_last_logged_in_photo', userData.photoURL);
            }
          }

          // Auto-advance if currently on login screen (though login screen is currently disabled)
          setCurrentScreen((prev) => (prev === 'login' as any ? 'home' : prev));
        } else if (event === 'SIGNED_OUT') {
          // Clear local state if explicitly signed out
          localStorage.removeItem('locohelp_user');
          localStorage.removeItem('locohelp_logged_in');
        }
      } catch (e) {
        console.error("Session sync error:", e);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Clear unread chat badge immediately when user navigates to ChatScreen
  useEffect(() => {
    if (currentScreen === 'chat') {
      setUnreadChatCount(0);
    }
  }, [currentScreen]);

  // Initialize base history entry and arm on user gesture so mobile Chrome/Android Back button never exits the website
  const historyGuardArmedRef = React.useRef(false);
  useEffect(() => {
    try {
      const initialScreen = getScreenFromRoute();
      window.history.replaceState({ locohelpScreen: initialScreen, locohelpBase: true }, '');
      window.history.pushState({ locohelpScreen: initialScreen }, '');
    } catch (e) {}

    const armUserGestureHistoryGuard = () => {
      if (historyGuardArmedRef.current) return;
      historyGuardArmedRef.current = true;
      try {
        const activeScr = getScreenFromRoute();
        window.history.pushState({ locohelpScreen: activeScr, userGestureGuard: true }, '');
      } catch (e) {}
    };

    window.addEventListener('pointerdown', armUserGestureHistoryGuard, { passive: true });
    window.addEventListener('touchstart', armUserGestureHistoryGuard, { passive: true });
    window.addEventListener('click', armUserGestureHistoryGuard, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', armUserGestureHistoryGuard);
      window.removeEventListener('touchstart', armUserGestureHistoryGuard);
      window.removeEventListener('click', armUserGestureHistoryGuard);
    };
  }, []);

  // Push history state when report modal opens
  useEffect(() => {
    if (isReportModalOpen) {
      try {
        window.history.pushState({ locohelpScreen: currentScreen, locohelpModal: 'report' }, '');
      } catch (e) {}
    }
  }, [isReportModalOpen]);

  // Global Hardware Back Button (popstate) listener
  useEffect(() => {
    const handlePopState = () => {
      if (checkAdminRoute()) {
        setCurrentScreen('admin');
        return;
      }

      // 1. Close ReportModal or global header modals if open
      if (isReportModalOpen || isGlobalLocationOpen || isGlobalLoginOpen || isGlobalLangOpen || isGlobalMenuOpen) {
        setIsReportModalOpen(false);
        setIsGlobalLocationOpen(false);
        setIsGlobalLoginOpen(false);
        setIsGlobalLangOpen(false);
        setIsGlobalMenuOpen(false);
        try {
          window.history.pushState({ locohelpScreen: currentScreen }, '');
        } catch (e) {}
        return;
      }

      // 2. Ask active screen if it has an open modal, popup, chat inbox, or sub-view to close first
      const closeModalEvent = new CustomEvent('locohelp_close_active_modal', { cancelable: true });
      window.dispatchEvent(closeModalEvent);
      if (closeModalEvent.defaultPrevented) {
        try {
          window.history.pushState({ locohelpScreen: currentScreen }, '');
        } catch (e) {}
        return;
      }

      // 3. If on Chat screen opened from Profile, return to Profile first; otherwise return to Home from any sub-screen
      if (currentScreen !== 'home') {
        const targetBackScreen: Screen =
          currentScreen === 'chat' && prevScreen === 'profile'
            ? 'profile'
            : (currentScreen === 'guidelines' || currentScreen === 'privacy') && prevScreen === 'settings'
            ? 'settings'
            : 'home';
        if (currentScreen === 'categories') {
          setSelectedCategory('all');
        }
        setPrevScreen('home');
        setCurrentScreen(targetBackScreen);
        try {
          window.history.pushState({ locohelpScreen: targetBackScreen }, '', targetBackScreen === 'home' ? '/' : undefined);
        } catch (e) {}
        return;
      }

      // 4. If on Home screen with a category filter selected, reset category filter
      if (selectedCategory !== 'all') {
        setSelectedCategory('all');
        try {
          window.history.pushState({ locohelpScreen: 'home' }, '');
        } catch (e) {}
        return;
      }

      // 5. Keep safety history entry on Home so accidental Back press does not exit the website
      historyGuardArmedRef.current = false;
      try {
        window.history.pushState({ locohelpScreen: 'home' }, '');
      } catch (e) {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentScreen, prevScreen, isReportModalOpen, isGlobalLocationOpen, isGlobalLoginOpen, isGlobalLangOpen, isGlobalMenuOpen, selectedCategory]);

  const navigate = (screen: Screen) => {
    setIsGlobalLangOpen(false);
    setIsGlobalMenuOpen(false);
    window.dispatchEvent(new CustomEvent('locohelp_close_all_modals'));
    setPrevScreen(currentScreen);
    if (screen === 'login' as any) {
      logoutUser().then(() => {
        setCurrentScreen('home');
      });
      return;
    }

    if (screen !== currentScreen) {
      try {
        if (screen === 'privacy') {
          window.history.pushState({ locohelpScreen: 'privacy' }, '', '/privacy');
        } else if (currentScreen === 'privacy' || currentScreen === 'admin') {
          window.history.pushState({ locohelpScreen: screen }, '', '/');
        } else {
          window.history.pushState({ locohelpScreen: screen }, '');
        }
      } catch (e) {}
    }

    setCurrentScreen(screen);
  };

  const handleSelectCategory = (cat: string) => {
    if (cat !== selectedCategory && cat !== 'all') {
      try {
        window.history.pushState({ locohelpScreen: currentScreen, locohelpCategory: cat }, '');
      } catch (e) {}
    }
    setSelectedCategory(cat);
  };

  const handleGlobalProfileClick = () => {
    setIsGlobalMenuOpen(false);
    window.dispatchEvent(new CustomEvent('locohelp_close_all_modals'));
    if (isGuestUser()) {
      setIsGlobalLoginOpen(true);
      return;
    }
    navigate('profile');
  };

  return (
    <div
      className={
        currentScreen === 'admin'
          ? 'min-h-screen w-full bg-[#090D16] text-slate-100 font-sans antialiased flex flex-col overflow-y-auto overflow-x-hidden'
          : 'h-dvh w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col overflow-hidden overflow-x-hidden'
      }
    >
      {/* GLOBAL FIXED TOP HEADER BANNER: Always visible across all screens */}
      <header
        className="loco-header-bar sticky top-0 z-40 shrink-0 min-h-[50px] backdrop-blur-md shadow-xs px-1.5 sm:px-3 md:px-5 py-1.5 flex items-center justify-between gap-1 sm:gap-2 md:gap-3 w-full max-w-full box-border"
        style={{ position: 'sticky', top: 0, zIndex: 40, overflow: 'visible' }}
      >
        {/* Left Side: Language Selector Dropdown (ગુજરાતી / हिन्दी / English) */}
        <div className="flex items-center justify-start flex-1 sm:flex-initial min-w-[70px] sm:min-w-[100px]" style={{ overflow: 'visible' }}>
          <div className="relative flex-shrink-0" style={{ overflow: 'visible' }}>
            <button
              type="button"
              onClick={() => {
                setIsGlobalMenuOpen(false);
                setIsGlobalLangOpen((prev) => !prev);
              }}
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 md:px-3 py-1 md:py-1.5 bg-white dark:bg-slate-800 rounded-full hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 active:scale-95 cursor-pointer text-[10px] sm:text-xs"
              title={tr('Select Language', 'भाषा चुनें', 'ભાષા પસંદ કરો')}
            >
              <span className="text-[10px] sm:text-xs leading-none shrink-0">🌐</span>
              <span className="text-[10px] sm:text-xs font-black text-stone-800 dark:text-slate-200 whitespace-nowrap md:hidden">
                {language === 'GU' ? 'ગુજ' : language === 'HI' ? 'हिं' : 'EN'}
              </span>
              <span className="hidden md:inline text-xs font-black text-stone-800 dark:text-slate-200 whitespace-nowrap">
                {currentLangObj.nativeName}
              </span>
              <span className="text-[8px] md:text-xs text-slate-500 dark:text-slate-400 leading-none shrink-0">▾</span>
            </button>

            <AnimatePresence>
              {isGlobalLangOpen && (
                <>
                  <div
                    className="fixed inset-0 z-50"
                    style={{ position: 'fixed', inset: 0, zIndex: 10050 }}
                    onClick={() => setIsGlobalLangOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="w-44 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 space-y-1"
                    style={{ position: 'fixed', top: '56px', left: '8px', zIndex: 10055 }}
                  >
                    {SUPPORTED_LANGUAGES.map((langItem) => {
                      const isSelected = language === langItem.code;
                      return (
                        <button
                          key={langItem.code}
                          type="button"
                          onClick={() => {
                            setLanguage(langItem.code);
                            setIsGlobalLangOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{langItem.nativeName}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Official LocoHelp Logo (Centered) */}
        <div
          onClick={() => {
            setIsGlobalLangOpen(false);
            setIsGlobalMenuOpen(false);
            setIsGlobalLocationOpen(false);
            setIsGlobalLoginOpen(false);
            try {
              sessionStorage.removeItem('locohelp_return_popup_cat');
            } catch {}
            window.dispatchEvent(new CustomEvent('locohelp_close_all_modals'));
            handleSelectCategory('all');
            if (currentScreen === 'admin' || currentScreen === 'privacy') {
              try {
                window.history.pushState({ locohelpScreen: 'home' }, '', '/');
              } catch {}
            }
            navigate('home');
          }}
          className="flex-shrink-0 flex items-center justify-center select-none cursor-pointer py-0.5 mx-auto text-center"
          title="LocoHelp Home"
        >
          <LocoHelpLogo size={24} showText={true} textSize="sm" className="flex-shrink-0" />
        </div>

        {/* Right Side: 1-Click Location Selector Button (Replaces duplicate Profile chip) */}
        <div className="flex items-center justify-end flex-1 sm:flex-initial min-w-[70px] sm:min-w-[100px] gap-1.5" style={{ overflow: 'visible' }}>
          <button
            type="button"
            onClick={() => {
              setIsGlobalLangOpen(false);
              setIsGlobalMenuOpen(false);
              setIsGlobalLocationOpen(true);
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900 transition-all cursor-pointer shadow-2xs max-w-[145px] sm:max-w-[190px] active:scale-95"
            title={tr(
              'Change Location (View Posts, Service Experts & Businesses of any city)',
              'लोकेशन बदलें (किसी भी शहर की पोस्ट, सर्विस एक्सपर्ट और दुकानें देखें)',
              'લોકેશન બદલો (ગમે તે શહેરની પોસ્ટ, સર્વિસ એક્સપર્ટ અને દુકાનો જુઓ)'
            )}
          >
            <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="text-[10px] sm:text-xs font-extrabold truncate">
              {getLocalizedLocationButtonText(globalUserLocation, language)}
            </span>
            <span className="text-[9px] sm:text-[10px] text-teal-700 dark:text-teal-300 leading-none shrink-0">▾</span>
          </button>
        </div>
      </header>

      {/* Global Live Notification Banner across all screens when someone posts */}
      {globalPushToast && (
        <div
          onClick={() => {
            const targetIntent = globalPushToast.intent;
            setGlobalPushToast(null);
            if (targetIntent) {
              setActiveIntent(targetIntent);
              navigate('chat');
            } else {
              navigate('notifications');
            }
          }}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-indigo-950/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-indigo-400/40 flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-amber-300 truncate">{globalPushToast.title}</div>
            <div className="text-[11px] font-bold text-slate-100 truncate mt-0.5">{globalPushToast.body}</div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white text-[10px] font-black shrink-0">
            {tr('View', 'देखें', 'જુઓ')}
          </span>
        </div>
      )}

      {/* Main Page Content Area - Full Page with Safe Bottom Padding for FixedBottomNavBar */}
      <main
        className={
          currentScreen === 'admin'
            ? 'flex-1 w-full min-h-screen relative flex flex-col overflow-y-auto overflow-x-hidden'
            : 'flex-1 w-full h-full min-h-0 relative flex flex-col overflow-hidden overflow-x-hidden'
        }
        style={
          currentScreen !== 'admin' && currentScreen !== 'chat'
            ? { paddingBottom: 'calc(62px + env(safe-area-inset-bottom, 0px))' }
            : undefined
        }
      >
        {blockedAccountState.isBlocked && currentScreen !== 'admin' && currentScreen !== 'privacy' ? (
          <div className="flex-1 w-full h-full flex items-center justify-center p-4 bg-slate-950 text-white overflow-y-auto">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-rose-500/60 p-6 text-center shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center mx-auto text-3xl">
                🚫
              </div>
              <h2 className="text-lg sm:text-xl font-black text-rose-400">
                {tr(
                  'Your Account Has Been Blocked by Admin',
                  'आपका अकाउंट एडमिन द्वारा ब्लॉक कर दिया गया है',
                  'તમારું એકાઉન્ટ એડમિન દ્વારા બ્લોક કરવામાં આવ્યું છે'
                )}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-300 leading-relaxed">
                {blockedAccountState.reason ||
                  tr(
                    'Due to community policy violations or user reports, your account, posts, and profile access have been completely restricted.',
                    'समुदाय के नियमों के उल्लंघन या रिपोर्ट के कारण आपके अकाउंट, पोस्ट और प्रोफाइल पर 100% प्रतिबंध लगा दिया गया है।',
                    'સમુદાયના નિયમોના ઉલ્લંઘન અથવા યુઝર રિપોર્ટને કારણે તમારા એકાઉન્ટ પર ૧૦૦% પ્રતિબંધ મૂકવામાં આવ્યો છે.'
                  )}
              </p>
              <div className="rounded-2xl bg-rose-950/60 border border-rose-500/40 p-3.5 text-left space-y-1.5 text-xs font-bold text-rose-200">
                <div>• {tr('You cannot view profiles, posts, or directories.', 'आप प्रोफाइल या पोस्ट नहीं देख सकते।', 'તમે કોઈની પ્રોફાઈલ કે પોસ્ટ જોઈ શકશો નહીં.')}</div>
                <div>• {tr('You cannot create posts or send chat messages.', 'आप पोस्ट या चैट नहीं कर सकते।', 'તમે કોઈ નવી પોસ્ટ કે ચેટ મેસેજ કરી શકશો નહીં.')}</div>
                <div>• {tr('You cannot create a new account with this mobile number or email until Admin re-approves you.', 'जब तक एडमिन अनुमति नहीं देते, इस मोबाइल या ईमेल से नया अकाउंट नहीं बन सकता।', 'જ્યાં સુધી એડમિન ફરીથી મંજૂરી ન આપે ત્યાં સુધી આ મોબાઈલ કે ઈમેલથી નવું એકાઉન્ટ બની શકશે નહીં.')}</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentScreen === 'home' && (
              <HomeScreen 
                onNavigate={navigate} 
                onOpenChat={(intent) => { setActiveIntent(intent); navigate('chat'); }} 
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
              />
            )}
            {currentScreen === 'categories' && (
              <CategoriesScreen 
                onBack={() => navigate('home')}
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
                onOpenChat={(intent) => { setActiveIntent(intent); navigate('chat'); }}
              />
            )}
            {currentScreen === 'directory' && <SearchDirectoryScreen onBack={() => navigate('home')} onOpenChat={() => navigate('chat')} />}
            {currentScreen === 'chat' && (
              <ChatScreen
                intent={activeIntent}
                onIntentChange={setActiveIntent}
                onBack={() => navigate(prevScreen === 'profile' ? 'profile' : 'home')}
                onReport={() => setIsReportModalOpen(true)}
              />
            )}
            {currentScreen === 'notifications' && (
              <NotificationsScreen
                onBack={() => navigate('home')}
                onOpenChat={(intent) => {
                  setActiveIntent(intent);
                  navigate('chat');
                }}
              />
            )}
            {currentScreen === 'pro' && <ProScreen onBack={() => navigate('home')} />}
            {currentScreen === 'settings' && <SettingsMenu onNavigate={navigate} onBack={() => navigate('home')} />}
            {currentScreen === 'guidelines' && (
              <GuidelinesScreen
                onBack={() => navigate(prevScreen === 'settings' ? 'settings' : 'home')}
                onReport={() => setIsReportModalOpen(true)}
              />
            )}
            {currentScreen === 'privacy' && (
              <PrivacyPolicyScreen
                onBack={() => {
                  try {
                    window.history.pushState({ locohelpScreen: prevScreen === 'settings' ? 'settings' : 'home' }, '', '/');
                  } catch (e) {}
                  navigate(prevScreen === 'settings' ? 'settings' : 'home');
                }}
              />
            )}
            {currentScreen === 'roadmap' && <RoadmapScreen onBack={() => navigate('home')} />}
            {currentScreen === 'support' && <SupportScreen onBack={() => navigate('home')} />}
            {currentScreen === 'profile' && (
              <ProfileScreen
                onBack={() => navigate('home')}
                onNavigate={navigate}
                onOpenChat={(intent) => {
                  setActiveIntent(intent);
                  navigate('chat');
                }}
              />
            )}
            {currentScreen === 'mesh' && <MeshScreen onBack={() => navigate('settings')} />}
            {currentScreen === 'leaderboard' && <LeaderboardScreen onBack={() => navigate('home')} />}
            {currentScreen === 'professionals' && <ProfessionalsScreen onBack={() => navigate('home')} onHire={() => navigate('chat')} />}
            {currentScreen === 'admin' && (
              <AdminDashboard
                onBack={() => {
                  try {
                    window.history.pushState({ locohelpScreen: 'home' }, '', '/');
                  } catch (e) {}
                  setCurrentScreen('home');
                }}
              />
            )}
            {currentScreen === 'not_found' && (
              <NotFoundScreen
                onBackToHome={() => {
                  try {
                    window.history.pushState({ locohelpScreen: 'home' }, '', '/');
                  } catch (e) {}
                  navigate('home');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar (હોમ | મારી બુકિંગ | પસંદીદા | સંદેશ | વધુ) */}
      {!blockedAccountState.isBlocked && currentScreen !== 'admin' && !(currentScreen === 'chat' && activeIntent) && (
        <FixedBottomNavBar
          currentScreen={currentScreen}
          unreadChatCount={unreadChatCount}
          onNavigate={navigate}
          onSelectCategory={handleSelectCategory}
          onOpenChat={(intent) => {
            setActiveIntent(intent || null);
            navigate('chat');
          }}
          onOpenProfile={handleGlobalProfileClick}
          onOpenLogin={() => setIsGlobalLoginOpen(true)}
          onLogout={async () => {
            await logoutUser();
            setAuthTick((n) => n + 1);
            window.dispatchEvent(new Event('storage'));
            if (currentScreen === 'profile') {
              navigate('home');
            }
          }}
        />
      )}

      {/* Global Pan-India Location Modal accessible from the top header on any screen */}
      <PanIndiaLocationModal
        isOpen={isGlobalLocationOpen}
        onClose={() => setIsGlobalLocationOpen(false)}
        currentLocation={globalUserLocation}
        onLocationSaved={(newLoc) => {
          setGlobalUserLocation(newLoc);
          window.dispatchEvent(new CustomEvent('locohelp_location_changed', { detail: newLoc }));
        }}
      />

      {/* Global Login Prompt Modal accessible from the top header 3-dot menu on any screen */}
      <LoginPromptModal
        isOpen={isGlobalLoginOpen}
        onClose={() => setIsGlobalLoginOpen(false)}
        onGoToLogin={() => navigate('login')}
        onSuccess={() => {
          setAuthTick((n) => n + 1);
          setIsGlobalLoginOpen(false);
        }}
        actionTitleEn="Sign In to LocoHelp"
        actionTitleHi="LocoHelp में लॉगिन करें"
        actionTitleGu="LocoHelp માં લોગિન કરો"
      />

      {/* Modals */}
      {isReportModalOpen && (
        <ReportModal
          onClose={() => {
            setIsReportModalOpen(false);
            setReportTarget({});
          }}
          reportedUserId={reportTarget.reportedUserId}
          reportedUserName={reportTarget.reportedUserName}
          reportedPostId={reportTarget.reportedPostId}
          reportedPostTitle={reportTarget.reportedPostTitle}
        />
      )}
    </div>
  );
}

