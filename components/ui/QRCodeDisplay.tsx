'use client';
import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { Download } from 'lucide-react';

interface QRCodeDisplayProps {
  data: string;
  downloadName?: string;
}

export function QRCodeDisplay({ data, downloadName = 'qrcode' }: QRCodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current.querySelector('svg');
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${downloadName}.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-gray-100" ref={svgRef as unknown as React.RefObject<HTMLDivElement>}>
        <QRCode 
          value={data} 
          size={160} 
          level="H"
        />
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
