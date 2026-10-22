'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import {
  ArrowLeft,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Clock,
  Compass,
  FileText,
  ShieldCheck,
  Download
} from 'lucide-react';

interface SimulationItem {
  id: string;
  simNumber: number;
  title: string;
  imageHeading: string;
  filename: string;
  imageSrc: string;
  timestamp: string;
  variable: string;
  units: string;
  description: string;
  technicalNotes: string[];
}

const SIMULATIONS: SimulationItem[] = [
  {
    id: 'sim-1',
    simNumber: 1,
    title: 'Surface Concentration Distribution — 36000 s',
    imageHeading: 'Time = 36000 s; Surface: Dependent variable CCuS (1); Surface: 1 (1)',
    filename: 'simulation-surface-36000.jpeg',
    imageSrc: '/simulations/simulation-surface-36000.jpeg',
    timestamp: '36000 s (10 hours simulated)',
    variable: 'Dependent variable CCuS (1)',
    units: 'Normalized Concentration Fraction [0 – 0.5]',
    description:
      'Surface visualization of the model\'s CCuS dependent variable at the displayed simulation time of 36000 seconds.',
    technicalNotes: [
      'Preserves the original COMSOL Multiphysics color scale spanning 0 (dark red/brown) to 0.5 (light yellow/cream).',
      'Demonstrates the simulated progressive accumulation of copper sulphide (CCuS) reaction product across the exposed badge surface area.',
      'Displays the physical wristband geometry including the worker identification slot and active colorimetric sensing window.'
    ]
  },
  {
    id: 'sim-2',
    simNumber: 2,
    title: 'Molar Concentration Distribution',
    imageHeading: 'Time = 0 s; Molar concentration, c3 (mol/m³)',
    filename: 'simulation-molar-concentration.jpeg',
    imageSrc: '/simulations/simulation-molar-concentration.jpeg',
    timestamp: '0 s (Initial exposure state)',
    variable: 'Molar concentration, c3',
    units: 'mol/m³ [0 – 4.0 × 10⁻⁵]',
    description:
      'Visual representation of the c3 molar concentration distribution in the sensing-badge model at the displayed initial time.',
    technicalNotes: [
      'Preserves the original concentration units and calibrated color legend (0 to 4 × 10⁻⁵ mol/m³).',
      'Shows the initial gaseous H₂S concentration gradient entering the badge aperture along the boundary profile.',
      'Maintains accurate millimeter-scale coordinate axes (×10⁻³ m) along the spatial geometry of the badge holder.'
    ]
  },
  {
    id: 'sim-3',
    simNumber: 3,
    title: 'Streamline and Flux Visualization',
    imageHeading: 'Time = 0 s; Streamline: Total flux; Streamline Color: Molar concentration, c3 (mol/m³)',
    filename: 'simulation-streamline-flux.jpeg',
    imageSrc: '/simulations/simulation-streamline-flux.jpeg',
    timestamp: '0 s (Initial flux profile)',
    variable: 'Total Flux Streamlines with c3 Color Mapping',
    units: 'mol/m³ [0 – 4.0 × 10⁻⁵]',
    description:
      'Streamline visualization of total flux, with streamline colour representing the c3 molar concentration in the displayed model.',
    technicalNotes: [
      'Preserves original streamline trajectories representing the directional convective and diffusive mass transfer of H₂S.',
      'Streamline color gradient is mapped directly to the local c3 molar concentration in the badge internal cavity.',
      'Displays full 3D boundary geometry and internal path lines within the badge containment structure.'
    ]
  },
  {
    id: 'sim-4',
    simNumber: 4,
    title: 'Initial Surface Concentration Distribution',
    imageHeading: 'Time = 0 s; Surface: Dependent variable CCuS (1); Surface: 1 (1)',
    filename: 'simulation-initial-surface.jpeg',
    imageSrc: '/simulations/simulation-initial-surface.jpeg',
    timestamp: '0 s (Unexposed baseline)',
    variable: 'Dependent variable CCuS (1)',
    units: 'Normalized Concentration Fraction [0 – 0.5]',
    description:
      'Surface visualization of the model\'s CCuS dependent variable at the displayed initial simulation time.',
    technicalNotes: [
      'Preserves baseline zero-reaction state (CCuS = 0, represented in dark maroon/red) prior to airborne gas exposure.',
      'Provides the baseline spatial reference against which cumulative 36000 s progressive saturation is compared.',
      'Maintains exact model coordinate system (x, y, z in ×10⁻³ m) across all boundary facets.'
    ]
  }
];

export default function SimulationPage() {
  const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeModalIndex === null) return;
      if (e.key === 'Escape') setActiveModalIndex(null);
      if (e.key === 'ArrowRight') {
        setActiveModalIndex((prev) => (prev !== null ? (prev + 1) % SIMULATIONS.length : 0));
      }
      if (e.key === 'ArrowLeft') {
        setActiveModalIndex((prev) => (prev !== null ? (prev - 1 + SIMULATIONS.length) % SIMULATIONS.length : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalIndex]);

  const activeSim = activeModalIndex !== null ? SIMULATIONS[activeModalIndex] : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col text-[var(--color-text-primary)]">
      {/* Header and Navigation */}
      <LandingNav />

      {/* Main Content */}
      <main className="flex-1 py-10 md:py-16">
        <div className="landing-container">
          {/* Back to Home Link */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-dark)] transition-colors text-decoration-none group"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-12 border-b border-[var(--color-border)] pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] dark:text-[var(--color-accent)] border border-[var(--color-accent)]/20 mb-3">
              <Layers size={14} />
              COMSOL Multiphysics Finite Element Exploration
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3 text-[var(--color-text-primary)]">
              SENTINELTRACK — Simulation & Design Analysis
            </h1>
            <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-3xl leading-relaxed">
              Visual exploration of the proposed H₂S sensing-badge design. These finite element transport visualizations depict diffusion, molar flux, and surface reaction modeling across the badge geometry.
            </p>
          </div>

          {/* Scientific Disclaimer Banner */}
          <div className="mb-10 p-4 md:p-5 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-950/20 text-[var(--color-text-secondary)] flex items-start gap-3.5">
            <Info size={20} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm leading-relaxed">
              <strong className="text-[var(--color-text-primary)] block font-semibold mb-0.5">
                Scientific Context & Fidelity Note:
              </strong>
              These simulation visualizations illustrate computational transport modeling (diffusion, mass transfer, and reaction product accumulation) for the proposed badge chamber geometry in COMSOL Multiphysics. All original scientific titles, legends, colour bars, coordinates, and units have been meticulously preserved without alteration or cropping. These plots represent theoretical design modeling and do not constitute validated occupational field accuracy figures or substitute for certified detection equipment.
            </div>
          </div>

          {/* 4 Simulation Cards Grid (2 columns on desktop, 1 on mobile) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {SIMULATIONS.map((sim, index) => (
              <div
                key={sim.id}
                id={sim.id}
                className="simulation-interactive-card border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl overflow-hidden shadow-sm flex flex-col"
              >
                {/* Image Container with Full Scaling & Visual Fidelity */}
                <div
                  className="simulation-thumb-wrapper group relative border-b border-[var(--color-border)] p-2 md:p-4 bg-slate-900/5 dark:bg-slate-950/50 flex items-center justify-center min-h-[300px] md:min-h-[380px]"
                  onClick={() => setActiveModalIndex(index)}
                  title="Click to view enlarged simulation"
                >
                  <img
                    src={sim.imageSrc}
                    alt={sim.title}
                    className="w-full h-auto max-h-[420px] object-contain rounded-md"
                    loading="eager"
                  />
                  {/* Hover Overlay Button */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer">
                    <span className="px-4 py-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] font-semibold text-xs shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Maximize2 size={14} className="text-[var(--color-accent)]" />
                      View High-Resolution Image
                    </span>
                  </div>

                  {/* Corner Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[var(--color-surface)]/90 backdrop-blur-sm border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-primary)] shadow-xs">
                    Simulation {sim.simNumber} of 4
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header Label inside image reference */}
                    <div className="text-[11px] font-mono font-medium text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-2.5 py-1 rounded inline-block mb-2 max-w-full truncate border border-[var(--color-accent)]/20">
                      {sim.imageHeading}
                    </div>

                    <h2 className="text-lg md:text-xl font-bold text-[var(--color-text-primary)] mb-2">
                      {sim.title}
                    </h2>

                    <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
                      {sim.description}
                    </p>

                    {/* Metadata tags */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-4 p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                      <div>
                        <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-bold">
                          Simulated Time
                        </span>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {sim.timestamp}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-bold">
                          Units / Range
                        </span>
                        <span className="font-medium text-[var(--color-text-primary)] font-mono text-[11px]">
                          {sim.units}
                        </span>
                      </div>
                    </div>

                    {/* Technical observations list */}
                    <ul className="space-y-1.5 text-xs text-[var(--color-text-muted)] mb-5 list-disc pl-4">
                      {sim.technicalNotes.map((note, i) => (
                        <li key={i} className="leading-normal">
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Controls */}
                  <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      {sim.filename}
                    </span>
                    <button
                      onClick={() => setActiveModalIndex(index)}
                      className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <Maximize2 size={13} />
                      Enlarge View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Summary & Return CTA */}
          <div className="p-6 md:p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
                Returning to SENTINELTRACK Overview
              </h3>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)]">
                Review how these finite element transport models interface with our physical wearable badge, smartphone computer vision, and worker exposure records.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/" className="btn btn-primary text-xs md:text-sm px-4 py-2 text-decoration-none">
                Explore Full Project
              </Link>
              <Link href="/login" className="btn btn-secondary text-xs md:text-sm px-4 py-2 text-decoration-none">
                Sign In to Platform
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox / High-Resolution Modal */}
      {activeSim && (
        <div
          className="lightbox-backdrop"
          onClick={() => setActiveModalIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activeSim.title}
        >
          <div
            className="lightbox-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
                  Simulation {activeSim.simNumber} of 4 — {activeSim.filename}
                </div>
                <h3 className="text-sm md:text-base font-bold text-[var(--color-text-primary)]">
                  {activeSim.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModalIndex(null)}
                  className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Image Area */}
            <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-4 md:p-6 overflow-auto max-h-[65vh]">
              <img
                src={activeSim.imageSrc}
                alt={activeSim.title}
                className="max-h-[60vh] max-w-full object-contain rounded"
              />

              {/* Prev / Next arrows */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModalIndex((prev) => (prev !== null ? (prev - 1 + SIMULATIONS.length) % SIMULATIONS.length : 0));
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 transition-all cursor-pointer shadow-md"
                title="Previous simulation (Left Arrow)"
                aria-label="Previous simulation"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModalIndex((prev) => (prev !== null ? (prev + 1) % SIMULATIONS.length : 0));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 transition-all cursor-pointer shadow-md"
                title="Next simulation (Right Arrow)"
                aria-label="Next simulation"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Modal Footer Description */}
            <div className="p-4 md:p-5 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-xs md:text-sm text-[var(--color-text-secondary)]">
              <div className="font-mono text-xs text-[var(--color-accent)] mb-1">
                {activeSim.imageHeading}
              </div>
              <p className="mb-2 leading-relaxed">
                {activeSim.description}
              </p>
              <div className="text-[11px] text-[var(--color-text-muted)] flex flex-wrap items-center justify-between gap-2">
                <span>Use Left / Right arrow keys to cycle through all 4 simulation images. Press Esc to close.</span>
                <span className="font-mono font-medium">{activeSim.units}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
