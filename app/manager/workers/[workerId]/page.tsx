'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkerById } from '@/services/workerService';
import { getWorkerExposureHistory } from '@/services/exposureService';
import { Worker } from '@/types/worker';
import { ExposureRecord } from '@/types/exposure';
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { ArrowLeft } from 'lucide-react';
import { DosimeterBadge, WorkerStatusBadge } from '@/components/ui/Badge';
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay';
import { getWorkerQRUrl } from '@/lib/qr/generator';

export default function WorkerDetailsPage({ params }: { params: { workerId: string } }) {
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [scans, setScans] = useState<ExposureRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const w = await getWorkerById(params.workerId);
        setWorker(w);
        if (w) {
          const s = await getWorkerExposureHistory(w.id, 30);
          setScans(s);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.workerId]);

  if (loading) {
    return <div className="flex justify-center p-12"><LoadingSpinner size={32} /></div>;
  }

  if (!worker) {
    return <div className="p-12 text-center text-gray-400">Worker not found</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Workers
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 flex flex-col gap-6">
          <div className="bg-navy-card p-6 rounded-xl border border-navy-border shadow flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-navy-bg border-2 border-navy-border flex items-center justify-center text-2xl font-bold text-gray-500 mb-4 overflow-hidden">
              {worker.profilePhotoUrl ? (
                <img src={worker.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                worker.fullName.charAt(0)
              )}
            </div>
            <h2 className="text-xl font-bold mb-1">{worker.fullName}</h2>
            <p className="text-sm text-gray-400 mb-4">{worker.publicId}</p>
            
            <div className="flex gap-2 mb-6">
              <WorkerStatusBadge status={worker.status} />
              <DosimeterBadge status={worker.dosimeterStatus} />
            </div>

            <div className="w-full space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="font-medium text-white">{worker.department}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Designation</span><span className="font-medium text-white">{worker.designation}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium text-white">{worker.email || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium text-white">{worker.phone || 'N/A'}</span></div>
            </div>
          </div>

          <div className="bg-navy-card p-6 rounded-xl border border-navy-border shadow flex flex-col items-center">
            <h3 className="font-semibold mb-4 w-full text-left">QR Code</h3>
            <QRCodeDisplay data={getWorkerQRUrl(worker.publicId)} downloadName={`${worker.publicId}-qr`} />
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
          <ActivityHeatmap records={scans} days={30} />
          
          <div className="bg-navy-card p-6 rounded-xl border border-navy-border shadow">
            <h3 className="font-semibold mb-4">Recent Scans</h3>
            {scans.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent scans.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-navy-border text-gray-400 text-sm">
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 font-medium">Dose (ppm·h)</th>
                    <th className="py-2 font-medium">Expiry</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {scans.map(scan => (
                    <tr key={scan.id} className="border-b border-navy-border/50 last:border-0">
                      <td className="py-3 text-gray-300">{new Date(scan.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 font-medium text-white">{scan.estimatedDosePpmH.toFixed(2)}</td>
                      <td className="py-3 text-gray-300">{scan.stripExpiryDate || 'N/A'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          scan.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                          scan.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          'bg-amber-500/20 text-amber-500'
                        }`}>
                          {scan.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
