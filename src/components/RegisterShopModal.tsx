import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Building, Building2, ShoppingBag, X, Check, Camera, MapPin, Phone, Tag, ShieldCheck, Plus, Search, MessageSquare, Star, ExternalLink, Sparkles, Lock, FileCheck2, Upload, AlertCircle, CheckCircle2, RefreshCw, Edit3 } from 'lucide-react';
import { useLanguage } from '../i18n';
import { getShops, saveShop, getCurrentUser } from '../auth';
import { applyIdWatermark } from '../lib/watermark';
import { validateUploadedFile, checkSystemSecurityBlock } from '../lib/security';
import { submitVerification } from '../api';
import { isEntityOwner } from '../lib/ownership';
import { compressImageToWebP } from '../lib/imageCompression';

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
  timings?: string;
  area: string;
  address: string;
  description: string;
  photoUrl?: string;
  photos?: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const SHOP_TYPES = [
  { id: 'shop', nameEn: 'Shop & Retail Store', nameHi: 'दुकान व रिटेल स्टोर', icon: '🏪' },
  { id: 'showroom', nameEn: 'Showroom & Brand Outlet', nameHi: 'शोरूम व ब्रांड आउटलेट', icon: '🏬' },
  { id: 'mall', nameEn: 'Shopping Mall & Commercial Complex', nameHi: 'शॉपिंग मॉल व कॉम्प्लेक्स', icon: '🏢' },
  { id: 'service_center', nameEn: 'Service Center & Workshop', nameHi: 'सर्विस सेंटर व वर्कशॉप', icon: '⚙️' },
  { id: 'mart', nameEn: 'SuperMarket & Grocery Mart', nameHi: 'सुपरमार्केट व ग्रॉसरी मार्ट', icon: '🛒' },
  { id: 'restaurant', nameEn: 'Restaurant, Cafe & Hotel', nameHi: 'रेस्टोरेंट, कैफे व होटल', icon: '🍽️' },
  { id: 'pharmacy', nameEn: 'Hospital, Clinic & Pharmacy', nameHi: 'अस्पताल, क्लिनिक व फार्मेसी', icon: '💊' },
  { id: 'coaching', nameEn: 'Educational Coaching & Academy', nameHi: 'कोचिंग व अकादमी', icon: '🎓' },
  { id: 'other', nameEn: 'Other Business & Venue', nameHi: 'अन्य बिज़नेस व वेन्यू', icon: '📍' },
];

interface RegisterShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (shop: RegisteredShop) => void;
  initialTab?: 'registered' | 'new';
}

export default function RegisterShopModal({ isOpen, onClose, onSuccess, initialTab = 'new' }: RegisterShopModalProps) {
  const { language, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'registered' | 'new'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('shop');
  const [customType, setCustomType] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
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

  const handleStartEditShop = (shop: RegisteredShop) => {
    setEditingShopId(shop.id);
    setShopName(shop.name);
    setShopType(shop.type || 'shop');
    setOwnerName(shop.ownerName || '');
    setPhone(shop.whatsapp || shop.phone || '');
    setTimings(shop.timings || '9:00 AM - 9:00 PM');
    setArea(shop.area || '');
    setAddress(shop.address || '');
    setDescription(shop.description || '');
    setPhotoUrl(shop.photoUrl || null);
    setShopPhotos(Array.isArray(shop.photos) && shop.photos.length > 0 ? shop.photos : (shop.photoUrl ? [shop.photoUrl] : []));
    setActiveTab('new');
  };

  // Identity Verification & Document Upload States
  const [idDocumentWatermarked, setIdDocumentWatermarked] = useState<string | null>(null);
  const [idDocumentType, setIdDocumentType] = useState('Trade License / MSME / Owner ID');
  const [isWatermarkingId, setIsWatermarkingId] = useState(false);
  const [idUploadNotice, setIdUploadNotice] = useState<string | null>(null);

  const [registeredShopsList, setRegisteredShopsList] = useState<RegisteredShop[]>([]);

  // Load approved registered shops from localStorage & backend
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);

    try {
      const stored = localStorage.getItem('locohelp_registered_shops');
      if (stored) {
        const parsed: RegisteredShop[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(s => s && s.id && !String(s.id).startsWith('sample_shop_'));
          localStorage.setItem('locohelp_registered_shops', JSON.stringify(cleaned));
          setRegisteredShopsList(cleaned.filter(s => s.isVerified === true || s.status === 'approved'));
        }
      }
    } catch (e) {}

    // Backend fetch (returns only admin-approved businesses by default)
    getShops(false).then((cloudShops) => {
      if (Array.isArray(cloudShops)) {
        const approvedOnly = cloudShops.filter(s => s && s.id && !String(s.id).startsWith('sample_shop_') && (s.isVerified === true || s.status === 'approved'));
        setRegisteredShopsList(approvedOnly);
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
      setIdUploadNotice(language === 'EN' ? 'Maximum 3 shop photos allowed.' : 'अधिकतम 3 दुकान की फोटो अपलोड कर सकते हैं।');
      e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const newDataUrls: string[] = [];

    for (const file of filesToProcess) {
      const check = await validateUploadedFile(file, { allowPdf: false });
      if (!check.valid) {
        setIdUploadNotice(language === 'EN' ? (check.error || 'Invalid image (Max 2MB JPG/PNG/WEBP)') : (check.errorHi || check.error || 'अमान्य इमेज (अधिकतम 2MB)'));
        e.target.value = '';
        return;
      }
      try {
        const dataUrl = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.75 });
        newDataUrls.push(dataUrl);
      } catch (err) {
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
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = encodeURIComponent(
      `Namaste ${shop.ownerName || shop.name}! 🙏 LocoHelp App par aapki dukan/business list dekh kar contact kar raha hoon.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !phone.trim()) return;

    const secBlock = checkSystemSecurityBlock(shopName, customType, ownerName, area, address, description);
    if (secBlock.blocked) {
      setIdUploadNotice(secBlock.getMessage(language));
      return;
    }

    setIdUploadNotice(null);
    setIsSubmitting(true);

    const activeUser = getCurrentUser();
    const typeObj = SHOP_TYPES.find(t => t.id === shopType);
    const label = shopType === 'other' && customType.trim()
      ? customType.trim()
      : (typeObj ? (language === 'EN' ? typeObj.nameEn : typeObj.nameHi) : 'Local Business');

    const shopId = editingShopId || ('shop_' + Date.now().toString(36));
    const primaryPhoto = shopPhotos[0] || photoUrl || undefined;

    const newShop: RegisteredShop = {
      id: shopId,
      userId: activeUser?.uid || '',
      ownerEmail: activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '',
      name: shopName.trim(),
      type: shopType as any,
      categoryLabel: label,
      ownerName: ownerName.trim() || activeUser?.displayName || 'Owner',
      phone: phone.trim(),
      whatsapp: phone.trim(),
      timings: timings.trim() || '9:00 AM - 9:00 PM',
      area: area.trim() || 'Local Area',
      address: address.trim() || 'Market Area',
      description: description.trim() || 'Welcome to our business!',
      photoUrl: primaryPhoto,
      photos: shopPhotos.length > 0 ? shopPhotos : (primaryPhoto ? [primaryPhoto] : []),
      rating: 5.0,
      reviewCount: 1,
      isVerified: false, // Strict requirement: Must be approved by Admin first
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Save locally (with pending status, will only appear in public list once approved)
    try {
      const existingStr = localStorage.getItem('locohelp_registered_shops');
      const existingShops: RegisteredShop[] = existingStr ? JSON.parse(existingStr) : [];
      const updatedShops = [newShop, ...existingShops.filter(s => s && s.id && s.id !== shopId && !String(s.id).startsWith('sample_shop_'))];
      localStorage.setItem('locohelp_registered_shops', JSON.stringify(updatedShops));
      localStorage.setItem('locohelp_my_business_profile', JSON.stringify(newShop));
    } catch (e) {}

    // Save to backend businesses table (also creates pending Admin verification queue item)
    try {
      await saveShop({
        ...newShop,
        website_url_hp: hpWebsiteUrl,
        idDocumentWatermarked: idDocumentWatermarked || primaryPhoto || ''
      });
    } catch (err) {
      console.warn("Shop backend save notice:", err);
    }

    // Submit Verification Request to Admin Queue
    try {
      await submitVerification({
        entityType: 'business',
        entityId: shopId,
        userId: activeUser?.uid || ownerName.trim() || shopName.trim(),
        userName: shopName.trim(),
        userEmail: newShop.ownerEmail,
        userPhone: phone.trim(),
        title: `${shopName.trim()} (${label}) - ${idDocumentType}`,
        idDocumentWatermarked: idDocumentWatermarked || primaryPhoto || ''
      });
    } catch (verifErr) {
      console.warn("Verification submit error:", verifErr);
    }

    setIsSubmitting(false);
    setEditingShopId(null);

    // Reset Form
    setShopName('');
    setOwnerName('');
    setPhone('');
    setTimings('9:00 AM - 9:00 PM');
    setArea('');
    setAddress('');
    setDescription('');
    setPhotoUrl(null);
    setShopPhotos([]);
    setIdDocumentWatermarked(null);

    setPendingNotice(
      language === 'GU'
        ? '⏳ તમારું બિઝનેસ રજિસ્ટ્રેશન એડમિન મંજૂરી માટે મોકલાઈ ગયું છે! એડમિન દ્વારા મંજૂર થતાં જ તે પબ્લિક ડિરેક્ટરીમાં લાઈવ થઈ જશે.'
        : language === 'EN'
        ? '⏳ Your Business Registration has been submitted to the Admin Panel for approval! Once approved by Admin, it will be live in the public directory.'
        : '⏳ आपका बिज़नेस रजिस्ट्रेशन एडमिन अप्रूवल के लिए भेज दिया गया है! एडमिन द्वारा अप्रूव करते ही यह पब्लिक डायरेक्टरी में लाइव हो जाएगा।'
    );
    setActiveTab('registered');

    if (onSuccess) {
      onSuccess(newShop);
    }
  };

  const filteredShops = registeredShopsList.filter(s => {
    if (!s || (!s.isVerified && s.status !== 'approved')) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || 
           s.categoryLabel.toLowerCase().includes(q) || 
           s.area.toLowerCase().includes(q) || 
           s.ownerName.toLowerCase().includes(q);
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
        {/* Full Page Workspace */}
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
                  <span>{language === 'EN' ? 'Local Shops & Businesses' : 'लोकल दुकानें व बिज़नेस'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'EN' 
                    ? 'Browse verified businesses or register your shop' 
                    : 'रजिस्टर्ड दुकानें देखें या अपनी दुकान रजिस्टर करें'}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              <X className="w-4 h-4" />
              <span>{language === 'EN' ? 'Back / Close' : 'वापस जाएं'}</span>
            </button>
          </div>

          {/* Two Action Tabs: Registered Directory vs Register New Shop */}
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
              <span>{language === 'EN' ? `Directory (${filteredShops.length})` : `लिस्टिंग (${filteredShops.length})`}</span>
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
              <span>{language === 'EN' ? '+ Register Shop / Business' : '+ दुकान / बिज़नेस रजिस्टर करें'}</span>
            </button>
          </div>

          {pendingNotice && (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3 mb-3 shrink-0 text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {pendingNotice}
            </div>
          )}

          {activeTab === 'registered' ? (
            /* REGISTERED BUSINESSES DIRECTORY */
            <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
              {/* Search filter bar */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'EN' ? "Search by shop name, category or area..." : "दुकान का नाम, श्रेणी या इलाका खोजें..."}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Shops Cards Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredShops.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-xs text-slate-500 font-medium">
                      {language === 'EN' ? 'No approved businesses listed yet.' : 'अभी तक कोई अप्रूव्ड बिज़नेस लिस्ट नहीं हुआ है।'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('new')}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
                    >
                      + {language === 'EN' ? 'Register Your Shop Now' : 'अपनी दुकान अभी रजिस्टर करें'}
                    </button>
                  </div>
                ) : (
                  filteredShops.map((shop) => {
                    const gallery = Array.isArray(shop.photos) && shop.photos.length > 0 ? shop.photos : (shop.photoUrl ? [shop.photoUrl] : []);
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
                                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                                </span>
                              )}
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                              {shop.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{shop.area} • {shop.address}</span>
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
                            👤 Owner: <span className="text-slate-800 dark:text-slate-200">{shop.ownerName || 'Manager'}</span>
                          </div>

                          {isEntityOwner(shop, getCurrentUser()) ? (
                            <button
                              type="button"
                              onClick={() => handleStartEditShop(shop)}
                              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title={language === 'EN' ? 'Edit shop details' : 'दुकान की जानकारी एडिट करें'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{language === 'EN' ? 'Edit Details' : 'जानकारी एडिट करें'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleWhatsAppContact(shop)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Contact owner on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{language === 'EN' ? 'WhatsApp Contact' : 'व्हाट्सएप संपर्क'}</span>
                            </button>
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

              {idUploadNotice && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{idUploadNotice}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Shop / Business Name *' : 'दुकान / बिज़नेस का नाम *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder={language === 'EN' ? 'e.g. Sharma General Store' : 'उदा. शर्मा जनरल स्टोर'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Business Category *' : 'बिज़नेस की श्रेणी *'}
                  </label>
                  <select
                    value={shopType}
                    onChange={(e) => setShopType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  >
                    {SHOP_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon} {language === 'EN' ? t.nameEn : t.nameHi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {shopType === 'other' && (
                <div>
                  <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                    {language === 'EN' ? 'Specify Custom Category *' : 'अपनी श्रेणी का नाम लिखें *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder={language === 'EN' ? 'e.g. Hardware Store, Electronics' : 'उदा. हार्डवेयर स्टोर, इलेक्ट्रॉनिक्स'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Owner Name *' : 'मालिक (Owner) का नाम *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder={language === 'EN' ? 'e.g. Rajesh Sharma' : 'उदा. राजेश शर्मा'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'WhatsApp / Mobile Number *' : 'व्हाट्सएप / मोबाइल नंबर *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'City / Area / Mohalla *' : 'शहर / इलाका / मोहल्ला *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder={language === 'EN' ? 'e.g. Main Market, Civil Lines' : 'उदा. मेन मार्केट, सिविल लाइन्स'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Shop Timings *' : 'दुकान खुलने का समय (Timings) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={timings}
                    onChange={(e) => setTimings(e.target.value)}
                    placeholder={language === 'EN' ? 'e.g. 9:00 AM - 9:00 PM (Mon-Sun)' : 'उदा. सुबह 9 से रात 9 बजे तक'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'EN' ? 'Full Shop Address / Landmark *' : 'दुकान का पूरा पता / लैंडमार्क *'}
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={language === 'EN' ? 'Shop No. 12, Near Railway Station Road' : 'दुकान नं 12, रेलवे स्टेशन रोड के पास'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'EN' ? 'About Shop / Products & Services' : 'दुकान की जानकारी व उपलब्ध सामान/सेवाएं'}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={language === 'EN' ? 'Home delivery available, wholesale rates, special offers...' : 'होम डिलीवरी उपलब्ध, थोक व खुदरा रेट...'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Multiple Shop Photos Upload (2-3 images max 2MB each) */}
              <div className="p-3 bg-amber-50/60 dark:bg-slate-800/80 rounded-2xl border border-amber-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>{language === 'EN' ? 'Upload Shop Photos (Up to 3 Photos, Max 2MB each)' : 'दुकान की फोटो अपलोड करें (2-3 फोटो, अधिकतम 2MB)'}</span>
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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('registered')}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  {language === 'EN' ? 'Cancel' : 'रद्द करें'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? (language === 'EN' ? 'Submitting...' : 'सबमिट हो रहा है...')
                      : (editingShopId
                          ? (language === 'EN' ? 'Update Shop Details' : 'दुकान अपडेट करें')
                          : (language === 'EN' ? 'Submit Shop for Admin Approval' : 'एडमिन अप्रूवल के लिए सबमिट करें'))}
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
