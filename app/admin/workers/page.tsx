'use client';
// app/(admin)/workers/page.tsx
import { useEffect, useState, useMemo } from 'react';
import { getAllWorkers, deleteWorker, deleteAllWorkers } from '@/services/workerService';
import { Worker } from '@/types/worker';
import { formatDate } from '@/lib/utils/date';
import { DosimeterBadge, WorkerStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { PinDeleteDialog } from '@/components/ui/PinDeleteDialog';
import { Users, Search, Trash2 } from 'lucide-react';
import { generateQRDataUrl, getWorkerQRUrl } from '@/lib/qr/generator';
import { Download } from 'lucide-react';

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) setLoading(true);
      try {
        const w = await getAllWorkers();
        if (!cancelled) setWorkers(w);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return workers.filter((w) =>
      w.fullName.toLowerCase().includes(q) ||
      w.department.toLowerCase().includes(q) ||
      w.publicId.toLowerCase().includes(q)
    );
  }, [search, workers]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this worker?')) return;
    try {
      await deleteWorker(id);
      setWorkers((prev) => prev.filter((w) => w.id !== id));
    } catch (e) {
      alert('Failed to deactivate worker');
      console.error(e);
    }
  };

  const handleDeleteAll = async () => {
    await deleteAllWorkers();
    setWorkers([]);
  };

  const handleDownloadQR = async (worker: Worker) => {
    const dataUrl = await generateQRDataUrl(getWorkerQRUrl(worker.publicId), 320);
    const link = document.createElement('a');
    link.download = `SENTINEL-${worker.publicId}-QR.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Workers</h1>
          <p>All registered workers in the system</p>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{w.fullName}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{w.email}</div>
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
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDownloadQR(w)} title={`Download QR for ${w.fullName}`}>
                        <Download size={15} /> QR
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(w.id)}
                        disabled={w.status === 'inactive'}
                        style={{ color: '#ef4444' }}
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PinDeleteDialog
        isOpen={showDeleteAll}
        onClose={() => setShowDeleteAll(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Workers"
        description="This will permanently delete all worker records, their user accounts, and all associated requests from the database."
        danger="This action cannot be undone. All worker data will be permanently removed."
      />
    </div>
  );
}
