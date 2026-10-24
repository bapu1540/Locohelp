import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  Store, 
  Users, 
  MapPin, 
  Phone, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Briefcase,
  Search,
  MessageCircle,
  Plus,
  Edit3
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { submitJobPortalItem, fetchJobPortalItems } from '../api';
import { JobPortalItem } from '../types';
import { validateUploadedFile, checkSystemSecurityBlock } from '../lib/security';
import { getCurrentUser, getShops, saveShop } from '../auth';
import { isEntityOwner } from '../lib/ownership';
import { compressImageToWebP } from '../lib/imageCompression';

interface EmployerVacancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (item: JobPortalItem) => void;
  initialTab?: 'browse' | 'new' | 'registered';
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

export default function EmployerVacancyModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialTab = 'browse'
}: EmployerVacancyModalProps) {
  const { language } = useLanguage();

  // Active mode sequence:
  // 1. 'browse'     = Live Jobs (First / Leftmost)
  // 2. 'new'        = New Registration / New Employer (Second / Middle)
  // 3. 'registered' = Existing Business / Direct Job Post (Third / Rightmost)
  const [activeTab, setActiveTab] = useState<'browse' | 'new' | 'registered'>(initialTab);
  const [editingVacancyId, setEditingVacancyId] = useState<string | null>(null);

  // Registered Shops / Businesses on LocoHelp (for Option A)
  const [registeredBusinesses, setRegisteredBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);

  // Live Vacancies Browse State
  const [vacanciesList, setVacanciesList] = useState<JobPortalItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form states (Shared / Option B New Employer fields)
  const [companyOrShopName, setCompanyOrShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
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
  const [hpWebsiteUrl, setHpWebsiteUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSubmitSuccessMessage(null);
      setErrorMessage(null);
      loadRegisteredBusinesses();
      loadVacanciesList();
    }
  }, [isOpen, initialTab]);

  const loadRegisteredBusinesses = async () => {
    setIsLoadingBusinesses(true);
    try {
      const currentUser = getCurrentUser();
      const serverShops = await getShops(true);
      const map = new Map<string, any>();

      // 1. Check user's own locally saved business
      try {
        const myBizRaw = localStorage.getItem('locohelp_my_business');
        if (myBizRaw) {
          const myBiz = JSON.parse(myBizRaw);
          if (myBiz && (myBiz.name || myBiz.businessName)) {
            const id = myBiz.id || 'my_biz_local';
            map.set(id, { ...myBiz, id, isMyBusiness: true });
          }
        }
      } catch (e) {}

      // 2. Check locally cached shops
      try {
        const cachedRaw = localStorage.getItem('locohelp_registered_shops');
        if (cachedRaw) {
          const cached: any[] = JSON.parse(cachedRaw);
          cached.forEach(s => {
            if (s && s.id && (s.name || s.businessName) && !String(s.id).startsWith('sample_shop_')) {
              const isMine = isEntityOwner(s, currentUser);
              map.set(s.id, { ...s, isMyBusiness: isMine || map.get(s.id)?.isMyBusiness });
            }
          });
        }
      } catch (e) {}

      // 3. Merge server shops
      if (Array.isArray(serverShops)) {
        serverShops.forEach(s => {
          if (s && s.id && (s.name || s.businessName) && !String(s.id).startsWith('sample_shop_')) {
            const isMine = isEntityOwner(s, currentUser);
            map.set(s.id, { ...(map.get(s.id) || {}), ...s, isMyBusiness: isMine || map.get(s.id)?.isMyBusiness });
          }
        });
      }

      // 4. Also allow linking the logged-in user's own verified LocoHelp Profile if they don't have a separate shop entry yet
      if (currentUser && !currentUser.isGuest && currentUser.displayName) {
        const hasOwnShop = Array.from(map.values()).some(b => b.isMyBusiness);
        if (!hasOwnShop) {
          const profileEntryId = `profile_${currentUser.uid}`;
          map.set(profileEntryId, {
            id: profileEntryId,
            name: `${currentUser.displayName} (Registered Profile)`,
            businessName: currentUser.displayName,
            ownerName: currentUser.displayName,
            categoryLabel: currentUser.skills || 'Retail & Shopping Mall',
            phone: currentUser.phone || '',
            area: currentUser.address || 'Local Market Area',
            address: currentUser.address || '',
            photoUrl: currentUser.photoURL || null,
            isMyBusiness: true,
            isProfileLink: true
          });
        }
      }

      const list = Array.from(map.values());
      // Sort user's own business first
      list.sort((a, b) => (b.isMyBusiness ? 1 : 0) - (a.isMyBusiness ? 1 : 0));
      setRegisteredBusinesses(list);

      if (list.length > 0) {
        const defaultBiz = list.find(b => b.isMyBusiness) || list[0];
        handleSelectExistingBusiness(defaultBiz);
      }
    } catch (e) {
      setRegisteredBusinesses([]);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  const handleSelectExistingBusiness = (biz: any) => {
    if (!biz) return;
    setSelectedBusinessId(biz.id);
    setCompanyOrShopName(biz.businessName || biz.name || '');
    setOwnerName(biz.ownerName || '');
    setCategory(biz.category || biz.categoryLabel || BUSINESS_CATEGORIES[0].id);
    setPhone(biz.phone || '');
    setWhatsapp(biz.whatsapp || biz.phone || '');
    setArea(biz.area || 'Local Area');
    setAddress(biz.address || biz.area || '');
    setLogoOrPhotoUrl(biz.photoUrl || null);
    setErrorMessage(null);
  };

  const loadVacanciesList = async () => {
    try {
      const liveItems = await fetchJobPortalItems({ type: 'employer_vacancy', status: 'approved' });
      const onlyVacancies = Array.isArray(liveItems)
        ? liveItems.filter(l => l.type === 'employer_vacancy' && !String(l.id || '').startsWith('sample_vacancy_'))
        : [];
      setVacanciesList(onlyVacancies);
    } catch (e) {
      setVacanciesList([]);
    }
  };

  const handleStartEditVacancy = (vac: JobPortalItem) => {
    setEditingVacancyId(vac.id);
    setCompanyOrShopName(vac.companyOrShopName || '');
    setJobRole(vac.jobRole || '');
    setCategory(vac.category || BUSINESS_CATEGORIES[0].id);
    setVacancyType(vac.vacancyType || 'Full-Time');
    setSalaryOffered(vac.salaryOffered || '');
    setOpeningsCount(String(vac.openingsCount || '1'));
    setUrgency(vac.urgency || 'Immediate');
    setExperienceRequired(vac.experience || 'Fresher Welcome');
    setPhone(vac.phone || '');
    setWhatsapp(vac.whatsapp || '');
    setArea(vac.area || '');
    setAddress(vac.address || '');
    setDescription(vac.description || '');
    setLogoOrPhotoUrl(vac.photoOrLogoUrl || null);
    setActiveTab('new');
  };

  if (!isOpen) return null;

  const selectedBusiness = registeredBusinesses.find(b => b.id === selectedBusinessId) || null;

  const filteredBusinesses = registeredBusinesses.filter(b => {
    if (!businessSearchQuery.trim()) return true;
    const q = businessSearchQuery.toLowerCase().trim();
    return (
      (b.name || '').toLowerCase().includes(q) ||
      (b.ownerName || '').toLowerCase().includes(q) ||
      (b.area || '').toLowerCase().includes(q) ||
      (b.categoryLabel || '').toLowerCase().includes(q)
    );
  });

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
      try {
        const compressed = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.75 });
        setLogoOrPhotoUrl(compressed);
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoOrPhotoUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Option A Submit: Direct Job Vacancy Post from Already Registered Shop/Business
  const handleDirectVacancySubmitFromExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedBusiness && !companyOrShopName.trim()) {
      setErrorMessage(
        language === 'EN'
          ? 'Please select your registered Shop/Business first or switch to Option B (New Employer Registration).'
          : 'कृपया पहले अपनी रजिस्टर्ड दुकान/बिज़नेस चुनें या विकल्प B (नया एम्प्लॉयर रजिस्ट्रेशन) चुनें।'
      );
      return;
    }
    if (!jobRole.trim()) {
      setErrorMessage(language === 'EN' ? 'Please enter Job Role / Required Staff Position' : 'कृपया पद / आवश्यक स्टाफ का नाम दर्ज करें');
      return;
    }
    const finalPhone = phone.trim() || selectedBusiness?.phone || '';
    if (!finalPhone) {
      setErrorMessage(language === 'EN' ? 'Please enter Contact Mobile Number' : 'कृपया संपर्क मोबाइल नंबर दर्ज करें');
      return;
    }

    const secBlockA = checkSystemSecurityBlock(companyOrShopName, jobRole, salaryOffered, area, address, description);
    if (secBlockA.blocked) {
      setErrorMessage(secBlockA.getMessage(language));
      return;
    }

    setIsSubmitting(true);
    try {
      const bizName = selectedBusiness?.businessName || selectedBusiness?.name || companyOrShopName.trim();
      const bizCategory = selectedBusiness?.category || selectedBusiness?.categoryLabel || category;
      const bizArea = selectedBusiness?.area || area.trim() || 'Local Market Area';
      const bizAddress = selectedBusiness?.address || address.trim() || bizArea;

      const res = await submitJobPortalItem({
        type: 'employer_vacancy',
        website_url_hp: hpWebsiteUrl,
        companyOrShopName: bizName,
        jobRole: jobRole.trim(),
        category: bizCategory,
        vacancyType,
        salaryOffered: salaryOffered.trim() || '₹15,000 - ₹20,000 / month',
        openingsCount: Number(openingsCount) || 1,
        urgency,
        experience: experienceRequired,
        phone: finalPhone,
        whatsapp: whatsapp.trim() || finalPhone,
        area: bizArea,
        address: bizAddress,
        description: description.trim() || `Hiring for ${jobRole} at ${bizName}.`,
        photoOrLogoUrl: selectedBusiness?.photoUrl || logoOrPhotoUrl || undefined
      });

      setIsSubmitting(false);
      if (res.success) {
        setSubmitSuccessMessage(
          language === 'GU'
            ? `⏳ "${bizName}" માટે "${jobRole.trim()}" ની વેકેન્સી એડમિન મંજૂરી માટે મોકલાઈ ગઈ છે! એડમિન મંજૂરી પછી તે લાઈવ દેખાશે.`
            : language === 'EN'
            ? `⏳ Job Vacancy for "${jobRole.trim()}" linked to "${bizName}" has been submitted to the Admin Panel for approval! Once approved by Admin, it will appear live.`
            : `⏳ "${bizName}" के लिए "${jobRole.trim()}" वेकेंसी एडमिन अप्रूवल के लिए भेज दी गई है! एडमिन अप्रूवल के बाद यह लाइव दिखेगी।`
        );
        setJobRole('');
        setSalaryOffered('');
        setDescription('');
        if (res.item && onSuccess) {
          onSuccess(res.item);
        }
      } else {
        setErrorMessage(res.error || 'Failed to post vacancy');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Something went wrong');
    }
  };

  // Option B Submit: New Employer Registration + Job Posting
  const handleNewEmployerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!companyOrShopName.trim()) {
      setErrorMessage(language === 'EN' ? 'Please enter Employer / Shop / Company Name' : 'कृपया एम्प्लॉयर / दुकान / कंपनी का नाम दर्ज करें');
      return;
    }
    if (!jobRole.trim()) {
      setErrorMessage(language === 'EN' ? 'Please enter Job Role / Required Post' : 'कृपया वेकेंसी / पद का नाम दर्ज करें');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage(language === 'EN' ? 'Please enter Contact Mobile Number' : 'कृपया संपर्क मोबाइल नंबर दर्ज करें');
      return;
    }
    if (!area.trim()) {
      setErrorMessage(language === 'EN' ? 'Please enter Market / Area Name' : 'कृपया मार्केट / क्षेत्र का नाम दर्ज करें');
      return;
    }

    const secBlockB = checkSystemSecurityBlock(companyOrShopName, ownerName, jobRole, salaryOffered, area, address, description);
    if (secBlockB.blocked) {
      setErrorMessage(secBlockB.getMessage(language));
      return;
    }

    setIsSubmitting(true);

    try {
      const currentUser = getCurrentUser();
      // 1. Save / Register the New Employer Business on LocoHelp (strictly pending Admin approval)
      if (!editingVacancyId) {
        const newShopObj = {
          id: 'shop_' + Date.now().toString(36),
          name: companyOrShopName.trim(),
          businessName: companyOrShopName.trim(),
          type: 'shop',
          category,
          categoryLabel: category,
          ownerName: ownerName.trim() || currentUser?.displayName || 'Employer',
          userId: currentUser?.uid || '',
          ownerEmail: currentUser?.email || '',
          phone: phone.trim(),
          area: area.trim(),
          address: address.trim() || area.trim(),
          description: description.trim() || `Employer hiring for ${jobRole.trim()}`,
          photoUrl: logoOrPhotoUrl || null,
          isVerified: false,
          status: 'pending' as const,
          createdAt: new Date().toISOString()
        };
        await saveShop(newShopObj);
        try {
          localStorage.setItem('locohelp_my_business', JSON.stringify(newShopObj));
        } catch (e) {}
      }

      // 2. Submit the Job Vacancy Requirement (strictly pending Admin approval)
      const res = await submitJobPortalItem({
        id: editingVacancyId || undefined,
        type: 'employer_vacancy',
        website_url_hp: hpWebsiteUrl,
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
        address: address.trim() || area.trim(),
        description: description.trim() || `Hiring for ${jobRole} at ${companyOrShopName}.`,
        photoOrLogoUrl: logoOrPhotoUrl || undefined
      });

      setIsSubmitting(false);

      if (res.success) {
        setEditingVacancyId(null);
        setSubmitSuccessMessage(
          language === 'GU'
            ? '⏳ તમારું નવું એમ્પ્લોયર રજિસ્ટ્રેશન અને જોબ વેકેન્સી એડમિન મંજૂરી માટે મોકલાઈ ગયા છે! એડમિન મંજૂરી પછી તે લાઈવ દેખાશે.'
            : language === 'EN'
            ? '⏳ Your New Employer Registration & Job Vacancy have been sent to Admin for approval! Once approved by Admin, they will be live.'
            : '⏳ आपका नया एम्प्लॉयर रजिस्ट्रेशन और जॉब वेकेंसी एडमिन अप्रूवल के लिए भेज दी गई है! एडमिन अप्रूवल के बाद यह लाइव दिखेगी।'
        );
        if (res.item && onSuccess) {
          onSuccess(res.item);
        }
        loadRegisteredBusinesses();
      } else {
        setErrorMessage(res.error || 'Failed to register employer vacancy');
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
    setEditingVacancyId(null);
    onClose();
  };

  const filteredVacancies = vacanciesList.filter((item) => {
    if (item.type !== 'employer_vacancy') return false;
    if (item.status && item.status !== 'approved') return false;
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
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className="w-full max-w-5xl mx-auto h-full bg-white dark:bg-slate-900 shadow-2xl border-x border-amber-200 dark:border-slate-800 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 text-xl shadow-inner shrink-0">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {language === 'EN' ? 'For Employer / Give a Job' : 'नौकरी / काम देने वाले (Employer)'}
                </h3>
                <span className="text-[10px] font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> 100% Free
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium">
                {language === 'EN' 
                  ? 'Choose Option A (Already Registered Shop/Business) or Option B (New Employer Registration)' 
                  : 'विकल्प A (पहले से रजिस्टर्ड दुकान/बिज़नेस) या विकल्प B (नया एम्प्लॉयर रजिस्ट्रेशन) चुनें'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseAndReset}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center gap-1.5 text-white text-xs font-extrabold transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span>{language === 'EN' ? 'Back / Close' : 'वापस जाएं'}</span>
          </button>
        </div>

        {/* Top Job Posting Workflow Tabs (Strictly Ordered: 1. Live Jobs -> 2. New Registration / New Employer -> 3. Existing Business / Direct Job Post) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shrink-0 p-2 gap-1.5">
          {/* 1. First / Leftmost: Live Jobs */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('browse');
              setSubmitSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-left transition-all cursor-pointer border ${
              activeTab === 'browse'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-750'
            }`}
          >
            <div className="flex items-center gap-1.5 font-black text-xs">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {language === 'EN'
                  ? `Live Jobs (${filteredVacancies.length})`
                  : language === 'GU'
                  ? `લાઈવ જોબ્સ (${filteredVacancies.length})`
                  : `लाइव जॉब्स (${filteredVacancies.length})`}
              </span>
            </div>
            <p className={`text-[10px] mt-0.5 font-semibold truncate ${activeTab === 'browse' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
              {language === 'EN'
                ? 'View Posted Vacancies'
                : language === 'GU'
                ? 'પોસ્ટ કરેલી વેકેન્સી જુઓ'
                : 'पोस्ट की गई वेकेंसी देखें'}
            </p>
          </button>

          {/* 2. Second / Middle: New Registration / New Employer */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('new');
              setSubmitSuccessMessage(null);
              setErrorMessage(null);
              setEditingVacancyId(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-left transition-all cursor-pointer border ${
              activeTab === 'new'
                ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/25'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-750'
            }`}
          >
            <div className="flex items-center gap-1.5 font-black text-xs">
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {language === 'EN'
                  ? 'New Registration / New Employer'
                  : language === 'GU'
                  ? 'નવું રજિસ્ટ્રેશન / નવા એમ્પ્લોયર'
                  : 'नया रजिस्ट्रेशन / नया एम्प्लॉयर'}
              </span>
            </div>
            <p className={`text-[10px] mt-0.5 font-semibold truncate ${activeTab === 'new' ? 'text-orange-100' : 'text-slate-500 dark:text-slate-400'}`}>
              {language === 'EN'
                ? 'Register Business & Post Job'
                : language === 'GU'
                ? 'બિઝનેસ રજિસ્ટર કરો અને જોબ પોસ્ટ કરો'
                : 'नया रजिस्ट्रेशन व जॉब पोस्ट'}
            </p>
          </button>

          {/* 3. Third / Rightmost: Existing Business / Direct Job Post */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('registered');
              setSubmitSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-left transition-all cursor-pointer border ${
              activeTab === 'registered'
                ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/25'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-750'
            }`}
          >
            <div className="flex items-center gap-1.5 font-black text-xs">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {language === 'EN'
                  ? 'Existing Business / Direct Job Post'
                  : language === 'GU'
                  ? 'રજિસ્ટર્ડ બિઝનેસ / સીધી જોબ પોસ્ટ'
                  : 'रजिस्टर्ड बिज़नेस / डायरेक्ट जॉब पोस्ट'}
              </span>
            </div>
            <p className={`text-[10px] mt-0.5 font-semibold truncate ${activeTab === 'registered' ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'}`}>
              {language === 'EN'
                ? 'Link Shop & Post Job Directly'
                : language === 'GU'
                ? 'દુકાન પસંદ કરો અને સીધી જોબ મૂકો'
                : 'दुकान चुनें व सीधे जॉब पोस्ट करें'}
            </p>
          </button>
        </div>

        {/* ============================================================ */}
        {/* OPTION A: ALREADY REGISTERED SHOP/BUSINESS ON LOCOHELP       */}
        {/* ============================================================ */}
        {activeTab === 'registered' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-100">
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
                    {language === 'EN' ? 'Job Vacancy Submitted!' : 'जॉब वेकेंसी सबमिट हो गई!'}
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
                      setActiveTab('browse');
                    }}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {language === 'EN' ? 'View Live Vacancies' : 'लाइव वेकेंसीज़ देखें'}
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
              <form onSubmit={handleDirectVacancySubmitFromExisting} className="space-y-4">
                {/* Hidden Trap Field for Bot Submissions */}
                <input
                  type="text"
                  name="website_url_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  value={hpWebsiteUrl}
                  onChange={(e) => setHpWebsiteUrl(e.target.value)}
                  className="hidden opacity-0 pointer-events-none absolute -left-[9999px]"
                />
                <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                        {language === 'EN' ? 'STEP 1: SELECT YOUR REGISTERED SHOP / BUSINESS' : 'स्टेप 1: अपनी रजिस्टर्ड दुकान / बिज़नेस चुनें'}
                      </span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                        {language === 'EN'
                          ? 'No need to fill business details again — select your business below and post your job directly!'
                          : 'बार-बार बिज़नेस डिटेल्स भरने की जरूरत नहीं — नीचे अपनी दुकान/बिज़नेस चुनें और सीधे जॉब पोस्ट करें!'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('new')}
                      className="text-[11px] font-black text-orange-700 dark:text-amber-300 underline cursor-pointer shrink-0"
                    >
                      {language === 'EN' ? 'Not registered yet? Option B →' : 'रजिस्टर्ड नहीं हैं? विकल्प B चुनें →'}
                    </button>
                  </div>

                  {isLoadingBusinesses ? (
                    <div className="text-xs text-slate-500 py-2">
                      {language === 'EN' ? 'Loading registered shops & businesses...' : 'रजिस्टर्ड दुकानें और बिज़नेस लोड हो रहे हैं...'}
                    </div>
                  ) : registeredBusinesses.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 text-center space-y-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {language === 'EN'
                          ? 'No registered Shop/Business found for your account yet.'
                          : 'अभी आपकी कोई रजिस्टर्ड दुकान या बिज़नेस नहीं मिला।'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('new')}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black cursor-pointer"
                      >
                        {language === 'EN' ? 'Go to Option B: New Employer Registration →' : 'विकल्प B: नया एम्प्लॉयर रजिस्ट्रेशन करें →'}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Search / Select Registered Business */}
                      {registeredBusinesses.length > 2 && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={businessSearchQuery}
                            onChange={(e) => setBusinessSearchQuery(e.target.value)}
                            placeholder={language === 'EN' ? 'Search your registered shop or business name...' : 'अपनी रजिस्टर्ड दुकान या बिज़नेस का नाम खोजें...'}
                            className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-slate-700 font-semibold"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {filteredBusinesses.map((biz) => {
                          const isSelected = selectedBusinessId === biz.id;
                          return (
                            <div
                              key={biz.id}
                              onClick={() => handleSelectExistingBusiness(biz)}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                                isSelected
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Store className="w-3.5 h-3.5 shrink-0" />
                                  <span className="text-xs font-black truncate">{biz.businessName || biz.name}</span>
                                  {biz.isMyBusiness && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                      isSelected ? 'bg-white text-amber-800' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    }`}>
                                      {language === 'EN' ? 'Your Business' : 'आपका बिज़नेस'}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {biz.categoryLabel || biz.category || 'Business'} • {biz.area || 'Local Area'}
                                </p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Linked Business Summary Pill */}
                      {selectedBusiness && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2">
                          <div className="text-xs">
                            <span className="font-black text-emerald-900 dark:text-emerald-200 block">
                              ✓ {language === 'EN' ? 'Linked Shop/Business:' : 'चयनित दुकान/बिज़नेस:'} {selectedBusiness.businessName || selectedBusiness.name}
                            </span>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                              📍 {selectedBusiness.area || 'Local Area'} {selectedBusiness.phone ? `• 📞 ${selectedBusiness.phone}` : ''}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0">
                            {language === 'EN' ? 'Auto-Filled' : 'ऑटो-लिंक्ड'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
                    ⚠️ {errorMessage}
                  </div>
                )}

                {/* STEP 2: Direct Job Requirement Fields Only */}
                <div className="space-y-3 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    {language === 'EN' ? 'STEP 2: ENTER JOB VACANCY / STAFF REQUIREMENT DETAILS' : 'स्टेप 2: सिर्फ जॉब वेकेंसी / स्टाफ की आवश्यकता दर्ज करें'}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'EN' ? 'Job Role / Required Staff Post *' : 'किस पद के लिए स्टाफ चाहिए? *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={jobRole}
                        onChange={(e) => setJobRole(e.target.value)}
                        placeholder={language === 'EN' ? 'e.g. Sales Staff / Billing Cashier / Helper' : 'उदा. सेल्स स्टाफ / बिलिंग कैशियर / हेल्पर'}
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'EN' ? 'Salary Offered (Monthly)' : 'दी जाने वाली सैलरी (मासिक)'}
                      </label>
                      <input
                        type="text"
                        value={salaryOffered}
                        onChange={(e) => setSalaryOffered(e.target.value)}
                        placeholder={language === 'EN' ? 'e.g. ₹12,000 - ₹18,000' : 'उदा. ₹12,000 - ₹18,000'}
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'EN' ? 'Job Type' : 'जॉब प्रकार'}
                      </label>
                      <select
                        value={vacancyType}
                        onChange={(e) => setVacancyType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                      >
                        <option value="Full-Time">{language === 'EN' ? 'Full-Time' : 'पूर्णकालिक (Full-Time)'}</option>
                        <option value="Part-Time">{language === 'EN' ? 'Part-Time' : 'अंशकालिक (Part-Time)'}</option>
                        <option value="Hourly">{language === 'EN' ? 'Hourly Basis' : 'घंटे के अनुसार'}</option>
                        <option value="Contract">{language === 'EN' ? 'Contract' : 'अनुबंध आधारित'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'EN' ? 'Number of Openings' : 'कितने स्टाफ चाहिए?'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={openingsCount}
                        onChange={(e) => setOpeningsCount(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'EN' ? 'Contact Phone *' : 'संपर्क मोबाइल नंबर *'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98XXXXXXXX"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Work Timings & Job Responsibilities' : 'काम का समय और विवरण'}
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={language === 'EN' ? 'e.g. 10 AM to 8 PM, Sunday off, basic billing or customer handling...' : 'उदा. सुबह 10 से शाम 8 बजे तक, काम की जानकारी लिखें...'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-medium resize-none"
                    />
                  </div>
                </div>

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
                    className="flex-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-amber-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? (language === 'EN' ? 'Posting Job...' : 'पोस्ट हो रहा है...')
                        : (language === 'EN' ? 'Post Job Vacancy Directly' : 'सीधे जॉब वेकेंसी पोस्ट करें')}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* OPTION B: NEW EMPLOYER REGISTRATION & JOB REQUIREMENT FORM    */}
        {/* ============================================================ */}
        {activeTab === 'new' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-100">
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
                    {language === 'EN' ? 'Employer Registered & Vacancy Submitted!' : 'नया एम्प्लॉयर व वेकेंसी सबमिट हो गई!'}
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
                      setActiveTab('browse');
                    }}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {language === 'EN' ? 'View Live Vacancies' : 'लाइव वेकेंसीज़ देखें'}
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
              <form onSubmit={handleNewEmployerSubmit} className="space-y-4">
                {/* Hidden Trap Field for Bot Submissions */}
                <input
                  type="text"
                  name="website_url_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  value={hpWebsiteUrl}
                  onChange={(e) => setHpWebsiteUrl(e.target.value)}
                  className="hidden opacity-0 pointer-events-none absolute -left-[9999px]"
                />
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-slate-800 border border-orange-200 dark:border-slate-700 text-xs font-bold text-orange-900 dark:text-orange-200">
                  {language === 'EN'
                    ? '🏢 New Employer Registration: Register your Shop/Company/Business and post your Staff Vacancy in one step.'
                    : '🏢 नया एम्प्लॉयर रजिस्ट्रेशन: अपनी दुकान/कंपनी/बिज़नेस रजिस्टर करें और साथ ही अपनी स्टाफ वेकेंसी पोस्ट करें।'}
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
                    ⚠️ {errorMessage}
                  </div>
                )}

                {/* Employer Business Name & Owner Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'EN' ? 'Employer / Shop / Company Name *' : 'दुकान / कंपनी / एम्प्लॉयर का नाम *'}
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
                      {language === 'EN' ? 'Employer / Owner Full Name *' : 'मालिक / एम्प्लॉयर का नाम *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder={language === 'EN' ? 'e.g. Rajesh Sharma' : 'उदा. राजेश शर्मा'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>
                </div>

                {/* Job Role & Business Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <option value="Full-Time">{language === 'EN' ? 'Full-Time' : 'पूर्णकालिक (Full-Time)'}</option>
                      <option value="Part-Time">{language === 'EN' ? 'Part-Time' : 'अंशकालिक (Part-Time)'}</option>
                      <option value="Hourly">{language === 'EN' ? 'Hourly Basis' : 'घंटे के अनुसार'}</option>
                      <option value="Contract">{language === 'EN' ? 'Contract' : 'अनुबंध आधारित'}</option>
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
                      <option value="Immediate">{language === 'EN' ? '⚡ Immediate' : '⚡ तुरंत भर्ती (Immediate)'}</option>
                      <option value="Within 1 Week">{language === 'EN' ? 'Within 1 Week' : '1 सप्ताह में'}</option>
                      <option value="Normal">{language === 'EN' ? 'Normal' : 'सामान्य'}</option>
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
                      {language === 'EN' ? 'Exact Shop / Office Address' : 'दुकान / ऑफिस का पूरा पता'}
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
                    className="flex-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-orange-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? (language === 'EN' ? 'Submitting...' : 'सबमिट हो रहा है...')
                        : (language === 'EN' ? 'Register Employer & Post Job' : 'रजिस्टर करें और जॉब पोस्ट करें')}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: BROWSE LIVE POSTED EMPLOYER VACANCIES                  */}
        {/* ============================================================ */}
        {activeTab === 'browse' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-900">
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

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {filteredVacancies.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-slate-800 text-amber-500 flex items-center justify-center mx-auto text-2xl border border-amber-200 dark:border-slate-700">
                    🏢
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {language === 'EN' ? 'No Employer Vacancies found' : 'कोई वेकेंसी नहीं मिली'}
                  </h4>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => setActiveTab('registered')}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      {language === 'EN' ? 'Option A: Registered Shop' : 'विकल्प A: रजिस्टर्ड दुकान'}
                    </button>
                    <button
                      onClick={() => setActiveTab('new')}
                      className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      {language === 'EN' ? 'Option B: New Employer' : 'विकल्प B: नया एम्प्लॉयर'}
                    </button>
                  </div>
                </div>
              ) : (
                filteredVacancies.map((vac) => (
                  <div
                    key={vac.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-amber-100 dark:border-slate-700/80 shadow-xs hover:border-amber-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                          {vac.photoOrLogoUrl ? (
                            <img src={vac.photoOrLogoUrl} alt={vac.companyOrShopName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          ) : (
                            <span>{vac.companyOrShopName ? vac.companyOrShopName.charAt(0).toUpperCase() : '🏢'}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {vac.companyOrShopName}
                            </h4>
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              · Verified Employer
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

                      {vac.salaryOffered && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl text-right shrink-0">
                          <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Salary</span>
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">{vac.salaryOffered}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Type:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{vac.vacancyType || 'Full-Time'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Openings:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{vac.openingsCount || 1}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                        <span className="text-xs">⚡</span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Hiring:</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 truncate">{vac.urgency || 'Immediate'}</span>
                      </div>
                    </div>

                    {vac.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        {vac.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      {isEntityOwner(vac, getCurrentUser()) ? (
                        <button
                          type="button"
                          onClick={() => handleStartEditVacancy(vac)}
                          className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{language === 'EN' ? 'Edit Vacancy' : 'वेकेंसी एडिट करें'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleWhatsAppContact(vac)}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{language === 'EN' ? 'Apply on WhatsApp' : 'व्हाट्सएप आवेदन'}</span>
                        </button>
                      )}

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
      </motion.div>
    </div>
  );
}
