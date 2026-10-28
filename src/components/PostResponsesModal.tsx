import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, MessageCircle, Inbox, RefreshCw, Send } from 'lucide-react';
import { Intent } from '../types';
import { useLanguage } from '../i18n';
import { getCurrentUser, getUserIdentitySet, isMessageSentByUser } from '../auth';
import { subscribeToRealtimeStream } from '../api';

interface PostResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  intent: Intent | null;
  onOpenChat: (intent: Intent) => void;
}

interface ReplierGroup {
  conversationId?: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderAvatar?: string;
  lastMessage: string;
  updatedAt: string;
  count: number;
  unreadCount: number;
  isCollaborator?: boolean;
}

export default function PostResponsesModal({
  isOpen,
  onClose,
  intent,
  onOpenChat
}: PostResponsesModalProps) {
  const { language } = useLanguage();
  const [repliers, setRepliers] = useState<ReplierGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collaboratingId, setCollaboratingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !intent?.id) return;

    let isMounted = true;
    let initialLoad = true;

    const currentUser = getCurrentUser();
    const myIdentitySet = getUserIdentitySet(currentUser);
    const ownerId = String(intent.authorId || currentUser?.uid || '').trim();
    const ownerEmail = String((intent as any).authorEmail || currentUser?.email || '').trim().toLowerCase();

    // 0. Instant 0ms seed from intent.repliers and intent.responses already attached on GET /api/posts
    try {
      const initialMap = new Map<string, ReplierGroup>();
      const preRepliers = Array.isArray((intent as any).repliers) ? (intent as any).repliers : [];
      const preResponses = Array.isArray((intent as any).responses) ? (intent as any).responses : [];

      preRepliers.forEach((rep: any) => {
        if (!rep) return;
        const sId = String(rep.helperId || rep.helper_id || rep.senderId || rep.sender_id || '').trim();
        const sEmail = String(rep.helperEmail || rep.senderEmail || rep.sender_email || '').trim().toLowerCase();
        if (!sId || sId === 'system') return;
        if (
          isMessageSentByUser({ sender_id: sId, sender_email: sEmail }, currentUser) ||
          (ownerId && sId.toLowerCase() === ownerId.toLowerCase()) ||
          (ownerEmail && sEmail && sEmail === ownerEmail)
        ) {
          return;
        }
        const key = sEmail || sId.toLowerCase();
        initialMap.set(key, {
          conversationId: rep.conversationId || rep.id || `conv_${intent.id}__${sId.toLowerCase()}`,
          senderId: sId,
          senderName: rep.helperName || rep.senderName || rep.sender_name || 'Community Helper',
          senderEmail: sEmail,
          senderAvatar: rep.helperAvatar || rep.senderAvatar || rep.sender_avatar || '',
          lastMessage: rep.lastMessage || rep.last_message || rep.message || rep.text || 'Sent a message',
          updatedAt: rep.lastMessageAt || rep.last_message_at || rep.updatedAt || rep.createdAt || new Date().toISOString(),
          count: Number(rep.messageCount || rep.count) || 1,
          unreadCount: Number(rep.unreadPosterCount ?? rep.unreadCount) || 0,
          isCollaborator: Boolean(rep.isCollaborator)
        });
      });

      preResponses.forEach((msg: any) => {
        if (!msg) return;
        const sId = String(msg.sender_id || msg.senderId || msg.authorId || '').trim();
        const sEmail = String(msg.sender_email || msg.senderEmail || msg.authorEmail || '').trim().toLowerCase();
        if (!sId || sId === 'system') return;
        if (
          isMessageSentByUser(msg, currentUser) ||
          (ownerId && sId.toLowerCase() === ownerId.toLowerCase()) ||
          (ownerEmail && sEmail && sEmail === ownerEmail)
        ) {
          return;
        }
        const key = sEmail || sId.toLowerCase();
        const sName = msg.sender_name || msg.senderName || msg.authorName || (sEmail ? sEmail.split('@')[0] : 'Community Helper');
        const msgText = msg.text || msg.message || msg.content || 'Sent a message';
        const msgTime = msg.createdAt || msg.created_at || new Date().toISOString();
        const existing = initialMap.get(key);
        if (!existing) {
          initialMap.set(key, {
            conversationId: msg.conversationId || msg.conversation_id || `conv_${intent.id}__${sId.toLowerCase()}`,
            senderId: sId,
            senderName: sName,
            senderEmail: sEmail,
            senderAvatar: msg.sender_avatar || msg.senderAvatar || '',
            lastMessage: msgText,
            updatedAt: msgTime,
            count: 1,
            unreadCount: 0,
            isCollaborator: Boolean(msg.isCollaborator)
          });
        } else if (new Date(msgTime).getTime() >= new Date(existing.updatedAt).getTime()) {
          existing.lastMessage = msgText;
          existing.updatedAt = msgTime;
        }
      });

      if (initialMap.size > 0) {
        const seeded = Array.from(initialMap.values()).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setRepliers(seeded);
        initialLoad = false;
      }
    } catch {}

    const loadResponses = async () => {
      if (initialLoad) {
        setIsLoading(true);
        initialLoad = false;
      }
      try {
        const token = localStorage.getItem('locohelp_token') || '';
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const convRes = await fetch(
          `/api/chat/conversations?postId=${encodeURIComponent(intent.id)}&userId=${encodeURIComponent(ownerId)}&ownerEmail=${encodeURIComponent(ownerEmail)}&_t=${Date.now()}`,
          { cache: 'no-store', headers }
        ).catch(() => null);

        let inboxThreads: any[] = [];
        if (convRes && convRes.ok) {
          const data = await convRes.json().catch(() => []);
          if (Array.isArray(data)) inboxThreads = data;
        }

        const groupsMap = new Map<string, ReplierGroup>();

        // Seed from backend /api/chat/conversations endpoint
        inboxThreads.forEach(item => {
          const hId = String(item?.helperId || item?.helper_id || item?.senderId || '').trim();
          const hEmail = String(item?.helperEmail || item?.senderEmail || '').trim().toLowerCase();
          if (!hId) return;
          const isFromMe =
            isMessageSentByUser({ sender_id: hId, sender_email: hEmail }, currentUser) ||
            (ownerId && hId.toLowerCase() === ownerId.toLowerCase()) ||
            (ownerEmail && hEmail && hEmail === ownerEmail) ||
            myIdentitySet.has(hId.toLowerCase());
          if (isFromMe) return;

          const key = String(hEmail || hId).toLowerCase();
          groupsMap.set(key, {
            conversationId: item.conversationId || item.id || `conv_${intent.id}__${hId.toLowerCase()}`,
            senderId: hId,
            senderName: item.helperName || item.senderName || 'Community Helper',
            senderEmail: hEmail,
            senderAvatar: item.helperAvatar || item.senderAvatar || '',
            lastMessage: item.lastMessage || item.last_message || 'Sent a message',
            updatedAt: item.lastMessageAt || item.last_message_at || item.updatedAt || new Date().toISOString(),
            count: Number(item.count) || 1,
            unreadCount: Number(item.unreadPosterCount ?? item.unreadCount) || 0,
            isCollaborator: Boolean(item.isCollaborator)
          });
        });

        const list = Array.from(groupsMap.values());
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        if (isMounted) {
          setRepliers(list);
          const collab = list.find(r => r.isCollaborator);
          if (collab) setCollaboratingId(collab.senderId);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading responses:", err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadResponses();
    const pollInterval = setInterval(loadResponses, 2000);
    const unsubStream = subscribeToRealtimeStream({
      onNewResponse: (payload) => {
        if (payload?.postId === intent.id) {
          loadResponses();
        }
      }
    });

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      unsubStream();
    };
  }, [isOpen, intent]);

  const handleSelectCollaborator = async (e: React.MouseEvent, rep: ReplierGroup) => {
    e.stopPropagation();
    if (!intent?.id) return;
    try {
      const token = localStorage.getItem('locohelp_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/intents/${encodeURIComponent(intent.id)}/collaborate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ helperId: rep.senderId, helperName: rep.senderName })
      });
      if (res.ok) {
        setCollaboratingId(rep.senderId);
        setRepliers(prev => prev.map(r => ({ ...r, isCollaborator: r.senderId === rep.senderId })));
      }
    } catch (err) {
      console.warn("Collaborate error:", err);
    }
  };

  const handleOpenReplierThread = async (rep: ReplierGroup) => {
    const convId = rep.conversationId || (intent?.id ? `conv_${intent.id}__${rep.senderId.toLowerCase()}` : '');
    if (intent?.id) {
      fetch(`/api/intents/${encodeURIComponent(intent.id)}/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: rep.senderId, conversationId: convId })
      }).catch(() => {});
    }
    onClose();
    if (intent) {
      onOpenChat({
        ...intent,
        conversationId: convId,
        selectedReplierId: rep.senderId,
        selectedReplierName: rep.senderName,
        selectedReplierEmail: rep.senderEmail,
        selectedReplierAvatar: rep.senderAvatar
      } as any);
    }
  };

  if (!isOpen || !intent) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
        style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 16 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative z-50 flex flex-col max-h-[82vh]"
        >
          {/* WhatsApp-Style Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-600/15 via-teal-500/10 to-indigo-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <Inbox className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                  💬 {language === 'EN' ? 'WhatsApp-Style Reply Inbox' : language === 'GU' ? 'તમારી પોસ્ટના જવાબો (Inbox)' : 'आपकी पोस्ट का चैट इनबॉक्स'}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate mt-1">
                  {intent.description}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body List */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                <span className="text-xs font-bold text-slate-500">
                  {language === 'EN' ? 'Loading live replies...' : language === 'GU' ? 'જવાબો લોડ થઈ રહ્યા છે...' : 'चैट जवाब लोड हो रहे हैं...'}
                </span>
              </div>
            ) : repliers.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {language === 'EN' ? 'No Responses Yet' : language === 'GU' ? 'હજુ સુધી કોઈ જવાબ આવ્યો નથી' : 'अभी तक कोई जवाब नहीं आया'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xs mx-auto leading-relaxed">
                    {language === 'EN'
                      ? 'No responses yet. When someone messages you about this post, their chat will appear here.'
                      : language === 'GU'
                      ? 'હજુ સુધી કોઈ જવાબ નથી. જ્યારે કોઈ તમારી આ પોસ્ટ પર મેસેજ કરશે, ત્યારે તેમની ચેટ અહીં દેખાશે.'
                      : 'अभी तक किसी ने संदेश नहीं भेजा है। जब कोई आपकी इस पोस्ट पर मैसेज करेगा, तो उनकी 1-on-1 चैट यहाँ दिखाई देगी।'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                    💬 {language === 'EN' ? `People Who Replied (${repliers.length})` : language === 'GU' ? `મળેલા જવાબો (${repliers.length})` : `जवाब देने वाले लोग (${repliers.length})`}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {language === 'EN' ? 'Tap to Open 1-on-1 Chat' : language === 'GU' ? '૧-ઓન-૧ ચેટ ખોલવા ક્લિક કરો' : 'चैट करें या सहयोगी चुनें'}
                  </span>
                </div>
                {repliers.map((rep) => {
                  const isCollab = collaboratingId === rep.senderId || rep.isCollaborator;
                  return (
                    <div
                      key={rep.senderEmail || rep.senderId}
                      onClick={() => handleOpenReplierThread(rep)}
                      className={`p-3 rounded-2xl border shadow-sm cursor-pointer transition-all flex items-center justify-between gap-2.5 group active:scale-[0.99] ${
                        isCollab
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-800 hover:border-emerald-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          {rep.senderAvatar ? (
                            <img
                              src={rep.senderAvatar}
                              alt={rep.senderName}
                              className="w-11 h-11 rounded-full object-cover border border-emerald-500/30 shadow-xs group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                              {rep.senderName[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          {rep.unreadCount > 0 ? (
                            <span
                              className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white dark:border-slate-900 shadow-xs"
                              title={`${rep.unreadCount} unread`}
                            >
                              {rep.unreadCount}
                            </span>
                          ) : (
                            <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white dark:border-slate-900">
                              {rep.count}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {rep.senderName}
                            </span>
                            {rep.unreadCount > 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                                {rep.unreadCount} new
                              </span>
                            )}
                            {isCollab && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-600 text-white shrink-0">
                                🤝 {language === 'EN' ? 'Collaborating' : language === 'GU' ? 'સહયોગી' : 'सहयोगी'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                            {rep.lastMessage}
                          </p>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                            {new Date(rep.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleSelectCollaborator(e, rep)}
                          className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                            isCollab
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                          }`}
                          title="Choose this user to collaborate with"
                        >
                          {isCollab
                            ? (language === 'EN' ? '✅ Selected' : language === 'GU' ? '✅ પસંદ કરેલ' : '✅ चयनित')
                            : (language === 'EN' ? '🤝 Collaborate' : language === 'GU' ? '🤝 સહયોગ' : '🤝 सहयोग करें')}
                        </button>
                        <div className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-xs transition-colors">
                          <span>{language === 'EN' ? 'Chat' : language === 'GU' ? 'ચેટ' : 'चैट'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
            >
              {language === 'EN' ? 'Close' : language === 'GU' ? 'બંધ કરો' : 'बंद करें'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
