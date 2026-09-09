'use client';
// components/layout/TopBar.tsx
import { Menu, Bell } from 'lucide-react';
import { SentinelLogo } from './SentinelLogo';

interface TopBarProps {
  onMenuClick: () => void;
  title?: string;
  greeting?: string;
  actions?: React.ReactNode;
}

export function TopBar({ onMenuClick, title, greeting, actions }: TopBarProps) {
  return (
    <header className="topbar">
      {/* Hamburger - mobile only */}
      <button
        className="btn btn-ghost btn-icon lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {/* Mobile logo - hidden on desktop (sidebar shows logo) */}
      <div className="lg:hidden flex-1">
        {greeting ? (
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {greeting}
          </p>
        ) : (
          <SentinelLogo size="sm" />
        )}
      </div>

      {/* Desktop breadcrumb/title */}
      {title && (
        <div className="hidden lg:block flex-1">
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {title}
          </p>
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {actions}
        <button
          className="btn btn-ghost btn-icon"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
