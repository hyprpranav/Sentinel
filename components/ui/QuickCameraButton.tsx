'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Check, Loader2, CheckCircle, AlertTriangle, Upload, Zap, ZoomIn } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary/config';
import { analyzeDosimeterImage } from '@/services/mockAiService';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface QuickCameraButtonProps {
  userId: string;
  role: 'admin' | 'manager' | 'worker';
  displayName?: string | null;
  variant?: 'icon' | 'card';
}

type OverlayState = 'idle' | 'camera' | 'preview' | 'uploading' | 'analysing' | 'done' | 'error';

export function QuickCameraButton({ userId, role, displayName, variant = 'icon' }: QuickCameraButtonProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [overlayState, setOverlayState] = useState<OverlayState>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [progress, setProgress] = useState(0);
  const [doseResult, setDoseResult] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);

  /* ── stop camera tracks ── */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  /* ── cleanup on unmount ── */
  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ── open camera ── */
  const openCamera = async () => {
    setCapturedImage(null);
    setCameraError('');
    setProgress(0);
    setDoseResult(null);
    setErrorMsg('');
    setTorchOn(false);
    setZoom(1);
    setOverlayState('camera');
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
      });
      streamRef.current = ms;
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch {
      setCameraError('Camera access denied or unavailable. Please allow camera permissions.');
    }
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean } | undefined;
    if (!track || !capabilities?.torch) return;
    const next = !torchOn;
    await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
    setTorchOn(next);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(String(reader.result));
      setOverlayState('preview');
    };
    reader.readAsDataURL(file);
  };

  /* ── capture frame ── */
  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setOverlayState('preview');
  };

  /* ── retake ── */
  const retake = () => {
    setCapturedImage(null);
    openCamera();
  };

  /* ── confirm → upload → analyse → save ── */
  const confirm = async () => {
    if (!capturedImage) return;
    try {
      // 1. Upload
      setOverlayState('uploading');
      const blob = await (await fetch(capturedImage)).blob();
      const result = await uploadToCloudinary(blob, 'sentinel/dosimeter-scans', setProgress);

      // 2. Analyse
      setOverlayState('analysing');
      const analysis = await analyzeDosimeterImage(capturedImage);

      // 3. Save to Firestore
      if (role === 'worker') {
        // Create an exposure record directly so it shows up in their heatmap
        await addDoc(collection(db, 'exposureRecords'), {
          workerId: userId,
          workerName: displayName ?? '',
          managerId: 'self',
          timestamp: serverTimestamp(),
          shift: 'morning',
          imageUrl: result.secure_url,
          estimatedDosePpmH: analysis.estimatedDosePpmH,
          monitoringDuration: 8, // default assumption for quick scan
          estimatedAverageExposure: analysis.estimatedDosePpmH / 8,
          colourFeatures: analysis.colourFeatures,
          calibrationModelVersion: '1.0.0',
          dosimeterStatus: 'active',
          status: 'approved',
          isPublicVisible: false,
          createdAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'photoSnapshots'), {
          userId,
          role,
          displayName: displayName ?? '',
          imageUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
          estimatedDosePpmH: analysis.estimatedDosePpmH,
          colourFeatures: analysis.colourFeatures,
          capturedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }

      setDoseResult(analysis.estimatedDosePpmH);
      setOverlayState('done');
    } catch (err) {
      console.error('Quick camera error:', err);
      setErrorMsg('Failed to save snapshot. Please try again.');
      setOverlayState('error');
    }
  };

  /* ── close overlay ── */
  const close = () => {
    stopCamera();
    setOverlayState('idle');
    setCapturedImage(null);
  };

  if (overlayState === 'idle') {
    if (variant === 'card') {
      return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem', border: '1px solid var(--color-accent)' }}>
          <div><p style={{ fontWeight: 700, marginBottom: 4 }}>Capture dosimeter reading</p><p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Take a photo or upload one for review before analysis.</p></div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={openCamera} className="btn btn-primary"><Camera size={17} /> Open Camera</button>
            <label className="btn btn-outline" style={{ cursor: 'pointer' }}><Upload size={16} /> Upload Photo<input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} /></label>
          </div>
        </div>
      );
    }
    return (
      <button
        onClick={openCamera}
        className="btn btn-ghost btn-icon"
        aria-label="Open camera scanner"
        title="Quick scan"
        style={{ position: 'relative' }}
      >
        <Camera size={18} aria-hidden="true" />
      </button>
    );
  }

  /* ── Full-screen overlay ── */
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>📷 Quick Scan</p>
          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>
            {overlayState === 'camera' && 'Point at the dosimeter strip'}
            {overlayState === 'preview' && 'Review captured image'}
            {overlayState === 'uploading' && `Uploading… ${progress}%`}
            {overlayState === 'analysing' && 'Analysing with AI…'}
            {overlayState === 'done' && 'Snapshot saved!'}
            {overlayState === 'error' && 'Something went wrong'}
          </p>
        </div>
        <button
          onClick={close}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8 }}
          aria-label="Close camera"
        >
          <X size={22} />
        </button>
      </div>

      {/* Viewport */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {overlayState === 'camera' && !cameraError && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }}
          />
        )}

        {overlayState === 'camera' && cameraError && (
          <div style={{ color: '#fff', textAlign: 'center', padding: '2rem' }}>
            <AlertTriangle size={40} style={{ color: '#f59e0b', marginBottom: 12 }} />
            <p>{cameraError}</p>
          </div>
        )}

        {overlayState === 'preview' && capturedImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={capturedImage} alt="Captured" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}

        {(overlayState === 'uploading' || overlayState === 'analysing') && (
          <div style={{ color: '#fff', textAlign: 'center' }}>
            <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>
              {overlayState === 'uploading' ? `Uploading… ${progress}%` : 'AI is analysing…'}
            </p>
            {overlayState === 'uploading' && (
              <div style={{ width: 200, height: 6, background: '#333', borderRadius: 99, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#38bdf8', transition: 'width 0.2s' }} />
              </div>
            )}
          </div>
        )}

        {overlayState === 'done' && (
          <div style={{ color: '#fff', textAlign: 'center', padding: '2rem' }}>
            <CheckCircle size={56} style={{ color: '#22c55e', marginBottom: 16 }} />
            <p style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Snapshot saved!</p>
            {doseResult !== null && (
              <p style={{ opacity: 0.75 }}>
                Estimated dose: <strong style={{ color: '#38bdf8' }}>{doseResult.toFixed(1)} ppm·h</strong>
              </p>
            )}
            <button onClick={close} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              Done
            </button>
          </div>
        )}

        {overlayState === 'error' && (
          <div style={{ color: '#fff', textAlign: 'center', padding: '2rem' }}>
            <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: 16 }} />
            <p>{errorMsg}</p>
            <button onClick={close} className="btn btn-outline" style={{ marginTop: '1rem', color: '#fff', borderColor: '#fff' }}>
              Close
            </button>
          </div>
        )}

        {/* Guide frame */}
        {overlayState === 'camera' && !cameraError && (
          <div style={{
            position: 'absolute',
            width: 'min(78vw, 420px)',
            aspectRatio: '1 / 1',
            border: '2px dashed rgba(255,255,255,0.7)',
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
            pointerEvents: 'none',
          }} />
        )}

        {overlayState === 'camera' && !cameraError && (
          <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
            <button onClick={toggleTorch} className="btn btn-ghost btn-sm" style={{ color: '#fff', background: torchOn ? '#f59e0b' : 'rgba(0,0,0,.55)' }} title="Toggle torch"><Zap size={16} /></button>
            <button onClick={() => setZoom((value) => value >= 2 ? 1 : value + 0.5)} className="btn btn-ghost btn-sm" style={{ color: '#fff', background: 'rgba(0,0,0,.55)' }} title="Zoom"><ZoomIn size={16} /> {zoom.toFixed(1)}x</button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Controls */}
      {(overlayState === 'camera' || overlayState === 'preview') && (
        <div style={{
          padding: '1.75rem 2rem',
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          flexShrink: 0,
        }}>
          {overlayState === 'camera' && !cameraError && (
            <button
              onClick={capture}
              aria-label="Capture photo"
              style={{
                width: 68, height: 68,
                borderRadius: '50%',
                background: '#fff',
                border: '4px solid #38bdf8',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Camera size={26} color="#0f172a" />
            </button>
          )}

          {overlayState === 'preview' && (
            <>
              <label className="btn btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Upload size={16} /> Upload another<input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} /></label>
              <button onClick={retake} className="btn btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
                <RefreshCw size={16} /> Retake
              </button>
              <button onClick={confirm} className="btn btn-primary">
                <Check size={16} /> Confirm &amp; Analyse
              </button>
            </>
          )}
        </div>
      )}

      {/* spin keyframe */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
