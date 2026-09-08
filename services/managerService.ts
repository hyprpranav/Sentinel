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
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS, generateManagerId } from '@/lib/firebase/firestore';
import { ManagerRequest } from '@/types/user';
import { toFirestoreDate } from '@/lib/utils/date';

export async function submitManagerRequest(data: Omit<ManagerRequest, 'id' | 'status' | 'submittedAt'>) {
  const requestData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
  const existing = await getDocs(
    query(collection(db, 'managerRequests'), where('uid', '==', data.uid), where('status', '==', 'pending'))
  );
  if (!existing.empty) return existing.docs[0].id;

  const ref = await addDoc(collection(db, 'managerRequests'), {
    ...requestData,
    status: 'pending',
    submittedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPendingManagerRequests(): Promise<ManagerRequest[]> {
  const snap = await getDocs(query(collection(db, 'managerRequests'), where('status', '==', 'pending')));
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
  }).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
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

export async function getPastManagerRequests(): Promise<ManagerRequest[]> {
  const snap = await getDocs(
    query(
      collection(db, 'managerRequests'),
      where('status', 'in', ['approved', 'rejected']),
      limit(50)
    )
  );
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
      reviewedBy: data.reviewedBy,
      reviewedAt: toFirestoreDate(data.reviewedAt as Timestamp),
      rejectionReason: data.rejectionReason,
    } as ManagerRequest;
  }).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

export async function deleteManager(managerId: string): Promise<void> {
  const managerSnap = await getDoc(doc(db, COLLECTIONS.MANAGERS, managerId));
  if (!managerSnap.exists()) throw new Error('Manager not found');
  const managerData = managerSnap.data();

  const batch = [];
  batch.push(
    updateDoc(doc(db, COLLECTIONS.MANAGERS, managerId), {
      status: 'inactive',
      updatedAt: serverTimestamp(),
    })
  );

  if (managerData.uid) {
    batch.push(
      updateDoc(doc(db, COLLECTIONS.USERS, managerData.uid), {
        isActive: false,
        updatedAt: serverTimestamp(),
      })
    );
  }

  await Promise.all(batch);
}

export async function deleteAllManagers(): Promise<number> {
  const { writeBatch } = await import('firebase/firestore');
  
  // 1. Delete all manager docs
  const snap = await getDocs(collection(db, COLLECTIONS.MANAGERS));
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

  // 2. Delete all users with role 'manager'
  const userSnap = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'manager')));
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

  // 3. Delete all manager requests
  const reqSnap = await getDocs(collection(db, 'managerRequests'));
  if (!reqSnap.empty) {
    const batch = writeBatch(db);
    reqSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  return deleted;
}

