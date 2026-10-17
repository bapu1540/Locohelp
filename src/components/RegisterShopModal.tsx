import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Building, Building2, ShoppingBag, X, Check, Camera, MapPin, Phone, Tag, ShieldCheck, Plus, Search, MessageSquare, Star, ExternalLink, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n';
import { supabase } from '../supabase';

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

    // Supabase background fetch
    Promise.resolve(supabase.from("shops").select("*")).then(({ data }) => {
      if (data && data.length > 0) {
        const cloudShops: RegisteredShop[] = data as RegisteredShop[];
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

    const newShop: RegisteredShop = {
      id: 'shop_' + Date.now().toString(36),
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
      isVerified: true,
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

    // Save to Supabase background
    try {
      await supabase.from("shops").upsert(newShop);
    } catch (err) {
      console.warn("Shop cloud save notice:", err);
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
                  <span>{language === 'EN' ? 'Business & Venue Hub' : 'बिज़नेस व वेन्यू हब'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'EN' 
                    ? 'Explore registered businesses or register your new shop & venue' 
                    : 'रजिस्टर्ड बिज़नेस की सूची देखें या अपनी नई दुकान पंजीकृत करें'}
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

          {/* 2 Main Tabs: Registered Businesses & Register New */}
          <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 shrink-0 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('registered')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'registered'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Store className="w-4 h-4 text-amber-500" />
              <span>{language === 'EN' ? 'Registered Businesses' : 'पुराने रजिस्टर्ड बिज़नेस'}</span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                {registeredShopsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('new')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'EN' ? 'Register New' : '+ नया बिज़नेस जोड़ें'}</span>
            </button>
          </div>

          {/* TAB 1: REGISTERED BUSINESSES LIST */}
          {activeTab === 'registered' && (
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
          )}

          {/* TAB 2: REGISTER NEW BUSINESS FORM */}
          {activeTab === 'new' && (
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 pr-1">

              {/* Category / Venue Type Selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'EN' ? 'Category / Venue Type *' : 'कैटेगरी / वेन्यू का प्रकार (दुकान/शोरूम/मॉल/सर्विस सेंटर) *'}
                </label>
                <select
                  value={shopType}
                  onChange={(e) => setShopType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 cursor-pointer"
                >
                  {SHOP_TYPES.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.icon} {language === 'EN' ? st.nameEn : st.nameHi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Type if 'other' */}
              {shopType === 'other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Specify Custom Category Name' : 'अपने बिज़नेस/शोरूम की श्रेणी लिखें'}
                  </label>
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="e.g. Garment Factory, Hardware Mart, Auto Showroom"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                    required
                  />
                </div>
              )}

              {/* Shop / Showroom / Mall Name */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'EN' ? 'Shop / Showroom / Mall Name *' : 'दुकान / शोरूम / मॉल का नाम *'}
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Shree Ram Departmental Store, Vardhman Mall, Apex Electronics"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Owner Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Owner / Manager Name' : 'मालिक या मैनेजर का नाम'}
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Mobile / WhatsApp Number *' : 'मोबाइल या WhatsApp नंबर *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Area & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Area / Locality' : 'इलाका / मार्केट एरिया'}
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Main Market, Block B"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'EN' ? 'Full Address' : 'दुकान का पूरा पता'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop #12, Near Bus Stand"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Offers / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'EN' ? 'Offers, Discounts or Products Info' : 'ऑफर, सामान व डिस्काउंट की जानकारी'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. Flat 20% discount on all festive items. Free home delivery above ₹300."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'EN' ? 'Shop / Showroom Photo (Optional)' : 'दुकान/शोरूम/मॉल की फोटो (ऐच्छिक)'}
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-xl p-3 text-center cursor-pointer transition-colors">
                    <Camera className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {photoUrl ? "Photo Selected (Click to change)" : "Upload Photo / Take Picture"}
                    </span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {photoUrl && (
                    <img src={photoUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-amber-300" />
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Store className="w-4 h-4" />
                  <span>
                    {isSubmitting 
                      ? 'Registering...' 
                      : (language === 'EN' ? 'Publish Shop / Showroom Listing (100% Free)' : 'दुकान/शोरूम/मॉल पब्लिश करें (100% फ्री)')}
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
