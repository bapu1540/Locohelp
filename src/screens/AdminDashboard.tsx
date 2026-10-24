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
  Filter
} from 'lucide-react';
import { getFreeHelperProfiles, saveFreeHelperProfile, normalizeCategorySlug, CATEGORIES } from '../data/categories';
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
  SecurityVaultRecord
} from '../api';
import { validateUploadedFile } from '../lib/security';
import { compressImageToWebP } from '../lib/imageCompression';

interface AdminDashboardProps {
  onBack: () => void;
  showToast?: (msg: string) => void;
}

type AdminModuleId =
  | 'home'
  | 'help_posts'
  | 'helpers'
  | 'simple_users'
  | 'businesses'
  | 'job_seekers'
  | 'employers'
  | 'feedback_categories'
  | 'ads'
  | 'category_images'
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
  // Authentication State (Strictly 2-Step: Password -> OTP to baalvarta@gmail.com)
  const OFFICIAL_ADMIN_EMAIL = 'baalvarta@gmail.com';
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

  // Active Dedicated Sub-Page Module
  const [activeModule, setActiveModule] = useState<AdminModuleId>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Data States for all 7 modules
  const [intents, setIntents] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [simpleUsers, setSimpleUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [jobPortalItems, setJobPortalItems] = useState<JobPortalSubmission[]>([]);
  const [reports, setReports] = useState<any[]>([]);
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

  // Category 16:9 Images State (Add / Edit / Delete)
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>(() => getCachedCategoryImages());
  const [catImageBusyId, setCatImageBusyId] = useState<string | null>(null);
  const [catSearchFilter, setCatSearchFilter] = useState('');
  const [editingCatImageUrl, setEditingCatImageUrl] = useState<{
    categoryId: string;
    nameEn: string;
    nameHi: string;
    url: string;
  } | null>(null);

  // Encrypted Read-Only Security Vault State (Strictly Non-Deletable)
  const [securityVaultRecords, setSecurityVaultRecords] = useState<SecurityVaultRecord[]>([]);
  const [vaultFilter, setVaultFilter] = useState<'all' | 'deleted' | 'helper' | 'user_profile' | 'business' | 'job' | 'help_post' | 'with_id'>('all');
  const [vaultSearch, setVaultSearch] = useState('');

  // Helper: resize & center-crop any uploaded image file to 16:9 WebP data URL (max 1200x675, quality 0.75)
  const processCategoryImageFileTo16x9 = async (file: File): Promise<string> => {
    return await compressImageToWebP(file, {
      maxWidth: 1200,
      maxHeight: 675,
      aspectRatio: 16 / 9,
      cropToAspectRatio: true,
      quality: 0.75
    });
  };

  const handleUploadCategoryImageFile = async (categoryId: string, catName: string, file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('⚠️ कृपया केवल इमेज फ़ाइल (JPG, PNG, WebP) चुनें।');
      return;
    }
    setCatImageBusyId(categoryId);
    try {
      const optimized16x9DataUrl = await processCategoryImageFileTo16x9(file);
      const res = await saveCategoryImageOnServer(categoryId, optimized16x9DataUrl);
      if (res.success) {
        setCategoryImages(prev => ({ ...prev, [categoryId]: optimized16x9DataUrl }));
        showToast(`✅ "${catName}" की 16:9 इमेज सेव हो गई!`);
      } else {
        showToast(res.error || 'Failed to upload category image');
      }
    } catch (e: any) {
      showToast(e.message || 'Image upload failed');
    } finally {
      setCatImageBusyId(null);
    }
  };

  const handleSaveCategoryImageUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatImageUrl) return;
    const { categoryId, nameEn, url } = editingCatImageUrl;
    if (!url.trim()) {
      showToast('कृपया इमेज URL दर्ज करें');
      return;
    }
    setCatImageBusyId(categoryId);
    try {
      const res = await saveCategoryImageOnServer(categoryId, url.trim());
      if (res.success) {
        setCategoryImages(prev => ({ ...prev, [categoryId]: url.trim() }));
        showToast(`✅ "${nameEn}" की 16:9 इमेज अपडेट हो गई!`);
        setEditingCatImageUrl(null);
      } else {
        showToast(res.error || 'Failed to save category image URL');
      }
    } finally {
      setCatImageBusyId(null);
    }
  };

  const handleDeleteCategoryImage = async (categoryId: string, catName: string) => {
    setCatImageBusyId(categoryId);
    try {
      const res = await deleteCategoryImageOnServer(categoryId);
      if (res.success) {
        setCategoryImages(prev => {
          const next = { ...prev };
          delete next[categoryId];
          return next;
        });
        showToast(`🗑️ "${catName}" की इमेज हटा दी गई!`);
      } else {
        showToast(res.error || 'Failed to delete category image');
      }
    } finally {
      setCatImageBusyId(null);
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
    const res = await loginAdminOnServer(adminPasswordInput.trim());
    setIsSendingAdminOtp(false);

    if (res.requiresOtp) {
      setAdminOtpInput('');
      setAdminAuthStep('otp');
      showToast(`📧 6-अंकों का वेरिफिकेशन OTP ${OFFICIAL_ADMIN_EMAIL} पर भेज दिया गया है!`);
    } else if (res.success && res.token) {
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
      try {
        sessionStorage.setItem('locohelp_admin_logged_in', 'true');
      } catch {}
      showToast('🔓 Welcome to LocoHelp Admin Dashboard!');
    } else {
      setLoginError(res.error || 'गलत एडमिन पासवर्ड! कृपया सही पासवर्ड डालें।');
    }
  };

  const handleOtpStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminOtpInput || adminOtpInput.trim().length < 6) {
      setLoginError(`कृपया ${OFFICIAL_ADMIN_EMAIL} पर भेजा गया 6-अंकों का OTP दर्ज करें।`);
      return;
    }
    setLoginError(null);
    setIsSendingAdminOtp(true);
    const res = await loginAdminOnServer(adminPasswordInput.trim(), adminOtpInput.trim());
    setIsSendingAdminOtp(false);

    if (res.success && res.token) {
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
      setAdminOtpInput('');
      setAdminAuthStep('password');
      try {
        sessionStorage.setItem('locohelp_admin_logged_in', 'true');
      } catch {}
      showToast('🔓 2-Step Verification सफल! एडमिन डैशबोर्ड में आपका स्वागत है।');
    } else {
      setLoginError(res.error || 'गलत या समाप्त हो चुका OTP! कृपया दोबारा जांचें।');
    }
  };

  const handleRequestForgotPasswordOtp = async () => {
    setLoginError(null);
    setIsSendingAdminOtp(true);
    const res = await sendAdminForgotPasswordOtpOnServer();
    setIsSendingAdminOtp(false);

    if (res.success) {
      setForgotOtpSent(true);
      setAdminAuthStep('forgot_password');
      showToast(`📧 पासवर्ड रीसेट OTP ${OFFICIAL_ADMIN_EMAIL} पर भेज दिया गया है!`);
    } else {
      setLoginError(res.error || `${OFFICIAL_ADMIN_EMAIL} पर OTP भेजने में समस्या आई।`);
    }
  };

  const handleForgotPasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtpInput || forgotOtpInput.trim().length < 6) {
      setLoginError(`कृपया ${OFFICIAL_ADMIN_EMAIL} पर आया 6-अंकों का OTP दर्ज करें।`);
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
    const res = await resetAdminPasswordWithOtpOnServer(forgotOtpInput.trim(), forgotNewPasswordInput.trim());
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
      // 1. Help Posts (Intents)
      const liveIntents = await fetchLiveIntents();
      if (Array.isArray(liveIntents)) {
        setIntents(liveIntents);
      }

      // 2. Helpers & 4. Businesses/Shops
      try {
        const fetchedHelpers = await getHelpers(true);
        const localHelpers = getFreeHelperProfiles(true);
        const mergedHelpersMap = new Map<string, any>();
        [...(Array.isArray(fetchedHelpers) ? fetchedHelpers : []), ...(Array.isArray(localHelpers) ? localHelpers : [])].forEach(h => {
          if (h && h.id) mergedHelpersMap.set(h.id, h);
        });
        setHelpers(Array.from(mergedHelpersMap.values()));
      } catch {
        setHelpers(getFreeHelperProfiles(true));
      }

      try {
        const fetchedShops = await getShops(true);
        if (Array.isArray(fetchedShops)) {
          setBusinesses(fetchedShops);
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
        // Merge registered users + user_profile verifications into Simple User Profiles list
        const userVerifs = (Array.isArray(liveVerifs) ? liveVerifs : []).filter(v => v.entityType === 'user_profile');
        const combinedUsersMap = new Map<string, any>();

        if (Array.isArray(usersList)) {
          usersList.forEach(u => {
            if (u && u.id) {
              combinedUsersMap.set(u.id, {
                ...u,
                status: u.status || (u.isVerified ? 'approved' : 'pending')
              });
            }
          });
        }

        userVerifs.forEach(uv => {
          const existing = combinedUsersMap.get(uv.entityId) || combinedUsersMap.get(uv.userId);
          if (existing) {
            combinedUsersMap.set(existing.id, {
              ...existing,
              verificationId: uv.id,
              idDocumentType: uv.idDocumentType,
              idDocumentWatermarked: uv.idDocumentWatermarked,
              status: uv.status || existing.status
            });
          } else {
            combinedUsersMap.set(uv.id, {
              id: uv.entityId || uv.id,
              verificationId: uv.id,
              name: uv.userName,
              email: uv.userEmail,
              phone: uv.userPhone,
              area: uv.area || 'Local Area',
              category: uv.category || 'Simple User Profile',
              idDocumentType: uv.idDocumentType,
              idDocumentWatermarked: uv.idDocumentWatermarked,
              status: uv.status,
              isVerified: uv.status === 'approved',
              createdAt: uv.submittedAt
            });
          }
        });

        setSimpleUsers(Array.from(combinedUsersMap.values()));
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

      // Bonus: Sponsored Ads, Category 16:9 Images & Encrypted Security Vault
      const [liveAds, liveCatImages, liveVault] = await Promise.all([
        fetchLiveAds(),
        fetchCategoryImages(),
        fetchAdminSecurityVault()
      ]);
      if (Array.isArray(liveAds)) {
        setAds(liveAds);
      }
      if (liveCatImages && typeof liveCatImages === 'object') {
        setCategoryImages(liveCatImages);
      }
      if (Array.isArray(liveVault)) {
        setSecurityVaultRecords(liveVault);
      }
    } catch (err) {
      console.warn('Admin load data warning:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAdminAuthenticated) return;
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


  // Helper to get normalize status ('pending' | 'approved' | 'rejected')
  const getNormalizedStatus = (item: any, mod: AdminModuleId): 'pending' | 'approved' | 'rejected' => {
    if (!item) return 'pending';
    if (item.status === 'rejected') return 'rejected';
    if (item.status === 'approved' || item.status === 'resolved') return 'approved';
    if (item.status === 'pending') return 'pending';
    if (mod === 'help_posts') {
      return item.isApproved === false ? 'pending' : 'approved';
    }
    if (mod === 'helpers' || mod === 'businesses' || mod === 'simple_users') {
      if (item.isVerified === true) return 'approved';
      return 'pending';
    }
    return 'pending';
  };

  // Find associated watermarked ID doc from verificationsList if not directly on item
  const getItemIdDoc = (item: any): string | undefined => {
    if (item?.idDocumentWatermarked) return item.idDocumentWatermarked;
    const match = verificationsList.find(
      v =>
        v.entityId === item?.id ||
        v.id === item?.verificationId ||
        (item?.email && v.userEmail?.toLowerCase() === item.email.toLowerCase())
    );
    return match?.idDocumentWatermarked;
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
          customCategoryName: item.customCategoryName || norm.customCategoryName,
          status: newStatus,
          isVerified: isApproved
        };
        const res = await updateAdminHelperOnServer(id, fullUpdates);
        if (res.success) {
          const updatedHelper = { ...item, ...(res.item || {}), ...fullUpdates };
          setHelpers(prev => prev.map(h => (h.id === id ? updatedHelper : h)));
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
        if (item.verificationId) {
          await updateAdminVerificationStatus(item.verificationId, newStatus);
        }
        const res = await updateAdminUserOnServer(id, { ...item, status: newStatus, isVerified: isApproved });
        if (res.success || item.verificationId) {
          setSimpleUsers(prev => prev.map(u => (u.id === id ? { ...u, status: newStatus, isVerified: isApproved } : u)));
          showToast(isApproved ? '✅ Simple User Profile Approved!' : '❌ Simple User Profile Rejected.');
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
        await deleteIntentOnServer(id);
        setIntents(prev => prev.filter(i => i.id !== id));
        showToast('🗑️ Help Post deleted permanently.');
      } else if (mod === 'helpers') {
        await deleteAdminHelperOnServer(id);
        setHelpers(prev => prev.filter(h => h.id !== id));
        try {
          const raw = localStorage.getItem('locohelp_free_helper_profiles');
          if (raw) {
            localStorage.setItem('locohelp_free_helper_profiles', JSON.stringify(JSON.parse(raw).filter((h: any) => h.id !== id)));
          }
        } catch {}
        showToast('🗑️ Service Expert Profile deleted permanently.');
      } else if (mod === 'simple_users') {
        await deleteAdminUserOnServer(id);
        setSimpleUsers(prev => prev.filter(u => u.id !== id));
        showToast('🗑️ Simple User Profile deleted.');
      } else if (mod === 'businesses') {
        await deleteAdminBusinessOnServer(id);
        setBusinesses(prev => prev.filter(b => b.id !== id));
        try {
          const raw = localStorage.getItem('locohelp_registered_shops');
          if (raw) {
            localStorage.setItem('locohelp_registered_shops', JSON.stringify(JSON.parse(raw).filter((s: any) => s.id !== id)));
          }
        } catch {}
        showToast('🗑️ Business / Shop Registration deleted.');
      } else if (mod === 'job_seekers' || mod === 'employers') {
        await deleteJobPortalItem(id);
        setJobPortalItems(prev => prev.filter(j => j.id !== id));
        showToast('🗑️ Job Portal entry deleted.');
      } else if (mod === 'feedback_categories') {
        await deleteAdminReportOnServer(id);
        setReports(prev => prev.filter(r => r.id !== id));
        showToast('🗑️ Feedback / Report deleted.');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const openEditModal = (mod: AdminModuleId, item: any) => {
    const status = getNormalizedStatus(item, mod);
    if (mod === 'help_posts') {
      setEditingItem({
        module: mod,
        id: item.id,
        nameOrTitle: item.userName || item.user_name || 'Community User',
        categoryOrRole: item.category || 'General Help',
        phone: item.phone || item.contactPhone || '',
        email: item.email || '',
        areaOrLocation: item.area || item.locationName || '',
        descriptionOrBio: item.description || '',
        salaryOrPrice: item.urgency || 'normal',
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
          status: 'approved'
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
          status: 'approved'
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

    const { module: mod, id, nameOrTitle, categoryOrRole, phone, email, areaOrLocation, descriptionOrBio, salaryOrPrice, status, raw } = editingItem;
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
    titleHi: string;
    subtitle: string;
    icon: React.ReactNode;
    gradient: string;
    border: string;
    badgeBg: string;
    totalCount: number;
    pendingCount: number;
  }> = [
    {
      id: 'help_posts',
      title: '📢 Manage All Public Broadcast Posts on Main Page',
      titleHi: '📢 मुख्य पेज की सभी पब्लिक ब्रॉडकास्ट हेल्प पोस्ट्स',
      subtitle: 'View, filter, edit & 1-click delete all user help posts displayed on home screen',
      icon: <Megaphone className="w-5 h-5 text-white" />,
      gradient: 'from-amber-600 via-orange-600 to-red-600',
      border: 'border-orange-500/50 hover:border-orange-400 shadow-lg shadow-orange-500/10',
      badgeBg: 'bg-orange-500/20 text-orange-200 border-orange-500/40',
      totalCount: intents.length,
      pendingCount: countPending(intents, 'help_posts')
    },
    {
      id: 'helpers',
      title: 'Browse Local Service Experts / Service Expert Profiles',
      titleHi: 'लोकल सर्विस एक्सपर्ट्स और कारीगर प्रोफाइल',
      subtitle: 'Registered skilled workers, electricians, plumbers & service experts',
      icon: <Users className="w-5 h-5 text-white" />,
      gradient: 'from-emerald-600 to-teal-600',
      border: 'border-emerald-500/30 hover:border-emerald-400',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      totalCount: helpers.length,
      pendingCount: countPending(helpers, 'helpers')
    },
    {
      id: 'simple_users',
      title: 'Simple User Profiles',
      titleHi: 'सामान्य यूज़र प्रोफाइल (Simple Users)',
      subtitle: 'Standard user accounts, profile verifications & ID approvals',
      icon: <UserCheck className="w-5 h-5 text-white" />,
      gradient: 'from-sky-600 to-blue-600',
      border: 'border-sky-500/30 hover:border-sky-400',
      badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      totalCount: simpleUsers.length,
      pendingCount: countPending(simpleUsers, 'simple_users')
    },
    {
      id: 'businesses',
      title: 'Business / Shop Registrations',
      titleHi: 'दुकान और बिज़नेस रजिस्ट्रेशन',
      subtitle: 'Local shops, showrooms, service centers & commercial listings',
      icon: <Store className="w-5 h-5 text-white" />,
      gradient: 'from-purple-600 to-indigo-600',
      border: 'border-purple-500/30 hover:border-purple-400',
      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      totalCount: businesses.length,
      pendingCount: countPending(businesses, 'businesses')
    },
    {
      id: 'job_seekers',
      title: 'Job / Work Registrations (Job Seekers)',
      titleHi: 'नौकरी / काम चाहने वाले (Job Seekers)',
      subtitle: 'Candidates looking for local jobs, daily wage or full-time work',
      icon: <Briefcase className="w-5 h-5 text-white" />,
      gradient: 'from-blue-600 to-indigo-700',
      border: 'border-blue-500/30 hover:border-blue-400',
      badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      totalCount: jobSeekersList.length,
      pendingCount: countPending(jobSeekersList, 'job_seekers')
    },
    {
      id: 'employers',
      title: 'Employer Registrations & Job Postings',
      titleHi: 'नौकरी / काम देने वाले (Job Givers)',
      subtitle: 'Registered employers, linked shops & staff vacancy postings',
      icon: <Building2 className="w-5 h-5 text-white" />,
      gradient: 'from-amber-600 to-orange-600',
      border: 'border-amber-500/30 hover:border-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      totalCount: employersList.length,
      pendingCount: countPending(employersList, 'employers')
    },
    {
      id: 'feedback_categories',
      title: 'User Feedback & Categories',
      titleHi: 'यूज़र फीडबैक, शिकायतें और कैटेगरी',
      subtitle: 'User feedback, safety reports & platform service categories',
      icon: <FileText className="w-5 h-5 text-white" />,
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

          {/* STEP 1: ADMIN PASSWORD */}
          {adminAuthStep === 'password' && (
            <form onSubmit={handlePasswordStepSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                <span className="font-black text-orange-400 block mb-0.5">🔒 Step 1 of 2: Enter Admin Password</span>
                सही पासवर्ड वेरीफाई होने के बाद ही 6-अंकों का सुरक्षा OTP सीधे आधिकारिक एडमिन ईमेल पर भेजा जाएगा।
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
                {isSendingAdminOtp ? 'Verifying Password & Sending OTP...' : 'Verify Password & Send OTP →'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleRequestForgotPasswordOtp}
                  disabled={isSendingAdminOtp}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
                >
                  Forgot Admin Password? Reset via Email OTP
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
                  ← Back to Password
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

    return rawList.filter(item => {
      const normStatus = getNormalizedStatus(item, activeModule);
      if (statusFilter !== 'all' && normStatus !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const hay = JSON.stringify(item).toLowerCase();
      return hay.includes(q);
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

          {/* Right: Prominent Change Admin Password Button, Refresh & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={loadAllData}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => {
                setIsChangePasswordOpen(!isChangePasswordOpen);
                setChangePasswordError(null);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Admin Password</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

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
        {/* VIEW 1: ADMIN HOME DASHBOARD WITH CLICKABLE SMALL BANNERS    */}
        {/* ============================================================ */}
        {activeModule === 'home' && (
          <div className="space-y-6">
            {/* Welcome & Quick Overview Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-slate-800 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/25 px-3 py-1 rounded-full mb-2">
                  <LayoutGrid className="w-3.5 h-3.5" /> Admin Home Dashboard
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Select a Category Banner to Manage
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Click any module banner below to open its dedicated management page (View, Search, Approve, Reject, Edit, or Delete entries).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => openModule('ads')}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Advertisements &amp; Banners</span>
                </button>
                <button
                  onClick={() => openAdminCreateModal('businesses', true)}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Entry (No OTP / Direct Publish)</span>
                </button>
                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-black flex items-center gap-2 cursor-pointer transition-all"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Change Password</span>
                </button>
              </div>
            </div>

            {/* 2. GRID OF SMALL CLICKABLE ADMIN BANNERS (CARDS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ADMIN_MODULES.map((mod, idx) => (
                <motion.button
                  key={mod.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => openModule(mod.id)}
                  className={`text-left group relative overflow-hidden rounded-2xl bg-[#111827] hover:bg-[#162033] border ${mod.border} p-4 sm:p-5 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer flex flex-col justify-between`}
                >
                  {/* Top Row: Icon + Counts */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform`}>
                        {mod.icon}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-[11px] font-black text-slate-200">
                          Total: {mod.totalCount}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${
                            mod.pendingCount > 0
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          Pending: {mod.pendingCount}
                        </span>
                      </div>
                    </div>

                    {/* Module Titles */}
                    <h3 className="text-base font-black text-white group-hover:text-orange-300 transition-colors leading-snug">
                      {mod.title}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      {mod.titleHi}
                    </p>
                    <p className="text-[11px] text-slate-400/90 mt-2 line-clamp-2 leading-relaxed">
                      {mod.subtitle}
                    </p>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-black text-orange-400 group-hover:text-orange-300">
                    <span>Open Dedicated View</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              ))}

              {/* Dedicated Card: Advertisements & Banners */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => openModule('ads')}
                className="text-left group relative overflow-hidden rounded-2xl bg-[#111827] hover:bg-[#162033] border border-cyan-500/30 hover:border-cyan-400 p-4 sm:p-5 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                      <Megaphone className="w-5 h-5 text-white" />
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-[11px] font-black text-slate-200">
                      Total Ads: {ads.length}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors leading-snug">
                    Advertisements &amp; Banners
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    होमपेज विज्ञापन और 16:9 बैनर (Upload / Active-Inactive / Delete)
                  </p>
                  <p className="text-[11px] text-slate-400/90 mt-2 line-clamp-2 leading-relaxed">
                    Upload 16:9 banner images, add titles/links, toggle active/inactive status, and delete ads.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-black text-cyan-400 group-hover:text-cyan-300">
                  <span>Open Advertisements &amp; Banners</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>

              {/* Card: Category 16:9 Images Manager (Add, Edit, Delete) */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                onClick={() => openModule('category_images')}
                className="text-left group relative overflow-hidden rounded-2xl bg-[#111827] hover:bg-[#162033] border border-amber-500/40 hover:border-amber-400 p-4 sm:p-5 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] font-black text-amber-300">
                      {Object.keys(categoryImages).length} / {CATEGORIES.length} Uploaded
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
                    Category 16:9 Images Manager
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    कैटेगरी की 16:9 फोटो जोड़ें, बदलें या हटाएं (Add / Edit / Delete)
                  </p>
                  <p className="text-[11px] text-slate-400/90 mt-2 line-clamp-2 leading-relaxed">
                    Directly upload, edit, or delete 16:9 banner images for all {CATEGORIES.length} service categories.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-black text-amber-400 group-hover:text-amber-300">
                  <span>Manage Category 16:9 Images</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>

              {/* 10th Card: Encrypted Security Vault (Read-Only / Non-Deletable) */}
              <motion.button
                type="button"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => openModule('security_vault')}
                className="text-left rounded-3xl bg-gradient-to-br from-emerald-950/60 via-[#111827] to-[#111827] hover:from-emerald-900/50 border border-emerald-500/40 hover:border-emerald-400 p-5 transition-all shadow-lg flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2.5 py-0.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-black text-emerald-300">
                        {securityVaultRecords.length} Encrypted Records
                      </span>
                      {securityVaultRecords.filter(r => r.isDeletedFromPublic || r.actionStatus?.includes('DELETED')).length > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-500/25 border border-rose-500/40 text-[10px] font-black text-rose-300">
                          🚨 {securityVaultRecords.filter(r => r.isDeletedFromPublic || r.actionStatus?.includes('DELETED')).length} Deleted by User (Saved)
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors leading-snug">
                    🛡️ Encrypted Security Vault (Read-Only)
                  </h3>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5">
                    AES-256-GCM लॉकर • एडमिन भी डिलीट नहीं कर सकता (सिर्फ़ देख सकते हैं)
                  </p>
                  <p className="text-[11px] text-slate-400/90 mt-2 line-clamp-2 leading-relaxed">
                    Permanent police/fraud investigation archive. Even if a user or service expert deletes their account, their Name, Phone, Address &amp; Watermarked Govt ID remain safely encrypted here forever.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-black text-emerald-400 group-hover:text-emerald-300">
                  <span>Open Read-Only Security Vault</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: DEDICATED MANAGEMENT SUB-PAGE FOR SELECTED MODULE    */}
        {/* ============================================================ */}
        {activeModule !== 'home' && activeModule !== 'ads' && activeModule !== 'category_images' && activeModule !== 'security_vault' && currentModuleMeta && (
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
                    {currentModuleMeta.titleHi} — {currentModuleMeta.subtitle}
                  </p>
                </div>
              </div>

              {/* Search & Status Filter Bar */}
              <div className="mt-5 pt-4 border-t border-slate-800/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
                  {(['all', 'pending', 'approved', 'rejected'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-2 rounded-xl text-xs font-black capitalize transition-all cursor-pointer shrink-0 ${
                        statusFilter === st
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st === 'all' ? 'All Entries' : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
                      View core LocoHelp categories, manage 16:9 category images, or add a custom category.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openModule('category_images')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black shadow-md cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Manage 16:9 Category Images ({Object.keys(categoryImages).length}/{CATEGORIES.length}) →</span>
                  </button>
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
                      h => (h.categoryId || h.category) === c.id
                    ).length;
                    const hasImg = Boolean(categoryImages[c.id]);
                    return (
                      <div
                        key={c.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
                      >
                        <div className="w-full sm:w-auto min-w-0">
                          <div className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                            {(c as any).icon || (c as any).emoji || '🛠️'} {c.nameEn}
                          </div>
                          {c.nameHi && (
                            <div className="text-xs font-semibold text-amber-400/90 leading-snug break-words mt-0.5">
                              {c.nameHi}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:w-auto shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold">
                            {catRegCount} Experts
                          </span>
                          <button
                            type="button"
                            onClick={() => openModule('category_images')}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold cursor-pointer"
                          >
                            {hasImg ? 'Edit 16:9 Image' : 'Upload Image'}
                          </button>
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
                  const isBusy = actionLoadingId === item.id;

                  // Extract display fields cleanly across modules
                  const title =
                    item.name ||
                    item.fullName ||
                    item.companyOrShopName ||
                    item.userName ||
                    item.user_name ||
                    item.reporterName ||
                    item.reason ||
                    'Entry #' + String(item.id).slice(-5);

                  const subtitle =
                    item.customCategoryName ||
                    item.categoryLabel ||
                    item.jobRole ||
                    item.category ||
                    item.headline ||
                    item.service ||
                    item.targetType ||
                    'General';

                  const phone = item.phone || item.whatsapp || item.userPhone || item.contactPhone || '';
                  const email = item.email || item.userEmail || '';
                  const area = item.area || item.jobLocation || item.address || item.locationName || '';
                  const desc =
                    item.description ||
                    item.jobDescription ||
                    item.skills ||
                    item.bio ||
                    item.details ||
                    item.experience ||
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
                      <div className="space-y-2 flex-1 min-w-0">
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

                            {idDoc && (
                              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-black">
                                🪪 ID Document Attached
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-black text-white leading-snug break-words">
                          {title}
                        </h3>

                        {desc && (
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-words">
                            {desc}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                          {phone && (
                            <span className="inline-flex items-center gap-1 text-slate-300 font-semibold">
                              <Phone className="w-3.5 h-3.5 text-emerald-400" /> {phone}
                            </span>
                          )}
                          {email && (
                            <span className="inline-flex items-center gap-1 text-slate-300">
                              <Mail className="w-3.5 h-3.5 text-sky-400" /> {email}
                            </span>
                          )}
                          {area && (
                            <span className="inline-flex items-center gap-1">
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

                      {/* Right Actions: View Details, Approve, Reject, Edit, Delete */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                        <button
                          onClick={() => setViewingItem({ module: activeModule, data: { ...item, idDocumentWatermarked: idDoc } })}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                          title="View All Details & Documents"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => handleStatusAction(activeModule, item, 'approved')}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => handleStatusAction(activeModule, item, 'rejected')}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

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
                                const updatedAd = { ...ad, isActive: nextActive };
                                await createAdOnServer(updatedAd);
                                setAds(prev => prev.map(a => (a.id === ad.id ? updatedAd : a)));
                                showToast(
                                  nextActive
                                    ? '✅ Ad Banner activated on Main Website!'
                                    : '⏸ Ad Banner set to Inactive (Hidden from Main Website).'
                                );
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                                isActive
                                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                              }`}
                            >
                              {isActive ? 'Set Inactive' : 'Set Active'}
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
        {/* VIEW 3: CATEGORY 16:9 IMAGES MANAGER (ADD / EDIT / DELETE)   */}
        {/* ============================================================ */}
        {activeModule === 'category_images' && (
          <div className="space-y-5">
            <div className="rounded-3xl bg-[#111827] border border-slate-800 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <button
                  onClick={() => openModule('home')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-black border border-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <span>← Back to Admin Dashboard</span>
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-black text-amber-300">
                  Uploaded Images: {Object.keys(categoryImages).length} / {CATEGORIES.length} Categories
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shrink-0">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      Category 16:9 Images Manager
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium">
                      हर केटेगरी के लिए 16:9 फोटो सीधे अपलोड करें (Add), बदलें (Edit) या हटाएं (Delete)
                    </p>
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catSearchFilter}
                    onChange={(e) => setCatSearchFilter(e.target.value)}
                    placeholder="Search category (e.g. Plumber, Cab)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.filter(cat => {
                if (!catSearchFilter.trim()) return true;
                const q = catSearchFilter.toLowerCase();
                return (
                  cat.nameEn.toLowerCase().includes(q) ||
                  cat.nameHi.toLowerCase().includes(q) ||
                  cat.id.toLowerCase().includes(q)
                );
              }).map(cat => {
                const currentImg = categoryImages[cat.id];
                const isBusy = catImageBusyId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl bg-[#111827] border border-slate-800 hover:border-amber-500/50 overflow-hidden flex flex-col justify-between shadow-md transition-all"
                  >
                    {/* 16:9 Image Preview Container */}
                    <div className="aspect-video w-full bg-slate-950 relative overflow-hidden border-b border-slate-800 flex items-center justify-center">
                      {currentImg ? (
                        <img
                          src={currentImg}
                          alt={cat.nameEn}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 space-y-1.5">
                          <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="text-[11px] font-bold text-slate-500">
                            No 16:9 Image Uploaded
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Default icon is currently shown on Category Card
                          </p>
                        </div>
                      )}

                      <span
                        className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          currentImg
                            ? 'bg-emerald-500/90 text-white border-emerald-400 shadow-sm'
                            : 'bg-slate-900/80 text-slate-400 border-slate-700'
                        }`}
                      >
                        {currentImg ? '✓ 16:9 Active' : 'Default'}
                      </span>
                    </div>

                    {/* Category Title & Add / Edit / Delete Controls (Responsive 2-Row Layout, Zero Truncation) */}
                    <div className="flex flex-col justify-between gap-2 p-3 sm:p-4">
                      {/* Top Row / Full Width: Complete Category Name */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="w-full sm:w-auto min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                            {cat.nameEn}
                          </h3>
                          <p className="text-xs font-bold text-amber-400/90 mt-0.5 leading-snug break-words">
                            {cat.nameHi}
                          </p>
                        </div>
                        <span className="self-start sm:self-center px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 shrink-0">
                          {helpers.filter(h => (h.categoryId || h.category) === cat.id).length} Registered
                        </span>
                      </div>

                      {/* Bottom Row: Action Buttons neatly aligned below title */}
                      <div className="flex flex-wrap items-center justify-between gap-2 w-full pt-2 border-t border-slate-800/80">
                        {/* Direct Device File Upload Button (Add or Edit/Replace) */}
                        <label
                          className={`flex-1 min-w-[130px] px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            currentImg
                              ? 'bg-blue-600 hover:bg-blue-500 text-white'
                              : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm'
                          } ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <Upload className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isBusy
                              ? 'Saving...'
                              : currentImg
                              ? 'Edit / Change Photo'
                              : '+ Upload 16:9 Photo'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isBusy}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleUploadCategoryImageFile(cat.id, cat.nameEn, file);
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>

                        {/* Edit / Paste Image URL Button */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            setEditingCatImageUrl({
                              categoryId: cat.id,
                              nameEn: cat.nameEn,
                              nameHi: cat.nameHi,
                              url: currentImg || ''
                            })
                          }
                          className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Add or Edit Image via URL"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>URL</span>
                        </button>

                        {/* Delete Button (Only when custom image exists) */}
                        {currentImg && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteCategoryImage(cat.id, cat.nameEn)}
                            className="px-2.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/35 text-red-300 border border-red-500/30 text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Delete Category Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
                    { id: 'deleted', label: `🚨 Deleted by User (${securityVaultRecords.filter(r => r.isDeletedFromPublic || r.actionStatus?.includes('DELETED')).length})` },
                    { id: 'with_id', label: `🪪 With Watermarked Govt ID (${securityVaultRecords.filter(r => Boolean(r.idDocumentWatermarked)).length})` },
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
                if (vaultFilter === 'deleted' && !rec.isDeletedFromPublic && !rec.actionStatus?.includes('DELETED')) return false;
                if (vaultFilter === 'with_id' && !rec.idDocumentWatermarked) return false;
                if (vaultFilter === 'helper' && rec.entityType !== 'helper') return false;
                if (vaultFilter === 'user_profile' && rec.entityType !== 'user_profile' && rec.entityType !== 'auth_user' && rec.entityType !== 'verification') return false;
                if (vaultFilter === 'business' && rec.entityType !== 'business') return false;
                if (vaultFilter === 'job' && rec.entityType !== 'job_seeker' && rec.entityType !== 'employer') return false;

                if (!q) return true;
                const haystack = `${rec.name} ${rec.phone} ${rec.email} ${rec.area} ${rec.category} ${rec.entityType} ${rec.recordId} ${rec.actionStatus}`.toLowerCase();
                return haystack.includes(q);
              });

              if (filteredVault.length === 0) {
                return (
                  <div className="rounded-3xl bg-[#111827] border border-slate-800 p-10 text-center">
                    <Lock className="w-10 h-10 text-emerald-500/60 mx-auto mb-3" />
                    <p className="text-sm font-black text-white">No matching records in Security Vault</p>
                    <p className="text-xs text-slate-400 mt-1">All registered users, service experts, businesses, and deleted accounts are automatically encrypted and preserved here.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVault.map((rec) => {
                    const isDeleted = rec.isDeletedFromPublic || rec.actionStatus?.includes('DELETED');
                    return (
                      <div
                        key={rec.vaultKey}
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
                              <p className="text-[11px] text-slate-400 font-mono break-all mt-0.5">
                                Vault ID: {rec.recordId}
                              </p>
                            </div>
                          </div>

                          {/* Contact & Location Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{rec.phone || 'No Phone'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-200 font-bold truncate">
                              <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="truncate">{rec.email || 'No Email'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300 font-bold sm:col-span-2">
                              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{rec.area || 'Area not specified'}</span>
                            </div>
                          </div>

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
      {/* MODAL: ADD / EDIT CATEGORY 16:9 IMAGE VIA URL                */}
      {/* ============================================================ */}
      <AnimatePresence>
        {editingCatImageUrl && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingCatImageUrl.nameEn} — 16:9 Image URL
                  </h3>
                  <p className="text-xs text-amber-400 font-bold">{editingCatImageUrl.nameHi}</p>
                </div>
                <button
                  onClick={() => setEditingCatImageUrl(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCategoryImageUrl} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    Image URL or Data URI (16:9)
                  </label>
                  <input
                    type="text"
                    value={editingCatImageUrl.url}
                    onChange={(e) =>
                      setEditingCatImageUrl({ ...editingCatImageUrl, url: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                {editingCatImageUrl.url.trim() && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                    <img
                      src={editingCatImageUrl.url.trim()}
                      alt="Preview"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCatImageUrl(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={catImageBusyId === editingCatImageUrl.categoryId}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black cursor-pointer disabled:opacity-50"
                  >
                    Save 16:9 Image
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL 1: VIEW ALL DETAILS & WATERMARKED ID DOCUMENT          */}
      {/* ============================================================ */}
      <AnimatePresence>
        {viewingItem && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
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
                {viewingItem.data.idDocumentWatermarked && (
                  <div className="p-3 rounded-2xl bg-slate-950 border border-cyan-500/30">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-black text-cyan-400">
                        🪪 Uploaded Verification Document (Auto-Watermarked):
                      </p>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300">
                        FOR LOCOHELP VERIFICATION ONLY • DO NOT SHARE
                      </span>
                    </div>
                    <div className="relative select-none overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                      <img
                        src={viewingItem.data.idDocumentWatermarked}
                        alt="Verification ID"
                        loading="lazy"
                        decoding="async"
                        onContextMenu={(e) => e.preventDefault()}
                        draggable={false}
                        className="max-h-80 w-auto mx-auto object-contain pointer-events-none"
                      />
                      {/* Extra protective visual watermark overlay in Admin Viewer */}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="rotate-[-18deg] bg-black/55 text-white/85 border border-white/25 px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-lg">
                          LOCOHELP SECURITY VAULT • DO NOT REUSE OR VIRAL
                        </span>
                      </div>
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
                            {h.snapshotSummary?.name || ''} {h.snapshotSummary?.phone ? `(${h.snapshotSummary.phone})` : ''}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {h.timestamp ? new Date(h.timestamp).toLocaleString('en-IN') : ''}
                          </span>
                        </div>
                      ))}
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
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
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
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameEn} ({c.nameHi})
                          </option>
                        ))}
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl max-h-[90vh] flex flex-col bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
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
                          {CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nameEn} ({c.nameHi})
                            </option>
                          ))}
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
                      ? 'Upload Shop Photos (Up to 3 Images, Max 2MB each)'
                      : creatingItem.module === 'job_seekers'
                      ? 'Upload Candidate Photo (Max 2MB) or Resume PDF (Max 5MB)'
                      : 'Upload Profile / Work Photo (JPG, PNG, WEBP Max 2MB)'}
                  </label>
                  <input
                    type="file"
                    accept={creatingItem.module === 'job_seekers' ? '.jpg,.jpeg,.png,.webp,.pdf' : '.jpg,.jpeg,.png,.webp'}
                    multiple={creatingItem.module === 'businesses'}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []) as File[];
                      for (const file of files.slice(0, 3)) {
                        const allowPdf = creatingItem.module === 'job_seekers';
                        const check = await validateUploadedFile(file, { allowPdf });
                        if (!check.valid) {
                          showToast(check.error || 'Invalid file');
                          continue;
                        }
                        if (file.type === 'application/pdf') {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const dataUrl = reader.result as string;
                            setCreatingItem((prev) =>
                              prev ? { ...prev, resumeUrl: dataUrl, resumeFileName: file.name } : prev
                            );
                          };
                          reader.readAsDataURL(file);
                        } else {
                          try {
                            const dataUrl = await compressImageToWebP(file, { maxWidth: 1200, quality: 0.75 });
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
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg max-h-[90vh] flex flex-col bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
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
