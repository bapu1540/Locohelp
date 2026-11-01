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
      <div
        className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs"
        style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
      >
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
                  {language === 'GU' ? 'લોકોહેલ્પ પ્લેટફોર્મની ગોપનીયતા અને ડેટા સુરક્ષા' : language === 'HI' ? 'लोकोहेल्प प्लेटफॉर्म की गोपनीयता और डेटा सुरक्षा' : 'LocoHelp Privacy & Data Protection'}
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
            {/* Section 1: 100% Free & No Payment Data */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">1</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? '૧૦૦% નિઃશુલ્ક પ્લેટફોર્મ અને ઝીરો પેમેન્ટ ડેટા (100% Free & No Financial Data)'
                    : language === 'HI'
                    ? '100% निःशुल्क प्लेटफॉर्म और शून्य पेमेंट डेटा (100% Free & No Financial Data)'
                    : '100% Free Platform & Zero Payment Data Collection'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'લોકોહેલ્પ (LocoHelp) નાગરિકો, ગ્રાહકો અને સર્વિસ પ્રોવાઈડર્સ (કારીગરો/દુકાનદારો) બંને માટે ૧૦૦% નિઃશુલ્ક (Free) છે. અમે કોઈપણ પક્ષ પાસેથી રજિસ્ટ્રેશન ફી, સબ્સ્ક્રિપ્શન ચાર્જ કે કમિશન લેતા નથી. લોકોહેલ્પ એપમાં કોઈપણ પ્રકારનું ઇન-એપ પેમેન્ટ ગેટવે નથી અને અમે તમારી ક્રેડિટ/ડેબિટ કાર્ડ વિગતો, બેંક એકાઉન્ટ નંબર કે UPI પિન ક્યારેય માંગતા કે સંગ્રહિત કરતા નથી.'
                  : language === 'HI'
                  ? 'लोकोहेल्प (LocoHelp) आम नागरिकों, सेवा लेने वालों और सर्विस प्रोवाइडर्स (कारीगरों/दुकानदारों) दोनों के लिए 100% निःशुल्क (Free) है। हम किसी भी पक्ष से कोई रजिस्ट्रेशन शुल्क, सब्सक्रिप्शन फीस या कमीशन नहीं लेते हैं। ऐप में कोई इन-ऐप पेमेंट गेटवे नहीं है और हम आपके क्रेडिट/डेबिट कार्ड, बैंक खाते या UPI पिन की जानकारी कभी नहीं मांगते और न ही स्टोर करते हैं।'
                  : 'LocoHelp is 100% free for both citizens (service seekers) and service providers (professionals, workers, and shopkeepers). We do not charge any registration fee, subscription fee, or commission from anyone. LocoHelp does not process in-app payments and never collects or stores your credit/debit card details, bank account numbers, or UPI PINs.'}
              </p>
            </div>

            {/* Section 2: Information Collection & Purpose */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">2</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? 'માહિતી સંગ્રહ અને હેતુ (Information Collection & Purpose)'
                    : language === 'HI'
                    ? 'सूचना संग्रह और उद्देश्य (Information Collection & Purpose)'
                    : 'Information Collection & Purpose'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'અમે માત્ર હાયપર-લોકલ કમ્યુનિટી બ્રોડકાસ્ટ, વેરિફાઈડ સર્વિસ/દુકાન/નોકરી ડિરેક્ટરી અને રિયલ-ટાઇમ યુઝર કમ્યુનિકેશનને સરળ બનાવવા માટે જરૂરી મૂળભૂત પ્રોફાઇલ માહિતી—જેમાં તમારું પૂરું નામ, વેરિફાઈડ ઈમેઈલ સરનામું (OTP લોગિન માટે), સંપર્ક નંબર અને એક્ટિવ લોકેશન (રાજ્ય/જિલ્લો/વિસ્તાર)—એકત્રિત કરીએ છીએ.'
                  : language === 'HI'
                  ? 'हम केवल हाइपर-लोकल सामुदायिक ब्रॉडकास्ट, सत्यापित सेवा/दुकान/रोज़गार डायरेक्टरी और रीयल-टाइम उपयोगकर्ता चैट को सुविधाजनक बनाने के लिए आवश्यक बुनियादी प्रोफ़ाइल जानकारी—जिसमें आपका पूरा नाम, सत्यापित ईमेल पता (OTP लॉगिन हेतु), संपर्क नंबर और सक्रिय लोकेशन (राज्य/जिला/क्षेत्र) शामिल है—एकत्रित करते हैं।'
                  : 'We collect basic personal and profile information—including your Full Name, verified Email Address (for OTP authentication), Contact Number, and Active Geographical Location (State/District/Area)—solely to facilitate hyper-local community broadcasts, verified service/shop/job directories, and real-time user communication.'}
              </p>
            </div>

            {/* Section 3: Phone Number & Chat Privacy */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">3</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? 'મોબાઈલ નંબર અને ચેટ ગોપનીયતા (Phone Number & Chat Privacy)'
                    : language === 'HI'
                    ? 'मोबाइल नंबर और चैट गोपनीयता (Phone Number & Chat Privacy)'
                    : 'Phone Number & In-App Chat Privacy'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'સામાન્ય યુઝર્સનો મોબાઈલ નંબર ડિફોલ્ટ રૂપે ગોપનીય (Private) રહે છે અને જાહેરમાં બતાવવામાં આવતો નથી; યુઝર ઈચ્છે તો જ ચેટમાં સ્વેચ્છાએ શેર કરી શકે છે. માત્ર જે યુઝર્સ સ્વેચ્છાએ "સર્વિસ એક્સપર્ટ / કારીગર", "દુકાન" કે "નોકરી/જાહેરાત" ડિરેક્ટરીમાં પોતાનો વ્યવસાય રજિસ્ટર કરે છે, તેમનો સંપર્ક નંબર ગ્રાહકોના સીધા સંપર્ક માટે લિસ્ટિંગમાં દર્શાવવામાં આવે છે.'
                  : language === 'HI'
                  ? 'सामान्य उपयोगकर्ताओं का मोबाइल नंबर डिफ़ॉल्ट रूप से गोपनीय (Private) रहता है और सार्वजनिक रूप से नहीं दिखाया जाता; उपयोगकर्ता चाहें तो चैट में स्वेच्छा से साझा कर सकते हैं। केवल वे उपयोगकर्ता जो स्वेच्छा से "सर्विस एक्सपर्ट/कारीगर", "दुकान" या "नौकरी/विज्ञापन" डायरेक्टरी में अपना व्यवसाय पंजीकृत करते हैं, उनका संपर्क नंबर ग्राहकों की सुविधा के लिए डायरेक्टरी में प्रदर्शित होता है।'
                  : 'Regular users’ phone numbers are kept private by default and are never displayed publicly unless voluntarily shared inside private chat. Only users who voluntarily register a public listing in the Service Expert, Local Shop, or Job/Ad Directory choose to display their contact number so local customers can reach them directly.'}
              </p>
            </div>

            {/* Section 4: Device Permissions */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">4</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? 'ડિવાઇસ પરવાનગીઓ: કેમેરા, ફોટો અને લોકેશન (Device Permissions Usage)'
                    : language === 'HI'
                    ? 'डिवाइस अनुमतियाँ: कैमरा, फोटो और लोकेशन (Device Permissions Usage)'
                    : 'Device Permissions: Camera, Photos & Location'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'લોકોહેલ્પ એપ તમારી સ્પષ્ટ પરવાનગીથી જ (a) કેમેરા અને ફોટો ગેલેરીનો ઉપયોગ માત્ર લાઈવ સેલ્ફી, પ્રોફાઇલ ફોટો, દુકાન/વ્યવસાયના ફોટા અથવા ચેટમાં ફોટો અપલોડ કરવા માટે કરે છે, અને (b) લોકેશન (GPS/શહેર) નો ઉપયોગ માત્ર તમારા વિસ્તારની નજીકની પોસ્ટ્સ, કારીગરો, દુકાનો અને નોકરીઓ બતાવવા માટે કરે છે. બેકગ્રાઉન્ડમાં તમારું લોકેશન, કોન્ટેક્ટ લિસ્ટ કે ખાનગી મીડિયા ક્યારેય ટ્રેક કરવામાં આવતું નથી.'
                  : language === 'HI'
                  ? 'लोकोहेल्प ऐप केवल आपकी स्पष्ट अनुमति से ही (a) कैमरा और फोटो गैलरी का उपयोग केवल लाइव सेल्फी, प्रोफ़ाइल फ़ोटो, दुकान/व्यवसाय की फ़ोटो या चैट में छवि अपलोड करने के लिए करता है, और (b) लोकेशन (GPS/शहर) का उपयोग केवल आपके आस-पास के क्षेत्र की लाइव मदद, कारीगरों, दुकानों और नौकरियों को दिखाने के लिए करता है। बैकग्राउंड में आपकी लोकेशन, कॉन्टैक्ट लिस्ट या निजी मीडिया कभी ट्रैक नहीं किया जाता।'
                  : 'LocoHelp accesses (a) Camera & Photo Gallery strictly with your explicit permission when you take a live selfie, upload profile/work/shop photos, or share images in chat, and (b) Location (GPS/City) strictly to show nearby local posts, professionals, shops, and jobs in your area. We never track your location in the background or access your phonebook contacts.'}
              </p>
            </div>

            {/* Section 5: Data Security & No Third-Party Selling */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">5</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? 'ડેટા સુરક્ષા અને ગોપનીયતા (Data Security & Zero Third-Party Selling)'
                    : language === 'HI'
                    ? 'डेटा सुरक्षा और गोपनीयता (Data Security & Zero Third-Party Selling)'
                    : 'Data Security & Zero Third-Party Selling'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'તમામ યુઝર ડેટા અને પાસવર્ડ્સ સુરક્ષિત એન્ક્રિપ્ટેડ ક્લાઉડ ડેટાબેઝમાં રાખવામાં આવે છે. અમે તમારો પર્સનલ ડેટા કોઈપણ થર્ડ-પાર્ટી એડવર્ટાઇઝર્સ કે માર્કેટિંગ કંપનીઓને ક્યારેય વેચતા કે શેર કરતા નથી. પ્લેટફોર્મ પર સ્પામ કે છેતરપિંડી રોકવા માટે એડમિન ટીમ દ્વારા સતત મોનિટરિંગ કરવામાં આવે છે.'
                  : language === 'HI'
                  ? 'सभी उपयोगकर्ता डेटा और पासवर्ड सुरक्षित एन्क्रिप्टेड क्लाउड डेटाबेस में रखे जाते हैं। हम आपका व्यक्तिगत डेटा किसी भी थर्ड-पार्टी विज्ञापनदाता या मार्केटिंग कंपनी को कभी नहीं बेचते या साझा नहीं करते हैं। प्लेटफ़ॉर्म पर स्पैम और धोखाधड़ी रोकने के लिए एडमिन टीम द्वारा सुरक्षा निगरानी रखी जाती है।'
                  : 'All user data and credentials are protected using industry-standard encryption and stored in secure cloud databases. We strictly do not sell, rent, or trade your personal data to third-party advertisers or marketing agencies.'}
              </p>
            </div>

            {/* Section 6: Data Retention & Account Deletion Policy */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">6</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? 'એકાઉન્ટ અને ડેટા ડિલીટ નીતિ (Account & Data Deletion Policy)'
                    : language === 'HI'
                    ? 'अकाउंट और डेटा डिलीट नीति (Account & Data Deletion Policy)'
                    : 'Account & Data Deletion Policy'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'યુઝર્સ કોઈપણ સમયે એપના Settings > "Request Account Closure / Delete Account" વિકલ્પ દ્વારા અથવા support@locohelp.com પર ઈમેઈલ કરીને પોતાનું એકાઉન્ટ અને અંગત ડેટા કાયમી ધોરણે ડિલીટ કરવાની વિનંતી કરી શકે છે. વિનંતી બાદ તમારી પ્રોફાઇલ, પોસ્ટ્સ અને વ્યક્તિગત માહિતી કાયમી ધોરણે હટાવી દેવામાં આવે છે.'
                  : language === 'HI'
                  ? 'उपयोगकर्ता किसी भी समय ऐप के Settings > "अकाउंट बंद / डिलीट करने का अनुरोध" विकल्प के माध्यम से या support@locohelp.com पर ईमेल करके अपना अकाउंट और व्यक्तिगत डेटा स्थायी रूप से डिलीट करने का अनुरोध कर सकते हैं। अनुरोध के बाद आपकी प्रोफ़ाइल, पोस्ट और व्यक्तिगत डेटा स्थायी रूप से हटा दिया जाता है।'
                  : 'Users can request permanent deletion of their account and personal data at any time directly inside the app via Settings > "Request Account Closure / Delete Account" or by emailing support@locohelp.com. Upon verification, your profile, posts, and personal data are permanently removed from active systems.'}
              </p>
            </div>

            {/* Section 7: 18+ Age Policy & Grievance Redressal */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">7</span>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {language === 'GU'
                    ? '૧૮+ વય મર્યાદા અને સહાયતા સંપર્ક (18+ Age Policy & Support Contact)'
                    : language === 'HI'
                    ? '18+ आयु सीमा और सहायता संपर्क (18+ Age Policy & Support Contact)'
                    : '18+ Age Policy & Support Contact'}
                </h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                {language === 'GU'
                  ? 'લોકોહેલ્પ પ્લેટફોર્મ ૧૮ વર્ષ કે તેથી વધુ વયના નાગરિકો માટે છે; અમે ૧૮ વર્ષથી ઓછી વયના બાળકોનો ડેટા જાણીજોઈને એકત્રિત કરતા નથી. કોઈપણ ગોપનીયતા પ્રશ્નો, ડેટા સુધારણા અથવા સહાયતા માટે અમારો સંપર્ક કરો:'
                  : language === 'HI'
                  ? 'लोकोहेल्प प्लेटफ़ॉर्म 18 वर्ष या उससे अधिक आयु के नागरिकों के उपयोग के लिए है; हम जानबूझकर 18 वर्ष से कम आयु के बच्चों का डेटा एकत्रित नहीं करते हैं। किसी भी गोपनीयता संबंधी प्रश्न, डेटा अपडेट या सहायता के लिए हमसे संपर्क करें:'
                  : 'LocoHelp is intended for users aged 18 years and older; we do not knowingly collect personal data from minors under 18. For any privacy queries, data access/deletion requests, or support, please contact us:'}
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-opacity"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="2.2" />
                    <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2.2" />
                    <circle cx="17.2" cy="6.8" r="1.3" fill="currentColor" />
                  </svg>
                  <span>@locohelpofficial</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold">LocoHelp © 2026 • Connecting Local Communities</span>
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
