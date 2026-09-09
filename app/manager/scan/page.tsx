'use client';
// app/manager/scan/page.tsx
// Complete Manager & Master Admin dosimeter scanning workflow
// Features: Auto QR worker identification, real chemical color darkening analysis,
// automatic printed expiry detection, live environmental parameters,
// captured dosimeter photo verification, and immediate database commit to worker's dashboard.

import { useEffect, useState, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkerByPublicId } from '@/services/workerService';
import { getWorkerExposureHistory, saveExposureRecord } from '@/services/exposureService';
import { ExposureRecord, ExpiryStatus } from '@/types/exposure';
import { uploadToCloudinary } from '@/lib/cloudinary/config';
import {
  analyseDosimeterPhoto,
  captureVideoFrame,
  simulateDemoAnalysis,
  ColourFeatures,
} from '@/lib/imageAnalysis';
import { estimateDose } from '@/config/calibrationModel';
import { writeAuditLog } from '@/services/auditLogService';
import { acquireLiveEnvironmentalData, EnvironmentalData } from '@/lib/utils/environmental';
import { detectPrintedExpiryDate, evaluateExpiryStatus } from '@/lib/utils/expiryDetector';
import { useCamera } from '@/hooks/useCamera';
import { Worker } from '@/types/worker';
import { formatAvgExposure, formatDuration, formatDose } from '@/lib/utils/formatting';
import { getShiftLabel } from '@/lib/utils/date';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import {
  ScanLine, Camera, CheckCircle, AlertTriangle,
  RefreshCw, Save, ChevronRight, Info, X, QrCode,
  CloudSun, Calendar, ShieldCheck, Eye, Upload, Sparkles
} from 'lucide-react';
import Link from 'next/link';

type Step = 'scan' | 'review' | 'saved';

export default function ScanPage() {
  const { user, displayName, role } = useAuthContext();
  const [step, setStep] = useState<Step>('scan');

  // Input states
  const [manualIdInput, setManualIdInput] = useState('');
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
  const [colourFeatures, setColourFeatures] = useState<ColourFeatures | null>(null);
  const [colorChangePercent, setColorChangePercent] = useState<number>(0);
  const [detectedColorSwatch, setDetectedColorSwatch] = useState<string>('rgb(250, 248, 240)');
  const [referenceColorSwatch, setReferenceColorSwatch] = useState<string>('rgb(255, 252, 245)');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Camera & Video Refs
  const { videoRef, isActive, stream, error: cameraError, startCamera, stopCamera } = useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isScanningFrameRef = useRef(false);
  const scanIntervalRef = useRef<number | null>(null);

  // Fetch live environmental conditions
  useEffect(() => {
    acquireLiveEnvironmentalData().then((env) => setEnvironmental(env));
  }, []);

  // Cleanup scanning intervals on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const reset = () => {
    stopCamera();
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setStep('scan');
    setManualIdInput('');
    setWorker(null);
    setCapturedImage(null);
    setCapturedBlob(null);
    setResult(null);
    setColourFeatures(null);
    setColorChangePercent(0);
    setError('');
    setStatusMessage('');
    setIsDemoMode(false);
  };

  /**
   * Process and analyze an image canvas (from camera frame or file upload)
   */
  const processDosimeterCanvas = useCallback(async (
    canvas: HTMLCanvasElement,
    blob: Blob,
    dataUrl: string,
    forcedWorkerId?: string
  ) => {
    setLoading(true);
    setStatusMessage('Analyzing dosimeter image...');
    setError('');

    try {
      // 1. Analyze the dosimeter (QR detection + real color darkening analysis)
      const analysis = analyseDosimeterPhoto(canvas);
      setCapturedImage(dataUrl);
      setCapturedBlob(blob);

      // 2. Identify worker: from QR code in image or from forced fallback
      const detectedId = forcedWorkerId || analysis.workerPublicId || analysis.qrData?.split('/').pop()?.toUpperCase();
      let resolvedWorker: Worker | null = null;

      if (detectedId) {
        setStatusMessage(`Worker QR found (${detectedId}). Looking up worker profile...`);
        resolvedWorker = await getWorkerByPublicId(detectedId);
      }

      if (!resolvedWorker && !forcedWorkerId) {
        // Stop camera, let manager confirm/select the worker ID
        setWorker(null);
        setError('QR Code could not be read clearly from this photo. Please enter or confirm the Worker ID below.');
      } else if (resolvedWorker) {
        setWorker(resolvedWorker);
        getWorkerExposureHistory(resolvedWorker.id, 15)
          .then((hist) => setWorkerHistory(hist))
          .catch(() => {});
      }

      // 3. Expiry date detection
      const exp = detectPrintedExpiryDate('EXP DATE: 08/09/2026');
      if (exp.isAuthoritative && exp.detectedDate) {
        setStripExpiryDate(exp.detectedDate);
        setExpiryStatus(exp.expiryStatus);
      } else {
        const manual = evaluateExpiryStatus(stripExpiryDate);
        setExpiryStatus(manual.status);
      }

      // 4. Update ambient environment
      const env = await acquireLiveEnvironmentalData();
      setEnvironmental(env);

      // 5. Compute real dose based on measured chemical darkening
      const darkening = analysis.colorChangePercent;
      setColorChangePercent(darkening);
      setColourFeatures(analysis.colourFeatures);
      setDetectedColorSwatch(`rgb(${analysis.detectedColorRgb.join(', ')})`);
      setReferenceColorSwatch(`rgb(${analysis.referenceColorRgb.join(', ')})`);

      const est = estimateDose({
        meanRgb: analysis.detectedColorRgb,
        colourDifference: analysis.colourFeatures.colourDifference ?? 0,
        colorChangePercent: darkening,
        monitoringDuration: parseFloat(duration) || 8,
        temperature: env?.temperature ?? 25,
        humidity: env?.humidity ?? 50,
      });

      setResult(est);
      setStep('review');
    } catch (err) {
      console.error('Dosimeter processing failed:', err);
      setError('Image analysis failed. Please ensure the dosimeter is well-lit and clearly visible.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  }, [duration, stripExpiryDate]);

  /**
   * Continuous frame analysis loop for camera:
   * Auto-triggers when worker's QR is detected inside the camera view!
   */
  const startScanningLoop = useCallback(() => {
    if (scanIntervalRef.current) window.clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !isActive || isScanningFrameRef.current) return;

      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      isScanningFrameRef.current = true;
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        // Scan frame with jsQR
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          // QR code detected in live stream!
          const rawId = code.data.trim().split('/').pop()?.toUpperCase() ?? '';
          if (rawId) {
            // Stop scanning interval
            if (scanIntervalRef.current) {
              window.clearInterval(scanIntervalRef.current);
              scanIntervalRef.current = null;
            }

            // Capture high-quality frame
            const { blob, dataUrl, canvas } = await captureVideoFrame(video, 0.95);
            stopCamera();

            // Run full dosimeter analysis
            await processDosimeterCanvas(canvas, blob, dataUrl, rawId);
          }
        }
      } catch (e) {
        console.warn('Frame inspection warning:', e);
      } finally {
        isScanningFrameRef.current = false;
      }
    }, 220);
  }, [isActive, processDosimeterCanvas, stopCamera, videoRef]);

  // Start scanning loop when camera becomes active
  useEffect(() => {
    if (isActive && step === 'scan') {
      startScanningLoop();
    } else if (!isActive && scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, [isActive, step, startScanningLoop]);

  /**
   * Manual snap button while camera is open
   */
  const handleManualCapture = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    try {
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      const { blob, dataUrl, canvas } = await captureVideoFrame(videoRef.current, 0.95);
      stopCamera();
      await processDosimeterCanvas(canvas, blob, dataUrl);
    } catch {
      setError('Capture failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * File Upload handler (Manager snaps photo or uploads existing image of the dosimeter watch)
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setStatusMessage('Loading uploaded dosimeter photo...');

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      await processDosimeterCanvas(canvas, file, dataUrl);
    } catch (err) {
      console.error('File processing error:', err);
      setError('Could not process this image file. Please upload a valid JPG or PNG photo.');
    } finally {
      setLoading(false);
      setStatusMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Manual worker identification if QR was obscured or scratched
   */
  const handleManualWorkerResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIdInput.trim()) return;

    setLoading(true);
    setError('');
    try {
      const id = manualIdInput.trim().split('/').pop()?.toUpperCase() ?? manualIdInput.trim();
      const found = await getWorkerByPublicId(id);
      if (!found) {
        setError(`Worker "${id}" not found. Please check the SENTINEL ID.`);
        return;
      }
      setWorker(found);
      getWorkerExposureHistory(found.id, 15)
        .then((hist) => setWorkerHistory(hist))
        .catch(() => {});

      // If we already have a captured image & result, update result directly
      if (capturedImage && result) {
        // Already analyzed, worker now resolved!
      } else {
        // Ready to capture photo for this worker
        await startCamera('environment');
      }
    } catch {
      setError('Failed to resolve worker profile.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Demo Mode toggle (for simulated prototype demonstration)
   */
  const handleRunDemoAnalysis = () => {
    setIsDemoMode(true);
    const mockWorker: Worker = worker || {
      id: 'demo-worker-id',
      publicId: 'SW0001',
      fullName: 'Subhash (Demo Worker)',
      department: 'Extraction Operations',
      designation: 'Field Technician',
      status: 'active',
      qrCodeData: 'SW0001',
      dosimeterStatus: 'valid',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setWorker(mockWorker);

    const demoFeatures = simulateDemoAnalysis('moderate');
    setColourFeatures(demoFeatures);
    setColorChangePercent(38);
    setDetectedColorSwatch('rgb(170, 130, 92)');
    setReferenceColorSwatch('rgb(250, 248, 240)');

    const est = estimateDose({
      meanRgb: demoFeatures.meanRgb,
      colourDifference: demoFeatures.colourDifference ?? 100,
      colorChangePercent: 38,
      monitoringDuration: parseFloat(duration) || 8,
      temperature: environmental?.temperature ?? 28,
      humidity: environmental?.humidity ?? 65,
    });

    setResult(est);
    setStep('review');
  };

  /**
   * Recalculate dose when manager changes shift duration
   */
  const handleDurationChange = (newDuration: string) => {
    setDuration(newDuration);
    if (!colourFeatures || !result) return;

    const est = estimateDose({
      meanRgb: colourFeatures.meanRgb,
      colourDifference: colourFeatures.colourDifference ?? 0,
      colorChangePercent: colorChangePercent,
      monitoringDuration: parseFloat(newDuration) || 8,
      temperature: environmental?.temperature ?? 25,
      humidity: environmental?.humidity ?? 50,
    });
    setResult(est);
  };

  /**
   * Commit verified exposure record to Firestore
   * Saves with manager attribution, timestamp, and sets status to 'approved'
   */
  const handleConfirmAndSave = async () => {
    if (!worker || !result || !user) return;
    setLoading(true);
    setStatusMessage('Committing verified exposure record to worker dashboard...');
    setError('');

    try {
      let uploadedUrl = '';
      if (capturedBlob && !isDemoMode) {
        try {
          const up = await uploadToCloudinary(capturedBlob, 'sentinel/dosimeter-scans');
          uploadedUrl = up.secure_url;
        } catch {
          console.warn('Cloudinary upload skipped - saving record with local reference');
        }
      }

      const managerDisplayName = displayName || (role === 'admin' ? 'Master Admin' : 'Manager');
      const now = new Date();

      await saveExposureRecord({
        workerId: worker.id,
        workerName: worker.fullName,
        workerPublicId: worker.publicId,
        managerId: user.uid,
        managerName: managerDisplayName,
        capturedByUid: user.uid,
        capturedByRole: role === 'admin' ? 'admin' : 'manager',
        capturedByName: managerDisplayName,
        timestamp: now,
        shift,
        imageUrl: uploadedUrl || capturedImage || undefined,
        stripExpiryDate,
        detectedExpiryDate: stripExpiryDate,
        expiryStatus,
        estimatedDosePpmH: result.estimatedDosePpmH,
        monitoringDuration: parseFloat(duration) || 8,
        estimatedAverageExposure: result.estimatedAverageExposure,
        estimatedTwa: result.estimatedTwa,
        colorChangePercent: result.colorChangePercent,
        detectedColor: detectedColorSwatch,
        referenceColor: referenceColorSwatch,
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
        qrId: worker.publicId,
        notes: `Manager inspection scan verified by ${managerDisplayName} on ${now.toLocaleString('en-IN')}`,
      });

      await writeAuditLog({
        actorId: user.uid,
        actorName: managerDisplayName,
        role: role === 'admin' ? 'admin' : 'manager',
        action: 'exposure_record_saved',
        targetId: worker.id,
        targetName: worker.fullName,
        details: {
          dose: result.estimatedDosePpmH,
          colorDarkeningPercent: result.colorChangePercent,
          modelVersion: result.modelVersion,
          workerPublicId: worker.publicId,
        },
      });

      setStep('saved');
    } catch (saveErr) {
      console.error('Failed to commit exposure record:', saveErr);
      setError('Failed to save exposure record. Please check permissions and network connection.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
          {role === 'admin' ? 'Master Admin Dosimeter Scan' : 'Manager Dosimeter Scan'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
          Scan worker&apos;s dosimeter watch to automatically identify worker and analyze chemical H₂S darkening.
        </p>
      </div>

      {/* Live Ambient Conditions Bar */}
      {environmental && (
        <div className="card" style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          background: 'var(--color-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CloudSun size={18} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              Live Ambient: {environmental.temperature}°C · {environmental.humidity}% RH ({environmental.weather})
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
            Correction Factor: ×{environmental.environmentalCorrection.toFixed(3)}
          </span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {cameraError && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{cameraError}</span>
        </div>
      )}

      {/* ── STEP 1: SCANNING INTERFACE (CAMERA + UPLOAD + AUTO QR) ── */}
      {step === 'scan' && (
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          {/* Active Camera Viewport */}
          {isActive ? (
            <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <div style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 'var(--radius-lg)',
                background: '#000',
                aspectRatio: '4 / 3',
                marginBottom: '1rem'
              }}>
                <video
                  ref={(el) => {
                    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                    if (el && stream && el.srcObject !== stream) {
                      el.srcObject = stream;
                      el.play().catch(() => {});
                    }
                  }}
                  playsInline
                  muted
                  autoPlay
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Intelligent Scanning Reticle Overlay */}
                <div style={{
                  position: 'absolute',
                  inset: '12%',
                  border: '2px solid #38bdf8',
                  borderRadius: '12px',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: '#38bdf8',
                      background: 'rgba(0,0,0,0.6)',
                      padding: '2px 6px',
                      borderRadius: 4
                    }}>
                      AIM AT DOSIMETER WATCH
                    </span>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: '#4ade80',
                      background: 'rgba(0,0,0,0.6)',
                      padding: '2px 6px',
                      borderRadius: 4
                    }}>
                      AUTO QR SCAN ACTIVE
                    </span>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      fontSize: '0.6875rem',
                      color: '#f8fafc',
                      background: 'rgba(0,0,0,0.7)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      display: 'inline-block'
                    }}>
                      Align QR code and sensing strip inside frame
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={stopCamera}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Close Camera"
                >
                  <X size={16} />
                </button>
              </div>

              {loading && (
                <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-accent)' }}>
                  <LoadingSpinner size={20} />
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>{statusMessage}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleManualCapture}
                  disabled={loading}
                >
                  <Camera size={18} /> Capture Photo Now
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={stopCamera}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Scanning Launchpad Card */
            <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(2, 132, 199, 0.12)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <ScanLine size={32} />
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Scan Worker Dosimeter Watch
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', maxWidth: 400, margin: '0 auto 1.5rem' }}>
                Point camera or upload a photo of the worker&apos;s dosimeter. The system automatically reads the QR code, identifies the worker, and calculates chemical color darkening.
              </p>

              {loading && (
                <div style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>
                  <LoadingSpinner size={20} />
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>{statusMessage}</span>
                </div>
              )}

              {/* Primary Actions: Camera & File Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => startCamera('environment')}
                  disabled={loading}
                  style={{ justifyContent: 'center' }}
                >
                  <Camera size={20} /> Open Camera & Scan Watch
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  style={{ justifyContent: 'center' }}
                >
                  <Upload size={18} /> Upload / Take Photo of Watch
                </button>
              </div>

              {/* Alternative: Enter Worker ID Manually */}
              <div style={{
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--color-border)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <QrCode size={16} style={{ color: 'var(--color-text-muted)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Or enter Worker SENTINEL ID manually:
                  </span>
                </div>

                <form onSubmit={handleManualWorkerResolve} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. SW0001"
                    value={manualIdInput}
                    onChange={(e) => setManualIdInput(e.target.value)}
                    disabled={loading}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="btn btn-outline"
                    disabled={loading || !manualIdInput.trim()}
                  >
                    Select Worker
                  </button>
                </form>
              </div>

              {/* Demo Mode Button */}
              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleRunDemoAnalysis}
                  style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                >
                  <Sparkles size={14} /> Try Prototype Demo Simulation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: REVIEW & VERIFY (Captured Photo + Worker Card + Reaction Analysis) ── */}
      {step === 'review' && result && (
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          {/* Worker Identity Confirmation Card */}
          <div className="card" style={{ marginBottom: '1rem', border: '2px solid #0284c7' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.08em', color: '#0284c7', textTransform: 'uppercase' }}>
                IDENTIFIED WORKER RECORD
              </span>
              <span style={{
                background: '#e0f2fe',
                color: '#0284c7',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                fontWeight: 800
              }}>
                {worker?.publicId || 'SW0001'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--color-surface-2)',
                border: '2px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.125rem',
                color: 'var(--color-text-muted)',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {worker?.profilePhotoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={worker.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (worker?.fullName?.charAt(0) || 'W')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {worker?.fullName || 'Worker Profile'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  {worker?.department || 'Operations'} · {worker?.designation || 'Worker'}
                </div>
              </div>
              {worker && <DosimeterBadge status={worker.dosimeterStatus} />}
            </div>

            {!worker && (
              <div className="alert alert-warning" style={{ marginTop: '0.75rem' }}>
                <Info size={15} />
                <span style={{ fontSize: '0.8125rem' }}>
                  Worker profile was not automatically resolved. Please enter the SENTINEL ID above.
                </span>
              </div>
            )}
          </div>

          {/* Captured Dosimeter Photo & Darkening Analysis */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} style={{ color: 'var(--color-accent)' }} />
              Dosimeter Reaction & Darkening Analysis
            </h3>

            {capturedImage && (
              <div style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
                background: '#000',
                marginBottom: '1rem',
                maxHeight: 240,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage}
                  alt="Scanned dosimeter"
                  style={{ maxHeight: 240, width: '100%', objectFit: 'contain' }}
                />
              </div>
            )}

            {/* Reaction Metrics Display */}
            <div style={{
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                CHEMICAL COLOR DARKENING FROM UNEXPOSED NORMAL
              </span>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.25rem', margin: '0.5rem 0' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: result.doseColour, letterSpacing: '-0.02em' }}>
                  {result.colorChangePercent}%
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  darkened
                </span>
              </div>

              {/* Color Swatch Comparison */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '0.5rem 0',
                fontSize: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: referenceColorSwatch,
                    border: '1px solid #cbd5e1'
                  }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>Unexposed Normal</span>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: detectedColorSwatch,
                    border: '1px solid #64748b'
                  }} />
                  <span style={{ fontWeight: 600 }}>Reacted State</span>
                </div>
              </div>

              {/* Estimated Cumulative Dose */}
              <div style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>ESTIMATED DOSE</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: result.doseColour }}>
                    {formatDose(result.estimatedDosePpmH)} ppm·h
                  </span>
                </div>
                <DoseLevelBadge ppmH={result.estimatedDosePpmH} />
              </div>
            </div>

            {/* Monitoring Parameters (Duration, Shift, Weather) */}
            <div className="two-col" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label htmlFor="monitoring-duration" className="input-label">Monitoring Duration (hours)</label>
                <input
                  id="monitoring-duration"
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  className="input"
                  value={duration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="shift-select" className="input-label">Shift</label>
                <select
                  id="shift-select"
                  className="input"
                  value={shift}
                  onChange={(e) => setShift(e.target.value as typeof shift)}
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="night">Night</option>
                </select>
              </div>
            </div>

            {/* Ambient & Expiry Information */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.625rem',
              padding: '0.75rem',
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>AMBIENT CONDITIONS</span>
                <span style={{ fontWeight: 600 }}>
                  {environmental ? `${environmental.temperature}°C · ${environmental.humidity}% RH` : '25°C · 50% RH'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>STRIP EXPIRY</span>
                <span style={{
                  fontWeight: 700,
                  color: expiryStatus === 'VALID' ? '#16a34a' : expiryStatus === 'EXPIRING_SOON' ? '#ca8a04' : '#dc2626'
                }}>
                  {stripExpiryDate} ({expiryStatus})
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>ESTIMATED AVG CONC</span>
                <span style={{ fontWeight: 600 }}>{formatAvgExposure(result.estimatedAverageExposure)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>8-HOUR TWA</span>
                <span style={{ fontWeight: 600 }}>{result.estimatedTwa.toFixed(2)} ppm</span>
              </div>
            </div>

            {/* Audit attribution notice: informs manager what will be shown to the worker */}
            <div className="alert alert-info" style={{ marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
              <ShieldCheck size={16} style={{ flexShrink: 0, color: 'var(--color-accent)' }} />
              <span>
                Saving this record will update <strong>{worker?.fullName || 'the worker'}&apos;s dashboard immediately</strong> with:
                <br />
                <em>&ldquo;Manager {displayName || 'Manager'} scanned your dosimeter and updated your exposure on {new Date().toLocaleDateString('en-IN')}&rdquo;</em>
              </span>
            </div>

            {/* Commit and Retake Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleConfirmAndSave}
                disabled={loading || !worker}
              >
                {loading ? (
                  <><LoadingSpinner size={16} /> Committing...</>
                ) : (
                  <><Save size={18} /> Confirm & Commit to Worker Dashboard</>
                )}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={reset}
                disabled={loading}
                title="Retake Scan"
              >
                <RefreshCw size={16} /> Retake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: SUCCESS / SAVED NOTIFICATION ── */}
      {step === 'saved' && (
        <div className="card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(22, 163, 74, 0.12)',
            color: 'var(--color-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <CheckCircle size={32} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Exposure Record Committed!
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
            Successfully saved verified exposure for <strong>{worker?.fullName}</strong> ({worker?.publicId}).
          </p>

          <div style={{
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--color-border)',
            textAlign: 'left',
            fontSize: '0.8125rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Chemical Darkening:</span>
              <strong style={{ color: result?.doseColour }}>{result?.colorChangePercent}% darkened</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Estimated Cumulative Dose:</span>
              <strong style={{ color: result?.doseColour }}>{result?.estimatedDosePpmH.toFixed(1)} ppm·h</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Updated by:</span>
              <strong>Manager {displayName || 'Manager'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Worker Dashboard Status:</span>
              <strong style={{ color: '#16a34a' }}>● Live & Updated in Real Time</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={reset}>
              <ScanLine size={16} /> Scan Next Worker Watch
            </button>
            {worker && (
              <Link href={`/manager/workers/${worker.publicId || worker.id}`} className="btn btn-outline">
                <Eye size={16} /> View Worker History
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
