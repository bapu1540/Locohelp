import React, { useState, useEffect } from 'react';
import {
  Search,
  Wrench,
  Zap,
  Fan,
  Car,
  Hammer,
  Trophy,
  Gamepad2,
  Coffee,
  Home,
  Navigation,
  Film,
  Heart,
  GraduationCap,
  Sparkles,
  Package,
  MapPin,
  Star,
  Phone,
  MessageCircle,
  Plus,
  ShieldCheck,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Users,
  Paintbrush,
  HardHat,
  Truck,
  HeartHandshake,
  BookOpen,
  PlusCircle,
  Flag,
  ChevronDown,
  ChevronRight,
  Scissors,
  Palette,
  Flame,
  Camera,
  Utensils,
  Globe,
  Smartphone,
  Monitor,
  Wifi,
  Megaphone,
  ShoppingBag,
  Store,
  Calculator,
  FileSpreadsheet,
  Shield,
  Headphones,
  Building2,
  FileCheck,
  Landmark,
  Scale,
  Languages,
  Music,
  Activity,
  Dumbbell,
  Footprints,
  PawPrint,
  Bug,
  Briefcase,
  Code,
  Edit3,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CATEGORIES,
  MASTER_CATEGORIES,
  CategoryItem,
  MasterCategory,
  getCategoryName,
  getMasterCategoryName,
  getSubCategoriesByMainId,
  getFreeHelperProfiles,
  FreeHelperProfile,
  normalizeCategorySlug,
  matchesCategorySearch,
} from '../data/categories';
import { useLanguage } from '../i18n';
import FreeHelperRegisterModal from '../components/FreeHelperRegisterModal';
import LoginPromptModal from '../components/LoginPromptModal';
import ReportModal from './ReportModal';
import { isGuestUser } from '../lib/authUtils';
import { getCurrentUser } from '../auth';
import { isEntityOwner } from '../lib/ownership';
import {
  getCachedCategoryImages,
  fetchCategoryImages,
  fetchUserApprovalStatus,
  fetchHelperReviews,
  submitHelperReview,
  HelperReviewItem,
} from '../api';
import {
  getSavedUserLocation,
  UserManualLocation as UserLocationData,
} from '../data/panIndiaLocations';

interface CategoriesScreenProps {
  onBack?: () => void;
  selectedCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
  onOpenChat?: (intent?: any) => void;
}

export function getCategoryIcon(iconName: string, className = 'w-5 h-5') {
  switch (iconName) {
    case 'Home':
      return <Home className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Fan':
      return <Fan className={className} />;
    case 'Hammer':
      return <Hammer className={className} />;
    case 'Paintbrush':
      return <Paintbrush className={className} />;
    case 'HardHat':
      return <HardHat className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Bug':
      return <Bug className={className} />;
    case 'Scissors':
      return <Scissors className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Camera':
      return <Camera className={className} />;
    case 'Utensils':
      return <Utensils className={className} />;
    case 'Code':
      return <Code className={className} />;
    case 'Globe':
      return <Globe className={className} />;
    case 'Smartphone':
      return <Smartphone className={className} />;
    case 'Monitor':
      return <Monitor className={className} />;
    case 'Wifi':
      return <Wifi className={className} />;
    case 'Megaphone':
      return <Megaphone className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Store':
      return <Store className={className} />;
    case 'Calculator':
      return <Calculator className={className} />;
    case 'FileSpreadsheet':
      return <FileSpreadsheet className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Headphones':
      return <Headphones className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'Car':
      return <Car className={className} />;
    case 'FileCheck':
      return <FileCheck className={className} />;
    case 'Landmark':
      return <Landmark className={className} />;
    case 'Scale':
      return <Scale className={className} />;
    case 'Truck':
      return <Truck className={className} />;
    case 'Package':
      return <Package className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Languages':
      return <Languages className={className} />;
    case 'Music':
      return <Music className={className} />;
    case 'Trophy':
      return <Trophy className={className} />;
    case 'Activity':
      return <Activity className={className} />;
    case 'Dumbbell':
      return <Dumbbell className={className} />;
    case 'Footprints':
      return <Footprints className={className} />;
    case 'Coffee':
      return <Coffee className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Gamepad2':
      return <Gamepad2 className={className} />;
    case 'HeartHandshake':
      return <HeartHandshake className={className} />;
    case 'PawPrint':
      return <PawPrint className={className} />;
    case 'PlusCircle':
      return <PlusCircle className={className} />;
    case 'Heart':
      return <Heart className={className} />;
    case 'Navigation':
      return <Navigation className={className} />;
    case 'Film':
      return <Film className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

interface CategoryColorPalette {
  mainBg: string;
  mainBorder: string;
  iconBg: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  subBg: string;
  subBorder: string;
  subIconBg: string;
  subIconColor: string;
}

function getMainCategoryPalette(id: string): CategoryColorPalette {
  switch (id) {
    case 'electrician_main':
    case 'cleaning_main':
    case 'home_repair':
      return {
        mainBg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
        mainBorder: '#6EE7B7',
        iconBg: '#059669',
        textColor: '#064E3B',
        badgeBg: '#FFFFFF',
        badgeText: '#047857',
        badgeBorder: '#6EE7B7',
        subBg: '#F0FDF4',
        subBorder: '#A7F3D0',
        subIconBg: '#D1FAE5',
        subIconColor: '#059669',
      };
    case 'painter_main':
    case 'personal_events':
      return {
        mainBg: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
        mainBorder: '#F9A8D4',
        iconBg: '#DB2777',
        textColor: '#831843',
        badgeBg: '#FFFFFF',
        badgeText: '#BE185D',
        badgeBorder: '#F9A8D4',
        subBg: '#FDF2F8',
        subBorder: '#FBCFE8',
        subIconBg: '#FCE7F3',
        subIconColor: '#DB2777',
      };
    case 'it_tech':
      return {
        mainBg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
        mainBorder: '#A5B4FC',
        iconBg: '#4F46E5',
        textColor: '#312E81',
        badgeBg: '#FFFFFF',
        badgeText: '#4338CA',
        badgeBorder: '#A5B4FC',
        subBg: '#EEF2FF',
        subBorder: '#C7D2FE',
        subIconBg: '#E0E7FF',
        subIconColor: '#4F46E5',
      };
    case 'plumber_main':
    case 'cctv_mobile':
    case 'business_staff':
      return {
        mainBg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        mainBorder: '#93C5FD',
        iconBg: '#2563EB',
        textColor: '#1E3A8A',
        badgeBg: '#FFFFFF',
        badgeText: '#1D4ED8',
        badgeBorder: '#93C5FD',
        subBg: '#EFF6FF',
        subBorder: '#BFDBFE',
        subIconBg: '#DBEAFE',
        subIconColor: '#2563EB',
      };
    case 'pest_control_main':
    case 'hospital_medical':
      return {
        mainBg: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
        mainBorder: '#FCA5A5',
        iconBg: '#DC2626',
        textColor: '#7F1D1D',
        badgeBg: '#FFFFFF',
        badgeText: '#B91C1C',
        badgeBorder: '#FCA5A5',
        subBg: '#FEF2F2',
        subBorder: '#FECACA',
        subIconBg: '#FEE2E2',
        subIconColor: '#DC2626',
      };
    case 'ac_repair_main':
    case 'brokers_agents':
      return {
        mainBg: 'linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)',
        mainBorder: '#67E8F9',
        iconBg: '#0891B2',
        textColor: '#164E63',
        badgeBg: '#FFFFFF',
        badgeText: '#0E7490',
        badgeBorder: '#67E8F9',
        subBg: '#ECFEFF',
        subBorder: '#A5F3FC',
        subIconBg: '#CFFAFE',
        subIconColor: '#0891B2',
      };
    case 'maid_cook_main':
    case 'carpenter_main':
    case 'mason_main':
    case 'vehicle_transport':
      return {
        mainBg: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
        mainBorder: '#FDBA74',
        iconBg: '#EA580C',
        textColor: '#7C2D12',
        badgeBg: '#FFFFFF',
        badgeText: '#C2410C',
        badgeBorder: '#FDBA74',
        subBg: '#FFF7ED',
        subBorder: '#FED7AA',
        subIconBg: '#FFEDD5',
        subIconColor: '#EA580C',
      };
    case 'tempo_transport':
      return {
        mainBg: 'linear-gradient(135deg, #FEFCE8 0%, #FEF08A 100%)',
        mainBorder: '#FDE047',
        iconBg: '#B45309',
        textColor: '#713F12',
        badgeBg: '#FFFFFF',
        badgeText: '#A16207',
        badgeBorder: '#FDE047',
        subBg: '#FEFCE8',
        subBorder: '#FEF08A',
        subIconBg: '#FEF9C3',
        subIconColor: '#B45309',
      };
    case 'education_classes':
      return {
        mainBg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
        mainBorder: '#C4B5FD',
        iconBg: '#7C3AED',
        textColor: '#4C1D95',
        badgeBg: '#FFFFFF',
        badgeText: '#6D28D9',
        badgeBorder: '#C4B5FD',
        subBg: '#F5F3FF',
        subBorder: '#DDD6FE',
        subIconBg: '#EDE9FE',
        subIconColor: '#7C3AED',
      };
    case 'sports_fitness':
      return {
        mainBg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
        mainBorder: '#FCD34D',
        iconBg: '#D97706',
        textColor: '#78350F',
        badgeBg: '#FFFFFF',
        badgeText: '#B45309',
        badgeBorder: '#FCD34D',
        subBg: '#FFFBEB',
        subBorder: '#FDE68A',
        subIconBg: '#FEF3C7',
        subIconColor: '#D97706',
      };
    case 'social_care':
      return {
        mainBg: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
        mainBorder: '#FDA4AF',
        iconBg: '#E11D48',
        textColor: '#881337',
        badgeBg: '#FFFFFF',
        badgeText: '#BE123C',
        badgeBorder: '#FDA4AF',
        subBg: '#FFF1F2',
        subBorder: '#FECDD3',
        subIconBg: '#FFE4E6',
        subIconColor: '#E11D48',
      };
    case 'food_grocery':
      return {
        mainBg: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
        mainBorder: '#86EFAC',
        iconBg: '#16A34A',
        textColor: '#14532D',
        badgeBg: '#FFFFFF',
        badgeText: '#15803D',
        badgeBorder: '#86EFAC',
        subBg: '#F0FDF4',
        subBorder: '#BBF7D0',
        subIconBg: '#DCFCE7',
        subIconColor: '#16A34A',
      };
    case 'delivery_courier':
      return {
        mainBg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
        mainBorder: '#7DD3FC',
        iconBg: '#0284C7',
        textColor: '#0C4A6E',
        badgeBg: '#FFFFFF',
        badgeText: '#0369A1',
        badgeBorder: '#7DD3FC',
        subBg: '#F0F9FF',
        subBorder: '#BAE6FD',
        subIconBg: '#E0F2FE',
        subIconColor: '#0284C7',
      };
    case 'vehicle_help':
      return {
        mainBg: 'linear-gradient(135deg, #FFF7ED 0%, #FED7AA 100%)',
        mainBorder: '#FB923C',
        iconBg: '#C2410C',
        textColor: '#7C2D12',
        badgeBg: '#FFFFFF',
        badgeText: '#C2410C',
        badgeBorder: '#FB923C',
        subBg: '#FFF7ED',
        subBorder: '#FED7AA',
        subIconBg: '#FFEDD5',
        subIconColor: '#C2410C',
      };
    case 'daily_help':
      return {
        mainBg: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
        mainBorder: '#D8B4FE',
        iconBg: '#9333EA',
        textColor: '#581C87',
        badgeBg: '#FFFFFF',
        badgeText: '#7E22CE',
        badgeBorder: '#D8B4FE',
        subBg: '#FAF5FF',
        subBorder: '#E9D5FF',
        subIconBg: '#F3E8FF',
        subIconColor: '#9333EA',
      };
    case 'other_custom':
    default:
      return {
        mainBg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
        mainBorder: '#5EEAD4',
        iconBg: '#0D9488',
        textColor: '#134E4A',
        badgeBg: '#FFFFFF',
        badgeText: '#0F766E',
        badgeBorder: '#5EEAD4',
        subBg: '#F0FDFA',
        subBorder: '#99F6E4',
        subIconBg: '#CCFBF1',
        subIconColor: '#0D9488',
      };
  }
}

export default function CategoriesScreen({
  onBack,
  selectedCategory = 'all',
  onSelectCategory,
  onOpenChat,
}: CategoriesScreenProps) {
  const { language, t, tr } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(
    selectedCategory && selectedCategory !== 'all' ? selectedCategory : 'all'
  );
  // Track which Main Categories (1..9) are expanded in the Accordion view
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [helpers, setHelpers] = useState<FreeHelperProfile[]>(() =>
    getFreeHelperProfiles(false)
  );
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>(
    () => getCachedCategoryImages()
  );
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    reportedUserId?: string;
    reportedUserName?: string;
  } | null>(null);

  const loadVerifiedHelpers = async () => {
    try {
      let deletedIds: string[] = [];
      try {
        const delRaw = localStorage.getItem('locohelp_deleted_helpers');
        if (delRaw) deletedIds = JSON.parse(delRaw);
      } catch {}

      const res = await fetch(`/api/helpers?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const serverList = Array.isArray(data) ? data : [];
        const normalizedAll = serverList
          .filter(
            (h: any) =>
              h &&
              h.id &&
              !/^h\d+/.test(String(h.id)) &&
              !deletedIds.includes(String(h.id)) &&
              !h.is_flagged &&
              !h.hidden &&
              !h.is_deleted
          )
          .map((h: any) => {
            const norm = normalizeCategorySlug(
              h.categoryId || h.category,
              h.skills,
              h.customCategoryName
            );
            return {
              ...h,
              categoryId: norm.categoryId,
              customCategoryName:
                h.customCategoryName || norm.customCategoryName,
              isVerified: h.isVerified === true || h.status === 'approved',
              status: h.status || (h.isVerified ? 'approved' : 'pending'),
            };
          });
        const verifiedOnly = normalizedAll.filter(
          (h: any) => h.isVerified === true || h.status === 'approved'
        );
        setHelpers(verifiedOnly);
        try {
          localStorage.setItem(
            'locohelp_free_helper_profiles',
            JSON.stringify(verifiedOnly)
          );
        } catch {}
        return;
      }
      setHelpers([]);
    } catch {
      setHelpers([]);
    }
  };

  useEffect(() => {
    loadVerifiedHelpers();
    fetchCategoryImages()
      .then((imgs) => {
        if (imgs) setCategoryImages(imgs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const isMain = MASTER_CATEGORIES.some((m) => m.id === selectedCategory);
      if (isMain) {
        const subs = getSubCategoriesByMainId(selectedCategory as any);
        if (subs.length === 1) {
          setActiveCategory(subs[0].id);
        } else {
          setActiveCategory('all');
          setExpandedGroups((prev) => ({ ...prev, [selectedCategory]: true }));
        }
      } else {
        setActiveCategory(selectedCategory);
        const found = CATEGORIES.find((c) => c.id === selectedCategory);
        if (found) {
          setExpandedGroups((prev) => ({
            ...prev,
            [found.masterCategory]: true,
          }));
        }
      }
    }
  }, [selectedCategory]);

  const handleSelectCategory = (id: string) => {
    setActiveCategory(id);
    if (onSelectCategory) {
      onSelectCategory(id);
    }
  };

  const handleBackNavigation = () => {
    try {
      sessionStorage.removeItem('locohelp_return_popup_cat');
    } catch {}
    if (onSelectCategory) {
      onSelectCategory('all');
    }
    if (onBack) {
      onBack();
    }
  };

  const toggleMainGroup = (mainCat: MasterCategory) => {
    const subs = getSubCategoriesByMainId(mainCat.id);
    // Single-service main categories (1 to 9) open directly
    if (subs.length === 1) {
      handleSelectCategory(subs[0].id);
      return;
    }
    setExpandedGroups((prev) => ({
      ...prev,
      [mainCat.id]: !prev[mainCat.id],
    }));
  };

  // Match helpers to a specific sub-category ID
  const isHelperMatchingCategory = (
    h: FreeHelperProfile,
    cat: CategoryItem
  ): boolean => {
    const norm = normalizeCategorySlug(
      h.categoryId || (h as any).category,
      h.skills,
      h.customCategoryName
    );
    if (norm.categoryId === cat.id) return true;
    const catNameEn = cat.nameEn.toLowerCase();
    const catTag = cat.tag.replace('#', '').toLowerCase();
    if (
      Array.isArray(h.skills) &&
      h.skills.some((s) => {
        const sl = String(s || '').toLowerCase();
        return (
          sl.includes(cat.id.toLowerCase()) ||
          sl.includes(catTag) ||
          sl === catNameEn
        );
      })
    ) {
      return true;
    }
    return false;
  };

  const selectedCategoryObj = CATEGORIES.find((c) => c.id === activeCategory);

  // Dynamically update document.title for Google SEO & browser tab clarity when viewing a specific category
  useEffect(() => {
    const defaultTitle = 'LocoHelp – Local Services, Shops & Urgent Help';
    if (activeCategory !== 'all' && selectedCategoryObj) {
      document.title = `${selectedCategoryObj.nameEn} Near You – LocoHelp Local Services`;
    } else {
      document.title = defaultTitle;
    }
    return () => {
      document.title = defaultTitle;
    };
  }, [activeCategory, selectedCategoryObj]);

  // Filter sub-categories when user types in search bar (supports English, Hindi, Gujarati & Hinglish synonyms)
  const matchingSubCategoriesForSearch = searchQuery.trim()
    ? CATEGORIES.filter((cat) => matchesCategorySearch(cat, searchQuery))
    : [];

  const [userLocation, setUserLocation] = useState<UserLocationData | null>(() =>
    getSavedUserLocation()
  );
  const [filterByMyCity, setFilterByMyCity] = useState<boolean>(false);
  const [reviewModalHelper, setReviewModalHelper] = useState<FreeHelperProfile | null>(null);
  const [helperReviewsList, setHelperReviewsList] = useState<HelperReviewItem[]>([]);
  const [reviewStarVal, setReviewStarVal] = useState<number>(5);
  const [reviewTextVal, setReviewTextVal] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    const syncLoc = () => setUserLocation(getSavedUserLocation());
    window.addEventListener('locohelp_location_changed', syncLoc);
    window.addEventListener('storage', syncLoc);
    return () => {
      window.removeEventListener('locohelp_location_changed', syncLoc);
      window.removeEventListener('storage', syncLoc);
    };
  }, []);

  useEffect(() => {
    if (!reviewModalHelper) {
      setHelperReviewsList([]);
      setReviewStarVal(5);
      setReviewTextVal('');
      return;
    }
    let active = true;
    fetchHelperReviews(reviewModalHelper.id).then((list) => {
      if (active) setHelperReviewsList(list);
    });
    return () => {
      active = false;
    };
  }, [reviewModalHelper?.id]);

  // Handle hardware Back button inside CategoriesScreen modals & sub-categories
  useEffect(() => {
    const handleCloseActiveModal = (e: Event) => {
      if (reviewModalHelper) {
        e.preventDefault();
        setReviewModalHelper(null);
        return;
      }
      if (reportTarget) {
        e.preventDefault();
        setReportTarget(null);
        return;
      }
      if (isRegisterModalOpen) {
        e.preventDefault();
        setIsRegisterModalOpen(false);
        return;
      }
      if (isLoginPromptOpen) {
        e.preventDefault();
        setIsLoginPromptOpen(false);
        return;
      }
    };
    window.addEventListener('locohelp_close_active_modal', handleCloseActiveModal);
    return () => window.removeEventListener('locohelp_close_active_modal', handleCloseActiveModal);
  }, [reviewModalHelper, reportTarget, isRegisterModalOpen, isLoginPromptOpen]);

  const selectedCityName = (userLocation?.district || userLocation?.area || '').trim();

  // Filter helpers for selected category + optional user city filter
  const filteredHelpers = helpers.filter((h) => {
    const matchesCat =
      activeCategory === 'all' ||
      (selectedCategoryObj
        ? isHelperMatchingCategory(h, selectedCategoryObj)
        : h.categoryId === activeCategory);
    const q = searchQuery.toLowerCase().trim();
    const helperCatObj = CATEGORIES.find((c) => c.id === h.categoryId);
    const matchesSearch =
      !q ||
      (h.name || '').toLowerCase().includes(q) ||
      (h.area || '').toLowerCase().includes(q) ||
      (h.customCategoryName || '').toLowerCase().includes(q) ||
      (helperCatObj ? matchesCategorySearch(helperCatObj, q) : false) ||
      (Array.isArray(h.skills) &&
        h.skills.some((s) => String(s || '').toLowerCase().includes(q)));

    let matchesCity = true;
    if (filterByMyCity && selectedCityName && !q) {
      const hArea = String(h.area || (h as any).city || '').toLowerCase();
      const normDist = (userLocation?.district || '').trim().toLowerCase();
      const normArea = (userLocation?.area || '').trim().toLowerCase();
      matchesCity = Boolean(
        (normDist && hArea.includes(normDist)) ||
          (normArea && hArea.includes(normArea))
      );
    }

    return matchesCat && matchesSearch && matchesCity;
  });

  const [pendingApprovalNotice, setPendingApprovalNotice] = useState<string | null>(null);

  const verifyCategoryUserApproval = async (onApproved: () => void) => {
    const u = getCurrentUser();
    const res = await fetchUserApprovalStatus(
      u?.uid || '',
      u?.email || localStorage.getItem('locohelp_last_logged_in_email') || '',
      u?.phone || localStorage.getItem('locohelp_last_logged_in_phone') || ''
    );
    if (!res.isApproved) {
      setPendingApprovalNotice(
        tr(
          'Your account is pending Admin approval. After approval, you will be able to create posts and send chat messages.',
          'आपका अकाउंट एडमिन अप्रूवल के लिए पेंडिंग है। अप्रूवल के बाद आप पोस्ट और चैट कर सकेंगे।',
          'તમારું એકાઉન્ટ એડમિન અપ્રૂવલ માટે પેન્ડિંગ છે. અપ્રૂવલ બાદ તમે પોસ્ટ અને ચેટ કરી શકશો.'
        )
      );
      setTimeout(() => setPendingApprovalNotice(null), 6500);
      return;
    }
    onApproved();
  };

  const handleChatWithHelper = (helper: FreeHelperProfile) => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }
    verifyCategoryUserApproval(() => {
      if (onOpenChat) {
        const currentUser = getCurrentUser();
        const myUid = currentUser?.uid || '';
        const targetProviderId = helper.userId || helper.id;
        const targetProviderEmail =
          (helper as any).email ||
          (helper.phone ? `${String(helper.phone).replace(/\D/g, '').slice(-10)}@phone.locohelp.com` : '');
        onOpenChat({
          id: `provider_chat_${helper.id}`,
          authorId: targetProviderId,
          authorEmail: targetProviderEmail,
          authorPhone: helper.phone || '',
          phone: helper.phone || '',
          authorName: helper.name,
          providerHelperId: helper.id,
          receiverId: targetProviderId,
          helperId: myUid,
          isDirectProviderChat: true,
          isViewerPostOwner: false,
          description: `${helper.name} (${
            helper.customCategoryName ||
            CATEGORIES.find((c) => c.id === helper.categoryId)?.nameEn ||
            'Service Expert'
          })`,
          tags: helper.skills || [],
          distance: helper.distance || 0.8,
          status: 'active',
          createdAt: new Date().toISOString(),
        } as any);
      }
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#F8FAFC] dark:bg-slate-900 overflow-y-auto pb-10">
      {/* Top Sticky Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={handleBackNavigation}
              className="p-2 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
              title={t('common.back') || 'Back'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
            {activeCategory !== 'all' && selectedCategoryObj
              ? getCategoryName(selectedCategoryObj, language)
              : tr('Browse All Categories', 'सभी श्रेणियां', 'તમામ કેટેગરી')}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isGuestUser()) {
              setIsLoginPromptOpen(true);
              return;
            }
            verifyCategoryUserApproval(() => setIsRegisterModalOpen(true));
          }}
          style={{
            background: 'linear-gradient(135deg, #FF6600 0%, #E03E00 100%)',
          }}
          className="shrink-0 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer hover:brightness-105"
        >
          <Plus className="w-4 h-4" />
          <span>
            {tr(
              'Register Profile',
              'फ्री प्रोफाइल बनाएं',
              'ફ્રી પ્રોફાઇલ બનાવો'
            )}
          </span>
        </button>
      </div>

      {pendingApprovalNotice && (
        <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs sm:text-sm font-black shadow-md flex items-center justify-between gap-3">
          <span>⏳ {pendingApprovalNotice}</span>
          <button
            type="button"
            onClick={() => setPendingApprovalNotice(null)}
            className="px-2 py-1 rounded-lg bg-amber-200/70 text-amber-950 text-xs font-black"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-4 max-w-5xl w-full mx-auto space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr(
              'Search any category or skill (e.g. Plumber, Web Developer, Tailor, Broker)...',
              'श्रेणी या सर्विस खोजें (जैसे: प्लंबर, वेब डेवलपर, दर्जी, ब्रोकर)...',
              'કેટેગરી અથવા સર્વિસ શોધો (દા.ત. પ્લમ્બર, વેબ ડેવલપર, દરજી, બ્રોકર)...'
            )}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Selected Sub-Category Header Bar */}
        {activeCategory !== 'all' && selectedCategoryObj && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-3.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackNavigation}
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shrink-0"
                title={tr('Back', 'वापस जाएं', 'પાછા જાઓ')}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                {getCategoryIcon(selectedCategoryObj.iconName, 'w-5 h-5')}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {getCategoryName(selectedCategoryObj, language)}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBackNavigation}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                {tr('← Back', '← वापस जाएं', '← પાછા જાઓ')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isGuestUser()) {
                    setIsLoginPromptOpen(true);
                    return;
                  }
                  setIsRegisterModalOpen(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #FF6600 0%, #E03E00 100%)',
                }}
                className="px-3 py-2 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {tr(
                  '+ Join as Expert',
                  '+ अपनी प्रोफाइल जोड़ें',
                  '+ તમારી પ્રોફાઇલ ઉમેરો'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* COLORFUL, SIMPLE, CLEAN ACCORDION + SUB-CATEGORY BANNERS              */}
        {/* ===================================================================== */}
        {activeCategory === 'all' && (
          <div>
            {/* Instant Sub-Category Search Results when user types in Search Bar */}
            {searchQuery.trim() !== '' ? (
              <div className="space-y-2 mb-4">
                {matchingSubCategoriesForSearch.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      {tr(
                        'No exact category match. You can browse or register under Other / Custom Category!',
                        'कोई सीधी श्रेणी नहीं मिली। आप "अन्य / कस्टम श्रेणी" चुन सकते हैं!',
                        'કોઈ સીધી કેટેગરી મળી નથી. તમે "અન્ય / કસ્ટમ કેટેગરી" પસંદ કરી શકો છો!'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectCategory('other')}
                      style={{
                        background:
                          'linear-gradient(135deg, #FF6600 0%, #E03E00 100%)',
                      }}
                      className="px-3.5 py-2 rounded-lg text-white text-xs font-bold cursor-pointer"
                    >
                      {tr(
                        'Open Other / Custom Category',
                        'अन्य / कस्टम श्रेणी खोलें',
                        'અન્ય / કસ્ટમ કેટેગરી ખોલો'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchingSubCategoriesForSearch.map((subCat) => {
                      const palette = getMainCategoryPalette(
                        subCat.masterCategory
                      );
                      const customThumb = categoryImages[subCat.id];
                      return (
                        <button
                          key={subCat.id}
                          type="button"
                          onClick={() => handleSelectCategory(subCat.id)}
                          style={{
                            backgroundColor: palette.subBg,
                            borderColor: palette.subBorder,
                          }}
                          className="p-3 rounded-xl border flex items-center justify-between gap-2.5 text-left transition-all cursor-pointer hover:brightness-95"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {customThumb ? (
                              <img
                                src={customThumb}
                                alt={subCat.nameEn}
                                loading="lazy"
                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div
                                style={{
                                  backgroundColor: palette.subIconBg,
                                  color: palette.subIconColor,
                                }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              >
                                {getCategoryIcon(subCat.iconName, 'w-4 h-4')}
                              </div>
                            )}
                            <span
                              style={{ color: palette.textColor }}
                              className="text-xs sm:text-sm font-extrabold leading-snug break-words"
                            >
                              {getCategoryName(subCat, language)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <ChevronRight
                              style={{ color: palette.textColor }}
                              className="w-4 h-4"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Main Category Colorful & Simple Horizontal Accordion Banners */
              <div className="space-y-2.5">
                {MASTER_CATEGORIES.map((mainCat) => {
                  const subCategories = getSubCategoriesByMainId(mainCat.id);
                  const isDirectSingle = subCategories.length === 1;
                  const isExpanded = Boolean(expandedGroups[mainCat.id]);
                  const palette = getMainCategoryPalette(mainCat.id);

                  return (
                    <div key={mainCat.id} className="space-y-1.5">
                      {/* Main Category Horizontal Banner: Single Icon + Only Category Name */}
                      <button
                        type="button"
                        onClick={() => toggleMainGroup(mainCat)}
                        style={{
                          background: palette.mainBg,
                          borderColor: palette.mainBorder,
                        }}
                        className="w-full p-3.5 rounded-xl border-2 transition-all shadow-xs hover:brightness-98 flex items-center justify-between gap-3 text-left cursor-pointer"
                      >
                        {/* Left: Single Clean Icon + Only Category Name */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            style={{
                              backgroundColor: palette.iconBg,
                              color: '#FFFFFF',
                            }}
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                          >
                            {getCategoryIcon(mainCat.iconName, 'w-5 h-5')}
                          </div>
                          <span
                            style={{ color: palette.textColor }}
                            className="text-sm sm:text-base font-extrabold leading-snug break-words"
                          >
                            {getMasterCategoryName(mainCat, language)}
                          </span>
                        </div>

                        {/* Right: Expand/Collapse arrow */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div
                            style={{
                              backgroundColor: palette.badgeBg,
                              color: palette.textColor,
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-2xs"
                          >
                            {isDirectSingle ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expandable Sub-Categories Simple Horizontal Banners */}
                      <AnimatePresence initial={false}>
                        {isExpanded && !isDirectSingle && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden pl-2 sm:pl-4 pr-0.5"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 pb-1.5">
                              {subCategories.map((subCat) => {
                                const customThumb = categoryImages[subCat.id];

                                return (
                                  <button
                                    key={subCat.id}
                                    type="button"
                                    onClick={() =>
                                      handleSelectCategory(subCat.id)
                                    }
                                    style={{
                                      backgroundColor: palette.subBg,
                                      borderColor: palette.subBorder,
                                    }}
                                    className="p-2.5 rounded-xl border flex items-center justify-between gap-2.5 text-left transition-all cursor-pointer hover:brightness-95"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {customThumb ? (
                                        <img
                                          src={customThumb}
                                          alt={subCat.nameEn}
                                          loading="lazy"
                                          className="w-8 h-8 rounded-lg object-cover shrink-0"
                                        />
                                      ) : (
                                        <div
                                          style={{
                                            backgroundColor: palette.subIconBg,
                                            color: palette.subIconColor,
                                          }}
                                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                        >
                                          {getCategoryIcon(
                                            subCat.iconName,
                                            'w-4 h-4'
                                          )}
                                        </div>
                                      )}
                                      <span
                                        style={{ color: palette.textColor }}
                                        className="text-xs sm:text-[13px] font-bold leading-snug break-words"
                                      >
                                        {getCategoryName(subCat, language)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <ChevronRight
                                        style={{ color: palette.textColor }}
                                        className="w-4 h-4"
                                      />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* REGISTERED SERVICE PROVIDERS / HELPERS DIRECTORY LIST                 */}
        {/* ===================================================================== */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {activeCategory === 'all'
                  ? tr(
                      'Registered Local Service Experts',
                      'रजिस्टर्ड लोकल सर्विस एक्सपर्ट्स',
                      'રજિસ્ટર્ડ લોકલ સર્વિસ એક્સપર્ટ્સ'
                    )
                  : `${getCategoryName(selectedCategoryObj, language)} — ${tr(
                      'Available Experts',
                      'उपलब्ध एक्सपर्ट्स',
                      'ઉપલબ્ધ એક્સપર્ટ્સ'
                    )}`}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {selectedCityName && (
                <button
                  type="button"
                  onClick={() => setFilterByMyCity((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                    filterByMyCity
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  📍 {filterByMyCity ? selectedCityName : tr('All Cities', 'सभी शहर', 'બધા શહેરો')}
                </button>
              )}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {filteredHelpers.length}{' '}
                {tr('Profiles', 'प्रोफाइल', 'પ્રોફાઇલ')}
              </span>
            </div>
          </div>

          {filteredHelpers.length === 0 ? (
            <div className="bg-gradient-to-br from-orange-50/90 via-white to-amber-50/70 dark:from-slate-800/95 dark:via-slate-800 dark:to-slate-800/90 rounded-2xl p-6 text-center border border-orange-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-3 text-xl shadow-2xs">
                🚀
              </div>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mb-2">
                {tr(
                  'Verified Local Service Experts Joining Soon!',
                  'आपके एरिया के वेरिफाइड सर्विस एक्सपर्ट्स जल्द जुड़ रहे हैं!',
                  'તમારા વિસ્તારના વેરિફાઇડ સર્વિસ એક્સપર્ટ્સ ટૂંક સમયમાં જોડાઈ રહ્યા છે!'
                )}
              </p>
              <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 max-w-xl mx-auto mb-4">
                {tr(
                  "Onboarding of verified local experts in this category is currently underway. If you have an urgent requirement right now, click 'Create Post' on the Home page, or if you provide this service yourself, register your free profile below!",
                  "इस कैटेगरी में लोकल कारीगरों और एक्सपर्ट्स को जोड़ने का काम चालू है। अगर आपको अभी तुरंत काम है तो आप होम पेज पर 'पोस्ट बनाएं' पर क्लिक करके अपनी ज़रूरत डाल सकते हैं, या अगर आप खुद यह काम करते हैं तो नीचे बटन दबाकर मुफ्त में अपनी प्रोफाइल जोड़ें!",
                  "આ કેટેગરીમાં લોકલ કારીગરો અને એક્સપર્ટ્સને જોડવાનું કામ ચાલુ છે. જો તમારે અત્યારે તાત્કાલિક કામ હોય તો હોમ પેજ પર 'પોસ્ટ બનાવો' પર ક્લિક કરીને તમારી જરૂરિયાત મૂકી શકો છો, અથવા જો તમે પોતે આ કામ કરો છો તો નીચે બટન દબાવીને મફતમાં તમારી પ્રોફાઇલ જોડો!"
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (isGuestUser()) {
                      setIsLoginPromptOpen(true);
                      return;
                    }
                    setIsRegisterModalOpen(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #FF6600 0%, #E03E00 100%)',
                  }}
                  className="px-4 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-sm cursor-pointer hover:brightness-105 transition-all"
                >
                  {tr(
                    '+ Register as Expert (Free)',
                    '+ फ्री एक्सपर्ट प्रोफाइल बनाएं',
                    '+ ફ્રી એક્સપર્ટ પ્રોફાઇલ બનાવો'
                  )}
                </button>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
                  >
                    {tr(
                      '← Back to Home',
                      '← होम पेज पर जाएं',
                      '← હોમ પેજ પર જાઓ'
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredHelpers.map((helper) => {
                const catObj = CATEGORIES.find(
                  (c) => c.id === helper.categoryId
                );
                const isMine = isEntityOwner(helper, getCurrentUser());
                return (
                  <motion.div
                    key={helper.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm">
                            {helper.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                {helper.name}
                              </h4>
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                {tr('Verified', 'वेरिफाइड', 'વેરિફાઇડ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="font-semibold text-orange-600 dark:text-orange-400">
                                {helper.categoryId === 'other' &&
                                helper.customCategoryName
                                  ? `${
                                      helper.customCategoryName
                                    } (${getCategoryName(catObj, language)})`
                                  : getCategoryName(catObj, language)}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {helper.experience}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setReviewModalHelper(helper)}
                          title={tr('View & Add Customer Reviews', 'रेटिंग और रिव्यू देखें/दें', 'રેટિંગ અને રિવ્યુ જુઓ/આપો')}
                          className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 cursor-pointer border border-amber-300/50"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{Number(helper.rating || 5.0).toFixed(1)}</span>
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            ({(helper as any).reviewCount || 0})
                          </span>
                        </button>
                      </div>

                      {/* Skills chips */}
                      <div className="flex flex-wrap gap-1.5 my-2.5">
                        {helper.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="truncate">{helper.area}</span>
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                          ({helper.distance} km)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `*${helper.name}* (${
                              helper.categoryId === 'other' && helper.customCategoryName
                                ? helper.customCategoryName
                                : getCategoryName(catObj, language) || 'Service Expert'
                            })\n📍 ${helper.area}\nLocoHelp पर वेरिफाइड प्रोफाइल देखें: https://locohelp.com`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors cursor-pointer"
                          title={tr(
                            'Share Profile on WhatsApp',
                            'व्हाट्सएप पर प्रोफाइल शेयर करें',
                            'વોટ્સએપ પર પ્રોફાઇલ શેર કરો'
                          )}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </a>

                        {isMine ? (
                          <button
                            type="button"
                            onClick={() => setIsRegisterModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>
                              {tr('Edit Profile', 'प्रोफाइल एडिट', 'એડિટ કરો')}
                            </span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setReportTarget({
                                  reportedUserId:
                                    helper.userId ||
                                    helper.id ||
                                    'unknown_helper',
                                  reportedUserName: helper.name,
                                })
                              }
                              className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-800/40 transition-colors cursor-pointer"
                              title={tr(
                                'Report / Block',
                                'रिपोर्ट / ब्लॉक करें',
                                'રિપોર્ટ / બ્લોક કરો'
                              )}
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>

                            {(helper as any).isPhonePublic === true && helper.phone && (
                              <a
                                href={`https://wa.me/91${helper.phone.replace(
                                  /\D/g,
                                  ''
                                )}?text=${encodeURIComponent(
                                  `नमस्ते ${helper.name}, मैंने LocoHelp पर आपकी ${
                                    catObj?.nameEn || 'Service'
                                  } प्रोफाइल देखी।`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (isGuestUser()) {
                                    e.preventDefault();
                                    setIsLoginPromptOpen(true);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => handleChatWithHelper(helper)}
                              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                            >
                              <span>
                                {tr('💬 Chat', '💬 चैट करें', '💬 મેસેજ કરો (Chat)')}
                              </span>
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
      </div>

      {/* Free Helper Registration Modal */}
      <FreeHelperRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        defaultCategory={activeCategory !== 'all' ? activeCategory : 'plumber'}
        defaultCategoryId={activeCategory !== 'all' ? activeCategory : 'plumber'}
        onSuccess={() => {
          loadVerifiedHelpers();
        }}
      />

      {/* Guest Login Prompt Modal */}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        onGoToLogin={() => setIsLoginPromptOpen(false)}
        actionTitleEn="Sign In to Connect with Service Experts"
        actionTitleHi="सर्विस एक्सपर्ट से जुड़ने के लिए लॉगिन करें"
        actionTitleGu="સર્વિસ એક્સપર્ટ સાથે જોડાવા માટે લોગિન કરો"
      />

      {/* Report & Block Modal */}
      {reportTarget && (
        <ReportModal
          onClose={() => setReportTarget(null)}
          reportedUserId={reportTarget.reportedUserId}
          reportedUserName={reportTarget.reportedUserName}
        />
      )}

      {/* Customer Rating & Review Modal */}
      {reviewModalHelper && (
        <div
          onClick={() => setReviewModalHelper(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-4 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  ⭐ {reviewModalHelper.name} — {tr('Customer Reviews', 'ग्राहक रिव्यू', 'ગ્રાહક રિવ્યુ')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tr('Rate their work quality (1 to 5 Stars)', 'काम की क्वालिटी को रेटिंग दें (1 से 5 स्टार)', 'કામની ગુણવત્તાને રેટિંગ આપો (1 થી 5 સ્ટાર)')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalHelper(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setReviewStarVal(st)}
                  className="p-1 cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      st <= reviewStarVal
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 ml-1">
                {reviewStarVal} / 5
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={reviewTextVal}
                onChange={(e) => setReviewTextVal(e.target.value)}
                placeholder={tr(
                  'Write your review about this service expert...',
                  'इस सर्विस एक्सपर्ट के काम के बारे में लिखें...',
                  'આ સર્વિસ એક્સપર્ટના કામ વિશે તમારો રિવ્યુ લખો...'
                )}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                disabled={submittingReview}
                onClick={async () => {
                  if (isGuestUser()) {
                    setReviewModalHelper(null);
                    setIsLoginPromptOpen(true);
                    return;
                  }
                  setSubmittingReview(true);
                  const res = await submitHelperReview(reviewModalHelper.id, {
                    rating: reviewStarVal,
                    comment: reviewTextVal.trim() || `${reviewStarVal} Star Service`,
                    helperName: reviewModalHelper.name,
                  });
                  setSubmittingReview(false);
                  if (res.success) {
                    setReviewTextVal('');
                    if (res.reviews) setHelperReviewsList(res.reviews);
                    else if (res.review) setHelperReviewsList((prev) => [res.review!, ...prev]);
                    loadVerifiedHelpers();
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold cursor-pointer shrink-0"
              >
                {submittingReview ? '...' : tr('Submit', 'भेजें', 'મોકલો')}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pt-1">
              {helperReviewsList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">
                  {tr('No customer reviews yet. Be the first to review!', 'अभी कोई रिव्यू नहीं है। सबसे पहले रिव्यू दें!', 'હજુ સુધી કોઈ રિવ્યુ નથી. સૌથી પહેલા રિવ્યુ આપો!')}
                </p>
              ) : (
                helperReviewsList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 dark:text-white">{rev.reviewerName}</span>
                      <span className="text-amber-500">{'★'.repeat(Math.round(rev.rating || 5))}</span>
                    </div>
                    {rev.comment && (
                      <p className="text-slate-600 dark:text-slate-300 mt-1">{rev.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

