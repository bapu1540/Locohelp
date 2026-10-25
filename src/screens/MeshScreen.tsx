import React, { useState, useEffect } from 'react';
import { ArrowLeft, WifiOff, Smartphone, Radio, Database, CheckCircle2, RotateCw } from 'lucide-react';
import { useLanguage } from '../i18n';
import { motion } from 'motion/react';

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
}

export default function MeshScreen({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const [isMeshActive, setIsMeshActive] = useState(true);
  const [nodes, setNodes] = useState(0);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  
  // Load real offline queue from local storage (empty state if none)
  useEffect(() => {
    try {
      const storedQueue = localStorage.getItem('locohelp_offline_queue');
      if (storedQueue) {
        const parsed = JSON.parse(storedQueue);
        setQueue(Array.isArray(parsed) ? parsed.filter((item: any) => item && item.id !== '1') : []);
      } else {
        setQueue([]);
      }
    } catch (e) {
      console.error('Failed to load queue', e);
    }
    
    // Simulate finding nodes
    if (isMeshActive) {
      const interval = setInterval(() => {
        setNodes(prev => (prev < 4 ? prev + 1 : prev));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isMeshActive]);

  const clearQueue = () => {
    setQueue([]);
    localStorage.removeItem('locohelp_offline_queue');
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex items-center px-4 py-4 pt-10 sm:pt-4 border-b border-violet-200 sticky top-0 bg-white/80 backdrop-blur-xl z-10 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 hover:bg-violet-200 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{t('mesh.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Info Card */}
        <div className="bg-amber-500 rounded-[24px] p-6 text-slate-900 shadow-xl shadow-amber-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 opacity-20">
            <WifiOff className="w-32 h-32" />
          </div>
          <h3 className="text-xl font-extrabold mb-1 relative z-10">{t('mesh.title')}</h3>
        </div>

        {/* Mesh Status Toggle */}
        <div className="px-1">
          <div className="bg-white border border-violet-200 p-4 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer" onClick={() => setIsMeshActive(!isMeshActive)}>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 mb-0.5">{t('mesh.status')}</h3>
              <p className={`text-[11px] font-bold flex items-center gap-1.5 ${isMeshActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isMeshActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {t('mesh.active')}
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    {t('mesh.offline')}
                  </>
                )}
              </p>
            </div>
            {/* Custom Toggle Switch */}
            <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${isMeshActive ? 'bg-amber-500' : 'bg-slate-300'}`}> 
               <div className={`w-5 h-5 bg-white rounded-full absolute shadow-sm transition-transform ${isMeshActive ? 'translate-x-6' : 'translate-x-1'}`}></div>
            </div>
          </div>
        </div>

        {/* Relay Nodes Radar */}
        {isMeshActive && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-violet-200 rounded-2xl p-5 shadow-sm flex flex-col items-center">
             <div className="relative flex items-center justify-center w-24 h-24 mb-4">
                <motion.div animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute w-full h-full rounded-full border border-amber-400" />
                <motion.div animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 2, delay: 1, repeat: Infinity, ease: "linear" }} className="absolute w-full h-full rounded-full border border-amber-400" />
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center z-10 border-2 border-amber-500">
                  <Radio className="w-6 h-6 text-amber-600" />
                </div>
                {/* Simulated Nodes */}
                {nodes > 0 && <div className="absolute top-0 right-2 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-sm z-20" />}
                {nodes > 1 && <div className="absolute bottom-2 left-0 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-sm z-20" />}
                {nodes > 2 && <div className="absolute top-1/2 -right-4 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-sm z-20" />}
             </div>
             <h4 className="text-slate-900 font-extrabold text-[15px]">{nodes} {t('mesh.nodes')}</h4>
             <p className="text-slate-400 text-xs font-medium text-center mt-1">Connecting via BLE / Wi-Fi Direct</p>
          </motion.div>
        )}

        {/* Sync Queue */}
        <div className="px-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-900 font-extrabold text-[15px] flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              {t('mesh.sync')}
            </h3>
            {queue.length > 0 && (
              <button onClick={clearQueue} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                Force Sync
              </button>
            )}
          </div>
          <p className="text-slate-400 text-xs font-medium">{t('mesh.syncDesc')}</p>
          
          <div className="bg-white border border-violet-200 rounded-2xl p-4 shadow-sm min-h-[100px] flex flex-col justify-center">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-bold">{t('mesh.empty')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl border border-violet-200">
                    <RotateCw className="w-5 h-5 text-amber-500 animate-spin-slow shrink-0" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{item.type.replace('_', ' ')}</p>
                      <p className="text-[13px] font-medium text-slate-600 line-clamp-1">{item.payload}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
