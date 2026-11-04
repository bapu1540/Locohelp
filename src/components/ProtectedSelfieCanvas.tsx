import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

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
 * - Blocks right-click ("Save Image As"), drag-and-drop, and mobile long-press download.
 * - Draws a subtle diagonal security watermark ("LOCOHELP VERIFIED • DO NOT COPY").
 * - Automatically blurs/blacks out when window loses focus, tab switches, or PrintScreen is pressed.
 */
export const ProtectedSelfieCanvas: React.FC<ProtectedSelfieCanvasProps> = ({
  src,
  width,
  height,
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
    img.onload = () => {
      if (cancelled || !canvasRef.current) return;
      try {
        const targetW = 320;
        const targetH = 380;
        canvas.width = targetW;
        canvas.height = targetH;

        // Center-crop image onto canvas
        const scale = Math.max(targetW / (img.width || 1), targetH / (img.height || 1));
        const drawW = (img.width || targetW) * scale;
        const drawH = (img.height || targetH) * scale;
        const offsetX = (targetW - drawW) / 2;
        const offsetY = (targetH - drawH) / 2;

        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        // Diagonal anti-copy security pattern
        ctx.save();
        ctx.translate(targetW / 2, targetH / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.textAlign = 'center';
        for (let y = -180; y <= 180; y += 54) {
          ctx.fillText('LOCOHELP VERIFIED • DO NOT COPY', 0, y);
        }
        ctx.restore();

        // Bottom protective bar
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.fillRect(0, targetH - 28, targetW, 28);
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#34d399';
        ctx.textAlign = 'center';
        ctx.fillText('🔒 LIVE SELFIE • PROTECTED', targetW / 2, targetH - 10);
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
      if (document.hidden) {
        setIsShielded(true);
      } else {
        setIsShielded(false);
      }
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
        <img
          src={src}
          alt="Protected Live Selfie"
          draggable={false}
          className={`w-full h-full object-cover pointer-events-none select-none transition-all duration-200 ${
            isShielded ? 'blur-xl opacity-15 scale-105' : ''
          }`}
        />
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

export default ProtectedSelfieCanvas;

