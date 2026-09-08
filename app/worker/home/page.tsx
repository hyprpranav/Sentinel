'use client';
// app/(worker)/home/page.tsx
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { query, collection, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { ExposureRecord } from '@/types/exposure';
import { Worker } from '@/types/worker';
import { formatDuration } from '@/lib/utils/formatting';
import { formatDateTime, getGreeting, toFirestoreDate } from '@/lib/utils/date';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap';
import { Activity, Info } from 'lucide-react';

export default function WorkerHome() {
  const { user, displayName } = useAuthContext();
  const [workerProfile, setWorkerProfile] = useState<Worker | null>(null);
  const [latestRecord, setLatestRecord] = useState<ExposureRecord | null>(null);
  const [recentScans, setRecentScans] = useState<ExposureRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      // Find worker by uid
      const wSnap = await getDocs(
        query(collection(db, COLLECTIONS.WORKERS), where('uid', '==', user!.uid), limit(1))
      );

      if (wSnap.empty) {
        // Check if still in requests
        setLoading(false);
        return;
      }

      const wDoc = wSnap.docs[0];
      const wData = wDoc.data();
      setWorkerProfile({
        id: wDoc.id,
        publicId: wData.publicId,
        uid: wData.uid,
        fullName: wData.fullName,
        employeeId: wData.employeeId,
        department: wData.department,
        designation: wData.designation,
        status: wData.status,
        qrCodeData: wData.qrCodeData,
        dosimeterStatus: wData.dosimeterStatus,
        createdAt: toFirestoreDate(wData.createdAt) ?? new Date(),
        updatedAt: toFirestoreDate(wData.updatedAt) ?? new Date(),
      } as Worker);

      // Get latest exposure records for heatmap
      const rSnap = await getDocs(
        query(
          collection(db, COLLECTIONS.EXPOSURE_RECORDS),
          where('workerId', '==', wDoc.id),
          orderBy('createdAt', 'desc'),
          limit(30)
        )
      );

      if (!rSnap.empty) {
        const records = rSnap.docs.map(doc => {
          const r = doc.data();
          return {
            id: doc.id,
            workerId: r.workerId,
            managerId: r.managerId,
            timestamp: toFirestoreDate(r.timestamp) ?? new Date(),
            shift: r.shift,
            estimatedDosePpmH: r.estimatedDosePpmH,
            monitoringDuration: r.monitoringDuration,
            estimatedAverageExposure: r.estimatedAverageExposure,
            calibrationModelVersion: r.calibrationModelVersion,
            dosimeterStatus: r.dosimeterStatus,
            isPublicVisible: r.isPublicVisible,
            createdAt: toFirestoreDate(r.createdAt) ?? new Date(),
            status: r.status,
            reviewerRemarks: r.reviewerRemarks,
          } as ExposureRecord;
        });
        
        setRecentScans(records);
        setLatestRecord(records[0]);
      }
      setLoading(false);
    }

    load();
  }, [user]);

  const firstName = displayName?.split(' ')[0] ?? 'Worker';

  return (
    <div>
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

          <ActivityHeatmap records={recentScans} days={30} />

          {/* Latest exposure record */}
          {latestRecord ? (
            <div className="card">
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Latest Recorded Exposure
              </p>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
                    {latestRecord.estimatedDosePpmH.toFixed(1)}
                  </span>
                  <span className="dose-unit">ppm·h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <DoseLevelBadge ppmH={latestRecord.estimatedDosePpmH} />
                  <DosimeterBadge status={latestRecord.dosimeterStatus} />
                </div>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem', background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)', padding: '1rem',
              }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Monitoring Duration</p>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{formatDuration(latestRecord.monitoringDuration)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Recorded</p>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{formatDateTime(latestRecord.createdAt)}</p>
                </div>
              </div>
              <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
                <Info size={14} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem' }}>
                  This is an estimated cumulative value from your passive H₂S sensing strip — not a real-time concentration reading.
                </span>
              </div>
            </div>
          ) : (
            <div className="card">
              <EmptyState icon={Activity} title="No exposure records yet" description="Your dosimeter readings will appear here after your first scan." />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
