import React, { useState } from 'react';
import { Download, Check, Sparkles, Copy, Image, FileCode, Layers, ShieldCheck } from 'lucide-react';
import LocoHelpLogo from './LocoHelpLogo';

interface LogoDownloadStudioProps {
  onNotify?: (message: string) => void;
}

export default function LogoDownloadStudio({ onNotify }: LogoDownloadStudioProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewBg, setPreviewBg] = useState<'transparent' | 'light' | 'dark'>('transparent');

  // Exact SVG definitions matching the LocoHelp official brand identity
  // Exact original LocoHelp SVG definitions
  const iconPathArc = `M 16 60 C 26 84, 42 93, 50 93 C 58 93, 74 84, 84 60 C 87 53, 77 49, 73 55 C 65 67, 57 76, 50 76 C 43 76, 35 67, 27 55 C 23 49, 13 53, 16 60 Z`;
  const iconPathPin = `M 50 6 C 36 6 25 17 25 31 C 25 46 50 66 50 66 C 50 66 75 46 75 31 C 75 17 64 6 50 6 Z M 50 42 C 43.9 42 39 37.1 39 31 C 39 24.9 43.9 20 50 20 C 56.1 20 61 24.9 61 31 C 61 37.1 56.1 42 50 42 Z`;

  // 1. Icon Only SVG
  const getIconSvgString = (size = 512) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
  <!-- LocoHelp Original Icon Symbol -->
  <!-- 1. Supporting Orange Smile Arc -->
  <path d="${iconPathArc}" fill="#FF8800" stroke="#FF8800" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  <!-- 2. Primary Blue Location Pin -->
  <path d="${iconPathPin}" fill="#0066FF" />
</svg>`;

  // 2. Text Only SVG
  const getTextSvgString = (width = 800, height = 240) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="${width}" height="${height}">
  <!-- LocoHelp Wordmark -->
  <style>
    .brand-font {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-weight: 900;
      font-size: 80px;
      letter-spacing: -2px;
    }
  </style>
  <text x="10" y="88" class="brand-font">
    <tspan fill="#0066FF">Loco</tspan><tspan fill="#FF8800">Help</tspan>
  </text>
</svg>`;

  // 3. Full Brand Lockup (Icon + Text Horizontal)
  const getFullLockupSvgString = (width = 1200, height = 360) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 140" width="${width}" height="${height}">
  <!-- LocoHelp Original Full Brand Lockup -->
  <style>
    .brand-font {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-weight: 900;
      font-size: 76px;
      letter-spacing: -2px;
    }
  </style>
  <g transform="translate(10, 15) scale(1.1)">
    <!-- Arc -->
    <path d="${iconPathArc}" fill="#FF8800" stroke="#FF8800" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Pin -->
    <path d="${iconPathPin}" fill="#0066FF" />
  </g>
  <text x="140" y="98" class="brand-font">
    <tspan fill="#0066FF">Loco</tspan><tspan fill="#FF8800">Help</tspan>
  </text>
</svg>`;

  // 4. App Store Icon (Squircle Badge)
  const getAppIconBadgeSvgString = (size = 1024) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F4F1EA" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#0066FF" flood-opacity="0.18"/>
    </filter>
  </defs>
  <!-- Squircle Base -->
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#bgGrad)" stroke="#E2DEC9" stroke-width="4" filter="url(#shadow)" />
  
  <!-- Centered Original Icon -->
  <g transform="translate(96, 80) scale(3.2)">
    <path d="${iconPathArc}" fill="#FF8800" stroke="#FF8800" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${iconPathPin}" fill="#0066FF" />
  </g>

  <!-- Title Text -->
  <text x="256" y="445" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="900" font-size="44" letter-spacing="-1">
    <tspan fill="#0066FF">Loco</tspan><tspan fill="#FF8800">Help</tspan>
  </text>
</svg>`;

  // Trigger SVG direct download
  const handleDownloadSvg = (svgContent: string, filename: string, id: string) => {
    try {
      setDownloadingId(id);
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onNotify) onNotify(`✓ ${filename}.svg Downloaded!`);
      setTimeout(() => setDownloadingId(null), 1200);
    } catch (err) {
      console.error('Download SVG failed:', err);
      setDownloadingId(null);
    }
  };

  // Convert SVG to Ultra-HD Transparent PNG & Download
  const handleDownloadPng = (
    svgContent: string, 
    filename: string, 
    id: string, 
    width = 1024, 
    height = 1024
  ) => {
    try {
      setDownloadingId(id);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new window.Image();
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (!blob) return;
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `${filename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);

          if (onNotify) onNotify(`✓ ${filename}.png (HD Transparent) Downloaded!`);
          setTimeout(() => setDownloadingId(null), 1200);
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        setDownloadingId(null);
        alert('Could not render image for download.');
      };

      img.src = url;
    } catch (err) {
      console.error('Download PNG failed:', err);
      setDownloadingId(null);
    }
  };

  const handleCopySvg = (svgContent: string, id: string) => {
    try {
      navigator.clipboard.writeText(svgContent);
      setCopiedId(id);
      if (onNotify) onNotify('✓ SVG Code copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {}
  };

  const assets = [
    {
      id: 'icon_only',
      title: '1. LocoHelp Icon Only (प्रतीक चिन्ह)',
      subtitle: 'Orange Arc + Blue Location Pin • Perfect for Favicons, App Icons & Profile Pictures',
      renderPreview: () => (
        <div className="w-24 h-24 flex items-center justify-center">
          <LocoHelpLogo size={76} showText={false} />
        </div>
      ),
      getSvg: () => getIconSvgString(1024),
      pngWidth: 1024,
      pngHeight: 1024,
      filename: 'locohelp_icon_symbol'
    },
    {
      id: 'text_only',
      title: '2. LocoHelp Wordmark (केवल नाम / टेक्स्ट)',
      subtitle: 'Official Blue & Orange Typography • Perfect for headers, documents & signatures',
      renderPreview: () => (
        <div className="py-4 px-6 flex items-center justify-center">
          <div className="text-3xl sm:text-4xl font-black tracking-tight">
            <span className="text-[#0066FF]">Loco</span>
            <span className="text-[#FF8800]">Help</span>
          </div>
        </div>
      ),
      getSvg: () => getTextSvgString(1200, 360),
      pngWidth: 1200,
      pngHeight: 360,
      filename: 'locohelp_text_wordmark'
    },
    {
      id: 'full_combo',
      title: '3. Full Brand Lockup (आइकन + टेक्स्ट पूरा लोगो)',
      subtitle: 'Official Primary Horizontal Logo • Transparent background for banners, websites & posters',
      renderPreview: () => (
        <div className="py-3 px-4 flex items-center justify-center gap-2">
          <LocoHelpLogo size={48} showText={true} textSize="lg" />
        </div>
      ),
      getSvg: () => getFullLockupSvgString(1600, 480),
      pngWidth: 1600,
      pngHeight: 480,
      filename: 'locohelp_full_brand_logo'
    },
    {
      id: 'app_badge',
      title: '4. App Store & Android Squircle Badge (HD 1024x1024)',
      subtitle: 'Ready-to-use rounded square app icon with subtle drop shadow for Play Store & APK builds',
      renderPreview: () => (
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-white to-[#F4F1EA] border border-slate-300 dark:border-slate-700 shadow-md flex flex-col items-center justify-center p-2">
          <LocoHelpLogo size={42} showText={false} />
          <div className="text-[10px] font-black tracking-tight mt-1">
            <span className="text-[#0066FF]">Loco</span>
            <span className="text-[#FF8800]">Help</span>
          </div>
        </div>
      ),
      getSvg: () => getAppIconBadgeSvgString(1024),
      pngWidth: 1024,
      pngHeight: 1024,
      filename: 'locohelp_app_store_icon'
    }
  ];

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 p-5 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-15 flex items-center pr-6 pointer-events-none">
          <LocoHelpLogo size={140} showText={false} />
        </div>
        <div className="relative z-10 space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider">
              LocoHelp Brand Studio
            </span>
            <span className="text-amber-200 text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> High-Resolution Vector Assets
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Official LocoHelp Logo & Icon Downloader
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 font-medium">
            यहाँ से आप LocoHelp का ओरिजिनल लोगो <strong>SVG</strong> (वेक्टर फाइल जो कभी नहीं फटती) और <strong>PNG</strong> (पारदर्शी 4K HD) फॉर्मेट में तुरंत 1-क्लिक में डाउनलोड कर सकते हैं।
          </p>
        </div>

        {/* Color Palette Pill */}
        <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="text-blue-100">Official Brand Colors:</span>
          <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-xl">
            <div className="w-3.5 h-3.5 rounded-full bg-[#0066FF] border border-white/40"></div>
            <span>Loco Blue: <code className="text-[11px] bg-white/20 px-1 rounded">#0066FF</code></span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-xl">
            <div className="w-3.5 h-3.5 rounded-full bg-[#FF8800] border border-white/40"></div>
            <span>Help Orange: <code className="text-[11px] bg-white/20 px-1 rounded">#FF8800</code></span>
          </div>
        </div>
      </div>

      {/* Preview Background Switcher */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-2xl border border-[#DFDBCF] dark:border-slate-700 text-xs">
        <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Preview Canvas Background:
        </span>
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
          <button
            onClick={() => setPreviewBg('transparent')}
            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
              previewBg === 'transparent' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🏁 Checkerboard
          </button>
          <button
            onClick={() => setPreviewBg('light')}
            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
              previewBg === 'light' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ☀️ White
          </button>
          <button
            onClick={() => setPreviewBg('dark')}
            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
              previewBg === 'dark' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🌙 Dark
          </button>
        </div>
      </div>

      {/* Grid of Logo Download Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assets.map((asset) => {
          const svgCode = asset.getSvg();
          const isSvgDownloading = downloadingId === `${asset.id}_svg`;
          const isPngDownloading = downloadingId === `${asset.id}_png`;
          const isCopied = copiedId === asset.id;

          return (
            <div 
              key={asset.id} 
              className="bg-white dark:bg-slate-800 rounded-3xl border border-[#DFDBCF] dark:border-slate-700 p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all space-y-4"
            >
              {/* Header */}
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{asset.title}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {asset.subtitle}
                </p>
              </div>

              {/* Preview Box */}
              <div 
                className={`w-full min-h-[140px] rounded-2xl flex items-center justify-center p-4 border transition-colors ${
                  previewBg === 'transparent'
                    ? 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                    : previewBg === 'light'
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                {asset.renderPreview()}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <div className="grid grid-cols-2 gap-2">
                  {/* Download SVG */}
                  <button
                    onClick={() => handleDownloadSvg(svgCode, asset.filename, `${asset.id}_svg`)}
                    disabled={isSvgDownloading}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-black text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Download scalable vector file (never pixelates)"
                  >
                    {isSvgDownloading ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <FileCode className="w-3.5 h-3.5" />
                    )}
                    <span>Download SVG</span>
                  </button>

                  {/* Download PNG */}
                  <button
                    onClick={() => handleDownloadPng(svgCode, asset.filename, `${asset.id}_png`, asset.pngWidth, asset.pngHeight)}
                    disabled={isPngDownloading}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Download transparent high-resolution PNG"
                  >
                    {isPngDownloading ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Image className="w-3.5 h-3.5" />
                    )}
                    <span>Download PNG</span>
                  </button>
                </div>

                {/* Copy SVG code */}
                <button
                  onClick={() => handleCopySvg(svgCode, asset.id)}
                  className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied SVG to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copy Raw SVG Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Tips Note */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-black">LocoHelp Asset Usage Guide:</p>
          <ul className="list-disc pl-4 space-y-0.5 font-medium text-amber-800 dark:text-amber-300/90">
            <li><strong>SVG File:</strong> Adobe Illustrator, CorelDraw, Figma, Canva या फ्लेक्स बैनर / होर्डिंग प्रिंटिंग के लिए इस्तेमाल करें। यह कितना भी बड़ा करने पर कभी नहीं फटेगा।</li>
            <li><strong>PNG File:</strong> 100% पारदर्शी (Transparent Background) है। इसे आप WhatsApp स्टेटस, Facebook पोस्ट, विजिटिंग कार्ड और वेबसाइट पर बिना सफेद बैकग्राउंड के लगा सकते हैं।</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
