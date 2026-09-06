// config/demoData.ts
// ============================================================
// DEMO DATA — FOR PRESENTATION / PROTOTYPE ONLY
// These records are clearly marked as demonstration data.
// They must NOT be mixed with real production records.
// ============================================================

import { Worker } from '@/types/worker';
import { ExposureRecord } from '@/types/exposure';

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const DEMO_WORKERS: Partial<Worker>[] = [
  {
    publicId: 'SNT-W-1042',
    fullName: 'Arun Kumar Sharma',
    department: 'Process Unit — CDU',
    designation: 'Process Operator',
    status: 'active',
    dosimeterStatus: 'valid',
  },
  {
    publicId: 'SNT-W-1043',
    fullName: 'Rajesh Nair',
    department: 'Utility Block',
    designation: 'Senior Operator',
    status: 'active',
    dosimeterStatus: 'expiring',
  },
  {
    publicId: 'SNT-W-1044',
    fullName: 'Priya Menon',
    department: 'HSE Department',
    designation: 'Safety Officer',
    status: 'active',
    dosimeterStatus: 'valid',
  },
];

export const DEMO_EXPOSURE_RECORDS: Partial<ExposureRecord>[] = [
  {
    estimatedDosePpmH: 2.4,
    monitoringDuration: 8,
    estimatedAverageExposure: 0.3,
    dosimeterStatus: 'valid',
    calibrationModelVersion: 'demo-v0.1',
    isPublicVisible: true,
  },
  {
    estimatedDosePpmH: 6.8,
    monitoringDuration: 8,
    estimatedAverageExposure: 0.85,
    dosimeterStatus: 'valid',
    calibrationModelVersion: 'demo-v0.1',
    isPublicVisible: true,
  },
  {
    estimatedDosePpmH: 14.2,
    monitoringDuration: 8,
    estimatedAverageExposure: 1.77,
    dosimeterStatus: 'valid',
    calibrationModelVersion: 'demo-v0.1',
    isPublicVisible: true,
  },
];
