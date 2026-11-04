import React from 'react';
import { X, CheckCircle2, ShieldCheck, MapPin, Star, UserCheck, MessageSquare, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n';
import { getAuthenticRatingInfo } from '../modules/verification';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  distance?: number;
  location?: string;
  isVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  onRequestSent?: () => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  userName = (() => {
    try {
      return localStorage.getItem('locohelp_profile_name') || 'Community Peer';
    } catch (e) {
      return 'Community Peer';
    }
  })(),
  distance = 0.5,
  location,
  isVerified = false,
  rating = 0,
  reviewCount = 0,
}: UserProfileModalProps) {
  const { language, tr } = useLanguage();

  const cleanLocation = location
    ? location
        .replace(/^,\s*|,\s*$|,+/g, ',')
        .replace(/,\s*,/g, ',')
        .replace(/^,\s*/, '')
        .replace(/,\s*$/, '')
        .trim()
    : undefined;

  const ratingInfo = getAuthenticRatingInfo({ rating, reviewCount }, language);

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

        {/* Modal Body */}
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
                {isVerified && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>
                  {cleanLocation
                    ? cleanLocation
                    : `${distance} km • ${
                        isVerified
                          ? tr('Verified Community Peer', 'वेरिफाइड मेंबर', 'વેરિફાઈડ મેમ્બર')
                          : tr('Community Member', 'लोकल मेंबर', 'લોકલ મેમ્બર')
                      }`}
                </span>
              </p>
            </div>
          </div>

          {/* Detailed Community Info Cards */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">
                {tr('Direct Connection:', 'सीधा संपर्क:', 'સીધો સંપર્ક:')}
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                {tr('Active via LocoHelp Chat', 'लोकोहेल्प चैट पर सक्रिय', 'LocoHelp ચેટ પર સક્રિય')}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">
                {tr('Verification Status:', 'वेरिफिकेशन स्थिति:', 'વેરિફિકેશન સ્થિતિ:')}
              </span>
              {isVerified ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />{' '}
                  {tr('Verified by Admin', 'एडमिन द्वारा वेरिफाइड', 'એડમિન દ્વારા વેરિફાઈડ')}
                </span>
              ) : (
                <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />{' '}
                  {tr('Community Member', 'लोकल कम्युनिटी मेंबर', 'લોકલ કમ્યુનિટી મેમ્બર')}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">
                {tr('Safety & Audit:', 'सुरक्षा:', 'સુરક્ષા:')}
              </span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                {tr('Protected by Security Vault', 'सिक्योरिटी वॉल्ट द्वारा सुरक्षित', 'સિક્યોરિટી વોલ્ટ દ્વારા સુરક્ષિત')}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">
                {tr('Customer Rating:', 'ग्राहक रेटिंग:', 'ગ્રાહક રેટિંગ:')}
              </span>
              {ratingInfo.hasReviews ? (
                <span className="font-extrabold text-amber-500 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-500" /> {ratingInfo.ratingText} / 5.0 (
                  {ratingInfo.reviewCount})
                </span>
              ) : (
                <span className="font-extrabold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" />{' '}
                  {tr('New (0 Reviews)', 'नया (0 रिव्यू)', 'નવું (0 રિવ્યૂ)')}
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
            💬{' '}
            {tr(
              'You are directly connected with this neighbor. Use the chat screen below for inquiries, scheduling, or coordination.',
              'आप इस लोकल मेंबर से सीधे जुड़े हैं। काम की बात या समय तय करने के लिए नीचे चैट का उपयोग करें।',
              'તમે આ લોકલ મેમ્બર સાથે સીધા જોડાયેલા છો. કામની વાતચીત માટે નીચે ચેટનો ઉપયોગ કરો.'
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            {tr('Back to Chat', 'वापस जाएं', 'પાછા જાઓ')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
