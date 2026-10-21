export interface FeatureBannerDetail {
  id: string;
  icon: string;
  badge: string;
  titleEn: string;
  titleHi: string;
  shortDescEn: string;
  shortDescHi: string;
  whatYouCanPostEn: string[];
  whatYouCanPostHi: string[];
  howItWorksEn: string[];
  howItWorksHi: string[];
}

export const FEATURE_BANNERS: FeatureBannerDetail[] = [
  {
    id: 'broadcast',
    icon: '⚡',
    badge: '1-Hour Live Feed',
    titleEn: '1. Post / Broadcast Urgent Need (1-Hour Live)',
    titleHi: '1. पोस्ट / ब्रॉडकास्ट — तुरंत जरूरत पोस्ट करें',
    shortDescEn: 'Post urgent local needs: Plumber, Electrician, Mechanic, Emergency, Sports...',
    shortDescHi: 'इमरजेंसी जरूरतें पोस्ट करें: प्लंबर, इलेक्ट्रीशियन, मैकेनिक, ब्लड डोनर, क्रिकेट...',
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
    howItWorksEn: [
      'Use 1-Click Need Templates or Voice Search to post your requirement in seconds.',
      'Your post goes live immediately in "Active Nearby" for your selected District & Area.',
      'Post owners can check all replies in "Responses / Chats", share on WhatsApp, and posts auto-delete after 1 hour to keep the feed fresh.'
    ],
    howItWorksHi: [
      '1-क्लिक रेडीमेड टेम्पलेट्स या वॉइस सर्च का उपयोग करके सेकंडों में अपनी जरूरत पोस्ट करें।',
      'आपकी पोस्ट आपके चुने हुए जिले और एरिया के "आस-पास की लाइव पोस्ट्स" में तुरंत लाइव हो जाती है।',
      'पोस्ट करने वाले "प्राप्त जवाब देखें (Inbox)" में सभी चैट देख सकते हैं और पोस्ट 1 घंटे बाद अपने-आप हट जाती है।'
    ]
  },
  {
    id: 'experts',
    icon: '🛠️',
    badge: 'Service Experts',
    titleEn: '2. Browse Service Experts & Professionals',
    titleHi: '2. ब्राउज़ सर्विस एक्सपर्ट्स (कुशल प्रोफेशनल्स)',
    shortDescEn: 'Find verified Plumbers, Electricians, Mechanics, Tutors & register your profile...',
    shortDescHi: 'वेरिफाइड प्लंबर, इलेक्ट्रीशियन, मैकेनिक, ट्यूटर खोजें या अपनी प्रोफाइल बनाएं...',
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
    howItWorksEn: [
      'Click "Browse Service Experts" on the home screen and choose any service category.',
      'Search experts by City, Village, or Area and chat directly on the website.',
      'Skilled professionals can click "+ Create Profile" to upload their skills, experience, and work photo (published after Admin approval).'
    ],
    howItWorksHi: [
      'होम स्क्रीन पर "ब्राउज़ सर्विस एक्सपर्ट्स" पर टैप करें और अपनी जरूरत की कैटेगरी चुनें।',
      'शहर, गांव या इलाके के नाम से एक्सपर्ट्स खोजें और सीधे वेबसाइट पर चैट करें।',
      'कुशल प्रोफेशनल्स "+ प्रोफाइल बनाएं" पर क्लिक करके अपना अनुभव और काम की फोटो जोड़ सकते हैं (एडमिन अप्रूवल के बाद लाइव)।'
    ]
  },
  {
    id: 'directory',
    icon: '🏪',
    badge: 'Shops & Businesses',
    titleEn: '3. Business & Shop Register Directory',
    titleHi: '3. दुकान व बिज़नेस रजिस्टर डायरेक्टरी',
    shortDescEn: 'Browse or register local shops, showrooms, hospitals, restaurants & venues...',
    shortDescHi: 'स्थानीय दुकानें, शोरूम, अस्पताल, रेस्टोरेंट देखें या अपना बिज़नेस रजिस्टर करें...',
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
    howItWorksEn: [
      'Business owners can register with Shop Name, Category, Owner Name, Timings, Address, WhatsApp Number, and up to 3 Shop Photos.',
      'Every registration goes to Admin for verification before going live in the public directory.',
      'Customers can browse shop photos, timings, and connect with owners on WhatsApp in 1 click.'
    ],
    howItWorksHi: [
      'दुकानदार अपनी दुकान का नाम, कैटेगरी, मालिक का नाम, खुलने का समय, पता, व्हाट्सएप नंबर और 2-3 फोटो अपलोड करके रजिस्टर कर सकते हैं।',
      'हर रजिस्ट्रेशन पब्लिक डायरेक्टरी में लाइव होने से पहले एडमिन अप्रूवल के लिए जाता है।',
      'ग्राहक दुकान की फोटो, समय और पता देखकर 1-क्लिक में व्हाट्सएप पर संपर्क कर सकते हैं।'
    ]
  },
  {
    id: 'jobs',
    icon: '💼',
    badge: 'Local Job Portal',
    titleEn: '4. Job Seekers & Employers (Hire Staff)',
    titleHi: '4. लोकल जॉब पोर्टल — नौकरी पाएं या स्टाफ रखें',
    shortDescEn: 'Register as a Job Seeker with Resume/Biodata or post vacancies as an Employer...',
    shortDescHi: 'रिज्यूमे के साथ जॉब के लिए रजिस्टर करें या अपनी दुकान/कंपनी के लिए स्टाफ हायर करें...',
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
    howItWorksEn: [
      'Two dedicated cards on the Home Page: "Job / Work Registration" (for Job Seekers) and "For Employer / Give a Job" (for Job Givers).',
      'All candidate profiles and employer job postings are verified by Admin before going live.',
      'Employers and job seekers can connect directly via WhatsApp or Call once approved.'
    ],
    howItWorksHi: [
      'होम पेज पर दो अलग कार्ड हैं: "जॉब / काम का रजिस्ट्रेशन" (काम चाहने वालों के लिए) और "नौकरी / काम देने वाले (Employer)"।',
      'सभी उम्मीदवार प्रोफाइल और जॉब वेकेंसी एडमिन सत्यापन के बाद ही पब्लिक पोर्टल पर लाइव होती हैं।',
      'अप्रूव होने के बाद एम्प्लॉयर और उम्मीदवार सीधे संपर्क कर सकते हैं।'
    ]
  },
  {
    id: 'chat_location',
    icon: '📍',
    badge: 'Pan-India & Chat',
    titleEn: '5. Pan-India Location, Ads & Private Chat',
    titleHi: '5. पैन-इंडिया लोकेशन, विज्ञापन और सुरक्षित चैट',
    shortDescEn: 'Select any State/District in India, chat privately, orinstall the Mobile App...',
    shortDescHi: 'भारत का कोई भी राज्य/जिला चुनें, सुरक्षित चैट करें और मोबाइल ऐप इंस्टॉल करें...',
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
    howItWorksEn: [
      'Use the Global Search Bar (with Voice Search 🎙️) at the top to search Posts, Service Experts, Shops, or Categories instantly.',
      'All public registrations require Email OTP verification and Admin approval to keep the community 100% genuine and spam-free.',
      'Tap "Install App" at the bottom of the Home Screen to install the fast mobile app.'
    ],
    howItWorksHi: [
      'सबसे ऊपर दिए गए ग्लोबल सर्च बार (वॉइस सर्च 🎙️ सहित) से पोस्ट, सर्विस एक्सपर्ट, दुकान या कैटेगरी तुरंत खोजें।',
      'फेक अकाउंट रोकने के लिए पब्लिक रजिस्ट्रेशन में ईमेल OTP और एडमिन अप्रूवल अनिवार्य है।',
      'होम स्क्रीन के नीचे "Install App" बटन दबाकर मोबाइल ऐप सीधे अपने फोन में इंस्टॉल करें।'
    ]
  }
];
