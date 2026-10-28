import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check 
} from 'lucide-react';
import { useLanguage } from '../i18n';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt : null));
  const [isInstalled, setIsInstalled] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [installNotice, setInstallNotice] = useState<string | null>(null);

  const appUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://www.locohelp.com';

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isInAppBrowser = /FBAN|FBAV|Instagram|WhatsApp|Line|Telegram|LinkedInApp|MicroMessenger|Snapchat|WV/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  useEffect(() => {
    const syncPrompt = () => {
      if ((window as any).__deferredPwaPrompt) {
        setDeferredPrompt((window as any).__deferredPwaPrompt);
      }
    };
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      setDeferredPrompt(e);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__deferredPwaPrompt = null;
    };

    syncPrompt();
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('locohelp-pwa-ready', syncPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('locohelp-pwa-installed', handleInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('locohelp-pwa-ready', syncPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('locohelp-pwa-installed', handleInstalled);
    };
  }, [isOpen]);

  const handleOpenInChrome = () => {
    const cleanHostAndPath = appUrl.replace(/^https?:\/\//i, '');
    const chromeIntentUrl = `intent://${cleanHostAndPath}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = chromeIntentUrl;
  };

  const handleInstallClick = async () => {
    setInstallNotice(null);
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt : null);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          (window as any).__deferredPwaPrompt = null;
          setDeferredPrompt(null);
        }
      } catch (err) {
        setInstallNotice(
          language === 'GU'
            ? "બ્રાઉઝરના ૩-ડૉટ્સ (⋮) મેનૂ પર ક્લિક કરો અને 'Install app' અથવા 'Add to Home screen' પસંદ કરો."
            : language === 'HI'
            ? "अपने ब्राउज़र के 3-डॉट्स (⋮) मेनू पर क्लिक करें और 'Install app' या 'Add to Home screen' चुनें।"
            : "Tap your browser's 3-dot (⋮) menu and select 'Install app' or 'Add to Home screen'."
        );
      }
    } else if (isInAppBrowser && isAndroid) {
      handleOpenInChrome();
    } else {
      setInstallNotice(
        language === 'GU'
          ? "Chrome બ્રાઉઝરમાં ઉપર જમણી બાજુ ૩-ડૉટ્સ (⋮) પર ટેપ કરો અને 'Install app' અથવા 'Add to Home screen' પસંદ કરો."
          : language === 'HI'
          ? "Chrome ब्राउज़र में ऊपर राइट साइड 3-डॉट्स (⋮) पर टैप करें और 'Install app' या 'Add to Home screen' चुनें।"
          : "Tap the 3-dot menu (⋮) in the top-right corner of Chrome and select 'Install app' or 'Add to Home screen'."
      );
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
        style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden relative z-50"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/30 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{language === 'GU' ? 'એપ ઇન્સ્ટોલ કરો (Install LocoHelp App)' : language === 'HI' ? 'ऐप इंस्टॉल करें (Install LocoHelp App)' : 'Install LocoHelp App'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'GU' ? '૨ સરળ સ્ટેપ્સમાં ફોનમાં ઇન્સ્ટોલ કરો' : language === 'HI' ? '2 आसान स्टेप्स में फोन में इंस्टॉल करें' : 'Fast & Easy 2-Step Phone Installation'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content - 2 Simple Steps */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* In-App Browser Warning Banner if applicable */}
            {isInAppBrowser && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-700 space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg shrink-0">🌐</span>
                  <div>
                    <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-xs">
                      {language === 'GU' ? 'Chrome બ્રાઉઝરમાં ખોલો' : language === 'HI' ? 'Chrome ब्राउज़र में खोलें' : 'Open in Chrome to Install'}
                    </h4>
                    <p className="text-[11px] text-amber-900 dark:text-amber-300 mt-0.5 leading-relaxed">
                      {language === 'GU'
                        ? 'સરળતાથી ઇન્સ્ટોલ કરવા માટે નીચે આપેલા બટનથી આ લિંકને Google Chrome માં ખોલો:'
                        : language === 'HI'
                        ? 'आसानी से इंस्टॉल करने के लिए इस लिंक को Google Chrome में खोलें:'
                        : 'To install smoothly, open this app in Google Chrome browser:'}
                    </p>
                  </div>
                </div>
                {isAndroid && (
                  <button
                    type="button"
                    onClick={handleOpenInChrome}
                    className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{language === 'GU' ? 'Chrome માં ખોલો (Open in Chrome)' : 'Open in Chrome to Install'}</span>
                  </button>
                )}
              </div>
            )}

            {/* 2 Simple Steps Section */}
            <div className="space-y-3">
              {/* STEP 1 */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {language === 'GU'
                      ? 'સ્ટેપ ૧: "Install App" બટન પર ટેપ કરો'
                      : language === 'HI'
                      ? 'स्टेप 1: "Install App" बटन पर टैप करें'
                      : 'Step 1: Tap the "Install App" button below'}
                  </h4>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-8">
                  {language === 'GU'
                    ? 'નીચે આપેલા "Install App" બટન પર સીધા ટેપ કરો (અથવા બ્રાઉઝરમાં ઉપર જમણી બાજુએ આપેલા ૩-ડૉટ્સ મેનૂ ⋮ પર ક્લિક કરો).'
                    : language === 'HI'
                    ? 'नीचे दिए गए "Install App" बटन पर टैप करें (या अपने Chrome के 3-डॉट्स मेनू ⋮ पर क्लिक करें)।'
                    : 'Tap the "Install App" button directly below (OR tap the 3-dots menu ⋮ in the top-right corner of Chrome).'}
                </p>
              </div>

              {/* STEP 2 */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {language === 'GU'
                      ? 'સ્ટેપ ૨: "Install App" અથવા "Add to Home Screen" સિલેક્ટ કરો'
                      : language === 'HI'
                      ? 'स्टेप 2: "Install App" या "Add to Home Screen" चुनें'
                      : 'Step 2: Select "Install App" or "Add to Home Screen"'}
                  </h4>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-8">
                  {language === 'GU'
                    ? '"Install App" અથવા "Add to Home Screen" વિકલ્પ પસંદ કરો. લોકોહેલ્પ એપ તમારા ફોન સ્ક્રીન પર ઇન્સ્ટોલ થઈ જશે!'
                    : language === 'HI'
                    ? '"Install App" या "Add to Home Screen" विकल्प चुनें। लोकोहेल्प ऐप आपके फोन स्क्रीन पर तुरंत इंस्टॉल हो जाएगी!'
                    : 'Select "Install App" or "Add to Home Screen" to install LocoHelp directly on your phone.'}
                </p>
              </div>
            </div>

            {/* Direct Prominent Install Action Button */}
            <button 
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer mt-2"
            >
              <Download className="w-4 h-4" />
              <span>
                {isInstalled
                  ? (language === 'GU' ? "એપ ઇન્સ્ટોલ થયેલ છે ✓" : language === 'HI' ? "ऐप पहले से इंस्टॉल है ✓" : "App Already Installed ✓")
                  : (language === 'GU' ? "અત્યારે જ ઇન્સ્ટોલ કરો (Install App Now)" : language === 'HI' ? "अभी इंस्टॉल करें (Install App Now)" : "Install App On Your Phone Now")}
              </span>
            </button>

            {installNotice && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-700 rounded-xl text-[11px] font-extrabold text-indigo-900 dark:text-indigo-200 text-center">
                📲 {installNotice}
              </div>
            )}

            {/* Quick Share / Copy App Link */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 truncate font-mono text-[10px]">
                {appUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {language === 'GU' ? 'બંધ કરો' : language === 'HI' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
