'use client';
// app/(manager)/exposure/page.tsx
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { query, collection, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { ExposureRecord } from '@/types/exposure';
import { formatDose } from '@/lib/utils/formatting';
import { formatDateTime, toFirestoreDate } from '@/lib/utils/date';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Activity, Search } from 'lucide-react';

export default function ManagerExposurePage() {
  const { user } = useAuthContext();
  const [records, setRecords] = useState<ExposureRecord[]>([]);
  const [filtered, setFiltered] = useState<ExposureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const rSnap = await getDocs(
          query(
            collection(db, COLLECTIONS.EXPOSURE_RECORDS),
            where('managerId', '==', user!.uid),
            orderBy('createdAt', 'desc'),
            limit(100)
          )
        );
        const loaded: ExposureRecord[] = [];
        rSnap.forEach((doc) => {
          const r = doc.data();
          loaded.push({
            id: doc.id,
            workerId: r.workerId,
            workerName: r.workerName,
            workerPublicId: r.workerPublicId,
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
        setFiltered(loaded);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(records.filter((r) =>
      (r.workerName && r.workerName.toLowerCase().includes(q)) ||
      (r.workerPublicId && r.workerPublicId.toLowerCase().includes(q))
    ));
  }, [search, records]);

  return (
    <div>
      <div className="page-header">
        <h1>Exposure Records</h1>
        <p>Recent dosimeter scans you have performed</p>
      </div>

      <div className="card card-flush">
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', gap: '0.75rem', alignItems: 'center',
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input type="search" className="input" placeholder="Search by worker name or ID..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }} />
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Activity} title="No exposure records found" description="Scanned records will appear here." />
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Timestamp</th>
                  <th>Shift</th>
                  <th>Dosimeter</th>
                  <th>Estimated Dose</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.workerName ?? 'Unknown'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.workerPublicId}</div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td style={{ fontSize: '0.8125rem', textTransform: 'capitalize' }}>
                      {r.shift}
                    </td>
                    <td><DosimeterBadge status={r.dosimeterStatus} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', fontVariantNumeric: 'tabular-nums' }}>
                          {formatDose(r.estimatedDosePpmH)} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>ppm·h</span>
                        </span>
                        <DoseLevelBadge ppmH={r.estimatedDosePpmH} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
