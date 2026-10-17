import React from 'react';
import { ArrowLeft, Trophy, Medal, Flame, Star, Award, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n';

interface LeaderboardScreenProps {
  onBack: () => void;
}

const LEADERS = [
  { id: 1, name: 'Rahul V.', karma: 4850, tasks: 142, badge: 'gold' },
  { id: 2, name: 'Priya S.', karma: 4230, tasks: 118, badge: 'silver' },
  { id: 3, name: 'Amit K.', karma: 3900, tasks: 95, badge: 'bronze' },
  { id: 4, name: 'Sanjay C.', karma: 3100, tasks: 88, badge: 'none' },
  { id: 5, name: 'Neha R.', karma: 2850, tasks: 76, badge: 'none' },
];

export default function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const { t } = useLanguage();

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
        {/* Your Rank Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-5 text-white shadow-lg shadow-indigo-600/30 mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Trophy className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-1">Your Karma</p>
            <div className="flex items-end gap-2 mb-4">
              <h2 className="text-4xl font-black">1,240</h2>
              <span className="text-indigo-200 font-bold mb-1 flex items-center"><Flame className="w-4 h-4 mr-0.5 text-amber-400" /> Points</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 flex justify-between items-center border border-white/20">
              <div>
                <p className="text-xs font-bold text-indigo-100">Current Rank</p>
                <p className="text-lg font-extrabold">#42 in New Delhi</p>
              </div>
              <TrendingUp className="w-6 h-6 text-emerald-300" />
            </div>
          </div>
        </motion.div>

        {/* Top Helpers List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Top Helpers This Month</h3>
          
          <div className="space-y-3">
            {LEADERS.map((leader, index) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={leader.id} 
                className="bg-white dark:bg-slate-800 border border-violet-100 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm relative overflow-hidden"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-lg ${leader.badge === 'gold' ? 'bg-amber-100 text-amber-600' : leader.badge === 'silver' ? 'bg-slate-200 text-slate-600' : leader.badge === 'bronze' ? 'bg-orange-100 text-orange-700' : 'bg-violet-50 dark:bg-slate-700 text-slate-400'}`}>
                  #{index + 1}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-white text-[15px] flex items-center gap-1.5">
                    {leader.name}
                    {leader.badge === 'gold' && <Award className="w-4 h-4 text-amber-500" />}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{leader.tasks} Tasks Completed</p>
                </div>

                <div className="flex flex-col items-end">
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-[15px] flex items-center gap-1">
                    {leader.karma} <Flame className="w-3.5 h-3.5 text-amber-500" />
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Karma</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
