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
import { WorkerSidebar } from '@/components/layout/WorkerSidebar';
import { Menu } from 'lucide-react';

import { query, collection, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';

function WorkerShell({ children }: { children: React.ReactNode }) {
  const { user, role, loading, displayName } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const isPublicWorkerProfile = /^\/worker\/SW\d+$/i.test(pathname);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, COLLECTIONS.WORKERS), where('uid', '==', user.uid), limit(1)))
      .then((snap) => {
        if (!snap.empty) {
          setWorkerName(snap.docs[0].data().fullName);
        }
      })
      .catch(console.error);
  }, [user]);

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

  const activeName = workerName || displayName || user.displayName;

  return (
    <div className="app-shell worker-shell" style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <WorkerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} displayName={activeName} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Simple worker top bar */}
        <header
          className="topbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.25rem',
            justifyContent: 'space-between',
            zIndex: 30,
          }}
        >
          <button className="btn btn-ghost btn-icon worker-menu-button lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open worker navigation"><Menu size={20} aria-hidden="true" /></button>
          <div className="lg:hidden">
            <SentinelLogo size="sm" />
          </div>
          <div className="hidden lg:block">
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Worker Portal{activeName ? ` · ${activeName}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ThemeToggle />
          </div>
        </header>

        <main className="worker-main">
          {children}
        </main>
      </div>

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
