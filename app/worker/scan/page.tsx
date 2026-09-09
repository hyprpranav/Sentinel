'use client';
// app/worker/scan/page.tsx
// Worker self-scan dosimeter workflow
import { useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkerByUid } from '@/services/workerService';
import { saveExposureRecord } from '@/services/exposureService';
import { uploadToCloudinary } from '@/lib/cloudinary/config';
import { analyseStripImage, captureVideoFrame, simulateDemoAnalysis } from '@/lib/imageAnalysis';
import { estimateDose } from '@/config/calibrationModel';
import { useCamera } from '@/hooks/useCamera';
import { Worker } from '@/types/worker';
import { formatAvgExposure, formatDuration } from '@/lib/utils/formatting';
import { getShiftLabel } from '@/lib/utils/date';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { DoseLevelBadge } from '@/components/ui/Badge';
import {
  Camera, CheckCircle, AlertTriangle,
  RefreshCw, Save, Info, Activity,
} from 'lucide-react';
import { useRef } from 'react';
import Link from 'next/link';

type Step = 'ready' | 'capture' | 'analysis' | 'result' | 'saved';

export default function WorkerScanPage() {
  const { user, displayName } = useAuthContext();
  const [step, setStep] = useState<Step>('ready');
  const [worker, setWorker] = useState<Worker | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState('8');
  const [stripExpiryDate, setStripExpiryDate] = useState('');
  const [shift, setShift] = useState<'morning' | 'afternoon' | 'night'>(
    getShiftLabel(new Date()).toLowerCase() as 'morning' | 'afternoon' | 'night'
  );
  const [result, setResult] = useState<ReturnType<typeof estimateDose> | null>(null);
  const [colourFeatures, setColourFeatures] = useState<Awaited<ReturnType<typeof analyseStripImage>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  const { videoRef, isActive, error: cameraError, startCamera, stopCamera } = useCamera();
  const imgRef = useRef<HTMLImageElement>(null);

  const reset = () => {
    stopCamera();
    setStep('ready');
    setCapturedImage(null);
    setCapturedBlob(null);
    setResult(null);
    setColourFeatures(null);
    setError('');
    setIsDemoMode(false);
    setWorker(null);
  };

  const handleStartCapture = async () => {
    if (!user) { setError('Not authenticated.'); return; }
    setLoading(true);
    setError('');
    try {
      // Critical fix: look up worker by Auth UID field, NOT by document ID
      const found = await getWorkerByUid(user.uid);
      if (!found) {
        setError('Your worker profile was not found. Please contact your manager.');
        setLoading(false);
        return;
      }
      setWorker(found);
      setStep('capture');
      await startCamera('environment');
    } catch (err) {
      console.error('Worker lookup failed:', err);
      setError('Could not load your worker profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    if (!worker || !result || !user) return;
    setLoading(true);
    setError('');
    try {
      let uploadedUrl = '';
      if (capturedBlob && !isDemoMode) {
        try {
          const up = await uploadToCloudinary(capturedBlob, 'sentinel/dosimeter-scans');
          uploadedUrl = up.secure_url;
        } catch {
          console.warn('Image upload failed — saving record without image URL');
        }
      }

      await saveExposureRecord({
        workerId: worker.id,
        workerName: worker.fullName,
        workerPublicId: worker.publicId,
        managerId: worker.managerId ?? '',
        managerName: '',
        timestamp: new Date(),
        shift,
        imageUrl: uploadedUrl,
        stripExpiryDate,
        estimatedDosePpmH: result.estimatedDosePpmH,
        monitoringDuration: parseFloat(duration) || 8,
        estimatedAverageExposure: result.estimatedAverageExposure,
        colourFeatures: colourFeatures ?? undefined,
        calibrationModelVersion: result.modelVersion,
        dosimeterStatus: 'valid',
        status: 'pending',
        isPublicVisible: false,
        capturedByUid: user.uid,
        capturedByRole: 'worker',
        capturedByName: displayName ?? worker.fullName,
        notes: isDemoMode ? 'DEMO MODE — worker self-scan' : `Self-scan by ${displayName ?? worker.fullName}`,
      });

      setStep('saved');
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to save the record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Scan My Dosimeter</h1>
        <p>Capture your sensing strip image and record your estimated exposure</p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── STEP: READY ── */}
      {step === 'ready' && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <Activity size={40} style={{ color: 'var(--color-accent)', margin: '0 auto 0.75rem' }} />
            <h3>Ready to Scan</h3>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}>
              Ensure adequate lighting and that the sensing strip is clearly visible in the frame.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="w-duration" className="input-label">Monitoring Duration (hours)</label>
              <input
                id="w-duration"
                type="number" min="0.5" max="24" step="0.5"
                className="input" value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="w-shift" className="input-label">Shift</label>
              <select id="w-shift" className="input" value={shift} onChange={(e) => setShift(e.target.value as typeof shift)}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="w-expiry" className="input-label">Strip Expiry Date</label>
              <input id="w-expiry" type="date" className="input" value={stripExpiryDate} onChange={(e) => setStripExpiryDate(e.target.value)} />
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleStartCapture}
            disabled={loading}
          >
            {loading ? <><LoadingSpinner size={16} /> Loading...</> : <><Camera size={18} /> Open Camera</>}
          </button>

          <div className="alert alert-info" style={{ marginTop: '1rem' }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem' }}>
              This scan will be submitted for manager review. Your result will appear in your dashboard once saved.
            </span>
          </div>
        </div>
      )}

      {/* ── STEP: CAPTURE ── */}
      {step === 'capture' && (
        <div>
          {(step === 'capture') && (
            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
              <Info size={15} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8125rem' }}>No sensing strip? Use Demo Mode.</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500, flexShrink: 0 }}>
                <input type="checkbox" checked={isDemoMode} onChange={(e) => setIsDemoMode(e.target.checked)} />
                Demo
              </label>
            </div>
          )}

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
            Align the sensing strip within the guide frame.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isDemoMode ? (
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
                onClick={() => { stopCamera(); setStep('analysis'); }}>
                Skip Capture (Demo)
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
                onClick={handleCapture} disabled={!isActive || loading}>
                {loading ? <><LoadingSpinner size={16} /> Capturing...</> : <><Camera size={18} /> Capture</>}
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => { stopCamera(); setStep('ready'); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: ANALYSIS ── */}
      {step === 'analysis' && (
        <div>
          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
            <Info size={15} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.8125rem' }}>No sensing strip? Use Demo Mode.</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500, flexShrink: 0 }}>
              <input type="checkbox" checked={isDemoMode} onChange={(e) => setIsDemoMode(e.target.checked)} />
              Demo
            </label>
          </div>

          {capturedImage && (
            <div style={{ marginBottom: '1rem', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imgRef} src={capturedImage} alt="Captured dosimeter"
                style={{ width: '100%', display: 'block' }} crossOrigin="anonymous" />
            </div>
          )}

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9375rem' }}>Colour Analysis</h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              <p>1. Detect sensing region boundaries</p>
              <p>2. Extract RGB / HSV colour features</p>
              <p>3. Apply calibration model</p>
              <p>4. Estimate cumulative H₂S dose</p>
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
        <div>
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
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <CheckCircle size={48} style={{ color: 'var(--color-green)', margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Exposure Record Saved</h3>
          <p style={{ marginBottom: '0.375rem', fontSize: '0.9375rem' }}>
            Your estimated dose:
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: result?.doseColour, marginBottom: '0.5rem' }}>
            {result?.estimatedDosePpmH.toFixed(1)} ppm·h
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Pending manager review. Your dashboard will reflect the result.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={reset}>
              <Camera size={16} /> Scan Again
            </button>
            <Link href="/worker/home" className="btn btn-ghost">
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
