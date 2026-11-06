import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, ShieldCheck, CheckCircle2, Clock, Edit3, MapPin, Phone, Star, AlertCircle, X, Lock, Camera } from 'lucide-react';
import { CATEGORIES, MASTER_CATEGORIES, getCategoryName, getMasterCategoryName, getSubCategoriesByMainId, saveFreeHelperProfile, getFreeHelperProfiles, FreeHelperProfile } from '../data/categories';
import { useLanguage } from '../i18n';
import { saveHelper, getCurrentUser, getHelpers, saveUserProfile } from '../auth';
import { submitVerification, getVerificationStatus } from '../api';
import { validateUploadedFile, checkSystemSecurityBlock } from '../lib/security';
import { applyIdWatermark } from '../lib/watermark';
import { compressImageToWebP } from '../lib/imageCompression';
import { SmartLocationPicker } from './SmartLocationPicker';
import { PhonePrivacyToggle } from './PhonePrivacyToggle';
import { ProtectedSelfieCanvas } from './ProtectedSelfieCanvas';
import { LiveSelfieCaptureField, VisitingCardUploadField } from './LiveSelfieCaptureField';

interface FreeHelperRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newProfile: FreeHelperProfile) => void;
  defaultCategory?: string;
  defaultCategoryId?: string;
  defaultLocation?: string;
  currentUserId?: string;
  currentUserEmail?: string;
}

export default function FreeHelperRegisterModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCategory = 'plumber',
  defaultCategoryId,
}: FreeHelperRegisterModalProps) {
  const { language, t, tr } = useLanguage();
  const initialCategory = defaultCategoryId || defaultCategory || 'plumber';

  const [existingProfile, setExistingProfile] = useState<FreeHelperProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCategory, setFormCategory] = useState(initialCategory);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [isPhonePublic, setIsPhonePublic] = useState(false);
  const [formArea, setFormArea] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formExp, setFormExp] = useState('2 Years');
  const [formSkills, setFormSkills] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | null>(null);
  const [formIdDoc, setFormIdDoc] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hpWebsiteUrl, setHpWebsiteUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const activeUser = getCurrentUser();
    const uid = activeUser?.uid || '';
    const cleanEmail = (activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
    const cleanPhone = (activeUser?.phone || localStorage.getItem('locohelp_last_logged_in_phone') || '').replace(/\D/g, '').slice(-10);

    if (activeUser?.displayName && !formName) setFormName(activeUser.displayName);
    if (cleanEmail) setFormEmail(cleanEmail);
    if (cleanPhone) setFormPhone(cleanPhone);

    const resolvedDefault = defaultCategoryId || defaultCategory || 'plumber';

    const populateFormFromProfile = (prof: any) => {
      if (!prof) return;
      setFormName(prof.name || activeUser?.displayName || '');
      setFormEmail(prof.email || cleanEmail || '');
      setFormCategory(prof.categoryId || resolvedDefault);
      setCustomCategoryName(prof.customCategoryName || '');
      setFormPhone(prof.phone || cleanPhone || '');
      setIsPhonePublic(Boolean(prof.isPhonePublic === true));
      setFormArea(prof.area || '');
      setFormCity(prof.city || '');
      setFormExp(prof.experience || '2 Years');
      setFormSkills(Array.isArray(prof.skills) ? prof.skills.join(', ') : (prof.skills || ''));
      setFormPhotoUrl(prof.photoUrl || null);
      if (prof.idDocUrl || prof.id_doc_url || prof.photoUrl) {
        setFormIdDoc(prof.idDocUrl || prof.id_doc_url || prof.photoUrl);
      }
    };

    let foundLocal: FreeHelperProfile | null = null;
    try {
      const allLocal = getFreeHelperProfiles(true);
      foundLocal = allLocal.find(h =>
        (cleanEmail && (h.email || '').toLowerCase() === cleanEmail) ||
        (uid && uid !== 'guest' && h.userId === uid) ||
        (cleanPhone && (h.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone)
      ) || null;

      if (!foundLocal) {
        const myRaw = localStorage.getItem('locohelp_my_helper_profile');
        if (myRaw) {
          const parsed = JSON.parse(myRaw);
          if (parsed && parsed.name) {
            const pEmail = (parsed.email || '').toLowerCase();
            if (!pEmail || !cleanEmail || pEmail === cleanEmail) {
              foundLocal = parsed;
            }
          }
        }
      }
    } catch (e) {}

    if (foundLocal) {
      setExistingProfile(foundLocal);
      setIsEditing(false);
      populateFormFromProfile(foundLocal);
    } else {
      setExistingProfile(null);
      setIsEditing(false);
      setFormCategory(resolvedDefault);
    }

    getHelpers(true).then(serverHelpers => {
      if (Array.isArray(serverHelpers) && serverHelpers.length > 0) {
        const matchedServer = serverHelpers.find((h: any) =>
          (foundLocal && h.id === foundLocal.id) ||
          (cleanEmail && (h.email || '').toLowerCase() === cleanEmail) ||
          (uid && uid !== 'guest' && h.userId === uid) ||
          (cleanPhone && (h.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone)
        );
        if (matchedServer) {
          setExistingProfile(matchedServer);
          populateFormFromProfile(matchedServer);
          try {
            localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(matchedServer));
          } catch (e) {}
        }
      }
    }).catch(() => {});

    if (foundLocal?.id) {
      getVerificationStatus(foundLocal.id).then(res => {
        if (res.isVerified || res.status === 'approved') {
          setExistingProfile(prev => prev ? { ...prev, isVerified: true, status: 'approved' } : prev);
        }
      }).catch(() => {});
    }
  }, [isOpen, defaultCategory, defaultCategoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const secBlock = checkSystemSecurityBlock(formName, customCategoryName, formArea, formExp, formSkills);
    if (secBlock.blocked) {
      setFileError(secBlock.getMessage(language));
      return;
    }

    // Mandatory Live Selfie check for Service Experts
    const effectiveSelfie = formIdDoc || (existingProfile as any)?.idDocUrl || (existingProfile as any)?.photoUrl;
    if (!effectiveSelfie) {
      setFileError(
        tr(
          '📸 Live Camera Selfie is mandatory for Service Expert verification.',
          '📸 सर्विस एक्सपर्ट सत्यापन के लिए लाइव कैमरा सेल्फी लेना अनिवार्य है।',
          '📸 સર્વિસ એક્સપર્ટ ચકાસણી માટે લાઈવ કેમેરા સેલ્ફી લેવી ફરજિયાત છે.'
        )
      );
      return;
    }

    setFileError(null);
    setIsSubmitting(true);

    const activeUser = getCurrentUser();
    const uid = activeUser?.uid || '';
    const linkedPhone = (formPhone.trim() || activeUser?.phone || localStorage.getItem('locohelp_last_logged_in_phone') || '').replace(/\D/g, '').slice(-10);
    const userEmail = (
      formEmail.trim() ||
      activeUser?.email ||
      localStorage.getItem('locohelp_last_logged_in_email') ||
      (linkedPhone ? `${linkedPhone}@phone.locohelp.com` : '')
    ).toLowerCase();

    const matchedCat = CATEGORIES.find(c => c.id === formCategory);
    const trimmedCustom = customCategoryName.trim();
    const finalCatName = formCategory === 'other' && trimmedCustom
      ? trimmedCustom
      : (matchedCat ? matchedCat.nameEn : 'Service Expert');

    const rawSkills = formSkills.trim()
      ? formSkills.split(',').map(s => s.trim()).filter(Boolean)
      : [finalCatName];
    const skillsList = formCategory === 'other' && trimmedCustom && !rawSkills.some(s => s.toLowerCase() === trimmedCustom.toLowerCase())
      ? [trimmedCustom, ...rawSkills]
      : rawSkills;

    const wasAlreadyApproved = Boolean(
      existingProfile && (existingProfile.isVerified === true || existingProfile.status === 'approved')
    );
    const nextStatus = wasAlreadyApproved ? 'approved' : 'pending';

    const newHelper = saveFreeHelperProfile({
      id: existingProfile?.id,
      userId: uid || existingProfile?.userId,
      email: userEmail,
      name: formName.trim(),
      categoryId: formCategory,
      customCategoryName: formCategory === 'other' ? trimmedCustom : '',
      phone: linkedPhone,
      isPhonePublic,
      skills: skillsList,
      area: formArea.trim() || 'Local Area',
      city: formCity.trim() || undefined,
      experience: formExp.trim() || '1 Year',
      distance: 0.5,
      rating: existingProfile?.rating,
      reviewCount: (existingProfile as any)?.reviewCount,
      completedTasks: existingProfile?.completedTasks,
      photoUrl: formPhotoUrl || effectiveSelfie || undefined,
      govtIdUploaded: true,
      idDocUrl: effectiveSelfie,
      isVerified: wasAlreadyApproved,
      status: nextStatus
    } as any);

    setExistingProfile(newHelper);
    setIsEditing(false);

    try {
      localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(newHelper));
      if (uid && uid !== 'guest') {
        const scopedRaw = localStorage.getItem(`locohelp_user_profile_${uid}`);
        const scoped = scopedRaw ? JSON.parse(scopedRaw) : {};
        scoped.myHelperProfile = newHelper;
        scoped.isPhonePublic = isPhonePublic;
        localStorage.setItem(`locohelp_user_profile_${uid}`, JSON.stringify(scoped));
      }
    } catch (e) {}

    try {
      await saveHelper({
        ...newHelper,
        isPhonePublic,
        website_url_hp: hpWebsiteUrl,
        photoUrl: formPhotoUrl || effectiveSelfie || undefined,
        idDocUrl: effectiveSelfie,
        isVerified: wasAlreadyApproved,
        status: nextStatus
      });
    } catch (e) {}

    setIsSubmitting(false);
    if (onSuccess) {
      onSuccess(newHelper);
    }
  };

  const isApproved = Boolean(existingProfile && (existingProfile.isVerified === true || existingProfile.status === 'approved'));
  const existingCatObj = existingProfile ? CATEGORIES.find(c => c.id === existingProfile.categoryId) : null;
  const existingCatDisplay = existingProfile
    ? (existingProfile.categoryId === 'other' && existingProfile.customCategoryName
        ? `Other Categories — ${existingProfile.customCategoryName}`
        : (existingCatObj ? getCategoryName(existingCatObj, language) : existingProfile.categoryId))
    : '';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-x-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
        style={{
          position: 'fixed',
          top: '52px',
          left: 0,
          right: 0,
          bottom: 'calc(62px + env(safe-area-inset-bottom, 0px))',
          zIndex: 5000,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.94, y: 10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl z-10 max-h-full overflow-y-auto my-auto pb-8"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{existingProfile && !isEditing ? tr('My Service Expert Profile', 'मेरी सर्विस एक्सपर्ट प्रोफाइल', 'મારી સર્વિસ એક્સપર્ટ પ્રોફાઈલ') : t('cat.modalTitle')}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {existingProfile && !isEditing
                    ? (isApproved
                        ? tr('Active & Approved on LocoHelp', 'लोकोहेल्प पर सक्रिय और स्वीकृत', 'લોકોહેલ્પ પર સક્રિય અને મંજૂર')
                        : tr('Under Admin Review', 'एडमिन समीक्षा के अधीन', 'એડમિન સમીક્ષા હેઠળ'))
                    : t('cat.modalSub')}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {existingProfile && !isEditing ? (
            <div className="space-y-4">
              {isApproved ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-700 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                        {tr('Approved & Live Profile', 'स्वीकृत और लाइव प्रोफाइल', 'મંજૂર અને લાઈવ પ્રોફાઈલ')}
                      </h4>
                      <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                        ✓ {tr('Verified', 'सत्यापित', 'વેરિફાઈડ')}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium mt-1">
                      {tr(
                        'Your Service Expert profile is approved by Admin and visible to everyone in Browse Service Experts!',
                        'आपकी प्रोफाइल एडमिन द्वारा स्वीकृत है और सर्विस एक्सपर्ट्स डायरेक्टरी में लाइव दिख रही है!',
                        'તમારી સર્વિસ એક્સપર્ટ પ્રોફાઈલ એડમિન દ્વારા મંજૂર કરવામાં આવી છે અને સર્વિસ એક્સપર્ટ્સ ડિરેક્ટરીમાં લાઈવ દેખાઈ રહી છે!'
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-700 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-black text-amber-950 dark:text-amber-200">
                        {tr('Under Admin Review', 'एडमिन समीक्षा के अधीन (Under Admin Review)', 'એડમિન સમીક્ષા હેઠળ (Under Admin Review)')}
                      </h4>
                      <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full">
                        ⏳ {tr('Pending Approval', 'अप्रूवल पेंडिंग', 'મંજૂરી પેન્ડિંગ')}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
                      {tr(
                        'Your profile has already been created and is currently Under Admin Review. Once approved by Admin, it will be visible in the public directory.',
                        'आपने पहले से प्रोफाइल बना ली है और यह अभी एडमिन अप्रूवल के लिए पेंडिंग है। अप्रूव होते ही यह पब्लिक लिस्ट में दिखेगी।',
                        'તમે પ્રોફાઈલ બનાવી લીધી છે અને તે હાલમાં એડમિન મંજૂરી માટે પેન્ડિંગ છે. મંજૂર થતાં જ તે પબ્લિક યાદીમાં દેખાશે.'
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">{existingProfile.name}</h4>
                    <span className="inline-block mt-1 text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                      {existingCatDisplay}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-xl text-xs font-black">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{existingProfile.rating || 5.0}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                    {(existingProfile as any).isPhonePublic ? (
                      <>
                        <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{existingProfile.phone ? `+91 ${existingProfile.phone}` : tr('Public Call Enabled', 'पब्लिक कॉल चालू', 'પબ્લિક કોલ ચાલુ')}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{tr('Number Private (App Chat Only)', 'नंबर प्राइवेट (सिर्फ ऐप चैट)', 'નંબર પ્રાઇવેટ (ફક્ત એપ ચેટ)')}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                    <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{existingProfile.area || 'Local Area'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    {tr('Skills & Work Details', 'कौशल और कार्य विवरण', 'કૌશલ્ય અને કામની વિગતો')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(existingProfile.skills) ? existingProfile.skills : []).map((skill, idx) => (
                      <span key={idx} className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-lg">
                        {skill}
                      </span>
                    ))}
                    <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
                      Exp: {existingProfile.experience || '1 Year'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold text-xs cursor-pointer transition-all"
                >
                  {tr('Close', 'बंद करें', 'બંધ કરો')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{tr('Edit / Update Profile', 'प्रोफाइल एडिट / अपडेट करें', 'પ્રોફાઈલ એડિટ / અપડેટ કરો')}</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <input
                type="text"
                name="website_url_hp"
                tabIndex={-1}
                autoComplete="off"
                value={hpWebsiteUrl}
                onChange={(e) => setHpWebsiteUrl(e.target.value)}
                className="hidden opacity-0 pointer-events-none absolute -left-[9999px]"
              />

              {/* 1. Helper Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('cat.nameLabel')} <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={t('cat.namePlaceholder')}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* 2. Category / Profession */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('cat.categoryLabel')} <span className="text-rose-500">*</span>
                </label>
                <select 
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                >
                  {MASTER_CATEGORIES.map((mainCat, idx) => {
                    const subs = getSubCategoriesByMainId(mainCat.id);
                    return (
                      <optgroup
                        key={mainCat.id}
                        label={`${idx + 1}. ${mainCat.emoji} ${getMasterCategoryName(mainCat, language)}`}
                      >
                        {subs.map(c => (
                          <option key={c.id} value={c.id}>
                            {language === 'EN' ? c.nameEn : `${getCategoryName(c, language)} (${c.nameEn})`}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>

                {formCategory === 'other' && (
                  <div className="mt-2.5">
                    <label className="block text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 mb-1">
                      {tr('Enter Your Custom Category / Work / Skill *', 'अपनी खुद की केटेगरी / कार्य / हुनर का नाम लिखें *', 'તમારી પોતાની કેટેગરી / કામ / કૌશલ્યનું નામ લખો *')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={tr('e.g. Solar Installer, Tax Consultant, Mehndi Artist', 'उदा. सोलर इंस्टॉलर, टैक्स सलाहकार, मेहंदी आर्टिस्ट', 'દા.ત. સોલાર ઇન્સ્ટોલર, ટેક્સ સલાહકાર, મહેંદી આર્ટિસ્ટ')}
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full bg-emerald-50/60 dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 3. Smart Location Picker (State -> City -> Area) */}
              <SmartLocationPicker
                language={language}
                value={formArea}
                onChange={(formatted, details) => {
                  setFormArea(formatted);
                  setFormCity(details.district);
                }}
              />

              {/* 4. Phone Number Privacy Switch (Default Private + DB Password/Biometric to make Public) */}
              <PhonePrivacyToggle
                language={language}
                isPhonePublic={isPhonePublic}
                onChange={setIsPhonePublic}
                phoneDisplay={formPhone ? `+91 ${formPhone}` : undefined}
              />

              {/* 5. Mandatory Live Camera Selfie */}
              <LiveSelfieCaptureField
                value={formIdDoc || ''}
                onChange={(url) => {
                  setFormIdDoc(url);
                  setFileError(null);
                }}
                userName={formName.trim() || 'Service Expert'}
                entityType="user_profile"
                required={true}
                label={tr('📸 Live Camera Selfie (Mandatory) *', '📸 लाइव कैमरा सेल्फी (अनिवार्य) *', '📸 લાઈવ કેમેરા સેલ્ફી (ફરજિયાત) *')}
                onError={(msg) => setFileError(msg)}
              />

              {/* Optional Experience & Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('cat.expLabel')} <span className="text-[10px] text-slate-400 font-normal">({tr('Optional', 'वैकल्पिक', 'વૈકલ્પિક')})</span>
                  </label>
                  <select 
                    value={formExp}
                    onChange={(e) => setFormExp(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    <option value="6 Months">{tr('6 Months', '6 महीने', '6 મહિના')}</option>
                    <option value="1 Year">{tr('1 Year', '1 साल', '1 વર્ષ')}</option>
                    <option value="2 Years">{tr('2 Years', '2 साल', '2 વર્ષ')}</option>
                    <option value="3-5 Years">{tr('3 - 5 Years', '3 - 5 साल', '3 - 5 વર્ષ')}</option>
                    <option value="5-10 Years">{tr('5 - 10 Years', '5 - 10 साल', '5 - 10 વર્ષ')}</option>
                    <option value="10+ Years">{tr('10+ Years', '10+ साल', '10+ વર્ષ')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('cat.skillsLabel')} <span className="text-[10px] text-slate-400 font-normal">({tr('Optional', 'वैकल्पिक', 'વૈકલ્પિક')})</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder={t('cat.skillsPlaceholder')}
                    value={formSkills}
                    onChange={(e) => setFormSkills(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 6. Optional Visiting Card / Work Photo */}
              <VisitingCardUploadField
                value={formPhotoUrl || ''}
                onChange={(url) => {
                  setFormPhotoUrl(url || null);
                  setFileError(null);
                }}
                label={tr('🪪 Visiting Card / Work Photo (Optional)', '🪪 विजिटिंग कार्ड / काम की फोटो (वैकल्पिक)', '🪪 વિઝિટિંગ કાર્ડ / કામનો ફોટો (વૈકલ્પિક)')}
                subLabel={tr(
                  'Upload your Visiting Card or Work Photo if available (Optional)',
                  'यदि आपके पास विजिटिंग कार्ड या काम की फोटो है तो अपलोड करें (पूरी तरह वैकल्पिक)',
                  'જો તમારી પાસે વિઝિટિંગ કાર્ડ અથવા કામનો ફોટો હોય તો અપલોડ કરો (વૈકલ્પિક)'
                )}
                onError={(msg) => setFileError(msg)}
              />

              {fileError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {fileError}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    if (existingProfile) {
                      setIsEditing(false);
                    } else {
                      onClose();
                    }
                  }}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
                >
                  {t('cat.cancel')}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{existingProfile ? tr('Update Profile', 'प्रोफाइल अपडेट करें', 'પ્રોફાઈલ અપડેટ કરો') : t('cat.saveProfile')}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
