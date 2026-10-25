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
    const loadResponses = async () => {
      if (initialLoad) {
        setIsLoading(true);
        initialLoad = false;
      }
      try {
        const currentUser = getCurrentUser();
        const activeUid = currentUser?.uid || 'me';

        let rawMessages: any[] = [];
        try {
          const res = await fetch(`/api/messages/${encodeURIComponent(intent.id)}?_t=${Date.now()}`, {
            cache: 'no-store'
          });
          if (res.ok) {
            rawMessages = await res.json();
          }
        } catch (e) {}

        if (!Array.isArray(rawMessages)) rawMessages = [];

        const visitorMessages = rawMessages.filter(
          m => m.authorId !== activeUid && m.senderId !== activeUid && m.authorId !== 'me' && m.authorId !== 'owner'
        );

        const groupsMap = new Map<string, ReplierGroup>();
        visitorMessages.forEach(msg => {
          const sId = msg.senderId || msg.authorId || 'visitor_user';
          const sName = msg.authorName || msg.senderName || 'Community Helper';
          const existing = groupsMap.get(sId);

          if (!existing) {
            groupsMap.set(sId, {
              senderId: sId,
              senderName: sName,
              lastMessage: msg.text || msg.content || 'Sent a message',
              updatedAt: msg.createdAt || msg.sent_at || new Date().toISOString(),
              count: 1,
              isCollaborator: Boolean(msg.isCollaborator)
            });
          } else {
            existing.lastMessage = msg.text || msg.content || existing.lastMessage;
            existing.updatedAt = msg.createdAt || msg.sent_at || existing.updatedAt;
            existing.count += 1;
            if (msg.isCollaborator) existing.isCollaborator = true;
          }
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
    const pollInterval = setInterval(loadResponses, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
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
                    {language === 'EN' ? 'No Replies Yet' : language === 'GU' ? 'હજુ સુધી કોઈ જવાબ આવ્યો નથી' : 'अभी तक कोई जवाब नहीं आया'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xs mx-auto">
                    {language === 'EN'
                      ? 'When nearby neighbors or helpers reply to your post, their messages appear here in a clean chat list so you can review and choose who to collaborate with!'
                      : language === 'GU'
                      ? 'જ્યારે આસપાસના લોકો કે સર્વિસ એક્સપર્ટ્સ તમારી પોસ્ટ પર જવાબ આપશે, ત્યારે તેમની ચેટ યાદી અહીં લાઈવ દેખાશે!'
                      : 'जब आस-पास के लोग या हेल्पर्स आपकी पोस्ट पर जवाब देंगे, तब उनकी चैट लिस्ट यहाँ दिखेगी ताकि आप बात कर सकें और सहयोगी चुन सकें।'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenChat(intent);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-all mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'EN' ? 'Open Post Chat Room' : language === 'GU' ? 'ચેટ રૂમ ખોલો' : 'पोस्ट चैट रूम खोलें'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                    💬 {language === 'EN' ? `People Who Replied (${repliers.length})` : language === 'GU' ? `મળેલા જવાબો (${repliers.length})` : `जवाब देने वाले लोग (${repliers.length})`}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {language === 'EN' ? 'Tap to Chat or Collaborate' : 'चैट करें या सहयोगी चुनें'}
                  </span>
                </div>
                {repliers.map((rep) => {
                  const isCollab = collaboratingId === rep.senderId || rep.isCollaborator;
                  return (
                    <div
                      key={rep.senderId}
                      onClick={() => {
                        onClose();
                        onOpenChat({
                          ...intent,
                          selectedReplierId: rep.senderId,
                          selectedReplierName: rep.senderName
                        } as any);
                      }}
                      className={`p-3 rounded-2xl border shadow-sm cursor-pointer transition-all flex items-center justify-between gap-2.5 group active:scale-[0.99] ${
                        isCollab
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-800 hover:border-emerald-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                            {rep.senderName[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white dark:border-slate-900">
                            {rep.count}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {rep.senderName}
                            </span>
                            {isCollab && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-600 text-white shrink-0">
                                🤝 Collaborating
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
                          {isCollab ? '✅ Selected' : '🤝 Collaborate'}
                        </button>
                        <div className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-xs transition-colors">
                          <span>Chat</span>
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
