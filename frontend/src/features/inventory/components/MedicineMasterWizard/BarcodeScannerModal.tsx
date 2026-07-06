'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScanLine, Loader2, Camera, CheckCircle2, XCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  onScan: (barcode: string) => void;
}

export function BarcodeScannerModal({ onScan }: BarcodeScannerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'loading' | 'scanning' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedValue, setScannedValue] = useState('');
  const scannerRef = useRef<any>(null);
  const containerIdRef = useRef(`html5-qrscanner-${Math.random().toString(36).slice(2)}`);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
        // Html5QrcodeScanner states: 1=NOT_STARTED, 2=SCANNING, 3=PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch (_) {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    setScannedValue('');

    // Dynamic import to avoid SSR issues
    const { Html5Qrcode } = await import('html5-qrcode');

    await stopScanner();

    const id = containerIdRef.current;
    const el = document.getElementById(id);
    if (!el) return;

    const html5Qrcode = new Html5Qrcode(id);
    scannerRef.current = html5Qrcode;

    try {
      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 260, height: 120 },
          aspectRatio: 1.777,
          disableFlip: false,
        } as any,
        async (decodedText: string) => {
          // Immediate stop on first successful scan
          setScannedValue(decodedText);
          setStatus('success');
          await html5Qrcode.stop().catch(() => {});
          scannerRef.current = null;

          // Play success beep
          playBeep();

          // Auto-close after short delay and populate field
          setTimeout(() => {
            onScan(decodedText);
            setIsOpen(false);
          }, 700);
        },
        // Ignore frame errors (normal during scanning)
        () => {}
      );
      setStatus('scanning');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Camera access denied or not available.');
      setStatus('error');
    }
  }, [onScan, stopScanner]);

  // Start scanner when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let dialog DOM mount
      const t = setTimeout(() => startScanner(), 150);
      return () => clearTimeout(t);
    } else {
      stopScanner();
      setStatus('loading');
      setScannedValue('');
    }
  }, [isOpen, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        className="inline-flex items-center justify-center h-full w-10 hover:bg-slate-100 transition-colors rounded-r-custom text-blue-600 hover:text-blue-700"
        title="Scan Barcode"
      >
        <ScanLine className="w-[18px] h-[18px]" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Camera className="w-5 h-5 text-blue-600" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black overflow-hidden" style={{ minHeight: 260 }}>
          {/* Scanner mounts here */}
          <div
            id={containerIdRef.current}
            className="w-full"
            style={{ minHeight: 260 }}
          />

          {/* Loading overlay */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-white text-sm font-medium">Starting camera...</p>
            </div>
          )}

          {/* Success overlay */}
          {status === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-900/90 z-20 gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-14 h-14 text-emerald-400" />
              <p className="text-white text-sm font-semibold">Scanned!</p>
              <p className="text-emerald-300 text-xs font-mono px-4 text-center break-all">{scannedValue}</p>
            </div>
          )}

          {/* Error overlay */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 gap-3 p-6">
              <XCircle className="w-10 h-10 text-red-400" />
              <p className="text-red-300 text-sm font-semibold text-center">Camera Error</p>
              <p className="text-zinc-400 text-xs text-center">{errorMsg}</p>
              <Button onClick={startScanner} size="sm" variant="outline" className="mt-2 text-white border-zinc-600 hover:bg-zinc-800">
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {status === 'scanning' ? 'Point camera at barcode — auto-captures instantly' : ''}
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-slate-500 hover:text-slate-700"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Minimal success beep using Web Audio API
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046, ctx.currentTime); // C6
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (_) {
    // Audio not available — silent fail
  }
}
