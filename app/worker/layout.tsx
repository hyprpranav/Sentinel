'use client';
// app/(worker)/layout.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import { WorkerBottomNav } from '@/components/layout/WorkerBottomNav';
import { SentinelLogo } from '@/components/layout/SentinelLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { QuickCameraButton } from '@/components/ui/QuickCameraButton';
import { WorkerSidebar } from '@/components/layout/WorkerSidebar';
import { Menu } from 'lucide-react';

function WorkerShell({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isPublicWorkerProfile = /^\/worker\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (isPublicWorkerProfile) return;
    if (!loading) {
      if (!user) { router.replace('/login'); return; }
      if (role !== 'worker') { router.replace('/login?error=unauthorized'); }
    }
  }, [user, role, loading, router, isPublicWorkerProfile]);

  if (isPublicWorkerProfile) return <>{children}</>;

  if (loading) return <LoadingScreen message="Loading SENTINEL..." />;
  if (!user || role !== 'worker') return null;

  return (
    <div className="app-shell worker-shell" style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <WorkerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} displayName={user.displayName} />
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
        <button className="btn btn-ghost btn-icon worker-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open worker navigation"><Menu size={20} aria-hidden="true" /></button>
        <SentinelLogo size="sm" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <QuickCameraButton userId={user.uid} role="worker" displayName={user.displayName} />
          <ThemeToggle />
        </div>
      </header>

      <main className="worker-main">
        <div style={{ marginBottom: '1rem' }}>
          <QuickCameraButton userId={user.uid} role="worker" displayName={user.displayName} variant="card" />
        </div>
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
