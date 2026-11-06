import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import {
  PAN_INDIA_STATES_DISTRICTS,
  getTalukasForDistrict,
  getProfileRegisteredLocation,
  findStateForDistrict,
} from '../data/panIndiaLocations';
import { Language } from '../types';
import { useLanguage } from '../i18n';

interface SmartLocationPickerProps {
  language?: Language;
  value: string;
  onChange: (
    formattedLocation: string,
    details: { state: string; district: string; area: string; taluka: string }
  ) => void;
  required?: boolean;
  label?: string;
  compact?: boolean;
  accentColor?: string;
}

export const SmartLocationPicker: React.FC<SmartLocationPickerProps> = ({
  language: propLanguage,
  value,
  onChange,
  required = true,
  label,
}) => {
  const { language: ctxLanguage } = useLanguage();
  const language: Language = propLanguage || ctxLanguage || 'GU';

  const regLoc = getProfileRegisteredLocation();
  const initialState = regLoc.state || 'Gujarat';
  const initialDistrict =
    regLoc.district && (PAN_INDIA_STATES_DISTRICTS[initialState] || []).includes(regLoc.district)
      ? regLoc.district
      : (PAN_INDIA_STATES_DISTRICTS[initialState] || ['Gandhinagar'])[0];
  const initialTaluka =
    regLoc.taluka && getTalukasForDistrict(initialDistrict).includes(regLoc.taluka)
      ? regLoc.taluka
      : getTalukasForDistrict(initialDistrict)[0] || '';

  const [selectedState, setSelectedState] = useState<string>(initialState);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialDistrict);
  const [selectedTaluka, setSelectedTaluka] = useState<string>(initialTaluka);

  // Parse incoming value if already formatted like "Kalol, Gandhinagar, Gujarat" or "Kalol, Gandhinagar"
  useEffect(() => {
    if (!value) return;
    const parts = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const maybeState = parts.find((p) => Object.keys(PAN_INDIA_STATES_DISTRICTS).includes(p));
      const stateToUse = maybeState || findStateForDistrict(parts[1]) || selectedState || 'Gujarat';
      const districtsForState = PAN_INDIA_STATES_DISTRICTS[stateToUse] || PAN_INDIA_STATES_DISTRICTS['Gujarat'];
      const maybeDistrict =
        parts.find((p) => districtsForState.some((d) => d.toLowerCase() === p.toLowerCase())) ||
        districtsForState[0];
      const matchedDistExact =
        districtsForState.find((d) => d.toLowerCase() === (maybeDistrict || '').toLowerCase()) ||
        districtsForState[0];
      const talukasForDist = getTalukasForDistrict(matchedDistExact);
      const firstPart = parts[0];
      const matchedTaluka =
        talukasForDist.find((t) => t.toLowerCase() === (firstPart || '').toLowerCase()) ||
        (firstPart && firstPart !== stateToUse && firstPart !== matchedDistExact ? firstPart : talukasForDist[0] || '');

      setSelectedState(stateToUse);
      setSelectedDistrict(matchedDistExact);
      setSelectedTaluka(matchedTaluka);
    } else if (parts.length === 1) {
      const only = parts[0];
      const stateFound = findStateForDistrict(only);
      const districtsForState = PAN_INDIA_STATES_DISTRICTS[stateFound] || PAN_INDIA_STATES_DISTRICTS['Gujarat'];
      const matchedDist = districtsForState.find((d) => d.toLowerCase() === only.toLowerCase());
      if (matchedDist) {
        const firstTal = getTalukasForDistrict(matchedDist)[0] || '';
        setSelectedState(stateFound);
        setSelectedDistrict(matchedDist);
        setSelectedTaluka(firstTal);
      }
    }
  }, [value]);

  const districts = PAN_INDIA_STATES_DISTRICTS[selectedState] || PAN_INDIA_STATES_DISTRICTS['Gujarat'];
  const talukas = getTalukasForDistrict(selectedDistrict);

  const emitLocation = (nextState: string, nextDistrict: string, nextTaluka: string) => {
    const cleanTaluka = (nextTaluka || '').trim();
    const formatted = cleanTaluka
      ? `${cleanTaluka}, ${nextDistrict}, ${nextState}`
      : `${nextDistrict}, ${nextState}`;
    onChange(formatted, {
      state: nextState,
      district: nextDistrict,
      area: cleanTaluka,
      taluka: cleanTaluka,
    });
  };

  // Emit default on mount if parent value is empty
  useEffect(() => {
    if (!value && selectedDistrict && selectedState) {
      emitLocation(selectedState, selectedDistrict, selectedTaluka);
    }
  }, []);

  const handleStateChange = (newState: string) => {
    const firstDistrict = (PAN_INDIA_STATES_DISTRICTS[newState] || [])[0] || '';
    const firstTaluka = getTalukasForDistrict(firstDistrict)[0] || '';
    setSelectedState(newState);
    setSelectedDistrict(firstDistrict);
    setSelectedTaluka(firstTaluka);
    emitLocation(newState, firstDistrict, firstTaluka);
  };

  const handleDistrictChange = (newDistrict: string) => {
    const firstTaluka = getTalukasForDistrict(newDistrict)[0] || '';
    setSelectedDistrict(newDistrict);
    setSelectedTaluka(firstTaluka);
    emitLocation(selectedState, newDistrict, firstTaluka);
  };

  const handleTalukaChange = (newTaluka: string) => {
    setSelectedTaluka(newTaluka);
    emitLocation(selectedState, selectedDistrict, newTaluka);
  };

  const titleText =
    label ||
    (language === 'HI'
      ? 'लोकेशन'
      : language === 'GU'
      ? 'લોકેશન'
      : 'Location');

  return (
    <div className="rounded-2xl border border-indigo-100 dark:border-slate-700 bg-indigo-50/40 dark:bg-slate-800/50 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            {titleText} {required && <span className="text-rose-500">*</span>}
          </span>
        </label>
        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md truncate max-w-[170px]">
          📍 {selectedTaluka ? `${selectedTaluka}, ${selectedDistrict}` : selectedDistrict}
        </span>
      </div>

      {/* Compact 3-Column Row: 1. State -> 2. District -> 3. Taluka */}
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
            {language === 'HI' ? '1. राज्य' : language === 'GU' ? '1. રાજ્ય' : '1. State'}
          </label>
          <select
            value={selectedState}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full h-9 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {Object.keys(PAN_INDIA_STATES_DISTRICTS).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
            {language === 'HI' ? '2. जिला' : language === 'GU' ? '2. જિલ્લો' : '2. District'}
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full h-9 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
            {language === 'HI' ? '3. तालुका' : language === 'GU' ? '3. તાલુકો' : '3. Taluka'}
          </label>
          <select
            value={selectedTaluka}
            onChange={(e) => handleTalukaChange(e.target.value)}
            className="w-full h-9 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {talukas.map((tal) => (
              <option key={tal} value={tal}>
                {tal}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default SmartLocationPicker;
