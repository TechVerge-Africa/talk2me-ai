'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, Edit2, Calendar, User, LayoutGrid, Flag } from 'lucide-react';
import { DetectedActionCandidate } from '@/services/ai/action-detector';
import { WorkspaceBoard } from '@/types/work-board';

interface ActionConfirmationToastProps {
  candidate: DetectedActionCandidate | null;
  boards: WorkspaceBoard[];
  selectedBoardId?: string;
  onConfirm: (candidate: DetectedActionCandidate, targetBoardId: string) => void;
  onDismiss: () => void;
}

export function ActionConfirmationToast({
  candidate,
  boards,
  selectedBoardId,
  onConfirm,
  onDismiss,
}: ActionConfirmationToastProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedAssignee, setEditedAssignee] = useState('');
  const [targetBoardId, setTargetBoardId] = useState<string>('');

  useEffect(() => {
    if (candidate) {
      setEditedTitle(candidate.title);
      setEditedAssignee(candidate.assignee_name);
      setIsEditing(false);
      // Select board: preferred prop, or first board, or empty
      if (selectedBoardId) {
        setTargetBoardId(selectedBoardId);
      } else if (boards.length > 0) {
        setTargetBoardId(boards[0].id);
      }
    }
  }, [candidate, selectedBoardId, boards]);

  // Keyboard shortcut support: Enter to confirm, Esc to dismiss
  useEffect(() => {
    if (!candidate) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          handleConfirm();
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [candidate, editedTitle, editedAssignee, targetBoardId]);

  if (!candidate) return null;

  const handleConfirm = () => {
    const finalCandidate: DetectedActionCandidate = {
      ...candidate,
      title: editedTitle.trim() || candidate.title,
      assignee_name: editedAssignee.trim() || candidate.assignee_name,
    };
    onConfirm(finalCandidate, targetBoardId || boards[0]?.id || '');
  };

  const isMilestone = candidate.category === 'milestone';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed bottom-24 right-4 sm:right-8 z-50 w-full max-w-md bg-[#161a23]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6),_0_0_0_1px_rgba(255,255,255,0.06)] p-4 text-white overflow-hidden"
      >
        {/* Ambient Top Glow Line */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
          isMilestone
            ? 'from-amber-400 via-orange-500 to-rose-500'
            : 'from-emerald-400 via-teal-400 to-cyan-500'
        }`} />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className={`p-1 rounded-lg ${
              isMilestone ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isMilestone ? <Flag className="size-3.5" /> : <Sparkles className="size-3.5" />}
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-white/90">
              {isMilestone ? 'Milestone Detected' : 'Action Item Detected'}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
              AI Co-pilot
            </span>
          </div>

          <button
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="size-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Action Title or Edit Mode */}
        {isEditing ? (
          <div className="space-y-2 mb-3">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Action title"
              className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-400"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedAssignee}
                onChange={(e) => setEditedAssignee(e.target.value)}
                placeholder="Assignee name"
                className="flex-1 px-3 py-1.5 text-xs bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <p className="text-sm font-semibold text-white leading-snug">
              {editedTitle || candidate.title}
            </p>
          </div>
        )}

        {/* Metadata Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] text-white/70">
          {/* Assignee */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-medium">
            <User className="size-3 text-cyan-400" />
            <span>{editedAssignee || candidate.assignee_name}</span>
          </div>

          {/* Due date if available */}
          {candidate.due_date_text && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-medium">
              <Calendar className="size-3 text-amber-400" />
              <span>{candidate.due_date_text}</span>
            </div>
          )}

          {/* Target Board Selector */}
          {boards.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 font-medium">
              <LayoutGrid className="size-3 text-indigo-400" />
              <select
                value={targetBoardId}
                onChange={(e) => setTargetBoardId(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-indigo-300 focus:outline-none cursor-pointer"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#181c24] text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Evidence Quote Excerpt */}
        {candidate.evidence_quote && (
          <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/5 text-[11px] text-white/60 italic flex items-start gap-1.5">
            <span className="text-emerald-400 font-bold not-italic">“</span>
            <p className="line-clamp-2">{candidate.evidence_quote}</p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-[11px] font-semibold text-white/50 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-white/5"
          >
            <Edit2 className="size-3" />
            <span>{isEditing ? 'Done Editing' : 'Edit'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-semibold transition-all active:scale-95"
            >
              Dismiss (Esc)
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 active:scale-95 ${
                isMilestone
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              <Check className="size-3.5 stroke-[3]" />
              <span>Confirm & Add (↵)</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

