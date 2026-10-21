import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Star, MapPin, MessageSquare, UserCheck, Search, Wrench, ShieldCheck, Store, Plus, Building, Phone, Globe, ExternalLink, CheckCircle2, Mic, Share2, Sparkles, Edit3 } from 'lucide-react';
import { ServiceProvider } from '../types';
import { useLanguage } from '../i18n';
import UserProfileModal from './UserProfileModal';
import { getFreeHelperProfiles } from '../data/categories';
import RegisterShopModal, { RegisteredShop } from '../components/RegisterShopModal';
import FreeHelperRegisterModal from '../components/FreeHelperRegisterModal';
import LoginPromptModal from '../components/LoginPromptModal';
import { isGuestUser } from '../lib/authUtils';
import { getCurrentUser } from '../auth';
import { isEntityOwner } from '../lib/ownership';

export default function SearchDirectoryScreen({ onBack, onOpenChat }: { onBack: () => void, onOpenChat: (intent?: any) => void }) {
  const { language, t } = useLanguage();
  const [activeDirectoryTab, setActiveDirectoryTab] = useState<'shops' | 'helpers'>('shops');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [isRegisterShopOpen, setIsRegisterShopOpen] = useState(false);
  const [isRegisterHelperOpen, setIsRegisterHelperOpen] = useState(false);
  const [shopsList, setShopsList] = useState<RegisteredShop[]>([]);
  const [helpersList, setHelpersList] = useState<ServiceProvider[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  const startVoiceSearch = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } else {
      alert("Voice recognition is not supported in this browser.");
    }
  };

  const handleShareShopToWhatsAppGroup = (shop: RegisteredShop, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareMsg = encodeURIComponent(
      `🏪 *LocoHelp Shop / Business Alert* 🏪\n\n` +
      `🏢 *${shop.name}* (${shop.categoryLabel})\n` +
      `📍 *Area:* ${shop.area} • ${shop.address}\n` +
      `🏷️ *Details / Offer:* ${shop.description}\n\n` +
      `👉 View shop & chat on LocoHelp App:\n${window.location.origin}`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareMsg}`, '_blank');
  };

  // Load ONLY real Admin-approved user-registered shops (Zero dummy accounts)
  const loadShops = async () => {
    try {
      const res = await fetch(`/api/shops?_t=${Date.now()}`);
      let serverShops: RegisteredShop[] = [];
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          serverShops = data.filter((s: any) => !String(s.id || '').startsWith('sample_shop_') && (s.isVerified === true || s.status === 'approved'));
        }
      }
      const stored = localStorage.getItem('locohelp_registered_shops');
      const localShops: RegisteredShop[] = stored ? JSON.parse(stored) : [];
      const approvedLocal = localShops.filter((s: any) => !String(s.id || '').startsWith('sample_shop_') && (s.isVerified === true || s.status === 'approved'));

      const merged = new Map<string, RegisteredShop>();
      [...serverShops, ...approvedLocal].forEach(s => {
        if (s && s.id) merged.set(s.id, s);
      });
      setShopsList(Array.from(merged.values()));
    } catch (e) {
      setShopsList([]);
    }
  };

  // Load ONLY real Admin-approved user-registered helpers (Zero mock providers)
  const loadHelpers = async () => {
    try {
      const res = await fetch(`/api/helpers?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Sync with local storage
          const stored = localStorage.getItem('locohelp_free_helper_profiles');
          const localArr = stored ? JSON.parse(stored) : [];
          const mergedMap = new Map<string, any>();
          localArr.forEach((h: any) => { if (h && h.id) mergedMap.set(h.id, h); });
          data.forEach((h: any) => { if (h && h.id) mergedMap.set(h.id, { ...(mergedMap.get(h.id) || {}), ...h, isVerified: true, status: 'approved' }); });
          localStorage.setItem('locohelp_free_helper_profiles', JSON.stringify(Array.from(mergedMap.values())));
        }
      }
      const userHelpers = getFreeHelperProfiles(false);
      const formattedUserHelpers: ServiceProvider[] = userHelpers.map(h => ({
        id: h.id,
        name: h.name,
        skills: h.skills?.length > 0 ? h.skills : [h.customCategoryName || h.area || 'Community Helper'],
        trustScore: 99,
        rating: h.rating || 5.0,
        completedTasks: h.completedTasks || 1,
        distance: h.distance || 0.8
      }));
      setHelpersList(formattedUserHelpers);
    } catch (e) {
      setHelpersList([]);
    }
  };

  useEffect(() => {
    loadShops();
    loadHelpers();
  }, []);

  // Filtered Shops
  const filteredShops = useMemo(() => {
    if (!searchQuery.trim()) return shopsList;
    const q = searchQuery.toLowerCase();
    return shopsList.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.categoryLabel.toLowerCase().includes(q) || 
      s.area.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  }, [shopsList, searchQuery]);

  // Filtered Helpers
  const filteredHelpers = useMemo(() => {
    if (!searchQuery.trim()) return helpersList;
    const q = searchQuery.toLowerCase();
    return helpersList.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.skills.some(s => s.toLowerCase().includes(q))
    );
  }, [helpersList, searchQuery]);

  const handleShopCallOrChat = (shop: RegisteredShop) => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }
    onOpenChat({
      id: 'intent_shop_' + shop.id,
      authorId: shop.id,
      description: `Inquiring for "${shop.name}" (${shop.categoryLabel || 'Local Business'})`,
      tags: [shop.categoryLabel || 'Shop'],
      distance: 0.5,
      status: 'active',
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#F4F1EA] dark:bg-slate-900 transition-colors">
      
      {/* Top Sticky Header */}
      <div className="px-4 py-3.5 pt-10 sm:pt-4 border-b border-[#DFDBCF] dark:border-slate-800 bg-[#FCFAF5] dark:bg-slate-850 sticky top-0 z-10 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={onBack} 
              className="p-2 -ml-2 hover:bg-[#EAE6DC] dark:hover:bg-slate-800 rounded-full transition-colors text-slate-700 dark:text-pink-400 cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {t('dir.title') || 'Directory & Local Market'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {language === 'EN' ? 'Shops, Showrooms, Malls & Verified Helpers' : 'दुकानें, शोरूम, मॉल व सत्यापित सेवादार'}
              </p>
            </div>
          </div>

          {activeDirectoryTab === 'shops' ? (
            <button
              onClick={() => {
                if (isGuestUser()) {
                  setIsLoginPromptOpen(true);
                  return;
                }
                setIsRegisterShopOpen(true);
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'EN' ? 'Register Shop / Mall' : 'दुकान/मॉल दर्ज करें'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (isGuestUser()) {
                  setIsLoginPromptOpen(true);
                  return;
                }
                setIsRegisterHelperOpen(true);
              }}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'EN' ? 'Register as Helper' : 'हेल्पर दर्ज करें'}</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs: Shops & Malls VS Service Helpers */}
        <div className="flex bg-[#EAE6DC] dark:bg-slate-800 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveDirectoryTab('shops')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeDirectoryTab === 'shops'
                ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>🏪</span>
            <span>{language === 'EN' ? 'Shops & Malls' : 'दुकान, शोरूम व मॉल'} ({shopsList.length})</span>
          </button>

          <button
            onClick={() => setActiveDirectoryTab('helpers')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeDirectoryTab === 'helpers'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>🛠️</span>
            <span>{language === 'EN' ? 'Service Helpers' : 'सर्विस हेल्पर्स'} ({helpersList.length})</span>
          </button>
        </div>
        
        {/* Search Bar with Voice Search Mic */}
        <div className="bg-[#EAE6DC] dark:bg-slate-800 border-2 border-[#DFDBCF] dark:border-slate-700 rounded-xl px-3 py-2 flex items-center gap-2.5 focus-within:ring-2 focus-within:ring-amber-200 dark:focus-within:ring-amber-950 focus-within:border-amber-500 transition-all">
          <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeDirectoryTab === 'shops'
                ? (language === 'EN' ? 'Search shop, showroom, mall, market, bakery...' : 'दुकान, शोरूम, मॉल, इलेक्ट्रॉनिक्स या कपड़े खोजें...')
                : (language === 'EN' ? 'Search plumber, electrician, mechanic, tutor...' : 'प्लंबर, इलेक्ट्रिशियन, मैकेनिक खोजें...')
            } 
            className="bg-transparent border-none outline-none text-slate-900 dark:text-white text-xs w-full placeholder:text-slate-500 font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 font-bold px-1.5 hover:text-slate-600">✕</button>
          )}
          <button
            type="button"
            onClick={startVoiceSearch}
            className={`p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-black shrink-0 transition-all cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 hover:bg-amber-200'
            }`}
            title="Voice Search"
          >
            <Mic className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Voice Search'}</span>
          </button>
        </div>
      </div>

      {/* Main List Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 scrollbar-hide pb-24">
        
        {/* TAB 1: SHOPS, SHOWROOMS & MALLS LIST */}
        {activeDirectoryTab === 'shops' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>{language === 'EN' ? 'Verified Local Shops & Malls' : 'सत्यापित लोकल दुकानें, शोरूम व मॉल'}</span>
              </p>
              <button 
                onClick={() => {
                  if (isGuestUser()) {
                    setIsLoginPromptOpen(true);
                    return;
                  }
                  setIsRegisterShopOpen(true);
                }}
                className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
              >
                + {language === 'EN' ? 'Add Business' : 'अपनी दुकान जोड़ें'}
              </button>
            </div>

            {filteredShops.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center space-y-3 border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
                  🏪
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {searchQuery 
                      ? (language === 'EN' ? 'No shops found matching your search.' : 'आपकी खोज के अनुसार कोई दुकान नहीं मिली।')
                      : (language === 'EN' ? 'No Shops or Malls Registered Yet' : 'अभी तक कोई दुकान, शोरूम या मॉल लिस्टेड नहीं है')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'EN'
                      ? 'Have a shop, showroom, mart, or commercial establishment? Register it 100% free!'
                      : 'क्या आपकी दुकान, शोरूम, मार्ट या कोई व्यवसाय है? अभी 100% फ्री में रजिस्टर करें!'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (isGuestUser()) {
                      setIsLoginPromptOpen(true);
                      return;
                    }
                    setIsRegisterShopOpen(true);
                  }}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  + {language === 'EN' ? 'Register Your Shop / Mall' : 'अपनी दुकान / मॉल रजिस्टर करें'}
                </button>
              </div>
            )}

            {filteredShops.map((shop) => (
              <div
                key={shop.id}
                className="bg-white dark:bg-slate-800 border-2 border-amber-200/80 dark:border-slate-700 rounded-2xl p-3.5 shadow-xs hover:border-amber-400 transition-all space-y-2.5"
              >
                <div className="flex gap-3 items-start">
                  {/* Shop Photo / Icon */}
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-2xl overflow-hidden shrink-0 border border-amber-300 dark:border-slate-600 shadow-xs">
                    {shop.photoUrl ? (
                      <img src={shop.photoUrl} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>🏪</span>
                    )}
                  </div>

                  {/* Shop Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                        {shop.categoryLabel || 'Shop / Business'}
                      </span>
                      {shop.isVerified && (
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1 leading-snug line-clamp-2">
                      {shop.name}
                    </h3>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate">{shop.area} • {shop.address}</span>
                    </p>
                  </div>
                </div>

                {/* Description / Offers */}
                {shop.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-amber-50/50 dark:bg-slate-750 p-2.5 rounded-xl border border-amber-100 dark:border-slate-700 leading-relaxed font-medium">
                    🏷️ {shop.description}
                  </p>
                )}

                {/* Owner info & Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/80 gap-2 flex-wrap">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Owner: </span>
                    <strong className="text-slate-800 dark:text-slate-200">{shop.ownerName || 'Manager'}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* WhatsApp Group Share */}
                    <button
                      type="button"
                      onClick={(e) => handleShareShopToWhatsAppGroup(shop, e)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Share Shop to WhatsApp"
                    >
                      <Share2 className="w-3 h-3 text-emerald-600" />
                      <span className="hidden sm:inline">Share</span>
                    </button>

                    {/* Direct Contact Button or Owner Edit Button */}
                    {isEntityOwner(shop, getCurrentUser()) ? (
                      <button
                        type="button"
                        onClick={() => setIsRegisterShopOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                        title={language === 'EN' ? 'Edit your business details' : 'दुकान की जानकारी एडिट करें'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{language === 'EN' ? 'Edit' : 'एडिट करें'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleShopCallOrChat(shop)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{language === 'EN' ? 'Chat / Visit' : 'चैट / संपर्क'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: SERVICE HELPERS LIST (Real registered only, zero dummy accounts) */}
        {activeDirectoryTab === 'helpers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>{language === 'EN' ? 'Nearby Verified Helpers' : 'आस-पास के सत्यापित सर्विस हेल्पर्स'}</span>
              </p>
              <button 
                onClick={() => {
                  if (isGuestUser()) {
                    setIsLoginPromptOpen(true);
                    return;
                  }
                  setIsRegisterHelperOpen(true);
                }}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                + {language === 'EN' ? 'Register Profile' : 'नया हेल्पर प्रोफाइल जोड़ें'}
              </button>
            </div>

            {filteredHelpers.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center space-y-3 border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
                  🛠️
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {searchQuery
                      ? (language === 'EN' ? 'No helpers found matching your search.' : 'आपकी खोज के अनुसार कोई हेल्पर नहीं मिला।')
                      : (language === 'EN' ? 'No Service Helpers Registered Yet' : 'अभी तक कोई सर्विस हेल्पर लिस्टेड नहीं है')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'EN' 
                      ? 'Be the first plumber, electrician, mechanic, or tutor to register in your neighborhood!'
                      : 'अपने इलाके में पहले प्लंबर, इलेक्ट्रीशियन, मैकेनिक या ट्यूटर के रूप में फ्री रजिस्टर करें!'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (isGuestUser()) {
                      setIsLoginPromptOpen(true);
                      return;
                    }
                    setIsRegisterHelperOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  + {language === 'EN' ? 'Register as Service Helper' : 'सर्विस हेल्पर के रूप में रजिस्टर करें'}
                </button>
              </div>
            )}
            
            {filteredHelpers.map((provider) => (
              <div 
                key={provider.id} 
                className="bg-[#FCFAF5] dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-2xl p-3.5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
              >
                {/* Top row: Name + Distance */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{provider.name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {provider.skills.map(skill => (
                        <span key={skill} className="text-[10px] font-bold bg-[#EAE6DC] dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Distance badge */}
                  <div className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 shrink-0">
                    <MapPin className="w-3 h-3" />
                    <span>{provider.distance}km</span>
                  </div>
                </div>

                {/* Middle Stats Bar - Compact */}
                <div className="flex items-center gap-3 my-2.5 pt-2 border-t border-[#EAE6DC] dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{provider.rating}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({provider.completedTasks} helps)</span>
                  </div>
                  <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {provider.trustScore}% Trust
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  {isEntityOwner(provider, getCurrentUser()) ? (
                    <button
                      type="button"
                      onClick={() => setIsRegisterHelperOpen(true)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-xs text-xs cursor-pointer"
                      title={language === 'EN' ? 'Edit your profile' : 'प्रोफ़ाइल एडिट करें'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{language === 'EN' ? 'Edit Profile' : 'प्रोफ़ाइल एडिट करें'}</span>
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
                          id: 'intent_' + provider.id,
                          authorId: provider.id,
                          description: `Inquiring for ${provider.name} (${provider.skills.join(', ')})`,
                          tags: provider.skills,
                          distance: provider.distance,
                          status: 'active',
                          createdAt: new Date().toISOString()
                        });
                      }} 
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-xs text-xs cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{t('dir.message') || 'Message'}</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedProvider(provider)}
                    className="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-indigo-700 dark:text-indigo-300 font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform border border-indigo-200 dark:border-slate-600 text-xs cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* User Profile Modal */}
      {selectedProvider && (
        <UserProfileModal 
          isOpen={Boolean(selectedProvider)}
          onClose={() => setSelectedProvider(null)}
          userName={selectedProvider.name}
          distance={selectedProvider.distance || 1.2}
        />
      )}

      {/* Register Shop Modal */}
      <RegisterShopModal
        isOpen={isRegisterShopOpen}
        onClose={() => setIsRegisterShopOpen(false)}
        onSuccess={() => {
          loadShops();
          setActiveDirectoryTab('shops');
        }}
      />

      {/* Register Service Helper Modal */}
      <FreeHelperRegisterModal
        isOpen={isRegisterHelperOpen}
        onClose={() => setIsRegisterHelperOpen(false)}
        onSuccess={() => {
          loadHelpers();
          setActiveDirectoryTab('helpers');
        }}
      />

      {/* Guest Mode Login Prompt Modal */}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        onGoToLogin={onBack}
        actionTitleEn="Sign In Required"
        actionTitleHi="चैट या लिस्टिंग के लिए लॉगिन करें"
      />

    </div>
  );
}
