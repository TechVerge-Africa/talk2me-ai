'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { QrCode, ArrowRight, X } from "lucide-react";
import { QrScanner } from "@/packages/ui/qr-scanner";
import { AiWaveBackground } from "@/packages/ui/ai-effects";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();

  const handleClose = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  /** Strip non-alphanumeric, uppercase, slice to 7 chars, then format */
  const formatRoomCode = (raw: string): string => {
    const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7);
    if (clean.length <= 1) return clean;
    if (clean.length <= 4) return `${clean[0]}-${clean.slice(1)}`;
    return `${clean[0]}-${clean.slice(1, 4)}-${clean.slice(4)}`;
  };

  const rawCode = code.replace(/-/g, '');
  const valid = rawCode.length >= 4;

  const handleScan = (scannedText: string) => {
    let extractedCode = scannedText;
    if (scannedText.includes("/room/")) {
      extractedCode = scannedText.split("/room/").pop() || scannedText;
    } else if (scannedText.includes("code=")) {
      extractedCode = scannedText.split("code=").pop() || scannedText;
    }
    
    setShowScanner(false);
    router.push(`/room/${extractedCode.trim().toUpperCase()}`);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <AiWaveBackground className="opacity-20 pointer-events-none" />
      
      {showScanner && <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      <div className="relative w-full max-w-lg my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="glass-card p-6 sm:p-12 rounded-3xl sm:rounded-[40px] shadow-2xl border-white/10 bg-card/95 backdrop-blur-2xl relative"
        >
          {/* Close button returning home or previous page */}
          <button
            onClick={handleClose}
            type="button"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 sm:p-3 rounded-full bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer z-20"
            title="Close pop-up"
            aria-label="Close join pop-up"
          >
            <X className="size-5" />
          </button>

          {/* Header with Talk2Me Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-4">
              <img
                src="/assets/logo-light.png"
                alt="Talk2Me Logo"
                className="dark:hidden h-10 w-auto object-contain mx-auto"
              />
              <img
                src="/assets/logo-dark.png"
                alt="Talk2Me Logo"
                className="hidden dark:block h-10 w-auto object-contain mx-auto"
              />
            </Link>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-2">
              Join a Room
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium opacity-60">
              Enter the room code shared by your host or scan their QR code.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) router.push(`/room/${rawCode}`);
            }}
            className="space-y-4"
          >
            <div className="bg-foreground/5 ring-1 ring-white/10 rounded-2xl p-2 focus-within:ring-cyan transition-all">
              <input
                autoFocus
                type="text"
                value={code}
                onChange={(e) => setCode(formatRoomCode(e.target.value))}
                maxLength={9}
                placeholder="S-521-F7G"
                className="w-full bg-transparent text-center font-semibold font-mono tracking-[0.3em] text-xl sm:text-2xl py-4 outline-none placeholder:text-muted-foreground/30 text-foreground"
              />
            </div>

            <button
              type="submit"
              disabled={!valid}
              className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-indigo text-white font-bold text-base shadow-lg hover:shadow-indigo/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40"
            >
              Join Room <ArrowRight className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-foreground/5 border border-white/10 font-semibold text-sm hover:bg-foreground/10 transition-colors"
            >
              <QrCode className="size-4" /> Scan QR Code
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3 opacity-60">Recent Rooms</div>
            <div className="space-y-2">
              {["S-201-K4M", "S-883-XQA"].map((c) => (
                <button
                  key={c}
                  onClick={() => router.push(`/room/${c}`)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-foreground/5 border border-white/5 hover:bg-foreground/10 transition-all text-left group"
                >
                  <div>
                    <div className="font-semibold tracking-wider text-sm">{c}</div>
                    <div className="text-xs text-muted-foreground opacity-60">Yesterday</div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Ambient Glow */}
        <div className="absolute -top-20 -right-20 size-[350px] bg-cyan/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-[350px] bg-indigo/5 blur-[100px] rounded-full pointer-events-none" />
      </div>
    </div>
  );
}
