import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Star, 
  Store, 
  PlusCircle, 
  ExternalLink,
  Tag,
  Globe,
  Share2,
  X,
  Phone,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../i18n';
import { Language } from '../types';
import { fetchLiveAds } from '../api';

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
}

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
    sectionTitle: 'Sponsored Local Offers & Banners',
    sectionSub: 'Exclusive verified deals from top neighborhood shops',
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
    sectionSub: 'आपके क्षेत्र की सत्यापित दुकानों के खास ऑफर्स',
    postAdBtn: '+ अपना विज्ञापन लगाएं',
    verifiedMerchant: 'सत्यापित दुकानदार',
    away: 'दूर',
    openLink: 'लिंक खोलें'
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
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_ADS;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [selectedAdForDetails, setSelectedAdForDetails] = useState<AdBannerItem | null>(null);

  // Sync ads dynamically from server
  useEffect(() => {
    let isMounted = true;
    const loadAds = async () => {
      const live = await fetchLiveAds();
      if (isMounted && live && live.length > 0) {
        setAds(live);
      }
    };
    loadAds();

    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('locohelp_ad_banners');
        if (saved) setAds(JSON.parse(saved));
      } catch (e) {}
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Auto carousel rotation every 5.5 seconds
  useEffect(() => {
    if (!isAutoPlaying || ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isAutoPlaying, ads.length]);

  // Local Proximity Priority Filtering: Sort & filter ads so nearby local ads (< 3 km) appear first
  const localFilteredAds = React.useMemo(() => {
    if (!ads || ads.length === 0) return DEFAULT_ADS;
    // Prioritize ads with shorter distance (closest local merchants first)
    return [...ads].sort((a, b) => (a.distance || 0.5) - (b.distance || 0.5));
  }, [ads]);

  if (!localFilteredAds || localFilteredAds.length === 0) return null;

  const currentAd = localFilteredAds[currentIndex % localFilteredAds.length];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const handleRedirect = (e?: React.MouseEvent, customUrl?: string) => {
    if (e) e.stopPropagation();
    const destination = customUrl || currentAd.destinationUrl;

    if (!destination || destination.trim() === '') {
      setSelectedAdForDetails(currentAd);
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

  const handleOpenChatForAd = (ad: AdBannerItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAdForDetails(null);

    const adIntentObject = {
      id: 'ad_chat_' + ad.id,
      authorId: 'ad_' + ad.id,
      sellerName: ad.businessName,
      authorName: ad.businessName,
      badge: `${text.verifiedMerchant} • ${ad.category}`,
      description: `Inquiry: ${ad.businessName} - ${ad.offerTitle}`,
      tags: ['SponsoredAd', ad.category, 'SpecialOffer'],
      distance: ad.distance,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      initialMessage: ad.initialMessage || `Namaste! ${ad.businessName} me aapka swagat hai. Ad offer "${ad.offerBadge}" ke baare me aap kya jaanna chahte hain?`
    };

    onOpenChat(adIntentObject);
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
    >
      {/* Header with Title, Badge & Navigation */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            {text.sectionTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenPostAd && (
            <button
              onClick={onOpenPostAd}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline px-1.5 py-0.5 rounded transition-all cursor-pointer"
              title="Advertise your local shop here"
            >
              {text.postAdBtn}
            </button>
          )}

          {/* Dots Indicator */}
          <div className="flex items-center gap-1 ml-1">
            {ads.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAutoPlaying(false);
                  setCurrentIndex(idx);
                }}
                className={`transition-all rounded-full cursor-pointer ${
                  idx === currentIndex 
                    ? 'w-4 h-1.5 bg-indigo-600 dark:bg-indigo-400' 
                    : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                title={`Ad ${idx + 1}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Clickable Ad Card Container - Clicking opens full Details Page */}
      <div 
        onClick={() => setSelectedAdForDetails(currentAd)}
        className="relative bg-white dark:bg-slate-800/95 border-2 border-amber-300/80 dark:border-slate-700 rounded-3xl shadow-md overflow-hidden transition-all hover:shadow-xl hover:border-amber-400 cursor-pointer group"
        title="Click to view full ad details and offers"
      >
        {/* Top Accent Ribbon */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-600"></div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentAd.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="p-3.5 sm:p-4 space-y-3"
          >
            {/* Top Bar: Sponsored Badge, Shop Name, Logo, Distance & Rating */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Shop Logo */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-orange-500/20 border border-white/50 dark:border-slate-700 group-hover:scale-105 transition-transform">
                  {currentAd.logo}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Clear "SPONSORED • AD" Badge */}
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs flex items-center gap-1">
                      <span>★</span>
                      <span>{text.sponsored}</span>
                      <span>•</span>
                      <span>{text.ad}</span>
                    </span>

                    {currentAd.isVerified && (
                      <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{text.verifiedMerchant}</span>
                      </span>
                    )}

                    {currentAd.destinationUrl && (
                      <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                        <ExternalLink className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{getDestinationBadgeLabel(currentAd.destinationUrl)}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate mt-1 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {currentAd.businessName}
                  </h3>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">{currentAd.area}</span>
                    <span className="shrink-0 font-bold text-indigo-600 dark:text-indigo-400">
                      • {currentAd.distance} km {text.away}
                    </span>
                  </p>
                </div>
              </div>

              {/* Rating & Review Counter */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg shadow-2xs">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-black text-amber-900 dark:text-amber-200">{currentAd.rating}</span>
                </div>
                <span className="text-[9px] text-slate-400 font-medium">({currentAd.reviewCount} reviews)</span>
              </div>
            </div>

            {/* Product / Shop High-Quality Photo with Overlay Tag */}
            <div className="relative rounded-2xl overflow-hidden aspect-[21/9] sm:aspect-[24/9] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-inner group">
              <img 
                src={currentAd.photoUrl} 
                alt={currentAd.businessName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />

              {/* Gradient Bottom Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>

              {/* Floating Catchy Offer Pill */}
              <div className="absolute top-2.5 left-2.5">
                <span className="bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1 border border-white/20">
                  <Tag className="w-3 h-3 shrink-0" />
                  <span>{currentAd.offerBadge}</span>
                </span>
              </div>

              {/* View Details Indicator Badge */}
              <div className="absolute top-2.5 right-2.5">
                <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-extrabold px-2 py-1 rounded-xl flex items-center gap-1 border border-white/30 group-hover:bg-indigo-600 transition-colors">
                  <Info className="w-3 h-3 text-amber-400" />
                  <span>{text.viewDetails}</span>
                </span>
              </div>

              {/* Bottom Photo Overlay Text */}
              <div className="absolute bottom-2 left-3 right-3 text-white">
                <p className="text-xs sm:text-sm font-black drop-shadow-md leading-tight line-clamp-1">
                  {currentAd.offerTitle}
                </p>
              </div>
            </div>

            {/* Offer Catchy Description */}
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
              {currentAd.description}
            </p>

            {/* Action Bar: Inquiry (Opens Details Page) + Slide Controls */}
            <div className="flex items-center gap-2 pt-1">
              {/* Inquiry & Details Button (Opens New Ad Details Page/Modal) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAdForDetails(currentAd);
                }}
                className="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer"
                title="View full ad details & inquiry"
              >
                <Info className="w-4 h-4 shrink-0 text-white" />
                <span className="truncate">{text.inquireNow} • {text.viewDetails}</span>
              </button>

              {/* External Destination Button if available */}
              {currentAd.destinationUrl && (
                <button
                  type="button"
                  onClick={(e) => handleRedirect(e)}
                  className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all cursor-pointer shrink-0 border border-indigo-200 dark:border-indigo-800"
                  title="Direct link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Link</span>
                </button>
              )}

              {/* Slide Navigation Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
                  title="Previous Ad"
                  aria-label="Previous Ad"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
                  title="Next Ad"
                  aria-label="Next Ad"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ========================================================= */}
      {/* 2. AD DETAILS MODAL / FULL DETAILS PAGE                   */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedAdForDetails && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.96 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-amber-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
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
                  title="Close details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Details Body */}
              <div className="overflow-y-auto p-5 space-y-4 flex-1">
                {/* Shop / Business Name & Rating Header */}
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

                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl shadow-2xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-black text-amber-900 dark:text-amber-200">{selectedAdForDetails.rating}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">({selectedAdForDetails.reviewCount} reviews)</span>
                  </div>
                </div>

                {/* Big Product / Shop Photo */}
                <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md">
                  <img
                    src={selectedAdForDetails.photoUrl}
                    alt={selectedAdForDetails.businessName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 border border-white/20">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{selectedAdForDetails.offerBadge}</span>
                    </span>
                  </div>
                </div>

                {/* Offer Title & Highlight */}
                <div className="bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700 rounded-2xl p-4 space-y-2">
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                    {selectedAdForDetails.offerTitle}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedAdForDetails.description}
                  </p>
                </div>

                {/* Location & Details Card */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Distance</div>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                      📍 {selectedAdForDetails.distance} km away
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Verification</div>
                    <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> 100% Genuine
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer - Website Chat Screen Only */}
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
