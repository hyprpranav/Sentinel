'use client';
// app/manager/export/page.tsx
// Manager data export — workers and exposure records for assigned workers only

import { useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkersByManager } from '@/services/workerService';
import { getExposureRecordsByManager } from '@/services/exposureService';
import { exportToCSV, formatExportDate } from '@/lib/utils/export';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { Download, Users, Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';

type ExportStatus = 'idle' | 'loading' | 'done' | 'error';

interface ExportItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => Promise<void>;
}

export default function ManagerExportPage() {
  const { user } = useAuthContext();
  const [status, setStatus] = useState<Record<string, ExportStatus>>({});
  const [message, setMessage] = useState<Record<string, string>>({});

  const setItemStatus = (id: string, s: ExportStatus, msg?: string) => {
    setStatus((prev) => ({ ...prev, [id]: s }));
    if (msg) setMessage((prev) => ({ ...prev, [id]: msg }));
  };

  const exportWorkers = async () => {
    if (!user) return;
    setItemStatus('workers', 'loading');
    try {
      const workers = await getWorkersByManager(user.uid);
      const data = workers.map((w) => ({
        'Worker ID': w.publicId,
        'Full Name': w.fullName,
        'Department': w.department,
        'Designation': w.designation,
        'Email': w.email || '',
        'Phone': w.phone || '',
        'Blood Group': w.bloodGroup || '',
        'Date of Birth': w.dateOfBirth || '',
        'Address': w.address || '',
        'Status': w.status,
        'Dosimeter Status': w.dosimeterStatus,
        'Registered On': formatExportDate(w.createdAt),
        'Last Scan': formatExportDate(w.lastScanAt),
      }));
      exportToCSV(data, `SENTINEL-Workers-${new Date().toISOString().slice(0, 10)}`);
      setItemStatus('workers', 'done', `Exported ${data.length} worker records.`);
    } catch (err) {
      console.error('Worker export failed:', err);
      setItemStatus('workers', 'error', 'Export failed. Please try again.');
    }
  };

  const exportExposure = async () => {
    if (!user) return;
    setItemStatus('exposure', 'loading');
    try {
      const records = await getExposureRecordsByManager(user.uid);
      const data = records.map((r) => ({
        'Record Date': formatExportDate(r.createdAt),
        'Worker ID': r.workerPublicId || r.workerId,
        'Worker Name': r.workerName || '',
        'Shift': r.shift,
        'Dose (ppm·h)': r.estimatedDosePpmH.toFixed(3),
        'Avg Exposure (ppm)': r.estimatedAverageExposure.toFixed(3),
        'Monitoring Duration (h)': r.monitoringDuration,
        'Strip Expiry Date': r.stripExpiryDate || '',
        'Cartridge ID': r.cartridgeId || '',
        'Dosimeter Status': r.dosimeterStatus,
        'Calibration Model': r.calibrationModelVersion,
        'Status': r.status,
        'Notes': r.notes || '',
      }));
      exportToCSV(data, `SENTINEL-Exposure-${new Date().toISOString().slice(0, 10)}`);
      setItemStatus('exposure', 'done', `Exported ${data.length} exposure records.`);
    } catch (err) {
      console.error('Exposure export failed:', err);
      setItemStatus('exposure', 'error', 'Export failed. Please try again.');
    }
  };

  const items: ExportItem[] = [
    {
      id: 'workers',
      label: 'Worker Profiles',
      description: 'Export all worker profiles assigned to you including contact info, blood group, and dosimeter status.',
      icon: Users,
      action: exportWorkers,
    },
    {
      id: 'exposure',
      label: 'Exposure Records',
      description: 'Export all dosimeter scan records for your workers — doses, shifts, dates, and calibration data.',
      icon: Activity,
      action: exportExposure,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Export Data</h1>
        <p>Download data for your assigned workers as CSV files</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <Info size={15} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem' }}>
          Data exports are scoped to your assigned workers only. CSV files can be opened in Excel, Google Sheets, or any spreadsheet app.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {items.map((item) => {
          const s = status[item.id] || 'idle';
          const Icon = item.icon;
          return (
            <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{item.label}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item.description}</p>
                </div>
              </div>

              {s === 'done' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-green)' }}>
                  <CheckCircle size={14} />
                  <span>{message[item.id]}</span>
                </div>
              )}
              {s === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#ef4444' }}>
                  <AlertTriangle size={14} />
                  <span>{message[item.id]}</span>
                </div>
              )}

              <button
                className="btn btn-primary btn-sm"
                style={{ gap: '0.5rem', alignSelf: 'flex-start' }}
                onClick={item.action}
                disabled={s === 'loading'}
              >
                {s === 'loading' ? <><LoadingSpinner size={14} /> Exporting...</> : <><Download size={14} /> Export CSV</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
