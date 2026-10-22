'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Shield, Activity, LogIn, UserPlus, ArrowRight, Sun, Moon } from 'lucide-react';

export function LandingNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Theme initialization
    const saved = localStorage.getItem('sentinel-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkVal = saved ? saved === 'dark' : prefersDark;
    setIsDark(darkVal);

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('sentinel-theme', next ? 'dark' : 'light');
  };

  const isSimulationPage = pathname === '/simulation';

  const navLinks = [
    { label: 'Home', href: isSimulationPage ? '/' : '#top' },
    { label: 'About the Project', href: isSimulationPage ? '/#about' : '#about' },
    { label: 'How It Works', href: isSimulationPage ? '/#how-it-works' : '#how-it-works' },
    { label: 'Key Features', href: isSimulationPage ? '/#features' : '#features' },
    { label: 'Simulations', href: '/simulation', highlight: true },
    { label: 'Applications', href: isSimulationPage ? '/#applications' : '#applications' },
  ];

  return (
    <header
      className={`landing-nav-wrapper transition-all duration-200 ${
        scrolled ? 'shadow-sm py-2' : 'py-3.5'
      }`}
    >
      <div className="landing-container flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 group text-decoration-none"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="w-9 h-9 rounded-lg bg-[var(--color-navy)] dark:bg-[var(--color-accent)] flex items-center justify-center text-white dark:text-slate-900 shadow-sm transition-transform group-hover:scale-105">
            <Shield size={20} className="stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-base md:text-lg text-[var(--color-text-primary)]">
                SENTINEL<span className="text-[var(--color-accent)] font-black">TRACK</span>
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                H₂S Sentinel
              </span>
            </div>
            <span className="text-[11px] font-medium text-[var(--color-text-muted)] tracking-wide">
              Cumulative Exposure Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-[var(--color-accent)] text-decoration-none ${
                link.highlight && isSimulationPage
                  ? 'text-[var(--color-accent)] font-semibold'
                  : 'text-[var(--color-text-secondary)]'
              } flex items-center gap-1.5`}
            >
              {link.highlight && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent)]"></span>
                </span>
              )}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Action Buttons & Theme Toggle */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            aria-label="Toggle colour theme"
          >
            {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            <span className="hidden xl:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Sign In */}
          <Link
            href="/login"
            className="btn btn-secondary text-xs md:text-sm px-3.5 py-2 font-medium flex items-center gap-1.5 text-decoration-none"
          >
            <LogIn size={15} />
            Sign In
          </Link>

          {/* Sign Up */}
          <Link
            href="/register"
            className="btn btn-primary text-xs md:text-sm px-3.5 py-2 font-medium flex items-center gap-1.5 text-decoration-none shadow-sm"
          >
            <UserPlus size={15} />
            Sign Up
          </Link>
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
            aria-label="Toggle colour theme"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] py-4 px-6 animate-fadeIn shadow-lg">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-sm font-medium transition-colors text-decoration-none flex items-center justify-between border-b border-[var(--color-border)]/50 ${
                  link.highlight && isSimulationPage
                    ? 'text-[var(--color-accent)] font-semibold'
                    : 'text-[var(--color-text-primary)]'
                }`}
              >
                <span>{link.label}</span>
                {link.highlight && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)]">
                    Explore
                  </span>
                )}
              </Link>
            ))}

            <div className="flex flex-col gap-2 pt-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-secondary w-full justify-center text-sm py-2.5 flex items-center gap-2 text-decoration-none"
              >
                <LogIn size={16} />
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary w-full justify-center text-sm py-2.5 flex items-center gap-2 text-decoration-none"
              >
                <UserPlus size={16} />
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
