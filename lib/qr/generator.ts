// lib/qr/generator.ts
import QRCode from 'qrcode';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * Generate a public worker QR code that links to the emergency ID page.
 * The QR encodes a URL, NOT sensitive personal data.
 */
export function getWorkerQRUrl(publicId: string): string {
  return `${APP_URL}/worker/${publicId}`;
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
