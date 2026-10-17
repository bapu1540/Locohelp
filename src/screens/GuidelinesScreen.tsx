import React from 'react';
import { ArrowLeft, ShieldCheck, AlertOctagon, UserX, Clock } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function GuidelinesScreen({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] dark:bg-slate-900 transition-colors">
      <div className="flex items-center px-4 py-4 pt-10 sm:pt-4 border-b border-[#DFDBCF] dark:border-slate-800 sticky top-0 bg-[#FCFAF5]/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs z-10">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 hover:bg-[#EAE6DC] dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
        </button>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{t('guide.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 pb-12">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#FCFAF5] dark:border-slate-800 shadow-sm">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('guide.shield')}</h3>
          <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-xs mx-auto">{t('guide.shieldDesc')}</p>
        </div>

        <div className="space-y-3.5">
          <Rule 
            icon={<AlertOctagon className="w-5 h-5 text-rose-500" />}
            title={t('guide.r1.t')}
            desc={t('guide.r1.d')}
          />
          <Rule 
            icon={<UserX className="w-5 h-5 text-amber-500" />}
            title={t('guide.r2.t')}
            desc={t('guide.r2.d')}
          />
          <Rule 
            icon={<Clock className="w-5 h-5 text-indigo-500" />}
            title={t('guide.r3.t')}
            desc={t('guide.r3.d')}
          />
        </div>
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
