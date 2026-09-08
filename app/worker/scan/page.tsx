'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CameraCapture } from '@/components/scan/CameraCapture';
import { analyzeDosimeterImage } from '@/services/mockAiService';
import { saveExposureRecord } from '@/services/exposureService';
import { useRouter } from 'next/navigation';

import { getWorkerById } from '@/services/workerService';

export default function WorkerScanPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCapture = async (base64Image: string) => {
    setIsScanning(false);
    setIsProcessing(true);
    setError('');
    
    try {
      if (!user) throw new Error('User not found');
      const workerData = await getWorkerById(user.uid);
      if (!workerData) throw new Error('Worker data not found');

      // 1. Analyze image (Mock AI)
      const aiResult = await analyzeDosimeterImage(base64Image);
      
      // 2. Save exposure record with 'pending' status
      await saveExposureRecord({
        workerId: workerData.id,
        workerName: workerData.fullName,
        workerPublicId: workerData.publicId,
        managerId: workerData.managerId || '', // Assumes assigned to a manager
        timestamp: new Date(),
        shift: 'morning', // Hardcoded for demo, could be a selector
        imageUrl: base64Image, // In real app, upload to Storage and save URL
        estimatedDosePpmH: aiResult.estimatedDosePpmH,
        monitoringDuration: 8,
        estimatedAverageExposure: aiResult.estimatedDosePpmH / 8,
        colourFeatures: aiResult.colourFeatures,
        calibrationModelVersion: 'v1.0-mock',
        dosimeterStatus: 'valid',
        status: 'pending',
        isPublicVisible: false,
      });

      setSuccess(`Scan submitted successfully! Estimated Exposure: ${aiResult.estimatedDosePpmH} ppm. Pending Manager Approval.`);
      setTimeout(() => {
        router.push('/worker/dashboard');
      }, 3000);
      
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to process scan');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto mt-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Scan Dosimeter</h1>
      </div>

      {error && <div className="bg-red-500/20 text-red-500 p-4 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-500/20 text-green-500 p-4 rounded mb-4">{success}</div>}

      <div className="bg-navy-card p-8 rounded-xl shadow-lg border border-navy-border flex flex-col items-center justify-center min-h-[400px]">
        {isProcessing ? (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg">Analyzing dosimeter image...</p>
            <p className="text-sm text-gray-400 mt-2">Please wait while the AI processes the exposure level.</p>
          </div>
        ) : (
          <div className="text-center max-w-md">
            <div className="bg-blue-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-4">Ready to Scan</h2>
            <p className="text-gray-400 mb-8">
              Ensure you have adequate lighting and the dosimeter is clearly visible in the frame.
            </p>
            <button 
              onClick={() => setIsScanning(true)}
              className="btn btn-primary w-full py-3 text-lg"
            >
              Open Camera
            </button>
          </div>
        )}
      </div>

      {isScanning && (
        <CameraCapture 
          onCapture={handleCapture}
          onCancel={() => setIsScanning(false)}
        />
      )}
    </div>
  );
}
