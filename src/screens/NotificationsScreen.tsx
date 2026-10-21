import React from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { t, language } = useLanguage();

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] dark:bg-slate-900">
      <div className="flex items-center px-4 py-4 pt-10 sm:pt-4 border-b border-[#DFDBCF] dark:border-slate-800 sticky top-0 bg-[#FCFAF5] dark:bg-slate-850 shadow-sm z-10">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 hover:bg-[#EAE6DC] dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
        </button>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t('notif.title')}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
        <Bell className="w-10 h-10 text-slate-400 mb-2" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {language === 'EN' ? 'No new notifications right now.' : 'अभी कोई नया नोटिफिकेशन नहीं है।'}
        </p>
      </div>
    </div>
  );
}
