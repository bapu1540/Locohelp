import React, { useRef, useState, useEffect } from 'react';
import { Camera, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Upload, X, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { applyIdWatermark } from '../lib/watermark';
import { uploadFileToFirebaseStorage } from '../lib/firebase';
import { ProtectedSelfieCanvas } from './ProtectedSelfieCanvas';
import { useLanguage } from '../i18n';

async function compressImageToWebP(file: File): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  try {
    const compressed: string = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1000;
        let w = img.naturalWidth || img.width || 600;
        let h = img.naturalHeight || img.height || 600;
        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
    const uploaded = await Promise.race([
      uploadFileToFirebaseStorage(compressed, 'profiles'),
      new Promise<string>((r) => setTimeout(() => r(compressed), 5000)),
    ]);
    return uploaded || compressed;
  } catch {
    return dataUrl;
  }
}

interface LiveSelfieCaptureFieldProps {
  value: string;
  onChange: (watermarkedUrl: string) => void;
  userName?: string;
  entityType?: 'user_profile' | 'business';
  referenceId?: string;
  label?: string;
  subLabel?: string;
  required?: boolean;
  onError?: (msg: string) => void;
}

export const LiveSelfieCaptureField: React.FC<LiveSelfieCaptureFieldProps> = ({
  value,
  onChange,
  userName = 'User',
  entityType = 'user_profile',
  referenceId,
  label,
  subLabel,
  required = true,
  onError,
}) => {
  const { language } = useLanguage();
  const tr = (en: string, hi: string, gu: string) =>
    language === 'EN' ? en : language === 'GU' ? gu : hi;

  const resolvedLabel =
    label ||
    tr(
      '📸 Live Camera Selfie (Mandatory)',
      '📸 लाइव कैमरा सेल्फी (अनिवार्य)',
      '📸 લાઈવ કેમેરા સેલ્ફી (ફરજિયાત)'
    );

  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const reportError = (msg: string) => {
    setLocalError(msg);
    if (onError) onError(msg);
  };

  const startLiveCamera = async () => {
    setLocalError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 80);
    } catch {
      cameraInputRef.current?.click();
    }
  };

  const captureFromVideo = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setLocalError(null);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 640;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize camera canvas');
      ctx.drawImage(video, 0, 0, w, h);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      stopCameraStream();

      const watermarked = await applyIdWatermark(rawDataUrl, {
        entityType,
        userName: userName || 'User',
        referenceId: referenceId || 'SELFIE-' + Date.now().toString().slice(-6),
        customText: 'LOCOHELP LIVE SELFIE VERIFICATION • DO NOT REUSE',
      });
      onChange(watermarked);
    } catch (err: any) {
      reportError(
        err?.message ||
          tr(
            'Unable to capture selfie. Please choose photo below.',
            'लाइव सेल्फी लेने में समस्या आई। कृपया नीचे कैमरे से फोटो चुनें।',
            'લાઈવ સેલ્ફી લેવામાં સમસ્યા આવી. કૃપા કરીને નીચે કેમેરાથી ફોટો પસંદ કરો.'
          )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setLocalError(null);
    try {
      const watermarked = await applyIdWatermark(file, {
        entityType,
        userName: userName || 'User',
        referenceId: referenceId || 'SELFIE-' + Date.now().toString().slice(-6),
        customText: 'LOCOHELP LIVE SELFIE VERIFICATION • DO NOT REUSE',
      });
      onChange(watermarked);
    } catch (err: any) {
      try {
        const compressed = await compressImageToWebP(file);
        const watermarked = await applyIdWatermark(compressed, {
          entityType,
          userName: userName || 'User',
          referenceId: referenceId || 'SELFIE-' + Date.now().toString().slice(-6),
          customText: 'LOCOHELP LIVE SELFIE VERIFICATION • DO NOT REUSE',
        });
        onChange(watermarked);
      } catch (innerErr: any) {
        reportError(
          innerErr?.message ||
            err?.message ||
            tr(
              'Error uploading selfie. Please choose a clear photo.',
              'सेल्फी अपलोड करने में त्रुटि। कृपया दूसरी स्पष्ट फोटो चुनें।',
              'સેલ્ફી અપલોડ કરવામાં ભૂલ. કૃપા કરીને બીજો સ્પષ્ટ ફોટો પસંદ કરો.'
            )
        );
      }
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <label className="block text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resolvedLabel}</span>
            {required && <span className="text-red-600 font-black">*</span>}
          </label>
          {subLabel ? (
            <p className="text-[11px] text-emerald-800 font-medium mt-0.5 leading-snug">
              {subLabel}
            </p>
          ) : null}
        </div>
        {value && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shrink-0">
            <CheckCircle2 className="w-3 h-3" /> {tr('Ready', 'तैयार', 'તૈયાર')}
          </span>
        )}
      </div>

      {/* Hidden Native Camera & Fallback Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {localError && (
        <div className="mb-2.5 p-2 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-[11px] font-bold">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{localError}</span>
        </div>
      )}

      {cameraActive ? (
        <div className="relative rounded-xl overflow-hidden bg-slate-950 border-2 border-emerald-500 p-2 flex flex-col items-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-[260px] h-56 object-cover rounded-lg border border-slate-700 transform -scale-x-100"
          />
          <div className="flex items-center gap-2 mt-2.5 w-full">
            <button
              type="button"
              onClick={captureFromVideo}
              disabled={isProcessing}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>{tr('📸 Click Selfie', '📸 सेल्फी क्लिक करें', '📸 સેલ્ફી ક્લિક કરો')}</span>
            </button>
            <button
              type="button"
              onClick={stopCameraStream}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl"
            >
              {tr('Cancel', 'रद्द करें', 'રદ કરો')}
            </button>
          </div>
        </div>
      ) : value ? (
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-emerald-200">
          <ProtectedSelfieCanvas
            src={value}
            className="w-20 h-24 rounded-xl shrink-0"
            badgeText="SELFIE"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-emerald-700 font-extrabold text-xs mb-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{tr('Live selfie added!', 'लाइव सेल्फी जुड़ गई है!', 'લાઈવ સેલ્ફી ઉમેરાઈ ગઈ છે!')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={startLiveCamera}
                disabled={isProcessing}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> {tr('Retake Selfie', 'फिर से सेल्फी लें', 'ફરીથી સેલ્ફી લો')}
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isProcessing}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1"
              >
                <Camera className="w-3 h-3" /> {tr('Open Camera', 'कैमरा खोलें', 'કેમેરા ખોલો')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={startLiveCamera}
            disabled={isProcessing}
            className="w-full py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{tr('Processing...', 'प्रोसेस हो रहा है...', 'પ્રોસેસ થઈ રહ્યું છે...')}</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>{tr('📸 Take Live Selfie', '📸 लाइव सेल्फी लें', '📸 લાઈવ સેલ્ફી લો')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full py-3 px-3 bg-white hover:bg-emerald-50 text-emerald-900 border-2 border-emerald-400 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>{tr('📷 Upload Selfie from Phone', '📷 फोन से सेल्फी अपलोड करें', '📷 ફોનમાંથી સેલ્ફી અપલોડ કરો')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

interface VisitingCardUploadFieldProps {
  value: string;
  onChange: (photoUrl: string) => void;
  label?: string;
  subLabel?: string;
  onError?: (msg: string) => void;
}

export const VisitingCardUploadField: React.FC<VisitingCardUploadFieldProps> = ({
  value,
  onChange,
  label,
  subLabel,
  onError,
}) => {
  const { language } = useLanguage();
  const tr = (en: string, hi: string, gu: string) =>
    language === 'EN' ? en : language === 'GU' ? gu : hi;

  const resolvedLabel =
    label ||
    tr(
      '🪪 Visiting Card / Work Photo (Optional)',
      '🪪 विजिटिंग कार्ड / काम की फोटो (वैकल्पिक)',
      '🪪 વિઝિટિંગ કાર્ડ / કામનો ફોટો (વૈકલ્પિક)'
    );

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCardSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const compressedUrl = await compressImageToWebP(file);
      onChange(compressedUrl);
    } catch (err: any) {
      if (onError) {
        onError(
          err?.message ||
            tr(
              'Error uploading photo.',
              'फोटो अपलोड करने में समस्या आई।',
              'ફોટો અપલોડ કરવામાં સમસ્યા આવી.'
            )
        );
      }
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{resolvedLabel}</span>
        </label>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
          {tr('Optional', 'वैकल्पिक', 'વૈકલ્પિક')}
        </span>
      </div>
      {subLabel ? (
        <p className="text-[11px] text-slate-500 font-medium mb-2.5 leading-snug">
          {subLabel}
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        onChange={handleCardSelect}
        className="hidden"
      />

      {value ? (
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
          <img
            src={value}
            alt="Visiting Card Preview"
            className="w-20 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-700 truncate">
              {tr('✓ Photo added', '✓ फोटो जुड़ गया', '✓ ફોટો ઉમેરાઈ ગયો')}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                {tr('Change', 'बदलें', 'બદલો')}
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-0.5"
              >
                <X className="w-3 h-3" /> {tr('Remove', 'हटाएं', 'દૂર કરો')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-dashed border-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>{tr('Uploading...', 'अपलोड हो रहा है...', 'અપલોડ થઈ રહ્યું છે...')}</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>{tr('🪪 Choose Visiting Card / Work Photo', '🪪 विजिटिंग कार्ड या काम की फोटो चुनें', '🪪 વિઝિટિંગ કાર્ડ કે કામનો ફોટો પસંદ કરો')}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

