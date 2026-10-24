import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, User, Camera, MapPin, Briefcase, Award, CheckCircle2, Star, Wrench, 
  ChevronRight, Trash2, Store, Mail, CloudCheck, Sparkles, ShieldCheck, Lock, 
  FileCheck2, ShieldAlert, Check, Building2, Phone, Tag, Upload, AlertCircle, Plus, Search, ExternalLink, Clock, Edit3
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { 
  getCurrentUser, saveUserProfile, getUserProfile, deleteUserProfile, 
  logoutUser, saveHelper, saveShop, getShops, getHelpers 
} from '../auth';
import { isGuestUser } from '../lib/authUtils';
import IdentityVerificationModal from '../components/IdentityVerificationModal';
import { getVerificationStatus, submitVerification } from '../api';
import { CATEGORIES, getCategoryName, saveFreeHelperProfile, getFreeHelperProfiles, FreeHelperProfile } from '../data/categories';
import { RegisteredShop, SHOP_TYPES } from '../components/RegisterShopModal';
import { applyIdWatermark } from '../lib/watermark';
import { validateUploadedFile, sanitizeText } from '../lib/security';
import { compressImageToWebP } from '../lib/imageCompression';
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
  const [hasExistingUserProfile, setHasExistingUserProfile] = useState(false);
  const [isEditingUserProfile, setIsEditingUserProfile] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected' | 'deletion_requested'>('none');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [closureSubmitted, setClosureSubmitted] = useState(false);
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
  const [helperWorkPhoto, setHelperWorkPhoto] = useState<string | null>(null);
  const [helperIdFrontDoc, setHelperIdFrontDoc] = useState<string | null>(null);
  const [helperIdFrontName, setHelperIdFrontName] = useState<string | null>(null);
  const [helperIdBackDoc, setHelperIdBackDoc] = useState<string | null>(null);
  const [helperIdBackName, setHelperIdBackName] = useState<string | null>(null);
  const [isSubmittingHelper, setIsSubmittingHelper] = useState(false);
  const [showApprovalNoticeModal, setShowApprovalNoticeModal] = useState(false);
  const [myHelperProfile, setMyHelperProfile] = useState<any>(null);
  const [isEditingHelperProfile, setIsEditingHelperProfile] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: BUSINESS REGISTRATION FORM & LIST STATES
  // -------------------------------------------------------------
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('shop');
  const [customShopType, setCustomShopType] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopTimings, setShopTimings] = useState('9:00 AM - 9:00 PM');
  const [shopArea, setShopArea] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [shopPhoto, setShopPhoto] = useState<string | null>(null);
  const [shopPhotos, setShopPhotos] = useState<string[]>([]);
  const [shopIdDoc, setShopIdDoc] = useState<string | null>(null);
  const [shopIdDocName, setShopIdDocName] = useState<string | null>(null);
  const [isWatermarkingShopId, setIsWatermarkingShopId] = useState(false);
  const [isSubmittingShop, setIsSubmittingShop] = useState(false);
  const [shopSubmitSuccess, setShopSubmitSuccess] = useState(false);
  const [myBusinessProfile, setMyBusinessProfile] = useState<RegisteredShop | null>(null);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [registeredShopsList, setRegisteredShopsList] = useState<RegisteredShop[]>([]);
  const [shopSearchQuery, setShopSearchQuery] = useState('');

  // Push history state when internal modals open
  useEffect(() => {
    if (showApprovalNoticeModal || isVerificationModalOpen || showDeleteConfirm) {
      try {
        window.history.pushState({ locohelpScreen: 'profile', locohelpModal: true }, '');
      } catch (e) {}
    }
  }, [showApprovalNoticeModal, isVerificationModalOpen, showDeleteConfirm]);

  // Listen for hardware Back button to close internal modals first
  useEffect(() => {
    const handleCloseModal = (e: Event) => {
      if (showApprovalNoticeModal) {
        e.preventDefault();
        setShowApprovalNoticeModal(false);
        return;
      }
      if (isVerificationModalOpen) {
        e.preventDefault();
        setIsVerificationModalOpen(false);
        return;
      }
      if (showDeleteConfirm) {
        e.preventDefault();
        setShowDeleteConfirm(false);
        return;
      }
    };
    window.addEventListener('locohelp_close_active_modal', handleCloseModal);
    return () => window.removeEventListener('locohelp_close_active_modal', handleCloseModal);
  }, [showApprovalNoticeModal, isVerificationModalOpen, showDeleteConfirm]);

  const populateHelperForm = (prof: any) => {
    if (!prof) return;
    if (prof.name) setHelperName(prof.name);
    if (prof.categoryId) setHelperCategory(prof.categoryId);
    if (prof.customCategoryName) setCustomCategoryName(prof.customCategoryName);
    if (prof.phone) setHelperPhone(prof.phone);
    if (prof.area) setHelperArea(prof.area);
    if (prof.experience) setHelperExp(prof.experience);
    if (prof.skills) {
      setHelperSkills(Array.isArray(prof.skills) ? prof.skills.join(', ') : String(prof.skills));
    }
  };

  // -------------------------------------------------------------
  // INITIAL DATA LOADING
  // -------------------------------------------------------------
  useEffect(() => {
    const activeUser = getCurrentUser();
    const phoneFromUser = activeUser?.phone || (activeUser?.uid?.startsWith('phone_') ? activeUser.uid.replace('phone_', '') : '');
    const userKey = activeUser?.uid || (phoneFromUser ? `phone_${phoneFromUser}` : 'guest');
    const cleanEmail = (activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();
    const cleanPhone = (phoneFromUser || '').replace(/\D/g, '');

    if (phoneFromUser) {
      setUserPhone(phoneFromUser);
      setHelperPhone(phoneFromUser);
      setShopPhone(phoneFromUser);
    }

    if (activeUser?.displayName && activeUser.displayName !== 'Guest') {
      setUserName(activeUser.displayName);
      setHelperName(activeUser.displayName);
      setOwnerName(activeUser.displayName);
    }

    if (cleanEmail) {
      setUserEmail(cleanEmail);
    }

    // Load cached profile & existing helper profile linked to user
    let foundHelper: any = null;
    try {
      const userScopedRaw = localStorage.getItem(`locohelp_user_profile_${userKey}`);
      if (userScopedRaw) {
        const userScoped = JSON.parse(userScopedRaw);
        const loadedName = userScoped.name || userScoped.full_name || '';
        if (loadedName) {
          setUserName(loadedName);
          setHasExistingUserProfile(true);
        }
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
        if (userScoped.myHelperProfile) {
          foundHelper = userScoped.myHelperProfile;
        }
      } else {
        const savedName = localStorage.getItem('locohelp_profile_name');
        if (savedName) {
          setUserName(savedName);
          setHasExistingUserProfile(true);
        }
        const savedSkills = localStorage.getItem('locohelp_profile_skills');
        if (savedSkills) setUserSkills(savedSkills);
        const savedAddress = localStorage.getItem('locohelp_profile_address');
        if (savedAddress) setUserAddress(savedAddress);
        const savedExp = localStorage.getItem('locohelp_profile_exp');
        if (savedExp) setUserExp(savedExp);
        const savedPhoto = localStorage.getItem('locohelp_profile_photo');
        if (savedPhoto) setProfilePhoto(savedPhoto);
      }

      if (!foundHelper) {
        const allLocalHelpers = getFreeHelperProfiles(true);
        foundHelper = allLocalHelpers.find(h =>
          (cleanEmail && (h.email || '').toLowerCase() === cleanEmail) ||
          (userKey && userKey !== 'guest' && h.userId === userKey) ||
          (cleanPhone && (h.phone || '').replace(/\D/g, '') === cleanPhone)
        ) || null;
      }

      if (!foundHelper) {
        const helperData = localStorage.getItem('locohelp_my_helper_profile');
        if (helperData) {
          const parsed = JSON.parse(helperData);
          if (parsed && parsed.name) {
            const pEmail = (parsed.email || '').toLowerCase();
            if (!pEmail || !cleanEmail || pEmail === cleanEmail) {
              foundHelper = parsed;
            }
          }
        }
      }

      if (foundHelper) {
        setMyHelperProfile(foundHelper);
        populateHelperForm(foundHelper);
        setHasExistingUserProfile(true);
      }
    } catch (e) {}

    // Cloud profile load
    const loadProfile = async () => {
      try {
        if (!userKey || userKey === 'guest') return;
        const data = await getUserProfile(userKey);
        if (data) {
          if (data.full_name || data.name) {
            setUserName(data.full_name || data.name);
            setHasExistingUserProfile(true);
          }
          if (data.phone) setUserPhone(data.phone);
          if (data.email) setUserEmail(data.email);
          if (data.skills) setUserSkills(data.skills);
          if (data.address) setUserAddress(data.address);
          if (data.experience || data.exp) setUserExp(data.experience || data.exp);
          if (data.avatar_url || data.profilePhoto) setProfilePhoto(data.avatar_url || data.profilePhoto);
          if (data.myHelperProfile) {
            setMyHelperProfile(data.myHelperProfile);
            populateHelperForm(data.myHelperProfile);
            setHasExistingUserProfile(true);
          }

          localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(data));
        }
      } catch (err) {
        console.warn("Profile sync notice:", err);
      }
    };
    loadProfile();

    // Sync Helper Profile from Server (including latest Admin approval status)
    getHelpers(true).then(serverHelpers => {
      if (Array.isArray(serverHelpers) && serverHelpers.length > 0) {
        const matched = serverHelpers.find((h: any) =>
          (foundHelper && h.id === foundHelper.id) ||
          (cleanEmail && (h.email || '').toLowerCase() === cleanEmail) ||
          (userKey && userKey !== 'guest' && h.userId === userKey) ||
          (cleanPhone && (h.phone || '').replace(/\D/g, '') === cleanPhone)
        );
        if (matched) {
          setMyHelperProfile(matched);
          populateHelperForm(matched);
          setHasExistingUserProfile(true);
          if (matched.isVerified || matched.status === 'approved') {
            setVerificationStatus('approved');
          } else if (matched.status === 'pending') {
            setVerificationStatus('pending');
          }
          try {
            localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(matched));
          } catch (e) {}
        }
      }
    }).catch(() => {});

    // Check Verification Status
    const checkId = foundHelper?.id || (userKey !== 'guest' ? userKey : '');
    if (checkId) {
      getVerificationStatus(checkId).then(res => {
        if (res.status === 'deletion_requested') {
          setVerificationStatus('deletion_requested');
        } else if (res.isVerified || res.status === 'approved') {
          setVerificationStatus('approved');
          setMyHelperProfile((prev: any) => prev ? { ...prev, isVerified: true, status: 'approved' } : prev);
        } else if (res.status === 'pending') {
          setVerificationStatus('pending');
        } else if (res.status === 'rejected') {
          setVerificationStatus('rejected');
        }
      }).catch(() => {});
    }

    // Load registered shops
    loadShops(userKey, cleanEmail, cleanPhone);
  }, []);

  const loadShops = (userKey?: string, cleanEmail?: string, cleanPhone?: string) => {
    try {
      const myBizRaw = localStorage.getItem('locohelp_my_business_profile');
      if (myBizRaw) {
        const parsedBiz = JSON.parse(myBizRaw);
        if (parsedBiz && parsedBiz.name) {
          setMyBusinessProfile(parsedBiz);
        }
      }
      const stored = localStorage.getItem('locohelp_registered_shops');
      const userShops: RegisteredShop[] = stored ? JSON.parse(stored) : [];
      const approvedLocal = userShops.filter(s => s && s.id && !String(s.id).startsWith('sample_shop_') && (s.isVerified === true || s.status === 'approved'));
      setRegisteredShopsList(approvedLocal);

      if (!myBizRaw && (cleanEmail || userKey || cleanPhone)) {
        const myShop = userShops.find(s =>
          (cleanEmail && (s.ownerEmail || '').toLowerCase() === cleanEmail) ||
          (userKey && userKey !== 'guest' && s.userId === userKey) ||
          (cleanPhone && (s.phone || '').replace(/\D/g, '') === cleanPhone)
        );
        if (myShop) setMyBusinessProfile(myShop);
      }
    } catch (e) {}

    // Fetch all shops to check user's own business status + filter public directory to approved only
    getShops(true).then((cloudShops) => {
      if (Array.isArray(cloudShops)) {
        const approvedOnly = cloudShops.filter(s => s && s.id && !String(s.id).startsWith('sample_shop_') && (s.isVerified === true || s.status === 'approved'));
        setRegisteredShopsList(approvedOnly);

        if (cleanEmail || userKey || cleanPhone) {
          const matchedMyShop = cloudShops.find((s: any) =>
            (cleanEmail && (s.ownerEmail || '').toLowerCase() === cleanEmail) ||
            (userKey && userKey !== 'guest' && s.userId === userKey) ||
            (cleanPhone && (s.phone || '').replace(/\D/g, '') === cleanPhone)
          );
          if (matchedMyShop) {
            setMyBusinessProfile(matchedMyShop);
            try {
              localStorage.setItem('locohelp_my_business_profile', JSON.stringify(matchedMyShop));
            } catch (e) {}
          }
        }
      }
    }).catch(() => {});
  };

  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  // -------------------------------------------------------------
  // TAB 1 ACTIONS: SAVE SIMPLE PROFILE & PHOTO
  // -------------------------------------------------------------
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadErrorMsg(null);
      const check = await validateUploadedFile(file, { allowPdf: false });
      if (!check.valid) {
        setUploadErrorMsg(check.error || 'Only safe JPEG, PNG, or WebP images up to 2MB are allowed.');
        e.target.value = '';
        return;
      }
      try {
        const base64String = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.75 });
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
      } catch {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          setProfilePhoto(base64String);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSaveSimpleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeUser = getCurrentUser();
    const cleanPhone = userPhone.replace(/\D/g, '') || activeUser?.phone || '';
    const userKey = activeUser?.uid || (cleanPhone ? `phone_${cleanPhone}` : 'guest');

    const safeName = sanitizeText(userName, 120);
    const safeSkills = sanitizeText(userSkills, 500);
    const safeAddress = sanitizeText(userAddress, 300);
    const safeExp = sanitizeText(userExp, 120);

    // Requirement 3: When an already approved user edits profile details, revert status to 'pending' so it requires Admin re-approval
    const newStatus = 'pending';
    const newIsVerified = false;
    const updatedHelper = myHelperProfile
      ? { ...myHelperProfile, isVerified: false, status: 'pending' }
      : null;

    const profileData = {
      uid: userKey,
      full_name: safeName || (cleanPhone ? `User ${cleanPhone.slice(-4)}` : 'Community User'),
      email: sanitizeText(userEmail || activeUser?.email || '', 150),
      phone: sanitizeText(userPhone || cleanPhone, 30),
      skills: safeSkills,
      address: safeAddress,
      experience: safeExp,
      avatar_url: profilePhoto,
      myHelperProfile: updatedHelper,
      status: newStatus,
      isVerified: newIsVerified,
      updated_at: new Date().toISOString()
    };

    setVerificationStatus('pending');
    if (updatedHelper) {
      setMyHelperProfile(updatedHelper);
    }

    try {
      localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(profileData));
      localStorage.setItem('locohelp_profile_name', safeName);
      localStorage.setItem('locohelp_profile_skills', safeSkills);
      localStorage.setItem('locohelp_profile_address', safeAddress);
      localStorage.setItem('locohelp_profile_exp', safeExp);
      if (profileData.email) localStorage.setItem('locohelp_last_logged_in_email', profileData.email);
      if (profilePhoto) localStorage.setItem('locohelp_profile_photo', profilePhoto);
      if (updatedHelper) {
        localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(updatedHelper));
      }

      const current = getCurrentUser();
      localStorage.setItem('locohelp_user', JSON.stringify({
        ...current,
        uid: userKey,
        displayName: safeName || current?.displayName,
        email: profileData.email || current?.email,
        phone: userPhone || current?.phone
      }));
      window.dispatchEvent(new Event('locohelp_profile_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

    try {
      await saveUserProfile(profileData);
      if (updatedHelper && updatedHelper.id) {
        await saveHelper({ ...updatedHelper, isVerified: false, status: 'pending' }).catch(() => {});
      }
      await submitVerification({
        entityType: 'user_profile',
        entityId: updatedHelper?.id || userKey,
        userId: userKey,
        userName: profileData.full_name,
        userEmail: profileData.email || undefined,
        userPhone: profileData.phone,
        title: `Simple User Profile - ${safeAddress || 'Local Area'} (Re-approval Request)`,
        idDocumentWatermarked: profilePhoto || ''
      }).catch(() => {});
      setVerificationStatus('pending');
    } catch (err) {}

    setHasExistingUserProfile(true);
    setIsEditingUserProfile(false);
    setIsSavedNotice(true);
    setShowApprovalNoticeModal(true);
    setTimeout(() => setIsSavedNotice(false), 4000);
  };

  // -------------------------------------------------------------
  // TAB 2 ACTIONS: SUBMIT HELPER PROFILE
  // -------------------------------------------------------------
  const handleSaveHelperProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helperName.trim() || !helperPhone.trim()) return;

    setIsSubmittingHelper(true);

    const activeUser = getCurrentUser();
    const uid = activeUser?.uid || '';
    const cleanEmail = (userEmail || activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();

    const safeCustomCat = sanitizeText(customCategoryName.trim(), 100);
    const matchedCat = CATEGORIES.find(c => c.id === helperCategory);
    const finalCatName = helperCategory === 'other' && safeCustomCat 
      ? safeCustomCat 
      : (matchedCat ? matchedCat.nameEn : 'General Helper');

    const skillsList = helperSkills.trim() 
      ? helperSkills.split(',').map(s => sanitizeText(s.trim(), 80)).filter(Boolean)
      : [finalCatName];

    if (helperCategory === 'other' && safeCustomCat && !skillsList.some(s => s.toLowerCase() === safeCustomCat.toLowerCase())) {
      skillsList.unshift(safeCustomCat);
    }

    const finalDoc = helperIdFrontDoc || helperIdBackDoc || myHelperProfile?.idDocUrl;
    const finalWorkPhoto = helperWorkPhoto || myHelperProfile?.photoUrl;

    // Requirement 3: On profile edit, automatically revert status to 'pending' & isVerified to false
    const newHelper = saveFreeHelperProfile({
      id: myHelperProfile?.id,
      userId: uid || myHelperProfile?.userId,
      email: cleanEmail || myHelperProfile?.email,
      name: sanitizeText(helperName.trim(), 120),
      categoryId: helperCategory,
      customCategoryName: helperCategory === 'other' ? safeCustomCat : undefined,
      phone: sanitizeText(helperPhone.trim(), 30),
      skills: skillsList,
      area: sanitizeText(helperArea.trim() || 'Local Area', 150),
      experience: sanitizeText(helperExp.trim() || '1 Year', 60),
      distance: 0.5,
      photoUrl: finalWorkPhoto || undefined,
      govtIdUploaded: Boolean(finalDoc),
      idDocUrl: finalDoc || undefined,
      isVerified: false, // Re-approval required from Admin on edit
      status: 'pending',
    } as any);

    setMyHelperProfile(newHelper);
    setIsEditingHelperProfile(false);
    setHasExistingUserProfile(true);

    try {
      localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(newHelper));
      if (uid && uid !== 'guest') {
        const userScopedRaw = localStorage.getItem(`locohelp_user_profile_${uid}`);
        const userScoped = userScopedRaw ? JSON.parse(userScopedRaw) : {};
        userScoped.myHelperProfile = newHelper;
        localStorage.setItem(`locohelp_user_profile_${uid}`, JSON.stringify(userScoped));
      }
      window.dispatchEvent(new Event('locohelp_profile_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

    try {
      const helperId = newHelper.id || `helper_${Date.now()}`;
      await saveHelper({ ...newHelper, id: helperId, photoUrl: finalWorkPhoto, isVerified: false, status: 'pending' });
    } catch (e) {}

    // Submit to Admin Verification Queue for re-approval
    try {
      await submitVerification({
        entityType: 'user_profile',
        entityId: newHelper.id,
        userId: uid || newHelper.id,
        userName: newHelper.name,
        userEmail: cleanEmail || undefined,
        userPhone: newHelper.phone,
        title: `Service Expert Profile (${finalCatName}) - ${finalDoc ? 'Government ID Card' : 'Profile Verification'} (Re-approval Request)`,
        idDocumentWatermarked: finalDoc || ''
      });
      setVerificationStatus('pending');
    } catch (verifErr) {
      console.warn("Verification submit error:", verifErr);
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

    setUploadErrorMsg(null);
    const check = await validateUploadedFile(file, { allowPdf: true });
    if (!check.valid) {
      setUploadErrorMsg(check.error || 'Invalid file uploaded.');
      e.target.value = '';
      return;
    }

    setShopIdDocName(file.name);
    setIsWatermarkingShopId(true);

    try {
      const watermarked = await applyIdWatermark(file, {
        entityType: 'business',
        userName: shopName.trim() || ownerName.trim() || 'Business Owner',
        customText: 'FOR LOCOHELP VERIFICATION ONLY • DO NOT REUSE • BUSINESS ID'
      });
      setShopIdDoc(watermarked);
    } catch (err: any) {
      setUploadErrorMsg(err?.message || 'Document upload error.');
    } finally {
      setIsWatermarkingShopId(false);
    }
  };

  const handleRegisterShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !shopPhone.trim()) return;

    setIsSubmittingShop(true);

    const activeUser = getCurrentUser();
    const uid = activeUser?.uid || '';
    const cleanEmail = (userEmail || activeUser?.email || localStorage.getItem('locohelp_last_logged_in_email') || '').trim().toLowerCase();

    const typeObj = SHOP_TYPES.find(t => t.id === shopType);
    const label = shopType === 'other' && customShopType.trim()
      ? customShopType.trim()
      : (typeObj ? (language === 'EN' ? typeObj.nameEn : typeObj.nameHi) : 'Local Business');

    const shopId = myBusinessProfile?.id || ('shop_' + Date.now().toString(36));

    const finalPhotos = shopPhotos.length > 0 ? shopPhotos.slice(0, 3) : (shopPhoto ? [shopPhoto] : []);

    const newShop: RegisteredShop = {
      id: shopId,
      userId: uid,
      ownerEmail: cleanEmail,
      name: shopName.trim(),
      type: shopType as any,
      categoryLabel: label,
      ownerName: ownerName.trim() || userName.trim() || 'Owner',
      phone: shopPhone.trim(),
      timings: shopTimings.trim() || '9:00 AM - 9:00 PM',
      area: shopArea.trim() || 'Local Area',
      address: shopAddress.trim() || 'Market Area',
      description: shopDescription.trim() || 'Welcome to our business!',
      photoUrl: finalPhotos[0] || shopPhoto || myBusinessProfile?.photoUrl || undefined,
      photos: finalPhotos.length > 0 ? finalPhotos : undefined,
      rating: 5.0,
      reviewCount: 1,
      isVerified: false, // Requires Admin Approval before going live
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      const existingStr = localStorage.getItem('locohelp_registered_shops');
      const existingShops: RegisteredShop[] = existingStr ? JSON.parse(existingStr) : [];
      const updatedShops = [newShop, ...existingShops.filter(s => s && s.id && s.id !== shopId && !String(s.id).startsWith('sample_shop_'))];
      localStorage.setItem('locohelp_registered_shops', JSON.stringify(updatedShops));
      localStorage.setItem('locohelp_my_business_profile', JSON.stringify(newShop));
      setMyBusinessProfile(newShop);
      setIsEditingBusiness(false);
    } catch (e) {}

    try {
      await saveShop({
        ...newShop,
        photos: finalPhotos,
        timings: newShop.timings,
        idDocumentWatermarked: shopIdDoc || finalPhotos[0] || shopPhoto || ''
      });
    } catch (err) {}

    // Always submit to Admin Verification Queue so Admin can approve the Business
    try {
      await submitVerification({
        entityType: 'business',
        entityId: shopId,
        userId: uid || ownerName.trim() || shopName.trim(),
        userName: shopName.trim(),
        userEmail: cleanEmail || undefined,
        userPhone: shopPhone.trim(),
        title: `${shopName.trim()} (${label}) - Business Registration Approval`,
        idDocumentWatermarked: shopIdDoc || shopPhoto || ''
      });
    } catch (verifErr) {}

    setIsSubmittingShop(false);
    setShopSubmitSuccess(true);
    setTimeout(() => setShopSubmitSuccess(false), 5000);
  };

  const handleWhatsAppContact = (shop: RegisteredShop) => {
    const cleanPhone = shop.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = encodeURIComponent(
      `Namaste ${shop.ownerName || shop.name}! 🙏 LocoHelp App par aapki dukan/business list dekh kar contact kar raha hoon.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
  };

  // Only show Admin-approved businesses in public directory
  const filteredShops = registeredShopsList.filter(s => {
    if (!(s.isVerified === true || s.status === 'approved')) return false;
    if (!shopSearchQuery.trim()) return true;
    const q = shopSearchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || 
           s.categoryLabel.toLowerCase().includes(q) || 
           s.area.toLowerCase().includes(q) ||
           s.description.toLowerCase().includes(q);
  });

  const isHelperApproved = Boolean(myHelperProfile && (myHelperProfile.isVerified === true || myHelperProfile.status === 'approved'));
  const isBusinessApproved = Boolean(myBusinessProfile && (myBusinessProfile.isVerified === true || myBusinessProfile.status === 'approved'));

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-slate-900 relative overflow-hidden transition-colors">
      
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between px-4 py-3.5 pt-10 sm:pt-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-20 shadow-xs">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Profile Hub / प्रोफाइल हब
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Manage Account, Service Expert Listing & Business Registration</p>
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
            <span className="truncate">Service Expert</span>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {userName || myHelperProfile?.name || "Community Member"}
                    </h1>
                    {verificationStatus === 'deletion_requested' ? (
                      <span className="text-[10px] bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Deletion Requested
                      </span>
                    ) : verificationStatus === 'approved' || isHelperApproved ? (
                      <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active & Approved
                      </span>
                    ) : (verificationStatus === 'pending' || (myHelperProfile && !isHelperApproved)) ? (
                      <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Under Admin Review
                      </span>
                    ) : null}
                  </div>
                  
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {(userPhone || myHelperProfile?.phone) ? `+91 ${userPhone || myHelperProfile?.phone}` : "No phone added"}
                  </p>

                  {/* Registered Email Address */}
                  {userEmail && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg shadow-2xs max-w-full">
                      <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 truncate">
                        {userEmail}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-3.5 h-3.5 ${star <= 5 ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700 fill-slate-200'}`} />
                    ))}
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white ml-1">5.0 / 5.0</span>
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="relative shrink-0">
                  <div className="w-18 h-18 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center relative overflow-hidden border-2 border-indigo-500/80 shadow-md">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
                    (verificationStatus === 'approved' || isHelperApproved) ? 'bg-emerald-600' : (verificationStatus === 'pending' || myHelperProfile) ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}>
                    {(verificationStatus === 'approved' || isHelperApproved) ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white">Identity Verification & Profile Status</h3>
                      {(verificationStatus === 'approved' || isHelperApproved) && (
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified 🛡️
                        </span>
                      )}
                      {!(verificationStatus === 'approved' || isHelperApproved) && (verificationStatus === 'pending' || myHelperProfile) && (
                        <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Under Admin Review
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                      {(verificationStatus === 'approved' || isHelperApproved)
                        ? 'Your profile is approved and active on LocoHelp'
                        : (verificationStatus === 'pending' || myHelperProfile)
                        ? 'Your profile is Under Admin Review • Will go live once approved'
                        : 'Upload ID for green Verified badge (Admin-only private view)'}
                    </p>
                  </div>
                </div>

                {!(verificationStatus === 'approved' || isHelperApproved) && (
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

            {/* Existing User Profile View vs Edit Form */}
            {hasExistingUserProfile && !isEditingUserProfile ? (
              <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Active Profile Details
                    </h3>
                    <p className="text-[11px] text-slate-500">Linked to your registered account</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingUserProfile(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-xs font-extrabold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit / Update Profile</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Full Name</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{userName || myHelperProfile?.name || '—'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Mobile Number</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{userPhone || myHelperProfile?.phone ? `+91 ${userPhone || myHelperProfile?.phone}` : '—'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Registered Email</span>
                    <span className="font-extrabold text-slate-900 dark:text-white break-all">{userEmail || '—'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Area / Locality</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{userAddress || myHelperProfile?.area || '—'}</span>
                  </div>
                </div>

                {myHelperProfile && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    isHelperApproved
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                  }`}>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block text-slate-500">
                        Linked Service Expert Profile ({myHelperProfile.customCategoryName || myHelperProfile.categoryId})
                      </span>
                      <span className={`text-xs font-extrabold ${isHelperApproved ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {isHelperApproved ? '🛡️ Approved & Active in Directory' : '⏳ Under Admin Review'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('helper')}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-800 dark:text-white cursor-pointer"
                    >
                      View Expert Tab
                    </button>
                  </div>
                )}

                {isSavedNotice && (
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="w-4 h-4 shrink-0" /> {t('prof.reApprovalNotice')}
                  </p>
                )}
              </div>
            ) : (
              /* Simple Profile Create / Edit Form */
              <form onSubmit={handleSaveSimpleProfile} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    {hasExistingUserProfile ? 'Edit / Update Personal Details' : 'Create Personal Profile'}
                  </h3>
                  {hasExistingUserProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingUserProfile(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

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
            )}

            {/* Account Closure / Deactivation Request */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-rose-600 dark:text-rose-400 font-extrabold hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('pro.closureBtn')}</span>
              </button>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: HELPER PROFILE REGISTRATION & MANAGEMENT               */}
        {/* ============================================================== */}
        {activeTab === 'helper' && (
          <div className="space-y-4">
            
            {/* If Helper Profile already exists and user is not editing: Show Status & Details Card instead of Blank Create Form */}
            {myHelperProfile && !isEditingHelperProfile ? (
              <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 space-y-4 shadow-xs">
                {/* Status Banner */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  isHelperApproved
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                }`}>
                  <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                    isHelperApproved ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}>
                    {isHelperApproved ? <ShieldCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full text-white ${
                        isHelperApproved ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}>
                        {isHelperApproved ? '🛡️ Active & Approved' : '⏳ Under Admin Review'}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1.5">
                      {isHelperApproved
                        ? (language === 'EN' ? 'Your Service Expert Profile is Active & Live!' : 'आपकी सर्विस एक्सपर्ट प्रोफाइल एक्टिव और लाइव है!')
                        : (language === 'EN' ? 'Profile Under Admin Review' : 'प्रोफाइल एडमिन समीक्षा (Under Admin Review) में है')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                      {isHelperApproved
                        ? (language === 'EN'
                            ? "Your profile is approved by Admin and visible in 'Browse Service Experts' under your category."
                            : "आपकी प्रोफाइल एडमिन द्वारा अप्रूव कर दी गई है और 'Browse Service Experts' में आपकी कैटेगरी में लाइव दिख रही है।")
                        : (language === 'EN'
                            ? "Your Service Expert profile has already been created and sent to the Admin approval queue. Once approved, it will automatically go live."
                            : "आपने पहले ही अपनी प्रोफाइल बना ली है और यह एडमिन अप्रूवल के लिए भेजी जा चुकी है। अप्रूव होते ही यह लाइव हो जाएगी।")}
                    </p>
                  </div>
                </div>

                {/* Active / Submitted Helper Profile Details */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        {isHelperApproved ? 'Active Profile Details' : 'Submitted Profile Details'}
                      </span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{myHelperProfile.name}</span>
                        {isHelperApproved && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                      {myHelperProfile.categoryId === 'other' && myHelperProfile.customCategoryName
                        ? myHelperProfile.customCategoryName
                        : getCategoryName(CATEGORIES.find(c => c.id === myHelperProfile.categoryId), language) || myHelperProfile.categoryId}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold block">Mobile Number</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">+91 {myHelperProfile.phone}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold block">Experience</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{myHelperProfile.experience || '1 Year'}</span>
                    </div>
                    <div className="col-span-2 bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold block">Area / Locality</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{myHelperProfile.area}</span>
                    </div>
                  </div>

                  {Array.isArray(myHelperProfile.skills) && myHelperProfile.skills.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Skills & Services</span>
                      <div className="flex flex-wrap gap-1.5">
                        {myHelperProfile.skills.map((sk: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit / Update Profile Button */}
                <button
                  type="button"
                  onClick={() => {
                    populateHelperForm(myHelperProfile);
                    setIsEditingHelperProfile(true);
                  }}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{language === 'EN' ? 'Edit / Update Profile' : 'प्रोफाइल एडिट / अपडेट करें'}</span>
                </button>
              </div>
            ) : (
              /* Helper Registration / Update Form */
              <form onSubmit={handleSaveHelperProfile} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{myHelperProfile ? 'Edit / Update Service Expert Profile' : 'Service Expert Profile Registration'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">List your skills (Plumber, Electrician, Tutor, Other) in local neighborhood categories</p>
                  </div>
                  {myHelperProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingHelperProfile(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
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
                        placeholder="Enter Custom Work Category / Profession *"
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

                {/* Profile / Work Photo Upload for Local Helper */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profile / Work Photo (प्रोफाइल या काम की फ़ोटो • JPG, PNG, WebP Max 2MB)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadErrorMsg(null);
                        const check = await validateUploadedFile(file, { allowPdf: false });
                        if (!check.valid) {
                          setUploadErrorMsg(check.error || 'Only safe JPG, PNG, or WEBP images up to 2MB are allowed.');
                          e.target.value = '';
                          return;
                        }
                        try {
                          const compressed = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.75 });
                          setHelperWorkPhoto(compressed);
                        } catch {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setHelperWorkPhoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                  />
                  {helperWorkPhoto && (
                    <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-400">
                      <img src={helperWorkPhoto} alt="Work Preview" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setHelperWorkPhoto(null)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
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
                        accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadErrorMsg(null);
                            const check = await validateUploadedFile(file, { allowPdf: true });
                            if (!check.valid) {
                              setUploadErrorMsg(check.error || 'Invalid file uploaded.');
                              e.target.value = '';
                              return;
                            }
                            setHelperIdFrontName(file.name);
                            if (file.type === 'application/pdf') {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setHelperIdFrontDoc(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            } else {
                              try {
                                const watermarked = await applyIdWatermark(file, {
                                  userName: helperName.trim() || userName || 'Service Expert',
                                  customText: 'FOR LOCOHELP VERIFICATION ONLY • SERVICE EXPERT ID FRONT'
                                });
                                setHelperIdFrontDoc(watermarked);
                              } catch {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setHelperIdFrontDoc(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }
                        }}
                        className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 cursor-pointer"
                      />
                      {helperIdFrontName && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1 truncate">
                          <CheckCircle2 className="w-3 h-3 shrink-0" /> Front (Watermarked): {helperIdFrontName}
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
                        accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadErrorMsg(null);
                            const check = await validateUploadedFile(file, { allowPdf: true });
                            if (!check.valid) {
                              setUploadErrorMsg(check.error || 'Invalid file uploaded.');
                              e.target.value = '';
                              return;
                            }
                            setHelperIdBackName(file.name);
                            if (file.type === 'application/pdf') {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setHelperIdBackDoc(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            } else {
                              try {
                                const watermarked = await applyIdWatermark(file, {
                                  userName: helperName.trim() || userName || 'Service Expert',
                                  customText: 'FOR LOCOHELP VERIFICATION ONLY • SERVICE EXPERT ID BACK'
                                });
                                setHelperIdBackDoc(watermarked);
                              } catch {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setHelperIdBackDoc(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }
                        }}
                        className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 cursor-pointer"
                      />
                      {helperIdBackName && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1 truncate">
                          <CheckCircle2 className="w-3 h-3 shrink-0" /> Back (Watermarked): {helperIdBackName}
                        </p>
                      )}
                    </div>
                  </div>
                  {uploadErrorMsg && (
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{uploadErrorMsg}</span>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingHelper}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{myHelperProfile ? 'Update Service Expert Profile' : 'Save Service Expert Profile'}</span>
                </button>

              </form>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: BUSINESS & VENUE REGISTRATION & LIST                    */}
        {/* ============================================================== */}
        {activeTab === 'business' && (
          <div className="space-y-4">

            {shopSubmitSuccess && (
              <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {language === 'EN'
                    ? 'Business registration submitted! Status: Pending Admin Approval. It will appear in the public directory once approved by Admin.'
                    : 'बिज़नेस रजिस्ट्रेशन सबमिट हो गया! स्टेटस: एडमिन अप्रूवल के लिए पेंडिंग। एडमिन द्वारा अप्रूव होने के बाद यह पब्लिक डायरेक्टरी में दिखेगा।'}
                </span>
              </div>
            )}

            {/* Existing Business Status Card if user has already registered a business */}
            {myBusinessProfile && !isEditingBusiness ? (
              <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl space-y-3.5 shadow-xs">
                <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isBusinessApproved
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                }`}>
                  <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 ${
                    isBusinessApproved ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}>
                    {isBusinessApproved ? <ShieldCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white ${
                      isBusinessApproved ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}>
                      {isBusinessApproved ? '🛡️ Approved & Live' : '⏳ Under Admin Review'}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                      {myBusinessProfile.name}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      {myBusinessProfile.categoryLabel} • {myBusinessProfile.area}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShopName(myBusinessProfile.name || '');
                    setShopType(myBusinessProfile.type || 'shop');
                    setOwnerName(myBusinessProfile.ownerName || '');
                    setShopPhone(myBusinessProfile.phone || '');
                    setShopTimings(myBusinessProfile.timings || '9:00 AM - 9:00 PM');
                    setShopArea(myBusinessProfile.area || '');
                    setShopAddress(myBusinessProfile.address || '');
                    setShopDescription(myBusinessProfile.description || '');
                    setShopPhotos(myBusinessProfile.photos || (myBusinessProfile.photoUrl ? [myBusinessProfile.photoUrl] : []));
                    setIsEditingBusiness(true);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit / Update Business Details</span>
                </button>
              </div>
            ) : (
              /* Business Registration Form */
              <form onSubmit={handleRegisterShop} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{myBusinessProfile ? 'Update Business / Shop' : 'Business / Shop Registration'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">List your Shop, Showroom, Hospital, Bakery or Venue (Subject to Admin Approval)</p>
                  </div>
                  {myBusinessProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingBusiness(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
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

                {/* 3. Owner Name & Timings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Owner / Manager Name *
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Owner Name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Shop Timings (दुकान का समय) *
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 9:00 AM - 9:00 PM"
                      value={shopTimings}
                      onChange={(e) => setShopTimings(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
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
                    Address / City / Area *
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
                    Description / Offers / Services
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="All mobile accessories available. Flat 10% discount on all purchases!"
                    value={shopDescription}
                    onChange={(e) => setShopDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                  />
                </div>

                {/* 8. Multiple Shop Photos Upload (2-3 images max 2MB each) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shop / Business Photos (2-3 फ़ोटो अपलोड करें • Max 2MB each)
                  </label>
                  <input 
                    type="file" 
                    multiple
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []) as File[];
                      if (files.length === 0) return;
                      setUploadErrorMsg(null);
                      const remainingSlots = 3 - shopPhotos.length;
                      if (remainingSlots <= 0) {
                        setUploadErrorMsg('Maximum 3 shop photos allowed.');
                        e.target.value = '';
                        return;
                      }
                      for (const file of files.slice(0, remainingSlots)) {
                        const check = await validateUploadedFile(file, { allowPdf: false });
                        if (!check.valid) {
                          setUploadErrorMsg(check.error || 'Only safe JPEG, PNG, or WebP images up to 2MB are allowed.');
                          continue;
                        }
                        try {
                          const dataUrl = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.75 });
                          setShopPhotos((prev) => {
                            const updated = [...prev, dataUrl].slice(0, 3);
                            setShopPhoto(updated[0] || null);
                            return updated;
                          });
                        } catch {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const dataUrl = reader.result as string;
                            setShopPhotos((prev) => {
                              const updated = [...prev, dataUrl].slice(0, 3);
                              setShopPhoto(updated[0] || null);
                              return updated;
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                      e.target.value = '';
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-950 dark:file:text-amber-300 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                  />
                  {shopPhotos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shopPhotos.map((photo, idx) => (
                        <div key={idx} className="relative w-24 h-20 rounded-xl overflow-hidden border-2 border-amber-400 shadow-xs">
                          <img src={photo} alt={`Shop Preview ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => {
                              setShopPhotos((prev) => {
                                const next = prev.filter((_, i) => i !== idx);
                                setShopPhoto(next[0] || null);
                                return next;
                              });
                            }}
                            className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer"
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 9. Government ID / License Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Government ID / Trade License (JPG, PNG, WebP ≤ 2MB or PDF ≤ 5MB)
                  </label>
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleIdDocUploadShop}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-950 dark:file:text-amber-300 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                  />
                  {shopIdDocName && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ID Document Watermarked: {shopIdDocName}
                    </p>
                  )}
                  {uploadErrorMsg && (
                    <div className="mt-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{uploadErrorMsg}</span>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingShop}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
                >
                  <Store className="w-4 h-4" />
                  <span>{shopSubmitSuccess ? 'Submitted for Admin Approval!' : (myBusinessProfile ? 'Update & Submit for Approval' : 'Register Business / Venue')}</span>
                </button>

              </form>
            )}

            {/* List View of All Approved Registered Local Businesses */}
            <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🏪 Approved Local Businesses ({filteredShops.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Admin-verified Shops, Showrooms, Malls & Venues</p>
                </div>
              </div>

              {/* Search input for registered shops */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={shopSearchQuery}
                  onChange={(e) => setShopSearchQuery(e.target.value)}
                  placeholder="Search approved business by name, area or item..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-1">
                {filteredShops.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No approved businesses found matching search.</p>
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
                          <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.2 rounded-full">🛡️ Verified</span>
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
                {language === 'GU'
                  ? 'પ્રોફાઈલ એડમિન મંજૂરી માટે મોકલાઈ ગઈ!'
                  : language === 'EN'
                  ? 'Profile Submitted for Admin Approval!'
                  : 'प्रोफाइल एडमिन अप्रूवल के लिए सबमिट हो गई!'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-medium">
                {language === 'GU'
                  ? 'તમારી સર્વિસ એક્સપર્ટ પ્રોફાઈલ સફળતાપૂર્વક નોંધાઈ ગઈ છે. સુરક્ષા અને ચકાસણી માટે તમારી વિગતો એડમિન પાસે મોકલવામાં આવી છે. એડમિન દ્વારા મંજૂર થતાં જ તમારી પ્રોફાઈલ વેરિફાઈડ બેજ (🛡️) સાથે મુખ્ય પેજ પર તમારી કેટેગરીમાં લાઈવ થઈ જશે.'
                  : language === 'EN'
                  ? 'Your Service Expert Profile has been recorded successfully. For community trust & verification, your details have been sent to Admin for approval. Once approved, your profile will be live with the Verified Badge (🛡️) on the main page under your category.'
                  : 'आपकी सर्विस एक्सपर्ट प्रोफाइल सफलतापूर्वक दर्ज हो गई है। सुरक्षा और वेरिफिकेशन के लिए आपकी प्रोफाइल एडमिन के पास अप्रूवल के लिए भेज दी गई है। एडमिन द्वारा अप्रूव करते ही आपकी प्रोफाइल Verified Badge (🛡️) के साथ मेन पेज पर आपकी केटेगरी के अंदर लाइव हो जाएगी।'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowApprovalNoticeModal(false)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {language === 'GU' ? 'બરાબર, સમજી ગયો' : language === 'EN' ? 'Okay, Understood' : 'ठीक है, समझ गया'}
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

      {/* Request Account Closure / Deactivation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center text-2xl shadow-inner">
              {isDeleting ? '⏳' : '🛡️'}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {t('prof.closureTitle') || 'Request Account Closure / Deactivation'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('prof.closureDesc') || 'Submitting this request sends your account details to the Admin Panel for verification before safe deactivation and data purging.'}
              </p>
            </div>

            {closureSubmitted ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                ✓ {t('prof.closureSuccess') || 'Account closure request submitted to Admin! Status: Pending Verification.'}
              </div>
            ) : (
              <div className="space-y-2 text-left">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Reason for Account Closure (Optional):
                </label>
                <textarea
                  rows={2}
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="e.g. No longer using app / Moving to another city..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none font-medium"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setClosureSubmitted(false);
                  setClosureReason('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                {closureSubmitted ? 'Close' : 'Cancel'}
              </button>
              {!closureSubmitted && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    try {
                      setIsDeleting(true);
                      const activeUser = getCurrentUser();
                      const cleanPhone = (userPhone || '').replace(/\D/g, '') || activeUser?.phone || '';
                      const userKey = activeUser?.uid || (cleanPhone ? `phone_${cleanPhone}` : 'guest');

                      // Submit closure ticket to Admin reports
                      await fetch('/api/reports', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          reason: 'ACCOUNT_CLOSURE_REQUEST',
                          description: `ACCOUNT CLOSURE REQUEST for user "${userName || activeUser?.displayName || 'User'}" (Phone: ${cleanPhone}, Email: ${userEmail || activeUser?.email || 'N/A'}). User Reason: ${closureReason.trim() || 'User requested account closure/deactivation'}`,
                          targetId: userKey,
                          reporterId: userKey,
                          userName: userName || activeUser?.displayName || 'User',
                          userEmail: userEmail || activeUser?.email || '',
                          userPhone: cleanPhone,
                          status: 'deletion_requested',
                          createdAt: new Date().toISOString()
                        })
                      }).catch(() => {});

                      // Update profile status to deletion_requested so only Admin can review and permanently delete it
                      const updatedClosureProfile = {
                        uid: userKey,
                        full_name: userName || activeUser?.displayName || 'User',
                        email: userEmail || activeUser?.email || '',
                        phone: userPhone || cleanPhone,
                        skills: userSkills,
                        address: userAddress,
                        experience: userExp,
                        avatar_url: profilePhoto,
                        myHelperProfile: myHelperProfile ? { ...myHelperProfile, status: 'deletion_requested', isVerified: false } : null,
                        status: 'deletion_requested',
                        isVerified: false,
                        updated_at: new Date().toISOString()
                      };

                      try {
                        localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(updatedClosureProfile));
                        if (myHelperProfile) {
                          const updatedHelper = { ...myHelperProfile, status: 'deletion_requested', isVerified: false };
                          setMyHelperProfile(updatedHelper);
                          localStorage.setItem('locohelp_my_helper_profile', JSON.stringify(updatedHelper));
                        }
                      } catch (e) {}

                      await saveUserProfile(updatedClosureProfile).catch(() => {});

                      setVerificationStatus('deletion_requested');
                      setClosureSubmitted(true);
                      setIsDeleting(false);
                      setTimeout(() => {
                        setShowDeleteConfirm(false);
                        setClosureSubmitted(false);
                        setClosureReason('');
                      }, 2500);
                    } catch (err) {
                      setIsDeleting(false);
                      setShowDeleteConfirm(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-70"
                >
                  {isDeleting ? 'Submitting...' : (t('prof.closureSubmit') || 'Submit Closure Request')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
