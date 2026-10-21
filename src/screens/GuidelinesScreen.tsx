import React from 'react';
import { ArrowLeft, ShieldCheck, AlertOctagon, UserCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function GuidelinesScreen({ onBack, onReport }: { onBack: () => void; onReport?: () => void }) {
  const { t, language } = useLanguage();

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] dark:bg-slate-900 transition-colors">
      <div className="flex items-center px-4 py-4 pt-10 sm:pt-4 border-b border-[#DFDBCF] dark:border-slate-800 sticky top-0 bg-[#FCFAF5]/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs z-10">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 hover:bg-[#EAE6DC] dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
        </button>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{t('guide.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 pb-12 max-w-2xl mx-auto w-full">
        <div className="text-center mb-2">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-[#FCFAF5] dark:border-slate-800 shadow-sm">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1.5">{t('guide.shield')}</h3>
          <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-md mx-auto">{t('guide.shieldDesc')}</p>
        </div>

        <div className="space-y-3.5">
          <Rule 
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            title={t('guide.r1.t')}
            desc={t('guide.r1.d')}
          />
          <Rule 
            icon={<AlertOctagon className="w-5 h-5 text-rose-500" />}
            title={t('guide.r2.t')}
            desc={t('guide.r2.d')}
          />
          <Rule 
            icon={<UserCheck className="w-5 h-5 text-indigo-500" />}
            title={t('guide.r3.t')}
            desc={t('guide.r3.d')}
          />
        </div>

        {/* Direct Report Issue / User Card */}
        {onReport && (
          <div className="bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/60 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {language === 'HI' ? 'गलत पोस्ट या यूज़र की शिकायत करें' : 'Report Wrong Post or User to Admin'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                  {language === 'HI'
                    ? 'अगर आपको कोई फर्जी प्रोफाइल, गलत दुकान/विज्ञापन, या अनुचित पोस्ट दिखे, तो तुरंत एडमिन को रिपोर्ट करें।'
                    : 'If you see any fake profile, misleading shop/ad, or inappropriate post, report it directly to Admin for immediate action.'}
                </p>
              </div>
            </div>
            <button
              onClick={onReport}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>
                {language === 'HI' ? 'एडमिन को रिपोर्ट भेजें (Report to Admin)' : 'Report Issue to Admin'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Rule({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-[#FCFAF5] dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 p-4 sm:p-5 rounded-2xl shadow-xs">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-[#F4F1EA] dark:bg-slate-700 rounded-xl border border-[#EAE6DC] dark:border-slate-600 shrink-0">
          {icon}
        </div>
        <h4 className="text-slate-900 dark:text-white font-extrabold text-sm tracking-wide">{title}</h4>
      </div>
      <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed mt-1">{desc}</p>
    </div>
  );
}
