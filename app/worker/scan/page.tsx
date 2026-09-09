'use client';
// app/worker/scan/page.tsx
// Dedicated Worker Dosimeter Scanning Page

import { WorkerDosimeterScanCard } from '@/components/worker/WorkerDosimeterScanCard';

export default function WorkerScanPage() {
  return (
    <div style={{ width: '100%' }}>
      <WorkerDosimeterScanCard showWeatherBanner={true} />
    </div>
  );
}
