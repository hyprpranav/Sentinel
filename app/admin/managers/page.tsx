'use client';
// app/(admin)/managers/page.tsx
import { useEffect, useState } from 'react';
import { query, collection, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { AppUser } from '@/types/user';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { PinDeleteDialog } from '@/components/ui/PinDeleteDialog';
import { deleteAllManagers } from '@/services/managerService';
import { UserCheck, Shield, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Download } from 'lucide-react';
import { generateQRDataUrl } from '@/lib/qr/generator';

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', 'in', ['manager', 'admin'])));
        const data: AppUser[] = [];
        snap.forEach(d => data.push({ uid: d.id, ...d.data() } as AppUser));
        if (!cancelled) setManagers(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const refresh = () => {
    setLoading(true);
    getDocs(query(collection(db, COLLECTIONS.USERS), where('role', 'in', ['manager', 'admin']))).then((snap) => {
      const data: AppUser[] = [];
      snap.forEach(d => data.push({ uid: d.id, ...d.data() } as AppUser));
      setManagers(data);
    }).finally(() => setLoading(false));
  };

  const toggleStatus = async (m: AppUser) => {
    if (m.role === 'admin') return;
    setProcessing(m.uid);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, m.uid), { isActive: !m.isActive });
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteAll = async () => {
    await deleteAllManagers();
    // Refresh to keep only admin
    refresh();
  };

  const handleDownloadManagerQr = async (manager: AppUser) => {
    const publicId = (manager as AppUser & { publicId?: string }).publicId;
    if (!publicId) return;
    const dataUrl = await generateQRDataUrl(publicId, 320);
    const link = document.createElement('a');
    link.download = `SENTINEL-${publicId}-QR.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Manager Directory</h1>
          <p>Authorized scanning personnel and their account status</p>
        </div>
        <button
          onClick={() => setShowDeleteAll(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '0.5rem',
            color: '#ef4444',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.22)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
        >
          <Trash2 size={15} /> Delete All Managers
        </button>
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
                        <span className="badge badge-navy"><Shield size={12} style={{ marginRight: 4 }} />Master Admin</span>
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
                      {m.role !== 'admin' && (m as AppUser & { publicId?: string }).publicId && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDownloadManagerQr(m)} title="Regenerate manager QR">
                          <Download size={15} /> Regenerate QR
                        </button>
                      )}
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

      <PinDeleteDialog
        isOpen={showDeleteAll}
        onClose={() => setShowDeleteAll(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Managers"
        description="This will permanently delete all manager records and their user accounts from the database. Admin account will not be affected."
        danger="This action cannot be undone. All manager data will be permanently removed."
      />
    </div>
  );
}
