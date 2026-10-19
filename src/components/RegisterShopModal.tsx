import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Building, Building2, ShoppingBag, X, Check, Camera, MapPin, Phone, Tag, ShieldCheck, Plus, Search, MessageSquare, Star, ExternalLink, Sparkles, Lock, FileCheck2, Upload, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../i18n';
import { getShops, saveShop } from '../auth';
import { applyIdWatermark } from '../lib/watermark';
import { submitVerification } from '../api';

export interface RegisteredShop {
  id: string;
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
  createdAt: string;
}

export const SHOP_TYPES = [
  { id: 'shop', nameEn: 'Shop & Retail Store', nameHi: '🏪 दुकान / रिटेल स्टोर', icon: '🏪' },
  { id: 'showroom', nameEn: 'Showroom & Brand Outlet', nameHi: '🏬 शोरूम व ब्रांड आउटलेट', icon: '🏬' },
  { id: 'mall', nameEn: 'Shopping Mall & Commercial Complex', nameHi: '🏢 शॉपिंग मॉल व कॉम्प्लेक्स', icon: '🏢' },
  { id: 'service_center', nameEn: 'Service Center & Workshop', nameHi: '⚙️ सर्विस सेंटर व वर्कशॉप', icon: '⚙️' },
  { id: 'mart', nameEn: 'SuperMarket & Grocery Mart', nameHi: '🛒 सुपरमार्केट व ग्रॉसरी मार्ट', icon: '🛒' },
  { id: 'restaurant', nameEn: 'Restaurant, Cafe & Hotel', nameHi: '🍽️ रेस्टोरेंट, कैफे व होटल', icon: '🍽️' },
  { id: 'pharmacy', nameEn: 'Hospital, Clinic & Pharmacy', nameHi: '💊 अस्पताल, क्लिनिक व फार्मेसी', icon: '💊' },
  { id: 'coaching', nameEn: 'Educational Coaching & Academy', nameHi: '🎓 कोचिंग व अकादमी', icon: '🎓' },
  { id: 'other', nameEn: 'Other Business / Venue', nameHi: '📍 अन्य बिज़नेस व वेन्यू', icon: '📍' },
];

const INITIAL_SAMPLE_SHOPS: RegisteredShop[] = [
  {
    id: 'sample_shop_1',
    name: 'Shree Ram Departmental Store & SuperMart',
    type: 'mart',
    categoryLabel: '🛒 सुपरमार्केट व ग्रॉसरी मार्ट',
    ownerName: 'Ramesh Patel',
    phone: '9876543210',
    area: 'Main Market Area',
    address: 'Shop #12, Near Central Bus Station',
    description: 'All grocery, household items & daily needs. Flat 10% off on monthly ration!',
    rating: 4.9,
    reviewCount: 48,
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample_shop_2',
    name: 'Apex Mobile & Electronics Showroom',
    type: 'showroom',
    categoryLabel: '🏬 शोरूम व ब्रांड आउटलेट',
    ownerName: 'Sanjay Sharma',
    phone: '9825012345',
    area: 'Station Road Market',
    address: 'Plot 45, Opp. City Bank',
    description: 'Latest smartphones, AC, TV, Fridge & Appliances with easy EMI options.',
    rating: 4.8,
    reviewCount: 36,
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample_shop_3',
    name: 'Modern Hardware & Plumbing Tools',
    type: 'shop',
    categoryLabel: '🏪 दुकान / रिटेल स्टोर',
    ownerName: 'Mahesh Verma',
    phone: '9909011223',
    area: 'Industrial Area',
    address: 'Shed 8, Main Highway Corner',
    description: 'Complete plumbing pipes, taps, sanitaryware, electric switches & wiring.',
    rating: 4.9,
    reviewCount: 52,
    isVerified: true,
    createdAt: new Date().toISOString()
  }
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

  // Identity Verification & Document Upload States
  const [idDocumentWatermarked, setIdDocumentWatermarked] = useState<string | null>(null);
  const [idDocumentType, setIdDocumentType] = useState('Trade License / MSME / Owner ID');
  const [isWatermarkingId, setIsWatermarkingId] = useState(false);
  const [idUploadNotice, setIdUploadNotice] = useState<string | null>(null);

  const [registeredShopsList, setRegisteredShopsList] = useState<RegisteredShop[]>(INITIAL_SAMPLE_SHOPS);

  // Load registered shops from localStorage & Cloud Firestore
  useEffect(() => {
    if (!isOpen) return;

    try {
      const stored = localStorage.getItem('locohelp_registered_shops');
      if (stored) {
        const parsed: RegisteredShop[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge user registered shops with samples deduplicated
          const merged = [...parsed, ...INITIAL_SAMPLE_SHOPS.filter(s => !parsed.some(p => p.id === s.id))];
          setRegisteredShopsList(merged);
        }
      }
    } catch (e) {}

    // PostgreSQL backend fetch
    getShops().then((cloudShops) => {
      if (cloudShops && cloudShops.length > 0) {
        setRegisteredShopsList(prev => {
          const combined = [...cloudShops, ...prev];
          const uniqueMap = new Map<string, RegisteredShop>();
          combined.forEach(s => uniqueMap.set(s.id, s));
          return Array.from(uniqueMap.values());
        });
      }
    }).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

    setIsWatermarkingId(true);
    setIdUploadNotice(null);

    try {
      const watermarked = await applyIdWatermark(file, {
        entityType: 'business',
        userName: shopName.trim() || ownerName.trim() || 'Business Owner',
        customText: 'FOR LOCOHELP VERIFICATION ONLY • DO NOT REUSE • BUSINESS ID'
      });
      setIdDocumentWatermarked(watermarked);
      setIdUploadNotice(language === 'EN' ? 'ID photo successfully watermarked with security stamp!' : 'पहचान पत्र पर सुरक्षा वाटरमार्क लगा दिया गया है!');
    } catch (err: any) {
      console.warn("Watermark error:", err);
      setIdUploadNotice(language === 'EN' ? 'Could not process document image.' : 'दस्तावेज़ इमेज प्रोसेस नहीं हो सकी।');
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

    const typeObj = SHOP_TYPES.find(t => t.id === shopType);
    const label = shopType === 'other' && customType.trim()
      ? customType.trim()
      : (typeObj ? (language === 'EN' ? typeObj.nameEn : typeObj.nameHi) : 'Local Business');

    const shopId = 'shop_' + Date.now().toString(36);
    const hasVerificationDoc = !!idDocumentWatermarked;

    const newShop: RegisteredShop = {
      id: shopId,
      name: shopName.trim(),
      type: shopType as any,
      categoryLabel: label,
      ownerName: ownerName.trim() || 'Owner',
      phone: phone.trim(),
      area: area.trim() || 'Local Area',
      address: address.trim() || 'Market Area',
      description: description.trim() || 'Welcome to our business!',
      photoUrl: photoUrl || undefined,
      rating: 5.0,
      reviewCount: 1,
      isVerified: !hasVerificationDoc, // If doc submitted, it goes into pending admin approval queue
      createdAt: new Date().toISOString()
    };

    // Save locally
    try {
      const existingStr = localStorage.getItem('locohelp_registered_shops');
      const existingShops: RegisteredShop[] = existingStr ? JSON.parse(existingStr) : [];
      const updatedShops = [newShop, ...existingShops];
      localStorage.setItem('locohelp_registered_shops', JSON.stringify(updatedShops));
      setRegisteredShopsList(updatedShops);
    } catch (e) {}

    // Save to PostgreSQL businesses table
    try {
      await saveShop(newShop);
    } catch (err) {
      console.warn("Shop backend save notice:", err);
    }

    // Submit Verification Request to Admin Queue if ID document was provided
    if (hasVerificationDoc && idDocumentWatermarked) {
      try {
        await submitVerification({
          entityType: 'business',
          entityId: shopId,
          userId: ownerName.trim() || shopName.trim(),
          userName: shopName.trim(),
          userPhone: phone.trim(),
          title: `${shopName.trim()} (${ownerName.trim()}) - ${idDocumentType}`,
          idDocumentWatermarked
        });
      } catch (verifErr) {
        console.warn("Verification submit error:", verifErr);
      }
    }

    setIsSubmitting(false);

    // Reset Form
    setShopName('');
    setOwnerName('');
    setPhone('');
    setArea('');
    setAddress('');
    setDescription('');
    setPhotoUrl(null);
    setIdDocumentWatermarked(null);

    // Switch to registered list tab so user sees their new shop immediately
    setActiveTab('registered');

    if (onSuccess) {
      onSuccess(newShop);
    }
  };

  const filteredShops = registeredShopsList.filter(s => {
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
                  ? 'Want to register your shop for 100% Free? Go to Profile (Top Right) → "Business Reg." tab.'
                  : 'अपनी दुकान 100% फ्री में लिस्ट करने के लिए ऊपर Profile पर जाएं → "Business Reg." टैब चुनें।'}
              </p>
            </div>
            <span className="text-[10px] bg-amber-500 text-white font-black px-2 py-0.5 rounded-full uppercase shrink-0">
              100% Free
            </span>
          </div>

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
                      {language === 'EN' ? 'No registered businesses found.' : 'कोई रजिस्टर्ड बिज़नेस नहीं मिला।'}
                    </p>
                    <button
                      onClick={() => setActiveTab('new')}
                      className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors"
                    >
                      + {language === 'EN' ? 'Register First Shop' : 'अपनी दुकान पहली बार जोड़ें'}
                    </button>
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

                        <button
                          onClick={() => handleWhatsAppContact(shop)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Contact owner on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp Contact</span>
                        </button>
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
