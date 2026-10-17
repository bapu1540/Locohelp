import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Store, 
  Users, 
  MapPin, 
  Phone, 
  Tag, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Briefcase,
  Search,
  MessageCircle,
  Plus,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { submitJobPortalItem, fetchJobPortalItems } from '../api';
import { JobPortalItem } from '../types';

interface EmployerVacancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (item: JobPortalItem) => void;
  initialTab?: 'registered' | 'new';
}

const BUSINESS_CATEGORIES = [
  { id: "Retail & Shopping Mall", labelEn: "Retail Showroom & Shopping Mall", labelHi: "शोरूम व शॉपिंग मॉल" },
  { id: "Grocery & Mart", labelEn: "SuperMart & Grocery Mart", labelHi: "सुपरमार्ट व ग्रॉसरी स्टोर" },
  { id: "Restaurant, Cafe & Hotel", labelEn: "Restaurant, Cafe, Bakery & Dine", labelHi: "होटल, रेस्टोरेंट व बेकरी" },
  { id: "Electronics & Service Center", labelEn: "Electronics & Mobile Store", labelHi: "इलेक्ट्रॉनिक्स व मोबाइल दुकान" },
  { id: "Delivery & Courier Hub", labelEn: "Delivery & Courier Hub", labelHi: "डिलीवरी व कूरियर हब" },
  { id: "Auto Workshop & Garage", labelEn: "Automobile Workshop & Garage", labelHi: "ऑटो गैराज व वर्कशॉप" },
  { id: "Corporate Office & Accounts", labelEn: "Office, Accounts & Billing", labelHi: "ऑफिस व अकाउंट्स" },
  { id: "Warehouse & Logistics", labelEn: "Warehouse & Wholesale Godown", labelHi: "गोदाम व होलसेल डिस्ट्रीब्यूटर" },
  { id: "Healthcare & Pharmacy", labelEn: "Clinic, Hospital & Pharmacy", labelHi: "फार्मेसी व क्लिनिक" },
  { id: "Other Business", labelEn: "Other Business / Commercial Unit", labelHi: "अन्य व्यावसायिक प्रतिष्ठान" }
];

const INITIAL_SAMPLE_VACANCIES: JobPortalItem[] = [
  {
    id: 'sample_vacancy_1',
    type: 'employer_vacancy',
    status: 'approved',
    companyOrShopName: 'Shreeji SuperMart & Departmental',
    jobRole: 'Billing Cashier & Sales Executive',
    category: 'Grocery & Mart',
    vacancyType: 'Full-Time',
    salaryOffered: '₹16,000 - ₹20,000 / month',
    openingsCount: 3,
    urgency: 'Immediate',
    experience: '1-2 Years',
    phone: '9876543210',
    whatsapp: '9876543210',
    area: 'Main Market Square',
    address: 'Shop #12-15, Commercial Complex',
    description: 'Urgent requirement for billing cashier and retail store counter assistants. Timely monthly payout and friendly work environment.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample_vacancy_2',
    type: 'employer_vacancy',
    status: 'approved',
    companyOrShopName: 'Apex Electronics & Mobile World',
    jobRole: 'Smartphone Repair Technician & Sales Staff',
    category: 'Retail & Shopping Mall',
    vacancyType: 'Full-Time',
    salaryOffered: '₹20,000 - ₹28,000 / month',
    openingsCount: 2,
    urgency: 'Immediate',
    experience: '2+ Years',
    phone: '9825012345',
    whatsapp: '9825012345',
    area: 'Station Road Market',
    address: 'Plot 45, Opp. City Bank',
    description: 'Hiring skilled mobile hardware technician and retail showroom counter executive. Attractive sales performance incentives.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample_vacancy_3',
    type: 'employer_vacancy',
    status: 'approved',
    companyOrShopName: 'Radhe Krishna Sweets, Cafe & Bakery',
    jobRole: 'Counter Sales Staff & Fast Food Helper',
    category: 'Restaurant, Cafe & Hotel',
    vacancyType: 'Full-Time',
    salaryOffered: '₹14,000 - ₹18,000 / month',
    openingsCount: 4,
    urgency: 'Within 1 Week',
    experience: 'Fresher Welcome',
    phone: '9909011223',
    whatsapp: '9909011223',
    area: 'Highway Corner',
    address: 'Near Central Highway Junction',
    description: 'Staff required for sweet shop counter and fast-food cafe section. Clean work premises, meals and uniform provided.',
    createdAt: new Date().toISOString()
  }
];

export default function EmployerVacancyModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialTab = 'registered'
}: EmployerVacancyModalProps) {
  const { language } = useLanguage();

  // Active tab: 'registered' (Already Registered Employer Vacancies) vs 'new' (Post Vacancy Form)
  const [activeTab, setActiveTab] = useState<'registered' | 'new'>(initialTab);

  // Registered Vacancies Browse State
  const [vacanciesList, setVacanciesList] = useState<JobPortalItem[]>(INITIAL_SAMPLE_VACANCIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoadingList, setIsLoadingList] = useState(false);

  // New Vacancy Form states
  const [companyOrShopName, setCompanyOrShopName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [category, setCategory] = useState(BUSINESS_CATEGORIES[0].id);
  const [vacancyType, setVacancyType] = useState<'Full-Time' | 'Part-Time' | 'Hourly' | 'Contract'>('Full-Time');
  const [salaryOffered, setSalaryOffered] = useState('');
  const [openingsCount, setOpeningsCount] = useState('2');
  const [urgency, setUrgency] = useState<'Immediate' | 'Within 1 Week' | 'Normal'>('Immediate');
  const [experienceRequired, setExperienceRequired] = useState('Fresher Welcome');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [logoOrPhotoUrl, setLogoOrPhotoUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadVacanciesList();
    }
  }, [isOpen, initialTab]);

  const loadVacanciesList = async () => {
    setIsLoadingList(true);
    try {
      const liveItems = await fetchJobPortalItems({ type: 'employer_vacancy', status: 'approved' });
      // STRICT FILTER: Absolutely only employer vacancies (never job seekers)
      const onlyVacancies = Array.isArray(liveItems) ? liveItems.filter(l => l.type === 'employer_vacancy') : [];
      if (onlyVacancies.length > 0) {
        // Merge deduplicated with initial samples
        const merged = [...onlyVacancies, ...INITIAL_SAMPLE_VACANCIES.filter(s => !onlyVacancies.some(l => l.id === s.id))];
        setVacanciesList(merged);
      } else {
        setVacanciesList(INITIAL_SAMPLE_VACANCIES);
      }
    } catch (e) {
      setVacanciesList(INITIAL_SAMPLE_VACANCIES);
    } finally {
      setIsLoadingList(false);
    }
  };

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoOrPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!companyOrShopName.trim()) {
      setErrorMessage(language === 'EN' ? 'Please enter Company / Shop Name' : 'कृपया दुकान/मॉल/कंपनी का नाम दर्ज करें');
      return;
    }
    if (!jobRole.trim()) {
      setErrorMessage(language === 'EN' ? 'Please enter Job Role / Vacancy' : 'कृपया वेकेंसी / पद का नाम दर्ज करें');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage(language === 'EN' ? 'Please enter Contact Mobile Number' : 'कृपया संपर्क मोबाइल नंबर दर्ज करें');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitJobPortalItem({
        type: 'employer_vacancy',
        companyOrShopName: companyOrShopName.trim(),
        jobRole: jobRole.trim(),
        category,
        vacancyType,
        salaryOffered: salaryOffered.trim() || '₹15,000 - ₹20,000 / month',
        openingsCount: Number(openingsCount) || 1,
        urgency,
        experience: experienceRequired,
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        area: area.trim() || 'Local Market Area',
        address: address.trim() || 'Main Market Road',
        description: description.trim() || `Hiring for ${jobRole} at ${companyOrShopName}. Good incentives and friendly environment.`,
        photoOrLogoUrl: logoOrPhotoUrl || undefined
      });

      setIsSubmitting(false);

      if (res.success) {
        setSubmitSuccessMessage(res.message || "Your submission has been received and is pending admin approval. It will appear live once verified.");
        if (res.item) {
          setVacanciesList(prev => [res.item!, ...prev]);
          if (onSuccess) onSuccess(res.item);
        }
      } else {
        setErrorMessage(res.error || 'Failed to post vacancy');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Something went wrong');
    }
  };

  const handleWhatsAppContact = (item: JobPortalItem) => {
    const targetPhone = (item.whatsapp || item.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = targetPhone.startsWith('91') ? targetPhone : `91${targetPhone}`;
    const text = `Namaste! Regarding the vacancy for "${item.jobRole}" at ${item.companyOrShopName} listed on LocoHelp Job Portal, I am interested in applying.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCloseAndReset = () => {
    setSubmitSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  };

  const filteredVacancies = vacanciesList.filter((item) => {
    // STRICT CHECK: Only Employer Vacancies allowed (Zero Job Seeker details)
    if (item.type !== 'employer_vacancy') return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCompany = (item.companyOrShopName || '').toLowerCase().includes(q);
      const matchRole = (item.jobRole || '').toLowerCase().includes(q);
      const matchArea = (item.area || item.address || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      return matchCompany || matchRole || matchArea || matchDesc;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.92 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 text-xl shadow-inner">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {language === 'EN' ? 'For Employer Portal' : 'For Employer (दुकान व बिज़नेस)'}
                </h3>
                <span className="text-[10px] font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> 100% Free
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium">
                {language === 'EN' 
                  ? 'Only for Employers: Browse verified job vacancies or post staff requirements' 
                  : 'सिर्फ एम्प्लॉयर के लिए: दुकान व कंपनियों की वेकेंसी देखें या नया वेकेंसी रजिस्ट्रेशन करें'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseAndReset}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two Strict Tabs: 1. Already Registered Vacancies & 2. New Registration (Employer Only) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shrink-0 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('registered');
              setSubmitSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'registered'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>
              {language === 'EN' 
                ? `Already Registered Vacancies (${filteredVacancies.length})` 
                : `पहले से रजिस्टर्ड वेकेंसी (${filteredVacancies.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'EN' ? '+ New Register (Post Vacancy)' : '+ नया रजिस्ट्रेशन (वेकेंसी दर्ज करें)'}</span>
          </button>
        </div>

        {/* TAB 1: ALREADY REGISTERED EMPLOYER VACANCIES LIST (NO JOB SEEKER DETAILS) */}
        {activeTab === 'registered' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-900">
            {/* Search and Category Filter Bar */}
            <div className="p-3 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'EN' ? 'Search vacancy by role, shop name or area...' : 'वेकेंसी का नाम, दुकान या कंपनी खोजें...'}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-2 px-3 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">{language === 'EN' ? 'All Business Categories' : 'सभी श्रेणियां'}</option>
                {BUSINESS_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{language === 'EN' ? c.labelEn : c.labelHi}</option>
                ))}
              </select>
            </div>

            {/* List of Employer Vacancies */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {filteredVacancies.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-slate-800 text-amber-500 flex items-center justify-center mx-auto text-2xl border border-amber-200 dark:border-slate-700">
                    🏢
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {language === 'EN' ? 'No Employer Vacancies found' : 'कोई वेकेंसी नहीं मिली'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {language === 'EN' ? 'Be the first employer to post your staff vacancy!' : 'अपनी दुकान या कंपनी के लिए स्टाफ वेकेंसी सबसे पहले पोस्ट करें!'}
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                  >
                    + {language === 'EN' ? 'Post Vacancy' : 'वेकेंसी पोस्ट करें'}
                  </button>
                </div>
              ) : (
                filteredVacancies.map((vac) => (
                  <div
                    key={vac.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-amber-100 dark:border-slate-700/80 shadow-xs hover:border-amber-300 transition-all space-y-3"
                  >
                    {/* Header line: Shop/Company Name & Role */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                          {vac.photoOrLogoUrl ? (
                            <img src={vac.photoOrLogoUrl} alt={vac.companyOrShopName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{vac.companyOrShopName ? vac.companyOrShopName.charAt(0).toUpperCase() : '🏢'}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {vac.companyOrShopName}
                            </h4>
                            <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                              Employer
                            </span>
                          </div>
                          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                            💼 {vac.jobRole}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{vac.area} {vac.address ? `• ${vac.address}` : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Salary Offered Badge */}
                      {vac.salaryOffered && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl text-right shrink-0">
                          <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Salary</span>
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">{vac.salaryOffered}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Specs: Vacancy Type, Openings, Urgency, Exp */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Type:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{vac.vacancyType || 'Full-Time'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Openings:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{vac.openingsCount || 1} Positions</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                        <span className="text-xs">⚡</span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Hiring:</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 truncate">{vac.urgency || 'Immediate'}</span>
                      </div>
                    </div>

                    {/* Job Description */}
                    {vac.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        {vac.description}
                      </p>
                    )}

                    {/* Direct Contact Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => handleWhatsAppContact(vac)}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{language === 'EN' ? 'Apply on WhatsApp' : 'व्हाट्सएप पर अप्लाई करें'}</span>
                      </button>

                      {vac.phone && (
                        <a
                          href={`tel:${vac.phone}`}
                          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: NEW EMPLOYER VACANCY POSTING FORM */}
        {activeTab === 'new' && (
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-100">
            {submitSuccessMessage ? (
              <div className="py-6 px-4 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-600 mx-auto flex items-center justify-center text-3xl shadow-lg">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>

                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-extrabold text-xs rounded-full border border-amber-300 dark:border-amber-800">
                    ⏳ Status: Pending Admin Verification
                  </span>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    {language === 'EN' ? 'Vacancy Submitted!' : 'वेकेंसी सबमिट हो गई!'}
                  </h4>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-sm font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed shadow-xs">
                    {submitSuccessMessage}
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitSuccessMessage(null);
                      setActiveTab('registered');
                    }}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {language === 'EN' ? 'View Registered Vacancies' : 'रजिस्टर्ड वेकेंसीज़ देखें'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseAndReset}
                    className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    {language === 'EN' ? 'Close' : 'बंद करें'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
                    ⚠️ {errorMessage}
                  </div>
                )}

                {/* Company Name & Job Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Company / Shop / Mall Name *' : 'दुकान / मॉल / कंपनी का नाम *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={companyOrShopName}
                      onChange={(e) => setCompanyOrShopName(e.target.value)}
                      placeholder={language === 'EN' ? 'e.g. Shree Ram SuperMart' : 'उदा. श्री राम सुपरमार्ट'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Job Role / Required Post *' : 'किस पद के लिए स्टाफ चाहिए? *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      placeholder={language === 'EN' ? 'e.g. Billing Cashier / Sales Staff' : 'उदा. बिलिंग कैशियर / सेल्स स्टाफ'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>
                </div>

                {/* Business Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Business Category *' : 'बिज़नेस श्रेणी *'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium cursor-pointer"
                  >
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {language === 'EN' ? cat.labelEn : cat.labelHi}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vacancy Type & Openings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Job Type' : 'जॉब प्रकार'}
                    </label>
                    <select
                      value={vacancyType}
                      onChange={(e) => setVacancyType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                    >
                      <option value="Full-Time">Full-Time (पूर्णकालिक)</option>
                      <option value="Part-Time">Part-Time (अंशकालिक)</option>
                      <option value="Hourly">Hourly Basis (घंटे के अनुसार)</option>
                      <option value="Contract">Contract (अनुबंध आधारित)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Number of Vacant Openings' : 'कितने लोगों की जरूरत है?'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={openingsCount}
                      onChange={(e) => setOpeningsCount(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
                    />
                  </div>
                </div>

                {/* Salary Offered & Urgency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Salary Offered (Monthly)' : 'दी जाने वाली सैलरी'}
                    </label>
                    <input
                      type="text"
                      value={salaryOffered}
                      onChange={(e) => setSalaryOffered(e.target.value)}
                      placeholder={language === 'EN' ? 'e.g. ₹15,000 - ₹20,000' : 'उदा. ₹15,000 - ₹20,000'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Hiring Urgency' : 'भर्ती की प्राथमिकता'}
                    </label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                    >
                      <option value="Immediate">⚡ Immediate (तुरंत भर्ती)</option>
                      <option value="Within 1 Week">Within 1 Week (1 सप्ताह में)</option>
                      <option value="Normal">Normal (सामान्य)</option>
                    </select>
                  </div>
                </div>

                {/* Contact Numbers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Calling Mobile Number *' : 'मोबाइल नंबर (कॉलिंग) *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98XXXXXXXX"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'WhatsApp Number' : 'व्हाट्सएप नंबर'}
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder={phone || '98XXXXXXXX'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
                    />
                  </div>
                </div>

                {/* Area & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Market / Area Name *' : 'मार्केट / क्षेत्र *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder={language === 'EN' ? 'e.g. Main Market, Station Road' : 'उदा. मेन मार्केट, स्टेशन रोड'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Exact Shop / Office Address' : 'दुकान / शोरूम का पूरा पता'}
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={language === 'EN' ? 'e.g. Shop #12, Ground Floor' : 'उदा. दुकान नंबर 12, ग्राउंड फ्लोर'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
                    />
                  </div>
                </div>

                {/* Job Details & Requirements */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Job Description & Work Timings' : 'काम का विवरण व समय'}
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={language === 'EN' ? 'Specify work timings, duties, weekly off, and expectations...' : 'काम के घंटे, जिम्मेदारियां और आवश्यक अनुभव आदि लिखें...'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium resize-none"
                  />
                </div>

                {/* Photo / Logo Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Shop / Company Photo or Logo (Optional)' : 'दुकान / कंपनी का फोटो या लोगो (वैकल्पिक)'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseAndReset}
                    className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {language === 'EN' ? 'Cancel' : 'रद्द करें'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-amber-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Posting...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{language === 'EN' ? 'Post Vacancy Now' : 'वेकेंसी पोस्ट करें'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
