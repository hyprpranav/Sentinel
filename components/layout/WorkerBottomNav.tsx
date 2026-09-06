'use client';
// components/layout/WorkerBottomNav.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, QrCode, Activity, UserCircle } from 'lucide-react';

const NAV = [
  { label: 'Home',       href: '/worker/home',       icon: Home },
  { label: 'My QR',     href: '/worker/my-qr',      icon: QrCode },
  { label: 'Exposure',  href: '/worker/my-exposure', icon: Activity },
  { label: 'Profile',   href: '/worker/profile',     icon: UserCircle },
];

export function WorkerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Worker navigation">
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link key={href} href={href} className={`bottom-nav-item ${active ? 'active' : ''}`}>
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
