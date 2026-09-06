'use client';
// components/ui/EmptyState.tsx
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={24} />
      </div>
      <div>
        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{description}</p>
        )}
      </div>
      {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
    </div>
  );
}
