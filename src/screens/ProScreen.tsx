import React from 'react';
import { ArrowLeft, Zap, Shield, Globe, Star } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function ProScreen({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-white to-purple-50 pointer-events-none"></div>
      
      <div className="flex items-center px-4 py-4 pt-10 sm:pt-4 z-10 relative">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 bg-[#FCFAF5]/50 hover:bg-[#FCFAF5] rounded-full transition-colors backdrop-blur-md shadow-sm">
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8 z-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-200">
          <Star className="w-8 h-8 text-slate-900 fill-white" />
        </div>
        
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2 text-center tracking-tight">{t('pro.title')}</h2>
        <p className="text-slate-600 text-center text-sm font-semibold mb-10 max-w-[250px]">
          {t('pro.sub')}
        </p>

        <div className="w-full space-y-4 mb-10">
          <Feature icon={<Zap className="w-5 h-5 text-indigo-600" />} title={t('pro.f1.t')} desc={t('pro.f1.d')} />
          <Feature icon={<Globe className="w-5 h-5 text-purple-600" />} title={t('pro.f2.t')} desc={t('pro.f2.d')} />
          <Feature icon={<Shield className="w-5 h-5 text-emerald-600" />} title={t('pro.f3.t')} desc={t('pro.f3.d')} />
        </div>

        <div className="mt-auto w-full space-y-3">
          <button className="w-full bg-[#FCFAF5] text-slate-900 font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform shadow-xl shadow-slate-900/20 text-lg">
            {t('pro.btn')}
          </button>
          <p className="text-xs text-center text-slate-400 font-bold">{t('pro.footer')}</p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex items-center gap-4 bg-[#FCFAF5] border border-[#DFDBCF] p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="p-3 bg-[#F4F1EA] rounded-xl border border-[#EAE6DC]">
        {icon}
      </div>
      <div>
        <h3 className="text-slate-900 font-bold text-[15px] tracking-wide">{title}</h3>
        <p className="text-slate-400 font-medium text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
