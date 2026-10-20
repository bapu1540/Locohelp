import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, User, Camera, MapPin, Briefcase, Award, CheckCircle2, Star, Wrench, 
  ChevronRight, Trash2, Store, Mail, CloudCheck, Sparkles, ShieldCheck, Lock, 
  FileCheck2, ShieldAlert, Check, Building2, Phone, Tag, Upload, AlertCircle, Plus, Search, ExternalLink
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { 
  getCurrentUser, saveUserProfile, getUserProfile, deleteUserProfile, 
  logoutUser, saveHelper, saveShop, getShops 
} from '../auth';
import { isGuestUser } from '../lib/authUtils';
import IdentityVerificationModal from '../components/IdentityVerificationModal';
import { getVerificationStatus, submitVerification } from '../api';
import { CATEGORIES, getCategoryName, saveFreeHelperProfile, FreeHelperProfile } from '../data/categories';
import { RegisteredShop, SHOP_TYPES } from '../components/RegisterShopModal';
import { applyIdWatermark } from '../lib/watermark';
import { Screen } from '../types';

interface ProfileScreenProps {
  onBack: () => void;
  onNavigate?: (screen: Screen) => void;
  initialTab?: 'user' | 'helper' | 'business';
}

export default function ProfileScreen({ onBack, onNavigate, initialTab = 'user' }: ProfileScreenProps) {
  const { language, t } = useLanguage();
  
  // Tab State: 'user' (Simple Profile) | 'helper' (Helper Profile) | 'business' (Business Registration)
  const [activeTab, setActiveTab] = useState<'user' | 'helper' | 'business'>(initialTab);

  // -------------------------------------------------------------
  // TAB 1: SIMPLE USER PROFILE STATES
  // -------------------------------------------------------------
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState(() => {
    try {
      const activeUser = getCurrentUser();
      return activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '';
    } catch (e) {
      return '';
    }
  });
  const [userPhone, setUserPhone] = useState('');
  const [userSkills, setUserSkills] = useState('');
  const [userExp, setUserExp] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // TAB 2: HELPER PROFILE FORM STATES
  // -------------------------------------------------------------
  const [helperName, setHelperName] = useState('');
  const [helperCategory, setHelperCategory] = useState('plumber');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [helperPhone, setHelperPhone] = useState('');
  const [helperArea, setHelperArea] = useState('');
  const [helperExp, setHelperExp] = useState('1 Year');
  const [helperSkills, setHelperSkills] = useState('');
  const [helperIdFrontDoc, setHelperIdFrontDoc] = useState<string | null>(null);
  const [helperIdFrontName, setHelperIdFrontName] = useState<string | null>(null);
  const [helperIdBackDoc, setHelperIdBackDoc] = useState<string | null>(null);
  const [helperIdBackName, setHelperIdBackName] = useState<string | null>(null);
  const [isSubmittingHelper, setIsSubmittingHelper] = useState(false);
  const [showApprovalNoticeModal, setShowApprovalNoticeModal] = useState(false);
  const [myHelperProfile, setMyHelperProfile] = useState<any>(null);

  // -------------------------------------------------------------
  // TAB 3: BUSINESS REGISTRATION FORM & LIST STATES
  // -------------------------------------------------------------
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('shop');
  const [customShopType, setCustomShopType] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopArea, setShopArea] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [shopPhoto, setShopPhoto] = useState<string | null>(null);
  const [shopIdDoc, setShopIdDoc] = useState<string | null>(null);
  const [shopIdDocName, setShopIdDocName] = useState<string | null>(null);
  const [isWatermarkingShopId, setIsWatermarkingShopId] = useState(false);
  const [isSubmittingShop, setIsSubmittingShop] = useState(false);
  const [shopSubmitSuccess, setShopSubmitSuccess] = useState(false);
  const [registeredShopsList, setRegisteredShopsList] = useState<RegisteredShop[]>([]);
  const [shopSearchQuery, setShopSearchQuery] = useState('');

  // -------------------------------------------------------------
  // INITIAL DATA LOADING
  // -------------------------------------------------------------
  useEffect(() => {
    const activeUser = getCurrentUser();
    const phoneFromUser = activeUser?.phone || (activeUser?.uid?.startsWith('phone_') ? activeUser.uid.replace('phone_', '') : '');
    const userKey = activeUser?.uid || (phoneFromUser ? `phone_${phoneFromUser}` : 'guest');

    if (phoneFromUser) {
      setUserPhone(phoneFromUser);
      setHelperPhone(phoneFromUser);
      setShopPhone(phoneFromUser);
    }

    if (activeUser?.displayName) {
      setUserName(activeUser.displayName);
      setHelperName(activeUser.displayName);
      setOwnerName(activeUser.displayName);
    }

    if (activeUser?.email) {
      setUserEmail(activeUser.email);
    }

    // Load cached profile
    try {
      const userScopedRaw = localStorage.getItem(`locohelp_user_profile_${userKey}`);
      if (userScopedRaw) {
        const userScoped = JSON.parse(userScopedRaw);
        if (userScoped.name || userScoped.full_name) setUserName(userScoped.name || userScoped.full_name);
        if (userScoped.phone) setUserPhone(userScoped.phone);
        if (userScoped.email) setUserEmail(userScoped.email);
        if (userScoped.skills) setUserSkills(userScoped.skills);
        if (userScoped.exp || userScoped.experience) setUserExp(userScoped.exp || userScoped.experience);
        if (userScoped.address) {
          setUserAddress(userScoped.address);
          setHelperArea(userScoped.address);
          setShopArea(userScoped.address);
        }
        if (userScoped.profilePhoto || userScoped.avatar_url) setProfilePhoto(userScoped.profilePhoto || userScoped.avatar_url);
        if (userScoped.myHelperProfile) setMyHelperProfile(userScoped.myHelperProfile);
      } else {
        const savedName = localStorage.getItem('locohelp_profile_name');
        if (savedName) setUserName(savedName);
        const savedSkills = localStorage.getItem('locohelp_profile_skills');
        if (savedSkills) setUserSkills(savedSkills);
        const savedAddress = localStorage.getItem('locohelp_profile_address');
        if (savedAddress) setUserAddress(savedAddress);
        const savedExp = localStorage.getItem('locohelp_profile_exp');
        if (savedExp) setUserExp(savedExp);
        const savedPhoto = localStorage.getItem('locohelp_profile_photo');
        if (savedPhoto) setProfilePhoto(savedPhoto);

        const helperData = localStorage.getItem('locohelp_my_helper_profile');
        if (helperData) setMyHelperProfile(JSON.parse(helperData));
      }
    } catch (e) {}

    // Cloud profile load
    const loadProfile = async () => {
      try {
        if (!userKey || userKey === 'guest') return;
        const data = await getUserProfile(userKey);
        if (data) {
          if (data.full_name || data.name) setUserName(data.full_name || data.name);
          if (data.phone) setUserPhone(data.phone);
          if (data.email) setUserEmail(data.email);
          if (data.skills) setUserSkills(data.skills);
          if (data.address) setUserAddress(data.address);
          if (data.experience || data.exp) setUserExp(data.experience || data.exp);
          if (data.avatar_url || data.profilePhoto) setProfilePhoto(data.avatar_url || data.profilePhoto);
          if (data.myHelperProfile) setMyHelperProfile(data.myHelperProfile);

          localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(data));
        }
      } catch (err) {
        console.warn("Profile sync notice:", err);
      }
    };
    loadProfile();

    // Check Verification Status
    if (userKey && userKey !== 'guest') {
      getVerificationStatus(userKey).then(res => {
        if (res.isVerified) setVerificationStatus('approved');
        else if (res.status === 'pending') setVerificationStatus('pending');
        else if (res.status === 'rejected') setVerificationStatus('rejected');
      }).catch(() => {});
    }

    // Load registered shops
    loadShops();
  }, []);

  const loadShops = () => {
    try {
      const stored = localStorage.getItem('locohelp_registered_shops');
      const userShops: RegisteredShop[] = stored ? JSON.parse(stored) : [];
      setRegisteredShopsList(userShops);
    } catch (e) {}

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
  };

  // -------------------------------------------------------------
  // TAB 1 ACTIONS: SAVE SIMPLE PROFILE & PHOTO
  // -------------------------------------------------------------
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setProfilePhoto(base64String);

        const activeUser = getCurrentUser();
        const phoneFromUser = userPhone.replace(/\D/g, '') || activeUser?.phone || '';
        const userKey = activeUser?.uid || (phoneFromUser ? `phone_${phoneFromUser}` : 'guest');

        try {
          localStorage.setItem('locohelp_profile_photo', base64String);
          const userScopedRaw = localStorage.getItem(`locohelp_user_profile_${userKey}`);
          const userScoped = userScopedRaw ? JSON.parse(userScopedRaw) : {};
          userScoped.profilePhoto = base64String;
          localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(userScoped));
        } catch (e) {}

        try {
          if (userKey && userKey !== 'guest') {
            await saveUserProfile({ uid: userKey, avatar_url: base64String });
          }
        } catch (err) {}
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSimpleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeUser = getCurrentUser();
    const cleanPhone = userPhone.replace(/\D/g, '') || activeUser?.phone || '';
    const userKey = activeUser?.uid || (cleanPhone ? `phone_${cleanPhone}` : 'guest');

    const profileData = {
      uid: userKey,
      full_name: userName || (cleanPhone ? `User ${cleanPhone.slice(-4)}` : 'Community User'),
      email: userEmail || activeUser?.email || '',
      phone: userPhone || cleanPhone,
      skills: userSkills,
      address: userAddress,
      experience: userExp,
      avatar_url: profilePhoto,
      myHelperProfile,
      updated_at: new Date().toISOString()
    };

    try {
      localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(profileData));
      localStorage.setItem('locohelp_profile_name', userName);
      localStorage.setItem('locohelp_profile_skills', userSkills);
      localStorage.setItem('locohelp_profile_address', userAddress);
      localStorage.setItem('locohelp_profile_exp', userExp);
      if (profileData.email) localStorage.setItem('locohelp_last_logged_in_email', profileData.email);
      if (profilePhoto) localStorage.setItem('locohelp_profile_photo', profilePhoto);

      const current = getCurrentUser();
      localStorage.setItem('locohelp_user', JSON.stringify({
        ...current,
        uid: userKey,
        displayName: userName || current?.displayName,
        email: profileData.email || current?.email,
        phone: userPhone || current?.phone
      }));
    } catch (e) {}

    try {
      await saveUserProfile(profileData);
    } catch (err) {}

    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  // -------------------------------------------------------------
  // TAB 2 ACTIONS: SUBMIT HELPER PROFILE
  // -------------------------------------------------------------
  const handleSaveHelperProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helperName.trim() || !helperPhone.trim()) return;

    setIsSubmittingHelper(true);

    const matchedCat = CATEGORIES.find(c => c.id === helperCategory);
    const finalCatName = helperCategory === 'other' && customCategoryName.trim() 
      ? customCategoryName.trim() 
      : (matchedCat ? matchedCat.nameEn : 'General Helper');

    const skillsList = helperSkills.trim() 
      ? helperSkills.split(',').map(s => s.trim()) 
      : [finalCatName];

    const finalDoc = helperIdFrontDoc || helperIdBackDoc;

    const newHelper = saveFreeHelperProfile({
      name: helperName.trim(),
      categoryId: helperCategory,
      phone: helperPhone.trim(),
      skills: skillsList,
      area: helperArea.trim() || 'Local Area',
      experience: helperExp.trim() || '1 Year',
      distance: 0.5,
      govtIdUploaded: Boolean(finalDoc),
      idDocUrl: finalDoc || undefined,
      isVerified: false, // Requires Admin Approval
    });

    setMyHelperProfile(newHelper);

    try {
      localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(newHelper));
    } catch (e) {}

    try {
      const helperId = newHelper.id || `helper_${Date.now()}`;
      await saveHelper({ ...newHelper, id: helperId, isVerified: false });
    } catch (e) {}

    if (finalDoc) {
      try {
        await submitVerification({
          entityType: 'user_profile',
          entityId: newHelper.id,
          userId: newHelper.id,
          userName: newHelper.name,
          userPhone: newHelper.phone,
          title: `Helper Profile (${finalCatName}) - Government ID Card`,
          idDocumentWatermarked: finalDoc
        });
        setVerificationStatus('pending');
      } catch (verifErr) {
        console.warn("Verification submit error:", verifErr);
      }
    }

    setIsSubmittingHelper(false);
    setShowApprovalNoticeModal(true);
  };

  // -------------------------------------------------------------
  // TAB 3 ACTIONS: REGISTER BUSINESS & VENUE
  // -------------------------------------------------------------
  const handleIdDocUploadShop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShopIdDocName(file.name);
    setIsWatermarkingShopId(true);

    try {
      if (file.type.startsWith('image/')) {
        const watermarked = await applyIdWatermark(file, {
          entityType: 'business',
          userName: shopName.trim() || ownerName.trim() || 'Business Owner',
          customText: 'FOR LOCOHELP VERIFICATION ONLY • DO NOT REUSE • BUSINESS ID'
        });
        setShopIdDoc(watermarked);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setShopIdDoc(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn("Watermark process note:", err);
    } finally {
      setIsWatermarkingShopId(false);
    }
  };

  const handleRegisterShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !shopPhone.trim()) return;

    setIsSubmittingShop(true);

    const typeObj = SHOP_TYPES.find(t => t.id === shopType);
    const label = shopType === 'other' && customShopType.trim()
      ? customShopType.trim()
      : (typeObj ? (language === 'EN' ? typeObj.nameEn : typeObj.nameHi) : 'Local Business');

    const shopId = 'shop_' + Date.now().toString(36);

    const newShop: RegisteredShop = {
      id: shopId,
      name: shopName.trim(),
      type: shopType as any,
      categoryLabel: label,
      ownerName: ownerName.trim() || 'Owner',
      phone: shopPhone.trim(),
      area: shopArea.trim() || 'Local Area',
      address: shopAddress.trim() || 'Market Area',
      description: shopDescription.trim() || 'Welcome to our business!',
      photoUrl: shopPhoto || undefined,
      rating: 5.0,
      reviewCount: 1,
      isVerified: false, // Requires Admin Approval
      createdAt: new Date().toISOString()
    };

    try {
      const existingStr = localStorage.getItem('locohelp_registered_shops');
      const existingShops: RegisteredShop[] = existingStr ? JSON.parse(existingStr) : [];
      const updatedShops = [newShop, ...existingShops];
      localStorage.setItem('locohelp_registered_shops', JSON.stringify(updatedShops));
      setRegisteredShopsList(updatedShops);
    } catch (e) {}

    try {
      await saveShop(newShop);
    } catch (err) {}

    if (shopIdDoc) {
      try {
        await submitVerification({
          entityType: 'business',
          entityId: shopId,
          userId: ownerName.trim() || shopName.trim(),
          userName: shopName.trim(),
          userPhone: shopPhone.trim(),
          title: `${shopName.trim()} (${ownerName.trim()}) - Government ID Card / Business License`,
          idDocumentWatermarked: shopIdDoc
        });
      } catch (verifErr) {}
    }

    setIsSubmittingShop(false);
    setShopSubmitSuccess(true);
    setTimeout(() => setShopSubmitSuccess(false), 4000);

    // Reset Form
    setShopName('');
    setShopDescription('');
    setShopPhoto(null);
    setShopIdDoc(null);
    setShopIdDocName(null);
  };

  const handleWhatsAppContact = (shop: RegisteredShop) => {
    const cleanPhone = shop.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = encodeURIComponent(
      `Namaste ${shop.ownerName || shop.name}! 🙏 LocoHelp App par aapki dukan/business list dekh kar contact kar raha hoon.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
  };

  const filteredShops = registeredShopsList.filter(s => {
    if (!shopSearchQuery.trim()) return true;
    const q = shopSearchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || 
           s.categoryLabel.toLowerCase().includes(q) || 
           s.area.toLowerCase().includes(q) ||
           s.description.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-slate-900 relative overflow-hidden transition-colors">
      
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between px-4 py-3.5 pt-10 sm:pt-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-20 shadow-xs">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-700 dark:text-slate-200"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Profile Hub / प्रोफाइल हब
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Manage Account, Helper Listing & Business Registration</p>
          </div>
        </div>
      </div>

      {/* 3 CORE TABS SELECTOR STRIP */}
      <div className="bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-3 py-2 sticky top-[60px] z-10 shadow-xs">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
          <button
            onClick={() => setActiveTab('user')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'user'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Simple Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('helper')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'helper'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Helper Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('business')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'business'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Business Reg.</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-4 pb-28 space-y-4">

        {/* ============================================================== */}
        {/* TAB 1: SIMPLE USER PROFILE                                     */}
        {/* ============================================================== */}
        {activeTab === 'user' && (
          <div className="space-y-4">
            


            {/* Profile Card Header */}
            <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col text-left min-w-0 pr-2">
                  <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {userName || "Community Member"}
                  </h1>
                  
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {userPhone ? `+91 ${userPhone}` : "No phone added"}
                  </p>

                  {/* Registered Email Address Always Visible */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg shadow-2xs max-w-full">
                    <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 truncate">
                      {userEmail || 'chauhansanjay932@gmail.com'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-3.5 h-3.5 ${star <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700 fill-slate-200'}`} />
                    ))}
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white ml-1">4.8 / 5.0</span>
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="relative shrink-0">
                  <div className="w-18 h-18 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center relative overflow-hidden border-2 border-indigo-500/80 shadow-md">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                    <div 
                      onClick={() => fileInputRef.current?.click()} 
                      className="absolute inset-x-0 bottom-0 bg-black/50 hover:bg-black/70 h-5 flex items-center justify-center cursor-pointer transition-colors"
                      title="Upload Photo"
                    >
                      <Camera className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>
            </div>

            {/* Identity Verification Status Card */}
            <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
                    verificationStatus === 'approved' ? 'bg-emerald-600' : verificationStatus === 'pending' ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}>
                    {verificationStatus === 'approved' ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white">Identity Verification & Safety</h3>
                      {verificationStatus === 'approved' && (
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified 🛡️
                        </span>
                      )}
                      {verificationStatus === 'pending' && (
                        <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 animate-spin" /> In Review
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                      {verificationStatus === 'approved'
                        ? 'Government ID verified by LocoHelp Admin'
                        : verificationStatus === 'pending'
                        ? 'ID submitted with auto-watermark • Awaiting Admin approval'
                        : 'Upload ID for green Verified badge (Admin-only private view)'}
                    </p>
                  </div>
                </div>

                {verificationStatus !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => setIsVerificationModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold px-3 py-2 rounded-xl shadow-sm cursor-pointer shrink-0"
                  >
                    {verificationStatus === 'pending' ? 'View Status' : 'Get Verified'}
                  </button>
                )}
              </div>
            </div>

            {/* Simple Profile Edit Form */}
            <form onSubmit={handleSaveSimpleProfile} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Edit Personal Details</h3>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Your Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    required
                    value={userName} 
                    onChange={(e) => setUserName(e.target.value)} 
                    placeholder="e.g. Ramesh Kumar" 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Mobile Number *</label>
                <div className="relative">
                  <span className="text-slate-400 font-bold absolute left-3 top-1/2 -translate-y-1/2 text-xs">+91</span>
                  <input 
                    type="tel" 
                    required
                    value={userPhone} 
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Registered Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="email" 
                    required
                    value={userEmail} 
                    onChange={(e) => setUserEmail(e.target.value)} 
                    placeholder="your.email@gmail.com" 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Area / Locality</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={userAddress} 
                    onChange={(e) => setUserAddress(e.target.value)} 
                    placeholder="e.g. Main Market, Navrangpura" 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer mt-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavedNotice ? 'Profile Saved Successfully!' : 'Save Personal Details'}</span>
              </button>
            </form>

            {/* Danger Zone: Delete Account */}
            <div className="pt-2 text-center">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
              >
                Delete Account & Purge Data
              </button>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: HELPER PROFILE REGISTRATION & MANAGEMENT               */}
        {/* ============================================================== */}
        {activeTab === 'helper' && (
          <div className="space-y-4">
            
            {/* Status Notification for existing Helper Profile */}
            {myHelperProfile && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                    Your Helper Profile: {myHelperProfile.name}
                  </h4>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">
                    Category: {myHelperProfile.categoryId} • {myHelperProfile.area}
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                    {myHelperProfile.isVerified 
                      ? "🛡️ Verified Badge Active — Your profile is live in 'Browse Local Helpers' on the main page!"
                      : "⏳ Pending Admin Approval — Submitted to queue. Once Admin approves, it will appear under your category on the main page."}
                  </p>
                </div>
              </div>
            )}

            {/* Helper Registration / Update Form */}
            <form onSubmit={handleSaveHelperProfile} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Helper Profile Registration</span>
                    <span className="text-[9px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full uppercase">100% Free</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">List your skills (Plumber, Electrician, Tutor) in local neighborhood categories</p>
                </div>
              </div>

              {/* 1. Your Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Your Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={helperName}
                  onChange={(e) => setHelperName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* 2. Work Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Work Category *
                </label>
                <select 
                  value={helperCategory}
                  onChange={(e) => setHelperCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {getCategoryName(c, language)} ({c.nameEn})
                    </option>
                  ))}
                </select>

                {helperCategory === 'other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      placeholder="Enter Custom Work Category / Hospital Name *"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full bg-emerald-50/60 dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 3. Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <span className="text-slate-400 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-xs">+91</span>
                  <input 
                    type="tel" 
                    required
                    placeholder="98765 43210"
                    value={helperPhone}
                    onChange={(e) => setHelperPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Area / Locality */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Area / Locality *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Main Market, Sector 15"
                  value={helperArea}
                  onChange={(e) => setHelperArea(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* 5. Experience */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Experience *
                </label>
                <select 
                  value={helperExp}
                  onChange={(e) => setHelperExp(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                >
                  <option value="6 Months">6 Months</option>
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="3-5 Years">3 - 5 Years</option>
                  <option value="5-10 Years">5 - 10 Years</option>
                  <option value="10+ Years">10+ Years</option>
                </select>
              </div>

              {/* 6. Skills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Skills / Specialties
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Pipe fitting, Tap repair, Water tank cleaning"
                  value={helperSkills}
                  onChange={(e) => setHelperSkills(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* 7. Verify Government ID Card (JPG, PNG or PDF Supported) Dual Upload */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Government ID Card (JPG, PNG or PDF Supported)
                </label>
                <p className="text-[10px] text-slate-500 font-medium -mt-1">
                  Upload Front & Back Side of your Government ID Card, or a PDF file.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Front Side Upload */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Front Side ID (सामने का भाग)
                    </span>
                    <input 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setHelperIdFrontName(file.name);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setHelperIdFrontDoc(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 cursor-pointer"
                    />
                    {helperIdFrontName && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> Front: {helperIdFrontName}
                      </p>
                    )}
                  </div>

                  {/* Back Side Upload */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Back Side ID (पीछे का भाग)
                    </span>
                    <input 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setHelperIdBackName(file.name);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setHelperIdBackDoc(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 cursor-pointer"
                    />
                    {helperIdBackName && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> Back: {helperIdBackName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmittingHelper}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Helper Profile</span>
              </button>

            </form>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: BUSINESS & VENUE REGISTRATION & LIST                    */}
        {/* ============================================================== */}
        {activeTab === 'business' && (
          <div className="space-y-4">

            {/* Business Registration Form */}
            <form onSubmit={handleRegisterShop} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Business / Shop Registration</span>
                    <span className="text-[9px] bg-amber-500 text-white font-black px-2 py-0.5 rounded-full uppercase">100% Free</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">List your Shop, Showroom, Hospital, Bakery or Venue on neighborhood radar</p>
                </div>
              </div>

              {/* 1. Shop Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business / Shop Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Apex Mobile Showroom / City Hospital"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* 2. Shop Category / Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business Type / Category *
                </label>
                <select 
                  value={shopType}
                  onChange={(e) => setShopType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {SHOP_TYPES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {language === 'EN' ? t.nameEn : t.nameHi}
                    </option>
                  ))}
                </select>

                {shopType === 'other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      placeholder="Enter Custom Business Type / Venue Name *"
                      value={customShopType}
                      onChange={(e) => setCustomShopType(e.target.value)}
                      className="w-full bg-amber-50/60 dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-600 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 3. Owner Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Owner / Manager Name
                </label>
                <input 
                  type="text" 
                  placeholder="Owner Name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* 4. Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact / WhatsApp Number *
                </label>
                <div className="relative">
                  <span className="text-slate-400 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-xs">+91</span>
                  <input 
                    type="tel" 
                    required
                    placeholder="98765 43210"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 5. Area / Locality */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Area / Locality *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Main Market, Near Bus Station"
                  value={shopArea}
                  onChange={(e) => setShopArea(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* 6. Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Shop Address / Landmark
                </label>
                <input 
                  type="text" 
                  placeholder="Shop #12, Ground Floor"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* 7. Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Offers / Timings
                </label>
                <textarea 
                  rows={2}
                  placeholder="All mobile accessories available. Flat 10% discount on all purchases!"
                  value={shopDescription}
                  onChange={(e) => setShopDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>

              {/* 8. Shop / Mall / Venue Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Shop / Mall / Venue Photo (दुकान/मॉल की फ़ोटो)
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setShopPhoto(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-950 dark:file:text-amber-300 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                />
                {shopPhoto && (
                  <div className="mt-2 relative w-28 h-20 rounded-xl overflow-hidden border-2 border-amber-400 shadow-xs">
                    <img src={shopPhoto} alt="Shop Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setShopPhoto(null)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer"
                      title="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* 9. Government ID / License Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Government ID / Trade License (JPG, PNG or PDF)
                </label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={handleIdDocUploadShop}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-950 dark:file:text-amber-300 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                />
                {shopIdDocName && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ID Document Watermarked: {shopIdDocName}
                  </p>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isSubmittingShop}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
              >
                <Store className="w-4 h-4" />
                <span>{shopSubmitSuccess ? 'Business Registered Successfully!' : 'Register Business / Venue'}</span>
              </button>

            </form>

            {/* List View of All Registered Local Businesses */}
            <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🏪 Registered Local Businesses ({filteredShops.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Shops, Showrooms, Malls & Venues in neighborhood</p>
                </div>
              </div>

              {/* Search input for registered shops */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={shopSearchQuery}
                  onChange={(e) => setShopSearchQuery(e.target.value)}
                  placeholder="Search registered business by name, area or item..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-1">
                {filteredShops.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No registered businesses found matching search.</p>
                ) : (
                  filteredShops.map((shop) => (
                    <div 
                      key={shop.id}
                      className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start justify-between gap-2"
                    >
                      {shop.photoUrl && (
                        <img src={shop.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                      )}
                      <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {shop.name}
                          </span>
                          {shop.isVerified && (
                            <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.2 rounded-full">🛡️ Verified</span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{shop.categoryLabel}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{shop.area} • {shop.address}</span>
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 pt-0.5">{shop.description}</p>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleWhatsAppContact(shop)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Phone className="w-3 h-3" /> WhatsApp
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Helper Profile Approval Confirmation Notice Popup Modal */}
      {showApprovalNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-4 relative z-50">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl shadow-inner">
              ⏳
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {language === 'EN' ? 'Profile Submitted for Admin Approval!' : 'प्रोफाइल एडमिन अप्रूवल के लिए सबमिट हो गई!'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-medium">
                {language === 'EN' 
                  ? 'Your Helper Profile has been recorded successfully. For community trust & verification, your details have been sent to Admin for approval. Once approved, your profile will be live with the Verified Badge (🛡️) on the main page under your category.'
                  : 'आपकी हेल्प प्रोफाइल सफलतापूर्वक दर्ज हो गई है। सुरक्षा और वेरिफिकेशन के लिए आपकी प्रोफाइल एडमिन के पास अप्रूवल के लिए भेज दी गई है। एडमिन द्वारा अप्रूव करते ही आपकी प्रोफाइल Verified Badge (🛡️) के साथ मेन पेज पर आपकी केटेगरी के अंदर लाइव हो जाएगी।'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowApprovalNoticeModal(false)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {language === 'EN' ? 'Okay, Understood' : 'ठीक है, समझ गया'}
            </button>
          </div>
        </div>
      )}

      {/* Identity Verification Modal */}
      <IdentityVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        entityType="user_profile"
        entityId={getCurrentUser().uid}
        entityName={userName}
        onVerificationSubmitted={() => {
          setVerificationStatus('pending');
        }}
      />

      {/* Delete Profile Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center text-2xl shadow-inner">
              {isDeleting ? '⏳' : '🗑️'}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Account & Purge Profile</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This will permanently delete your saved profile and logout your session.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    const activeUser = getCurrentUser();
                    const cleanPhone = (userPhone || '').replace(/\D/g, '') || activeUser?.phone || '';
                    const userKey = activeUser?.uid || (cleanPhone ? `phone_${cleanPhone}` : 'guest');

                    if (userKey && userKey !== 'guest_user') {
                      try {
                        await deleteUserProfile(userKey);
                      } catch (err) {}
                    }

                    await logoutUser();
                    window.location.href = window.location.origin;
                  } catch (err) {
                    window.location.reload();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-70"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
