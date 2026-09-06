'use client';
// components/ui/Badge.tsx
import { cn } from '@/lib/utils/formatting';

type Variant = 'green' | 'amber' | 'red' | 'orange' | 'gray' | 'blue' | 'purple' | 'navy';

interface BadgeProps {
  label: string;
  variant?: Variant;
  dot?: boolean;
  className?: string;
}

export function Badge({ label, variant = 'gray', dot, className }: BadgeProps) {
  return (
    <span className={cn(`badge badge-${variant}`, className)}>
      {dot && (
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'currentColor', flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
}

export function DosimeterBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: Variant }> = {
    valid:        { label: 'Valid',          variant: 'green' },
    expiring:     { label: 'Expiring Soon',  variant: 'amber' },
    expired:      { label: 'Expired',        variant: 'red' },
    invalid:      { label: 'Invalid',        variant: 'red' },
    not_assigned: { label: 'Not Assigned',   variant: 'gray' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' as Variant };
  return <Badge label={label} variant={variant} dot />;
}

export function WorkerStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: Variant }> = {
    active:    { label: 'Active',    variant: 'green' },
    inactive:  { label: 'Inactive', variant: 'gray' },
    suspended: { label: 'Suspended',variant: 'red' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' as Variant };
  return <Badge label={label} variant={variant} dot />;
}

export function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: Variant }> = {
    pending:  { label: 'Pending',  variant: 'amber' },
    approved: { label: 'Approved', variant: 'green' },
    rejected: { label: 'Rejected', variant: 'red' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' as Variant };
  return <Badge label={label} variant={variant} />;
}

export function DoseLevelBadge({ ppmH }: { ppmH: number }) {
  let label = 'Low';
  let variant: Variant = 'green';
  if (ppmH >= 50) { label = 'Critical'; variant = 'red'; }
  else if (ppmH >= 20) { label = 'High'; variant = 'orange'; }
  else if (ppmH >= 5) { label = 'Moderate'; variant = 'amber'; }
  return <Badge label={label} variant={variant} />;
}
