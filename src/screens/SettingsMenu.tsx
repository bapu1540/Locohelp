import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { ArrowLeft, Shield, Map, ChevronRight, LifeBuoy, User, Sun, Moon, Smartphone, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n';
import { getCurrentUser, saveUserProfile, getUserProfile } from '../auth';
import InstallAppModal from '../components/InstallAppModal';

export default function SettingsMenu({ onNavigate, onBack }: { onNavigate: (s: Screen) => void, onBack: () => void }) {
  const { language, t } = useLanguage();
  const [isDark, setIsDark] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [closureSubmitted, setClosureSubmitted] = useState(false);

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
            icon={<Smartphone className="w-5 h-5 text-orange-500" />} 
            title={t('home.installApp') || 'Install LocoHelp Mobile App'} 
            onClick={async () => {
              const promptEvent = (window as any).__deferredPwaPrompt;
              if (promptEvent && typeof promptEvent.prompt === 'function') {
                try {
                  promptEvent.prompt();
                  const choice = await promptEvent.userChoice;
                  if (choice && choice.outcome === 'accepted') {
                    (window as any).__deferredPwaPrompt = null;
                    return;
                  }
                } catch (e) {}
              }
              setIsInstallOpen(true);
            }} 
          />
          <div className="h-px bg-[#EAE6DC] dark:bg-slate-700 w-full ml-12"></div>
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

        {/* Account Close / Deletion Request Option (Exclusively in Settings) */}
        <div className="pt-4 border-t border-[#EAE6DC] dark:border-slate-700 space-y-3">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between p-4 bg-[#FCFAF5] dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 rounded-2xl active:scale-[0.98] transition-all hover:bg-rose-50 dark:hover:bg-rose-950/20 shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-rose-500" />
              <span className="text-rose-600 dark:text-rose-400 font-extrabold tracking-wide text-xs">
                {t('pro.closureBtn') || (language === 'GU' ? 'એકાઉન્ટ બંધ / ડીલીટ કરવાની વિનંતી' : language === 'HI' ? 'अकाउंट बंद / डिलीट करने का अनुरोध' : 'Request Account Closure / Deletion')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* Request Account Closure / Deactivation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center text-2xl shadow-inner">
              {isDeleting ? '⏳' : '🛡️'}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {t('prof.closureTitle') || 'Request Account Closure / Deactivation'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('prof.closureDesc') || 'Submitting this request sends your account details to the Admin Panel for verification before safe deactivation and data purging.'}
              </p>
            </div>

            {closureSubmitted ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                ✓ {t('prof.closureSuccess') || 'Account closure request submitted to Admin! Status: Pending Verification.'}
              </div>
            ) : (
              <div className="space-y-2 text-left">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Reason for Account Closure (Optional):
                </label>
                <textarea
                  rows={2}
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="e.g. No longer using app / Moving to another city..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none font-medium"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setClosureSubmitted(false);
                  setClosureReason('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                {closureSubmitted ? 'Close' : 'Cancel'}
              </button>
              {!closureSubmitted && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    try {
                      setIsDeleting(true);
                      const activeUser = getCurrentUser();
                      const existingProf = await getUserProfile(activeUser?.uid || '').catch(() => null);
                      const cleanPhone = (existingProf?.phone || activeUser?.phone || '').replace(/\D/g, '');
                      const userKey = activeUser?.uid || (cleanPhone ? `phone_${cleanPhone}` : 'guest');
                      const uName = existingProf?.full_name || activeUser?.displayName || 'User';
                      const uEmail = existingProf?.email || activeUser?.email || '';

                      await fetch('/api/reports', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          reason: 'ACCOUNT_CLOSURE_REQUEST',
                          description: `ACCOUNT CLOSURE REQUEST for user "${uName}" (Phone: ${cleanPhone}, Email: ${uEmail || 'N/A'}). User Reason: ${closureReason.trim() || 'User requested account closure/deactivation'}`,
                          targetId: userKey,
                          reporterId: userKey,
                          userName: uName,
                          userEmail: uEmail,
                          userPhone: cleanPhone,
                          status: 'deletion_requested',
                          createdAt: new Date().toISOString()
                        })
                      }).catch(() => {});

                      const updatedClosureProfile = {
                        ...(existingProf || {}),
                        uid: userKey,
                        full_name: uName,
                        email: uEmail,
                        phone: existingProf?.phone || cleanPhone,
                        status: 'deletion_requested',
                        isVerified: false,
                        updated_at: new Date().toISOString()
                      };

                      await saveUserProfile(updatedClosureProfile).catch(() => {});

                      setClosureSubmitted(true);
                      setIsDeleting(false);
                      setTimeout(() => {
                        setShowDeleteConfirm(false);
                        setClosureSubmitted(false);
                        setClosureReason('');
                      }, 2500);
                    } catch (err) {
                      setIsDeleting(false);
                      setShowDeleteConfirm(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-70"
                >
                  {isDeleting ? 'Submitting...' : (t('prof.closureSubmit') || 'Submit Closure Request')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <InstallAppModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />
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
