'use client';
// app/worker/scan/page.tsx
// Dedicated Worker Dosimeter Scanning Page

import { WorkerDosimeterScanCard } from '@/components/worker/WorkerDosimeterScanCard';

export default function WorkerScanPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 0.5rem' }}>
      <WorkerDosimeterScanCard showWeatherBanner={true} />
    </div>
  );
}
