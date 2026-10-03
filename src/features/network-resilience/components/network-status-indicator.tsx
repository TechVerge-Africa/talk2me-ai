/**
 * NetworkStatusIndicator
 *
 * Mobile-style Cellular / Wi-Fi Signal Strength Bars with HCI Principles:
 * - Familiar 4-bar stepped indicator (Instant recognition, <50ms cognitive processing).
 * - Silent and calm when connection is healthy (3-4 bars).
 * - Clear visual feedback and color transitions when degraded (1-2 bars).
 * - Subtle pill tag ("Audio priority", "Optimized", "Reconnecting") when degraded.
 * - Interactive popover revealing real-time latency (RTT), packet loss, and stability.
 * - Non-intrusive recovery toast when network recovers.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  WifiOff,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Activity,
  ArrowDownUp,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { NetworkQuality, NetworkMetrics, MediaPolicy } from '../types';

export interface NetworkStatusIndicatorProps {
  quality: NetworkQuality;
  connectionState: string;
  isAudioPriority: boolean;
  metrics?: NetworkMetrics;
  policy?: MediaPolicy;
  missedContextNotice?: string | null;
  onDismissMissedNotice?: () => void;
  className?: string;
}

export function NetworkStatusIndicator({
  quality,
  connectionState,
  isAudioPriority,
  metrics,
  policy,
  missedContextNotice,
  onDismissMissedNotice,
  className = '',
}: NetworkStatusIndicatorProps) {
  const [showRecoveryToast, setShowRecoveryToast] = useState(false);
  const [prevQuality, setPrevQuality] = useState<NetworkQuality>(quality);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect transition from degraded state to healthy state
    const wasDegraded = prevQuality === 'critical' || prevQuality === 'offline' || prevQuality === 'poor';
    const isNowHealthy = quality === 'excellent' || quality === 'good';

    if (wasDegraded && isNowHealthy) {
      setShowRecoveryToast(true);
      const timer = setTimeout(() => setShowRecoveryToast(false), 3500);
      return () => clearTimeout(timer);
    }
    setPrevQuality(quality);
  }, [quality, prevQuality]);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen]);

  // Determine signal bar level (0 to 4)
  // A user is ONLY truly offline if their device has no internet connection
  const isBrowserOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const isOffline = isBrowserOffline || (quality === 'offline' && isBrowserOffline);
  const isReconnecting = !isOffline && (connectionState === 'reconnecting' || connectionState === 'disconnected');

  let barCount = 4;
  if (isOffline) {
    barCount = 0;
  } else if (isReconnecting || quality === 'critical') {
    barCount = 1;
  } else if (quality === 'poor') {
    barCount = 1;
  } else if (quality === 'fair') {
    barCount = 2;
  } else if (quality === 'good') {
    barCount = 3;
  } else {
    barCount = 4;
  }

  // Bar aesthetics based on level
  const getStyle = () => {
    if (barCount === 4) {
      return {
        barColor: 'bg-emerald-400',
        glow: 'shadow-[0_0_6px_rgba(52,211,153,0.5)]',
        textColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
        label: 'Excellent',
        summary: 'Full HD video & high-fidelity voice',
      };
    }
    if (barCount === 3) {
      return {
        barColor: 'bg-emerald-400',
        glow: 'shadow-[0_0_4px_rgba(52,211,153,0.3)]',
        textColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
        label: 'Good',
        summary: 'Standard quality video & clear audio',
      };
    }
    if (barCount === 2) {
      return {
        barColor: 'bg-amber-400',
        glow: 'shadow-[0_0_6px_rgba(251,191,36,0.4)]',
        textColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
        label: 'Fair',
        summary: 'Network constrained — video optimized',
      };
    }
    if (barCount === 1) {
      const isCrit = quality === 'critical' || isReconnecting;
      return {
        barColor: isCrit ? 'bg-rose-500' : 'bg-orange-400',
        glow: isCrit ? 'shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'shadow-[0_0_6px_rgba(251,146,60,0.4)]',
        textColor: isCrit ? 'text-rose-400' : 'text-orange-400',
        badgeBg: isCrit ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' : 'bg-orange-500/10 border-orange-500/20 text-orange-300',
        label: isReconnecting ? 'Reconnecting' : (isCrit ? 'Low Network' : 'Poor'),
        summary: isReconnecting
          ? 'Connecting to room — holding your spot'
          : 'Low bandwidth mode active — voice prioritized',
      };
    }
    return {
      barColor: 'bg-rose-500/40',
      glow: '',
      textColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
      label: 'Offline',
      summary: 'No internet connection — waiting for network',
    };
  };

  const style = getStyle();

  // Status pill configuration for degraded states
  let statusBadge: { text: string; icon: React.ReactNode } | null = null;
  if (isOffline) {
    statusBadge = { text: 'No Internet', icon: <WifiOff className="size-3" /> };
  } else if (isReconnecting) {
    statusBadge = { text: 'Reconnecting...', icon: <RefreshCw className="size-3 animate-spin" /> };
  } else if (quality === 'critical' || isAudioPriority) {
    statusBadge = { text: 'Audio priority', icon: <Mic className="size-3" /> };
  } else if (quality === 'fair' || quality === 'poor') {
    statusBadge = { text: 'Low bandwidth', icon: <Activity className="size-3" /> };
  }

  // Stepped bar heights matching mobile signal convention
  const barHeights = ['h-1.5', 'h-2.5', 'h-3.5', 'h-4.5'];

  return (
    <div className={`relative flex items-center gap-2 pointer-events-auto ${className}`} ref={popoverRef}>
      {/* ── Mobile-Style Network Signal Meter ── */}
      <button
        onClick={() => setPopoverOpen(v => !v)}
        aria-label={`Network connection: ${style.label}, ${barCount} of 4 bars`}
        title={`Network: ${style.label} (${barCount}/4 bars). Click for details.`}
        className="group flex items-end gap-[2.5px] px-2 py-1.5 rounded-lg hover:bg-white/5 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/20"
      >
        {barHeights.map((hClass, idx) => {
          const barIndex = idx + 1;
          const isActive = barIndex <= barCount;
          return (
            <motion.div
              key={idx}
              className={`w-[3px] rounded-full transition-colors duration-300 ${hClass} ${
                isActive
                  ? `${style.barColor} ${style.glow}`
                  : 'bg-white/15 dark:bg-white/20'
              } ${isReconnecting && isActive ? 'animate-pulse' : ''}`}
              initial={false}
              animate={{
                scaleY: isActive ? 1 : 0.85,
                opacity: isActive ? 1 : 0.4,
              }}
              transition={{ duration: 0.2 }}
            />
          );
        })}

        {/* Offline indicator overlay */}
        {isOffline && (
          <span className="ml-0.5 text-rose-400">
            <WifiOff className="size-3" />
          </span>
        )}
      </button>

      {/* ── Contextual Degraded State Badge (Audio Priority / Optimized) ── */}
      <AnimatePresence>
        {statusBadge && (
          <motion.div
            initial={{ opacity: 0, x: -4, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={() => setPopoverOpen(v => !v)}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border shadow-sm cursor-pointer hover:opacity-90 ${style.badgeBg}`}
          >
            {statusBadge.icon}
            <span>{statusBadge.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Network Recovery Toast ── */}
      <AnimatePresence>
        {showRecoveryToast && !statusBadge && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shadow-sm"
          >
            <CheckCircle2 className="size-3 text-emerald-400" />
            <span>Network restored</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Progressive Disclosure Popover (HCI Heuristic #1 & #7) ── */}
      <AnimatePresence>
        {popoverOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full mt-2 left-0 sm:left-1/2 sm:-translate-x-1/2 z-50 w-64 rounded-2xl bg-[#181b20]/95 backdrop-blur-xl border border-white/10 p-3.5 shadow-2xl text-white select-none"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-[2px]">
                  {barHeights.map((hClass, idx) => (
                    <div
                      key={idx}
                      className={`w-[2.5px] rounded-full ${hClass} ${
                        idx + 1 <= barCount ? style.barColor : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold tracking-tight text-white/90">
                  Signal Strength
                </span>
              </div>
              <span className={`text-[11px] font-black uppercase tracking-wider ${style.textColor}`}>
                {style.label}
              </span>
            </div>

            {/* Qualitative Explanation */}
            <p className="text-[11px] text-white/60 mb-3 leading-relaxed">
              {style.summary}
            </p>

            {/* Quantitative Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3 bg-black/25 p-2 rounded-xl border border-white/5">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/40 block font-semibold">
                  Latency (RTT)
                </span>
                <span className="text-xs font-mono font-bold text-white/90">
                  {metrics?.rttMs !== undefined ? `${Math.round(metrics.rttMs)} ms` : 'Measuring...'}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/40 block font-semibold">
                  Packet Loss
                </span>
                <span className="text-xs font-mono font-bold text-white/90">
                  {metrics?.packetLossRate !== undefined
                    ? `${(metrics.packetLossRate * 100).toFixed(1)}%`
                    : '0.0%'}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/40 block font-semibold">
                  Downlink
                </span>
                <span className="text-xs font-mono font-bold text-white/90">
                  {metrics?.estimatedDownlinkKbps !== undefined
                    ? metrics.estimatedDownlinkKbps >= 1000
                      ? `${(metrics.estimatedDownlinkKbps / 1000).toFixed(1)} Mbps`
                      : `${Math.round(metrics.estimatedDownlinkKbps)} kbps`
                    : 'Adaptive'}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/40 block font-semibold">
                  Stability
                </span>
                <span className="text-xs font-mono font-bold text-white/90">
                  {metrics?.stabilityScore !== undefined ? `${metrics.stabilityScore}%` : '100%'}
                </span>
              </div>
            </div>

            {/* Resilience Policy Mode */}
            {policy && (
              <div className="flex items-center gap-1.5 text-[10px] text-white/50 pt-1">
                <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
                <span>
                  Video layer:{' '}
                  <strong className="text-white/80 uppercase">
                    {policy.preferredVideoQuality}
                  </strong>{' '}
                  • Audio:{' '}
                  <strong className="text-white/80 uppercase">
                    {policy.audioPriority}
                  </strong>
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Missed Context Notice ── */}
      <AnimatePresence>
        {missedContextNotice && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 px-3 py-1 rounded-xl bg-card border border-border text-foreground text-xs shadow-lg backdrop-blur-md"
          >
            <Sparkles className="size-3 text-indigo-400 shrink-0" />
            <span>While away: {missedContextNotice}</span>
            {onDismissMissedNotice && (
              <button
                onClick={onDismissMissedNotice}
                className="ml-1 text-[10px] text-muted-foreground hover:text-foreground font-semibold px-1 py-0.5 rounded hover:bg-white/10 cursor-pointer"
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
