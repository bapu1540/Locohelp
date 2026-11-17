import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Lock, X } from 'lucide-react';

interface ProtectedSelfieCanvasProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  badgeText?: string;
}

/**
 * Renders a Live Camera Selfie onto an HTML5 <canvas> element instead of an <img> tag.
 * - Keeps the person's face 100% clear (no lines over the face).
 * - Places the LocoHelp security stamp strictly along the bottom edge.
 * - Blocks right-click ("Save Image As"), drag-and-drop, and mobile long-press download.
 * - Automatically blurs/blacks out when window loses focus, tab switches, or PrintScreen is pressed.
 */
export const ProtectedSelfieCanvas: React.FC<ProtectedSelfieCanvasProps> = ({
  src,
  className = 'w-24 h-28 rounded-xl',
  badgeText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isShielded, setIsShielded] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);

  useEffect(() => {
    if (!src) return;
    setCanvasFailed(false);
    const canvas = canvasRef.current;
    if (!canvas) {
      setCanvasFailed(true);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCanvasFailed(true);
      return;
    }

    let cancelled = false;
    const img = new Image();
    if (src.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (cancelled || !canvasRef.current) return;
      try {
        const targetW = 360;
        const targetH = 420;
        canvas.width = targetW;
        canvas.height = targetH;

        // Center-crop image onto canvas (keep face 100% clear)
        const scale = Math.max(targetW / (img.width || 1), targetH / (img.height || 1));
        const drawW = (img.width || targetW) * scale;
        const drawH = (img.height || targetH) * scale;
        const offsetX = (targetW - drawW) / 2;
        const offsetY = (targetH - drawH) / 2;

        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        // Bottom protective bar only (never covers the face)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(0, targetH - 26, targetW, 26);
        ctx.font = 'bold 10.5px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#34d399';
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ LOCOHELP VERIFIED • DO NOT COPY', targetW / 2, targetH - 9);
      } catch {
        setCanvasFailed(true);
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setCanvasFailed(true);
      }
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const handleVisibility = () => {
      setIsShielded(document.hidden);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's' || e.key === 'I' || e.key === 'i')) ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))
      ) {
        setIsShielded(true);
        setTimeout(() => setIsShielded(false), 3500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      className={`relative overflow-hidden select-none border border-emerald-200 shadow-sm bg-slate-900 ${className}`}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      onDragStart={(e) => {
        e.preventDefault();
        return false;
      }}
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {canvasFailed ? (
        <div className="relative w-full h-full">
          <img
            src={src}
            alt="Protected Live Selfie"
            draggable={false}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover pointer-events-none select-none transition-all duration-200 ${
              isShielded ? 'blur-xl opacity-15 scale-105' : ''
            }`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/85 py-1 px-1.5 text-center">
            <span className="text-[8px] font-black text-emerald-300 tracking-wide">
              🛡️ LOCOHELP VERIFIED • DO NOT COPY
            </span>
          </div>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover pointer-events-none transition-all duration-200 ${
            isShielded ? 'blur-xl opacity-15 scale-105' : ''
          }`}
        />
      )}
      {/* Transparent anti-touch overlay */}
      <div
        className="absolute inset-0 z-10"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
      {isShielded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 text-white p-2 text-center">
          <Lock className="w-5 h-5 text-amber-400 mb-1" />
          <span className="text-[10px] font-bold leading-tight">
            Protected Live Selfie
          </span>
        </div>
      )}
      {badgeText && !isShielded && (
        <div className="absolute top-1.5 left-1.5 z-20 bg-emerald-600/90 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow">
          <ShieldCheck className="w-2.5 h-2.5" />
          <span>{badgeText}</span>
        </div>
      )}
    </div>
  );
};

export interface ProtectedPhotoZoomModalProps {
  photoUrl: string | null;
  name?: string;
  role?: string;
  area?: string;
  isVerified?: boolean;
  language?: string;
  onClose: () => void;
}

/**
 * Full-screen Protected Photo Zoom Modal for Service Providers.
 * - Shows a large, clear view of the person's photo so customers can clearly recognize them.
 * - Keeps the face 100% clear (no lines over the face).
 * - Protects against Save/Download/Long-press and adds a bottom-only LocoHelp security stamp + auto-blur shield.
 */
export const ProtectedPhotoZoomModal: React.FC<ProtectedPhotoZoomModalProps> = ({
  photoUrl,
  name,
  role,
  area,
  isVerified = true,
  language = 'GU',
  onClose,
}) => {
  const [isShielded, setIsShielded] = useState(false);

  useEffect(() => {
    if (!photoUrl) return;
    const handleVisibility = () => {
      setIsShielded(document.hidden);
    };
    const handleBlur = () => {
      setIsShielded(true);
    };
    const handleFocus = () => {
      setIsShielded(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's' || e.key === 'I' || e.key === 'i')) ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))
      ) {
        setIsShielded(true);
        setTimeout(() => setIsShielded(false), 3500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [photoUrl, onClose]);

  if (!photoUrl || typeof document === 'undefined') return null;

  const dateStamp = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

  return createPortal(
    <div
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100050,
        backgroundColor: 'rgba(2, 6, 23, 0.90)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '370px',
          backgroundColor: '#0f172a',
          borderRadius: '22px',
          border: '2px solid rgba(16, 185, 129, 0.45)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top Header with Provider Name & Close Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '12px 14px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 900,
                  color: '#ffffff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {name || (language === 'GU' ? 'સેવા પ્રદાતા' : language === 'HI' ? 'सेवा प्रदाता' : 'Service Provider')}
              </span>
              {isVerified && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                  }}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>
                    {language === 'GU' ? 'વેરિફાઈડ' : language === 'HI' ? 'वेरिफाइड' : 'Verified'}
                  </span>
                </span>
              )}
            </div>
            {(role || area) && (
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#93c5fd',
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {role}
                {role && area ? ` • 📍 ${area}` : area ? `📍 ${area}` : ''}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Center Photo Container: Face 100% Clear + Anti-Download Shield */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '360px',
            backgroundColor: '#020617',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
        >
          <img
            src={photoUrl}
            alt={name || 'Provider Photo'}
            draggable={false}
            referrerPolicy="no-referrer"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              filter: isShielded ? 'blur(24px) brightness(0.3)' : 'none',
              transition: 'filter 0.15s ease',
            }}
          />

          {/* Small Corner Badge (Top Left - never touches center face) */}
          {!isShielded && (
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(52, 211, 153, 0.45)',
                color: '#6ee7b7',
                fontSize: '9.5px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                pointerEvents: 'none',
              }}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>LocoHelp Protected</span>
            </div>
          )}

          {/* Transparent Anti-Save / Anti-Long-Press Shield */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              backgroundColor: 'transparent',
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }}
            onDragStart={(e) => {
              e.preventDefault();
              return false;
            }}
          />

          {/* Auto-Blur Lock Overlay if Screenshot / Focus Loss Detected */}
          {isShielded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(2, 6, 23, 0.85)',
                color: '#ffffff',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <Lock className="w-8 h-8 text-amber-400 mb-2" />
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#fde68a' }}>
                {language === 'GU'
                  ? '🔒 સુરક્ષિત ફોટો (Protected Photo)'
                  : language === 'HI'
                  ? '🔒 सुरक्षित फोटो (Protected Photo)'
                  : '🔒 Protected Profile Photo'}
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                {language === 'GU'
                  ? 'સુરક્ષા કારણોસર સ્ક્રીન બદલતા ફોટો હાઈડ થાય છે.'
                  : language === 'HI'
                  ? 'सुरक्षा कारणों से स्क्रीन बदलने पर फोटो छिप जाता है।'
                  : 'Photo is shielded when window loses focus.'}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Security Stamp Bar (Outside/Below Face - Clear & Tamper-Deterrent) */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderTop: '1px solid rgba(52, 211, 153, 0.25)',
            padding: '9px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 900,
              color: '#34d399',
              letterSpacing: '0.02em',
            }}
          >
            🛡️ LOCOHELP VERIFIED • DO NOT COPY OR MISUSE ({dateStamp})
          </div>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#94a3b8' }}>
            {language === 'GU'
              ? 'આ ફોટો માત્ર ઓળખ માટે છે • ડાઉનલોડ કે દુરુપયોગ કરવો નહીં'
              : language === 'HI'
              ? 'यह फोटो केवल पहचान के लिए है • डाउनलोड या दुरुपयोग वर्जित है'
              : 'For identity recognition only • Downloading or reuse is prohibited'}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProtectedSelfieCanvas;

