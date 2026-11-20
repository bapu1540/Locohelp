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
  Search,
  ShoppingBag,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../i18n';
import { Screen, Intent } from '../types';
import { isGuestUser } from '../lib/authUtils';
import { getCurrentUser, getUserIdentitySet } from '../auth';
import {
  fetchLiveIntents,
  getCachedLiveIntents,
  fetchPostConversations,
  getCachedPostConversations,
  deleteIntentOnServer,
  isClientDummyOrExpiredPost,
  getLocalUserDeletedChatsMap,
  subscribeToRealtimeStream,
  fetchUsedItems,
  updateUsedItemStatus,
  deleteUsedItemListing,
  UsedItemListing
} from '../api';
import { DEFAULT_SHOWCASE_PROVIDERS, ShowcaseProviderItem } from './HomeBelowCategorySection';
import {
  getSavedUserLocation,
  getLocalizedLocationButtonText,
  saveUserLocationPermanently,
  matchesUserLocationFilter,
  localizePlaceName,
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
  const [postsScope, setPostsScope] = useState<'all' | 'local'>('all');
  const [isLoadingLivePosts, setIsLoadingLivePosts] = useState(false);
  const hasLoadedLivePostsOnceRef = React.useRef(false);
  const [bookingsSubTab, setBookingsSubTab] = useState<'live_posts' | 'requests' | 'contacted' | 'replies' | 'my_used_items'>('live_posts');
  const [myBookingsList, setMyBookingsList] = useState<Intent[]>([]);
  const [contactedProvidersList, setContactedProvidersList] = useState<any[]>([]);
  const [myRepliedChatsList, setMyRepliedChatsList] = useState<any[]>([]);
  const [myUsedItemsList, setMyUsedItemsList] = useState<UsedItemListing[]>([]);
  const [busyUsedItemId, setBusyUsedItemId] = useState<string | null>(null);
  const [confirmDeleteUsedItemId, setConfirmDeleteUsedItemId] = useState<string | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [favoriteProviders, setFavoriteProviders] = useState<ShowcaseProviderItem[]>([]);
  const [activeLocation, setActiveLocation] = useState<UserManualLocation>(() => getSavedUserLocation());
  const [postToDeleteConfirm, setPostToDeleteConfirm] = useState<Intent | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [deleteToast, setDeleteToast] = useState<{ text: string; isError?: boolean } | null>(null);
  const [expiryTick, setExpiryTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setExpiryTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(id);
  }, []);

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
      myIds = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]').map((x: any) => String(x));
    } catch {}
    const user = getCurrentUser();
    const myIdentitySet = getUserIdentitySet(user);
    const myUid = String(user?.uid || '').trim().toLowerCase();
    const myEmail = String(
      user?.email || localStorage.getItem('locohelp_last_logged_in_email') || ''
    )
      .trim()
      .toLowerCase();
    const myEmailUid = myEmail ? 'email_' + myEmail.replace(/[^a-z0-9]/g, '_') : '';
    const rawPhone = String(
      user?.phone ||
        localStorage.getItem('locohelp_last_logged_in_phone') ||
        localStorage.getItem('locohelp_profile_phone') ||
        ''
    );
    const myPhoneDigits = rawPhone.replace(/\D/g, '').slice(-10);
    const myPhoneUid = myPhoneDigits.length === 10 ? `phone_${myPhoneDigits}` : '';
    const myPhoneSynthEmail = myPhoneDigits.length === 10 ? `${myPhoneDigits}@phone.locohelp.com` : '';

    return (Array.isArray(posts) ? posts : []).filter((post: any) => {
      if (!post || !post.id) return false;
      if (myIds.includes(String(post.id))) return true;
      const pAuthorId = String(post.authorId || post.userId || post.user_id || '').trim().toLowerCase();
      const pAuthorEmail = String(post.authorEmail || post.email || '').trim().toLowerCase();
      const pAuthorPhoneDigits = String(post.authorPhone || post.phone || '').replace(/\D/g, '').slice(-10);
      return Boolean(
        (pAuthorId && myIdentitySet.has(pAuthorId)) ||
          (pAuthorEmail && myIdentitySet.has(pAuthorEmail)) ||
          (myUid && pAuthorId === myUid) ||
          (myEmailUid && pAuthorId === myEmailUid) ||
          (myEmail && (pAuthorEmail === myEmail || pAuthorId === myEmail)) ||
          (myPhoneUid && pAuthorId === myPhoneUid) ||
          (myPhoneSynthEmail && (pAuthorEmail === myPhoneSynthEmail || pAuthorId === myPhoneSynthEmail)) ||
          (myPhoneDigits.length === 10 && pAuthorPhoneDigits.length === 10 && pAuthorPhoneDigits === myPhoneDigits)
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
    const rawPhone = String(
      user?.phone ||
        localStorage.getItem('locohelp_last_logged_in_phone') ||
        localStorage.getItem('locohelp_profile_phone') ||
        ''
    );
    const myPhoneDigits = rawPhone.replace(/\D/g, '').slice(-10);
    const myPhoneUid = myPhoneDigits.length === 10 ? `phone_${myPhoneDigits}` : '';
    const myNameLower = String(
      user?.displayName || localStorage.getItem('locohelp_profile_name') || ''
    )
      .trim()
      .toLowerCase();
    const myIdentitySet = getUserIdentitySet(user);
    const deletedMap = getLocalUserDeletedChatsMap();

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
          const reqFromPhone = String(reqItem.requesterPhone || '').replace(/\D/g, '').slice(-10);
          if (
            (myUid && reqFromId === myUid) ||
            (myPhoneUid && reqFromId === myPhoneUid) ||
            (myEmail && reqFromEmail === myEmail) ||
            (myPhoneDigits.length === 10 && reqFromPhone === myPhoneDigits)
          ) {
            const pId = String(reqItem.providerId || reqItem.helperId || reqItem.id || '');
            const pIdLower = pId.trim().toLowerCase();
            if (pId && !myIdentitySet.has(pIdLower) && !myIdentitySet.has(`provider_chat_${pIdLower}`)) {
              const provChatId = `provider_chat_${pId}`;
              const delAt = Math.max(Number(deletedMap[provChatId] || 0), Number(deletedMap[pId] || 0));
              const reqTime = new Date(reqItem.createdAt || 0).getTime() || 0;
              if (delAt > 0 && (reqTime <= 0 || reqTime <= delAt)) return;
              contactedMap.set(pId, {
                id: provChatId,
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

    // 2. Classify conversations (including sub-threads inside WhatsApp-style merged person chats) into Contacted Service Providers vs Community Replies
    const classifySingleThread = (t: any, parentConv: any) => {
      if (!t) return;
      const postIdStr = String(t.postId || t.post_id || '').trim();
      if (!postIdStr) return;

      const convIdStr = String(t.conversationId || t.id || '').trim();
      const parentConvIdStr = String(parentConv?.id || '').trim();
      const partnerIdStr = String(parentConv?.partnerId || t.partnerId || '').trim().toLowerCase();
      const compoundKey = postIdStr && partnerIdStr ? `${postIdStr}::${partnerIdStr}` : '';
      const deletedAt = Math.max(
        convIdStr ? Number(deletedMap[convIdStr] || 0) : 0,
        parentConvIdStr && (!Array.isArray(parentConv?.mergedThreads) || parentConv.mergedThreads.length <= 1)
          ? Number(deletedMap[parentConvIdStr] || 0)
          : 0,
        Number(deletedMap[postIdStr] || 0),
        compoundKey ? Number(deletedMap[compoundKey] || 0) : 0
      );
      const lastMsgTime = new Date(t.lastMessageAt || t.updatedAt || t.createdAt || parentConv?.lastMessageAt || 0).getTime() || 0;
      const effectiveIsViewerPoster =
        typeof t.isViewerPoster === 'boolean'
          ? t.isViewerPoster
          : Boolean(parentConv?.isViewerPoster && postIdStr === String(parentConv?.postId || parentConv?.post_id || ''));

      if (postIdStr.startsWith('provider_chat_')) {
        const provId = postIdStr.replace(/^provider_chat_/i, '').trim();
        const provIdLower = provId.toLowerCase();
        const posterIdLower = String(t.posterId || t.poster_id || (postIdStr === parentConv?.postId ? parentConv?.posterId : '') || '').trim().toLowerCase();
        const posterEmailLower = String(t.posterEmail || t.poster_email || (postIdStr === parentConv?.postId ? parentConv?.posterEmail : '') || '').trim().toLowerCase();
        const helperIdLower = String(t.helperId || t.helper_id || t.senderId || '').trim().toLowerCase();
        const posterNameLower = String(t.posterName || (postIdStr === parentConv?.postId ? parentConv?.posterName : '') || '').trim().toLowerCase();
        const provPhoneTen = provId.replace(/\D/g, '').slice(-10);

        const isMeProvider = Boolean(
          effectiveIsViewerPoster === true ||
          myIdentitySet.has(provIdLower) ||
          myIdentitySet.has(postIdStr.toLowerCase()) ||
          (posterIdLower && myIdentitySet.has(posterIdLower)) ||
          (posterEmailLower && myIdentitySet.has(posterEmailLower)) ||
          (myPhoneDigits.length === 10 && provPhoneTen.length === 10 && provPhoneTen === myPhoneDigits) ||
          (myNameLower && posterNameLower === myNameLower && (!helperIdLower || !myIdentitySet.has(helperIdLower)))
        );

        if (isMeProvider) {
          contactedMap.delete(provId);
          contactedMap.delete(postIdStr);
          return; // I am the service provider; do not list my own profile under Contacted Providers
        }

        const provDeletedAt = Math.max(deletedAt, Number(deletedMap[provId] || 0));
        if (provDeletedAt > 0 && (lastMsgTime <= 0 || lastMsgTime <= provDeletedAt)) {
          contactedMap.delete(provId);
          contactedMap.delete(postIdStr);
          return;
        }
        const mapKey = provId || postIdStr;
        const prevEntry = contactedMap.get(mapKey);
        const prevTime = prevEntry ? new Date(prevEntry.updatedAt || 0).getTime() || 0 : -1;
        if (!prevEntry || lastMsgTime >= prevTime) {
          const resolvedName =
            (t.posterName && t.posterName !== 'Post Owner' ? t.posterName : '') ||
            (parentConv?.partnerName && parentConv.partnerName !== 'Post Owner' ? parentConv.partnerName : '') ||
            (t.postTitle || parentConv?.postTitle || 'Service Provider');
          contactedMap.set(mapKey, {
            id: postIdStr,
            providerId: provId,
            name: resolvedName,
            category: t.category || parentConv?.category || 'Service Expert',
            location: t.location || parentConv?.location || 'Local Area',
            lastMessage: t.lastMessage || t.last_message || parentConv?.lastMessage || 'વાતચીત ચાલુ છે',
            updatedAt: t.lastMessageAt || t.updatedAt || parentConv?.lastMessageAt || new Date().toISOString(),
            rawConv: {
              ...parentConv,
              id: convIdStr || parentConv?.id,
              postId: postIdStr,
              posterId: t.posterId || provId || parentConv?.posterId,
              posterName: resolvedName,
              category: t.category || parentConv?.category || 'Service Expert',
              location: t.location || parentConv?.location || 'Local Area'
            }
          });
        }
      } else if (!myPostIdsSet.has(postIdStr) && !effectiveIsViewerPoster) {
        // Also guard against own post if t.posterId/posterEmail matches current user
        const tPosterIdLower = String(t.posterId || t.poster_id || '').trim().toLowerCase();
        const tPosterEmailLower = String(t.posterEmail || t.poster_email || '').trim().toLowerCase();
        if (
          (tPosterIdLower && myIdentitySet.has(tPosterIdLower)) ||
          (tPosterEmailLower && myIdentitySet.has(tPosterEmailLower))
        ) {
          return;
        }
        if (deletedAt > 0 && (lastMsgTime <= 0 || lastMsgTime <= deletedAt)) {
          return;
        }
        const prevEntry = repliesMap.get(postIdStr);
        const prevTime = prevEntry ? new Date(prevEntry.updatedAt || 0).getTime() || 0 : -1;
        if (!prevEntry || lastMsgTime >= prevTime) {
          const resolvedPosterName =
            (t.posterName && t.posterName !== 'Post Owner' ? t.posterName : '') ||
            parentConv?.partnerName ||
            parentConv?.posterName ||
            'Community Member';
          repliesMap.set(postIdStr, {
            id: postIdStr,
            title: t.postTitle || t.postDescription || t.lastMessage || parentConv?.postTitle || 'Community Request',
            posterName: resolvedPosterName,
            location: t.location || parentConv?.location || 'Local Area',
            lastMessage: t.lastMessage || t.last_message || parentConv?.lastMessage || '',
            updatedAt: t.lastMessageAt || t.updatedAt || parentConv?.lastMessageAt || new Date().toISOString(),
            rawConv: {
              ...parentConv,
              id: convIdStr || parentConv?.id,
              postId: postIdStr,
              posterId: t.posterId || parentConv?.posterId || parentConv?.partnerId || '',
              posterName: resolvedPosterName,
              category: t.category || parentConv?.category || 'Community',
              location: t.location || parentConv?.location || 'Local Area'
            }
          });
        }
      }
    };

    (Array.isArray(convs) ? convs : []).forEach((c: any) => {
      if (!c) return;
      const subThreads: any[] = Array.isArray(c.mergedThreads) && c.mergedThreads.length > 0 ? c.mergedThreads : [];
      if (subThreads.length > 0) {
        const coveredPostIds = new Set<string>();
        subThreads.forEach((th: any) => {
          const pId = String(th?.postId || th?.post_id || '').trim();
          if (pId) coveredPostIds.add(pId);
          classifySingleThread(th, c);
        });
        const topPostId = String(c.postId || c.post_id || '').trim();
        if (topPostId && !coveredPostIds.has(topPostId)) {
          classifySingleThread(c, c);
        }
      } else {
        classifySingleThread(c, c);
      }
    });

    setContactedProvidersList(
      Array.from(contactedMap.values()).sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      )
    );
    setMyRepliedChatsList(
      Array.from(repliesMap.values()).sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      )
    );
  };

  useEffect(() => {
    if (activeBottomModal !== 'bookings' && activeBottomModal !== 'posts') return;

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
        const [live, liveConvs, liveMyUsedItems] = await Promise.all([
          fetchLiveIntents(),
          user
            ? fetchPostConversations({
                userId: user.uid,
                userEmail: user.email,
                userPhone
              })
            : Promise.resolve([]),
          !isGuestUser() && user?.uid
            ? fetchUsedItems({ status: 'all', mine: true })
            : Promise.resolve([])
        ]);
        if (!active) return;
        const freshMyPosts = filterMyOwnPosts(live);
        setMyBookingsList(freshMyPosts);
        extractContactedAndReplies(
          liveConvs,
          new Set(freshMyPosts.map((p) => String(p.id)))
        );
        if (Array.isArray(liveMyUsedItems)) {
          setMyUsedItemsList(liveMyUsedItems);
        }
      } catch {
        // Keep cached lists if network fails
      } finally {
        if (active) setIsLoadingBookings(false);
      }
    };

    loadMyBookings();
    const onBookingsSyncEvent = () => {
      loadMyBookings();
    };
    window.addEventListener('locohelp_intents_updated', onBookingsSyncEvent);
    const unsubBookingsStream = subscribeToRealtimeStream({
      onNewPost: () => loadMyBookings(),
      onPostDeleted: () => loadMyBookings(),
      onNewResponse: () => loadMyBookings()
    });
    return () => {
      active = false;
      unsubBookingsStream();
      window.removeEventListener('locohelp_intents_updated', onBookingsSyncEvent);
    };
  }, [activeBottomModal]);

  const showPostToast = (text: string, isError = false) => {
    setDeleteToast({ text, isError });
    setTimeout(() => setDeleteToast(null), 3500);
  };

  const executeServerDeletePost = async (post: Intent) => {
    setIsDeletingPost(true);
    const ok = await deleteIntentOnServer(post.id, post.description);
    setIsDeletingPost(false);
    if (ok) {
      setMyBookingsList((prev) => prev.filter((item) => item.id !== post.id));
      setAllLivePostsList((prev) => prev.filter((item) => item.id !== post.id));
      setPostToDeleteConfirm(null);
      window.dispatchEvent(new CustomEvent('locohelp_intents_updated', { detail: { deletedId: post.id } }));
      showPostToast(
        language === 'GU'
          ? '🗑️ પોસ્ટ સફળતાપૂર્વક ડિલીટ થઈ ગઈ!'
          : language === 'HI'
          ? '🗑️ पोस्ट सफलतापूर्वक डिलीट हो गई!'
          : '🗑️ Post deleted successfully!'
      );
    } else {
      setPostToDeleteConfirm(null);
      showPostToast(
        language === 'GU'
          ? '⚠️ પોસ્ટ ડિલીટ ન થઈ શકી. કૃપા કરીને ફરી લોગિન કરીને પ્રયાસ કરો.'
          : language === 'HI'
          ? '⚠️ पोस्ट डिलीट नहीं हो सकी। कृपया दोबारा लॉगिन करके प्रयास करें।'
          : '⚠️ Could not delete post. Please sign in again and retry.',
        true
      );
    }
  };

  const handleOpenDeletePostConfirm = (e: React.MouseEvent, post: Intent) => {
    e.stopPropagation();
    setPostToDeleteConfirm(post);
  };

  const handleCompleteOrDeleteMyBooking = async (e: React.MouseEvent, post: Intent) => {
    e.stopPropagation();
    await executeServerDeletePost(post);
  };

  useEffect(() => {
    let active = true;
    const syncLivePosts = async (showInitialSpinner = false) => {
      const cached = getCachedLiveIntents();
      if (active && cached.length > 0) {
        hasLoadedLivePostsOnceRef.current = true;
        setAllLivePostsList(prev => {
          const map = new Map<string, Intent>();
          cached.forEach(item => { if (item?.id) map.set(item.id, item); });
          prev.forEach(item => {
            if (item?.id && !map.has(item.id)) {
              const cachedIds = new Set(cached.map(c => c.id));
              if (!cachedIds.has(item.id) && (Date.now() - new Date(item.createdAt || 0).getTime() < 60000)) {
                map.set(item.id, item);
              }
            }
          });
          return Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        });
      }
      if (showInitialSpinner && !hasLoadedLivePostsOnceRef.current && cached.length === 0) {
        setIsLoadingLivePosts(true);
      }
      try {
        const fresh = await fetchLiveIntents();
        if (active && Array.isArray(fresh)) {
          hasLoadedLivePostsOnceRef.current = true;
          setAllLivePostsList(fresh);
        }
      } catch {} finally {
        hasLoadedLivePostsOnceRef.current = true;
        if (active) setIsLoadingLivePosts(false);
      }
    };
    const handleIntentsUpdatedEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.deletedId) {
        setAllLivePostsList(prev => prev.filter(item => item.id !== detail.deletedId));
      } else if (detail && detail.id) {
        setAllLivePostsList(prev => [detail, ...prev.filter(item => item.id !== detail.id)]);
      }
      syncLivePosts(false);
    };
    const handleSilentSync = () => {
      syncLivePosts(false);
    };
    syncLivePosts(activeBottomModal === 'posts' || activeBottomModal === 'bookings');
    // Silent background fallback refresh (real-time SSE handles 0ms instant post updates)
    const timer = setInterval(() => {
      syncLivePosts(false);
    }, activeBottomModal === 'posts' || activeBottomModal === 'bookings' ? 10000 : 15000);
    window.addEventListener('locohelp_intents_updated', handleIntentsUpdatedEvent);
    window.addEventListener('locohelp_realtime_new_response', handleSilentSync);
    const unsubStream = subscribeToRealtimeStream({
      onNewPost: (payload) => {
        const newPost = payload?.post || payload?.intent;
        if (newPost && newPost.id && active) {
          setAllLivePostsList(prev => [newPost, ...prev.filter(item => item.id !== newPost.id)]);
        }
        syncLivePosts(false);
      },
      onPostDeleted: (payload) => {
        const deletedId = String(payload?.postId || payload?.id || '').trim();
        if (deletedId && active) {
          setAllLivePostsList(prev => prev.filter(item => item.id !== deletedId));
          setMyBookingsList(prev => prev.filter(item => item.id !== deletedId));
        }
      },
      onNewResponse: () => {
        syncLivePosts(false);
      }
    });
    return () => {
      active = false;
      clearInterval(timer);
      unsubStream();
      window.removeEventListener('locohelp_intents_updated', handleIntentsUpdatedEvent);
      window.removeEventListener('locohelp_realtime_new_response', handleSilentSync);
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

  const formatPostLocationDisplay = (post: any): string => {
    const rawCity = String(post?.city || '').trim();
    const rawArea = String(post?.area || '').trim();
    const rawLoc = String(post?.resolvedLocationBadge || post?.location || '').trim();

    if (
      rawCity.toLowerCase() === 'all' ||
      rawCity.toLowerCase() === 'all cities' ||
      rawArea.toLowerCase() === 'all cities' ||
      rawLoc.toLowerCase() === 'all cities' ||
      rawLoc.toLowerCase() === 'all' ||
      (isAllCitiesMode && rawLoc.toLowerCase() === 'gandhinagar, gandhinagar')
    ) {
      return language === 'GU' ? 'બધા શહેરો' : language === 'HI' ? 'सभी शहर' : 'All Cities';
    }

    const parts = (rawLoc || [rawArea, rawCity].filter(Boolean).join(', '))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const uniqueParts: string[] = [];
    for (const p of parts) {
      if (!uniqueParts.some((u) => u.toLowerCase() === p.toLowerCase())) {
        uniqueParts.push(localizePlaceName(p, language));
      }
    }

    if (uniqueParts.length > 0) {
      return uniqueParts.join(', ');
    }
    return language === 'GU' ? 'બધા શહેરો' : language === 'HI' ? 'सभी शहर' : 'All Cities';
  };

  const activeVisiblePosts = allLivePostsList.filter((post: any) => {
    void expiryTick;
    if (!post || !post.id) return false;
    if (post.is_flagged || post.hidden || post.is_deleted) return false;
    if (isClientDummyOrExpiredPost(post)) return false;
    return true;
  });

  const activeMyBookingsList = myBookingsList.filter((post: any) => {
    void expiryTick;
    if (!post || !post.id) return false;
    if (post.is_flagged || post.hidden || post.is_deleted) return false;
    if (isClientDummyOrExpiredPost(post)) return false;
    return true;
  });

  const localCityPostsCount = activeVisiblePosts.filter((post: any) => {
    if (myOwnPostIdsSet.has(String(post.id))) return true;
    const postCityLower = String(post.city || '').trim().toLowerCase();
    const postLocLower = String(post.location || '').trim().toLowerCase();
    if (
      !postCityLower ||
      postCityLower === 'all' ||
      postCityLower === 'all cities' ||
      postLocLower === 'all' ||
      postLocLower === 'all cities'
    ) {
      return true;
    }
    const postLocText = `${post.city || ''} ${post.area || ''} ${post.location || ''} ${post.resolvedLocationBadge || ''} ${post.description || ''}`;
    return matchesUserLocationFilter(postLocText, activeLocation);
  }).length;

  const filteredLivePosts = activeVisiblePosts
    .filter((post: any) => {
      const isMyOwn = myOwnPostIdsSet.has(String(post.id));
      const postCityLower = String(post.city || '').trim().toLowerCase();
      const postLocLower = String(post.location || '').trim().toLowerCase();
      const isPostForAllCities =
        !postCityLower ||
        postCityLower === 'all' ||
        postCityLower === 'all cities' ||
        postLocLower === 'all' ||
        postLocLower === 'all cities';

      if (postsScope === 'local' && !isMyOwn && !isAllCitiesMode && !isPostForAllCities && !postsSearchQuery.trim()) {
        const postLocText = `${post.city || ''} ${post.area || ''} ${post.location || ''} ${post.resolvedLocationBadge || ''} ${post.description || ''}`;
        if (!matchesUserLocationFilter(postLocText, activeLocation)) return false;
      }

      if (!postsSearchQuery.trim()) return true;
      const q = postsSearchQuery.toLowerCase().trim();
      return (
        String(post.description || '').toLowerCase().includes(q) ||
        String(post.category || '').toLowerCase().includes(q) ||
        String(post.location || post.area || post.city || '').toLowerCase().includes(q) ||
        String(post.authorName || '').toLowerCase().includes(q)
      );
    })
    .slice()
    .sort((a: any, b: any) => {
      const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
      return bTime - aTime;
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
      {/* ===================================================================== */}
      {/* UNIFIED POSTS & MY BOOKINGS MODAL (📢 પોસ્ટ અને બુકિંગ)                */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {(activeBottomModal === 'posts' || activeBottomModal === 'bookings') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 41,
              backgroundColor: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Full-Page Top Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #EA580C 0%, #2563EB 100%)',
                color: '#ffffff',
                paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
                paddingBottom: '12px',
                paddingLeft: '14px',
                paddingRight: '14px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  maxWidth: '896px',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => setActiveBottomModal(null)}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer shrink-0 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="text-sm sm:text-base font-black leading-tight m-0 truncate">
                      📢{' '}
                      {language === 'GU'
                        ? 'પોસ્ટ અને મારી બુકિંગ'
                        : language === 'HI'
                        ? 'पोस्ट और मेरी बुकिंग'
                        : 'Posts & My Bookings'}
                    </h3>
                    <p className="text-[11px] text-orange-100 font-medium m-0 truncate">
                      {language === 'GU'
                        ? 'લાઈવ પોસ્ટ્સ, જવાબો, કારીગરો અને વેચાણ વસ્તુઓ'
                        : language === 'HI'
                        ? 'लाइव पोस्ट, जवाब, कारीगर और बिक्री की वस्तुएं'
                        : 'Live posts, replies, providers & your items for sale'}
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
                      padding: '7px 11px',
                      borderRadius: '10px',
                      fontSize: '11.5px',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'GU' ? 'પોસ્ટ કરો' : language === 'HI' ? 'पोस्ट करें' : 'Post'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Full-Page Body Container */}
            <div
              style={{
                width: '100%',
                maxWidth: '896px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                backgroundColor: '#ffffff'
              }}
            >
              {/* 2x2 Spacious Non-Truncating 4-Section Selector */}
              <div className="grid grid-cols-2 gap-1.5 px-3 pt-2.5 pb-2.5 bg-slate-100 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setBookingsSubTab('live_posts')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                    bookingsSubTab === 'live_posts'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-left">
                    <span>📢</span>
                    <span>{language === 'GU' ? 'લાઈવ પોસ્ટ્સ' : language === 'HI' ? 'लाइव पोस्ट' : 'Live Posts'}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${
                      bookingsSubTab === 'live_posts' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {filteredLivePosts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (bookingsSubTab !== 'requests' && bookingsSubTab !== 'replies') {
                      setBookingsSubTab('requests');
                    }
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                    bookingsSubTab === 'requests' || bookingsSubTab === 'replies'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-left">
                    <span>📋</span>
                    <span>{language === 'GU' ? 'મારી પોસ્ટ / જવાબ' : language === 'HI' ? 'मेरी पोस्ट / जवाब' : 'My Posts & Replies'}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${
                      bookingsSubTab === 'requests' || bookingsSubTab === 'replies'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {activeMyBookingsList.length + myRepliedChatsList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingsSubTab('contacted')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                    bookingsSubTab === 'contacted'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-left">
                    <span>📞</span>
                    <span>{language === 'GU' ? 'કારીગરો બુકિંગ' : language === 'HI' ? 'कारीगर बुकिंग' : 'Contacted Experts'}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${
                      bookingsSubTab === 'contacted' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {contactedProvidersList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingsSubTab('my_used_items')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                    bookingsSubTab === 'my_used_items'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-left">
                    <span>🛍️</span>
                    <span>{language === 'GU' ? 'મારી વેચાણ વસ્તુ' : language === 'HI' ? 'मेरी बिक्री वस्तु' : 'My Used Items'}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${
                      bookingsSubTab === 'my_used_items' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {myUsedItemsList.length}
                  </span>
                </button>
              </div>

              {/* Search Bar & City Scope Filter (Shown when viewing Live Posts tab) */}
              {bookingsSubTab === 'live_posts' && (
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 space-y-2">
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
                  {!isAllCitiesMode && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPostsScope('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                          postsScope === 'all'
                            ? 'bg-orange-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        🌐 {language === 'GU' ? `બધા શહેરો (${activeVisiblePosts.length})` : language === 'HI' ? `सभी शहर (${activeVisiblePosts.length})` : `All Cities (${activeVisiblePosts.length})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostsScope('local')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                          postsScope === 'local'
                            ? 'bg-orange-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        📍 {getLocalizedLocationButtonText(activeLocation, language)} ({localCityPostsCount})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Spacious 2-Column Sub-Toggle when inside "મારી પોસ્ટ / જવાબ" */}
              {(bookingsSubTab === 'requests' || bookingsSubTab === 'replies') && (
                <div className="grid grid-cols-2 gap-2 px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBookingsSubTab('requests')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      bookingsSubTab === 'requests'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>📋</span>
                    <span>
                      {language === 'GU' ? 'મારી મૂકેલી પોસ્ટ' : language === 'HI' ? 'मेरी डाली पोस्ट' : 'My Posts'} ({activeMyBookingsList.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingsSubTab('replies')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      bookingsSubTab === 'replies'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>🤝</span>
                    <span>
                      {language === 'GU' ? 'મેં આપેલા જવાબો' : language === 'HI' ? 'मेरे दिए जवाब' : 'My Replies'} ({myRepliedChatsList.length})
                    </span>
                  </button>
                </div>
              )}

              {/* Scrollable Content Area */}
              <div
                className="p-3.5 overflow-y-auto flex-1 space-y-2.5"
                style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
              >
                {bookingsSubTab === 'live_posts' ? (
                  isLoadingLivePosts ? (
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
                      const postRepliersList = Array.isArray(post.repliers) && post.repliers.length > 0
                        ? post.repliers
                        : Array.isArray(post.responses) && post.responses.length > 0
                        ? post.responses
                        : [];
                      const respCount = Math.max(
                        Number(post.responseCount || post.response_count || 0),
                        postRepliersList.length
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

                          {postRepliersList.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-white/95 border border-emerald-200 space-y-1.5">
                              <p className="text-[10px] font-black text-emerald-800 flex items-center gap-1">
                                <span>💬</span>
                                <span>
                                  {language === 'GU'
                                    ? `આવેલા જવાબો (${postRepliersList.length}):`
                                    : `Replies (${postRepliersList.length}):`}
                                </span>
                              </p>
                              {postRepliersList.slice(0, 3).map((rep: any, idx: number) => {
                                const repId = String(rep.senderId || rep.sender_id || rep.helperId || '').trim();
                                const repName = rep.senderName || rep.sender_name || rep.helperName || 'Community Helper';
                                const repMsg = rep.lastMessage || rep.last_message || rep.text || rep.message || '';
                                return (
                                  <div
                                    key={rep.id || `${repId}_${idx}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveBottomModal(null);
                                      onOpenChat({
                                        ...post,
                                        selectedReplierId: repId || undefined,
                                        selectedReplierName: repName,
                                        selectedReplierEmail: rep.senderEmail || rep.helperEmail || undefined,
                                        selectedReplierAvatar: rep.senderAvatar || rep.helperAvatar || undefined
                                      });
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 flex items-center justify-between gap-2 cursor-pointer"
                                  >
                                    <div className="min-w-0">
                                      <span className="text-[11px] font-black text-slate-900">{repName}: </span>
                                      <span className="text-[11px] font-bold text-slate-700">{repMsg}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-700 shrink-0">
                                      {language === 'GU' ? 'ચેટ →' : 'Chat →'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80">
                            <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-orange-600 shrink-0" />
                              <span className="truncate">
                                {formatPostLocationDisplay(post)}
                              </span>
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isMine && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenDeletePostConfirm(e, post)}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                    title={language === 'GU' ? 'પોસ્ટ ડિલીટ કરો' : language === 'HI' ? 'पोस्ट डिलीट करें' : 'Delete Post'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{language === 'GU' ? 'ડિલીટ' : language === 'HI' ? 'डिलीट' : 'Delete'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCompleteOrDeleteMyBooking(e, post)}
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>✅</span>
                                    <span>{language === 'GU' ? 'પૂર્ણ થયું' : 'Done'}</span>
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                style={{ backgroundColor: isMine ? '#2563EB' : '#EA580C', color: '#ffffff' }}
                                className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer"
                              >
                                <span>
                                  {isMine
                                    ? language === 'GU'
                                      ? `જવાબ જુઓ${respCount > 0 ? ` (${respCount})` : ''}`
                                      : `View Replies${respCount > 0 ? ` (${respCount})` : ''}`
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
                  )
                ) : isLoadingBookings ? (
                  <div className="py-10 text-center text-xs font-bold text-slate-500">
                    ⏳ {language === 'GU' ? 'લોડ થઈ રહ્યું છે...' : 'Loading...'}
                  </div>
                ) : bookingsSubTab === 'requests' ? (
                  activeMyBookingsList.length === 0 ? (
                    <div className="py-8 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center text-2xl">
                        📅
                      </div>
                      <h4 className="text-sm font-black text-slate-900">
                        {language === 'GU'
                          ? 'તમે હજુ સુધી કોઈ પોસ્ટ મૂકી નથી'
                          : language === 'HI'
                          ? 'आपने अभी तक कोई पोस्ट नहीं डाली है'
                          : 'No Posts Created by You Yet'}
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
                          onClick={handleTriggerCreatePost}
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
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeMyBookingsList.map((post: any) => {
                        const postRepliersList = Array.isArray(post.repliers) && post.repliers.length > 0
                          ? post.repliers
                          : Array.isArray(post.responses) && post.responses.length > 0
                          ? post.responses
                          : [];
                        const respCount = Math.max(
                          Number(post.responseCount || post.response_count || 0),
                          postRepliersList.length
                        );
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
                            {postRepliersList.length > 0 && (
                              <div className="p-2.5 rounded-xl bg-white border border-blue-200 space-y-1.5">
                                <p className="text-[10px] font-black text-blue-800">
                                  💬 {language === 'GU' ? `આવેલા જવાબો (${postRepliersList.length}):` : `Replies (${postRepliersList.length}):`}
                                </p>
                                {postRepliersList.slice(0, 3).map((rep: any, idx: number) => {
                                  const repId = String(rep.senderId || rep.sender_id || rep.helperId || '').trim();
                                  const repName = rep.senderName || rep.sender_name || rep.helperName || 'Community Helper';
                                  const repMsg = rep.lastMessage || rep.last_message || rep.text || rep.message || '';
                                  return (
                                    <div
                                      key={rep.id || `${repId}_${idx}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveBottomModal(null);
                                        onOpenChat({
                                          ...post,
                                          selectedReplierId: repId || undefined,
                                          selectedReplierName: repName,
                                          selectedReplierEmail: rep.senderEmail || rep.helperEmail || undefined,
                                          selectedReplierAvatar: rep.senderAvatar || rep.helperAvatar || undefined
                                        });
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/80 flex items-center justify-between gap-2 cursor-pointer"
                                    >
                                      <div className="min-w-0">
                                        <span className="text-[11px] font-black text-slate-900">{repName}: </span>
                                        <span className="text-[11px] font-bold text-slate-700">{repMsg}</span>
                                      </div>
                                      <span className="text-[10px] font-black text-blue-700 shrink-0">
                                        {language === 'GU' ? 'ચેટ →' : 'Chat →'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                <span className="truncate">{formatPostLocationDisplay(post)}</span>
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenDeletePostConfirm(e, post)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                  title={language === 'GU' ? 'પોસ્ટ ડિલીટ કરો' : language === 'HI' ? 'पोस्ट डिलीट करें' : 'Delete Post'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{language === 'GU' ? 'ડિલીટ' : language === 'HI' ? 'डिलीट' : 'Delete'}</span>
                                </button>
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
                                  <span>
                                    {language === 'GU'
                                      ? `જવાબ જુઓ${respCount > 0 ? ` (${respCount})` : ''}`
                                      : `View Chat${respCount > 0 ? ` (${respCount})` : ''}`}
                                  </span>
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
                          onClick={handleTriggerCreatePost}
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
                ) : bookingsSubTab === 'my_used_items' ? (
                  myUsedItemsList.length === 0 ? (
                    <div className="py-8 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 mx-auto flex items-center justify-center text-2xl">
                        🛍️
                      </div>
                      <h4 className="text-sm font-black text-slate-900">
                        {language === 'GU'
                          ? 'તમે હજુ કોઈ જૂની વસ્તુ વેચવા મૂકી નથી'
                          : language === 'HI'
                          ? 'आपने अभी कोई पुरानी वस्तु बेचने के लिए नहीं डाली है'
                          : 'No Used Items Listed by You Yet'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        {language === 'GU'
                          ? 'તમારી જૂની બાઈક, મોબાઈલ, ફર્નિચર કે અન્ય ઘરવખરી વેચવા માટે અહીંથી મૂકો.'
                          : language === 'HI'
                          ? 'अपनी पुरानी बाइक, मोबाइल, फर्नीचर या अन्य सामान बेचने के लिए यहाँ से डालें।'
                          : 'List your old bike, mobile, furniture or household items for sale.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBottomModal(null);
                          onSelectCategory('buy_sell_main');
                          onNavigate('categories');
                        }}
                        style={{ backgroundColor: '#0284C7', color: '#ffffff' }}
                        className="px-4 py-2.5 rounded-xl text-xs font-black shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>
                          {language === 'GU'
                            ? 'જૂની વસ્તુની લે-વેચ ખોલો'
                            : language === 'HI'
                            ? 'पुरानी वस्तु खरीदें-बेचें खोलें'
                            : 'Open Buy & Sell Used Items'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {myUsedItemsList.map((item) => {
                        const thumb = Array.isArray(item.photos) && item.photos.length > 0 ? item.photos[0] : '';
                        const isBusy = busyUsedItemId === item.id;
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                          >
                            <div className="flex items-start gap-3">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={item.title}
                                  referrerPolicy="no-referrer"
                                  className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                                  <ShoppingBag className="w-6 h-6" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-1">
                                    {item.title}
                                  </h4>
                                  <span className="text-xs sm:text-sm font-black text-emerald-700 tabular-nums shrink-0">
                                    ₹{new Intl.NumberFormat('en-IN').format(Math.max(0, Math.round(item.price || 0)))}
                                  </span>
                                </div>
                                <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                                  <span className="truncate">
                                    {item.area}
                                    {item.city ? `, ${item.city}` : ''}
                                  </span>
                                </p>
                                <div>
                                  {item.status === 'pending' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700">
                                      <Clock className="w-3.5 h-3.5" />
                                      {language === 'GU' ? 'એડમિન એપ્રુવલ બાકી છે' : 'Pending Admin Approval'}
                                    </span>
                                  )}
                                  {item.status === 'approved' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      {language === 'GU' ? 'એપ્રુવ અને લાઈવ' : 'Approved & Live'}
                                    </span>
                                  )}
                                  {item.status === 'rejected' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700">
                                      <XCircle className="w-3.5 h-3.5" />
                                      {language === 'GU' ? 'એડમિન દ્વારા નામંજૂર' : 'Rejected by Admin'}
                                    </span>
                                  )}
                                  {item.status === 'sold' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-700">
                                      <Tag className="w-3.5 h-3.5" />
                                      {language === 'GU' ? 'વેચાઈ ગયેલ (Sold)' : 'Marked as Sold'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                              {confirmDeleteUsedItemId === item.id ? (
                                <div className="flex items-center gap-2 w-full">
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={async () => {
                                      setBusyUsedItemId(item.id);
                                      const ok = await deleteUsedItemListing(item.id);
                                      setBusyUsedItemId(null);
                                      setConfirmDeleteUsedItemId(null);
                                      if (ok) {
                                        setMyUsedItemsList((prev) => prev.filter((x) => x.id !== item.id));
                                        showPostToast(
                                          language === 'GU' ? '🗑️ વસ્તુ ડિલીટ થઈ ગઈ!' : '🗑️ Item deleted!'
                                        );
                                      }
                                    }}
                                    className="flex-1 py-1.5 px-3 rounded-xl bg-rose-600 text-white text-xs font-black cursor-pointer"
                                  >
                                    {isBusy ? '...' : language === 'GU' ? 'હા, ડિલીટ કરો' : 'Confirm Delete'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteUsedItemId(null)}
                                    className="py-1.5 px-3 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                                  >
                                    {language === 'GU' ? 'રદ' : 'Cancel'}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    {(item.status === 'approved' || (item.status === 'sold' && item.wasApproved)) && (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={async () => {
                                          setBusyUsedItemId(item.id);
                                          const nextSt = item.status === 'sold' ? 'approved' : 'sold';
                                          const res = await updateUsedItemStatus(item.id, nextSt);
                                          setBusyUsedItemId(null);
                                          if (res.success && res.item) {
                                            setMyUsedItemsList((prev) =>
                                              prev.map((x) => (x.id === item.id ? res.item! : x))
                                            );
                                          }
                                        }}
                                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-black cursor-pointer"
                                      >
                                        {item.status === 'sold'
                                          ? language === 'GU'
                                            ? 'ફરી ઉપલબ્ધ કરો'
                                            : 'Mark Available'
                                          : language === 'GU'
                                          ? 'વેચાઈ ગયું'
                                          : 'Mark Sold'}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => setConfirmDeleteUsedItemId(item.id)}
                                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>{language === 'GU' ? 'ડિલીટ' : 'Delete'}</span>
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveBottomModal(null);
                                      onSelectCategory('buy_sell_main');
                                      onNavigate('categories');
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>{language === 'GU' ? 'લે-વેચમાં જુઓ' : 'Open Market'}</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBottomModal(null);
                            onSelectCategory('buy_sell_main');
                            onNavigate('categories');
                          }}
                          className="w-full py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-black cursor-pointer"
                        >
                          ➕ {language === 'GU' ? 'નવી જૂની વસ્તુ વેચવા મૂકો' : 'Sell Another Used Item'}
                        </button>
                      </div>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* FAVORITES FULL-SCREEN PAGE (પસંદીદા)                                   */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {activeBottomModal === 'favorites' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 41,
              backgroundColor: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Full-Page Top Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #F43F5E 0%, #DB2777 100%)',
                color: '#ffffff',
                paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
                paddingBottom: '12px',
                paddingLeft: '14px',
                paddingRight: '14px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  maxWidth: '896px',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => setActiveBottomModal(null)}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer shrink-0 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="text-sm sm:text-base font-black leading-tight m-0 flex items-center gap-1.5 truncate">
                      <Heart className="w-4 h-4 fill-white shrink-0" />
                      <span className="truncate">
                        {language === 'GU'
                          ? 'પસંદીદા સેવા પ્રદાતાઓ'
                          : language === 'HI'
                          ? 'पसंदीदा सेवा प्रदाता'
                          : 'Favorite Service Providers'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-rose-100 font-medium m-0 truncate">
                      {language === 'GU'
                        ? 'તમે પસંદ કરેલા કારીગરો અને સર્વિસ એક્સપર્ટ્સ'
                        : language === 'HI'
                        ? 'आपके द्वारा सेव किए गए पसंदीदा कारीगर'
                        : 'Your saved local service providers'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-Page Body Container */}
            <div
              style={{
                width: '100%',
                maxWidth: '896px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                backgroundColor: '#ffffff'
              }}
            >
              <div
                className="p-4 overflow-y-auto flex-1 space-y-3"
                style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
              >
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
            </div>
          </motion.div>
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

      {/* Delete Post Confirmation Modal */}
      <AnimatePresence>
        {postToDeleteConfirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9900,
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-rose-200 flex flex-col gap-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {language === 'GU'
                    ? 'પોસ્ટ ડિલીટ કરવી છે?'
                    : language === 'HI'
                    ? 'पोस्ट डिलीट करें?'
                    : 'Delete Post?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {language === 'GU'
                    ? 'આ પોસ્ટ બધા ફોન પરથી કાયમ માટે ડિલીટ થઈ જશે.'
                    : language === 'HI'
                    ? 'यह पोस्ट सभी फ़ोन से हमेशा के लिए हट जाएगी।'
                    : 'This post will be permanently deleted for everyone.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isDeletingPost}
                  onClick={() => setPostToDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  {language === 'GU' ? 'રદ કરો' : language === 'HI' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isDeletingPost}
                  onClick={() => executeServerDeletePost(postToDeleteConfirm)}
                  style={{ backgroundColor: '#E11D48', color: '#ffffff' }}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isDeletingPost
                    ? language === 'GU'
                      ? 'ડિલીટ થાય છે...'
                      : 'Deleting...'
                    : language === 'GU'
                    ? 'હા, ડિલીટ કરો'
                    : language === 'HI'
                    ? 'हाँ, डिलीट करें'
                    : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Status Toast */}
      <AnimatePresence>
        {deleteToast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            style={{
              position: 'fixed',
              bottom: '76px',
              left: '16px',
              right: '16px',
              zIndex: 9950,
              maxWidth: '420px',
              margin: '0 auto',
              backgroundColor: deleteToast.isError ? '#E11D48' : '#059669',
              color: '#ffffff'
            }}
            className="px-4 py-2.5 rounded-2xl shadow-xl text-xs font-black text-center"
          >
            {deleteToast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* FIXED BOTTOM NAVIGATION BAR (હોમ | પોસ્ટ / બુકિંગ | પસંદીદા | સંદેશ | પ્રોફાઈલ) */}
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
          zIndex: 42,
          background: 'linear-gradient(90deg, #EFF6FF 0%, #FFF7ED 25%, #FFF1F2 50%, #ECFDF5 75%, #F5F3FF 100%)',
          borderTop: '2px solid #93C5FD',
          boxShadow: '0 -6px 22px rgba(15, 23, 42, 0.14)',
          paddingTop: '5px',
          paddingLeft: '6px',
          paddingRight: '6px',
          paddingBottom: 'calc(5px + env(safe-area-inset-bottom, 0px))',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: '4px',
            alignItems: 'center',
            width: '100%',
            maxWidth: '896px',
            margin: '0 auto'
          }}
        >
          {/* 1. હોમ (Home — Royal Blue Theme) */}
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
              padding: '4px 2px',
              borderRadius: '12px',
              border: isHomeActive ? '1px solid #93C5FD' : '1px solid transparent',
              background: isHomeActive ? '#DBEAFE' : 'rgba(255, 255, 255, 0.65)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '26px',
                borderRadius: '9px',
                backgroundColor: isHomeActive ? '#2563EB' : '#DBEAFE',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isHomeActive ? '0 2px 6px rgba(37, 99, 235, 0.35)' : 'none'
              }}
            >
              <Home
                style={{
                  width: '17px',
                  height: '17px',
                  color: isHomeActive ? '#FFFFFF' : '#1D4ED8',
                  strokeWidth: 2.4
                }}
              />
            </div>
            <span
              style={{
                fontSize: '10.5px',
                marginTop: '3px',
                lineHeight: 1.1,
                fontWeight: 900,
                color: isHomeActive ? '#1E40AF' : '#1E3A8A',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'GU' ? 'હોમ' : language === 'HI' ? 'होम' : 'Home'}
            </span>
          </button>

          {/* 2. પોસ્ટ / બુકિંગ (Posts & Bookings — Vibrant Orange Theme) */}
          <button
            type="button"
            onClick={() => {
              setIsMoreMenuOpen(false);
              setActiveBottomModal('posts');
            }}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 2px',
              borderRadius: '12px',
              border: isPostsActive || isBookingsActive ? '1px solid #FDBA74' : '1px solid transparent',
              background: isPostsActive || isBookingsActive ? '#FFEDD5' : 'rgba(255, 255, 255, 0.65)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '32px',
                height: '26px',
                borderRadius: '9px',
                backgroundColor: isPostsActive || isBookingsActive ? '#EA580C' : '#FFEDD5',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isPostsActive || isBookingsActive ? '0 2px 6px rgba(234, 88, 12, 0.35)' : 'none'
              }}
            >
              <Megaphone
                style={{
                  width: '17px',
                  height: '17px',
                  color: isPostsActive || isBookingsActive ? '#FFFFFF' : '#EA580C',
                  strokeWidth: 2.4
                }}
              />
              {filteredLivePosts.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-8px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 3.5px',
                    borderRadius: '9999px',
                    backgroundColor: '#DC2626',
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
                fontSize: '9.5px',
                letterSpacing: '-0.2px',
                marginTop: '3px',
                lineHeight: 1.1,
                fontWeight: 900,
                color: isPostsActive || isBookingsActive ? '#9A3412' : '#C2410C',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
                textAlign: 'center'
              }}
            >
              {language === 'GU' ? 'પોસ્ટ-બુકિંગ' : language === 'HI' ? 'पोस्ट-बुकिंग' : 'Posts'}
            </span>
          </button>

          {/* 3. પસંદીદા (Favorites — Rose Pink Theme) */}
          <button
            type="button"
            onClick={() => {
              setIsMoreMenuOpen(false);
              setActiveBottomModal('favorites');
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 2px',
              borderRadius: '12px',
              border: isFavoritesActive ? '1px solid #FDA4AF' : '1px solid transparent',
              background: isFavoritesActive ? '#FFE4E6' : 'rgba(255, 255, 255, 0.65)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '26px',
                borderRadius: '9px',
                backgroundColor: isFavoritesActive ? '#E11D48' : '#FFE4E6',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isFavoritesActive ? '0 2px 6px rgba(225, 29, 72, 0.35)' : 'none'
              }}
            >
              <Heart
                style={{
                  width: '17px',
                  height: '17px',
                  color: isFavoritesActive ? '#FFFFFF' : '#E11D48',
                  strokeWidth: 2.4
                }}
              />
            </div>
            <span
              style={{
                fontSize: '10.5px',
                marginTop: '3px',
                lineHeight: 1.1,
                fontWeight: 900,
                color: isFavoritesActive ? '#9F1239' : '#BE123C',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'GU' ? 'પસંદીદા' : language === 'HI' ? 'पसंदीदा' : 'Favorites'}
            </span>
          </button>

          {/* 4. સંદેશ (Messages — Emerald Green Theme) */}
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
              padding: '4px 2px',
              borderRadius: '12px',
              border: isChatActive || unreadChatCount > 0 ? '1px solid #6EE7B7' : '1px solid transparent',
              background: isChatActive || unreadChatCount > 0 ? '#D1FAE5' : 'rgba(255, 255, 255, 0.65)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '32px',
                height: '26px',
                borderRadius: '9px',
                backgroundColor: isChatActive || unreadChatCount > 0 ? '#059669' : '#D1FAE5',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isChatActive || unreadChatCount > 0 ? '0 2px 6px rgba(5, 150, 105, 0.35)' : 'none'
              }}
            >
              <MessageSquare
                style={{
                  width: '17px',
                  height: '17px',
                  color: isChatActive || unreadChatCount > 0 ? '#FFFFFF' : '#059669',
                  strokeWidth: 2.4
                }}
              />
              {unreadChatCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-8px',
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
                fontSize: '10.5px',
                marginTop: '3px',
                lineHeight: 1.1,
                fontWeight: 900,
                color: isChatActive || unreadChatCount > 0 ? '#065F46' : '#047857',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'GU' ? 'સંદેશ' : language === 'HI' ? 'संदेश' : 'Messages'}
            </span>
          </button>

          {/* 5. પ્રોફાઈલ (Profile — Indigo Purple Theme) */}
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
              padding: '4px 2px',
              borderRadius: '12px',
              border: isMoreActive ? '1px solid #C4B5FD' : '1px solid transparent',
              background: isMoreActive ? '#EDE9FE' : 'rgba(255, 255, 255, 0.65)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '26px',
                borderRadius: '9px',
                backgroundColor: isMoreActive ? '#7C3AED' : '#EDE9FE',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isMoreActive ? '0 2px 6px rgba(124, 58, 237, 0.35)' : 'none'
              }}
            >
              <User
                style={{
                  width: '17px',
                  height: '17px',
                  color: isMoreActive ? '#FFFFFF' : '#7C3AED',
                  strokeWidth: 2.4
                }}
              />
            </div>
            <span
              style={{
                fontSize: '10.5px',
                marginTop: '3px',
                lineHeight: 1.1,
                fontWeight: 900,
                color: isMoreActive ? '#5B21B6' : '#6D28D9',
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
