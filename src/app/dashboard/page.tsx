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
  User,
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
  RefreshCw,
  Pin,
  Home,
  Lock,
  Globe,
  Calendar,
  Pause,
  Play,
  AlertTriangle,
  Layout
} from 'lucide-react';

import { useAuth } from '@/features/auth/use-auth';
import { supabase } from '@/services/supabase/client';
import { MeetingService } from '@/services/supabase/meetings';
import { Meeting, MeetingParticipant } from '@/types/meeting';
import { WorkspaceWhiteboard } from '@/features/whiteboard/workspace-whiteboard';
import { TranscriptService, CanonicalTranscriptEntry } from '@/services/supabase/transcripts';
import {
  WorkspaceService,
  FullWorkspaceData,
  DbWorkspaceMessage,
  DbWorkspaceChannel,
  DbWorkspaceMember
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

type WorkspaceTab = 'home' | 'meetings' | 'chat' | 'whiteboard' | 'ask-ai' | 'settings';

function formatCountdown(scheduledAtIso: string, nowMs: number) {
  const diffMs = new Date(scheduledAtIso).getTime() - nowMs;
  if (diffMs <= 0) {
    return { text: 'Starting Now!', isOverdue: true, hours: 0, mins: 0, secs: 0 };
  }
  const totalSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return {
    hours,
    mins,
    secs,
    isOverdue: false,
    text: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
  };
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading, updateProfile, signOut } = useAuth();

  // Navigation tab & selection state with browser reload & return persistence
  const [activeTab, setActiveTabRaw] = useState<WorkspaceTab>('home');

  const setActiveTab = (tab: WorkspaceTab) => {
    setActiveTabRaw(tab);
    try {
      localStorage.setItem('t2_active_tab_v1', tab);
      sessionStorage.setItem('t2_return_tab', tab);
    } catch {}
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlTab = searchParams.get('tab') as WorkspaceTab | null;
      const storedTab = (() => {
        try { return sessionStorage.getItem('t2_return_tab') || localStorage.getItem('t2_active_tab_v1') || null; } catch { return null; }
      })() as WorkspaceTab | null;

      const validTab = urlTab || storedTab;
      const ALL_TABS: WorkspaceTab[] = ['home', 'meetings', 'chat', 'whiteboard', 'ask-ai', 'settings'];
      if (validTab && ALL_TABS.includes(validTab)) {
        setActiveTabRaw(validTab);
      }
    }
  }, [searchParams]);

  // ── Profile / Username Editing State ─────────────────────────────────
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<boolean>(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  const userDisplayName = useMemo(() => {
    return profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  }, [profile, user]);

  useEffect(() => {
    const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
    if (name) {
      setUsernameInput(name);
    }
  }, [profile, user]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!usernameInput.trim()) {
      setProfileSaveError('Username cannot be empty');
      return;
    }
    setIsSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaveSuccess(false);

    try {
      await updateProfile({ full_name: usernameInput.trim() });
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err: any) {
      setProfileSaveError(err?.message || 'Failed to update username');
    } finally {
      setIsSavingProfile(false);
    }
  };

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
  const [copiedCodeWsId, setCopiedCodeWsId] = useState<string | null>(null);

  // Modals state
  const [showCreateWsModal, setShowCreateWsModal] = useState<boolean>(false);
  const [newWsName, setNewWsName] = useState<string>('');
  const [newWsTopic, setNewWsTopic] = useState<string>('');
  const [newWsIcon, setNewWsIcon] = useState<string>('rocket');
  const [isCreatingWs, setIsCreatingWs] = useState<boolean>(false);

  const [showJoinWsModal, setShowJoinWsModal] = useState<boolean>(false);
  const [joinInviteCode, setJoinInviteCode] = useState<string>('');
  const [joinDisplayName, setJoinDisplayName] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoiningWs, setIsJoiningWs] = useState<boolean>(false);
  const [showPendingApprovalModal, setShowPendingApprovalModal] = useState<boolean>(false);
  const [pendingWsInfo, setPendingWsInfo] = useState<{ name: string; inviteCode: string } | null>(null);

  // Workspace Access & Owner Privileges State
  const [pendingRequests, setPendingRequests] = useState<DbWorkspaceMember[]>([]);
  const [isLoadingPendingRequests, setIsLoadingPendingRequests] = useState<boolean>(false);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState<boolean>(false);
  const [showDeleteWsModal, setShowDeleteWsModal] = useState<boolean>(false);
  const [deleteWsConfirmInput, setDeleteWsConfirmInput] = useState<string>('');
  const [isDeletingWs, setIsDeletingWs] = useState<boolean>(false);
  const [isTogglingWsPause, setIsTogglingWsPause] = useState<boolean>(false);

  useEffect(() => {
    if (showJoinWsModal) {
      setJoinDisplayName(profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '');
    }
  }, [showJoinWsModal, profile, user]);

  const [showCreateChannelModal, setShowCreateChannelModal] = useState<boolean>(false);
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [isCreatingChannel, setIsCreatingChannel] = useState<boolean>(false);

  // Workspace Meeting Creation & Scheduling Modal State
  const [showMeetingModal, setShowMeetingModal] = useState<boolean>(false);
  const [meetingModalMode, setMeetingModalMode] = useState<'instant' | 'scheduled'>('instant');
  const [meetingModalTitle, setMeetingModalTitle] = useState<string>('');
  const [meetingModalDate, setMeetingModalDate] = useState<string>('');
  const [meetingModalAccessLevel, setMeetingModalAccessLevel] = useState<'members_only' | 'open'>('members_only');
  const [meetingModalRequireApproval, setMeetingModalRequireApproval] = useState<boolean>(false);
  const [meetingModalAllowScreenShare, setMeetingModalAllowScreenShare] = useState<boolean>(true);
  const [isSubmittingMeetingModal, setIsSubmittingMeetingModal] = useState<boolean>(false);

  const openCreateMeetingModal = (mode: 'instant' | 'scheduled' = 'instant') => {
    setMeetingModalMode(mode);
    setMeetingModalTitle(activeWorkspaceId ? `${currentWorkspaceData?.workspace.name || 'Workspace'} Sync` : 'Instant Sync Meeting');
    setMeetingModalAccessLevel(activeWorkspaceId ? 'members_only' : 'open');
    setMeetingModalRequireApproval(false);
    setMeetingModalAllowScreenShare(true);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setMeetingModalDate(localIso);
    setShowMeetingModal(true);
  };

  // Chat & AI Inputs
  const [chatInputText, setChatInputText] = useState<string>('');
  const [askAiInput, setAskAiInput] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const chatInputRef = React.useRef<HTMLInputElement>(null);

  // Floating chat input scroll-hide state
  const [isChatInputVisible, setIsChatInputVisible] = useState<boolean>(true);
  const lastChatScrollTopRef = React.useRef<number>(0);
  const chatMessagesEndRef = React.useRef<HTMLDivElement>(null);

  const handleChannelChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    const delta = currentScrollTop - lastChatScrollTopRef.current;

    // Only hide if scrolled down past top threshold (80px) and scrolling significantly (> 10px)
    if (Math.abs(delta) > 10) {
      if (delta > 0 && currentScrollTop > 80) {
        setIsChatInputVisible(false);
      } else if (delta < 0) {
        setIsChatInputVisible(true);
      }
    }

    // Always reveal input when near bottom of chat history
    const { scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - currentScrollTop - clientHeight < 140) {
      setIsChatInputVisible(true);
    }

    lastChatScrollTopRef.current = currentScrollTop;
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      setIsChatInputVisible(true);
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [selectedChannel, activeTab]);

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

  // Workspace dropdown state
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState<boolean>(false);
  const workspaceDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close workspace dropdown on outside click
  useEffect(() => {
    if (!showWorkspaceDropdown) return;
    const handler = (e: MouseEvent) => {
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(e.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showWorkspaceDropdown]);

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

  // Live Countdown Timer & Active Meeting Members state
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [liveMeetingParticipants, setLiveMeetingParticipants] = useState<MeetingParticipant[]>([]);

  // Compute active live meeting or upcoming scheduled meeting for single hero card
  const activeLiveMeeting = useMemo(() => {
    return workspaceMeetings.find((m) => m.status === 'active' || (m as any).is_active);
  }, [workspaceMeetings]);

  const upcomingMeeting = useMemo(() => {
    if (activeLiveMeeting) return null;
    return (
      workspaceMeetings
        .filter((m) => m.scheduled_at && new Date(m.scheduled_at).getTime() > Date.now() - 300000)
        .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0] || null
    );
  }, [workspaceMeetings, activeLiveMeeting]);

  // Interval for 1-second live countdown timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch / subscribe to participants when a meeting is active
  useEffect(() => {
    if (activeLiveMeeting) {
      MeetingService.getMeetingParticipants(activeLiveMeeting.id)
        .then((pts) => setLiveMeetingParticipants(pts))
        .catch((err) => console.error('[Dashboard] Live participants error:', err));
    } else {
      setLiveMeetingParticipants([]);
    }
  }, [activeLiveMeeting]);

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

  const [hubActiveMeetingsMap, setHubActiveMeetingsMap] = useState<Record<string, Meeting>>({});

  // Load User Workspaces from Supabase
  const fetchWorkspaces = async () => {
    if (!user) return;
    setIsLoadingWorkspaces(true);
    try {
      const data = await WorkspaceService.getUserWorkspaces(user.id);
      setWorkspacesData(data);

      const wsIds = data.map((w) => w.workspace.id);
      if (wsIds.length > 0) {
        MeetingService.getActiveWorkspaceMeetings(wsIds)
          .then((meetings) => {
            const map: Record<string, Meeting> = {};
            meetings.forEach((m) => {
              if (m.workspace_id) {
                const existing = map[m.workspace_id];
                if (!existing || m.status === 'active' || (m.scheduled_at && new Date(m.scheduled_at).getTime() < new Date(existing.scheduled_at || 0).getTime())) {
                  map[m.workspace_id] = m;
                }
              }
            });
            setHubActiveMeetingsMap(map);
          })
          .catch(console.error);
      }

      const wsParam = searchParams.get('ws') || searchParams.get('workspaceId');

      if (wsParam && data.some((w) => w.workspace.id === wsParam)) {
        setActiveWorkspaceId(wsParam);
      } else if (!wsParam) {
        setActiveWorkspaceId('');
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching workspaces:', err);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  const selectWorkspace = (wsId: string, targetTab?: WorkspaceTab) => {
    setActiveWorkspaceId(wsId);
    const chosenTab = targetTab || activeTab || 'home';
    try {
      if (wsId) {
        localStorage.setItem('t2_active_workspace_v1', wsId);
        sessionStorage.setItem('t2_return_workspace_id', wsId);
      } else {
        localStorage.removeItem('t2_active_workspace_v1');
        sessionStorage.removeItem('t2_return_workspace_id');
      }
      localStorage.setItem('t2_active_tab_v1', chosenTab);
      sessionStorage.setItem('t2_return_tab', chosenTab);
    } catch {}

    if (wsId) {
      router.push(`/dashboard?ws=${wsId}&tab=${chosenTab}`);
    } else {
      router.push(`/dashboard?tab=${chosenTab}`);
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
  }, [user]);

  useEffect(() => {
    const wsParam = searchParams.get('ws');
    if (wsParam && workspacesData.some((w) => w.workspace.id === wsParam)) {
      setActiveWorkspaceId(wsParam);
    } else if (!wsParam) {
      setActiveWorkspaceId('');
    }
  }, [searchParams, workspacesData]);

  // Active Workspace Data Object
  const currentWorkspaceData = useMemo(() => {
    if (!activeWorkspaceId) return null;
    return workspacesData.find((w) => w.workspace.id === activeWorkspaceId) || null;
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

  // Real-Time Subscriptions for Workspace Members (join / leave)
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const unsubscribe = WorkspaceService.subscribeToWorkspaceMembers(
      activeWorkspaceId,
      // On member joined
      (newMember) => {
        setWorkspacesData((prevList) =>
          prevList.map((item) => {
            if (item.workspace.id !== activeWorkspaceId) return item;
            // De-duplicate: skip if user already in list
            if (item.members.some((m) => m.user_id === newMember.user_id)) {
              return item;
            }
            return { ...item, members: [...item.members, newMember] };
          })
        );
      },
      // On member left
      (userId) => {
        setWorkspacesData((prevList) =>
          prevList.map((item) => {
            if (item.workspace.id !== activeWorkspaceId) return item;
            return {
              ...item,
              members: item.members.filter((m) => m.user_id !== userId),
            };
          })
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeWorkspaceId]);

  // Check if current logged-in user is Owner or Admin of active workspace
  const isOwnerOrAdmin = useMemo(() => {
    if (!currentWorkspaceData || !user) return false;
    const myMember = currentWorkspaceData.members.find((m) => m.user_id === user.id);
    return myMember?.role === 'owner' || myMember?.role === 'admin' || currentWorkspaceData.workspace.owner_id === user.id;
  }, [currentWorkspaceData, user]);

  // Fetch pending join requests for workspace owners/admins
  const fetchPendingRequests = async () => {
    if (!activeWorkspaceId || !isOwnerOrAdmin) return;
    setIsLoadingPendingRequests(true);
    try {
      const pending = await WorkspaceService.getPendingJoinRequests(activeWorkspaceId);
      setPendingRequests(pending);
    } catch (err) {
      console.error('[Dashboard] Error fetching pending requests:', err);
    } finally {
      setIsLoadingPendingRequests(false);
    }
  };

  useEffect(() => {
    if (activeWorkspaceId && isOwnerOrAdmin) {
      fetchPendingRequests();
    }
  }, [activeWorkspaceId, isOwnerOrAdmin]);

  const handleApproveJoinRequest = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    try {
      await WorkspaceService.approveJoinRequest(activeWorkspaceId, memberId);
      await fetchPendingRequests();
      await fetchWorkspaces();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve member');
    }
  };

  const handleRejectJoinRequest = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    try {
      await WorkspaceService.rejectJoinRequest(activeWorkspaceId, memberId);
      await fetchPendingRequests();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject join request');
    }
  };

  const handleToggleJoinPolicy = async (newPolicy: 'open' | 'approval') => {
    if (!activeWorkspaceId) return;
    setIsUpdatingPolicy(true);
    try {
      const updatedWs = await WorkspaceService.updateWorkspaceJoinPolicy(activeWorkspaceId, newPolicy);
      setWorkspacesData((prev) =>
        prev.map((item) => {
          if (item.workspace.id !== activeWorkspaceId) return item;
          return {
            ...item,
            workspace: updatedWs,
          };
        })
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to update workspace join policy');
    } finally {
      setIsUpdatingPolicy(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return;
    try {
      await WorkspaceService.removeWorkspaceMember(activeWorkspaceId, memberId);
      await fetchWorkspaces();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, role: 'admin' | 'member') => {
    if (!activeWorkspaceId) return;
    try {
      await WorkspaceService.updateMemberRole(activeWorkspaceId, memberId, role);
      await fetchWorkspaces();
    } catch (err: any) {
      alert(err?.message || 'Failed to update member role');
    }
  };

  const handlePauseMember = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    try {
      await WorkspaceService.pauseUserMembership(activeWorkspaceId, memberId);
      await fetchWorkspaces();
    } catch (err: any) {
      alert(err?.message || 'Failed to pause member');
    }
  };

  const handleResumeMember = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    try {
      await WorkspaceService.resumeUserMembership(activeWorkspaceId, memberId);
      await fetchWorkspaces();
    } catch (err: any) {
      alert(err?.message || 'Failed to unpause member');
    }
  };

  const handleToggleWorkspacePause = async () => {
    if (!activeWorkspaceId || !currentWorkspaceData) return;
    setIsTogglingWsPause(true);
    try {
      await WorkspaceService.toggleWorkspacePause(
        activeWorkspaceId,
        currentWorkspaceData.workspace.status
      );
      await fetchWorkspaces();
    } catch (err: any) {
      alert(err?.message || 'Failed to update workspace pause status');
    } finally {
      setIsTogglingWsPause(false);
    }
  };

  const handleConfirmDeleteWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !currentWorkspaceData) return;
    if (deleteWsConfirmInput.trim() !== currentWorkspaceData.workspace.name) return;

    setIsDeletingWs(true);
    try {
      const targetWsId = activeWorkspaceId;
      await WorkspaceService.deleteWorkspace(targetWsId);
      setShowDeleteWsModal(false);
      setDeleteWsConfirmInput('');
      setActiveWorkspaceId('');
      try {
        sessionStorage.removeItem('t2_return_workspace_id');
        localStorage.removeItem('t2_active_workspace_v1');
      } catch {}
      await fetchWorkspaces();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete workspace');
    } finally {
      setIsDeletingWs(false);
    }
  };

  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    if (!activeWorkspaceId) return;
    if (channelName === '# General') {
      alert('The default # General channel cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete channel ${channelName}?`)) return;
    try {
      await WorkspaceService.deleteChannel(activeWorkspaceId, channelId);
      setWorkspacesData((prev) =>
        prev.map((item) => {
          if (item.workspace.id !== activeWorkspaceId) return item;
          return {
            ...item,
            channels: item.channels.filter((c) => c.id !== channelId),
          };
        })
      );
      if (selectedChannel === channelName) {
        setSelectedChannel('# General');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete channel');
    }
  };

  // Handle Workspace Creation
  const handleCreateWorkspace = async () => {
    if (!newWsName.trim() || !user) return;
    if (!usernameInput.trim()) {
      alert('Please enter a username before creating a workspace');
      return;
    }
    setIsCreatingWs(true);
    try {
      const newWsData = await WorkspaceService.createWorkspace({
        name: newWsName.trim(),
        topic: newWsTopic.trim(),
        icon: newWsIcon,
        userId: user.id,
        displayName: usernameInput.trim(),
      });

      setWorkspacesData((prev) => [...prev, newWsData]);
      selectWorkspace(newWsData.workspace.id);
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
    if (!joinDisplayName.trim()) {
      setJoinError('Please enter your Full Name / User Name before joining.');
      return;
    }
    setIsJoiningWs(true);
    setJoinError(null);
    try {
      if (joinDisplayName.trim() !== profile?.full_name) {
        await updateProfile({ full_name: joinDisplayName.trim() });
      }
      const res = await WorkspaceService.joinWorkspaceByCode(
        joinInviteCode.trim(),
        user.id,
        joinDisplayName.trim()
      );

      if (res.status === 'pending') {
        setShowJoinWsModal(false);
        setPendingWsInfo({ name: res.workspace.name, inviteCode: res.workspace.invite_code });
        setShowPendingApprovalModal(true);
        setJoinInviteCode('');
      } else {
        await fetchWorkspaces();
        selectWorkspace(res.workspace.id);
        setSelectedChannel('# General');
        setActiveTab('home');
        setShowJoinWsModal(false);
        setJoinInviteCode('');
      }
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
    setIsChatInputVisible(true);
    setTimeout(() => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    const senderName = userDisplayName;

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

      // 2. Evaluate if Talk2Me AI should participate in chat (mentions, questions, brainstorming, planning, or idea discussions)
      const lower = textToSend.toLowerCase();
      const isExplicitTag = lower.includes('@talk2me') || lower.includes('talk2me');
      const isQuestion = textToSend.includes('?') || /\b(how|what|why|when|where|who|should|can|could|would)\b/i.test(textToSend);
      const isBrainstormOrPlan = /\b(brainstorm|idea|ideas|plan|planning|roadmap|feature|design|proposal|think|thoughts|opinion|feedback|suggest|suggestion|architecture|solution|strategy|build)\b/i.test(textToSend);

      if (isExplicitTag || isQuestion || isBrainstormOrPlan) {
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

    const senderName = userDisplayName;

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
  // Launch Instant Meeting (Outside workspace meetings are ephemeral - no DB data saved)
  const handleCreateMeeting = async () => {
    if (!user) return;
    try {
      const isOutsideWorkspace = !activeWorkspaceId;
      const title = isOutsideWorkspace
        ? 'Instant Ephemeral Meeting'
        : `${currentWorkspaceData?.workspace.name || 'Workspace'} Sync`;

      const meeting = await MeetingService.createMeeting(
        title,
        user.id,
        false,
        undefined,
        true,
        activeWorkspaceId || undefined,
        isOutsideWorkspace
      );
      try {
        if (activeWorkspaceId) {
          sessionStorage.setItem('t2_return_workspace_id', activeWorkspaceId);
          localStorage.setItem('t2_active_workspace_v1', activeWorkspaceId);
        } else {
          sessionStorage.removeItem('t2_return_workspace_id');
          localStorage.removeItem('t2_active_workspace_v1');
        }
        sessionStorage.setItem('t2_return_tab', activeTab);
        localStorage.setItem('t2_active_tab_v1', activeTab);
      } catch {}
      router.push(`/room/${meeting.room_code}?workspaceId=${activeWorkspaceId || ''}&ephemeral=${isOutsideWorkspace}&tab=${activeTab}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to create meeting');
    }
  };

  const handleSaveWorkspaceMeetingModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setIsSubmittingMeetingModal(true);
    try {
      const isOutsideWorkspace = !activeWorkspaceId;
      const title = meetingModalTitle.trim() || (isOutsideWorkspace ? 'Instant Ephemeral Meeting' : `${currentWorkspaceData?.workspace.name || 'Workspace'} Sync`);
      const scheduledAtIso = meetingModalMode === 'scheduled' && meetingModalDate ? new Date(meetingModalDate).toISOString() : undefined;

      const meeting = await MeetingService.createMeeting(
        title,
        user.id,
        meetingModalRequireApproval,
        scheduledAtIso,
        meetingModalAllowScreenShare,
        activeWorkspaceId || undefined,
        isOutsideWorkspace,
        meetingModalAccessLevel
      );

      setShowMeetingModal(false);

      if (meetingModalMode === 'instant') {
        try {
          if (activeWorkspaceId) {
            sessionStorage.setItem('t2_return_workspace_id', activeWorkspaceId);
            localStorage.setItem('t2_active_workspace_v1', activeWorkspaceId);
          } else {
            sessionStorage.removeItem('t2_return_workspace_id');
            localStorage.removeItem('t2_active_workspace_v1');
          }
          sessionStorage.setItem('t2_return_tab', activeTab);
          localStorage.setItem('t2_active_tab_v1', activeTab);
        } catch {}
        router.push(`/room/${meeting.room_code}?workspaceId=${activeWorkspaceId || ''}&ephemeral=${isOutsideWorkspace}&tab=${activeTab}`);
      } else {
        await fetchWorkspaceMeetings();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to create meeting');
    } finally {
      setIsSubmittingMeetingModal(false);
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

  // Fetch meetings list whenever active workspace changes
  useEffect(() => {
    if (activeWorkspaceId) {
      fetchWorkspaceMeetings();
    }
  }, [activeWorkspaceId, fetchWorkspaceMeetings]);

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

  // ── No workspaces: show onboarding screen ──────────────────────────────
  if (!isLoadingWorkspaces && workspacesData.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans">
        <GradientBackground />
        {/* Minimal header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <Link href="/" className="flex items-center gap-2 font-black text-lg text-slate-900 dark:text-white">
            <Video className="size-5 text-indigo-500" /> Talk2Me AI
          </Link>
          <ThemeToggle />
        </header>

        {/* Onboarding content */}
        <main className="flex-1 grid place-items-center px-4 py-16">
          <div className="max-w-lg w-full flex flex-col items-center text-center gap-8">
            {/* Icon + headline */}
            <div className="size-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center shadow-xl shadow-indigo-500/30">
              <Building2 className="size-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                Welcome to Talk2Me AI
              </h1>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                You're not part of any workspace yet. Create your own or join one with an invite code.
              </p>
            </div>

            {/* CTAs */}
            <div className="w-full grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setShowCreateWsModal(true)}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-all group"
              >
                <div className="size-12 rounded-xl bg-indigo-600 group-hover:scale-110 transition-transform grid place-items-center shadow-md">
                  <Plus className="size-6 text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-white">Create Workspace</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Start fresh with your own team</p>
                </div>
              </button>

              <button
                onClick={() => setShowJoinWsModal(true)}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-950/60 transition-all group"
              >
                <div className="size-12 rounded-xl bg-cyan-600 group-hover:scale-110 transition-transform grid place-items-center shadow-md">
                  <Compass className="size-6 text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-white">Join Workspace</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enter an invite code to join</p>
                </div>
              </button>
            </div>
          </div>
        </main>

        {/* Re-use the same Create Workspace modal */}
        {showCreateWsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="size-5 text-indigo-500" /> New Workspace
                </h2>
                <button onClick={() => setShowCreateWsModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="size-4 text-slate-400" />
                </button>
              </div>
              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Engineering Lead Team"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
              />
              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. AI Product Development & Syncs"
                value={newWsTopic}
                onChange={(e) => setNewWsTopic(e.target.value)}
              />
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWsName.trim() || isCreatingWs}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                {isCreatingWs ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {isCreatingWs ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </div>
        )}

        {/* Re-use the same Join Workspace modal */}
        {showJoinWsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass className="size-5 text-cyan-500" /> Join Workspace
                </h2>
                <button onClick={() => setShowJoinWsModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="size-4 text-slate-400" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                  Invite Code or Workspace ID <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="e.g. WS-A1B2C3"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                  Your Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={joinDisplayName}
                  onChange={(e) => setJoinDisplayName(e.target.value)}
                  placeholder="Enter your full name or nickname"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinWorkspace()}
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Required to prevent anonymous members in workspace chat & transcripts.
                </p>
              </div>

              {joinError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="size-3.5" /> {joinError}
                </p>
              )}
              <button
                onClick={handleJoinWorkspace}
                disabled={!joinInviteCode.trim() || !joinDisplayName.trim() || isJoiningWs}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                {isJoiningWs ? <Loader2 className="size-4 animate-spin" /> : <Compass className="size-4" />}
                {isJoiningWs ? 'Joining...' : 'Join Workspace'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const workspace = currentWorkspaceData?.workspace;
  const members = currentWorkspaceData?.members || [];
  const channels = currentWorkspaceData?.channels || [];
  const activeMessages = currentWorkspaceData?.messages[selectedChannel] || [];
  const askAiMessages = currentWorkspaceData?.messages['🤖 Ask AI'] || [];

  return (

    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
      <GradientBackground />

      {/* ── TOP APPLICATION HEADER ── */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Brand & Workspace Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 shrink-0"
            aria-label="Toggle Navigation Drawer"
          >
            <Menu className="size-5" />
          </button>

          <button
            onClick={() => {
              selectWorkspace('');
              setActiveTab('home');
            }}
            className="flex items-center gap-2 text-left focus:outline-none group shrink-0"
            title="Go to Workspaces Hub"
          >
            <div className="group-hover:scale-105 transition-transform flex items-center">
              <img src="/assets/logo-light.png" alt="Talk2Me Logo" className="h-7 w-auto block dark:hidden" />
              <img src="/assets/logo-dark.png" alt="Talk2Me Logo" className="h-7 w-auto hidden dark:block" />
            </div>

          </button>

          {/* Active Workspace Selector Dropdown */}
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block shrink-0" />

          {/* Custom Interactive Workspaces Hub Selector Dropdown */}
          <div className="relative shrink min-w-0" ref={workspaceDropdownRef}>
            <button
              onClick={() => setShowWorkspaceDropdown((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs group max-w-[170px] sm:max-w-[220px]"
              title="Switch Workspace or View Workspaces Hub"
              aria-haspopup="true"
              aria-expanded={showWorkspaceDropdown}
            >
              <div className="size-4 rounded-md bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 grid place-items-center flex-shrink-0">
                {activeWorkspaceId && currentWorkspaceData ? (
                  renderWorkspaceIcon(currentWorkspaceData.workspace.icon || 'rocket')
                ) : (
                  <Home className="size-3" />
                )}
              </div>
              <span className="truncate">
                {activeWorkspaceId && currentWorkspaceData ? currentWorkspaceData.workspace.name : 'Workspaces Hub'}
              </span>
              <ChevronDown className={`size-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 flex-shrink-0 ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Panel */}
            <AnimatePresence>
              {showWorkspaceDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2.5 w-72 z-50 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60 overflow-hidden"
                >
                  {/* Header Item: Main Workspaces Hub */}
                  <div className="p-1.5 border-b border-slate-200/80 dark:border-slate-800">
                    <button
                      onClick={() => {
                        selectWorkspace('');
                        setSelectedChannel('# General');
                        setActiveTab('home');
                        setShowWorkspaceDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        !activeWorkspaceId
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 grid place-items-center flex-shrink-0">
                          <Home className="size-3.5" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-extrabold text-slate-900 dark:text-white">Workspaces Hub</span>
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">All workspaces & quick start</span>
                        </div>
                      </div>
                      {!activeWorkspaceId && <Check className="size-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                    </button>
                  </div>

                  {/* Workspaces List */}
                  <div className="p-1.5 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="px-3 pt-1.5 pb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <span>Your Workspaces</span>
                      <span>{workspacesData.length}</span>
                    </div>

                    {workspacesData.length > 0 ? (
                      workspacesData.map((item) => {
                        const isActive = activeWorkspaceId === item.workspace.id;
                        return (
                          <button
                            key={item.workspace.id}
                            onClick={() => {
                              selectWorkspace(item.workspace.id);
                              setSelectedChannel('# General');
                              setActiveTab('home');
                              setShowWorkspaceDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                              isActive
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/60 dark:border-indigo-800/40'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="size-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 grid place-items-center flex-shrink-0">
                                {renderWorkspaceIcon(item.workspace.icon || 'rocket')}
                              </div>
                              <div className="flex flex-col truncate">
                                <span className="truncate font-bold text-slate-900 dark:text-white">
                                  {item.workspace.name}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {item.members.length} members · {item.channels.length} channels
                                </span>
                              </div>
                            </div>
                            {isActive && <Check className="size-4 text-indigo-600 dark:text-indigo-400 ml-2 flex-shrink-0" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                        No workspaces joined yet
                      </div>
                    )}
                  </div>

                  {/* Footer Actions: Create & Join Workspace */}
                  <div className="p-1.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setShowCreateWsModal(true);
                        setShowWorkspaceDropdown(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold transition-all"
                    >
                      <Plus className="size-3.5" /> Workspace
                    </button>
                    <button
                      onClick={() => {
                        setShowJoinWsModal(true);
                        setShowWorkspaceDropdown(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-950/80 border border-cyan-200/60 dark:border-cyan-800/50 text-cyan-600 dark:text-cyan-400 text-[11px] font-bold transition-all"
                    >
                      <Compass className="size-3.5" /> Join
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setShowCreateWsModal(true)}
            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1 shrink-0"
            title="Create New Workspace"
          >
            <Plus className="size-3.5" />
            <span className="hidden md:inline">Workspace</span>
          </button>

          <button
            onClick={() => setShowJoinWsModal(true)}
            className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/50 text-cyan-600 dark:text-cyan-400 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1 shrink-0"
            title="Join Workspace"
          >
            <Compass className="size-3.5" />
            <span className="hidden md:inline">Join</span>
          </button>
        </div>

        {/* Right: Theme & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
              {userDisplayName.slice(0, 2)}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2.5 w-64 z-50 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60 overflow-hidden"
                >
                  {/* User info header */}
                  <div className="px-4 py-3.5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border-b border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white text-sm font-black uppercase shadow-md flex-shrink-0">
                        {userDisplayName.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {userDisplayName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {user?.email || ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-2 space-y-0.5">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowProfileModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <User className="size-3.5 text-indigo-500" />
                      Edit Username / Profile
                    </button>

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

      {/* ── MOBILE NAVIGATION DRAWER ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Slide Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative z-10 w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 space-y-5 flex flex-col overflow-y-auto shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <img src="/assets/logo-light.png" alt="Talk2Me Logo" className="h-7 w-auto block dark:hidden" />
                    <img src="/assets/logo-dark.png" alt="Talk2Me Logo" className="h-7 w-auto hidden dark:block" />
                  </div>

                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Workspaces Hub CTA */}
              <button
                onClick={() => {
                  selectWorkspace('');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/50 transition-all shadow-2xs group"
              >
                <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Workspaces Hub</span>
              </button>

              {activeWorkspaceId && (
                <>
                  {/* Current Active Workspace Info Card */}
                  <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-800/80">
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

                  {/* Navigation Tabs */}
                  <div className="space-y-1">
                    {[
                      { id: 'home', label: 'Home', icon: Home },
                      { id: 'meetings', label: 'Meetings & Syncs', icon: Video },
                      { id: 'chat', label: 'Channel Chat', icon: MessageSquare },
                      { id: 'whiteboard', label: 'Work Board', icon: Layout },
                      { id: 'ask-ai', label: 'Talk2Me AI', icon: Sparkles },
                      { id: 'settings', label: 'Settings', icon: Settings },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id as WorkspaceTab);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            activeTab === tab.id
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
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
                        onClick={() => {
                          setShowCreateChannelModal(true);
                          setIsMobileMenuOpen(false);
                        }}
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
                            setIsMobileMenuOpen(false);
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
                </>
              )}

              {/* Workspaces List Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                  All Workspaces
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {workspacesData.map((item) => (
                    <button
                      key={item.workspace.id}
                      onClick={() => {
                        selectWorkspace(item.workspace.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                        activeWorkspaceId === item.workspace.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/50'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="size-6 rounded-lg bg-slate-200 dark:bg-slate-800 grid place-items-center flex-shrink-0">
                        {renderWorkspaceIcon(item.workspace.icon || 'rocket')}
                      </div>
                      <span className="truncate flex-1">{item.workspace.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── MAIN LAYOUT (SIDEBAR + CONTENT AREA) ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {!activeWorkspaceId ? (
          /* ── 1. HOME DASHBOARD HUB (NO ACTIVE WORKSPACE SELECTED) ── */
          <main className="relative z-10 flex-1 max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10 w-full flex flex-col gap-8 sm:gap-10 font-sans overflow-y-auto h-full min-h-0 custom-scrollbar">
            {/* Greeting Section */}
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                {timeGreeting}, {userDisplayName.split(' ')[0]}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium">
                What would you like to do?
              </p>
            </div>

            {/* 3 Primary Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Start Meeting */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleCreateMeeting}
                className="group cursor-pointer p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-600 dark:hover:border-blue-500 transition-all duration-200 flex flex-col justify-between gap-6 shadow-sm"
              >
                <div className="flex flex-col gap-4">
                  <div className="size-12 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Video className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Start Meeting
                    </h3>
                    <p className="font-sans text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Create an instant video meeting outside of a workspace. No chat history or transcripts are stored.
                    </p>
                  </div>
                </div>
                <div className="font-sans flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1 group-hover:translate-x-1 transition-transform">
                  Start Meeting <ArrowRight className="size-4" />
                </div>
              </motion.div>

              {/* Card 2: Create a Workspace */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setShowCreateWsModal(true)}
                className="group cursor-pointer p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-600 dark:hover:border-blue-500 transition-all duration-200 flex flex-col justify-between gap-6 shadow-sm"
              >
                <div className="flex flex-col gap-4">
                  <div className="size-12 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Building2 className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Create Workspace
                    </h3>
                    <p className="font-sans text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Build a shared space for your team with persistent chat, meetings, and AI.
                    </p>
                  </div>
                </div>
                <div className="font-sans flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1 group-hover:translate-x-1 transition-transform">
                  Create Workspace <ArrowRight className="size-4" />
                </div>
              </motion.div>

              {/* Card 3: Join a Workspace */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setShowJoinWsModal(true)}
                className="group cursor-pointer p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-600 dark:hover:border-blue-500 transition-all duration-200 flex flex-col justify-between gap-6 shadow-sm"
              >
                <div className="flex flex-col gap-4">
                  <div className="size-12 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Join Workspace
                    </h3>
                    <p className="font-sans text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Enter an existing workspace invitation link or workspace code.
                    </p>
                  </div>
                </div>
                <div className="font-sans flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1 group-hover:translate-x-1 transition-transform">
                  Join Workspace <ArrowRight className="size-4" />
                </div>
              </motion.div>
            </div>

            {/* My Workspaces List Section */}
            <div className="flex flex-col gap-6 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Workspaces</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your hubs for video meetings, persistent chat, and AI context.</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                  {workspacesData.length} Workspaces
                </span>
              </div>

              {workspacesData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {workspacesData.map((item) => {
                    const activeMeeting = hubActiveMeetingsMap[item.workspace.id];
                    const isLive = activeMeeting?.status === 'active';
                    const isUpcoming = activeMeeting?.scheduled_at && new Date(activeMeeting.scheduled_at).getTime() > currentTime;
                    return (
                      <motion.div
                        key={item.workspace.id}
                        whileHover={{ y: -4, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => selectWorkspace(item.workspace.id)}
                        className="group cursor-pointer p-6 min-h-[170px] rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/50 hover:bg-slate-50/80 dark:hover:bg-slate-900/90 transition-all duration-300 flex flex-col justify-between gap-6 shadow-md dark:shadow-xl relative overflow-hidden"
                      >
                        {/* Ambient glow */}
                        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-indigo-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />

                        {/* Header: Icon + Title + Status Badges + Open CTA */}
                        <div className="flex items-start justify-between gap-4 relative z-10">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="size-12 rounded-xl bg-blue-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm flex-shrink-0">
                              {renderWorkspaceIcon(item.workspace.icon || 'rocket')}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight truncate">
                                {item.workspace.name}
                              </h3>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {item.workspace.topic || 'Team Collaboration & AI Context'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {isLive ? (
                              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-500/30">
                                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                                LIVE CALL
                              </span>
                            ) : isUpcoming ? (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold border border-indigo-500/30">
                                <Calendar className="size-3 text-indigo-500" /> SYNC
                              </span>
                            ) : null}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 group-hover:bg-indigo-600 group-hover:text-white text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all shadow-sm">
                              Open <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2 overflow-hidden">
                            {item.members.slice(0, 3).map((m, idx) => (
                              <div
                                key={idx}
                                className="inline-block size-6 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900 text-[9px] font-bold text-white text-center leading-6 uppercase"
                                title={m.profile?.full_name || 'Member'}
                              >
                                {(m.profile?.full_name || 'MB').slice(0, 2)}
                              </div>
                            ))}
                          </div>
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            {item.members.length} members
                          </span>
                        </div>

                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                          {item.channels.length} channels · Code: {item.workspace.invite_code}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              ) : (
                <div className="p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col items-center justify-center text-center gap-4">
                  <div className="size-14 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 grid place-items-center">
                    <Building2 className="size-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Workspaces Found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                      Create your own team workspace or join an existing one using an invite code.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowCreateWsModal(true)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <Plus className="size-4" /> Create Workspace
                    </button>
                    <button
                      onClick={() => setShowJoinWsModal(true)}
                      className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <Compass className="size-4" /> Join Workspace
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        ) : (
          /* ── 2. ACTIVE WORKSPACE VIEW (SIDEBAR + CONTENT TABS) ── */
          <>
            {/* DESKTOP SIDEBAR */}
            <aside className="w-64 shrink-0 hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-4 space-y-6 overflow-y-auto h-full min-h-0 select-none custom-scrollbar">
              {/* Back to Workspaces Hub button */}
              <button
                onClick={() => selectWorkspace('')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/50 transition-all shadow-2xs group"
              >
                <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>All Workspaces</span>
              </button>
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
              { id: 'home', label: 'Home', icon: Home },
              { id: 'meetings', label: 'Meetings & Syncs', icon: Video },
              { id: 'chat', label: 'Channel Chat', icon: MessageSquare },
              { id: 'whiteboard', label: 'Work Board', icon: Layout },
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
        <main
          onScroll={activeTab === 'chat' ? handleChannelChatScroll : undefined}
          className={`flex-1 overflow-y-auto h-full min-h-0 font-sans custom-scrollbar relative ${
            activeTab === 'chat' ? 'p-0 pb-12' : 'p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8'
          }`}
        >
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
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

              {/* SINGLE FULL-WIDTH MEETING HERO CARD */}
              <div className="w-full rounded-3xl border border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-br from-white via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-950 p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6">
                {/* Ambient background glow effect */}
                <div className="absolute -top-24 -right-24 size-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl pointer-events-none" />

                {/* CASE A: LIVE MEETING IN PROGRESS */}
                {activeLiveMeeting ? (
                  <div className="space-y-6 relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-black tracking-wide border border-emerald-500/30 flex items-center gap-2 shadow-xs">
                          <span className="relative flex size-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
                          </span>
                          LIVE NOW • MEETING IN PROGRESS
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-lg">
                        Room: {activeLiveMeeting.room_code}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {activeLiveMeeting.title || (activeLiveMeeting as any).room_name || 'Workspace Sync Room'}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                        Your team is currently live in this workspace with real-time captions, sign-language tools, and automated meeting insights.
                      </p>
                    </div>

                    {/* Real-time Members Currently in the Call */}
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        <Users className="size-4 text-emerald-500" /> Realtime Members in Meeting ({liveMeetingParticipants.length || 1})
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {liveMeetingParticipants.length > 0 ? (
                          liveMeetingParticipants.map((p) => (
                            <div
                              key={p.id || p.identity}
                              className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-500/30 shadow-sm flex items-center gap-2.5"
                            >
                              <div className="size-7 rounded-full bg-emerald-600 text-white font-bold text-xs grid place-items-center">
                                {(p.display_name || 'M').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {p.display_name || 'Participant'}
                              </span>
                              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Active in call" />
                            </div>
                          ))
                        ) : (
                          members.slice(0, 4).map((m) => (
                            <div
                              key={m.id}
                              className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2.5"
                            >
                              <div className="size-7 rounded-full bg-indigo-600 text-white font-bold text-xs grid place-items-center">
                                {(m.profile?.full_name || 'M').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {m.profile?.full_name || 'Member'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 flex items-center gap-4">
                      <button
                        onClick={() => {
                          try {
                            if (activeWorkspaceId) {
                              sessionStorage.setItem('t2_return_workspace_id', activeWorkspaceId);
                              localStorage.setItem('t2_active_workspace_v1', activeWorkspaceId);
                            }
                            sessionStorage.setItem('t2_return_tab', activeTab);
                            localStorage.setItem('t2_active_tab_v1', activeTab);
                          } catch {}
                          router.push(`/room/${activeLiveMeeting.room_code}?workspaceId=${activeWorkspaceId}&tab=${activeTab}`);
                        }}
                        className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2.5 hover:scale-[1.02]"
                      >
                        <Video className="size-5" /> Jump Into Meeting Now
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : upcomingMeeting ? (
                  /* CASE B: UPCOMING SCHEDULED MEETING WITH COUNTDOWN */
                  <div className="space-y-6 relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="px-3.5 py-1.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-black tracking-wide border border-indigo-500/30 flex items-center gap-2 shrink-0">
                        <CalendarDays className="size-4" /> UPCOMING SCHEDULED MEETING
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-lg">
                        Code: {upcomingMeeting.room_code}
                      </span>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="space-y-2 flex-1">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                          {upcomingMeeting.title || (upcomingMeeting as any).room_name || 'Scheduled Workspace Sync'}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Scheduled for {new Date(upcomingMeeting.scheduled_at!).toLocaleDateString()} at{' '}
                          {new Date(upcomingMeeting.scheduled_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Giant Realtime Countdown Box */}
                      {(() => {
                        const cd = formatCountdown(upcomingMeeting.scheduled_at!, currentTime);
                        return (
                          <div className="p-4 rounded-2xl bg-indigo-600/10 dark:bg-indigo-950/50 border border-indigo-500/30 flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2 text-center font-mono">
                              <div className="flex flex-col p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/50 min-w-[54px]">
                                <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">{String(cd.hours).padStart(2, '0')}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Hours</span>
                              </div>
                              <span className="text-lg font-black text-indigo-500">:</span>
                              <div className="flex flex-col p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/50 min-w-[54px]">
                                <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">{String(cd.mins).padStart(2, '0')}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Mins</span>
                              </div>
                              <span className="text-lg font-black text-indigo-500">:</span>
                              <div className="flex flex-col p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/50 min-w-[54px]">
                                <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">{String(cd.secs).padStart(2, '0')}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Secs</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={() => {
                          try {
                            if (activeWorkspaceId) {
                              sessionStorage.setItem('t2_return_workspace_id', activeWorkspaceId);
                              localStorage.setItem('t2_active_workspace_v1', activeWorkspaceId);
                            }
                            sessionStorage.setItem('t2_return_tab', activeTab);
                            localStorage.setItem('t2_active_tab_v1', activeTab);
                          } catch {}
                          router.push(`/room/${upcomingMeeting.room_code}?workspaceId=${activeWorkspaceId}&tab=${activeTab}`);
                        }}
                        className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 hover:scale-[1.02]"
                      >
                        <Video className="size-5" /> Join Room when Ready
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* CASE C: INSTANT MEETING LAUNCHER (NO SCHEDULED OR LIVE MEETING) */
                  <div className="space-y-5 relative z-10">
                    <div className="space-y-2">
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Ready for a team meeting?
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                        Bring your team together in a live space where every voice is heard, understood, and remembered.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        onClick={() => openCreateMeetingModal('instant')}
                        className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                      >
                        <Video className="size-5" /> Start Instant Meeting
                      </button>
                      <button
                        onClick={() => openCreateMeetingModal('scheduled')}
                        className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-sm border border-indigo-200 dark:border-indigo-900/60 shadow-sm transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                      >
                        <Calendar className="size-5 text-indigo-500" /> Schedule Workspace Sync
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions Grid */}
              <div className="grid sm:grid-cols-3 gap-4">
                <button
                  onClick={() => openCreateMeetingModal('instant')}
                  className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-slate-900 text-left hover:scale-[1.02] transition-all group"
                >
                  <Video className="size-6 text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Start / Schedule Meeting</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Instant or scheduled workspace sync.</p>
                </button>

                <button
                  onClick={() => setActiveTab('chat')}
                  className="p-5 rounded-2xl border border-cyan-200 dark:border-cyan-900/50 bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/40 dark:to-slate-900 text-left hover:scale-[1.02] transition-all group"
                >
                  <MessageSquare className="size-6 text-cyan-600 dark:text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Team Channel Chat</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Real-time team channel messaging.</p>
                </button>

                <button
                  onClick={() => setActiveTab('ask-ai')}
                  className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-slate-900 text-left hover:scale-[1.02] transition-all group"
                >
                  <Sparkles className="size-6 text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ask Talk2Me AI</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Query meeting transcripts and knowledge.</p>
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
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => openCreateMeetingModal('instant')}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
                    >
                      <Video className="size-4" /> Start Instant
                    </button>
                    <button
                      onClick={() => openCreateMeetingModal('scheduled')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
                    >
                      <Calendar className="size-4 text-indigo-500" /> Schedule Sync
                    </button>
                  </div>
                </div>

                {/* Two-panel layout */}
                <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 'calc(100vh - 16rem)' }}>

                  {/* ── LEFT: Meeting List ── */}
                  <div className={`w-full lg:w-72 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1 ${selectedMeetingId ? 'hidden lg:flex' : 'flex'}`}>
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
                        const isUpcoming = m.scheduled_at && new Date(m.scheduled_at).getTime() > currentTime;
                        const cd = isUpcoming ? formatCountdown(m.scheduled_at!, currentTime) : null;
                        const meetingAccess = m.settings?.access_level ?? (m.workspace_id ? 'members_only' : 'open');
                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedMeetingId(m.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {m.scheduled_at
                                    ? `Scheduled: ${new Date(m.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              {isLive ? (
                                <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-500/30">
                                  <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                                  LIVE NOW
                                </span>
                              ) : isUpcoming && cd ? (
                                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold border border-indigo-500/30">
                                  <Clock className="size-3 text-indigo-500" />
                                  {cd.text}
                                </span>
                              ) : (
                                <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-semibold">
                                  Ended
                                </span>
                              )}
                            </div>

                            {(isLive || isUpcoming) && (
                              <div className="pt-2 flex items-center justify-between gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    try {
                                      if (activeWorkspaceId) {
                                        sessionStorage.setItem('t2_return_workspace_id', activeWorkspaceId);
                                        localStorage.setItem('t2_active_workspace_v1', activeWorkspaceId);
                                      }
                                      sessionStorage.setItem('t2_return_tab', activeTab);
                                      localStorage.setItem('t2_active_tab_v1', activeTab);
                                    } catch {}
                                    router.push(`/room/${m.room_code}?workspaceId=${activeWorkspaceId}&tab=${activeTab}`);
                                  }}
                                  className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                >
                                  <Video className="size-3.5" /> Join Room Now <ArrowRight className="size-3" />
                                </button>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2 mt-2">
                              {duration ? (
                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Clock className="size-3" /> {duration}
                                </div>
                              ) : <div />}
                              {meetingAccess === 'members_only' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                                  <Lock className="size-2.5" /> Members Only
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                  <Globe className="size-2.5" /> Open
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ── RIGHT: Meeting Detail ── */}
                  <div className={`flex-1 min-w-0 overflow-y-auto flex flex-col gap-4 ${!selectedMeetingId ? 'hidden lg:flex' : 'flex'}`}>
                    <button
                      onClick={() => setSelectedMeetingId(null)}
                      className="lg:hidden inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2"
                    >
                      <ChevronLeft className="size-3.5" /> Back to Meetings List
                    </button>
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
                                href={`/room/${selectedMeeting.room_code}?workspaceId=${activeWorkspaceId}&tab=${activeTab}`}
                                onClick={() => {
                                  try {
                                    if (activeWorkspaceId) {
                                      sessionStorage.setItem('t2_return_workspace_id', activeWorkspaceId);
                                      localStorage.setItem('t2_active_workspace_v1', activeWorkspaceId);
                                    }
                                    sessionStorage.setItem('t2_return_tab', activeTab);
                                    localStorage.setItem('t2_active_tab_v1', activeTab);
                                  } catch {}
                                }}
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
            <div className="min-h-full flex flex-col relative">
              {/* Channel Header (Sticky top of full main page) */}
              <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-md sticky top-0 z-20 shadow-xs">
                <div className="flex items-center gap-2">
                  <Hash className="size-4 text-indigo-600 dark:text-cyan-400" />
                  <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {selectedChannel}
                  </span>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                    · {activeMessages.length} messages
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch.name)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        selectedChannel === ch.name
                          ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                          : 'bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-white/15'
                      }`}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message List (Flows naturally in full main page scroll) */}
              <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 chat-grid-bg min-h-[calc(100vh-14rem)] pb-32">
                {activeMessages.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center text-center gap-3 text-xs text-slate-500 dark:text-white/50 font-medium">
                    <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 grid place-items-center">
                      <MessageSquare className="size-6 text-indigo-600 dark:text-cyan-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No messages in {selectedChannel} yet</p>
                    <p className="text-xs text-slate-500 max-w-xs">Start the discussion or type <span className="font-bold text-indigo-600 dark:text-cyan-400">@Talk2Me AI</span> to ask questions!</p>
                  </div>
                ) : (
                  activeMessages.map((msg, i) => {
                    const isMe = msg.sender_name === 'You' || msg.sender_name === user?.email || msg.sender_id === user?.id;
                    const isAi = msg.is_ai || msg.sender_name?.includes('AI') || msg.sender_name === 'Talk2Me AI';

                    return (
                      <div
                        key={msg.id || i}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
                      >
                        {/* Sender info */}
                        <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px]">
                          <span className={`font-extrabold ${isMe ? 'text-indigo-600 dark:text-cyan-400' : isAi ? 'text-cyan-600 dark:text-cyan-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {msg.sender_name || 'Participant'}
                          </span>
                          <span className="text-slate-400 dark:text-white/40 text-[10px] font-mono">
                            {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Bubble wrapper with pin badge */}
                        <div className="relative max-w-md sm:max-w-xl lg:max-w-3xl group">
                          {/* Blue Pin Badge */}
                          <div className={`absolute -top-2 ${isMe ? '-left-2' : '-right-2'} z-10 size-6 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-lg border-2 border-slate-50 dark:border-[#0b0f17]`}>
                            <Pin className="size-3 fill-current rotate-45" />
                          </div>

                          {/* Bubble Body */}
                          <div
                            className={`p-4 rounded-[20px] text-xs sm:text-sm leading-relaxed shadow-sm font-sans ${
                              isMe
                                ? 'bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white font-medium border border-indigo-500/20'
                                : isAi
                                ? 'bg-cyan-50/90 text-slate-950 dark:bg-cyan-950/40 dark:text-cyan-50 font-medium border border-cyan-300/80 dark:border-cyan-500/30'
                                : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-medium border border-slate-200 dark:border-slate-700 shadow-sm'
                            }`}
                          >
                            <FormattedChatMessage content={msg.content} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {isAiThinking && (
                  <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-700 dark:text-cyan-300 flex items-center gap-2 max-w-md">
                    <Loader2 className="size-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
                    Talk2Me AI is analyzing and writing response...
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Floating Chat Form Field (Sticky at bottom of full page, auto-hides when scrolling down long chat) */}
              <div
                className={`sticky bottom-4 mx-4 sm:mx-6 lg:mx-8 z-30 transition-all duration-300 ease-out transform ${
                  isChatInputVisible
                    ? 'translate-y-0 opacity-100 scale-100'
                    : 'translate-y-16 opacity-0 pointer-events-none scale-95'
                }`}
              >
                <div className="p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl shadow-2xl flex items-center gap-2 relative">
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
                    onFocus={() => setIsChatInputVisible(true)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder={`Send message to ${selectedChannel} or type @ for AI...`}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 outline-none focus:border-indigo-600 dark:focus:border-cyan-400 transition-all"
                  />
                  <button
                    onClick={handleSendChatMessage}
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <Send className="size-4" /> Send
                  </button>
                </div>
              </div>

              {/* Floating quick button when input is hidden */}
              {!isChatInputVisible && (
                <button
                  onClick={() => {
                    setIsChatInputVisible(true);
                    chatInputRef.current?.focus();
                  }}
                  className="fixed bottom-6 right-6 lg:right-10 z-40 px-4 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-xl border border-indigo-400/30 flex items-center gap-2 animate-bounce cursor-pointer hover:bg-indigo-500 transition-all"
                >
                  <MessageSquare className="size-4" /> Type message...
                </button>
              )}
            </div>
          )}

          {/* TAB: VISUAL WHITEBOARD */}
          {activeTab === 'whiteboard' && activeWorkspaceId && (
            <WorkspaceWhiteboard
              workspaceId={activeWorkspaceId}
              workspaceName={currentWorkspaceData?.workspace.name || 'Workspace'}
              currentUserId={user?.id || 'guest'}
              currentUserName={profile?.full_name || user?.email || 'Team Member'}
            />
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

              {/* Thread Container */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] chat-grid-bg space-y-6 min-h-[300px] shadow-xl">
                {askAiMessages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 dark:text-white/50 font-medium">
                    No questions asked yet. Choose a suggestion chip below or type a question!
                  </div>
                ) : (
                  askAiMessages.map((msg, i) => {
                    const isAi = msg.is_ai || msg.sender_name?.includes('AI') || msg.sender_name === 'Talk2Me AI';

                    return (
                      <div
                        key={msg.id || i}
                        className={`flex flex-col ${isAi ? 'items-start' : 'items-end'} animate-in fade-in duration-200`}
                      >
                        <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px]">
                          <span className={`font-extrabold ${isAi ? 'text-cyan-600 dark:text-cyan-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {msg.sender_name}
                          </span>
                          <span className="text-slate-400 dark:text-white/40 text-[10px] font-mono">
                            {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="relative max-w-2xl group">
                          {/* Blue Pin Badge */}
                          <div className={`absolute -top-2 ${isAi ? '-right-2' : '-left-2'} z-10 size-6 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-lg border-2 border-slate-50 dark:border-[#0b0f17]`}>
                            <Pin className="size-3 fill-current rotate-45" />
                          </div>

                          <div
                            className={`p-4 rounded-[20px] text-xs sm:text-sm leading-relaxed shadow-sm font-sans ${
                              isAi
                                ? 'bg-cyan-50/90 text-slate-950 dark:bg-cyan-950/40 dark:text-cyan-50 font-medium border border-cyan-300/80 dark:border-cyan-500/30'
                                : 'bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white font-medium border border-indigo-500/20'
                            }`}
                          >
                            <FormattedChatMessage content={msg.content} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {isAiThinking && (
                  <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-3 text-xs text-cyan-700 dark:text-cyan-300 max-w-md">
                    <Loader2 className="size-4 animate-spin text-cyan-600 dark:text-cyan-400" />
                    Searching workspace transcripts and extracting insights...
                  </div>
                )}
              </div>

              {/* Quick suggestion prompt chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  "Summarize key meeting decisions",
                  "List active action items",
                  "What was discussed in latest sync?",
                  "What are open questions?"
                ].map((chipText, i) => (
                  <button
                    key={i}
                    onClick={() => setAskAiInput(chipText)}
                    className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 whitespace-nowrap transition-colors"
                  >
                    {chipText}
                  </button>
                ))}
              </div>

              {/* Prompt bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={askAiInput}
                  onChange={(e) => setAskAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendAskAi()}
                  placeholder="What key decisions were made in our recent engineering sync?"
                  className="flex-1 min-w-0 px-3.5 sm:px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500 shadow-xs"
                />
                <button
                  onClick={handleSendAskAi}
                  className="px-4 sm:px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shrink-0"
                >
                  Ask AI
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-5xl flex flex-col gap-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Settings</h1>

              {/* 1. User Profile & Account Settings */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="size-5 text-indigo-600 dark:text-indigo-400" /> My Profile & Account
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Update your display username across Talk2Me AI meetings and chat workspaces.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                      Username / Full Name
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="e.g. Alex Rivera or @alexr"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="size-4 animate-spin" /> Saving...
                          </>
                        ) : profileSaveSuccess ? (
                          <>
                            <Check className="size-4 text-emerald-300" /> Saved!
                          </>
                        ) : (
                          'Save Username'
                        )}
                      </button>
                    </div>
                    {profileSaveError && (
                      <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="size-3.5" /> {profileSaveError}
                      </p>
                    )}
                    {profileSaveSuccess && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Username updated successfully!
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Email Address</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={user?.email || ''}
                        readOnly
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-mono"
                      />
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="size-3.5" /> Verified
                      </span>
                    </div>
                  </div>
                </form>
              </div>

              {/* 2. Workspace Info */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Workspace General</h2>
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

              {/* 3. Workspace Access Controls & Pending Approvals (Owners & Admins) */}
              {isOwnerOrAdmin && workspace && (
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings className="size-5 text-indigo-600 dark:text-indigo-400" /> Workspace Access & Membership Policies
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage workspace privacy rules, approve incoming member join requests, and handle channel privileges.
                      </p>
                    </div>
                    {pendingRequests.length > 0 && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20 flex items-center gap-1.5 shrink-0 animate-pulse">
                        <Clock className="size-3.5" /> {pendingRequests.length} Pending Approval{pendingRequests.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Join Access Policy Switcher */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 block">Workspace Join Policy</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleJoinPolicy('open')}
                        disabled={isUpdatingPolicy}
                        className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                          (workspace.join_policy || 'open') === 'open'
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-slate-900 dark:text-white ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <Compass className={`size-5 mt-0.5 ${ (workspace.join_policy || 'open') === 'open' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400' }`} />
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            🌐 Open for Everyone
                            {(workspace.join_policy || 'open') === 'open' && (
                              <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-md">Active</span>
                            )}
                          </div>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            Anyone with the workspace invite code can join immediately without waiting for approval.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleJoinPolicy('approval')}
                        disabled={isUpdatingPolicy}
                        className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                          workspace.join_policy === 'approval'
                            ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/30 text-slate-900 dark:text-white ring-2 ring-amber-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <Clock className={`size-5 mt-0.5 ${ workspace.join_policy === 'approval' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' }`} />
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            🔒 Owner Approval Required ("Hold in Air")
                            {workspace.join_policy === 'approval' && (
                              <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-md">Active</span>
                            )}
                          </div>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            Users who enter invite code are placed on hold until you explicitly approve their join request.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Pending Join Requests Queue */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Users className="size-4 text-amber-500" /> Pending Join Requests ({pendingRequests.length})
                      </h3>
                      {isLoadingPendingRequests && <Loader2 className="size-3.5 animate-spin text-slate-400" />}
                    </div>

                    {pendingRequests.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">No pending join requests right now.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingRequests.map((req) => (
                          <div
                            key={req.id}
                            className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-full bg-amber-600 text-white font-bold text-sm grid place-items-center shrink-0">
                                {(req.profile?.full_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                                  {req.profile?.full_name || 'Anonymous User'}
                                </h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Requested {new Date(req.joined_at).toLocaleDateString()} at {new Date(req.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                onClick={() => handleApproveJoinRequest(req.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
                              >
                                <Check className="size-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectJoinRequest(req.id)}
                                className="px-3 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 border border-rose-500/20 transition-all"
                              >
                                <X className="size-3.5" /> Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Workspace Members & Role Management */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Users className="size-4 text-indigo-500" /> Active Workspace Members ({members.length})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-indigo-600 text-white font-bold text-xs grid place-items-center shrink-0">
                              {(m.profile?.full_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {m.profile?.full_name || 'Workspace Member'}
                                {m.user_id === user?.id && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded font-mono">(You)</span>}
                                {m.status === 'paused' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                                    <Pause className="size-2.5" /> Paused
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 capitalize">{m.role}</div>
                            </div>
                          </div>

                          {m.user_id !== user?.id && m.role !== 'owner' && (
                            <div className="flex items-center gap-2">
                              {m.role === 'member' ? (
                                <button
                                  onClick={() => handleUpdateMemberRole(m.id, 'admin')}
                                  className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100"
                                >
                                  Make Admin
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateMemberRole(m.id, 'member')}
                                  className="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-300"
                                >
                                  Make Member
                                </button>
                              )}

                              {m.status === 'paused' ? (
                                <button
                                  onClick={() => handleResumeMember(m.id)}
                                  className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 flex items-center gap-1"
                                >
                                  <Play className="size-3" /> Unpause
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePauseMember(m.id)}
                                  className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 flex items-center gap-1"
                                >
                                  <Pause className="size-3" /> Pause
                                </button>
                              )}

                              <button
                                onClick={() => handleRemoveMember(m.id)}
                                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 transition-colors"
                                title="Remove member"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Workspace Status & Danger Zone Controls (Owner / Admin) */}
                  {currentWorkspaceData && (
                    <div className="space-y-4 pt-5 border-t border-slate-200 dark:border-slate-800">
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-rose-500 flex items-center gap-1.5">
                        <AlertTriangle className="size-4" /> Workspace Administration & Danger Zone
                      </h3>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Pause Workspace Card */}
                        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                              <Pause className="size-4 text-amber-500" />
                              {currentWorkspaceData.workspace.status === 'paused' ? 'Workspace is Paused' : 'Pause Workspace'}
                            </h4>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-snug">
                              Temporarily restrict new messages and meetings while maintaining workspace data.
                            </p>
                          </div>
                          <button
                            onClick={handleToggleWorkspacePause}
                            disabled={isTogglingWsPause}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 ${
                              currentWorkspaceData.workspace.status === 'paused'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-amber-600 hover:bg-amber-500 text-white'
                            }`}
                          >
                            {isTogglingWsPause ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : currentWorkspaceData.workspace.status === 'paused' ? (
                              <>
                                <Play className="size-3.5" /> Unpause Workspace
                              </>
                            ) : (
                              <>
                                <Pause className="size-3.5" /> Pause Workspace
                              </>
                            )}
                          </button>
                        </div>

                        {/* Delete Workspace Card */}
                        <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                              <Trash2 className="size-4 text-rose-500" /> Delete Workspace
                            </h4>
                            <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1 leading-snug">
                              Permanently remove this workspace, channels, messages, and meeting records.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setDeleteWsConfirmInput('');
                              setShowDeleteWsModal(true);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Trash2 className="size-3.5" /> Delete Workspace...
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Channel Access Controls */}
                  {currentWorkspaceData && (
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Hash className="size-4 text-cyan-500" /> Channel Access Management ({currentWorkspaceData.channels.length})
                        </h3>
                        <button
                          onClick={() => setShowCreateChannelModal(true)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="size-3.5" /> New Channel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentWorkspaceData.channels.map((ch) => (
                          <div
                            key={ch.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between"
                          >
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Hash className="size-3.5 text-cyan-500" /> {ch.name}
                            </span>
                            {ch.name !== '# General' && (
                              <button
                                onClick={() => handleDeleteChannel(ch.id, ch.name)}
                                className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 transition-colors"
                                title="Delete Channel"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
      </>
    )}
  </div>

      {/* ── MOBILE BOTTOM NAVIGATION TAB BAR ── */}
      {activeWorkspaceId && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg">
          {[
            { id: 'home', label: 'Home', icon: Home },
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'whiteboard', label: 'Work Board', icon: Layout },
            { id: 'meetings', label: 'Meetings', icon: Video },
            { id: 'ask-ai', label: 'Ask AI', icon: Sparkles },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/50'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`size-4 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ── EDIT USERNAME / PROFILE MODAL ── */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="size-5 text-indigo-600 dark:text-indigo-400" /> Edit Profile & Username
                </h3>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Username / Display Name
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. Alex Rivera or @alexr"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="text"
                    value={user?.email || ''}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-mono"
                  />
                </div>

                {profileSaveError && (
                  <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                    <AlertCircle className="size-3.5" /> {profileSaveError}
                  </p>
                )}

                {profileSaveSuccess && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Username updated successfully!
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Saving...
                      </>
                    ) : profileSaveSuccess ? (
                      <>
                        <Check className="size-4 text-emerald-300" /> Saved!
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass className="size-5 text-indigo-500" /> Join Workspace
                </h3>
                <button onClick={() => setShowJoinWsModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                  Invite Code or ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value)}
                  placeholder="e.g. WS-A1B2C3"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                  Your Display Name / Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={joinDisplayName}
                  onChange={(e) => setJoinDisplayName(e.target.value)}
                  placeholder="Enter your user name (e.g. Maya Lin)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinWorkspace()}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Your name will be visible to workspace members in chat and meeting transcripts.
                </p>
              </div>

              {joinError && <p className="text-xs text-red-500 mt-1">{joinError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowJoinWsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinWorkspace}
                  disabled={isJoiningWs || !joinInviteCode.trim() || !joinDisplayName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isJoiningWs ? <Loader2 className="size-4 animate-spin" /> : 'Join Workspace'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── HOLD IN THE AIR PENDING APPROVAL MODAL ── */}
      <AnimatePresence>
        {showPendingApprovalModal && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-center"
            >
              <div className="size-14 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 grid place-items-center mx-auto animate-bounce">
                <Clock className="size-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Join Request Pending Approval
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your request to join <strong className="text-amber-500 font-extrabold">{pendingWsInfo?.name}</strong> has been submitted! This workspace requires owner approval before new members land on the channels.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-left text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> What happens next?
                </div>
                <p className="text-[11px] opacity-90">
                  The workspace owner has been notified. As soon as they approve your request, this workspace will appear in your workspace list automatically.
                </p>
              </div>

              <button
                onClick={() => setShowPendingApprovalModal(false)}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold shadow-md transition-all"
              >
                Got it, Thanks!
              </button>
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

      {/* ── CREATE / SCHEDULE WORKSPACE MEETING MODAL ── */}
      <AnimatePresence>
        {showMeetingModal && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 grid place-items-center">
                    <Video className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {activeWorkspaceId ? 'Workspace Meeting' : 'New Meeting'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure instant call or scheduled workspace sync
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMeetingModal(false)}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveWorkspaceMeetingModal} className="space-y-5">
                {/* Meeting Type Selector (Instant vs Scheduled) */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Meeting Type</label>
                  <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => setMeetingModalMode('instant')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        meetingModalMode === 'instant'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Video className="size-4" /> Start Instant
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingModalMode('scheduled')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        meetingModalMode === 'scheduled'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Calendar className="size-4" /> Schedule Later
                    </button>
                  </div>
                </div>

                {/* Meeting Title */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Meeting Title</label>
                  <input
                    type="text"
                    value={meetingModalTitle}
                    onChange={(e) => setMeetingModalTitle(e.target.value)}
                    placeholder="e.g. Weekly Product & Architecture Sync"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                {/* Scheduled Date/Time Input */}
                {meetingModalMode === 'scheduled' && (
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">Schedule Date & Time</label>
                    <input
                      type="datetime-local"
                      value={meetingModalDate}
                      onChange={(e) => setMeetingModalDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                )}

                {/* Access Level Selector (Members Only vs Open to Outsiders) */}
                {activeWorkspaceId && (
                  <div className="space-y-2.5 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
                    <label className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                      Workspace Access Privacy
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMeetingModalAccessLevel('members_only')}
                        className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                          meetingModalAccessLevel === 'members_only'
                            ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                          <Lock className="size-3.5 text-amber-500" /> Members Only
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          Only approved workspace members can enter.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMeetingModalAccessLevel('open')}
                        className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                          meetingModalAccessLevel === 'open'
                            ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                          <Globe className="size-3.5 text-emerald-500" /> Allow Outsiders
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          Open to guests & external participants with code.
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Moderation Toggles */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Require Host Approval</div>
                      <div className="text-[10px] text-slate-500 leading-snug">Participants wait in lobby until admitted.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMeetingModalRequireApproval(v => !v)}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        meetingModalRequireApproval ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        meetingModalRequireApproval ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Allow Screen Share</div>
                      <div className="text-[10px] text-slate-500 leading-snug">Permit non-host members to share screens.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMeetingModalAllowScreenShare(v => !v)}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        meetingModalAllowScreenShare ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        meetingModalAllowScreenShare ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowMeetingModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMeetingModal}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {isSubmittingMeetingModal ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {meetingModalMode === 'instant' ? 'Start Meeting Now' : 'Schedule Meeting'}
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SECURE WORKSPACE DELETION MODAL (2-STEP CONFIRMATION) ── */}
      <AnimatePresence>
        {showDeleteWsModal && currentWorkspaceData && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 grid place-items-center">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Delete Workspace</h3>
                    <p className="text-xs text-rose-500 font-bold">Action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteWsModal(false)}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 space-y-1.5">
                <p className="font-bold">⚠️ Warning: Permanent Workspace Deletion</p>
                <p className="text-[11px] leading-relaxed">
                  This will permanently delete <strong className="underline">{currentWorkspaceData.workspace.name}</strong>, all channels, chat history, AI memory, and meeting records.
                </p>
              </div>

              <form onSubmit={handleConfirmDeleteWorkspace} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Type <span className="font-mono font-black text-rose-500 select-all">&quot;{currentWorkspaceData.workspace.name}&quot;</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteWsConfirmInput}
                    onChange={(e) => setDeleteWsConfirmInput(e.target.value)}
                    placeholder={currentWorkspaceData.workspace.name}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteWsModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeletingWs || deleteWsConfirmInput.trim() !== currentWorkspaceData.workspace.name}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {isDeletingWs ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4" /> Permanently Delete
                      </>
                    )}
                  </button>
                </div>
              </form>
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
