'use client';
// app/manager/exposure/page.tsx
// Manager exposure analytics — shows stats and records for their workers' scans.
// Falls back to fetching by assigned workers if managerId-filtered query returns empty.

import { useEffect, useState, useMemo } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import {
  query, collection, where, getDocs, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { ExposureRecord } from '@/types/exposure';
import { formatDose, formatAvgExposure, formatDuration } from '@/lib/utils/formatting';
import { formatDateTime, toFirestoreDate } from '@/lib/utils/date';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Activity, Search, TrendingUp, AlertTriangle, BarChart2, Users } from 'lucide-react';
import { DosimeterExposureSummaryCard } from '@/components/exposure/DosimeterExposureSummaryCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

function docToRecord(id: string, r: Record<string, unknown>): ExposureRecord {
  return {
    id,
    workerId: r.workerId as string,
    workerName: r.workerName as string | undefined,
    workerPublicId: r.workerPublicId as string | undefined,
    managerId: r.managerId as string,
    managerName: r.managerName as string | undefined,
    timestamp: toFirestoreDate(r.timestamp as Timestamp) ?? new Date(),
    shift: r.shift as ExposureRecord['shift'],
    imageUrl: r.imageUrl as string | undefined,
    stripExpiryDate: r.stripExpiryDate as string | undefined,
    estimatedDosePpmH: r.estimatedDosePpmH as number,
    monitoringDuration: r.monitoringDuration as number,
    estimatedAverageExposure: r.estimatedAverageExposure as number,
    colourFeatures: r.colourFeatures as ExposureRecord['colourFeatures'],
    calibrationModelVersion: r.calibrationModelVersion as string,
    dosimeterStatus: r.dosimeterStatus as ExposureRecord['dosimeterStatus'],
    notes: r.notes as string | undefined,
    status: (r.status as ExposureRecord['status']) || 'pending',
    isPublicVisible: (r.isPublicVisible as boolean) ?? false,
    createdAt: toFirestoreDate(r.createdAt as Timestamp) ?? new Date(),
  };
}

export default function ManagerExposurePage() {
  const { user } = useAuthContext();
  const [records, setRecords] = useState<ExposureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        // Strategy 1: Query by managerId == auth UID
        let snap = await getDocs(
          query(
            collection(db, COLLECTIONS.EXPOSURE_RECORDS),
            where('managerId', '==', user!.uid),
            orderBy('createdAt', 'desc'),
            limit(200)
          )
        ).catch(() => null);

        if (!snap || snap.empty) {
          // Strategy 2: Fallback — get the worker IDs assigned to this manager
          // and fetch all their records regardless of managerId field value
          const workerSnap = await getDocs(
            query(
              collection(db, COLLECTIONS.WORKERS),
              where('managerId', '==', user!.uid),
              limit(100)
            )
          ).catch(() => null);

          if (workerSnap && !workerSnap.empty) {
            const workerIds = workerSnap.docs.map((d) => d.id);
            // Fetch records for each worker (Firestore 'in' supports up to 30 items)
            const chunks: string[][] = [];
            for (let i = 0; i < workerIds.length; i += 10) {
              chunks.push(workerIds.slice(i, i + 10));
            }
            const allDocs: any[] = [];
            for (const chunk of chunks) {
              const chunkSnap = await getDocs(
                query(
                  collection(db, COLLECTIONS.EXPOSURE_RECORDS),
                  where('workerId', 'in', chunk),
                  orderBy('createdAt', 'desc'),
                  limit(200)
                )
              ).catch(() => null);
              if (chunkSnap) allDocs.push(...chunkSnap.docs);
            }
            setRecords(
              allDocs
                .map((d) => docToRecord(d.id, d.data() as Record<string, unknown>))
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            );
            return;
          }

          // Strategy 3: Last resort — fetch all records and show them (happens during early setup)
          // This is safe because Firestore rules already restrict what this user can read
          const allSnap = await getDocs(
            query(
              collection(db, COLLECTIONS.EXPOSURE_RECORDS),
              orderBy('createdAt', 'desc'),
              limit(200)
            )
          ).catch(() => null);

          if (allSnap && !allSnap.empty) {
            setRecords(
              allSnap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>))
            );
          }
          return;
        }

        if (snap && !snap.empty) {
          setRecords(snap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>)));
        }
      } catch (err) {
        console.error('Manager exposure load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // ── Analytics computations ──
  const levelCounts = { low: 0, moderate: 0, high: 0, critical: 0 };
  const shiftCounts = { morning: 0, afternoon: 0, night: 0 };
  let totalDose = 0;
  const uniqueWorkers = new Set<string>();

  records.forEach((r) => {
    if (r.estimatedDosePpmH >= 50) levelCounts.critical++;
    else if (r.estimatedDosePpmH >= 20) levelCounts.high++;
    else if (r.estimatedDosePpmH >= 5) levelCounts.moderate++;
    else levelCounts.low++;

    if (r.shift === 'morning') shiftCounts.morning++;
    else if (r.shift === 'afternoon') shiftCounts.afternoon++;
    else if (r.shift === 'night') shiftCounts.night++;

    totalDose += r.estimatedDosePpmH;
    uniqueWorkers.add(r.workerId);
  });

  const avgDose = records.length > 0 ? totalDose / records.length : 0;

  const pieData = [
    { name: 'Low (<5)', value: levelCounts.low, color: 'var(--color-green)' },
    { name: 'Moderate (5–20)', value: levelCounts.moderate, color: 'var(--color-amber)' },
    { name: 'High (20–50)', value: levelCounts.high, color: 'var(--color-orange)' },
    { name: 'Critical (>50)', value: levelCounts.critical, color: 'var(--color-red)' },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: 'Morning', scans: shiftCounts.morning },
    { name: 'Afternoon', scans: shiftCounts.afternoon },
    { name: 'Night', scans: shiftCounts.night },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        (r.workerName && r.workerName.toLowerCase().includes(q)) ||
        (r.workerPublicId && r.workerPublicId.toLowerCase().includes(q))
    );
  }, [search, records]);

  return (
    <div>
      <div className="page-header">
        <h1>Exposure Analytics</h1>
        <p>H₂S exposure trends for your workers (last 200 scans)</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size={24} />
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={BarChart2}
          title="No exposure records yet"
          description="Scan a worker's dosimeter to start building their exposure history."
        />
      ) : (
        <>
          {/* Active Field Dosimeter Exposure Benchmark Card */}
          <DosimeterExposureSummaryCard
            record={records[0] || null}
            title="Active Field Dosimeter Exposure Benchmark"
            isLive={true}
          />

          {/* ── Stats row ── */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <span className="stat-label">Total Scans</span>
              <span className="stat-value">{records.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Workers Monitored</span>
              <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Users size={18} style={{ color: 'var(--color-accent)' }} />
                {uniqueWorkers.size}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Average Dose (ppm·h)</span>
              <span className="stat-value">{formatDose(avgDose)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Critical Exposures (&gt;50)</span>
              <span
                className="stat-value"
                style={{ color: levelCounts.critical > 0 ? 'var(--color-red)' : 'inherit' }}
              >
                {levelCounts.critical}
              </span>
            </div>
          </div>

          {/* ── Charts ── */}
          <div className="two-col" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Exposure Levels Distribution</h3>
              {pieData.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', padding: '2rem 0', textAlign: 'center' }}>
                  No data
                </p>
              ) : (
                <>
                  <div style={{ height: 220, display: 'flex', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={85}
                          paddingAngle={2} dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                    {pieData.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        {d.name} <strong>({d.value})</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Scans by Shift</h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                      axisLine={false} tickLine={false} allowDecimals={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'var(--color-surface-2)' }}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="scans" fill="var(--color-accent)" radius={[4, 4, 0, 0]} barSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Highest recorded exposures ── */}
          {[...records].sort((a, b) => b.estimatedDosePpmH - a.estimatedDosePpmH).slice(0, 1)[0]?.estimatedDosePpmH > 0 && (
            <div className="card card-flush" style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={15} style={{ color: 'var(--color-accent)' }} />
                Highest Recorded Exposures
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Dose (ppm·h)</th>
                      <th>Avg Exposure</th>
                      <th>Shift</th>
                      <th>Strip Expiry</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...records]
                      .sort((a, b) => b.estimatedDosePpmH - a.estimatedDosePpmH)
                      .slice(0, 10)
                      .map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 500 }}>
                            {r.workerName ?? 'Unknown'}
                            {r.workerPublicId && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 4 }}>
                                {r.workerPublicId}
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatDose(r.estimatedDosePpmH)}</span>
                              <DoseLevelBadge ppmH={r.estimatedDosePpmH} />
                            </div>
                          </td>
                          <td style={{ fontSize: '0.875rem' }}>{formatAvgExposure(r.estimatedAverageExposure)}</td>
                          <td style={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>{r.shift}</td>
                          <td style={{ fontSize: '0.8125rem' }}>{r.stripExpiryDate || 'N/A'}</td>
                          <td style={{ fontSize: '0.8125rem' }}>{formatDateTime(r.createdAt)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Alert for critical workers ── */}
          {levelCounts.critical > 0 && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>
                <strong>{levelCounts.critical} critical exposure{levelCounts.critical > 1 ? 's' : ''}</strong> recorded (&gt;50 ppm·h).
                Immediate review required. Check the records below and contact the worker&apos;s safety officer.
              </span>
            </div>
          )}

          {/* ── All Records Table ── */}
          <div className="card card-flush">
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap',
            }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', flex: 1 }}>All Scan Records</h3>
              <div style={{ position: 'relative', maxWidth: 280, flex: '1 1 200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="search"
                  className="input"
                  placeholder="Search by worker name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={Activity} title="No records match your search" description="Try a different name or worker ID." />
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Dose (ppm·h)</th>
                      <th>Avg Exposure</th>
                      <th>Duration</th>
                      <th>Dosimeter</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.workerName ?? 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.workerPublicId}</div>
                        </td>
                        <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                          {formatDateTime(r.createdAt)}
                        </td>
                        <td style={{ fontSize: '0.8125rem', textTransform: 'capitalize' }}>
                          {r.shift}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9375rem' }}>
                              {formatDose(r.estimatedDosePpmH)}
                            </span>
                            <DoseLevelBadge ppmH={r.estimatedDosePpmH} />
                          </div>
                        </td>
                        <td style={{ fontSize: '0.875rem' }}>{formatAvgExposure(r.estimatedAverageExposure)}</td>
                        <td style={{ fontSize: '0.875rem' }}>{formatDuration(r.monitoringDuration)}</td>
                        <td><DosimeterBadge status={r.dosimeterStatus} /></td>
                        <td>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
                            padding: '0.125rem 0.5rem', borderRadius: 99,
                            background: r.status === 'approved' ? 'rgba(34,197,94,0.12)'
                              : r.status === 'rejected' ? 'rgba(239,68,68,0.12)'
                              : 'rgba(251,191,36,0.12)',
                            color: r.status === 'approved' ? 'var(--color-green)'
                              : r.status === 'rejected' ? '#ef4444'
                              : 'var(--color-amber)',
                          }}>
                            {r.status}
                          </span>
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
