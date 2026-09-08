'use client';
import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { logoutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { LogOut, Shield, Mail } from 'lucide-react';

interface AdminData { displayName?: string; email?: string; role?: string; }

export default function AdminProfilePage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    displayName: '',
  });

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, COLLECTIONS.USERS, user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data() as AdminData;
        setAdminData(d);
        setFormData({
          displayName: d.displayName || '',
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
      const ref = doc(db, COLLECTIONS.USERS, user.uid);
      await updateDoc(ref, {
        displayName: formData.displayName,
      });
      setSuccess('Profile updated successfully.');
      setAdminData({ ...adminData, ...formData });
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
          <Shield className="text-blue-500" /> Admin Profile
        </h2>

        {success && <div className="bg-green-500/20 text-green-500 p-3 rounded mb-6 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300 flex items-center gap-2">
              <Mail size={14} /> Email (Read-only)
            </label>
            <input type="text" className="input-field w-full bg-navy-bg cursor-not-allowed opacity-70" value={auth.currentUser?.email || adminData?.email || 'No email associated'} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Display Name</label>
            <input type="text" className="input-field w-full" value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} required />
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
    </div>
  );
}
