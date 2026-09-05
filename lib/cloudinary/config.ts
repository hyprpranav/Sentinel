// lib/cloudinary/config.ts
// Cloudinary upload utility
// Uses unsigned upload preset for client-side uploads.
// Signed uploads can be implemented via API route for production.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'sentinel_unsigned';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
}

export async function uploadToCloudinary(
  file: File | Blob,
  folder: 'sentinel/workers' | 'sentinel/dosimeter-scans',
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME) {
    throw new Error('Cloudinary cloud name not configured. Check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResult);
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload network error')));
    xhr.open('POST', url);
    xhr.send(formData);
  });
}

export function getOptimizedUrl(publicId: string, width = 400): string {
  if (!CLOUD_NAME) return '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_${width},c_fill,q_auto,f_auto/${publicId}`;
}
