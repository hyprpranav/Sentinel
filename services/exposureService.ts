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

export async function getWorkerExposureHistory(
  workerId: string,
  days: 7 | 15 | 30 = 15
): Promise<ExposureRecord[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.EXPOSURE_RECORDS),
      where('workerId', '==', workerId),
      where('createdAt', '>=', Timestamp.fromDate(since)),
      orderBy('createdAt', 'desc')
    )
  );

  return snap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>));
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
