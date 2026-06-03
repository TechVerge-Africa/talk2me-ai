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
    <div className="relative p-6 bg-white rounded-3xl shadow-bridge-sm overflow-hidden group">
      {/* Dynamic glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-bridge-indigo/10 via-bridge-cyan/5 to-bridge-indigo/10 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700 pointer-events-none" />
      
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 size-16 border-t-4 border-l-4 border-bridge-indigo/10 rounded-tl-3xl transition-all duration-500 group-hover:border-bridge-indigo/30 group-hover:size-20" />
      <div className="absolute bottom-0 right-0 size-16 border-b-4 border-r-4 border-bridge-cyan/10 rounded-br-3xl transition-all duration-500 group-hover:border-bridge-cyan/30 group-hover:size-20" />
      
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
