import React, { useState, useEffect } from 'react';
import { Lightbulb, Send, Heart, MessageSquare, LogIn, Sparkles } from 'lucide-react';
import {
  fetchPublicSuggestions,
  submitPublicSuggestion,
  likePublicSuggestion,
  PublicSuggestion
} from '../api';
import { isGuestUser, getUserProfile } from '../lib/authUtils';

interface PublicSuggestionsBannerProps {
  language?: 'EN' | 'HI' | 'GU';
  activeUser?: any;
  onRequireLogin?: () => void;
  showToast?: (msg: string) => void;
}

export default function PublicSuggestionsBanner({
  language = 'HI',
  activeUser,
  onRequireLogin,
  showToast
}: PublicSuggestionsBannerProps) {
  const [suggestions, setSuggestions] = useState<PublicSuggestion[]>([]);
  const [contentInput, setContentInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});

  const guestMode = isGuestUser() && !activeUser?.email && !activeUser?.uid;

  const isGenericPlaceholderName = (val?: string | null) => {
    const n = String(val || '').trim().toLowerCase();
    return (
      !n ||
      n === 'locohelp member' ||
      n === 'locohelp members' ||
      n === 'community member' ||
      n === 'guest user' ||
      n === 'guest' ||
      n === 'user' ||
      n === 'member' ||
      n === 'anonymous'
    );
  };

  useEffect(() => {
    const profile = getUserProfile();
    const candidates = [
      activeUser?.name,
      activeUser?.displayName,
      profile.displayName,
      localStorage.getItem('locohelp_profile_name')
    ];
    const validRealName = candidates.find((c) => c && !isGenericPlaceholderName(c));
    if (validRealName) {
      setNameInput(String(validRealName).trim());
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

  const handleRequireAuthIfGuest = (): boolean => {
    if (isGuestUser() && !activeUser?.email && !activeUser?.uid) {
      if (onRequireLogin) {
        onRequireLogin();
      } else if (showToast) {
        showToast(
          language === 'EN'
            ? '🔒 Please sign in to submit a suggestion.'
            : language === 'GU'
            ? '🔒 સૂચન મોકલવા માટે કૃપા કરીને લોગિન કરો.'
            : '🔒 सुझाव भेजने के लिए कृपया पहले लॉगिन करें।'
        );
      }
      return true;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (handleRequireAuthIfGuest()) return;

    const cleanContent = contentInput.trim();
    if (!cleanContent) {
      if (showToast) showToast('⚠️ कृपया अपना सुझाव/विचार दर्ज करें।');
      return;
    }

    const cleanName = nameInput.trim();
    if (cleanName.length < 2 || isGenericPlaceholderName(cleanName)) {
      if (showToast) {
        showToast(
          language === 'EN'
            ? '⚠️ Please enter your real full name (Mandatory) to submit a suggestion.'
            : '⚠️ सुझाव देने के लिए कृपया अपना असली पूरा नाम लिखें (अनिवार्य)।'
        );
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = getUserProfile();
      const finalEmail = activeUser?.email || profile.email || '';
      const finalAvatar =
        activeUser?.photoURL ||
        activeUser?.avatar_url ||
        profile.photoURL ||
        'https://lh3.googleusercontent.com/a/default-user';

      const res = await submitPublicSuggestion(cleanContent, cleanName, finalEmail, finalAvatar);
      if (res.success && res.suggestion) {
        try {
          localStorage.setItem('locohelp_profile_name', cleanName);
        } catch {}
        setSuggestions(prev => [res.suggestion!, ...prev]);
        setContentInput('');
        if (showToast) showToast('✅ आपका सुझाव आपके नाम के साथ सफलतापूर्वक पोस्ट हो गया! धन्यवाद।');
      } else {
        if (res.error && (res.error.toLowerCase().includes('auth') || res.error.toLowerCase().includes('login') || res.error.toLowerCase().includes('unauthorized'))) {
          if (onRequireLogin) onRequireLogin();
        }
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
    if (language === 'EN') return 'Public Suggestions & Community Ideas';
    if (language === 'GU') return 'સાર્વજનિક સુઝાવ પેટી (Public Suggestions)';
    return 'सार्वजनिक सुझाव पेटी (Public Suggestions)';
  };

  const getSubtitleText = () => {
    if (language === 'EN')
      return 'Share your ideas, feature requests, or feedback to help make LocoHelp better for everyone!';
    if (language === 'GU')
      return 'લોકોહેલ્પને વધુ સારું બનાવવા માટે તમારા વિચારો અને સૂચનો અહીં લખો.';
    return 'लोकोहेल्प को और बेहतर बनाने के लिए अपनी राय, विचार या सुझाव यहाँ साझा करें!';
  };

  return (
    <>
      <div className="w-full mt-5 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-50/95 via-white to-orange-50/90 dark:from-slate-900 dark:via-blue-950/70 dark:to-slate-900 border-2 border-[#0066FF]/25 dark:border-[#0066FF]/40 shadow-xl">
        {/* LocoHelp Brand Header (#0066FF Blue + #FF8800 Orange) */}
        <div className="bg-gradient-to-r from-[#0066FF] via-[#0052CC] to-indigo-700 px-4 py-3.5 sm:px-5 sm:py-4 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-[#FF8800]/25 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF8800] to-[#FF5500] flex items-center justify-center shadow-lg shadow-orange-500/30 border border-white/25 shrink-0">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                    <span>{getTitleText()}</span>
                  </h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-[#FF8800] text-white shadow-xs">
                    {suggestions.length} {language === 'EN' ? 'Ideas' : 'सुझाव'}
                  </span>
                </div>
                <p className="text-[11px] text-blue-100 mt-0.5 leading-snug font-medium">
                  {getSubtitleText()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Suggestion Form (Requires Login) */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3 bg-white dark:bg-slate-900/90 p-3.5 sm:p-4 rounded-2xl border border-[#0066FF]/20 dark:border-blue-500/30 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-[#0066FF] dark:text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#FF8800]" />
                <span>
                  {language === 'EN'
                    ? 'Write Your Suggestion'
                    : language === 'GU'
                    ? 'તમારું સૂચન લખો'
                    : 'अपना सुझाव लिखें'}
                </span>
              </span>
              {guestMode && (
                <button
                  type="button"
                  onClick={handleRequireAuthIfGuest}
                  className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/60 text-[#FF6600] dark:text-orange-300 border border-[#FF8800]/40 flex items-center gap-1 hover:bg-orange-100 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3 h-3" />
                  <span>
                    {language === 'EN'
                      ? 'Login Required to Post'
                      : language === 'GU'
                      ? 'પોસ્ટ કરવા લોગિન કરો'
                      : 'सुझाव देने के लिए लॉगिन आवश्यक'}
                  </span>
                </button>
              )}
            </div>

            <div>
              <textarea
                value={contentInput}
                onFocus={() => {
                  if (guestMode) handleRequireAuthIfGuest();
                }}
                onChange={(e) => {
                  if (guestMode) {
                    handleRequireAuthIfGuest();
                    return;
                  }
                  setContentInput(e.target.value);
                }}
                rows={2}
                placeholder={
                  language === 'EN'
                    ? 'Type your idea or suggestion for LocoHelp here...'
                    : language === 'GU'
                    ? 'તમારો વિચાર અથવા સૂચન અહીં લખો...'
                    : 'लोकोहेल्प के लिए अपना विचार या सुझाव यहाँ लिखें...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-blue-50/50 dark:bg-slate-800/90 border border-blue-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/15 transition-all resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <input
                type="text"
                required
                value={nameInput}
                onFocus={() => {
                  if (guestMode) handleRequireAuthIfGuest();
                }}
                onChange={(e) => {
                  if (guestMode) {
                    handleRequireAuthIfGuest();
                    return;
                  }
                  setNameInput(e.target.value);
                }}
                placeholder={
                  language === 'EN'
                    ? 'Enter Your Real Full Name *'
                    : language === 'GU'
                    ? 'તમારું સાચું પૂરું નામ લખો *'
                    : 'अपना असली पूरा नाम लिखें (अनिवार्य) *'
                }
                className="px-3.5 py-2 rounded-xl bg-blue-50/50 dark:bg-slate-800/90 border border-blue-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0066FF] sm:w-72 font-semibold"
              />

              {guestMode ? (
                <button
                  type="button"
                  onClick={handleRequireAuthIfGuest}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#FF8800] hover:opacity-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>
                    {language === 'EN'
                      ? 'Login to Submit Idea'
                      : language === 'GU'
                      ? 'સૂચન મોકલવા લોગિન કરો'
                      : 'सुझाव भेजने के लिए लॉगिन करें'}
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !contentInput.trim() || !nameInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8800] to-[#FF5500] hover:from-[#FF7700] hover:to-[#E64A00] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmitting
                      ? (language === 'EN' ? 'Sending...' : 'भेजा जा रहा है...')
                      : (language === 'EN' ? 'Submit Idea' : language === 'GU' ? 'સૂચન મોકલો' : 'सुझाव भेजें')}
                  </span>
                </button>
              )}
            </div>
          </form>

          {/* Public Suggestions Feed List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-[#0066FF] dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#FF8800]" />
                <span>
                  {language === 'EN' ? 'Recent Public Suggestions' : language === 'GU' ? 'તાજેતરના સૂચનો' : 'हाल के जन सुझाव'}
                </span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold">
                {suggestions.length} Total
              </span>
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold">
                ⏳ Loading suggestions...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-5 text-center bg-white/80 dark:bg-slate-900/60 rounded-2xl border border-dashed border-[#0066FF]/30 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs space-y-1">
                <p className="font-extrabold text-slate-700 dark:text-slate-200">
                  {language === 'EN' ? 'No public suggestions yet' : language === 'GU' ? 'હજુ સુધી કોઈ સૂચન નથી' : 'अभी तक कोई सुझाव नहीं आया है'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'EN' ? 'Be the first to share an idea above!' : 'पहला सुझाव आप लिखकर भेजें!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900/85 border border-blue-100 dark:border-slate-800 hover:border-[#0066FF]/40 transition-colors flex items-start gap-3 shadow-2xs"
                  >
                    <img
                      src={s.userAvatar || 'https://lh3.googleusercontent.com/a/default-user'}
                      alt={s.userName}
                      className="w-8 h-8 rounded-xl object-cover shrink-0 border-2 border-[#0066FF]/20"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black text-[#0066FF] dark:text-blue-300 truncate">
                          {!isGenericPlaceholderName(s.userName)
                            ? s.userName
                            : s.userEmail
                            ? s.userEmail.split('@')[0]
                            : 'Verified User'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed break-words font-medium">
                        {s.content}
                      </p>
                      <div className="mt-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleLike(s.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                            likedIds[s.id]
                              ? 'bg-orange-500/15 text-[#FF6600] dark:text-orange-300 border border-[#FF8800]/40'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#FF6600] border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${likedIds[s.id] ? 'fill-[#FF6600] text-[#FF6600]' : ''}`} />
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
      </div>

      {/* Outside & Below the Suggestion Box: Official Instagram & Email Contact Bar */}
      <div className="w-full mt-3.5 px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
          {language === 'EN'
            ? 'You can also contact us on Instagram and Email:'
            : language === 'GU'
            ? 'તમે અમને Instagram અને Email પર પણ સંપર્ક કરી શકો છો:'
            : 'आप हमें Instagram और Email पर भी संपर्क कर सकते हैं:'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          {/* Official Authentic Multi-Color Instagram Logo & Link */}
          <a
            href="https://www.instagram.com/locohelpofficial?vrfl=YmIycThvNnVvcXZu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-pink-50/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer group"
            title="Open @locohelpofficial on Instagram"
          >
            {/* Authentic Full-Color Instagram App Icon SVG */}
            <svg
              className="w-7 h-7 shrink-0 drop-shadow-2xs group-hover:scale-105 transition-transform"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="igGrad1" cx="19.38" cy="42.035" r="44.899" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#fd5" />
                  <stop offset=".328" stopColor="#ff543f" />
                  <stop offset=".348" stopColor="#fc5245" />
                  <stop offset=".504" stopColor="#e64771" />
                  <stop offset=".643" stopColor="#d53e91" />
                  <stop offset=".761" stopColor="#cc39a4" />
                  <stop offset=".841" stopColor="#c837ab" />
                </radialGradient>
                <radialGradient id="igGrad2" cx="11.786" cy="5.54" r="29.813" gradientTransform="matrix(1 0 0 .6663 0 1.849)" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#4168c9" />
                  <stop offset=".999" stopColor="#4168c9" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path
                fill="url(#igGrad1)"
                d="M34.017,41.99l-20,0.019c-4.4,0.004-8.003-3.592-8.008-7.992l-0.019-20c-0.004-4.4,3.592-8.003,7.992-8.008l20-0.019c4.4-0.004,8.003,3.592,8.008,7.992l0.019,20C42.014,38.383,38.417,41.986,34.017,41.99z"
              />
              <path
                fill="url(#igGrad2)"
                d="M34.017,41.99l-20,0.019c-4.4,0.004-8.003-3.592-8.008-7.992l-0.019-20c-0.004-4.4,3.592-8.003,7.992-8.008l20-0.019c4.4-0.004,8.003,3.592,8.008,7.992l0.019,20C42.014,38.383,38.417,41.986,34.017,41.99z"
              />
              <path
                fill="#fff"
                d="M24,31c-3.859,0-7-3.14-7-7s3.141-7,7-7s7,3.14,7,7S27.859,31,24,31z M24,19c-2.757,0-5,2.243-5,5s2.243,5,5,5s5-2.243,5-5S26.757,19,24,19z"
              />
              <circle cx="31.5" cy="16.5" r="1.5" fill="#fff" />
              <path
                fill="#fff"
                d="M30,37H18c-3.859,0-7-3.14-7-7V18c0-3.86,3.141-7,7-7h12c3.859,0,7,3.14,7,7v12C37,33.86,33.859,37,30,37z M18,13c-2.757,0-5,2.243-5,5v12c0,2.757,2.243,5,5,5h12c2.757,0,5-2.243,5-5V18c0-2.757-2.243-5-5-5H18z"
              />
            </svg>
            <div className="text-left leading-tight">
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-400">Instagram</span>
              <span className="block text-xs font-black text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                @locohelpofficial
              </span>
            </div>
          </a>

          {/* Official Email Link */}
          <a
            href="mailto:support@locohelp.com"
            className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-blue-50/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer group"
            title="Email support@locohelp.com"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0066FF] to-indigo-600 flex items-center justify-center text-white shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
              <svg
                className="w-4 h-4 fill-none stroke-current"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div className="text-left leading-tight">
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-400">Official Email</span>
              <span className="block text-xs font-black text-[#0066FF] dark:text-blue-400 group-hover:underline">
                support@locohelp.com
              </span>
            </div>
          </a>
        </div>
      </div>
    </>
  );
}
