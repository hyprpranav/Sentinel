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
import { ManagerRequest } from '@/types/user';
import { ClipboardList, Check, X, AlertCircle } from 'lucide-react';

export default function AdminRequestsPage() {
  const { user, displayName } = useAuthContext();
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [managerRequests, setManagerRequests] = useState<ManagerRequest[]>([]);
  
  const [pastRequests, setPastRequests] = useState<WorkerRequest[]>([]);
  const [pastManagerRequests, setPastManagerRequests] = useState<ManagerRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectType, setRejectType] = useState<'manager'|'worker'|null>(null);

  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const loadRequests = () => {
    setLoading(true);
    Promise.all([
      getPendingRequests(),
      getPendingManagerRequests(),
      getPastWorkerRequests(),
      getPastManagerRequests()
    ]).then(([w, m, pw, pm]) => {
      setRequests(w);
      setManagerRequests(m);
      setPastRequests(pw);
      setPastManagerRequests(pm);
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
    run();
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

  return (
    <div>
      <div className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Registration Requests</h1>
          <p className="text-gray-400 text-sm">Review pending and past manager and worker requests</p>
        </div>
      </div>

      <div className="flex border-b border-navy-border mb-6">
        <button 
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'pending' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Requests
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
    </div>
  );
}
