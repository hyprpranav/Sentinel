// services/auditLogService.ts
import { addDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { AuditLog, AuditAction } from '@/types/audit';
import { UserRole } from '@/types/user';

export async function writeAuditLog(entry: {
  actorId: string;
  actorName: string;
  role: UserRole;
  action: AuditAction;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
      ...entry,
      timestamp: new Date(),
    });
  } catch {
    // Audit log failure must never crash the main operation
    console.warn('Audit log write failed:', entry.action);
  }
}

export async function getAuditLogs(limitCount = 100): Promise<AuditLog[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.AUDIT_LOGS),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      actorId: data.actorId,
      actorName: data.actorName,
      role: data.role,
      action: data.action,
      targetId: data.targetId,
      targetName: data.targetName,
      details: data.details,
      timestamp: data.timestamp?.toDate?.() ?? new Date(),
    } as AuditLog;
  });
}
