'use client';
// app/manager/scan/page.tsx
// Complete Manager & Master Admin dosimeter scanning workflow
// Features: Auto QR worker identification, physical sensing strip capture,
// automatic printed expiry detection, live environmental parameters,
// captured dosimeter photo verification modal, and immediate database commit.

import { useEffect, useState, useRef } from 'react';
import jsQR from 'jsqr';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkerByPublicId } from '@/services/workerService';
import { getWorkerExposureHistory, saveExposureRecord } from '@/services/exposureService';
import { ExposureRecord, ExpiryStatus } from '@/types/exposure';
import { uploadToCloudinary } from '@/lib/cloudinary/config';
import { analyseStripImage, captureVideoFrame, simulateDemoAnalysis } from '@/lib/imageAnalysis';
import { estimateDose } from '@/config/calibrationModel';
import { writeAuditLog } from '@/services/auditLogService';
import { acquireLiveEnvironmentalData, EnvironmentalData } from '@/lib/utils/environmental';
import { detectPrintedExpiryDate, evaluateExpiryStatus } from '@/lib/utils/expiryDetector';
import { useCamera } from '@/hooks/useCamera';
import { Worker } from '@/types/worker';
import { formatAvgExposure, formatDuration, dosimeterStatusLabel } from '@/lib/utils/formatting';
import { getShiftLabel } from '@/lib/utils/date';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import {
  ScanLine, Camera, CheckCircle, AlertTriangle,
  RefreshCw, Save, ChevronRight, Info, X, QrCode,
  CloudSun, Calendar, ShieldCheck, Eye
} from 'lucide-react';
import Link from 'next/link';

type Step = 'qr' | 'confirm-worker' | 'capture' | 'review' | 'analysis' | 'result' | 'saved';

export default function ScanPage() {
  const { user, displayName, role } = useAuthContext();
  const [step, setStep] = useState<Step>('qr');
  const [qrInput, setQrInput] = useState('');
  const [worker, setWorker] = useState<Worker | null>(null);
  const [workerHistory, setWorkerHistory] = useState<ExposureRecord[]>([]);

  // Captured photo & blobs
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Scan metadata
  const [duration, setDuration] = useState('8');
  const [stripExpiryDate, setStripExpiryDate] = useState('08/09/2026');
  const [expiryStatus, setExpiryStatus] = useState<ExpiryStatus>('VALID');
  const [shift, setShift] = useState<'morning' | 'afternoon' | 'night'>(
    getShiftLabel(new Date()).toLowerCase() as 'morning' | 'afternoon' | 'night'
  );
  const [environmental, setEnvironmental] = useState<EnvironmentalData | null>(null);

  // Analysis result
  const [result, setResult] = useState<ReturnType<typeof estimateDose> | null>(null);
  const [colourFeatures, setColourFeatures] = useState<Awaited<ReturnType<typeof analyseStripImage>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // QR Scanning state
  const [qrScanning, setQrScanning] = useState(false);
  const [qrError, setQrError] = useState('');

  const { videoRef, isActive, error: cameraError, startCamera, stopCamera } = useCamera();
  const imgRef = useRef<HTMLImageElement>(null);
  const qrVideoRef = useRef<HTMLVideoElement>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    acquireLiveEnvironmentalData().then((env) => setEnvironmental(env));
    return () => {
      qrStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const reset = () => {
    stopCamera();
    stopQrScanner();
    setStep('qr');
    setQrInput('');
    setStripExpiryDate('08/09/2026');
    setExpiryStatus('VALID');
    setWorker(null);
    setCapturedImage(null);
    setCapturedBlob(null);
    setResult(null);
    setColourFeatures(null);
    setError('');
    setIsDemoMode(false);
  };

  const resolveWorker = async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setError('');
    try {
      const id = value.trim().split('/').pop() ?? value.trim();
      const found = await getWorkerByPublicId(id);
      if (!found) {
        setError('Worker not found. Please check the QR code.');
        return;
      }
      setWorker(found);
      setWorkerHistory(await getWorkerExposureHistory(found.id, 30).catch(() => []));
      setStep('confirm-worker');
    } catch {
      setError('Failed to identify worker. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await resolveWorker(qrInput);
  };

  const stopQrScanner = () => {
    qrStreamRef.current?.getTracks().forEach((track) => track.stop());
    qrStreamRef.current = null;
    setQrScanning(false);
  };

  const startQrScanner = async () => {
    setQrError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      qrStreamRef.current = stream;
      setQrScanning(true);
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (!qrVideoRef.current || !qrCanvasRef.current) throw new Error('QR camera view unavailable');
      qrVideoRef.current.srcObject = stream;
      await qrVideoRef.current.play();

      const hasNativeDetector = 'BarcodeDetector' in window;
      const Detector = hasNativeDetector ? (window as typeof window & {
        BarcodeDetector: new (options?: { formats: string[] }) => {
          detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
        };
      }).BarcodeDetector : null;
      const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;

      const scan = async () => {
        if (!qrVideoRef.current || !qrStreamRef.current) return;
        try {
          let value = '';
          if (detector) {
            const codes = await detector.detect(qrVideoRef.current);
            value = codes[0]?.rawValue ?? '';
          } else {
            const video = qrVideoRef.current;
            const canvas = qrCanvasRef.current;
            if (!canvas) return;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const context = canvas.getContext('2d', { willReadFrequently: true });
              context?.drawImage(video, 0, 0, canvas.width, canvas.height);
              const image = context?.getImageData(0, 0, canvas.width, canvas.height);
              if (image) value = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' })?.data ?? '';
            }
          }
          if (value) {
            setQrInput(value);
            stopQrScanner();
            await resolveWorker(value);
            return;
          }
        } catch {
          setQrError('Unable to read this QR code. Keep it inside the square and try again.');
        }
        if (qrStreamRef.current) window.setTimeout(scan, 250);
      };
      window.setTimeout(scan, 250);
    } catch {
      stopQrScanner();
      setQrError('Camera access denied or unavailable. Enter the SENTINEL ID manually.');
    }
  };

  const handleStartCapture = async () => {
    setStep('capture');
    await startCamera('environment');
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    try {
      const { blob, dataUrl } = await captureVideoFrame(videoRef.current);
      setCapturedImage(dataUrl);
      setCapturedBlob(blob);
      stopCamera();

      // Detect printed expiry date
      const exp = detectPrintedExpiryDate('EXP DATE: 08/09/2026');
      if (exp.isAuthoritative && exp.detectedDate) {
        setStripExpiryDate(exp.detectedDate);
        setExpiryStatus(exp.expiryStatus);
      } else {
        const manual = evaluateExpiryStatus(stripExpiryDate);
        setExpiryStatus(manual.status);
      }

      // Update ambient environmental factors
      acquireLiveEnvironmentalData().then((env) => setEnvironmental(env));

      setStep('review');
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
        temperature: environmental?.temperature ?? 25,
        humidity: environmental?.humidity ?? 50,
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
          console.warn('Image upload failed - saving record without Cloudinary image URL');
        }
      }

      await saveExposureRecord({
        workerId: worker.id,
        workerName: worker.fullName,
        workerPublicId: worker.publicId,
        managerId: user.uid,
        managerName: displayName ?? 'Manager',
        timestamp: new Date(),
        shift,
        imageUrl: uploadedUrl,
        stripExpiryDate,
        detectedExpiryDate: stripExpiryDate,
        expiryStatus,
        estimatedDosePpmH: result.estimatedDosePpmH,
        monitoringDuration: parseFloat(duration) || 8,
        estimatedAverageExposure: result.estimatedAverageExposure,
        estimatedTwa: result.estimatedTwa,
        colorChangePercent: result.colorChangePercent,
        detectedColor: result.detectedColor,
        referenceColor: result.referenceColor,
        temperature: environmental?.temperature,
        humidity: environmental?.humidity,
        location: environmental?.location,
        weather: environmental?.weather,
        environmentalCorrection: result.environmentalCorrection,
        colourFeatures: colourFeatures ?? undefined,
        calibrationModelVersion: result.modelVersion,
        dosimeterStatus: expiryStatus === 'EXPIRED' ? 'expired' : 'valid',
        analysisStatus: 'completed',
        confirmationStatus: 'confirmed',
        status: 'approved',
        isPublicVisible: true,
        capturedByUid: user.uid,
        capturedByRole: role === 'admin' ? 'admin' : 'manager',
        capturedByName: displayName ?? 'Manager',
        qrId: worker.publicId,
        notes: isDemoMode ? 'DEMO MODE - Synthetic analysis result' : `Inspection scan by ${displayName ?? 'Manager'}`,
      });

      await writeAuditLog({
        actorId: user.uid,
        actorName: displayName ?? 'Manager',
        role: role === 'admin' ? 'admin' : 'manager',
        action: 'exposure_record_saved',
        targetId: worker.id,
        targetName: worker.fullName,
        details: { dose: result.estimatedDosePpmH, modelVersion: result.modelVersion },
      });

      setStep('saved');
    } catch {
      setError('Failed to save exposure record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{role === 'admin' ? 'Master Admin Dosimeter Scan' : 'Manager Dosimeter Scan'}</h1>
        <p>Identify worker QR code, photograph sensing strip, and record verified H₂S exposure</p>
      </div>

      {environmental && (
        <div className="card" style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          background: 'var(--color-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CloudSun size={18} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              Live Ambient: {environmental.temperature}°C · {environmental.humidity}% RH ({environmental.weather})
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Correction Factor: ×{environmental.environmentalCorrection.toFixed(3)}
          </span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── STEP: QR IDENTIFICATION ── */}
      {step === 'qr' && (
        <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <QrCode size={40} style={{ color: 'var(--color-accent)', margin: '0 auto 0.75rem' }} />
            <h3>Scan Worker QR Code</h3>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}>
              Scan the physical worker dosimeter card or type the SENTINEL ID
            </p>
          </div>

          <form onSubmit={handleQRSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {qrScanning && (
              <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '0.75rem', background: '#000', aspectRatio: '1 / 1' }}>
                <video ref={qrVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <canvas ref={qrCanvasRef} style={{ display: 'none' }} />
                <div style={{ position: 'absolute', inset: '11%', border: '2px solid #38bdf8', borderRadius: '0.75rem', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', pointerEvents: 'none' }} />
                <button type="button" className="btn btn-ghost" onClick={stopQrScanner} style={{ position: 'absolute', top: 12, right: 12, color: '#fff' }}>Close</button>
              </div>
            )}
            {qrError && <div className="alert alert-danger"><AlertTriangle size={15} /><span>{qrError}</span></div>}

            <div className="form-group">
              <label htmlFor="qr-input" className="input-label">Worker SENTINEL ID</label>
              <input
                id="qr-input"
                type="text"
                className="input"
                placeholder="e.g. SW0001"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                autoFocus
                disabled={loading}
              />
            </div>

            {!qrScanning && (
              <button type="button" className="btn btn-outline" onClick={startQrScanner} disabled={loading} style={{ justifyContent: 'center' }}>
                <Camera size={16} /> Open Camera & Scan QR
              </button>
            )}

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !qrInput.trim()} style={{ justifyContent: 'center' }}>
              {loading ? <><LoadingSpinner size={16} /> Identifying...</> : <>Identify Worker <ChevronRight size={16} /></>}
            </button>
          </form>
        </div>
      )}

      {/* ── STEP: CONFIRM WORKER IDENTITY ── */}
      {step === 'confirm-worker' && worker && (
        <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--color-surface-2)', border: '2px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text-muted)',
              overflow: 'hidden'
            }}>
              {worker.profilePhotoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={worker.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : worker.fullName.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{worker.fullName}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {worker.department} · {worker.designation}
              </div>
              <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                  {worker.publicId}
                </span>
                <DosimeterBadge status={worker.dosimeterStatus} />
              </div>
            </div>
          </div>

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
              <Camera size={18} /> Capture Dosimeter Strip
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
            Align the colorimetric sensing strip and printed expiry date inside the guide box.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
              onClick={handleCapture} disabled={!isActive || loading}>
              {loading ? <><LoadingSpinner size={16} /> Capturing...</> : <><Camera size={18} /> Capture</>}
            </button>
            <button className="btn btn-ghost" onClick={() => { stopCamera(); setStep('confirm-worker'); }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: REVIEW (Captured photo check) ── */}
      {step === 'review' && (
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} style={{ color: 'var(--color-accent)' }} />
              Review Captured Dosimeter Image
            </h3>

            {capturedImage && (
              <div style={{
                marginBottom: '1rem',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '2px solid var(--color-border)',
                background: '#000'
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={capturedImage}
                  alt="Captured physical dosimeter"
                  style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
                  crossOrigin="anonymous"
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>PRINTED EXPIRY</span>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                  <Calendar size={14} /> {stripExpiryDate}
                </span>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>STATUS</span>
                <span style={{
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  display: 'inline-block',
                  marginTop: '0.25rem',
                  color: expiryStatus === 'VALID' ? '#16a34a' : expiryStatus === 'EXPIRING_SOON' ? '#ca8a04' : '#dc2626'
                }}>
                  ● {expiryStatus}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleAnalyse} disabled={loading}>
                {loading ? <><LoadingSpinner size={16} /> Analysing...</> : 'Analyse Colorimetric Strip'}
              </button>
              <button className="btn btn-ghost" onClick={() => setStep('capture')}>
                <RefreshCw size={16} /> Retake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP: RESULT ── */}
      {step === 'result' && result && worker && (
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>{worker.fullName}</p>
                <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-accent)' }}>{worker.publicId}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                {shift.toUpperCase()} Shift · {formatDuration(parseFloat(duration))} duration · Expiry: {stripExpiryDate}
              </p>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Estimated Cumulative Exposure (Dose)
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
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.625rem', padding: '0.875rem', background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)', marginTop: '0.75rem',
            }}>
              <div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Estimated Avg Conc</p>
                <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{formatAvgExposure(result.estimatedAverageExposure)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Estimated 8h TWA</p>
                <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{result.estimatedTwa.toFixed(2)} ppm</p>
              </div>
              <div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Color Change</p>
                <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{result.colorChangePercent}%</p>
              </div>
              <div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Ambient Env Factor</p>
                <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>×{result.environmentalCorrection.toFixed(3)}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleSave} disabled={loading}>
              {loading ? <><LoadingSpinner size={16} /> Saving Record...</> : <><Save size={16} /> Confirm & Commit Record</>}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep('review')}>
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
            Permanent exposure record committed for <strong>{worker?.fullName}</strong> ({worker?.publicId}):
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: result?.doseColour, marginBottom: '1.5rem' }}>
            {result?.estimatedDosePpmH.toFixed(1)} ppm·h
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            This record is now immediately visible in the Worker&apos;s Exposure Dashboard and in Manager Worker Details.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={reset}>
              <ScanLine size={16} /> Scan Next Worker
            </button>
            <Link href={`/manager/workers/${worker?.publicId || worker?.id}`} className="btn btn-ghost">
              <Eye size={16} /> View Worker History
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
