'use client';
// components/layout/AdminSidebar.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCheck, ClipboardList,
  BarChart2, Shield, Settings, FileText,
  Sliders, ScanLine,
} from 'lucide-react';
import { SentinelLogo } from './SentinelLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { logoutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

const NAV = [
  { label: 'Dashboard',        href: '/admin/dashboard',   icon: LayoutDashboard },
  { label: 'Managers',         href: '/admin/managers',    icon: UserCheck },
  { label: 'Workers',          href: '/admin/workers',     icon: Users },
  { label: 'Requests',         href: '/admin/requests',    icon: ClipboardList },
  { label: 'Scan Worker',      href: '/admin/scan',        icon: ScanLine },
  { label: 'Exposure Analytics', href: '/admin/analytics', icon: BarChart2 },
  { label: 'Dosimeters',       href: '/admin/dosimeters',  icon: Shield },
  { label: 'Calibration',      href: '/admin/calibration', icon: Sliders },
  { label: 'Audit Logs',       href: '/admin/audit-logs',  icon: FileText },
  { label: 'Settings',         href: '/admin/settings',    icon: Settings },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <SentinelLogo size="sm" />
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          <span className="nav-section-label">Administration</span>
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
          <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', paddingLeft: '0.25rem' }}>
            Master Admin
          </p>
        </div>
      </aside>
    </>
  );
}
