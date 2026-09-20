'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Circle, Lightbulb, HelpCircle, Flag, ExternalLink, Plus, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardActionItem, BoardActionStatus } from '@/types/work-board';

interface AiNotesPanelProps {
  /** Live-detected action items from this meeting */
  actionItems: BoardActionItem[];
  /** Whether the AI scribe is currently active */
  isEphemeral?: boolean;
  /** Room code — used to build the workspace link */
  roomCode?: string;
  /** Workspace ID — used to build the workspace link */
  workspaceId?: string;
  /** Callback to update an item status */
  onUpdateStatus?: (itemId: string, newStatus: BoardActionStatus) => void;
  /** Callback to add a manual note */
  onCreateItem?: (title: string, assigneeName: string, category: 'action_item' | 'milestone') => void;
  /** Callback for clicking evidence timestamp */
  onEvidenceClick?: (timestampMs: number) => void;
}

const CATEGORY_META = {
  action_item: { label: 'Action Item', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  milestone: { label: 'Milestone', icon: Flag, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  decision: { label: 'Decision', icon: Lightbulb, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  question: { label: 'Question', icon: HelpCircle, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  proposal: { label: 'Proposal', icon: Sparkles, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  suggestion: { label: 'Suggestion', icon: Lightbulb, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
} as const;

function formatMs(ms: number | null | undefined): string {
  if (!ms && ms !== 0) return '';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * AI Notes Panel — the sidebar tab replacing the raw verbatim transcript.
 *
 * Surfaces only synthesized, structured notes (action items, decisions, milestones)
 * detected in real-time. Verbatim text is intentionally absent during the live call
 * to reduce cognitive split and surveillance anxiety.
 *
 * The full searchable transcript is published to the Workspace Meetings hub
 * after the call ends.
 */
export function AiNotesPanel({
  actionItems,
  isEphemeral = false,
  roomCode,
  workspaceId,
  onUpdateStatus,
  onCreateItem,
  onEvidenceClick,
}: AiNotesPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newCategory, setNewCategory] = useState<'action_item' | 'milestone'>('action_item');

  const workspaceHref =
    workspaceId && roomCode
      ? `/dashboard?ws=${workspaceId}&tab=meetings`
      : workspaceId
      ? `/dashboard?ws=${workspaceId}&tab=meetings`
      : null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateItem?.(newTitle.trim(), newAssignee.trim() || 'Unassigned', newCategory);
    setNewTitle('');
    setNewAssignee('');
    setIsAdding(false);
  };

  // ── Ephemeral / off-the-record state ───────────────────────────
  if (isEphemeral) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center py-12">
        <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Sparkles className="size-5 text-amber-400" />
        </div>
        <p className="text-sm font-bold text-white/70">Off-the-Record Mode</p>
        <p className="text-xs text-white/40 leading-relaxed">
          AI notes are disabled for this session. Nothing is being saved.
        </p>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────
  if (actionItems.length === 0 && !isAdding) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 text-center py-10">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="size-12 rounded-2xl bg-indigo-500/15 flex items-center justify-center"
          >
            <Sparkles className="size-5 text-indigo-400" />
          </motion.div>
          <div>
            <p className="text-sm font-bold text-white/70">AI Scribe is listening</p>
            <p className="text-xs text-white/35 leading-relaxed mt-1.5">
              Decisions, action items, and key moments will appear here as the conversation unfolds.
            </p>
          </div>
          {onCreateItem && (
            <button
              onClick={() => setIsAdding(true)}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-xs font-semibold text-white/60 hover:text-white/90 transition-all"
            >
              <Plus className="size-3.5" /> Add note manually
            </button>
          )}
        </div>

        <WorkspaceFooter href={workspaceHref} />
      </div>
    );
  }

  // ── Populated state ────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
            <span className="relative inline-flex rounded-full size-1.5 bg-indigo-400" />
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/50">
            Live Notes · {actionItems.length}
          </span>
        </div>
        {onCreateItem && (
          <button
            onClick={() => setIsAdding(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[10px] font-bold text-white/50 hover:text-white/80 transition-all"
          >
            <Plus className="size-3" /> Add
          </button>
        )}
      </div>

      {/* Manual add form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleAdd}
            className="overflow-hidden border-b border-white/[0.06] bg-white/[0.03]"
          >
            <div className="px-4 py-3 flex flex-col gap-2">
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Note or action item…"
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-indigo-500/50 transition-all"
              />
              <div className="flex gap-2">
                <input
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  placeholder="Assignee (optional)"
                  className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-indigo-500/50 transition-all"
                />
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as 'action_item' | 'milestone')}
                  className="bg-white/[0.06] border border-white/10 rounded-xl px-2 py-2 text-xs text-white/70 outline-none"
                >
                  <option value="action_item">Action</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all">
                  Save
                </button>
                <button type="button" onClick={() => setIsAdding(false)} className="py-2 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-white/50 text-xs font-semibold transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {actionItems.map((item, idx) => {
            const cat = CATEGORY_META[item.category as keyof typeof CATEGORY_META] ?? CATEGORY_META.action_item;
            const CatIcon = cat.icon;
            const isDone = item.status === 'done';

            return (
              <motion.div
                key={item.id ?? idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                className={`p-3 rounded-2xl border flex flex-col gap-2 transition-all ${cat.bg} ${isDone ? 'opacity-50' : ''}`}
              >
                {/* Top row: icon + text + status toggle */}
                <div className="flex items-start gap-2">
                  <CatIcon className={`size-3.5 mt-0.5 flex-shrink-0 ${cat.color}`} />
                  <p className={`flex-1 text-xs leading-relaxed font-medium text-white/85 ${isDone ? 'line-through text-white/40' : ''}`}>
                    {item.title}
                  </p>
                  {onUpdateStatus && (
                    <button
                      onClick={() => onUpdateStatus(item.id, isDone ? 'todo' : 'done')}
                      className="flex-shrink-0 mt-0.5"
                      title={isDone ? 'Mark as todo' : 'Mark as done'}
                    >
                      {isDone
                        ? <CheckCircle2 className="size-4 text-emerald-400" />
                        : <Circle className="size-4 text-white/25 hover:text-white/60 transition-colors" />
                      }
                    </button>
                  )}
                </div>

                {/* Meta row: assignee + evidence timestamp */}
                <div className="flex items-center gap-2 flex-wrap pl-5">
                  {item.assignee_name && item.assignee_name !== 'Unassigned' && (
                    <span className="flex items-center gap-1 text-[10px] text-white/40 font-medium">
                      <User className="size-2.5" />
                      {item.assignee_name}
                    </span>
                  )}
                  {item.evidence_timestamp_ms != null && onEvidenceClick && (
                    <button
                      onClick={() => onEvidenceClick(item.evidence_timestamp_ms!)}
                      className="text-[10px] text-indigo-400/70 hover:text-indigo-300 font-mono transition-colors"
                      title="Jump to evidence in transcript"
                    >
                      @ {formatMs(item.evidence_timestamp_ms)}
                    </button>
                  )}
                  <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>
                    {cat.label}
                  </span>
                </div>

                {/* Evidence quote */}
                {item.evidence_quote && (
                  <p className="pl-5 text-[10px] text-white/30 italic leading-snug line-clamp-2">
                    &ldquo;{item.evidence_quote}&rdquo;
                  </p>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer: context nudge & workspace link */}
      <WorkspaceFooter href={workspaceHref} />
    </div>
  );
}

function WorkspaceFooter({ href }: { href: string | null }) {
  return (
    <div className="flex-shrink-0 px-4 py-3 border-t border-white/[0.06] flex flex-col gap-2">
      <p className="text-[10px] text-white/30 leading-snug text-center">
        Full verbatim transcript &amp; AI summary will be published to your workspace after this call ends.
      </p>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[10px] font-semibold text-white/40 hover:text-white/70 transition-all"
        >
          <ExternalLink className="size-3" /> Open Workspace Meetings
        </a>
      )}
    </div>
  );
}

