// lib/utils/formatting.ts
export function formatDose(ppmH: number): string {
  return `${ppmH.toFixed(1)} ppm·h`;
}

export function formatAvgExposure(ppm: number): string {
  return `${ppm.toFixed(3)} ppm`;
}

export function formatDuration(hours: number): string {
  if (hours === 1) return '1 hour';
  if (Number.isInteger(hours)) return `${hours} hours`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}

export function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function dosimeterStatusLabel(status: string): string {
  const map: Record<string, string> = {
    valid: 'Valid',
    expiring: 'Expiring Soon',
    expired: 'Expired',
    invalid: 'Invalid',
    not_assigned: 'Not Assigned',
  };
  return map[status] ?? status;
}

export function dosimeterStatusColour(status: string): string {
  const map: Record<string, string> = {
    valid: 'text-green-600',
    expiring: 'text-amber-600',
    expired: 'text-red-600',
    invalid: 'text-red-700',
    not_assigned: 'text-gray-500',
  };
  return map[status] ?? 'text-gray-500';
}

export function workerStatusBadge(status: string): {
  label: string;
  className: string;
} {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'badge-green' },
    inactive: { label: 'Inactive', className: 'badge-gray' },
    suspended: { label: 'Suspended', className: 'badge-red' },
    pending: { label: 'Pending', className: 'badge-amber' },
    approved: { label: 'Approved', className: 'badge-green' },
    rejected: { label: 'Rejected', className: 'badge-red' },
  };
  return map[status] ?? { label: status, className: 'badge-gray' };
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
