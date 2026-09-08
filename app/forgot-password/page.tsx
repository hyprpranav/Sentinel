'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { ShieldAlert, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      // We display a generic message to avoid email enumeration attacks,
      // but if it's a specific format error we can show it.
      if (err instanceof Error && (err as { code?: string }).code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Failed to send reset email. Please ensure your email is correct.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400" />
        <div className="absolute -top-10 -right-10 text-blue-500/5">
          <ShieldAlert size={120} />
        </div>

        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-navy-bg border border-navy-border flex items-center justify-center text-blue-400 shadow-inner">
              <ShieldAlert size={32} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
          
          {success ? (
            <div className="text-center mt-6">
              <div className="flex justify-center mb-4 text-green-500">
                <CheckCircle size={48} />
              </div>
              <p className="text-gray-300 mb-6">
                If an account exists for <strong className="text-white">{email}</strong>, you will receive a password reset link shortly.
              </p>
              <Link href="/login" className="btn btn-outline w-full justify-center">
                Return to Login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-center mb-8 text-sm">
                Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 flex items-start gap-2">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      required
                      className="input-field w-full pl-10"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn btn-primary w-full py-2.5 text-[15px]"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1">
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
