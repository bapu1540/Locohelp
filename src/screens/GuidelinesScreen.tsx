import React from 'react';
import { ArrowLeft, ShieldCheck, AlertOctagon, UserCheck, ShieldAlert, CheckCircle2, Scale, Lock, FileCheck2, MessageSquareWarning } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function GuidelinesScreen({ onBack, onReport }: { onBack: () => void; onReport?: () => void }) {
  const { t, language } = useLanguage();

  const headerTitle =
    language === 'GU'
      ? 'સેવાની શરતો અને સુરક્ષા નિયમો (Terms & Rules)'
      : language === 'HI'
      ? 'सेवा की शर्तें व सुरक्षा नियम (Terms of Service)'
      : 'Terms of Service & Safety Rules';

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

        {/* Detailed Terms of Service Section */}
        <div className="pt-2 space-y-3.5">
          <div className="flex items-center gap-2 px-1">
            <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {language === 'GU'
                ? 'સેવાની કાનૂની શરતો (Terms of Service)'
                : language === 'HI'
                ? 'सेवा की मुख्य कानूनी शर्तें (Terms of Service)'
                : 'Official Terms of Service'}
            </h4>
          </div>

          <Rule
            icon={<Scale className="w-5 h-5 text-amber-600" />}
            title={
              language === 'GU'
                ? '૧. પ્લેટફોર્મની ભૂમિકા અને સ્વ-ચકાસણી (Platform Role & Verification)'
                : language === 'HI'
                ? '1. प्लेटफॉर्म की भूमिका और स्वयं सत्यापन (Platform Role & Disclaimer)'
                : '1. Platform Role & Independent Verification'
            }
            desc={
              language === 'GU'
                ? 'લોકોહેલ્પ (LocoHelp) માત્ર સ્થાનિક નાગરિકો, કારીગરો, દુકાનદારો અને નોકરી શોધનારાઓને જોડતું એક 100% નિઃશુલ્ક ટેકનોલોજી માધ્યમ છે. અમે કોઈ વચેટિયા નથી કે કોઈ કમિશન લેતા નથી. કોઈપણ નાણાકીય વ્યવહાર, એડવાન્સ પેમેન્ટ કે કામ સોંપતા પહેલાં સામેની વ્યક્તિ અને કામની ચકાસણી કરવાની સંપૂર્ણ જવાબદારી યુઝરની પોતાની રહેશે.'
                : language === 'HI'
                ? 'लोकोहेल्प (LocoHelp) केवल स्थानीय नागरिकों, कारीगरों, दुकानदारों और रोज़गार खोजने वालों को आपस में जोड़ने वाला एक 100% निःशुल्क तकनीकी माध्यम है। हम कोई ब्रोकर नहीं हैं और किसी भी काम का कमीशन नहीं लेते। किसी भी आर्थिक लेन-देन, एडवांस पेमेंट या काम सौंपने से पहले सामने वाले व्यक्ति और कार्य की सत्यता जाँचना पूरी तरह उपयोगकर्ता की स्वयं की जिम्मेदारी होगी।'
                : 'LocoHelp is solely a 100% free hyper-local technology connector linking citizens, skilled workers, shops, and job seekers. We do not act as a broker or charge any commission. Users are solely responsible for independently verifying identities, work quality, and terms before making any payment or entering into agreements.'
            }
          />

          <Rule
            icon={<FileCheck2 className="w-5 h-5 text-blue-600" />}
            title={
              language === 'GU'
                ? '૨. સાચી ઓળખ અને પ્રમાણિત લિસ્ટિંગ (Authentic Identity & Listings)'
                : language === 'HI'
                ? '2. वास्तविक पहचान और प्रामाणिक लिस्टिंग (Authentic Identity & Listings)'
                : '2. Authentic Identity & Verified Listings'
            }
            desc={
              language === 'GU'
                ? 'એકાઉન્ટ બનાવતી વખતે, 1-કલાકની લાઈવ પોસ્ટ મૂકતી વખતે, કારીગર/દુકાન રજિસ્ટર કરતી વખતે કે નોકરી/જાહેરાત મૂકતી વખતે સાચું નામ અને સાચી માહિતી આપવી ફરજિયાત છે. ખોટી ઓળખ, ભ્રામક જાહેરાત કે ગેરકાયદેસર પોસ્ટ મૂકવા પર સખત પ્રતિબંધ છે.'
                : language === 'HI'
                ? 'अकाउंट बनाते समय, 1-घंटे का लाइव ब्रॉडकास्ट करते समय, कारीगर/दुकान पंजीकृत करते समय या नौकरी/विज्ञापन डालते समय अपना वास्तविक नाम और सही जानकारी देना अनिवार्य है। फर्जी पहचान, भ्रामक विज्ञापन या गैर-कानूनी सामग्री पोस्ट करना सख्त वर्जित है।'
                : 'Providing your real name and accurate details is mandatory when registering an account, posting 1-hour live broadcasts, listing a shop/service, or publishing jobs and ads. Impersonation, misleading promotions, or unlawful listings are strictly prohibited.'
            }
          />

          <Rule
            icon={<Lock className="w-5 h-5 text-purple-600" />}
            title={
              language === 'GU'
                ? '૩. સુરક્ષિત ચેટ, નંબર ગોપનીયતા અને બ્લોક/રિપોર્ટ (Chat Safety & Privacy)'
                : language === 'HI'
                ? '3. सुरक्षित चैट, नंबर गोपनीयता और ब्लॉक/रिपोर्ट (Chat Safety & Privacy)'
                : '3. Safe In-App Chat, Number Privacy & Block/Report'
            }
            desc={
              language === 'GU'
                ? 'તમારી સુરક્ષા માટે મોબાઈલ નંબર જાહેરમાં દેખાતો નથી; જરૂર પડ્યે યુઝર સ્વેચ્છાએ ચેટમાં શેર કરી શકે છે. ચેટમાં અયોગ્ય ભાષા, સ્પામ કે ખોટી માંગણી કરનાર યુઝરને તમે તરત જ Block અથવા Report કરી શકો છો.'
                : language === 'HI'
                ? 'आपकी गोपनीयता के लिए किसी भी उपयोगकर्ता का मोबाइल नंबर सार्वजनिक रूप से नहीं दिखाया जाता; आवश्यकता पड़ने पर उपयोगकर्ता स्वेच्छा से चैट में साझा कर सकता है। चैट में अमर्यादित भाषा, स्पैम या अनुचित व्यवहार करने वाले को आप तुरंत Block (ब्लॉक) या Report (रिपोर्ट) कर सकते हैं।'
                : 'For your privacy, phone numbers are hidden by default and only shared voluntarily inside chat. Users must maintain respectful conduct; you can immediately Block or Report any user engaging in spam, harassment, or suspicious behavior.'
            }
          />

          <Rule
            icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
            title={
              language === 'GU'
                ? '૪. નિયમ ભંગ અને કાનૂની પાલન (Violation & Legal Compliance)'
                : language === 'HI'
                ? '4. नियम उल्लंघन और कानूनी अनुपालन (Violation & Legal Compliance)'
                : '4. Zero-Tolerance & Legal Compliance'
            }
            desc={
              language === 'GU'
                ? 'પ્લેટફોર્મના નિયમોનો ભંગ કરનાર અથવા છેતરપિંડીનો પ્રયાસ કરનારનું એકાઉન્ટ કાયમી ધોરણે બંધ કરવામાં આવશે. ગંભીર નિયમ ભંગ કે કાયદેસરની તપાસની સ્થિતિમાં, લાગુ કાયદાઓ હેઠળ સંબંધિત એકાઉન્ટ અને ચેટ રેકોર્ડ્સ સક્ષમ કાયદાકીય અને નિયમનકારી સત્તાવાળાઓ (Competent Legal & Regulatory Authorities) સાથે શેર કરવાનો અધિકાર સુરક્ષિત રહેશે.'
                : language === 'HI'
                ? 'प्लेटफ़ॉर्म के नियमों का उल्लंघन करने या धोखाधड़ी का प्रयास करने वाले उपयोगकर्ताओं का अकाउंट स्थायी रूप से बंद कर दिया जाएगा। गंभीर नियम उल्लंघन या वैध कानूनी जांच की स्थिति में, लागू कानूनों के तहत संबंधित अकाउंट व चैट रिकॉर्ड सक्षम कानूनी एवं नियामक प्राधिकरणों (Competent Legal & Regulatory Authorities) के साथ साझा करने का अधिकार सुरक्षित रहेगा।'
                : 'Accounts violating platform rules or attempting fraud will be permanently terminated. In the event of severe violations or lawful investigations, LocoHelp reserves the right to share relevant account and chat audit records with competent legal, regulatory, and law enforcement authorities in accordance with applicable laws.'
            }
          />
        </div>

        {/* Action Buttons: Privacy Policy & Report */}
        <div className="pt-2 space-y-2.5">
          <button
            onClick={() => {
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

          {onReport && (
            <button
              onClick={onReport}
              className="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-2xl border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquareWarning className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>
                  {language === 'EN'
                    ? 'Report Suspicious Activity or Rule Violation'
                    : language === 'GU'
                    ? 'શંકાસ્પદ પ્રવૃત્તિ કે નિયમ ભંગની ફરિયાદ (Report) કરો'
                    : 'संदिग्ध गतिविधि या नियम उल्लंघन की रिपोर्ट करें'}
                </span>
              </div>
              <span className="font-black">→</span>
            </button>
          )}
        </div>
      </div>
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
