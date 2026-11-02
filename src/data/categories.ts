import { Language } from '../types';

export type MasterCategoryId =
  | 'all'
  | 'electrician_main'
  | 'plumber_main'
  | 'ac_repair_main'
  | 'maid_cook_main'
  | 'cleaning_main'
  | 'mason_main'
  | 'carpenter_main'
  | 'painter_main'
  | 'pest_control_main'
  | 'brokers_agents'
  | 'social_care'
  | 'other_custom'
  // Legacy master category IDs preserved for backward compatibility
  | 'home_repair'
  | 'personal_events'
  | 'it_tech'
  | 'cctv_mobile'
  | 'hospital_medical'
  | 'business_staff'
  | 'vehicle_transport'
  | 'tempo_transport'
  | 'education_classes'
  | 'sports_fitness'
  | 'food_grocery'
  | 'delivery_courier'
  | 'vehicle_help'
  | 'daily_help'
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
    id: 'electrician_main',
    emoji: '⚡',
    nameEn: 'Electrician',
    nameHi: 'इलेक्ट्रीशियन',
    nameGu: 'ઈલેક્ટ્રીશિયન',
    iconName: 'Zap',
    color: 'emerald',
    subtitleEn: 'Fan, switchboard, inverter, wiring & fuse repair',
    subtitleHi: 'पंखा, स्विचबोर्ड, इन्वर्टर, वायरिंग और बिजली रिपेयर',
    subtitleGu: 'પંખો, સ્વીચબોર્ડ, ઇન્વર્ટર, વાયરિંગ અને વીજળી રિપેર',
  },
  {
    id: 'plumber_main',
    emoji: '🔧',
    nameEn: 'Plumber',
    nameHi: 'प्लंबर',
    nameGu: 'પ્લમ્બર',
    iconName: 'Wrench',
    color: 'blue',
    subtitleEn: 'Tap leak, pipe fitting, water tank & bathroom repair',
    subtitleHi: 'नल लीक, पाइप फिटिंग, पानी की टंकी और बाथरूम रिपेयर',
    subtitleGu: 'નળ લીકેજ, પાઇપ ફિટિંગ, પાણીની ટાંકી અને બાથરૂમ રિપેર',
  },
  {
    id: 'ac_repair_main',
    emoji: '❄️',
    nameEn: 'AC, Fridge & RO Repair',
    nameHi: 'AC, फ्रिज और RO रिपेयर',
    nameGu: 'A.C. ફ્રિજ અને R.O. રીપેર',
    iconName: 'Fan',
    color: 'cyan',
    subtitleEn: 'AC service, gas filling, fridge, washing machine & RO repair',
    subtitleHi: 'AC सर्विस, गैस फिलिंग, फ्रिज, वॉशिंग मशीन और RO रिपेयर',
    subtitleGu: 'AC સર્વિસ, ગેસ ફિલિંગ, ફ્રિજ, વોશિંગ મશીન અને RO રિપેર',
  },
  {
    id: 'maid_cook_main',
    emoji: '🍳',
    nameEn: 'Maid & Cook',
    nameHi: 'कामवाले और रसोइया',
    nameGu: 'કામવાળા અને રસોઈયા',
    iconName: 'Utensils',
    color: 'orange',
    subtitleEn: 'Daily house maid, cooking help, utensil & home chores',
    subtitleHi: 'घर के काम के लिए कामवाली और खाना बनाने के लिए रसोइया',
    subtitleGu: 'ઘરકામ માટે કામવાળા અને રસોઈ બનાવવા માટે રસોઈયા',
  },
  {
    id: 'cleaning_main',
    emoji: '🧹',
    nameEn: 'Home Cleaning',
    nameHi: 'घर की सफाई',
    nameGu: 'ઘરની સફાઈ',
    iconName: 'Sparkles',
    color: 'teal',
    subtitleEn: 'Full house cleaning, bathroom, sofa, kitchen & deep cleaning',
    subtitleHi: 'पूरे घर की सफाई, बाथरूम, सोफा, किचन और डीप क्लीनिंग',
    subtitleGu: 'આખા ઘરની સફાઈ, બાથરૂમ, સોફા, રસોડું અને ડીપ ક્લીનિંગ',
  },
  {
    id: 'mason_main',
    emoji: '🧱',
    nameEn: 'Mason & Construction',
    nameHi: 'राजमिस्त्री / निर्माण कार्य',
    nameGu: 'કડિયો / મિસ્ત્રી બાંધકામ',
    iconName: 'HardHat',
    color: 'amber',
    subtitleEn: 'Brickwork, plaster, floor tiles, marble & civil repair',
    subtitleHi: 'ईंट-प्लास्टर, टाइल्स, मार्बल और सिविल निर्माण कार्य',
    subtitleGu: 'ચણતર, પ્લાસ્ટર, ટાઇલ્સ, માર્બલ અને બાંધકામ રિપેરિંગ',
  },
  {
    id: 'carpenter_main',
    emoji: '🪚',
    nameEn: 'Carpenter & Furniture',
    nameHi: 'बढ़ई / फर्नीचर',
    nameGu: 'સુથાર / ફર્નિચર',
    iconName: 'Hammer',
    color: 'orange',
    subtitleEn: 'Door lock, bed, cupboard, modular kitchen & furniture work',
    subtitleHi: 'दरवाज़ा लॉक, बेड, अलमारी, मॉड्यूलर किचन और फर्नीचर काम',
    subtitleGu: 'દરવાજા લોક, બેડ, કબાટ, મોડ્યુલર કિચન અને ફર્નિચર કામ',
  },
  {
    id: 'painter_main',
    emoji: '🎨',
    nameEn: 'Painter & Painting',
    nameHi: 'पेंटर / रंगाई-पुताई',
    nameGu: 'કલરકામ',
    iconName: 'Paintbrush',
    color: 'pink',
    subtitleEn: 'Home painting, wall putty, POP, waterproofing & polish',
    subtitleHi: 'घर की रंगाई-पुताई, वॉल पुट्टी, POP और वॉटरप्रूफिंग',
    subtitleGu: 'ઘરનું કલરકામ, લાપી, POP, વોટરપ્રૂફિંગ અને પોલિશ',
  },
  {
    id: 'pest_control_main',
    emoji: '🐜',
    nameEn: 'Pest Control',
    nameHi: 'पेस्ट कंट्रोल',
    nameGu: 'જંતુનાશક સેવા',
    iconName: 'Bug',
    color: 'red',
    subtitleEn: 'Termite, cockroach control, sanitization & water tank cleaning',
    subtitleHi: 'दीमक, कॉकरोच पेस्ट कंट्रोल, सैनिटाइजेशन और पानी की टंकी सफाई',
    subtitleGu: 'ઊધઈ, વંદા જંતુનાશક સેવા (પેસ્ટ કંટ્રોલ) અને પાણીની ટાંકી સફાઈ',
  },
  {
    id: 'brokers_agents',
    emoji: '🏢',
    nameEn: 'Brokers & Agents',
    nameHi: 'ब्रोकर व एजेंट',
    nameGu: 'બ્રોકર અને એજન્ટ',
    iconName: 'Building2',
    color: 'cyan',
    subtitleEn: 'Real Estate Broker, Vehicle Agent, RTO & License, Loan & Insurance, Legal Help',
    subtitleHi: 'प्रॉपर्टी ब्रोकर, गाड़ी एजेंट, RTO व लाइसेंस, लोन व बीमा एजेंट, कानूनी दस्तावेज',
    subtitleGu: 'પ્રોપર્ટી બ્રોકર, વાહન એજન્ટ, RTO અને લાઇસન્સ, લોન અને વીમા એજન્ટ, કાનૂની દસ્તાવેજ',
  },
  {
    id: 'social_care',
    emoji: '☕',
    nameEn: 'Social & Friends',
    nameHi: 'सोशल व फ्रेंड्स',
    nameGu: 'સોશિયલ અને ફ્રેન્ડ્સ',
    iconName: 'Coffee',
    color: 'rose',
    subtitleEn: 'Tea-Coffee Meetup, Evening Walk Partner, Chess & Board Games, Elder & Pet Care',
    subtitleHi: 'चाय-कॉफी मीटअप, शाम की वॉक, शतरंज व बोर्ड गेम्स, बुजुर्ग सेवा, पेट वॉक',
    subtitleGu: 'ચા-કોફી મુલાકાત, સાંજની વોક, ચેસ અને બોર્ડ ગેમ્સ, વડીલોની સેવા, પેટ વોક',
  },
  {
    id: 'other_custom',
    emoji: '✨',
    nameEn: 'Other Services',
    nameHi: 'अन्य सेवाएं',
    nameGu: 'અન્ય સેવાઓ',
    iconName: 'Sparkles',
    color: 'violet',
    subtitleEn: 'CCTV & Mobile, Medical Help, Cab & Travel, Transport & Shifting, Tuition, Sports, Food & Grocery, and Custom Services',
    subtitleHi: 'CCTV व मोबाइल, मेडिकल, कैब व ट्रैवल, ट्रांसपोर्ट, ट्यूशन, स्पोर्ट्स, फूड व ग्रोसरी और अन्य सभी सेवाएं',
    subtitleGu: 'CCTV અને મોબાઇલ, મેડિકલ, કેબ અને ટ્રાવેલ, ટ્રાન્સપોર્ટ, ટ્યુશન, સ્પોર્ટ્સ, ફૂડ અને ગ્રોસરી તથા અન્ય તમામ સેવાઓ',
  },
];

export const MAIN_CATEGORIES = MASTER_CATEGORIES;

export interface CategoryItem {
  id: string;
  masterCategory: MasterCategoryId;
  mainCategoryId?: MasterCategoryId;
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
  // 1 to 9: Direct Home & Repair Main Categories
  // ==========================================
  {
    id: 'electrician',
    masterCategory: 'electrician_main',
    nameEn: 'Electrician',
    nameHi: 'इलेक्ट्रीशियन',
    nameGu: 'ઈલેક્ટ્રીશિયન',
    iconName: 'Zap',
    tag: '#Electrician',
    description: 'Fan, switchboard, inverter, wiring & fuse repair',
    helperCount: 0,
  },
  {
    id: 'plumber',
    masterCategory: 'plumber_main',
    nameEn: 'Plumber',
    nameHi: 'प्लंबर',
    nameGu: 'પ્લમ્બર',
    iconName: 'Wrench',
    tag: '#Plumber',
    description: 'Tap leak, pipe fitting, tank & bathroom repair',
    helperCount: 0,
  },
  {
    id: 'ac_repair',
    masterCategory: 'ac_repair_main',
    nameEn: 'AC, Fridge & RO Repair',
    nameHi: 'AC, फ्रिज और RO रिपेयर',
    nameGu: 'A.C. ફ્રિજ અને R.O. રીપેર',
    iconName: 'Fan',
    tag: '#ACRepair',
    description: 'AC service, gas filling, fridge, washing machine & RO repair',
    helperCount: 0,
  },
  {
    id: 'maid_cook',
    masterCategory: 'maid_cook_main',
    nameEn: 'Maid & Cook',
    nameHi: 'कामवाले और रसोइया',
    nameGu: 'કામવાળા અને રસોઈયા',
    iconName: 'Utensils',
    tag: '#MaidCook',
    description: 'Daily house maid, cooking help, utensil & home chores',
    helperCount: 0,
  },
  {
    id: 'cleaning',
    masterCategory: 'cleaning_main',
    nameEn: 'Home Cleaning',
    nameHi: 'घर की सफाई',
    nameGu: 'ઘરની સફાઈ',
    iconName: 'Sparkles',
    tag: '#Cleaning',
    description: 'House cleaning, bathroom, sofa, kitchen & deep cleaning',
    helperCount: 0,
  },
  {
    id: 'mason',
    masterCategory: 'mason_main',
    nameEn: 'Mason & Construction',
    nameHi: 'राजमिस्त्री / निर्माण कार्य',
    nameGu: 'કડિયો / મિસ્ત્રી બાંધકામ',
    iconName: 'HardHat',
    tag: '#Mason',
    description: 'Brickwork, plaster, floor tiles, marble & civil repair',
    helperCount: 0,
  },
  {
    id: 'carpenter',
    masterCategory: 'carpenter_main',
    nameEn: 'Carpenter & Furniture',
    nameHi: 'बढ़ई / फर्नीचर',
    nameGu: 'સુથાર / ફર્નિચર',
    iconName: 'Hammer',
    tag: '#Carpenter',
    description: 'Door lock, bed, cupboard, modular kitchen & wood work',
    helperCount: 0,
  },
  {
    id: 'painter',
    masterCategory: 'painter_main',
    nameEn: 'Painter & Painting',
    nameHi: 'पेंटर / रंगाई-पुताई',
    nameGu: 'કલરકામ',
    iconName: 'Paintbrush',
    tag: '#Painter',
    description: 'Home painting, wall putty, POP, waterproofing & polish',
    helperCount: 0,
  },
  {
    id: 'pest_control',
    masterCategory: 'pest_control_main',
    nameEn: 'Pest Control',
    nameHi: 'पेस्ट कंट्रोल',
    nameGu: 'જંતુનાશક સેવા',
    iconName: 'Bug',
    tag: '#PestControl',
    description: 'Termite, cockroach control, sanitization & water tank cleaning',
    helperCount: 0,
  },

  // ==========================================
  // 10. 🏢 Brokers & Agents (brokers_agents)
  // ==========================================
  {
    id: 'real_estate_broker',
    masterCategory: 'brokers_agents',
    nameEn: 'Real Estate / Property Broker',
    nameHi: 'मकान, दुकान, फ्लैट किराये या बिक्री',
    nameGu: 'મકાન, દુકાન, ફ્લેટ ભાડે કે વેચાણ',
    iconName: 'Building2',
    tag: '#PropertyBroker',
    description: 'Rent, buy or sell house, flat, PG, shop, office & plot',
    helperCount: 0,
  },
  {
    id: 'vehicle_broker',
    masterCategory: 'brokers_agents',
    nameEn: 'Vehicle Broker / Agent',
    nameHi: 'पुरानी कार, बाइक खरीद-बिक्री एजेंट',
    nameGu: 'જૂની કાર, બાઇક ખરીદ-વેચાણ એજન્ટ',
    iconName: 'Car',
    tag: '#VehicleBroker',
    description: 'Buy & sell second-hand bike, car, commercial vehicle & tractor',
    helperCount: 0,
  },
  {
    id: 'rto_agent',
    masterCategory: 'brokers_agents',
    nameEn: 'RTO & License Agent',
    nameHi: 'ड्राइविंग लाइसेंस, RC ट्रांसफर और बीमा',
    nameGu: 'ડ્રાઇવિંગ લાઇસન્સ, RC ટ્રાન્સફર અને વીમો',
    iconName: 'FileCheck',
    tag: '#RTOAgent',
    description: 'Driving license, RC transfer, vehicle insurance & PUC help',
    helperCount: 0,
  },
  {
    id: 'loan_insurance',
    masterCategory: 'brokers_agents',
    nameEn: 'Loan & Insurance Agent',
    nameHi: 'होम/पर्सनल लोन, LIC और मेडिक्लेम',
    nameGu: 'હોમ/પર્સનલ લોન, LIC અને મેડિક્લેમ',
    iconName: 'Landmark',
    tag: '#LoanInsurance',
    description: 'Home loan, personal/business loan, health, life & vehicle insurance',
    helperCount: 0,
  },
  {
    id: 'legal_docs',
    masterCategory: 'brokers_agents',
    nameEn: 'Legal & Documentation Help',
    nameHi: 'किराया करार, नोटरी, पैन/आधार और सरकारी दस्तावेज़',
    nameGu: 'ભાડા કરાર, નોટરી, પાન/આધાર અને સરકારી દસ્તાવેજ',
    iconName: 'Scale',
    tag: '#LegalDocs',
    description: 'Rent agreement, notary, affidavit, PAN/Aadhaar, passport & e-Seva',
    helperCount: 0,
  },

  // ==========================================
  // 11. ☕ Social & Friends (social_care)
  // ==========================================
  {
    id: 'chai_coffee',
    masterCategory: 'social_care',
    nameEn: 'Tea-Coffee Meetup',
    nameHi: 'चाय-कॉफी मुलाकात और बातचीत',
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
    nameHi: 'शाम की सैर और घूमने का साथी',
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
    nameHi: 'शतरंज, कैरम, लूडो साथी',
    nameGu: 'ચેસ, કેરમ, લુડો સાથી',
    iconName: 'Gamepad2',
    tag: '#BoardGames',
    description: 'Play chess, carrom, ludo or friendly gaming sessions nearby',
    helperCount: 0,
  },
  {
    id: 'senior_help',
    masterCategory: 'social_care',
    nameEn: 'Elder Care & Companion',
    nameHi: 'बुजुर्गों की मदद, दवा और देखभाल',
    nameGu: 'વડીલોની મદદ, દવા અને સંભાળ',
    iconName: 'HeartHandshake',
    tag: '#SeniorCare',
    description: 'Hospital visit support, medicine pickup, patient care & reading help',
    helperCount: 0,
  },
  {
    id: 'pet_walking',
    masterCategory: 'social_care',
    nameEn: 'Pet Walk & Care',
    nameHi: 'पेट वॉकिंग और डॉग केयर',
    nameGu: 'પેટ વૉકિંગ અને ડૉગ કેર',
    iconName: 'PawPrint',
    tag: '#PetWalking',
    description: 'Dog walking, pet sitting, feeding & veterinary visit help',
    helperCount: 0,
  },

  // ==========================================
  // 12. ✨ Other Services (other_custom - અન્ય સેવાઓ)
  // Includes all subcategories from:
  // - CCTV & Mobile
  // - Hospital & Medical
  // - Cab & Travel
  // - Transport & Shifting
  // - Tuition & Classes
  // - Sports & Fitness
  // - Food & Grocery
  // - Other / Custom Category
  // ==========================================
  {
    id: 'mobile_repair',
    masterCategory: 'other_custom',
    nameEn: 'Mobile Repair Technician',
    nameHi: 'मोबाइल स्क्रीन और पार्ट्स रिपेयर',
    nameGu: 'મોબાઇલ સ્ક્રીન અને પાર્ટ્સ રિપેર',
    iconName: 'Smartphone',
    tag: '#MobileRepair',
    description: 'Screen replacement, battery, charging jack & mobile software',
    helperCount: 0,
  },
  {
    id: 'computer_laptop',
    masterCategory: 'other_custom',
    nameEn: 'Computer & Laptop Expert',
    nameHi: 'कंप्यूटर और लैपटॉप रिपेयर',
    nameGu: 'કમ્પ્યુટર અને લેપટોપ રિપેર',
    iconName: 'Monitor',
    tag: '#ComputerRepair',
    description: 'Windows installation, laptop repair, printer setup & data recovery',
    helperCount: 0,
  },
  {
    id: 'cctv_wifi',
    masterCategory: 'other_custom',
    nameEn: 'CCTV & Wi-Fi Technician',
    nameHi: 'CCTV कैमरा और वाई-फाई टेक्नीशियन',
    nameGu: 'CCTV કેમેરા અને વાઈ-ફાઈ ટેકનિશિયન',
    iconName: 'Wifi',
    tag: '#CCTVWifi',
    description: 'CCTV camera installation, DVR setup, Wi-Fi router & networking',
    helperCount: 0,
  },
  {
    id: 'medical_nurse',
    masterCategory: 'other_custom',
    nameEn: 'Home Nurse & Patient Care',
    nameHi: 'होम नर्स और मरीज़ की देखभाल',
    nameGu: 'હોમ નર્સ અને દર્દીની સંભાળ',
    iconName: 'HeartHandshake',
    tag: '#HomeNurse',
    description: 'Home nursing, dressing, injection, ICU care & patient attendant',
    helperCount: 0,
  },
  {
    id: 'medical_pharmacy',
    masterCategory: 'other_custom',
    nameEn: 'Medicine & Pharmacy Help',
    nameHi: 'दवाई और मेडिकल स्टोर मदद',
    nameGu: 'દવા અને મેડિકલ સ્ટોર મદદ',
    iconName: 'Heart',
    tag: '#MedicalHelp',
    description: '24x7 chemist, emergency medicine delivery & surgical items',
    helperCount: 0,
  },
  {
    id: 'physiotherapy',
    masterCategory: 'other_custom',
    nameEn: 'Physiotherapy at Home',
    nameHi: 'घर पर फिजियोथेरेपी',
    nameGu: 'ઘરે ફિઝિયોથેરાપી',
    iconName: 'Activity',
    tag: '#Physiotherapy',
    description: 'Joint pain, back pain, paralysis & post-surgery physiotherapy',
    helperCount: 0,
  },
  {
    id: 'lab_test',
    masterCategory: 'other_custom',
    nameEn: 'Lab Test & Sample Collection',
    nameHi: 'लैब टेस्ट और सैंपल कलेक्शन',
    nameGu: 'લેબ ટેસ્ટ અને સેમ્પલ કલેક્શન',
    iconName: 'ShieldCheck',
    tag: '#LabTest',
    description: 'Home lab sample collection, pathology lab & full body checkup',
    helperCount: 0,
  },
  {
    id: 'ambulance_help',
    masterCategory: 'other_custom',
    nameEn: 'Ambulance & Hospital Help',
    nameHi: 'एम्बुलेंस और हॉस्पिटल मदद',
    nameGu: 'એમ્બ્યુલન્સ અને હોસ્પિટલ મદદ',
    iconName: 'Navigation',
    tag: '#Ambulance',
    description: 'Emergency ambulance, oxygen cylinder & hospital admission support',
    helperCount: 0,
  },
  {
    id: 'cab_auto_driver',
    masterCategory: 'other_custom',
    nameEn: 'Cab',
    nameHi: 'कैब (Cab)',
    nameGu: 'કેબ (Cab)',
    iconName: 'Car',
    tag: '#Cab',
    description: 'Local & outstation cab booking, airport pickup & drop',
    helperCount: 0,
  },
  {
    id: 'auto_rickshaw',
    masterCategory: 'other_custom',
    nameEn: 'Auto',
    nameHi: 'ऑटो / रिक्शा (Auto)',
    nameGu: 'ઓટો / રિક્ષા (Auto)',
    iconName: 'Navigation',
    tag: '#AutoRickshaw',
    description: 'Local auto rickshaw for daily commute, school drop & market rides',
    helperCount: 0,
  },
  {
    id: 'private_driver',
    masterCategory: 'other_custom',
    nameEn: 'Driver',
    nameHi: 'प्राइवेट ड्राइवर (Driver)',
    nameGu: 'પ્રાઇવેટ ડ્રાઇવર (Driver)',
    iconName: 'Users',
    tag: '#Driver',
    description: 'Hourly, daily or permanent private car driver on demand',
    helperCount: 0,
  },
  {
    id: 'taxi_service',
    masterCategory: 'other_custom',
    nameEn: 'Taxi',
    nameHi: 'टैक्सी (Taxi)',
    nameGu: 'ટેક્સી (Taxi)',
    iconName: 'Car',
    tag: '#Taxi',
    description: 'Local & outstation taxi service, family tour & travel booking',
    helperCount: 0,
  },
  {
    id: 'car_rental',
    masterCategory: 'other_custom',
    nameEn: 'Car Rental',
    nameHi: 'किराये पर कार (Car Rental)',
    nameGu: 'ભાડે કાર (Car Rental)',
    iconName: 'Car',
    tag: '#CarRental',
    description: 'Rent a car for weddings, tours, outstation trips & corporate travel',
    helperCount: 0,
  },
  {
    id: 'tempo_packers',
    masterCategory: 'other_custom',
    nameEn: 'Tempo',
    nameHi: 'टेम्पो / छोटा हाथी (Tempo)',
    nameGu: 'ટેમ્પો / છોટા હાથી (Tempo)',
    iconName: 'Truck',
    tag: '#Tempo',
    description: 'Chota Hathi tempo, 3-wheeler & mini loading tempo for goods',
    helperCount: 0,
  },
  {
    id: 'truck_transport',
    masterCategory: 'other_custom',
    nameEn: 'Truck',
    nameHi: 'ट्रक / लोडिंग गाड़ी (Truck)',
    nameGu: 'ટ્રક / લોડિંગ ગાડી (Truck)',
    iconName: 'Truck',
    tag: '#Truck',
    description: 'Commercial truck, Eicher & heavy goods transport service',
    helperCount: 0,
  },
  {
    id: 'packers_movers',
    masterCategory: 'other_custom',
    nameEn: 'Packers & Movers',
    nameHi: 'पैकर्स एंड मूवर्स (Packers & Movers)',
    nameGu: 'પેકર્સ એન્ડ મૂવર્સ (Packers & Movers)',
    iconName: 'Package',
    tag: '#PackersMovers',
    description: 'Complete household packing, loading, unloading & safe relocation',
    helperCount: 0,
  },
  {
    id: 'home_office_shifting',
    masterCategory: 'other_custom',
    nameEn: 'Shifting',
    nameHi: 'घर / ऑफिस शिफ्टिंग (Shifting)',
    nameGu: 'ઘર / ઓફિસ શિફ્ટિંગ (Shifting)',
    iconName: 'Home',
    tag: '#Shifting',
    description: 'Local room, flat, house & office furniture shifting helpers',
    helperCount: 0,
  },
  {
    id: 'tutor',
    masterCategory: 'other_custom',
    nameEn: 'Tuition & School Teacher',
    nameHi: 'होम ट्यूटर और स्कूल शिक्षक',
    nameGu: 'હોમ ટ્યુટર અને સ્કૂલ શિક્ષક',
    iconName: 'GraduationCap',
    tag: '#HomeTutor',
    description: 'Nursery to 12th home tuition, coaching classes & exam preparation',
    helperCount: 0,
  },
  {
    id: 'study_project',
    masterCategory: 'other_custom',
    nameEn: 'Project & Study Help',
    nameHi: 'प्रोजेक्ट, असाइनमेंट और पढ़ाई में मदद',
    nameGu: 'પ્રોજેક્ટ, અસાઇનમેન્ટ અને અભ્યાસમાં મદદ',
    iconName: 'BookOpen',
    tag: '#StudyHelp',
    description: 'School/college assignments, models, notes & exam study partner',
    helperCount: 0,
  },
  {
    id: 'computer_spoken_english',
    masterCategory: 'other_custom',
    nameEn: 'Computer & Spoken English Classes',
    nameHi: 'कंप्यूटर और स्पोकन इंग्लिश',
    nameGu: 'કમ્પ્યુટર અને સ્પોકન ઇંગ્લિશ',
    iconName: 'Languages',
    tag: '#SpokenEnglish',
    description: 'Basic computer, Tally, coding classes, spoken English & IELTS',
    helperCount: 0,
  },
  {
    id: 'music_dance_art',
    masterCategory: 'other_custom',
    nameEn: 'Music, Dance & Art Teacher',
    nameHi: 'संगीत, गरबा/डांस और ड्राइंग शिक्षक',
    nameGu: 'સંગીત, ગરબા/ડાન્સ અને ડ્રોઇંગ શિક્ષક',
    iconName: 'Music',
    tag: '#MusicDanceArt',
    description: 'Guitar, keyboard, singing, garba/dance, painting & craft classes',
    helperCount: 0,
  },
  {
    id: 'cricket',
    masterCategory: 'other_custom',
    nameEn: 'Cricket Partner & Team',
    nameHi: 'बॉक्स क्रिकेट और टीम प्लेयर्स',
    nameGu: 'બોક્સ ક્રિકેટ અને ટીમ પ્લેયર્સ',
    iconName: 'Trophy',
    tag: '#Cricket',
    description: 'Need players for box cricket, turf match or morning net practice',
    helperCount: 0,
  },
  {
    id: 'badminton',
    masterCategory: 'other_custom',
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
    masterCategory: 'other_custom',
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
    masterCategory: 'other_custom',
    nameEn: 'Running, Cycling & Yoga Partner',
    nameHi: 'मॉर्निंग रनिंग, साइकिलिंग और योगा साथी',
    nameGu: 'મોર્નિંગ રનિંગ, સાયકલિંગ અને યોગા સાથી',
    iconName: 'Footprints',
    tag: '#RunningYoga',
    description: 'Morning run, jogging, cycling group or park yoga instructor/buddy',
    helperCount: 0,
  },
  {
    id: 'food_service',
    masterCategory: 'other_custom',
    nameEn: 'Food',
    nameHi: 'फूड / खाना (Food)',
    nameGu: 'ફૂડ / જમવાનું (Food)',
    iconName: 'Utensils',
    tag: '#Food',
    description: 'Home-cooked meals, local food delivery, snacks & fresh meals',
    helperCount: 0,
  },
  {
    id: 'tiffin_service',
    masterCategory: 'other_custom',
    nameEn: 'Tiffin',
    nameHi: 'टिफिन सर्विस (Tiffin)',
    nameGu: 'ટિફિન સર્વિસ (Tiffin)',
    iconName: 'Utensils',
    tag: '#Tiffin',
    description: 'Daily home-style lunch & dinner tiffin service for students & families',
    helperCount: 0,
  },
  {
    id: 'grocery_delivery',
    masterCategory: 'other_custom',
    nameEn: 'Grocery',
    nameHi: 'ग्रोसरी / किराना (Grocery)',
    nameGu: 'ગ્રોસરી / કરિયાણું (Grocery)',
    iconName: 'ShoppingBag',
    tag: '#Grocery',
    description: 'Kirana store items, daily household provisions & ration delivery',
    helperCount: 0,
  },
  {
    id: 'fruits_seller',
    masterCategory: 'other_custom',
    nameEn: 'Fruits',
    nameHi: 'ताज़े फल (Fruits)',
    nameGu: 'તાજા ફળો (Fruits)',
    iconName: 'Heart',
    tag: '#Fruits',
    description: 'Fresh seasonal fruits vendor & home fruit basket delivery',
    helperCount: 0,
  },
  {
    id: 'milk_dairy',
    masterCategory: 'other_custom',
    nameEn: 'Milk',
    nameHi: 'दूध व डेयरी (Milk)',
    nameGu: 'દૂધ અને ડેરી (Milk)',
    iconName: 'Coffee',
    tag: '#MilkDairy',
    description: 'Morning fresh milk, paneer, curd, buttermilk & dairy delivery',
    helperCount: 0,
  },
  {
    id: 'vegetables_seller',
    masterCategory: 'other_custom',
    nameEn: 'Vegetables',
    nameHi: 'हरी सब्जियां (Vegetables)',
    nameGu: 'લીલા શાકભાજી (Vegetables)',
    iconName: 'Sparkles',
    tag: '#Vegetables',
    description: 'Fresh daily farm vegetables & local sabzi vendor delivery',
    helperCount: 0,
  },
  {
    id: 'other',
    masterCategory: 'other_custom',
    nameEn: 'Other / Custom Category',
    nameHi: 'कोई भी अन्य लोकल हुनर या आपकी ज़रूरत',
    nameGu: 'કોઈપણ અન્ય લોકલ હુનર કે તમારી જરૂરિયાત',
    iconName: 'PlusCircle',
    tag: '#OtherService',
    description: 'Any other local skill, custom service, shop or community requirement',
    helperCount: 0,
  },
];

export function getCategoryName(category: CategoryItem | undefined, lang: Language): string {
  if (!category) return '';
  switch (lang) {
    case 'GU':
      return category.nameGu || category.nameHi || category.nameEn;
    case 'HI':
      return category.nameHi || category.nameEn;
    default:
      return category.nameEn;
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
  cab: 'cab_auto_driver',
  auto: 'auto_rickshaw',
  driver: 'private_driver',
  taxi: 'taxi_service',
  tempo: 'tempo_packers',
  truck: 'truck_transport',
  shifting: 'home_office_shifting',
  food: 'food_service',
  tiffin: 'tiffin_service',
  grocery: 'grocery_delivery',
  fruits: 'fruits_seller',
  milk: 'milk_dairy',
  vegetables: 'vegetables_seller',
  vegitables: 'vegetables_seller',
  parcel: 'parcel_delivery',
  courier: 'courier_service',
  local_delivery: 'delivery',
  puncture: 'puncture_repair',
  battery: 'battery_jumpstart',
  towing: 'towing_service',
  shopping: 'shopping_help',
  errands: 'daily_errands_sub',
  beauty_parlour: 'beautician',
  tiffin_catering: 'catering_event',
  computer_mobile: 'computer_laptop',
  cctv_security: 'cctv_wifi',
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
    if (clean.includes('pest') || clean.includes('termite') || clean.includes('tank clean') || clean.includes('पेस्ट') || clean.includes('टंकी सफाई') || clean.includes('પેસ્ટ') || clean.includes('જંતુનાશક')) {
      return { categoryId: 'pest_control', customCategoryName: '' };
    }
    if (clean.includes('maid') || clean.includes('cook') || clean.includes('kaamwali') || clean.includes('kamwali') || clean.includes('rasoiya') || clean.includes('कामवाल') || clean.includes('रसोइया') || clean.includes('કામવાળા') || clean.includes('રસોઈયા')) {
      return { categoryId: 'maid_cook', customCategoryName: '' };
    }
    if (clean.includes('clean') || clean.includes('housekeep') || clean.includes('सफाई') || clean.includes('સફાઈ')) {
      return { categoryId: 'cleaning', customCategoryName: '' };
    }

    // Group 3: CCTV, Mobile & Laptop Repair
    if (clean.includes('cctv') || clean.includes('wifi') || clean.includes('wi-fi') || clean.includes('सीसीटीवी') || clean.includes('वाई-फाई')) {
      return { categoryId: 'cctv_wifi', customCategoryName: '' };
    }
    if (clean.includes('mobile repair') || clean.includes('phone repair') || clean.includes('मोबाइल रिपेयर') || clean.includes('મોબાઇલ રિપેર')) {
      return { categoryId: 'mobile_repair', customCategoryName: '' };
    }
    if (clean.includes('laptop') || clean.includes('computer repair') || clean.includes('pc repair') || clean.includes('लैपटॉप') || clean.includes('कंप्यूटर रिपेयर')) {
      return { categoryId: 'computer_laptop', customCategoryName: '' };
    }

    // Group 3B: Hospital & Medical Help
    if (clean.includes('home nurse') || clean.includes('patient care') || clean.includes('nursing') || clean.includes('होम नर्स') || clean.includes('હોમ નર્સ')) {
      return { categoryId: 'medical_nurse', customCategoryName: '' };
    }
    if (clean.includes('pharmacy') || clean.includes('chemist') || clean.includes('मेडिकल स्टोर') || clean.includes('દવા')) {
      return { categoryId: 'medical_pharmacy', customCategoryName: '' };
    }
    if (clean.includes('physio') || clean.includes('फिजियोथेरेपी') || clean.includes('ફિઝિયોથેરાપી')) {
      return { categoryId: 'physiotherapy', customCategoryName: '' };
    }
    if (clean.includes('lab test') || clean.includes('sample collection') || clean.includes('pathology') || clean.includes('लैब टेस्ट') || clean.includes('લેબ ટેસ્ટ')) {
      return { categoryId: 'lab_test', customCategoryName: '' };
    }
    if (clean.includes('ambulance') || clean.includes('एम्बुलेंस') || clean.includes('એમ્બ્યુલન્સ')) {
      return { categoryId: 'ambulance_help', customCategoryName: '' };
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

    // Group 6: Cab & Travel, Transport & Moving, Food & Grocery
    if (clean.includes('packers') || clean.includes('movers') || clean.includes('पैकर्स') || clean.includes('પેકર્સ')) {
      return { categoryId: 'packers_movers', customCategoryName: '' };
    }
    if (clean.includes('shifting') || clean.includes('शिफ्टिंग') || clean.includes('શિફ્ટિંગ')) {
      return { categoryId: 'home_office_shifting', customCategoryName: '' };
    }
    if (clean.includes('truck') || clean.includes('ट्रक') || clean.includes('ટ્રક')) {
      return { categoryId: 'truck_transport', customCategoryName: '' };
    }
    if (clean.includes('tempo') || clean.includes('chota hathi') || clean.includes('टेम्पो') || clean.includes('ટેમ્પો')) {
      return { categoryId: 'tempo_packers', customCategoryName: '' };
    }
    if (clean.includes('car rental') || clean.includes('किराये पर कार') || clean.includes('ભાડે કાર')) {
      return { categoryId: 'car_rental', customCategoryName: '' };
    }
    if (clean.includes('taxi') || clean.includes('टैक्सी') || clean.includes('ટેક્સી')) {
      return { categoryId: 'taxi_service', customCategoryName: '' };
    }
    if (clean.includes('auto') || clean.includes('rickshaw') || clean.includes('ऑटो') || clean.includes('रिक्शा') || clean.includes('રિક્ષા')) {
      return { categoryId: 'auto_rickshaw', customCategoryName: '' };
    }
    if (clean.includes('private driver') || clean === 'driver' || clean.includes('प्राइवेट ड्राइवर') || clean.includes('પ્રાઇવેટ ડ્રાઇવર')) {
      return { categoryId: 'private_driver', customCategoryName: '' };
    }
    if (clean.includes('cab') || clean.includes('driver') || clean.includes('कैब') || clean.includes('ड्राइवर') || clean.includes('ડ્રાઇવર')) {
      return { categoryId: 'cab_auto_driver', customCategoryName: '' };
    }
    if (clean.includes('tiffin') || clean.includes('टिफिन') || clean.includes('ટિફિન')) {
      return { categoryId: 'tiffin_service', customCategoryName: '' };
    }
    if (clean.includes('grocery') || clean.includes('kirana') || clean.includes('ग्रोसरी') || clean.includes('किराना') || clean.includes('કરિયાણું')) {
      return { categoryId: 'grocery_delivery', customCategoryName: '' };
    }
    if (clean.includes('fruit') || clean.includes('फल') || clean.includes('ફળો')) {
      return { categoryId: 'fruits_seller', customCategoryName: '' };
    }
    if (clean.includes('milk') || clean.includes('dairy') || clean.includes('दूध') || clean.includes('डेयरी') || clean.includes('દૂધ')) {
      return { categoryId: 'milk_dairy', customCategoryName: '' };
    }
    if (clean.includes('vegetable') || clean.includes('vegitable') || clean.includes('sabzi') || clean.includes('सब्जी') || clean.includes('सब्जियां') || clean.includes('શાકભાજી')) {
      return { categoryId: 'vegetables_seller', customCategoryName: '' };
    }
    if (clean.includes('food') || clean.includes('फूड') || clean.includes('खाना') || clean.includes('ફૂડ')) {
      return { categoryId: 'food_service', customCategoryName: '' };
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
    masterCategory: profile.masterCategory || (matched ? matched.masterCategory : 'other_custom'),
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

/**
 * Colloquial Hinglish / Hindi / Gujarati search synonyms for every sub-category
 * so local users typing everyday terms (e.g. "bijli", "nal", "mistri", "riksha", "dawa", "padhai")
 * immediately find the right category and service experts.
 */
export const CATEGORY_SEARCH_SYNONYMS: Record<string, string[]> = {
  plumber: ['nal', 'pipe', 'toti', 'pani', 'water tank', 'tanki', 'bathroom', 'tap', 'leakage', 'plumbing', 'mistri', 'motor', 'sanitary', 'flush', 'geyser pipe'],
  electrician: ['bijli', 'light', 'fan', 'pankha', 'wire', 'wiring', 'switch', 'board', 'inverter', 'mcb', 'fuse', 'current', 'meter', 'cooler', 'geyser', 'led', 'tube light', 'bijli mistri'],
  ac_repair: ['ac', 'fridge', 'ro', 'water purifier', 'aquaguard', 'washing machine', 'cooler', 'microwave', 'geyser', 'gas filling', 'cooling', 'refrigerator', 'appliance'],
  carpenter: ['furniture', 'wood', 'lakdi', 'suthar', 'badhai', 'darwaza', 'door', 'lock', 'kundi', 'bed', 'palang', 'almari', 'cupboard', 'wardrobe', 'kitchen', 'table', 'chair', 'sofa'],
  painter: ['paint', 'color', 'colour', 'putai', 'rang', 'pop', 'wall putty', 'waterproofing', 'polish', 'distemper', 'wallpaper'],
  mason: ['mistri', 'rajmistri', 'kadiya', 'kadiyo', 'tiles', 'marble', 'granite', 'plaster', 'cement', 'brick', 'construction', 'civil', 'chuna', 'deewar', 'flooring'],
  maid_cook: ['maid', 'kaamwali', 'kamwali', 'bai', 'cook', 'rasoiya', 'khana banane wali', 'bartan', 'jhadu', 'pocha', 'house maid', 'cooking'],
  cleaning: ['safai', 'jhadu', 'pocha', 'housekeeping', 'bathroom cleaning', 'sofa cleaning', 'deep cleaning', 'home cleaning'],
  pest_control: ['pest', 'termite', 'deemak', 'cockroach', 'khatmal', 'machhar', 'rat', 'chuha', 'tank cleaning', 'pani ki tanki', 'sanitization', 'spray', 'jantunashak'],
  tailor: ['darzi', 'silai', 'kapde', 'blouse', 'suit', 'kurti', 'lehenga', 'pant', 'shirt', 'alteration', 'fitting', 'boutique', 'pico', 'fall', 'embroidery'],
  beautician: ['parlour', 'parlor', 'salon', 'makeup', 'bridal', 'facial', 'waxing', 'threading', 'mehendi', 'haircut', 'spa', 'beauty', 'grooming', 'manicure', 'pedicure'],
  mehendi: ['mehndi', 'mehandi', 'henna', 'bridal mehendi', 'cone', 'shadi mehendi', 'karwa chauth'],
  pandit_pooja: ['pandit', 'pujari', 'pooja', 'puja', 'katha', 'havan', 'vastu', 'jyotish', 'astrologer', 'kundali', 'maharaj', 'griha pravesh', 'satyanarayan', 'shadi pandit'],
  photographer: ['photo', 'video', 'camera', 'cameraman', 'wedding shoot', 'pre wedding', 'drone', 'album', 'studio', 'birthday photo', 'reels shoot'],
  catering_event: ['halwai', 'caterer', 'catering', 'mandap', 'tent', 'decoration', 'dj', 'sound', 'waiter', 'party food', 'bhandara', 'rasoi', 'event'],
  web_developer: ['website', 'web', 'wordpress', 'shopify', 'ecommerce', 'domain', 'hosting', 'software', 'coding', 'programmer', 'landing page'],
  app_developer: ['mobile app', 'android app', 'ios app', 'flutter', 'react native', 'apk', 'play store', 'application'],
  graphic_video: ['graphic', 'logo', 'banner', 'poster', 'visiting card', 'pamphlet', 'video editing', 'reels editor', 'youtube editor', 'photoshop', 'canva', 'thumbnail'],
  digital_marketing: ['marketing', 'instagram ads', 'facebook ads', 'google ads', 'seo', 'social media', 'promotion', 'prachar', 'lead generation', 'youtube channel'],
  mobile_repair: ['mobile', 'phone', 'screen', 'display', 'combo', 'touch', 'battery', 'charging', 'iphone', 'android repair', 'folder', 'mobile shop'],
  computer_laptop: ['laptop', 'computer', 'pc', 'windows', 'ssd', 'ram', 'keyboard', 'printer', 'data recovery', 'software install', 'motherboard'],
  cctv_wifi: ['cctv', 'camera', 'wifi', 'wi-fi', 'router', 'internet', 'broadband', 'dvr', 'nvr', 'security camera', 'biometric', 'networking', 'fiber'],
  medical_nurse: ['nurse', 'nursing', 'patient', 'mariz', 'injection', 'dressing', 'drip', 'glucose', 'caretaker', 'attendant', 'home care', 'icu', 'ward boy'],
  medical_pharmacy: ['dawa', 'dawai', 'medicine', 'medical', 'medical store', 'chemist', 'pharmacy', 'tablet', 'syrup', 'insulin', 'surgical'],
  physiotherapy: ['physio', 'exercise', 'back pain', 'kamar dard', 'knee pain', 'ghutna', 'joint pain', 'paralysis', 'rehab', 'chiropractor', 'massage therapy'],
  lab_test: ['blood test', 'lab', 'pathology', 'sugar test', 'thyroid', 'cbc', 'urine test', 'sample', 'checkup', 'xray', 'ecg', 'report'],
  ambulance_help: ['ambulance', 'emergency', 'oxygen', 'hospital', 'stretcher', 'icu ambulance', '108', 'patient transport'],
  real_estate_broker: ['broker', 'property', 'makan', 'ghar', 'flat', 'room', 'pg', 'hostel', 'rent', 'kiraya', 'bhada', 'dukan', 'shop', 'plot', 'zameen', 'agent', 'dalal', '1bhk', '2bhk', '3bhk'],
  vehicle_broker: ['old car', 'second hand', 'purani gadi', 'used bike', 'used car', 'activa', 'tractor', 'auto deal', 'car bazaar'],
  rto_agent: ['rto', 'license', 'driving licence', 'dl', 'rc', 'rc transfer', 'puc', 'fastag', 'number plate', 'fitness', 'permit', 'challan'],
  loan_insurance: ['loan', 'home loan', 'personal loan', 'business loan', 'mudra', 'bima', 'insurance', 'lic', 'mediclaim', 'health insurance', 'bike insurance', 'car insurance', 'policy', 'finance', 'emi'],
  legal_docs: ['vakeel', 'lawyer', 'advocate', 'notary', 'stamp', 'rent agreement', 'kiraya karar', 'affidavit', 'aadhaar', 'pan card', 'passport', 'caste certificate', 'income certificate', 'ration card', 'jan seva', 'csc', 'e-seva'],
  cab_auto_driver: ['cab', 'ola', 'uber', 'gadi', 'car booking', 'outstation', 'airport', 'drop', 'travel'],
  auto_rickshaw: ['auto', 'rickshaw', 'riksha', 'chhakda', 'shuttle', 'school auto', 'three wheeler'],
  private_driver: ['driver', 'car driver', 'chote', 'acting driver', 'hourly driver', 'daily driver', 'permanent driver'],
  taxi_service: ['taxi', 'kali peeli', 'innova', 'ertiga', 'dzire', 'tour', 'yatra', 'picnic', 'bus'],
  car_rental: ['rent car', 'kiraye par gadi', 'wedding car', 'self drive', 'baraat car', 'traveller', 'tempo traveller'],
  tempo_packers: ['tempo', 'chota hathi', 'ace', 'bolero pickup', 'loading', 'laari', '3 wheeler tempo', 'saman dila'],
  truck_transport: ['truck', 'eicher', 'transport', 'lpt', 'container', 'heavy load', 'goods transport', 'transporter'],
  packers_movers: ['packers', 'movers', 'packing', 'saman pack', 'relocation', 'shifting company', 'carton'],
  home_office_shifting: ['shifting', 'ghar shift', 'room shift', 'office shift', 'saman uthana', 'labour', 'mazdoor', 'coolie', 'helper'],
  tutor: ['tuition', 'tution', 'tutor', 'teacher', 'sir', 'madam', 'padhai', 'school', 'coaching', 'class', 'maths', 'science', 'english', 'hindi', 'gujarati', 'commerce', 'accounts', 'home tutor'],
  study_project: ['project', 'assignment', 'homework', 'practical', 'journal', 'file', 'model', 'chart', 'college project', 'school project', 'notes', 'thesis'],
  computer_spoken_english: ['spoken english', 'english speaking', 'ielts', 'pte', 'computer class', 'tally', 'ccc', 'ms office', 'excel', 'typing'],
  music_dance_art: ['music', 'singing', 'guitar', 'piano', 'casio', 'harmonium', 'tabla', 'dance', 'garba', 'drawing', 'painting', 'sketching', 'art', 'craft', 'zumba'],
  cricket: ['cricket', 'bat', 'ball', 'turf', 'box cricket', 'match', 'tournament', 'bowler', 'batsman', 'team', 'football'],
  badminton: ['badminton', 'racket', 'shuttle', 'tennis', 'table tennis', 'tt', 'squash', 'pickleball'],
  gym_fitness: ['gym', 'workout', 'fitness', 'trainer', 'weight loss', 'bodybuilding', 'exercise', 'crossfit'],
  running_yoga: ['running', 'jogging', 'morning walk', 'cycling', 'cycle', 'yoga', 'pranayama', 'meditation', 'aerobics'],
  chai_coffee: ['chai', 'tea', 'coffee', 'tapri', 'cafe', 'gup shup', 'baatchit', 'hangout', 'dost', 'friend'],
  companion: ['walk', 'evening walk', 'sair', 'park', 'movie', 'outing', 'companion', 'sathi'],
  board_games: ['chess', 'shatranj', 'ludo', 'carrom', 'cards', 'uno', 'board game', 'bgmi', 'gaming'],
  senior_help: ['senior citizen', 'buzurg', 'old age', 'dada', 'dadi', 'hospital companion', 'elderly', 'pension'],
  pet_walking: ['dog', 'puppy', 'cat', 'pet', 'kutta', 'dog walker', 'vet', 'pet food', 'pet sitting'],
  food_service: ['food', 'khana', 'meal', 'lunch', 'dinner', 'breakfast', 'nashta', 'paratha', 'thali', 'roti', 'sabji', 'snacks', 'fast food', 'home food'],
  tiffin_service: ['tiffin', 'dabba', 'mess', 'monthly tiffin', 'student tiffin', 'ghar ka khana', 'lunch box'],
  grocery_delivery: ['grocery', 'kirana', 'ration', 'rashan', 'atta', 'dal', 'chawal', 'oil', 'tel', 'sugar', 'chini', 'masala', 'general store', 'supermarket'],
  fruits_seller: ['fruit', 'phal', 'fal', 'apple', 'seb', 'banana', 'kela', 'mango', 'aam', 'papaya', 'pomegranate', 'anar', 'coconut', 'nariyal'],
  milk_dairy: ['milk', 'doodh', 'dudh', 'amul', 'dairy', 'paneer', 'dahi', 'curd', 'chaas', 'buttermilk', 'ghee', 'butter', 'cheese', 'shrikhand'],
  vegetables_seller: ['vegetable', 'vegitable', 'sabzi', 'sabji', 'shakbhaji', 'bhaji', 'aloo', 'pyaz', 'tamatar', 'onion', 'potato', 'tomato', 'green veg', 'mandi'],
  parcel_delivery: ['parcel', 'packet', 'box', 'bhejna', 'saman bhejna', 'porter', 'dunzo'],
  courier_service: ['courier', 'post', 'speed post', 'dtdc', 'bluedart', 'delhivery', 'maruti courier', 'document send'],
  pickup_drop: ['pickup', 'drop', 'key', 'chabi', 'charger', 'tiffin drop', 'document pickup', 'forgot item', 'lana lejana'],
  delivery: ['delivery', 'delivery boy', 'rider', 'local delivery', 'home delivery', 'shop delivery'],
  mechanic: ['mechanic', 'garage', 'gadi kharab', 'bike repair', 'car repair', 'scooter', 'activa', 'engine', 'clutch', 'brake', 'wire', 'service', 'breakdown'],
  puncture_repair: ['puncture', 'panchar', 'tyre', 'tire', 'tube', 'tubeless', 'hawa', 'air', 'stepney', 'wheel'],
  battery_jumpstart: ['battery', 'jumpstart', 'jump start', 'self', 'car start', 'exide', 'amaron', 'dead battery', 'charging'],
  towing_service: ['towing', 'toing', 'crane', 'tow truck', 'accident', 'breakdown recovery', 'pulling'],
  shopping_help: ['shopping', 'bazar', 'market', 'kharidari', 'saman lana', 'festival shopping', 'clothes shopping'],
  medicine_pickup: ['dawa lana', 'medicine pickup', 'urgent medicine', 'rat ko dawai', 'chemist pickup', 'prescription'],
  personal_helper: ['helper', 'assistant', 'bank work', 'post office', 'hospital line', 'form fill', 'companion help', 'ek ghante ka kaam'],
  daily_errands_sub: ['errand', 'chote mote kaam', 'bill pay', 'light bill', 'xerox', 'photocopy', 'printout', 'laundry', 'istri', 'iron', 'press', 'queue', 'line'],
  other: ['other', 'custom', 'anya', 'baki', 'kuch aur', 'general', 'help'],
};

export function matchesCategorySearch(cat: CategoryItem, rawQuery: string): boolean {
  const q = (rawQuery || '').toLowerCase().trim();
  if (!q) return true;

  if (
    cat.id.toLowerCase().includes(q) ||
    cat.nameEn.toLowerCase().includes(q) ||
    cat.nameHi.toLowerCase().includes(q) ||
    (cat.nameGu && cat.nameGu.toLowerCase().includes(q)) ||
    cat.description.toLowerCase().includes(q) ||
    cat.tag.toLowerCase().includes(q)
  ) {
    return true;
  }

  const synonyms = CATEGORY_SEARCH_SYNONYMS[cat.id];
  if (synonyms && synonyms.some(syn => syn.includes(q) || q.includes(syn))) {
    return true;
  }

  return false;
}

