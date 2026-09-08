'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Filter, 
  Trash2, 
  AlertCircle, 
  Check, 
  ChevronDown, 
  Bell, 
  Sparkles,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { WorkspaceBoard, BoardActionItem, BoardActionStatus, BoardActionPriority } from '@/types/work-board';
import { WorkBoardService } from '@/services/supabase/work-boards';
import { DbWorkspaceMember, DbWorkspaceChannel } from '@/services/supabase/workspaces';

interface WorkspaceBoardViewProps {
  workspaceId: string;
  currentUserId?: string;
  currentUserName?: string;
  members: DbWorkspaceMember[];
  channels: DbWorkspaceChannel[];
}

export function WorkspaceBoardView({
  workspaceId,
  currentUserId,
  currentUserName,
  members,
  channels,
}: WorkspaceBoardViewProps) {
  const [boards, setBoards] = useState<WorkspaceBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [actionItems, setActionItems] = useState<BoardActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterAssignee, setFilterAssignee] = useState<'all' | 'mine'>('all');
  const [filterMeeting, setFilterMeeting] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'action_item' | 'milestone'>('all');

  // Create Board Modal
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newBoardChannel, setNewBoardChannel] = useState(channels[0]?.name || '# General');
  const [creatingBoard, setCreatingBoard] = useState(false);

  // Create Task Inline / Quick Modal
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskCategory, setNewCategory] = useState<'action_item' | 'milestone'>('action_item');
  const [newTaskPriority, setNewPriority] = useState<BoardActionPriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // 1. Fetch boards on mount
  useEffect(() => {
    let mounted = true;
    async function loadBoards() {
      setLoading(true);
      try {
        const fetchedBoards = await WorkBoardService.getWorkspaceBoards(workspaceId);
        if (mounted) {
          setBoards(fetchedBoards);
          if (fetchedBoards.length > 0 && !selectedBoardId) {
            setSelectedBoardId(fetchedBoards[0].id);
          }
        }
      } catch (err) {
        console.error('[WorkspaceBoardView] Load boards failed:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (workspaceId) {
      loadBoards();
    }
    return () => { mounted = false; };
  }, [workspaceId]);

  // 2. Fetch action items when selected board changes & subscribe
  useEffect(() => {
    let mounted = true;
    if (!selectedBoardId) return;

    async function loadItems() {
      try {
        const items = await WorkBoardService.getBoardActionItems(selectedBoardId);
        if (mounted) setActionItems(items);
      } catch (err) {
        console.error('[WorkspaceBoardView] Load items failed:', err);
      }
    }

    loadItems();

    const unsubscribe = WorkBoardService.subscribeToBoardActionItems(selectedBoardId, () => {
      loadItems();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [selectedBoardId]);

  const activeBoard = useMemo(() => {
    return boards.find((b) => b.id === selectedBoardId) || boards[0] || null;
  }, [boards, selectedBoardId]);

  // Extract distinct meetings for meeting filter
  const distinctMeetings = useMemo(() => {
    const map = new Map<string, string>();
    actionItems.forEach((item) => {
      if (item.meeting_id && item.meeting_title) {
        map.set(item.meeting_id, item.meeting_title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [actionItems]);

  // Filtered action items
  const filteredItems = useMemo(() => {
    return actionItems.filter((item) => {
      if (filterAssignee === 'mine') {
        const isMine = item.assignee_id === currentUserId || 
          (currentUserName && item.assignee_name.toLowerCase() === currentUserName.toLowerCase());
        if (!isMine) return false;
      }

      if (filterMeeting !== 'all') {
        if (item.meeting_id !== filterMeeting) return false;
      }

      if (categoryFilter !== 'all') {
        if (item.category !== categoryFilter) return false;
      }

      return true;
    });
  }, [actionItems, filterAssignee, filterMeeting, categoryFilter, currentUserId, currentUserName]);

  // Group into columns
  const todoItems = filteredItems.filter((i) => i.status === 'todo' && i.category !== 'milestone');
  const inProgressItems = filteredItems.filter((i) => i.status === 'in_progress' && i.category !== 'milestone');
  const blockedItems = filteredItems.filter((i) => i.status === 'blocked' && i.category !== 'milestone');
  const doneItems = filteredItems.filter((i) => i.status === 'done' && i.category !== 'milestone');
  const milestones = filteredItems.filter((i) => i.category === 'milestone');

  // Handle board creation
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setCreatingBoard(true);
    try {
      const created = await WorkBoardService.createBoard({
        workspace_id: workspaceId,
        name: newBoardName.trim(),
        description: newBoardDesc.trim(),
        target_channel_name: newBoardChannel,
        created_by: currentUserId,
      });
      setBoards((prev) => [...prev, created]);
      setSelectedBoardId(created.id);
      setShowCreateBoardModal(false);
      setNewBoardName('');
      setNewBoardDesc('');
    } catch (err) {
      console.error('[CreateBoard] Error:', err);
    } finally {
      setCreatingBoard(false);
    }
  };

  // Handle task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedBoardId) return;

    try {
      const created = await WorkBoardService.createActionItem({
        board_id: selectedBoardId,
        workspace_id: workspaceId,
        title: newTaskTitle.trim(),
        assignee_name: newTaskAssignee.trim() || 'Unassigned',
        category: newTaskCategory,
        priority: newTaskPriority,
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
        created_by: currentUserId,
      });
      setActionItems((prev) => [...prev, created]);
      setShowCreateTaskModal(false);
      setNewTaskTitle('');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
    } catch (err) {
      console.error('[CreateTask] Error:', err);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (itemId: string, newStatus: BoardActionStatus) => {
    try {
      // Optimistic update
      setActionItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null }
            : item
        )
      );

      await WorkBoardService.updateActionItemStatus(itemId, newStatus, currentUserId, currentUserName);
    } catch (err) {
      console.error('[UpdateStatus] Error:', err);
    }
  };

  // Handle delete item
  const handleDeleteItem = async (itemId: string) => {
    try {
      setActionItems((prev) => prev.filter((i) => i.id !== itemId));
      await WorkBoardService.deleteActionItem(itemId);
    } catch (err) {
      console.error('[DeleteItem] Error:', err);
    }
  };

  if (loading && boards.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="size-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* ── Top Header & Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <LayoutGrid className="size-5" />
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Team Work Boards
              </h2>
              {boards.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedBoardId}
                    onChange={(e) => setSelectedBoardId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-card border border-border/60 text-sm font-semibold text-foreground hover:border-indigo-500/50 transition-colors focus:outline-none cursor-pointer pr-8"
                  >
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span>Tasks and milestones connected to meetings in this workspace.</span>
            {activeBoard && (
              <span className="flex items-center gap-1 font-medium text-emerald-500 dark:text-emerald-400">
                <Bell className="size-3" />
                <span>Notifies {activeBoard.target_channel_name} on completion</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateBoardModal(true)}
            className="px-3 py-2 rounded-xl border border-border/60 bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>New Board</span>
          </button>
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="size-3.5 stroke-[3]" />
            <span>Add Action Item</span>
          </button>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Assignee Filter */}
          <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/40 text-xs font-medium">
            <button
              onClick={() => setFilterAssignee('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterAssignee === 'all'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Items ({actionItems.length})
            </button>
            <button
              onClick={() => setFilterAssignee('mine')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterAssignee === 'mine'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Tasks
            </button>
          </div>

          {/* Meeting Filter */}
          {distinctMeetings.length > 0 && (
            <select
              value={filterMeeting}
              onChange={(e) => setFilterMeeting(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-muted/40 border border-border/40 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
            >
              <option value="all">All Meetings ({distinctMeetings.length})</option>
              {distinctMeetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === 'all'
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('action_item')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === 'action_item'
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setCategoryFilter('milestone')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === 'milestone'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Milestones
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredItems.length}</span> items
        </div>
      </div>

      {/* ── Milestones Banner (if present) ── */}
      {milestones.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
              <Flag className="size-4" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Strategic Milestones ({milestones.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {milestones.map((m) => {
              const isAchieved = m.status === 'done';
              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-tight ${isAchieved ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {m.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      {m.meeting_title && (
                        <span className="truncate">From: {m.meeting_title}</span>
                      )}
                      {m.due_date && (
                        <span className="font-mono text-amber-600 dark:text-amber-400">
                          Due: {new Date(m.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateStatus(m.id, isAchieved ? 'todo' : 'done')}
                    className={`size-7 rounded-lg flex items-center justify-center transition-all ${
                      isAchieved
                        ? 'bg-emerald-500 text-white font-bold shadow-xs'
                        : 'border border-border/60 text-muted-foreground hover:border-emerald-500 hover:text-emerald-500'
                    }`}
                    title={isAchieved ? 'Mark unachieved' : 'Mark milestone achieved'}
                  >
                    {isAchieved ? <Check className="size-4 stroke-[3]" /> : <Circle className="size-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Kanban Columns ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 items-start">
        {/* Column 1: To Do */}
        <KanbanColumn
          title="To Do"
          count={todoItems.length}
          color="cyan"
          items={todoItems}
          onUpdateStatus={handleUpdateStatus}
          onDeleteItem={handleDeleteItem}
        />

        {/* Column 2: In Progress */}
        <KanbanColumn
          title="In Progress"
          count={inProgressItems.length}
          color="amber"
          items={inProgressItems}
          onUpdateStatus={handleUpdateStatus}
          onDeleteItem={handleDeleteItem}
        />

        {/* Column 3: Done */}
        <KanbanColumn
          title="Done"
          count={doneItems.length}
          color="emerald"
          items={doneItems}
          onUpdateStatus={handleUpdateStatus}
          onDeleteItem={handleDeleteItem}
        />
      </div>

      {/* ── Modal: Create New Board ── */}
      {showCreateBoardModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Create Team Work Board</h3>
              <button
                onClick={() => setShowCreateBoardModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Board Name
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="e.g. Core Engineering, Mobile App, Marketing"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-muted/40 border border-border focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  placeholder="What is this board for?"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-muted/40 border border-border focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Notify Channel on Task Completion
                </label>
                <select
                  value={newBoardChannel}
                  onChange={(e) => setNewBoardChannel(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-muted/40 border border-border focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.name}>
                      {ch.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  When tasks on this board are marked Done, Talk2Me AI broadcasts an update to this channel.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBoardModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBoard || !newBoardName.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
                >
                  {creatingBoard ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Create Task ── */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Add Action Item</h3>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Action Title
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Audit Redis session tokens"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-muted/40 border border-border focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Assignee
                  </label>
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    placeholder="e.g. Kwame Mensah"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-muted/40 border border-border focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Category
                  </label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-muted/40 border border-border focus:outline-none cursor-pointer"
                  >
                    <option value="action_item">Action Item</option>
                    <option value="milestone">Milestone</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-muted/40 border border-border focus:outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-muted/40 border border-border focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
                >
                  Add to Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  color,
  items,
  onUpdateStatus,
  onDeleteItem,
}: {
  title: string;
  count: number;
  color: 'cyan' | 'amber' | 'emerald';
  items: BoardActionItem[];
  onUpdateStatus: (itemId: string, newStatus: BoardActionStatus) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const getNextStatus = (current: BoardActionStatus): BoardActionStatus => {
    switch (current) {
      case 'todo': return 'in_progress';
      case 'in_progress': return 'done';
      case 'done': return 'todo';
      default: return 'todo';
    }
  };

  const headerColors = {
    cyan: 'text-cyan-500 border-cyan-500/30 bg-cyan-500/10',
    amber: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
    emerald: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
  };

  return (
    <div className="flex flex-col bg-card/40 border border-border/40 rounded-2xl p-4 min-h-[420px] shadow-xs">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${headerColors[color]}`}>
            {title}
          </span>
          <span className="text-xs font-mono font-bold text-muted-foreground">
            {count}
          </span>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 space-y-3">
        {items.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground/50 italic">
            No items
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-border transition-all shadow-xs flex flex-col gap-2 group"
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`text-xs font-semibold leading-snug ${item.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {item.title}
                </p>

                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                  title="Delete item"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>

              {/* Assignee & Origin Meeting */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <User className="size-3 text-cyan-500" />
                  <span>{item.assignee_name}</span>
                </span>

                {item.meeting_title && (
                  <span className="flex items-center gap-1 font-sans text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground truncate max-w-[140px]" title={`From meeting: ${item.meeting_title}`}>
                    <span>📅 {item.meeting_title}</span>
                  </span>
                )}

                {item.due_date && (
                  <span className="flex items-center gap-1 font-mono text-[10px] text-amber-500">
                    <Calendar className="size-2.5" />
                    <span>{new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </span>
                )}
              </div>

              {/* Evidence Quote Link */}
              {item.evidence_quote && (
                <div className="pt-2 border-t border-border/30 text-[10px] text-muted-foreground/90 italic flex items-start gap-1">
                  <span className="text-emerald-500 font-bold not-italic">“</span>
                  <p className="line-clamp-2">
                    {item.evidence_quote}
                  </p>
                </div>
              )}

              {/* Quick Status Advance Control */}
              <div className="pt-2 border-t border-border/20 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">
                  Status: {item.status}
                </span>

                <button
                  onClick={() => onUpdateStatus(item.id, getNextStatus(item.status))}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-muted hover:bg-muted/80 text-foreground transition-all flex items-center gap-1"
                >
                  <span>Advance</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

