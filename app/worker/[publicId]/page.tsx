// app/worker/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import { getWorkerByPublicId } from '@/services/workerService';
import { getPublicWorkerExposure } from '@/services/exposureService';
import { SentinelLogo } from '@/components/layout/SentinelLogo';
import { WorkerStatusBadge, DosimeterBadge } from '@/components/ui/Badge';
import { ShieldAlert, User, Building, QrCode } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export const dynamic = 'force-dynamic';

// This is a public page accessible to anyone who scans the QR code.
// It explicitly omits sensitive data (exposure history, contact details, uid)
// and only shows emergency identification information.

export default async function PublicWorkerProfile({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const worker = await getWorkerByPublicId(publicId);

  if (!worker) {
    notFound();
  }

  const exposures = await getPublicWorkerExposure(worker.id).catch(() => []);
  const totalDose = exposures.reduce((sum, record) => sum + record.estimatedDosePpmH, 0);
  const averageDose = exposures.length ? totalDose / exposures.length : 0;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <SentinelLogo size="md" />
          <ThemeToggle />
        </header>

        <div className="card" style={{ padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--color-surface-2)', border: '3px solid var(--color-border)',
            margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', color: 'var(--color-text-muted)', fontSize: '2rem', fontWeight: 700,
          }}>
            {worker.profilePhotoUrl
              ? <img src={worker.profilePhotoUrl} alt="Worker" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : worker.fullName.charAt(0)}
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{worker.fullName}</h1>
          <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
            {worker.publicId}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <WorkerStatusBadge status={worker.status} />
            <DosimeterBadge status={worker.dosimeterStatus} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Organizational Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Building size={18} style={{ color: 'var(--color-text-muted)' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Department</p>
                <p style={{ fontWeight: 500 }}>{worker.department}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <User size={18} style={{ color: 'var(--color-text-muted)' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Designation</p>
                <p style={{ fontWeight: 500 }}>{worker.designation}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <QrCode size={18} style={{ color: 'var(--color-text-muted)' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>SENTINEL ID</p>
                <p style={{ fontWeight: 500, fontFamily: 'monospace', color: 'var(--color-accent)' }}>{worker.publicId}</p>
              </div>
            </div>
            {worker.bloodGroup && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <ShieldAlert size={18} style={{ color: 'var(--color-danger)' }} />
                <div><p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Blood Group</p><p style={{ fontWeight: 500 }}>{worker.bloodGroup}</p></div>
              </div>
            )}
            {worker.guardianName && worker.guardianContact && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <User size={18} style={{ color: 'var(--color-text-muted)' }} />
                <div><p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Emergency Contact</p><p style={{ fontWeight: 500 }}>{worker.guardianName} · {worker.guardianContact}</p></div>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Last 15 Days</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div><p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Recorded scans</p><strong>{exposures.length}</strong></div>
            <div><p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total exposure</p><strong>{totalDose.toFixed(2)} ppm·h</strong></div>
            <div><p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Average</p><strong>{averageDose.toFixed(2)} ppm·h</strong></div>
          </div>
        </div>

        <div className="alert alert-info" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <ShieldAlert size={20} style={{ color: 'var(--color-blue)', flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--color-text-primary)' }}>Verified Identification</strong>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              This page provides verified public identification for emergency and verification purposes.
              To record an H₂S dosimeter exposure reading, authorized managers must log into the SENTINEL application and scan this QR code using the manager dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
