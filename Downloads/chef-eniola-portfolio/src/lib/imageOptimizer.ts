/**
 * Image Optimization Utility
 * Uses Supabase's built-in image transformation API
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'origin';
}

/**
 * Optimizes Supabase storage images using transformation API
 * @param url - The original Supabase storage URL
 * @param options - Transformation options
 * @returns Optimized image URL
 */
export function optimizeSupabaseImage(
  url: string,
  options: ImageTransformOptions = {}
): string {
  // If it's not a Supabase storage URL, return as is
  if (!url || !url.includes('supabase')) {
    return url;
  }

  const { width, height, quality = 80, format = 'webp' } = options;

  // Build transformation parameters
  const params = new URLSearchParams();
  
  if (width) params.append('width', width.toString());
  if (height) params.append('height', height.toString());
  params.append('quality', quality.toString());
  if (format !== 'origin') params.append('format', format);

  // Add transformation parameters to URL
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
}

/**
 * Get responsive image URLs for different screen sizes
 */
export function getResponsiveImageUrls(url: string) {
  return {
    mobile: optimizeSupabaseImage(url, { width: 640, quality: 75 }),
    tablet: optimizeSupabaseImage(url, { width: 1024, quality: 80 }),
    desktop: optimizeSupabaseImage(url, { width: 1920, quality: 85 }),
    thumbnail: optimizeSupabaseImage(url, { width: 300, quality: 70 }),
  };
}

/**
 * Compress image before upload (client-side)
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

/**
 * Compress video before upload (reduces file size)
 */
export function getVideoCompressionSettings() {
  return {
    maxSize: 50 * 1024 * 1024, // 50MB max
    acceptedFormats: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    recommendedResolution: '1280x720',
  };
}
