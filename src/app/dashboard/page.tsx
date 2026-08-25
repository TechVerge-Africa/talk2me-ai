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
  AlertCircle
} from 'lucide-react';

import { useAuth } from '@/features/auth/use-auth';
import { MeetingService } from '@/services/supabase/meetings';
import {
  WorkspaceService,
  FullWorkspaceData,
  DbWorkspaceMessage,
  DbWorkspaceChannel
} from '@/services/supabase/workspaces';
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
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

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
            workspaceName: currentWorkspaceData.workspace.name,
            workspaceTopic: currentWorkspaceData.workspace.topic,
            chatHistory: currentWorkspaceData.messages[selectedChannel] || [],
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
          workspaceName: currentWorkspaceData.workspace.name,
          workspaceTopic: currentWorkspaceData.workspace.topic,
          chatHistory: currentWorkspaceData.messages['🤖 Ask AI'] || [],
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

          {/* User Avatar */}
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
            <div className="size-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white text-xs font-black uppercase shadow-xs">
              {user?.email?.slice(0, 2) || 'US'}
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </button>
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
          {activeTab === 'meetings' && (
            <div className="max-w-4xl flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    Workspace Meetings
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Live WebRTC meetings with AI decision tracking and canonical transcription.
                  </p>
                </div>

                <button
                  onClick={handleCreateMeeting}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md"
                >
                  <Video className="size-4" /> Start New Meeting
                </button>
              </div>

              {/* Instant Room Card */}
              <div className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Instant Team Room</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Launch a high-definition video call for {workspace?.name} anytime.
                  </p>
                </div>
                <button
                  onClick={handleCreateMeeting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg"
                >
                  Join Meeting Room
                </button>
              </div>
            </div>
          )}

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
            <div className="max-w-2xl flex flex-col gap-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Workspace Settings</h1>
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
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
            </div>
          )}
        </main>
      </div>

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
