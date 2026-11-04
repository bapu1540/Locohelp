import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Sparkles, 
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { submitVerification } from '../api';
import { getCurrentUser } from '../auth';
import { LiveSelfieCaptureField, VisitingCardUploadField } from './LiveSelfieCaptureField';

interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: 'user_profile' | 'business';
  entityId?: string;
  entityName?: string;
  onVerificationSubmitted?: (status: string, liveSelfieUrl?: string, visitingCardUrl?: string) => void;
}

export default function IdentityVerificationModal({
  isOpen,
  onClose,
  entityType = 'user_profile',
  entityId,
  entityName,
  onVerificationSubmitted
}: IdentityVerificationModalProps) {
  const { tr } = useLanguage();
  const activeUser = getCurrentUser();

  const [liveSelfiePreview, setLiveSelfiePreview] = useState<string>('');
  const [visitingCardPreview, setVisitingCardPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetName = entityName || activeUser.displayName || 'Community Member';
  const targetId = entityId || activeUser.uid || 'user_' + Date.now();

  const handleSubmit = async () => {
    if (!liveSelfiePreview) {
      setErrorMessage(
        tr(
          'Live Selfie is mandatory! Please take a Live Selfie first.',
          'लाइव सेल्फी अनिवार्य है! कृपया पहले अपनी लाइव सेल्फी लें।',
          'લાઈવ સેલ્ફી ફરજિયાત છે! કૃપા કરીને પહેલા તમારી લાઈવ સેલ્ફી લો.'
        )
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const docTitle = visitingCardPreview
        ? 'Live Selfie (Mandatory) + Visiting Card'
        : 'Live Selfie Verification';

      const res = await submitVerification({
        entityType,
        entityId: targetId,
        userId: activeUser.uid,
        userName: targetName,
        userEmail: activeUser.email || '',
        userPhone: activeUser.phone || '',
        title: `${targetName} - ${docTitle}`,
        idDocumentWatermarked: liveSelfiePreview,
        visitingCardUrl: visitingCardPreview || ''
      } as any);

      if (res.success) {
        setSubmitSuccess(true);
        if (onVerificationSubmitted) {
          onVerificationSubmitted('pending', liveSelfiePreview, visitingCardPreview);
        }
      } else {
        setErrorMessage(
          res.error ||
            tr(
              'Verification submission failed.',
              'सत्यापन अनुरोध सबमिट करने में विफल।',
              'વેરિફિકેશન સબમિટ કરવામાં નિષ્ફળ.'
            )
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-x-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
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
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-full my-auto"
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-slate-800/80 dark:to-slate-800/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  {entityType === 'business'
                    ? tr('Business Live Selfie Verification', 'बिज़नेस लाइव सेल्फी सत्यापन', 'બિઝનેસ લાઈવ સેલ્ફી વેરિફિકેશન')
                    : tr('Live Selfie Verification (Mandatory)', 'लाइव सेल्फी सत्यापन (अनिवार्य)', 'લાઈવ સેલ્ફી વેરિફિકેશન (ફરજિયાત)')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {tr(
                    'Live Selfie is mandatory • Visiting Card is optional',
                    'लाइव सेल्फी अनिवार्य है • विजिटिंग कार्ड वैकल्पिक है',
                    'લાઈવ સેલ્ફી ફરજિયાત છે • વિઝિટિંગ કાર્ડ વૈકલ્પિક છે'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div
            className="p-4 space-y-3.5 overflow-y-auto flex-1 pb-6"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {submitSuccess ? (
              <div className="text-center py-5 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  {tr(
                    'Live Selfie Submitted Successfully!',
                    'लाइव सेल्फी सफलतापूर्वक सबमिट हो गई!',
                    'લાઈવ સેલ્ફી સફળતાપૂર્વક સબમિટ થઈ ગઈ!'
                  )}
                </h4>
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 text-left space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{tr('In Admin Approval Queue', 'एडमिन अप्रूवल कतार में', 'એડમિન મંજૂરી કતારમાં')}</span>
                  </div>
                  <p className="leading-relaxed">
                    {tr(
                      'Your Live Selfie and profile details have been sent to Admin. Once approved, your profile will show the Verified badge.',
                      'आपकी लाइव सेल्फी और प्रोफ़ाइल की जानकारी एडमिन जांच के लिए भेज दी गई है। अप्रूव होते ही वेरिफाइड बैज दिखने लगेगा!',
                      'તમારી લાઈવ સેલ્ફી અને પ્રોફાઇલ વિગતો એડમિન ચકાસણી માટે મોકલવામાં આવી છે.'
                    )}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
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
                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-3 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-extrabold text-indigo-950 dark:text-indigo-200">
                      {tr(
                        'Live Selfie Mandatory • Visiting Card Optional',
                        'लाइव सेल्फी अनिवार्य • विजिटिंग कार्ड वैकल्पिक',
                        'લાઈવ સેલ્ફી ફરજિયાત • વિઝિટિંગ કાર્ડ વૈકલ્પિક'
                      )}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                      {tr(
                        'Your Live Selfie is strictly for Admin verification so only genuine users can join LocoHelp.',
                        'असली यूज़र्स की पहचान के लिए लाइव सेल्फी अनिवार्य है। विजिटिंग कार्ड पूरी तरह से वैकल्पिक (Optional) है।',
                        'સાચા યુઝર્સની ઓળખ માટે લાઈવ સેલ્ફી ફરજિયાત છે. વિઝિટિંગ કાર્ડ સંપૂર્ણપણે વૈકલ્પિક છે.'
                      )}
                    </p>
                  </div>
                </div>

                {/* 1. Mandatory Live Selfie Field */}
                <LiveSelfieCaptureField
                  value={liveSelfiePreview}
                  onChange={(url) => {
                    setLiveSelfiePreview(url);
                    setErrorMessage(null);
                  }}
                  userName={targetName}
                  entityType={entityType}
                  referenceId={targetId.slice(0, 10)}
                  required={true}
                  onError={(msg) => setErrorMessage(msg)}
                />

                {/* 2. Optional Visiting Card Field */}
                <VisitingCardUploadField
                  value={visitingCardPreview}
                  onChange={(url) => setVisitingCardPreview(url)}
                  onError={(msg) => setErrorMessage(msg)}
                />

                {/* Error message */}
                {errorMessage && (
                  <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl p-2.5 text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-1 pb-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !liveSelfiePreview}
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
                            'Submit Live Selfie for Verification',
                            'वेरिफिकेशन के लिए लाइव सेल्फी सबमिट करें',
                            'વેરિફિકેશન માટે લાઈવ સેલ્ફી સબમિટ કરો'
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
