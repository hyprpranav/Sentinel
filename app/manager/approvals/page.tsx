'use client';

import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { getPendingScans, updateScanStatus } from '@/services/exposureService';
import { ExposureRecord } from '@/types/exposure';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardCheck, Check, X } from 'lucide-react';
import { formatDose } from '@/lib/utils/formatting';
import { timeAgo } from '@/lib/utils/date';

export default function ApprovalsPage() {
  const { user } = useAuthContext();
  const [scans, setScans] = useState<ExposureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const loadPendingScans = async () => {
      setLoading(true);
      try {
        const pending = await getPendingScans(user!.uid);
        setScans(pending);
      } catch (error) {
        console.error('Failed to load pending scans', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadPendingScans();
    }
  }, [user]);

  const handleAction = async (scanId: string, status: 'approved' | 'rejected') => {
    const remark = remarks[scanId] || '';
    if (status === 'rejected' && !remark.trim()) {
      alert('Remarks are mandatory for rejection.');
      return;
    }
    
    setProcessingId(scanId);
    try {
      await updateScanStatus(scanId, status, remark);
      setScans(scans.filter(s => s.id !== scanId));
      setRemarks(prev => {
        const newRemarks = { ...prev };
        delete newRemarks[scanId];
        return newRemarks;
      });
    } catch (error) {
      console.error(`Failed to ${status} scan`, error);
      alert(`Failed to ${status} scan.`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold">Pending Scan Approvals</h1>
        <p className="text-gray-400">Review dosimeter scans submitted by workers.</p>
      </div>

      {scans.length === 0 ? (
        <EmptyState 
          icon={ClipboardCheck} 
          title="No pending scans" 
          description="All worker scans have been reviewed."
        />
      ) : (
        <div className="grid gap-6">
          {scans.map(scan => (
            <div key={scan.id} className="bg-navy-card p-6 rounded-xl border border-navy-border shadow flex flex-col md:flex-row gap-6">
              
              {/* Scan Image (Mock placeholder or real image) */}
              <div className="w-full md:w-48 h-48 bg-navy-bg rounded-lg overflow-hidden border border-navy-border flex-shrink-0 flex items-center justify-center">
                {scan.imageUrl ? (
                  <img src={scan.imageUrl} alt="Scan" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-500">No Image</span>
                )}
              </div>

              {/* Scan Details */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{scan.workerName}</h3>
                    <p className="text-sm text-gray-400">{scan.workerPublicId} • {timeAgo(scan.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Estimated Dose</p>
                    <p className="text-2xl font-bold text-amber-500">{formatDose(scan.estimatedDosePpmH)}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-300">Manager Remarks (Mandatory for rejection)</label>
                  <textarea 
                    className="input-field w-full h-20" 
                    placeholder="Enter remarks or suggestions..."
                    value={remarks[scan.id] || ''}
                    onChange={(e) => setRemarks({...remarks, [scan.id]: e.target.value})}
                    disabled={processingId === scan.id}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => handleAction(scan.id, 'rejected')}
                    disabled={processingId === scan.id}
                    className="btn btn-outline border-red-500/50 text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <X size={16} /> Reject
                  </button>
                  <button 
                    onClick={() => handleAction(scan.id, 'approved')}
                    disabled={processingId === scan.id}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Check size={16} /> Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
