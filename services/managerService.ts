import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS, generateManagerId } from '@/lib/firebase/firestore';
import { ManagerRequest } from '@/types/user';
import { toFirestoreDate } from '@/lib/utils/date';

export async function submitManagerRequest(data: Omit<ManagerRequest, 'id' | 'status' | 'submittedAt'>) {
  const ref = await addDoc(collection(db, 'managerRequests'), {
    ...data,
    status: 'pending',
    submittedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPendingManagerRequests(): Promise<ManagerRequest[]> {
  const snap = await getDocs(query(collection(db, 'managerRequests'), where('status', '==', 'pending'), orderBy('submittedAt', 'desc')));
  return snap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      uid: data.uid,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      department: data.department,
      status: data.status,
      submittedAt: toFirestoreDate(data.submittedAt as Timestamp) ?? new Date(),
    } as ManagerRequest;
  });
}

export async function approveManagerRequest(requestId: string, reviewerId: string) {
  const requestRef = doc(db, 'managerRequests', requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) throw new Error('Manager request not found');
  const request = requestSnap.data();
  const userRef = doc(db, COLLECTIONS.USERS, request.uid);
  const counterRef = doc(db, COLLECTIONS.ADMIN_SETTINGS, 'sequences');

  await runTransaction(db, async (transaction) => {
    const counter = await transaction.get(counterRef);
    const sequence = (counter.data()?.manager ?? 0) + 1;
    const publicId = generateManagerId(sequence);
    transaction.set(counterRef, { manager: sequence }, { merge: true });
    transaction.update(userRef, { isActive: true, publicId, updatedAt: serverTimestamp() });
    transaction.set(doc(db, COLLECTIONS.MANAGERS, request.uid), {
      uid: request.uid,
      publicId,
      fullName: request.fullName,
      email: request.email,
      phone: request.phone ?? null,
      department: request.department ?? null,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(requestRef, {
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: serverTimestamp(),
      publicId,
    });
  });
}

export async function rejectManagerRequest(requestId: string, reviewerId: string, reason: string) {
  const requestRef = doc(db, 'managerRequests', requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) throw new Error('Manager request not found');
  await updateDoc(doc(db, COLLECTIONS.USERS, requestSnap.data().uid), {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(requestRef, {
    status: 'rejected',
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    rejectionReason: reason,
  });
}
