'use client';
// app/admin/workers/[workerId]/edit/page.tsx
// Admin edit worker (same as manager edit, but under admin route)

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkerById, updateWorkerById } from '@/services/workerService';
import { Worker } from '@/types/worker';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { ArrowLeft, Save, AlertTriangle, CheckCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ workerId: string }>;
}

export default function AdminEditWorkerPage({ params }: PageProps) {
  const { workerId } = use(params);
  const router = useRouter();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianContact, setGuardianContact] = useState('');

  useEffect(() => {
    getWorkerById(workerId).then((w) => {
      if (!w) { setError('Worker not found.'); setLoading(false); return; }
      setWorker(w);
      setFullName(w.fullName);
      setDepartment(w.department);
      setDesignation(w.designation);
      setPhone(w.phone ?? '');
      setAddress(w.address ?? '');
      setBloodGroup(w.bloodGroup ?? '');
      setDateOfBirth(w.dateOfBirth ?? '');
      setGuardianName(w.guardianName ?? '');
      setGuardianContact(w.guardianContact ?? '');
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setError('Could not load worker.');
      setLoading(false);
    });
  }, [workerId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      await updateWorkerById(worker.id, {
        fullName: fullName.trim(), department: department.trim(), designation: designation.trim(),
        phone: phone.trim() || undefined, address: address.trim() || undefined,
        bloodGroup: bloodGroup.trim() || undefined, dateOfBirth: dateOfBirth || undefined,
        guardianName: guardianName.trim() || undefined, guardianContact: guardianContact.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => router.push(`/admin/workers/${worker.id}`), 1500);
    } catch (err) {
      console.error(err);
      setError('Failed to save changes. Please try again.');
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><LoadingSpinner size={28} /></div>;

  if (!worker || error) return (
    <div style={{ maxWidth: 480, margin: '2rem auto' }}>
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem', gap: '0.5rem' }}><ArrowLeft size={15} /> Back</button>
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <AlertTriangle size={32} style={{ color: 'var(--color-amber)', margin: '0 auto 0.75rem' }} />
        <p>{error || 'Worker not found.'}</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => router.push(`/admin/workers/${worker.id}`)} className="btn btn-ghost btn-sm" style={{ gap: '0.5rem' }}>
          <ArrowLeft size={15} /> Back to Details
        </button>
      </div>
      <div className="page-header">
        <h1>Edit Worker</h1>
        <p>Update details for {worker.fullName} ({worker.publicId})</p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertTriangle size={14} style={{ flexShrink: 0 }} /><span>{error}</span></div>}
      {saved && <div className="alert" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', marginBottom: '1rem', gap: '0.5rem' }}>
        <CheckCircle size={14} style={{ color: 'var(--color-green)', flexShrink: 0 }} /><span style={{ color: 'var(--color-green)', fontWeight: 600 }}>Changes saved. Redirecting...</span>
      </div>}

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Basic Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="a-edit-name" className="input-label">Full Name</label>
              <input id="a-edit-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="form-group"><label htmlFor="a-edit-dept" className="input-label">Department</label><input id="a-edit-dept" className="input" value={department} onChange={(e) => setDepartment(e.target.value)} required /></div>
            <div className="form-group"><label htmlFor="a-edit-desig" className="input-label">Designation</label><input id="a-edit-desig" className="input" value={designation} onChange={(e) => setDesignation(e.target.value)} required /></div>
            <div className="form-group"><label htmlFor="a-edit-phone" className="input-label">Contact Number</label><input id="a-edit-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="form-group"><label htmlFor="a-edit-dob" className="input-label">Date of Birth</label><input id="a-edit-dob" className="input" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label htmlFor="a-edit-address" className="input-label">Address</label><textarea id="a-edit-address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} /></div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Emergency Contact</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="a-edit-blood" className="input-label">Blood Group</label>
              <select id="a-edit-blood" className="input" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                <option value="">Not specified</option>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group"><label htmlFor="a-edit-guardian" className="input-label">Guardian Name</label><input id="a-edit-guardian" className="input" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label htmlFor="a-edit-gcontact" className="input-label">Guardian Contact</label><input id="a-edit-gcontact" className="input" type="tel" value={guardianContact} onChange={(e) => setGuardianContact(e.target.value)} /></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving || saved} style={{ gap: '0.5rem' }}>
            {saving ? <><LoadingSpinner size={16} /> Saving...</> : <><Save size={16} /> Save Changes</>}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => router.push(`/admin/workers/${worker.id}`)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
