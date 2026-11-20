import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  Trash2,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Car,
  Smartphone,
  Home,
  Package,
} from 'lucide-react';
import {
  UsedItemListing,
  UsedItemStatus,
  UsedItemSubCategory,
  updateUsedItemStatus,
  deleteUsedItemListing,
} from '../api';

interface AdminUsedItemsPanelProps {
  items: UsedItemListing[];
  onItemsChange: (updater: (prev: UsedItemListing[]) => UsedItemListing[]) => void;
  onRefresh: () => void;
  onBack: () => void;
  showToast: (msg: string) => void;
}

const SUBCAT_LABELS: Record<UsedItemSubCategory, string> = {
  used_vehicles: 'જૂના વાહનો (Vehicles)',
  used_mobiles_electronics: 'મોબાઈલ / ઈલેક્ટ્રોનિક્સ',
  used_furniture_home: 'ફર્નિચર / ઘરવખરી',
  used_other_items: 'અન્ય જૂની વસ્તુઓ',
};

const CONDITION_LABELS: Record<string, string> = {
  like_new: 'નવા જેવું (Like New)',
  good: 'સારી સ્થિતિ (Good)',
  used: 'વપરાયેલું (Used)',
};

function getSubCatIcon(sub: UsedItemSubCategory, className = 'w-4 h-4') {
  switch (sub) {
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

function formatPrice(val: number): string {
  try {
    return new Intl.NumberFormat('en-IN').format(Math.max(0, Math.round(val || 0)));
  } catch {
    return String(Math.round(val || 0));
  }
}

export default function AdminUsedItemsPanel({
  items,
  onItemsChange,
  onRefresh,
  onBack,
  showToast,
}: AdminUsedItemsPanelProps) {
  const [statusTab, setStatusTab] = useState<'all' | UsedItemStatus>('pending');
  const [subCatFilter, setSubCatFilter] = useState<'all' | UsedItemSubCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [zoomGallery, setZoomGallery] = useState<{
    photos: string[];
    index: number;
    title: string;
  } | null>(null);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let sold = 0;
    let rejected = 0;
    for (const it of items) {
      if (it.status === 'pending') pending++;
      else if (it.status === 'approved') approved++;
      else if (it.status === 'sold') sold++;
      else if (it.status === 'rejected') rejected++;
    }
    return { all: items.length, pending, approved, sold, rejected };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (statusTab !== 'all' && it.status !== statusTab) return false;
      if (subCatFilter !== 'all' && it.subCategory !== subCatFilter) return false;
      if (q) {
        const hay = [
          it.title,
          it.description,
          it.area,
          it.city,
          it.sellerName,
          it.phone,
          it.email,
          SUBCAT_LABELS[it.subCategory] || it.subCategory,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusTab, subCatFilter, searchQuery]);

  const handleStatusChange = async (item: UsedItemListing, nextStatus: UsedItemStatus) => {
    setBusyId(item.id);
    const note = (noteDrafts[item.id] ?? item.adminNotes ?? '').trim();
    const res = await updateUsedItemStatus(item.id, nextStatus, note, true);
    setBusyId(null);
    if (res.success && res.item) {
      onItemsChange((prev) => prev.map((x) => (x.id === item.id ? res.item! : x)));
      const label =
        nextStatus === 'approved'
          ? '✅ વસ્તુ એપ્રુવ થઈને લાઈવ થઈ ગઈ છે!'
          : nextStatus === 'rejected'
          ? '❌ વસ્તુ નામંજૂર (Rejected) કરવામાં આવી.'
          : nextStatus === 'sold'
          ? '🏷️ વસ્તુ Sold માર્ક થઈ ગઈ.'
          : '⏳ વસ્તુ Pending માં ખસેડાઈ.';
      showToast(label);
    } else {
      showToast(res.error || 'સ્ટેટસ અપડેટ કરવામાં મુશ્કેલી આવી.');
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    const ok = await deleteUsedItemListing(id, true);
    setBusyId(null);
    setConfirmDeleteId(null);
    if (ok) {
      onItemsChange((prev) => prev.filter((x) => x.id !== id));
      showToast('🗑️ વસ્તુ સફળતાપૂર્વક ડિલીટ કરવામાં આવી.');
    } else {
      showToast('વસ્તુ ડિલીટ કરવામાં મુશ્કેલી આવી.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="rounded-3xl bg-[#111827] border border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold border border-slate-700 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-orange-400" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-extrabold text-white flex items-center gap-2 truncate">
                <ShoppingBag className="w-5 h-5 text-sky-400 shrink-0" />
                <span className="truncate">જૂની વસ્તુની લે-વેચ — Admin Approval ({counts.all})</span>
              </h2>
              <p className="text-xs text-slate-400">
                યુઝર્સે મૂકેલી જૂની વસ્તુઓના ફોટા, કિંમત અને વિગત તપાસી ૧ ક્લિકમાં Approve, Reject કે Delete કરો.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Status Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'pending', label: `Pending (${counts.pending})` },
              { id: 'approved', label: `Approved Live (${counts.approved})` },
              { id: 'sold', label: `Sold (${counts.sold})` },
              { id: 'rejected', label: `Rejected (${counts.rejected})` },
              { id: 'all', label: `All (${counts.all})` },
            ] as Array<{ id: 'all' | UsedItemStatus; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 border transition-colors cursor-pointer tabular-nums ${
                statusTab === tab.id
                  ? tab.id === 'pending'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : tab.id === 'approved'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Sub-Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="વસ્તુનું નામ, વિસ્તાર, વેચનારનું નામ કે મોબાઈલ નંબર શોધો..."
              className="w-full min-h-[42px] pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={subCatFilter}
            onChange={(e) => setSubCatFilter(e.target.value as 'all' | UsedItemSubCategory)}
            className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="all">બધી સબ-કેટેગરી (All)</option>
            <option value="used_vehicles">જૂના વાહનો (Vehicles)</option>
            <option value="used_mobiles_electronics">મોબાઈલ / ઈલેક્ટ્રોનિક્સ</option>
            <option value="used_furniture_home">ફર્નિચર / ઘરવખરી</option>
            <option value="used_other_items">અન્ય જૂની વસ્તુઓ</option>
          </select>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-3xl bg-[#111827] border border-slate-800 p-10 text-center space-y-2">
          <ShoppingBag className="w-10 h-10 text-sky-400 mx-auto" />
          <p className="text-sm font-extrabold text-white">
            {statusTab === 'pending'
              ? 'હાલ કોઈ Pending જૂની વસ્તુ એપ્રુવલ માટે બાકી નથી.'
              : 'આ ફિલ્ટરમાં કોઈ જૂની વસ્તુ મળી નથી.'}
          </p>
          <p className="text-xs text-slate-400">
            જ્યારે કોઈ યુઝર નવી જૂની વસ્તુ વેચવા મૂકશે, ત્યારે તે તરત જ અહીં Pending લિસ્ટમાં દેખાશે.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
            const isBusy = busyId === item.id;
            const noteVal = noteDrafts[item.id] ?? item.adminNotes ?? '';

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-[#111827] border border-slate-800 p-4 flex flex-col justify-between gap-3.5"
              >
                <div className="space-y-3">
                  {/* Top Row: Photo Thumbnails + Title & Price */}
                  <div className="flex gap-3.5">
                    <div
                      onClick={() => {
                        if (photos.length > 0) {
                          setZoomGallery({ photos, index: 0, title: item.title });
                        }
                      }}
                      className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 relative ${
                        photos.length > 0 ? 'cursor-pointer' : ''
                      }`}
                    >
                      {photos[0] ? (
                        <img
                          src={photos[0]}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          {getSubCatIcon(item.subCategory, 'w-7 h-7')}
                        </div>
                      )}
                      {photos.length > 1 && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white tabular-nums">
                          1/{photos.length}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug line-clamp-2">
                          {item.title}
                        </h3>
                        <span className="text-base sm:text-lg font-extrabold text-emerald-400 tabular-nums shrink-0">
                          ₹ {formatPrice(item.price)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                        <span>{SUBCAT_LABELS[item.subCategory] || item.subCategory}</span>
                        <span aria-hidden="true">·</span>
                        <span>{CONDITION_LABELS[item.condition] || item.condition}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.negotiable !== false ? 'Negotiable' : 'Fixed'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {item.area}
                          {item.city ? `, ${item.city}` : ''}
                        </span>
                      </div>

                      {/* Explicit Status Line (Icon + Text) */}
                      <div className="pt-0.5">
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                            <Clock className="w-3.5 h-3.5" /> Pending Approval
                          </span>
                        )}
                        {item.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved &amp; Live
                          </span>
                        )}
                        {item.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                        {item.status === 'sold' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-300">
                            <Tag className="w-3.5 h-3.5" /> Sold
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Extra Photo Thumbnails if 2 or 3 photos */}
                  {photos.length > 1 && (
                    <div className="flex items-center gap-2">
                      {photos.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setZoomGallery({ photos, index: idx, title: item.title })}
                          className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700 hover:border-sky-400 cursor-pointer shrink-0"
                        >
                          <img
                            src={url}
                            alt={`${item.title} ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                      <span className="text-[11px] text-slate-400">
                        ફોટા પર ક્લિક કરીને ઝૂમ જુઓ
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-slate-300 bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 whitespace-pre-line leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Seller Info */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                    <span className="inline-flex items-center gap-1 font-semibold text-white">
                      <User className="w-3.5 h-3.5 text-sky-400" />
                      {item.sellerName}
                    </span>
                    {item.phone && (
                      <a
                        href={`tel:${String(item.phone).replace(/[^\d+]/g, '')}`}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline tabular-nums"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {item.phone} ({item.isPhonePublic ? 'Public' : 'Chat Only'})
                      </a>
                    )}
                    {item.email && !item.email.endsWith('@phone.locohelp.com') && (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                        {item.email}
                      </span>
                    )}
                    {item.createdAt && (
                      <span className="text-slate-500">
                        {new Date(item.createdAt).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Admin Note Input */}
                  <input
                    type="text"
                    value={noteVal}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="એડમિન નોંધ / નામંજૂર કરવાનું કારણ (વૈકલ્પિક)..."
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                  {confirmDeleteId === item.id ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-60"
                      >
                        {isBusy ? '...' : 'હા, કાયમ માટે ડિલીટ કરો'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        રદ કરો
                      </button>
                    </>
                  ) : (
                    <>
                      {item.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(item, 'approved')}
                          className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Approve (લાઈવ કરો)</span>
                        </button>
                      )}

                      {item.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(item, 'rejected')}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
                        >
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>Reject</span>
                        </button>
                      )}

                      {item.status === 'approved' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(item, 'sold')}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
                        >
                          <Tag className="w-3.5 h-3.5 shrink-0" />
                          <span>Mark Sold</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60 whitespace-nowrap"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen Photo Inspection Modal */}
      {zoomGallery && (
        <div
          onClick={() => setZoomGallery(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl flex items-center justify-between text-white mb-3 gap-3"
          >
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold truncate">{zoomGallery.title}</h3>
              <p className="text-xs text-slate-300 tabular-nums">
                Photo {zoomGallery.index + 1} / {zoomGallery.photos.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setZoomGallery(null)}
              className="min-h-[40px] min-w-[40px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl flex items-center justify-center"
          >
            {zoomGallery.photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setZoomGallery((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: (prev.index - 1 + prev.photos.length) % prev.photos.length,
                        }
                      : null
                  )
                }
                className="absolute left-2 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <img
              src={zoomGallery.photos[zoomGallery.index]}
              alt={zoomGallery.title}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[78vh] object-contain rounded-xl border border-white/15 bg-slate-950"
            />
            {zoomGallery.photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setZoomGallery((prev) =>
                    prev ? { ...prev, index: (prev.index + 1) % prev.photos.length } : null
                  )
                }
                className="absolute right-2 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
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
