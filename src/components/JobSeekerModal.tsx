import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  User, 
  Phone, 
  MapPin, 
  Tag, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Search,
  MessageCircle,
  GraduationCap, 
  Award,
  DollarSign,
  Plus,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { submitJobPortalItem, fetchJobPortalItems } from '../api';
import { JobPortalItem } from '../types';
import { validateUploadedFile, checkSystemSecurityBlock } from '../lib/security';
import { getCurrentUser } from '../auth';
import { isEntityOwner } from '../lib/ownership';

interface JobSeekerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (item: JobPortalItem) => void;
  initialTab?: 'registered' | 'new';
}

const POPULAR_SKILL_SUGGESTIONS = [
  "Retail Sales",
  "Billing / POS",
  "Tally Prime",
  "Cash Handling",
  "Customer Service",
  "Delivery / Courier",
  "Smartphone Repair",
  "Electrician",
  "Plumbing",
  "Inventory / Stock",
  "Computer Operator",
  "Cooking / Chef",
  "Security Guard",
  "Driver (Car/Bike)"
];

const JOB_CATEGORIES = [
  { id: "Retail & Shopping Mall", labelEn: "Retail & Shopping Mall", labelHi: "दुकान व शॉपिंग मॉल" },
  { id: "Grocery & Mart", labelEn: "SuperMart & Grocery", labelHi: "सुपरमार्ट व किराना" },
  { id: "Technical & Repair", labelEn: "Technical & Hardware Repair", labelHi: "टेक्निकल व रिपेयर" },
  { id: "Delivery & Logistics", labelEn: "Delivery & Logistics", labelHi: "डिलीवरी व कूरियर" },
  { id: "Office, Accounts & Admin", labelEn: "Office, Accounts & Admin", labelHi: "ऑफिस व अकाउंट्स" },
  { id: "Restaurant, Cafe & Hotel", labelEn: "Restaurant, Cafe & Hotel", labelHi: "होटल व रेस्टोरेंट" },
  { id: "Driver & Transport", labelEn: "Driver & Transport", labelHi: "ड्राइवर व ट्रांसपोर्ट" },
  { id: "Security & Facility", labelEn: "Security & Facility", labelHi: "सिक्योरिटी व गार्ड" },
  { id: "Other Skilled Work", labelEn: "Other Skilled Work", labelHi: "अन्य कुशल कार्य" }
];

const INITIAL_SAMPLE_SEEKERS: JobPortalItem[] = [];

export default function JobSeekerModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialTab = 'registered'
}: JobSeekerModalProps) {
  const { language } = useLanguage();

  // Modal active tab: 'registered' vs 'new'
  const [activeTab, setActiveTab] = useState<'registered' | 'new'>(initialTab);
  const [editingSeekerId, setEditingSeekerId] = useState<string | null>(null);

  // Registered Candidates Browse State
  const [seekersList, setSeekersList] = useState<JobPortalItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoadingList, setIsLoadingList] = useState(false);

  // New Registration Form states
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [category, setCategory] = useState(JOB_CATEGORIES[0].id);
  const [skillInput, setSkillInput] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["Retail Sales", "Customer Service"]);
  const [experience, setExperience] = useState('1-2 Years');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [education, setEducation] = useState('12th Pass');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartEditSeeker = (seeker: JobPortalItem) => {
    setEditingSeekerId(seeker.id);
    setFullName(seeker.fullName || '');
    setHeadline(seeker.headline || '');
    setCategory(seeker.category || JOB_CATEGORIES[0].id);
    if (Array.isArray(seeker.skills)) setSelectedSkills(seeker.skills);
    setExperience(seeker.experience || '1-2 Years');
    setExpectedSalary(seeker.expectedSalary || '');
    setEducation(seeker.education || '12th Pass');
    setPhone(seeker.phone || '');
    setWhatsapp(seeker.whatsapp || '');
    setArea(seeker.area || '');
    setDescription(seeker.description || '');
    setPhotoUrl(seeker.photoOrLogoUrl || null);
    setResumeUrl((seeker as any).resumeUrl || null);
    setResumeFileName((seeker as any).resumeFileName || '');
    setActiveTab('new');
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadSeekersList();
    }
  }, [isOpen, initialTab]);

  const loadSeekersList = async () => {
    setIsLoadingList(true);
    try {
      const liveItems = await fetchJobPortalItems({ type: 'job_seeker', status: 'approved' });
      const onlySeekers = Array.isArray(liveItems)
        ? liveItems.filter(l => l.type === 'job_seeker' && !String(l.id || '').startsWith('sample_seeker_'))
        : [];
      setSeekersList(onlySeekers);
    } catch (e) {
      setSeekersList([]);
    } finally {
      setIsLoadingList(false);
    }
  };

  if (!isOpen) return null;

  const handleToggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleAddCustomSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const trimmed = skillInput.trim();
      if (!selectedSkills.includes(trimmed)) {
        setSelectedSkills([...selectedSkills, trimmed]);
      }
      setSkillInput('');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const check = await validateUploadedFile(file, { allowPdf: false });
      if (!check.valid) {
        setErrorMessage(language === 'EN' ? (check.error || 'Invalid image') : (check.errorHi || check.error || 'अमान्य इमेज'));
        e.target.value = '';
        return;
      }
      setErrorMessage(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const check = await validateUploadedFile(file, { allowPdf: true });
      if (!check.valid) {
        setErrorMessage(language === 'EN' ? (check.error || 'Invalid file') : (check.errorHi || check.error || 'अमान्य फ़ाइल'));
        e.target.value = '';
        return;
      }
      setErrorMessage(null);
      setResumeFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setResumeUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage(language === 'EN' ? 'Please enter your Full Name' : 'कृपया अपना पूरा नाम दर्ज करें');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage(language === 'EN' ? 'Please enter your Mobile Number' : 'कृपया अपना मोबाइल नंबर दर्ज करें');
      return;
    }

    const secBlock = checkSystemSecurityBlock(fullName, headline, skillInput, selectedSkills, expectedSalary, education, area, description);
    if (secBlock.blocked) {
      setErrorMessage(secBlock.getMessage(language));
      return;
    }

    setIsSubmitting(true);

    try {
      const finalSkills = selectedSkills.length > 0 
        ? selectedSkills 
        : (skillInput.trim() ? [skillInput.trim()] : [category]);

      const res = await submitJobPortalItem({
        type: 'job_seeker',
        fullName: fullName.trim(),
        headline: headline.trim() || `${category} Specialist`,
        category,
        skills: finalSkills,
        experience,
        expectedSalary: expectedSalary.trim() || 'Negotiable',
        education,
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        area: area.trim() || 'Nearby Area',
        description: description.trim() || 'Hardworking candidate looking for immediate job opportunities.',
        photoOrLogoUrl: photoUrl || undefined,
        resumeUrl: resumeUrl || undefined,
        resumeFileName: resumeFileName || undefined
      } as any);

      setIsSubmitting(false);

      if (res.success) {
        setSubmitSuccessMessage(
          language === 'EN'
            ? "⏳ Your Job Seeker registration has been sent to Admin for approval! It will appear live once approved by Admin."
            : "⏳ आपका जॉब रजिस्ट्रेशन एडमिन अप्रूवल के लिए भेज दिया गया है! एडमिन अप्रूवल के बाद यह लाइव दिखेगा।"
        );
        if (res.item && onSuccess) {
          onSuccess(res.item);
        }
      } else {
        setErrorMessage(res.error || 'Failed to submit profile');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Something went wrong');
    }
  };

  const handleWhatsAppContact = (item: JobPortalItem) => {
    const targetPhone = (item.whatsapp || item.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = targetPhone.startsWith('91') ? targetPhone : `91${targetPhone}`;
    const text = `Namaste ${item.fullName}! I saw your job profile (${item.headline || item.category}) on LocoHelp and want to discuss a job opportunity with you.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCloseAndReset = () => {
    setSubmitSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  };

  const filteredSeekers = seekersList.filter((item) => {
    // STRICT CHECK: Only Admin-Approved Job Seekers are allowed
    if (item.type !== 'job_seeker') return false;
    if (item.status && item.status !== 'approved') return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (item.fullName || '').toLowerCase().includes(q);
      const matchRole = (item.headline || '').toLowerCase().includes(q);
      const matchSkills = Array.isArray(item.skills) && item.skills.some((s) => s.toLowerCase().includes(q));
      const matchArea = (item.area || item.address || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      return matchName || matchRole || matchSkills || matchArea || matchDesc;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.92 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-blue-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 text-xl shadow-inner">
              💼
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {language === 'EN' ? 'Job / Work Registration' : 'जॉब / काम का रजिस्ट्रेशन'}
                </h3>
                <span className="text-[10px] font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> 100% Free
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-medium">
                {language === 'EN' 
                  ? 'Only for Job Seekers: View registered candidates or create your profile' 
                  : 'सिर्फ काम चाहने वालों के लिए: रजिस्टर्ड उम्मीदवार देखें या अपनी प्रोफाइल बनाएं'}
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

        {/* Two Strict Tabs: 1. Already Registered Job Seekers & 2. New Registration */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shrink-0 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('registered');
              setSubmitSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'registered'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>
              {language === 'EN' 
                ? `Already Registered Candidates (${filteredSeekers.length})` 
                : `पहले से रजिस्टर्ड उम्मीदवार (${filteredSeekers.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'EN' ? '+ New Registration' : '+ नया रजिस्ट्रेशन'}</span>
          </button>
        </div>

        {/* TAB 1: ALREADY REGISTERED JOB SEEKERS LIST (NO EMPLOYER DETAILS) */}
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
                  placeholder={language === 'EN' ? 'Search candidate by name, skill or role...' : 'उम्मीदवार का नाम, स्किल या पद खोजें...'}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-2 px-3 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">{language === 'EN' ? 'All Job Categories' : 'सभी श्रेणियां'}</option>
                {JOB_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{language === 'EN' ? c.labelEn : c.labelHi}</option>
                ))}
              </select>
            </div>

            {/* List of Job Seekers */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {filteredSeekers.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-500 flex items-center justify-center mx-auto text-2xl border border-blue-200 dark:border-slate-700">
                    👤
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {language === 'EN' ? 'No Job Seekers found' : 'कोई उम्मीदवार नहीं मिला'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {language === 'EN' ? 'Be the first candidate to create your verified profile!' : 'अपनी प्रोफाइल बनाकर सबसे पहले रजिस्टर्ड सूची में शामिल हों!'}
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
                  >
                    + {language === 'EN' ? 'Create Job Profile' : 'अपनी जॉब प्रोफाइल बनाएं'}
                  </button>
                </div>
              ) : (
                filteredSeekers.map((seeker) => (
                  <div
                    key={seeker.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-slate-700/80 shadow-xs hover:border-blue-300 transition-all space-y-3"
                  >
                    {/* Header line: Avatar, Name & Headline */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                          {seeker.photoOrLogoUrl ? (
                            <img src={seeker.photoOrLogoUrl} alt={seeker.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{seeker.fullName ? seeker.fullName.charAt(0).toUpperCase() : '👤'}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {seeker.fullName}
                            </h4>
                            <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              Job Seeker
                            </span>
                          </div>
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {seeker.headline || seeker.category}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{seeker.area || 'Local Area'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Expected Salary Badge */}
                      {seeker.expectedSalary && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl text-right shrink-0">
                          <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Exp. Salary</span>
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">{seeker.expectedSalary}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Specs: Experience & Education */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Exp:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{seeker.experience || 'Fresher'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Edu:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{seeker.education || '12th Pass'}</span>
                      </div>
                    </div>

                    {/* Skills Pills */}
                    {seeker.skills && seeker.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {seeker.skills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                          >
                            ✓ {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bio Description */}
                    {seeker.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        {seeker.description}
                      </p>
                    )}

                    {/* Direct Contact Buttons or Owner Edit */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      {isEntityOwner(seeker, getCurrentUser()) ? (
                        <button
                          type="button"
                          onClick={() => handleStartEditSeeker(seeker)}
                          className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title={language === 'EN' ? 'Edit your profile details' : 'अपनी प्रोफाइल एडिट करें'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{language === 'EN' ? 'Edit Profile' : 'प्रोफ़ाइल एडिट करें'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleWhatsAppContact(seeker)}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{language === 'EN' ? 'Chat on WhatsApp' : 'व्हाट्सएप चैट करें'}</span>
                        </button>
                      )}

                      {seeker.phone && (
                        <a
                          href={`tel:${seeker.phone}`}
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

        {/* TAB 2: NEW JOB SEEKER REGISTRATION FORM */}
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
                    {language === 'EN' ? 'Profile Submitted!' : 'प्रोफाइल सबमिट हो गई!'}
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
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {language === 'EN' ? 'View Registered Seekers' : 'रजिस्टर्ड उम्मीदवारों की लिस्ट देखें'}
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

                {/* Full Name & Headline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Your Full Name *' : 'आपका पूरा नाम *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={language === 'EN' ? 'e.g. Ramesh Kumar' : 'उदा. रमेश कुमार'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Desired Role / Headline' : 'आप किस काम में माहिर हैं?'}
                    </label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder={language === 'EN' ? 'e.g. Retail Cashier / Computer Operator' : 'उदा. बिलिंग कैशियर / डिलीवरी बॉय'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Job Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Job Category *' : 'काम / नौकरी की श्रेणी *'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                  >
                    {JOB_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {language === 'EN' ? cat.labelEn : cat.labelHi}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Experience & Expected Salary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Work Experience' : 'कार्य अनुभव'}
                    </label>
                    <select
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                    >
                      <option value="Fresher / Beginner">Fresher (नया उम्मीदवार)</option>
                      <option value="6 Months - 1 Year">6 Months - 1 Year</option>
                      <option value="1-2 Years">1-2 Years</option>
                      <option value="2-4 Years">2-4 Years</option>
                      <option value="5+ Years Experienced">5+ Years Experienced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Expected Salary (Monthly)' : 'अपेक्षित मासिक वेतन'}
                    </label>
                    <input
                      type="text"
                      value={expectedSalary}
                      onChange={(e) => setExpectedSalary(e.target.value)}
                      placeholder={language === 'EN' ? 'e.g. ₹15,000 - ₹20,000' : 'उदा. ₹15,000 - ₹20,000'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
                    />
                  </div>
                </div>

                {/* Education */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Education Qualification' : 'शैक्षणिक योग्यता'}
                  </label>
                  <select
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                  >
                    <option value="10th Pass">10th Pass (मैट्रिक)</option>
                    <option value="12th Pass">12th Pass (इंटरमीडिएट)</option>
                    <option value="ITI / Diploma">ITI / Diploma / Technical</option>
                    <option value="Graduate (Any Stream)">Graduate (ग्रेजुएट)</option>
                    <option value="Post Graduate">Post Graduate (पोस्ट ग्रेजुएट)</option>
                    <option value="Other / Basic Schooling">Other</option>
                  </select>
                </div>

                {/* Skills Tags Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Select Your Skills' : 'अपनी स्किल्स चुनें'}
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {POPULAR_SKILL_SUGGESTIONS.map((skill) => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleToggleSkill(skill)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddCustomSkill}
                    placeholder={language === 'EN' ? 'Type custom skill & press Enter...' : 'अन्य कोई स्किल लिखें व Enter दबाएं...'}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
                  />
                </div>

                {/* Contact Details */}
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

                {/* Preferred Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Preferred Working Area / Location *' : 'पसंदीदा कार्य क्षेत्र / मोहल्ला *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder={language === 'EN' ? 'e.g. Station Road, Sector 15' : 'उदा. स्टेशन रोड, मेन मार्केट, सेक्टर 12'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
                  />
                </div>

                {/* Bio / Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Short Bio & Work Details' : 'अपने बारे में संक्षिप्त जानकारी'}
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={language === 'EN' ? 'Write about your past work, timings, and availability...' : 'अपने पिछले काम, समय और उपलब्धता के बारे में लिखें...'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium resize-none"
                  />
                </div>

                {/* Photo & Resume / Biodata Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'EN' ? 'Passport / Profile Photo (Max 2MB)' : 'प्रोफाइल फोटो (अधिकतम 2MB)'}
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      onChange={handlePhotoUpload}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                    />
                    {photoUrl && (
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Photo Attached</p>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 space-y-1.5">
                    <label className="block text-xs font-extrabold text-blue-900 dark:text-blue-300">
                      {language === 'EN' ? 'Upload Resume / Biodata (PDF max 5MB or Image)' : 'रिज्यूमे / बायोडाटा अपलोड करें (PDF या फोटो)'}
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleResumeUpload}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    />
                    {resumeUrl && (
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        ✓ Attached: {resumeFileName || 'Resume / Biodata'}
                      </p>
                    )}
                  </div>
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
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{language === 'EN' ? 'Submit Job Profile' : 'प्रोफाइल सबमिट करें'}</span>
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
