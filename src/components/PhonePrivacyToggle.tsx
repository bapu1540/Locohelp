import React, { useState } from 'react';
import { Lock, Globe, KeyRound, Fingerprint, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import { Language } from '../translations';
import { verifyDatabaseReauth } from '../auth';

interface PhonePrivacyToggleProps {
  language: Language;
  isPhonePublic: boolean;
  onChange: (newValue: boolean) => void;
  phoneDisplay?: string;
}

export const PhonePrivacyToggle: React.FC<PhonePrivacyToggleProps> = ({
  language,
  isPhonePublic,
  onChange,
  phoneDisplay,
}) => {
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'password' | 'biometric'>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleToggleClick = (targetPublic: boolean) => {
    if (!targetPublic) {
      // Switching back to Private is always instant
      onChange(false);
      return;
    }
    if (isPhonePublic) return;
    // Switching from Private -> Public requires Database Password or Biometric verification
    setErrorMsg('');
    setPassword('');
    setShowReauthModal(true);
  };

  const handleVerifyPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password || password.trim().length < 6) {
      setErrorMsg(
        language === 'HI'
          ? 'कृपया कम से कम 6 अक्षरों का पासवर्ड दर्ज करें।'
          : language === 'GU'
          ? 'કૃપા કરીને ઓછામાં ઓછા 6 અક્ષરોનો પાસવર્ડ દાખલ કરો.'
          : 'Please enter a password of at least 6 characters.'
      );
      return;
    }
    setIsVerifying(true);
    setErrorMsg('');
    try {
      const res = await verifyDatabaseReauth({
        mode: 'password',
        password: password.trim(),
        setNewPassword: needsNewPassword,
      });
      if (!res.success) {
        if (res.noPasswordSet) {
          setNeedsNewPassword(true);
        }
        setErrorMsg(
          res.error ||
            (language === 'HI'
              ? 'पासवर्ड सत्यापन विफल रहा।'
              : language === 'GU'
              ? 'પાસવર્ડ ચકાસણી નિષ્ફળ રહી.'
              : 'Password verification failed.')
        );
        return;
      }
      onChange(true);
      setShowReauthModal(false);
      setPassword('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyBiometric = async () => {
    setIsVerifying(true);
    setErrorMsg('');
    try {
      const res = await verifyDatabaseReauth({ mode: 'biometric' });
      if (!res.success) {
        setErrorMsg(
          res.error ||
            (language === 'HI'
              ? 'फिंगरप्रिंट सत्यापन विफल रहा।'
              : language === 'GU'
              ? 'ફિંગરપ્રिન્ટ ચકાસણી નિષ્ફળ રહી.'
              : 'Biometric verification failed.')
        );
        return;
      }
      onChange(true);
      setShowReauthModal(false);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isPhonePublic ? (
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
          )}
          <div>
            <p className="text-xs font-extrabold text-slate-800">
              {language === 'HI'
                ? 'मोबाइल नंबर गोपनीयता (Phone Privacy)'
                : language === 'GU'
                ? 'મોબાઇલ નંબર ગોપનીયતા (Phone Privacy)'
                : 'Mobile Number Privacy'}
            </p>
            <p className="text-[11px] font-semibold text-slate-500">
              {phoneDisplay
                ? `${language === 'HI' ? 'लॉगिन नंबर:' : language === 'GU' ? 'લોગિન નંબર:' : 'Linked:'} ${phoneDisplay}`
                : language === 'HI'
                ? 'डिफ़ॉल्ट रूप से आपका नंबर प्राइवेट और सुरक्षित रहता है'
                : language === 'GU'
                ? 'ડિફોલ્ટ રૂપે તમારો નંબર પ્રાઇવેટ અને સુરક્ષિત રહે છે'
                : 'Your number is private and protected by default'}
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Private vs Public Switch */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleToggleClick(false)}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all ${
            !isPhonePublic
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>
            {language === 'HI'
              ? 'प्राइवेट (सिर्फ ऐप चैट)'
              : language === 'GU'
              ? 'પ્રાઇવેટ (ફક્ત એપ ચેટ)'
              : 'Private (App Chat Only)'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleToggleClick(true)}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all ${
            isPhonePublic
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>
            {language === 'HI'
              ? 'पब्लिक (Call/WhatsApp)'
              : language === 'GU'
              ? 'પબ્લિક (Call/WhatsApp)'
              : 'Public (Call/WhatsApp)'}
          </span>
        </button>
      </div>

      <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
        {isPhonePublic
          ? language === 'HI'
            ? '✅ पब्लिक मोड चालू है: ग्राहक आपको सीधे कॉल या WhatsApp कर सकेंगे।'
            : language === 'GU'
            ? '✅ પબ્લિક મોડ ચાલુ છે: ગ્રાહકો તમને સીધો કોલ કે WhatsApp કરી શકશે.'
            : '✅ Public Mode Active: Users can contact you directly via Call or WhatsApp.'
          : language === 'HI'
          ? '🔒 प्राइवेट मोड (Default): आपका मोबाइल नंबर किसी को नहीं दिखेगा। लोग सिर्फ ऐप के अंदर सुरक्षित चैट कर सकेंगे।'
          : language === 'GU'
          ? '🔒 પ્રાઇવેટ મોડ (Default): તમારો મોબાઇલ નંબર કોઈને દેખાશે નહીં. લોકો ફક્ત એપમાં સુરક્ષિત ચેટ કરી શકશે.'
          : '🔒 Private Mode (Default): Your phone number stays hidden. People can contact you safely via in-app chat.'}
      </p>

      {/* Database Security Re-Authentication Modal */}
      {showReauthModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    {language === 'HI'
                      ? 'सुरक्षा पुष्टि (Security Check)'
                      : language === 'GU'
                      ? 'સુરક્ષા ચકાસણી (Security Check)'
                      : 'Security Verification'}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {language === 'HI'
                      ? 'नंबर पब्लिक करने के लिए पासवर्ड या फिंगरप्रिंट से पुष्टि करें'
                      : language === 'GU'
                      ? 'નંબર પબ્લિક કરવા માટે પાસવર્ડ અથવા ફિંગરપ્રિન્ટથી પુષ્ટિ કરો'
                      : 'Verify with your Password or Fingerprint to make number public'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReauthModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Method Switcher */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('password');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  authTab === 'password' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{language === 'HI' ? 'पासवर्ड' : language === 'GU' ? 'પાસવર્ડ' : 'Password'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('biometric');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  authTab === 'biometric' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>{language === 'HI' ? 'फिंगरप्रिंट' : language === 'GU' ? 'ફિંગરપ્રિન્ટ' : 'Biometric'}</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {authTab === 'password' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {needsNewPassword
                      ? language === 'HI'
                        ? 'नया सुरक्षित पासवर्ड बनाएं (कम से कम 6 अक्षर)'
                        : language === 'GU'
                        ? 'નવો સુરક્ષિત પાસવર્ડ બનાવો (ઓછામાં ઓછા 6 અક્ષર)'
                        : 'Create a Security Password (min 6 chars)'
                      : language === 'HI'
                      ? 'अपना LocoHelp पासवर्ड दर्ज करें'
                      : language === 'GU'
                      ? 'તમારો LocoHelp પાસવર્ડ દાખલ કરો'
                      : 'Enter your LocoHelp Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleVerifyPassword()}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all"
                >
                  {isVerifying
                    ? language === 'HI'
                      ? 'जांच हो रही है...'
                      : language === 'GU'
                      ? 'ચકાસણી થઈ રહી છે...'
                      : 'Verifying...'
                    : needsNewPassword
                    ? language === 'HI'
                      ? 'पासवर्ड सेव करें और नंबर पब्लिक करें'
                      : language === 'GU'
                      ? 'પાસવર્ડ સેવ કરો અને નંબર પબ્લિક કરો'
                      : 'Save Password & Make Public'
                    : language === 'HI'
                    ? 'पासवर्ड वेरिफाई करें और पब्लिक करें'
                    : language === 'GU'
                    ? 'પાસવર્ડ વેરિફાય કરો અને પબ્લિક કરો'
                    : 'Verify Password & Make Public'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <Fingerprint className="w-8 h-8" />
                </div>
                <p className="text-xs font-semibold text-slate-600">
                  {language === 'HI'
                    ? 'अपने फोन के फिंगरप्रिंट या फेस लॉक से तुरंत पुष्टि करें'
                    : language === 'GU'
                    ? 'તમારા ફોનના ફિંગરપ્રિન્ટ અથવા ફેસ લોકથી તરત પુષ્ટિ કરો'
                    : 'Confirm instantly using your phone Fingerprint or Face Lock'}
                </p>
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={handleVerifyBiometric}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>
                    {isVerifying
                      ? language === 'HI'
                        ? 'सत्यापन हो रहा है...'
                        : language === 'GU'
                        ? 'ચકાસણી થઈ રહી છે...'
                        : 'Verifying...'
                      : language === 'HI'
                      ? 'फिंगरप्रिंट से वेरिफाई करें'
                      : language === 'GU'
                      ? 'ફિંગરપ્રિન્ટથી વેરિફાય કરો'
                      : 'Verify with Fingerprint'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhonePrivacyToggle;

