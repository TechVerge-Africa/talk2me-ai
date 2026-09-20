'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download, Share2, Home, Sparkles, Clock, Users, MessageSquare, Building2, CheckCircle2, ArrowRight } from "lucide-react";
import { MeetingService, Meeting } from '@/services/supabase/meetings';
import { TranscriptService, CanonicalTranscriptEntry, MeetingDecisionEntry } from '@/services/supabase/transcripts';

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
};

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function SummaryPage() {
  const params = useParams();
  const code = params.code as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcripts, setTranscripts] = useState<CanonicalTranscriptEntry[]>([]);
  const [decisions, setDecisions] = useState<MeetingDecisionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [meetingData, turnData, decisionData] = await Promise.all([
          MeetingService.getMeetingByCodeAny(code).catch(() => null),
          TranscriptService.getCanonicalTranscripts(code).catch(() => []),
          TranscriptService.getMeetingDecisions(code).catch(() => []),
        ]);

        if (mounted) {
          setMeeting(meetingData);
          setTranscripts(turnData);
          setDecisions(decisionData);
        }
      } catch (err) {
        console.warn('[SummaryPage] Error loading meeting summary:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (code) {
      loadData();
    }
    return () => { mounted = false; };
  }, [code]);

  const uniqueSpeakers = Array.from(new Set(transcripts.map(t => t.speaker_name).filter(Boolean)));

  const handleDownloadTranscript = () => {
    if (transcripts.length === 0) return;
    const lines = transcripts.map(
      t => `[${formatMs(t.start_ms)}] ${t.speaker_name}: ${t.content}`
    );
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${code}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareSummary = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const workspaceHref = meeting?.workspace_id
    ? `/dashboard?ws=${meeting.workspace_id}&tab=meetings`
    : null;

  return (
    <main className="min-h-screen px-5 py-12 lg:py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.04),transparent_50%)]" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative max-w-3xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={item}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-4">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Session Complete · AI Scribe Processed
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {meeting?.title || `Room ${code}`}
          </h1>

          {/* Stats row */}
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-bridge-cyan" />
              <span className="font-semibold">
                {transcripts.length > 0
                  ? `${Math.max(1, Math.round((transcripts[transcripts.length - 1].end_ms || 0) / 60000))} min recorded`
                  : 'Call Completed'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-bridge-cyan" />
              <span className="font-semibold">
                {uniqueSpeakers.length > 0 ? `${uniqueSpeakers.length} speaker${uniqueSpeakers.length > 1 ? 's' : ''}` : 'Meeting Room'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-bridge-cyan" />
              <span className="font-semibold">
                {transcripts.length} transcript turn{transcripts.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div variants={item} className="mt-8 grid sm:grid-cols-3 gap-3">
          {workspaceHref ? (
            <Link
              href={workspaceHref}
              className="inline-flex items-center justify-center gap-2 h-13 py-3.5 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-bridge hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <Building2 className="size-4" />
              Open in Workspace
            </Link>
          ) : (
            <Link
              href="/dashboard?tab=meetings"
              className="inline-flex items-center justify-center gap-2 h-13 py-3.5 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-bridge hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <Building2 className="size-4" />
              View Meetings
            </Link>
          )}

          <button
            onClick={handleDownloadTranscript}
            disabled={transcripts.length === 0}
            className="inline-flex items-center justify-center gap-2 h-13 py-3.5 px-4 rounded-2xl bg-card ring-1 ring-border hover:bg-muted disabled:opacity-40 text-sm font-bold transition-all active:scale-[0.98]"
          >
            <Download className="size-4 text-bridge-cyan" />
            Save transcript
          </button>

          <button
            onClick={handleShareSummary}
            className="inline-flex items-center justify-center gap-2 h-13 py-3.5 px-4 rounded-2xl bg-card ring-1 ring-border hover:bg-muted text-sm font-bold transition-all active:scale-[0.98]"
          >
            <Share2 className="size-4 text-bridge-indigo" />
            {copied ? 'Link Copied!' : 'Share summary'}
          </button>
        </motion.div>

        {/* AI Scribe Report Badge */}
        <motion.section variants={item} className="mt-12 p-8 rounded-[36px] glass-card border-bridge-cyan/10">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-12 rounded-2xl bg-bridge-cyan/10 grid place-items-center">
              <Sparkles className="size-6 text-bridge-cyan" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Talk2Me AI Scribe Report</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                Ambient Post-Meeting Synthesis
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            During this call, Talk2Me&apos;s ambient scribe captured key discussions without cluttering your live meeting view.
            {workspaceHref && ' You can review the full interactive transcript, assign follow-ups, and chat with AI about this meeting in your workspace.'}
          </p>
          {workspaceHref && (
            <div className="mt-4">
              <Link
                href={workspaceHref}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Go to Workspace Meetings <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </motion.section>

        {/* Key Decisions / Action Items */}
        <motion.section variants={item} className="mt-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>Key Takeaways &amp; Action Items</span>
            {decisions.length > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {decisions.length}
              </span>
            )}
          </h2>

          {decisions.length > 0 ? (
            <ul className="space-y-3">
              {decisions.map((d, i) => (
                <motion.li
                  key={d.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-2xl bg-card ring-1 ring-border flex items-start gap-4 hover:ring-bridge-cyan/30 transition-all"
                >
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-relaxed">{d.text}</p>
                    {d.evidence_quote && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        — {d.evidence_speaker} at {formatMs(d.evidence_timestamp_ms)}: &ldquo;{d.evidence_quote}&rdquo;
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {d.category.replace('_', ' ')}
                  </span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <div className="p-6 rounded-2xl bg-card ring-1 ring-border text-center">
              <p className="text-xs text-muted-foreground">
                {loading ? 'Loading captured takeaways…' : 'No action items or decisions were flagged during this session.'}
              </p>
            </div>
          )}
        </motion.section>

        {/* Searchable Canonical Transcript */}
        <motion.section variants={item} className="mt-10 mb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>Full Canonical Transcript</span>
              {transcripts.length > 0 && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {transcripts.length}
                </span>
              )}
            </h2>
            {transcripts.length > 0 && (
              <button
                onClick={handleDownloadTranscript}
                className="text-xs font-bold text-bridge-cyan hover:underline flex items-center gap-1"
              >
                <Download className="size-3" /> Export .txt
              </button>
            )}
          </div>

          <div className="rounded-[32px] bg-card ring-1 ring-border p-6 space-y-5 max-h-[600px] overflow-y-auto">
            {transcripts.length > 0 ? (
              transcripts.map((t, i) => (
                <div key={t.id || t.turn_id || i} className="flex gap-4 items-start border-b border-border/40 pb-4 last:border-b-0 last:pb-0">
                  <div className="size-8 rounded-xl bg-primary/10 text-primary grid place-items-center text-xs font-black shrink-0 mt-0.5">
                    {t.speaker_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold">{t.speaker_name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatMs(t.start_ms)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground font-normal">
                      {t.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground text-xs">
                {loading ? 'Loading transcript...' : 'No transcript recorded for this session.'}
              </div>
            )}
          </div>
        </motion.section>
      </motion.div>
    </main>
  );
}
