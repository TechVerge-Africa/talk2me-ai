'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CanonicalTranscriptEntry } from '@/services/supabase/transcripts';
import { formatTimestampMs } from '@/services/ai/transcript-analysis';

interface CanonicalTranscriptViewProps {
  transcripts: CanonicalTranscriptEntry[];
  highlightedMs?: number | null;
  onTurnClick?: (turn: CanonicalTranscriptEntry) => void;
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
      {/* Header & Search Bar */}
      <div className="p-3 border-b border-border/40 bg-muted/20 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Canonical Transcript // AssemblyAI Engine
            </h3>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/30">
            {transcripts.length} {transcripts.length === 1 ? 'Turn' : 'Turns'}
          </span>
        </div>

        <input
          type="text"
          placeholder="Search transcripts or speakers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-xs bg-background/80 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-cyan-500/50 transition-colors"
        />
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
                      {turn.speaker_name}
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
