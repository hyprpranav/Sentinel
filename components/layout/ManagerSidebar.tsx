'use client';
// components/layout/ManagerSidebar.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ScanLine, Users, BarChart2,
  ClipboardList, UserCircle, LogOut,
} from 'lucide-react';
import { SentinelLogo } from './SentinelLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { logoutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';

const NAV = [
  { label: 'Dashboard',      href: '/manager/dashboard', icon: LayoutDashboard },
  { label: 'Scan Dosimeter', href: '/manager/scan',      icon: ScanLine },
  { label: 'Workers',        href: '/manager/workers',   icon: Users },
  { label: 'Exposure',       href: '/manager/exposure',  icon: BarChart2 },
  { label: 'Requests',       href: '/manager/requests',  icon: ClipboardList },
  { label: 'Profile',        href: '/manager/profile',   icon: UserCircle },
];

interface ManagerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  displayName?: string | null;
}

export function ManagerSidebar({ isOpen, onClose, displayName }: ManagerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <SentinelLogo size="sm" />
        </div>

        <nav className="sidebar-nav" aria-label="Manager navigation">
          <span className="nav-section-label">Operations</span>
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
                {label === 'Scan Dosimeter' && (
                  <span style={{
                    marginLeft: 'auto',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 99,
                    letterSpacing: '0.05em',
                  }}>
                    PRIMARY
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{
          padding: '1rem 0.75rem',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            style={{ justifyContent: 'flex-start', gap: '0.5rem' }}
          >
            <LogOut size={15} aria-hidden="true" />
            Sign Out
          </button>
          {displayName && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', paddingLeft: '0.25rem' }}>
              Manager — {displayName}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
