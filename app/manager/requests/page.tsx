'use client';
// app/(manager)/requests/page.tsx
import { useEffect, useState } from 'react';
import { getPendingRequests, approveWorkerRequest, rejectWorkerRequest } from '@/services/workerService';
import { WorkerRequest } from '@/types/worker';
import { formatDateTime } from '@/lib/utils/date';
import { RequestStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { ClipboardList, Info, Check, X, AlertCircle } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { writeAuditLog } from '@/services/auditLogService';

export default function ManagerRequestsPage() {
  const { user, displayName } = useAuthContext();
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    try { setRequests(await getPendingRequests()); }
    catch { setError('Unable to load worker requests.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const decide = async (request: WorkerRequest, approve: boolean) => {
    if (!user) return;
    if (!approve && rejectId !== request.id) { setRejectId(request.id); return; }
    if (!approve && !rejectReason.trim()) return;
    setProcessing(request.id);
    setError('');
    try {
      if (approve) await approveWorkerRequest(request.id, user.uid, user.uid);
      else await rejectWorkerRequest(request.id, user.uid, rejectReason.trim());
      await writeAuditLog({ actorId: user.uid, actorName: displayName ?? 'Manager', role: 'manager', action: approve ? 'worker_approved' : 'worker_rejected', targetId: request.id, targetName: request.fullName, details: approve ? undefined : { reason: rejectReason.trim() } });
      setRejectId(null); setRejectReason(''); await loadRequests();
    } catch { setError('Request update failed.'); }
    finally { setProcessing(null); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Worker Requests</h1>
        <p>Pending registrations awaiting Master Admin approval</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Manager Review Access</strong>
          <span style={{ fontSize: '0.8125rem' }}>
            Managers can approve or reject worker requests. Every decision is also recorded in the Master Admin dashboard.
          </span>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} /><span>{error}</span></div>}

      <div className="card card-flush">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <LoadingSpinner size={24} />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No pending requests"
            description="All registration requests have been processed."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {requests.map((req) => (
              <div
                key={req.id}
                style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '1rem',
                }}>
                  {req.profilePhotoUrl
                    ? <img src={req.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : req.fullName.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{req.fullName}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {req.department} · {req.designation}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                    Submitted {formatDateTime(req.submittedAt)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  {rejectId === req.id ? (
                    <>
                      <input className="input" placeholder="Rejection reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <button className="btn btn-danger btn-sm" onClick={() => decide(req, false)} disabled={!rejectReason.trim() || !!processing}><Check size={14} /> Confirm</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setRejectId(null); setRejectReason(''); }}><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => decide(req, true)} disabled={!!processing}><Check size={14} /> Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => decide(req, false)} disabled={!!processing}><X size={14} /> Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
