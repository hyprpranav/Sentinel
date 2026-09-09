'use client';
// app/(admin)/dashboard/page.tsx
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { formatDateTime, timeAgo } from '@/lib/utils/date';
import { formatDose } from '@/lib/utils/formatting';
import { DosimeterBadge, RequestStatusBadge, WorkerStatusBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { WeatherAnalyticsCard } from '@/components/weather/WeatherAnalyticsCard';
import {
  Users, UserCheck, ScanLine, ClipboardList,
  AlertTriangle, Shield, Activity, TrendingUp,
} from 'lucide-react';

interface Stats {
  totalWorkers: number;
  activeWorkers: number;
  activeManagers: number;
  pendingRequests: number;
  todayScans: number;
  invalidDosimeters: number;
}

interface RecentScan {
  id: string;
  workerName: string;
  workerPublicId: string;
  estimatedDosePpmH: number;
  dosimeterStatus: string;
  timestamp: Date;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [workers, managers, requests, records] = await Promise.all([
          getDocs(collection(db, COLLECTIONS.WORKERS)),
          getDocs(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'manager'))),
          getDocs(query(collection(db, COLLECTIONS.WORKER_REQUESTS), where('status', '==', 'pending'))),
          getDocs(query(collection(db, COLLECTIONS.EXPOSURE_RECORDS), orderBy('createdAt', 'desc'), limit(10))),
        ]);

        const today = new Date(); today.setHours(0, 0, 0, 0);
        let todayScans = 0;
        let invalidDosimeters = 0;
        const scans: RecentScan[] = [];

        records.forEach((d) => {
          const data = d.data();
          const ts = data.createdAt?.toDate?.() ?? new Date();
          if (ts >= today) todayScans++;
          if (data.dosimeterStatus === 'expired' || data.dosimeterStatus === 'invalid') invalidDosimeters++;
          scans.push({
            id: d.id,
            workerName: data.workerName ?? 'N/A',
            workerPublicId: data.workerPublicId ?? 'N/A',
            estimatedDosePpmH: data.estimatedDosePpmH ?? 0,
            dosimeterStatus: data.dosimeterStatus ?? 'unknown',
            timestamp: ts,
          });
        });

        const activeWorkers = workers.docs.filter((d) => d.data().status === 'active').length;

        setStats({
          totalWorkers: workers.size,
          activeWorkers,
          activeManagers: managers.size,
          pendingRequests: requests.size,
          todayScans,
          invalidDosimeters,
        });
        setRecentScans(scans);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>System Overview</h1>
        <p>Organization-wide H₂S exposure monitoring status</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size={28} />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
            {[
              { label: 'Total Workers',      value: stats?.totalWorkers ?? 0,     icon: Users,         sub: 'Registered in system' },
              { label: 'Active Workers',     value: stats?.activeWorkers ?? 0,    icon: Activity,      sub: 'Currently active' },
              { label: 'Active Managers',    value: stats?.activeManagers ?? 0,   icon: UserCheck,     sub: 'Registered managers' },
              { label: 'Pending Requests',   value: stats?.pendingRequests ?? 0,  icon: ClipboardList, sub: 'Awaiting review' },
              { label: 'Scans Today',        value: stats?.todayScans ?? 0,       icon: ScanLine,      sub: 'Dosimeter readings' },
              { label: 'Invalid Dosimeters', value: stats?.invalidDosimeters ?? 0,icon: AlertTriangle, sub: 'Require attention' },
            ].map(({ label, value, icon: Icon, sub }) => (
              <div key={label} className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="stat-label">{label}</span>
                  <Icon size={16} style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                </div>
                <span className="stat-value">{value}</span>
                <span className="stat-sub">{sub}</span>
              </div>
            ))}
          </div>

          <WeatherAnalyticsCard />

          {/* Recent Scans */}
          <div className="card card-flush">
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ fontSize: '0.9375rem' }}>Recent Dosimeter Scans</h3>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Last 10 records</span>
            </div>

            {recentScans.length === 0 ? (
              <EmptyState icon={ScanLine} title="No scans recorded yet" description="Dosimeter scans will appear here once managers begin scanning workers." />
            ) : (
              <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Estimated Dose</th>
                      <th>Dosimeter</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.map((scan) => (
                      <tr key={scan.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{scan.workerName}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{scan.workerPublicId}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {formatDose(scan.estimatedDosePpmH)}
                          </span>
                        </td>
                        <td><DosimeterBadge status={scan.dosimeterStatus} /></td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          {timeAgo(scan.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
