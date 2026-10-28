import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Star, 
  ExternalLink,
  Tag,
  X,
  Info,
  Megaphone,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../i18n';
import { Language } from '../types';
import { fetchLiveAds } from '../api';
import LocoHelpLogo from './LocoHelpLogo';

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
  isPermanentOfficialBanner?: boolean;
}

// Permanent, Locked Official LocoHelp Advertisement Banner (Cannot be edited or deleted by anyone)
export const PERMANENT_LOCOHELP_PROMO_AD: AdBannerItem = {
  id: 'locohelp_official_promo_banner',
  businessName: 'LocoHelp Official Advertisement Space',
  logo: '📢',
  category: 'LocoHelp Official • विज्ञापन स्पेस',
  offerBadge: '✨ ADVERTISE HERE • विज्ञापन दें',
  offerTitle: 'आप यहाँ पर अपना विज्ञापन (Advertisement) कर सकते हैं!',
  description: 'Promote your Shop, Business, Showroom or Special Offers on LocoHelp!',
  photoUrl: '/assets/aistudio/advertisement_30c9824f.png',
  distance: 0.1,
  area: 'All Local Areas • www.locohelp.com',
  rating: 5.0,
  reviewCount: 1000,
  isVerified: true,
  isPermanentOfficialBanner: true
};

export const DEFAULT_ADS: AdBannerItem[] = [];

const LOCALIZED_TEXTS: Record<Language, {
  sponsored: string;
  ad: string;
  chatWithSeller: string;
  inquireNow: string;
  viewDetails: string;
  visitStore: string;
  sectionTitle: string;
  sectionSub: string;
  postAdBtn: string;
  verifiedMerchant: string;
  away: string;
  openLink: string;
}> = {
  EN: {
    sponsored: 'SPONSORED',
    ad: 'AD',
    chatWithSeller: 'Chat with Seller',
    inquireNow: 'Inquire Now',
    viewDetails: 'View Details',
    visitStore: 'Visit Website / Store',
    sectionTitle: 'Sponsored Local Offers & Advertisements',
    sectionSub: 'Auto-scrolling local advertisements & offers',
    postAdBtn: '+ Post Your Ad',
    verifiedMerchant: 'Verified Merchant',
    away: 'away',
    openLink: 'Open Link'
  },
  HI: {
    sponsored: 'प्रायोजित',
    ad: 'विज्ञापन',
    chatWithSeller: 'दुकानदार से चैट करें',
    inquireNow: 'पूछताछ करें',
    viewDetails: 'विस्तार से देखें',
    visitStore: 'स्टोर लिंक खोलें',
    sectionTitle: 'प्रायोजित लोकल ऑफर्स और विज्ञापन',
    sectionSub: 'आपके क्षेत्र के ऑटो-स्क्रॉल विज्ञापन और ऑफर्स',
    postAdBtn: '+ अपना विज्ञापन लगाएं',
    verifiedMerchant: 'सत्यापित दुकानदार',
    away: 'दूर',
    openLink: 'लिंक खोलें'
  },
  GU: {
    sponsored: 'પ્રાયોજિત (Ad)',
    ad: 'જાહેરાત',
    chatWithSeller: 'વિક્રેતા સાથે ચેટ કરો',
    inquireNow: 'પૂછપરછ કરો',
    viewDetails: 'વિગત જુઓ',
    visitStore: 'સ્ટોર / લિંક જુઓ',
    sectionTitle: 'પ્રાયોજિત સ્થાનિક ઓફર્સ અને જાહેરાતો',
    sectionSub: 'તમારા વિસ્તારની ઓટો-સ્ક્રોલ જાહેરાતો',
    postAdBtn: '+ તમારી જાહેરાત આપો',
    verifiedMerchant: 'વેરિફાઈડ વેપારી',
    away: 'દૂર',
    openLink: 'લિંક ખોલો'
  }
};

interface AdBannerSectionProps {
  onOpenChat: (intent?: any) => void;
  onOpenPostAd?: () => void;
}

export default function AdBannerSection({ onOpenChat, onOpenPostAd }: AdBannerSectionProps) {
  const { language } = useLanguage();
  const text = LOCALIZED_TEXTS[language] || LOCALIZED_TEXTS.EN;

  const [ads, setAds] = useState<AdBannerItem[]>(() => {
    try {
      const saved = localStorage.getItem('locohelp_ad_banners');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return DEFAULT_ADS;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [selectedAdForDetails, setSelectedAdForDetails] = useState<AdBannerItem | null>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  // Sync ads dynamically from server & localStorage
  useEffect(() => {
    let isMounted = true;
    const loadAds = async () => {
      const live = await fetchLiveAds();
      if (isMounted && Array.isArray(live)) {
        setAds(live.filter(a => a && a.id && a.id !== PERMANENT_LOCOHELP_PROMO_AD.id));
      }
    };
    loadAds();

    const handleAdsUpdated = () => {
      try {
        const saved = localStorage.getItem('locohelp_ad_banners');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setAds(parsed.filter(a => a && a.id && a.id !== PERMANENT_LOCOHELP_PROMO_AD.id));
          }
        }
      } catch (e) {}
      loadAds();
    };

    window.addEventListener('storage', handleAdsUpdated);
    window.addEventListener('locohelp_ads_updated', handleAdsUpdated);

    const pollInterval = setInterval(loadAds, 10000);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleAdsUpdated);
      window.removeEventListener('locohelp_ads_updated', handleAdsUpdated);
    };
  }, []);

  // Combine the Permanent Locked LocoHelp Official Banner + all active advertisements & multi-photo slides
  const allScrollableBanners = React.useMemo(() => {
    const customAds = (ads || []).filter(
      a => a && a.id && a.id !== PERMANENT_LOCOHELP_PROMO_AD.id && a.isActive !== false
    );
    const slides: AdBannerItem[] = [PERMANENT_LOCOHELP_PROMO_AD];
    customAds.forEach(a => {
      const photos = Array.isArray(a.photos) && a.photos.length > 0 ? a.photos : (a.photoUrl ? [a.photoUrl] : []);
      if (photos.length <= 1) {
        slides.push(a);
      } else {
        photos.forEach((pUrl, pIdx) => {
          slides.push({
            ...a,
            id: `${a.id}_photo_${pIdx}`,
            photoUrl: pUrl,
            offerBadge: `${a.offerBadge || '🔥 Special Deal'} (📸 ${pIdx + 1}/${photos.length})`
          });
        });
      }
    });
    return slides;
  }, [ads]);

  // Smoothly scroll the horizontal container to the active slide
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

  // Auto-scroll one after another every 3.5 seconds
  useEffect(() => {
    if (!isAutoPlaying || allScrollableBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIdx = (prev + 1) % allScrollableBanners.length;
        scrollToSlide(nextIdx);
        return nextIdx;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [isAutoPlaying, allScrollableBanners.length]);

  // Update active dot when user manually swipes/scrolls the banner track
  const handleTrackScroll = () => {
    const container = scrollTrackRef.current;
    if (!container || allScrollableBanners.length <= 1) return;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth || 1;
    const approxIndex = Math.round(scrollLeft / width);
    if (approxIndex >= 0 && approxIndex < allScrollableBanners.length && approxIndex !== currentIndex) {
      setCurrentIndex(approxIndex);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    const prevIdx = (currentIndex - 1 + allScrollableBanners.length) % allScrollableBanners.length;
    setCurrentIndex(prevIdx);
    scrollToSlide(prevIdx);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    const nextIdx = (currentIndex + 1) % allScrollableBanners.length;
    setCurrentIndex(nextIdx);
    scrollToSlide(nextIdx);
  };

  const handleRedirect = (ad: AdBannerItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const destination = ad.destinationUrl;

    if (!destination || destination.trim() === '') {
      setSelectedAdForDetails(ad);
      return;
    }

    let targetUrl = destination.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      window.location.href = targetUrl;
    }
  };

  const getDestinationBadgeLabel = (url?: string) => {
    if (!url) return text.visitStore;
    const lower = url.toLowerCase();
    if (lower.includes('wa.me') || lower.includes('whatsapp.com')) return 'WhatsApp Chat ↗';
    if (lower.includes('instagram.com')) return 'Instagram Page ↗';
    if (lower.includes('facebook.com')) return 'Facebook Page ↗';
    return text.visitStore + ' ↗';
  };

  return (
    <div
      className="space-y-2 select-none w-full max-w-4xl mx-auto"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      onTouchStart={() => setIsAutoPlaying(false)}
      onTouchEnd={() => setTimeout(() => setIsAutoPlaying(true), 4000)}
    >
      {/* Header with Title, Badge & Scroll Controls */}
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
            {allScrollableBanners.map((item, idx) => (
              <button
                key={item.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAutoPlaying(false);
                  setCurrentIndex(idx);
                  scrollToSlide(idx);
                }}
                className={`transition-all rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? 'w-4 h-1.5 bg-indigo-600 dark:bg-indigo-400'
                    : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                title={`Slide ${idx + 1}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {allScrollableBanners.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Previous Banner"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Next Banner"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Auto-Scrolling & Swipeable Advertisement Track */}
      <div
        ref={scrollTrackRef}
        onScroll={handleTrackScroll}
        className="flex items-center gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide pb-1"
      >
        {allScrollableBanners.map((adItem) => {
          // 1. PERMANENT LOCKED LOCOHELP OFFICIAL ADVERTISEMENT BANNER (Strict 16:9 Aspect Ratio, Read-Only Display)
          if (adItem.isPermanentOfficialBanner) {
            const bannerImg = adItem.photoUrl || '/assets/aistudio/advertisement_30c9824f.png';
            return (
              <div
                key={adItem.id}
                data-ad-slide="true"
                className="w-full shrink-0 snap-center relative aspect-video overflow-hidden rounded-xl bg-slate-900 border-2 border-amber-400/80 shadow-lg flex items-center justify-center"
              >
                <img
                  src={bannerImg}
                  alt="LocoHelp Official Advertisement Banner"
                  className="w-full h-full object-contain sm:object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            );
          }

          // 2. USER / ADMIN ADDED ADVERTISEMENT BANNERS (Displayed in the exact same clean 16:9 full-photo banner layout as the main banner)
          const activeSlidePhoto =
            adItem.photoUrl ||
            (Array.isArray(adItem.photos) && adItem.photos.length > 0 ? adItem.photos[0] : '');

          return (
            <div
              key={adItem.id}
              data-ad-slide="true"
              onClick={() => setSelectedAdForDetails(adItem)}
              className="w-full shrink-0 snap-center relative aspect-video overflow-hidden rounded-xl bg-slate-900 border-2 border-amber-400/80 shadow-lg flex items-center justify-center cursor-pointer group"
              title={adItem.businessName || 'Click to view full ad details'}
            >
              {activeSlidePhoto ? (
                <img
                  src={activeSlidePhoto}
                  alt={adItem.businessName || 'Sponsored Advertisement'}
                  className="w-full h-full object-contain sm:object-cover object-center transition-transform duration-300"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-amber-500 via-orange-500 to-indigo-600 text-white">
                  <span className="text-3xl mb-1">{adItem.logo || '🏪'}</span>
                  <h3 className="text-base sm:text-lg font-black line-clamp-2">{adItem.businessName}</h3>
                  {adItem.offerTitle && (
                    <p className="text-xs sm:text-sm font-bold text-amber-100 mt-1 line-clamp-2">{adItem.offerTitle}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* AD DETAILS MODAL                                          */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedAdForDetails && !selectedAdForDetails.isPermanentOfficialBanner && (
          <div
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.96 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-amber-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/60 dark:bg-slate-850">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white">
                      ★ {text.sponsored}
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {selectedAdForDetails.category}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAdForDetails(null)}
                  className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-5 space-y-4 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                      {selectedAdForDetails.logo}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-snug break-words">
                        {selectedAdForDetails.businessName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {selectedAdForDetails.isVerified && (
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{text.verifiedMerchant}</span>
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{selectedAdForDetails.area}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {(() => {
                  const modalGallery = Array.isArray(selectedAdForDetails.photos) && selectedAdForDetails.photos.length > 0
                    ? selectedAdForDetails.photos
                    : (selectedAdForDetails.photoUrl ? [selectedAdForDetails.photoUrl] : []);
                  if (!modalGallery.length) return null;

                  if (modalGallery.length === 1) {
                    return (
                      <div className="w-full aspect-video overflow-hidden rounded-xl bg-gray-900/5 relative border border-slate-200 dark:border-slate-700 shadow-md">
                        <img
                          src={modalGallery[0]}
                          alt={selectedAdForDetails.businessName}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover object-center"
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-xl pb-1">
                      {modalGallery.map((mUrl, mIdx) => (
                        <div
                          key={mIdx}
                          className="min-w-[85%] sm:min-w-[75%] snap-start w-full aspect-video overflow-hidden rounded-xl bg-gray-900/5 relative border-2 border-amber-300 dark:border-slate-700 shadow-md shrink-0"
                        >
                          <img
                            src={mUrl}
                            alt={`${selectedAdForDetails.businessName} ${mIdx + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover object-center"
                          />
                          <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-white/20">
                            Photo {mIdx + 1} of {modalGallery.length}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700 rounded-2xl p-4 space-y-2">
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                    {selectedAdForDetails.offerTitle}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedAdForDetails.description}
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-center">
                <button
                  onClick={() => {
                    onOpenChat({
                      id: 'intent_ad_' + selectedAdForDetails.id,
                      authorId: selectedAdForDetails.id,
                      sellerName: selectedAdForDetails.businessName,
                      authorName: selectedAdForDetails.businessName,
                      description: `Inquiring for "${selectedAdForDetails.businessName}" (${selectedAdForDetails.offerTitle})`,
                      tags: [selectedAdForDetails.category],
                      distance: selectedAdForDetails.distance,
                      status: 'active',
                      createdAt: new Date().toISOString()
                    });
                    setSelectedAdForDetails(null);
                  }}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4.5 h-4.5" />
                  <span>{language === 'EN' ? 'Chat on App Screen' : language === 'GU' ? 'એપની ચેટ સ્ક્રીન પર વાત કરો' : 'ऐप की चैट स्क्रीन पर बात करें'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
