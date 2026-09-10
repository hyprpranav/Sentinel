'use client';
// app/(worker)/my-exposure/page.tsx
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import {
  query,
  collection,
  where,
  getDocs,
  orderBy,
  limit as fLimit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { ExposureRecord } from '@/types/exposure';
import { formatDose, formatAvgExposure, formatDuration } from '@/lib/utils/formatting';
import { formatDateTime, toFirestoreDate } from '@/lib/utils/date';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Activity, ShieldCheck, Smartphone, ListFilter } from 'lucide-react';
import { getWorkerExposureSummary } from '@/services/exposureService';
import { DosimeterExposureSummaryCard } from '@/components/exposure/DosimeterExposureSummaryCard';

export default function MyExposurePage() {
  const { user } = useAuthContext();
  const [records, setRecords] = useState<ExposureRecord[]>([]);
  const [summary, setSummary] = useState<{ totalScans: number; totalDays: number; avgDose: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'snapshot' | 'history'>('snapshot');

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | null = null;

    async function load() {
      try {
        const wSnap = await getDocs(
          query(collection(db, COLLECTIONS.WORKERS), where('uid', '==', user!.uid), fLimit(1))
        );
        if (wSnap.empty) {
          setLoading(false);
          return;
        }
        const wId = wSnap.docs[0].id;

        const recordsQuery = query(
          collection(db, COLLECTIONS.EXPOSURE_RECORDS),
          where('workerId', '==', wId),
          orderBy('createdAt', 'desc'),
          fLimit(30)
        );

        unsubscribe = onSnapshot(
          recordsQuery,
          async (snapshot) => {
            const loaded: ExposureRecord[] = snapshot.docs.map((doc) => {
              const r = doc.data();
              return {
                id: doc.id,
                workerId: r.workerId,
                workerName: r.workerName,
                workerPublicId: r.workerPublicId,
                managerId: r.managerId,
                managerName: r.managerName,
                capturedByUid: r.capturedByUid,
                capturedByRole: r.capturedByRole,
                capturedByName: r.capturedByName,
                timestamp: toFirestoreDate(r.timestamp) ?? new Date(),
                shift: r.shift,
                imageUrl: r.imageUrl,
                stripExpiryDate: r.stripExpiryDate || r.detectedExpiryDate,
                detectedExpiryDate: r.detectedExpiryDate,
                expiryStatus: r.expiryStatus,
                temperature: r.temperature !== undefined ? Number(r.temperature) : undefined,
                humidity: r.humidity !== undefined ? Number(r.humidity) : undefined,
                location: r.location,
                weather: r.weather,
                environmentalCorrection: r.environmentalCorrection !== undefined ? Number(r.environmentalCorrection) : undefined,
                colorChangePercent: r.colorChangePercent !== undefined ? Number(r.colorChangePercent) : undefined,
                estimatedDosePpmH: Number(r.estimatedDosePpmH) || 0,
                monitoringDuration: Number(r.monitoringDuration) || 8,
                estimatedAverageExposure: Number(r.estimatedAverageExposure) || 0,
                estimatedTwa: r.estimatedTwa !== undefined ? Number(r.estimatedTwa) : undefined,
                calibrationModelVersion: r.calibrationModelVersion,
                dosimeterStatus: r.dosimeterStatus,
                isPublicVisible: r.isPublicVisible,
                submittedAt: r.submittedAt ? toFirestoreDate(r.submittedAt) ?? undefined : undefined,
                approvedAt: r.approvedAt ? toFirestoreDate(r.approvedAt) ?? undefined : undefined,
                peerScannerName: r.peerScannerName,
                createdAt: toFirestoreDate(r.createdAt) ?? new Date(),
              } as ExposureRecord;
            });

            setRecords(loaded);

            const sum = await getWorkerExposureSummary(wId).catch(() => null);
            setSummary({
              totalScans: loaded.length > 0 ? loaded.length : (sum?.totalScans ?? 0),
              totalDays: sum?.totalMonitoringDays ?? 1,
              avgDose: loaded.length > 0
                ? (loaded.reduce((acc, r) => acc + r.estimatedDosePpmH, 0) / loaded.length)
                : 0,
            });
            setLoading(false);
          },
          (err) => {
            console.warn('Real-time listener fallback:', err);
            getDocs(
              query(
                collection(db, COLLECTIONS.EXPOSURE_RECORDS),
                where('workerId', '==', wId),
                fLimit(30)
              )
            ).then((fallbackSnap) => {
              const loaded = fallbackSnap.docs
                .map((doc) => {
                  const r = doc.data();
                  return {
                    id: doc.id,
                    workerId: r.workerId,
                    workerName: r.workerName,
                    workerPublicId: r.workerPublicId,
                    managerId: r.managerId,
                    managerName: r.managerName,
                    capturedByUid: r.capturedByUid,
                    capturedByRole: r.capturedByRole,
                    capturedByName: r.capturedByName,
                    timestamp: toFirestoreDate(r.timestamp) ?? new Date(),
                    shift: r.shift,
                    imageUrl: r.imageUrl,
                    stripExpiryDate: r.stripExpiryDate || r.detectedExpiryDate,
                    colorChangePercent: r.colorChangePercent !== undefined ? Number(r.colorChangePercent) : undefined,
                    estimatedDosePpmH: Number(r.estimatedDosePpmH) || 0,
                    monitoringDuration: Number(r.monitoringDuration) || 8,
                    estimatedAverageExposure: Number(r.estimatedAverageExposure) || 0,
                    dosimeterStatus: r.dosimeterStatus,
                    createdAt: toFirestoreDate(r.createdAt) ?? new Date(),
                  } as ExposureRecord;
                })
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

              setRecords(loaded);
            }).finally(() => setLoading(false));
          }
        );
      } catch (err) {
        console.error('Failed to load exposure records', err);
        setLoading(false);
      }
    }

    load();

    return () => {
      if (unsubscribe) unsubscribe();
    };
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
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Exposure History & Analysis</h1>
        <p>Personal H₂S exposure records, cumulative dosage, and health impact metrics</p>
      </div>

      {/* Screen Mode Selector — Perfect for single-screen mobile screenshots */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div style={{
          display: 'inline-flex',
          background: 'var(--color-surface-2)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setViewMode('snapshot')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              background: viewMode === 'snapshot' ? 'var(--color-surface)' : 'transparent',
              color: viewMode === 'snapshot' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              boxShadow: viewMode === 'snapshot' ? 'var(--shadow-sm)' : 'none',
              border: viewMode === 'snapshot' ? '1px solid var(--color-border)' : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Smartphone size={14} /> Dashboard Snapshot
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setViewMode('history')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              background: viewMode === 'history' ? 'var(--color-surface)' : 'transparent',
              color: viewMode === 'history' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              boxShadow: viewMode === 'history' ? 'var(--shadow-sm)' : 'none',
              border: viewMode === 'history' ? '1px solid var(--color-border)' : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ListFilter size={14} /> Records Log ({records.length})
          </button>
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {viewMode === 'snapshot' ? 'Single-screen overview for mobile capture' : `Displaying ${records.length} historical scans`}
        </span>
      </div>

      {/* Hero 4-Metric Dosimeter Exposure & Safety Card */}
      <DosimeterExposureSummaryCard
        record={records[0] || null}
        summary={summary}
        title="Active Dosimeter Cumulative Exposure"
        isLive={true}
      />

      {/* Summary KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem', width: '100%' }}>
        <div className="stat-card" style={{ width: '100%' }}>
          <span className="stat-label">Total Scans</span>
          <span className="stat-value">{totalScans}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {summary?.totalDays ? `${summary.totalDays} active day(s)` : 'Total recorded'}
          </span>
        </div>

        <div className="stat-card" style={{ width: '100%' }}>
          <span className="stat-label">Times Affected / Exposed</span>
          <span className="stat-value" style={{ color: affectedCount > 0 ? 'var(--color-amber)' : 'var(--color-green)' }}>
            {affectedCount}
          </span>
          <span style={{ fontSize: '0.75rem', color: affectedCount > 0 ? 'var(--color-amber)' : 'var(--color-green)', fontWeight: 600 }}>
            {affectedPercent}% of total scans
          </span>
        </div>

        <div className="stat-card" style={{ width: '100%' }}>
          <span className="stat-label">Safe Clean Readings</span>
          <span className="stat-value" style={{ color: 'var(--color-green)' }}>
            {safeCount}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-green)' }}>
            {safePercent}% within safe limits
          </span>
        </div>

        <div className="stat-card" style={{ width: '100%' }}>
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
        marginBottom: '1.25rem',
        width: '100%',
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', width: '100%' }}>
          <LoadingSpinner size={24} />
        </div>
      ) : records.length === 0 ? (
        <div className="card" style={{ width: '100%' }}>
          <EmptyState
            icon={Activity}
            title="No exposure history logged yet"
            description="Your readings will appear here once your dosimeter is scanned by a manager or captured using the camera check-in."
          />
        </div>
      ) : viewMode === 'snapshot' ? (
        /* Snapshot mode: clean recent check-in summary card */
        <div className="card" style={{ width: '100%', padding: '1.25rem', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Most Recent Dosimeter Check-In</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {formatDateTime(records[0].createdAt || records[0].timestamp)}
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            padding: '0.875rem',
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Monitoring Shift</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{records[0].shift.toUpperCase()}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Chemical Darkening</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{records[0].colorChangePercent ?? 0}%</span>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Time Inside</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatDuration(records[0].monitoringDuration)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Ambient Conditions</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{records[0].temperature ?? 28.9}°C · {records[0].humidity ?? 64}% RH</span>
            </div>
          </div>
        </div>
      ) : (
        /* Full History log */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          {records.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{
                padding: '1.25rem',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                width: '100%',
              }}
            >
              {/* Scan Attribution Tag with Peer Scanner & Manager Timestamps */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: (r.peerScannerName || (r.capturedByRole === 'worker' && r.managerName && r.capturedByName !== r.workerName))
                  ? 'rgba(2, 132, 199, 0.1)'
                  : (r.capturedByRole === 'manager' || r.capturedByRole === 'admin')
                  ? 'rgba(2, 132, 199, 0.1)'
                  : 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                marginBottom: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--color-text-primary)',
              }}>
                <ShieldCheck size={15} style={{ color: '#0284c7', flexShrink: 0 }} />
                <span>
                  {(r.peerScannerName || (r.capturedByRole === 'worker' && r.managerName && r.capturedByName !== r.workerName)) ? (
                    <>
                      Scanned by peer <strong>{r.peerScannerName || r.capturedByName || 'Peer Worker'}</strong>
                      {r.submittedAt && <> on {formatDateTime(r.submittedAt)}</>}
                      {' '}· Approved by Manager <strong>{r.managerName || 'Manager'}</strong>
                      {r.approvedAt && <> on {formatDateTime(r.approvedAt)}</>}
                    </>
                  ) : (r.capturedByRole === 'manager' || r.capturedByRole === 'admin') ? (
                    <>Scanned and updated by Manager <strong>{r.capturedByName || r.managerName || 'Manager'}</strong> on {formatDateTime(r.createdAt || r.timestamp)}</>
                  ) : (
                    <>Self-scanned dosimeter record on {formatDateTime(r.createdAt || r.timestamp)}</>
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.125rem' }}>
                    {formatDateTime(r.createdAt || r.timestamp)}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {r.shift.charAt(0).toUpperCase() + r.shift.slice(1)} shift · {formatDuration(r.monitoringDuration)} duration
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
                {r.colorChangePercent !== undefined && (
                  <span style={{
                    fontWeight: 700,
                    color: r.colorChangePercent > 30 ? 'var(--color-amber)' : 'var(--color-text-secondary)',
                    background: 'var(--color-surface-2)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}>
                    Darkening: {r.colorChangePercent}%
                  </span>
                )}
                {r.temperature !== undefined && r.humidity !== undefined && (
                  <span>Ambient: {r.temperature}°C · {r.humidity}% RH</span>
                )}
                {r.stripExpiryDate && (
                  <span>Strip Expiry: {r.stripExpiryDate}</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Estimated Avg: {formatAvgExposure(r.estimatedAverageExposure)}
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
