// lib/firebase/firestore.ts
// Firestore collection names and helper utilities

export const COLLECTIONS = {
  USERS: 'users',
  WORKERS: 'workers',
  MANAGERS: 'managers',
  WORKER_REQUESTS: 'workerRequests',
  EXPOSURE_RECORDS: 'exposureRecords',
  DOSIMETERS: 'dosimeters',
  CALIBRATION_MODELS: 'calibrationModels',
  AUDIT_LOGS: 'auditLogs',
  ADMIN_SETTINGS: 'adminSettings',
  QR_RECORDS: 'qrRecords',
} as const;

export function generateWorkerId(sequence: number): string {
  return `SNT-W-${1000 + sequence}`;
}

export function generateCartridgeId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SNT-C-${ts}-${rand}`;
}
