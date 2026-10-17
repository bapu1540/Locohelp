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
    badge: 'Urgent Alert',
    titleEn: '1. Broadcast Need (Instant Radar Alert)',
    titleHi: '1. ब्रॉडकास्ट - तुरंत मदद पोस्ट करें',
    shortDescEn: 'Post urgent local needs: Plumber, Electrician, Mechanics, Emergency...',
    shortDescHi: 'इमरजेंसी जरूरतें पोस्ट करें: प्लंबर, इलेक्ट्रिशियन, मैकेनिक, गाड़ी पंचर...',
    whatYouCanPostEn: [
      '🔧 "Bathroom pipe burst - Plumber needed immediately"',
      '⚡ "Light circuit tripping - Electrician needed in 10 mins"',
      '🚗 "Car/Bike puncture on main road - Mechanic assistance"',
      '🏏 "Need 2 players for evening box cricket match"',
      '💊 "Emergency medicine delivery or patient assist helper"'
    ],
    whatYouCanPostHi: [
      '🔧 "बाथरूम का पाइप लीक हो रहा है - तुरंत प्लंबर चाहिए"',
      '⚡ "घर की लाइट ट्रिप हो रही है - इलेक्ट्रीशियन चाहिए"',
      '🚗 "मेन रोड पर गाड़ी पंचर हो गई - मैकेनिक मदद चाहिए"',
      '🏏 "शाम को क्रिकेट खेलने के लिए 2 खिलाड़ी चाहिए"',
      '💊 "इमरजेंसी दवा या अस्पताल सहायता के लिए हेल्पर"'
    ],
    howItWorksEn: [
      'Broadcast alert reaches verified helpers within 2.0 km radius on GPS radar.',
      '1-Click preset templates available so you don\'t even need to type!',
      'Broadcast auto-expires in 2 hours to prevent old spam posts.'
    ],
    howItWorksHi: [
      'आपकी पोस्ट 2 km के दायरे में सभी सत्यापित हेल्पर्स को तुरंत अलर्ट भेजती है।',
      '1-क्लिक रेडीमेड टेम्पलेट्स उपलब्ध हैं - बिना टाइप किए तुरंत पोस्ट करें!',
      'पुराने मैसेज हटाने के लिए पोस्ट 2 घंटे में ऑटो-एक्स्पायर हो जाती है।'
    ]
  },
  {
    id: 'directory',
    icon: '🏪',
    badge: 'Shops & Malls',
    titleEn: '2. Business, Shops & Venue Directory',
    titleHi: '2. दुकान, शोरूम व मॉल डायरेक्टरी',
    shortDescEn: 'List or find verified shops, showrooms, malls & local offers...',
    shortDescHi: 'सत्यापित दुकानें, शोरूम, मॉल और डिस्काउंट ऑफर्स देखें...',
    whatYouCanPostEn: [
      '🏪 Register your shop / showroom for 100% Free (Electronics, Fashion, Bakery...)',
      '🏬 Shopping Malls, Commercial Complexes & SuperMarts listing',
      '⚙️ Service Centers, Garages & Repair Workshops',
      '🏷️ Post daily festival discount deals (e.g. "Flat 30% OFF on Mobiles")'
    ],
    whatYouCanPostHi: [
      '🏪 100% फ्री में अपनी दुकान या शोरूम दर्ज करें (इलेक्ट्रॉनिक्स, कपड़े, बेकरी...)',
      '🏬 शॉपिंग मॉल, कॉम्प्लेक्स और सुपरमार्ट की डायरेक्टरी',
      '⚙️ सर्विस सेंटर, गैरेज और रिपेयर वर्कशॉप्स',
      '🏷️ अपने रोजाना डिस्काउंट ऑफर्स पोस्ट करें (जैसे: "मोबाइल रिपेयर पर 30% छूट")'
    ],
    howItWorksEn: [
      'Customers can browse shop photos, addresses, and daily discount offers.',
      'Direct 1-click in-app chat button lets customers inquire with shop owners instantly.',
      'No third-party commission charged on any business sales.'
    ],
    howItWorksHi: [
      'ग्राहक दुकान की फोटो, पता और दैनिक डिस्काउंट ऑफर आसानी से देख सकते हैं।',
      '1-क्लिक इन-ऐप चैट बटन से ग्राहक सीधे दुकानदार से बात कर सकते हैं।',
      'किसी भी बिज़नेस या बिक्री पर कोई कमीशन नहीं लिया जाता।'
    ]
  },
  {
    id: 'helpers',
    icon: '🛠️',
    badge: 'Free Worker Profile',
    titleEn: '3. Free Worker & Service Profile',
    titleHi: '3. फ्री वर्कर व हेल्पर्स प्रोफाइल',
    shortDescEn: 'Plumbers, electricians, tutors, mechanics - build free profile...',
    shortDescHi: 'प्लंबर, इलेक्ट्रिशियन, मैकेनिक - बिना कमीशन फ्री प्रोफाइल बनाएं...',
    whatYouCanPostEn: [
      '🛠️ Register as Plumber, Electrician, Carpenter, Painter, Mason, AC Technician',
      '🛵 Vehicle Puncture Mechanic, Towing & Auto Care',
      '🎓 Home Tutor, Music Teacher, Fitness Trainer',
      '🧹 Housekeeping, Maid, Parcel Delivery Helper'
    ],
    whatYouCanPostHi: [
      '🛠️ प्लंबर, इलेक्ट्रिशियन, कारपेंटर, पेंटर, मिस्त्री, AC तकनीशियन प्रोफाइल',
      '🛵 गाड़ी पंचर मैकेनिक, टोइंग व ऑटोकेयर वर्कशॉप',
      '🎓 होम ट्यूटर, कोचिंग शिक्षक, जिम ट्रेनर',
      '🧹 हाउसकीपिंग, मेड, पार्सल डिलीवरी हेल्पर'
    ],
    howItWorksEn: [
      'Zero registration fee and zero commission on your hard-earned income.',
      'Get direct task requests from neighbors living near your area.',
      'Earn Verified Member badge and 5-star customer ratings.'
    ],
    howItWorksHi: [
      'आपकी मेहनत की कमाई पर 0% कमीशन और ₹0 रजिस्ट्रेशन फीस।',
      'अपने पड़ोस और क्षेत्र के ग्राहकों से सीधे काम पाएं।',
      'सत्यापित मेम्बर बैज और 5-स्टार रेटिंग हासिल करें।'
    ]
  },
  {
    id: 'chat',
    icon: '💬',
    badge: 'Secure Chat',
    titleEn: '4. In-App Secure Chat & Live GPS Tracking',
    titleHi: '4. सुरक्षित इन-ऐप चैट व लाइव लोकेशन',
    shortDescEn: 'Chat privately without sharing phone numbers & track arrival...',
    shortDescHi: 'बिना मोबाइल नंबर शेयर किए सुरक्षित चैट करें और लोकेशन ट्रैक करें...',
    whatYouCanPostEn: [
      '💬 Private 1-on-1 text chat inside the website screen',
      '📷 Attach photos of broken pipes, electrical meters or item receipts',
      '📍 Share 1-click live GPS location pin',
      '🗺️ Visual radar map tracker to see helper arrival distance'
    ],
    whatYouCanPostHi: [
      '💬 वेबसाइट स्क्रीन के अंदर 1-ऑन-1 प्राइवेट मैसेजिंग',
      '📷 टूटे पाइप, मीटर या रसीद की फोटो अटैच करें',
      '📍 1-क्लिक में अपनी लाइव लोकेशन पिन शेयर करें',
      '🗺️ विजुअल रडार मैप पर हेल्पर की दूरी लाइव ट्रैक करें'
    ],
    howItWorksEn: [
      'Complete privacy: Phone numbers remain protected until you choose to share.',
      'Task complete rating dialog allows giving 1-5 star reviews.',
      '1-click instant chat deletion clears messages safely from device.'
    ],
    howItWorksHi: [
      'पूरी प्राइवेसी: आपका मोबाइल नंबर तब तक सुरक्षित रहता है जब तक आप शेयर न करें।',
      'काम खत्म होने पर 1-5 स्टार रेटिंग देने की सुविधा।',
      '1-क्लिक में चैट डिलीट करके डिवाइस से मैसेज हटाएं।'
    ]
  },
  {
    id: 'karma',
    icon: '🏆',
    badge: 'Trust Score',
    titleEn: '5. Karma Points & Verified Trust Score',
    titleHi: '5. कर्म पॉइंट्स व सत्यापन स्कोर',
    shortDescEn: 'Earn +10 Karma points on every completed help & build trust...',
    shortDescHi: 'मदद करने पर +10 कर्म पॉइंट्स कमाएं व ट्रस्ट स्कोर बनाएं...',
    whatYouCanPostEn: [
      '🌟 Earn +10 Karma points for every successfully completed help',
      '🛡️ Verified Community Member badge',
      '🔥 Community leaderboard badge for top local helpers',
      '🔒 Backend audit preservation for police and safety compliance'
    ],
    whatYouCanPostHi: [
      '🌟 हर सफल मदद पूरी करने पर +10 कर्म पॉइंट्स हासिल करें',
      '🛡️ सत्यापित कम्युनिटी मेंबर का ट्रस्ट बैज',
      '🔥 एरिया के टॉप हेल्पर्स लीडरबोर्ड में नाम',
      '🔒 सुरक्षा और पुलिस वेरिफिकेशन के लिए बैकएंड ऑडिट प्रिजर्वेशन'
    ],
    howItWorksEn: [
      'Higher karma points make your profile rank on top in local search.',
      'Encourages genuine neighborly helping without spam or fake accounts.',
      'Safety and legal audit log keeps community 100% safe.'
    ],
    howItWorksHi: [
      'ज्यादा कर्म पॉइंट्स से आपकी प्रोफाइल सर्च में सबसे ऊपर दिखेगी।',
      'बिना किसी स्पैम के असली पड़ोसियों को जोड़ने में मदद करता है।',
      'सुरक्षा ऑडिट लॉग से पूरा प्लेटफार्म 100% सेफ रहता है।'
    ]
  }
];
