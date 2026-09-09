'use client';
import React, { useEffect, useState } from 'react';
import { generateQRDataUrl } from '@/lib/qr/generator';
import { Download } from 'lucide-react';

interface QRCodeDisplayProps {
  data: string;
  downloadName?: string;
}

export function QRCodeDisplay({ data, downloadName = 'qrcode' }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    generateQRDataUrl(data, 200).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => { cancelled = true; };
  }, [data]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const downloadLink = document.createElement('a');
    downloadLink.download = `${downloadName}.png`;
    downloadLink.href = qrDataUrl;
    downloadLink.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-gray-100">
        {qrDataUrl && <img src={qrDataUrl} alt={`QR code for ${downloadName}`} width={160} height={160} style={{ display: 'block' }} />}
      </div>
      <button 
        onClick={handleDownload}
        className="btn btn-outline flex items-center gap-2 w-full justify-center"
      >
        <Download size={16} />
        Download QR
      </button>
    </div>
  );
}
