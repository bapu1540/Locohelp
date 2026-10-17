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
  Check, 
  Share2, 
  ShieldCheck, 
  Layers, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../i18n';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const { t, language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'apk' | 'ios'>('direct');

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-eagrh6qzdae4siv3w6tzmb-474897494416.asia-east1.run.app';

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // If browser already has it or doesn't support deferred prompt, give guidance
      alert(language === 'HI' 
        ? "Apne browser ke 3-dots (menu) par click karein aur 'Install App' ya 'Add to Home screen' chunein."
        : "Tap your browser's 3-dot menu and select 'Install app' or 'Add to Home screen'.");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Direct PWABuilder URL to package this web app into an official Android APK
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="bg-white dark:bg-slate-850 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Install LocoHelp App</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    APK / PWA
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Android & iPhone par ek click me chalayein
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1.5 gap-1">
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'direct' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              📱 1-Tap Install
            </button>
            <button
              onClick={() => setActiveTab('apk')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'apk' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              📦 Generate .APK
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'ios' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              🍎 iPhone (iOS)
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* TAB 1: 1-Tap Direct Install (WebAPK) */}
            {activeTab === 'direct' && (
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-indigo-950 dark:text-indigo-200 text-xs mb-1">
                      Direct Phone Installation (No Play Store Needed)
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      Ye app WebAPK standard par bani hai. Install karne par ye seedhe aapke Android phone me normal APK ki tarah app drawer aur home screen me add ho jati hai.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Real app icon aur full-screen experience (No address bar)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Halka aur fast (Sirf 1-2 MB storage)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Automatic updates (Baar-baar naya APK download nahi karna padega)</span>
                  </div>
                </div>

                <button 
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {isInstalled ? "App Already Installed ✓" : "Install App On This Phone Now"}
                </button>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                  💡 <strong>Chrome Tip:</strong> Agar button se prompt na aaye, toh browser ke right side me <strong>3 dots (⋮)</strong> par click karke <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> chunein.
                </div>
              </div>
            )}

            {/* TAB 2: Generate Official .APK File */}
            {activeTab === 'apk' && (
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-xs mb-1">
                      Android .APK Download Karne ke Tareeqe
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      Google Cloud Run ka firewall automated bot tools (jaise PWABuilder servers) ko security reasons se block kar deta hai ("403 Web Host Blocking"). Isliye niche diye 2 aasan tareeqe use karein:
                    </p>
                  </div>
                </div>

                {/* Method 1: Chrome WebAPK Direct (No server needed) */}
                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">1</span>
                    <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-xs">Sabse Aasan: Chrome Se Direct Install (Real App)</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Aapko kisi website ki zaroorat nahi hai. Apne phone me Chrome ke <strong>3-dots (⋮)</strong> dabakar <strong>"Install app"</strong> karein. Android khud iska official <strong>WebAPK</strong> generate karke phone ke app drawer me daal deta hai!
                  </p>
                </div>

                {/* Method 2: Extract APK to send on WhatsApp */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-black text-[10px] flex items-center justify-center">2</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">Dosto ko WhatsApp bhejne ke liye APK Extract karein</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Ek baar jab aap Chrome se app install kar lein, toh Play Store se koi bhi free <strong>"APK Extractor"</strong> ya <strong>"App Share"</strong> app kholein, <strong>LOCOHELP</strong> select karein aur 1-second me <strong>.apk file</strong> WhatsApp par dosto ko bhej dein!
                  </p>
                </div>

                {/* Method 3: WebIntoApp Alternative */}
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Option 3: Online APK Converter</p>
                  <p className="text-slate-500">
                    Aap <a href="https://www.webintoapp.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-bold">WebIntoApp.com</a> par ja kar app ka URL paste karke bhi direct ready-made APK bana sakte hain.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: iOS iPhone Guide */}
            {activeTab === 'ios' && (
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs mb-1">
                      iPhone & iPad par Install Kaise Karein
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      Apple iOS me direct APK nahi hota, par ye 2 simple clicks me native app ban jati hai:
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-slate-700 dark:text-slate-300">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
                    <span>Safari browser me niche <strong>Share button (📤)</strong> par tap karein.</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
                    <span>Menu ko scroll karke <strong>"Add to Home Screen" (+)</strong> chunein.</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">3</span>
                    <span>Upar <strong>"Add"</strong> dabayein — LocoHelp iPhone home screen par install ho jayegi!</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Share Link */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 truncate font-mono text-[10px]">
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
          <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
