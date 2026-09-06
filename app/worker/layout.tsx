'use client';
// app/(worker)/layout.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import { WorkerBottomNav } from '@/components/layout/WorkerBottomNav';
import { SentinelLogo } from '@/components/layout/SentinelLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

function WorkerShell({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) { router.replace('/login'); return; }
      if (role !== 'worker') { router.replace('/login?error=unauthorized'); }
    }
  }, [user, role, loading, router]);

  if (loading) return <LoadingScreen message="Loading SENTINEL..." />;
  if (!user || role !== 'worker') return null;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      {/* Simple worker top bar */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--topbar-height)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center',
        padding: '0 1.25rem',
        justifyContent: 'space-between',
        zIndex: 30,
      }}>
        <SentinelLogo size="sm" />
        <ThemeToggle />
      </header>

      <main style={{
        paddingTop: 'calc(var(--topbar-height) + 1.25rem)',
        paddingBottom: 'calc(64px + 1.25rem)',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        maxWidth: 540,
        margin: '0 auto',
      }}>
        {children}
      </main>

      <WorkerBottomNav />
    </div>
  );
}

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WorkerShell>{children}</WorkerShell>
    </AuthProvider>
  );
}
