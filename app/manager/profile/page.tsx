'use client';
// app/(manager)/profile/page.tsx
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { getUserData } from '@/lib/firebase/auth';
import { UserRole } from '@/types/user';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { User as UserIcon, LogOut, CheckCircle, Clock } from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { logoutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';

export default function ManagerProfilePage() {
  const { user, role, displayName } = useAuthContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    getUserData(user.uid).then(setData).finally(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner size={24} /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Profile & Settings</h1>
        <p>Manage your account preferences</p>
      </div>

      <div className="card" style={{ maxWidth: 600, padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--color-surface-2)', border: '2px solid var(--color-border)',
          margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-text-muted)', fontSize: '2rem', fontWeight: 700,
        }}>
          {displayName?.charAt(0) ?? 'M'}
        </div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{displayName}</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          {auth.currentUser?.email}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <span className="badge badge-blue">
            {role === 'admin' ? 'Master Admin' : 'Manager'}
          </span>
          <span className="badge badge-green">
            <CheckCircle size={12} style={{ marginRight: 4 }} /> Active
          </span>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 600, marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Account Details</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Account ID</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{user?.uid}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Created At</p>
            <p style={{ fontSize: '0.875rem' }}>{user?.metadata.creationTime}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Last Sign In</p>
            <p style={{ fontSize: '0.875rem' }}>{user?.metadata.lastSignInTime}</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, display: 'flex', justifyContent: 'flex-start' }}>
        <button className="btn btn-outline" onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
