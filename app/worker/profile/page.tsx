'use client';
import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { query, collection, where, getDocs, limit, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { logoutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { Worker } from '@/types/worker';
import { toFirestoreDate, formatDate } from '@/lib/utils/date';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { LogOut, User as UserIcon, Building, Phone, Mail, Hash } from 'lucide-react';
import { DosimeterBadge } from '@/components/ui/Badge';
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay';

export default function WorkerProfilePage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    department: '',
    designation: '',
  });

  useEffect(() => {
    if (!user) return;
    getDocs(
      query(collection(db, COLLECTIONS.WORKERS), where('uid', '==', user.uid), limit(1))
    ).then((snap) => {
      if (!snap.empty) {
        const d = snap.docs[0].data();
        const w = {
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
          phone: d.phone,
          email: d.email,
        } as Worker;
        setWorker(w);
        setFormData({
          fullName: w.fullName || '',
          phone: w.phone || '',
          department: w.department || '',
          designation: w.designation || '',
        });
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;
    
    setSaving(true);
    setSuccess('');
    try {
      const ref = doc(db, COLLECTIONS.WORKERS, worker.id);
      await updateDoc(ref, {
        fullName: formData.fullName,
        phone: formData.phone,
        department: formData.department,
        designation: formData.designation,
      });
      setSuccess('Profile updated successfully.');
      setWorker({ ...worker, ...formData });
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner size={24} /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Profile Form */}
      <div className="col-span-1 md:col-span-2">
        <div className="bg-navy-card border border-navy-border shadow-lg rounded-xl p-8 mb-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <UserIcon className="text-blue-500" /> My Profile
          </h2>

          {success && <div className="bg-green-500/20 text-green-500 p-3 rounded mb-6 text-sm">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300 flex items-center gap-2">
                <Hash size={14} /> Worker ID (Read-only)
              </label>
              <input type="text" className="input-field w-full bg-navy-bg cursor-not-allowed opacity-70" value={worker?.publicId || ''} disabled />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300 flex items-center gap-2">
                <Mail size={14} /> Email (Read-only)
              </label>
              <input type="text" className="input-field w-full bg-navy-bg cursor-not-allowed opacity-70" value={auth.currentUser?.email || worker?.email || 'No email associated'} disabled />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Full Name</label>
              <input type="text" className="input-field w-full" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300 flex items-center gap-2">
                <Phone size={14} /> Phone
              </label>
              <input type="tel" className="input-field w-full" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300 flex items-center gap-2">
                  <Building size={14} /> Department
                </label>
                <input type="text" className="input-field w-full" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Designation</label>
                <input type="text" className="input-field w-full" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} required />
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={saving} className="btn btn-primary w-full py-3">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        <button className="btn btn-outline w-full justify-center mb-6" onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>

        <div className="text-center text-gray-500 text-xs mt-4">
          SENTINEL Worker App <br /> Joined {worker ? formatDate(worker.createdAt) : 'Unknown'}
        </div>
      </div>

      {/* QR Code Section & Status */}
      <div className="col-span-1 flex flex-col gap-6">
        <div className="bg-navy-card border border-navy-border shadow-lg rounded-xl p-6 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-navy-bg border-2 border-navy-border flex items-center justify-center overflow-hidden text-2xl font-bold text-gray-500 mb-4">
            {worker?.profilePhotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={worker.profilePhotoUrl} alt="Worker" className="w-full h-full object-cover" />
            ) : (
              worker?.fullName.charAt(0)
            )}
          </div>
          <h2 className="text-xl font-bold mb-1">{worker?.fullName}</h2>
          <div className="flex gap-2 mb-2 mt-4">
            <DosimeterBadge status={worker?.dosimeterStatus ?? 'not_assigned'} />
          </div>
        </div>

        <div className="bg-navy-card border border-navy-border shadow-lg rounded-xl p-6 flex flex-col items-center">
          <h3 className="font-bold mb-4 text-center">My QR Code</h3>
          <p className="text-sm text-gray-400 text-center mb-6">
            Download this QR code and attach it to your physical dosimeter for easy scanning.
          </p>
          {worker?.qrCodeData && (
            <QRCodeDisplay data={worker.qrCodeData} downloadName={`SNT-QR-${worker.publicId}`} />
          )}
        </div>
      </div>
    </div>
  );
}
