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
                    ? '૩. ડિવાઇસ પરવાનગીઓ: કેમેરા, ફોટો અને લોકેશન (Device Permissions Usage)'
                    : language === 'HI'
                    ? '3. डिवाइस अनुमतियाँ: कैमरा, फोटो और लोकेशन (Device Permissions Usage)'
                    : '3) Device Permissions: Camera, Photos & Location'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'લોકોહેલ્પ એપ તમારી પરવાનગીથી જ (a) કેમેરા અને ફોટો ગેલેરીનો ઉપયોગ માત્ર પ્રોફાઇલ ફોટો, દુકાન/વ્યવસાયના ફોટા અથવા ચેટમાં ફોટો મોકલવા માટે કરે છે, અને (b) લોકેશન (GPS/શહેર) નો ઉપયોગ માત્ર તમારા વિસ્તારની નજીકની પોસ્ટ્સ, કારીગરો, દુકાનો અને નોકરીઓ બતાવવા માટે કરે છે. બેકગ્રાઉન્ડમાં તમારું લોકેશન કે ખાનગી મીડિયા ટ્રેક કરવામાં આવતું નથી.'
                  : language === 'HI'
                  ? 'लोकोहेल्प ऐप केवल आपकी स्पष्ट अनुमति से ही (a) कैमरा और फोटो गैलरी का उपयोग केवल प्रोफ़ाइल फ़ोटो, दुकान/व्यवसाय की फ़ोटो या चैट में छवि साझा करने के लिए करता है, और (b) लोकेशन (GPS/शहर) का उपयोग केवल आपके आस-पास के क्षेत्र की लाइव मदद, कारीगरों, दुकानों और नौकरियों को दिखाने के लिए करता है। बिना अनुमति बैकग्राउंड में आपकी लोकेशन या निजी मीडिया कभी ट्रैक नहीं किया जाता।'
                  : 'LocoHelp accesses (a) Camera & Photo Gallery strictly with your explicit permission to let you upload profile pictures, business/shop listings, or share images in chat, and (b) Location (GPS/City) strictly to filter hyper-local broadcasts, nearby professionals, shops, and jobs in your area. We never track your background location or access private media without consent.'}
              </p>
            </div>

            {/* Section 4 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">4</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? '૪. ઓડિટ લોગ્સ અને કાનૂની પાલન (Audit Logs & Legal Compliance)'
                    : language === 'HI'
                    ? '4. सुरक्षा ऑडिट लॉग और कानूनी अनुपालन (Audit Logs & Legal Compliance)'
                    : '4) Security Audit Logs & Legal Compliance'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'પ્લેટફોર્મની અખંડિતતા જાળવવા, છેતરપિંડી રોકવા અને સમુદાયની સુરક્ષા સુનિશ્ચિત કરવા માટે, લોકોહેલ્પ સુરક્ષા ઓડિટ લોગ્સ, રિપોર્ટ કરેલી ચેટ્સ અને સમયરેખા રેકોર્ડ રાખે છે. લાગુ કાયદાઓ અને નિયમનકારી આદેશો હેઠળ, ગંભીર નિયમ ભંગ કે કાયદેસરની તપાસની સ્થિતિમાં આ માહિતી સક્ષમ કાયદાકીય અને નિયમનકારી સત્તાવાળાઓ (Competent Legal & Regulatory Authorities) સાથે શેર કરવાનો અધિકાર સુરક્ષિત રહેશે.'
                  : language === 'HI'
                  ? 'प्लेटफ़ॉर्म की अखंडता बनाए रखने, धोखाधड़ी रोकने और सामुदायिक सुरक्षा सुनिश्चित करने के लिए, लोकोहेल्प सुरक्षा ऑडिट लॉग, रिपोर्ट की गई चैट और गतिविधि समय-स्टैम्प सुरक्षित रखता है। लागू कानूनों और नियामक प्रावधानों के तहत, गंभीर नियम उल्लंघन या वैध कानूनी जांच की स्थिति में यह रिकॉर्ड सक्षम कानूनी एवं नियामक प्राधिकरणों (Competent Legal & Regulatory Authorities) के साथ साझा करने का अधिकार सुरक्षित रहेगा।'
                  : 'To maintain platform integrity, prevent fraud, and ensure community safety, LocoHelp retains security audit logs, reported chat transcripts, and activity timestamps. Under applicable laws and regulatory mandates, LocoHelp reserves the right to disclose relevant records to competent legal, regulatory, and law enforcement authorities upon valid legal request or investigation.'}
              </p>
            </div>

            {/* Section 5 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">5</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? '૫. ડેટા રીટેન્શન અને એકાઉન્ટ ડિલીટ નીતિ (Data Retention & Account Deletion Policy)'
                    : language === 'HI'
                    ? '5. डेटा प्रतिधारण और अकाउंट डिलीट नीति (Data Retention & Account Deletion Policy)'
                    : '5) Data Retention & Account Deletion Policy'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'યુઝર્સ કોઈપણ સમયે Settings > "Request Account Closure / Delete Account" વિકલ્પ દ્વારા અથવા support@locohelp.com પર ઈમેઈલ કરીને પોતાનું એકાઉન્ટ અને અંગત ડેટા કાયમી ધોરણે ડિલીટ કરવાની વિનંતી કરી શકે છે. ચકાસણી બાદ તમારી પ્રોફાઇલ, પોસ્ટ્સ અને વ્યક્તિગત માહિતી હટાવી દેવામાં આવે છે (સિવાય કે કોઈ સક્રિય કાનૂની તપાસ કે સુરક્ષા વિવાદ હેઠળ કાયદા મુજબ ડેટા સાચવવો અનિવાર્ય હોય).'
                  : language === 'HI'
                  ? 'उपयोगकर्ता किसी भी समय Settings > "अकाउंट बंद / डिलीट करने का अनुरोध" विकल्प के माध्यम से या support@locohelp.com पर संपर्क करके अपना अकाउंट और व्यक्तिगत डेटा स्थायी रूप से हटाने का अनुरोध कर सकते हैं। सत्यापन के पश्चात आपकी प्रोफ़ाइल, पोस्ट और व्यक्तिगत डेटा को स्थायी रूप से हटा दिया जाता है (सिवाय उन मामलों के जहाँ किसी सक्रिय सुरक्षा शिकायत या कानूनी अनुपालन के तहत रिकॉर्ड सुरक्षित रखना अनिवार्य हो)।'
                  : 'Users may request permanent deletion of their account and personal data at any time via Settings > "Request Account Closure / Delete Account" or by emailing support@locohelp.com. Upon verification, your profile, listings, and personal data are permanently removed, except where specific records must be retained to comply with active safety investigations or applicable legal obligations.'}
              </p>
            </div>

            {/* Section 6 */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">6</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? '૬. યુઝર અધિકારો અને ફરિયાદ નિવારણ (User Rights & Grievance Redressal)'
                    : language === 'HI'
                    ? '6. उपयोगकर्ता अधिकार और शिकायत निवारण (User Rights & Grievance Redressal)'
                    : '6) User Rights & Grievance Redressal'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'યુઝર્સ કોઈપણ સમયે તેમની રજિસ્ટર્ડ પ્રોફાઇલ માહિતીની સમીક્ષા કરી શકે છે અથવા અપડેટ માટે વિનંતી કરી શકે છે. કોઈપણ ગોપનીયતા સંબંધિત પ્રશ્નો, ડેટા ચિંતાઓ અથવા સત્તાવાર ફરિયાદો માટે, કૃપા કરીને અમારી સપોર્ટ ડેસ્કનો સંપર્ક કરો:'
                  : language === 'HI'
                  ? 'उपयोगकर्ता किसी भी समय अपनी पंजीकृत प्रोफ़ाइल जानकारी की समीक्षा या अपडेट का अनुरोध कर सकते हैं। किसी भी गोपनीयता संबंधी प्रश्नों, डेटा चिंताओं, या आधिकारिक शिकायतों के लिए, कृपया हमारे सहायता डेस्क से संपर्क करें:'
                  : 'Users may review or request updates to their registered profile information at any time. For any privacy-related queries, data concerns, or official grievances, please contact our support desk at:'}
              </p>
              <div className="pl-7 pt-1 flex flex-wrap items-center gap-2">
                <a
                  href="mailto:support@locohelp.com"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>support@locohelp.com</span>
                </a>
                <a
                  href="https://www.instagram.com/locohelpofficial?igsh=MWd2c282b2N6N250aA=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <span>@locohelpofficial</span>
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
