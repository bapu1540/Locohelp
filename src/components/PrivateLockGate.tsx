import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Lock, ShieldCheck, KeyRound, AlertCircle, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { fetchSiteLockStatus, verifySiteLockPin } from '../api';

interface PrivateLockGateProps {
  children: React.ReactNode;
}

export default function PrivateLockGate({ children }: PrivateLockGateProps) {
  const [isLockedOnServer, setIsLockedOnServer] = useState<boolean | null>(null);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('locohelp_site_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // 1. Check server site lock configuration on mount
  useEffect(() => {
    let isMounted = true;
    fetchSiteLockStatus().then((status) => {
      if (isMounted) {
        setIsLockedOnServer(status.isLocked);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Focus first digit box when lock screen appears
  useEffect(() => {
    if (isLockedOnServer === true && !isSessionUnlocked) {
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 150);
    }
  }, [isLockedOnServer, isSessionUnlocked]);

  // 3. Verify PIN automatically when all 4 digits are filled
  const triggerVerify = async (pinToVerify: string) => {
    if (pinToVerify.length !== 4 || isVerifying) return;
    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await verifySiteLockPin(pinToVerify);
      if (res.success) {
        setIsSuccess(true);
        try {
          localStorage.setItem('locohelp_site_unlocked', 'true');
        } catch {}
        setTimeout(() => {
          setIsSessionUnlocked(true);
        }, 600);
      } else {
        setIsShaking(true);
        setErrorMsg(res.error || 'ખોટો PIN છે (Incorrect Access PIN)');
        setTimeout(() => setIsShaking(false), 500);
        setDigits(['', '', '', '']);
        setTimeout(() => {
          inputRefs[0].current?.focus();
        }, 100);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ચકાસણી નિષ્ફળ ગઈ (Verification failed)');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    // Only accept numeric digits
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned && val !== '') return;

    const char = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMsg(null);

    // Auto-advance to next box if digit typed
    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // If 4th digit filled, auto verify
    const fullPin = newDigits.join('');
    if (fullPin.length === 4) {
      triggerVerify(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs[index - 1].current?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs[index + 1].current?.focus();
    } else if (e.key === 'Enter') {
      const fullPin = digits.join('');
      if (fullPin.length === 4) {
        triggerVerify(fullPin);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData) {
      const pastedArr = pastedData.split('');
      const newDigits = ['', '', '', ''];
      pastedArr.forEach((ch, idx) => {
        if (idx < 4) newDigits[idx] = ch;
      });
      setDigits(newDigits);
      if (pastedArr.length === 4) {
        triggerVerify(pastedData);
      } else if (pastedArr.length < 4) {
        inputRefs[pastedArr.length]?.current?.focus();
      }
    }
  };

  // If status is still loading from server, show subtle silent loading screen
  if (isLockedOnServer === null) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50 text-white">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400 tracking-wide">LocoHelp Secure Launch...</p>
      </div>
    );
  }

  // If site is unlocked on server OR session is already unlocked, render full application
  if (!isLockedOnServer || isSessionUnlocked) {
    return <>{children}</>;
  }

  // Otherwise, render full-screen Private PIN Access Lock Gate
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto select-none">
      {/* Background Decorative Rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1, x: isShaking ? [0, -12, 12, -8, 8, 0] : 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center"
      >
        {/* Brand Header & Shield Icon */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              {isSuccess ? (
                <CheckCircle2 className="w-9 h-9 text-white animate-bounce" />
              ) : (
                <Lock className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 p-1 rounded-full text-slate-950 shadow-md">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            LocoHelp
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Private Testing Gate / ખાનગી પ્રવેશ મોડ</span>
          </div>
        </div>

        {/* Informational Text */}
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          This site is currently in private preview testing. Please enter the 4-digit Access PIN to proceed.
          <span className="block mt-1 text-xs text-slate-400">
            આ સાઇટ હાલમાં ખાનગી ટેસ્ટિંગ હેઠળ છે. પ્રવેશ માટે 4-અંકનો PIN દાખલ કરો.
          </span>
        </p>



        {/* 4-Box PIN Input Container (STRICT NO-FORMWrapper & NO Password Suggestions) */}
        <div className="mb-6">
          <div 
            className="flex items-center justify-center gap-3 sm:gap-4"
            onPaste={handlePaste}
          >
            {[0, 1, 2, 3].map((idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digits[idx]}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isVerifying || isSuccess}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
                style={{ WebkitTextSecurity: digits[idx] ? 'disc' : 'none' }}
                className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-mono font-bold rounded-2xl border transition-all duration-200 outline-none ${
                  digits[idx]
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10 scale-105'
                    : 'bg-slate-800/80 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500 focus:bg-slate-800'
                } ${errorMsg ? 'border-red-500/80 bg-red-500/10 text-red-400 animate-pulse' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-center gap-2 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 py-2.5 px-3 rounded-xl text-center"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* Manual Unlock Submit Button */}
        <button
          type="button"
          onClick={() => triggerVerify(digits.join(''))}
          disabled={digits.join('').length !== 4 || isVerifying || isSuccess}
          className={`w-full py-3.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
            isSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-500/30'
              : digits.join('').length === 4 && !isVerifying
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 active:scale-[0.98]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          {isVerifying ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying PIN...</span>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Access Granted / પ્રવેશ મંજૂર!</span>
            </>
          ) : (
            <>
              <span>Unlock Access / પ્રવેશ કરો</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Footer Note */}
        <p className="mt-6 text-[11px] text-slate-500">
          Authorized testers only • Team LocoHelp Community Network
        </p>
      </motion.div>
    </div>
  );
}
