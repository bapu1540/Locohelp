import React from 'react';
import { ArrowLeft, WifiOff, Video, Phone, Languages, Trophy, Rocket, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n';
import { Language } from '../types';

interface RoadmapItemData {
  number: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
}

const ROADMAP_I18N: Record<Language, {
  headerTitle: string;
  headerSub: string;
  bannerTitle: string;
  bannerSub: string;
  items: Array<{
    title: string;
    badge: string;
    subtitle: string;
    description: string;
  }>;
  suggestTitle: string;
  suggestSub: string;
}> = {
  EN: {
    headerTitle: "Future Vision & Roadmap",
    headerSub: "Upcoming new updates and features",
    bannerTitle: "Next Generation Hyper-Local Help",
    bannerSub: "Keeping the app simple and 100% free, these advanced features will be introduced step-by-step.",
    items: [
      {
        title: "Offline Mesh Relay (Zero Network)",
        badge: "In R&D",
        subtitle: "Zero Internet Emergency Signals",
        description: "If cellular data or Wi-Fi goes down, your phone's Bluetooth and Wi-Fi Direct will securely relay urgent requests to nearby devices."
      },
      {
        title: "Video Call (Live Video)",
        badge: "Phase 2",
        subtitle: "Direct Video Verify in Chat",
        description: "One-tap high-definition in-app video call to instantly verify medical situations, navigation directions, or exact help needed."
      },
      {
        title: "Audio Call (Secure Voice)",
        badge: "Phase 2",
        subtitle: "Private & In-App Voice Call",
        description: "Direct in-app crystal clear audio call to communicate with helpers without sharing your personal phone number."
      },
      {
        title: "AI Auto-Translation (Aअ Toggle)",
        badge: "Phase 3",
        subtitle: "Multi-Language Realtime Translation",
        description: "Real-time chat translation across Hindi, English, Gujarati, and other regional languages so language never hinders community help."
      },
      {
        title: "Top Community Helpers & Karma Rewards",
        badge: "Upcoming",
        subtitle: "Recognition & Badges for Helping",
        description: "Active neighborhood volunteers receive verified digital badges, public appreciation certificates, and community reward points."
      }
    ],
    suggestTitle: "Have an idea or suggestion?",
    suggestSub: "Let us know what features you want next through Settings > Guidelines or Support!"
  },
  HI: {
    headerTitle: "भविष्य का विज़न और रोडमैप",
    headerSub: "आने वाले नए अपडेट और सुविधाएं",
    bannerTitle: "नेक्स्ट जनरेशन हाइपर-लोकल सहायता",
    bannerSub: "ऐप को सरल और 100% मुफ्त रखते हुए, ये उन्नत सुविधाएं चरणबद्ध तरीके से जोड़ी जाएंगी।",
    items: [
      {
        title: "ऑफलाइन मेश रिले (बिना नेटवर्क)",
        badge: "अनुसंधान में",
        subtitle: "बिना इंटरनेट आपातकालीन सिग्नल",
        description: "यदि इंटरनेट या मोबाइल नेटवर्क बंद हो जाए, तो ब्लूटूथ और वाई-फाई डायरेक्ट के जरिए पास के फोन पर बिना इंटरनेट मदद पहुंचेगी।"
      },
      {
        title: "वीडियो कॉल (लाइव वीडियो)",
        badge: "चरण 2",
        subtitle: "चैट में सीधा वीडियो सत्यापन",
        description: "आपातकालीन स्थिति या सही समस्या देखने के लिए चैट के भीतर एक टैप में सुरक्षित वीडियो कॉल।"
      },
      {
        title: "ऑडियो कॉल (सुरक्षित वॉइस)",
        badge: "चरण 2",
        subtitle: "ऐप के भीतर निजी वॉइस कॉल",
        description: "अपना व्यक्तिगत मोबाइल नंबर साझा किए बिना, ऐप के भीतर ही सीधे मददगार से स्पष्ट बात करने की सुविधा।"
      },
      {
        title: "एआई ऑटो-ट्रांसलेशन (Aअ टॉगल)",
        badge: "चरण 3",
        subtitle: "बहुभाषी रीयल-टाइम अनुवाद",
        description: "हिंदी, गुजराती, अंग्रेजी और अन्य भाषाओं में चैट संदेश स्वतः अनुवादित होंगे ताकि भाषा बाधा न बने।"
      },
      {
        title: "शीर्ष मददगार और कर्मा रिवार्ड्स",
        badge: "आगामी",
        subtitle: "मदद करने पर पहचान और बैज",
        description: "आस-पड़ोस की सबसे ज्यादा मदद करने वाले स्वयंसेवकों को सत्यापित बैज, प्रमाण पत्र और रिवार्ड पॉइंट्स मिलेंगे।"
      }
    ],
    suggestTitle: "क्या आपका कोई विचार या सुझाव है?",
    suggestSub: "आप अगले अपडेट में क्या चाहते हैं? सेटिंग्स > दिशानिर्देश या सपोर्ट के माध्यम से हमें बताएं!"
  },
  GU: {
    headerTitle: "ભવિષ્યનું વિઝન અને રોડમેપ",
    headerSub: "આગામી નવા અપડેટ્સ અને ફિચર્સ",
    bannerTitle: "નેક્સ્ટ જનરેશન હાયપર-લોકલ હેલ્પ",
    bannerSub: "એપને સરળ અને 100% મફત રાખવાની સાથે આ ફિચર્સ ધીમે ધીમે ઉમેરવામાં આવશે.",
    items: [
      {
        title: "ઓફલાઈન મેશ રિલે (ઝીરો નેટવર્ક)",
        badge: "સંશોધનમાં",
        subtitle: "ઈન્ટરનેટ વગર ઈમરજન્સી મેસેજ",
        description: "ઈન્ટરનેટ ન હોવા છતાં આસપાસ બ્લૂટૂથ દ્વારા તમારો મેસેજ પહોંચશે."
      },
      {
        title: "વિડીયો કોલ (લાઈવ વિડીયો)",
        badge: "તબક્કો 2",
        subtitle: "ચેટમાં વિડીયો વેરિફિકેશન",
        description: "મદદગાર સાથે લાઈવ વિડીયો દ્વારા જગ્યા અને સ્થિતિ જુઓ."
      },
      {
        title: "ઓડિયો કોલ (સુરક્ષિત વોઈસ)",
        badge: "તબક્કો 2",
        subtitle: "ખાનગી અને સુરક્ષિત વોઈસ કોલ",
        description: "મોબાઈલ નંબર શેર કર્યા વગર એપમાંથી સીધી વાત કરો."
      },
      {
        title: "ઓટો-ટ્રાન્સલેશન (Aઅ)",
        badge: "તબક્કો 3",
        subtitle: "ભાષાંતર સુવિધા",
        description: "ગુજરાતી, હિન્દી અને અંગ્રેજીમાં ઓટો ટ્રાન્સલેશન."
      },
      {
        title: "ટોપ હેલ્પર્સ અને કર્મા રિવોર્ડ્સ",
        badge: "આગામી",
        subtitle: "મદદ કરવા બદલ રિવોર્ડ",
        description: "સૌથી વધુ મદદ કરનાર સ્વયંસેવકોને વેરિફાઈડ બેજ અને રિવોર્ડ મળશે."
      }
    ],
    suggestTitle: "શું તમારી પાસે કોઈ સૂચન છે?",
    suggestSub: "તમે આગળ શું ઉમેરવા માંગો છો? સપોર્ટ દ્વારા અમને જણાવો!"
  }
};

const ICONS = [
  <WifiOff key="1" className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
  <Video key="2" className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
  <Phone key="3" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
  <Languages key="4" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  <Trophy key="5" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
];

const BADGE_COLORS = [
  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700',
  'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700'
];

export default function RoadmapScreen({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const r = ROADMAP_I18N[language] || ROADMAP_I18N['HI'] || ROADMAP_I18N['EN'];

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] dark:bg-slate-900 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex items-center px-4 py-3.5 pt-10 sm:pt-4 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 bg-[#FDF8F5]/90 dark:bg-slate-900/90 backdrop-blur-xl z-20">
        <button onClick={onBack} className="p-2 -ml-2 mr-3 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
        </button>
        <div>
          <h2 className="text-[16px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <Rocket className="w-4 h-4 text-indigo-600" />
            <span>{r.headerTitle}</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {r.headerSub}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-12 z-10 space-y-4">
        {/* Intro Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-2xl p-4 text-white shadow-md relative overflow-hidden"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
            <Rocket className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-xl shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">{r.bannerTitle}</h3>
              <p className="text-xs text-indigo-100/90 mt-0.5 leading-relaxed">
                {r.bannerSub}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Numbered Vision List */}
        <div className="space-y-3">
          {r.items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-[#FCFAF5] dark:bg-slate-800/90 border border-[#EAE6DC] dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  {/* Number Badge */}
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-black text-xs text-slate-800 dark:text-slate-100 shadow-inner">
                    {index + 1}
                  </div>
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 shadow-xs">
                    {ICONS[index]}
                  </div>
                </div>

                {/* Status Pill */}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${BADGE_COLORS[index]}`}>
                  {item.badge}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  {item.title}
                </h4>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {item.subtitle}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Suggestion Card */}
        <div className="bg-amber-50/70 dark:bg-slate-800/50 border border-amber-200/70 dark:border-slate-700 rounded-2xl p-4 text-center space-y-2 mt-6">
          <p className="text-xs font-extrabold text-amber-900 dark:text-amber-300">
            {r.suggestTitle}
          </p>
          <p className="text-[11px] text-amber-800/80 dark:text-slate-400">
            {r.suggestSub}
          </p>
          <div className="pt-1">
            <a
              href="mailto:support@locohelp.com"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition-colors shadow-xs active:scale-95"
            >
              ✉️ support@locohelp.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
