import React from 'react';
import { ArrowLeft, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n';

export default function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();

  const notifications = [
    { id: 1, type: 'response', text: t('notif.n1'), time: t('notif.ago1'), unread: true },
    { id: 2, type: 'system', text: t('notif.n2'), time: t('notif.ago2'), unread: false },
    { id: 3, type: 'system', text: t('notif.n3'), time: t('notif.ago3'), unread: false },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA]">
      <div className="flex items-center px-4 py-4 pt-10 sm:pt-4 border-b border-[#DFDBCF] sticky top-0 bg-[#FCFAF5] shadow-sm z-10">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 hover:bg-[#EAE6DC] rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h2 className="text-lg font-extrabold text-slate-900">{t('notif.title')}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.map((notif, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            key={notif.id}
            className={`p-4 rounded-2xl border ${notif.unread ? 'bg-[#FCFAF5] border-indigo-200 shadow-sm' : 'bg-[#F4F1EA] border-[#DFDBCF]'} flex gap-4`}
          >
            <div className={`mt-0.5 flex-shrink-0 ${notif.type === 'response' ? 'text-indigo-600' : 'text-slate-400'}`}>
              {notif.type === 'response' ? <MessageSquare className="w-5 h-5" /> : 
               notif.text.includes('expired') || notif.text.includes('समाप्त') || notif.text.includes('સમાપ્ત') ? <AlertCircle className="w-5 h-5 text-amber-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>
            <div>
              <p className={`text-[15px] ${notif.unread ? 'text-slate-900 font-bold' : 'text-slate-600 font-semibold'}`}>{notif.text}</p>
              <span className="text-xs text-slate-400 font-bold tracking-wide mt-1 block">{notif.time}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
