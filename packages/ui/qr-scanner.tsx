'use client';

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export function QrScanner({ 
  onScan, 
  onClose 
}: { 
  onScan: (data: string) => void;
  onClose: () => void;
}) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
      },
      (error) => {
        // console.warn(error);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-md rounded-[32px] overflow-hidden shadow-bridge ring-1 ring-border p-6 flex flex-col gap-6 scale-in-95 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-xl font-semibold">Scan QR Code</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition"
          >
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
        
        <div id="qr-reader" className="overflow-hidden rounded-2xl border-0 !p-0" />
        
        <div className="text-center text-sm text-muted-foreground">
          Point your camera at the host's QR code.
        </div>
      </div>
    </div>
  );
}
