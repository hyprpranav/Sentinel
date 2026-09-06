'use client';
// app/(manager)/workers/page.tsx
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkersByManager, getAllWorkers } from '@/services/workerService';
import { Worker } from '@/types/worker';
import { DosimeterBadge, WorkerStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { formatDate, timeAgo } from '@/lib/utils/date';
import { Users, Search } from 'lucide-react';

export default function ManagerWorkersPage() {
  const { user, role } = useAuthContext();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filtered, setFiltered] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    const fn = role === 'admin' ? getAllWorkers : () => getWorkersByManager(user.uid);
    fn().then((w) => { setWorkers(w); setFiltered(w); }).finally(() => setLoading(false));
  }, [user, role]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(workers.filter((w) =>
      w.fullName.toLowerCase().includes(q) ||
      w.department.toLowerCase().includes(q) ||
      w.publicId.toLowerCase().includes(q)
    ));
  }, [search, workers]);

  return (
    <div>
      <div className="page-header">
        <h1>Workers</h1>
        <p>Assigned workers and their dosimeter status</p>
      </div>

      <div className="card card-flush">
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', gap: '0.75rem', alignItems: 'center',
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input type="search" className="input" placeholder="Search workers..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }} />
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No workers found" description="Assigned workers will appear here." />
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Department</th>
                  <th>SENTINEL ID</th>
                  <th>Status</th>
                  <th>Dosimeter</th>
                  <th>Last Scan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--color-surface-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-muted)',
                          overflow: 'hidden', flexShrink: 0,
                        }}>
                          {w.profilePhotoUrl
                            ? <img src={w.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : w.fullName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{w.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{w.publicId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>
                      <div>{w.department}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{w.designation}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-accent)' }}>
                        {w.publicId}
                      </span>
                    </td>
                    <td><WorkerStatusBadge status={w.status} /></td>
                    <td><DosimeterBadge status={w.dosimeterStatus} /></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {w.lastScanAt ? timeAgo(w.lastScanAt) : 'Never'}
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
