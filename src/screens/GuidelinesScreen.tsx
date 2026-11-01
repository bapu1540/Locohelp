import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, AlertOctagon, UserCheck, ShieldAlert, CheckCircle2, Scale, Lock, FileCheck2, MessageSquareWarning, HeartPulse, Banknote } from 'lucide-react';
import { useLanguage } from '../i18n';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

export default function GuidelinesScreen({ onBack, onReport }: { onBack: () => void; onReport?: () => void }) {
  const { t, language } = useLanguage();
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const headerTitle =
    language === 'GU'
      ? 'નિયમો અને શરતો (Terms & Conditions)'
      : language === 'HI'
      ? 'नियम एवं शर्तें (Terms & Conditions)'
      : 'Terms & Conditions & Safety Rules';

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] dark:bg-slate-900 transition-colors">
      <div className="flex items-center px-4 py-4 pt-10 sm:pt-4 border-b border-[#DFDBCF] dark:border-slate-800 sticky top-0 bg-[#FCFAF5]/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs z-10">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 hover:bg-[#EAE6DC] dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
        </button>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{headerTitle}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 pb-12 max-w-2xl mx-auto w-full">
        <div className="text-center mb-2">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-[#FCFAF5] dark:border-slate-800 shadow-sm">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1.5">{t('guide.shield')}</h3>
          <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-md mx-auto">{t('guide.shieldDesc')}</p>
        </div>

        {/* Core Community Safety Rules */}
        <div className="space-y-3.5">
          <Rule 
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            title={t('guide.r1.t')}
            desc={t('guide.r1.d')}
          />
          <Rule 
            icon={<AlertOctagon className="w-5 h-5 text-rose-500" />}
            title={t('guide.r2.t')}
            desc={t('guide.r2.d')}
          />
          <Rule 
            icon={<UserCheck className="w-5 h-5 text-indigo-500" />}
            title={t('guide.r3.t')}
            desc={t('guide.r3.d')}
          />
        </div>

        {/* Detailed Terms of Service & Platform Rules Section */}
        <div className="pt-2 space-y-3.5">
          <div className="flex items-center gap-2 px-1">
            <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {language === 'GU'
                ? 'અમે કેવી રીતે કામ કરીએ છીએ અને નિયમો (How We Work & Terms)'
                : language === 'HI'
                ? 'हम कैसे काम करते हैं और प्लेटफ़ॉर्म के नियम (How We Work & Terms)'
                : 'How LocoHelp Works & Platform Terms'}
            </h4>
          </div>

          <Rule
            icon={<Scale className="w-5 h-5 text-amber-600" />}
            title={
              language === 'GU'
                ? '૧. પ્લેટફોર્મની ભૂમિકા — અમે કેવી રીતે કામ કરીએ છીએ (Connecting Platform Role)'
                : language === 'HI'
                ? '1. प्लेटफॉर्म की भूमिका — हम कैसे काम करते हैं (Connecting Platform Role)'
                : '1. Platform Role — How We Work (Connecting Mediator Only)'
            }
            desc={
              language === 'GU'
                ? 'લોકોહેલ્પ (LocoHelp) માત્ર સ્થાનિક નાગરિકો, કારીગરો (Service Experts), દુકાનદારો અને નોકરી શોધનારાઓને આપસમાં જોડતું એક 100% નિઃશુલ્ક હાયપર-લોકલ માધ્યમ છે. લોકોહેલ્પ કોઈપણ કારીગર, દુકાનદાર કે યુઝરનું માલિક (Employer), કોન્ટ્રાક્ટર, એજન્ટ કે બ્રોકર નથી.'
                : language === 'HI'
                ? 'लोकोहेल्प (LocoHelp) केवल स्थानीय नागरिकों, सर्विस एक्सपर्ट्स (कारीगरों), दुकानदारों और रोज़गार खोजने वालों को आपस में जोड़ने वाला एक 100% निःशुल्क माध्यम है। लोकोहेल्प किसी भी कारीगर, दुकानदार या उपयोगकर्ता का नियोक्ता (Employer), ठेकेदार, एजेंट या ब्रोकर नहीं है।'
                : 'LocoHelp is a 100% free hyper-local community platform that simply connects local citizens, service experts, shops, and job seekers with each other. LocoHelp is not an employer, contractor, agent, or broker of any listed user or service provider.'
            }
          />

          <Rule
            icon={<Banknote className="w-5 h-5 text-emerald-600" />}
            title={
              language === 'GU'
                ? '૨. ૧૦૦% નિઃશુલ્ક સેવા (૦% કમિશન) અને નાણાકીય કે કામની જવાબદારી નહીં (Zero Financial & Work Liability)'
                : language === 'HI'
                ? '2. 100% निःशुल्क सेवा (0% कमीशन) एवं लेन-देन/काम की जिम्मेदारी नहीं (Zero Financial & Work Liability)'
                : '2. 100% Free (0% Commission) & Zero Liability for Payments or Work Quality'
            }
            desc={
              language === 'GU'
                ? 'લોકોહેલ્પ સેવા લેનાર કે સેવા આપનાર (કારીગર/દુકાનદાર) કોઈપણ પાસેથી ₹1 પણ ફી કે કમિશન લેતું નથી. કોઈપણ નાણાકીય લેવડદેવડ (રોકડ, UPI કે એડવાન્સ પેમેન્ટ), ભાવતાલ, કામની ગુણવત્તા, વિલંબ, નુકસાન કે આપસી વિવાદ સંપૂર્ણપણે ગ્રાહક અને સર્વિસ પ્રોવાઈડર વચ્ચે રહેશે. આવા કોઈપણ ઓફલાઇન વ્યવહાર કે નુકસાન માટે લોકોહેલ્પની કોઈ જવાબદારી રહેશે નહીં.'
                : language === 'HI'
                ? 'लोकोहेल्प सेवा लेने वाले (ग्राहक) या सेवा देने वाले (कारीगर/दुकानदार) किसी से भी कोई शुल्क या कमीशन (0% Commission) नहीं लेता है। किसी भी प्रकार का आर्थिक लेन-देन (नकद, UPI या एडवांस पेमेंट), रेट तय करना, काम की गुणवत्ता, देरी, नुकसान या आपसी विवाद पूरी तरह से उपयोगकर्ता और सर्विस प्रोवाइडर के बीच होगा। ऐसे किसी भी ऑफलाइन लेन-देन या विवाद के लिए लोकोहेल्प की कोई जिम्मेदारी नहीं होगी।'
                : 'LocoHelp charges ₹0 fee and 0% commission from both service seekers and service providers. Any financial transaction (cash, UPI, or advance payment), price negotiation, service quality, delay, damage, or offline dispute is strictly between the user and the service provider. LocoHelp bears zero liability for any offline transaction or service outcome.'
            }
          />

          <Rule
            icon={<UserCheck className="w-5 h-5 text-indigo-600" />}
            title={
              language === 'GU'
                ? '૩. વેરિફાઈડ બેજ અને વ્યક્તિગત સુરક્ષા ડિસ્ક્લેમર (Verified Badge & Personal Safety)'
                : language === 'HI'
                ? '3. वेरिफाइड बैज और व्यक्तिगत सुरक्षा अस्वीकरण (Verified Badge & Personal Safety)'
                : '3. Verified Badge Disclaimer & Independent Verification'
            }
            desc={
              language === 'GU'
                ? 'એપમાં દેખાતો "Verified" બેજ માત્ર એ દર્શાવે છે કે યુઝરે રજિસ્ટ્રેશન સમયે પોતાનું ઈમેઈલ/સંપર્ક વિગત OTP અને પ્રોફાઇલ ફોટો દ્વારા ચકાસેલ છે. તે કોઈના ચારિત્ર્ય કે કામની કુશળતાની ગેરંટી નથી. કોઈપણ અજાણી વ્યક્તિને ઘરે બોલાવતા પહેલાં, કામ સોંપતા પહેલાં કે પેમેન્ટ કરતા પહેલાં પોતાની રીતે સંપૂર્ણ ચકાસણી કરવી યુઝરની પોતાની જવાબદારી છે.'
                : language === 'HI'
                ? 'ऐप पर दिखने वाला "Verified" बैज केवल यह दर्शाता है कि उपयोगकर्ता ने पंजीकरण के समय अपना ईमेल/संपर्क विवरण OTP और प्रोफ़ाइल फ़ोटो से सत्यापित किया है। यह किसी व्यक्ति के चरित्र या काम की कुशलता की गारंटी नहीं है। किसी भी अनजान व्यक्ति को घर बुलाने, काम सौंपने या पेमेंट करने से पहले स्वयं पूरी जांच-पड़ताल करना उपयोगकर्ता की अपनी जिम्मेदारी है।'
                : 'A "Verified" badge on a profile only indicates that the user verified their basic registration contact details and profile photo. It does not guarantee skill or character. Users must independently verify details and exercise standard personal safety precautions before hiring, meeting, or paying anyone.'
            }
          />

          <Rule
            icon={<HeartPulse className="w-5 h-5 text-rose-600" />}
            title={
              language === 'GU'
                ? '૪. હોસ્પિટલ અને મેડિકલ કેટેગરી ડિસ્ક્લેમર (Medical Directory Disclaimer)'
                : language === 'HI'
                ? '4. हॉस्पिटल एवं मेडिकल कैटेगरी अस्वीकरण (Medical Directory Disclaimer)'
                : '4. Hospital & Medical Category Disclaimer'
            }
            desc={
              language === 'GU'
                ? '"હોસ્પિટલ અને મેડિકલ" કેટેગરી માત્ર સ્થાનિક ક્લિનિક, મેડિકલ સ્ટોર, લેબોરેટરી કે એમ્બ્યુલન્સની સંપર્ક માહિતી (Directory Information) આપવા માટે છે. લોકોહેલ્પ કોઈ મેડિકલ સલાહ, નિદાન (Diagnosis), સારવાર કે ઈમરજન્સી મેડિકલ સેવાની ગેરંટી આપતું નથી. મેડિકલ ઈમરજન્સીમાં તરત જ અધિકૃત ડોક્ટર કે હેલ્પલાઇન (108/112) નો સંપર્ક કરો.'
                : language === 'HI'
                ? '"हॉस्पिटल और मेडिकल" कैटेगरी केवल स्थानीय क्लिनिक, मेडिकल स्टोर, लैब या एम्बुलेंस की संपर्क जानकारी (Directory Information) उपलब्ध कराने के लिए है। लोकोहेल्प कोई चिकित्सा सलाह, निदान (Diagnosis), इलाज या आपातकालीन चिकित्सा सेवा की गारंटी नहीं देता है। किसी भी मेडिकल इमरजेंसी में तुरंत अधिकृत डॉक्टर या हेल्पलाइन (108/112) से संपर्क करें।'
                : 'The "Hospital & Medical" category is strictly a local informational directory for clinics, pharmacies, labs, and ambulance contacts. LocoHelp does not provide medical advice, diagnosis, treatment, or emergency medical guarantees. In a medical emergency, always contact qualified healthcare professionals or emergency services (108/112) immediately.'
            }
          />

          <Rule
            icon={<FileCheck2 className="w-5 h-5 text-blue-600" />}
            title={
              language === 'GU'
                ? '૫. યુઝર કન્ટેન્ટ (UGC) નિયમો, બ્લોક/રિપોર્ટ અને ઝીરો-ટોલરન્સ પોલિસી (UGC & Zero-Tolerance Policy)'
                : language === 'HI'
                ? '5. यूज़र कंटेंट (UGC) नियम, ब्लॉक/रिपोर्ट और ज़ीरो-टॉलरेंस नीति (UGC & Zero-Tolerance Policy)'
                : '5. User-Generated Content (UGC), Block/Report & Zero-Tolerance Policy'
            }
            desc={
              language === 'GU'
                ? 'એકાઉન્ટ બનાવતી વખતે કે પોસ્ટ/લિસ્ટિંગ મૂકતી વખતે સાચું નામ અને સાચી માહિતી આપવી ફરજિયાત છે. ખોટી ઓળખ, ભ્રામક જાહેરાત, એડવાન્સ પૈસાની છેતરપિંડી, ગેરકાયદેસર વસ્તુઓ કે અભદ્ર ભાષા પર સખત પ્રતિબંધ છે. દરેક પોસ્ટ અને ચેટમાં તરત જ "Block" અને "Report" કરવાની સુવિધા છે; નિયમ ભંગ કરનારનું કન્ટેન્ટ હટાવીને એકાઉન્ટ કાયમી ધોરણે બંધ (Permanent Ban) કરવામાં આવશે.'
                : language === 'HI'
                ? 'अकाउंट बनाते समय या कोई भी पोस्ट/લિસ્ટિંગ डालते समय वास्तविक नाम और सही जानकारी देना अनिवार्य है। फर्जी प्रोफ़ाइल, भ्रामक विज्ञापन, एडवांस पैसे मांगकर ठगी, गैर-कानूनी सामग्री या अभद्र भाषा सख्त वर्जित है। ऐप में हर पोस्ट और चैट पर तुरंत "Block" और "Report" करने की सुविधा है; नियम तोड़ने वाले का कंटेंट हटाकर उसका अकाउंट स्थायी रूप से बैन (Permanent Ban) कर दिया जाएगा।'
                : 'Users must provide their real name and accurate details when posting broadcasts, shops, services, or jobs. Fake profiles, misleading ads, advance-fee scams, illegal items, harassment, or abusive content are strictly prohibited. Users can immediately Block or Report any offending user or post directly on the post or inside chat; violating content is removed and offending accounts are permanently banned.'
            }
          />

          <Rule
            icon={<Lock className="w-5 h-5 text-purple-600" />}
            title={
              language === 'GU'
                ? '૬. ચેટ ગોપનીયતા અને સમુદાય સુરક્ષા (Chat Privacy & Community Safety)'
                : language === 'HI'
                ? '6. चैट गोपनीयता और सामुदायिक सुरक्षा (Chat Privacy & Community Safety)'
                : '6. Chat Privacy & Community Safety'
            }
            desc={
              language === 'GU'
                ? 'સામાન્ય યુઝર્સનો મોબાઈલ નંબર ડિફોલ્ટ રૂપે ગોપનીય (Private) રહે છે અને યુઝરની મરજીથી જ ચેટમાં શેર થાય છે. તમામ લોકોની સુરક્ષા જાળવવા માટે, જો કોઈ યુઝર છેતરપિંડી, સ્પામ કે નિયમ ભંગ કરે તો એડમિન ટીમ દ્વારા તેનું એકાઉન્ટ તરત જ બ્લોક કરી દેવામાં આવે છે.'
                : language === 'HI'
                ? 'सामान्य उपयोगकर्ताओं का मोबाइल नंबर डिफ़ॉल्ट रूप से गोपनीय (Private) रहता है और केवल आपकी इच्छा से ही चैट में साझा होता है। सभी की सुरक्षा बनाए रखने के लिए, यदि कोई उपयोगकर्ता धोखाधड़ी, स्पैम या नियम उल्लंघन करता है, तो एडमिन टीम द्वारा उसका अकाउंट तुरंत ब्लॉक कर दिया जाता है।'
                : 'General users’ phone numbers remain hidden by default and are only shared voluntarily in chat. To keep our local community safe, any account involved in spam, fraud, or rule violations is immediately reviewed and blocked by our Admin team.'
            }
          />
        </div>

        {/* Action Button: Privacy Policy */}
        <div className="pt-2 space-y-2.5">
          <button
            onClick={() => {
              setIsPrivacyOpen(true);
              window.dispatchEvent(new CustomEvent('locohelp_open_privacy_policy'));
            }}
            className="w-full py-3.5 px-4 bg-[#FCFAF5] hover:bg-[#EAE6DC] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl border border-[#DFDBCF] dark:border-slate-700 transition-colors flex items-center justify-between cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {language === 'EN'
                  ? 'Read Full Privacy Policy & Data Protection Rules'
                  : language === 'GU'
                  ? 'સંપૂર્ણ ગોપનીયતા નીતિ (Privacy Policy) વાંચો'
                  : 'पूर्ण गोपनीयता नीति (Privacy Policy) पढ़ें'}
              </span>
            </div>
            <span className="font-black">→</span>
          </button>
        </div>
      </div>

      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}

function Rule({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-[#FCFAF5] dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 p-4 sm:p-5 rounded-2xl shadow-xs">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-[#F4F1EA] dark:bg-slate-700 rounded-xl border border-[#EAE6DC] dark:border-slate-600 shrink-0">
          {icon}
        </div>
        <h4 className="text-slate-900 dark:text-white font-extrabold text-sm tracking-wide">{title}</h4>
      </div>
      <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed mt-1">{desc}</p>
    </div>
  );
}
