import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, User, Camera, MapPin, Briefcase, Award, CheckCircle2, Star, Wrench, 
  ChevronRight, Trash2, Store, Mail, CloudCheck, Sparkles, ShieldCheck, Lock, 
  FileCheck2, ShieldAlert, Check, Building2, Phone, Tag, Upload, AlertCircle, Plus, Search, ExternalLink, Clock, Edit3, LogOut, MessageSquare, RefreshCw
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { 
  getCurrentUser, saveUserProfile, getUserProfile, deleteUserProfile, 
  logoutUser, saveHelper, saveShop, getShops, getHelpers 
} from '../auth';
import { isGuestUser } from '../lib/authUtils';
import IdentityVerificationModal from '../components/IdentityVerificationModal';
import { getVerificationStatus, submitVerification, fetchPostConversations, deleteConversationOnServer, subscribeToRealtimeStream } from '../api';
import { CATEGORIES, getCategoryName, saveFreeHelperProfile, getFreeHelperProfiles, FreeHelperProfile } from '../data/categories';
import { RegisteredShop, SHOP_TYPES } from '../components/RegisterShopModal';
import { applyIdWatermark } from '../lib/watermark';
import { validateUploadedFile, sanitizeText } from '../lib/security';
import { compressImageToWebP } from '../lib/imageCompression';
import { Screen } from '../types';

interface ProfileScreenProps {
  onBack: () => void;
  onNavigate?: (screen: Screen) => void;
  onOpenChat?: (intent: any) => void;
  initialTab?: 'user' | 'helper' | 'business';
}

export default function ProfileScreen({ onBack, onNavigate, onOpenChat, initialTab = 'user' }: ProfileScreenProps) {
  const { language, t, tr } = useLanguage();
  
  // Tab State: 'user' (Simple Profile) | 'helper' (Helper Profile) | 'business' (Business Registration)
  const [activeTab, setActiveTab] = useState<'user' | 'helper' | 'business'>(initialTab);

  // -------------------------------------------------------------
  // TAB 1: SIMPLE USER PROFILE STATES
  // -------------------------------------------------------------
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState(() => {
    try {
      const activeUser = getCurrentUser();
      return activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '';
    } catch (e) {
      return '';
    }
  });
  const [userPhone, setUserPhone] = useState('');
  const [userSkills, setUserSkills] = useState('');
  const [userExp, setUserExp] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [hasExistingUserProfile, setHasExistingUserProfile] = useState(false);
  const [isEditingUserProfile, setIsEditingUserProfile] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected' | 'deletion_requested'>('none');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [closureSubmitted, setClosureSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // 7-DAY RECENT CHATS (MY CHATS) STATE & HANDLERS
  // -------------------------------------------------------------
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [convIdToDelete, setConvIdToDelete] = useState<string | null>(null);

  const loadRecentChats = async (silent = false) => {
    const user = getCurrentUser();
    if (!user || !user.uid || isGuestUser()) {
      setRecentConversations([]);
      return;
    }
    if (!silent) setIsLoadingChats(true);
    try {
      const list = await fetchPostConversations({ userId: user.uid, userEmail: user.email });
      const rawList = Array.isArray(list) ? list : [];

      const myUid = String(user?.uid || '').trim().toLowerCase();
      const myEmail = String(user?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
      const myEmailUid = myEmail ? 'email_' + myEmail.replace(/[^a-z0-9]/g, '_') : '';

      // De-fragment: Group deterministically by (cleanPostId, partnerIdentifier) so 1-on-1 chats never fragment into multiple parts
      const mergedMap = new Map<string, any>();

      for (const conv of rawList) {
        if (!conv) continue;
        const rawConvId = String(conv.conversationId || conv.id || '').trim();
        let parsedPostId = '';
        let parsedHelperId = '';
        if (rawConvId.toLowerCase().startsWith('conv_') && rawConvId.includes('__')) {
          const idx = rawConvId.indexOf('__');
          parsedPostId = rawConvId.slice(5, idx).trim();
          parsedHelperId = rawConvId.slice(idx + 2).trim();
        }

        const cleanPostId = String(conv.postId || conv.post_id || parsedPostId || 'general').trim().toLowerCase();
        const helperIdStr = String(conv.helperId || conv.helper_id || conv.senderId || parsedHelperId || '').trim();
        const helperEmailStr = String(conv.helperEmail || conv.senderEmail || '').trim().toLowerCase();
        const posterIdStr = String(conv.posterId || conv.poster_id || '').trim();
        const posterEmailStr = String(conv.posterEmail || conv.poster_email || '').trim().toLowerCase();

        const helperIdLower = helperIdStr.toLowerCase();
        const isHelperMe = Boolean(
          (myUid && helperIdLower === myUid) ||
          (myEmailUid && helperIdLower === myEmailUid) ||
          (myEmail && (helperEmailStr === myEmail || helperIdLower === myEmail))
        );
        const isOwner = !isHelperMe;

        // Deterministic partner key
        const partnerKey = isOwner
          ? (helperEmailStr || helperIdLower || 'helper')
          : (posterEmailStr || posterIdStr.toLowerCase() || 'owner');

        const dedupKey = `${cleanPostId}:::${partnerKey}`;

        const existing = mergedMap.get(dedupKey);
        const thisTime = new Date(conv.lastMessageAt || conv.last_message_at || conv.updatedAt || 0).getTime();
        const existingTime = existing ? new Date(existing.lastMessageAt || existing.last_message_at || existing.updatedAt || 0).getTime() : 0;

        const convUnread = Number(conv.unreadCount ?? conv.unread_count ?? conv.unreadPosterCount ?? conv.unreadHelperCount ?? 0);

        if (!existing || thisTime >= existingTime) {
          mergedMap.set(dedupKey, {
            ...existing,
            ...conv,
            unreadCount: (existing ? Number(existing.unreadCount || 0) : 0) + convUnread,
            count: Math.max(existing?.count || 1, Number(conv.count || 1))
          });
        } else {
          existing.unreadCount = Number(existing.unreadCount || 0) + convUnread;
        }
      }

      const deduplicatedList = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || a.last_message_at || a.updatedAt || 0).getTime();
        const timeB = new Date(b.lastMessageAt || b.last_message_at || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });

      setRecentConversations(deduplicatedList);

      // Save list of chatted posts to localStorage so HomeScreen visitor knows they participated
      try {
        const chatted: string[] = JSON.parse(localStorage.getItem('locohelp_chatted_post_ids') || '[]');
        let hasNew = false;
        deduplicatedList.forEach(c => {
          const pId = c.postId || c.post_id;
          if (pId && !chatted.includes(pId)) {
            chatted.push(pId);
            hasNew = true;
          }
        });
        if (hasNew) {
          localStorage.setItem('locohelp_chatted_post_ids', JSON.stringify(chatted));
        }
      } catch {}
    } catch {
      if (!silent) setRecentConversations([]);
    } finally {
      if (!silent) setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    loadRecentChats();
    if (activeTab !== 'user') return;
    const unsub = subscribeToRealtimeStream({
      onNewResponse: () => {
        loadRecentChats(true);
      }
    });
    return () => {
      unsub();
    };
  }, [activeTab]);

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeletingChat(true);
    try {
      await deleteConversationOnServer(convId);
      try {
        localStorage.removeItem(`locohelp_chat_${convId}`);
      } catch {}
      setRecentConversations(prev => prev.filter(c => (c.id || c.conversationId) !== convId));
      setConvIdToDelete(null);
    } catch (err) {
      console.warn("Delete conversation error:", err);
    } finally {
      setIsDeletingChat(false);
    }
  };

  const handleOpenConversation = (conv: any) => {
    if (!onOpenChat) return;
    const user = getCurrentUser();
    const myUid = String(user?.uid || '').trim().toLowerCase();
    const myEmail = String(user?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
    const myEmailUid = myEmail ? 'email_' + myEmail.replace(/[^a-z0-9]/g, '_') : '';

    const rawConvId = String(conv.conversationId || conv.id || '').trim();
    let parsedPostId = '';
    let parsedHelperId = '';
    if (rawConvId.toLowerCase().startsWith('conv_') && rawConvId.includes('__')) {
      const idx = rawConvId.indexOf('__');
      parsedPostId = rawConvId.slice(5, idx).trim();
      parsedHelperId = rawConvId.slice(idx + 2).trim();
    }

    const cleanPostId = String(conv.postId || conv.post_id || parsedPostId || 'general').trim();
    const posterIdStr = String(conv.posterId || conv.poster_id || '').trim();
    const posterEmailStr = String(conv.posterEmail || conv.poster_email || '').trim().toLowerCase();
    const helperIdStr = String(conv.helperId || conv.helper_id || conv.senderId || parsedHelperId || '').trim();
    const helperEmailStr = String(conv.helperEmail || conv.senderEmail || '').trim().toLowerCase();

    const helperIdLower = helperIdStr.toLowerCase();
    const isHelperMe = Boolean(
      (myUid && helperIdLower === myUid) ||
      (myEmailUid && helperIdLower === myEmailUid) ||
      (myEmail && (helperEmailStr === myEmail || helperIdLower === myEmail))
    );
    // In a user's 1-on-1 chat inbox, if the logged-in user is not the helper, they are the post owner
    const isOwner = !isHelperMe;

    const partnerName = isOwner
      ? (conv.helperName || conv.senderName || (helperEmailStr ? helperEmailStr.split('@')[0] : 'Community Helper'))
      : (conv.posterName || (posterEmailStr ? posterEmailStr.split('@')[0] : 'Post Owner'));

    const resolvedConvId =
      rawConvId && rawConvId.toLowerCase().startsWith('conv_')
        ? rawConvId
        : `conv_${cleanPostId}__${helperIdLower}`;

    const intentPayload: any = {
      id: cleanPostId,
      title: conv.category || 'Local Request',
      description: conv.lastMessage || conv.last_message || 'Direct Chat',
      category: conv.category || 'General',
      authorId: isOwner ? (user?.uid || posterIdStr) : (posterIdStr || 'post_owner'),
      authorEmail: isOwner ? (myEmail || posterEmailStr) : posterEmailStr,
      authorName: isOwner ? (user?.displayName || conv.posterName || 'You') : partnerName,
      helperId: helperIdStr,
      selectedReplierId: helperIdStr,
      selectedReplierName: partnerName,
      conversationId: resolvedConvId
    };

    const targetConvId = conv.id || conv.conversationId || resolvedConvId;
    try {
      localStorage.setItem(`locohelp_last_viewed_conv_${targetConvId}`, new Date().toISOString());
      localStorage.setItem(`locohelp_last_viewed_conv_${resolvedConvId}`, new Date().toISOString());
      localStorage.setItem(`locohelp_seen_responses_${cleanPostId}`, '999');
      window.dispatchEvent(new CustomEvent('locohelp_responses_seen', { detail: { intentId: cleanPostId } }));
      setRecentConversations(prev =>
        prev.map(c => ((c.id === conv.id || c.conversationId === conv.conversationId || c.postId === cleanPostId)
          ? { ...c, unreadCount: 0, isRead: true }
          : c))
      );
    } catch {}

    onOpenChat(intentPayload);
  };

  // -------------------------------------------------------------
  // TAB 2: HELPER PROFILE FORM STATES
  // -------------------------------------------------------------
  const [helperName, setHelperName] = useState('');
  const [helperCategory, setHelperCategory] = useState('plumber');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [helperPhone, setHelperPhone] = useState('');
  const [helperArea, setHelperArea] = useState('');
  const [helperExp, setHelperExp] = useState('1 Year');
  const [helperSkills, setHelperSkills] = useState('');
  const [helperWorkPhoto, setHelperWorkPhoto] = useState<string | null>(null);
  const [helperIdFrontDoc, setHelperIdFrontDoc] = useState<string | null>(null);
  const [helperIdFrontName, setHelperIdFrontName] = useState<string | null>(null);
  const [helperIdBackDoc, setHelperIdBackDoc] = useState<string | null>(null);
  const [helperIdBackName, setHelperIdBackName] = useState<string | null>(null);
  const [isSubmittingHelper, setIsSubmittingHelper] = useState(false);
  const [showApprovalNoticeModal, setShowApprovalNoticeModal] = useState(false);
  const [myHelperProfile, setMyHelperProfile] = useState<any>(null);
  const [isEditingHelperProfile, setIsEditingHelperProfile] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: BUSINESS REGISTRATION FORM & LIST STATES
  // -------------------------------------------------------------
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('shop');
  const [customShopType, setCustomShopType] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopTimings, setShopTimings] = useState('9:00 AM - 9:00 PM');
  const [shopArea, setShopArea] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [shopPhoto, setShopPhoto] = useState<string | null>(null);
  const [shopPhotos, setShopPhotos] = useState<string[]>([]);
  const [shopIdDoc, setShopIdDoc] = useState<string | null>(null);
  const [shopIdDocName, setShopIdDocName] = useState<string | null>(null);
  const [isWatermarkingShopId, setIsWatermarkingShopId] = useState(false);
  const [isSubmittingShop, setIsSubmittingShop] = useState(false);
  const [shopSubmitSuccess, setShopSubmitSuccess] = useState(false);
  const [myBusinessProfile, setMyBusinessProfile] = useState<RegisteredShop | null>(null);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [registeredShopsList, setRegisteredShopsList] = useState<RegisteredShop[]>([]);
  const [shopSearchQuery, setShopSearchQuery] = useState('');

  // Push history state when internal modals open
  useEffect(() => {
    if (showApprovalNoticeModal || isVerificationModalOpen || showDeleteConfirm) {
      try {
        window.history.pushState({ locohelpScreen: 'profile', locohelpModal: true }, '');
      } catch (e) {}
    }
  }, [showApprovalNoticeModal, isVerificationModalOpen, showDeleteConfirm]);

  // Listen for hardware Back button to close internal modals first
  useEffect(() => {
    const handleCloseModal = (e: Event) => {
      if (showApprovalNoticeModal) {
        e.preventDefault();
        setShowApprovalNoticeModal(false);
        return;
      }
      if (isVerificationModalOpen) {
        e.preventDefault();
        setIsVerificationModalOpen(false);
        return;
      }
      if (showDeleteConfirm) {
        e.preventDefault();
        setShowDeleteConfirm(false);
        return;
      }
    };
    window.addEventListener('locohelp_close_active_modal', handleCloseModal);
    return () => window.removeEventListener('locohelp_close_active_modal', handleCloseModal);
  }, [showApprovalNoticeModal, isVerificationModalOpen, showDeleteConfirm]);

  const populateHelperForm = (prof: any) => {
    if (!prof) return;
    if (prof.name) setHelperName(prof.name);
    if (prof.categoryId) setHelperCategory(prof.categoryId);
    if (prof.customCategoryName) setCustomCategoryName(prof.customCategoryName);
    if (prof.phone) setHelperPhone(prof.phone);
    if (prof.area) setHelperArea(prof.area);
    if (prof.experience) setHelperExp(prof.experience);
    if (prof.skills) {
      setHelperSkills(Array.isArray(prof.skills) ? prof.skills.join(', ') : String(prof.skills));
    }
  };

  // -------------------------------------------------------------
  // INITIAL DATA LOADING
  // -------------------------------------------------------------
  useEffect(() => {
    const activeUser = getCurrentUser();
    const phoneFromUser = activeUser?.phone || (activeUser?.uid?.startsWith('phone_') ? activeUser.uid.replace('phone_', '') : '');
    const userKey = activeUser?.uid || (phoneFromUser ? `phone_${phoneFromUser}` : 'guest');
    const cleanEmail = (activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
    const cleanPhone = (phoneFromUser || '').replace(/\D/g, '');

    if (phoneFromUser) {
      setUserPhone(phoneFromUser);
      setHelperPhone(phoneFromUser);
      setShopPhone(phoneFromUser);
    }

    if (activeUser?.displayName && activeUser.displayName !== 'Guest') {
      setUserName(activeUser.displayName);
      setHelperName(activeUser.displayName);
      setOwnerName(activeUser.displayName);
    }

    if (cleanEmail) {
      setUserEmail(cleanEmail);
    }

    // Load cached profile & existing helper profile linked to user
    let foundHelper: any = null;
    try {
      const userScopedRaw = localStorage.getItem(`locohelp_user_profile_${userKey}`);
      if (userScopedRaw) {
        const userScoped = JSON.parse(userScopedRaw);
        const loadedName = userScoped.name || userScoped.full_name || '';
        if (loadedName) {
          setUserName(loadedName);
          setHasExistingUserProfile(true);
        }
        if (userScoped.phone) setUserPhone(userScoped.phone);
        if (userScoped.email) setUserEmail(userScoped.email);
        if (userScoped.skills) setUserSkills(userScoped.skills);
        if (userScoped.exp || userScoped.experience) setUserExp(userScoped.exp || userScoped.experience);
        if (userScoped.address) {
          setUserAddress(userScoped.address);
          setHelperArea(userScoped.address);
          setShopArea(userScoped.address);
        }
        const candidateLocalPhoto = userScoped.profilePhoto || userScoped.avatar_url || '';
        if (candidateLocalPhoto && candidateLocalPhoto !== 'https://lh3.googleusercontent.com/a/default-user') {
          setProfilePhoto(candidateLocalPhoto);
        }
        if (userScoped.myHelperProfile) {
          foundHelper = userScoped.myHelperProfile;
        }
      } else {
        const savedName = localStorage.getItem('locohelp_profile_name');
        if (savedName) {
          setUserName(savedName);
          setHasExistingUserProfile(true);
        }
        const savedSkills = localStorage.getItem('locohelp_profile_skills');
        if (savedSkills) setUserSkills(savedSkills);
        const savedAddress = localStorage.getItem('locohelp_profile_address');
        if (savedAddress) setUserAddress(savedAddress);
        const savedExp = localStorage.getItem('locohelp_profile_exp');
        if (savedExp) setUserExp(savedExp);
        const savedPhoto = localStorage.getItem('locohelp_profile_photo');
        if (savedPhoto && savedPhoto !== 'https://lh3.googleusercontent.com/a/default-user') {
          setProfilePhoto(savedPhoto);
        }
      }

      if (!foundHelper) {
        const allLocalHelpers = getFreeHelperProfiles(true);
        foundHelper = allLocalHelpers.find(h =>
          (cleanEmail && (h.email || '').toLowerCase() === cleanEmail) ||
          (userKey && userKey !== 'guest' && h.userId === userKey) ||
          (cleanPhone && (h.phone || '').replace(/\D/g, '') === cleanPhone)
        ) || null;
      }

      if (!foundHelper) {
        const helperData = localStorage.getItem('locohelp_my_helper_profile');
        if (helperData) {
          const parsed = JSON.parse(helperData);
          if (parsed && parsed.name) {
            const pEmail = (parsed.email || '').toLowerCase();
            if (!pEmail || !cleanEmail || pEmail === cleanEmail) {
              foundHelper = parsed;
            }
          }
        }
      }

      if (foundHelper) {
        setMyHelperProfile(foundHelper);
        populateHelperForm(foundHelper);
        setHasExistingUserProfile(true);
      }
    } catch (e) {}

    // Cloud profile load
    const loadProfile = async () => {
      try {
        if (!userKey || userKey === 'guest') return;
        const data = await getUserProfile(userKey);
        if (data) {
          if (data.full_name || data.name) {
            setUserName(data.full_name || data.name);
            setHasExistingUserProfile(true);
          }
          if (data.phone) setUserPhone(data.phone);
          if (data.email) setUserEmail(data.email);
          if (data.skills) setUserSkills(data.skills);
          if (data.address) setUserAddress(data.address);
          if (data.experience || data.exp) setUserExp(data.experience || data.exp);
          const remotePhoto = data.avatar_url || data.profilePhoto || '';
          if (remotePhoto && remotePhoto !== 'https://lh3.googleusercontent.com/a/default-user') {
            setProfilePhoto(remotePhoto);
            try {
              localStorage.setItem('locohelp_profile_photo', remotePhoto);
            } catch {}
          }
          if (data.myHelperProfile) {
            setMyHelperProfile(data.myHelperProfile);
            populateHelperForm(data.myHelperProfile);
            setHasExistingUserProfile(true);
          }

          localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(data));
        }
      } catch (err) {
        console.warn("Profile sync notice:", err);
      }
    };
    loadProfile();

    // Sync Helper Profile from Server (including latest Admin approval status)
    getHelpers(true).then(serverHelpers => {
      if (Array.isArray(serverHelpers)) {
        const matched = serverHelpers.find((h: any) =>
          (foundHelper && h.id === foundHelper.id) ||
          (cleanEmail && (h.email || '').toLowerCase() === cleanEmail) ||
          (userKey && userKey !== 'guest' && h.userId === userKey) ||
          (cleanPhone && (h.phone || '').replace(/\D/g, '') === cleanPhone)
        );
        if (matched) {
          setMyHelperProfile(matched);
          populateHelperForm(matched);
          setHasExistingUserProfile(true);
          if (matched.isVerified || matched.status === 'approved') {
            setVerificationStatus('approved');
          } else if (matched.status === 'pending') {
            setVerificationStatus('pending');
          }
          try {
            localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(matched));
          } catch (e) {}
        } else if (foundHelper) {
          setMyHelperProfile(null);
          try {
            localStorage.removeItem('locohelp_my_helper_profile');
          } catch (e) {}
        }
      }
    }).catch(() => {});

    // Check Verification Status
    const checkId = foundHelper?.id || (userKey !== 'guest' ? userKey : '');
    if (checkId) {
      getVerificationStatus(checkId).then(res => {
        if (res.status === 'deletion_requested') {
          setVerificationStatus('deletion_requested');
        } else if (res.isVerified || res.status === 'approved') {
          setVerificationStatus('approved');
          setMyHelperProfile((prev: any) => prev ? { ...prev, isVerified: true, status: 'approved' } : prev);
        } else if (res.status === 'pending') {
          setVerificationStatus('pending');
        } else if (res.status === 'rejected') {
          setVerificationStatus('rejected');
        }
      }).catch(() => {});
    }

    // Load registered shops
    loadShops(userKey, cleanEmail, cleanPhone);
  }, []);

  const loadShops = (userKey?: string, cleanEmail?: string, cleanPhone?: string) => {
    try {
      const myBizRaw = localStorage.getItem('locohelp_my_business_profile');
      if (myBizRaw) {
        const parsedBiz = JSON.parse(myBizRaw);
        if (parsedBiz && parsedBiz.name) {
          setMyBusinessProfile(parsedBiz);
        }
      }
    } catch (e) {}

    // Fetch all shops to check user's own business status + filter public directory to approved only
    getShops(true).then((cloudShops) => {
      if (Array.isArray(cloudShops)) {
        const approvedOnly = cloudShops.filter(s => s && s.id && !String(s.id).startsWith('sample_shop_') && (s.isVerified === true || s.status === 'approved'));
        setRegisteredShopsList(approvedOnly);
        try {
          localStorage.setItem('locohelp_registered_shops', JSON.stringify(approvedOnly));
        } catch (e) {}

        if (cleanEmail || userKey || cleanPhone) {
          const matchedMyShop = cloudShops.find((s: any) =>
            (cleanEmail && (s.ownerEmail || '').toLowerCase() === cleanEmail) ||
            (userKey && userKey !== 'guest' && s.userId === userKey) ||
            (cleanPhone && (s.phone || '').replace(/\D/g, '') === cleanPhone)
          );
          if (matchedMyShop) {
            setMyBusinessProfile(matchedMyShop);
            try {
              localStorage.setItem('locohelp_my_business_profile', JSON.stringify(matchedMyShop));
            } catch (e) {}
          } else {
            setMyBusinessProfile(null);
            try {
              localStorage.removeItem('locohelp_my_business_profile');
            } catch (e) {}
          }
        }
      }
    }).catch(() => {});
  };

  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);
  const [photoSavedMsg, setPhotoSavedMsg] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // -------------------------------------------------------------
  // TAB 1 ACTIONS: SAVE SIMPLE PROFILE & PHOTO
  // -------------------------------------------------------------
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadErrorMsg(null);
      setPhotoSavedMsg(null);
      const check = await validateUploadedFile(file, { allowPdf: false });
      if (!check.valid) {
        setUploadErrorMsg(check.error || 'Only safe JPEG, PNG, or WebP images are allowed.');
        e.target.value = '';
        return;
      }
      setIsUploadingPhoto(true);
      try {
        const base64String = await compressImageToWebP(file, { maxWidth: 800, quality: 0.8, folder: 'profiles' });
        setProfilePhoto(base64String);

        const activeUser = getCurrentUser();
        const phoneFromUser = userPhone.replace(/\D/g, '') || activeUser?.phone || '';
        const cleanEmail = (userEmail || activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
        const userKey = activeUser?.uid || (phoneFromUser ? `phone_${phoneFromUser}` : (cleanEmail || 'guest'));
        const resolvedName = userName || myHelperProfile?.name || activeUser?.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Community Member');

        try {
          localStorage.setItem('locohelp_profile_photo', base64String);
          const userScopedRaw = localStorage.getItem(`locohelp_user_profile_${userKey}`);
          const userScoped = userScopedRaw ? JSON.parse(userScopedRaw) : {};
          userScoped.profilePhoto = base64String;
          userScoped.avatar_url = base64String;
          if (!userScoped.full_name) userScoped.full_name = resolvedName;
          if (!userScoped.email && cleanEmail) userScoped.email = cleanEmail;
          localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(userScoped));

          if (activeUser) {
            localStorage.setItem(
              'locohelp_user',
              JSON.stringify({
                ...activeUser,
                photoURL: base64String
              })
            );
          }
        } catch (err) {}

        try {
          if (userKey && userKey !== 'guest') {
            await saveUserProfile({
              uid: userKey,
              full_name: resolvedName,
              name: resolvedName,
              email: cleanEmail,
              phone: userPhone || phoneFromUser,
              skills: userSkills,
              address: userAddress,
              experience: userExp,
              avatar_url: base64String,
              image_url: base64String,
              profilePhoto: base64String,
              myHelperProfile
            });
          }
        } catch (err) {}

        setPhotoSavedMsg(tr('✅ Profile photo uploaded & saved!', '✅ प्रोफाइल फोटो सफलतापूर्वक अपलोड और सेव हो गई!', '✅ પ્રોફાઈલ ફોટો સફળતાપૂર્વક અપલોડ અને સેવ થઈ ગયો!'));
        setTimeout(() => setPhotoSavedMsg(null), 4000);
      } catch {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          setProfilePhoto(base64String);
          try {
            localStorage.setItem('locohelp_profile_photo', base64String);
          } catch {}
          setPhotoSavedMsg('✅ प्रोफाइल फोटो सेव हो गई!');
          setTimeout(() => setPhotoSavedMsg(null), 4000);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploadingPhoto(false);
        if (e.target) e.target.value = '';
      }
    }
  };

  const handleSaveSimpleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeUser = getCurrentUser();
    const cleanPhone = userPhone.replace(/\D/g, '') || activeUser?.phone || '';
    const userKey = activeUser?.uid || (cleanPhone ? `phone_${cleanPhone}` : 'guest');

    const safeName = sanitizeText(userName, 120);
    const safeSkills = sanitizeText(userSkills, 500);
    const safeAddress = sanitizeText(userAddress, 300);
    const safeExp = sanitizeText(userExp, 120);

    // Requirement 3: When an already approved user edits profile details, revert status to 'pending' so it requires Admin re-approval
    const newStatus = 'pending';
    const newIsVerified = false;
    const updatedHelper = myHelperProfile
      ? { ...myHelperProfile, isVerified: false, status: 'pending' }
      : null;

    const profileData = {
      uid: userKey,
      full_name: safeName || (cleanPhone ? `User ${cleanPhone.slice(-4)}` : 'Community User'),
      email: sanitizeText(userEmail || activeUser?.email || '', 150),
      phone: sanitizeText(userPhone || cleanPhone, 30),
      skills: safeSkills,
      address: safeAddress,
      experience: safeExp,
      avatar_url: profilePhoto,
      myHelperProfile: updatedHelper,
      status: newStatus,
      isVerified: newIsVerified,
      updated_at: new Date().toISOString()
    };

    setVerificationStatus('pending');
    if (updatedHelper) {
      setMyHelperProfile(updatedHelper);
    }

    try {
      localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(profileData));
      localStorage.setItem('locohelp_profile_name', safeName);
      localStorage.setItem('locohelp_profile_skills', safeSkills);
      localStorage.setItem('locohelp_profile_address', safeAddress);
      localStorage.setItem('locohelp_profile_exp', safeExp);
      if (profileData.email) localStorage.setItem('locohelp_last_logged_in_email', profileData.email);
      if (profilePhoto) localStorage.setItem('locohelp_profile_photo', profilePhoto);
      if (updatedHelper) {
        localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(updatedHelper));
      }

      const current = getCurrentUser();
      localStorage.setItem('locohelp_user', JSON.stringify({
        ...current,
        uid: userKey,
        displayName: safeName || current?.displayName,
        email: profileData.email || current?.email,
        phone: userPhone || current?.phone
      }));
      window.dispatchEvent(new Event('locohelp_profile_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

    try {
      await saveUserProfile(profileData);
      if (updatedHelper && updatedHelper.id) {
        await saveHelper({ ...updatedHelper, isVerified: false, status: 'pending' }).catch(() => {});
      }
      await submitVerification({
        entityType: 'user_profile',
        entityId: updatedHelper?.id || userKey,
        userId: userKey,
        userName: profileData.full_name,
        userEmail: profileData.email || undefined,
        userPhone: profileData.phone,
        title: `Simple User Profile - ${safeAddress || 'Local Area'} (Re-approval Request)`,
        idDocumentWatermarked: profilePhoto || ''
      }).catch(() => {});
      setVerificationStatus('pending');
    } catch (err) {}

    setHasExistingUserProfile(true);
    setIsEditingUserProfile(false);
    setIsSavedNotice(true);
    setShowApprovalNoticeModal(true);
    setTimeout(() => setIsSavedNotice(false), 4000);
  };

  // -------------------------------------------------------------
  // TAB 2 ACTIONS: SUBMIT HELPER PROFILE
  // -------------------------------------------------------------
  const handleSaveHelperProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helperName.trim() || !helperPhone.trim()) return;

    setIsSubmittingHelper(true);

    const activeUser = getCurrentUser();
    const uid = activeUser?.uid || '';
    const cleanEmail = (userEmail || activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();

    const safeCustomCat = sanitizeText(customCategoryName.trim(), 100);
    const matchedCat = CATEGORIES.find(c => c.id === helperCategory);
    const finalCatName = helperCategory === 'other' && safeCustomCat 
      ? safeCustomCat 
      : (matchedCat ? matchedCat.nameEn : 'General Helper');

    const skillsList = helperSkills.trim() 
      ? helperSkills.split(',').map(s => sanitizeText(s.trim(), 80)).filter(Boolean)
      : [finalCatName];

    if (helperCategory === 'other' && safeCustomCat && !skillsList.some(s => s.toLowerCase() === safeCustomCat.toLowerCase())) {
      skillsList.unshift(safeCustomCat);
    }

    const finalDoc = helperIdFrontDoc || helperIdBackDoc || myHelperProfile?.idDocUrl;
    const finalWorkPhoto = helperWorkPhoto || myHelperProfile?.photoUrl;

    // Requirement 3: On profile edit, automatically revert status to 'pending' & isVerified to false
    const newHelper = saveFreeHelperProfile({
      id: myHelperProfile?.id,
      userId: uid || myHelperProfile?.userId,
      email: cleanEmail || myHelperProfile?.email,
      name: sanitizeText(helperName.trim(), 120),
      categoryId: helperCategory,
      customCategoryName: helperCategory === 'other' ? safeCustomCat : undefined,
      phone: sanitizeText(helperPhone.trim(), 30),
      skills: skillsList,
      area: sanitizeText(helperArea.trim() || 'Local Area', 150),
      experience: sanitizeText(helperExp.trim() || '1 Year', 60),
      distance: 0.5,
      photoUrl: finalWorkPhoto || undefined,
      govtIdUploaded: Boolean(finalDoc),
      idDocUrl: finalDoc || undefined,
      isVerified: false, // Re-approval required from Admin on edit
      status: 'pending',
    } as any);

    setMyHelperProfile(newHelper);
    setIsEditingHelperProfile(false);
    setHasExistingUserProfile(true);

    try {
      localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(newHelper));
      if (uid && uid !== 'guest') {
        const userScopedRaw = localStorage.getItem(`locohelp_user_profile_${uid}`);
        const userScoped = userScopedRaw ? JSON.parse(userScopedRaw) : {};
        userScoped.myHelperProfile = newHelper;
        localStorage.setItem(`locohelp_user_profile_${uid}`, JSON.stringify(userScoped));
      }
      window.dispatchEvent(new Event('locohelp_profile_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

    try {
      const helperId = newHelper.id || `helper_${Date.now()}`;
      await saveHelper({ ...newHelper, id: helperId, photoUrl: finalWorkPhoto, isVerified: false, status: 'pending' });
    } catch (e) {}

    // Submit to Admin Verification Queue for re-approval
    try {
      await submitVerification({
        entityType: 'user_profile',
        entityId: newHelper.id,
        userId: uid || newHelper.id,
        userName: newHelper.name,
        userEmail: cleanEmail || undefined,
        userPhone: newHelper.phone,
        title: `Service Expert Profile (${finalCatName}) - ${finalDoc ? 'Government ID Card' : 'Profile Verification'} (Re-approval Request)`,
        idDocumentWatermarked: finalDoc || ''
      });
      setVerificationStatus('pending');
    } catch (verifErr) {
      console.warn("Verification submit error:", verifErr);
    }

    setIsSubmittingHelper(false);
    setShowApprovalNoticeModal(true);
  };

  // -------------------------------------------------------------
  // TAB 3 ACTIONS: REGISTER BUSINESS & VENUE
  // -------------------------------------------------------------
  const handleIdDocUploadShop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadErrorMsg(null);
    const check = await validateUploadedFile(file, { allowPdf: true });
    if (!check.valid) {
      setUploadErrorMsg(check.error || 'Invalid file uploaded.');
      e.target.value = '';
      return;
    }

    setShopIdDocName(file.name);
    setIsWatermarkingShopId(true);

    try {
      const watermarked = await applyIdWatermark(file, {
        entityType: 'business',
        userName: shopName.trim() || ownerName.trim() || 'Business Owner',
        customText: 'FOR LOCOHELP VERIFICATION ONLY • DO NOT REUSE • BUSINESS ID'
      });
      setShopIdDoc(watermarked);
    } catch (err: any) {
      setUploadErrorMsg(err?.message || 'Document upload error.');
    } finally {
      setIsWatermarkingShopId(false);
    }
  };

  const handleRegisterShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !shopPhone.trim()) return;

    setIsSubmittingShop(true);

    const activeUser = getCurrentUser();
    const uid = activeUser?.uid || '';
    const cleanEmail = (userEmail || activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();

    const typeObj = SHOP_TYPES.find(t => t.id === shopType);
    const label = shopType === 'other' && customShopType.trim()
      ? customShopType.trim()
      : (typeObj ? tr(typeObj.nameEn, typeObj.nameHi, typeObj.nameGu) : 'Local Business');

    const shopId = myBusinessProfile?.id || ('shop_' + Date.now().toString(36));

    const finalPhotos = shopPhotos.length > 0 ? shopPhotos.slice(0, 3) : (shopPhoto ? [shopPhoto] : []);

    const newShop: RegisteredShop = {
      id: shopId,
      userId: uid,
      ownerEmail: cleanEmail,
      name: shopName.trim(),
      type: shopType as any,
      categoryLabel: label,
      ownerName: ownerName.trim() || userName.trim() || 'Owner',
      phone: shopPhone.trim(),
      timings: shopTimings.trim() || '9:00 AM - 9:00 PM',
      area: shopArea.trim() || 'Local Area',
      address: shopAddress.trim() || 'Market Area',
      description: shopDescription.trim() || 'Welcome to our business!',
      photoUrl: finalPhotos[0] || shopPhoto || myBusinessProfile?.photoUrl || undefined,
      photos: finalPhotos.length > 0 ? finalPhotos : undefined,
      rating: 5.0,
      reviewCount: 1,
      isVerified: false, // Requires Admin Approval before going live
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      const existingStr = localStorage.getItem('locohelp_registered_shops');
      const existingShops: RegisteredShop[] = existingStr ? JSON.parse(existingStr) : [];
      const updatedShops = [newShop, ...existingShops.filter(s => s && s.id && s.id !== shopId && !String(s.id).startsWith('sample_shop_'))];
      localStorage.setItem('locohelp_registered_shops', JSON.stringify(updatedShops));
      localStorage.setItem('locohelp_my_business_profile', JSON.stringify(newShop));
      setMyBusinessProfile(newShop);
      setIsEditingBusiness(false);
    } catch (e) {}

    try {
      await saveShop({
        ...newShop,
        photos: finalPhotos,
        timings: newShop.timings,
        idDocumentWatermarked: shopIdDoc || finalPhotos[0] || shopPhoto || ''
      });
    } catch (err) {}

    // Always submit to Admin Verification Queue so Admin can approve the Business
    try {
      await submitVerification({
        entityType: 'business',
        entityId: shopId,
        userId: uid || ownerName.trim() || shopName.trim(),
        userName: shopName.trim(),
        userEmail: cleanEmail || undefined,
        userPhone: shopPhone.trim(),
        title: `${shopName.trim()} (${label}) - Business Registration Approval`,
        idDocumentWatermarked: shopIdDoc || shopPhoto || ''
      });
    } catch (verifErr) {}

    setIsSubmittingShop(false);
    setShopSubmitSuccess(true);
    setTimeout(() => setShopSubmitSuccess(false), 5000);
  };

  const handleWhatsAppContact = (shop: RegisteredShop) => {
    const cleanPhone = shop.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = encodeURIComponent(
      `Namaste ${shop.ownerName || shop.name}! 🙏 LocoHelp App par aapki dukan/business list dekh kar contact kar raha hoon.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
  };

  // Only show Admin-approved businesses in public directory
  const filteredShops = registeredShopsList.filter(s => {
    if (!(s.isVerified === true || s.status === 'approved')) return false;
    if (!shopSearchQuery.trim()) return true;
    const q = shopSearchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || 
           s.categoryLabel.toLowerCase().includes(q) || 
           s.area.toLowerCase().includes(q) ||
           s.description.toLowerCase().includes(q);
  });

  const isHelperApproved = Boolean(myHelperProfile && (myHelperProfile.isVerified === true || myHelperProfile.status === 'approved'));
  const isBusinessApproved = Boolean(myBusinessProfile && (myBusinessProfile.isVerified === true || myBusinessProfile.status === 'approved'));

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-slate-900 relative overflow-hidden transition-colors">
      
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between px-4 py-3.5 pt-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-20 shadow-xs">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
            title={tr('Back', 'वापस', 'પાછળ')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              {tr('Profile Hub', 'प्रोफाइल हब', 'પ્રોફાઈલ હબ')}
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              {tr(
                'Manage Account, Service Expert Listing & Business Registration',
                'खाता, सर्विस एक्सपर्ट प्रोफाइल और बिज़नेस रजिस्ट्रेशन प्रबंधित करें',
                'એકાઉન્ટ, સર્વિસ એક્સપર્ટ લિસ્ટિંગ અને બિઝનેસ રજિસ્ટ્રેશન મેનેજ કરો'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 3 CORE TABS SELECTOR STRIP */}
      <div className="bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-3 py-2 sticky top-0 z-10 shadow-xs" style={{ top: 0 }}>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
          <button
            onClick={() => setActiveTab('user')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'user'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{tr('Simple Profile', 'सामान्य प्रोफाइल', 'સામાન્ય પ્રોફાઈલ')}</span>
          </button>

          <button
            onClick={() => setActiveTab('helper')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'helper'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{tr('Service Expert', 'सर्विस एक्सपर्ट', 'સર્વિસ એક્સપર્ટ')}</span>
          </button>

          <button
            onClick={() => setActiveTab('business')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'business'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{tr('Business Reg.', 'बिज़नेस रजि.', 'બિઝનેસ રજિ.')}</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-4 pb-28 space-y-4">

        {/* ============================================================== */}
        {/* TAB 1: SIMPLE USER PROFILE                                     */}
        {/* ============================================================== */}
        {activeTab === 'user' && (
          <div className="space-y-4">

            {/* Profile Card Header */}
            <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col text-left min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {userName || myHelperProfile?.name || tr('Community Member', 'कम्युनिटी सदस्य', 'કમ્યુનિટી સભ્ય')}
                    </h1>
                    {verificationStatus === 'deletion_requested' ? (
                      <span className="text-[10px] bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {tr('Deletion Requested', 'हटाने का अनुरोध', 'ડિલીટની વિનંતી')}
                      </span>
                    ) : verificationStatus === 'approved' || isHelperApproved ? (
                      <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {tr('Active & Approved', 'एक्टिव और अप्रूव्ड', 'એક્ટિવ અને મંજૂર')}
                      </span>
                    ) : (verificationStatus === 'pending' || (myHelperProfile && !isHelperApproved)) ? (
                      <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {tr('Under Admin Review', 'एडमिन समीक्षा में', 'એડમિન સમીક્ષા હેઠળ')}
                      </span>
                    ) : null}
                  </div>
                  
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>
                      {tr(
                        'Mobile number is private & confidential (Safe contact via Chat)',
                        'मोबाइल नंबर निजी और गोपनीय है (चैट के माध्यम से संपर्क सुरक्षित)',
                        'મોબાઈલ નંબર ખાનગી અને ગોપનીય છે (ચેટ દ્વારા સુરક્ષિત સંપર્ક)'
                      )}
                    </span>
                  </p>

                  {/* Registered Email Address */}
                  {userEmail && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg shadow-2xs max-w-full">
                      <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 truncate">
                        {userEmail}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-3.5 h-3.5 ${star <= 5 ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700 fill-slate-200'}`} />
                    ))}
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white ml-1">5.0 / 5.0</span>
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="relative shrink-0 flex flex-col items-center gap-1.5">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-18 h-18 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center relative overflow-hidden border-2 border-indigo-500/80 shadow-md cursor-pointer group"
                    title={tr('Click to upload profile photo', 'प्रोफाइल फोटो अपलोड करें', 'પ્રોફાઈલ ફોટો અપલોડ કરો')}
                  >
                    {profilePhoto && profilePhoto !== 'https://lh3.googleusercontent.com/a/default-user' ? (
                      <img src={profilePhoto} alt="Profile" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                    <div 
                      className="absolute inset-x-0 bottom-0 bg-black/60 group-hover:bg-indigo-600/90 h-5 flex items-center justify-center transition-colors"
                    >
                      <Camera className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-extrabold cursor-pointer transition-colors"
                  >
                    {isUploadingPhoto
                      ? tr('⏳ Saving...', '⏳ सेव हो रहा...', '⏳ સેવ થઈ રહ્યું...')
                      : tr('📷 Change Photo', '📷 फोटो बदलें', '📷 ફોટો બદલો')}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>
              {photoSavedMsg && (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{photoSavedMsg}</span>
                </div>
              )}
              {uploadErrorMsg && (
                <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-extrabold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{uploadErrorMsg}</span>
                </div>
              )}
            </div>



            {/* Identity Verification Status Card */}
            <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
                    (verificationStatus === 'approved' || isHelperApproved) ? 'bg-emerald-600' : (verificationStatus === 'pending' || myHelperProfile) ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}>
                    {(verificationStatus === 'approved' || isHelperApproved) ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white">
                        {tr('Identity Verification & Profile Status', 'आईडी वेरिफिकेशन और प्रोफाइल स्टेटस', 'આઈડી વેરિફિકેશન અને પ્રોફાઈલ સ્ટેટસ')}
                      </h3>
                      {(verificationStatus === 'approved' || isHelperApproved) && (
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {tr('Verified 🛡️', 'वेरिफाइड 🛡️', 'વેરિફાઈડ 🛡️')}
                        </span>
                      )}
                      {!(verificationStatus === 'approved' || isHelperApproved) && (verificationStatus === 'pending' || myHelperProfile) && (
                        <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {tr('Under Admin Review', 'एडमिन समीक्षा में', 'એડમિન સમીક્ષા હેઠળ')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                      {(verificationStatus === 'approved' || isHelperApproved)
                        ? tr('Your profile is approved and active on LocoHelp', 'आपकी प्रोफाइल अप्रूव और एक्टिव है', 'તમારી પ્રોફાઈલ મંજૂર અને એક્ટિવ છે')
                        : (verificationStatus === 'pending' || myHelperProfile)
                        ? tr('Your profile is Under Admin Review • Will go live once approved', 'आपकी प्रोफाइल एडमिन समीक्षा में है • अप्रूव होते ही लाइव होगी', 'તમારી પ્રોફાઈલ એડમિન સમીક્ષા હેઠળ છે • મંજૂર થતાં જ લાઈવ થશે')
                        : tr('Upload ID for green Verified badge (Admin-only private view)', 'वेरिफाइड बैज के लिए आईडी अपलोड करें (सिर्फ एडमिन को दिखेगा)', 'વેરિફાઈડ બેજ માટે આઈડી અપલોડ કરો (ફક્ત એડમિન જોઈ શકશે)')}
                    </p>
                  </div>
                </div>

                {!(verificationStatus === 'approved' || isHelperApproved) && (
                  <button
                    type="button"
                    onClick={() => setIsVerificationModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold px-3 py-2 rounded-xl shadow-sm cursor-pointer shrink-0"
                  >
                    {verificationStatus === 'pending' ? tr('View Status', 'स्टेटस देखें', 'સ્ટેટસ જુઓ') : tr('Get Verified', 'वेरिफाई करें', 'વેરિફાઈ કરો')}
                  </button>
                )}
              </div>
            </div>

            {/* Existing User Profile View vs Edit Form */}
            {hasExistingUserProfile && !isEditingUserProfile ? (
              <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {tr('Active Profile Details', 'एक्टिव प्रोफाइल विवरण', 'એક્ટિવ પ્રોફાઈલ વિગતો')}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {tr('Linked to your registered account', 'आपके रजिस्टर्ड अकाउंट से जुड़ा हुआ', 'તમારા રજિસ્ટર્ડ એકાઉન્ટ સાથે જોડાયેલ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingUserProfile(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-xs font-extrabold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{tr('Edit / Update Profile', 'प्रोफाइल एडिट / अपडेट करें', 'પ્રોફાઈલ એડિટ / અપડેટ કરો')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">{tr('Full Name', 'पूरा नाम', 'પૂરું નામ')}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{userName || myHelperProfile?.name || '—'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">{tr('Mobile Number (Private • Admin Only)', 'मोबाइल नंबर (निजी • केवल एडमिन)', 'મોબાઈલ નંબર (ખાનગી • ફક્ત એડમિન)')}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{userPhone || myHelperProfile?.phone ? `+91 ${userPhone || myHelperProfile?.phone} 🔒` : tr('Private (Chat Only)', 'निजी (केवल चैट)', 'ખાનગી (ફક્ત ચેટ)')}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">{tr('Registered Email', 'रजिस्टर्ड ईमेल', 'રજિસ્ટર્ડ ઈમેલ')}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white break-all">{userEmail || '—'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">{tr('Area / Locality', 'क्षेत्र / इलाका', 'વિસ્તાર / સોસાયટી')}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{userAddress || myHelperProfile?.area || '—'}</span>
                  </div>
                </div>

                {myHelperProfile && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    isHelperApproved
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                  }`}>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block text-slate-500">
                        {tr('Linked Service Expert Profile', 'लिंक्ड सर्विस एक्सपर्ट प्रोफाइल', 'લિંક્ડ સર્વિસ એક્સપર્ટ પ્રોફાઈલ')} ({myHelperProfile.customCategoryName || myHelperProfile.categoryId})
                      </span>
                      <span className={`text-xs font-extrabold ${isHelperApproved ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {isHelperApproved
                          ? tr('🛡️ Approved & Active in Directory', '🛡️ डायरेक्टरी में अप्रूव्ड और एक्टिव', '🛡️ ડિરેક્ટરીમાં મંજૂર અને એક્ટિવ')
                          : tr('⏳ Under Admin Review', '⏳ एडमिन समीक्षा में', '⏳ એડમિન સમીક્ષા હેઠળ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('helper')}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-800 dark:text-white cursor-pointer"
                    >
                      {tr('View Expert Tab', 'एक्सपर्ट टैब देखें', 'એક્સપર્ટ ટેબ જુઓ')}
                    </button>
                  </div>
                )}

                {isSavedNotice && (
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="w-4 h-4 shrink-0" /> {t('prof.reApprovalNotice')}
                  </p>
                )}
              </div>
            ) : (
              /* Simple Profile Create / Edit Form */
              <form onSubmit={handleSaveSimpleProfile} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    {hasExistingUserProfile
                      ? tr('Edit / Update Personal Details', 'व्यक्तिगत विवरण अपडेट करें', 'વ્યક્તિગત વિગતો અપડેટ કરો')
                      : tr('Create Personal Profile', 'व्यक्तिगत प्रोफाइल बनाएं', 'વ્યક્તિગત પ્રોફાઈલ બનાવો')}
                  </h3>
                  {hasExistingUserProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingUserProfile(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      {tr('Cancel', 'रद्द करें', 'રદ કરો')}
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {tr('Your Real Full Name *', 'अपना असली पूरा नाम *', 'તમારું સાચું પૂરું નામ *')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      required
                      value={userName} 
                      onChange={(e) => setUserName(e.target.value)} 
                      placeholder={tr('e.g. Ramesh Kumar', 'उदा. रमेश कुमार', 'દા.ત. રમેશ કુમાર')}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {tr('Mobile Number (Optional • Strictly Private 🔒)', 'मोबाइल नंबर (वैकल्पिक • पूर्णतः गोपनीय 🔒)', 'મોબાઈલ નંબર (વૈકલ્પિક • સંપૂર્ણ ખાનગી 🔒)')}
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 font-bold absolute left-3 top-1/2 -translate-y-1/2 text-xs">+91</span>
                    <input 
                      type="tel" 
                      value={userPhone} 
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder={tr('98765 43210 (Never shown publicly)', '98765 43210 (कभी पब्लिक नहीं दिखेगा)', '98765 43210 (ક્યારેય જાહેરમાં નહીં દેખાય)')}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
                    />
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {tr(
                      '🔒 Your mobile number will never be shown publicly. You can share it privately in chat if you wish.',
                      '🔒 आपका मोबाइल नंबर किसी भी पब्लिक यूज़र को नहीं दिखेगा। जिसको नंबर देना हो वह चैट में लिखकर दे सकता है।',
                      '🔒 તમારો મોબાઈલ નંબર કોઈપણ પબ્લિક યુઝરને નહીં દેખાય. જેને નંબર આપવો હોય તેને ચેટમાં લખીને આપી શકો છો.'
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {tr('Registered Email Address *', 'रजिस्टर्ड ईमेल पता *', 'રજિસ્ટર્ડ ઈમેલ એડ્રેસ *')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      required
                      value={userEmail} 
                      onChange={(e) => setUserEmail(e.target.value)} 
                      placeholder="your.email@gmail.com" 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {tr('Area / Locality', 'क्षेत्र / इलाका', 'વિસ્તાર / સોસાયટી')}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={userAddress} 
                      onChange={(e) => setUserAddress(e.target.value)} 
                      placeholder={tr('e.g. Main Market, Navrangpura', 'उदा. मेन मार्केट, नवरंगपुरा', 'દા.ત. મેઈન માર્કેટ, નવરંગપુરા')}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer mt-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSavedNotice
                      ? tr('Profile Saved Successfully!', 'प्रोफाइल सफलतापूर्वक सेव हो गई!', 'પ્રોફાઈલ સફળતાપૂર્વક સેવ થઈ ગઈ!')
                      : tr('Save Personal Details', 'व्यक्तिगत विवरण सेव करें', 'વ્યક્તિગત વિગતો સેવ કરો')}
                  </span>
                </button>
              </form>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: HELPER PROFILE REGISTRATION & MANAGEMENT               */}
        {/* ============================================================== */}
        {activeTab === 'helper' && (
          <div className="space-y-4">
            
            {/* If Helper Profile already exists and user is not editing: Show Status & Details Card instead of Blank Create Form */}
            {myHelperProfile && !isEditingHelperProfile ? (
              <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 space-y-4 shadow-xs">
                {/* Status Banner */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  isHelperApproved
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                }`}>
                  <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                    isHelperApproved ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}>
                    {isHelperApproved ? <ShieldCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full text-white ${
                        isHelperApproved ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}>
                        {isHelperApproved
                          ? tr('🛡️ Active & Approved', '🛡️ एक्टिव और अप्रूव्ड', '🛡️ એક્ટિવ અને મંજૂર')
                          : tr('⏳ Under Admin Review', '⏳ एडमिन समीक्षा में', '⏳ એડમિન સમીક્ષા હેઠળ')}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1.5">
                      {isHelperApproved
                        ? tr('Your Service Expert Profile is Active & Live!', 'आपकी सर्विस एक्सपर्ट प्रोफाइल एक्टिव और लाइव है!', 'તમારી સર્વિસ એક્સપર્ટ પ્રોફાઈલ એક્ટિવ અને લાઈવ છે!')
                        : tr('Profile Under Admin Review', 'प्रोफाइल एडमिन समीक्षा (Under Admin Review) में है', 'પ્રોફાઈલ એડમિન સમીક્ષા હેઠળ છે')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                      {isHelperApproved
                        ? tr(
                            "Your profile is approved by Admin and visible in 'Browse Service Experts' under your category.",
                            "आपकी प्रोफाइल एडमिन द्वारा अप्रूव कर दी गई है और 'Browse Service Experts' में आपकी कैटेगरी में लाइव दिख रही है।",
                            "તમારી પ્રોફાઈલ એડમિન દ્વારા મંજૂર થઈ ગઈ છે અને તમારી કેટેગરીમાં લાઈવ દેખાઈ રહી છે."
                          )
                        : tr(
                            "Your Service Expert profile has already been created and sent to the Admin approval queue. Once approved, it will automatically go live.",
                            "आपने पहले ही अपनी प्रोफाइल बना ली है और यह एडमिन अप्रूवल के लिए भेजी जा चुकी है। अप्रूव होते ही यह लाइव हो जाएगी।",
                            "તમારી સર્વિસ એક્સપર્ટ પ્રોફાઈલ એડમિન મંજૂરી માટે મોકલાઈ ગઈ છે. મંજૂર થતાં જ તે લાઈવ થઈ જશે."
                          )}
                    </p>
                  </div>
                </div>

                {/* Active / Submitted Helper Profile Details */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        {isHelperApproved
                          ? tr('Active Profile Details', 'एक्टिव प्रोफाइल विवरण', 'એક્ટિવ પ્રોફાઈલ વિગતો')
                          : tr('Submitted Profile Details', 'सबमिट की गई प्रोफाइल', 'સબમિટ કરેલ પ્રોફાઈલ')}
                      </span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{myHelperProfile.name}</span>
                        {isHelperApproved && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                      {myHelperProfile.categoryId === 'other' && myHelperProfile.customCategoryName
                        ? myHelperProfile.customCategoryName
                        : getCategoryName(CATEGORIES.find(c => c.id === myHelperProfile.categoryId), language) || myHelperProfile.categoryId}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold block">{tr('Mobile Number', 'मोबाइल नंबर', 'મોબાઈલ નંબર')}</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">+91 {myHelperProfile.phone}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold block">{tr('Experience', 'अनुभव', 'અનુભવ')}</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{myHelperProfile.experience || '1 Year'}</span>
                    </div>
                    <div className="col-span-2 bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold block">{tr('Area / Locality', 'क्षेत्र / इलाका', 'વિસ્તાર / સોસાયટી')}</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{myHelperProfile.area}</span>
                    </div>
                  </div>

                  {Array.isArray(myHelperProfile.skills) && myHelperProfile.skills.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">{tr('Skills & Services', 'कौशल और सेवाएं', 'કૌશલ્ય અને સેવાઓ')}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {myHelperProfile.skills.map((sk: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit / Update Profile Button */}
                <button
                  type="button"
                  onClick={() => {
                    populateHelperForm(myHelperProfile);
                    setIsEditingHelperProfile(true);
                  }}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{tr('Edit / Update Profile', 'प्रोफाइल एडिट / अपडेट करें', 'પ્રોફાઈલ એડિટ / અપડેટ કરો')}</span>
                </button>
              </div>
            ) : (
              /* Helper Registration / Update Form */
              <form onSubmit={handleSaveHelperProfile} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>
                        {myHelperProfile
                          ? tr('Edit / Update Service Expert Profile', 'सर्विस एक्सपर्ट प्रोफाइल अपडेट करें', 'સર્વિસ એક્સપર્ટ પ્રોફાઈલ અપડેટ કરો')
                          : tr('Service Expert Profile Registration', 'सर्विस एक्सपर्ट प्रोफाइल रजिस्ट्रेशन', 'સર્વિસ એક્સપર્ટ પ્રોફાઈલ રજિસ્ટ્રેશન')}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {tr(
                        'List your skills (Plumber, Electrician, Tutor, Other) in local neighborhood categories',
                        'स्थानीय कैटेगरी में अपने कौशल (प्लंबर, इलेक्ट्रीशियन, ट्यूटर आदि) को सूचीबद्ध करें',
                        'સ્થાનિક કેટેગરીમાં તમારી કુશળતા (પ્લમ્બર, ઇલેક્ટ્રિશિયન, ટ્યુટર વગેરે) ઉમેરો'
                      )}
                    </p>
                  </div>
                  {myHelperProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingHelperProfile(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      {tr('Cancel', 'रद्द करें', 'રદ કરો')}
                    </button>
                  )}
                </div>

                {/* 1. Your Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Your Name *', 'आपका नाम *', 'તમારું નામ *')}
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder={tr('e.g. Ramesh Kumar', 'उदा. रमेश कुमार', 'દા.ત. રમેશ કુમાર')}
                    value={helperName}
                    onChange={(e) => setHelperName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* 2. Work Category Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Work Category *', 'काम की श्रेणी *', 'કામની કેટેગરી *')}
                  </label>
                  <select 
                    value={helperCategory}
                    onChange={(e) => setHelperCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>
                        {getCategoryName(c, language)} ({c.nameEn})
                      </option>
                    ))}
                  </select>

                  {helperCategory === 'other' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        placeholder={tr('Enter Custom Work Category / Profession *', 'अपना कस्टम काम / पेशा दर्ज करें *', 'તમારી કસ્ટમ કામની કેટેગરી / વ્યવસાય લખો *')}
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        className="w-full bg-emerald-50/60 dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Mobile Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Mobile Number *', 'मोबाइल नंबर *', 'મોબાઈલ નંબર *')}
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-xs">+91</span>
                    <input 
                      type="tel" 
                      required
                      placeholder="98765 43210"
                      value={helperPhone}
                      onChange={(e) => setHelperPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 4. Area / Locality */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Area / Locality *', 'क्षेत्र / इलाका *', 'વિસ્તાર / સોસાયટી *')}
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder={tr('e.g. Main Market, Sector 15', 'उदा. मेन मार्केट, सेक्टर 15', 'દા.ત. મેઈન માર્કેટ, સેક્ટર 15')}
                    value={helperArea}
                    onChange={(e) => setHelperArea(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* 5. Experience */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Experience *', 'अनुभव *', 'અનુભવ *')}
                  </label>
                  <select 
                    value={helperExp}
                    onChange={(e) => setHelperExp(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    <option value="6 Months">{tr('6 Months', '6 महीने', '6 મહિના')}</option>
                    <option value="1 Year">{tr('1 Year', '1 वर्ष', '1 વર્ષ')}</option>
                    <option value="2 Years">{tr('2 Years', '2 वर्ष', '2 વર્ષ')}</option>
                    <option value="3-5 Years">{tr('3 - 5 Years', '3 - 5 वर्ष', '3 - 5 વર્ષ')}</option>
                    <option value="5-10 Years">{tr('5 - 10 Years', '5 - 10 वर्ष', '5 - 10 વર્ષ')}</option>
                    <option value="10+ Years">{tr('10+ Years', '10+ वर्ष', '10+ વર્ષ')}</option>
                  </select>
                </div>

                {/* 6. Skills */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Skills / Specialties', 'कौशल / विशेषज्ञता', 'કૌશલ્ય / વિશેષતા')}
                  </label>
                  <input 
                    type="text" 
                    placeholder={tr('e.g. Pipe fitting, Tap repair, Water tank cleaning', 'उदा. पाइप फिटिंग, नल रिपेयर, टंकी सफाई', 'દા.ત. પાઈપ ફિટિંગ, નળ રિપેર, ટાંકી સફાઈ')}
                    value={helperSkills}
                    onChange={(e) => setHelperSkills(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Profile / Work Photo Upload for Local Helper */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Profile / Work Photo (JPG, PNG, WebP Max 2MB)', 'प्रोफाइल या काम की फ़ोटो (JPG, PNG, WebP Max 2MB)', 'પ્રોફાઈલ અથવા કામનો ફોટો (JPG, PNG, WebP Max 2MB)')}
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadErrorMsg(null);
                        const check = await validateUploadedFile(file, { allowPdf: false });
                        if (!check.valid) {
                          setUploadErrorMsg(check.error || 'Only safe JPG, PNG, or WEBP images up to 2MB are allowed.');
                          e.target.value = '';
                          return;
                        }
                        try {
                          const compressed = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.75 });
                          setHelperWorkPhoto(compressed);
                        } catch {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setHelperWorkPhoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                  />
                  {helperWorkPhoto && (
                    <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-400">
                      <img src={helperWorkPhoto} alt="Work Preview" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setHelperWorkPhoto(null)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* 7. Verify Government ID Card (JPG, PNG or PDF Supported) Dual Upload */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    {tr('Government ID Card (JPG, PNG or PDF Supported)', 'सरकारी आईडी कार्ड (JPG, PNG या PDF)', 'સરકારી આઈડી કાર્ડ (JPG, PNG અથવા PDF)')}
                  </label>
                  <p className="text-[10px] text-slate-500 font-medium -mt-1">
                    {tr('Upload Front & Back Side of your Government ID Card, or a PDF file.', 'अपने सरकारी आईडी कार्ड के आगे और पीछे का भाग या PDF अपलोड करें।', 'તમારા સરકારી આઈડી કાર્ડની આગળ અને પાછળની બાજુ અથવા PDF ફાઈલ અપલોડ કરો.')}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Front Side Upload */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {tr('Front Side ID', 'आईडी का सामने का भाग', 'આઈડીની આગળની બાજુ')}
                      </span>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadErrorMsg(null);
                            const check = await validateUploadedFile(file, { allowPdf: true });
                            if (!check.valid) {
                              setUploadErrorMsg(check.error || 'Invalid file uploaded.');
                              e.target.value = '';
                              return;
                            }
                            setHelperIdFrontName(file.name);
                            try {
                              const watermarked = await applyIdWatermark(file, {
                                userName: helperName.trim() || userName || 'Service Expert',
                                customText: 'FOR LOCOHELP VERIFICATION ONLY • SERVICE EXPERT ID FRONT'
                              });
                              setHelperIdFrontDoc(watermarked);
                            } catch {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setHelperIdFrontDoc(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                        className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 cursor-pointer"
                      />
                      {helperIdFrontName && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1 truncate">
                          <CheckCircle2 className="w-3 h-3 shrink-0" /> Front (Watermarked): {helperIdFrontName}
                        </p>
                      )}
                    </div>

                    {/* Back Side Upload */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {tr('Back Side ID', 'आईडी का पीछे का भाग', 'આઈડીની પાછળની બાજુ')}
                      </span>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadErrorMsg(null);
                            const check = await validateUploadedFile(file, { allowPdf: true });
                            if (!check.valid) {
                              setUploadErrorMsg(check.error || 'Invalid file uploaded.');
                              e.target.value = '';
                              return;
                            }
                            setHelperIdBackName(file.name);
                            try {
                              const watermarked = await applyIdWatermark(file, {
                                userName: helperName.trim() || userName || 'Service Expert',
                                customText: 'FOR LOCOHELP VERIFICATION ONLY • SERVICE EXPERT ID BACK'
                              });
                              setHelperIdBackDoc(watermarked);
                            } catch {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setHelperIdBackDoc(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                        className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 cursor-pointer"
                      />
                      {helperIdBackName && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1 truncate">
                          <CheckCircle2 className="w-3 h-3 shrink-0" /> Back (Watermarked): {helperIdBackName}
                        </p>
                      )}
                    </div>
                  </div>
                  {uploadErrorMsg && (
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{uploadErrorMsg}</span>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingHelper}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {myHelperProfile
                      ? tr('Update Service Expert Profile', 'सर्विस एक्सपर्ट प्रोफाइल अपडेट करें', 'સર્વિસ એક્સપર્ટ પ્રોફાઈલ અપડેટ કરો')
                      : tr('Save Service Expert Profile', 'सर्विस एक्सपर्ट प्रोफाइल सेव करें', 'સર્વિસ એક્સપર્ટ પ્રોફાઈલ સેવ કરો')}
                  </span>
                </button>

              </form>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: BUSINESS & VENUE REGISTRATION & LIST                    */}
        {/* ============================================================== */}
        {activeTab === 'business' && (
          <div className="space-y-4">

            {shopSubmitSuccess && (
              <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {tr(
                    'Business registration submitted! Status: Pending Admin Approval. It will appear in the public directory once approved by Admin.',
                    'बिज़नेस रजिस्ट्रेशन सबमिट हो गया! स्टेटस: एडमिन अप्रूवल के लिए पेंडिंग। एडमिन द्वारा अप्रूव होने के बाद यह पब्लिक डायरेक्टरी में दिखेगा।',
                    'બિઝનેસ રજિસ્ટ્રેશન સબમિટ થઈ ગયું! સ્ટેટસ: એડમિન મંજૂરી માટે પેન્ડિંગ. એડમિન દ્વારા મંજૂર થયા પછી તે જાહેર ડિરેક્ટરીમાં દેખાશે.'
                  )}
                </span>
              </div>
            )}

            {/* Existing Business Status Card if user has already registered a business */}
            {myBusinessProfile && !isEditingBusiness ? (
              <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl space-y-3.5 shadow-xs">
                <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isBusinessApproved
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                }`}>
                  <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 ${
                    isBusinessApproved ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}>
                    {isBusinessApproved ? <ShieldCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white ${
                      isBusinessApproved ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}>
                      {isBusinessApproved
                        ? tr('🛡️ Approved & Live', '🛡️ अप्रूव्ड और लाइव', '🛡️ મંજૂર અને લાઈવ')
                        : tr('⏳ Under Admin Review', '⏳ एडमिन समीक्षा में', '⏳ એડમિન સમીક્ષા હેઠળ')}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                      {myBusinessProfile.name}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      {myBusinessProfile.categoryLabel} • {myBusinessProfile.area}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShopName(myBusinessProfile.name || '');
                    setShopType(myBusinessProfile.type || 'shop');
                    setOwnerName(myBusinessProfile.ownerName || '');
                    setShopPhone(myBusinessProfile.phone || '');
                    setShopTimings(myBusinessProfile.timings || '9:00 AM - 9:00 PM');
                    setShopArea(myBusinessProfile.area || '');
                    setShopAddress(myBusinessProfile.address || '');
                    setShopDescription(myBusinessProfile.description || '');
                    setShopPhotos(myBusinessProfile.photos || (myBusinessProfile.photoUrl ? [myBusinessProfile.photoUrl] : []));
                    setIsEditingBusiness(true);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{tr('Edit / Update Business Details', 'बिज़नेस विवरण अपडेट करें', 'બિઝનેસ વિગતો અપડેટ કરો')}</span>
                </button>
              </div>
            ) : (
              /* Business Registration Form */
              <form onSubmit={handleRegisterShop} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>
                        {myBusinessProfile
                          ? tr('Update Business / Shop', 'बिज़नेस / दुकान अपडेट करें', 'બિઝનેસ / દુકાન અપડેટ કરો')
                          : tr('Business / Shop Registration', 'बिज़नेस / दुकान रजिस्ट्रेशन', 'બિઝનેસ / દુકાન રજિસ્ટ્રેશન')}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {tr(
                        'List your Shop, Showroom, Hospital, Bakery or Venue (Subject to Admin Approval)',
                        'अपनी दुकान, शोरूम, अस्पताल, बेकरी या वेन्यू लिस्ट करें (एडमिन अप्रूवल आवश्यक)',
                        'તમારી દુકાન, શોરૂમ, હોસ્પિટલ, બેકરી કે સ્થળ રજિસ્ટર કરો (એડમિન મંજૂરીને આધીન)'
                      )}
                    </p>
                  </div>
                  {myBusinessProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingBusiness(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      {tr('Cancel', 'रद्द करें', 'રદ કરો')}
                    </button>
                  )}
                </div>

                {/* 1. Shop Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Business / Shop Name *', 'दुकान / बिज़नेस का नाम *', 'દુકાન / બિઝનેસનું નામ *')}
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder={tr('e.g. Apex Mobile Showroom / City Hospital', 'उदा. एपेक्स मोबाइल शोरूम / सिटी अस्पताल', 'દા.ત. એપેક્સ મોબાઈલ શોરૂમ / સિટી હોસ્પિટલ')}
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* 2. Shop Category / Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Business Type / Category *', 'बिज़नेस का प्रकार / श्रेणी *', 'બિઝનેસનો પ્રકાર / કેટેગરી *')}
                  </label>
                  <select 
                    value={shopType}
                    onChange={(e) => setShopType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {SHOP_TYPES.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.icon} {tr(t.nameEn, t.nameHi, t.nameGu)}
                      </option>
                    ))}
                  </select>

                  {shopType === 'other' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        placeholder={tr('Enter Custom Business Type / Venue Name *', 'अपना कस्टम बिज़नेस प्रकार दर्ज करें *', 'તમારો કસ્ટમ બિઝનેસ પ્રકાર લખો *')}
                        value={customShopType}
                        onChange={(e) => setCustomShopType(e.target.value)}
                        className="w-full bg-amber-50/60 dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Owner Name & Timings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {tr('Owner / Manager Name *', 'मालिक / मैनेजर का नाम *', 'માલિક / મેનેજરનું નામ *')}
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder={tr('Owner Name', 'मालिक का नाम', 'માલિકનું નામ')}
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {tr('Shop Timings *', 'दुकान का समय *', 'દુકાનનો સમય *')}
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 9:00 AM - 9:00 PM"
                      value={shopTimings}
                      onChange={(e) => setShopTimings(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 4. Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Contact / WhatsApp Number *', 'संपर्क / व्हाट्सएप नंबर *', 'સંપર્ક / વોટ્સએપ નંબર *')}
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-xs">+91</span>
                    <input 
                      type="tel" 
                      required
                      placeholder="98765 43210"
                      value={shopPhone}
                      onChange={(e) => setShopPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 5. Area / Locality */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Address / City / Area *', 'पता / शहर / क्षेत्र *', 'સરનામું / શહેર / વિસ્તાર *')}
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder={tr('e.g. Main Market, Near Bus Station', 'उदा. मेन मार्केट, बस स्टैंड के पास', 'દા.ત. મેઈન માર્કેટ, બસ સ્ટેન્ડ પાસે')}
                    value={shopArea}
                    onChange={(e) => setShopArea(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* 6. Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Full Shop Address / Landmark', 'दुकान का पूरा पता / लैंडमार्क', 'દુકાનનું પૂરું સરનામું / લેન્ડમાર્ક')}
                  </label>
                  <input 
                    type="text" 
                    placeholder={tr('Shop #12, Ground Floor', 'दुकान नंबर 12, ग्राउंड फ्लोर', 'દુકાન નં. 12, ગ્રાઉન્ડ ફ્લોર')}
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* 7. Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Description / Offers / Services', 'विवरण / ऑफर / सेवाएं', 'વિગત / ઓફર / સેવાઓ')}
                  </label>
                  <textarea 
                    rows={2}
                    placeholder={tr('All mobile accessories available. Flat 10% discount on all purchases!', 'सभी सेवाएं और विशेष ऑफर यहाँ लिखें...', 'તમારી બધી સેવાઓ અને ખાસ ઓફર અહીં લખો...')}
                    value={shopDescription}
                    onChange={(e) => setShopDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                  />
                </div>

                {/* 8. Multiple Shop Photos Upload (2-3 images max 2MB each) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Shop / Business Photos (Upload 2-3 photos • Max 2MB each)', 'दुकान / बिज़नेस की फ़ोटो (2-3 फ़ोटो अपलोड करें • Max 2MB)', 'દુકાન / બિઝનેસના ફોટા (2-3 ફોટા અપલોડ કરો • Max 2MB)')}
                  </label>
                  <input 
                    type="file" 
                    multiple
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []) as File[];
                      if (files.length === 0) return;
                      setUploadErrorMsg(null);
                      const remainingSlots = 3 - shopPhotos.length;
                      if (remainingSlots <= 0) {
                        setUploadErrorMsg('Maximum 3 shop photos allowed.');
                        e.target.value = '';
                        return;
                      }
                      for (const file of files.slice(0, remainingSlots)) {
                        const check = await validateUploadedFile(file, { allowPdf: false });
                        if (!check.valid) {
                          setUploadErrorMsg(check.error || 'Only safe JPEG, PNG, or WebP images up to 2MB are allowed.');
                          continue;
                        }
                        try {
                          const dataUrl = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.75 });
                          setShopPhotos((prev) => {
                            const updated = [...prev, dataUrl].slice(0, 3);
                            setShopPhoto(updated[0] || null);
                            return updated;
                          });
                        } catch {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const dataUrl = reader.result as string;
                            setShopPhotos((prev) => {
                              const updated = [...prev, dataUrl].slice(0, 3);
                              setShopPhoto(updated[0] || null);
                              return updated;
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                      e.target.value = '';
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-950 dark:file:text-amber-300 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                  />
                  {shopPhotos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shopPhotos.map((photo, idx) => (
                        <div key={idx} className="relative w-24 h-20 rounded-xl overflow-hidden border-2 border-amber-400 shadow-xs">
                          <img src={photo} alt={`Shop Preview ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => {
                              setShopPhotos((prev) => {
                                const next = prev.filter((_, i) => i !== idx);
                                setShopPhoto(next[0] || null);
                                return next;
                              });
                            }}
                            className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer"
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 9. Government ID / License Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Government ID / Trade License (JPG, PNG, WebP ≤ 2MB or PDF ≤ 5MB)', 'सरकारी आईडी / ट्रेड लाइसेंस (JPG, PNG, WebP या PDF)', 'સરકારી આઈડી / ટ્રેડ લાયસન્સ (JPG, PNG, WebP અથવા PDF)')}
                  </label>
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleIdDocUploadShop}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-950 dark:file:text-amber-300 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                  />
                  {shopIdDocName && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ID Document Watermarked: {shopIdDocName}
                    </p>
                  )}
                  {uploadErrorMsg && (
                    <div className="mt-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{uploadErrorMsg}</span>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingShop}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
                >
                  <Store className="w-4 h-4" />
                  <span>
                    {shopSubmitSuccess
                      ? tr('Submitted for Admin Approval!', 'एडमिन अप्रूवल के लिए सबमिट हो गया!', 'એડમિન મંજૂરી માટે સબમિટ થઈ ગયું!')
                      : (myBusinessProfile
                          ? tr('Update & Submit for Approval', 'अपडेट करें और अप्रूवल के लिए भेजें', 'અપડેટ કરો અને મંજૂરી માટે મોકલો')
                          : tr('Register Business / Venue', 'बिज़नेस / दुकान रजिस्टर करें', 'બિઝનેસ / દુકાન રજિસ્ટર કરો'))}
                  </span>
                </button>

              </form>
            )}

            {/* List View of All Approved Registered Local Businesses */}
            <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🏪 {tr('Approved Local Businesses', 'अप्रूव्ड स्थानीय बिज़नेस', 'મંજૂર થયેલ સ્થાનિક બિઝનેસ')} ({filteredShops.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {tr('Admin-verified Shops, Showrooms, Malls & Venues', 'एडमिन द्वारा सत्यापित दुकानें, शोरूम, मॉल और वेन्यू', 'એડમિન દ્વારા ચકાસાયેલ દુકાનો, શોરૂમ, મોલ અને સ્થળો')}
                  </p>
                </div>
              </div>

              {/* Search input for registered shops */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={shopSearchQuery}
                  onChange={(e) => setShopSearchQuery(e.target.value)}
                  placeholder={tr('Search approved business by name, area or item...', 'नाम, क्षेत्र या सेवा से अप्रूव्ड बिज़नेस खोजें...', 'નામ, વિસ્તાર કે સેવા દ્વારા બિઝનેસ શોધો...')}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-1">
                {filteredShops.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    {tr('No approved businesses found matching search.', 'कोई अप्रूव्ड बिज़नेस नहीं मिला।', 'કોઈ મંજૂર થયેલ બિઝનેસ મળ્યો નથી.')}
                  </p>
                ) : (
                  filteredShops.map((shop) => (
                    <div 
                      key={shop.id}
                      className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start justify-between gap-2"
                    >
                      {shop.photoUrl && (
                        <img src={shop.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                      )}
                      <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {shop.name}
                          </span>
                          <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.2 rounded-full">
                            🛡️ {tr('Verified', 'वेरिफाइड', 'વેરિફાઈડ')}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{shop.categoryLabel}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{shop.area} • {shop.address}</span>
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 pt-0.5">{shop.description}</p>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleWhatsAppContact(shop)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Phone className="w-3 h-3" /> WhatsApp
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Logout Option cleanly at the very bottom of the Profile Page */}
        <div className="pt-6 pb-4 border-t border-slate-200 dark:border-slate-800 mt-6">
          <button
            type="button"
            onClick={() => {
              logoutUser().finally(() => {
                onBack();
                window.location.reload();
              });
            }}
            className="w-full flex items-center justify-center gap-2.5 p-4 bg-white dark:bg-slate-850 border border-rose-200 dark:border-rose-900/50 rounded-2xl active:scale-[0.98] transition-all hover:bg-rose-50 dark:hover:bg-rose-950/20 shadow-xs cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-rose-500" />
            <span className="text-rose-600 dark:text-rose-400 font-extrabold tracking-wide text-sm">
              {t('set.logout') || tr('Log Out', 'लॉग आउट (Log Out)', 'લોગ આઉટ (Log Out)')}
            </span>
          </button>
        </div>

      </div>

      {/* Helper Profile Approval Confirmation Notice Popup Modal */}
      {showApprovalNoticeModal && (
        <div
          className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
        >
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-4 relative z-50">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl shadow-inner">
              ⏳
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {tr(
                  'Profile Submitted for Admin Approval!',
                  'प्रोफाइल एडमिन अप्रूवल के लिए सबमिट हो गई!',
                  'પ્રોફાઈલ એડમિન મંજૂરી માટે મોકલાઈ ગઈ!'
                )}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-medium">
                {tr(
                  'Your Service Expert Profile has been recorded successfully. For community trust & verification, your details have been sent to Admin for approval. Once approved, your profile will be live with the Verified Badge (🛡️) on the main page under your category.',
                  'आपकी सर्विस एक्सपर्ट प्रोफाइल सफलतापूर्वक दर्ज हो गई है। सुरक्षा और वेरिफिकेशन के लिए आपकी प्रोफाइल एडमिन के पास अप्रूवल के लिए भेज दी गई है। एडमिन द्वारा अप्रूव करते ही आपकी प्रोफाइल Verified Badge (🛡️) के साथ मेन पेज पर आपकी केटेगरी के अंदर लाइव हो जाएगी।',
                  'તમારી સર્વિસ એક્સપર્ટ પ્રોફાઈલ સફળતાપૂર્વક નોંધાઈ ગઈ છે. સુરક્ષા અને ચકાસણી માટે તમારી વિગતો એડમિન પાસે મોકલવામાં આવી છે. એડમિન દ્વારા મંજૂર થતાં જ તમારી પ્રોફાઈલ વેરિફાઈડ બેજ (🛡️) સાથે મુખ્ય પેજ પર તમારી કેટેગરીમાં લાઈવ થઈ જશે.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowApprovalNoticeModal(false)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {tr('Okay, Understood', 'ठीक है, समझ गया', 'બરાબર, સમજી ગયો')}
            </button>
          </div>
        </div>
      )}

      {/* Identity Verification Modal */}
      <IdentityVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        entityType="user_profile"
        entityId={getCurrentUser().uid}
        entityName={userName}
        onVerificationSubmitted={() => {
          setVerificationStatus('pending');
        }}
      />

    </div>
  );
}
