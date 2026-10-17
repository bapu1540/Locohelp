import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Send, MapPin, Clock, Loader2, Sparkles, Mic } from 'lucide-react';
import { useLanguage } from '../i18n';
import { getCurrentUser, supabase } from '../supabase';
import { Intent } from '../types';
import { broadcastIntentToServer } from '../api';
import LoginPromptModal from '../components/LoginPromptModal';
import { isGuestUser, getUserProfile } from '../lib/authUtils';

interface PostIntentSheetProps {
  onClose: () => void;
  onPostCreated?: (newIntent: Intent) => void;
}

export default function PostIntentSheet({ onClose, onPostCreated }: PostIntentSheetProps) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [radius, setRadius] = useState(2);
  const [hasPin, setHasPin] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  const QUICK_TEMPLATES = [
    { label: '🔧 Plumber', text: 'Urgent Plumber chahiye - Nal / Pipe leak ho raha hai', tag: '#Plumber' },
    { label: '⚡ Electrician', text: 'Electrician ki zarurat hai - Light / Fuse kharab hai', tag: '#Electrician' },
    { label: '🚗 Mechanic', text: 'Car / Bike Mechanic & Towing help chahiye', tag: '#Mechanic' },
    { label: '🧹 Cleaning', text: 'Ghar ki safai / Maid helper chahiye', tag: '#Cleaning' },
    { label: '💊 Emergency', text: 'Emergency Dawa / Hospital assist helper', tag: '#Urgent' },
    { label: '🎓 Tutor', text: 'Home Tutor / Teaching help chahiye', tag: '#Tutor' },
    { label: '🏏 Cricket', text: 'Cricket match ke liye players chahiye', tag: '#Cricket' },
    { label: '☕ Chai Meet', text: 'Chai / Coffee meetup for casual chat in neighborhood', tag: '#General' },
  ];

  const QUICK_TAGS = ['#Plumber', '#Electrician', '#Mechanic', '#Carpenter', '#Painter', '#AC_Repair', '#Cleaning', '#Delivery', '#Urgent', '#Cricket', '#Gym', '#Tutor'];

  const autoTags = text.toLowerCase().includes('car') || text.toLowerCase().includes('gadi') ? ['#Mechanic', '#Urgent'] : 
                   text.toLowerCase().includes('pipe') || text.toLowerCase().includes('leak') || text.toLowerCase().includes('nal') ? ['#Plumber'] :
                   text.toLowerCase().includes('wire') || text.toLowerCase().includes('electric') || text.toLowerCase().includes('light') ? ['#Electrician'] :
                   text.toLowerCase().includes('cricket') || text.toLowerCase().includes('match') ? ['#Cricket'] :
                   text.toLowerCase().includes('safai') || text.toLowerCase().includes('clean') ? ['#Cleaning'] :
                   text.length > 5 ? ['#General'] : [];

  const combinedTags = Array.from(new Set([...customTags, ...autoTags]));

  const toggleTag = (tag: string) => {
    setCustomTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const startVoiceToText = () => {
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
        setText(prev => (prev ? prev + ' ' + transcript : transcript).trim());
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } else {
      alert("Voice recognition is not supported in this browser.");
    }
  };

  const isSubmittingRef = React.useRef(false);

  const handlePost = async () => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }
    if (!text.trim() || isPosting || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsPosting(true);

    try {
      const now = new Date();
      const profile = getUserProfile();
      const activeUid = profile.uid || 'user_' + Math.random().toString(36).substring(2, 8);
      const intentId = 'intent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      
      const newIntent: Intent = {
        id: intentId,
        description: text.trim(),
        tags: combinedTags.length > 0 ? combinedTags : ['#General'],
        authorId: activeUid,
        authorName: profile.displayName || 'Community Member',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 1000 * 60 * 120).toISOString(),
        status: 'active',
        hasLocationPin: hasPin,
        distance: Number((Math.random() * 0.4 + 0.1).toFixed(1)),
        isVerifiedUser: true
      };

      // 1. Record in user's created post IDs
      try {
        const myIds = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');
        if (!myIds.includes(newIntent.id)) {
          myIds.push(newIntent.id);
          localStorage.setItem('locohelp_my_post_ids', JSON.stringify(myIds));
        }
      } catch (e) {}

      // 2. Save directly to Supabase (intents & help_requests)
      try {
        const payload = {
          id: newIntent.id,
          description: newIntent.description,
          tags: newIntent.tags,
          author_id: newIntent.authorId,
          author_name: newIntent.authorName || 'Community Member',
          created_at: newIntent.createdAt,
          expires_at: newIntent.expiresAt,
          status: 'active',
          has_location_pin: newIntent.hasLocationPin,
          distance: newIntent.distance,
          radius
        };
        await supabase.from("intents").upsert(payload);
        await supabase.from("help_requests").upsert(payload);
      } catch (supabaseErr) {
        console.warn("Supabase broadcast notice:", supabaseErr);
      }

      // 3. Sync to central Express backend
      try {
        await broadcastIntentToServer(newIntent);
      } catch (serverErr) {
        console.warn("Server broadcast notice:", serverErr);
      }

      // 4. Update UI instantly
      if (onPostCreated) {
        onPostCreated(newIntent);
      }

      onClose();
    } catch (err) {
      console.error("Broadcast post failed:", err);
    } finally {
      setIsPosting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
      />
      
      {/* Modal Dialog */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.92, y: 12 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl z-10 flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-none">{t('post.title')}</h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Nearby helpers ko turant alert jayega</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide">
          
          {/* 1-CLICK QUICK NEED TEMPLATES */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <span>⚡ 1-Click Need Templates (Bina Type Kiye Chuno)</span>
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  type="button"
                  onClick={() => {
                    setText(tmpl.text);
                    if (!customTags.includes(tmpl.tag)) {
                      setCustomTags(prev => [...prev, tmpl.tag]);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 text-xs font-bold whitespace-nowrap active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Description Input + Mic Voice-to-Text Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('post.prompt')}</label>
              <button
                type="button"
                onClick={startVoiceToText}
                className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-md' 
                    : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                }`}
                title="Bolkar type karein (Voice Search)"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isListening ? 'Listening...' : 'Bolkar Likhein'}</span>
              </button>
            </div>
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('post.placeholder') || "Jaise: Mere ghar ka tap leak ho raha hai, plumber chahiye..."}
              rows={3}
              className="w-full bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all resize-none text-sm font-medium"
              autoFocus
            />
          </div>

          {/* Location & Expiry Badges */}
          <div className="grid grid-cols-2 gap-2.5">
            <button 
              type="button"
              onClick={() => setHasPin(!hasPin)}
              className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                hasPin 
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-xs' 
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{hasPin ? t('post.pinDropped') : t('post.dropPin')}</span>
            </button>

            <div className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('post.in2Hours') || "Auto-expires: 2 hrs"}</span>
            </div>
          </div>

          {/* Select Category / Work Type Tags */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{t('post.selectCategory') || "Select Category / Work Type"}</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">Tap to select</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map(tag => {
                const isSelected = combinedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs scale-105' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Public Post Scope Indicator */}
          <div className="space-y-1.5 pt-1 bg-emerald-50/60 dark:bg-slate-800/60 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Public Post Scope</span>
              </label>
              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                🌐 All India Public
              </span>
            </div>
            <p className="text-[10px] text-stone-600 dark:text-slate-300 font-medium">
              Aapki post LocoHelp app par sabhi users aur helpers ko live dikhegi.
            </p>
          </div>
        </div>

        {/* Clean Docked Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-lg">
          <button 
            type="button"
            disabled={text.trim().length === 0 || isPosting}
            onClick={handlePost}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{t('post.btn') || "Broadcast Now"}</span>
          </button>
        </div>
      </motion.div>

      {/* Guest Login Prompt Modal */}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        onGoToLogin={onClose}
        actionTitleEn="Sign In Required to Broadcast"
        actionTitleHi="ब्रॉडकास्ट पोस्ट करने के लिए लॉगिन करें"
      />
    </div>
  );
}
