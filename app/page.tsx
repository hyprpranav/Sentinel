'use client';

import React from 'react';
import Link from 'next/link';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import {
  Shield,
  Activity,
  Layers,
  ArrowRight,
  Eye,
  Smartphone,
  QrCode,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Database,
  BarChart3,
  Factory,
  Droplets,
  HardHat,
  ChevronRight,
  Maximize2,
  Lock,
  Wind
} from 'lucide-react';

export default function LandingPage() {
  const simulationPreviews = [
    {
      id: 'sim-1',
      title: 'Surface Concentration Distribution — 36000 s',
      description: 'Surface visualization of the model\'s CCuS dependent variable at 36000 s.',
      tag: 'Time = 36000 s',
      image: '/simulations/simulation-surface-36000.jpeg',
    },
    {
      id: 'sim-2',
      title: 'Molar Concentration Distribution',
      description: 'Visual representation of c3 molar concentration in the sensing-badge model at t = 0 s.',
      tag: 'c3 (mol/m³)',
      image: '/simulations/simulation-molar-concentration.jpeg',
    },
    {
      id: 'sim-3',
      title: 'Streamline and Flux Visualization',
      description: 'Total flux streamlines with colour mapped to c3 molar concentration.',
      tag: 'Total Flux',
      image: '/simulations/simulation-streamline-flux.jpeg',
    },
    {
      id: 'sim-4',
      title: 'Initial Surface Concentration Distribution',
      description: 'Baseline CCuS dependent variable at initial simulation time (t = 0 s).',
      tag: 'Time = 0 s',
      image: '/simulations/simulation-initial-surface.jpeg',
    },
  ];

  return (
    <div id="top" className="min-h-screen bg-[var(--color-bg)] flex flex-col text-[var(--color-text-primary)]">
      {/* Sticky Navigation */}
      <LandingNav />

      {/* ─────────────────────────────────────────────
          1. HERO SECTION
          ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-[var(--color-border)]">
        {/* Ambient background glow */}
        <div className="landing-hero-glow" />

        <div className="landing-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-left">
              {/* Project Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] border border-[var(--color-accent)]/20 w-fit">
                <span className="flex h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
                SENTINELTRACK — Project Platform
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.85rem] font-extrabold tracking-tight leading-[1.15] text-[var(--color-text-primary)]">
                H₂S Sentinel — A Color-Changing Wristband for Tracking Cumulative Gas Exposure
              </h1>

              {/* Supporting Text */}
              <p className="text-base md:text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl">
                A passive, replaceable colorimetric wristband designed to indicate cumulative hydrogen sulphide exposure, supported by smartphone-based image analysis and worker-specific digital exposure records.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#about"
                  className="btn btn-primary text-sm md:text-base px-6 py-3 font-semibold flex items-center gap-2 shadow-sm text-decoration-none"
                >
                  Explore the Solution
                  <ArrowRight size={17} />
                </a>

                <Link
                  href="/simulation"
                  className="btn btn-secondary text-sm md:text-base px-5 py-3 font-semibold flex items-center gap-2 text-decoration-none border border-[var(--color-border)]"
                >
                  <Activity size={17} className="text-[var(--color-accent)]" />
                  View Simulations
                </Link>

                <Link
                  href="/login"
                  className="btn btn-ghost text-sm md:text-base px-4 py-3 font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-decoration-none"
                >
                  Sign In
                </Link>
              </div>

              {/* Metric Highlights Pill Row */}
              <div className="pt-6 border-t border-[var(--color-border)]/70 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-[var(--color-text-muted)] block uppercase font-bold tracking-wider">
                    Sensing Strip
                  </span>
                  <span className="font-bold text-sm md:text-base text-[var(--color-text-primary)]">
                    100% Passive
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)] block uppercase font-bold tracking-wider">
                    Indication
                  </span>
                  <span className="font-bold text-sm md:text-base text-[var(--color-text-primary)]">
                    3-Zone Color
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)] block uppercase font-bold tracking-wider">
                    Worker Binding
                  </span>
                  <span className="font-bold text-sm md:text-base text-[var(--color-text-primary)]">
                    QR Identity
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)] block uppercase font-bold tracking-wider">
                    Records
                  </span>
                  <span className="font-bold text-sm md:text-base text-[var(--color-text-primary)]">
                    Cloud Audited
                  </span>
                </div>
              </div>
            </div>

            {/* Right Visual Column — Realistic Wearable + Smartphone Visual */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden group">
                {/* Visual Image */}
                <div className="relative bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/sentinel-hero-wristband.jpg"
                    alt="SENTINELTRACK wearable colorimetric wristband and smartphone digital monitoring application"
                    className="w-full h-auto object-cover max-h-[460px] transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  {/* Subtle Gradient vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Visual Overlay Badges */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white text-[10px] font-mono font-semibold flex items-center gap-1.5 shadow-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Optical Scan System
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white text-xs">
                    <div className="font-bold text-sm drop-shadow-sm flex items-center gap-2">
                      <Shield size={14} className="text-[var(--color-accent)]" />
                      SENTINELTRACK Wearable Architecture
                    </div>
                    <div className="text-[11px] text-slate-300 drop-shadow-sm">
                      Silicone band housing • 3-zone colorimetric badge • Mobile CV analysis
                    </div>
                  </div>
                </div>

                {/* Sub-caption */}
                <div className="p-3 bg-[var(--color-surface-2)] text-[11px] text-[var(--color-text-muted)] border-t border-[var(--color-border)] leading-relaxed">
                  <strong>Concept Demonstration:</strong> Illustrates the reusable wristband holder fitted with a paper-based chemical dosimeter strip and corresponding smartphone optical scanner.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          2. ABOUT THE PROJECT
          ───────────────────────────────────────────── */}
      <section id="about" className="py-20 md:py-28 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="landing-container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-1 rounded-full border border-[var(--color-accent)]/20">
              Project Overview
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-3 mb-4 text-[var(--color-text-primary)]">
              About the SENTINELTRACK Project
            </h2>
            <p className="text-sm md:text-base text-[var(--color-text-secondary)] leading-relaxed">
              SENTINELTRACK combines a passive, paper-based colorimetric H₂S sensing badge with a reusable wristband and a digital monitoring platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-12">
            {/* Core Mechanism Card */}
            <div className="feature-interactive-card flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-4">
                  <Droplets size={22} />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3 text-[var(--color-text-primary)]">
                  Passive Colorimetric Indication
                </h3>
                <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
                  The sensing strip is designed to undergo progressive colour changes during H₂S exposure. The strip is divided into three indication zones representing low, medium, and high exposure responses.
                </p>
                <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  A smartphone-based image analysis system is intended to interpret the colour response and associate the result with a worker&apos;s digital exposure record. The sensing badge is disposable, while the wristband holder is reusable.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[11px]">
                  Zone 1: Low
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold text-[11px]">
                  Zone 2: Medium
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-semibold text-[11px]">
                  Zone 3: High
                </span>
              </div>
            </div>

            {/* Crucial Scientific Distinction Card */}
            <div className="feature-interactive-card border-l-4 border-l-[var(--color-accent)] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-[var(--color-accent)] flex items-center justify-center mb-4">
                  <Activity size={22} />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3 text-[var(--color-text-primary)]">
                  Cumulative Exposure vs. Instantaneous Alarms
                </h3>
                <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
                  Clearly distinguish the proposed cumulative exposure indication from conventional electronic gas detectors that provide readings at a particular time.
                </p>
                <div className="p-3.5 rounded-lg bg-[var(--color-surface-2)] text-xs text-[var(--color-text-secondary)] space-y-2 border border-[var(--color-border)]">
                  <div className="font-semibold text-[var(--color-text-primary)]">
                    Technical Scope & Clarity:
                  </div>
                  <div>
                    • <strong>Electronic detectors:</strong> Measure instantaneous concentration (ppm) at a precise moment in time to trigger immediate evacuation alarms.
                  </div>
                  <div>
                    • <strong>SENTINELTRACK passive strip:</strong> Measures cumulative chemical uptake over an 8-hour shift. It does not claim to measure exact instantaneous gas concentration or reconstruct a complete time-resolved exposure history.
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--color-border)] text-xs font-semibold text-[var(--color-accent)] flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                Complementary occupational hygiene information layer
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          3. PROBLEM STATEMENT
          ───────────────────────────────────────────── */}
      <section className="py-20 md:py-28 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="landing-container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-900/50">
              The Occupational Challenge
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-3 mb-4 text-[var(--color-text-primary)]">
              Why SENTINELTRACK Is Needed
            </h2>
            <p className="text-sm md:text-base text-[var(--color-text-secondary)] leading-relaxed">
              Hydrogen sulphide exposure presents severe occupational health risks that demand multi-layered monitoring strategies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Problem 1 */}
            <div className="feature-interactive-card">
              <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-3.5">
                <AlertTriangle size={18} />
              </div>
              <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                Toxic Occupational Hazard
              </h4>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                H₂S is a toxic gas that presents occupational risks in industrial environments such as refineries, chemical processing units, wastewater treatment facilities, and mining sites.
              </p>
            </div>

            {/* Problem 2 */}
            <div className="feature-interactive-card">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3.5">
                <Wind size={18} />
              </div>
              <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                Variable Worksite Conditions
              </h4>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Exposure conditions can vary widely with the worksite, weather patterns, micro-environments, and specific operator tasks throughout a work shift.
              </p>
            </div>

            {/* Problem 3 */}
            <div className="feature-interactive-card">
              <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3.5">
                <Cpu size={18} />
              </div>
              <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                Electronic Detector Role
              </h4>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Conventional electronic detectors are important for detecting hazardous gas conditions and providing acute alarms, but are battery-dependent and cost-prohibitive for large-scale disposable wear.
              </p>
            </div>

            {/* Problem 4 */}
            <div className="feature-interactive-card">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3.5">
                <Shield size={18} />
              </div>
              <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                Complementary Passive Need
              </h4>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                A complementary, passive approach to indicating cumulative exposure could provide additional worker-specific monitoring information without adding battery weight or electronic failure modes.
              </p>
            </div>

            {/* Problem 5 */}
            <div className="feature-interactive-card md:col-span-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3.5">
                <Database size={18} />
              </div>
              <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                Manual Tracking Deficiencies
              </h4>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Manual tracking of exposure records can be difficult without a structured digital system. Traditional physical logs often lead to unrecorded shifts, missing audit trails, and fragmented occupational health records for contractor workforces.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          4. PROPOSED SOLUTION
          ───────────────────────────────────────────── */}
      <section className="py-20 md:py-28 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="landing-container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-1 rounded-full border border-[var(--color-accent)]/20">
              System Architecture
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-3 mb-4 text-[var(--color-text-primary)]">
              The Proposed SENTINELTRACK Solution
            </h2>
            <p className="text-sm md:text-base text-[var(--color-text-secondary)] leading-relaxed">
              An integrated, 8-component occupational hygiene ecosystem bridging physical chemistry, wearable ergonomics, computer vision, and cloud intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Component 1 */}
            <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                  Component 01
                </span>
                <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                  Reusable Wristband Holder
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Ergonomic, chemical-resistant flexible wristband shell designed for long-term daily wear with easy badge slotting.
                </p>
              </div>
            </div>

            {/* Component 2 */}
            <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                  Component 02
                </span>
                <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                  Replaceable Sensing Badge
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Disposable paper-based colorimetric substrate impregnated with reactive colorimetric reagents for passive sampling.
                </p>
              </div>
            </div>

            {/* Component 3 */}
            <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                  Component 03
                </span>
                <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                  Three Exposure Zones
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Three distinct indication zones engineered to represent low, medium, and high cumulative gas response thresholds.
                </p>
              </div>
            </div>

            {/* Component 4 */}
            <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                  Component 04 (Proposed Concept)
                </span>
                <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                  Proposed Secondary Odour Alert
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Proposed secondary odour-based warning mechanism for the high-exposure zone. <em>(Proposed supplementary warning concept; not a validated safety alarm or replacement for certified detection equipment.)</em>
                </p>
              </div>
            </div>

            {/* Component 5 */}
            <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                  Component 05
                </span>
                <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                  QR-Based Worker ID
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Unique optical QR code printed on each badge linking the physical dosimeter directly to the authorized worker.
                </p>
              </div>
            </div>

            {/* Component 6 */}
            <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                  Component 06
                </span>
                <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                  Smartphone Image Analysis
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Client-side computer vision algorithm analyzing RGB/CIE color shift against calibrated reference standards.
                </p>
              </div>
            </div>

            {/* Component 7 */}
            <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                  Component 07
                </span>
                <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                  Digital Exposure Records
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Worker-specific exposure records stored in cloud database, with timestamped scans, expiry, and dose estimations.
                </p>
              </div>
            </div>

            {/* Component 8 */}
            <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                  Component 08
                </span>
                <h4 className="font-bold text-base mb-2 text-[var(--color-text-primary)]">
                  Role-Based Dashboards
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Multi-tenant role portals for Workers, EHS Managers, and Master Administrators with granular access control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          5. HOW IT WORKS (7 STAGES)
          ───────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 md:py-28 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="landing-container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-1 rounded-full border border-[var(--color-accent)]/20">
              Workflow
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-3 mb-4 text-[var(--color-text-primary)]">
              How SENTINELTRACK Works
            </h2>
            <p className="text-sm md:text-base text-[var(--color-text-secondary)] leading-relaxed">
              A clean 7-stage process bridging physical wear, passive chemical reaction, optical capture, and cloud traceability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Stage 1 */}
            <div className="feature-interactive-card relative">
              <div className="w-8 h-8 rounded-full bg-[var(--color-navy)] dark:bg-[var(--color-accent)] text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center mb-3 shadow-xs">
                1
              </div>
              <h4 className="font-bold text-base mb-1 text-[var(--color-text-primary)]">
                Stage 1 — Wear
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                The worker wears the reusable wristband containing the sensing badge during their industrial shift.
              </p>
            </div>

            {/* Stage 2 */}
            <div className="feature-interactive-card relative">
              <div className="w-8 h-8 rounded-full bg-[var(--color-navy)] dark:bg-[var(--color-accent)] text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center mb-3 shadow-xs">
                2
              </div>
              <h4 className="font-bold text-base mb-1 text-[var(--color-text-primary)]">
                Stage 2 — Exposure
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                The sensing material interacts with airborne H₂S molecules through the badge aperture during the monitoring period.
              </p>
            </div>

            {/* Stage 3 */}
            <div className="feature-interactive-card relative">
              <div className="w-8 h-8 rounded-full bg-[var(--color-navy)] dark:bg-[var(--color-accent)] text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center mb-3 shadow-xs">
                3
              </div>
              <h4 className="font-bold text-base mb-1 text-[var(--color-text-primary)]">
                Stage 3 — Colour Response
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                The sensing zones are designed to change colour according to their cumulative response over the work duration.
              </p>
            </div>

            {/* Stage 4 */}
            <div className="feature-interactive-card relative">
              <div className="w-8 h-8 rounded-full bg-[var(--color-navy)] dark:bg-[var(--color-accent)] text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center mb-3 shadow-xs">
                4
              </div>
              <h4 className="font-bold text-base mb-1 text-[var(--color-text-primary)]">
                Stage 4 — Smartphone Scan
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                An authorized user captures the badge image through the existing monitoring application using camera guidance.
              </p>
            </div>

            {/* Stage 5 */}
            <div className="feature-interactive-card relative">
              <div className="w-8 h-8 rounded-full bg-[var(--color-navy)] dark:bg-[var(--color-accent)] text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center mb-3 shadow-xs">
                5
              </div>
              <h4 className="font-bold text-base mb-1 text-[var(--color-text-primary)]">
                Stage 5 — Image Analysis
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                The system processes the captured image to evaluate the sensing-strip colour response and compute colorimetric shift.
              </p>
            </div>

            {/* Stage 6 */}
            <div className="feature-interactive-card relative border-sky-300 dark:border-sky-800">
              <div className="w-8 h-8 rounded-full bg-[var(--color-navy)] dark:bg-[var(--color-accent)] text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center mb-3 shadow-xs">
                6
              </div>
              <h4 className="font-bold text-base mb-1 text-[var(--color-text-primary)]">
                Stage 6 — Worker Identification
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                The QR code identifies the associated worker within the system. <em>(The QR code identifies the worker; the sensing-strip image is used for colour analysis.)</em>
              </p>
            </div>

            {/* Stage 7 */}
            <div className="feature-interactive-card relative md:col-span-2">
              <div className="w-8 h-8 rounded-full bg-[var(--color-navy)] dark:bg-[var(--color-accent)] text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center mb-3 shadow-xs">
                7
              </div>
              <h4 className="font-bold text-base mb-1 text-[var(--color-text-primary)]">
                Stage 7 — Digital Record
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                The system associates the scan with the relevant worker record and displays the available exposure estimate, badge expiry information, and scan details across authorized dashboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          6. KEY FEATURES (10 CARDS)
          ───────────────────────────────────────────── */}
      <section id="features" className="py-20 md:py-28 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="landing-container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-1 rounded-full border border-[var(--color-accent)]/20">
              Platform Capabilities
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-3 mb-4 text-[var(--color-text-primary)]">
              Key Features
            </h2>
            <p className="text-sm md:text-base text-[var(--color-text-secondary)] leading-relaxed">
              Designed for industrial reliability, economic scalability, and clear occupational safety governance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {/* Feature 1 */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-3">
                <Cpu size={16} />
              </div>
              <h4 className="font-bold text-sm mb-1.5 text-[var(--color-text-primary)]">
                Passive Sensing Concept
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Operates without electrical power, batteries, or wearable wiring.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-3">
                <RefreshCw size={16} />
              </div>
              <h4 className="font-bold text-sm mb-1.5 text-[var(--color-text-primary)]">
                Replaceable Sensing Badge
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Economical disposable paper strips minimize operational costs.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-3">
                <Shield size={16} />
              </div>
              <h4 className="font-bold text-sm mb-1.5 text-[var(--color-text-primary)]">
                Reusable Wristband Holder
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Durable, sanitizable silicone shell protects badge while on duty.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-3">
                <Droplets size={16} />
              </div>
              <h4 className="font-bold text-sm mb-1.5 text-[var(--color-text-primary)]">
                Three-Zone Colour Indication
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Graded visual response indicating low, medium, and elevated exposure.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-3">
                <Wind size={16} />
              </div>
              <h4 className="font-bold text-sm mb-1.5 text-[var(--color-text-primary)]">
                Proposed Secondary Odour Alert
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Proposed conceptual sensory warning for high-exposure indication.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-3">
                <Smartphone size={16} />
              </div>
              <h4 className="font-bold text-sm mb-1.5 text-[var(--color-text-primary)]">
                Smartphone-Based Image Analysis
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Optical color difference calibration via standard mobile browser camera.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-3">
                <QrCode size={16} />
              </div>
              <h4 className="font-bold text-sm mb-1.5 text-[var(--color-text-primary)]">
                QR-Based Worker ID
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Optical worker binding ensures accurate association without manual entry.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-3">
                <Clock size={16} />
              </div>
              <h4 className="font-bold text-sm mb-1.5 text-[var(--color-text-primary)]">
                Digital Exposure History
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Centralized shift records enable long-term epidemiological tracking.
              </p>
            </div>

            {/* Feature 9 */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-3">
                <Lock size={16} />
              </div>
              <h4 className="font-bold text-sm mb-1.5 text-[var(--color-text-primary)]">
                Role-Based Access
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Tailored views for Workers, Shift Managers, and Master Administrators.
              </p>
            </div>

            {/* Feature 10 */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] flex items-center justify-center mb-3">
                <Layers size={16} />
              </div>
              <h4 className="font-bold text-sm mb-1.5 text-[var(--color-text-primary)]">
                Simulation Design Exploration
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Computational finite element modeling of mass transport in COMSOL.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          7. BENEFITS AND APPLICATIONS
          ───────────────────────────────────────────── */}
      <section id="applications" className="py-20 md:py-28 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="landing-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Col — Benefits */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-1 rounded-full border border-[var(--color-accent)]/20">
                  Intended Value
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-3 mb-4 text-[var(--color-text-primary)]">
                  Benefits of the Proposed System
                </h2>
                <p className="text-sm md:text-base text-[var(--color-text-secondary)] leading-relaxed">
                  SENTINELTRACK bridges critical gaps in industrial worker coverage with practical, low-burden ergonomics.
                </p>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs md:text-sm">
                    <strong className="text-[var(--color-text-primary)] block font-semibold">
                      Zero Operating Electricity
                    </strong>
                    No battery charging, spark hazards, or electrical maintenance required by the passive sensing strip itself.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs md:text-sm">
                    <strong className="text-[var(--color-text-primary)] block font-semibold">
                      Reduced Equipment Waste
                    </strong>
                    The reusable silicone holder reduces the need to replace the entire wearable assembly after each shift.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs md:text-sm">
                    <strong className="text-[var(--color-text-primary)] block font-semibold">
                      High-Frequency Monitoring Cycles
                    </strong>
                    A replaceable sensing badge supports repeated daily monitoring cycles across high-headcount operations.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs md:text-sm">
                    <strong className="text-[var(--color-text-primary)] block font-semibold">
                      Worker-Specific Traceability
                    </strong>
                    Centralized digital records improve individual exposure logging and occupational health compliance.
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col — Target Environments */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <div className="p-6 md:p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg md:text-xl font-bold mb-3 text-[var(--color-text-primary)]">
                  Target Industrial Environments
                </h3>
                <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6">
                  The proposed design is intended for exploration in occupational settings where hydrogen sulphide poses chronic or episodic risks:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                  <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center gap-3">
                    <Factory size={18} className="text-[var(--color-accent)]" />
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Oil & Gas Refineries
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center gap-3">
                    <Droplets size={18} className="text-[var(--color-accent)]" />
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Chemical Processing
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center gap-3">
                    <HardHat size={18} className="text-[var(--color-accent)]" />
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Mining Operations
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center gap-3">
                    <Wind size={18} className="text-[var(--color-accent)]" />
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Wastewater & Utilities
                    </span>
                  </div>
                </div>

                {/* Honest Disclaimer */}
                <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] leading-relaxed">
                  <strong>Compliance Note:</strong> The proposed system does not replace certified gas alarms, guarantee worker safety, or claim unverified performance or accuracy figures. It is designed to complement existing gas-detection procedures and site protocols.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          8. SIMULATION PREVIEW SECTION
          ───────────────────────────────────────────── */}
      <section className="py-20 md:py-28 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="landing-container">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-1 rounded-full border border-[var(--color-accent)]/20">
                Computational Analysis
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-3 mb-2 text-[var(--color-text-primary)]">
                SIMULATION & DESIGN ANALYSIS
              </h2>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Explore the simulation visualizations associated with the proposed sensing-badge design, including surface concentration plots, molar concentration distribution, and streamline-based flux visualization.
              </p>
            </div>

            <Link
              href="/simulation"
              className="btn btn-primary text-xs md:text-sm px-5 py-2.5 flex items-center gap-2 whitespace-nowrap text-decoration-none shadow-sm"
            >
              Explore All Simulations
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* 4 Compact Preview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {simulationPreviews.map((sim, index) => (
              <div
                key={sim.id}
                className="simulation-interactive-card border border-[var(--color-border)] bg-[var(--color-bg)] rounded-xl overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="relative bg-slate-950 flex items-center justify-center p-2 min-h-[180px] overflow-hidden">
                    <img
                      src={sim.image}
                      alt={sim.title}
                      className="w-full h-auto max-h-[170px] object-contain transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono font-medium backdrop-blur-xs">
                      Sim 0{index + 1}
                    </div>
                  </div>

                  <div className="p-4">
                    <span className="text-[10px] font-mono font-medium text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-2 py-0.5 rounded inline-block mb-1.5 border border-[var(--color-accent)]/20">
                      {sim.tag}
                    </span>
                    <h3 className="font-bold text-sm text-[var(--color-text-primary)] mb-1.5 line-clamp-2">
                      {sim.title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                      {sim.description}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <Link
                    href={`/simulation#${sim.id}`}
                    className="btn btn-secondary w-full justify-center text-xs py-2 flex items-center gap-1.5 text-decoration-none"
                  >
                    <Eye size={13} />
                    View Simulation
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/simulation"
              className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-[var(--color-accent)] hover:underline"
            >
              <span>Review complete scientific captions, coordinates, and high-resolution plots on the dedicated simulation page</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          9. CALL TO ACTION
          ───────────────────────────────────────────── */}
      <section className="py-20 md:py-24 bg-[var(--color-bg)] border-b border-[var(--color-border)] relative overflow-hidden">
        <div className="landing-container text-center max-w-3xl mx-auto relative z-10">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-navy)] dark:bg-[var(--color-accent)] text-white dark:text-slate-900 flex items-center justify-center mx-auto mb-6 shadow-md">
            <Shield size={24} className="stroke-[2.5]" />
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-[var(--color-text-primary)]">
            Explore Smarter Cumulative Exposure Monitoring
          </h2>

          <p className="text-sm md:text-base text-[var(--color-text-secondary)] leading-relaxed mb-8 max-w-xl mx-auto">
            Discover the proposed combination of passive colorimetric sensing, wearable design, image analysis, and digital worker records.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/simulation"
              className="btn btn-primary text-sm md:text-base px-6 py-3 font-semibold flex items-center gap-2 text-decoration-none shadow-sm"
            >
              <Activity size={17} />
              Explore Simulations
            </Link>

            <Link
              href="/login"
              className="btn btn-secondary text-sm md:text-base px-6 py-3 font-semibold flex items-center gap-2 text-decoration-none border border-[var(--color-border)]"
            >
              Sign In to Platform
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          10. FOOTER
          ───────────────────────────────────────────── */}
      <LandingFooter />
    </div>
  );
}
