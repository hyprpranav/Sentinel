'use client';
// app/(auth)/admin-setup/page.tsx
// ONE-TIME utility: creates/fixes the admin Firebase Auth account + Firestore document.
// Visit /admin-setup, enter the desired admin email & password, click the button.
// DELETE this page once admin login is confirmed working.

import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { SentinelLogo } from '@/components/layout/SentinelLogo';
import { CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';

export default function AdminSetupPage() {
  const [email, setEmail] = useState('hyprpranav@gmail.com');
  const [password, setPassword] = useState('927624BEC066');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [uid, setUid] = useState('');

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      let firebaseUser;

      // Step 1: Try to sign in first (user may already exist in Firebase Auth)
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = cred.user;
        setMessage('Found existing Firebase Auth account. Patching Firestore...');
      } catch {
        // Sign-in failed → create the account fresh
        setMessage('No existing account found. Creating Firebase Auth account...');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = cred.user;
        await updateProfile(firebaseUser, { displayName: 'Admin' });
      }

      // Step 2: Write/overwrite the Firestore users document with admin role
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName ?? 'Admin',
        role: 'admin',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setUid(firebaseUser.uid);
      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('email-already-in-use')) {
        setMessage('Account exists but password is wrong. Please enter the correct password.');
      } else if (msg.includes('weak-password')) {
        setMessage('Password must be at least 6 characters.');
      } else {
        setMessage(msg);
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <SentinelLogo size="md" />
          </div>
          <h1 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} /> Admin Account Bootstrap
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            Creates the admin Firebase Auth account and Firestore document in one click.<br />
            <strong>Delete this page after use.</strong>
          </p>
        </div>

        <div className="card">
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle size={44} style={{ color: 'var(--color-green)', margin: '0 auto 0.75rem' }} />
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Admin Ready! 🎉</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Firebase Auth account + Firestore admin document created successfully.
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', fontFamily: 'monospace' }}>
                UID: {uid}
              </p>
              <a href="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                Go to Login →
              </a>
            </div>
          ) : (
            <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {status === 'error' && (
                <div className="alert alert-danger" role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem' }}>{message}</span>
                </div>
              )}

              <div className="form-group">
                <label className="input-label" htmlFor="setup-email">Admin Email</label>
                <input
                  id="setup-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={status === 'loading'}
                />
              </div>

              <div className="form-group">
                <label className="input-label" htmlFor="setup-password">Admin Password</label>
                <input
                  id="setup-password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  disabled={status === 'loading'}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={status === 'loading'}
                style={{ width: '100%' }}
              >
                {status === 'loading'
                  ? <><LoadingSpinner size={16} /> Setting up admin...</>
                  : '🔧 Create / Fix Admin Account'
                }
              </button>

              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                This will create the account if it doesn't exist, or patch the Firestore role if it does.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
