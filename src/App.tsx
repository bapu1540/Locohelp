import React, { useState, useEffect } from 'react';
import { Screen, Intent } from './types';
import { LanguageProvider, useLanguage, SUPPORTED_LANGUAGES } from './i18n';
import { supabase, logoutUser, ensureProfileExists } from './supabase';
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

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { language, setLanguage, t } = useLanguage();
  // Directly open main page (home) so anyone can freely browse immediately without being stopped by a login screen
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const [activeIntent, setActiveIntent] = useState<Intent | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  


  // Listen to Supabase Auth state for seamless persistent login
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const u = session.user;
          // Auto-create profile if missing
          await ensureProfileExists(u);
          const userData = {
            uid: u.id,
            displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Supabase User',
            email: u.email || '',
            photoURL: u.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user',
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

  const navigate = (screen: Screen) => {
    setPrevScreen(currentScreen);
    if (screen === 'login' as any) {
      logoutUser().then(() => {
        setCurrentScreen('home');
      });
      return;
    }

    setCurrentScreen(screen);
  };

  const topHelpers = getFreeHelperProfiles().slice(0, 4);

  return (
    <div className="min-h-screen h-dvh w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col overflow-x-hidden">

      {/* Main Page Content Area - Now Full Page */}
      <main className="flex-1 w-full h-full min-h-0 relative flex flex-col overflow-hidden">
        {currentScreen === 'home' && (
          <HomeScreen 
            onNavigate={navigate} 
            onOpenChat={(intent) => { setActiveIntent(intent); navigate('chat'); }} 
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}
        {currentScreen === 'categories' && (
          <CategoriesScreen 
            onBack={() => navigate('home')}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onOpenChat={(intent) => { setActiveIntent(intent); navigate('chat'); }}
          />
        )}
        {currentScreen === 'directory' && <SearchDirectoryScreen onBack={() => navigate('home')} onOpenChat={() => navigate('chat')} />}
        {currentScreen === 'chat' && <ChatScreen intent={activeIntent} onBack={() => navigate('home')} onReport={() => setIsReportModalOpen(true)} />}
        {currentScreen === 'notifications' && <NotificationsScreen onBack={() => navigate('home')} />}
        {currentScreen === 'pro' && <ProScreen onBack={() => navigate('home')} />}
        {currentScreen === 'settings' && <SettingsMenu onNavigate={navigate} onBack={() => navigate('home')} />}
        {currentScreen === 'guidelines' && <GuidelinesScreen onBack={() => navigate('settings')} />}
        {currentScreen === 'roadmap' && <RoadmapScreen onBack={() => navigate(prevScreen === 'settings' ? 'settings' : 'home')} />}
        {currentScreen === 'profile' && <ProfileScreen onBack={() => navigate('home')} onNavigate={navigate} />}
        {currentScreen === 'support' && <SupportScreen onBack={() => navigate('settings')} />}
        {currentScreen === 'mesh' && <MeshScreen onBack={() => navigate('settings')} />}
        {currentScreen === 'leaderboard' && <LeaderboardScreen onBack={() => navigate('home')} />}
        {currentScreen === 'professionals' && <ProfessionalsScreen onBack={() => navigate('home')} onHire={() => navigate('chat')} />}
        {currentScreen === 'admin' && <AdminDashboard onBack={() => navigate('settings')} />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t('footer.copyright').replace('{year}', new Date().getFullYear().toString())}</span>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => navigate('guidelines')} className="hover:text-slate-300">{t('footer.guidelines')}</button>
            <button onClick={() => navigate('roadmap')} className="hover:text-slate-300">{t('footer.roadmap')}</button>
            <button onClick={() => navigate('support')} className="hover:text-slate-300">{t('footer.support')}</button>
            <button onClick={() => navigate('admin')} className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer">🛡️ {t('footer.admin')}</button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isReportModalOpen && <ReportModal onClose={() => setIsReportModalOpen(false)} />}
    </div>
  );
}

