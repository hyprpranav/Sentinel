'use client';
// app/(manager)/scan/page.tsx
// Complete dosimeter scanning workflow
import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkerByPublicId } from '@/services/workerService';
import { saveExposureRecord } from '@/services/exposureService';
import { uploadToCloudinary } from '@/lib/cloudinary/config';
import { analyseStripImage, captureVideoFrame, simulateDemoAnalysis } from '@/lib/imageAnalysis';
import { estimateDose, DEMO_CALIBRATION_MODEL } from '@/config/calibrationModel';
import { writeAuditLog } from '@/services/auditLogService';
import { useCamera } from '@/hooks/useCamera';
import { Worker } from '@/types/worker';
import { formatDose, formatAvgExposure, formatDuration, dosimeterStatusLabel } from '@/lib/utils/formatting';
import { getShiftLabel } from '@/lib/utils/date';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import {
  ScanLine, Camera, CheckCircle, AlertTriangle,
  RefreshCw, Save, ChevronRight, Info, X, QrCode,
} from 'lucide-react';

// Step definitions
type Step = 'qr' | 'confirm-worker' | 'capture' | 'analysis' | 'result' | 'saved';

export default function ScanPage() {
  const { user, displayName } = useAuthContext();
  const [step, setStep] = useState<Step>('qr');
  const [qrInput, setQrInput] = useState('');
  const [worker, setWorker] = useState<Worker | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState('8');
  const [shift, setShift] = useState<'morning'|'afternoon'|'night'>(
    getShiftLabel(new Date()).toLowerCase() as 'morning'|'afternoon'|'night'
  );
  const [result, setResult] = useState<ReturnType<typeof estimateDose> | null>(null);
  const [colourFeatures, setColourFeatures] = useState<Awaited<ReturnType<typeof analyseStripImage>> | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  const { videoRef, isActive, error: cameraError, startCamera, stopCamera } = useCamera();
  const imgRef = useRef<HTMLImageElement>(null);

  const reset = () => {
    stopCamera();
    setStep('qr');
    setQrInput('');
    setWorker(null);
    setCapturedImage(null);
    setCapturedBlob(null);
    setResult(null);
    setColourFeatures(null);
    setImageUrl('');
    setError('');
    setIsDemoMode(false);
  };

  // Resolve worker from QR input
  const handleQRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Support full URL or just the ID
      const id = qrInput.trim().split('/').pop() ?? qrInput.trim();
      const found = await getWorkerByPublicId(id);
      if (!found) { setError('Worker not found. Please check the QR code.'); return; }
      setWorker(found);
      setStep('confirm-worker');
    } catch {
      setError('Failed to identify worker. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start camera for dosimeter capture
  const handleStartCapture = async () => {
    setStep('capture');
    await startCamera('environment');
  };

  // Capture frame from video
  const handleCapture = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    try {
      const { blob, dataUrl } = await captureVideoFrame(videoRef.current);
      setCapturedImage(dataUrl);
      setCapturedBlob(blob);
      stopCamera();
      setStep('analysis');
    } catch {
      setError('Capture failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Analyse the captured image
  const handleAnalyse = async () => {
    setLoading(true);
    setError('');
    try {
      let features;
      if (isDemoMode || !imgRef.current) {
        features = simulateDemoAnalysis('moderate');
      } else {
        features = await analyseStripImage(imgRef.current);
      }
      setColourFeatures(features);

      const est = estimateDose({
        meanRgb: features.meanRgb,
        colourDifference: features.colourDifference ?? 100,
        monitoringDuration: parseFloat(duration) || 8,
      });
      setResult(est);
      setStep('result');
    } catch {
      setError('Analysis failed. Try using demo mode or retake the photo.');
    } finally {
      setLoading(false);
    }
  };

  // Save the exposure record
  const handleSave = async () => {
    if (!worker || !result || !user) return;
    setLoading(true);
    setError('');
    try {
      let uploadedUrl = imageUrl;
      if (capturedBlob && !isDemoMode) {
        try {
          const up = await uploadToCloudinary(capturedBlob, 'sentinel/dosimeter-scans');
          uploadedUrl = up.secure_url;
        } catch {
          // Image upload failure should not block record saving
          console.warn('Image upload failed — saving record without image URL');
        }
      }

      await saveExposureRecord({
        workerId: worker.id,
        workerName: worker.fullName,
        workerPublicId: worker.publicId,
        managerId: user.uid,
        managerName: displayName ?? '',
        timestamp: new Date(),
        shift,
        imageUrl: uploadedUrl,
        estimatedDosePpmH: result.estimatedDosePpmH,
        monitoringDuration: parseFloat(duration) || 8,
        estimatedAverageExposure: result.estimatedAverageExposure,
        colourFeatures: colourFeatures ?? undefined,
        calibrationModelVersion: result.modelVersion,
        dosimeterStatus: worker.dosimeterStatus === 'expired' ? 'expired' : 'valid',
        isPublicVisible: true,
        notes: isDemoMode ? 'DEMO MODE — Synthetic analysis result' : '',
      });

      await writeAuditLog({
        actorId: user.uid,
        actorName: displayName ?? 'Manager',
        role: 'manager',
        action: 'exposure_record_saved',
        targetId: worker.id,
        targetName: worker.fullName,
        details: { dose: result.estimatedDosePpmH, modelVersion: result.modelVersion },
      });

      setStep('saved');
    } catch (err) {
      setError('Failed to save record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex: Record<Step, number> = { qr: 0, 'confirm-worker': 1, capture: 2, analysis: 3, result: 4, saved: 5 };
  const totalSteps = 5;
  const current = stepIndex[step];

  return (
    <div>
      <div className="page-header">
        <h1>Scan Dosimeter</h1>
        <p>Identify worker, capture sensing strip, record estimated exposure</p>
      </div>

      {/* Step indicator */}
      <div className="scan-steps" style={{ marginBottom: '1.75rem' }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`scan-step ${i === current ? 'active' : i < current ? 'done' : ''}`}
          />
        ))}
      </div>

      {/* DEMO mode toggle */}
      {(step === 'analysis' || step === 'capture') && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          <Info size={15} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.8125rem' }}>
              No sensing strip to capture? Use Demo Mode to simulate a colour analysis result.
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500, flexShrink: 0 }}>
            <input type="checkbox" checked={isDemoMode} onChange={(e) => setIsDemoMode(e.target.checked)} />
            Demo Mode
          </label>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── STEP: QR INPUT ── */}
      {step === 'qr' && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <QrCode size={40} style={{ color: 'var(--color-accent)', margin: '0 auto 0.75rem' }} />
            <h3>Scan Worker QR Code</h3>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Enter the worker's SENTINEL ID or scan the QR code
            </p>
          </div>

          <form onSubmit={handleQRSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="qr-input" className="input-label">Worker SENTINEL ID or QR URL</label>
              <input
                id="qr-input"
                type="text"
                className="input"
                placeholder="e.g. SNT-W-1042"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                autoFocus
                autoComplete="off"
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !qrInput.trim()}>
              {loading ? <><LoadingSpinner size={16} /> Looking up...</> : <>Identify Worker <ChevronRight size={16} /></>}
            </button>
          </form>
        </div>
      )}

      {/* ── STEP: CONFIRM WORKER ── */}
      {step === 'confirm-worker' && worker && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--color-surface-2)', border: '2px solid var(--color-border)',
              overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text-muted)',
            }}>
              {worker.profilePhotoUrl
                ? <img src={worker.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : worker.fullName.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{worker.fullName}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {worker.publicId} · {worker.department}
              </div>
              <div style={{ marginTop: '0.375rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                  {worker.publicId}
                </span>
                <DosimeterBadge status={worker.dosimeterStatus} />
              </div>
            </div>
          </div>

          {worker.dosimeterStatus === 'expired' || worker.dosimeterStatus === 'invalid' ? (
            <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>Dosimeter status: <strong>{dosimeterStatusLabel(worker.dosimeterStatus)}</strong>. Record result with caution.</span>
            </div>
          ) : null}

          <div className="two-col" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label htmlFor="scan-duration" className="input-label">Monitoring Duration (hours)</label>
              <input id="scan-duration" type="number" min="0.5" max="24" step="0.5"
                className="input" value={duration}
                onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="scan-shift" className="input-label">Shift</label>
              <select id="scan-shift" className="input"
                value={shift} onChange={(e) => setShift(e.target.value as typeof shift)}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleStartCapture}>
              <Camera size={18} /> Capture Sensing Strip
            </button>
            <button className="btn btn-ghost" onClick={reset}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: CAMERA CAPTURE ── */}
      {step === 'capture' && (
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="camera-viewport" style={{ marginBottom: '1rem' }}>
            <video ref={videoRef} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="camera-guide">
              <div className="guide-frame" />
            </div>
            {!isActive && !cameraError && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '1rem', color: '#fff',
              }}>
                <LoadingSpinner size={28} />
                <p style={{ fontSize: '0.875rem' }}>Starting camera...</p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{cameraError}</span>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Align the passive sensing strip within the guide frame.
            Ensure the printed reference colour scale is visible.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isDemoMode ? (
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
                onClick={() => { stopCamera(); setStep('analysis'); }}>
                Skip Capture (Demo Mode)
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
                onClick={handleCapture} disabled={!isActive || loading}>
                {loading ? <><LoadingSpinner size={16} /> Capturing...</> : <><Camera size={18} /> Capture</>}
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => { stopCamera(); setStep('confirm-worker'); }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: ANALYSIS ── */}
      {step === 'analysis' && (
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {capturedImage && (
            <div style={{ marginBottom: '1rem', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <img
                ref={imgRef}
                src={capturedImage}
                alt="Captured dosimeter"
                style={{ width: '100%', display: 'block' }}
                crossOrigin="anonymous"
              />
            </div>
          )}

          {isDemoMode && !capturedImage && (
            <div className="card" style={{ marginBottom: '1rem', textAlign: 'center', padding: '2rem' }}>
              <Info size={32} style={{ color: 'var(--color-accent)', margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.875rem' }}>Demo Mode active — synthetic colour data will be used for estimation.</p>
            </div>
          )}

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9375rem' }}>Colour Analysis</h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              <p>1. Detect sensing region boundaries</p>
              <p>2. Detect reference colour scale</p>
              <p>3. Apply lighting normalisation</p>
              <p>4. Extract RGB / HSV colour features</p>
              <p>5. Estimate dose via calibration model</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
              onClick={handleAnalyse} disabled={loading}>
              {loading ? <><LoadingSpinner size={16} /> Analysing...</> : 'Run Colour Analysis'}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep('capture')}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: RESULT ── */}
      {step === 'result' && result && worker && (
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {result.isDemo && (
            <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
              <Info size={15} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem' }}>
                <strong>Demo Mode result.</strong> Values are from an unvalidated placeholder model.
                Not for occupational health decisions.
              </span>
            </div>
          )}

          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Worker
              </p>
              <p style={{ fontWeight: 600 }}>{worker.fullName}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {worker.publicId} · {shift.charAt(0).toUpperCase() + shift.slice(1)} shift · {formatDuration(parseFloat(duration))}
              </p>
            </div>

            <div style={{ textAlign: 'center', padding: '1.25rem 0' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                Estimated Cumulative H₂S Exposure
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.75rem' }}>
                <span className="dose-value" style={{ color: result.doseColour }}>
                  {result.estimatedDosePpmH.toFixed(1)}
                </span>
                <span className="dose-unit">ppm·h</span>
              </div>
              <DoseLevelBadge ppmH={result.estimatedDosePpmH} />
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem', padding: '1rem', background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)', marginTop: '0.5rem',
            }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>Estimated Avg Exposure</p>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{formatAvgExposure(result.estimatedAverageExposure)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>Calibration Model</p>
                <p style={{ fontWeight: 500, fontSize: '0.875rem', fontFamily: 'monospace' }}>{result.modelVersion}</p>
              </div>
            </div>

            {colourFeatures && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                Colour features: RGB({colourFeatures.meanRgb.join(', ')}) ·
                Colour diff: {colourFeatures.colourDifference?.toFixed(1)}
              </div>
            )}
          </div>

          {result.warnings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {result.warnings.map((w, i) => (
                <div key={i} className={`alert ${i === 0 && result.estimatedDosePpmH >= 50 ? 'alert-danger' : 'alert-warning'}`}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem' }}>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
              onClick={handleSave} disabled={loading}>
              {loading ? <><LoadingSpinner size={16} /> Saving...</> : <><Save size={16} /> Save Reading</>}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep('analysis')}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: SAVED ── */}
      {step === 'saved' && (
        <div className="card" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <CheckCircle size={48} style={{ color: 'var(--color-green)', margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Exposure Record Saved</h3>
          <p style={{ marginBottom: '0.375rem', fontSize: '0.9375rem' }}>
            Estimated dose for <strong>{worker?.fullName}</strong>:
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: result?.doseColour, marginBottom: '1.5rem' }}>
            {result?.estimatedDosePpmH.toFixed(1)} ppm·h
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={reset}>
              <ScanLine size={16} /> Scan Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
