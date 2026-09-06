'use client';
// app/(admin)/requests/page.tsx
import { useEffect, useState } from 'react';
import { getPendingRequests, approveWorkerRequest, rejectWorkerRequest } from '@/services/workerService';
import { WorkerRequest } from '@/types/worker';
import { formatDateTime } from '@/lib/utils/date';
import { RequestStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { writeAuditLog } from '@/services/auditLogService';
import { useAuthContext } from '@/context/AuthContext';
import { approveManagerRequest, getPendingManagerRequests, rejectManagerRequest } from '@/services/managerService';
import { ManagerRequest } from '@/types/user';
import { ClipboardList, Check, X, AlertCircle } from 'lucide-react';

export default function AdminRequestsPage() {
  const { user, displayName } = useAuthContext();
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [managerRequests, setManagerRequests] = useState<ManagerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const loadRequests = () => {
    setLoading(true);
    Promise.all([getPendingRequests(), getPendingManagerRequests()]).then(([workers, managers]) => {
      setRequests(workers);
      setManagerRequests(managers);
    }).finally(() => setLoading(false));
  };

  const handleManagerDecision = async (request: ManagerRequest, approve: boolean) => {
    if (!user) return;
    setProcessing(request.id);
    setError('');
    try {
      if (approve) await approveManagerRequest(request.id, user.uid);
      else await rejectManagerRequest(request.id, user.uid, 'Request rejected by administrator.');
      loadRequests();
    } catch {
      setError('Manager request update failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleApprove = async (req: WorkerRequest) => {
    if (!user) return;
    setProcessing(req.id);
    setError('');
    try {
      await approveWorkerRequest(req.id, user.uid, user.uid); // managerId = reviewer for now
      await writeAuditLog({
        actorId: user.uid,
        actorName: displayName ?? 'Admin',
        role: 'admin',
        action: 'worker_approved',
        targetId: req.id,
        targetName: req.fullName,
      });
      loadRequests();
    } catch {
      setError('Approval failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (req: WorkerRequest) => {
    if (!user || !rejectReason.trim()) return;
    setProcessing(req.id);
    setError('');
    try {
      await rejectWorkerRequest(req.id, user.uid, rejectReason);
      await writeAuditLog({
        actorId: user.uid,
        actorName: displayName ?? 'Admin',
        role: 'admin',
        action: 'worker_rejected',
        targetId: req.id,
        targetName: req.fullName,
        details: { reason: rejectReason },
      });
      setRejectId(null);
      setRejectReason('');
      loadRequests();
    } catch {
      setError('Rejection failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Registration Requests</h1>
        <p>Pending manager and worker registration requests awaiting review</p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div className="card card-flush" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}><h2 style={{ fontSize: '1rem' }}>Manager Requests</h2></div>
        {managerRequests.length === 0 ? <EmptyState icon={ClipboardList} title="No pending manager requests" /> : managerRequests.map((request) => (
          <div key={request.id} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}><strong>{request.fullName}</strong><div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{request.email}{request.department ? ` · ${request.department}` : ''}</div></div>
            <button className="btn btn-success btn-sm" onClick={() => handleManagerDecision(request, true)} disabled={!!processing}><Check size={14} /> Approve</button>
            <button className="btn btn-danger btn-sm" onClick={() => handleManagerDecision(request, false)} disabled={!!processing}><X size={14} /> Reject</button>
          </div>
        ))}
      </div>

      <div className="card card-flush">
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}><h2 style={{ fontSize: '1rem' }}>Worker Requests</h2></div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <LoadingSpinner size={24} />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No pending requests"
            description="All registration requests have been reviewed."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {requests.map((req) => (
              <div
                key={req.id}
                style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  flexShrink: 0, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '1rem',
                }}>
                  {req.profilePhotoUrl
                    ? <img src={req.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : req.fullName.charAt(0).toUpperCase()
                  }
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{req.fullName}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {req.department} · {req.designation}
                  </div>
                  {req.email && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                      {req.email}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                    Submitted {formatDateTime(req.submittedAt)}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  <RequestStatusBadge status={req.status} />
                  {rejectId === req.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Reason for rejection"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        style={{ width: 200, fontSize: '0.8125rem' }}
                        autoFocus
                      />
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleReject(req)}
                        disabled={!rejectReason.trim() || processing === req.id}
                      >
                        {processing === req.id ? <LoadingSpinner size={14} /> : 'Confirm'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setRejectId(null); setRejectReason(''); }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprove(req)}
                        disabled={!!processing}
                      >
                        {processing === req.id ? <LoadingSpinner size={14} /> : <><Check size={14} /> Approve</>}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setRejectId(req.id)}
                        disabled={!!processing}
                      >
                        <X size={14} /> Reject
                      </button>
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
