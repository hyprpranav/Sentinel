// lib/utils/expiryDetector.ts
import { ExpiryStatus } from '@/types/exposure';

export interface ExpiryDetectionResult {
  detectedDate: string;
  expiryStatus: ExpiryStatus;
  daysRemaining?: number;
  isAuthoritative: boolean;
}

/**
 * Parse date strings in common manufacturing formats:
 * DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();

  // Pattern: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  // Pattern: YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Compare an expiry date against the current date and assign status:
 * VALID: >30 days remaining
 * EXPIRING_SOON: 0 to 30 days remaining
 * EXPIRED: date is in the past
 * UNREADABLE: date string is invalid/empty
 */
export function evaluateExpiryStatus(dateInput?: string | Date | null): {
  status: ExpiryStatus;
  daysRemaining?: number;
} {
  if (!dateInput) return { status: 'UNREADABLE' };

  const expDate = typeof dateInput === 'string' ? parseDateString(dateInput) : dateInput;
  if (!expDate || isNaN(expDate.getTime())) {
    return { status: 'UNREADABLE' };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expDay = new Date(expDate);
  expDay.setHours(0, 0, 0, 0);

  const diffMs = expDay.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'EXPIRED', daysRemaining: diffDays };
  } else if (diffDays <= 30) {
    return { status: 'EXPIRING_SOON', daysRemaining: diffDays };
  } else {
    return { status: 'VALID', daysRemaining: diffDays };
  }
}

/**
 * Attempt to extract and evaluate printed expiry date from detected cartridge text or OCR.
 * Example formats on physical strip:
 * "EXP DATE: 08/09/2026"
 * "EXP: 15/12/2026"
 */
export function detectPrintedExpiryDate(extractedText?: string): ExpiryDetectionResult {
  if (!extractedText) {
    return {
      detectedDate: '',
      expiryStatus: 'UNREADABLE',
      isAuthoritative: false,
    };
  }

  // Common printed cartridge labels
  const patterns = [
    /(?:EXP\s*DATE|EXPIRY|EXP)[\s.:-]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /(\d{1,2}[/-]\d{1,2}[/-]\d{4})/,
  ];

  for (const pat of patterns) {
    const match = extractedText.match(pat);
    if (match && match[1]) {
      const rawDate = match[1];
      const parsed = parseDateString(rawDate);
      if (parsed) {
        const { status, daysRemaining } = evaluateExpiryStatus(parsed);
        const formatted = parsed.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        return {
          detectedDate: formatted,
          expiryStatus: status,
          daysRemaining,
          isAuthoritative: true,
        };
      }
    }
  }

  return {
    detectedDate: '',
    expiryStatus: 'UNREADABLE',
    isAuthoritative: false,
  };
}
