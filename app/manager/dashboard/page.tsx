'use client';
// app/(manager)/dashboard/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkersByManager } from '@/services/workerService';
import { getRecentScans } from '@/services/exposureService';
import { getPendingRequests } from '@/services/workerService';
import { Worker } from '@/types/worker';
import { ExposureRecord } from '@/types/exposure';
import { formatDose } from '@/lib/utils/formatting';
import { timeAgo, getGreeting } from '@/lib/utils/date';
import { DosimeterBadge, WorkerStatusBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { WeatherAnalyticsCard } from '@/components/weather/WeatherAnalyticsCard';
import { ScanLine, Users, ClipboardList, AlertTriangle, ChevronRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';

export default function ManagerDashboard() {
  const { user, displayName } = useAuthContext();
  const [managerName, setManagerName] = useState<string | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [scans, setScans] = useState<ExposureRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, COLLECTIONS.MANAGERS, user.uid))
      .then((snap) => {
        if (snap.exists()) setManagerName(snap.data().fullName);
      })
      .catch(() => {});

    Promise.all([
      getWorkersByManager(user.uid),
      getRecentScans(user.uid, 8),
      getPendingRequests(),
    ]).then(([w, s, p]) => {
      setWorkers(w);
      setScans(s);
      setPendingCount(p.length);
    }).finally(() => setLoading(false));
  }, [user]);

  const activeName = managerName || displayName || 'Manager';
  const firstName = activeName.split(' ')[0];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayScans = scans.filter((s) => new Date(s.createdAt) >= today).length;
  const needsAttention = workers.filter((w) =>
    w.dosimeterStatus === 'expired' || w.dosimeterStatus === 'invalid'
  ).length;

  return (
    <div>
      {/* Greeting */}
      <div className="page-header">
        <h1>{getGreeting()}, {firstName}</h1>
        <p>Safety overview for today: {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Primary CTA - Scan */}
      <Link href="/manager/scan" style={{ display: 'block', textDecoration: 'none', marginBottom: '1.75rem' }}>
        <div style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
          className="btn-primary-cta"
        >
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-lg)',
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ScanLine size={26} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: '1.0625rem', marginBottom: '0.125rem' }}>
              Scan Dosimeter
            </div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Scan a worker QR code and capture sensing strip
            </div>
          </div>
          <ChevronRight style={{ color: 'var(--color-text-muted)' }} size={20} />
        </div>
      </Link>

      {/* Stats */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><LoadingSpinner size={24} /></div>
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
            {[
              { label: 'Assigned Workers', value: workers.length,  icon: Users },
              { label: 'Scans Today',      value: todayScans,      icon: ScanLine },
              { label: 'Pending Requests', value: pendingCount,    icon: ClipboardList },
              { label: 'Needs Attention',  value: needsAttention,  icon: AlertTriangle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="stat-label">{label}</span>
                  <Icon size={15} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <span className="stat-value">{value}</span>
              </div>
            ))}
          </div>

          <WeatherAnalyticsCard />

          <div className="two-col">
            {/* Recent Scans */}
            <div className="card card-flush">
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: '0.9375rem' }}>
                Recent Scan Activity
              </div>
              {scans.length === 0 ? (
                <EmptyState icon={ScanLine} title="No scans yet" description="Start by scanning a worker's dosimeter." />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Worker</th><th>Dose</th><th>Time</th></tr></thead>
                    <tbody>
                      {scans.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{s.workerName ?? 'N/A'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.workerPublicId}</div>
                          </td>
                          <td style={{ fontWeight: 600, fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>
                            {formatDose(s.estimatedDosePpmH)}
                          </td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                            {timeAgo(s.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Workers needing attention */}
            <div className="card card-flush">
              <div style={{
                padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Assigned Workers</span>
                <Link href="/manager/workers" style={{ fontSize: '0.8125rem', color: 'var(--color-accent)' }}>View all</Link>
              </div>
              {workers.length === 0 ? (
                <EmptyState icon={Users} title="No workers assigned" description="Workers will appear here once assigned." />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Status</th><th>Dosimeter</th></tr></thead>
                    <tbody>
                      {workers.slice(0, 6).map((w) => (
                        <tr key={w.id}>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{w.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{w.publicId}</div>
                          </td>
                          <td><WorkerStatusBadge status={w.status} /></td>
                          <td><DosimeterBadge status={w.dosimeterStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
