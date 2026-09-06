'use client';
// app/(auth)/login/page.tsx
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUser } from '@/lib/firebase/auth';
import { getUserData } from '@/lib/firebase/auth';
import { SentinelLogo } from '@/components/layout/SentinelLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { Suspense } from 'react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await loginUser(form.email, form.password);
      const data = await getUserData(user.uid);
      const role = data?.role;

      if (redirect) {
        router.push(redirect);
      } else if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'manager') {
        router.push('/manager/dashboard');
      } else {
        router.push('/worker/home');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        setError('Invalid email or password.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please try again later.');
      } else if (msg.includes('account-pending-approval')) {
        setError('Your account is waiting for administrator approval.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <ThemeToggle />
      </div>

      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <SentinelLogo size="lg" />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Sign in to access your dashboard
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            {/* Error */}
            {error && (
              <div className="alert alert-danger" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="form-group">
              <label htmlFor="login-email" className="input-label">Email address</label>
              <input
                id="login-email"
                type="email"
                className="input"
                placeholder="you@organization.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="login-password" className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'var(--color-text-muted)', cursor: 'pointer',
                    padding: 4,
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !form.email || !form.password}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {loading ? (
                <><LoadingSpinner size={16} /> Signing in...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="divider" style={{ margin: '1.25rem 0' }} />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            New to Sentinel?{' '}
            <Link href="/register" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
              Register here
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            SENTINEL — Passive Exposure Intelligence for Safer Workplaces<br />
            TEAM SENSATION · MRPL · SIH Problem ID 26118
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner size={24} /></div>}>
      <LoginContent />
    </Suspense>
  );
}
