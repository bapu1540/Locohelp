import React from 'react';
import { ShieldAlert, Ban, X, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage, COMPLIANCE_REPORT_REASONS } from '../i18n';
import { getCurrentUser } from '../auth';

export interface ReportModalProps {
  onClose: () => void;
  reportedUserId?: string;
  reportedUserName?: string;
  reportedPostId?: string;
  reportedPostTitle?: string;
}

export default function ReportModal({
  onClose,
  reportedUserId = '',
  reportedUserName = '',
  reportedPostId = '',
  reportedPostTitle = ''
}: ReportModalProps) {
  const { language, tr } = useLanguage();
  const [selectedReasonId, setSelectedReasonId] = React.useState(COMPLIANCE_REPORT_REASONS[0].id);
  const [blockUserAlso, setBlockUserAlso] = React.useState(true);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [autoFlaggedNotice, setAutoFlaggedNotice] = React.useState(false);
  const [details, setDetails] = React.useState('');

  const getLocalizedReasonText = (r: typeof COMPLIANCE_REPORT_REASONS[0]) => {
    if (language === 'GU') return r.gu;
    if (language === 'HI') return r.hi;
    return r.en;
  };

  const handleReportSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const user = getCurrentUser();
      const matchedReason =
        COMPLIANCE_REPORT_REASONS.find((r) => r.id === selectedReasonId) || COMPLIANCE_REPORT_REASONS[0];
      const localizedReason = getLocalizedReasonText(matchedReason);

      const reportPayload = {
        reason: `${matchedReason.en} / ${matchedReason.hi} / ${matchedReason.gu}`,
        localizedReason,
        description: details.trim() || (reportedPostTitle ? `Reported Post: ${reportedPostTitle}` : ''),
        details: details.trim() || (reportedPostTitle ? `Reported Post: ${reportedPostTitle}` : ''),
        reporterId: user?.uid || 'guest_user',
        reporterName: user?.displayName || localStorage.getItem('locohelp_profile_name') || 'Verified User',
        reporterEmail: user?.email || localStorage.getItem('locohelp_last_logged_in_email') || '',
        reportedUserId: reportedUserId || '',
        reportedUserName: reportedUserName || '',
        reportedPostId: reportedPostId || null,
        blockUser: blockUserAlso,
        reportedAt: new Date().toISOString(),
        status: 'PENDING'
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload)
      });
      const data = await res.json().catch(() => ({}));
      if (data?.autoFlagged) {
        setAutoFlaggedNotice(true);
      }

      // Save locally as backup & record blocked user / hidden post for instant UI filtering
      try {
        const existing = JSON.parse(localStorage.getItem('locohelp_admin_reports') || '[]');
        existing.unshift(reportPayload);
        localStorage.setItem('locohelp_admin_reports', JSON.stringify(existing));

        if (blockUserAlso && reportedUserId) {
          const blockedUsers: string[] = JSON.parse(localStorage.getItem('locohelp_blocked_user_ids') || '[]');
          if (!blockedUsers.includes(reportedUserId)) {
            blockedUsers.push(reportedUserId);
            localStorage.setItem('locohelp_blocked_user_ids', JSON.stringify(blockedUsers));
          }
        }
        if (reportedPostId && (blockUserAlso || data?.autoFlaggedPost)) {
          const hiddenPosts: string[] = JSON.parse(localStorage.getItem('locohelp_hidden_post_ids') || '[]');
          if (!hiddenPosts.includes(reportedPostId)) {
            hiddenPosts.push(reportedPostId);
            localStorage.setItem('locohelp_hidden_post_ids', JSON.stringify(hiddenPosts));
          }
        }
      } catch {}

      window.dispatchEvent(
        new CustomEvent('locohelp_report_submitted', {
          detail: {
            reportedUserId,
            reportedPostId,
            blockUser: blockUserAlso,
            autoFlagged: Boolean(data?.autoFlagged)
          }
        })
      );
    } catch (e) {
      console.warn("Report save error:", e);
    } finally {
      setIsSubmitting(false);
    }

    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1700);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-x-0 bottom-0 top-[52px] bg-slate-950/70 backdrop-blur-xs z-50 flex justify-center items-end sm:items-center p-3 sm:p-4 overflow-y-auto"
      style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-2xl my-auto"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-2xl">
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {tr('Report & Block Safety Center', 'रिपोर्ट और ब्लॉक सुरक्षा केंद्र', 'રિપોર્ટ અને બ્લોક સુરક્ષા કેન્દ્ર')}
              </h3>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mt-0.5">
                {reportedUserName
                  ? `${tr('Target:', 'यूज़र:', 'યુઝર:')} ${reportedUserName}`
                  : tr('Direct Admin Review • IT Rules 2021', 'सीधा एडमिन रिव्यू • सुरक्षा नियम', 'સીધી એડમિન સમીક્ષા • સુરક્ષા નિયમો')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isSubmitted ? (
          <>
            <div className="space-y-2 mb-3.5">
              {COMPLIANCE_REPORT_REASONS.map((r) => {
                const isSelected = selectedReasonId === r.id;
                const labelText = getLocalizedReasonText(r);
                return (
                  <label
                    key={r.id}
                    onClick={() => setSelectedReasonId(r.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-extrabold shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold'
                    }`}
                  >
                    <span className="text-xs pr-2">{labelText}</span>
                    <input
                      type="radio"
                      name="reportReason"
                      checked={isSelected}
                      onChange={() => setSelectedReasonId(r.id)}
                      className="accent-rose-600 shrink-0"
                    />
                  </label>
                );
              })}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={tr(
                'Write additional details about the issue (Optional)...',
                'समस्या के बारे में अतिरिक्त विवरण लिखें (वैकल्पिक)...',
                'સમસ્યા વિશે વધારાની વિગતો લખો (વૈકલ્પિક)...'
              )}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 mb-3 outline-none focus:ring-2 focus:ring-rose-500 font-medium h-18 resize-none"
            />

            <label className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/70 mb-3.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={blockUserAlso}
                onChange={(e) => setBlockUserAlso(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-rose-600 rounded shrink-0 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-rose-900 dark:text-rose-200 leading-snug">
                {tr(
                  'Also block this user & hide their posts from my feed immediately',
                  'इस यूज़र को ब्लॉक भी करें और इनकी पोस्ट मेरी फ़ीड से तुरंत छुपाएं',
                  'આ યુઝરને બ્લોક પણ કરો અને તેમની પોસ્ટ મારી ફીડમાંથી તરત જ છુપાવો'
                )}
              </span>
            </label>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mb-3.5 font-semibold leading-relaxed">
              🛡️ {tr(
                'Auto-Safety Rule: Any post or user receiving 3 or more unique reports is automatically flagged & hidden from public directories until reviewed by Admin.',
                'ऑटो-सेफ्टी नियम: 3 या अधिक अलग-अलग रिपोर्ट मिलने पर पोस्ट या प्रोफाइल अपने आप पब्लिक डायरेक्टरी से छुपा दी जाती है जब तक एडमिन जांच न करे।',
                'ઓટો-સેફ્ટી નિયમ: 3 કે તેથી વધુ રિપોર્ટ મળવા પર પોસ્ટ કે પ્રોફાઇલ એડમિન તપાસ ન કરે ત્યાં સુધી જાહેર ડિરેક્ટરીમાંથી આપોઆપ છુપાવી દેવામાં આવે છે.'
              )}
            </p>

            <button
              onClick={handleReportSubmit}
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-extrabold py-3.5 rounded-2xl transition-all text-xs tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Ban className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? tr('Submitting...', 'सबमिट हो रहा है...', 'સબમિટ થઈ રહ્યું છે...')
                  : tr('Submit Report & Block', 'रिपोर्ट सबमिट करें और ब्लॉक करें', 'રિપોર્ટ સબમિટ કરો અને બ્લોક કરો')}
              </span>
            </button>
          </>
        ) : (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl font-black shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              {tr('Report Submitted & Action Taken!', 'रिपोर्ट सबमिट हो गई और कार्रवाई की गई!', 'રિપોર્ટ સબમિટ થઈ ગયો અને કાર્યવાહી કરવામાં આવી!')}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {autoFlaggedNotice
                ? tr(
                    'This post/user reached 3+ reports and has been automatically flagged & hidden from public directories pending Admin review.',
                    'इस पोस्ट/यूज़र पर 3+ रिपोर्ट हो चुकी हैं, इसलिए इसे ऑटो-फ्लैग कर पब्लिक डायरेक्टरी से छुपा दिया गया है।',
                    'આ પોસ્ટ/યુઝર પર 3+ રિપોર્ટ થવાથી તેને ઓટો-ફ્લેગ કરીને જાહેર ડિરેક્ટરીમાંથી છુપાવી દેવામાં આવ્યા છે.'
                  )
                : tr(
                    'Thank you for keeping LocoHelp safe. Our Admin team will review this report immediately.',
                    'LocoHelp को सुरक्षित रखने के लिए धन्यवाद। एडमिन टीम तुरंत इसकी जांच करेगी।',
                    'LocoHelp ને સુરક્ષિત રાખવા બદલ આભાર. અમારી એડમિન ટીમ તરત જ તેની તપાસ કરશે.'
                  )}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
