import React, { useState, useEffect } from 'react';
import { MapPin, Check } from 'lucide-react';
import {
  PAN_INDIA_STATES_DISTRICTS,
  DISTRICT_POPULAR_AREAS,
  getSavedUserLocation,
  saveUserLocationPermanently,
} from '../data/panIndiaLocations';
import { Language } from '../types';
import { useLanguage } from '../i18n';

interface SmartLocationPickerProps {
  language?: Language;
  value: string;
  onChange: (formattedLocation: string, details: { state: string; district: string; area: string }) => void;
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
  compact = false,
}) => {
  const { language: ctxLanguage } = useLanguage();
  const language: Language = propLanguage || ctxLanguage || 'GU';
  const savedLoc = getSavedUserLocation();
  const [selectedState, setSelectedState] = useState<string>(savedLoc.state || 'Gujarat');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(savedLoc.district || 'Surat');
  const [selectedArea, setSelectedArea] = useState<string>(savedLoc.area || '');

  // Parse incoming value if already formatted like "Adajan, Surat, Gujarat" or "Adajan, Surat"
  useEffect(() => {
    if (!value) return;
    const parts = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const maybeState = parts.find((p) => Object.keys(PAN_INDIA_STATES_DISTRICTS).includes(p));
      const stateToUse = maybeState || selectedState;
      const districtsForState = PAN_INDIA_STATES_DISTRICTS[stateToUse] || [];
      const maybeDistrict = parts.find((p) => districtsForState.includes(p));

      if (maybeState && maybeState !== selectedState) {
        setSelectedState(maybeState);
      }
      if (maybeDistrict && maybeDistrict !== selectedDistrict) {
        setSelectedDistrict(maybeDistrict);
      }
      const firstPart = parts[0];
      if (firstPart && firstPart !== maybeState && firstPart !== maybeDistrict) {
        setSelectedArea(firstPart);
      }
    } else if (parts.length === 1 && !selectedArea) {
      const only = parts[0];
      const districtsForState = PAN_INDIA_STATES_DISTRICTS[selectedState] || [];
      if (districtsForState.includes(only)) {
        setSelectedDistrict(only);
      } else {
        setSelectedArea(only);
      }
    }
  }, []);

  const districts = PAN_INDIA_STATES_DISTRICTS[selectedState] || [];
  const popularAreas = DISTRICT_POPULAR_AREAS[selectedDistrict] || [];

  const emitLocation = (nextState: string, nextDistrict: string, nextArea: string) => {
    const cleanArea = nextArea.trim();
    const formatted = cleanArea
      ? `${cleanArea}, ${nextDistrict}, ${nextState}`
      : `${nextDistrict}, ${nextState}`;
    saveUserLocationPermanently({
      state: nextState,
      district: nextDistrict,
      area: cleanArea,
    });
    onChange(formatted, {
      state: nextState,
      district: nextDistrict,
      area: cleanArea,
    });
  };

  // Emit default on mount if parent value is empty
  useEffect(() => {
    if (!value && selectedDistrict && selectedState) {
      emitLocation(selectedState, selectedDistrict, selectedArea);
    }
  }, []);

  const handleStateChange = (newState: string) => {
    const firstDistrict = (PAN_INDIA_STATES_DISTRICTS[newState] || [])[0] || '';
    setSelectedState(newState);
    setSelectedDistrict(firstDistrict);
    setSelectedArea('');
    emitLocation(newState, firstDistrict, '');
  };

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    setSelectedArea('');
    emitLocation(selectedState, newDistrict, '');
  };

  const handleAreaChange = (newArea: string) => {
    setSelectedArea(newArea);
    emitLocation(selectedState, selectedDistrict, newArea);
  };

  const titleText =
    label ||
    (language === 'HI'
      ? 'लोकेशन चुनें (राज्य → शहर/जिला → एरिया)'
      : language === 'GU'
      ? 'લોકેશન પસંદ કરો (રાજ્ય → શહેર/જિલ્લો → વિસ્તાર)'
      : 'Select Location (State → City/District → Area)');

  return (
    <div className={`rounded-2xl border border-indigo-100 bg-indigo-50/40 ${compact ? 'p-3' : 'p-3.5'} space-y-3`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            {titleText} {required && <span className="text-rose-500">*</span>}
          </span>
        </label>
        {value && (
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md truncate max-w-[160px]">
            📍 {selectedArea ? `${selectedArea}, ${selectedDistrict}` : selectedDistrict}
          </span>
        )}
      </div>

      {/* Step 1 & 2: State & District Dropdowns */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            {language === 'HI' ? '1. राज्य (State)' : language === 'GU' ? '1. રાજ્ય (State)' : '1. State'}
          </label>
          <select
            value={selectedState}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full h-10 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            {Object.keys(PAN_INDIA_STATES_DISTRICTS).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            {language === 'HI' ? '2. शहर / जिला (City)' : language === 'GU' ? '2. શહેર / જિલ્લો (City)' : '2. City / District'}
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full h-10 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            {districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 3: Popular Area Quick Chips + Area Input */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
          {language === 'HI'
            ? '3. लोकल एरिया / सेक्टर चुनें या लिखें'
            : language === 'GU'
            ? '3. લોકલ વિસ્તાર / સેક્ટર પસંદ કરો અથવા લખો'
            : '3. Select or Type Local Area / Sector'}
        </label>

        {popularAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto pr-1">
            {popularAreas.map((areaItem) => {
              const isSelected = selectedArea.toLowerCase() === areaItem.toLowerCase();
              return (
                <button
                  key={areaItem}
                  type="button"
                  onClick={() => handleAreaChange(isSelected ? '' : areaItem)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{areaItem}</span>
                </button>
              );
            })}
          </div>
        )}

        <input
          type="text"
          value={selectedArea}
          onChange={(e) => handleAreaChange(e.target.value)}
          placeholder={
            language === 'HI'
              ? `उदा. ${popularAreas[0] || 'Main Market'}, सेक्टर या कॉलोनी का नाम...`
              : language === 'GU'
              ? `દા.ત. ${popularAreas[0] || 'Main Market'}, સોસાયટી કે વિસ્તારનું નામ...`
              : `e.g. ${popularAreas[0] || 'Main Market'}, Colony or Sector name...`
          }
          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
        />
      </div>
    </div>
  );
};

export default SmartLocationPicker;

