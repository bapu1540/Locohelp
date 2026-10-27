import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, Mail, ChevronDown, ChevronUp, Copy, Check, ExternalLink, LifeBuoy, ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function SupportScreen({ onBack }: { onBack: () => void }) {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0); // First open by default

  const businessEmail = 'support@locohelp.com';

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(businessEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {}
  };

  const handleSendEmail = () => {
    window.location.href = `mailto:${businessEmail}?subject=LocoHelp%20Support%20Request&body=Namaste%20LocoHelp%20Support%20Team%2C%0A%0AMy%20query%20is%3A%0A`;
  };

  const faqs = [
    {
      q: language === 'GU'
        ? "1. LocoHelp શું છે અને અહીં કઈ કઈ સુવિધાઓ મળે છે?"
        : language === 'EN'
        ? "1. What is LocoHelp and what all services are available here?"
        : "1. LocoHelp क्या है और यहाँ कौन-कौन सी सुविधाएँ मिलती हैं?",
      a: language === 'GU'
        ? "LocoHelp એ ભારતનું લોકલ કમ્યુનિટી અને બિઝનેસ નેટવર્ક છે જ્યાં તમને 5 મુખ્ય સુવિધાઓ મળે છે: (1) લાઈવ કમ્યુનિટી બ્રોડકાસ્ટ (+ Post) થી તરત લોકલ મદદ અને માહિતી, (2) વેરિફાઈડ સર્વિસ એક્સપર્ટ્સ (પ્લમ્બર, ઈલેક્ટ્રિશિયન, મિકેનિક, કાર્પેન્ટર, એસી રિપેર, ટ્યુટર વગેરે), (3) લોકલ દુકાન અને બિઝનેસ ડિરેક્ટરી (દુકાનો, શોરૂમ, હોસ્પિટલ, મેરેજ હોલ, સર્વિસ સેન્ટર), (4) લોકલ જાહેરાત બેનર (ઓફર અને વ્યાપાર પ્રચાર), અને (5) લોકલ જોબ પોર્ટલ (નોકરી શોધવા અને સ્ટાફ રાખવા માટે)."
        : language === 'EN' 
        ? "LocoHelp is India's local community & business network with 5 main modules: (1) Live Community Broadcast (+ Post) for urgent local needs, (2) Verified Service Experts (Plumber, Electrician, Mechanic, Carpenter, AC Repair, Tutor, etc.), (3) Local Business & Shop Directory (Shops, Showrooms, Hospitals, Venues, Service Centers), (4) Local Advertisement Banner for offers & business promotion, and (5) Local Job Portal connecting Job Seekers and Employers directly."
        : "LocoHelp भारत का लोकल कम्युनिटी और बिज़नेस नेटवर्क है जहाँ आपको 5 मुख्य सुविधाएँ मिलती हैं: (1) लाइव कम्युनिटी ब्रॉडकास्ट (+ Post) से तुरंत लोकल मदद व जानकारी, (2) वेरिफाइड सर्विस एक्सपर्ट्स (प्लंबर, इलेक्ट्रीशियन, मैकेनिक, कारपेंटर, एसी रिपेयर, ट्यूटर आदि), (3) लोकल दुकान व बिज़नेस डायरेक्टरी (दुकान, शोरूम, अस्पताल, मैरिज हॉल, सर्विस सेंटर), (4) लोकल विज्ञापन बैनर (ऑफर, सेल और व्यापार प्रचार), और (5) लोकल जॉब पोर्टल (नौकरी ढूँढने और स्टाफ रखने के लिए)।"
    },
    {
      q: language === 'GU'
        ? "2. મારી તાત્કાલિક જરૂરિયાત માટે લાઈવ બ્રોડકાસ્ટ (+ Post) કેવી રીતે કરવું?"
        : language === 'EN'
        ? "2. How do I post a Live Broadcast need (+ Post)?"
        : "2. अपनी किसी तुरंत जरूरत के लिए लाइव ब्रॉडकास्ट (+ Post) कैसे करें?",
      a: language === 'GU'
        ? "લોગિન કર્યા પછી હોમ સ્ક્રીન પર '+ Post' બટન દબાવો, કેટેગરી અથવા રેડીમેડ ટેમ્પ્લેટ પસંદ કરો, અને તમારી જરૂરિયાત લખીને અથવા માઈક (Voice) થી બોલીને સબમિટ કરો. તમારા પસંદ કરેલા શહેરના નોંધાયેલા સભ્યો અને વેરિફાઈડ સર્વિસ એક્સપર્ટ્સ તમારી પોસ્ટ પર રિપ્લાય કરીને LocoHelp દ્વારા તમારી સાથે જોડાઈ શકશે."
        : language === 'EN'
        ? "After logging in, tap the '+ Post' button on the home screen, choose a category or ready-made template, and type or use the Mic (Voice input) to speak your requirement. Once posted, registered members and verified Service Experts in your selected city can reply on your post ('I Can Help') and connect with you inside LocoHelp."
        : "लॉगिन करने के बाद होम स्क्रीन पर '+ Post' बटन दबाएं, कैटेगरी या रेडीमेड टेम्पलेट चुनें, और अपनी जरूरत लिखकर या माइक (Voice) से बोलकर सबमिट कर दें। आपके चुने गए शहर के रजिस्टर्ड लोग और वेरिफाइड सर्विस एक्सपर्ट्स आपकी पोस्ट पर ('मैं मदद कर सकता हूँ') रिप्लाई करके LocoHelp के माध्यम से आपसे जुड़ सकेंगे।"
    },
    {
      q: language === 'GU'
        ? "3. 'સર્વિસ એક્સપર્ટ' (Service Expert) કેવી રીતે શોધવા અથવા પોતાને કેવી રીતે રજિસ્ટર કરવા?"
        : language === 'EN'
        ? "3. How can I find or register as a 'Service Expert'?"
        : "3. 'सर्विस एक्सपर्ट' (Service Expert) कैसे ढूँढें या खुद को कैसे रजिस्टर करें?",
      a: language === 'GU'
        ? "કોઈપણ કામ માટે એક્સપર્ટ શોધવા માટે હોમ સ્ક્રીન પર સર્ચ બાર અથવા કેટેગરી ફિલ્ટરનો ઉપયોગ કરો અને તમારા શહેરના વેરિફાઈડ પ્લમ્બર, ઈલેક્ટ્રિશિયન, મિકેનિક, પેઇન્ટર વગેરેની પ્રોફાઈલ જુઓ. જો તમે પોતે કોઈ સેવા આપો છો, તો 'Register as Service Expert' પર ક્લિક કરીને તમારી વિગતો ભરીને એડમિન મંજૂરી માટે સબમિટ કરો."
        : language === 'EN'
        ? "To find an expert, use the Search bar or category filters on the home screen to view verified Plumbers, Electricians, Mechanics, Painters, Technicians, etc. in your city. If you provide a skill/service yourself, tap 'Register as Service Expert', fill in your skill category, experience, work area, and photo, and submit for Admin approval so local customers can find you."
        : "किसी भी काम के लिए एक्सपर्ट ढूँढने के लिए होम स्क्रीन पर सर्च बार या कैटेगरी फिल्टर का उपयोग करें और अपने शहर के वेरिफाइड प्लंबर, इलेक्ट्रीशियन, मैकेनिक, पेंटर आदि की प्रोफाइल देखें। यदि आप स्वयं कोई सर्विस देते हैं, तो 'Register as Service Expert' कार्ड पर क्लिक करके अपना नाम, काम की कैटेगरी, अनुभव, एरिया और फोटो भरकर एडमिन अप्रूवल के लिए सबमिट करें।"
    },
    {
      q: language === 'GU'
        ? "4. મારી દુકાન, શોરૂમ, હોસ્પિટલ કે બિઝનેસ કેવી રીતે રજિસ્ટર કરવો?"
        : language === 'EN'
        ? "4. How do I register my Shop, Showroom, Hospital, or Business?"
        : "4. अपनी दुकान, शोरूम, अस्पताल या बिज़नेस को कैसे रजिस्टर करें?",
      a: language === 'GU'
        ? "હોમ સ્ક્રીન પર 'Business & Shop Directory' બેનર પર ક્લિક કરો. તમારી દુકાન કે બિઝનેસનું નામ, કેટેગરી, સરનામું/શહેર, સમય, વોટ્સએપ નંબર અને દુકાનના 2-3 ફોટા અપલોડ કરો. એડમિન ચકાસણી પછી તમારી દુકાન 'Verified' બેજ સાથે તમારા શહેરના લોકોને દેખાવા લાગશે."
        : language === 'EN'
        ? "Click on the 'Business & Shop Directory' banner on the home screen. Fill in your Shop/Business Name, Category, Owner Name, Address/City, Opening/Closing Timings, WhatsApp/Contact Number, and upload 2–3 clear photos of your shop. After Admin verification, your business will appear in your city's directory with a 'Verified' badge."
        : "होम स्क्रीन पर 'Business & Shop Directory' बैनर पर क्लिक करें। अपनी दुकान या बिज़नेस का नाम, कैटेगरी, मालिक का नाम, पता/शहर, खुलने-बंद होने का समय, व्हाट्सएप नंबर और दुकान की 2–3 साफ फोटो अपलोड करें। एडमिन द्वारा जांच और अप्रूवल के बाद आपकी दुकान 'Verified' बैज के साथ आपके शहर के लोगों को दिखने लगेगी।"
    },
    {
      q: language === 'GU'
        ? "5. લોકલ જાહેરાત બેનર ('Post Ad') માં પ્રચાર કેવી રીતે કરવો?"
        : language === 'EN'
        ? "5. How does the Local Advertisement Banner ('Post Ad') work?"
        : "5. लोकल विज्ञापन बैनर ('Post Ad') में अपना प्रचार कैसे करें?",
      a: language === 'GU'
        ? "હોમ સ્ક્રીન પર ચાલતા 'Local Advertisement Banner' માં '+ Post Ad' બટન પર ક્લિક કરો. તમારી ઓફર, સેલ કે દુકાનના પ્રચારનું ટાઈટલ, વિગત, સંપર્ક નંબર અને બેનર ફોટો અપલોડ કરો. એડમિન દ્વારા મંજૂર થતાં જ તમારી જાહેરાત મુખ્ય બેનર પર આપોઆપ સ્ક્રોલ થઈને બધાને દેખાશે."
        : language === 'EN'
        ? "In the scrolling 'Local Advertisement Banner' on the home screen, tap the '+ Post Ad' button. Enter your Business/Offer title, description, contact/WhatsApp number, location, and upload your promotional banner image. Once approved by the Admin, your ad will automatically scroll on the main banner for users in your area."
        : "होम स्क्रीन पर चल रहे 'Local Advertisement Banner' में '+ Post Ad' बटन पर क्लिक करें। अपने ऑफर, सेल, कोचिंग या दुकान के प्रचार का टाइटल, विवरण, संपर्क नंबर और बैनर फोटो अपलोड करके सबमिट करें। एडमिन से अप्रूव होते ही आपका विज्ञापन मुख्य बैनर पर अपने-आप स्क्रॉल होकर सभी को दिखेगा।"
    },
    {
      q: language === 'GU'
        ? "6. લોકલ જોબ પોર્ટલ પર નોકરી કેવી રીતે શોધવી અથવા સ્ટાફ માટે વેકેન્સી કેવી રીતે મુકવી?"
        : language === 'EN'
        ? "6. How does the Local Job Portal work for Job Seekers and Employers?"
        : "6. लोकल जॉब पोर्टल पर नौकरी कैसे ढूँढें या स्टाफ के लिए वैकेंसी कैसे डालें?",
      a: language === 'GU'
        ? "હોમ સ્ક્રીનના 'Local Job Portal' સેક્શનમાં બે વિકલ્પો છે: (A) 'મને કામ જોઈએ છે (Job Seeker)' — અહીં તમારું નામ, શિક્ષણ, અપેક્ષિત પગાર અને તમારો બાયોડેટા/રિઝ્યુમે અપલોડ કરો. (B) 'મને સ્ટાફ જોઈએ છે (Employer)' — અહીં તમારી નોંધાયેલી દુકાન લિંક કરીને અથવા નવું ફોર્મ ભરીને સ્ટાફની વેકેન્સી મૂકી શકો છો. 'Browse Jobs & Candidates' માં બધી મંજૂર થયેલી નોકરીઓ અને ઉમેદવારો જોઈ શકાય છે."
        : language === 'EN'
        ? "In the 'Local Job Portal' section: (A) If you need a job ('I Need a Job'), fill in your Name, Preferred Role, Education, Expected Salary, and upload your Resume/Biodata (PDF or Photo). (B) If you need staff ('I Need Staff / Employer'), you can either link your already registered Shop/Business on LocoHelp or fill out the Employer Vacancy form. You can also tap 'Browse Jobs & Candidates' to view approved vacancies and resumes."
        : "होम स्क्रीन के 'Local Job Portal' सेक्शन में दो विकल्प हैं: (A) 'मुझे काम चाहिए (Job Seeker)' — यहाँ अपना नाम, काम का प्रकार, शिक्षा, अपेक्षित सैलरी और अपना रिज्यूमे/बायोडाटा (PDF या फोटो) अपलोड करें। (B) 'मुझे स्टाफ चाहिए (Employer)' — यहाँ आप अपनी पहले से रजिस्टर्ड दुकान को लिंक करके या नया फॉर्म भरकर स्टाफ की वैकेंसी डाल सकते हैं। साथ ही 'Browse Jobs & Candidates' में जाकर सभी अप्रूव्ड नौकरियाँ और उम्मीदवार देखे जा सकते हैं।"
    },
    {
      q: language === 'GU'
        ? "7. મારું રજિસ્ટ્રેશન તરત કેમ નથી દેખાતું? એડમિન મંજૂરી કેવી રીતે કામ કરે છે?"
        : language === 'EN'
        ? "7. Why isn't my registration showing immediately? How does Admin Approval work?"
        : "7. मेरा रजिस्ट्रेशन तुरंत क्यों नहीं दिख रहा है? एडमिन अप्रूवल कैसे काम करता है?",
      a: language === 'GU'
        ? "LocoHelp ને 100% વિશ્વસનીય અને બોગસ એકાઉન્ટ્સથી મુક્ત રાખવા માટે દરેક રજિસ્ટ્રેશન પહેલા એડમિન ટીમ પાસે ચકાસણી માટે જાય છે. એડમિન દ્વારા વિગતોની ચકાસણી થઈને મંજૂર થતાં જ તે વેબસાઈટ પર આપોઆપ લાઈવ થઈ જાય છે."
        : language === 'EN'
        ? "To keep LocoHelp 100% genuine, safe, and spam-free, every registration (Service Expert, Shop/Business, Advertisement Banner, Job Seeker Profile, and Employer Vacancy) goes to the Admin team for verification first. As soon as the Admin verifies and approves your details, it goes live on the website automatically."
        : "LocoHelp को 100% भरोसेमंद, सुरक्षित और फर्जी अकाउंट्स से मुक्त रखने के लिए हर रजिस्ट्रेशन (सर्विस एक्सपर्ट, दुकान/बिज़नेस, विज्ञापन बैनर, जॉब प्रोफाइल और वैकेंसी) पहले एडमिन के पास वेरिफिकेशन के लिए जाता है। एडमिन द्वारा विवरण की जांच और अप्रूव करते ही यह वेबसाइट पर लाइव दिखने लगता है।"
    },
    {
      q: language === 'GU'
        ? "8. પોતાના શહેર કે વિસ્તારની વિગતો જોવા માટે લોકેશન કેવી રીતે બદલવું?"
        : language === 'EN'
        ? "8. How do I change my City / Location to see listings from my area?"
        : "8. अपने शहर या एरिया की जानकारी देखने के लिए लोकेशन कैसे बदलें?",
      a: language === 'GU'
        ? "હોમ સ્ક્રીન પર સૌથી ઉપર આપેલા લોકેશન/શહેર બટન પર ક્લિક કરો. તમે આખા ભારતમાં તમારું રાજ્ય, જિલ્લો/શહેર કે પિન કોડ પસંદ કરી શકો છો અથવા GPS લોકેશન ચાલુ કરી શકો છો. તે પછી તમને તમારા પસંદ કરેલા શહેરની વિગતો જ દેખાશે."
        : language === 'EN'
        ? "Tap the City / Location selector at the top of the home screen. You can select your State, District/City, or enter your Pin Code across India, or use GPS location. The feed, shops, service experts, ads, and jobs will automatically filter for your chosen city and nearby connected areas."
        : "होम स्क्रीन पर सबसे ऊपर दिए गए लोकेशन/शहर बटन पर क्लिक करें। आप पूरे भारत में अपना राज्य, जिला/शहर या पिन कोड चुन सकते हैं या GPS लोकेशन चालू कर सकते हैं। इसके बाद आपको अपने चुने हुए शहर और आसपास के जुड़े हुए क्षेत्रों के ही पोस्ट, दुकानें, सर्विस एक्सपर्ट और जॉब्स दिखाई देंगे।"
    },
    {
      q: language === 'GU'
        ? "9. એકાઉન્ટ લોગિન અને ઈમેલ OTP વેરિફિકેશન કેવી રીતે કામ કરે છે?"
        : language === 'EN'
        ? "9. How do Account Login and OTP Verification work?"
        : "9. अकाउंट लॉगिन और ईमेल OTP वेरिफिकेशन कैसे काम करता है?",
      a: language === 'GU'
        ? "તમે ગૂગલ લોગિન અથવા તમારા ઈમેલ અને પાસવર્ડ વડે સરળતાથી લોગિન કરી શકો છો. નવું રજિસ્ટ્રેશન કરતી વખતે બોગસ પ્રોફાઈલ રોકવા માટે ઈમેલ OTP વેરિફિકેશન ફરજિયાત રાખવામાં આવ્યું છે જેથી માત્ર સાચા લોકો જ જોડાય."
        : language === 'EN'
        ? "You can sign in quickly using Google Login or your Email & Password. When registering on the public website, Email OTP verification is mandatory to prevent fake or dummy profiles and ensure every member of the community is genuine."
        : "आप Google लॉगिन या अपने ईमेल और पासवर्ड की मदद से आसानी से लॉगिन कर सकते हैं। पब्लिक वेबसाइट से नया रजिस्ट्रेशन करते समय फर्जी या डमी प्रोफाइल को रोकने के लिए ईमेल OTP वेरिफिकेशन अनिवार्य रखा गया है ताकि कम्युनिटी में केवल असली लोग ही जुड़ें।"
    },
    {
      q: language === 'GU'
        ? "10. મારી મૂકેલી પોસ્ટ, દુકાન, પ્રોફાઈલ કે જોબ ડિલીટ અથવા મેનેજ કેવી રીતે કરવી?"
        : language === 'EN'
        ? "10. How can I edit or delete my Broadcast post, Shop, Profile, or Job listing?"
        : "10. अपनी डाली हुई पोस्ट, दुकान, प्रोफाइल या जॉब को डिलीट या मैनेज कैसे करें?",
      a: language === 'GU'
        ? "જ્યારે તમે તે જ એકાઉન્ટથી લોગિન રહો છો જેનાથી તમે વિગત મૂકી હતી, ત્યારે તમને તમારા કાર્ડ અથવા પ્રોફાઈલ સેક્શનમાં ડિલીટ (Trash આયકન) નો વિકલ્પ મળે છે, જેનાથી તમે જ્યારે ઈચ્છો ત્યારે તેને હટાવી શકો છો."
        : language === 'EN'
        ? "When you are logged in with the same account you used to create a Broadcast post, Shop, Service Expert profile, Ad, or Job listing, you will see a Delete (Trash icon) option on your item or inside your Profile/Settings section, allowing you to remove it anytime."
        : "जब आप उसी अकाउंट से लॉगिन रहते हैं जिससे आपने ब्रॉडकास्ट पोस्ट, दुकान, सर्विस एक्सपर्ट प्रोफाइल, विज्ञापन या जॉब डाली थी, तो आपको अपने कार्ड या प्रोफाइल सेक्शन में डिलीट (Trash आइकन) का विकल्प मिलता है, जिससे आप जब चाहें उसे हटा सकते हैं।"
    },
    {
      q: language === 'GU'
        ? "11. કોઈ ખોટી પોસ્ટ, બોગસ લિસ્ટિંગ કે શંકાસ્પદ યુઝરની ફરિયાદ (Report) એડમિનને કેવી રીતે કરવી?"
        : language === 'EN'
        ? "11. How do I report a wrong post, fake listing, or suspicious user to the Admin?"
        : "11. किसी गलत पोस्ट, फर्जी लिस्टिंग या संदिग्ध यूजर की शिकायत (Report) एडमिन से कैसे करें?",
      a: language === 'GU'
        ? "Settings (સેટિંગ્સ) માં જઈને 'સેવાની શરતો અને સુરક્ષા નિયમો' અથવા સીધા ચેટની અંદર 'Report' બટન પર ક્લિક કરો. ફરિયાદનું કારણ પસંદ કરીને વિગત લખો. તમારી રિપોર્ટ સીધી એડમિન પાસે જશે અને ખોટી પોસ્ટ કે યુઝરને તરત જ હટાવવામાં આવશે."
        : language === 'EN'
        ? "Open Settings and tap 'Terms of Service & Safety Rules' (or use the Report button directly inside any chat), then tap 'Report Suspicious Activity'. Select the reason and submit details. Your report goes directly to the Admin team for immediate verification and action."
        : "Settings (सेटिंग्स) में जाकर 'सेवा की शर्तें व सुरक्षा नियम' खोलें (या सीधे किसी भी चैट के अंदर ऊपर दिए गए Report बटन को दबाएं) और शिकायत का कारण चुनकर सबमिट करें। आपकी रिपोर्ट सीधे एडमिन टीम के पास जाती है और गलत पोस्ट या यूजर पर तुरंत कार्रवाई की जाती है।"
    },
    {
      q: language === 'GU'
        ? "12. તમારા મોબાઈલ ફોનમાં LocoHelp એપ (App) કેવી રીતે ઈન્સ્ટોલ કરવી?"
        : language === 'EN'
        ? "12. How can I install the LocoHelp App on my mobile phone?"
        : "12. अपने मोबाइल फोन में LocoHelp ऐप (App) कैसे इंस्टॉल करें?",
      a: language === 'GU'
        ? "તમારા ફોનના Google Chrome બ્રાઉઝરમાં www.locohelp.com ખોલો અને ઉપર આપેલા 'Install App' બટન પર ક્લિક કરો. જો તમે વોટ્સએપ કે ઈન્સ્ટાગ્રામમાં લિંક ખોલી હોય, તો પહેલા તેને 'Open in Chrome' કરો, જેથી એપ સીધી તમારા ફોનની હોમ સ્ક્રીન પર ઈન્સ્ટોલ થઈ જશે."
        : language === 'EN'
        ? "Open www.locohelp.com in Google Chrome on your phone and tap the 'Install App' button in the top bar (or inside Settings). If you opened the link inside WhatsApp or Instagram, tap 'Open in Chrome' first so the official mobile app installs smoothly on your home screen."
        : "अपने फोन के Google Chrome ब्राउज़र में www.locohelp.com खोलें और ऊपर दिए गए 'Install App' बटन (या सेटिंग्स के अंदर इंस्टॉल विकल्प) पर क्लिक करें। यदि आपने व्हाट्सएप या इंस्टाग्राम के अंदर लिंक खोला है, तो पहले उसे 'Open in Chrome' करें, जिससे ऐप सीधे आपके फोन की होम स्क्रीन पर इंस्टॉल हो जाएगा।"
    },
    {
      q: language === 'GU'
        ? "13. ચેટમાં મોબાઈલ નંબરની ગોપનીયતા અને કોઈ યુઝરને Block (બ્લોક) કેવી રીતે કરવા?"
        : language === 'EN'
        ? "13. How does phone number privacy work in chat, and how can I Block a user?"
        : "13. चैट में मोबाइल नंबर की गोपनीयता कैसी है और किसी यूज़र को Block (ब्लॉक) कैसे करें?",
      a: language === 'GU'
        ? "તમારી સુરક્ષા માટે કોઈપણ યુઝરનો મોબાઈલ નંબર જાહેરમાં બતાવવામાં આવતો નથી; જરૂર પડ્યે તમે સ્વેચ્છાએ ચેટમાં લખીને આપી શકો છો. જો કોઈ યુઝર ચેટમાં ખોટા મેસેજ કરે, તો ચેટમાં ઉપર આપેલા 'Block' બટનથી તમે તેને તરત જ બ્લોક કરી શકો છો જેથી તે તમને ફરી મેસેજ ન કરી શકે."
        : language === 'EN'
        ? "For complete privacy, phone numbers are hidden by default and only shared if you voluntarily type them in chat. If anyone sends unwanted messages or behaves inappropriately, tap the 'Block' button at the top of the chat window to immediately stop them from messaging you."
        : "आपकी सुरक्षा के लिए किसी भी यूज़र का मोबाइल नंबर सार्वजनिक रूप से नहीं दिखाया जाता; आवश्यकता होने पर आप स्वेच्छा से चैट में लिखकर दे सकते हैं। यदि कोई यूज़र बार-बार अनचाहे मैसेज करे या अनुचित व्यवहार करे, तो चैट में ऊपर दिए गए 'Block' बटन से आप उसे तुरंत ब्लॉक कर सकते हैं।"
    },
    {
      q: language === 'GU'
        ? "14. મારું એકાઉન્ટ અને ડેટા કાયમી ધોરણે ડિલીટ (Delete Account) કેવી રીતે કરવું?"
        : language === 'EN'
        ? "14. How can I permanently close or delete my LocoHelp account and data?"
        : "14. अपना अकाउंट और डेटा स्थायी रूप से बंद / डिलीट (Delete Account) कैसे करें?",
      a: language === 'GU'
        ? "Settings (સેટિંગ્સ) માં સૌથી નીચે આપેલા 'એકાઉન્ટ બંધ / ડિલીટ કરવાની વિનંતી (Request Account Closure / Delete Account)' વિકલ્પ પર ક્લિક કરીને કારણ લખો અને સબમિટ કરો. ચકાસણી બાદ તમારું એકાઉન્ટ અને વ્યક્તિગત ડેટા કાયમી ધોરણે હટાવી દેવામાં આવશે."
        : language === 'EN'
        ? "Go to Settings and tap 'Request Account Closure / Delete Account' at the bottom, enter your reason, and submit. Upon verification, your profile, posts, and personal data will be permanently deleted in accordance with our Privacy Policy."
        : "Settings (सेटिंग्स) में सबसे नीचे दिए गए 'अकाउंट बंद / डिलीट करने का अनुरोध (Request Account Closure / Delete Account)' बटन पर क्लिक करें, कारण लिखें और सबमिट करें। सत्यापन के बाद आपकी प्रोफ़ाइल और व्यक्तिगत डेटा स्थायी रूप से हटा दिया जाएगा।"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="flex items-center px-4 py-4 pt-10 sm:pt-4 border-b border-[#DFDBCF] dark:border-slate-800 sticky top-0 bg-[#FCFAF5]/90 dark:bg-slate-850/90 backdrop-blur-xl shadow-xs z-10">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 mr-2 hover:bg-[#EAE6DC] dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
        </button>
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            {language === 'EN' ? 'Support, Contact & FAQs' : language === 'GU' ? 'સપોર્ટ, સંપર્ક અને સવાલ-જવાબ' : 'सहायता, संपर्क और सवाल-जवाब'}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            LocoHelp Official Support & Contact Center
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Support Top Hero Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-6 -right-6 opacity-10 pointer-events-none">
            <LifeBuoy className="w-36 h-36" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider">
              24×7 Helpdesk
            </span>
            <span className="text-amber-300 text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Official Help
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black mb-1">
            {language === 'EN'
              ? 'How can we help you today?'
              : language === 'GU'
              ? 'આજે અમે તમારી કેવી રીતે મદદ કરી શકીએ?'
              : 'हम आपकी किस प्रकार सहायता कर सकते हैं?'}
          </h3>
          <p className="text-indigo-100 text-xs font-medium max-w-sm">
            {language === 'EN'
              ? 'Connect with us directly via Official Email or Instagram, or browse instant answers in the FAQs below.'
              : language === 'GU'
              ? 'નીચે અમારા ઓફિશિયલ ઈમેલ અથવા ઈન્સ્ટાગ્રામ પર સીધો સંપર્ક કરો, અથવા FAQs માં ત્વરિત જવાબો જુઓ.'
              : 'नीचे हमारे ऑफिशियल ईमेल या इंस्टाग्राम पर सीधे संपर्क करें, अथवा अक्सर पूछे जाने वाले सवालों (FAQs) में तुरंत उत्तर देखें।'}
          </p>
        </div>

        {/* ========================================================= */}
        {/* BANNER 1: OFFICIAL BUSINESS EMAIL & INSTAGRAM CONTACT     */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/40">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {language === 'EN' ? 'Official Contact Channels' : language === 'GU' ? 'ઓફિશિયલ સંપર્ક માધ્યમ (Email & Instagram)' : 'आधिकारिक संपर्क माध्यम (Email व Instagram)'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'EN' ? 'Verified Helpdesk & Social Connect' : language === 'GU' ? 'વેરિફાઈડ સહાયતા કેન્દ્ર અને સોશિયલ મીડિયા' : 'सत्यापित सहायता केंद्र और सोशल मीडिया'}
                </p>
              </div>
            </div>

            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active
            </span>
          </div>

          {/* Email Address Highlight Box */}
          <div className="bg-indigo-50/70 dark:bg-slate-900/70 border border-indigo-100 dark:border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <a 
                href={`mailto:${businessEmail}`} 
                className="font-black text-sm text-indigo-700 dark:text-indigo-300 hover:underline truncate"
              >
                {businessEmail}
              </a>
            </div>

            <button
              onClick={handleCopyEmail}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
              title="Copy Email"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 text-[11px]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Action Buttons: Email + Real Instagram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleSendEmail}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span className="truncate">{language === 'EN' ? 'Email: support@locohelp.com' : language === 'GU' ? 'ઈમેલ: support@locohelp.com' : 'ईमेल: support@locohelp.com'}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" />
            </button>

            <a
              href="https://www.instagram.com/locohelpofficial?igsh=MWd2c282b2N6N250aA=="
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-pink-50/70 dark:bg-slate-900 dark:hover:bg-slate-800/90 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-xl border border-pink-200 dark:border-pink-900/50 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="supportIgGrad" cx="30%" cy="107%" r="150%">
                    <stop offset="0%" stopColor="#fdf497" />
                    <stop offset="5%" stopColor="#fdf497" />
                    <stop offset="45%" stopColor="#fd5949" />
                    <stop offset="60%" stopColor="#d6249f" />
                    <stop offset="90%" stopColor="#285AEB" />
                  </radialGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#supportIgGrad)" />
                <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4" stroke="#fff" strokeWidth="1.6" fill="none" />
                <circle cx="12" cy="12" r="3.6" stroke="#fff" strokeWidth="1.6" fill="none" />
                <circle cx="16.3" cy="7.7" r="1.1" fill="#fff" />
              </svg>
              <span className="truncate">@locohelpofficial</span>
              <ExternalLink className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            </a>
          </div>

          <p className="text-[11px] text-center text-slate-400 font-medium">
            {language === 'EN' ? '⚡ Typical response time within 24 hours' : language === 'GU' ? '⚡ સામાન્ય રીતે 24 કલાકની અંદર પ્રતિસાદ' : '⚡ सामान्यतः 24 घंटे के भीतर प्रतिक्रिया'}
          </p>
        </div>

        {/* ========================================================= */}
        {/* BANNER 2: FREQUENTLY ASKED QUESTIONS (FAQS)               */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-900/40">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {language === 'EN' ? 'Frequently Asked Questions (FAQs)' : language === 'GU' ? 'વારંવાર પૂછાતા પ્રશ્નો (FAQs)' : 'अक्सर पूछे जाने वाले सवाल (FAQs)'}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'EN' ? 'Instant solutions to common queries' : language === 'GU' ? 'સામાન્ય પ્રશ્નોના ત્વરિત ઉકેલો' : 'सामान्य प्रश्नों के त्वरित समाधान'}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div 
                  key={idx}
                  className="border border-slate-200 dark:border-slate-700/70 rounded-2xl overflow-hidden transition-all bg-[#FCFAF5] dark:bg-slate-850"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-3.5 text-left flex items-center justify-between gap-2 hover:bg-slate-100/60 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {faq.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed border-t border-slate-100 dark:border-slate-700/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Safety & Trust Note */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-medium text-[11px]">
            {language === 'EN'
              ? 'LocoHelp will never ask for your bank passwords or OTPs via email.'
              : language === 'GU'
              ? 'LocoHelp ક્યારેય ઈમેલ પર તમારો બેંક પાસવર્ડ કે OTP માંગતું નથી.'
              : 'LocoHelp कभी भी ईमेल पर आपका बैंक पासवर्ड या OTP नहीं मांगता।'}
          </span>
        </div>
      </div>
    </div>
  );
}
