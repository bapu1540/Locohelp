import React from 'react';
import { Mail, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n';
import LocoHelpLogo from './LocoHelpLogo';

export default function FeedbackBanner() {
  const { t, language } = useLanguage();

  return (
    <div className="w-full px-4 py-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 mt-6">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center justify-center p-2.5 bg-white dark:bg-slate-800 rounded-2xl mb-2 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <LocoHelpLogo size={36} showText={false} />
        </div>
        
        <div className="space-y-3">
          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
            {t('feed.greeting').split('LocoHelp').map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                  <><span className="text-[#0066FF]">Loco</span><span className="text-[#FF8800]">Help</span></>
                )}
              </React.Fragment>
            ))}
          </p>
          
          <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-relaxed">
            {t('feed.suggestion').split('LocoHelp').map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                  <><span className="text-[#0066FF]">Loco</span><span className="text-[#FF8800]">Help</span></>
                )}
              </React.Fragment>
            ))}
          </p>
          
          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
            {t('feed.thanks')}
          </p>
        </div>

        <div className="pt-4 flex flex-col items-center gap-3">
          <a 
            href={`mailto:${t('feed.contact').replace('संपर्क: ', '').replace('Contact: ', '')}`} 
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <Mail className="w-4 h-4" />
            {t('feed.contact')}
          </a>
          
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-2">
            <Sparkles className="w-3 h-3" />
            <span>{language === 'EN' ? 'Building for the community' : 'समुदाय के लिए निर्माण'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
