'use client';
// app/admin/workers/[workerId]/page.tsx
// Admin worker detail — mirrors manager detail + admin-specific info

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getWorkerById } from '@/services/workerService';
import {
  getWorkerExposureHistory,
  getAllWorkerExposureHistory,
  getWorkerExposureSummary,
  WorkerExposureSummary,
} from '@/services/exposureService';
import { Worker } from '@/types/worker';
import { ExposureRecord } from '@/types/exposure';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { DosimeterBadge, WorkerStatusBadge, DoseLevelBadge } from '@/components/ui/Badge';
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay';
import { getWorkerQRUrl } from '@/lib/qr/generator';
import { regenerateWorkerQr } from '@/services/workerService';
import { generateQRDataUrl } from '@/lib/qr/generator';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { formatDose, formatAvgExposure, formatDuration } from '@/lib/utils/formatting';
import {
  ArrowLeft, Download, RefreshCw,
  Phone, Mail, MapPin, User, Calendar, Shield,
  Activity, Clock, TrendingUp, AlertTriangle, Info,
  Image as ImageIcon, Edit2,
} from 'lucide-react';

type FilterRange = '7' | '15' | '30' | 'all';

interface PageProps {
  params: Promise<{ workerId: string }>;
}

export default function AdminWorkerDetailsPage({ params }: PageProps) {
  const { workerId } = use(params);
  const router = useRouter();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [scans, setScans] = useState<ExposureRecord[]>([]);
  const [summary, setSummary] = useState<WorkerExposureSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRange, setFilterRange] = useState<FilterRange>('30');
  const [filterLoading, setFilterLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [qrAction, setQrAction] = useState('');
  const [selectedScan, setSelectedScan] = useState<ExposureRecord | null>(null);

  useEffect(() => {
    async function load() {
      try {
        if (!workerId) { setLoadError('Invalid worker ID.'); setLoading(false); return; }
        const w = await getWorkerById(workerId);
        if (!w) {
          console.error('Admin: Worker not found for ID:', workerId);
          setLoadError('Worker information could not be loaded. Please try again.');
          setLoading(false);
          return;
        }
        setWorker(w);
        const [history, summ] = await Promise.all([
          getWorkerExposureHistory(w.id, 30).catch((e) => { console.error(e); return []; }),
          getWorkerExposureSummary(w.id).catch(() => null),
        ]);
        setScans(history);
        setSummary(summ);
      } catch (err) {
        console.error('Admin worker detail load failed:', err);
        setLoadError('Worker information could not be loaded. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workerId]);

  const handleFilterChange = async (range: FilterRange) => {
    if (!worker || filterLoading) return;
    setFilterRange(range);
    setFilterLoading(true);
    try {
      const history = range === 'all'
        ? await getAllWorkerExposureHistory(worker.id)
        : await getWorkerExposureHistory(worker.id, parseInt(range) as 7 | 15 | 30);
      setScans(history);
    } catch (err) {
      console.error('Admin filter load failed:', err);
    } finally {
      setFilterLoading(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!worker) return;
    setQrAction('downloading');
    try {
      const url = getWorkerQRUrl(worker.publicId);
      const dataUrl = await generateQRDataUrl(url, 320);
      const link = document.createElement('a');
      link.download = `SENTINEL-${worker.publicId}-QR.png`;
      link.href = dataUrl;
      link.click();
    } catch { /* ignore */ } finally {
      setQrAction('');
    }
  };

  const handleRegenerateQR = async () => {
    if (!worker || !confirm('Regenerate QR code? The previous QR will be invalidated.')) return;
    setQrAction('regenerating');
    try {
      const newUrl = await regenerateWorkerQr(worker.id);
      setWorker((prev) => prev ? { ...prev, qrCodeData: newUrl } : prev);
      alert('QR code regenerated successfully.');
    } catch (err) {
      console.error('QR regen failed:', err);
      alert('Failed to regenerate QR. Please try again.');
    } finally {
      setQrAction('');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <LoadingSpinner size={32} />
    </div>
  );

  if (loadError || !worker) return (
    <div style={{ maxWidth: 480, margin: '2rem auto' }}>
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem', gap: '0.5rem' }}>
        <ArrowLeft size={15} /> Back to Workers
      </button>
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <AlertTriangle size={36} style={{ color: 'var(--color-amber)', margin: '0 auto 0.75rem' }} />
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Worker Not Found</p>
        <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
          {loadError || 'This worker record could not be found.'}
        </p>
      </div>
    </div>
  );

  const filterLabels: Record<FilterRange, string> = { '7': '7 Days', '15': '15 Days', '30': '30 Days', all: 'All Time' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ gap: '0.5rem' }}>
          <ArrowLeft size={15} /> Back to Workers
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href={`/admin/workers/${worker.id}/edit`} className="btn btn-outline btn-sm" style={{ gap: '0.5rem' }}>
            <Edit2 size={14} /> Edit Worker
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '1.25rem' }}>
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1rem' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--color-surface-2)', border: '2px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-text-muted)',
                overflow: 'hidden', marginBottom: '0.75rem',
              }}>
                {worker.profilePhotoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={worker.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : worker.fullName.charAt(0)}
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>{worker.fullName}</h2>
              <p style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-accent)', fontSize: '0.875rem', marginBottom: '0.625rem' }}>
                {worker.publicId}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <WorkerStatusBadge status={worker.status} />
                <DosimeterBadge status={worker.dosimeterStatus} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                { icon: User, label: 'Department', value: worker.department },
                { icon: Shield, label: 'Designation', value: worker.designation },
                { icon: Mail, label: 'Email', value: worker.email || 'Not provided' },
                { icon: Phone, label: 'Contact', value: worker.phone || 'Not provided' },
                { icon: MapPin, label: 'Address', value: worker.address || 'Not provided' },
                { icon: User, label: 'Assigned Manager ID', value: worker.managerId || 'Unassigned' },
                { icon: Calendar, label: 'Registered', value: formatDate(worker.createdAt) },
                { icon: Calendar, label: 'Last Updated', value: formatDate(worker.updatedAt) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem' }}>
                  <Icon size={14} style={{ color: 'var(--color-text-muted)', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>{label}</p>
                    <p style={{ fontWeight: 500 }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin info */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Admin Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Firebase UID</p>
                <p style={{ fontFamily: 'monospace', fontSize: '0.8125rem', wordBreak: 'break-all' }}>{worker.uid || 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Firestore Doc ID</p>
                <p style={{ fontFamily: 'monospace', fontSize: '0.8125rem', wordBreak: 'break-all' }}>{worker.id}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Blood Group</p>
                <p style={{ fontWeight: 600 }}>{worker.bloodGroup || 'N/A'}</p>
              </div>
              {worker.guardianName && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Emergency Contact</p>
                  <p style={{ fontWeight: 500 }}>{worker.guardianName} · {worker.guardianContact}</p>
                </div>
              )}
            </div>
          </div>

          {/* QR Management */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              QR Management
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <QRCodeDisplay data={getWorkerQRUrl(worker.publicId)} downloadName={`${worker.publicId}-qr`} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn btn-outline btn-sm" style={{ justifyContent: 'center', gap: '0.5rem' }}
                onClick={handleDownloadQR} disabled={!!qrAction}>
                {qrAction === 'downloading' ? <LoadingSpinner size={14} /> : <Download size={14} />}
                Download QR
              </button>
              <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center', gap: '0.5rem' }}
                onClick={handleRegenerateQR} disabled={!!qrAction}>
                {qrAction === 'regenerating' ? <LoadingSpinner size={14} /> : <RefreshCw size={14} />}
                Regenerate QR
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Exposure Summary */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Exposure Overview
            </h3>
            {summary ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                {[
                  { icon: Activity, label: 'Total Scans', value: String(summary.totalScans) },
                  { icon: Clock, label: 'Monitoring Days', value: String(summary.totalMonitoringDays) },
                  { icon: TrendingUp, label: 'Latest Dose', value: summary.latestDose != null ? `${formatDose(summary.latestDose)} ppm·h` : 'N/A' },
                  { icon: Calendar, label: 'Last Scan', value: summary.latestDate ? formatDateTime(summary.latestDate) : 'Never' },
                  { icon: Calendar, label: 'First Scan', value: summary.firstScanDate ? formatDate(summary.firstScanDate) : 'N/A' },
                  { icon: Shield, label: 'Dosimeter', value: summary.latestDosimeterStatus ?? 'N/A' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
                      <Icon size={13} style={{ color: 'var(--color-accent)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{label}</span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)' }}>No exposure records found.</p>
            )}
          </div>

          {/* Exposure History */}
          <div className="card card-flush">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Exposure History</h3>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {(['7', '15', '30', 'all'] as FilterRange[]).map((r) => (
                  <button key={r}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0.25rem 0.625rem', fontWeight: filterRange === r ? 700 : 400, background: filterRange === r ? 'var(--color-accent)' : undefined, color: filterRange === r ? '#fff' : undefined }}
                    onClick={() => handleFilterChange(r)} disabled={filterLoading}>
                    {filterLabels[r]}
                  </button>
                ))}
              </div>
            </div>

            {filterLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <LoadingSpinner size={20} />
              </div>
            ) : scans.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
                No exposure records in this period.
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Dose (ppm·h)</th>
                      <th>Avg (ppm)</th>
                      <th>Duration</th>
                      <th>Strip Expiry</th>
                      <th>Dosimeter</th>
                      <th>Scanned By</th>
                      <th>Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((scan) => (
                      <tr key={scan.id}>
                        <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{formatDateTime(scan.createdAt)}</td>
                        <td style={{ fontSize: '0.8125rem', textTransform: 'capitalize' }}>{scan.shift}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatDose(scan.estimatedDosePpmH)}</span>
                            <DoseLevelBadge ppmH={scan.estimatedDosePpmH} />
                          </div>
                        </td>
                        <td style={{ fontSize: '0.875rem' }}>{formatAvgExposure(scan.estimatedAverageExposure)}</td>
                        <td style={{ fontSize: '0.875rem' }}>{formatDuration(scan.monitoringDuration)}</td>
                        <td style={{ fontSize: '0.8125rem' }}>{scan.stripExpiryDate || 'N/A'}</td>
                        <td><DosimeterBadge status={scan.dosimeterStatus} /></td>
                        <td style={{ fontSize: '0.8125rem' }}>{scan.managerName || scan.managerId?.slice(0, 8) || 'N/A'}</td>
                        <td>
                          {scan.imageUrl
                            ? <button className="btn btn-ghost btn-sm" style={{ gap: '0.375rem', padding: '0.25rem 0.5rem' }} onClick={() => setSelectedScan(scan)}>
                                <ImageIcon size={13} /> View
                              </button>
                            : <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="alert alert-info">
            <Info size={14} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem' }}>
              All exposure data shown here is from actual confirmed scan records. No simulated data is displayed.
            </span>
          </div>
        </div>
      </div>

      {/* Scan image modal */}
      {selectedScan?.imageUrl && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}
          onClick={() => setSelectedScan(null)}
        >
          <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxWidth: 480, width: '100%' }}
            onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedScan.imageUrl} alt="Scan image" style={{ width: '100%', display: 'block' }} />
            <div style={{ padding: '1rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{worker.fullName} — {formatDateTime(selectedScan.createdAt)}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                Dose: {formatDose(selectedScan.estimatedDosePpmH)} ppm·h · Scanned by: {selectedScan.managerName || 'N/A'}
              </p>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setSelectedScan(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
