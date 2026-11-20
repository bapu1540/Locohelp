import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Camera,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Tag,
  Trash2,
  Share2,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Car,
  Smartphone,
  Home,
  Package,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  UsedItemListing,
  UsedItemSubCategory,
  UsedItemCondition,
  fetchUsedItems,
  createUsedItemListing,
  updateUsedItemStatus,
  deleteUsedItemListing,
} from '../api';
import { useLanguage } from '../i18n';
import { getCurrentUser } from '../auth';
import { isGuestUser } from '../lib/authUtils';
import { isEntityOwner } from '../lib/ownership';
import { getSavedUserLocation } from '../data/panIndiaLocations';

export const USED_ITEM_SUBCATEGORY_IDS: UsedItemSubCategory[] = [
  'used_vehicles',
  'used_mobiles_electronics',
  'used_furniture_home',
  'used_other_items',
];

export function isUsedItemCategoryId(categoryId?: string): boolean {
  if (!categoryId) return false;
  return (
    categoryId === 'buy_sell_main' ||
    USED_ITEM_SUBCATEGORY_IDS.includes(categoryId as UsedItemSubCategory)
  );
}

interface UsedItemsMarketplaceSectionProps {
  initialSubCategory?: string;
  externalSearchQuery?: string;
  externalOpenSellModalTrigger?: number;
  onRequireLogin: () => void;
  onOpenChat?: (chatContext: any) => void;
  onSubCategoryChange?: (subCat: string) => void;
}

const SUBCAT_META: Record<
  UsedItemSubCategory,
  { en: string; hi: string; gu: string; shortGu: string; shortEn: string; shortHi: string }
> = {
  used_vehicles: {
    en: 'Used Vehicles (Bike, Activa, Car)',
    hi: 'पुराने वाहन (बाइक, एक्टिवा, कार)',
    gu: 'જૂના વાહનો (બાઈક, એક્ટિવા, કાર)',
    shortGu: 'જૂના વાહનો',
    shortEn: 'Vehicles',
    shortHi: 'वाहन',
  },
  used_mobiles_electronics: {
    en: 'Mobiles, TV, Fridge & Electronics',
    hi: 'मोबाइल, टीवी, फ्रिज और इलेक्ट्रॉनिक्स',
    gu: 'મોબાઈલ, ટીવી, ફ્રિજ અને ઈલેક્ટ્રોનિક્સ',
    shortGu: 'મોબાઈલ / ઈલેક્ટ્રોનિક્સ',
    shortEn: 'Electronics',
    shortHi: 'इलेक्ट्रॉनिक्स',
  },
  used_furniture_home: {
    en: 'Used Furniture & Home Items',
    hi: 'पुराना फर्नीचर और घर का सामान',
    gu: 'જૂનું ફર્નિચર અને ઘરવખરી',
    shortGu: 'ફર્નિચર / ઘરવખરી',
    shortEn: 'Furniture',
    shortHi: 'फर्नीचर',
  },
  used_other_items: {
    en: 'Other Used Items (Books, Tools)',
    hi: 'अन्य पुरानी चीज़ें (किताबें, औज़ार)',
    gu: 'અન્ય જૂની વસ્તુઓ (પુસ્તકો, સાધનો)',
    shortGu: 'અન્ય વસ્તુઓ',
    shortEn: 'Other Items',
    shortHi: 'अन्य चीज़ें',
  },
};

function getSubCatIcon(subCat: UsedItemSubCategory, className = 'w-4 h-4') {
  switch (subCat) {
    case 'used_vehicles':
      return <Car className={className} />;
    case 'used_mobiles_electronics':
      return <Smartphone className={className} />;
    case 'used_furniture_home':
      return <Home className={className} />;
    default:
      return <Package className={className} />;
  }
}

async function compressImageFileToDataUrl(file: File, maxDimension = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function formatRupees(price: number): string {
  try {
    return new Intl.NumberFormat('en-IN').format(Math.max(0, Math.round(price || 0)));
  } catch {
    return String(Math.round(price || 0));
  }
}

function formatShortDate(iso?: string, language: string = 'GU'): string {
  if (!iso) return '';
  const lang = String(language || 'GU').toUpperCase();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHrs / 24);
  if (diffHrs < 1) {
    return lang === 'GU' ? 'હમણાં જ' : lang === 'HI' ? 'अभी' : 'Just now';
  }
  if (diffHrs < 24) {
    return lang === 'GU'
      ? `${diffHrs} કલાક પહેલા`
      : lang === 'HI'
      ? `${diffHrs} घंटे पहले`
      : `${diffHrs}h ago`;
  }
  if (diffDays < 7) {
    return lang === 'GU'
      ? `${diffDays} દિવસ પહેલા`
      : lang === 'HI'
      ? `${diffDays} दिन पहले`
      : `${diffDays}d ago`;
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function UsedItemsMarketplaceSection({
  initialSubCategory,
  externalSearchQuery = '',
  externalOpenSellModalTrigger = 0,
  onRequireLogin,
  onOpenChat,
  onSubCategoryChange,
}: UsedItemsMarketplaceSectionProps) {
  const { language, tr } = useLanguage();
  const langUpper = String(language || 'GU').toUpperCase();

  const normalizedInitialSub: UsedItemSubCategory | 'all' =
    initialSubCategory && USED_ITEM_SUBCATEGORY_IDS.includes(initialSubCategory as UsedItemSubCategory)
      ? (initialSubCategory as UsedItemSubCategory)
      : 'all';

  const [viewMode, setViewMode] = useState<'market' | 'mine'>('market');
  const [selectedSubCat, setSelectedSubCat] = useState<UsedItemSubCategory | 'all'>(normalizedInitialSub);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [items, setItems] = useState<UsedItemListing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  // Sell Modal State
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [formSubCat, setFormSubCat] = useState<UsedItemSubCategory>(
    normalizedInitialSub === 'all' ? 'used_vehicles' : normalizedInitialSub
  );
  const [formTitle, setFormTitle] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formNegotiable, setFormNegotiable] = useState<boolean>(true);
  const [formCondition, setFormCondition] = useState<UsedItemCondition>('good');
  const [formArea, setFormArea] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSellerName, setFormSellerName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formIsPhonePublic, setFormIsPhonePublic] = useState<boolean>(false);
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Photo Lightbox Modal State
  const [galleryModal, setGalleryModal] = useState<{
    photos: string[];
    index: number;
    title: string;
    price: number;
    area: string;
  } | null>(null);

  // Sync when parent category changes
  useEffect(() => {
    if (
      initialSubCategory &&
      USED_ITEM_SUBCATEGORY_IDS.includes(initialSubCategory as UsedItemSubCategory)
    ) {
      setSelectedSubCat(initialSubCategory as UsedItemSubCategory);
      setFormSubCat(initialSubCategory as UsedItemSubCategory);
    } else if (initialSubCategory === 'buy_sell_main') {
      setSelectedSubCat('all');
    }
  }, [initialSubCategory]);

  // Open Sell Modal when header trigger increments
  const lastTriggerRef = useRef<number>(externalOpenSellModalTrigger);
  useEffect(() => {
    if (externalOpenSellModalTrigger > lastTriggerRef.current) {
      lastTriggerRef.current = externalOpenSellModalTrigger;
      openSellModal();
    }
  }, [externalOpenSellModalTrigger]);

  // Handle hardware back button for modals inside this section
  useEffect(() => {
    const onCloseActiveModal = (e: Event) => {
      if (galleryModal) {
        e.preventDefault();
        setGalleryModal(null);
        return;
      }
      if (isSellModalOpen) {
        e.preventDefault();
        setIsSellModalOpen(false);
        return;
      }
    };
    window.addEventListener('locohelp_close_active_modal', onCloseActiveModal);
    return () => window.removeEventListener('locohelp_close_active_modal', onCloseActiveModal);
  }, [galleryModal, isSellModalOpen]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const combinedSearch = (localSearch || externalSearchQuery || '').trim();
      const data = await fetchUsedItems({
        status: viewMode === 'mine' ? 'all' : 'approved',
        subCategory: selectedSubCat,
        search: combinedSearch || undefined,
        mine: viewMode === 'mine',
      });
      setItems(data);
    } catch {
      setErrorMsg(
        tr(
          'Could not load listings. Please try again.',
          'लिस्टिंग लोड नहीं हो सकी। कृपया दोबारा प्रयास करें।',
          'યાદી લોડ થઈ શકી નથી. કૃપા કરીને ફરી પ્રયાસ કરો.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedSubCat, localSearch, externalSearchQuery, tr]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const openSellModal = () => {
    if (isGuestUser()) {
      onRequireLogin();
      return;
    }
    const user = getCurrentUser();
    const savedLoc = getSavedUserLocation();
    setFormSubCat(selectedSubCat === 'all' ? 'used_vehicles' : selectedSubCat);
    setFormSellerName((prev) => prev || user?.displayName || '');
    setFormPhone((prev) => prev || user?.phone || '');
    if (savedLoc) {
      const locArea = (savedLoc.taluka || savedLoc.area || '').trim();
      const locCity = (savedLoc.district || '').trim();
      if (locArea && locArea.toLowerCase() !== 'all') {
        setFormArea((prev) => prev || locArea);
      }
      if (locCity && locCity.toLowerCase() !== 'all') {
        setFormCity((prev) => prev || locCity);
      }
    }
    setFormError(null);
    setIsSellModalOpen(true);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remainingSlots = Math.max(0, 3 - formPhotos.length);
    if (remainingSlots === 0) {
      setFormError(
        tr(
          'Maximum 3 photos allowed per item.',
          'अधिकतम 3 फोटो ही अपलोड किए जा सकते हैं।',
          'વધુમાં વધુ ૩ ફોટા જ અપલોડ કરી શકાય છે.'
        )
      );
      return;
    }

    setPhotoUploading(true);
    setFormError(null);
    try {
      const selected = Array.from(files).slice(0, remainingSlots);
      const compressedList: string[] = [];
      for (const file of selected) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressImageFileToDataUrl(file);
        if (dataUrl) compressedList.push(dataUrl);
      }
      if (compressedList.length > 0) {
        setFormPhotos((prev) => [...prev, ...compressedList].slice(0, 3));
      }
    } catch {
      setFormError(
        tr(
          'Failed to process photo. Please choose a valid image.',
          'फोटो प्रोसेस करने में समस्या आई। कृपया सही इमेज चुनें।',
          'ફોટો પ્રોસેસ કરવામાં મુશ્કેલી આવી. કૃપા કરીને યોગ્ય ફોટો પસંદ કરો.'
        )
      );
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestUser()) {
      setIsSellModalOpen(false);
      onRequireLogin();
      return;
    }

    const cleanTitle = formTitle.trim();
    const numericPrice = Number(formPrice);
    const cleanArea = formArea.trim();

    if (cleanTitle.length < 2) {
      setFormError(
        tr(
          'Please enter the item name.',
          'कृपया वस्तु का नाम लिखें।',
          'કૃપા કરીને વસ્તુનું નામ લખો.'
        )
      );
      return;
    }
    if (!formPrice.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setFormError(
        tr(
          'Please enter a valid price in ₹.',
          'कृपया सही कीमत (₹) दर्ज करें।',
          'કૃપા કરીને યોગ્ય કિંમત (₹) દાખલ કરો.'
        )
      );
      return;
    }
    if (!cleanArea) {
      setFormError(
        tr(
          'Please enter your area or village/town name.',
          'कृपया अपना क्षेत्र / गांव / शहर लिखें।',
          'કૃપા કરીને તમારો વિસ્તાર / ગામ / શહેર લખો.'
        )
      );
      return;
    }
    if (formPhotos.length === 0) {
      setFormError(
        tr(
          'Please add at least 1 clear photo of the item.',
          'कृपया वस्तु का कम से कम 1 साफ फोटो जोड़ें।',
          'કૃપા કરીને વસ્તુનો ઓછામાં ઓછો ૧ સ્પષ્ટ ફોટો ઉમેરો.'
        )
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const res = await createUsedItemListing({
      subCategory: formSubCat,
      title: cleanTitle,
      price: numericPrice,
      negotiable: formNegotiable,
      condition: formCondition,
      description: formDescription.trim(),
      area: cleanArea,
      city: formCity.trim() || undefined,
      photos: formPhotos,
      sellerName: formSellerName.trim() || undefined,
      phone: formPhone.trim() || undefined,
      isPhonePublic: formIsPhonePublic,
    });
    setSubmitting(false);

    if (!res.success) {
      setFormError(
        res.error ||
          tr(
            'Could not submit listing. Please try again.',
            'विज्ञापन सबमिट नहीं हो सका। कृपया दोबारा प्रयास करें।',
            'જાહેરાત સબમિટ થઈ શકી નથી. કૃપા કરીને ફરી પ્રયાસ કરો.'
          )
      );
      return;
    }

    // Reset form & switch to My Listings so seller sees Pending Approval status immediately
    setFormTitle('');
    setFormPrice('');
    setFormDescription('');
    setFormPhotos([]);
    setIsSellModalOpen(false);
    setNoticeMsg(
      res.message ||
        tr(
          'Listing submitted! It will go live immediately after Admin approval.',
          'आपका विज्ञापन सबमिट हो गया है! एडमिन अप्रूवल के बाद तुरंत लाइव दिखेगा।',
          'તમારી જાહેરાત સબમિટ થઈ ગઈ છે! એડમિન એપ્રુવલ પછી તરત જ લાઈવ દેખાશે.'
        )
    );
    setViewMode('mine');
    setSelectedSubCat('all');
    // Reload after switching state
    setTimeout(() => {
      fetchUsedItems({ status: 'all', mine: true }).then((fresh) => setItems(fresh));
    }, 150);
  };

  const handleChatWithSeller = (item: UsedItemListing) => {
    if (isGuestUser()) {
      onRequireLogin();
      return;
    }
    if (!onOpenChat) return;
    const currentUser = getCurrentUser();
    const myUid = currentUser?.uid || '';
    const sellerTargetId = item.userId || item.id;
    const sellerEmail =
      item.email ||
      (item.phone ? `${String(item.phone).replace(/\D/g, '').slice(-10)}@phone.locohelp.com` : '');
    onOpenChat({
      id: `used_item_chat_${item.id}`,
      authorId: sellerTargetId,
      authorEmail: sellerEmail,
      authorPhone: item.isPhonePublic ? item.phone || '' : '',
      phone: item.isPhonePublic ? item.phone || '' : '',
      authorName: item.sellerName || 'Seller',
      receiverId: sellerTargetId,
      helperId: myUid,
      isDirectProviderChat: true,
      isViewerPostOwner: false,
      description: `${item.title} — ₹${formatRupees(item.price)} (${item.area})`,
      tags: [SUBCAT_META[item.subCategory]?.shortEn || 'Used Item'],
      distance: 1,
      status: 'active',
      createdAt: item.createdAt || new Date().toISOString(),
    });
  };

  const handleToggleSold = async (item: UsedItemListing) => {
    setBusyItemId(item.id);
    const nextStatus = item.status === 'sold' ? 'approved' : 'sold';
    const res = await updateUsedItemStatus(item.id, nextStatus);
    setBusyItemId(null);
    if (res.success && res.item) {
      setItems((prev) => prev.map((it) => (it.id === item.id ? res.item! : it)));
      setNoticeMsg(
        nextStatus === 'sold'
          ? tr('Marked as Sold.', 'बिक गया (Sold) मार्क कर दिया गया।', 'વસ્તુ વેચાઈ ગઈ (Sold) તરીકે માર્ક થઈ ગઈ છે.')
          : tr('Marked Available again.', 'फिर से उपलब्ध कर दिया गया।', 'વસ્તુ ફરીથી ઉપલબ્ધ થઈ ગઈ છે.')
      );
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setBusyItemId(id);
    const ok = await deleteUsedItemListing(id);
    setBusyItemId(null);
    setConfirmDeleteId(null);
    if (ok) {
      setItems((prev) => prev.filter((it) => it.id !== id));
      setNoticeMsg(
        tr('Listing deleted.', 'विज्ञापन हटा दिया गया।', 'જાહેરાત સફળતાપૂર્વક ડિલીટ થઈ ગઈ છે.')
      );
    } else {
      setErrorMsg(
        tr('Could not delete listing.', 'विज्ञापन हटाने में समस्या आई।', 'જાહેરાત ડિલીટ થઈ શકી નથી.')
      );
    }
  };

  const handleShareItem = async (item: UsedItemListing) => {
    const shareText = `${item.title} — ₹${formatRupees(item.price)}\n${item.area}${item.city ? `, ${item.city}` : ''}\nLocoHelp (${window.location.origin})`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: shareText });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((prev) => (prev === item.id ? null : prev)), 2000);
    } catch {}
  };

  const getConditionLabel = (cond: UsedItemCondition) => {
    if (cond === 'like_new') return tr('Like New', 'लगभग नया', 'નવા જેવું');
    if (cond === 'used') return tr('Used', 'इस्तेमाल किया हुआ', 'વપરાયેલું');
    return tr('Good Condition', 'अच्छी हालत', 'સારી સ્થિતિ');
  };

  const getSubCatShortLabel = (sub: UsedItemSubCategory) => {
    const meta = SUBCAT_META[sub];
    if (!meta) return sub;
    return langUpper === 'GU' ? meta.shortGu : langUpper === 'HI' ? meta.shortHi : meta.shortEn;
  };

  const currentUser = getCurrentUser();
  const isLoggedIn = !isGuestUser() && Boolean(currentUser?.uid);

  const visibleItems = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      {/* Compact Header Toolbar: Market / My Listings + Primary Sell CTA */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented Mode Control */}
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setViewMode('market')}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                viewMode === 'market'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tr('Marketplace', 'बाज़ार', 'બધી વસ્તુઓ')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  onRequireLogin();
                  return;
                }
                setViewMode('mine');
              }}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                viewMode === 'mine'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tr('My Listings', 'मेरे विज्ञापन', 'મારી જાહેરાતો')}
            </button>
          </div>

          {/* Primary Sell CTA */}
          <button
            type="button"
            onClick={openSellModal}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 whitespace-nowrap shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>
              {tr('Sell Used Item', 'पुरानी चीज़ बेचें', 'જૂની વસ્તુ વેચવા મૂકો')}
            </span>
          </button>
        </div>

        {/* Sub-category Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            onClick={() => {
              setSelectedSubCat('all');
              onSubCategoryChange?.('buy_sell_main');
            }}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedSubCat === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>{tr('All', 'सभी', 'બધી')}</span>
          </button>

          {USED_ITEM_SUBCATEGORY_IDS.map((subId) => {
            const active = selectedSubCat === subId;
            return (
              <button
                key={subId}
                type="button"
                onClick={() => {
                  setSelectedSubCat(subId);
                  onSubCategoryChange?.(subId);
                }}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {getSubCatIcon(subId, 'w-3.5 h-3.5 shrink-0')}
                <span>{getSubCatShortLabel(subId)}</span>
              </button>
            );
          })}
        </div>

        {/* Search + Refresh Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={tr(
                'Search bike, Activa, mobile, sofa, fridge, area...',
                'बाइक, एक्टिवा, मोबाइल, सोफा, फ्रिज, इलाका खोजें...',
                'બાઈક, એક્ટિવા, મોબાઈલ, સોફા, ફ્રિજ, વિસ્તાર શોધો...'
              )}
              className="w-full min-h-[44px] pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={loadListings}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
            title={tr('Refresh', 'रिफ्रेश', 'રિફ્રેશ')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Clean Unboxed Trust Note */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {tr(
              'Every listing is verified by Admin before going live.',
              'हर विज्ञापन एडमिन द्वारा जांच और अप्रूवल के बाद ही लाइव दिखता है।',
              'દરેક જાહેરાત એડમિન તપાસ અને મંજૂરી પછી જ લાઈવ દેખાય છે.'
            )}
          </span>
        </div>
      </div>

      {/* Inline Feedback Banners */}
      {noticeMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{noticeMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMsg(null)}
            className="p-1 text-emerald-700 dark:text-emerald-300 cursor-pointer shrink-0"
            aria-label="Close notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 cursor-pointer shrink-0"
            aria-label="Close error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-700" />
              <div className="p-4 space-y-2.5">
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            {viewMode === 'mine'
              ? tr('No listings posted by you yet', 'आपने अभी कोई विज्ञापन नहीं डाला है', 'તમે હજુ સુધી કોઈ વસ્તુ વેચવા મૂકી નથી')
              : tr('No used items available right now', 'अभी इस श्रेणी में कोई पुरानी वस्तु उपलब्ध नहीं है', 'હાલ આ કેટેગરીમાં કોઈ જૂની વસ્તુ ઉપલબ્ધ નથી')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {viewMode === 'mine'
              ? tr(
                  'Sell your old bike, mobile, furniture or household items locally for free.',
                  'अपनी पुरानी बाइक, मोबाइल, फर्नीचर या घर का सामान लोकल में फ्री बेचें।',
                  'તમારી જૂની બાઈક, મોબાઈલ, ફર્નિચર કે ઘરવખરી મફતમાં લોકલમાં વેચવા મૂકો.'
                )
              : tr(
                  'Be the first to list a used item in your area! All listings go live after quick Admin approval.',
                  'अपने इलाके में पहली पुरानी चीज़ बेचने के लिए डालें! एडमिन अप्रूवल के बाद तुरंत लाइव दिखेगी।',
                  'તમારા વિસ્તારમાં સૌથી પહેલા જૂની વસ્તુ વેચવા મૂકો! એડમિન એપ્રુવલ પછી તરત લાઈવ દેખાશે.'
                )}
          </p>
          <button
            type="button"
            onClick={openSellModal}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{tr('Sell Used Item', 'पुरानी चीज़ बेचें', 'જૂની વસ્તુ વેચવા મૂકો')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((item) => {
            const isOwner = isEntityOwner(
              { userId: item.userId, email: item.email, phone: item.phone },
              currentUser
            );
            const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
            const primaryPhoto = photos[0] || '';
            const isExpanded = Boolean(expandedDescIds[item.id]);
            const isBusy = busyItemId === item.id;
            const canCallDirectly = Boolean(item.isPhonePublic && item.phone && !String(item.phone).includes('*'));

            return (
              <article
                key={item.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div>
                  {/* Photo Area */}
                  <div
                    onClick={() => {
                      if (photos.length > 0) {
                        setGalleryModal({
                          photos,
                          index: 0,
                          title: item.title,
                          price: item.price,
                          area: item.area,
                        });
                      }
                    }}
                    className={`relative aspect-[4/3] bg-slate-100 dark:bg-slate-900 overflow-hidden ${
                      photos.length > 0 ? 'cursor-pointer group' : ''
                    }`}
                  >
                    {primaryPhoto ? (
                      <img
                        src={primaryPhoto}
                        alt={item.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                        {getSubCatIcon(item.subCategory, 'w-10 h-10')}
                        <span className="text-xs font-semibold">
                          {getSubCatShortLabel(item.subCategory)}
                        </span>
                      </div>
                    )}

                    {/* Multi-photo counter */}
                    {photos.length > 1 && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/75 text-white text-[11px] font-bold tabular-nums">
                        1 / {photos.length}
                      </div>
                    )}

                    {/* Sold Overlay */}
                    {item.status === 'sold' && (
                      <div className="absolute inset-0 bg-slate-950/55 flex items-center justify-center">
                        <span className="px-4 py-1.5 rounded-lg bg-slate-900/90 border border-white/25 text-white text-sm font-extrabold tracking-wide">
                          {tr('SOLD', 'बिक गया', 'વેચાઈ ગયું')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Details */}
                  <div className="p-4 space-y-2">
                    {/* Price Row (Tabular Numerals) */}
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                        ₹ {formatRupees(item.price)}
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.negotiable !== false
                          ? tr('Negotiable', 'मोलभाव संभव', 'ભાવમાં ફેરફાર શક્ય')
                          : tr('Fixed Price', 'फिक्स कीमत', 'ફિક્સ ભાવ')}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {item.title}
                    </h3>

                    {/* Clean Unboxed Metadata Line */}
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>{getSubCatShortLabel(item.subCategory)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{getConditionLabel(item.condition)}</span>
                      {item.createdAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatShortDate(item.createdAt, language)}</span>
                        </>
                      )}
                    </div>

                    {/* Location & Seller */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {item.area}
                        {item.city && item.city.toLowerCase() !== item.area.toLowerCase()
                          ? `, ${item.city}`
                          : ''}
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="truncate text-slate-500 dark:text-slate-400">
                        {item.sellerName}
                      </span>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <div className="pt-1">
                        <p
                          className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line ${
                            isExpanded ? '' : 'line-clamp-2'
                          }`}
                        >
                          {item.description}
                        </p>
                        {item.description.length > 90 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDescIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                            }
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 cursor-pointer"
                          >
                            {isExpanded
                              ? tr('Show less', 'कम दिखाएं', 'ઓછું બતાવો')
                              : tr('Read more', 'पूरा पढ़ें', 'વધુ વાંચો')}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Status Line for Owner / My Listings View (Text + Icon, never color-only) */}
                    {(viewMode === 'mine' || isOwner) && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/70 space-y-1">
                        {item.status === 'pending' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {tr(
                                'Pending Admin Approval',
                                'एडमिन अप्रूवल बाकी है',
                                'એડમિન એપ્રુવલ બાકી છે'
                              )}
                            </span>
                          </div>
                        )}
                        {item.status === 'approved' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {tr('Approved & Live', 'अप्रूव्ड और लाइव', 'એપ્રુવ અને લાઈવ')}
                            </span>
                          </div>
                        )}
                        {item.status === 'rejected' && (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{tr('Rejected by Admin', 'एडमिन द्वारा अस्वीकृत', 'એડમિન દ્વારા નામંજૂર')}</span>
                            </div>
                            {item.adminNotes && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-300">
                                {item.adminNotes}
                              </p>
                            )}
                          </div>
                        )}
                        {item.status === 'sold' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                            <Tag className="w-3.5 h-3.5 shrink-0" />
                            <span>{tr('Marked as Sold', 'बिक गया (Sold)', 'વેચાઈ ગયેલ (Sold)')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/70">
                  {isOwner ? (
                    confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDeleteItem(item.id)}
                          className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-60"
                        >
                          {isBusy ? '...' : tr('Confirm Delete', 'हटाने की पुष्टि करें', 'હા, ડિલીટ કરો')}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                        >
                          {tr('Cancel', 'रद्द', 'રદ કરો')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {(item.status === 'approved' || (item.status === 'sold' && item.wasApproved)) && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleSold(item)}
                            className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
                          >
                            <Tag className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {item.status === 'sold'
                                ? tr('Mark Available', 'उपलब्ध करें', 'ફરી ઉપલબ્ધ કરો')
                                : tr('Mark Sold', 'बिक गया मार्क करें', 'વેચાઈ ગયું')}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{tr('Delete', 'हटाएं', 'ડિલીટ')}</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleChatWithSeller(item)}
                        className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <MessageCircle className="w-4 h-4 shrink-0" />
                        <span>{tr('Chat', 'चैट करें', 'ચેટ કરો')}</span>
                      </button>

                      {canCallDirectly && (
                        <a
                          href={`tel:${String(item.phone).replace(/[^\d+]/g, '')}`}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>{tr('Call', 'कॉल', 'કોલ')}</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleShareItem(item)}
                        className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
                        title={tr('Share', 'शेयर करें', 'શેર કરો')}
                      >
                        {copiedId === item.id ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ================================================================ */}
      {/* SELL USED ITEM MODAL                                             */}
      {/* ================================================================ */}
      {isSellModalOpen && (
        <div
          onClick={() => !submitting && setIsSellModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {tr('Sell a Used Item', 'पुरानी वस्तु बेचने के लिए डालें', 'જૂની વસ્તુ વેચવા મૂકો')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tr(
                    'Published live after Admin verification',
                    'एडमिन जांच और अप्रूवल के बाद लाइव दिखेगी',
                    'એડમિન તપાસ અને એપ્રુવલ પછી લાઈવ દેખાશે'
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsSellModalOpen(false)}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitListing} className="overflow-y-auto p-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Sub-category selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tr('Category', 'श्रेणी चुनें', 'કેટેગરી પસંદ કરો')} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {USED_ITEM_SUBCATEGORY_IDS.map((subId) => {
                    const active = formSubCat === subId;
                    return (
                      <button
                        key={subId}
                        type="button"
                        onClick={() => setFormSubCat(subId)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {getSubCatIcon(subId, 'w-4 h-4 shrink-0')}
                        <span className="truncate">{getSubCatShortLabel(subId)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photos Upload (1 to 3) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tr('Item Photos (1 to 3)', 'वस्तु के फोटो (1 से 3)', 'વસ્તુના ફોટા (૧ થી ૩)')} *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {formPhotos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                    >
                      <img
                        src={photo}
                        alt={`Item photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-slate-950/75 text-white flex items-center justify-center cursor-pointer"
                        aria-label="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {formPhotos.length < 3 && (
                    <button
                      type="button"
                      disabled={photoUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-800/60 flex flex-col items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      <span className="text-[11px] font-bold">
                        {photoUploading
                          ? '...'
                          : tr('Add Photo', 'फोटो जोड़ें', 'ફોટો ઉમેરો')}
                      </span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tr('Item Name', 'वस्तु का नाम', 'વસ્તુનું નામ')} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={tr(
                    'e.g. Honda Activa 5G (2019), Wooden Sofa Set',
                    'जैसे: Honda Activa 5G (2019), लकड़ी का सोफा सेट',
                    'દા.ત. Honda Activa 5G (2019), લાકડાનો સોફા સેટ'
                  )}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Price + Negotiable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {tr('Price (₹)', 'कीमत (₹)', 'કિંમત (₹)')} *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={50000000}
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <label className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNegotiable}
                    onChange={(e) => setFormNegotiable(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {tr('Price Negotiable', 'मोलभाव संभव है', 'ભાવમાં ફેરફાર શક્ય છે')}
                  </span>
                </label>
              </div>

              {/* Condition */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tr('Condition', 'वस्तु की हालत', 'વસ્તુની સ્થિતિ')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['like_new', 'good', 'used'] as UsedItemCondition[]).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setFormCondition(cond)}
                      className={`min-h-[42px] px-2.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        formCondition === cond
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {getConditionLabel(cond)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Area & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {tr('Area / Village', 'इलाका / गांव', 'વિસ્તાર / ગામ')} *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    placeholder={tr('e.g. Station Road', 'जैसे: स्टेशन रोड', 'દા.ત. સ્ટેશન રોડ')}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {tr('City / District', 'शहर / जिला', 'શહેર / જિલ્લો')}
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder={tr('e.g. Ahmedabad', 'जैसे: अहमदाबाद', 'દા.ત. અમદાવાદ')}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tr('Details (Model, Year, Bill, etc.)', 'विवरण (मॉडल, साल, बिल आदि)', 'વધુ વિગત (મોડેલ, વર્ષ, બિલ વગેરે)')}
                </label>
                <textarea
                  rows={3}
                  maxLength={1500}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={tr(
                    'Mention age, condition, accessories or any important details...',
                    'कितना पुराना है, हालत कैसी है, बिल/बॉक्स है या नहीं लिखें...',
                    'કેટલું જૂનું છે, સ્થિતિ કેવી છે, બિલ/ડોક્યુમેન્ટ ઉપલબ્ધ છે કે નહીં તે લખો...'
                  )}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Seller Contact & Privacy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {tr('Your Name', 'आपका नाम', 'તમારું નામ')}
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formSellerName}
                    onChange={(e) => setFormSellerName(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {tr('Mobile Number', 'मोबाइल नंबर', 'મોબાઈલ નંબર')}
                  </label>
                  <input
                    type="tel"
                    maxLength={15}
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsPhonePublic}
                  onChange={(e) => setFormIsPhonePublic(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-blue-600 shrink-0"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                  <strong className="block text-slate-900 dark:text-white">
                    {tr(
                      'Show Call button publicly on this listing',
                      'इस विज्ञापन पर कॉल बटन पब्लिक दिखाएं',
                      'આ જાહેરાત પર કોલ બટન પબ્લિક બતાવો'
                    )}
                  </strong>
                  {tr(
                    'If unchecked, buyers can contact you safely via in-app Chat only.',
                    'अगर बंद रखेंगे, तो खरीदार केवल ऐप की सुरक्षित चैट से संपर्क कर सकेंगे।',
                    'જો બંધ રાખશો, તો ખરીદનાર ફક્ત એપની સુરક્ષિત ચેટ દ્વારા જ સંપર્ક કરી શકશે.'
                  )}
                </span>
              </label>

              {/* Submit Action */}
              <div className="pt-1 flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsSellModalOpen(false)}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold cursor-pointer"
                >
                  {tr('Cancel', 'रद्द करें', 'રદ કરો')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || photoUploading}
                  className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold cursor-pointer disabled:opacity-60"
                >
                  {submitting
                    ? tr('Submitting...', 'सबमिट हो रहा है...', 'સબમિટ થઈ રહ્યું છે...')
                    : tr(
                        'Submit for Admin Approval',
                        'एडमिन अप्रूवल के लिए भेजें',
                        'એડમિન એપ્રુવલ માટે મોકલો'
                      )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* FULL-SCREEN PHOTO GALLERY ZOOM MODAL                             */}
      {/* ================================================================ */}
      {galleryModal && (
        <div
          onClick={() => setGalleryModal(null)}
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl flex items-center justify-between text-white mb-3 gap-3"
          >
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold truncate">{galleryModal.title}</h3>
              <p className="text-xs text-slate-300 tabular-nums">
                ₹ {formatRupees(galleryModal.price)} · {galleryModal.area}
                {galleryModal.photos.length > 1
                  ? ` · ${galleryModal.index + 1}/${galleryModal.photos.length}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGalleryModal(null)}
              className="min-h-[40px] min-w-[40px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Close gallery"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl flex items-center justify-center"
          >
            {galleryModal.photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setGalleryModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: (prev.index - 1 + prev.photos.length) % prev.photos.length,
                        }
                      : null
                  )
                }
                className="absolute left-2 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={galleryModal.photos[galleryModal.index]}
              alt={galleryModal.title}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[76vh] object-contain rounded-xl border border-white/15 bg-slate-950"
            />

            {galleryModal.photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setGalleryModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: (prev.index + 1) % prev.photos.length,
                        }
                      : null
                  )
                }
                className="absolute right-2 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
