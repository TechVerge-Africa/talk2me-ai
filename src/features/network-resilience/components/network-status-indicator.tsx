/**
 * NetworkStatusIndicator
 *
 * Subtle, non-intrusive status indicator adhering to Section 14 & 19:
 * - Silent in excellent / good conditions.
 * - Shows a calm, reassuring pill when in 'Audio priority' or 'Network optimized' states.
 * - Shows 'Reconnecting...' smoothly when connection drops.
 * - Avoids alarming red warning popups or jarring modal dialogs.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Wifi, WifiOff, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { NetworkQuality } from '../types';

interface NetworkStatusIndicatorProps {
  quality: NetworkQuality;
  connectionState: string;
  isAudioPriority: boolean;
  missedContextNotice?: string | null;
  onDismissMissedNotice?: () => void;
  className?: string;
}

export function NetworkStatusIndicator({
  quality,
  connectionState,
  isAudioPriority,
  missedContextNotice,
  onDismissMissedNotice,
  className = '',
}: NetworkStatusIndicatorProps) {
  const [showRecoveryToast, setShowRecoveryToast] = useState(false);
  const [prevQuality, setPrevQuality] = useState<NetworkQuality>(quality);

  useEffect(() => {
    // Detect transition from critical/offline/poor to good/excellent
    const wasDegraded = prevQuality === 'critical' || prevQuality === 'offline' || prevQuality === 'poor';
    const isNowHealthy = quality === 'excellent' || quality === 'good';

    if (wasDegraded && isNowHealthy) {
      setShowRecoveryToast(true);
      const timer = setTimeout(() => setShowRecoveryToast(false), 4000);
      return () => clearTimeout(timer);
    }
    setPrevQuality(quality);
  }, [quality, prevQuality]);

  // Determine pill configuration
  const isOffline = quality === 'offline' || connectionState === 'disconnected';
  const isReconnecting = connectionState === 'reconnecting';

  let badgeConfig: { text: string; icon: React.ReactNode; color: string } | null = null;

  if (isOffline) {
    badgeConfig = {
      text: 'Offline — local queue active',
      icon: <WifiOff className="size-3 text-amber-400" />,
      color: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
    };
  } else if (isReconnecting) {
    badgeConfig = {
      text: 'Reconnecting...',
      icon: <RefreshCw className="size-3 text-sky-400 animate-spin" />,
      color: 'bg-sky-500/10 text-sky-200 border-sky-500/20',
    };
  } else if (quality === 'critical' || isAudioPriority) {
    badgeConfig = {
      text: 'Audio priority active',
      icon: <Mic className="size-3 text-indigo-400" />,
      color: 'bg-indigo-500/10 text-indigo-200 border-indigo-500/20',
    };
  } else if (quality === 'poor' || quality === 'fair') {
    badgeConfig = {
      text: 'Network optimized',
      icon: <Wifi className="size-3 text-emerald-400" />,
      color: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    };
  }

  return (
    <div className={`flex flex-col items-center gap-1.5 pointer-events-auto ${className}`}>
      {/* ── Status Pill ── */}
      <AnimatePresence>
        {badgeConfig && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md border shadow-sm ${badgeConfig.color}`}
          >
            {badgeConfig.icon}
            <span>{badgeConfig.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Recovery Subtle Toast ── */}
      <AnimatePresence>
        {showRecoveryToast && !badgeConfig && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-200 border border-emerald-500/25 backdrop-blur-md shadow-sm"
          >
            <CheckCircle2 className="size-3 text-emerald-400" />
            <span>Network recovered</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── While You Were Away Toast ── */}
      <AnimatePresence>
        {missedContextNotice && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/90 border border-border text-foreground text-xs shadow-lg backdrop-blur-md"
          >
            <Sparkles className="size-3.5 text-indigo-400 shrink-0" />
            <span>While you were away: {missedContextNotice}</span>
            {onDismissMissedNotice && (
              <button
                onClick={onDismissMissedNotice}
                className="ml-1 text-[10px] text-muted-foreground hover:text-foreground font-semibold px-1 py-0.5 rounded hover:bg-white/10"
              >
                Dismiss
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
