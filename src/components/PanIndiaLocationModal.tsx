import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Check, Search, Building2, Globe } from 'lucide-react';
import { useLanguage } from '../i18n';
import {
  PAN_INDIA_STATES_DISTRICTS,
  DISTRICT_POPULAR_AREAS,
  UserManualLocation,
  getSavedUserLocation,
  saveUserLocationPermanently,
  getConnectedTwinDistricts
} from '../data/panIndiaLocations';

interface PanIndiaLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserManualLocation;
  onLocationSaved: (newLoc: UserManualLocation) => void;
}

export default function PanIndiaLocationModal({
  isOpen,
  onClose,
  currentLocation,
  onLocationSaved
}: PanIndiaLocationModalProps) {
  const { language } = useLanguage();
  const [selectedState, setSelectedState] = useState<string>(currentLocation.state || 'Gujarat');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(currentLocation.district || 'Gandhinagar');
  const [customDistrict, setCustomDistrict] = useState<string>('');
  const [localArea, setLocalArea] = useState<string>(currentLocation.area || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedUserLocation();
      setSelectedState(saved.state || 'Gujarat');
      setSelectedDistrict(saved.district || 'Gandhinagar');
      setLocalArea(saved.area || '');
      setCustomDistrict('');
      setSearchQuery('');
    }
  }, [isOpen]);

  const statesList = useMemo(() => Object.keys(PAN_INDIA_STATES_DISTRICTS), []);

  const districtsForSelectedState = useMemo(() => {
    return PAN_INDIA_STATES_DISTRICTS[selectedState] || PAN_INDIA_STATES_DISTRICTS['Gujarat'];
  }, [selectedState]);

  // Quick search across all India districts
  const matchingSearchDistricts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matches: { state: string; district: string }[] = [];
    for (const [st, dists] of Object.entries(PAN_INDIA_STATES_DISTRICTS)) {
      for (const d of dists) {
        if (d.toLowerCase().includes(q) || st.toLowerCase().includes(q)) {
          matches.push({ state: st, district: d });
        }
      }
    }
    return matches.slice(0, 12);
  }, [searchQuery]);

  const activeDistrictName = selectedDistrict === 'Other'
    ? (customDistrict.trim() || 'Gandhinagar')
    : selectedDistrict;

  const connectedTwinList = useMemo(() => {
    return getConnectedTwinDistricts(activeDistrictName);
  }, [activeDistrictName]);

  const popularAreasForDistrict = useMemo(() => {
    return DISTRICT_POPULAR_AREAS[activeDistrictName] || [];
  }, [activeDistrictName]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const finalDistrict = (selectedDistrict === 'Other' ? (customDistrict.trim() || 'Gandhinagar') : selectedDistrict).trim();
    const finalState = (selectedState || 'Gujarat').trim();
    const finalArea = localArea.trim();

    const updated: UserManualLocation = {
      state: finalState,
      district: finalDistrict,
      area: finalArea
    };

    await saveUserLocationPermanently(updated);
    onLocationSaved(updated);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 14 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black leading-tight">
                  {language === 'EN'
                    ? 'Select Your Location (Pan-India)'
                    : language === 'GU'
                    ? 'તમારું લોકેશન પસંદ કરો (Pan-India)'
                    : 'अपनी लोकेशन चुनें (Pan-India)'}
                </h3>
                <p className="text-[11px] text-indigo-100 font-medium">
                  {language === 'EN'
                    ? 'Manual selection • Saved permanently until you change it'
                    : language === 'GU'
                    ? 'મેન્યુઅલ લોકેશન • જ્યાં સુધી તમે બદલશો નહીં ત્યાં સુધી સેવ રહેશે'
                    : 'मैनुअल लोकेशन • जब तक आप बदलेंगे नहीं, यही सेव रहेगी'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-hide">
            {/* Quick Search District across India */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'EN'
                      ? 'Quick search any District or City in India...'
                      : language === 'GU'
                      ? 'ભારતનો કોઈપણ જિલ્લો કે શહેર અહીં શોધો...'
                      : 'भारत का कोई भी जिला या शहर यहाँ खोजें...'
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {matchingSearchDistricts.length > 0 && (
                <div className="bg-indigo-50/70 dark:bg-slate-800/90 border border-indigo-200 dark:border-slate-700 rounded-2xl p-2.5 space-y-1">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block px-1">
                    {language === 'EN' ? 'Matching Districts / Cities:' : language === 'GU' ? 'મળતા આવતા શહેરો / જિલ્લાઓ:' : 'मिलते-जुलते शहर / जिले:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {matchingSearchDistricts.map((item) => (
                      <button
                        key={`${item.state}-${item.district}`}
                        type="button"
                        onClick={() => {
                          setSelectedState(item.state);
                          setSelectedDistrict(item.district);
                          setSearchQuery('');
                          const defaultAreas = DISTRICT_POPULAR_AREAS[item.district];
                          if (defaultAreas && defaultAreas.length > 0) {
                            setLocalArea(defaultAreas[0]);
                          } else {
                            setLocalArea('');
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-600 hover:text-white text-slate-800 dark:text-slate-200 border border-indigo-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        📍 {item.district} <span className="opacity-65 text-[10px]">({item.state})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 1. Select State (All India) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>{language === 'EN' ? '1. Select State (All India):' : language === 'GU' ? '1. રાજ્ય પસંદ કરો (Pan-India):' : '1. राज्य चुनें (Pan-India):'}</span>
              </label>
              <select
                value={selectedState}
                onChange={(e) => {
                  const newState = e.target.value;
                  setSelectedState(newState);
                  const dists = PAN_INDIA_STATES_DISTRICTS[newState] || [];
                  const firstDist = dists[0] || '';
                  setSelectedDistrict(firstDist);
                  const popAreas = DISTRICT_POPULAR_AREAS[firstDist] || [];
                  setLocalArea(popAreas[0] || '');
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer"
              >
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select District / City */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'EN' ? '2. Select District / City:' : language === 'GU' ? '2. જિલ્લો / શહેર પસંદ કરો:' : '2. जिला / शहर चुनें:'}</span>
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  const newDist = e.target.value;
                  setSelectedDistrict(newDist);
                  const popAreas = DISTRICT_POPULAR_AREAS[newDist] || [];
                  setLocalArea(popAreas[0] || '');
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white outline-none focus:border-emerald-600 cursor-pointer"
              >
                {districtsForSelectedState.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
                <option value="Other">Other / Type Custom City...</option>
              </select>

              {selectedDistrict === 'Other' && (
                <input
                  type="text"
                  value={customDistrict}
                  onChange={(e) => setCustomDistrict(e.target.value)}
                  placeholder={language === 'EN' ? 'Enter your District or City name...' : language === 'GU' ? 'તમારા જિલ્લા કે શહેરનું નામ લખો...' : 'अपने जिले या शहर का नाम लिखें...'}
                  className="mt-2 w-full bg-white dark:bg-slate-800 border-2 border-emerald-400 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              )}
            </div>

            {/* 3. Optional Local Area / Village / Sector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{language === 'EN' ? '3. Local Area / Village / Sector (Optional):' : language === 'GU' ? '3. લોકલ વિસ્તાર / ગામ / સેક્ટર:' : '3. लोकल एरिया / गाँव / सेक्टर:'}</span>
              </label>

              {popularAreasForDistrict.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {popularAreasForDistrict.map((areaName) => {
                    const isSelected = localArea.trim().toLowerCase() === areaName.toLowerCase();
                    return (
                      <button
                        key={areaName}
                        type="button"
                        onClick={() => setLocalArea(areaName)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        📍 {areaName}
                      </button>
                    );
                  })}
                </div>
              )}

              <input
                type="text"
                value={localArea}
                onChange={(e) => setLocalArea(e.target.value)}
                placeholder={
                  language === 'EN'
                    ? 'Type Area / Village / Sector (e.g., Kudasan, Sector 21, Chandkheda)'
                    : language === 'GU'
                    ? 'વિસ્તાર / ગામ / સેક્ટર લખો (દા.ત. કુડાસણ, સેક્ટર 21, ચાંદખેડા)'
                    : 'एरिया / गाँव / सेक्टर लिखें (जैसे: Kudasan, Sector 21, Chandkheda)'
                }
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            {/* Connected Twin-City Info Box */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300">
                  📍 {localArea.trim() ? `${localArea.trim()}, ` : ''}{activeDistrictName}, {selectedState}
                </span>
                <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  Active Zone
                </span>
              </div>
              {connectedTwinList.length > 1 && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 font-semibold leading-snug">
                  🔗 {language === 'EN' ? 'Twin-City Connected Feed:' : language === 'GU' ? 'ટ્વિન-સિટી કનેક્ટેડ ફીડ:' : 'Twin-City कनेक्टेड फ़ीड:'}{' '}
                  <span className="font-black">
                    {connectedTwinList.slice(0, 3).map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(' + ')}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {language === 'EN' ? 'Cancel' : language === 'GU' ? 'રદ કરો' : 'रद्द करें'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {language === 'EN'
                  ? `Save Location (${activeDistrictName})`
                  : language === 'GU'
                  ? `લોકેશન સેવ કરો (${activeDistrictName})`
                  : `लोकेशन सेव करें (${activeDistrictName})`}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
