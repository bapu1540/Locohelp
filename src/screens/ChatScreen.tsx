import React, { useState, useEffect, useRef } from 'react';
import { Intent } from '../types';
import { ArrowLeft, ShieldAlert, CheckCircle2, Send, MapPin, UserCheck, Paperclip, Navigation, Mic, Star, Sparkles, Trash2, Home, ShieldCheck, Check, Camera, Image as ImageIcon, X, Share2, Video, PhoneOff, MicOff, RefreshCw, AlertTriangle, MessageSquare, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCurrentUser, isMessageSentByUser } from '../auth';
import { useLanguage, COMPLIANCE_REPORT_REASONS } from '../i18n';
import UserProfileModal from './UserProfileModal';
import LoginPromptModal from '../components/LoginPromptModal';
import { isGuestUser } from '../lib/authUtils';
import {
  fetchChatMessages,
  sendChatMessage,
  subscribeToRealtimeStream,
  fetchChatBlockStatus,
  blockUserInChatOnServer,
  unblockUserInChatOnServer,
  submitChatReportToServer,
  fetchPostConversations
} from '../api';
import { validateUploadedFile, sanitizeText } from '../lib/security';
import { compressImageToWebP } from '../lib/imageCompression';
import { uploadFileToFirebaseStorage } from '../lib/firebase';
import { Ban } from 'lucide-react';

interface ChatScreenProps {
  intent: Intent | null;
  onBack: () => void;
  onReport: () => void;
  isModal?: boolean;
  onExpandFullScreen?: () => void;
}

export default function ChatScreen({ intent, onBack, onReport, isModal = false, onExpandFullScreen }: ChatScreenProps) {
  const { language, t, tr } = useLanguage();
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(intent);

  useEffect(() => {
    setCurrentIntent(intent);
  }, [intent]);

  const [allUserConversations, setAllUserConversations] = useState<any[]>([]);
  const [isLoadingAllChats, setIsLoadingAllChats] = useState(false);

  const currentUser = getCurrentUser();

  const loadAllChats = async () => {
    const activeUser = getCurrentUser();
    if (!activeUser || isGuestUser()) {
      setAllUserConversations([]);
      return;
    }
    setIsLoadingAllChats(true);
    try {
      const list = await fetchPostConversations({ userId: activeUser.uid, userEmail: activeUser.email });
      const dedupedMap = new Map<string, any>();
      (Array.isArray(list) ? list : []).forEach((c: any) => {
        if (!c) return;
        const msgText = String(c.lastMessage || c.last_message || '').trim();
        if (!msgText) return;
        const pId = String(c.postId || c.post_id || 'general').trim().toLowerCase();
        const hId = String(c.helperId || c.helper_id || c.senderId || '').trim().toLowerCase();
        const key = hId ? `${pId}__${hId}` : String(c.id || c.conversationId || Math.random());
        const existing = dedupedMap.get(key);
        if (!existing) {
          dedupedMap.set(key, c);
        } else {
          const existingTime = new Date(existing.lastMessageAt || existing.updatedAt || 0).getTime();
          const newTime = new Date(c.lastMessageAt || c.updatedAt || 0).getTime();
          if (newTime >= existingTime) {
            dedupedMap.set(key, {
              ...existing,
              ...c,
              unreadCount: Math.max(Number(existing.unreadCount || 0), Number(c.unreadCount || 0))
            });
          }
        }
      });
      setAllUserConversations(Array.from(dedupedMap.values()));
    } catch {
      setAllUserConversations([]);
    } finally {
      setIsLoadingAllChats(false);
    }
  };

  useEffect(() => {
    if (!currentIntent) {
      loadAllChats();
    }
  }, [currentIntent]);

  const chatId = currentIntent?.id || (currentIntent ? 'chat_community_helper' : '');

  // Determine whether the logged-in user is the Post Owner (User A) or a Helper/Responder (User B)
  const isPostOwner = React.useMemo(() => {
    try {
      const myPostIds: string[] = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');
      if (chatId && myPostIds.includes(chatId)) return true;
    } catch {}
    if (!currentIntent?.authorId && !(currentIntent as any)?.authorEmail) return false;
    return isMessageSentByUser(
      {
        sender_id: currentIntent?.authorId || '',
        sender_email: (currentIntent as any)?.authorEmail
      },
      currentUser
    );
  }, [chatId, currentIntent?.authorId, (currentIntent as any)?.authorEmail, currentUser]);

  const [selectedReplierId, setSelectedReplierId] = useState<string | null>(
    (currentIntent as any)?.selectedReplierId || (currentIntent as any)?.helperId || null
  );
  const [selectedReplierName, setSelectedReplierName] = useState<string | null>(
    (currentIntent as any)?.selectedReplierName || null
  );
  const [selectedReplierEmail, setSelectedReplierEmail] = useState<string | null>(
    (currentIntent as any)?.selectedReplierEmail || null
  );
  const [selectedReplierAvatar, setSelectedReplierAvatar] = useState<string | null>(
    (currentIntent as any)?.selectedReplierAvatar || null
  );

  // For Helper (User B), helperId is the conversation's helperId or their own UID; for Post Owner (User A), helperId MUST be selectedReplierId
  const activeHelperId = isPostOwner
    ? (selectedReplierId || (currentIntent as any)?.helperId || '')
    : ((currentIntent as any)?.helperId || (currentUser?.uid && currentUser.uid !== 'guest_user' ? currentUser.uid : '') || selectedReplierId || '');

  // Deterministic 1-on-1 conversation ID per (post_id, helper_id)
  const activeConversationId = React.useMemo(() => {
    const passedConvId = String((currentIntent as any)?.conversationId || '').trim();
    if (isPostOwner) {
      if (!selectedReplierId && passedConvId) {
        return passedConvId;
      }
      if (!selectedReplierId) return '';
      if (passedConvId && passedConvId.toLowerCase().endsWith(`__${String(selectedReplierId).toLowerCase()}`)) {
        return passedConvId;
      }
      return `conv_${chatId}__${String(selectedReplierId).toLowerCase()}`;
    }
    if (passedConvId) return passedConvId;
    if (activeHelperId) return `conv_${chatId}__${String(activeHelperId).toLowerCase()}`;
    return chatId;
  }, [isPostOwner, selectedReplierId, chatId, activeHelperId, (currentIntent as any)?.conversationId]);

  const [inboxConversations, setInboxConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<{
    id: string;
    text: string;
    authorId: string;
    sender_id?: string;
    user_id?: string;
    authorName?: string;
    sender_name?: string;
    senderEmail?: string;
    sender_email?: string;
    senderAvatar?: string;
    receiverId?: string;
    isCollaborator?: boolean;
    type?: 'text' | 'pin' | 'attachment' | 'task_completed';
    attachmentUrl?: string;
    attachmentType?: string;
    isRead?: boolean;
    is_read?: boolean;
    createdAt?: string;
  }[]>([]);
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [showTracker, setShowTracker] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isCompletionSummaryOpen, setIsCompletionSummaryOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isTaskDone, setIsTaskDone] = useState(currentIntent?.status === 'completed');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  // Direct Chat Report & User-to-User Block States
  const [isChatBlocked, setIsChatBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [isReportChatModalOpen, setIsReportChatModalOpen] = useState(false);
  const [reportReasonKey, setReportReasonKey] = useState(COMPLIANCE_REPORT_REASONS[0].key);
  const [reportDetails, setReportDetails] = useState('');
  const [alsoBlockUser, setAlsoBlockUser] = useState(true);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportStatusBanner, setReportStatusBanner] = useState<string | null>(null);

  // Camera & Media States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [isGalleryPreview, setIsGalleryPreview] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isFamilyShareOpen, setIsFamilyShareOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isSharingLiveLocation, setIsSharingLiveLocation] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fallbackCameraInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);
  const isUserNearBottomRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [unreadNewScrollCount, setUnreadNewScrollCount] = useState(0);
  const prevMessagesLengthRef = useRef(0);
  const lastMessageIdRef = useRef<string | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSafetyBannerDismissed, setIsSafetyBannerDismissed] = useState(false);

  // Sync selected replier if currentIntent changes (e.g., opened from My Chats list or View Responses modal)
  useEffect(() => {
    if (currentIntent) {
      const repId = (currentIntent as any).selectedReplierId || (currentIntent as any).helperId || null;
      if (repId) {
        setSelectedReplierId(repId);
        setSelectedReplierName((currentIntent as any).selectedReplierName || (currentIntent as any).authorName || null);
        setSelectedReplierEmail((currentIntent as any).selectedReplierEmail || null);
        setSelectedReplierAvatar((currentIntent as any).selectedReplierAvatar || null);
      }
    } else {
      setSelectedReplierId(null);
      setSelectedReplierName(null);
      setSelectedReplierEmail(null);
      setSelectedReplierAvatar(null);
    }
  }, [currentIntent]);

  // Push history state and listen for hardware Back button when any modal is open inside ChatScreen
  const isAnyChatModalOpen = Boolean(
    isCameraOpen ||
    isMapModalOpen ||
    isReportChatModalOpen ||
    isProfileModalOpen ||
    zoomedImage ||
    isRatingOpen ||
    isLoginPromptOpen
  );
  const prevChatModalRef = useRef(false);
  useEffect(() => {
    if (isAnyChatModalOpen && !prevChatModalRef.current) {
      try {
        window.history.pushState({ locohelpScreen: 'chat', locohelpModal: true }, '');
      } catch (e) {}
    }
    prevChatModalRef.current = isAnyChatModalOpen;
  }, [isAnyChatModalOpen]);

  useEffect(() => {
    const handleCloseChatModal = (e: Event) => {
      if (zoomedImage) { e.preventDefault(); setZoomedImage(null); return; }
      if (isCameraOpen) { e.preventDefault(); stopCamera(); return; }
      if (isMapModalOpen) { e.preventDefault(); setIsMapModalOpen(false); return; }
      if (isReportChatModalOpen) { e.preventDefault(); setIsReportChatModalOpen(false); return; }
      if (isProfileModalOpen) { e.preventDefault(); setIsProfileModalOpen(false); return; }
      if (isRatingOpen) { e.preventDefault(); setIsRatingOpen(false); return; }
      if (isLoginPromptOpen) { e.preventDefault(); setIsLoginPromptOpen(false); return; }
    };
    window.addEventListener('locohelp_close_active_modal', handleCloseChatModal);
    return () => window.removeEventListener('locohelp_close_active_modal', handleCloseChatModal);
  }, [zoomedImage, isCameraOpen, isMapModalOpen, isReportChatModalOpen, isProfileModalOpen, isRatingOpen, isLoginPromptOpen]);

  // Load cached 1-on-1 messages when switching activeConversationId
  useEffect(() => {
    initialLoadRef.current = true;
    isUserNearBottomRef.current = true;
    prevMessagesLengthRef.current = 0;
    lastMessageIdRef.current = null;
    setShowScrollBottomBtn(false);
    setUnreadNewScrollCount(0);
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    try {
      const stored = localStorage.getItem(`locohelp_chat_${activeConversationId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}
    setMessages([]);
  }, [activeConversationId]);

  // Check if either user has blocked the other in this chat
  useEffect(() => {
    const activeUser = getCurrentUser();
    const myId = activeUser?.uid || activeUser?.email || '';
    const peerTargetId = isPostOwner ? (selectedReplierId || '') : (currentIntent?.authorId || '');
    if (!peerTargetId) return;
    fetchChatBlockStatus({ chatId, userId: myId, peerId: peerTargetId }).then(status => {
      setIsChatBlocked(status.isBlocked);
      setBlockedByMe(status.blockedByMe);
    });
  }, [chatId, isPostOwner, selectedReplierId, currentIntent?.authorId]);

  const handleContainerScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 90;
    isUserNearBottomRef.current = isNearBottom;
    if (isNearBottom) {
      setShowScrollBottomBtn(false);
      setUnreadNewScrollCount(0);
    }
  };

  const scrollToBottom = () => {
    isUserNearBottomRef.current = true;
    setShowScrollBottomBtn(false);
    setUnreadNewScrollCount(0);
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Smart message scroll: auto-scroll on initial load or when near bottom; only show "New Message" button if a new message arrives while scrolled up
  useEffect(() => {
    const latestMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    const latestId = latestMsg?.id || null;

    if (initialLoadRef.current || prevMessagesLengthRef.current === 0) {
      if (messages.length > 0) {
        initialLoadRef.current = false;
      }
      prevMessagesLengthRef.current = messages.length;
      lastMessageIdRef.current = latestId;
      setShowScrollBottomBtn(false);
      setUnreadNewScrollCount(0);
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      return;
    }

    const hasNewIncomingMessage =
      messages.length > prevMessagesLengthRef.current &&
      latestId !== null &&
      latestId !== lastMessageIdRef.current &&
      latestMsg &&
      !isMessageSentByUser(latestMsg, getCurrentUser());

    prevMessagesLengthRef.current = messages.length;
    lastMessageIdRef.current = latestId;

    if (messagesContainerRef.current) {
      if (isUserNearBottomRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
        setShowScrollBottomBtn(false);
        setUnreadNewScrollCount(0);
      } else if (hasNewIncomingMessage) {
        // Only show "New Message" button when user is scrolled up AND a new incoming message actually arrived
        setShowScrollBottomBtn(true);
        setUnreadNewScrollCount(prev => prev + 1);
      }
    }
  }, [messages]);

  // Persist 1-on-1 conversation locally
  useEffect(() => {
    if (!activeConversationId) return;
    try {
      localStorage.setItem(`locohelp_chat_${activeConversationId}`, JSON.stringify(messages));
    } catch (e) {}
  }, [messages, activeConversationId]);

  // Real-time cross-device server sync for 1-on-1 conversation & Post Owner Inbox list
  useEffect(() => {
    let isMounted = true;

    const syncChat = async () => {
      try {
        const activeUser = getCurrentUser();
        const myUid = activeUser?.uid || '';
        const myEmail = (activeUser?.email || '').toLowerCase();

        // If Post Owner, also keep the list of responders synced so they can switch or select a helper
        if (isPostOwner) {
          try {
            const token = localStorage.getItem('locohelp_token');
            const convRes = await fetch(
              `/api/chat/conversations?postId=${encodeURIComponent(chatId)}&userId=${encodeURIComponent(myUid)}&ownerEmail=${encodeURIComponent(myEmail)}&_t=${Date.now()}`,
              {
                cache: 'no-store',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
              }
            );
            if (convRes.ok) {
              const convList = await convRes.json();
              if (isMounted && Array.isArray(convList)) {
                setInboxConversations(convList);
                if (!selectedReplierId && convList.length > 0) {
                  const firstHelper = convList[0];
                  const firstHelperId = firstHelper.helperId || firstHelper.senderId || firstHelper.helper_id;
                  if (firstHelperId) {
                    setSelectedReplierId(firstHelperId);
                    setSelectedReplierName(firstHelper.helperName || firstHelper.senderName || 'Community Helper');
                    setSelectedReplierEmail(firstHelper.helperEmail || firstHelper.senderEmail || null);
                    setSelectedReplierAvatar(firstHelper.helperAvatar || firstHelper.senderAvatar || null);
                  }
                }
              }
            }
          } catch {}
        }

        // STRICT RULE: If Post Owner has not selected a specific Helper yet, do NOT load a mixed chat feed
        if (isPostOwner && !selectedReplierId) {
          return;
        }
        if (!activeConversationId) return;

        const serverMessages = await fetchChatMessages(activeConversationId, {
          postId: chatId,
          helperId: activeHelperId,
          userId: myUid,
          userEmail: myEmail
        });

        if (isMounted && Array.isArray(serverMessages)) {
          setMessages(prev => {
            const map = new Map<string, any>();
            prev.forEach(m => {
              if (m && m.id) map.set(m.id, m);
            });
            serverMessages.forEach((m: any) => {
              if (m && m.id) {
                const existing = map.get(m.id);
                const resolvedAuthorId = String(
                  m.sender_id || m.senderId || m.authorId || m.user_id || existing?.sender_id || existing?.authorId || 'peer'
                ).trim();
                const resolvedAuthorName = String(
                  m.sender_name || m.senderName || m.authorName || existing?.authorName || 'Community Peer'
                ).trim();
                const resolvedEmail = String(
                  m.sender_email || m.senderEmail || m.authorEmail || existing?.senderEmail || ''
                ).trim().toLowerCase();
                const resolvedAvatar = String(
                  m.sender_avatar || m.senderAvatar || m.authorAvatar || existing?.senderAvatar || ''
                ).trim();
                map.set(m.id, {
                  id: m.id,
                  text: m.text || m.content || m.message || (existing?.text || ''),
                  type: m.type || existing?.type || 'text',
                  authorId: resolvedAuthorId,
                  sender_id: resolvedAuthorId,
                  user_id: resolvedAuthorId,
                  authorName: resolvedAuthorName,
                  sender_name: resolvedAuthorName,
                  senderEmail: resolvedEmail,
                  sender_email: resolvedEmail,
                  senderAvatar: resolvedAvatar,
                  receiverId: m.receiverId || m.receiver_id || existing?.receiverId || undefined,
                  isCollaborator: Boolean(m.isCollaborator || m.is_collaborator || existing?.isCollaborator),
                  attachmentUrl: m.attachmentUrl || m.attachment_url || existing?.attachmentUrl || undefined,
                  attachmentType: m.attachmentType || m.attachment_type || existing?.attachmentType || undefined,
                  createdAt: m.createdAt || m.created_at || m.sent_at || existing?.createdAt || new Date().toISOString()
                });
              }
            });
            const list = Array.from(map.values()) as any[];
            list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
            return list;
          });
        }
      } catch (e) {}
    };

    syncChat();
    const pollInterval = setInterval(syncChat, 1200);
    const unsubStream = subscribeToRealtimeStream({
      onNewResponse: (payload) => {
        if (!currentIntent) {
          loadAllChats();
        } else if (payload?.postId === chatId) {
          syncChat();
        }
      }
    });

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      unsubStream();
    };
  }, [chatId, isPostOwner, selectedReplierId, activeConversationId, activeHelperId, currentIntent]);

  const handleToggleBlockPeer = async () => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }
    const activeUser = getCurrentUser();
    const myId = activeUser?.uid || activeUser?.email || 'my_user';
    const myEmail = (activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
    const peerTargetId = isPostOwner ? (selectedReplierId || '') : (currentIntent?.authorId || chatId);
    const peerTargetName = isPostOwner ? (selectedReplierName || 'User') : ((currentIntent as any)?.authorName || 'User');

    if (isChatBlocked && blockedByMe) {
      const res = await unblockUserInChatOnServer({
        blockerId: myId,
        blockedId: peerTargetId,
        chatId
      });
      if (res.success) {
        setIsChatBlocked(false);
        setBlockedByMe(false);
        setReportStatusBanner('✅ यूज़र को अनब्लॉक कर दिया गया है। अब आप संदेश भेज सकते हैं।');
        setTimeout(() => setReportStatusBanner(null), 4000);
      }
    } else {
      const res = await blockUserInChatOnServer({
        blockerId: myId,
        blockerEmail: myEmail,
        blockedId: peerTargetId,
        blockedName: peerTargetName,
        chatId,
        reason: 'Blocked directly by user in chat'
      });
      if (res.success) {
        setIsChatBlocked(true);
        setBlockedByMe(true);
        setReportStatusBanner('🚫 इस यूज़र को ब्लॉक कर दिया गया है। अब यह आपको संदेश नहीं भेज सकेगा।');
        setTimeout(() => setReportStatusBanner(null), 4000);
      }
    }
  };

  const handleSubmitChatReport = async () => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }
    setIsSubmittingReport(true);
    try {
      const activeUser = getCurrentUser();
      const myId = activeUser?.uid || activeUser?.email || 'my_user';
      const myEmail = (activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
      const myName =
        activeUser?.displayName ||
        localStorage.getItem('locohelp_profile_name') ||
        (myEmail ? myEmail.split('@')[0] : 'Verified User');
      const peerTargetId = isPostOwner ? (selectedReplierId || '') : (currentIntent?.authorId || chatId);
      const peerTargetName = isPostOwner ? (selectedReplierName || 'Community Peer') : ((currentIntent as any)?.authorName || 'Community Peer');

      const snapshotToSave = visibleMessages.map(m => ({
        id: m.id,
        senderId: m.sender_id || m.authorId,
        senderName: m.authorName || m.sender_name || 'User',
        senderEmail: m.senderEmail || m.sender_email || '',
        receiverId: m.receiverId || '',
        text: m.text,
        type: m.type || 'text',
        attachmentUrl: m.attachmentUrl || '',
        createdAt: m.createdAt || new Date().toISOString()
      }));

      const selectedReasonObj =
        COMPLIANCE_REPORT_REASONS.find(r => r.key === reportReasonKey) || COMPLIANCE_REPORT_REASONS[0];
      const localizedReason =
        language === 'EN'
          ? selectedReasonObj.EN
          : language === 'GU'
          ? selectedReasonObj.GU
          : selectedReasonObj.HI;

      const res = await submitChatReportToServer({
        reason: `${selectedReasonObj.EN} / ${ localizedReason }`,
        details: reportDetails.trim(),
        description: reportDetails.trim(),
        reporterId: myId,
        reporterName: myName,
        reporterEmail: myEmail,
        reportedUserId: peerTargetId,
        reportedUserName: peerTargetName,
        reportedPostId: currentIntent?.id || null,
        chatId,
        chatSnapshot: snapshotToSave,
        blockUser: alsoBlockUser
      });

      if (res.success) {
        if (alsoBlockUser) {
          setIsChatBlocked(true);
          setBlockedByMe(true);
          try {
            const blockedUsers: string[] = JSON.parse(localStorage.getItem('locohelp_blocked_user_ids') || '[]');
            if (peerTargetId && !blockedUsers.includes(peerTargetId)) {
              blockedUsers.push(peerTargetId);
              localStorage.setItem('locohelp_blocked_user_ids', JSON.stringify(blockedUsers));
            }
          } catch {}
        }
        try {
          window.dispatchEvent(
            new CustomEvent('locohelp_report_submitted', {
              detail: {
                reportedUserId: peerTargetId,
                reportedPostId: currentIntent?.id || null,
                blocked: alsoBlockUser,
                autoFlaggedUser: Boolean(res.autoFlaggedUser),
                autoFlaggedPost: Boolean(res.autoFlaggedPost)
              }
            })
          );
        } catch {}
        setIsReportChatModalOpen(false);
        setReportDetails('');
        setReportStatusBanner(
          alsoBlockUser
            ? tr(
                '🛡️ Report & conversation evidence sent to Admin, and this user has been blocked.',
                '🛡️ चैट रिपोर्ट और संपूर्ण बातचीत का रिकॉर्ड एडमिन को भेज दिया गया है तथा इस यूज़र को ब्लॉक कर दिया गया है।',
                '🛡️ ચેટ રિપોર્ટ અને સંપૂર્ણ વાતચીતનો રેકોર્ડ એડમિનને મોકલી દેવામાં આવ્યો છે અને આ યુઝરને બ્લોક કરી દેવામાં આવ્યો છે.'
              )
            : tr(
                '🛡️ Report & conversation evidence sent to Admin for review.',
                '🛡️ चैट रिपोर्ट और संपूर्ण बातचीत का रिकॉर्ड एडमिन को भेज दिया गया है।',
                '🛡️ ચેટ રિપોર્ટ અને સંપૂર્ણ વાતચીતનો રેકોર્ડ એડમિનને મોકલી દેવામાં આવ્યો છે.'
              )
        );
        setTimeout(() => setReportStatusBanner(null), 6000);
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleSend = async (textToSend: string, type: 'text' | 'pin' | 'attachment' | 'task_completed' = 'text', attachmentUrl?: string, attachmentType?: string) => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }
    if (isPostOwner && !selectedReplierId) {
      setReportStatusBanner('⚠️ कृपया जवाब देने के लिए पहले ऊपर सूची से किसी हेल्पर (Responder) को चुनें।');
      setTimeout(() => setReportStatusBanner(null), 4000);
      return;
    }
    if (isChatBlocked) {
      setReportStatusBanner('🚫 यह चैट ब्लॉक है। संदेश भेजने के लिए पहले अनब्लॉक करें।');
      setTimeout(() => setReportStatusBanner(null), 4000);
      return;
    }
    const trimmed = sanitizeText(textToSend.trim(), 2000);
    if (!trimmed && !attachmentUrl) return;
    setInput('');

    const activeUser = getCurrentUser();
    const activeUid = activeUser?.uid || 'my_user';
    const activeEmail = (activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
    const activeName =
      activeUser?.displayName ||
      localStorage.getItem('locohelp_profile_name') ||
      (activeEmail ? activeEmail.split('@')[0] : 'Verified User');
    const activeAvatar = activeUser?.photoURL || localStorage.getItem('locohelp_profile_photo') || '';

    const targetReceiverId = isPostOwner
      ? String(selectedReplierId || '').trim()
      : String(currentIntent?.authorId || chatId).trim();
    const targetHelperId = isPostOwner
      ? String(selectedReplierId || activeHelperId || '').trim()
      : String(activeHelperId || activeUid).trim();
    const convIdToUse = activeConversationId || `conv_${chatId}__${targetHelperId.toLowerCase()}`;
    const resolvedPostOwnerId = isPostOwner
      ? (currentIntent?.authorId || activeUid)
      : (currentIntent?.authorId || targetReceiverId);
    const resolvedPostOwnerEmail = isPostOwner
      ? ((currentIntent as any)?.authorEmail || activeEmail)
      : ((currentIntent as any)?.authorEmail || '');

    const messageData: any = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      conversationId: convIdToUse,
      conversation_id: convIdToUse,
      postId: chatId,
      post_id: chatId,
      intent_id: chatId,
      postOwnerId: resolvedPostOwnerId,
      post_owner_id: resolvedPostOwnerId,
      postOwnerEmail: resolvedPostOwnerEmail,
      post_owner_email: resolvedPostOwnerEmail,
      helperId: targetHelperId,
      helper_id: targetHelperId,
      helperName: isPostOwner ? (selectedReplierName || 'Community Helper') : activeName,
      helperEmail: isPostOwner ? (selectedReplierEmail || '') : activeEmail,
      helperAvatar: isPostOwner ? (selectedReplierAvatar || '') : activeAvatar,
      authorId: activeUid,
      sender_id: activeUid,
      user_id: activeUid,
      authorName: activeName,
      sender_name: activeName,
      senderEmail: activeEmail,
      sender_email: activeEmail,
      senderAvatar: activeAvatar,
      receiverId: targetReceiverId,
      receiver_id: targetReceiverId,
      text: trimmed,
      type,
      createdAt: new Date().toISOString()
    };

    if (attachmentUrl) messageData.attachmentUrl = attachmentUrl;
    if (attachmentType) messageData.attachmentType = attachmentType;

    // Optimistic UI update
    setMessages(prev => [...prev, messageData]);

    // User's own message scrolls to bottom
    isUserNearBottomRef.current = true;
    setShowScrollBottomBtn(false);
    setUnreadNewScrollCount(0);
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 50);

    // Track that the current user has participated in chat on this post
    try {
      if (chatId) {
        const chatted: string[] = JSON.parse(localStorage.getItem('locohelp_chatted_post_ids') || '[]');
        if (!chatted.includes(chatId)) {
          chatted.push(chatId);
          localStorage.setItem('locohelp_chatted_post_ids', JSON.stringify(chatted));
          window.dispatchEvent(new CustomEvent('locohelp_chatted_posts_updated'));
        }
      }
    } catch (e) {}

    // Store in backend PostgreSQL conversations + messages via POST /api/chat/send
    try {
      await sendChatMessage(chatId, messageData);
    } catch (e) {}
  };

  const handleDeleteMessage = async (msgId: string) => {
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== msgId);
      try {
        localStorage.setItem(`locohelp_chat_${chatId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    try {
      const token = localStorage.getItem('locohelp_token') || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/messages/${encodeURIComponent(msgId)}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {}
  };

  const handleCollaborateWithReplier = async (replierId: string, replierName: string) => {
    if (!chatId) return;
    try {
      const token = localStorage.getItem('locohelp_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/intents/${encodeURIComponent(chatId)}/collaborate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ helperId: replierId, helperName: replierName })
      });
      if (res.ok) {
        setCollaboratorId(replierId);
      }
    } catch (e) {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      if (e.target) e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const check = await validateUploadedFile(file, { allowPdf: true });
      if (!check.valid) {
        setReportStatusBanner(`⚠️ ${check.errorHi || check.error || 'केवल सुरक्षित इमेज (JPEG, PNG, WebP) या PDF की अनुमति है।'}`);
        setTimeout(() => setReportStatusBanner(null), 4500);
        if (e.target) e.target.value = '';
        return;
      }
      setCameraError('');
      setIsGalleryPreview(true);
      setPhotoCaption('');
      if (file.type.startsWith('image/')) {
        try {
          const compressed = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.78, folder: 'chat_attachments' });
          setPhotoCaptured(compressed);
          setIsCameraOpen(true);
        } catch {
          const uploaded = await uploadFileToFirebaseStorage(file, 'chat_attachments', file.name);
          setPhotoCaptured(uploaded);
          setIsCameraOpen(true);
        }
      } else {
        const uploaded = await uploadFileToFirebaseStorage(file, 'chat_attachments', file.name);
        setPhotoCaptured(uploaded);
        setIsCameraOpen(true);
      }
    }
    if (e.target) e.target.value = '';
  };

  const startCamera = async () => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }
    setIsGalleryPreview(false);
    setPhotoCaption('');
    setIsCameraOpen(true);
    setPhotoCaptured(null);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError('Camera access unavailable. Please use gallery/file upload below.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setPhotoCaptured(null);
    setPhotoCaption('');
    setIsGalleryPreview(false);
    setCameraError('');
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.srcObject) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp', 0.82);
        setPhotoCaptured(dataUrl);
      }
    } else {
      fallbackCameraInputRef.current?.click();
    }
  };

  const sendPhotoInChat = async () => {
    if (!photoCaptured) return;
    const imgToSend = photoCaptured;
    const captionText = photoCaption.trim() || "📷 फोटो साझा की गई (Photo shared)";
    stopCamera();
    await handleSend(captionText, 'attachment', imgToSend, 'image');
  };

  const handleShareLocationInChat = () => {
    if (isGuestUser()) {
      setIsMapModalOpen(false);
      setIsLoginPromptOpen(true);
      return;
    }
    setIsSharingLiveLocation(true);
    const sendFallbackPin = () => {
      const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(peerLocation)}`;
      handleSend(`📍 लोकेशन साझा की गई: ${peerLocation} | ${mapUrl}`, 'pin');
      setIsSharingLiveLocation(false);
      setIsMapModalOpen(false);
      setReportStatusBanner('✅ लोकेशन पिन चैट में सफलतापूर्वक भेज दिया गया है!');
      setTimeout(() => setReportStatusBanner(null), 3500);
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          handleSend(`📍 मेरी लाइव GPS लोकेशन (${peerLocation}) | ${mapUrl}`, 'pin');
          setIsSharingLiveLocation(false);
          setIsMapModalOpen(false);
          setReportStatusBanner('✅ आपकी लाइव GPS लोकेशन चैट में भेज दी गई है!');
          setTimeout(() => setReportStatusBanner(null), 3500);
        },
        () => {
          sendFallbackPin();
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 60000 }
      );
    } else {
      sendFallbackPin();
    }
  };

  const handleDeleteAndArchiveChat = () => {
    setIsDeleting(true);
    try {
      localStorage.removeItem(`locohelp_chat_${chatId}`);
      const deletedIds = JSON.parse(localStorage.getItem('locohelp_deleted_chats') || '[]');
      if (!deletedIds.includes(chatId)) {
        deletedIds.push(chatId);
        localStorage.setItem('locohelp_deleted_chats', JSON.stringify(deletedIds));
      }
    } catch (e) {}
    setIsDeleting(false);
    setIsDeleteConfirmOpen(false);
    onBack();
  };

  const submitRating = async () => {
    setIsTaskDone(true);
    setIsRatingOpen(false);
    setShowSuccessToast(true);
    const completeMsg = {
      id: 'done_' + Date.now(),
      text: `🎉 Task Successfully Completed! Rating: ${'★'.repeat(rating)} (${rating}/5). +10 Karma points awarded!`,
      type: 'task_completed' as const,
      authorId: 'system',
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, completeMsg]);
    setTimeout(() => {
      setShowSuccessToast(false);
      setIsCompletionSummaryOpen(true);
    }, 1200);
  };

  const savedProfileName = (() => {
    try {
      const p = localStorage.getItem('locohelp_profile_name');
      if (p && p !== 'Ramesh Sharma') return p;
      return currentUser?.displayName;
    } catch(e) { return null; }
  })();

  const rawSeller = isPostOwner
    ? (selectedReplierName || 'Select a Responder')
    : (selectedReplierName || (currentIntent as any)?.sellerName || (currentIntent as any)?.authorName || (currentIntent as any)?.name);
  const validSeller = rawSeller && rawSeller !== 'Ramesh Sharma' ? rawSeller : null;

  const peerName = validSeller || (!isPostOwner ? savedProfileName : null) || "Community Peer";
  const peerBadge = (currentIntent as any)?.badge || "Verified Community Peer";
  const peerDistance = currentIntent?.distance || 0.5;
  const rawLocation = (currentIntent as any)?.location || (currentIntent as any)?.area || (currentIntent as any)?.city || (() => {
    try { return localStorage.getItem('locohelp_profile_address'); } catch(e) { return null; }
  })() || "Local Area";
  const peerLocation = typeof rawLocation === 'string'
    ? rawLocation.replace(/^,\s*|,\s*$|,+/g, ',').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim() || "Local Area"
    : "Local Area";
  const topicDesc = currentIntent?.description || (currentIntent as any)?.title || "LocoHelp Direct Broadcast & Service Inquiry";

  const distinctRepliers = React.useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      email?: string;
      avatar?: string;
      lastMessage?: string;
      updatedAt?: string;
      count: number;
      unreadCount: number;
      isCollaborator?: boolean;
    }>();

    inboxConversations.forEach((c: any) => {
      const hId = String(c?.helperId || c?.helper_id || c?.senderId || '').trim();
      if (!hId || hId === 'system') return;
      if (isMessageSentByUser({ sender_id: hId, sender_email: c?.helperEmail || c?.senderEmail }, currentUser)) return;
      map.set(hId.toLowerCase(), {
        id: hId,
        name: c.helperName || c.senderName || 'Community Helper',
        email: c.helperEmail || c.senderEmail || '',
        avatar: c.helperAvatar || c.senderAvatar || '',
        lastMessage: c.lastMessage || c.last_message || 'Sent a message',
        updatedAt: c.lastMessageAt || c.updatedAt || new Date().toISOString(),
        count: Number(c.count) || 1,
        unreadCount: Number(c.unreadPosterCount ?? c.unreadCount) || 0,
        isCollaborator: Boolean(c.isCollaborator)
      });
    });

    messages.forEach(m => {
      const sId = String(m.sender_id || m.authorId || '').trim();
      if (!sId || sId === 'system' || m.type === 'task_completed') return;
      const sentByMe = isMessageSentByUser(m, currentUser);
      if (!sentByMe) {
        const key = sId.toLowerCase();
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            id: sId,
            name: m.authorName || m.sender_name || 'Community Helper',
            email: m.senderEmail || m.sender_email || '',
            avatar: m.senderAvatar || '',
            lastMessage: m.text || 'Sent a message',
            updatedAt: m.createdAt || new Date().toISOString(),
            count: 1,
            unreadCount: 0,
            isCollaborator: Boolean(m.isCollaborator)
          });
        } else {
          existing.count += 1;
          if (m.isCollaborator) existing.isCollaborator = true;
        }
      }
    });
    return Array.from(map.values());
  }, [inboxConversations, messages, currentUser]);

  const visibleMessages = React.useMemo(() => {
    if (isPostOwner && !selectedReplierId) return [];
    return messages;
  }, [messages, isPostOwner, selectedReplierId]);

  /* -------------------------------------------------------------
   * IF NO POST/CONVERSATION IS SELECTED:
   * Render the All Conversations List View (WhatsApp-style)
   * ------------------------------------------------------------- */
  if (!currentIntent) {
    return (
      <div className="flex flex-col h-full bg-[#FCFAF5] dark:bg-slate-900 relative overflow-hidden transition-colors">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs z-20 sticky top-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="p-2 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full transition-colors active:scale-95 cursor-pointer"
              title={tr('Back', 'वापस जाएं', 'પાછા જાઓ')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {tr('My Chats', 'मेरी बातचीत', 'મારી વાતચીત')}
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={loadAllChats}
            disabled={isLoadingAllChats}
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title={tr('Refresh Chats', 'चैट रिफ्रेश करें', 'ચેટ રિફ્રેશ કરો')}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAllChats ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {isLoadingAllChats ? (
            <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span>{tr('Loading chats...', 'चैट लोड हो रही हैं...', 'વાતચીત લોડ થઈ રહી છે...')}</span>
            </div>
          ) : allUserConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl mb-3.5 shadow-inner">
                💬
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-1.5">
                {tr('No chats yet', 'अभी तक कोई बातचीत नहीं है', 'હજુ કોઈ વાતચીત શરૂ થઈ નથી')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-5 leading-relaxed">
                {tr(
                  'When you chat on a live broadcast post or someone replies to you, conversations will appear here.',
                  'जब आप किसी ब्रॉडकास्ट पोस्ट पर चैट करेंगे या कोई आपको रिप्लाई करेगा, तो बातचीत यहाँ दिखेगी।',
                  'જ્યારે તમે કોઈ લાઈવ બ્રોડકાસ્ટ પોસ્ટ પર ચેટ કરશો અથવા તમારી પોસ્ટ પર કોઈ રિપ્લાય કરશે, ત્યારે તે વાતચીત અહીં દેખાશે.'
                )}
              </p>
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md cursor-pointer active:scale-95 transition-all"
              >
                {tr('View Live Broadcasts', 'लाइव ब्रॉडकास्ट देखें', 'લાઈવ બ્રોડકાસ્ટ પોસ્ટ્સ જુઓ')}
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-w-2xl mx-auto">
              {allUserConversations.map((conv) => {
                const convId = conv.id || conv.conversationId;
                const activeUser = getCurrentUser();
                const myUid = String(activeUser?.uid || '').trim().toLowerCase();
                const myEmail = String(activeUser?.email || '').trim().toLowerCase();
                const emailDerivedId = myEmail ? `email_${myEmail.replace(/[^a-z0-9]/g, '_')}` : '';

                const convHelperId = String(conv.helperId || conv.helper_id || conv.senderId || '').trim();
                const convHelperEmail = String(conv.helperEmail || conv.senderEmail || '').trim().toLowerCase();
                const convPosterId = String(conv.posterId || conv.poster_id || '').trim();
                const convPosterEmail = String(conv.posterEmail || conv.poster_email || '').trim().toLowerCase();

                let isMyOwnPostId = false;
                try {
                  const myPostIds: string[] = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');
                  const cPostId = String(conv.postId || conv.post_id || '').trim();
                  if (cPostId && myPostIds.includes(cPostId)) isMyOwnPostId = true;
                } catch {}

                const isPosterMe = Boolean(
                  isMyOwnPostId ||
                  (myUid && convPosterId && convPosterId.toLowerCase() === myUid) ||
                  (emailDerivedId && convPosterId && convPosterId.toLowerCase() === emailDerivedId) ||
                  (myEmail && convPosterEmail && convPosterEmail === myEmail)
                );

                const isHelperMe = !isPosterMe && Boolean(
                  (myUid && convHelperId && convHelperId.toLowerCase() === myUid) ||
                  (emailDerivedId && convHelperId && convHelperId.toLowerCase() === emailDerivedId) ||
                  (myEmail && convHelperEmail && convHelperEmail === myEmail)
                );
                const isOwner = isPosterMe || !isHelperMe;

                const partnerName = isOwner
                  ? (conv.helperName || conv.senderName || 'Community Helper')
                  : (conv.posterName && conv.posterName !== 'Post Owner'
                      ? conv.posterName
                      : (conv.posterEmail ? conv.posterEmail.split('@')[0] : 'Post Owner'));
                const partnerAvatar = isOwner
                  ? (conv.helperAvatar || conv.senderAvatar || '')
                  : (conv.posterAvatar || '');
                const lastMsg = conv.lastMessage || conv.last_message || tr('Sent a message', 'संदेश भेजा', 'મેસેજ મોકલ્યો');
                const lastTime = conv.lastMessageAt || conv.last_message_at || conv.updatedAt;
                const hasUnread = Number(conv.unreadCount || 0) > 0;

                return (
                  <div
                    key={convId}
                    onClick={() => {
                      const resolvedAuthorId = isOwner
                        ? (convPosterId || activeUser?.uid || '')
                        : (convPosterId || conv.postId || conv.post_id || conv.id);
                      const resolvedAuthorEmail = isOwner
                        ? (convPosterEmail || myEmail)
                        : convPosterEmail;
                      const resolvedHelperId = convHelperId || (!isOwner ? (activeUser?.uid || '') : '');
                      const resolvedHelperEmail = convHelperEmail || (!isOwner ? myEmail : '');

                      setSelectedReplierId(resolvedHelperId || null);
                      setSelectedReplierName(partnerName);
                      setSelectedReplierEmail(isOwner ? resolvedHelperEmail : resolvedAuthorEmail);
                      setSelectedReplierAvatar(partnerAvatar || null);

                      setCurrentIntent({
                        id: conv.postId || conv.post_id || conv.id,
                        authorId: resolvedAuthorId,
                        authorEmail: resolvedAuthorEmail,
                        authorName: isOwner ? (activeUser?.displayName || 'You') : partnerName,
                        location: conv.location || 'Local Area',
                        description: conv.postTitle || conv.postDescription || lastMsg,
                        helperId: resolvedHelperId,
                        selectedReplierId: resolvedHelperId,
                        selectedReplierName: partnerName,
                        selectedReplierEmail: isOwner ? resolvedHelperEmail : resolvedAuthorEmail,
                        selectedReplierAvatar: partnerAvatar,
                        conversationId: convId,
                        distance: 0.5,
                        tags: ['#General'],
                        status: 'open',
                        createdAt: new Date().toISOString(),
                        expiresAt: new Date(Date.now() + 3600000).toISOString()
                      } as unknown as Intent);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                      hasUnread
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs ring-1 ring-rose-400/30'
                        : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:bg-indigo-50/50 dark:hover:bg-slate-750 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0 border border-indigo-200 dark:border-slate-700 overflow-hidden shadow-2xs">
                          {partnerAvatar ? (
                            <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                          ) : (
                            partnerName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-855 rounded-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {partnerName}
                          </span>
                          {lastTime && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                              {new Date(lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                          {lastMsg}
                        </p>
                      </div>
                    </div>
                    {hasUnread && (
                      <span className="text-[9px] bg-rose-500 text-white font-black px-2 py-0.5 rounded-full shadow-2xs animate-pulse shrink-0">
                        🔴 {tr('New', 'नया', 'નવું')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FCFAF5] dark:bg-slate-900 relative overflow-hidden transition-colors">
      
      {/* 1. COMPACT UNIFIED WHATSAPP-STYLE TOP HEADER */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs z-30 sticky top-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            type="button"
            onClick={() => {
              if (isPostOwner && selectedReplierId && distinctRepliers.length > 1) {
                setSelectedReplierId(null);
              } else if (intent) {
                onBack();
              } else {
                setCurrentIntent(null);
              }
            }} 
            className="p-1.5 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
            title={isModal ? tr('Close Chat', 'चैट बंद करें', 'ચેટ બંધ કરો') : tr('Back', 'वापस जाएं', 'પાછા જાઓ')}
          >
            {isModal && !(isPostOwner && selectedReplierId && distinctRepliers.length > 1) ? (
              <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            ) : (
              <ArrowLeft className="w-5 h-5" />
            )}
          </button>

          {/* Profile Clickable Header */}
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0 flex-1"
          >
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {peerName[0]?.toUpperCase() || 'U'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate">
                  {peerName}
                </h2>
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                {collaboratorId && selectedReplierId && collaboratorId === selectedReplierId && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                    🤝
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMapModalOpen(true);
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5 hover:underline cursor-pointer shrink-0"
                  title="View on Map"
                >
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span>{peerLocation} ({peerDistance}km)</span>
                </span>
                <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
                <span className="truncate font-semibold text-slate-600 dark:text-slate-300" title={topicDesc}>
                  {topicDesc}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Replier Switcher (ONLY if >1 people replied) + Single Clean 3-Dot Options Menu */}
        <div className="flex items-center gap-1 shrink-0 relative">
          {isPostOwner && distinctRepliers.length > 1 && selectedReplierId && (
            <button
              type="button"
              onClick={() => setSelectedReplierId(null)}
              className="px-2 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-black cursor-pointer hover:bg-emerald-100 transition-colors"
              title={tr('Switch Responder', 'जवाब देने वाले बदलें', 'જવાબ આપનાર બદલો')}
            >
              👥 {distinctRepliers.length}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsHeaderMenuOpen(prev => !prev)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={tr('Chat Options', 'चैट विकल्प', 'ચેટ વિકલ્પો')}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {isHeaderMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsHeaderMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs font-bold overflow-hidden">
                {selectedReplierId && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleCollaborateWithReplier(selectedReplierId, selectedReplierName || peerName);
                    }}
                    className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                  >
                    <span>🤝</span>
                    <span>
                      {collaboratorId === selectedReplierId
                        ? tr('Collaborating', 'सहयोगी चयनित', 'સહયોગી પસંદ કરેલ')
                        : tr('Collaborate', 'सहयोग करें (Collaborate)', 'સહયોગ કરો (Collaborate)')}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setIsRatingOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{tr('Mark Task Complete', 'काम पूरा हुआ (Complete)', 'કામ પૂર્ણ થયું (Complete)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setIsMapModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{tr('Location & Map', 'मैप और लोकेशन', 'મેપ અને લોકેશન')}</span>
                </button>

                {isModal && onExpandFullScreen && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onExpandFullScreen();
                    }}
                    className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <span className="text-sm leading-none">⛶</span>
                    <span>{tr('Full Screen Chat', 'फुल स्क्रीन चैट', 'ફુલ સ્ક્રીન ચેટ')}</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    handleToggleBlockPeer();
                  }}
                  className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                >
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>
                    {isChatBlocked && blockedByMe
                      ? tr('Unblock User', 'यूज़र अनब्लॉक करें', 'યુઝર અનબ્લોક કરો')
                      : tr('Block User', 'यूज़र ब्लॉक करें', 'યુઝર બ્લોક કરો')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setIsReportChatModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{tr('Report / Block', 'रिपोर्ट / ब्लॉक करें', 'રિપોર્ટ / બ્લોક કરો')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compact 1-Line Dismissible Safety Warning Strip */}
      {!isSafetyBannerDismissed && (
        <div className="px-3 py-1 bg-amber-50/95 dark:bg-amber-950/70 border-b border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between gap-2 text-[10px] font-bold text-amber-900 dark:text-amber-200">
          <span className="truncate">
            {language === 'EN'
              ? '⚠️ Never pay advance online before work is done. Verify in person.'
              : language === 'GU'
              ? '⚠️ કામ પૂર્ણ થયા પહેલા ઓનલાઈન એડવાન્સ પૈસા આપશો નહીં.'
              : '⚠️ काम पूरा होने से पहले ऑनलाइन एडवांस पैसे न दें।'}
          </span>
          <button
            type="button"
            onClick={() => setIsSafetyBannerDismissed(true)}
            className="text-amber-700 dark:text-amber-300 hover:text-amber-950 px-1 font-black shrink-0 cursor-pointer"
            title={tr('Dismiss', 'हटाएं', 'બંધ કરો')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Report / Block Status Notification Banner */}
      {reportStatusBanner && (
        <div className="px-4 py-2 bg-rose-600 text-white text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
          <span>{reportStatusBanner}</span>
          <button onClick={() => setReportStatusBanner(null)} className="text-white/80 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-600 text-white px-4 py-2.5 mx-4 mt-2 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold z-20"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>Task complete! Rating & +10 Karma points successfully credited.</span>
            </div>
            <button onClick={() => setShowSuccessToast(false)} className="text-white/80 hover:text-white">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MESSAGES VIEWPORT (Or Responder Selection Inbox if Post Owner hasn't picked a Helper) */}
      <div ref={messagesContainerRef} onScroll={handleContainerScroll} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8F6F0] dark:bg-slate-950 relative">
        {isPostOwner && !selectedReplierId ? (
          <div className="py-8 max-w-md mx-auto space-y-3">
            {distinctRepliers.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-xl">
                  💬
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  No responses yet / अभी तक कोई जवाब नहीं आया
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  No responses yet. When someone messages you about this post, their chat will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs font-black text-slate-700 dark:text-slate-200 px-1">
                  💬 Select a person below to open your 1-on-1 chat (बातचीत शुरू करने के लिए किसी एक व्यक्ति को चुनें):
                </p>
                {distinctRepliers.map(rep => (
                  <div
                    key={rep.id}
                    onClick={() => {
                      setSelectedReplierId(rep.id);
                      setSelectedReplierName(rep.name);
                      setSelectedReplierEmail(rep.email || null);
                      setSelectedReplierAvatar(rep.avatar || null);
                    }}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 shadow-xs cursor-pointer flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                        {rep.name[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{rep.name}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {rep.lastMessage || 'Tap to view 1-on-1 chat'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black shrink-0">
                      Open Chat →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center text-xl shadow-inner">
              💬
            </div>
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
              Start 1-on-1 Conversation / बातचीत शुरू करें
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-medium">
              Type your message below to start chatting privately with {peerName}.
            </p>
          </div>
        ) : null}
        {visibleMessages.map((msg) => {
          const activeUser = getCurrentUser();
          const isMe = isMessageSentByUser(msg, activeUser);
          const isSystem = msg.authorId === 'system' || msg.type === 'task_completed';
          const senderDisplayName =
            msg.authorName ||
            msg.sender_name ||
            (msg.senderEmail ? msg.senderEmail.split('@')[0] : peerName) ||
            'Community Peer';

          if (isSystem) {
            return (
              <div key={msg.id} className="my-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'pin') {
            const urlMatch = msg.text.match(/https?:\/\/[^\s]+/);
            const extractedMapUrl = urlMatch ? urlMatch[0] : `https://www.google.com/maps?q=${encodeURIComponent(peerLocation)}`;
            const cleanPinLabel = msg.text.replace(/\|\s*https?:\/\/[^\s]+/, '').trim();
            return (
              <div key={msg.id} className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[82%] p-3.5 rounded-2xl flex flex-col gap-2 text-xs font-bold shadow-xs ${
                    isMe
                      ? 'bg-emerald-600 text-white ml-auto rounded-tr-xs'
                      : 'bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 mr-auto rounded-tl-xs'
                  }`}
                >
                  {!isMe && (
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                      {senderDisplayName}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isMe ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'}`}>
                      <MapPin className="w-4 h-4 animate-bounce" />
                    </div>
                    <span className="leading-snug">{cleanPinLabel}</span>
                  </div>
                  <a
                    href={extractedMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2 px-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors ${
                      isMe
                        ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>🗺️ Google Maps पर लोकेशन देखें</span>
                  </a>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`max-w-[80%] p-3.5 rounded-2xl shadow-xs flex flex-col gap-1.5 ${
                  isMe 
                    ? 'bg-indigo-600 text-white self-end ml-auto rounded-tr-xs' 
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 self-start mr-auto rounded-tl-xs'
                }`}
              >
                {!isMe && (
                  <div className="flex items-center gap-1.5 pb-0.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 truncate">
                      {senderDisplayName}
                    </span>
                  </div>
                )}
                {Boolean(msg.attachmentUrl) && (
                  <div 
                    onClick={() => setZoomedImage(msg.attachmentUrl!)}
                    className="cursor-pointer overflow-hidden rounded-xl border border-white/20 mb-1 bg-black/10"
                  >
                    <img src={msg.attachmentUrl} alt="Chat photo" loading="lazy" decoding="async" className="w-full max-h-64 object-cover hover:scale-102 transition-transform" />
                  </div>
                )}
                <p className={`text-xs font-medium leading-relaxed whitespace-pre-wrap ${isMe ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                  {msg.text}
                </p>
                <div className={`flex items-center justify-between gap-2 mt-0.5 pt-1 border-t ${isMe ? 'border-white/15' : 'border-slate-100 dark:border-slate-700/60'}`}>
                  <span className={`text-[9px] font-semibold ${isMe ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                  {isMe && (
                    <span className="flex items-center text-[11px] font-extrabold leading-none tracking-tighter" title={msg.isRead ? 'Seen / Read' : 'Delivered'}>
                      {msg.isRead ? (
                        <span className="text-sky-300">✓✓</span>
                      ) : (
                        <span className="text-white/70">✓✓</span>
                      )}
                    </span>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
        {showScrollBottomBtn && (
          <div className="sticky bottom-2 left-0 right-0 flex justify-center z-30 pointer-events-none">
            <button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xl flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer border border-white/20 animate-bounce"
            >
              <span>⬇️</span>
              <span>{tr('New Messages', 'नया संदेश नीचे है', 'નવો મેસેજ નીચે છે')}</span>
              {unreadNewScrollCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {unreadNewScrollCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 3. COMPACT WHATSAPP-STYLE BOTTOM INPUT BAR */}
      <div className="px-2.5 py-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg">
        {isPostOwner && !selectedReplierId ? (
          <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
            {tr(
              '🔒 Select a person from the list above to reply.',
              '🔒 जवाब देने के लिए ऊपर सूची से किसी व्यक्ति को चुनें।',
              '🔒 જવાબ આપવા માટે ઉપરની યાદીમાંથી વ્યક્તિ પસંદ કરો.'
            )}
          </div>
        ) : isChatBlocked ? (
          <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2 text-xs font-extrabold text-rose-700 dark:text-rose-300">
              <Ban className="w-4 h-4 shrink-0" />
              <span>
                {blockedByMe
                  ? tr('You blocked this user.', 'आपने इस यूज़र को ब्लॉक किया है।', 'તમે આ યુઝરને બ્લોક કર્યા છે.')
                  : tr('This chat is blocked.', 'यह बातचीत ब्लॉक कर दी गई है।', 'આ વાતચીત બ્લોક કરવામાં આવી છે.')}
              </span>
            </div>
            {blockedByMe && (
              <button
                type="button"
                onClick={handleToggleBlockPeer}
                className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shrink-0 cursor-pointer"
              >
                {tr('Unblock', 'अनब्लॉक करें', 'અનબ્લોક કરો')}
              </button>
            )}
          </div>
        ) : (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-1.5"
          >
            <input type="file" ref={imageInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />

            {/* Compact Attachment Icons (Gallery, Camera, Location) */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0 cursor-pointer"
              title={tr('Upload Photo', 'फोटो अपलोड', 'ફોટો અપલોડ')}
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={startCamera}
              className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0 cursor-pointer"
              title={tr('Camera Photo', 'कैमरा फोटो', 'કેમેરા ફોટો')}
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0 cursor-pointer"
              title={tr('Share / View Location', 'मैप लोकेशन', 'મેપ લોકેશન')}
            >
              <MapPin className="w-5 h-5" />
            </button>

            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder={tr('Type a message...', 'संदेश लिखें...', 'મેસેજ લખો...')}
              className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 font-medium"
            />

            <button 
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full active:scale-95 transition-all shadow-sm shrink-0 flex items-center justify-center cursor-pointer"
              title={tr('Send', 'भेजें', 'મોકલો')}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Direct Chat Report & Block Modal */}
      <AnimatePresence>
        {isReportChatModalOpen && (
          <div
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-600">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {tr('Report Chat to Admin', 'चैट की रिपोर्ट करें (Report Chat to Admin)', 'ચેટની એડમિનને રિપોર્ટ કરો')}
                    </h3>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                      {tr('Reported User:', 'रिपोर्ट किया गया यूज़र:', 'રિપોર્ટ કરેલ યુઝર:')} {peerName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportChatModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  {tr('Select Reason:', 'रिपोर्ट का कारण चुनें (Select Reason):', 'રિપોર્ટનું કારણ પસંદ કરો:')}
                </label>
                {COMPLIANCE_REPORT_REASONS.map((item) => {
                  const isSelected = reportReasonKey === item.key;
                  const labelText =
                    language === 'EN' ? item.EN : language === 'GU' ? item.GU : item.HI;
                  return (
                    <label
                      key={item.key}
                      onClick={() => setReportReasonKey(item.key)}
                      className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-extrabold'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium'
                      }`}
                    >
                      <span className="text-xs pr-2">{labelText}</span>
                      <input
                        type="radio"
                        name="chatReportReason"
                        checked={isSelected}
                        onChange={() => setReportReasonKey(item.key)}
                        className="accent-rose-600 shrink-0"
                      />
                    </label>
                  );
                })}
              </div>

              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={2}
                placeholder={tr('Write additional details (Optional)...', 'अतिरिक्त विवरण लिखें (वैकल्पिक / Optional details)...', 'વધારાની વિગતો લખો (વૈકલ્પિક)...')}
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-rose-500 resize-none font-medium"
              />

              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoBlockUser}
                  onChange={(e) => setAlsoBlockUser(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded"
                />
                <div className="text-xs">
                  <span className="font-black text-rose-900 dark:text-rose-200 block">
                    {tr('🚫 Also block this user', '🚫 इस यूज़र को ब्लॉक भी करें (Also block this user)', '🚫 આ યુઝરને બ્લોક પણ કરો')}
                  </span>
                  <span className="text-[10px] text-rose-700 dark:text-rose-300 font-medium">
                    {tr('Once blocked, this user will not be able to send you messages.', 'ब्लॉक करने पर यह यूज़र आपको आगे कोई संदेश नहीं भेज पाएगा।', 'બ્લોક કર્યા પછી આ યુઝર તમને આગળ કોઈ મેસેજ મોકલી શકશે નહીં.')}
                  </span>
                </div>
              </label>

              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[10px] text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                🛡️ <strong>{tr('Safety Note:', 'सुरक्षा नोट:', 'સુરક્ષા નોંધ:')}</strong>{' '}
                {tr(
                  'Upon submitting a report, an evidence snapshot of this conversation is securely saved for Admin review.',
                  'रिपोर्ट सबमिट करने पर इस चैट की संपूर्ण बातचीत का रिकॉर्ड (Evidence Snapshot) एडमिन के पास सुरक्षित सेव हो जाएगा, भले ही कोई यूज़र बाद में अपनी चैट या अकाउंट डिलीट कर दे।',
                  'રિપોર્ટ સબમિટ કરવાથી આ ચેટનો સંપૂર્ણ રેકોર્ડ એડમિન પાસે સુરક્ષિત સેવ થઈ જશે.'
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportChatModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold cursor-pointer"
                >
                  {tr('Cancel', 'रद्द करें (Cancel)', 'રદ કરો')}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReport}
                  onClick={handleSubmitChatReport}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{isSubmittingReport ? tr('Sending...', 'भेजा जा रहा है...', 'મોકલાઈ રહ્યું છે...') : tr('Submit Report', 'रिपोर्ट सबमिट करें', 'રિપોર્ટ સબમિટ કરો')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Preview & Camera Capture Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-5 w-full max-w-sm shadow-2xl flex flex-col items-center relative"
            >
              <button onClick={stopCamera} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-black mb-3">
                {photoCaptured
                  ? tr('🖼️ Send Photo in Chat', '🖼️ फोटो प्रीव्यू (Send Photo in Chat)', '🖼️ ચેટમાં ફોટો મોકલો')
                  : tr('📸 Take Photo', '📸 कैमरा फोटो (Take Photo)', '📸 કેમેરા ફોટો')}
              </h3>

              <div className="relative w-full aspect-[4/3] rounded-2xl bg-black overflow-hidden border border-slate-700 mb-3 flex items-center justify-center">
                {!photoCaptured ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <img src={photoCaptured} alt="Selected preview" loading="lazy" decoding="async" className="w-full h-full object-contain bg-slate-950" />
                )}

                {cameraError && !photoCaptured && !isGalleryPreview && (
                  <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-xs text-slate-300 font-semibold mb-3">
                      {tr('Select photo from Camera or Gallery:', 'कैमरा या गैलरी से फोटो चुनें:', 'કેમેરા અથવા ગેલેરીમાંથી ફોટો પસંદ કરો:')}
                    </p>
                    <div className="flex flex-col gap-3 w-full max-w-[240px]">
                      <button 
                        type="button"
                        onClick={() => fallbackCameraInputRef.current?.click()}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-transform"
                      >
                        {tr('📸 Open Mobile Camera', '📸 मोबाइल कैमरा खोलें', '📸 મોબાઈલ કેમેરા ખોલો')}
                      </button>
                      <button 
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-slate-700 active:scale-95 transition-transform"
                      >
                        {tr('📁 Choose from Gallery', '📁 गैलरी से फोटो चुनें', '📁 ગેલેરીમાંથી ફોટો પસંદ કરો')}
                      </button>
                    </div>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  ref={fallbackCameraInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {!photoCaptured ? (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs shadow-lg active:scale-95 cursor-pointer"
                >
                  {tr('📸 Capture Photo', '📸 फोटो क्लिक करें (Capture Photo)', '📸 ફોટો ક્લિક કરો')}
                </button>
              ) : (
                <div className="w-full space-y-2.5">
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder={tr('Add a caption (Optional)...', 'फोटो के साथ संदेश लिखें (वैकल्पिक / Optional caption)...', 'ફોટો સાથે સંદેશ લખો (વૈકલ્પિક)...')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-400 outline-none focus:border-indigo-500"
                  />
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        if (isGalleryPreview) {
                          imageInputRef.current?.click();
                        } else {
                          setPhotoCaptured(null);
                        }
                      }}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {isGalleryPreview ? tr('Choose Another', 'दूसरी फोटो चुनें', 'બીજો ફોટો પસંદ કરો') : tr('Retake', 'दोबारा लें (Retake)', 'ફરીથી લો')}
                    </button>
                    <button
                      type="button"
                      onClick={sendPhotoInChat}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{tr('Send in Chat', 'चैट में भेजें', 'ચેટમાં મોકલો')}</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zoom Lightbox */}
      <AnimatePresence>
        {zoomedImage && (
          <div
            onClick={() => setZoomedImage(null)}
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 bg-black/90 flex items-center justify-center p-4"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
          >
            <img src={zoomedImage} alt="Zoomed" loading="lazy" decoding="async" className="max-h-[82vh] max-w-full rounded-2xl object-contain" />
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <UserProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userName={peerName}
        distance={peerDistance}
        onRequestSent={() => handleSend("🔒 Requested profile details.", "text")}
      />

      {/* Delete Confirmation */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
          >
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
                {tr('Delete Chat?', 'चैट हटाएं?', 'ચેટ ડિલીટ કરવી છે?')}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {tr('This will clear chat history from your device view.', 'यह आपके डिवाइस से इस चैट को हटा देगा।', 'આ તમારા ડિવાઇસમાંથી આ ચેટ હિસ્ટ્રી દૂર કરશે.')}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold">
                  {tr('Cancel', 'रद्द करें', 'રદ કરો')}
                </button>
                <button onClick={handleDeleteAndArchiveChat} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold">
                  {tr('Delete', 'हटाएं', 'ડિલીટ કરો')}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Map Location Modal */}
      <AnimatePresence>
        {isMapModalOpen && (
          <div
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center relative overflow-hidden"
            >
              <div className="w-full flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      {tr('Live Map Location', 'लाइव मैप लोकेशन', 'લાઈવ મેપ લોકેશન')}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {tr('Verified GPS & Neighborhood Area', 'वेरिफाइड जीपीएस एवं क्षेत्र', 'વેરિફાઈડ GPS અને વિસ્તાર')}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsMapModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              {/* Simulated Interactive Map View Box */}
              <div className="w-full aspect-video rounded-2xl bg-indigo-50 dark:bg-slate-950 border border-indigo-200 dark:border-slate-800 relative flex items-center justify-center mb-4 overflow-hidden shadow-inner">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="absolute w-24 h-24 rounded-full border border-indigo-400/40 animate-ping"></div>
                <div className="absolute w-16 h-16 rounded-full border border-indigo-500/60 animate-pulse"></div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="px-2.5 py-1 bg-slate-900/90 text-white rounded-lg text-[10px] font-black mt-1 shadow-md border border-slate-700">
                    {peerLocation}
                  </div>
                </div>
              </div>

              <div className="w-full space-y-2 text-xs mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">{tr('Location Name:', 'लोकेशन का नाम:', 'લોકેશનનું નામ:')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{peerLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">{tr('Distance:', 'दूरी:', 'અંતર:')}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{peerDistance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">{tr('Status:', 'स्थिति:', 'સ્થિતિ:')}</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">🟢 {tr('Pin Verified', 'पिन वेरिफाइड', 'પિન વેરિફાઈડ')}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  disabled={isSharingLiveLocation}
                  onClick={handleShareLocationInChat}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{isSharingLiveLocation ? tr('Sharing Location...', 'लोकेशन भेजी जा रही है...', 'લોકેશન મોકલાઈ રહ્યું છે...') : tr('📍 Share Location in Chat', '📍 चैट में अपनी लोकेशन भेजें', '📍 ચેટમાં તમારું લોકેશન મોકલો')}</span>
                </button>
                <a 
                  href={`https://www.google.com/maps?q=${encodeURIComponent(peerLocation)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" /> {tr('🗺️ Open in Google Maps', '🗺️ Google Maps में खोलें', '🗺️ Google Maps માં ખોલો')}
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Prompt */}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        onGoToLogin={onBack}
        actionTitleEn="Sign In Required to Chat"
        actionTitleHi="चैट करने के लिए लॉगिन करें"
        actionTitleGu="ચેટ કરવા માટે લોગિન કરો"
      />
    </div>
  );
}
