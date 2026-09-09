'use client';
// app/(manager)/workers/page.tsx
import { useEffect, useState, useMemo } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkersByManager, getAllWorkers, deleteWorker, deleteAllWorkers } from '@/services/workerService';
import { Worker } from '@/types/worker';
import { DosimeterBadge, WorkerStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { PinDeleteDialog } from '@/components/ui/PinDeleteDialog';
import { timeAgo } from '@/lib/utils/date';
import { Users, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ManagerWorkersPage() {
  const { user, role } = useAuthContext();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  useEffect(() => {
    if (!user) return;
    const fn = role === 'admin' ? getAllWorkers : () => getWorkersByManager(user.uid);
    fn().then((w) => { setWorkers(w); }).finally(() => setLoading(false));
  }, [user, role]);

  const handleDeleteSingle = async () => {
    if (!workerToDelete) return;
    try {
      await deleteWorker(workerToDelete.id);
      setWorkers((prev) => prev.filter((w) => w.id !== workerToDelete.id));
      setWorkerToDelete(null);
    } catch (e) {
      console.error(e);
      alert('Failed to delete worker');
    }
  };

  const handleDeleteAll = async () => {
    await deleteAllWorkers();
    setWorkers([]);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return workers.filter((w) =>
      w.fullName.toLowerCase().includes(q) ||
      w.department.toLowerCase().includes(q) ||
      w.publicId.toLowerCase().includes(q)
    );
  }, [search, workers]);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Workers</h1>
          <p>Assigned workers and their dosimeter status</p>
        </div>
        <button
          onClick={() => setShowDeleteAll(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '0.5rem',
            color: '#ef4444',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.22)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
        >
          <Trash2 size={15} /> Delete All Workers
        </button>
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
                  <th>Details</th>
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
                            ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={w.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )
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
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                        <Link href={`/manager/workers/${w.id}`} className="btn btn-ghost btn-sm">View Details</Link>
                        <Link href={`/manager/workers/${w.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setWorkerToDelete(w)}
                          style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title={`Delete worker ${w.fullName}`}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete All Workers Dialog */}
      <PinDeleteDialog
        isOpen={showDeleteAll}
        onClose={() => setShowDeleteAll(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Workers"
        description="This will permanently delete all worker records, user accounts, and exposure records from the database."
        danger="This action cannot be undone. All assigned workers will be removed."
      />

      {/* Delete Single Worker Dialog */}
      <PinDeleteDialog
        isOpen={!!workerToDelete}
        onClose={() => setWorkerToDelete(null)}
        onConfirm={handleDeleteSingle}
        title={`Delete Worker ${workerToDelete?.fullName ?? ''}`}
        description={`This will permanently remove ${workerToDelete?.fullName} (${workerToDelete?.publicId}) from the database along with their user account and exposure records.`}
        danger="This action is irreversible and completely removes this worker's data."
      />
    </div>
  );
}
