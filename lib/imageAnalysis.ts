// lib/imageAnalysis.ts
// ============================================================
// Canvas-based colour extraction for dosimeter sensing strip
// ============================================================
// This module extracts colour features from a captured image
// using the browser Canvas API. It is designed to be replaced
// or supplemented with a more sophisticated model when
// validated sensing chemistry data is available.
// ============================================================

import { ColourFeatures } from '@/types/exposure';

export interface RegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extract mean RGB values from a rectangular region of an ImageData.
 */
function extractMeanRgb(
  imageData: ImageData,
  region: RegionBounds
): [number, number, number] {
  const { data, width } = imageData;
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      const idx = (y * width + x) * 4;
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
      count++;
    }
  }

  if (count === 0) return [0, 0, 0];
  return [
    Math.round(rSum / count),
    Math.round(gSum / count),
    Math.round(bSum / count),
  ];
}

/**
 * Convert RGB to HSV
 */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
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
function colourDistance(
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
 * Main analysis function.
 * 
 * Accepts an HTMLImageElement or ImageData from the capture canvas,
 * and optional region bounds for the sensing strip vs. reference scale.
 *
 * Returns extracted colour features for dose estimation.
 */
export async function analyseStripImage(
  imageEl: HTMLImageElement,
  stripRegion?: RegionBounds,   // sensing strip region (defaults to full image)
  refRegion?: RegionBounds      // reference colour scale region (optional)
): Promise<ColourFeatures> {
  const canvas = document.createElement('canvas');
  canvas.width = imageEl.naturalWidth || imageEl.width;
  canvas.height = imageEl.naturalHeight || imageEl.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageEl, 0, 0);

  const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Default to central 50% of image for strip region
  const defaultStrip: RegionBounds = {
    x: Math.floor(canvas.width * 0.25),
    y: Math.floor(canvas.height * 0.35),
    width: Math.floor(canvas.width * 0.5),
    height: Math.floor(canvas.height * 0.3),
  };

  const strip = stripRegion ?? defaultStrip;
  const meanRgb = extractMeanRgb(fullImageData, strip);
  const meanHsv = rgbToHsv(...meanRgb);

  // Blank reference - top of image by default
  const blankRegion: RegionBounds = {
    x: Math.floor(canvas.width * 0.05),
    y: Math.floor(canvas.height * 0.05),
    width: Math.floor(canvas.width * 0.15),
    height: Math.floor(canvas.height * 0.1),
  };

  let colourDifference: number | undefined;
  if (refRegion) {
    const refRgb = extractMeanRgb(fullImageData, refRegion);
    colourDifference = colourDistance(meanRgb, refRgb);
  } else {
    // Use blank reference from top of image
    const blankRgb = extractMeanRgb(fullImageData, blankRegion);
    colourDifference = colourDistance(meanRgb, blankRgb);
  }

  // Normalized delta: colourDifference as fraction of max possible distance (441.67)
  const normalizedDelta = parseFloat((colourDifference / 441.67).toFixed(4));

  return {
    meanRgb,
    meanHsv,
    colourDifference: parseFloat(colourDifference.toFixed(2)),
    normalizedDelta,
  };
}

/**
 * Capture a frame from a video element to a Blob.
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  quality = 0.92
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      quality
    );
  });

  return { blob, dataUrl };
}

/**
 * Simulate colour analysis for DEMO MODE when no real camera image is available.
 * Returns plausible-looking but clearly synthetic values.
 */
export function simulateDemoAnalysis(exposureLevel: 'low' | 'moderate' | 'high' | 'critical'): ColourFeatures {
  const presets: Record<string, ColourFeatures> = {
    low:      { meanRgb: [218, 195, 168], meanHsv: [30, 23, 85], colourDifference: 52.4,  normalizedDelta: 0.119 },
    moderate: { meanRgb: [170, 130,  92], meanHsv: [28, 46, 67], colourDifference: 128.3, normalizedDelta: 0.291 },
    high:     { meanRgb: [118,  72,  48], meanHsv: [22, 59, 46], colourDifference: 231.7, normalizedDelta: 0.524 },
    critical: { meanRgb: [ 68,  32,  18], meanHsv: [20, 74, 27], colourDifference: 354.2, normalizedDelta: 0.802 },
  };
  return presets[exposureLevel] ?? presets.low;
}
