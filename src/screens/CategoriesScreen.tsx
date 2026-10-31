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
} from '../api';

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
        if (selectedCategory === 'other_custom') {
          setActiveCategory('other');
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

  const toggleMainGroup = (mainCat: MasterCategory) => {
    // Tapping #10 ("Other / Custom Category") directly opens the 'other' Custom Category view without needing to expand
    if (mainCat.id === 'other_custom') {
      handleSelectCategory('other');
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

  // Filter helpers for selected category
  const filteredHelpers = helpers.filter((h) => {
    const matchesCat =
      activeCategory === 'all' ||
      (selectedCategoryObj
        ? isHelperMatchingCategory(h, selectedCategoryObj)
        : h.categoryId === activeCategory);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (h.name || '').toLowerCase().includes(q) ||
      (h.area || '').toLowerCase().includes(q) ||
      (h.customCategoryName || '').toLowerCase().includes(q) ||
      (Array.isArray(h.skills) &&
        h.skills.some((s) => String(s || '').toLowerCase().includes(q)));
    return matchesCat && matchesSearch;
  });

  // Filter sub-categories when user types in search bar
  const matchingSubCategoriesForSearch = searchQuery.trim()
    ? CATEGORIES.filter((cat) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          cat.nameEn.toLowerCase().includes(q) ||
          cat.nameHi.toLowerCase().includes(q) ||
          (cat.nameGu && cat.nameGu.toLowerCase().includes(q)) ||
          cat.description.toLowerCase().includes(q) ||
          cat.tag.toLowerCase().includes(q)
        );
      })
    : [];

  const handleChatWithHelper = (helper: FreeHelperProfile) => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }
    if (onOpenChat) {
      onOpenChat({
        id: 'intent_' + helper.id,
        authorId: helper.id,
        authorName: helper.name,
        description: `${helper.name} (${
          helper.customCategoryName ||
          CATEGORIES.find((c) => c.id === helper.categoryId)?.nameEn ||
          'Service Expert'
        })`,
        tags: helper.skills || [],
        distance: helper.distance || 0.8,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#F8FAFC] dark:bg-slate-900 overflow-y-auto pb-28">
      {/* Top Sticky Header: Simple "Browse All Categories" */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
              title={t('common.back') || 'Back'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
            {tr('Browse All Categories', 'सभी श्रेणियां', 'તમામ કેટેગરી')}
          </h1>
        </div>

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
                onClick={() => handleSelectCategory('all')}
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shrink-0"
                title="Back to All Categories"
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
                onClick={() => handleSelectCategory('all')}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                {tr('← All Categories', '← सभी श्रेणियां', '← તમામ કેટેગરી')}
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
                      const subCount = helpers.filter((h) =>
                        isHelperMatchingCategory(h, subCat)
                      ).length;
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
                            <span
                              style={{
                                backgroundColor: palette.badgeBg,
                                color: palette.badgeText,
                                borderColor: palette.badgeBorder,
                              }}
                              className="min-w-[26px] text-center px-2 py-0.5 rounded-full text-[11px] font-extrabold border"
                            >
                              {subCount}
                            </span>
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
              /* 10 Main Category Colorful & Simple Horizontal Accordion Banners */
              <div className="space-y-2.5">
                {MASTER_CATEGORIES.map((mainCat) => {
                  const subCategories = getSubCategoriesByMainId(mainCat.id);
                  const isDirectOther = mainCat.id === 'other_custom';
                  const isExpanded = Boolean(expandedGroups[mainCat.id]);
                  const palette = getMainCategoryPalette(mainCat.id);

                  // Total combined count of approved experts in this Main Category group
                  const groupExpertCount = subCategories.reduce((acc, sub) => {
                    const cnt = helpers.filter((h) =>
                      isHelperMatchingCategory(h, sub)
                    ).length;
                    return acc + cnt;
                  }, 0);

                  return (
                    <div key={mainCat.id} className="space-y-1.5">
                      {/* Main Category Horizontal Banner: Single Icon + Only Category Name + Experts Count */}
                      <button
                        type="button"
                        onClick={() => toggleMainGroup(mainCat)}
                        style={{
                          background: palette.mainBg,
                          borderColor: palette.mainBorder,
                        }}
                        className="w-full p-3.5 rounded-xl border-2 transition-all shadow-xs hover:brightness-98 flex items-center justify-between gap-3 text-left cursor-pointer"
                      >
                        {/* Left: Single Clean Icon + Only Category Name (No duplicate emoji, no numbers, no long subtitle) */}
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

                        {/* Right: Total combined numeric count badge + Expand/Collapse arrow */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            style={{
                              backgroundColor: palette.badgeBg,
                              color: palette.badgeText,
                              borderColor: palette.badgeBorder,
                            }}
                            className="min-w-[28px] text-center px-2 py-0.5 rounded-full text-xs font-extrabold border shadow-2xs"
                          >
                            {groupExpertCount}
                          </span>
                          <div
                            style={{
                              backgroundColor: palette.badgeBg,
                              color: palette.textColor,
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-2xs"
                          >
                            {isDirectOther ? (
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
                        {isExpanded && !isDirectOther && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden pl-2 sm:pl-4 pr-0.5"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 pb-1.5">
                              {subCategories.map((subCat) => {
                                const subCount = helpers.filter((h) =>
                                  isHelperMatchingCategory(h, subCat)
                                ).length;
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
                                      <span
                                        style={{
                                          backgroundColor: palette.badgeBg,
                                          color: palette.badgeText,
                                          borderColor: palette.badgeBorder,
                                        }}
                                        className="min-w-[24px] text-center px-2 py-0.5 rounded-full text-[11px] font-extrabold border"
                                      >
                                        {subCount}
                                      </span>
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
          <div className="flex items-center justify-between mb-3">
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
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {filteredHelpers.length}{' '}
              {tr('Profiles', 'प्रोफाइल', 'પ્રોફાઇલ')}
            </span>
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

                        <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg text-xs font-extrabold shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{helper.rating.toFixed(1)}</span>
                        </div>
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

                            {helper.phone && (
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
                              style={{
                                background:
                                  'linear-gradient(135deg, #FF6600 0%, #E03E00 100%)',
                              }}
                              className="px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{tr('Chat', 'चैट करें', 'ચેટ કરો')}</span>
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
    </div>
  );
}
