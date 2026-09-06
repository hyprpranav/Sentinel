'use client';
// app/(manager)/requests/page.tsx
import { useEffect, useState } from 'react';
import { getPendingRequests } from '@/services/workerService';
import { WorkerRequest } from '@/types/worker';
import { formatDateTime } from '@/lib/utils/date';
import { RequestStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { ClipboardList, Info } from 'lucide-react';

export default function ManagerRequestsPage() {
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPendingRequests().then(setRequests).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Worker Requests</h1>
        <p>Pending registrations awaiting Master Admin approval</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>View-only Access</strong>
          <span style={{ fontSize: '0.8125rem' }}>
            Managers can view pending requests for their facility, but only the Master Admin can approve or reject them.
            Approved workers will appear in your Assigned Workers list.
          </span>
        </div>
      </div>

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

                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <RequestStatusBadge status={req.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
