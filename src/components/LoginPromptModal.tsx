import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, User, Mail, KeyRound, Loader2, Check } from 'lucide-react';
import { useLanguage } from '../i18n';
import { signInWithGoogle, sendEmailOtp, verifyEmailOtp, signInWithPassword, signUpWithPassword, isValidEmail } from '../auth';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLogin?: () => void;
  onSuccess?: () => void;
  actionTitleEn?: string;
  actionTitleHi?: string;
  actionDescEn?: string;
  actionDescHi?: string;
}

export default function LoginPromptModal({
  isOpen,
  onClose,
  onGoToLogin,
  onSuccess,
  actionTitleEn = 'Sign In to LocoHelp',
  actionTitleHi = 'LocoHelp में लॉगिन / साइन-इन करें',
  actionDescEn,
  actionDescHi
}: LoginPromptModalProps) {
  const { language } = useLanguage();
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  // Authentication mode: 'otp' | 'password'
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp');
  const [isSignUp, setIsSignUp] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [emailInput, setEmailInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'input' | 'verify'>('input');
  
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingOtp, setIsLoadingOtp] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async (customEmail?: string) => {
    setIsLoadingGoogle(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const selectedEmail = customEmail || (googleEmailInput.trim() ? googleEmailInput.trim() : undefined);
      if (selectedEmail && !isValidEmail(selectedEmail)) {
        setIsLoadingGoogle(false);
        setErrorMessage(language === 'EN' ? 'Please enter a valid Google email address' : 'कृपया सही गूगल ईमेल आईडी दर्ज करें');
        return;
      }

      await signInWithGoogle(selectedEmail);
      setIsLoadingGoogle(false);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setIsLoadingGoogle(false);
      if (!customEmail && !googleEmailInput.trim()) {
        setShowCustomGoogleInput(true);
        setErrorMessage(language === 'EN' 
          ? 'Select or enter your Google Email address below to sign in:' 
          : 'गूगल से साइन-इन करने के लिए अपना ईमेल दर्ज करें:');
      } else {
        setErrorMessage(err?.message || (language === 'EN' ? 'Could not complete Google Sign-in' : 'गूगल लॉगिन पूरा नहीं हो सका'));
      }
    }
  };

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !isValidEmail(emailInput)) {
      setErrorMessage(language === 'EN' ? 'Please enter a valid email address' : 'कृपया सही ईमेल आईडी दर्ज करें');
      return;
    }

    setIsLoadingOtp(true);
    setErrorMessage(null);
    setInfoMessage(null);

    const res = await sendEmailOtp(emailInput);
    setIsLoadingOtp(false);

    if (res.success) {
      setOtpStep('verify');
      const providerLabel = res.provider === 'Brevo API' ? ' (Sent via Brevo API)' : '';
      if (res.devCode) {
        setInfoMessage(language === 'EN' 
          ? `🔑 6-Digit OTP Code: ${res.devCode} (Instant Verification)` 
          : `🔑 6-अंकों का OTP कोड: ${res.devCode} (त्वरित सत्यापन)`
        );
      } else {
        setInfoMessage(language === 'EN' 
          ? `📧 6-digit OTP code sent to ${emailInput}${providerLabel}. Please check your Inbox and Spam folder!` 
          : `📧 ${emailInput} पर 6-अंकों का OTP भेज दिया गया है। अपना इनबॉक्स व स्पैम फोल्डर देखें!`
        );
      }
    } else {
      setErrorMessage(res.error || (language === 'EN' ? 'Failed to send 6-digit OTP' : 'OTP भेजने में विफल'));
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMessage(language === 'EN' ? 'Please enter the 6-digit OTP code' : 'कृपया 6-अंकों का OTP कोड दर्ज करें');
      return;
    }

    setIsLoadingOtp(true);
    setErrorMessage(null);
    setInfoMessage(null);

    const res = await verifyEmailOtp(emailInput, otpCode);
    setIsLoadingOtp(false);

    if (res.success) {
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } else {
      setErrorMessage(res.error || (language === 'EN' ? 'Invalid 6-digit OTP code' : 'गलत OTP कोड'));
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !isValidEmail(emailInput)) {
      setErrorMessage(language === 'EN' ? 'Please enter a valid email address' : 'कृपया सही ईमेल आईडी दर्ज करें');
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      setErrorMessage(language === 'EN' ? 'Password must be at least 6 characters' : 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए');
      return;
    }

    setIsLoadingPassword(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (isSignUp) {
      const res = await signUpWithPassword(emailInput, passwordInput, nameInput);
      setIsLoadingPassword(false);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || (language === 'EN' ? 'Sign up failed' : 'रजिस्ट्रेशन विफल'));
      }
    } else {
      const res = await signInWithPassword(emailInput, passwordInput);
      setIsLoadingPassword(false);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || (language === 'EN' ? 'Login failed' : 'लॉगिन विफल'));
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative z-50 p-6 flex flex-col items-center text-center space-y-4"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Brand Badge */}
          <div className="relative mt-1">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-slate-700 shadow-md flex items-center justify-center">
              <svg className="w-9 h-9" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-900">
              ⚡ {language === 'EN' ? 'Google & 6-Digit OTP Login' : 'गूगल एवं 6-अंकों का OTP लॉगिन'}
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2 leading-snug">
              {language === 'EN' ? actionTitleEn : actionTitleHi}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-1 px-1">
              {actionDescEn || (language === 'EN'
                ? 'Sign in to post broadcasts, create profiles, and connect directly with neighbors.'
                : 'ब्रॉडकास्ट पोस्ट करने, प्रोफाइल बनाने और पड़ोसियों से जुड़ने के लिए साइन-इन करें।')}
            </p>
          </div>

          {/* Error / Info Notifications */}
          {errorMessage && (
            <div className="w-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs p-2.5 rounded-xl font-bold">
              {errorMessage}
            </div>
          )}
          {infoMessage && (
            <div className="w-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 text-center">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* OPTION 1: GOOGLE SIGN-IN BUTTON & ACCOUNT SELECTOR */}
          <div className="w-full space-y-2.5 pt-1">
            {!showCustomGoogleInput ? (
              <div className="space-y-1.5">
                <button
                  onClick={() => handleGoogleSignIn()}
                  disabled={isLoadingGoogle || isLoadingOtp}
                  className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white font-black text-sm py-3 px-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-60"
                >
                  {isLoadingGoogle ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                  )}
                  <span>
                    {isLoadingGoogle
                      ? (language === 'EN' ? 'Connecting Google...' : 'गूगल से कनेक्ट हो रहा है...')
                      : (language === 'EN' ? 'Continue with Google' : 'गूगल से साइन-इन करें')}
                  </span>
                </button>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(true)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {language === 'EN' ? 'Choose Google Account / Email' : 'गूगल अकाउंट / ईमेल चुनें'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleGoogleSignIn(googleEmailInput); }} className="space-y-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-900">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 px-1">
                  <span>{language === 'EN' ? 'Select Google Account Email' : 'गूगल अकाउंट ईमेल चुनें'}</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="e.g. your.email@gmail.com"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoadingGoogle || !googleEmailInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isLoadingGoogle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{language === 'EN' ? 'Sign In as Selected Google Account' : 'चुने गए गूगल अकाउंट से साइन-इन करें'}</span>
                </button>
              </form>
            )}

            {/* DIVIDER */}
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                {language === 'EN' ? 'OR DIRECT AUTHENTICATION' : 'या डायरेक्ट ऑथेंटिकेशन'}
              </span>
            </div>

            {/* SUB-TABS: EMAIL OTP VS PASSWORD */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => { setAuthMode('otp'); setErrorMessage(null); setInfoMessage(null); }}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  authMode === 'otp'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                ⚡ {language === 'EN' ? 'Email OTP' : 'ईमेल OTP'}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('password'); setErrorMessage(null); setInfoMessage(null); }}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  authMode === 'password'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                🔑 {language === 'EN' ? 'Password' : 'पासवर्ड'}
              </button>
            </div>

            {/* TAB 1: EMAIL OTP */}
            {authMode === 'otp' ? (
              otpStep === 'input' ? (
                <form onSubmit={handleSendEmailOtp} className="space-y-2">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder={language === 'EN' ? 'Enter email for Brevo OTP' : 'OTP के लिए ईमेल दर्ज करें'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoadingOtp || !emailInput.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-xs py-2.5 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/20"
                  >
                    {isLoadingOtp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>
                      {isLoadingOtp
                        ? (language === 'EN' ? 'Sending OTP Code...' : 'OTP कोड भेजा जा रहा है...')
                        : (language === 'EN' ? 'Send 6-Digit OTP Code' : '6-अंकों का OTP कोड भेजें')}
                    </span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1">
                    <span className="truncate">Email: {emailInput}</span>
                    <button
                      type="button"
                      onClick={() => { setOtpStep('input'); setErrorMessage(null); setInfoMessage(null); }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0 ml-1"
                    >
                      {language === 'EN' ? 'Change' : 'बदलें'}
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={language === 'EN' ? 'Enter 6-Digit OTP Code' : '6-अंकों का OTP कोड डालें'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-black tracking-widest text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-center"
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoadingOtp || otpCode.trim().length < 4}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs py-2.5 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/20"
                  >
                    {isLoadingOtp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      {isLoadingOtp
                        ? (language === 'EN' ? 'Verifying OTP...' : 'सत्यापित हो रहा है...')
                        : (language === 'EN' ? 'Verify OTP & Sign In' : 'OTP डालकर लॉगिन करें')}
                    </span>
                  </button>
                </form>
              )
            ) : (
              /* TAB 2: EMAIL & PASSWORD */
              <form onSubmit={handlePasswordAuth} className="space-y-2">
                {isSignUp && (
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder={language === 'EN' ? 'Your Full Name' : 'आपका पूरा नाम'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                      required={isSignUp}
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={language === 'EN' ? 'Email address' : 'ईमेल आईडी'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={language === 'EN' ? 'Password (min 6 characters)' : 'पासवर्ड (कम से कम 6 अक्षर)'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingPassword || !emailInput.trim() || !passwordInput.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-xs py-2.5 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/20"
                >
                  {isLoadingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {isLoadingPassword
                      ? (language === 'EN' ? 'Authenticating...' : 'लॉगिन हो रहा है...')
                      : isSignUp
                        ? (language === 'EN' ? 'Create Account & Sign In' : 'अकाउंट बनाएं और लॉगिन करें')
                        : (language === 'EN' ? 'Sign In with Password' : 'पासवर्ड से लॉगिन करें')}
                  </span>
                </button>
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setErrorMessage(null); }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {isSignUp 
                      ? (language === 'EN' ? 'Already have an account? Sign In' : 'पहले से अकाउंट है? लॉगिन करें')
                      : (language === 'EN' ? "Don't have an account? Create One" : 'नया अकाउंट बनाएं')}
                  </button>
                </div>
              </form>
            )}

            {/* Guest Continue Button */}
            <button
              onClick={onClose}
              disabled={isLoadingGoogle || isLoadingOtp}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-xs py-2 px-4 rounded-2xl transition-colors cursor-pointer mt-1"
            >
              {language === 'EN' ? 'Continue Browsing as Guest' : 'अभी सिर्फ देखें (गेस्ट जारी रखें)'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
