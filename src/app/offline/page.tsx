"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { motion } from "framer-motion";
import { GradientBackground } from "@/components/ui/gradient-background";

export default function OfflinePage() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const handleRetry = () => {
    setIsReconnecting(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        if (navigator.onLine) {
          window.location.reload();
        } else {
          setIsReconnecting(false);
        }
      }
    }, 1000);
  };

  return (
    <main className="min-h-screen w-full relative flex items-center justify-center p-5 overflow-hidden">
      <GradientBackground />

      <div className="absolute inset-0 opacity-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] bg-[length:24px_24px] bg-[radial-gradient(circle,rgba(0,0,0,0.15)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md glass-card rounded-3xl p-8 border-cyan/20 dark:border-white/10 shadow-2xl flex flex-col items-center text-center"
      >
        {/* Glow effect behind icon */}
        <div className="absolute -top-12 size-24 rounded-full bg-gradient-to-tr from-indigo/30 to-cyan/30 blur-xl opacity-80" />

        {/* Offline Icon Container */}
        <div className="relative size-20 rounded-2xl bg-indigo/10 dark:bg-white/5 border border-indigo/20 grid place-items-center mb-6">
          <WifiOff className="size-10 text-indigo dark:text-cyan animate-pulse" />
          
          {/* Micro-pulsing dot */}
          <span className="absolute -top-1 -right-1 size-4 rounded-full bg-red-500 ring-4 ring-background animate-pulse" />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-foreground mb-3">
          Connection Lost
        </h1>
        
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
          It looks like you're offline. Talk2Me is waiting to reconnect so you can resume secure, accessible communication.
        </p>

        {/* Status indicator */}
        <div className="w-full p-4 rounded-2xl bg-foreground/[0.02] border border-border/40 mb-8 text-xs font-semibold flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className="flex items-center gap-2 text-red-500">
            <span className="size-2 rounded-full bg-red-500 animate-ping" />
            Offline Mode
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleRetry}
            disabled={isReconnecting}
            className="group flex items-center justify-center gap-3 px-6 py-4 bg-indigo text-white font-bold text-sm rounded-2xl hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isReconnecting ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'}`} />
            {isReconnecting ? "Reconnecting..." : "Retry Connection"}
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-4 border border-foreground/10 hover:bg-foreground/5 text-foreground font-bold text-sm rounded-2xl transition-all"
          >
            <Home className="size-4" />
            Return Home
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
