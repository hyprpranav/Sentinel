'use client';
import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { logoutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { LogOut, User as UserIcon, Building, Phone, Mail, Hash } from 'lucide-react';
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay';

interface ManagerData {
  fullName?: string;
  phone?: string;
  department?: string;
  email?: string;
  publicId?: string;
}

export default function ManagerProfilePage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [manager, setManager] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    department: '',
  });

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, COLLECTIONS.MANAGERS, user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setManager(d);
        setFormData({
          fullName: d.fullName || '',
          phone: d.phone || '',
          department: d.department || '',
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
    if (!user) return;
    
    setSaving(true);
    setSuccess('');
    try {
      const ref = doc(db, COLLECTIONS.MANAGERS, user.uid);
      await updateDoc(ref, {
        fullName: formData.fullName,
        phone: formData.phone,
        department: formData.department,
      });
      setSuccess('Profile updated successfully.');
      setManager({ ...manager, ...formData });
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
    <div className="max-w-3xl mx-auto">
      <div className="bg-navy-card border border-navy-border shadow-lg rounded-xl p-8 mb-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <UserIcon className="text-blue-500" /> Manager Profile
        </h2>

        {success && <div className="bg-green-500/20 text-green-500 p-3 rounded mb-6 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300 flex items-center gap-2">
                <Hash size={14} /> Manager ID (Read-only)
              </label>
              <input type="text" className="input-field w-full bg-navy-bg cursor-not-allowed opacity-70" value={manager?.publicId || ''} disabled />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300 flex items-center gap-2">
                <Mail size={14} /> Email (Read-only)
              </label>
              <input type="text" className="input-field w-full bg-navy-bg cursor-not-allowed opacity-70" value={auth.currentUser?.email || manager?.email || 'No email associated'} disabled />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Full Name</label>
            <input type="text" className="input-field w-full" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300 flex items-center gap-2">
                <Phone size={14} /> Phone
              </label>
              <input type="tel" className="input-field w-full" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300 flex items-center gap-2">
                <Building size={14} /> Department
              </label>
              <input type="text" className="input-field w-full" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn btn-primary px-8">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <button className="btn btn-outline w-full justify-center mb-6" onClick={handleLogout}>
        <LogOut size={16} /> Sign Out
      </button>

      {manager?.publicId && (
        <div className="bg-navy-card border border-navy-border shadow-lg rounded-xl p-6 mb-6 flex flex-col items-center">
          <h3 className="font-bold mb-2">My Manager QR</h3>
          <p className="text-sm text-gray-400 text-center mb-4">Download your manager identification QR code.</p>
          <QRCodeDisplay data={manager.publicId} downloadName={`SENTINEL-${manager.publicId}-QR`} />
        </div>
      )}
    </div>
  );
}
