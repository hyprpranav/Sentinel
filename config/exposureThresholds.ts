// config/exposureThresholds.ts
// OSHA / NIOSH H₂S Occupational Exposure Limits
// Source references — verify with current regulatory standards before production use.

export const EXPOSURE_THRESHOLDS = {
  // Time-Weighted Average (8-hour) OEL
  TWA_OEL_PPM: 1,

  // Short-Term Exposure Limit (15-minute)
  STEL_PPM: 5,

  // Immediately Dangerous to Life and Health
  IDLH_PPM: 50,

  // Odour threshold (general awareness — wide range in literature)
  ODOUR_THRESHOLD_PPM: 0.01,

  // Cumulative dose thresholds (ppm·h)
  CUMULATIVE_LOW_PPMH: 5,
  CUMULATIVE_MODERATE_PPMH: 20,
  CUMULATIVE_HIGH_PPMH: 50,
} as const;

export const DOSE_LABELS = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  CRITICAL: 'Critical',
} as const;

export function getDoseCategory(ppmH: number): {
  label: string;
  colour: string;
  bgColour: string;
  action: string;
} {
  if (ppmH < EXPOSURE_THRESHOLDS.CUMULATIVE_LOW_PPMH) {
    return {
      label: 'Low',
      colour: '#16a34a',
      bgColour: '#f0fdf4',
      action: 'No immediate action required. Continue monitoring.',
    };
  } else if (ppmH < EXPOSURE_THRESHOLDS.CUMULATIVE_MODERATE_PPMH) {
    return {
      label: 'Moderate',
      colour: '#ca8a04',
      bgColour: '#fefce8',
      action: 'Review exposure conditions. Consider worker rotation.',
    };
  } else if (ppmH < EXPOSURE_THRESHOLDS.CUMULATIVE_HIGH_PPMH) {
    return {
      label: 'High',
      colour: '#ea580c',
      bgColour: '#fff7ed',
      action: 'Immediate review required. Notify supervisor.',
    };
  } else {
    return {
      label: 'Critical',
      colour: '#dc2626',
      bgColour: '#fef2f2',
      action: 'Remove worker from hazardous area. Medical evaluation required.',
    };
  }
}
