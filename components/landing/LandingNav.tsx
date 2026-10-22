'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Shield, Activity, LogIn, UserPlus, Sun, Moon } from 'lucide-react';

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
      setScrolled(window.scrollY > 15);
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
        scrolled ? 'shadow-md py-2.5' : 'py-3'
      }`}
    >
      <div className="landing-nav-container">
        {/* Left Side: Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 shrink-0 mr-2 xl:mr-6 text-decoration-none group"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="w-9 h-9 rounded-lg bg-[var(--color-navy)] dark:bg-[var(--color-accent)] flex items-center justify-center text-white dark:text-slate-900 shadow-sm transition-transform group-hover:scale-105">
            <Shield size={20} className="stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-base md:text-lg text-[var(--color-text-primary)] whitespace-nowrap">
                SENTINEL<span className="text-[var(--color-accent)] font-black">TRACK</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] border border-[var(--color-accent)]/25 whitespace-nowrap">
                H₂S Sentinel
              </span>
            </div>
            <span className="hidden sm:block text-[11px] font-medium text-[var(--color-text-muted)] tracking-wide">
              Cumulative Exposure Intelligence
            </span>
          </div>
        </Link>

        {/* Center: Navigation Links (Never wrap text) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-3 flex-1 justify-center max-w-3xl">
          {navLinks.map((link) => {
            if (link.highlight) {
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-xs xl:text-sm font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 text-decoration-none ${
                    isSimulationPage
                      ? 'bg-[var(--color-accent)] text-white shadow-xs'
                      : 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-subtle)]/90'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent)]"></span>
                  </span>
                  <span>{link.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs xl:text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap text-decoration-none"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Theme Toggle, Sign In, Sign Up */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0 ml-2 xl:ml-6">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-all flex items-center justify-center cursor-pointer shadow-xs"
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            aria-label="Toggle colour theme"
          >
            {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>

          {/* Sign In Button */}
          <Link
            href="/login"
            className="h-9 px-3.5 xl:px-4 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] hover:border-[var(--color-text-muted)] text-xs xl:text-sm font-semibold transition-all flex items-center gap-1.5 text-decoration-none whitespace-nowrap shadow-xs"
          >
            <LogIn size={15} className="text-[var(--color-accent)]" />
            <span>Sign In</span>
          </Link>

          {/* Sign Up Button */}
          <Link
            href="/register"
            className="h-9 px-3.5 xl:px-4 rounded-lg bg-[var(--color-navy)] text-[var(--color-navy-content)] dark:bg-[var(--color-accent)] dark:text-slate-900 hover:opacity-90 text-xs xl:text-sm font-semibold transition-all flex items-center gap-1.5 text-decoration-none whitespace-nowrap shadow-sm"
          >
            <UserPlus size={15} />
            <span>Sign Up</span>
          </Link>
        </div>

        {/* Mobile Header Controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] flex items-center justify-center"
            aria-label="Toggle colour theme"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] py-4 px-6 animate-fadeIn shadow-lg">
          <div className="flex flex-col gap-2.5">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-sm font-medium transition-colors text-decoration-none flex items-center justify-between border-b border-[var(--color-border)]/40 ${
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

            <div className="grid grid-cols-2 gap-3 pt-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-primary)] flex items-center justify-center gap-2 text-sm font-semibold text-decoration-none shadow-xs"
              >
                <LogIn size={15} />
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="h-10 rounded-lg bg-[var(--color-navy)] text-[var(--color-navy-content)] dark:bg-[var(--color-accent)] dark:text-slate-900 flex items-center justify-center gap-2 text-sm font-semibold text-decoration-none shadow-sm"
              >
                <UserPlus size={15} />
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
