'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, Home, QrCode, UserCircle, LogOut } from 'lucide-react';
import { SentinelLogo } from './SentinelLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { logoutUser } from '@/lib/firebase/auth';

const NAV = [
  { label: 'Dashboard', href: '/worker/home', icon: Home },
  { label: 'My QR', href: '/worker/my-qr', icon: QrCode },
  { label: 'Exposure', href: '/worker/my-exposure', icon: Activity },
  { label: 'Profile', href: '/worker/profile', icon: UserCircle },
];

export function WorkerSidebar({ isOpen, onClose, displayName }: { isOpen: boolean; onClose: () => void; displayName?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo"><SentinelLogo size="sm" /></div>
        <nav className="sidebar-nav" aria-label="Worker navigation">
          <span className="nav-section-label">Worker Portal</span>
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`} onClick={onClose} aria-current={active ? 'page' : undefined}><Icon size={17} aria-hidden="true" />{label}</Link>;
          })}
        </nav>
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <ThemeToggle />
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}><LogOut size={15} aria-hidden="true" />Sign Out</button>
          {displayName && <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', paddingLeft: '0.25rem' }}>{displayName}</p>}
        </div>
      </aside>
    </>
  );
}
