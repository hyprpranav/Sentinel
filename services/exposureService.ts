import {
  collection,
  addDoc,
  getDocs,
  getDoc,
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
import { ExposureRecord, ScanApprovalRequest } from '@/types/exposure';
import { toFirestoreDate } from '@/lib/utils/date';

function docToRecord(id: string, data: Record<string, unknown>): ExposureRecord {
  return {
    id,
    workerId: data.workerId as string,
    workerName: data.workerName as string | undefined,
    workerPublicId: data.workerPublicId as string | undefined,
    managerId: (data.managerId as string) || '',
    managerName: data.managerName as string | undefined,
    timestamp: toFirestoreDate(data.timestamp as Timestamp) ?? new Date(),
    shift: (data.shift as ExposureRecord['shift']) || 'morning',
    cartridgeId: data.cartridgeId as string | undefined,
    imageUrl: data.imageUrl as string | undefined,
    stripExpiryDate: data.stripExpiryDate as string | undefined,
    detectedExpiryDate: (data.detectedExpiryDate as string) || (data.stripExpiryDate as string) || undefined,
    expiryStatus: data.expiryStatus as ExposureRecord['expiryStatus'],
    estimatedDosePpmH: Number(data.estimatedDosePpmH) || 0,
    monitoringDuration: Number(data.monitoringDuration) || 8,
    estimatedAverageExposure: Number(data.estimatedAverageExposure) || 0,
    estimatedTwa: data.estimatedTwa !== undefined ? Number(data.estimatedTwa) : undefined,
    colorChangePercent: data.colorChangePercent !== undefined ? Number(data.colorChangePercent) : undefined,
    detectedColor: data.detectedColor as string | undefined,
    referenceColor: data.referenceColor as string | undefined,
    temperature: data.temperature !== undefined ? Number(data.temperature) : undefined,
    humidity: data.humidity !== undefined ? Number(data.humidity) : undefined,
    location: data.location as string | undefined,
    weather: data.weather as string | undefined,
    environmentalCorrection: data.environmentalCorrection !== undefined ? Number(data.environmentalCorrection) : undefined,
    colourFeatures: data.colourFeatures as ExposureRecord['colourFeatures'],
    calibrationModelVersion: (data.calibrationModelVersion as string) || 'demo-v0.1',
    dosimeterStatus: (data.dosimeterStatus as ExposureRecord['dosimeterStatus']) || 'valid',
    analysisStatus: data.analysisStatus as ExposureRecord['analysisStatus'],
    confirmationStatus: data.confirmationStatus as ExposureRecord['confirmationStatus'],
    notes: data.notes as string | undefined,
    status: (data.status as ExposureRecord['status']) || 'pending',
    reviewerRemarks: data.reviewerRemarks as string | undefined,
    isPublicVisible: (data.isPublicVisible as boolean) ?? false,
    capturedByUid: data.capturedByUid as string | undefined,
    capturedByRole: data.capturedByRole as ExposureRecord['capturedByRole'],
    capturedByName: data.capturedByName as string | undefined,
    submittedAt: data.submittedAt ? toFirestoreDate(data.submittedAt as Timestamp) ?? undefined : undefined,
    approvedAt: data.approvedAt ? toFirestoreDate(data.approvedAt as Timestamp) ?? undefined : undefined,
    peerScannerName: data.peerScannerName as string | undefined,
    qrId: data.qrId as string | undefined,
    scanDate: data.scanDate as string | undefined,
    scanTime: data.scanTime as string | undefined,
    createdAt: toFirestoreDate(data.createdAt as Timestamp) ?? new Date(),
  };
}

export async function saveExposureRecord(
  record: Omit<ExposureRecord, 'id' | 'createdAt'>
): Promise<string> {
  const now = new Date();
  const scanDate = record.scanDate || now.toISOString().split('T')[0];
  const scanTime = record.scanTime || now.toLocaleTimeString('en-IN', { hour12: false });

  const ref = await addDoc(collection(db, COLLECTIONS.EXPOSURE_RECORDS), {
    ...record,
    scanDate,
    scanTime,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  // Update worker's lastScanAt and dosimeterStatus
  try {
    const workerRef = doc(db, COLLECTIONS.WORKERS, record.workerId);
    await updateDoc(workerRef, {
      lastScanAt: serverTimestamp(),
      dosimeterStatus: record.dosimeterStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (wErr) {
    console.warn('Could not update worker profile timestamp/status:', wErr);
  }

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

/**
 * ============================================================
 * WORKER-TO-WORKER SCAN APPROVAL WORKFLOW
 * ============================================================
 */

export async function createScanApprovalRequest(
  data: Omit<ScanApprovalRequest, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'scanApprovals'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPendingScanApprovals(): Promise<ScanApprovalRequest[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'scanApprovals'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
    );
    return snap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        scannerUid: r.scannerUid,
        scannerWorkerId: r.scannerWorkerId,
        scannerName: r.scannerName,
        scannerRole: r.scannerRole || 'worker',
        targetWorkerId: r.targetWorkerId,
        targetWorkerName: r.targetWorkerName,
        targetWorkerPublicId: r.targetWorkerPublicId,
        imageUrl: r.imageUrl,
        scanTimestamp: toFirestoreDate(r.scanTimestamp as Timestamp) ?? new Date(),
        shift: r.shift || 'morning',
        monitoringDuration: Number(r.monitoringDuration) || 8,
        estimatedDosePpmH: Number(r.estimatedDosePpmH) || 0,
        estimatedAverageExposure: Number(r.estimatedAverageExposure) || 0,
        estimatedTwa: r.estimatedTwa !== undefined ? Number(r.estimatedTwa) : undefined,
        colorChangePercent: Number(r.colorChangePercent) || 0,
        temperature: r.temperature !== undefined ? Number(r.temperature) : undefined,
        humidity: r.humidity !== undefined ? Number(r.humidity) : undefined,
        location: r.location,
        weather: r.weather,
        environmentalCorrection: r.environmentalCorrection !== undefined ? Number(r.environmentalCorrection) : undefined,
        detectedExpiryDate: r.detectedExpiryDate,
        expiryStatus: r.expiryStatus,
        status: r.status || 'pending',
        createdAt: toFirestoreDate(r.createdAt as Timestamp) ?? new Date(),
      } as ScanApprovalRequest;
    });
  } catch {
    const snap = await getDocs(
      query(collection(db, 'scanApprovals'), where('status', '==', 'pending'), limit(50))
    );
    return snap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        scannerUid: r.scannerUid,
        scannerWorkerId: r.scannerWorkerId,
        scannerName: r.scannerName,
        scannerRole: r.scannerRole || 'worker',
        targetWorkerId: r.targetWorkerId,
        targetWorkerName: r.targetWorkerName,
        targetWorkerPublicId: r.targetWorkerPublicId,
        imageUrl: r.imageUrl,
        scanTimestamp: toFirestoreDate(r.scanTimestamp as Timestamp) ?? new Date(),
        shift: r.shift || 'morning',
        monitoringDuration: Number(r.monitoringDuration) || 8,
        estimatedDosePpmH: Number(r.estimatedDosePpmH) || 0,
        estimatedAverageExposure: Number(r.estimatedAverageExposure) || 0,
        estimatedTwa: r.estimatedTwa !== undefined ? Number(r.estimatedTwa) : undefined,
        colorChangePercent: Number(r.colorChangePercent) || 0,
        temperature: r.temperature !== undefined ? Number(r.temperature) : undefined,
        humidity: r.humidity !== undefined ? Number(r.humidity) : undefined,
        location: r.location,
        weather: r.weather,
        environmentalCorrection: r.environmentalCorrection !== undefined ? Number(r.environmentalCorrection) : undefined,
        detectedExpiryDate: r.detectedExpiryDate,
        expiryStatus: r.expiryStatus,
        status: r.status || 'pending',
        createdAt: toFirestoreDate(r.createdAt as Timestamp) ?? new Date(),
      } as ScanApprovalRequest;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export async function approveScanRequest(
  requestId: string,
  reviewerUid: string,
  reviewerName: string,
  remarks?: string
): Promise<string> {
  const reqRef = doc(db, 'scanApprovals', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Scan approval request not found');
  const reqData = reqSnap.data();

  const scanTimestamp = toFirestoreDate(reqData.scanTimestamp as Timestamp) ?? new Date();
  const now = new Date();

  // Create permanent finalized exposure record for target worker
  const recordId = await saveExposureRecord({
    workerId: reqData.targetWorkerId,
    workerName: reqData.targetWorkerName,
    workerPublicId: reqData.targetWorkerPublicId,
    managerId: reviewerUid,
    managerName: reviewerName,
    timestamp: scanTimestamp,
    submittedAt: scanTimestamp,
    approvedAt: now,
    peerScannerName: reqData.scannerName,
    shift: reqData.shift || 'morning',
    imageUrl: reqData.imageUrl,
    stripExpiryDate: reqData.detectedExpiryDate,
    detectedExpiryDate: reqData.detectedExpiryDate,
    expiryStatus: reqData.expiryStatus,
    estimatedDosePpmH: reqData.estimatedDosePpmH,
    monitoringDuration: reqData.monitoringDuration,
    estimatedAverageExposure: reqData.estimatedAverageExposure,
    estimatedTwa: reqData.estimatedTwa,
    colorChangePercent: reqData.colorChangePercent,
    temperature: reqData.temperature,
    humidity: reqData.humidity,
    location: reqData.location,
    weather: reqData.weather,
    environmentalCorrection: reqData.environmentalCorrection,
    calibrationModelVersion: 'demo-v0.1',
    dosimeterStatus: reqData.expiryStatus === 'EXPIRED' ? 'expired' : 'valid',
    status: 'approved',
    isPublicVisible: false,
    capturedByUid: reqData.scannerUid,
    capturedByRole: 'worker',
    capturedByName: reqData.scannerName,
    notes: `Worker-to-worker scan by ${reqData.scannerName}. Approved by ${reviewerName}.`,
    reviewerRemarks: remarks || undefined,
    confirmationStatus: 'approved',
  });

  // Mark approval request as approved
  await updateDoc(reqRef, {
    status: 'approved',
    reviewedByUid: reviewerUid,
    reviewedByName: reviewerName,
    reviewedAt: serverTimestamp(),
    remarks: remarks || '',
    exposureRecordId: recordId,
  });

  return recordId;
}

export async function rejectScanRequest(
  requestId: string,
  reviewerUid: string,
  reviewerName: string,
  reason: string
): Promise<void> {
  const reqRef = doc(db, 'scanApprovals', requestId);
  await updateDoc(reqRef, {
    status: 'rejected',
    rejectionReason: reason,
    remarks: reason,
    reviewedByUid: reviewerUid,
    reviewedByName: reviewerName,
    reviewedAt: serverTimestamp(),
  });
}

export async function getReviewedScanApprovals(limitCount = 50): Promise<ScanApprovalRequest[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'scanApprovals'),
        orderBy('reviewedAt', 'desc'),
        limit(limitCount)
      )
    );
    return snap.docs
      .map((d) => {
        const r = d.data();
        return {
          id: d.id,
          scannerUid: r.scannerUid,
          scannerWorkerId: r.scannerWorkerId,
          scannerName: r.scannerName,
          scannerRole: r.scannerRole || 'worker',
          targetWorkerId: r.targetWorkerId,
          targetWorkerName: r.targetWorkerName,
          targetWorkerPublicId: r.targetWorkerPublicId,
          targetWorkerUid: r.targetWorkerUid,
          imageUrl: r.imageUrl,
          scanTimestamp: toFirestoreDate(r.scanTimestamp as Timestamp) ?? new Date(),
          shift: r.shift || 'morning',
          monitoringDuration: Number(r.monitoringDuration) || 8,
          estimatedDosePpmH: Number(r.estimatedDosePpmH) || 0,
          estimatedAverageExposure: Number(r.estimatedAverageExposure) || 0,
          estimatedTwa: r.estimatedTwa !== undefined ? Number(r.estimatedTwa) : undefined,
          colorChangePercent: Number(r.colorChangePercent) || 0,
          temperature: r.temperature !== undefined ? Number(r.temperature) : undefined,
          humidity: r.humidity !== undefined ? Number(r.humidity) : undefined,
          location: r.location,
          weather: r.weather,
          environmentalCorrection: r.environmentalCorrection !== undefined ? Number(r.environmentalCorrection) : undefined,
          detectedExpiryDate: r.detectedExpiryDate,
          expiryStatus: r.expiryStatus,
          status: r.status || 'pending',
          rejectionReason: r.rejectionReason,
          remarks: r.remarks,
          reviewedByUid: r.reviewedByUid,
          reviewedByName: r.reviewedByName,
          reviewedAt: r.reviewedAt ? toFirestoreDate(r.reviewedAt as Timestamp) ?? undefined : undefined,
          createdAt: toFirestoreDate(r.createdAt as Timestamp) ?? new Date(),
          exposureRecordId: r.exposureRecordId,
        } as ScanApprovalRequest;
      })
      .filter((item) => item.status === 'approved' || item.status === 'rejected');
  } catch {
    const snap = await getDocs(
      query(collection(db, 'scanApprovals'), limit(limitCount * 2))
    );
    return snap.docs
      .map((d) => {
        const r = d.data();
        return {
          id: d.id,
          scannerUid: r.scannerUid,
          scannerWorkerId: r.scannerWorkerId,
          scannerName: r.scannerName,
          scannerRole: r.scannerRole || 'worker',
          targetWorkerId: r.targetWorkerId,
          targetWorkerName: r.targetWorkerName,
          targetWorkerPublicId: r.targetWorkerPublicId,
          targetWorkerUid: r.targetWorkerUid,
          imageUrl: r.imageUrl,
          scanTimestamp: toFirestoreDate(r.scanTimestamp as Timestamp) ?? new Date(),
          shift: r.shift || 'morning',
          monitoringDuration: Number(r.monitoringDuration) || 8,
          estimatedDosePpmH: Number(r.estimatedDosePpmH) || 0,
          estimatedAverageExposure: Number(r.estimatedAverageExposure) || 0,
          estimatedTwa: r.estimatedTwa !== undefined ? Number(r.estimatedTwa) : undefined,
          colorChangePercent: Number(r.colorChangePercent) || 0,
          temperature: r.temperature !== undefined ? Number(r.temperature) : undefined,
          humidity: r.humidity !== undefined ? Number(r.humidity) : undefined,
          location: r.location,
          weather: r.weather,
          environmentalCorrection: r.environmentalCorrection !== undefined ? Number(r.environmentalCorrection) : undefined,
          detectedExpiryDate: r.detectedExpiryDate,
          expiryStatus: r.expiryStatus,
          status: r.status || 'pending',
          rejectionReason: r.rejectionReason,
          remarks: r.remarks,
          reviewedByUid: r.reviewedByUid,
          reviewedByName: r.reviewedByName,
          reviewedAt: r.reviewedAt ? toFirestoreDate(r.reviewedAt as Timestamp) ?? undefined : undefined,
          createdAt: toFirestoreDate(r.createdAt as Timestamp) ?? new Date(),
          exposureRecordId: r.exposureRecordId,
        } as ScanApprovalRequest;
      })
      .filter((item) => item.status === 'approved' || item.status === 'rejected')
      .sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0));
  }
}
