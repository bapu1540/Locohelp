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
import { getFreeHelperProfiles, CATEGORIES } from '../data/categories';
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
  deleteAdminReportOnServer
} from '../api';
import { validateUploadedFile } from '../lib/security';

interface AdminDashboardProps {
  onBack: () => void;
  showToast: (msg: string) => void;
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
  | 'ads';

const DEFAULT_ADS: AdBannerItem[] = [];

export default function AdminDashboard({ onBack, showToast }: AdminDashboardProps) {
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
    module: 'businesses' | 'helpers' | 'job_seekers' | 'employers' | 'help_posts';
    nameOrTitle: string;
    ownerOrRole: string;
    category: string;
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

  const openAdminCreateModal = (mod: 'businesses' | 'helpers' | 'job_seekers' | 'employers' | 'help_posts') => {
    setCreatingItem({
      module: mod,
      nameOrTitle: '',
      ownerOrRole: '',
      category: mod === 'helpers' ? 'plumber' : 'Retail & Services',
      phone: '',
      email: '',
      areaOrLocation: '',
      address: '',
      timingsOrExperience: mod === 'businesses' ? '9:00 AM - 9:00 PM' : mod === 'helpers' ? '2+ Years' : '',
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
  const [adCategory, setAdCategory] = useState('Electronics & Repair');
  const [adOfferBadge, setAdOfferBadge] = useState('🔥 25% OFF Today');
  const [adOfferTitle, setAdOfferTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adPhotoUrl, setAdPhotoUrl] = useState('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80');
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

      // Bonus: Sponsored Ads
      const liveAds = await fetchLiveAds();
      if (Array.isArray(liveAds)) {
        setAds(liveAds);
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
        const res = await updateAdminIntentOnServer(id, { status: newStatus, isApproved });
        if (res.success) {
          setIntents(prev => prev.map(i => (i.id === id ? { ...i, status: newStatus, isApproved } : i)));
          showToast(isApproved ? '✅ Help Post Approved!' : '❌ Help Post Rejected.');
        } else {
          showToast(res.error || 'Failed to update Help Post');
        }
      } else if (mod === 'helpers') {
        const res = await updateAdminHelperOnServer(id, { status: newStatus, isVerified: isApproved });
        if (res.success) {
          setHelpers(prev => prev.map(h => (h.id === id ? { ...h, status: newStatus, isVerified: isApproved } : h)));
          // Sync local storage
          try {
            const raw = localStorage.getItem('locohelp_free_helper_profiles');
            if (raw) {
              const arr = JSON.parse(raw).map((h: any) => (h.id === id ? { ...h, status: newStatus, isVerified: isApproved } : h));
              localStorage.setItem('locohelp_free_helper_profiles', JSON.stringify(arr));
            }
          } catch {}
          showToast(isApproved ? '✅ Helper Profile Approved & Verified!' : '❌ Helper Profile Rejected.');
        } else {
          showToast(res.error || 'Failed to update Helper Profile');
        }
      } else if (mod === 'simple_users') {
        if (item.verificationId) {
          await updateAdminVerificationStatus(item.verificationId, newStatus);
        }
        const res = await updateAdminUserOnServer(id, { status: newStatus, isVerified: isApproved });
        if (res.success || item.verificationId) {
          setSimpleUsers(prev => prev.map(u => (u.id === id ? { ...u, status: newStatus, isVerified: isApproved } : u)));
          showToast(isApproved ? '✅ Simple User Profile Approved!' : '❌ Simple User Profile Rejected.');
        } else {
          showToast(res.error || 'Failed to update User Profile');
        }
      } else if (mod === 'businesses') {
        const res = await updateAdminBusinessOnServer(id, { status: newStatus, isVerified: isApproved });
        if (res.success) {
          setBusinesses(prev => prev.map(b => (b.id === id ? { ...b, status: newStatus, isVerified: isApproved } : b)));
          try {
            const raw = localStorage.getItem('locohelp_registered_shops');
            if (raw) {
              const arr = JSON.parse(raw).map((s: any) => (s.id === id ? { ...s, status: newStatus, isVerified: isApproved } : s));
              localStorage.setItem('locohelp_registered_shops', JSON.stringify(arr));
            }
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
        const res = await updateAdminReportOnServer(id, { status: newStatus });
        if (res.success) {
          setReports(prev => prev.map(r => (r.id === id ? { ...r, status: newStatus } : r)));
          showToast(isApproved ? '✅ Feedback / Report Marked Approved & Resolved!' : '❌ Feedback / Report Rejected.');
        } else {
          showToast(res.error || 'Failed to update Feedback');
        }
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteAction = async (mod: AdminModuleId, item: any) => {
    const id = item.id;
    const label = item.name || item.fullName || item.companyOrShopName || item.description || item.reason || id;
    if (!window.confirm(`Are you sure you want to permanently DELETE this entry?\n\n"${String(label).slice(0, 60)}"`)) {
      return;
    }

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
        showToast('🗑️ Helper Profile deleted permanently.');
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
      const headers = getAuthHeaders();
      const mod = creatingItem.module;

      if (mod === 'businesses') {
        const payload = {
          name: creatingItem.nameOrTitle.trim(),
          businessName: creatingItem.nameOrTitle.trim(),
          category: creatingItem.category.trim() || 'Retail & Services',
          categoryLabel: creatingItem.category.trim() || 'Local Business',
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
        setBusinesses(prev => [data, ...prev]);
        showToast('✅ Shop / Business added & published live immediately!');
      } else if (mod === 'helpers') {
        const payload = {
          name: creatingItem.nameOrTitle.trim(),
          categoryId: creatingItem.category.trim() || 'general',
          skills: [creatingItem.ownerOrRole.trim() || creatingItem.category.trim() || 'General Helper'],
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
        if (!res.ok) throw new Error(data.error || 'Failed to add Helper');
        setHelpers(prev => [data, ...prev]);
        showToast('✅ Local Helper added & published live immediately!');
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
        if (data.item) setJobItems(prev => [data.item, ...prev]);
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
        if (data.item) setJobItems(prev => [data.item, ...prev]);
        showToast('✅ Employer Job Posting added & published live immediately!');
      } else if (mod === 'help_posts') {
        const payload = {
          authorName: creatingItem.ownerOrRole.trim() || 'Community Member',
          title: creatingItem.nameOrTitle.trim(),
          description: creatingItem.description.trim() || creatingItem.nameOrTitle.trim(),
          category: creatingItem.category.trim() || 'General',
          tags: [`#${(creatingItem.category.trim() || 'General').replace(/\s+/g, '')}`],
          phone: creatingItem.phone.trim(), // 100% optional for Admin
          email: creatingItem.email.trim(), // 100% optional for Admin
          area: creatingItem.areaOrLocation.trim() || 'Local Area',
          location: creatingItem.areaOrLocation.trim() || 'Local Area',
          status: 'active'
        };
        const res = await fetch('/api/intents', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add Help Post');
        setIntents(prev => [data, ...prev]);
        showToast('✅ Help Post added & published live immediately!');
      }

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

    const { module: mod, id, nameOrTitle, categoryOrRole, phone, email, areaOrLocation, descriptionOrBio, salaryOrPrice, status } = editingItem;
    const isApproved = status === 'approved';

    try {
      if (mod === 'help_posts') {
        const updates = {
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
        const updates = {
          name: nameOrTitle,
          category: categoryOrRole,
          phone,
          email,
          area: areaOrLocation,
          bio: descriptionOrBio,
          priceRange: salaryOrPrice,
          status,
          isVerified: isApproved
        };
        const res = await updateAdminHelperOnServer(id, updates);
        if (res.success) {
          setHelpers(prev => prev.map(h => (h.id === id ? { ...h, ...updates } : h)));
          showToast('✅ Helper Profile updated successfully!');
          setEditingItem(null);
        } else {
          showToast(res.error || 'Failed to update Helper Profile');
        }
      } else if (mod === 'simple_users') {
        const updates = {
          name: nameOrTitle,
          category: categoryOrRole,
          phone,
          email,
          area: areaOrLocation,
          bio: descriptionOrBio,
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
          name: nameOrTitle,
          category: categoryOrRole,
          phone,
          email,
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
          showToast('✅ Business / Shop updated successfully!');
          setEditingItem(null);
        } else {
          showToast(res.error || 'Failed to update Business');
        }
      } else if (mod === 'job_seekers') {
        const updates: Partial<JobPortalSubmission> = {
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
        const updates: Partial<JobPortalSubmission> = {
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
      title: 'Help Posts Management',
      titleHi: 'हेल्प पोस्ट्स मैनेजमेंट',
      subtitle: 'Community help requests, radar broadcasts & urgent alerts',
      icon: <MessageCircle className="w-5 h-5 text-white" />,
      gradient: 'from-rose-600 to-orange-600',
      border: 'border-rose-500/30 hover:border-rose-400',
      badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      totalCount: intents.length,
      pendingCount: countPending(intents, 'help_posts')
    },
    {
      id: 'helpers',
      title: 'Browse Local Helpers / Helper Profiles',
      titleHi: 'लोकल हेल्पर्स और कारीगर प्रोफाइल',
      subtitle: 'Registered skilled workers, electricians, plumbers & service helpers',
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
      <div className="min-h-screen w-full bg-[#090D16] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
    <div className="min-h-screen w-full bg-[#090D16] text-slate-100 flex flex-col">
      {/* ========================================== */}
      {/* 1. TOP ADMIN BAR                           */}
      {/* ========================================== */}
      <header className="sticky top-0 z-30 bg-[#0F1624]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand & Back to Site */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Back to Main Website"
            >
              <ArrowLeft className="w-5 h-5" />
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
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
                  onClick={() => openAdminCreateModal('businesses')}
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

              {/* Bonus Card: Sponsored Ad Banners */}
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
                      Active Ads: {ads.length}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors leading-snug">
                    Sponsored Ad Banners
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    होमपेज विज्ञापन और स्पॉन्सर्ड बैनर
                  </p>
                  <p className="text-[11px] text-slate-400/90 mt-2 line-clamp-2 leading-relaxed">
                    Create, preview, and remove promotional homepage ad banners.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-black text-cyan-400 group-hover:text-cyan-300">
                  <span>Manage Ad Banners</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: DEDICATED MANAGEMENT SUB-PAGE FOR SELECTED MODULE    */}
        {/* ============================================================ */}
        {activeModule !== 'home' && activeModule !== 'ads' && currentModuleMeta && (
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
                  {(['businesses', 'helpers', 'job_seekers', 'employers', 'help_posts'] as const).includes(activeModule as any) && (
                    <button
                      onClick={() => openAdminCreateModal(activeModule as any)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add & Publish New (Optional Email/Phone)</span>
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
                      View core LocoHelp categories or add a new custom service category.
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

                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                  {CATEGORIES.map(c => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-semibold"
                    >
                      <span>{c.icon}</span>
                      <span>{c.name}</span>
                    </span>
                  ))}
                  {customCategories.map(c => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/15 border border-pink-500/30 text-[11px] text-pink-300 font-bold"
                    >
                      <span>{c.icon}</span>
                      <span>{c.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = customCategories.filter(x => x.id !== c.id);
                          setCustomCategories(updated);
                          try {
                            localStorage.setItem('locohelp_custom_categories', JSON.stringify(updated));
                          } catch {}
                        }}
                        className="ml-1 text-pink-400 hover:text-white cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
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
                        <div className="flex flex-wrap items-center gap-2">
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

                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold">
                            {subtitle}
                          </span>

                          {extraBadge && (
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
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

                        <h3 className="text-base sm:text-lg font-black text-white break-words">
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
        {/* BONUS VIEW: SPONSORED AD BANNERS                             */}
        {/* ============================================================ */}
        {activeModule === 'ads' && (
          <div className="space-y-5">
            <div className="rounded-3xl bg-[#111827] border border-slate-800 p-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openModule('home')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-orange-400" />
                  <span>← Back to Admin Dashboard</span>
                </button>
                <h2 className="text-lg sm:text-xl font-black text-white">Sponsored Ad Banners ({ads.length})</h2>
              </div>
              <button
                onClick={() => setIsCreateAdModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create New Ad Banner
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ads.map(ad => (
                <div key={ad.id} className="rounded-2xl bg-[#111827] border border-slate-800 p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shrink-0">
                      {ad.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                        {ad.offerBadge}
                      </span>
                      <h3 className="text-base font-black text-white mt-1">{ad.businessName}</h3>
                      <p className="text-xs font-bold text-amber-300">{ad.offerTitle}</p>
                      <p className="text-xs text-slate-400 mt-1">{ad.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <span className="text-xs text-slate-400">{ad.area}</span>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Delete ad for "${ad.businessName}"?`)) return;
                        await deleteAdOnServer(ad.id);
                        setAds(prev => prev.filter(a => a.id !== ad.id));
                        showToast('🗑️ Ad Banner deleted');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 text-xs font-bold cursor-pointer"
                    >
                      Delete Ad
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

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
                    <p className="text-xs font-black text-cyan-400 mb-2">
                      🪪 Uploaded Verification Document (Auto-Watermarked):
                    </p>
                    <img
                      src={viewingItem.data.idDocumentWatermarked}
                      alt="Verification ID"
                      className="max-h-72 w-auto mx-auto rounded-xl border border-slate-800 object-contain"
                    />
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
                    <input
                      type="text"
                      value={editingItem.categoryOrRole}
                      onChange={(e) => setEditingItem({ ...editingItem, categoryOrRole: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
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
                    Admin Direct Registration (Instant Auto-Publish)
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-bold mt-0.5">
                    ✓ Email & Mobile Number are 100% Optional • No OTP Required • Auto-Approved Live
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
                {/* Module Selector */}
                <div>
                  <label className="block font-black text-slate-300 mb-1.5">Select Entry Type to Add</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {[
                      { id: 'businesses', label: '🏪 Shop/Biz' },
                      { id: 'helpers', label: '🛠️ Helper' },
                      { id: 'job_seekers', label: '🎓 Job Seeker' },
                      { id: 'employers', label: '💼 Employer' },
                      { id: 'help_posts', label: '📢 Help Post' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => openAdminCreateModal(tab.id as any)}
                        className={`py-2 px-2.5 rounded-xl font-black text-[11px] border transition-all cursor-pointer ${
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {creatingItem.module === 'businesses'
                        ? 'Shop / Business Name *'
                        : creatingItem.module === 'helpers'
                        ? 'Worker / Helper Name *'
                        : creatingItem.module === 'job_seekers'
                        ? 'Candidate Full Name *'
                        : creatingItem.module === 'employers'
                        ? 'Company / Shop Name *'
                        : 'Help Post Title *'}
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
                        : creatingItem.module === 'helpers'
                        ? 'Primary Skill (e.g. Plumber, Electrician)'
                        : creatingItem.module === 'job_seekers'
                        ? 'Preferred Work Role'
                        : creatingItem.module === 'employers'
                        ? 'Hiring Job Role *'
                        : 'Author Name'}
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
                    <input
                      type="text"
                      value={creatingItem.category}
                      onChange={(e) => setCreatingItem({ ...creatingItem, category: e.target.value })}
                      placeholder="e.g. Grocery, Plumber, Office & Admin"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
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

                {creatingItem.module !== 'help_posts' && (
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
                )}

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
                {creatingItem.module !== 'help_posts' && (
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
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const dataUrl = reader.result as string;
                            if (file.type === 'application/pdf') {
                              setCreatingItem((prev) =>
                                prev ? { ...prev, resumeUrl: dataUrl, resumeFileName: file.name } : prev
                              );
                            } else {
                              setCreatingItem((prev) => {
                                if (!prev) return prev;
                                const nextPhotos = [...prev.photos, dataUrl].slice(0, 3);
                                return {
                                  ...prev,
                                  photoUrl: nextPhotos[0] || dataUrl,
                                  photos: nextPhotos
                                };
                              });
                            }
                          };
                          reader.readAsDataURL(file);
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
                )}

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
      {/* MODAL 4: CREATE AD BANNER MODAL                              */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isCreateAdModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-black text-white">Create Sponsored Ad Banner</h3>
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
                  if (!adBusinessName.trim() || !adOfferTitle.trim()) return;
                  setIsSubmittingAd(true);
                  const newAd: AdBannerItem = {
                    id: 'ad_' + Date.now(),
                    businessName: adBusinessName.trim(),
                    logo: adLogo,
                    category: adCategory,
                    offerBadge: adOfferBadge,
                    offerTitle: adOfferTitle.trim(),
                    description: adDescription.trim(),
                    photoUrl: adPhotoUrl,
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
                  showToast('✅ Ad Banner published!');
                }}
                className="p-6 space-y-3 text-xs"
              >
                <input
                  type="text"
                  required
                  value={adBusinessName}
                  onChange={(e) => setAdBusinessName(e.target.value)}
                  placeholder="Business / Shop Name *"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
                <input
                  type="text"
                  required
                  value={adOfferTitle}
                  onChange={(e) => setAdOfferTitle(e.target.value)}
                  placeholder="Offer Headline *"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
                <textarea
                  rows={2}
                  value={adDescription}
                  onChange={(e) => setAdDescription(e.target.value)}
                  placeholder="Offer Description"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
                <input
                  type="text"
                  value={adArea}
                  onChange={(e) => setAdArea(e.target.value)}
                  placeholder="Market / Sector Area"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateAdModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAd}
                    className="px-5 py-2 rounded-xl bg-orange-500 text-white font-black"
                  >
                    Publish Ad
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
