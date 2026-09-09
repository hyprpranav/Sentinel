'use client';
// app/(admin)/audit-logs/page.tsx
import { useEffect, useState } from 'react';
import { getAuditLogs } from '@/services/auditLogService';
import { AuditLog } from '@/types/audit';
import { formatDateTime } from '@/lib/utils/date';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { Badge } from '@/components/ui/Badge';
import { FileText } from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string; variant: 'green'|'red'|'amber'|'blue'|'gray' }> = {
  manager_approved:      { label: 'Manager Approved',      variant: 'green' },
  manager_rejected:      { label: 'Manager Rejected',      variant: 'red' },
  manager_activated:     { label: 'Manager Activated',     variant: 'green' },
  manager_deactivated:   { label: 'Manager Deactivated',   variant: 'amber' },
  worker_approved:       { label: 'Worker Approved',       variant: 'green' },
  worker_rejected:       { label: 'Worker Rejected',       variant: 'red' },
  worker_profile_updated:{ label: 'Profile Updated',       variant: 'blue' },
  dosimeter_scanned:     { label: 'Dosimeter Scanned',     variant: 'blue' },
  exposure_record_saved: { label: 'Record Saved',          variant: 'green' },
  calibration_updated:   { label: 'Calibration Updated',   variant: 'amber' },
  admin_settings_changed:{ label: 'Settings Changed',      variant: 'amber' },
  user_login:            { label: 'User Login',            variant: 'gray' },
  user_logout:           { label: 'User Logout',           variant: 'gray' },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs(200).then(setLogs).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Audit Logs</h1>
        <p>Immutable record of all system actions</p>
      </div>

      <div className="card card-flush">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <LoadingSpinner size={24} />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={FileText} title="No audit logs yet" description="System actions will be logged here automatically." />
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = ACTION_LABELS[log.action] ?? { label: log.action, variant: 'gray' as const };
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td style={{ fontWeight: 500 }}>{log.actorName}</td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontSize: '0.8125rem' }}>{log.role}</span>
                      </td>
                      <td>
                        <Badge label={meta.label} variant={meta.variant} />
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        {log.targetName ?? 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
