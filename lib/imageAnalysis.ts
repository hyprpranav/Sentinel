// lib/imageAnalysis.ts
// ============================================================
// Canvas-based colour extraction & dosimeter analysis
// ============================================================

import jsQR, { Point } from 'jsqr';
import { ColourFeatures } from '@/types/exposure';
export type { ColourFeatures };

export interface RegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DosimeterScanAnalysis {
  qrData: string | null;
  workerPublicId: string | null;
  colourFeatures: ColourFeatures;
  colorChangePercent: number;
  detectedColorRgb: [number, number, number];
  referenceColorRgb: [number, number, number];
  luminanceDarkeningPercent: number;
}

/**
 * Extract mean RGB values from a rectangular region of an ImageData.
 */
export function extractMeanRgb(
  imageData: ImageData,
  region: RegionBounds
): [number, number, number] {
  const { data, width } = imageData;
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  const startY = Math.max(0, Math.floor(region.y));
  const endY = Math.min(imageData.height, Math.floor(region.y + region.height));
  const startX = Math.max(0, Math.floor(region.x));
  const endX = Math.min(imageData.width, Math.floor(region.x + region.width));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      // Skip transparent or near-transparent pixels
      if (data[idx + 3] < 50) continue;
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
      count++;
    }
  }

  if (count === 0) return [250, 248, 240];
  return [
    Math.round(rSum / count),
    Math.round(gSum / count),
    Math.round(bSum / count),
  ];
}

/**
 * Convert RGB to HSV
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return [h, Math.round(s * 100), Math.round(v * 100)];
}

/**
 * Calculate Euclidean colour difference between two RGB values.
 */
export function colourDistance(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
}

/**
 * Calculate perceived luminance of an RGB value.
 */
export function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Automatically locate reference unexposed card substrate in image.
 * Samples bright, low-saturation neutral areas (the white card or paper background).
 */
export function findSubstrateReferenceRgb(imageData: ImageData): [number, number, number] {
  const { data, width, height } = imageData;
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  // Sample grid of points across image
  const step = Math.max(4, Math.floor(Math.min(width, height) / 40));
  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = getLuminance(r, g, b);

      // Card substrate is bright (lum > 200) and neutral (|r-g| < 25, |g-b| < 25)
      if (lum > 200 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) {
        rSum += r;
        gSum += g;
        bSum += b;
        count++;
      }
    }
  }

  if (count >= 10) {
    return [
      Math.round(rSum / count),
      Math.round(gSum / count),
      Math.round(bSum / count),
    ];
  }

  // Fallback: standard unexposed lead acetate / silver sensing paper blank
  return [252, 250, 242];
}

/**
 * Main analysis function.
 * Accepts an HTMLImageElement or ImageData and extracts colour features.
 */
export async function analyseStripImage(
  imageEl: HTMLImageElement,
  stripRegion?: RegionBounds,
  refRegion?: RegionBounds
): Promise<ColourFeatures> {
  const canvas = document.createElement('canvas');
  canvas.width = imageEl.naturalWidth || imageEl.width || 640;
  canvas.height = imageEl.naturalHeight || imageEl.height || 480;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(imageEl, 0, 0, canvas.width, canvas.height);

  const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Sensing strip default region (central section of dosimeter)
  const defaultStrip: RegionBounds = {
    x: Math.floor(canvas.width * 0.25),
    y: Math.floor(canvas.height * 0.35),
    width: Math.floor(canvas.width * 0.5),
    height: Math.floor(canvas.height * 0.3),
  };

  const strip = stripRegion ?? defaultStrip;
  const meanRgb = extractMeanRgb(fullImageData, strip);
  const meanHsv = rgbToHsv(...meanRgb);

  // Blank reference (either explicit region or intelligent substrate detection)
  let blankRgb: [number, number, number];
  if (refRegion) {
    blankRgb = extractMeanRgb(fullImageData, refRegion);
  } else {
    blankRgb = findSubstrateReferenceRgb(fullImageData);
  }

  const colourDiff = colourDistance(meanRgb, blankRgb);
  const normalizedDelta = parseFloat((colourDiff / 441.67).toFixed(4));

  return {
    meanRgb,
    meanHsv,
    colourDifference: parseFloat(colourDiff.toFixed(2)),
    normalizedDelta,
  };
}

/**
 * Full Dosimeter Watch/Card Analyzer:
 * 1. Decodes worker QR code from the photo
 * 2. Samples the unexposed substrate as true reference
 * 3. Samples the colorimetric sensing strip
 * 4. Computes exact darkening percentage from 0% (unexposed) to 100% (darkened metallic sulfide)
 */
export function analyseDosimeterPhoto(
  canvas: HTMLCanvasElement
): DosimeterScanAnalysis {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Unable to initialize canvas context for dosimeter analysis');
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // 1. Scan for QR code
  let qrData: string | null = null;
  let workerPublicId: string | null = null;
  let qrLocation: {
    topLeftCorner: Point;
    topRightCorner: Point;
    bottomLeftCorner: Point;
    bottomRightCorner: Point;
  } | null = null;

  try {
    const qrResult = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (qrResult && qrResult.data) {
      qrData = qrResult.data.trim();
      const extractedId = qrData.split('/').pop()?.toUpperCase() ?? '';
      if (extractedId) {
        workerPublicId = extractedId;
      }
      qrLocation = qrResult.location ?? null;
    }
  } catch (err) {
    console.warn('QR scan in image failed:', err);
  }

  // 2. Identify unexposed blank reference
  const referenceColorRgb = findSubstrateReferenceRgb(imgData);

  // 3. Determine sensing strip region
  // If QR code is found, strip is typically adjacent to or below QR code.
  // Otherwise, use central sensing zone.
  let stripBounds: RegionBounds;
  if (qrLocation && canvas.width > 200 && canvas.height > 200) {
    // If QR is on left or top, sample the companion sensing zone
    const qrRight = Math.max(qrLocation.topRightCorner.x, qrLocation.bottomRightCorner.x);
    const qrBottom = Math.max(qrLocation.bottomLeftCorner.y, qrLocation.bottomRightCorner.y);

    if (canvas.width - qrRight > canvas.width * 0.25) {
      // Sensing strip is to the right of the QR code
      stripBounds = {
        x: Math.floor(qrRight + (canvas.width - qrRight) * 0.1),
        y: Math.floor(Math.min(qrLocation.topLeftCorner.y, qrLocation.topRightCorner.y)),
        width: Math.floor((canvas.width - qrRight) * 0.7),
        height: Math.floor(qrBottom - qrLocation.topLeftCorner.y + 20),
      };
    } else {
      // Sensing strip is below
      stripBounds = {
        x: Math.floor(canvas.width * 0.2),
        y: Math.min(canvas.height - 40, Math.floor(qrBottom + 10)),
        width: Math.floor(canvas.width * 0.6),
        height: Math.floor(Math.min(canvas.height * 0.3, canvas.height - qrBottom - 10)),
      };
    }
  } else {
    // Central colorimetric window
    stripBounds = {
      x: Math.floor(canvas.width * 0.28),
      y: Math.floor(canvas.height * 0.32),
      width: Math.floor(canvas.width * 0.44),
      height: Math.floor(canvas.height * 0.36),
    };
  }

  const detectedColorRgb = extractMeanRgb(imgData, stripBounds);
  const meanHsv = rgbToHsv(...detectedColorRgb);
  const colourDiff = colourDistance(detectedColorRgb, referenceColorRgb);

  // 4. Calculate real percentage of darkening from normal to darkened
  const blankLum = getLuminance(...referenceColorRgb);
  const stripLum = getLuminance(...detectedColorRgb);

  // Maximum darkening baseline: metallic sulfide (PbS / Ag2S) reaches ~30 luminance
  const minLuminanceSaturated = 32;
  const maxAvailableDrop = Math.max(1, blankLum - minLuminanceSaturated);
  const actualDrop = Math.max(0, blankLum - stripLum);

  // Darkening ratio based on luminance drop
  let darkeningPercent = Math.round((actualDrop / maxAvailableDrop) * 100);

  // If color difference is negligible (< 14) and luminance drop is minimal, it's clean (0% exposure)
  if (colourDiff < 14 && actualDrop < 10) {
    darkeningPercent = 0;
  } else if (colourDiff > 25 && darkeningPercent < 15) {
    // Chromatic shift (yellowish / amber staining) even before complete blackening
    const chromaticRatio = Math.min(100, Math.round((colourDiff / 160) * 100));
    darkeningPercent = Math.max(darkeningPercent, chromaticRatio);
  }

  darkeningPercent = Math.min(100, Math.max(0, darkeningPercent));

  const colourFeatures: ColourFeatures = {
    meanRgb: detectedColorRgb,
    meanHsv,
    colourDifference: parseFloat(colourDiff.toFixed(2)),
    normalizedDelta: parseFloat((colourDiff / 441.67).toFixed(4)),
  };

  return {
    qrData,
    workerPublicId,
    colourFeatures,
    colorChangePercent: darkeningPercent,
    detectedColorRgb,
    referenceColorRgb,
    luminanceDarkeningPercent: darkeningPercent,
  };
}

/**
 * Capture a frame from a video element to a Blob.
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  quality = 0.94
): Promise<{ blob: Blob; dataUrl: string; canvas: HTMLCanvasElement }> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      quality
    );
  });

  return { blob, dataUrl, canvas };
}

/**
 * Simulate colour analysis for DEMO MODE when no real camera image is available.
 */
export function simulateDemoAnalysis(exposureLevel: 'low' | 'moderate' | 'high' | 'critical'): ColourFeatures {
  const presets: Record<string, ColourFeatures> = {
    low:      { meanRgb: [224, 205, 175], meanHsv: [30, 22, 88], colourDifference: 35.4,  normalizedDelta: 0.080 },
    moderate: { meanRgb: [170, 130,  92], meanHsv: [28, 46, 67], colourDifference: 98.3, normalizedDelta: 0.222 },
    high:     { meanRgb: [118,  72,  48], meanHsv: [22, 59, 46], colourDifference: 165.7, normalizedDelta: 0.375 },
    critical: { meanRgb: [ 68,  32,  18], meanHsv: [20, 74, 27], colourDifference: 242.2, normalizedDelta: 0.548 },
  };
  return presets[exposureLevel] ?? presets.low;
}
