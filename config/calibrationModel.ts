// config/calibrationModel.ts
// ============================================================
// DEMO CALIBRATION MODEL - v0.1
// ============================================================
// STATUS: UNVALIDATED_DEMO
// This is a placeholder linear regression model for prototype
// demonstration purposes only. The coefficients here are NOT
// derived from validated H₂S sensing chemistry.
//
// TO REPLACE: When a validated calibration dataset is available,
// update the coefficients below or swap this file for a model
// loaded from Firestore (adminSettings/calibration).
// ============================================================

import { CalibrationModel } from '@/types/calibration';

export const DEMO_CALIBRATION_MODEL: CalibrationModel = {
  modelVersion: 'demo-v0.1',
  validationStatus: 'UNVALIDATED_DEMO',
  description:
    'Placeholder linear model for SIH prototype demonstration only. Not scientifically validated. Replace with validated chemistry-derived coefficients before production use.',
  inputFeatures: ['meanRed', 'meanGreen', 'meanBlue', 'colourDifference'],
  coefficients: {
    intercept: 0,
    meanRed: -0.045,
    meanGreen: 0.018,
    meanBlue: 0.008,
    colourDifference: 0.82,
  },
  doseRanges: [
    {
      label: 'Low',
      min: 0,
      max: 5,
      colour: '#16a34a',
      action: 'No immediate action required. Continue monitoring.',
    },
    {
      label: 'Moderate',
      min: 5,
      max: 20,
      colour: '#ca8a04',
      action: 'Review exposure conditions. Consider rotation.',
    },
    {
      label: 'High',
      min: 20,
      max: 50,
      colour: '#ea580c',
      action: 'Immediate review required. Notify supervisor.',
    },
    {
      label: 'Critical',
      min: 50,
      max: Infinity,
      colour: '#dc2626',
      action: 'Remove worker from area. Medical evaluation required.',
    },
  ],
  temperatureCompensation: {
    enabled: false,
    referenceTemp: 25,
    coefficient: 0.02,
  },
  humidityCompensation: {
    enabled: false,
    referenceHumidity: 50,
    coefficient: 0.01,
  },
  referenceColours: [
    { label: 'Blank (Zero Exposure)', rgb: [255, 252, 245], expectedDose: 0 },
    { label: 'Low Exposure', rgb: [220, 195, 165], expectedDose: 3 },
    { label: 'Moderate Exposure', rgb: [175, 135, 95], expectedDose: 12 },
    { label: 'High Exposure', rgb: [120, 75, 50], expectedDose: 35 },
    { label: 'Critical Exposure', rgb: [70, 35, 20], expectedDose: 65 },
  ],
  validityPeriodDays: 30,
  warningThresholds: {
    twaOelPpm: 1,   // OSHA TWA OEL for H₂S
    stelPpm: 5,     // OSHA STEL for H₂S
    immediatelyDangerousPpmH: 50,
  },
};

// ============================================================
// Dose estimation function
// Replace the body of this function when a validated model is available.
// The function signature must remain the same.
// ============================================================

interface EstimationInput {
  meanRgb: [number, number, number];
  colourDifference: number;
  colorChangePercent?: number;
  monitoringDuration: number; // hours
  temperature?: number;
  humidity?: number;
  model?: CalibrationModel;
}

interface EstimationResult {
  estimatedDosePpmH: number;
  estimatedAverageExposure: number; // ppm (dose / duration)
  estimatedTwa: number; // 8-hour TWA (ppm)
  colorChangePercent: number;
  environmentalCorrection: number;
  detectedColor: string;
  referenceColor: string;
  doseLabel: string;
  doseColour: string;
  modelVersion: string;
  isDemo: boolean;
  warnings: string[];
}

export function estimateDose(input: EstimationInput): EstimationResult {
  const model = input.model ?? DEMO_CALIBRATION_MODEL;
  const [r, g, b] = input.meanRgb;
  const { colourDifference, monitoringDuration } = input;

  // Calculate percentage color change: use explicitly measured darkening or calculate from colourDifference
  const colorChangePercent = input.colorChangePercent !== undefined
    ? Math.min(100, Math.max(0, Math.round(input.colorChangePercent)))
    : Math.min(100, Math.max(0, Math.round((colourDifference / 180) * 100)));

  // Dose calculation: directly proportional to colorimetric chemical darkening
  // 0% darkening = 0.0 ppm·h (clean/unexposed)
  // 20% darkening = ~11 ppm·h (moderate threshold)
  // 50% darkening = ~27.5 ppm·h (high threshold)
  // 100% darkening = ~55 ppm·h (critical saturation)
  let rawDose: number;
  if (input.colorChangePercent !== undefined) {
    rawDose = (colorChangePercent / 100) * 55;
  } else {
    // Fallback linear model
    rawDose =
      model.coefficients.intercept +
      model.coefficients.meanRed * r +
      model.coefficients.meanGreen * g +
      model.coefficients.meanBlue * b +
      model.coefficients.colourDifference * colourDifference;
  }

  rawDose = Math.max(0, rawDose); // dose cannot be negative

  // Environmental compensation (Temperature & Humidity)
  let environmentalCorrection = 1.0;
  if (input.temperature !== undefined || input.humidity !== undefined) {
    const temp = input.temperature ?? 25;
    const hum = input.humidity ?? 50;
    const tempDelta = temp - 25;
    const humDelta = hum - 50;
    environmentalCorrection = 1 + (tempDelta * 0.002) + (humDelta * 0.001);
    environmentalCorrection = Math.min(1.25, Math.max(0.85, parseFloat(environmentalCorrection.toFixed(4))));
    rawDose *= environmentalCorrection;
  }

  const duration = monitoringDuration > 0 ? monitoringDuration : 8;
  const estimatedAverageExposure = rawDose / duration;
  const estimatedTwa = rawDose / 8; // standard 8-hour shift Time Weighted Average

  // Find dose range label
  const range = model.doseRanges.find((r) => rawDose >= r.min && rawDose < r.max);
  const doseLabel = range?.label ?? 'Normal / Low';
  const doseColour = range?.colour ?? '#16a34a';

  // Build warnings & scientific disclaimers
  const warnings: string[] = [];
  if (rawDose >= model.warningThresholds.immediatelyDangerousPpmH) {
    warnings.push('CRITICAL: Cumulative exposure exceeds immediately dangerous threshold.');
  }
  if (estimatedAverageExposure > model.warningThresholds.twaOelPpm) {
    warnings.push(
      `Estimated average exposure (${estimatedAverageExposure.toFixed(2)} ppm) exceeds TWA OEL (${model.warningThresholds.twaOelPpm} ppm).`
    );
  }
  if (model.validationStatus === 'UNVALIDATED_DEMO') {
    warnings.push(
      'PROTOTYPE CALIBRATION: This estimate is derived from a prototype colorimetric response model for demonstration purposes and is not yet scientifically validated.'
    );
  }

  return {
    estimatedDosePpmH: parseFloat(rawDose.toFixed(2)),
    estimatedAverageExposure: parseFloat(estimatedAverageExposure.toFixed(3)),
    estimatedTwa: parseFloat(estimatedTwa.toFixed(3)),
    colorChangePercent,
    environmentalCorrection,
    detectedColor: `rgb(${r}, ${g}, ${b})`,
    referenceColor: 'rgb(255, 252, 245)',
    doseLabel,
    doseColour,
    modelVersion: model.modelVersion,
    isDemo: model.validationStatus === 'UNVALIDATED_DEMO',
    warnings,
  };
}
