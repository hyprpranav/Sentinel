// lib/qr/generator.ts
import QRCode from 'qrcode';

const PRODUCTION_APP_URL = 'https://sentineltrack.vercel.app';

function getAppUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_APP_URL;
}

/**
 * Generate a public worker QR code that links to the emergency ID page.
 * The QR encodes a URL, NOT sensitive personal data.
 */
export function getWorkerQRUrl(publicId: string): string {
  return `${getAppUrl()}/worker/${encodeURIComponent(publicId)}`;
}

/**
 * Generate a QR code as a data URL (PNG) for use in <img> tags or canvas.
 */
export async function generateQRDataUrl(
  data: string,
  size = 200
): Promise<string> {
  return QRCode.toDataURL(data, {
    width: size,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Generate a QR code as an SVG string.
 */
export async function generateQRSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}
