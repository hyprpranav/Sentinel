'use client';
import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { updateProfile } from 'firebase/auth';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { logoutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { LogOut, User as UserIcon, Building, Phone, Mail, Hash } from 'lucide-react';
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay';
import { uploadToCloudinary } from '@/lib/cloudinary/config';
import { Upload } from 'lucide-react';

interface ManagerData {
  fullName?: string;
  phone?: string;
  department?: string;
  email?: string;
  publicId?: string;
  address?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  guardianName?: string;
  guardianContact?: string;
  profilePhotoUrl?: string;
}

export default function ManagerProfilePage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [manager, setManager] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    department: '',
    address: '', bloodGroup: '', dateOfBirth: '', guardianName: '', guardianContact: '',
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
          address: d.address || '', bloodGroup: d.bloodGroup || '', dateOfBirth: d.dateOfBirth || '', guardianName: d.guardianName || '', guardianContact: d.guardianContact || '',
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
      const ref = doc(db, COLLECTIONS.MANAGERS, user.uid);
      const profilePhotoUrl = photoFile
        ? (await uploadToCloudinary(photoFile, 'sentinel/workers')).secure_url
        : manager?.profilePhotoUrl;
      await updateDoc(ref, {
        fullName: formData.fullName,
        phone: formData.phone,
        department: formData.department,
        address: formData.address,
        bloodGroup: formData.bloodGroup,
        dateOfBirth: formData.dateOfBirth,
        guardianName: formData.guardianName,
        guardianContact: formData.guardianContact,
        profilePhotoUrl,
        updatedAt: serverTimestamp(),
      });

      // Synchronize Firebase Auth displayName
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName: formData.fullName });
        } catch (e) {
          console.warn('Auth displayName update failed:', e);
        }
      }

      // Synchronize Users collection
      if (user?.uid) {
        try {
          await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
            displayName: formData.fullName,
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Users collection update failed:', e);
        }
      }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photoPreview || manager?.profilePhotoUrl ? <img src={photoPreview || manager?.profilePhotoUrl} alt="Manager" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={24} />}
          </div>
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}><Upload size={15} /> Upload Profile Photo<input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} /></label>
        </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1 text-gray-300">Address</label><textarea className="input-field w-full" rows={2} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1 text-gray-300">Date of Birth</label><input type="date" className="input-field w-full" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1 text-gray-300">Blood Group</label><input className="input-field w-full" value={formData.bloodGroup} onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1 text-gray-300">Guardian Contact</label><input className="input-field w-full" value={formData.guardianContact} onChange={(e) => setFormData({...formData, guardianContact: e.target.value})} /></div>
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
          <p className="text-sm font-mono mb-3">{manager.publicId}</p>
          <QRCodeDisplay data={manager.publicId ?? ''} downloadName={`SENTINEL-${manager.publicId}-QR`} />
        </div>
      )}
    </div>
  );
}
