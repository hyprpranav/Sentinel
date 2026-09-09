'use client';
// app/(worker)/my-qr/page.tsx
import { useEffect, useState, useRef } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { query, collection, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { generateQRDataUrl, getWorkerQRUrl } from '@/lib/qr/generator';
import { Worker } from '@/types/worker';
import { toFirestoreDate } from '@/lib/utils/date';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { Download, Info, QrCode } from 'lucide-react';

export default function MyQRPage() {
  const { user } = useAuthContext();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    getDocs(
      query(collection(db, COLLECTIONS.WORKERS), where('uid', '==', user.uid), limit(1))
    ).then(async (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0].data();
        const w: Worker = {
          id: snap.docs[0].id,
          publicId: d.publicId,
          uid: d.uid,
          fullName: d.fullName,
          department: d.department,
          designation: d.designation,
          status: d.status,
          qrCodeData: d.qrCodeData,
          dosimeterStatus: d.dosimeterStatus,
          createdAt: toFirestoreDate(d.createdAt) ?? new Date(),
          updatedAt: toFirestoreDate(d.updatedAt) ?? new Date(),
        };
        setWorker(w);
        const url = await generateQRDataUrl(getWorkerQRUrl(w.publicId), 200);
        setQrDataUrl(url);
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleDownload = async () => {
    if (!worker || !qrDataUrl) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      if (!cardRef.current) return;
      const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: '#ffffff' } as Record<string, unknown>);
      const link = document.createElement('a');
      link.download = `SENTINEL-ID-${worker.publicId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Fallback: download QR only
      const link = document.createElement('a');
      link.download = `QR-${worker.publicId}.png`;
      link.href = qrDataUrl;
      link.click();
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner size={24} /></div>;
  }

  if (!worker) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <QrCode size={40} style={{ color: 'var(--color-text-muted)', margin: '0 auto 0.75rem' }} />
        <p style={{ fontWeight: 600 }}>QR Code Not Available</p>
        <p style={{ fontSize: '0.9375rem' }}>
          Your SENTINEL ID card will be generated once your registration is approved.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>My QR Card</h1>
        <p>Your SENTINEL worker identification card</p>
      </div>

      {/* Physical Watch-Style Sensing Cartridge / Strip Card */}
      <div
        ref={cardRef}
        className="qr-card"
        style={{
          marginBottom: '1.25rem',
          background: '#ffffff',
          borderRadius: '16px',
          border: '2px solid #0284c7',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 8px 24px rgba(2, 132, 199, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
        id="worker-qr-card"
      >
        {/* Cartridge Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.625rem'
        }}>
          <div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.12em', color: '#0284c7', textTransform: 'uppercase' }}>
              SENTINEL · H₂S WEARABLE DOSIMETER
            </span>
            <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
              PASSIVE COLORIMETRIC CARTRIDGE
            </div>
          </div>
          <div style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0.25rem 0.625rem',
            textAlign: 'right'
          }}>
            <span style={{ fontSize: '0.5625rem', color: '#64748b', fontWeight: 600, display: 'block' }}>EXP DATE</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>
              08/09/2026
            </span>
          </div>
        </div>

        {/* Main Body: QR Code + Worker Name and Worker ID ONLY */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {qrDataUrl && (
            <div style={{
              flexShrink: 0,
              padding: '0.375rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR code for ${worker.publicId}`}
                width={110}
                height={110}
                style={{ display: 'block' }}
              />
            </div>
          )}
          <div className="qr-card-body" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>
              WORKER NAME
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginBottom: '0.625rem' }}>
              {worker.fullName}
            </div>
            
            <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>
              WORKER ID
            </div>
            <div style={{
              display: 'inline-block',
              fontSize: '0.9375rem',
              fontWeight: 800,
              color: '#0284c7',
              background: '#e0f2fe',
              padding: '0.25rem 0.625rem',
              borderRadius: '6px',
              fontFamily: 'monospace',
              letterSpacing: '0.06em'
            }}>
              {worker.publicId}
            </div>
          </div>
        </div>

        {/* Passive Colorimetric Sensing Strip Simulation on Cartridge */}
        <div style={{
          background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)',
          border: '1px dashed #94a3b8',
          borderRadius: '8px',
          padding: '0.625rem 0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}>
          <div>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
              Sensing Element Zone
            </div>
            <div style={{ fontSize: '0.5625rem', color: '#64748b' }}>
              Ag₂S / Passive Lead Acetate indicator
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontSize: '0.5625rem', color: '#64748b' }}>REF:</span>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#f8fafc', border: '1px solid #cbd5e1' }} title="0 ppm" />
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fef08a', border: '1px solid #eab308' }} title="10 ppm·h" />
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#d97706', border: '1px solid #b45309' }} title="25 ppm·h" />
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#451a03', border: '1px solid #1c1917' }} title="50+ ppm·h" />
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleDownload} style={{ width: '100%', justifyContent: 'center' }}>
        <Download size={16} /> Download Cartridge QR Card
      </button>

      <div className="alert alert-info" style={{ marginTop: '1rem' }}>
        <Info size={15} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.8125rem' }}>
          This physical card slides directly into your watch-style wearable dosimeter housing. Next to the QR code, it displays <strong>only your Worker Name and Worker ID</strong>, keeping your personal details secure.
        </span>
      </div>
    </div>
  );
}
