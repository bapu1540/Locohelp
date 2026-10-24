import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, User, Clock, ArrowRight, MessageCircle, Sparkles, Inbox, RefreshCw, Send } from 'lucide-react';
import { Intent } from '../types';
import { useLanguage } from '../i18n';
import { getCurrentUser, getMessages } from '../auth';

interface PostResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  intent: Intent | null;
  onOpenChat: (intent: Intent) => void;
}

interface ReplierGroup {
  senderId: string;
  senderName: string;
  lastMessage: string;
  updatedAt: string;
  count: number;
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

  useEffect(() => {
    if (!isOpen || !intent?.id) return;

    let isMounted = true;
    let initialLoad = true;
    const loadResponses = async () => {
      if (initialLoad) {
        setIsLoading(true);
        initialLoad = false;
      }
      try {
        const currentUser = getCurrentUser();
        const activeUid = currentUser?.uid || 'me';

        // 1. Fetch from server messages table for this conversationId
        let rawMessages: any[] = [];
        try {
          const res = await fetch(`/api/messages/${encodeURIComponent(intent.id)}?_t=${Date.now()}`, {
            cache: 'no-store'
          });
          if (res.ok) {
            rawMessages = await res.json();
          }
        } catch (e) {}

        // Fallback to local storage if API empty
        if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
          try {
            const localStored = localStorage.getItem(`locohelp_chat_${intent.id}`);
            if (localStored) {
              rawMessages = JSON.parse(localStored);
            }
          } catch (e) {}
        }

        if (!Array.isArray(rawMessages)) rawMessages = [];

        // Filter out messages sent by the owner themselves, to find visitor repliers
        const visitorMessages = rawMessages.filter(
          m => m.authorId !== activeUid && m.senderId !== activeUid && m.authorId !== 'me'
        );

        // Group by sender
        const groupsMap = new Map<string, ReplierGroup>();
        visitorMessages.forEach(msg => {
          const sId = msg.senderId || msg.authorId || 'visitor_user';
          const sName = msg.authorName || msg.senderName || 'Nearby Helper / Visitor';
          const existing = groupsMap.get(sId);

          if (!existing) {
            groupsMap.set(sId, {
              senderId: sId,
              senderName: sName,
              lastMessage: msg.text || msg.content || 'Sent a message',
              updatedAt: msg.createdAt || msg.sent_at || new Date().toISOString(),
              count: 1
            });
          } else {
            existing.lastMessage = msg.text || msg.content || existing.lastMessage;
            existing.updatedAt = msg.createdAt || msg.sent_at || existing.updatedAt;
            existing.count += 1;
          }
        });

        // Convert to array
        const list = Array.from(groupsMap.values());
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        if (isMounted) {
          setRepliers(list);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading responses:", err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadResponses();
    const pollInterval = setInterval(loadResponses, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isOpen, intent]);

  if (!isOpen || !intent) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 16 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative z-50 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <Inbox className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                  ⚡ {language === 'EN' ? 'Owner Responses Inbox' : 'आपकी पोस्ट का जवाब इनबॉक्स'}
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
                <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                <span className="text-xs font-bold text-slate-500">
                  {language === 'EN' ? 'Loading responses...' : 'जवाब लोड हो रहे हैं...'}
                </span>
              </div>
            ) : repliers.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {language === 'EN' ? 'No Replies Yet' : 'अभी तक कोई जवाब नहीं आया'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xs mx-auto">
                    {language === 'EN'
                      ? 'When nearby neighbors or helpers click "Chat / Reply" on your post, their messages will appear live right here!'
                      : 'जब आस-पास के लोग या हेल्पर्स आपकी पोस्ट पर "बात करें" पर क्लिक करेंगे, तब उनके संदेश यहाँ लाइव दिखाई देंगे।'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenChat(intent);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-all mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'EN' ? 'Open Chat Room' : 'चैट रूम खोलें'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 block px-1">
                  💬 {language === 'EN' ? `Received Responses (${repliers.length})` : `प्राप्त जवाब (${repliers.length})`}
                </span>
                {repliers.map((rep) => (
                  <div
                    key={rep.senderId}
                    onClick={() => {
                      onClose();
                      onOpenChat(intent);
                    }}
                    className="p-3 rounded-2xl bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 dark:from-slate-800 dark:to-slate-850 hover:border-amber-400 border border-amber-200 dark:border-slate-700 shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {rep.senderName[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {rep.senderName}
                          </span>
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            {rep.count} msg
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                          "{rep.lastMessage}"
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-xs transition-colors">
                      <span>Chat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
            >
              {language === 'EN' ? 'Close' : 'बंद करें'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
