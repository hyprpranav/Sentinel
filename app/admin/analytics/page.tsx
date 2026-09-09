'use client';
// app/(admin)/analytics/page.tsx
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { ExposureRecord } from '@/types/exposure';
import { formatDose } from '@/lib/utils/formatting';
import { formatDateTime, toFirestoreDate } from '@/lib/utils/date';
import { DoseLevelBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function AdminAnalyticsPage() {
  const [records, setRecords] = useState<ExposureRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const rSnap = await getDocs(
          query(collection(db, COLLECTIONS.EXPOSURE_RECORDS), orderBy('createdAt', 'desc'), limit(100))
        );
        const loaded: ExposureRecord[] = [];
        rSnap.forEach((doc) => {
          const r = doc.data();
          loaded.push({
            id: doc.id,
            workerId: r.workerId,
            workerName: r.workerName,
            workerPublicId: r.workerPublicId,
            stripExpiryDate: r.stripExpiryDate,
            timestamp: toFirestoreDate(r.timestamp) ?? new Date(),
            shift: r.shift,
            estimatedDosePpmH: r.estimatedDosePpmH,
          } as ExposureRecord);
        });
        setRecords(loaded);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute stats
  const levelCounts = { low: 0, moderate: 0, high: 0, critical: 0 };
  const shiftCounts = { morning: 0, afternoon: 0, night: 0 };
  let totalDose = 0;

  records.forEach((r) => {
    if (r.estimatedDosePpmH >= 50) levelCounts.critical++;
    else if (r.estimatedDosePpmH >= 20) levelCounts.high++;
    else if (r.estimatedDosePpmH >= 5) levelCounts.moderate++;
    else levelCounts.low++;

    if (r.shift === 'morning') shiftCounts.morning++;
    else if (r.shift === 'afternoon') shiftCounts.afternoon++;
    else if (r.shift === 'night') shiftCounts.night++;

    totalDose += r.estimatedDosePpmH;
  });

  const avgDose = records.length > 0 ? totalDose / records.length : 0;

  const pieData = [
    { name: 'Low (<5)', value: levelCounts.low, color: 'var(--color-green)' },
    { name: 'Moderate (5-20)', value: levelCounts.moderate, color: 'var(--color-amber)' },
    { name: 'High (20-50)', value: levelCounts.high, color: 'var(--color-orange)' },
    { name: 'Critical (>50)', value: levelCounts.critical, color: 'var(--color-red)' },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'Morning', scans: shiftCounts.morning },
    { name: 'Afternoon', scans: shiftCounts.afternoon },
    { name: 'Night', scans: shiftCounts.night },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Exposure Analytics</h1>
        <p>Organization-wide H₂S exposure trends (Last 100 Scans)</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner size={24} /></div>
      ) : records.length === 0 ? (
        <EmptyState icon={BarChart2} title="No data available" />
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <span className="stat-label">Total Scans Analysed</span>
              <span className="stat-value">{records.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Average Dose (ppm·h)</span>
              <span className="stat-value">{formatDose(avgDose)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Critical Exposures (&gt;50)</span>
              <span className="stat-value" style={{ color: levelCounts.critical > 0 ? 'var(--color-red)' : 'inherit' }}>
                {levelCounts.critical}
              </span>
            </div>
          </div>

          <div className="two-col" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Exposure Levels Distribution</h3>
              <div style={{ height: 260, display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Scans by Shift</h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: 'var(--color-surface-2)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="scans" fill="var(--color-accent)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card card-flush">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: '0.9375rem' }}>
              Highest Recorded Exposures
            </div>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Dose (ppm·h)</th>
                    <th>Shift</th>
                    <th>Strip Expiry</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[...records].sort((a, b) => b.estimatedDosePpmH - a.estimatedDosePpmH).slice(0, 10).map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.workerName} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 4 }}>{r.workerPublicId}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 600 }}>{formatDose(r.estimatedDosePpmH)}</span>
                          <DoseLevelBadge ppmH={r.estimatedDosePpmH} />
                        </div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{r.shift}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{r.stripExpiryDate || 'N/A'}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{formatDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
