import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Phone,
  User,
  MapPin,
  Camera,
  Trash2,
  Mail,
  CheckCircle2,
  ExternalLink,
  FileText,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { getCurrentUser } from '../auth';

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

export default function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
  const { language, setLanguage, tr } = useLanguage();
  const activeUser = getCurrentUser();

  const [delIdentifier, setDelIdentifier] = useState(
    () => activeUser?.phone || (activeUser?.email && !activeUser.email.endsWith('@phone.locohelp.com') ? activeUser.email : '') || ''
  );
  const [delName, setDelName] = useState(
    () => (activeUser?.displayName && !activeUser.isGuest ? activeUser.displayName : '') || ''
  );
  const [delReason, setDelReason] = useState('');
  const [isSubmittingDeletion, setIsSubmittingDeletion] = useState(false);
  const [deletionReceipt, setDeletionReceipt] = useState<string | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopySupportEmail = () => {
    try {
      navigator.clipboard.writeText('support@locohelp.com');
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {}
  };

  const handleDeletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeletionError(null);
    const cleanId = delIdentifier.trim();
    if (!cleanId || cleanId.length < 5) {
      setDeletionError(
        tr(
          'Please enter your registered 10-digit Mobile Number or Email ID.',
          'कृपया अपना रजिस्टर किया हुआ 10-अंकों का मोबाइल नंबर या ईमेल आईडी दर्ज करें।',
          'કૃપા કરીને તમારો રજિસ્ટર કરેલો 10-અંકનો મોબાઇલ નંબર અથવા ઈમેલ આઈડી લખો.'
        )
      );
      return;
    }

    setIsSubmittingDeletion(true);
    try {
      const res = await fetch('/api/public/data-deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          name: delName.trim() || 'LocoHelp User',
          reason: delReason.trim() || 'Requested permanent account & data deletion via /privacy page',
          uid: activeUser && !activeUser.isGuest ? activeUser.uid : undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setDeletionReceipt(data.requestId || `DEL-${Date.now().toString().slice(-6)}`);
        setDelReason('');
      } else {
        // Fallback to /api/reports if needed
        await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: 'ACCOUNT_CLOSURE_REQUEST',
            description: `PUBLIC /PRIVACY DATA DELETION REQUEST for "${delName.trim() || cleanId}" (Identifier: ${cleanId}). Reason: ${delReason.trim() || 'Requested via /privacy page'}`,
            targetId: cleanId,
            reporterId: cleanId,
            userName: delName.trim() || 'LocoHelp User',
            userPhone: cleanId,
            status: 'deletion_requested',
            createdAt: new Date().toISOString()
          })
        });
        setDeletionReceipt(`DEL-${Date.now().toString().slice(-6)}`);
      }
    } catch {
      setDeletionError(
        tr(
          'Could not submit request right now. Please email support@locohelp.com directly.',
          'अभी अनुरोध सबमिट नहीं हो सका। कृपया सीधे support@locohelp.com पर ईमेल करें।',
          'હાલમાં વિનંતી સબમિટ થઈ શકી નથી. કૃપા કરીને સીધા support@locohelp.com પર ઈમેલ કરો.'
        )
      );
    } finally {
      setIsSubmittingDeletion(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto pb-28">
      {/* Sticky Top Sub-Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
            title={tr('Back to Home', 'होम पर वापस जाएं', 'હોમ પર પાછા જાઓ')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
              {tr(
                'Privacy Policy & Data Deletion',
                'गोपनीयता नीति और डेटा डिलीट (Privacy Policy)',
                'ગોપનીયતા નીતિ અને ડેટા ડિલીટ (Privacy Policy)'
              )}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
              https://www.locohelp.com/privacy • Google Play Compliant
            </p>
          </div>
        </div>

        {/* Quick Language Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          {(['EN', 'HI', 'GU'] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer ${
                language === code
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {code === 'EN' ? 'EN' : code === 'HI' ? 'हिंदी' : 'ગુજ'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero Compliance Banner */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wide">
              OFFICIAL PRIVACY POLICY & USER DATA SAFETY DISCLOSURE
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Effective & Last Updated: November 2026
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
            LocoHelp — Hyper-Local Community Help, Verified Service Experts, Shops & Job Directory
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === 'GU'
              ? 'લોકોહેલ્પ (LocoHelp - https://www.locohelp.com) ભારતના નાગરિકો, સ્થાનિક કારીગરો (Service Experts), દુકાનદારો અને રોજગાર શોધતા યુવાનો માટે ૧૦૦% નિઃશુલ્ક (Free) પ્લેટફોર્મ છે. આ ગોપનીયતા નીતિ (Privacy Policy) Google Play Store ના ધોરણો અનુસાર સ્પષ્ટ કરે છે કે અમે કયો ડેટા એકત્રિત કરીએ છીએ, તેનો ઉપયોગ કેવી રીતે થાય છે અને તમે તમારું એકાઉન્ટ તથા ડેટા કેવી રીતે ડિલીટ કરી શકો છો.'
              : language === 'HI'
              ? 'लोकोहेल्प (LocoHelp - https://www.locohelp.com) भारत के नागरिकों, स्थानीय कारीगरों (Service Experts), दुकानदारों और रोज़गार खोजने वाले युवाओं के लिए 100% निःशुल्क (Free) प्लेटफ़ॉर्म है। यह गोपनीयता नीति (Privacy Policy) Google Play Store के मानकों के अनुसार स्पष्ट करती है कि हम कौन-सा डेटा एकत्रित करते हैं, उसका उपयोग कैसे होता है और आप अपना अकाउंट व डेटा कैसे स्थायी रूप से डिलीट कर सकते हैं।'
              : 'LocoHelp (https://www.locohelp.com) is a 100% free hyper-local community network connecting citizens with nearby verified service experts, local shops, and employment opportunities. This Privacy Policy complies with Google Play Store User Data and Data Safety requirements, explaining what data we collect, how it is protected, and how you can delete your account and personal data at any time.'}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Free Platform (No In-App Payments or Commission)</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero Third-Party Data Selling</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Accessible Without Login</span>
            </span>
          </div>
        </div>

        {/* Section 1: Data Collection Details (Phone, Name, City, Photos) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {tr(
                '1. Information We Collect & Purpose (Phone, Name, City, Photos)',
                '1. हम कौन-सा डेटा एकत्रित करते हैं और क्यों (Phone, Name, City, Photos)',
                '1. અમે કઈ માહિતી એકત્રિત કરીએ છીએ અને શા માટે (Phone, Name, City, Photos)'
              )}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {tr(
              'Guest users can browse all 16 service categories and verified service provider directories without logging in. When you create an account, post a broadcast, register as a service provider, or use direct chat, we collect only the following essential information:',
              'गेस्ट (Guest) यूज़र बिना लॉगिन किए सभी 16 सर्विस कैटेगरी और सर्विस एक्सपर्ट्स की सूची देख सकते हैं। जब आप अकाउंट बनाते हैं, पोस्ट डालते हैं, सर्विस एक्सपर्ट के रूप में जुड़ते हैं या डायरेक्ट चैट करते हैं, तो हम केवल निम्नलिखित आवश्यक जानकारी एकत्रित करते हैं:',
              'ગેસ્ટ (Guest) યુઝર્સ લોગિન કર્યા વિના તમામ 16 સર્વિસ કેટેગરી અને સર્વિસ એક્સપર્ટ્સની યાદી જોઈ શકે છે. જ્યારે તમે એકાઉન્ટ બનાવો છો, પોસ્ટ મૂકો છો કે ડાયરેક્ટ ચેટ કરો છો, ત્યારે અમે માત્ર નીચે મુજબની જરૂરી માહિતી એકત્રિત કરીએ છીએ:'
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Phone Number & Email */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Phone Number & Email Address (मोबाइल नंबर और ईमेल)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'GU'
                  ? 'એકાઉન્ટ વેરિફિકેશન (OTP/PIN લોગિન) અને કાયમી સેશન સુરક્ષા માટે. સામાન્ય યુઝરનો મોબાઇલ નંબર ગોપનીય (Private) રહે છે. માત્ર જે યુઝર સ્વેચ્છાએ સર્વિસ એક્સપર્ટ, દુકાન કે નોકરીની જાહેરાત મૂકે છે, તેમનો નંબર ગ્રાહકોના સંપર્ક માટે લિસ્ટિંગમાં બતાવવામાં આવે છે.'
                  : language === 'HI'
                  ? 'अकाउंट वेरिफिकेशन (OTP/PIN लॉगिन) और स्थायी सेशन सुरक्षा के लिए। सामान्य नागरिकों का मोबाइल नंबर पूरी तरह गोपनीय (Private) रहता है। केवल वे यूज़र जो स्वेच्छा से सर्विस एक्सपर्ट, दुकान या जॉब लिस्टिंग रजिस्टर करते हैं, उनका संपर्क नंबर ग्राहकों की सुविधा हेतु डायरेक्टरी में दिखता है।'
                  : 'Collected for OTP/PIN authentication, session persistence, and security verification. Regular users’ phone numbers remain private by default. Phone numbers are displayed publicly only when a user voluntarily registers a Service Expert, Shop, or Job listing.'}
              </p>
            </div>

            {/* Full Name */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                <User className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Full Name & Profile Identity (पूरा नाम और प्रोफ़ाइल)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'GU'
                  ? 'તમારી કમ્યુનિટી પોસ્ટ, સર્વિસ પ્રોફાઇલ અને 1-on-1 ડાયરેક્ટ ચેટમાં તમારી સાચી ઓળખ દર્શાવવા માટે જેથી સ્થાનિક નાગરિકો વિશ્વાસપૂર્વક વાતચીત કરી શકે.'
                  : language === 'HI'
                  ? 'आपकी कम्युनिटी पोस्ट, सर्विस प्रोफ़ाइल और 1-on-1 डायरेक्ट चैट में आपकी वास्तविक पहचान दिखाने के लिए ताकि स्थानीय लोग भरोसे के साथ संवाद कर सकें।'
                  : 'Collected to display your real name on community help broadcasts, service expert profiles, and 1-on-1 direct chat messages so local neighbors can interact with trust.'}
              </p>
            </div>

            {/* City / Location */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                <span>City, District & Area Location (शहर और क्षेत्र लोकेशन)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'GU'
                  ? 'તમારા પસંદ કરેલા શહેર (જેમ કે ગાંધીનગર, અમદાવાદ વગેરે) અને વિસ્તાર મુજબ નજીકના કારીગરો, દુકાનો અને મદદની પોસ્ટ્સ બતાવવા માટે. અમે બેકગ્રાઉન્ડમાં GPS લોકેશન ક્યારેય ટ્રેક કરતા નથી.'
                  : language === 'HI'
                  ? 'आपके चुने गए शहर/जिले और क्षेत्र के अनुसार आस-पास के कारीगरों, दुकानों और मदद की पोस्ट दिखाने के लिए। हम बैकग्राउंड में आपकी GPS लोकेशन कभी ट्रैक नहीं करते।'
                  : 'Collected to filter and display nearby service providers, local shops, job openings, and community broadcasts relevant to your selected city and neighborhood. We never track GPS location in the background.'}
              </p>
            </div>

            {/* Photos & Camera Media */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                <Camera className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Photos & Camera Media (फ़ोटो और कैमरा मीडिया)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'GU'
                  ? 'માત્ર તમારી સ્પષ્ટ પરવાનગીથી જ જ્યારે તમે પ્રોફાઇલ ફોટો, દુકાન/કામના ફોટા, વેરિફિકેશન આઈડી અથવા ડાયરેક્ટ ચેટમાં ફોટો અપલોડ કરો છો. આ ફોટા સુરક્ષિત રીતે Firebase Cloud Storage માં સ્ટોર થાય છે.'
                  : language === 'HI'
                  ? 'केवल आपकी स्पष्ट अनुमति से जब आप प्रोफ़ाइल फ़ोटो, दुकान/काम की फ़ोटो, वेरिफिकेशन आईडी या डायरेक्ट चैट में फ़ोटो भेजते हैं। सभी फ़ोटो सुरक्षित रूप से Firebase Cloud Storage में स्टोर होती हैं।'
                  : 'Collected strictly when you choose to upload a profile picture, shop/work showcase photos, ID verification document, or photo attachments in direct chat. Media files are securely stored in Firebase Cloud Storage.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Data Protection, Admin Moderation & Storage */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {tr(
                '2. Data Security, PostgreSQL + Firebase Storage & Admin Moderation',
                '2. डेटा सुरक्षा, एन्क्रिप्शन और एडमिन मॉडरेशन',
                '2. ડેટા સુરક્ષા, એન્ક્રિપ્શન અને એડમિન મોડરેશન'
              )}
            </h3>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-disc pl-5">
            <li>
              <strong>Encrypted Cloud Storage:</strong> All user profiles, posts, and chat messages are transmitted over encrypted HTTPS/TLS connections and stored in secure PostgreSQL databases and Firebase Storage.
            </li>
            <li>
              <strong>Admin Approval & Community Safety:</strong> To protect citizens from spam, fraud, and abusive content, new accounts and service listings require Admin Approval (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">status === &apos;approved&apos;</code>) before public posting or direct messaging is enabled.
            </li>
            <li>
              <strong>No Third-Party Selling or Financial Tracking:</strong> LocoHelp does not sell, rent, or trade your personal data (Phone, Name, City, Photos) to any third-party marketing agency or data broker. We never ask for bank accounts, credit/debit cards, or UPI PINs.
            </li>
          </ul>
        </div>

        {/* Section 3: Account & Data Deletion Policy + Interactive Form */}
        <div
          id="delete-account-section"
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/60 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <Trash2 className="w-5 h-5 text-rose-600 shrink-0" />
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {tr(
                '3. Account & Personal Data Deletion Instructions (Google Play Data Deletion Policy)',
                '3. अकाउंट और व्यक्तिगत डेटा डिलीट करने की प्रक्रिया (Data Deletion Policy)',
                '3. એકાઉન્ટ અને વ્યક્તિગત ડેટા ડિલીટ કરવાની પ્રક્રિયા (Data Deletion Policy)'
              )}
            </h3>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {tr(
              'You have full control over your personal data. You can request permanent deletion of your LocoHelp account and all associated data (Phone Number, Email, Full Name, City/Location, Uploaded Photos, Service Listings, Posts, and Chat Messages) using any of the 3 methods below:',
              'अपने डेटा पर आपका पूरा अधिकार है। आप नीचे दिए गए किसी भी 1 तरीके से अपना LocoHelp अकाउंट और उससे जुड़ा सारा डेटा (मोबाइल नंबर, ईमेल, नाम, शहर, फ़ोटो, पोस्ट और चैट संदेश) स्थायी रूप से डिलीट कर सकते हैं:',
              'તમારા ડેટા પર તમારો સંપૂર્ણ અધિકાર છે. તમે નીચે આપેલા કોઈપણ 1 વિકલ્પ દ્વારા તમારું LocoHelp એકાઉન્ટ અને તેની સાથે જોડાયેલો તમામ ડેટા (મોબાઇલ નંબર, ઈમેલ, નામ, શહેર, ફોટા, પોસ્ટ અને ચેટ) કાયમી ધોરણે ડિલીટ કરી શકો છો:'
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="font-black text-slate-900 dark:text-white">Method 1: Inside the App</p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Open LocoHelp → Tap <strong>More / Settings (સેટિંગ્સ / सेटिंग्स)</strong> → Select <strong>&quot;Delete Account / Request Closure&quot;</strong> and submit.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="font-black text-slate-900 dark:text-white">Method 2: Web Form Below (No Login Needed)</p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Enter your registered Phone Number or Email in the form below and click <strong>Submit Data Deletion Request</strong>.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="font-black text-slate-900 dark:text-white">Method 3: Email Support</p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Send an email to <strong>support@locohelp.com</strong> with your registered Phone Number or Email. Completed within 48–72 hours.
              </p>
            </div>
          </div>

          {/* Interactive Public Data Deletion Request Form */}
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              {tr(
                'Submit Direct Account & Data Deletion Request (Without Login)',
                'बिना लॉगिन सीधे यहाँ से अकाउंट व डेटा डिलीट का अनुरोध भेजें:',
                'લોગિન વિના સીધા અહીંથી એકાઉન્ટ અને ડેટા ડિલીટ કરવાની વિનંતી મોકલો:'
              )}
            </h4>

            {deletionReceipt ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    {tr(
                      'Data Deletion Request Received!',
                      'डेटा डिलीट का अनुरोध सफलतापूर्वक दर्ज हो गया है!',
                      'ડેટા ડિલીટ કરવાની વિનંતી સફળતાપૂર્વક નોંધાઈ ગઈ છે!'
                    )}
                  </span>
                </div>
                <p className="leading-relaxed">
                  {tr(
                    `Reference ID: ${deletionReceipt}. Your account and associated data (Phone, Name, City, Photos, Posts, and Chats) are queued for permanent deletion within 48–72 hours. You may also email support@locohelp.com for immediate assistance.`,
                    `रेफरेंस ID: ${deletionReceipt}। आपका अकाउंट और उससे जुड़ा सभी डेटा (फ़ोन, नाम, शहर, फ़ोटो, पोस्ट और चैट) 48–72 घंटों के भीतर स्थायी रूप से हटा दिया जाएगा।`,
                    `રેફરન્સ ID: ${deletionReceipt}. તમારું એકાઉન્ટ અને તમામ ડેટા 48–72 કલાકમાં કાયમી ધોરણે ડિલીટ કરી દેવામાં આવશે.`
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={handleDeletionSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {tr(
                        'Registered Mobile Number or Email ID *',
                        'रजिस्टर किया हुआ मोबाइल नंबर या ईमेल *',
                        'રજિસ્ટર કરેલ મોબાઇલ નંબર અથવા ઈમેલ *'
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={delIdentifier}
                      onChange={(e) => setDelIdentifier(e.target.value)}
                      placeholder={tr('e.g. 9876543210 or name@gmail.com', 'जैसे: 9876543210 या ईमेल', 'દા.ત. 9876543210 અથવા ઈમેલ')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {tr('Your Full Name (Optional)', 'आपका नाम (वैकल्पिक)', 'તમારું નામ (વૈકલ્પિક)')}
                    </label>
                    <input
                      type="text"
                      value={delName}
                      onChange={(e) => setDelName(e.target.value)}
                      placeholder={tr('Enter your name', 'अपना नाम लिखें', 'તમારું નામ લખો')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr(
                      'Reason for Account & Data Deletion (Optional)',
                      'डिलीट करने का कारण (वैकल्पिक)',
                      'ડિલીટ કરવાનું કારણ (વૈકલ્પિક)'
                    )}
                  </label>
                  <input
                    type="text"
                    value={delReason}
                    onChange={(e) => setDelReason(e.target.value)}
                    placeholder={tr(
                      'e.g. Please delete my account, phone number, photos and posts permanently',
                      'जैसे: मेरा अकाउंट और डेटा स्थायी रूप से डिलीट करें',
                      'દા.ત. મારું એકાઉન્ટ અને ડેટા કાયમી ડિલીટ કરો'
                    )}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {deletionError && (
                  <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{deletionError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingDeletion}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isSubmittingDeletion
                      ? tr('Submitting Request...', 'अनुरोध भेजा जा रहा है...', 'વિનંતી મોકલાઈ રહી છે...')
                      : tr(
                          'Submit Permanent Data Deletion Request',
                          'अकाउंट व डेटा डिलीट का अनुरोध सबमिट करें',
                          'એકાઉન્ટ અને ડેટા ડિલીટ વિનંતી સબમિટ કરો'
                        )}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Section 4: Contact & Support Email (support@locohelp.com) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-indigo-600 shrink-0" />
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {tr(
                '4. Contact Us, Grievance Officer & Support Email',
                '4. सहायता संपर्क और शिकायत निवारण (Support Contact)',
                '4. સહાયતા સંપર્ક અને ફરિયાદ નિવારણ (Support Contact)'
              )}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {tr(
              'LocoHelp is intended for citizens aged 18 years and older. For any questions regarding this Privacy Policy, data access, correction, or permanent account deletion, please contact our support team at:',
              'लोकोहेल्प 18 वर्ष या उससे अधिक आयु के नागरिकों के लिए है। गोपनीयता नीति, डेटा सुरक्षा या अकाउंट डिलीट से संबंधित किसी भी सहायता के लिए हमारे आधिकारिक ईमेल पर संपर्क करें:',
              'લોકોહેલ્પ 18 વર્ષ કે તેથી વધુ વયના નાગરિકો માટે છે. ગોપનીયતા નીતિ, ડેટા સુરક્ષા અથવા એકાઉન્ટ ડિલીટ કરવા અંગે કોઈપણ સહાયતા માટે અમારા સપોર્ટ ઈમેલ પર સંપર્ક કરો:'
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="mailto:support@locohelp.com?subject=LocoHelp%20Privacy%20%2F%20Data%20Deletion%20Request"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black shadow-sm transition-colors"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>support@locohelp.com</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
            </a>

            <button
              type="button"
              onClick={handleCopySupportEmail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
            >
              {copiedEmail ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{tr('Copied!', 'कॉपी हो गया!', 'કોપી થઈ ગયું!')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{tr('Copy Email', 'ईमेल कॉपी करें', 'ઈમેલ કોપી કરો')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{tr('Return to LocoHelp Home', 'मुख्य वेबसाइट पर जाएं', 'મુખ્ય વેબસાઇટ પર જાઓ')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
