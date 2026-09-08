'use client';
// app/(admin)/dosimeters/page.tsx
import { useEffect, useState, useMemo } from 'react';
import { getAllWorkers, updateDosimeterStatus } from '@/services/workerService';
import { Worker } from '@/types/worker';
import { DosimeterBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { Shield, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { writeAuditLog } from '@/services/auditLogService';
import { useAuthContext } from '@/context/AuthContext';

export default function AdminDosimetersPage() {
  const { user, displayName } = useAuthContext();
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
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
      w.publicId.toLowerCase().includes(q)
    );
  }, [search, workers]);

  const handleIssueNew = async (w: Worker) => {
    if (!user) return;
    setProcessing(w.id);
    try {
      await updateDosimeterStatus(w.id, 'valid');
      await writeAuditLog({
        actorId: user.uid,
        actorName: displayName ?? 'Admin',
        role: 'admin',
        action: 'admin_settings_changed', // Close enough for now
        targetId: w.id,
        targetName: w.fullName,
        details: { action: 'issued_new_dosimeter' },
      });
      setWorkers(await getAllWorkers());
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dosimeter Management</h1>
        <p>Track dosimeter pad validity and issue replacements</p>
      </div>

      <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Manual Replacement Cycle</strong>
          <span style={{ fontSize: '0.8125rem' }}>
            When a worker&apos;s dosimeter strip is physically replaced, click &quot;Issue Replacement&quot; to reset their digital status to Valid. This tracks the physical pad lifecycle.
          </span>
        </div>
      </div>

      <div className="card card-flush">
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', gap: '0.75rem', alignItems: 'center',
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input type="search" className="input" placeholder="Search by name or ID..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }} />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Shield} title="No workers found" />
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>SENTINEL ID</th>
                  <th>Pad Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 500 }}>{w.fullName}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--color-accent)' }}>{w.publicId}</td>
                    <td><DosimeterBadge status={w.dosimeterStatus} /></td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleIssueNew(w)}
                        disabled={processing === w.id || w.dosimeterStatus === 'valid'}
                      >
                        {processing === w.id ? <LoadingSpinner size={14} /> : <><RefreshCw size={14} /> Issue Replacement</>}
                      </button>
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
