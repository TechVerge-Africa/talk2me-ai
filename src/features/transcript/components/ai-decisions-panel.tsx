'use client';

import React, { useState } from 'react';
import { ExtractedDecisionItem } from '@/services/ai/transcript-analysis';

interface AIDecisionsPanelProps {
  decisions: ExtractedDecisionItem[];
  isAnalyzing?: boolean;
  onRunAnalysis?: () => void;
  onEvidenceClick?: (timestampMs: number, quote: string) => void;
}

export function AIDecisionsPanel({
  decisions,
  isAnalyzing = false,
  onRunAnalysis,
  onEvidenceClick,
}: AIDecisionsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'decision', label: 'Decisions' },
    { id: 'action_item', label: 'Action Items' },
    { id: 'proposal', label: 'Proposals' },
    { id: 'question', label: 'Questions' },
    { id: 'suggestion', label: 'Suggestions' },
  ];

  const filteredDecisions = decisions.filter(d => activeCategory === 'all' || d.category === activeCategory);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'decision':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'action_item':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'proposal':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'question':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'suggestion':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background/50 rounded-xl border border-border/40 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-3 border-b border-border/40 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            AI Intelligence // Decisions & Action Items
          </h3>
        </div>

        <button
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className="px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {isAnalyzing ? (
            <>
              <span className="size-2 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Extract AI Insights</span>
            </>
          )}
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="p-2 border-b border-border/30 bg-muted/10 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => {
          const count = cat.id === 'all' ? decisions.length : decisions.filter(d => d.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1 ${
                activeCategory === cat.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              }`}
            >
              <span>{cat.label}</span>
              <span className="opacity-60 font-mono text-[9px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Decisions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {filteredDecisions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground/60 space-y-2">
            <div className="size-3 rounded-full bg-emerald-500/30 animate-ping mb-1" />
            <p className="text-xs font-semibold uppercase tracking-wider">No AI Decisions Extracted</p>
            <p className="text-[11px] leading-relaxed max-w-xs">
              Click "Extract AI Insights" above to analyze the Canonical Transcript for proposals, decisions, and action items with evidence links.
            </p>
          </div>
        ) : (
          filteredDecisions.map((item, idx) => (
            <div
              key={item.id || `decision_${idx}`}
              className="p-3.5 rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 hover:border-emerald-500/30 transition-all flex flex-col gap-2 shadow-sm"
            >
              {/* Category Badge & Evidence Timestamp Link */}
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${getCategoryBadge(item.category)}`}>
                  {item.category.replace('_', ' ')}
                </span>

                {/* Clickable Evidence Reference Link */}
                <button
                  onClick={() => onEvidenceClick?.(item.evidence_timestamp_ms, item.evidence_quote)}
                  className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[9px] font-mono font-bold flex items-center gap-1 transition-all group"
                  title="Click to jump to exact evidence turn in Canonical Transcript"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform">Evidence:</span>
                  <span>{item.evidence_speaker} — {item.formatted_time || '00:00'}</span>
                </button>
              </div>

              {/* Decision Statement */}
              <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
                {item.text}
              </p>

              {/* Exact Evidence Quote Excerpt */}
              {item.evidence_quote && (
                <div className="mt-1 pt-1.5 border-t border-border/20 text-[11px] text-muted-foreground/80 italic font-sans flex items-start gap-1">
                  <span className="text-emerald-400/60 not-italic font-bold text-xs">“</span>
                  <p className="line-clamp-2">{item.evidence_quote}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
