'use client';
// app/(admin)/workers/page.tsx
import { useEffect, useState } from 'react';
import { getAllWorkers } from '@/services/workerService';
import { Worker } from '@/types/worker';
import { formatDate } from '@/lib/utils/date';
import { DosimeterBadge, WorkerStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { Users, Search } from 'lucide-react';

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filtered, setFiltered] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllWorkers().then((w) => { setWorkers(w); setFiltered(w); }).finally(() => setLoading(false));
  }, []);

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
        <p>All registered workers in the system</p>
      </div>

      <div className="card card-flush">
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{
              position: 'absolute', left: '0.75rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
            }} />
            <input
              type="search"
              className="input"
              placeholder="Search workers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {filtered.length} worker{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <LoadingSpinner size={24} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No workers found" description="Workers will appear here after registration and approval." />
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
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{w.fullName}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{w.publicId}</div>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>
                      <div>{w.department}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{w.designation}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                        {w.publicId}
                      </span>
                    </td>
                    <td><WorkerStatusBadge status={w.status} /></td>
                    <td><DosimeterBadge status={w.dosimeterStatus} /></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {formatDate(w.createdAt)}
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
