'use client';
// app/manager/requests/page.tsx
// Unified Requests page for Managers: Worker Registrations & Peer Dosimeter Scan Approvals

import { useEffect, useState } from 'react';
import { getPendingRequests, approveWorkerRequest, rejectWorkerRequest } from '@/services/workerService';
import { getPendingScanApprovals, approveScanRequest, rejectScanRequest } from '@/services/exposureService';
import { WorkerRequest } from '@/types/worker';
import { ScanApprovalRequest } from '@/types/exposure';
import { formatDateTime } from '@/lib/utils/date';
import { formatDose, formatDuration } from '@/lib/utils/formatting';
import { DoseLevelBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { ClipboardList, Info, Check, X, AlertCircle, Camera, UserPlus, Image as ImageIcon } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { writeAuditLog } from '@/services/auditLogService';

type ActiveTab = 'workers' | 'scans';

export default function ManagerRequestsPage() {
  const { user, displayName } = useAuthContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>('scans');

  // Worker registrations
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  // Scan approval requests
  const [scanApprovals, setScanApprovals] = useState<ScanApprovalRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [wReqs, sReqs] = await Promise.all([
        getPendingRequests().catch(() => []),
        getPendingScanApprovals().catch(() => []),
      ]);
      setRequests(wReqs);
      setScanApprovals(sReqs);
    } catch {
      setError('Unable to load pending requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const decideWorker = async (request: WorkerRequest, approve: boolean) => {
    if (!user) return;
    if (!approve && rejectId !== request.id) { setRejectId(request.id); return; }
    if (!approve && !rejectReason.trim()) return;
    setProcessing(request.id);
    setError('');
    try {
      if (approve) await approveWorkerRequest(request.id, user.uid, user.uid);
      else await rejectWorkerRequest(request.id, user.uid, rejectReason.trim());
      await writeAuditLog({
        actorId: user.uid,
        actorName: displayName ?? 'Manager',
        role: 'manager',
        action: approve ? 'worker_approved' : 'worker_rejected',
        targetId: request.id,
        targetName: request.fullName,
        details: approve ? undefined : { reason: rejectReason.trim() }
      });
      setRejectId(null);
      setRejectReason('');
      await loadAll();
    } catch {
      setError('Worker registration update failed.');
    } finally {
      setProcessing(null);
    }
  };

  const decideScan = async (scan: ScanApprovalRequest, approve: boolean) => {
    if (!user) return;
    if (!approve && rejectId !== scan.id) { setRejectId(scan.id); return; }
    if (!approve && !rejectReason.trim()) return;
    setProcessing(scan.id);
    setError('');
    try {
      if (approve) {
        await approveScanRequest(scan.id, user.uid, displayName ?? 'Manager');
      } else {
        await rejectScanRequest(scan.id, user.uid, displayName ?? 'Manager', rejectReason.trim());
      }
      await writeAuditLog({
        actorId: user.uid,
        actorName: displayName ?? 'Manager',
        role: 'manager',
        action: approve ? 'exposure_record_saved' : 'worker_rejected',
        targetId: scan.targetWorkerId,
        targetName: scan.targetWorkerName,
        details: { dose: scan.estimatedDosePpmH, scanId: scan.id, approved: approve }
      });
      setRejectId(null);
      setRejectReason('');
      await loadAll();
    } catch {
      setError('Scan approval action failed. Please check permissions.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Safety & Review Requests</h1>
        <p>Review worker registrations and authorize peer-scanned dosimeter exposure records</p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'scans' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('scans')}
          style={{ gap: '0.5rem' }}
        >
          <Camera size={16} />
          Dosimeter Scan Approvals ({scanApprovals.length})
        </button>
        <button
          className={`btn ${activeTab === 'workers' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('workers')}
          style={{ gap: '0.5rem' }}
        >
          <UserPlus size={16} />
          Worker Registrations ({requests.length})
        </button>
      </div>

      {/* ── TAB: SCAN APPROVALS ── */}
      {activeTab === 'scans' && (
        <div className="card card-flush">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <LoadingSpinner size={24} />
            </div>
          ) : scanApprovals.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="No pending scan approvals"
              description="When workers scan colleagues' dosimeters, their submissions appear here for review."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {scanApprovals.map((scan) => (
                <div
                  key={scan.id}
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Photo thumbnail */}
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: '8px',
                      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                      flexShrink: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={() => scan.imageUrl && setPreviewImage(scan.imageUrl)}
                    title="Click to inspect original scanned dosimeter photo"
                  >
                    {scan.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={scan.imageUrl} alt="Dosimeter strip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={20} style={{ color: 'var(--color-text-muted)' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{scan.targetWorkerName}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--color-accent)' }}>
                        {scan.targetWorkerPublicId}
                      </span>
                      <DoseLevelBadge ppmH={scan.estimatedDosePpmH} />
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      Estimated: <strong>{formatDose(scan.estimatedDosePpmH)} ppm·h</strong> ({scan.shift} shift · {formatDuration(scan.monitoringDuration)})
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      Scanned by: <strong>{scan.scannerName}</strong> · Captured: {formatDateTime(scan.scanTimestamp)}
                    </div>
                  </div>

                  {/* Decision Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {rejectId === scan.id ? (
                      <>
                        <input
                          className="input"
                          placeholder="Rejection reason"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          style={{ minWidth: 160 }}
                        />
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => decideScan(scan, false)}
                          disabled={!rejectReason.trim() || !!processing}
                        >
                          <Check size={14} /> Confirm
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setRejectId(null); setRejectReason(''); }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => decideScan(scan, true)}
                          disabled={!!processing}
                        >
                          <Check size={14} /> Approve & Commit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => decideScan(scan, false)}
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
      )}

      {/* ── TAB: WORKER REGISTRATIONS ── */}
      {activeTab === 'workers' && (
        <div className="card card-flush">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <LoadingSpinner size={24} />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No pending registrations"
              description="All worker registrations have been processed."
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
                      // eslint-disable-next-line @next/next/no-img-element
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
                        <button className="btn btn-danger btn-sm" onClick={() => decideWorker(req, false)} disabled={!rejectReason.trim() || !!processing}><Check size={14} /> Confirm</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setRejectId(null); setRejectReason(''); }}><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => decideWorker(req, true)} disabled={!!processing}><Check size={14} /> Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => decideWorker(req, false)} disabled={!!processing}><X size={14} /> Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1.5rem',
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxWidth: 480, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Dosimeter Scan Preview" style={{ width: '100%', display: 'block' }} />
            <div style={{ padding: '1rem', textAlign: 'right' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewImage(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
