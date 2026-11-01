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
  { id: 'live_selfie', labelEn: '📸 Live Selfie Photo (Real Face Photo)', labelHi: '📸 लाइव सेल्फी फोटो (असली चेहरा दिखती फोटो)', labelGu: '📸 લાઈવ સેલ્ફી ફોટો (સાચો ચહેરો દેખાતો ફોટો)' },
  { id: 'visiting_card', labelEn: '🪪 Visiting Card / Business Card', labelHi: '🪪 विजिटिंग कार्ड / बिज़नेस कार्ड', labelGu: '🪪 વિઝિટિંગ કાર્ડ / બિઝનેસ કાર્ડ' },
  { id: 'shop_work_photo', labelEn: '🏪 Shop Board / Live Work Photo', labelHi: '🏪 दुकान के बोर्ड या काम करते हुए फोटो', labelGu: '🏪 દુકાનના બોર્ડ અથવા કામનો ફોટો' },
  { id: 'skill_certificate', labelEn: '📜 Skill Certificate / Bill Book Photo', labelHi: '📜 काम का सर्टिफिकेट / बिल बुक फोटो', labelGu: '📜 કામનું સર્ટિફિકેટ / બિલ બુક ફોટો' },
];

export default function IdentityVerificationModal({
  isOpen,
  onClose,
  entityType = 'user_profile',
  entityId,
  entityName,
  onVerificationSubmitted
}: IdentityVerificationModalProps) {
  const { language, tr } = useLanguage();
  const activeUser = getCurrentUser();

  const [docType, setDocType] = useState('live_selfie');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [watermarkedPreview, setWatermarkedPreview] = useState<string | null>(null);
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const targetName = entityName || activeUser.displayName || 'Community Member';
  const targetId = entityId || activeUser.uid || 'user_' + Date.now();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateUploadedFile(file, { allowPdf: false });
    if (!validation.valid) {
      setErrorMessage(tr(validation.error || 'Invalid image', validation.errorHi || validation.error || 'अमान्य फ़ोटो', validation.error || 'અમાન્ય ફોટો'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (selfieInputRef.current) selfieInputRef.current.value = '';
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
        customText: `FOR LOCOHELP VERIFICATION ONLY • ${docType === 'live_selfie' ? 'LIVE SELFIE' : 'WORK PROOF'}`
      });

      setWatermarkedPreview(watermarked);
    } catch (err: any) {
      console.error("Watermarking error:", err);
      setErrorMessage(err?.message || tr('Failed to process photo.', 'फोटो प्रोसेस करने में विफल।', 'ફોટો પ્રોસેસ કરવામાં નિષ્ફળ.'));
    } finally {
      setIsWatermarking(false);
    }
  };

  const handleSubmit = async () => {
    if (!watermarkedPreview) {
      setErrorMessage(tr('Please take a Live Selfie or select a work photo.', 'कृपया अपनी लाइव सेल्फी लें या काम की फोटो चुनें।', 'કૃપા કરીને તમારી લાઈવ સેલ્ફી લો અથવા કામનો ફોટો પસંદ કરો.'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const selectedDocObj = DOCUMENT_TYPES.find(d => d.id === docType);
      const docTitle = selectedDocObj ? tr(selectedDocObj.labelEn, selectedDocObj.labelHi, selectedDocObj.labelGu) : 'Live Selfie / Work Verification';

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
        setErrorMessage(res.error || tr('Verification submission failed.', 'सत्यापन अनुरोध सबमिट करने में विफल।', 'વેરિફિકેશન સબમિટ કરવામાં નિષ્ફળ.'));
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
    if (selfieInputRef.current) selfieInputRef.current.value = '';
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
        style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
      >
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
                    ? tr('Business Profile Verification', 'बिज़नेस प्रोफाइल सत्यापन', 'બિઝનેસ પ્રોફાઇલ વેરિફિકેશન')
                    : tr('Live Selfie & Profile Verification', 'लाइव सेल्फी और प्रोफाइल सत्यापन', 'લાઈવ સેલ્ફી અને પ્રોફાઇલ વેરિફિકેશન')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {tr('Take Live Selfie or Upload Work Photo for Verified Badge', 'वेरिफाइड बैज पाने के लिए अपनी लाइव सेल्फी या काम की फोटो दें', 'વેરિફાઈડ બેજ માટે તમારી લાઈવ સેલ્ફી અથવા કામનો ફોટો આપો')}
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
                  {tr('Verification Photo Submitted Successfully!', 'वेरिफिकेशन फोटो सफलतापूर्वक सबमिट हुई!', 'વેરિફિકેશન ફોટો સફળતાપૂર્વક સબમિટ થયો!')}
                </h4>
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 text-left space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{tr('In Admin Approval Queue', 'एडमिन अप्रूवल कतार में', 'એડમિન મંજૂરી કતારમાં')}</span>
                  </div>
                  <p className="leading-relaxed">
                    {tr(
                      'Your photo has been securely submitted to Admin. Once the Admin reviews and approves it, your profile/business will display the official Verified badge!',
                      'आपकी फोटो एडमिन जांच के लिए सुरक्षित रूप से भेज दी गई है। एडमिन द्वारा सत्यापित करते ही आपकी प्रोफ़ाइल पर ग्रीन वेरिफाइड बैज दिखना शुरू हो जाएगा!',
                      'તમારો ફોટો એડમિન ચકાસણી માટે સુરક્ષિત રીતે સબમિટ કરવામાં આવ્યો છે. એડમિન દ્વારા ચકાસણી અને મંજૂરી મળતાં જ તમારી પ્રોફાઇલ પર વેરિફાઈડ બેજ દેખાશે!'
                    )}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl shadow-md cursor-pointer hover:opacity-90"
                  >
                    {tr('Done', 'पूर्ण', 'પૂર્ણ')}
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
                      {tr('No Government ID Required • Safe Live Selfie Verification', 'सरकारी आईडी की ज़रूरत नहीं • सुरक्षित लाइव सेल्फी वेरिफिकेशन', 'સરકારી આઈડીની જરૂર નથી • સુરક્ષિત લાઈવ સેલ્ફી વેરિફિકેશન')}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                      {tr(
                        'To prevent fake accounts without asking for sensitive Government IDs, simply take a Live Selfie or upload your Visiting Card / Shop Photo for Admin review.',
                        'फर्जी अकाउंट रोकने के लिए हम कोई सरकारी आईडी नहीं मांगते। बस अपनी एक साफ लाइव सेल्फी लें या अपना विजिटिंग कार्ड / दुकान की फोटो एडमिन जांच के लिए अपलोड करें।',
                        'બોગસ એકાઉન્ટ રોકવા માટે અમે કોઈ સરકારી આઈડી માંગતા નથી. માત્ર તમારી એક લાઈવ સેલ્ફી લો અથવા તમારું વિઝિટિંગ કાર્ડ / દુકાનનો ફોટો અપલોડ કરો.'
                      )}
                    </p>
                  </div>
                </div>

                {/* Form: Verification Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {tr('Select Verification Photo Type:', 'वेरिफिकेशन फोटो का प्रकार चुनें:', 'વેરિફિકેશન ફોટોનો પ્રકાર પસંદ કરો:')}
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {DOCUMENT_TYPES.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {tr(doc.labelEn, doc.labelHi, doc.labelGu)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upload & Live Selfie Area */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{tr('Take Live Selfie or Upload Photo:', 'लाइव सेल्फी लें या फोटो चुनें:', 'લાઈવ સેલ્ફી લો અથવા ફોટો પસંદ કરો:')}</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                      🛡️ {tr('Admin Review Only', 'केवल एडमिन जांच', 'ફક્ત એડમિન તપાસ')}
                    </span>
                  </label>

                  {/* Camera Selfie Input */}
                  <input
                    type="file"
                    ref={selfieInputRef}
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    capture="user"
                    onChange={handleFileChange}
                    className="hidden"
                    id="live-selfie-file-input"
                  />

                  {/* Gallery Photo Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                    id="id-document-file-input"
                  />

                  {!watermarkedPreview ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDocType('live_selfie');
                          selfieInputRef.current?.click();
                        }}
                        disabled={isWatermarking}
                        className="border-2 border-dashed border-emerald-400 dark:border-emerald-700 hover:border-emerald-600 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 transition-all cursor-pointer group"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white shadow-sm flex items-center justify-center text-lg group-hover:scale-105 transition-all">
                          📸
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                            {tr('Take Live Selfie (Camera)', 'कैमरे से लाइव सेल्फी लें', 'કેમેરાથી લાઈવ સેલ્ફી લો')}
                          </p>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                            {tr('Opens Front Camera Instantly', 'सीधे फ्रंट कैमरा खुलेगा', 'સીધો ફ્રન્ટ કેમેરા ખુલશે')}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isWatermarking}
                        className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 group-hover:text-indigo-600 group-hover:scale-105 transition-all">
                          {isWatermarking ? (
                            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                          ) : (
                            <Upload className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            {tr('Upload Visiting Card / Work Photo', 'विजिटिंग कार्ड / काम की फोटो चुनें', 'વિઝિટિંગ કાર્ડ / કામનો ફોટો પસંદ કરો')}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            JPG, PNG, WEBP (Max 2MB)
                          </p>
                        </div>
                      </button>
                    </div>
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
                          <span>{tr('Verified & Protected', 'सत्यापित एवं सुरक्षित', 'પ્રમાણિત અને સુરક્ષિત')}</span>
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
                          {tr(
                            'Watermark "FOR LOCOHELP VERIFICATION ONLY" is embedded permanently into the image.',
                            'वाटरमार्क "FOR LOCOHELP VERIFICATION ONLY" इस इमेज पर स्थायी रूप से लगा दिया गया है।',
                            'વોટરમાર્ક "FOR LOCOHELP VERIFICATION ONLY" આ ફોટા પર કાયમી ધોરણે લગાવી દેવામાં આવ્યો છે.'
                          )}
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
                        <span>{tr('Submitting to Admin Queue...', 'एडमिन कतार में सबमिट हो रहा है...', 'એડમિન કતારમાં સબમિટ થઈ રહ્યું છે...')}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>
                          {tr(
                            'Submit for Admin Verification',
                            'एडमिन सत्यापन के लिए सबमिट करें',
                            'એડમિન વેરિફિકેશન માટે સબમિટ કરો'
                          )}
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
