import React from 'react';
import { Mail } from 'lucide-react';
import { useLanguage } from '../i18n';
import LocoHelpLogo from './LocoHelpLogo';

export default function FeedbackBanner() {
  const { t } = useLanguage();

  const renderWithBrand = (text: string) =>
    text.split('LocoHelp').map((part, i, arr) => (
      <React.Fragment key={i}>
        {part}
        {i < arr.length - 1 && (
          <>
            <span className="text-[#0066FF] font-extrabold">Loco</span>
            <span className="text-[#FF8800] font-extrabold">Help</span>
          </>
        )}
      </React.Fragment>
    ));

  return (
    <div className="w-full px-3 py-2.5 bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-xl mt-2">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center justify-center p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs shrink-0">
            <LocoHelpLogo size={24} showText={false} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
              {renderWithBrand(t('feed.greeting'))}{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {renderWithBrand(t('feed.suggestion'))}
              </span>{' '}
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                {t('feed.thanks')}
              </span>
            </p>
          </div>
        </div>

        <a
          href="mailto:support@locohelp.com"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold text-[11px] hover:opacity-95 active:scale-95 transition-all shadow-xs shrink-0"
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span>{t('feed.contact')}</span>
        </a>
      </div>
    </div>
  );
}
