import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Lightbulb,
  Send,
  ThumbsUp,
  CheckCircle2,
  Sparkles,
  Instagram,
  Mail,
  ChevronRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { Language } from '../types';
import {
  PublicSuggestion,
  fetchPublicSuggestions,
  submitPublicSuggestion,
  likePublicSuggestion,
} from '../api';

export interface PublicSuggestionsBannerProps {
  language: Language;
  activeUser?: any;
  onRequireLogin?: () => void;
  showToast?: (msg: string) => void;
}

export const PublicSuggestionsBanner: React.FC<PublicSuggestionsBannerProps> = ({
  language,
  activeUser,
  showToast,
}) => {
  const [suggestions, setSuggestions] = useState<PublicSuggestion[]>([]);
  const [isPageOpen, setIsPageOpen] = useState(false);
  const [authorName, setAuthorName] = useState(activeUser?.name || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('locohelp_liked_suggestions');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (activeUser?.name && !authorName) {
      setAuthorName(activeUser.name);
    }
  }, [activeUser?.name]);

  const loadSuggestions = async () => {
    try {
      const list = await fetchPublicSuggestions();
      setSuggestions(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('Error loading public suggestions:', e);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  useEffect(() => {
    if (isPageOpen) {
      loadSuggestions();
    }
  }, [isPageOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const finalName =
        authorName.trim() ||
        activeUser?.name ||
        (language === 'GU'
          ? 'લોકોહેલ્પ યુઝર'
          : language === 'HI'
          ? 'लोकोहेल्प यूज़र'
          : 'LocoHelp User');

      const res = await submitPublicSuggestion(
        message.trim(),
        finalName,
        activeUser?.email,
        activeUser?.avatar
      );

      if (res.success && res.suggestion) {
        setSuggestions((prev) => [res.suggestion!, ...prev]);
      } else {
        await loadSuggestions();
      }

      setMessage('');
      setSubmittedSuccess(true);
      if (showToast) {
        showToast(
          language === 'GU'
            ? '✅ તમારું સૂચન સફળતાપૂર્વક ઉમેરાઈ ગયું છે!'
            : language === 'HI'
            ? '✅ आपका सुझाव सफलतापूर्वक जोड़ दिया गया है!'
            : '✅ Your suggestion has been posted!'
        );
      }
      setTimeout(() => {
        setSubmittedSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to post suggestion:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (item: PublicSuggestion) => {
    if (likedIds.includes(item.id)) return;
    try {
      const nextLiked = [...likedIds, item.id];
      setLikedIds(nextLiked);
      localStorage.setItem('locohelp_liked_suggestions', JSON.stringify(nextLiked));
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === item.id ? { ...s, likesCount: (s.likesCount || 0) + 1 } : s
        )
      );
      await likePublicSuggestion(item.id);
    } catch (err) {
      console.error('Failed to like suggestion:', err);
    }
  };

  const buttonTitle =
    language === 'GU'
      ? 'સાર્વજનિક સુઝાવ પેટી'
      : language === 'HI'
      ? 'सार्वजनिक सुझाव पेटी'
      : 'Public Suggestion';

  return (
    <>
      {/* Very Compact Single-Line Button on Home Page */}
      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setIsPageOpen(true)}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: '12px',
            background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 50%, #ffedd5 100%)',
            border: '1px solid #fcd34d',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '8px',
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Lightbulb className="w-3.5 h-3.5" />
            </span>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 900,
                color: '#78350f',
              }}
            >
              {buttonTitle}
            </span>
            {suggestions.length > 0 && (
              <span
                style={{
                  backgroundColor: '#fde68a',
                  color: '#92400e',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '1px 7px',
                  borderRadius: '9999px',
                }}
              >
                {suggestions.length}
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-amber-800 shrink-0" />
        </button>

        {/* Compact Contact & Instagram Bar */}
        <div
          style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '7px 10px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <a
            href="https://www.instagram.com/loco.help?igsh=MWx4d3h5d25xN2R6Zw=="
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            aria-label="Instagram"
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
              color: '#ffffff',
              textDecoration: 'none',
              boxShadow: '0 2px 5px rgba(236, 72, 153, 0.35)',
              flexShrink: 0,
            }}
          >
            <Instagram className="w-4 h-4 text-white shrink-0" />
          </a>

          <a
            href="mailto:support@locohelp.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>support@locohelp.com</span>
          </a>
        </div>
      </div>

      {/* Dedicated Full-Screen Page when user clicks Public Suggestion */}
      {isPageOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9850,
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Dedicated Page Header */}
            <div
              style={{
                background: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)',
                color: '#ffffff',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsPageOpen(false)}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>
                    {buttonTitle}
                  </h2>
                  <p style={{ fontSize: '11px', margin: 0, opacity: 0.92 }}>
                    {language === 'GU'
                      ? 'નવું સૂચન આપો અને અન્ય લોકોના સૂચનો વાંચો'
                      : language === 'HI'
                      ? 'नया सुझाव दें और अन्य लोगों के सुझाव पढ़ें'
                      : 'Submit a new suggestion & view community suggestions'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPageOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body: New Suggestion Form + Community Suggestions List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                maxWidth: '640px',
                width: '100%',
                margin: '0 auto',
              }}
            >
              {/* New Suggestion Form Card */}
              <form
                onSubmit={handleSubmit}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #fde68a',
                  borderRadius: '16px',
                  padding: '14px',
                  marginBottom: '16px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 900,
                    color: '#78350f',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>
                    {language === 'GU'
                      ? 'નવું સૂચન લખો'
                      : language === 'HI'
                      ? 'नया सुझाव लिखें'
                      : 'Write a New Suggestion'}
                  </span>
                </div>

                {submittedSuccess && (
                  <div
                    style={{
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {language === 'GU'
                        ? 'આભાર! તમારું સૂચન સફળતાપૂર્વક ઉમેરાઈ ગયું છે.'
                        : language === 'HI'
                        ? 'धन्यवाद! आपका सुझाव सफलतापूर्वक जोड़ दिया गया है।'
                        : 'Thank you! Your suggestion has been posted.'}
                    </span>
                  </div>
                )}

                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder={
                      language === 'GU'
                        ? 'તમારું નામ'
                        : language === 'HI'
                        ? 'आपका नाम'
                        : 'Your Name'
                    }
                    style={{
                      width: '100%',
                      padding: '9px 11px',
                      fontSize: '12.5px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                    }}
                  />
                </div>

                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    language === 'GU'
                      ? 'LocoHelp માં કયું નવું ફીચર કે સેવા ઉમેરવી જોઈએ? અહીં લખો...'
                      : language === 'HI'
                      ? 'LocoHelp में कौन सा नया फीचर या सेवा जोड़नी चाहिए? यहाँ लिखें...'
                      : 'What new feature or service should we add to LocoHelp? Write here...'
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '12.5px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    resize: 'none',
                    marginBottom: '10px',
                  }}
                />

                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: submitting || !message.trim() ? 0.6 : 1,
                  }}
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submitting
                      ? language === 'GU'
                        ? 'મોકલાઈ રહ્યું છે...'
                        : language === 'HI'
                        ? 'भेजा जा रहा है...'
                        : 'Posting...'
                      : language === 'GU'
                      ? 'સૂચન સબમિટ કરો'
                      : language === 'HI'
                      ? 'सुझाव सबमिट करें'
                      : 'Submit Suggestion'}
                  </span>
                </button>
              </form>

              {/* Existing Suggestions List */}
              <div>
                <h3
                  style={{
                    fontSize: '13px',
                    fontWeight: 900,
                    color: '#334155',
                    marginBottom: '10px',
                  }}
                >
                  {language === 'GU'
                    ? `લોકોના સૂચનો (${suggestions.length})`
                    : language === 'HI'
                    ? `लोगों के सुझाव (${suggestions.length})`
                    : `Community Suggestions (${suggestions.length})`}
                </h3>

                {suggestions.length === 0 ? (
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '14px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '12.5px',
                    }}
                  >
                    {language === 'GU'
                      ? 'હજુ સુધી કોઈ સૂચન નથી. સૌપ્રથમ તમારું સૂચન આપો!'
                      : language === 'HI'
                      ? 'अभी तक कोई सुझाव नहीं है। सबसे पहले अपना सुझाव दें!'
                      : 'No suggestions yet. Be the first to share your idea!'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {suggestions.map((item) => {
                      const isLiked = likedIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            padding: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              marginBottom: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '9999px',
                                  backgroundColor: '#fef3c7',
                                  color: '#b45309',
                                  fontWeight: 900,
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {(item.userName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                                  {item.userName || 'LocoHelp User'}
                                </div>
                                {item.createdAt && (
                                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleLike(item)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 800,
                                border: isLiked ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                                backgroundColor: isLiked ? '#f59e0b' : '#f8fafc',
                                color: isLiked ? '#ffffff' : '#475569',
                                cursor: 'pointer',
                              }}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>{item.likesCount || 0}</span>
                            </button>
                          </div>

                          <p
                            style={{
                              fontSize: '12.5px',
                              color: '#1e293b',
                              margin: 0,
                              lineHeight: 1.45,
                              whiteSpace: 'pre-line',
                            }}
                          >
                            {item.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default PublicSuggestionsBanner;
