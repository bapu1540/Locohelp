import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Screen } from '../types';
import { useLanguage } from '../i18n';
import {
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
  subBg: string;
  subBorder: string;
  subText: string;
  btnClass: string;
  headerClass: string;
  borderClass: string;
  badgeClass: string;
  subBtnClass: string;
  actionBtnClass: string;
  name: [string, string, string]; // [English, Hindi, Gujarati]
  cardLines: [[string, string], [string, string], [string, string]]; // Strict 2-line label for uniform compact box size
  iconPaths: React.ReactNode;
  subs: {
    id: string;
    label: [string, string, string];
  }[];
}

const ROW_THEMES = {
  // Row 1 (Boxes 1–4): Teal Theme (bg-teal-600 border-b-4 border-teal-800)
  row1: {
    ic: '#0f766e',
    bg: '#0d9488',
    bd: '#115e59',
    tx: '#ffffff',
    subBg: '#f0fdfa',
    subBorder: '#99f6e4',
    subText: '#042f2e',
    btnClass: 'bg-teal-600 hover:bg-teal-500 border-b-4 border-teal-800 text-white',
    headerClass: 'bg-teal-600 border-b-4 border-teal-800 text-white',
    borderClass: 'border-teal-700',
    badgeClass: 'bg-teal-700 text-white border border-teal-800',
    subBtnClass: 'bg-teal-50 hover:bg-teal-100 border-2 border-teal-600/30 border-b-4 border-b-teal-700 text-teal-950',
    actionBtnClass: 'bg-teal-600 hover:bg-teal-700 border-b-4 border-teal-800 text-white',
  },
  // Row 2 (Boxes 5–8): Slate Theme (bg-slate-700 border-b-4 border-slate-900)
  row2: {
    ic: '#1e293b',
    bg: '#334155',
    bd: '#0f172a',
    tx: '#ffffff',
    subBg: '#f8fafc',
    subBorder: '#cbd5e1',
    subText: '#0f172a',
    btnClass: 'bg-slate-700 hover:bg-slate-600 border-b-4 border-slate-900 text-white',
    headerClass: 'bg-slate-700 border-b-4 border-slate-900 text-white',
    borderClass: 'border-slate-800',
    badgeClass: 'bg-slate-800 text-white border border-slate-950',
    subBtnClass: 'bg-slate-50 hover:bg-slate-100 border-2 border-slate-600/30 border-b-4 border-b-slate-800 text-slate-900',
    actionBtnClass: 'bg-slate-700 hover:bg-slate-800 border-b-4 border-slate-900 text-white',
  },
  // Row 3 (Boxes 9–12): Rose/Crimson Theme (bg-rose-600 border-b-4 border-rose-800)
  row3: {
    ic: '#be123c',
    bg: '#e11d48',
    bd: '#9f1239',
    tx: '#ffffff',
    subBg: '#fff1f2',
    subBorder: '#fecdd3',
    subText: '#4c0519',
    btnClass: 'bg-rose-600 hover:bg-rose-500 border-b-4 border-rose-800 text-white',
    headerClass: 'bg-rose-600 border-b-4 border-rose-800 text-white',
    borderClass: 'border-rose-700',
    badgeClass: 'bg-rose-700 text-white border border-rose-900',
    subBtnClass: 'bg-rose-50 hover:bg-rose-100 border-2 border-rose-600/30 border-b-4 border-b-rose-700 text-rose-950',
    actionBtnClass: 'bg-rose-600 hover:bg-rose-700 border-b-4 border-rose-800 text-white',
  },
  // Row 4 (Boxes 13–16): Deep Cyan Theme (bg-cyan-700 border-b-4 border-cyan-900)
  row4: {
    ic: '#155e75',
    bg: '#0e7490',
    bd: '#164e63',
    tx: '#ffffff',
    subBg: '#ecfeff',
    subBorder: '#a5f3fc',
    subText: '#083344',
    btnClass: 'bg-cyan-700 hover:bg-cyan-600 border-b-4 border-cyan-900 text-white',
    headerClass: 'bg-cyan-700 border-b-4 border-cyan-900 text-white',
    borderClass: 'border-cyan-800',
    badgeClass: 'bg-cyan-800 text-white border border-cyan-950',
    subBtnClass: 'bg-cyan-50 hover:bg-cyan-100 border-2 border-cyan-700/30 border-b-4 border-b-cyan-800 text-cyan-950',
    actionBtnClass: 'bg-cyan-700 hover:bg-cyan-800 border-b-4 border-cyan-900 text-white',
  },
};

const MAIN_CATS: MainCatConfig[] = [
  // =========================================================================
  // ROW 1 (1 to 4): Electrician, Plumber, AC/Fridge/RO, Maid & Cook
  // =========================================================================
  {
    key: 'electrician_main',
    masterId: 'electrician_main',
    ...ROW_THEMES.row1,
    name: [
      'Electrician',
      'इलेक्ट्रीशियन',
      'ઈલેક્ટ્રીશિયન',
    ],
    cardLines: [
      ['Electrician', 'Service'],
      ['इलेक्ट्रीशियन', 'सेवा'],
      ['ઈલેક્ટ્રીશિયન', 'સેવા'],
    ],
    iconPaths: (
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    ),
    subs: [
      { id: 'electrician', label: ['Electrician (Fan, Switchboard, Wiring & Inverter)', 'इलेक्ट्रीशियन (बिजली रिपेयर)', 'ઈલેક્ટ્રીશિયન (વીજળી રિપેર)'] },
    ],
  },
  {
    key: 'plumber_main',
    masterId: 'plumber_main',
    ...ROW_THEMES.row1,
    name: [
      'Plumber',
      'प्लंबर',
      'પ્લમ્બર',
    ],
    cardLines: [
      ['Plumber', 'Service'],
      ['प्लंबर', 'सेवा'],
      ['પ્લમ્બર', 'સેવા'],
    ],
    iconPaths: (
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    ),
    subs: [
      { id: 'plumber', label: ['Plumber (Tap, Pipe & Tank Repair)', 'प्लंबर (नल और पाइप रिपेयर)', 'પ્લમ્બર (નળ અને પાઇપ રિપેર)'] },
    ],
  },
  {
    key: 'ac_repair_main',
    masterId: 'ac_repair_main',
    ...ROW_THEMES.row1,
    name: [
      'AC, Fridge & RO Repair',
      'AC, फ्रिज और RO रिपेयर',
      'A.C. ફ્રિજ અને R.O. રીપેર',
    ],
    cardLines: [
      ['AC, Fridge &', 'RO Repair'],
      ['AC, फ्रिज और', 'RO रिपेयर'],
      ['A.C. ફ્રિજ અને', 'R.O. રીપેર'],
    ],
    iconPaths: (
      <>
        <rect x="2" y="4" width="20" height="10" rx="2" />
        <path d="M6 10h12" />
        <path d="M8 18c0 2 2 2 2 4" />
        <path d="M12 18c0 2 2 2 2 4" />
        <path d="M16 18c0 2 2 2 2 4" />
      </>
    ),
    subs: [
      { id: 'ac_repair', label: ['AC, Fridge & RO Repair', 'AC, फ्रिज और RO रिपेयर', 'A.C. ફ્રિજ અને R.O. રીપેર'] },
    ],
  },
  {
    key: 'maid_cook_main',
    masterId: 'maid_cook_main',
    ...ROW_THEMES.row1,
    name: [
      'Maid & Cook',
      'कामवाले और रसोइया',
      'કામવાળા અને રસોઈયા',
    ],
    cardLines: [
      ['Maid &', 'Cook'],
      ['कामवाले और', 'रसोइया'],
      ['કામવાળા અને', 'રસોઈયા'],
    ],
    iconPaths: (
      <>
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </>
    ),
    subs: [
      { id: 'maid_cook', label: ['Maid & Cook', 'कामवाले और रसोइया', 'કામવાળા અને રસોઈયા'] },
    ],
  },

  // =========================================================================
  // ROW 2 (5 to 8): Home Cleaning, Mason & Construction, Carpenter, Painter
  // =========================================================================
  {
    key: 'cleaning_main',
    masterId: 'cleaning_main',
    ...ROW_THEMES.row2,
    name: [
      'Home Cleaning',
      'घर की सफाई',
      'ઘરની સફાઈ',
    ],
    cardLines: [
      ['Home', 'Cleaning'],
      ['घर की', 'सफाई'],
      ['ઘરની', 'સફાઈ'],
    ],
    iconPaths: (
      <>
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        <path d="M5 3v4" />
        <path d="M3 5h4" />
      </>
    ),
    subs: [
      { id: 'cleaning', label: ['Home Cleaning', 'घर की सफाई', 'ઘરની સફાઈ'] },
    ],
  },
  {
    key: 'mason_main',
    masterId: 'mason_main',
    ...ROW_THEMES.row2,
    name: [
      'Mason & Construction',
      'राजमिस्त्री / निर्माण कार्य',
      'કડિયો / મિસ્ત્રી બાંધકામ',
    ],
    cardLines: [
      ['Mason &', 'Construction'],
      ['राजमिस्त्री /', 'निर्माण कार्य'],
      ['કડિયો / મિસ્ત્રી', 'બાંધકામ'],
    ],
    iconPaths: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M12 6v6" />
        <path d="M2 12h20" />
        <path d="M7 12v6" />
        <path d="M17 12v6" />
      </>
    ),
    subs: [
      { id: 'mason', label: ['Mason & Construction', 'राजमिस्त्री / निर्माण कार्य', 'કડિયો / મિસ્ત્રી બાંધકામ'] },
    ],
  },
  {
    key: 'carpenter_main',
    masterId: 'carpenter_main',
    ...ROW_THEMES.row2,
    name: [
      'Carpenter & Furniture',
      'बढ़ई / फर्नीचर',
      'સુથાર / ફર્નિચર',
    ],
    cardLines: [
      ['Carpenter &', 'Furniture'],
      ['बढ़ई /', 'फर्नीचर'],
      ['સુથાર /', 'ફર્નિચર'],
    ],
    iconPaths: (
      <>
        <path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" />
        <path d="M17.64 15 22 10.64" />
        <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" />
      </>
    ),
    subs: [
      { id: 'carpenter', label: ['Carpenter & Furniture', 'बढ़ई / फर्नीचर', 'સુથાર / ફર્નિચર'] },
    ],
  },
  {
    key: 'painter_main',
    masterId: 'painter_main',
    ...ROW_THEMES.row2,
    name: [
      'Painter & Painting',
      'पेंटर / रंगाई-पुताई',
      'કલરકામ',
    ],
    cardLines: [
      ['Painter &', 'Painting'],
      ['पेंटर /', 'रंगाई-पुताई'],
      ['કલરકામ', '(પેઇન્ટર)'],
    ],
    iconPaths: (
      <>
        <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
        <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
      </>
    ),
    subs: [
      { id: 'painter', label: ['Painter & Painting', 'पेंटर / रंगाई-पुताई', 'કલરકામ'] },
    ],
  },

  // =========================================================================
  // ROW 3 (9 to 12): Pest Control, Brokers & Agents, Social & Friends, Other Services
  // =========================================================================
  {
    key: 'pest_control_main',
    masterId: 'pest_control_main',
    ...ROW_THEMES.row3,
    name: [
      'Pest Control',
      'पेस्ट कंट्रोल',
      'જંતુનાશક સેવા',
    ],
    cardLines: [
      ['Pest', 'Control'],
      ['पेस्ट', 'कंट्रोल'],
      ['જંતુનાશક', 'સેવા'],
    ],
    iconPaths: (
      <>
        <path d="m8 2 1.88 1.88" />
        <path d="M14.12 3.88 16 2" />
        <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
        <path d="M12 20v-9" />
        <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
        <path d="M6 13H2" />
        <path d="M17.47 9c1.93-.2 3.53-1.9 3.53-4" />
        <path d="M18 13h4" />
      </>
    ),
    subs: [
      { id: 'pest_control', label: ['Pest Control', 'पेस्ट कंट्रोल', 'જંતુનાશક સેવા'] },
    ],
  },
  {
    key: 'brokers_agents',
    masterId: 'brokers_agents',
    ...ROW_THEMES.row3,
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
        <path d="M3 21h18" />
        <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
        <path d="M9 9h2" />
        <path d="M13 9h2" />
        <path d="M9 13h2" />
        <path d="M13 13h2" />
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
  {
    key: 'transport_shifting',
    masterId: 'transport_shifting',
    ...ROW_THEMES.row3,
    name: [
      'Transport & Shifting',
      'ट्रांसपोर्ट व शिफ्टिंग',
      'ટ્રાન્સપોર્ટ અને શિફ્ટિંગ',
    ],
    cardLines: [
      ['Transport &', 'Shifting'],
      ['ट्रांसपोर्ट व', 'शिफ्टिंग'],
      ['ટ્રાન્સપોર્ટ', 'શિફ્ટિંગ'],
    ],
    iconPaths: (
      <>
        <path d="M5 18H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11" />
        <path d="M14 9h4l4 4v4a2 2 0 0 1-2 2h-2" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </>
    ),
    subs: [
      { id: 'packers_movers', label: ['Packers & Movers', 'पैकर्स एंड मूवर्स', 'પેકર્સ અને મૂવર્સ'] },
      { id: 'tempo_packers', label: ['Tempo / Chhota Hathi', 'टेम्पो / छोटा हाथी', 'ટેમ્પો / છોટા હાથી'] },
      { id: 'truck_transport', label: ['Truck / Loading Vehicle', 'ट्रक / लोडिंग गाड़ी', 'ટ્રક / લોડીંગ ગાડી'] },
      { id: 'home_office_shifting', label: ['Home / Office Shifting', 'घर / ऑफिस शिफ्टिंग', 'ઘર / ઓફિસ શિફ્ટિંગ'] },
    ],
  },
  {
    key: 'cab_travel',
    masterId: 'cab_travel',
    ...ROW_THEMES.row3,
    name: [
      'Cab & Travel',
      'कैब व ट्रैवल',
      'કેબ અને ટ્રાવેલ',
    ],
    cardLines: [
      ['Cab &', 'Travel'],
      ['कैब व', 'ट्रैवल'],
      ['કેબ અને', 'ટ્રાવેલ'],
    ],
    iconPaths: (
      <>
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </>
    ),
    subs: [
      { id: 'auto_rickshaw', label: ['Auto / Rickshaw', 'ऑटो / रिक्शा', 'ઓટો / રિક્ષા'] },
      { id: 'taxi_service', label: ['Taxi / Cab', 'टैक्सी / कैब', 'ટેક્સી / કેબ'] },
      { id: 'private_driver', label: ['Private Driver', 'प्राइवेट ड्राइवर', 'પ્રાઇવેટ ડ્રાઇવર'] },
      { id: 'car_rental', label: ['Car Rental / Rent a Car', 'भाड़े पर कार / गाड़ी', 'ભાડે કાર / ગાડી'] },
    ],
  },

  // =========================================================================
  // ROW 4 (13 to 16): Hotel & Tiffin, Sports & Fitness, Social & Friends, Other Services
  // =========================================================================
  {
    key: 'hotel_tiffin',
    masterId: 'hotel_tiffin',
    ...ROW_THEMES.row4,
    name: [
      'Hotel & Tiffin',
      'होटल और टिफिन',
      'હોટલ અને ટિફિન',
    ],
    cardLines: [
      ['Hotel &', 'Tiffin'],
      ['होटल व', 'टिफिन'],
      ['હોટલ અને', 'ટિફિન'],
    ],
    iconPaths: (
      <>
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </>
    ),
    subs: [
      { id: 'tiffin_service', label: ['Home Tiffin / Daily Mess', 'घर का टिफिन / मेस सर्विस', 'ઘરનું ટિફિન / મેસ સર્વિસ'] },
      { id: 'hotel_restaurant', label: ['Hotels & Restaurants', 'होटल और रेस्टोरेंट', 'હોટલ અને રેસ્ટોરન્ટ'] },
      { id: 'dhaba_kathiyawadi', label: ['Dhaba & Kathiyawadi Bhojan', 'ढाबा और काठियावाड़ी भोजन', 'ઢાબા અને કાઠિયાવાડી ભોજન'] },
      { id: 'catering_event', label: ['Caterers & Event Cook', 'कैटरर्स और प्रसंग के रसोइया', 'કેટરર્સ અને પ્રસંગના રસોઈયા'] },
      { id: 'fast_food_snacks', label: ['Fast Food & Snacks', 'फास्ट फूड और नाश्ता', 'ફાસ્ટ ફૂડ અને નાસ્તો'] },
    ],
  },
  {
    key: 'sports_fitness',
    masterId: 'sports_fitness',
    ...ROW_THEMES.row4,
    name: [
      'Sports & Fitness',
      'स्पोर्ट्स व फिटनेस',
      'સ્પોર્ટ્સ અને ફિટનેસ',
    ],
    cardLines: [
      ['Sports &', 'Fitness'],
      ['स्पोर्ट्स व', 'फिटनेस'],
      ['સ્પોર્ટ્સ', 'ફિટનેસ'],
    ],
    iconPaths: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m4.93 4.93 4.24 4.24" />
        <path d="m14.83 9.17 4.24-4.24" />
        <path d="m14.83 14.83 4.24 4.24" />
        <path d="m9.17 14.83-4.24 4.24" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
    subs: [
      { id: 'cricket', label: ['Box Cricket & Team Players', 'बॉक्स क्रिकेट और टीम प्लेयर्स', 'બોક્સ ક્રિકેટ અને ટીમ પ્લેયર્સ'] },
      { id: 'badminton', label: ['Badminton & Tennis Players', 'बैडमिंटन और टेनिस प्लेयर', 'બેડમિંટન અને ટેનિસ પ્લેયર'] },
      { id: 'gym_fitness', label: ['Gym & Workout Partner', 'जिम और वर्कआउट पार्टनर', 'જીમ અને વર્કઆઉટ પાર્ટનર'] },
      { id: 'running_yoga', label: ['Morning Running & Walking', 'मॉर्निंग रनिंग और वॉकिंग', 'મોર્નિંગ running'] },
      { id: 'cycling_partner', label: ['Cycling Partner', 'साइकिलिंग पार्टनर', 'સાયકલિંગ'] },
      { id: 'yoga_partner', label: ['Yoga Partner & Guide', 'योगा साथी', 'યોગા સાથી'] },
    ],
  },
  {
    key: 'social_care',
    masterId: 'social_care',
    ...ROW_THEMES.row4,
    name: [
      'Social & Friends',
      'सोशल व फ्रेंड्स',
      'સોશિયલ અને ફ્રેન્ડ્સ',
    ],
    cardLines: [
      ['Social &', 'Friends'],
      ['सोशल व', 'फ्रेंड्स'],
      ['સોશિયલ', 'ફ્રેન્ડ્સ'],
    ],
    iconPaths: (
      <>
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
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
  {
    key: 'other_custom',
    masterId: 'other_custom',
    ...ROW_THEMES.row4,
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
      // CCTV & Mobile
      { id: 'mobile_repair', label: ['Mobile Repair Technician', 'मोबाइल स्क्रीन और पार्ट्स रिपेयर', 'મોબાઇલ સ્ક્રીન અને પાર્ટ્સ રિપેર'] },
      { id: 'computer_laptop', label: ['Computer & Laptop Expert', 'कंप्यूटर और लैपटॉप रिपेयर', 'કમ્પ્યુટર અને લેપટોપ રિપેર'] },
      { id: 'cctv_wifi', label: ['CCTV & Wi-Fi Technician', 'CCTV कैमरा और वाई-फाई टेक्नीशियन', 'CCTV કેમેરા અને વાઈ-ફાઈ ટેકનિશિયન'] },
      // Hospital & Medical
      { id: 'medical_nurse', label: ['Home Nurse & Patient Care', 'होम नर्स और मरीज़ की देखभाल', 'હોમ નર્સ અને દર્દીની સંભાળ'] },
      { id: 'medical_pharmacy', label: ['Medicine & Pharmacy Help', 'दवाई और मेडिकल स्टोर मदद', 'દવા અને મેડિકલ સ્ટોર મદદ'] },
      { id: 'physiotherapy', label: ['Physiotherapy at Home', 'घर पर फिजियोथेरेपी', 'ઘરે ફિઝિયોથેરાપી'] },
      { id: 'lab_test', label: ['Lab Test & Sample Collection', 'लैब टेस्ट और सैंपल कलेक्शन', 'લેબ ટેસ્ટ અને સેમ્પલ કલેક્શન'] },
      { id: 'ambulance_help', label: ['Ambulance & Hospital Help', 'एम्बुलेंस और हॉस्पिटल मदद', 'એમ્બ્યુલન્સ અને હોસ્પિટલ મદદ'] },
      // Tuition & Classes
      { id: 'tutor', label: ['Tuition & School Teacher', 'होम ट्यूटर और स्कूल शिक्षक', 'હોમ ટ્યુટર અને સ્કૂલ શિક્ષક'] },
      { id: 'study_project', label: ['Project & Study Help', 'प्रोजेक्ट, असाइनमेंट और पढ़ाई में मदद', 'પ્રોજેક્ટ, અસાઇનમેન્ટ અને અભ્યાસમાં મદદ'] },
      { id: 'computer_spoken_english', label: ['Computer & Spoken English Classes', 'कंप्यूटर और स्पोकन इंग्लिश', 'કમ્પ્યુટર અને સ્પોકન ઇંગ્લિશ'] },
      { id: 'music_dance_art', label: ['Music, Dance & Art Teacher', 'संगीत, गरबा/डांस और ड्राइंग शिक्षक', 'સંગીત, ગરબા/ડાન્સ અને ડ્રોઇંગ શિક્ષક'] },
      // Custom / Other
      { id: 'other', label: ['Other / Custom Category', 'कोई भी अन्य लोकल हुनर या आपकी ज़रूरत', 'કોઈપણ અન્ય લોકલ હુનર કે તમારી જરૂરિયાત'] },
    ],
  },
];

const resolvePopupCatKey = (rawKey: string | null): string | null => {
  if (!rawKey) return null;
  const found = MAIN_CATS.find(
    (c) =>
      c.key === rawKey ||
      c.masterId === rawKey ||
      c.subs.some((s) => s.id === rawKey)
  );
  if (!found || found.subs.length <= 1) return null;
  return found.key;
};

export default function HomeCategoryGrid({
  onNavigate,
  onSelectCategory,
}: HomeCategoryGridProps) {
  const { language } = useLanguage();
  const [openCatKey, setOpenCatKey] = useState<string | null>(() => {
    try {
      const saved = sessionStorage.getItem('locohelp_return_popup_cat');
      return resolvePopupCatKey(saved);
    } catch {
      return null;
    }
  });
  const [, setHelpers] = useState<FreeHelperProfile[]>(() =>
    getFreeHelperProfiles(false)
  );

  // Language index: 0 = English, 1 = Hindi, 2 = Gujarati (strictly single-language display)
  const langIdx: 0 | 1 | 2 =
    language === 'GU' ? 2 : language === 'HI' ? 1 : 0;

  // Clear stored return popup key once restored on Home screen
  useEffect(() => {
    if (!openCatKey) return;
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem('locohelp_return_popup_cat');
      } catch {}
    }, 250);
    return () => window.clearTimeout(timer);
  }, [openCatKey]);

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

  const closePopupExplicitly = () => {
    try {
      sessionStorage.removeItem('locohelp_return_popup_cat');
    } catch {}
    setOpenCatKey(null);
  };

  // Close modal on Escape or mobile Back button, and lock background scroll while open
  useEffect(() => {
    if (!openCatKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePopupExplicitly();
      }
    };
    const handleBackClose = (e: Event) => {
      e.preventDefault();
      closePopupExplicitly();
    };
    const handleCloseAll = () => {
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
    window.addEventListener('locohelp_close_all_modals', handleCloseAll);
    return () => {
      scrollContainers.forEach((el, idx) => {
        el.style.overflowY = prevOverflows[idx] || '';
      });
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('locohelp_close_active_modal', handleBackClose);
      window.removeEventListener('locohelp_close_all_modals', handleCloseAll);
    };
  }, [openCatKey]);

  const activeModalCat = MAIN_CATS.find((c) => c.key === openCatKey) || null;

  const handleSubCategoryClick = (subId: string) => {
    if (openCatKey) {
      try {
        sessionStorage.setItem('locohelp_return_popup_cat', openCatKey);
      } catch {}
    }
    setOpenCatKey(null);
    if (onSelectCategory) {
      onSelectCategory(subId);
    }
    onNavigate('categories');
  };

  const handleOpenCategoryPopup = (cat: MainCatConfig) => {
    try {
      window.history.pushState(
        { locohelpScreen: 'home', locohelpPopupCat: cat.key },
        ''
      );
    } catch {}
    setOpenCatKey(cat.key);
  };

  return (
    <>
      {/* 16 Main Categories Grid (4 columns × 4 rows, solid 3D push-buttons) */}
      <section className="py-1" aria-label="Service categories">
        <div className="loco-cat-grid-4 grid grid-cols-4 auto-rows-[76px] sm:auto-rows-[84px] gap-2.5 w-full">
          {MAIN_CATS.map((cat) => {
            const [line1, line2] = cat.cardLines[langIdx];
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleOpenCategoryPopup(cat)}
                style={{
                  backgroundColor: cat.bg,
                  borderBottomColor: cat.bd,
                  borderBottomWidth: '4px',
                  borderBottomStyle: 'solid',
                  color: '#ffffff',
                }}
                className={`h-[76px] sm:h-[84px] w-full flex flex-col items-center justify-center gap-1 py-1.5 px-1 sm:px-1.5 rounded-2xl ${cat.btnClass} text-center cursor-pointer transition-all duration-150 active:translate-y-0.5 shadow-md overflow-hidden`}
              >
                {/* Crisp white SVG icon inside translucent 3D badge */}
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.22)',
                    borderColor: 'rgba(255, 255, 255, 0.35)',
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-xs"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="#ffffff"
                    fill="none"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 sm:w-[17px] sm:h-[17px] shrink-0"
                  >
                    {cat.iconPaths}
                  </svg>
                </span>

                {/* Bold white 2-line Category Name */}
                <span
                  style={{ color: '#ffffff' }}
                  className="flex flex-col items-center justify-center text-[9.5px] sm:text-[11px] font-bold text-white leading-[1.15] tracking-tight text-center w-full drop-shadow-2xs"
                >
                  <span className="block w-full truncate">{line1}</span>
                  <span className="block w-full truncate">{line2}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Dynamic Row-Themed Sub-Categories Popup Modal — rendered via Portal to document.body */}
      {activeModalCat &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) closePopupExplicitly();
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs overscroll-none"
            role="dialog"
            aria-modal="true"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ borderColor: activeModalCat.bd }}
              className={`w-full max-w-[520px] sm:max-w-[680px] max-h-[84vh] flex flex-col bg-white rounded-3xl border-2 ${activeModalCat.borderClass} shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
            >
              {/* Dynamic Solid Row-Themed Modal Header */}
              <div
                style={{
                  backgroundColor: activeModalCat.bg,
                  borderBottomColor: activeModalCat.bd,
                  borderBottomWidth: '4px',
                  borderBottomStyle: 'solid',
                  color: '#ffffff',
                }}
                className={`flex items-center gap-3 px-4 py-3.5 ${activeModalCat.headerClass} shrink-0`}
              >
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.22)',
                    borderColor: 'rgba(255, 255, 255, 0.35)',
                  }}
                  className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-xs"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    stroke="#ffffff"
                    fill="none"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-[22px] h-[22px] shrink-0"
                  >
                    {activeModalCat.iconPaths}
                  </svg>
                </span>

                <div className="flex-1 min-w-0">
                  <h2
                    style={{ color: '#ffffff' }}
                    className="text-base sm:text-lg font-black text-white leading-snug m-0 truncate"
                  >
                    {activeModalCat.name[langIdx]}
                  </h2>
                  <span
                    style={{
                      backgroundColor: activeModalCat.ic,
                      borderColor: activeModalCat.bd,
                      color: '#ffffff',
                    }}
                    className={`inline-flex items-center px-2 py-0.5 mt-0.5 rounded-lg text-[10px] font-extrabold ${activeModalCat.badgeClass}`}
                  >
                    {langIdx === 2
                      ? `${activeModalCat.subs.length} સેવા વિકલ્પો`
                      : langIdx === 1
                      ? `${activeModalCat.subs.length} सेवा विकल्प`
                      : `${activeModalCat.subs.length} Service Options`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={closePopupExplicitly}
                  aria-label="Close"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.18)',
                    borderColor: 'rgba(255, 255, 255, 0.35)',
                    color: '#ffffff',
                  }}
                  className="w-9 h-9 rounded-xl border border-white/30 bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2.5"
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
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-4 py-4 overflow-y-auto overscroll-contain touch-pan-y bg-white"
              >
                {activeModalCat.subs.map((sub) => {
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubCategoryClick(sub.id)}
                      style={{
                        backgroundColor: activeModalCat.subBg,
                        borderColor: activeModalCat.subBorder,
                        borderBottomColor: activeModalCat.bd,
                        borderBottomWidth: '4px',
                        color: activeModalCat.subText,
                      }}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl ${activeModalCat.subBtnClass} text-[13px] font-extrabold text-left cursor-pointer transition-all duration-150 active:translate-y-0.5 shadow-xs`}
                    >
                      {/* Left themed icon badge */}
                      <span
                        style={{
                          backgroundColor: activeModalCat.bg,
                          borderColor: activeModalCat.bd,
                          color: '#ffffff',
                        }}
                        className={`w-8 h-8 rounded-xl ${activeModalCat.badgeClass} flex items-center justify-center shrink-0 shadow-2xs`}
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
                        >
                          {activeModalCat.iconPaths}
                        </svg>
                      </span>

                      {/* Sub-category name */}
                      <span className="flex-1 leading-snug break-words">
                        {sub.label[langIdx]}
                      </span>

                      {/* Right chevron arrow */}
                      <svg
                        viewBox="0 0 24 24"
                        width="15"
                        height="15"
                        stroke="currentColor"
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 opacity-80"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  );
                })}
              </div>

              {/* Matching Row-Themed Footer Action Button */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSubCategoryClick(activeModalCat.subs[0]?.id || activeModalCat.masterId)}
                  style={{
                    backgroundColor: activeModalCat.bg,
                    borderBottomColor: activeModalCat.bd,
                    borderBottomWidth: '4px',
                    borderBottomStyle: 'solid',
                    color: '#ffffff',
                  }}
                  className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:translate-y-0.5 transition-all cursor-pointer ${activeModalCat.actionBtnClass}`}
                >
                  <span>
                    {langIdx === 2
                      ? `${activeModalCat.name[2]} ના તમામ કારીગરો / નિષ્ણાતો જુઓ`
                      : langIdx === 1
                      ? `${activeModalCat.name[1]} के सभी एक्सपर्ट देखें`
                      : `View All Experts in ${activeModalCat.name[0]}`}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
