import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Camera, MapPin, Briefcase, Award, CheckCircle2, Star, Wrench, ChevronRight, Trash2, Store, Mail, CloudCheck, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n';
import { getCurrentUser, saveUserProfileToSupabase, getUserProfileFromSupabase, supabase, logoutUser, signInWithGoogle } from '../supabase';
import { isGuestUser } from '../lib/authUtils';
import FreeHelperRegisterModal from '../components/FreeHelperRegisterModal';
import RegisterShopModal from '../components/RegisterShopModal';

import { Screen } from '../types';

interface ProfileScreenProps {
  onBack: () => void;
  onNavigate?: (screen: Screen) => void;
}

export default function ProfileScreen({ onBack, onNavigate }: ProfileScreenProps) {
  const { language, t } = useLanguage();
  const [isPublic, setIsPublic] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState(() => {
    try {
      const activeUser = getCurrentUser();
      return activeUser?.email || '';
    } catch (e) {
      return '';
    }
  });
  const [userPhone, setUserPhone] = useState('');
  const [userSkills, setUserSkills] = useState('');
  const [userExp, setUserExp] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isHelperModalOpen, setIsHelperModalOpen] = useState(false);
  const [isRegisterShopOpen, setIsRegisterShopOpen] = useState(false);
  const [myHelperProfile, setMyHelperProfile] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Identify current logged in user and phone
    const activeUser = getCurrentUser();
    const phoneFromUser = activeUser?.phone || (activeUser?.uid?.startsWith('phone_') ? activeUser.uid.replace('phone_', '') : '');
    const userKey = activeUser?.uid || (phoneFromUser ? `phone_${phoneFromUser}` : 'guest');

    if (phoneFromUser) {
      setUserPhone(phoneFromUser);
    } else if (activeUser?.phone) {
      setUserPhone(activeUser.phone);
    }

    // 2. Load user-scoped cached profile from localStorage
    try {
      const userScopedRaw = localStorage.getItem(`locohelp_user_profile_${userKey}`);
      if (userScopedRaw) {
        const userScoped = JSON.parse(userScopedRaw);
        if (userScoped.name || userScoped.full_name) setUserName(userScoped.name || userScoped.full_name);
        if (userScoped.phone) setUserPhone(userScoped.phone);
        if (userScoped.skills) setUserSkills(userScoped.skills);
        if (userScoped.exp || userScoped.experience) setUserExp(userScoped.exp || userScoped.experience);
        if (userScoped.address) setUserAddress(userScoped.address);
        if (userScoped.profilePhoto || userScoped.avatar_url) setProfilePhoto(userScoped.profilePhoto || userScoped.avatar_url);
        if (userScoped.myHelperProfile) setMyHelperProfile(userScoped.myHelperProfile);
      } else {
        // Fallbacks for first time login with this phone number
        if (activeUser?.displayName) setUserName(activeUser.displayName);
        if (activeUser?.photoURL) setProfilePhoto(activeUser.photoURL);
        
        // Also check legacy keys if same user
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

    // 3. Load user-scoped document from Supabase
    const loadProfile = async () => {
      try {
        if (!userKey || userKey === 'guest') return;
        const data = await getUserProfileFromSupabase(userKey);
        if (data) {
          if (data.full_name || data.name) setUserName(data.full_name || data.name);
          if (data.phone) setUserPhone(data.phone);
          if (data.email) setUserEmail(data.email);
          if (data.skills) setUserSkills(data.skills);
          if (data.address) setUserAddress(data.address);
          if (data.experience || data.exp) setUserExp(data.experience || data.exp);
          if (data.avatar_url || data.profilePhoto) setProfilePhoto(data.avatar_url || data.profilePhoto);
          if (data.myHelperProfile) setMyHelperProfile(data.myHelperProfile);

          // Save locally under user-scoped key
          localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(data));
        }
      } catch (err) {
        console.warn("Supabase profile sync notice:", err);
      }
    };
    loadProfile();
  }, []);

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
          
          // Save in user-scoped local storage
          const userScopedRaw = localStorage.getItem(`locohelp_user_profile_${userKey}`);
          const userScoped = userScopedRaw ? JSON.parse(userScopedRaw) : {};
          userScoped.profilePhoto = base64String;
          localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(userScoped));
        } catch (e) {}
        
        // Attempt cloud sync
        try {
          if (userKey && userKey !== 'guest') {
            await saveUserProfileToSupabase({
              uid: userKey,
              avatar_url: base64String
            });
          }
        } catch (err) {
          console.warn("Cloud photo sync notice:", err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    // PROTECTED ACTION: Trigger login if guest tries to save profile
    if (isGuestUser()) {
      try {
        await signInWithGoogle();
      } catch (err) {
        console.error("Sign-in trigger error:", err);
      }
      return;
    }

    const activeUser = getCurrentUser();
    const cleanPhone = userPhone.replace(/\D/g, '') || activeUser?.phone || '';
    const userKey = activeUser?.uid || (cleanPhone ? `phone_${cleanPhone}` : 'guest');

    const profileData = {
      uid: userKey,
      full_name: userName || (cleanPhone ? `User ${cleanPhone.slice(-4)}` : ''),
      email: userEmail || activeUser?.email || '',
      phone: userPhone || cleanPhone,
      skills: userSkills,
      address: userAddress,
      experience: userExp,
      avatar_url: profilePhoto,
      myHelperProfile,
      updated_at: new Date().toISOString()
    };

    // 1. Save user-scoped local storage & global active user object
    try {
      localStorage.setItem(`locohelp_user_profile_${userKey}`, JSON.stringify(profileData));
      localStorage.setItem('locohelp_profile_name', userName);
      localStorage.setItem('locohelp_profile_skills', userSkills);
      localStorage.setItem('locohelp_profile_address', userAddress);
      localStorage.setItem('locohelp_profile_exp', userExp);
      if (profileData.email) {
        localStorage.setItem('locohelp_last_logged_in_email', profileData.email);
      }
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

    // 2. Save directly to Supabase with safe fallback
    try {
      await saveUserProfileToSupabase(profileData);
    } catch (err) {
      console.warn("Cloud profile save notice:", err);
    }

    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onBack();
    }, 450);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleGoogleSignInProfile = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.warn("Google sign-in from profile notice:", e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-slate-900 relative overflow-hidden transition-colors">
      {/* Top Navigation Header */}
      <div className="flex items-center px-4 py-3.5 pt-10 sm:pt-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl z-20 shadow-xs">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 mr-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-700 dark:text-pink-400"
          title="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">{t('prof.title') || 'My Profile'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-3 pb-28 space-y-3.5">
        
        {/* Google Connect Banner for Guest or Unlinked Profiles */}
        {!userEmail && (
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-3.5 text-white shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-2 shrink-0 flex items-center justify-center shadow-xs">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"/>
                </svg>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black leading-tight">
                  {t('prof.googleConnect')}
                </h4>
                <p className="text-[10px] text-blue-100 font-medium">
                  {t('prof.googleConnectDesc')}
                </p>
              </div>
            </div>
            <button
              onClick={handleGoogleSignInProfile}
              className="bg-white hover:bg-blue-50 text-blue-700 font-black text-xs px-3.5 py-2 rounded-xl shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {t('prof.googleLoginBtn')}
            </button>
          </div>
        )}

        {/* Emergency Reset for Dummy Profile */}
        {!userEmail && userName === 'user' && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-3 text-center">
             <p className="text-[10px] text-amber-700 dark:text-amber-500 font-bold mb-2">Old dummy data detected?</p>
             <button 
               onClick={() => { localStorage.clear(); window.location.reload(); }}
               className="text-[10px] font-black bg-amber-600 text-white px-4 py-1.5 rounded-lg active:scale-95 cursor-pointer"
             >
               WIPE ALL DATA & START FRESH
             </button>
          </div>
        )}

        {/* Profile Card: Avatar on TOP RIGHT CORNER, Rating & Info aligned to the FAR LEFT */}
        <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            
            {/* LEFT SIDE: Name, Phone & Rating aligned strictly to the left */}
            <div className="flex flex-col text-left min-w-0 pr-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                {userName || "Profile"}
              </h1>
              
              {/* Phone number */}
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {userPhone ? `+91 ${userPhone}` : ""}
              </p>

              {/* Logged in Google Email - Requirement 3 */}
              {userEmail && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-2.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/90 dark:border-blue-800 rounded-lg max-w-[210px] sm:max-w-xs shadow-2xs">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 truncate tracking-tight">{userEmail}</span>
                </div>
              )}

              {/* Rating Section - Left Aligned */}
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`w-4 h-4 ${star <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700 fill-slate-200 dark:fill-slate-700'}`} />
                  ))}
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-1">4.8</span>
                  <span className="text-xs font-bold text-slate-400">/ 5.0</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  124 Verified Reviews • 98% Trust
                </span>
              </div>
            </div>

            {/* RIGHT CORNER: Circular Profile Photo with Camera */}
            <div className="relative shrink-0">
              <div className="w-18 h-18 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center relative overflow-hidden border-2 border-indigo-500/80 shadow-md">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-9 h-9 text-slate-400" />
                )}
                <div 
                  onClick={triggerFileInput} 
                  className="absolute inset-x-0 bottom-0 bg-black/50 hover:bg-black/70 h-6 flex items-center justify-center cursor-pointer transition-colors"
                  title="Upload Photo"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
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

        {/* Business & Venue Registration Card */}
        <div 
          onClick={() => setIsRegisterShopOpen(true)}
          className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/80 rounded-2xl cursor-pointer hover:border-amber-500 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs shrink-0 text-base">
                🏬
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-amber-950 dark:text-amber-200">
                    {t('prof.bizReg')}
                  </h3>
                  <span className="text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.2 rounded-full uppercase">100% Free</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-tight mt-0.5">
                  {t('prof.bizRegDesc')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          </div>
        </div>

        {/* Free Helper Registration Card (Shifted Up) */}
        <div 
          onClick={() => setIsHelperModalOpen(true)}
          className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-700/80 rounded-2xl cursor-pointer hover:border-emerald-500 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                    {t('cat.modalTitle') || "Register as Helper"}
                  </h3>
                  <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.2 rounded-full uppercase">100% Free</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium leading-tight mt-0.5">
                  {myHelperProfile 
                    ? `${myHelperProfile.name} • ${myHelperProfile.area} (Active Profile)`
                    : "Plumber, Electrician, Mechanic etc. me list karein"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
        </div>

        {/* Public / Profile Access Toggle */}
        <div 
          onClick={() => setIsPublic(!isPublic)}
          className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer"
        >
          <div className="flex-1 pr-3">
            <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-0.5">{t('prof.publicToggle') || "Service Helper Profile Mode"}</h3>
            <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300/90 leading-snug">{t('prof.publicNotice')}</p>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${isPublic ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
             <div className={`w-4 h-4 bg-white rounded-full absolute shadow-xs transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`}></div>
          </div>
        </div>

        {/* Profile Edit Form Fields */}
        <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-xs">
          
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('prof.name') || 'Your Name'}</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                placeholder="Full Name" 
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('prof.phone') || 'Phone Number'}</label>
            <div className="relative">
              <span className="text-slate-400 font-bold absolute left-3 top-1/2 -translate-y-1/2 text-xs">+91</span>
              <input 
                type="tel" 
                value={userPhone} 
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
              />
            </div>
          </div>

          {/* Email Address (Google Account) Field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('prof.emailLabel')}
              </label>
              {userEmail && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {t('prof.verifiedSynced')}
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="email" 
                value={userEmail} 
                onChange={(e) => setUserEmail(e.target.value)} 
                placeholder="your.email@gmail.com" 
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('prof.skills') || 'Work / Skills'}</label>
            <div className="relative">
              <Award className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={userSkills} 
                onChange={(e) => setUserSkills(e.target.value)} 
                placeholder="e.g. Plumber, Electrician, Cleaning" 
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('prof.exp') || 'Experience'}</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={userExp} 
                  onChange={(e) => setUserExp(e.target.value)} 
                  placeholder="e.g. 3 Years" 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('prof.address') || 'Area'}</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={userAddress} 
                  onChange={(e) => setUserAddress(e.target.value)} 
                  placeholder="e.g. Sector 14, Delhi" 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
                />
              </div>
            </div>
          </div>

          {/* Delete Profile & Account Danger Zone Button */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('prof.deleteBtn')}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Docked Save Button */}
      <div className="absolute bottom-5 inset-x-4 z-20">
        <button 
          onClick={handleSaveProfile} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95 text-xs cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isSavedNotice ? t('prof.savedSuccess') : (t('prof.save') || "Save Profile")}</span>
        </button>
      </div>

      {/* Register Shop Modal */}
      <RegisterShopModal 
        isOpen={isRegisterShopOpen}
        onClose={() => setIsRegisterShopOpen(false)}
      />

      {/* Free Helper Register Modal */}
      <FreeHelperRegisterModal 
        isOpen={isHelperModalOpen}
        onClose={() => setIsHelperModalOpen(false)}
        onSuccess={(newProf) => {
          setMyHelperProfile(newProf);
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
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isDeleting 
                  ? t('prof.deleting')
                  : t('prof.deleteTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('prof.deleteDesc')}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {t('prof.deleteCancel')}
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

                    // 1. Clear cloud data
                    if (userKey && userKey !== 'guest_user') {
                      try {
                        await supabase.from("profiles").delete().eq("uid", userKey);
                        await supabase.from("users").delete().eq("uid", userKey);
                      } catch (err) {
                        console.warn("Cloud delete error (continuing):", err);
                      }
                    }

                    // 2. Trigger full logout and storage purge
                    await logoutUser();
                    
                    // 3. Force full reload
                    window.location.href = window.location.origin;
                  } catch (err) {
                    console.error("Deletion failed:", err);
                    window.location.reload();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-70"
              >
                {isDeleting 
                  ? t('prof.deleting')
                  : t('prof.deleteConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
