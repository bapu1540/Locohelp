import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, X, Wrench, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { CATEGORIES, CategoryItem, getCategoryName, saveFreeHelperProfile, FreeHelperProfile } from '../data/categories';
import { useLanguage } from '../i18n';
import { saveHelper } from '../auth';

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

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(defaultCategory);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formExp, setFormExp] = useState('2 Years');
  const [formSkills, setFormSkills] = useState('');
  const [formIdDoc, setFormIdDoc] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    setIsSubmitting(true);

    const matchedCat = CATEGORIES.find(c => c.id === formCategory);
    const finalCatName = formCategory === 'other' && customCategoryName.trim() 
      ? customCategoryName.trim() 
      : (matchedCat ? matchedCat.nameEn : 'General Helper');

    const skillsList = formSkills.trim() 
      ? formSkills.split(',').map(s => s.trim()) 
      : [finalCatName];

    const newHelper = saveFreeHelperProfile({
      name: formName.trim(),
      categoryId: formCategory,
      phone: formPhone.trim(),
      skills: skillsList,
      area: formArea.trim() || 'Local Area',
      experience: formExp.trim() || '1 Year',
      distance: 0.5,
      govtIdUploaded: Boolean(formIdDoc),
      idDocUrl: formIdDoc || undefined,
      isVerified: Boolean(formIdDoc),
    });

    // Also persist in locohelp_my_helper_profile so user can manage it
    try {
      localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(newHelper));
    } catch (e) {}

    // Save to PostgreSQL backend for cross-device persistence
    try {
      const helperId = newHelper.id || `helper_${Date.now()}`;
      saveHelper({ ...newHelper, id: helperId }).catch(() => {});
    } catch (e) {}

    setIsSubmitting(false);
    if (onSuccess) {
      onSuccess(newHelper);
    }
    onClose();

    // Reset form
    setFormName('');
    setFormPhone('');
    setFormArea('');
    setFormSkills('');
  };

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
                  <span>{t('cat.modalTitle')}</span>
                  <span className="text-[10px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-full uppercase">100% Free</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('cat.modalSub')}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
                    {language === 'EN' ? 'Enter Your Custom Category / Business / Hospital Name *' : 'अपनी खुद की केटेगरी / अस्पताल / बिज़नेस का नाम लिखें *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === 'EN' ? 'e.g. City Life Hospital, Sunshine Bakery, Dental Clinic' : 'उदा. सिटी लाइफ अस्पताल, डेंटल क्लिनिक, बेकरी'}
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

            {/* Verify Identity Document (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Verify Identity Document (Aadhaar / ID Card - Optional)</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Priority Badge ⭐</span>
              </label>
              <input 
                type="file" 
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormIdDoc(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 hover:file:bg-emerald-100 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
              />
              {formIdDoc && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ID Document Attached Successfully! Your profile will appear at the top.
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
                onClick={onClose}
                className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all"
              >
                {t('cat.cancel')}
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('cat.saveProfile')}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
