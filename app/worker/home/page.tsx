'use client';
// app/(worker)/home/page.tsx
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import {
  query,
  collection,
  where,
  getDocs,
  limit,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { ExposureRecord } from '@/types/exposure';
import { Worker } from '@/types/worker';
import { formatDuration, formatDose } from '@/lib/utils/formatting';
import { formatDateTime, getGreeting, toFirestoreDate } from '@/lib/utils/date';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap';
import { WeatherAnalyticsCard } from '@/components/weather/WeatherAnalyticsCard';
import { WorkerDosimeterScanCard } from '@/components/worker/WorkerDosimeterScanCard';
import { DosimeterExposureSummaryCard } from '@/components/exposure/DosimeterExposureSummaryCard';
import { Activity, Info, ShieldCheck, UserCheck } from 'lucide-react';

export default function WorkerHome() {
  const { user, displayName } = useAuthContext();
  const [workerProfile, setWorkerProfile] = useState<Worker | null>(null);
  const [latestRecord, setLatestRecord] = useState<ExposureRecord | null>(null);
  const [recentScans, setRecentScans] = useState<ExposureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let unsubscribeRecords: (() => void) | null = null;

    async function setupWorkerListener() {
      try {
        const wSnap = await getDocs(
          query(collection(db, COLLECTIONS.WORKERS), where('uid', '==', uid), limit(1))
        );

        if (wSnap.empty) {
          setLoading(false);
          return;
        }

        const wDoc = wSnap.docs[0];
        const wData = wDoc.data();
        const profile: Worker = {
          id: wDoc.id,
          publicId: wData.publicId,
          uid: wData.uid,
          fullName: wData.fullName,
          department: wData.department,
          designation: wData.designation,
          status: wData.status,
          qrCodeData: wData.qrCodeData,
          dosimeterStatus: wData.dosimeterStatus,
          profilePhotoUrl: wData.profilePhotoUrl,
          createdAt: toFirestoreDate(wData.createdAt) ?? new Date(),
          updatedAt: toFirestoreDate(wData.updatedAt) ?? new Date(),
        };
        setWorkerProfile(profile);

        // Real-time listener on exposure records for instant updates when manager scans
        const recordsQuery = query(
          collection(db, COLLECTIONS.EXPOSURE_RECORDS),
          where('workerId', '==', wDoc.id),
          orderBy('createdAt', 'desc'),
          limit(30)
        );

        unsubscribeRecords = onSnapshot(
          recordsQuery,
          (snapshot) => {
            const records: ExposureRecord[] = snapshot.docs.map((doc) => {
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
                estimatedDosePpmH: Number(r.estimatedDosePpmH) || 0,
                stripExpiryDate: r.stripExpiryDate || r.detectedExpiryDate,
                detectedExpiryDate: r.detectedExpiryDate,
                expiryStatus: r.expiryStatus,
                monitoringDuration: Number(r.monitoringDuration) || 8,
                estimatedAverageExposure: Number(r.estimatedAverageExposure) || 0,
                estimatedTwa: r.estimatedTwa !== undefined ? Number(r.estimatedTwa) : undefined,
                colorChangePercent: r.colorChangePercent !== undefined ? Number(r.colorChangePercent) : undefined,
                temperature: r.temperature !== undefined ? Number(r.temperature) : undefined,
                humidity: r.humidity !== undefined ? Number(r.humidity) : undefined,
                location: r.location,
                weather: r.weather,
                environmentalCorrection: r.environmentalCorrection !== undefined ? Number(r.environmentalCorrection) : undefined,
                calibrationModelVersion: r.calibrationModelVersion,
                dosimeterStatus: r.dosimeterStatus,
                isPublicVisible: r.isPublicVisible,
                submittedAt: r.submittedAt ? toFirestoreDate(r.submittedAt) ?? undefined : undefined,
                approvedAt: r.approvedAt ? toFirestoreDate(r.approvedAt) ?? undefined : undefined,
                peerScannerName: r.peerScannerName,
                createdAt: toFirestoreDate(r.createdAt) ?? new Date(),
                status: r.status,
                reviewerRemarks: r.reviewerRemarks,
              } as ExposureRecord;
            });

            setRecentScans(records);
            setLatestRecord(records[0] ?? null);
            setLoading(false);
          },
          (err) => {
            console.warn('Real-time listener fallback to getDocs:', err);
            // Fallback to one-time query if order-by index is still propagating
            getDocs(
              query(
                collection(db, COLLECTIONS.EXPOSURE_RECORDS),
                where('workerId', '==', wDoc.id),
                limit(30)
              )
            ).then((fallbackSnap) => {
              const records = fallbackSnap.docs
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
                    estimatedDosePpmH: Number(r.estimatedDosePpmH) || 0,
                    stripExpiryDate: r.stripExpiryDate || r.detectedExpiryDate,
                    monitoringDuration: Number(r.monitoringDuration) || 8,
                    estimatedAverageExposure: Number(r.estimatedAverageExposure) || 0,
                    colorChangePercent: r.colorChangePercent !== undefined ? Number(r.colorChangePercent) : undefined,
                    temperature: r.temperature !== undefined ? Number(r.temperature) : undefined,
                    humidity: r.humidity !== undefined ? Number(r.humidity) : undefined,
                    calibrationModelVersion: r.calibrationModelVersion,
                    dosimeterStatus: r.dosimeterStatus,
                    isPublicVisible: r.isPublicVisible,
                    createdAt: toFirestoreDate(r.createdAt) ?? new Date(),
                    status: r.status,
                  } as ExposureRecord;
                })
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

              setRecentScans(records);
              setLatestRecord(records[0] ?? null);
            }).finally(() => setLoading(false));
          }
        );
      } catch (error) {
        console.error('Worker home load failed:', error);
        setLoadError('Some exposure data could not be loaded. Your profile is still available.');
        setLoading(false);
      }
    }

    setupWorkerListener();

    return () => {
      if (unsubscribeRecords) unsubscribeRecords();
    };
  }, [user]);

  const currentFullName = workerProfile?.fullName || displayName || 'Worker';
  const firstName = currentFullName.split(' ')[0];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>{getGreeting()}, {firstName}</h1>
        <p style={{ marginTop: '0.25rem' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <LoadingSpinner size={24} />
        </div>
      ) : !workerProfile ? (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <Info size={20} style={{ color: 'var(--color-amber)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                Account Pending Approval
              </p>
              <p style={{ fontSize: '0.9375rem' }}>
                Your registration request is awaiting review by your organization administrator.
                Your SENTINEL ID and dosimeter access will be available once approved.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loadError && <div className="alert alert-warning"><Info size={15} /><span>{loadError}</span></div>}

          {/* Worker profile summary */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--color-surface-2)',
              border: '2px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-text-muted)',
              flexShrink: 0, overflow: 'hidden',
            }}>
              {workerProfile.profilePhotoUrl
                ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={workerProfile.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )
                : workerProfile.fullName.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700 }}>{workerProfile.fullName}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {workerProfile.department} · {workerProfile.designation}
              </p>
              <p style={{
                fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600,
                color: 'var(--color-accent)', marginTop: '0.25rem',
              }}>
                {workerProfile.publicId}
              </p>
            </div>
            <DosimeterBadge status={workerProfile.dosimeterStatus} />
          </div>

          {/* Quick Scan Worker Dosimeter Watch Card */}
          <WorkerDosimeterScanCard
            initialWorker={workerProfile}
            showWeatherBanner={false}
          />

          <ActivityHeatmap records={recentScans} days={30} />

          <WeatherAnalyticsCard />

          {/* Latest exposure record */}
          {latestRecord ? (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                  Latest Recorded Exposure
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Real-time Synced
                </span>
              </div>

              {/* Manager Scan Audit & Attribution Banner */}
              <div style={{
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                background: (latestRecord.capturedByRole === 'manager' || latestRecord.capturedByRole === 'admin')
                  ? 'rgba(2, 132, 199, 0.12)'
                  : 'var(--color-surface-2)',
                border: (latestRecord.capturedByRole === 'manager' || latestRecord.capturedByRole === 'admin')
                  ? '1.5px solid rgba(2, 132, 199, 0.35)'
                  : '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <ShieldCheck size={20} style={{ color: '#0284c7', flexShrink: 0 }} />
                <div style={{ fontSize: '0.875rem', lineHeight: 1.45, color: 'var(--color-text-primary)' }}>
                  {(latestRecord.peerScannerName || (latestRecord.capturedByRole === 'worker' && latestRecord.managerName && latestRecord.capturedByName !== latestRecord.workerName)) ? (
                    <>
                      Scanned by peer <strong>{latestRecord.peerScannerName || latestRecord.capturedByName || 'Peer Worker'}</strong>
                      {latestRecord.submittedAt && <> on <strong>{formatDateTime(latestRecord.submittedAt)}</strong></>}
                      {' '}· Approved by Manager <strong>{latestRecord.managerName || 'Manager'}</strong>
                      {latestRecord.approvedAt && <> on <strong>{formatDateTime(latestRecord.approvedAt)}</strong></>}
                    </>
                  ) : (latestRecord.capturedByRole === 'manager' || latestRecord.capturedByRole === 'admin') ? (
                    <>
                      <strong>Manager {latestRecord.capturedByName || latestRecord.managerName || 'Manager'}</strong> scanned your dosimeter watch and updated your exposure on <strong>{formatDateTime(latestRecord.createdAt || latestRecord.timestamp)}</strong>
                    </>
                  ) : (
                    <>
                      Dosimeter record logged and verified on <strong>{formatDateTime(latestRecord.createdAt || latestRecord.timestamp)}</strong>
                    </>
                  )}
                </div>
              </div>

              {/* Hero 4-Metric Exposure Card matching reference APPT specifications */}
              <DosimeterExposureSummaryCard
                record={latestRecord}
                title="Latest Dosimeter Exposure Status"
                isLive={true}
              />

              <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
                <Info size={14} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem' }}>
                  This is an estimated cumulative value from your passive H₂S sensing strip - not a real-time concentration reading.
                </span>
              </div>
            </div>
          ) : (
            <div className="card">
              <EmptyState icon={Activity} title="No exposure records yet" description="Your dosimeter readings will appear here after your first scan by a manager or self-check." />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
