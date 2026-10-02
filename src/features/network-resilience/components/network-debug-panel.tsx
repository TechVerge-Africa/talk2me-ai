/**
 * Developer Network Diagnostics & Simulation Panel
 *
 * Provides real-time telemetry HUD (Bandwidth, RTT, Jitter, Packet Loss,
 * Stability Score, Video Policy, Audio Priority) and interactive network simulation presets.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X, Sliders, Shield, Play, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { NetworkMetrics, MediaPolicy } from '../types';
import { NetworkSimulator, SIMULATION_PRESETS } from '../network-simulator';

interface NetworkDebugPanelProps {
  metrics: NetworkMetrics;
  policy: MediaPolicy;
  simulator: NetworkSimulator;
}

export function NetworkDebugPanel({
  metrics,
  policy,
  simulator,
}: NetworkDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const formatBw = (kbps?: number) => {
    if (kbps === undefined) return 'Measuring...';
    if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
    return `${kbps} kbps`;
  };

  const getQualityBadgeColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'good':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'fair':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'poor':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
    }
  };

  return (
    <>
      {/* ── Diagnostic FAB (Bottom-left in dev) ── */}
      <div className="fixed bottom-4 left-4 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black/95 text-xs text-white/90 border border-white/10 shadow-xl backdrop-blur-md transition-all hover:scale-105"
            title="Open Network Diagnostics"
          >
            <Activity className="size-3.5 text-indigo-400 animate-pulse" />
            <span className="font-mono uppercase font-semibold text-[10px]">
              Net: {metrics.quality}
            </span>
          </button>
        )}
      </div>

      {/* ── Floating Debug HUD ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-14 left-4 z-50 w-80 sm:w-96 rounded-2xl bg-[#0e1117]/95 border border-white/10 shadow-2xl text-white backdrop-blur-xl overflow-hidden font-sans text-xs"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.03] border-b border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-indigo-400" />
                <span className="font-bold tracking-tight text-white/90">Adaptive Network Diagnostics</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="p-3.5 space-y-3">
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                {/* Network Quality */}
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-medium">Quality</div>
                  <div className="mt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getQualityBadgeColor(metrics.quality)}`}>
                      {metrics.quality}
                    </span>
                  </div>
                </div>

                {/* Stability */}
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-medium">Stability</div>
                  <div className="mt-0.5 font-bold text-white/90">
                    {metrics.stabilityScore}%
                  </div>
                </div>

                {/* Bandwidth Downlink */}
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-medium">Bandwidth</div>
                  <div className="mt-0.5 font-bold text-white/90">
                    {formatBw(metrics.estimatedDownlinkKbps)}
                  </div>
                </div>

                {/* RTT */}
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-medium">RTT</div>
                  <div className="mt-0.5 font-bold text-white/90">
                    {metrics.rttMs !== undefined ? `${metrics.rttMs} ms` : '—'}
                  </div>
                </div>

                {/* Jitter */}
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-medium">Jitter</div>
                  <div className="mt-0.5 font-bold text-white/90">
                    {metrics.jitterMs !== undefined ? `${metrics.jitterMs} ms` : '—'}
                  </div>
                </div>

                {/* Packet Loss */}
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-medium">Packet Loss</div>
                  <div className="mt-0.5 font-bold text-white/90">
                    {metrics.packetLossRate !== undefined ? `${(metrics.packetLossRate * 100).toFixed(1)}%` : '0%'}
                  </div>
                </div>

                {/* Video Policy */}
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-medium">Video Policy</div>
                  <div className="mt-0.5 font-bold uppercase text-indigo-300">
                    {policy.preferredVideoQuality}
                  </div>
                </div>

                {/* Audio Priority */}
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-medium">Audio Priority</div>
                  <div className="mt-0.5 font-bold uppercase text-emerald-300">
                    {policy.audioPriority}
                  </div>
                </div>

                {/* Screen Share */}
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-medium">Screen Share</div>
                  <div className="mt-0.5 font-bold uppercase text-white/80">
                    {policy.screenShareEnabled ? 'Enabled' : 'Reduced'}
                  </div>
                </div>

                {/* Connection State */}
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-sans font-medium">Connection</div>
                  <div className="mt-0.5 font-bold uppercase text-white/80">
                    {metrics.connectionState}
                  </div>
                </div>
              </div>

              {/* Simulation Dropdown Accordion */}
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={() => setShowSimulator(!showSimulator)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/80 font-medium transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Sliders className="size-3.5 text-amber-400" />
                    <span>Network Simulation</span>
                  </div>
                  {showSimulator ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>

                {showSimulator && (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-[10px] text-white/50 px-1">Select a condition preset to test adaptation:</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SIMULATION_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setActivePreset(preset.id);
                            simulator.enablePreset(preset.id);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[10px] text-left border transition-all ${
                            activePreset === preset.id
                              ? 'bg-indigo-600/30 border-indigo-500/50 text-white font-semibold'
                              : 'bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="font-semibold">{preset.name}</div>
                          <div className="text-[9px] text-white/40 truncate">{preset.description}</div>
                        </button>
                      ))}
                    </div>

                    {activePreset && (
                      <button
                        onClick={() => {
                          setActivePreset(null);
                          simulator.disable();
                        }}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-semibold transition-colors"
                      >
                        <RotateCcw className="size-3" />
                        Reset Simulation (Use Real WebRTC)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
