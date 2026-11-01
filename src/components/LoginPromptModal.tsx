import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  User,
  Mail,
  KeyRound,
  Loader2,
  Smartphone,
  Fingerprint
} from 'lucide-react';
import { useLanguage } from '../i18n';
import {
  sendEmailOtp,
  verifyEmailOtp,
  sendMobileOtp,
  verifyMobileOtp,
  signInWithPassword,
  signUpWithPassword,
  resetUserPassword,
  isValidEmail,
  isValidPhone,
  isPhoneIdentifier,
  normalizeIndianPhone,
  isBiometricSupported,
  getSavedBiometricInfo,
  registerBiometricPasskey,
  signInWithBiometricPasskey,
  SavedBiometricPasskey,
  fetchMobileOtpDailyQuota
} from '../auth';
import {
  getOtpCooldownRemainingSeconds,
  getDailyMobileOtpStatus,
  MAX_DAILY_MOBILE_OTP
} from '../lib/security';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLogin?: () => void;
  onSuccess?: () => void;
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
  actionTitleEn = 'Sign In to LocoHelp',
  actionTitleHi = 'LocoHelp में लॉगिन करें',
  actionTitleGu = 'LocoHelp માં લોગિન કરો',
  actionDescEn,
  actionDescHi,
  actionDescGu
}: LoginPromptModalProps) {
  const { language, tr } = useLanguage();

  // Main Tabs: 'otp' | 'password' | 'biometric'
  const [authMode, setAuthMode] = useState<'otp' | 'password' | 'biometric'>('otp');
  // Inside OTP tab: 'mobile' | 'email'
  const [otpChannel, setOtpChannel] = useState<'mobile' | 'email'>('mobile');
  // Inside Password tab: 'login' | 'signup' | 'reset'
  const [passwordSubMode, setPasswordSubMode] = useState<'login' | 'signup' | 'reset'>('login');

  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [identifierInput, setIdentifierInput] = useState(''); // Mobile or Email in Password tab
  const [passwordInput, setPasswordInput] = useState('');

  const [otpCode, setOtpCode] = useState('');
  const [otpOptionalPassword, setOtpOptionalPassword] = useState('');
  const [otpStep, setOtpStep] = useState<'input' | 'verify'>('input');
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0);
  const [mobileOtpRemainingToday, setMobileOtpRemainingToday] = useState<number>(MAX_DAILY_MOBILE_OTP);
  const [mobileOtpUsedToday, setMobileOtpUsedToday] = useState<number>(0);

  const [isLoadingOtp, setIsLoadingOtp] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingBiometric, setIsLoadingBiometric] = useState(false);
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);

  const [biometricSupported, setBiometricSupported] = useState(false);
  const [savedBiometric, setSavedBiometric] = useState<SavedBiometricPasskey | null>(null);
  const [enableBiometricAfterLogin, setEnableBiometricAfterLogin] = useState(true);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    isBiometricSupported().then((supported) => {
      setBiometricSupported(supported);
      setEnableBiometricAfterLogin(supported);
    });
    const saved = getSavedBiometricInfo();
    setSavedBiometric(saved);

    // Pre-fill last used phone or email for convenience
    try {
      const lastPhone = localStorage.getItem('locohelp_last_logged_in_phone') || '';
      const lastEmail = localStorage.getItem('locohelp_last_logged_in_email') || '';
      if (lastPhone && !phoneInput) setPhoneInput(lastPhone);
      if (lastEmail && !lastEmail.endsWith('@phone.locohelp.com') && !emailInput) {
        setEmailInput(lastEmail);
      }
      if (!identifierInput) {
        if (lastPhone) setIdentifierInput(lastPhone);
        else if (lastEmail && !lastEmail.endsWith('@phone.locohelp.com')) setIdentifierInput(lastEmail);
      }
    } catch {}
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const activeCooldownKey =
      authMode === 'otp'
        ? otpChannel === 'mobile'
          ? `phone_${normalizeIndianPhone(phoneInput)}`
          : emailInput.trim().toLowerCase()
        : isPhoneIdentifier(identifierInput)
          ? `phone_${normalizeIndianPhone(identifierInput)}`
          : identifierInput.trim().toLowerCase();

    const tick = () => {
      const rem = activeCooldownKey ? getOtpCooldownRemainingSeconds(activeCooldownKey) : 0;
      setOtpCooldownSeconds(rem);
      const activePhone =
        authMode === 'otp' && otpChannel === 'mobile'
          ? normalizeIndianPhone(phoneInput)
          : isPhoneIdentifier(identifierInput)
            ? normalizeIndianPhone(identifierInput)
            : '';
      const status = getDailyMobileOtpStatus(activePhone);
      setMobileOtpUsedToday(status.usedToday);
      setMobileOtpRemainingToday(status.remainingToday);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOpen, authMode, otpChannel, phoneInput, emailInput, identifierInput]);

  // Sync live daily OTP quota from PostgreSQL server whenever a 10-digit mobile number is entered
  useEffect(() => {
    if (!isOpen) return;
    const candidatePhone =
      authMode === 'otp' && otpChannel === 'mobile'
        ? normalizeIndianPhone(phoneInput)
        : isPhoneIdentifier(identifierInput)
          ? normalizeIndianPhone(identifierInput)
          : '';
    if (candidatePhone.length === 10) {
      fetchMobileOtpDailyQuota(candidatePhone).then((q) => {
        setMobileOtpUsedToday(q.usedToday);
        setMobileOtpRemainingToday(q.remainingToday);
        if (q.cooldownRemaining > 0) {
          setOtpCooldownSeconds(q.cooldownRemaining);
        }
      });
    }
  }, [isOpen, authMode, otpChannel, phoneInput, identifierInput]);

  useEffect(() => {
    setErrorMessage(null);
    setInfoMessage(null);
  }, [language]);

  if (!isOpen) return null;

  const openTermsScreen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    window.dispatchEvent(new CustomEvent('locohelp_open_terms'));
  };

  const openPrivacyPopup = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPrivacyModal(true);
  };

  const renderTermsConsentText = () => {
    if (language === 'GU') {
      return (
        <>
          હું તમામ{' '}
          <button
            type="button"
            onClick={openTermsScreen}
            className="text-indigo-600 dark:text-indigo-400 underline font-extrabold hover:text-indigo-700 cursor-pointer"
          >
            નિયમો અને શરતો
          </button>{' '}
          તથા{' '}
          <button
            type="button"
            onClick={openPrivacyPopup}
            className="text-indigo-600 dark:text-indigo-400 underline font-extrabold hover:text-indigo-700 cursor-pointer"
          >
            ગોપનીયતા નીતિ
          </button>{' '}
          સાથે સંમત છું.
        </>
      );
    }
    if (language === 'HI') {
      return (
        <>
          मैं सभी{' '}
          <button
            type="button"
            onClick={openTermsScreen}
            className="text-indigo-600 dark:text-indigo-400 underline font-extrabold hover:text-indigo-700 cursor-pointer"
          >
            नियम एवं शर्तों
          </button>{' '}
          और{' '}
          <button
            type="button"
            onClick={openPrivacyPopup}
            className="text-indigo-600 dark:text-indigo-400 underline font-extrabold hover:text-indigo-700 cursor-pointer"
          >
            गोपनीयता नीति
          </button>{' '}
          से सहमत हूँ।
        </>
      );
    }
    return (
      <>
        I agree to all the{' '}
        <button
          type="button"
          onClick={openTermsScreen}
          className="text-indigo-600 dark:text-indigo-400 underline font-extrabold hover:text-indigo-700 cursor-pointer"
        >
          Terms & Conditions
        </button>{' '}
        and{' '}
        <button
          type="button"
          onClick={openPrivacyPopup}
          className="text-indigo-600 dark:text-indigo-400 underline font-extrabold hover:text-indigo-700 cursor-pointer"
        >
          Privacy Policy
        </button>
        .
      </>
    );
  };

  // Helper to optionally register Biometric Passkey right after successful login
  const maybeRegisterBiometricAfterLogin = async (loggedInUser?: any) => {
    if (biometricSupported && enableBiometricAfterLogin && !savedBiometric) {
      try {
        await registerBiometricPasskey(loggedInUser);
        setSavedBiometric(getSavedBiometricInfo());
      } catch {}
    }
  };

  // ==========================================
  // 1. SEND OTP (MOBILE SMS OR EMAIL)
  // ==========================================
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!termsAccepted) {
      setErrorMessage(
        tr(
          'Please accept the Terms & Conditions and Privacy Policy checkbox below to continue.',
          'आगे बढ़ने के लिए कृपया नीचे दिए गए नियम एवं शर्तों वाले बॉक्स को टिक करें।',
          'આગળ વધવા માટે કૃપા કરીને નીચે આપેલ નિયમો અને શરતો બોક્સને ટિક કરો.'
        )
      );
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);

    if (otpChannel === 'mobile') {
      const cleanDigits = normalizeIndianPhone(phoneInput);
      if (!isValidPhone(cleanDigits)) {
        setErrorMessage(
          tr(
            'Please enter a valid 10-digit Indian mobile number.',
            'कृपया 10-अंकों का सही मोबाइल नंबर दर्ज करें।',
            'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર દાખલ કરો.'
          )
        );
        return;
      }

      setIsLoadingOtp(true);
      const res = await sendMobileOtp(cleanDigits, 'recaptcha-container');
      setIsLoadingOtp(false);

      if (typeof res.usedToday === 'number') setMobileOtpUsedToday(res.usedToday);
      if (typeof res.remainingToday === 'number') setMobileOtpRemainingToday(res.remainingToday);

      if (res.success) {
        setOtpStep('verify');
        setOtpCooldownSeconds(res.cooldownRemaining || 60);
        const remAfter = typeof res.remainingToday === 'number' ? res.remainingToday : Math.max(0, mobileOtpRemainingToday - 1);
        setInfoMessage(
          tr(
            `📱 6-digit SMS OTP sent to +91 ${cleanDigits}! (Remaining today: ${remAfter}/${MAX_DAILY_MOBILE_OTP}). Set a password below so you never need OTP again.`,
            `📱 +91 ${cleanDigits} पर 6-अंकों का SMS OTP भेज दिया गया है! (आज बचे हुए OTP: ${remAfter}/${MAX_DAILY_MOBILE_OTP})। नीचे पासवर्ड बना लें ताकि बार-बार OTP न लगे।`,
            `📱 +91 ${cleanDigits} પર 6-અંકનો SMS OTP મોકલાયો છે! (આજે બાકી OTP: ${remAfter}/${MAX_DAILY_MOBILE_OTP}). નીચે પાસવર્ડ સેટ કરો જેથી ફરી OTP ન લાગે.`
          )
        );
      } else {
        if (res.cooldownRemaining) setOtpCooldownSeconds(res.cooldownRemaining);
        setErrorMessage(
          res.error ||
            tr('Failed to send SMS OTP', 'मोबाइल पर OTP भेजने में विफल', 'મોબાઇલ પર OTP મોકલવામાં નિષ્ફળ')
        );
      }
      return;
    }

    // Email OTP Channel
    if (!emailInput || !isValidEmail(emailInput)) {
      setErrorMessage(
        tr(
          'Please enter a valid real email address (e.g., name@gmail.com)',
          'कृपया मान्य असली ईमेल आईडी दर्ज करें (जैसे name@gmail.com)',
          'કૃપા કરીને સાચો ઈમેલ આઈડી દાખલ કરો (દા.ત. name@gmail.com)'
        )
      );
      return;
    }

    setIsLoadingOtp(true);
    const res = await sendEmailOtp(emailInput);
    setIsLoadingOtp(false);

    if (res.success) {
      setOtpStep('verify');
      setOtpCooldownSeconds(res.cooldownRemaining || 60);
      if (res.devCode) {
        setOtpCode(res.devCode);
        setInfoMessage(
          tr(
            `Your 6-Digit Email OTP Code is: ${res.devCode}`,
            `आपका 6-अंकों का ईमेल OTP कोड है: ${res.devCode}`,
            `તમારો 6-અંકનો ઈમેલ OTP કોડ છે: ${res.devCode}`
          )
        );
      } else {
        setInfoMessage(
          tr(
            `📧 6-digit OTP sent to ${emailInput}. Check your Inbox/Spam and enter it below!`,
            `📧 ${emailInput} पर 6-अंकों का OTP भेज दिया गया है। अपना इनबॉक्स (या Spam) देखकर नीचे दर्ज करें!`,
            `📧 ${emailInput} પર 6-અંકનો OTP મોકલાયો છે. તમારું ઇનબોક્સ તપાસો અને નીચે દાખલ કરો!`
          )
        );
      }
    } else {
      if (res.cooldownRemaining) setOtpCooldownSeconds(res.cooldownRemaining);
      setErrorMessage(
        res.error || tr('Failed to send OTP', 'OTP भेजने में विफल', 'OTP મોકલવામાં નિષ્ફળ')
      );
    }
  };

  // ==========================================
  // 2. VERIFY OTP (MOBILE SMS OR EMAIL)
  // ==========================================
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setErrorMessage(
        tr(
          'Please accept the Terms & Conditions and Privacy Policy checkbox below to continue.',
          'आगे बढ़ने के लिए कृपया नीचे दिए गए नियम एवं शर्तों वाले बॉक्स को टिक करें।',
          'આગળ વધવા માટે કૃપા કરીને નીચે આપેલ નિયમો અને શરતો બોક્સને ટિક કરો.'
        )
      );
      return;
    }
    if (!otpCode || otpCode.trim().length < 6) {
      setErrorMessage(
        tr(
          'Please enter the 6-digit OTP code',
          'कृपया 6-अंकों का OTP कोड दर्ज करें',
          'કૃપા કરીને 6-અંકનો OTP કોડ દાખલ કરો'
        )
      );
      return;
    }
    if (otpOptionalPassword && otpOptionalPassword.trim().length > 0 && otpOptionalPassword.trim().length < 6) {
      setErrorMessage(
        tr(
          'Password must be at least 6 characters (or leave blank)',
          'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (या खाली छोड़ें)',
          'પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરોનો હોવો જોઈએ (અથવા ખાલી છોડો)'
        )
      );
      return;
    }

    setIsLoadingOtp(true);
    setErrorMessage(null);

    if (otpChannel === 'mobile') {
      const cleanDigits = normalizeIndianPhone(phoneInput);
      const res = await verifyMobileOtp(
        cleanDigits,
        otpCode,
        otpOptionalPassword.trim() || undefined,
        nameInput.trim() || undefined
      );
      setIsLoadingOtp(false);

      if (res.success) {
        await maybeRegisterBiometricAfterLogin(res.user);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(
          res.error || tr('Invalid OTP code', 'गलत OTP कोड', 'ખોટો OTP કોડ')
        );
      }
      return;
    }

    // Verify Email OTP
    const res = await verifyEmailOtp(emailInput, otpCode, otpOptionalPassword.trim() || undefined);
    setIsLoadingOtp(false);

    if (res.success) {
      await maybeRegisterBiometricAfterLogin(res.user);
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMessage(
        res.error || tr('Invalid OTP code', 'गलत OTP कोड', 'ખોટો OTP કોડ')
      );
    }
  };

  // ==========================================
  // 3. PASSWORD TAB: SEND OTP FOR SIGNUP OR RESET
  // ==========================================
  const handleSendPasswordOtp = async () => {
    const raw = identifierInput.trim();
    const isPhone = isPhoneIdentifier(raw);

    if (!isPhone && !isValidEmail(raw)) {
      setErrorMessage(
        tr(
          'Please enter a valid 10-digit Mobile Number or Email Address first.',
          'कृपया पहले 10-अंकों का सही मोबाइल नंबर या ईमेल आईडी दर्ज करें।',
          'કૃપા કરીને પહેલા 10-અંકનો સાચો મોબાઇલ નંબર અથવા ઈમેલ દાખલ કરો.'
        )
      );
      return;
    }

    setIsLoadingOtp(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (isPhone) {
      const cleanDigits = normalizeIndianPhone(raw);
      const res = await sendMobileOtp(cleanDigits, 'recaptcha-container');
      setIsLoadingOtp(false);
      if (typeof res.usedToday === 'number') setMobileOtpUsedToday(res.usedToday);
      if (typeof res.remainingToday === 'number') setMobileOtpRemainingToday(res.remainingToday);
      if (res.success) {
        setPasswordOtpSent(true);
        setOtpCooldownSeconds(res.cooldownRemaining || 60);
        const remAfter = typeof res.remainingToday === 'number' ? res.remainingToday : Math.max(0, mobileOtpRemainingToday - 1);
        setInfoMessage(
          tr(
            `📱 6-digit SMS OTP sent to +91 ${cleanDigits} (Remaining today: ${remAfter}/${MAX_DAILY_MOBILE_OTP}). Enter it below!`,
            `📱 +91 ${cleanDigits} पर 6-अंकों का SMS OTP भेज दिया गया है (आज बचे OTP: ${remAfter}/${MAX_DAILY_MOBILE_OTP})। नीचे दर्ज करें!`,
            `📱 +91 ${cleanDigits} પર 6-અંકનો SMS OTP મોકલાયો છે (આજે બાકી OTP: ${remAfter}/${MAX_DAILY_MOBILE_OTP}). નીચે દાખલ કરો!`
          )
        );
      } else {
        if (res.cooldownRemaining) setOtpCooldownSeconds(res.cooldownRemaining);
        setErrorMessage(res.error || tr('Failed to send SMS OTP', 'SMS OTP भेजने में विफल', 'SMS OTP મોકલવામાં નિષ્ફળ'));
      }
      return;
    }

    const res = await sendEmailOtp(raw);
    setIsLoadingOtp(false);
    if (res.success) {
      setPasswordOtpSent(true);
      setOtpCooldownSeconds(res.cooldownRemaining || 60);
      if (res.devCode) {
        setOtpCode(res.devCode);
        setInfoMessage(
          tr(
            `Your 6-Digit Email OTP Code is: ${res.devCode}`,
            `आपका 6-अंकों का ईमेल OTP कोड है: ${res.devCode}`,
            `તમારો 6-અંકનો ઈમેલ OTP કોડ છે: ${res.devCode}`
          )
        );
      } else {
        setInfoMessage(
          tr(
            `📧 6-digit OTP sent to ${raw}. Check your Inbox and enter it below!`,
            `📧 ${raw} पर 6-अंकों का OTP भेज दिया गया है। अपना इनबॉक्स देखकर नीचे दर्ज करें!`,
            `📧 ${raw} પર 6-અંકનો OTP મોકલાયો છે. તમારું ઇનબોક્સ તપાસો અને નીચે દાખલ કરો!`
          )
        );
      }
    } else {
      if (res.cooldownRemaining) setOtpCooldownSeconds(res.cooldownRemaining);
      setErrorMessage(res.error || tr('Failed to send OTP', 'OTP भेजने में विफल', 'OTP મોકલવામાં નિષ્ફળ'));
    }
  };

  // ==========================================
  // 4. PASSWORD TAB: LOGIN / SIGNUP / RESET
  // ==========================================
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setErrorMessage(
        tr(
          'Please accept the Terms & Conditions and Privacy Policy checkbox below to continue.',
          'आगे बढ़ने के लिए कृपया नीचे दिए गए नियम एवं शर्तों वाले बॉक्स को टिक करें।',
          'આગળ વધવા માટે કૃપા કરીને નીચે આપેલ નિયમો અને શરતો બોક્સને ટિક કરો.'
        )
      );
      return;
    }

    const raw = identifierInput.trim();
    if (!raw || (!isPhoneIdentifier(raw) && !isValidEmail(raw))) {
      setErrorMessage(
        tr(
          'Please enter a valid 10-digit Mobile Number or Email Address',
          'कृपया 10-अंकों का सही मोबाइल नंबर या ईमेल आईडी दर्ज करें',
          'કૃપા કરીને 10-અંકનો સાચો મોબાઇલ નંબર અથવા ઈમેલ આઈડી દાખલ કરો'
        )
      );
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      setErrorMessage(
        tr(
          'Password must be at least 6 characters',
          'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए',
          'પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરોનો હોવો જોઈએ'
        )
      );
      return;
    }

    if (passwordSubMode === 'signup' || passwordSubMode === 'reset') {
      if (!otpCode || otpCode.trim().length < 6) {
        setErrorMessage(
          tr(
            'Please click "Send OTP" and enter the 6-digit OTP sent to your Mobile or Email.',
            'अकाउंट वेरिफाई करने के लिए पहले "OTP मंगाएं" पर क्लिक करें और 6-अंकों का OTP डालें।',
            'એકાઉન્ટ ચકાસવા માટે પહેલા "OTP મંગાવો" પર ક્લિક કરો અને 6-અંકનો OTP દાખલ કરો.'
          )
        );
        return;
      }
    }

    setIsLoadingPassword(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (passwordSubMode === 'signup') {
      const res = await signUpWithPassword(raw, passwordInput, nameInput, undefined, otpCode);
      setIsLoadingPassword(false);
      if (res.success) {
        await maybeRegisterBiometricAfterLogin(res.user);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || tr('Sign up failed', 'रजिस्ट्रेशन विफल', 'રજિસ્ટ્રેશન નિષ્ફળ'));
      }
    } else if (passwordSubMode === 'reset') {
      const res = await resetUserPassword(raw, passwordInput, nameInput, otpCode);
      setIsLoadingPassword(false);
      if (res.success) {
        await maybeRegisterBiometricAfterLogin(res.user);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(
          res.error || tr('Failed to set password', 'पासवर्ड सेट करने में विफल', 'પાસવર્ડ સેટ કરવામાં નિષ્ફળ')
        );
      }
    } else {
      const res = await signInWithPassword(raw, passwordInput);
      setIsLoadingPassword(false);
      if (res.success) {
        await maybeRegisterBiometricAfterLogin(res.user);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || tr('Login failed', 'लॉगिन विफल', 'લોગિન નિષ્ફળ'));
      }
    }
  };

  // ==========================================
  // 5. BIOMETRIC (FINGERPRINT / FACE LOCK) 1-TAP LOGIN
  // ==========================================
  const handleBiometricLogin = async () => {
    if (!termsAccepted) {
      setErrorMessage(
        tr(
          'Please accept the Terms & Conditions and Privacy Policy checkbox below to continue.',
          'आगे बढ़ने के लिए कृपया नीचे दिए गए नियम एवं शर्तों वाले बॉक्स को टिक करें।',
          'આગળ વધવા માટે કૃપા કરીને નીચે આપેલ નિયમો અને શરતો બોક્સને ટિક કરો.'
        )
      );
      return;
    }

    setIsLoadingBiometric(true);
    setErrorMessage(null);
    setInfoMessage(null);

    const res = await signInWithBiometricPasskey();
    setIsLoadingBiometric(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMessage(
        res.error ||
          tr(
            'Biometric login failed. Please log in once using Mobile/Email OTP or Password.',
            'फिंगरप्रिंट से लॉगिन नहीं हो सका। कृपया एक बार मोबाइल/ईमेल OTP या पासवर्ड से लॉगिन करें।',
            'ફિંગરપ્રિન્ટથી લોગિન નિષ્ફળ રહ્યું. કૃપા કરીને એકવાર OTP અથવા પાસવર્ડથી લોગિન કરો.'
          )
      );
    }
  };

  const resolvedTitle =
    language === 'GU'
      ? actionTitleGu || actionTitleHi || actionTitleEn
      : language === 'HI'
        ? actionTitleHi || actionTitleEn
        : actionTitleEn;

  const resolvedDesc =
    language === 'GU'
      ? actionDescGu ||
        'મોબાઇલ OTP, ઈમેલ, પાસવર્ડ અથવા ફિંગરપ્રિન્ટ દ્વારા સુરક્ષિત લોગિન કરો.'
      : language === 'HI'
        ? actionDescHi ||
          'मोबाइल OTP, ईमेल, पासवर्ड या फिंगरप्रिंट से तुरंत सुरक्षित लॉगिन करें।'
        : actionDescEn ||
          'Sign in securely via Mobile OTP, Email, Password, or 1-Tap Fingerprint Lock.';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
        style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative z-50 p-5 flex flex-col items-center text-center space-y-3.5 my-auto"
        >
          {/* Invisible Firebase Phone Auth reCAPTCHA Mount Point */}
          <div id="recaptcha-container" className="hidden" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={tr('Close', 'बंद करें', 'બંધ કરો')}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Brand Badge */}
          <div className="relative mt-0.5">
            <div className="w-13 h-13 rounded-2xl bg-indigo-600 text-white shadow-lg flex items-center justify-center">
              {authMode === 'biometric' ? (
                <Fingerprint className="w-7 h-7" />
              ) : authMode === 'password' ? (
                <KeyRound className="w-6 h-6" />
              ) : otpChannel === 'mobile' ? (
                <Smartphone className="w-6 h-6" />
              ) : (
                <Mail className="w-6 h-6" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-[10px]">
              <ShieldCheck className="w-3 h-3" />
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-900">
              ⚡ {tr(
                'Mobile OTP • Email • Password • Biometric',
                'मोबाइल OTP • ईमेल • पासवर्ड • फिंगरप्रिंट',
                'મોબાઇલ OTP • ઈમેલ • પાસવર્ડ • ફિંગરપ્રિન્ટ'
              )}
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2 leading-snug">
              {resolvedTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-0.5 px-1">
              {resolvedDesc}
            </p>
          </div>

          {/* Quick 1-Tap Biometric Banner if already registered on this device */}
          {savedBiometric && authMode !== 'biometric' && (
            <div className="w-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-left min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-emerald-950 dark:text-emerald-200 truncate">
                    {savedBiometric.name}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 truncate">
                    {tr('1-Tap Fingerprint Ready', '1-टैप फिंगरप्रिंट लॉगिन तैयार', '1-ટેપ ફિંગરપ્રિન્ટ તૈયાર')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('biometric');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shrink-0 cursor-pointer transition-all"
              >
                {tr('Tap to Login', 'फिंगरप्रिंट लॉगिन', 'લોગિન કરો')}
              </button>
            </div>
          )}

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
          <div className="w-full space-y-3 pt-0.5">
            {/* MAIN 3 TABS: OTP | PASSWORD | BIOMETRIC */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('otp');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className={`flex-1 py-2 px-2 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  authMode === 'otp'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('OTP Login', 'OTP लॉगिन', 'OTP લોગિન')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('password');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className={`flex-1 py-2 px-2 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  authMode === 'password'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('Password', 'पासवर्ड', 'પાસવર્ડ')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('biometric');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className={`flex-1 py-2 px-2 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  authMode === 'biometric'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('Biometric', 'फिंगरप्रिंट', 'ફિંગરપ્રિન્ટ')}</span>
              </button>
            </div>

            {/* ===================================================== */}
            {/* TAB 1: MOBILE OTP OR EMAIL OTP                        */}
            {/* ===================================================== */}
            {authMode === 'otp' && (
              <div className="space-y-2.5">
                {/* Channel Switcher: Mobile SMS OTP vs Email OTP */}
                {otpStep === 'input' && (
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpChannel('mobile');
                        setErrorMessage(null);
                        setInfoMessage(null);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        otpChannel === 'mobile'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>{tr('Mobile OTP', 'मोबाइल OTP', 'મોબાઇલ OTP')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpChannel('email');
                        setErrorMessage(null);
                        setInfoMessage(null);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        otpChannel === 'email'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{tr('Email OTP', 'ईमेल OTP', 'ઈમેલ OTP')}</span>
                    </button>
                  </div>
                )}

                {otpStep === 'input' ? (
                  <form onSubmit={handleSendOtp} className="space-y-2.5">
                    {otpChannel === 'mobile' ? (
                      <div className="space-y-2">
                        <div className="flex items-center w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:border-indigo-500 transition-all">
                          <span className="px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/70 border-r border-slate-200 dark:border-slate-700 text-xs font-black text-indigo-600 dark:text-indigo-400 select-none shrink-0">
                            +91
                          </span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder={tr(
                              'Enter 10-digit Mobile Number',
                              'अपना 10-अंकों का मोबाइल नंबर डालें',
                              'તમારો 10-અંકનો મોબાઇલ નંબર નાખો'
                            )}
                            className="flex-1 min-w-0 bg-transparent py-2.5 px-3 text-xs font-bold tracking-wide text-slate-900 dark:text-white outline-none"
                            required
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold text-left px-1">
                          💡 {tr(
                            'Already set a password? Use the "Password" tab above for instant login without waiting for SMS.',
                            'यदि आप पहले पासवर्ड बना चुके हैं, तो ऊपर "पासवर्ड" टैब से बिना OTP तुरंत लॉगिन करें।',
                            'જો તમે પહેલેથી પાસવર્ડ બનાવ્યો હોય, તો ઉપર "પાસવર્ડ" ટેબથી સીધા લોગિન કરો.'
                          )}
                        </p>
                        <div
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[10px] font-extrabold ${
                            mobileOtpRemainingToday === 0
                              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                              : 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          <span>
                            🛡️{' '}
                            {tr(
                              `Daily SMS Limit: Max ${MAX_DAILY_MOBILE_OTP} OTPs/day`,
                              `दैनिक सुरक्षा सीमा: 1 दिन में अधिकतम ${MAX_DAILY_MOBILE_OTP} OTP`,
                              `દૈનિક સુરક્ષા મર્યાદા: દિવસમાં મહત્તમ ${MAX_DAILY_MOBILE_OTP} OTP`
                            )}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 font-black">
                            {tr(
                              `Left today: ${mobileOtpRemainingToday}/${MAX_DAILY_MOBILE_OTP}`,
                              `आज बचे: ${mobileOtpRemainingToday}/${MAX_DAILY_MOBILE_OTP}`,
                              `આજે બાકી: ${mobileOtpRemainingToday}/${MAX_DAILY_MOBILE_OTP}`
                            )}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:border-indigo-500 transition-all px-3.5">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder={tr(
                            'Enter your real email address for OTP',
                            'OTP कोड के लिए अपना असली ईमेल दर्ज करें',
                            'OTP કોડ માટે તમારો સાચો ઈમેલ દાખલ કરો'
                          )}
                          className="flex-1 min-w-0 bg-transparent py-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none"
                          required
                        />
                      </div>
                    )}

                    <label className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => {
                          setTermsAccepted(e.target.checked);
                          if (e.target.checked) setErrorMessage(null);
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer accent-indigo-600"
                      />
                      <span className="text-[11px] leading-snug font-semibold text-slate-700 dark:text-slate-300">
                        {renderTermsConsentText()}
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={
                        isLoadingOtp ||
                        (otpChannel === 'mobile'
                          ? phoneInput.trim().length < 10 || mobileOtpRemainingToday <= 0
                          : !emailInput.trim()) ||
                        !termsAccepted ||
                        otpCooldownSeconds > 0
                      }
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-xs py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/20"
                    >
                      {isLoadingOtp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      <span>
                        {isLoadingOtp
                          ? tr('Sending OTP Code...', 'OTP कोड भेजा जा रहा है...', 'OTP કોડ મોકલાઈ રહ્યો છે...')
                          : otpChannel === 'mobile' && mobileOtpRemainingToday <= 0
                            ? tr(
                                'Daily 3 OTP Limit Reached (Use Password / Email)',
                                'आज के 3 OTP पूरे हो गए (पासवर्ड / ईमेल चुनें)',
                                'આજના 3 OTP પૂર્ણ (પાસવર્ડ / ઈમેલ વાપરો)'
                              )
                            : otpCooldownSeconds > 0
                              ? tr(
                                  `Resend OTP in ${otpCooldownSeconds}s`,
                                  `${otpCooldownSeconds} सेकंड में पुनः भेजें`,
                                  `${otpCooldownSeconds} સેકન્ડમાં ફરી મોકલો`
                                )
                              : otpChannel === 'mobile'
                                ? tr(
                                    `Send 6-Digit Mobile SMS OTP (${mobileOtpRemainingToday}/${MAX_DAILY_MOBILE_OTP} left)`,
                                    `मोबाइल पर 6-अंकों का OTP भेजें (${mobileOtpRemainingToday}/${MAX_DAILY_MOBILE_OTP} बचे)`,
                                    `મોબાઇલ પર 6-અંકનો OTP મોકલો (${mobileOtpRemainingToday}/${MAX_DAILY_MOBILE_OTP} બાકી)`
                                  )
                                : tr('Send 6-Digit Email OTP Code', 'ईमेल पर 6-अंकों का OTP भेजें', 'ઈમેલ પર 6-અંકનો OTP મોકલો')}
                      </span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1">
                      <span className="truncate">
                        {otpChannel === 'mobile'
                          ? `${tr('Mobile:', 'मोबाइल:', 'મોબાઇલ:')} +91 ${phoneInput}`
                          : `${tr('Email:', 'ईमेल:', 'ઈમેલ:')} ${emailInput}`}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 ml-1">
                        <button
                          type="button"
                          disabled={
                            otpCooldownSeconds > 0 ||
                            isLoadingOtp ||
                            (otpChannel === 'mobile' && mobileOtpRemainingToday <= 0)
                          }
                          onClick={() => handleSendOtp()}
                          className="text-emerald-600 dark:text-emerald-400 disabled:text-slate-400 hover:underline cursor-pointer"
                        >
                          {otpChannel === 'mobile' && mobileOtpRemainingToday <= 0
                            ? tr('0/3 Left Today', 'आज 0/3 बचे', 'આજે 0/3 બાકી')
                            : otpCooldownSeconds > 0
                              ? tr(
                                  `Resend (${otpCooldownSeconds}s)`,
                                  `पुनः भेजें (${otpCooldownSeconds}s)`,
                                  `ફરી મોકલો (${otpCooldownSeconds}s)`
                                )
                              : tr('Resend OTP', 'OTP पुनः भेजें', 'OTP ફરી મોકલો')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpStep('input');
                            setErrorMessage(null);
                            setInfoMessage(null);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          {tr('Change', 'बदलें', 'બદલો')}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:border-indigo-500 transition-all px-3.5">
                      <KeyRound className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder={tr(
                          'Enter 6-Digit OTP Code',
                          '6-अंकों का OTP कोड डालें',
                          '6-અંકનો OTP કોડ નાખો'
                        )}
                        className="flex-1 min-w-0 bg-transparent py-2.5 text-sm font-black tracking-widest text-slate-900 dark:text-white outline-none text-center"
                        required
                        autoFocus
                      />
                    </div>

                    {otpChannel === 'mobile' && (
                      <div className="flex items-center w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:border-indigo-500 transition-all px-3.5">
                        <User className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder={tr(
                            'Your Name (Optional for new users)',
                            'आपका नाम (नए यूज़र के लिए वैकल्पिक)',
                            'તમારું નામ (નવા યુઝર માટે વૈકલ્પિક)'
                          )}
                          className="flex-1 min-w-0 bg-transparent py-2 text-[11px] font-medium text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    )}

                    {/* Strongly recommended password creation to save future OTPs */}
                    <div className="flex items-center w-full bg-indigo-50/50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:border-indigo-500 transition-all px-3.5">
                      <Lock className="w-4 h-4 text-indigo-500 shrink-0 mr-2.5" />
                      <input
                        type="password"
                        value={otpOptionalPassword}
                        onChange={(e) => setOtpOptionalPassword(e.target.value)}
                        placeholder={tr(
                          'Create Password (min 6 chars - login without OTP next time)',
                          'अपना पासवर्ड बनाएं (ताकि अगली बार बिना OTP लॉगिन हो सके)',
                          'પાસવર્ડ બનાવો (આગલી વખતે OTP વગર લોગિન કરવા માટે)'
                        )}
                        className="flex-1 min-w-0 bg-transparent py-2 text-[11px] font-semibold text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    {/* Optional 1-Tap Biometric Setup Checkbox */}
                    {biometricSupported && !savedBiometric && (
                      <label className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 text-left cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={enableBiometricAfterLogin}
                          onChange={(e) => setEnableBiometricAfterLogin(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer shrink-0"
                        />
                        <Fingerprint className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-[10.5px] font-bold text-emerald-900 dark:text-emerald-200 leading-tight">
                          {tr(
                            'Enable Fingerprint / Face Lock for 1-Tap login next time',
                            'अगली बार 1-टैप फिंगरप्रिंट / फेस लॉक से लॉगिन चालू करें',
                            'આગલી વખતે 1-ટેપ ફિંગરપ્રિન્ટ / ફેસ લોક ચાલુ કરો'
                          )}
                        </span>
                      </label>
                    )}

                    <label className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => {
                          setTermsAccepted(e.target.checked);
                          if (e.target.checked) setErrorMessage(null);
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer accent-emerald-600"
                      />
                      <span className="text-[11px] leading-snug font-semibold text-slate-700 dark:text-slate-300">
                        {renderTermsConsentText()}
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isLoadingOtp || otpCode.trim().length < 6 || !termsAccepted}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/20"
                    >
                      {isLoadingOtp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>
                        {isLoadingOtp
                          ? tr('Verifying OTP...', 'सत्यापित हो रहा है...', 'OTP ચકાસાઈ રહ્યો છે...')
                          : tr('Verify OTP & Sign In', 'OTP सत्यापित करें और लॉगिन करें', 'OTP ચકાસીને લોગિન કરો')}
                      </span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ===================================================== */}
            {/* TAB 2: MOBILE OR EMAIL + PASSWORD LOGIN               */}
            {/* ===================================================== */}
            {authMode === 'password' && (
              <form onSubmit={handlePasswordAuth} className="space-y-2">
                {passwordSubMode === 'reset' && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2 text-[11px] font-bold text-amber-800 dark:text-amber-200 text-left">
                    🛡️ {tr(
                      'Verify your Mobile Number or Email via 6-digit OTP to set or reset your password:',
                      'पासवर्ड सेट या रीसेट करने के लिए अपने मोबाइल नंबर या ईमेल पर OTP मंगाकर वेरिफाई करें:',
                      'પાસવર્ડ સેટ અથવા રીસેટ કરવા માટે તમારા મોબાઇલ નંબર અથવા ઈમેલ પર OTP મંગાવીને ચકાસો:'
                    )}
                  </div>
                )}
                {passwordSubMode === 'signup' && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl p-2 text-[11px] font-bold text-indigo-800 dark:text-indigo-200 text-left">
                    🛡️ {tr(
                      'New Account requires Mobile or Email OTP verification:',
                      'नया अकाउंट बनाने के लिए मोबाइल या ईमेल का OTP वेरिफिकेशन अनिवार्य है:',
                      'નવું એકાઉન્ટ બનાવવા માટે મોબાઇલ અથવા ઈમેલનું OTP વેરિફિકેશન ફરજિયાત છે:'
                    )}
                  </div>
                )}

                {passwordSubMode === 'signup' && (
                  <div className="flex items-center w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:border-indigo-500 transition-all px-3.5">
                    <User className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder={tr('Your Full Name', 'आपका पूरा नाम', 'તમારું પૂરું નામ')}
                      className="flex-1 min-w-0 bg-transparent py-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none"
                      required={passwordSubMode === 'signup'}
                    />
                  </div>
                )}

                <div className="flex items-center w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:border-indigo-500 transition-all px-3.5">
                  {isPhoneIdentifier(identifierInput) ? (
                    <Smartphone className="w-4 h-4 text-indigo-500 shrink-0 mr-2.5" />
                  ) : (
                    <Mail className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  )}
                  <input
                    type="text"
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    placeholder={tr(
                      '10-Digit Mobile Number OR Email ID',
                      '10-अंकों का मोबाइल नंबर या ईमेल आईडी',
                      '10-અંકનો મોબાઇલ નંબર અથવા ઈમેલ આઈડી'
                    )}
                    className="flex-1 min-w-0 bg-transparent py-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none"
                    required
                  />
                </div>

                {/* Mandatory 6-Digit Mobile or Email OTP Verification for Signup & Password Reset */}
                {(passwordSubMode === 'signup' || passwordSubMode === 'reset') && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <div className="flex items-center flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:border-emerald-500 transition-all px-3">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mr-2" />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder={tr('6-Digit OTP Code', '6-अंकों का OTP कोड', '6-અંકનો OTP કોડ')}
                          className="flex-1 min-w-0 bg-transparent py-2.5 text-xs font-black tracking-widest text-slate-900 dark:text-white outline-none"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isLoadingOtp || !identifierInput.trim() || otpCooldownSeconds > 0}
                        onClick={handleSendPasswordOtp}
                        className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[11px] font-black shrink-0 cursor-pointer transition-all"
                      >
                        {isLoadingOtp
                          ? '...'
                          : otpCooldownSeconds > 0
                            ? `${otpCooldownSeconds}s`
                            : passwordOtpSent
                              ? tr('Resend OTP', 'पुनः भेजें', 'ફરી મોકલો')
                              : tr('Send OTP', 'OTP मंगाएं', 'OTP મંગાવો')}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:border-indigo-500 transition-all px-3.5">
                  <KeyRound className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={
                      passwordSubMode === 'reset'
                        ? tr(
                            'Enter New Password (min 6 chars)',
                            'नया पासवर्ड डालें (कम से कम 6 अक्षर)',
                            'નવો પાસવર્ડ નાખો (ઓછામાં ઓછા 6 અક્ષર)'
                          )
                        : tr(
                            'Password (min 6 characters)',
                            'पासवर्ड (कम से कम 6 अक्षर)',
                            'પાસવર્ડ (ઓછામાં ઓછા 6 અક્ષર)'
                          )
                    }
                    className="flex-1 min-w-0 bg-transparent py-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none"
                    required
                  />
                </div>

                {biometricSupported && !savedBiometric && (
                  <label className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 text-left cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableBiometricAfterLogin}
                      onChange={(e) => setEnableBiometricAfterLogin(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer shrink-0"
                    />
                    <Fingerprint className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[10.5px] font-bold text-emerald-900 dark:text-emerald-200 leading-tight">
                      {tr(
                        'Save Fingerprint / Face Lock for 1-Tap login next time',
                        'अगली बार के लिए 1-टैप फिंगरप्रिंट लॉगिन सेव करें',
                        'આગલી વખતે માટે 1-ટેપ ફિંગરપ્રિન્ટ લોગિન સેવ કરો'
                      )}
                    </span>
                  </label>
                )}

                <label className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (e.target.checked) setErrorMessage(null);
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer accent-indigo-600"
                  />
                  <span className="text-[11px] leading-snug font-semibold text-slate-700 dark:text-slate-300">
                    {renderTermsConsentText()}
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={
                    isLoadingPassword ||
                    !identifierInput.trim() ||
                    !passwordInput.trim() ||
                    !termsAccepted
                  }
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
                      ? tr('Verifying...', 'सत्यापित हो रहा है...', 'ચકાસણી થઈ રહી છે...')
                      : passwordSubMode === 'signup'
                        ? tr(
                            'Verify OTP & Create Account',
                            'OTP वेरिफाई करें और अकाउंट बनाएं',
                            'OTP ચકાસો અને એકાઉન્ટ બનાવો'
                          )
                        : passwordSubMode === 'reset'
                          ? tr(
                              'Verify OTP & Save Password',
                              'OTP वेरिफाई करें और पासवर्ड सेव करें',
                              'OTP ચકાસો અને પાસવર્ડ સેવ કરો'
                            )
                          : tr('Sign In with Password', 'पासवर्ड से लॉगिन करें', 'પાસવર્ડથી લોગિન કરો')}
                  </span>
                </button>

                <div className="flex flex-col items-center gap-1.5 pt-1">
                  {passwordSubMode !== 'reset' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordSubMode('reset');
                        setErrorMessage(null);
                        setInfoMessage(null);
                      }}
                      className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      🔑 {tr(
                        'Forgot / Set Password via Mobile or Email OTP',
                        'मोबाइल या ईमेल OTP से पासवर्ड सेट / रीसेट करें',
                        'મોબાઇલ અથવા ઈમેલ OTP દ્વારા પાસવર્ડ સેટ / રીસેટ કરો'
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordSubMode('login');
                        setErrorMessage(null);
                        setInfoMessage(null);
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      &larr; {tr('Back to Password Login', 'वापस पासवर्ड लॉगिन पर जाएं', 'પાછા પાસવર્ડ લોગિન પર જાઓ')}
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
                      ? tr(
                          'Already have an account? Sign In with Password',
                          'पहले से अकाउंट है? पासवर्ड से लॉगिन करें',
                          'પહેલેથી એકાઉન્ટ છે? પાસવર્ડથી લોગિન કરો'
                        )
                      : tr(
                          'New user? Verify OTP & Create Password Account',
                          'नए यूज़र? OTP वेरिफाई करके नया अकाउंट बनाएं',
                          'નવા યુઝર? OTP ચકાસીને નવું એકાઉન્ટ બનાવો'
                        )}
                  </button>
                </div>
              </form>
            )}

            {/* ===================================================== */}
            {/* TAB 3: BIOMETRIC (FINGERPRINT / FACE LOCK) LOGIN      */}
            {/* ===================================================== */}
            {authMode === 'biometric' && (
              <div className="space-y-3 py-1">
                <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-3.5 flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Fingerprint className="w-7 h-7" />
                  </div>
                  {savedBiometric ? (
                    <>
                      <p className="text-xs font-black text-slate-900 dark:text-white">
                        {savedBiometric.name}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                        {tr(
                          'Use your phone Fingerprint, Face ID, or Screen Lock for instant login without waiting for SMS OTP.',
                          'बिना किसी OTP का इंतज़ार किए अपने मोबाइल के फिंगरप्रिंट, फेस लॉक या स्क्रीन लॉक से 1 सेकंड में लॉगिन करें।',
                          'કોઈપણ OTP વગર તમારા મોબાઇલના ફિંગરપ્રિન્ટ, ફેસ લોક કે સ્ક્રીન લોકથી 1 સેકન્ડમાં લોગિન કરો.'
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-black text-slate-900 dark:text-white">
                        {tr(
                          '1-Tap Fingerprint / Face Lock Login',
                          '1-टैप फिंगरप्रिंट / फेस लॉक लॉगिन',
                          '1-ટેપ ફિંગરપ્રિન્ટ / ફેસ લોક લોગિન'
                        )}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                        {tr(
                          'If you already enabled Passkey on this device, tap below. Otherwise, log in once via Mobile OTP or Password and keep the Fingerprint box checked!',
                          'यदि आपने इस फोन पर फिंगरप्रिंट सेट किया है तो नीचे बटन दबाएं। नया सेट करने के लिए एक बार मोबाइल OTP या पासवर्ड से लॉगिन करें (फिंगरप्रिंट अपने आप जुड़ जाएगा)।',
                          'જો તમે આ ફોન પર ફિંગરપ્રિન્ટ સેટ કર્યું હોય તો નીચે બટન દબાવો. નવું સેટ કરવા માટે એકવાર OTP કે પાસવર્ડથી લોગિન કરો.'
                        )}
                      </p>
                    </>
                  )}
                </div>

                <label className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (e.target.checked) setErrorMessage(null);
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer accent-emerald-600"
                  />
                  <span className="text-[11px] leading-snug font-semibold text-slate-700 dark:text-slate-300">
                    {renderTermsConsentText()}
                  </span>
                </label>

                <button
                  type="button"
                  disabled={isLoadingBiometric || !termsAccepted}
                  onClick={handleBiometricLogin}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs py-3.5 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/20"
                >
                  {isLoadingBiometric ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Fingerprint className="w-4 h-4" />
                  )}
                  <span>
                    {isLoadingBiometric
                      ? tr('Verifying Fingerprint...', 'फिंगरप्रिंट जांचा जा रहा है...', 'ફિંગરપ્રિન્ટ ચકાસાઈ રહ્યું છે...')
                      : tr(
                          'Sign In with Fingerprint / Face Lock',
                          'फिंगरप्रिंट / फेस लॉक से लॉगिन करें',
                          'ફિંગરપ્રિન્ટ / ફેસ લોકથી લોગિન કરો'
                        )}
                  </span>
                </button>
              </div>
            )}

            {/* Guest Continue Button */}
            <button
              onClick={onClose}
              disabled={isLoadingOtp || isLoadingPassword || isLoadingBiometric}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-xs py-2 px-4 rounded-2xl transition-colors cursor-pointer mt-1"
            >
              {tr(
                'Continue Browsing as Guest',
                'अभी सिर्फ देखें (गेस्ट जारी रखें)',
                'અત્યારે માત્ર જુઓ (ગેસ્ટ તરીકે ચાલુ રાખો)'
              )}
            </button>
          </div>
        </motion.div>
        <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      </div>
    </AnimatePresence>
  );
}
