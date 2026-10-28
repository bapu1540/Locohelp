import React from 'react';
import { X, CheckCircle2, ShieldCheck, Phone, MapPin, Star, Award, UserCheck, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  distance?: number;
  location?: string;
  onRequestSent?: () => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  userName = (() => {
    try {
      return localStorage.getItem('locohelp_profile_name') || 'Community Peer';
    } catch(e) {
      return 'Community Peer';
    }
  })(),
  distance = 0.5,
  location,
}: UserProfileModalProps) {
  const { t, tr } = useLanguage();

  const cleanLocation = location 
    ? location.replace(/^,\s*|,\s*$|,+/g, ',').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim() 
    : undefined;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {tr('Helper & User Profile', 'हेल्पर और यूज़र प्रोफाइल', 'હેલ્પર અને યુઝર પ્રોફાઇલ')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Fully Unlocked & Direct */}
        <div className="p-5 overflow-y-auto max-h-[75vh] space-y-4">
          <div className="flex items-center gap-3.5 pb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-black shadow-md shrink-0">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                  {userName}
                </h4>
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>{cleanLocation ? cleanLocation : `${distance} km • Verified Community Peer`}</span>
              </p>
            </div>
          </div>

          {/* Detailed Verified Community Info Cards */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Direct Connection:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                Active via LocoHelp Chat
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Verification Status:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Account
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Safety &amp; Audit:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">Protected by Security Vault</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Community Rating:</span>
              <span className="font-extrabold text-amber-500 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500" /> 5.0 / 5.0
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
            💬 You are directly connected with this neighbor. Use the chat screen below for inquiries, scheduling, or coordination.
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            Back to Chat
          </button>
        </div>
      </motion.div>
    </div>
  );
}
