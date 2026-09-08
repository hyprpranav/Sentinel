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
import { getWorkerQRUrl } from '@/lib/qr/generator';
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
    address: data.address as string | undefined,
    bloodGroup: data.bloodGroup as string | undefined,
    dateOfBirth: data.dateOfBirth as string | undefined,
    guardianName: data.guardianName as string | undefined,
    guardianContact: data.guardianContact as string | undefined,
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
  const requestData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  if (data.uid) {
    const existing = await getDocs(
      query(collection(db, COLLECTIONS.WORKER_REQUESTS), where('uid', '==', data.uid), where('status', '==', 'pending'))
    );
    if (!existing.empty) return existing.docs[0].id;
  }

  const ref = await addDoc(collection(db, COLLECTIONS.WORKER_REQUESTS), {
    ...requestData,
    status: 'pending',
    submittedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPendingRequests(): Promise<WorkerRequest[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.WORKER_REQUESTS),
      where('status', '==', 'pending')
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
      address: data.address,
      bloodGroup: data.bloodGroup,
      dateOfBirth: data.dateOfBirth,
      guardianName: data.guardianName,
      guardianContact: data.guardianContact,
      profilePhotoUrl: data.profilePhotoUrl,
      status: data.status,
      submittedAt: toFirestoreDate(data.submittedAt) ?? new Date(),
      reviewedBy: data.reviewedBy,
      reviewedAt: toFirestoreDate(data.reviewedAt),
      rejectionReason: data.rejectionReason,
    } as WorkerRequest;
  }).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
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
      qrCodeData: getWorkerQRUrl(generateWorkerId(sequence)),
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

export async function getPastWorkerRequests(): Promise<WorkerRequest[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.WORKER_REQUESTS),
      where('status', 'in', ['approved', 'rejected']),
      limit(50)
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
      address: data.address,
      bloodGroup: data.bloodGroup,
      dateOfBirth: data.dateOfBirth,
      guardianName: data.guardianName,
      guardianContact: data.guardianContact,
      profilePhotoUrl: data.profilePhotoUrl,
      status: data.status,
      submittedAt: toFirestoreDate(data.submittedAt) ?? new Date(),
      reviewedBy: data.reviewedBy,
      reviewedAt: toFirestoreDate(data.reviewedAt),
      rejectionReason: data.rejectionReason,
    } as WorkerRequest;
  }).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

export async function deleteWorker(workerId: string): Promise<void> {
  const workerSnap = await getDoc(doc(db, COLLECTIONS.WORKERS, workerId));
  if (!workerSnap.exists()) throw new Error('Worker not found');
  const workerData = workerSnap.data();

  const batch = [];
  batch.push(
    updateDoc(doc(db, COLLECTIONS.WORKERS, workerId), {
      status: 'inactive',
      updatedAt: serverTimestamp(),
    })
  );

  if (workerData.uid) {
    batch.push(
      updateDoc(doc(db, COLLECTIONS.USERS, workerData.uid), {
        isActive: false,
        updatedAt: serverTimestamp(),
      })
    );
  }

  await Promise.all(batch);
}

export async function deleteAllWorkers(): Promise<number> {
  const { writeBatch } = await import('firebase/firestore');
  
  // 1. Delete all worker docs
  const snap = await getDocs(collection(db, COLLECTIONS.WORKERS));
  const chunks: typeof snap.docs[] = [];
  for (let i = 0; i < snap.docs.length; i += 200) {
    chunks.push(snap.docs.slice(i, i + 200));
  }
  let deleted = 0;
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
      deleted++;
    }
    await batch.commit();
  }

  // 2. Delete all users with role 'worker'
  const userSnap = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'worker')));
  const userChunks: typeof userSnap.docs[] = [];
  for (let i = 0; i < userSnap.docs.length; i += 200) {
    userChunks.push(userSnap.docs.slice(i, i + 200));
  }
  for (const chunk of userChunks) {
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
      deleted++;
    }
    await batch.commit();
  }

  // 3. Delete all worker requests
  const reqSnap = await getDocs(collection(db, COLLECTIONS.WORKER_REQUESTS));
  if (!reqSnap.empty) {
    const batch = writeBatch(db);
    reqSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  return deleted;
}

