'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Move,
  Palette,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Layout,
  Check,
  Tag,
  Copy,
  FolderPlus,
  ChevronDown,
  Search,
  Users,
  Grid,
  Edit3,
  X,
  FileText,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  WorkspaceBoardService,
  WorkspaceBoard,
  WorkspaceStickyNote,
  StickyNoteColor,
  StickyNoteCategory
} from '@/services/supabase/whiteboard';
import { supabase } from '@/services/supabase/client';

interface WorkspaceWhiteboardProps {
  workspaceId: string;
  workspaceName: string;
  currentUserId: string;
  currentUserName: string;
}

const COLOR_MAP: Record<StickyNoteColor, { bg: string; border: string; text: string; shadow: string; badge: string }> = {
  yellow: {
    bg: 'bg-amber-100 dark:bg-amber-950/80',
    border: 'border-amber-300 dark:border-amber-700/60',
    text: 'text-amber-950 dark:text-amber-100',
    shadow: 'shadow-amber-500/10',
    badge: 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200',
  },
  cyan: {
    bg: 'bg-cyan-100 dark:bg-cyan-950/80',
    border: 'border-cyan-300 dark:border-cyan-700/60',
    text: 'text-cyan-950 dark:text-cyan-100',
    shadow: 'shadow-cyan-500/10',
    badge: 'bg-cyan-200/80 dark:bg-cyan-900/60 text-cyan-900 dark:text-cyan-200',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-950/80',
    border: 'border-pink-300 dark:border-pink-700/60',
    text: 'text-pink-950 dark:text-pink-100',
    shadow: 'shadow-pink-500/10',
    badge: 'bg-pink-200/80 dark:bg-pink-900/60 text-pink-900 dark:text-pink-200',
  },
  green: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/80',
    border: 'border-emerald-300 dark:border-emerald-700/60',
    text: 'text-emerald-950 dark:text-emerald-100',
    shadow: 'shadow-emerald-500/10',
    badge: 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-950/80',
    border: 'border-orange-300 dark:border-orange-700/60',
    text: 'text-orange-950 dark:text-orange-100',
    shadow: 'shadow-orange-500/10',
    badge: 'bg-orange-200/80 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-950/80',
    border: 'border-purple-300 dark:border-purple-700/60',
    text: 'text-purple-950 dark:text-purple-100',
    shadow: 'shadow-purple-500/10',
    badge: 'bg-purple-200/80 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200',
  },
};

const CATEGORIES: { key: StickyNoteCategory; label: string; icon: any }[] = [
  { key: 'idea', label: 'Idea', icon: Sparkles },
  { key: 'task', label: 'Task', icon: Check },
  { key: 'question', label: 'Question', icon: FileText },
  { key: 'decision', label: 'Decision', icon: Tag },
  { key: 'note', label: 'Note', icon: Edit3 },
];

export function WorkspaceWhiteboard({
  workspaceId,
  workspaceName,
  currentUserId,
  currentUserName,
}: WorkspaceWhiteboardProps) {
  // Boards state
  const [boards, setBoards] = useState<WorkspaceBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [isLoadingBoards, setIsLoadingBoards] = useState<boolean>(true);
  const [showNewBoardModal, setShowNewBoardModal] = useState<boolean>(false);
  const [newBoardTitle, setNewBoardTitle] = useState<string>('');
  const [newBoardDesc, setNewBoardDesc] = useState<string>('');
  const [isCreatingBoard, setIsCreatingBoard] = useState<boolean>(false);

  // Notes state
  const [notes, setNotes] = useState<WorkspaceStickyNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<StickyNoteColor>('yellow');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Auto-Save Status State & Refs for keystroke debouncing & in-flight preservation
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const notesRef = useRef<WorkspaceStickyNote[]>([]);
  const editingNoteIdRef = useRef<string | null>(null);

  // Canvas state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    editingNoteIdRef.current = editingNoteId;
  }, [editingNoteId]);

  // Fetch all boards for active workspace
  const fetchBoards = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingBoards(true);
    try {
      let list = await WorkspaceBoardService.getWorkspaceBoards(workspaceId);
      if (list.length === 0) {
        // Auto-create a default board if none exists
        const defaultBoard = await WorkspaceBoardService.createWorkspaceBoard(
          workspaceId,
          'Main Board',
          'Shared sticky note whiteboard canvas for team visual planning.',
          currentUserId
        );
        list = [defaultBoard];
      }
      setBoards(list);
      if (!activeBoardId || !list.some((b) => b.id === activeBoardId)) {
        setActiveBoardId(list[0].id);
      }
    } catch (err) {
      console.error('[Whiteboard] fetchBoards error:', err);
    } finally {
      setIsLoadingBoards(false);
    }
  }, [workspaceId, workspaceName, currentUserId, activeBoardId]);

  useEffect(() => {
    fetchBoards();
  }, [workspaceId]);

  // Fetch notes for active board
  const fetchNotes = useCallback(async () => {
    if (!activeBoardId) return;
    setIsLoadingNotes(true);
    try {
      const data = await WorkspaceBoardService.getBoardNotes(activeBoardId);
      setNotes(data);
    } catch (err) {
      console.error('[Whiteboard] fetchNotes error:', err);
    } finally {
      setIsLoadingNotes(false);
    }
  }, [activeBoardId]);

  useEffect(() => {
    if (activeBoardId) {
      fetchNotes();
    }
  }, [activeBoardId, fetchNotes]);

  // Supabase Real-Time channel for live dragging & editing updates across users
  useEffect(() => {
    if (!activeBoardId) return;

    const channel = supabase
      .channel(`workspace-board-notes-${activeBoardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_board_notes',
          filter: `board_id=eq.${activeBoardId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNote = payload.new as any;
            setNotes((prev) => {
              if (prev.some((n) => n.id === newNote.id)) return prev;
              return [...prev, newNote];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setNotes((prev) =>
              prev.map((n) => {
                if (n.id === updated.id) {
                  // Do not overwrite content if active user is currently typing in this note
                  if (editingNoteIdRef.current === updated.id) {
                    return { ...updated, content: n.content };
                  }
                  return { ...n, ...updated };
                }
                return n;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setNotes((prev) => prev.filter((n) => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBoardId]);

  // Handle Board Creation
  const handleCreateBoard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newBoardTitle.trim() || isCreatingBoard) return;
    setIsCreatingBoard(true);
    try {
      const board = await WorkspaceBoardService.createWorkspaceBoard(
        workspaceId,
        newBoardTitle.trim(),
        newBoardDesc.trim(),
        currentUserId
      );
      setBoards((prev) => [board, ...prev]);
      setActiveBoardId(board.id);
      setShowNewBoardModal(false);
      setNewBoardTitle('');
      setNewBoardDesc('');
    } catch (err) {
      console.error('[Whiteboard] Create board error:', err);
    } finally {
      setIsCreatingBoard(false);
    }
  };

  // Add new Sticky Note to Canvas with Instant Auto-Save to Database
  const handleAddNote = async (color: StickyNoteColor = selectedColor) => {
    if (!activeBoardId) return;

    setSaveStatus('saving');
    // Grid placement calculation to avoid overlapping notes
    const offsetCount = notes.length;
    const posX = 120 + ((offsetCount * 30) % 600);
    const posY = 120 + ((offsetCount * 25) % 400);

    const newNotePartial = {
      board_id: activeBoardId,
      workspace_id: workspaceId,
      author_id: currentUserId,
      author_name: currentUserName || 'Team Member',
      content: '',
      color,
      category: 'idea' as StickyNoteCategory,
      pos_x: posX,
      pos_y: posY,
      width: 220,
      height: 180,
    };

    // Optimistic UI update for 0ms responsiveness
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const optimisticNote: WorkspaceStickyNote = {
      id: tempId,
      ...newNotePartial,
      created_at: new Date().toISOString(),
    };
    setNotes((prev) => [...prev, optimisticNote]);
    setEditingNoteId(tempId);

    try {
      const saved = await WorkspaceBoardService.saveBoardNote(newNotePartial);

      // Replace temp note with saved DB record, preserving any text typed in-flight
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id === tempId) {
            const userTypedContent = n.content !== '' ? n.content : saved.content;
            return {
              ...saved,
              content: userTypedContent,
            };
          }
          return n;
        })
      );

      // Transfer focus to the created DB record ID
      setEditingNoteId((curr) => (curr === tempId ? saved.id : curr));

      // If user typed content while save request was in-flight, push updated content to DB immediately
      const activeStateNote = notesRef.current.find((n) => n.id === tempId || n.id === saved.id);
      if (activeStateNote && activeStateNote.content && activeStateNote.content !== saved.content) {
        await WorkspaceBoardService.updateNoteContent(saved.id, activeStateNote.content);
      }

      setSaveStatus('saved');
    } catch (err) {
      console.error('[Whiteboard] Add note auto-save error:', err);
      setSaveStatus('error');
    }
  };

  // Debounced Auto-Save to Database as User Types
  const handleNoteContentChange = (noteId: string, newContent: string) => {
    // 1. Instant local state update for fluid typing
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content: newContent } : n))
    );

    setSaveStatus('saving');

    // 2. Clear existing debounce timer for this note
    if (saveTimerRef.current[noteId]) {
      clearTimeout(saveTimerRef.current[noteId]);
    }

    // 3. Set debounced auto-save (400ms)
    saveTimerRef.current[noteId] = setTimeout(async () => {
      try {
        if (!noteId || noteId.startsWith('temp_')) return;
        await WorkspaceBoardService.updateNoteContent(noteId, newContent);
        setSaveStatus('saved');
      } catch (err) {
        console.error('[Whiteboard] Auto-save content error:', err);
        setSaveStatus('error');
      }
    }, 400);
  };

  // Note Position Drag End
  const handleDragEnd = async (noteId: string, endX: number, endY: number) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, pos_x: endX, pos_y: endY } : n))
    );
    await WorkspaceBoardService.updateNotePosition(noteId, endX, endY);
  };

  // Flexible Mouse Dragging to Preferred Location (Zoom-Aware & Smooth)
  const handleStartCardDrag = (e: React.MouseEvent, note: WorkspaceStickyNote) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('.cursor-se-resize') ||
      target.closest('.cursor-ns-resize') ||
      target.closest('.cursor-ew-resize') ||
      target.closest('.cursor-nwse-resize') ||
      target.closest('.cursor-nesw-resize')
    ) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = note.pos_x;
    const initialY = note.pos_y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoomLevel;
      const deltaY = (moveEvent.clientY - startY) / zoomLevel;
      const newX = Math.max(10, Math.round(initialX + deltaX));
      const newY = Math.max(10, Math.round(initialY + deltaY));

      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, pos_x: newX, pos_y: newY } : n))
      );
    };

    const onMouseUp = async (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const deltaX = (upEvent.clientX - startX) / zoomLevel;
      const deltaY = (upEvent.clientY - startY) / zoomLevel;
      const finalX = Math.max(10, Math.round(initialX + deltaX));
      const finalY = Math.max(10, Math.round(initialY + deltaY));

      await WorkspaceBoardService.updateNotePosition(note.id, finalX, finalY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Note Size Change
  const handleResizeNote = async (noteId: string, width: number, height: number) => {
    const clampedW = Math.max(160, Math.min(800, width));
    const clampedH = Math.max(120, Math.min(800, height));
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, width: clampedW, height: clampedH } : n))
    );
    await WorkspaceBoardService.updateNoteSize(noteId, clampedW, clampedH);
  };

  // Multi-Direction (All 8 Sides & Corners) Interactive Drag-to-Resize Handler
  type ResizeDirection = 'n' | 's' | 'w' | 'e' | 'nw' | 'ne' | 'sw' | 'se';

  const handleStartMultiDirectionResize = (
    e: React.MouseEvent,
    note: WorkspaceStickyNote,
    direction: ResizeDirection
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = note.pos_x;
    const initialY = note.pos_y;
    const initialW = note.width || 230;
    const initialH = note.height || 180;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoomLevel;
      const deltaY = (moveEvent.clientY - startY) / zoomLevel;

      let newX = initialX;
      let newY = initialY;
      let newW = initialW;
      let newH = initialH;

      if (direction.includes('w')) {
        const possibleW = initialW - deltaX;
        if (possibleW >= 150) {
          newW = possibleW;
          newX = initialX + deltaX;
        } else {
          newW = 150;
          newX = initialX + (initialW - 150);
        }
      }
      if (direction.includes('e')) {
        newW = Math.max(150, initialW + deltaX);
      }
      if (direction.includes('n')) {
        const possibleH = initialH - deltaY;
        if (possibleH >= 110) {
          newH = possibleH;
          newY = initialY + deltaY;
        } else {
          newH = 110;
          newY = initialY + (initialH - 110);
        }
      }
      if (direction.includes('s')) {
        newH = Math.max(110, initialH + deltaY);
      }

      setNotes((prev) =>
        prev.map((n) =>
          n.id === note.id
            ? {
                ...n,
                pos_x: Math.round(newX),
                pos_y: Math.round(newY),
                width: Math.round(newW),
                height: Math.round(newH),
              }
            : n
        )
      );
    };

    const onMouseUp = async (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const deltaX = (upEvent.clientX - startX) / zoomLevel;
      const deltaY = (upEvent.clientY - startY) / zoomLevel;

      let finalX = initialX;
      let finalY = initialY;
      let finalW = initialW;
      let finalH = initialH;

      if (direction.includes('w')) {
        const possibleW = initialW - deltaX;
        if (possibleW >= 150) {
          finalW = possibleW;
          finalX = initialX + deltaX;
        } else {
          finalW = 150;
          finalX = initialX + (initialW - 150);
        }
      }
      if (direction.includes('e')) {
        finalW = Math.max(150, initialW + deltaX);
      }
      if (direction.includes('n')) {
        const possibleH = initialH - deltaY;
        if (possibleH >= 110) {
          finalH = possibleH;
          finalY = initialY + deltaY;
        } else {
          finalH = 110;
          finalY = initialY + (initialH - 110);
        }
      }
      if (direction.includes('s')) {
        finalH = Math.max(110, initialH + deltaY);
      }

      finalX = Math.round(finalX);
      finalY = Math.round(finalY);
      finalW = Math.round(finalW);
      finalH = Math.round(finalH);

      await WorkspaceBoardService.saveBoardNote({
        id: note.id,
        board_id: note.board_id,
        workspace_id: note.workspace_id,
        pos_x: finalX,
        pos_y: finalY,
        width: finalW,
        height: finalH,
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Note Content & Style Change
  const handleUpdateNote = async (
    noteId: string,
    content: string,
    color?: StickyNoteColor,
    category?: StickyNoteCategory
  ) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        return {
          ...n,
          content,
          color: color || n.color,
          category: category || n.category,
        };
      })
    );
    await WorkspaceBoardService.updateNoteContent(noteId, content, color, category);
  };

  // Delete Sticky Note
  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await WorkspaceBoardService.deleteBoardNote(noteId);
  };

  // Board Title Editing State
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState<boolean>(false);
  const [editingTitleText, setEditingTitleText] = useState<string>('');

  const handleSaveBoardTitle = async () => {
    if (!activeBoardId || !editingTitleText.trim()) {
      setIsEditingBoardTitle(false);
      return;
    }
    const newTitle = editingTitleText.trim();
    setBoards((prev) =>
      prev.map((b) => (b.id === activeBoardId ? { ...b, title: newTitle } : b))
    );
    setIsEditingBoardTitle(false);
    await WorkspaceBoardService.updateWorkspaceBoardTitle(activeBoardId, newTitle);
  };

  // Filter notes by category
  const filteredNotes = notes.filter((n) => {
    if (selectedCategoryFilter === 'all') return true;
    return n.category === selectedCategoryFilter;
  });

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden relative font-sans">
      {/* ── TOP BOARD CONTROLS TOOLBAR ── */}
      <div className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between gap-4 z-20 shrink-0 shadow-xs">
        {/* Left: Clean Board Selector & Rename Action */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 grid place-items-center shrink-0">
            <Layout className="size-5" />
          </div>

          {isEditingBoardTitle ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <input
                type="text"
                autoFocus
                value={editingTitleText}
                onChange={(e) => setEditingTitleText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBoardTitle();
                  if (e.key === 'Escape') setIsEditingBoardTitle(false);
                }}
                onBlur={handleSaveBoardTitle}
                className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-indigo-500 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white outline-none"
              />
              <button
                onClick={handleSaveBoardTitle}
                className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
              >
                <Check className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="relative flex items-center">
                <select
                  value={activeBoardId}
                  onChange={(e) => setActiveBoardId(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800/90 px-3 py-1.5 pr-8 rounded-xl text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/80 outline-none cursor-pointer hover:border-indigo-500/50 transition-all max-w-[180px] sm:max-w-[260px] truncate appearance-none"
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold">
                      {b.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-3.5 text-slate-400 pointer-events-none absolute right-2.5" />
              </div>

              <button
                onClick={() => {
                  setEditingTitleText(activeBoard?.title || '');
                  setIsEditingBoardTitle(true);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title="Rename Current Board"
              >
                <Edit3 className="size-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => setShowNewBoardModal(true)}
            className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 transition-all text-xs font-bold flex items-center gap-1.5 shrink-0"
            title="Create New Board"
          >
            <FolderPlus className="size-4" />
            <span className="hidden md:inline">New Board</span>
          </button>
        </div>

        {/* Center: Add Sticky Note Palette Toolbar */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs">
          {(['yellow', 'cyan', 'pink', 'green', 'orange', 'purple'] as StickyNoteColor[]).map((c) => (
            <button
              key={c}
              onClick={() => {
                setSelectedColor(c);
                handleAddNote(c);
              }}
              className={`size-7 rounded-xl transition-all flex items-center justify-center ${COLOR_MAP[c].bg} ${COLOR_MAP[c].border} border hover:scale-110 shadow-xs`}
              title={`Add ${c} sticky note`}
            >
              <Plus className="size-3.5 text-slate-800 dark:text-slate-200" />
            </button>
          ))}
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
          <button
            onClick={() => handleAddNote(selectedColor)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Note</span>
          </button>
        </div>

        {/* Right: Zoom Controls & Realtime Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2, z + 0.1))}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="size-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors ml-1 text-slate-400"
              title="Reset Zoom"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>

          {saveStatus === 'saving' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold animate-pulse">
              <RefreshCw className="size-3.5 animate-spin" />
              Auto-saving...
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <Check className="size-3.5" />
              Saved to DB
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold">
              <AlertCircle className="size-3.5" />
              Save Error
            </div>
          )}

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Realtime Sync
          </div>
        </div>
      </div>

      {/* ── CANVAS BOARD SURFACE ── */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto custom-scrollbar select-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(148, 163, 184, 0.25) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          className="min-w-[3000px] min-h-[3000px] relative p-12 transition-transform origin-top-left"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {isLoadingNotes ? (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-lg text-xs font-bold text-slate-600 dark:text-slate-300">
              <Sparkles className="size-4 text-indigo-500 animate-spin" /> Loading sticky notes...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center text-center gap-3 p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md max-w-sm">
              <div className="size-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 grid place-items-center">
                <Sparkles className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Empty Brainstorm Canvas</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Click the colored buttons in the toolbar above to add your first sticky note!
                </p>
              </div>
              <button
                onClick={() => handleAddNote('yellow')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all mt-1"
              >
                <Plus className="size-4" /> Add Yellow Note
              </button>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const colorStyle = COLOR_MAP[note.color] || COLOR_MAP.yellow;
              const isEditing = editingNoteId === note.id;

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onMouseDown={(e) => handleStartCardDrag(e, note)}
                  className={`absolute p-4 rounded-2xl border ${colorStyle.bg} ${colorStyle.border} ${colorStyle.text} shadow-xl ${colorStyle.shadow} flex flex-col justify-between cursor-move group hover:ring-2 hover:ring-indigo-500/50 transition-shadow z-10`}
                  style={{
                    position: 'absolute',
                    left: note.pos_x,
                    top: note.pos_y,
                    width: note.width || 230,
                    height: note.height || 180,
                  }}
                >
                  {/* Note Header: Drag Handle & Quick Actions */}
                  <div className="flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-2 mb-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-75">
                      <Move className="size-3 cursor-grab" />
                      <span>{note.category}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Color Selector Mini */}
                      {(['yellow', 'cyan', 'pink', 'green', 'orange', 'purple'] as StickyNoteColor[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => handleUpdateNote(note.id, note.content, c)}
                          className={`size-3.5 rounded-full ${COLOR_MAP[c].bg} ${COLOR_MAP[c].border} border hover:scale-125 transition-transform`}
                          title={`Change color to ${c}`}
                        />
                      ))}
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-red-600 dark:text-red-400 transition-colors ml-1"
                        title="Delete Note"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Note Content Text Area / View */}
                  <div className="flex-1 min-h-[60px] text-xs font-semibold leading-relaxed">
                    {isEditing ? (
                      <textarea
                        autoFocus
                        value={note.content}
                        onChange={(e) => handleNoteContentChange(note.id, e.target.value)}
                        onBlur={() => {
                          setEditingNoteId(null);
                          handleUpdateNote(note.id, note.content);
                        }}
                        className="w-full h-full min-h-[60px] bg-transparent outline-none resize-none text-xs font-semibold leading-relaxed"
                        placeholder="Type note content..."
                      />
                    ) : (
                      <div
                        onClick={() => setEditingNoteId(note.id)}
                        className="w-full h-full min-h-[60px] whitespace-pre-wrap break-words cursor-text"
                        title="Click to edit text"
                      >
                        {note.content || 'Click to type...'}
                      </div>
                    )}
                  </div>

                  {/* Note Footer: Author Attribution & Manual Drag Resize Grips */}
                  <div className="pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[10px] opacity-80 relative">
                    <div className="flex items-center gap-1.5 font-bold">
                      <div className="size-4 rounded-full bg-slate-900/10 dark:bg-white/20 grid place-items-center text-[8px] font-extrabold uppercase">
                        {(note.author_name || 'M').charAt(0)}
                      </div>
                      <span className="truncate max-w-[110px]">{note.author_name}</span>
                    </div>
                    <span className="mr-5">{note.created_at ? new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                  </div>

                  {/* ── ALL 8 SIDES & CORNERS RESPONSIVE MULTI-DIRECTION RESIZE GRIPS ── */}
                  {/* Top Side (n) */}
                  <div
                    onMouseDown={(e) => handleStartMultiDirectionResize(e, note, 'n')}
                    className="absolute -top-1.5 left-4 right-4 h-3 z-30 cursor-ns-resize opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    title="Drag top edge to resize height"
                  >
                    <div className="w-8 h-1 bg-indigo-500/80 rounded-full shadow-xs" />
                  </div>

                  {/* Bottom Side (s) */}
                  <div
                    onMouseDown={(e) => handleStartMultiDirectionResize(e, note, 's')}
                    className="absolute -bottom-1.5 left-4 right-4 h-3 z-30 cursor-ns-resize opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    title="Drag bottom edge to resize height"
                  >
                    <div className="w-8 h-1 bg-indigo-500/80 rounded-full shadow-xs" />
                  </div>

                  {/* Left Side (w) */}
                  <div
                    onMouseDown={(e) => handleStartMultiDirectionResize(e, note, 'w')}
                    className="absolute top-4 bottom-4 -left-1.5 w-3 z-30 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    title="Drag left edge to resize width"
                  >
                    <div className="h-8 w-1 bg-indigo-500/80 rounded-full shadow-xs" />
                  </div>

                  {/* Right Side (e) */}
                  <div
                    onMouseDown={(e) => handleStartMultiDirectionResize(e, note, 'e')}
                    className="absolute top-4 bottom-4 -right-1.5 w-3 z-30 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    title="Drag right edge to resize width"
                  >
                    <div className="h-8 w-1 bg-indigo-500/80 rounded-full shadow-xs" />
                  </div>

                  {/* Top-Left Corner (nw) */}
                  <div
                    onMouseDown={(e) => handleStartMultiDirectionResize(e, note, 'nw')}
                    className="absolute -top-2 -left-2 size-3.5 z-30 cursor-nwse-resize opacity-0 group-hover:opacity-100 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-sm transition-opacity"
                    title="Drag corner to resize Top-Left"
                  />

                  {/* Top-Right Corner (ne) */}
                  <div
                    onMouseDown={(e) => handleStartMultiDirectionResize(e, note, 'ne')}
                    className="absolute -top-2 -right-2 size-3.5 z-30 cursor-nesw-resize opacity-0 group-hover:opacity-100 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-sm transition-opacity"
                    title="Drag corner to resize Top-Right"
                  />

                  {/* Bottom-Left Corner (sw) */}
                  <div
                    onMouseDown={(e) => handleStartMultiDirectionResize(e, note, 'sw')}
                    className="absolute -bottom-2 -left-2 size-3.5 z-30 cursor-nesw-resize opacity-0 group-hover:opacity-100 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-sm transition-opacity"
                    title="Drag corner to resize Bottom-Left"
                  />

                  {/* Bottom-Right Corner (se) */}
                  <div
                    onMouseDown={(e) => handleStartMultiDirectionResize(e, note, 'se')}
                    className="absolute -bottom-2 -right-2 size-4.5 z-30 cursor-nwse-resize opacity-80 group-hover:opacity-100 rounded-full bg-indigo-600 border-2 border-white shadow-md flex items-center justify-center transition-all group-hover:scale-110"
                    title="Drag corner to resize Bottom-Right"
                  >
                    <div className="size-1.5 bg-white rounded-full" />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ── NEW WHITEBOARD MODAL ── */}
      <AnimatePresence>
        {showNewBoardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 grid place-items-center">
                    <Layout className="size-5" />
                  </div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Create New Work Board
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewBoardModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    Board Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    placeholder="e.g. Q3 Roadmap & Feature Brainstorm"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={newBoardDesc}
                    onChange={(e) => setNewBoardDesc(e.target.value)}
                    placeholder="Brief objective for team sticky note collaboration..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => setShowNewBoardModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateBoard()}
                    disabled={!newBoardTitle.trim() || isCreatingBoard}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isCreatingBoard ? 'Creating...' : 'Create Board'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
