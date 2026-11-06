import React, { useState, useEffect } from 'react';
import {
  Home,
  Megaphone,
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
  ChevronRight,
  Plus,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../i18n';
import { Screen, Intent } from '../types';
import { isGuestUser } from '../lib/authUtils';
import { getCurrentUser } from '../auth';
import {
  fetchLiveIntents,
  getCachedLiveIntents,
  fetchPostConversations,
  getCachedPostConversations,
  deleteIntentOnServer
} from '../api';
import { DEFAULT_SHOWCASE_PROVIDERS, ShowcaseProviderItem } from './HomeBelowCategorySection';
import {
  getSavedUserLocation,
  getLocalizedLocationButtonText,
  saveUserLocationPermanently,
  matchesUserLocationFilter,
  UserManualLocation
} from '../data/panIndiaLocations';

interface FixedBottomNavBarProps {
  currentScreen: Screen;
  unreadChatCount?: number;
  onNavigate: (screen: Screen) => void;
  onSelectCategory: (cat: string) => void;
  onOpenChat: (intent?: any) => void;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
  onLogout: () => Promise<void>;
}

export default function FixedBottomNavBar({
  currentScreen,
  unreadChatCount = 0,
  onNavigate,
  onSelectCategory,
  onOpenChat,
  onOpenProfile,
  onOpenLogin,
  onLogout
}: FixedBottomNavBarProps) {
  const { language, tr } = useLanguage();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [activeBottomModal, setActiveBottomModal] = useState<'posts' | 'bookings' | 'favorites' | null>(null);
  const [allLivePostsList, setAllLivePostsList] = useState<Intent[]>(() => getCachedLiveIntents());
  const [postsSearchQuery, setPostsSearchQuery] = useState('');
  const [isLoadingLivePosts, setIsLoadingLivePosts] = useState(false);
  const [bookingsSubTab, setBookingsSubTab] = useState<'requests' | 'contacted' | 'replies'>('requests');
  const [myBookingsList, setMyBookingsList] = useState<Intent[]>([]);
  const [contactedProvidersList, setContactedProvidersList] = useState<any[]>([]);
  const [myRepliedChatsList, setMyRepliedChatsList] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [favoriteProviders, setFavoriteProviders] = useState<ShowcaseProviderItem[]>([]);
  const [activeLocation, setActiveLocation] = useState<UserManualLocation>(() => getSavedUserLocation());

  useEffect(() => {
    const syncLoc = (e?: any) => {
      if (e?.detail?.district) {
        setActiveLocation(e.detail);
      } else {
        setActiveLocation(getSavedUserLocation());
      }
    };
    window.addEventListener('locohelp_location_changed', syncLoc);
    window.addEventListener('storage', syncLoc);
    return () => {
      window.removeEventListener('locohelp_location_changed', syncLoc);
      window.removeEventListener('storage', syncLoc);
    };
  }, []);

  useEffect(() => {
    const handleCloseAll = () => {
      setIsMoreMenuOpen(false);
      setActiveBottomModal(null);
    };
    window.addEventListener('locohelp_close_all_modals', handleCloseAll);
    return () => window.removeEventListener('locohelp_close_all_modals', handleCloseAll);
  }, []);

  const filterMyOwnPosts = (posts: Intent[]): Intent[] => {
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

    return (Array.isArray(posts) ? posts : []).filter((post: any) => {
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
  };

  const extractContactedAndReplies = (convs: any[], myPostIdsSet: Set<string>) => {
    const user = getCurrentUser();
    const myUid = String(user?.uid || '').trim().toLowerCase();
    const myEmail = String(
      user?.email || localStorage.getItem('locohelp_last_logged_in_email') || ''
    )
      .trim()
      .toLowerCase();

    const contactedMap = new Map<string, any>();
    const repliesMap = new Map<string, any>();

    // 1. Check local number requests / provider interactions if any
    try {
      const localNumReqs = JSON.parse(localStorage.getItem('locohelp_number_requests') || '[]');
      if (Array.isArray(localNumReqs)) {
        localNumReqs.forEach((reqItem: any) => {
          if (!reqItem) return;
          const reqFromId = String(reqItem.requesterId || reqItem.userId || '').trim().toLowerCase();
          const reqFromEmail = String(reqItem.requesterEmail || '').trim().toLowerCase();
          if ((myUid && reqFromId === myUid) || (myEmail && reqFromEmail === myEmail)) {
            const pId = String(reqItem.providerId || reqItem.helperId || reqItem.id || '');
            if (pId) {
              contactedMap.set(pId, {
                id: `provider_chat_${pId}`,
                providerId: pId,
                name: reqItem.providerName || reqItem.helperName || 'Service Provider',
                category: reqItem.category || 'Service Expert',
                location: reqItem.location || reqItem.city || 'Local Area',
                phone: reqItem.providerPhone || '',
                lastMessage: reqItem.status === 'approved' ? '✅ મોબાઈલ નંબર મંજૂર થયો' : '📱 મોબાઈલ નંબરની રિકવેસ્ટ મોકલી',
                updatedAt: reqItem.createdAt || new Date().toISOString()
              });
            }
          }
        });
      }
    } catch {}

    // 2. Classify conversations into Contacted Service Providers vs Community Replies
    (Array.isArray(convs) ? convs : []).forEach((c: any) => {
      if (!c) return;
      const postIdStr = String(c.postId || c.post_id || '');
      if (!postIdStr) return;

      if (postIdStr.startsWith('provider_chat_')) {
        const provId = postIdStr.replace(/^provider_chat_/i, '');
        if (myUid && provId.toLowerCase() === myUid) return; // I am the provider
        contactedMap.set(provId || postIdStr, {
          id: postIdStr,
          providerId: provId,
          name: c.posterName && c.posterName !== 'Post Owner' ? c.posterName : (c.partnerName || c.postTitle || 'Service Provider'),
          category: c.category || 'Service Expert',
          location: c.location || 'Local Area',
          lastMessage: c.lastMessage || c.last_message || 'વાતચીત ચાલુ છે',
          updatedAt: c.lastMessageAt || c.updatedAt || new Date().toISOString(),
          rawConv: c
        });
      } else if (!myPostIdsSet.has(postIdStr) && !c.isViewerPoster) {
        // I replied to someone else's post
        repliesMap.set(postIdStr, {
          id: postIdStr,
          title: c.postTitle || c.postDescription || c.lastMessage || 'Community Request',
          posterName: c.posterName || c.partnerName || 'Community Member',
          location: c.location || 'Local Area',
          lastMessage: c.lastMessage || c.last_message || '',
          updatedAt: c.lastMessageAt || c.updatedAt || new Date().toISOString(),
          rawConv: c
        });
      }
    });

    setContactedProvidersList(Array.from(contactedMap.values()));
    setMyRepliedChatsList(Array.from(repliesMap.values()));
  };

  useEffect(() => {
    if (activeBottomModal !== 'bookings') return;

    const user = getCurrentUser();
    const userPhone =
      user?.phone ||
      localStorage.getItem('locohelp_last_logged_in_phone') ||
      localStorage.getItem('locohelp_profile_phone') ||
      '';

    // STEP 1: Synchronous 0ms render from localStorage cache
    const cachedIntents = getCachedLiveIntents();
    const cachedMyPosts = filterMyOwnPosts(cachedIntents);
    const cachedConvs = user
      ? getCachedPostConversations({
          userId: user.uid,
          userEmail: user.email,
          userPhone
        })
      : [];

    setMyBookingsList(cachedMyPosts);
    extractContactedAndReplies(
      cachedConvs,
      new Set(cachedMyPosts.map((p) => String(p.id)))
    );

    if (cachedMyPosts.length === 0 && cachedConvs.length === 0) {
      setIsLoadingBookings(true);
    } else {
      setIsLoadingBookings(false);
    }

    // STEP 2: Background refresh from server
    let active = true;
    const loadMyBookings = async () => {
      try {
        const [live, liveConvs] = await Promise.all([
          fetchLiveIntents(),
          user
            ? fetchPostConversations({
                userId: user.uid,
                userEmail: user.email,
                userPhone
              })
            : Promise.resolve([])
        ]);
        if (!active) return;
        const freshMyPosts = filterMyOwnPosts(live);
        setMyBookingsList(freshMyPosts);
        extractContactedAndReplies(
          liveConvs,
          new Set(freshMyPosts.map((p) => String(p.id)))
        );
      } catch {
        // Keep cached lists if network fails
      } finally {
        if (active) setIsLoadingBookings(false);
      }
    };

    loadMyBookings();
    return () => {
      active = false;
    };
  }, [activeBottomModal]);

  const handleCompleteOrDeleteMyBooking = async (e: React.MouseEvent, post: Intent) => {
    e.stopPropagation();
    setMyBookingsList((prev) => prev.filter((item) => item.id !== post.id));
    setAllLivePostsList((prev) => prev.filter((item) => item.id !== post.id));
    await deleteIntentOnServer(post.id, post.description);
    window.dispatchEvent(new CustomEvent('locohelp_intents_updated'));
  };

  useEffect(() => {
    let active = true;
    const syncLivePosts = async () => {
      const cached = getCachedLiveIntents();
      if (active) {
        setAllLivePostsList(Array.isArray(cached) ? cached : []);
      }
      if (activeBottomModal === 'posts' && cached.length === 0) {
        setIsLoadingLivePosts(true);
      }
      try {
        const fresh = await fetchLiveIntents();
        if (active && Array.isArray(fresh)) {
          setAllLivePostsList(fresh);
        }
      } catch {} finally {
        if (active) setIsLoadingLivePosts(false);
      }
    };
    syncLivePosts();
    // Auto-prune expired posts (>1 hour) every 30 seconds
    const timer = setInterval(() => {
      syncLivePosts();
    }, 30000);
    window.addEventListener('locohelp_intents_updated', syncLivePosts);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('locohelp_intents_updated', syncLivePosts);
    };
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
  const isPostsActive = activeBottomModal === 'posts';
  const isBookingsActive = activeBottomModal === 'bookings';
  const isFavoritesActive = activeBottomModal === 'favorites';
  const isChatActive = currentScreen === 'chat' && !activeBottomModal && !isMoreMenuOpen;
  const isMoreActive =
    isMoreMenuOpen ||
    (['profile', 'notifications', 'settings', 'guidelines'] as Screen[]).includes(currentScreen);

  const myOwnPostIdsSet = new Set(filterMyOwnPosts(allLivePostsList).map(p => String(p.id)));
  const selectedDistLower = (activeLocation?.district || '').trim().toLowerCase();
  const isAllCitiesMode = !selectedDistLower || selectedDistLower === 'all';

  const filteredLivePosts = allLivePostsList.filter((post: any) => {
    if (!post || !post.id) return false;
    if (post.is_flagged || post.hidden || post.is_deleted) return false;

    const isMyOwn = myOwnPostIdsSet.has(String(post.id));
    if (!isMyOwn && !isAllCitiesMode && !postsSearchQuery.trim()) {
      const postLocText = `${post.city || ''} ${post.area || ''} ${post.location || ''} ${post.resolvedLocationBadge || ''} ${post.description || ''}`;
      if (!matchesUserLocationFilter(postLocText, activeLocation)) return false;
    }

    if (!postsSearchQuery.trim()) return true;
    const q = postsSearchQuery.toLowerCase().trim();
    return (
      String(post.description || '').toLowerCase().includes(q) ||
      String(post.category || '').toLowerCase().includes(q) ||
      String(post.location || post.area || '').toLowerCase().includes(q) ||
      String(post.authorName || '').toLowerCase().includes(q)
    );
  });

  const handleTriggerCreatePost = () => {
    setActiveBottomModal(null);
    if (currentScreen !== 'home') {
      onNavigate('home');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('locohelp_open_post_sheet'));
      }, 120);
    } else {
      window.dispatchEvent(new CustomEvent('locohelp_open_post_sheet'));
    }
  };

  return (
    <>
      {/* ===================================================================== */}
      {/* LIVE BROADCAST POSTS MODAL (📢 પોસ્ટ / Live Posts)                      */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {activeBottomModal === 'posts' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9500,
              backgroundColor: 'rgba(15, 23, 42, 0.68)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px'
            }}
          >
            <div
              style={{ position: 'fixed', inset: 0 }}
              onClick={() => setActiveBottomModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '520px',
                maxHeight: '85vh',
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                border: '1px solid #fed7aa',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #EA580C 0%, #D97706 100%)',
                  color: '#ffffff',
                  padding: '13px 15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '18px' }}>📢</span>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="text-sm sm:text-base font-black leading-tight m-0 truncate">
                      {language === 'GU'
                        ? `લાઈવ પોસ્ટ્સ - ${getLocalizedLocationButtonText(activeLocation, language)} (${filteredLivePosts.length})`
                        : language === 'HI'
                        ? `लाइव पोस्ट - ${getLocalizedLocationButtonText(activeLocation, language)} (${filteredLivePosts.length})`
                        : `Live Posts - ${getLocalizedLocationButtonText(activeLocation, language)} (${filteredLivePosts.length})`}
                    </h3>
                    <p className="text-[10px] text-orange-100 font-medium m-0 truncate">
                      {language === 'GU'
                        ? 'તમામ લાઈવ પોસ્ટ્સ જુઓ અથવા નવી પોસ્ટ મૂકો'
                        : language === 'HI'
                        ? 'सभी लाइव पोस्ट देखें या नई पोस्ट बनाएं'
                        : 'Browse all live community requests or post your need'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={handleTriggerCreatePost}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#C2410C',
                      padding: '6px 10px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'GU' ? 'પોસ્ટ કરો' : language === 'HI' ? 'पोस्ट करें' : 'Post'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBottomModal(null)}
                    className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    value={postsSearchQuery}
                    onChange={(e) => setPostsSearchQuery(e.target.value)}
                    placeholder={
                      language === 'GU'
                        ? 'પોસ્ટ, સેવા કે વિસ્તાર શોધો...'
                        : language === 'HI'
                        ? 'पोस्ट, सेवा या क्षेत्र खोजें...'
                        : 'Search posts, services or area...'
                    }
                    className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                  {postsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPostsSearchQuery('')}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Posts Feed */}
              <div className="p-3.5 overflow-y-auto flex-1 space-y-2.5">
                {isLoadingLivePosts ? (
                  <div className="py-10 text-center text-xs font-bold text-slate-500">
                    ⏳ {language === 'GU' ? 'પોસ્ટ્સ લોડ થઈ રહી છે...' : 'Loading live posts...'}
                  </div>
                ) : filteredLivePosts.length === 0 ? (
                  <div className="py-8 px-4 text-center space-y-3 bg-orange-50/50 rounded-2xl border border-dashed border-orange-300">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-2xl">
                      📢
                    </div>
                    <h4 className="text-sm font-black text-slate-900">
                      {language === 'GU'
                        ? `હાલ ${getLocalizedLocationButtonText(activeLocation, language)} માં કોઈ લાઈવ પોસ્ટ નથી`
                        : language === 'HI'
                        ? `अभी ${getLocalizedLocationButtonText(activeLocation, language)} में कोई लाइव पोस्ट नहीं है`
                        : `No Live Posts in ${getLocalizedLocationButtonText(activeLocation, language)}`}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      {language === 'GU'
                        ? 'તમારે કોઈ કારીગર કે સેવાની જરૂર હોય તો હમણાં જ ફ્રી પોસ્ટ મૂકો અથવા બધા શહેરોની પોસ્ટ જુઓ!'
                        : language === 'HI'
                        ? 'किसी कारीगर या सेवा की जरूरत हो तो अभी फ्री पोस्ट डालें या सभी शहरों की पोस्ट देखें!'
                        : 'Need a service expert? Create a free post right now or view posts from all cities!'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {!isAllCitiesMode && allLivePostsList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            saveUserLocationPermanently({ state: 'All', district: 'All', taluka: '', area: '' });
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span>🌐</span>
                          <span>
                            {language === 'GU'
                              ? `બધા શહેરોની પોસ્ટ જુઓ (${allLivePostsList.length})`
                              : language === 'HI'
                              ? `सभी शहरों की पोस्ट देखें (${allLivePostsList.length})`
                              : `View All Cities (${allLivePostsList.length})`}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleTriggerCreatePost}
                        style={{ backgroundColor: '#EA580C', color: '#ffffff' }}
                        className="px-4 py-2.5 rounded-xl text-xs font-black shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          {language === 'GU'
                            ? 'નવી પોસ્ટ બનાવો'
                            : language === 'HI'
                            ? 'नई पोस्ट बनाएं'
                            : 'Create New Post'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredLivePosts.map((post: any) => {
                    const isMine = myOwnPostIdsSet.has(String(post.id));
                    const respCount = Number(
                      post.responseCount ||
                        post.response_count ||
                        (Array.isArray(post.repliers) ? post.repliers.length : 0)
                    );
                    return (
                      <div
                        key={post.id}
                        onClick={() => {
                          setActiveBottomModal(null);
                          onOpenChat(post);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isMine
                            ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-500'
                            : 'bg-slate-50 border-slate-200 hover:border-orange-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isMine ? (
                              <span
                                style={{ backgroundColor: '#059669', color: '#ffffff' }}
                                className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black"
                              >
                                ⚡ {language === 'GU' ? 'તમારી પોસ્ટ (લાઈવ)' : 'Your Post (Live)'}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black">
                                👤 {post.authorName || 'Community Member'}
                              </span>
                            )}
                            {post.category && (
                              <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-black">
                                {post.category}
                              </span>
                            )}
                            {respCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                                💬 {respCount} {language === 'GU' ? 'જવાબ' : 'Replies'}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                          {post.description}
                        </p>

                        {/* Attached Photo Display */}
                        {Boolean(post.imageUrl || post.attachmentUrl || post.image_url) && (
                          <div className="relative w-full max-h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                            <img
                              src={post.imageUrl || post.attachmentUrl || post.image_url}
                              alt="Post attachment"
                              className="w-full max-h-48 object-cover rounded-xl"
                              loading="lazy"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80">
                          <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-orange-600 shrink-0" />
                            <span className="truncate">
                              {post.resolvedLocationBadge || post.location || post.area || 'Local Area'}
                            </span>
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isMine && (
                              <button
                                type="button"
                                onClick={(e) => handleCompleteOrDeleteMyBooking(e, post)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                              >
                                <span>✅</span>
                                <span>{language === 'GU' ? 'પૂર્ણ થયું' : 'Done'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              style={{ backgroundColor: isMine ? '#2563EB' : '#EA580C', color: '#ffffff' }}
                              className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer"
                            >
                              <span>
                                {isMine
                                  ? language === 'GU'
                                    ? 'જવાબ જુઓ'
                                    : 'View Replies'
                                  : language === 'GU'
                                  ? 'ચેટ / મદદ કરો'
                                  : 'Chat / Help'}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '500px',
                maxHeight: '84vh',
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
                        ? 'તમારી પોસ્ટ, સંપર્ક કરેલા કારીગરો અને જવાબો'
                        : language === 'HI'
                        ? 'आपकी पोस्ट, संपर्क किए गए कारीगर और जवाब'
                        : 'Your posts, contacted providers & replies'}
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

              {/* 3 Sub-Tabs inside My Bookings Modal */}
              <div className="grid grid-cols-3 gap-1.5 px-3 pt-3 pb-2 bg-slate-50 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setBookingsSubTab('requests')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    bookingsSubTab === 'requests'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>📋</span>
                  <span className="truncate">
                    {language === 'GU' ? 'મારી પોસ્ટ' : language === 'HI' ? 'मेरी पोस्ट' : 'My Posts'} ({myBookingsList.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingsSubTab('contacted')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    bookingsSubTab === 'contacted'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>📞</span>
                  <span className="truncate">
                    {language === 'GU' ? 'કારીગરો' : language === 'HI' ? 'कारीगर' : 'Providers'} ({contactedProvidersList.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingsSubTab('replies')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    bookingsSubTab === 'replies'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>🤝</span>
                  <span className="truncate">
                    {language === 'GU' ? 'મારા જવાબો' : language === 'HI' ? 'मेरे जवाब' : 'My Replies'} ({myRepliedChatsList.length})
                  </span>
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                {isLoadingBookings ? (
                  <div className="py-10 text-center text-xs font-bold text-slate-500">
                    ⏳ {language === 'GU' ? 'લોડ થઈ રહ્યું છે...' : 'Loading...'}
                  </div>
                ) : bookingsSubTab === 'requests' ? (
                  myBookingsList.length === 0 ? (
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
                            onNavigate('home');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{ backgroundColor: '#16A34A', color: '#ffffff' }}
                          className="px-4 py-2.5 rounded-xl text-xs font-black shadow-sm cursor-pointer flex items-center gap-1.5"
                        >
                          <span>➕</span>
                          <span>
                            {language === 'GU'
                              ? 'નવી સેવા રિકવેસ્ટ મૂકો'
                              : language === 'HI'
                              ? 'नई सेवा रिक्वेस्ट डालें'
                              : 'Create Service Request'}
                          </span>
                        </button>
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
                      {myBookingsList.map((post: any) => {
                        const respCount = Number(post.responseCount || post.response_count || (Array.isArray(post.repliers) ? post.repliers.length : 0));
                        return (
                          <div
                            key={post.id}
                            onClick={() => {
                              setActiveBottomModal(null);
                              onOpenChat(post);
                            }}
                            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all cursor-pointer space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  style={{ backgroundColor: '#059669', color: '#ffffff' }}
                                  className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black"
                                >
                                  ✓ {language === 'GU' ? 'ચાલુ રિકવેસ્ટ' : 'Active Request'}
                                </span>
                                {post.category && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black">
                                    {post.category}
                                  </span>
                                )}
                                {respCount > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                                    💬 {respCount} {language === 'GU' ? 'જવાબ' : 'Replies'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm font-black text-slate-900 line-clamp-2">
                              {post.description}
                            </p>
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                <span className="truncate">{post.location || 'Local Area'}</span>
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleCompleteOrDeleteMyBooking(e, post)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                  title={language === 'GU' ? 'કામ પૂર્ણ થયું / કાઢી નાખો' : 'Mark Completed / Remove'}
                                >
                                  <span>✅</span>
                                  <span>{language === 'GU' ? 'પૂર્ણ થયું' : 'Done'}</span>
                                </button>
                                <button
                                  type="button"
                                  style={{ backgroundColor: '#2563EB', color: '#ffffff' }}
                                  className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{language === 'GU' ? 'ચેટ જુઓ' : 'View Chat'}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBottomModal(null);
                            onNavigate('home');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-black cursor-pointer"
                        >
                          ➕ {language === 'GU' ? 'નવી સેવા રિકવેસ્ટ મૂકો' : 'Create Another Service Request'}
                        </button>
                      </div>
                    </div>
                  )
                ) : bookingsSubTab === 'contacted' ? (
                  contactedProvidersList.length === 0 ? (
                    <div className="py-8 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center text-2xl">
                        📞
                      </div>
                      <h4 className="text-sm font-black text-slate-900">
                        {language === 'GU'
                          ? 'હજુ કોઈ કારીગરનો સંપર્ક કર્યો નથી'
                          : language === 'HI'
                          ? 'अभी किसी कारीगर से संपर्क नहीं किया है'
                          : 'No Contacted Service Providers Yet'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        {language === 'GU'
                          ? 'તમે જે કારીગર કે સેવા પ્રદાતાને મેસેજ કે કૉલ કરશો તેમની યાદી અહીં દેખાશે.'
                          : 'Service providers you message or request numbers from will appear here.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBottomModal(null);
                          onNavigate('categories');
                        }}
                        style={{ backgroundColor: '#2563EB', color: '#ffffff' }}
                        className="px-4 py-2.5 rounded-xl text-xs font-black shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>🔍</span>
                        <span>{language === 'GU' ? 'કારીગર શોધો' : 'Browse Providers'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {contactedProvidersList.map((prov) => (
                        <div
                          key={prov.id}
                          onClick={() => {
                            setActiveBottomModal(null);
                            onOpenChat({
                              id: prov.id,
                              authorId: prov.providerId || prov.id,
                              authorName: prov.name,
                              category: prov.category || 'Service Provider',
                              description: `${prov.name} (${prov.category || 'Service'})`,
                              location: prov.location || 'Local Area',
                              tags: ['#ServiceProvider'],
                              createdAt: prov.updatedAt || new Date().toISOString(),
                              expiresAt: new Date(Date.now() + 86400000).toISOString(),
                              distance: 0.5,
                              hasLocationPin: true,
                              isVerifiedUser: true
                            });
                          }}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black">
                              🔧 {prov.category || 'Service Provider'}
                            </span>
                            <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                              {prov.name}
                            </p>
                            <p className="text-[11px] font-medium text-slate-600 truncate">
                              💬 {prov.lastMessage}
                            </p>
                          </div>
                          <button
                            type="button"
                            style={{ backgroundColor: '#2563EB', color: '#ffffff' }}
                            className="px-3 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{language === 'GU' ? 'મેસેજ' : 'Chat'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                ) : myRepliedChatsList.length === 0 ? (
                  <div className="py-8 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-2xl">
                      🤝
                    </div>
                    <h4 className="text-sm font-black text-slate-900">
                      {language === 'GU'
                        ? 'તમે હજુ કોઈ પોસ્ટ પર જવાબ આપ્યો નથી'
                        : language === 'HI'
                        ? 'आपने अभी किसी पोस्ट पर जवाब नहीं दिया है'
                        : 'No Replies Sent Yet'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      {language === 'GU'
                        ? 'તમે બીજા કોઈની મદદ રિકવેસ્ટ પર મેસેજ કરશો તો તેની યાદી અહીં દેખાશે.'
                        : 'Posts where you offered help or replied will appear here.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {myRepliedChatsList.map((rep) => (
                      <div
                        key={rep.id}
                        onClick={() => {
                          setActiveBottomModal(null);
                          onOpenChat({
                            id: rep.id,
                            authorId: rep.rawConv?.posterId || '',
                            authorName: rep.posterName,
                            category: rep.rawConv?.category || 'Community',
                            description: rep.title,
                            location: rep.location || 'Local Area',
                            tags: ['#Help'],
                            createdAt: rep.updatedAt || new Date().toISOString(),
                            expiresAt: new Date(Date.now() + 86400000).toISOString(),
                            distance: 0.5,
                            hasLocationPin: true,
                            isVerifiedUser: true
                          });
                        }}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            👤 {rep.posterName}
                          </span>
                          <p className="text-xs sm:text-sm font-black text-slate-900 line-clamp-1">
                            {rep.title}
                          </p>
                          <p className="text-[11px] font-medium text-slate-600 truncate">
                            💬 {rep.lastMessage}
                          </p>
                        </div>
                        <button
                          type="button"
                          style={{ backgroundColor: '#2563EB', color: '#ffffff' }}
                          className="px-3 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{language === 'GU' ? 'ચેટ ખોલો' : 'Open Chat'}</span>
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
              {/* Option 1: Profile */}
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
          zIndex: 40,
          backgroundColor: '#ffffff',
          borderTop: '2px solid #cbd5e1',
          boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.12)',
          paddingTop: '6px',
          paddingLeft: '4px',
          paddingRight: '4px',
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
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
                fontSize: '10.5px',
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

          {/* 2. પોસ્ટ (Live Broadcast Posts) */}
          <button
            type="button"
            onClick={() => {
              setIsMoreMenuOpen(false);
              setActiveBottomModal(prev => (prev === 'posts' ? null : 'posts'));
            }}
            style={{
              position: 'relative',
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
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Megaphone
                style={{
                  width: '20px',
                  height: '20px',
                  color: isPostsActive ? '#EA580C' : '#334155',
                  strokeWidth: isPostsActive ? 2.5 : 2
                }}
              />
              {filteredLivePosts.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-10px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 3.5px',
                    borderRadius: '9999px',
                    backgroundColor: '#EA580C',
                    color: '#ffffff',
                    fontSize: '9.5px',
                    fontWeight: 900,
                    lineHeight: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #ffffff'
                  }}
                >
                  {filteredLivePosts.length > 99 ? '99+' : filteredLivePosts.length}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '10.5px',
                marginTop: '2px',
                lineHeight: 1.15,
                fontWeight: isPostsActive ? 900 : 700,
                color: isPostsActive ? '#EA580C' : '#1E293B',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'GU' ? 'પોસ્ટ' : language === 'HI' ? 'पोस्ट' : 'Posts'}
            </span>
          </button>

          {/* 3. મારી બુકિંગ (My Bookings) */}
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

          {/* 4. સંદેશ (Messages / Live Chat Inbox with Unread Count Badge) */}
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
              position: 'relative',
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
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare
                style={{
                  width: '20px',
                  height: '20px',
                  color: isChatActive ? '#2563EB' : unreadChatCount > 0 ? '#0D9488' : '#334155',
                  strokeWidth: isChatActive || unreadChatCount > 0 ? 2.5 : 2
                }}
              />
              {unreadChatCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-10px',
                    minWidth: '17px',
                    height: '17px',
                    padding: '0 4px',
                    borderRadius: '9999px',
                    backgroundColor: '#E11D48',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 900,
                    lineHeight: '15px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 2px 4px rgba(225, 29, 72, 0.35)'
                  }}
                >
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '11px',
                marginTop: '2px',
                lineHeight: 1.15,
                fontWeight: isChatActive || unreadChatCount > 0 ? 900 : 700,
                color: isChatActive ? '#2563EB' : unreadChatCount > 0 ? '#0D9488' : '#1E293B',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'GU' ? 'સંદેશ' : language === 'HI' ? 'संदेश' : 'Messages'}
            </span>
          </button>

          {/* 6. પ્રોફાઈલ (Profile — opens the menu with Profile, Notifications, Settings, Login/Logout) */}
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
            <User
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
              {language === 'GU' ? 'પ્રોફાઈલ' : language === 'HI' ? 'प्रोफ़ाइल' : 'Profile'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
