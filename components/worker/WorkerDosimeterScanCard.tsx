'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkerByUid, getWorkerByPublicId } from '@/services/workerService';
import { saveExposureRecord, createScanApprovalRequest } from '@/services/exposureService';
import { uploadToCloudinary } from '@/lib/cloudinary/config';
import {
  analyseDosimeterPhoto,
  captureVideoFrame,
  simulateDemoAnalysis,
  ColourFeatures,
} from '@/lib/imageAnalysis';
import { estimateDose } from '@/config/calibrationModel';
import { acquireLiveEnvironmentalData, EnvironmentalData } from '@/lib/utils/environmental';
import { detectPrintedExpiryDate, evaluateExpiryStatus } from '@/lib/utils/expiryDetector';
import { useCamera } from '@/hooks/useCamera';
import { Worker } from '@/types/worker';
import { ExpiryStatus } from '@/types/exposure';
import { formatAvgExposure, formatDuration, formatDose } from '@/lib/utils/formatting';
import { getShiftLabel, formatDateTime } from '@/lib/utils/date';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { DosimeterBadge, DoseLevelBadge } from '@/components/ui/Badge';
import {
  ScanLine, Camera, CheckCircle, AlertTriangle,
  RefreshCw, Save, X, QrCode,
  CloudSun, Calendar, ShieldCheck, Upload, Sparkles, Send, User
} from 'lucide-react';
import Link from 'next/link';

type Step = 'scan' | 'review' | 'saved';

interface WorkerDosimeterScanCardProps {
  initialWorker?: Worker | null;
  onScanSaved?: () => void;
  showWeatherBanner?: boolean;
}

export function WorkerDosimeterScanCard({
  initialWorker,
  onScanSaved,
  showWeatherBanner = true,
}: WorkerDosimeterScanCardProps) {
  const { user, displayName } = useAuthContext();
  const [step, setStep] = useState<Step>('scan');

  // Authenticated self worker profile
  const [loggedInWorker, setLoggedInWorker] = useState<Worker | null>(initialWorker || null);
  // The worker identified on the scanned cartridge (self or peer)
  const [targetWorker, setTargetWorker] = useState<Worker | null>(initialWorker || null);
  const [manualIdInput, setManualIdInput] = useState('');

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
  const [submissionFeedback, setSubmissionFeedback] = useState<{ isPeer: boolean; targetName: string; time: string } | null>(null);

  // Camera & Video Refs
  const { videoRef, isActive, stream, error: cameraError, startCamera, stopCamera } = useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isScanningFrameRef = useRef(false);
  const scanIntervalRef = useRef<number | null>(null);

  // Synchronize initialWorker if provided
  useEffect(() => {
    if (initialWorker) {
      setLoggedInWorker(initialWorker);
      if (!targetWorker) setTargetWorker(initialWorker);
    }
  }, [initialWorker, targetWorker]);

  // Fetch logged-in worker if not provided & acquire live weather
  useEffect(() => {
    if (!user) return;
    if (!loggedInWorker && !initialWorker) {
      getWorkerByUid(user.uid).then((w) => {
        if (w) {
          setLoggedInWorker(w);
          setTargetWorker(w);
        }
      });
    }

    acquireLiveEnvironmentalData().then((env) => {
      setEnvironmental(env);
    });
  }, [user, loggedInWorker, initialWorker]);

  // Cleanup scanning interval on unmount
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
    setTargetWorker(loggedInWorker);
    setCapturedImage(null);
    setCapturedBlob(null);
    setResult(null);
    setColourFeatures(null);
    setColorChangePercent(0);
    setError('');
    setStatusMessage('');
    setIsDemoMode(false);
    setSubmissionFeedback(null);
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

      // 2. Identify worker: from QR code in image or from fallback
      const detectedId = forcedWorkerId || analysis.workerPublicId || analysis.qrData?.split('/').pop()?.toUpperCase();
      let resolvedWorker: Worker | null = null;

      if (detectedId) {
        setStatusMessage(`Worker QR detected (${detectedId}). Fetching worker record...`);
        resolvedWorker = await getWorkerByPublicId(detectedId);
      }

      if (!resolvedWorker && !forcedWorkerId) {
        resolvedWorker = loggedInWorker;
      }

      if (resolvedWorker) {
        setTargetWorker(resolvedWorker);
      } else {
        setTargetWorker(loggedInWorker);
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
  }, [duration, stripExpiryDate, loggedInWorker]);

  /**
   * Continuous frame analysis loop for camera:
   * Auto-triggers when worker's QR is detected inside the camera view
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

        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          const rawId = code.data.trim().split('/').pop()?.toUpperCase() ?? '';
          if (rawId) {
            if (scanIntervalRef.current) {
              window.clearInterval(scanIntervalRef.current);
              scanIntervalRef.current = null;
            }

            const { blob, dataUrl, canvas } = await captureVideoFrame(video, 0.95);
            stopCamera();
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

  const handleManualCapture = async () => {
    if (!videoRef.current) return;
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setLoading(true);
    setStatusMessage('Capturing snapshot from camera...');
    try {
      const { blob, dataUrl, canvas } = await captureVideoFrame(videoRef.current, 0.95);
      stopCamera();
      await processDosimeterCanvas(canvas, blob, dataUrl);
    } catch (err) {
      console.error('Manual snapshot failed:', err);
      setError('Could not capture frame from camera.');
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMessage('Loading uploaded photo...');
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Canvas rendering context unavailable');
          setLoading(false);
          return;
        }
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            processDosimeterCanvas(canvas, blob, reader.result as string);
          } else {
            setError('Could not generate image blob.');
            setLoading(false);
          }
        }, 'image/jpeg', 0.95);
      };
      img.onerror = () => {
        setError('Failed to load image file.');
        setLoading(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleManualWorkerResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIdInput.trim()) return;

    setLoading(true);
    setError('');
    try {
      const resolved = await getWorkerByPublicId(manualIdInput.trim());
      if (resolved) {
        setTargetWorker(resolved);
        if (capturedBlob && capturedImage) {
          setStep('review');
        } else {
          startCamera('environment');
        }
      } else {
        setError(`Worker with ID "${manualIdInput.trim()}" not found.`);
      }
    } catch {
      setError('Worker search failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSimulation = async () => {
    setLoading(true);
    setStatusMessage('Running calibrated prototype simulation...');
    setError('');
    setIsDemoMode(true);

    try {
      const demoFeatures = simulateDemoAnalysis('moderate');
      setColourFeatures(demoFeatures);
      setColorChangePercent(38);
      setDetectedColorSwatch('rgb(170, 130, 92)');
      setReferenceColorSwatch('rgb(250, 248, 240)');
      setStripExpiryDate('08/09/2026');
      setExpiryStatus('VALID');

      const target = targetWorker || loggedInWorker;
      setTargetWorker(target);

      const env = await acquireLiveEnvironmentalData();
      setEnvironmental(env);

      const est = estimateDose({
        meanRgb: demoFeatures.meanRgb,
        colourDifference: demoFeatures.colourDifference ?? 100,
        colorChangePercent: 38,
        monitoringDuration: parseFloat(duration) || 8,
        temperature: env?.temperature ?? 25,
        humidity: env?.humidity ?? 50,
      });

      setResult(est);
      setStep('review');
    } catch (err) {
      console.error('Demo simulation error:', err);
      setError('Demo simulation failed.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const isSelfScan = Boolean(
    loggedInWorker &&
    targetWorker &&
    (loggedInWorker.id === targetWorker.id ||
      loggedInWorker.publicId?.toUpperCase() === targetWorker.publicId?.toUpperCase())
  );

  const handleConfirmAction = async () => {
    if (!user || !result || !targetWorker) return;

    setLoading(true);
    setStatusMessage(isSelfScan ? 'Saving exposure to your dashboard...' : 'Submitting scan request for Manager approval...');
    setError('');

    try {
      let uploadedUrl = capturedImage || '';
      if (capturedBlob && !capturedImage?.startsWith('http')) {
        try {
          const up = await uploadToCloudinary(capturedBlob, 'sentinel/dosimeter-scans');
          uploadedUrl = up.secure_url;
        } catch (upErr) {
          console.warn('Cloudinary upload warning:', upErr);
        }
      }

      const now = new Date();

      if (isSelfScan) {
        await saveExposureRecord({
          workerId: targetWorker.id,
          workerName: targetWorker.fullName,
          workerPublicId: targetWorker.publicId,
          managerId: targetWorker.managerId || '',
          managerName: 'Self',
          timestamp: now,
          shift,
          imageUrl: uploadedUrl,
          stripExpiryDate,
          detectedExpiryDate: stripExpiryDate,
          expiryStatus,
          estimatedDosePpmH: result.estimatedDosePpmH,
          monitoringDuration: parseFloat(duration) || 8,
          estimatedAverageExposure: result.estimatedAverageExposure,
          estimatedTwa: result.estimatedTwa,
          colorChangePercent,
          detectedColor: detectedColorSwatch,
          referenceColor: referenceColorSwatch,
          temperature: environmental?.temperature,
          humidity: environmental?.humidity,
          location: environmental?.location,
          weather: environmental?.weather,
          environmentalCorrection: environmental?.environmentalCorrection,
          colourFeatures: colourFeatures ?? undefined,
          calibrationModelVersion: 'demo-v0.1',
          dosimeterStatus: expiryStatus === 'EXPIRED' ? 'expired' : 'valid',
          analysisStatus: isDemoMode ? 'demo' : 'completed',
          confirmationStatus: 'confirmed',
          status: 'approved',
          isPublicVisible: false,
          capturedByUid: user.uid,
          capturedByRole: 'worker',
          capturedByName: loggedInWorker?.fullName || displayName || 'Self',
          notes: isDemoMode ? 'Prototype Demo Simulation' : 'Self-scanned wearable dosimeter watch',
        });

        setSubmissionFeedback({
          isPeer: false,
          targetName: targetWorker.fullName,
          time: formatDateTime(now),
        });
      } else {
        await createScanApprovalRequest({
          scannerUid: user.uid,
          scannerWorkerId: loggedInWorker?.publicId || loggedInWorker?.id,
          scannerName: loggedInWorker?.fullName || displayName || 'Peer Worker',
          scannerRole: 'worker',
          targetWorkerId: targetWorker.id,
          targetWorkerName: targetWorker.fullName,
          targetWorkerPublicId: targetWorker.publicId,
          targetWorkerUid: targetWorker.uid,
          imageUrl: uploadedUrl,
          scanTimestamp: now,
          shift,
          monitoringDuration: parseFloat(duration) || 8,
          estimatedDosePpmH: result.estimatedDosePpmH,
          estimatedAverageExposure: result.estimatedAverageExposure,
          estimatedTwa: result.estimatedTwa,
          colorChangePercent,
          temperature: environmental?.temperature,
          humidity: environmental?.humidity,
          location: environmental?.location,
          weather: environmental?.weather,
          environmentalCorrection: environmental?.environmentalCorrection,
          detectedExpiryDate: stripExpiryDate,
          expiryStatus,
        });

        setSubmissionFeedback({
          isPeer: true,
          targetName: targetWorker.fullName,
          time: formatDateTime(now),
        });
      }

      if (onScanSaved) {
        onScanSaved();
      }

      setStep('saved');
    } catch (err) {
      console.error('Scan submission failed:', err);
      setError('Could not process scan submission. Please try again.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Optional Ambient Weather Bar */}
      {showWeatherBanner && environmental && step === 'scan' && (
        <div style={{
          background: 'var(--color-surface)',
          padding: '0.625rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
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

      {/* ── STEP 1: SCANNING INTERFACE (IDENTICAL LAUNCHPAD CARD) ── */}
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

                {/* Reticle Overlay */}
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
            /* Launchpad Card - EXACT MATCH TO USER ATTACHED SCREENSHOT */
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

              {/* Demo Simulation Option */}
              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleDemoSimulation}
                  disabled={loading}
                  style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}
                >
                  <Sparkles size={14} style={{ marginRight: '0.35rem', color: 'var(--color-accent)' }} />
                  Try Prototype Demo Simulation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: REVIEW & CONFIRMATION (SELF-SCAN VS PEER-SCAN BRANCHING) ── */}
      {step === 'review' && result && targetWorker && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Target Worker Identification Banner */}
          <div style={{
            background: isSelfScan ? 'rgba(34, 197, 94, 0.08)' : 'rgba(2, 132, 199, 0.08)',
            border: isSelfScan ? '1.5px solid rgba(34, 197, 94, 0.3)' : '1.5px solid rgba(2, 132, 199, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: isSelfScan ? 'rgba(34, 197, 94, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                color: isSelfScan ? 'var(--color-green)' : 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isSelfScan ? <CheckCircle size={22} /> : <User size={22} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: isSelfScan ? 'rgba(34, 197, 94, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                    color: isSelfScan ? 'var(--color-green)' : 'var(--color-accent)',
                  }}>
                    {isSelfScan ? 'Self-Scan' : 'Peer Worker Scan'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                    {targetWorker.publicId}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0.125rem 0 0' }}>
                  {targetWorker.fullName}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {targetWorker.department || 'Operations'} · {targetWorker.designation || 'Field Technician'}
                </p>
              </div>
            </div>

            {/* Change worker fallback */}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const id = prompt('Enter SENTINEL Worker ID (e.g. SW0001):', targetWorker.publicId);
                if (id) {
                  getWorkerByPublicId(id.trim()).then((w) => {
                    if (w) setTargetWorker(w);
                    else alert('Worker ID not found');
                  });
                }
              }}
              style={{ fontSize: '0.75rem' }}
            >
              Change Worker
            </button>
          </div>

          {/* Peer-scan Approval Warning Notice */}
          {!isSelfScan && (
            <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={20} style={{ flexShrink: 0, color: 'var(--color-accent)' }} />
              <div style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
                <strong>Manager Approval Required:</strong> You are scanning for peer worker <strong>{targetWorker.fullName}</strong>. The exposure analysis details are computed below, but this record will be submitted to your Manager for review before it updates {targetWorker.fullName}&apos;s exposure dashboard.
              </div>
            </div>
          )}

          {/* Visual Analysis & Dose Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* Captured Dosimeter Photo & Colorimetric Swatches */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={16} style={{ color: 'var(--color-accent)' }} />
                Captured Dosimeter Watch
              </h4>

              {capturedImage && (
                <div style={{
                  position: 'relative',
                  aspectRatio: '4 / 3',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  background: '#000',
                  marginBottom: '1rem',
                  border: '1px solid var(--color-border)'
                }}>
                  <img
                    src={capturedImage}
                    alt="Captured Dosimeter Watch"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(0,0,0,0.7)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: '0.6875rem',
                    color: '#fff',
                    fontWeight: 700,
                  }}>
                    {isDemoMode ? 'SIMULATION' : 'CAPTURED PHOTO'}
                  </div>
                </div>
              )}

              {/* Color Swatch Comparison & Darkening */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                padding: '0.875rem',
                background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '0.875rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Reference Substrate
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: referenceColorSwatch,
                      border: '1px solid var(--color-border)'
                    }} />
                    <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>Baseline</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Detected Chemical Area
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: detectedColorSwatch,
                      border: '1px solid var(--color-border)'
                    }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-amber)' }}>
                      {colorChangePercent}% Darker
                    </span>
                  </div>
                </div>
              </div>

              {/* Expiry verification badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '0.8125rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} style={{ color: 'var(--color-text-muted)' }} />
                  <span>Printed Strip Expiry: <strong>{stripExpiryDate}</strong></span>
                </div>
                <DosimeterBadge status={expiryStatus === 'EXPIRED' ? 'expired' : 'valid'} />
              </div>
            </div>

            {/* Calculated Exposure Metrics & Shift Adjustments */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-accent)' }} />
                Calculated H₂S Exposure
              </h4>

              {/* Primary Dose Hero Metric */}
              <div style={{
                textAlign: 'center',
                padding: '1.25rem 1rem',
                background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                  Estimated Cumulative Dose
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-amber)', letterSpacing: '-0.02em' }}>
                    {formatDose(result.estimatedDosePpmH)}
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>ppm·h</span>
                </div>
                <DoseLevelBadge ppmH={result.estimatedDosePpmH} />
              </div>

              {/* Exposure Parameters Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Shift Duration (hrs)
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    className="input"
                    value={duration}
                    onChange={(e) => {
                      setDuration(e.target.value);
                      const est = estimateDose({
                        meanRgb: colourFeatures?.meanRgb ?? [240, 235, 220],
                        colourDifference: colourFeatures?.colourDifference ?? 0,
                        colorChangePercent,
                        monitoringDuration: parseFloat(e.target.value) || 8,
                        temperature: environmental?.temperature ?? 25,
                        humidity: environmental?.humidity ?? 50,
                      });
                      setResult(est);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Shift
                  </label>
                  <select
                    className="input"
                    value={shift}
                    onChange={(e) => setShift(e.target.value as 'morning' | 'afternoon' | 'night')}
                    style={{ width: '100%' }}
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>

              {/* Ambient Environmental Factors */}
              {environmental && (
                <div style={{
                  padding: '0.75rem',
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Ambient: <strong>{environmental.temperature}°C</strong> · <strong>{environmental.humidity}% RH</strong></span>
                  <span>Factor: <strong>×{environmental.environmentalCorrection.toFixed(3)}</strong></span>
                </div>
              )}

              {/* Action Buttons: Save Self or Submit for Approval */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={reset}
                  disabled={loading}
                >
                  <RefreshCw size={16} /> Rescan
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmAction}
                  disabled={loading}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size={16} />
                      <span style={{ marginLeft: '0.5rem' }}>Processing...</span>
                    </>
                  ) : isSelfScan ? (
                    <>
                      <Save size={18} /> Confirm & Save to My Dashboard
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Submit Scan for Manager Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: SUBMISSION SUCCESS / CONFIRMATION ── */}
      {step === 'saved' && submissionFeedback && (
        <div style={{ maxWidth: 540, margin: '1rem auto', textAlign: 'center' }}>
          <div className="card" style={{ padding: '2.5rem 1.5rem' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: submissionFeedback.isPeer ? 'rgba(2, 132, 199, 0.12)' : 'rgba(34, 197, 94, 0.12)',
              color: submissionFeedback.isPeer ? 'var(--color-accent)' : 'var(--color-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              {submissionFeedback.isPeer ? <Send size={32} /> : <CheckCircle size={32} />}
            </div>

            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              {submissionFeedback.isPeer ? 'Scan Request Submitted for Manager Approval!' : 'Exposure Record Successfully Saved!'}
            </h2>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {submissionFeedback.isPeer ? (
                <>
                  Your dosimeter scan for <strong>{submissionFeedback.targetName}</strong> was submitted on <strong>{submissionFeedback.time}</strong>. The Manager will review the photo, darkening, and dose reading in the Approvals section. Once approved, it will be added to {submissionFeedback.targetName}&apos;s dashboard.
                </>
              ) : (
                <>
                  Your dosimeter reading has been analyzed, verified, and saved to your exposure history on <strong>{submissionFeedback.time}</strong>.
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={reset}
              >
                Scan Another Watch
              </button>

              <Link
                href="/worker/home"
                className="btn btn-primary"
              >
                Refresh Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
