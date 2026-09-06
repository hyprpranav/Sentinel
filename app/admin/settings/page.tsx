'use client';
// app/(admin)/settings/page.tsx
import { useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { Shield, Settings as SettingsIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function AdminSettingsPage() {
  const { user, displayName } = useAuthContext();
  const [demoMode, setDemoMode] = useState(true);

  return (
    <div>
      <div className="page-header">
        <h1>Platform Settings</h1>
        <p>Global SENTINEL platform configuration</p>
      </div>

      <div className="two-col" style={{ gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <SettingsIcon size={20} style={{ color: 'var(--color-accent)' }} />
            <h3 style={{ fontSize: '1.0625rem' }}>Global Preferences</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <p style={{ fontWeight: 500 }}>Default Theme</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Set appearance for this device</p>
            </div>
            <ThemeToggle />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0' }}>
            <div>
              <p style={{ fontWeight: 500 }}>System Demo Mode</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Allow managers to use synthetic image analysis</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Shield size={20} style={{ color: 'var(--color-accent)' }} />
            <h3 style={{ fontSize: '1.0625rem' }}>Admin Account</h3>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Name</p>
              <p style={{ fontWeight: 500 }}>{displayName}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Role</p>
              <p style={{ fontWeight: 500 }}>Master Admin</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>UID</p>
              <p style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{user?.uid}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
