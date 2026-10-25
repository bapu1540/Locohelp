/**
 * Client-side HTML5 Canvas WebP Image Compression + Firebase Storage Upload Utility
 * Automatically converts and compresses uploaded images into image/webp format
 * (max width 1200px, quality 0.75) and uploads directly to Firebase Storage (`locohelp/`).
 */

import { uploadFileToFirebaseStorage } from './firebase';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  aspectRatio?: number; // e.g. 16/9 for 16:9 banners
  cropToAspectRatio?: boolean;
  folder?: string; // Subfolder inside locohelp/ in Firebase Storage
}

export function compressImageToWebP(
  input: File | Blob | string,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.75,
    aspectRatio,
    cropToAspectRatio = false,
    folder = 'images'
  } = options;

  return new Promise((resolve, reject) => {
    const loadImage = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          let srcW = img.naturalWidth || img.width;
          let srcH = img.naturalHeight || img.height;

          if (srcW === 0 || srcH === 0) {
            uploadFileToFirebaseStorage(src, folder).then(resolve).catch(() => resolve(src));
            return;
          }

          let drawW = srcW;
          let drawH = srcH;
          let offsetX = 0;
          let offsetY = 0;
          let targetW = srcW;
          let targetH = srcH;

          if (aspectRatio && cropToAspectRatio) {
            // Strict crop to aspect ratio (e.g. 16:9 object-cover math)
            targetW = Math.min(srcW, maxWidth);
            targetH = Math.round(targetW / aspectRatio);
            if (targetH > maxHeight) {
              targetH = maxHeight;
              targetW = Math.round(targetH * aspectRatio);
            }

            const currentRatio = srcW / srcH;
            if (currentRatio > aspectRatio) {
              drawH = targetH;
              drawW = Math.round(img.width * (targetH / img.height));
              offsetX = (targetW - drawW) / 2;
            } else {
              drawW = targetW;
              drawH = Math.round(img.height * (targetW / img.width));
              offsetY = (targetH - drawH) / 2;
            }
          } else {
            // Proportional downscale while preserving aspect ratio
            if (srcW > maxWidth || srcH > maxHeight) {
              const widthRatio = maxWidth / srcW;
              const heightRatio = maxHeight / srcH;
              const bestRatio = Math.min(widthRatio, heightRatio);
              targetW = Math.round(srcW * bestRatio);
              targetH = Math.round(srcH * bestRatio);
            }
            drawW = targetW;
            drawH = targetH;
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            uploadFileToFirebaseStorage(src, folder).then(resolve).catch(() => resolve(src));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Optional subtle white background for transparent PNG/WebP conversions
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);

          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

          // Attempt WebP export with requested quality (0.75)
          let webpDataUrl = canvas.toDataURL('image/webp', quality);

          // If browser doesn't support webp encoding (very rare in modern browsers), fallback to jpeg
          if (!webpDataUrl.startsWith('data:image/webp')) {
            webpDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // Upload directly to Firebase Storage inside locohelp/<folder>/ and return permanent download URL
          uploadFileToFirebaseStorage(webpDataUrl, folder)
            .then((permanentUrl) => resolve(permanentUrl || webpDataUrl))
            .catch(() => resolve(webpDataUrl));
        } catch (err) {
          console.warn('Image canvas compression warning, using original:', err);
          uploadFileToFirebaseStorage(src, folder).then(resolve).catch(() => resolve(src));
        }
      };

      img.onerror = () => {
        uploadFileToFirebaseStorage(src, folder).then(resolve).catch(() => resolve(src));
      };

      img.src = src;
    };

    if (typeof input === 'string') {
      loadImage(input);
    } else if (input && typeof input === 'object') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          loadImage(result);
        } else {
          reject(new Error('Failed to read image file'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(input as Blob);
    } else {
      reject(new Error('Invalid image input'));
    }
  });
}

