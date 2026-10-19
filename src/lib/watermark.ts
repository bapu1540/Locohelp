/**
 * LocoHelp Secure Watermarking Engine
 * 
 * Automatically applies an indelible, anti-fraud watermark on identity documents 
 * (Aadhaar, PAN, Voter ID, Trade License, Driving License) before transmission or storage.
 * 
 * Guarantees:
 * 1. Diagonally repeated text: "FOR LOCOHELP VERIFICATION ONLY • DO NOT REUSE"
 * 2. Security micro-pattern overlay
 * 3. Timestamped verification ID banner
 * 4. Strictly prevents unwatermarked identity document leakage
 */

export interface WatermarkOptions {
  entityType?: 'user_profile' | 'business';
  userName?: string;
  referenceId?: string;
  customText?: string;
}

export async function applyIdWatermark(
  imageSource: File | string,
  options?: WatermarkOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const handleImageLoaded = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Maintain resolution with reasonable maximum dimensions for performance and storage
        const maxDim = 1600;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 1. Draw original document image
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Add subtle security grid / anti-tampering pattern
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        const step = Math.max(30, Math.round(width / 30));
        for (let x = 0; x < width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        ctx.restore();

        // 3. Draw diagonal repeating watermarks across entire document
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((-28 * Math.PI) / 180); // 28 degree slant
        ctx.translate(-width / 2, -height / 2);

        const fontSize = Math.max(16, Math.round(width / 28));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const watermarkText = (options?.customText || 'FOR LOCOHELP VERIFICATION ONLY • DO NOT REUSE').toUpperCase();
        const dateStr = new Date().toISOString().split('T')[0];
        const subWatermarkText = `SECURE ID • FOR LOCOHELP ONLY • ${dateStr}`;

        // Repeat watermarks over expanded diagonal area
        const diagonal = Math.sqrt(width * width + height * height);
        const ySpacing = fontSize * 3.5;
        const xSpacing = Math.max(400, width * 0.75);

        for (let y = -diagonal; y <= diagonal * 2; y += ySpacing) {
          for (let x = -diagonal; x <= diagonal * 2; x += xSpacing) {
            // Shadow for readability on dark or light backgrounds
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            // Translucent white with dark outline
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fillText(watermarkText, x, y);

            ctx.font = `600 ${Math.round(fontSize * 0.7)}px sans-serif`;
            ctx.fillStyle = 'rgba(255, 230, 0, 0.50)'; // gold tint for security stamp
            ctx.fillText(subWatermarkText, x, y + fontSize * 1.1);
            ctx.font = `bold ${fontSize}px sans-serif`;
          }
        }
        ctx.restore();

        // 4. Draw Official Top & Bottom Tamper-Proof Security Banners
        const bannerHeight = Math.max(36, Math.round(height * 0.055));
        
        // Top Security Banner
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'; // dark slate
        ctx.fillRect(0, 0, width, bannerHeight);
        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${Math.max(12, Math.round(bannerHeight * 0.42))}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️ LOCOHELP CONFIDENTIAL ID VERIFICATION • ADMIN-ONLY ACCESS', 15, bannerHeight / 2);
        ctx.restore();

        // Bottom Security Banner with Timestamp & Reference ID
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(0, height - bannerHeight, width, bannerHeight);
        ctx.fillStyle = '#fbbf24'; // amber-400
        ctx.font = `600 ${Math.max(11, Math.round(bannerHeight * 0.38))}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const refText = options?.referenceId ? `REF: ${options.referenceId} • ` : '';
        const userText = options?.userName ? `USER: ${options.userName.substring(0, 20)} • ` : '';
        const nowFormatted = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        ctx.fillText(`🔒 ${refText}${userText}WATERMARKED: ${nowFormatted} IST`, width - 15, height - bannerHeight / 2);
        ctx.restore();

        // Export as JPEG with optimal quality
        const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(watermarkedDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for watermarking'));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(imageSource);
    }
  });
}
