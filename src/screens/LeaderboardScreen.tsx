import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Flame, Award, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n';
import { getFreeHelperProfiles, FreeHelperProfile } from '../data/categories';
import { getHelpers } from '../auth';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export default function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const { language } = useLanguage();
  const [leaders, setLeaders] = useState<FreeHelperProfile[]>(() => getFreeHelperProfiles(false));

  useEffect(() => {
    getHelpers(false).then(() => {
      setLeaders(getFreeHelperProfiles(false));
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative overflow-hidden transition-colors">
      <div className="px-5 py-4 pt-10 sm:pt-6 z-30 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-violet-200/50 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> 
            Local Heroes
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-32">
        {/* Top Helpers List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Verified Community Helpers</h3>
          
          {leaders.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-violet-100 dark:border-slate-700 rounded-2xl p-8 text-center">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {language === 'EN' ? 'No verified community helpers listed yet.' : 'अभी तक कोई वेरिफाइड कम्युनिटी हेल्पर लिस्ट नहीं हुआ है।'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaders.map((leader, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={leader.id} 
                  className="bg-white dark:bg-slate-800 border border-violet-100 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm relative overflow-hidden"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-lg ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-violet-50 dark:bg-slate-700 text-slate-400'}`}>
                    #{index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-[15px] flex items-center gap-1.5">
                      {leader.name}
                      {index === 0 && <Award className="w-4 h-4 text-amber-500" />}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{leader.area} • Exp: {leader.experience}</p>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-[15px] flex items-center gap-1">
                      ★ {leader.rating} <Flame className="w-3.5 h-3.5 text-amber-500" />
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Verified</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
