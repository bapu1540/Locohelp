import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Lock, FileText, Mail, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 16 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative z-50 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-emerald-600/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{language === 'GU' ? 'ગોપનીયતા નીતિ (Privacy Policy)' : language === 'HI' ? 'गोपनीयता नीति (Privacy Policy)' : 'Privacy Policy'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'GU' ? 'લોકોહેલ્પ પ્લેટફોર્મની કાનૂની શરતો અને ડેટા સુરક્ષા' : language === 'HI' ? 'लोकोहेल्प प्लेटफॉर्म की कानूनी शर्तें और डेटा सुरक्षा' : 'LocoHelp Platform Legal Terms & Security'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Compact Content */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
            {/* Section 1 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">1</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? '૧. માહિતી સંગ્રહ અને હેતુ (Information Collection & Purpose)'
                    : language === 'HI'
                    ? '1. सूचना संग्रह और उद्देश्य (Information Collection & Purpose)'
                    : '1) Information Collection & Purpose'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'અમે માત્ર હાયપર-લોકલ કમ્યુનિટી બ્રોડકાસ્ટ, વેરિફાઈડ સર્વિસ ડિરેક્ટરી અને રિયલ-ટાઇમ યુઝર કમ્યુનિકેશનને સરળ બનાવવા માટે જરૂરી અંગત અને પ્રોફાઇલ માહિતી—જેમાં તમારું પૂરું નામ, વેરિફાઈડ ઈમેઈલ સરનામું, સંપર્ક નંબર, એક્ટિવ લોકેશન (શહેર/વિસ્તાર), અને સ્વેચ્છાએ સબમિટ કરેલા વ્યવસાય/ઓળખ ચકાસણી દસ્તાવેજોનો સમાવેશ થાય છે—એકત્રિત કરીએ છીએ.'
                  : language === 'HI'
                  ? 'हम केवल हाइपर-लोकल सामुदायिक प्रसारण, सत्यापित सेवा निर्देशिकाओं और रीयल-टाइम उपयोगकर्ता संचार को सुविधाजनक बनाने के लिए आवश्यक व्यक्तिगत और प्रोफ़ाइल जानकारी—जिसमें आपका पूरा नाम, सत्यापित ईमेल पता, संपर्क नंबर, सक्रिय भौगोलिक स्थिति (शहर/क्षेत्र), और स्वेच्छा से प्रस्तुत व्यवसाय/पहचान सत्यापन दस्तावेज़ शामिल हैं—एकत्रित करते हैं।'
                  : 'We collect essential personal and profile information—including your Full Name, verified Email Address, Contact Number, Active Geographical Location (City/Locality), and voluntarily submitted business/identity verification documents—solely to facilitate hyper-local community broadcasts, verified service directories, and real-time user communication.'}
              </p>
            </div>

            {/* Section 2 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">2</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? '૨. ડેટા એન્ક્રિપ્શન અને સુરક્ષિત આર્કિટેક્ચર (Data Encryption & Secure Architecture)'
                    : language === 'HI'
                    ? '2. डेटा एन्क्रिप्शन और सुरक्षित आर्किटेक्चर (Data Encryption & Secure Architecture)'
                    : '2) Data Encryption & Secure Architecture'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'તમામ યુઝર માહિતી, ક્રેડેન્શિયલ્સ અને મીડિયા અસ્કયામતો અદ્યતન ક્રિપ્ટોગ્રાફિક હેશિંગનો ઉપયોગ કરીને સુરક્ષિત કરવામાં આવે છે અને અમારા સુરક્ષિત એન્ક્રિપ્ટેડ ક્લાઉડ ડેટાબેઝ અને સર્વર ઇન્ફ્રાસ્ટ્રક્ચરમાં સંગ્રહિત થાય છે. અમે તમારો પર્સનલ ડેટા કોઈ અનધિકૃત થર્ડ-પાર્ટી માર્કેટર્સને વેચતા, ભાડે આપતા કે શેર કરતા નથી.'
                  : language === 'HI'
                  ? 'सभी उपयोगकर्ता जानकारी, क्रेडेंशियल और मीडिया एसेट उन्नत क्रिप्टोग्राफिक हैशिंग का उपयोग करके सुरक्षित हैं और हमारे सुरक्षित, एन्क्रिप्टेड क्लाउड डेटाबेस और संरक्षित सर्वर इन्फ्रास्ट्रक्चर में संग्रहीत हैं। हम आपकी व्यक्तिगत जानकारी को किसी भी अनधिकृत तीसरे पक्ष के मार्केटर्स को बिल्कुल नहीं बेचते, किराए पर नहीं देते या साझा नहीं करते हैं।'
                  : 'All user information, credentials, and media assets are protected using advanced cryptographic hashing and stored within our secure, encrypted cloud databases and protected server infrastructure. We strictly do not sell, rent, or trade your personal data to unauthorized third-party marketers.'}
              </p>
            </div>

            {/* Section 3 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">3</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? '૩. ઓડિટ ટ્રેલ્સ અને કાયદા પાલન (Audit Trails & Law Enforcement Compliance)'
                    : language === 'HI'
                    ? '3. ऑडिट ट्रेल्स और कानून प्रवर्तन अनुपालन (Audit Trails & Law Enforcement Compliance)'
                    : '3) Audit Trails, Fraud Prevention & Law Enforcement Compliance'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'પ્લેટફોર્મની અખંડિતતા જાળવવા, કપટપૂર્ણ પ્રવૃત્તિઓ રોકવા અને સમુદાય સુરક્ષા સુનિશ્ચિત કરવા માટે, લોકોહેલ્પ આપમેળે સુરક્ષા ઓડિટ લોગ્સ, એકાઉન્ટ ફેરફાર ઇતિહાસ અને સમયરેખા રેકોર્ડ રાખે છે. લાગુ સાયબર કાયદાઓ અને નિયમનકારી આદેશો અનુસાર, આ માહિતી કાયદેસરની વિનંતી પર અધિકૃત કાયદા અમલીકરણ અથવા સરકારી એજન્સીઓને જાહેર કરવામાં આવી શકે છે.'
                  : language === 'HI'
                  ? 'प्लेटफ़ॉर्म की अखंडता बनाए रखने, कपटपूर्ण गतिविधियों को रोकने और सामुदायिक सुरक्षा सुनिश्चित करने के लिए, लोकोहेल्प स्वचालित रूप से अपरिवर्तनीय सुरक्षा ऑडिट लॉग, खाता संशोधन इतिहास और गतिविधि समय-स्टैम्प रिकॉर्ड और संग्रहीत करता है। लागू साइबर कानूनों और विनियामक जनादेशों के अनुसार, यह जानकारी वैध कानूनी अनुरोध या जांच पर अधिकृत कानून प्रवर्तन या सरकारी एजेंसियों को प्रस्तुत की जा सकती है।'
                  : 'To maintain platform integrity, prevent fraudulent activities, and ensure community safety, LocoHelp automatically records and retains immutable security audit logs, account modification histories, and activity timestamps. In accordance with applicable cyber laws and regulatory mandates, this information may be disclosed to authorized law enforcement or government agencies upon valid legal request or investigation.'}
              </p>
            </div>

            {/* Section 4 */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">4</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? '૪. યુઝર અધિકારો અને ફરિયાદ નિવારણ (User Rights & Grievance Redressal)'
                    : language === 'HI'
                    ? '4. उपयोगकर्ता अधिकार और शिकायत निवारण (User Rights & Grievance Redressal)'
                    : '4) User Rights & Grievance Redressal'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'યુઝર્સ કોઈપણ સમયે તેમની રજિસ્ટર્ડ પ્રોફાઇલ માહિતીની સમીક્ષા કરી શકે છે અથવા અપડેટ માટે વિનંતી કરી શકે છે. કોઈપણ ગોપનીયતા સંબંધિત પ્રશ્નો, ડેટા ચિંતાઓ અથવા સત્તાવાર ફરિયાદો માટે, કૃપા કરીને અમારી સપોર્ટ ડેસ્કનો સંપર્ક કરો:'
                  : language === 'HI'
                  ? 'उपयोगकर्ता किसी भी समय अपनी पंजीकृत प्रोफ़ाइल जानकारी की समीक्षा या अपडेट का अनुरोध कर सकते हैं। किसी भी गोपनीयता संबंधी प्रश्नों, डेटा चिंताओं, या आधिकारिक शिकायतों के लिए, कृपया हमारे सहायता डेस्क से संपर्क करें:'
                  : 'Users may review or request updates to their registered profile information at any time. For any privacy-related queries, data concerns, or official grievances, please contact our support desk at:'}
              </p>
              <div className="pl-7 pt-1">
                <a
                  href="mailto:support@locohelp.com"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>support@locohelp.com</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold">LocoHelp Legal Compliance • 2026</span>
            <button
              onClick={onClose}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
            >
              {language === 'GU' ? 'બંધ કરો' : language === 'HI' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
