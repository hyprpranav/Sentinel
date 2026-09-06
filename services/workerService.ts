// services/workerService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS, generateWorkerId } from '@/lib/firebase/firestore';
import { Worker, WorkerRequest } from '@/types/worker';
import { toFirestoreDate } from '@/lib/utils/date';

function docToWorker(id: string, data: Record<string, unknown>): Worker {
  return {
    id,
    publicId: data.publicId as string,
    uid: data.uid as string | undefined,
    fullName: data.fullName as string,
    department: data.department as string,
    designation: data.designation as string,
    email: data.email as string | undefined,
    phone: data.phone as string | undefined,
    profilePhotoUrl: data.profilePhotoUrl as string | undefined,
    managerId: data.managerId as string | undefined,
    status: data.status as Worker['status'],
    qrCodeData: data.qrCodeData as string,
    dosimeterStatus: data.dosimeterStatus as Worker['dosimeterStatus'],
    lastScanAt: toFirestoreDate(data.lastScanAt as Timestamp | null) ?? undefined,
    createdAt: toFirestoreDate(data.createdAt as Timestamp) ?? new Date(),
    updatedAt: toFirestoreDate(data.updatedAt as Timestamp) ?? new Date(),
  };
}

export async function getWorkerByPublicId(publicId: string): Promise<Worker | null> {
  const q = query(
    collection(db, COLLECTIONS.WORKERS),
    where('publicId', '==', publicId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToWorker(d.id, d.data() as Record<string, unknown>);
}

export async function getWorkerById(id: string): Promise<Worker | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.WORKERS, id));
  if (!snap.exists()) return null;
  return docToWorker(snap.id, snap.data() as Record<string, unknown>);
}

export async function getAllWorkers(): Promise<Worker[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.WORKERS), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => docToWorker(d.id, d.data() as Record<string, unknown>));
}

export async function getWorkersByManager(managerId: string): Promise<Worker[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.WORKERS),
      where('managerId', '==', managerId),
      orderBy('fullName', 'asc')
    )
  );
  return snap.docs.map((d) => docToWorker(d.id, d.data() as Record<string, unknown>));
}

export async function submitWorkerRequest(data: Omit<WorkerRequest, 'id' | 'status' | 'submittedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.WORKER_REQUESTS), {
    ...data,
    status: 'pending',
    submittedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPendingRequests(): Promise<WorkerRequest[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.WORKER_REQUESTS),
      where('status', '==', 'pending'),
      orderBy('submittedAt', 'desc')
    )
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      fullName: data.fullName,
      department: data.department,
      designation: data.designation,
      email: data.email,
      phone: data.phone,
      profilePhotoUrl: data.profilePhotoUrl,
      status: data.status,
      submittedAt: toFirestoreDate(data.submittedAt) ?? new Date(),
      reviewedBy: data.reviewedBy,
      reviewedAt: toFirestoreDate(data.reviewedAt),
      rejectionReason: data.rejectionReason,
    } as WorkerRequest;
  });
}

export async function approveWorkerRequest(
  requestId: string,
  reviewerId: string,
  managerId: string
): Promise<string> {
  // Get request data
  const reqSnap = await getDoc(doc(db, COLLECTIONS.WORKER_REQUESTS, requestId));
  if (!reqSnap.exists()) throw new Error('Request not found');
  const reqData = reqSnap.data();

  const workerRef = doc(collection(db, COLLECTIONS.WORKERS));
  const counterRef = doc(db, COLLECTIONS.ADMIN_SETTINGS, 'sequences');
  const nextId = await runTransaction(db, async (transaction) => {
    const counter = await transaction.get(counterRef);
    const sequence = (counter.data()?.worker ?? 0) + 1;
    transaction.set(counterRef, { worker: sequence }, { merge: true });
    transaction.set(workerRef, {
      publicId: generateWorkerId(sequence),
      uid: reqData.uid ?? null,
      fullName: reqData.fullName,
      department: reqData.department,
      designation: reqData.designation,
      email: reqData.email ?? null,
      phone: reqData.phone ?? null,
      profilePhotoUrl: reqData.profilePhotoUrl ?? null,
      managerId,
      status: 'active',
      qrCodeData: generateWorkerId(sequence),
      dosimeterStatus: 'not_assigned',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return generateWorkerId(sequence);
  });

  // Update request status
  await updateDoc(doc(db, COLLECTIONS.WORKER_REQUESTS, requestId), {
    status: 'approved',
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    approvedWorkerId: workerRef.id,
  });

  if (reqData.uid) {
    await updateDoc(doc(db, COLLECTIONS.USERS, reqData.uid), {
      isActive: true,
      publicId: nextId,
      updatedAt: serverTimestamp(),
    });
  }

  return workerRef.id;
}

export async function rejectWorkerRequest(
  requestId: string,
  reviewerId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.WORKER_REQUESTS, requestId), {
    status: 'rejected',
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    rejectionReason: reason,
  });
}

export async function updateDosimeterStatus(
  workerId: string,
  status: Worker['dosimeterStatus']
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.WORKERS, workerId), {
    dosimeterStatus: status,
    updatedAt: serverTimestamp(),
  });
}
