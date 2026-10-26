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
import { fetchLiveIntents, deleteIntentOnServer, getCachedCategoryImages, fetchCategoryImages } from '../api';
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
import FeedbackBanner from '../components/FeedbackBanner';
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
  const { language, setLanguage, t } = useLanguage();
  const [isHomeCategoryDropdownOpen, setIsHomeCategoryDropdownOpen] = useState(false);
  const [isPostSheetOpen, setIsPostSheetOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [loginPromptTitle, setLoginPromptTitle] = useState({ en: 'Sign In Required', hi: 'लॉगिन आवश्यक है' });
  const [loginPromptDesc, setLoginPromptDesc] = useState<{ en?: string; hi?: string }>({});
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

  // Push browser history state whenever any modal / popup / chat inbox opens on HomeScreen
  const isAnyHomeModalOpen = Boolean(
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
    window.addEventListener('locohelp_close_active_modal', handleCloseActiveModal);
    return () => window.removeEventListener('locohelp_close_active_modal', handleCloseActiveModal);
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
        hi: 'चैट करने के लिए लॉगिन करें'
      });
      setLoginPromptDesc({
        en: 'Connect directly with local service experts and neighbors. Sign in with Email OTP or Password!',
        hi: 'पड़ोसियों और सर्विस एक्सपर्ट्स से चैट करने के लिए ईमेल OTP या पासवर्ड से लॉगिन करें।'
      });
      setLoginSuccessAction(() => () => onOpenChat(intent));
      setIsLoginPromptOpen(true);
      return;
    }
    onOpenChat(intent);
  };

  const handleSafeOpenPostSheet = () => {
    if (isGuestUser()) {
      setLoginPromptTitle({
        en: 'Sign In Required to Post Broadcast',
        hi: 'ब्रॉडकास्ट पोस्ट करने के लिए लॉगिन करें'
      });
      setLoginPromptDesc({
        en: 'Broadcast your requirement to nearby service experts. Sign in with Email OTP or Password!',
        hi: 'अपने एरिया में आवश्यकता पोस्ट करने के लिए ईमेल OTP या पासवर्ड से लॉगिन करें।'
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
        hi: 'प्रोफाइल बनाने के लिए लॉगिन करें'
      });
      setLoginPromptDesc({
        en: 'Create your verified local profile with skills, ratings & phone number.',
        hi: 'अपनी रेटिंग, स्किल्स और मोबाइल नंबर के साथ प्रोफाइल बनाने के लिए लॉगिन करें।'
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
        hi: 'बिज़नेस/दुकान दर्ज करने के लिए लॉगिन करें'
      });
      setLoginPromptDesc({
        en: 'List your shop, showroom or local service on the neighborhood radar with Email OTP or Password sign-in.',
        hi: 'अपनी दुकान या सर्विस दर्ज करने के लिए ईमेल OTP या पासवर्ड से लॉगिन करें।'
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
        hi: 'प्रोफाइल बनाने के लिए साइन-इन करें'
      });
      setLoginPromptDesc({
        en: 'Create your verified local service expert profile with skills, ratings & phone number in 1-click.',
        hi: 'अपनी रेटिंग, स्किल्स और मोबाइल नंबर के साथ सर्विस एक्सपर्ट्स लिस्टिंग में प्रोफाइल बनाने के लिए साइन-इन करें।'
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
    // Master Categories
    utility_emergency: ['plumb', 'pipe', 'tap', 'water', 'leak', 'electr', 'wire', 'light', 'fan', 'mechanic', 'car', 'bike', 'puncture', 'tyre', 'battery', 'carpent', 'wood', 'door', 'lock', 'paint', 'ac', 'fridge', 'mason', 'mistri'],
    sports_fitness: ['cricket', 'gym', 'fitness', 'workout', 'badminton', 'running', 'jog', 'marathon', 'football', 'turf', 'sport', 'exercise', 'yoga', 'trainer'],
    social_casual: ['chai', 'tea', 'coffee', 'meetup', 'walk', 'chess', 'book', 'companion', 'game', 'gaming', 'ps5', 'catan', 'pet', 'dog', 'puppy', 'chat', 'friend'],
    daily_errands: ['clean', 'maid', 'housekeep', 'deliver', 'parcel', 'luggage', 'shift', 'tutor', 'teach', 'study', 'maths', 'science', 'senior', 'elder', 'medicine'],

    // Subcategories
    plumber: ['plumb', 'pipe', 'tap', 'water', 'leak', 'flush', 'basin', 'tank'],
    electrician: ['electr', 'wire', 'wiring', 'switch', 'light', 'fan', 'inverter', 'current', 'fuse', 'short'],
    mechanic: ['mechanic', 'car', 'bike', 'puncture', 'tyre', 'tire', 'battery', 'jumpstart', 'towing', 'breakdown'],
    cab_auto_driver: ['cab', 'auto', 'rickshaw', 'taxi', 'driver', 'drop', 'pickup', 'ride', 'outstation', 'car rent'],
    carpenter: ['carpent', 'wood', 'door', 'lock', 'furniture', 'bed', 'sofa', 'table'],
    painter: ['paint', 'wall', 'putty', 'color', 'polish'],
    ac_repair: ['ac', 'air condition', 'fridge', 'refrigerator', 'cooling', 'washing machine', 'appliance'],
    cleaning: ['clean', 'maid', 'sweep', 'dust', 'wash', 'housekeep'],
    delivery: ['deliver', 'parcel', 'shift', 'tempo', 'luggage', 'courier', 'porter'],
    tutor: ['tutor', 'teach', 'study', 'maths', 'science', 'english', 'tuition'],
    mason: ['mason', 'mistri', 'tile', 'plaster', 'cement', 'floor', 'brick'],
    cricket: ['cricket', 'turf', 'leather ball', 'match', 'batting', 'bowling', 'batsman'],
    gym_fitness: ['gym', 'fitness', 'workout', 'weightlifting', 'trainer', 'spotter', 'diet'],
    badminton: ['badminton', 'shuttle', 'racket', 'court', 'doubles'],
    running: ['running', 'jog', 'jogging', 'marathon', '5k', '10k', 'stamina'],
    football: ['football', 'soccer', 'turf', 'striker', 'goal'],
    chai_coffee: ['chai', 'tea', 'coffee', 'tapri', 'cafe', 'evening meetup'],
    companion: ['companion', 'evening walk', 'chess', 'book club', 'talking', 'senior'],
    gaming: ['gaming', 'game', 'ps5', 'xbox', 'catan', 'monopoly', 'board game', 'lan'],
    pet_care: ['pet', 'dog', 'cat', 'puppy', 'dog walking', 'foster'],
    senior_help: ['senior', 'elder', 'medicine', 'hospital assist', 'bank work', 'volunteer']
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

  const processedIntents = intents.filter(item => {
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

  // Filter by category
  const categoryFilteredIntents = processedIntents.filter(item => {
    if (selectedCategory === 'all') return true;
    const keywords = categoryKeywords[selectedCategory] || [selectedCategory];
    const text = (item.description + ' ' + (item.tags ? item.tags.join(' ') : '')).toLowerCase();
    return keywords.some(k => text.includes(k));
  });

  const baseCategoryIntents = categoryFilteredIntents;

  // Strict Hyper-Local Location Broadcasting: Only show posts matching the user's selected location
  const activeHeaderDistrict = (userLocation.district || 'Gandhinagar').trim().toLowerCase();
  const connectedDistricts = getConnectedTwinDistricts(activeHeaderDistrict);

  const zoneFilteredIntents = baseCategoryIntents.filter(item => {
    if (!activeHeaderDistrict || activeHeaderDistrict === 'all') return true;
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

      // 3. Newest / nearest priority
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
      alert(language === 'EN' 
        ? 'Voice search is not supported in this browser. Please type to search.' 
        : language === 'GU'
        ? 'તમારા બ્રાઉઝરમાં વોઈસ સર્ચ સપોર્ટ નથી. કૃપા કરીને ટાઈપ કરીને શોધો.'
        : 'आपके ब्राउज़र में वॉइस सर्च सपोर्ट नहीं है। कृपया टाइप करके खोजें।');
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

  // Unified Deduplicating Merger for Multi-Device Broadcast Sync
  const mergeAndDeduplicateIntents = (incoming: Intent[]) => {
    setIntents(prev => {
      let deletedIds: string[] = [];
      let recentCustom: Intent[] = [];
      try {
        const idRaw = localStorage.getItem('locohelp_deleted_posts');
        if (idRaw) deletedIds = JSON.parse(idRaw);
        const customRaw = localStorage.getItem('locohelp_custom_intents');
        if (customRaw) {
          const parsed: Intent[] = JSON.parse(customRaw);
          const now = Date.now();
          // Preserve newly created user posts (within last 60 minutes) so background polls never wipe them
          recentCustom = parsed.filter(item => {
            if (!item || !item.id || deletedIds.includes(item.id)) return false;
            const createdMs = new Date(item.createdAt || 0).getTime();
            return now - createdMs < 60 * 60 * 1000;
          });
        }
      } catch (e) {
        console.warn("Deleted posts sync error:", e);
      }

      const all = [...incoming, ...recentCustom, ...prev];
      const seenIds = new Set<string>();
      const result: Intent[] = [];

      for (const item of all) {
        if (!item || !item.id) continue;
        if (deletedIds.includes(item.id)) continue;
        if (seenIds.has(item.id)) continue;

        seenIds.add(item.id);
        result.push(item);
      }

      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      // Update instant offline local cache
      try {
        localStorage.setItem('locohelp_cached_intents', JSON.stringify(result.slice(0, 50)));
      } catch (e) {}

      return result;
    });
  };

  const syncServerBroadcasts = async (isManual = false) => {
    if (isManual) setIsSyncing(true);
    try {
      const serverIntents = await fetchLiveIntents();
      if (serverIntents && Array.isArray(serverIntents)) {
        mergeAndDeduplicateIntents(serverIntents);
      }
    } catch (err) {
      console.warn("Live broadcast sync notice:", err);
    } finally {
      if (isManual) {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  };

  // Multi-device real-time sync across all phones (Supabase Realtime)
  useEffect(() => {
    // 1. Instant local load for 0ms initial render
    try {
      const stored = localStorage.getItem('locohelp_cached_intents') || localStorage.getItem('locohelp_custom_intents');
      if (stored) {
        const localItems: Intent[] = JSON.parse(stored);
        if (localItems.length > 0) {
          mergeAndDeduplicateIntents(localItems);
        }
      }
    } catch (e) {}

    // 2. Real-time Express & PostgreSQL sync (frequent poll for instant multi-device responsiveness)
    syncServerBroadcasts();
    const pollInterval = setInterval(() => {
      syncServerBroadcasts();
    }, 4000);

    return () => {
      clearInterval(pollInterval);
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
      const myIds = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');
      localStorage.setItem('locohelp_my_post_ids', JSON.stringify(myIds.filter((id: string) => id !== intentId)));
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
      
      {/* Fixed Top Sticky Header Bar: [Compact 🌐 ગુજ ▾ / 🌐 EN ▾ Dropdown] -> [LocoHelp Logo] -> [Compact Location Badge] -> [3-Dot Menu ⋮] */}
      <header className="sticky top-0 z-30 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm px-2 md:px-5 py-2 md:py-2.5 flex items-center justify-between gap-1.5 md:gap-3 lg:gap-4 w-full max-w-full box-border">
        {/* 1. Compact Language Selector Dropdown (<768px: 🌐 ગુજ ▾ / 🌐 EN ▾, >=768px: full language label) */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsHeaderMenuOpen(false);
              setIsLangModalOpen((prev) => !prev);
            }}
            className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 bg-white dark:bg-slate-800 rounded-full hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 active:scale-95 cursor-pointer text-xs"
            title="Select Language"
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

          {/* Compact Dropdown Menu right below the button */}
          <AnimatePresence>
            {isLangModalOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsLangModalOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-1.5 w-40 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 space-y-1"
                >
                  {SUPPORTED_LANGUAGES.map((langItem) => {
                    const isSelected = language === langItem.code;
                    return (
                      <button
                        key={langItem.code}
                        type="button"
                        onClick={() => {
                          setLanguage(langItem.code);
                          setIsLangModalOpen(false);
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

        {/* 2. LocoHelp Logo (Icon unchanged, prominent bold brand text next to it) */}
        <div
          onClick={() => {
            onSelectCategory?.('all');
            onNavigate('home');
          }}
          className="flex-shrink-0 flex items-center justify-center select-none cursor-pointer py-0.5"
          title="Home"
        >
          <LocoHelpLogo size={28} showText={true} textSize="sm" className="flex-shrink-0" />
        </div>

        {/* 3. Right Side: [Compact Location Badge] -> [3-Dot Menu ⋮] */}
        <div className="flex items-center gap-1.5 md:gap-3 lg:gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsHeaderMenuOpen(false);
              setIsLocationModalOpen(true);
            }}
            className="flex items-center gap-1 px-2 md:px-3.5 py-1 md:py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 transition-all shadow-2xs active:scale-95 cursor-pointer max-w-[90px] md:max-w-none shrink-0 text-xs"
            title="Select Location (Pan-India)"
          >
            <span className="text-xs shrink-0">📍</span>
            <span className="text-xs font-black truncate md:overflow-visible md:whitespace-nowrap">
              {userLocation.district || (language === 'EN' ? 'Location' : language === 'GU' ? 'લોકેશન' : 'लोकेशन')}
            </span>
          </button>

          {/* Single Stylish Vertical 3-Dot Menu Button (⋮) combining Profile, Settings, and Sign In / Log Out */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsLangModalOpen(false);
                setIsHeaderMenuOpen((prev) => !prev);
              }}
              className="w-7 h-7 sm:w-9 sm:h-9 p-1 sm:p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer shrink-0 flex items-center justify-center active:scale-95"
              title="Menu (Profile, Settings, Sign In)"
              aria-label="Open menu"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800 dark:text-slate-200 shrink-0" />
            </button>

            <AnimatePresence>
              {isHeaderMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsHeaderMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 space-y-1"
                  >
                    {/* Option 1: Profile */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        handleSafeProfileClick();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    >
                      <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>
                        {language === 'GU'
                          ? 'પ્રોફાઇલ'
                          : language === 'HI'
                          ? 'प्रोफ़ाइल'
                          : 'Profile'}
                      </span>
                    </button>

                    {/* Option 2: Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        onNavigate('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    >
                      <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>
                        {language === 'GU'
                          ? 'સેટિંગ્સ'
                          : language === 'HI'
                          ? 'सेटिंग्स'
                          : 'Settings'}
                      </span>
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-0.5" />

                    {/* Option 3: Sign In / Login or Log Out */}
                    {isGuestUser() ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          handleSafeProfileClick();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <LogIn className="w-4 h-4 shrink-0" />
                        <span>
                          {language === 'GU'
                            ? 'લોગિન / સાઇન ઇન'
                            : language === 'HI'
                            ? 'लॉगिन / साइन इन'
                            : 'Sign In / Login'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsHeaderMenuOpen(false);
                          await logoutUser();
                          setActiveUser(getCurrentUser());
                          setCreatedToast(
                            language === 'GU'
                              ? '✅ સફળતાપૂર્વક લોગ આઉટ થઈ ગયું!'
                              : language === 'HI'
                              ? '✅ सफलतापूर्वक लॉग आउट हो गया!'
                              : '✅ Logged out successfully!'
                          );
                          setTimeout(() => setCreatedToast(null), 3000);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>
                          {language === 'GU'
                            ? 'લોગ આઉટ'
                            : language === 'HI'
                            ? 'लॉग आउट'
                            : 'Log Out'}
                        </span>
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Full Page Scroll Container - Uninhibited smooth scrolling for all posts */}
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

        <div className="px-3.5 sm:px-5 mt-3 sm:mt-4 space-y-3 max-w-full overflow-hidden">
          
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
                    <span>🔍 Results for "{homeSearchQuery}"</span>
                    <button onClick={() => setHomeSearchQuery('')} className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] cursor-pointer">
                      Clear Filter ✖
                    </button>
                  </div>

                  {/* Live Broadcast Posts Matches */}
                  {globalSearchResults.posts.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 block">
                        📢 Live Broadcast Posts ({globalSearchResults.posts.length})
                      </span>
                      <div className="space-y-1">
                        {globalSearchResults.posts.slice(0, 4).map(post => {
                          let myPostIds: string[] = [];
                          try {
                            myPostIds = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');
                          } catch (e) {}
                          const currentUid = activeUser?.uid || getCurrentUser()?.uid;
                          const isOwn = Boolean((currentUid && post.authorId === currentUid) || myPostIds.includes(post.id));
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
                                {isOwn ? 'Responses →' : 'Chat →'}
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
                        🛠️ Service Experts & Professionals ({globalSearchResults.helpers.length})
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
                            <span className="text-[10px] font-black text-emerald-600 shrink-0 ml-2">Contact &rarr;</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shops & Businesses Matches */}
                  {globalSearchResults.shops.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400 block">
                        🏪 Shops & Showrooms ({globalSearchResults.shops.length})
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
                            <span className="text-[10px] font-black text-amber-600 shrink-0 ml-2">View &rarr;</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Matches */}
                  {globalSearchResults.categories.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-blue-600 dark:text-blue-400 block">
                        📂 Service Categories ({globalSearchResults.categories.length})
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
                        No match found for "{homeSearchQuery}"
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setHomeSearchQuery('');
                          handleSafeOpenPostSheet();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs cursor-pointer"
                      >
                        📢 Post Broadcast for "{homeSearchQuery}"
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
            title={language === 'EN' ? 'Create Post' : language === 'GU' ? 'પોસ્ટ કરો' : 'पोस्ट करें'}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl shrink-0">📢</span>
              <span className="text-sm sm:text-base font-black tracking-wide text-white drop-shadow-xs">
                {language === 'EN' ? 'Create Post' : language === 'GU' ? 'પોસ્ટ કરો' : 'पोस्ट करें'}
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
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                  📍 {userLocation.district || 'All India'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Category Filter Dropdown */}
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
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setIsHomeCategoryDropdownOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.96 }}
                          className="absolute right-0 top-full mt-1.5 w-52 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-40 space-y-1"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCategory?.('all');
                              setIsHomeCategoryDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                              selectedCategory === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            🌐 {t('home.all')}
                          </button>
                          {CATEGORIES.map(cat => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                onSelectCategory?.(cat.id);
                                setIsHomeCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                                selectedCategory === cat.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span>🛠️</span>
                              <span className="truncate">{getCategoryName(cat, language)}</span>
                            </button>
                          ))}
                        </motion.div>
                      </>
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

                {/* Quick + Post Broadcast Button in Header */}
                <button
                  type="button"
                  onClick={handleSafeOpenPostSheet}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{language === 'EN' ? 'Post Broadcast' : language === 'GU' ? 'પોસ્ટ કરો' : 'पोस्ट करें'}</span>
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
                    ? 'Need a Plumber, Electrician, Mechanic, or Local Help right now? Broadcast your post to alert nearby people!'
                    : language === 'GU'
                    ? 'પ્લમ્બર, ઈલેક્ટ્રિશિયન, મિકેનિક કે કોઈ મદદ જોઈએ છે? અત્યારે જ બ્રોડકાસ્ટ પોસ્ટ કરો!'
                    : 'प्लंबर, इलेक्ट्रीशियन, मैकेनिक या किसी भी मदद के लिए अभी अपनी ब्रॉडकास्ट पोस्ट डालें!'}
                </p>
                <button
                  type="button"
                  onClick={handleSafeOpenPostSheet}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'EN' ? 'Post Broadcast Now' : language === 'GU' ? 'બ્રોડકાસ્ટ પોસ્ટ કરો' : 'अभी ब्रॉडकास्ट पोस्ट करें'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-0.5 scrollbar-hide">
                {searchedIntents.map((intent) => {
                  let myPostIds: string[] = [];
                  try {
                    myPostIds = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');
                  } catch (e) {}
                  const currentUid = activeUser?.uid || getCurrentUser()?.uid;
                  const isMyOwnPost = Boolean(
                    (currentUid && intent.authorId === currentUid) ||
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
                      {/* Top Meta Row */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isMyOwnPost && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                              ⚡ {t('post.yourPost')}
                            </span>
                          )}
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>{intent.authorName || 'Community Member'}</span>
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700">
                            📍 {(intent as any).resolvedLocationBadge || intent.location || 'Local Area'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {(intent as any).computedKm || intent.distance || 0.5} km
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{t('home.expiresIn')} {(intent as any).minsRemaining || 55}m</span>
                          </span>
                          {isMyOwnPost && (
                            <button
                              type="button"
                              onClick={(e) => handleDeletePost(intent.id, e)}
                              className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/70 transition-colors cursor-pointer"
                              title={t('home.deletePost')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Broadcast Requirement Text */}
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug break-words mb-2.5">
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

                      {/* Tags + Bottom Actions Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap items-center gap-1">
                          {(intent.tags || ['#General']).map((tag, idx) => (
                            <span
                              key={`${intent.id}_tag_${idx}`}
                              className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                          {intent.hasLocationPin && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              📍 {t('post.pinDropped')}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Own Post vs Other User's Post */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          {/* WhatsApp Group Share Button */}
                          <button
                            type="button"
                            onClick={(e) => handleSharePostToWhatsAppGroup(intent, e)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            title="Share Post on WhatsApp"
                          >
                            <Share2 className="w-3 h-3 shrink-0" />
                            <span>WhatsApp</span>
                          </button>

                          {isMyOwnPost ? (
                            /* Owner Controls: View Responses Inbox & Delete (No self-chat button!) */
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIntentForResponses(intent);
                                  setIsResponsesModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                              >
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {language === 'EN'
                                    ? 'View Responses'
                                    : language === 'GU'
                                    ? 'રિસ્પોન્સ જુઓ'
                                    : 'रिस्पॉन्स देखें'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeletePost(intent.id, e)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                              >
                                <Trash2 className="w-3 h-3 shrink-0" />
                                <span>{t('home.deletePost')}</span>
                              </button>
                            </>
                          ) : (
                            /* Visitor Controls: View Author Profile & Direct Chat */
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedUserForProfile({
                                    name: intent.authorName || 'Community Member',
                                    distance: (intent as any).computedKm || intent.distance || 0.5
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                              >
                                <User className="w-3 h-3 shrink-0" />
                                <span>{t('home.viewProfile')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSafeOpenChat(intent)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                              >
                                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{t('home.directChat')}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
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
                  hi: 'नौकरी प्रोफाइल बनाने के लिए लॉगिन करें'
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
                  hi: 'वेकेंसी पोस्ट करने के लिए लॉगिन करें'
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
          
          {/* New Feedback Banner at the bottom of the feed */}
          <FeedbackBanner />

          {/* Public Suggestions Banner Box at the Very Bottom of Main Page */}
          <PublicSuggestionsBanner
            language={language}
            activeUser={activeUser}
            onRequireLogin={() => {
              setLoginPromptTitle({
                en: 'Sign In Required to Share Suggestion',
                hi: 'सुझाव साझा करने के लिए लॉगिन करें'
              });
              setLoginPromptDesc({
                en: 'Please sign in with your verified account to post a public suggestion on LocoHelp.',
                hi: 'लोकोहेल्प की सार्वजनिक सुझाव पेटी में अपना विचार लिखने के लिए कृपया लॉगिन करें।'
              });
              setIsLoginPromptOpen(true);
            }}
            showToast={(msg) => {
              setCreatedToast(msg);
              setTimeout(() => setCreatedToast(null), 3200);
            }}
          />
        </div>

        {/* Footer at the bottom of the scrollable page */}
        <footer className="bg-slate-900 border-t border-slate-800/80 py-4 px-3 sm:px-4 mt-6 text-center text-xs sm:text-sm text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2.5 text-center">
            <span className="font-semibold text-xs sm:text-sm text-slate-200 text-center">
              LocoHelp © 2026
            </span>
            <div className="flex items-center justify-center gap-3 text-[11px] font-bold">
              <button
                onClick={() => onNavigate('guidelines')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t('footer.guidelines')}</span>
              </button>
              <button
                onClick={() => onNavigate('support')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{t('footer.support')}</span>
              </button>
            </div>
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

      {/* Guest Mode Google Sign-In Prompt Modal */}
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
        actionDescEn={loginPromptDesc.en}
        actionDescHi={loginPromptDesc.hi}
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

    </div>
  );
}
