import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n';
import { getCurrentUser } from '../auth';

export default function ReportModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [selectedReason, setSelectedReason] = React.useState(t('rep.o1') || 'Fake Profile or Wrong Details');
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [details, setDetails] = React.useState('');

  const handleReportSubmit = async () => {
    try {
      const user = getCurrentUser();
      const reportPayload = {
        reason: selectedReason,
        details: details.trim(),
        reporterId: user?.uid || 'guest_user',
        reporterName: user?.displayName || 'Guest',
        reportedAt: new Date().toISOString(),
        status: 'pending_admin_review'
      };

      // Save to Backend PostgreSQL & server
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload)
      });

      // Save locally as backup
      const existing = JSON.parse(localStorage.getItem('locohelp_admin_reports') || '[]');
      existing.unshift(reportPayload);
      localStorage.setItem('locohelp_admin_reports', JSON.stringify(existing));
    } catch (e) {
      console.warn("Report save error:", e);
    }

    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-4 sm:p-0"
      >
        <motion.div 
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-[32px] p-6 relative overflow-hidden shadow-2xl"
        >
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 rounded-2xl">
                <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{t('rep.title') || "Report Issue to Admin"}</h3>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mt-0.5">Direct Admin Review</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isSubmitted ? (
            <>
              <div className="space-y-2.5 mb-4">
                {[t('rep.o1') || 'Fake Profile or Wrong Details', t('rep.o2') || 'Inappropriate Behavior', t('rep.o3') || 'Spam / Scam Offer'].map((reason) => (
                  <label 
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border ${selectedReason === reason ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-extrabold' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium'}`}
                  >
                    <span className="text-xs">{reason}</span>
                    <input type="radio" name="reportReason" checked={selectedReason === reason} onChange={() => setSelectedReason(reason)} className="accent-rose-600" />
                  </label>
                ))}
              </div>

              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Additional details (Optional)..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 mb-4 outline-none focus:ring-2 focus:ring-rose-500 font-medium h-20 resize-none"
              />

              <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mb-4 font-medium">
                🛡️ Your report will be sent directly to the Admin Dashboard for instant action & verification.
              </p>

              <button 
                onClick={handleReportSubmit} 
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3.5 rounded-2xl transition-all text-xs tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Submit Report to Admin</span>
              </button>
            </>
          ) : (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl font-black shadow-inner">
                ✓
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">Report Sent to Admin!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Thank you. Admin will review this report immediately.</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
