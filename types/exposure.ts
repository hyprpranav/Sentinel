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

export type ExpiryStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNREADABLE';

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
  detectedExpiryDate?: string;
  expiryStatus?: ExpiryStatus;
  estimatedDosePpmH: number;
  monitoringDuration: number; // hours
  estimatedAverageExposure: number; // ppm
  estimatedTwa?: number; // 8-hour TWA
  colorChangePercent?: number;
  detectedColor?: string;
  referenceColor?: string;
  temperature?: number;
  humidity?: number;
  location?: string;
  weather?: string;
  environmentalCorrection?: number;
  colourFeatures?: ColourFeatures;
  calibrationModelVersion: string;
  dosimeterStatus: DosimeterStatus;
  analysisStatus?: 'completed' | 'requires_review' | 'demo';
  confirmationStatus?: 'confirmed' | 'auto_saved' | 'approved';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerRemarks?: string;
  isPublicVisible: boolean;
  capturedByUid?: string;
  capturedByRole?: 'worker' | 'manager' | 'admin';
  capturedByName?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  peerScannerName?: string;
  qrId?: string;
  scanDate?: string;
  scanTime?: string;
  createdAt: Date;
}

export interface ScanApprovalRequest {
  id: string;
  scannerUid: string;
  scannerWorkerId?: string;
  scannerName: string;
  scannerRole: 'worker';
  targetWorkerId: string;
  targetWorkerName: string;
  targetWorkerPublicId: string;
  targetWorkerUid?: string;
  imageUrl: string;
  scanTimestamp: Date;
  shift: Shift;
  monitoringDuration: number;
  estimatedDosePpmH: number;
  estimatedAverageExposure: number;
  estimatedTwa?: number;
  colorChangePercent: number;
  temperature?: number;
  humidity?: number;
  location?: string;
  weather?: string;
  environmentalCorrection?: number;
  detectedExpiryDate?: string;
  expiryStatus?: ExpiryStatus;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  remarks?: string;
  reviewedByUid?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  createdAt: Date;
  exposureRecordId?: string;
}

export interface ExposureSummary {
  totalScans: number;
  latestDose: number;
  latestDate: Date;
  averageExposure: number;
  maxExposure: number;
  dosimeterStatus: DosimeterStatus;
}
