'use client';
// app/(worker)/my-exposure/page.tsx
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { query, collection, where, getDocs, orderBy, limit as fLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { ExposureRecord } from '@/types/exposure';
import { formatDose, formatAvgExposure, formatDuration } from '@/lib/utils/formatting';
import { formatDateTime, toFirestoreDate } from '@/lib/utils/date';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Activity, Shield } from 'lucide-react';

export default function MyExposurePage() {
  const { user } = useAuthContext();
  const [records, setRecords] = useState<ExposureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [workerId, setWorkerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const wSnap = await getDocs(
          query(collection(db, COLLECTIONS.WORKERS), where('uid', '==', user!.uid), fLimit(1))
        );
        if (wSnap.empty) { setLoading(false); return; }
        const wId = wSnap.docs[0].id;
        setWorkerId(wId);

        const rSnap = await getDocs(
          query(
            collection(db, COLLECTIONS.EXPOSURE_RECORDS),
            where('workerId', '==', wId),
            orderBy('createdAt', 'desc'),
            fLimit(30)
          )
        );

        const loaded: ExposureRecord[] = [];
        rSnap.forEach((doc) => {
          const r = doc.data();
          loaded.push({
            id: doc.id,
            workerId: r.workerId,
            managerId: r.managerId,
            timestamp: toFirestoreDate(r.timestamp) ?? new Date(),
            shift: r.shift,
            estimatedDosePpmH: r.estimatedDosePpmH,
            monitoringDuration: r.monitoringDuration,
            estimatedAverageExposure: r.estimatedAverageExposure,
            calibrationModelVersion: r.calibrationModelVersion,
            dosimeterStatus: r.dosimeterStatus,
            isPublicVisible: r.isPublicVisible,
            createdAt: toFirestoreDate(r.createdAt) ?? new Date(),
          } as ExposureRecord);
        });
        setRecords(loaded);
      } catch (err) {
        console.error('Failed to load exposure records', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Exposure History</h1>
        <p>Your recent dosimeter readings (last 30 records)</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size={24} />
        </div>
      ) : records.length === 0 ? (
        <div className="card">
          <EmptyState icon={Activity} title="No exposure history" description="Your readings will appear here once your dosimeter is scanned by a manager." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {records.map((r) => (
            <div key={r.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.125rem' }}>
                    {formatDateTime(r.createdAt)}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {r.shift.charAt(0).toUpperCase() + r.shift.slice(1)} shift · {formatDuration(r.monitoringDuration)}
                  </p>
                </div>
                <DoseLevelBadge ppmH={r.estimatedDosePpmH} />
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                  {formatDose(r.estimatedDosePpmH)}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  ppm·h
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Avg: {formatAvgExposure(r.estimatedAverageExposure)}
                </span>
                <DosimeterBadge status={r.dosimeterStatus} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
