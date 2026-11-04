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

  // OTP & PIN setup states
  const [forceOtpMode, setForceOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [otpVerifiedForPinSetup, setOtpVerifiedForPinSetup] = useState(false);

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
    setForceOtpMode(false);
    setOtpSent(false);
    setOtpCode('');
    setDevOtpHint('');
    setOtpVerifiedForPinSetup(false);
    setPinOrPassword('');
    setShowBiometricSetupPrompt(false);

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
    setDevOtpHint('');
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
  const isEmailInput = rawInput.includes('@') || /[a-zA-Z]/.test(rawInput);
  const isValidPhone = !rawInput.includes('@') && /^[6-9]\d{9}$/.test(cleanDigits);
  const isValidEmail = rawInput.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawInput);

  // Returning user recognized in PostgreSQL can log in directly with saved PIN/Password (or set PIN if not yet saved) without repeated OTPs
  const canLoginDirectlyWithPin =
    checkedUser.checked &&
    checkedUser.exists &&
    !forceOtpMode &&
    !otpVerifiedForPinSetup;

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
              'Biometric login failed. Please log in below.',
              'फिंगरप्रिंट लॉगिन नहीं हो सका। कृपया नीचे लॉगिन करें।',
              'ફિંગરપ્રિન્ટ લોગિન નિષ્ફળ. કૃપા કરી નીચે લોગિન કરો.'
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

      if (biometricSupported && !hasLocalPasskey && !checkedUser.hasBiometric) {
        setShowBiometricSetupPrompt(true);
        return;
      }

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

  // Step 1 for New Users / Forgot PIN: Send 6-Digit OTP to Mobile OR Email
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
        setCooldown(res.cooldownRemaining || 60);
        if (res.devCode) {
          setDevOtpHint(res.devCode);
          setOtpCode(res.devCode);
        }
        setSuccessMsg(
          tr(
            '6-digit OTP sent to your Email! Enter it below.',
            'आपके ईमेल पर 6-अंकों का OTP भेजा गया है! नीचे दर्ज करें।',
            'તમારા ઈમેલ પર 6-અંકનો OTP મોકલવામાં આવ્યો છે! નીચે નાખો.'
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
        setCooldown(res.cooldownRemaining || 15);
        if (res.devCode) {
          setDevOtpHint(res.devCode);
          setOtpCode(res.devCode);
          setSuccessMsg(
            tr(
              `6-digit OTP (${res.devCode}) auto-filled below! Tap Verify OTP to continue.`,
              `आपका 6-अंकों का OTP (${res.devCode}) नीचे अपने-आप भर गया है! आगे बढ़ने के लिए वेरिफाई दबाएं।`,
              `તમારો 6-અંકનો OTP (${res.devCode}) નીચે આપમેળે ભરાઈ ગયો છે! આગળ વધવા વેરિફાઈ દબાવો.`
            )
          );
        } else {
          setSuccessMsg(
            tr(
              '6-digit OTP sent to your Mobile Number! Enter it below.',
              'आपके मोबाइल नंबर पर 6-अंकों का OTP भेजा गया है! नीचे दर्ज करें।',
              'તમારા મોબાઇલ નંબર પર 6-અંકનો OTP મોકલવામાં આવ્યો છે! નીચે નાખો.'
            )
          );
        }
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

      if (biometricSupported && !hasLocalPasskey && !checkedUser.hasBiometric) {
        setShowBiometricSetupPrompt(true);
        return;
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

  const handleEnableBiometricNow = async () => {
    setIsSubmitting(true);
    await registerBiometricPasskey();
    setIsSubmitting(false);
    setShowBiometricSetupPrompt(false);
    finishSuccess();
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
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: '#ffffff', zIndex: 10501 }}
      >
        {/* Clean Solid Header */}
        <div
          className="bg-teal-700 px-5 py-4 text-white flex items-center justify-between"
          style={{ backgroundColor: '#0f766e', color: '#ffffff' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/25"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: 'rgba(255, 255, 255, 0.25)' }}
            >
              <ShieldCheck size={22} className="text-white" style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight" style={{ color: '#ffffff' }}>
                {checkedUser.checked && checkedUser.exists
                  ? tr('Welcome Back!', 'वापसी पर स्वागत है!', 'ફરી સ્વાગત છે!')
                  : tr('LocoHelp Login / Join', 'लॉगिन / नया अकाउंट', 'લોગિન / નવું એકાઉન્ટ')}
              </h2>
              <p className="text-[11px] text-teal-100 font-semibold" style={{ color: '#ccfbf1' }}>
                {tr(
                  'Mobile or Email • Safe OTP Verification',
                  'मोबाइल या ईमेल • सुरक्षित OTP वेरिफिकेशन',
                  'મોબાઇલ કે ઈમેલ • સુરક્ષિત OTP વેરિફિકેશન'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Compact Language Switcher */}
            <div
              className="flex items-center bg-teal-900/60 rounded-xl p-0.5 border border-white/15 text-[10px] font-extrabold"
              style={{ backgroundColor: 'rgba(19, 78, 74, 0.6)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <button
                type="button"
                onClick={() => setLanguage('GU')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'GU' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100'
                }`}
                style={language === 'GU' ? { backgroundColor: '#ffffff', color: '#134e4a' } : { color: '#ccfbf1' }}
              >
                ગુજ
              </button>
              <button
                type="button"
                onClick={() => setLanguage('HI')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'HI' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100'
                }`}
                style={language === 'HI' ? { backgroundColor: '#ffffff', color: '#134e4a' } : { color: '#ccfbf1' }}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('EN')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
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
        </div>

        {/* Optional Biometric Enable Prompt after Login */}
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
            {biometricSupported && (hasLocalPasskey || checkedUser.hasBiometric) && !otpVerifiedForPinSetup && (
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

            {/* Step 1: Mandatory Mobile Number OR Email ID Input */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                {tr(
                  '1. Mobile Number or Email ID (Mandatory)',
                  '1. मोबाइल नंबर या ईमेल आईडी (अनिवार्य)',
                  '1. મોબાઇલ નંબર અથવા ઈમેલ આઈડી (ફરજિયાત)'
                )}
              </label>
              <div className="relative flex items-center">
                <div
                  className="absolute left-3.5 flex items-center gap-1 text-slate-500 font-bold text-xs pointer-events-none"
                  style={{ left: '14px' }}
                >
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
                    'Enter 10-digit Mobile Number or Email ID',
                    '10 अंकों का मोबाइल नंबर या ईमेल आईडी लिखें',
                    '10 અંકનો મોબાઇલ નંબર અથવા ઈમેલ આઈડી લખો'
                  )}
                  className="w-full py-3 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-black text-slate-900 tracking-wide disabled:bg-slate-100"
                  style={{
                    paddingLeft: !isEmailInput && cleanDigits.length > 0 ? '64px' : '40px',
                    paddingRight: '38px',
                  }}
                  autoFocus
                />
                {isCheckingUser && (
                  <Loader2 size={16} className="absolute right-3.5 text-teal-600 animate-spin" />
                )}
              </div>

              {/* Smart Recognition Status Badge */}
              {checkedUser.checked && !otpVerifiedForPinSetup && (
                <div className="mt-2">
                  {checkedUser.exists ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-extrabold">
                      <CheckCircle2 size={13} className="text-teal-600 shrink-0" />
                      <span>
                        {checkedUser.hasPassword
                          ? tr(
                              `Welcome back, ${checkedUser.name || 'Member'}! Enter your saved PIN/Password below.`,
                              `स्वागत है, ${checkedUser.name || 'सदस्य'}! नीचे अपना सेव किया हुआ PIN/पासवर्ड डालें।`,
                              `ફરી સ્વાગત છે, ${checkedUser.name || 'સભ્ય'}! નીચે તમારો સેવ કરેલો PIN/પાસવર્ડ નાખો.`
                            )
                          : tr(
                              `Welcome back, ${checkedUser.name || 'Member'}! Set a 4-digit PIN below to login directly.`,
                              `स्वागत है, ${checkedUser.name || 'सदस्य'}! सीधे लॉगिन के लिए नीचे 4-अंकों का PIN डालें।`,
                              `ફરી સ્વાગત છે, ${checkedUser.name || 'સભ્ય'}! સીધા લોગિન માટે નીચે 4-અંકનો PIN નાખો.`
                            )}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-extrabold">
                      <Sparkles size={13} className="text-blue-600 shrink-0" />
                      <span>
                        {isValidEmail
                          ? tr(
                              'Verify with 6-digit Email OTP first, then set your PIN/Password.',
                              'पहले ईमेल OTP से वेरिफाई करें, फिर अपना PIN/पासवर्ड सेट करें।',
                              'પહેલા ઈમેલ OTP થી વેરિફાઈ કરો, પછી તમારો PIN/પાસવર્ડ સેટ કરો.'
                            )
                          : tr(
                              'Verify with 6-digit Mobile OTP first, then set your PIN/Password.',
                              'पहले मोबाइल OTP से वेरिफाई करें, फिर अपना PIN/पासवर्ड सेट करें।',
                              'પહેલા મોબાઇલ OTP થી વેરિફાઈ કરો, પછી તમારો PIN/પાસવર્ડ સેટ કરો.'
                            )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CASE 1: OTP Just Verified -> Show "Set 4-Digit PIN / Password" Step */}
            {otpVerifiedForPinSetup ? (
              <form onSubmit={handleSavePinAfterOtp} className="space-y-3.5 pt-1">
                <div className="rounded-2xl bg-teal-50 border border-teal-200 p-3 text-xs font-extrabold text-teal-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-teal-600 shrink-0" />
                  <span>
                    {tr(
                      'Step 2: Create a 4-Digit PIN / Password so next time you can login directly without OTP.',
                      'स्टेप 2: अपना 4-अंकों का PIN / पासवर्ड बनाएं ताकि अगली बार बिना OTP सीधे लॉगिन कर सकें।',
                      'સ્ટેપ 2: તમારો 4-અંકનો PIN / પાસવર્ડ બનાવો જેથી આગલી વખતે OTP વગર સીધા લોગિન કરી શકો.'
                    )}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    {tr(
                      'Set 4-Digit PIN or Password',
                      '4-अंकों का PIN या पासवर्ड सेट करें',
                      '4-અંકનો PIN અથવા પાસવર્ડ સેટ કરો'
                    )}
                  </label>
                  <div className="relative flex items-center">
                    <Lock size={15} className="absolute left-3.5 text-teal-600 pointer-events-none" style={{ left: '14px' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={pinOrPassword}
                      onChange={(e) => setPinOrPassword(e.target.value)}
                      placeholder={tr(
                        'Enter 4-digit PIN or Password',
                        '4-अंकों का PIN या पासवर्ड लिखें',
                        '4-અંકનો PIN અથવા પાસવર્ડ લખો'
                      )}
                      className="w-full py-3 rounded-2xl border-2 border-teal-500 focus:border-teal-700 focus:outline-none text-sm font-black text-slate-900 tracking-wider"
                      style={{ paddingLeft: '40px', paddingRight: '40px' }}
                      autoFocus
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
                    <CheckCircle2 size={18} />
                  )}
                  <span>
                    {tr(
                      'Save PIN & Complete Login',
                      'PIN सेव करें और लॉगिन पूरा करें',
                      'PIN સેવ કરો અને લોગિન પૂર્ણ કરો'
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => finishSuccess()}
                  className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-extrabold text-xs transition-colors"
                >
                  {tr(
                    'Skip PIN & Continue Directly →',
                    'बिना PIN सेट किए सीधे आगे बढ़ें →',
                    'PIN સેટ કર્યા વગર સીધા આગળ વધો →'
                  )}
                </button>
              </form>
            ) : canLoginDirectlyWithPin ? (
              /* CASE 2: Returning Verified User Recognized in PostgreSQL */
              <form onSubmit={handleReturningPinLogin} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-700">
                      {checkedUser.hasPassword
                        ? tr(
                            '2. Enter Your Saved PIN / Password',
                            '2. अपना सेव किया हुआ PIN / पासवर्ड डालें',
                            '2. તમારો સેવ કરેલો PIN / પાસવર્ડ નાખો'
                          )
                        : tr(
                            '2. Set 4-Digit PIN / Password for Direct Login',
                            '2. सीधे लॉगिन के लिए 4-अंकों का PIN / पासवर्ड डालें',
                            '2. સીધા લોગિન માટે 4-અંકનો PIN / પાસવર્ડ નાખો'
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
                        'Forgot PIN? Login with OTP',
                        'PIN भूल गए? OTP से लॉगिन करें',
                        'PIN ભૂલી ગયા? OTP થી લોગિન કરો'
                      )}
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock size={15} className="absolute left-3.5 text-teal-600 pointer-events-none" style={{ left: '14px' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={pinOrPassword}
                      onChange={(e) => setPinOrPassword(e.target.value)}
                      placeholder={tr(
                        'Enter your 4-digit PIN or Password',
                        'अपना 4-अंकों का PIN या पासवर्ड लिखें',
                        'તમારો 4-અંકનો PIN અથવા પાસવર્ડ લખો'
                      )}
                      className="w-full py-3 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-black text-slate-900 tracking-wider"
                      style={{ paddingLeft: '40px', paddingRight: '40px' }}
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
                  <span>{tr('Login Now', 'अभी लॉगिन करें', 'અત્યારે જ લોગિન કરો')}</span>
                </button>
              </form>
            ) : (
              /* CASE 3: New User OR User without PIN OR Forgot PIN -> Mandatory OTP Verification First */
              <form onSubmit={handleVerifyOtpStep} className="space-y-3.5">
                {(!checkedUser.exists || !checkedUser.name) && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      {tr('Your Full Name', 'आपका पूरा नाम', 'તમારું પૂરું નામ')}
                    </label>
                    <div className="relative flex items-center">
                      <UserIcon size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" style={{ left: '14px' }} />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={tr(
                          'Enter your full name',
                          'अपना पूरा नाम लिखें',
                          'તમારું પૂરું નામ લખો'
                        )}
                        className="w-full py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-bold text-slate-900"
                        style={{ paddingLeft: '40px', paddingRight: '16px' }}
                      />
                    </div>
                  </div>
                )}

                {!otpSent ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSubmitting || cooldown > 0}
                      className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 border-b-4 border-teal-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <KeyRound size={18} />
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
                        className="w-full py-2 text-center text-xs font-extrabold text-teal-700 hover:underline"
                      >
                        {tr(
                          '← Back to Saved PIN / Password Login',
                          '← सेव किए गए PIN / पासवर्ड लॉगिन पर वापस जाएं',
                          '← સેવ કરેલા PIN / પાસવર્ડ લોગિન પર પાછા જાઓ'
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {devOtpHint && (
                      <div className="rounded-xl bg-teal-50 border border-teal-200 p-2.5 text-center">
                        <span className="text-[11px] font-bold text-teal-800">
                          {tr(
                            'Your Verification OTP:',
                            'आपका वेरिफिकेशन OTP:',
                            'તમારો વેરિફિકેશન OTP:'
                          )}{' '}
                        </span>
                        <span className="text-sm font-black text-teal-950 tracking-widest bg-white px-2 py-0.5 rounded-lg border border-teal-300">
                          {devOtpHint}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        {isValidEmail
                          ? tr(
                              'Enter 6-Digit Email OTP',
                              'ईमेल पर आया 6-अंकों का OTP डालें',
                              'ઈમેલ પર આવેલો 6-અંકનો OTP નાખો'
                            )
                          : tr(
                              'Enter 6-Digit Mobile OTP',
                              'मोबाइल पर आया 6-अंकों का OTP डालें',
                              'મોબાઇલ પર આવેલો 6-અંકનો OTP નાખો'
                            )}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="• • • • • •"
                        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-center text-lg font-black tracking-[0.35em] text-slate-900"
                        autoFocus
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
                        <span>
                          {cooldown > 0 ? `${cooldown}s` : tr('Resend', 'पुनः भेजें', 'ફરી મોકલો')}
                        </span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 border-b-4 border-teal-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                        <span>
                          {tr(
                            'Verify OTP & Continue',
                            'OTP वेरिफाई करें और आगे बढ़ें',
                            'OTP વેરિફાઈ કરો અને આગળ વધો'
                          )}
                        </span>
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

