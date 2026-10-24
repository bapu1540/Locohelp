export interface FeatureBannerDetail {
  id: string;
  icon: string;
  badge: string;
  titleEn: string;
  titleHi: string;
  titleGu: string;
  shortDescEn: string;
  shortDescHi: string;
  shortDescGu: string;
  whatYouCanPostEn: string[];
  whatYouCanPostHi: string[];
  whatYouCanPostGu: string[];
  howItWorksEn: string[];
  howItWorksHi: string[];
  howItWorksGu: string[];
}

export const FEATURE_BANNERS: FeatureBannerDetail[] = [
  {
    id: 'broadcast',
    icon: '⚡',
    badge: '1-Hour Live Feed',
    titleEn: '1. Post / Broadcast Urgent Need (1-Hour Live)',
    titleHi: '1. पोस्ट / ब्रॉडकास्ट — तुरंत जरूरत पोस्ट करें',
    titleGu: '1. પોસ્ટ / બ્રોડકાસ્ટ — તાત્કાલિક જરૂરિયાત પોસ્ટ કરો',
    shortDescEn: 'Post urgent local needs: Plumber, Electrician, Mechanic, Emergency, Sports...',
    shortDescHi: 'इमरजेंसी जरूरतें पोस्ट करें: प्लंबर, इलेक्ट्रीशियन, मैकेनिक, ब्लड डोनर, क्रिकेट...',
    shortDescGu: 'તાત્કાલિક જરૂરિયાતો પોસ્ટ કરો: પ્લમ્બર, ઈલેક્ટ્રિશિયન, મિકેનિક, બ્લડ ડોનર, ક્રિકેટ...',
    whatYouCanPostEn: [
      '🔧 "Bathroom pipe burst - Plumber needed immediately"',
      '⚡ "Light circuit tripping - Electrician needed urgently"',
      '🚗 "Car/Bike puncture on main road - Mechanic assistance"',
      '🏏 "Need 2 players for evening box cricket match"',
      '💊 "Emergency medicine delivery or hospital assistance"'
    ],
    whatYouCanPostHi: [
      '🔧 "बाथरूम का पाइप लीक हो रहा है - तुरंत प्लंबर चाहिए"',
      '⚡ "घर की लाइट ट्रिप हो रही है - इलेक्ट्रीशियन चाहिए"',
      '🚗 "मेन रोड पर गाड़ी पंचर हो गई - मैकेनिक मदद चाहिए"',
      '🏏 "शाम को क्रिकेट खेलने के लिए 2 खिलाड़ी चाहिए"',
      '💊 "इमरजेंसी दवा या अस्पताल सहायता चाहिए"'
    ],
    whatYouCanPostGu: [
      '🔧 "બાથરૂમની પાઈપ લીક થઈ રહી છે - તાત્કાલિક પ્લમ્બર જોઈએ છે"',
      '⚡ "ઘરની લાઈટ ટ્રિપ થઈ રહી છે - ઈલેક્ટ્રિશિયન જોઈએ છે"',
      '🚗 "મેઈન રોડ પર ગાડીમાં પંચર પડ્યું છે - મિકેનિક મદદ જોઈએ છે"',
      '🏏 "સાંજે ક્રિકેટ રમવા માટે 2 ખેલાડીઓ જોઈએ છે"',
      '💊 "ઈમરજન્સી દવા અથવા હોસ્પિટલ સહાય જોઈએ છે"'
    ],
    howItWorksEn: [
      'Use 1-Click Need Templates or Voice Search to post your requirement in seconds.',
      'Your post goes live immediately in "Active Nearby" for your selected District & Area.',
      'Post owners can check all replies in "Responses / Chats", share on WhatsApp, and posts auto-delete after 1 hour to keep the feed fresh.'
    ],
    howItWorksHi: [
      '1-क्लिक रेडीमेड टेम्पलेट्स या वॉइस सर्च का उपयोग करके सेकंडों में अपनी जरूरत पोस्ट करें।',
      'आपकी पोस्ट आपके चुने हुए जिले और एरिया के "आस-पास की लाइव पोस्ट्स" में तुरंत लाइव हो जाती है।',
      'पोस्ट करने वाले "प्राप्त जवाब देखें (Inbox)" में सभी चैट देख सकते हैं और पोस्ट 1 घंटे बाद अपने-आप हट जाती है।'
    ],
    howItWorksGu: [
      '1-ક્લિક રેડીમેડ ટેમ્પલેટ્સ અથવા વોઈસ સર્ચનો ઉપયોગ કરીને સેકન્ડોમાં તમારી જરૂરિયાત પોસ્ટ કરો.',
      'તમારી પોસ્ટ તમારા પસંદ કરેલા જિલ્લા અને વિસ્તારના "આસપાસની લાઈવ પોસ્ટ્સ" માં તરત જ લાઈવ થઈ જાય છે.',
      'પોસ્ટ કરનાર "મળેલા જવાબો જુઓ (Inbox)" માં બધી ચેટ જોઈ શકે છે અને પોસ્ટ 1 કલાક પછી આપમેળે દૂર થઈ જાય છે.'
    ]
  },
  {
    id: 'experts',
    icon: '🛠️',
    badge: 'Service Experts',
    titleEn: '2. Browse Service Experts & Professionals',
    titleHi: '2. ब्राउज़ सर्विस एक्सपर्ट्स (कुशल प्रोफेशनल्स)',
    titleGu: '2. સર્વિસ એક્સપર્ટ્સ અને કારીગરો શોધો',
    shortDescEn: 'Find verified Plumbers, Electricians, Mechanics, Tutors & register your profile...',
    shortDescHi: 'वेरिफाइड प्लंबर, इलेक्ट्रीशियन, मैकेनिक, ट्यूटर खोजें या अपनी प्रोफाइल बनाएं...',
    shortDescGu: 'વેરિફાઈડ પ્લમ્બર, ઈલેક્ટ્રિશિયન, મિકેનિક, ટ્યુટર શોધો અથવા તમારી પ્રોફાઇલ બનાવો...',
    whatYouCanPostEn: [
      '🛠️ Browse or register as Plumber, Electrician, Carpenter, Painter, Mason, AC Technician',
      '🛵 Vehicle Puncture Mechanic, Towing & Auto Care Experts',
      '🎓 Home Tutor, Coaching Teacher, Fitness & Yoga Trainer',
      '🧹 Housekeeping, Domestic Help, Delivery & Custom Service Categories'
    ],
    whatYouCanPostHi: [
      '🛠️ प्लंबर, इलेक्ट्रीशियन, कारपेंटर, पेंटर, मिस्त्री, AC तकनीशियन खोजें या रजिस्टर करें',
      '🛵 गाड़ी पंचर मैकेनिक, टोइंग व ऑटोकेयर एक्सपर्ट्स',
      '🎓 होम ट्यूटर, कोचिंग शिक्षक, फिटनेस ट्रेनर',
      '🧹 हाउसकीपिंग, होम केयर, डिलीवरी व अन्य कस्टम सर्विस कैटेगरी'
    ],
    whatYouCanPostGu: [
      '🛠️ પ્લમ્બર, ઈલેક્ટ્રિશિયન, સુથાર (કાર્પેન્ટર), પેઈન્ટર, કડિયો, AC ટેકનિશિયન શોધો અથવા રજિસ્ટર કરો',
      '🛵 વાહન પંચર મિકેનિક, ટોઈંગ અને ઓટોકેર એક્સપર્ટ્સ',
      '🎓 હોમ ટ્યુટર, કોચિંગ શિક્ષક, ફિટનેસ ટ્રેનર',
      '🧹 હાઉસકીપિંગ, હોમ કેર, ડિલિવરી અને અન્ય કસ્ટમ સર્વિસ કેટેગરી'
    ],
    howItWorksEn: [
      'Click "Browse Service Experts" on the home screen and choose any service category.',
      'Search experts by City, Village, or Area and chat directly on the website.',
      'Skilled professionals can click "+ Create Profile" to upload their skills, experience, and work photo (published after Admin approval).'
    ],
    howItWorksHi: [
      'होम स्क्रीन पर "ब्राउज़ सर्विस एक्सपर्ट्स" पर टैप करें और अपनी जरूरत की कैटेगरी चुनें।',
      'शहर, गांव या इलाके के नाम से एक्सपर्ट्स खोजें और सीधे वेबसाइट पर चैट करें।',
      'कुशल प्रोफेशनल्स "+ प्रोफाइल बनाएं" पर क्लिक करके अपना अनुभव और काम की फोटो जोड़ सकते हैं (एडमिन अप्रूवल के बाद लाइव)।'
    ],
    howItWorksGu: [
      'હોમ સ્ક્રીન પર "સર્વિસ એક્સપર્ટ્સ અને કારીગરો શોધો" પર ટેપ કરો અને તમારી જરૂરિયાત મુજબ કેટેગરી પસંદ કરો.',
      'શહેર, ગામ કે વિસ્તારના નામથી એક્સપર્ટ્સ શોધો અને સીધા વેબસાઈટ પર ચેટ કરો.',
      'કુશળ કારીગરો "+ પ્રોફાઇલ બનાવો" પર ક્લિક કરીને પોતાનો અનુભવ અને કામનો ફોટો ઉમેરી શકે છે (એડમિન અપ્રૂવલ પછી લાઈવ).'
    ]
  },
  {
    id: 'directory',
    icon: '🏪',
    badge: 'Shops & Businesses',
    titleEn: '3. Business & Shop Register Directory',
    titleHi: '3. दुकान व बिज़नेस रजिस्टर डायरेक्टरी',
    titleGu: '3. દુકાન અને બિઝનેસ રજિસ્ટર ડિરેક્ટરી',
    shortDescEn: 'Browse or register local shops, showrooms, hospitals, restaurants & venues...',
    shortDescHi: 'स्थानीय दुकानें, शोरूम, अस्पताल, रेस्टोरेंट देखें या अपना बिज़नेस रजिस्टर करें...',
    shortDescGu: 'સ્થાનિક દુકાનો, શોરૂમ, હોસ્પિટલ, રેસ્ટોરન્ટ જુઓ અથવા તમારો બિઝનેસ રજિસ્ટર કરો...',
    whatYouCanPostEn: [
      '🏪 Retail Shops, Showrooms, Electronics & Mobile Stores',
      '🏥 Hospitals, Clinics, Pharmacies & Medical Stores',
      '🍽️ Restaurants, Cafes, Bakeries, Supermarkets & Grocery Marts',
      '🏢 Shopping Malls, Service Centers, Coaching Academies & Venues'
    ],
    whatYouCanPostHi: [
      '🏪 रिटेल दुकानें, शोरूम, इलेक्ट्रॉनिक्स और मोबाइल स्टोर',
      '🏥 अस्पताल, क्लिनिक, फार्मेसी और मेडिकल स्टोर',
      '🍽️ रेस्टोरेंट, कैफे, बेकरी, सुपरमार्केट और ग्रॉसरी मार्ट',
      '🏢 शॉपिंग मॉल, सर्विस सेंटर, कोचिंग अकादमी और वेन्यू'
    ],
    whatYouCanPostGu: [
      '🏪 રિટેલ દુકાનો, શોરૂમ, ઈલેક્ટ્રોનિક્સ અને મોબાઈલ સ્ટોર',
      '🏥 હોસ્પિટલ, ક્લિનિક, ફાર્મસી અને મેડિકલ સ્ટોર',
      '🍽️ રેસ્ટોરન્ટ, કાફે, બેકરી, સુપરમાર્કેટ અને ગ્રોસરી માર્ટ',
      '🏢 શોપિંગ મોલ, સર્વિસ સેન્ટર, કોચિંગ એકેડમી અને વેન્યુ'
    ],
    howItWorksEn: [
      'Business owners can register with Shop Name, Category, Owner Name, Timings, Address, WhatsApp Number, and up to 3 Shop Photos.',
      'Every registration goes to Admin for verification before going live in the public directory.',
      'Customers can browse shop photos, timings, and connect with owners on WhatsApp in 1 click.'
    ],
    howItWorksHi: [
      'दुकानदार अपनी दुकान का नाम, कैटेगरी, मालिक का नाम, खुलने का समय, पता, व्हाट्सएप नंबर और 2-3 फोटो अपलोड करके रजिस्टर कर सकते हैं।',
      'हर रजिस्ट्रेशन पब्लिक डायरेक्टरी में लाइव होने से पहले एडमिन अप्रूवल के लिए जाता है।',
      'ग्राहक दुकान की फोटो, समय और पता देखकर 1-क्लिक में व्हाट्सएप पर संपर्क कर सकते हैं।'
    ],
    howItWorksGu: [
      'દુકાનદારો પોતાની દુકાનનું નામ, કેટેગરી, માલિકનું નામ, ખુલવાનો સમય, સરનામું, વોટ્સએપ નંબર અને 2-3 ફોટા અપલોડ કરીને રજિસ્ટર કરી શકે છે.',
      'દરેક રજિસ્ટ્રેશન પબ્લિક ડિરેક્ટરીમાં લાઈવ થતાં પહેલાં એડમિન અપ્રૂવલ માટે જાય છે.',
      'ગ્રાહકો દુકાનના ફોટા, સમય અને સરનામું જોઈને 1-ક્લિકમાં વોટ્સએપ પર સંપર્ક કરી શકે છે.'
    ]
  },
  {
    id: 'jobs',
    icon: '💼',
    badge: 'Local Job Portal',
    titleEn: '4. Job Seekers & Employers (Hire Staff)',
    titleHi: '4. लोकल जॉब पोर्टल — नौकरी पाएं या स्टाफ रखें',
    titleGu: '4. લોકલ જોબ પોર્ટલ — નોકરી મેળવો અથવા સ્ટાફ રાખો',
    shortDescEn: 'Register as a Job Seeker with Resume/Biodata or post vacancies as an Employer...',
    shortDescHi: 'रिज्यूमे के साथ जॉब के लिए रजिस्टर करें या अपनी दुकान/कंपनी के लिए स्टाफ हायर करें...',
    shortDescGu: 'રિઝ્યુમ સાથે નોકરી માટે રજિસ્ટર કરો અથવા તમારી દુકાન/કંપની માટે સ્ટાફ હાયર કરો...',
    whatYouCanPostEn: [
      '👨‍💼 Job / Work Registration: Full Name, Preferred Role, Education, Expected Salary & Resume/Biodata Upload (PDF/Image)',
      '🏪 Employer Option A (Already Registered Shop): Link your existing LocoHelp Shop/Business in 1 click to post a job',
      '🏢 Employer Option B (New Employer): Register your business/company and post staff vacancies directly',
      '🔍 Browse verified local candidates and open job vacancies in your city'
    ],
    whatYouCanPostHi: [
      '👨‍💼 जॉब / काम का रजिस्ट्रेशन: नाम, पसंदीदा काम, शिक्षा, अपेक्षित सैलरी और रिज्यूमे/बायोडाटा (PDF/फोटो) अपलोड करें',
      '🏪 एम्प्लॉयर विकल्प A (पहले से रजिस्टर्ड दुकान): अपनी रजिस्टर्ड दुकान चुनें और बिना दोबारा फॉर्म भरे सीधे जॉब पोस्ट करें',
      '🏢 एम्प्लॉयर विकल्प B (नया एम्प्लॉयर): नया एम्प्लॉयर रजिस्ट्रेशन करें और स्टाफ की आवश्यकता पोस्ट करें',
      '🔍 अपने शहर के वेरिफाइड उम्मीदवारों और खाली नौकरियों की सूची देखें'
    ],
    whatYouCanPostGu: [
      '👨‍💼 જોબ / કામનું રજિસ્ટ્રેશન: નામ, પસંદગીનું કામ, શિક્ષણ, અપેક્ષિત પગાર અને રિઝ્યુમ/બાયોડેટા (PDF/ફોટો) અપલોડ કરો',
      '🏪 એમ્પ્લોયર વિકલ્પ A (પહેલેથી રજિસ્ટર્ડ દુકાન): તમારી રજિસ્ટર્ડ દુકાન પસંદ કરો અને ફરીથી ફોર્મ ભર્યા વગર સીધી જોબ પોસ્ટ કરો',
      '🏢 એમ્પ્લોયર વિકલ્પ B (નવા એમ્પ્લોયર): નવું એમ્પ્લોયર રજિસ્ટ્રેશન કરો અને સ્ટાફની જરૂરિયાત પોસ્ટ કરો',
      '🔍 તમારા શહેરના વેરિફાઈડ ઉમેદવારો અને ખાલી નોકરીઓની યાદી જુઓ'
    ],
    howItWorksEn: [
      'Two dedicated cards on the Home Page: "Job / Work Registration" (for Job Seekers) and "For Employer / Give a Job" (for Job Givers).',
      'All candidate profiles and employer job postings are verified by Admin before going live.',
      'Employers and job seekers can connect directly via WhatsApp or Call once approved.'
    ],
    howItWorksHi: [
      'होम पेज पर दो अलग कार्ड हैं: "जॉब / काम का रजिस्ट्रेशन" (काम चाहने वालों के लिए) और "नौकरी / काम देने वाले (Employer)"।',
      'सभी उम्मीदवार प्रोफाइल और जॉब वेकेंसी एडमिन सत्यापन के बाद ही पब्लिक पोर्टल पर लाइव होती हैं।',
      'अप्रूव होने के बाद एम्प्लॉयर और उम्मीदवार सीधे संपर्क कर सकते हैं।'
    ],
    howItWorksGu: [
      'હોમ પેજ પર બે અલગ કાર્ડ છે: "જોબ / કામ માટે રજિસ્ટ્રેશન" (કામ શોધનારાઓ માટે) અને "નોકરી / કામ આપનાર (Employer)".',
      'તમામ ઉમેદવાર પ્રોફાઇલ અને જોબ વેકેન્સી એડમિન ચકાસણી પછી જ પબ્લિક પોર્ટલ પર લાઈવ થાય છે.',
      'અપ્રૂવ થયા પછી એમ્પ્લોયર અને ઉમેદવાર સીધો સંપર્ક કરી શકે છે.'
    ]
  },
  {
    id: 'chat_location',
    icon: '📍',
    badge: 'Pan-India & Chat',
    titleEn: '5. Pan-India Location, Ads & Private Chat',
    titleHi: '5. पैन-इंडिया लोकेशन, विज्ञापन और सुरक्षित चैट',
    titleGu: '5. પાન-ઈન્ડિયા લોકેશન, જાહેરાત અને સુરક્ષિત ચેટ',
    shortDescEn: 'Select any State/District in India, chat privately, or install the Mobile App...',
    shortDescHi: 'भारत का कोई भी राज्य/जिला चुनें, सुरक्षित चैट करें और मोबाइल ऐप इंस्टॉल करें...',
    shortDescGu: 'ભારતનું કોઈપણ રાજ્ય/જિલ્લો પસંદ કરો, સુરક્ષિત ચેટ કરો અને મોબાઈલ એપ ઈન્સ્ટોલ કરો...',
    whatYouCanPostEn: [
      '📍 Top Location Selector: Choose your State, District & Local Area across All India',
      '💬 Private In-App Chat: Talk, share photos & drop location pins without exposing your number publicly',
      '📢 Auto-Scrolling Sponsored Ad Banner: Showcase your business advertisement across the city',
      '📲 Install Mobile App (PWA): Install LocoHelp directly on your Android/iOS home screen'
    ],
    whatYouCanPostHi: [
      '📍 लोकेशन सेलेक्टर: पूरे भारत में अपना राज्य, जिला और लोकल एरिया चुनें',
      '💬 सुरक्षित इन-ऐप चैट: बिना नंबर सार्वजनिक किए चैट करें, फोटो और लोकेशन पिन शेयर करें',
      '📢 ऑटो-स्क्रॉलिंग विज्ञापन बैनर: अपने शहर में अपने बिज़नेस का विज्ञापन दिखाएं',
      '📲 मोबाइल ऐप इंस्टॉल (PWA): 1-क्लिक में अपने फोन की होम स्क्रीन पर LocoHelp ऐप इंस्टॉल करें'
    ],
    whatYouCanPostGu: [
      '📍 લોકેશન સિલેક્ટર: સમગ્ર ભારતમાં તમારું રાજ્ય, જિલ્લો અને લોકલ વિસ્તાર પસંદ કરો',
      '💬 સુરક્ષિત ઇન-એપ ચેટ: નંબર જાહેર કર્યા વગર ચેટ કરો, ફોટો અને લોકેશન પિન શેર કરો',
      '📢 ઓટો-સ્ક્રોલિંગ જાહેરાત બેનર: તમારા શહેરમાં તમારા બિઝનેસની જાહેરાત બતાવો',
      '📲 મોબાઈલ એપ ઈન્સ્ટોલ (PWA): 1-ક્લિકમાં તમારા ફોનની હોમ સ્ક્રીન પર LocoHelp એપ ઈન્સ્ટોલ કરો'
    ],
    howItWorksEn: [
      'Use the Global Search Bar (with Voice Search 🎙️) at the top to search Posts, Service Experts, Shops, or Categories instantly.',
      'All public registrations require Email OTP verification and Admin approval to keep the community 100% genuine and spam-free.',
      'Tap "Install App" at the bottom of the Home Screen to install the fast mobile app.'
    ],
    howItWorksHi: [
      'सबसे ऊपर दिए गए ग्लोबल सर्च बार (वॉइस सर्च 🎙️ सहित) से पोस्ट, सर्विस एक्सपर्ट, दुकान या कैटेगरी तुरंत खोजें।',
      'फेक अकाउंट रोकने के लिए पब्लिक रजिस्ट्रेशन में ईमेल OTP और एडमिन अप्रूवल अनिवार्य है।',
      'होम स्क्रीन के नीचे "Install App" बटन दबाकर मोबाइल ऐप सीधे अपने फोन में इंस्टॉल करें।'
    ],
    howItWorksGu: [
      'સૌથી ઉપર આપેલા ગ્લોબલ સર્ચ બાર (વોઈસ સર્ચ 🎙️ સહિત) થી પોસ્ટ, સર્વિસ એક્સપર્ટ, દુકાન કે કેટેગરી તરત જ શોધો.',
      'ફેક એકાઉન્ટ રોકવા માટે પબ્લિક રજિસ્ટ્રેશનમાં ઈમેલ OTP અને એડમિન અપ્રૂવલ ફરજિયાત છે.',
      'હોમ સ્ક્રીનની નીચે "એપ ઈન્સ્ટોલ કરો" બટન દબાવીને મોબાઈલ એપ સીધી તમારા ફોનમાં ઈન્સ્ટોલ કરો.'
    ]
  }
];
