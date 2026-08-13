'use client';

import { QRCodeSVG } from "qrcode.react";

export function QrBlock({ 
  value, 
  size = 192,
  includeMargin = true,
  level = "H"
}: { 
  value: string; 
  size?: number;
  includeMargin?: boolean;
  level?: "L" | "M" | "Q" | "H";
}) {
  return (
    <div className="relative p-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group font-sans">
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 size-12 border-t-2 border-l-2 border-blue-600/20 rounded-tl-2xl transition-all duration-300" />
      <div className="absolute bottom-0 right-0 size-12 border-b-2 border-r-2 border-blue-600/20 rounded-br-2xl transition-all duration-300" />
      
      <div className="relative bg-white p-4 rounded-2xl ring-1 ring-border shadow-sm">
        <QRCodeSVG
          value={value}
          size={size - 80}
          level={level}
          includeMargin={includeMargin}
          marginSize={2}
          fgColor="oklch(0.18 0.01 60)" // --ink
          bgColor="transparent"
          imageSettings={{
            src: "/favicon.ico",
            x: undefined,
            y: undefined,
            height: 32,
            width: 32,
            excavate: true,
          }}
        />
      </div>
      
      {/* Scan hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <span className="text-[10px] font-bold uppercase tracking-widest text-bridge-indigo/60">Scan to join</span>
      </div>
    </div>
  );
}
