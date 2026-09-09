'use client';
import { useEffect, useState } from 'react';
import { getPendingRequests, getPastWorkerRequests, approveWorkerRequest, rejectWorkerRequest } from '@/services/workerService';
import { WorkerRequest } from '@/types/worker';
import { formatDateTime } from '@/lib/utils/date';
import { RequestStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { writeAuditLog } from '@/services/auditLogService';
import { useAuthContext } from '@/context/AuthContext';
import { approveManagerRequest, getPendingManagerRequests, getPastManagerRequests, rejectManagerRequest } from '@/services/managerService';
import { getPendingScanApprovals, approveScanRequest, rejectScanRequest } from '@/services/exposureService';
import { ManagerRequest } from '@/types/user';
import { ScanApprovalRequest } from '@/types/exposure';
import { formatDose, formatDuration } from '@/lib/utils/formatting';
import { DoseLevelBadge } from '@/components/ui/Badge';
import { ClipboardList, Check, X, AlertCircle, Camera, Image as ImageIcon } from 'lucide-react';

export default function AdminRequestsPage() {
  const { user, displayName } = useAuthContext();
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [managerRequests, setManagerRequests] = useState<ManagerRequest[]>([]);
  const [scanApprovals, setScanApprovals] = useState<ScanApprovalRequest[]>([]);
  
  const [pastRequests, setPastRequests] = useState<WorkerRequest[]>([]);
  const [pastManagerRequests, setPastManagerRequests] = useState<ManagerRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectType, setRejectType] = useState<'manager'|'worker'|'scan'|null>(null);

  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'scans' | 'history'>('pending');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadRequests = () => {
    setLoading(true);
    setError('');
    Promise.all([
      getPendingRequests(),
      getPendingManagerRequests(),
      getPendingScanApprovals(),
      getPastWorkerRequests(),
      getPastManagerRequests()
    ]).then(([w, m, s, pw, pm]) => {
      setRequests(w);
      setManagerRequests(m);
      setScanApprovals(s);
      setPastRequests(pw);
      setPastManagerRequests(pm);
    }).catch((err: unknown) => {
      console.error('Failed to load registration requests:', err);
      setError('Unable to load requests. Check the Firestore rules and try again.');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const run = async () => {
      const [w, m, pw, pm] = await Promise.all([
        getPendingRequests(),
        getPendingManagerRequests(),
        getPastWorkerRequests(),
        getPastManagerRequests(),
      ]);
      setRequests(w);
      setManagerRequests(m);
      setPastRequests(pw);
      setPastManagerRequests(pm);
      setLoading(false);
    };
    run().catch((err: unknown) => {
      console.error('Failed to load registration requests:', err);
      setError('Unable to load requests. Check the Firestore rules and try again.');
    });
  }, []);

  const handleManagerDecision = async (request: ManagerRequest, approve: boolean) => {
    if (!user) return;
    if (!approve && rejectType !== 'manager') {
      setRejectType('manager');
      setRejectId(request.id);
      return;
    }
    
    setProcessing(request.id);
    setError('');
    try {
      if (approve) {
        await approveManagerRequest(request.id, user.uid);
      } else {
        if (!rejectReason.trim()) return;
        await rejectManagerRequest(request.id, user.uid, rejectReason);
      }
      setRejectId(null);
      setRejectReason('');
      setRejectType(null);
      loadRequests();
    } catch {
      setError('Manager request update failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleWorkerDecision = async (req: WorkerRequest, approve: boolean) => {
    if (!user) return;
    if (!approve && rejectType !== 'worker') {
      setRejectType('worker');
      setRejectId(req.id);
      return;
    }

    setProcessing(req.id);
    setError('');
    try {
      if (approve) {
        await approveWorkerRequest(req.id, user.uid, user.uid);
        await writeAuditLog({
          actorId: user.uid,
          actorName: displayName ?? 'Admin',
          role: 'admin',
          action: 'worker_approved',
          targetId: req.id,
          targetName: req.fullName,
        });
      } else {
        if (!rejectReason.trim()) return;
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
      }
      setRejectId(null);
      setRejectReason('');
      setRejectType(null);
      loadRequests();
    } catch {
      setError('Worker request update failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleScanDecision = async (scan: ScanApprovalRequest, approve: boolean) => {
    if (!user) return;
    if (!approve && (rejectType !== 'scan' || rejectId !== scan.id)) {
      setRejectType('scan');
      setRejectId(scan.id);
      return;
    }

    setProcessing(scan.id);
    setError('');
    try {
      if (approve) {
        await approveScanRequest(scan.id, user.uid, displayName ?? 'Admin');
        await writeAuditLog({
          actorId: user.uid,
          actorName: displayName ?? 'Admin',
          role: 'admin',
          action: 'exposure_record_saved',
          targetId: scan.targetWorkerId,
          targetName: scan.targetWorkerName,
          details: { dose: scan.estimatedDosePpmH, scanId: scan.id, approved: true },
        });
      } else {
        if (!rejectReason.trim()) return;
        await rejectScanRequest(scan.id, user.uid, displayName ?? 'Admin', rejectReason.trim());
        await writeAuditLog({
          actorId: user.uid,
          actorName: displayName ?? 'Admin',
          role: 'admin',
          action: 'worker_rejected',
          targetId: scan.targetWorkerId,
          targetName: scan.targetWorkerName,
          details: { reason: rejectReason.trim() },
        });
      }
      setRejectId(null);
      setRejectReason('');
      setRejectType(null);
      loadRequests();
    } catch {
      setError('Scan approval action failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">System Requests & Authorizations</h1>
          <p className="text-gray-400 text-sm">Review registrations and authorize peer dosimeter exposure scans</p>
        </div>
      </div>

      <div className="flex border-b border-navy-border mb-6">
        <button 
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'pending' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('pending')}
        >
          Registration Requests ({managerRequests.length + requests.length})
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'scans' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('scans')}
        >
          Dosimeter Scan Approvals ({scanApprovals.length})
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'history' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><LoadingSpinner size={24} /></div>
      ) : activeTab === 'pending' ? (
        <>
          <div className="card card-flush mb-6">
            <div className="p-5 border-b border-navy-border"><h2 className="text-base font-bold">Manager Requests</h2></div>
            {managerRequests.length === 0 ? <EmptyState icon={ClipboardList} title="No pending manager requests" /> : managerRequests.map((req) => (
              <div key={req.id} className="p-5 border-b border-navy-border flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{req.fullName}</div>
                  <div className="text-sm text-gray-400">{req.email}{req.department ? ` · ${req.department}` : ''}</div>
                  <div className="text-xs text-gray-500 mt-1">Submitted {formatDateTime(req.submittedAt)}</div>
                </div>
                
                <div className="flex gap-2 items-center">
                  {rejectId === req.id && rejectType === 'manager' ? (
                    <div className="flex gap-2 items-center flex-wrap">
                      <input
                        type="text"
                        className="input-field text-sm w-48"
                        placeholder="Reason for rejection"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-danger btn-sm" onClick={() => handleManagerDecision(req, false)} disabled={!rejectReason.trim() || processing === req.id}>
                        {processing === req.id ? <LoadingSpinner size={14} /> : 'Confirm'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setRejectId(null); setRejectReason(''); setRejectType(null); }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => handleManagerDecision(req, true)} disabled={!!processing}>
                        <Check size={14} /> Approve
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleManagerDecision(req, false)} disabled={!!processing}>
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card card-flush">
            <div className="p-5 border-b border-navy-border"><h2 className="text-base font-bold">Worker Requests</h2></div>
            {requests.length === 0 ? <EmptyState icon={ClipboardList} title="No pending worker requests" /> : requests.map((req) => (
              <div key={req.id} className="p-5 border-b border-navy-border flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{req.fullName}</div>
                  <div className="text-sm text-gray-400">{req.department} · {req.designation}</div>
                  {req.email && <div className="text-sm text-gray-500">{req.email}</div>}
                  <div className="text-xs text-gray-500 mt-1">Submitted {formatDateTime(req.submittedAt)}</div>
                </div>
                
                <div className="flex gap-2 items-center">
                  {rejectId === req.id && rejectType === 'worker' ? (
                    <div className="flex gap-2 items-center flex-wrap">
                      <input
                        type="text"
                        className="input-field text-sm w-48"
                        placeholder="Reason for rejection"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-danger btn-sm" onClick={() => handleWorkerDecision(req, false)} disabled={!rejectReason.trim() || processing === req.id}>
                        {processing === req.id ? <LoadingSpinner size={14} /> : 'Confirm'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setRejectId(null); setRejectReason(''); setRejectType(null); }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => handleWorkerDecision(req, true)} disabled={!!processing}>
                        <Check size={14} /> Approve
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleWorkerDecision(req, false)} disabled={!!processing}>
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : activeTab === 'scans' ? (
        <div className="card card-flush mb-6">
          <div className="p-5 border-b border-navy-border flex justify-between items-center">
            <h2 className="text-base font-bold">Worker-to-Worker Dosimeter Scan Submissions</h2>
            <span className="text-xs text-gray-400">Requires Admin/Manager verification before permanent history creation</span>
          </div>
          {scanApprovals.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="No pending scan submissions"
              description="When workers scan other workers' dosimeters, their submissions appear here for review."
            />
          ) : (
            <div className="flex flex-col">
              {scanApprovals.map((scan) => (
                <div key={scan.id} className="p-5 border-b border-navy-border flex items-center gap-4 flex-wrap">
                  {/* Photo thumbnail */}
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: '8px',
                      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                      flexShrink: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={() => scan.imageUrl && setPreviewImage(scan.imageUrl)}
                    title="Click to view original photographed dosimeter strip"
                  >
                    {scan.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={scan.imageUrl} alt="Dosimeter strip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={20} style={{ color: 'var(--color-text-muted)' }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-base">{scan.targetWorkerName}</span>
                      <span className="font-mono text-xs text-blue-400">{scan.targetWorkerPublicId}</span>
                      <DoseLevelBadge ppmH={scan.estimatedDosePpmH} />
                    </div>
                    <div className="text-sm text-gray-300">
                      Estimated: <strong>{formatDose(scan.estimatedDosePpmH)} ppm·h</strong> ({scan.shift} shift · {formatDuration(scan.monitoringDuration)})
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Scanned by: <strong>{scan.scannerName}</strong> · Captured: {formatDateTime(scan.scanTimestamp)}
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    {rejectId === scan.id && rejectType === 'scan' ? (
                      <div className="flex gap-2 items-center flex-wrap">
                        <input
                          type="text"
                          className="input-field text-sm w-48"
                          placeholder="Rejection reason"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          autoFocus
                        />
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleScanDecision(scan, false)}
                          disabled={!rejectReason.trim() || processing === scan.id}
                        >
                          {processing === scan.id ? <LoadingSpinner size={14} /> : 'Confirm'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setRejectId(null); setRejectReason(''); setRejectType(null); }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleScanDecision(scan, true)}
                          disabled={!!processing}
                        >
                          <Check size={14} /> Approve & Commit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleScanDecision(scan, false)}
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
      ) : (
        <>
          <div className="card card-flush mb-6">
            <div className="p-5 border-b border-navy-border"><h2 className="text-base font-bold">Manager Request History</h2></div>
            {pastManagerRequests.length === 0 ? <EmptyState icon={ClipboardList} title="No history" /> : pastManagerRequests.map((req) => (
              <div key={req.id} className="p-5 border-b border-navy-border flex items-center gap-4 flex-wrap opacity-70">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{req.fullName}</div>
                  <div className="text-sm text-gray-400">{req.email}{req.department ? ` · ${req.department}` : ''}</div>
                  <div className="text-xs text-gray-500 mt-1">Submitted {formatDateTime(req.submittedAt)}</div>
                  {req.rejectionReason && <div className="text-xs text-red-400 mt-1">Reason: {req.rejectionReason}</div>}
                </div>
                <div className="flex items-center">
                  <RequestStatusBadge status={req.status} />
                </div>
              </div>
            ))}
          </div>

          <div className="card card-flush">
            <div className="p-5 border-b border-navy-border"><h2 className="text-base font-bold">Worker Request History</h2></div>
            {pastRequests.length === 0 ? <EmptyState icon={ClipboardList} title="No history" /> : pastRequests.map((req) => (
              <div key={req.id} className="p-5 border-b border-navy-border flex items-center gap-4 flex-wrap opacity-70">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{req.fullName}</div>
                  <div className="text-sm text-gray-400">{req.department} · {req.designation}</div>
                  {req.email && <div className="text-sm text-gray-500">{req.email}</div>}
                  <div className="text-xs text-gray-500 mt-1">Submitted {formatDateTime(req.submittedAt)}</div>
                  {req.rejectionReason && <div className="text-xs text-red-400 mt-1">Reason: {req.rejectionReason}</div>}
                </div>
                <div className="flex items-center">
                  <RequestStatusBadge status={req.status} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Image Modal */}
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
            <img src={previewImage} alt="Scanned Dosimeter Preview" style={{ width: '100%', display: 'block' }} />
            <div style={{ padding: '1rem', textAlign: 'right' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewImage(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
