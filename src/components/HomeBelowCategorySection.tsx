import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Star,
  MessageCircle,
  Headphones,
  MapPin,
  Phone,
  ChevronRight,
  Calendar,
  Megaphone,
  Briefcase,
  UserPlus,
  Store,
  Wrench,
  Heart,
  X,
  CheckCircle2,
  Clock,
  Award,
} from 'lucide-react';
import { Screen } from '../types';
import { useLanguage } from '../i18n';
import { getHelpers } from '../auth';
import {
  fetchHelperReviews,
  submitHelperReview,
  createAdOnServer as saveAdBannerOnServer,
  HelperReviewItem,
} from '../api';
import { getSavedUserLocation, UserManualLocation as UserLocationData } from '../data/panIndiaLocations';
import { getAuthenticRatingInfo, isEntityAdminVerified } from '../modules/verification';
import { CATEGORIES } from '../data/categories';

export interface HomeBelowCategorySectionProps {
  onNavigate: (screen: Screen) => void;
  onSelectCategory?: (category: string) => void;
  onUrgentBookNow: () => void;
  onAdvertiseBusiness?: () => void;
  onOpenShopRegister?: () => void;
  onOpenFreeHelperRegister?: () => void;
  onOpenJobSeeker: () => void;
  onOpenJobEmployer: () => void;
  onOpenDirectChat: (intentOrProvider?: any) => void;
  showToast?: (msg: string) => void;
}

export interface ShowcaseProviderItem {
  id: string;
  nameGu: string;
  nameHi: string;
  nameEn: string;
  roleGu: string;
  roleHi: string;
  roleEn: string;
  categoryId: string;
  categoryKey: string;
  rating: string;
  reviews: number;
  distance: string;
  avatar: string;
  avatarUrl: string;
  phone?: string;
  areaGu?: string;
  areaHi?: string;
  areaEn?: string;
  experienceGu?: string;
  experienceHi?: string;
  experienceEn?: string;
  aboutGu?: string;
  aboutHi?: string;
  aboutEn?: string;
  userId?: string;
  email?: string;
  isVerified?: boolean;
}

export const DEFAULT_SHOWCASE_PROVIDERS: ShowcaseProviderItem[] = [];

export const HomeBelowCategorySection: React.FC<HomeBelowCategorySectionProps> = ({
  onNavigate,
  onSelectCategory,
  onUrgentBookNow,
  onOpenShopRegister,
  onOpenFreeHelperRegister,
  onOpenJobSeeker,
  onOpenJobEmployer,
  onOpenDirectChat,
  showToast,
}) => {
  const { language } = useLanguage();
  const [liveHelpers, setLiveHelpers] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocationData | null>(() =>
    getSavedUserLocation()
  );
  const [filterByMyCity, setFilterByMyCity] = useState<boolean>(true);
  const [selectedProviderProfile, setSelectedProviderProfile] =
    useState<ShowcaseProviderItem | null>(null);
  const [providerReviews, setProviderReviews] = useState<HelperReviewItem[]>([]);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Promote Your Business Ad Request Modal State
  const [showPromoteModal, setShowPromoteModal] = useState<boolean>(false);
  const [adForm, setAdForm] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    ownerEmail: '',
    area: '',
    adPlan: 'Home Top / Middle Banner Ad',
    durationDays: '30 Days',
    offerTitle: '',
    description: '',
    photoUrl: '',
  });
  const [isSubmittingAd, setIsSubmittingAd] = useState<boolean>(false);

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('locohelp_favorite_helpers') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const syncLoc = () => {
      setUserLocation(getSavedUserLocation());
    };
    window.addEventListener('locohelp_location_changed', syncLoc);
    window.addEventListener('storage', syncLoc);
    return () => {
      window.removeEventListener('locohelp_location_changed', syncLoc);
      window.removeEventListener('storage', syncLoc);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadApprovedHelpers = async () => {
      try {
        const list = (await getHelpers()) || [];
        if (!isMounted || !Array.isArray(list)) return;
        const approved = list.filter((h: any) => {
          if (!h || !h.name) return false;
          if (h.status && h.status !== 'approved') return false;
          const idStr = String(h.id || '').trim();
          // Exclude Simple User Profiles — only include genuine Service Expert registrations
          if (!idStr.startsWith('helper_') && !idStr.startsWith('hp_')) return false;
          const catId = String(h.categoryId || h.category || '').trim().toLowerCase();
          const customCat = String(h.customCategoryName || '').trim();
          const firstSkill =
            Array.isArray(h.skills) && h.skills[0] ? String(h.skills[0]).trim().toLowerCase() : '';
          if ((!catId || catId === 'other') && !customCat && (!firstSkill || firstSkill === 'other')) {
            return false;
          }
          return true;
        });
        setLiveHelpers(approved);
      } catch {
        if (isMounted) setLiveHelpers([]);
      }
    };
    loadApprovedHelpers();
    window.addEventListener('locohelp_free_helpers_updated', loadApprovedHelpers);
    return () => {
      isMounted = false;
      window.removeEventListener('locohelp_free_helpers_updated', loadApprovedHelpers);
    };
  }, []);

  useEffect(() => {
    if (!selectedProviderProfile) {
      setProviderReviews([]);
      setReviewRating(5);
      setReviewComment('');
      return;
    }
    let active = true;
    fetchHelperReviews(selectedProviderProfile.id).then((revs) => {
      if (active) setProviderReviews(revs);
    });
    return () => {
      active = false;
    };
  }, [selectedProviderProfile?.id]);

  useEffect(() => {
    const syncFavs = () => {
      try {
        setFavoriteIds(JSON.parse(localStorage.getItem('locohelp_favorite_helpers') || '[]'));
      } catch {
        setFavoriteIds([]);
      }
    };
    window.addEventListener('locohelp_favorites_updated', syncFavs);
    return () => window.removeEventListener('locohelp_favorites_updated', syncFavs);
  }, []);

  const toggleFavoriteProvider = (item: ShowcaseProviderItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const savedIds: string[] = JSON.parse(
        localStorage.getItem('locohelp_favorite_helpers') || '[]'
      );
      const savedObjs: ShowcaseProviderItem[] = JSON.parse(
        localStorage.getItem('locohelp_favorite_helper_objects') || '[]'
      );
      const exists = savedIds.includes(item.id);
      let nextIds: string[];
      let nextObjs: ShowcaseProviderItem[];

      if (exists) {
        nextIds = savedIds.filter((id) => id !== item.id);
        nextObjs = savedObjs.filter((obj) => obj && obj.id !== item.id);
        if (showToast) {
          showToast(
            language === 'GU'
              ? 'પસંદીદામાંથી દૂર કરવામાં આવ્યા'
              : language === 'HI'
              ? 'पसंदीदा से हटाया गया'
              : 'Removed from Favorites'
          );
        }
      } else {
        nextIds = [...savedIds, item.id];
        nextObjs = [...savedObjs.filter((obj) => obj && obj.id !== item.id), item];
        if (showToast) {
          showToast(
            language === 'GU'
              ? '❤️ પસંદીદા (Favorites) માં સેવ થઈ ગયું!'
              : language === 'HI'
              ? '❤️ पसंदीदा (Favorites) में सेव हो गया!'
              : '❤️ Saved to Favorites!'
          );
        }
      }

      localStorage.setItem('locohelp_favorite_helpers', JSON.stringify(nextIds));
      localStorage.setItem('locohelp_favorite_helper_objects', JSON.stringify(nextObjs));
      setFavoriteIds(nextIds);
      window.dispatchEvent(new Event('locohelp_favorites_updated'));
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleOpenCategoryOrHelpers = (catKey?: string) => {
    if (catKey && onSelectCategory) {
      onSelectCategory(catKey);
    }
    onNavigate('categories');
  };

  const selectedTaluka = (userLocation?.taluka || userLocation?.area || '').trim();
  const selectedDistrict = (userLocation?.district || '').trim();
  const selectedCityName =
    selectedTaluka && selectedDistrict
      ? `${selectedTaluka}, ${selectedDistrict}`
      : selectedTaluka || selectedDistrict;
  const locationFilteredHelpers = React.useMemo(() => {
    if (!filterByMyCity || !selectedCityName) return liveHelpers;
    const normDistrict = (userLocation?.district || '').trim().toLowerCase();
    const normArea = (userLocation?.taluka || userLocation?.area || '').trim().toLowerCase();
    const matched = liveHelpers.filter((prov: any) => {
      const pArea = String(prov.area || prov.city || prov.location || '').toLowerCase();
      if (!pArea) return false;
      if (normArea && pArea.includes(normArea)) return true;
      if (normDistrict && pArea.includes(normDistrict)) return true;
      return false;
    });
    // Prioritize matching city helpers first, then include remaining approved liveHelpers up to 6
    if (matched.length > 0 && matched.length < 6) {
      const matchedIds = new Set(matched.map((m: any) => m.id));
      const others = liveHelpers.filter((p: any) => p && !matchedIds.has(p.id));
      return [...matched, ...others];
    }
    return matched.length > 0 ? matched : liveHelpers;
  }, [liveHelpers, filterByMyCity, selectedCityName, userLocation]);

  // Build uniform ShowcaseProviderItem list (strictly max 6 Service Experts, never Simple User Profiles)
  const displayProviders: ShowcaseProviderItem[] =
    locationFilteredHelpers.length > 0
      ? locationFilteredHelpers.slice(0, 6).map((prov, idx) => {
          const dist = String(prov.distance || ['1.2', '2.5', '3.0'][idx % 3]);
          const ratingInfo = getAuthenticRatingInfo(prov, language);
          const revCount = ratingInfo.reviewCount;
          const ratingVal = ratingInfo.ratingText;
          const avatar =
            prov.avatar ||
            prov.photoUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(prov.name)}`;
          const catKey = String(prov.categoryId || prov.category || 'electrician');
          const matchedCat = CATEGORIES.find((c) => c.id === catKey);
          const customSkill =
            prov.customCategoryName ||
            (Array.isArray(prov.skills) && prov.skills[0] && prov.skills[0] !== 'other'
              ? prov.skills[0]
              : '');
          const roleGu = customSkill || matchedCat?.nameGu || 'સેવા નિષ્ણાત';
          const roleHi = customSkill || matchedCat?.nameHi || 'सेवा विशेषज्ञ';
          const roleEn = customSkill || matchedCat?.nameEn || 'Service Expert';
          return {
            id: String(prov.id || `live-prov-${idx}`),
            userId: String(prov.userId || prov.user_id || prov.id || ''),
            email: String(prov.email || ''),
            isVerified: isEntityAdminVerified(prov),
            nameGu: prov.name,
            nameHi: prov.name,
            nameEn: prov.name,
            roleGu,
            roleHi,
            roleEn,
            categoryId: catKey,
            categoryKey: catKey,
            rating: ratingVal,
            reviews: Number(revCount),
            distance: dist,
            avatar,
            avatarUrl: avatar,
            phone: prov.phone || '',
            areaGu: prov.area || selectedCityName || 'ગાંધીનગર',
            areaHi: prov.area || selectedCityName || 'गांधीनगर',
            areaEn: prov.area || selectedCityName || 'Local Area',
            experienceGu: prov.experience || '5+ વર્ષનો અનુભવ',
            experienceHi: prov.experience || '5+ वर्षों का अनुभव',
            experienceEn: prov.experience || '5+ Years Experience',
            aboutGu:
              prov.bio ||
              prov.description ||
              'વેરિફાઈડ સ્થાનિક સેવા પ્રદાતા. ઝડપી અને વિશ્વસનીય ઘરઆંગણે સેવા.',
            aboutHi:
              prov.bio ||
              prov.description ||
              'वेरिफाइड स्थानीय सेवा प्रदाता। तेज़ और विश्वसनीय सेवा।',
            aboutEn:
              prov.bio ||
              prov.description ||
              'Verified local service provider offering reliable doorstep service.',
          };
        })
      : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
      {/* 1. 4-Column Trust Feature Strip */}
      <div
        style={{
          background: 'linear-gradient(90deg, #f1f8f5 0%, #f8fafc 50%, #f0f7ff 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: '16px',
          padding: '8px 4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            width: '100%',
            alignItems: 'center',
          }}
        >
          {/* Item 1: વેરીફાઈ સેવા પ્રદાતા */}
          <div
            onClick={() => handleOpenCategoryOrHelpers()}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '2px 3px',
              borderRight: '1px solid #e2e8f0',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '9999px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#1f2937', lineHeight: 1.15 }}>
              {language === 'GU' ? (
                <>
                  <div>વેરીફાઈ</div>
                  <div>સેવા પ્રદાતા</div>
                </>
              ) : language === 'HI' ? (
                <>
                  <div>वेरिफाइड</div>
                  <div>सेवा प्रदाता</div>
                </>
              ) : (
                <>
                  <div>Verified</div>
                  <div>Providers</div>
                </>
              )}
            </div>
          </div>

          {/* Item 2: ગ્રાહક રેટિંગ અને રિવ્યૂ */}
          <div
            onClick={() => handleOpenCategoryOrHelpers()}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '2px 3px',
              borderRight: '1px solid #e2e8f0',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '9999px',
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Star className="w-3.5 h-3.5 fill-white" />
            </div>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#1f2937', lineHeight: 1.15 }}>
              {language === 'GU' ? (
                <>
                  <div>ગ્રાહક રેટિંગ</div>
                  <div>અને રિવ્યૂ</div>
                </>
              ) : language === 'HI' ? (
                <>
                  <div>ग्राहक रेटिंग</div>
                  <div>और रिव्यू</div>
                </>
              ) : (
                <>
                  <div>Customer</div>
                  <div>Ratings</div>
                </>
              )}
            </div>
          </div>

          {/* Item 3: સીધી વાતચીત */}
          <div
            onClick={() => onOpenDirectChat()}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '2px 3px',
              borderRight: '1px solid #e2e8f0',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '9999px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#1f2937', lineHeight: 1.15 }}>
              {language === 'GU' ? (
                <>
                  <div>સીધી વાતચીત</div>
                  <div style={{ fontSize: '8px', color: '#4b5563' }}>(કોલ/ચેટ)</div>
                </>
              ) : language === 'HI' ? (
                <>
                  <div>सीधी बातचीत</div>
                  <div style={{ fontSize: '8px', color: '#4b5563' }}>(कॉल/चैट)</div>
                </>
              ) : (
                <>
                  <div>Direct Chat</div>
                  <div style={{ fontSize: '8px', color: '#4b5563' }}>(Call/Chat)</div>
                </>
              )}
            </div>
          </div>

          {/* Item 4: ગ્રાહક સહાય (support@locohelp.com) */}
          <a
            href="mailto:support@locohelp.com?subject=LocoHelp%20Support%20Request"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '2px 3px',
              textDecoration: 'none',
              minWidth: 0,
            }}
            title="support@locohelp.com"
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '9999px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Headphones className="w-3.5 h-3.5" />
            </div>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#1f2937', lineHeight: 1.15 }}>
              {language === 'GU' ? (
                <>
                  <div>ગ્રાહક સહાય</div>
                  <div style={{ fontSize: '8px', color: '#1d4ed8' }}>24x7 મેઇલ</div>
                </>
              ) : language === 'HI' ? (
                <>
                  <div>ग्राहक सहायता</div>
                  <div style={{ fontSize: '8px', color: '#1d4ed8' }}>24x7 मेल</div>
                </>
              ) : (
                <>
                  <div>Support</div>
                  <div style={{ fontSize: '8px', color: '#1d4ed8' }}>24x7 Email</div>
                </>
              )}
            </div>
          </a>
        </div>
      </div>

      {/* 2. તમારા વિસ્તારમાં ઉપલબ્ધ સેવા પ્રદાતાઓ (Verified Service Experts Showcase Grid - Max 6 Boxes) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '9999px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <h3
              style={{
                fontSize: '13px',
                fontWeight: 900,
                color: '#0f172a',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {language === 'GU'
                ? 'તમારા વિસ્તારમાં ઉપલબ્ધ સેવા પ્રદાતાઓ'
                : language === 'HI'
                ? 'आपके क्षेत्र में उपलब्ध सेवा प्रदाता'
                : 'Available Providers in Your Area'}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {selectedCityName && (
              <button
                type="button"
                onClick={() => setFilterByMyCity((prev) => !prev)}
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  border: filterByMyCity ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                  backgroundColor: filterByMyCity ? '#eff6ff' : '#f8fafc',
                  color: filterByMyCity ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Click to toggle between your city & all cities"
              >
                📍{' '}
                {filterByMyCity
                  ? selectedCityName
                  : language === 'GU'
                  ? 'બધા શહેરો'
                  : language === 'HI'
                  ? 'सभी शहर'
                  : 'All Cities'}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleOpenCategoryOrHelpers()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#1d4ed8',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <span>
                {language === 'GU' ? 'વધુ જુઓ' : language === 'HI' ? 'और देखें' : 'View More'}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 6-Box Grid (Max 6 Service Experts) or Clean Empty Box */}
        {displayProviders.length === 0 ? (
          <div
            style={{
              padding: '16px 12px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              border: '1px dashed #cbd5e1',
            }}
          >
            <p style={{ fontSize: '12px', fontWeight: 800, color: '#334155', margin: '0 0 4px 0' }}>
              {language === 'GU'
                ? `${selectedCityName || 'આ વિસ્તાર'} માં હાલમાં કોઈ રજિસ્ટર્ડ સેવા નિષ્ણાત ઉપલબ્ધ નથી.`
                : language === 'HI'
                ? `${selectedCityName || 'इस क्षेत्र'} में अभी कोई रजिस्टर्ड सेवा विशेषज्ञ उपलब्ध नहीं है।`
                : `No registered service experts available in ${selectedCityName || 'this area'} yet.`}
            </p>
            <p style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748b', margin: '0 0 10px 0' }}>
              {language === 'GU'
                ? 'જ્યારે કોઈ સેવા નિષ્ણાત (જેમ કે પ્લમ્બર, ઈલેક્ટ્રીશિયન વગેરે) રજિસ્ટ્રેશન કરશે ત્યારે અહીં 6 બોક્સમાં દેખાશે.'
                : language === 'HI'
                ? 'जब कोई सेवा विशेषज्ञ (जैसे प्लंबर, इलेक्ट्रीशियन आदि) रजिस्ट्रेशन करेगा तो यहाँ दिखाई देगा।'
                : 'Registered service experts (like Plumber, Electrician, etc.) will appear here (up to 6 cards).'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {filterByMyCity && liveHelpers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterByMyCity(false)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#1d4ed8',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '9999px',
                    padding: '5px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {language === 'GU'
                    ? 'બધા વિસ્તારના કારીગરો જુઓ'
                    : language === 'HI'
                    ? 'सभी क्षेत्रों के कारीगर देखें'
                    : 'Show All Areas'}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenCategoryOrHelpers()}
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#0f766e',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderRadius: '9999px',
                  padding: '5px 12px',
                  cursor: 'pointer',
                }}
              >
                {language === 'GU'
                  ? 'કેટેગરી લિસ્ટ જુઓ'
                  : language === 'HI'
                  ? 'कैटेगरी लिस्ट देखें'
                  : 'Browse Categories'}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '8px',
              width: '100%',
            }}
          >
            {displayProviders.slice(0, 6).map((item) => {
              const name =
                language === 'GU' ? item.nameGu : language === 'HI' ? item.nameHi : item.nameEn;
              const role =
                language === 'GU' ? item.roleGu : language === 'HI' ? item.roleHi : item.roleEn;
              const isFav = favoriteIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedProviderProfile(item)}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '8px 6px 6px 6px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0,
                    cursor: 'pointer',
                  }}
                >
                  {/* Top Left Favorite Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavoriteProvider(item, e)}
                    title={
                      isFav
                        ? language === 'GU'
                          ? 'પસંદીદામાંથી હટાવો'
                          : 'Remove Favorite'
                        : language === 'GU'
                        ? 'પસંદીદામાં ઉમેરો'
                        : 'Add to Favorite'
                    }
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      left: '4px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '9999px',
                      backgroundColor: '#ffffff',
                      border: isFav ? '1px solid #fecaca' : '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 3,
                      padding: 0,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    }}
                  >
                    <Heart
                      className={`w-3 h-3 ${
                        isFav ? 'text-red-500 fill-red-500' : 'text-slate-400'
                      }`}
                    />
                  </button>

                  {/* Verified Green Badge on Top Right */}
                  {item.isVerified && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '6px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        fontSize: '8px',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    >
                      <span>✓</span>
                      <span>
                        {language === 'GU'
                          ? 'વેરિફાઈડ'
                          : language === 'HI'
                          ? 'वेरिफाइड'
                          : 'Verified'}
                      </span>
                    </div>
                  )}

                  {/* Top Row: Photo + Name & Role */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '4px',
                      minWidth: 0,
                    }}
                  >
                    <img
                      src={item.avatar}
                      alt={name}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: '1px solid #cbd5e1',
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 900,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                        }}
                      >
                        {name}
                      </div>
                      <div
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          color: '#475569',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                        }}
                      >
                        ({role})
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Rating + Distance + Call Circle */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '6px',
                      marginBottom: '6px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '9px',
                          fontWeight: 800,
                          color: '#334155',
                        }}
                      >
                        <span style={{ color: '#f59e0b' }}>★</span>
                        <span>{item.rating}</span>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>({item.reviews})</span>
                      </div>
                      <div
                        style={{
                          fontSize: '8.5px',
                          fontWeight: 700,
                          color: '#475569',
                          marginTop: '1px',
                        }}
                      >
                        📍 {item.distance}{' '}
                        {language === 'GU' ? 'કિ.મી.' : language === 'HI' ? 'कि.मी.' : 'km'}
                      </div>
                    </div>

                    <a
                      href={item.phone ? `tel:${item.phone}` : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!item.phone) {
                          e.preventDefault();
                          setSelectedProviderProfile(item);
                        }
                      }}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '9999px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        textDecoration: 'none',
                        boxShadow: '0 1px 2px rgba(22,163,74,0.25)',
                      }}
                      title={`Call ${name}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Bottom Row: Direct Message / Chat Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDirectChat({
                        id: item.userId || item.id,
                        name: name,
                        role: role,
                        phone: item.phone || '',
                        email: item.email || '',
                        categoryKey: item.categoryKey,
                        avatar: item.avatar,
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 4px',
                      borderRadius: '8px',
                      backgroundColor: '#0d9488',
                      color: '#ffffff',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>💬</span>
                    <span>
                      {language === 'GU'
                        ? 'મેસેજ કરો (Chat)'
                        : language === 'HI'
                        ? 'मैसेज करें (Chat)'
                        : 'Message (Chat)'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Two Side-by-Side Action Banners: Urgent Service & Advertise Business (Opens Admin Email support@locohelp.com) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '8px',
          width: '100%',
        }}
      >
        {/* Left Blue Pill Banner: તાત્કાલિક સેવા જોઈએ? હમણાં બુક કરો -> */}
        <button
          type="button"
          onClick={onUrgentBookNow}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            padding: '10px',
            borderRadius: '16px',
            background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
            color: '#ffffff',
            border: '1px solid #60a5fa',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <div style={{ minWidth: 0, flex: 1, lineHeight: 1.2 }}>
            <div style={{ fontSize: '10.5px', fontWeight: 900 }}>
              {language === 'GU'
                ? 'તાત્કાલિક સેવા જોઈએ?'
                : language === 'HI'
                ? 'तत्काल सेवा चाहिए?'
                : 'Need Urgent Service?'}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#fef08a', marginTop: '2px' }}>
              {language === 'GU'
                ? 'હમણાં બુક કરો →'
                : language === 'HI'
                ? 'अभी बुक करें →'
                : 'Book Now →'}
            </div>
          </div>
        </button>

        {/* Right Green Pill Banner: તમારા વ્યવસાયની જાહેરાત આપો -> Opens Interactive Ad Booking Form Modal */}
        <button
          type="button"
          onClick={() => {
            setAdForm((prev) => ({
              ...prev,
              area: prev.area || selectedCityName || 'Gandhinagar',
            }));
            setShowPromoteModal(true);
          }}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            padding: '10px',
            borderRadius: '16px',
            background: 'linear-gradient(90deg, #bef264 0%, #a3e635 50%, #4ade80 100%)',
            color: '#0f172a',
            border: '1px solid #86efac',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
          title="Promote Your Business on LocoHelp"
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Megaphone className="w-4 h-4 text-orange-600" />
          </div>
          <div style={{ minWidth: 0, flex: 1, lineHeight: 1.2 }}>
            <div style={{ fontSize: '10.5px', fontWeight: 900, color: '#0f172a' }}>
              {language === 'GU'
                ? 'તમારા વ્યવસાયની'
                : language === 'HI'
                ? 'अपने व्यवसाय का'
                : 'Promote Your'}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 900, color: '#14532d', marginTop: '2px' }}>
              {language === 'GU'
                ? 'જાહેરાત આપો →'
                : language === 'HI'
                ? 'विज्ञापन दें →'
                : 'Business Ad →'}
            </div>
          </div>
        </button>
      </div>

      {/* 4. Separate Compact Banners for Shop/Showroom Registration & Free Service Expert Registration */}
      {(onOpenShopRegister || onOpenFreeHelperRegister) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '8px',
            width: '100%',
          }}
        >
          {/* Shop / Showroom Registration Banner */}
          <button
            type="button"
            onClick={onOpenShopRegister}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '12px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#ea580c',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Store className="w-3.5 h-3.5" />
            </div>
            <div style={{ minWidth: 0, flex: 1, lineHeight: 1.15 }}>
              <div style={{ fontSize: '10px', fontWeight: 900, color: '#431407' }}>
                {language === 'GU'
                  ? 'દુકાન / શોરૂમ છે?'
                  : language === 'HI'
                  ? 'दुकान / शोरूम है?'
                  : 'Own a Shop / Store?'}
              </div>
              <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#c2410c', marginTop: '2px' }}>
                {language === 'GU'
                  ? 'દુકાન રજીસ્ટર કરો →'
                  : language === 'HI'
                  ? 'दुकान रजिस्टर करें →'
                  : 'Register Shop →'}
              </div>
            </div>
          </button>

          {/* Free Service Expert Registration Banner */}
          <button
            type="button"
            onClick={onOpenFreeHelperRegister}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Wrench className="w-3.5 h-3.5" />
            </div>
            <div style={{ minWidth: 0, flex: 1, lineHeight: 1.15 }}>
              <div style={{ fontSize: '10px', fontWeight: 900, color: '#064e3b' }}>
                {language === 'GU'
                  ? 'કારીગર / એક્સપર્ટ છો?'
                  : language === 'HI'
                  ? 'कारीगर / एक्सपर्ट हैं?'
                  : 'Are You a Service Expert?'}
              </div>
              <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#047857', marginTop: '2px' }}>
                {language === 'GU'
                  ? 'ફ્રી પ્રોફાઇલ બનાવો →'
                  : language === 'HI'
                  ? 'फ्री प्रोफ़ाइल बनाएं →'
                  : 'Create Free Profile →'}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* 5. Compact Two Side-by-Side Job Portal Banners */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '8px',
          width: '100%',
        }}
      >
        {/* Job Seeker Compact Button */}
        <button
          type="button"
          onClick={onOpenJobSeeker}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '12px',
            backgroundColor: '#eef2ff',
            border: '1px solid #c7d2fe',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Briefcase className="w-3.5 h-3.5" />
          </div>
          <div style={{ minWidth: 0, flex: 1, lineHeight: 1.15 }}>
            <div style={{ fontSize: '10px', fontWeight: 900, color: '#1e1b4b' }}>
              {language === 'GU'
                ? 'નોકરી શોધી રહ્યા છો?'
                : language === 'HI'
                ? 'नौकरी ढूंढ रहे हैं?'
                : 'Looking for a Job?'}
            </div>
            <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#4338ca', marginTop: '2px' }}>
              {language === 'GU'
                ? 'પ્રોફાઇલ રજીસ્ટર કરો →'
                : language === 'HI'
                ? 'प्रोफ़ाइल रजिस्टर करें →'
                : 'Register Profile →'}
            </div>
          </div>
        </button>

        {/* Employer / Hire Staff Compact Button */}
        <button
          type="button"
          onClick={onOpenJobEmployer}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '12px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#d97706',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <UserPlus className="w-3.5 h-3.5" />
          </div>
          <div style={{ minWidth: 0, flex: 1, lineHeight: 1.15 }}>
            <div style={{ fontSize: '10px', fontWeight: 900, color: '#451a03' }}>
              {language === 'GU'
                ? 'માણસો જોઈએ છે?'
                : language === 'HI'
                ? 'स्टाफ चाहिए?'
                : 'Need Staff / Workers?'}
            </div>
            <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>
              {language === 'GU'
                ? 'નોકરીની જાહેરાત મૂકો →'
                : language === 'HI'
                ? 'जॉब पोस्ट करें →'
                : 'Post a Job →'}
            </div>
          </div>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SERVICE PROVIDER PROFILE MODAL (Opens when clicking a provider card) */}
      {/* ===================================================================== */}
      {selectedProviderProfile &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedProviderProfile(null);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9900,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '440px',
                maxHeight: '88vh',
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                border: '1px solid #dbeafe',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Top Gradient Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #0284c7 100%)',
                  color: '#ffffff',
                  padding: '16px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={selectedProviderProfile.avatar}
                      alt={selectedProviderProfile.nameEn}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        objectFit: 'cover',
                        border: '2px solid #ffffff',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                        flexShrink: 0,
                      }}
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      {selectedProviderProfile.isVerified !== false && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            marginBottom: '4px',
                          }}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {language === 'GU'
                              ? 'વેરિફાઈડ સેવા પ્રદાતા'
                              : language === 'HI'
                              ? 'वेरिफाइड सेवा प्रदाता'
                              : 'Verified Service Provider'}
                          </span>
                        </div>
                      )}
                      <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0 }}>
                        {language === 'GU'
                          ? selectedProviderProfile.nameGu
                          : language === 'HI'
                          ? selectedProviderProfile.nameHi
                          : selectedProviderProfile.nameEn}
                      </h3>
                      <p
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 700,
                          margin: '2px 0 0 0',
                          color: '#dbeafe',
                        }}
                      >
                        {language === 'GU'
                          ? selectedProviderProfile.roleGu
                          : language === 'HI'
                          ? selectedProviderProfile.roleHi
                          : selectedProviderProfile.roleEn}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedProviderProfile(null)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Profile Body */}
              <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                {/* Stats Grid: Rating, Distance, Experience */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '8px',
                    marginBottom: '14px',
                  }}
                >
                  {(() => {
                    const liveAvg =
                      providerReviews.length > 0
                        ? providerReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) /
                          providerReviews.length
                        : Number(selectedProviderProfile.rating || 0);
                    const liveCnt =
                      providerReviews.length > 0
                        ? providerReviews.length
                        : Number(selectedProviderProfile.reviews || 0);
                    const modalRating = getAuthenticRatingInfo(
                      { rating: liveAvg, reviewCount: liveCnt },
                      language
                    );
                    return (
                      <div
                        style={{
                          backgroundColor: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '12px',
                          padding: '8px',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 900,
                            color: '#b45309',
                          }}
                        >
                          ★ {modalRating.ratingText}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#78350f' }}>
                          {modalRating.reviewCount}{' '}
                          {language === 'GU' ? 'રિવ્યૂ' : language === 'HI' ? 'रिव्यू' : 'Reviews'}
                        </div>
                      </div>
                    );
                  })()}

                  <div
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '12px',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 900,
                        color: '#15803d',
                      }}
                    >
                      📍 {selectedProviderProfile.distance}{' '}
                      {language === 'GU' ? 'કિ.મી.' : language === 'HI' ? 'कि.मी.' : 'km'}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534' }}>
                      {language === 'GU'
                        ? 'તમારી નજીક'
                        : language === 'HI'
                        ? 'आपके पास'
                        : 'Near You'}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '12px',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 900,
                        color: '#1d4ed8',
                      }}
                    >
                      <Award className="w-3.5 h-3.5 inline mr-0.5" />
                      {language === 'GU'
                        ? selectedProviderProfile.experienceGu || '6+ વર્ષ'
                        : language === 'HI'
                        ? selectedProviderProfile.experienceHi || '6+ वर्ष'
                        : selectedProviderProfile.experienceEn || '6+ Yrs'}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#1e40af' }}>
                      {language === 'GU' ? 'અનુભવ' : language === 'HI' ? 'अनुभव' : 'Experience'}
                    </div>
                  </div>
                </div>

                {/* Location & Availability */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#334155',
                    }}
                  >
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {language === 'GU'
                        ? selectedProviderProfile.areaGu || 'ગાંધીનગર / અમદાવાદ'
                        : language === 'HI'
                        ? selectedProviderProfile.areaHi || 'गांधीनगर / अहमदाबाद'
                        : selectedProviderProfile.areaEn || 'Gandhinagar / Ahmedabad'}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#059669',
                    }}
                  >
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {language === 'GU'
                        ? 'સવારે 8:00 થી રાત્રે 9:00 સુધી ઉપલબ્ધ (100% કોઈ કમિશન નહીં)'
                        : language === 'HI'
                        ? 'सुबह 8:00 से रात 9:00 तक उपलब्ध (100% कोई कमीशन नहीं)'
                        : 'Available 8:00 AM – 9:00 PM (0% Commission)'}
                    </span>
                  </div>
                </div>

                {/* About Service */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 900,
                      color: '#64748b',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {language === 'GU'
                      ? 'સેવા અને કામની વિગત'
                      : language === 'HI'
                      ? 'सेवा और काम का विवरण'
                      : 'About Services & Skills'}
                  </div>
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: '#1e293b',
                      margin: 0,
                      lineHeight: 1.45,
                      fontWeight: 500,
                    }}
                  >
                    {language === 'GU'
                      ? selectedProviderProfile.aboutGu
                      : language === 'HI'
                      ? selectedProviderProfile.aboutHi
                      : selectedProviderProfile.aboutEn}
                  </p>
                </div>

                {/* Action Buttons: Call Now, Direct Chat, Favorite */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '8px',
                    marginBottom: '10px',
                  }}
                >
                  <a
                    href={`tel:${selectedProviderProfile.phone || '9876543210'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '11px 12px',
                      borderRadius: '12px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 900,
                      textDecoration: 'none',
                    }}
                  >
                    <Phone className="w-4 h-4 fill-white" />
                    <span>
                      {language === 'GU'
                        ? 'ડાયરેક્ટ કોલ કરો'
                        : language === 'HI'
                        ? 'डायरेक्ट कॉल करें'
                        : 'Call Now'}
                    </span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const prov = selectedProviderProfile;
                      setSelectedProviderProfile(null);
                      const provTargetId = prov.userId || prov.id;
                      const provPhoneDigits = String(prov.phone || '').replace(/\D/g, '').slice(-10);
                      const provEmail = prov.email || (provPhoneDigits ? `${provPhoneDigits}@phone.locohelp.com` : '');
                      onOpenDirectChat({
                        id: `provider_chat_${prov.id}`,
                        authorId: provTargetId,
                        authorEmail: provEmail,
                        authorPhone: prov.phone || '',
                        phone: prov.phone || '',
                        authorName:
                          language === 'GU'
                            ? prov.nameGu
                            : language === 'HI'
                            ? prov.nameHi
                            : prov.nameEn,
                        providerHelperId: prov.id,
                        receiverId: provTargetId,
                        isDirectProviderChat: true,
                        isViewerPostOwner: false,
                        description:
                          language === 'GU'
                            ? `${prov.nameGu} (${prov.roleGu}) સાથે સીધી વાતચીત`
                            : `${prov.nameEn} (${prov.roleEn}) Direct Inquiry`,
                        category: prov.categoryKey,
                        location: prov.areaEn || 'Local Area',
                        distance: Number(prov.distance) || 1.2,
                        status: 'active',
                        createdAt: new Date().toISOString(),
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '11px 12px',
                      borderRadius: '12px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {language === 'GU'
                        ? '💬 મેસેજ કરો (Chat)'
                        : language === 'HI'
                        ? '💬 चैट करें (Chat)'
                        : '💬 Direct Chat'}
                    </span>
                  </button>
                </div>

                {/* Save to Favorites & View All in Category */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '8px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleFavoriteProvider(selectedProviderProfile)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 10px',
                      borderRadius: '12px',
                      backgroundColor: favoriteIds.includes(selectedProviderProfile.id)
                        ? '#ffe4e6'
                        : '#f8fafc',
                      border: favoriteIds.includes(selectedProviderProfile.id)
                        ? '1px solid #fda4af'
                        : '1px solid #cbd5e1',
                      color: favoriteIds.includes(selectedProviderProfile.id)
                        ? '#be123c'
                        : '#334155',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        favoriteIds.includes(selectedProviderProfile.id) ? 'fill-rose-600' : ''
                      }`}
                    />
                    <span>
                      {favoriteIds.includes(selectedProviderProfile.id)
                        ? language === 'GU'
                          ? 'પસંદીદામાં સેવ છે'
                          : language === 'HI'
                          ? 'पसंदीदा में सेव है'
                          : 'Saved in Favorites'
                        : language === 'GU'
                        ? 'પસંદીદામાં સેવ કરો'
                        : language === 'HI'
                        ? 'पसंदीदा में सेव करें'
                        : 'Save to Favorites'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const catKey = selectedProviderProfile.categoryKey;
                      setSelectedProviderProfile(null);
                      handleOpenCategoryOrHelpers(catKey);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '9px 10px',
                      borderRadius: '12px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#1e293b',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <span>
                      {language === 'GU'
                        ? 'બધા કારીગરો જુઓ →'
                        : language === 'HI'
                        ? 'सभी कारीगर देखें →'
                        : 'All Providers →'}
                    </span>
                  </button>
                </div>

                {/* Customer Star Rating & Review Section (PostgreSQL Backed) */}
                <div
                  style={{
                    marginTop: '14px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '12px',
                    padding: '10px 12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 900,
                      color: '#92400e',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      ⭐{' '}
                      {language === 'GU'
                        ? 'ગ્રાહક રેટિંગ અને રિવ્યુ આપો'
                        : language === 'HI'
                        ? 'ग्राहक रेटिंग और रिव्यू दें'
                        : 'Rate & Review Service Expert'}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#b45309' }}>
                      {providerReviews.length > 0
                        ? `${providerReviews.length} Reviews`
                        : `${selectedProviderProfile.reviews} Reviews`}
                    </span>
                  </div>

                  {/* Interactive 1-5 Star Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= reviewRating
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#78350f' }}>
                      {reviewRating} / 5 Stars
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder={
                        language === 'GU'
                          ? 'કારીગરના કામ વિશે તમારો અભિપ્રાય લખો...'
                          : language === 'HI'
                          ? 'कारीगर के काम के बारे में अपना अनुभव लिखें...'
                          : 'Write your review about their work...'
                      }
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: '1px solid #fcd34d',
                        fontSize: '11.5px',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                      }}
                    />
                    <button
                      type="button"
                      disabled={isSubmittingReview}
                      onClick={async () => {
                        if (!selectedProviderProfile) return;
                        setIsSubmittingReview(true);
                        const res = await submitHelperReview(selectedProviderProfile.id, {
                          rating: reviewRating,
                          comment: reviewComment.trim() || `${reviewRating} Star Service`,
                          helperName: selectedProviderProfile.nameEn,
                        });
                        setIsSubmittingReview(false);
                        if (res.success) {
                          setReviewComment('');
                          if (res.reviews) setProviderReviews(res.reviews);
                          else if (res.review) setProviderReviews((prev) => [res.review!, ...prev]);
                          if (res.rating) {
                            setSelectedProviderProfile((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    rating: Number(res.rating).toFixed(1),
                                    reviews: Number(res.reviewCount || prev.reviews + 1),
                                  }
                                : null
                            );
                          }
                          if (showToast) {
                            showToast(
                              language === 'GU'
                                ? '⭐ તમારો રિવ્યુ સફળતાપૂર્વક સેવ થઈ ગયો!'
                                : language === 'HI'
                                ? '⭐ आपका रिव्यू सफलतापूर्वक सेव हो गया!'
                                : '⭐ Thank you! Your review has been saved.'
                            );
                          }
                        } else if (showToast) {
                          showToast(
                            res.error ||
                              (language === 'GU'
                                ? 'રિવ્યુ આપવા માટે પહેલા લોગિન કરો'
                                : language === 'HI'
                                ? 'रिव्यू देने के लिए कृपया लॉगिन करें'
                                : 'Please sign in to submit a review')
                          );
                        }
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#d97706',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 900,
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isSubmittingReview
                        ? '...'
                        : language === 'GU'
                        ? 'રિવ્યુ મોકલો'
                        : language === 'HI'
                        ? 'रिव्यू भेजें'
                        : 'Submit'}
                    </button>
                  </div>

                  {providerReviews.length > 0 && (
                    <div
                      style={{
                        marginTop: '8px',
                        maxHeight: '110px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                      }}
                    >
                      {providerReviews.slice(0, 5).map((rev) => (
                        <div
                          key={rev.id}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #fef3c7',
                            borderRadius: '8px',
                            padding: '6px 8px',
                            fontSize: '11px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                            <span style={{ color: '#0f172a' }}>{rev.reviewerName || 'Customer'}</span>
                            <span style={{ color: '#d97706' }}>{'★'.repeat(Math.round(rev.rating || 5))}</span>
                          </div>
                          {rev.comment && (
                            <div style={{ color: '#475569', marginTop: '2px' }}>{rev.comment}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Promote Your Business / Advertisement Request Form Modal */}
      {showPromoteModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setShowPromoteModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '430px',
                maxHeight: '90vh',
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #86efac',
                boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.28)',
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  padding: '14px 16px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Megaphone className="w-5 h-5 text-lime-200" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900 }}>
                      {language === 'GU'
                        ? 'તમારા વ્યવસાયની જાહેરાત આપો'
                        : language === 'HI'
                        ? 'अपने व्यवसाय का विज्ञापन दें'
                        : 'Promote Your Business Ad'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '11px', color: '#dcfce7' }}>
                      {language === 'GU'
                        ? 'ફોર્મ ભરો — એડમિન તપાસીને તમારી જાહેરાત લાઈવ કરશે'
                        : language === 'HI'
                        ? 'फॉर्म भरें — एडमिन जांच कर आपका विज्ञापन लाइव करेंगे'
                        : 'Submit ad details — Admin will review & publish your banner'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!adForm.businessName.trim() || !adForm.phone.trim()) {
                    if (showToast) {
                      showToast(
                        language === 'GU'
                          ? 'કૃપા કરી વ્યવસાયનું નામ અને મોબાઇલ નંબર લખો'
                          : language === 'HI'
                          ? 'कृपया व्यवसाय का नाम और मोबाइल नंबर लिखें'
                          : 'Please enter Business Name and Mobile Number'
                      );
                    }
                    return;
                  }
                  setIsSubmittingAd(true);
                  const saved = await saveAdBannerOnServer({
                    businessName: adForm.businessName.trim(),
                    contactPerson: adForm.contactPerson.trim(),
                    phone: adForm.phone.trim(),
                    ownerEmail: adForm.ownerEmail.trim(),
                    area: adForm.area.trim() || selectedCityName || 'Gandhinagar',
                    adPlan: adForm.adPlan,
                    durationDays: adForm.durationDays,
                    offerTitle:
                      adForm.offerTitle.trim() || `${adForm.businessName.trim()} - Special Offer`,
                    description: adForm.description.trim(),
                    photoUrl: adForm.photoUrl.trim(),
                  });
                  setIsSubmittingAd(false);
                  if (saved) {
                    setShowPromoteModal(false);
                    setAdForm({
                      businessName: '',
                      contactPerson: '',
                      phone: '',
                      ownerEmail: '',
                      area: '',
                      adPlan: 'Home Top / Middle Banner Ad',
                      durationDays: '30 Days',
                      offerTitle: '',
                      description: '',
                      photoUrl: '',
                    });
                    if (showToast) {
                      showToast(
                        language === 'GU'
                          ? '✅ તમારી જાહેરાતની અરજી એડમિન પાસે પહોંચી ગઈ છે!'
                          : language === 'HI'
                          ? '✅ आपके विज्ञापन का फॉर्म एडमिन के पास भेज दिया गया है!'
                          : '✅ Your Business Ad request has been sent to Admin!'
                      );
                    }
                  } else if (showToast) {
                    showToast('Failed to submit ad request. Please try again.');
                  }
                }}
                style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '3px' }}>
                    {language === 'GU' ? 'દુકાન / વ્યવસાયનું નામ *' : language === 'HI' ? 'दुकान / व्यवसाय का नाम *' : 'Business / Shop Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={adForm.businessName}
                    onChange={(e) => setAdForm({ ...adForm, businessName: e.target.value })}
                    placeholder="Ex. Gayatri Electronics & RO Care"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      {language === 'GU' ? 'તમારું નામ' : language === 'HI' ? 'आपका नाम' : 'Contact Person Name'}
                    </label>
                    <input
                      type="text"
                      value={adForm.contactPerson}
                      onChange={(e) => setAdForm({ ...adForm, contactPerson: e.target.value })}
                      placeholder="Your Name"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      {language === 'GU' ? 'મોબાઇલ નંબર *' : language === 'HI' ? 'मोबाइल नंबर *' : 'Mobile Number *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={adForm.phone}
                      onChange={(e) => setAdForm({ ...adForm, phone: e.target.value })}
                      placeholder="10-digit Mobile"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      {language === 'GU' ? 'શહેર / વિસ્તાર *' : language === 'HI' ? 'शहर / क्षेत्र *' : 'City / Area *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={adForm.area}
                      onChange={(e) => setAdForm({ ...adForm, area: e.target.value })}
                      placeholder="Ex. Kudasan, Gandhinagar"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      {language === 'GU' ? 'ઈમેલ (Optional)' : language === 'HI' ? 'ईमेल (Optional)' : 'Email ID (Optional)'}
                    </label>
                    <input
                      type="email"
                      value={adForm.ownerEmail}
                      onChange={(e) => setAdForm({ ...adForm, ownerEmail: e.target.value })}
                      placeholder="you@example.com"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      {language === 'GU' ? 'જાહેરાતનો પ્રકાર' : language === 'HI' ? 'विज्ञापन का प्रकार' : 'Ad Placement Type'}
                    </label>
                    <select
                      value={adForm.adPlan}
                      onChange={(e) => setAdForm({ ...adForm, adPlan: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
                    >
                      <option value="Home Top / Middle Banner Ad">Home Page Banner Ad</option>
                      <option value="Category Page Spotlight Ad">Category Spotlight Ad</option>
                      <option value="Featured Partner Offer Card">Featured Partner Offer</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      {language === 'GU' ? 'કેટલા સમય માટે?' : language === 'HI' ? 'कितने समय के लिए?' : 'Ad Duration'}
                    </label>
                    <select
                      value={adForm.durationDays}
                      onChange={(e) => setAdForm({ ...adForm, durationDays: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
                    >
                      <option value="7 Days">7 Days</option>
                      <option value="15 Days">15 Days</option>
                      <option value="30 Days (1 Month)">30 Days (1 Month)</option>
                      <option value="90 Days (3 Months)">90 Days (3 Months)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '3px' }}>
                    {language === 'GU' ? 'જાહેરાતનું શીર્ષક / ઓફર *' : language === 'HI' ? 'विज्ञापन का शीर्षक / ऑफर *' : 'Ad Offer Title / Headline *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={adForm.offerTitle}
                    onChange={(e) => setAdForm({ ...adForm, offerTitle: e.target.value })}
                    placeholder="Ex. Flat 20% Off on AC Servicing & Gas Refill"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '3px' }}>
                    {language === 'GU' ? 'જાહેરાતની સંપૂર્ણ વિગત (કેવી જાહેરાત આપવી છે?)' : language === 'HI' ? 'विज्ञापन का पूरा विवरण (कैसा विज्ञापन देना चाहते हैं?)' : 'Full Ad Details / Requirements'}
                  </label>
                  <textarea
                    rows={3}
                    value={adForm.description}
                    onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                    placeholder="Write complete details about your business, offer, and how you want your ad displayed..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={isSubmittingAd}
                    style={{
                      flex: 1,
                      padding: '11px',
                      borderRadius: '12px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {isSubmittingAd
                      ? 'Submitting...'
                      : language === 'GU'
                      ? '🚀 જાહેરાત ફોર્મ સબમિટ કરો'
                      : language === 'HI'
                      ? '🚀 विज्ञापन फॉर्म सबमिट करें'
                      : '🚀 Submit Ad Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default HomeBelowCategorySection;

