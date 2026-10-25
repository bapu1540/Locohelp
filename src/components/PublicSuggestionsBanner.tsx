import React, { useState, useEffect } from 'react';
import { Lightbulb, Send, Heart, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  fetchPublicSuggestions,
  submitPublicSuggestion,
  likePublicSuggestion,
  PublicSuggestion
} from '../api';

interface PublicSuggestionsBannerProps {
  language?: 'EN' | 'HI' | 'GU';
  activeUser?: any;
  showToast?: (msg: string) => void;
}

export default function PublicSuggestionsBanner({
  language = 'HI',
  activeUser,
  showToast
}: PublicSuggestionsBannerProps) {
  const [suggestions, setSuggestions] = useState<PublicSuggestion[]>([]);
  const [contentInput, setContentInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeUser?.name || activeUser?.displayName) {
      setNameInput(activeUser.name || activeUser.displayName);
    }
  }, [activeUser]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPublicSuggestions();
      setSuggestions(data);
    } catch (e) {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = contentInput.trim();
    if (!cleanContent) {
      if (showToast) showToast('⚠️ कृपया अपना सुझाव/विचार दर्ज करें।');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalName = nameInput.trim() || activeUser?.name || activeUser?.displayName || 'Community Member';
      const finalEmail = activeUser?.email || '';
      const finalAvatar = activeUser?.photoURL || activeUser?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user';

      const res = await submitPublicSuggestion(cleanContent, finalName, finalEmail, finalAvatar);
      if (res.success && res.suggestion) {
        setSuggestions(prev => [res.suggestion!, ...prev]);
        setContentInput('');
        if (showToast) showToast('✅ आपका सुझाव सफलतापूर्वक पोस्ट हो गया! धन्यवाद।');
      } else {
        if (showToast) showToast(`❌ ${res.error || 'सुझाव सबमिट नहीं हो सका'}`);
      }
    } catch (err: any) {
      if (showToast) showToast('❌ सुझाव सबमिट करते समय त्रुटि हुई');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (id: string) => {
    if (likedIds[id]) return;
    setLikedIds(prev => ({ ...prev, [id]: true }));
    setSuggestions(prev =>
      prev.map(s => (s.id === id ? { ...s, likesCount: (s.likesCount || 0) + 1 } : s))
    );
    await likePublicSuggestion(id);
  };

  const getTitleText = () => {
    if (language === 'EN') return '💡 Public Suggestions & Community Ideas';
    if (language === 'GU') return '💡 સાર્વજનિક સુઝાવ પેટી (Public Suggestions)';
    return '💡 सार्वजनिक सुझाव पेटी (Public Suggestions)';
  };

  const getSubtitleText = () => {
    if (language === 'EN')
      return 'Share your ideas, feature requests, or feedback to help make LocoHelp better for everyone!';
    if (language === 'GU')
      return 'લોકોહેલ્પને વધુ સારું બનાવવા માટે તમારા વિચારો અને સૂચનો અહીં લખો.';
    return 'लोकोहेल्प को और बेहतर बनाने के लिए अपनी राय, विचार या सुझाव यहाँ साझा करें!';
  };

  return (
    <div className="w-full mt-6 rounded-3xl bg-gradient-to-br from-amber-900/10 via-slate-900 to-indigo-950/80 border border-amber-500/30 dark:border-amber-500/40 p-4 sm:p-5 shadow-xl text-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Lightbulb className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-300 tracking-tight flex items-center gap-1.5">
              <span>{getTitleText()}</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {suggestions.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-300/90 mt-0.5 leading-snug">
              {getSubtitleText()}
            </p>
          </div>
        </div>
      </div>

      {/* Suggestion Form */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-5 bg-slate-950/60 p-3.5 sm:p-4 rounded-2xl border border-slate-800">
        <div>
          <textarea
            value={contentInput}
            onChange={(e) => setContentInput(e.target.value)}
            rows={2}
            placeholder={
              language === 'EN'
                ? 'Type your idea or suggestion here...'
                : language === 'GU'
                ? 'તમારો વિચાર અથવા સૂચન અહીં લખો...'
                : 'अपना विचार या सुझाव यहाँ लिखें...'
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={
              language === 'EN'
                ? 'Your Name (Optional)'
                : language === 'GU'
                ? 'તમારું નામ (મરજિયાત)'
                : 'आपका नाम (ऐच्छिक)'
            }
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 sm:w-64"
          />

          <button
            type="submit"
            disabled={isSubmitting || !contentInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isSubmitting
                ? (language === 'EN' ? 'Sending...' : 'भेजा जा रहा है...')
                : (language === 'EN' ? 'Submit Idea' : language === 'GU' ? 'સૂચન મોકલો' : 'सुझाव भेजें')}
            </span>
          </button>
        </div>
      </form>

      {/* Public Suggestions Feed List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {language === 'EN' ? 'Recent Public Suggestions' : language === 'GU' ? 'તાજેતરના સૂચનો' : 'हाल के जन सुझाव'}
            </span>
          </span>
          <span className="text-[10px] text-slate-400 font-bold">
            {suggestions.length} Total
          </span>
        </div>

        {isLoading ? (
          <div className="p-4 text-center text-xs text-slate-400 font-medium">
            ⏳ Loading suggestions...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="p-5 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs space-y-1">
            <p className="font-bold text-slate-300">
              {language === 'EN' ? 'No public suggestions yet' : language === 'GU' ? 'હજુ સુધી કોઈ સૂચન નથી' : 'अभी तक कोई सुझाव नहीं आया है'}
            </p>
            <p className="text-[11px] text-slate-500">
              {language === 'EN' ? 'Be the first to share an idea above!' : 'पहला सुझाव आप लिखकर भेजें!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-amber-500/40 transition-colors flex items-start gap-3"
              >
                <img
                  src={s.userAvatar || 'https://lh3.googleusercontent.com/a/default-user'}
                  alt={s.userName}
                  className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-700"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-black text-amber-300 truncate">
                      {s.userName || 'Community Member'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed break-words font-medium">
                    {s.content}
                  </p>
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleLike(s.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        likedIds[s.id]
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800'
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${likedIds[s.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{s.likesCount || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
