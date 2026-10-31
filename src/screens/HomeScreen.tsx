import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Screen, Intent, Language } from '../types';
import { Settings, Bell, Zap, Search, Globe, Clock, MapPin, Rocket, User, Trophy, Wrench, Filter, Star, UserCheck, MessageSquare, Plus, Check, X, Share2, MessageCircle, HelpCircle, Smartphone, RefreshCw, ChevronDown, ChevronRight, Sparkles, Trash2, Shield, ShieldAlert, MoreVertical, LogIn, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { getCurrentUser, onAuthStateChange, getHelpers, getShops, logoutUser } from '../auth';
import { CATEGORIES, MASTER_CATEGORIES, getCategoryName, getFreeHelperProfiles } from '../data/categories';
import UserProfileModal from './UserProfileModal';
import AppGuideModal from './AppGuideModal';
import PostIntentSheet from './PostIntentSheet';
import ChatScreen from './ChatScreen';
import { fetchLiveIntents, deleteIntentOnServer, getCachedCategoryImages, fetchCategoryImages, subscribeToRealtimeStream } from '../api';
import AdBannerSection from '../components/AdBannerSection';
import LocoHelpLogo from '../components/LocoHelpLogo';
import RegisterShopModal from '../components/RegisterShopModal';
import LoginPromptModal from '../components/LoginPromptModal';
import JobPortalSection from '../components/JobPortalSection';
import JobSeekerModal from '../components/JobSeekerModal';
import EmployerVacancyModal from '../components/EmployerVacancyModal';
import JobPortalBrowseModal from '../components/JobPortalBrowseModal';
import FreeHelperRegisterModal from '../components/FreeHelperRegisterModal';
import PostResponsesModal from '../components/PostResponsesModal';
import PanIndiaLocationModal from '../components/PanIndiaLocationModal';
import { getSavedUserLocation, getConnectedTwinDistricts, UserManualLocation } from '../data/panIndiaLocations';
import { isGuestUser } from '../lib/authUtils';
import { requestAndRegisterFcmToken, subscribeToForegroundPushMessages } from '../lib/firebase';
import InstallAppModal from '../components/InstallAppModal';
import RedWarningTicker from '../components/RedWarningTicker';
import PublicSuggestionsBanner from '../components/PublicSuggestionsBanner';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  onOpenChat: (intent?: any) => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export default function HomeScreen({ 
  onNavigate, 
  onOpenChat,
  selectedCategory = 'all',
  onSelectCategory
}: HomeScreenProps) {
  const { language, setLanguage, t, tr } = useLanguage();
  const [isHomeCategoryDropdownOpen, setIsHomeCategoryDropdownOpen] = useState(false);
  const [isPostSheetOpen, setIsPostSheetOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [loginPromptTitle, setLoginPromptTitle] = useState<{ en: string; hi: string; gu?: string }>({
    en: 'Sign In Required',
    hi: 'लॉगिन आवश्यक है',
    gu: 'લોગિન જરૂરી છે'
  });
  const [loginPromptDesc, setLoginPromptDesc] = useState<{ en?: string; hi?: string; gu?: string }>({});
  const [loginSuccessAction, setLoginSuccessAction] = useState<(() => void) | undefined>(undefined);
  const [intents, setIntents] = useState<Intent[]>([]);
  const initialLoadRef = useRef(true);
  const previousCountRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Real-Time Search & Voice Search States across Entire Website
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [selectedUserForProfile, setSelectedUserForProfile] = useState<{ name: string; distance: number } | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [createdToast, setCreatedToast] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPostAdModalOpen, setIsPostAdModalOpen] = useState(false);
  const [isRegisterShopModalOpen, setIsRegisterShopModalOpen] = useState(false);
  const [isFreeHelperModalOpen, setIsFreeHelperModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [selectedIntentForResponses, setSelectedIntentForResponses] = useState<Intent | null>(null);
  const [isResponsesModalOpen, setIsResponsesModalOpen] = useState(false);
  const [isInstallAppModalOpen, setIsInstallAppModalOpen] = useState(false);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>(() => getCachedCategoryImages());

  // In-Place Broadcast Post Chat Modal State
  const [chatModalIntent, setChatModalIntent] = useState<Intent | null>(null);

  // Response badge & chatted post tracking states
  const [seenResponsesTick, setSeenResponsesTick] = useState(0);
  const [chattedPostIds, setChattedPostIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('locohelp_chatted_post_ids') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleResponsesSeen = () => setSeenResponsesTick(prev => prev + 1);
    const handleChattedUpdated = () => {
      try {
        setChattedPostIds(JSON.parse(localStorage.getItem('locohelp_chatted_post_ids') || '[]'));
      } catch {}
    };
    window.addEventListener('locohelp_responses_seen', handleResponsesSeen);
    window.addEventListener('locohelp_chatted_posts_updated', handleChattedUpdated);
    window.addEventListener('storage', handleResponsesSeen);
    return () => {
      window.removeEventListener('locohelp_responses_seen', handleResponsesSeen);
      window.removeEventListener('locohelp_chatted_posts_updated', handleChattedUpdated);
      window.removeEventListener('storage', handleResponsesSeen);
    };
  }, []);

  useEffect(() => {
    const syncCatImages = () => {
      fetchCategoryImages().then(imgs => {
        if (imgs && typeof imgs === 'object') {
          setCategoryImages(imgs);
        }
      }).catch(() => {});
      // Also auto-sync & recover any local helper/shop profiles with backend server
      getHelpers(false).catch(() => {});
      getShops(false).catch(() => {});
    };
    syncCatImages();
    window.addEventListener('locohelp_category_images_updated', syncCatImages);
    window.addEventListener('storage', syncCatImages);
    return () => {
      window.removeEventListener('locohelp_category_images_updated', syncCatImages);
      window.removeEventListener('storage', syncCatImages);
    };
  }, []);

  const [reportFilterTick, setReportFilterTick] = useState(0);
  useEffect(() => {
    const handleReportSubmitted = (e: Event) => {
      setReportFilterTick(prev => prev + 1);
      const detail = (e as CustomEvent)?.detail;
      if (detail?.reportedPostId && (detail?.blocked || detail?.autoFlaggedPost)) {
        setIntents(prev => prev.filter(item => item.id !== detail.reportedPostId));
      }
      if (detail?.reportedUserId && (detail?.blocked || detail?.autoFlaggedUser)) {
        setIntents(prev => prev.filter(item => item.authorId !== detail.reportedUserId));
      }
    };
    window.addEventListener('locohelp_report_submitted', handleReportSubmitted);
    return () => window.removeEventListener('locohelp_report_submitted', handleReportSubmitted);
  }, []);

  const handleInstallAppClick = async () => {
    const promptEvent = (window as any).__deferredPwaPrompt;
    if (promptEvent && typeof promptEvent.prompt === 'function') {
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          (window as any).__deferredPwaPrompt = null;
          return;
        }
      } catch (err) {
        // Fallback to InstallAppModal
      }
    }
    setIsInstallAppModalOpen(true);
  };

  // Active logged-in user state (automatically synced with Supabase Auth and localStorage)
  const [activeUser, setActiveUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = {
          uid: session.user.id,
          displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Community Member',
          email: session.user.email || '',
          photoURL: session.user.user_metadata?.avatar_url || undefined
        };
        setActiveUser(u);
        try {
          if (u) {
            localStorage.setItem('locohelp_user', JSON.stringify(u));
            localStorage.setItem('locohelp_logged_in', 'true');
          }
        } catch (e) {
          console.error("Home session sync error:", e);
        }
      } else {
        setActiveUser(getCurrentUser());
      }
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Job Portal Modal States (Job Seeker, Employer Vacancy & Live Browse)
  const [isJobSeekerModalOpen, setIsJobSeekerModalOpen] = useState(false);
  const [seekerModalInitialTab, setSeekerModalInitialTab] = useState<'registered' | 'new'>('registered');
  const [isEmployerVacancyModalOpen, setIsEmployerVacancyModalOpen] = useState(false);
  const [employerModalInitialTab, setEmployerModalInitialTab] = useState<'browse' | 'new' | 'registered'>('browse');
  const [isJobBrowseModalOpen, setIsJobBrowseModalOpen] = useState(false);
  const [jobBrowseInitialTab, setJobBrowseInitialTab] = useState<'all' | 'employer_vacancy' | 'job_seeker'>('all');

  // Manual Pan-India User Location State (Persistent in localStorage & user profile)
  const [userLocation, setUserLocation] = useState<UserManualLocation>(() => getSavedUserLocation());
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    const handleLocationChanged = (e: any) => {
      if (e?.detail?.district) {
        setUserLocation(e.detail);
      } else {
        setUserLocation(getSavedUserLocation());
      }
    };
    window.addEventListener('locohelp_location_changed', handleLocationChanged);
    return () => window.removeEventListener('locohelp_location_changed', handleLocationChanged);
  }, []);

  // ==========================================
  // FIREBASE CLOUD MESSAGING (FCM) WEB PUSH NOTIFICATIONS
  // ==========================================
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [pushBannerDismissed, setPushBannerDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('locohelp_push_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  const syncUserPushToken = async (silentIfDefault: boolean) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (isGuestUser()) return;

    const currentUser = activeUser || getCurrentUser();
    if (!currentUser || !currentUser.uid || currentUser.uid === 'guest_user') return;

    const areaName = (userLocation?.area || '').trim();
    const cityName = (userLocation?.district || '').trim();
    const stateName = (userLocation?.state || '').trim();
    const fullLocation = [areaName, cityName, stateName].filter(Boolean).join(', ') || 'Local Area';

    const res = await requestAndRegisterFcmToken({
      area: areaName || cityName || 'Local Area',
      city: cityName,
      district: cityName,
      state: stateName,
      location: fullLocation,
      userId: currentUser.uid,
      email: currentUser.email,
      name: currentUser.displayName,
      silentIfDefault
    });

    if (res.permission) {
      setNotifPermission(res.permission);
    } else if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
    return res;
  };

  // Automatically request / sync FCM token when a logged-in user visits the dashboard or updates their location
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setNotifPermission(Notification.permission);
    if (isGuestUser()) return;

    if (Notification.permission === 'granted') {
      syncUserPushToken(true).catch(() => {});
    } else if (Notification.permission === 'default') {
      // Attempt non-blocking permission request on dashboard visit for browsers that allow it
      syncUserPushToken(false).catch(() => {});
    }
  }, [activeUser?.uid, activeUser?.email, userLocation?.district, userLocation?.area]);

  // Listen for foreground FCM push notifications while dashboard is open
  useEffect(() => {
    let unsub: (() => void) | null = null;
    subscribeToForegroundPushMessages((msg) => {
      setCreatedToast(`${msg.title} — ${msg.body}`);
      setTimeout(() => setCreatedToast(null), 6000);
      fetchLiveIntents()
        .then((fresh) => {
          if (Array.isArray(fresh) && fresh.length > 0) {
            setIntents(fresh);
          }
        })
        .catch(() => {});
    }).then((fn) => {
      unsub = fn;
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // If user tapped a background push notification (?postId=...&viewResponses=1), highlight or open responses
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get('postId');
      const viewResp = params.get('viewResponses');
      if (pid) {
        setNewlyCreatedId(pid);
        if (viewResp === '1' && intents.length > 0) {
          const found = intents.find(i => i.id === pid);
          if (found) {
            setSelectedIntentForResponses(found);
            setIsResponsesModalOpen(true);
          }
        }
      }
    } catch {}
  }, [intents.length]);

  const handleEnablePushAlertsClick = async () => {
    if (isGuestUser()) {
      setLoginPromptTitle({
        en: 'Sign In to Enable Local Alerts 🔔',
        hi: 'लोकल अलर्ट चालू करने के लिए लॉगिन करें 🔔',
        gu: 'લોકલ એલર્ટ ચાલુ કરવા માટે લોગિન કરો 🔔'
      });
      setLoginPromptDesc({
        en: 'Sign in so we can send you instant background notifications whenever someone needs help or a service in your area.',
        hi: 'लॉगिन करें ताकि जब भी आपके इलाके में किसी को मदद या सर्विस की ज़रूरत हो, आपको तुरंत नोटिफिकेशन मिल सके।',
        gu: 'લોગિન કરો જેથી તમારા વિસ્તારમાં જ્યારે પણ કોઈને મદદ કે સર્વિસની જરૂર હોય ત્યારે તમને તુરંત નોટિફિકેશન મળી શકે.'
      });
      setIsLoginPromptOpen(true);
      return;
    }

    setIsEnablingPush(true);
    try {
      const res = await syncUserPushToken(false);
      if (res && res.permission === 'granted') {
        setNotifPermission('granted');
        setPushBannerDismissed(true);
        setCreatedToast(
          language === 'EN'
            ? `🔔 Local Alerts enabled for ${userLocation.area || userLocation.district || 'your area'}!`
            : language === 'GU'
            ? `🔔 ${userLocation.area || userLocation.district || 'તમારા વિસ્તાર'} માટે લોકલ એલર્ટ ચાલુ થઈ ગયા!`
            : `🔔 ${userLocation.area || userLocation.district || 'आपके इलाके'} के लिए लोकल अलर्ट चालू हो गए हैं!`
        );
        setTimeout(() => setCreatedToast(null), 4000);
      } else if (res && res.permission === 'denied') {
        setNotifPermission('denied');
        setCreatedToast(
          language === 'EN'
            ? '⚠️ Notifications are blocked in your browser settings. Please allow notifications for this site.'
            : language === 'GU'
            ? '⚠️ બ્રાઉઝર સેટિંગ્સમાં નોટિફિકેશન બ્લોક છે. કૃપા કરીને તેને Allow કરો.'
            : '⚠️ आपके ब्राउज़र सेटिंग्स में नोटिफिकेशन ब्लॉक हैं। कृपया इस साइट के लिए Allow करें।'
        );
        setTimeout(() => setCreatedToast(null), 5000);
      }
    } finally {
      setIsEnablingPush(false);
    }
  };

  // Push browser history state whenever any modal / popup / chat inbox opens on HomeScreen
  const isAnyHomeModalOpen = Boolean(
    chatModalIntent ||
    isPostSheetOpen ||
    isLangModalOpen ||
    isLoginPromptOpen ||
    selectedUserForProfile ||
    isGuideOpen ||
    isPostAdModalOpen ||
    isRegisterShopModalOpen ||
    isFreeHelperModalOpen ||
    postToDelete ||
    isResponsesModalOpen ||
    isLocationModalOpen ||
    isJobSeekerModalOpen ||
    isEmployerVacancyModalOpen ||
    isJobBrowseModalOpen ||
    isHomeCategoryDropdownOpen ||
    isHeaderMenuOpen
  );

  const prevModalOpenRef = useRef(false);
  useEffect(() => {
    if (isAnyHomeModalOpen && !prevModalOpenRef.current) {
      try {
        window.history.pushState({ locohelpScreen: 'home', locohelpModal: true }, '');
      } catch (e) {}
    }
    prevModalOpenRef.current = isAnyHomeModalOpen;
  }, [isAnyHomeModalOpen]);

  useEffect(() => {
    const handleCloseActiveModal = (e: Event) => {
      if (chatModalIntent) { e.preventDefault(); setChatModalIntent(null); return; }
      if (postToDelete) { e.preventDefault(); setPostToDelete(null); return; }
      if (isLoginPromptOpen) { e.preventDefault(); setIsLoginPromptOpen(false); return; }
      if (isResponsesModalOpen) { e.preventDefault(); setIsResponsesModalOpen(false); return; }
      if (isPostSheetOpen) { e.preventDefault(); setIsPostSheetOpen(false); return; }
      if (isLocationModalOpen) { e.preventDefault(); setIsLocationModalOpen(false); return; }
      if (isRegisterShopModalOpen) { e.preventDefault(); setIsRegisterShopModalOpen(false); return; }
      if (isFreeHelperModalOpen) { e.preventDefault(); setIsFreeHelperModalOpen(false); return; }
      if (isJobSeekerModalOpen) { e.preventDefault(); setIsJobSeekerModalOpen(false); return; }
      if (isEmployerVacancyModalOpen) { e.preventDefault(); setIsEmployerVacancyModalOpen(false); return; }
      if (isJobBrowseModalOpen) { e.preventDefault(); setIsJobBrowseModalOpen(false); return; }
      if (isPostAdModalOpen) { e.preventDefault(); setIsPostAdModalOpen(false); return; }
      if (selectedUserForProfile) { e.preventDefault(); setSelectedUserForProfile(null); return; }
      if (isGuideOpen) { e.preventDefault(); setIsGuideOpen(false); return; }
      if (isLangModalOpen) { e.preventDefault(); setIsLangModalOpen(false); return; }
      if (isHeaderMenuOpen) { e.preventDefault(); setIsHeaderMenuOpen(false); return; }
      if (isHomeCategoryDropdownOpen) { e.preventDefault(); setIsHomeCategoryDropdownOpen(false); return; }
      if (homeSearchQuery.trim()) { e.preventDefault(); setHomeSearchQuery(''); return; }
    };
    const handleCloseAllModals = () => {
      setChatModalIntent(null);
      setPostToDelete(null);
      setIsLoginPromptOpen(false);
      setIsResponsesModalOpen(false);
      setIsPostSheetOpen(false);
      setIsLocationModalOpen(false);
      setIsRegisterShopModalOpen(false);
      setIsFreeHelperModalOpen(false);
      setIsJobSeekerModalOpen(false);
      setIsEmployerVacancyModalOpen(false);
      setIsJobBrowseModalOpen(false);
      setIsPostAdModalOpen(false);
      setSelectedUserForProfile(null);
      setIsGuideOpen(false);
      setIsLangModalOpen(false);
      setIsHeaderMenuOpen(false);
      setIsHomeCategoryDropdownOpen(false);
    };
    window.addEventListener('locohelp_close_active_modal', handleCloseActiveModal);
    window.addEventListener('locohelp_close_all_modals', handleCloseAllModals);
    return () => {
      window.removeEventListener('locohelp_close_active_modal', handleCloseActiveModal);
      window.removeEventListener('locohelp_close_all_modals', handleCloseAllModals);
    };
  }, [
    postToDelete,
    isLoginPromptOpen,
    isResponsesModalOpen,
    isPostSheetOpen,
    isLocationModalOpen,
    isRegisterShopModalOpen,
    isFreeHelperModalOpen,
    isJobSeekerModalOpen,
    isEmployerVacancyModalOpen,
    isJobBrowseModalOpen,
    isPostAdModalOpen,
    selectedUserForProfile,
    isGuideOpen,
    isLangModalOpen,
    isHeaderMenuOpen,
    isHomeCategoryDropdownOpen,
    homeSearchQuery
  ]);

  // Static reference coordinates for relative distance badge calculation (No browser GPS tracking)
  const [gpsCoords] = useState<{ lat: number; lng: number; active: boolean }>({
    lat: 23.0225,
    lng: 72.5714,
    active: false
  });
  const [gpsNotificationToast, setGpsNotificationToast] = useState<string | null>(null);

  const getGpsDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  const handleSafeOpenChat = (intent?: any) => {
    if (isGuestUser()) {
      setLoginPromptTitle({
        en: 'Sign In Required to Chat',
        hi: 'चैट करने के लिए लॉगिन करें',
        gu: 'ચેટ કરવા માટે લોગિન કરો'
      });
      setLoginPromptDesc({
        en: 'Connect directly with local service experts and neighbors. Sign in with Email OTP or Password!',
        hi: 'पड़ोसियों और सर्विस एक्सपर्ट्स से चैट करने के लिए ईमेल OTP या पासवर्ड से लॉगिन करें।',
        gu: 'સ્થાનિક સર્વિસ એક્સપર્ટ્સ અને પાડોશીઓ સાથે વાત કરવા માટે ઈમેલ OTP અથવા પાસવર્ડથી લોગિન કરો!'
      });
      setLoginSuccessAction(() => () => setChatModalIntent(intent || null));
      setIsLoginPromptOpen(true);
      return;
    }
    setChatModalIntent(intent || null);
  };

  const handleSafeOpenPostSheet = () => {
    if (isGuestUser()) {
      setLoginPromptTitle({
        en: 'Sign In Required to Post Broadcast',
        hi: 'ब्रॉडकास्ट पोस्ट करने के लिए लॉगिन करें',
        gu: 'પોસ્ટ બનાવવા માટે લોગિન કરો'
      });
      setLoginPromptDesc({
        en: 'Broadcast your requirement to nearby service experts. Sign in with Email OTP or Password!',
        hi: 'अपने एरिया में आवश्यकता पोस्ट करने के लिए ईमेल OTP या पासवर्ड से लॉगिन करें।',
        gu: 'તમારા વિસ્તારમાં તમારી જરૂરિયાત પોસ્ટ કરવા માટે ઈમેલ OTP અથવા પાસવર્ડથી લોગિન કરો!'
      });
      setLoginSuccessAction(() => () => setIsPostSheetOpen(true));
      setIsLoginPromptOpen(true);
      return;
    }
    setIsPostSheetOpen(true);
  };

  const handleSafeProfileClick = () => {
    if (isGuestUser()) {
      setLoginPromptTitle({
        en: 'Sign In Required to Manage Profile',
        hi: 'प्रोफाइल बनाने के लिए लॉगिन करें',
        gu: 'પ્રોફાઇલ બનાવવા માટે લોગિન કરો'
      });
      setLoginPromptDesc({
        en: 'Create your verified local profile with skills, ratings & phone number.',
        hi: 'अपनी रेटिंग, स्किल्स और मोबाइल नंबर के साथ प्रोफाइल बनाने के लिए लॉगिन करें।',
        gu: 'તમારી રેટિંગ, કૌશલ્ય અને મોબાઇલ નંબર સાથે વેરિફાઈડ પ્રોફાઇલ બનાવવા માટે લોગિન કરો.'
      });
      setLoginSuccessAction(() => () => onNavigate('profile'));
      setIsLoginPromptOpen(true);
      return;
    }
    onNavigate('profile');
  };

  const handleSafeRegisterShop = () => {
    if (isGuestUser()) {
      setLoginPromptTitle({
        en: 'Sign In Required to Register Business',
        hi: 'बिज़नेस/दुकान दर्ज करने के लिए लॉगिन करें',
        gu: 'દુકાન કે બિઝનેસ રજિસ્ટર કરવા લોગિન કરો'
      });
      setLoginPromptDesc({
        en: 'List your shop, showroom or local service on the neighborhood radar with Email OTP or Password sign-in.',
        hi: 'अपनी दुकान या सर्विस दर्ज करने के लिए ईमेल OTP या पासवर्ड से लॉगिन करें।',
        gu: 'તમારી દુકાન, શોરૂમ કે બિઝનેસ રજિસ્ટર કરવા માટે ઈમેલ OTP અથવા પાસવર્ડથી લોગિન કરો.'
      });
      setLoginSuccessAction(() => () => setIsRegisterShopModalOpen(true));
      setIsLoginPromptOpen(true);
      return;
    }
    setIsRegisterShopModalOpen(true);
  };

  const handleSafeCreateProfile = () => {
    if (isGuestUser()) {
      setLoginPromptTitle({
        en: 'Sign In Required for Service Expert Profile',
        hi: 'प्रोफाइल बनाने के लिए साइन-इन करें',
        gu: 'સર્વિસ એક્સપર્ટ પ્રોફાઇલ માટે લોગિન કરો'
      });
      setLoginPromptDesc({
        en: 'Create your verified local service expert profile with skills, ratings & phone number in 1-click.',
        hi: 'अपनी रेटिंग, स्किल्स और मोबाइल नंबर के साथ सर्विस एक्सपर्ट्स लिस्टिंग में प्रोफाइल बनाने के लिए साइन-इन करें।',
        gu: 'તમારા કૌશલ્ય, રેટિંગ અને મોબાઇલ નંબર સાથે સર્વિસ એક્સપર્ટ પ્રોફાઇલ બનાવવા માટે લોગિન કરો.'
      });
      setLoginSuccessAction(() => () => setIsFreeHelperModalOpen(true));
      setIsLoginPromptOpen(true);
      return;
    }
    setIsFreeHelperModalOpen(true);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      "Namaste! 🙏 Humare mohalle aur area me Plumber, Electrician, Mechanic, Shops, Jobs aur emergency madad ke liye LocoHelp app use karein! Check here: https://www.locohelp.com"
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3500);
  };

  const handleSharePostToWhatsAppGroup = (intent: Intent, e: React.MouseEvent) => {
    e.stopPropagation();
    const km = (intent as any).computedKm || intent.distance;
    const shareMsg = encodeURIComponent(
      `📢 *LocoHelp Mohalla Alert* 📢\n\n` +
      `📌 *Requirement:* "${intent.description}"\n` +
      `📍 *Distance:* ${km} km away\n\n` +
      `👉 Response / Help dene ke liye LocoHelp Website kholein:\nhttps://www.locohelp.com`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareMsg}`, '_blank');
  };

  const categoryKeywords: Record<string, string[]> = {
    // 10 Main Categories (Groups)
    home_repair: ['plumb', 'pipe', 'tap', 'water', 'leak', 'electr', 'wire', 'light', 'fan', 'ac', 'fridge', 'ro', 'carpent', 'suthar', 'wood', 'furniture', 'paint', 'mason', 'kadiyo', 'mistri', 'clean', 'maid', 'cook', 'pest', 'tank'],
    personal_events: ['tailor', 'darzi', 'boutique', 'beauti', 'salon', 'parlour', 'makeup', 'mehendi', 'mehndi', 'pandit', 'pooja', 'puja', 'photograp', 'videograp', 'camera', 'cater', 'halwai', 'tiffin', 'event'],
    it_tech: ['web', 'website', 'app', 'developer', 'coding', 'computer', 'laptop', 'printer', 'cctv', 'wifi', 'wi-fi', 'graphic', 'video edit', 'logo', 'digital market', 'social media', 'seo', 'mobile repair', 'phone repair'],
    business_staff: ['salesman', 'salesgirl', 'sales', 'shop helper', 'store staff', 'accountant', 'gst', 'tally', 'tax', 'data entry', 'back office', 'excel', 'security guard', 'watchman', 'receptionist', 'telecaller'],
    brokers_agents: ['real estate', 'property', 'broker', 'flat', 'rent', 'pg', 'vehicle broker', 'rto', 'license', 'loan', 'insurance', 'lic', 'legal', 'notary', 'affidavit', 'document'],
    vehicle_transport: ['mechanic', 'car', 'bike', 'puncture', 'tyre', 'battery', 'cab', 'auto', 'rickshaw', 'taxi', 'driver', 'tempo', 'packers', 'movers', 'loading', 'deliver', 'parcel', 'errand'],
    education_classes: ['tutor', 'tuition', 'teacher', 'school', 'coaching', 'study', 'project', 'assignment', 'spoken english', 'computer class', 'ielts', 'music', 'dance', 'art', 'drawing', 'guitar'],
    sports_fitness: ['cricket', 'turf', 'match', 'badminton', 'tennis', 'gym', 'fitness', 'workout', 'trainer', 'running', 'jog', 'cycling', 'yoga', 'sport'],
    social_care: ['chai', 'tea', 'coffee', 'meetup', 'walk', 'companion', 'chess', 'board game', 'ludo', 'carrom', 'senior', 'elder', 'medicine', 'pet', 'dog'],
    other_custom: ['other', 'custom', 'general', 'help'],

    // Legacy Master Category aliases
    utility_emergency: ['plumb', 'pipe', 'tap', 'water', 'leak', 'electr', 'wire', 'light', 'fan', 'mechanic', 'car', 'bike', 'puncture', 'tyre', 'battery', 'carpent', 'wood', 'door', 'lock', 'paint', 'ac', 'fridge', 'mason', 'mistri'],
    social_casual: ['chai', 'tea', 'coffee', 'meetup', 'walk', 'chess', 'book', 'companion', 'game', 'gaming', 'pet', 'dog', 'chat', 'friend'],
    daily_errands: ['clean', 'maid', 'housekeep', 'deliver', 'parcel', 'luggage', 'shift', 'tutor', 'teach', 'study', 'senior', 'elder', 'medicine'],

    // All 49 Sub-Categories
    plumber: ['plumb', 'pipe', 'tap', 'water', 'leak', 'flush', 'basin', 'tank', 'प्लंबर', 'પ્લમ્બર'],
    electrician: ['electr', 'wire', 'wiring', 'switch', 'light', 'fan', 'inverter', 'fuse', 'इलेक्ट्रीशियन', 'ઇલેક્ટ્રિશિયન'],
    ac_repair: ['ac', 'air condition', 'fridge', 'refrigerator', 'ro', 'cooling', 'washing machine', 'appliance', 'एसी', 'फ्रिज'],
    carpenter: ['carpent', 'suthar', 'wood', 'door', 'lock', 'furniture', 'bed', 'sofa', 'कारपेंटर', 'सुथार', 'સુથાર'],
    painter: ['paint', 'wall', 'putty', 'color', 'polish', 'pop', 'पेंटर', 'પેઇન્ટર'],
    mason: ['mason', 'kadiyo', 'mistri', 'tile', 'plaster', 'cement', 'brick', 'कड़िया', 'मिस्त्री', 'કડિયો'],
    cleaning: ['clean', 'maid', 'cook', 'sweep', 'housekeep', 'सफाई', 'मेड', 'रसोइया', 'સફાઈ'],
    pest_control: ['pest', 'termite', 'cockroach', 'tank clean', 'पेस्ट', 'टंकी', 'પેસ્ટ'],
    tailor: ['tailor', 'darzi', 'boutique', 'stitch', 'blouse', 'दर्जी', 'बुटीक', 'દરજી'],
    beautician: ['beauti', 'salon', 'parlour', 'makeup', 'facial', 'bridal', 'ब्यूटीशियन', 'पार्लर', 'બ્યુટિશિયન'],
    mehendi: ['mehendi', 'mehndi', 'henna', 'मेहंदी', 'મહેંદી'],
    pandit_pooja: ['pandit', 'pooja', 'puja', 'havan', 'katha', 'jyotish', 'पंडित', 'पूजा', 'પંડિત'],
    photographer: ['photograp', 'videograp', 'camera', 'wedding shoot', 'drone', 'फोटोग्राफर', 'ફોટોગ્રાફર'],
    catering_event: ['cater', 'halwai', 'tiffin', 'event', 'mandap', 'कैटरिंग', 'हलवाई', 'કેટરિંગ'],
    web_developer: ['web dev', 'website', 'wordpress', 'react', 'वेब डेवलपर', 'वेबसाइट', 'વેબ ડેવલપર'],
    app_developer: ['app dev', 'mobile app', 'android', 'ios', 'flutter', 'ऐप डेवलपर', 'એપ ડેવલપર'],
    computer_laptop: ['computer', 'laptop', 'pc', 'windows', 'printer', 'कंप्यूटर', 'लैपटॉप', 'કમ્પ્યુટર'],
    cctv_wifi: ['cctv', 'camera', 'wifi', 'wi-fi', 'router', 'dvr', 'सीसीटीवी', 'वाई-फाई'],
    graphic_video: ['graphic', 'video edit', 'logo', 'banner', 'reels', 'ग्राफिक', 'वीडियो एडिटर'],
    digital_marketing: ['digital market', 'social media', 'seo', 'ads', 'डिजिटल मार्केटिंग'],
    mobile_repair: ['mobile repair', 'phone repair', 'screen', 'battery', 'मोबाइल रिपेयर', 'મોબાઇલ રિપેર'],
    sales_staff: ['salesman', 'salesgirl', 'sales', 'showroom', 'सेल्समेन', 'सेल्सगर्ल', 'સેલ્સમેન'],
    shop_helper: ['shop helper', 'store staff', 'helper', 'दुकान हेल्पर', 'स्टोर स्टाफ', 'દુકાન હેલ્પર'],
    accountant_gst: ['accountant', 'gst', 'tax', 'tally', 'itr', 'अकाउंटेंट', 'टैक्स', 'એકાઉન્ટન્ટ'],
    data_entry: ['data entry', 'back office', 'excel', 'typing', 'operator', 'डाटा एंट्री', 'ડેટા એન્ટ્રી'],
    security_guard: ['security guard', 'watchman', 'guard', 'सिक्योरिटी गार्ड', 'वॉचमैन', 'સિક્યુરિટી ગાર્ડ'],
    receptionist_telecaller: ['receptionist', 'telecaller', 'front desk', 'रिसेप्शनिस्ट', 'टेलीकॉलर', 'ટેલીકોલર'],
    real_estate_broker: ['real estate', 'property', 'broker', 'flat', 'house', 'rent', 'pg', 'प्रॉपर्टी ब्रोकर', 'પ્રોપર્ટી બ્રોકર'],
    vehicle_broker: ['vehicle broker', 'car broker', 'second hand car', 'गाड़ी ब्रोकर', 'વાહન બ્રોકર'],
    rto_agent: ['rto', 'license', 'rc transfer', 'puc', 'लाइसेंस', 'RTO'],
    loan_insurance: ['loan', 'insurance', 'lic', 'policy', 'लोन', 'बीमा', 'વીમા'],
    legal_docs: ['legal', 'notary', 'affidavit', 'rent agreement', 'document', 'कानूनी', 'नोटरी', 'નોટરી'],
    mechanic: ['mechanic', 'car', 'bike', 'puncture', 'tyre', 'battery', 'jumpstart', 'towing', 'मैकेनिक', 'पंक्चर', 'મિકેનિક'],
    cab_auto_driver: ['cab', 'auto', 'rickshaw', 'taxi', 'driver', 'drop', 'pickup', 'कैब', 'ऑटो', 'ड्राइवर', 'ડ્રાઇવર'],
    tempo_packers: ['tempo', 'packers', 'movers', 'loading', 'shifting', 'टेम्पो', 'पैकर्स', 'ટેમ્પો'],
    delivery: ['deliver', 'parcel', 'errand', 'courier', 'डिलीवरी', 'ડિલિવરી'],
    tutor: ['tutor', 'teach', 'tuition', 'school', 'maths', 'science', 'ट्यूशन', 'टीचर', 'ટ્યુશન'],
    study_project: ['study', 'project', 'assignment', 'notes', 'प्रोजेक्ट', 'पढ़ाई', 'પ્રોજેક્ટ'],
    computer_spoken_english: ['spoken english', 'computer class', 'ielts', 'स्पोकन इंग्लिश'],
    music_dance_art: ['music', 'dance', 'art', 'drawing', 'guitar', 'singing', 'संगीत', 'डांस'],
    cricket: ['cricket', 'turf', 'match', 'batting', 'bowling', 'क्रिकेट', 'ક્રિકેટ'],
    badminton: ['badminton', 'shuttle', 'racket', 'tennis', 'बैडमिंटन', 'બેડમિન્ટન'],
    gym_fitness: ['gym', 'fitness', 'workout', 'trainer', 'जिम', 'फिटनेस', 'જિમ'],
    running_yoga: ['running', 'jog', 'cycling', 'yoga', 'marathon', 'रनिंग', 'योगा', 'યોગા'],
    chai_coffee: ['chai', 'tea', 'coffee', 'tapri', 'cafe', 'meetup', 'चाय', 'कॉफी', 'ચા-કોફી'],
    companion: ['companion', 'evening walk', 'walk partner', 'वॉक', 'साथी'],
    board_games: ['board game', 'chess', 'ludo', 'carrom', 'शतरंज', 'लूडो', 'ચેસ'],
    senior_help: ['senior', 'elder', 'medicine', 'hospital assist', 'बुजुर्ग', 'વડીલો'],
    pet_walking: ['pet', 'dog', 'cat', 'puppy', 'dog walking', 'पेट वॉक', 'ડોગ'],
    other: ['other', 'custom', 'general']
  };

  const currentMasterObj = MASTER_CATEGORIES.find(m => m.id === selectedCategory);
  const currentCategoryObj = CATEGORIES.find(c => c.id === selectedCategory);

  // Smart Twin-City & Local Area Filter States
  const [selectedCityZone, setSelectedCityZone] = useState<'all' | 'gandhinagar' | 'ahmedabad' | 'twin_gnr_amd' | 'surat' | 'vadodara'>('all');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');

  const GANDHINAGAR_AREAS = ['kudasan', 'sector 21', 'sector 11', 'sargasan', 'infocity', 'raysan', 'adalaj', 'kalol', 'gift city', 'pdpu', 'koba'];
  const AHMEDABAD_AREAS = ['chandkheda', 'bopal', 'motera', 'gota', 'navrangpura', 'satellite', 'prahlad nagar', 'maninagar', 'sg highway', 'vastrapur', 'nikol', 'naroda', 'paldi', 'thaltej'];

  const resolveIntentAreaAndCity = (item: Intent, index: number): { area: string; city: string; badge: string } => {
    let area = (item.area || '').trim();
    let city = (item.city || '').trim();
    const rawLoc = (item.location || '').trim();

    if ((!area || !city) && rawLoc && rawLoc.includes(',')) {
      const parts = rawLoc.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        if (!area) area = parts.slice(0, -1).join(', ');
        if (!city) city = parts[parts.length - 1];
      }
    }

    const combinedText = `${item.description || ''} ${rawLoc} ${(item.tags || []).join(' ')}`.toLowerCase();

    if (!area) {
      const matchedGnr = GANDHINAGAR_AREAS.find(a => combinedText.includes(a));
      const matchedAmd = AHMEDABAD_AREAS.find(a => combinedText.includes(a));
      if (matchedGnr) {
        area = matchedGnr.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!city) city = 'Gandhinagar';
      } else if (matchedAmd) {
        area = matchedAmd.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!city) city = 'Ahmedabad';
      }
    }

    if (!city) {
      if (combinedText.includes('gandhinagar')) city = 'Gandhinagar';
      else if (combinedText.includes('ahmedabad')) city = 'Ahmedabad';
      else if (combinedText.includes('surat')) city = 'Surat';
      else if (combinedText.includes('vadodara') || combinedText.includes('baroda')) city = 'Vadodara';
      else if (combinedText.includes('rajkot')) city = 'Rajkot';
      else city = userLocation.district || 'Gandhinagar';
    }

    if (!area) {
      area = (item as any).area || 'Main Area';
    }

    return {
      area,
      city,
      badge: `${area}, ${city}`
    };
  };

  // 1-Hour Auto-Expiry & GPS Distance Priority System (Inactive posts auto-delete after 1 hour)
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const now = Date.now();

  const blockedUserIds = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('locohelp_blocked_user_ids') || '[]') as string[];
    } catch {
      return [];
    }
  }, [reportFilterTick]);

  const hiddenPostIds = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('locohelp_hidden_post_ids') || '[]') as string[];
    } catch {
      return [];
    }
  }, [reportFilterTick]);

  const processedIntents = intents.filter(item => {
    if ((item as any).is_flagged === true || (item as any).hidden === true || (item as any).is_deleted === true) {
      return false;
    }
    if (item.id && hiddenPostIds.includes(item.id)) return false;
    if (item.authorId && blockedUserIds.includes(item.authorId)) return false;

    const createdAtTime = new Date(item.createdAt || (item as any).created_at || Date.now()).getTime();
    const lastInteractionTime = (item as any).lastInteractionAt ? new Date((item as any).lastInteractionAt).getTime() : 0;
    const effectiveTime = Math.max(createdAtTime, lastInteractionTime);

    // Auto-Delete: If 1 hour (60 mins) has elapsed without reply/interaction, filter out
    if (now - effectiveTime > ONE_HOUR_MS) return false;
    return true;
  }).map((item, index) => {
    const createdAtTime = new Date(item.createdAt || (item as any).created_at || Date.now()).getTime();
    const lastInteractionTime = (item as any).lastInteractionAt ? new Date((item as any).lastInteractionAt).getTime() : 0;
    const effectiveTime = Math.max(createdAtTime, lastInteractionTime);

    const msRemaining = Math.max(0, ONE_HOUR_MS - (now - effectiveTime));
    const minsRemaining = Math.max(1, Math.ceil(msRemaining / (60 * 1000)));

    const itemLat = (item as any).lat || gpsCoords.lat;
    const itemLng = (item as any).lng || gpsCoords.lng;
    
    const computedKm = getGpsDistanceKm(gpsCoords.lat, gpsCoords.lng, itemLat, itemLng);
    const finalDistance = Math.min(computedKm, item.distance || 0.8);

    const { area: resolvedArea, city: resolvedCity, badge: resolvedLocationBadge } = resolveIntentAreaAndCity(item, index);
    
    return {
      ...item,
      resolvedArea,
      resolvedCity,
      resolvedLocationBadge,
      computedKm: finalDistance,
      minsRemaining,
      isNearbyPriority: finalDistance <= 2.0
    };
  });

  // Filter by category (supports both Main Category IDs and Sub-Category IDs)
  const categoryFilteredIntents = processedIntents.filter(item => {
    if (selectedCategory === 'all') return true;
    const itemCat = ((item as any).category || '').toLowerCase();
    if (itemCat && itemCat === selectedCategory.toLowerCase()) return true;
    const subCatsInGroup = CATEGORIES.filter(c => c.masterCategory === selectedCategory);
    if (subCatsInGroup.length > 0) {
      if (subCatsInGroup.some(sc => sc.id === itemCat)) return true;
      const groupTags = subCatsInGroup.map(sc => sc.tag.toLowerCase().replace('#', ''));
      const text = (item.description + ' ' + (item.tags ? item.tags.join(' ') : '')).toLowerCase();
      if (groupTags.some(gt => text.includes(gt))) return true;
    }
    const keywords = categoryKeywords[selectedCategory] || [selectedCategory];
    const text = (item.description + ' ' + (item.tags ? item.tags.join(' ') : '')).toLowerCase();
    return keywords.some(k => text.includes(k));
  });

  const baseCategoryIntents = categoryFilteredIntents;

  // Strict Hyper-Local Location Broadcasting: Only show posts matching the user's selected location
  const activeHeaderDistrict = (userLocation.district || 'Gandhinagar').trim().toLowerCase();
  const connectedDistricts = getConnectedTwinDistricts(activeHeaderDistrict);

  const myPostIdsList = useMemo(() => {
    try {
      const raw = localStorage.getItem('locohelp_my_post_ids');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }, [intents.length, newlyCreatedId]);

  const zoneFilteredIntents = baseCategoryIntents.filter(item => {
    if (!activeHeaderDistrict || activeHeaderDistrict === 'all') return true;
    // Always show posts created by the current logged-in user so their own post never disappears
    if (
      item.id === newlyCreatedId ||
      myPostIdsList.includes(item.id) ||
      (activeUser?.uid && item.authorId === activeUser.uid) ||
      (activeUser?.email &&
        (item as any).authorEmail &&
        String((item as any).authorEmail).toLowerCase() === String(activeUser.email).toLowerCase())
    ) {
      return true;
    }
    const cityLower = (item.resolvedCity || '').trim().toLowerCase();
    const areaLower = (item.resolvedArea || '').trim().toLowerCase();
    const locLower = (item.location || '').trim().toLowerCase();
    return (
      cityLower === activeHeaderDistrict ||
      cityLower.includes(activeHeaderDistrict) ||
      activeHeaderDistrict.includes(cityLower) ||
      locLower.includes(activeHeaderDistrict) ||
      areaLower.includes(activeHeaderDistrict)
    );
  });

  const displayIntents = zoneFilteredIntents
    .slice()
    .sort((a, b) => {
      // Pin newly created post at the very top immediately
      if (a.id === newlyCreatedId && b.id !== newlyCreatedId) return -1;
      if (b.id === newlyCreatedId && a.id !== newlyCreatedId) return 1;

      const aCity = (a.resolvedCity || '').toLowerCase();
      const bCity = (b.resolvedCity || '').toLowerCase();
      const aArea = (a.resolvedArea || '').toLowerCase();
      const bArea = (b.resolvedArea || '').toLowerCase();
      const prefArea = (userLocation.area || '').trim().toLowerCase();

      // 1. Exact District match prioritized first, followed by Connected Twin-City / Neighboring District
      const getDistrictRank = (cityStr: string) => {
        if (!cityStr) return 3;
        if (cityStr === activeHeaderDistrict || cityStr.includes(activeHeaderDistrict) || activeHeaderDistrict.includes(cityStr)) {
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

      // 2. If user also saved a local area, prioritize posts matching that local area within the district
      if (prefArea) {
        const aAreaMatch = aArea.includes(prefArea) ? 0 : 1;
        const bAreaMatch = bArea.includes(prefArea) ? 0 : 1;
        if (aAreaMatch !== bAreaMatch) return aAreaMatch - bAreaMatch;
      }

      // 3. Newest posts first (strictly chronological so new posts appear immediately at the top)
      const aTime = new Date(a.createdAt || (a as any).created_at || 0).getTime();
      const bTime = new Date(b.createdAt || (b as any).created_at || 0).getTime();
      if (bTime !== aTime) return bTime - aTime;

      return a.computedKm - b.computedKm;
    });

  // Real-time filtered feed for home screen broadcast list
  const searchedIntents = homeSearchQuery.trim()
    ? displayIntents.filter(item => {
        const q = homeSearchQuery.toLowerCase().trim();
        const text = (
          (item.description || '') + ' ' + 
          (item.category || '') + ' ' + 
          (item.resolvedLocationBadge || '') + ' ' +
          (item.tags ? item.tags.join(' ') : '')
        ).toLowerCase();
        return text.includes(q);
      })
    : displayIntents;

  // Web Speech API Voice Search Handler
  const handleStartVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setCreatedToast(
        language === 'EN'
          ? 'Voice search is not supported in this browser. Please type to search.'
          : language === 'GU'
          ? 'તમારા બ્રાઉઝરમાં વોઈસ સર્ચ સપોર્ટ નથી. કૃપા કરીને ટાઈપ કરીને શોધો.'
          : 'आपके ब्राउज़र में वॉइस सर्च सपोर्ट नहीं है। कृपया टाइप करके खोजें।'
      );
      setTimeout(() => setCreatedToast(null), 4000);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'EN' ? 'en-US' : language === 'GU' ? 'gu-IN' : 'hi-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsVoiceListening(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setHomeSearchQuery(transcript);
        }
        setIsVoiceListening(false);
      };

      recognition.onerror = () => {
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };
    } catch (e) {
      setIsVoiceListening(false);
    }
  };

  // Comprehensive Global Search across Entire Website
  const globalSearchResults = useMemo(() => {
    if (!homeSearchQuery.trim()) return { posts: [], helpers: [], shops: [], categories: [] };
    const q = homeSearchQuery.toLowerCase().trim();

    // 1. Broadcast Posts
    const posts = displayIntents.filter(item => 
      (item.description || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.tags || []).some(t => t.toLowerCase().includes(q))
    );

    // 2. Local Helpers & Service Providers
    const helpers = getFreeHelperProfiles().filter(h =>
      (h.name || '').toLowerCase().includes(q) ||
      (h.categoryId || '').toLowerCase().includes(q) ||
      (h.area || '').toLowerCase().includes(q) ||
      (h.skills || []).some(s => s.toLowerCase().includes(q))
    );

    // 3. Registered Shops & Businesses (Approved only)
    let shopsList: any[] = [];
    try {
      const stored = localStorage.getItem('locohelp_registered_shops');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          shopsList = parsed.filter((s: any) => !String(s.id || '').startsWith('sample_shop_') && (s.isVerified === true || s.status === 'approved'));
        }
      }
    } catch (e) {}
    const shops = shopsList.filter((s: any) =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.categoryLabel || '').toLowerCase().includes(q) ||
      (s.area || s.address || '').toLowerCase().includes(q) ||
      (s.ownerName || '').toLowerCase().includes(q)
    );

    // 4. Service Categories
    const categories = CATEGORIES.filter(c =>
      (c.nameEn || '').toLowerCase().includes(q) ||
      (c.nameHi || '').toLowerCase().includes(q) ||
      (c.nameGu || '').toLowerCase().includes(q) ||
      (c.id || '').toLowerCase().includes(q)
    );

    return { posts, helpers, shops, categories };
  }, [homeSearchQuery, displayIntents]);

  // Unified Deduplicating Merger for Multi-Device Broadcast Sync (Preserves responseCount, responses & repliers while removing server-deleted posts)
  const mergeAndDeduplicateIntents = (incoming: Intent[], isAuthoritativeServerList = false) => {
    setIntents(prev => {
      let deletedIds: string[] = [];
      let justCreatedCustom: Intent[] = [];
      try {
        const idRaw = localStorage.getItem('locohelp_deleted_posts');
        if (idRaw) deletedIds = JSON.parse(idRaw);
        const customRaw = localStorage.getItem('locohelp_custom_intents');
        const myIdsRaw = localStorage.getItem('locohelp_my_post_ids');
        const myIdsSet = new Set<string>(myIdsRaw ? JSON.parse(myIdsRaw) : []);
        if (customRaw) {
          const parsed: Intent[] = JSON.parse(customRaw);
          const now = Date.now();
          // Preserve newly created posts on this device for 5 minutes so background polls never wipe a user's post
          justCreatedCustom = parsed.filter(item => {
            if (!item || !item.id || deletedIds.includes(item.id)) return false;
            const createdMs = new Date(item.createdAt || 0).getTime();
            const maxWindowMs = myIdsSet.has(item.id) ? 5 * 60 * 1000 : 60 * 1000;
            return now - createdMs < maxWindowMs;
          });
        }
      } catch (e) {
        console.warn("Deleted posts sync error:", e);
      }

      const prevById = new Map<string, Intent>();
      for (const p of prev) {
        if (p && p.id && !deletedIds.includes(p.id)) {
          prevById.set(p.id, p);
        }
      }

      const normalizeIdentity = (idVal: any, emailVal: any): string => {
        const cleanEmail = String(emailVal || '').trim().toLowerCase();
        if (cleanEmail) return 'email_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
        const cleanId = String(idVal || '').trim().toLowerCase();
        if (cleanId.includes('@')) return 'email_' + cleanId.replace(/[^a-z0-9]/g, '_');
        return cleanId;
      };

      const computeUniqueRepliersList = (postObj: any, repliersArr: any[], responsesArr: any[]): any[] => {
        const ownerNorm = normalizeIdentity(postObj?.authorId || postObj?.user_id, postObj?.authorEmail);
        const ownerIdLower = String(postObj?.authorId || postObj?.user_id || '').trim().toLowerCase();
        const ownerEmailLower = String(postObj?.authorEmail || '').trim().toLowerCase();
        const map = new Map<string, any>();

        const addCandidate = (entry: any) => {
          if (!entry) return;
          const sId = String(entry.helperId || entry.helper_id || entry.senderId || entry.sender_id || entry.authorId || '').trim();
          const sEmail = String(entry.helperEmail || entry.senderEmail || entry.sender_email || entry.authorEmail || '').trim().toLowerCase();
          if (!sId && !sEmail) return;
          if (sId.toLowerCase() === 'system' || sId.toLowerCase() === 'owner' || sId.toLowerCase() === 'me') return;
          const sNorm = normalizeIdentity(sId, sEmail);
          if (
            (ownerNorm && sNorm === ownerNorm) ||
            (ownerIdLower && sId.toLowerCase() === ownerIdLower) ||
            (ownerEmailLower && sEmail && sEmail === ownerEmailLower)
          ) {
            return;
          }
          const key = sNorm || sEmail || sId.toLowerCase();
          if (!map.has(key)) {
            map.set(key, entry);
          }
        };

        (Array.isArray(repliersArr) ? repliersArr : []).forEach(addCandidate);
        if (map.size === 0 && Array.isArray(responsesArr) && responsesArr.length > 0) {
          responsesArr.forEach(addCandidate);
        }
        return Array.from(map.values());
      };

      const mergePostRecord = (existing: any, next: any): Intent => {
        if (!existing) return next;
        const existResponses = Array.isArray(existing.responses) ? existing.responses : [];
        const nextResponses = Array.isArray(next.responses) ? next.responses : [];
        const finalResponses = nextResponses.length >= existResponses.length ? nextResponses : existResponses;

        const existRepliers = Array.isArray(existing.repliers) ? existing.repliers : [];
        const nextRepliers = Array.isArray(next.repliers) ? next.repliers : [];
        const rawRepliers = nextRepliers.length > 0 ? nextRepliers : existRepliers;
        const mergedPost = { ...existing, ...next };
        const finalRepliers = computeUniqueRepliersList(mergedPost, rawRepliers, finalResponses);

        const nextCount = Number(next.responseCount ?? next.response_count ?? 0);
        const existCount = Number(existing.responseCount ?? existing.response_count ?? 0);
        const finalCount =
          finalRepliers.length > 0
            ? finalRepliers.length
            : isAuthoritativeServerList
            ? nextCount
            : Math.max(existCount, nextCount);

        return {
          ...mergedPost,
          responseCount: finalCount,
          response_count: finalCount,
          responses: finalResponses,
          repliers: finalRepliers
        };
      };

      const byId = new Map<string, Intent>();

      if (isAuthoritativeServerList) {
        // Authoritative sync from GET /api/intents: any post deleted on the server is omitted from incoming and removed from all phones
        for (const item of justCreatedCustom) {
          if (!item || !item.id || deletedIds.includes(item.id)) continue;
          byId.set(item.id, mergePostRecord(prevById.get(item.id), item));
        }
        for (const item of incoming) {
          if (!item || !item.id || deletedIds.includes(item.id)) continue;
          byId.set(item.id, mergePostRecord(prevById.get(item.id), item));
        }
      } else {
        // Incremental merge (e.g., SSE new_post or optimistic creation)
        for (const item of [...justCreatedCustom, ...prev, ...incoming]) {
          if (!item || !item.id) continue;
          if (deletedIds.includes(item.id)) continue;
          byId.set(item.id, mergePostRecord(byId.get(item.id), item));
        }
      }

      const result: Intent[] = Array.from(byId.values());
      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      // Update instant offline local cache and prune any server-deleted posts from custom cache
      try {
        localStorage.setItem('locohelp_cached_intents', JSON.stringify(result.slice(0, 50)));
        if (isAuthoritativeServerList) {
          const activeIds = new Set(result.map(r => r.id));
          const customRaw = localStorage.getItem('locohelp_custom_intents');
          if (customRaw) {
            const parsedCustom: Intent[] = JSON.parse(customRaw);
            const cleanedCustom = parsedCustom.filter(c => c && c.id && activeIds.has(c.id));
            localStorage.setItem('locohelp_custom_intents', JSON.stringify(cleanedCustom));
          }
        }
      } catch (e) {}

      return result;
    });
  };

  const notifyAndRecordNewPost = (newPost: any) => {
    if (!newPost || !newPost.id) return;
    try {
      const postIdStr = String(newPost.id).trim();
      const notifiedIds: string[] = JSON.parse(localStorage.getItem('locohelp_notified_post_ids') || '[]');
      if (notifiedIds.includes(postIdStr)) return;

      const currentUser = getCurrentUser();
      const myUid = String(currentUser?.uid || '').trim().toLowerCase();
      const myEmail = String(currentUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
      const myEmailUid = myEmail ? 'email_' + myEmail.replace(/[^a-z0-9]/g, '_') : '';
      const postAuthorId = String(newPost.authorId || newPost.userId || '').trim().toLowerCase();
      const postAuthorEmail = String(newPost.authorEmail || '').trim().toLowerCase();
      const myPostIds: string[] = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');

      const isMyOwnPost = Boolean(
        myPostIds.includes(postIdStr) ||
        (myUid && postAuthorId && myUid === postAuthorId) ||
        (myEmailUid && postAuthorId && myEmailUid === postAuthorId) ||
        (myEmail && postAuthorEmail && myEmail === postAuthorEmail) ||
        (myEmail && postAuthorId && myEmail === postAuthorId)
      );

      const nextNotified = [postIdStr, ...notifiedIds].slice(0, 150);
      localStorage.setItem('locohelp_notified_post_ids', JSON.stringify(nextNotified));

      if (isMyOwnPost) return;

      const areaLabel = newPost.area || newPost.city || newPost.location || 'Local Area';
      const catLabel = newPost.category || newPost.title || 'New Request';
      const descSnippet = String(newPost.description || newPost.title || '').slice(0, 80);
      const notifTitle = `🔔 New Request in ${areaLabel}!`;
      const notifBody = `${catLabel}: ${descSnippet}`;

      setCreatedToast(`${notifTitle} ${notifBody}`);
      setTimeout(() => setCreatedToast(null), 6000);

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

      try {
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
              .catch(() => {
                new Notification(notifTitle, { body: notifBody, icon: '/pwa-192x192.png' });
              });
          } else {
            new Notification(notifTitle, { body: notifBody, icon: '/pwa-192x192.png' });
          }
        }
      } catch {}
    } catch {}
  };

  const syncServerBroadcasts = async (isManual = false) => {
    if (isManual) setIsSyncing(true);
    try {
      const isInitialFetch = initialLoadRef.current;
      const serverIntents = await fetchLiveIntents();
      if (serverIntents && Array.isArray(serverIntents)) {
        if (isInitialFetch) {
          initialLoadRef.current = false;
          try {
            const existingNotified: string[] = JSON.parse(localStorage.getItem('locohelp_notified_post_ids') || '[]');
            const seeded = Array.from(new Set([...serverIntents.map((p: any) => String(p?.id || '')).filter(Boolean), ...existingNotified])).slice(0, 150);
            localStorage.setItem('locohelp_notified_post_ids', JSON.stringify(seeded));
          } catch {}
        } else {
          // Notify for any newly discovered post created within the last 3 minutes (polling fallback if SSE was buffered)
          const nowMs = Date.now();
          for (const item of serverIntents) {
            if (!item || !item.id) continue;
            const createdMs = new Date(item.createdAt || (item as any).created_at || 0).getTime();
            if (createdMs > 0 && nowMs - createdMs <= 3 * 60 * 1000) {
              notifyAndRecordNewPost(item);
            }
          }
        }
        mergeAndDeduplicateIntents(serverIntents, true);
      }
    } catch (err) {
      console.warn("Live broadcast sync notice:", err);
    } finally {
      if (isManual) {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  };

  // Multi-device real-time sync across all phones (SSE /api/stream + 4s polling fallback)
  useEffect(() => {
    // 1. Instant local load for 0ms initial render
    try {
      const stored = localStorage.getItem('locohelp_cached_intents') || localStorage.getItem('locohelp_custom_intents');
      if (stored) {
        const localItems: Intent[] = JSON.parse(stored);
        if (localItems.length > 0) {
          mergeAndDeduplicateIntents(localItems, false);
        }
      }
    } catch (e) {}

    // 2. Initial fetch + 4-second polling fallback
    syncServerBroadcasts();
    const pollInterval = setInterval(() => {
      syncServerBroadcasts();
    }, 4000);

    // 3. Real-Time Server-Sent Events (SSE) stream for 0ms instant post, delete & response updates without refreshing
    const unsubRealtime = subscribeToRealtimeStream({
      onNewPost: (payload) => {
        const newPost = payload?.post || payload?.intent;
        if (newPost && newPost.id) {
          mergeAndDeduplicateIntents([newPost], false);
          notifyAndRecordNewPost(newPost);
        }
      },
      onPostDeleted: (payload) => {
        const deletedId = String(payload?.postId || payload?.id || '').trim();
        if (!deletedId) return;

        try {
          const deletedIds: string[] = JSON.parse(localStorage.getItem('locohelp_deleted_posts') || '[]');
          if (!deletedIds.includes(deletedId)) {
            deletedIds.push(deletedId);
            localStorage.setItem('locohelp_deleted_posts', JSON.stringify(deletedIds));
          }
          const storedCustom = localStorage.getItem('locohelp_custom_intents');
          if (storedCustom) {
            localStorage.setItem(
              'locohelp_custom_intents',
              JSON.stringify(JSON.parse(storedCustom).filter((i: any) => i && i.id !== deletedId))
            );
          }
          const storedCached = localStorage.getItem('locohelp_cached_intents');
          if (storedCached) {
            localStorage.setItem(
              'locohelp_cached_intents',
              JSON.stringify(JSON.parse(storedCached).filter((i: any) => i && i.id !== deletedId))
            );
          }
        } catch {}

        setIntents((prev) => prev.filter((item) => item.id !== deletedId));
        setSelectedIntentForResponses((curr) => {
          if (curr && curr.id === deletedId) {
            setIsResponsesModalOpen(false);
            return null;
          }
          return curr;
        });
      },
      onNewResponse: (payload) => {
        if (!payload?.postId) return;
        const targetId = String(payload.postId);

        setIntents((prev) =>
          prev.map((item) => {
            if (item.id !== targetId) return item;
            const prevCount = Number((item as any).responseCount ?? (item as any).response_count ?? 0);
            const incomingCount = Number(payload.responseCount ?? payload.response_count ?? 0);
            const prevResponses = Array.isArray((item as any).responses) ? (item as any).responses : [];
            const newResp = payload.response;
            const updatedResponses =
              newResp && !prevResponses.some((r: any) => r?.id === newResp.id)
                ? [...prevResponses, newResp]
                : prevResponses;

            const normKey = (idVal: any, emailVal: any) => {
              const e = String(emailVal || '').trim().toLowerCase();
              if (e) return 'email_' + e.replace(/[^a-z0-9]/g, '_');
              const i = String(idVal || '').trim().toLowerCase();
              if (i.includes('@')) return 'email_' + i.replace(/[^a-z0-9]/g, '_');
              return i;
            };
            const ownerNorm = normKey(item.authorId || (item as any).user_id, (item as any).authorEmail);

            const baseRepliers =
              Array.isArray(payload.repliers) && payload.repliers.length > 0
                ? payload.repliers
                : Array.isArray((item as any).repliers)
                ? [...(item as any).repliers]
                : [];

            if (newResp) {
              const sId = String(newResp.senderId || newResp.sender_id || newResp.authorId || payload.helperId || '').trim();
              const sEmail = String(newResp.senderEmail || newResp.sender_email || newResp.authorEmail || '').trim().toLowerCase();
              const sNorm = normKey(sId, sEmail);
              const isOwnerMsg =
                (ownerNorm && sNorm === ownerNorm) ||
                (item.authorId && sId.toLowerCase() === String(item.authorId).trim().toLowerCase());
              if (!isOwnerMsg && sNorm) {
                const alreadyInList = baseRepliers.some(
                  (r: any) => normKey(r?.helperId || r?.senderId || r?.sender_id, r?.helperEmail || r?.senderEmail) === sNorm
                );
                if (!alreadyInList) {
                  baseRepliers.push({
                    senderId: sId,
                    helperId: sId,
                    senderName: newResp.senderName || newResp.authorName || 'Community Helper',
                    senderEmail: sEmail,
                    lastMessage: newResp.text || newResp.message || 'Sent a message',
                    updatedAt: newResp.createdAt || new Date().toISOString()
                  });
                }
              }
            }

            const dedupedRepliersMap = new Map<string, any>();
            baseRepliers.forEach((r: any) => {
              if (!r) return;
              const k = normKey(r.helperId || r.senderId || r.sender_id, r.helperEmail || r.senderEmail);
              if (!k || (ownerNorm && k === ownerNorm)) return;
              if (!dedupedRepliersMap.has(k)) dedupedRepliersMap.set(k, r);
            });
            const updatedRepliers = Array.from(dedupedRepliersMap.values());

            const nextCount =
              updatedRepliers.length > 0
                ? updatedRepliers.length
                : incomingCount > 0
                ? incomingCount
                : prevCount;

            const updatedItem = {
              ...item,
              responseCount: nextCount,
              response_count: nextCount,
              responses: updatedResponses,
              repliers: updatedRepliers
            } as Intent;

            setSelectedIntentForResponses((currSelected) =>
              currSelected && currSelected.id === targetId ? updatedItem : currSelected
            );

            return updatedItem;
          })
        );

        // If the current logged-in user is the recipient of this message/response, show live toast & save notification
        const currentUser = getCurrentUser();
        const myUid = String(currentUser?.uid || '').trim().toLowerCase();
        const myEmail = String(currentUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
        const senderId = String(payload.response?.senderId || payload.response?.sender_id || '').trim().toLowerCase();
        const senderEmail = String(payload.response?.senderEmail || payload.response?.sender_email || '').trim().toLowerCase();
        const ownerId = String(payload.postOwnerId || '').trim().toLowerCase();
        const receiverId = String(payload.receiverId || payload.response?.receiverId || '').trim().toLowerCase();

        const isFromMe = (myUid && senderId === myUid) || (myEmail && senderEmail === myEmail);
        const isForMe =
          !isFromMe &&
          Boolean(
            (myUid && (ownerId === myUid || receiverId === myUid)) ||
              (myEmail && (ownerId === myEmail || receiverId === myEmail))
          );

        if (isForMe) {
          const responderName = payload.response?.senderName || payload.response?.authorName || 'Someone';
          const msgPreview = String(payload.response?.text || payload.response?.message || 'Sent a message').slice(0, 80);
          const notifTitle = `💬 New Message from ${responderName}`;
          const notifBody = msgPreview;

          setCreatedToast(`${notifTitle}: "${notifBody}"`);
          setTimeout(() => setCreatedToast(null), 5500);

          try {
            const existingNotifs = JSON.parse(localStorage.getItem('locohelp_notifications') || '[]');
            const notifId = `notif_msg_${payload.response?.id || Date.now()}`;
            if (!existingNotifs.some((n: any) => n && n.id === notifId)) {
              const updatedNotifs = [
                {
                  id: notifId,
                  type: 'new_response',
                  title: notifTitle,
                  body: notifBody,
                  postId: targetId,
                  conversationId: payload.conversationId,
                  senderId: payload.response?.senderId || payload.helperId,
                  senderName: responderName,
                  createdAt: new Date().toISOString(),
                  isRead: false
                },
                ...existingNotifs
              ].slice(0, 50);
              localStorage.setItem('locohelp_notifications', JSON.stringify(updatedNotifs));
              window.dispatchEvent(new CustomEvent('locohelp_notifications_updated'));
            }
          } catch {}

          try {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(notifTitle, { body: notifBody, icon: '/pwa-192x192.png' });
            }
          } catch {}
        }
      }
    });

    return () => {
      clearInterval(pollInterval);
      unsubRealtime();
    };
  }, []);

  // Auto-close login prompt modal & execute pending action when sign-in completes
  useEffect(() => {
    const handleAuthChange = () => {
      if (!isGuestUser() && isLoginPromptOpen) {
        setIsLoginPromptOpen(false);
        if (loginSuccessAction) {
          loginSuccessAction();
          setLoginSuccessAction(undefined);
        }
      }
    };

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (session?.user) {
        handleAuthChange();
      }
    });

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LOCOHELP_AUTH_SUCCESS') {
        handleAuthChange();
      }
    };

    window.addEventListener('message', handleWindowMessage);
    window.addEventListener('storage', handleAuthChange);

    // Initial check
    handleAuthChange();

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [isLoginPromptOpen, loginSuccessAction]);

  const handlePostCreated = (newIntent: Intent) => {
    mergeAndDeduplicateIntents([newIntent]);
    setNewlyCreatedId(newIntent.id);
    setCreatedToast(
      language === 'EN'
        ? "⚡ Post Uploaded! Your post is now live on all phones."
        : language === 'GU'
        ? "⚡ પોસ્ટ અપલોડ થઈ ગઈ! તમારી પોસ્ટ બધા ફોન પર લાઈવ છે."
        : "⚡ Post Uploaded! Aapki post sabhi phones par live hai."
    );
    setTimeout(() => setCreatedToast(null), 5000);
    // Smoothly scroll to top so user sees their newly created post immediately
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleDeletePost = (intentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPostToDelete(intentId);
  };

  const confirmDeletePost = (intentId: string) => {
    const targetPost = intents.find(i => i.id === intentId);
    const targetDesc = targetPost?.description?.trim();

    // 1. Immediately remove from local UI state
    setIntents(prev => prev.filter(i => i.id !== intentId && (!targetDesc || i.description?.trim() !== targetDesc)));

    // 2. CLOSE DELETE MODAL IMMEDIATELY! Zero UI delay
    setPostToDelete(null);
    setCreatedToast(
      language === 'EN'
        ? "🗑️ Post successfully deleted!"
        : language === 'GU'
        ? "🗑️ પોસ્ટ સફળતાપૂર્વક ડિલીટ થઈ ગઈ!"
        : "🗑️ पोस्ट सफलतापूर्वक हटा दी गई!"
    );
    setTimeout(() => setCreatedToast(null), 3500);

    // 3. Add to local deleted lists (by exact post ID only)
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('locohelp_deleted_posts') || '[]');
      if (!deletedIds.includes(intentId)) {
        deletedIds.push(intentId);
        localStorage.setItem('locohelp_deleted_posts', JSON.stringify(deletedIds));
      }

      const storedCustom = localStorage.getItem('locohelp_custom_intents');
      if (storedCustom) {
        const arr = JSON.parse(storedCustom).filter((i: any) => i.id !== intentId);
        localStorage.setItem('locohelp_custom_intents', JSON.stringify(arr));
      }
      const storedCached = localStorage.getItem('locohelp_cached_intents');
      if (storedCached) {
        const arr = JSON.parse(storedCached).filter((i: any) => i.id !== intentId);
        localStorage.setItem('locohelp_cached_intents', JSON.stringify(arr));
      }
      // Note: Keep intentId in locohelp_my_post_ids so 7-day saved chats in Profile -> My Chats continue to recognize post ownership
    } catch (e) {}

    // 4. Background server & Railway PostgreSQL delete
    (async () => {
      try {
        await deleteIntentOnServer(intentId, targetDesc);
      } catch (err) {
        console.warn("Server delete notice:", err);
      }
    })();
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 relative overflow-hidden transition-colors">
      {/* Full Page Scroll Container - Uninhibited smooth scrolling for all posts (Top Header is now mounted globally in App.tsx) */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">

        {/* GPS Location Notification Alert */}
        {gpsNotificationToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-5 mt-3 bg-indigo-600 text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{gpsNotificationToast}</span>
            </div>
            <button onClick={() => setGpsNotificationToast(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Live Upload Toast Alert */}
        {createdToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-5 mt-3 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 bg-emerald-500 rounded-full p-0.5" />
              <span>{createdToast}</span>
            </div>
            <button onClick={() => setCreatedToast(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Clean "Enable Local Alerts 🔔" Push Notification Banner for Logged-In Users */}
        {!isGuestUser() &&
          typeof window !== 'undefined' &&
          'Notification' in window &&
          notifPermission === 'default' &&
          !pushBannerDismissed && (
            <div className="mx-3.5 sm:mx-5 mt-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-3.5 py-2.5 rounded-2xl shadow-md flex items-center justify-between gap-2.5 border border-indigo-400/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-base">
                  🔔
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-tight truncate">
                    {language === 'EN'
                      ? `Get Instant Alerts in ${userLocation.area || userLocation.district || 'Your Area'}`
                      : language === 'GU'
                      ? `${userLocation.area || userLocation.district || 'તમારા વિસ્તાર'} ની નવી પોસ્ટના એલર્ટ મેળવો`
                      : `${userLocation.area || userLocation.district || 'अपने इलाके'} के तुरंत लोकल अलर्ट पाएं`}
                  </p>
                  <p className="text-[10px] text-indigo-100 font-medium truncate">
                    {language === 'EN'
                      ? 'Receive background push alerts when neighbors post requests nearby'
                      : language === 'GU'
                      ? 'જ્યારે કોઈ નજીકમાં મદદ કે સર્વિસ પોસ્ટ કરે ત્યારે તુરંત નોટિફિકેશન મેળવો'
                      : 'जब कोई आपके पास मदद या सर्विस की पोस्ट डाले तो तुरंत नोटिफिकेशन पाएं'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleEnablePushAlertsClick}
                  disabled={isEnablingPush}
                  className="px-3 py-1.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-black text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
                >
                  {isEnablingPush
                    ? '...'
                    : language === 'EN'
                    ? 'Enable Local Alerts 🔔'
                    : language === 'GU'
                    ? 'એલર્ટ ચાલુ કરો 🔔'
                    : 'Enable Local Alerts 🔔'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPushBannerDismissed(true);
                    try {
                      sessionStorage.setItem('locohelp_push_banner_dismissed', 'true');
                    } catch {}
                  }}
                  className="p-1 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Dismiss notification banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        <div className="px-3.5 sm:px-5 mt-3 sm:mt-4 space-y-3 max-w-full">
          
          {/* 1. Real-Time Interactive Global Search Bar across Entire Website */}
          <div className="relative z-20">
            <div className={`bg-white dark:bg-slate-800 border-2 transition-all rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 shadow-xs ${
              isSearchFocused || homeSearchQuery ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20' : 'border-violet-200 dark:border-slate-700 hover:border-indigo-400'
            }`}>
              <Search className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 ml-1" />
              
              <input
                type="text"
                value={homeSearchQuery}
                onChange={(e) => setHomeSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder={
                  language === 'EN'
                    ? 'Search anything: Plumber, Mechanic, Job, Shop...'
                    : language === 'GU'
                    ? 'આખી વેબસાઈટમાં શોધો: પ્લમ્બર, મિકેનિક, દુકાન, નોકરી...'
                    : 'पूरी वेबसाइट में खोजें: प्लंबर, मैकेनिक, दुकान, जॉब...'
                }
                className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none"
              />

              {homeSearchQuery && (
                <button 
                  type="button"
                  onClick={() => setHomeSearchQuery('')}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Instant Results Dropdown Overlay */}
            <AnimatePresence>
              {homeSearchQuery.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border-2 border-indigo-200 dark:border-slate-700 max-h-96 overflow-y-auto z-50 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-300">
                    <span>🔍 {tr(`Results for "${homeSearchQuery}"`, `"${homeSearchQuery}" के परिणाम`, `"${homeSearchQuery}" ના પરિણામો`)}</span>
                    <button onClick={() => setHomeSearchQuery('')} className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] cursor-pointer">
                      {tr('Clear Filter ✖', 'फ़िल्टर हटाएं ✖', 'ફિલ્ટર દૂર કરો ✖')}
                    </button>
                  </div>

                  {/* Live Broadcast Posts Matches */}
                  {globalSearchResults.posts.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 block">
                        📢 {tr('Live Broadcast Posts', 'लाइव ब्रॉडकास्ट पोस्ट', 'લાઈવ બ્રોડકાસ્ટ પોસ્ટ્સ')} ({globalSearchResults.posts.length})
                      </span>
                      <div className="space-y-1">
                        {globalSearchResults.posts.slice(0, 4).map(post => {
                          let myPostIds: string[] = [];
                          try {
                            myPostIds = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');
                          } catch (e) {}
                          const currentUserObj = activeUser || getCurrentUser();
                          const currentUid = String(currentUserObj?.uid || '').trim().toLowerCase();
                          const currentEmail = String(currentUserObj?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
                          const currentEmailUid = currentEmail ? 'email_' + currentEmail.replace(/[^a-z0-9]/g, '_') : '';
                          const postAuthorId = String(post.authorId || (post as any).userId || '').trim().toLowerCase();
                          const postAuthorEmail = String((post as any).authorEmail || '').trim().toLowerCase();
                          const isOwn = Boolean(
                            (currentUid && postAuthorId === currentUid) ||
                            (currentEmailUid && postAuthorId === currentEmailUid) ||
                            (currentEmail && (postAuthorEmail === currentEmail || postAuthorId === currentEmail)) ||
                            myPostIds.includes(post.id)
                          );
                          return (
                            <div
                              key={post.id}
                              onClick={() => {
                                setHomeSearchQuery('');
                                if (isOwn) {
                                  setSelectedIntentForResponses(post);
                                  setIsResponsesModalOpen(true);
                                } else {
                                  handleSafeOpenChat(post);
                                }
                              }}
                              className="p-2 rounded-xl bg-indigo-50/60 dark:bg-slate-800/80 hover:bg-indigo-100/80 dark:hover:bg-slate-800 border border-indigo-100 dark:border-slate-700 cursor-pointer transition-colors flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-bold text-slate-900 dark:text-white truncate block">{post.description}</span>
                                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                                  📍 {(post as any).resolvedLocationBadge || post.location || 'Nearby'} • {(post as any).computedKm || post.distance || 0.5} km
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-indigo-600 shrink-0">
                                {isOwn ? tr('Responses →', 'रिस्पॉन्स →', 'રિસ્પોન્સ →') : tr('Chat →', 'चैट →', 'ચેટ →')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Service Experts Matches */}
                  {globalSearchResults.helpers.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 block">
                        🛠️ {tr('Service Experts & Professionals', 'सर्विस एक्सपर्ट्स व प्रोफेशनल्स', 'સર્વિસ એક્સપર્ટ્સ અને કારીગરો')} ({globalSearchResults.helpers.length})
                      </span>
                      <div className="space-y-1">
                        {globalSearchResults.helpers.slice(0, 3).map(helper => (
                          <div 
                            key={helper.id}
                            onClick={() => {
                              onNavigate('categories');
                            }}
                            className="p-2 rounded-xl bg-emerald-50/60 dark:bg-slate-800/80 hover:bg-emerald-100/80 dark:hover:bg-slate-800 border border-emerald-100 dark:border-slate-700 cursor-pointer transition-colors flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{helper.name}</span>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">{helper.skills?.[0] || helper.categoryId} • {helper.area}</span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 shrink-0 ml-2">{tr('Contact →', 'संपर्क →', 'સંપર્ક →')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shops & Businesses Matches */}
                  {globalSearchResults.shops.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400 block">
                        🏪 {tr('Shops & Showrooms', 'दुकानें व शोरूम', 'દુકાનો અને શોરૂમ')} ({globalSearchResults.shops.length})
                      </span>
                      <div className="space-y-1">
                        {globalSearchResults.shops.slice(0, 3).map((shop: any) => (
                          <div 
                            key={shop.id}
                            onClick={() => {
                              setIsRegisterShopModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-amber-50/60 dark:bg-slate-800/80 hover:bg-amber-100/80 dark:hover:bg-slate-800 border border-amber-100 dark:border-slate-700 cursor-pointer transition-colors flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{shop.name}</span>
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">{shop.categoryLabel || 'Business'} • {shop.area}</span>
                            </div>
                            <span className="text-[10px] font-black text-amber-600 shrink-0 ml-2">{tr('View →', 'देखें →', 'જુઓ →')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Matches */}
                  {globalSearchResults.categories.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-blue-600 dark:text-blue-400 block">
                        📂 {tr('Service Categories', 'सर्विस कैटेगरी', 'સર્વિસ કેટેગરી')} ({globalSearchResults.categories.length})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {globalSearchResults.categories.map(cat => {
                          const rawCatImg =
                            categoryImages[cat.id] ||
                            categoryImages[cat.id.toLowerCase()] ||
                            (cat.nameEn ? categoryImages[cat.nameEn.toLowerCase()] : '');
                          const customCatImg = typeof rawCatImg === 'string' && rawCatImg.trim().length > 0 ? rawCatImg.trim() : '';
                          return (
                            <button 
                              key={cat.id}
                              onClick={() => {
                                if (onSelectCategory) onSelectCategory(cat.id);
                                onNavigate('categories');
                                setHomeSearchQuery('');
                              }}
                              className="text-left rounded-xl overflow-hidden bg-blue-50/70 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 hover:border-blue-400 transition-all cursor-pointer flex flex-col"
                            >
                              {customCatImg ? (
                                <img
                                  src={customCatImg}
                                  alt={getCategoryName(cat, language)}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full aspect-video object-cover"
                                />
                              ) : null}
                              <span className="text-xs font-extrabold px-2.5 py-1.5 text-blue-800 dark:text-blue-300 truncate block">
                                {!customCatImg && '🛠️ '}{getCategoryName(cat, language)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No matches fallback */}
                  {globalSearchResults.posts.length === 0 && globalSearchResults.helpers.length === 0 && globalSearchResults.shops.length === 0 && globalSearchResults.categories.length === 0 && (
                    <div className="py-4 text-center space-y-2">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {tr(`No match found for "${homeSearchQuery}"`, `"${homeSearchQuery}" के लिए कोई परिणाम नहीं मिला`, `"${homeSearchQuery}" માટે કોઈ પરિણામ મળ્યું નથી`)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setHomeSearchQuery('');
                          handleSafeOpenPostSheet();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs cursor-pointer"
                      >
                        📢 {tr(`Create Post for "${homeSearchQuery}"`, `"${homeSearchQuery}" के लिए पोस्ट बनाएं`, `"${homeSearchQuery}" માટે પોસ્ટ બનાવો`)}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Create Post Button (Orange #FF8800) */}
          <div
            onClick={handleSafeOpenPostSheet}
            style={{ background: 'linear-gradient(135deg, #FF8800 0%, #FF6600 100%)' }}
            className="w-full rounded-2xl p-3.5 text-white shadow-lg shadow-orange-500/25 cursor-pointer active:scale-[0.98] transition-all border-2 border-orange-300 dark:border-orange-400 hover:brightness-105 flex items-center justify-between gap-3"
            title={language === 'EN' ? 'Create Post' : language === 'GU' ? 'પોસ્ટ બનાવો' : 'पोस्ट बनाएं'}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl shrink-0">📢</span>
              <span className="text-sm sm:text-base font-black tracking-wide text-white drop-shadow-xs">
                {language === 'EN' ? 'Create Post' : language === 'GU' ? 'પોસ્ટ બનાવો' : 'पोस्ट बनाएं'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-white text-slate-900 flex items-center justify-center shrink-0 shadow-xs">
              <ChevronRight className="w-5 h-5 stroke-[2.5] text-slate-900" />
            </div>
          </div>

          {/* 3. Browse Service Experts Banner (Blue #0066FF) */}
          <div 
            onClick={() => onNavigate('categories')}
            style={{ background: 'linear-gradient(135deg, #0066FF 0%, #0044CC 100%)' }}
            className="w-full rounded-2xl p-3.5 text-white shadow-lg shadow-blue-500/25 cursor-pointer active:scale-[0.98] transition-all border-2 border-blue-300 dark:border-blue-400 hover:brightness-105 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl shrink-0">🔍</span>
              <span className="text-sm sm:text-base font-black tracking-wide text-white drop-shadow-xs">
                {language === 'EN' ? 'Browse Service Experts' : language === 'GU' ? 'સર્વિસ એક્સપર્ટ્સ અને કારીગરો શોધો' : 'ब्राउज़ सर्विस एक्सपर्ट्स'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-white text-slate-900 flex items-center justify-center shrink-0 shadow-xs">
              <ChevronRight className="w-5 h-5 stroke-[2.5] text-slate-900" />
            </div>
          </div>

          {/* 4. Business & Shop Register Banner (Vibrant Purple Theme) */}
          <div
            onClick={handleSafeRegisterShop}
            className="w-full rounded-2xl p-3.5 text-white bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 shadow-lg shadow-purple-600/25 cursor-pointer active:scale-[0.98] transition-all border-2 border-purple-400/80 hover:brightness-105 flex items-center justify-between gap-3"
            title="Business & Shop Registration"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl shrink-0">🏪</span>
              <span className="text-sm sm:text-base font-black tracking-wide text-white drop-shadow-xs">
                {language === 'EN' ? 'Business & Shop Register' : language === 'GU' ? 'દુકાન અને બિઝનેસ રજિસ્ટર કરો' : 'दुकान व बिजनेस रजिस्टर करें'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-white text-slate-900 flex items-center justify-center shrink-0 shadow-xs">
              <ChevronRight className="w-5 h-5 stroke-[2.5] text-slate-900" />
            </div>
          </div>

          {/* 6. Live Community Broadcast Posts Feed (Active Nearby Radar) */}
          <div className="bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs">
            {/* Radar Feed Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 -ml-4.5 shrink-0" />
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {language === 'EN'
                    ? `Live Broadcast Radar (${searchedIntents.length})`
                    : language === 'GU'
                    ? `લાઈવ બ્રોડકાસ્ટ પોસ્ટ્સ (${searchedIntents.length})`
                    : `लाइव ब्रॉडकास्ट पोस्ट (${searchedIntents.length})`}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                  title={language === 'GU' ? 'લોકેશન બદલો (સમગ્ર ભારત)' : language === 'HI' ? 'लोकेशन बदलें (पूरा भारत)' : 'Change Location (Pan-India)'}
                >
                  <span className="shrink-0">📍</span>
                  <span className="truncate max-w-[110px] sm:max-w-none">{userLocation.district || 'All India'}</span>
                  <span className="text-[9px] opacity-70 shrink-0">▾</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Category Filter Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsHomeCategoryDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Filter className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span className="max-w-[95px] truncate">
                      {selectedCategory === 'all'
                        ? t('home.all')
                        : currentCategoryObj
                        ? getCategoryName(currentCategoryObj, language)
                        : currentMasterObj
                        ? (language === 'EN' ? currentMasterObj.nameEn : language === 'GU' ? currentMasterObj.nameGu : currentMasterObj.nameHi)
                        : selectedCategory}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  <AnimatePresence>
                    {isHomeCategoryDropdownOpen && (
                      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
                        <div
                          className="fixed inset-0"
                          onClick={() => setIsHomeCategoryDropdownOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 30 }}
                          className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[82vh] flex flex-col z-50 overflow-hidden"
                        >
                          {/* Modal Header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🏷️</span>
                              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                {language === 'GU'
                                  ? 'કેટેગરી પસંદ કરો'
                                  : language === 'HI'
                                  ? 'कैटेगरी चुनें'
                                  : 'Select Category'}
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsHomeCategoryDropdownOpen(false)}
                              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Category Options List */}
                          <div className="p-2 sm:p-3 overflow-y-auto space-y-1 flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCategory?.('all');
                                setIsHomeCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-between ${
                                selectedCategory === 'all'
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span>🌐</span>
                                <span>{t('home.all')}</span>
                              </span>
                              {selectedCategory === 'all' && <span className="font-black">✓</span>}
                            </button>

                            {CATEGORIES.map(cat => {
                              const catName = getCategoryName(cat, language);
                              const isSelected = selectedCategory === cat.id;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    onSelectCategory?.(cat.id);
                                    setIsHomeCategoryDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 truncate pr-2">
                                    <span className="shrink-0">🛠️</span>
                                    <span className="truncate">{catName}</span>
                                  </span>
                                  {isSelected && <span className="shrink-0 font-black">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Manual Refresh / Sync Button */}
                <button
                  type="button"
                  onClick={() => syncServerBroadcasts(true)}
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer shadow-2xs"
                  title="Sync Live Broadcasts"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Active Category Filter Pill if selected */}
            {selectedCategory !== 'all' && (
              <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl text-xs">
                <span className="font-bold text-indigo-800 dark:text-indigo-200">
                  🔍 Filter: {currentCategoryObj ? getCategoryName(currentCategoryObj, language) : selectedCategory} ({categoryFilteredIntents.length} {t('home.found')})
                </span>
                <button
                  type="button"
                  onClick={() => onSelectCategory?.('all')}
                  className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {t('home.clearFilter')} ✖
                </button>
              </div>
            )}

            {/* Broadcast Posts Feed List */}
            {searchedIntents.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center space-y-2.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center text-xl">
                  📢
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200">
                  {t('home.noRequests')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {language === 'EN'
                    ? 'Need a Plumber, Electrician, Mechanic, or Local Help right now? Create a post to alert nearby people!'
                    : language === 'GU'
                    ? 'પ્લમ્બર, ઈલેક્ટ્રિશિયન, મિકેનિક કે કોઈ મદદ જોઈએ છે? અત્યારે જ પોસ્ટ બનાવો!'
                    : 'प्लंबर, इलेक्ट्रीशियन, मैकेनिक या किसी भी मदद के लिए अभी अपनी पोस्ट बनाएं!'}
                </p>
                <button
                  type="button"
                  onClick={handleSafeOpenPostSheet}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'EN' ? 'Create Post' : language === 'GU' ? 'પોસ્ટ બનાવો' : 'पोस्ट बनाएं'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-0.5 scrollbar-hide">
                {searchedIntents.map((intent) => {
                  let myPostIds: string[] = [];
                  try {
                    myPostIds = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');
                  } catch (e) {}
                  const currentUserObj = activeUser || getCurrentUser();
                  const currentUid = String(currentUserObj?.uid || '').trim().toLowerCase();
                  const currentEmail = String(currentUserObj?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
                  const currentEmailUid = currentEmail ? 'email_' + currentEmail.replace(/[^a-z0-9]/g, '_') : '';
                  const intentAuthorId = String(intent.authorId || (intent as any).userId || '').trim().toLowerCase();
                  const intentAuthorEmail = String((intent as any).authorEmail || '').trim().toLowerCase();
                  const isMyOwnPost = Boolean(
                    (currentUid && intentAuthorId === currentUid) ||
                    (currentEmailUid && intentAuthorId === currentEmailUid) ||
                    (currentEmail && (intentAuthorEmail === currentEmail || intentAuthorId === currentEmail)) ||
                    myPostIds.includes(intent.id) ||
                    intent.id === newlyCreatedId
                  );

                  return (
                    <motion.div
                      key={intent.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl p-3.5 border transition-all shadow-2xs ${
                        isMyOwnPost
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/80 ring-1 ring-emerald-400/30'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/90 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                    >
                      {/* Line 1: Your Post (Live) + Location */}
                      <div className="flex items-center gap-2 flex-wrap min-w-0 mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800/60">
                        {isMyOwnPost ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs shrink-0">
                            ⚡ {language === 'EN' ? 'Your Post (Live)' : language === 'GU' ? 'તમારી પોસ્ટ (લાઈવ)' : 'आपकी पोस्ट (लाइव)'}
                          </span>
                        ) : (
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1 truncate shrink-0">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="truncate">{intent.authorName || 'Community Member'}</span>
                          </span>
                        )}
                        <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-0.5 truncate">
                          <span className="text-xs">📍</span>
                          <span className="truncate max-w-[180px] sm:max-w-none">
                            {(intent as any).resolvedLocationBadge || intent.location || 'Local Area'}
                          </span>
                        </span>
                      </div>

                      {/* Line 2: #Category (Orange & First) -> 0.3 km -> 57m remaining */}
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {/* Category tag FIRST, in ORANGE badge with clear font */}
                        {(intent.tags && intent.tags.length > 0 ? intent.tags : [intent.category ? `#${intent.category}` : '#General']).map((tag, idx) => (
                          <span
                            key={`${intent.id}_tag_${idx}`}
                            className="text-xs font-black px-2 py-0.5 rounded-md bg-orange-500 text-white shadow-2xs shrink-0"
                          >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}

                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 shrink-0">
                          {(intent as any).computedKm || intent.distance || 0.5} km
                        </span>

                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{(intent as any).minsRemaining || 55}m</span>
                        </span>

                        {intent.hasLocationPin && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                            📍 {t('post.pinDropped')}
                          </span>
                        )}
                      </div>

                      {/* Line 3: Broadcast Requirement Text - PRIMARY FOCUS with clean breathing room */}
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-relaxed break-words mt-2.5 mb-3">
                        {intent.description}
                      </p>

                      {(intent.imageUrl || intent.attachmentUrl || (intent as any).image_url) && (
                        <div className="mb-2.5 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 bg-slate-100 dark:bg-slate-800">
                          <img
                            src={intent.imageUrl || intent.attachmentUrl || (intent as any).image_url}
                            alt="Help Request Attachment"
                            loading="lazy"
                            decoding="async"
                            className="w-full max-h-48 object-cover"
                          />
                        </div>
                      )}

                        {/* Action Buttons: WhatsApp & Delete compact, Chat prominent in center */}
                        {(() => {
                          const repliersArr = Array.isArray((intent as any).repliers) ? (intent as any).repliers : [];
                          const responsesArr = Array.isArray((intent as any).responses) ? (intent as any).responses : [];
                          const uniqueRepliersCount = (() => {
                            const norm = (idVal: any, emailVal: any) => {
                              const e = String(emailVal || '').trim().toLowerCase();
                              if (e) return 'email_' + e.replace(/[^a-z0-9]/g, '_');
                              const i = String(idVal || '').trim().toLowerCase();
                              if (i.includes('@')) return 'email_' + i.replace(/[^a-z0-9]/g, '_');
                              return i;
                            };
                            const ownerNorm = norm(intent.authorId || (intent as any).user_id, (intent as any).authorEmail);
                            const set = new Set<string>();
                            repliersArr.forEach((r: any) => {
                              if (!r) return;
                              const k = norm(r.helperId || r.senderId || r.sender_id, r.helperEmail || r.senderEmail);
                              if (k && k !== 'system' && k !== ownerNorm) set.add(k);
                            });
                            if (set.size > 0) return set.size;
                            responsesArr.forEach((m: any) => {
                              if (!m) return;
                              const k = norm(m.senderId || m.sender_id || m.authorId, m.senderEmail || m.sender_email || m.authorEmail);
                              if (k && k !== 'system' && k !== ownerNorm) set.add(k);
                            });
                            if (set.size > 0) return set.size;
                            return Number((intent as any).responseCount ?? (intent as any).response_count ?? 0);
                          })();
                          const totalResponsesCount = uniqueRepliersCount;
                          const rawSeenCount = Number(localStorage.getItem(`locohelp_seen_responses_${intent.id}`) || 0);
                          const seenResponsesCount = rawSeenCount > totalResponsesCount ? totalResponsesCount : rawSeenCount;
                          const unreadResponsesCount = Math.max(0, totalResponsesCount - seenResponsesCount);
                          const hasChattedOnThisPost = chattedPostIds.includes(intent.id);

                          return isMyOwnPost ? (
                            /* Owner Controls: Compact WhatsApp & Delete, Large Chat Button in Center */
                            <div className="w-full flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <button
                                type="button"
                                onClick={(e) => handleSharePostToWhatsAppGroup(intent, e)}
                                className="h-8 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
                                title="Share Post on WhatsApp"
                              >
                                <Share2 className="w-3 h-3 shrink-0" />
                                <span>WhatsApp</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    localStorage.setItem(`locohelp_seen_responses_${intent.id}`, String(totalResponsesCount));
                                    setSeenResponsesTick(prev => prev + 1);
                                  } catch {}
                                  handleSafeOpenChat(intent);
                                }}
                                className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex-1 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 truncate"
                                title={language === 'EN' ? 'Open Chat' : language === 'GU' ? 'ચેટ ખોલો' : 'चैट खोलें'}
                              >
                                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">
                                  {language === 'EN' ? 'Chat' : language === 'GU' ? 'ચેટ' : 'चैट'}
                                </span>
                                {unreadResponsesCount > 0 ? (
                                  <span
                                    className="px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none bg-amber-400 text-slate-950 shadow-2xs animate-pulse shrink-0"
                                    title="New responses"
                                  >
                                    {unreadResponsesCount}
                                  </span>
                                ) : totalResponsesCount > 0 ? (
                                  <span
                                    className="px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none bg-indigo-800/80 text-indigo-100 shrink-0"
                                    title="Total responses"
                                  >
                                    {totalResponsesCount}
                                  </span>
                                ) : null}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDeletePost(intent.id, e)}
                                className="h-8 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-black flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                                title={t('home.deletePost')}
                              >
                                <Trash2 className="w-3 h-3 shrink-0" />
                                <span>{t('home.deletePost')}</span>
                              </button>
                            </div>
                          ) : (
                            /* Visitor Controls: 4-column equal grid */
                            <div className="w-full grid grid-cols-4 gap-1 sm:gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <button
                                type="button"
                                onClick={(e) => handleSharePostToWhatsAppGroup(intent, e)}
                                className="h-9 px-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 truncate"
                                title="Share Post on WhatsApp"
                              >
                                <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                <span className="truncate">WhatsApp</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.dispatchEvent(
                                    new CustomEvent('locohelp_open_report_modal', {
                                      detail: {
                                        reportedUserId: intent.authorId || (intent as any).user_id || '',
                                        reportedUserName: intent.authorName || (intent as any).author_name || 'Community Member',
                                        reportedPostId: intent.id,
                                        reportedPostTitle: intent.description
                                      }
                                    })
                                  );
                                }}
                                className="h-9 px-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 truncate"
                                title={t('rep.reportAndBlockBtn')}
                              >
                                <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                <span className="truncate">{tr('Report', 'रिपोर्ट', 'રિપોર્ટ')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedUserForProfile({
                                    name: intent.authorName || 'Community Member',
                                    distance: (intent as any).computedKm || intent.distance || 0.5
                                  })
                                }
                                className="h-9 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 truncate"
                                title={t('home.viewProfile')}
                              >
                                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                <span className="truncate">{tr('Profile', 'प्रोफाइल', 'પ્રોફાઇલ')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSafeOpenChat(intent)}
                                className={`h-9 px-1 rounded-xl text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95 truncate ${
                                  hasChattedOnThisPost
                                    ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white ring-1 ring-emerald-400/40'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                                title={hasChattedOnThisPost ? 'Continue conversation' : t('home.directChat')}
                              >
                                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                <span className="truncate">
                                  {hasChattedOnThisPost
                                    ? tr('Your Chat', 'आपकी चैट', 'તમારી ચેટ')
                                    : tr('Chat', 'चैट', 'ચેટ')}
                                </span>
                              </button>
                            </div>
                          );
                        })()}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. Sponsored Ad Banners Section (Admin-Managed 16:9 Banners Only) */}
          <AdBannerSection 
            onOpenChat={handleSafeOpenChat}
          />

          {/* 7. Dedicated Job Portal Section (Side-by-side interactive banners: Job Seeker & For Employer) */}
          <JobPortalSection 
            onOpenSeekerNew={() => {
              if (isGuestUser()) {
                setLoginPromptTitle({
                  en: 'Sign In Required for Job Profile',
                  hi: 'नौकरी प्रोफाइल बनाने के लिए लॉगिन करें',
                  gu: 'નોકરી પ્રોફાઇલ બનાવવા માટે લોગિન કરો'
                });
                setIsLoginPromptOpen(true);
                return;
              }
              setSeekerModalInitialTab('new');
              setIsJobSeekerModalOpen(true);
            }}
            onOpenSeekerRegistered={() => {
              setSeekerModalInitialTab('registered');
              setIsJobSeekerModalOpen(true);
            }}
            onOpenEmployerForm={() => {
              setEmployerModalInitialTab('browse');
              setIsEmployerVacancyModalOpen(true);
            }}
            onOpenEmployerNew={() => {
              if (isGuestUser()) {
                setLoginPromptTitle({
                  en: 'Sign In Required to Post Vacancy',
                  hi: 'वेकेंसी पोस्ट करने के लिए लॉगिन करें',
                  gu: 'વેકેન્સી પોસ્ટ કરવા માટે લોગિન કરો'
                });
                setIsLoginPromptOpen(true);
                return;
              }
              setEmployerModalInitialTab('new');
              setIsEmployerVacancyModalOpen(true);
            }}
            onOpenEmployerRegistered={() => {
              setEmployerModalInitialTab('registered');
              setIsEmployerVacancyModalOpen(true);
            }}
            onBrowseJobs={() => {
              setJobBrowseInitialTab('all');
              setIsJobBrowseModalOpen(true);
            }}
          />

          {/* 4. Unified Community, Guide & Vision Section (Chhote aur compact buttons) */}
          <div className="bg-white/90 dark:bg-slate-800/90 border border-violet-200/70 dark:border-slate-700/70 rounded-2xl p-2.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('home.community')}
              </span>
            </div>

            {/* 4 Compact & Sleek Buttons (including Install App PWA) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {/* Install App (PWA) */}
              <button
                onClick={handleInstallAppClick}
                className="bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white rounded-xl py-1.5 px-2 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all text-center group cursor-pointer"
                title="Install LocoHelp Mobile App"
              >
                <Smartphone className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="font-bold text-[10px] truncate">{t('home.installApp') || 'Install App'}</span>
              </button>

              {/* WhatsApp Share */}
              <button
                onClick={handleWhatsAppShare}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-1.5 px-2 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all text-center group cursor-pointer"
                title="Share on WhatsApp with neighborhood groups"
              >
                <Share2 className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="font-bold text-[10px] truncate">{t('home.whatsapp')}</span>
              </button>

              {/* App Guide & 20 Real Examples */}
              <button
                onClick={() => setIsGuideOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl py-1.5 px-2 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all text-center group cursor-pointer"
                title="How to use & 20+ real life examples"
              >
                <HelpCircle className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="font-bold text-[10px] truncate">{t('home.appGuide')}</span>
              </button>

              {/* Future Vision & Roadmap */}
              <button
                onClick={() => onNavigate('roadmap')}
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl py-1.5 px-2 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all text-center group cursor-pointer"
                title="Future Vision & Development Roadmap"
              >
                <Rocket className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="font-bold text-[10px] truncate">{t('home.futureVision')}</span>
              </button>
          </div>
          
          {/* Public Suggestions Banner Box at the Very Bottom of Main Page */}
          <PublicSuggestionsBanner
            language={language}
            activeUser={activeUser}
            onRequireLogin={() => {
              setLoginPromptTitle({
                en: 'Sign In Required to Share Suggestion',
                hi: 'सुझाव साझा करने के लिए लॉगिन करें',
                gu: 'સૂચન શેર કરવા માટે લોગિન કરો'
              });
              setLoginPromptDesc({
                en: 'Please sign in with your verified account to post a public suggestion on LocoHelp.',
                hi: 'लोकोहेल्प की सार्वजनिक सुझाव पेटी में अपना विचार लिखने के लिए कृपया लॉगिन करें।',
                gu: 'LocoHelp ના જાહેર સૂચન બોક્સમાં તમારો વિચાર લખવા માટે કૃપા કરીને લોગિન કરો.'
              });
              setIsLoginPromptOpen(true);
            }}
            showToast={(msg) => {
              setCreatedToast(msg);
              setTimeout(() => setCreatedToast(null), 3200);
            }}
          />
        </div>

        {/* Sleek thin footer line at the bottom of the scrollable page */}
        <footer className="bg-slate-900 border-t border-slate-800/80 py-2 px-3 sm:px-4 mt-6 text-center text-[11px] sm:text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex items-center justify-center text-center">
            <span className="font-semibold text-[11px] sm:text-xs text-slate-300 tracking-wide">
              LocoHelp © 2026 • Made for Local India
            </span>
          </div>
        </footer>

        {/* Bottom-of-Page Auto-Scrolling Official Red Warning & Legal Disclaimer Ticker (Visible only when user scrolls to the bottom) */}
        <RedWarningTicker />
      </div>
    </div>

      {/* User Profile Request Modal */}
      {selectedUserForProfile && (
        <UserProfileModal 
          isOpen={Boolean(selectedUserForProfile)}
          onClose={() => setSelectedUserForProfile(null)}
          userName={selectedUserForProfile.name}
          distance={selectedUserForProfile.distance}
        />
      )}

      {/* Language dropdown is now anchored directly below the header button */}

      {/* App Guide & 20 Examples Modal */}
      <AnimatePresence>
        {isGuideOpen && (
          <AppGuideModal 
            onClose={() => setIsGuideOpen(false)} 
            onExplore={() => setIsGuideOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Register Shop, Showroom or Mall Modal (Opens ONLY Shop Registration Form) */}
      <RegisterShopModal 
        isOpen={isRegisterShopModalOpen}
        onClose={() => setIsRegisterShopModalOpen(false)}
        initialTab="new"
        onSuccess={() => {
          setCreatedToast("⏳ " + (language === 'EN' ? 'Business / Shop submitted for Admin approval!' : language === 'GU' ? 'દુકાન/બિઝનેસ એડમિન અપ્રૂવલ માટે સબમિટ થઈ ગયું!' : 'दुकान/बिज़नेस एडमिन अप्रूवल के लिए सबमिट हो गया!'));
          setTimeout(() => setCreatedToast(null), 4000);
        }}
      />

      {/* Service Expert Registration Profile Modal */}
      <FreeHelperRegisterModal 
        isOpen={isFreeHelperModalOpen}
        onClose={() => setIsFreeHelperModalOpen(false)}
        onSuccess={() => {
          setCreatedToast("⏳ " + (language === 'EN' ? 'Service Expert profile submitted for Admin approval!' : language === 'GU' ? 'સર્વિસ એક્સપર્ટ પ્રોફાઇલ એડમિન અપ્રૂવલ માટે સબમિટ થઈ ગઈ!' : 'सर्विस एक्सपर्ट प्रोफाइल एडमिन अप्रूवल के लिए सबमिट हो गई!'));
          setTimeout(() => setCreatedToast(null), 4000);
        }}
      />

      {/* Job Seeker Profile Modal */}
      <JobSeekerModal 
        isOpen={isJobSeekerModalOpen}
        onClose={() => setIsJobSeekerModalOpen(false)}
        initialTab={seekerModalInitialTab}
        onSuccess={() => {
          setCreatedToast("💼 " + (language === 'EN' ? 'Job Seeker profile submitted for Admin approval!' : language === 'GU' ? 'નોકરી પ્રોફાઇલ એડમિન ચકાસણી માટે સબમિટ થઈ ગઈ!' : 'नौकरी प्रोफाइल एडमिन सत्यापन के लिए सबमिट हो गई!'));
          setTimeout(() => setCreatedToast(null), 4500);
        }}
      />

      {/* Employer Job Vacancy Modal */}
      <EmployerVacancyModal 
        isOpen={isEmployerVacancyModalOpen}
        onClose={() => setIsEmployerVacancyModalOpen(false)}
        initialTab={employerModalInitialTab}
        onSuccess={() => {
          setCreatedToast("🏢 " + (language === 'EN' ? 'Job Vacancy submitted for Admin approval!' : language === 'GU' ? 'સ્ટાફ વેકેન્સી એડમિન ચકાસણી માટે સબમિટ થઈ ગઈ!' : 'स्टाफ वेकेंसी एडमिन सत्यापन के लिए सबमिट हो गई!'));
          setTimeout(() => setCreatedToast(null), 4500);
        }}
      />

      {/* Job Portal Browse Live Listings Modal */}
      <JobPortalBrowseModal 
        isOpen={isJobBrowseModalOpen}
        onClose={() => setIsJobBrowseModalOpen(false)}
        onOpenSeekerForm={() => setIsJobSeekerModalOpen(true)}
        onOpenEmployerForm={() => setIsEmployerVacancyModalOpen(true)}
        initialTab={jobBrowseInitialTab}
      />

      {/* WhatsApp Share Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 inset-x-6 z-50 bg-emerald-600 text-white text-xs font-bold py-3 px-4 rounded-2xl shadow-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">✅</span>
              <span>WhatsApp invite message ready to send!</span>
            </div>
            <button onClick={() => setShowShareToast(false)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Post In-App Confirmation Modal (Never blocked by iframe sandbox) */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-rose-200 dark:border-rose-900/60 flex flex-col gap-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center text-2xl shadow-inner">
                🗑️
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {language === 'EN' ? 'Delete Broadcast Post?' : language === 'GU' ? 'પોસ્ટ ડિલીટ કરવી છે?' : 'पोस्ट डिलीट करें?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'EN' 
                    ? 'This post will be permanently deleted from the radar.' 
                    : language === 'GU'
                    ? 'આ પોસ્ટ લોકલ રડારમાંથી કાયમ માટે દૂર કરવામાં આવશે.'
                    : 'यह पोस्ट लोकल रडार से हमेशा के लिए हटा दी जाएगी।'}
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPostToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {language === 'EN' ? 'Cancel' : language === 'GU' ? 'રદ કરો' : 'रद्द करें'}
                </button>
                <button
                  type="button"
                  onClick={() => confirmDeletePost(postToDelete)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/25 active:scale-95 transition-all cursor-pointer"
                >
                  {language === 'EN' ? 'Yes, Delete' : language === 'GU' ? 'હા, ડિલીટ કરો' : 'हाँ, हटाएं'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Guest Mode Email OTP / Password Sign-In Prompt Modal */}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        onGoToLogin={() => onNavigate('login')}
        onSuccess={() => {
          if (loginSuccessAction) {
            loginSuccessAction();
            setLoginSuccessAction(undefined);
          }
        }}
        actionTitleEn={loginPromptTitle.en}
        actionTitleHi={loginPromptTitle.hi}
        actionTitleGu={loginPromptTitle.gu}
        actionDescEn={loginPromptDesc.en}
        actionDescHi={loginPromptDesc.hi}
        actionDescGu={loginPromptDesc.gu}
      />

      {/* Post Owner Responses / Chats Inbox Modal */}
      <PostResponsesModal
        isOpen={isResponsesModalOpen}
        onClose={() => setIsResponsesModalOpen(false)}
        intent={selectedIntentForResponses}
        onOpenChat={(intent) => handleSafeOpenChat(intent)}
      />

      {/* Manual Pan-India Location Selection Modal */}
      <PanIndiaLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={userLocation}
        onLocationSaved={(newLoc) => {
          setUserLocation(newLoc);
          setCreatedToast(
            language === 'EN'
              ? `📍 Location saved: ${newLoc.area ? newLoc.area + ', ' : ''}${newLoc.district} (${newLoc.state})`
              : language === 'GU'
              ? `📍 લોકેશન સેવ થઈ ગયું: ${newLoc.area ? newLoc.area + ', ' : ''}${newLoc.district} (${newLoc.state})`
              : `📍 लोकेशन सेव हो गई: ${newLoc.area ? newLoc.area + ', ' : ''}${newLoc.district} (${newLoc.state})`
          );
          setTimeout(() => setCreatedToast(null), 4000);
        }}
      />

      {/* PWA Mobile App Installation Modal */}
      <InstallAppModal
        isOpen={isInstallAppModalOpen}
        onClose={() => setIsInstallAppModalOpen(false)}
      />

      {/* Post Broadcast Sheet Modal */}
      <AnimatePresence>
        {isPostSheetOpen && (
          <PostIntentSheet
            onClose={() => setIsPostSheetOpen(false)}
            onPostCreated={handlePostCreated}
          />
        )}
      </AnimatePresence>

      {/* Live Broadcast Post In-Place Chat Modal Popup */}
      <AnimatePresence>
        {chatModalIntent && (
          <div
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 9000 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl h-full sm:h-[92vh] sm:max-h-[820px] bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              {/* Chat Screen Component Container (Single Unified Header inside ChatScreen) */}
              <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
                <ChatScreen
                  intent={chatModalIntent}
                  isModal={true}
                  onBack={() => setChatModalIntent(null)}
                  onExpandFullScreen={() => {
                    const target = chatModalIntent;
                    setChatModalIntent(null);
                    onOpenChat(target);
                  }}
                  onReport={() => {
                    setChatModalIntent(null);
                    window.dispatchEvent(
                      new CustomEvent('locohelp_open_report_modal', {
                        detail: {
                          reportedUserId: chatModalIntent.authorId || (chatModalIntent as any).user_id || '',
                          reportedUserName: chatModalIntent.authorName || (chatModalIntent as any).author_name || 'Community Member',
                          reportedPostId: chatModalIntent.id,
                          reportedPostTitle: chatModalIntent.description
                        }
                      })
                    );
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
