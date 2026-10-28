import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Wrench, 
  Zap, 
  Car, 
  Hammer, 
  Paintbrush, 
  Fan, 
  Sparkles, 
  Package, 
  GraduationCap, 
  HardHat, 
  X, 
  CheckCircle2, 
  MapPin, 
  Star, 
  MessageSquare, 
  Search,
  Trophy,
  Coffee,
  Building,
  Shield,
  ChevronRight,
  Phone,
  Plus,
  UserCheck,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CATEGORIES, 
  CategoryItem, 
  getCategoryName, 
  getFreeHelperProfiles, 
  saveFreeHelperProfile, 
  normalizeCategorySlug,
  FreeHelperProfile
} from '../data/categories';
import { useLanguage } from '../i18n';
import UserProfileModal from './UserProfileModal';
import LoginPromptModal from '../components/LoginPromptModal';
import FreeHelperRegisterModal from '../components/FreeHelperRegisterModal';
import { isGuestUser } from '../lib/authUtils';
import { getHelpers, getShops, getCurrentUser } from '../auth';
import { isEntityOwner } from '../lib/ownership';
import { getCachedCategoryImages, fetchCategoryImages } from '../api';

interface CategoriesScreenProps {
  onBack: () => void;
  onSelectCategory: (categoryId: string) => void;
  selectedCategory: string;
  onOpenChat: (intent?: any) => void;
}

export default function CategoriesScreen({ 
  onBack, 
  onSelectCategory, 
  selectedCategory: initialCategory, 
  onOpenChat 
}: CategoriesScreenProps) {
  const { language, t } = useLanguage();
  
  const normalizeCat = (cat?: string) => {
    if (!cat || cat === 'all') return 'all';
    if (cat === 'other_categories') return 'other';
    return cat;
  };

  // Active Category State ('all' shows grid of mini banners, specific cat id shows worker list)
  const [activeCategory, setActiveCategory] = useState<string>(() => normalizeCat(initialCategory));
  
  const [helpers, setHelpers] = useState<FreeHelperProfile[]>(() => getFreeHelperProfiles(false));
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>(() => getCachedCategoryImages());
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<{ name: string; distance: number } | null>(null);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  // Sync if initialCategory changes from props
  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(normalizeCat(initialCategory));
    }
  }, [initialCategory]);

  // Sync approved helpers, approved businesses/shops, and Admin-uploaded 16:9 category images from server & localStorage
  const loadApprovedHelpers = async () => {
    let serverHelpers: any[] = [];
    let serverShops: any[] = [];
    try {
      const [hList, sList] = await Promise.all([
        getHelpers(false).catch(() => []),
        getShops(false).catch(() => [])
      ]);
      if (Array.isArray(hList)) serverHelpers = hList;
      if (Array.isArray(sList)) serverShops = sList;
    } catch (e) {}

    const localHelpers = getFreeHelperProfiles(false);
    const mergedMap = new Map<string, FreeHelperProfile>();

    const addEntry = (item: any) => {
      if (!item || !item.id || /^h\d+/.test(String(item.id)) || String(item.id).startsWith('sample_shop_')) return;
      const isApproved = Boolean(item.isVerified === true || item.is_verified === true || item.status === 'approved');
      if (!isApproved) return;

      const rawSkills = Array.isArray(item.skills)
        ? item.skills
        : typeof item.skills === 'string' && item.skills.trim()
        ? item.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [item.categoryLabel || item.category || item.categoryId || 'Service'];

      const norm = normalizeCategorySlug(
        item.categoryId || item.category || item.categoryLabel,
        rawSkills,
        item.customCategoryName
      );
      const matchedCat = CATEGORIES.find(c => c.id === norm.categoryId);

      mergedMap.set(String(item.id), {
        id: String(item.id),
        userId: item.userId || item.owner_id || String(item.id),
        email: item.email || item.ownerEmail || '',
        name: item.name || item.businessName || 'Service Expert',
        categoryId: norm.categoryId,
        customCategoryName: item.customCategoryName || norm.customCategoryName || item.categoryLabel || '',
        masterCategory: item.masterCategory || (matchedCat ? matchedCat.masterCategory : 'utility_emergency'),
        phone: item.phone || '',
        skills: rawSkills,
        area: item.area || item.address || 'Local Area',
        city: item.city || '',
        experience: item.experience || item.timings || 'Verified',
        distance: typeof item.distance === 'number' ? item.distance : 0.6,
        rating: typeof item.rating === 'number' ? item.rating : 5.0,
        completedTasks: typeof item.completedTasks === 'number' ? item.completedTasks : Number(item.reviewCount || 1),
        createdAt: item.createdAt || new Date().toISOString(),
        isVerified: true,
        status: 'approved'
      });
    };

    localHelpers.forEach(addEntry);
    serverHelpers.forEach(addEntry);
    serverShops.forEach(addEntry);

    try {
      const localShopsRaw = localStorage.getItem('locohelp_registered_shops');
      const localShops: any[] = localShopsRaw ? JSON.parse(localShopsRaw) : [];
      localShops.forEach(addEntry);
    } catch {}

    setHelpers(Array.from(mergedMap.values()));
  };

  const loadCategoryImages = () => {
    fetchCategoryImages().then(imgs => {
      if (imgs && typeof imgs === 'object') {
        setCategoryImages(imgs);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadApprovedHelpers();
    loadCategoryImages();

    const onProfileOrStorageUpdate = () => {
      loadApprovedHelpers();
      loadCategoryImages();
    };
    window.addEventListener('locohelp_profile_updated', onProfileOrStorageUpdate);
    window.addEventListener('locohelp_category_images_updated', loadCategoryImages);
    window.addEventListener('storage', onProfileOrStorageUpdate);
    return () => {
      window.removeEventListener('locohelp_profile_updated', onProfileOrStorageUpdate);
      window.removeEventListener('locohelp_category_images_updated', loadCategoryImages);
      window.removeEventListener('storage', onProfileOrStorageUpdate);
    };
  }, [activeCategory, isRegisterOpen]);

  // Push history state when drilling down into a category or opening registration modal
  useEffect(() => {
    if (activeCategory !== 'all' || isRegisterOpen || selectedUserForProfile || isLoginPromptOpen) {
      try {
        window.history.pushState({ locohelpScreen: 'categories', locohelpSub: activeCategory }, '');
      } catch (e) {}
    }
  }, [activeCategory, isRegisterOpen, selectedUserForProfile, isLoginPromptOpen]);

  // Handle hardware Back button inside CategoriesScreen
  useEffect(() => {
    const handleCloseModalOrSubCategory = (e: Event) => {
      if (isLoginPromptOpen) {
        e.preventDefault();
        setIsLoginPromptOpen(false);
        return;
      }
      if (selectedUserForProfile) {
        e.preventDefault();
        setSelectedUserForProfile(null);
        return;
      }
      if (isRegisterOpen) {
        e.preventDefault();
        setIsRegisterOpen(false);
        return;
      }
      if (activeCategory !== 'all') {
        e.preventDefault();
        setActiveCategory('all');
        onSelectCategory('all');
        setCitySearchQuery('');
        return;
      }
    };
    window.addEventListener('locohelp_close_active_modal', handleCloseModalOrSubCategory);
    return () => window.removeEventListener('locohelp_close_active_modal', handleCloseModalOrSubCategory);
  }, [isLoginPromptOpen, selectedUserForProfile, isRegisterOpen, activeCategory]);

  const getCategoryIcon = (iconName: string, className = "w-5 h-5") => {
    switch (iconName) {
      case 'Wrench': return <Wrench className={className} />;
      case 'Zap': return <Zap className={className} />;
      case 'Car': return <Car className={className} />;
      case 'Hammer': return <Hammer className={className} />;
      case 'Paintbrush': return <Paintbrush className={className} />;
      case 'Fan': return <Fan className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'Package': return <Package className={className} />;
      case 'GraduationCap': return <GraduationCap className={className} />;
      case 'HardHat': return <HardHat className={className} />;
      case 'Trophy': return <Trophy className={className} />;
      case 'Coffee': return <Coffee className={className} />;
      case 'Building': return <Building className={className} />;
      default: return <Wrench className={className} />;
    }
  };

  // Match helper to category (including 'other' / custom categories and normalized slugs)
  const isHelperMatchingCategory = (h: FreeHelperProfile, targetCat: string): boolean => {
    if (targetCat === 'all') return true;
    const norm = normalizeCategorySlug(h.categoryId, h.skills, h.customCategoryName);
    const hCat = norm.categoryId.toLowerCase();
    if (targetCat === 'other' || targetCat === 'other_categories') {
      const isStandardNonOther = CATEGORIES.some(c => c.id !== 'other' && c.id.toLowerCase() === hCat);
      return (
        hCat === 'other' ||
        hCat === 'other_categories' ||
        Boolean(h.customCategoryName && h.customCategoryName.trim() && !isStandardNonOther) ||
        !isStandardNonOther
      );
    }
    return hCat === targetCat.toLowerCase();
  };

  // Filter helpers by active category and city/gaon search query
  const categoryHelpers = helpers.filter(h => {
    if (!isHelperMatchingCategory(h, activeCategory)) {
      return false;
    }
    if (citySearchQuery.trim()) {
      const q = citySearchQuery.toLowerCase();
      const matchCity = h.city ? h.city.toLowerCase().includes(q) : false;
      const matchArea = (h.area || '').toLowerCase().includes(q);
      const matchName = (h.name || '').toLowerCase().includes(q);
      const matchCustom = (h.customCategoryName || '').toLowerCase().includes(q);
      const matchSkill = Array.isArray(h.skills) && h.skills.some(s => s.toLowerCase().includes(q));
      return matchCity || matchArea || matchName || matchCustom || matchSkill;
    }
    return true;
  });

  const activeCategoryObj = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#F4F1EA] dark:bg-slate-900 relative overflow-hidden transition-colors">
      
      {/* SUCCESS TOAST */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-4 right-4 z-50 bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between text-xs font-extrabold"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                {language === 'EN'
                  ? 'Profile submitted for Admin review!'
                  : language === 'GU'
                  ? 'પ્રોફાઇલ એડમિન સમીક્ષા માટે સબમિટ થઈ ગઈ!'
                  : 'प्रोफाइल एडमिन समीक्षा के लिए सबमिट हो गई!'}
              </span>
            </div>
            <button onClick={() => setShowSuccessToast(false)}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER */}
      <div className="px-4 py-3.5 pt-10 sm:pt-4 border-b border-[#DFDBCF] dark:border-slate-800 bg-[#FDF8F5]/95 dark:bg-slate-900/95 backdrop-blur-xl z-20 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => {
                if (activeCategory !== 'all') {
                  setActiveCategory('all');
                  onSelectCategory('all');
                  setCitySearchQuery('');
                } else {
                  onBack();
                }
              }} 
              className="p-2 -ml-2 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-700 dark:text-pink-400 cursor-pointer" 
              title="Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-[16px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                {activeCategory === 'all' ? (
                  <span>🏷️ {t('cat.title')}</span>
                ) : (
                  <span className="flex items-center gap-1">
                    {getCategoryIcon(activeCategoryObj?.iconName || 'Wrench', "w-4 h-4 text-indigo-600")}
                    {getCategoryName(activeCategoryObj, language)}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {activeCategory === 'all' 
                  ? t('cat.headerSubtitleAll')
                  : language === 'EN'
                  ? `Total ${categoryHelpers.length} approved profiles`
                  : language === 'GU'
                  ? `કુલ ${categoryHelpers.length} મંજૂર પ્રોફાઇલ્સ`
                  : `कुल ${categoryHelpers.length} अप्रूव्ड प्रोफाइल्स`}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isGuestUser()) {
                setIsLoginPromptOpen(true);
                return;
              }
              setIsRegisterOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('cat.createProfileBtn')}</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-hide pb-24">
        
        {/* PAGE 1: CATEGORY MINI BANNERS GRID (When activeCategory === 'all') */}
        {activeCategory === 'all' ? (
          <div className="space-y-4">

            {/* Grid of Mini Category Banners */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(cat => {
                const count = helpers.filter(h => isHelperMatchingCategory(h, cat.id)).length;
                const rawImg =
                  categoryImages[cat.id] ||
                  categoryImages[cat.id.toLowerCase()] ||
                  (cat.nameEn ? categoryImages[cat.nameEn.toLowerCase()] : '');
                const customImg = typeof rawImg === 'string' && rawImg.trim().length > 0 ? rawImg.trim() : '';
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      onSelectCategory(cat.id);
                    }}
                    className="bg-[#FCFAF5] dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-xl overflow-hidden shadow-xs hover:border-amber-500 dark:hover:border-amber-500 transition-all cursor-pointer flex flex-col justify-between active:scale-[0.97]"
                  >
                    <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/80 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center relative">
                      {customImg ? (
                        <img
                          src={customImg}
                          alt={getCategoryName(cat, language)}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full aspect-video object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
                          {getCategoryIcon(cat.iconName, "w-6 h-6")}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 border-t border-[#EAE6DC] dark:border-slate-700/80">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug break-words">
                        {getCategoryName(cat, language)}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {count}
                        </span>
                        <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* PAGE 2: DRILL-DOWN CATEGORY WORKER LIST (When activeCategory !== 'all') */
          <div className="space-y-3.5">
            
            {/* Category Back Button & Title Strip */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-2xl p-3 shadow-xs">
              <button
                onClick={() => {
                  setActiveCategory('all');
                  onSelectCategory('all');
                  setCitySearchQuery('');
                }}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('cat.viewAllCat')}</span>
              </button>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                {getCategoryName(activeCategoryObj, language)}
              </span>
            </div>

            {/* City / Gaon Search Bar */}
            <div className="bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-2.5 flex items-center gap-2.5 shadow-xs">
              <Search className="w-4.5 h-4.5 text-amber-600 shrink-0" />
              <input 
                type="text" 
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                placeholder={t('cat.searchCityPlaceholder')}
                className="bg-transparent border-none outline-none text-slate-900 dark:text-white text-xs w-full font-bold placeholder:text-slate-400"
              />
              {citySearchQuery && (
                <button 
                  onClick={() => setCitySearchQuery('')}
                  className="text-xs text-slate-400 font-bold px-1.5 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Worker List for Selected Category */}
            {categoryHelpers.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {citySearchQuery 
                    ? language === 'EN'
                      ? `No ${getCategoryName(activeCategoryObj, language)} registered in "${citySearchQuery}" yet.`
                      : language === 'GU'
                      ? `"${citySearchQuery}" માં હજુ સુધી કોઈ ${getCategoryName(activeCategoryObj, language)} રજિસ્ટર થયેલ નથી.`
                      : `"${citySearchQuery}" में अभी तक कोई ${getCategoryName(activeCategoryObj, language)} रजिस्टर नहीं हुआ है।`
                    : language === 'EN'
                    ? 'No approved profile in this category yet.'
                    : language === 'GU'
                    ? 'હજુ સુધી આ કેટેગરીમાં કોઈ મંજૂર પ્રોફાઇલ નથી.'
                    : 'अभी तक इस कैटेगरी में कोई अप्रूव्ड प्रोफाइल नहीं है।'}
                </p>
                <button
                  onClick={() => {
                    if (isGuestUser()) {
                      setIsLoginPromptOpen(true);
                      return;
                    }
                    setIsRegisterOpen(true);
                  }}
                  className="bg-emerald-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  + {getCategoryName(activeCategoryObj, language)} {language === 'EN' ? 'Create Profile' : language === 'GU' ? 'પ્રોફાઇલ બનાવો' : 'प्रोफाइल बनाएं'}
                </button>
              </div>
            ) : (
              categoryHelpers.map(helper => {
                const matchedCat = CATEGORIES.find(c => c.id === helper.categoryId);
                const customLabel = (helper.customCategoryName || '').trim() || (helper.categoryId === 'other' && helper.skills?.[0] ? helper.skills[0] : '');
                return (
                  <div 
                    key={helper.id}
                    className="bg-[#FCFAF5] dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {helper.name}
                          </h4>
                          {customLabel ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              ✨ {customLabel}
                            </span>
                          ) : matchedCat ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                              {getCategoryName(matchedCat, language)}
                            </span>
                          ) : null}
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5 text-emerald-600" /> ✓ Approved
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-indigo-500 shrink-0" /> 
                          <span className="font-bold text-slate-800 dark:text-slate-200">{helper.city || helper.area || 'Local Area'}</span>
                          {helper.city && helper.area && helper.city !== helper.area ? ` (${helper.area})` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg text-amber-800 dark:text-amber-300 font-extrabold text-xs shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{helper.rating || 5.0}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {customLabel && (
                        <span className="text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                          🛠️ {customLabel}
                        </span>
                      )}
                      {(Array.isArray(helper.skills) ? helper.skills : []).map(s => (
                        <span key={s} className="text-[10px] font-bold bg-[#EAE6DC] dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                          {s}
                        </span>
                      ))}
                      <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                        Exp: {helper.experience}
                      </span>
                    </div>

                    {/* In-App Chat & Profile Buttons (Owners see Edit only, visitors see Chat) */}
                    {(() => {
                      const isHelperOwner = isEntityOwner(helper, getCurrentUser());
                      return (
                        <div className="flex items-center gap-2 pt-1 border-t border-[#EAE6DC] dark:border-slate-700">
                          {isHelperOwner ? (
                            <button 
                              type="button"
                              onClick={() => {
                                setIsRegisterOpen(true);
                              }}
                              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                              title={language === 'EN' ? 'Edit your service expert profile' : language === 'GU' ? 'તમારી પ્રોફાઇલ એડિટ કરો' : 'अपनी प्रोफाइल एडिट करें'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{language === 'EN' ? 'Edit Profile' : language === 'GU' ? 'પ્રોફાઇલ એડિટ કરો' : 'प्रोफ़ाइल एडिट करें'}</span>
                            </button>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => {
                                if (isGuestUser()) {
                                  setIsLoginPromptOpen(true);
                                  return;
                                }
                                onOpenChat({
                                  id: 'helper_chat_' + helper.id,
                                  description: `${helper.name} (${customLabel ? customLabel + ' • ' : ''}${(helper.skills || []).join(', ')}) - ${helper.area || 'Local Area'}`,
                                  distance: helper.distance,
                                  type: 'service',
                                  tags: helper.skills,
                                  createdAt: new Date().toISOString(),
                                  authorId: helper.id
                                });
                              }}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{language === 'EN' ? 'Chat on Website App' : language === 'GU' ? 'વેબસાઈટ પર ચેટ કરો' : 'वेबसाइट पर चैट करें'}</span>
                            </button>
                          )}

                          <button 
                            type="button"
                            onClick={() => setSelectedUserForProfile({ name: helper.name, distance: helper.distance })}
                            className="p-2 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                            title="View Profile"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* Unified Helper Profile Modal (Shows Existing Profile Status or Registration Form) */}
      <FreeHelperRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        defaultCategory={activeCategory !== 'all' ? activeCategory : 'plumber'}
        onSuccess={() => {
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 4000);
          loadApprovedHelpers();
        }}
      />

      <UserProfileModal 
        isOpen={Boolean(selectedUserForProfile)}
        onClose={() => setSelectedUserForProfile(null)}
        userName={selectedUserForProfile?.name || 'Service Expert'}
        distance={selectedUserForProfile?.distance || 0.5}
      />

      {/* Guest Mode Login Prompt Modal */}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        onGoToLogin={onBack}
        actionTitleEn="Sign In Required"
        actionTitleHi="चैट या प्रोफाइल बनाने के लिए लॉगिन करें"
        actionTitleGu="ચેટ અથવા પ્રોફાઇલ બનાવવા માટે લોગિન કરો"
      />

    </div>
  );
}
