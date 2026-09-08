// components/ui/ActivityHeatmap.tsx
import React from 'react';
import { ExposureRecord } from '@/types/exposure';

interface ActivityHeatmapProps {
  records: ExposureRecord[];
  days?: number;
}

export function ActivityHeatmap({ records, days = 30 }: ActivityHeatmapProps) {
  // Generate the last N days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateMap = new Map<string, number>();

  // Map maximum exposure dose to each date string
  records.forEach((r) => {
    // Only approved or pending? Let's use all or just approved depending on requirement, we'll use all for now
    if (r.status === 'rejected') return; 

    const d = new Date(r.createdAt);
    d.setHours(0, 0, 0, 0);
    const dateStr = d.toISOString().split('T')[0];

    const currentMax = dateMap.get(dateStr) || 0;
    if (r.estimatedDosePpmH > currentMax) {
      dateMap.set(dateStr, r.estimatedDosePpmH);
    }
  });

  const calendarDays = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const dose = dateMap.get(dateStr);
    
    let colorClass = 'bg-navy-border/50'; // Empty
    if (dose !== undefined) {
      if (dose <= 30) colorClass = 'bg-green-500/80'; // Light Green
      else if (dose <= 70) colorClass = 'bg-amber-500/80'; // Amber
      else colorClass = 'bg-green-900'; // Dark Green as per user request for harsh
    }

    calendarDays.push({
      dateStr,
      dose,
      colorClass
    });
  }

  return (
    <div className="bg-navy-card p-6 rounded-xl border border-navy-border">
      <h3 className="text-sm font-semibold mb-4 text-gray-300">30-Day Exposure Activity</h3>
      <div className="flex flex-wrap gap-2">
        {calendarDays.map((day) => (
          <div
            key={day.dateStr}
            className={`w-6 h-6 rounded-sm ${day.colorClass}`}
            title={`${day.dateStr}: ${day.dose !== undefined ? day.dose + ' ppm' : 'No scans'}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-navy-border/50"></div>
          <div className="w-3 h-3 rounded-sm bg-green-500/80"></div>
          <div className="w-3 h-3 rounded-sm bg-amber-500/80"></div>
          <div className="w-3 h-3 rounded-sm bg-green-900"></div>
        </div>
        <span>Harsh</span>
      </div>
    </div>
  );
}
