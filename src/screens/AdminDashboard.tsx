import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Lock, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Eye, 
  EyeOff,
  Search, 
  Megaphone, 
  FileText, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  LogOut, 
  RefreshCw, 
  Sparkles, 
  MapPin, 
  Phone, 
  Star, 
  Check, 
  X, 
  Globe, 
  MessageCircle, 
  Zap,
  LayoutGrid,
  TrendingUp,
  Award,
  KeyRound,
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  Briefcase,
  Building2,
  UserCheck,
  Clock,
  Store,
  Edit3,
  Mail,
  ChevronRight,
  Filter,
  MoreVertical,
  Calendar,
  Wrench,
  Flag
} from 'lucide-react';
import { getFreeHelperProfiles, saveFreeHelperProfile, normalizeCategorySlug, CATEGORIES, MASTER_CATEGORIES, getSubCategoriesByMainId } from '../data/categories';
import { getHelpers, getShops } from '../auth';
import { 
  fetchLiveIntents, 
  deleteIntentOnServer, 
  fetchLiveAds, 
  createAdOnServer, 
  deleteAdOnServer, 
  AdBannerItem,
  fetchJobPortalItems,
  updateJobPortalStatus,
  deleteJobPortalItem,
  JobPortalSubmission,
  loginAdminOnServer,
  sendAdminForgotPasswordOtpOnServer,
  resetAdminPasswordWithOtpOnServer,
  changeAdminPasswordOnServer,
  getAuthHeaders,
  fetchAdminVerifications,
  updateAdminVerificationStatus,
  AdminVerificationItem,
  updateAdminIntentOnServer,
  updateAdminHelperOnServer,
  deleteAdminHelperOnServer,
  fetchAdminUsersOnServer,
  updateAdminUserOnServer,
  deleteAdminUserOnServer,
  updateAdminBusinessOnServer,
  deleteAdminBusinessOnServer,
  updateAdminJobPortalOnServer,
  updateAdminReportOnServer,
  deleteAdminReportOnServer,
  getCachedCategoryImages,
  fetchCategoryImages,
  saveCategoryImageOnServer,
  deleteCategoryImageOnServer,
  fetchAdminSecurityVault,
  SecurityVaultRecord,
  downloadDatabaseBackupFromServer,
  restoreDatabaseBackupOnServer,
  syncBrowserDataToPostgres,
  initAndRepairPostgresDatabaseOnServer,
  fetchPublicSuggestions,
  deletePublicSuggestionOnServer,
  PublicSuggestion,
  fetchAdminSiteLock,
  updateAdminSiteLock,
  fetchAdminHelperReviews,
  deleteAdminHelperReview,
  updateAdStatusOnServer,
  HelperReviewItem
} from '../api';
import { validateUploadedFile } from '../lib/security';
import { compressImageToWebP } from '../lib/imageCompression';
import { uploadFileToFirebaseStorage } from '../lib/firebase';

interface AdminDashboardProps {
  onBack: () => void;
  showToast?: (msg: string) => void;
}

type AdminModuleId =
  | 'home'
  | 'hero_banner'
  | 'approved_list'
  | 'help_posts'
  | 'helpers'
  | 'helper_reviews'
  | 'simple_users'
  | 'businesses'
  | 'job_seekers'
  | 'employers'
  | 'feedback_categories'
  | 'ads'
  | 'security_vault';

const DEFAULT_ADS: any[] = [];

export default function AdminDashboard({ onBack, showToast: externalShowToast }: AdminDashboardProps) {
  const [internalToast, setInternalToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    if (externalShowToast) externalShowToast(msg);
    setInternalToast(msg);
    setTimeout(() => {
      setInternalToast(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  const processCategoryImageFileTo16x9 = async (file: File): Promise<string> => {
    return compressImageToWebP(file, { maxWidth: 1280, quality: 0.82, folder: 'banners' });
  };
  // Authentication State (Strictly 2-Step: Password -> OTP to one of the 3 Authorized Admin Emails)
  const ALLOWED_ADMIN_EMAILS = [
    'baalvarta@gmail.com',
    'malimahesh1991@gmail.com',
    'vijaybhalaiya26@gmail.com'
  ];
  const [selectedAdminEmail, setSelectedAdminEmail] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('locohelp_admin_email') || localStorage.getItem('locohelp_admin_email');
      if (saved && ALLOWED_ADMIN_EMAILS.includes(saved.toLowerCase())) return saved.toLowerCase();
    } catch {}
    return 'baalvarta@gmail.com';
  });
  const OFFICIAL_ADMIN_EMAIL = selectedAdminEmail;
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return (
        sessionStorage.getItem('locohelp_admin_logged_in') === 'true' &&
        Boolean(sessionStorage.getItem('locohelp_admin_token'))
      );
    } catch {
      return false;
    }
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 2-Step Admin Login & Forgot Password Flow State
  const [adminAuthStep, setAdminAuthStep] = useState<'password' | 'otp' | 'forgot_password'>('password');
  const [adminOtpInput, setAdminOtpInput] = useState('');
  const [isSendingAdminOtp, setIsSendingAdminOtp] = useState(false);

  // Forgot Password States
  const [forgotOtpInput, setForgotOtpInput] = useState('');
  const [forgotNewPasswordInput, setForgotNewPasswordInput] = useState('');
  const [forgotConfirmPasswordInput, setForgotConfirmPasswordInput] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);

  // Top Bar Change Admin Password Section/Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [changeOldPassword, setChangeOldPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Play Store TWA Fullscreen (Digital Asset Links SHA-256) Modal State in 3-Dot Menu
  const [isAssetLinksModalOpen, setIsAssetLinksModalOpen] = useState(false);
  const [assetLinksPackage, setAssetLinksPackage] = useState('com.locohelp.twa');
  const [assetLinksSha256, setAssetLinksSha256] = useState('');
  const [isSavingAssetLinks, setIsSavingAssetLinks] = useState(false);

  // Active Dedicated Sub-Page Module
  const [activeModule, setActiveModule] = useState<AdminModuleId>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvedGroupFilter, setApprovedGroupFilter] = useState<'all' | 'helpers' | 'businesses' | 'simple_users' | 'employers' | 'job_seekers' | 'help_posts'>('all');
  const [approvedSearchQuery, setApprovedSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Data States for all 7 modules
  const [intents, setIntents] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [simpleUsers, setSimpleUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [jobPortalItems, setJobPortalItems] = useState<JobPortalSubmission[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [publicSuggestions, setPublicSuggestions] = useState<PublicSuggestion[]>([]);
  const [verificationsList, setVerificationsList] = useState<AdminVerificationItem[]>([]);
  const [ads, setAds] = useState<AdBannerItem[]>([]);
  const [customCategories, setCustomCategories] = useState<Array<{ id: string; name: string; nameHi: string; icon: string }>>(() => {
    try {
      const saved = localStorage.getItem('locohelp_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameHi, setNewCatNameHi] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🛠️');

  // Category Folder / Filter View State for Service Experts & User Profiles in Admin
  const [selectedMainCatFilter, setSelectedMainCatFilter] = useState<string>('all');
  const [selectedSubCatFilter, setSelectedSubCatFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [isSiteLockModalOpen, setIsSiteLockModalOpen] = useState<boolean>(false);
  const [adminReviews, setAdminReviews] = useState<HelperReviewItem[]>([]);

  // Encrypted Read-Only Security Vault State (Strictly Non-Deletable)
  const [securityVaultRecords, setSecurityVaultRecords] = useState<SecurityVaultRecord[]>([]);
  const [vaultFilter, setVaultFilter] = useState<'all' | 'deleted' | 'helper' | 'user_profile' | 'business' | 'job' | 'help_post' | 'with_id'>('all');
  const [vaultSearch, setVaultSearch] = useState('');

  // Private Access PIN Lock Gate Settings State
  const [siteLockState, setSiteLockState] = useState<{ isLocked: boolean; accessPin: string }>({
    isLocked: true,
    accessPin: '1540'
  });
  const [isSavingSiteLock, setIsSavingSiteLock] = useState(false);

  const handleSaveSiteLock = async (newIsLocked: boolean, newPin: string) => {
    if (!newPin || newPin.trim().length < 4) {
      showToast('⚠️ PIN ઓછામાં ઓછા 4 અંકનો હોવો જોઈએ (PIN must be at least 4 digits)');
      return;
    }
    setIsSavingSiteLock(true);
    try {
      const res = await updateAdminSiteLock(newIsLocked, newPin.trim());
      if (res.success) {
        setSiteLockState({
          isLocked: Boolean(res.isLocked),
          accessPin: String(res.accessPin || '1540')
        });
        showToast(newIsLocked ? `🔒 Private Access Lock ACTIVE (PIN: ${res.accessPin})` : '🔓 Site Lock Disabled (Public Access)');
      } else {
        showToast(res.error || 'Failed to update site lock settings');
      }
    } catch (e: any) {
      showToast(e.message || 'Error updating site lock');
    } finally {
      setIsSavingSiteLock(false);
    }
  };

  // Home Page Main Hero Banner State (stored in PostgreSQL category_images under '__home_hero_banner_gu__', '__home_hero_banner_hi__', '__home_hero_banner_en__')
  const DEFAULT_HOME_HERO_BANNER = '/assets/aistudio/__________________________0e3f70be.png';
  const DEFAULT_HOME_HERO_BANNER_GU = '/assets/aistudio/__________________________0e3f70be.png';
  const DEFAULT_HOME_HERO_BANNER_HI = '/assets/aistudio/hindi_banner_baedca50.png';
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>(() => getCachedCategoryImages());
  const [isUploadingHeroBanner, setIsUploadingHeroBanner] = useState(false);
  const [uploadingBannerLang, setUploadingBannerLang] = useState<'gu' | 'hi' | 'en' | null>(null);
  const [isEditingHeroBanner, setIsEditingHeroBanner] = useState(false);
  const [heroBannerCustomUrlInput, setHeroBannerCustomUrlInput] = useState('');

  useEffect(() => {
    const handleCatImagesSync = () => {
      fetchCategoryImages().then(imgs => {
        if (imgs && typeof imgs === 'object') {
          setCategoryImages(imgs);
        }
      }).catch(() => {});
    };
    handleCatImagesSync();
    window.addEventListener('locohelp_category_images_updated', handleCatImagesSync);
    window.addEventListener('storage', handleCatImagesSync);
    return () => {
      window.removeEventListener('locohelp_category_images_updated', handleCatImagesSync);
      window.removeEventListener('storage', handleCatImagesSync);
    };
  }, []);

  const handleUploadLanguageHeroBanner = async (
    langKey: 'gu' | 'hi' | 'en',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const storageKey = `__home_hero_banner_${langKey}__`;
    const langLabel = langKey === 'gu' ? 'ગુજરાતી (GU)' : langKey === 'hi' ? 'हिंदी (HI)' : 'English (EN)';
    setIsUploadingHeroBanner(true);
    setUploadingBannerLang(langKey);
    try {
      const check = await validateUploadedFile(file, { allowPdf: false, maxSizeBytes: 25 * 1024 * 1024 });
      if (!check.valid) {
        showToast(check.error || 'अमान्य इमेज फ़ाइल (कृपया JPG, PNG या WebP चुनें)');
        return;
      }
      let compressedUrl: string;
      try {
        compressedUrl = await compressImageToWebP(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.82, folder: 'banners' });
      } catch (_compErr) {
        compressedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      const res = await saveCategoryImageOnServer(storageKey, compressedUrl);
      if (res.success) {
        const finalUrl = (res.images && res.images[storageKey]) || res.imageUrl || compressedUrl;
        setCategoryImages(prev => ({
          ...prev,
          [storageKey]: finalUrl,
          ...(langKey === 'gu' ? { __home_hero_banner__: finalUrl } : {})
        }));
        if (langKey === 'gu') {
          await saveCategoryImageOnServer('__home_hero_banner__', finalUrl).catch(() => {});
        }
        showToast(`✅ ${langLabel} होम पेज बैनर सफलतापूर्वक अपलोड हो गया!`);
      } else {
        showToast(res.error || 'बैनर अपडेट करने में त्रुटि आई');
      }
    } catch (err: any) {
      showToast(err?.message || 'बैनर अपलोड करने में समस्या आई');
    } finally {
      setIsUploadingHeroBanner(false);
      setUploadingBannerLang(null);
      e.target.value = '';
    }
  };

  const handleResetLanguageHeroBanner = async (langKey: 'gu' | 'hi' | 'en') => {
    const storageKey = `__home_hero_banner_${langKey}__`;
    const langLabel = langKey === 'gu' ? 'ગુજરાતી (GU)' : langKey === 'hi' ? 'हिंदी (HI)' : 'English (EN)';
    setIsUploadingHeroBanner(true);
    setUploadingBannerLang(langKey);
    try {
      const res = await deleteCategoryImageOnServer(storageKey);
      if (langKey === 'gu') {
        await deleteCategoryImageOnServer('__home_hero_banner__').catch(() => {});
      }
      if (res.success) {
        setCategoryImages(prev => {
          const next = { ...prev };
          delete next[storageKey];
          if (langKey === 'gu') delete next['__home_hero_banner__'];
          return next;
        });
        showToast(`🔄 ${langLabel} डिफ़ॉल्ट बैनर फिर से सेट हो गया!`);
      } else {
        showToast(res.error || 'बैनर रीसेट करने में त्रुटि आई');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error resetting banner');
    } finally {
      setIsUploadingHeroBanner(false);
      setUploadingBannerLang(null);
    }
  };

  const handleUploadHomeHeroBanner = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleUploadLanguageHeroBanner('gu', e);

  const handleSaveHeroBannerCustomUrl = async () => {
    const cleanUrl = heroBannerCustomUrlInput.trim();
    if (!cleanUrl) {
      showToast('⚠️ कृपया बैनर इमेज URL डालें या फोटो अपलोड करें');
      return;
    }
    setIsUploadingHeroBanner(true);
    try {
      const res = await saveCategoryImageOnServer('__home_hero_banner_gu__', cleanUrl);
      await saveCategoryImageOnServer('__home_hero_banner__', cleanUrl).catch(() => {});
      if (res.success) {
        const finalUrl = (res.images && res.images['__home_hero_banner_gu__']) || res.imageUrl || cleanUrl;
        setCategoryImages(prev => ({
          ...prev,
          __home_hero_banner_gu__: finalUrl,
          __home_hero_banner__: finalUrl
        }));
        setIsEditingHeroBanner(false);
        showToast('✅ होम पेज बैनर सफलतापूर्वक सेव हो गया!');
      } else {
        showToast(res.error || 'बैनर एडिट करने में त्रुटि आई');
      }
    } catch (err: any) {
      showToast(err?.message || 'बैनर सेव करने में समस्या आई');
    } finally {
      setIsUploadingHeroBanner(false);
    }
  };

  const handleDeleteHomeHeroBanner = async () => {
    setIsUploadingHeroBanner(true);
    try {
      const res = await saveCategoryImageOnServer('__home_hero_banner__', '__deleted__');
      if (res.success) {
        setCategoryImages(prev => ({ ...prev, __home_hero_banner__: '__deleted__' }));
        setIsEditingHeroBanner(false);
        showToast('🗑️ होम पेज मेन बैनर हटाया गया!');
      } else {
        showToast(res.error || 'बैनर डिलीट करने में त्रुटि आई');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error deleting banner');
    } finally {
      setIsUploadingHeroBanner(false);
    }
  };

  const handleResetHomeHeroBanner = async () => {
    await handleResetLanguageHeroBanner('gu');
  };

  // =========================================================================
  // 5 DEDICATED 16:9 PROMO AD BANNERS ("Sponsored Local Offers & Advertisements")
  // =========================================================================
  const [uploadingPromoAdSlot, setUploadingPromoAdSlot] = useState<number | null>(null);
  const [editingPromoAdSlot, setEditingPromoAdSlot] = useState<number | null>(null);
  const [promoAdCustomUrlInput, setPromoAdCustomUrlInput] = useState('');
  const [promoAdCustomTitleInput, setPromoAdCustomTitleInput] = useState('');
  const [promoAdCustomLinkInput, setPromoAdCustomLinkInput] = useState('');

  const handleUploadPromoAdBanner = async (
    slotIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const storageKey = `__promo_ad_banner_${slotIndex}__`;
    setUploadingPromoAdSlot(slotIndex);
    try {
      const check = await validateUploadedFile(file, { allowPdf: false, maxSizeBytes: 25 * 1024 * 1024 });
      if (!check.valid) {
        showToast(check.error || 'અમાન્ય ઈમેજ ફાઇલ (JPG, PNG અથવા WebP પસંદ કરો)');
        return;
      }
      let compressedUrl: string;
      try {
        compressedUrl = await compressImageToWebP(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85, folder: 'banners' });
      } catch (_compErr) {
        compressedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      const res = await saveCategoryImageOnServer(storageKey, compressedUrl);
      if (res.success) {
        const finalUrl = (res.images && res.images[storageKey]) || res.imageUrl || compressedUrl;
        setCategoryImages(prev => ({
          ...prev,
          [storageKey]: finalUrl
        }));
        try {
          window.dispatchEvent(new CustomEvent('locohelp_category_images_updated'));
        } catch {}
        showToast(`✅ સ્લોટ ${slotIndex} નું 16:9 જાહેરાત બેનર સફળતાપૂર્વક અપલોડ થયું!`);
      } else {
        showToast(res.error || 'બેનર અપડેટ કરવામાં ક્ષતિ આવી');
      }
    } catch (err: any) {
      showToast(err?.message || 'બેનર અપલોડ કરવામાં સમસ્યા આવી');
    } finally {
      setUploadingPromoAdSlot(null);
      e.target.value = '';
    }
  };

  const handleDeletePromoAdBanner = async (slotIndex: number) => {
    const storageKey = `__promo_ad_banner_${slotIndex}__`;
    const linkKey = `__promo_ad_banner_link_${slotIndex}__`;
    const titleKey = `__promo_ad_banner_title_${slotIndex}__`;
    setUploadingPromoAdSlot(slotIndex);
    try {
      const res = await deleteCategoryImageOnServer(storageKey);
      await Promise.all([
        deleteCategoryImageOnServer(linkKey).catch(() => {}),
        deleteCategoryImageOnServer(titleKey).catch(() => {}),
      ]);
      if (res.success) {
        setCategoryImages(prev => {
          const next = { ...prev };
          delete next[storageKey];
          delete next[linkKey];
          delete next[titleKey];
          return next;
        });
        if (editingPromoAdSlot === slotIndex) {
          setEditingPromoAdSlot(null);
        }
        try {
          window.dispatchEvent(new CustomEvent('locohelp_category_images_updated'));
        } catch {}
        showToast(`🗑️ સ્લોટ ${slotIndex} નું જાહેરાત બેનર હટાવી દીધું!`);
      } else {
        showToast(res.error || 'બેનર ડિલીટ કરવામાં ક્ષતિ આવી');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error deleting ad banner');
    } finally {
      setUploadingPromoAdSlot(null);
    }
  };

  const handleSavePromoAdCustomValues = async (slotIndex: number) => {
    const storageKey = `__promo_ad_banner_${slotIndex}__`;
    const linkKey = `__promo_ad_banner_link_${slotIndex}__`;
    const titleKey = `__promo_ad_banner_title_${slotIndex}__`;
    const cleanImgUrl = promoAdCustomUrlInput.trim();
    const cleanTitle = promoAdCustomTitleInput.trim();
    const cleanLinkUrl = promoAdCustomLinkInput.trim();

    if (!cleanImgUrl) {
      showToast('કૃપા કરીને માન્ય ઈમેજ URL દાખલ કરો અથવા ફોટો અપલોડ કરો');
      return;
    }

    setUploadingPromoAdSlot(slotIndex);
    try {
      const resImg = await saveCategoryImageOnServer(storageKey, cleanImgUrl);
      if (cleanTitle) {
        await saveCategoryImageOnServer(titleKey, cleanTitle).catch(() => {});
      } else {
        await deleteCategoryImageOnServer(titleKey).catch(() => {});
      }
      if (cleanLinkUrl) {
        await saveCategoryImageOnServer(linkKey, cleanLinkUrl).catch(() => {});
      } else {
        await deleteCategoryImageOnServer(linkKey).catch(() => {});
      }

      if (resImg.success) {
        const finalUrl = (resImg.images && resImg.images[storageKey]) || resImg.imageUrl || cleanImgUrl;
        setCategoryImages(prev => {
          const next = {
            ...prev,
            [storageKey]: finalUrl,
          };
          if (cleanTitle) next[titleKey] = cleanTitle;
          else delete next[titleKey];
          if (cleanLinkUrl) next[linkKey] = cleanLinkUrl;
          else delete next[linkKey];
          return next;
        });
        try {
          window.dispatchEvent(new CustomEvent('locohelp_category_images_updated'));
        } catch {}
        showToast(`✅ સ્લોટ ${slotIndex} ની જાહેરાત વિગતો સેવ થઈ ગઈ!`);
        setEditingPromoAdSlot(null);
      } else {
        showToast(resImg.error || 'સેવ કરવામાં ક્ષતિ આવી');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving values');
    } finally {
      setUploadingPromoAdSlot(null);
    }
  };

  // Action Loading States
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // View Full Details / ID Document Modal State
  const [viewingItem, setViewingItem] = useState<{ module: AdminModuleId; data: any } | null>(null);

  // Edit Entry Modal State
  const [editingItem, setEditingItem] = useState<{
    module: AdminModuleId;
    id: string;
    nameOrTitle: string;
    categoryOrRole: string;
    phone: string;
    email: string;
    areaOrLocation: string;
    descriptionOrBio: string;
    salaryOrPrice: string;
    photoUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
    raw: any;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Admin Direct Create / Register Modal State (Email & Mobile 100% Optional, No OTP, Auto-Approved)
  const [creatingItem, setCreatingItem] = useState<{
    module: 'businesses' | 'helpers' | 'simple_users' | 'job_seekers' | 'employers';
    allowModuleSwitch?: boolean;
    nameOrTitle: string;
    ownerOrRole: string;
    category: string;
    customCategoryName: string;
    phone: string;
    email: string;
    areaOrLocation: string;
    address: string;
    timingsOrExperience: string;
    educationOrVacancyType: string;
    salaryOrUrgency: string;
    description: string;
    photoUrl: string;
    photos: string[];
    resumeUrl: string;
    resumeFileName: string;
  } | null>(null);
  const [isSavingCreate, setIsSavingCreate] = useState(false);

  const openAdminCreateModal = (
    mod: 'businesses' | 'helpers' | 'simple_users' | 'job_seekers' | 'employers',
    allowModuleSwitch: boolean = false
  ) => {
    setCreatingItem({
      module: mod,
      allowModuleSwitch,
      nameOrTitle: '',
      ownerOrRole: '',
      category: mod === 'helpers' || mod === 'simple_users' ? 'plumber' : mod === 'businesses' ? 'other' : 'Retail & Services',
      customCategoryName: mod === 'businesses' ? 'Retail & Services' : '',
      phone: '',
      email: '',
      areaOrLocation: '',
      address: '',
      timingsOrExperience: mod === 'businesses' ? '9:00 AM - 9:00 PM' : mod === 'helpers' || mod === 'simple_users' ? '2+ Years' : '',
      educationOrVacancyType: mod === 'job_seekers' ? '12th Pass / Graduate' : 'Full-Time',
      salaryOrUrgency: '',
      description: '',
      photoUrl: '',
      photos: [],
      resumeUrl: '',
      resumeFileName: ''
    });
  };
  const [isCreateAdModalOpen, setIsCreateAdModalOpen] = useState(false);
  const [adBusinessName, setAdBusinessName] = useState('');
  const [adLogo, setAdLogo] = useState('⚡');
  const [adCategory, setAdCategory] = useState('Sponsored Banner');
  const [adOfferBadge, setAdOfferBadge] = useState('🔥 Featured Ad');
  const [adOfferTitle, setAdOfferTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adPhotoUrl, setAdPhotoUrl] = useState('/assets/aistudio/advertisement_30c9824f.png');
  const [adPhotos, setAdPhotos] = useState<string[]>([]);
  const [adIsActive, setAdIsActive] = useState<boolean>(true);
  const [adDistance, setAdDistance] = useState('0.8');
  const [adArea, setAdArea] = useState('');
  const [adDestinationUrl, setAdDestinationUrl] = useState('');
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);

  // Reset filters when switching dedicated pages
  const openModule = (mod: AdminModuleId) => {
    setActiveModule(mod);
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedMainCatFilter('all');
    setSelectedSubCatFilter('all');
    setDateFilter('all');
    setLocationFilter('all');
    setIsMoreMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // 2-STEP ADMIN LOGIN HANDLERS (/bapu-admin)
  // ==========================================
  const handlePasswordStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasswordInput.trim()) {
      setLoginError('कृपया एडमिन पासवर्ड दर्ज करें (Please enter Admin Password)');
      return;
    }
    setLoginError(null);
    setIsSendingAdminOtp(true);
    const res = await loginAdminOnServer(adminPasswordInput.trim(), undefined, selectedAdminEmail);
    setIsSendingAdminOtp(false);

    if (res.requiresOtp) {
      setAdminOtpInput('');
      setAdminAuthStep('otp');
      showToast(`📧 6-अंकों का वेरिफिकेशन OTP ${selectedAdminEmail} पर भेज दिया गया है!`);
    } else if (res.success && res.token) {
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
      try {
        sessionStorage.setItem('locohelp_admin_logged_in', 'true');
        sessionStorage.setItem('locohelp_admin_email', selectedAdminEmail);
        localStorage.setItem('locohelp_admin_email', selectedAdminEmail);
      } catch {}
      showToast('🔓 Welcome to LocoHelp Admin Dashboard!');
    } else {
      setLoginError(res.error || 'गलत एडमिन पासवर्ड! कृपया सही पासवर्ड डालें।');
    }
  };

  const handleOtpStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminOtpInput || adminOtpInput.trim().length < 6) {
      setLoginError(`कृपया ${selectedAdminEmail} पर भेजा गया 6-अंकों का OTP दर्ज करें।`);
      return;
    }
    setLoginError(null);
    setIsSendingAdminOtp(true);
    const res = await loginAdminOnServer(adminPasswordInput.trim(), adminOtpInput.trim(), selectedAdminEmail);
    setIsSendingAdminOtp(false);

    if (res.success && res.token) {
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
      setAdminOtpInput('');
      setAdminAuthStep('password');
      try {
        sessionStorage.setItem('locohelp_admin_logged_in', 'true');
        sessionStorage.setItem('locohelp_admin_email', selectedAdminEmail);
        localStorage.setItem('locohelp_admin_email', selectedAdminEmail);
      } catch {}
      showToast('🔓 2-Step Verification सफल! एडमिन डैशबोर्ड में आपका स्वागत है।');
    } else {
      setLoginError(res.error || 'गलत या समाप्त हो चुका OTP! कृपया दोबारा जांचें।');
    }
  };

  const handleRequestForgotPasswordOtp = async () => {
    setLoginError(null);
    setIsSendingAdminOtp(true);
    const res = await sendAdminForgotPasswordOtpOnServer(selectedAdminEmail);
    setIsSendingAdminOtp(false);

    if (res.success) {
      setForgotOtpSent(true);
      setAdminAuthStep('forgot_password');
      showToast(`📧 पासवर्ड रीसेट OTP ${selectedAdminEmail} पर भेज दिया गया है!`);
    } else {
      setLoginError(res.error || `${selectedAdminEmail} पर OTP भेजने में समस्या आई।`);
    }
  };

  const handleForgotPasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtpInput || forgotOtpInput.trim().length < 6) {
      setLoginError(`कृपया ${selectedAdminEmail} पर आया 6-अंकों का OTP दर्ज करें।`);
      return;
    }
    if (!forgotNewPasswordInput || forgotNewPasswordInput.trim().length < 6) {
      setLoginError('नया एडमिन पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।');
      return;
    }
    if (forgotNewPasswordInput.trim() !== forgotConfirmPasswordInput.trim()) {
      setLoginError('नए पासवर्ड आपस में मेल नहीं खा रहे हैं।');
      return;
    }

    setLoginError(null);
    setIsSendingAdminOtp(true);
    const res = await resetAdminPasswordWithOtpOnServer(
      forgotOtpInput.trim(),
      forgotNewPasswordInput.trim(),
      selectedAdminEmail
    );
    setIsSendingAdminOtp(false);

    if (res.success && res.token) {
      setIsAdminAuthenticated(true);
      setForgotOtpInput('');
      setForgotNewPasswordInput('');
      setForgotConfirmPasswordInput('');
      setAdminAuthStep('password');
      try {
        sessionStorage.setItem('locohelp_admin_logged_in', 'true');
      } catch {}
      showToast('✅ एडमिन पासवर्ड सफलतापूर्वक रीसेट हो गया और डैशबोर्ड खुल गया!');
    } else {
      setLoginError(res.error || 'गलत OTP या पासवर्ड रीसेट विफल!');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    if (!changeOldPassword.trim()) {
      setChangePasswordError('कृपया वर्तमान पासवर्ड दर्ज करें (Current Password is required)');
      return;
    }
    if (changeNewPassword.trim().length < 6) {
      setChangePasswordError('नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Min 6 characters)');
      return;
    }
    if (changeNewPassword.trim() !== changeConfirmPassword.trim()) {
      setChangePasswordError('नया पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खा रहे हैं (Passwords do not match)');
      return;
    }
    setIsUpdatingPassword(true);
    const res = await changeAdminPasswordOnServer(changeOldPassword.trim(), changeNewPassword.trim());
    setIsUpdatingPassword(false);
    if (res.success) {
      setIsChangePasswordOpen(false);
      setChangeOldPassword('');
      setChangeNewPassword('');
      setChangeConfirmPassword('');
      setChangePasswordError(null);
      showToast('✅ Admin Password successfully changed!');
    } else {
      setChangePasswordError(res.error || 'Failed to update Admin password');
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminAuthStep('password');
    setAdminOtpInput('');
    setAdminPasswordInput('');
    try {
      sessionStorage.removeItem('locohelp_admin_logged_in');
      sessionStorage.removeItem('locohelp_admin_token');
      localStorage.removeItem('locohelp_admin_token');
    } catch {}
    showToast('🔒 Logged out from Admin Panel');
  };

  // ==========================================
  // LOAD ALL DATA ACROSS ALL 7 MODULES
  // ==========================================
  const loadAllData = async () => {
    setIsRefreshing(true);
    try {
      const getLocalDeletedSet = (key: string): Set<string> => {
        try {
          const raw = localStorage.getItem(key);
          return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch {
          return new Set();
        }
      };
      const deletedHelpersSet = getLocalDeletedSet('locohelp_deleted_helpers');
      const deletedUsersSet = getLocalDeletedSet('locohelp_deleted_users');
      const deletedPostsSet = getLocalDeletedSet('locohelp_deleted_posts');
      const deletedShopsSet = getLocalDeletedSet('locohelp_deleted_shops');

      // 1. Help Posts (Intents) - Auto-filter out dummy/fake posts (#m660z, #t9140, etc.)
      const liveIntents = await fetchLiveIntents();
      if (Array.isArray(liveIntents)) {
        const cleanIntents = liveIntents.filter(i => {
          if (!i || !i.id || deletedPostsSet.has(String(i.id))) return false;
          const idLow = String(i.id).toLowerCase();
          if (
            idLow.includes('m660z') ||
            idLow.includes('t9140') ||
            idLow.startsWith('seed_') ||
            idLow.startsWith('sample_') ||
            idLow.startsWith('mock_') ||
            idLow.startsWith('dummy_')
          ) {
            return false;
          }
          return true;
        });
        setIntents(cleanIntents);
      }

      // 2. Helpers & 4. Businesses/Shops
      let loadedHelpersList: any[] = [];
      try {
        const fetchedHelpers = await getHelpers(true);
        const sourceHelpers = Array.isArray(fetchedHelpers) ? fetchedHelpers : getFreeHelperProfiles(true);
        const mergedHelpersMap = new Map<string, any>();
        (Array.isArray(sourceHelpers) ? sourceHelpers : []).forEach(h => {
          if (!h || !h.id || deletedHelpersSet.has(String(h.id)) || deletedUsersSet.has(String(h.id))) return;
          const existing = mergedHelpersMap.get(h.id) || {};
          const rawSt = String(h.status || existing.status || '').toLowerCase();
          const isRejected = rawSt === 'rejected';
          const isApproved = !isRejected && Boolean(
            rawSt === 'approved' ||
            h.isVerified === true ||
            h.is_verified === true ||
            h.is_approved === true ||
            existing.status === 'approved' ||
            existing.isVerified === true
          );
          const norm = normalizeCategorySlug(
            h.categoryId || h.category || existing.categoryId || existing.category || 'other',
            h.skills || existing.skills,
            h.customCategoryName || existing.customCategoryName
          );
          mergedHelpersMap.set(h.id, {
            ...existing,
            ...h,
            categoryId: norm.categoryId,
            category: norm.categoryId,
            customCategoryName: h.customCategoryName || existing.customCategoryName || norm.customCategoryName,
            status: isRejected ? 'rejected' : isApproved ? 'approved' : 'pending',
            isVerified: isApproved
          });
        });
        loadedHelpersList = Array.from(mergedHelpersMap.values());
        setHelpers(loadedHelpersList);
      } catch {
        loadedHelpersList = getFreeHelperProfiles(true).filter(
          (h: any) => h && h.id && !deletedHelpersSet.has(String(h.id)) && !deletedUsersSet.has(String(h.id))
        );
        setHelpers(loadedHelpersList);
      }

      try {
        const fetchedShops = await getShops(true);
        if (Array.isArray(fetchedShops)) {
          setBusinesses(
            fetchedShops.filter((s: any) => s && s.id && !deletedShopsSet.has(String(s.id)))
          );
        }
      } catch {}

      // 3. Simple User Profiles & Identity Verifications
      try {
        const [usersList, liveVerifs] = await Promise.all([
          fetchAdminUsersOnServer(),
          fetchAdminVerifications()
        ]);
        if (Array.isArray(liveVerifs)) {
          setVerificationsList(liveVerifs);
        }

        // Keep Simple User Profiles 100% separate from Service Providers (helpers)
        const helperIdSet = new Set<string>();
        loadedHelpersList.forEach(h => {
          if (h && h.id) helperIdSet.add(String(h.id).toLowerCase());
        });

        const userVerifs = (Array.isArray(liveVerifs) ? liveVerifs : []).filter(
          v =>
            v.entityType === 'user_profile' &&
            !String(v.id || '').startsWith('verif_hlp_') &&
            !String(v.entityId || '').startsWith('helper_') &&
            !helperIdSet.has(String(v.entityId || '').toLowerCase())
        );
        const combinedUsersMap = new Map<string, any>();

        if (Array.isArray(usersList)) {
          usersList.forEach(u => {
            if (!u || !u.id || deletedUsersSet.has(String(u.id)) || deletedHelpersSet.has(String(u.id))) return;
            if (String(u.id).startsWith('helper_') || helperIdSet.has(String(u.id).toLowerCase())) return;
            const rawCat = u.categoryId || u.category || '';
            const normCat = rawCat
              ? normalizeCategorySlug(rawCat, u.skills, u.customCategoryName)
              : { categoryId: 'other', customCategoryName: '' };
            const uStatusLow = String(u.status || '').toLowerCase();
            const isRejected = uStatusLow === 'rejected';
            const isApproved =
              !isRejected &&
              Boolean(
                uStatusLow === 'approved' ||
                  u.isVerified === true ||
                  u.is_verified === true
              );
            combinedUsersMap.set(u.id, {
              ...u,
              categoryId: normCat.categoryId,
              category: normCat.categoryId,
              customCategoryName: u.customCategoryName || normCat.customCategoryName,
              skills: u.skills || '',
              area: u.area || u.address || '',
              status: isRejected ? 'rejected' : isApproved ? 'approved' : 'pending',
              isVerified: isApproved
            });
          });
        }

        userVerifs.forEach(uv => {
          const targetKey = String(uv.entityId || uv.userId || uv.id || '');
          if (!targetKey || deletedUsersSet.has(targetKey) || deletedHelpersSet.has(targetKey)) return;
          if (targetKey.startsWith('helper_') || helperIdSet.has(targetKey.toLowerCase())) return;
          const existing =
            combinedUsersMap.get(String(uv.entityId || '')) ||
            combinedUsersMap.get(String(uv.userId || '')) ||
            (uv.userEmail ? Array.from(combinedUsersMap.values()).find(x => x.email && x.email.toLowerCase() === uv.userEmail.toLowerCase()) : undefined);

          const uvStatusLow = String(uv.status || '').toLowerCase();
          if (existing) {
            const exStatusLow = String(existing.status || '').toLowerCase();
            const isRejected = exStatusLow === 'rejected' || uvStatusLow === 'rejected';
            // Never let a stale 'pending' verification overwrite an already-approved user profile!
            const isApproved =
              !isRejected &&
              Boolean(
                exStatusLow === 'approved' ||
                  existing.isVerified === true ||
                  uvStatusLow === 'approved'
              );
            combinedUsersMap.set(existing.id, {
              ...existing,
              verificationId: uv.id,
              idDocumentType: uv.idDocumentType,
              idDocumentWatermarked: uv.idDocumentWatermarked || existing.idDocumentWatermarked,
              status: isRejected ? 'rejected' : isApproved ? 'approved' : 'pending',
              isVerified: isApproved
            });
          } else {
            const rawCat = uv.category || '';
            const normCat = rawCat
              ? normalizeCategorySlug(rawCat, '', '')
              : { categoryId: 'other', customCategoryName: '' };
            const isRejected = uvStatusLow === 'rejected';
            const isApproved = !isRejected && uvStatusLow === 'approved';
            const finalId = uv.entityId || uv.userId || uv.id;
            combinedUsersMap.set(finalId, {
              id: finalId,
              uid: finalId,
              verificationId: uv.id,
              name: uv.userName || 'Community Member',
              email: uv.userEmail || '',
              phone: uv.userPhone || '',
              area: uv.area || 'Local Area',
              categoryId: normCat.categoryId,
              category: normCat.categoryId,
              customCategoryName: normCat.customCategoryName || '',
              idDocumentType: uv.idDocumentType,
              idDocumentWatermarked: uv.idDocumentWatermarked,
              status: isRejected ? 'rejected' : isApproved ? 'approved' : 'pending',
              isVerified: isApproved,
              createdAt: uv.submittedAt || (uv as any).createdAt
            });
          }
        });

        // Deduplicate simpleUsers by normalized email and 10-digit mobile number while preserving approved status
        const rawCombinedUsers = Array.from(combinedUsersMap.values()).sort((a, b) => {
          const aAppr = a.status === 'approved' || a.isVerified === true ? 1 : 0;
          const bAppr = b.status === 'approved' || b.isVerified === true ? 1 : 0;
          if (bAppr !== aAppr) return bAppr - aAppr;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        const byEmailIdx = new Map<string, number>();
        const byPhoneIdx = new Map<string, number>();
        const dedupedSimpleUsers: any[] = [];
        for (const u of rawCombinedUsers) {
          const eNorm = String(u.email || '').trim().toLowerCase();
          const pDigits = String(u.phone || '').replace(/\D/g, '').slice(-10);
          const existingIdx =
            (eNorm && byEmailIdx.has(eNorm) ? byEmailIdx.get(eNorm) : undefined) ??
            (pDigits.length === 10 && byPhoneIdx.has(pDigits) ? byPhoneIdx.get(pDigits) : undefined);

          if (existingIdx !== undefined) {
            const prev = dedupedSimpleUsers[existingIdx];
            const isMergedApproved =
              prev.status === 'approved' || u.status === 'approved' || prev.isVerified === true || u.isVerified === true;
            dedupedSimpleUsers[existingIdx] = {
              ...u,
              ...prev,
              name: prev.name && prev.name !== 'Community Member' ? prev.name : (u.name || prev.name),
              phone: prev.phone || u.phone || '',
              email: prev.email || u.email || '',
              area: prev.area || u.area || '',
              skills: prev.skills || u.skills || '',
              status: isMergedApproved ? 'approved' : (prev.status || u.status || 'pending'),
              isVerified: isMergedApproved
            };
            continue;
          }
          const idx = dedupedSimpleUsers.length;
          dedupedSimpleUsers.push(u);
          if (eNorm) byEmailIdx.set(eNorm, idx);
          if (pDigits.length === 10) byPhoneIdx.set(pDigits, idx);
        }
        setSimpleUsers(dedupedSimpleUsers);
      } catch {}

      // 5 & 6. Job Seekers & Employer Registrations / Job Postings
      const liveJobs = await fetchJobPortalItems({ status: 'all' });
      if (Array.isArray(liveJobs)) {
        setJobPortalItems(liveJobs);
      }

      // 7. User Feedback & Reports
      try {
        const res = await fetch('/api/reports', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setReports(data);
        }
      } catch {}

      // Bonus: Sponsored Ads, Security Vault, Public Suggestions, Site Lock & Customer Reviews
      const [liveAds, liveVault, liveSugs, liveLock, liveCatImgs, liveRevs] = await Promise.all([
        fetchLiveAds(),
        fetchAdminSecurityVault(),
        fetchPublicSuggestions(),
        fetchAdminSiteLock(),
        fetchCategoryImages(),
        fetchAdminHelperReviews()
      ]);
      if (Array.isArray(liveAds)) {
        setAds(liveAds);
      }
      if (Array.isArray(liveVault)) {
        setSecurityVaultRecords(liveVault);
      }
      if (Array.isArray(liveSugs)) {
        setPublicSuggestions(liveSugs);
      }
      if (liveLock && typeof liveLock.isLocked === 'boolean') {
        setSiteLockState({ isLocked: liveLock.isLocked, accessPin: liveLock.accessPin || '1540' });
      }
      if (liveCatImgs && typeof liveCatImgs === 'object') {
        setCategoryImages(liveCatImgs);
      }
      if (Array.isArray(liveRevs)) {
        setAdminReviews(liveRevs);
      }
    } catch (err) {
      console.warn('Admin load data warning:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Live PostgreSQL Status & Repair State
  const [dbSyncStatus, setDbSyncStatus] = useState<{
    connected: boolean;
    tables: string[];
    message: string;
    syncing: boolean;
  }>({
    connected: false,
    tables: [],
    message: '',
    syncing: false
  });

  const handleSyncAndRepairPostgres = async (silent: boolean = false) => {
    setDbSyncStatus(prev => ({ ...prev, syncing: true }));
    if (!silent) {
      showToast('⏳ Initializing & Syncing Railway PostgreSQL Tables...');
    }
    try {
      const res = await initAndRepairPostgresDatabaseOnServer();
      const defaultMsg = '✅ PostgreSQL Tables Initialized & Synced: categories, profiles, users, shops, ads, posts';
      if (res.success) {
        const finalMsg = res.message || defaultMsg;
        setDbSyncStatus({
          connected: Boolean(res.postgresConnected),
          tables: res.tables && res.tables.length > 0 ? res.tables : ['categories', 'profiles', 'users', 'shops', 'ads', 'posts'],
          message: finalMsg,
          syncing: false
        });
        if (!silent) {
          showToast(finalMsg);
          await loadAllData();
        }
      } else {
        setDbSyncStatus(prev => ({
          ...prev,
          syncing: false,
          message: res.error || '⚠️ Failed to verify PostgreSQL tables'
        }));
        if (!silent) {
          showToast(`❌ ${res.error || 'Failed to sync & repair PostgreSQL tables'}`);
        }
      }
    } catch (err: any) {
      setDbSyncStatus(prev => ({ ...prev, syncing: false }));
      if (!silent) {
        showToast(`❌ ${err?.message || 'PostgreSQL sync error'}`);
      }
    }
  };

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    // Automatically purge any dummy/seed posts (#m660z, #t9140) on admin load
    fetch('/api/admin/clear-dummy-data', {
      method: 'POST',
      headers: getAuthHeaders()
    }).catch(() => {});
    handleSyncAndRepairPostgres(true);
    loadAllData();
    const interval = setInterval(() => {
      if (!document.hidden) loadAllData();
    }, 20000);
    return () => clearInterval(interval);
  }, [isAdminAuthenticated]);

  // Prevent browser back button from accidentally exiting Admin Panel into main website
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const pushAdminState = () => {
      try {
        window.history.pushState({ locohelpAdmin: true }, '');
      } catch (e) {}
    };

    pushAdminState();

    const handlePopState = (e: PopStateEvent) => {
      if (activeModule !== 'home') {
        setActiveModule('home');
        pushAdminState();
      } else {
        pushAdminState();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAdminAuthenticated, activeModule]);


  // Helper to get normalized status ('pending' | 'approved' | 'rejected') case-insensitively
  const getNormalizedStatus = (item: any, mod: AdminModuleId): 'pending' | 'approved' | 'rejected' => {
    if (!item) return 'pending';
    const rawSt = String(item.status || '').trim().toLowerCase();
    if (rawSt === 'rejected' || rawSt === 'dismissed') return 'rejected';
    if (
      rawSt === 'approved' ||
      rawSt === 'resolved' ||
      rawSt === 'active' ||
      item.is_approved === true ||
      item.isApproved === true ||
      item.isVerified === true ||
      item.is_verified === true ||
      item.verified === true
    ) {
      return 'approved';
    }
    if (rawSt === 'pending') return 'pending';
    if (mod === 'help_posts') {
      return item.isApproved === false ? 'pending' : 'approved';
    }
    return 'pending';
  };

  // Resolve Main Category & Sub-Category metadata for any helper / user profile
  const getItemCategoryInfo = (item: any) => {
    const rawCat =
      item?.categoryId ||
      item?.category_id ||
      item?.category ||
      item?.service ||
      item?.categoryLabel ||
      '';
    const norm = normalizeCategorySlug(rawCat, item?.skills, item?.customCategoryName);
    const subCatObj = CATEGORIES.find(c => c.id === norm.categoryId) || CATEGORIES.find(c => c.id === 'other')!;
    const mainCatObj =
      MASTER_CATEGORIES.find(m => m.id === (subCatObj.mainCategoryId || subCatObj.masterCategory)) ||
      MASTER_CATEGORIES[MASTER_CATEGORIES.length - 1];
    const displaySubName =
      norm.categoryId === 'other' && (item?.customCategoryName || norm.customCategoryName)
        ? `${subCatObj.nameEn} (${item?.customCategoryName || norm.customCategoryName})`
        : subCatObj.nameEn;
    return {
      subCatId: subCatObj.id,
      subCatObj,
      mainCatId: mainCatObj.id,
      mainCatObj,
      displaySubName,
      customCategoryName: item?.customCategoryName || norm.customCategoryName || ''
    };
  };

  // Find associated watermarked Live Selfie / ID doc from item or verificationsList
  const getItemIdDoc = (item: any): string | undefined => {
    const isRealDocUrl = (val: any): boolean => {
      if (!val || typeof val !== 'string') return false;
      const s = val.trim();
      if (
        !s ||
        s === '__deleted__' ||
        s === 'null' ||
        s === 'undefined' ||
        s === 'https://lh3.googleusercontent.com/a/default-user'
      ) {
        return false;
      }
      return (
        s.startsWith('http://') ||
        s.startsWith('https://') ||
        s.startsWith('data:image/') ||
        s.startsWith('data:application/pdf') ||
        s.startsWith('/uploads/')
      );
    };
    if (isRealDocUrl(item?.idDocumentWatermarked)) return item.idDocumentWatermarked;
    if (isRealDocUrl(item?.liveSelfieUrl)) return item.liveSelfieUrl;
    if (isRealDocUrl(item?.idDocUrl)) return item.idDocUrl;
    if (isRealDocUrl(item?.avatarUrl)) return item.avatarUrl;
    if (isRealDocUrl(item?.avatar_url)) return item.avatar_url;
    if (isRealDocUrl(item?.profilePhoto)) return item.profilePhoto;

    const itemPhoneDigits = String(item?.phone || item?.userPhone || '').replace(/\D/g, '').slice(-10);
    const match = verificationsList.find(v => {
      if (!isRealDocUrl(v?.idDocumentWatermarked)) return false;
      if (v.entityId && (v.entityId === item?.id || v.entityId === item?.uid)) return true;
      if (v.userId && (v.userId === item?.id || v.userId === item?.uid || v.userId === item?.userId)) return true;
      if (item?.verificationId && v.id === item.verificationId) return true;
      if (item?.email && v.userEmail && v.userEmail.toLowerCase() === String(item.email).toLowerCase()) return true;
      if (itemPhoneDigits.length === 10) {
        const vPh = String(v.userPhone || '').replace(/\D/g, '').slice(-10);
        if (vPh === itemPhoneDigits) return true;
      }
      return false;
    });
    if (isRealDocUrl(match?.idDocumentWatermarked)) return match?.idDocumentWatermarked;
    if ((activeModule === 'simple_users' || activeModule === 'helpers') && isRealDocUrl(item?.photoUrl)) {
      return item.photoUrl;
    }
    return undefined;
  };

  // Find optional Visiting Card / Work Photo URL if uploaded
  const getItemVisitingCard = (item: any, liveSelfie?: string): string | undefined => {
    const candidates = [
      item?.visitingCardUrl,
      item?.visiting_card_url,
      item?.workPhotoUrl,
      item?.photoUrl,
      item?.image_url
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim() && c !== '__deleted__' && c !== 'https://lh3.googleusercontent.com/a/default-user') {
        if (!liveSelfie || c.trim() !== liveSelfie.trim()) {
          if (c.startsWith('http://') || c.startsWith('https://') || c.startsWith('data:image/') || c.startsWith('/uploads/')) {
            return c.trim();
          }
        }
      }
    }
    return undefined;
  };

  // ==========================================
  // UNIFIED APPROVE / REJECT / DELETE / EDIT
  // ==========================================
  const handleStatusAction = async (mod: AdminModuleId, item: any, newStatus: 'approved' | 'rejected') => {
    const id = item.id;
    setActionLoadingId(id);
    const isApproved = newStatus === 'approved';

    try {
      if (mod === 'help_posts') {
        const res = await updateAdminIntentOnServer(id, { ...item, status: newStatus, isApproved });
        if (res.success) {
          setIntents(prev => prev.map(i => (i.id === id ? { ...i, status: newStatus, isApproved } : i)));
          showToast(isApproved ? '✅ Help Post Approved!' : '❌ Help Post Rejected.');
        } else {
          showToast(res.error || 'Failed to update Help Post');
        }
      } else if (mod === 'helpers') {
        const norm = normalizeCategorySlug(
          item.categoryId || item.category || item.service,
          item.skills,
          item.customCategoryName
        );
        const fullUpdates = {
          ...item,
          categoryId: norm.categoryId,
          category: norm.categoryId,
          customCategoryName: item.customCategoryName || norm.customCategoryName,
          status: newStatus,
          isVerified: isApproved,
          is_verified: isApproved,
          is_approved: isApproved
        };
        const matchedVerif = verificationsList.find(
          v => v.entityId === id || v.id === item.verificationId || (item.email && v.userEmail?.toLowerCase() === item.email.toLowerCase())
        );
        if (matchedVerif?.id) {
          await updateAdminVerificationStatus(matchedVerif.id, newStatus);
        }
        const res = await updateAdminHelperOnServer(id, fullUpdates);
        if (res.success) {
          const updatedHelper = { ...item, ...(res.item || {}), ...fullUpdates };
          setHelpers(prev =>
            prev.map(h => {
              const hEm = String(h.email || '').trim().toLowerCase();
              const hPh = String(h.phone || '').replace(/\D/g, '').slice(-10);
              const targetEm = String(item.email || '').trim().toLowerCase();
              const targetPh = String(item.phone || '').replace(/\D/g, '').slice(-10);
              if (
                h.id === id ||
                (item.userId && h.userId === item.userId) ||
                (targetEm && hEm === targetEm) ||
                (targetPh.length === 10 && hPh === targetPh)
              ) {
                return { ...h, ...updatedHelper };
              }
              return h;
            })
          );
          setSimpleUsers(prev =>
            prev.map(u => {
              const uEm = String(u.email || '').trim().toLowerCase();
              const uPh = String(u.phone || '').replace(/\D/g, '').slice(-10);
              const targetEm = String(item.email || '').trim().toLowerCase();
              const targetPh = String(item.phone || '').replace(/\D/g, '').slice(-10);
              if (
                u.id === id ||
                u.uid === id ||
                (item.userId && (u.id === item.userId || u.uid === item.userId)) ||
                (targetEm && uEm === targetEm) ||
                (targetPh.length === 10 && uPh === targetPh)
              ) {
                return { ...u, status: newStatus, isVerified: isApproved };
              }
              return u;
            })
          );
          setVerificationsList(prev =>
            prev.map(v =>
              v.entityId === id || v.userId === id || (item.email && v.userEmail?.toLowerCase() === item.email.toLowerCase())
                ? { ...v, status: newStatus }
                : v
            )
          );
          // Sync local storage so CategoriesScreen immediately displays the approved helper
          try {
            const raw = localStorage.getItem('locohelp_free_helper_profiles');
            const list: any[] = raw ? JSON.parse(raw) : [];
            const exists = list.some(h => h && h.id === id);
            const nextList = exists
              ? list.map((h: any) => (h.id === id ? { ...h, ...updatedHelper } : h))
              : [updatedHelper, ...list];
            localStorage.setItem('locohelp_free_helper_profiles', JSON.stringify(nextList));
          } catch {}
          showToast(isApproved ? '✅ Service Expert Profile Approved & Live in Categories!' : '❌ Service Expert Profile Rejected.');
        } else {
          showToast(res.error || 'Failed to update Service Expert Profile');
        }
      } else if (mod === 'simple_users') {
        const norm = normalizeCategorySlug(
          item.categoryId || item.category || 'other',
          item.skills,
          item.customCategoryName
        );
        if (item.verificationId) {
          await updateAdminVerificationStatus(item.verificationId, newStatus);
        }
        const userUpdates = {
          ...item,
          categoryId: norm.categoryId,
          category: norm.categoryId,
          customCategoryName: item.customCategoryName || norm.customCategoryName,
          status: newStatus,
          isVerified: isApproved,
          is_verified: isApproved,
          is_approved: isApproved
        };
        const res = await updateAdminUserOnServer(id, userUpdates);
        const itemEmailLow = String(item.email || '').trim().toLowerCase();
        const itemPhoneDig = String(item.phone || '').replace(/\D/g, '').slice(-10);
        if (res.success || item.verificationId) {
          setSimpleUsers(prev =>
            prev.map(u => {
              const uEm = String(u.email || '').trim().toLowerCase();
              const uPh = String(u.phone || '').replace(/\D/g, '').slice(-10);
              if (
                u.id === id ||
                u.uid === id ||
                (itemEmailLow && uEm === itemEmailLow) ||
                (itemPhoneDig.length === 10 && uPh === itemPhoneDig)
              ) {
                return { ...u, ...userUpdates };
              }
              return u;
            })
          );
          setHelpers(prev =>
            prev.map(h => {
              const hEm = String(h.email || '').trim().toLowerCase();
              const hPh = String(h.phone || '').replace(/\D/g, '').slice(-10);
              if (
                h.id === id ||
                h.userId === id ||
                (itemEmailLow && hEm === itemEmailLow) ||
                (itemPhoneDig.length === 10 && hPh === itemPhoneDig)
              ) {
                return { ...h, status: newStatus, isVerified: isApproved, is_verified: isApproved };
              }
              return h;
            })
          );
          setVerificationsList(prev =>
            prev.map(v => {
              const vEm = String(v.userEmail || '').trim().toLowerCase();
              const vPh = String(v.userPhone || '').replace(/\D/g, '').slice(-10);
              if (
                v.id === item.verificationId ||
                v.entityId === id ||
                v.userId === id ||
                (itemEmailLow && vEm === itemEmailLow) ||
                (itemPhoneDig.length === 10 && vPh === itemPhoneDig)
              ) {
                return { ...v, status: newStatus };
              }
              return v;
            })
          );
          showToast(isApproved ? '✅ User Account & Profile Approved! User can now Post & Chat.' : '❌ User Account Rejected.');
        } else {
          showToast(res.error || 'Failed to update User Profile');
        }
      } else if (mod === 'businesses') {
        const res = await updateAdminBusinessOnServer(id, { ...item, status: newStatus, isVerified: isApproved });
        if (res.success) {
          const updatedBiz = { ...item, ...(res.item || {}), status: newStatus, isVerified: isApproved };
          setBusinesses(prev => prev.map(b => (b.id === id ? updatedBiz : b)));
          try {
            const raw = localStorage.getItem('locohelp_registered_shops');
            const list: any[] = raw ? JSON.parse(raw) : [];
            const exists = list.some(s => s && s.id === id);
            const nextList = exists
              ? list.map((s: any) => (s.id === id ? { ...s, ...updatedBiz } : s))
              : [updatedBiz, ...list];
            localStorage.setItem('locohelp_registered_shops', JSON.stringify(nextList));
          } catch {}
          showToast(isApproved ? '✅ Business / Shop Approved & Live!' : '❌ Business / Shop Rejected.');
        } else {
          showToast(res.error || 'Failed to update Business');
        }
      } else if (mod === 'job_seekers' || mod === 'employers') {
        const res = await updateJobPortalStatus(id, newStatus);
        if (res.success) {
          setJobPortalItems(prev => prev.map(j => (j.id === id ? { ...j, status: newStatus } : j)));
          showToast(isApproved ? '✅ Approved & Live on Job Portal!' : '❌ Entry Rejected.');
        } else {
          showToast(res.error || 'Failed to update Job Portal status');
        }
      } else if (mod === 'feedback_categories') {
        const res = await updateAdminReportOnServer(id, { ...item, status: newStatus });
        if (res.success) {
          setReports(prev => prev.map(r => (r.id === id ? { ...r, status: newStatus } : r)));
          showToast(isApproved ? '✅ Feedback / Report Marked Approved & Resolved!' : '❌ Feedback / Report Rejected.');
        } else {
          showToast(res.error || 'Failed to update Feedback');
        }
      }

      // Dispatch global profile updated & storage events to immediately sync main website display & counters
      try {
        window.dispatchEvent(new Event('locohelp_profile_updated'));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteAction = async (mod: AdminModuleId, item: any) => {
    const id = item.id;
    setActionLoadingId(id);
    try {
      if (mod === 'help_posts') {
        await deleteIntentOnServer(id, item.description);
        setIntents(prev => prev.filter(i => i.id !== id));
        showToast('🗑️ Help Post deleted permanently from PostgreSQL.');
      } else if (mod === 'helpers') {
        await deleteAdminHelperOnServer(id);
        await deleteAdminUserOnServer(id).catch(() => {});
        setHelpers(prev => prev.filter(h => h.id !== id));
        setSimpleUsers(prev => prev.filter(u => u.id !== id && u.uid !== id));
        setVerificationsList(prev => prev.filter(v => v.entityId !== id && v.userId !== id));
        try {
          const raw = localStorage.getItem('locohelp_free_helper_profiles');
          if (raw) {
            localStorage.setItem('locohelp_free_helper_profiles', JSON.stringify(JSON.parse(raw).filter((h: any) => h && h.id !== id)));
          }
        } catch {}
        showToast('🗑️ Service Expert Profile deleted permanently from PostgreSQL.');
      } else if (mod === 'simple_users') {
        await deleteAdminUserOnServer(id);
        await deleteAdminHelperOnServer(id).catch(() => {});
        setSimpleUsers(prev => prev.filter(u => u.id !== id && u.uid !== id));
        setHelpers(prev => prev.filter(h => h.id !== id && h.userId !== id));
        setVerificationsList(prev => prev.filter(v => v.entityId !== id && v.userId !== id && v.id !== id));
        showToast('🗑️ User Profile deleted permanently from PostgreSQL.');
      } else if (mod === 'businesses') {
        await deleteAdminBusinessOnServer(id);
        setBusinesses(prev => prev.filter(b => b.id !== id));
        try {
          const raw = localStorage.getItem('locohelp_registered_shops');
          if (raw) {
            localStorage.setItem('locohelp_registered_shops', JSON.stringify(JSON.parse(raw).filter((s: any) => s && s.id !== id)));
          }
        } catch {}
        showToast('🗑️ Business / Shop Registration deleted permanently.');
      } else if (mod === 'job_seekers' || mod === 'employers') {
        await deleteJobPortalItem(id);
        setJobPortalItems(prev => prev.filter(j => j.id !== id));
        showToast('🗑️ Job Portal entry deleted permanently.');
      } else if (mod === 'feedback_categories') {
        await deleteAdminReportOnServer(id);
        setReports(prev => prev.filter(r => r.id !== id));
        showToast('🗑️ Feedback / Report deleted permanently.');
      }
      try {
        window.dispatchEvent(new Event('locohelp_profile_updated'));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    } finally {
      setActionLoadingId(null);
    }
  };

  const openEditModal = (mod: AdminModuleId, item: any) => {
    const status = getNormalizedStatus(item, mod);
    const existingPhoto =
      item.photoUrl ||
      item.photo_url ||
      item.imageUrl ||
      item.image_url ||
      item.avatarUrl ||
      item.avatar_url ||
      item.photoOrLogoUrl ||
      item.attachmentUrl ||
      '';
    if (mod === 'help_posts') {
      setEditingItem({
        module: mod,
        id: item.id,
        nameOrTitle: item.userName || item.user_name || item.authorName || 'Community User',
        categoryOrRole: item.category || 'General Help',
        phone: item.phone || item.contactPhone || '',
        email: item.email || '',
        areaOrLocation: item.area || item.locationName || '',
        descriptionOrBio: item.description || '',
        salaryOrPrice: item.urgency || 'normal',
        photoUrl: existingPhoto,
        status,
        raw: item
      });
    } else if (mod === 'helpers') {
      setEditingItem({
        module: mod,
        id: item.id,
        nameOrTitle: item.name || '',
        categoryOrRole: item.category || item.service || '',
        phone: item.phone || item.whatsapp || '',
        email: item.email || '',
        areaOrLocation: item.area || item.address || '',
        descriptionOrBio: item.bio || item.description || item.experience || '',
        salaryOrPrice: item.priceRange || '',
        photoUrl: existingPhoto,
        status,
        raw: item
      });
    } else if (mod === 'simple_users') {
      setEditingItem({
        module: mod,
        id: item.id,
        nameOrTitle: item.name || item.userName || '',
        categoryOrRole: item.category || 'Simple User Profile',
        phone: item.phone || item.userPhone || '',
        email: item.email || item.userEmail || '',
        areaOrLocation: item.area || item.address || '',
        descriptionOrBio: item.bio || item.adminNotes || '',
        salaryOrPrice: '',
        photoUrl: existingPhoto,
        status,
        raw: item
      });
    } else if (mod === 'businesses') {
      setEditingItem({
        module: mod,
        id: item.id,
        nameOrTitle: item.name || item.businessName || '',
        categoryOrRole: item.category || '',
        phone: item.phone || item.whatsapp || '',
        email: item.email || '',
        areaOrLocation: item.area || item.address || '',
        descriptionOrBio: item.description || item.offerTitle || '',
        salaryOrPrice: item.timings || item.openingHours || '',
        photoUrl: existingPhoto,
        status,
        raw: item
      });
    } else if (mod === 'job_seekers') {
      setEditingItem({
        module: mod,
        id: item.id,
        nameOrTitle: item.fullName || '',
        categoryOrRole: item.category || item.headline || '',
        phone: item.phone || item.whatsapp || '',
        email: item.email || '',
        areaOrLocation: item.area || '',
        descriptionOrBio: item.skills || item.experience || '',
        salaryOrPrice: item.expectedSalary || '',
        photoUrl: existingPhoto,
        status,
        raw: item
      });
    } else if (mod === 'employers') {
      setEditingItem({
        module: mod,
        id: item.id,
        nameOrTitle: item.companyOrShopName || '',
        categoryOrRole: item.jobRole || item.category || '',
        phone: item.phone || item.whatsapp || '',
        email: item.email || '',
        areaOrLocation: item.jobLocation || item.area || '',
        descriptionOrBio: item.jobDescription || '',
        salaryOrPrice: item.salaryOffer || '',
        photoUrl: existingPhoto,
        status,
        raw: item
      });
    } else if (mod === 'feedback_categories') {
      setEditingItem({
        module: mod,
        id: item.id,
        nameOrTitle: item.reporterName || item.targetType || 'User Feedback',
        categoryOrRole: item.reason || 'Feedback / Suggestion',
        phone: item.phone || '',
        email: item.email || '',
        areaOrLocation: item.targetId || '',
        descriptionOrBio: item.details || item.reason || '',
        salaryOrPrice: '',
        photoUrl: existingPhoto,
        status,
        raw: item
      });
    }
  };

  const handleAdminDirectCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingItem) return;
    if (!creatingItem.nameOrTitle.trim()) {
      showToast('Please enter Name / Title');
      return;
    }

    setIsSavingCreate(true);
    try {
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      };
      const mod = creatingItem.module;

      if (mod === 'businesses') {
        const norm = normalizeCategorySlug(
          creatingItem.category,
          creatingItem.ownerOrRole,
          creatingItem.customCategoryName
        );
        const catObj = CATEGORIES.find(c => c.id === norm.categoryId);
        const catLabel =
          norm.categoryId === 'other'
            ? creatingItem.customCategoryName.trim() || creatingItem.category.trim() || 'Retail & Services'
            : catObj?.nameEn || creatingItem.category.trim() || 'Retail & Services';

        const payload = {
          name: creatingItem.nameOrTitle.trim(),
          businessName: creatingItem.nameOrTitle.trim(),
          business_name: creatingItem.nameOrTitle.trim(),
          categoryId: norm.categoryId,
          category: catLabel,
          categoryLabel: catLabel,
          ownerName: creatingItem.ownerOrRole.trim() || 'Shop Owner',
          phone: creatingItem.phone.trim(), // 100% optional for Admin
          ownerEmail: creatingItem.email.trim(), // 100% optional for Admin
          timings: creatingItem.timingsOrExperience.trim() || '9:00 AM - 9:00 PM',
          area: creatingItem.areaOrLocation.trim() || 'Local Market',
          address: creatingItem.address.trim() || creatingItem.areaOrLocation.trim() || 'Local Market',
          description: creatingItem.description.trim() || `${creatingItem.nameOrTitle.trim()} - Verified Local Shop`,
          photoUrl: creatingItem.photos[0] || creatingItem.photoUrl || '',
          photos: creatingItem.photos,
          isVerified: true,
          status: 'approved',
          adminDirectCreate: true
        };
        const res = await fetch('/api/shops', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add Shop');
        setBusinesses(prev => [data, ...prev.filter(b => b.id !== data.id)]);
        try {
          const raw = localStorage.getItem('locohelp_registered_shops');
          const list: any[] = raw ? JSON.parse(raw) : [];
          localStorage.setItem(
            'locohelp_registered_shops',
            JSON.stringify([{ ...data, isVerified: true, status: 'approved' }, ...list.filter(s => s && s.id !== data.id)])
          );
        } catch {}
        showToast('✅ Shop / Business added & published live immediately!');
      } else if (mod === 'helpers' || mod === 'simple_users') {
        const norm = normalizeCategorySlug(
          creatingItem.category,
          [creatingItem.ownerOrRole, creatingItem.description].filter(Boolean),
          creatingItem.customCategoryName
        );
        const catObj = CATEGORIES.find(c => c.id === norm.categoryId);
        const primarySkill =
          creatingItem.ownerOrRole.trim() ||
          creatingItem.customCategoryName.trim() ||
          catObj?.nameEn ||
          'Service Expert';

        const payload = {
          name: creatingItem.nameOrTitle.trim(),
          categoryId: norm.categoryId,
          customCategoryName: norm.customCategoryName,
          skills: [primarySkill, ...(creatingItem.description.trim() ? [creatingItem.description.trim()] : [])],
          phone: creatingItem.phone.trim(), // 100% optional for Admin
          email: creatingItem.email.trim(), // 100% optional for Admin
          experience: creatingItem.timingsOrExperience.trim() || '2+ Years',
          area: creatingItem.areaOrLocation.trim() || 'Local Area',
          photoUrl: creatingItem.photoUrl || '',
          isVerified: true,
          status: 'approved',
          adminDirectCreate: true
        };
        const res = await fetch('/api/helpers', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add Profile');
        setHelpers(prev => [data, ...prev.filter(h => h.id !== data.id)]);
        saveFreeHelperProfile({
          ...data,
          categoryId: norm.categoryId,
          customCategoryName: norm.customCategoryName,
          isVerified: true,
          status: 'approved'
        });

        if (mod === 'simple_users') {
          const uid = data.id || 'user_' + Date.now();
          const userPayload = {
            uid,
            id: uid,
            name: creatingItem.nameOrTitle.trim(),
            full_name: creatingItem.nameOrTitle.trim(),
            displayName: creatingItem.nameOrTitle.trim(),
            email: creatingItem.email.trim(),
            phone: creatingItem.phone.trim(),
            address: creatingItem.areaOrLocation.trim() || 'Local Area',
            skills: primarySkill,
            experience: creatingItem.timingsOrExperience.trim() || '2+ Years',
            category: norm.categoryId,
            status: 'approved',
            isVerified: true,
            adminDirectCreate: true,
            myHelperProfile: data
          };
          await fetch('/api/profiles', {
            method: 'POST',
            headers,
            body: JSON.stringify(userPayload)
          }).catch(() => {});
          setSimpleUsers(prev => [userPayload, ...prev.filter(u => u.id !== uid)]);
          showToast('✅ User Profile added & published live in Categories!');
        } else {
          showToast('✅ Service Expert Profile added & published live in Categories!');
        }
      } else if (mod === 'job_seekers') {
        const payload = {
          type: 'job_seeker',
          fullName: creatingItem.nameOrTitle.trim(),
          headline: creatingItem.ownerOrRole.trim() || creatingItem.category.trim() || 'Job Seeker',
          category: creatingItem.category.trim() || 'Office & Admin',
          education: creatingItem.educationOrVacancyType.trim() || 'Graduate',
          experience: creatingItem.timingsOrExperience.trim() || 'Fresher / Experienced',
          expectedSalary: creatingItem.salaryOrUrgency.trim() || 'Negotiable',
          phone: creatingItem.phone.trim(), // 100% optional for Admin
          whatsapp: creatingItem.phone.trim(),
          email: creatingItem.email.trim(), // 100% optional for Admin
          area: creatingItem.areaOrLocation.trim() || 'Local Area',
          skills: creatingItem.description.trim() || creatingItem.ownerOrRole.trim() || 'General Work',
          description: creatingItem.description.trim() || 'Looking for local employment opportunities.',
          photoOrLogoUrl: creatingItem.photoUrl || '',
          resumeUrl: creatingItem.resumeUrl || '',
          resumeFileName: creatingItem.resumeFileName || ''
        };
        const res = await fetch('/api/job-portal', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add Job Seeker');
        if (data.item) setJobPortalItems(prev => [data.item, ...prev]);
        showToast('✅ Job Seeker profile added & published live immediately!');
      } else if (mod === 'employers') {
        const payload = {
          type: 'employer_vacancy',
          companyOrShopName: creatingItem.nameOrTitle.trim(),
          jobRole: creatingItem.ownerOrRole.trim() || 'Staff Member',
          category: creatingItem.category.trim() || 'Retail & Shop Helper',
          vacancyType: creatingItem.educationOrVacancyType.trim() || 'Full-Time',
          salaryOffered: creatingItem.salaryOrUrgency.trim() || 'Negotiable',
          openingsCount: 1,
          urgency: 'Immediate',
          phone: creatingItem.phone.trim(), // 100% optional for Admin
          whatsapp: creatingItem.phone.trim(),
          email: creatingItem.email.trim(), // 100% optional for Admin
          area: creatingItem.areaOrLocation.trim() || 'Local Market',
          address: creatingItem.address.trim() || creatingItem.areaOrLocation.trim() || '',
          description: creatingItem.description.trim() || 'Staff required for our business.',
          photoOrLogoUrl: creatingItem.photoUrl || ''
        };
        const res = await fetch('/api/job-portal', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add Employer Job');
        if (data.item) setJobPortalItems(prev => [data.item, ...prev]);
        showToast('✅ Employer Job Posting added & published live immediately!');
      }

      try {
        window.dispatchEvent(new Event('locohelp_profile_updated'));
        window.dispatchEvent(new Event('storage'));
      } catch {}

      setCreatingItem(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to create entry');
    } finally {
      setIsSavingCreate(false);
    }
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSavingEdit(true);

    const { module: mod, id, nameOrTitle, categoryOrRole, phone, email, areaOrLocation, descriptionOrBio, salaryOrPrice, photoUrl, status, raw } = editingItem;
    const isApproved = status === 'approved';

    try {
      if (mod === 'help_posts') {
        const updates = {
          ...(raw || {}),
          userName: nameOrTitle,
          category: categoryOrRole,
          phone,
          area: areaOrLocation,
          description: descriptionOrBio,
          urgency: salaryOrPrice,
          imageUrl: photoUrl || '',
          attachmentUrl: photoUrl || '',
          status,
          isApproved
        };
        const res = await updateAdminIntentOnServer(id, updates);
        if (res.success) {
          setIntents(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)));
          showToast('✅ Help Post updated successfully!');
          setEditingItem(null);
        } else {
          showToast(res.error || 'Failed to update Help Post');
        }
      } else if (mod === 'helpers') {
        const norm = normalizeCategorySlug(categoryOrRole, descriptionOrBio, raw?.customCategoryName);
        const updates = {
          ...(raw || {}),
          name: nameOrTitle,
          categoryId: norm.categoryId,
          category: norm.categoryId,
          customCategoryName: norm.customCategoryName,
          phone,
          email,
          area: areaOrLocation,
          bio: descriptionOrBio,
          experience: descriptionOrBio,
          priceRange: salaryOrPrice,
          photoUrl: photoUrl || '',
          status,
          isVerified: isApproved
        };
        const res = await updateAdminHelperOnServer(id, updates);
        if (res.success) {
          setHelpers(prev => prev.map(h => (h.id === id ? { ...h, ...updates } : h)));
          try {
            const existingRaw = localStorage.getItem('locohelp_free_helper_profiles');
            const list: any[] = existingRaw ? JSON.parse(existingRaw) : [];
            const exists = list.some(h => h && h.id === id);
            const nextList = exists
              ? list.map((h: any) => (h.id === id ? { ...h, ...updates } : h))
              : [updates, ...list];
            localStorage.setItem('locohelp_free_helper_profiles', JSON.stringify(nextList));
          } catch {}
          showToast('✅ Service Expert Profile updated successfully!');
          setEditingItem(null);
        } else {
          showToast(res.error || 'Failed to update Service Expert Profile');
        }
      } else if (mod === 'simple_users') {
        const updates = {
          ...(raw || {}),
          name: nameOrTitle,
          category: categoryOrRole,
          phone,
          email,
          area: areaOrLocation,
          bio: descriptionOrBio,
          skills: descriptionOrBio,
          avatarUrl: photoUrl || '',
          photoUrl: photoUrl || '',
          status,
          isVerified: isApproved
        };
        const res = await updateAdminUserOnServer(id, updates);
        if (res.success) {
          setSimpleUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
          showToast('✅ Simple User Profile updated successfully!');
          setEditingItem(null);
        } else {
          showToast(res.error || 'Failed to update User Profile');
        }
      } else if (mod === 'businesses') {
        const updates = {
          ...(raw || {}),
          name: nameOrTitle,
          businessName: nameOrTitle,
          category: categoryOrRole,
          categoryLabel: categoryOrRole,
          phone,
          email,
          ownerEmail: email,
          area: areaOrLocation,
          address: areaOrLocation,
          description: descriptionOrBio,
          timings: salaryOrPrice,
          photoUrl: photoUrl || '',
          status,
          isVerified: isApproved
        };
        const res = await updateAdminBusinessOnServer(id, updates);
        if (res.success) {
          setBusinesses(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
          try {
            const existingRaw = localStorage.getItem('locohelp_registered_shops');
            const list: any[] = existingRaw ? JSON.parse(existingRaw) : [];
            const exists = list.some(s => s && s.id === id);
            const nextList = exists
              ? list.map((s: any) => (s.id === id ? { ...s, ...updates } : s))
              : [updates, ...list];
            localStorage.setItem('locohelp_registered_shops', JSON.stringify(nextList));
          } catch {}
          showToast('✅ Business / Shop updated successfully!');
          setEditingItem(null);
        } else {
          showToast(res.error || 'Failed to update Business');
        }
      } else if (mod === 'job_seekers') {
        const updates: Partial<JobPortalSubmission> = {
          ...(raw || {}),
          fullName: nameOrTitle,
          category: categoryOrRole,
          headline: categoryOrRole,
          phone,
          email,
          area: areaOrLocation,
          skills: descriptionOrBio,
          expectedSalary: salaryOrPrice,
          photoOrLogoUrl: photoUrl || '',
          status
        };
        const res = await updateAdminJobPortalOnServer(id, updates);
        if (res.success) {
          setJobPortalItems(prev => prev.map(j => (j.id === id ? { ...j, ...updates } : j)));
          showToast('✅ Job Seeker Registration updated!');
          setEditingItem(null);
        } else {
          showToast(res.error || 'Failed to update Job Seeker');
        }
      } else if (mod === 'employers') {
        const updates: Record<string, any> = {
          ...(raw || {}),
          companyOrShopName: nameOrTitle,
          jobRole: categoryOrRole,
          phone,
          email,
          jobLocation: areaOrLocation,
          area: areaOrLocation,
          jobDescription: descriptionOrBio,
          salaryOffer: salaryOrPrice,
          photoOrLogoUrl: photoUrl || '',
          status
        };
        const res = await updateAdminJobPortalOnServer(id, updates);
        if (res.success) {
          setJobPortalItems(prev => prev.map(j => (j.id === id ? { ...j, ...updates } : j)));
          showToast('✅ Employer & Job Posting updated!');
          setEditingItem(null);
        } else {
          showToast(res.error || 'Failed to update Employer Posting');
        }
      } else if (mod === 'feedback_categories') {
        const updates = {
          reporterName: nameOrTitle,
          reason: categoryOrRole,
          phone,
          email,
          details: descriptionOrBio,
          status
        };
        const res = await updateAdminReportOnServer(id, updates);
        if (res.success) {
          setReports(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));
          showToast('✅ Feedback / Report updated!');
          setEditingItem(null);
        } else {
          showToast(res.error || 'Failed to update Feedback');
        }
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ==========================================
  // COUNTS & MODULE DEFINITIONS FOR BANNERS
  // ==========================================
  const jobSeekersList = jobPortalItems.filter(i => i.type === 'job_seeker');
  const employersList = jobPortalItems.filter(i => i.type === 'employer_vacancy');

  const countPending = (list: any[], mod: AdminModuleId) =>
    list.filter(item => getNormalizedStatus(item, mod) === 'pending').length;

  const ADMIN_MODULES: Array<{
    id: AdminModuleId;
    title: string;
    icon: React.ReactNode;
    gradient: string;
    border: string;
    badgeBg: string;
    totalCount: number;
    pendingCount: number;
  }> = [
    {
      id: 'help_posts',
      title: 'Public Help Posts',
      icon: <Megaphone className="w-4 h-4 text-white" />,
      gradient: 'from-amber-600 via-orange-600 to-red-600',
      border: 'border-orange-500/50 hover:border-orange-400',
      badgeBg: 'bg-orange-500/20 text-orange-200 border-orange-500/40',
      totalCount: intents.length,
      pendingCount: countPending(intents, 'help_posts')
    },
    {
      id: 'helpers',
      title: 'Service Experts',
      icon: <Users className="w-4 h-4 text-white" />,
      gradient: 'from-emerald-600 to-teal-600',
      border: 'border-emerald-500/30 hover:border-emerald-400',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      totalCount: helpers.length,
      pendingCount: countPending(helpers, 'helpers')
    },
    {
      id: 'simple_users',
      title: 'User Profiles',
      icon: <UserCheck className="w-4 h-4 text-white" />,
      gradient: 'from-sky-600 to-blue-600',
      border: 'border-sky-500/30 hover:border-sky-400',
      badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      totalCount: simpleUsers.length,
      pendingCount: countPending(simpleUsers, 'simple_users')
    },
    {
      id: 'businesses',
      title: 'Business & Shop Registrations',
      icon: <Store className="w-4 h-4 text-white" />,
      gradient: 'from-purple-600 to-indigo-600',
      border: 'border-purple-500/30 hover:border-purple-400',
      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      totalCount: businesses.length,
      pendingCount: countPending(businesses, 'businesses')
    },
    {
      id: 'job_seekers',
      title: 'Job Seekers',
      icon: <Briefcase className="w-4 h-4 text-white" />,
      gradient: 'from-blue-600 to-indigo-700',
      border: 'border-blue-500/30 hover:border-blue-400',
      badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      totalCount: jobSeekersList.length,
      pendingCount: countPending(jobSeekersList, 'job_seekers')
    },
    {
      id: 'employers',
      title: 'Employers & Vacancies',
      icon: <Building2 className="w-4 h-4 text-white" />,
      gradient: 'from-amber-600 to-orange-600',
      border: 'border-amber-500/30 hover:border-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      totalCount: employersList.length,
      pendingCount: countPending(employersList, 'employers')
    },
    {
      id: 'feedback_categories',
      title: 'User Feedback & Categories',
      icon: <FileText className="w-4 h-4 text-white" />,
      gradient: 'from-pink-600 to-rose-600',
      border: 'border-pink-500/30 hover:border-pink-400',
      badgeBg: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
      totalCount: reports.length,
      pendingCount: countPending(reports, 'feedback_categories')
    }
  ];

  // ==========================================
  // RENDER LOGIN GATE IF NOT AUTHENTICATED
  // ==========================================
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#090D16] text-white flex flex-col items-center justify-center p-4 relative overflow-y-auto">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#111827]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10"
        >
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white mb-6 transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} /> Back to LocoHelp Home
          </button>

          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                Secret Route • /bapu-admin
              </span>
              <h1 className="text-xl font-black text-white mt-1">LocoHelp Admin Security</h1>
              <p className="text-xs text-slate-400">2-Step Verification (Password + Official Email OTP)</p>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {/* STEP 1: ADMIN PASSWORD + 3 SELECTABLE OFFICIAL EMAILS */}
          {adminAuthStep === 'password' && (
            <form onSubmit={handlePasswordStepSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                <span className="font-black text-orange-400 block mb-0.5">🔒 Step 1 of 2: Select Admin Email &amp; Enter Password</span>
                नीचे दिए गए 3 अधिकृत एडमिन ईमेल में से अपना ईमेल चुनें और पासवर्ड डालें। 6-अंकों का OTP केवल आपके चुने हुए ईमेल पर जाएगा।
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Official Admin Email for OTP
                </label>
                <div className="space-y-2">
                  {ALLOWED_ADMIN_EMAILS.map((emailOpt) => {
                    const isSelected = selectedAdminEmail === emailOpt;
                    return (
                      <button
                        key={emailOpt}
                        type="button"
                        onClick={() => setSelectedAdminEmail(emailOpt)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/20 border-orange-500 text-white shadow-sm'
                            : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <Mail className={`w-4 h-4 shrink-0 ${isSelected ? 'text-orange-400' : 'text-slate-500'}`} />
                          <span className="truncate">{emailOpt}</span>
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-orange-400 bg-orange-500 text-white' : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Admin Master Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Enter secret admin password..."
                    autoFocus
                    className="w-full pl-11 pr-11 py-3.5 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingAdminOtp}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingAdminOtp
                  ? `Sending OTP to ${selectedAdminEmail}...`
                  : `Verify Password & Send OTP to ${selectedAdminEmail} →`}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleRequestForgotPasswordOtp}
                  disabled={isSendingAdminOtp}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
                >
                  Forgot Admin Password? Reset via Email OTP ({selectedAdminEmail})
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: EMAIL OTP VERIFICATION */}
          {adminAuthStep === 'otp' && (
            <form onSubmit={handleOtpStepSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
                <span className="font-black text-emerald-400 block mb-0.5">
                  ✅ Password Verified! Step 2 of 2: Enter Email OTP
                </span>
                6-अंकों का वेरिफिकेशन OTP आधिकारिक एडमिन ईमेल <strong className="text-white">{OFFICIAL_ADMIN_EMAIL}</strong> पर भेजा गया है।
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  6-Digit Verification OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={adminOtpInput}
                  onChange={(e) => setAdminOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full px-4 py-3.5 bg-slate-950/90 border border-emerald-500/50 rounded-2xl text-center text-xl font-black tracking-[0.5em] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingAdminOtp}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingAdminOtp ? 'Verifying OTP...' : 'Verify OTP & Open Admin Dashboard'}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAdminAuthStep('password');
                    setLoginError(null);
                  }}
                  className="text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  ← Back to Password &amp; Email Selection
                </button>
                <button
                  type="button"
                  onClick={handlePasswordStepSubmit}
                  disabled={isSendingAdminOtp}
                  className="text-orange-400 hover:text-orange-300 font-bold cursor-pointer"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* FORGOT ADMIN PASSWORD FLOW */}
          {adminAuthStep === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordResetSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                <span className="font-black text-amber-400 block mb-0.5">🔑 Reset Admin Password via OTP</span>
                पासवर्ड रीसेट करने के लिए <strong className="text-white">{OFFICIAL_ADMIN_EMAIL}</strong> पर भेजा गया 6-अंकों का OTP और नया पासवर्ड दर्ज करें।
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  6-Digit OTP (Sent to {OFFICIAL_ADMIN_EMAIL})
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={forgotOtpInput}
                  onChange={(e) => setForgotOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-3 bg-slate-950/90 border border-slate-700 rounded-xl text-center text-lg font-black tracking-widest text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Admin Password
                </label>
                <input
                  type="password"
                  value={forgotNewPasswordInput}
                  onChange={(e) => setForgotNewPasswordInput(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-3 bg-slate-950/90 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={forgotConfirmPasswordInput}
                  onChange={(e) => setForgotConfirmPasswordInput(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-3 bg-slate-950/90 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingAdminOtp}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-sm shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingAdminOtp ? 'Resetting Password...' : 'Verify OTP & Save New Password'}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAdminAuthStep('password');
                    setLoginError(null);
                  }}
                  className="text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  ← Back to Login
                </button>
                <button
                  type="button"
                  onClick={handleRequestForgotPasswordOtp}
                  disabled={isSendingAdminOtp}
                  className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                >
                  Resend Reset OTP
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // FILTERED ITEMS FOR DEDICATED SUB-PAGE
  // ==========================================
  const getActiveModuleItems = (): any[] => {
    let rawList: any[] = [];
    if (activeModule === 'help_posts') rawList = intents;
    else if (activeModule === 'helpers') rawList = helpers;
    else if (activeModule === 'simple_users') rawList = simpleUsers;
    else if (activeModule === 'businesses') rawList = businesses;
    else if (activeModule === 'job_seekers') rawList = jobSeekersList;
    else if (activeModule === 'employers') rawList = employersList;
    else if (activeModule === 'feedback_categories') rawList = reports;

    const filtered = rawList.filter(item => {
      const normStatus = getNormalizedStatus(item, activeModule);
      if (statusFilter !== 'all' && normStatus !== statusFilter) return false;

      if (activeModule === 'helpers') {
        const catInfo = getItemCategoryInfo(item);
        if (selectedMainCatFilter !== 'all' && catInfo.mainCatId !== selectedMainCatFilter) {
          return false;
        }
        if (selectedSubCatFilter !== 'all' && catInfo.subCatId !== selectedSubCatFilter) {
          return false;
        }
      }

      // Location Filter
      if (locationFilter !== 'all') {
        const itemLoc = String(
          item.area || item.city || item.district || item.jobLocation || item.address || item.locationName || ''
        ).toLowerCase();
        if (!itemLoc.includes(locationFilter.toLowerCase())) {
          return false;
        }
      }

      // Date Filter (All, Today, Yesterday, or YYYY-MM-DD)
      if (dateFilter !== 'all') {
        const rawTs = item.createdAt || item.created_at || item.submittedAt || item.timestamp;
        if (!rawTs) return false;
        const itemDate = new Date(rawTs);
        if (isNaN(itemDate.getTime())) return false;
        const yyyyMmDd = itemDate.toISOString().slice(0, 10);
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        const yesterdayStr = yest.toISOString().slice(0, 10);

        if (dateFilter === 'today' && yyyyMmDd !== todayStr) return false;
        if (dateFilter === 'yesterday' && yyyyMmDd !== yesterdayStr) return false;
        if (dateFilter !== 'today' && dateFilter !== 'yesterday' && yyyyMmDd !== dateFilter) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const hay = JSON.stringify(item).toLowerCase();
      return hay.includes(q);
    });

    // Sort newest first (Date-wise descending)
    return filtered.sort((a, b) => {
      const tsA = new Date(a.createdAt || a.created_at || a.submittedAt || a.timestamp || 0).getTime();
      const tsB = new Date(b.createdAt || b.created_at || b.submittedAt || b.timestamp || 0).getTime();
      return (isNaN(tsB) ? 0 : tsB) - (isNaN(tsA) ? 0 : tsA);
    });
  };

  const currentModuleMeta = ADMIN_MODULES.find(m => m.id === activeModule);
  const filteredModuleItems = getActiveModuleItems();

  return (
    <div className="min-h-screen w-full bg-[#090D16] text-slate-100 flex flex-col overflow-y-auto">
      {internalToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl bg-slate-900/95 border border-orange-500/50 text-white text-xs sm:text-sm font-black shadow-2xl flex items-center gap-2.5 animate-bounce">
          <span>{internalToast}</span>
        </div>
      )}
      {/* ========================================== */}
      {/* 1. TOP ADMIN BAR                           */}
      {/* ========================================== */}
      <header className="sticky top-0 z-30 bg-[#0F1624]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand & Back to Site */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
              title="Safely Exit Admin Panel and Return to Main Website"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Main Website ↗</span>
            </button>
            <div
              onClick={() => openModule('home')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                    LocoHelp Admin Panel
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" /> /bapu-admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Master Moderation, Verifications & Category Controls
                </p>
              </div>
            </div>
          </div>

          {/* Right: Clean Top Bar — Refresh, 3-Dot Menu (⋮) for Extra Tools, and Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5 relative">
            <button
              onClick={loadAllData}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              title="Refresh All Data from PostgreSQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>

            {/* 3-Dot Dropdown Menu (⋮) for Database, Backup, Password & Site Lock */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(prev => !prev)}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center justify-center"
                title="More Admin Tools & Database Options (⋮)"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMoreMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#111827] border border-slate-700 shadow-2xl p-2.5 z-50 space-y-1.5">
                    <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-300 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dbSyncStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                        {dbSyncStatus.connected ? 'PostgreSQL Connected' : 'PostgreSQL Standby'}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400">
                        {dbSyncStatus.tables.length || 33} Tables
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={dbSyncStatus.syncing}
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        handleSyncAndRepairPostgres(false);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left text-xs font-bold text-purple-300 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    >
                      <span>🔄</span>
                      <span>{dbSyncStatus.syncing ? 'Syncing PostgreSQL...' : 'Sync & Repair PostgreSQL Tables'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsMoreMenuOpen(false);
                        showToast('⏳ Preparing PostgreSQL DB Backup...');
                        await syncBrowserDataToPostgres();
                        const res = await downloadDatabaseBackupFromServer();
                        if (!res.success || !res.data) {
                          showToast(`❌ ${res.error || 'Failed to download DB backup'}`);
                          return;
                        }
                        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `locohelp-postgres-backup-${new Date().toISOString().slice(0, 10)}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showToast('✅ PostgreSQL DB Backup downloaded!');
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left text-xs font-bold text-emerald-300 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <span>📥</span>
                      <span>Download DB Backup (JSON)</span>
                    </button>

                    <label className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left text-xs font-bold text-blue-300 flex items-center gap-2 transition-all cursor-pointer">
                      <span>📤</span>
                      <span>Restore DB Backup (JSON)</span>
                      <input
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={async (e) => {
                          setIsMoreMenuOpen(false);
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          try {
                            showToast('⏳ Restoring PostgreSQL DB Backup...');
                            const text = await file.text();
                            const parsed = JSON.parse(text);
                            const res = await restoreDatabaseBackupOnServer(parsed);
                            if (res.success) {
                              showToast(`✅ Restored ${res.restoredCount || 0} records to PostgreSQL!`);
                              await loadAllData();
                            } else {
                              showToast(`❌ ${res.error || 'Restore failed'}`);
                            }
                          } catch {
                            showToast(`❌ Invalid backup JSON file`);
                          }
                        }}
                      />
                    </label>

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsChangePasswordOpen(prev => !prev);
                        setChangePasswordError(null);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left text-xs font-bold text-amber-300 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Change Admin Password</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsSiteLockModalOpen(prev => !prev);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left text-xs font-bold text-slate-200 flex items-center justify-between transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-orange-400" />
                        <span>Private Site PIN Lock</span>
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${siteLockState.isLocked ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                        {siteLockState.isLocked ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsMoreMenuOpen(false);
                        setIsAssetLinksModalOpen(prev => !prev);
                        try {
                          const r = await fetch('/api/admin/assetlinks-config', { headers: getAuthHeaders() });
                          if (r.ok) {
                            const d = await r.json();
                            if (d.packageName) setAssetLinksPackage(d.packageName);
                            if (d.sha256Fingerprint) setAssetLinksSha256(d.sha256Fingerprint);
                          }
                        } catch {}
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left text-xs font-bold text-cyan-300 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <span>📱</span>
                      <span>Play Store Fullscreen (AssetLinks SHA-256)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Play Store TWA Fullscreen (AssetLinks SHA-256) Panel */}
        <AnimatePresence>
          {isAssetLinksModalOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-7xl mx-auto overflow-hidden"
            >
              <div className="mt-3 p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      📱 Play Store App Fullscreen Setup (`/.well-known/assetlinks.json`)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Google Play Console &rarr; Setup &rarr; App signing से अपना <strong>SHA-256 certificate fingerprint</strong> और <strong>Package Name</strong> यहाँ सेव करें ताकि ऐप में ऊपर वेबसाइट की लिंक पट्टी (URL Bar) न दिखे।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAssetLinksModalOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Android Package Name
                    </label>
                    <input
                      type="text"
                      value={assetLinksPackage}
                      onChange={(e) => setAssetLinksPackage(e.target.value)}
                      placeholder="e.g. com.locohelp.twa"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      SHA-256 Certificate Fingerprint (Play Console App Signing)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={assetLinksSha256}
                        onChange={(e) => setAssetLinksSha256(e.target.value)}
                        placeholder="AA:BB:CC:DD:EE:FF:00:11:22:33:..."
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-cyan-300 font-mono"
                      />
                      <button
                        type="button"
                        disabled={isSavingAssetLinks}
                        onClick={async () => {
                          setIsSavingAssetLinks(true);
                          try {
                            const r = await fetch('/api/admin/assetlinks-config', {
                              method: 'POST',
                              headers: getAuthHeaders(),
                              body: JSON.stringify({
                                packageName: assetLinksPackage.trim(),
                                sha256Fingerprint: assetLinksSha256.trim()
                              })
                            });
                            if (r.ok) {
                              showToast('✅ Play Store AssetLinks SHA-256 Saved! App will open Fullscreen.');
                              setIsAssetLinksModalOpen(false);
                            } else {
                              showToast('❌ Failed to save AssetLinks config');
                            }
                          } catch {
                            showToast('❌ Error saving AssetLinks config');
                          }
                          setIsSavingAssetLinks(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shrink-0 cursor-pointer"
                      >
                        {isSavingAssetLinks ? 'Saving...' : 'Save SHA-256'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable Site PIN Lock Panel (Opened from 3-Dot Menu) */}
        <AnimatePresence>
          {isSiteLockModalOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-7xl mx-auto overflow-hidden"
            >
              <div className="mt-3 p-4 rounded-2xl bg-slate-900/95 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      Private Access / PIN Lock Gate ({siteLockState.isLocked ? 'ACTIVE - LOCKED' : 'PUBLIC - UNLOCKED'})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Restricts site viewing to users who enter the 4-digit Access PIN.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={siteLockState.accessPin}
                    onChange={(e) => setSiteLockState(prev => ({ ...prev, accessPin: e.target.value.replace(/\D/g, '') }))}
                    className="w-24 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-center text-xs font-mono font-bold text-amber-300"
                    placeholder="PIN"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveSiteLock(siteLockState.isLocked, siteLockState.accessPin)}
                    disabled={isSavingSiteLock}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer"
                  >
                    Save PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSiteLock(!siteLockState.isLocked, siteLockState.accessPin)}
                    disabled={isSavingSiteLock}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                      siteLockState.isLocked
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {siteLockState.isLocked ? 'Turn Lock OFF' : 'Turn Lock ON'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSiteLockModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline Expandable Change Admin Password Section right in the Top Bar */}
        <AnimatePresence>
          {isChangePasswordOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-7xl mx-auto overflow-hidden"
            >
              <form
                onSubmit={handleChangePasswordSubmit}
                className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-amber-500/40 shadow-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-black text-white">
                      Change Admin Password (पासवर्ड बदलें)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChangePasswordOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {changePasswordError && (
                  <div className="mb-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold">
                    {changePasswordError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      value={changeOldPassword}
                      onChange={(e) => setChangeOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      value={changeNewPassword}
                      onChange={(e) => setChangeNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      value={changeConfirmPassword}
                      onChange={(e) => setChangeConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingPassword ? 'Updating...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ========================================== */}
      {/* MAIN BODY                                  */}
      {/* ========================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-20 overflow-y-auto">
        {/* ============================================================ */}
        {/* VIEW 1: ADMIN HOME DASHBOARD (TOP-TO-BOTTOM WEBSITE ORDER)   */}
        {/* ============================================================ */}
        {activeModule === 'home' && (() => {
          const todayStr = new Date().toISOString().slice(0, 10);
          const todayPostsCount = intents.filter(i => {
            const ts = i.createdAt || i.created_at || i.submittedAt || i.timestamp;
            return ts && new Date(ts).toISOString().slice(0, 10) === todayStr;
          }).length;
          const pendingAdsCount = ads.filter(a => a.status === 'pending' || a.isActive === false).length;

          const topToBottomBanners: Array<{
            step: string;
            title: string;
            subtitle: string;
            icon: React.ReactNode;
            gradient: string;
            border: string;
            badge1: string;
            badge2?: string;
            onClick: () => void;
          }> = [
            {
              step: '0',
              title: '👤 User Login Accounts (लॉगिन अकाउंट्स)',
              subtitle: 'मोबाइल या ईमेल OTP से रजिस्टर हुए सभी यूज़र्स की लिस्ट — Approve, Block या Delete करें',
              icon: <UserCheck className="w-5 h-5 text-white" />,
              gradient: 'from-sky-500 to-indigo-600',
              border: 'border-sky-500/40 hover:border-sky-400',
              badge1: `Total: ${simpleUsers.length}`,
              badge2: simpleUsers.filter(u => getNormalizedStatus(u, 'simple_users') === 'pending').length > 0
                ? `Pending: ${simpleUsers.filter(u => getNormalizedStatus(u, 'simple_users') === 'pending').length}`
                : undefined,
              onClick: () => openModule('simple_users'),
            },
            {
              step: '1',
              title: '🖼️ Top Main Hero Photo Banner (मेन फोटो बैनर)',
              subtitle: 'मेन वेबसाइट के सबसे ऊपर दिखने वाला बड़ा फोटो बैनर बदलें, एडिट करें या हटाएं',
              icon: <ImageIcon className="w-5 h-5 text-white" />,
              gradient: 'from-cyan-500 to-blue-600',
              border: 'border-cyan-500/40 hover:border-cyan-400',
              badge1: categoryImages['__home_hero_banner__'] === '__deleted__' ? 'Hidden' : 'Live Active',
              onClick: () => openModule('hero_banner'),
            },
            {
              step: '2',
              title: '📢 Public Help Posts — Date-Wise (पब्लिक हेल्प पोस्ट)',
              subtitle: 'आज और तारीख के हिसाब से किस यूज़र ने कौन-सी पोस्ट की — नाम, नंबर और एरिया के साथ कंट्रोल करें',
              icon: <Megaphone className="w-5 h-5 text-white" />,
              gradient: 'from-orange-500 to-red-600',
              border: 'border-orange-500/40 hover:border-orange-400',
              badge1: `Total: ${intents.length}`,
              badge2: `Today: ${todayPostsCount}`,
              onClick: () => openModule('help_posts'),
            },
            {
              step: '3',
              title: '🛠️ Main Categories & Service Experts (सभी 10 मुख्य केटेगरी और कारीगर)',
              subtitle: 'मेन वेबसाइट की तरह सभी केटेगरी (Electrician, Plumber आदि) खोलें और हर कारीगर की डिटेल्स Approve/Block करें',
              icon: <Wrench className="w-5 h-5 text-white" />,
              gradient: 'from-emerald-500 to-teal-600',
              border: 'border-emerald-500/40 hover:border-emerald-400',
              badge1: `Experts: ${helpers.length}`,
              badge2: helpers.filter(h => getNormalizedStatus(h, 'helpers') === 'pending').length > 0
                ? `Pending: ${helpers.filter(h => getNormalizedStatus(h, 'helpers') === 'pending').length}`
                : `${MASTER_CATEGORIES.length} Categories`,
              onClick: () => openModule('helpers'),
            },
            {
              step: '4',
              title: '⭐ Customer Ratings & Reviews (ग्राहकों की रेटिंग और रिव्यू)',
              subtitle: 'किस सर्विस एक्सपर्ट का काम कैसा है — ग्राहकों द्वारा दिए गए स्टार और रिव्यू देखें व स्पैम हटाएं',
              icon: <Star className="w-5 h-5 text-white" />,
              gradient: 'from-amber-500 to-yellow-600',
              border: 'border-amber-500/40 hover:border-amber-400',
              badge1: `Reviews: ${adminReviews.length}`,
              onClick: () => openModule('helper_reviews'),
            },
            {
              step: '5',
              title: '📍 Area-Wise Service Providers (शहर / एरिया के अनुसार सर्विस प्रोवाइडर)',
              subtitle: 'गांधीनगर, अहमदाबाद, कुडासन आदि लोकेशन के हिसाब से उपलब्ध सर्विस प्रोवाइडर्स की जांच करें',
              icon: <MapPin className="w-5 h-5 text-white" />,
              gradient: 'from-teal-500 to-emerald-600',
              border: 'border-teal-500/40 hover:border-teal-400',
              badge1: `Filter by City`,
              onClick: () => {
                openModule('helpers');
                setLocationFilter('Gandhinagar');
              },
            },
            {
              step: '6',
              title: '📣 Promote Your Business Ads & Requests (विज्ञापन और बुकिंग रिक्वेस्ट)',
              subtitle: 'यूज़र्स द्वारा भरे गए विज्ञापन फॉर्म देखें, प्रोफाइल जांचें और 1-क्लिक में विज्ञापन Live करें',
              icon: <Megaphone className="w-5 h-5 text-white" />,
              gradient: 'from-blue-600 to-indigo-600',
              border: 'border-blue-500/40 hover:border-blue-400',
              badge1: `Total Ads: ${ads.length}`,
              badge2: pendingAdsCount > 0 ? `Pending Requests: ${pendingAdsCount}` : undefined,
              onClick: () => openModule('ads'),
            },
            {
              step: '7',
              title: '🏪 Local Shops & Businesses (लोकल दुकानें और बिज़नेस)',
              subtitle: 'वेबसाइट पर रजिस्टर सभी दुकानों और शोरूम की लिस्ट — वेरीफाई, एडिट या ब्लॉक करें',
              icon: <Store className="w-5 h-5 text-white" />,
              gradient: 'from-purple-500 to-indigo-600',
              border: 'border-purple-500/40 hover:border-purple-400',
              badge1: `Shops: ${businesses.length}`,
              badge2: businesses.filter(b => getNormalizedStatus(b, 'businesses') === 'pending').length > 0
                ? `Pending: ${businesses.filter(b => getNormalizedStatus(b, 'businesses') === 'pending').length}`
                : undefined,
              onClick: () => openModule('businesses'),
            },
            {
              step: '8',
              title: '💼 Job Seekers (नौकरी चाहने वाले उम्मीदवार)',
              subtitle: 'नौकरी ढूंढ रहे उम्मीदवारों की प्रोफाइल, अनुभव और संपर्क नंबर की जांच करें',
              icon: <Briefcase className="w-5 h-5 text-white" />,
              gradient: 'from-blue-500 to-cyan-600',
              border: 'border-blue-500/40 hover:border-blue-400',
              badge1: `Seekers: ${jobSeekersList.length}`,
              badge2: jobSeekersList.filter(j => getNormalizedStatus(j, 'job_seekers') === 'pending').length > 0
                ? `Pending: ${jobSeekersList.filter(j => getNormalizedStatus(j, 'job_seekers') === 'pending').length}`
                : undefined,
              onClick: () => openModule('job_seekers'),
            },
            {
              step: '9',
              title: '🏢 Employers & Staff Vacancies (नियोक्ता और जॉब वेकेंसी)',
              subtitle: 'जिन कंपनियों या दुकानों को स्टाफ की ज़रूरत है उनकी वेकेंसी लिस्ट और अप्रूवल',
              icon: <Building2 className="w-5 h-5 text-white" />,
              gradient: 'from-amber-500 to-orange-600',
              border: 'border-amber-500/40 hover:border-amber-400',
              badge1: `Vacancies: ${employersList.length}`,
              badge2: employersList.filter(e => getNormalizedStatus(e, 'employers') === 'pending').length > 0
                ? `Pending: ${employersList.filter(e => getNormalizedStatus(e, 'employers') === 'pending').length}`
                : undefined,
              onClick: () => openModule('employers'),
            },
            {
              step: '10',
              title: '💡 Public Suggestions & User Reports (सुझाव पेटी और शिकायतें)',
              subtitle: 'पब्लिक सजेशन बॉक्स के सुझाव और यूज़र्स द्वारा की गई शिकायतों (Reports) का समाधान करें',
              icon: <Flag className="w-5 h-5 text-white" />,
              gradient: 'from-pink-500 to-rose-600',
              border: 'border-pink-500/40 hover:border-pink-400',
              badge1: `Suggestions: ${publicSuggestions.length}`,
              badge2: `Reports: ${reports.length}`,
              onClick: () => openModule('feedback_categories'),
            },
          ];

          return (
            <div className="space-y-4">
              {/* Top Sub-Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-orange-400" />
                    <span>Website Start-to-End Admin Control Banners (ऊपर से नीचे वेबसाइट के क्रम में)</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    किसी भी छोटे बैनर पर क्लिक करें — सारा डेटा सीधे PostgreSQL डेटाबेस से जुड़ा है।
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openAdminCreateModal('helpers', true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add New Entry</span>
                  </button>
                  <button
                    onClick={() => openModule('approved_list')}
                    className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approved List</span>
                  </button>
                  <button
                    onClick={() => openModule('security_vault')}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Security Vault ({securityVaultRecords.length})</span>
                  </button>
                </div>
              </div>

              {/* Clean Ordered List of Small Clickable Banners */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topToBottomBanners.map((b, idx) => (
                  <motion.button
                    key={b.step}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={b.onClick}
                    className={`text-left group relative overflow-hidden rounded-2xl bg-[#111827] hover:bg-[#162033] border ${b.border} p-3.5 sm:p-4 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer flex items-center justify-between gap-3`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${b.gradient} flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform`}>
                        {b.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-orange-400 border border-slate-700">
                            #{b.step}
                          </span>
                          <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-orange-300 transition-colors truncate">
                            {b.title}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                          {b.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-[11px] font-black text-slate-200">
                        {b.badge1}
                      </span>
                      {b.badge2 && (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-[11px] font-black text-amber-300">
                          {b.badge2}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-transform hidden sm:block" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ============================================================ */}
        {/* VIEW 1A: DEDICATED 3-LANGUAGE HERO PHOTO BANNER MANAGER      */}
        {/* ============================================================ */}
        {activeModule === 'hero_banner' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#111827] border border-slate-800 p-4 rounded-2xl">
              <button
                onClick={() => openModule('home')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-black border border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-orange-400" />
                <span>← Back to Admin Dashboard</span>
              </button>
              <span className="text-xs font-black text-cyan-300">
                🖼️ Section #1: 3-Language Top Hero Photo Banner (GU / HI / EN)
              </span>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-blue-950/90 via-[#111827] to-indigo-950/80 border-2 border-cyan-500/40 p-5 sm:p-6 shadow-2xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shrink-0">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">
                      3-Language Home Page Hero Banner (ગુજરાતી • हिंदी • English)
                    </h2>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      यूज़र वेबसाइट पर जो भाषा चुनेगा उसे उसी भाषा का बैनर दिखेगा। स्मार्ट बैकअप: अगर किसी भाषा का बैनर अपलोड नहीं है, तो अपने-आप <strong>हिंदी वाला बैनर</strong> दिखाई देगा।
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {([
                  {
                    langKey: 'gu' as const,
                    badge: '1. ગુજરાતી (GU)',
                    title: 'ગુજરાતી ભાષાનું બેનર',
                    subtitle: 'जब यूज़र ગુજરાતી (GU) चुनेगा तब यह बैनर दिखेगा',
                    storageKey: '__home_hero_banner_gu__',
                    defaultImg: DEFAULT_HOME_HERO_BANNER_GU,
                    accent: 'border-emerald-500/40 bg-emerald-950/20'
                  },
                  {
                    langKey: 'hi' as const,
                    badge: '2. हिंदी (HI - Default Fallback)',
                    title: 'हिंदी भाषा का बैनर (मुख्य बैकअप)',
                    subtitle: 'हिंदी चुनने पर और किसी अन्य भाषा का बैनर न होने पर यही बैनर दिखेगा',
                    storageKey: '__home_hero_banner_hi__',
                    defaultImg: DEFAULT_HOME_HERO_BANNER_HI,
                    accent: 'border-amber-500/50 bg-amber-950/20'
                  },
                  {
                    langKey: 'en' as const,
                    badge: '3. English (EN)',
                    title: 'English Language Banner',
                    subtitle: 'जब तक English बैनर अपलोड नहीं करेंगे, तब तक हिंदी बैनर ही दिखेगा',
                    storageKey: '__home_hero_banner_en__',
                    defaultImg: DEFAULT_HOME_HERO_BANNER_HI,
                    accent: 'border-cyan-500/40 bg-cyan-950/20'
                  }
                ]).map((slot) => {
                  const rawStored =
                    slot.langKey === 'gu'
                      ? categoryImages['__home_hero_banner_gu__'] || categoryImages['__home_hero_banner__']
                      : categoryImages[slot.storageKey];
                  const hasCustomUploaded = Boolean(rawStored && rawStored !== '__deleted__');
                  const fallbackHindi =
                    categoryImages['__home_hero_banner_hi__'] &&
                    categoryImages['__home_hero_banner_hi__'] !== '__deleted__'
                      ? categoryImages['__home_hero_banner_hi__']
                      : DEFAULT_HOME_HERO_BANNER_HI;
                  const livePreviewUrl = hasCustomUploaded
                    ? rawStored
                    : slot.langKey === 'gu'
                    ? DEFAULT_HOME_HERO_BANNER_GU
                    : fallbackHindi;

                  return (
                    <div
                      key={slot.langKey}
                      className={`rounded-2xl border ${slot.accent} p-4 flex flex-col justify-between gap-3 bg-slate-900/90 shadow-lg`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-black text-white">
                            {slot.badge}
                          </span>
                          {hasCustomUploaded ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black text-emerald-300">
                              ✓ Custom Uploaded
                            </span>
                          ) : slot.langKey === 'en' ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300">
                              ⚡ Using Hindi Fallback
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black text-cyan-300">
                              ✓ Active Default
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-black text-white">{slot.title}</h3>
                        <p className="text-[11px] text-slate-400">{slot.subtitle}</p>

                        <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-1.5 mt-2">
                          <img
                            src={livePreviewUrl}
                            alt={slot.title}
                            className="w-full h-auto block object-contain rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                        <label className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {isUploadingHeroBanner && uploadingBannerLang === slot.langKey
                              ? '⏳ Uploading...'
                              : `📸 Upload ${slot.langKey.toUpperCase()}`}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadLanguageHeroBanner(slot.langKey, e)}
                            disabled={isUploadingHeroBanner}
                            className="hidden"
                          />
                        </label>

                        {hasCustomUploaded && (
                          <button
                            type="button"
                            onClick={() => handleResetLanguageHeroBanner(slot.langKey)}
                            disabled={isUploadingHeroBanner}
                            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-black text-xs transition-all cursor-pointer flex items-center gap-1"
                            title="Reset to default banner"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1C: DEDICATED CUSTOMER RATINGS & REVIEWS MODULE         */}
        {/* ============================================================ */}
        {activeModule === 'helper_reviews' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-[#111827] border border-slate-800 p-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openModule('home')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-orange-400" />
                  <span>← Back to Admin Dashboard</span>
                </button>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span>Customer Ratings &amp; Reviews ({adminReviews.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    ग्राहकों द्वारा सर्विस एक्सपर्ट्स को दी गई रेटिंग और रिव्यू देखें — इससे पता चलेगा किस कारीगर का काम कैसा है।
                  </p>
                </div>
              </div>
            </div>

            {adminReviews.length === 0 ? (
              <div className="rounded-3xl bg-[#111827] border border-slate-800 p-10 text-center space-y-2">
                <Star className="w-10 h-10 text-amber-400 mx-auto" />
                <p className="text-sm font-black text-white">अभी तक कोई कस्टमर रिव्यू नहीं आया है</p>
                <p className="text-xs text-slate-400">
                  जब ग्राहक मेन वेबसाइट पर किसी सर्विस एक्सपर्ट को 1–5 स्टार और रिव्यू देंगे, तो वह तुरंत यहाँ दिखाई देगा।
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {adminReviews.map((rev) => {
                  const matchedHelper = helpers.find(h => String(h.id) === String(rev.helperId));
                  return (
                    <div
                      key={rev.id}
                      className="rounded-2xl bg-[#111827] border border-slate-800 p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                          <div>
                            <span className="text-[10px] font-black uppercase text-emerald-400 block">
                              Service Expert (कारीगर):
                            </span>
                            <h3 className="text-sm font-black text-white">
                              {matchedHelper?.name || rev.helperName || `Expert #${rev.helperId}`}
                              {matchedHelper?.service ? ` (${matchedHelper.service})` : ''}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                            <span>{'⭐'.repeat(Math.max(1, Math.min(5, Number(rev.rating) || 5)))}</span>
                            <span>({rev.rating}/5)</span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-200 font-medium">
                          &ldquo;{rev.comment || 'Great service!'}&rdquo;
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                          <span className="font-bold text-sky-300">
                            👤 Customer: {rev.reviewerName}
                          </span>
                          {rev.reviewerPhone && (
                            <span>📞 {rev.reviewerPhone}</span>
                          )}
                          {rev.createdAt && (
                            <span>🕒 {new Date(rev.createdAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await deleteAdminHelperReview(rev.id);
                            if (ok) {
                              setAdminReviews(prev => prev.filter(r => r.id !== rev.id));
                              showToast('🗑️ Review deleted & expert rating recalculated');
                              loadAllData();
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-black flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Review</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1B: DEDICATED APPROVED LIST (ALL ADMIN-APPROVED ITEMS)  */}
        {/* ============================================================ */}
        {activeModule === 'approved_list' && (() => {
          const q = approvedSearchQuery.trim().toLowerCase();
          const matchesSearch = (item: any) => !q || JSON.stringify(item).toLowerCase().includes(q);

          const approvedGroups: Array<{
            key: 'helpers' | 'businesses' | 'simple_users' | 'employers' | 'job_seekers' | 'help_posts';
            module: AdminModuleId;
            title: string;
            titleHi: string;
            badgeColor: string;
            items: any[];
          }> = [
            {
              key: 'helpers',
              module: 'helpers',
              title: '🛠️ Approved Service Experts & Skilled Workers',
              titleHi: 'अप्रूव्ड सर्विस एक्सपर्ट्स और कारीगर',
              badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              items: helpers.filter(h => getNormalizedStatus(h, 'helpers') === 'approved' && matchesSearch(h))
            },
            {
              key: 'businesses',
              module: 'businesses',
              title: '🏪 Approved Businesses & Shops',
              titleHi: 'अप्रूव्ड दुकानें और बिज़नेस',
              badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
              items: businesses.filter(b => getNormalizedStatus(b, 'businesses') === 'approved' && matchesSearch(b))
            },
            {
              key: 'simple_users',
              module: 'simple_users',
              title: '👤 Approved Simple User Profiles',
              titleHi: 'अप्रूव्ड यूज़र प्रोफाइल्स',
              badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
              items: simpleUsers.filter(u => getNormalizedStatus(u, 'simple_users') === 'approved' && matchesSearch(u))
            },
            {
              key: 'employers',
              module: 'employers',
              title: '🏢 Approved Employer Registrations & Job Vacancies',
              titleHi: 'अप्रूव्ड नियोक्ता और स्टाफ वेकेंसी',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              items: employersList.filter(j => getNormalizedStatus(j, 'employers') === 'approved' && matchesSearch(j))
            },
            {
              key: 'job_seekers',
              module: 'job_seekers',
              title: '💼 Approved Job Seekers',
              titleHi: 'अप्रूव्ड नौकरी चाहने वाले (Job Seekers)',
              badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
              items: jobSeekersList.filter(j => getNormalizedStatus(j, 'job_seekers') === 'approved' && matchesSearch(j))
            },
            {
              key: 'help_posts',
              module: 'help_posts',
              title: '📢 Approved Public Broadcast Help Posts',
              titleHi: 'अप्रूव्ड पब्लिक हेल्प पोस्ट्स',
              badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
              items: intents.filter(i => getNormalizedStatus(i, 'help_posts') === 'approved' && matchesSearch(i))
            }
          ];

          const visibleGroups = approvedGroupFilter === 'all'
            ? approvedGroups
            : approvedGroups.filter(g => g.key === approvedGroupFilter);

          const totalApprovedCount = approvedGroups.reduce((acc, g) => acc + g.items.length, 0);

          return (
            <div className="space-y-6">
              <div className="rounded-3xl bg-[#111827] border border-emerald-500/40 p-5 sm:p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <button
                    onClick={() => openModule('home')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-black border border-slate-700 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-400" />
                    <span>← Back to Admin Dashboard</span>
                  </button>

                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs font-black text-emerald-300">
                    ✅ Total Approved Items: {totalApprovedCount}
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      ✅ Approved List (Master Verified Directory)
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium">
                      एडमिन द्वारा अप्रूव किए गए सभी आइटम्स अलग-अलग सेक्शन में यहाँ व्यवस्थित हैं।
                    </p>
                  </div>
                </div>

                {/* Search + Group Filter Tabs */}
                <div className="mt-5 pt-4 border-t border-slate-800/90 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={approvedSearchQuery}
                      onChange={(e) => setApprovedSearchQuery(e.target.value)}
                      placeholder="Search across all approved items (Name, Business, Category, Phone, Area)..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setApprovedGroupFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        approvedGroupFilter === 'all'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      All Approved ({totalApprovedCount})
                    </button>
                    {approvedGroups.map(g => (
                      <button
                        key={g.key}
                        onClick={() => setApprovedGroupFilter(g.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          approvedGroupFilter === g.key
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                            : 'bg-slate-800/80 text-slate-300 hover:text-white'
                        }`}
                      >
                        {g.title.split(' ').slice(0, 3).join(' ')} ({g.items.length})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Distinctly Grouped Approved Sections */}
              {visibleGroups.map(group => (
                <div key={group.key} className="rounded-3xl bg-[#111827] border border-slate-800 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white">{group.title}</h3>
                      <p className="text-xs text-slate-400 font-bold">{group.titleHi}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-xl text-xs font-black border ${group.badgeColor}`}>
                        {group.items.length} Approved
                      </span>
                      <button
                        onClick={() => {
                          openModule(group.module);
                          setStatusFilter('approved');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-slate-200 cursor-pointer"
                      >
                        Open Full Module →
                      </button>
                    </div>
                  </div>

                  {group.items.length === 0 ? (
                    <div className="py-6 text-center text-xs font-bold text-slate-500">
                      No approved items found in this group.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {group.items.map(item => {
                        const title =
                          item.name ||
                          item.businessName ||
                          item.companyOrShopName ||
                          item.fullName ||
                          item.userName ||
                          item.authorName ||
                          'Approved Record';
                        const categoryLabel =
                          item.customCategoryName ||
                          item.categoryLabel ||
                          item.jobRole ||
                          item.category ||
                          item.categoryId ||
                          item.skills?.[0] ||
                          'Verified';
                        const phone = item.phone || item.whatsapp || item.contactPhone || '';
                        const area = item.area || item.jobLocation || item.location || item.address || 'Local Area';
                        const desc = item.description || item.bio || item.jobDescription || item.skills || '';

                        return (
                          <div
                            key={`${group.key}_${item.id}`}
                            className="rounded-2xl bg-slate-900/90 border border-emerald-500/25 hover:border-emerald-500/50 p-4 flex flex-col justify-between gap-3 transition-all"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="text-sm font-black text-white leading-snug">{title}</h4>
                                  <span className="inline-block mt-0.5 text-[11px] font-extrabold text-emerald-400">
                                    {String(categoryLabel)}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black text-emerald-300 shrink-0">
                                  ✅ APPROVED
                                </span>
                              </div>

                              {desc && (
                                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                  {Array.isArray(desc) ? desc.join(', ') : String(desc)}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400 font-bold">
                                {area && <span>📍 {area}</span>}
                                {phone && <span>📞 {phone}</span>}
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(group.module, item)}
                                className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[11px] font-black cursor-pointer"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                disabled={actionLoadingId === item.id}
                                onClick={() => handleStatusAction(group.module, item, 'rejected')}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-black cursor-pointer disabled:opacity-50"
                              >
                                ⏸️ Revoke
                              </button>
                              <button
                                type="button"
                                disabled={actionLoadingId === item.id}
                                onClick={() => handleDeleteAction(group.module, item)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-black cursor-pointer disabled:opacity-50"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* ============================================================ */}
        {/* VIEW 2: DEDICATED MANAGEMENT SUB-PAGE FOR SELECTED MODULE    */}
        {/* ============================================================ */}
        {activeModule !== 'home' && activeModule !== 'hero_banner' && activeModule !== 'helper_reviews' && activeModule !== 'approved_list' && activeModule !== 'ads' && activeModule !== 'security_vault' && currentModuleMeta && (
          <div className="space-y-5">
            {/* Top Back Button + Module Header */}
            <div className="rounded-3xl bg-[#111827] border border-slate-800 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <button
                  onClick={() => openModule('home')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-black border border-slate-700 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-orange-400" />
                  <span>← Back to Admin Dashboard</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {(['businesses', 'helpers', 'simple_users', 'job_seekers', 'employers'] as const).includes(activeModule as any) && (
                    <button
                      onClick={() => openAdminCreateModal(activeModule as any, false)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add &amp; Publish New (Optional Email/Phone)</span>
                    </button>
                  )}
                  <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-slate-200">
                    Total: {currentModuleMeta.totalCount}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs font-black text-amber-300">
                    Pending Approval: {currentModuleMeta.pendingCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${currentModuleMeta.gradient} flex items-center justify-center shadow-lg shrink-0`}>
                  {currentModuleMeta.icon}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {currentModuleMeta.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">
                    Manage and review entries for {currentModuleMeta.title} (Date-Wise &amp; Location-Wise)
                  </p>
                </div>
              </div>

              {/* Search & Status Filter Bar */}
              <div className="mt-5 pt-4 border-t border-slate-800/90 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search in ${currentModuleMeta.title} (Name, Phone, Area, Category)...`}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map(st => {
                      const baseList =
                        activeModule === 'helpers'
                          ? helpers
                          : activeModule === 'simple_users'
                          ? simpleUsers
                          : activeModule === 'businesses'
                          ? businesses
                          : activeModule === 'help_posts'
                          ? intents
                          : activeModule === 'job_seekers'
                          ? jobSeekersList
                          : activeModule === 'employers'
                          ? employersList
                          : reports;
                      const tabCount =
                        st === 'all'
                          ? baseList.length
                          : baseList.filter(x => getNormalizedStatus(x, activeModule) === st).length;
                      return (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-2 rounded-xl text-xs font-black capitalize transition-all cursor-pointer shrink-0 ${
                            statusFilter === st
                              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                              : 'bg-slate-800/80 text-slate-400 hover:text-white'
                          }`}
                        >
                          {st === 'all' ? `All (${tabCount})` : `${st} (${tabCount})`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date-Wise & City/Area Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-black text-slate-400 flex items-center gap-1 mr-1">
                      <Calendar className="w-3.5 h-3.5 text-orange-400" /> Date Filter:
                    </span>
                    {[
                      { id: 'all', label: 'All Dates' },
                      { id: 'today', label: 'Today (आज)' },
                      { id: 'yesterday', label: 'Yesterday (कल)' },
                    ].map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDateFilter(d.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                          dateFilter === d.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                    <input
                      type="date"
                      value={dateFilter !== 'all' && dateFilter !== 'today' && dateFilter !== 'yesterday' ? dateFilter : ''}
                      onChange={(e) => setDateFilter(e.target.value || 'all')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-bold"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-black text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Area / City:
                    </span>
                    {['all', 'Gandhinagar', 'Ahmedabad', 'Kudasan', 'Sargasan', 'Sector'].map(loc => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLocationFilter(loc)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                          locationFilter === loc
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {loc === 'all' ? 'All Areas' : loc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* CATEGORY FOLDER / FILTER VIEW FOR SERVICE EXPERTS ONLY         */}
            {/* ============================================================== */}
            {activeModule === 'helpers' && (() => {
              const sourceList = helpers;
              const statusFilteredSource = sourceList.filter(item => {
                const st = getNormalizedStatus(item, activeModule);
                return statusFilter === 'all' || st === statusFilter;
              });

              const countByMainCat: Record<string, number> = {};
              const countBySubCat: Record<string, number> = {};
              statusFilteredSource.forEach(item => {
                const info = getItemCategoryInfo(item);
                countByMainCat[info.mainCatId] = (countByMainCat[info.mainCatId] || 0) + 1;
                countBySubCat[info.subCatId] = (countBySubCat[info.subCatId] || 0) + 1;
              });

              const visibleSubCats =
                selectedMainCatFilter === 'all'
                  ? CATEGORIES
                  : CATEGORIES.filter(c => (c.mainCategoryId || c.masterCategory) === selectedMainCatFilter);

              return (
                <div className="rounded-3xl bg-[#111827] border border-slate-800 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        <Filter className="w-4 h-4 text-emerald-400" />
                        <span>📂 Category Folder Filter ({MASTER_CATEGORIES.length} Main Groups • {CATEGORIES.length} Sub-Categories)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Synced with Main Website Categories — Click any Main Category or Sub-Category folder to view users registered in that category.
                      </p>
                    </div>
                    {(selectedMainCatFilter !== 'all' || selectedSubCatFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMainCatFilter('all');
                          setSelectedSubCatFilter('all');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-black cursor-pointer"
                      >
                        ✕ Clear Category Filter (Show All {statusFilteredSource.length})
                      </button>
                    )}
                  </div>

                  {/* 10 Main Categories Folders Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMainCatFilter('all');
                        setSelectedSubCatFilter('all');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        selectedMainCatFilter === 'all'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black truncate">📂 All Website Categories</div>
                        <div className={`text-[11px] font-bold truncate ${selectedMainCatFilter === 'all' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          सभी 10 मुख्य केटेगरी ({CATEGORIES.length} सब-केटेगरी)
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                        selectedMainCatFilter === 'all' ? 'bg-white text-emerald-900' : 'bg-slate-800 text-emerald-400 border border-slate-700'
                      }`}>
                        {statusFilteredSource.length}
                      </span>
                    </button>

                    {MASTER_CATEGORIES.map((mCat) => {
                      const cnt = countByMainCat[mCat.id] || 0;
                      const isSel = selectedMainCatFilter === mCat.id;
                      return (
                        <button
                          key={mCat.id}
                          type="button"
                          onClick={() => {
                            setSelectedMainCatFilter(isSel ? 'all' : mCat.id);
                            setSelectedSubCatFilter('all');
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSel
                              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-amber-300 shadow-md'
                              : cnt > 0
                              ? 'bg-slate-900/95 hover:bg-slate-800/90 text-white border-emerald-500/35'
                              : 'bg-slate-950/70 hover:bg-slate-900 text-slate-400 border-slate-800/80'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-black leading-snug break-words">
                              {mCat.nameEn}
                            </div>
                            <div className={`text-[11px] font-semibold leading-snug break-words mt-0.5 ${isSel ? 'text-amber-100' : 'text-slate-400'}`}>
                              {mCat.nameHi}
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                            isSel
                              ? 'bg-white text-orange-900'
                              : cnt > 0
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}>
                            {cnt}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-Categories Pills Filter */}
                  <div className="pt-3 border-t border-slate-800/90">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Sub-Categories {selectedMainCatFilter !== 'all' ? `in ${MASTER_CATEGORIES.find(m => m.id === selectedMainCatFilter)?.nameEn || ''}` : `(All ${CATEGORIES.length})`} — Click to Filter:
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => setSelectedSubCatFilter('all')}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                          selectedSubCatFilter === 'all'
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        All Sub-Categories ({
                          selectedMainCatFilter === 'all'
                            ? statusFilteredSource.length
                            : countByMainCat[selectedMainCatFilter] || 0
                        })
                      </button>

                      {visibleSubCats.map(sub => {
                        const subCnt = countBySubCat[sub.id] || 0;
                        const isSubSel = selectedSubCatFilter === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setSelectedSubCatFilter(isSubSel ? 'all' : sub.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                              isSubSel
                                ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black shadow-sm'
                                : subCnt > 0
                                ? 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-950/80 hover:bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            <span>{sub.nameEn}</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                              isSubSel
                                ? 'bg-slate-950 text-emerald-300'
                                : subCnt > 0
                                ? 'bg-emerald-500/20 text-emerald-200'
                                : 'bg-slate-900 text-slate-500'
                            }`}>
                              {subCnt}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Extra Platform Categories Manager inside 'feedback_categories' */}
            {activeModule === 'feedback_categories' && (
              <div className="rounded-3xl bg-[#111827] border border-slate-800 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-pink-400" />
                      Platform Categories ({CATEGORIES.length + customCategories.length} Active)
                    </h3>
                    <p className="text-xs text-slate-400">
                      View core LocoHelp categories or add a custom category.
                    </p>
                  </div>
                </div>

                {/* Add Category Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newCatName.trim()) return;
                    const newCat = {
                      id: 'custom_' + Date.now(),
                      name: newCatName.trim(),
                      nameHi: newCatNameHi.trim() || newCatName.trim(),
                      icon: newCatIcon.trim() || '🛠️'
                    };
                    const updated = [...customCategories, newCat];
                    setCustomCategories(updated);
                    try {
                      localStorage.setItem('locohelp_custom_categories', JSON.stringify(updated));
                    } catch {}
                    setNewCatName('');
                    setNewCatNameHi('');
                    showToast('✅ Category added!');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-4"
                >
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Category Name (English)"
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newCatNameHi}
                    onChange={(e) => setNewCatNameHi(e.target.value)}
                    placeholder="Category Name (Hindi)"
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    placeholder="Emoji Icon (e.g. 🛠️)"
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-black cursor-pointer"
                  >
                    + Add Category
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                  {CATEGORIES.map(c => {
                    const catRegCount = helpers.filter(
                      h => getItemCategoryInfo(h).subCatId === c.id
                    ).length;
                    return (
                      <div
                        key={c.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
                      >
                        <div className="w-full sm:w-auto min-w-0">
                          <div className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                            {c.nameEn}
                          </div>
                          {c.nameHi && (
                            <div className="text-xs font-semibold text-amber-400/90 leading-snug break-words mt-0.5">
                              {c.nameHi}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:w-auto shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold">
                            {catRegCount} Experts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {customCategories.map(c => (
                    <div
                      key={c.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-pink-500/10 border border-pink-500/30"
                    >
                      <div className="w-full sm:w-auto min-w-0">
                        <div className="text-sm sm:text-base font-bold text-pink-200 leading-snug break-words">
                          {c.icon} {c.name}
                        </div>
                        {c.nameHi && (
                          <div className="text-xs font-semibold text-pink-300/90 leading-snug break-words mt-0.5">
                            {c.nameHi}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:w-auto shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-pink-500/20">
                        <span className="px-2 py-0.5 rounded-lg bg-pink-500/20 text-pink-200 text-[11px] font-bold">
                          Custom Category
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = customCategories.filter(x => x.id !== c.id);
                            setCustomCategories(updated);
                            try {
                              localStorage.setItem('locohelp_custom_categories', JSON.stringify(updated));
                            } catch {}
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/35 border border-red-500/30 text-red-300 text-[11px] font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entries List */}
            {filteredModuleItems.length === 0 ? (
              <div className="rounded-3xl bg-[#111827] border border-slate-800 p-12 text-center">
                <p className="text-base font-bold text-slate-300">No entries found in this view</p>
                <p className="text-xs text-slate-500 mt-1">
                  Try clearing your search filter or switching the status tab above.
                </p>
              </div>
            ) : statusFilter === 'approved' ? (
              /* Category-Wise Approved Profiles Directory */
              <div className="space-y-5">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Approved Profiles — Organized Category-Wise ({filteredModuleItems.length} Total Approved)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                    Live on Website
                  </span>
                </div>

                {Object.entries(
                  filteredModuleItems.reduce((acc: Record<string, any[]>, item: any) => {
                    const catKey =
                      item.customCategoryName ||
                      item.categoryLabel ||
                      item.category ||
                      item.categoryId ||
                      item.service ||
                      'General Category';
                    if (!acc[catKey]) acc[catKey] = [];
                    acc[catKey].push(item);
                    return acc;
                  }, {} as Record<string, any[]>)
                ).map(([catName, catItems]) => {
                  const itemsList = catItems as any[];
                  return (
                    <div key={catName} className="rounded-2xl bg-[#111827] border border-slate-800 p-4 sm:p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="w-full sm:w-auto min-w-0">
                          <span className="text-sm sm:text-base font-bold text-amber-400 leading-snug break-words block">
                            🏷️ Category: {catName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:w-auto shrink-0">
                          <span className="text-[11px] bg-slate-800 text-slate-300 font-extrabold px-2.5 py-1 rounded-full">
                            {itemsList.length} Approved Profiles
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {itemsList.map((item: any) => {
                        const idDoc = getItemIdDoc(item);
                        const isBusy = actionLoadingId === item.id;
                        const title = item.name || item.fullName || item.companyOrShopName || item.userName || 'Entry #' + String(item.id).slice(-5);
                        const phone = item.phone || item.whatsapp || item.userPhone || item.contactPhone || '';
                        const area = item.area || item.jobLocation || item.address || item.locationName || '';
                        const desc = item.description || item.jobDescription || item.skills || item.bio || item.experience || '';

                        return (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 hover:border-emerald-500/40 transition-all"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                                {title}
                              </div>
                              <div className="text-xs font-bold text-amber-400 leading-snug break-words">
                                {catName}
                              </div>
                              {phone && (
                                <p className="text-[11px] font-bold text-slate-300 flex items-center gap-1 break-words">
                                  <Phone className="w-3 h-3 text-emerald-400 shrink-0" /> +91 {phone}
                                </p>
                              )}
                              {area && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 break-words">
                                  <MapPin className="w-3 h-3 text-orange-400 shrink-0" /> {area}
                                </p>
                              )}
                              {desc && (
                                <p className="text-[11px] text-slate-400 line-clamp-2 break-words">{desc}</p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                ✓ Verified
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setViewingItem({ module: activeModule, data: { ...item, idDocumentWatermarked: idDoc } })}
                                  className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                                  title="View Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openEditModal(activeModule, item)}
                                  className="p-1.5 rounded-lg bg-slate-800 text-amber-400 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                                  title="Edit Profile"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleStatusAction(activeModule, item, 'rejected')}
                                  disabled={isBusy}
                                  className="p-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold hover:bg-red-500/25 cursor-pointer disabled:opacity-50"
                                  title="Revoke Approval (Revert to Rejected)"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredModuleItems.map((item) => {
                  const status = getNormalizedStatus(item, activeModule);
                  const idDoc = getItemIdDoc(item);
                  const visitingCardDoc = getItemVisitingCard(item, idDoc);
                  const isBusy = actionLoadingId === item.id;

                  // Extract display fields cleanly across modules (including Help Posts authorName)
                  const title =
                    item.name ||
                    item.fullName ||
                    item.companyOrShopName ||
                    item.authorName ||
                    item.author_name ||
                    item.posterName ||
                    item.userName ||
                    item.user_name ||
                    item.reporterName ||
                    item.reason ||
                    (item.email ? String(item.email).split('@')[0] : '') ||
                    'User #' + String(item.id).slice(-5);

                  const catMeta = activeModule === 'helpers'
                    ? getItemCategoryInfo(item)
                    : null;
                  const subtitle =
                    activeModule === 'simple_users'
                      ? `👤 User Profile${item.category || item.customCategoryName ? ` • ${item.customCategoryName || item.category}` : ''}`
                      : catMeta
                      ? `${catMeta.displaySubName} • ${catMeta.mainCatObj.nameEn}`
                      : item.customCategoryName ||
                        item.categoryLabel ||
                        item.jobRole ||
                        item.category ||
                        item.headline ||
                        item.service ||
                        item.targetType ||
                        'General';

                  const phone =
                    item.phone ||
                    item.whatsapp ||
                    item.authorPhone ||
                    item.author_phone ||
                    item.userPhone ||
                    item.contactPhone ||
                    '';
                  const rawEmail =
                    item.email ||
                    item.authorEmail ||
                    item.author_email ||
                    item.userEmail ||
                    '';
                  const email = rawEmail.endsWith('@phone.locohelp.com') ? '' : rawEmail;
                  const area = item.area || item.jobLocation || item.address || item.locationName || '';
                  const skillsStr = Array.isArray(item.skills) ? item.skills.join(', ') : (item.skills || '');
                  const experienceStr = item.experience || '';
                  const desc =
                    item.description ||
                    item.text ||
                    item.content ||
                    item.jobDescription ||
                    skillsStr ||
                    item.bio ||
                    item.details ||
                    experienceStr ||
                    '';
                  const extraBadge =
                    item.salaryOffer ||
                    item.expectedSalary ||
                    item.priceRange ||
                    item.timings ||
                    item.urgency ||
                    '';

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-[#111827] border border-slate-800/90 hover:border-slate-700 p-4 sm:p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left Content */}
                      <div className="space-y-2.5 flex-1 min-w-0">
                        {/* Top Row: Full Category Name & Status Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <div className="w-full sm:w-auto min-w-0">
                            <span className="text-sm sm:text-base font-bold text-amber-400 leading-snug break-words block">
                              🏷️ {subtitle}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:w-auto">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                status === 'approved'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : status === 'rejected'
                                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              {status === 'approved' ? '✓ Approved' : status === 'rejected' ? '✕ Rejected' : '⏳ Pending Approval'}
                            </span>

                            {activeModule === 'helpers' && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black">
                                ⭐ {Number(item.rating || 5.0).toFixed(1)} ({item.reviewCount || item.review_count || 0} Reviews)
                              </span>
                            )}

                            {extraBadge && (
                              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold break-words">
                                {extraBadge}
                              </span>
                            )}

                            {item.linkedBusinessId && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black">
                                🔗 Linked Registered Business
                              </span>
                            )}

                            {idDoc ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                                📸 Live Selfie Attached
                              </span>
                            ) : (
                              (activeModule === 'simple_users' || activeModule === 'helpers') && (
                                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-black">
                                  ⚠️ No Live Selfie Yet
                                </span>
                              )
                            )}

                            {visitingCardDoc && (
                              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-black">
                                🪪 Visiting Card Attached
                              </span>
                            )}

                            {Array.isArray(item.chatSnapshot) && item.chatSnapshot.length > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black">
                                💬 Reported Chat Evidence ({item.chatSnapshot.length} Messages)
                              </span>
                            )}

                            {item.isUserBlocked && (
                              <span className="px-2.5 py-0.5 rounded-full bg-red-600/25 text-red-300 border border-red-500/40 text-[10px] font-black">
                                🚫 Reported User Blocked
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Main Profile Row with Live Selfie Preview & Full Details */}
                        <div className="flex flex-col sm:flex-row items-start gap-3.5 pt-1">
                          {(idDoc || visitingCardDoc) && (
                            <div className="flex items-center gap-2.5 shrink-0">
                              {idDoc && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingItem({
                                      module: activeModule,
                                      data: { ...item, idDocumentWatermarked: idDoc, visitingCardUrl: visitingCardDoc }
                                    })
                                  }
                                  className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-emerald-500/60 bg-slate-950 shadow-md shrink-0 cursor-pointer"
                                  title="Click to view full Live Selfie & Profile Details"
                                >
                                  <img
                                    src={idDoc}
                                    alt="User Live Selfie"
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <span className="absolute bottom-0 inset-x-0 bg-emerald-950/90 text-emerald-300 text-[9px] font-black text-center py-0.5 uppercase tracking-wider">
                                    📸 Live Selfie
                                  </span>
                                </button>
                              )}
                              {visitingCardDoc && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingItem({
                                      module: activeModule,
                                      data: { ...item, idDocumentWatermarked: idDoc, visitingCardUrl: visitingCardDoc }
                                    })
                                  }
                                  className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-cyan-500/50 bg-slate-950 shadow-md shrink-0 cursor-pointer"
                                  title="Click to view Visiting Card / Work Photo"
                                >
                                  <img
                                    src={visitingCardDoc}
                                    alt="Visiting Card"
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <span className="absolute bottom-0 inset-x-0 bg-cyan-950/90 text-cyan-300 text-[9px] font-black text-center py-0.5 uppercase tracking-wider">
                                    🪪 Card/Photo
                                  </span>
                                </button>
                              )}
                            </div>
                          )}

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-black text-white leading-snug break-words">
                              {title}
                              {item.reportedUserName && (
                                <span className="ml-2 text-xs font-extrabold text-rose-400">
                                  (Reported User: {item.reportedUserName})
                                </span>
                              )}
                            </h3>

                            {desc && (
                              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-words">
                                {desc}
                              </p>
                            )}

                            {/* Structured Profile Details Pills (Skills, Experience, Category, Privacy) */}
                            {(skillsStr || experienceStr || item.category || item.isPhonePublic !== undefined) && (
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                {skillsStr && (
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 text-[11px] font-semibold text-slate-200">
                                    🛠️ Skills: {skillsStr}
                                  </span>
                                )}
                                {experienceStr && (
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 text-[11px] font-semibold text-amber-300">
                                    ⏳ Exp: {experienceStr}
                                  </span>
                                )}
                                {item.isPhonePublic !== undefined && (
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 text-[11px] font-semibold text-cyan-300">
                                    {item.isPhonePublic ? '🌐 Phone: Public' : '🔒 Phone: Admin Only'}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                              {phone && (
                                <span className="inline-flex items-center gap-1 text-slate-200 font-bold">
                                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> {phone}
                                </span>
                              )}
                              {email && (
                                <span className="inline-flex items-center gap-1 text-slate-300">
                                  <Mail className="w-3.5 h-3.5 text-sky-400" /> {email}
                                </span>
                              )}
                              {area && (
                                <span className="inline-flex items-center gap-1 text-slate-200 font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-orange-400" /> {area}
                                </span>
                              )}
                              {(item.createdAt || item.submittedAt || item.timestamp) && (
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <Clock className="w-3.5 h-3.5" />
                                  {new Date(item.createdAt || item.submittedAt || item.timestamp).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Actions: View Details, Approve, Reject, Edit, Delete */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                        <button
                          onClick={() =>
                            setViewingItem({
                              module: activeModule,
                              data: {
                                ...item,
                                idDocumentWatermarked: idDoc,
                                visitingCardUrl: visitingCardDoc
                              }
                            })
                          }
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                          title="View All Details, Live Selfie & Visiting Card"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{Array.isArray(item.chatSnapshot) && item.chatSnapshot.length > 0 ? 'View Chat & Details' : 'View Profile & Selfie'}</span>
                        </button>

                        {status !== 'approved' && (
                          <button
                            onClick={() => handleStatusAction(activeModule, item, 'approved')}
                            disabled={isBusy}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {status !== 'rejected' && (
                          <button
                            onClick={() => handleStatusAction(activeModule, item, 'rejected')}
                            disabled={isBusy}
                            className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{status === 'approved' ? 'Revoke / Reject' : 'Reject'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => openEditModal(activeModule, item)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/30 text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteAction(activeModule, item)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/35 text-red-300 border border-red-500/30 text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Public Suggestions Moderation Board */}
            <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                    💡 Public Suggestions Board ({publicSuggestions.length})
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    सार्वजनिक सुझाव पेटी से आए यूजर्स के सभी सुझावों को देखें और किसी भी अनुचित या स्पैम सुझाव को डिलीट करें।
                  </p>
                </div>
              </div>

              {publicSuggestions.length === 0 ? (
                <div className="p-6 text-center bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs">
                  अभी तक कोई सार्वजनिक सुझाव नहीं मिला है।
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {publicSuggestions.map(sug => (
                    <div
                      key={sug.id}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/20 hover:border-amber-500/40 flex flex-col justify-between gap-3 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={sug.userAvatar || 'https://lh3.googleusercontent.com/a/default-user'}
                              alt={sug.userName}
                              className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-700"
                            />
                            <div>
                              <h4 className="text-xs font-black text-amber-300">{sug.userName || 'Community Member'}</h4>
                              {sug.userEmail && <p className="text-[10px] text-slate-400">{sug.userEmail}</p>}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {sug.createdAt ? new Date(sug.createdAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed font-medium break-words">
                          {sug.content}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-extrabold text-amber-400">
                          ❤️ {sug.likesCount || 0} Likes
                        </span>

                        <button
                          type="button"
                          onClick={async () => {
                            await deletePublicSuggestionOnServer(sug.id);
                            setPublicSuggestions(prev => prev.filter(s => s.id !== sug.id));
                            showToast('🗑️ Suggestion deleted successfully!');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/30 text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Suggestion</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* DEDICATED VIEW: ADVERTISEMENTS & BANNERS (16:9 MANAGEMENT)   */}
        {/* ============================================================ */}
        {activeModule === 'ads' && (
          <div className="space-y-5">
            <div className="rounded-3xl bg-[#111827] border border-slate-800 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => openModule('home')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-orange-400" />
                  <span>← Back to Admin Dashboard</span>
                </button>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-cyan-400" />
                    <span>Advertisements &amp; Banners ({ads.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Upload 16:9 banner images, add titles &amp; destination links, toggle active/inactive status, and delete ads.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAdBusinessName('');
                  setAdOfferTitle('');
                  setAdDescription('');
                  setAdArea('Local Market');
                  setAdDestinationUrl('');
                  setAdPhotoUrl('/assets/aistudio/advertisement_30c9824f.png');
                  setAdPhotos([]);
                  setAdIsActive(true);
                  setIsCreateAdModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" /> + Upload New 16:9 Ad Banner
              </button>
            </div>

            {/* Dedicated 5-Slot 16:9 Banner Management for "Promote Your Business / Sponsored Local Offers & Advertisements" */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-950/40 via-[#111827] to-slate-900 border-2 border-amber-500/40 p-5 sm:p-6 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      📢 હોમ પેજ જાહેરાત બેનર્સ (16:9 Aspect Ratio)
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      હોમ પેજ કેટેગરીની બરાબર નીચે
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-white mt-2">
                    પ્રાયોજિત સ્થાનિક ઓફર અને જાહેરાતો (1 થી 5 Auto-Scroll બેનર મેનેજર)
                  </h3>
                  <p className="text-xs text-slate-300 font-medium max-w-2xl mt-1">
                    અહીંથી તમે હોમ પેજ પર કેટેગરીની બરાબર નીચે દેખાતા 1 થી 5 જાહેરાત બેનર (ફોટો, ટાઇટલ અને લિંક) ઉમેરી (Add), સુધારી (Edit) અને હટાવી (Delete) શકો છો. 2 કે વધુ બેનર હશે ત્યારે દર 3.5 સેકન્ડે આપમેળે સ્લાઇડ (Auto-Scroll) થશે.
                  </p>
                </div>

                {/* Status Indicator Pill */}
                {(() => {
                  let activeCount = 0;
                  for (let i = 1; i <= 5; i++) {
                    const img = categoryImages[`__promo_ad_banner_${i}__`];
                    if (img && img !== '__deleted__') activeCount++;
                  }
                  return (
                    <div className="flex flex-col items-end gap-1">
                      <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-amber-400/40 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${activeCount > 0 ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                        <span className="text-xs font-black text-white">
                          સક્રિય બેનર: <span className="text-amber-400">{activeCount}</span> / 5
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {activeCount === 0
                          ? '✨ ડિફોલ્ટ LocoHelp પ્રમોશનલ બેનર દેખાશે'
                          : activeCount === 1
                          ? '📌 ૧ બેનર સ્થિર (Fixed) દેખાશે'
                          : `🔄 ${activeCount} બેનર દર 3.5 સેકન્ડે Auto-Scroll થશે`}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* 5 Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5].map(slotNum => {
                  const storageKey = `__promo_ad_banner_${slotNum}__`;
                  const linkKey = `__promo_ad_banner_link_${slotNum}__`;
                  const titleKey = `__promo_ad_banner_title_${slotNum}__`;
                  const bannerImg = categoryImages[storageKey];
                  const bannerLink = categoryImages[linkKey] && categoryImages[linkKey] !== '__deleted__' ? categoryImages[linkKey] : '';
                  const bannerTitle = categoryImages[titleKey] && categoryImages[titleKey] !== '__deleted__' ? categoryImages[titleKey] : '';
                  const isUploaded = Boolean(bannerImg && bannerImg !== '__deleted__');
                  const isUploading = uploadingPromoAdSlot === slotNum;
                  const isEditing = editingPromoAdSlot === slotNum;

                  return (
                    <div
                      key={slotNum}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                        isUploaded
                          ? 'bg-slate-900/90 border-amber-400/40 shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 border-dashed hover:border-slate-700'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-[10px] font-black">
                            {slotNum}
                          </span>
                          <span>બેનર સ્લોટ {slotNum}</span>
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isUploaded
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {isUploaded ? '🟢 Live Active' : '⚪ ખાલી સ્લોટ'}
                        </span>
                      </div>

                      {/* 16:9 Image Preview or Upload Dropzone */}
                      {isUploaded ? (
                        <div className="space-y-3">
                          <div className="w-full aspect-video rounded-xl overflow-hidden border border-amber-400/40 bg-slate-950 relative group shadow-md">
                            <img
                              src={bannerImg}
                              alt={`Slot ${slotNum} Banner`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute top-2 right-2">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-black/80 text-amber-300 border border-amber-400/40">
                                16:9
                              </span>
                            </div>
                            {bannerTitle && (
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2">
                                <p className="text-[11px] font-black text-white truncate">{bannerTitle}</p>
                              </div>
                            )}
                          </div>

                          {(bannerTitle || bannerLink) && (
                            <div className="space-y-1 text-[11px] bg-slate-950/80 px-2.5 py-2 rounded-lg border border-slate-800">
                              {bannerTitle && (
                                <div className="flex items-center gap-1.5 truncate text-amber-200 font-bold">
                                  <span>🏷️</span>
                                  <span className="truncate">{bannerTitle}</span>
                                </div>
                              )}
                              {bannerLink && (
                                <div className="flex items-center gap-1.5 truncate text-slate-300">
                                  <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
                                  <span className="text-slate-400">લિંક:</span>
                                  <span className="truncate text-cyan-300 font-medium">{bannerLink}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {isEditing && (
                            <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2 mt-2">
                              <label className="text-[10px] font-bold text-slate-300 block">
                                જાહેરાતનું નામ / ઓફર ટાઇટલ (ઓપ્શનલ):
                              </label>
                              <input
                                type="text"
                                value={promoAdCustomTitleInput}
                                onChange={e => setPromoAdCustomTitleInput(e.target.value)}
                                placeholder="દા.ત. ક્રિષ્ના ઇલેક્ટ્રિકલ્સ - 20% ડિસ્કાઉન્ટ"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                              <label className="text-[10px] font-bold text-slate-300 block">
                                ઈમેજ URL:
                              </label>
                              <input
                                type="text"
                                value={promoAdCustomUrlInput}
                                onChange={e => setPromoAdCustomUrlInput(e.target.value)}
                                placeholder="https://... ઈમેજ URL"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                              <label className="text-[10px] font-bold text-slate-300 block">
                                ટાર્ગેટ લિંક (Website / WhatsApp / Phone):
                              </label>
                              <input
                                type="text"
                                value={promoAdCustomLinkInput}
                                onChange={e => setPromoAdCustomLinkInput(e.target.value)}
                                placeholder="https://wa.me/91... અથવા https://myshop.com"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSavePromoAdCustomValues(slotNum)}
                                  disabled={isUploading}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer disabled:opacity-50"
                                >
                                  💾 સેવ કરો
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPromoAdSlot(null)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                                >
                                  રદ કરો
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons for Uploaded Slot */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <label className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{isUploading ? 'અપલોડિંગ...' : '📸 ફોટો બદલો'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => handleUploadPromoAdBanner(slotNum, e)}
                                disabled={isUploading}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                setPromoAdCustomUrlInput(bannerImg || '');
                                setPromoAdCustomTitleInput(bannerTitle || '');
                                setPromoAdCustomLinkInput(bannerLink || '');
                                setEditingPromoAdSlot(prev => (prev === slotNum ? null : slotNum));
                              }}
                              disabled={isUploading}
                              className="py-2 px-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                              title="ટાઇટલ, લિંક અથવા URL સુધારો (Edit)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>એડિટ</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePromoAdBanner(slotNum)}
                              disabled={isUploading}
                              className="py-2 px-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                              title="આ બેનર હટાવો (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>હટાવો</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-400/80 bg-slate-950/60 p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer group">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform mb-2">
                              <Upload className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-black text-slate-200 group-hover:text-amber-300">
                              {isUploading ? 'અપલોડ ચાલુ છે...' : '+ 16:9 બેનર ફોટો અપલોડ કરો'}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1">
                              JPG, PNG અથવા WebP (16:9 રેશિયો)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => handleUploadPromoAdBanner(slotNum, e)}
                              disabled={isUploading}
                              className="hidden"
                            />
                          </label>

                          {isEditing ? (
                            <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2">
                              <label className="text-[10px] font-bold text-slate-300 block">
                                જાહેરાતનું નામ / ઓફર ટાઇટલ (ઓપ્શનલ):
                              </label>
                              <input
                                type="text"
                                value={promoAdCustomTitleInput}
                                onChange={e => setPromoAdCustomTitleInput(e.target.value)}
                                placeholder="દા.ત. ક્રિષ્ના ઇલેક્ટ્રિકલ્સ - 20% ડિસ્કાઉન્ટ"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                              <label className="text-[10px] font-bold text-slate-300 block">
                                ઈમેજ URL:
                              </label>
                              <input
                                type="text"
                                value={promoAdCustomUrlInput}
                                onChange={e => setPromoAdCustomUrlInput(e.target.value)}
                                placeholder="https://... ઈમેજ URL"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                              <label className="text-[10px] font-bold text-slate-300 block">
                                ટાર્ગેટ લિંક (Website / WhatsApp):
                              </label>
                              <input
                                type="text"
                                value={promoAdCustomLinkInput}
                                onChange={e => setPromoAdCustomLinkInput(e.target.value)}
                                placeholder="https://... લિંક (ઓપ્શનલ)"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSavePromoAdCustomValues(slotNum)}
                                  disabled={isUploading}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer disabled:opacity-50"
                                >
                                  💾 સેવ કરો
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPromoAdSlot(null)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                                >
                                  રદ કરો
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPromoAdCustomUrlInput('');
                                setPromoAdCustomTitleInput('');
                                setPromoAdCustomLinkInput('');
                                setEditingPromoAdSlot(slotNum);
                              }}
                              className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>+ URL / ટાઇટલ / લિંકથી ઉમેરો</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {ads.length === 0 ? (
              <div className="rounded-3xl bg-[#111827] border border-slate-800 p-10 text-center space-y-3">
                <Megaphone className="w-10 h-10 text-cyan-400 mx-auto" />
                <p className="text-base font-black text-white">No Custom Ad Banners Uploaded Yet</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  The default official 16:9 LocoHelp advertisement banner is active on the main website. Click &ldquo;+ Upload New 16:9 Ad Banner&rdquo; above to add custom 16:9 banners.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ads.map(ad => {
                  const isActive = ad.isActive !== false;
                  return (
                    <div
                      key={ad.id}
                      className={`rounded-2xl bg-[#111827] border overflow-hidden flex flex-col justify-between shadow-lg transition-all ${
                        isActive ? 'border-slate-800 hover:border-cyan-500/40' : 'border-slate-800/60 opacity-75'
                      }`}
                    >
                      {/* 16:9 Banner Preview */}
                      <div className="w-full aspect-video bg-slate-950 relative overflow-hidden border-b border-slate-800">
                        {ad.photoUrl ? (
                          <img
                            src={ad.photoUrl}
                            alt={ad.businessName || 'Ad Banner'}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                            16:9 Ad Banner
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-black/75 text-orange-300 border border-orange-500/40">
                            {ad.offerBadge || 'Sponsored 16:9'}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              isActive
                                ? 'bg-emerald-500/90 text-white border-emerald-400'
                                : 'bg-slate-900/90 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isActive ? '✓ Active on Website' : '⏸ Inactive (Hidden)'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <h3 className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                              {ad.businessName}
                            </h3>
                            <span className="text-[11px] font-bold text-slate-400 shrink-0">
                              {ad.area}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-amber-300 mt-0.5 leading-snug break-words">{ad.offerTitle}</p>
                          {ad.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 break-words">{ad.description}</p>
                          )}

                          {/* Submitter Contact Details for "Promote Your Business" Ad Requests */}
                          {(ad.contactPerson || ad.phone || ad.ownerEmail || ad.adPlan) && (
                            <div className="mt-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-[11px]">
                              <div className="font-black text-cyan-300 uppercase tracking-wider">
                                📋 Ad Request Submitter Details:
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-300">
                                {ad.contactPerson && <span>👤 {ad.contactPerson}</span>}
                                {ad.phone && <span>📞 {ad.phone}</span>}
                                {ad.ownerEmail && <span>✉️ {ad.ownerEmail}</span>}
                                {ad.adPlan && <span className="text-amber-300 font-bold">📦 Plan: {ad.adPlan}</span>}
                                {ad.durationDays && <span>⏱️ {ad.durationDays} Days</span>}
                              </div>
                            </div>
                          )}

                          {ad.destinationUrl && (
                            <p className="text-[11px] text-cyan-400 font-semibold mt-1.5 flex items-center gap-1 break-all">
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span>{ad.destinationUrl}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-800">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const nextActive = !isActive;
                                const nextStatus = nextActive ? 'approved' : 'pending';
                                const updatedAd = { ...ad, isActive: nextActive, status: nextStatus };
                                await updateAdStatusOnServer(ad.id, nextStatus, nextActive);
                                setAds(prev => prev.map(a => (a.id === ad.id ? updatedAd : a)));
                                showToast(
                                  nextActive
                                    ? '✅ Ad Request Approved & Published Live on Main Website!'
                                    : '⏸ Ad Banner set to Inactive (Hidden from Main Website).'
                                );
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                                isActive
                                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md'
                              }`}
                            >
                              {isActive ? '⏸ Set Inactive' : '✅ Approve & Publish Live'}
                            </button>

                            <label className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-black flex items-center gap-1 cursor-pointer">
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Photos ({Array.isArray(ad.photos) ? ad.photos.length : 1})</span>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const files: File[] = e.target.files ? Array.from(e.target.files) : [];
                                  if (!files.length) return;
                                  const existingPhotos = Array.isArray(ad.photos) && ad.photos.length > 0 ? ad.photos : (ad.photoUrl ? [ad.photoUrl] : []);
                                  const added: string[] = [];
                                  for (const f of files) {
                                    try {
                                      const dataUrl = await processCategoryImageFileTo16x9(f);
                                      added.push(dataUrl);
                                    } catch {}
                                  }
                                  if (added.length > 0) {
                                    const nextPhotos = [...existingPhotos, ...added];
                                    const updatedAd = { ...ad, photos: nextPhotos, photoUrl: nextPhotos[0] };
                                    await createAdOnServer(updatedAd);
                                    setAds(prev => prev.map(a => (a.id === ad.id ? updatedAd : a)));
                                    showToast(`✅ Added ${added.length} new photo(s)! Total ${nextPhotos.length} auto-scrolling photos.`);
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              await deleteAdOnServer(ad.id);
                              setAds(prev => prev.filter(a => a.id !== ad.id));
                              showToast('🗑️ Ad Banner deleted');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Ad</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 5: ENCRYPTED READ-ONLY SECURITY VAULT (NON-DELETABLE)   */}
        {/* ============================================================ */}
        {activeModule === 'security_vault' && (
          <div className="space-y-5">
            {/* Top Header */}
            <div className="rounded-3xl bg-[#111827] border border-emerald-500/40 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <button
                  onClick={() => openModule('home')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-black border border-slate-700 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-400" />
                  <span>← Back to Admin Dashboard</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    AES-256-GCM Encrypted Vault
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-black text-rose-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    STRICTLY READ-ONLY (No Delete Allowed)
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shrink-0">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    🛡️ Encrypted Security Vault (Read-Only / Non-Deletable)
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-emerald-400">
                    अगर कोई यूज़र या सर्विस एक्सपर्ट धोखाधड़ी/चोरी करके अपना अकाउंट डिलीट भी कर दे, तब भी उसका पूरा रिकॉर्ड और वॉटरमार्क वाला सरकारी ID कार्ड यहाँ हमेशा के लिए सुरक्षित (Encrypted) रहेगा।
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    <strong>Zero-Delete Lock:</strong> Neither the user nor Admin can delete any record from this vault. Files on disk (<code className="text-emerald-300">security_vault.enc</code>) are encrypted with AES-256-GCM so hackers cannot read raw files, and all uploaded ID cards carry an indelible watermark (<code className="text-amber-300">FOR LOCOHELP VERIFICATION ONLY • DO NOT SHARE OR REUSE</code>) so they can never be misused or made viral.
                  </p>
                </div>
              </div>

              {/* Search & Filter Controls */}
              <div className="mt-5 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                    placeholder="Search vault by Name, Mobile Number, Email, Area, Category or Record ID..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: `All Vault Records (${securityVaultRecords.length})` },
                    { id: 'deleted', label: `🚨 Deleted by User/Admin (${securityVaultRecords.filter(r => r.isDeletedFromPublic || r.actionStatus?.includes('DELETED') || r.actionStatus?.includes('REMOVED')).length})` },
                    { id: 'with_id', label: `🪪 With Watermarked Govt ID (${securityVaultRecords.filter(r => Boolean(r.idDocumentWatermarked)).length})` },
                    { id: 'help_post', label: `📢 Help Posts (${securityVaultRecords.filter(r => r.entityType === 'help_post').length})` },
                    { id: 'helper', label: `Service Experts (${securityVaultRecords.filter(r => r.entityType === 'helper').length})` },
                    { id: 'user_profile', label: `User Accounts (${securityVaultRecords.filter(r => r.entityType === 'user_profile' || r.entityType === 'auth_user' || r.entityType === 'verification').length})` },
                    { id: 'business', label: `Businesses (${securityVaultRecords.filter(r => r.entityType === 'business').length})` },
                    { id: 'job', label: `Job Portal (${securityVaultRecords.filter(r => r.entityType === 'job_seeker' || r.entityType === 'employer').length})` }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setVaultFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        vaultFilter === tab.id
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Records List */}
            {(() => {
              const q = vaultSearch.trim().toLowerCase();
              const filteredVault = securityVaultRecords.filter((rec) => {
                if (vaultFilter === 'deleted' && !rec.isDeletedFromPublic && !rec.actionStatus?.includes('DELETED') && !rec.actionStatus?.includes('REMOVED')) return false;
                if (vaultFilter === 'with_id' && !rec.idDocumentWatermarked) return false;
                if (vaultFilter === 'help_post' && rec.entityType !== 'help_post') return false;
                if (vaultFilter === 'helper' && rec.entityType !== 'helper') return false;
                if (vaultFilter === 'user_profile' && rec.entityType !== 'user_profile' && rec.entityType !== 'auth_user' && rec.entityType !== 'verification') return false;
                if (vaultFilter === 'business' && rec.entityType !== 'business') return false;
                if (vaultFilter === 'job' && rec.entityType !== 'job_seeker' && rec.entityType !== 'employer') return false;

                if (!q) return true;
                const haystack = `${rec.name} ${rec.phone} ${rec.email} ${rec.realAccountName || ''} ${rec.realAccountEmail || ''} ${rec.realAccountPhone || ''} ${rec.ipAddress || ''} ${rec.userAgent || ''} ${rec.area} ${rec.category} ${rec.entityType} ${rec.recordId} ${rec.actionStatus}`.toLowerCase();
                return haystack.includes(q);
              });

              if (filteredVault.length === 0) {
                return (
                  <div className="rounded-3xl bg-[#111827] border border-slate-800 p-10 text-center">
                    <Lock className="w-10 h-10 text-emerald-500/60 mx-auto mb-3" />
                    <p className="text-sm font-black text-white">No matching records in Security Vault</p>
                    <p className="text-xs text-slate-400 mt-1">All registered users, service experts, businesses, posts, and deleted accounts are automatically encrypted and preserved here.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVault.map((rec) => {
                    const isDeleted = rec.isDeletedFromPublic || rec.actionStatus?.includes('DELETED') || rec.actionStatus?.includes('REMOVED');
                    return (
                      <div
                        key={rec.vaultKey || rec.vaultId || rec.recordId}
                        className={`rounded-2xl bg-[#111827] border p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-md ${
                          isDeleted
                            ? 'border-rose-500/50 bg-gradient-to-br from-rose-950/25 via-[#111827] to-[#111827]'
                            : 'border-slate-800 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Top Badges */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-black uppercase text-cyan-300">
                                {rec.entityType.replace('_', ' ')}
                              </span>
                              {isDeleted ? (
                                <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-[10px] font-black text-rose-300">
                                  🚨 {rec.actionStatus} (Removed from Public, Saved in Vault)
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black text-emerald-300">
                                  ✓ Active &amp; Backed Up ({rec.actionStatus})
                                </span>
                              )}
                            </div>

                            <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-emerald-400" />
                              Read-Only
                            </span>
                          </div>

                          {/* User / Helper Identity */}
                          <div className="flex items-start gap-3">
                            {rec.photoUrl ? (
                              <img
                                src={rec.photoUrl}
                                alt={rec.name}
                                loading="lazy"
                                decoding="async"
                                className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-emerald-400 shrink-0">
                                {(rec.name || 'U').slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                                {rec.name || 'Unnamed Record'}
                              </h3>
                              {rec.category && (
                                <p className="text-xs font-bold text-amber-400 leading-snug break-words mt-0.5">
                                  Category / Role: {rec.category}
                                </p>
                              )}
                              {rec.postContent && (
                                <p className="text-xs text-slate-300 line-clamp-2 mt-1 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                  {rec.postContent}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-400 font-mono break-all mt-0.5">
                                Vault ID: {rec.recordId}
                              </p>
                            </div>
                          </div>

                          {/* Contact & Location Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{rec.phone || rec.realAccountPhone || 'No Phone'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-200 font-bold truncate">
                              <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="truncate">{rec.email || rec.realAccountEmail || 'No Email'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300 font-bold sm:col-span-2">
                              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{rec.area || 'Area not specified'}</span>
                            </div>
                          </div>

                          {/* Forensic & Real Login Account Details (IP / Device / Real Account) */}
                          {(rec.realAccountEmail || rec.realAccountPhone || rec.ipAddress || rec.userAgent) && (
                            <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1 text-[11px]">
                              <p className="font-black text-indigo-300 flex items-center gap-1">
                                🕵️ Real Login Account &amp; Device Evidence:
                              </p>
                              {(rec.realAccountEmail || rec.realAccountPhone) && (
                                <p className="text-slate-200 font-bold break-all">
                                  Account: <span className="text-cyan-300">{rec.realAccountName || rec.name}</span>
                                  {rec.realAccountEmail ? ` • ${rec.realAccountEmail}` : ''}
                                  {rec.realAccountPhone ? ` • ${rec.realAccountPhone}` : ''}
                                </p>
                              )}
                              {rec.ipAddress && (
                                <p className="text-slate-300 font-mono">
                                  IP Address: <span className="text-amber-300 font-bold">{rec.ipAddress}</span>
                                  {rec.deletedBy ? ` • Deleted By: ${rec.deletedBy}` : ''}
                                </p>
                              )}
                              {rec.userAgent && (
                                <p className="text-slate-400 truncate" title={rec.userAgent}>
                                  Device: {rec.userAgent}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Timestamps */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                            <span>
                              First Saved: <strong className="text-slate-200">{rec.firstRegisteredAt ? new Date(rec.firstRegisteredAt).toLocaleString('en-IN') : 'N/A'}</strong>
                            </span>
                            {rec.deletedAt && (
                              <span className="text-rose-300 font-bold">
                                Deleted At: {new Date(rec.deletedAt).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>

                          {/* Watermarked Govt ID Preview Thumbnail if available */}
                          {rec.idDocumentWatermarked && (
                            <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div className="truncate">
                                  <p className="text-[11px] font-black text-emerald-300 truncate">
                                    🪪 Govt ID Stored (Watermarked &amp; Encrypted)
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    Protected with &ldquo;FOR LOCOHELP VERIFICATION ONLY&rdquo;
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewingItem({ module: 'security_vault', data: rec })}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shrink-0 cursor-pointer"
                              >
                                View ID
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Bottom Bar: Strictly View Only — Zero Delete Buttons */}
                        <div className="pt-3 border-t border-slate-800/90 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-emerald-400" />
                            Permanent Vault Record (Deletion Disabled)
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewingItem({ module: 'security_vault', data: rec })}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-black cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Full Record</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL 1: VIEW ALL DETAILS & WATERMARKED ID DOCUMENT          */}
      {/* ============================================================ */}
      <AnimatePresence>
        {viewingItem && (
          <div
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Complete Entry Details
                </h3>
                <button
                  onClick={() => setViewingItem(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                {/* Forensic & Real Login Account Evidence Box */}
                {(viewingItem.data.realAccountEmail || viewingItem.data.realAccountPhone || viewingItem.data.ipAddress || viewingItem.data.userAgent) && (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/35 border border-indigo-500/40 space-y-2">
                    <p className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                      🕵️ Real Registered Account &amp; Forensic Evidence (Cyber Cell / Admin Proof):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Real Account Name</span>
                        <span className="font-bold text-white break-words">{viewingItem.data.realAccountName || viewingItem.data.name || 'N/A'}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Registered Email</span>
                        <span className="font-bold text-cyan-300 break-all">{viewingItem.data.realAccountEmail || viewingItem.data.email || 'N/A'}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Registered Phone</span>
                        <span className="font-bold text-emerald-300 break-words">{viewingItem.data.realAccountPhone || viewingItem.data.phone || 'N/A'}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Client IP Address</span>
                        <span className="font-mono font-bold text-amber-300 break-all">{viewingItem.data.ipAddress || 'Not Recorded'}</span>
                      </div>
                      {viewingItem.data.userAgent && (
                        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 sm:col-span-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Device / Browser (User-Agent)</span>
                          <span className="font-mono text-[11px] text-slate-200 break-all">{viewingItem.data.userAgent}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dedicated User / Service Expert Profile Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-900/95 border border-emerald-500/35 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <p className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1.5">
                      👤 Complete User Profile Details (प्रोफ़ाइल की पूरी जानकारी):
                    </p>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        viewingItem.data.status === 'approved' || viewingItem.data.isVerified
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : viewingItem.data.status === 'rejected'
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {viewingItem.data.status || (viewingItem.data.isVerified ? 'approved' : 'pending')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Full Name (पूरा नाम)</span>
                      <span className="text-sm font-black text-white break-words">
                        {viewingItem.data.name || viewingItem.data.fullName || viewingItem.data.authorName || 'N/A'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Mobile Number (मोबाइल नंबर)</span>
                      <span className="text-sm font-black text-emerald-400 break-words">
                        {viewingItem.data.phone || viewingItem.data.whatsapp || viewingItem.data.userPhone || 'Not Provided'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Email ID (ईमेल)</span>
                      <span className="font-bold text-cyan-300 break-all">
                        {viewingItem.data.email || viewingItem.data.userEmail || 'Not Provided'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Area / Sector / City (एरिया / पता)</span>
                      <span className="font-bold text-orange-300 break-words">
                        {viewingItem.data.area || viewingItem.data.address || viewingItem.data.sector || viewingItem.data.city || 'Not Provided'}
                      </span>
                    </div>
                    {(viewingItem.data.category || viewingItem.data.categoryId || viewingItem.data.customCategoryName || viewingItem.data.service) && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Category / Work (कैटेगरी / काम)</span>
                        <span className="font-bold text-amber-300 break-words">
                          {viewingItem.data.customCategoryName || viewingItem.data.category || viewingItem.data.categoryId || viewingItem.data.service}
                        </span>
                      </div>
                    )}
                    {(viewingItem.data.skills || viewingItem.data.description) && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Skills / Work Details (कौशल / विवरण)</span>
                        <span className="font-bold text-white break-words">
                          {Array.isArray(viewingItem.data.skills)
                            ? viewingItem.data.skills.join(', ')
                            : viewingItem.data.skills || viewingItem.data.description}
                        </span>
                      </div>
                    )}
                    {viewingItem.data.experience && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Experience (अनुभव)</span>
                        <span className="font-bold text-indigo-300 break-words">{viewingItem.data.experience}</span>
                      </div>
                    )}
                    {viewingItem.data.isPhonePublic !== undefined && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Phone Privacy Setting</span>
                        <span className="font-bold text-slate-200">
                          {viewingItem.data.isPhonePublic ? '🌐 Public (Visible to Users)' : '🔒 Private (Admin Only)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mandatory Live Selfie Verification Section */}
                {(viewingItem.data.idDocumentWatermarked || viewingItem.data.liveSelfieUrl || viewingItem.data.avatarUrl) ? (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border-2 border-emerald-500/40">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <p className="text-xs sm:text-sm font-black text-emerald-400">
                        📸 Mandatory Live Selfie (लाइव सेल्फी वेरिफिकेशन फ़ोटो):
                      </p>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black text-emerald-300">
                        VERIFIED LIVE SELFIE • WATERMARKED
                      </span>
                    </div>
                    <div className="relative select-none overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-2 text-center">
                      <img
                        src={viewingItem.data.idDocumentWatermarked || viewingItem.data.liveSelfieUrl || viewingItem.data.avatarUrl}
                        alt="User Live Selfie"
                        loading="lazy"
                        decoding="async"
                        onContextMenu={(e) => e.preventDefault()}
                        draggable={false}
                        className="max-h-80 w-auto mx-auto object-contain rounded-lg"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="rotate-[-18deg] bg-black/55 text-white/85 border border-white/25 px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-lg">
                          LOCOHELP SECURITY VAULT • DO NOT REUSE OR VIRAL
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-bold">
                    ⚠️ इस यूज़र ने अभी तक अपनी लाइव सेल्फी (Live Selfie) अपलोड नहीं की है।
                  </div>
                )}

                {/* Optional Visiting Card / Work Photo Section */}
                {(viewingItem.data.visitingCardUrl || viewingItem.data.photoUrl || viewingItem.data.workPhotoUrl) && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/35 space-y-2">
                    <p className="text-xs sm:text-sm font-black text-cyan-300">
                      🪪 Optional Visiting Card / Work Photo / Attachment (विज़िटिंग कार्ड / काम का फोटो):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(viewingItem.data.visitingCardUrl || viewingItem.data.photoUrl) && (
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-center">
                          <img
                            src={viewingItem.data.visitingCardUrl || viewingItem.data.photoUrl}
                            alt="Visiting Card or Photo"
                            loading="lazy"
                            className="max-h-64 w-auto mx-auto object-contain rounded-lg"
                          />
                          <a
                            href={viewingItem.data.visitingCardUrl || viewingItem.data.photoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block mt-2 text-[11px] font-black text-cyan-400 hover:underline"
                          >
                            Open Full Visiting Card / Photo ↗
                          </a>
                        </div>
                      )}
                      {viewingItem.data.workPhotoUrl && (
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-center">
                          <img
                            src={viewingItem.data.workPhotoUrl}
                            alt="Preserved Work Photo"
                            loading="lazy"
                            className="max-h-64 w-auto mx-auto object-contain rounded-lg"
                          />
                          <a
                            href={viewingItem.data.workPhotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block mt-2 text-[11px] font-black text-cyan-400 hover:underline"
                          >
                            Open Work Photo Link ↗
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewingItem.data.originalRegistrationSnapshot && (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                    <p className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Original First Registration Snapshot (Tamper-Proof):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(viewingItem.data.originalRegistrationSnapshot).map(([k, v]) => {
                        if (v === undefined || v === null || v === '' || k === 'idDocumentWatermarked' || k === 'idDocUrl' || k === 'photoUrl' || typeof v === 'object') return null;
                        return (
                          <div key={k} className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                            <span className="text-[10px] font-black uppercase text-slate-400 block">{k}</span>
                            <span className="text-xs font-bold text-white break-words">{String(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {Array.isArray(viewingItem.data.history) && viewingItem.data.history.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <p className="text-xs font-black text-amber-300">
                      📜 Security Audit Trail (Creation / Updates / Deletion):
                    </p>
                    <div className="space-y-1.5">
                      {viewingItem.data.history.map((h: any, idx: number) => (
                        <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                          <span className="font-black text-cyan-300">{h.action}</span>
                          <span className="text-slate-300 font-bold">
                            {h.snapshotSummary?.name || h.name || ''} {(h.snapshotSummary?.phone || h.phone) ? `(${h.snapshotSummary?.phone || h.phone})` : ''}
                            {h.ipAddress ? ` • IP: ${h.ipAddress}` : ''}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {h.timestamp ? new Date(h.timestamp).toLocaleString('en-IN') : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(viewingItem.data.chatSnapshot) && viewingItem.data.chatSnapshot.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/40 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div>
                        <p className="text-xs sm:text-sm font-black text-rose-400 flex items-center gap-1.5">
                          💬 Immutable Reported Chat Transcript ({viewingItem.data.chatSnapshot.length} Messages)
                        </p>
                        <p className="text-[11px] text-slate-400">
                          यह चैट हिस्ट्री रिपोर्ट के समय सुरक्षित लॉक कर दी गई थी। दोनों यूज़र द्वारा अपने फोन से डिलीट करने पर भी यह एडमिन के लिए सुरक्षित रहेगी।
                        </p>
                      </div>
                      {viewingItem.data.isUserBlocked && (
                        <span className="px-2.5 py-1 rounded-full bg-red-600/25 border border-red-500/40 text-[10px] font-black text-red-300">
                          🚫 Reported User Blocked by Reporter
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {viewingItem.data.chatSnapshot.map((msg: any, idx: number) => {
                        const senderLabel = msg.senderName || msg.authorName || msg.senderEmail || msg.senderId || 'User';
                        const isReporterMsg =
                          (viewingItem.data.reporterId && String(msg.senderId) === String(viewingItem.data.reporterId)) ||
                          (viewingItem.data.reporterEmail && String(msg.senderEmail).toLowerCase() === String(viewingItem.data.reporterEmail).toLowerCase());
                        return (
                          <div
                            key={msg.id || idx}
                            className={`p-3 rounded-xl border text-xs ${
                              isReporterMsg
                                ? 'bg-indigo-950/40 border-indigo-500/30'
                                : 'bg-rose-950/35 border-rose-500/30'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                              <span className={`font-black ${isReporterMsg ? 'text-indigo-300' : 'text-rose-300'}`}>
                                {senderLabel} {isReporterMsg ? '(Reporter)' : '(Reported User)'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleString('en-IN') : ''}
                              </span>
                            </div>
                            {msg.attachmentUrl && (
                              <div className="my-1.5">
                                <img
                                  src={msg.attachmentUrl}
                                  alt="Chat Attachment"
                                  className="max-h-40 rounded-lg border border-slate-700 object-contain"
                                />
                              </div>
                            )}
                            <p className="text-white font-medium whitespace-pre-wrap break-words">
                              {msg.text || '(Attachment)'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(viewingItem.data).map(([key, val]) => {
                    if (
                      val === undefined ||
                      val === null ||
                      val === '' ||
                      key === 'idDocumentWatermarked' ||
                      key === 'photoUrl' ||
                      key === 'avatar' ||
                      key === 'chatSnapshot' ||
                      typeof val === 'object'
                    ) {
                      return null;
                    }
                    return (
                      <div key={key} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">
                          {key}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white break-words">
                          {String(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-2">
                {viewingItem.module !== 'security_vault' && (
                  <button
                    onClick={() => {
                      const mod = viewingItem.module;
                      const item = viewingItem.data;
                      setViewingItem(null);
                      openEditModal(mod, item);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black cursor-pointer"
                  >
                    Edit Entry
                  </button>
                )}
                <button
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL 2: EDIT ENTRY MODAL                                    */}
      {/* ============================================================ */}
      <AnimatePresence>
        {editingItem && (
          <div
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  Edit Entry Details
                </h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditModal} className="p-6 space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Name / Business / Title</label>
                    <input
                      type="text"
                      value={editingItem.nameOrTitle}
                      onChange={(e) => setEditingItem({ ...editingItem, nameOrTitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Category / Job Role</label>
                    {editingItem.module === 'helpers' ? (
                      <select
                        value={normalizeCategorySlug(editingItem.categoryOrRole).categoryId}
                        onChange={(e) => setEditingItem({ ...editingItem, categoryOrRole: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                      >
                        {MASTER_CATEGORIES.map((mainCat, idx) => {
                          const subs = getSubCategoriesByMainId(mainCat.id);
                          return (
                            <optgroup
                              key={mainCat.id}
                              label={`${idx + 1}. ${mainCat.emoji} ${mainCat.nameEn} (${mainCat.nameHi})`}
                            >
                              {subs.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nameEn} ({c.nameHi})
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editingItem.categoryOrRole}
                        onChange={(e) => setEditingItem({ ...editingItem, categoryOrRole: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={editingItem.phone}
                      onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Email</label>
                    <input
                      type="text"
                      value={editingItem.email}
                      onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Area / Location / Address</label>
                    <input
                      type="text"
                      value={editingItem.areaOrLocation}
                      onChange={(e) => setEditingItem({ ...editingItem, areaOrLocation: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Approval Status</label>
                    <select
                      value={editingItem.status}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          status: e.target.value as 'pending' | 'approved' | 'rejected'
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    >
                      <option value="pending">Pending Approval</option>
                      <option value="approved">Approved (Live)</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Salary / Price / Timings / Urgency</label>
                  <input
                    type="text"
                    value={editingItem.salaryOrPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, salaryOrPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Description / Skills / Details</label>
                  <textarea
                    rows={3}
                    value={editingItem.descriptionOrBio}
                    onChange={(e) => setEditingItem({ ...editingItem, descriptionOrBio: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                {/* Photo / Banner / Attachment Upload (Firebase Storage locohelp/) */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <label className="block font-bold text-slate-300">
                    Photo / Banner / Attachment (Firebase Storage: locohelp/)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {editingItem.photoUrl && (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-indigo-500/60 shrink-0">
                        <img
                          src={editingItem.photoUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingItem({ ...editingItem, photoUrl: '' })}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center cursor-pointer"
                          title="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const check = await validateUploadedFile(file, { allowPdf: false, maxSizeBytes: 25 * 1024 * 1024 });
                        if (!check.valid) {
                          showToast(check.error || 'Invalid image file');
                          return;
                        }
                        try {
                          const uploadedUrl = await compressImageToWebP(file, {
                            maxWidth: 1200,
                            quality: 0.75,
                            folder: editingItem.module
                          });
                          setEditingItem((prev) => (prev ? { ...prev, photoUrl: uploadedUrl } : prev));
                          showToast('✅ Photo uploaded to Firebase Storage!');
                        } catch {
                          const fallbackUrl = await uploadFileToFirebaseStorage(file, editingItem.module, file.name);
                          setEditingItem((prev) => (prev ? { ...prev, photoUrl: fallbackUrl } : prev));
                        }
                      }}
                      className="text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL 3: ADMIN DIRECT ADD / REGISTER MODAL (NO OTP REQUIRED) */}
      {/* ============================================================ */}
      <AnimatePresence>
        {creatingItem && (
          <div
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl max-h-[85vh] flex flex-col bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    {creatingItem.module === 'businesses'
                      ? 'Register Shop / Business (Direct Publish)'
                      : creatingItem.module === 'helpers'
                      ? 'Register Service Expert Profile (Direct Publish)'
                      : creatingItem.module === 'simple_users'
                      ? 'Register Simple User Profile (Direct Publish)'
                      : creatingItem.module === 'job_seekers'
                      ? 'Register Job Seeker Profile (Direct Publish)'
                      : 'Register Employer Job Vacancy (Direct Publish)'}
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-bold mt-0.5">
                    ✓ Email &amp; Mobile Number are 100% Optional • No OTP Required • Auto-Approved Live
                  </p>
                </div>
                <button
                  onClick={() => setCreatingItem(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminDirectCreate} className="p-6 overflow-y-auto space-y-3.5 text-xs">
                {/* Only show module selector when opened from Admin Home Dashboard (+ Add Entry) */}
                {creatingItem.allowModuleSwitch && (
                  <div>
                    <label className="block font-black text-slate-300 mb-1.5">Select Registration Form Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {[
                        { id: 'businesses', label: '🏪 Shop/Biz' },
                        { id: 'helpers', label: '🛠️ Service Expert' },
                        { id: 'simple_users', label: '👤 User Profile' },
                        { id: 'job_seekers', label: '🎓 Job Seeker' },
                        { id: 'employers', label: '💼 Employer' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => openAdminCreateModal(tab.id as any, true)}
                          className={`py-2 px-2 rounded-xl font-black text-[11px] border transition-all cursor-pointer ${
                            creatingItem.module === tab.id
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {creatingItem.module === 'businesses'
                        ? 'Shop / Business Name *'
                        : creatingItem.module === 'helpers'
                        ? 'Service Expert Name *'
                        : creatingItem.module === 'simple_users'
                        ? 'User Full Name *'
                        : creatingItem.module === 'job_seekers'
                        ? 'Candidate Full Name *'
                        : 'Company / Shop Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={creatingItem.nameOrTitle}
                      onChange={(e) => setCreatingItem({ ...creatingItem, nameOrTitle: e.target.value })}
                      placeholder="Enter name or title..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {creatingItem.module === 'businesses'
                        ? 'Owner Name'
                        : creatingItem.module === 'helpers' || creatingItem.module === 'simple_users'
                        ? 'Primary Skill (e.g. Plumber, Electrician)'
                        : creatingItem.module === 'job_seekers'
                        ? 'Preferred Work Role'
                        : 'Hiring Job Role *'}
                    </label>
                    <input
                      type="text"
                      required={creatingItem.module === 'employers'}
                      value={creatingItem.ownerOrRole}
                      onChange={(e) => setCreatingItem({ ...creatingItem, ownerOrRole: e.target.value })}
                      placeholder="Enter owner / role / skill..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Category</label>
                    {creatingItem.module === 'helpers' || creatingItem.module === 'businesses' || creatingItem.module === 'simple_users' ? (
                      <div className="space-y-1.5">
                        <select
                          value={creatingItem.category}
                          onChange={(e) => setCreatingItem({ ...creatingItem, category: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                        >
                          {MASTER_CATEGORIES.map((mainCat, idx) => {
                            const subs = getSubCategoriesByMainId(mainCat.id);
                            return (
                              <optgroup
                                key={mainCat.id}
                                label={`${idx + 1}. ${mainCat.emoji} ${mainCat.nameEn} (${mainCat.nameHi})`}
                              >
                                {subs.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nameEn} ({c.nameHi})
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                        {creatingItem.category === 'other' && (
                          <input
                            type="text"
                            value={creatingItem.customCategoryName}
                            onChange={(e) => setCreatingItem({ ...creatingItem, customCategoryName: e.target.value })}
                            placeholder="Custom Category (e.g. Grocery, Hospital, Bakery)"
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-500/50 text-white"
                          />
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={creatingItem.category}
                        onChange={(e) => setCreatingItem({ ...creatingItem, category: e.target.value })}
                        placeholder="e.g. Grocery, Plumber, Office & Admin"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Area / City / Work Area</label>
                    <input
                      type="text"
                      value={creatingItem.areaOrLocation}
                      onChange={(e) => setCreatingItem({ ...creatingItem, areaOrLocation: e.target.value })}
                      placeholder="e.g. Main Market, Jaipur"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                {/* Optional Phone & Optional Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
                  <div>
                    <label className="block font-bold text-emerald-300 mb-1">
                      Mobile / WhatsApp Number <span className="text-[10px] text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={creatingItem.phone}
                      onChange={(e) => setCreatingItem({ ...creatingItem, phone: e.target.value })}
                      placeholder="Optional mobile / WhatsApp"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-300 mb-1">
                      Email Address <span className="text-[10px] text-slate-400">(Optional - No OTP)</span>
                    </label>
                    <input
                      type="email"
                      value={creatingItem.email}
                      onChange={(e) => setCreatingItem({ ...creatingItem, email: e.target.value })}
                      placeholder="Optional email address"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {creatingItem.module === 'businesses'
                        ? 'Shop Timings'
                        : creatingItem.module === 'helpers'
                        ? 'Experience'
                        : 'Experience / Details'}
                    </label>
                    <input
                      type="text"
                      value={creatingItem.timingsOrExperience}
                      onChange={(e) => setCreatingItem({ ...creatingItem, timingsOrExperience: e.target.value })}
                      placeholder={creatingItem.module === 'businesses' ? '9:00 AM - 9:00 PM' : 'e.g. 3 Years'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {creatingItem.module === 'job_seekers'
                        ? 'Education & Expected Salary'
                        : creatingItem.module === 'employers'
                        ? 'Salary Offered'
                        : 'Full Address'}
                    </label>
                    <input
                      type="text"
                      value={
                        creatingItem.module === 'businesses'
                          ? creatingItem.address
                          : creatingItem.salaryOrUrgency
                      }
                      onChange={(e) =>
                        creatingItem.module === 'businesses'
                          ? setCreatingItem({ ...creatingItem, address: e.target.value })
                          : setCreatingItem({ ...creatingItem, salaryOrUrgency: e.target.value })
                      }
                      placeholder={
                        creatingItem.module === 'businesses'
                          ? 'Shop address / landmark'
                          : 'e.g. ₹15,000/month'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Description / Bio / Skills</label>
                  <textarea
                    rows={2}
                    value={creatingItem.description}
                    onChange={(e) => setCreatingItem({ ...creatingItem, description: e.target.value })}
                    placeholder="Enter description, services, or skills..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                {/* File Upload Support (Photos up to 2MB, or PDF Resume up to 5MB) */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <label className="block font-bold text-slate-300">
                    {creatingItem.module === 'businesses'
                      ? 'Upload Shop Photos (Up to 3 Images, Max 25MB each, Auto-Compressed)'
                      : creatingItem.module === 'job_seekers'
                      ? 'Upload Candidate Photo (Max 25MB) or Resume PDF (Max 10MB)'
                      : 'Upload Profile / Work Photo (JPG, PNG, WEBP Max 25MB, Auto-Compressed)'}
                  </label>
                  <input
                    type="file"
                    accept={creatingItem.module === 'job_seekers' ? '.jpg,.jpeg,.png,.webp,.pdf' : '.jpg,.jpeg,.png,.webp'}
                    multiple={creatingItem.module === 'businesses'}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []) as File[];
                      for (const file of files.slice(0, 3)) {
                        const allowPdf = creatingItem.module === 'job_seekers';
                        const check = await validateUploadedFile(file, { allowPdf, maxSizeBytes: 25 * 1024 * 1024 });
                        if (!check.valid) {
                          showToast(check.error || 'Invalid file');
                          continue;
                        }
                        if (file.type === 'application/pdf') {
                          try {
                            const uploadedUrl = await uploadFileToFirebaseStorage(file, 'jobs/resumes', file.name);
                            setCreatingItem((prev) =>
                              prev ? { ...prev, resumeUrl: uploadedUrl, resumeFileName: file.name } : prev
                            );
                          } catch {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const dataUrl = reader.result as string;
                              setCreatingItem((prev) =>
                                prev ? { ...prev, resumeUrl: dataUrl, resumeFileName: file.name } : prev
                              );
                            };
                            reader.readAsDataURL(file);
                          }
                        } else {
                          try {
                            const dataUrl = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.75, folder: creatingItem.module });
                            setCreatingItem((prev) => {
                              if (!prev) return prev;
                              const nextPhotos = [...prev.photos, dataUrl].slice(0, 3);
                              return {
                                ...prev,
                                photoUrl: nextPhotos[0] || dataUrl,
                                photos: nextPhotos
                              };
                            });
                          } catch {
                            // Fallback
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const dataUrl = reader.result as string;
                              setCreatingItem((prev) => {
                                if (!prev) return prev;
                                const nextPhotos = [...prev.photos, dataUrl].slice(0, 3);
                                return {
                                  ...prev,
                                  photoUrl: nextPhotos[0] || dataUrl,
                                  photos: nextPhotos
                                };
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }
                    }}
                    className="text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-800 file:text-orange-400 hover:file:bg-slate-700"
                  />
                  {creatingItem.photos.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      {creatingItem.photos.map((p, idx) => (
                        <img
                          key={idx}
                          src={p}
                          alt="Upload preview"
                          loading="lazy"
                          decoding="async"
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                        />
                      ))}
                    </div>
                  )}
                  {creatingItem.resumeFileName && (
                    <p className="text-[11px] text-emerald-400 font-bold">
                      📄 Resume attached: {creatingItem.resumeFileName}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreatingItem(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCreate}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {isSavingCreate ? 'Publishing Live...' : '✓ Save & Publish Live Immediately'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL 4: CREATE 16:9 AD BANNER MODAL                         */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isCreateAdModalOpen && (
          <div
            className="fixed inset-x-0 bottom-0 top-[52px] z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">Upload 16:9 Advertisement Banner</h3>
                  <p className="text-[11px] text-cyan-400 font-bold">
                    Upload a 16:9 banner image, add title/link, and set active status
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateAdModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!adBusinessName.trim()) {
                    showToast('Please enter Ad / Business Title');
                    return;
                  }
                  setIsSubmittingAd(true);
                  const finalAdPhotos = adPhotos.length > 0 ? adPhotos : [adPhotoUrl];
                  const newAd: AdBannerItem = {
                    id: 'ad_' + Date.now(),
                    businessName: adBusinessName.trim(),
                    logo: adLogo,
                    category: adCategory,
                    offerBadge: adOfferBadge,
                    offerTitle: adOfferTitle.trim() || adBusinessName.trim(),
                    description: adDescription.trim(),
                    photoUrl: finalAdPhotos[0],
                    photos: finalAdPhotos,
                    isActive: adIsActive,
                    distance: parseFloat(adDistance) || 0.5,
                    area: adArea.trim() || 'Local Market',
                    rating: 5.0,
                    reviewCount: 1,
                    isVerified: true,
                    destinationUrl: adDestinationUrl.trim(),
                    initialMessage: `Namaste ${adBusinessName.trim()}!`
                  };
                  await createAdOnServer(newAd);
                  setAds(prev => [newAd, ...prev]);
                  setIsSubmittingAd(false);
                  setIsCreateAdModalOpen(false);
                  showToast(`✅ Ad Banner saved with ${finalAdPhotos.length} auto-scrolling photo(s)!`);
                }}
                className="p-6 overflow-y-auto space-y-3.5 text-xs"
              >
                {/* 16:9 Banner Multi-Image Upload + Live Preview */}
                <div className="space-y-2 p-3 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="block font-black text-slate-200">
                      16:9 Banner Photos (Upload Multiple Photos - Auto Scrolls!) *
                    </label>
                    <span className="text-[10px] font-black text-cyan-400">
                      {adPhotos.length} photo(s) added
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Multiple 16:9 Photos</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const files: File[] = e.target.files ? Array.from(e.target.files) : [];
                          if (!files.length) return;
                          const processed: string[] = [];
                          for (const file of files) {
                            try {
                              const dataUrl = await processCategoryImageFileTo16x9(file);
                              processed.push(dataUrl);
                            } catch {}
                          }
                          if (processed.length > 0) {
                            const next = [...adPhotos, ...processed];
                            setAdPhotos(next);
                            setAdPhotoUrl(next[0]);
                            showToast(`✅ ${processed.length} Banner Image(s) added (${next.length} total)!`);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={adPhotoUrl}
                      onChange={(e) => setAdPhotoUrl(e.target.value)}
                      placeholder="Or paste 16:9 image URL..."
                      className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                    />
                    {adPhotoUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!adPhotos.includes(adPhotoUrl.trim())) {
                            setAdPhotos([...adPhotos, adPhotoUrl.trim()]);
                          }
                        }}
                        className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-black text-xs cursor-pointer"
                      >
                        + Add URL
                      </button>
                    )}
                  </div>
                  {adPhotos.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pt-2 pb-1">
                      {adPhotos.map((img, idx) => (
                        <div key={idx} className="relative w-28 aspect-video rounded-xl overflow-hidden bg-slate-950 border-2 border-cyan-500/60 shrink-0">
                          <img src={img} alt={`Slide ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              const next = adPhotos.filter((_, i) => i !== idx);
                              setAdPhotos(next);
                              if (next[0]) setAdPhotoUrl(next[0]);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center cursor-pointer"
                          >
                            ✕
                          </button>
                          <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : adPhotoUrl && (
                    <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-700 mt-2">
                      <img src={adPhotoUrl} alt="16:9 Ad Preview" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Ad / Business Title *</label>
                  <input
                    type="text"
                    required
                    value={adBusinessName}
                    onChange={(e) => setAdBusinessName(e.target.value)}
                    placeholder="e.g. Sharma Electronics / Sponsored Offer *"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Offer Headline / Subtitle</label>
                  <input
                    type="text"
                    value={adOfferTitle}
                    onChange={(e) => setAdOfferTitle(e.target.value)}
                    placeholder="e.g. Flat 20% Off on All Home Appliances"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Target Link / Website / WhatsApp URL (Optional)</label>
                  <input
                    type="text"
                    value={adDestinationUrl}
                    onChange={(e) => setAdDestinationUrl(e.target.value)}
                    placeholder="https://example.com or https://wa.me/919876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Market / Sector Area</label>
                    <input
                      type="text"
                      value={adArea}
                      onChange={(e) => setAdArea(e.target.value)}
                      placeholder="e.g. Main Market"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Status</label>
                    <select
                      value={adIsActive ? 'active' : 'inactive'}
                      onChange={(e) => setAdIsActive(e.target.value === 'active')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    >
                      <option value="active">Active (Visible on Website)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Offer Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={adDescription}
                    onChange={(e) => setAdDescription(e.target.value)}
                    placeholder="Additional details..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateAdModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAd}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black cursor-pointer"
                  >
                    {isSubmittingAd ? 'Saving...' : 'Save & Publish 16:9 Ad'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
