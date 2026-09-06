'use client';
// app/(auth)/admin-setup/page.tsx
// ONE-TIME utility page: fixes/creates the admin Firestore document.
// Usage: sign in to Firebase Auth with hyprpranav@gmail.com first,
// then visit /admin-setup — it will patch the Firestore users doc.
// REMOVE this page once admin is confirmed working.

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { SentinelLogo } from '@/components/layout/SentinelLogo';
import { CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AdminSetupPage() {
  const [email, setEmail] = useState('hyprpranav@gmail.com');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      // Sign in with Firebase Auth
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;

      // Force-set the Firestore document with admin role + isActive true
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        displayName: credential.user.displayName ?? 'Admin',
        role: 'admin',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setStatus('success');
      setMessage(`✅ Admin document set for UID: ${uid}\n\nNow go to /login and sign in with your admin credentials.`);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Unknown error occurred.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <SentinelLogo size="md" />
          </div>
          <h1 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} /> Admin Account Setup
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            One-time utility to set admin role in Firestore. Remove this page after use.
          </p>
        </div>

        <div className="card">
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle size={40} style={{ color: 'var(--color-green)', margin: '0 auto 0.75rem' }} />
              <pre style={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap', textAlign: 'left', background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: '0.375rem' }}>
                {message}
              </pre>
              <a href="/login" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: '1rem' }}>
                Go to Login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {status === 'error' && (
                <div className="alert alert-danger">
                  <AlertCircle size={16} />
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
                />
              </div>
              <div className="form-group">
                <label className="input-label" htmlFor="setup-password">Password</label>
                <input
                  id="setup-password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Admin password"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={status === 'loading'}
                style={{ width: '100%' }}
              >
                {status === 'loading' ? 'Setting up...' : 'Fix Admin Document'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
