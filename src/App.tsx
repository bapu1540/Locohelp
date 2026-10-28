import React, { useState, useEffect } from 'react';
import { Screen, Intent } from './types';
import { LanguageProvider, useLanguage, SUPPORTED_LANGUAGES } from './i18n';
import { logoutUser, ensureProfileExists, onAuthStateChange, restoreSessionFromServer } from './auth';
import { syncBrowserDataToPostgres } from './api';
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
  Store
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
  const { language, setLanguage, t } = useLanguage();

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

      // 1. Close ReportModal if open
      if (isReportModalOpen) {
        setIsReportModalOpen(false);
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
  }, [currentScreen, prevScreen, isReportModalOpen, selectedCategory]);

  const navigate = (screen: Screen) => {
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

  return (
    <div
      className={
        currentScreen === 'admin'
          ? 'min-h-screen w-full bg-[#090D16] text-slate-100 font-sans antialiased flex flex-col overflow-y-auto overflow-x-hidden'
          : 'h-dvh w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col overflow-hidden overflow-x-hidden'
      }
    >

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

      {/* Modals */}
      {isReportModalOpen && <ReportModal onClose={() => setIsReportModalOpen(false)} />}
    </div>
  );
}

