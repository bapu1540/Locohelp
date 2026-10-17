import React from 'react';
import { ArrowLeft, BadgeCheck, Star, Clock, IndianRupee, MapPin, Wrench, Zap, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n';

interface ProfessionalsScreenProps {
  onBack: () => void;
  onHire: () => void;
}

const PROS = [
  { id: 1, name: 'Rajeev Kumar', category: 'Plumber', rate: 400, rating: 4.8, jobs: 124, distance: 1.2, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-100' },
  { id: 2, name: 'ElectroFix Services', category: 'Electrician', rate: 350, rating: 4.9, jobs: 310, distance: 2.5, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-100' },
  { id: 3, name: 'City Towing', category: 'Towing & Recovery', rate: 1500, rating: 4.6, jobs: 89, distance: 3.1, icon: Truck, color: 'text-rose-600', bg: 'bg-rose-100' },
];

export default function ProfessionalsScreen({ onBack, onHire }: ProfessionalsScreenProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative overflow-hidden transition-colors">
      <div className="px-5 py-4 pt-10 sm:pt-6 z-30 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-violet-200/50 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-emerald-500" /> 
            Verified Pros
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-32">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <BadgeCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Guaranteed Service</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mt-1">Hire local, background-checked professionals for paid tasks. Safe and transparent.</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x px-1 -mx-1">
          {['All', 'Plumber', 'Electrician', 'Mechanic', 'Towing'].map(cat => (
            <button key={cat} className="snap-start shrink-0 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 transition-all">
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-4 mt-2">
          {PROS.map((pro, index) => {
            const Icon = pro.icon;
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                key={pro.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${pro.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-6 h-6 ${pro.color}`} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                        {pro.name} <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                      </h3>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{pro.category}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{pro.rating}</span>
                    <span className="text-slate-400">({pro.jobs})</span>
                  </div>
                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    {pro.distance} km
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Rate</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white flex items-center">
                      <IndianRupee className="w-4 h-4 mr-0.5" />{pro.rate}<span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">/hr</span>
                    </span>
                  </div>
                  <button onClick={onHire} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm active:scale-95 transition-all shadow-sm shadow-indigo-600/20">
                    Hire Now
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
