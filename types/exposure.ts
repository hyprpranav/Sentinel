// types/exposure.ts
import { DosimeterStatus } from './worker';

export type Shift = 'morning' | 'afternoon' | 'night';

export interface ColourFeatures {
  meanRgb: [number, number, number];
  meanHsv: [number, number, number];
  labValues?: [number, number, number];
  colourDifference?: number;
  responseLength?: number;
  normalizedDelta?: number;
}

export interface ExposureRecord {
  id: string;
  workerId: string;
  workerName?: string;
  workerPublicId?: string;
  managerId: string;
  managerName?: string;
  timestamp: Date;
  shift: Shift;
  cartridgeId?: string;
  imageUrl?: string;
  stripExpiryDate?: string;
  estimatedDosePpmH: number;
  monitoringDuration: number; // hours
  estimatedAverageExposure: number; // ppm
  temperature?: number;
  humidity?: number;
  colourFeatures?: ColourFeatures;
  calibrationModelVersion: string;
  dosimeterStatus: DosimeterStatus;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerRemarks?: string;
  isPublicVisible: boolean;
  createdAt: Date;
}

export interface ExposureSummary {
  totalScans: number;
  latestDose: number;
  latestDate: Date;
  averageExposure: number;
  maxExposure: number;
  dosimeterStatus: DosimeterStatus;
}
