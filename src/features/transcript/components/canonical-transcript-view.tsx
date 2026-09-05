'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CanonicalTranscriptEntry } from '@/services/supabase/transcripts';
import { formatTimestampMs } from '@/services/ai/transcript-analysis';

interface CanonicalTranscriptViewProps {
  transcripts: CanonicalTranscriptEntry[];
  highlightedMs?: number | null;
  onTurnClick?: (turn: CanonicalTranscriptEntry) => void;
}

function formatSpeakerName(rawName: string): string {
  if (!rawName) return 'Speaker';
  let clean = rawName.split('@')[0];
  clean = clean.replace(/\d+$/, '');
  clean = clean.replace(/[._-]+/g, ' ').trim();
  if (!clean) return rawName;
  return clean
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function CanonicalTranscriptView({
  transcripts,
  highlightedMs,
  onTurnClick,
}: CanonicalTranscriptViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Filter transcripts by search query
  const filteredTranscripts = transcripts.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.content.toLowerCase().includes(q) ||
      t.speaker_name.toLowerCase().includes(q) ||
      t.speaker_id.toLowerCase().includes(q)
    );
  });

  // Scroll to highlighted turn when evidence timestamp link is clicked
  useEffect(() => {
    if (highlightedMs !== null && highlightedMs !== undefined) {
      // Find closest turn matching highlighted timestamp
      const target = transcripts.find(
        (t) => Math.abs(t.start_ms - highlightedMs) < 3000 || (t.start_ms <= highlightedMs && t.end_ms >= highlightedMs)
      );
      if (target && target.id) {
        const el = itemRefs.current.get(target.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [highlightedMs, transcripts]);

  // Auto-scroll to bottom on new final entries unless searching
  useEffect(() => {
    if (!searchQuery && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts.length, searchQuery]);

  return (
    <div className="h-full flex flex-col bg-background/50 rounded-xl border border-border/40 overflow-hidden shadow-sm">
      {/* ── Animated header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] flex flex-col gap-3 flex-shrink-0">
        <div className="flex items-center justify-between">

          {/* Left: waveform + label */}
          <div className="flex items-center gap-3">

            {/* Animated equalizer bars */}
            <div className="flex items-end gap-[3px] h-5" aria-hidden="true">
              {[
                'animate-[wave_1.0s_ease-in-out_infinite] h-2',
                'animate-[wave_1.0s_ease-in-out_0.15s_infinite] h-4',
                'animate-[wave_1.0s_ease-in-out_0.3s_infinite] h-3',
                'animate-[wave_1.0s_ease-in-out_0.1s_infinite] h-5',
                'animate-[wave_1.0s_ease-in-out_0.25s_infinite] h-2.5',
                'animate-[wave_1.0s_ease-in-out_0.4s_infinite] h-3.5',
              ].map((cls, i) => (
                <span
                  key={i}
                  className={`w-[3px] rounded-full bg-gradient-to-t from-cyan-500 to-teal-300 ${cls}`}
                  style={{ minHeight: '4px' }}
                />
              ))}
            </div>

            {/* Shimmer gradient label */}
            <span
              className="text-[11px] font-black uppercase tracking-[0.18em] bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-400 bg-clip-text text-transparent"
              style={{
                backgroundSize: '200% auto',
                animation: 'shimmer 3s linear infinite',
              }}
            >
              Live Transcript
            </span>
          </div>

          {/* Right: live dot + count */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <span className="relative flex size-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-1.5 bg-cyan-400" />
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400">Live</span>
            </div>
            <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded border border-white/5">
              {transcripts.length} {transcripts.length === 1 ? 'turn' : 'turns'}
            </span>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search speakers or text…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white/80 placeholder:text-white/25 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all"
        />

        {/* Thin glow separator */}
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      </div>

      {/* Transcript Turns Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {filteredTranscripts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground/60 space-y-2">
            <div className="size-3 rounded-full bg-cyan-500/30 animate-ping mb-1" />
            <p className="text-xs font-semibold uppercase tracking-wider">No Canonical Turns Yet</p>
            <p className="text-[11px] leading-relaxed max-w-xs">
              Finalized speech segments will be committed here cleanly with exact speaker attribution and word timestamps.
            </p>
          </div>
        ) : (
          filteredTranscripts.map((turn) => {
            const turnId = turn.id || `turn_${turn.start_ms}`;
            const isHighlighted =
              highlightedMs !== null &&
              highlightedMs !== undefined &&
              Math.abs(turn.start_ms - highlightedMs) < 3000;

            const timeStr = formatTimestampMs(turn.start_ms);

            return (
              <div
                key={turnId}
                ref={(el) => {
                  if (el) itemRefs.current.set(turnId, el);
                  else itemRefs.current.delete(turnId);
                }}
                onClick={() => onTurnClick?.(turn)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isHighlighted
                    ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
                    : 'bg-card/40 border-border/30 hover:border-cyan-500/30 hover:bg-card/70'
                }`}
              >
                {/* Speaker Header & Timestamp */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 px-2 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/20">
                      {formatSpeakerName(turn.speaker_name)}
                    </span>
                    <span className="text-[9px] font-mono text-cyan-400/70 bg-cyan-950/30 px-1.5 py-0.5 rounded">
                      {timeStr}
                    </span>
                  </div>

                  <span
                    className="text-[9px] font-mono text-muted-foreground/60"
                    title={`Confidence: ${(turn.confidence * 100).toFixed(0)}%`}
                  >
                    {(turn.confidence * 100).toFixed(0)}% accuracy
                  </span>
                </div>

                {/* Turn Text */}
                <p className="text-xs sm:text-sm font-normal text-foreground/95 leading-relaxed tracking-normal pl-2 border-l-2 border-cyan-500/40">
                  {turn.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
