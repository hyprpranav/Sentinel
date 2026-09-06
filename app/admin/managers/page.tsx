'use client';
// app/(admin)/managers/page.tsx
import { useEffect, useState } from 'react';
import { query, collection, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { AppUser } from '@/types/user';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { UserCheck, Shield, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadManagers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', 'in', ['manager', 'admin'])));
      const data: AppUser[] = [];
      snap.forEach(d => data.push({ uid: d.id, ...d.data() } as AppUser));
      setManagers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadManagers(); }, []);

  const toggleStatus = async (m: AppUser) => {
    if (m.role === 'admin') return; // Cannot disable admin from here
    setProcessing(m.uid);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, m.uid), {
        isActive: !m.isActive
      });
      loadManagers();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Manager Directory</h1>
        <p>Authorized scanning personnel and their account status</p>
      </div>

      <div className="card card-flush">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner size={24} /></div>
        ) : managers.length === 0 ? (
          <EmptyState icon={UserCheck} title="No managers found" />
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((m) => (
                  <tr key={m.uid}>
                    <td style={{ fontWeight: 500 }}>{m.displayName}</td>
                    <td style={{ fontSize: '0.875rem' }}>{m.email}</td>
                    <td>
                      {m.role === 'admin' ? (
                        <span className="badge badge-navy"><Shield size={12} style={{ marginRight: 4 }} /> Master Admin</span>
                      ) : (
                        <span className="badge badge-blue">Manager</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${m.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {m.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      {m.role !== 'admin' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleStatus(m)}
                          disabled={processing === m.uid}
                        >
                          {processing === m.uid ? <LoadingSpinner size={14} /> :
                            m.isActive ? <ToggleRight size={20} color="var(--color-green)" /> : <ToggleLeft size={20} color="var(--color-text-muted)" />
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
