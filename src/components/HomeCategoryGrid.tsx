import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Screen } from '../types';
import { useLanguage } from '../i18n';
import {
  CATEGORIES,
  FreeHelperProfile,
  MasterCategoryId,
  getFreeHelperProfiles,
  normalizeCategorySlug,
} from '../data/categories';

interface HomeCategoryGridProps {
  onNavigate: (screen: Screen) => void;
  onSelectCategory?: (category: string) => void;
}

interface MainCatConfig {
  key: string;
  masterId: MasterCategoryId;
  ic: string;
  bg: string;
  bd: string;
  tx: string;
  name: [string, string, string]; // [English, Hindi, Gujarati]
  cardLines: [[string, string], [string, string], [string, string]]; // Strict 2-line label for uniform compact box size
  iconPaths: React.ReactNode;
  subs: {
    id: string;
    label: [string, string, string];
  }[];
}

const MAIN_CATS: MainCatConfig[] = [
  // 1. Home Services
  {
    key: 'home',
    masterId: 'home_repair',
    ic: '#059669',
    bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
    bd: '#6ee7b7',
    tx: '#064e3b',
    name: [
      'Home Services',
      'होम सर्विस',
      'હોમ સર્વિસ',
    ],
    cardLines: [
      ['Home', 'Services'],
      ['होम', 'सर्विस'],
      ['હોમ', 'સર્વિસ'],
    ],
    iconPaths: (
      <>
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </>
    ),
    subs: [
      { id: 'plumber', label: ['Plumber', 'प्लंबर (नल और पाइप रिपेयर)', 'નળ અને પાઇપ રિપેર'] },
      { id: 'electrician', label: ['Electrician', 'इलेक्ट्रीशियन (बिजली रिपेयर)', 'વીજળી રિપેર'] },
      { id: 'ac_repair', label: ['AC, Fridge & RO Repair', 'AC, फ्रिज और RO रिपेयर', 'AC, ફ્રિજ અને RO રિપેર'] },
      { id: 'carpenter', label: ['Carpenter', 'बढ़ई / कारपेंटर (फर्नीचर)', 'સુથાર / કાર્પેન્ટર - ફર્નિચર'] },
      { id: 'painter', label: ['Painter', 'पेंटर (रंगाई / POP)', 'પેઇન્ટર - કલરકામ / POP'] },
      { id: 'mason', label: ['Mason', 'राजमिस्त्री / मिस्त्री (निर्माण)', 'કડિયો / મિસ્ત્રી - બાંધકામ'] },
      { id: 'cleaning', label: ['Cleaning, Maid & Cook', 'घर की सफाई, कामवाली और रसोइया', 'ઘરની સફાઈ, કામવાળા અને રસોઈયા'] },
      { id: 'pest_control', label: ['Pest Control & Tank Cleaning', 'पेस्ट कंट्रोल और पानी की टंकी सफाई', 'પેસ્ટ કંટ્રોલ અને પાણીની ટાંકી સફાઈ'] },
    ],
  },
  // 2. Salon & Events
  {
    key: 'care',
    masterId: 'personal_events',
    ic: '#db2777',
    bg: 'linear-gradient(135deg, #fdf2f8, #fce7f3)',
    bd: '#f9a8d4',
    tx: '#831843',
    name: [
      'Salon & Events',
      'सैलून व इवेंट',
      'સલૂન અને ઇવેન્ટ',
    ],
    cardLines: [
      ['Salon &', 'Events'],
      ['सैलून व', 'इवेंट'],
      ['સલૂન અને', 'ઇવેન્ટ'],
    ],
    iconPaths: (
      <>
        <circle cx="6" cy="6" r="3" />
        <path d="M8.12 8.12 12 12" />
        <path d="M20 4 8.12 15.88" />
        <circle cx="6" cy="18" r="3" />
        <path d="M14.8 14.8 20 20" />
      </>
    ),
    subs: [
      { id: 'tailor', label: ['Tailor & Boutique', 'दर्जी और बुटीक', 'દરજી અને બુટિક'] },
      { id: 'beautician', label: ['Beautician & Salon at Home', 'ब्यूटीशियन और होम सैलून', 'બ્યુટિશિયન અને હોમ સલૂન'] },
      { id: 'mehendi', label: ['Mehendi Artist', 'मेहंदी आर्टिस्ट', 'મહેંદી આર્ટિસ્ટ'] },
      { id: 'pandit_pooja', label: ['Pandit Ji & Pooja Path', 'पंडित जी / पूजा-पाठ और ज्योतिष', 'પંડિતજી / પૂજા-પાઠ અને જ્યોતિષ'] },
      { id: 'photographer', label: ['Photographer & Videographer', 'फोटोग्राफर और वीडियोग्राफर', 'ફોટોગ્રાફર અને વીડિયોગ્રાફર'] },
      { id: 'catering_event', label: ['Catering, Halwai & Event Helper', 'केटरिंग, हलवाई और इवेंट हेल्पर', 'કેટરિંગ, હલવાઈ અને ઇવેન્ટ હેલ્પર'] },
    ],
  },
  // 3. IT & Tech
  {
    key: 'it',
    masterId: 'it_tech',
    ic: '#4f46e5',
    bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
    bd: '#a5b4fc',
    tx: '#312e81',
    name: [
      'IT & Tech',
      'आईटी व टेक',
      'આઈટી અને ટેક',
    ],
    cardLines: [
      ['IT &', 'Tech'],
      ['आईटी व', 'टेक'],
      ['આઈટી', 'અને ટેક'],
    ],
    iconPaths: (
      <>
        <path d="m16 18 6-6-6-6" />
        <path d="m8 6-6 6 6 6" />
      </>
    ),
    subs: [
      { id: 'web_developer', label: ['Web Developer', 'वेबसाइट डेवलपर', 'વેબસાઇટ ડેવલપર'] },
      { id: 'app_developer', label: ['App Developer', 'मोबाइल ऐप डेवलपर', 'મોબાઇલ એપ ડેવલપર'] },
      { id: 'graphic_video', label: ['Graphic Designer & Video Editor', 'ग्राफिक डिज़ाइनर और रील्स/वीडियो एडिटर', 'ગ્રાફિક ડિઝાઇનર અને રીલ્સ/વીડિયો એડિટર'] },
      { id: 'digital_marketing', label: ['Digital Marketing & Social Media', 'डिजिटल मार्केटिंग, गूगल/इंस्टाग्राम एड्स', 'ડિજિટલ માર્કેટિંગ, ગૂગલ/ઇન્સ્ટાગ્રામ એડ્સ'] },
    ],
  },
  // 4. CCTV & Mobile
  {
    key: 'cctv_mobile',
    masterId: 'cctv_mobile',
    ic: '#2563eb',
    bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    bd: '#93c5fd',
    tx: '#1e3a8a',
    name: [
      'CCTV & Mobile',
      'CCTV व मोबाइल',
      'CCTV અને મોબાઇલ',
    ],
    cardLines: [
      ['CCTV &', 'Mobile'],
      ['CCTV व', 'मोबाइल'],
      ['CCTV અને', 'મોબાઇલ'],
    ],
    iconPaths: (
      <>
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </>
    ),
    subs: [
      { id: 'mobile_repair', label: ['Mobile Repair Technician', 'मोबाइल स्क्रीन और पार्ट्स रिपेयर', 'મોબાઇલ સ્ક્રીન અને પાર્ટ્સ રિપેર'] },
      { id: 'computer_laptop', label: ['Computer & Laptop Expert', 'कंप्यूटर और लैपटॉप रिपेयर', 'કમ્પ્યુટર અને લેપટોપ રિપેર'] },
      { id: 'cctv_wifi', label: ['CCTV & Wi-Fi Technician', 'CCTV कैमरा और वाई-फाई टेक्नीशियन', 'CCTV કેમેરા અને વાઈ-ફાઈ ટેકનિશિયન'] },
    ],
  },
  // 5. Hospital & Medical
  {
    key: 'hospital',
    masterId: 'hospital_medical',
    ic: '#dc2626',
    bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
    bd: '#fca5a5',
    tx: '#7f1d1d',
    name: [
      'Hospital & Medical',
      'हॉस्पिटल व मेडिकल',
      'હોસ્પિટલ અને મેડિકલ',
    ],
    cardLines: [
      ['Hospital &', 'Medical'],
      ['हॉस्पिटल', 'मेडिकल'],
      ['હોસ્પિટલ', 'મેડિકલ'],
    ],
    iconPaths: (
      <>
        <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
      </>
    ),
    subs: [
      { id: 'medical_nurse', label: ['Home Nurse & Patient Care', 'होम नर्स और मरीज़ की देखभाल', 'હોમ નર્સ અને દર્દીની સંભાળ'] },
      { id: 'medical_pharmacy', label: ['Medicine & Pharmacy Help', 'दवाई और मेडिकल स्टोर मदद', 'દવા અને મેડિકલ સ્ટોર મદદ'] },
      { id: 'physiotherapy', label: ['Physiotherapy at Home', 'घर पर फिजियोथेरेपी', 'ઘરે ફિઝિયોથેરાપી'] },
      { id: 'lab_test', label: ['Blood Test & Sample Collection', 'ब्लड टेस्ट और लैब सैंपल कलेक्शन', 'બ્લડ ટેસ્ટ અને લેબ સેમ્પલ કલેક્શન'] },
      { id: 'ambulance_help', label: ['Ambulance & Hospital Help', 'एम्बुलेंस और हॉस्पिटल मदद', 'એમ્બ્યુલન્સ અને હોસ્પિટલ મદદ'] },
    ],
  },
  // 6. Brokers & Agents
  {
    key: 'broker',
    masterId: 'brokers_agents',
    ic: '#0891b2',
    bg: 'linear-gradient(135deg, #ecfeff, #cffafe)',
    bd: '#67e8f9',
    tx: '#164e63',
    name: [
      'Brokers & Agents',
      'ब्रोकर व एजेंट',
      'બ્રોકર અને એજન્ટ',
    ],
    cardLines: [
      ['Brokers &', 'Agents'],
      ['ब्रोकर व', 'एजेंट'],
      ['બ્રોકર અને', 'એજન્ટ'],
    ],
    iconPaths: (
      <>
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4" />
        <path d="M10 10h4" />
        <path d="M10 14h4" />
        <path d="M10 18h4" />
      </>
    ),
    subs: [
      { id: 'real_estate_broker', label: ['Real Estate / Property Broker', 'मकान, दुकान, फ्लैट किराये या बिक्री', 'મકાન, દુકાન, ફ્લેટ ભાડે કે વેચાણ'] },
      { id: 'vehicle_broker', label: ['Vehicle Broker / Agent', 'पुरानी कार, बाइक खरीद-बिक्री एजेंट', 'જૂની કાર, બાઇક ખરીદ-વેચાણ એજન્ટ'] },
      { id: 'rto_agent', label: ['RTO & License Agent', 'ड्राइविंग लाइसेंस, RC ट्रांसफर और बीमा', 'ડ્રાઇવિંગ લાઇસન્સ, RC ટ્રાન્સફર અને વીમો'] },
      { id: 'loan_insurance', label: ['Loan & Insurance Agent', 'होम/पर्सनल लोन, LIC और मेडिक्लेम', 'હોમ/પર્સનલ લોન, LIC અને મેડિક્લેમ'] },
      { id: 'legal_docs', label: ['Legal & Documentation Help', 'किराया करार, नोटरी, पैन/आधार और सरकारी दस्तावेज़', 'ભાડા કરાર, નોટરી, પાન/આધાર અને સરકારી દસ્તાવેજ'] },
    ],
  },
  // 7. Cab & Auto
  {
    key: 'vehicle',
    masterId: 'vehicle_transport',
    ic: '#ea580c',
    bg: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
    bd: '#fdba74',
    tx: '#7c2d12',
    name: [
      'Cab & Auto',
      'कैब व ऑटो',
      'કેબ અને રિક્ષા',
    ],
    cardLines: [
      ['Cab &', 'Auto'],
      ['कैब व', 'ऑटो'],
      ['કેબ અને', 'રિક્ષા'],
    ],
    iconPaths: (
      <>
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </>
    ),
    subs: [
      { id: 'cab_auto_driver', label: ['Cab, Auto & Private Driver', 'कैब, ऑटो और प्राइवेट ड्राइवर', 'કેબ, રિક્ષા અને પ્રાઇવેટ ડ્રાઇવર'] },
      { id: 'mechanic', label: ['Mechanic & Puncture Repair', 'मैकेनिक और पंचर रिपेयर', 'મિકેનિક અને પંચર રિપેર'] },
    ],
  },
  // 8. Tempo & Transport
  {
    key: 'transport',
    masterId: 'tempo_transport',
    ic: '#b45309',
    bg: 'linear-gradient(135deg, #fefce8, #fef08a)',
    bd: '#fde047',
    tx: '#713f12',
    name: [
      'Tempo & Transport',
      'टेम्पो व ट्रांसपोर्ट',
      'ટેમ્પો અને ટ્રાન્સપોર્ટ',
    ],
    cardLines: [
      ['Tempo &', 'Transport'],
      ['टेम्पो व', 'ट्रांसपोर्ट'],
      ['ટેમ્પો અને', 'ટ્રાન્સપોર્ટ'],
    ],
    iconPaths: (
      <>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </>
    ),
    subs: [
      { id: 'tempo_packers', label: ['Tempo & Packers/Movers', 'छोटा हाथी टेम्पो और घर शिफ्टिंग', 'છોટા હાથી ટેમ્પો અને ઘર શિફ્ટિંગ'] },
      { id: 'delivery', label: ['Delivery & Errands', 'लोकल डिलीवरी और बाज़ार से सामान लाना', 'લોકલ ડિલિવરી અને બજારમાંથી સામાન લાવવો'] },
    ],
  },
  // 9. Tutors & Classes
  {
    key: 'edu',
    masterId: 'education_classes',
    ic: '#7c3aed',
    bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
    bd: '#c4b5fd',
    tx: '#4c1d95',
    name: [
      'Tutors & Classes',
      'ट्यूटर व क्लास',
      'ટ્યુશન અને ક્લાસ',
    ],
    cardLines: [
      ['Tutors &', 'Classes'],
      ['ट्यूटर व', 'क्लास'],
      ['ટ્યુશન અને', 'ક્લાસ'],
    ],
    iconPaths: (
      <>
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
        <path d="M22 10v6" />
        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
      </>
    ),
    subs: [
      { id: 'tutor', label: ['Tuition & School Teacher', 'होम ट्यूटर और स्कूल शिक्षक', 'હોમ ટ્યુટર અને સ્કૂલ શિક્ષક'] },
      { id: 'study_project', label: ['Project & Study Help', 'प्रोजेक्ट, असाइनमेंट और पढ़ाई में मदद', 'પ્રોજેક્ટ, અસાઇનમેન્ટ અને અભ્યાસમાં મદદ'] },
      { id: 'computer_spoken_english', label: ['Computer & Spoken English Classes', 'कंप्यूटर और स्पोकन इंग्लिश', 'કમ્પ્યુટર અને સ્પોકન ઇંગ્લિશ'] },
      { id: 'music_dance_art', label: ['Music, Dance & Art Teacher', 'संगीत, गरबा/डांस और ड्राइंग शिक्षक', 'સંગીત, ગરબા/ડાન્સ અને ડ્રોઇંગ શિક્ષક'] },
    ],
  },
  // 10. Sports & Fitness
  {
    key: 'sports',
    masterId: 'sports_fitness',
    ic: '#d97706',
    bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
    bd: '#fcd34d',
    tx: '#78350f',
    name: [
      'Sports & Fitness',
      'स्पोर्ट्स व फिटनेस',
      'સ્પોર્ટ્સ અને ફિટનેસ',
    ],
    cardLines: [
      ['Sports &', 'Fitness'],
      ['स्पोर्ट्स व', 'फिटनेस'],
      ['સ્પોર્ટ્સ અને', 'ફિટનેસ'],
    ],
    iconPaths: (
      <>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </>
    ),
    subs: [
      { id: 'cricket', label: ['Cricket Partner & Team', 'बॉक्स क्रिकेट और टीम प्लेयर्स', 'બોક્સ ક્રિકેટ અને ટીમ પ્લેયર્સ'] },
      { id: 'badminton', label: ['Badminton & Tennis Partner', 'बैडमिंटन और टेनिस साथी', 'બેડમિન્ટન અને ટેનિસ સાથી'] },
      { id: 'gym_fitness', label: ['Gym & Workout Buddy', 'जिम और वर्कआउट पार्टनर', 'જિમ અને વર્કઆઉટ પાર્ટનર'] },
      { id: 'running_yoga', label: ['Running, Cycling & Yoga Partner', 'मॉर्निंग रनिंग, साइकिलिंग और योगा साथी', 'મોર્નિંગ રનિંગ, સાયકલિંગ અને યોગા સાથી'] },
    ],
  },
  // 11. Social & Friends
  {
    key: 'social',
    masterId: 'social_care',
    ic: '#e11d48',
    bg: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
    bd: '#fda4af',
    tx: '#881337',
    name: [
      'Social & Friends',
      'सोशल व फ्रेंड्स',
      'સોશિયલ અને ફ્રેન્ડ્સ',
    ],
    cardLines: [
      ['Social &', 'Friends'],
      ['सोशल व', 'फ्रेंड्स'],
      ['સોશિયલ', 'અને ફ્રેન્ડ્સ'],
    ],
    iconPaths: (
      <>
        <path d="M10 2v2" />
        <path d="M14 2v2" />
        <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
        <path d="M6 2v2" />
      </>
    ),
    subs: [
      { id: 'chai_coffee', label: ['Tea-Coffee Meetup', 'चाय-कॉफी मुलाकात और बातचीत', 'ચા-કોફી મુલાકાત અને વાતચીત'] },
      { id: 'companion', label: ['Evening Walk Partner', 'शाम की सैर और घूमने का साथी', 'સાંજની વોક અને ફરવાનો સાથી'] },
      { id: 'board_games', label: ['Chess & Board Games', 'शतरंज, कैरम, लूडो साथी', 'ચેસ, કેરમ, લુડો સાથી'] },
      { id: 'senior_help', label: ['Elder Care & Companion', 'बुजुर्गों की मदद, दवा और देखभाल', 'વડીલોની મદદ, દવા અને સંભાળ'] },
      { id: 'pet_walking', label: ['Pet Walk & Care', 'पेट वॉकिंग और डॉग केयर', 'પેટ વૉકિંગ અને ડૉગ કેર'] },
    ],
  },
  // 12. Other Services (Always last at #12)
  {
    key: 'other',
    masterId: 'other_custom',
    ic: '#0d9488',
    bg: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)',
    bd: '#5eead4',
    tx: '#134e4a',
    name: [
      'Other Services',
      'अन्य सेवाएं',
      'અન્ય સેવાઓ',
    ],
    cardLines: [
      ['Other', 'Services'],
      ['अन्य', 'सेवाएं'],
      ['અન્ય', 'સેવાઓ'],
    ],
    iconPaths: (
      <>
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4" />
        <path d="M22 5h-4" />
        <path d="M4 17v2" />
        <path d="M5 18H3" />
      </>
    ),
    subs: [
      { id: 'other', label: ['Other / Custom Category', 'कोई भी अन्य लोकल हुनर या आपकी ज़रूरत', 'કોઈપણ અન્ય લોકલ હુનર કે તમારી જરૂરિયાત'] },
    ],
  },
];

export default function HomeCategoryGrid({
  onNavigate,
  onSelectCategory,
}: HomeCategoryGridProps) {
  const { language } = useLanguage();
  const [openCatKey, setOpenCatKey] = useState<string | null>(null);
  const [helpers, setHelpers] = useState<FreeHelperProfile[]>(() =>
    getFreeHelperProfiles(false)
  );

  // Language index: 0 = English, 1 = Hindi, 2 = Gujarati (strictly single-language display)
  const langIdx: 0 | 1 | 2 =
    language === 'GU' ? 2 : language === 'HI' ? 1 : 0;

  useEffect(() => {
    const syncHelpers = async () => {
      try {
        let deletedIds: string[] = [];
        try {
          const delRaw = localStorage.getItem('locohelp_deleted_helpers');
          if (delRaw) deletedIds = JSON.parse(delRaw);
        } catch {}

        const res = await fetch(`/api/helpers?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          const serverList = Array.isArray(data) ? data : [];
          const verifiedOnly = serverList
            .filter(
              (h: any) =>
                h &&
                h.id &&
                !/^h\d+/.test(String(h.id)) &&
                !deletedIds.includes(String(h.id)) &&
                !h.is_flagged &&
                !h.hidden &&
                !h.is_deleted
            )
            .map((h: any) => {
              const norm = normalizeCategorySlug(
                h.categoryId || h.category,
                h.skills,
                h.customCategoryName
              );
              return {
                ...h,
                categoryId: norm.categoryId,
                customCategoryName:
                  h.customCategoryName || norm.customCategoryName,
                isVerified: h.isVerified === true || h.status === 'approved',
                status: h.status || (h.isVerified ? 'approved' : 'pending'),
              };
            })
            .filter(
              (h: any) => h.isVerified === true || h.status === 'approved'
            );
          setHelpers(verifiedOnly);
          return;
        }
      } catch {}
      setHelpers(getFreeHelperProfiles(false));
    };

    syncHelpers();
    window.addEventListener('storage', syncHelpers);
    return () => window.removeEventListener('storage', syncHelpers);
  }, []);

  // Close modal on Escape or mobile Back button, and lock background scroll while open
  useEffect(() => {
    if (!openCatKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenCatKey(null);
      }
    };
    const handleBackClose = (e: Event) => {
      e.preventDefault();
      setOpenCatKey(null);
    };

    // Lock background scroll containers on the page while popup is open
    const scrollContainers = Array.from(
      document.querySelectorAll<HTMLElement>('.overflow-y-auto')
    ).filter((el) => !el.hasAttribute('data-cat-modal-scroll'));
    const prevOverflows = scrollContainers.map((el) => el.style.overflowY);
    scrollContainers.forEach((el) => {
      el.style.overflowY = 'hidden';
    });

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('locohelp_close_active_modal', handleBackClose);
    window.addEventListener('locohelp_close_all_modals', handleBackClose);
    return () => {
      scrollContainers.forEach((el, idx) => {
        el.style.overflowY = prevOverflows[idx] || '';
      });
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('locohelp_close_active_modal', handleBackClose);
      window.removeEventListener('locohelp_close_all_modals', handleBackClose);
    };
  }, [openCatKey]);

  const isHelperMatchingSubId = (
    h: FreeHelperProfile,
    subId: string
  ): boolean => {
    const cat = CATEGORIES.find((c) => c.id === subId);
    const norm = normalizeCategorySlug(
      h.categoryId || (h as any).category,
      h.skills,
      h.customCategoryName
    );
    if (norm.categoryId === subId) return true;
    if (!cat) return false;
    const catNameEn = cat.nameEn.toLowerCase();
    const catTag = cat.tag.replace('#', '').toLowerCase();
    if (
      Array.isArray(h.skills) &&
      h.skills.some((s) => {
        const sl = String(s || '').toLowerCase();
        return (
          sl.includes(subId.toLowerCase()) ||
          sl.includes(catTag) ||
          sl === catNameEn
        );
      })
    ) {
      return true;
    }
    return false;
  };

  const getSubCount = (subId: string): number => {
    return helpers.filter((h) => isHelperMatchingSubId(h, subId)).length;
  };

  const activeModalCat = MAIN_CATS.find((c) => c.key === openCatKey) || null;

  const handleSubCategoryClick = (subId: string) => {
    setOpenCatKey(null);
    if (onSelectCategory) {
      onSelectCategory(subId);
    }
    onNavigate('categories');
  };

  return (
    <>
      {/* 12 Main Categories Grid (4 columns × 3 rows, strictly uniform compact box size matching bottom row) */}
      <section className="py-0.5" aria-label="Service categories">
        <div className="grid grid-cols-4 auto-rows-[72px] sm:auto-rows-[80px] gap-1.5 sm:gap-2">
          {MAIN_CATS.map((cat) => {
            const [line1, line2] = cat.cardLines[langIdx];
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setOpenCatKey(cat.key)}
                style={{
                  background: cat.bg,
                  borderColor: cat.bd,
                  color: cat.tx,
                }}
                className="h-[72px] sm:h-[80px] w-full flex flex-col items-center justify-center gap-1 py-1.5 px-1 sm:px-1.5 rounded-[13px] border text-center cursor-pointer transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97] shadow-2xs overflow-hidden"
              >
                {/* Colored Icon Box with crisp white SVG icon */}
                <span
                  style={{ backgroundColor: cat.ic }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] flex items-center justify-center shrink-0 shadow-2xs"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="#ffffff"
                    fill="none"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 sm:w-[17px] sm:h-[17px] shrink-0"
                  >
                    {cat.iconPaths}
                  </svg>
                </span>

                {/* Strictly 2-line Single-Language Category Name so all 12 boxes stay identical in size */}
                <span className="flex flex-col items-center justify-center text-[9.5px] sm:text-[11px] font-bold leading-[1.15] tracking-tight text-center w-full">
                  <span className="block w-full truncate">{line1}</span>
                  <span className="block w-full truncate">{line2}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sub-Categories Popup Modal — rendered via Portal to document.body so it always opens centered in the viewport */}
      {activeModalCat &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpenCatKey(null);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-[2px] overscroll-none"
            role="dialog"
            aria-modal="true"
          >
            <div
              style={{ borderColor: activeModalCat.bd }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[520px] sm:max-w-[680px] max-h-[82vh] flex flex-col bg-white rounded-[20px] border-2 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Modal Header */}
              <div
                style={{
                  background: activeModalCat.bg,
                  color: activeModalCat.tx,
                  borderBottomColor: activeModalCat.bd,
                }}
                className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
              >
                <span
                  style={{ backgroundColor: activeModalCat.ic }}
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 shadow-xs"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    stroke="#ffffff"
                    fill="none"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-[22px] h-[22px] shrink-0"
                  >
                    {activeModalCat.iconPaths}
                  </svg>
                </span>

                <h2 className="flex-1 text-base font-extrabold leading-snug m-0">
                  {activeModalCat.name[langIdx]}
                </h2>

                <button
                  type="button"
                  onClick={() => setOpenCatKey(null)}
                  style={{
                    borderColor: activeModalCat.bd,
                    color: activeModalCat.tx,
                  }}
                  aria-label="Close"
                  className="w-9 h-9 rounded-xl border bg-white flex items-center justify-center cursor-pointer shrink-0 hover:brightness-95"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {/* Sub-Categories Scrollable List */}
              <div
                data-cat-modal-scroll="true"
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-4 py-3.5 overflow-y-auto overscroll-contain touch-pan-y bg-white"
              >
                {activeModalCat.subs.map((sub) => {
                  const subCount = getSubCount(sub.id);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubCategoryClick(sub.id)}
                      style={{
                        background: activeModalCat.bg,
                        borderColor: activeModalCat.bd,
                        color: activeModalCat.tx,
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] border text-[13px] font-bold text-left cursor-pointer transition-transform duration-100 hover:-translate-y-[1px] active:scale-[0.99]"
                    >
                      {/* Left bullseye icon */}
                      <span
                        style={{ borderColor: activeModalCat.bd }}
                        className="w-8 h-8 rounded-[10px] bg-white border flex items-center justify-center shrink-0"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="17"
                          height="17"
                          style={{ stroke: activeModalCat.ic }}
                          fill="none"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="3" />
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      </span>

                      {/* Sub-category name (single language, full text) */}
                      <span className="flex-1 leading-snug break-words">
                        {sub.label[langIdx]}
                      </span>

                      {/* Sub-category live count badge */}
                      <span
                        style={{
                          borderColor: activeModalCat.bd,
                          color: activeModalCat.tx,
                        }}
                        className="min-w-[22px] px-1.5 py-[1px] rounded-full bg-white border text-[11px] font-extrabold text-center shrink-0"
                      >
                        {subCount}
                      </span>

                      {/* Right chevron arrow */}
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        stroke="currentColor"
                        fill="none"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
