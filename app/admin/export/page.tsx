'use client';
// app/admin/export/page.tsx
// Admin data export — all managers, all workers, all exposure records, all audit logs

import { useState } from 'react';
import { getAllWorkers } from '@/services/workerService';
import { getAllManagers } from '@/services/managerService';
import { getAllExposureRecords } from '@/services/exposureService';
import { exportToCSV, formatExportDate } from '@/lib/utils/export';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { Download, Users, Shield, Activity, FileText, AlertTriangle, CheckCircle, Info, Database } from 'lucide-react';

type ExportStatus = 'idle' | 'loading' | 'done' | 'error';

interface ExportItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  action: () => Promise<void>;
}

export default function AdminExportPage() {
  const [status, setStatus] = useState<Record<string, ExportStatus>>({});
  const [message, setMessage] = useState<Record<string, string>>({});

  const setItemStatus = (id: string, s: ExportStatus, msg?: string) => {
    setStatus((prev) => ({ ...prev, [id]: s }));
    if (msg) setMessage((prev) => ({ ...prev, [id]: msg }));
  };

  const exportManagers = async () => {
    setItemStatus('managers', 'loading');
    try {
      const managers = await getAllManagers();
      const data = managers.map((m) => ({
        'Manager ID': m.publicId || m.id,
        'Full Name': m.fullName,
        'Email': m.email || '',
        'Department': m.department || '',
        'Phone': m.phone || '',
        'Status': m.status,
        'Registered On': m.createdAt ? formatExportDate(
          m.createdAt instanceof Date ? m.createdAt
            : new Date(((m.createdAt as Record<string, number>).seconds ?? 0) * 1000)
        ) : '',
      }));
      exportToCSV(data, `SENTINEL-Managers-${new Date().toISOString().slice(0, 10)}`);
      setItemStatus('managers', 'done', `Exported ${data.length} manager records.`);
    } catch (err) {
      console.error('Manager export failed:', err);
      setItemStatus('managers', 'error', 'Export failed. Please try again.');
    }
  };

  const exportWorkers = async () => {
    setItemStatus('workers', 'loading');
    try {
      const workers = await getAllWorkers();
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
        'Guardian Name': w.guardianName || '',
        'Guardian Contact': w.guardianContact || '',
        'Status': w.status,
        'Dosimeter Status': w.dosimeterStatus,
        'Assigned Manager ID': w.managerId || '',
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
    setItemStatus('exposure', 'loading');
    try {
      const records = await getAllExposureRecords(2000);
      const data = records.map((r) => ({
        'Record Date': formatExportDate(r.createdAt),
        'Worker ID': r.workerPublicId || r.workerId,
        'Worker Name': r.workerName || '',
        'Manager Name': r.managerName || r.managerId || '',
        'Shift': r.shift,
        'Dose (ppm·h)': r.estimatedDosePpmH.toFixed(3),
        'Avg Exposure (ppm)': r.estimatedAverageExposure.toFixed(3),
        'Monitoring Duration (h)': r.monitoringDuration,
        'Strip Expiry Date': r.stripExpiryDate || '',
        'Cartridge ID': r.cartridgeId || '',
        'Dosimeter Status': r.dosimeterStatus,
        'Calibration Model': r.calibrationModelVersion,
        'Review Status': r.status,
        'Reviewer Remarks': r.reviewerRemarks || '',
        'Notes': r.notes || '',
        'Image URL': r.imageUrl || '',
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
      id: 'managers',
      label: 'Manager Data',
      description: 'Export all manager profiles — name, email, department, status, registration date.',
      icon: Shield,
      badge: 'Admin only',
      action: exportManagers,
    },
    {
      id: 'workers',
      label: 'Worker Data',
      description: 'Export all worker profiles including contact info, blood group, guardian, and dosimeter status.',
      icon: Users,
      badge: 'All workers',
      action: exportWorkers,
    },
    {
      id: 'exposure',
      label: 'Exposure Records',
      description: 'Export all dosimeter scan records system-wide — doses, shifts, dates, calibration model, and review status.',
      icon: Activity,
      badge: 'Full history',
      action: exportExposure,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Export Data</h1>
        <p>Download system-wide data as CSV files for reporting and analysis</p>
      </div>

      <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem' }}>
          These exports contain sensitive employee data. Ensure compliance with your organization&apos;s data handling policies before distributing.
        </span>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <Info size={15} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem' }}>
          Exports are generated directly from Firestore in real time. Large exports ({'>'} 1000 records) may take a few seconds.
          CSV files can be opened in Excel, Google Sheets, or any spreadsheet application.
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
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontWeight: 600 }}>{item.label}</h3>
                    {item.badge && (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--color-accent-dim)', color: 'var(--color-accent)', borderRadius: 4, padding: '0.125rem 0.375rem' }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item.description}</p>
                </div>
              </div>

              {s === 'done' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-green)' }}>
                  <CheckCircle size={14} /><span>{message[item.id]}</span>
                </div>
              )}
              {s === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#ef4444' }}>
                  <AlertTriangle size={14} /><span>{message[item.id]}</span>
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

      {/* Overall export (all in one) */}
      <div className="card" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Database size={20} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Export All Data</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Download all three exports at once — managers, workers, and exposure records.
            </p>
          </div>
        </div>
        <button
          className="btn btn-outline"
          style={{ gap: '0.5rem' }}
          onClick={async () => {
            await exportManagers();
            await exportWorkers();
            await exportExposure();
          }}
        >
          <Download size={15} /> Export All
        </button>
      </div>
    </div>
  );
}
