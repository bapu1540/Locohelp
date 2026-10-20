import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, User, Mail, KeyRound, Loader2, Check } from 'lucide-react';
import { useLanguage } from '../i18n';
import { sendEmailOtp, verifyEmailOtp, signInWithPassword, signUpWithPassword, resetUserPassword, isValidEmail } from '../auth';

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
  actionTitleHi = 'LocoHelp में लॉगिन करें',
  actionDescEn,
  actionDescHi
}: LoginPromptModalProps) {
  const { language } = useLanguage();

  // Authentication mode: 'otp' | 'password'
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp');
  const [passwordSubMode, setPasswordSubMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [emailInput, setEmailInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'input' | 'verify'>('input');
  
  const [isLoadingOtp, setIsLoadingOtp] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

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
      const providerLabel = res.provider === 'Brevo API' ? ' (Sent via Brevo API support@locohelp.com)' : '';
      if (res.devCode) {
        setInfoMessage(language === 'EN' 
          ? `🔑 6-Digit OTP Code: ${res.devCode} (Instant Verification)` 
          : `🔑 6-अंकों का OTP कोड: ${res.devCode} (त्वरित सत्यापन)`
        );
      } else {
        setInfoMessage(language === 'EN' 
          ? `📧 6-digit OTP code sent to ${emailInput}${providerLabel}. Please check your Inbox!` 
          : `📧 ${emailInput} पर 6-अंकों का OTP भेज दिया गया है। अपना इनबॉक्स देखें!`
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

    if (passwordSubMode === 'signup') {
      const res = await signUpWithPassword(emailInput, passwordInput, nameInput);
      setIsLoadingPassword(false);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || (language === 'EN' ? 'Sign up failed' : 'रजिस्ट्रेशन विफल'));
      }
    } else if (passwordSubMode === 'reset') {
      const res = await resetUserPassword(emailInput, passwordInput, nameInput);
      setIsLoadingPassword(false);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || (language === 'EN' ? 'Failed to set password' : 'पासवर्ड सेट करने में विफल'));
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
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg flex items-center justify-center">
              <Mail className="w-7 h-7" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-900">
              ⚡ {language === 'EN' ? 'Email OTP & Password Login' : 'ईमेल OTP एवं पासवर्ड से लॉगिन'}
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2 leading-snug">
              {language === 'EN' ? actionTitleEn : actionTitleHi}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-1 px-1">
              {actionDescEn || (language === 'EN'
                ? 'Sign in to post requirements, manage profile & chat directly with local helpers.'
                : 'आवश्यकता पोस्ट करने, प्रोफाइल बनाने और हेल्पर्स से चैट करने के लिए लॉगिन करें।')}
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

          {/* AUTH OPTIONS CONTAINER */}
          <div className="w-full space-y-3 pt-1">
            {/* SUB-TABS: EMAIL OTP VS PASSWORD */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => { setAuthMode('otp'); setErrorMessage(null); setInfoMessage(null); }}
                className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer ${
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
                className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  authMode === 'password'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                🔑 {language === 'EN' ? 'Email & Password' : 'ईमेल एवं पासवर्ड'}
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
                      placeholder={language === 'EN' ? 'Enter email address for Brevo OTP' : 'OTP कोड के लिए अपना ईमेल दर्ज करें'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoadingOtp || !emailInput.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-xs py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/20"
                  >
                    {isLoadingOtp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>
                      {isLoadingOtp
                        ? (language === 'EN' ? 'Sending OTP Code...' : 'OTP कोड भेजा जा रहा है...')
                        : (language === 'EN' ? 'Send 6-Digit Brevo OTP Code' : '6-अंकों का OTP कोड भेजें')}
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
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/20"
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
                {passwordSubMode === 'reset' && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2 text-[11px] font-bold text-amber-800 dark:text-amber-200 text-left">
                    🔑 {language === 'EN'
                      ? 'Set or Reset Password for your Email / OTP Account:'
                      : 'अपने ईमेल / OTP अकाउंट के लिए नया पासवर्ड सेट या रीसेट करें:'}
                  </div>
                )}

                {passwordSubMode === 'signup' && (
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder={language === 'EN' ? 'Your Full Name' : 'आपका पूरा नाम'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                      required={passwordSubMode === 'signup'}
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={language === 'EN' ? 'Email address (e.g., baalvarta@gmail.com)' : 'ईमेल आईडी दर्ज करें'}
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
                    placeholder={
                      passwordSubMode === 'reset'
                        ? (language === 'EN' ? 'Enter New Password (min 6 chars)' : 'नया पासवर्ड डालें (कम से कम 6 अक्षर)')
                        : (language === 'EN' ? 'Password (min 6 characters)' : 'पासवर्ड (कम से कम 6 अक्षर)')
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingPassword || !emailInput.trim() || !passwordInput.trim()}
                  className={`w-full disabled:opacity-60 text-white font-black text-xs py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                    passwordSubMode === 'reset'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {isLoadingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {isLoadingPassword
                      ? (language === 'EN' ? 'Processing...' : 'प्रोसेस हो रहा है...')
                      : passwordSubMode === 'signup'
                        ? (language === 'EN' ? 'Create Account & Sign In' : 'अकाउंट बनाएं और लॉगिन करें')
                        : passwordSubMode === 'reset'
                          ? (language === 'EN' ? 'Save New Password & Sign In' : 'नया पासवर्ड सेव करें और लॉगिन करें')
                          : (language === 'EN' ? 'Sign In with Password' : 'पासवर्ड से लॉगिन करें')}
                  </span>
                </button>
                <div className="flex flex-col items-center gap-1.5 pt-1">
                  {passwordSubMode !== 'reset' ? (
                    <button
                      type="button"
                      onClick={() => { setPasswordSubMode('reset'); setErrorMessage(null); setInfoMessage(null); }}
                      className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      🔑 {language === 'EN' ? 'OTP User / Forgot Password? Set or Reset Password' : 'OTP यूज़र / पासवर्ड सेट या रीसेट करें'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setPasswordSubMode('login'); setErrorMessage(null); setInfoMessage(null); }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      &larr; {language === 'EN' ? 'Back to Password Login' : 'वापस पासवर्ड लॉगिन पर जाएं'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPasswordSubMode(passwordSubMode === 'signup' ? 'login' : 'signup');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {passwordSubMode === 'signup'
                      ? (language === 'EN' ? 'Already have an account? Sign In' : 'पहले से अकाउंट है? लॉगिन करें')
                      : (language === 'EN' ? "Don't have an account? Create One" : 'नया अकाउंट बनाएं')}
                  </button>
                </div>
              </form>
            )}

            {/* Guest Continue Button */}
            <button
              onClick={onClose}
              disabled={isLoadingOtp || isLoadingPassword}
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
