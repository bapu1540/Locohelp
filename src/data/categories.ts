import { Language } from '../types';

export type MasterCategoryId =
  | 'all'
  | 'home_repair'
  | 'personal_events'
  | 'it_tech'
  | 'business_staff'
  | 'brokers_agents'
  | 'vehicle_transport'
  | 'education_classes'
  | 'sports_fitness'
  | 'social_care'
  | 'other_custom'
  // Legacy master category IDs preserved for backward compatibility
  | 'utility_emergency'
  | 'social_casual'
  | 'daily_errands';

export interface MasterCategory {
  id: MasterCategoryId;
  emoji: string;
  nameEn: string;
  nameHi: string;
  nameGu: string;
  nameMr?: string;
  nameBn?: string;
  nameTa?: string;
  nameTe?: string;
  nameKn?: string;
  namePa?: string;
  nameMl?: string;
  iconName: string;
  color: string;
  subtitleEn: string;
  subtitleHi: string;
  subtitleGu: string;
}

export const MASTER_CATEGORIES: MasterCategory[] = [
  {
    id: 'home_repair',
    emoji: '🏠',
    nameEn: 'Home & Repair Services',
    nameHi: 'घर और रिपेयर सर्विस',
    nameGu: 'ઘર અને રિપેરિંગ સેવાઓ',
    iconName: 'Home',
    color: 'emerald',
    subtitleEn: 'Plumber, Electrician, AC & Fridge, Carpenter, Painter, Cleaning, Pest Control',
    subtitleHi: 'प्लंबर, इलेक्ट्रीशियन, एसी व फ्रिज, कारपेंटर, पेंटर, सफाई, पेस्ट कंट्रोल',
    subtitleGu: 'પ્લમ્બર, ઇલેક્ટ્રિશિયન, એસી અને ફ્રિજ, સુથાર, પેઇન્ટર, સફાઈ, પેસ્ટ કંટ્રોલ',
  },
  {
    id: 'personal_events',
    emoji: '✂️',
    nameEn: 'Personal Care, Fashion & Events',
    nameHi: 'पर्सनल केयर, दर्जी और इवेंट',
    nameGu: 'પર્સનલ કેર, દરજી અને ઇવેન્ટ',
    iconName: 'Scissors',
    color: 'pink',
    subtitleEn: 'Tailor, Beautician, Mehendi, Pandit Ji, Photographer, Catering & Halwai',
    subtitleHi: 'दर्जी/बुटीक, ब्यूटीशियन, मेहंदी, पंडित जी, फोटोग्राफर, कैटरिंग व हलवाई',
    subtitleGu: 'દરજી/બુટિક, બ્યુટિશિયન, મહેંદી, પંડિતજી, ફોટોગ્રાફર, કેટરિંગ અને હલવાઈ',
  },
  {
    id: 'it_tech',
    emoji: '💻',
    nameEn: 'IT, Tech & Digital Experts',
    nameHi: 'कंप्यूटर, आईटी और डिजिटल एक्सपर्ट',
    nameGu: 'કમ્પ્યુટર, આઈટી અને ડિજિટલ એક્સપર્ટ',
    iconName: 'Code',
    color: 'indigo',
    subtitleEn: 'Web & App Developer, Laptop Repair, CCTV & Wi-Fi, Graphic Design, Mobile Repair',
    subtitleHi: 'वेब/ऐप डेवलपर, कंप्यूटर रिपेयर, CCTV व वाई-फाई, ग्राफिक डिजाइन, मोबाइल रिपेयर',
    subtitleGu: 'વેબ/એપ ડેવલપર, કમ્પ્યુટર રિપેર, CCTV અને વાઈ-ફાઈ, ગ્રાફિક ડિઝાઇન, મોબાઇલ રિપેર',
  },
  {
    id: 'business_staff',
    emoji: '💼',
    nameEn: 'Business, Sales & Staff',
    nameHi: 'बिजनेस, सेल्स और स्टाफ',
    nameGu: 'બિઝનેસ, સેલ્સ અને સ્ટાફ',
    iconName: 'Briefcase',
    color: 'blue',
    subtitleEn: 'Salesman, Shop Helper, Accountant & GST, Data Entry, Security Guard, Telecaller',
    subtitleHi: 'सेल्समेन, दुकान हेल्पर, अकाउंटेंट व GST, डाटा एंट्री, सिक्योरिटी गार्ड, टेलीकॉलर',
    subtitleGu: 'સેલ્સમેન, દુકાન હેલ્પર, એકાઉન્ટન્ટ અને GST, ડેટા એન્ટ્રી, સિક્યુરિટી ગાર્ડ, ટેલીકોલર',
  },
  {
    id: 'brokers_agents',
    emoji: '🏢',
    nameEn: 'Brokers, Agents & Consultants',
    nameHi: 'ब्रोकर, एजेंट और सलाहकार',
    nameGu: 'બ્રોકર, એજન્ટ અને સલાહકાર',
    iconName: 'Building2',
    color: 'cyan',
    subtitleEn: 'Real Estate Broker, Vehicle Agent, RTO & License, Loan & Insurance, Legal Help',
    subtitleHi: 'प्रॉपर्टी ब्रोकर, गाड़ी एजेंट, RTO व लाइसेंस, लोन व बीमा एजेंट, कानूनी दस्तावेज',
    subtitleGu: 'પ્રોપર્ટી બ્રોકર, વાહન એજન્ટ, RTO અને લાઇસન્સ, લોન અને વીમા એજન્ટ, કાનૂની દસ્તાવેજ',
  },
  {
    id: 'vehicle_transport',
    emoji: '🚗',
    nameEn: 'Vehicle, Transport & Delivery',
    nameHi: 'गाड़ी, ट्रांसपोर्ट और डिलीवरी',
    nameGu: 'વાહન, ટ્રાન્સપોર્ટ અને ડિલિવરી',
    iconName: 'Car',
    color: 'orange',
    subtitleEn: 'Mechanic & Puncture, Cab/Auto Driver, Tempo & Packers/Movers, Local Delivery',
    subtitleHi: 'मैकेनिक व पंक्चर, कैब/ऑटो ड्राइवर, टेम्पो व पैकर्स-मूवर्स, लोकल डिलीवरी',
    subtitleGu: 'મિકેનિક અને પંચર, કેબ/ઓટો ડ્રાઇવર, ટેમ્પો અને પેકર્સ-મૂવર્સ, લોકલ ડિલિવરી',
  },
  {
    id: 'education_classes',
    emoji: '📚',
    nameEn: 'Education & Skill Classes',
    nameHi: 'शिक्षा और कोचिंग क्लासेस',
    nameGu: 'શિક્ષણ અને કોચિંગ ક્લાસીસ',
    iconName: 'GraduationCap',
    color: 'violet',
    subtitleEn: 'Tuition Teacher, Study & Project Help, Computer/Spoken English, Music & Art',
    subtitleHi: 'ट्यूशन टीचर, प्रोजेक्ट व पढ़ाई मदद, कंप्यूटर व स्पोकन इंग्लिश, संगीत व कला',
    subtitleGu: 'ટ્યુશન ટીચર, પ્રોજેક્ટ અને અભ્યાસ મદદ, કમ્પ્યુટર અને સ્પોકન ઇંગ્લિશ, સંગીત અને કળા',
  },
  {
    id: 'sports_fitness',
    emoji: '🏸',
    nameEn: 'Sports & Fitness Partners',
    nameHi: 'स्पोर्ट्स और फिटनेस साथी',
    nameGu: 'સ્પોર્ટ્સ અને ફિટનેસ સાથી',
    iconName: 'Trophy',
    color: 'amber',
    subtitleEn: 'Cricket Partner & Team, Badminton & Tennis, Gym Buddy, Running & Yoga Partner',
    subtitleHi: 'क्रिकेट साथी व टीम, बैडमिंटन व टेनिस, जिम पार्टनर, रनिंग व योगा साथी',
    subtitleGu: 'ક્રિકેટ સાથી અને ટીમ, બેડમિન્ટન અને ટેનિસ, જિમ પાર્ટનર, રનિંગ અને યોગા સાથી',
  },
  {
    id: 'social_care',
    emoji: '☕',
    nameEn: 'Social, Lifestyle & Care',
    nameHi: 'सोशल, लाइफस्टाइल और देखभाल',
    nameGu: 'સોશિયલ, લાઈફસ્ટાઈલ અને સંભાળ',
    iconName: 'Coffee',
    color: 'rose',
    subtitleEn: 'Tea-Coffee Meetup, Evening Walk Partner, Chess & Board Games, Elder & Pet Care',
    subtitleHi: 'चाय-कॉफी मीटअप, शाम की वॉक, शतरंज व बोर्ड गेम्स, बुजुर्ग सेवा, पेट वॉक',
    subtitleGu: 'ચા-કોફી મુલાકાત, સાંજની વોક, ચેસ અને બોર્ડ ગેમ્સ, વડીલોની સેવા, પેટ વોક',
  },
  {
    id: 'other_custom',
    emoji: '✨',
    nameEn: 'Other / Custom Category',
    nameHi: 'अन्य / कस्टम श्रेणी',
    nameGu: 'અન્ય / કસ્ટમ કેટેગરી',
    iconName: 'Sparkles',
    color: 'teal',
    subtitleEn: 'Any other local skill, custom service, shop, or community requirement',
    subtitleHi: 'कोई भी अन्य लोकल हुनर, कस्टम सेवा, दुकान या जरूरत',
    subtitleGu: 'કોઈપણ અન્ય લોકલ હુનર, કસ્ટમ સેવા, દુકાન અથવા જરૂરિયાત',
  },
];

export const MAIN_CATEGORIES = MASTER_CATEGORIES;

export interface CategoryItem {
  id: string;
  masterCategory: MasterCategoryId;
  nameEn: string;
  nameHi: string;
  nameGu: string;
  nameMr?: string;
  nameBn?: string;
  nameTa?: string;
  nameTe?: string;
  nameKn?: string;
  namePa?: string;
  nameMl?: string;
  iconName: string;
  tag: string;
  description: string;
  helperCount: number;
}

export const CATEGORIES: CategoryItem[] = [
  // ==========================================
  // 1. 🏠 Home & Repair Services (home_repair)
  // ==========================================
  {
    id: 'plumber',
    masterCategory: 'home_repair',
    nameEn: 'Plumber',
    nameHi: 'प्लंबर (नल और पाइप रिपेयर)',
    nameGu: 'પ્લમ્બર (નળ અને પાઇપ રિપેર)',
    iconName: 'Wrench',
    tag: '#Plumber',
    description: 'Tap leak, pipe fitting, tank & bathroom repair',
    helperCount: 0,
  },
  {
    id: 'electrician',
    masterCategory: 'home_repair',
    nameEn: 'Electrician',
    nameHi: 'इलेक्ट्रीशियन (बिजली रिपेयर)',
    nameGu: 'ઇલેક્ટ્રિશિયન (વીજળી રિપેર)',
    iconName: 'Zap',
    tag: '#Electrician',
    description: 'Fan, switchboard, inverter, wiring & fuse repair',
    helperCount: 0,
  },
  {
    id: 'ac_repair',
    masterCategory: 'home_repair',
    nameEn: 'AC, Fridge & RO Repair',
    nameHi: 'AC, फ्रिज और RO रिपेयर',
    nameGu: 'AC, ફ્રિજ અને RO રિપેર',
    iconName: 'Fan',
    tag: '#ACRepair',
    description: 'AC service, gas filling, fridge, washing machine & RO repair',
    helperCount: 0,
  },
  {
    id: 'carpenter',
    masterCategory: 'home_repair',
    nameEn: 'Carpenter / Suthar',
    nameHi: 'कारपेंटर / सुथार (फर्नीचर)',
    nameGu: 'સુથાર / કાર્પેન્ટર (ફર્નિચર)',
    iconName: 'Hammer',
    tag: '#Carpenter',
    description: 'Door lock, bed, cupboard, modular kitchen & wood work',
    helperCount: 0,
  },
  {
    id: 'painter',
    masterCategory: 'home_repair',
    nameEn: 'Painter',
    nameHi: 'पेंटर (रंग-रोगन / POP)',
    nameGu: 'પેઇન્ટર (રંગકામ / POP)',
    iconName: 'Paintbrush',
    tag: '#Painter',
    description: 'Home painting, wall putty, POP, waterproofing & polish',
    helperCount: 0,
  },
  {
    id: 'mason',
    masterCategory: 'home_repair',
    nameEn: 'Mason / Kadiyo',
    nameHi: 'कड़िया / मिस्त्री (सिविल काम)',
    nameGu: 'કડિયો / મિસ્ત્રી (બાંધકામ)',
    iconName: 'HardHat',
    tag: '#Mason',
    description: 'Brickwork, plaster, floor tiles, marble & civil repair',
    helperCount: 0,
  },
  {
    id: 'cleaning',
    masterCategory: 'home_repair',
    nameEn: 'Cleaning, Maid & Cook',
    nameHi: 'घर की सफाई, मेड और रसोइया',
    nameGu: 'ઘરની સફાઈ, કામવાળા અને રસોઈયા',
    iconName: 'Sparkles',
    tag: '#Cleaning',
    description: 'House cleaning, daily maid, cooking help & deep cleaning',
    helperCount: 0,
  },
  {
    id: 'pest_control',
    masterCategory: 'home_repair',
    nameEn: 'Pest Control & Tank Cleaning',
    nameHi: 'पेस्ट कंट्रोल और पानी टंकी सफाई',
    nameGu: 'પેસ્ટ કંટ્રોલ અને પાણીની ટાંકી સફાઈ',
    iconName: 'Bug',
    tag: '#PestControl',
    description: 'Termite, cockroach control, sanitization & water tank cleaning',
    helperCount: 0,
  },

  // ==========================================
  // 2. ✂️ Personal Care, Fashion & Events (personal_events)
  // ==========================================
  {
    id: 'tailor',
    masterCategory: 'personal_events',
    nameEn: 'Tailor / Darzi & Boutique',
    nameHi: 'दर्जी / टेलर और बुटीक',
    nameGu: 'દરજી / ટેલર અને બુટિક',
    iconName: 'Scissors',
    tag: '#Tailor',
    description: 'Ladies & gents stitching, blouse, suit, alteration & boutique',
    helperCount: 0,
  },
  {
    id: 'beautician',
    masterCategory: 'personal_events',
    nameEn: 'Beautician & Salon at Home',
    nameHi: 'ब्यूटीशियन और होम सैलून',
    nameGu: 'બ્યુટિશિયન અને હોમ સલૂન',
    iconName: 'Sparkles',
    tag: '#Beautician',
    description: 'Bridal makeup, facial, waxing, hair styling & parlour services',
    helperCount: 0,
  },
  {
    id: 'mehendi',
    masterCategory: 'personal_events',
    nameEn: 'Mehendi Artist',
    nameHi: 'मेहंदी आर्टिस्ट',
    nameGu: 'મહેંદી આર્ટિસ્ટ',
    iconName: 'Palette',
    tag: '#MehendiArtist',
    description: 'Bridal mehendi, festival mehendi & custom henna designs',
    helperCount: 0,
  },
  {
    id: 'pandit_pooja',
    masterCategory: 'personal_events',
    nameEn: 'Pandit Ji / Pooja Path',
    nameHi: 'पंडित जी / पूजा-पाठ और ज्योतिष',
    nameGu: 'પંડિતજી / પૂજા-પાઠ અને જ્યોતિષ',
    iconName: 'Flame',
    tag: '#PanditJi',
    description: 'Griha pravesh, satyanarayan katha, havan, marriage & kundali',
    helperCount: 0,
  },
  {
    id: 'photographer',
    masterCategory: 'personal_events',
    nameEn: 'Photographer & Videographer',
    nameHi: 'फोटोग्राफर और वीडियोग्राफर',
    nameGu: 'ફોટોગ્રાફર અને વીડિયોગ્રાફર',
    iconName: 'Camera',
    tag: '#Photographer',
    description: 'Wedding, birthday, pre-wedding, event shoot & drone video',
    helperCount: 0,
  },
  {
    id: 'catering_event',
    masterCategory: 'personal_events',
    nameEn: 'Catering, Halwai & Event Helper',
    nameHi: 'कैटरिंग, हलवाई और इवेंट हेल्पर',
    nameGu: 'કેટરિંગ, હલવાઈ અને ઇવેન્ટ હેલ્પર',
    iconName: 'Utensils',
    tag: '#Catering',
    description: 'Party catering, halwai, tiffin service, mandap & event staff',
    helperCount: 0,
  },

  // ==========================================
  // 3. 💻 IT, Tech & Digital Experts (it_tech)
  // ==========================================
  {
    id: 'web_developer',
    masterCategory: 'it_tech',
    nameEn: 'Web Developer',
    nameHi: 'वेब डेवलपर (वेबसाइट बनाना)',
    nameGu: 'વેબ ડેવલપર (વેબસાઇટ બનાવવી)',
    iconName: 'Globe',
    tag: '#WebDeveloper',
    description: 'Business websites, e-commerce stores, WordPress & full-stack web',
    helperCount: 0,
  },
  {
    id: 'app_developer',
    masterCategory: 'it_tech',
    nameEn: 'App Developer',
    nameHi: 'ऐप डेवलपर (मोबाइल ऐप)',
    nameGu: 'એપ ડેવલપર (મોબાઇલ એપ)',
    iconName: 'Smartphone',
    tag: '#AppDeveloper',
    description: 'Android, iOS, Flutter & custom mobile application development',
    helperCount: 0,
  },
  {
    id: 'computer_laptop',
    masterCategory: 'it_tech',
    nameEn: 'Computer & Laptop Expert',
    nameHi: 'कंप्यूटर और लैपटॉप रिपेयर एक्सपर्ट',
    nameGu: 'કમ્પ્યુટર અને લેપટોપ રિપેર એક્સપર્ટ',
    iconName: 'Monitor',
    tag: '#ComputerRepair',
    description: 'Windows installation, laptop repair, printer setup & data recovery',
    helperCount: 0,
  },
  {
    id: 'cctv_wifi',
    masterCategory: 'it_tech',
    nameEn: 'CCTV & Wi-Fi Technician',
    nameHi: 'CCTV कैमरा और वाई-फाई टेक्नीशियन',
    nameGu: 'CCTV કેમેરા અને વાઈ-ફાઈ ટેકનિશિયન',
    iconName: 'Wifi',
    tag: '#CCTVWifi',
    description: 'CCTV camera installation, DVR setup, Wi-Fi router & networking',
    helperCount: 0,
  },
  {
    id: 'graphic_video',
    masterCategory: 'it_tech',
    nameEn: 'Graphic Designer & Video Editor',
    nameHi: 'ग्राफिक डिजाइनर और वीडियो एडिटर',
    nameGu: 'ગ્રાફિક ડિઝાઇનર અને વીડિયો એડિટર',
    iconName: 'Palette',
    tag: '#GraphicDesign',
    description: 'Logo, banner, visiting card, reels editing & YouTube video editing',
    helperCount: 0,
  },
  {
    id: 'digital_marketing',
    masterCategory: 'it_tech',
    nameEn: 'Digital Marketing & Social Media',
    nameHi: 'डिजिटल मार्केटिंग और सोशल मीडिया',
    nameGu: 'ડિજિટલ માર્કેટિંગ અને સોશિયલ મીડિયા',
    iconName: 'Megaphone',
    tag: '#DigitalMarketing',
    description: 'Instagram/Facebook ads, Google Business profile, SEO & promotions',
    helperCount: 0,
  },
  {
    id: 'mobile_repair',
    masterCategory: 'it_tech',
    nameEn: 'Mobile Repair Technician',
    nameHi: 'मोबाइल रिपेयर टेक्नीशियन',
    nameGu: 'મોબાઇલ રિપેર ટેકનિશિયન',
    iconName: 'Smartphone',
    tag: '#MobileRepair',
    description: 'Screen replacement, battery, charging jack & mobile software',
    helperCount: 0,
  },

  // ==========================================
  // 4. 💼 Business, Sales & Staff (business_staff)
  // ==========================================
  {
    id: 'sales_staff',
    masterCategory: 'business_staff',
    nameEn: 'Salesman / Salesgirl',
    nameHi: 'सेल्समेन / सेल्सगर्ल (दुकान व फील्ड)',
    nameGu: 'સેલ્સમેન / સેલ્સગર્લ (દુકાન અને ફિલ્ડ)',
    iconName: 'ShoppingBag',
    tag: '#SalesStaff',
    description: 'Showroom sales, retail counter staff, field sales & marketing',
    helperCount: 0,
  },
  {
    id: 'shop_helper',
    masterCategory: 'business_staff',
    nameEn: 'Shop Helper / Store Staff',
    nameHi: 'दुकान हेल्पर / स्टोर स्टाफ',
    nameGu: 'દુકાન હેલ્પર / સ્ટોર સ્ટાફ',
    iconName: 'Store',
    tag: '#ShopHelper',
    description: 'Kirana, garment, medical or general store helper, packing & stock',
    helperCount: 0,
  },
  {
    id: 'accountant_gst',
    masterCategory: 'business_staff',
    nameEn: 'Accountant & GST/Tax Expert',
    nameHi: 'अकाउंटेंट, टैली और GST/टैक्स एक्सपर्ट',
    nameGu: 'એકાઉન્ટન્ટ, ટેલી અને GST/ટેક્સ એક્સપર્ટ',
    iconName: 'Calculator',
    tag: '#Accountant',
    description: 'Tally accounting, GST return filing, ITR, bookkeeping & billing',
    helperCount: 0,
  },
  {
    id: 'data_entry',
    masterCategory: 'business_staff',
    nameEn: 'Data Entry & Back Office',
    nameHi: 'डाटा एंट्री और कंप्यूटर ऑपरेटर',
    nameGu: 'ડેટા એન્ટ્રી અને કમ્પ્યુટર ઓપરેટર',
    iconName: 'FileSpreadsheet',
    tag: '#DataEntry',
    description: 'MS Excel, Word, typing, billing operator & office administration',
    helperCount: 0,
  },
  {
    id: 'security_guard',
    masterCategory: 'business_staff',
    nameEn: 'Security Guard / Watchman',
    nameHi: 'सिक्योरिटी गार्ड / वॉचमैन',
    nameGu: 'સિક્યુરિટી ગાર્ડ / વોચમેન',
    iconName: 'Shield',
    tag: '#SecurityGuard',
    description: 'Society watchman, shop/factory security guard, day & night duty',
    helperCount: 0,
  },
  {
    id: 'receptionist_telecaller',
    masterCategory: 'business_staff',
    nameEn: 'Receptionist & Telecaller',
    nameHi: 'रिसेप्शनिस्ट और टेलीकॉलर',
    nameGu: 'રિસેપ્શનિસ્ટ અને ટેલીકોલર',
    iconName: 'Headphones',
    tag: '#Receptionist',
    description: 'Front desk receptionist, customer support & telecalling executive',
    helperCount: 0,
  },

  // ==========================================
  // 5. 🏢 Brokers, Agents & Consultants (brokers_agents)
  // ==========================================
  {
    id: 'real_estate_broker',
    masterCategory: 'brokers_agents',
    nameEn: 'Real Estate / Property Broker',
    nameHi: 'प्रॉपर्टी ब्रोकर (मकान, दुकान व फ्लैट)',
    nameGu: 'પ્રોપર્ટી બ્રોકર (મકાન, દુકાન અને ફ્લેટ)',
    iconName: 'Building2',
    tag: '#PropertyBroker',
    description: 'Rent, buy or sell house, flat, PG, shop, office & plot',
    helperCount: 0,
  },
  {
    id: 'vehicle_broker',
    masterCategory: 'brokers_agents',
    nameEn: 'Vehicle Broker / Agent',
    nameHi: 'गाड़ी ब्रोकर (पुरानी कार व बाइक एजेंट)',
    nameGu: 'વાહન બ્રોકર (જૂની કાર અને બાઇક એજન્ટ)',
    iconName: 'Car',
    tag: '#VehicleBroker',
    description: 'Buy & sell second-hand bike, car, commercial vehicle & tractor',
    helperCount: 0,
  },
  {
    id: 'rto_agent',
    masterCategory: 'brokers_agents',
    nameEn: 'RTO & License Agent',
    nameHi: 'RTO और ड्राइविंग लाइसेंस एजेंट',
    nameGu: 'RTO અને ડ્રાઇવિંગ લાઇસન્સ એજન્ટ',
    iconName: 'FileCheck',
    tag: '#RTOAgent',
    description: 'Driving license, RC transfer, vehicle insurance & PUC help',
    helperCount: 0,
  },
  {
    id: 'loan_insurance',
    masterCategory: 'brokers_agents',
    nameEn: 'Loan & Insurance Agent',
    nameHi: 'लोन और बीमा (LIC/इंश्योरेंस) एजेंट',
    nameGu: 'લોન અને વીમા (LIC/ઇન્શ્યોરન્સ) એજન્ટ',
    iconName: 'Landmark',
    tag: '#LoanInsurance',
    description: 'Home loan, personal/business loan, health, life & vehicle insurance',
    helperCount: 0,
  },
  {
    id: 'legal_docs',
    masterCategory: 'brokers_agents',
    nameEn: 'Legal & Documentation Help',
    nameHi: 'कानूनी सलाह, नोटरी और दस्तावेज मदद',
    nameGu: 'કાનૂની સલાહ, નોટરી અને દસ્તાવેજ મદદ',
    iconName: 'Scale',
    tag: '#LegalDocs',
    description: 'Rent agreement, notary, affidavit, PAN/Aadhaar, passport & e-Seva',
    helperCount: 0,
  },

  // ==========================================
  // 6. 🚗 Vehicle, Transport & Delivery (vehicle_transport)
  // ==========================================
  {
    id: 'mechanic',
    masterCategory: 'vehicle_transport',
    nameEn: 'Mechanic & Puncture Repair',
    nameHi: 'मैकेनिक और पंक्चर रिपेयर',
    nameGu: 'મિકેનિક અને પંચર રિપેર',
    iconName: 'Wrench',
    tag: '#Mechanic',
    description: 'Bike/car breakdown, puncture, battery jumpstart & garage service',
    helperCount: 0,
  },
  {
    id: 'cab_auto_driver',
    masterCategory: 'vehicle_transport',
    nameEn: 'Cab, Auto & Private Driver',
    nameHi: 'कैब, ऑटो और प्राइवेट ड्राइवर',
    nameGu: 'કેબ, રિક્ષા અને પ્રાઇવેટ ડ્રાઇવર',
    iconName: 'Car',
    tag: '#CabAuto',
    description: 'Local auto, outstation cab, daily pickup-drop & private car driver',
    helperCount: 0,
  },
  {
    id: 'tempo_packers',
    masterCategory: 'vehicle_transport',
    nameEn: 'Tempo & Packers/Movers',
    nameHi: 'टेम्पो, लोडिंग और पैकर्स-मूवर्स',
    nameGu: 'ટેમ્પો, લોડિંગ અને પેકર્સ-મૂવર્સ',
    iconName: 'Truck',
    tag: '#TempoPackers',
    description: 'Chota Hathi tempo, house shifting, luggage loading & transport',
    helperCount: 0,
  },
  {
    id: 'delivery',
    masterCategory: 'vehicle_transport',
    nameEn: 'Delivery & Errands',
    nameHi: 'लोकल डिलीवरी और सामान लाना',
    nameGu: 'લોકલ ડિલિવરી અને સામાન લાવવો',
    iconName: 'Package',
    tag: '#Delivery',
    description: 'Parcel drop, grocery/medicine pickup & local market errands',
    helperCount: 0,
  },

  // ==========================================
  // 7. 📚 Education & Skill Classes (education_classes)
  // ==========================================
  {
    id: 'tutor',
    masterCategory: 'education_classes',
    nameEn: 'Tuition & School Teacher',
    nameHi: 'होम ट्यूटर और स्कूल टीचर',
    nameGu: 'હોમ ટ્યુટર અને સ્કૂલ ટીચર',
    iconName: 'GraduationCap',
    tag: '#HomeTutor',
    description: 'Nursery to 12th home tuition, coaching classes & exam preparation',
    helperCount: 0,
  },
  {
    id: 'study_project',
    masterCategory: 'education_classes',
    nameEn: 'Project & Study Help',
    nameHi: 'प्रोजेक्ट और पढ़ाई में मदद',
    nameGu: 'પ્રોજેક્ટ અને અભ્યાસમાં મદદ',
    iconName: 'BookOpen',
    tag: '#StudyHelp',
    description: 'School/college assignments, models, notes & exam study partner',
    helperCount: 0,
  },
  {
    id: 'computer_spoken_english',
    masterCategory: 'education_classes',
    nameEn: 'Computer & Spoken English Classes',
    nameHi: 'कंप्यूटर और स्पोकन इंग्लिश क्लासेस',
    nameGu: 'કમ્પ્યુટર અને સ્પોકન ઇંગ્લિશ ક્લાસીસ',
    iconName: 'Languages',
    tag: '#SpokenEnglish',
    description: 'Basic computer, Tally, coding classes, spoken English & IELTS',
    helperCount: 0,
  },
  {
    id: 'music_dance_art',
    masterCategory: 'education_classes',
    nameEn: 'Music, Dance & Art Teacher',
    nameHi: 'संगीत, डांस और ड्राइंग टीचर',
    nameGu: 'સંગીત, ડાન્સ અને ડ્રોઇંગ ટીચર',
    iconName: 'Music',
    tag: '#MusicDanceArt',
    description: 'Guitar, keyboard, singing, garba/dance, painting & craft classes',
    helperCount: 0,
  },

  // ==========================================
  // 8. 🏸 Sports & Fitness Partners (sports_fitness)
  // ==========================================
  {
    id: 'cricket',
    masterCategory: 'sports_fitness',
    nameEn: 'Cricket Partner & Team',
    nameHi: 'क्रिकेट साथी और टीम',
    nameGu: 'ક્રિકેટ સાથી અને ટીમ',
    iconName: 'Trophy',
    tag: '#Cricket',
    description: 'Need players for box cricket, turf match or morning net practice',
    helperCount: 0,
  },
  {
    id: 'badminton',
    masterCategory: 'sports_fitness',
    nameEn: 'Badminton & Tennis Partner',
    nameHi: 'बैडमिंटन और टेनिस साथी',
    nameGu: 'બેડમિન્ટન અને ટેનિસ સાથી',
    iconName: 'Activity',
    tag: '#Badminton',
    description: 'Find a partner for evening badminton, table tennis or squash',
    helperCount: 0,
  },
  {
    id: 'gym_fitness',
    masterCategory: 'sports_fitness',
    nameEn: 'Gym & Workout Buddy',
    nameHi: 'जिम और वर्कआउट पार्टनर',
    nameGu: 'જિમ અને વર્કઆઉટ પાર્ટનર',
    iconName: 'Dumbbell',
    tag: '#GymBuddy',
    description: 'Workout partner, fitness trainer or weight training buddy',
    helperCount: 0,
  },
  {
    id: 'running_yoga',
    masterCategory: 'sports_fitness',
    nameEn: 'Running, Cycling & Yoga Partner',
    nameHi: 'रनिंग, साइकिलिंग और योगा साथी',
    nameGu: 'રનિંગ, સાયકલિંગ અને યોગા સાથી',
    iconName: 'Footprints',
    tag: '#RunningYoga',
    description: 'Morning run, jogging, cycling group or park yoga instructor/buddy',
    helperCount: 0,
  },

  // ==========================================
  // 9. ☕ Social, Lifestyle & Care (social_care)
  // ==========================================
  {
    id: 'chai_coffee',
    masterCategory: 'social_care',
    nameEn: 'Tea-Coffee Meetup',
    nameHi: 'चाय-कॉफी मीटअप और बातचीत',
    nameGu: 'ચા-કોફી મુલાકાત અને વાતચીત',
    iconName: 'Coffee',
    tag: '#ChaiMeetup',
    description: 'Friendly chat over chai/coffee, networking or weekend hangout',
    helperCount: 0,
  },
  {
    id: 'companion',
    masterCategory: 'social_care',
    nameEn: 'Evening Walk Partner',
    nameHi: 'शाम की वॉक और घूमने का साथी',
    nameGu: 'સાંજની વોક અને ફરવાનો સાથી',
    iconName: 'Users',
    tag: '#WalkCompanion',
    description: 'Someone for evening walk, park visit, movie or local outing',
    helperCount: 0,
  },
  {
    id: 'board_games',
    masterCategory: 'social_care',
    nameEn: 'Chess & Board Games',
    nameHi: 'शतरंज, लूडो और इंडोर गेम्स',
    nameGu: 'ચેસ, લુડો અને ઇન્ડોર ગેમ્સ',
    iconName: 'Gamepad2',
    tag: '#BoardGames',
    description: 'Play chess, carrom, ludo or friendly gaming sessions nearby',
    helperCount: 0,
  },
  {
    id: 'senior_help',
    masterCategory: 'social_care',
    nameEn: 'Elder Care & Companion',
    nameHi: 'बुजुर्गों की मदद और देखभाल',
    nameGu: 'વડીલોની મદદ અને સંભાળ',
    iconName: 'HeartHandshake',
    tag: '#SeniorCare',
    description: 'Hospital visit support, medicine pickup, patient care & reading help',
    helperCount: 0,
  },
  {
    id: 'pet_walking',
    masterCategory: 'social_care',
    nameEn: 'Pet Walk & Care',
    nameHi: 'पेट वॉक और डॉग केयर',
    nameGu: 'પેટ વોક અને ડોગ કેર',
    iconName: 'PawPrint',
    tag: '#PetWalking',
    description: 'Dog walking, pet sitting, feeding & veterinary visit help',
    helperCount: 0,
  },

  // ==========================================
  // 10. ✨ Other / Custom Category (other_custom)
  // ==========================================
  {
    id: 'other',
    masterCategory: 'other_custom',
    nameEn: 'Other / Custom Category',
    nameHi: 'अन्य / अपनी श्रेणी लिखें',
    nameGu: 'અન્ય / તમારી કેટેગરી લખો',
    iconName: 'PlusCircle',
    tag: '#OtherService',
    description: 'Any other local skill, custom service, shop or community requirement',
    helperCount: 0,
  },
];

export function getCategoryName(category: CategoryItem | undefined, lang: Language): string {
  if (!category) return '';
  switch (lang) {
    case 'GU': return category.nameGu || category.nameHi || category.nameEn;
    case 'HI': return category.nameHi || category.nameEn;
    default: return category.nameEn;
  }
}

export function getMasterCategoryName(master: MasterCategory | undefined, lang: Language): string {
  if (!master) return '';
  switch (lang) {
    case 'GU': return master.nameGu || master.nameHi || master.nameEn;
    case 'HI': return master.nameHi || master.nameEn;
    default: return master.nameEn;
  }
}

export function getMasterCategorySubtitle(master: MasterCategory | undefined, lang: Language): string {
  if (!master) return '';
  switch (lang) {
    case 'GU': return master.subtitleGu || master.subtitleHi || master.subtitleEn;
    case 'HI': return master.subtitleHi || master.subtitleEn;
    default: return master.subtitleEn;
  }
}

export function getSubCategoriesByMainId(mainId: MasterCategoryId): CategoryItem[] {
  if (mainId === 'all') return CATEGORIES;
  return CATEGORIES.filter(c => c.masterCategory === mainId);
}

export interface FreeHelperProfile {
  id: string;
  userId?: string;
  email?: string;
  name: string;
  categoryId: string;
  customCategoryName?: string;
  masterCategory: MasterCategoryId;
  phone: string;
  skills: string[];
  area: string;
  city?: string;
  experience: string;
  distance: number;
  rating: number;
  completedTasks: number;
  createdAt: string;
  isVerified?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  govtIdUploaded?: boolean;
  shopPhotoUploaded?: boolean;
  idDocUrl?: string;
}

const STORAGE_KEY = 'locohelp_free_helper_profiles';

// Zero dummy helpers - only real user-created and admin-approved helper profiles are shown
export const INITIAL_HELPERS: FreeHelperProfile[] = [];

// Legacy ID map so any old DB record with legacy slug maps to the exact canonical category ID
const LEGACY_CATEGORY_ID_MAP: Record<string, string> = {
  ac_appliance: 'ac_repair',
  cleaning_pest: 'cleaning',
  mechanic_towing: 'mechanic',
  driver_cab: 'cab_auto_driver',
  cab_driver: 'cab_auto_driver',
  beauty_parlour: 'beautician',
  tiffin_catering: 'catering_event',
  computer_mobile: 'computer_laptop',
  cctv_security: 'cctv_wifi',
  packers_movers: 'tempo_packers',
  civil_mason: 'mason',
  event_photo: 'photographer',
  astrology_pandit: 'pandit_pooja',
  cricket_football: 'cricket',
  badminton_tennis: 'badminton',
  gym_running: 'gym_fitness',
  chai_hangout: 'chai_coffee',
  senior_citizen: 'senior_help',
  medical_nursing: 'senior_help',
  flatmate_pg: 'real_estate_broker',
};

/**
 * Normalizes any category ID, English/Hindi/Gujarati name, tag, or skill keyword
 * into a valid CATEGORIES slug ('plumber', 'electrician', ..., 'other') and preserves customCategoryName.
 */
export function normalizeCategorySlug(
  rawCategory?: string,
  skills?: string[] | string,
  customCategoryName?: string
): { categoryId: string; customCategoryName: string } {
  const candidates: string[] = [];
  if (rawCategory && typeof rawCategory === 'string') candidates.push(rawCategory.trim());
  if (customCategoryName && typeof customCategoryName === 'string') candidates.push(customCategoryName.trim());
  if (Array.isArray(skills)) {
    skills.forEach(s => {
      if (s && typeof s === 'string') candidates.push(s.trim());
    });
  } else if (typeof skills === 'string' && skills.trim()) {
    skills.split(',').forEach(s => {
      if (s.trim()) candidates.push(s.trim());
    });
  }

  for (const raw of candidates) {
    const clean = raw.toLowerCase().replace(/^#/, '').trim();
    if (!clean) continue;

    // 0. Check legacy ID map first
    if (LEGACY_CATEGORY_ID_MAP[clean]) {
      return {
        categoryId: LEGACY_CATEGORY_ID_MAP[clean],
        customCategoryName: customCategoryName?.trim() || '',
      };
    }

    // 1. Direct match on category id, nameEn, nameHi, nameGu, or tag
    const exactMatch = CATEGORIES.find(
      c =>
        c.id.toLowerCase() === clean ||
        c.nameEn.toLowerCase() === clean ||
        c.nameHi.toLowerCase() === clean ||
        (c.nameGu && c.nameGu.toLowerCase() === clean) ||
        c.tag.toLowerCase().replace(/^#/, '') === clean
    );
    if (exactMatch) {
      return {
        categoryId: exactMatch.id,
        customCategoryName:
          exactMatch.id === 'other'
            ? (customCategoryName?.trim() || (rawCategory?.toLowerCase() !== 'other' ? rawCategory?.trim() || '' : ''))
            : (customCategoryName?.trim() || '')
      };
    }

    // 2. Keyword / substring match against all 49 sub-categories
    // Group 1: Home & Repair
    if (clean.includes('plumb') || clean.includes('नल') || clean.includes('पाइप') || clean.includes('પ્લમ્બર')) {
      return { categoryId: 'plumber', customCategoryName: '' };
    }
    if (clean.includes('electric') || clean.includes('बिजली') || clean.includes('इलेक्ट्रीशियन') || clean.includes('ઇલેક્ટ્રિશિયન')) {
      return { categoryId: 'electrician', customCategoryName: '' };
    }
    if (clean.includes('ac ') || clean === 'ac' || clean.includes('ac_repair') || clean.includes('appliance') || clean.includes('fridge') || clean.includes('ro repair') || clean.includes('washing machine') || clean.includes('एसी') || clean.includes('फ्रिज')) {
      return { categoryId: 'ac_repair', customCategoryName: '' };
    }
    if (clean.includes('carpent') || clean.includes('suthar') || clean.includes('furniture') || clean.includes('बढ़ई') || clean.includes('सुथार') || clean.includes('फर्नीचर') || clean.includes('સુથાર')) {
      return { categoryId: 'carpenter', customCategoryName: '' };
    }
    if (clean.includes('paint') || clean.includes('पेंटर') || clean.includes('पुताई') || clean.includes('પેઇન્ટર')) {
      return { categoryId: 'painter', customCategoryName: '' };
    }
    if (clean.includes('mason') || clean.includes('kadiyo') || clean.includes('mistri') || clean.includes('कड़िया') || clean.includes('मिस्त्री') || clean.includes('કડિયો')) {
      return { categoryId: 'mason', customCategoryName: '' };
    }
    if (clean.includes('pest') || clean.includes('termite') || clean.includes('tank clean') || clean.includes('पेस्ट') || clean.includes('टंकी सफाई') || clean.includes('પેસ્ટ')) {
      return { categoryId: 'pest_control', customCategoryName: '' };
    }
    if (clean.includes('clean') || clean.includes('maid') || clean.includes('housekeep') || clean.includes('cook') || clean.includes('सफाई') || clean.includes('मेड') || clean.includes('रसोइया') || clean.includes('સફાઈ')) {
      return { categoryId: 'cleaning', customCategoryName: '' };
    }

    // Group 2: Personal Care, Fashion & Events
    if (clean.includes('tailor') || clean.includes('darzi') || clean.includes('boutique') || clean.includes('दर्जी') || clean.includes('बुटीक') || clean.includes('દરજી')) {
      return { categoryId: 'tailor', customCategoryName: '' };
    }
    if (clean.includes('beauti') || clean.includes('salon') || clean.includes('parlour') || clean.includes('makeup') || clean.includes('ब्यूटी') || clean.includes('पार्लर') || clean.includes('બ્યુટિશિયન')) {
      return { categoryId: 'beautician', customCategoryName: '' };
    }
    if (clean.includes('mehendi') || clean.includes('mehndi') || clean.includes('henna') || clean.includes('मेहंदी') || clean.includes('મહેંદી')) {
      return { categoryId: 'mehendi', customCategoryName: '' };
    }
    if (clean.includes('pandit') || clean.includes('pooja') || clean.includes('puja') || clean.includes('astrolog') || clean.includes('पंडित') || clean.includes('पूजा') || clean.includes('પંડિત')) {
      return { categoryId: 'pandit_pooja', customCategoryName: '' };
    }
    if (clean.includes('photograp') || clean.includes('videograp') || clean.includes('cameraman') || clean.includes('फोटोग्राफ') || clean.includes('ફોટોગ્રાફર')) {
      return { categoryId: 'photographer', customCategoryName: '' };
    }
    if (clean.includes('cater') || clean.includes('halwai') || clean.includes('tiffin') || clean.includes('event helper') || clean.includes('कैटरिंग') || clean.includes('हलवाई') || clean.includes('કેટરિંગ')) {
      return { categoryId: 'catering_event', customCategoryName: '' };
    }

    // Group 3: IT, Tech & Digital Experts
    if (clean.includes('web dev') || clean.includes('website') || clean.includes('वेब डेवलपर') || clean.includes('वेबसाइट') || clean.includes('વેબ ડેવલપર')) {
      return { categoryId: 'web_developer', customCategoryName: '' };
    }
    if (clean.includes('app dev') || clean.includes('android') || clean.includes('flutter') || clean.includes('ऐप डेवलपर') || clean.includes('એપ ડેવલપર')) {
      return { categoryId: 'app_developer', customCategoryName: '' };
    }
    if (clean.includes('cctv') || clean.includes('wifi') || clean.includes('wi-fi') || clean.includes('सीसीटीवी') || clean.includes('वाई-फाई')) {
      return { categoryId: 'cctv_wifi', customCategoryName: '' };
    }
    if (clean.includes('graphic') || clean.includes('video edit') || clean.includes('logo') || clean.includes('ग्राफिक') || clean.includes('वीडियो एडिटर')) {
      return { categoryId: 'graphic_video', customCategoryName: '' };
    }
    if (clean.includes('digital market') || clean.includes('social media') || clean.includes('seo') || clean.includes('डिजिटल मार्केटिंग')) {
      return { categoryId: 'digital_marketing', customCategoryName: '' };
    }
    if (clean.includes('mobile repair') || clean.includes('phone repair') || clean.includes('मोबाइल रिपेयर') || clean.includes('મોબાઇલ રિપેર')) {
      return { categoryId: 'mobile_repair', customCategoryName: '' };
    }
    if (clean.includes('laptop') || clean.includes('computer repair') || clean.includes('pc repair') || clean.includes('लैपटॉप') || clean.includes('कंप्यूटर रिपेयर')) {
      return { categoryId: 'computer_laptop', customCategoryName: '' };
    }

    // Group 4: Business, Sales & Staff
    if (clean.includes('salesman') || clean.includes('salesgirl') || clean.includes('sales staff') || clean.includes('सेल्समेन') || clean.includes('सेल्सगर्ल') || clean.includes('સેલ્સમેન')) {
      return { categoryId: 'sales_staff', customCategoryName: '' };
    }
    if (clean.includes('shop helper') || clean.includes('store staff') || clean.includes('दुकान हेल्पर') || clean.includes('દુકાન હેલ્પર')) {
      return { categoryId: 'shop_helper', customCategoryName: '' };
    }
    if (clean.includes('accountant') || clean.includes('gst') || clean.includes('tally') || clean.includes('tax') || clean.includes('अकाउंटेंट') || clean.includes('એકાઉન્ટન્ટ')) {
      return { categoryId: 'accountant_gst', customCategoryName: '' };
    }
    if (clean.includes('data entry') || clean.includes('back office') || clean.includes('excel') || clean.includes('डाटा एंट्री') || clean.includes('ડેટા એન્ટ્રી')) {
      return { categoryId: 'data_entry', customCategoryName: '' };
    }
    if (clean.includes('security guard') || clean.includes('watchman') || clean.includes('सिक्योरिटी गार्ड') || clean.includes('वॉचमैन') || clean.includes('સિક્યુરિટી ગાર્ડ')) {
      return { categoryId: 'security_guard', customCategoryName: '' };
    }
    if (clean.includes('receptionist') || clean.includes('telecaller') || clean.includes('रिसेप्शनिस्ट') || clean.includes('टेलीकॉलर') || clean.includes('ટેલીકોલર')) {
      return { categoryId: 'receptionist_telecaller', customCategoryName: '' };
    }

    // Group 5: Brokers, Agents & Consultants
    if (clean.includes('real estate') || clean.includes('property broker') || clean.includes('flatmate') || clean.includes('प्रॉपर्टी ब्रोकर') || clean.includes('પ્રોપર્ટી બ્રોકર')) {
      return { categoryId: 'real_estate_broker', customCategoryName: '' };
    }
    if (clean.includes('vehicle broker') || clean.includes('car broker') || clean.includes('गाड़ी ब्रोकर') || clean.includes('વાહન બ્રોકર')) {
      return { categoryId: 'vehicle_broker', customCategoryName: '' };
    }
    if (clean.includes('rto') || clean.includes('license agent') || clean.includes('लाइसेंस एजेंट') || clean.includes('લાઇસન્સ એજન્ટ')) {
      return { categoryId: 'rto_agent', customCategoryName: '' };
    }
    if (clean.includes('loan') || clean.includes('insurance') || clean.includes('lic') || clean.includes('लोन') || clean.includes('बीमा') || clean.includes('વીમા')) {
      return { categoryId: 'loan_insurance', customCategoryName: '' };
    }
    if (clean.includes('legal') || clean.includes('notary') || clean.includes('affidavit') || clean.includes('documentation') || clean.includes('कानूनी') || clean.includes('नोटरी') || clean.includes('નોટરી')) {
      return { categoryId: 'legal_docs', customCategoryName: '' };
    }

    // Group 6: Vehicle, Transport & Delivery
    if (clean.includes('mechanic') || clean.includes('puncture') || clean.includes('towing') || clean.includes('garage') || clean.includes('मैकेनिक') || clean.includes('पंक्चर') || clean.includes('મિકેનિક')) {
      return { categoryId: 'mechanic', customCategoryName: '' };
    }
    if (clean.includes('tempo') || clean.includes('packers') || clean.includes('movers') || clean.includes('chota hathi') || clean.includes('टेम्पो') || clean.includes('पैकर्स') || clean.includes('ટેમ્પો')) {
      return { categoryId: 'tempo_packers', customCategoryName: '' };
    }
    if (clean.includes('cab') || clean.includes('auto') || clean.includes('driver') || clean.includes('taxi') || clean.includes('कैब') || clean.includes('ऑटो') || clean.includes('ड्राइवर') || clean.includes('ડ્રાઇવર')) {
      return { categoryId: 'cab_auto_driver', customCategoryName: '' };
    }
    if (clean.includes('deliver') || clean.includes('errand') || clean.includes('parcel') || clean.includes('डिलीवरी') || clean.includes('ડિલિવરી')) {
      return { categoryId: 'delivery', customCategoryName: '' };
    }

    // Group 7: Education & Skill Classes
    if (clean.includes('spoken english') || clean.includes('computer class') || clean.includes('ielts') || clean.includes('स्पोकन इंग्लिश')) {
      return { categoryId: 'computer_spoken_english', customCategoryName: '' };
    }
    if (clean.includes('music') || clean.includes('dance') || clean.includes('drawing') || clean.includes('guitar') || clean.includes('संगीत') || clean.includes('डांस')) {
      return { categoryId: 'music_dance_art', customCategoryName: '' };
    }
    if (clean.includes('study') || clean.includes('project') || clean.includes('assignment') || clean.includes('प्रोजेक्ट') || clean.includes('પ્રોજેક્ટ')) {
      return { categoryId: 'study_project', customCategoryName: '' };
    }
    if (clean.includes('tutor') || clean.includes('teacher') || clean.includes('coaching') || clean.includes('tuition') || clean.includes('ट्यूशन') || clean.includes('टीचर') || clean.includes('ટ્યુશન')) {
      return { categoryId: 'tutor', customCategoryName: '' };
    }

    // Group 8: Sports & Fitness Partners
    if (clean.includes('cricket') || clean.includes('football') || clean.includes('turf') || clean.includes('क्रिकेट') || clean.includes('ક્રિકેટ')) {
      return { categoryId: 'cricket', customCategoryName: '' };
    }
    if (clean.includes('badminton') || clean.includes('tennis') || clean.includes('बैडमिंटन') || clean.includes('બેડમિન્ટન')) {
      return { categoryId: 'badminton', customCategoryName: '' };
    }
    if (clean.includes('running') || clean.includes('yoga') || clean.includes('cycling') || clean.includes('jogging') || clean.includes('रनिंग') || clean.includes('योगा') || clean.includes('યોગા')) {
      return { categoryId: 'running_yoga', customCategoryName: '' };
    }
    if (clean.includes('gym') || clean.includes('workout') || clean.includes('fitness') || clean.includes('जिम') || clean.includes('જિમ')) {
      return { categoryId: 'gym_fitness', customCategoryName: '' };
    }

    // Group 9: Social, Lifestyle & Care
    if (clean.includes('chai') || clean.includes('coffee') || clean.includes('tea') || clean.includes('meetup') || clean.includes('चाय') || clean.includes('कॉफी') || clean.includes('ચા-કોફી')) {
      return { categoryId: 'chai_coffee', customCategoryName: '' };
    }
    if (clean.includes('walk partner') || clean.includes('companion') || clean.includes('वॉक') || clean.includes('साथी')) {
      return { categoryId: 'companion', customCategoryName: '' };
    }
    if (clean.includes('chess') || clean.includes('board game') || clean.includes('ludo') || clean.includes('carrom') || clean.includes('शतरंज') || clean.includes('लूडो') || clean.includes('ચેસ')) {
      return { categoryId: 'board_games', customCategoryName: '' };
    }
    if (clean.includes('senior') || clean.includes('elder') || clean.includes('बुजुर्ग') || clean.includes('વડીલો')) {
      return { categoryId: 'senior_help', customCategoryName: '' };
    }
    if (clean.includes('pet') || clean.includes('dog walk') || clean.includes('पेट वॉक') || clean.includes('ડોગ')) {
      return { categoryId: 'pet_walking', customCategoryName: '' };
    }
  }

  const fallbackLabel =
    customCategoryName?.trim() ||
    (rawCategory && rawCategory.trim().toLowerCase() !== 'other' && rawCategory.trim().toLowerCase() !== 'general'
      ? rawCategory.trim()
      : '');
  return {
    categoryId: 'other',
    customCategoryName: fallbackLabel
  };
}

export function getFreeHelperProfiles(includePending = false): FreeHelperProfile[] {
  try {
    let deletedIds: string[] = [];
    try {
      const delRaw = localStorage.getItem('locohelp_deleted_helpers');
      if (delRaw) deletedIds = JSON.parse(delRaw);
    } catch {}

    const data = localStorage.getItem(STORAGE_KEY);
    const custom: FreeHelperProfile[] = data ? JSON.parse(data) : [];
    // Filter out any legacy dummy helpers (h1..h14) and explicitly deleted IDs
    const realOnly = custom
      .filter(h => h && h.id && !/^h\d+/.test(String(h.id)) && !deletedIds.includes(String(h.id)))
      .map(h => {
        const norm = normalizeCategorySlug(
          h.categoryId || (h as any).category,
          h.skills,
          h.customCategoryName
        );
        return {
          ...h,
          categoryId: norm.categoryId,
          customCategoryName: h.customCategoryName || norm.customCategoryName
        };
      });
    if (includePending) {
      return realOnly;
    }
    // Only return helpers whose profiles have been approved by Admin (isVerified === true or status === 'approved')
    return realOnly.filter(h => h.isVerified === true || h.status === 'approved');
  } catch {
    return [];
  }
}

export function saveFreeHelperProfile(
  profile: Omit<FreeHelperProfile, 'id' | 'rating' | 'completedTasks' | 'createdAt' | 'masterCategory'> & {
    id?: string;
    masterCategory?: MasterCategoryId;
    govtIdUploaded?: boolean;
    idDocUrl?: string;
    isVerified?: boolean;
    status?: 'pending' | 'approved' | 'rejected';
  }
): FreeHelperProfile {
  const norm = normalizeCategorySlug(profile.categoryId, profile.skills, profile.customCategoryName);
  const matched = CATEGORIES.find(c => c.id === norm.categoryId);
  const hasDoc = Boolean(profile.govtIdUploaded || profile.idDocUrl || profile.isVerified);
  const isApproved = Boolean(profile.isVerified === true || profile.status === 'approved');
  const newProfile: FreeHelperProfile = {
    ...profile,
    categoryId: norm.categoryId,
    customCategoryName: profile.customCategoryName || norm.customCategoryName,
    masterCategory: profile.masterCategory || (matched ? matched.masterCategory : 'home_repair'),
    id: profile.id || 'hp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    rating: 5.0,
    completedTasks: 0,
    isVerified: isApproved,
    status: isApproved ? 'approved' : 'pending',
    govtIdUploaded: hasDoc,
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const list: FreeHelperProfile[] = existing ? JSON.parse(existing) : [];
    // Only deduplicate by exact profile ID so multiple profiles created by Admin are never overwritten
    const filtered = list.filter(
      h =>
        h &&
        h.id &&
        !/^h\d+/.test(String(h.id)) &&
        h.id !== newProfile.id
    );
    filtered.unshift(newProfile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save helper profile', e);
  }

  return newProfile;
}
