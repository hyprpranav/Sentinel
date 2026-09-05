// types/calibration.ts
export interface CalibrationModel {
  modelVersion: string;
  validationStatus: 'UNVALIDATED_DEMO' | 'VALIDATED' | 'UNDER_REVIEW';
  description: string;
  inputFeatures: string[];
  coefficients: Record<string, number>;
  doseRanges: DoseRange[];
  temperatureCompensation: {
    enabled: boolean;
    referenceTemp: number;
    coefficient?: number;
  };
  humidityCompensation: {
    enabled: boolean;
    referenceHumidity: number;
    coefficient?: number;
  };
  referenceColours: ReferenceColour[];
  validityPeriodDays: number;
  warningThresholds: {
    twaOelPpm: number;
    stelPpm: number;
    immediatelyDangerousPpmH: number;
  };
  updatedAt?: Date;
  updatedBy?: string;
}

export interface DoseRange {
  label: string;
  min: number;
  max: number;
  colour: string;
  action?: string;
}

export interface ReferenceColour {
  label: string;
  rgb: [number, number, number];
  expectedDose?: number;
}
