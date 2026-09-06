'use client';
// components/layout/SentinelLogo.tsx
export function SentinelLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { text: '1rem', sub: '0.575rem', dot: 6 },
    md: { text: '1.25rem', sub: '0.65rem', dot: 7 },
    lg: { text: '1.75rem', sub: '0.75rem', dot: 9 },
  };
  const s = sizes[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Shield icon built inline — no emoji */}
        <svg
          width={s.dot * 2.8}
          height={s.dot * 3.2}
          viewBox="0 0 28 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14 2L3 7v8c0 7 5 13 11 15 6-2 11-8 11-15V7L14 2z"
            fill="var(--color-navy)"
            className="dark:fill-[var(--color-accent)]"
          />
          <path
            d="M10 16l3 3 6-6"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          style={{
            fontSize: s.text,
            fontWeight: 800,
            letterSpacing: '0.14em',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-inter)',
          }}
        >
          SENTINEL
        </span>
      </div>
      <span
        style={{
          fontSize: s.sub,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--color-text-muted)',
          paddingLeft: s.dot * 2.8 + 8,
        }}
      >
        H₂S Exposure Intelligence
      </span>
    </div>
  );
}
