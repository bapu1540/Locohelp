import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Check } from 'lucide-react';
import { useLanguage } from '../i18n';
import {
  PAN_INDIA_STATES_DISTRICTS,
  getTalukasForDistrict,
  UserManualLocation,
  getSavedUserLocation,
  saveUserLocationPermanently,
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
  onLocationSaved,
}: PanIndiaLocationModalProps) {
  const { language } = useLanguage();
  const [selectedState, setSelectedState] = useState<string>(currentLocation.state || 'Gujarat');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(currentLocation.district || 'Gandhinagar');
  const [selectedTaluka, setSelectedTaluka] = useState<string>(
    currentLocation.taluka || currentLocation.area || ''
  );

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedUserLocation();
      const st = saved.state || 'Gujarat';
      const dists = PAN_INDIA_STATES_DISTRICTS[st] || PAN_INDIA_STATES_DISTRICTS['Gujarat'];
      const dist = dists.includes(saved.district) ? saved.district : dists[0];
      const tals = getTalukasForDistrict(dist);
      const savedTal = saved.taluka || saved.area || '';
      const tal = tals.includes(savedTal) ? savedTal : tals[0] || '';
      setSelectedState(st);
      setSelectedDistrict(dist);
      setSelectedTaluka(tal);
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

  const handleSave = async () => {
    const finalState = (selectedState || 'Gujarat').trim();
    const finalDistrict = (selectedDistrict || 'Gandhinagar').trim();
    const finalTaluka = (selectedTaluka || '').trim();

    const updated: UserManualLocation = {
      state: finalState,
      district: finalDistrict,
      taluka: finalTaluka,
      area: finalTaluka,
    };

    await saveUserLocationPermanently(updated);
    onLocationSaved(updated);
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs"
        style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Compact Header */}
          <div className="px-4 py-3 bg-teal-700 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
              <h3 className="text-sm font-black leading-tight">
                {language === 'EN'
                  ? 'Select Location (State ➔ District ➔ Taluka)'
                  : language === 'GU'
                  ? 'લોકેશન પસંદ કરો (રાજ્ય ➔ જિલ્લો ➔ તાલુકો)'
                  : 'लोकेशन चुनें (राज्य ➔ जिला ➔ तालुका)'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Compact 3-Dropdown Body */}
          <div className="p-4 space-y-3">
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
                  const firstTal = getTalukasForDistrict(firstDist)[0] || '';
                  setSelectedTaluka(firstTal);
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
                  const firstTal = getTalukasForDistrict(newDist)[0] || '';
                  setSelectedTaluka(firstTal);
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
                {language === 'EN' ? '3. Taluka:' : language === 'GU' ? '3. તાલુકો પસંદ કરો:' : '3. तालुका चुनें:'}
              </label>
              <select
                value={selectedTaluka}
                onChange={(e) => setSelectedTaluka(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 dark:text-white outline-none focus:border-teal-600 cursor-pointer"
              >
                {talukasForSelectedDistrict.map((tal) => (
                  <option key={tal} value={tal}>
                    {tal}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl bg-teal-50 dark:bg-slate-800/80 border border-teal-200 dark:border-slate-700 px-3 py-2 text-[11px] font-bold text-teal-900 dark:text-teal-300 flex items-center justify-between">
              <span>
                📍 {selectedTaluka ? `${selectedTaluka}, ` : ''}
                {selectedDistrict}, {selectedState}
              </span>
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
                  ? `લોકેશન લાગુ કરો (${selectedTaluka || selectedDistrict})`
                  : `लोकेशन लागू करें (${selectedTaluka || selectedDistrict})`}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
