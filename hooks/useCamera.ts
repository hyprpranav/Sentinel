'use client';
// hooks/useCamera.ts
import { useRef, useState, useCallback, useEffect } from 'react';

interface CameraState {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  hasPermission: boolean | null;
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<CameraState>({
    stream: null,
    isActive: false,
    error: null,
    hasPermission: null,
  });

  const startCamera = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
    setState((prev) => ({ ...prev, error: null }));
    let stream: MediaStream | null = null;

    try {
      // 1. First attempt: ideal facingMode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (e) {
        console.warn('Constrained camera start failed, falling back to default video device:', e);
        // 2. Second attempt: any video input without strict facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setState({
        stream,
        isActive: true,
        error: null,
        hasPermission: true,
      });

      // If video ref is already mounted, attach immediately
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Initial video play warning:', playErr);
        }
      }
    } catch (err) {
      console.error('Camera access failed completely:', err);
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera access denied. Please click the camera icon in your address bar and allow access.'
          : 'Unable to start camera. Please verify your camera is connected and not in use by another application.';

      setState((prev) => ({
        ...prev,
        stream: null,
        isActive: false,
        error: message,
        hasPermission: err instanceof DOMException && err.name === 'NotAllowedError' ? false : prev.hasPermission,
      }));
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState((prev) => ({ ...prev, stream: null, isActive: false }));
  }, [state.stream]);

  // Synchronize stream with videoRef whenever element mounts or stream updates
  useEffect(() => {
    if (state.stream && state.isActive && videoRef.current) {
      if (videoRef.current.srcObject !== state.stream) {
        videoRef.current.srcObject = state.stream;
      }
      videoRef.current.play().catch((err) => {
        console.warn('Auto-play playback error:', err);
      });
    }
  }, [state.stream, state.isActive]);

  // Auto-stop stream on unmount
  useEffect(() => {
    return () => {
      state.stream?.getTracks().forEach((t) => t.stop());
    };
  }, [state.stream]);

  return { videoRef, ...state, startCamera, stopCamera };
}
