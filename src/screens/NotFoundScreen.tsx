import React from 'react';
import { motion } from 'motion/react';
import { Home, Compass, ArrowLeft, Search, HelpCircle } from 'lucide-react';
import { useLanguage } from '../i18n';

interface NotFoundScreenProps {
  onBackToHome: () => void;
}

export default function NotFoundScreen({ onBackToHome }: NotFoundScreenProps) {
  const { language } = useLanguage();

  return (
    <div className="flex-1 w-full min-h-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-md w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5"
      >
        {/* 404 Badge Icon */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 animate-pulse" />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-2xl font-black tracking-tight leading-none">404</span>
            <Compass className="w-5 h-5 mt-1 text-blue-200" />
          </div>
        </div>

        {/* Heading & Reassuring Text */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'GU'
              ? 'પેજ મળ્યું નથી (Page Not Found)'
              : language === 'HI'
              ? 'पेज नहीं मिला (Page Not Found)'
              : 'Page Not Found'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {language === 'GU'
              ? 'તમે જે પેજ અથવા લિંક શોધી રહ્યા છો તે ઉપલબ્ધ નથી અથવા ખસેડવામાં આવી છે.'
              : language === 'HI'
              ? 'जिस पेज या लिंक को आप ढूंढ रहे हैं वह मौजूद नहीं है या हटा दिया गया है।'
              : 'The link or page you are looking for does not exist or may have been moved.'}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-400">
            {language === 'GU'
              ? 'ચિંતા કરશો નહીં! સુરક્ષિત રીતે મુખ્ય હોમપેજ પર પાછા જવા માટે નીચે ક્લિક કરો.'
              : language === 'HI'
              ? 'चिंता न करें! मुख्य होमपेज पर सुरक्षित लौटने के लिए नीचे दिए गए बटन पर क्लिक करें।'
              : 'No worries! Click the button below to return safely to the Home Page.'}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>
              {language === 'GU'
                ? 'મુખ્ય હોમપેજ પર જાઓ'
                : language === 'HI'
                ? 'मुख्य होमपेज पर जाएं'
                : 'Go Back to Home Page'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
