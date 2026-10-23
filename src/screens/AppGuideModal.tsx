import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  HelpCircle, 
  Sparkles, 
  Wrench, 
  CheckCircle2, 
  Search, 
  ShieldCheck, 
  Zap, 
  HeartHandshake, 
  PhoneCall, 
  MapPin, 
  Flame,
  ArrowRight,
  Globe
} from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { Language } from '../types';
import { FEATURE_BANNERS, FeatureBannerDetail } from '../data/featureBanners';


interface AppGuideModalProps {
  onClose: () => void;
  onExplore?: () => void;
}

export interface GuideExample {
  id: number;
  category: Record<string, string>;
  query: Record<string, string>;
  outcome: Record<string, string>;
  tag: string;
  icon: string;
}

export const MULTI_EXAMPLES: GuideExample[] = [
  {
    id: 1,
    category: {
      EN: "Sports & Fitness",
      HI: "खेल और फिटनेस",
      GU: "રમતગમત અને ફિટનેસ",
      MR: "खेळ आणि फिटनेस",
      BN: "খেলাধুলা ও ফিটনেস",
      TA: "விளையாட்டு & உடற்தகுதி",
      TE: "క్రీడలు & ఫిట్‌నెస్",
      KN: "ಕ್ರೀಡೆ ಮತ್ತು ಫಿಟ್‌ನೆಸ್",
      PA: "ਖੇਡਾਂ ਅਤੇ ਤੰਦਰੁਸਤੀ",
      ML: "കായികവും ഫിറ്റ്നസും"
    },
    query: {
      EN: "Need 2 players for evening box cricket at local ground",
      HI: "शाम को बॉक्स क्रिकेट खेलने के लिए 2 खिलाड़ी चाहिए",
      GU: "સાંજે બોક્સ ક્રિકેટ રમવા માટે 2 ખેલાડીઓની જરૂર છે",
      MR: "संध्याकाळी बॉक्स क्रिकेट खेळण्यासाठी 2 खेळाडू हवे आहेत",
      BN: "সন্ধ্যায় বক্স ক্রিকেট খেলার জন্য ২ জন খেলোয়াড় দরকার",
      TA: "மாலை பாக்ஸ் கிரிக்கெட் விளையாட 2 வீரர்கள் தேவை",
      TE: "సాయంత్రం బాక్స్ క్రికెట్ ఆడటానికి 2 ఆటగాళ్ళు కావాలి",
      KN: "ಸಂಜೆ ಬಾಕ್ಸ್ ಕ್ರಿಕೆಟ್ ಆಡಲು 2 ಆಟಗಾರರು ಬೇಕಾಗಿದ್ದಾರೆ",
      PA: "ਸ਼ਾਮ ਨੂੰ ਬਾਕਸ ਕ੍ਰਿਕੇਟ ਖੇਡਣ ਲਈ 2 ਖਿਡਾਰੀਆਂ ਦੀ ਲੋੜ ਹੈ",
      ML: "വൈകുന്നേരം ബോക്സ് ക്രിക്കറ്റ് കളിക്കാൻ 2 കളിക്കാരെ വേണം"
    },
    outcome: {
      EN: "Nearby cricket lovers connect instantly",
      HI: "पास के क्रिकेट प्रेमी तुरंत जुड़ेंगे",
      GU: "નજીકના ક્રિકેટ પ્રેમીઓ તરત જોડાશે",
      MR: "जवळपासचे क्रिकेट प्रेमी लगेच जोडले जातील",
      BN: "কাছের ক্রিকেটপ্রেমীরা সঙ্গে সঙ্গে যুক্ত হবে",
      TA: "அருகிலுள்ள கிரிக்கெட் ஆர்வலர்கள் உடனடியாக இணைவர்",
      TE: "దగ్గరి క్రికెట్ ప్రేమికులు తక్షణమే కనెక్ట్ అవుతారు",
      KN: "ಹತ್ತಿರದ ಕ್ರಿಕೆಟ್ ಪ್ರೇಮಿಗಳು ತಕ್ಷಣ ಸಂಪರ್ಕ ಹೊಂದುತ್ತಾರೆ",
      PA: "ਨੇੜੇ ਦੇ ਕ੍ਰਿਕੇਟ ਪ੍ਰੇਮੀ ਤੁਰੰਤ ਜੁੜਨਗੇ",
      ML: "അടുത്തുള്ള ക്രിക്കറ്റ് പ്രേമികൾ തൽക്ഷണം ബന്ധപ്പെടും"
    },
    tag: "#Cricket",
    icon: "🏏"
  },
  {
    id: 2,
    category: {
      EN: "Emergency Plumbing",
      HI: "इमरजेंसी प्लंबर",
      GU: "ઇમરજન્સી પ્લમ્બર",
      MR: "तातडीचे प्लंबर काम",
      BN: "জরুরি প্লাম্বার",
      TA: "அவசர பிளம்பிங்",
      TE: "అత్యవసర ప్లంబింగ్",
      KN: "ತುರ್ತು ಪ್ಲಂಬಿಂಗ್",
      PA: "ਐਮਰਜੈਂਸੀ ਪਲੰਬਰ",
      ML: "അടിയന്തര പ്ലംബിംഗ്"
    },
    query: {
      EN: "Bathroom pipe burst, emergency plumber needed immediately",
      HI: "बाथरूम का पाइप लीक हो गया, तुरंत प्लंबर चाहिए",
      GU: "બાથરૂમની પાઇપ લીક થઈ ગઈ છે, તરત પ્લમ્બર જોઈએ છે",
      MR: "बाथरूमचा पाईپ लीक झाला आहे, तातडीने प्लंबर हवा आहे",
      BN: "বাথরুমের পাইপ ফেটে গেছে, এখনই প্লাম্বার প্রয়োজন",
      TA: "குளியலறை பைப் கசிகிறது, உடனடியாக பிளம்பர் தேவை",
      TE: "బాత్‌రూమ్ పైపు లీక్ అయింది, వెంటనే ప్లంబర్ కావాలి",
      KN: "ಸ್ನಾನಗೃಹದ ಪೈಪ್ ಸೋರುತ್ತಿದೆ, ತಕ್ಷಣ ಪ್ಲಂಬರ್ ಬೇಕು",
      PA: "ਬਾਥਰੂਮ ਦੀ ਪਾਈਪ ਲੀਕ ਹੋ ਗਈ ਹੈ, ਤੁਰੰਤ ਪਲੰਬਰ ਚਾਹੀਦਾ ਹੈ",
      ML: "ബാത്ത്റൂം പൈപ്പ് ചോരുന്നു, ഉടൻ പ്ലംബർ വേണം"
    },
    outcome: {
      EN: "Local plumber responds within 5-10 minutes",
      HI: "5-10 मिनट में 1km का प्लंबर संपर्क करेगा",
      GU: "5-10 મિનિટમાં 1 કિમીનો પ્લમ્બર સંપર્ક કરશે",
      MR: "5-10 मिनिटांत 1 किमीचा प्लंबर संपर्क करेल",
      BN: "৫-১০ মিনিটের মধ্যে স্থানীয় প্লাম্বার যোগাযোগ করবে",
      TA: "5-10 நிமிடங்களில் உள்ளூர் பிளம்பர் தொடர்புகொள்வார்",
      TE: "5-10 నిమిషాల్లో స్థానిక ప్లంబర్ సంప్రదిస్తారు",
      KN: "5-10 ನಿಮಿಷಗಳಲ್ಲಿ ಸ್ಥಳೀಯ ಪ್ಲಂಬರ್ ಸಂಪರ್ಕಿಸುತ್ತಾರೆ",
      PA: "5-10 ਮਿੰਟਾਂ ਵਿੱਚ ਨੇੜੇ ਦਾ ਪਲੰਬਰ ਸੰਪਰਕ ਕਰੇਗਾ",
      ML: "5-10 മിനിറ്റിനുള്ളിൽ അടുത്തുള്ള പ്ലംബർ ബന്ധപ്പെടും"
    },
    tag: "#Plumber",
    icon: "🔧"
  },
  {
    id: 3,
    category: {
      EN: "Electrical Repair",
      HI: "इलेक्ट्रिकल रिपेयर",
      GU: "ઇલેક્ટ્રિકલ રિપેર",
      MR: "इलेक्ट्रिक दुरुस्ती",
      BN: "বৈদ্যুতিক মেরামত",
      TA: "மின் பழுதுபார்ப்பு",
      TE: "ఎలక్ట్రికల్ మరమ్మతు",
      KN: "ವಿದ್ಯುತ್ ದುರಸ್ತಿ",
      PA: "ਬਿਜਲੀ ਦੀ ਮੁਰੰਮਤ",
      ML: "വൈദ്യുത അറ്റകുറ്റപ്പണി"
    },
    query: {
      EN: "Main circuit tripping, urgent electrician needed",
      HI: "घर की मेन लाइट ट्रिप हो रही है, इलेक्ट्रीशियन चाहिए",
      GU: "ઘરની મેઇન લાઇટ ટ્રીપ થાય છે, ઇલેક્ટ્રિશિયન જોઈએ છે",
      MR: "घरातील मुख्य वीज ट्रिप होत आहे, इलेक्ट्रिशियन हवा आहे",
      BN: "ঘরের মেইন লাইট ট্রিপ করছে, ইলেকট্রিশিয়ান চাই",
      TA: "வீட்டின் பிரதான மின்சாரம் ட்ரிப் ஆகிறது, எலக்ட்ரீஷியன் தேவை",
      TE: "ఇంటి మెయిన్ లైట్ ట్రిప్ అవుతోంది, ఎలక్ట్రీషియన్ కావాలి",
      KN: "ಮನೆಯ ಮುಖ್ಯ ವಿದ್ಯುತ್ ಟ್ರಿಪ್ ಆಗುತ್ತಿದೆ, ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ ಬೇಕು",
      PA: "ਘਰ ਦੀ ਮੇਨ ਲਾਈਟ ਟ੍ਰਿਪ ਹੋ ਰਹੀ ਹੈ, ਇਲੈਕਟ੍ਰੀਸ਼ੀਅਨ ਚਾਹੀਦਾ ਹੈ",
      ML: "മെയിൻ സ്വിച്ച് ട്രിപ്പ് ആകുന്നു, ഇലക്ട്രീഷ്യനെ വേണം"
    },
    outcome: {
      EN: "Verified neighborhood electrician fixes fuse safely",
      HI: "मोहल्ले का इलेक्ट्रीशियन आकर तुरंत ठीक करेगा",
      GU: "વિસ્તારનો ઇલેક્ટ્રિશિયન આવીને તરત સમારકામ કરશે",
      MR: "परिसरातील इलेक्ट्रिशियन येऊन लगेच दुरुस्त करेल",
      BN: "এলাকার ইলেকট্রিশিয়ান এসে দ্রুত মেরামত করবে",
      TA: "உள்ளூர் எலக்ட்ரீஷியன் வந்து பாதுகாப்பாக சரிசெய்வார்",
      TE: "స్థానిక ఎలక్ట్రీషియన్ వచ్చి వెంటనే సరిచేస్తారు",
      KN: "ಸ್ಥಳೀಯ ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ ಬಂದು ತಕ್ಷಣ ಸರಿಪಡಿಸುತ್ತಾರೆ",
      PA: "ਇਲਾਕੇ ਦਾ ਇਲੈਕਟ੍ਰੀਸ਼ੀਅਨ ਆ ਕੇ ਤੁਰੰਤ ਠੀਕ ਕਰੇਗਾ",
      ML: "അടുത്തുള്ള ഇലക്ട്രീഷ്യൻ എത്തി സുരക്ഷിതമായി ശരിയാക്കും"
    },
    tag: "#Electrician",
    icon: "⚡"
  },
  {
    id: 4,
    category: {
      EN: "Vehicle Breakdown",
      HI: "गाड़ी पंचर व खराबी",
      GU: "વાહન પંચર અને ખરાબી",
      MR: "गाडी पंक्चर व दुरुस्ती",
      BN: "যানবাহন পাংচার ও মেরামত",
      TA: "வாகன பழுது & பஞ்சர்",
      TE: "వాహనం పంచర్ & మరమ్మతు",
      KN: "ವಾಹನ ಪಂಕ್ಚರ್ & ರಿಪೇರಿ",
      PA: "ਗੱਡੀ ਪੰਚਰ ਤੇ ਖਰਾਬੀ",
      ML: "വാഹന തകരാർ & പഞ്ചർ"
    },
    query: {
      EN: "Bike flat tyre puncture near main circle, need help",
      HI: "सर्कल के पास बाइक पंचर हो गई, मदद चाहिए",
      GU: "સર્કલ પાસે બાઇક પંચર થઈ ગઈ છે, મદદ જોઈએ છે",
      MR: "सर्कलजवळ बाईक पंक्चर झाली, मदत हवी आहे",
      BN: "মোড়ে বাইকের চাকা পাংচার হয়েছে, সাহায্য চাই",
      TA: "வட்டாரத்தில் பைக் பஞ்சர் ஆனது, உதவி தேவை",
      TE: "సర్కిల్ దగ్గర బైక్ పంచర్ అయింది, సహాయం కావాలి",
      KN: "ಸರ್ಕಲ್ ಬಳಿ ಬೈಕ್ ಪಂಕ್ಚರ್ ಆಗಿದೆ, ಸಹಾಯ ಬೇಕು",
      PA: "ਚੌਕ ਕੋਲ ਬਾਈਕ ਪੰਚਰ ਹੋ ਗਈ, ਮਦਦ ਚਾਹੀਦੀ ਹੈ",
      ML: "ജംഗ്ഷന് അടുത്ത് ബൈക്ക് പഞ്ചറായി, സഹായം വേണം"
    },
    outcome: {
      EN: "Nearby puncture mechanic or helper assists",
      HI: "पास का मैकेनिक पंचर बनाने में मदद करेगा",
      GU: "નજીકનો મિકેનિક પંચર બનાવવામાં મદદ કરશે",
      MR: "जवळचा मेकॅनिक पंक्चर काढण्यास मदत करेल",
      BN: "কাছের মেকানিক সাহায্য করবে",
      TA: "அருகிலுள்ள மெக்கானிக் உதவுவார்",
      TE: "దగ్గరి మెకానిక్ సహాయం చేస్తారు",
      KN: "ಹತ್ತಿರದ ಮೆಕ್ಯಾನಿಕ್ ಸಹಾಯ ಮಾಡುತ್ತಾರೆ",
      PA: "ਨੇੜੇ ਦਾ ਮਕੈਨਿਕ ਮਦਦ ਕਰੇਗਾ",
      ML: "അടുത്തുള്ള മെക്കാനിക്ക് സഹായിക്കും"
    },
    tag: "#Mechanic",
    icon: "🛵"
  },
  {
    id: 5,
    category: {
      EN: "Car Jumpstart",
      HI: "कार जंपस्टार्ट / बैटरी",
      GU: "કાર બેટરી અને જમ્પસ્ટાર્ટ",
      MR: "कार बॅटरी जंपस्टार्ट",
      BN: "গাড়ির ব্যাটারি জাম্পস্টার্ট",
      TA: "கார் ஜம்ப்ஸ்டார்ட்",
      TE: "కార్ జంప్‌స్టార్ట్",
      KN: "ಕಾರ್ ಜಂಪ್‌ಸ್ಟಾರ್ಟ್",
      PA: "ਕਾਰ ਬੈਟਰੀ ਜੰਪਸਟਾਰਟ",
      ML: "കാർ ജമ്പ്സ്റ്റാർട്ട്"
    },
    query: {
      EN: "Car battery dead in parking, need jumper cable help",
      HI: "गाड़ी की बैटरी डाउन है, जम्पर केबल वाला साथी चाहिए",
      GU: "ગાડીની બેટરી ડાઉન છે, જમ્પર કેબલ વાળા સાથીની જરૂર છે",
      MR: "गाडीची बॅटरी डाऊन आहे, जंपर केबल असलेला मदतनीस हवा आहे",
      BN: "গাড়ির ব্যাটারি ডাউন, জাম্পার কেবলের সাহায্য চাই",
      TA: "கார் பேட்டரி டவுன், ஜம்பர் கேபிள் உதவி தேவை",
      TE: "కారు బ్యాటరీ డౌన్ అయింది, జంపర్ కేబుల్ సహాయం కావాలి",
      KN: "ಕಾರಿನ ಬ್ಯಾಟರಿ ಡೌನ್ ಆಗಿದೆ, ಜಂಪರ್ ಕೇಬಲ್ ಸಹಾಯ ಬೇಕು",
      PA: "ਕਾਰ ਦੀ ਬੈਟਰੀ ਡਾਊਨ ਹੈ, ਜੰਪਰ ਕੇਬਲ ਦੀ ਮਦਦ ਚਾਹੀਦੀ ਹੈ",
      ML: "കാർ ബാറ്ററി ഡൗണായി, ജമ്പർ കേബിൾ സഹായം വേണം"
    },
    outcome: {
      EN: "Neighbor car owner assists with jump cables",
      HI: "सोसाइटी का कोई कार मालिक जम्पर केबल से मदद कर देगा",
      GU: "સોસાયટીના કોઈ કાર માલિક મદદ કરશે",
      MR: "सोसायटीतील कार मालक मदत करतील",
      BN: "সোসাইটির কেউ সাহায্য করবে",
      TA: "அக்கம்பக்கத்தினர் உதவுவர்",
      TE: "సొసైటీ సభ్యులు సహాయం చేస్తారు",
      KN: "ಅಕ್ಕಪಕ್ಕದವರು ಸಹಾಯ ಮಾಡುತ್ತಾರೆ",
      PA: "ਸੁਸਾਇਟੀ ਦਾ ਕੋਈ ਸਾਥੀ ਮਦਦ ਕਰੇਗਾ",
      ML: "അയൽവാസികൾ സഹായിക്കും"
    },
    tag: "#CarHelp",
    icon: "🚗"
  },
  {
    id: 6,
    category: {
      EN: "Daily Chores & Maid",
      HI: "घर का काम और खाना",
      GU: "ઘરકામ અને રસોઈ",
      MR: "घरकाम आणि स्वयंपाक",
      BN: "ঘরের কাজ ও রান্না",
      TA: "வீட்டு வேலை & சமையல்",
      TE: "ఇంటి పని & వంట",
      KN: "ಮನೆ ಕೆಲಸ & ಅಡುಗೆ",
      PA: "ਘਰੇਲੂ ਕੰਮ ਤੇ ਖਾਣਾ",
      ML: "വീട്ടുജോലി & പാചകം"
    },
    query: {
      EN: "Need house cleaner or cook for 1 day emergency",
      HI: "आज के लिए 1 दिन की सफाई या खाना बनाने वाली चाहिए",
      GU: "આજના દિવસ માટે સફાઈ કે રસોઈ કરનાર બહેનની જરૂર છે",
      MR: "आजच्या दिवसासाठी साफसफाई किंवा स्वयंपाकासाठी मदत हवी",
      BN: "আজকের জন্য গৃহপরিচারিকা প্রয়োজন",
      TA: "இன்றைக்கு 1 நாள் வீட்டு வேலைக்கு ஆள் தேவை",
      TE: "ఈ రోజుకి ఇంటి పని లేదా వంట కోసం మనిషి కావాలి",
      KN: "ಇಂದಿನ 1 ದಿನಕ್ಕೆ ಮನೆಗೆಲಸ ಅಥವಾ ಅಡುಗೆಗೆ ಸಹಾಯ ಬೇಕು",
      PA: "ਅੱਜ ਲਈ ਸਫਾਈ ਜਾਂ ਖਾਣਾ ਬਣਾਉਣ ਵਾਲੇ ਦੀ ਲੋੜ ਹੈ",
      ML: "ഇന്നത്തേക്ക് വീട്ടുജോലിക്ക് ആളെ വേണം"
    },
    outcome: {
      EN: "Verified nearby domestic helper connects",
      HI: "आस-पास की वेरिफाइड मेड तुरंत संपर्क करेगी",
      GU: "નજીકની વેરિફાઇડ હેલ્પર તરત સંપર્ક કરશે",
      MR: "परिसरातील मदतनीस लगेच संपर्क करेल",
      BN: "কাছের বিশ্বস্ত গৃহকর্মী যোগাযোগ করবে",
      TA: "உள்ளூர் உதவியாளர் தொடர்புகொள்வார்",
      TE: "స్థానిక సహాయకురాలు సంప్రదిస్తుంది",
      KN: "ಸ್ಥಳೀಯ ಸಹಾಯಕಿ ಸಂಪರ್ಕಿಸುತ್ತಾರೆ",
      PA: "ਨੇੜੇ ਦੀ ਮਦਦਗਾਰ ਸੰਪਰਕ ਕਰੇਗੀ",
      ML: "അടുത്തുള്ള സഹായി ബന്ധപ്പെടും"
    },
    tag: "#Maid",
    icon: "🧹"
  },
  {
    id: 7,
    category: {
      EN: "AC & Cooling Repair",
      HI: "एसी रिपेयर और सर्विस",
      GU: "એસી સર્વિસ અને રિપેર",
      MR: "एसी दुरुस्ती आणि सर्व्हिस",
      BN: "এসি মেরামত ও সার্ভিস",
      TA: "ஏசி பழுதுபார்ப்பு",
      TE: "ఏసీ మరమ్మతు & సర్వీస్",
      KN: "ಎಸಿ ದುರಸ್ತಿ & ಸರ್ವಿಸ್",
      PA: "ਏਸੀ ਸਰਵਿਸ ਤੇ ਮੁਰੰਮਤ",
      ML: "എസി അറ്റകുറ്റപ്പണി"
    },
    query: {
      EN: "AC not cooling, urgent gas top-up or repair needed",
      HI: "एसी ठंडी हवा नहीं दे रहा, एसी मैकेनिक चाहिए",
      GU: "એસી ઠંડી હવા આપતું નથી, એસી મિકેનિક જોઈએ છે",
      MR: "एसी थंड हवा देत नाही, एसी मेकॅनिक हवा आहे",
      BN: "এসি ঠান্ডা হচ্ছে না, এসি মেকানিক চাই",
      TA: "ஏசி கூலிங் வரவில்லை, ஏசி மெக்கானிக் தேவை",
      TE: "ఏసీ చల్లబడటం లేదు, ఏసీ మెకానిక్ కావాలి",
      KN: "ಎಸಿ ತಂಪು ಗಾಳಿ ನೀಡುತ್ತಿಲ್ಲ, ಎಸಿ ಮೆಕ್ಯಾನಿಕ್ ಬೇಕು",
      PA: "ਏਸੀ ਠੰਡੀ ਹਵਾ ਨਹੀਂ ਦੇ ਰਿਹਾ, ਏਸੀ ਮਕੈਨਿਕ ਚਾਹੀਦਾ ਹੈ",
      ML: "എസി തണുപ്പിക്കുന്നില്ല, മെക്കാനിക്ക് വേണം"
    },
    outcome: {
      EN: "Direct local technician visits without commission markup",
      HI: "लोकल एसी मैकेनिक बिना कमीशन के वाजिब दाम में आएगा",
      GU: "લોકલ એસી મિકેનિક વ્યાજબી ભાવે આવશે",
      MR: "स्थानिक एसी मेकॅनिक योग्य दरात येईल",
      BN: "স্থানীয় মেকানিক সঠিক মূল্যে আসবে",
      TA: "உள்ளூர் மெக்கானிக் நியாயமான விலையில் வருவார்",
      TE: "స్థానిక మెకానిక్ సరసమైన ధరకు వస్తారు",
      KN: "ಸ್ಥಳೀಯ ಮೆಕ್ಯಾನಿಕ್ ನ್ಯಾಯಯುತ ಬೆಲೆಯಲ್ಲಿ ಬರುತ್ತಾರೆ",
      PA: "ਸਥਾਨਕ ਮਕੈਨਿਕ ਸਹੀ ਰੇਟ ਤੇ ਆਵੇਗਾ",
      ML: "ന്യായമായ നിരക്കിൽ ടെക്നീഷ്യൻ എത്തും"
    },
    tag: "#AC_Repair",
    icon: "❄️"
  },
  {
    id: 8,
    category: {
      EN: "Blood Donor Emergency",
      HI: "रक्तदान व मेडिकल इमरजेंसी",
      GU: "બ્લડ ડોનર અને ઇમરજન્સી",
      MR: "रक्तदान व मेडिकल मदत",
      BN: "রক্তদান ও জরুরি সেবা",
      TA: "இரத்த தானம் & அவசரம்",
      TE: "రక్తదానం & అత్యవసరం",
      KN: "ರಕ್ತದಾನ & ತುರ್ತು ಸೇವೆ",
      PA: "ਖੂਨ ਦਾਨ ਤੇ ਐਮਰਜੈਂਸੀ",
      ML: "രക്തദാനം & അടിയന്തരം"
    },
    query: {
      EN: "Urgent O+ blood donor needed at Civil Hospital",
      HI: "इमरजेंसी O+ ब्लड डोनर चाहिए सिविल हॉस्पिटल के पास",
      GU: "સિવિલ હોસ્પિટલ પાસે તાત્કાલિક O+ બ્લડ ડોનર જોઈએ છે",
      MR: "सिव्हिल हॉस्पिटलजवळ तातडीने O+ रक्तदात्याची गरज आहे",
      BN: "সিভিল হাসপাতালে জরুরি ও+ রক্তের দাতা প্রয়োজন",
      TA: "அரசு மருத்துவமனையில் அவசர O+ இரத்த தானம் தேவை",
      TE: "హాస్పిటల్ దగ్గర అత్యవసరంగా O+ రక్తదాత కావాలి",
      KN: "ಆಸ್ಪತ್ರೆ ಬಳಿ ತುರ್ತು O+ ರಕ್ತದಾನಿ ಬೇಕಾಗಿದ್ದಾರೆ",
      PA: "ਹਸਪਤਾਲ ਕੋਲ ਤੁਰੰਤ O+ ਬਲੱਡ ਡੋਨਰ ਦੀ ਲੋੜ ਹੈ",
      ML: "ആശുപത്രിയിൽ അടിയന്തരമായി O+ രക്തദാതാവിനെ വേണം"
    },
    outcome: {
      EN: "Alerts verified donors in 2-5km radius immediately",
      HI: "रडार में मौजूद वेरिफाइड डोनर्स को तुरंत अलर्ट जाएगा",
      GU: "વિસ્તારના વેરિફાઇડ ડોનર્સને તરત એલર્ટ જશે",
      MR: "परिसरातील रक्तदात्यांना लगेच मेसेज जाईल",
      BN: "নিকটবর্তী রক্তদাতারা তৎক্ষণাৎ বার্তা পাবে",
      TA: "அருகிலுள்ள இரத்ததான ஆர்வலர்களுக்கு எச்சரிக்கை செல்லும்",
      TE: "దగ్గరి రక్తదాతలకు వెంటనే సమాచారం అందుతుంది",
      KN: "ಹತ್ತಿರದ ರಕ್ತದಾನಿಗಳಿಗೆ ತಕ್ಷಣ ಸೂಚನೆ ಹೋಗುತ್ತದೆ",
      PA: "ਨੇੜੇ ਦੇ ਡੋਨਰਾਂ ਨੂੰ ਤੁਰੰਤ ਸੁਨੇਹਾ ਜਾਵੇਗਾ",
      ML: "അടുത്തുള്ള ദാതാക്കൾക്ക് ഉടൻ സന്ദേശം ലഭിക്കും"
    },
    tag: "#BloodDonor",
    icon: "🩸"
  },
  {
    id: 9,
    category: {
      EN: "Medicine Delivery",
      HI: "दवा मंगवाना (सीनियर सिटीजन)",
      GU: "દવા પહોંચાડવી",
      MR: "औषध वितरण मदत",
      BN: "ওষুধ ডেলিভারি",
      TA: "மருந்து டெலிவரி",
      TE: "మందుల డెలివరీ",
      KN: "ಔಷಧ ವಿತರಣೆ",
      PA: "ਦਵਾਈ ਮੰਗਵਾਉਣਾ",
      ML: "മരുന്ന് എത്തിക്കൽ"
    },
    query: {
      EN: "Elderly at home alone, urgent pharmacy medicine delivery needed",
      HI: "घर पर दादी अकेले हैं, मेडिकल स्टोर से बीपी की दवा चाहिए",
      GU: "ઘરે દાદી એકલા છે, મેડિકલ સ્ટોરમાંથી દવાની જરૂર છે",
      MR: "घरी आजी एकट्या आहेत, मेडिकलमधून औषध आणून हवे आहे",
      BN: "বয়স্ক মানুষের জন্য জরুরি ওষুধ প্রয়োজন",
      TA: "முதியவருக்கு உடனடியாக மருந்தகம் சென்று மருந்து வாங்க வேண்டும்",
      TE: "వృద్ధులకు అత్యవసరంగా మెడికల్ షాప్ నుండి మందులు కావాలి",
      KN: "ಹಿರಿಯರಿಗೆ ಮೆಡಿಕಲ್ ಶಾಪ್‌ನಿಂದ ತುರ್ತು ಔಷಧ ತರಬೇಕಿದೆ",
      PA: "ਬਜ਼ੁਰਗਾਂ ਲਈ ਦਵਾਈ ਲਿਆਉਣ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ",
      ML: "പ്രായമായവർക്ക് അടിയന്തര മരുന്ന് എത്തിക്കണം"
    },
    outcome: {
      EN: "Passing community member delivers safely",
      HI: "रास्ते से गुजर रहा पड़ोसी साथी दवा पहुंचाएगा",
      GU: "નજીકનો સાથી દવા પહોંચાડવામાં મદદ કરશે",
      MR: "जवळचा शेजारी मदत करून औषध आणून देईल",
      BN: "প্রতিবেশী সাহায্য করে ওষুধ পৌঁছে দেবে",
      TA: "அக்கம்பக்கத்தினர் மருந்து வாங்கி தருவர்",
      TE: "సహాయకులు మందులు తెచ్చి ఇస్తారు",
      KN: "ನೆರೆಹೊರೆಯವರು ಔಷಧ ತಂದುಕೊಡುತ್ತಾರೆ",
      PA: "ਗੁਆਂਢੀ ਮਦਦ ਕਰਕੇ ਦਵਾਈ ਲਿਆ ਦੇਵੇਗਾ",
      ML: "അയൽവാസി മരുന്ന് വാങ്ങി നൽകും"
    },
    tag: "#EmergencyMeds",
    icon: "💊"
  },
  {
    id: 10,
    category: {
      EN: "Heavy Lifting & Shifting",
      HI: "सामान उठाना व शिफ्टिंग",
      GU: "સામાન શિફ્ટિંગ અને મદદ",
      MR: "जड सामान हलवणे",
      BN: "ভারী জিনিস তোলা ও শিফটিং",
      TA: "பொருட்கள் மாற்றுதல் & தூக்குதல்",
      TE: "సామాన్లు తరలించడం & సహాయం",
      KN: "ಸಾಮಗ್ರಿ ಸಾಗಣೆ & ಸಹಾಯ",
      PA: "ਸਾਮਾਨ ਚੁੱਕਣਾ ਤੇ ਸ਼ਿਫਟਿੰਗ",
      ML: "സാധനങ്ങൾ മാറ്റൽ & സഹായം"
    },
    query: {
      EN: "Need 2 strong persons to carry sofa up to 3rd floor",
      HI: "सोफा तीसरी मंजिल पर चढ़ाने के लिए 2 लोगों की मदद चाहिए",
      GU: "સોફા ત્રીજા માળે ચડાવવા માટે 2 યુવાનોની મદદ જોઈએ છે",
      MR: "सोफा तिसऱ्या मजल्यावर नेण्यासाठी 2 जणांची मदत हवी आहे",
      BN: "সোফা ৩য় তলায় তোলার জন্য ২ জন সাহায্যকারী দরকার",
      TA: "சோபாவை 3வது மாடிக்கு தூக்க 2 ஆட்கள் உதவி தேவை",
      TE: "సోఫాను 3వ అంతస్తుకు తీసుకెళ్లడానికి 2 వ్యక్తుల సహాయం కావాలి",
      KN: "ಸೋಫಾವನ್ನು 3ನೇ ಮಹಡಿಗೆ ಎತ್ತಲು 2 ಜನರ ಸಹಾಯ ಬೇಕು",
      PA: "ਸੋਫਾ ਤੀਜੀ ਮੰਜ਼ਿਲ ਤੇ ਚੜ੍ਹਾਉਣ ਲਈ 2 ਬੰਦਿਆਂ ਦੀ ਮਦਦ ਚਾਹੀਦੀ ਹੈ",
      ML: "സോഫ മൂന്നാം നിലയിലേക്ക് കയറ്റാൻ 2 പേരുടെ സഹായം വേണം"
    },
    outcome: {
      EN: "Local youth lend a helping hand in 15 mins",
      HI: "मोहल्ले के युवा साथी आकर तुरंत हाथ बंटाएंगे",
      GU: "વિસ્તારના યુવાનો આવીને મદદ કરશે",
      MR: "परिसरातील तरुण येऊन लगेच मदत करतील",
      BN: "এলাকার যুবকরা এসে সাহায্য করবে",
      TA: "உள்ளூர் இளைஞர்கள் வந்து உதவுவர்",
      TE: "స్థానిక యువకులు వచ్చి సహాయం చేస్తారు",
      KN: "ಸ್ಥಳೀಯ ಯುವಕರು ಬಂದು ಸಹಾಯ ಮಾಡುತ್ತಾರೆ",
      PA: "ਇਲਾਕੇ ਦੇ ਨੌਜਵਾਨ ਮਦਦ ਕਰਵਾਉਣਗੇ",
      ML: "നാട്ടിലെ യുവാക്കൾ എത്തി സഹായിക്കും"
    },
    tag: "#Shifting",
    icon: "📦"
  }
];

const GUIDE_I18N: Record<Language, any> = {
  EN: {
    headerSub: "Complete Website Guide & How to Use",
    tabBenefits: "All Features",
    tabHow: "How to Use (4 Steps)",
    tabExamples: "Examples",
    benefitsTitle: "LocoHelp: Complete Hyper-Local Community & Service Network",
    benefitsDesc: "Connect directly with verified Service Experts, Local Shops, Job Seekers, Employers, and Neighbors in your city.",
    b1Title: "Admin-Verified Trust",
    b1Desc: "Every Service Expert, Shop, Job Seeker, and Employer listing is reviewed by Admin for safety.",
    b2Title: "Pan-India District & Area",
    b2Desc: "Select your State, District, and Local Area to see relevant posts, experts, shops, and jobs near you.",
    b3Title: "1-Hour Live Broadcast",
    b3Desc: "Urgent help posts stay live for 1 hour so the feed always remains active, fresh, and clutter-free.",
    b4Title: "Direct Connect & Privacy",
    b4Desc: "Use secure in-app chat, Voice Search, and WhatsApp connect while keeping your privacy protected.",
    howIntro: "How to use all modules of LocoHelp:",
    s1Title: "1. Post Urgent Need (1-Hour Live Radar)",
    s1Desc: "Tap 'Post / Broadcast' on the home page, pick a 1-click template or speak via Voice Search, and publish. Check replies anytime in 'Responses / Chats'.",
    s2Title: "2. Browse or Register as a Service Expert",
    s2Desc: "Tap 'Browse Service Experts' to find verified Plumbers, Electricians, Mechanics, Tutors & more by city, or click '+ Create Profile' to register your skills.",
    s3Title: "3. Business & Shop Directory",
    s3Desc: "Tap 'Business & Shop Register' to browse verified local shops with photos, timings & WhatsApp contact, or submit your own shop with up to 3 photos.",
    s4Title: "4. Local Job Portal (Job Seekers & Employers)",
    s4Desc: "Job Seekers can register with their Resume/Biodata. Employers can either link their registered LocoHelp Shop in 1 click or register as a new Employer to post vacancies.",
    helperTitle: "Are you a Skilled Professional, Shop Owner, or Employer?",
    helperDesc: "Register your Service Expert Profile, Business/Shop, or Job Vacancy directly from the Home Screen. Once approved by Admin, your listing goes live!",
    examplesHeader: "Real Life Examples in",
    examplesCount: "Examples",
    searchPlaceholder: "Search Cricket, Plumber, Car, Medicine...",
    footerTagline: "LocoHelp — Hyper-Local Community & Services",
    closeBtn: "Got it (Close)",
    openAppBtn: "Explore Website",
  },
  HI: {
    headerSub: "वेबसाइट की पूरी जानकारी और उपयोग गाइड",
    tabBenefits: "मुख्य फीचर्स",
    tabHow: "कैसे इस्तेमाल करें (4 चरण)",
    tabExamples: "उदाहरण",
    benefitsTitle: "LocoHelp: आपका स्थानीय कम्युनिटी, सर्विस और जॉब नेटवर्क",
    benefitsDesc: "अपने शहर के वेरिफाइड सर्विस एक्सपर्ट्स, दुकानों, जॉब सीकर्स, एम्प्लॉयर्स और पड़ोसियों से सीधे जुड़ें।",
    b1Title: "एडमिन द्वारा सत्यापित (Verified)",
    b1Desc: "सुरक्षा के लिए हर सर्विस एक्सपर्ट, दुकान, जॉब प्रोफाइल और एम्प्लॉयर को एडमिन अप्रूवल के बाद ही लाइव किया जाता है।",
    b2Title: "पैन-इंडिया लोकेशन व दायरा",
    b2Desc: "ऊपर दिए गए लोकेशन बटन से अपना राज्य, जिला और एरिया चुनें और अपने आस-पास की जानकारी देखें।",
    b3Title: "1-घंटे की लाइव ब्रॉडकास्ट",
    b3Desc: "इमरजेंसी मदद की पोस्ट 1 घंटे तक लाइव रहती है ताकि फीड हमेशा ताज़ा और साफ रहे।",
    b4Title: "सुरक्षित चैट और सीधा संपर्क",
    b4Desc: "वेबसाइट के अंदर सुरक्षित चैट, वॉइस सर्च और व्हाट्सएप कॉन्टैक्ट की सुविधा।",
    howIntro: "LocoHelp वेबसाइट के सभी फीचर्स का उपयोग ऐसे करें:",
    s1Title: "1. तुरंत जरूरत पोस्ट करें (Post / Broadcast)",
    s1Desc: "होम पेज पर 'Post / Broadcast' दबाएं, 1-क्लिक टेम्पलेट या वॉइस सर्च से अपनी जरूरत लिखें। अपनी पोस्ट पर आए जवाब 'प्राप्त जवाब देखें (Inbox)' में देखें।",
    s2Title: "2. सर्विस एक्सपर्ट्स खोजें या प्रोफाइल बनाएं",
    s2Desc: "'ब्राउज़ सर्विस एक्सपर्ट्स' में जाकर शहर के प्लंबर, इलेक्ट्रीशियन, मैकेनिक, ट्यूटर आदि खोजें या '+ प्रोफाइल बनाएं' से खुद को रजिस्टर करें।",
    s3Title: "3. दुकान व बिज़नेस रजिस्टर करें",
    s3Desc: "'दुकान व बिजनेस रजिस्टर करें' बैनर से अपने एरिया की वेरिफाइड दुकानें देखें या अपनी दुकान की 2-3 फोटो, समय और पता जोड़कर रजिस्टर करें।",
    s4Title: "4. जॉब पोर्टल (नौकरी पाएं या स्टाफ हायर करें)",
    s4Desc: "काम चाहने वाले अपना रिज्यूमे/बायोडाटा अपलोड करें। नौकरी देने वाले (Employer) अपनी पहले से रजिस्टर्ड दुकान लिंक करके या नया एम्प्लॉयर बनकर जॉब पोस्ट करें।",
    helperTitle: "क्या आप सर्विस एक्सपर्ट, दुकानदार या एम्प्लॉयर हैं?",
    helperDesc: "होम पेज से अपनी सर्विस एक्सपर्ट प्रोफाइल, दुकान या जॉब वेकेंसी दर्ज करें। एडमिन अप्रूवल के तुरंत बाद आपकी लिस्टिंग लाइव हो जाएगी!",
    examplesHeader: "में वास्तविक उदाहरण:",
    examplesCount: "उदाहरण",
    searchPlaceholder: "क्रिकेट, प्लंबर, कार, दवा खोजें...",
    footerTagline: "LocoHelp — आपके शहर का अपना नेटवर्क",
    closeBtn: "समझ गया (बंद करें)",
    openAppBtn: "वेबसाइट देखें",
  },
  GU: {
    headerSub: "સંપૂર્ણ એપ્લિકેશન માર્ગદર્શિકા અને ઉપયોગ",
    tabBenefits: "તમામ સુવિધાઓ",
    tabHow: "કેવી રીતે ઉપયોગ કરવો",
    tabExamples: "ઉદાહરણો",
    benefitsTitle: "LocoHelp: તમારા શહેરનું સ્થાનિક નેટવર્ક",
    benefitsDesc: "પ્લમ્બર, ઈલેક્ટ્રિશિયન, દુકાનો, નોકરીઓ અને આસપાસના લોકો સાથે સીધો સંપર્ક કરો.",
    b1Title: "એડમિન વેરિફાઈડ સુરક્ષા",
    b1Desc: "દરેક રજિસ્ટ્રેશન એડમિન દ્વારા ચકાસવામાં આવે છે.",
    b2Title: "તમામ જિલ્લા અને વિસ્તાર",
    b2Desc: "તમારું રાજ્ય અને જિલ્લો પસંદ કરીને નજીકની સેવાઓ જુઓ.",
    b3Title: "1-કલાક લાઈવ પોસ્ટ",
    b3Desc: "તાત્કાલિક પોસ્ટ્સ 1 કલાક લાઈવ રહે છે.",
    b4Title: "સીધો સંપર્ક અને ગોપનીયતા",
    b4Desc: "સુરક્ષિત ચેટ અને વોટ્સએપ દ્વારા સંપર્ક કરો.",
    howIntro: "LocoHelp નો ઉપયોગ કરવાની સરળ રીત:",
    s1Title: "1. તાત્કાલિક જરૂરિયાત પોસ્ટ કરો",
    s1Desc: "હોમ પેજ પરથી પોસ્ટ કરો અને નજીકના લોકો પાસેથી મદદ મેળવો.",
    s2Title: "2. સર્વિસ એક્સપર્ટ પ્રોફાઈલ બનાવો",
    s2Desc: "તમારું કૌશલ્ય નોંધાવીને સીધું કામ મેળવો.",
    s3Title: "3. દુકાન / બિઝનેસ રજિસ્ટર કરો",
    s3Desc: "તમારી દુકાન ફોટા સાથે લોકલ ડિરેક્ટરીમાં ઉમેરો.",
    s4Title: "4. જોબ પોર્ટલ (નોકરી શોધો કે આપો)",
    s4Desc: "નોકરી માટે બાયોડેટા મુકો અથવા સ્ટાફ માટે વેકેન્સી આપો.",
    helperTitle: "શું તમે કારીગર, દુકાનદાર કે નોકરીદાતા છો?",
    helperDesc: "હોમ પેજ પરથી રજિસ્ટ્રેશન કરો અને એડમિન મંજૂરી પછી લાઈવ થાઓ!",
    examplesHeader: "વાસ્તવિક ઉદાહરણો:",
    examplesCount: "ઉદાહરણો",
    searchPlaceholder: "શોધો ક્રિકેટ, પ્લમ્બર, ગાડી...",
    footerTagline: "LocoHelp — તમારા શહેરનું પોતાનું નેટવર્ક",
    closeBtn: "સમજી ગયો (બંધ કરો)",
    openAppBtn: "વેબસાઈટ જુઓ",
  }
};

export default function AppGuideModal({ onClose, onExplore }: AppGuideModalProps) {
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'benefits' | 'how' | 'examples'>('benefits');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedBannerDetail, setSelectedBannerDetail] = useState<FeatureBannerDetail | null>(null);

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const g = GUIDE_I18N[language] || GUIDE_I18N['HI'] || GUIDE_I18N['EN'];

  const filteredExamples = MULTI_EXAMPLES.filter(ex => {
    const q = ex.query[language] || ex.query['HI'] || ex.query['EN'] || '';
    const cat = ex.category[language] || ex.category['HI'] || ex.category['EN'] || '';
    return q.toLowerCase().includes(searchFilter.toLowerCase()) ||
           cat.toLowerCase().includes(searchFilter.toLowerCase()) ||
           ex.tag.toLowerCase().includes(searchFilter.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#EAE4D9] dark:border-slate-800 rounded-[28px] w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* Modal Top Header with Language Selector */}
        <div className="px-5 py-3.5 bg-[#F2EDE4] dark:bg-slate-800/90 border-b border-[#E2DDD2] dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0066FF] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                <span>LocoHelp App Guide</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {g.headerSub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Language Dropdown right inside the modal */}
            <div className="relative flex items-center bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1 text-xs shadow-xs">
              <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 mr-1.5 shrink-0" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1"
                title="Select language"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="text-slate-900 bg-white">
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('benefits')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'benefits'
                ? 'border-[#0066FF] text-[#0066FF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{g.tabBenefits}</span>
          </button>

          <button
            onClick={() => setActiveTab('how')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'how'
                ? 'border-[#0066FF] text-[#0066FF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{g.tabHow}</span>
          </button>

          <button
            onClick={() => setActiveTab('examples')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'examples'
                ? 'border-[#0066FF] text-[#0066FF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>{g.tabExamples} ({currentLangObj.nativeName})</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: 5 KEY FEATURE BANNERS & BENEFITS */}
          {activeTab === 'benefits' && (
            <div className="space-y-3.5">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-900 rounded-2xl">
                <h3 className="text-sm font-extrabold text-blue-950 dark:text-blue-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  {language === 'EN' ? 'Complete Website Modules • Tap Any Card to Explore' : 'वेबसाइट के मुख्य सेक्शन • विस्तार से देखने के लिए टैप करें'}
                </h3>
                <p className="text-xs text-blue-800 dark:text-blue-200 mt-1 leading-relaxed">
                  {language === 'EN'
                    ? 'Click any module below to see what you can do and how it works:'
                    : 'नीचे किसी भी सेक्शन पर टैप करें और देखें कि यह कैसे काम करता है:'}
                </p>
              </div>

              {/* 5 Distinct Interactive Banner Cards */}
              <div className="space-y-2.5">
                {FEATURE_BANNERS.map((banner) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => setSelectedBannerDetail(banner)}
                    className="w-full bg-white dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700/60 border-2 border-slate-200/90 dark:border-slate-700 hover:border-blue-400 rounded-2xl p-3 shadow-2xs active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-lg flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {banner.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                            {language === 'EN' ? banner.titleEn : banner.titleHi}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {language === 'EN' ? banner.shortDescEn : banner.shortDescHi}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2 pl-2 border-l border-slate-100 dark:border-slate-700 flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                      <span>{language === 'EN' ? 'View' : 'देखें'}</span>
                      <span>→</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-white dark:bg-slate-800 border border-[#EAE4D9] dark:border-slate-700 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold mb-2">
                    🛡️
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{g.b1Title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {g.b1Desc}
                  </p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-800 border border-[#EAE4D9] dark:border-slate-700 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold mb-2">
                    📍
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{g.b2Title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {g.b2Desc}
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* TAB 2: HOW IT WORKS */}
          {activeTab === 'how' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold px-1">
                {g.howIntro}
              </p>

              <div className="space-y-3">
                <div className="p-4 bg-white dark:bg-slate-800 border border-[#EAE4D9] dark:border-slate-700 rounded-2xl flex items-start gap-3.5 shadow-xs">
                  <span className="w-7 h-7 rounded-xl bg-[#0066FF] text-white flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {g.s1Title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {g.s1Desc}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-[#EAE4D9] dark:border-slate-700 rounded-2xl flex items-start gap-3.5 shadow-xs">
                  <span className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {g.s2Title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {g.s2Desc}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-[#EAE4D9] dark:border-slate-700 rounded-2xl flex items-start gap-3.5 shadow-xs">
                  <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {g.s3Title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {g.s3Desc}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-[#EAE4D9] dark:border-slate-700 rounded-2xl flex items-start gap-3.5 shadow-xs">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {g.s4Title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {g.s4Desc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Expert / Shop / Employer Registration Note */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div className="pr-2">
                  <h5 className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                    {g.helperTitle}
                  </h5>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                    {g.helperDesc}
                  </p>
                </div>
                <Wrench className="w-6 h-6 text-emerald-600 shrink-0" />
              </div>
            </div>
          )}

          {/* TAB 3: EXAMPLES IN USER SELECTED LANGUAGE */}
          {activeTab === 'examples' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  {g.examplesHeader} {currentLangObj.nativeName}:
                </span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-slate-700">
                  {filteredExamples.length} {g.examplesCount}
                </span>
              </div>

              {/* Search in examples */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={g.searchPlaceholder}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* List of examples */}
              <div className="space-y-2.5">
                {filteredExamples.map((ex) => {
                  const queryText = ex.query[language] || ex.query['HI'] || ex.query['EN'];
                  const catText = ex.category[language] || ex.category['HI'] || ex.category['EN'];
                  const outcomeText = ex.outcome[language] || ex.outcome['HI'] || ex.outcome['EN'];

                  return (
                    <div 
                      key={ex.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-[#EAE4D9] dark:border-slate-700 rounded-2xl hover:border-blue-400 transition-all shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg p-1.5 bg-slate-100 dark:bg-slate-700 rounded-xl leading-none">
                            {ex.icon}
                          </span>
                          <div>
                            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                              #{ex.id} • {catText}
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                              &quot;{queryText}&quot;
                            </h4>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md shrink-0">
                          {ex.tag}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 italic">
                          {ex.query['EN']}
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 shrink-0 ml-2">
                          <CheckCircle2 className="w-3 h-3" />
                          {outcomeText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-[#F2EDE4] dark:bg-slate-800/80 border-t border-[#E2DDD2] dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 font-medium">
            {g.footerTagline}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
            >
              {g.closeBtn}
            </button>
            {onExplore && (
              <button
                onClick={() => {
                  onClose();
                  onExplore();
                }}
                className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-95"
              >
                <span>{g.openAppBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* INTERACTIVE FEATURE EXPLAINER MODAL OVERLAY */}
        <AnimatePresence>
          {selectedBannerDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden z-50"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                      {selectedBannerDetail.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                        {selectedBannerDetail.badge}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate">
                        {language === 'EN' ? selectedBannerDetail.titleEn : selectedBannerDetail.titleHi}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedBannerDetail(null)}
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0 ml-2"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <span>📌</span>
                      <span>{language === 'EN' ? 'What You Can Post & Do' : 'आप क्या पोस्ट व देख सकते हैं'}</span>
                    </h4>
                    <div className="space-y-2">
                      {(language === 'EN' ? selectedBannerDetail.whatYouCanPostEn : selectedBannerDetail.whatYouCanPostHi).map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <span>⚙️</span>
                      <span>{language === 'EN' ? 'How It Works' : 'यह कैसे काम करता है'}</span>
                    </h4>
                    <div className="space-y-2">
                      {(language === 'EN' ? selectedBannerDetail.howItWorksEn : selectedBannerDetail.howItWorksHi).map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedBannerDetail(null)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    {language === 'EN' ? 'Got It, Close' : 'समझ आ गया (हटाइए)'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

