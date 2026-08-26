'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  MessageSquare,
  Search,
  Bell,
  ChevronLeft,
  Copy,
  Check,
  Loader2,
  Building2,
  Users,
  Settings,
  ArrowRight,
  Send,
  X,
  LogOut,
  Sparkles,
  Menu,
  Rocket,
  Palette,
  Link2,
  ChevronRight,
  Plus,
  Compass,
  Hash,
  Share2,
  AlertCircle,
  Brain,
  Trash2,
  Tag,
  Filter,
  Clock,
  CalendarDays,
  FileText,
  ChevronDown,
  Mic,
  CircleDot,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ListTodo,
  RefreshCw
} from 'lucide-react';

import { useAuth } from '@/features/auth/use-auth';
import { supabase } from '@/services/supabase/client';
import { MeetingService } from '@/services/supabase/meetings';
import { TranscriptService, CanonicalTranscriptEntry } from '@/services/supabase/transcripts';
import {
  WorkspaceService,
  FullWorkspaceData,
  DbWorkspaceMessage,
  DbWorkspaceChannel
} from '@/services/supabase/workspaces';
import {
  WorkspaceMemoryService,
  DbWorkspaceMemory,
  MemoryCategory
} from '@/services/supabase/memory';
import { MentionAutocomplete, MentionCandidate } from '@/components/ui/mention-autocomplete';
import { FormattedChatMessage } from '@/components/ui/formatted-chat-message';
import { generateRoomCode, roomShareUrl } from '@/packages/shared/rooms';
import { GradientBackground } from '@/components/ui/gradient-background';
import { ThemeToggle } from '@/components/theme-toggle';
import { getTimeGreetingPrefix } from '@/lib/greetings';

// ── ICON HELPER ──────────────────────────────────────────────────────
const renderWorkspaceIcon = (iconStr: string) => {
  if (iconStr === 'palette' || iconStr === '🎨') return <Palette className="size-5 text-indigo-600 dark:text-indigo-400" />;
  if (iconStr === 'building' || iconStr === '🏢') return <Building2 className="size-5 text-indigo-600 dark:text-indigo-400" />;
  if (iconStr === 'link' || iconStr === '🔗') return <Link2 className="size-5 text-indigo-600 dark:text-indigo-400" />;
  return <Rocket className="size-5 text-indigo-600 dark:text-indigo-400" />;
};

type WorkspaceTab = 'overview' | 'meetings' | 'chat' | 'ask-ai' | 'settings';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();

  // Navigation tab & selection state
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // ── Meetings Tab State ─────────────────────────────────────────────────
  type WorkspaceMeeting = Awaited<ReturnType<typeof MeetingService.getWorkspaceMeetings>>[number];
  type MeetingSummaryData = {
    turns: CanonicalTranscriptEntry[];
    summary: string | null;
    decisions: Array<{
      category: 'decision' | 'action_item' | 'proposal' | 'question' | 'suggestion';
      text: string;
      evidence_speaker: string;
      evidence_timestamp_ms: number;
      evidence_quote: string;
    }>;
  };
  const [workspaceMeetings, setWorkspaceMeetings] = useState<WorkspaceMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [meetingSummaries, setMeetingSummaries] = useState<Record<string, MeetingSummaryData>>({});
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [transcriptSpeakerFilter, setTranscriptSpeakerFilter] = useState<string>('all');
  const [decisionCategoryFilter, setDecisionCategoryFilter] = useState<string>('all');

  // Workspaces from Supabase DB
  const [workspacesData, setWorkspacesData] = useState<FullWorkspaceData[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(true);
  const [selectedChannel, setSelectedChannel] = useState<string>('# General');

  // Modals state
  const [showCreateWsModal, setShowCreateWsModal] = useState<boolean>(false);
  const [newWsName, setNewWsName] = useState<string>('');
  const [newWsTopic, setNewWsTopic] = useState<string>('');
  const [newWsIcon, setNewWsIcon] = useState<string>('rocket');
  const [isCreatingWs, setIsCreatingWs] = useState<boolean>(false);

  const [showJoinWsModal, setShowJoinWsModal] = useState<boolean>(false);
  const [joinInviteCode, setJoinInviteCode] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoiningWs, setIsJoiningWs] = useState<boolean>(false);

  const [showCreateChannelModal, setShowCreateChannelModal] = useState<boolean>(false);
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [isCreatingChannel, setIsCreatingChannel] = useState<boolean>(false);

  // Chat & AI Inputs
  const [chatInputText, setChatInputText] = useState<string>('');
  const [askAiInput, setAskAiInput] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const chatInputRef = React.useRef<HTMLInputElement>(null);

  // Mobile menu drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [copiedWsCode, setCopiedWsCode] = useState<boolean>(false);

  // Profile dropdown
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState<boolean>(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!showProfileDropdown) return;
    const handler = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfileDropdown]);

  // Memory Bank State
  const [memories, setMemories] = useState<DbWorkspaceMemory[]>([]);
  const [memoryCategoryFilter, setMemoryCategoryFilter] = useState<string>('all');
  const [memorySearchQuery, setMemorySearchQuery] = useState<string>('');
  const [showAddMemoryModal, setShowAddMemoryModal] = useState<boolean>(false);
  const [newMemoryTitle, setNewMemoryTitle] = useState<string>('');
  const [newMemoryContent, setNewMemoryContent] = useState<string>('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<MemoryCategory>('fact');
  const [newMemoryTags, setNewMemoryTags] = useState<string>('');
  const [isSavingMemory, setIsSavingMemory] = useState<boolean>(false);
  const [isExtractingAiMemory, setIsExtractingAiMemory] = useState<boolean>(false);

  // Sync workspace memories when active workspace changes
  useEffect(() => {
    if (!activeWorkspaceId) return;

    WorkspaceMemoryService.getWorkspaceMemories(activeWorkspaceId).then(setMemories);

    const channel = supabase
      .channel(`workspace-memories-${activeWorkspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_memories',
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        () => {
          WorkspaceMemoryService.getWorkspaceMemories(activeWorkspaceId).then(setMemories);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeWorkspaceId]);

  const handleCreateMemory = async () => {
    if (!activeWorkspaceId || !newMemoryTitle.trim() || !newMemoryContent.trim()) return;
    setIsSavingMemory(true);
    try {
      const tagsArr = newMemoryTags.split(',').map((t) => t.trim()).filter(Boolean);
      const created = await WorkspaceMemoryService.createMemory({
        workspace_id: activeWorkspaceId,
        category: newMemoryCategory,
        title: newMemoryTitle.trim(),
        content: newMemoryContent.trim(),
        tags: tagsArr,
        source_type: 'manual',
        created_by: user?.id,
      });
      if (created) {
        setMemories((prev) => [created, ...prev]);
        setShowAddMemoryModal(false);
        setNewMemoryTitle('');
        setNewMemoryContent('');
        setNewMemoryTags('');
      }
    } catch (err) {
      console.error('[handleCreateMemory] Error:', err);
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleExtractAiMemory = async () => {
    if (!activeWorkspaceId || !currentWorkspaceData) return;
    setIsExtractingAiMemory(true);
    try {
      const activeChannelMsgs = currentWorkspaceData.messages[selectedChannel] || [];
      const chatText = activeChannelMsgs.map((m) => `${m.sender_name}: ${m.content}`).join('\n');

      if (!chatText.trim()) return;

      const res = await fetch('/api/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract',
          workspace_id: activeWorkspaceId,
          text: chatText,
          context_type: 'chat',
          created_by: user?.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.memories) && data.memories.length > 0) {
          setMemories((prev) => [...data.memories, ...prev]);
        }
      }
    } catch (err) {
      console.error('[handleExtractAiMemory] Error:', err);
    } finally {
      setIsExtractingAiMemory(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    const success = await WorkspaceMemoryService.deleteMemory(id);
    if (success) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesCategory = memoryCategoryFilter === 'all' || m.category === memoryCategoryFilter;
      const query = memorySearchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        m.title.toLowerCase().includes(query) ||
        m.content.toLowerCase().includes(query) ||
        m.tags.some((t) => t.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [memories, memoryCategoryFilter, memorySearchQuery]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Load User Workspaces from Supabase
  const fetchWorkspaces = async () => {
    if (!user) return;
    setIsLoadingWorkspaces(true);
    try {
      const data = await WorkspaceService.getUserWorkspaces(user.id);
      setWorkspacesData(data);

      if (data.length > 0) {
        // Default to first workspace if not set
        setActiveWorkspaceId((prev) => (prev && data.some((w) => w.workspace.id === prev) ? prev : data[0].workspace.id));
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching workspaces:', err);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkspaces();

      const joinCode = searchParams.get('join');
      if (joinCode) {
        setJoinInviteCode(joinCode.trim());
        setShowJoinWsModal(true);
      }
    }
  }, [user, searchParams]);

  // Active Workspace Data Object
  const currentWorkspaceData = useMemo(() => {
    return workspacesData.find((w) => w.workspace.id === activeWorkspaceId) || workspacesData[0] || null;
  }, [workspacesData, activeWorkspaceId]);

  const mentionCandidates: MentionCandidate[] = useMemo(() => {
    const candidates: MentionCandidate[] = [
      {
        id: 'ai-assistant',
        handle: 'Talk2Me',
        name: 'Talk2Me AI',
        description: 'AI Workspace Copilot (query transcripts & team docs)',
        type: 'ai',
      },
      {
        id: 'everyone',
        handle: 'everyone',
        name: 'Everyone in channel',
        description: 'Notify all workspace members in this channel',
        type: 'all',
      },
    ];

    if (currentWorkspaceData?.members) {
      currentWorkspaceData.members.forEach((m) => {
        const rawName = m.profile?.full_name || 'Member';
        const handle = rawName.replace(/\s+/g, '');
        candidates.push({
          id: m.user_id,
          handle,
          name: rawName,
          description: m.role ? `Workspace ${m.role}` : 'Workspace Member',
          type: 'member',
        });
      });
    }

    return candidates;
  }, [currentWorkspaceData]);

  // Real-Time Subscriptions for Active Workspace Chat Messages
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const unsubscribe = WorkspaceService.subscribeToWorkspaceMessages(activeWorkspaceId, (newMsg) => {
      setWorkspacesData((prevList) =>
        prevList.map((item) => {
          if (item.workspace.id !== activeWorkspaceId) return item;
          const channelName = newMsg.channel_name;
          const existingChMsgs = item.messages[channelName] || [];

          // Avoid duplicate messages
          if (existingChMsgs.some((m) => m.id === newMsg.id && m.id !== '')) {
            return item;
          }

          return {
            ...item,
            messages: {
              ...item.messages,
              [channelName]: [...existingChMsgs, newMsg],
            },
          };
        })
      );
    });

    return () => {
      unsubscribe();
    };
  }, [activeWorkspaceId]);

  // Handle Workspace Creation
  const handleCreateWorkspace = async () => {
    if (!newWsName.trim() || !user) return;
    setIsCreatingWs(true);
    try {
      const newWsData = await WorkspaceService.createWorkspace({
        name: newWsName.trim(),
        topic: newWsTopic.trim(),
        icon: newWsIcon,
        userId: user.id,
      });

      setWorkspacesData((prev) => [...prev, newWsData]);
      setActiveWorkspaceId(newWsData.workspace.id);
      setSelectedChannel('# General');
      setShowCreateWsModal(false);
      setNewWsName('');
      setNewWsTopic('');
    } catch (err: any) {
      alert(err?.message || 'Failed to create workspace');
    } finally {
      setIsCreatingWs(false);
    }
  };

  // Handle Workspace Joining
  const handleJoinWorkspace = async () => {
    if (!joinInviteCode.trim() || !user) return;
    setIsJoiningWs(true);
    setJoinError(null);
    try {
      await WorkspaceService.joinWorkspaceByCode(joinInviteCode.trim(), user.id);
      await fetchWorkspaces();
      setShowJoinWsModal(false);
      setJoinInviteCode('');
    } catch (err: any) {
      setJoinError(err?.message || 'Failed to join workspace');
    } finally {
      setIsJoiningWs(false);
    }
  };

  // Handle Channel Creation
  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !activeWorkspaceId) return;
    setIsCreatingChannel(true);
    try {
      const formatted = newChannelName.trim().startsWith('#') ? newChannelName.trim() : `# ${newChannelName.trim()}`;
      const newCh = await WorkspaceService.createChannel(activeWorkspaceId, formatted);

      setWorkspacesData((prev) =>
        prev.map((item) => {
          if (item.workspace.id !== activeWorkspaceId) return item;
          return {
            ...item,
            channels: [...item.channels, newCh],
          };
        })
      );

      setSelectedChannel(newCh.name);
      setShowCreateChannelModal(false);
      setNewChannelName('');
    } catch (err: any) {
      alert(err?.message || 'Failed to create channel');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  // Handle Send Chat Message (Supports @Talk2Me tag)
  const handleSendChatMessage = async () => {
    if (!chatInputText.trim() || !user || !currentWorkspaceData) return;

    const textToSend = chatInputText.trim();
    setChatInputText('');

    const senderName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member';

    try {
      // 1. Send User Message
      const userMsg = await WorkspaceService.sendWorkspaceMessage({
        workspaceId: currentWorkspaceData.workspace.id,
        channelName: selectedChannel,
        senderId: user.id,
        senderName,
        content: textToSend,
      });

      // Optimistically update UI
      setWorkspacesData((prev) =>
        prev.map((item) => {
          if (item.workspace.id !== currentWorkspaceData.workspace.id) return item;
          const currentMsgs = item.messages[selectedChannel] || [];
          return {
            ...item,
            messages: {
              ...item.messages,
              [selectedChannel]: [...currentMsgs, userMsg],
            },
          };
        })
      );

      // 2. Check if user mentioned @Talk2Me or @talk2me
      if (textToSend.toLowerCase().includes('@talk2me')) {
        setIsAiThinking(true);
        const cleanQuery = textToSend.replace(/@talk2me/gi, '').trim() || textToSend;

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userQuery: cleanQuery,
            workspaceId: currentWorkspaceData.workspace.id,
            workspaceName: currentWorkspaceData.workspace.name,
            workspaceTopic: currentWorkspaceData.workspace.topic,
            chatHistory: currentWorkspaceData.messages[selectedChannel] || [],
            workspaceMemories: memories,
          }),
        });

        if (res.ok) {
          const aiData = await res.json();
          await WorkspaceService.sendWorkspaceMessage({
            workspaceId: currentWorkspaceData.workspace.id,
            channelName: selectedChannel,
            senderId: 'talk2me-ai',
            senderName: 'Talk2Me AI',
            content: aiData.text || 'I processed your request.',
            isAi: true,
            sources: aiData.sources || ['Workspace AI'],
          });
        }
        setIsAiThinking(false);
      }
    } catch (err) {
      console.error('[SendChatMessage] Error:', err);
    }
  };

  // Handle Ask AI Query in Ask AI Tab
  const handleSendAskAi = async () => {
    if (!askAiInput.trim() || !user || !currentWorkspaceData) return;

    const query = askAiInput.trim();
    setAskAiInput('');
    setIsAiThinking(true);

    const senderName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'You';

    try {
      // Send user query to Ask AI channel
      const userMsg = await WorkspaceService.sendWorkspaceMessage({
        workspaceId: currentWorkspaceData.workspace.id,
        channelName: '🤖 Ask AI',
        senderId: user.id,
        senderName,
        content: query,
      });

      // Call AI endpoint
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: query,
          workspaceId: currentWorkspaceData.workspace.id,
          workspaceName: currentWorkspaceData.workspace.name,
          workspaceTopic: currentWorkspaceData.workspace.topic,
          chatHistory: currentWorkspaceData.messages['🤖 Ask AI'] || [],
          workspaceMemories: memories,
        }),
      });

      if (res.ok) {
        const aiData = await res.json();
        await WorkspaceService.sendWorkspaceMessage({
          workspaceId: currentWorkspaceData.workspace.id,
          channelName: '🤖 Ask AI',
          senderId: 'talk2me-ai',
          senderName: 'Talk2Me AI',
          content: aiData.text,
          isAi: true,
          sources: aiData.sources || ['Meeting Transcripts', 'Workspace Data'],
        });
      }
    } catch (err) {
      console.error('[AskAi] Error:', err);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Launch Instant Meeting
  const handleCreateMeeting = async () => {
    if (!user) return;
    try {
      const meeting = await MeetingService.createMeeting(
        `${currentWorkspaceData?.workspace.name || 'Workspace'} Sync`,
        user.id,
        false,
        undefined,
        true
      );
      router.push(`/room/${meeting.room_code}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to create meeting');
    }
  };

  // ── Meetings Tab Handlers ───────────────────────────────────────────────
  const fetchWorkspaceMeetings = React.useCallback(async () => {
    if (!activeWorkspaceId) return;
    setIsLoadingMeetings(true);
    try {
      const list = await MeetingService.getWorkspaceMeetings(activeWorkspaceId);
      setWorkspaceMeetings(list);
      // Auto-select the first meeting
      if (list.length > 0 && !selectedMeetingId) {
        setSelectedMeetingId(list[0].id);
      }
    } catch (err) {
      console.error('[Meetings] fetchWorkspaceMeetings error:', err);
    } finally {
      setIsLoadingMeetings(false);
    }
  }, [activeWorkspaceId, selectedMeetingId]);

  // Fetch meetings list when switching to meetings tab or workspace changes
  useEffect(() => {
    if (activeTab === 'meetings' && activeWorkspaceId) {
      fetchWorkspaceMeetings();
    }
  }, [activeTab, activeWorkspaceId]);

  // Load transcript + AI summary for selected meeting
  useEffect(() => {
    if (!selectedMeetingId) return;
    if (meetingSummaries[selectedMeetingId]) return; // already cached
    setIsLoadingDetail(true);
    setTranscriptSpeakerFilter('all');
    setDecisionCategoryFilter('all');
    fetch('/api/ai/summarize-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId: selectedMeetingId }),
    })
      .then(r => r.json())
      .then(data => {
        setMeetingSummaries(prev => ({
          ...prev,
          [selectedMeetingId]: {
            turns: data.turns || [],
            summary: data.summary || null,
            decisions: data.decisions || [],
          },
        }));
      })
      .catch(err => console.error('[Meetings] loadMeetingDetail error:', err))
      .finally(() => setIsLoadingDetail(false));
  }, [selectedMeetingId, meetingSummaries]);

  const handleRefreshSummary = () => {
    if (!selectedMeetingId) return;
    setMeetingSummaries(prev => {
      const next = { ...prev };
      delete next[selectedMeetingId];
      return next;
    });
  };

  const timeGreeting = useMemo(() => getTimeGreetingPrefix(), []);

  if (authLoading || isLoadingWorkspaces) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
            Loading Talk2Me Workspace...
          </p>
        </div>
      </div>
    );
  }

  const workspace = currentWorkspaceData?.workspace;
  const members = currentWorkspaceData?.members || [];
  const channels = currentWorkspaceData?.channels || [];
  const activeMessages = currentWorkspaceData?.messages[selectedChannel] || [];
  const askAiMessages = currentWorkspaceData?.messages['🤖 Ask AI'] || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
      <GradientBackground />

      {/* ── TOP APPLICATION HEADER ── */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Brand & Workspace Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <Menu className="size-5" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 grid place-items-center text-white font-black text-sm shadow-md">
              T2
            </div>
            <span className="font-heading text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent hidden sm:inline">
              Talk2Me
            </span>
          </Link>

          {/* Active Workspace Selector Dropdown */}
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {workspacesData.length > 0 && (
            <div className="relative group">
              <select
                value={activeWorkspaceId}
                onChange={(e) => {
                  setActiveWorkspaceId(e.target.value);
                  setSelectedChannel('# General');
                }}
                className="appearance-none bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                {workspacesData.map((item) => (
                  <option key={item.workspace.id} value={item.workspace.id}>
                    {item.workspace.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                ▼
              </div>
            </div>
          )}

          <button
            onClick={() => setShowCreateWsModal(true)}
            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1"
            title="Create New Workspace"
          >
            <Plus className="size-3.5" />
            <span className="hidden md:inline">Workspace</span>
          </button>

          <button
            onClick={() => setShowJoinWsModal(true)}
            className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/50 text-cyan-600 dark:text-cyan-400 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1"
            title="Join Workspace"
          >
            <Compass className="size-3.5" />
            <span className="hidden md:inline">Join</span>
          </button>
        </div>

        {/* Right: Quick Action Meeting, Theme & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleCreateMeeting}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
          >
            <Video className="size-3.5" />
            <span className="hidden sm:inline">Start Meeting</span>
          </button>

          <ThemeToggle />

          {/* User Avatar + Profile Dropdown */}
          <div className="relative flex items-center border-l border-slate-200 dark:border-slate-800 pl-3" ref={profileDropdownRef}>
            <button
              onClick={() => setShowProfileDropdown((v) => !v)}
              className="size-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white text-xs font-black uppercase shadow-md ring-2 ring-transparent hover:ring-indigo-400 transition-all focus:outline-none focus:ring-indigo-400"
              title="Profile"
              aria-haspopup="true"
              aria-expanded={showProfileDropdown}
            >
              {user?.email?.slice(0, 2) || 'US'}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2.5 w-60 z-50 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60 overflow-hidden"
                >
                  {/* User info header */}
                  <div className="px-4 py-3.5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border-b border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white text-sm font-black uppercase shadow-md flex-shrink-0">
                        {user?.email?.slice(0, 2) || 'US'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {user?.email || ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setActiveTab('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <Settings className="size-3.5 text-slate-400" />
                      Settings
                    </button>

                    <div className="my-1.5 h-px bg-slate-100 dark:bg-slate-800" />

                    <button
                      onClick={() => { setShowProfileDropdown(false); setShowSignOutConfirm(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <LogOut className="size-3.5" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── MAIN LAYOUT (SIDEBAR + CONTENT AREA) ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside className="w-64 hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-4 space-y-6">
          {/* Workspace Title Card */}
          <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                {renderWorkspaceIcon(workspace?.icon || 'rocket')}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {workspace?.name || 'Workspace'}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {workspace?.topic || 'Real-time collaboration'}
                </p>
              </div>
            </div>
          </div>

          {/* Main Workspace Navigation */}
          <div className="space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: Building2 },
              { id: 'meetings', label: 'Meetings & Syncs', icon: Video },
              { id: 'chat', label: 'Channel Chat', icon: MessageSquare },
              { id: 'ask-ai', label: 'Talk2Me AI', icon: Sparkles },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="size-4" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.id === 'ask-ai' && (
                    <span className="px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 text-[9px] font-bold">
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Channels Section */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Channels
              </span>
              <button
                onClick={() => setShowCreateChannelModal(true)}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveTab('chat');
                    setSelectedChannel(ch.name);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-colors ${
                    activeTab === 'chat' && selectedChannel === ch.name
                      ? 'bg-slate-200/80 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Hash className="size-3.5 text-slate-400" />
                  <span className="truncate">{ch.name.replace(/^#\s*/, '')}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN DASHBOARD CONTENT VIEW */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 font-sans pb-24 lg:pb-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="max-w-5xl flex flex-col gap-6">
              {/* Header Greeting */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {timeGreeting}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  Welcome to {workspace?.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {workspace?.topic} · Invite Code:{' '}
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {workspace?.invite_code}
                  </span>
                </p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Members', value: members.length || 1, icon: Users, color: 'text-indigo-500' },
                  { label: 'Channels', value: channels.length, icon: MessageSquare, color: 'text-cyan-500' },
                  { label: 'AI Assistant', value: 'Active', icon: Sparkles, color: 'text-purple-500' },
                  { label: 'Realtime Engine', value: 'WebRTC', icon: Video, color: 'text-emerald-500' },
                ].map((stat, i) => {
                  const StatIcon = stat.icon;
                  return (
                    <div
                      key={i}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-xs flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</span>
                        <StatIcon className={`size-4 ${stat.color}`} />
                      </div>
                      <span className="text-xl font-black text-slate-900 dark:text-white">{stat.value}</span>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions Grid */}
              <div className="grid sm:grid-cols-3 gap-4">
                <button
                  onClick={handleCreateMeeting}
                  className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-slate-900 text-left hover:scale-[1.02] transition-all group"
                >
                  <Video className="size-6 text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Start Workspace Meeting</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Instant WebRTC room with live transcription & AI insights.</p>
                </button>

                <button
                  onClick={() => setActiveTab('chat')}
                  className="p-5 rounded-2xl border border-cyan-200 dark:border-cyan-900/50 bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/40 dark:to-slate-900 text-left hover:scale-[1.02] transition-all group"
                >
                  <MessageSquare className="size-6 text-cyan-600 dark:text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Team Channel Chat</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Real-time messaging with @Talk2Me AI assistant integration.</p>
                </button>

                <button
                  onClick={() => setActiveTab('ask-ai')}
                  className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-slate-900 text-left hover:scale-[1.02] transition-all group"
                >
                  <Sparkles className="size-6 text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ask Talk2Me AI</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ask questions across all meeting transcripts and decisions.</p>
                </button>
              </div>

              {/* Members List */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Workspace Members</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                      <div className="size-8 rounded-full bg-indigo-600 grid place-items-center text-white text-xs font-bold">
                        {m.profile?.full_name?.slice(0, 2).toUpperCase() || 'MB'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {m.profile?.full_name || 'Team Member'}
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize">{m.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEETINGS */}
          {activeTab === 'meetings' && (() => {
            const selectedMeeting = workspaceMeetings.find(m => m.id === selectedMeetingId);
            const detail = selectedMeetingId ? meetingSummaries[selectedMeetingId] : null;

            // Unique speakers in the selected meeting's transcript
            const speakers = detail
              ? Array.from(new Set(detail.turns.map(t => t.speaker_name)))
              : [];

            const filteredTurns = detail?.turns.filter(t =>
              transcriptSpeakerFilter === 'all' || t.speaker_name === transcriptSpeakerFilter
            ) ?? [];

            const filteredDecisions = detail?.decisions.filter(d =>
              decisionCategoryFilter === 'all' || d.category === decisionCategoryFilter
            ) ?? [];

            const decisionCategoryMeta: Record<string, { label: string; icon: React.FC<any>; color: string }> = {
              decision:    { label: 'Decisions',    icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
              action_item: { label: 'Action Items', icon: ListTodo,     color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
              proposal:    { label: 'Proposals',    icon: Lightbulb,    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
              question:    { label: 'Questions',    icon: HelpCircle,   color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' },
              suggestion:  { label: 'Suggestions',  icon: CircleDot,    color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
            };

            /** Format duration between two ISO strings → "X min" */
            const formatDuration = (start: string, end?: string | null) => {
              if (!end) return null;
              const diffMs = new Date(end).getTime() - new Date(start).getTime();
              const mins = Math.floor(diffMs / 60000);
              return mins < 1 ? '<1 min' : `${mins} min`;
            };

            /** Format ms → MM:SS */
            const formatMs = (ms: number) => {
              const s = Math.floor(ms / 1000);
              return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
            };

            // Assign a color per speaker (cycles through palette)
            const speakerPalette = [
              'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
              'bg-cyan-500', 'bg-rose-500', 'bg-teal-500', 'bg-orange-500',
            ];
            const speakerColorMap: Record<string, string> = {};
            speakers.forEach((sp, i) => { speakerColorMap[sp] = speakerPalette[i % speakerPalette.length]; });

            return (
              <div className="flex flex-col gap-5 h-full">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Meetings & Syncs</h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Past meetings with AI-formatted transcripts, decisions, and action items.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateMeeting}
                    className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
                  >
                    <Video className="size-4" /> Start New Meeting
                  </button>
                </div>

                {/* Two-panel layout */}
                <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 16rem)' }}>

                  {/* ── LEFT: Meeting List ── */}
                  <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
                    {isLoadingMeetings ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <Loader2 className="size-6 animate-spin text-indigo-500" />
                        <p className="text-xs text-slate-500">Loading meetings...</p>
                      </div>
                    ) : workspaceMeetings.length === 0 ? (
                      <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center text-center gap-2">
                        <CalendarDays className="size-10 text-slate-300 dark:text-slate-700" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No meetings yet</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500">Start a meeting to see it listed here after it ends.</p>
                      </div>
                    ) : (
                      workspaceMeetings.map(m => {
                        const isSelected = m.id === selectedMeetingId;
                        const duration = formatDuration(m.created_at, (m as any).ended_at);
                        const isLive = m.status === 'active';
                        return (
                          <button
                            key={m.id}
                            onClick={() => setSelectedMeetingId(m.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all ${
                              isSelected
                                ? 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              {isLive ? (
                                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold">
                                  <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                                  Live
                                </span>
                              ) : (
                                <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-semibold">
                                  Ended
                                </span>
                              )}
                            </div>
                            {duration && (
                              <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-500">
                                <Clock className="size-3" /> {duration}
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* ── RIGHT: Meeting Detail ── */}
                  <div className="flex-1 min-w-0 overflow-y-auto flex flex-col gap-4">
                    {!selectedMeetingId || !selectedMeeting ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                        <FileText className="size-12 text-slate-300 dark:text-slate-700" />
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Select a meeting</p>
                        <p className="text-xs text-slate-500">Click a meeting on the left to view its transcript and AI summary.</p>
                      </div>
                    ) : isLoadingDetail ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
                        <Loader2 className="size-8 animate-spin text-indigo-500" />
                        <p className="text-xs text-slate-500">Analyzing transcript with AI...</p>
                      </div>
                    ) : (
                      <>
                        {/* Meeting header */}
                        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{selectedMeeting.title}</h2>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="size-3" />
                                  {new Date(selectedMeeting.created_at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {(selectedMeeting as any).ended_at && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {formatDuration(selectedMeeting.created_at, (selectedMeeting as any).ended_at)}
                                  </span>
                                )}
                                {detail && detail.turns.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Mic className="size-3" />
                                    {detail.turns.length} turns
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleRefreshSummary}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 transition-all"
                                title="Re-run AI analysis"
                              >
                                <RefreshCw className="size-3" /> Re-analyze
                              </button>
                              <Link
                                href={`/room/${selectedMeeting.room_code}`}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-all"
                              >
                                <Video className="size-3" /> Rejoin
                              </Link>
                            </div>
                          </div>
                        </div>

                        {/* AI Summary */}
                        {detail && (detail.summary || detail.decisions.length > 0) && (
                          <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/80 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-950/20">
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
                              <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 uppercase tracking-wide">AI Summary</span>
                            </div>
                            {detail.summary && (
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">{detail.summary}</p>
                            )}
                            {detail.decisions.length > 0 && (
                              <>
                                {/* Category filter pills */}
                                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                                  {['all', 'decision', 'action_item', 'proposal', 'question', 'suggestion'].map(cat => {
                                    const count = cat === 'all'
                                      ? detail.decisions.length
                                      : detail.decisions.filter(d => d.category === cat).length;
                                    if (cat !== 'all' && count === 0) return null;
                                    const meta = decisionCategoryMeta[cat];
                                    return (
                                      <button
                                        key={cat}
                                        onClick={() => setDecisionCategoryFilter(cat)}
                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                                          decisionCategoryFilter === cat
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                      >
                                        {cat === 'all' ? `All (${count})` : `${meta.label} (${count})`}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex flex-col gap-2">
                                  {filteredDecisions.map((d, i) => {
                                    const meta = decisionCategoryMeta[d.category];
                                    const Icon = meta?.icon || CheckCircle2;
                                    return (
                                      <div key={i} className={`p-3 rounded-xl border text-xs ${meta?.color || ''}`}>
                                        <div className="flex items-start gap-2">
                                          <Icon className="size-3.5 mt-0.5 shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="font-semibold leading-snug">{d.text}</p>
                                            <p className="mt-1 opacity-70 italic">
                                              — {d.evidence_speaker} at {formatMs(d.evidence_timestamp_ms)}: &ldquo;{d.evidence_quote}&rdquo;
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Full Transcript */}
                        {detail && detail.turns.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Mic className="size-4 text-slate-400" /> Full Transcript
                              </h3>
                              {/* Speaker filter */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['all', ...speakers].map(sp => (
                                  <button
                                    key={sp}
                                    onClick={() => setTranscriptSpeakerFilter(sp)}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                                      transcriptSpeakerFilter === sp
                                        ? 'bg-slate-800 dark:bg-white border-slate-800 dark:border-white text-white dark:text-slate-900'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                  >
                                    {sp === 'all' ? 'All Speakers' : sp}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              {filteredTurns.map((turn, i) => {
                                const avatarColor = speakerColorMap[turn.speaker_name] || 'bg-slate-500';
                                const initials = turn.speaker_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                                return (
                                  <div key={turn.id || i} className="flex gap-3 group">
                                    <div className={`size-7 rounded-full ${avatarColor} grid place-items-center text-white text-[10px] font-black shrink-0 mt-0.5`}>
                                      {initials}
                                    </div>
                                    <div className="flex-1 min-w-0 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-[11px] font-bold text-slate-900 dark:text-white">{turn.speaker_name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">{formatMs(turn.start_ms)}</span>
                                      </div>
                                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{turn.content}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : detail && detail.turns.length === 0 ? (
                          <div className="p-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center text-center gap-2">
                            <Mic className="size-10 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No transcript data</p>
                            <p className="text-[11px] text-slate-500">This meeting has no saved transcript turns. Transcription must be active during the meeting.</p>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 3: CHANNEL CHAT */}
          {activeTab === 'chat' && (
            <div className="h-[calc(100vh-8rem)] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-md">
              {/* Channel Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
                <div className="flex items-center gap-2">
                  <Hash className="size-4 text-indigo-500" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedChannel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch.name)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                        selectedChannel === ch.name
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {activeMessages.length === 0 ? (
                  <div className="h-full grid place-items-center text-xs text-slate-400">
                    No messages in {selectedChannel} yet. Start the conversation!
                  </div>
                ) : (
                  activeMessages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={`p-3.5 rounded-2xl max-w-2xl text-xs ${
                        msg.is_ai
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60'
                          : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className={msg.is_ai ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}>
                          {msg.sender_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        <FormattedChatMessage content={msg.content} />
                      </p>
                    </div>
                  ))
                )}
                {isAiThinking && (
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" />
                    Talk2Me AI is analyzing and writing response...
                  </div>
                )}
              </div>

              {/* Input Box */}
              <div className="relative p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/80">
                <MentionAutocomplete
                  inputValue={chatInputText}
                  onSelectMention={(newText) => setChatInputText(newText)}
                  candidates={mentionCandidates}
                  inputRef={chatInputRef}
                />
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  placeholder="Send message or type @ to tag AI or members..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleSendChatMessage}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Send className="size-3.5" /> Send
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ASK AI */}
          {activeTab === 'ask-ai' && (
            <div className="max-w-4xl flex flex-col gap-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="size-6 text-indigo-600 dark:text-indigo-400" /> Talk2Me AI Assistant
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Ask questions across all meeting transcripts, team decisions, and workspace knowledge.
                </p>
              </div>

              {/* Thread */}
              <div className="space-y-4">
                {askAiMessages.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className={`p-4 sm:p-5 rounded-2xl border ${
                      msg.is_ai
                        ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/60 shadow-md'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                      <span>{msg.sender_name}</span>
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {msg.content}
                    </p>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-500">
                    <Loader2 className="size-4 animate-spin text-indigo-500" />
                    Searching workspace transcripts and extracting insights...
                  </div>
                )}
              </div>

              {/* Prompt bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={askAiInput}
                  onChange={(e) => setAskAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendAskAi()}
                  placeholder="What key decisions were made in our recent engineering sync?"
                  className="flex-1 px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500 shadow-xs"
                />
                <button
                  onClick={handleSendAskAi}
                  className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md"
                >
                  Ask AI
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-5xl flex flex-col gap-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Workspace Settings</h1>

              {/* Workspace Info */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">General</h2>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Workspace Name</label>
                  <input
                    type="text"
                    value={workspace?.name || ''}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Invite Code</label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={workspace?.invite_code || ''}
                      readOnly
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-mono font-bold"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(workspace?.invite_code || '');
                          setCopiedWsCode(true);
                          setTimeout(() => setCopiedWsCode(false), 2000);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
                      >
                        {copiedWsCode ? 'Copied Code!' : 'Copy Code'}
                      </button>
                      <button
                        onClick={() => {
                          const inviteUrl = `${window.location.origin}/dashboard?join=${workspace?.invite_code || ''}`;
                          navigator.clipboard.writeText(inviteUrl);
                          setCopiedWsCode(true);
                          setTimeout(() => setCopiedWsCode(false), 2000);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Share2 className="size-3.5" />
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Bank */}
              <div className="flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Brain className="size-5 text-purple-600 dark:text-purple-400" /> AI Memory Bank
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 text-[10px] font-extrabold">
                        {memories.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Persistent long-term knowledge, team specs, user preferences, and architectural decisions automatically recalled by Talk2Me AI.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={handleExtractAiMemory}
                      disabled={isExtractingAiMemory}
                      className="px-4 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isExtractingAiMemory ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Synthesizing Chat...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4 text-purple-500" /> Auto-Extract from Chat
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowAddMemoryModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
                    >
                      <Plus className="size-4" /> Add Memory
                    </button>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'decision', label: 'Decisions' },
                      { id: 'spec', label: 'Specs' },
                      { id: 'fact', label: 'Facts' },
                      { id: 'user_preference', label: 'Preferences' },
                      { id: 'action_item', label: 'Action Items' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setMemoryCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          memoryCategoryFilter === cat.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative min-w-[220px]">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={memorySearchQuery}
                      onChange={(e) => setMemorySearchQuery(e.target.value)}
                      placeholder="Search memories..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {memorySearchQuery && (
                      <button
                        onClick={() => setMemorySearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Memories List */}
                {filteredMemories.length === 0 ? (
                  <div className="p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center">
                    <Brain className="size-12 text-slate-300 dark:text-slate-700 mb-3" />
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                      No memories found
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                      {memories.length === 0
                        ? 'Add key project facts, decisions, or specs manually, or auto-extract memories from your active channel chat!'
                        : 'No memories match your search filter.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredMemories.map((mem) => {
                      const categoryColors: Record<string, string> = {
                        decision: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
                        spec: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
                        fact: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                        user_preference: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                        action_item: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                        summary: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                      };

                      const badgeClass = categoryColors[mem.category] || categoryColors.summary;

                      return (
                        <div
                          key={mem.id}
                          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col justify-between gap-3 group hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${badgeClass}`}>
                                {mem.category.replace('_', ' ')}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium text-slate-400">
                                  {new Date(mem.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <button
                                  onClick={() => handleDeleteMemory(mem.id)}
                                  title="Delete Memory"
                                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>

                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {mem.title}
                            </h3>

                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                              {mem.content}
                            </p>
                          </div>

                          {mem.tags && mem.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/60">
                              {mem.tags.map((tag, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                  <Tag className="size-2.5" /> {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── SIGN OUT CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showSignOutConfirm && (
          <div className="fixed inset-0 z-[60] grid place-items-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl"
            >
              {/* Icon */}
              <div className="mx-auto mb-4 size-14 rounded-2xl bg-red-50 dark:bg-red-950/40 grid place-items-center">
                <LogOut className="size-6 text-red-500" />
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white text-center mb-1">
                Sign out?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
                You&apos;ll be returned to the login screen. Any unsaved work will remain intact.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowSignOutConfirm(false); signOut(); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Yes, Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CREATE WORKSPACE MODAL ── */}
      <AnimatePresence>
        {showCreateWsModal && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Workspace</h3>
                <button onClick={() => setShowCreateWsModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Workspace Name</label>
                  <input
                    type="text"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="e.g. Engineering Lead Team"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Topic / Objective</label>
                  <input
                    type="text"
                    value={newWsTopic}
                    onChange={(e) => setNewWsTopic(e.target.value)}
                    placeholder="e.g. AI Product Development & Syncs"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreateWsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWorkspace}
                  disabled={isCreatingWs || !newWsName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isCreatingWs ? <Loader2 className="size-4 animate-spin" /> : 'Create Workspace'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── JOIN WORKSPACE MODAL ── */}
      <AnimatePresence>
        {showJoinWsModal && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Join Workspace</h3>
                <button onClick={() => setShowJoinWsModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Invite Code or ID</label>
                <input
                  type="text"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value)}
                  placeholder="e.g. WS-A1B2C3"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {joinError && <p className="text-xs text-red-500 mt-1">{joinError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowJoinWsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinWorkspace}
                  disabled={isJoiningWs || !joinInviteCode.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isJoiningWs ? <Loader2 className="size-4 animate-spin" /> : 'Join Workspace'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CREATE CHANNEL MODAL ── */}
      <AnimatePresence>
        {showCreateChannelModal && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Channel</h3>
                <button onClick={() => setShowCreateChannelModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. launch-announcements"
                  className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreateChannelModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={isCreatingChannel || !newChannelName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isCreatingChannel ? <Loader2 className="size-4 animate-spin" /> : 'Create Channel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Add Workspace Memory */}
        {showAddMemoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Brain className="size-5 text-purple-600 dark:text-purple-400" /> Add Workspace AI Memory
                </h3>
                <button onClick={() => setShowAddMemoryModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Memory Title</label>
                  <input
                    type="text"
                    value={newMemoryTitle}
                    onChange={(e) => setNewMemoryTitle(e.target.value)}
                    placeholder="e.g. Primary Database Choice"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Category</label>
                    <select
                      value={newMemoryCategory}
                      onChange={(e) => setNewMemoryCategory(e.target.value as MemoryCategory)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="decision">Decision</option>
                      <option value="spec">Technical Spec</option>
                      <option value="fact">Project Fact</option>
                      <option value="user_preference">User Preference</option>
                      <option value="action_item">Action Item</option>
                      <option value="summary">Summary</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={newMemoryTags}
                      onChange={(e) => setNewMemoryTags(e.target.value)}
                      placeholder="e.g. database, supabase, rls"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Memory Content / Statement</label>
                  <textarea
                    rows={4}
                    value={newMemoryContent}
                    onChange={(e) => setNewMemoryContent(e.target.value)}
                    placeholder="e.g. We decided to build our real-time database schema on Supabase PostgreSQL with row level security enabled across all workspaces."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddMemoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMemory}
                  disabled={isSavingMemory || !newMemoryTitle.trim() || !newMemoryContent.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isSavingMemory ? <Loader2 className="size-4 animate-spin" /> : 'Save Memory'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-10 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
              Loading Workspace...
            </p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
