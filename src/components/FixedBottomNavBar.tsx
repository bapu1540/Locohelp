import React, { useState, useEffect } from 'react';
import {
  Home,
  Calendar,
  Heart,
  MessageSquare,
  LayoutGrid,
  User,
  Bell,
  Settings,
  LogIn,
  LogOut,
  X,
  MapPin,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../i18n';
import { Screen, Intent } from '../types';
import { isGuestUser } from '../lib/authUtils';
import { getCurrentUser } from '../auth';
import { fetchLiveIntents } from '../api';
import { DEFAULT_SHOWCASE_PROVIDERS, ShowcaseProviderItem } from './HomeBelowCategorySection';

interface FixedBottomNavBarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onSelectCategory: (cat: string) => void;
  onOpenChat: (intent?: any) => void;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
  onLogout: () => Promise<void>;
}

export default function FixedBottomNavBar({
  currentScreen,
  onNavigate,
  onSelectCategory,
  onOpenChat,
  onOpenProfile,
  onOpenLogin,
  onLogout
}: FixedBottomNavBarProps) {
  const { language, tr } = useLanguage();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [activeBottomModal, setActiveBottomModal] = useState<'bookings' | 'favorites' | null>(null);
  const [myBookingsList, setMyBookingsList] = useState<Intent[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [favoriteProviders, setFavoriteProviders] = useState<ShowcaseProviderItem[]>([]);

  useEffect(() => {
    const handleCloseAll = () => {
      setIsMoreMenuOpen(false);
      setActiveBottomModal(null);
    };
    window.addEventListener('locohelp_close_all_modals', handleCloseAll);
    return () => window.removeEventListener('locohelp_close_all_modals', handleCloseAll);
  }, []);

  useEffect(() => {
    if (activeBottomModal !== 'bookings') return;
    setIsLoadingBookings(true);

    const loadMyBookings = async () => {
      try {
        const live = await fetchLiveIntents();
        let myIds: string[] = [];
        try {
          myIds = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');
        } catch {}

        const user = getCurrentUser();
        const myUid = String(user?.uid || '').trim().toLowerCase();
        const myEmail = String(
          user?.email || localStorage.getItem('locohelp_last_logged_in_email') || ''
        )
          .trim()
          .toLowerCase();
        const myEmailUid = myEmail ? 'email_' + myEmail.replace(/[^a-z0-9]/g, '_') : '';

        const filtered = (Array.isArray(live) ? live : []).filter((post: any) => {
          if (!post || !post.id) return false;
          const pAuthorId = String(post.authorId || post.userId || '').trim().toLowerCase();
          const pAuthorEmail = String(post.authorEmail || '').trim().toLowerCase();
          return Boolean(
            myIds.includes(post.id) ||
              (myUid && pAuthorId === myUid) ||
              (myEmailUid && pAuthorId === myEmailUid) ||
              (myEmail && (pAuthorEmail === myEmail || pAuthorId === myEmail))
          );
        });

        setMyBookingsList(filtered);
      } catch {
        setMyBookingsList([]);
      } finally {
        setIsLoadingBookings(false);
      }
    };

    loadMyBookings();
  }, [activeBottomModal]);

  const refreshFavorites = () => {
    try {
      const savedIds: string[] = JSON.parse(localStorage.getItem('locohelp_favorite_helpers') || '[]');
      const savedObjs: ShowcaseProviderItem[] = JSON.parse(
        localStorage.getItem('locohelp_favorite_helper_objects') || '[]'
      );
      const map = new Map<string, ShowcaseProviderItem>();
      savedObjs.forEach(item => {
        if (item && item.id && savedIds.includes(item.id)) {
          map.set(item.id, item);
        }
      });
      DEFAULT_SHOWCASE_PROVIDERS.forEach(def => {
        if (savedIds.includes(def.id) && !map.has(def.id)) {
          map.set(def.id, def);
        }
      });
      setFavoriteProviders(Array.from(map.values()));
    } catch {
      setFavoriteProviders([]);
    }
  };

  useEffect(() => {
    if (activeBottomModal === 'favorites') {
      refreshFavorites();
    }
  }, [activeBottomModal]);

  useEffect(() => {
    window.addEventListener('locohelp_favorites_updated', refreshFavorites);
    return () => window.removeEventListener('locohelp_favorites_updated', refreshFavorites);
  }, []);

  const removeFavorite = (id: string) => {
    try {
      const savedIds: string[] = JSON.parse(localStorage.getItem('locohelp_favorite_helpers') || '[]');
      const savedObjs: ShowcaseProviderItem[] = JSON.parse(
        localStorage.getItem('locohelp_favorite_helper_objects') || '[]'
      );
      const nextIds = savedIds.filter(x => x !== id);
      const nextObjs = savedObjs.filter(x => x.id !== id);
      localStorage.setItem('locohelp_favorite_helpers', JSON.stringify(nextIds));
      localStorage.setItem('locohelp_favorite_helper_objects', JSON.stringify(nextObjs));
      setFavoriteProviders(nextObjs);
      window.dispatchEvent(new CustomEvent('locohelp_favorites_updated'));
    } catch {}
  };

  const isHomeActive = currentScreen === 'home' && !activeBottomModal && !isMoreMenuOpen;
  const isBookingsActive = activeBottomModal === 'bookings';
  const isFavoritesActive = activeBottomModal === 'favorites';
  const isChatActive = currentScreen === 'chat' && !activeBottomModal && !isMoreMenuOpen;
  const isMoreActive =
    isMoreMenuOpen ||
    (['profile', 'notifications', 'settings', 'guidelines'] as Screen[]).includes(currentScreen);

  return (
    <>
      {/* ===================================================================== */}
      {/* MY BOOKINGS / MY REQUESTS MODAL (મારી બુકિંગ)                           */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {activeBottomModal === 'bookings' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9500,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              style={{ position: 'fixed', inset: 0 }}
              onClick={() => setActiveBottomModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '480px',
                maxHeight: '80vh',
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #4338CA 100%)',
                  color: '#ffffff',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar className="w-5 h-5" />
                  <div>
                    <h3 className="text-sm sm:text-base font-black leading-tight m-0">
                      {language === 'GU'
                        ? 'મારી બુકિંગ અને સેવા રિકવેસ્ટ'
                        : language === 'HI'
                        ? 'मेरी बुकिंग और सेवा रिक्वेस्ट'
                        : 'My Bookings & Service Requests'}
                    </h3>
                    <p className="text-[10px] text-blue-100 font-medium m-0">
                      {language === 'GU'
                        ? 'તમે મૂકેલી સેવા રિકવેસ્ટ અને પોસ્ટની યાદી'
                        : language === 'HI'
                        ? 'आपके द्वारा की गई सेवा बुकिंग और पोस्ट'
                        : 'Your active service requests and posts'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveBottomModal(null)}
                  className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                {isLoadingBookings ? (
                  <div className="py-10 text-center text-xs font-bold text-slate-500">
                    ⏳ {language === 'GU' ? 'લોડ થઈ રહ્યું છે...' : 'Loading...'}
                  </div>
                ) : myBookingsList.length === 0 ? (
                  <div className="py-8 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center text-2xl">
                      📅
                    </div>
                    <h4 className="text-sm font-black text-slate-900">
                      {language === 'GU'
                        ? 'હજુ સુધી કોઈ બુકિંગ કે પોસ્ટ નથી'
                        : language === 'HI'
                        ? 'अभी तक कोई बुकिंग या पोस्ट नहीं है'
                        : 'No Bookings or Posts Yet'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      {language === 'GU'
                        ? 'તમારે કોઈ પણ કારીગર કે સેવાની જરૂર હોય તો હમણાં જ ફ્રી પોસ્ટ/બુકિંગ કરો અથવા કેટેગરીમાંથી કારીગર પસંદ કરો.'
                        : language === 'HI'
                        ? 'किसी भी कारीगर या सेवा की आवश्यकता हो तो अभी फ्री पोस्ट करें या कैटेगरी से चुनें।'
                        : 'Need a service expert right now? Create a free post or browse verified experts.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBottomModal(null);
                          onNavigate('categories');
                        }}
                        style={{ backgroundColor: '#2563EB', color: '#ffffff' }}
                        className="px-4 py-2.5 rounded-xl text-xs font-black shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🔍</span>
                        <span>
                          {language === 'GU'
                            ? 'સેવા પ્રદાતા શોધો'
                            : language === 'HI'
                            ? 'सेवा प्रदाता खोजें'
                            : 'Find Service Providers'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {myBookingsList.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => {
                          setActiveBottomModal(null);
                          onOpenChat(post);
                        }}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <span
                            style={{ backgroundColor: '#059669', color: '#ffffff' }}
                            className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black"
                          >
                            ✓ {language === 'GU' ? 'તમારી બુકિંગ / પોસ્ટ' : 'Active Request'}
                          </span>
                          <p className="text-xs sm:text-sm font-black text-slate-900 line-clamp-2">
                            {post.description}
                          </p>
                          <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="truncate">{post.location || 'Local Area'}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          style={{ backgroundColor: '#2563EB', color: '#ffffff' }}
                          className="px-3 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1"
                        >
                          <span>{language === 'GU' ? 'ચેટ જુઓ' : 'View Chat'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* FAVORITES MODAL (પસંદીદા)                                              */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {activeBottomModal === 'favorites' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9500,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              style={{ position: 'fixed', inset: 0 }}
              onClick={() => setActiveBottomModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '480px',
                maxHeight: '80vh',
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #F43F5E 0%, #DB2777 100%)',
                  color: '#ffffff',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Heart className="w-5 h-5 fill-white" />
                  <div>
                    <h3 className="text-sm sm:text-base font-black leading-tight m-0">
                      {language === 'GU'
                        ? 'પસંદીદા સેવા પ્રદાતાઓ (Favorites)'
                        : language === 'HI'
                        ? 'पसंदीदा सेवा प्रदाता (Favorites)'
                        : 'Favorite Service Providers'}
                    </h3>
                    <p className="text-[10px] text-rose-100 font-medium m-0">
                      {language === 'GU'
                        ? 'તમે પસંદ કરેલા કારીગરો અને સર્વિસ એક્સપર્ટ્સ'
                        : language === 'HI'
                        ? 'आपके द्वारा सेव किए गए पसंदीदा कारीगर'
                        : 'Your saved local service providers'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveBottomModal(null)}
                  className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                {favoriteProviders.length === 0 ? (
                  <div className="py-8 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-500 mx-auto flex items-center justify-center text-2xl">
                      ❤️
                    </div>
                    <h4 className="text-sm font-black text-slate-900">
                      {language === 'GU'
                        ? 'પસંદીદા લિસ્ટ ખાલી છે'
                        : language === 'HI'
                        ? 'पसंदीदा सूची खाली है'
                        : 'No Favorites Saved Yet'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      {language === 'GU'
                        ? 'હોમ પેજ પર "તમારા વિસ્તારમાં ઉપલબ્ધ સેવા પ્રદાતાઓ" કાર્ડ પર ❤️ આઈકન દબાવીને તમારા મનપસંદ કારીગરને અહીં સેવ કરી શકો છો.'
                        : language === 'HI'
                        ? 'होम पेज पर सेवा प्रदाता कार्ड के ❤️ आइकन पर क्लिक करके अपने पसंदीदा कारीगर यहाँ सेव करें।'
                        : 'Tap the ❤️ icon on any service provider card on the Home page to save them here.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBottomModal(null);
                        onSelectCategory('all');
                        onNavigate('categories');
                      }}
                      style={{ backgroundColor: '#E11D48', color: '#ffffff' }}
                      className="px-4 py-2.5 rounded-xl text-xs font-black shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>🔍</span>
                      <span>
                        {language === 'GU'
                          ? 'બધા સેવા પ્રદાતા જુઓ'
                          : language === 'HI'
                          ? 'सभी सेवा प्रदाता देखें'
                          : 'Browse All Providers'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {favoriteProviders.map((prov) => {
                      const displayName =
                        language === 'GU'
                          ? prov.nameGu
                          : language === 'HI'
                          ? prov.nameHi
                          : prov.nameEn;
                      const displayRole =
                        language === 'GU'
                          ? prov.roleGu
                          : language === 'HI'
                          ? prov.roleHi
                          : prov.roleEn;

                      return (
                        <div
                          key={prov.id}
                          onClick={() => {
                            setActiveBottomModal(null);
                            onOpenChat({
                              id: `provider_chat_${prov.id}`,
                              authorId: prov.id,
                              authorName: displayName,
                              description: `${displayName} (${displayRole})`,
                              category: prov.categoryKey || prov.categoryId,
                              location: prov.areaEn || 'Local Area',
                              distance: Number(prov.distance) || 1.2,
                              status: 'active',
                              createdAt: new Date().toISOString()
                            });
                          }}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-rose-300 transition-all cursor-pointer flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={prov.avatarUrl || prov.avatar}
                              alt={displayName}
                              style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }}
                              className="shrink-0 border border-slate-200"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                {displayName}
                              </h4>
                              <p className="text-[11px] font-bold text-slate-600 truncate">
                                ({displayRole}) • ★ {prov.rating}
                              </p>
                              <p className="text-[10px] font-bold text-emerald-700 truncate">
                                ✓ {language === 'GU' ? 'વેરિફાઈડ • સીધી ચેટ કરવા ક્લિક કરો' : language === 'HI' ? 'वेरिफाइड • चैट के लिए क्लिक करें' : 'Verified • Tap to Chat'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFavorite(prov.id);
                              }}
                              className="p-2 rounded-xl bg-rose-100 text-rose-600 hover:bg-rose-200 cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* "વધુ" (MORE) POPUP MENU — EXACT ITEMS FROM FORMER TOP 3-DOT MENU      */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9600 }}
              onClick={() => setIsMoreMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                bottom: '66px',
                right: '10px',
                width: '220px',
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                border: '2px solid #cbd5e1',
                padding: '8px',
                zIndex: 9700,
                boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              {/* Option 1: My Chats */}
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  if (isGuestUser()) {
                    onOpenLogin();
                    return;
                  }
                  onOpenChat(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: '#EEF2FF',
                  color: '#3730A3',
                  fontWeight: 800,
                  fontSize: '12px',
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <MessageSquare className="w-4 h-4 shrink-0" style={{ color: '#4F46E5' }} />
                <span>{tr('My Chats', 'मेरी बातचीत', 'મારી વાતચીત')}</span>
              </button>

              {/* Option 2: Profile */}
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenProfile();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: 'transparent',
                  color: '#1E293B',
                  fontWeight: 800,
                  fontSize: '12px',
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <User className="w-4 h-4 shrink-0" style={{ color: '#4F46E5' }} />
                <span>{tr('Profile', 'प्रोफ़ाइल', 'પ્રોફાઇલ')}</span>
              </button>

              {/* Option 3: Notifications */}
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onNavigate('notifications');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: 'transparent',
                  color: '#1E293B',
                  fontWeight: 800,
                  fontSize: '12px',
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Bell className="w-4 h-4 shrink-0" style={{ color: '#4F46E5' }} />
                <span>{tr('Notifications', 'नोटिफिकेशन', 'નોટિફિકેશન')}</span>
              </button>

              {/* Option 4: Settings */}
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onNavigate('settings');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: 'transparent',
                  color: '#1E293B',
                  fontWeight: 800,
                  fontSize: '12px',
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Settings className="w-4 h-4 shrink-0" style={{ color: '#4F46E5' }} />
                <span>{tr('Settings', 'सेटिंग्स', 'સેટિંગ્સ')}</span>
              </button>

              <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '2px 0' }} />

              {/* Option 5: Sign In / Login or Log Out */}
              {isGuestUser() ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenLogin();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#EEF2FF',
                    color: '#2563EB',
                    fontWeight: 800,
                    fontSize: '12px',
                    textAlign: 'left',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>{tr('Sign In / Login', 'लॉगिन / साइन इन', 'લોગિન / સાઇન ઇન')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setIsMoreMenuOpen(false);
                    await onLogout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#FFF1F2',
                    color: '#E11D48',
                    fontWeight: 800,
                    fontSize: '12px',
                    textAlign: 'left',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>{tr('Log Out', 'लॉग आउट', 'લોગ આઉટ')}</span>
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* FIXED BOTTOM NAVIGATION BAR (હોમ | મારી બુકિંગ | પસંદીદા | સંદેશ | વધુ) */}
      {/* Uses explicit inline styles so it NEVER stacks vertically on any phone */}
      {/* ===================================================================== */}
      <nav
        aria-label="Primary Bottom Navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 9400,
          backgroundColor: '#ffffff',
          borderTop: '2px solid #cbd5e1',
          boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.12)',
          padding: '6px 4px',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            alignItems: 'center',
            width: '100%',
            maxWidth: '896px',
            margin: '0 auto'
          }}
        >
          {/* 1. હોમ (Home) */}
          <button
            type="button"
            onClick={() => {
              setIsMoreMenuOpen(false);
              setActiveBottomModal(null);
              onSelectCategory('all');
              onNavigate('home');
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 2px',
              border: 'none',
              borderRight: '1px solid #e2e8f0',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <Home
              style={{
                width: '20px',
                height: '20px',
                color: isHomeActive ? '#2563EB' : '#334155',
                strokeWidth: isHomeActive ? 2.5 : 2
              }}
            />
            <span
              style={{
                fontSize: '11px',
                marginTop: '2px',
                lineHeight: 1.15,
                fontWeight: isHomeActive ? 900 : 700,
                color: isHomeActive ? '#2563EB' : '#1E293B',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'GU' ? 'હોમ' : language === 'HI' ? 'होम' : 'Home'}
            </span>
          </button>

          {/* 2. મારી બુકિંગ (My Bookings) */}
          <button
            type="button"
            onClick={() => {
              setIsMoreMenuOpen(false);
              setActiveBottomModal(prev => (prev === 'bookings' ? null : 'bookings'));
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 2px',
              border: 'none',
              borderRight: '1px solid #e2e8f0',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <Calendar
              style={{
                width: '20px',
                height: '20px',
                color: isBookingsActive ? '#2563EB' : '#334155',
                strokeWidth: isBookingsActive ? 2.5 : 2
              }}
            />
            <span
              style={{
                fontSize: '11px',
                marginTop: '2px',
                lineHeight: 1.15,
                fontWeight: isBookingsActive ? 900 : 700,
                color: isBookingsActive ? '#2563EB' : '#1E293B',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'GU' ? 'મારી બુકિંગ' : language === 'HI' ? 'मेरी बुकिंग' : 'Bookings'}
            </span>
          </button>

          {/* 3. પસંદીદા (Favorites) */}
          <button
            type="button"
            onClick={() => {
              setIsMoreMenuOpen(false);
              setActiveBottomModal(prev => (prev === 'favorites' ? null : 'favorites'));
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 2px',
              border: 'none',
              borderRight: '1px solid #e2e8f0',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <Heart
              style={{
                width: '20px',
                height: '20px',
                color: isFavoritesActive ? '#E11D48' : '#334155',
                strokeWidth: isFavoritesActive ? 2.5 : 2
              }}
            />
            <span
              style={{
                fontSize: '11px',
                marginTop: '2px',
                lineHeight: 1.15,
                fontWeight: isFavoritesActive ? 900 : 700,
                color: isFavoritesActive ? '#E11D48' : '#1E293B',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'GU' ? 'પસંદીદા' : language === 'HI' ? 'पसंदीदा' : 'Favorites'}
            </span>
          </button>

          {/* 4. સંદેશ (Messages / Live Chat) */}
          <button
            type="button"
            onClick={() => {
              setIsMoreMenuOpen(false);
              setActiveBottomModal(null);
              if (isGuestUser()) {
                onOpenLogin();
                return;
              }
              onOpenChat(null);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 2px',
              border: 'none',
              borderRight: '1px solid #e2e8f0',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <MessageSquare
              style={{
                width: '20px',
                height: '20px',
                color: isChatActive ? '#2563EB' : '#334155',
                strokeWidth: isChatActive ? 2.5 : 2
              }}
            />
            <span
              style={{
                fontSize: '11px',
                marginTop: '2px',
                lineHeight: 1.15,
                fontWeight: isChatActive ? 900 : 700,
                color: isChatActive ? '#2563EB' : '#1E293B',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'GU' ? 'સંદેશ' : language === 'HI' ? 'संदेश' : 'Messages'}
            </span>
          </button>

          {/* 5. વધુ (More — opens the menu with My Chats, Profile, Notifications, Settings, Login/Logout) */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomModal(null);
              setIsMoreMenuOpen(prev => !prev);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 2px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <LayoutGrid
              style={{
                width: '20px',
                height: '20px',
                color: isMoreActive ? '#2563EB' : '#334155',
                strokeWidth: isMoreActive ? 2.5 : 2
              }}
            />
            <span
              style={{
                fontSize: '11px',
                marginTop: '2px',
                lineHeight: 1.15,
                fontWeight: isMoreActive ? 900 : 700,
                color: isMoreActive ? '#2563EB' : '#1E293B',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'GU' ? 'વધુ' : language === 'HI' ? 'अधिक' : 'More'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
