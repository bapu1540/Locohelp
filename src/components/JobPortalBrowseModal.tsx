import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  Building2, 
  UserCheck, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Search, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Filter, 
  ExternalLink,
  ChevronRight,
  Share2,
  Edit3
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { JobPortalItem } from '../types';
import { fetchJobPortalItems } from '../api';
import { getCurrentUser } from '../auth';
import { isEntityOwner } from '../lib/ownership';

interface JobPortalBrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSeekerForm: () => void;
  onOpenEmployerForm: () => void;
  initialTab?: 'all' | 'employer_vacancy' | 'job_seeker';
  lockMode?: 'all' | 'job_seeker' | 'employer_vacancy';
}

export default function JobPortalBrowseModal({
  isOpen,
  onClose,
  onOpenSeekerForm,
  onOpenEmployerForm,
  initialTab = 'all',
  lockMode = 'all'
}: JobPortalBrowseModalProps) {
  const { language, tr } = useLanguage();

  const effectiveInitialTab = lockMode !== 'all' ? lockMode : initialTab;
  const [activeTab, setActiveTab] = useState<'all' | 'employer_vacancy' | 'job_seeker'>(effectiveInitialTab);
  const [items, setItems] = useState<JobPortalItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadApprovedItems = async () => {
    setIsLoading(true);
    try {
      const data = await fetchJobPortalItems({ status: 'approved' });
      setItems(data);
    } catch (e) {
      console.warn("Failed to load approved jobs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadApprovedItems();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    if (activeTab !== 'all' && item.type !== activeTab) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (item.fullName || item.companyOrShopName || '').toLowerCase().includes(q);
      const matchRole = (item.headline || item.jobRole || '').toLowerCase().includes(q);
      const matchSkills = Array.isArray(item.skills) && item.skills.some((s) => s.toLowerCase().includes(q));
      const matchArea = (item.area || item.address || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      return matchName || matchRole || matchSkills || matchArea || matchDesc;
    }
    return true;
  });

  const vacancyCount = items.filter((i) => i.type === 'employer_vacancy').length;
  const seekerCount = items.filter((i) => i.type === 'job_seeker').length;

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

  const handleWhatsAppContact = (item: JobPortalItem) => {
    const isSeeker = item.type === 'job_seeker';
    const targetPhone = (item.whatsapp || item.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = targetPhone.startsWith('91') ? targetPhone : `91${targetPhone}`;

    const text = isSeeker
      ? `Namaste ${item.fullName}! I saw your verified profile (${item.headline || item.category}) on LocoHelp Job Portal and want to discuss an employment opportunity.`
      : `Namaste! Regarding the vacancy for "${item.jobRole}" at ${item.companyOrShopName} listed on LocoHelp Job Portal, I am interested in applying.`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[52px] z-50 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden"
      style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className="w-full max-w-5xl mx-auto h-full bg-white dark:bg-slate-900 shadow-2xl border-x border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Briefcase className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {tr('LocoHelp Verified Job Portal', 'लोकोहेल्प जॉब पोर्टल', 'લોકોહેલ્પ જોબ પોર્ટલ')}
                </h3>
                <span className="text-[10px] font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {tr('Live & Approved', 'लाइव और स्वीकृत', 'લાઈવ અને મંજૂર')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {tr(
                  'Connect directly with local employers and skilled job seekers',
                  'नजदीकी दुकानदारों, शोरूम और कुशल उम्मीदवारों से सीधे संपर्क करें',
                  'નજીકના દુકાનદારો, શોરૂમ અને કુશળ ઉમેદવારો સાથે સીધો સંપર્ક કરો'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center gap-1.5 text-slate-200 text-xs font-extrabold transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span>{tr('Back / Close', 'वापस जाएं', 'પાછા જાઓ')}</span>
          </button>
        </div>

        {/* Action Banners Bar inside Portal */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden sm:inline">
            {tr('Quick Actions:', 'त्वरित विकल्प:', 'ઝડપી વિકલ્પો:')}
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {lockMode !== 'employer_vacancy' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSeekerForm();
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{tr('+ I Need a Job', '+ नौकरी चाहिए', '+ નોકરી જોઈએ છે')}</span>
              </button>
            )}
            {lockMode !== 'job_seeker' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEmployerForm();
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{tr('+ Post Vacancy', '+ वेकेंसी पोस्ट करें', '+ વેકેન્સી પોસ્ટ કરો')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Filters & Search Bar */}
        <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          {/* Segmented Filter Pills */}
          {lockMode === 'all' && (
            <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tr(`All (${items.length})`, `सभी सूचियाँ (${items.length})`, `બધી યાદીઓ (${items.length})`)}
              </button>
              <button
                onClick={() => setActiveTab('employer_vacancy')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'employer_vacancy'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>🏢 {tr(`Shops & Businesses (${vacancyCount})`, `दुकानें व बिज़नेस (${vacancyCount})`, `દુકાનો અને બિઝનેસ (${vacancyCount})`)}</span>
              </button>
              <button
                onClick={() => setActiveTab('job_seeker')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'job_seeker'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>👤 {tr(`Job / Work (${seekerCount})`, `जॉब / काम (${seekerCount})`, `જોબ / કામ (${seekerCount})`)}</span>
              </button>
            </div>
          )}

          {/* Search Input & Category Dropdown */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr(
                  'Search by skill, shop, role or area...',
                  'स्किल, दुकान, रोल या क्षेत्र से खोजें...',
                  'સ્કિલ, દુકાન, રોલ કે વિસ્તારથી શોધો...'
                )}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-300 max-w-[150px] truncate"
              >
                <option value="all">{tr('All Categories', 'सभी श्रेणियां', 'બધી કેટેગરી')}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content Listing */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-stone-50/60 dark:bg-slate-950">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-bold">{tr('Loading verified jobs and candidates...', 'सत्यापित जॉब्स और उम्मीदवार लोड हो रहे हैं...', 'વેરિફાઈડ જોબ્સ અને ઉમેદવારો લોડ થઈ રહ્યા છે...')}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center text-2xl">
                💼
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {tr('No verified entries match your search', 'कोई प्रविष्टि नहीं मिली', 'કોઈ માહિતી મળી નથી')}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tr(
                    'Be the first to post a job vacancy or create your candidate profile!',
                    'सबसे पहले अपनी नौकरी प्रोफाइल बनाएं या स्टाफ वेकेंसी पोस्ट करें!',
                    'સૌપ્રથમ તમારી જોબ પ્રોફાઇલ બનાવો અથવા સ્ટાફ વેકેન્સી પોસ્ટ કરો!'
                  )}
                </p>
              </div>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSeeker = item.type === 'job_seeker';
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all space-y-3"
                >
                  {/* Top Bar with Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                        {item.photoOrLogoUrl ? (
                          <img
                            src={item.photoOrLogoUrl}
                            alt={item.fullName || item.companyOrShopName}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            {isSeeker ? '👤' : '🏢'}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isSeeker
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {isSeeker ? tr('👤 Candidate Profile', '👤 उम्मीदवार प्रोफाइल', '👤 ઉમેદવાર પ્રોફાઇલ') : `🏢 ${tr('Vacancy', 'वेकेंसी', 'વેકેન્સી')} (${item.vacancyType || 'Full-Time'})`}
                          </span>

                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            • {item.category}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                          {isSeeker ? item.fullName : item.jobRole}
                        </h4>

                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {isSeeker ? item.headline : item.companyOrShopName}
                        </p>
                      </div>
                    </div>

                    {/* Salary & Urgency Badge */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {isSeeker
                          ? item.expectedSalary ? `Exp: ${item.expectedSalary}` : tr('Negotiable', 'बातचीत योग्य', 'વાટાઘાટ પાત્ર')
                          : item.salaryOffered || tr('Good Salary', 'अच्छा वेतन', 'સારો પગાર')}
                      </div>
                      {!isSeeker && item.urgency === 'Immediate' && (
                        <span className="inline-block text-[10px] font-black text-rose-600 dark:text-rose-400 mt-0.5">
                          🔥 {tr('Immediate Hire', 'तुरंत भर्ती', 'તાત્કાલિક ભરતી')}
                        </span>
                      )}
                      {isSeeker && item.experience && (
                        <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
                          Exp: {item.experience}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skills tags for seekers, details for employers */}
                  {isSeeker && Array.isArray(item.skills) && item.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.skills.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/40"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {item.description}
                    </p>
                  )}

                  {/* Location & Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{item.area || item.address || 'Local Market'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                          title="Call directly"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">{tr('Call', 'कॉल', 'કૉલ')}</span>
                        </a>
                      )}

                      {isEntityOwner(item, getCurrentUser()) ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            if (isSeeker) {
                              onOpenSeekerForm();
                            } else {
                              onOpenEmployerForm();
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                          title={tr('Edit listing details', 'जानकारी एडिट करें', 'માહિતી એડિટ કરો')}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{tr('Edit Listing', 'एडिट करें', 'એડિટ કરો')}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleWhatsAppContact(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>
                            {isSeeker
                              ? tr('Hire on WhatsApp', 'व्हाट्सएप संपर्क', 'વોટ્સએપ સંપર્ક')
                              : tr('Apply on WhatsApp', 'व्हाट्सएप आवेदन', 'વોટ્સએપ અરજી')}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
