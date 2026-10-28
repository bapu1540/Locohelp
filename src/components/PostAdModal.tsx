import React, { useState } from 'react';
import { X, Sparkles, Store, Image as ImageIcon, Tag, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n';
import { AdBannerItem } from './AdBannerSection';
import { validateUploadedFile, sanitizeText, checkSystemSecurityBlock } from '../lib/security';
import { compressImageToWebP } from '../lib/imageCompression';

interface PostAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdCreated?: (newAd: AdBannerItem) => void;
}

const PHOTO_PRESETS = [
  { label: '📱 Electronics & Gadgets', url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80' },
  { label: '🥬 Grocery & Mart', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80' },
  { label: '🚗 Auto Workshop & Spares', url: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=800&q=80' },
  { label: '👗 Fashion & Boutique', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80' },
  { label: '☕ Cafe & Bakery', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80' },
  { label: '💊 Pharmacy & Health', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80' },
  { label: '🛋️ Furniture & Home Decor', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80' },
  { label: '🛠️ Hardware & Tools', url: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=800&q=80' },
];

const EMOJI_OPTIONS = ['🏪', '📱', '🥬', '🚗', '👗', '☕', '💊', '🛠️', '✂️', '🛍️', '💎', '🍰'];

export default function PostAdModal({ isOpen, onClose, onAdCreated }: PostAdModalProps) {
  const { language, tr } = useLanguage();
  const [businessName, setBusinessName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState(() => {
    try {
      const saved = localStorage.getItem('locohelp_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.email) return parsed.email;
      }
      return localStorage.getItem('locohelp_last_logged_in_email') || '';
    } catch {
      return '';
    }
  });
  const [logo, setLogo] = useState('🏪');
  const [category, setCategory] = useState('Retail & Services');
  const [offerBadge, setOfferBadge] = useState('🔥 Special Offer • 20% OFF');
  const [offerTitle, setOfferTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [adPhotos, setAdPhotos] = useState<string[]>([]);
  const [area, setArea] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAdPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    setUploadError(null);
    const newPhotos: string[] = [];
    for (const file of files) {
      const check = await validateUploadedFile(file, { allowPdf: false });
      if (!check.valid) {
        setUploadError(check.error || tr('Only safe JPEG, PNG, or WebP images up to 2MB are allowed.', 'केवल 2MB तक की सुरक्षित JPEG, PNG या WebP इमेज ही मान्य हैं।', 'ફક્ત 2MB સુધીની સુરક્ષિત JPEG, PNG અથવા WebP ઈમેજ જ માન્ય છે.'));
        e.target.value = '';
        return;
      }
      try {
        const compressed = await compressImageToWebP(file, { maxWidth: 1200, maxHeight: 675, quality: 0.75 });
        newPhotos.push(compressed);
      } catch {
        const fallbackUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newPhotos.push(fallbackUrl);
      }
    }

    const updated = [...adPhotos, ...newPhotos];
    setAdPhotos(updated);
    if (updated[0]) setPhotoUrl(updated[0]);
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const updated = adPhotos.filter((_, i) => i !== index);
    setAdPhotos(updated);
    setPhotoUrl(updated[0] || '');
  };

  const handleAddUrlPhoto = () => {
    if (!photoUrl.trim()) return;
    if (adPhotos.includes(photoUrl.trim())) return;
    const updated = [...adPhotos, photoUrl.trim()];
    setAdPhotos(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !offerTitle.trim() || !description.trim()) return;
    if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
      setUploadError(tr('Valid Email ID is mandatory for Ad Banner verification.', 'विज्ञापन सत्यापन के लिए मान्य ईमेल आईडी अनिवार्य है।', 'જાહેરાત ચકાસણી માટે માન્ય ઈમેલ આઈડી ફરજિયાત છે.'));
      return;
    }

    const secBlock = checkSystemSecurityBlock(businessName, offerBadge, offerTitle, description, area);
    if (secBlock.blocked) {
      setUploadError(secBlock.getMessage(language));
      return;
    }

    setUploadError(null);
    setIsSubmitting(true);

    const finalPhotos = adPhotos.length > 0 ? adPhotos : (photoUrl.trim() ? [photoUrl.trim()] : []);

    const newAd: any = {
      id: 'ad_' + Date.now(),
      businessName: businessName.trim(),
      ownerEmail: ownerEmail.trim().toLowerCase(),
      email: ownerEmail.trim().toLowerCase(),
      logo,
      category,
      offerBadge: offerBadge.trim() || '🔥 Special Deal',
      offerTitle: offerTitle.trim(),
      description: description.trim(),
      photoUrl: finalPhotos[0] || '',
      photos: finalPhotos,
      distance: 0.4,
      area: area.trim() || 'Local Area',
      rating: 5.0,
      reviewCount: 1,
      isVerified: false,
      status: 'pending',
      isActive: false,
      destinationUrl: destinationUrl.trim() || '',
      initialMessage: `Namaste! ${businessName.trim()} me aapka swagat hai. Ad offer "${offerTitle.trim()}" ke baare me aap kya jaanna chahte hain?`,
      createdAt: new Date().toISOString()
    };

    try {
      const { createAdOnServer } = await import('../api');
      await createAdOnServer(newAd);
    } catch (err) {}

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      if (onAdCreated) onAdCreated(newAd);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    }, 400);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[52px] z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      style={{ position: 'fixed', top: '52px', left: 0, right: 0, bottom: 0, zIndex: 5000 }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-amber-200 dark:border-slate-800 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {tr('Post Sponsored Local Ad', 'स्पॉन्सर्ड लोकल विज्ञापन पोस्ट करें', 'સ્પોન્સર્ડ લોકલ જાહેરાત પોસ્ટ કરો')}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {tr('Show your business & offers to nearby customers with in-built chat', 'इन-बिल्ट चैट के साथ आसपास के ग्राहकों को अपना व्यवसाय और ऑफ़र दिखाएं', 'ઇન-બિલ્ટ ચેટ સાથે આસપાસના ગ્રાહકોને તમારો વ્યવસાય અને ઓફર બતાવો')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">
              {tr('Ad Submitted for Admin Approval!', 'विज्ञापन एडमिन की मंजूरी के लिए भेज दिया गया है!', 'જાહેરાત એડમિન મંજૂરી માટે મોકલવામાં આવી છે!')}
            </h4>
            <p className="text-xs text-slate-500">
              {tr(
                'Your sponsored ad banner has been sent to the Admin Dashboard for verification. Once approved, it will appear live on the home screen.',
                'आपका स्पॉन्सर्ड विज्ञापन बैनर सत्यापन के लिए एडमिन डैशबोर्ड में भेज दिया गया है। एडमिन द्वारा स्वीकृत होते ही यह होम स्क्रीन पर लाइव दिखेगा।',
                'તમારું સ્પોન્સર્ડ જાહેરાત બેનર ચકાસણી માટે એડમિન ડેશબોર્ડમાં મોકલવામાં આવ્યું છે. એડમિન મંજૂર કરતા જ તે હોમ સ્ક્રીન પર લાઈવ દેખાશે.'
              )}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto py-3 space-y-3 flex-1 pr-1">
            {/* Business Name & Mandatory Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {tr('Shop / Business Name *', 'दुकान / व्यवसाय का नाम *', 'દુકાન / વ્યવસાયનું નામ *')}
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={tr('e.g. Shree Ram Electronics', 'जैसे: श्री राम इलेक्ट्रॉनिक्स', 'દા.ત. શ્રી રામ ઇલેક્ટ્રોનિક્સ')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {tr('Verified Email ID *', 'सत्यापित ईमेल आईडी *', 'વેરિફાઈડ ઈમેલ આઈડી *')}
                </label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="business@example.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Logo Emoji Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {tr('Choose Business Logo Icon', 'व्यवसाय का लोगो आइकन चुनें', 'વ્યવસાયનો લોગો આઈકન પસંદ કરો')}
              </label>
              <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-hide">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setLogo(emoji)}
                    className={`text-xl p-2 rounded-xl transition-all border ${
                      logo === emoji 
                        ? 'bg-amber-100 dark:bg-amber-950 border-amber-500 scale-110 shadow-xs' 
                        : 'bg-slate-100 dark:bg-slate-800 border-transparent hover:bg-slate-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Offer Badge & Category */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {tr('Offer Tag / Badge', 'ऑफ़र टैग / बैज', 'ઓફર ટેગ / બેજ')}
                </label>
                <input
                  type="text"
                  value={offerBadge}
                  onChange={(e) => setOfferBadge(e.target.value)}
                  placeholder={tr('e.g. 🔥 25% OFF • Limited Time', 'जैसे: 🔥 25% छूट • सीमित समय', 'દા.ત. 🔥 25% ડિસ્કાઉન્ટ • મર્યાદિત સમય')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {tr('Area / Mohalla', 'एरिया / मोहल्ला', 'વિસ્તાર / સોસાયટી')}
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={tr('e.g. Main Market, Station Road', 'जैसे: मेन मार्केट, स्टेशन रोड', 'દા.ત. મેઈન માર્કેટ, સ્ટેશન રોડ')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Offer Catchy Headline */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {tr('Catchy Offer Headline *', 'आकर्षक ऑफ़र हेडलाइन *', 'આકર્ષક ઓફર હેડલાઈન *')}
              </label>
              <input
                type="text"
                required
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                placeholder={tr('e.g. Mega Clearance Sale on All Branded Smartphones!', 'जैसे: सभी ब्रांडेड स्मार्टफोन पर मेगा सेल!', 'દા.ત. તમામ બ્રાન્ડેડ સ્માર્ટફોન પર મેગા સેલ!')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Offer Description */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {tr('Offer Details / Description *', 'ऑफ़र का विवरण *', 'ઓફરની વિગત *')}
              </label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tr('Details of discount, free gifts, warranty, terms, etc.', 'छूट, मुफ़्त उपहार, वारंटी, नियम आदि का विवरण', 'ડિસ્કાઉન્ટ, ફ્રી ગિફ્ટ, વોરંટી, નિયમો વગેરેની વિગત')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* High Quality Product/Shop Photo (Supports Multiple Photos up to 5) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {tr('Ad Photos (Upload Multiple Photos - Max 5) *', 'विज्ञापन फ़ोटो (अधिकतम 5 फ़ोटो अपलोड करें) *', 'જાહેરાતના ફોટા (વધુમાં વધુ 5 ફોટા અપલોડ કરો) *')}
                </label>
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                  {adPhotos.length}/5 {tr('uploaded', 'अपलोड किए गए', 'અપલોડ થયા')}
                </span>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder={tr('Paste image URL or choose files...', 'इमेज URL पेस्ट करें या फ़ाइल चुनें...', 'ઈમેજ URL પેસ્ટ કરો અથવા ફાઈલ પસંદ કરો...')}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />

                {photoUrl.trim() && (
                  <button
                    type="button"
                    onClick={handleAddUrlPhoto}
                    className="px-2.5 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
                  >
                    {tr('+ Add URL', '+ URL जोड़ें', '+ URL ઉમેરો')}
                  </button>
                )}
                
                <label className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 transition-all">
                  <span>📸 {tr('Upload Photos', 'फ़ोटो अपलोड करें', 'ફોટા અપલોડ કરો')}</span>
                  <input 
                    type="file" 
                    multiple
                    accept="image/*" 
                    onChange={handleAdPhotoUpload} 
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Uploaded Thumbnails Row */}
              {adPhotos.length > 0 && (
                <div className="flex gap-2 pt-1 overflow-x-auto pb-1">
                  {adPhotos.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-16 rounded-xl overflow-hidden border-2 border-amber-400 shrink-0 group shadow-sm">
                      <img src={img} alt={`Ad Photo ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md cursor-pointer hover:scale-110 transition-transform"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 rounded font-bold">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Redirection URL */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {tr('Redirection Link (Website, Instagram, WhatsApp, or Profile URL)', 'रीडायरेक्शन लिंक (वेबसाइट, इंस्टाग्राम, व्हाट्सएप या प्रोफाइल URL)', 'રીડાયરેક્શન લિંક (વેબસાઈટ, ઈન્સ્ટાગ્રામ, વોટ્સએપ અથવા પ્રોફાઈલ URL)')}
              </label>
              <input
                type="text"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="e.g. https://instagram.com/myshop or https://wa.me/919876543210"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                {tr('When users tap your ad, they will be redirected to this link.', 'जब यूज़र आपके विज्ञापन पर टैप करेंगे, तो वे इस लिंक पर जाएंगे।', 'જ્યારે યુઝર તમારી જાહેરાત પર ટેપ કરશે, ત્યારે તેઓ આ લિંક પર જશે.')}
              </p>
            </div>

            {/* Notice about In-Built Chat communication */}
            <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 p-2.5 rounded-xl text-[10px] text-indigo-900 dark:text-indigo-200 space-y-0.5">
              <p className="font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" /> {tr('LocoHelp In-Built Chat Protected', 'LocoHelp इन-बिल्ट चैट सुरक्षित', 'LocoHelp ઇન-બિલ્ટ ચેટ સુરક્ષિત')}
              </p>
              <p className="opacity-90">
                {tr(
                  'Customers will communicate with you directly using our built-in secure chat system (no external spam or public phone leaks).',
                  'ग्राहक हमारे सुरक्षित इन-बिल्ट चैट सिस्टम के माध्यम से सीधे आपसे बात करेंगे (कोई स्पैम या सार्वजनिक नंबर लीक नहीं)।',
                  'ગ્રાહકો અમારા સુરક્ષિત ઇન-બિલ્ટ ચેટ સિસ્ટમ દ્વારા સીધા તમારી સાથે વાત કરશે (કોઈ સ્પામ કે જાહેર નંબર લીક નહીં).'
                )}
              </p>
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white py-3 rounded-2xl font-black text-xs sm:text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>{tr('Publishing Ad...', 'विज्ञापन प्रकाशित हो रहा है...', 'જાહેરાત પ્રકાશિત થઈ રહી છે...')}</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-white" />
                    <span>{tr('Publish Sponsored Ad Banner', 'स्पॉन्सर्ड विज्ञापन बैनर प्रकाशित करें', 'સ્પોન્સર્ડ જાહેરાત બેનર પ્રકાશિત કરો')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
