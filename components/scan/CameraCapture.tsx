'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.error('Camera access denied:', err);
      setError('Camera access denied or not available. Please check permissions.');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startCamera();

    return () => {
      // In a real unmount we'd need a ref to the stream to stop it,
      // but since stream is in state we can just rely on stopCamera if needed.
      // For this simple version, we'll just check the current state:
      setStream((currentStream) => {
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop());
        }
        return null;
      });
    };
  }, []);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(image);
        stopCamera();
      }
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.5)',
        color: 'white',
      }}>
        <h2 style={{ fontSize: '1rem', margin: 0 }}>Scan Dosimeter</h2>
        <button onClick={handleCancel} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {error ? (
          <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>
            <p>{error}</p>
            <button onClick={handleCancel} className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Back</button>
          </div>
        ) : capturedImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Overlay frame for guidance */}
        {!capturedImage && !error && (
          <div style={{
            position: 'absolute',
            width: '250px',
            height: '80px',
            border: '2px dashed rgba(255, 255, 255, 0.7)',
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}></div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        padding: '2rem',
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
      }}>
        {!capturedImage && !error ? (
          <button 
            onClick={capture}
            style={{
              width: '64px', height: '64px',
              borderRadius: '50%',
              background: 'white',
              border: '4px solid #38bdf8',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Camera size={24} color="#0f172a" />
          </button>
        ) : capturedImage ? (
          <>
            <button onClick={retake} className="btn btn-outline" style={{ color: 'white', borderColor: 'white' }}>
              <RefreshCw size={18} /> Retake
            </button>
            <button onClick={confirm} className="btn btn-primary">
              <Check size={18} /> Confirm
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
