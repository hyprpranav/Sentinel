'use client';
// app/(worker)/my-exposure/page.tsx
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { query, collection, where, getDocs, orderBy, limit as fLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { ExposureRecord } from '@/types/exposure';
import { formatDose, formatAvgExposure, formatDuration } from '@/lib/utils/formatting';
import { formatDateTime, toFirestoreDate } from '@/lib/utils/date';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Activity, BarChart2 } from 'lucide-react';
import { getWorkerExposureSummary } from '@/services/exposureService';

export default function MyExposurePage() {
  const { user } = useAuthContext();
  const [records, setRecords] = useState<ExposureRecord[]>([]);
  const [summary, setSummary] = useState<{ totalScans: number; totalDays: number; avgDose: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const wSnap = await getDocs(
          query(collection(db, COLLECTIONS.WORKERS), where('uid', '==', user!.uid), fLimit(1))
        );
        if (wSnap.empty) { setLoading(false); return; }
        const wId = wSnap.docs[0].id;

        const rSnap = await getDocs(
          query(
            collection(db, COLLECTIONS.EXPOSURE_RECORDS),
            where('workerId', '==', wId),
            orderBy('createdAt', 'desc'),
            fLimit(30)
          )
        );

        const loaded: ExposureRecord[] = [];
        rSnap.forEach((doc) => {
          const r = doc.data();
          loaded.push({
            id: doc.id,
            workerId: r.workerId,
            managerId: r.managerId,
            timestamp: toFirestoreDate(r.timestamp) ?? new Date(),
            shift: r.shift,
            imageUrl: r.imageUrl,
            stripExpiryDate: r.stripExpiryDate || r.detectedExpiryDate,
            detectedExpiryDate: r.detectedExpiryDate,
            expiryStatus: r.expiryStatus,
            temperature: r.temperature,
            humidity: r.humidity,
            location: r.location,
            weather: r.weather,
            environmentalCorrection: r.environmentalCorrection,
            colorChangePercent: r.colorChangePercent,
            estimatedDosePpmH: r.estimatedDosePpmH,
            monitoringDuration: r.monitoringDuration,
            estimatedAverageExposure: r.estimatedAverageExposure,
            estimatedTwa: r.estimatedTwa,
            calibrationModelVersion: r.calibrationModelVersion,
            dosimeterStatus: r.dosimeterStatus,
            isPublicVisible: r.isPublicVisible,
            createdAt: toFirestoreDate(r.createdAt) ?? new Date(),
          } as ExposureRecord);
        });
        setRecords(loaded);

        const sum = await getWorkerExposureSummary(wId);
        setSummary({
          totalScans: sum.totalScans,
          totalDays: sum.totalMonitoringDays,
          avgDose: loaded.length > 0 ? (loaded.reduce((acc: number, r: ExposureRecord) => acc + r.estimatedDosePpmH, 0) / loaded.length) : 0
        });

      } catch (err) {
        console.error('Failed to load exposure records', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const totalScans = records.length > 0 ? records.length : (summary?.totalScans ?? 0);
  const affectedRecords = records.filter((r) => r.estimatedDosePpmH > 0);
  const affectedCount = affectedRecords.length;
  const affectedPercent = totalScans > 0 ? Math.round((affectedCount / totalScans) * 100) : 0;
  const safeCount = Math.max(0, totalScans - affectedCount);
  const safePercent = totalScans > 0 ? Math.round((safeCount / totalScans) * 100) : 100;
  const highRiskCount = records.filter((r) => r.estimatedDosePpmH >= 30).length;
  const maxDose = records.length > 0 ? Math.max(...records.map((r) => r.estimatedDosePpmH)) : 0;
  const avgDose = records.length > 0 ? (records.reduce((acc, r) => acc + r.estimatedDosePpmH, 0) / records.length) : (summary?.avgDose ?? 0);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Exposure History & Analysis</h1>
        <p>Personal H₂S exposure records, cumulative dosage, and health impact metrics</p>
      </div>

      {/* Summary KPI Cards - Always Visible for Complete Visibility */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <div className="stat-card">
          <span className="stat-label">Total Scans</span>
          <span className="stat-value">{totalScans}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {summary?.totalDays ? `${summary.totalDays} active day(s)` : 'Total recorded'}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Times Affected / Exposed</span>
          <span className="stat-value" style={{ color: affectedCount > 0 ? 'var(--color-amber)' : 'var(--color-green)' }}>
            {affectedCount}
          </span>
          <span style={{ fontSize: '0.75rem', color: affectedCount > 0 ? 'var(--color-amber)' : 'var(--color-green)', fontWeight: 600 }}>
            {affectedPercent}% of total scans
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Safe Clean Readings</span>
          <span className="stat-value" style={{ color: 'var(--color-green)' }}>
            {safeCount}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-green)' }}>
            {safePercent}% within safe limits
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Peak Dose Recorded</span>
          <span className="stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: '4px', color: maxDose >= 30 ? '#ef4444' : 'var(--color-text-primary)' }}>
            {formatDose(maxDose)} <span style={{ fontSize: '11px', fontWeight: 500 }}>ppm·h</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Avg: {formatDose(avgDose)} ppm·h
          </span>
        </div>
      </div>

      {/* Health Impact Assessment Banner */}
      <div style={{
        padding: '0.875rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: highRiskCount > 0 ? 'rgba(239, 68, 68, 0.1)' : affectedCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        border: `1px solid ${highRiskCount > 0 ? 'rgba(239, 68, 68, 0.3)' : affectedCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
      }}>
        <Activity size={18} style={{
          color: highRiskCount > 0 ? '#ef4444' : affectedCount > 0 ? 'var(--color-amber)' : 'var(--color-green)',
          flexShrink: 0
        }} />
        <div style={{ fontSize: '0.875rem', flex: 1 }}>
          <strong style={{ color: highRiskCount > 0 ? '#ef4444' : affectedCount > 0 ? 'var(--color-amber)' : 'var(--color-green)' }}>
            {highRiskCount > 0
              ? 'Elevated H₂S Exposure Warning'
              : affectedCount > 0
              ? 'Mild Exposure Logged'
              : 'Safe Environmental Status'}
          </strong>
          <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
            {highRiskCount > 0
              ? `${highRiskCount} dosimeter scan(s) exceeded the 30 ppm·h caution threshold. Please notify your supervisor or site safety manager.`
              : affectedCount > 0
              ? `You have been exposed in ${affectedCount} scan(s) (${affectedPercent}% of check-ins). All levels remain under maximum permissible occupational limits.`
              : 'Zero exposure detected across your dosimeter records. Keep monitoring during shift changes.'}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size={24} />
        </div>
      ) : records.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Activity}
            title="No exposure history logged yet"
            description="Your readings will appear here once your dosimeter is scanned by a manager or captured using the camera check-in."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {records.map((r) => (
            <div key={r.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.125rem' }}>
                    {formatDateTime(r.createdAt)}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {r.shift.charAt(0).toUpperCase() + r.shift.slice(1)} shift · {formatDuration(r.monitoringDuration)}
                  </p>
                </div>
                <DoseLevelBadge ppmH={r.estimatedDosePpmH} />
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                  {formatDose(r.estimatedDosePpmH)}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  ppm·h
                </span>
              </div>

              {/* Environmental and Expiry details */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                {r.temperature !== undefined && r.humidity !== undefined && (
                  <span>Ambient: {r.temperature}°C · {r.humidity}% RH</span>
                )}
                {r.stripExpiryDate && (
                  <span>Strip Expiry: {r.stripExpiryDate}</span>
                )}
                {r.colorChangePercent !== undefined && (
                  <span>Reaction: {r.colorChangePercent}%</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Avg: {formatAvgExposure(r.estimatedAverageExposure)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {r.imageUrl && (
                    <a
                      href={r.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    >
                      View Photo
                    </a>
                  )}
                  <DosimeterBadge status={r.dosimeterStatus} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
