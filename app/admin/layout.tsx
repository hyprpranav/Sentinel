'use client';
// app/(admin)/layout.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { TopBar } from '@/components/layout/TopBar';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { QuickCameraButton } from '@/components/ui/QuickCameraButton';

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, role, loading, displayName } = useAuthContext();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) { router.replace('/login'); return; }
      if (role !== 'admin') { router.replace('/login?error=unauthorized'); }
    }
  }, [user, role, loading, router]);

  if (loading) return <LoadingScreen message="Loading SENTINEL..." />;
  if (!user || role !== 'admin') return null;

  return (
    <div className="app-shell">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          greeting={displayName ? `Master Admin — ${displayName}` : 'Master Admin'}
          actions={<QuickCameraButton userId={user.uid} role="admin" displayName={displayName} />}
        />
        <main className="main-content">
          <div style={{ marginBottom: '1rem' }}>
            <QuickCameraButton userId={user.uid} role="admin" displayName={displayName} variant="card" />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
