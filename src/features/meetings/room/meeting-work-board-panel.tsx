'use client';

import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  User, 
  Volume2, 
  Flag, 
  Check, 
  ChevronRight,
  Bell
} from 'lucide-react';
import { WorkspaceBoard, BoardActionItem, BoardActionStatus } from '@/types/work-board';

interface MeetingWorkBoardPanelProps {
  board: WorkspaceBoard | null;
  boards: WorkspaceBoard[];
  actionItems: BoardActionItem[];
  onSelectBoard: (boardId: string) => void;
  onCreateActionItem: (title: string, assigneeName: string, category: 'action_item' | 'milestone') => void;
  onUpdateStatus: (itemId: string, newStatus: BoardActionStatus) => void;
  onEvidenceClick?: (timestampMs: number, quote: string) => void;
}

export function MeetingWorkBoardPanel({
  board,
  boards,
  actionItems,
  onSelectBoard,
  onCreateActionItem,
  onUpdateStatus,
  onEvidenceClick,
}: MeetingWorkBoardPanelProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'action_item' | 'milestone'>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newCategory, setNewCategory] = useState<'action_item' | 'milestone'>('action_item');

  const filteredItems = actionItems.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const milestones = actionItems.filter((i) => i.category === 'milestone');
  const todoItems = filteredItems.filter((i) => i.status === 'todo' && i.category !== 'milestone');
  const inProgressItems = filteredItems.filter((i) => i.status === 'in_progress' && i.category !== 'milestone');
  const doneItems = filteredItems.filter((i) => i.status === 'done');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateActionItem(newTitle.trim(), newAssignee.trim() || 'Unassigned', newCategory);
    setNewTitle('');
    setNewAssignee('');
    setIsAddingNew(false);
  };

  const getNextStatus = (current: BoardActionStatus): BoardActionStatus => {
    switch (current) {
      case 'todo': return 'in_progress';
      case 'in_progress': return 'done';
      case 'done': return 'todo';
      default: return 'todo';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/70 text-white select-none">
      {/* ── Top Bar / Board Selector ── */}
      <div className="p-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="size-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <LayoutGrid className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            {boards.length > 1 ? (
              <select
                value={board?.id || ''}
                onChange={(e) => onSelectBoard(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer truncate max-w-[180px]"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#141820] text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <h4 className="text-xs font-bold truncate text-white">
                {board?.name || 'Meeting Work Board'}
              </h4>
            )}
            <div className="flex items-center gap-1 text-[10px] text-white/40">
              <Bell className="size-2.5 text-emerald-400" />
              <span className="truncate">Alerts {board?.target_channel_name || '# General'} on done</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="size-7 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
          title="Add Action Item"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* ── New Item Form ── */}
      {isAddingNew && (
        <form onSubmit={handleCreateSubmit} className="p-3 border-b border-white/10 bg-white/[0.04] space-y-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Action item title..."
            className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-400"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              placeholder="Assignee name..."
              className="flex-1 px-2.5 py-1.5 text-xs bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-400"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="px-2 py-1.5 text-xs bg-white/5 border border-white/15 rounded-lg text-white/80 focus:outline-none"
            >
              <option value="action_item" className="bg-[#141820]">Task</option>
              <option value="milestone" className="bg-[#141820]">Milestone</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-2.5 py-1 text-[11px] rounded-md text-white/50 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-[11px] font-bold rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all"
            >
              Add to Board
            </button>
          </div>
        </form>
      )}

      {/* ── Milestones Strip (if any) ── */}
      {milestones.length > 0 && (
        <div className="p-3 border-b border-white/10 bg-amber-500/[0.03]">
          <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <Flag className="size-3" />
            <span>Target Milestones ({milestones.length})</span>
          </div>
          <div className="space-y-1.5">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="p-2 rounded-lg bg-white/[0.04] border border-amber-500/20 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white/90 truncate">{m.title}</p>
                  {m.due_date && (
                    <span className="text-[10px] text-amber-300/80 font-mono">
                      Target: {new Date(m.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onUpdateStatus(m.id, m.status === 'done' ? 'todo' : 'done')}
                  className={`size-6 rounded-md flex items-center justify-center transition-all ${
                    m.status === 'done'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'border border-white/20 text-white/30 hover:border-emerald-400 hover:text-emerald-400'
                  }`}
                  title={m.status === 'done' ? 'Mark incomplete' : 'Mark milestone achieved'}
                >
                  {m.status === 'done' ? <Check className="size-3.5 stroke-[3]" /> : <Circle className="size-3" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 bg-white/[0.01]">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
            activeCategory === 'all' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          All ({actionItems.length})
        </button>
        <button
          onClick={() => setActiveCategory('action_item')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
            activeCategory === 'action_item' ? 'bg-indigo-500/25 text-indigo-300' : 'text-white/40 hover:text-white'
          }`}
        >
          Tasks ({actionItems.filter(i => i.category === 'action_item').length})
        </button>
        <button
          onClick={() => setActiveCategory('milestone')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
            activeCategory === 'milestone' ? 'bg-amber-500/25 text-amber-300' : 'text-white/40 hover:text-white'
          }`}
        >
          Milestones ({milestones.length})
        </button>
      </div>

      {/* ── Kanban Columns / Cards Stream ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        {actionItems.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-white/40">
            <LayoutGrid className="size-8 stroke-[1.5] text-white/20 mb-2" />
            <p className="text-xs font-semibold uppercase tracking-wider">No Action Items Yet</p>
            <p className="text-[11px] text-white/40 mt-1 max-w-xs">
              Talk during the meeting — when someone commits to a task or milestone, Talk2Me AI will automatically ask to confirm and place it here!
            </p>
          </div>
        ) : (
          <>
            {/* TO DO Section */}
            {todoItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-cyan-400" />
                    To Do ({todoItems.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {todoItems.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      onUpdateStatus={onUpdateStatus}
                      onEvidenceClick={onEvidenceClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* IN PROGRESS Section */}
            {inProgressItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-amber-400" />
                    In Progress ({inProgressItems.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {inProgressItems.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      onUpdateStatus={onUpdateStatus}
                      onEvidenceClick={onEvidenceClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* DONE Section */}
            {doneItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Completed ({doneItems.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {doneItems.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      onUpdateStatus={onUpdateStatus}
                      onEvidenceClick={onEvidenceClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ActionItemCard({
  item,
  onUpdateStatus,
  onEvidenceClick,
}: {
  item: BoardActionItem;
  onUpdateStatus: (itemId: string, newStatus: BoardActionStatus) => void;
  onEvidenceClick?: (timestampMs: number, quote: string) => void;
}) {
  const isDone = item.status === 'done';
  const isInProgress = item.status === 'in_progress';

  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        isDone
          ? 'bg-emerald-500/[0.04] border-emerald-500/20 opacity-80'
          : isInProgress
          ? 'bg-amber-500/[0.04] border-amber-500/30'
          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
      }`}
    >
      {/* Title & Status Toggle */}
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => {
            if (isDone) onUpdateStatus(item.id, 'todo');
            else if (isInProgress) onUpdateStatus(item.id, 'done');
            else onUpdateStatus(item.id, 'in_progress');
          }}
          className="mt-0.5 flex-shrink-0 transition-transform active:scale-90"
          title={`Status: ${item.status}. Click to cycle.`}
        >
          {isDone ? (
            <CheckCircle2 className="size-4 text-emerald-400" />
          ) : isInProgress ? (
            <Clock className="size-4 text-amber-400" />
          ) : (
            <Circle className="size-4 text-white/30 hover:text-white/60" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold leading-relaxed ${isDone ? 'line-through text-white/50' : 'text-white'}`}>
            {item.title}
          </p>

          {/* Assignee & Due Date */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-white/60">
            <span className="flex items-center gap-1 font-medium text-white/80">
              <User className="size-3 text-cyan-400" />
              <span>{item.assignee_name}</span>
            </span>

            {item.due_date && (
              <span className="flex items-center gap-1 font-mono text-amber-300/80">
                <Calendar className="size-2.5" />
                <span>{new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </span>
            )}
          </div>

          {/* Evidence Link */}
          {item.evidence_quote && (
            <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between gap-1">
              <button
                onClick={() => onEvidenceClick?.(item.evidence_timestamp_ms || 0, item.evidence_quote || '')}
                className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all truncate max-w-full"
                title="Click to jump to exact evidence turn in Transcript"
              >
                <Volume2 className="size-2.5 flex-shrink-0" />
                <span className="truncate">Evidence: {item.evidence_speaker || 'Spoken'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
