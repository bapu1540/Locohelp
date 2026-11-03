import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  checkPhoneInPostgres,
  smartPhoneAuth,
  sendMobileOtp,
  verifyMobileOtp,
  signInWithPassword,
  sendEmailOtp,
  verifyEmailOtp,
  resetUserPassword,
  isBiometricSupported,
  getSavedBiometricInfo,
  signInWithBiometricPasskey,
  registerBiometricPasskey
} from '../auth';
import { useLanguage } from '../i18n';

export interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLogin?: () => void;
  onSuccess?: () => void;
  actionName?: string;
  actionTitleEn?: string;
  actionTitleHi?: string;
  actionTitleGu?: string;
  actionDescEn?: string;
  actionDescHi?: string;
  actionDescGu?: string;
}

export default function LoginPromptModal({
  isOpen,
  onClose,
  onSuccess,
  actionName,
  actionTitleEn,
  actionTitleHi,
  actionTitleGu
}: LoginPromptModalProps) {
  const { language, setLanguage, tr } = useLanguage();

  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [name, setName] = useState('');
  const [pinOrPassword, setPinOrPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // PostgreSQL lookup state
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [checkedUser, setCheckedUser] = useState<{
    checked: boolean;
    exists: boolean;
    name?: string;
    email?: string;
    phone?: string;
    hasPassword?: boolean;
    hasBiometric?: boolean;
    credentialId?: string;
    isApproved?: boolean;
    approvalStatus?: string;
  }>({ checked: false, exists: false });

  // Mode: 'pin' (default clean PIN/Password login/register) or 'otp' (1-time OTP verification / forgot PIN)
  const [authMethod, setAuthMethod] = useState<'pin' | 'otp'>('pin');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Biometric passkey state
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [hasLocalPasskey, setHasLocalPasskey] = useState(false);
  const [showBiometricSetupPrompt, setShowBiometricSetupPrompt] = useState(false);

  const finishSuccess = () => {
    try {
      onSuccess?.();
    } catch {}
    onClose();
  };

  // Pre-fill last remembered phone/email if available
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setOtpSent(false);
    setOtpCode('');
    setDevOtpHint('');
    setShowBiometricSetupPrompt(false);

    const savedPhone = localStorage.getItem('locohelp_last_logged_in_phone') || '';
    const savedName = localStorage.getItem('locohelp_last_logged_in_name') || '';
    if (savedPhone && !phoneOrEmail) {
      setPhoneOrEmail(savedPhone);
    }
    if (savedName && !name) {
      setName(savedName);
    }

    isBiometricSupported().then((avail) => {
      setBiometricSupported(avail);
      setHasLocalPasskey(Boolean(getSavedBiometricInfo()));
    });
  }, [isOpen]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Smart PostgreSQL Recognition as soon as user enters 10-digit phone number (or valid email)
  useEffect(() => {
    const raw = phoneOrEmail.trim();
    const digits = raw.replace(/\D/g, '');
    const isTenDigitPhone =
      !raw.includes('@') &&
      ((digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) ||
        (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))));
    const isEmail = raw.includes('@') && raw.includes('.');

    if (!isTenDigitPhone && !isEmail) {
      setCheckedUser({ checked: false, exists: false });
      return;
    }

    let cancelled = false;
    setIsCheckingUser(true);
    const timer = setTimeout(async () => {
      const info = await checkPhoneInPostgres(raw);
      if (cancelled) return;
      setIsCheckingUser(false);
      setCheckedUser({
        checked: true,
        exists: info.exists,
        name: info.name,
        email: info.email,
        phone: info.phone,
        hasPassword: info.hasPassword,
        hasBiometric: info.hasBiometric,
        credentialId: info.credentialId,
        isApproved: info.isApproved,
        approvalStatus: info.approvalStatus
      });
      if (info.exists && info.name) {
        setName(info.name);
      }
      if (info.credentialId) {
        setHasLocalPasskey(true);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phoneOrEmail]);

  if (!isOpen) return null;

  const rawInput = phoneOrEmail.trim();
  const cleanDigits = rawInput.replace(/\D/g, '').slice(-10);
  const isEmailInput = rawInput.includes('@');
  const isValidPhone = !isEmailInput && /^[6-9]\d{9}$/.test(cleanDigits);
  const isValidEmail = isEmailInput && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawInput);

  const displayActionBanner =
    actionName ||
    (language === 'GU'
      ? actionTitleGu || actionTitleEn
      : language === 'HI'
      ? actionTitleHi || actionTitleEn
      : actionTitleEn);

  // Direct 1-Tap Biometric / Fingerprint Login
  const handleBiometricLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await signInWithBiometricPasskey();
      if (!res.success) {
        setErrorMsg(
          res.error ||
            tr(
              'Biometric login failed. Please enter your PIN / Password below.',
              'फिंगरप्रिंट लॉगिन नहीं हो सका। कृपया नीचे अपना PIN / पासवर्ड डालें।',
              'ફિંગરપ્રિન્ટ લોગિન નિષ્ફળ. કૃપા કરી નીચે તમારો PIN / પાસવર્ડ નાખો.'
            )
        );
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg(
        tr(
          'Welcome back! Logged in permanently.',
          'स्वागत है! आप सफलतापूर्वक लॉगिन हो गए हैं।',
          'ફરી સ્વાગત છે! તમે સફળતાપૂર્વક લોગિન થઈ ગયા છો.'
        )
      );
      setTimeout(() => {
        setIsSubmitting(false);
        finishSuccess();
      }, 450);
    } catch {
      setIsSubmitting(false);
    }
  };

  // Main Submit for PIN / Password Login or New User Registration
  const handlePinOrPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isValidPhone && !isValidEmail) {
      setErrorMsg(
        tr(
          'Please enter a valid 10-digit Mobile Number.',
          'कृपया सही 10-अंकों का मोबाइल नंबर दर्ज करें।',
          'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર લખો.'
        )
      );
      return;
    }

    if (!checkedUser.exists && !name.trim()) {
      setErrorMsg(
        tr(
          'Please enter your Full Name.',
          'कृपया अपना पूरा नाम लिखें।',
          'કૃપા કરીને તમારું પૂરું નામ લખો.'
        )
      );
      return;
    }

    if (!pinOrPassword || pinOrPassword.trim().length < 4) {
      setErrorMsg(
        tr(
          'Please enter a 4-digit PIN or Password (min 4 characters).',
          'कृपया 4-अंकों का PIN या पासवर्ड डालें (कम से कम 4 अक्षर)।',
          'કૃપા કરીને 4-અંકનો PIN અથવા પાસવર્ડ નાખો (ઓછામાં ઓછા 4 અક્ષર).'
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await smartPhoneAuth({
        phone: isEmailInput ? rawInput : cleanDigits,
        password: pinOrPassword.trim(),
        name: name.trim() || checkedUser.name || undefined
      });

      if (!res.success) {
        if (isEmailInput) {
          const emailRes = await signInWithPassword(rawInput, pinOrPassword.trim());
          if (emailRes.success) {
            setSuccessMsg(
              tr('Logged in successfully!', 'सफलतापूर्वक लॉगिन हो गया!', 'સફળતાપૂર્વક લોગિન થઈ ગયું!')
            );
            setTimeout(() => {
              setIsSubmitting(false);
              finishSuccess();
            }, 450);
            return;
          }
        }
        setErrorMsg(
          res.error ||
            tr(
              'Incorrect PIN / Password. Try again or use OTP below.',
              'गलत PIN / पासवर्ड! पुनः प्रयास करें या नीचे OTP चुनें।',
              'ખોટો PIN / પાસવર્ડ! ફરી પ્રયાસ કરો અથવા નીચે OTP વાપરો.'
            )
        );
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);

      // Offer 1-tap Biometric setup if device supports it and not yet enabled
      if (biometricSupported && !hasLocalPasskey && !checkedUser.hasBiometric) {
        setShowBiometricSetupPrompt(true);
        return;
      }

      setSuccessMsg(
        checkedUser.exists
          ? tr(
              'Welcome back! You are logged in.',
              'वापसी पर स्वागत है! आप लॉगिन हो गए हैं।',
              'ફરી સ્વાગત છે! તમે લોગિન થઈ ગયા છો.'
            )
          : tr(
              'Account created! Sent for Admin Approval.',
              'अकाउंट बन गया! एडमिन अप्रूवल के लिए भेजा गया है।',
              'એકાઉન્ટ બની ગયું! એડમિન અપ્રૂવલ માટે મોકલાયું છે.'
            )
      );
      setTimeout(() => {
        finishSuccess();
      }, 550);
    } catch {
      setIsSubmitting(false);
      setErrorMsg(
        tr(
          'Connection error. Please try again.',
          'कनेक्शन त्रुटि। कृपया पुनः प्रयास करें।',
          'કનેક્શન ભૂલ. કૃપા કરીને ફરી પ્રયાસ કરો.'
        )
      );
    }
  };

  // Send 1-time OTP (for new user verification or forgot PIN)
  const handleSendOtp = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isValidPhone && !isValidEmail) {
      setErrorMsg(
        tr(
          'Please enter your 10-digit Mobile Number first.',
          'कृपया पहले अपना 10-अंकों का मोबाइल नंबर दर्ज करें।',
          'કૃપા કરીને પહેલા તમારો 10-અંકનો મોબાઇલ નંબર લખો.'
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEmailInput) {
        const res = await sendEmailOtp(rawInput);
        setIsSubmitting(false);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to send OTP');
          return;
        }
        setOtpSent(true);
        setCooldown(res.cooldownRemaining || 60);
        if (res.devCode) {
          setDevOtpHint(res.devCode);
          setOtpCode(res.devCode);
        }
      } else {
        const res = await sendMobileOtp(cleanDigits, 'recaptcha-container');
        setIsSubmitting(false);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to send OTP');
          return;
        }
        setOtpSent(true);
        setCooldown(res.cooldownRemaining || 60);
        if (res.devCode) {
          setDevOtpHint(res.devCode);
          setOtpCode(res.devCode);
        }
      }
      setSuccessMsg(
        tr(
          '6-digit OTP sent! Enter it below.',
          '6-अंकों का OTP भेजा गया! नीचे दर्ज करें।',
          '6-અંકનો OTP મોકલવામાં આવ્યો છે! નીચે દાખલ કરો.'
        )
      );
    } catch {
      setIsSubmitting(false);
      setErrorMsg(tr('Failed to send OTP.', 'OTP भेजने में त्रुटि।', 'OTP મોકલવામાં ભૂલ.'));
    }
  };

  // Verify OTP + Save New PIN/Password
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = otpCode.replace(/\D/g, '').trim();
    if (cleanCode.length < 6) {
      setErrorMsg(
        tr(
          'Please enter the 6-digit OTP code.',
          'कृपया 6-अंकों का OTP कोड दर्ज करें।',
          'કૃપા કરીને 6-અંકનો OTP કોડ નાખો.'
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const pwdToSave = pinOrPassword.trim().length >= 4 ? pinOrPassword.trim() : undefined;
      const finalName = name.trim() || checkedUser.name || undefined;

      if (isEmailInput) {
        if (pwdToSave && pwdToSave.length >= 6) {
          const r = await resetUserPassword(rawInput, pwdToSave, finalName, cleanCode);
          if (!r.success) {
            setErrorMsg(r.error || 'Invalid OTP');
            setIsSubmitting(false);
            return;
          }
        } else {
          const r = await verifyEmailOtp(rawInput, cleanCode, pwdToSave);
          if (!r.success) {
            setErrorMsg(r.error || 'Invalid OTP');
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        const r = await verifyMobileOtp(cleanDigits, cleanCode, pwdToSave, finalName);
        if (!r.success) {
          setErrorMsg(r.error || 'Invalid OTP');
          setIsSubmitting(false);
          return;
        }
      }

      setIsSubmitting(false);
      setSuccessMsg(
        tr(
          'Verified & Logged In Permanently!',
          'वेरिफाई और लॉगिन सफल!',
          'વેરિફાઈ અને કાયમી લોગિન સફળ!'
        )
      );
      setTimeout(() => {
        finishSuccess();
      }, 500);
    } catch {
      setIsSubmitting(false);
      setErrorMsg(tr('Verification failed.', 'वेरिफिकेशन विफल।', 'વેરિફિકેશન નિષ્ફળ.'));
    }
  };

  const handleEnableBiometricNow = async () => {
    setIsSubmitting(true);
    await registerBiometricPasskey();
    setIsSubmitting(false);
    setShowBiometricSetupPrompt(false);
    finishSuccess();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Clean Solid Header */}
        <div className="bg-teal-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/25">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {checkedUser.checked && checkedUser.exists
                  ? tr('Welcome Back!', 'वापसी पर स्वागत है!', 'ફરી સ્વાગત છે!')
                  : tr('LocoHelp Login / Join', 'लॉगिन / नया अकाउंट', 'લોગિન / નવું એકાઉન્ટ')}
              </h2>
              <p className="text-[11px] text-teal-100 font-semibold">
                {tr(
                  'Login once • Stay logged in permanently',
                  'एक बार लॉगिन करें • हमेशा लॉगिन रहें',
                  'એકવાર લોગિન કરો • કાયમ લોગિન રહો'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Compact Language Switcher */}
            <div className="flex items-center bg-teal-900/60 rounded-xl p-0.5 border border-white/15 text-[10px] font-extrabold">
              <button
                type="button"
                onClick={() => setLanguage('GU')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  language === 'GU' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100'
                }`}
              >
                ગુજ
              </button>
              <button
                type="button"
                onClick={() => setLanguage('HI')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  language === 'HI' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('EN')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  language === 'EN' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100'
                }`}
              >
                ENG
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Optional Biometric Enable Prompt after First Login */}
        {showBiometricSetupPrompt ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
              <Fingerprint size={36} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {tr(
                'Enable 1-Tap Fingerprint Login?',
                'फिंगरप्रिंट लॉगिन चालू करें?',
                '1-ક્લિક ફિંગરપ્રિન્ટ લોગિન ચાલુ કરવું છે?'
              )}
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {tr(
                'Next time you can log in with your fingerprint or face lock without typing any PIN or OTP.',
                'अगली बार बिना PIN या OTP डाले सिर्फ फिंगरप्रिंट से तुरंत लॉगिन करें।',
                'આગલી વખતે કોઈ PIN કે OTP વગર સીધા ફિંગરપ્રિન્ટથી લોગિન કરી શકશો.'
              )}
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowBiometricSetupPrompt(false);
                  finishSuccess();
                }}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                {tr('Skip for Now', 'अभी छोड़ें', 'અત્યારે રહેવા દો')}
              </button>
              <button
                type="button"
                onClick={handleEnableBiometricNow}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <Fingerprint size={16} />
                {tr('Enable Fingerprint', 'फिंगरप्रिंट चालू करें', 'ફિંગરપ્રિન્ટ ચાલુ કરો')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {displayActionBanner && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs font-bold text-amber-900 flex items-center gap-2">
                <Sparkles size={15} className="text-amber-600 shrink-0" />
                <span>{displayActionBanner}</span>
              </div>
            )}

            {/* 1-Tap Biometric Passkey Button for Returning Users */}
            {biometricSupported && (hasLocalPasskey || checkedUser.hasBiometric) && (
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md border-b-4 border-slate-950 active:translate-y-0.5 transition-all"
              >
                <Fingerprint size={20} className="text-teal-400" />
                <span>
                  {tr(
                    '1-Tap Fingerprint / Face Login',
                    'फिंगरप्रिंट / फेस लॉक से तुरंत लॉगिन करें',
                    'ફિંગરપ્રિન્ટ / ફેસ લોકથી તરત લોગિન કરો'
                  )}
                </span>
              </button>
            )}

            {/* Error / Success Banner */}
            {errorMsg && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-rose-800 text-xs font-bold">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2.5 text-emerald-800 text-xs font-bold">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Step 1: Mobile Number Input (Auto-checks PostgreSQL) */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                {tr(
                  '1. Mobile Number (10 Digits)',
                  '1. मोबाइल नंबर (10 अंक)',
                  '1. મોબાઇલ નંબર (10 અંક)'
                )}
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center gap-1 text-slate-500 font-bold text-xs pointer-events-none">
                  <Phone size={15} className="text-teal-600" />
                  {!isEmailInput && <span>+91</span>}
                </div>
                <input
                  type="text"
                  inputMode="tel"
                  value={phoneOrEmail}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val.includes('@') && /^\d+$/.test(val.replace(/\s+/g, ''))) {
                      setPhoneOrEmail(val.replace(/\D/g, '').slice(0, 10));
                    } else {
                      setPhoneOrEmail(val);
                    }
                    setErrorMsg(null);
                  }}
                  placeholder={tr(
                    'Enter 10-digit mobile number',
                    'अपना 10 अंकों का मोबाइल नंबर लिखें',
                    'તમારો 10 અંકનો મોબાઇલ નંબર લખો'
                  )}
                  className={`w-full ${
                    isEmailInput ? 'pl-10' : 'pl-16'
                  } pr-10 py-3 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-black text-slate-900 tracking-wide`}
                  autoFocus
                />
                {isCheckingUser && (
                  <Loader2 size={16} className="absolute right-3.5 text-teal-600 animate-spin" />
                )}
              </div>

              {/* Smart Recognition Status Badge */}
              {checkedUser.checked && (
                <div className="mt-2">
                  {checkedUser.exists ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-extrabold">
                      <CheckCircle2 size={13} className="text-teal-600 shrink-0" />
                      <span>
                        {tr(
                          `Welcome back, ${checkedUser.name || 'Member'}! Enter your PIN/Password below.`,
                          `स्वागत है, ${checkedUser.name || 'सदस्य'}! नीचे अपना PIN/पासवर्ड डालें।`,
                          `ફરી સ્વાગત છે, ${checkedUser.name || 'સભ્ય'}! નીચે તમારો PIN/પાસવર્ડ નાખો.`
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-extrabold">
                      <Sparkles size={13} className="text-blue-600 shrink-0" />
                      <span>
                        {tr(
                          'New Number! Enter your Name & set a 4-digit PIN below.',
                          'नया नंबर! नीचे अपना नाम और 4-अंकों का PIN सेट करें।',
                          'નવો નંબર! નીચે તમારું નામ અને 4-અંકનો PIN સેટ કરો.'
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mode Switch Tabs: Direct PIN/Password vs 1-Time OTP */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('pin');
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                  authMethod === 'pin'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock size={13} />
                <span>{tr('PIN / Password', 'PIN / पासवर्ड', 'PIN / પાસવર્ડ')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('otp');
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                  authMethod === 'otp'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound size={13} />
                <span>{tr('1-Time OTP', '1-बार OTP कोड', '1-વાર OTP કોડ')}</span>
              </button>
            </div>

            {authMethod === 'pin' ? (
              <form onSubmit={handlePinOrPasswordSubmit} className="space-y-3.5">
                {/* Show Name field only for New Users (or if name wasn't saved yet) */}
                {(!checkedUser.exists || !checkedUser.name) && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      {tr('Your Full Name', 'आपका पूरा नाम', 'તમારું પૂરું નામ')}
                    </label>
                    <div className="relative flex items-center">
                      <UserIcon size={15} className="absolute left-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={tr(
                          'Enter your full name',
                          'अपना पूरा नाम लिखें',
                          'તમારું પૂરું નામ લખો'
                        )}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-bold text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {/* 4-Digit PIN or Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-700">
                      {checkedUser.exists && checkedUser.hasPassword
                        ? tr(
                            '2. Enter Your PIN / Password',
                            '2. अपना PIN / पासवर्ड डालें',
                            '2. તમારો PIN / પાસવર્ડ નાખો'
                          )
                        : tr(
                            '2. Set a 4-Digit PIN or Password',
                            '2. अपना 4-अंकों का PIN या पासवर्ड बनाएं',
                            '2. 4-અંકનો PIN અથવા પાસવર્ડ બનાવો'
                          )}
                    </label>
                    {checkedUser.exists && (
                      <button
                        type="button"
                        onClick={() => setAuthMethod('otp')}
                        className="text-[11px] font-extrabold text-teal-700 hover:underline"
                      >
                        {tr('Forgot PIN? Use OTP', 'PIN भूल गए? OTP चुनें', 'PIN ભૂલી ગયા? OTP વાપરો')}
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Lock size={15} className="absolute left-3.5 text-teal-600" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={pinOrPassword}
                      onChange={(e) => setPinOrPassword(e.target.value)}
                      placeholder={tr(
                        'Enter 4-digit PIN or Password',
                        '4-अंकों का PIN या पासवर्ड लिखें',
                        '4-અંકનો PIN અથવા પાસવર્ડ લખો'
                      )}
                      className="w-full pl-10 pr-10 py-3 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-black text-slate-900 tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:translate-y-0.5 border-b-4 border-teal-800 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                  <span>
                    {checkedUser.exists
                      ? tr('Login Now', 'अभी लॉगिन करें', 'અત્યારે જ લોગિન કરો')
                      : tr(
                          'Create Account & Login',
                          'अकाउंट बनाएं और लॉगिन करें',
                          'એકાઉન્ટ બનાવો અને લોગિન કરો'
                        )}
                  </span>
                </button>
              </form>
            ) : (
              /* 1-Time OTP Flow */
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                {!checkedUser.exists && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      {tr('Your Full Name', 'आपका पूरा नाम', 'તમારું પૂરું નામ')}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={tr(
                        'Enter your full name',
                        'अपना पूरा नाम लिखें',
                        'તમારું પૂરું નામ લખો'
                      )}
                      className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-bold text-slate-900"
                    />
                  </div>
                )}

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSubmitting || cooldown > 0}
                    className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 border-b-4 border-teal-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                    <span>
                      {cooldown > 0
                        ? tr(`Wait ${cooldown}s`, `${cooldown}s प्रतीक्षा करें`, `${cooldown} સેકન્ડ રાહ જુઓ`)
                        : tr('Get 6-Digit OTP', '6-अंकों का OTP प्राप्त करें', '6-અંકનો OTP મેળવો')}
                    </span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {devOtpHint && (
                      <div className="rounded-xl bg-teal-50 border border-teal-200 p-2.5 text-center">
                        <span className="text-[11px] font-bold text-teal-800">
                          {tr('Your Instant Verification OTP:', 'आपका वेरिफिकेशन OTP:', 'તમારો વેરિફિકેશન OTP:')}{' '}
                        </span>
                        <span className="text-sm font-black text-teal-950 tracking-widest bg-white px-2 py-0.5 rounded-lg border border-teal-300">
                          {devOtpHint}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        {tr('Enter 6-Digit OTP', '6-अंकों का OTP डालें', '6-અંકનો OTP નાખો')}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="• • • • • •"
                        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-center text-lg font-black tracking-[0.35em] text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        {tr(
                          'Set a 4-Digit PIN for Future Login (Optional)',
                          'भविष्य के लिए 4-अंकों का PIN सेट करें (वैकल्पिक)',
                          'ભવિષ્યમાં ડાયરેક્ટ લોગિન માટે 4-અંકનો PIN સેટ કરો'
                        )}
                      </label>
                      <input
                        type="password"
                        value={pinOrPassword}
                        onChange={(e) => setPinOrPassword(e.target.value)}
                        placeholder={tr('4-digit PIN / Password', '4-अंकों का PIN', '4-અંકનો PIN')}
                        className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-bold text-slate-900"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={cooldown > 0 || isSubmitting}
                        className="px-3.5 py-3 rounded-2xl border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw size={13} />
                        <span>{cooldown > 0 ? `${cooldown}s` : tr('Resend', 'पुनः भेजें', 'ફરી મોકલો')}</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 border-b-4 border-teal-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        <span>{tr('Verify & Login', 'वेरिफाई और लॉगिन करें', 'વેરિફાઈ અને લોગિન કરો')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* Clean Admin Approval Note for New Users */}
            {!checkedUser.exists && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-[11px] font-semibold text-slate-600 leading-relaxed">
                {tr(
                  'Note: New accounts are sent for Admin Approval. You can browse everything immediately, and post or chat once approved.',
                  'नोट: नया अकाउंट एडमिन अप्रूवल के लिए जाता है। अप्रूवल के बाद आप पोस्ट और चैट कर सकेंगे।',
                  'નોંધ: નવું એકાઉન્ટ એડમિન અપ્રૂવલ માટે જાય છે. અપ્રૂવલ પછી તમે પોસ્ટ અને ચેટ કરી શકશો.'
                )}
              </div>
            )}
          </div>
        )}

        {/* Hidden Firebase reCAPTCHA mount container */}
        <div id="recaptcha-container" className="hidden" />
      </div>
    </div>
  );
}
