import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Building, Building2, ShoppingBag, X, Check, Camera, MapPin, Phone, Tag, ShieldCheck, Plus, Search, MessageSquare, Star, ExternalLink, Sparkles, Lock, FileCheck2, Upload, AlertCircle, CheckCircle2, RefreshCw, Edit3 } from 'lucide-react';
import { useLanguage } from '../i18n';
import { getShops, saveShop, getCurrentUser } from '../auth';
import { applyIdWatermark } from '../lib/watermark';
import { validateUploadedFile } from '../lib/security';
import { submitVerification } from '../api';
import { isEntityOwner } from '../lib/ownership';

export interface RegisteredShop {
  id: string;
  userId?: string;
  ownerEmail?: string;
  name: string;
  type: 'shop' | 'showroom' | 'mall' | 'mart' | 'bakery' | 'pharmacy' | 'other';
  categoryLabel: string;
  ownerName: string;
  phone: string;
  area: string;
  address: string;
  description: string;
  photoUrl?: string;
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
}

export default function RegisterShopModal({ isOpen, onClose, onSuccess }: RegisterShopModalProps) {
  const { language, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'registered' | 'new'>('registered');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('shop');
  const [customType, setCustomType] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);

  const handleStartEditShop = (shop: RegisteredShop) => {
    setEditingShopId(shop.id);
    setShopName(shop.name);
    setShopType(shop.type || 'shop');
    setOwnerName(shop.ownerName || '');
    setPhone(shop.phone || '');
    setArea(shop.area || '');
    setAddress(shop.address || '');
    setDescription(shop.description || '');
    setPhotoUrl(shop.photoUrl || null);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const check = await validateUploadedFile(file, { allowPdf: false });
      if (!check.valid) {
        setIdUploadNotice(language === 'EN' ? (check.error || 'Invalid image') : (check.errorHi || check.error || 'अमान्य इमेज'));
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = await validateUploadedFile(file, { allowPdf: true });
    if (!check.valid) {
      setIdUploadNotice(language === 'EN' ? (check.error || 'Invalid document file') : (check.errorHi || check.error || 'अमान्य दस्तावेज़ फ़ाइल'));
      e.target.value = '';
      return;
    }

    setIsWatermarkingId(true);
    setIdUploadNotice(null);

    try {
      const watermarked = await applyIdWatermark(file, {
        entityType: 'business',
        userName: shopName.trim() || ownerName.trim() || 'Business Owner',
        customText: 'FOR LOCOHELP VERIFICATION ONLY • DO NOT REUSE • BUSINESS ID'
      });
      setIdDocumentWatermarked(watermarked);
      setIdUploadNotice(language === 'EN' ? 'ID document verified & watermarked with security stamp!' : 'पहचान पत्र सत्यापित और सुरक्षा वाटरमार्क लगा दिया गया है!');
    } catch (err: any) {
      console.warn("Watermark error:", err);
      setIdUploadNotice(err?.message || (language === 'EN' ? 'Could not process document file.' : 'दस्तावेज़ प्रोसेस नहीं हो सका।'));
    } finally {
      setIsWatermarkingId(false);
    }
  };

  const handleWhatsAppContact = (shop: RegisteredShop) => {
    const cleanPhone = shop.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = encodeURIComponent(
      `Namaste ${shop.ownerName || shop.name}! 🙏 LocoHelp App par aapki dukan/business list dekh kar contact kar raha hoon.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !phone.trim()) return;

    setIsSubmitting(true);

    const activeUser = getCurrentUser();
    const typeObj = SHOP_TYPES.find(t => t.id === shopType);
    const label = shopType === 'other' && customType.trim()
      ? customType.trim()
      : (typeObj ? (language === 'EN' ? typeObj.nameEn : typeObj.nameHi) : 'Local Business');

    const shopId = editingShopId || ('shop_' + Date.now().toString(36));

    const newShop: RegisteredShop = {
      id: shopId,
      userId: activeUser?.uid || '',
      ownerEmail: activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '',
      name: shopName.trim(),
      type: shopType as any,
      categoryLabel: label,
      ownerName: ownerName.trim() || activeUser?.displayName || 'Owner',
      phone: phone.trim(),
      area: area.trim() || 'Local Area',
      address: address.trim() || 'Market Area',
      description: description.trim() || 'Welcome to our business!',
      photoUrl: photoUrl || undefined,
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
        idDocumentWatermarked: idDocumentWatermarked || photoUrl || ''
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
        idDocumentWatermarked: idDocumentWatermarked || photoUrl || ''
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
    setArea('');
    setAddress('');
    setDescription('');
    setPhotoUrl(null);
    setIdDocumentWatermarked(null);

    setPendingNotice(
      language === 'EN'
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-black/65 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 12 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col border border-amber-200 dark:border-amber-900/60 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                🏪
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{language === 'EN' ? 'Registered Local Businesses' : 'रजिस्टर्ड लोकल दुकानें व बिज़नेस'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'EN' 
                    ? 'Explore registered shops, showrooms, malls & venues in your neighborhood' 
                    : 'अपने आस-पास की रजिस्टर्ड दुकानों, शोरूम व मॉल्स की सूची देखें'}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Hub Guidance Banner */}
          <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 mb-3 shrink-0 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <p className="text-[11px] text-amber-950 dark:text-amber-200 font-bold leading-tight">
                {language === 'EN'
                  ? 'Want to register your shop for 100% Free? Go to Profile (Top Right) → "Business Reg." tab. New registrations go live after Admin approval.'
                  : 'अपनी दुकान 100% फ्री में लिस्ट करने के लिए ऊपर Profile पर जाएं → "Business Reg." टैब चुनें। एडमिन अप्रूवल के बाद आपकी दुकान यहां दिखेगी।'}
              </p>
            </div>
            <span className="text-[10px] bg-amber-500 text-white font-black px-2 py-0.5 rounded-full uppercase shrink-0">
              100% Free
            </span>
          </div>

          {pendingNotice && (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3 mb-3 shrink-0 text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {pendingNotice}
            </div>
          )}

          {/* REGISTERED BUSINESSES DIRECTORY */}
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
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-slate-500 font-medium">
                      {language === 'EN' ? 'No approved businesses listed yet.' : 'अभी तक कोई अप्रूव्ड बिज़नेस लिस्ट नहीं हुआ है।'}
                    </p>
                  </div>
                ) : (
                  filteredShops.map((shop) => (
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
                        </div>

                        <div className="flex items-center gap-1 text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-1 rounded-xl border border-amber-200 dark:border-amber-800 shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{shop.rating || 4.9}</span>
                        </div>
                      </div>

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
                  ))
                )}
              </div>
            </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
