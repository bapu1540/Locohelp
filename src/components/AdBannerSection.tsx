import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  X,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { Language } from '../types';
import { fetchCategoryImages, getCachedCategoryImages, fetchLiveAds, createAdOnServer } from '../api';

export interface AdBannerItem {
  id: string;
  businessName: string;
  logo: string;
  category: string;
  offerBadge: string;
  offerTitle: string;
  description: string;
  photoUrl: string;
  photos?: string[];
  distance: number;
  area: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  destinationUrl?: string;
  initialMessage?: string;
  createdAt?: string;
  isActive?: boolean;
  isPermanentOfficialBanner?: boolean;
}

export const PERMANENT_LOCOHELP_PROMO_AD: AdBannerItem = {
  id: 'locohelp_official_promo_banner',
  businessName: 'LocoHelp Official Advertisement Space',
  logo: '📢',
  category: 'LocoHelp Official',
  offerBadge: '',
  offerTitle: '',
  description: 'Promote your Shop, Business, Showroom or Special Offers on LocoHelp!',
  photoUrl: '/assets/aistudio/advertisement_30c9824f.png',
  distance: 0.1,
  area: 'All Local Areas',
  rating: 5.0,
  reviewCount: 1000,
  isVerified: true,
  isPermanentOfficialBanner: true
};

export const DEFAULT_ADS: AdBannerItem[] = [];

export interface PromoBannerSlot {
  id: string;
  slotNumber: number;
  imageUrl: string;
  title?: string;
  linkUrl?: string;
}

const LOCALIZED_TEXTS: Record<Language, {
  sectionTitle: string;
  adBadge: string;
  visitLink: string;
  chatNow: string;
}> = {
  EN: {
    sectionTitle: 'Sponsored Local Offers & Advertisements',
    adBadge: 'AD',
    visitLink: 'Visit Link',
    chatNow: 'Inquire Now'
  },
  HI: {
    sectionTitle: 'प्रायोजित लोकल ऑफर्स और विज्ञापन',
    adBadge: 'विज्ञापन',
    visitLink: 'लिंक खोलें',
    chatNow: 'पूछताछ करें'
  },
  GU: {
    sectionTitle: 'પ્રાયોજિત સ્થાનિક ઓફર્સ અને જાહેરાતો',
    adBadge: 'જાહેરાત',
    visitLink: 'લિંક ખોલો',
    chatNow: 'પૂછપરછ કરો'
  }
};

interface AdBannerSectionProps {
  onOpenChat: (intent?: any) => void;
  onOpenPostAd?: () => void;
  categoryImages?: Record<string, string>;
}

export default function AdBannerSection({ onOpenChat, categoryImages: propCategoryImages }: AdBannerSectionProps) {
  const { language } = useLanguage();
  const text = LOCALIZED_TEXTS[language] || LOCALIZED_TEXTS.EN;

  const [localCatImages, setLocalCatImages] = useState<Record<string, string>>(() => getCachedCategoryImages());
  const [liveApprovedAds, setLiveApprovedAds] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  // Ad Inquiry Form Modal State (User submits details only -> Admin prepares & uploads 16:9 banner)
  const [showAdInquiryModal, setShowAdInquiryModal] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [adForm, setAdForm] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    ownerEmail: '',
    area: '',
    adPlan: 'Home Top / Middle Banner Ad',
    durationDays: '30 Days (1 Month)',
    offerTitle: '',
    description: ''
  });

  // Sync category images and approved ads dynamically
  useEffect(() => {
    let isMounted = true;
    const loadImagesAndAds = async () => {
      try {
        const [imgs, adsList] = await Promise.all([
          fetchCategoryImages().catch(() => null),
          fetchLiveAds().catch(() => [])
        ]);
        if (!isMounted) return;
        if (imgs && typeof imgs === 'object') {
          setLocalCatImages(imgs);
        }
        if (Array.isArray(adsList)) {
          setLiveApprovedAds(adsList);
        }
      } catch {}
    };
    loadImagesAndAds();

    const handleSync = () => {
      loadImagesAndAds();
    };

    window.addEventListener('locohelp_category_images_updated', handleSync);
    window.addEventListener('locohelp_ads_updated', handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener('locohelp_category_images_updated', handleSync);
      window.removeEventListener('locohelp_ads_updated', handleSync);
    };
  }, []);

  const mergedImages = React.useMemo(
    () => ({ ...localCatImages, ...(propCategoryImages || {}) }),
    [localCatImages, propCategoryImages]
  );

  // Extract uploaded 16:9 Promo Ad Banners (Slots 1 to 5) + Approved Ads from /api/ads (Max 5 total), with official fallback
  const activePromoBanners: PromoBannerSlot[] = React.useMemo(() => {
    const list: PromoBannerSlot[] = [];
    const seenUrls = new Set<string>();

    // 1. Check 5 Dedicated Admin Slots (__promo_ad_banner_1__ to __promo_ad_banner_5__)
    for (let slot = 1; slot <= 5; slot++) {
      const imgKey = `__promo_ad_banner_${slot}__`;
      const linkKey = `__promo_ad_banner_link_${slot}__`;
      const titleKey = `__promo_ad_banner_title_${slot}__`;
      const imgVal = mergedImages[imgKey];
      if (imgVal && typeof imgVal === 'string' && imgVal.trim() !== '' && imgVal !== '__deleted__') {
        const cleanUrl = imgVal.trim();
        const linkVal = mergedImages[linkKey];
        const titleVal = mergedImages[titleKey];
        seenUrls.add(cleanUrl);
        list.push({
          id: `promo_banner_${slot}`,
          slotNumber: slot,
          imageUrl: cleanUrl,
          title: typeof titleVal === 'string' && titleVal.trim() !== '' && titleVal !== '__deleted__' ? titleVal.trim() : undefined,
          linkUrl: typeof linkVal === 'string' && linkVal.trim() !== '' && linkVal !== '__deleted__' ? linkVal.trim() : undefined
        });
      }
    }

    // 2. Include any active/approved 16:9 ads from Admin Ads list up to 5 banners total
    if (list.length < 5 && Array.isArray(liveApprovedAds)) {
      for (const ad of liveApprovedAds) {
        if (list.length >= 5) break;
        if (!ad || ad.isActive === false || ad.status === 'pending' || ad.status === 'rejected') continue;
        const photosArr = Array.isArray(ad.photos) && ad.photos.length > 0 ? ad.photos : (ad.photoUrl ? [ad.photoUrl] : []);
        for (const pUrl of photosArr) {
          if (list.length >= 5) break;
          const cleanP = String(pUrl || '').trim();
          if (!cleanP || seenUrls.has(cleanP)) continue;
          seenUrls.add(cleanP);
          list.push({
            id: String(ad.id || `ad_${list.length + 1}`),
            slotNumber: list.length + 1,
            imageUrl: cleanP,
            title: ad.offerTitle || ad.businessName || undefined,
            linkUrl: ad.destinationUrl || (ad.phone ? `tel:${ad.phone}` : undefined)
          });
        }
      }
    }

    // 3. Fallback to official LocoHelp promo banner if 0 custom banners exist so section never disappears
    if (list.length === 0) {
      list.push({
        id: PERMANENT_LOCOHELP_PROMO_AD.id,
        slotNumber: 1,
        imageUrl: PERMANENT_LOCOHELP_PROMO_AD.photoUrl
      });
    }

    return list.slice(0, 5);
  }, [mergedImages, liveApprovedAds]);

  // Smoothly scroll container to active slide
  const scrollToSlide = (index: number) => {
    const container = scrollTrackRef.current;
    if (!container) return;
    const slideCards = container.querySelectorAll('[data-ad-slide]');
    const targetCard = slideCards[index] as HTMLElement | undefined;
    if (targetCard) {
      container.scrollTo({
        left: targetCard.offsetLeft - container.offsetLeft,
        behavior: 'smooth'
      });
    }
  };

  // Continuous right-to-left auto-scroll every 3.5 seconds (when 2 or more banners exist)
  useEffect(() => {
    if (!isAutoPlaying || activePromoBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIdx = (prev + 1) % activePromoBanners.length;
        scrollToSlide(nextIdx);
        return nextIdx;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [isAutoPlaying, activePromoBanners.length]);

  useEffect(() => {
    if (currentIndex >= activePromoBanners.length) {
      setCurrentIndex(0);
    }
  }, [activePromoBanners.length, currentIndex]);

  // Update active dot when user manually swipes/scrolls the track
  const handleTrackScroll = () => {
    const container = scrollTrackRef.current;
    if (!container || activePromoBanners.length <= 1) return;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth || 1;
    const approxIndex = Math.round(scrollLeft / width);
    if (approxIndex >= 0 && approxIndex < activePromoBanners.length && approxIndex !== currentIndex) {
      setCurrentIndex(approxIndex);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    const prevIdx = (currentIndex - 1 + activePromoBanners.length) % activePromoBanners.length;
    setCurrentIndex(prevIdx);
    scrollToSlide(prevIdx);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    const nextIdx = (currentIndex + 1) % activePromoBanners.length;
    setCurrentIndex(nextIdx);
    scrollToSlide(nextIdx);
  };

  const handleBannerClick = (banner: PromoBannerSlot) => {
    if (banner.linkUrl) {
      let target = banner.linkUrl.trim();
      if (!/^(https?:\/\/|tel:|mailto:)/i.test(target)) {
        target = 'https://' + target;
      }
      try {
        window.open(target, '_blank', 'noopener,noreferrer');
      } catch {
        window.location.href = target;
      }
      return;
    }

    // Default action if no link: open chat inquiry for this ad
    onOpenChat({
      id: `intent_promo_ad_${banner.slotNumber}`,
      authorId: `promo_admin_slot_${banner.slotNumber}`,
      sellerName: banner.title || `LocoHelp Ad Sponsor #${banner.slotNumber}`,
      authorName: banner.title || `LocoHelp Ad Sponsor #${banner.slotNumber}`,
      description: banner.title || `Inquiry for Sponsored Advertisement Banner #${banner.slotNumber}`,
      tags: ['Advertisement', 'Offer'],
      distance: 0.1,
      status: 'active',
      createdAt: new Date().toISOString()
    });
  };

  const getLinkBadgeLabel = (url?: string) => {
    if (!url) return text.visitLink;
    const lower = url.toLowerCase();
    if (lower.includes('wa.me') || lower.includes('whatsapp.com')) return 'WhatsApp ↗';
    if (lower.includes('instagram.com')) return 'Instagram ↗';
    if (lower.includes('facebook.com')) return 'Facebook ↗';
    if (lower.startsWith('tel:')) return 'Call Now 📞';
    return text.visitLink + ' ↗';
  };

  const handleAdInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryError(null);
    if (!adForm.businessName.trim() || !adForm.phone.trim()) {
      setInquiryError(
        language === 'GU'
          ? 'કૃપા કરી વ્યવસાયનું નામ અને મોબાઇલ નંબર લખો'
          : language === 'HI'
          ? 'कृपया व्यवसाय का नाम और मोबाइल नंबर लिखें'
          : 'Please enter Business Name and Mobile Number'
      );
      return;
    }
    setIsSubmittingInquiry(true);
    try {
      const saved = await createAdOnServer({
        businessName: adForm.businessName.trim(),
        contactPerson: adForm.contactPerson.trim(),
        phone: adForm.phone.trim(),
        ownerEmail: adForm.ownerEmail.trim(),
        area: adForm.area.trim() || 'Local Area',
        adPlan: adForm.adPlan,
        durationDays: adForm.durationDays,
        offerTitle: adForm.offerTitle.trim() || `${adForm.businessName.trim()} - Special Offer`,
        description: adForm.description.trim()
      });
      setIsSubmittingInquiry(false);
      if (saved) {
        setInquirySuccess(true);
        setAdForm({
          businessName: '',
          contactPerson: '',
          phone: '',
          ownerEmail: '',
          area: '',
          adPlan: 'Home Top / Middle Banner Ad',
          durationDays: '30 Days (1 Month)',
          offerTitle: '',
          description: ''
        });
        setTimeout(() => {
          setInquirySuccess(false);
          setShowAdInquiryModal(false);
        }, 1600);
      } else {
        setInquiryError(
          language === 'GU'
            ? 'ફોર્મ સબમિટ કરવામાં ભૂલ થઈ. ફરી પ્રયાસ કરો.'
            : 'Failed to submit ad request. Please try again.'
        );
      }
    } catch {
      setIsSubmittingInquiry(false);
      setInquiryError(
        language === 'GU'
          ? 'ફોર્મ સબમિટ કરવામાં ભૂલ થઈ. ફરી પ્રયાસ કરો.'
          : 'Failed to submit ad request. Please try again.'
      );
    }
  };

  const renderAdvertiseHereButton = () => (
    <div className="flex justify-end px-1 pt-0.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setInquiryError(null);
          setInquirySuccess(false);
          setShowAdInquiryModal(true);
        }}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 border border-amber-300 dark:border-amber-700 text-[10px] sm:text-[11px] font-black text-amber-800 dark:text-amber-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
      >
        <span>
          📢{' '}
          {language === 'GU'
            ? 'તમારી જાહેરાત અહીં આપો'
            : language === 'HI'
            ? 'अपना विज्ञापन यहाँ दें'
            : 'Advertise Here'}
        </span>
      </button>
    </div>
  );

  const renderAdInquiryModal = () => {
    if (!showAdInquiryModal || typeof document === 'undefined') return null;
    return createPortal(
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px'
        }}
        onClick={() => setShowAdInquiryModal(false)}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: '#ffffff',
            borderRadius: '22px',
            border: '2px solid #86efac',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📢</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900 }}>
                  {language === 'GU'
                    ? 'તમારા વ્યવસાયની જાહેરાત આપો'
                    : language === 'HI'
                    ? 'अपने व्यवसाय का विज्ञापन दें'
                    : 'Promote Your Business (Ad Inquiry)'}
                </h3>
                <p style={{ margin: 0, fontSize: '11px', opacity: 0.9 }}>
                  {language === 'GU'
                    ? 'તમારી વિગતો ભરો — એડમિન 16:9 બેનર તૈયાર કરીને અપલોડ કરશે'
                    : language === 'HI'
                    ? 'अपना विवरण भरें — एडमिन 16:9 बैनर तैयार करके अपलोड करेगा'
                    : 'Fill your details — Admin will design & upload your 16:9 ad banner'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAdInquiryModal(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '999px',
                width: '28px',
                height: '28px',
                color: '#fff',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {inquirySuccess ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                {language === 'GU'
                  ? '✅ તમારી જાહેરાતની વિગત એડમિન પાસે પહોંચી ગઈ છે!'
                  : language === 'HI'
                  ? '✅ आपके विज्ञापन का विवरण एडमिन के पास भेज दिया गया है!'
                  : '✅ Your Ad details have been sent to Admin!'}
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                {language === 'GU'
                  ? 'એડમિન તમારી જાહેરાતનું 16:9 બેનર તૈયાર કરીને વેબસાઇટ પર લાઈવ કરશે.'
                  : language === 'HI'
                  ? 'एडमिन आपके विज्ञापन का 16:9 बैनर तैयार करके वेबसाइट पर लाइव करेगा।'
                  : 'Admin will prepare your 16:9 ad banner and publish it live on the website.'}
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleAdInquirySubmit}
              style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}
            >
              {inquiryError && (
                <div style={{ padding: '8px 10px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12px', fontWeight: 700 }}>
                  {inquiryError}
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  {language === 'GU' ? 'દુકાન / વ્યવસાયનું નામ *' : language === 'HI' ? 'दुकान / व्यवसाय का नाम *' : 'Business / Shop Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={adForm.businessName}
                  onChange={(e) => setAdForm({ ...adForm, businessName: e.target.value })}
                  placeholder={language === 'GU' ? 'દા.ત. ગાયત્રી ઇલેક્ટ્રોનિક્સ' : 'Ex. Gayatri Electronics & RO Care'}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px', color: '#0f172a' }}
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
                    placeholder={language === 'GU' ? 'તમારું નામ' : 'Your Name'}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px', color: '#0f172a' }}
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
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px', color: '#0f172a' }}
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
                    placeholder={language === 'GU' ? 'દા.ત. કુડાસણ, ગાંધીનગર' : 'Ex. Kudasan, Gandhinagar'}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px', color: '#0f172a' }}
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
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px', color: '#0f172a' }}
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
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', color: '#0f172a' }}
                  >
                    <option value="Home Top / Middle Banner Ad">Home Page 16:9 Banner Ad</option>
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
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', color: '#0f172a' }}
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
                  placeholder={language === 'GU' ? 'દા.ત. AC સર્વિસ પર 20% ડિસ્કાઉન્ટ' : 'Ex. Flat 20% Off on AC Servicing'}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12.5px', color: '#0f172a' }}
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
                  placeholder={language === 'GU' ? 'તમારા વ્યવસાય અને ઓફર વિશે સંપૂર્ણ વિગત લખો...' : 'Write complete details about your business and offer...'}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={isSubmittingInquiry}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '12px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 900,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmittingInquiry
                    ? 'Submitting...'
                    : language === 'GU'
                    ? '🚀 જાહેરાત ફોર્મ સબમિટ કરો'
                    : language === 'HI'
                    ? '🚀 विज्ञापन फॉर्म सबमिट करें'
                    : '🚀 Submit Ad Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>,
      document.body
    );
  };

  // =========================================================================
  // SCENARIO 1: EXACTLY 1 BANNER UPLOADED (Fixed, 16:9, NO SCROLL)
  // =========================================================================
  if (activePromoBanners.length === 1) {
    const singleBanner = activePromoBanners[0];
    return (
      <div className="space-y-1 select-none w-full max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1 leading-snug break-words">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>{text.sectionTitle}</span>
            </span>
          </div>
        </div>

        {/* Single Fixed 16:9 Banner */}
        <div
          onClick={() => handleBannerClick(singleBanner)}
          className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-lg bg-slate-900 relative group cursor-pointer transition-transform duration-300 hover:shadow-xl"
          title={singleBanner.linkUrl ? `Click to open: ${singleBanner.linkUrl}` : (singleBanner.title || text.sectionTitle)}
        >
          <img
            src={singleBanner.imageUrl}
            alt={singleBanner.title || 'Sponsored Local Offer & Advertisement'}
            className="w-full h-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />

          {singleBanner.title && (
            <div className="absolute bottom-2.5 left-2.5 max-w-[70%] bg-black/75 backdrop-blur-xs text-white text-[11px] font-black px-2.5 py-1 rounded-xl border border-white/20 truncate shadow-md">
              📢 {singleBanner.title}
            </div>
          )}

          {singleBanner.linkUrl && (
            <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-black px-2.5 py-1 rounded-xl border border-white/25 flex items-center gap-1 shadow-md group-hover:scale-105 transition-transform">
              <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>{getLinkBadgeLabel(singleBanner.linkUrl)}</span>
            </div>
          )}
        </div>

        {/* Bottom-right "📢 તમારી જાહેરાત અહીં આપો" button */}
        {renderAdvertiseHereButton()}
        {renderAdInquiryModal()}
      </div>
    );
  }

  // =========================================================================
  // SCENARIO 2: 2 TO 5 BANNERS UPLOADED (Smooth Right-to-Left Auto-Scroll)
  // =========================================================================
  return (
    <div
      className="space-y-1 select-none w-full max-w-4xl mx-auto"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      onTouchStart={() => setIsAutoPlaying(false)}
      onTouchEnd={() => setTimeout(() => setIsAutoPlaying(true), 4000)}
    >
      {/* Header with Title, Active Dots & Scroll Controls */}
      <div className="flex items-center justify-between px-1 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"></span>
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1 leading-snug break-words">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            <span>{text.sectionTitle}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dots Indicator */}
          <div className="flex items-center gap-1 mr-1">
            {activePromoBanners.map((item, idx) => (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAutoPlaying(false);
                  setCurrentIndex(idx);
                  scrollToSlide(idx);
                }}
                className={`transition-all rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? 'w-4 h-1.5 bg-amber-500 dark:bg-amber-400'
                    : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                title={`Banner ${idx + 1}`}
                aria-label={`Go to banner ${idx + 1}`}
              />
            ))}
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
              title="Previous Banner"
              aria-label="Previous Banner"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
              title="Next Banner"
              aria-label="Next Banner"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Auto-Scrolling 16:9 Banner Track (Right to Left continuous flow) */}
      <div
        ref={scrollTrackRef}
        onScroll={handleTrackScroll}
        className="flex items-center gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide pb-0.5"
      >
        {activePromoBanners.map((b, idx) => (
          <div
            key={b.id}
            data-ad-slide="true"
            onClick={() => handleBannerClick(b)}
            className="w-full shrink-0 snap-center relative aspect-video overflow-hidden rounded-2xl bg-slate-900 border-2 border-amber-400/80 shadow-lg flex items-center justify-center cursor-pointer group"
            title={b.linkUrl ? `Click to open: ${b.linkUrl}` : (b.title || `Sponsored Advertisement ${idx + 1}`)}
          >
            <img
              src={b.imageUrl}
              alt={b.title || `Sponsored Advertisement ${idx + 1}`}
              className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.01]"
              loading="lazy"
              decoding="async"
            />

            {b.title && (
              <div className="absolute bottom-2.5 left-2.5 max-w-[68%] bg-black/75 backdrop-blur-xs text-white text-[11px] font-black px-2.5 py-1 rounded-xl border border-white/20 truncate shadow-md">
                📢 {b.title}
              </div>
            )}

            {/* Optional Target Link Overlay Badge */}
            {b.linkUrl && (
              <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-black px-2.5 py-1 rounded-xl border border-white/25 flex items-center gap-1 shadow-md group-hover:scale-105 transition-transform">
                <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>{getLinkBadgeLabel(b.linkUrl)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom-right "📢 તમારી જાહેરાત અહીં આપો" button */}
      {renderAdvertiseHereButton()}
      {renderAdInquiryModal()}
    </div>
  );
}
