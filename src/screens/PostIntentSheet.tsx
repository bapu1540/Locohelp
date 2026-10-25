import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Send, MapPin, Clock, Loader2, Sparkles, Mic, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../i18n';
import { getCurrentUser } from '../auth';
import { Intent } from '../types';
import { broadcastIntentToServer } from '../api';
import LoginPromptModal from '../components/LoginPromptModal';
import { isGuestUser, getUserProfile } from '../lib/authUtils';
import {
  sanitizeText,
  getPostCooldownRemainingSeconds,
  recordPostCreatedTimestamp,
  checkSystemSecurityBlock,
  validateUploadedFile
} from '../lib/security';
import { compressImageToWebP } from '../lib/imageCompression';
import { uploadFileToFirebaseStorage, deleteFileFromFirebaseStorage } from '../lib/firebase';
import {
  PAN_INDIA_STATES_DISTRICTS,
  DISTRICT_POPULAR_AREAS,
  getSavedUserLocation,
  saveUserLocationPermanently
} from '../data/panIndiaLocations';

interface PostIntentSheetProps {
  onClose: () => void;
  onPostCreated?: (newIntent: Intent) => void;
}

export default function PostIntentSheet({ onClose, onPostCreated }: PostIntentSheetProps) {
  const { t, language } = useLanguage();
  const [text, setText] = useState('');
  const [radius, setRadius] = useState(2);
  const [hasPin, setHasPin] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() => getPostCooldownRemainingSeconds());

  useEffect(() => {
    const timer = setInterval(() => {
      const rem = getPostCooldownRemainingSeconds();
      setCooldownRemaining(rem);
      if (rem === 0 && postError?.includes('wait')) {
        setPostError(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [postError]);

  // Pan-India State, District/City & Local Area/Village Selection (Pre-filled from saved location)
  const initialSavedLoc = React.useMemo(() => getSavedUserLocation(), []);
  const [selectedState, setSelectedState] = useState<string>(initialSavedLoc.state || 'Gujarat');
  const [selectedCity, setSelectedCity] = useState<string>(initialSavedLoc.district || 'Gandhinagar');
  const [customCity, setCustomCity] = useState<string>('');
  const [localArea, setLocalArea] = useState<string>(
    initialSavedLoc.area || (DISTRICT_POPULAR_AREAS[initialSavedLoc.district || 'Gandhinagar']?.[0] || 'Kudasan')
  );

  const statesList = React.useMemo(() => Object.keys(PAN_INDIA_STATES_DISTRICTS), []);
  const districtsForSelectedState = React.useMemo(
    () => PAN_INDIA_STATES_DISTRICTS[selectedState] || PAN_INDIA_STATES_DISTRICTS['Gujarat'],
    [selectedState]
  );
  const popularAreasForCity = React.useMemo(
    () => DISTRICT_POPULAR_AREAS[selectedCity] || ['Main Market', 'Station Road', 'Sector 1', 'Civil Lines'],
    [selectedCity]
  );

  const QUICK_TEMPLATES = [
    { label: '🔧 ' + (language === 'EN' ? 'Plumber' : language === 'GU' ? 'પ્લમ્બર' : 'प्लंबर'), text: t('post.tmpl.plumber'), tag: '#Plumber' },
    { label: '⚡ ' + (language === 'EN' ? 'Electrician' : language === 'GU' ? 'ઈલેક્ટ્રિશિયન' : 'इलेक्ट्रीशियन'), text: t('post.tmpl.electrician'), tag: '#Electrician' },
    { label: '🚗 ' + (language === 'EN' ? 'Mechanic' : language === 'GU' ? 'મિકેનિક' : 'मैकेनिक'), text: t('post.tmpl.mechanic'), tag: '#Mechanic' },
    { label: '🧹 ' + (language === 'EN' ? 'Cleaning' : language === 'GU' ? 'સફાઈ' : 'सफाई'), text: t('post.tmpl.cleaning'), tag: '#Cleaning' },
    { label: '💊 ' + (language === 'EN' ? 'Emergency' : language === 'GU' ? 'ઈમરજન્સી' : 'इमरजेंसी'), text: t('post.tmpl.emergency'), tag: '#Urgent' },
    { label: '🎓 ' + (language === 'EN' ? 'Tutor' : language === 'GU' ? 'ટ્યુટર' : 'ट्यूटर'), text: t('post.tmpl.tutor'), tag: '#Tutor' },
    { label: '🏏 ' + (language === 'EN' ? 'Cricket' : language === 'GU' ? 'ક્રિકેટ' : 'क्रिकेट'), text: t('post.tmpl.cricket'), tag: '#Cricket' },
    { label: '☕ ' + (language === 'EN' ? 'Chai Meet' : language === 'GU' ? 'ચા મીટઅપ' : 'चाय मीटअप'), text: t('post.tmpl.chai'), tag: '#General' },
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
      recognition.lang = language === 'EN' ? 'en-US' : language === 'GU' ? 'gu-IN' : 'hi-IN';
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
      setPostError("Voice recognition is not supported in this browser.");
    }
  };

  const isSubmittingRef = React.useRef(false);

  const handlePost = async () => {
    if (isGuestUser()) {
      setIsLoginPromptOpen(true);
      return;
    }

    const rem = getPostCooldownRemainingSeconds();
    if (rem > 0) {
      setCooldownRemaining(rem);
      setPostError(
        language === 'EN'
          ? `Anti-Spam Protection: Please wait ${rem}s before creating another post.`
          : `स्पैम सुरक्षा: अगली पोस्ट करने के लिए कृपया ${rem} सेकंड प्रतीक्षा करें।`
      );
      return;
    }

    const safeText = sanitizeText(text.trim(), 1000);
    if (!safeText || isPosting || isSubmittingRef.current) return;

    // Silent Background Community Guidelines & Abuse Filter (System Security Block)
    const secBlock = checkSystemSecurityBlock(safeText, localArea, customCity, combinedTags);
    if (secBlock.blocked) {
      setPostError(secBlock.getMessage(language));
      return;
    }

    isSubmittingRef.current = true;
    setIsPosting(true);
    setPostError(null);

    try {
      const now = new Date();
      const profile = getUserProfile();
      const activeUid = profile.uid || 'user_' + Math.random().toString(36).substring(2, 8);
      const intentId = 'intent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      const finalState = sanitizeText((selectedState || 'Gujarat').trim(), 100);
      const finalCity = sanitizeText((selectedCity === 'Other' ? (customCity.trim() || 'Gandhinagar') : selectedCity).trim(), 100);
      const finalArea = sanitizeText((localArea.trim() || (popularAreasForCity[0] || 'Main Area')).trim(), 150);
      const fullLocationLabel = `${finalArea}, ${finalCity}`;

      try {
        saveUserLocationPermanently({ state: finalState, district: finalCity, area: finalArea });
      } catch (e) {}
      
      const newIntent: Intent = {
        id: intentId,
        description: safeText,
        tags: combinedTags.length > 0 ? combinedTags.map(t => sanitizeText(t, 40)) : ['#General'],
        authorId: activeUid,
        authorName: sanitizeText(profile.displayName || 'Community Member', 100),
        state: finalState,
        city: finalCity,
        area: finalArea,
        location: fullLocationLabel,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
        status: 'active',
        hasLocationPin: hasPin,
        distance: Number((Math.random() * 0.4 + 0.1).toFixed(1)),
        isVerifiedUser: true,
        imageUrl: attachmentUrl || undefined,
        attachmentUrl: attachmentUrl || undefined
      };

      // 1. Sync to central Express backend & PostgreSQL
      const serverResp: any = await broadcastIntentToServer(newIntent);
      if (serverResp && serverResp.error) {
        if (serverResp.cooldownRemaining) {
          setCooldownRemaining(serverResp.cooldownRemaining);
        }
        setPostError(serverResp.error);
        setIsPosting(false);
        isSubmittingRef.current = false;
        return;
      }

      // 2. Record cooldown & post ID
      recordPostCreatedTimestamp();
      setCooldownRemaining(30);

      try {
        const myIds = JSON.parse(localStorage.getItem('locohelp_my_post_ids') || '[]');
        if (!myIds.includes(newIntent.id)) {
          myIds.push(newIntent.id);
          localStorage.setItem('locohelp_my_post_ids', JSON.stringify(myIds));
        }
      } catch (e) {}

      // 3. Update UI instantly
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
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{t('post.alertDesc')}</p>
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
              <span>{t('post.quickNeeds')}</span>
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
                title={t('post.voiceSearch')}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isListening ? t('post.voiceListening') : t('post.voiceBtn')}</span>
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

            {/* Optional Help Request Attachment (Uploaded directly to Firebase Storage locohelp/help_requests/) */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {isUploadingAttachment
                    ? (language === 'EN' ? 'Uploading to Cloud...' : 'अपलोड हो रहा है...')
                    : (language === 'EN' ? 'Attach Photo / Issue Image (Optional)' : 'फ़ोटो / अटैचमेंट जोड़ें (वैकल्पिक)')}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPostError(null);
                    const check = await validateUploadedFile(file, { allowPdf: false });
                    if (!check.valid) {
                      setPostError(check.error || 'Only safe JPG, PNG, or WEBP images up to 2MB are allowed.');
                      e.target.value = '';
                      return;
                    }
                    setIsUploadingAttachment(true);
                    try {
                      if (attachmentUrl) {
                        await deleteFileFromFirebaseStorage(attachmentUrl).catch(() => {});
                      }
                      const uploadedUrl = await compressImageToWebP(file, {
                        maxWidth: 1200,
                        quality: 0.75,
                        folder: 'help_requests'
                      });
                      setAttachmentUrl(uploadedUrl);
                    } catch {
                      try {
                        const fallbackUrl = await uploadFileToFirebaseStorage(file, 'help_requests', file.name);
                        setAttachmentUrl(fallbackUrl);
                      } catch {}
                    } finally {
                      setIsUploadingAttachment(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>

              {attachmentUrl && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-xl">
                  <img
                    src={attachmentUrl}
                    alt="Attachment"
                    className="w-8 h-8 rounded-lg object-cover border border-emerald-300"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const prev = attachmentUrl;
                      setAttachmentUrl('');
                      await deleteFileFromFirebaseStorage(prev).catch(() => {});
                    }}
                    className="text-xs font-black text-rose-600 hover:text-rose-700 px-1 cursor-pointer"
                    title="Remove attachment"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pan-India State, District/City & Local Area/Village Selection */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white dark:from-slate-800/80 dark:to-slate-850 border border-emerald-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {language === 'EN'
                    ? 'Location (State, District & Local Area)'
                    : language === 'GU'
                    ? 'લોકેશન (રાજ્ય, જિલ્લો અને લોકલ વિસ્તાર/ગામ)'
                    : 'लोकेशन (राज्य, जिला और लोकल एरिया/गाँव)'}
                </span>
              </label>
              <span className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                📍 {(localArea.trim() || 'Area')}, {(selectedCity === 'Other' ? (customCity.trim() || 'District') : selectedCity)}
              </span>
            </div>

            {/* 1. State & District/City Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  {language === 'EN' ? '1. State (All India):' : language === 'GU' ? '1. રાજ્ય પસંદ કરો:' : '1. राज्य चुनें:'}
                </span>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setSelectedState(newState);
                    const dists = PAN_INDIA_STATES_DISTRICTS[newState] || [];
                    const firstDist = dists[0] || '';
                    setSelectedCity(firstDist);
                    const defaultAreas = DISTRICT_POPULAR_AREAS[firstDist] || [];
                    setLocalArea(defaultAreas[0] || '');
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-extrabold text-slate-900 dark:text-white outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {statesList.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  {language === 'EN' ? '2. District / City:' : language === 'GU' ? '2. જિલ્લો / શહેર પસંદ કરો:' : '2. जिला / शहर चुनें:'}
                </span>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    const newCity = e.target.value;
                    setSelectedCity(newCity);
                    const defaultAreas = DISTRICT_POPULAR_AREAS[newCity] || [];
                    setLocalArea(defaultAreas[0] || '');
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-extrabold text-slate-900 dark:text-white outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {districtsForSelectedState.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                  <option value="Other">Other / Custom District...</option>
                </select>
              </div>
            </div>

            {selectedCity === 'Other' && (
              <input
                type="text"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                placeholder={language === 'EN' ? 'Type your District or City name...' : language === 'GU' ? 'તમારા જિલ્લા કે શહેરનું નામ લખો...' : 'अपने जिले या शहर का नाम लिखें...'}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            )}

            {/* 3. Local Area / Village / Sector Quick Chips + Type Input */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                {language === 'EN' ? '3. Select or Type Local Area / Village / Sector:' : language === 'GU' ? '3. લોકલ વિસ્તાર / ગામ / સેક્ટર પસંદ કરો અથવા લખો:' : '3. लोकल एरिया / गाँव / सेक्टर चुनें या टाइप करें:'}
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {popularAreasForCity.map((areaOption) => {
                  const isAreaSelected = localArea.trim().toLowerCase() === areaOption.toLowerCase();
                  return (
                    <button
                      key={areaOption}
                      type="button"
                      onClick={() => setLocalArea(areaOption)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                        isAreaSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      📍 {areaOption}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={localArea}
                onChange={(e) => setLocalArea(e.target.value)}
                placeholder={language === 'EN' ? 'Type Area / Village / Sector (e.g., Kudasan, Sector 21, Chandkheda)' : language === 'GU' ? 'વિસ્તાર / ગામ / સેક્ટર લખો (દા.ત. કુડાસણ, સેક્ટર 21, ચાંદખેડા)' : 'एरिया / गाँव / सेक्टर लिखें (जैसे: Kudasan, Sector 21, Chandkheda)'}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 transition-all"
              />
            </div>
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
              <span>{language === 'EN' ? 'Auto-expires: 1 hr' : language === 'GU' ? '1 કલાકમાં ઓટો-ડિલીટ' : '1 घंटे में ऑटो-डिलीट'}</span>
            </div>
          </div>

          {/* Select Category / Work Type Tags */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{t('post.selectCategory') || "Select Category / Work Type"}</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">{language === 'EN' ? 'Tap to select' : language === 'GU' ? 'પસંદ કરવા ટેપ કરો' : 'चुनने के लिए टैप करें'}</span>
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
                <span>{t('post.scopeTitle')}</span>
              </label>
              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                {t('post.scopeBadge')}
              </span>
            </div>
            <p className="text-[10px] text-stone-600 dark:text-slate-300 font-medium">
              {t('post.scopeDesc')}
            </p>
          </div>
        </div>

        {/* Clean Docked Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-lg space-y-2">
          {postError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{postError}</span>
            </div>
          )}
          <button 
            type="button"
            disabled={text.trim().length === 0 || isPosting || cooldownRemaining > 0}
            onClick={handlePost}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>
              {cooldownRemaining > 0
                ? (language === 'EN' ? `Wait ${cooldownRemaining}s to Post Again` : language === 'GU' ? `ફરીથી પોસ્ટ કરવા ${cooldownRemaining}s રાહ જુઓ` : `अगली पोस्ट के लिए ${cooldownRemaining}s रुकें`)
                : (t('post.btn') || "Broadcast Now")}
            </span>
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
