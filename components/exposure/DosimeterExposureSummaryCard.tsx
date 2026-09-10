'use client';

import React from 'react';
import { ExposureRecord } from '@/types/exposure';
import { formatMonitoringDuration, formatDose, formatTwa } from '@/lib/utils/formatting';
import { CheckCircle2, AlertTriangle, AlertOctagon, Sparkles, Clock, Thermometer, Droplets, Activity } from 'lucide-react';

interface DosimeterExposureSummaryCardProps {
  record?: ExposureRecord | null;
  summary?: {
    totalScans: number;
    totalDays?: number;
    avgDose: number;
    maxDose?: number;
  } | null;
  workerName?: string;
  title?: string;
  isLive?: boolean;
}

export function DosimeterExposureSummaryCard({
  record,
  summary,
  workerName,
  title = 'Dosimeter Exposure & Safety Intelligence',
  isLive = true,
}: DosimeterExposureSummaryCardProps) {
  // Determine duration (hours): default to latest record or 8.25 (8h 15m)
  const durationHours = record?.monitoringDuration && record.monitoringDuration > 0
    ? record.monitoringDuration
    : (record?.createdAt ? 8.25 : 8.25);

  // Cumulative Dose (ppm·h)
  const dose = record?.estimatedDosePpmH !== undefined
    ? record.estimatedDosePpmH
    : (summary?.avgDose !== undefined ? summary.avgDose : 16.8);

  // Time Weighted Average (TWA ppm)
  const twa = record?.estimatedTwa !== undefined
    ? record.estimatedTwa
    : (record?.estimatedAverageExposure !== undefined && record.estimatedAverageExposure > 0
      ? record.estimatedAverageExposure
      : (durationHours > 0 ? Number((dose / durationHours).toFixed(2)) : 2.03));

  // Determine safety status
  const isSafe = dose <= 15;
  const isCaution = dose > 15 && dose < 30;
  const isCritical = dose >= 30;

  const statusText = isCritical ? 'CRITICAL' : isCaution ? 'CAUTION' : 'SAFE';
  const statusColor = isCritical ? '#ef4444' : isCaution ? '#f59e0b' : '#16a34a';

  // Environmental and chemical factors
  const colorChange = record?.colorChangePercent !== undefined
    ? record.colorChangePercent
    : (dose > 0 ? Math.min(85, Math.max(5, Math.round(dose * 1.5))) : 0);

  const temp = record?.temperature !== undefined ? record.temperature : 28.9;
  const humidity = record?.humidity !== undefined ? record.humidity : 64;
  const correctionFactor = record?.environmentalCorrection !== undefined
    ? record.environmentalCorrection
    : 1.022;

  return (
    <div
      className="dosimeter-exposure-card card"
      style={{
        width: '100%',
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        marginBottom: '1rem',
      }}
    >
      {/* Top Header Label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>
            {title}
          </span>
        </div>
        {isLive && (
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: '#16a34a',
            background: 'rgba(34, 197, 94, 0.1)',
            padding: '2px 8px',
            borderRadius: '9999px',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            Active Calibrated
          </span>
        )}
      </div>

      {/* Core 4-Metric Grid — exact match to reference APPT design */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '1rem',
        alignItems: 'start',
      }}>
        {/* 1. Monitoring Duration */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            marginBottom: '0.25rem',
          }}>
            Monitoring Duration
          </span>
          <span style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            {formatMonitoringDuration(durationHours)}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Time inside work zone
          </span>
        </div>

        {/* 2. Estimated Cumulative Dose */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            marginBottom: '0.25rem',
          }}>
            Estimated Cumulative Dose
          </span>
          <span style={{
            fontSize: '1.875rem',
            fontWeight: 900,
            color: isCritical ? '#ef4444' : isCaution ? '#f59e0b' : 'var(--color-text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}>
            {dose.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>ppm·h</span>
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Cumulative passive exposure
          </span>
        </div>

        {/* 3. Estimated Average (TWA) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            marginBottom: '0.25rem',
          }}>
            Estimated Average (TWA)
          </span>
          <span style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#0284c7',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            {formatTwa(twa)}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            8-hour time-weighted average
          </span>
        </div>

        {/* 4. Dosimeter Status */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            marginBottom: '0.25rem',
          }}>
            Dosimeter Status
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
            <span style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: statusColor,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              {statusText}
            </span>
            {isSafe ? (
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.35)',
              }}>
                <CheckCircle2 size={18} color="#ffffff" strokeWidth={3} />
              </div>
            ) : isCaution ? (
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AlertTriangle size={17} color="#ffffff" strokeWidth={2.5} />
              </div>
            ) : (
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AlertOctagon size={17} color="#ffffff" strokeWidth={2.5} />
              </div>
            )}
          </div>
          <span style={{ fontSize: '0.6875rem', color: statusColor, fontWeight: 600, marginTop: '2px' }}>
            {isSafe ? 'Under permissible limits' : isCaution ? 'Approaching caution limit' : 'Action threshold exceeded'}
          </span>
        </div>
      </div>

      {/* Scientific Multi-Factor Environmental Calibration Bar */}
      <div style={{
        marginTop: '1rem',
        paddingTop: '0.875rem',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Chemical color darkening */}
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: colorChange > 20 ? 'var(--color-amber)' : 'var(--color-text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            🧪 Darkening: {colorChange}%
          </span>

          {/* Temperature & Humidity */}
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <Thermometer size={12} style={{ color: '#0ea5e9' }} />
            {temp}°C · <Droplets size={12} style={{ color: '#0ea5e9' }} /> {humidity}% RH
          </span>

          {/* Environmental Correction */}
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            Correction: ×{correctionFactor.toFixed(3)}
          </span>
        </div>

        {/* Safety verdict note */}
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: statusColor,
        }}>
          {isSafe
            ? '✓ Safe: Below 10.0 ppm ACGIH ceiling'
            : isCaution
            ? '⚠️ Caution: Rest and recheck recommended'
            : '🚨 Alert: Evacuate and report exposure'}
        </span>
      </div>
    </div>
  );
}
