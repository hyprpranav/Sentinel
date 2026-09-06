'use client';
// app/(worker)/my-qr/page.tsx
import { useEffect, useState, useRef } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { query, collection, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { generateQRDataUrl } from '@/lib/qr/generator';
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

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

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
        const url = await generateQRDataUrl(`${APP_URL}/worker/${w.publicId}`, 200);
        setQrDataUrl(url);
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleDownload = async () => {
    if (!worker || !qrDataUrl) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      if (!cardRef.current) return;
      const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: '#ffffff' } as any);
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

      {/* QR Card — printable/downloadable */}
      <div
        ref={cardRef}
        className="qr-card"
        style={{ marginBottom: '1.25rem' }}
        id="worker-qr-card"
      >
        <div className="qr-card-body">
          <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '0.375rem' }}>
            SENTINEL · MRPL
          </div>
          <div className="qr-card-title">{worker.fullName}</div>
          <div className="qr-card-detail">
            {worker.publicId}<br />
            {worker.department}<br />
            {worker.designation}
          </div>
          <div className="qr-card-id">{worker.publicId}</div>
          <div className="qr-card-brand">Passive H₂S Dosimeter Wristband</div>
        </div>
        {qrDataUrl && (
          <div style={{ flexShrink: 0 }}>
            <img
              src={qrDataUrl}
              alt={`QR code for ${worker.publicId}`}
              width={110}
              height={110}
              style={{ display: 'block' }}
            />
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={handleDownload} style={{ width: '100%', justifyContent: 'center' }}>
        <Download size={16} /> Download QR Card
      </button>

      <div className="alert alert-info" style={{ marginTop: '1rem' }}>
        <Info size={15} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.8125rem' }}>
          This QR card can be attached to your wristband. When scanned by an authorized manager,
          it identifies you for dosimeter readings. When scanned publicly, it shows only your
          emergency safety identification.
        </span>
      </div>
    </div>
  );
}
