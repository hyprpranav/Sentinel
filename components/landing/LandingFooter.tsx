'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowUpRight, Activity } from 'lucide-react';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-12 text-[var(--color-text-secondary)]">
      <div className="landing-container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-navy)] dark:bg-[var(--color-accent)] flex items-center justify-center text-white dark:text-slate-900 shadow-sm">
                <Shield size={18} className="stroke-[2.5]" />
              </div>
              <span className="font-extrabold tracking-wider text-lg text-[var(--color-text-primary)]">
                SENTINEL<span className="text-[var(--color-accent)] font-black">TRACK</span>
              </span>
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              H₂S Sentinel — A Color-Changing Wristband for Tracking Cumulative H₂S Gas Exposure
            </p>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed max-w-md">
              A passive, replaceable colorimetric sensing dosimeter paired with an ergonomic wristband holder, smartphone computer vision, and structured cloud records for industrial occupational safety.
            </p>
            <div className="mt-2 text-xs font-semibold text-[var(--color-accent)]">
              Developed by Team Sensation
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
              Project Navigation
            </h4>
            <Link href="/" className="text-xs hover:text-[var(--color-accent)] text-decoration-none transition-colors">
              Home
            </Link>
            <Link href="/#about" className="text-xs hover:text-[var(--color-accent)] text-decoration-none transition-colors">
              About the Project
            </Link>
            <Link href="/#how-it-works" className="text-xs hover:text-[var(--color-accent)] text-decoration-none transition-colors">
              How It Works
            </Link>
            <Link href="/#features" className="text-xs hover:text-[var(--color-accent)] text-decoration-none transition-colors">
              Key Features
            </Link>
            <Link href="/#applications" className="text-xs hover:text-[var(--color-accent)] text-decoration-none transition-colors">
              Benefits & Applications
            </Link>
          </div>

          {/* Simulations & Platform */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
              Platform & Models
            </h4>
            <Link
              href="/simulation"
              className="text-xs text-[var(--color-accent)] font-semibold hover:underline flex items-center gap-1 text-decoration-none"
            >
              COMSOL Simulations
              <ArrowUpRight size={13} />
            </Link>
            <Link href="/login" className="text-xs hover:text-[var(--color-accent)] text-decoration-none transition-colors">
              Sign In (Existing Platform)
            </Link>
            <Link href="/register" className="text-xs hover:text-[var(--color-accent)] text-decoration-none transition-colors">
              Register Worker / Manager
            </Link>
            <Link href="/forgot-password" className="text-xs hover:text-[var(--color-accent)] text-decoration-none transition-colors">
              Password Assistance
            </Link>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 border-t border-[var(--color-border)]/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-muted)]">
          <p className="max-w-2xl text-[11px] leading-relaxed">
            <strong>Occupational Hygiene Notice:</strong> SENTINELTRACK provides a passive, qualitative/semi-quantitative cumulative colorimetric indicator designed to complement certified personal electronic gas monitors and established occupational safety procedures. It does not measure instantaneous concentration or replace active personal gas alarms.
          </p>
          <div className="whitespace-nowrap text-[11px]">
            &copy; {currentYear} SENTINELTRACK — Team Sensation. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
