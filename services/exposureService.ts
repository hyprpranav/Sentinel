// services/exposureService.ts
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { ExposureRecord } from '@/types/exposure';
import { toFirestoreDate } from '@/lib/utils/date';

function docToRecord(id: string, data: Record<string, unknown>): ExposureRecord {
  return {
    id,
    workerId: data.workerId as string,
    workerName: data.workerName as string | undefined,
    workerPublicId: data.workerPublicId as string | undefined,
    managerId: data.managerId as string,
    managerName: data.managerName as string | undefined,
    timestamp: toFirestoreDate(data.timestamp as Timestamp) ?? new Date(),
    shift: data.shift as ExposureRecord['shift'],
    cartridgeId: data.cartridgeId as string | undefined,
    imageUrl: data.imageUrl as string | undefined,
    stripExpiryDate: data.stripExpiryDate as string | undefined,
    estimatedDosePpmH: data.estimatedDosePpmH as number,
    monitoringDuration: data.monitoringDuration as number,
    estimatedAverageExposure: data.estimatedAverageExposure as number,
    temperature: data.temperature as number | undefined,
    humidity: data.humidity as number | undefined,
    colourFeatures: data.colourFeatures as ExposureRecord['colourFeatures'],
    calibrationModelVersion: data.calibrationModelVersion as string,
    dosimeterStatus: data.dosimeterStatus as ExposureRecord['dosimeterStatus'],
    notes: data.notes as string | undefined,
    status: (data.status as ExposureRecord['status']) || 'pending',
    reviewerRemarks: data.reviewerRemarks as string | undefined,
    isPublicVisible: data.isPublicVisible as boolean ?? false,
    capturedByUid: data.capturedByUid as string | undefined,
    capturedByRole: data.capturedByRole as ExposureRecord['capturedByRole'],
    capturedByName: data.capturedByName as string | undefined,
    createdAt: toFirestoreDate(data.createdAt as Timestamp) ?? new Date(),
  };
}

export async function saveExposureRecord(
  record: Omit<ExposureRecord, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.EXPOSURE_RECORDS), {
    ...record,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  // Update worker's lastScanAt and dosimeterStatus
  const workerRef = doc(db, COLLECTIONS.WORKERS, record.workerId);
  await updateDoc(workerRef, {
    lastScanAt: serverTimestamp(),
    dosimeterStatus: record.dosimeterStatus,
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

/**
 * Fetch exposure history for a worker filtered by recent days.
 * Falls back to unordered query if the composite index is not yet deployed.
 */
export async function getWorkerExposureHistory(
  workerId: string,
  days: 7 | 15 | 30 = 15
): Promise<ExposureRecord[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.EXPOSURE_RECORDS),
        where('workerId', '==', workerId),
        where('createdAt', '>=', Timestamp.fromDate(since)),
        orderBy('createdAt', 'desc')
      )
    );
    return snap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    // Composite index may not exist yet — fall back to unordered query
    console.warn('Exposure history ordered query failed, falling back:', err);
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.EXPOSURE_RECORDS),
        where('workerId', '==', workerId),
        limit(200)
      )
    );
    const records = snap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>));
    return records
      .filter((r) => r.createdAt >= since)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

/**
 * Fetch ALL exposure history for a worker with no date filter.
 * Used for the "ALL TIME" view in the worker detail page.
 * Falls back to unordered query if the composite index is missing.
 */
export async function getAllWorkerExposureHistory(workerId: string): Promise<ExposureRecord[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.EXPOSURE_RECORDS),
        where('workerId', '==', workerId),
        orderBy('createdAt', 'desc'),
        limit(500)
      )
    );
    return snap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.warn('All-time exposure ordered query failed, falling back:', err);
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.EXPOSURE_RECORDS),
        where('workerId', '==', workerId),
        limit(500)
      )
    );
    return snap.docs
      .map((d) => docToRecord(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export interface WorkerExposureSummary {
  totalScans: number;
  totalMonitoringDays: number;
  latestDose: number | null;
  latestDate: Date | null;
  latestStripExpiry: string | null;
  latestDosimeterStatus: ExposureRecord['dosimeterStatus'] | null;
  firstScanDate: Date | null;
}

/**
 * Compute a summary of a worker's full exposure history.
 */
export async function getWorkerExposureSummary(workerId: string): Promise<WorkerExposureSummary> {
  const records = await getAllWorkerExposureHistory(workerId);
  if (records.length === 0) {
    return {
      totalScans: 0,
      totalMonitoringDays: 0,
      latestDose: null,
      latestDate: null,
      latestStripExpiry: null,
      latestDosimeterStatus: null,
      firstScanDate: null,
    };
  }
  const sorted = [...records].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const first = sorted[sorted.length - 1];
  const latest = sorted[0];
  // Count unique monitoring days
  const uniqueDays = new Set(records.map((r) => r.createdAt.toDateString())).size;

  return {
    totalScans: records.length,
    totalMonitoringDays: uniqueDays,
    latestDose: latest.estimatedDosePpmH,
    latestDate: latest.createdAt,
    latestStripExpiry: latest.stripExpiryDate ?? null,
    latestDosimeterStatus: latest.dosimeterStatus,
    firstScanDate: first.createdAt,
  };
}

export async function getAllExposureRecords(limitCount = 50): Promise<ExposureRecord[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.EXPOSURE_RECORDS),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
  );
  return snap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>));
}

export async function getRecentScans(managerId?: string, limitCount = 10): Promise<ExposureRecord[]> {
  const q = managerId
    ? query(
        collection(db, COLLECTIONS.EXPOSURE_RECORDS),
        where('managerId', '==', managerId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    : query(
        collection(db, COLLECTIONS.EXPOSURE_RECORDS),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

  const snap = await getDocs(q);
  return snap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>));
}

export async function getPublicWorkerExposure(workerId: string): Promise<ExposureRecord[]> {
  const since = new Date();
  since.setDate(since.getDate() - 15);

  const snap = await getDocs(
    query(collection(db, COLLECTIONS.EXPOSURE_RECORDS), where('isPublicVisible', '==', true), limit(100))
  );
  return snap.docs
    .map((d) => docToRecord(d.id, d.data() as Record<string, unknown>))
    .filter((record) => record.workerId === workerId && record.createdAt >= since)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 15);
}

export async function getPendingScans(managerId?: string): Promise<ExposureRecord[]> {
  const q = managerId
    ? query(
        collection(db, COLLECTIONS.EXPOSURE_RECORDS),
        where('managerId', '==', managerId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      )
    : query(
        collection(db, COLLECTIONS.EXPOSURE_RECORDS),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

  const snap = await getDocs(q);
  return snap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>));
}

export async function updateScanStatus(
  scanId: string,
  status: 'approved' | 'rejected',
  remarks: string
): Promise<void> {
  const ref = doc(db, COLLECTIONS.EXPOSURE_RECORDS, scanId);
  await updateDoc(ref, {
    status,
    reviewerRemarks: remarks,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fetch all exposure records for workers managed by a given manager.
 * Used for manager-level export.
 */
export async function getExposureRecordsByManager(managerId: string): Promise<ExposureRecord[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.EXPOSURE_RECORDS),
        where('managerId', '==', managerId),
        orderBy('createdAt', 'desc'),
        limit(1000)
      )
    );
    return snap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>));
  } catch {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.EXPOSURE_RECORDS),
        where('managerId', '==', managerId),
        limit(1000)
      )
    );
    return snap.docs
      .map((d) => docToRecord(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
