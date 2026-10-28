import React, { useState, useEffect } from 'react';
import { Screen, Intent } from './types';
import { LanguageProvider, useLanguage, SUPPORTED_LANGUAGES } from './i18n';
import { logoutUser, ensureProfileExists, onAuthStateChange, restoreSessionFromServer, getCurrentUser } from './auth';
import { syncBrowserDataToPostgres } from './api';
import { isGuestUser } from './lib/authUtils';
import LocoHelpLogo from './components/LocoHelpLogo';
import PanIndiaLocationModal from './components/PanIndiaLocationModal';
import LoginPromptModal from './components/LoginPromptModal';
import { getSavedUserLocation, UserManualLocation } from './data/panIndiaLocations';
import { motion, AnimatePresence } from 'motion/react';
// import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ProScreen from './screens/ProScreen';
import SettingsMenu from './screens/SettingsMenu';
import GuidelinesScreen from './screens/GuidelinesScreen';
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

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

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

      // If root path
      if (!path || path === '') {
        if (hash) {
          const cleanHash = hash.replace(/^#\/?/, '');
          if (['privacy', 'delete-account', 'about', 'features', 'contact'].includes(cleanHash)) {
            return 'settings';
          }
          if (cleanHash === 'terms') {
            return 'guidelines';
          }
          const validScreens: Screen[] = [
            'home', 'categories', 'directory', 'chat', 'notifications',
            'pro', 'settings', 'guidelines', 'roadmap', 'profile',
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
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Track SPA virtual page views in Google Analytics 4 (privacy-safe, deduplicated)
  useEffect(() => {
    trackSpaPageView(currentScreen, selectedCategory);
  }, [currentScreen, selectedCategory]);

  // Auto-migrate any existing localStorage data and restore persistent JWT/cookie session on startup
  useEffect(() => {
    restoreSessionFromServer();
    syncBrowserDataToPostgres();
  }, []);

  // Listen to URL changes for '/bapu-admin' and invalid routes
  useEffect(() => {
    const handleRouteChange = () => {
      const targetScreen = getScreenFromRoute();
      if (targetScreen === 'admin' || targetScreen === 'not_found') {
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

  // Initialize base history entry and arm on user gesture so mobile Chrome/Android Back button never exits the website
  const historyGuardArmedRef = React.useRef(false);
  useEffect(() => {
    try {
      const initialScreen = checkAdminRoute() ? 'admin' : 'home';
      window.history.replaceState({ locohelpScreen: initialScreen, locohelpBase: true }, '');
      window.history.pushState({ locohelpScreen: initialScreen }, '');
    } catch (e) {}

    const armUserGestureHistoryGuard = () => {
      if (historyGuardArmedRef.current) return;
      historyGuardArmedRef.current = true;
      try {
        const activeScr = checkAdminRoute() ? 'admin' : 'home';
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
            : currentScreen === 'guidelines' && prevScreen === 'settings'
            ? 'settings'
            : 'home';
        if (targetBackScreen === 'home') {
          setPrevScreen('home');
        } else {
          setPrevScreen('home');
        }
        setCurrentScreen(targetBackScreen);
        try {
          window.history.pushState({ locohelpScreen: targetBackScreen }, '');
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
        window.history.pushState({ locohelpScreen: screen }, '');
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
      {/* GLOBAL FIXED TOP HEADER BANNER: Always visible across all screens, modals, popups, and Admin Panel */}
      <header
        className="sticky top-0 z-50 shrink-0 h-[52px] min-h-[52px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs px-2 md:px-5 py-1.5 flex items-center justify-between gap-1.5 md:gap-3 lg:gap-4 w-full max-w-full box-border"
        style={{ position: 'sticky', top: 0, zIndex: 9999, overflow: 'visible' }}
      >
        {/* 1. Language Selector Dropdown (ગુજરાતી / हिन्दी / English) */}
        <div className="relative flex-shrink-0" style={{ overflow: 'visible' }}>
          <button
            type="button"
            onClick={() => {
              setIsGlobalMenuOpen(false);
              setIsGlobalLangOpen((prev) => !prev);
            }}
            className="flex items-center gap-1 px-2.5 md:px-3 py-1 md:py-1.5 bg-white dark:bg-slate-800 rounded-full hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 active:scale-95 cursor-pointer text-xs"
            title={tr('Select Language', 'भाषा चुनें', 'ભાષા પસંદ કરો')}
          >
            <span className="text-xs leading-none shrink-0">🌐</span>
            <span className="text-xs font-black text-stone-800 dark:text-slate-200 whitespace-nowrap md:hidden">
              {language === 'GU' ? 'ગુજ' : language === 'HI' ? 'हिं' : 'EN'}
            </span>
            <span className="hidden md:inline text-xs font-black text-stone-800 dark:text-slate-200 whitespace-nowrap">
              {currentLangObj.nativeName}
            </span>
            <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 leading-none shrink-0">▾</span>
          </button>

          <AnimatePresence>
            {isGlobalLangOpen && (
              <>
                <div
                  className="fixed inset-0 z-50"
                  style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
                  onClick={() => setIsGlobalLangOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="w-44 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 space-y-1"
                  style={{ position: 'fixed', top: '54px', left: '8px', zIndex: 10005 }}
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

        {/* 2. Official LocoHelp Logo & Brand Typography */}
        <div
          onClick={() => {
            setIsGlobalLangOpen(false);
            setIsGlobalMenuOpen(false);
            setIsGlobalLocationOpen(false);
            setIsGlobalLoginOpen(false);
            window.dispatchEvent(new CustomEvent('locohelp_close_all_modals'));
            handleSelectCategory('all');
            if (currentScreen === 'admin') {
              try {
                window.history.pushState({ locohelpScreen: 'home' }, '', '/');
              } catch {}
            }
            navigate('home');
          }}
          className="flex-shrink-0 flex items-center justify-center select-none cursor-pointer py-0.5"
          title="LocoHelp Home"
        >
          <LocoHelpLogo size={28} showText={true} textSize="sm" className="flex-shrink-0" />
        </div>

        {/* 3. Right Side: [Compact Location Badge] -> [3-Dot Menu ⋮] */}
        <div className="flex items-center gap-1.5 md:gap-3 lg:gap-4 flex-shrink-0" style={{ overflow: 'visible' }}>
          <button
            type="button"
            onClick={() => {
              setIsGlobalMenuOpen(false);
              setIsGlobalLangOpen(false);
              setIsGlobalLocationOpen(true);
            }}
            className="flex items-center gap-1 px-2 md:px-3.5 py-1 md:py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 transition-all shadow-2xs active:scale-95 cursor-pointer max-w-[95px] md:max-w-none shrink-0 text-xs"
            title={tr('Select Location (Pan-India)', 'लोकेशन चुनें (पूरा भारत)', 'લોકેશન પસંદ કરો (સમગ્ર ભારત)')}
          >
            <span className="text-xs shrink-0">📍</span>
            <span className="text-xs font-black truncate md:overflow-visible md:whitespace-nowrap">
              {globalUserLocation.district || tr('Location', 'लोकेशन', 'લોકેશન')}
            </span>
          </button>

          {/* 3-Dot Menu (⋮) */}
          <div className="relative flex-shrink-0" style={{ overflow: 'visible' }}>
            <button
              type="button"
              onClick={() => {
                setIsGlobalLangOpen(false);
                setIsGlobalMenuOpen((prev) => !prev);
              }}
              className="w-7 h-7 sm:w-9 sm:h-9 p-1 sm:p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer shrink-0 flex items-center justify-center active:scale-95"
              title={tr('Menu (Profile, Settings, Sign In)', 'मेनू (प्रोफ़ाइल, सेटिंग्स, लॉगिन)', 'મેનુ (પ્રોફાઇલ, સેટિંગ્સ, લોગિન)')}
              aria-label="Open menu"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800 dark:text-slate-200 shrink-0" />
            </button>

            <AnimatePresence>
              {isGlobalMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-50"
                    style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
                    onClick={() => setIsGlobalMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 space-y-1"
                    style={{ position: 'fixed', top: '54px', right: '8px', zIndex: 10005 }}
                  >
                    {/* Option 1: Profile */}
                    <button
                      type="button"
                      onClick={handleGlobalProfileClick}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    >
                      <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>{tr('Profile', 'प्रोफ़ाइल', 'પ્રોફાઇલ')}</span>
                    </button>

                    {/* Option 2: Notifications */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsGlobalMenuOpen(false);
                        navigate('notifications');
                      }}
                      className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>{tr('Notifications', 'नोटिफिकेशन', 'નોટિફિકેશન')}</span>
                      </div>
                    </button>

                    {/* Option 3: Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsGlobalMenuOpen(false);
                        navigate('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    >
                      <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>{tr('Settings', 'सेटिंग्स', 'સેટિંગ્સ')}</span>
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-0.5" />

                    {/* Option 4: Sign In / Login or Log Out */}
                    {isGuestUser() ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsGlobalMenuOpen(false);
                          setIsGlobalLoginOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <LogIn className="w-4 h-4 shrink-0" />
                        <span>{tr('Sign In / Login', 'लॉगिन / साइन इन', 'લોગિન / સાઇન ઇન')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsGlobalMenuOpen(false);
                          await logoutUser();
                          setAuthTick((n) => n + 1);
                          window.dispatchEvent(new Event('storage'));
                          if (currentScreen === 'profile') {
                            navigate('home');
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>{tr('Log Out', 'लॉग आउट', 'લોગ આઉટ')}</span>
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Page Content Area - Full Page */}
      <main
        className={
          currentScreen === 'admin'
            ? 'flex-1 w-full min-h-screen relative flex flex-col overflow-y-auto overflow-x-hidden'
            : 'flex-1 w-full h-full min-h-0 relative flex flex-col overflow-hidden overflow-x-hidden'
        }
      >
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
      </main>

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
      {isReportModalOpen && <ReportModal onClose={() => setIsReportModalOpen(false)} />}
    </div>
  );
}

