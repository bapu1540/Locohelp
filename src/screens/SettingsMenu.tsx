import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { ArrowLeft, Shield, Map, LogOut, ChevronRight, LifeBuoy, User, ShieldAlert, Sun, Moon } from 'lucide-react';
import { useLanguage } from '../i18n';
import { logoutUser } from '../supabase';

export default function SettingsMenu({ onNavigate, onBack }: { onNavigate: (s: Screen) => void, onBack: () => void }) {
  const { t } = useLanguage();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      try { localStorage.setItem('locohelp_theme', 'dark'); } catch (e) {}
    } else {
      document.documentElement.classList.remove('dark');
      try { localStorage.setItem('locohelp_theme', 'light'); } catch (e) {}
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] dark:bg-slate-900 transition-colors">
      {/* Top Header - Back Button highlighted pink in dark mode */}
      <div className="flex items-center px-4 py-4 pt-10 sm:pt-4 border-b border-[#DFDBCF] dark:border-slate-800 bg-[#FCFAF5] dark:bg-slate-850 sticky top-0 z-10 shadow-sm">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 mr-2 hover:bg-[#EAE6DC] dark:hover:bg-slate-800 rounded-full transition-colors text-slate-700 dark:text-pink-400 dark:hover:text-pink-300 active:scale-95"
          title="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-pink-400 tracking-tight">{t('set.title') || 'Settings'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide pb-20">
        {/* User Card */}
        <div className="bg-[#FCFAF5] dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 p-4 rounded-2xl flex flex-col gap-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-0.5">{t('prof.role') || 'Role'}</p>
              <p className="text-slate-900 dark:text-white font-extrabold tracking-wide">{t('set.memberRole') || 'Community Member'}</p>
            </div>
            <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
              {t('set.trust') || 'Trust'}: 98%
            </div>
          </div>
          <div className="pt-2.5 border-t border-[#EAE6DC] dark:border-slate-700">
            <button 
              onClick={() => onNavigate('profile')}
              className="text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5 hover:text-indigo-700 cursor-pointer"
            >
              <User className="w-4 h-4" /> {t('set.manageProfile') || 'Manage Profile'}
            </button>
          </div>
        </div>

        {/* Theme (White & Dark Mode) Switcher */}
        <div className="bg-[#FCFAF5] dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-slate-700 flex items-center justify-center text-indigo-600 dark:text-amber-400 shrink-0">
              {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-slate-900 dark:text-white font-extrabold text-sm">
                {isDark ? t('set.themeDark') || 'Dark Theme (Night)' : t('set.themeLight') || 'Light Theme (Day)'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isDark ? t('set.themeDarkDesc') || 'Comfortable for low light' : t('set.themeLightDesc') || 'Crisp daytime view'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-13 h-7 rounded-full transition-colors relative p-1 flex items-center cursor-pointer ${
              isDark ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
            title="Switch Dark/White Theme"
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center text-[10px]">
              {isDark ? '🌙' : '☀️'}
            </div>
          </button>
        </div>

        {/* Links */}
        <div className="bg-[#FCFAF5] dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-sm">
          <SettingsItem 
            icon={<Shield className="w-5 h-5 text-emerald-500" />} 
            title={t('set.guide') || 'Community Guidelines'} 
            onClick={() => onNavigate('guidelines')} 
          />
          <div className="h-px bg-[#EAE6DC] dark:bg-slate-700 w-full ml-12"></div>
          <SettingsItem 
            icon={<Map className="w-5 h-5 text-purple-500" />} 
            title={t('set.road') || 'Project Roadmap'} 
            onClick={() => onNavigate('roadmap')} 
          />
          <div className="h-px bg-[#EAE6DC] dark:bg-slate-700 w-full ml-12"></div>
          <SettingsItem 
            icon={<LifeBuoy className="w-5 h-5 text-blue-500" />} 
            title={t('set.support') || 'Help & Support'} 
            onClick={() => onNavigate('support')} 
          />
        </div>

        <div className="pt-4 border-t border-[#EAE6DC] dark:border-slate-700 space-y-3">
          <button 
            onClick={() => {
              logoutUser().finally(() => {
                onBack();
                window.location.reload();
              });
            }}
            className="w-full flex items-center justify-between p-4 bg-[#FCFAF5] dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 rounded-2xl active:scale-[0.98] transition-all hover:bg-rose-50 dark:hover:bg-rose-950/20 shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-rose-500" />
              <span className="text-rose-600 dark:text-rose-400 font-bold tracking-wide text-xs">{t('set.logout') || 'Log Out'}</span>
            </div>
          </button>

          {/* Emergency Hard Reset */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
            <h4 className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-500 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Emergency Hard Reset
            </h4>
            <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium leading-tight mb-2">
              If your profile is stuck with old dummy data, use this button to completely wipe all local cache and start fresh.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="w-full py-2 bg-amber-600 text-white font-black text-[10px] rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              CLEAR ALL DATA & REFRESH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsItem({ icon, title, onClick }: { icon: React.ReactNode, title: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between p-3.5 hover:bg-[#F4F1EA] dark:hover:bg-slate-700/50 active:bg-[#EAE6DC] transition-colors w-full text-left cursor-pointer">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-slate-700 dark:text-slate-200 font-bold text-xs tracking-wide">{title}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </button>
  );
}
