'use client';
// app/(auth)/register/page.tsx — unified worker + manager registration
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitWorkerRequest } from '@/services/workerService';
import { submitManagerRequest } from '@/services/managerService';
import { registerPendingUser, logoutUser } from '@/lib/firebase/auth';
import { uploadToCloudinary } from '@/lib/cloudinary/config';
import { SentinelLogo } from '@/components/layout/SentinelLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { AlertCircle, CheckCircle, Upload, HardHat, Briefcase } from 'lucide-react';
import Link from 'next/link';

type Role = 'worker' | 'manager';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('worker');
  const [form, setForm] = useState({
    fullName: '', department: '', designation: '', email: '', phone: '', password: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB.'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRoleSwitch = (newRole: Role) => {
    setRole(newRole);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fullName || !form.email || form.password.length < 6) {
      setError('Please fill in all required fields (password must be at least 6 characters).');
      return;
    }
    if (role === 'worker' && (!form.department || !form.designation)) {
      setError('Please fill in department and designation.');
      return;
    }

    setLoading(true);
    try {
      const user = await registerPendingUser(form.email, form.password, form.fullName, role);

      if (role === 'worker') {
        let profilePhotoUrl: string | undefined;
        if (photoFile) {
          try {
            const result = await uploadToCloudinary(photoFile, 'sentinel/workers');
            profilePhotoUrl = result.secure_url;
          } catch (photoErr) {
            console.warn('Photo upload failed, continuing without photo:', photoErr);
            // Non-fatal — submit request without photo
          }
        }
        const { password: _p, ...requestData } = form;
        await submitWorkerRequest({ ...requestData, uid: user.uid, profilePhotoUrl });
      } else {
        let profilePhotoUrl: string | undefined;
        if (photoFile) {
          try {
            const result = await uploadToCloudinary(photoFile, 'sentinel/workers');
            profilePhotoUrl = result.secure_url;
          } catch (photoErr) {
            console.warn('Manager photo upload failed, continuing without photo:', photoErr);
          }
        }
        await submitManagerRequest({
          uid: user.uid,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          department: form.department,
          profilePhotoUrl,
        });
      }

      await logoutUser();
      setSuccess(true);
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('email-already-in-use')) {
        setError('An account already exists for this email. Please use a different email or sign in.');
      } else if (msg.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (msg.includes('weak-password')) {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (msg.includes('permission-denied')) {
        setError('Access denied. Please check your internet connection and try again.');
      } else if (msg.includes('network') || msg.includes('unavailable')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(`Submission failed: ${msg || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <CheckCircle size={48} style={{ color: 'var(--color-green)', margin: '0 auto 1rem' }} />
            <h2 style={{ marginBottom: '0.5rem' }}>Request Submitted!</h2>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
              {role === 'manager'
                ? 'Your manager account request has been submitted and is awaiting administrator approval.'
                : 'Your worker registration has been submitted and is awaiting administrator approval. You will be notified once approved.'}
            </p>
            <Link href="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <ThemeToggle />
      </div>

      <div className="auth-card" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <SentinelLogo size="md" />
          </div>
          <h1 style={{ fontSize: '1.25rem' }}>Create Account</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Submit a registration request for administrator approval
          </p>
        </div>

        {/* Role Toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--color-surface-2)',
          borderRadius: '0.625rem',
          padding: '0.25rem',
          marginBottom: '1.25rem',
          border: '1px solid var(--color-border)',
        }}>
          <button
            type="button"
            id="role-worker"
            onClick={() => handleRoleSwitch('worker')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.15s ease',
              background: role === 'worker' ? 'var(--color-surface)' : 'transparent',
              color: role === 'worker' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              boxShadow: role === 'worker' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            <HardHat size={15} />
            Worker
          </button>
          <button
            type="button"
            id="role-manager"
            onClick={() => handleRoleSwitch('manager')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.15s ease',
              background: role === 'manager' ? 'var(--color-surface)' : 'transparent',
              color: role === 'manager' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              boxShadow: role === 'manager' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            <Briefcase size={15} />
            Manager
          </button>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div className="alert alert-danger" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Optional profile photo */}
            {(role === 'worker' || role === 'manager') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--color-surface-2)',
                  border: '2px solid var(--color-border)',
                  overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Upload size={20} style={{ color: 'var(--color-text-muted)' }} />
                  }
                </div>
                <div>
                  <label htmlFor="photo-upload" className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                    Upload Photo
                  </label>
                  <input id="photo-upload" type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Optional — max 5MB
                  </p>
                </div>
              </div>
            )}

            {/* Name + Email */}
            <div className="two-col" style={{ gap: '0.875rem' }}>
              <div className="form-group">
                <label htmlFor="reg-name" className="input-label">Full Name *</label>
                <input id="reg-name" type="text" className="input"
                  value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Full legal name" required disabled={loading} />
              </div>
              <div className="form-group">
                <label htmlFor="reg-email" className="input-label">Email *</label>
                <input id="reg-email" type="email" className="input"
                  value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@organization.com" required disabled={loading} />
              </div>
            </div>

            {/* Department + Designation (worker) or just Department (manager) */}
            <div className="two-col" style={{ gap: '0.875rem' }}>
              <div className="form-group">
                <label htmlFor="reg-dept" className="input-label">Department {role === 'worker' ? '*' : ''}</label>
                <input id="reg-dept" type="text" className="input"
                  value={form.department} onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}
                  placeholder="e.g. Process Unit" disabled={loading} />
              </div>
              {role === 'worker' && (
                <div className="form-group">
                  <label htmlFor="reg-desig" className="input-label">Designation *</label>
                  <input id="reg-desig" type="text" className="input"
                    value={form.designation} onChange={(e) => setForm(f => ({ ...f, designation: e.target.value }))}
                    placeholder="e.g. Operator" required disabled={loading} />
                </div>
              )}
              {role === 'manager' && (
                <div className="form-group">
                  <label htmlFor="reg-phone" className="input-label">Phone</label>
                  <input id="reg-phone" type="tel" className="input"
                    value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Optional" disabled={loading} />
                </div>
              )}
            </div>

            {/* Password + Phone (worker) */}
            <div className="two-col" style={{ gap: '0.875rem' }}>
              <div className="form-group">
                <label htmlFor="reg-password" className="input-label">Password *</label>
                <input id="reg-password" type="password" className="input"
                  value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="At least 6 characters" required disabled={loading} />
              </div>
              {role === 'worker' && (
                <div className="form-group">
                  <label htmlFor="reg-phone" className="input-label">Phone</label>
                  <input id="reg-phone" type="tel" className="input"
                    value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Optional" disabled={loading} />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {loading
                ? <><LoadingSpinner size={16} /> Submitting...</>
                : `Submit ${role === 'manager' ? 'Manager' : 'Worker'} Request`
              }
            </button>
          </form>

          <div className="divider" style={{ margin: '1.25rem 0' }} />
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
