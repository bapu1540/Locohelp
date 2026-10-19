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
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CATEGORIES, 
  CategoryItem, 
  getCategoryName, 
  getFreeHelperProfiles, 
  saveFreeHelperProfile, 
  FreeHelperProfile
} from '../data/categories';
import { useLanguage } from '../i18n';
import UserProfileModal from './UserProfileModal';
import LoginPromptModal from '../components/LoginPromptModal';
import { isGuestUser } from '../lib/authUtils';

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
  
  // Active Category State ('all' shows grid of mini banners, specific cat id shows worker list)
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategory && initialCategory !== 'all' ? initialCategory : 'all'
  );
  
  const [helpers, setHelpers] = useState<FreeHelperProfile[]>(() => getFreeHelperProfiles());
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<{ name: string; distance: number } | null>(null);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  // Registration Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('plumber');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formExp, setFormExp] = useState('2 Years');
  const [formSkills, setFormSkills] = useState('');
  const [govtIdUploaded, setGovtIdUploaded] = useState(false);
  const [shopPhotoUploaded, setShopPhotoUploaded] = useState(false);

  // Sync if initialCategory changes from props
  useEffect(() => {
    if (initialCategory && initialCategory !== 'all') {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

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

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const matchedCat = CATEGORIES.find(c => c.id === formCategory);
    const finalCatName = formCategory === 'other' && customCategoryName.trim() 
      ? customCategoryName.trim() 
      : (matchedCat ? matchedCat.nameEn : 'General Helper');

    const skillsList = formSkills.trim() 
      ? formSkills.split(',').map(s => s.trim()) 
      : [finalCatName];

    const newHelper = saveFreeHelperProfile({
      name: formName.trim(),
      categoryId: formCategory,
      phone: formPhone.trim(),
      skills: skillsList,
      area: formArea.trim() || 'Local Area',
      city: formCity.trim() || 'Ahmedabad',
      experience: formExp.trim() || '1 Year',
      distance: 0.5,
      govtIdUploaded,
      shopPhotoUploaded,
      isVerified: Boolean(govtIdUploaded || shopPhotoUploaded),
    });

    setHelpers(prev => [newHelper, ...prev]);
    setIsRegisterOpen(false);
    setActiveCategory(formCategory);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);

    // Reset Form
    setFormName('');
    setFormPhone('');
    setFormArea('');
    setFormCity('');
    setFormSkills('');
    setGovtIdUploaded(false);
    setShopPhotoUploaded(false);
  };

  // Filter helpers by active category and city/gaon search query
  const categoryHelpers = helpers.filter(h => {
    if (activeCategory !== 'all' && h.categoryId !== activeCategory) {
      return false;
    }
    if (citySearchQuery.trim()) {
      const q = citySearchQuery.toLowerCase();
      const matchCity = h.city ? h.city.toLowerCase().includes(q) : false;
      const matchArea = h.area.toLowerCase().includes(q);
      const matchName = h.name.toLowerCase().includes(q);
      const matchSkill = h.skills.some(s => s.toLowerCase().includes(q));
      return matchCity || matchArea || matchName || matchSkill;
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
              <span>{t('cat.registerSuccess')}</span>
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
                  setCitySearchQuery('');
                } else {
                  onBack();
                }
              }} 
              className="p-2 -ml-2 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-700 dark:text-pink-400" 
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
                  : `Total ${categoryHelpers.length} registered profiles`}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (activeCategory !== 'all') {
                setFormCategory(activeCategory);
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
                const count = helpers.filter(h => h.categoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      onSelectCategory(cat.id);
                    }}
                    className="bg-[#FCFAF5] dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-2xl p-3.5 shadow-xs hover:border-amber-500 dark:hover:border-amber-500 transition-all cursor-pointer flex flex-col justify-between active:scale-[0.97]"
                  >
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center mb-2.5 shadow-xs">
                        {getCategoryIcon(cat.iconName, "w-5 h-5")}
                      </div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                        {getCategoryName(cat, language)}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 line-clamp-2">
                        {cat.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#EAE6DC] dark:border-slate-700/80">
                      <span className="text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        {count} Registered
                      </span>
                      <ChevronRight className="w-4 h-4 text-amber-600" />
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
                    ? `"${citySearchQuery}" me abhi tak koi ${getCategoryName(activeCategoryObj, language)} register nahi hua hai.`
                    : `Abhi tak is category me koi profile nahi bani hai.`}
                </p>
                <button
                  onClick={() => {
                    if (isGuestUser()) {
                      setIsLoginPromptOpen(true);
                      return;
                    }
                    setFormCategory(activeCategory);
                    setIsRegisterOpen(true);
                  }}
                  className="bg-emerald-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  + Pehle {getCategoryName(activeCategoryObj, language)} Profile Banayein
                </button>
              </div>
            ) : (
              categoryHelpers.map(helper => {
                const matchedCat = CATEGORIES.find(c => c.id === helper.categoryId);
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
                          {matchedCat && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                              {getCategoryName(matchedCat, language)}
                            </span>
                          )}
                          {(helper.isVerified || helper.govtIdUploaded) && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5 text-emerald-600" /> ✓ Verified Pro
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-indigo-500 shrink-0" /> 
                          <span className="font-bold text-slate-800 dark:text-slate-200">{helper.city || 'Ahmedabad'}</span> ({helper.area})
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg text-amber-800 dark:text-amber-300 font-extrabold text-xs shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{helper.rating}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {helper.skills.map(s => (
                        <span key={s} className="text-[10px] font-bold bg-[#EAE6DC] dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                          {s}
                        </span>
                      ))}
                      <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                        Exp: {helper.experience}
                      </span>
                    </div>

                    {/* In-App Chat & Profile Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-[#EAE6DC] dark:border-slate-700">
                      <button 
                        onClick={() => {
                          if (isGuestUser()) {
                            setIsLoginPromptOpen(true);
                            return;
                          }
                          onOpenChat({
                            id: 'helper_chat_' + helper.id,
                            description: `${helper.name} (${helper.skills.join(', ')}) - Shehar: ${helper.city || 'Ahmedabad'}`,
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
                        <span>{language === 'EN' ? 'Chat on Website App' : 'वेबसाइट पर चैट करें'}</span>
                      </button>

                      <button 
                        onClick={() => setSelectedUserForProfile({ name: helper.name, distance: helper.distance })}
                        className="p-2 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                        title="View Profile"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* WORKER REGISTRATION MODAL WITH CITY INPUT & DOCUMENT WARNING */}
      <AnimatePresence>
        {isRegisterOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsRegisterOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-md bg-white dark:bg-slate-850 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>📝 Worker / Shop Registration</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Apna Shehar / Gaon chun kar 1 minute me online profile banayein
                  </p>
                </div>
                <button 
                  onClick={() => setIsRegisterOpen(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* WARNING DISCLAIMER NOTICE */}
              <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-3 mb-4 text-xs space-y-1">
                <p className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Important Document Warning:</span>
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-tight">
                  Kripya sahi aur asli documents hi upload karein. Kisi bhi galat jaankari ya problem ke liye aap khud jimmedar rahenge.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                    Aapka Naam (Full Name) *
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ramesh Patel" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>
                          {getCategoryName(c, language) || c.nameEn}
                        </option>
                      ))}
                    </select>

                    {/* Show Custom Category Input if 'other' is selected */}
                    {formCategory === 'other' && (
                      <div className="mt-2 col-span-2">
                        <label className="block text-[11px] font-black text-emerald-700 dark:text-emerald-400 mb-1">
                          {language === 'EN' ? 'Custom Category / Hospital Name *' : 'अपनी केटेगरी / अस्पताल का नाम लिखें *'}
                        </label>
                        <input 
                          type="text" 
                          required 
                          value={customCategoryName}
                          onChange={(e) => setCustomCategoryName(e.target.value)}
                          placeholder={language === 'EN' ? 'e.g. City Life Hospital, Clinic, Bakery' : 'उदा. सिटी लाइफ अस्पताल, क्लिनिक, बेकरी'} 
                          className="w-full bg-emerald-50 dark:bg-slate-800 border-2 border-emerald-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number *
                    </label>
                    <input 
                      type="tel" 
                      required 
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 9876543210" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* City / Gaon Name Input */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                      Shehar / Gaon ka Naam *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="e.g. Ahmedabad / Surat" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                      Area / Mohalla Name
                    </label>
                    <input 
                      type="text" 
                      value={formArea}
                      onChange={(e) => setFormArea(e.target.value)}
                      placeholder="e.g. Satellite / Bapunagar" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                      Anubhav (Experience)
                    </label>
                    <input 
                      type="text" 
                      value={formExp}
                      onChange={(e) => setFormExp(e.target.value)}
                      placeholder="e.g. 3 Years" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                      Skills (Comma separated)
                    </label>
                    <input 
                      type="text" 
                      value={formSkills}
                      onChange={(e) => setFormSkills(e.target.value)}
                      placeholder="e.g. Pipe, Fitting, Tank" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Document Photos Upload Box */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                    Verification Document Proof (Upload 2 Photos)
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <label className={`border border-dashed rounded-xl p-2.5 text-center cursor-pointer transition-all ${govtIdUploaded ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={() => setGovtIdUploaded(true)}
                        className="hidden"
                      />
                      <span className="text-[10px] font-bold block">
                        {govtIdUploaded ? '✓ Govt ID Uploaded' : '📷 1. Govt ID Photo'}
                      </span>
                    </label>

                    <label className={`border border-dashed rounded-xl p-2.5 text-center cursor-pointer transition-all ${shopPhotoUploaded ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={() => setShopPhotoUploaded(true)}
                        className="hidden"
                      />
                      <span className="text-[10px] font-bold block">
                        {shopPhotoUploaded ? '✓ Work Photo Uploaded' : '📷 2. Shop/Work Photo'}
                      </span>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer mt-2"
                >
                  🚀 Submit & Create Profile Free
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <UserProfileModal 
        isOpen={Boolean(selectedUserForProfile)}
        onClose={() => setSelectedUserForProfile(null)}
        userName={selectedUserForProfile?.name || 'Helper'}
        distance={selectedUserForProfile?.distance || 0.5}
      />

      {/* Guest Mode Login Prompt Modal */}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        onGoToLogin={onBack}
        actionTitleEn="Sign In Required"
        actionTitleHi="चैट या प्रोफाइल बनाने के लिए लॉगिन करें"
      />

    </div>
  );
}
