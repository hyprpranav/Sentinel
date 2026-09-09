'use client';
// app/(manager)/layout.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import { ManagerSidebar } from '@/components/layout/ManagerSidebar';
import { TopBar } from '@/components/layout/TopBar';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { QuickCameraButton } from '@/components/ui/QuickCameraButton';

function ManagerShell({ children }: { children: React.ReactNode }) {
  const { user, role, loading, displayName } = useAuthContext();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) { router.replace('/login'); return; }
      if (role !== 'manager' && role !== 'admin') {
        router.replace('/login?error=unauthorized');
      }
    }
  }, [user, role, loading, router]);

  if (loading) return <LoadingScreen message="Loading SENTINEL..." />;
  if (!user || (role !== 'manager' && role !== 'admin')) return null;

  return (
    <div className="app-shell">
      <ManagerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        displayName={displayName}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          greeting={displayName ? `Manager - ${displayName}` : 'Manager'}
          actions={<QuickCameraButton userId={user.uid} role="manager" displayName={displayName} />}
        />
        <main className="main-content">
          <div style={{ marginBottom: '1rem' }}>
            <QuickCameraButton userId={user.uid} role="manager" displayName={displayName} variant="card" />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ManagerShell>{children}</ManagerShell>
    </AuthProvider>
  );
}
