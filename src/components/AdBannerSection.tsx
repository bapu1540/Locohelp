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

  // Combine the Permanent Locked LocoHelp Official Banner + all added advertisements
  const allScrollableBanners = React.useMemo(() => {
    const customAds = (ads || []).filter(
      a => a && a.id && a.id !== PERMANENT_LOCOHELP_PROMO_AD.id
    );
    return [PERMANENT_LOCOHELP_PROMO_AD, ...customAds];
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

  // Auto-scroll one after another every 3.8 seconds
  useEffect(() => {
    if (!isAutoPlaying || allScrollableBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIdx = (prev + 1) % allScrollableBanners.length;
        scrollToSlide(nextIdx);
        return nextIdx;
      });
    }, 3800);
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
      className="space-y-2 select-none"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      onTouchStart={() => setIsAutoPlaying(false)}
      onTouchEnd={() => setTimeout(() => setIsAutoPlaying(true), 4000)}
    >
      {/* Header with Title, Badge & Scroll Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            {text.sectionTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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
        className="flex items-stretch gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide pb-1"
      >
        {allScrollableBanners.map((adItem) => {
          // 1. PERMANENT LOCKED LOCOHELP OFFICIAL ADVERTISEMENT BANNER (Strict 16:9 Aspect Ratio)
          if (adItem.isPermanentOfficialBanner) {
            const bannerImg = adItem.photoUrl || '/assets/aistudio/advertisement_30c9824f.png';
            return (
              <div
                key={adItem.id}
                data-ad-slide="true"
                onClick={onOpenPostAd}
                className="w-full shrink-0 snap-center relative aspect-video bg-slate-900 border-2 border-amber-400/80 rounded-3xl shadow-lg overflow-hidden cursor-pointer group flex items-center justify-center"
                title="Click to post your advertisement here"
              >
                <img
                  src={bannerImg}
                  alt="LocoHelp Official Advertisement Banner"
                  className="w-full h-full object-cover rounded-3xl transition-transform duration-300 group-hover:scale-[1.01]"
                  loading="eager"
                />
              </div>
            );
          }

          // 2. USER / ADMIN ADDED ADVERTISEMENT BANNERS (Scroll one after another)
          return (
            <div
              key={adItem.id}
              data-ad-slide="true"
              onClick={() => setSelectedAdForDetails(adItem)}
              className="w-full shrink-0 snap-center relative bg-white dark:bg-slate-800/95 border-2 border-amber-300/80 dark:border-slate-700 rounded-3xl shadow-md overflow-hidden transition-all hover:shadow-xl hover:border-amber-400 cursor-pointer group flex flex-col justify-between"
              title="Click to view full ad details and offers"
            >
              {/* Top Accent Ribbon */}
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-600" />

              <div className="p-3.5 sm:p-4 space-y-3">
                {/* Top Bar: Sponsored Badge, Shop Name, Logo, Distance & Rating */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-orange-500/20 border border-white/50 dark:border-slate-700 group-hover:scale-105 transition-transform">
                      {adItem.logo || '🏪'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs flex items-center gap-1">
                          <span>★</span>
                          <span>{text.sponsored}</span>
                          <span>•</span>
                          <span>{text.ad}</span>
                        </span>

                        {adItem.isVerified && (
                          <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{text.verifiedMerchant}</span>
                          </span>
                        )}

                        {adItem.destinationUrl && (
                          <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                            <span>{getDestinationBadgeLabel(adItem.destinationUrl)}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate mt-1 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {adItem.businessName}
                      </h3>

                      <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{adItem.area}</span>
                        <span className="shrink-0 font-bold text-indigo-600 dark:text-indigo-400">
                          • {adItem.distance || 0.5} km {text.away}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Rating & Review Counter */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg shadow-2xs">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-black text-amber-900 dark:text-amber-200">{adItem.rating || 5.0}</span>
                    </div>
                  </div>
                </div>

                {/* Product / Shop Photo with Overlay Tag (16:9 Aspect Ratio) */}
                {adItem.photoUrl && (
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-inner group">
                    <img
                      src={adItem.photoUrl}
                      alt={adItem.businessName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1 border border-white/20">
                        <Tag className="w-3 h-3 shrink-0" />
                        <span>{adItem.offerBadge}</span>
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-3 right-3 text-white">
                      <p className="text-xs sm:text-sm font-black drop-shadow-md leading-tight line-clamp-1">
                        {adItem.offerTitle}
                      </p>
                    </div>
                  </div>
                )}

                {/* Offer Description */}
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
                  {adItem.description}
                </p>

                {/* Action Bar */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAdForDetails(adItem);
                    }}
                    className="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0 text-white" />
                    <span className="truncate">{text.inquireNow} • {text.viewDetails}</span>
                  </button>

                  {adItem.destinationUrl && (
                    <button
                      type="button"
                      onClick={(e) => handleRedirect(adItem, e)}
                      className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all cursor-pointer shrink-0 border border-indigo-200 dark:border-indigo-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Link</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* AD DETAILS MODAL                                          */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedAdForDetails && !selectedAdForDetails.isPermanentOfficialBanner && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.96 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-amber-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden"
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
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {selectedAdForDetails.businessName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
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

                {selectedAdForDetails.photoUrl && (
                  <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md">
                    <img
                      src={selectedAdForDetails.photoUrl}
                      alt={selectedAdForDetails.businessName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

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
                  <span>{language === 'EN' ? 'Chat on App Screen' : 'ऐप की चैट स्क्रीन पर बात करें'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
