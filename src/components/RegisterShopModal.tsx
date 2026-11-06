import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, X, Camera, MapPin, ShieldCheck, Plus, Search, MessageSquare, Star, Lock, AlertCircle, CheckCircle2, Edit3 } from 'lucide-react';
import { useLanguage } from '../i18n';
import { getShops, saveShop, getCurrentUser } from '../auth';
import { applyIdWatermark } from '../lib/watermark';
import { validateUploadedFile, checkSystemSecurityBlock } from '../lib/security';
import { submitVerification } from '../api';
import { isEntityOwner } from '../lib/ownership';
import { compressImageToWebP } from '../lib/imageCompression';
import { SmartLocationPicker } from './SmartLocationPicker';
import { PhonePrivacyToggle } from './PhonePrivacyToggle';
import { LiveSelfieCaptureField } from './LiveSelfieCaptureField';
import {
  getSavedUserLocation,
  getLocalizedLocationButtonText,
  matchesUserLocationFilter,
  UserManualLocation
} from '../data/panIndiaLocations';

export interface RegisteredShop {
  id: string;
  userId?: string;
  ownerEmail?: string;
  name: string;
  type: 'shop' | 'showroom' | 'mall' | 'mart' | 'bakery' | 'pharmacy' | 'other';
  categoryLabel: string;
  ownerName: string;
  phone: string;
  whatsapp?: string;
  isPhonePublic?: boolean;
  timings?: string;
  area: string;
  address: string;
  description: string;
  photoUrl?: string;
  photos?: string[];
  watermarkedSelfieUrl?: string;
  rawSelfieUrl?: string;
  idDocumentWatermarked?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const SHOP_TYPES = [
  { id: 'shop', nameEn: 'Shop & Retail Store', nameHi: 'दुकान व रिटेल स्टोर', nameGu: 'દુકાન અને રિટેલ સ્ટોર', icon: '🏪' },
  { id: 'showroom', nameEn: 'Showroom & Brand Outlet', nameHi: 'शोरूम व ब्रांड आउटलेट', nameGu: 'શોરૂમ અને બ્રાન્ડ આઉટલેટ', icon: '🏬' },
  { id: 'mall', nameEn: 'Shopping Mall & Commercial Complex', nameHi: 'शॉपिंग मॉल व कॉम्प्लेक्स', nameGu: 'શોપિંગ મોલ અને કોમ્પ્લેક્સ', icon: '🏢' },
  { id: 'service_center', nameEn: 'Service Center & Workshop', nameHi: 'सर्विस सेंटर व वर्कशॉप', nameGu: 'સર્વિસ સેન્ટર અને વર્કશોપ', icon: '⚙️' },
  { id: 'mart', nameEn: 'SuperMarket & Grocery Mart', nameHi: 'सुपरमार्केट व ग्रॉसरी मार्ट', nameGu: 'સુપરમાર્કેટ અને ગ્રોસરી માર્ટ', icon: '🛒' },
  { id: 'restaurant', nameEn: 'Restaurant, Cafe & Hotel', nameHi: 'रेस्टोरेंट, कैफे व होटल', nameGu: 'રેસ્ટોરન્ટ, કાફે અને હોટેલ', icon: '🍽️' },
  { id: 'pharmacy', nameEn: 'Hospital, Clinic & Pharmacy', nameHi: 'अस्पताल, क्लिनिक व फार्मेसी', nameGu: 'હોસ્પિટલ, ક્લિનિક અને ફાર્મસી', icon: '💊' },
  { id: 'coaching', nameEn: 'Educational Coaching & Academy', nameHi: 'कोचिंग व अकादमी', nameGu: 'શૈક્ષણિક કોચિંગ અને એકેડમી', icon: '🎓' },
  { id: 'other', nameEn: 'Other Business & Venue', nameHi: 'अन्य बिज़नेस व वेन्यू', nameGu: 'અન્ય બિઝનેસ અને વેન્યુ', icon: '📍' },
];

interface RegisterShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (shop: RegisteredShop) => void;
  initialTab?: 'registered' | 'new';
}

export default function RegisterShopModal({ isOpen, onClose, onSuccess, initialTab = 'new' }: RegisterShopModalProps) {
  const { language, tr } = useLanguage();

  const [activeTab, setActiveTab] = useState<'registered' | 'new'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('shop');
  const [customType, setCustomType] = useState('');
  const [ownerName, setOwnerName] = useState(() => getCurrentUser()?.displayName || '');
  const [ownerEmail, setOwnerEmail] = useState(() => {
    const u = getCurrentUser();
    return u?.email || localStorage.getItem('locohelp_last_logged_in_email') || '';
  });
  const [phone, setPhone] = useState(() => {
    const u = getCurrentUser();
    return (u?.phone || localStorage.getItem('locohelp_last_logged_in_phone') || '').replace(/\D/g, '').slice(-10);
  });
  const [isPhonePublic, setIsPhonePublic] = useState(false);
  const [timings, setTimings] = useState('9:00 AM - 9:00 PM');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [shopPhotos, setShopPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [hpWebsiteUrl, setHpWebsiteUrl] = useState('');

  // Live Selfie Verification State
  const [idDocumentWatermarked, setIdDocumentWatermarked] = useState<string | null>(null);
  const [rawSelfieUrl, setRawSelfieUrl] = useState<string | null>(null);
  const [idUploadNotice, setIdUploadNotice] = useState<string | null>(null);

  const [registeredShopsList, setRegisteredShopsList] = useState<RegisteredShop[]>([]);
  const [activeLocation, setActiveLocation] = useState<UserManualLocation>(() => getSavedUserLocation());
  const [filterShopsByCity, setFilterShopsByCity] = useState<boolean>(() => {
    const saved = getSavedUserLocation();
    return Boolean(saved?.district && String(saved.district).trim().toLowerCase() !== 'all');
  });

  useEffect(() => {
    const syncLoc = (e?: any) => {
      const nextLoc = e?.detail?.district ? e.detail : getSavedUserLocation();
      setActiveLocation(nextLoc);
      setFilterShopsByCity(Boolean(nextLoc?.district && String(nextLoc.district).trim().toLowerCase() !== 'all'));
    };
    window.addEventListener('locohelp_location_changed', syncLoc);
    window.addEventListener('storage', syncLoc);
    return () => {
      window.removeEventListener('locohelp_location_changed', syncLoc);
      window.removeEventListener('storage', syncLoc);
    };
  }, []);

  const handleStartEditShop = (shop: RegisteredShop) => {
    setEditingShopId(shop.id);
    setShopName(shop.name);
    setShopType(shop.type || 'shop');
    setOwnerName(shop.ownerName || '');
    setPhone(shop.whatsapp || shop.phone || '');
    setIsPhonePublic(Boolean(shop.isPhonePublic === true));
    setTimings(shop.timings || '9:00 AM - 9:00 PM');
    setArea(shop.area || '');
    setAddress(shop.address || '');
    setDescription(shop.description || '');
    setPhotoUrl(shop.photoUrl || null);
    setShopPhotos(Array.isArray(shop.photos) && shop.photos.length > 0 ? shop.photos : (shop.photoUrl ? [shop.photoUrl] : []));
    if (shop.watermarkedSelfieUrl || shop.idDocumentWatermarked || shop.photoUrl) {
      setIdDocumentWatermarked(shop.watermarkedSelfieUrl || shop.idDocumentWatermarked || shop.photoUrl || null);
    }
    if (shop.rawSelfieUrl || shop.idDocumentWatermarked) {
      setRawSelfieUrl(shop.rawSelfieUrl || shop.idDocumentWatermarked || null);
    }
    setActiveTab('new');
  };

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    const activeUser = getCurrentUser();
    if (activeUser?.displayName && !ownerName) setOwnerName(activeUser.displayName);
    if (activeUser?.email) setOwnerEmail(activeUser.email);
    const cleanPhone = (activeUser?.phone || localStorage.getItem('locohelp_last_logged_in_phone') || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone) setPhone(cleanPhone);

    getShops(true).then((cloudShops) => {
      if (Array.isArray(cloudShops)) {
        const allValidShops = cloudShops.filter(s => s && s.id && !String(s.id).startsWith('sample_shop_'));
        const approvedOnly = allValidShops.filter(s => s.isVerified === true || s.status === 'approved');
        setRegisteredShopsList(approvedOnly);
        try {
          localStorage.setItem('locohelp_registered_shops', JSON.stringify(allValidShops));
        } catch {}
      }
    }).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMultiplePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setIdUploadNotice(null);

    const remainingSlots = Math.max(0, 3 - shopPhotos.length);
    if (remainingSlots === 0) {
      setIdUploadNotice(tr('Maximum 3 shop photos allowed.', 'अधिकतम 3 दुकान की फोटो अपलोड कर सकते हैं।', 'વધુમાં વધુ 3 દુકાનના ફોટા અપલોડ કરી શકાય છે.'));
      e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const newDataUrls: string[] = [];

    for (const file of filesToProcess) {
      const check = await validateUploadedFile(file, { allowPdf: false });
      if (!check.valid) {
        setIdUploadNotice(tr(check.error || 'Invalid image (Max 2MB JPG/PNG/WEBP)', check.errorHi || check.error || 'अमान्य इमेज (अधिकतम 2MB)', 'અમાન્ય ફોટો (મહત્તમ 2MB)'));
        e.target.value = '';
        return;
      }
      try {
        const dataUrl = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.75 });
        newDataUrls.push(dataUrl);
      } catch {
        const fallbackUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newDataUrls.push(fallbackUrl);
      }
    }

    const combined = [...shopPhotos, ...newDataUrls].slice(0, 3);
    setShopPhotos(combined);
    setPhotoUrl(combined[0] || null);
    e.target.value = '';
  };

  const handleRemoveShopPhoto = (idx: number) => {
    const updated = shopPhotos.filter((_, i) => i !== idx);
    setShopPhotos(updated);
    setPhotoUrl(updated[0] || null);
  };

  const handleWhatsAppContact = (shop: RegisteredShop) => {
    const cleanPhone = (shop.whatsapp || shop.phone || '').replace(/\D/g, '');
    if (!cleanPhone) return;
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = encodeURIComponent(
      `Namaste ${shop.ownerName || shop.name}! 🙏 LocoHelp App par aapki dukan/business list dekh kar contact kar raha hoon.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return;

    const secBlock = checkSystemSecurityBlock(shopName, customType, ownerName, area, address, description);
    if (secBlock.blocked) {
      setIdUploadNotice(secBlock.getMessage(language));
      return;
    }

    if (!idDocumentWatermarked) {
      setIdUploadNotice(
        tr(
          '📸 Owner Live Camera Selfie is mandatory for Shop / Business verification.',
          '📸 दुकान / बिज़नेस सत्यापन के लिए मालिक की लाइव कैमरा सेल्फी अनिवार्य है।',
          '📸 દુકાન / બિઝનેસ ચકાસણી માટે માલિકની લાઈવ કેમેરા સેલ્ફી ફરજિયાત છે.'
        )
      );
      return;
    }

    setIdUploadNotice(null);
    setIsSubmitting(true);

    const activeUser = getCurrentUser();
    const typeObj = SHOP_TYPES.find(t => t.id === shopType);
    const label = shopType === 'other' && customType.trim()
      ? customType.trim()
      : (typeObj ? tr(typeObj.nameEn, typeObj.nameHi, typeObj.nameGu) : 'Local Business');

    const shopId = editingShopId || ('shop_' + Date.now().toString(36));
    const primaryPhoto = shopPhotos[0] || photoUrl || undefined;
    const linkedPhone = (phone.trim() || activeUser?.phone || localStorage.getItem('locohelp_last_logged_in_phone') || '').replace(/\D/g, '').slice(-10);
    const finalOwnerEmail = (
      ownerEmail.trim() ||
      activeUser?.email ||
      localStorage.getItem('locohelp_last_logged_in_email') ||
      (linkedPhone ? `${linkedPhone}@phone.locohelp.com` : '')
    ).toLowerCase();

    const existingEditingShop = editingShopId
      ? registeredShopsList.find(s => s.id === editingShopId)
      : undefined;
    const wasShopApproved = Boolean(
      existingEditingShop && (existingEditingShop.isVerified === true || existingEditingShop.status === 'approved')
    );
    const nextShopStatus = wasShopApproved ? 'approved' : 'pending';

    const adminCleanSelfie = rawSelfieUrl || idDocumentWatermarked || '';
    const newShop: RegisteredShop = {
      id: shopId,
      userId: activeUser?.uid || '',
      ownerEmail: finalOwnerEmail,
      name: shopName.trim(),
      type: shopType as any,
      categoryLabel: label,
      ownerName: ownerName.trim() || activeUser?.displayName || 'Owner',
      phone: linkedPhone,
      whatsapp: linkedPhone,
      isPhonePublic,
      timings: timings.trim() || '9:00 AM - 9:00 PM',
      area: area.trim() || 'Local Area',
      address: address.trim() || area.trim() || 'Market Area',
      description: description.trim() || 'Welcome to our business!',
      photoUrl: primaryPhoto,
      photos: shopPhotos.length > 0 ? shopPhotos : (primaryPhoto ? [primaryPhoto] : []),
      watermarkedSelfieUrl: idDocumentWatermarked || undefined,
      rawSelfieUrl: adminCleanSelfie || undefined,
      idDocumentWatermarked: adminCleanSelfie || undefined,
      rating: existingEditingShop?.rating || 5.0,
      reviewCount: existingEditingShop?.reviewCount || 1,
      isVerified: wasShopApproved,
      status: nextShopStatus,
      createdAt: existingEditingShop?.createdAt || new Date().toISOString()
    };

    try {
      const existingStr = localStorage.getItem('locohelp_registered_shops');
      const existingShops: RegisteredShop[] = existingStr ? JSON.parse(existingStr) : [];
      const updatedShops = [newShop, ...existingShops.filter(s => s && s.id && s.id !== shopId && !String(s.id).startsWith('sample_shop_'))];
      localStorage.setItem('locohelp_registered_shops', JSON.stringify(updatedShops));
      localStorage.setItem('locohelp_my_business_profile', JSON.stringify(newShop));
    } catch (e) {}

    try {
      await saveShop({
        ...newShop,
        isPhonePublic,
        website_url_hp: hpWebsiteUrl,
        watermarkedSelfieUrl: idDocumentWatermarked || primaryPhoto || '',
        rawSelfieUrl: adminCleanSelfie || idDocumentWatermarked || '',
        idDocumentWatermarked: adminCleanSelfie || idDocumentWatermarked || primaryPhoto || ''
      });
    } catch (err) {
      console.warn("Shop backend save notice:", err);
    }

    setIsSubmitting(false);
    setEditingShopId(null);

    setShopName('');
    setTimings('9:00 AM - 9:00 PM');
    setAddress('');
    setDescription('');
    setPhotoUrl(null);
    setShopPhotos([]);
    setIdDocumentWatermarked(null);
    setRawSelfieUrl(null);

    setPendingNotice(
      tr(
        '⏳ Your Business Registration has been submitted to the Admin Panel for approval! Once approved by Admin, it will be live in the public directory.',
        '⏳ आपका बिज़नेस रजिस्ट्रेशन एडमिन अप्रूवल के लिए भेज दिया गया है! एडमिन द्वारा अप्रूव करते ही यह पब्लिक डायरेक्टरी में लाइव हो जाएगा।',
        '⏳ તમારું બિઝનેસ રજિસ્ટ્રેશન એડમિન મંજૂરી માટે મોકલાઈ ગયું છે! એડમિન દ્વારા મંજૂર થતાં જ તે પબ્લિક ડિરેક્ટરીમાં લાઈવ થઈ જશે.'
      )
    );
    setActiveTab('registered');

    if (onSuccess) {
      onSuccess(newShop);
    }
  };

  const selectedDistLower = (activeLocation?.district || '').trim().toLowerCase();
  const isAllCitiesMode = !selectedDistLower || selectedDistLower === 'all';

  const filteredShops = registeredShopsList.filter(s => {
    if (!s || (!s.isVerified && s.status !== 'approved')) return false;
    if (filterShopsByCity && !isAllCitiesMode && !searchQuery.trim()) {
      const shopLocText = `${s.area || ''} ${s.address || ''} ${s.description || ''}`;
      if (!matchesUserLocationFilter(shopLocText, activeLocation)) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || 
           s.categoryLabel.toLowerCase().includes(q) || 
           s.area.toLowerCase().includes(q) || 
           s.ownerName.toLowerCase().includes(q);
  });

  return (
    <AnimatePresence>
      <div
        className="fixed inset-x-0 z-50 bg-white dark:bg-slate-900 flex flex-col overflow-hidden"
        style={{
          position: 'fixed',
          top: '52px',
          left: 0,
          right: 0,
          bottom: 'calc(62px + env(safe-area-inset-bottom, 0px))',
          zIndex: 5000,
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl mx-auto h-full bg-white dark:bg-slate-900 p-4 sm:p-6 md:p-8 z-10 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-3 shrink-0 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                🏪
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{tr('Local Shops & Businesses', 'लोकल दुकानें व बिज़नेस', 'સ્થાનિક દુકાનો અને બિઝનેસ')}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {tr(
                    'Browse verified businesses or register your shop',
                    'रजिस्टर्ड दुकानें देखें या अपनी दुकान रजिस्टर करें',
                    'રજિસ્ટર્ડ દુકાનો જુઓ અથવા તમારી દુકાન રજિસ્ટર કરો'
                  )}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              <X className="w-4 h-4" />
              <span>{tr('Back / Close', 'वापस जाएं', 'પાછા જાઓ')}</span>
            </button>
          </div>

          {/* Two Action Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-3 shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('registered')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'registered'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{tr(`Directory (${filteredShops.length})`, `लिस्टिंग (${filteredShops.length})`, `લિસ્ટિંગ (${filteredShops.length})`)}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'new'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tr('+ Register Shop / Business', '+ दुकान / बिज़नेस रजिस्टर करें', '+ દુકાન / બિઝનેસ રજિસ્ટર કરો')}</span>
            </button>
          </div>

          {pendingNotice && (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3 mb-3 shrink-0 text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {pendingNotice}
            </div>
          )}

          {activeTab === 'registered' ? (
            <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={tr("Search by shop name, category or area...", "दुकान का नाम, श्रेणी या इलाका खोजें...", "દુકાનનું નામ, કેટેગરી અથવા વિસ્તાર શોધો...")}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
                {!isAllCitiesMode && (
                  <button
                    type="button"
                    onClick={() => setFilterShopsByCity(prev => !prev)}
                    className={`px-3 py-2 rounded-2xl text-xs font-extrabold border shrink-0 cursor-pointer transition-all ${
                      filterShopsByCity
                        ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    📍 {filterShopsByCity ? getLocalizedLocationButtonText(activeLocation, language) : tr('All Cities', 'सभी शहर', 'બધા શહેરો')}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredShops.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-xs text-slate-500 font-medium">
                      {filterShopsByCity && !isAllCitiesMode
                        ? tr(
                            `No approved businesses listed in ${getLocalizedLocationButtonText(activeLocation, language)} yet.`,
                            `अभी ${getLocalizedLocationButtonText(activeLocation, language)} में कोई अप्रूव्ड बिज़नेस लिस्ट नहीं हुआ है।`,
                            `હાલ ${getLocalizedLocationButtonText(activeLocation, language)} માં કોઈ મંજૂર બિઝનેસ લિસ્ટ થયો નથી.`
                          )
                        : tr('No approved businesses listed yet.', 'अभी तक कोई अप्रूव्ड बिज़नेस लिस्ट नहीं हुआ है।', 'હજુ સુધી કોઈ મંજૂર બિઝનેસ લિસ્ટ થયો નથી.')}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {filterShopsByCity && !isAllCitiesMode && registeredShopsList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterShopsByCity(false)}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
                        >
                          🌐 {tr('View All Cities', 'सभी शहर देखें', 'બધા શહેરોની દુકાનો જુઓ')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('new')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
                      >
                        + {tr('Register Your Shop Now', 'अपनी दुकान अभी रजिस्टर करें', 'તમારી દુકાન હમણાં જ રજિસ્ટર કરો')}
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredShops.map((shop) => {
                    const gallery = Array.isArray(shop.photos) && shop.photos.length > 0 ? shop.photos : (shop.photoUrl ? [shop.photoUrl] : []);
                    const canDirectContact = Boolean(shop.isPhonePublic === true && (shop.whatsapp || shop.phone));
                    return (
                      <div 
                        key={shop.id}
                        className="bg-slate-50/80 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-3.5 space-y-2.5 shadow-xs hover:border-amber-400 transition-all"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                {shop.categoryLabel || 'Local Business'}
                              </span>
                              {shop.isVerified && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5" /> {tr('Verified', 'सत्यापित', 'વેરિફાઈડ')}
                                </span>
                              )}
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                              {shop.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{shop.area} {shop.address && shop.address !== shop.area ? `• ${shop.address}` : ''}</span>
                            </p>
                            {shop.timings && (
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                                🕒 {shop.timings}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-1 rounded-xl border border-amber-200 dark:border-amber-800 shrink-0">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{shop.rating || 4.9}</span>
                          </div>
                        </div>

                        {gallery.length > 0 && (
                          <div className="pt-1">
                            {gallery.length === 1 ? (
                              <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden border-2 border-amber-300 dark:border-slate-700 shadow-md">
                                <img
                                  src={gallery[0]}
                                  alt={shop.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
                                {gallery.map((imgUrl, idx) => (
                                  <div
                                    key={idx}
                                    className="min-w-[85%] sm:min-w-[65%] snap-start h-44 sm:h-52 rounded-2xl overflow-hidden border-2 border-amber-300 dark:border-slate-700 shadow-md relative shrink-0"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`${shop.name} photo ${idx + 1}`}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover"
                                    />
                                    <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-white/20">
                                      Photo {idx + 1}/{gallery.length}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {shop.description && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            {shop.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 gap-2">
                          <div className="text-[11px] text-slate-500 font-bold">
                            👤 {tr('Owner:', 'मालिक:', 'માલિક:')} <span className="text-slate-800 dark:text-slate-200">{shop.ownerName || 'Manager'}</span>
                          </div>

                          {isEntityOwner(shop, getCurrentUser()) ? (
                            <button
                              type="button"
                              onClick={() => handleStartEditShop(shop)}
                              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{tr('Edit Details', 'जानकारी एडिट करें', 'માહિતી એડિટ કરો')}</span>
                            </button>
                          ) : canDirectContact ? (
                            <button
                              type="button"
                              onClick={() => handleWhatsAppContact(shop)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{tr('WhatsApp Contact', 'व्हाट्सएप संपर्क', 'વોટ્સએપ સંપર્ક')}</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] rounded-xl border border-indigo-200 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>{tr('Number Private (Visit Shop)', 'नंबर प्राइवेट है', 'નંબર પ્રાઇવેટ છે')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* NEW BUSINESS / SHOP REGISTRATION FORM */
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              <input
                type="text"
                name="website_url_hp"
                tabIndex={-1}
                autoComplete="off"
                value={hpWebsiteUrl}
                onChange={(e) => setHpWebsiteUrl(e.target.value)}
                className="hidden opacity-0 pointer-events-none absolute -left-[9999px]"
              />

              {idUploadNotice && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{idUploadNotice}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Shop / Business Name *', 'दुकान / बिज़नेस का नाम *', 'દુકાન / બિઝનેસનું નામ *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder={tr('e.g. Sharma General Store', 'उदा. शर्मा जनरल स्टोर', 'દા.ત. શર્મા જનરલ સ્ટોર')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Business Category *', 'बिज़नेस की श्रेणी *', 'બિઝનેસની કેટેગરી *')}
                  </label>
                  <select
                    value={shopType}
                    onChange={(e) => setShopType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  >
                    {SHOP_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon} {tr(t.nameEn, t.nameHi, t.nameGu)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Owner Name *', 'मालिक (Owner) का नाम *', 'માલિક (Owner) નું નામ *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder={tr('e.g. Rajesh Sharma', 'उदा. राजेश शर्मा', 'દા.ત. રાજેશ શર્મા')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {shopType === 'other' && (
                <div>
                  <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                    {tr('Specify Custom Category *', 'अपनी श्रेणी का नाम लिखें *', 'તમારી કેટેગરીનું નામ લખો *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder={tr('e.g. Hardware Store, Electronics', 'उदा. हार्डवेयर स्टोर, इलेक्ट्रॉनिक्स', 'દા.ત. હાર્ડવેર સ્ટોર, ઇલેક્ટ્રોનિક્સ')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Smart Location Selector (State -> District -> Area) */}
              <SmartLocationPicker
                language={language}
                value={area}
                onChange={(formatted) => setArea(formatted)}
              />

              {/* Phone Privacy Toggle (Default Private + DB Re-Auth to make Public) */}
              <PhonePrivacyToggle
                language={language}
                isPhonePublic={isPhonePublic}
                onChange={setIsPhonePublic}
                phoneDisplay={phone ? `+91 ${phone}` : undefined}
              />

              {/* Mandatory Owner Live Camera Selfie */}
              <LiveSelfieCaptureField
                value={idDocumentWatermarked || ''}
                onChange={(watermarkedUrl, rawCleanUrl) => {
                  setIdDocumentWatermarked(watermarkedUrl);
                  if (rawCleanUrl) setRawSelfieUrl(rawCleanUrl);
                  setIdUploadNotice(null);
                }}
                userName={ownerName.trim() || shopName.trim() || 'Shop Owner'}
                entityType="business"
                required={true}
                label={tr('📸 Owner Live Camera Selfie (Mandatory) *', '📸 दुकान मालिक की लाइव सेल्फी (अनिवार्य) *', '📸 દુકાન માલિકની લાઈવ સેલ્ફી (ફરજિયાત) *')}
                onError={(msg) => setIdUploadNotice(msg)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Shop Landmark / Address (Optional)', 'दुकान का पता / लैंडमार्क (वैकल्पिक)', 'દુકાનનું સરનામું / લેન્ડમાર્ક (વૈકલ્પિક)')}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={tr('Shop No. 12, Near Main Road', 'दुकान नं 12, मेन रोड के पास', 'દુકાન નં. 12, મેઈન રોડ પાસે')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('Shop Timings (Optional)', 'दुकान खुलने का समय (वैकल्पिक)', 'દુકાન ખુલવાનો સમય (વૈકલ્પિક)')}
                  </label>
                  <input
                    type="text"
                    value={timings}
                    onChange={(e) => setTimings(e.target.value)}
                    placeholder={tr('9:00 AM - 9:00 PM', 'सुबह 9 से रात 9 बजे तक', 'સવારે 9 થી રાત્રે 9 વાગ્યા સુધી')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {tr('About Shop / Products & Services (Optional)', 'दुकान की जानकारी व सामान (वैकल्पिक)', 'દુકાનની માહિતી અને સામાન (વૈકલ્પિક)')}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={tr('Home delivery available, wholesale rates, special offers...', 'होम डिलीवरी उपलब्ध, थोक व खुदरा रेट...', 'હોમ ડિલિવરી ઉપલબ્ધ, જથ્થાબંધ અને છૂટક ભાવ...')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Multiple Shop Photos Upload */}
              <div className="p-3 bg-amber-50/60 dark:bg-slate-800/80 rounded-2xl border border-amber-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>{tr('Upload Shop Photos (Optional, up to 3)', 'दुकान की फोटो अपलोड करें (वैकल्पिक, 3 तक)', 'દુકાનના ફોટા અપલોડ કરો (વૈકલ્પિક, 3 સુધી)')}</span>
                  </label>
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">
                    {shopPhotos.length}/3
                  </span>
                </div>

                {shopPhotos.length < 3 && (
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={handleMultiplePhotosUpload}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer"
                  />
                )}

                {shopPhotos.length > 0 && (
                  <div className="flex gap-2 pt-1 overflow-x-auto">
                    {shopPhotos.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-16 rounded-xl overflow-hidden border border-amber-300 shrink-0 group">
                        <img src={img} alt={`Shop ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveShopPhoto(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 pb-12">
                <button
                  type="button"
                  onClick={() => setActiveTab('registered')}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  {tr('Cancel', 'रद्द करें', 'રદ કરો')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? tr('Submitting...', 'सबमिट हो रहा है...', 'સબમિટ થઈ રહ્યું છે...')
                      : (editingShopId
                          ? tr('Update Shop Details', 'दुकान अपडेट करें', 'દુકાન અપડેટ કરો')
                          : tr('Submit Shop for Admin Approval', 'एडमिन अप्रूवल के लिए सबमिट करें', 'એડમિન મંજૂરી માટે સબમિટ કરો'))}
                  </span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
