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
import { Upload } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary/config';

interface AdminData { displayName?: string; email?: string; role?: string; address?: string; bloodGroup?: string; dateOfBirth?: string; guardianContact?: string; profilePhotoUrl?: string; }

export default function AdminProfilePage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    address: '', bloodGroup: '', dateOfBirth: '', guardianContact: '',
  });

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, COLLECTIONS.USERS, user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data() as AdminData;
        setAdminData(d);
        setFormData({
          displayName: d.displayName || '',
          address: d.address || '', bloodGroup: d.bloodGroup || '', dateOfBirth: d.dateOfBirth || '', guardianContact: d.guardianContact || '',
        });
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setSuccess('');
    try {
      const ref = doc(db, COLLECTIONS.USERS, user.uid);
      const profilePhotoUrl = photoFile
        ? (await uploadToCloudinary(photoFile, 'sentinel/workers')).secure_url
        : adminData?.profilePhotoUrl;
      await updateDoc(ref, {
        displayName: formData.displayName,
        address: formData.address,
        bloodGroup: formData.bloodGroup,
        dateOfBirth: formData.dateOfBirth,
        guardianContact: formData.guardianContact,
        profilePhotoUrl,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photoPreview || adminData?.profilePhotoUrl ? <img src={photoPreview || adminData?.profilePhotoUrl} alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Shield size={24} />}
          </div>
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}><Upload size={15} /> Upload Profile Photo<input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} /></label>
        </div>

        {success && <div className="bg-green-500/20 text-green-500 p-3 rounded mb-6 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300 flex items-center gap-2">
              <Mail size={14} /> Email (Read-only)
            </label>
            <input type="text" className="input-field w-full bg-navy-bg cursor-not-allowed opacity-70" value={auth.currentUser?.email || adminData?.email || 'No email associated'} disabled />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1 text-gray-300">Address</label><textarea className="input-field w-full" rows={2} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1 text-gray-300">Date of Birth</label><input type="date" className="input-field w-full" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1 text-gray-300">Blood Group</label><input className="input-field w-full" value={formData.bloodGroup} onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1 text-gray-300">Emergency Contact</label><input className="input-field w-full" value={formData.guardianContact} onChange={(e) => setFormData({...formData, guardianContact: e.target.value})} /></div>
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
