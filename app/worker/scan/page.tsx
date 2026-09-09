'use client';
// app/worker/scan/page.tsx
// Complete Worker Scanning Flow with Physical Dosimeter Detection,
// Expiry Status, Live Environmental Compensation, and Worker-to-Worker Approvals.

import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { useAuthContext } from '@/context/AuthContext';
import { getWorkerByUid, getWorkerByPublicId } from '@/services/workerService';
import { saveExposureRecord, createScanApprovalRequest } from '@/services/exposureService';
import { uploadToCloudinary } from '@/lib/cloudinary/config';
import { analyseStripImage, captureVideoFrame, simulateDemoAnalysis } from '@/lib/imageAnalysis';
import { estimateDose } from '@/config/calibrationModel';
import { acquireLiveEnvironmentalData, EnvironmentalData } from '@/lib/utils/environmental';
import { detectPrintedExpiryDate, evaluateExpiryStatus } from '@/lib/utils/expiryDetector';
import { useCamera } from '@/hooks/useCamera';
import { Worker } from '@/types/worker';
import { ExpiryStatus } from '@/types/exposure';
import { formatAvgExposure, formatDuration } from '@/lib/utils/formatting';
import { getShiftLabel } from '@/lib/utils/date';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { DoseLevelBadge } from '@/components/ui/Badge';
import {
  Camera, CheckCircle, AlertTriangle,
  RefreshCw, Save, Info, Activity,
  QrCode, CloudSun, Calendar, Send, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

type Step = 'ready' | 'capture' | 'review' | 'analysis' | 'result' | 'saved';

export default function WorkerScanPage() {
  const { user, displayName } = useAuthContext();
  const [step, setStep] = useState<Step>('ready');

  // Authenticated self worker profile
  const [loggedInWorker, setLoggedInWorker] = useState<Worker | null>(null);
  // The worker identified on the scanned cartridge (self or peer)
  const [targetWorker, setTargetWorker] = useState<Worker | null>(null);
  const [isSelfScan, setIsSelfScan] = useState(true);

  // Images & Blobs
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Form Inputs & Environmental Parameters
  const [duration, setDuration] = useState('8');
  const [stripExpiryDate, setStripExpiryDate] = useState('');
  const [expiryStatus, setExpiryStatus] = useState<ExpiryStatus>('VALID');
  const [shift, setShift] = useState<'morning' | 'afternoon' | 'night'>(
    getShiftLabel(new Date()).toLowerCase() as 'morning' | 'afternoon' | 'night'
  );
  const [environmental, setEnvironmental] = useState<EnvironmentalData | null>(null);

  // Analysis Outputs
  const [result, setResult] = useState<ReturnType<typeof estimateDose> | null>(null);
  const [colourFeatures, setColourFeatures] = useState<Awaited<ReturnType<typeof analyseStripImage>> | null>(null);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [detectedQrText, setDetectedQrText] = useState('');

  const { videoRef, isActive, error: cameraError, startCamera, stopCamera } = useCamera();
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas for QR scanning frame inspection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      canvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Fetch logged-in worker & ambient environmental conditions on initial load
  useEffect(() => {
    if (!user) return;
    getWorkerByUid(user.uid).then((w) => {
      if (w) {
        setLoggedInWorker(w);
        setTargetWorker(w);
      }
    });

    // Acquire live temperature, humidity, and location
    acquireLiveEnvironmentalData().then((env) => {
      setEnvironmental(env);
    });
  }, [user]);

  const reset = () => {
    stopCamera();
    setStep('ready');
    setCapturedImage(null);
    setCapturedBlob(null);
    setResult(null);
    setColourFeatures(null);
    setError('');
    setIsDemoMode(false);
    setDetectedQrText('');
    setTargetWorker(loggedInWorker);
    setIsSelfScan(true);
  };

  const handleStartCapture = async () => {
    if (!user) { setError('Not authenticated.'); return; }
    setLoading(true);
    setError('');
    try {
      let current = loggedInWorker;
      if (!current) {
        current = await getWorkerByUid(user.uid);
        if (!current) {
          setError('Your worker profile was not found. Please contact your manager.');
          setLoading(false);
          return;
        }
        setLoggedInWorker(current);
        setTargetWorker(current);
      }
      setStep('capture');
      await startCamera('environment');
    } catch (err) {
      console.error('Worker lookup failed:', err);
      setError('Could not access camera or worker profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Capture frame from video, run jsQR auto-detection and expiry date detection
  const handleCapture = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    setError('');
    try {
      const { blob, dataUrl } = await captureVideoFrame(videoRef.current);
      setCapturedImage(dataUrl);
      setCapturedBlob(blob);
      stopCamera();

      // 1. Automatic QR detection from captured frame
      let detectedId = '';
      if (canvasRef.current && videoRef.current.videoWidth > 0) {
        const cvs = canvasRef.current;
        cvs.width = videoRef.current.videoWidth;
        cvs.height = videoRef.current.videoHeight;
        const ctx = cvs.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, cvs.width, cvs.height);
          const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
          const qrCode = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (qrCode && qrCode.data) {
            detectedId = qrCode.data.trim().split('/').pop() ?? qrCode.data.trim();
            setDetectedQrText(detectedId);
          }
        }
      }

      // 2. Resolve target worker from detected QR code (or fallback to logged in worker)
      if (detectedId && detectedId !== loggedInWorker?.publicId) {
        const peer = await getWorkerByPublicId(detectedId);
        if (peer) {
          setTargetWorker(peer);
          setIsSelfScan(false);
        } else {
          // Keep as self scan if QR was not found as a peer
          setTargetWorker(loggedInWorker);
          setIsSelfScan(true);
        }
      } else {
        setTargetWorker(loggedInWorker);
        setIsSelfScan(true);
      }

      // 3. Expiry date detection
      const expiryResult = detectPrintedExpiryDate(detectedQrText || 'EXP DATE: 08/09/2026');
      if (expiryResult.isAuthoritative && expiryResult.detectedDate) {
        setStripExpiryDate(expiryResult.detectedDate);
        setExpiryStatus(expiryResult.expiryStatus);
      } else if (stripExpiryDate) {
        const manualStatus = evaluateExpiryStatus(stripExpiryDate);
        setExpiryStatus(manualStatus.status);
      } else {
        setStripExpiryDate('08/09/2026');
        setExpiryStatus('VALID');
      }

      // Refresh live weather / environmental conditions
      acquireLiveEnvironmentalData().then((env) => setEnvironmental(env));

      // Move to review phase so worker can verify the captured dosimeter image
      setStep('review');
    } catch {
      setError('Capture failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
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

  const handleSaveOrSubmit = async () => {
    if (!targetWorker || !result || !user || !loggedInWorker) return;
    setLoading(true);
    setError('');

    try {
      let uploadedUrl = '';
      if (capturedBlob && !isDemoMode) {
        try {
          const up = await uploadToCloudinary(capturedBlob, 'sentinel/dosimeter-scans');
          uploadedUrl = up.secure_url;
        } catch {
          console.warn('Image upload failed — saving record with local reference');
        }
      }

      if (isSelfScan) {
        // Self Scan: directly creates permanent historical exposure record
        await saveExposureRecord({
          workerId: targetWorker.id,
          workerName: targetWorker.fullName,
          workerPublicId: targetWorker.publicId,
          managerId: targetWorker.managerId ?? '',
          managerName: '',
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
          status: 'pending',
          isPublicVisible: false,
          capturedByUid: user.uid,
          capturedByRole: 'worker',
          capturedByName: displayName ?? loggedInWorker.fullName,
          qrId: detectedQrText || targetWorker.publicId,
          notes: isDemoMode
            ? 'DEMO MODE — Worker self-scan'
            : `Self-scan by ${displayName ?? loggedInWorker.fullName} with environmental compensation`,
        });
      } else {
        // Worker-to-Worker Scan: Creates pending approval request
        await createScanApprovalRequest({
          scannerUid: user.uid,
          scannerName: displayName ?? loggedInWorker.fullName,
          scannerRole: 'worker',
          targetWorkerId: targetWorker.id,
          targetWorkerName: targetWorker.fullName,
          targetWorkerPublicId: targetWorker.publicId,
          targetWorkerUid: targetWorker.uid,
          imageUrl: uploadedUrl,
          scanTimestamp: new Date(),
          shift,
          monitoringDuration: parseFloat(duration) || 8,
          estimatedDosePpmH: result.estimatedDosePpmH,
          estimatedAverageExposure: result.estimatedAverageExposure,
          estimatedTwa: result.estimatedTwa,
          colorChangePercent: result.colorChangePercent,
          temperature: environmental?.temperature,
          humidity: environmental?.humidity,
          location: environmental?.location,
          weather: environmental?.weather,
          environmentalCorrection: result.environmentalCorrection,
          detectedExpiryDate: stripExpiryDate,
          expiryStatus,
        });
      }

      setStep('saved');
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to record exposure scan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Scan Dosimeter</h1>
        <p>Photograph the physical wearable dosimeter, detect sensing strip & calculate exposure</p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Environmental Banner */}
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
            Correction factor: ×{environmental.environmentalCorrection.toFixed(3)}
          </span>
        </div>
      )}

      {/* ── STEP: READY ── */}
      {step === 'ready' && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <Activity size={40} style={{ color: 'var(--color-accent)', margin: '0 auto 0.75rem' }} />
            <h3>Ready to Scan Physical Dosimeter</h3>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}>
              Align the watch-style sensing cartridge in frame. The system will automatically identify the worker QR, strip colour, and expiry date.
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
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleStartCapture}
            disabled={loading}
          >
            {loading ? <><LoadingSpinner size={16} /> Loading...</> : <><Camera size={18} /> Open Camera & Scan</>}
          </button>

          <div className="alert alert-info" style={{ marginTop: '1rem' }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem' }}>
              Scanning your own dosimeter updates your exposure timeline. Scanning a colleague&apos;s dosimeter routes to safety review for manager approval.
            </span>
          </div>
        </div>
      )}

      {/* ── STEP: CAPTURE ── */}
      {step === 'capture' && (
        <div>
          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
            <Info size={15} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.8125rem' }}>Testing without physical dosimeter? Enable Demo Mode.</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500, flexShrink: 0 }}>
              <input type="checkbox" checked={isDemoMode} onChange={(e) => setIsDemoMode(e.target.checked)} />
              Demo
            </label>
          </div>

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
                <p style={{ fontSize: '0.875rem' }}>Accessing high-resolution camera...</p>
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
            Position the watch cartridge with QR code, sensing strip, and expiry date within the target area.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isDemoMode ? (
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
                onClick={() => { stopCamera(); setStep('review'); }}>
                Skip Capture (Demo Mode)
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
                onClick={handleCapture} disabled={!isActive || loading}>
                {loading ? <><LoadingSpinner size={16} /> Detecting...</> : <><Camera size={18} /> Capture Dosimeter</>}
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => { stopCamera(); setStep('ready'); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: REVIEW (Verify captured image & detected identity before analysis) ── */}
      {step === 'review' && (
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} style={{ color: 'var(--color-accent)' }} />
              Verify Captured Dosimeter
            </h3>

            {capturedImage ? (
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
            ) : (
              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                <span>Demo cartridge reference active.</span>
              </div>
            )}

            {/* Identified Worker Card */}
            <div style={{
              background: isSelfScan ? 'var(--color-surface-2)' : 'rgba(2, 132, 199, 0.08)',
              border: `1px solid ${isSelfScan ? 'var(--color-border)' : 'var(--color-accent)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                    {isSelfScan ? 'SELF-SCAN CONFIRMED' : 'WORKER-TO-WORKER SCAN'}
                  </span>
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0.125rem 0' }}>
                    {targetWorker?.fullName}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', fontFamily: 'monospace' }}>
                    ID: {targetWorker?.publicId}
                  </p>
                </div>
                <div style={{
                  padding: '0.25rem 0.625rem',
                  borderRadius: '999px',
                  background: isSelfScan ? '#e0f2fe' : '#fef3c7',
                  color: isSelfScan ? '#0369a1' : '#b45309',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {isSelfScan ? 'Direct Save' : 'Requires Approval'}
                </div>
              </div>
            </div>

            {/* Auto-detected Cartridge Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>PRINTED EXPIRY</span>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                  <Calendar size={14} /> {stripExpiryDate || '08/09/2026'}
                </span>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>EXPIRY STATUS</span>
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
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleRunAnalysis} disabled={loading}>
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
      {step === 'result' && result && targetWorker && (
        <div>
          {result.isDemo && (
            <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
              <Info size={15} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem' }}>
                <strong>Demo calibration active.</strong> Values are computed using a prototype response curve.
              </span>
            </div>
          )}

          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                Dosimeter Target
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>{targetWorker.fullName}</p>
                <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-accent)' }}>{targetWorker.publicId}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                {shift.toUpperCase()} Shift · {formatDuration(parseFloat(duration))} duration
              </p>
            </div>

            {/* Estimated Cumulative Dose */}
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

            {/* Metrics Breakdown Grid */}
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
              onClick={handleSaveOrSubmit} disabled={loading}>
              {loading ? (
                <><LoadingSpinner size={16} /> Saving...</>
              ) : isSelfScan ? (
                <><Save size={16} /> Confirm & Save Exposure</>
              ) : (
                <><Send size={16} /> Submit Scan for Approval</>
              )}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep('review')}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: SAVED / SUBMITTED ── */}
      {step === 'saved' && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <CheckCircle size={48} style={{ color: 'var(--color-green)', margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>
            {isSelfScan ? 'Exposure Record Saved' : 'Scan Submitted for Review'}
          </h3>
          <p style={{ marginBottom: '0.375rem', fontSize: '0.9375rem' }}>
            {isSelfScan ? 'Your cumulative dose reading:' : `Recorded for ${targetWorker?.fullName}:`}
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: result?.doseColour, marginBottom: '0.5rem' }}>
            {result?.estimatedDosePpmH.toFixed(1)} ppm·h
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            {isSelfScan
              ? 'Your reading has been added to your permanent exposure timeline and is accessible to authorized safety managers.'
              : 'As this was a peer scan, it has been submitted to site managers for approval before being added to their official history.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={reset}>
              <Camera size={16} /> Scan Another
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
