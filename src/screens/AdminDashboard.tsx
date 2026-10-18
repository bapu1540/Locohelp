import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Users, 
  ShieldAlert, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  MessageSquare, 
  Wrench, 
  AlertTriangle, 
  KeyRound, 
  Plus, 
  ExternalLink, 
  Globe, 
  Tag, 
  Star, 
  MapPin, 
  Sparkles, 
  Search, 
  ShieldCheck, 
  Image as ImageIcon, 
  Store, 
  LogOut, 
  Check, 
  X,
  Radio,
  FileText,
  Briefcase,
  Building2,
  UserCheck,
  Phone,
  MessageCircle,
  Clock,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import LogoDownloadStudio from '../components/LogoDownloadStudio';
import { supabase } from '../supabase';
import { getFreeHelperProfiles } from '../data/categories';
import { 
  fetchLiveIntents, 
  deleteIntentOnServer, 
  fetchLiveAds, 
  createAdOnServer, 
  deleteAdOnServer,
  fetchJobPortalItems,
  updateJobPortalStatus,
  deleteJobPortalItem,
  purgeDummyDataOnServer,
  resetDatabaseOnServer
} from '../api';
import { AdBannerItem, DEFAULT_ADS } from '../components/AdBannerSection';
import { JobPortalItem } from '../types';

interface AdminDashboardProps {
  onBack: () => void;
}

const PHOTO_PRESETS = [
  { label: '📱 Electronics & Gadgets', url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80' },
  { label: '🥬 Grocery & Organic Mart', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80' },
  { label: '🚗 Auto Workshop & Care', url: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=800&q=80' },
  { label: '👗 Fashion & Tailoring', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80' },
  { label: '☕ Cafe, Bakery & Dine', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80' },
  { label: '💊 Pharmacy & Health', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80' },
  { label: '🛠️ Hardware & Tools', url: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=800&q=80' },
  { label: '🛋️ Furniture & Home Decor', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80' }
];

const EMOJI_OPTIONS = ['🏪', '📱', '🥬', '🚗', '👗', '☕', '💊', '🛠️', '🛋️', '✂️', '🛍️', '💎', '🍰'];

const MASTER_ADMIN_EMAIL = "admin@locohelp.local";
const DEFAULT_ADMIN_PASSWORD = "Bapu@1540";

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  // Session authentication (remembers during current session)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('locohelp_admin_logged_in') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Fixed Master Admin Credentials & Login State
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // In-Dashboard Change Password Modal
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [changeOldPassword, setChangeOldPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'ads' | 'moderation' | 'overview' | 'helpers' | 'job_approvals' | 'logo_download'>('job_approvals');

  // Data states
  const [ads, setAds] = useState<AdBannerItem[]>(DEFAULT_ADS);
  const [intents, setIntents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  
  // Job Portal Approvals State
  const [jobPortalItems, setJobPortalItems] = useState<JobPortalItem[]>([]);
  const [jobFilterStatus, setJobFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [jobFilterType, setJobFilterType] = useState<'all' | 'job_seeker' | 'employer_vacancy'>('all');
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [isUpdatingJob, setIsUpdatingJob] = useState<string | null>(null);
  
  // UI states
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New Ad Banner Form Modal
  const [isCreateAdModalOpen, setIsCreateAdModalOpen] = useState(false);
  const [adBusinessName, setAdBusinessName] = useState('');
  const [adLogo, setAdLogo] = useState('🏪');
  const [adCategory, setAdCategory] = useState('Retail & Services');
  const [adOfferBadge, setAdOfferBadge] = useState('🔥 Mega Deal • 25% OFF');
  const [adOfferTitle, setAdOfferTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adPhotoUrl, setAdPhotoUrl] = useState(PHOTO_PRESETS[0].url);
  const [adDestinationUrl, setAdDestinationUrl] = useState('');
  const [adArea, setAdArea] = useState('');
  const [adDistance, setAdDistance] = useState('0.5');
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Verify Master Admin Password (Fixed for Sanjay Chauhan: Bapu@1540)
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentStoredPassword = localStorage.getItem('locohelp_admin_password') || DEFAULT_ADMIN_PASSWORD;
    if (adminPasswordInput.trim() === currentStoredPassword || adminPasswordInput.trim() === DEFAULT_ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setLoginError(null);
      setAdminPasswordInput('');
      try {
        sessionStorage.setItem('locohelp_admin_logged_in', 'true');
      } catch (err) {}
      showToast("👑 Welcome Admin Sanjay Chauhan!");
    } else {
      setLoginError("गलत पासवर्ड! केवल अधिकृत एडमिन पासवर्ड ही मान्य है।");
    }
  };

  // In-dashboard password change
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentStoredPassword = localStorage.getItem('locohelp_admin_password') || DEFAULT_ADMIN_PASSWORD;
    if (changeOldPassword !== currentStoredPassword) {
      setChangePasswordError("वर्तमान पासवर्ड गलत है");
      return;
    }
    if (changeNewPassword.length < 6) {
      setChangePasswordError("नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए");
      return;
    }
    if (changeNewPassword !== changeConfirmPassword) {
      setChangePasswordError("नए पासवर्ड मेल नहीं खा रहे हैं");
      return;
    }
    try {
      localStorage.setItem('locohelp_admin_password', changeNewPassword.trim());
      setIsChangePasswordModalOpen(false);
      setChangeOldPassword('');
      setChangeNewPassword('');
      setChangeConfirmPassword('');
      setChangePasswordError(null);
      showToast("✅ एडमिन पासवर्ड सफलतापूर्वक अपडेट हो गया!");
    } catch (e) {
      setChangePasswordError("पासवर्ड सेव करने में त्रुटि");
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('locohelp_admin_logged_in');
    } catch (err) {}
  };

  // Load live data
  const loadAllData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch live ad banners
      const liveAds = await fetchLiveAds();
      if (Array.isArray(liveAds) && liveAds.length > 0) {
        setAds(liveAds);
      } else {
        const stored = localStorage.getItem('locohelp_ad_banners');
        if (stored) {
          setAds(JSON.parse(stored));
        } else {
          setAds(DEFAULT_ADS);
        }
      }

      // 2. Fetch live community posts
      const liveIntents = await fetchLiveIntents();
      if (Array.isArray(liveIntents)) {
        setIntents(liveIntents);
      }

      // 3. Load registered helpers
      setHelpers(getFreeHelperProfiles());

      // 4. Fetch all job portal submissions for approvals workflow
      const liveJobs = await fetchJobPortalItems({ status: 'all' });
      if (Array.isArray(liveJobs)) {
        setJobPortalItems(liveJobs);
      }

      // 5. Fetch community reports
      try {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        }
      } catch (e) {}

    } catch (err) {
      console.warn("Admin load data warning:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    loadAllData();
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadAllData();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [isAdminAuthenticated]);

  // ==========================================
  // AD BANNER MANAGEMENT ACTIONS
  // ==========================================

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adBusinessName.trim() || !adOfferTitle.trim() || !adDescription.trim()) {
      showToast("⚠️ Kripya shop name, title aur description bharein");
      return;
    }

    setIsSubmittingAd(true);

    const newAd: AdBannerItem = {
      id: 'ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      businessName: adBusinessName.trim(),
      logo: adLogo,
      category: adCategory,
      offerBadge: adOfferBadge.trim() || '🔥 Special Offer',
      offerTitle: adOfferTitle.trim(),
      description: adDescription.trim(),
      photoUrl: adPhotoUrl.trim() || PHOTO_PRESETS[0].url,
      distance: parseFloat(adDistance) || 0.5,
      area: adArea.trim() || 'Local Market Area',
      rating: 5.0,
      reviewCount: 1,
      isVerified: true,
      destinationUrl: adDestinationUrl.trim() || '',
      initialMessage: `Namaste! ${adBusinessName.trim()} me aapka swagat hai. Hamare offer "${adOfferTitle.trim()}" ke baare me poochhein.`,
      createdAt: new Date().toISOString()
    };

    try {
      await createAdOnServer(newAd);
      setAds(prev => [newAd, ...prev.filter(a => a.id !== newAd.id)]);
      showToast("✅ Ad Banner Created & Live on Homepage!");
      setIsCreateAdModalOpen(false);
      
      // Reset form
      setAdBusinessName('');
      setAdOfferTitle('');
      setAdDescription('');
      setAdDestinationUrl('');
      setAdArea('');
    } catch (err) {
      console.error(err);
      showToast("⚠️ Error saving ad banner");
    } finally {
      setIsSubmittingAd(false);
    }
  };

  const handleAdPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setAdPhotoUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAd = async (adId: string, businessName: string) => {
    if (!window.confirm(`Kya aap "${businessName}" ka ad banner delete karna chahte hain?`)) return;

    try {
      setIsDeleting(adId);
      await deleteAdOnServer(adId);
      setAds(prev => prev.filter(a => a.id !== adId));
      showToast(`🗑️ "${businessName}" Ad banner deleted`);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Failed to delete ad banner");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleTestRedirect = (url?: string) => {
    if (!url || url.trim() === '') {
      showToast("ℹ️ Is ad par koi redirection link set nahi hai");
      return;
    }
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = 'https://' + target;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  // ==========================================
  // POST MODERATION ACTIONS
  // ==========================================

  const handleDeletePost = async (id: string, description: string) => {
    const preview = description.length > 35 ? description.substring(0, 35) + '...' : description;
    if (!window.confirm(`Kya aap is post ko radar se permanently delete karna chahte hain?\n\n"${preview}"`)) return;

    try {
      setIsDeleting(id);
      
      // 1. Delete on Server (intents.json)
      await deleteIntentOnServer(id);
      
      // 2. Remove from local storage records
      try {
        const deletedIds = JSON.parse(localStorage.getItem('locohelp_deleted_posts') || '[]');
        if (!deletedIds.includes(id)) {
          deletedIds.push(id);
          localStorage.setItem('locohelp_deleted_posts', JSON.stringify(deletedIds));
        }

        const storedCustom = localStorage.getItem('locohelp_custom_intents');
        if (storedCustom) {
          const arr = JSON.parse(storedCustom).filter((i: any) => i.id !== id);
          localStorage.setItem('locohelp_custom_intents', JSON.stringify(arr));
        }

        const storedCached = localStorage.getItem('locohelp_cached_intents');
        if (storedCached) {
          const arr = JSON.parse(storedCached).filter((i: any) => i.id !== id);
          localStorage.setItem('locohelp_cached_intents', JSON.stringify(arr));
        }
      } catch (e) {}

      // 3. Delete from Supabase if exists
      try {
        await supabase.from("intents").delete().eq("id", id);
        await supabase.from("help_requests").delete().eq("id", id);
      } catch (e) {}

      // 4. Update UI
      setIntents(prev => prev.filter(i => i.id !== id));
      showToast("🗑️ Post permanently removed from radar");
    } catch (err) {
      console.error("Delete post error:", err);
      showToast("⚠️ Post delete karne me samasya aayi");
    } finally {
      setIsDeleting(null);
    }
  };

  // ==========================================
  // JOB PORTAL APPROVAL ACTIONS
  // ==========================================

  const handleApproveJob = async (id: string) => {
    try {
      setIsUpdatingJob(id);
      const res = await updateJobPortalStatus(id, 'approved');
      if (res.success) {
        setJobPortalItems(prev =>
          prev.map(item => (item.id === id ? { ...item, status: 'approved', reviewedAt: new Date().toISOString() } : item))
        );
        showToast("✅ Approved! Profile/Vacancy is now live on the main website.");
      } else {
        showToast("⚠️ Could not approve item: " + (res.error || 'Server error'));
      }
    } catch (e: any) {
      showToast("⚠️ Error while approving item");
    } finally {
      setIsUpdatingJob(null);
    }
  };

  const handleRejectJob = async (id: string) => {
    try {
      setIsUpdatingJob(id);
      const res = await updateJobPortalStatus(id, 'rejected');
      if (res.success) {
        setJobPortalItems(prev =>
          prev.map(item => (item.id === id ? { ...item, status: 'rejected', reviewedAt: new Date().toISOString() } : item))
        );
        showToast("❌ Submission has been rejected.");
      } else {
        showToast("⚠️ Could not reject item: " + (res.error || 'Server error'));
      }
    } catch (e: any) {
      showToast("⚠️ Error while rejecting item");
    } finally {
      setIsUpdatingJob(null);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this submission?")) return;
    try {
      setIsUpdatingJob(id);
      const ok = await deleteJobPortalItem(id);
      if (ok) {
        setJobPortalItems(prev => prev.filter(item => item.id !== id));
        showToast("🗑️ Job portal entry permanently deleted");
      } else {
        showToast("⚠️ Could not delete item");
      }
    } catch (e: any) {
      showToast("⚠️ Error while deleting item");
    } finally {
      setIsUpdatingJob(null);
    }
  };

  const handlePurgeDummySeeds = async () => {
    if (!window.confirm("क्या आप सभी डमी/सैंपल पोस्ट्स (Sample Dummy Posts) हटाकर सिर्फ नए यूज़र के रियल पोस्ट्स ही रखना चाहते हैं?")) return;
    try {
      setIsRefreshing(true);
      const res = await purgeDummyDataOnServer();
      if (res.success) {
        showToast("✨ सभी डमी/सैंपल पोस्ट्स हटा दिए गए हैं! अब सिर्फ रियल यूज़र डेटा ही दिखेगा।");
        try {
          localStorage.removeItem('locohelp_cached_intents');
          localStorage.removeItem('locohelp_custom_intents');
          localStorage.removeItem('locohelp_ad_banners');
        } catch (e) {}
        await loadAllData();
      } else {
        showToast("⚠️ Purge failed: " + (res.message || 'Server error'));
      }
    } catch (e) {
      showToast("⚠️ Error purging dummy data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("⚠️ DANGER: क्या आप पूरा डेटाबेस खाली (Complete Wipe) करना चाहते हैं? सभी पोस्ट और जॉब एंट्रीज़ मिट जाएंगी।")) return;
    try {
      setIsRefreshing(true);
      const res = await resetDatabaseOnServer();
      if (res.success) {
        showToast("🚨 Database completely reset to empty live state.");
        try {
          localStorage.clear();
        } catch (e) {}
        await loadAllData();
      } else {
        showToast("⚠️ Reset failed: " + (res.message || 'Server error'));
      }
    } catch (e) {
      showToast("⚠️ Error resetting database");
    } finally {
      setIsRefreshing(false);
    }
  };


  // Filter posts
  const filteredIntents = intents.filter(item => {
    const textMatch = !searchQuery.trim() || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.authorName && item.authorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.tags && item.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!textMatch) return false;
    if (filterCategory === 'all') return true;
    if (filterCategory === 'active') return item.status === 'active';
    if (filterCategory === 'completed') return item.status === 'completed';
    return item.tags && item.tags.some((t: string) => t.toLowerCase().includes(filterCategory.toLowerCase()));
  });

  // ==========================================
  // ==========================================
  // MASTER ADMIN LOGIN & OTP SCREENS
  // ==========================================
  if (!isAdminAuthenticated) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-white p-4 sm:p-6 justify-center items-center overflow-y-auto">
        <div className="w-full max-w-md bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-purple-600"></div>

          {/* Icon Header */}
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-inner">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          <div className="space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>LocoHelp Master Control</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Admin Portal Access</h2>
              <p className="text-xs text-slate-400 mt-1">
                केवल अधिकृत मास्टर पासवर्ड द्वारा सुरक्षित
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Password</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={adminPasswordInput}
                    onChange={(e) => { setAdminPasswordInput(e.target.value); setLoginError(null); }}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3 pr-11 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Unlock Admin Panel</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-xs font-bold text-slate-400 hover:text-white py-1 transition-colors cursor-pointer"
                >
                  &larr; Back to LocoHelp
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATED ADMIN CONTROL PANEL
  // ==========================================
  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] dark:bg-slate-900 overflow-hidden relative text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-4 inset-x-4 z-50 flex justify-center pointer-events-none">
          <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-black flex items-center gap-2 border border-amber-400 animate-bounce">
            <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Admin Control Header */}
      <div className="px-4 py-3.5 pt-6 bg-white dark:bg-slate-800 border-b border-[#DFDBCF] dark:border-slate-700 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onBack} 
            className="p-2 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
            title="Go to App"
          >
            <ArrowLeft className="w-5 h-5 text-slate-800 dark:text-slate-200" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                Admin Control Panel
              </h1>
              <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <span>👑</span>
                <span>Master Admin</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              LocoHelp Central Management &bull; Ads, Moderation & Radar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setChangeOldPassword('');
              setChangeNewPassword('');
              setChangeConfirmPassword('');
              setChangePasswordError(null);
              setIsChangePasswordModalOpen(true);
            }}
            className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 px-2.5 py-1.5 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all flex items-center gap-1 cursor-pointer"
            title="Change Admin Password"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Password</span>
          </button>

          <button
            onClick={() => setActiveTab('logo_download')}
            className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              activeTab === 'logo_download'
                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
            }`}
            title="Download LocoHelp Official Logos (SVG & PNG)"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Download Logo</span>
          </button>

          <button
            onClick={loadAllData}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          
          <button 
            onClick={handleLogout}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-all flex items-center gap-1 cursor-pointer"
            title="Log out of admin session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex border-b border-[#DFDBCF] dark:border-slate-800 bg-white dark:bg-slate-800/90 px-3 pt-2 gap-1.5 shrink-0 overflow-x-auto scrollbar-hide">
        {/* Tab 0: Job Portal Approvals */}
        <button
          onClick={() => setActiveTab('job_approvals')}
          className={`pb-2.5 px-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'job_approvals' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Job Portal Approvals</span>
          {jobPortalItems.filter(i => (i.status || 'pending') === 'pending').length > 0 ? (
            <span className="bg-amber-500 text-white px-2 py-0.2 rounded-full text-[10px] font-black animate-pulse">
              {jobPortalItems.filter(i => (i.status || 'pending') === 'pending').length} Pending
            </span>
          ) : (
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.2 rounded-full text-[10px] font-bold">
              {jobPortalItems.length}
            </span>
          )}
        </button>

        {/* Tab 1: Ad Banner Management */}
        <button
          onClick={() => setActiveTab('ads')}
          className={`pb-2.5 px-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'ads' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Ad Banners</span>
          <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2 py-0.2 rounded-full text-[10px] font-black">
            {ads.length}
          </span>
        </button>

        {/* Tab 2: Post Moderation */}
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-2.5 px-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'moderation' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Post Moderation</span>
          <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.2 rounded-full text-[10px] font-black">
            {intents.length}
          </span>
        </button>

        {/* Tab 3: Overview & Stats */}
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'overview' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Live Metrics</span>
        </button>

        {/* Tab 4: Helper Profiles */}
        <button
          onClick={() => setActiveTab('helpers')}
          className={`pb-2.5 px-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'helpers' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Helpers ({helpers.length})</span>
        </button>

        {/* Tab 5: Official LocoHelp Logo Download Studio */}
        <button
          onClick={() => setActiveTab('logo_download')}
          className={`pb-2.5 px-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'logo_download' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-amber-500" />
          <span>Logo Download Studio</span>
          <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2 py-0.2 rounded-full text-[10px] font-black">
            SVG / PNG
          </span>
        </button>
      </div>

      {/* Main Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
        
        {/* ========================================================= */}
        {/* TAB 0: JOB PORTAL APPROVALS (SEEKER & EMPLOYER VACANCIES) */}
        {/* ========================================================= */}
        {activeTab === 'job_approvals' && (
          <div className="space-y-4">
            {/* Top Overview & Metrics Banner */}
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Job Portal Submissions & Approvals
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                    Review and verify Job Seeker candidate profiles and Employer job vacancies. Once approved, submissions instantly become active and live on the main website for the neighborhood to see and hire.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    onClick={loadAllData}
                    disabled={isRefreshing}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Status Counters Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <div 
                  onClick={() => setJobFilterStatus('pending')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    jobFilterStatus === 'pending'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                      : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 block">
                    ⏳ Pending Approval
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                    {jobPortalItems.filter(i => (i.status || 'pending') === 'pending').length}
                  </div>
                  <span className="text-[10px] text-slate-400">Requires verification</span>
                </div>

                <div 
                  onClick={() => setJobFilterStatus('approved')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    jobFilterStatus === 'approved'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 block">
                    ✅ Live on Website
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {jobPortalItems.filter(i => i.status === 'approved').length}
                  </div>
                  <span className="text-[10px] text-slate-400">Active & visible</span>
                </div>

                <div 
                  onClick={() => setJobFilterStatus('rejected')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    jobFilterStatus === 'rejected'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700'
                      : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300 block">
                    ❌ Rejected
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5">
                    {jobPortalItems.filter(i => i.status === 'rejected').length}
                  </div>
                  <span className="text-[10px] text-slate-400">Declined entries</span>
                </div>

                <div 
                  onClick={() => setJobFilterStatus('all')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    jobFilterStatus === 'all'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                      : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 block">
                    📋 Total Records
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                    {jobPortalItems.length}
                  </div>
                  <span className="text-[10px] text-slate-400">All submissions</span>
                </div>
              </div>
            </div>

            {/* Filter Toolbar: Status, Type & Search */}
            <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Status Segmented Buttons */}
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700/80 rounded-2xl overflow-x-auto scrollbar-hide shrink-0">
                  <button
                    onClick={() => setJobFilterStatus('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                      jobFilterStatus === 'pending'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    ⏳ Pending ({jobPortalItems.filter(i => (i.status || 'pending') === 'pending').length})
                  </button>
                  <button
                    onClick={() => setJobFilterStatus('approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                      jobFilterStatus === 'approved'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    ✅ Live ({jobPortalItems.filter(i => i.status === 'approved').length})
                  </button>
                  <button
                    onClick={() => setJobFilterStatus('rejected')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                      jobFilterStatus === 'rejected'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    ❌ Rejected ({jobPortalItems.filter(i => i.status === 'rejected').length})
                  </button>
                  <button
                    onClick={() => setJobFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                      jobFilterStatus === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    All ({jobPortalItems.length})
                  </button>
                </div>

                {/* Type Filter */}
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setJobFilterType('all')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      jobFilterType === 'all'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => setJobFilterType('job_seeker')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      jobFilterType === 'job_seeker'
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    👤 Job Seekers ({jobPortalItems.filter(i => i.type === 'job_seeker').length})
                  </button>
                  <button
                    onClick={() => setJobFilterType('employer_vacancy')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      jobFilterType === 'employer_vacancy'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🏢 Vacancies ({jobPortalItems.filter(i => i.type === 'employer_vacancy').length})
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  placeholder="Search by candidate name, shop/company, role, skills, phone, area..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
                {jobSearchQuery && (
                  <button
                    onClick={() => setJobSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Submissions List */}
            <div className="space-y-3">
              {(() => {
                const filtered = jobPortalItems.filter(item => {
                  if (jobFilterStatus !== 'all') {
                    const s = item.status || 'pending';
                    if (s !== jobFilterStatus) return false;
                  }
                  if (jobFilterType !== 'all') {
                    if (item.type !== jobFilterType) return false;
                  }
                  if (jobSearchQuery.trim()) {
                    const q = jobSearchQuery.toLowerCase().trim();
                    const matchName = (item.fullName || item.companyOrShopName || '').toLowerCase().includes(q);
                    const matchRole = (item.headline || item.jobRole || '').toLowerCase().includes(q);
                    const matchCat = (item.category || '').toLowerCase().includes(q);
                    const matchPhone = (item.phone || item.whatsapp || '').includes(q);
                    const matchArea = (item.area || item.address || '').toLowerCase().includes(q);
                    const matchDesc = (item.description || '').toLowerCase().includes(q);
                    const matchSkills = Array.isArray(item.skills) && item.skills.some((s: string) => s.toLowerCase().includes(q));
                    return matchName || matchRole || matchCat || matchPhone || matchArea || matchDesc || matchSkills;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center text-3xl">
                        📭
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                          No submissions found for "{jobFilterStatus}" filter
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          When users submit a Job Seeker profile or Employer vacancy on the homepage, it will appear here for verification.
                        </p>
                      </div>
                    </div>
                  );
                }

                return filtered.map((item) => {
                  const isSeeker = item.type === 'job_seeker';
                  const isPending = (item.status || 'pending') === 'pending';
                  const isApproved = item.status === 'approved';
                  const isRejected = item.status === 'rejected';
                  const isBusy = isUpdatingJob === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white dark:bg-slate-800 border rounded-3xl p-4 sm:p-5 shadow-xs transition-all space-y-3.5 relative overflow-hidden ${
                        isPending
                          ? 'border-amber-300 dark:border-amber-700/80'
                          : isApproved
                          ? 'border-emerald-300 dark:border-emerald-800/80'
                          : 'border-rose-200 dark:border-rose-900/60 opacity-80'
                      }`}
                    >
                      {/* Top Header Tag & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Type Badge */}
                          <span
                            className={`text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                              isSeeker
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {isSeeker ? <UserCheck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                            <span>{isSeeker ? '👤 Job Seeker Profile' : '🏢 Employer Job Vacancy'}</span>
                          </span>

                          {/* Status Badge */}
                          {isPending && (
                            <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-500 text-white flex items-center gap-1 shadow-2xs animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              <span>⏳ Pending Admin Approval</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>✅ Approved & Live on Main Site</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                              <X className="w-3.5 h-3.5" />
                              <span>❌ Rejected</span>
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 font-semibold">
                            ID: {item.id}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 font-medium">
                          Submitted: {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Main Info Section */}
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Photo / Logo */}
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                          {item.photoOrLogoUrl ? (
                            <img
                              src={item.photoOrLogoUrl}
                              alt={item.fullName || item.companyOrShopName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-3xl">
                              {isSeeker ? '👤' : '🏢'}
                            </div>
                          )}
                        </div>

                        {/* Title, Category & Specific Details */}
                        <div className="flex-1 space-y-2">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                              {item.category}
                            </span>
                            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                              {isSeeker ? item.fullName : item.jobRole}
                            </h4>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              {isSeeker ? item.headline : item.companyOrShopName}
                            </p>
                          </div>

                          {/* Key Specs Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                            <div className="bg-slate-50 dark:bg-slate-700/40 p-2 rounded-xl">
                              <span className="text-[10px] font-bold text-slate-400 block">
                                {isSeeker ? 'Expected Salary' : 'Salary Offered'}
                              </span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                {isSeeker ? item.expectedSalary || 'Negotiable' : item.salaryOffered || 'Good Salary'}
                              </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-700/40 p-2 rounded-xl">
                              <span className="text-[10px] font-bold text-slate-400 block">Experience</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {item.experience || 'Fresher'}
                              </span>
                            </div>

                            {isSeeker ? (
                              <div className="bg-slate-50 dark:bg-slate-700/40 p-2 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 block">Education</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {item.education || '12th Pass'}
                                </span>
                              </div>
                            ) : (
                              <div className="bg-slate-50 dark:bg-slate-700/40 p-2 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 block">Job Type & Openings</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {item.vacancyType || 'Full-Time'} • {item.openingsCount || 1} Openings
                                </span>
                              </div>
                            )}

                            <div className="bg-slate-50 dark:bg-slate-700/40 p-2 rounded-xl">
                              <span className="text-[10px] font-bold text-slate-400 block">
                                {isSeeker ? 'Availability' : 'Hiring Urgency'}
                              </span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                {isSeeker ? 'Immediate' : item.urgency || 'Immediate'}
                              </span>
                            </div>
                          </div>

                          {/* Skills Tags for Job Seeker */}
                          {isSeeker && Array.isArray(item.skills) && item.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {item.skills.map(skill => (
                                <span
                                  key={skill}
                                  className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-lg border border-blue-200/80 dark:border-blue-800/60"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Description Text */}
                          {item.description && (
                            <div className="bg-stone-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              <span className="font-bold text-[10px] uppercase text-slate-400 block mb-0.5">
                                Description & Details:
                              </span>
                              {item.description}
                            </div>
                          )}

                          {/* Contact & Location Strip */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                              <span className="font-semibold">{item.area}</span>
                              {item.address && <span className="text-slate-400">({item.address})</span>}
                            </div>

                            <div className="flex items-center gap-2">
                              {item.phone && (
                                <a
                                  href={`tel:${item.phone}`}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
                                  title="Call contact number"
                                >
                                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{item.phone}</span>
                                </a>
                              )}

                              {item.whatsapp && (
                                <a
                                  href={`https://wa.me/${item.whatsapp.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-100 transition-all"
                                  title="Message on WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Admin Action Buttons (Approve, Reject, Delete) */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3 sm:p-4 rounded-b-3xl">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {isPending && "Action Required: Click Approve to publish live on main website"}
                          {isApproved && "Active Status: Visible on main website"}
                          {isRejected && "Rejected Status: Hidden from main website"}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Reject Button */}
                          {!isRejected && (
                            <button
                              onClick={() => handleRejectJob(item.id)}
                              disabled={isBusy}
                              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                              title="Mark as rejected"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          )}

                          {/* Approve Button */}
                          {!isApproved && (
                            <button
                              onClick={() => handleApproveJob(item.id)}
                              disabled={isBusy}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                              title="Approve and make live immediately"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isRejected ? 'Re-Approve & Make Live' : 'Approve & Make Live'}</span>
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteJob(item.id)}
                            disabled={isBusy}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-700 hover:text-rose-600 text-slate-500 transition-all cursor-pointer disabled:opacity-50"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: AD BANNER MANAGEMENT                               */}
        {/* ========================================================= */}
        {activeTab === 'ads' && (
          <div className="space-y-4">
            {/* Top Bar for Ad Management */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Ad Banners Management</span>
                  <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 px-2 py-0.5 rounded-full">
                    {ads.length} Active Banners
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  View, add, edit redirection links, and delete sponsored ads appearing below the broadcast section.
                </p>
              </div>

              <button
                onClick={() => setIsCreateAdModalOpen(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Ad Banner</span>
              </button>
            </div>

            {/* List of Current Ad Banners */}
            <div className="grid grid-cols-1 gap-3.5">
              {ads.map((ad, idx) => (
                <div 
                  key={ad.id}
                  className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-4 shadow-sm hover:border-amber-400 transition-all relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {/* Thumbnail Image */}
                    <div className="w-full sm:w-44 h-32 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 relative border border-slate-200 dark:border-slate-600">
                      <img 
                        src={ad.photoUrl} 
                        alt={ad.businessName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white">
                        Ad #{idx + 1}
                      </span>
                    </div>

                    {/* Ad Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{ad.logo}</span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                          {ad.businessName}
                        </h4>
                        <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                          {ad.category}
                        </span>
                        {ad.offerBadge && (
                          <span className="text-[10px] font-black bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                            {ad.offerBadge}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {ad.offerTitle}
                      </p>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                        {ad.description}
                      </p>

                      {/* Redirection Link Preview */}
                      <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Redirection:</span>
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                            {ad.destinationUrl || 'None specified (defaults to in-built chat)'}
                          </span>
                        </div>

                        {ad.destinationUrl && (
                          <button
                            type="button"
                            onClick={() => handleTestRedirect(ad.destinationUrl)}
                            className="text-[10px] font-black bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Open Link in New Tab"
                          >
                            <span>Test Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center gap-3 pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {ad.area} ({ad.distance} km)
                        </span>
                        <span>⭐ {ad.rating} ({ad.reviewCount} reviews)</span>
                      </div>
                    </div>

                    {/* Delete Action Button */}
                    <div className="shrink-0 flex sm:flex-col items-center justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => handleDeleteAd(ad.id, ad.businessName)}
                        disabled={isDeleting === ad.id}
                        className="w-full sm:w-auto p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold"
                        title="Delete this ad banner"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Ad</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: POST MODERATION                                   */}
        {/* ========================================================= */}
        {activeTab === 'moderation' && (
          <div className="space-y-3.5">
            {/* Top Search & Filter Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Live Post Moderation</span>
                    <span className="text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                      {filteredIntents.length} Posts Shown
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review all user broadcasts on LocoHelp. Click Delete to instantly remove spam, illegal, or inappropriate posts.
                  </p>
                </div>
              </div>

              {/* Search input & Category Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts by description, author, keyword, or #tag..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                  {['all', 'active', 'emergency', 'plumber', 'electrician'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`text-[11px] font-black px-3 py-2 rounded-xl uppercase transition-all shrink-0 cursor-pointer ${
                        filterCategory === cat
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of broadcast posts */}
            <div className="space-y-3">
              {filteredIntents.length === 0 ? (
                <div className="py-12 bg-white dark:bg-slate-800 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 text-center text-slate-400">
                  No posts match your filters
                </div>
              ) : (
                filteredIntents.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-3xl p-4 shadow-xs relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            {item.status.toUpperCase()}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">{item.authorName}</span>
                          <span className="text-[10px] text-slate-400 font-bold">• {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {item.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags?.map((t: string) => (
                            <span key={t} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{t}</span>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeletePost(item.id, item.description)}
                        disabled={isDeleting === item.id}
                        className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all active:scale-90 cursor-pointer"
                        title="Delete this post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: LIVE METRICS & OVERVIEW                           */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Total Broadcasts</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {intents.length}
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-1 block">Saved in Database</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Active Ads</span>
                <div className="text-2xl font-black text-amber-600">
                  {ads.length}
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-1 block">Revenue Assets</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">User Reports</span>
                <div className="text-2xl font-black text-rose-600">
                  {reports.length}
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-1 block">Safety Moderation</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Helpers</span>
                <div className="text-2xl font-black text-emerald-600">
                  {helpers.length}
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-1 block">Mesh Network</span>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/80 border border-indigo-200 dark:border-slate-700 rounded-3xl space-y-3">
              <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Admin Quick Controls & Database Maintenance</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={() => { setActiveTab('ads'); setIsCreateAdModalOpen(true); }}
                  className="p-3 bg-white dark:bg-slate-700 rounded-2xl border border-indigo-200 dark:border-slate-600 flex items-center justify-between text-left hover:shadow-md transition-all cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">+ Add Sponsored Shop/Ad</span>
                    <span className="text-[10px] text-slate-500">Put local shop banner with redirect URL</span>
                  </div>
                  <Plus className="w-4 h-4 text-amber-500" />
                </button>

                <button
                  onClick={() => setActiveTab('job_approvals')}
                  className="p-3 bg-white dark:bg-slate-700 rounded-2xl border border-indigo-200 dark:border-slate-600 flex items-center justify-between text-left hover:shadow-md transition-all cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">Job Portal Approvals</span>
                    <span className="text-[10px] text-slate-500">Approve/Reject pending Job Seekers & Vacancies</span>
                  </div>
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                </button>

                {/* RESET DATABASE BUTTON */}
                <button
                  onClick={handleResetDatabase}
                  className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-300 dark:border-rose-800 flex items-center justify-between text-left hover:shadow-md transition-all cursor-pointer group"
                >
                  <div>
                    <span className="text-xs font-black text-rose-900 dark:text-rose-200 block group-hover:underline">
                      🚨 Complete Database Reset
                    </span>
                    <span className="text-[10px] text-rose-800 dark:text-rose-300 font-medium">
                      Wipe all database records to completely empty state
                    </span>
                  </div>
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: HELPER PROFILES                                   */}
        {/* ========================================================= */}
        {activeTab === 'helpers' && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 shadow-xs">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Registered Helper Profiles ({helpers.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verified community peers and local professionals available for immediate hire.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {helpers.map((h) => (
                <div 
                  key={h.id}
                  className="p-3.5 bg-white dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-3xl flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-sm shrink-0">
                      {h.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{h.name}</h4>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/70 px-1.5 rounded">
                          ★ {h.rating}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {h.categoryName} &bull; {h.area} &bull; {h.phone}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full shrink-0">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: LOGO & BRAND ASSETS STUDIO (SVG & PNG DOWNLOAD)    */}
        {/* ========================================================= */}
        {activeTab === 'logo_download' && (
          <LogoDownloadStudio onNotify={showToast} />
        )}

      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / CREATE NEW AD BANNER                         */}
      {/* ========================================================= */}
      {isCreateAdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-amber-300 dark:border-slate-700 max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Add New Ad Banner
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Will appear live in homepage carousel with external redirection
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateAdModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAd} className="flex-1 overflow-y-auto space-y-3.5 py-3 pr-1 text-xs">
              
              {/* Business Name & Logo Picker */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Shop / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={adBusinessName}
                    onChange={(e) => setAdBusinessName(e.target.value)}
                    placeholder="e.g. Mahavir Electronics & Mobiles"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="col-span-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Logo
                  </label>
                  <select
                    value={adLogo}
                    onChange={(e) => setAdLogo(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-base text-center text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    {EMOJI_OPTIONS.map(em => (
                      <option key={em} value={em}>{em}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category & Offer Badge */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Category *
                  </label>
                  <select
                    value={adCategory}
                    onChange={(e) => setAdCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option>Electronics & Mobiles</option>
                    <option>Grocery & Fresh Produce</option>
                    <option>Automobile & Care</option>
                    <option>Fashion & Tailoring</option>
                    <option>Food & Bakery</option>
                    <option>Pharmacy & Health</option>
                    <option>Home Services & Decor</option>
                    <option>Hardware & Tools</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Offer Badge *
                  </label>
                  <input
                    type="text"
                    required
                    value={adOfferBadge}
                    onChange={(e) => setAdOfferBadge(e.target.value)}
                    placeholder="e.g. 🔥 Mega Deal • 35% OFF"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Offer Headline / Title */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Catchy Offer Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={adOfferTitle}
                  onChange={(e) => setAdOfferTitle(e.target.value)}
                  placeholder="e.g. Festive Discount on Smartphone Repairs & Accessories"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Offer Description / Pitch *
                </label>
                <textarea
                  required
                  rows={2}
                  value={adDescription}
                  onChange={(e) => setAdDescription(e.target.value)}
                  placeholder="Write clear deal details, discounts, warranty, location directions..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Action Redirection Link */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Action Link / Redirection URL (Optional)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="url"
                      value={adDestinationUrl}
                      onChange={(e) => setAdDestinationUrl(e.target.value)}
                      placeholder="e.g. https://wa.me/919876543210"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestRedirect(adDestinationUrl)}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Test
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Leave blank to open a direct chat window within the app.
                </p>
              </div>

              {/* Banner Photo */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Banner Banner Photo *
                </label>
                
                <div className="flex gap-2 items-start">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img src={adPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-1">
                      {PHOTO_PRESETS.slice(0, 4).map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setAdPhotoUrl(p.url)}
                          className={`text-[9px] font-black py-1 px-1.5 rounded-lg border truncate ${adPhotoUrl === p.url ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <label className="block w-full text-center py-1.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200 font-bold cursor-pointer hover:bg-indigo-100">
                      Upload Custom Photo
                      <input type="file" accept="image/*" className="hidden" onChange={handleAdPhotoUpload} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Area & Distance */}
              <div className="grid grid-cols-2 gap-2 pb-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Display Area Name
                  </label>
                  <input
                    type="text"
                    value={adArea}
                    onChange={(e) => setAdArea(e.target.value)}
                    placeholder="e.g. Main Market, Sector 14"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Distance (KM)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={adDistance}
                    onChange={(e) => setAdDistance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 py-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAdModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAd}
                  className="flex-2 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-2xl shadow-lg shadow-orange-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAd ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save & Go Live</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-Dashboard Change Password Modal */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 text-white shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black">Change Admin Password</h3>
              </div>
              <button 
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 pt-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Current Password (वर्तमान पासवर्ड)
                </label>
                <input 
                  type="password"
                  value={changeOldPassword}
                  onChange={(e) => setChangeOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-hidden focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  New Password (नया पासवर्ड)
                </label>
                <input 
                  type="password"
                  value={changeNewPassword}
                  onChange={(e) => setChangeNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Confirm New Password (पुष्टि करें)
                </label>
                <input 
                  type="password"
                  value={changeConfirmPassword}
                  onChange={(e) => setChangeConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {changePasswordError && (
                <div className="p-2.5 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{changePasswordError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-95"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
