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
    headerSub: "આગામી નવા અપડેટ્સ અને સુવિધાઓ",
    bannerTitle: "નેક્સ્ટ જનરેશન હાયપર-લોકલ સહાય",
    bannerSub: "ઍપને સરળ અને ૧૦૦% મફત રાખતાં, આ અદ્યતન સુવિધાઓ તબક્કાવાર ઉમેરવામાં આવશે.",
    items: [
      {
        title: "ઑફલાઇન મેશ રિલે (નેટવર્ક વગર)",
        badge: "સંશોધનમાં",
        subtitle: "ઇન્ટરનેટ વગર ઇમરજન્સી સિગ્નલ",
        description: "જો મોબાઇલ નેટવર્ક અથવા ઇન્ટરનેટ બંધ થઈ જાય, તો બ્લૂટૂથ અને વાઇ-ફાઇ ડાયરેક્ટ દ્વારા નજીકના ફોન પર ઇમરજન્સી મેસેજ પહોંચશે."
      },
      {
        title: "વીડિયો કૉલ (લાઇવ વીડિયો)",
        badge: "તબક્કો ૨",
        subtitle: "ચેટમાં ડાયરેક્ટ વીડિયો વેરિફિકેશન",
        description: "ઇમરજન્સી સ્થિતિ અથવા ચોક્કસ મદદ જોવા માટે ચેટની અંદર એક ટૅપમાં સુરક્ષિત વીડિયો કૉલ."
      },
      {
        title: "ઑડિયો કૉલ (સુરક્ષિત વૉઇસ)",
        badge: "તબક્કો ૨",
        subtitle: "ઍપમાં ખાનગી વૉઇસ કૉલ",
        description: "તમારો અંગત મોબાઇલ નંબર આપ્યા વગર, ઍપની અંદર જ સીધો સ્પષ્ટ ઑડિયો કૉલ કરીને હેલ્પર સાથે વાત કરો."
      },
      {
        title: "AI ઑટો-ટ્રાન્સલેશન (Aઅ ટૉગલ)",
        badge: "તબક્કો ૩",
        subtitle: "બહુભાષી રીઅલ-ટાઇમ અનુવાદ",
        description: "ગુજરાતી, હિન્દી, અંગ્રેજી અને અન્ય ભાષાઓમાં ચેટ સંદેશાઓ આપમેળે અનુવાદિત થશે જેથી ભાષાની અડચણ ન રહે."
      },
      {
        title: "ટોપ કમ્યુનિટી હેલ્પર્સ અને કર્મ રિવોર્ડ્સ",
        badge: "આગામી",
        subtitle: "મદદ કરવા બદલ સન્માન અને બેજ",
        description: "પડોશીઓની સૌથી વધુ મદદ કરનાર સ્થાનિક સ્વયંસેવકોને વેરિફાઇડ બેજ, પ્રમાણપત્ર અને રિવોર્ડ પૉઇન્ટ્સ મળશે."
      }
    ],
    suggestTitle: "તમારો કોઈ વિચાર કે સૂચન છે?",
    suggestSub: "તમે આગામી અપડેટમાં શું ઇચ્છો છો? સેટિંગ્સ > માર્ગદર્શિકા અથવા સપોર્ટ દ્વારા અમને જરૂર જણાવો!"
  },
  MR: {
    headerTitle: "भविष्यातील व्हिजन आणि रोडमॅप",
    headerSub: "येणारे नवीन अपडेट्स आणि वैशिष्ट्ये",
    bannerTitle: "पुढील पिढीची हायपर-लोकल मदत",
    bannerSub: "ॲप सोपे आणि १००% मोफत ठेवून ही प्रगत वैशिष्ट्ये टप्प्याटप्प्याने जोडली जातील.",
    items: [
      {
        title: "ऑफलाइन मेश रिले (नेटवर्कशिवाय)",
        badge: "संशोधनात",
        subtitle: "इंटरनेटशिवाय आपत्कालीन सिग्नल",
        description: "इंटरनेट किंवा मोबाईल नेटवर्क बंद असल्यास ब्लूटूथ आणि वाय-फाय द्वारे जवळच्या फोनवर थेट संदेश पोहोचेल."
      },
      {
        title: "व्हिडिओ कॉल (थेट व्हिडिओ)",
        badge: "टप्पा २",
        subtitle: "चॅटमध्ये थेट व्हिडिओ पडताळणी",
        description: "तातडीची मदत किंवा परिस्थिती पाहण्यासाठी चॅटमध्ये थेट एका टॅपमध्ये व्हिडिओ कॉल."
      },
      {
        title: "ऑडिओ कॉल (सुरक्षित आवाज)",
        badge: "टप्पा २",
        subtitle: "ॲपमध्ये खाजगी व्हॉइस कॉल",
        description: "वैयक्तिक नंबर न देता थेट ॲपमधूनच मदतगाराशी स्पष्ट बोलण्याची सुविधा."
      },
      {
        title: "AI ऑटो-भाषांतर (Aअ टॉगल)",
        badge: "टप्पा ३",
        subtitle: "अनेक भाषांमध्ये थेट भाषांतर",
        description: "मराठी, हिंदी, इंग्रजी आणि इतर भाषांचे संदेश आपोआप भाषांतरित होतील."
      },
      {
        title: "टॉप कम्युनिटी मदतगार आणि रिवॉर्ड्स",
        badge: "लवकरच",
        subtitle: "मदतीबद्दल सन्मान आणि बॅज",
        description: "सर्वाधिक मदत करणाऱ्या स्थानिक स्वयंसेवकांना डिजिटल बॅज, प्रमाणपत्रे आणि रिवॉर्ड्स मिळतील."
      }
    ],
    suggestTitle: "तुमची काही कल्पना किंवा सूचना आहे का?",
    suggestSub: "पुढील अपडेटमध्ये काय हवे आहे ते सेटिंग्स > मार्गदर्शक तत्त्वे द्वारे सांगा!"
  },
  BN: {
    headerTitle: "ভবিষ্যতের ভিশন ও রোডম্যাপ",
    headerSub: "আসন্ন নতুন আপডেট এবং ফিচারসমূহ",
    bannerTitle: "নেক্সট জেনারেশন হাইপার-লোকাল সাহায্য",
    bannerSub: "অ্যাপটিকে সহজ ও ১০০% বিনামূল্যে রেখে ধাপে ধাপে এই ফিচারগুলো যুক্ত করা হবে।",
    items: [
      {
        title: "অফলাইন মেশ রিলে (নেটওয়ার্ক ছাড়া)",
        badge: "গবেষণাধীন",
        subtitle: "ইন্টারনেট ছাড়া জরুরি সংকেত",
        description: "মোবাইল নেটওয়ার্ক না থাকলেও ব্লুটুথ ও ওয়াইফাই ডিরেক্টের মাধ্যমে পাশের ফোনে বার্তা পৌঁছাবে।"
      },
      {
        title: "ভিডিও কল (লাইভ ভিডিও)",
        badge: "ফেজ ২",
        subtitle: "চ্যাটে সরাসরি ভিডিও যাচাই",
        description: "জরুরি পরিস্থিতি যাচাই করতে চ্যাটের ভেতর সরাসরি ভিডিও কল করার সুবিধা।"
      },
      {
        title: "অডিও কল (সুরক্ষিত ভয়েস)",
        badge: "ফেজ ২",
        subtitle: "অ্যাপের ভেতর ব্যক্তিগত ভয়েস কল",
        description: "ব্যক্তিগত ফোন নম্বর প্রকাশ না করেই সরাসরি অ্যাপে কথা বলার সুবিধা।"
      },
      {
        title: "এআই অটো-অনুবাদ (Aঅ টগল)",
        badge: "ফেজ ৩",
        subtitle: "বহুভাষিক তাৎক্ষণিক অনুবাদ",
        description: "বাংলা, হিন্দি, ইংরেজি বার্তা তৎক্ষণাৎ অনুবাদ হবে যাতে ভাষার কোনো বাধা না থাকে।"
      },
      {
        title: "সেরা কমিউনিটি সাহায্যকারী ও পুরষ্কার",
        badge: "শীঘ্রই",
        subtitle: "সাহায্য করার স্বীকৃতি ও ব্যাজ",
        description: "যাঁরা সবচেয়ে বেশি সাহায্য করবেন তাঁদের ভেরিফায়েড ব্যাজ ও সার্টিফিকেট দেওয়া হবে।"
      }
    ],
    suggestTitle: "আপনার কোনো মতামত বা পরামর্শ আছে?",
    suggestSub: "পরবর্তী আপডেটে কী চান তা সেটিংস > নির্দেশিকা এর মাধ্যমে আমাদের জানান!"
  },
  TA: {
    headerTitle: "எதிர்கால பார்வை & சாலை வரைபடம்",
    headerSub: "வரவிருக்கும் புதிய புதுப்பிப்புகள் மற்றும் அம்சங்கள்",
    bannerTitle: "அடுத்த தலைமுறை உள்ளூர் உதவி",
    bannerSub: "செயலியை எளிமையாகவும் 100% இலவசமாகவும் வைத்துக்கொண்டு இந்த அம்சங்கள் படிப்படியாக அறிமுகப்படுத்தப்படும்.",
    items: [
      {
        title: "ஆஃப்லைன் மெஷ் ரிலே (நெட்வொர்க் இன்றி)",
        badge: "ஆராய்ச்சியில்",
        subtitle: "இணையமில்லா அவசர சமிக்ஞை",
        description: "இணையம் இல்லாதபோதும் புளூடூத் மூலம் அருகிலுள்ள சாதனங்களுக்கு அவசர உதவி கோரிக்கை அனுப்பப்படும்."
      },
      {
        title: "வீடியோ அழைப்பு (நேரலை வீடியோ)",
        badge: "நிலை 2",
        subtitle: "அரட்டையில் நேரடி வீடியோ சரிபார்ப்பு",
        description: "அவசர தேவையை உடனடியாகப் பார்க்க அரட்டையிலேயே ஒரு தட்டல் வீடியோ அழைப்பு."
      },
      {
        title: "ஆடியோ அழைப்பு (பாதுகாப்பான குரல்)",
        badge: "நிலை 2",
        subtitle: "செயலிக்குள் தனிப்பட்ட குரல் அழைப்பு",
        description: "தனிப்பட்ட எண்ணைப் பகிராமல் செயலியிலேயே உதவியாளரிடம் நேரடியாகப் பேசும் வசதி."
      },
      {
        title: "AI தானியங்கி மொழிபெயர்ப்பு (Aஅ டோகிள்)",
        badge: "நிலை 3",
        subtitle: "பல மொழி நேரலை மொழிபெயர்ப்பு",
        description: "தமிழ், இந்தி, ஆங்கிலச் செய்திகள் உடனுக்குடன் மொழிபெயர்க்கப்படும்."
      },
      {
        title: "சிறந்த சமூக உதவியாளர்கள் & வெகுமதிகள்",
        badge: "விரைவில்",
        subtitle: "உதவி செய்வதற்கான அங்கீகாரம் & பேட்ஜ்கள்",
        description: "அதிகம் உதவும் உள்ளூர் தன்னார்வலர்களுக்கு அங்கீகரிக்கப்பட்ட பேட்ஜ்கள் மற்றும் சான்றிதழ்கள் வழங்கப்படும்."
      }
    ],
    suggestTitle: "உங்களிடம் ஏதேனும் யோசனை உள்ளதா?",
    suggestSub: "அடுத்த புதுப்பிப்பில் என்ன வேண்டும் என்பதை அமைப்புகள் > வழிகாட்டுதல்கள் மூலம் தெரிவிக்கவும்!"
  },
  TE: {
    headerTitle: "భవిష్యత్ విజన్ & రోడ్‌మ్యాప్",
    headerSub: "రాబోయే కొత్త అప్‌డేట్‌లు మరియు ఫీచర్లు",
    bannerTitle: "తదుపరి తరం లోకల్ సహాయం",
    bannerSub: "యాప్‌ను సరళంగా మరియు 100% ఉచితంగా ఉంచుతూ ఈ అధునాతన ఫీచర్లు దశలవారీగా ప్రవేశపెట్టబడతాయి.",
    items: [
      {
        title: "ఆఫ్‌లైన్ మెష్ రిలే (నెట్‌వర్క్ లేకుండా)",
        badge: "పరిశోధనలో",
        subtitle: "ఇంటర్నెట్ లేని అత్యవసర సంకేతాలు",
        description: "ఇంటర్నెట్ లేనప్పటికీ బ్లూటూత్ ద్వారా సమీప పరికరాలకు అత్యవసర సందేశం చేరుతుంది."
      },
      {
        title: "వీడియో కాల్ (లైవ్ వీడియో)",
        badge: "దశ 2",
        subtitle: "చాట్‌లో నేరుగా వీడియో ధృవీకరణ",
        description: "సమస్యను తక్షణమే చూడటానికి చాట్ లోపల సులభమైన వీడియో కాల్."
      },
      {
        title: "ఆడియో కాల్ (సురక్షిత వాయిస్)",
        badge: "దశ 2",
        subtitle: "యాప్‌లో ప్రైవేట్ వాయిస్ కాల్",
        description: "వ్యక్తిగత నంబర్ ఇవ్వకుండా నేరుగా యాప్‌లోనే సహాయకుడితో మాట్లాడే సదుపాయం."
      },
      {
        title: "AI ఆటో-అనువాదం (Aఅ టోగుల్)",
        badge: "దశ 3",
        subtitle: "బహుభాషా రియల్-టైమ్ అనువాదం",
        description: "తెలుగు, హిందీ, ఇంగ్లీష్ సందేశాలు స్వయంచాలకంగా అనువదించబడతాయి."
      },
      {
        title: "టాప్ కమ్యూనిటీ సహాయకులు & రివార్డులు",
        badge: "త్వరలో",
        subtitle: "సహాయం చేసినందుకు గుర్తింపు & బ్యాడ్జ్‌లు",
        description: "ఎక్కువ సహాయం చేసే వాలంటీర్లకు ధృవీకరించబడిన బ్యాడ్జ్‌లు మరియు సర్టిఫికెట్లు లభిస్తాయి."
      }
    ],
    suggestTitle: "మీకు ఏదైనా సలహా ఉందా?",
    suggestSub: "తదుపరి అప్‌డేట్‌లో మీకు ఏమి కావాలో సెట్టింగ్‌లు > మార్గదర్శకాలు ద్వారా తెలపండి!"
  },
  KN: {
    headerTitle: "ಭವಿಷ್ಯದ ದೃಷ್ಟಿಕೋನ ಮತ್ತು ರೋಡ್‌ಮ್ಯಾಪ್",
    headerSub: "ಮುಂಬರುವ ಹೊಸ ನವೀಕರಣಗಳು ಮತ್ತು ವೈಶಿಷ್ಟ್ಯಗಳು",
    bannerTitle: "ಮುಂದಿನ ಪೀಳಿಗೆಯ ಸ್ಥಳೀಯ ನೆರವು",
    bannerSub: "ಆಪ್ ಅನ್ನು ಸರಳ ಮತ್ತು 100% ಉಚಿತವಾಗಿರಿಸಿಕೊಂಡು ಈ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಹಂತ ಹಂತವಾಗಿ ಸೇರಿಸಲಾಗುತ್ತದೆ.",
    items: [
      {
        title: "ಆಫ್‌ಲೈನ್ ಮೆಶ್ ರಿಲೇ (ನೆಟ್‌ವರ್ಕ್ ಇಲ್ಲದೆ)",
        badge: "ಸಂಶೋಧನೆಯಲ್ಲಿ",
        subtitle: "ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದ ತುರ್ತು ಸಂಕೇತ",
        description: "ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದಿದ್ದರೂ ಬ್ಲೂಟೂತ್ ಮೂಲಕ ಹತ್ತಿರದ ಸಾಧನಗಳಿಗೆ ತುರ್ತು ಸಂದೇಶ ರವಾನೆಯಾಗುತ್ತದೆ."
      },
      {
        title: "ವೀಡಿಯೊ ಕರೆ (ಲೈವ್ ವೀಡಿಯೊ)",
        badge: "ಹಂತ 2",
        subtitle: "ಚಾಟ್‌ನಲ್ಲಿ ನೇರ ವೀಡಿಯೊ ಪರಿಶೀಲನೆ",
        description: "ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ನೇರವಾಗಿ ಪರಿಶೀಲಿಸಲು ಚಾಟ್‌ನಲ್ಲಿ ಒಂದು ಟ್ಯಾಪ್ ವೀಡಿಯೊ ಕರೆ."
      },
      {
        title: "ಆಡಿಯೋ ಕರೆ (ಸುರಕ್ಷಿತ ಧ್ವನಿ)",
        badge: "ಹಂತ 2",
        subtitle: "ಆಪ್‌ನಲ್ಲಿ ಖಾಸಗಿ ಧ್ವನಿ ಕರೆ",
        description: "ವೈಯಕ್ತಿಕ ನಂಬರ್ ಹಂಚಿಕೊಳ್ಳದೆ ನೇರವಾಗಿ ಆಪ್‌ನಲ್ಲಿ ಸಹಾಯಕನೊಂದಿಗೆ ಮಾತನಾಡುವ ಆಯ್ಕೆ."
      },
      {
        title: "AI ಸ್ವಯಂ-ಅನುವಾದ (Aಅ ಟಾಗಲ್)",
        badge: "ಹಂತ 3",
        subtitle: "ಬಹುಭಾಷಾ ನೈಜ-ಸಮಯದ ಅನುವಾದ",
        description: "ಕನ್ನಡ, ಹಿಂದಿ, ಇಂಗ್ಲಿಷ್ ಸಂದೇಶಗಳು ನೈಜ ಸಮಯದಲ್ಲಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಅನುವಾದಗೊಳ್ಳುತ್ತವೆ."
      },
      {
        title: "ಅಗ್ರ ಸಮುದಾಯ ಸಹಾಯಕರು ಮತ್ತು ಪ್ರತಿಫಲಗಳು",
        badge: "ಶೀಘ್ರದಲ್ಲೇ",
        subtitle: "ನೆರವಿಗೆ ಗೌರವ ಮತ್ತು ಬ್ಯಾಡ್ಜ್‌ಗಳು",
        description: "ಹೆಚ್ಚು ನೆರವು ನೀಡುವ ಸ್ವಯಂಸೇವಕರಿಗೆ ಪರಿಶೀಲಿಸಿದ ಬ್ಯಾಡ್ಜ್‌ಗಳು ಮತ್ತು ಪ್ರಮಾಣಪತ್ರಗಳು ಲಭ್ಯ."
      }
    ],
    suggestTitle: "ನಿಮ್ಮ ಬಳಿ ಯಾವುದೇ ಸಲಹೆ ಇದೆಯೇ?",
    suggestSub: "ಮುಂದಿನ ನವೀಕರಣದಲ್ಲಿ ಏನು ಬೇಕೆಂದು ಸೆಟ್ಟಿಂಗ್ಸ್ > ಮಾರ್ಗಸೂಚಿಗಳ ಮೂಲಕ ತಿಳಿಸಿ!"
  },
  PA: {
    headerTitle: "ਭਵਿੱਖ ਦਾ ਵਿਜ਼ਨ ਅਤੇ ਰੋਡਮੈਪ",
    headerSub: "ਆਉਣ ਵਾਲੇ ਨਵੇਂ ਅਪਡੇਟ ਅਤੇ ਫੀਚਰ",
    bannerTitle: "ਅਗਲੀ ਪੀੜ੍ਹੀ ਦੀ ਲੋਕਲ ਸਹਾਇਤਾ",
    bannerSub: "ਐਪ ਨੂੰ ਸਰਲ ਅਤੇ 100% ਮੁਫ਼ਤ ਰੱਖਦੇ ਹੋਏ ਇਹ ਉੱਨਤ ਫੀਚਰ ਪੜਾਅਵਾਰ ਸ਼ਾਮਲ ਕੀਤੇ ਜਾਣਗੇ।",
    items: [
      {
        title: "ਆਫਲਾਈਨ ਮੈਸ਼ ਰਿਲੇ (ਬਿਨਾਂ ਨੈੱਟਵਰਕ)",
        badge: "ਖੋਜ ਵਿੱਚ",
        subtitle: "ਇੰਟਰਨੈਟ ਤੋਂ ਬਿਨਾਂ ਐਮਰਜੈਂਸੀ ਸੰਕੇਤ",
        description: "ਇੰਟਰਨੈਟ ਨਾ ਹੋਣ ਤੇ ਵੀ ਬਲੂਟੁੱਥ ਰਾਹੀਂ ਨੇੜਲੇ ਫ਼ੋਨਾਂ ਤੇ ਸੁਨੇਹਾ ਪਹੁੰਚ ਜਾਵੇਗਾ।"
      },
      {
        title: "ਵੀਡੀਓ ਕਾਲ (ਲਾਈਵ ਵੀਡੀਓ)",
        badge: "ਪੜਾਅ 2",
        subtitle: "ਚੈਟ ਵਿੱਚ ਸਿੱਧੀ ਵੀਡੀਓ ਤਸਦੀਕ",
        description: "ਐਮਰਜੈਂਸੀ ਸਥਿਤੀ ਦੇਖਣ ਲਈ ਚੈਟ ਦੇ ਅੰਦਰ ਇੱਕ ਟੈਪ ਵਿੱਚ ਵੀਡੀਓ ਕਾਲ।"
      },
      {
        title: "ਆਡੀਓ ਕਾਲ (ਸੁਰੱਖਿਅਤ ਵਾਇਸ)",
        badge: "ਪੜਾਅ 2",
        subtitle: "ਐਪ ਵਿੱਚ ਨਿੱਜੀ ਵਾਇਸ ਕਾਲ",
        description: "ਨਿੱਜੀ ਫ਼ੋਨ ਨੰਬਰ ਦਿੱਤੇ ਬਿਨਾਂ ਸਿੱਧਾ ਐਪ ਵਿੱਚ ਮਦਦਗਾਰ ਨਾਲ ਗੱਲ ਕਰੋ।"
      },
      {
        title: "AI ਆਟੋ-ਅਨੁਵਾਦ (Aਅ ਟੌਗਲ)",
        badge: "ਪੜਾਅ 3",
        subtitle: "ਬਹੁਭਾਸ਼ਾਈ ਰੀਅਲ-ਟਾਈਮ ਅਨੁਵਾਦ",
        description: "ਪੰਜਾਬੀ, ਹਿੰਦੀ, ਅੰਗਰੇਜ਼ੀ ਸੁਨੇਹੇ ਆਪਣੇ-ਆਪ ਅਨੁਵਾਦ ਹੋਣਗੇ।"
      },
      {
        title: "ਟੌਪ ਕਮਿਊਨਿਟੀ ਮਦਦਗਾਰ ਅਤੇ ਇਨਾਮ",
        badge: "ਜਲਦੀ ਹੀ",
        subtitle: "ਮਦਦ ਕਰਨ ਬਦਲੇ ਮਾਣ ਅਤੇ ਬੈਜ",
        description: "ਵੱਧ ਮਦਦ ਕਰਨ ਵਾਲਿਆਂ ਨੂੰ ਵੈਰੀਫਾਈਡ ਬੈਜ ਅਤੇ ਸਰਟੀਫਿਕੇਟ ਮਿਲਣਗੇ।"
      }
    ],
    suggestTitle: "ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਕੋਈ ਸੁਝਾਅ ਹੈ?",
    suggestSub: "ਅਗਲੇ ਅਪਡੇਟ ਵਿੱਚ ਕੀ ਚਾਹੁੰਦੇ ਹੋ, ਸੈਟਿੰਗਜ਼ > ਦਿਸ਼ਾ-ਨਿਰਦੇਸ਼ ਰਾਹੀਂ ਦੱਸੋ!"
  },
  ML: {
    headerTitle: "ഭാവി കാഴ്ചപ്പാടും റോഡ്‌മാപ്പും",
    headerSub: "വരാനിരിക്കുന്ന പുതിയ അപ്‌ഡേറ്റുകളും ഫീച്ചറുകളും",
    bannerTitle: "അടുത്ത തലമുറ പ്രാദേശിക സഹായം",
    bannerSub: "ആപ്പ് ലളിതവും 100% സൗജന്യവുമായി നിലനിർത്തിക്കൊണ്ട് ഈ നൂതന ഫീച്ചറുകൾ ഘട്ടംഘട്ടമായി അവതരിപ്പിക്കും.",
    items: [
      {
        title: "ഓഫ്‌ലൈൻ മെഷ് റിലേ (നെറ്റ്‌വർക്ക് ഇല്ലാതെ)",
        badge: "ഗവേഷണത്തിൽ",
        subtitle: "ഇന്റർനെറ്റ് ഇല്ലാത്ത അടിയന്തര സിഗ്നലുകൾ",
        description: "ഇന്റർനെറ്റ് ഇല്ലാത്തപ്പോഴും ബ്ലൂടൂത്ത് വഴി അടുത്തുള്ള ഫോണുകളിലേക്ക് സന്ദേശം കൈമാറും."
      },
      {
        title: "വീഡിയോ കോൾ (തത്സമയ വീഡിയോ)",
        badge: "ഘട്ടം 2",
        subtitle: "ചാറ്റിൽ നേരിട്ടുള്ള വീഡിയോ പരിശോധന",
        description: "അടിയന്തര സാഹചര്യം നേരിട്ട് കാണാൻ ചാറ്റിൽ ഒറ്റ ടാപ്പിൽ വീഡിയോ കോൾ."
      },
      {
        title: "ഓഡിയോ കോൾ (സുരക്ഷിത വോയ്‌സ്)",
        badge: "ഘട്ടം 2",
        subtitle: "ആപ്പിൽ സ്വകാര്യ വോയ്‌സ് കോൾ",
        description: "വ്യക്തിഗത നമ്പർ പങ്കിടാതെ ആപ്പിൽ തന്നെ സഹായിയുമായി സംസാരിക്കാം."
      },
      {
        title: "AI ഓട്ടോ-വിവർത്തനം (Aഅ ടോഗിൾ)",
        badge: "ഘട്ടം 3",
        subtitle: "ബഹുഭാഷാ തത്സമയ വിവർത്തനം",
        description: "മലയാളം, ഹിന്ദി, ഇംഗ്ലീഷ് സന്ദേശങ്ങൾ തത്സമയം വിവർത്തനം ചെയ്യപ്പെടും."
      },
      {
        title: "ടോപ്പ് കമ്മ്യൂണിറ്റി സഹായികളും റിവാർഡുകളും",
        badge: "ഉടൻ",
        subtitle: "സഹായത്തിനുള്ള അംഗീകാരവും ബാഡ്ജുകളും",
        description: "ഏറ്റവും കൂടുതൽ സഹായിക്കുന്ന സന്നദ്ധപ്രവർത്തകർക്ക് ഡിജിറ്റൽ ബാഡ്ജുകളും സർട്ടിഫിക്കറ്റുകളും ലഭിക്കും."
      }
    ],
    suggestTitle: "നിങ്ങൾക്ക് എന്തെങ്കിലും നിർദ്ദേശമുണ്ടോ?",
    suggestSub: "അടുത്ത അപ്‌ഡേറ്റിൽ എന്താണ് വേണ്ടതെന്ന് ക്രമീകരണങ്ങൾ > മാർഗ്ഗനിർദ്ദേശങ്ങൾ വഴി അറിയിക്കൂ!"
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
        <div className="bg-amber-50/70 dark:bg-slate-800/50 border border-amber-200/70 dark:border-slate-700 rounded-2xl p-4 text-center space-y-1.5 mt-6">
          <p className="text-xs font-extrabold text-amber-900 dark:text-amber-300">
            {r.suggestTitle}
          </p>
          <p className="text-[11px] text-amber-800/80 dark:text-slate-400">
            {r.suggestSub}
          </p>
        </div>
      </div>
    </div>
  );
}
