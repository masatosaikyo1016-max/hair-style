import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to resize image before upload to avoid Vercel 4.5MB payload limit
// Converted to more aggressive compression (800px, 0.6 quality) to ensure stability on Vercel Hobby plan
export const resizeImage = async (file: File, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fail processing, return original
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const newFile = new File([blob], file.name, {
            type: 'image/jpeg', // Force JPEG for better compression
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => resolve(file); // Fallback to original
    };
    reader.onerror = (err) => resolve(file); // Fallback to original
  });
};

export async function cropImage(file: File, aspectRatioStr: string): Promise<File> {
  // Parse aspect ratio string (e.g., "16:9", "3:4")
  const [w, h] = aspectRatioStr.split(':').map(Number);
  const targetRatio = w / h;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const sourceWidth = img.width;
      const sourceHeight = img.height;
      const sourceRatio = sourceWidth / sourceHeight;

      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;

      // Calculate crop dimensions to maintain target aspect ratio
      if (sourceRatio > targetRatio) {
        // Image is wider than target: Crop width
        cropWidth = sourceHeight * targetRatio;
      } else {
        // Image is taller than target: Crop height
        cropHeight = sourceWidth / targetRatio;
      }

      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Center crop
      const sourceX = (sourceWidth - cropWidth) / 2;
      const sourceY = (sourceHeight - cropHeight) / 2;

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(croppedFile);
        } else {
          reject(new Error('Canvas to Blob conversion failed'));
        }
      }, 'image/jpeg', 0.95); // High quality for intermediate crop
    };
    img.onerror = (error) => reject(error);
  });
}
