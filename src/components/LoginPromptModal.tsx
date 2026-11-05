import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
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
  verifyEmailOtp
} from '../auth';
import { useLanguage } from '../i18n';
import {
  PAN_INDIA_STATES_DISTRICTS,
  getTalukasForDistrict,
  getProfileRegisteredLocation,
  saveProfileRegisteredLocation
} from '../data/panIndiaLocations';

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

  // Registration Location State (Default: Gujarat -> Gandhinagar -> Gandhinagar)
  const initialRegLoc = getProfileRegisteredLocation();
  const [regState, setRegState] = useState<string>(initialRegLoc.state || 'Gujarat');
  const [regDistrict, setRegDistrict] = useState<string>(initialRegLoc.district || 'Gandhinagar');
  const [regTaluka, setRegTaluka] = useState<string>(initialRegLoc.taluka || 'Gandhinagar');

  // PostgreSQL lookup state
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [checkedUser, setCheckedUser] = useState<{
    checked: boolean;
    exists: boolean;
    name?: string;
    email?: string;
    phone?: string;
    hasPassword?: boolean;
    isApproved?: boolean;
    approvalStatus?: string;
  }>({ checked: false, exists: false });

  // OTP & PIN setup states
  const [forceOtpMode, setForceOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [otpVerifiedForPinSetup, setOtpVerifiedForPinSetup] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    setForceOtpMode(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpVerifiedForPinSetup(false);
    setPinOrPassword('');

    const savedPhone = localStorage.getItem('locohelp_last_logged_in_phone') || '';
    const savedEmail = localStorage.getItem('locohelp_last_logged_in_email') || '';
    const savedName = localStorage.getItem('locohelp_last_logged_in_name') || '';
    if (!phoneOrEmail) {
      if (savedPhone) {
        setPhoneOrEmail(savedPhone);
      } else if (savedEmail && !savedEmail.endsWith('@phone.locohelp.com')) {
        setPhoneOrEmail(savedEmail);
      }
    }
    if (savedName && !name) {
      setName(savedName);
    }
  }, [isOpen]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Smart PostgreSQL Recognition as soon as user enters 10-digit phone number OR valid email
  useEffect(() => {
    const raw = phoneOrEmail.trim();
    const digits = raw.replace(/\D/g, '');
    const isTenDigitPhone =
      !raw.includes('@') &&
      ((digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) ||
        (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))));
    const isEmail = raw.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);

    // Reset OTP progress when user edits their phone/email
    setOtpSent(false);
    setOtpCode('');
    setOtpVerifiedForPinSetup(false);
    setForceOtpMode(false);

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
        isApproved: info.isApproved,
        approvalStatus: info.approvalStatus
      });
      if (info.exists && info.name) {
        setName(info.name);
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
  const isEmailInput = rawInput.includes('@') || /[a-zA-Z]/.test(rawInput);
  const isValidPhone = !rawInput.includes('@') && /^[6-9]\d{9}$/.test(cleanDigits);
  const isValidEmail = rawInput.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawInput);

  // Returning user recognized in PostgreSQL WITH an existing saved PIN/Password can log in directly with their PIN/Password.
  // Accounts without a saved PIN/Password MUST verify via 6-digit OTP first.
  const canLoginDirectlyWithPin =
    checkedUser.checked &&
    checkedUser.exists &&
    Boolean(checkedUser.hasPassword) &&
    !forceOtpMode &&
    !otpVerifiedForPinSetup;

  const displayActionBanner =
    actionName ||
    (language === 'GU'
      ? actionTitleGu || actionTitleEn
      : language === 'HI'
      ? actionTitleHi || actionTitleEn
      : actionTitleEn);

  // Returning Verified User: Direct Login with Saved PIN / Password
  const handleReturningPinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isValidPhone && !isValidEmail) {
      setErrorMsg(
        tr(
          'Please enter a valid 10-digit Mobile Number or Email ID.',
          'कृपया सही 10-अंकों का मोबाइल नंबर या ईमेल आईडी दर्ज करें।',
          'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર અથવા ઈમેલ આઈડી લખો.'
        )
      );
      return;
    }

    if (!pinOrPassword || pinOrPassword.trim().length < 4) {
      setErrorMsg(
        tr(
          'Please enter your 4-digit PIN or Password.',
          'कृपया अपना 4-अंकों का PIN या पासवर्ड डालें।',
          'કૃપા કરીને તમારો 4-અંકનો PIN અથવા પાસવર્ડ નાખો.'
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await smartPhoneAuth({
        phone: isValidEmail ? rawInput.toLowerCase() : cleanDigits,
        password: pinOrPassword.trim(),
        name: name.trim() || checkedUser.name || undefined
      });

      if (!res.success) {
        if (isValidEmail) {
          const emailRes = await signInWithPassword(rawInput.toLowerCase(), pinOrPassword.trim());
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
        if (res.needsOtp) {
          setForceOtpMode(true);
        }
        setErrorMsg(
          res.error ||
            tr(
              'Incorrect PIN / Password. Try again or login with OTP below.',
              'गलत PIN / पासवर्ड! पुनः प्रयास करें या नीचे OTP से लॉगिन करें।',
              'ખોટો PIN / પાસવર્ડ! ફરી પ્રયાસ કરો અથવા નીચે OTP થી લોગિન કરો.'
            )
        );
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setSuccessMsg(
        tr(
          'Welcome back! You are logged in.',
          'वापसी पर स्वागत है! आप लॉगिन हो गए हैं।',
          'ફરી સ્વાગત છે! તમે લોગિન થઈ ગયા છો.'
        )
      );
      setTimeout(() => {
        finishSuccess();
      }, 500);
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

  // Step 1 for New Users / Forgot PIN: Send 6-Digit OTP strictly to Mobile SMS OR Email Inbox
  const handleSendOtp = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isValidPhone && !isValidEmail) {
      setErrorMsg(
        tr(
          'Please enter a valid 10-digit Mobile Number or Email ID first.',
          'कृपया पहले सही 10-अंकों का मोबाइल नंबर या ईमेल आईडी दर्ज करें।',
          'કૃપા કરીને પહેલા 10-અંકનો સાચો મોબાઇલ નંબર અથવા ઈમેલ આઈડી લખો.'
        )
      );
      return;
    }

    if (!checkedUser.exists && !name.trim()) {
      setErrorMsg(
        tr(
          'Please enter your Full Name before requesting OTP.',
          'कृपया OTP मंगाने से पहले अपना पूरा नाम लिखें।',
          'કૃપા કરીને OTP મેળવતા પહેલા તમારું પૂરું નામ લખો.'
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isValidEmail) {
        const res = await sendEmailOtp(rawInput.toLowerCase());
        setIsSubmitting(false);
        if (!res.success) {
          setErrorMsg(res.error || tr('Failed to send Email OTP.', 'ईमेल OTP भेजने में विफल।', 'ઈમેલ OTP મોકલવામાં નિષ્ફળ.'));
          return;
        }
        setOtpSent(true);
        setOtpCode('');
        setCooldown(res.cooldownRemaining || 60);
        setSuccessMsg(
          tr(
            '6-digit OTP sent to your Email! Please check your inbox and enter it below.',
            'आपके ईमेल पर 6-अंकों का OTP भेजा गया है! कृपया अपना ईमेल चेक करें और नीचे दर्ज करें।',
            'તમારા ઈમેલ પર 6-અंकનો OTP મોકલવામાં આવ્યો છે! કૃપા કરીને ઈમેલ ચેક કરી નીચે નાખો.'
          )
        );
      } else {
        const res = await sendMobileOtp(cleanDigits, 'recaptcha-container');
        setIsSubmitting(false);
        if (!res.success) {
          setErrorMsg(res.error || tr('Failed to send Mobile OTP.', 'मोबाइल OTP भेजने में विफल।', 'મોબાઇલ OTP મોકલવામાં નિષ્ફળ.'));
          return;
        }
        setOtpSent(true);
        setOtpCode('');
        setCooldown(res.cooldownRemaining || 60);
        setSuccessMsg(
          tr(
            '6-digit OTP sent via SMS to your Mobile Number! Enter it below.',
            'आपके मोबाइल नंबर पर SMS द्वारा 6-अंकों का OTP भेजा गया है! नीचे दर्ज करें।',
            'તમારા મોબાઇલ નંબર પર SMS દ્વારા 6-અંકનો OTP મોકલવામાં આવ્યો છે! નીચે નાખો.'
          )
        );
      }
    } catch {
      setIsSubmitting(false);
      setErrorMsg(tr('Failed to send OTP.', 'OTP भेजने में त्रुटि।', 'OTP મોકલવામાં ભૂલ.'));
    }
  };

  // Step 2: Verify 6-Digit OTP First -> Then Unlock "Set 4-Digit PIN / Password" Screen
  const handleVerifyOtpStep = async (e: React.FormEvent) => {
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
      const finalName = name.trim() || checkedUser.name || undefined;

      if (isValidEmail) {
        const r = await verifyEmailOtp(rawInput.toLowerCase(), cleanCode, undefined, finalName);
        if (!r.success) {
          setErrorMsg(r.error || tr('Invalid OTP code.', 'गलत OTP कोड।', 'ખોટો OTP કોડ.'));
          setIsSubmitting(false);
          return;
        }
      } else {
        const r = await verifyMobileOtp(cleanDigits, cleanCode, undefined, finalName);
        if (!r.success) {
          setErrorMsg(r.error || tr('Invalid OTP code.', 'गलत OTP कोड।', 'ખોટો OTP કોડ.'));
          setIsSubmitting(false);
          return;
        }
      }

      if (!checkedUser.exists || !checkedUser.name) {
        await saveProfileRegisteredLocation({
          state: regState || 'Gujarat',
          district: regDistrict || 'Gandhinagar',
          taluka: regTaluka || regDistrict || 'Gandhinagar',
          area: regTaluka || regDistrict || 'Gandhinagar'
        });
      }

      setIsSubmitting(false);
      setOtpVerifiedForPinSetup(true);
      setPinOrPassword('');
      setSuccessMsg(
        tr(
          'OTP Verified! Now set your 4-digit PIN / Password for future direct login.',
          'OTP वेरिफाई हो गया! अब भविष्य में सीधे लॉगिन के लिए अपना 4-अंकों का PIN / पासवर्ड सेट करें।',
          'OTP વેરિફાઈ થઈ ગયો! હવે ભવિષ્યમાં સીધા લોગિન માટે તમારો 4-અંકનો PIN / પાસવર્ડ સેટ કરો.'
        )
      );
    } catch {
      setIsSubmitting(false);
      setErrorMsg(tr('Verification failed.', 'वेरिफिकेशन विफल।', 'વેરિફિકેશન નિષ્ફળ.'));
    }
  };

  // Step 3 (After OTP Verified): Save 4-Digit PIN / Password Permanently in PostgreSQL
  const handleSavePinAfterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!pinOrPassword || pinOrPassword.trim().length < 4) {
      setErrorMsg(
        tr(
          'Please enter at least a 4-digit PIN or Password.',
          'कृपया कम से कम 4-अंकों का PIN या पासवर्ड लिखें।',
          'કૃપા કરીને ઓછામાં ઓછો 4-અંકનો PIN અથવા પાસવર્ડ લખો.'
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await smartPhoneAuth({
        phone: isValidEmail ? rawInput.toLowerCase() : cleanDigits,
        password: pinOrPassword.trim(),
        name: name.trim() || checkedUser.name || undefined,
        mode: 'set_after_otp',
        afterOtpVerified: true
      });

      setIsSubmitting(false);
      if (!res.success) {
        setErrorMsg(
          res.error ||
            tr(
              'Could not save PIN / Password. Please try again.',
              'PIN / पासवर्ड सेव नहीं हो सका। कृपया पुनः प्रयास करें।',
              'PIN / પાસવર્ડ સેવ થઈ શક્યો નહીં. ફરી પ્રયાસ કરો.'
            )
        );
        return;
      }

      if (!checkedUser.exists || !checkedUser.name) {
        await saveProfileRegisteredLocation({
          state: regState || 'Gujarat',
          district: regDistrict || 'Gandhinagar',
          taluka: regTaluka || regDistrict || 'Gandhinagar',
          area: regTaluka || regDistrict || 'Gandhinagar'
        });
      }

      setSuccessMsg(
        tr(
          'PIN Saved & Logged In Permanently!',
          'PIN सेव हो गया और आप स्थायी रूप से लॉगिन हो गए!',
          'PIN સેવ થઈ ગયો અને તમે કાયમી લોગિન થઈ ગયા!'
        )
      );
      setTimeout(() => {
        finishSuccess();
      }, 450);
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

  return (
    <div
      className="fixed inset-x-0 flex items-start sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      style={{
        position: 'fixed',
        top: '52px',
        left: 0,
        right: 0,
        bottom: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        zIndex: 10500,
        backgroundColor: 'rgba(2, 6, 23, 0.78)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-300"
        style={{ backgroundColor: '#ffffff', zIndex: 10501 }}
      >
        {/* Top Bar: Language Selector + Close Button */}
        <div
          className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-4 py-2.5 text-white flex items-center justify-between"
          style={{ backgroundColor: '#0f766e', color: '#ffffff' }}
        >
          {/* Language Switcher */}
          <div
            className="flex items-center bg-teal-900/60 rounded-xl p-0.5 border border-white/15 text-[11px] font-extrabold"
            style={{ backgroundColor: 'rgba(19, 78, 74, 0.6)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <button
              type="button"
              onClick={() => setLanguage('GU')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'GU' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100'
              }`}
              style={language === 'GU' ? { backgroundColor: '#ffffff', color: '#134e4a' } : { color: '#ccfbf1' }}
            >
              ગુજ
            </button>
            <button
              type="button"
              onClick={() => setLanguage('HI')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'HI' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100'
              }`}
              style={language === 'HI' ? { backgroundColor: '#ffffff', color: '#134e4a' } : { color: '#ccfbf1' }}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('EN')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'EN' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100'
              }`}
              style={language === 'EN' ? { backgroundColor: '#ffffff', color: '#134e4a' } : { color: '#ccfbf1' }}
            >
              ENG
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (otpVerifiedForPinSetup) {
                finishSuccess();
              } else {
                onClose();
              }
            }}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Animated Single LocoHelp Brand Header inside Login */}
        <div className="pt-4 pb-1 px-4 flex flex-col items-center justify-center text-center bg-gradient-to-b from-teal-50/70 via-blue-50/20 to-white">
          <div className="relative flex items-center justify-center mb-1.5">
            <div className="absolute w-16 h-16 rounded-full bg-blue-500/15 animate-ping" style={{ animationDuration: '2.2s' }} />
            <div className="relative w-14 h-14 rounded-2xl bg-white border-2 border-blue-100 shadow-lg flex items-center justify-center transition-transform duration-300 hover:scale-105">
              <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M 16 60 C 26 84, 42 93, 50 93 C 58 93, 74 84, 84 60 C 87 53, 77 49, 73 55 C 65 67, 57 76, 50 76 C 43 76, 35 67, 27 55 C 23 49, 13 53, 16 60 Z"
                  fill="#FF8800"
                  stroke="#FF8800"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 50 6 C 36 6 25 17 25 31 C 25 46 50 66 50 66 C 50 66 75 46 75 31 C 75 17 64 6 50 6 Z M 50 42 C 43.9 42 39 37.1 39 31 C 39 24.9 43.9 20 50 20 C 56.1 20 61 24.9 61 31 C 61 37.1 56.1 42 50 42 Z"
                  fill="#0066FF"
                />
              </svg>
            </div>
          </div>
          <div className="text-xl font-black tracking-tight leading-none">
            <span className="text-[#0066FF]">Loco</span>
            <span className="text-[#FF8800]">Help</span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            {actionTitleGu && language === 'GU'
              ? actionTitleGu
              : actionTitleHi && language === 'HI'
              ? actionTitleHi
              : actionTitleEn && language === 'EN'
              ? actionTitleEn
              : tr('Quick & Secure Login', 'त्वरित और सुरक्षित लॉगिन', 'ઝડપી અને સુરક્ષિત લોગિન')}
          </p>
        </div>

        <div className="p-4 pt-2.5 space-y-3">
          {/* Error / Success Banner */}
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 flex items-start gap-2 text-rose-800 text-xs font-bold">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 flex items-start gap-2 text-emerald-800 text-xs font-bold">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Step 1: Mandatory Mobile Number OR Email ID Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              {tr(
                'Mobile Number or Email ID',
                'मोबाइल नंबर या ईमेल आईडी',
                'મોબાઇલ નંબર અથવા ઈમેલ આઈડી'
              )}
            </label>
            <div className="flex items-center rounded-2xl border-2 border-slate-200 focus-within:border-teal-600 bg-white overflow-hidden">
              <div className="pl-3 pr-2 py-2.5 flex items-center gap-1 text-slate-500 font-bold text-xs shrink-0 select-none">
                {isEmailInput ? (
                  <Mail size={15} className="text-teal-600 shrink-0" />
                ) : cleanDigits.length > 0 ? (
                  <>
                    <Phone size={15} className="text-teal-600 shrink-0" />
                    <span>+91</span>
                  </>
                ) : (
                  <Phone size={15} className="text-teal-600 shrink-0" />
                )}
              </div>
              <input
                type="text"
                inputMode="text"
                disabled={otpVerifiedForPinSetup}
                value={phoneOrEmail}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val.includes('@') && !/[a-zA-Z]/.test(val) && /^\d+$/.test(val.replace(/\s+/g, ''))) {
                    setPhoneOrEmail(val.replace(/\D/g, '').slice(0, 10));
                  } else {
                    setPhoneOrEmail(val);
                  }
                  setErrorMsg(null);
                }}
                placeholder={tr(
                  '10-digit Mobile or Email ID',
                  '10 अंकों का मोबाइल या ईमेल',
                  '10 અંકનો મોબાઇલ અથવા ઈમેલ'
                )}
                className="flex-1 min-w-0 py-2.5 pr-3 bg-transparent focus:outline-none text-sm font-black text-slate-900 tracking-wide disabled:bg-slate-100"
                autoFocus
              />
              {isCheckingUser && (
                <div className="pr-3 shrink-0">
                  <Loader2 size={15} className="text-teal-600 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* CASE 1: OTP Just Verified -> Show "Set 4-Digit PIN / Password" Step */}
          {otpVerifiedForPinSetup ? (
            <form onSubmit={handleSavePinAfterOtp} className="space-y-3 pt-0.5">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  {tr(
                    'Set 4-Digit PIN or Password',
                    '4-अंकों का PIN या पासवर्ड सेट करें',
                    '4-અંકનો PIN અથવા પાસવર્ડ સેટ કરો'
                  )}
                </label>
                <div className="flex items-center rounded-2xl border-2 border-teal-500 focus-within:border-teal-700 bg-white overflow-hidden">
                  <div className="pl-3 pr-2 py-2.5 text-teal-600 shrink-0">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={pinOrPassword}
                    onChange={(e) => setPinOrPassword(e.target.value)}
                    placeholder={tr(
                      'Enter 4-digit PIN or Password',
                      '4-अंकों का PIN या पासवर्ड लिखें',
                      '4-અંકનો PIN અથવા પાસવર્ડ લખો'
                    )}
                    className="flex-1 min-w-0 py-2.5 bg-transparent focus:outline-none text-sm font-black text-slate-900 tracking-wider"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-2.5 text-slate-400 hover:text-slate-700 shrink-0"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 active:translate-y-0.5 border-b-4 border-teal-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={17} />
                )}
                <span>
                  {tr(
                    'Save PIN & Login',
                    'PIN सेव करें और लॉगिन करें',
                    'PIN સેવ કરો અને લોગિન કરો'
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => finishSuccess()}
                className="w-full py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-extrabold text-xs transition-colors"
              >
                {tr(
                  'Skip PIN & Continue →',
                  'बिना PIN सीधे आगे बढ़ें →',
                  'PIN વગર સીધા આગળ વધો →'
                )}
              </button>
            </form>
          ) : canLoginDirectlyWithPin ? (
            /* CASE 2: Returning Verified User Recognized in PostgreSQL with Saved Password */
            <form onSubmit={handleReturningPinLogin} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">
                    {tr(
                      'Enter PIN / Password',
                      'अपना PIN / पासवर्ड डालें',
                      'તમારો PIN / પાસવર્ડ નાખો'
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForceOtpMode(true);
                      setErrorMsg(null);
                    }}
                    className="text-[11px] font-extrabold text-teal-700 hover:underline"
                  >
                    {tr(
                      'Forgot PIN? Use OTP',
                      'PIN भूल गए? OTP से लॉगिन करें',
                      'PIN ભૂલી ગયા? OTP વાપરો'
                    )}
                  </button>
                </div>
                <div className="flex items-center rounded-2xl border-2 border-slate-200 focus-within:border-teal-600 bg-white overflow-hidden">
                  <div className="pl-3 pr-2 py-2.5 text-teal-600 shrink-0">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={pinOrPassword}
                    onChange={(e) => setPinOrPassword(e.target.value)}
                    placeholder={tr(
                      'Enter 4-digit PIN or Password',
                      '4-अंकों का PIN या पासवर्ड लिखें',
                      '4-અંકનો PIN અથવા પાસવર્ડ લખો'
                    )}
                    className="flex-1 min-w-0 py-2.5 bg-transparent focus:outline-none text-sm font-black text-slate-900 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-2.5 text-slate-400 hover:text-slate-700 shrink-0"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 active:translate-y-0.5 border-b-4 border-teal-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <ShieldCheck size={17} />
                )}
                <span>{tr('Login Now', 'लॉगिन करें', 'લોગિન કરો')}</span>
              </button>
            </form>
          ) : (
            /* CASE 3: New User OR User without PIN OR Forgot PIN -> Mandatory OTP Verification First */
            <form onSubmit={handleVerifyOtpStep} className="space-y-3">
              {(!checkedUser.exists || !checkedUser.name) && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      {tr('Your Full Name', 'आपका पूरा नाम', 'તમારું પૂરું નામ')}
                    </label>
                    <div className="flex items-center rounded-2xl border-2 border-slate-200 focus-within:border-teal-600 bg-white overflow-hidden">
                      <div className="pl-3 pr-2 py-2.5 text-slate-400 shrink-0">
                        <UserIcon size={15} />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={tr(
                          'Enter your full name',
                          'अपना पूरा नाम लिखें',
                          'તમારું પૂરું નામ લખો'
                        )}
                        className="flex-1 min-w-0 py-2.5 pr-3 bg-transparent focus:outline-none text-sm font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Compact 3-Column Location Selector: State (Default: Gujarat) -> District -> Taluka */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">
                      {tr(
                        'Your Location (State • District • Taluka)',
                        'आपका लोकेशन (राज्य • जिला • तालुका)',
                        'તમારું લોકેશન (રાજ્ય • જિલ્લો • તાલુકો)'
                      )}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="block text-[9px] font-extrabold text-slate-500 uppercase px-0.5 mb-0.5 truncate">
                          {tr('1. State', '1. राज्य', '1. રાજ્ય')}
                        </span>
                        <select
                          value={regState}
                          onChange={(e) => {
                            const nextState = e.target.value;
                            const nextDistricts = PAN_INDIA_STATES_DISTRICTS[nextState] || [];
                            const firstDist = nextDistricts[0] || '';
                            const firstTaluka = getTalukasForDistrict(firstDist)[0] || firstDist;
                            setRegState(nextState);
                            setRegDistrict(firstDist);
                            setRegTaluka(firstTaluka);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 text-[11px] font-bold text-slate-900 outline-none focus:border-teal-600 cursor-pointer truncate"
                        >
                          {Object.keys(PAN_INDIA_STATES_DISTRICTS).map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="block text-[9px] font-extrabold text-slate-500 uppercase px-0.5 mb-0.5 truncate">
                          {tr('2. District', '2. जिला', '2. જિલ્લો')}
                        </span>
                        <select
                          value={regDistrict}
                          onChange={(e) => {
                            const nextDist = e.target.value;
                            const nextTalukas = getTalukasForDistrict(nextDist);
                            const firstTaluka = nextTalukas[0] || nextDist;
                            setRegDistrict(nextDist);
                            setRegTaluka(firstTaluka);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 text-[11px] font-bold text-slate-900 outline-none focus:border-teal-600 cursor-pointer truncate"
                        >
                          {(PAN_INDIA_STATES_DISTRICTS[regState] || []).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="block text-[9px] font-extrabold text-slate-500 uppercase px-0.5 mb-0.5 truncate">
                          {tr('3. Taluka', '3. तालुका', '3. તાલુકો')}
                        </span>
                        <select
                          value={regTaluka}
                          onChange={(e) => setRegTaluka(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 text-[11px] font-bold text-slate-900 outline-none focus:border-teal-600 cursor-pointer truncate"
                        >
                          {getTalukasForDistrict(regDistrict).map((tl) => (
                            <option key={tl} value={tl}>
                              {tl}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!otpSent ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSubmitting || cooldown > 0}
                    className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 border-b-4 border-teal-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <KeyRound size={17} />
                    )}
                    <span>
                      {cooldown > 0
                        ? tr(
                            `Wait ${cooldown}s`,
                            `${cooldown}s प्रतीक्षा करें`,
                            `${cooldown} સેકન્ડ રાહ જુઓ`
                          )
                        : isValidEmail
                        ? tr(
                            'Send 6-Digit OTP to Email',
                            'ईमेल पर 6-अंकों का OTP भेजें',
                            'ઈમેલ પર 6-અંકનો OTP મોકલો'
                          )
                        : tr(
                            'Send 6-Digit OTP to Mobile',
                            'मोबाइल पर 6-अंकों का OTP भेजें',
                            'મોબાઇલ પર 6-અંકનો OTP મોકલો'
                          )}
                    </span>
                  </button>

                  {checkedUser.exists && checkedUser.hasPassword && forceOtpMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setForceOtpMode(false);
                        setErrorMsg(null);
                      }}
                      className="w-full py-1.5 text-center text-xs font-extrabold text-teal-700 hover:underline"
                    >
                      {tr(
                        '← Back to PIN / Password Login',
                        '← PIN / पासवर्ड लॉगिन पर वापस जाएं',
                        '← PIN / પાસવર્ડ લોગિન પર પાછા જાઓ'
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      {isValidEmail
                        ? tr(
                            'Enter 6-Digit Email OTP',
                            'ईमेल पर आया 6-अंकों का OTP डालें',
                            'ઈમેલ પર આવેલો 6-અંકનો OTP નાખો'
                          )
                        : tr(
                            'Enter 6-Digit Mobile SMS OTP',
                            'मोबाइल SMS पर आया 6-अंकों का OTP डालें',
                            'મોબાઇલ SMS પર આવેલો 6-અંકનો OTP નાખો'
                          )}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-center text-lg font-black tracking-[0.35em] text-slate-900"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={cooldown > 0 || isSubmitting}
                      className="px-3 py-2.5 rounded-2xl border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw size={13} />
                      <span>
                        {cooldown > 0 ? `${cooldown}s` : tr('Resend', 'पुनः भेजें', 'ફરી મોકલો')}
                      </span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 border-b-4 border-teal-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}
                      <span>
                        {tr(
                          'Verify OTP',
                          'OTP वेरिफाई करें',
                          'OTP વેરિફાઈ કરો'
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

