'use client';
// app/(worker)/profile/page.tsx
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { query, collection, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { logoutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { Worker } from '@/types/worker';
import { toFirestoreDate, formatDate } from '@/lib/utils/date';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { LogOut, User as UserIcon, Building, Shield } from 'lucide-react';
import { DosimeterBadge } from '@/components/ui/Badge';

export default function WorkerProfilePage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDocs(
      query(collection(db, COLLECTIONS.WORKERS), where('uid', '==', user.uid), limit(1))
    ).then((snap) => {
      if (!snap.empty) {
        const d = snap.docs[0].data();
        setWorker({
          id: snap.docs[0].id,
          publicId: d.publicId,
          uid: d.uid,
          fullName: d.fullName,
          employeeId: d.employeeId,
          department: d.department,
          designation: d.designation,
          status: d.status,
          qrCodeData: d.qrCodeData,
          dosimeterStatus: d.dosimeterStatus,
          createdAt: toFirestoreDate(d.createdAt) ?? new Date(),
          updatedAt: toFirestoreDate(d.updatedAt) ?? new Date(),
          profilePhotoUrl: d.profilePhotoUrl,
        } as Worker);
      }
    }).finally(() => setLoading(false));
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
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>My Profile</h1>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--color-surface-2)', border: '2px solid var(--color-border)',
          margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', color: 'var(--color-text-muted)', fontSize: '2rem', fontWeight: 700,
        }}>
          {worker?.profilePhotoUrl
            ? <img src={worker.profilePhotoUrl} alt="Worker" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : worker?.fullName.charAt(0)}
        </div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{worker?.fullName}</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          {auth.currentUser?.email ?? 'No email associated'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <DosimeterBadge status={worker?.dosimeterStatus ?? 'not_assigned'} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Employment Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Building size={16} style={{ color: 'var(--color-text-muted)' }} />
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Department</p>
              <p style={{ fontWeight: 500 }}>{worker?.department}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <UserIcon size={16} style={{ color: 'var(--color-text-muted)' }} />
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Designation</p>
              <p style={{ fontWeight: 500 }}>{worker?.designation}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Shield size={16} style={{ color: 'var(--color-text-muted)' }} />
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>SENTINEL ID</p>
              <p style={{ fontWeight: 500, fontFamily: 'monospace', color: 'var(--color-accent)' }}>{worker?.publicId}</p>
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
        <LogOut size={16} /> Sign Out
      </button>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          SENTINEL Worker App<br />Joined {worker ? formatDate(worker.createdAt) : 'Unknown'}
        </p>
      </div>
    </div>
  );
}
