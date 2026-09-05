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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>({
    stream: null,
    isActive: false,
    error: null,
    hasPermission: null,
  });

  const startCamera = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState({ stream, isActive: true, error: null, hasPermission: true });
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permission in your browser settings.'
          : 'Unable to access camera. Please check your device.';

      setState((prev) => ({
        ...prev,
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

  // Auto-stop on unmount
  useEffect(() => {
    return () => {
      state.stream?.getTracks().forEach((t) => t.stop());
    };
  }, [state.stream]);

  return { videoRef, ...state, startCamera, stopCamera };
}
