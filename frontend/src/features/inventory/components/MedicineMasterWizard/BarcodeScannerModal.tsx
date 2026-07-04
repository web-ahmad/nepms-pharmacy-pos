'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScanLineIcon, Loader2Icon, CameraIcon } from 'lucide-react';

interface BarcodeScannerModalProps {
  onScan: (barcode: string) => void;
}

export function BarcodeScannerModal({ onScan }: BarcodeScannerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      scanLoop();
    } catch (err: any) {
      setError(err.message || "Failed to access camera");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanLoop = async () => {
    if (!isOpen) return;
    
    // @ts-ignore
    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128', 'code_39', 'upc_a', 'upc_e'] });
        const checkVideo = async () => {
          if (!isOpen || !videoRef.current) return;
          if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              handleScan(barcodes[0].rawValue);
              return;
            }
          }
          requestAnimationFrame(checkVideo);
        };
        checkVideo();
      } catch (e) {
        console.error("BarcodeDetector error", e);
      }
    } else {
      console.warn("BarcodeDetector API not supported in this browser.");
    }
  };

  const handleScan = (value: string) => {
    onScan(value);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 w-10 rounded-md shrink-0" title="Scan Barcode">
        <ScanLineIcon className="w-5 h-5 text-blue-600" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CameraIcon className="w-5 h-5 text-blue-600" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-lg min-h-[300px] border border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
          {error ? (
            <div className="text-center text-red-500 space-y-2 p-4">
              <p className="font-semibold">Camera Access Error</p>
              <p className="text-sm">{error}</p>
              <Button onClick={startCamera} variant="outline" className="mt-4">Try Again</Button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover absolute inset-0 z-0 opacity-80"
              />
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-blue-500 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  <div className="absolute w-full h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] top-1/2 -translate-y-1/2 animate-pulse" />
                </div>
              </div>
              <div className="absolute bottom-4 z-20 flex flex-col items-center gap-3 w-full px-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 text-white rounded-full text-xs font-medium backdrop-blur-sm">
                  <Loader2Icon className="w-3 h-3 animate-spin" />
                  Scanning for barcodes...
                </div>
                {/* Fallback button for demo/testing when API is unsupported */}
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="w-full opacity-90"
                  onClick={() => handleScan(Math.floor(Math.random() * 9000000000000 + 1000000000000).toString())}
                >
                  Simulate Scan (Demo)
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
