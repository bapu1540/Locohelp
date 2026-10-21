import React, { useState, useEffect, useRef } from 'react';
import { Intent } from '../types';
import { ArrowLeft, ShieldAlert, CheckCircle2, Send, MapPin, UserCheck, Paperclip, Navigation, Mic, Star, Sparkles, Trash2, Home, ShieldCheck, Check, Camera, Image as ImageIcon, X, Share2, Video, PhoneOff, MicOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCurrentUser, sendMessage, getMessages } from '../auth';
import { useLanguage } from '../i18n';
import UserProfileModal from './UserProfileModal';
import LoginPromptModal from '../components/LoginPromptModal';
import { isGuestUser } from '../lib/authUtils';
import { fetchChatMessages, sendChatMessage, logAuditRecord } from '../api';
import { validateUploadedFile, sanitizeText } from '../lib/security';

interface ChatScreenProps {
  intent: Intent | null;
  onBack: () => void;
  onReport: () => void;
}

export default function ChatScreen({ intent, onBack, onReport }: ChatScreenProps) {
  const { t } = useLanguage();
  const chatId = intent?.id || 'chat_community_helper';
  
  const [messages, setMessages] = useState<{
    id: string;
    text: string;
    authorId: string;
    type?: 'text' | 'pin' | 'attachment' | 'task_completed';
    attachmentUrl?: string;
    attachmentType?: string;
    createdAt?: string;
  }[]>(() => {
    try {
      const deletedIds = JSON.parse(localStorage.getItem('locohelp_deleted_chats') || '[]');
      if (deletedIds.includes(chatId)) {
        return [];
      }
      const stored = localStorage.getItem(`locohelp_chat_${chatId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    return [];
  });
  
  const [input, setInput] = useState('');
  const [showTracker, setShowTracker] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isCompletionSummaryOpen, setIsCompletionSummaryOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isTaskDone, setIsTaskDone] = useState(intent?.status === 'completed');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  // Camera & Media States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [isFamilyShareOpen, setIsFamilyShareOpen] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fallbackCameraInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);

  // Auto scroll message list
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      return;
    }

    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Persist locally
  useEffect(() => {
    try {
      localStorage.setItem(`locohelp_chat_${chatId}`, JSON.stringify(messages));
    } catch (e) {}
  }, [messages, chatId]);

  // Real-time server sync
  useEffect(() => {
    if (!intent?.id) return;
    let isMounted = true;

    const syncChat = async () => {
      try {
        const activeUser = getCurrentUser();
        if (!activeUser || activeUser.uid === 'guest_user') return;
        
        const serverMessages = await getMessages(activeUser.uid, intent.authorId);
        if (isMounted && Array.isArray(serverMessages)) {
          setMessages(prev => {
            const map = new Map<string, any>();
            prev.forEach(m => map.set(m.id, m));
            serverMessages.forEach(m => {
              map.set(m.id, {
                id: m.id,
                text: m.content,
                type: 'text',
                authorId: m.sender_id,
                createdAt: m.created_at
              });
            });
            const list = Array.from(map.values()) as any[];
            list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
            return list;
          });
        }
      } catch (e) {}
    };

    syncChat();

    return () => {
      isMounted = false;
    };
  }, [intent]);

  const handleSend = async (textToSend: string, type: 'text' | 'pin' | 'attachment' | 'task_completed' = 'text', attachmentUrl?: string, attachmentType?: string) => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }
    const trimmed = sanitizeText(textToSend.trim(), 2000);
    if (!trimmed && !attachmentUrl) return;
    setInput('');

    const activeUid = getCurrentUser()?.uid || 'my_user';
    const messageData: any = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: trimmed,
      type,
      authorId: activeUid,
      createdAt: new Date().toISOString()
    };

    if (attachmentUrl) messageData.attachmentUrl = attachmentUrl;
    if (attachmentType) messageData.attachmentType = attachmentType;

    // Optimistic UI update
    setMessages(prev => [...prev, messageData]);

    // Server & PostgreSQL sync
    if (intent?.id) {
      try {
        // Also keep legacy sync for compatibility
        sendChatMessage(intent.id, messageData).catch(() => {});
        
        await sendMessage(activeUid, intent.authorId, trimmed || "📸 Attachment");
      } catch (e) {}
    }

    // Auto reply for simulated peer / broadcast poster
    const isSimulated = intent?.authorId?.startsWith('seed_') || intent?.authorId?.startsWith('user_') || intent?.authorId?.startsWith('ad_');
    if (isSimulated && type === 'text') {
      setTimeout(() => {
        const replies = [
          "Namaste! Ji haan, ye service available hai. Aap bataiye kab zaroorat hai?",
          "Theek hai, maine aapka message dekh liya hai. Main aapse turant sampark karta hu.",
          "Haanji! Aap location pin share kar sakte hain ya humse direct call par baat kar sakte hain."
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        const autoMsg = {
          id: 'reply_' + Date.now(),
          text: randomReply,
          type: 'text' as const,
          authorId: 'helper',
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, autoMsg]);
        if (intent?.id) {
          sendChatMessage(intent.id, autoMsg).catch(() => {});
        }
      }, 1200);
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== msgId);
      try {
        localStorage.setItem(`locohelp_chat_${chatId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const check = await validateUploadedFile(file, { allowPdf: true });
      if (!check.valid) {
        setCameraError(check.error || 'Only safe images (JPEG, PNG, WebP <= 2MB) or PDF (<= 5MB) are allowed.');
        setIsCameraOpen(true);
        if (e.target) e.target.value = '';
        return;
      }
      setCameraError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoCaptured(base64);
        setIsCameraOpen(true);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const startCamera = async () => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setPhotoCaptured(dataUrl);
      }
    } else {
      fallbackCameraInputRef.current?.click();
    }
  };

  const sendPhotoInChat = () => {
    if (!photoCaptured) return;
    handleSend("📸 Camera Snapshot Shared", 'attachment', photoCaptured, 'image');
    stopCamera();
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

  const currentUser = getCurrentUser();
  const savedProfileName = (() => {
    try {
      const p = localStorage.getItem('locohelp_profile_name');
      if (p && p !== 'Ramesh Sharma') return p;
      return currentUser?.displayName;
    } catch(e) { return null; }
  })();

  const rawSeller = (intent as any)?.sellerName || (intent as any)?.authorName || (intent as any)?.name;
  const validSeller = rawSeller && rawSeller !== 'Ramesh Sharma' ? rawSeller : null;

  const peerName = validSeller || savedProfileName || (currentUser?.displayName !== 'Ramesh Sharma' ? currentUser?.displayName : null) || "Community Peer";
  const peerBadge = (intent as any)?.badge || "Verified Community Peer";
  const peerDistance = intent?.distance || 0.5;
  const rawLocation = (intent as any)?.location || (intent as any)?.area || (intent as any)?.city || (() => {
    try { return localStorage.getItem('locohelp_profile_address'); } catch(e) { return null; }
  })() || "Local Area";
  const peerLocation = typeof rawLocation === 'string'
    ? rawLocation.replace(/^,\s*|,\s*$|,+/g, ',').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim() || "Local Area"
    : "Local Area";
  const topicDesc = intent?.description || (intent as any)?.title || "LocoHelp Direct Broadcast & Service Inquiry";

  return (
    <div className="flex flex-col h-full bg-[#FCFAF5] dark:bg-slate-900 relative overflow-hidden transition-colors">
      
      {/* 1. TOP HEADER (Clean WhatsApp / Telegram style) */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full transition-colors active:scale-95 cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Profile Clickable Header */}
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                {peerName[0]}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  {peerName}
                </h2>
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <p 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMapModalOpen(true);
                }}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1 hover:underline cursor-pointer mt-0.5"
                title="View on Map"
              >
                <MapPin className="w-3 h-3" />
                <span>{peerLocation} ({peerDistance}km)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsMapModalOpen(true)}
            className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer"
            title="View Map Location"
          >
            <MapPin className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setIsVideoCallOpen(true)}
            className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer"
            title="Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setIsRatingOpen(true)}
            className={`p-2 rounded-xl transition-all cursor-pointer ${isTaskDone ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            title="Complete Task"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
            title="Delete Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button 
            onClick={onReport}
            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
            title="Report"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Broadcast Topic Banner */}
      <div className="px-4 py-2 bg-indigo-50/90 dark:bg-indigo-950/50 border-b border-indigo-100 dark:border-indigo-900 flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
        <div className="flex items-center gap-1.5 truncate mr-2">
          <span className="px-1.5 py-0.5 rounded bg-indigo-200 dark:bg-indigo-900 text-[10px] font-black uppercase text-indigo-800 dark:text-indigo-300 shrink-0">Broadcast Topic</span>
          <span className="truncate">{topicDesc}</span>
        </div>
        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{peerDistance}km</span>
      </div>

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

      {/* 2. MESSAGES VIEWPORT */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8F6F0] dark:bg-slate-950">
        {messages.length === 0 && (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center text-xl shadow-inner">
              💬
            </div>
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
              Start Conversation / बातचीत शुरू करें
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-medium">
              Type your message below to start chatting directly with {peerName}.
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const myUid = getCurrentUser()?.uid || 'my_user';
          const isMe = msg.authorId === myUid || msg.authorId === 'my_user';
          const isSystem = msg.authorId === 'system' || msg.type === 'task_completed';

          if (isSystem) {
            return (
              <div key={msg.id} className="my-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'pin') {
            return (
              <div 
                key={msg.id} 
                onClick={() => setShowTracker(!showTracker)}
                className={`max-w-[80%] p-3 rounded-2xl flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 transition-transform ${isMe ? 'bg-indigo-600 text-white self-end ml-auto' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 self-start mr-auto'}`}
              >
                <MapPin className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
                <span>{msg.text} (Click to View Live Radar Map)</span>
              </div>
            );
          }

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`max-w-[80%] p-3.5 rounded-2xl shadow-xs flex flex-col gap-1.5 ${
                isMe 
                  ? 'bg-indigo-600 text-white self-end ml-auto rounded-tr-xs' 
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 self-start mr-auto rounded-tl-xs'
              }`}
            >
              {msg.type === 'attachment' && msg.attachmentUrl && (
                <div 
                  onClick={() => setZoomedImage(msg.attachmentUrl!)}
                  className="cursor-pointer overflow-hidden rounded-xl border border-white/20 mb-1"
                >
                  <img src={msg.attachmentUrl} alt="attachment" className="w-full max-h-56 object-cover hover:scale-102 transition-transform" />
                </div>
              )}
              <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              <div className="flex items-center justify-between gap-2 mt-0.5 pt-1 border-t border-white/10">
                <span className={`text-[9px] font-semibold ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
                {isMe && (
                  <button 
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="text-[10px] text-indigo-200 hover:text-white px-1.5 py-0.5 rounded bg-indigo-700/60 hover:bg-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                    title="Delete message"
                  >
                    <span>🗑️ Delete</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 3. CLEAN BOTTOM ACTION BAR & INPUT */}
      <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2 shadow-lg">
        
        {/* Quick Toolbar */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide text-xs font-bold">
          {/* Photo Upload from Gallery */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer"
            title="Upload Photo"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>फोटो अपलोड</span>
          </button>
          <input type="file" ref={imageInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />

          {/* Camera Capture */}
          <button
            type="button"
            onClick={startCamera}
            className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer"
            title="Camera Photo"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>कैमरा फोटो</span>
          </button>

          {/* Map Location Button */}
          <button
            type="button"
            onClick={() => setIsMapModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer"
            title="View Map Location"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>मैप लोकेशन</span>
          </button>

          {/* WhatsApp Family Safety */}
          <button
            type="button"
            onClick={() => setIsFamilyShareOpen(true)}
            className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp फैमली</span>
          </button>
        </div>

        {/* Text Input Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex items-center gap-2"
        >
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
            placeholder="Type message here..."
            className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 font-medium"
          />

          <button 
            type="submit"
            disabled={!input.trim()}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full active:scale-95 transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Camera Capture Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-5 w-full max-w-sm shadow-2xl flex flex-col items-center relative"
            >
              <button onClick={stopCamera} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800">
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-black mb-3">📸 Take Photo / Snapshot</h3>

              <div className="relative w-full aspect-[4/3] rounded-2xl bg-black overflow-hidden border border-slate-700 mb-4 flex items-center justify-center">
                {!photoCaptured ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <img src={photoCaptured} alt="snapshot" className="w-full h-full object-cover" />
                )}

                {cameraError && !photoCaptured && (
                  <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                    <div className="flex flex-col gap-3 w-full max-w-[240px]">
                      <button 
                        onClick={() => fallbackCameraInputRef.current?.click()}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-transform"
                      >
                        📸 Open Device Camera
                      </button>
                      <button 
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-slate-700 active:scale-95 transition-transform"
                      >
                        📁 Open Gallery
                      </button>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      ref={fallbackCameraInputRef} 
                      onChange={(e) => {
                        handleFileUpload(e);
                        stopCamera();
                      }} 
                      className="hidden" 
                    />
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {!photoCaptured ? (
                <button
                  onClick={capturePhoto}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs shadow-lg active:scale-95 cursor-pointer"
                >
                  Capture Photo
                </button>
              ) : (
                <div className="flex gap-2 w-full">
                  <button onClick={() => setPhotoCaptured(null)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">Retake</button>
                  <button onClick={sendPhotoInChat} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold">Send in Chat</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Call Modal */}
      <AnimatePresence>
        {isVideoCallOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-indigo-500/30 text-white rounded-3xl p-5 w-full max-w-sm shadow-2xl flex flex-col items-center relative"
            >
              <div className="w-full flex items-center justify-between mb-4">
                <span className="text-xs font-black text-emerald-400">Live Video Call</span>
                <button onClick={() => setIsVideoCallOpen(false)} className="p-1.5 bg-slate-800 text-slate-400 rounded-full"><X className="w-4 h-4" /></button>
              </div>

              <div className="w-full aspect-[4/3] rounded-2xl bg-slate-950 border border-indigo-500/40 flex flex-col items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-black mb-2">
                  {peerName[0]}
                </div>
                <h4 className="text-sm font-bold">{peerName}</h4>
                <p className="text-[10px] text-emerald-400">🟢 Connected</p>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-white'}`}>
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button onClick={() => setIsVideoCallOpen(false)} className="px-6 py-3 bg-red-600 text-white rounded-full text-xs font-black shadow-lg">End Call</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zoom Lightbox */}
      <AnimatePresence>
        {zoomedImage && (
          <div onClick={() => setZoomedImage(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <img src={zoomedImage} alt="Zoomed" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">Delete Chat?</h3>
              <p className="text-xs text-slate-500 mb-4">This will clear chat history from your device view.</p>
              <div className="flex gap-2">
                <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold">Cancel</button>
                <button onClick={handleDeleteAndArchiveChat} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold">Delete</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Map Location Modal */}
      <AnimatePresence>
        {isMapModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
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
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">Live Map Location</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Verified GPS & Neighborhood Area</p>
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
                  <span className="text-slate-500 font-medium">Location Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{peerLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Distance:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{peerDistance} km away</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">🟢 Pin Verified</span>
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => {
                    window.open(`https://maps.google.com/?q=${encodeURIComponent(peerLocation)}`, '_blank');
                  }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" /> Open in Google Maps
                </button>
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
      />
    </div>
  );
}
