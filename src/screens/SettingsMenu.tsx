import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import {
  ArrowLeft,
  Shield,
  Map,
  ChevronRight,
  LifeBuoy,
  User,
  Sun,
  Moon,
  Smartphone,
  Trash2,
  Info,
  Sparkles,
  Mail,
  Scale,
  X,
  CheckCircle2,
  Radio,
  Wrench,
  Store,
  Megaphone,
  Briefcase,
  Lock,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { getCurrentUser, saveUserProfile, getUserProfile } from '../auth';
import InstallAppModal from '../components/InstallAppModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

export default function SettingsMenu({ onNavigate, onBack }: { onNavigate: (s: Screen) => void, onBack: () => void }) {
  const { language, t } = useLanguage();
  const [isDark, setIsDark] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [closureSubmitted, setClosureSubmitted] = useState(false);
  const [profileDisplay, setProfileDisplay] = useState<{
    name: string;
    email: string;
    avatar: string;
    isLoggedIn: boolean;
  }>({
    name: '',
    email: '',
    avatar: '',
    isLoggedIn: false
  });

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const handleOpenPrivacy = () => setIsPrivacyOpen(true);
    window.addEventListener('locohelp_open_privacy_policy', handleOpenPrivacy);

    const hash = window.location.hash.toLowerCase();
    if (hash === '#privacy') setIsPrivacyOpen(true);
    if (hash === '#delete-account') setShowDeleteConfirm(true);
    if (hash === '#about') setIsAboutOpen(true);
    if (hash === '#features') setIsFeaturesOpen(true);
    if (hash === '#contact') setIsContactOpen(true);

    const activeUser = getCurrentUser();
    const cleanPhone = (activeUser?.phone || '').replace(/\D/g, '');
    const userKey = activeUser?.uid || (cleanPhone ? `phone_${cleanPhone}` : 'guest');
    let savedName = activeUser?.displayName && activeUser.displayName !== 'Guest' ? activeUser.displayName : '';
    let savedEmail = activeUser?.email || '';
    let savedAvatar = activeUser?.photoURL || '';

    try {
      const scopedRaw = localStorage.getItem(`locohelp_user_profile_${userKey}`);
      if (scopedRaw) {
        const parsed = JSON.parse(scopedRaw);
        if (parsed.full_name || parsed.name) savedName = parsed.full_name || parsed.name;
        if (parsed.email) savedEmail = parsed.email;
        if (parsed.profilePhoto || parsed.avatar_url) savedAvatar = parsed.profilePhoto || parsed.avatar_url;
      }
      if (!savedName) savedName = localStorage.getItem('locohelp_profile_name') || '';
      if (!savedEmail) savedEmail = localStorage.getItem('locohelp_last_logged_in_email') || '';
      if (!savedAvatar) savedAvatar = localStorage.getItem('locohelp_profile_photo') || '';
    } catch {}

    if (savedAvatar === 'https://lh3.googleusercontent.com/a/default-user') {
      savedAvatar = '';
    }

    const isLogged = Boolean((activeUser && activeUser.uid && activeUser.uid !== 'guest') || savedEmail);
    setProfileDisplay({
      name: savedName || (savedEmail ? savedEmail.split('@')[0] : language === 'HI' ? 'लोकोहेल्प यूज़र' : 'LocoHelp User'),
      email: savedEmail,
      avatar: savedAvatar,
      isLoggedIn: isLogged
    });

    if (userKey && userKey !== 'guest') {
      getUserProfile(userKey)
        .then((prof) => {
          if (prof) {
            const dbAvatar =
              prof.avatar_url && prof.avatar_url !== 'https://lh3.googleusercontent.com/a/default-user'
                ? prof.avatar_url
                : savedAvatar;
            setProfileDisplay({
              name: prof.full_name || prof.name || savedName || 'LocoHelp User',
              email: prof.email || savedEmail,
              avatar: dbAvatar || '',
              isLoggedIn: true
            });
          }
        })
        .catch(() => {});
    }

    return () => window.removeEventListener('locohelp_open_privacy_policy', handleOpenPrivacy);
  }, [language]);

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
        {/* Real User Account Card */}
        <div className="bg-[#FCFAF5] dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 p-4 rounded-2xl flex flex-col gap-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-slate-700 border-2 border-indigo-500/70 flex items-center justify-center overflow-hidden shrink-0">
                {profileDisplay.avatar ? (
                  <img src={profileDisplay.avatar} alt={profileDisplay.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-slate-900 dark:text-white font-extrabold text-sm truncate">
                  {profileDisplay.name}
                </p>
                {profileDisplay.email ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                    {profileDisplay.email}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'HI' ? 'लोकोहेल्प प्रोफाइल' : language === 'GU' ? 'લોકોહેલ્પ પ્રોફાઇલ' : 'LocoHelp Profile'}
                  </p>
                )}
              </div>
            </div>
            {profileDisplay.isLoggedIn && (
              <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 shrink-0">
                {language === 'HI' ? '✓ सत्यापित खाता' : language === 'GU' ? '✓ પ્રમાણિત ખાતું' : '✓ Active Account'}
              </div>
            )}
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

          {/* 1. About Us */}
          <SettingsItem 
            icon={<Info className="w-5 h-5 text-teal-600" />} 
            title={language === 'GU' ? 'અમારા વિશે (About Us)' : language === 'HI' ? 'हमारे बारे में (About Us)' : 'About Us'} 
            onClick={() => setIsAboutOpen(true)} 
          />
          <div className="h-px bg-[#EAE6DC] dark:bg-slate-700 w-full ml-12"></div>

          {/* 2. Features */}
          <SettingsItem 
            icon={<Sparkles className="w-5 h-5 text-amber-500" />} 
            title={language === 'GU' ? 'અમારી સુવિધાઓ (Features)' : language === 'HI' ? 'हमारी सुविधाएँ (Features)' : 'Features'} 
            onClick={() => setIsFeaturesOpen(true)} 
          />
          <div className="h-px bg-[#EAE6DC] dark:bg-slate-700 w-full ml-12"></div>

          {/* 3. Terms of Service & Safety Rules */}
          <SettingsItem 
            icon={<Scale className="w-5 h-5 text-emerald-500" />} 
            title={language === 'GU' ? 'સેવાની શરતો અને સુરક્ષા નિયમો (Terms of Service)' : language === 'HI' ? 'सेवा की शर्तें व सुरक्षा नियम (Terms of Service)' : 'Terms of Service & Safety Rules'} 
            onClick={() => onNavigate('guidelines')} 
          />
          <div className="h-px bg-[#EAE6DC] dark:bg-slate-700 w-full ml-12"></div>

          {/* 4. Privacy Policy */}
          <SettingsItem 
            icon={<Shield className="w-5 h-5 text-indigo-500" />} 
            title={language === 'GU' ? 'ગોપનીયતા નીતિ (Privacy Policy)' : language === 'HI' ? 'गोपनीयता नीति (Privacy Policy)' : 'Privacy Policy'} 
            onClick={() => setIsPrivacyOpen(true)} 
          />
          <div className="h-px bg-[#EAE6DC] dark:bg-slate-700 w-full ml-12"></div>

          {/* 5. Support & FAQ */}
          <SettingsItem 
            icon={<LifeBuoy className="w-5 h-5 text-blue-500" />} 
            title={language === 'GU' ? 'સહાયતા અને સવાલ-જવાબ (Support & FAQ)' : language === 'HI' ? 'सहायता और सवाल-जवाब (Support & FAQ)' : 'Support & FAQ'} 
            onClick={() => onNavigate('support')} 
          />
          <div className="h-px bg-[#EAE6DC] dark:bg-slate-700 w-full ml-12"></div>

          {/* 6. Contact Us */}
          <SettingsItem 
            icon={<Mail className="w-5 h-5 text-pink-600" />} 
            title={language === 'GU' ? 'સંપર્ક કરો (Contact Us)' : language === 'HI' ? 'संपर्क करें (Contact Us)' : 'Contact Us'} 
            onClick={() => setIsContactOpen(true)} 
          />
          <div className="h-px bg-[#EAE6DC] dark:bg-slate-700 w-full ml-12"></div>

          {/* Project Roadmap */}
          <SettingsItem 
            icon={<Map className="w-5 h-5 text-purple-500" />} 
            title={t('set.road') || 'Project Roadmap'} 
            onClick={() => onNavigate('roadmap')} 
          />
        </div>

        {/* 7. Account Close / Deletion Request Option (Exclusively in Settings) */}
        <div className="pt-4 border-t border-[#EAE6DC] dark:border-slate-700 space-y-3">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between p-4 bg-[#FCFAF5] dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 rounded-2xl active:scale-[0.98] transition-all hover:bg-rose-50 dark:hover:bg-rose-950/20 shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-rose-500" />
              <span className="text-rose-600 dark:text-rose-400 font-extrabold tracking-wide text-xs">
                {language === 'GU' ? 'એકાઉન્ટ બંધ / ડિલીટ કરો (Delete Account)' : language === 'HI' ? 'अकाउंट बंद / डिलीट करें (Delete Account)' : 'Delete Account / Request Closure'}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ABOUT US MODAL                                            */}
      {/* ========================================================= */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-600/10 via-indigo-600/10 to-emerald-600/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {language === 'GU' ? 'અમારા વિશે (About LocoHelp)' : language === 'HI' ? 'हमारे बारे में (About LocoHelp)' : 'About LocoHelp'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'GU' ? 'ભારતનું હાયપર-લોકલ કમ્યુનિટી અને રોજગાર નેટવર્ક' : language === 'HI' ? 'भारत का अपना हाइपर-लोकल कम्युनिटी और रोज़गार नेटवर्क' : "India's Hyper-Local Community & Employment Network"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/70 space-y-1.5">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {language === 'GU' ? '🌟 અમારો હેતુ (Our Mission)' : language === 'HI' ? '🌟 हमारा उद्देश्य (Our Mission)' : '🌟 Our Mission'}
                </h4>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs leading-relaxed">
                  {language === 'GU'
                    ? 'લોકોહેલ્પ (LocoHelp) નો હેતુ ભારતના દરેક શહેર, નગર અને વિસ્તારના લોકોને એકબીજાની તાત્કાલિક મદદ, સ્થાનિક કારીગરો, વેપારીઓ અને રોજગાર સાથે સીધા જોડવાનો છે — કોઈપણ વચેટિયા કે કમિશન વિના.'
                    : language === 'HI'
                    ? 'लोकोहेल्प (LocoHelp) का उद्देश्य भारत के हर शहर, कस्बे और मोहल्ले के नागरिकों, कुशल कारीगरों, स्थानीय दुकानदारों और रोज़गार खोजने वाले युवाओं को बिना किसी बिचौलिए या कमीशन के सीधे एक-दूसरे से जोड़ना है।'
                    : 'LocoHelp is built to empower every Indian city, town, and neighborhood by directly connecting citizens, skilled service workers, local shopkeepers, and job seekers—with zero middlemen and 0% commission.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU' ? '💡 લોકોહેલ્પ શા માટે ખાસ છે?' : language === 'HI' ? '💡 लोकोहेल्प क्यों खास है?' : '💡 Why LocoHelp Stands Out'}
                </h4>
                <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {language === 'GU'
                        ? '100% નિઃશુલ્ક માધ્યમ: અમે કારીગરો, દુકાનદારો કે નાગરિકો પાસેથી કોઈ કમિશન લેતા નથી.'
                        : language === 'HI'
                        ? '100% निःशुल्क माध्यम: हम कारीगरों, दुकानदारों या नागरिकों से किसी भी काम का कमीशन नहीं लेते।'
                        : '100% Free Connector: We charge zero commission from workers, shops, or citizens.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {language === 'GU'
                        ? 'સંપૂર્ણ પ્રાઈવસી અને સુરક્ષા: મોબાઈલ નંબર જાહેરમાં દેખાતો નથી; સુરક્ષિત ઇન-એપ ચેટ દ્વારા સીધો સંપર્ક થાય છે.'
                        : language === 'HI'
                        ? 'पूर्ण गोपनीयता और सुरक्षा: किसी का भी मोबाइल नंबर सार्वजनिक नहीं दिखता; सुरक्षित इन-ऐप चैट के माध्यम से सीधा संवाद होता है।'
                        : 'Privacy-First Architecture: Phone numbers remain hidden by default; connect safely via real-time in-app chat.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {language === 'GU'
                        ? 'સ્થાનિક ભાષામાં સરળ અનુભવ: હિન્દી, ગુજરાતી અને અંગ્રેજી ભાષામાં દરેક નાગરિક માટે સરળ ઉપયોગ.'
                        : language === 'HI'
                        ? 'अपनी भाषा में सरल अनुभव: हिंदी, गुजराती और अंग्रेजी में हर नागरिक के लिए बेहद आसान इंटरफेस।'
                        : 'Built for Local India: Seamless experience in Hindi, Gujarati, and English.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold">LocoHelp © 2026 • Made for Local India</span>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                {language === 'GU' ? 'બંધ કરો' : language === 'HI' ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FEATURES MODAL                                            */}
      {/* ========================================================= */}
      {isFeaturesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-indigo-600/10 to-purple-600/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {language === 'GU' ? 'લોકોહેલ્પની મુખ્ય સુવિધાઓ (Features)' : language === 'HI' ? 'लोकोहेल्प की मुख्य सुविधाएँ (Features)' : 'LocoHelp Core Features'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'GU' ? 'એક જ પ્લેટફોર્મ પર ૬ પાવરફુલ લોકલ સુવિધાઓ' : language === 'HI' ? 'एक ही प्लेटफॉर्म पर 6 शक्तिशाली लोकल सुविधाएँ' : '6 Powerful Hyper-Local Modules in One App'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFeaturesOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 shrink-0">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {language === 'GU' ? '૧. ૧-કલાકનું લાઈવ બ્રોડકાસ્ટ (1-Hour Live Broadcast)' : language === 'HI' ? '1. 1-घंटे का लाइव ब्रॉडकास्ट (1-Hour Live Broadcast)' : '1. 1-Hour Live Broadcast'}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {language === 'GU'
                      ? 'કોઈપણ તાત્કાલિક જરૂરિયાત કે મદદ માટે ૧ કલાકની લાઈવ પોસ્ટ મૂકો અને આસપાસના લોકો પાસેથી તરત જ રિસ્પોન્સ મેળવો.'
                      : language === 'HI'
                      ? 'किसी भी तत्काल आवश्यकता या मदद के लिए 1-घंटे की लाइव पोस्ट डालें और अपने क्षेत्र के लोगों से तुरंत चैट पर जवाब पाएं।'
                      : 'Post urgent local needs that stay live for 1 hour and get instant responses from nearby community members.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {language === 'GU' ? '૨. વેરિફાઈડ સર્વિસ એક્સપર્ટ્સ (Service Experts)' : language === 'HI' ? '2. वेरिफाइड सर्विस एक्सपर्ट्स (Service Experts)' : '2. Verified Service Experts'}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {language === 'GU'
                      ? 'ઈલેક્ટ્રિશિયન, પ્લમ્બર, પેઈન્ટર, મિકેનિક, ટ્યુટર અને ૫૦+ કેટેગરીના સ્થાનિક કારીગરો શોધો અથવા પોતાની પ્રોફાઇલ રજિસ્ટર કરો.'
                      : language === 'HI'
                      ? 'इलेक्ट्रीशियन, प्लंबर, पेंटर, मैकेनिक, ट्यूटर सहित 50+ श्रेणियों के स्थानीय कारीगर खोजें या स्वयं को निःशुल्क पंजीकृत करें।'
                      : 'Find electricians, plumbers, mechanics, tutors, and 50+ skilled local professionals—or register your own skill for free.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {language === 'GU' ? '૩. બિઝનેસ અને શોપ ડિરેક્ટરી (Shop Directory)' : language === 'HI' ? '3. बिजनेस और शॉप डायरेक्टरी (Shop Directory)' : '3. Business & Shop Directory'}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {language === 'GU'
                      ? 'તમારા શહેરની દુકાનો, શોરૂમ અને સેવાઓ ફોટા અને વિગતો સાથે જુઓ અથવા તમારી દુકાન ઓનલાઇન લિસ્ટ કરો.'
                      : language === 'HI'
                      ? 'अपने शहर की दुकानों, शोरूम और व्यापार को फोटो व समय के साथ देखें या अपनी दुकान को ऑनलाइन सूचीबद्ध करें।'
                      : 'Discover verified local shops and businesses with photos and timings, or list your own shop to reach local customers.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {language === 'GU' ? '૪. લોકલ જાહેરાત બેનર (Local Ads & Offers)' : language === 'HI' ? '4. लोकल विज्ञापन और ऑफर्स (Local Ads & Offers)' : '4. Local Advertisement & Offers'}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {language === 'GU'
                      ? 'તમારા વિસ્તારની ખાસ ઓફર્સ, સેલ અને નવી દુકાનોની જાહેરાત હોમ-સ્ક્રીન બેનર પર જુઓ અને પ્રમોટ કરો.'
                      : language === 'HI'
                      ? 'अपने इलाके के विशेष ऑफर्स, सेल और नए व्यापार के विज्ञापन होम-स्क्रीन बैनर पर देखें और प्रचारित करें।'
                      : 'Promote local offers, sales, and business announcements right on your city’s home feed.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {language === 'GU' ? '૫. લોકલ જોબ પોર્ટલ (Local Job Portal)' : language === 'HI' ? '5. लोकल जॉब पोर्टल (Local Job Portal)' : '5. Local Job Portal'}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {language === 'GU'
                      ? 'દુકાન, ઓફિસ કે ફેક્ટરી માટે સ્ટાફ શોધો અથવા તમારા શહેરમાં પાર્ટ-ટાઇમ/ફુલ-ટાઇમ નોકરી માટે સીધી વાત કરો.'
                      : language === 'HI'
                      ? 'अपनी दुकान, ऑफिस या फैक्ट्री के लिए स्टाफ खोजें या अपने ही शहर में पार्ट-टाइम/फुल-टाइम नौकरी के लिए सीधे संपर्क करें।'
                      : 'Hire local staff for shops, offices, or factories, or apply directly to jobs in your city via chat.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {language === 'GU' ? '૬. સુરક્ષિત ચેટ અને નંબર પ્રાઈવસી (Safe Chat & Privacy)' : language === 'HI' ? '6. सुरक्षित चैट और नंबर गोपनीयता (Safe Chat & Privacy)' : '6. Safe In-App Chat & Number Privacy'}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {language === 'GU'
                      ? 'મોબાઈલ નંબર જાહેર કર્યા વિના ફોટો, લાઈવ મેપ લોકેશન અને મેસેજ શેર કરો, સાથે જ યુઝર Block અને Report સુરક્ષા.'
                      : language === 'HI'
                      ? 'बिना मोबाइल नंबर सार्वजनिक किए फोटो, मैप लोकेशन और संदेश साझा करें, साथ ही तत्काल यूज़र Block और Report सुरक्षा।'
                      : 'Chat with photo and map location sharing without exposing your phone number, backed by instant User Block & Report controls.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold">LocoHelp © 2026 • Made for Local India</span>
              <button
                onClick={() => setIsFeaturesOpen(false)}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                {language === 'GU' ? 'બંધ કરો' : language === 'HI' ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONTACT US MODAL                                          */}
      {/* ========================================================= */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-pink-600/10 via-indigo-600/10 to-blue-600/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {language === 'GU' ? 'સંપર્ક કરો (Contact Us)' : language === 'HI' ? 'संपर्क करें (Contact Us)' : 'Contact Us'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'GU' ? 'ઓફિશિયલ ઈમેલ અને ઈન્સ્ટાગ્રામ સપોર્ટ' : language === 'HI' ? 'आधिकारिक ईमेल और इंस्टाग्राम सहायता' : 'Official Email & Instagram Support'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsContactOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px] sm:text-xs">
                {language === 'GU'
                  ? 'કોઈપણ સહાયતા, સૂચન, બિઝનેસ પૂછપરછ અથવા ફરિયાદ માટે તમે અમને સીધા ઈમેલ અથવા ઓફિશિયલ ઈન્સ્ટાગ્રામ પેજ પર સંપર્ક કરી શકો છો:'
                  : language === 'HI'
                  ? 'किसी भी सहायता, सुझाव, व्यावसायिक पूछताछ या शिकायत के लिए आप हमसे सीधे आधिकारिक ईमेल या इंस्टाग्राम पेज पर संपर्क कर सकते हैं:'
                  : 'For any support, feedback, business inquiry, or grievance, reach out to us directly via our official Email or Instagram page:'}
              </p>

              {/* Email Card */}
              <a
                href="mailto:support@locohelp.com"
                className="w-full p-3.5 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-slate-800 dark:hover:bg-slate-750 border border-indigo-200 dark:border-slate-700 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Official Email</p>
                    <p className="text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-300 truncate">support@locohelp.com</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-indigo-500 shrink-0" />
              </a>

              {/* Official Instagram Card */}
              <a
                href="https://www.instagram.com/locohelpofficial?igsh=MWd2c282b2N6N250aA=="
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3.5 rounded-2xl bg-pink-50/80 hover:bg-pink-100/80 dark:bg-slate-800 dark:hover:bg-slate-750 border border-pink-200 dark:border-slate-700 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <radialGradient id="settingsIgGrad" cx="30%" cy="107%" r="150%">
                          <stop offset="0%" stopColor="#fdf497" />
                          <stop offset="5%" stopColor="#fdf497" />
                          <stop offset="45%" stopColor="#fd5949" />
                          <stop offset="60%" stopColor="#d6249f" />
                          <stop offset="90%" stopColor="#285AEB" />
                        </radialGradient>
                      </defs>
                      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#settingsIgGrad)" />
                      <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4" stroke="#fff" strokeWidth="1.6" fill="none" />
                      <circle cx="12" cy="12" r="3.6" stroke="#fff" strokeWidth="1.6" fill="none" />
                      <circle cx="16.3" cy="7.7" r="1.1" fill="#fff" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Official Instagram</p>
                    <p className="text-xs sm:text-sm font-black text-pink-700 dark:text-pink-300 truncate">@locohelpofficial</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-pink-500 shrink-0" />
              </a>

              <button
                onClick={() => {
                  setIsContactOpen(false);
                  onNavigate('support');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                {language === 'GU' ? 'સંપૂર્ણ સહાયતા કેન્દ્ર અને FAQs ખોલો →' : language === 'HI' ? 'संपूर्ण सहायता केंद्र और सवाल-जवाब (FAQs) खोलें →' : 'Open Full Support Center & FAQs →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Account Closure / Deactivation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center text-2xl shadow-inner">
              {isDeleting ? '⏳' : '🛡️'}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {language === 'GU' ? 'એકાઉન્ટ અને ડેટા ડિલીટ કરવાની વિનંતી' : language === 'HI' ? 'अकाउंट बंद / डेटा डिलीट करने का अनुरोध' : 'Request Account & Data Deletion'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {language === 'GU'
                  ? 'આ વિનંતી સબમિટ કરવાથી તમારું એકાઉન્ટ, પ્રોફાઇલ અને પોસ્ટ્સ ચકાસણી બાદ કાયમી ધોરણે હટાવી દેવામાં આવશે (સિવાય કે કોઈ સક્રિય કાનૂની કે સુરક્ષા તપાસ હેઠળ સક્ષમ કાયદાકીય અને નિયમનકારી સત્તાવાળાઓ માટે રેકોર્ડ રાખવો અનિવાર્ય હોય).'
                  : language === 'HI'
                  ? 'यह अनुरोध सबमिट करने पर सत्यापन के पश्चात आपका अकाउंट, प्रोफ़ाइल और पोस्ट स्थायी रूप से हटा दिए जाएंगे (सिवाय उन मामलों के जहाँ किसी सक्रिय सुरक्षा शिकायत या कानूनी जांच के तहत सक्षम कानूनी एवं नियामक प्राधिकरणों के अनुपालन हेतु रिकॉर्ड रखना अनिवार्य हो)।'
                  : 'Submitting this request permanently deletes your profile, listings, and personal data after verification, except where specific records must be retained for active safety investigations or compliance with competent legal and regulatory authorities.'}
              </p>
            </div>

            {closureSubmitted ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                ✓ {t('prof.closureSuccess') || 'Account deletion request submitted to Admin! Status: Pending Verification.'}
              </div>
            ) : (
              <div className="space-y-2 text-left">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {language === 'GU' ? 'એકાઉન્ટ બંધ કરવાનું કારણ (વૈકલ્પિક):' : language === 'HI' ? 'अकाउंट बंद करने का कारण (वैकल्पिक):' : 'Reason for Account Deletion (Optional):'}
                </label>
                <textarea
                  rows={2}
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder={language === 'HI' ? 'जैसे: अब ऐप का उपयोग नहीं कर रहा हूँ...' : 'e.g. No longer using app / Moving to another city...'}
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
                {closureSubmitted ? (language === 'HI' ? 'बंद करें' : 'Close') : (language === 'HI' ? 'रद्द करें' : 'Cancel')}
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
                  {isDeleting ? 'Submitting...' : (language === 'GU' ? 'ડિલીટ વિનંતી મોકલો' : language === 'HI' ? 'डिलीट अनुरोध भेजें' : 'Submit Deletion Request')}
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

      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
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
