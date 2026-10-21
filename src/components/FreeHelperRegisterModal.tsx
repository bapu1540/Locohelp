import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, X, Wrench, ShieldCheck, CheckCircle2, Clock, Edit3, MapPin, Phone, Star, AlertCircle } from 'lucide-react';
import { CATEGORIES, CategoryItem, getCategoryName, saveFreeHelperProfile, getFreeHelperProfiles, FreeHelperProfile } from '../data/categories';
import { useLanguage } from '../i18n';
import { saveHelper, getCurrentUser, getHelpers, saveUserProfile } from '../auth';
import { submitVerification, getVerificationStatus } from '../api';
import { validateUploadedFile, sanitizeText } from '../lib/security';

interface FreeHelperRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newProfile: FreeHelperProfile) => void;
  defaultCategory?: string;
}

export default function FreeHelperRegisterModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCategory = 'plumber',
}: FreeHelperRegisterModalProps) {
  const { language, t } = useLanguage();

  const [existingProfile, setExistingProfile] = useState<FreeHelperProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(defaultCategory);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formExp, setFormExp] = useState('2 Years');
  const [formSkills, setFormSkills] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | null>(null);
  const [formIdDoc, setFormIdDoc] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const activeUser = getCurrentUser();
    const uid = activeUser?.uid || '';
    const cleanEmail = (activeUser?.email || '').trim().toLowerCase();
    const cleanPhone = (activeUser?.phone || '').replace(/\D/g, '');

    if (activeUser?.displayName && !formName) setFormName(activeUser.displayName);
    if (cleanPhone && !formPhone) setFormPhone(cleanPhone);

    const populateFormFromProfile = (prof: any) => {
      if (!prof) return;
      setFormName(prof.name || activeUser?.displayName || '');
      setFormCategory(prof.categoryId || defaultCategory);
      setCustomCategoryName(prof.customCategoryName || '');
      setFormPhone(prof.phone || cleanPhone || '');
      setFormArea(prof.area || '');
      setFormExp(prof.experience || '2 Years');
      setFormSkills(Array.isArray(prof.skills) ? prof.skills.join(', ') : (prof.skills || ''));
      setFormPhotoUrl(prof.photoUrl || null);
    };

    // 1. Check local storage for existing helper profile linked to this user
    let foundLocal: FreeHelperProfile | null = null;
    try {
      const allLocal = getFreeHelperProfiles(true);
      foundLocal = allLocal.find(h =>
        (cleanEmail && (h.email || '').toLowerCase() === cleanEmail) ||
        (uid && uid !== 'guest' && h.userId === uid) ||
        (cleanPhone && (h.phone || '').replace(/\D/g, '') === cleanPhone)
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
    }

    // 2. Sync with backend server to get latest approval status
    getHelpers(true).then(serverHelpers => {
      if (Array.isArray(serverHelpers) && serverHelpers.length > 0) {
        const matchedServer = serverHelpers.find((h: any) =>
          (foundLocal && h.id === foundLocal.id) ||
          (cleanEmail && (h.email || '').toLowerCase() === cleanEmail) ||
          (uid && uid !== 'guest' && h.userId === uid) ||
          (cleanPhone && (h.phone || '').replace(/\D/g, '') === cleanPhone)
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
  }, [isOpen, defaultCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    setIsSubmitting(true);

    const activeUser = getCurrentUser();
    const uid = activeUser?.uid || '';
    const userEmail = activeUser?.email || '';

    const matchedCat = CATEGORIES.find(c => c.id === formCategory);
    const trimmedCustom = customCategoryName.trim();
    const finalCatName = formCategory === 'other' && trimmedCustom
      ? trimmedCustom
      : (matchedCat ? matchedCat.nameEn : 'General Helper');

    const rawSkills = formSkills.trim()
      ? formSkills.split(',').map(s => s.trim()).filter(Boolean)
      : [finalCatName];
    const skillsList = formCategory === 'other' && trimmedCustom && !rawSkills.some(s => s.toLowerCase() === trimmedCustom.toLowerCase())
      ? [trimmedCustom, ...rawSkills]
      : rawSkills;

    const newHelper = saveFreeHelperProfile({
      id: existingProfile?.id,
      userId: uid || existingProfile?.userId,
      email: userEmail || existingProfile?.email,
      name: formName.trim(),
      categoryId: formCategory,
      customCategoryName: formCategory === 'other' ? trimmedCustom : '',
      phone: formPhone.trim(),
      skills: skillsList,
      area: formArea.trim() || 'Local Area',
      experience: formExp.trim() || '1 Year',
      distance: 0.5,
      photoUrl: formPhotoUrl || (existingProfile as any)?.photoUrl || undefined,
      govtIdUploaded: Boolean(formIdDoc || existingProfile?.govtIdUploaded),
      idDocUrl: formIdDoc || existingProfile?.idDocUrl || undefined,
      isVerified: false, // Pending Admin Approval on creation/update
      status: 'pending'
    } as any);

    setExistingProfile(newHelper);
    setIsEditing(false);

    try {
      localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(newHelper));
      if (uid && uid !== 'guest') {
        const scopedRaw = localStorage.getItem(`locohelp_user_profile_${uid}`);
        const scoped = scopedRaw ? JSON.parse(scopedRaw) : {};
        scoped.myHelperProfile = newHelper;
        localStorage.setItem(`locohelp_user_profile_${uid}`, JSON.stringify(scoped));
        saveUserProfile({ uid, email: userEmail, myHelperProfile: newHelper }).catch(() => {});
      }
    } catch (e) {}

    try {
      await saveHelper({ ...newHelper, photoUrl: formPhotoUrl || (existingProfile as any)?.photoUrl || undefined, isVerified: false, status: 'pending' });
    } catch (e) {}

    try {
      await submitVerification({
        entityType: 'user_profile',
        entityId: newHelper.id,
        userId: uid || newHelper.id,
        userName: newHelper.name,
        userEmail: userEmail || undefined,
        userPhone: newHelper.phone,
        title: `Helper Profile (${finalCatName}) - ${newHelper.area}`,
        idDocumentWatermarked: formIdDoc || formPhotoUrl || ''
      });
    } catch (verifErr) {
      console.warn("Verification submit error:", verifErr);
    }

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />
        
        {/* Modal Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 12 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{existingProfile && !isEditing ? (language === 'EN' ? 'My Helper Profile' : 'मेरी हेल्पर प्रोफाइल') : t('cat.modalTitle')}</span>
                  <span className="text-[10px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-full uppercase">100% Free</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {existingProfile && !isEditing
                    ? (isApproved
                        ? (language === 'EN' ? 'Active & Approved on LocoHelp' : 'लोकोहेल्प पर सक्रिय और स्वीकृत')
                        : (language === 'EN' ? 'Under Admin Review' : 'एडमिन समीक्षा के अधीन'))
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
              {/* Status Banner: Under Admin Review vs Active Approved */}
              {isApproved ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-700 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                        {language === 'EN' ? 'Approved & Live Profile' : 'स्वीकृत और लाइव प्रोफाइल'}
                      </h4>
                      <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                        ✓ Verified
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium mt-1">
                      {language === 'EN'
                        ? 'Your helper profile is approved by Admin and visible to everyone in Browse Local Helpers!'
                        : 'आपकी प्रोफाइल एडमिन द्वारा स्वीकृत है और लोकल हेल्पर्स डायरेक्टरी में लाइव दिख रही है!'}
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
                        {language === 'EN' ? 'Under Admin Review' : 'एडमिन समीक्षा के अधीन (Under Admin Review)'}
                      </h4>
                      <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full">
                        ⏳ Pending Approval
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
                      {language === 'EN'
                        ? 'Your profile has already been created and is currently Under Admin Review. Once approved by Admin, it will be visible in the public directory.'
                        : 'आपने पहले से प्रोफाइल बना ली है और यह अभी एडमिन अप्रूवल के लिए पेंडिंग है। अप्रूव होते ही यह पब्लिक लिस्ट में दिखेगी।'}
                    </p>
                  </div>
                </div>
              )}

              {/* Existing Profile Details Card */}
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
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>+91 {existingProfile.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                    <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{existingProfile.area || 'Local Area'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    {language === 'EN' ? 'Skills & Work Details' : 'कौशल और कार्य विवरण'}
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

              {/* Actions: Edit / Update Profile or Close */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold text-xs cursor-pointer transition-all"
                >
                  {language === 'EN' ? 'Close' : 'बंद करें'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{language === 'EN' ? 'Edit / Update Profile' : 'प्रोफाइल एडिट / अपडेट करें'}</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Helper Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('cat.nameLabel')}
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

              {/* Category / Profession */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('cat.categoryLabel')}
                </label>
                <select 
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {getCategoryName(c, language)} ({c.nameEn})
                    </option>
                  ))}
                </select>

                {/* Show Custom Category Input if 'other' is selected */}
                {formCategory === 'other' && (
                  <div className="mt-2.5">
                    <label className="block text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 mb-1">
                      {language === 'EN' ? 'Enter Your Custom Category / Work / Skill *' : 'अपनी खुद की केटेगरी / कार्य / हुनर का नाम लिखें *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'EN' ? 'e.g. Solar Installer, Tax Consultant, Mehndi Artist, Hospital' : 'उदा. सोलर इंस्टॉलर, टैक्स सलाहकार, मेहंदी आर्टिस्ट'}
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full bg-emerald-50/60 dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('cat.phoneLabel')}
                </label>
                <div className="relative">
                  <input 
                    type="tel" 
                    required
                    placeholder="+91 98765 43210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Area / Mohalla */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('cat.areaLabel')}
                </label>
                <input 
                  type="text" 
                  placeholder={t('cat.areaPlaceholder')}
                  value={formArea}
                  onChange={(e) => setFormArea(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Experience */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('cat.expLabel')}
                </label>
                <select 
                  value={formExp}
                  onChange={(e) => setFormExp(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                >
                  <option value="6 Months">6 Months</option>
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="3-5 Years">3 - 5 Years</option>
                  <option value="5-10 Years">5 - 10 Years</option>
                  <option value="10+ Years">10+ Years</option>
                </select>
              </div>

              {/* Skills / Specialties */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('cat.skillsLabel')}
                </label>
                <input 
                  type="text" 
                  placeholder={t('cat.skillsPlaceholder')}
                  value={formSkills}
                  onChange={(e) => setFormSkills(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Profile / Work Photo Upload (Max 2MB) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>{language === 'EN' ? 'Profile / Work Photo (JPG/PNG/WebP max 2MB)' : 'प्रोफाइल / काम की फोटो (अधिकतम 2MB)'}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Recommended 📸</span>
                </label>
                <div className="flex items-center gap-3">
                  {formPhotoUrl && (
                    <img
                      src={formPhotoUrl}
                      alt="Helper Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-emerald-400 shrink-0"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      setFileError(null);
                      if (file) {
                        const check = await validateUploadedFile(file, { allowPdf: false });
                        if (!check.valid) {
                          setFileError(language === 'EN' ? (check.error || 'Invalid image (Max 2MB)') : (check.errorHi || check.error || 'अमान्य फोटो (अधिकतम 2MB)'));
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormPhotoUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 dark:file:bg-emerald-950 dark:file:text-emerald-300 hover:file:bg-emerald-200 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                  />
                </div>
              </div>

              {/* Verify Identity Document (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Government ID (JPG/PNG/WebP max 2MB or PDF max 5MB - Optional)</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Priority Badge ⭐</span>
                </label>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    setFileError(null);
                    if (file) {
                      const check = await validateUploadedFile(file, { allowPdf: true });
                      if (!check.valid) {
                        setFileError(language === 'EN' ? (check.error || 'Invalid file') : (check.errorHi || check.error || 'अमान्य फ़ाइल'));
                        setFormIdDoc(null);
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormIdDoc(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 hover:file:bg-emerald-100 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                />
                {fileError && (
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {fileError}
                  </p>
                )}
                {formIdDoc && !fileError && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ID Document Verified & Attached! Your profile will appear after Admin approval.
                  </p>
                )}
              </div>

              {/* Privacy note */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-bold">{t('cat.privacyGuarantee')}</p>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                    {t('cat.privacyDesc')}
                  </p>
                </div>
              </div>

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
                  <span>{existingProfile ? (language === 'EN' ? 'Update Profile' : 'प्रोफाइल अपडेट करें') : t('cat.saveProfile')}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
