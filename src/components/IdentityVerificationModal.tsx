import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Eye, 
  EyeOff, 
  FileCheck2, 
  Sparkles, 
  RefreshCw, 
  Building2, 
  UserCheck 
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { applyIdWatermark } from '../lib/watermark';
import { validateUploadedFile } from '../lib/security';
import { submitVerification } from '../api';
import { getCurrentUser } from '../auth';

interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: 'user_profile' | 'business';
  entityId?: string;
  entityName?: string;
  onVerificationSubmitted?: (status: string) => void;
}

const DOCUMENT_TYPES = [
  { id: 'aadhaar', labelEn: 'Aadhaar Card (Front/Both)', labelHi: 'आधार कार्ड (सामने / दोनों तरफ)' },
  { id: 'pan', labelEn: 'PAN Card', labelHi: 'पैन कार्ड (PAN Card)' },
  { id: 'voter_id', labelEn: 'Voter ID Card', labelHi: 'मतदाता पहचान पत्र (Voter ID)' },
  { id: 'driving_license', labelEn: 'Driving License', labelHi: 'ड्राइविंग लाइसेंस (DL)' },
  { id: 'business_license', labelEn: 'Trade / GST / MSME License', labelHi: 'ट्रेड / जीएसटी / एमएसएमई लाइसेंस' },
  { id: 'other_govt_id', labelEn: 'Other Government Issued ID', labelHi: 'अन्य सरकारी पहचान पत्र' },
];

export default function IdentityVerificationModal({
  isOpen,
  onClose,
  entityType = 'user_profile',
  entityId,
  entityName,
  onVerificationSubmitted
}: IdentityVerificationModalProps) {
  const { language } = useLanguage();
  const activeUser = getCurrentUser();

  const [docType, setDocType] = useState('aadhaar');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [watermarkedPreview, setWatermarkedPreview] = useState<string | null>(null);
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const targetName = entityName || activeUser.displayName || 'Community Member';
  const targetId = entityId || activeUser.uid || 'user_' + Date.now();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateUploadedFile(file, { allowPdf: true });
    if (!validation.valid) {
      setErrorMessage(language === 'EN' ? (validation.error || 'Invalid file') : (validation.errorHi || validation.error || 'अमान्य फ़ाइल'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setOriginalFile(file);
    setIsWatermarking(true);
    setErrorMessage(null);

    try {
      // Automatic anti-tamper watermark applied immediately in browser
      const watermarked = await applyIdWatermark(file, {
        entityType,
        userName: targetName,
        referenceId: targetId.slice(0, 10),
        customText: `FOR LOCOHELP VERIFICATION ONLY • DO NOT REUSE • ${entityType === 'business' ? 'BUSINESS ID' : 'USER ID'}`
      });

      setWatermarkedPreview(watermarked);
    } catch (err: any) {
      console.error("Watermarking error:", err);
      setErrorMessage(err?.message || (language === 'EN' ? 'Failed to process document file.' : 'दस्तावेज़ प्रोसेस करने में विफल।'));
    } finally {
      setIsWatermarking(false);
    }
  };

  const handleSubmit = async () => {
    if (!watermarkedPreview) {
      setErrorMessage(language === 'EN' ? 'Please select an ID document to upload.' : 'कृपया अपलोड करने के लिए पहचान पत्र चुनें।');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const selectedDocObj = DOCUMENT_TYPES.find(d => d.id === docType);
      const docTitle = selectedDocObj ? (language === 'EN' ? selectedDocObj.labelEn : selectedDocObj.labelHi) : 'Identity Document';

      const res = await submitVerification({
        entityType,
        entityId: targetId,
        userId: activeUser.uid,
        userName: targetName,
        userEmail: activeUser.email || '',
        userPhone: activeUser.phone || '',
        title: `${targetName} - ${docTitle}`,
        idDocumentWatermarked: watermarkedPreview
      });

      if (res.success) {
        setSubmitSuccess(true);
        if (onVerificationSubmitted) {
          onVerificationSubmitted('pending');
        }
      } else {
        setErrorMessage(res.error || (language === 'EN' ? 'Verification submission failed.' : 'सत्यापन अनुरोध सबमिट करने में विफल।'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setOriginalFile(null);
    setWatermarkedPreview(null);
    setSubmitSuccess(false);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-slate-800/80 dark:to-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                  {entityType === 'business'
                    ? (language === 'EN' ? 'Business Identity Verification' : 'बिज़नेस पहचान सत्यापन')
                    : (language === 'EN' ? 'User Profile Verification' : 'यूज़र प्रोफाइल सत्यापन')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'EN' ? 'Upload ID for Official Verified Badge' : 'वेरिफाइड बैज पाने के लिए पहचान पत्र अपलोड करें'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {submitSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  {language === 'EN' ? 'ID Document Submitted Successfully!' : 'पहचान पत्र सफलतापूर्वक सबमिट हुआ!'}
                </h4>
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 text-left space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{language === 'EN' ? 'In Admin Approval Queue' : 'एडमिन अप्रूवल कतार में'}</span>
                  </div>
                  <p className="leading-relaxed">
                    {language === 'EN'
                      ? 'Your document has been auto-watermarked and securely submitted. Once the Admin reviews and approves it, your profile/business will display the official Verified badge!'
                      : 'आपके दस्तावेज़ पर सुरक्षा वाटरमार्क लगा दिया गया है। एडमिन द्वारा सत्यापित करते ही आपकी प्रोफ़ाइल पर ग्रीन वेरिफाइड बैज दिखना शुरू हो जाएगा!'}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl shadow-md cursor-pointer hover:opacity-90"
                  >
                    {language === 'EN' ? 'Done' : 'पूर्ण'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* STRICT PRIVACY BANNER */}
                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-3.5 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-indigo-950 dark:text-indigo-200">
                      {language === 'EN' ? 'Strict Privacy & Admin-Only Visibility' : 'सख्त प्राइवेसी एवं केवल एडमिन दृश्यता'}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                      {language === 'EN'
                        ? 'Your uploaded ID document is NEVER shown to the public or other users. It is strictly accessible only to LocoHelp Administrators for verification.'
                        : 'अपलोड किया गया पहचान पत्र जनता या अन्य यूज़र्स को कभी नहीं दिखेगा। यह सिर्फ और सिर्फ एडमिन सत्यापन के लिए सुरक्षित है।'}
                    </p>
                  </div>
                </div>

                {/* Form: Document Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'EN' ? 'Select ID Document Type:' : 'पहचान पत्र का प्रकार चुनें:'}
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {DOCUMENT_TYPES.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {language === 'EN' ? doc.labelEn : doc.labelHi}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upload & Watermark Area */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{language === 'EN' ? 'Upload ID Card Photo:' : 'पहचान पत्र की फ़ोटो चुनें:'}</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                      🛡️ {language === 'EN' ? 'Auto-Watermarked' : 'ऑटो-वाटरमार्क'}
                    </span>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="id-document-file-input"
                  />

                  {!watermarkedPreview ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isWatermarking}
                      className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2.5 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-500 group-hover:text-emerald-600 group-hover:scale-105 transition-all">
                        {isWatermarking ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {isWatermarking
                            ? (language === 'EN' ? 'Validating & Watermarking...' : 'सत्यापित और वाटरमार्क किया जा रहा है...')
                            : (language === 'EN' ? 'Click to Upload Document (Image or PDF)' : 'दस्तावेज़ अपलोड करने के लिए क्लिक करें (इमेज या PDF)')}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          JPG, PNG, WEBP (Max 2MB) • PDF (Max 5MB)
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {/* Watermarked Document Preview */}
                      <div className="relative rounded-2xl border-2 border-emerald-500/60 overflow-hidden bg-slate-900 shadow-md max-h-56 flex items-center justify-center p-3">
                        {watermarkedPreview.startsWith('data:application/pdf') ? (
                          <div className="text-center py-6 px-4 text-white space-y-1.5">
                            <FileCheck2 className="w-10 h-10 text-emerald-400 mx-auto" />
                            <p className="text-xs font-bold">{originalFile?.name || 'Verified_ID_Document.pdf'}</p>
                            <p className="text-[10px] text-emerald-300">Valid PDF (%PDF- verified • Max 5MB)</p>
                          </div>
                        ) : (
                          <img
                            src={watermarkedPreview}
                            alt="Watermarked ID Document Preview"
                            loading="lazy"
                            decoding="async"
                            className="max-h-52 w-auto object-contain"
                          />
                        )}
                        <div className="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm backdrop-blur-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{language === 'EN' ? 'Verified & Protected' : 'सत्यापित एवं सुरक्षित'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleReset}
                          className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white p-1 rounded-full text-xs shadow-sm transition-colors cursor-pointer"
                          title="Remove & Change"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {language === 'EN'
                            ? 'Watermark "FOR LOCOHELP VERIFICATION ONLY" is embedded permanently into the image.'
                            : 'वाटरमार्क "FOR LOCOHELP VERIFICATION ONLY" इस इमेज पर स्थायी रूप से लगा दिया गया है।'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error message */}
                {errorMessage && (
                  <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl p-2.5 text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !watermarkedPreview}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{language === 'EN' ? 'Submitting to Admin Queue...' : 'एडमिन कतार में सबमिट हो रहा है...'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>
                          {language === 'EN'
                            ? 'Submit for Admin Verification'
                            : 'एडमिन सत्यापन के लिए सबमिट करें'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
