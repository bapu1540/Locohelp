import { Language } from '../types';

export type MasterCategoryId = 'all' | 'utility_emergency' | 'sports_fitness' | 'social_casual' | 'daily_errands';

export interface MasterCategory {
  id: MasterCategoryId;
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
    id: 'utility_emergency',
    nameEn: 'Utility & Emergency',
    nameHi: 'यूटिलिटी व आपातकालीन',
    nameGu: 'યુટિલિટી અને ઇમરજન્સી',
    nameMr: 'युटिलिटी व आपत्कालीन',
    nameBn: 'ইউটিলিটি ও জরুরি সেবা',
    nameTa: 'பயன்பாடு & அவசர உதவி',
    nameTe: 'యుటిలిటీ & అత్యవసరం',
    nameKn: 'ಯುಟಿಲಿಟಿ & ತುರ್ತು ಸೇವೆ',
    namePa: 'ਉਪਯੋਗਤਾ ਤੇ ਐਮਰਜੈਂਸੀ',
    nameMl: 'യൂട്ടിലിറ്റി & അത്യാഹിതം',
    iconName: 'Wrench',
    color: 'emerald',
    subtitleEn: 'Plumber, Electrician, Mechanic, AC Repair, Carpenter',
    subtitleHi: 'नल, बिजली, गाड़ी, एसी रिपेयर व बढ़ई',
    subtitleGu: 'પ્લમ્બર, ઇલેક્ટ્રિશિયન, મિકેનિક, એસી અને સુથાર',
  },
  {
    id: 'sports_fitness',
    nameEn: 'Sports & Fitness',
    nameHi: 'खेल व फिटनेस',
    nameGu: 'સ્પોર્ટ્સ અને ફિટનેસ',
    nameMr: 'खेळ व फिटनेस',
    nameBn: 'খেলাধুলো ও ফিটনেস',
    nameTa: 'விளையாட்டு & உடற்தகுதி',
    nameTe: 'క్రీడలు & ఫిట్‌నెస్',
    nameKn: 'ಕ್ರೀಡೆ ಮತ್ತು ಫಿಟ್‌ನೆಸ್',
    namePa: 'ਖੇਡਾਂ ਤੇ ਫਿਟਨੈਸ',
    nameMl: 'കായികവും ഫിറ്റ്നസും',
    iconName: 'Trophy',
    color: 'amber',
    subtitleEn: 'Cricket, Badminton, Gym partners, Running, Yoga',
    subtitleHi: 'क्रिकेट, बैडमिंटन, जिम पार्टनर, रनिंग व योग',
    subtitleGu: 'ક્રિકેટ, બેડમિન્ટન, જિમ પાર્ટનર, રનિંગ અને યોગા',
  },
  {
    id: 'social_casual',
    nameEn: 'Social & Casual',
    nameHi: 'सोशल व बातचीत',
    nameGu: 'સોશિયલ અને વાતચીત',
    nameMr: 'सोशल व संवाद',
    nameBn: 'সামাজিক ও আড্ডা',
    nameTa: 'சமூக & உரையாடல்',
    nameTe: 'సామాజిక & స్నేహం',
    nameKn: 'ಸಾಮಾಜಿಕ & ಸಂಭಾಷಣೆ',
    namePa: 'ਸਮਾਜਿਕ ਤੇ ਮਿਲਣੀ',
    nameMl: 'സോഷ്യൽ & സൗഹൃദം',
    iconName: 'Coffee',
    color: 'rose',
    subtitleEn: 'Chai/Coffee meetups, Companion, Board games, Pet walk',
    subtitleHi: 'चाय-कॉफी मीट्स, साथीदार, बोर्ड गेम्स व पेट वॉक',
    subtitleGu: 'ચા-કોફી મુલાકાત, સાથીદાર, રમતગમત અને પેટ વોક',
  },
  {
    id: 'daily_errands',
    nameEn: 'Daily Support & Errand',
    nameHi: 'दैनिक मदद व काम',
    nameGu: 'દૈનિક મદદ અને કામ',
    nameMr: 'दैनिक मदत व कामे',
    nameBn: 'দৈনন্দিন সাহায্য ও কাজ',
    nameTa: 'தினசரி உதவி & வேலைகள்',
    nameTe: 'రోజువారీ సహాయం & పనులు',
    nameKn: 'ದೈನಂದಿನ ನೆರವು & ಕೆಲಸಗಳು',
    namePa: 'ਰੋਜ਼ਾਨਾ ਮਦਦ ਤੇ ਕੰਮ',
    nameMl: 'ദൈനംദിന സഹായം & ജോലികൾ',
    iconName: 'HeartHandshake',
    color: 'blue',
    subtitleEn: 'Senior citizen care, Study/project help, Errands, Cleaning',
    subtitleHi: 'बुजुर्गों की मदद, पढ़ाई/प्रोजेक्ट, खरीदारी व सफाई',
    subtitleGu: 'વડીલોની મદદ, અભ્યાસ/પ્રોજેક્ટ, સામાન લાવવો અને સફાઈ',
  },
];

export interface CategoryItem {
  id: string;
  masterCategory: 'utility_emergency' | 'sports_fitness' | 'social_casual' | 'daily_errands';
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
  // 1. Utility & Emergency
  {
    id: 'plumber',
    masterCategory: 'utility_emergency',
    nameEn: 'Plumber',
    nameHi: 'नल व पाइप मिस्त्री',
    nameGu: 'પ્લમ્બર (નળ અને પાઇપ)',
    nameMr: 'प्लंबर (नळ दुरुस्ती)',
    nameBn: 'প্লাম্বার (পাইপ ও কল)',
    nameTa: 'பிளம்பர் (குழாய் பழுது)',
    nameTe: 'ప్లంబర్ (పైపుల మరమ్మతు)',
    nameKn: 'ಪ್ಲಂಬರ್ (ಪೈಪ್ ದುರಸ್ತಿ)',
    namePa: 'ਪਲੰਬਰ (ਨਲਕਾ ਤੇ ਪਾਈਪ)',
    nameMl: 'പ്ലംബർ (പൈപ്പ് റിപ്പയർ)',
    iconName: 'Wrench',
    tag: '#Plumber',
    description: 'Leaking pipe, tap repair, water tank cleaning, bathroom fittings',
    helperCount: 8,
  },
  {
    id: 'electrician',
    masterCategory: 'utility_emergency',
    nameEn: 'Electrician',
    nameHi: 'बिजली मिस्त्री',
    nameGu: 'ઇલેક્ટ્રિશિયન (વીજળી)',
    nameMr: 'इलेक्ट्रीशियन (वीज काम)',
    nameBn: 'ইলেকট্রিশিয়ান (বিদ্যুৎ)',
    nameTa: 'எலக்ட்ரீஷியன் (மின்சார வேலை)',
    nameTe: 'ఎలక్ట్రీషియన్ (విద్యుత్ పని)',
    nameKn: 'ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ (ವಿದ್ಯುತ್ ಕೆಲಸ)',
    namePa: 'ਬਿਜਲੀ ਮਿਸਤਰੀ',
    nameMl: 'ഇലക്ട്രീഷൻ (വൈദ്യുതി)',
    iconName: 'Zap',
    tag: '#Electrician',
    description: 'Wiring fault, switch board, fan repair, inverter connection',
    helperCount: 11,
  },
  {
    id: 'mechanic',
    masterCategory: 'utility_emergency',
    nameEn: 'Mechanic & Auto',
    nameHi: 'गाड़ी व पंचर मिस्त्री',
    nameGu: 'મિકેનિક અને પંચર',
    nameMr: 'मेकॅनिक व पंक्चर',
    nameBn: 'মেকানিক ও গাড়ি মেরামত',
    nameTa: 'மெக்கானிக் & பஞ்சர்',
    nameTe: 'మెకానిక్ & పంచర్',
    nameKn: 'ಮೆಕ್ಯಾನಿಕ್ & ಪಂಕ್ಚರ್',
    namePa: 'ਮਕੈਨਿਕ ਤੇ ਪੰਚਰ',
    nameMl: 'മെക്കാനിക്ക് & പങ്ക്‌ചർ',
    iconName: 'Car',
    tag: '#Mechanic',
    description: 'Car breakdown, bike puncture, battery jumpstart, towing',
    helperCount: 9,
  },
  {
    id: 'carpenter',
    masterCategory: 'utility_emergency',
    nameEn: 'Carpenter',
    nameHi: 'बढ़ई (लकड़ी काम)',
    nameGu: 'સુથાર (લાકડા કામ)',
    nameMr: 'सुतार (लाकूड काम)',
    nameBn: 'ছুতোর (কাঠের কাজ)',
    nameTa: 'தச்சர் (மர வேலை)',
    nameTe: 'వడ్రంగి (చెక్క పని)',
    nameKn: 'ಬಡಗಿ (ಮರದ ಕೆಲಸ)',
    namePa: 'ਤਰਖਾਣ (ਲੱਕੜ ਕੰਮ)',
    nameMl: 'ആശാരി (തടി പണി)',
    iconName: 'Hammer',
    tag: '#Carpenter',
    description: 'Door lock, bed repair, modular kitchen, furniture fitting',
    helperCount: 6,
  },
  {
    id: 'painter',
    masterCategory: 'utility_emergency',
    nameEn: 'Painter',
    nameHi: 'पेंटर व पुट्टी',
    nameGu: 'પેઇન્ટર અને કલરકામ',
    nameMr: 'पेंटर व रंगकाम',
    nameBn: 'পেইন্টার (রং মিস্ত্রি)',
    nameTa: 'பெயிண்டர் (வண்ணம் பூசுபவர்)',
    nameTe: 'పెయింటర్ (రంగులు)',
    nameKn: 'ಪೇಂಟರ್ (ಬಣ್ಣ ಹಚ್ಚುವವರು)',
    namePa: 'ਪੇਂਟਰ ਤੇ ਕਲਰਕਾਮ',
    nameMl: 'പെയിന്റർ (നിറം പൂശൽ)',
    iconName: 'Paintbrush',
    tag: '#Painter',
    description: 'Wall painting, waterproof putty, touchups, polish',
    helperCount: 5,
  },
  {
    id: 'ac_repair',
    masterCategory: 'utility_emergency',
    nameEn: 'AC & Appliances',
    nameHi: 'एसी व फ्रिज रिपेयर',
    nameGu: 'એસી અને ફ્રિજ રિપેર',
    nameMr: 'एसी व फ्रिज दुरुस्ती',
    nameBn: 'এসি ও ফ্রিজ মেরামত',
    nameTa: 'ஏசி & குளிர்சாதனப் பெட்டி',
    nameTe: 'ఏసీ & ఫ్రిజ్ రిపేర్',
    nameKn: 'ಎಸಿ ಮತ್ತು ರೆಫ್ರಿಜರೇಟರ್ ರಿಪೇರಿ',
    namePa: 'ਏਸੀ ਤੇ ਫਰਿੱਜ ਰਿਪੇਅਰ',
    nameMl: 'എസി & ഫ്രിഡ്ജ് റിപ്പയർ',
    iconName: 'Fan',
    tag: '#AC_Repair',
    description: 'AC gas refill, fridge cooling, washing machine, microwave',
    helperCount: 7,
  },
  {
    id: 'mason',
    masterCategory: 'utility_emergency',
    nameEn: 'Mason (Mistri)',
    nameHi: 'राजमिस्त्री (कंस्ट्रक्शन)',
    nameGu: 'કડિયો (બાંધકામ)',
    nameMr: 'गवंडी (बांधकाम)',
    nameBn: 'রাজমিস্ত্রি (নির্মাণ)',
    nameTa: 'கொத்தனார் (கட்டுமானம்)',
    nameTe: 'మేస్త్రీ (నిర్మాణం)',
    nameKn: 'ಮೇಸ್ತ್ರಿ (ಕಟ್ಟಡ ಕೆಲಸ)',
    namePa: 'ਰਾਜਮਿਸਤਰੀ (ਉਸਾਰੀ)',
    nameMl: 'മേസ്തിരി (നിർമ്മാണം)',
    iconName: 'HardHat',
    tag: '#Mason',
    description: 'Tiles fitting, wall plaster, floor work, cement repairs',
    helperCount: 4,
  },

  // 2. Sports & Fitness
  {
    id: 'cricket',
    masterCategory: 'sports_fitness',
    nameEn: 'Cricket Partner',
    nameHi: 'क्रिकेट साथी व टीम',
    nameGu: 'ક્રિકેટ પાર્ટનર અને ટીમ',
    nameMr: 'क्रिकेट साथीदार व संघ',
    nameBn: 'ক্রিকেট পার্টনার',
    nameTa: 'கிரிக்கெட் பார்ட்னர்',
    nameTe: 'క్రికెట్ భాగస్వామి',
    nameKn: 'ಕ್ರಿಕೆಟ್ ಜೊತೆಗಾರ',
    namePa: 'ਕ੍ਰਿਕਟ ਸਾਥੀ',
    nameMl: 'ക്രിക്കറ്റ് കൂട്ടാളി',
    iconName: 'Trophy',
    tag: '#Cricket',
    description: 'Weekend cricket match, bowler/batsman needed, turf team',
    helperCount: 14,
  },
  {
    id: 'badminton',
    masterCategory: 'sports_fitness',
    nameEn: 'Badminton & Tennis',
    nameHi: 'बैडमिंटन व टेनिस साथी',
    nameGu: 'બેડમિન્ટન અને ટેનિસ',
    nameMr: 'बॅडमिंटन व टेनिस',
    nameBn: 'ব্যাডমিন্টন সঙ্গী',
    nameTa: 'பேட்மிண்டன் பார்ட்னர்',
    nameTe: 'బ్యాడ్మింటన్ భాగస్వామి',
    nameKn: 'ಬ್ಯಾಡ್ಮಿಂಟನ್ ಜೊತೆಗಾರ',
    namePa: 'ਬੈਡਮਿੰਟਨ ਸਾਥੀ',
    nameMl: 'ബാഡ്മിന്റൺ കൂട്ടാളി',
    iconName: 'Activity',
    tag: '#Badminton',
    description: 'Morning court player, singles/doubles game companion',
    helperCount: 9,
  },
  {
    id: 'gym_fitness',
    masterCategory: 'sports_fitness',
    nameEn: 'Gym & Workout Buddy',
    nameHi: 'जिम व वर्कआउट साथी',
    nameGu: 'જિમ અને વર્કઆઉટ બડી',
    nameMr: 'जिम व व्यायाम जोडीदार',
    nameBn: 'জিম ও ব্যায়াম সঙ্গী',
    nameTa: 'ஜிம் ஒர்க்அவுட் பார்ட்னர்',
    nameTe: 'జిమ్ వర్కౌట్ మిత్రుడు',
    nameKn: 'ಜಿಮ್ ವರ್ಕೌಟ್ ಸ್ನೇಹಿತ',
    namePa: 'ਜਿਮ ਤੇ ਕਸਰਤ ਸਾਥੀ',
    nameMl: 'ജിം വ്യായാമ കൂട്ടാളി',
    iconName: 'Dumbbell',
    tag: '#Gym_Fitness',
    description: 'Weight lifting spotter, workout motivation partner, cardio buddy',
    helperCount: 12,
  },
  {
    id: 'running_yoga',
    masterCategory: 'sports_fitness',
    nameEn: 'Running & Yoga',
    nameHi: 'रनिंग व योग साथी',
    nameGu: 'રનિંગ અને યોગા સાથી',
    nameMr: 'रनिंग व योगा',
    nameBn: 'রানিং ও যোগব্যায়াম',
    nameTa: 'ஓட்டம் & யோகா',
    nameTe: 'రన్నింగ్ & యోగా',
    nameKn: 'ರನ್ನಿಂಗ್ ಮತ್ತು ಯೋಗ',
    namePa: 'ਦੌੜ ਤੇ ਯੋਗ',
    nameMl: 'റണ്ണിംഗ് & യോഗ',
    iconName: 'Footprints',
    tag: '#Running_Yoga',
    description: 'Morning 5km jog, park running group, open yoga sessions',
    helperCount: 8,
  },

  // 3. Social & Casual
  {
    id: 'chai_coffee',
    masterCategory: 'social_casual',
    nameEn: 'Chai & Coffee Meetup',
    nameHi: 'चाय-कॉफी व बातचीत',
    nameGu: 'ચા-કોફી મુલાકાત',
    nameMr: 'चहा-कॉफी गप्पा',
    nameBn: 'চা-কফি আড্ডা',
    nameTa: 'டீ/காபி அரட்டை',
    nameTe: 'టీ/కాఫీ కబుర్లు',
    nameKn: 'ಟೀ/ಕಾಫಿ ಮಾತುಕತೆ',
    namePa: 'ਚਾਹ-ਕੌਫੀ ਗੱਪਸ਼ੱਪ',
    nameMl: 'ചായ/കോഫി കൂട്ടായ്മ',
    iconName: 'Coffee',
    tag: '#Chai_Coffee',
    description: 'Evening tea discussions, friendly café chat, casual talks',
    helperCount: 15,
  },
  {
    id: 'companion',
    masterCategory: 'social_casual',
    nameEn: 'Companion & Walk',
    nameHi: 'शाम की वॉक व साथीदार',
    nameGu: 'સાંજની વોક અને સાથીદાર',
    nameMr: 'संध्याकाळचा वॉक व मित्र',
    nameBn: 'হাঁটাহাঁটির সঙ্গী',
    nameTa: 'மாலை நடைப்பயணத் தோழர்',
    nameTe: 'సాయంత్రం వాకింగ్ మిత్రుడు',
    nameKn: 'ಸಂಜೆ ವಾಕಿಂಗ್ ಜೊತೆಗಾರ',
    namePa: 'ਸ਼ਾਮ ਦੀ ਸੈਰ ਦਾ ਸਾਥੀ',
    nameMl: 'വൈകുന്നേര നടത്ത കൂട്ടാളി',
    iconName: 'Users',
    tag: '#Companion',
    description: 'Park evening walks, sharing neighborhood stories, companionship',
    helperCount: 10,
  },
  {
    id: 'board_games',
    masterCategory: 'social_casual',
    nameEn: 'Chess & Board Games',
    nameHi: 'शतरंज व बोर्ड गेम्स',
    nameGu: 'ચેસ અને બોર્ડ ગેમ્સ',
    nameMr: 'बुद्धिबळ व बोर्ड गेम्स',
    nameBn: 'দাবা ও ইনডোর গেম',
    nameTa: 'சதுரங்கம் & பலகை ஆட்டம்',
    nameTe: 'చదరంగం & బోర్డు ఆటలు',
    nameKn: 'ಚೆಸ್ ಮತ್ತು ಬೋರ್ಡ್ ಆಟಗಳು',
    namePa: 'ਸ਼ਤਰੰਜ ਤੇ ਬੋਰਡ ਖੇਡਾਂ',
    nameMl: 'ചെസ്സ് & ബോർഡ് ഗെയിമുകൾ',
    iconName: 'Smile',
    tag: '#Board_Games',
    description: 'Carrom, Chess, Ludo players, casual evening weekend games',
    helperCount: 7,
  },
  {
    id: 'pet_walking',
    masterCategory: 'social_casual',
    nameEn: 'Pet Walking & Care',
    nameHi: 'पेट वॉक व देखभाल',
    nameGu: 'પાલતુ પ્રાણી વોક અને સંભાળ',
    nameMr: 'पाळीव प्राणी वॉक व काळजी',
    nameBn: 'পোষা প্রাণী পরিচর্যা',
    nameTa: 'செல்லப்பிராணி பராமரிப்பு',
    nameTe: 'పెంపుడు జంతువుల వాకింగ్',
    nameKn: 'ಸಾಕುಪ್ರಾಣಿ ಆರೈಕೆ',
    namePa: 'ਪਾਲਤੂ ਜਾਨਵਰਾਂ ਦੀ ਸੈਰ',
    nameMl: 'പെറ്റ് വാക്കിംഗ് & കെയർ',
    iconName: 'Dog',
    tag: '#Pet_Walking',
    description: 'Dog walking buddy, weekend pet playdates, temporary care',
    helperCount: 6,
  },

  // 4. Daily Support & Errand
  {
    id: 'senior_help',
    masterCategory: 'daily_errands',
    nameEn: 'Senior Citizen Support',
    nameHi: 'बुजुर्ग सहायता व साथी',
    nameGu: 'વડીલ સહાય અને સાથીદાર',
    nameMr: 'ज्येष्ठ नागरिक मदत',
    nameBn: 'বয়স্কদের সেবা ও সাহায্য',
    nameTa: 'முதியோர் உதவி',
    nameTe: 'వృద్ధుల సహాయం',
    nameKn: 'ಹಿರಿಯ ನಾಗರಿಕರ ನೆರವು',
    namePa: 'ਬਜ਼ੁਰਗਾਂ ਦੀ ਸਹਾਇਤਾ',
    nameMl: 'മുതിർന്നവർക്കുള്ള സഹായം',
    iconName: 'HeartHandshake',
    tag: '#Senior_Help',
    description: 'Medicine purchase, doctor visit escort, bank form assistance',
    helperCount: 11,
  },
  {
    id: 'study_project',
    masterCategory: 'daily_errands',
    nameEn: 'Study & Project Help',
    nameHi: 'प्रोजेक्ट व पढ़ाई मदद',
    nameGu: 'પ્રોજેક્ટ અને અભ્યાસ મદદ',
    nameMr: 'प्रकल्प व अभ्यास मदत',
    nameBn: 'প্রজেক্ট ও পড়াশোনা সাহায্য',
    nameTa: 'படிப்பு & திட்ட உதவி',
    nameTe: 'ప్రాజెక్ట్ & స్టడీ హెల్ప్',
    nameKn: 'ಪ್ರಾಜೆಕ್ಟ್ & ಓದುವ ಸಹಾಯ',
    namePa: 'ਪ੍ਰੋਜੈਕਟ ਤੇ ਪੜ੍ਹਾਈ ਮਦਦ',
    nameMl: 'പ്രോജക്ട് & പഠന സഹായം',
    iconName: 'GraduationCap',
    tag: '#Study_Project',
    description: 'College project peer help, printout help, typing & study notes',
    helperCount: 8,
  },
  {
    id: 'cleaning',
    masterCategory: 'daily_errands',
    nameEn: 'Maid & Cleaning',
    nameHi: 'सफाई व घरेलू काम',
    nameGu: 'સફાઇ અને ઘરકામ',
    nameMr: 'सफाई व घरकाम',
    nameBn: 'পরিষ্কার ও গৃহকর্মী',
    nameTa: 'சுத்தம் & வீட்டு வேலை',
    nameTe: 'శుభ్రత & ఇంటి పని',
    nameKn: 'ಸ್ವಚ್ಛತೆ ಮತ್ತು ಮನೆಕೆಲಸ',
    namePa: 'ਸਫਾਈ ਤੇ ਘਰੇਲੂ ਕੰਮ',
    nameMl: 'ശുചീകരണം & വീട്ടുജോലി',
    iconName: 'Sparkles',
    tag: '#Cleaning',
    description: 'Deep home cleaning, bathroom scrubbing, kitchen, maid help',
    helperCount: 12,
  },
  {
    id: 'delivery',
    masterCategory: 'daily_errands',
    nameEn: 'Delivery & Errands',
    nameHi: 'सामान डिलीवरी व काम',
    nameGu: 'ડિલિવરી અને પરચૂરણ કામ',
    nameMr: 'डिलिव्हरी व कामे',
    nameBn: 'ডেলিভারি ও বাজার সদাই',
    nameTa: 'டெலிவரி & பொருட்கள்',
    nameTe: 'డెలివరీ & సామాగ్రి',
    nameKn: 'ಡೆಲಿವರಿ ಮತ್ತು ಸಾಮಗ್ರಿ',
    namePa: 'ਡਿਲੀਵਰੀ ਤੇ ਸਮਾਨ',
    nameMl: 'ഡെലിവറി & സാധനങ്ങൾ',
    iconName: 'Package',
    tag: '#Delivery',
    description: 'Local luggage shift, grocery pickup, tempo transport',
    helperCount: 10,
  },
  {
    id: 'tutor',
    masterCategory: 'daily_errands',
    nameEn: 'Tutor & Teacher',
    nameHi: 'ट्यूशन व पढ़ाई',
    nameGu: 'ટ્યુશન અને શિક્ષક',
    nameMr: 'ट्यूशन व शिक्षक',
    nameBn: 'টিউশন ও শিক্ষক',
    nameTa: 'டியூஷன் & ஆசிரியர்',
    nameTe: 'ట్యూషన్ & ఉపాధ్యాయులు',
    nameKn: 'ಟ್ಯೂಷನ್ ಮತ್ತು ಶಿಕ್ಷಕರು',
    namePa: 'ਟਿਊਸ਼ਨ ਤੇ ਅਧਿਆਪਕ',
    nameMl: 'ട്യൂഷൻ & അധ്യാപകൻ',
    iconName: 'BookOpen',
    tag: '#Tutor',
    description: 'School home tuition, maths, science, english lessons',
    helperCount: 6,
  },
  {
    id: 'other',
    masterCategory: 'daily_errands',
    nameEn: 'Other / Custom Category',
    nameHi: 'अन्य / खुद की केटेगरी (हॉस्पिटल, स्टोर आदि)',
    nameGu: 'અન્ય / કસ્ટમ કેટેગરી',
    nameMr: 'इतर / सानुकूल श्रेणी (हॉस्पिटल, स्टोअर इत्यादी)',
    nameBn: 'অন্যান্য / কাস্টম বিভাগ (হাসপাতাল, দোকান ইত্যাদি)',
    nameTa: 'மற்றவை / சொந்த வகை (மருத்துவமனை, கடை)',
    nameTe: 'ఇతర / సొంత కేటగిరీ (ఆసుపత్రి, షాప్)',
    nameKn: 'ಇತರ / ಸ್ವಂತ ವರ್ಗ (ಆಸ್ಪತ್ರೆ, ಅಂಗಡಿ)',
    namePa: 'ਹੋਰ / ਆਪਣੀ ਕੈਟੇਗਰੀ (ਹਸਪਤਾਲ, ਸਟੋਰ)',
    nameMl: 'മറ്റുള്ളവ / സ്വന്തം കാറ്റഗറി (ആശുപത്രി, സ്റ്റോർ)',
    iconName: 'PlusCircle',
    tag: '#Other',
    description: 'Register any custom business or hospital (e.g. Hospital, Medical Store, Clinic, Bakery, Shop, etc.)',
    helperCount: 15,
  },
];

export function getCategoryName(category: CategoryItem | undefined, lang: Language): string {
  if (!category) return '';
  switch (lang) {
    case 'HI': return category.nameHi || category.nameEn;
    case 'GU': return category.nameGu || category.nameEn;
    case 'MR': return category.nameMr || category.nameEn;
    case 'BN': return category.nameBn || category.nameEn;
    case 'TA': return category.nameTa || category.nameEn;
    case 'TE': return category.nameTe || category.nameEn;
    case 'KN': return category.nameKn || category.nameEn;
    case 'PA': return category.namePa || category.nameEn;
    case 'ML': return category.nameMl || category.nameEn;
    default: return category.nameEn;
  }
}

export function getMasterCategoryName(master: MasterCategory | undefined, lang: Language): string {
  if (!master) return '';
  switch (lang) {
    case 'HI': return master.nameHi || master.nameEn;
    case 'GU': return master.nameGu || master.nameEn;
    case 'MR': return master.nameMr || master.nameEn;
    case 'BN': return master.nameBn || master.nameEn;
    case 'TA': return master.nameTa || master.nameEn;
    case 'TE': return master.nameTe || master.nameEn;
    case 'KN': return master.nameKn || master.nameEn;
    case 'PA': return master.namePa || master.nameEn;
    case 'ML': return master.nameMl || master.nameEn;
    default: return master.nameEn;
  }
}

export function getMasterCategorySubtitle(master: MasterCategory | undefined, lang: Language): string {
  if (!master) return '';
  switch (lang) {
    case 'HI': return master.subtitleHi || master.subtitleEn;
    case 'GU': return master.subtitleGu || master.subtitleEn;
    default: return master.subtitleEn;
  }
}

export interface FreeHelperProfile {
  id: string;
  name: string;
  categoryId: string;
  masterCategory: 'utility_emergency' | 'sports_fitness' | 'social_casual' | 'daily_errands';
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
  govtIdUploaded?: boolean;
  shopPhotoUploaded?: boolean;
  idDocUrl?: string;
}

const STORAGE_KEY = 'locohelp_free_helper_profiles';

export const INITIAL_HELPERS: FreeHelperProfile[] = [
  // Utility & Emergency
  {
    id: 'h1',
    name: 'Ramesh Plumber & Pipe Works',
    categoryId: 'plumber',
    masterCategory: 'utility_emergency',
    phone: '+91 98765 43210',
    skills: ['Plumber', 'Pipe Fitting', 'Tank Cleaning', 'Bathroom Fittings'],
    area: 'Navrangpura',
    city: 'Ahmedabad',
    experience: '7 Years',
    distance: 0.8,
    rating: 4.9,
    completedTasks: 142,
    createdAt: new Date().toISOString(),
    isVerified: true,
    govtIdUploaded: true,
    shopPhotoUploaded: true,
  },
  {
    id: 'h2',
    name: 'Amit Electrician Services',
    categoryId: 'electrician',
    masterCategory: 'utility_emergency',
    phone: '+91 98112 34567',
    skills: ['Electrician', 'Short Circuit Wiring', 'Inverter Fitting', 'Fan Repair'],
    area: 'Maninagar',
    city: 'Ahmedabad',
    experience: '5 Years',
    distance: 1.4,
    rating: 4.8,
    completedTasks: 98,
    createdAt: new Date().toISOString(),
    isVerified: true,
    govtIdUploaded: true,
    shopPhotoUploaded: true,
  },
  {
    id: 'h3',
    name: 'Pappu Auto Garage & Puncture',
    categoryId: 'mechanic',
    masterCategory: 'utility_emergency',
    phone: '+91 98221 00998',
    skills: ['Mechanic', 'Bike Puncture', 'Battery Jumpstart', 'Emergency Towing'],
    area: 'Ring Road',
    city: 'Surat',
    experience: '10 Years',
    distance: 1.1,
    rating: 4.9,
    completedTasks: 210,
    createdAt: new Date().toISOString(),
    isVerified: true,
    govtIdUploaded: true,
    shopPhotoUploaded: true,
  },
  {
    id: 'h4',
    name: 'Mohan Lal Mistri',
    categoryId: 'carpenter',
    masterCategory: 'utility_emergency',
    phone: '+91 96543 21098',
    skills: ['Carpenter', 'Door Locks', 'Furniture'],
    area: 'Shanti Colony',
    experience: '8 Years',
    distance: 2.1,
    rating: 4.8,
    completedTasks: 63,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h5',
    name: 'Suresh AC Care',
    categoryId: 'ac_repair',
    masterCategory: 'utility_emergency',
    phone: '+91 99887 76655',
    skills: ['AC Repair', 'Gas Charging', 'Fridge'],
    area: 'Main Bazar',
    experience: '4 Years',
    distance: 2.3,
    rating: 4.6,
    completedTasks: 51,
    createdAt: new Date().toISOString(),
  },

  // Sports & Fitness
  {
    id: 'h7',
    name: 'Rahul Verma (Cricket All-Rounder)',
    categoryId: 'cricket',
    masterCategory: 'sports_fitness',
    phone: '+91 98223 11445',
    skills: ['All-rounder', 'Leather Ball', 'Turf Player', 'Weekend Match'],
    area: 'Sports Complex Ground',
    experience: '6 Years',
    distance: 1.2,
    rating: 4.9,
    completedTasks: 47,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h8',
    name: 'Vikram Singh (Gym & Fitness Partner)',
    categoryId: 'gym_fitness',
    masterCategory: 'sports_fitness',
    phone: '+91 98334 22556',
    skills: ['Weightlifting Spotter', 'Diet Guide', 'Calisthenics', 'Workout Buddy'],
    area: 'FitZone Gym Area',
    experience: '4 Years',
    distance: 0.9,
    rating: 4.8,
    completedTasks: 35,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h9',
    name: 'Pooja Patel (Badminton & Table Tennis)',
    categoryId: 'badminton',
    masterCategory: 'sports_fitness',
    phone: '+91 98445 33667',
    skills: ['Badminton Doubles', 'Morning Game', 'Table Tennis'],
    area: 'Club Sports Ground',
    experience: '5 Years',
    distance: 1.5,
    rating: 4.9,
    completedTasks: 29,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h9_running',
    name: 'Manish Rawat (Morning Runner & Marathoner)',
    categoryId: 'running',
    masterCategory: 'sports_fitness',
    phone: '+91 98119 44332',
    skills: ['5K/10K Pacer', 'Morning Jogging', 'Stamina Training'],
    area: 'City Lake Park',
    experience: '3 Years',
    distance: 0.8,
    rating: 4.9,
    completedTasks: 38,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h9_football',
    name: 'Sameer Khan (Football & Turf Games)',
    categoryId: 'football',
    masterCategory: 'sports_fitness',
    phone: '+91 98770 22110',
    skills: ['Football Striker', '7v7 Turf Match', 'Weekend Football'],
    area: 'Greenfield Arena',
    experience: '5 Years',
    distance: 1.7,
    rating: 4.8,
    completedTasks: 42,
    createdAt: new Date().toISOString(),
  },

  // Social & Casual
  {
    id: 'h10',
    name: 'Chai Enthusiasts Group (Ankit)',
    categoryId: 'chai_coffee',
    masterCategory: 'social_casual',
    phone: '+91 98556 44778',
    skills: ['Tea Meets', 'Startup Talks', 'Evening Walk', 'Chill Vibe'],
    area: 'Tapri Point & Central Square',
    experience: 'Active Member',
    distance: 0.6,
    rating: 4.9,
    completedTasks: 62,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h11',
    name: 'Devraj Joshi (Chess & Book Club)',
    categoryId: 'companion',
    masterCategory: 'social_casual',
    phone: '+91 98667 55889',
    skills: ['Evening Walk Companion', 'Chess Player', 'Book Club'],
    area: 'Rose Garden Colony',
    experience: 'Friendly Host',
    distance: 1.3,
    rating: 4.8,
    completedTasks: 41,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h11_gaming',
    name: 'Karan Malhotra (Gaming & Board Games)',
    categoryId: 'gaming',
    masterCategory: 'social_casual',
    phone: '+91 98321 88776',
    skills: ['PS5 Gaming', 'Catan', 'Monopoly', 'LAN Parties'],
    area: 'University Hostel Road',
    experience: 'Avid Gamer',
    distance: 1.1,
    rating: 4.9,
    completedTasks: 34,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h11_pet',
    name: 'Sneha & Bruno (Dog Walkers & Pet Lovers)',
    categoryId: 'pet_care',
    masterCategory: 'social_casual',
    phone: '+91 98990 11223',
    skills: ['Dog Walking', 'Pet Playdates', 'Foster Care'],
    area: 'South City Greens',
    experience: 'Pet Parent',
    distance: 0.7,
    rating: 5.0,
    completedTasks: 53,
    createdAt: new Date().toISOString(),
  },

  // Daily Support & Errand
  {
    id: 'h6',
    name: 'Sunita Devi (Home Care & Maid)',
    categoryId: 'cleaning',
    masterCategory: 'daily_errands',
    phone: '+91 91234 56780',
    skills: ['House Cleaning', 'Utensils', 'Deep Cleaning'],
    area: 'Green Park',
    experience: '6 Years',
    distance: 1.1,
    rating: 4.9,
    completedTasks: 110,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h12',
    name: 'Aakash Mehta (Student Volunteer)',
    categoryId: 'senior_help',
    masterCategory: 'daily_errands',
    phone: '+91 98778 66990',
    skills: ['Elder Care Assist', 'Medicine Delivery', 'Bank Work'],
    area: 'Civil Lines',
    experience: '3 Years Volunteer',
    distance: 0.7,
    rating: 5.0,
    completedTasks: 74,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h13',
    name: 'Rohan Express Delivery',
    categoryId: 'delivery',
    masterCategory: 'daily_errands',
    phone: '+91 98889 77001',
    skills: ['Local Luggage', 'Grocery Pickup', 'Bike Delivery'],
    area: 'Sector 9 Hub',
    experience: '3 Years',
    distance: 1.4,
    rating: 4.7,
    completedTasks: 88,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h14_tutor',
    name: 'Pooja Mathur (Home Tutor - Math & Science)',
    categoryId: 'tutor',
    masterCategory: 'daily_errands',
    phone: '+91 98450 66778',
    skills: ['Class 6-10 Math', 'Science Concepts', 'Doubt Solving'],
    area: 'Sector 15 Campus',
    experience: '4 Years',
    distance: 1.0,
    rating: 4.9,
    completedTasks: 45,
    createdAt: new Date().toISOString(),
  },
];

export function getFreeHelperProfiles(): FreeHelperProfile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const custom: FreeHelperProfile[] = data ? JSON.parse(data) : [];
    // Sort so verified profiles appear at the top
    custom.sort((a, b) => {
      const aVer = (a.isVerified || a.govtIdUploaded || a.idDocUrl) ? 1 : 0;
      const bVer = (b.isVerified || b.govtIdUploaded || b.idDocUrl) ? 1 : 0;
      return bVer - aVer;
    });
    return custom;
  } catch {
    return [];
  }
}

export function saveFreeHelperProfile(profile: Omit<FreeHelperProfile, 'id' | 'rating' | 'completedTasks' | 'createdAt' | 'masterCategory'> & { masterCategory?: 'utility_emergency' | 'sports_fitness' | 'social_casual' | 'daily_errands'; govtIdUploaded?: boolean; idDocUrl?: string; isVerified?: boolean }): FreeHelperProfile {
  const matched = CATEGORIES.find(c => c.id === profile.categoryId);
  const isVerifiedDoc = Boolean(profile.govtIdUploaded || profile.idDocUrl || profile.isVerified);
  const newProfile: FreeHelperProfile = {
    ...profile,
    masterCategory: profile.masterCategory || (matched ? matched.masterCategory : 'utility_emergency'),
    id: 'hp_' + Date.now(),
    rating: 5.0,
    completedTasks: isVerifiedDoc ? 10 : 0,
    isVerified: isVerifiedDoc,
    govtIdUploaded: isVerifiedDoc,
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const list: FreeHelperProfile[] = existing ? JSON.parse(existing) : [];
    list.unshift(newProfile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save helper profile', e);
  }

  return newProfile;
}

