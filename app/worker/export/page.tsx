'use client';
// app/worker/export/page.tsx
// Worker personal data export — only their own exposure history

import { useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkerByUid } from '@/services/workerService';
import { getAllWorkerExposureHistory } from '@/services/exposureService';
import { exportToCSV, formatExportDate } from '@/lib/utils/export';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { Download, Activity, AlertTriangle, CheckCircle, Info, FileText } from 'lucide-react';

export default function WorkerExportPage() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(0);

  const handleExport = async () => {
    if (!user) return;
    setLoading(true); setDone(false); setError('');
    try {
      // Fix: look up by Auth UID field, not by doc ID
      const worker = await getWorkerByUid(user.uid);
      if (!worker) {
        setError('Your worker profile could not be found. Please contact your manager.');
        setLoading(false);
        return;
      }

      const records = await getAllWorkerExposureHistory(worker.id);
      if (records.length === 0) {
        setError('No exposure records found. Your records will appear here after your first scan.');
        setLoading(false);
        return;
      }

      const data = records.map((r) => ({
        'Date': formatExportDate(r.createdAt),
        'Shift': r.shift,
        'Dose (ppm·h)': r.estimatedDosePpmH.toFixed(3),
        'Average Exposure (ppm)': r.estimatedAverageExposure.toFixed(3),
        'Monitoring Duration (hours)': r.monitoringDuration,
        'Strip Expiry Date': r.stripExpiryDate || '',
        'Cartridge ID': r.cartridgeId || '',
        'Dosimeter Status': r.dosimeterStatus,
        'Status': r.status,
        'Notes': r.notes || '',
      }));

      exportToCSV(data, `SENTINEL-MyExposure-${worker.publicId}-${new Date().toISOString().slice(0, 10)}`);
      setCount(records.length);
      setDone(true);
    } catch (err) {
      console.error('Export error:', err);
      setError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Export My Data</h1>
        <p>Download your personal H₂S exposure history as a CSV file</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <Info size={15} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem' }}>
          Your export includes ALL exposure records from your complete monitoring history — not just the last 30 days.
          The CSV can be opened in Excel, Google Sheets, or any spreadsheet application.
        </span>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={22} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>My Exposure History</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Download all your H₂S dosimeter scan records. Includes date, shift, dose, duration, strip information, and review status.
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        {done && (
          <div className="alert" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', marginBottom: '1rem', gap: '0.5rem' }}>
            <CheckCircle size={14} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
            <span style={{ color: 'var(--color-green)', fontWeight: 500, fontSize: '0.875rem' }}>
              Exported {count} records successfully.
            </span>
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ gap: '0.5rem', width: '100%', justifyContent: 'center' }}
          onClick={handleExport}
          disabled={loading}
          id="export-my-data-btn"
        >
          {loading ? <><LoadingSpinner size={16} /> Preparing Export...</> : <><Download size={16} /> Download My CSV</>}
        </button>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <FileText size={16} style={{ color: 'var(--color-text-muted)' }} />
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>What&apos;s included in the export</h4>
        </div>
        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 2, margin: 0 }}>
          <li>Scan date and time</li>
          <li>Shift (Morning / Afternoon / Night)</li>
          <li>Estimated cumulative H₂S dose (ppm·h)</li>
          <li>Estimated average exposure (ppm)</li>
          <li>Monitoring duration (hours)</li>
          <li>Strip expiry and cartridge ID</li>
          <li>Dosimeter status</li>
          <li>Review status (pending / approved / rejected)</li>
        </ul>
      </div>
    </div>
  );
}
