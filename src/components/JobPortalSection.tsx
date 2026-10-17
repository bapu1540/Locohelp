import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Briefcase, Building2, UserCheck, ArrowRight, Sparkles, ShieldCheck, Plus, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n';
import { fetchJobPortalItems } from '../api';

interface JobPortalSectionProps {
  onOpenSeekerForm?: () => void;
  onOpenSeekerNew?: () => void;
  onOpenSeekerRegistered?: () => void;
  onOpenEmployerForm?: () => void;
  onOpenEmployerNew?: () => void;
  onOpenEmployerRegistered?: () => void;
  onBrowseJobs: () => void;
}

export default function JobPortalSection({
  onOpenSeekerForm,
  onOpenSeekerNew,
  onOpenSeekerRegistered,
  onOpenEmployerForm,
  onOpenEmployerNew,
  onOpenEmployerRegistered,
  onBrowseJobs
}: JobPortalSectionProps) {
  const { language } = useLanguage();
  const [approvedCount, setApprovedCount] = useState<number>(2);

  useEffect(() => {
    fetchJobPortalItems({ status: 'approved' })
      .then((items) => {
        if (Array.isArray(items)) {
          setApprovedCount(items.length);
        }
      })
      .catch(() => {});
  }, []);

  const handleSeekerNew = onOpenSeekerNew || onOpenSeekerForm || (() => {});
  const handleSeekerRegistered = onOpenSeekerRegistered || handleSeekerNew;
  const handleEmployerNew = onOpenEmployerNew || onOpenEmployerForm || (() => {});
  const handleEmployerRegistered = onOpenEmployerRegistered || handleEmployerNew;

  return (
    <div className="w-full my-3 space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {language === 'EN' ? 'LocoHelp Local Job Portal' : 'लोकोहेल्प रोजगार व स्टाफ पोर्टल'}
          </span>
        </div>
      </div>

      {/* Two Distinct Side-by-Side Interactive Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        
        {/* BANNER 1: Job Seeker (सिर्फ जॉब सीकर - नो एम्प्लॉयर) */}
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white shadow-md shadow-indigo-600/20 border border-blue-400/30 flex flex-col justify-between">
          {/* Background Decorative Blur */}
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

          {/* Centered Title & Description */}
          <div 
            onClick={handleSeekerRegistered}
            className="relative z-10 text-center pb-3 cursor-pointer select-none"
            title="Click to view Job Seekers"
          >
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/30 text-2xl mb-1.5 shadow-inner">
              💼
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
              {language === 'EN' ? 'Job Seeker' : 'Job Seeker (जॉब सीकर)'}
            </h3>
            <p className="text-[11px] text-blue-100 font-medium mt-1 leading-snug max-w-xs mx-auto">
              {language === 'EN'
                ? 'Only for Job Seekers: View registered candidates or create your profile.'
                : 'सिर्फ जॉब सीकर के लिए: रजिस्टर्ड उम्मीदवार देखें या अपनी प्रोफाइल बनाएं।'}
            </p>
          </div>

          {/* Two Options: 1. Already Registered & 2. New Registration (Strictly for Job Seeker) */}
          <div className="relative z-10 grid grid-cols-2 gap-2 pt-1 border-t border-white/15">
            {/* Option 1: Already Registered */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSeekerRegistered}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/30 text-white text-center cursor-pointer transition-all shadow-2xs group"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center mb-1 group-hover:bg-white/30 transition-colors">
                <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <span className="text-xs font-black leading-tight">
                {language === 'EN' ? 'Already Registered' : 'पहले से रजिस्टर्ड'}
              </span>
              <span className="text-[10px] text-blue-200 font-semibold mt-0.5">
                {language === 'EN' ? 'Job Seeker List' : 'जॉब सीकर लिस्ट'}
              </span>
            </motion.button>

            {/* Option 2: New Registration */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSeekerNew}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white text-indigo-900 hover:bg-blue-50 active:bg-blue-100 text-center cursor-pointer transition-all shadow-md group"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
              </div>
              <span className="text-xs font-black leading-tight text-indigo-950">
                {language === 'EN' ? 'New Register' : 'नया रजिस्ट्रेशन'}
              </span>
              <span className="text-[10px] text-indigo-600 font-extrabold mt-0.5">
                {language === 'EN' ? 'Seeker Profile' : 'जॉब सीकर प्रोफाइल'}
              </span>
            </motion.button>
          </div>
        </div>

        {/* BANNER 2: For Employer (सिर्फ एम्प्लॉयर - नो जॉब सीकर) */}
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-md shadow-orange-600/20 border border-amber-400/30 flex flex-col justify-between">
          {/* Background Decorative Blur */}
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

          {/* Centered Title & Description */}
          <div 
            onClick={handleEmployerRegistered}
            className="relative z-10 text-center pb-3 cursor-pointer select-none"
            title="Click to view Employer Vacancies"
          >
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/30 text-2xl mb-1.5 shadow-inner">
              🏢
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
              {language === 'EN' ? 'For Employer' : 'For Employer (दुकान व बिजनेस)'}
            </h3>
            <p className="text-[11px] text-amber-100 font-medium mt-1 leading-snug max-w-xs mx-auto">
              {language === 'EN'
                ? 'Only for Employers: View posted vacancies or register new vacancy.'
                : 'सिर्फ एम्प्लॉयर के लिए: रजिस्टर्ड वेकेंसी देखें या नई वेकेंसी दर्ज करें।'}
            </p>
          </div>

          {/* Two Options: 1. Already Registered & 2. New Registration (Strictly for Employer) */}
          <div className="relative z-10 grid grid-cols-2 gap-2 pt-1 border-t border-white/15">
            {/* Option 1: Already Registered */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleEmployerRegistered}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/30 text-white text-center cursor-pointer transition-all shadow-2xs group"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center mb-1 group-hover:bg-white/30 transition-colors">
                <Building2 className="w-3.5 h-3.5 text-amber-200" />
              </div>
              <span className="text-xs font-black leading-tight">
                {language === 'EN' ? 'Already Registered' : 'पहले से रजिस्टर्ड'}
              </span>
              <span className="text-[10px] text-amber-200 font-semibold mt-0.5">
                {language === 'EN' ? 'Vacancy List' : 'वेकेंसी लिस्ट'}
              </span>
            </motion.button>

            {/* Option 2: New Registration */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleEmployerNew}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white text-orange-950 hover:bg-amber-50 active:bg-amber-100 text-center cursor-pointer transition-all shadow-md group"
            >
              <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Briefcase className="w-3.5 h-3.5 text-orange-700" />
              </div>
              <span className="text-xs font-black leading-tight text-orange-950">
                {language === 'EN' ? 'New Register' : 'नया रजिस्ट्रेशन'}
              </span>
              <span className="text-[10px] text-orange-600 font-extrabold mt-0.5">
                {language === 'EN' ? 'Post Vacancy' : 'वेकेंसी पोस्ट करें'}
              </span>
            </motion.button>
          </div>
        </div>

      </div>

      {/* Safety & Verification Notice Strip */}
      <div className="px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">
            {language === 'EN'
              ? 'Security Notice: All job seeker profiles & employer vacancies are verified by Admin before going live.'
              : 'सुरक्षा सूचना: सभी नौकरी प्रोफाइल और वेकेंसी एडमिन अनुमोदन के बाद ही लाइव होती हैं।'}
          </span>
        </div>
      </div>
    </div>
  );
}
