'use client';
// components/ui/LoadingScreen.tsx
export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function LoadingSpinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        opacity: 0.7,
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}
