import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Check, Globe, Home } from 'lucide-react';
import { useLanguage } from '../i18n';
import {
  PAN_INDIA_STATES_DISTRICTS,
  getTalukasForDistrict,
  UserManualLocation,
  getSavedUserLocation,
  getProfileRegisteredLocation,
  saveUserLocationPermanently,
  localizePlaceName,
} from '../data/panIndiaLocations';

interface PanIndiaLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserManualLocation;
  onLocationSaved: (newLoc: UserManualLocation) => void;
}

const POPULAR_CITIES: Array<{
  state: string;
  district: string;
  gu: string;
  hi: string;
  en: string;
}> = [
  { state: 'Gujarat', district: 'Gandhinagar', gu: 'ગાંધીનગર', hi: 'गांधीनगर', en: 'Gandhinagar' },
  { state: 'Gujarat', district: 'Ahmedabad', gu: 'અમદાવાદ', hi: 'अहमदाबाद', en: 'Ahmedabad' },
  { state: 'Gujarat', district: 'Surat', gu: 'સુરત', hi: 'सूरत', en: 'Surat' },
  { state: 'Gujarat', district: 'Vadodara', gu: 'વડોદરા', hi: 'वडोदरा', en: 'Vadodara' },
  { state: 'Gujarat', district: 'Rajkot', gu: 'રાજકોટ', hi: 'राजकोट', en: 'Rajkot' },
  { state: 'Gujarat', district: 'Mehsana', gu: 'મહેસાણા', hi: 'मेहसाणा', en: 'Mehsana' },
  { state: 'Gujarat', district: 'Anand', gu: 'આણંદ', hi: 'आणंद', en: 'Anand' },
  { state: 'Gujarat', district: 'Bhavnagar', gu: 'ભાવનગર', hi: 'भावनगर', en: 'Bhavnagar' },
];

export default function PanIndiaLocationModal({
  isOpen,
  onClose,
  currentLocation,
  onLocationSaved,
}: PanIndiaLocationModalProps) {
  const { language } = useLanguage();
  const [selectedState, setSelectedState] = useState<string>(
    currentLocation.state && currentLocation.state !== 'All' ? currentLocation.state : 'Gujarat'
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    currentLocation.district && currentLocation.district !== 'All'
      ? currentLocation.district
      : 'Gandhinagar'
  );
  const [selectedTaluka, setSelectedTaluka] = useState<string>(
    currentLocation.taluka || currentLocation.area || ''
  );

  const registeredProfileLoc = useMemo(() => getProfileRegisteredLocation(), [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedUserLocation();
      if (saved.district && saved.district.toLowerCase() !== 'all') {
        const st = saved.state && saved.state !== 'All' ? saved.state : 'Gujarat';
        const dists = PAN_INDIA_STATES_DISTRICTS[st] || PAN_INDIA_STATES_DISTRICTS['Gujarat'];
        const dist = dists.includes(saved.district) ? saved.district : dists[0];
        const tals = getTalukasForDistrict(dist);
        const savedTal = saved.taluka ?? saved.area ?? '';
        const tal = savedTal === '' || tals.includes(savedTal) ? savedTal : '';
        setSelectedState(st);
        setSelectedDistrict(dist);
        setSelectedTaluka(tal);
      } else {
        setSelectedState('Gujarat');
        setSelectedDistrict('Gandhinagar');
        setSelectedTaluka('');
      }
    }
  }, [isOpen]);

  const statesList = useMemo(() => Object.keys(PAN_INDIA_STATES_DISTRICTS), []);
  const districtsForSelectedState = useMemo(() => {
    return PAN_INDIA_STATES_DISTRICTS[selectedState] || PAN_INDIA_STATES_DISTRICTS['Gujarat'];
  }, [selectedState]);
  const talukasForSelectedDistrict = useMemo(() => {
    return getTalukasForDistrict(selectedDistrict);
  }, [selectedDistrict]);

  if (!isOpen) return null;

  const applyAndClose = async (loc: UserManualLocation) => {
    await saveUserLocationPermanently(loc);
    onLocationSaved(loc);
    onClose();
  };

  const handleSave = async () => {
    const finalState = (selectedState || 'Gujarat').trim();
    const finalDistrict = (selectedDistrict || 'Gandhinagar').trim();
    const finalTaluka = (selectedTaluka || '').trim();

    await applyAndClose({
      state: finalState,
      district: finalDistrict,
      taluka: finalTaluka,
      area: finalTaluka,
    });
  };

  const activeDistLower = (currentLocation?.district || '').trim().toLowerCase();
  const isAllCitiesActive = !activeDistLower || activeDistLower === 'all';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs"
        style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Compact Header */}
          <div className="px-4 py-3 bg-teal-700 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
              <div>
                <h3 className="text-sm font-black leading-tight">
                  {language === 'EN'
                    ? 'Change Viewing Location (1-Click)'
                    : language === 'GU'
                    ? 'લોકેશન બદલો (૧-ક્લિકમાં પસંદ કરો)'
                    : 'लोकेशन बदलें (1-क्लिक में चुनें)'}
                </h3>
                <p className="text-[10px] text-teal-100 font-bold">
                  {language === 'EN'
                    ? 'View Posts, Service Experts & Shops of any city'
                    : language === 'GU'
                    ? 'ગમે તે શહેરની પોસ્ટ, સર્વિસ એક્સપર્ટ અને બિઝનેસ જુઓ'
                    : 'किसी भी शहर की पोस्ट, सर्विस एक्सपर्ट और दुकानें देखें'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-4 space-y-3.5 overflow-y-auto">
            {/* Top 1-Click Mode Buttons: All Cities & My Registered Location */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  applyAndClose({
                    state: 'All',
                    district: 'All',
                    taluka: '',
                    area: '',
                  })
                }
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                  isAllCitiesActive
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-teal-50 dark:bg-slate-800 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-slate-700 hover:bg-teal-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {language === 'EN'
                    ? 'All Cities'
                    : language === 'GU'
                    ? 'બધા શહેરો જુઓ'
                    : 'सभी शहर देखें'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyAndClose({
                    state: registeredProfileLoc.state || 'Gujarat',
                    district: registeredProfileLoc.district || 'Gandhinagar',
                    taluka: registeredProfileLoc.taluka || '',
                    area: registeredProfileLoc.area || '',
                  })
                }
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-black bg-indigo-50 dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-slate-700 hover:bg-indigo-100 transition-all cursor-pointer active:scale-95"
              >
                <Home className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                <span className="truncate">
                  {language === 'EN'
                    ? `My City (${registeredProfileLoc.district || 'Gandhinagar'})`
                    : language === 'GU'
                    ? `મારું શહેર (${localizePlaceName(registeredProfileLoc.district || 'Gandhinagar', 'GU')})`
                    : `मेरा शहर (${localizePlaceName(registeredProfileLoc.district || 'Gandhinagar', 'HI')})`}
                </span>
              </button>
            </div>

            {/* 1-Click Popular Cities Grid */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                ⚡{' '}
                {language === 'EN'
                  ? '1-Click Quick Select City:'
                  : language === 'GU'
                  ? '૧-ક્લિકમાં મુખ્ય શહેર પસંદ કરો:'
                  : '1-क्लिक में मुख्य शहर चुनें:'}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {POPULAR_CITIES.map((city) => {
                  const isSelected =
                    !isAllCitiesActive &&
                    activeDistLower === city.district.toLowerCase();
                  return (
                    <button
                      key={city.district}
                      type="button"
                      onClick={() =>
                        applyAndClose({
                          state: city.state,
                          district: city.district,
                          taluka: '',
                          area: '',
                        })
                      }
                      className={`px-2 py-2 rounded-xl text-[11px] font-black border transition-all cursor-pointer active:scale-95 truncate ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                      }`}
                    >
                      {language === 'GU' ? city.gu : language === 'HI' ? city.hi : city.en}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-2.5 space-y-2.5">
              <div className="text-[11px] font-black text-slate-600 dark:text-slate-400">
                🔍{' '}
                {language === 'EN'
                  ? 'Or Select Any State, District & Taluka:'
                  : language === 'GU'
                  ? 'અથવા રાજ્ય, જિલ્લો અને તાલુકો પસંદ કરો:'
                  : 'या राज्य, जिला और तालुका चुनें:'}
              </div>

              {/* 1. State */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                  {language === 'EN' ? '1. State:' : language === 'GU' ? '1. રાજ્ય પસંદ કરો:' : '1. राज्य चुनें:'}
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setSelectedState(newState);
                    const dists = PAN_INDIA_STATES_DISTRICTS[newState] || [];
                    const firstDist = dists[0] || '';
                    setSelectedDistrict(firstDist);
                    setSelectedTaluka('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 dark:text-white outline-none focus:border-teal-600 cursor-pointer"
                >
                  {statesList.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. District */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                  {language === 'EN' ? '2. District:' : language === 'GU' ? '2. જિલ્લો પસંદ કરો:' : '2. जिला चुनें:'}
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    const newDist = e.target.value;
                    setSelectedDistrict(newDist);
                    setSelectedTaluka('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 dark:text-white outline-none focus:border-teal-600 cursor-pointer"
                >
                  {districtsForSelectedState.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Taluka */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                  {language === 'EN'
                    ? '3. Taluka / Area:'
                    : language === 'GU'
                    ? '3. તાલુકો / વિસ્તાર પસંદ કરો:'
                    : '3. तालुका / क्षेत्र चुनें:'}
                </label>
                <select
                  value={selectedTaluka}
                  onChange={(e) => setSelectedTaluka(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 dark:text-white outline-none focus:border-teal-600 cursor-pointer"
                >
                  <option value="">
                    {language === 'EN'
                      ? `All of ${selectedDistrict} District`
                      : language === 'GU'
                      ? `આખો ${localizePlaceName(selectedDistrict, 'GU')} જિલ્લો (બધા તાલુકા)`
                      : `पूरा ${localizePlaceName(selectedDistrict, 'HI')} जिला (सभी तालुका)`}
                  </option>
                  {talukasForSelectedDistrict.map((tal) => (
                    <option key={tal} value={tal}>
                      {tal}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-teal-50 dark:bg-slate-800/80 border border-teal-200 dark:border-slate-700 px-3 py-2 text-[10.5px] font-bold text-teal-900 dark:text-teal-300 leading-snug">
              🛡️{' '}
              {language === 'EN'
                ? 'Note: Changing location here only updates what you view. Your registered profile address will not be overwritten.'
                : language === 'GU'
                ? 'નોંધ: અહીંથી લોકેશન બદલવાથી તમારી પોતાની પ્રોફાઈલનું સરનામું બદલાશે નહીં, માત્ર તે શહેરની પોસ્ટ, સર્વિસ એક્સપર્ટ અને બિઝનેસ દેખાશે.'
                : 'नोट: यहां से लोकेशन बदलने पर आपकी प्रोफाइल का पता नहीं बदलेगा, केवल उस शहर की पोस्ट और सर्विस एक्सपर्ट दिखेंगे।'}
            </div>
          </div>

          {/* Footer Action */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {language === 'EN' ? 'Cancel' : language === 'GU' ? 'રદ કરો' : 'रद्द करें'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {language === 'EN'
                  ? `Apply (${selectedTaluka || selectedDistrict})`
                  : language === 'GU'
                  ? `લોકેશન લાગુ કરો (${localizePlaceName(selectedTaluka || selectedDistrict, 'GU')})`
                  : `लोकेशन लागू करें (${localizePlaceName(selectedTaluka || selectedDistrict, 'HI')})`}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
