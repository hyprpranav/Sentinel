'use client';
import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

const ADMIN_PIN = '927624';

interface PinDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  danger?: string;
}

export function PinDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  danger,
}: PinDeleteDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (pin !== ADMIN_PIN) {
      setError('Incorrect PIN. Please enter the correct 6-digit admin PIN.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setPin('');
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '1rem',
          padding: '2rem',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          animation: shake ? 'shake 0.5s ease' : 'slideUp 0.25s ease',
        }}
      >
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldAlert size={28} style={{ color: '#ef4444' }} />
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {description}
          </p>
        </div>

        {/* Warning */}
        {danger && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            marginBottom: '1.25rem',
            display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
          }}>
            <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{danger}</span>
          </div>
        )}

        {/* PIN input */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{
            display: 'block', fontSize: '0.8125rem', fontWeight: 600,
            color: 'var(--color-text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.05em',
          }}>
            ENTER 6-DIGIT ADMIN PIN
          </label>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPin(v);
              setError('');
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && pin.length === 6) handleConfirm(); }}
            placeholder="● ● ● ● ● ●"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '1.25rem',
              letterSpacing: '0.5em',
              textAlign: 'center',
              background: 'var(--color-surface-raised)',
              border: `2px solid ${error ? '#ef4444' : 'var(--color-border)'}`,
              borderRadius: '0.5rem',
              color: 'var(--color-text)',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          {error && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            <X size={16} /> Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={pin.length !== 6 || loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: pin.length === 6 && !loading ? '#ef4444' : 'rgba(239,68,68,0.4)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: pin.length === 6 && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.6s linear infinite',
                  display: 'inline-block',
                }} />
                Deleting…
              </span>
            ) : (
              <><Trash2 size={16} /> Delete All</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
