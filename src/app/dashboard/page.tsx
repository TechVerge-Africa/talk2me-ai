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
  ChevronRight
} from 'lucide-react';

import { useAuth } from '@/features/auth/use-auth';
import { MeetingService } from '@/services/supabase/meetings';
import { generateRoomCode, roomShareUrl } from '@/packages/shared/rooms';
import { GradientBackground } from '@/components/ui/gradient-background';
import { ThemeToggle } from '@/components/theme-toggle';
import { getTimeGreetingPrefix } from '@/lib/greetings';


// ── ICON HELPER ──────────────────────────────────────────────────────
const renderWorkspaceIcon = (iconStr: string) => {
  if (iconStr === 'palette' || iconStr === '🎨') return <Palette className="size-5 text-blue-600 dark:text-blue-400" />;
  if (iconStr === 'building' || iconStr === '🏢') return <Building2 className="size-5 text-blue-600 dark:text-blue-400" />;
  if (iconStr === 'link' || iconStr === '🔗') return <Link2 className="size-5 text-blue-600 dark:text-blue-400" />;
  return <Rocket className="size-5 text-blue-600 dark:text-blue-400" />;
};

// ── TYPES ────────────────────────────────────────────────────────────
interface WorkspaceMember {
  name: string;
  email: string;
  role: string;
  avatarBg: string;
}

interface ActionItem {
  assignee: string;
  task: string;
}

interface PastMeeting {
  id: string;
  title: string;
  dateStr: string;
  duration: string;
  participantsCount: number;
  participantsList: string[];
  decisions: string[];
  actionItems: ActionItem[];
  transcript: { speaker: string; text: string; time: string }[];
}

interface Workspace {
  id: string;
  name: string;
  topic: string;
  icon: string;
  membersCount: number;
  conversationsCount: number;
  members: WorkspaceMember[];
  channels: string[];
  directMessages: string[];
  upcomingMeetings: { id: string; title: string; dateStr: string; participants: number; roomCode: string }[];
  pastMeetings: PastMeeting[];
  channelMessages: Record<string, { sender: string; isAi?: boolean; text: string; time: string }[]>;
  aiWorkspaceChat: { sender: 'user' | 'ai'; text: string; sources?: string[]; time: string }[];
}

// ── MOCK DEFAULT WORKSPACES ──────────────────────────────────────────
const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: 'ws-product-team',
    name: 'Talk2Me Product Team',
    topic: 'Product development & roadmap',
    icon: 'rocket',
    membersCount: 8,
    conversationsCount: 12,
    members: [
      { name: 'Abdul', email: 'abdul@talk2me.ai', role: 'Product Lead', avatarBg: 'bg-indigo-600' },
      { name: 'Sarah', email: 'sarah@talk2me.ai', role: 'Engineering Lead', avatarBg: 'bg-cyan-600' },
      { name: 'Daniel', email: 'daniel@talk2me.ai', role: 'Fullstack Dev', avatarBg: 'bg-emerald-600' },
      { name: 'Michael', email: 'michael@talk2me.ai', role: 'QA Lead', avatarBg: 'bg-purple-600' }
    ],
    channels: ['# General', '# Product', '# Engineering'],
    directMessages: ['Sarah', 'Daniel', 'Michael'],
    upcomingMeetings: [
      { id: 'm-up-1', title: 'Product Review', dateStr: 'Today · 3:00 PM', participants: 4, roomCode: 'PRD-300-REV' }
    ],
    pastMeetings: [
      {
        id: 'm-past-1',
        title: 'Product Launch Meeting',
        dateStr: 'Aug 10 · 45 minutes · 5 participants',
        duration: '45 minutes',
        participantsCount: 5,
        participantsList: ['Abdul', 'Sarah', 'Daniel', 'Michael', 'Elena'],
        decisions: [
          'Launch target is September 5',
          'Payment integration must be completed first'
        ],
        actionItems: [
          { assignee: 'Daniel', task: 'Payment integration' },
          { assignee: 'Sarah', task: 'Marketing campaign' }
        ],
        transcript: [
          { speaker: 'Sarah', text: 'Are we still targeting September 5 for the launch?', time: '10:02 AM' },
          { speaker: 'Daniel', text: 'Only if payment integration passes QA testing first.', time: '10:03 AM' },
          { speaker: 'Abdul', text: 'Agreed. Daniel owns the payment integration milestone.', time: '10:05 AM' }
        ]
      },
      {
        id: 'm-past-2',
        title: 'Engineering Sync',
        dateStr: 'Aug 9 · 30 minutes · 6 participants',
        duration: '30 minutes',
        participantsCount: 6,
        participantsList: ['Daniel', 'Michael', 'Abdul', 'Sarah'],
        decisions: [
          'Migrated SFU engine to WebRTC high frame-rate mode',
          'Configured automatic local WASM audio worklets'
        ],
        actionItems: [
          { assignee: 'Michael', task: 'Test SFU auto-scaling metrics' }
        ],
        transcript: [
          { speaker: 'Daniel', text: 'The SFU latency issue is resolved.', time: '2:15 PM' },
          { speaker: 'Michael', text: 'I will run load tests on 100 concurrent streams.', time: '2:18 PM' }
        ]
      },
      {
        id: 'm-past-3',
        title: 'Marketing Planning',
        dateStr: 'Aug 7 · 50 minutes · 4 participants',
        duration: '50 minutes',
        participantsCount: 4,
        participantsList: ['Sarah', 'Abdul'],
        decisions: [
          'Launch campaign announcement planned across tech news channels',
          'Focus key message on persistent meeting-to-chat context'
        ],
        actionItems: [
          { assignee: 'Sarah', task: 'Draft press release and demo video' }
        ],
        transcript: [
          { speaker: 'Sarah', text: 'The press release highlights our AI workspace features.', time: '11:00 AM' }
        ]
      }
    ],
    channelMessages: {
      '# Product': [
        { sender: 'Sarah', text: 'Are we still targeting September 5?', time: '10:14 AM' },
        { sender: 'Daniel', text: 'Only if payment integration passes QA.', time: '10:16 AM' },
        { sender: 'Abdul', text: '@Talk2Me what did we decide about this?', time: '10:17 AM' },
        {
          sender: 'Talk2Me AI',
          isAi: true,
          text: "In yesterday's Product Launch meeting, the team agreed that September 5 remains the target, but the launch depends on payment integration passing QA first.",
          time: '10:17 AM'
        }
      ],
      '# General': [
        { sender: 'Michael', text: 'Good morning team! Standup in 10 minutes.', time: '9:50 AM' }
      ],
      '# Engineering': [
        { sender: 'Daniel', text: 'WASM audio noise suppression worklet builds clean!', time: 'Yesterday' }
      ],
      'Sarah': [
        { sender: 'Sarah', text: 'Hi Abdul! Did you review the product release notes?', time: 'Yesterday' }
      ],
      'Daniel': [
        { sender: 'Daniel', text: 'Payment gateway API endpoints are staged for review.', time: '2 days ago' }
      ],
      'Michael': [
        { sender: 'Michael', text: 'QA test suite passed 48 out of 48 test cases.', time: '3 days ago' }
      ]
    },
    aiWorkspaceChat: [
      {
        sender: 'user',
        text: 'What are the biggest blockers for our product launch?',
        time: 'Yesterday'
      },
      {
        sender: 'ai',
        text: 'Based on your workspace conversations and meetings, I found three current blockers:\n\n1. **Payment integration**: Must complete QA validation first.\n2. **QA testing**: Comprehensive load testing required.\n3. **Marketing assets**: Final press release and demo video pending.\n\nDaniel owns payment integration and QA readiness.',
        sources: [
          'Product Launch Meeting — Aug 10',
          'Engineering Chat — Aug 11',
          'Product Planning — Aug 8'
        ],
        time: 'Yesterday'
      }
    ]
  },
  {
    id: 'ws-design-systems',
    name: 'Design Systems & Accessibility',
    topic: 'WCAG 3.0 & Accessible UI Components',
    icon: 'palette',
    membersCount: 4,
    conversationsCount: 6,
    members: [
      { name: 'Abdul', email: 'abdul@talk2me.ai', role: 'Product Lead', avatarBg: 'bg-indigo-600' },
      { name: 'Elena', email: 'elena@talk2me.ai', role: 'UI/UX Designer', avatarBg: 'bg-pink-600' },
      { name: 'Marcus', email: 'marcus@talk2me.ai', role: 'Accessibility Auditor', avatarBg: 'bg-amber-600' }
    ],
    channels: ['# General', '# Accessibility-Audit'],
    directMessages: ['Elena', 'Marcus'],
    upcomingMeetings: [],
    pastMeetings: [],
    channelMessages: {
      '# General': [
        { sender: 'Elena', text: 'Updated font scaling tokens to support 130% scaling cleanly.', time: '11:00 AM' }
      ]
    },
    aiWorkspaceChat: []
  }
];

function DashboardContent() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // ── INSTANT MEETING LAUNCHING & MOBILE DRAWER STATE ────────────────
  const [isLaunchingMeeting, setIsLaunchingMeeting] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ── WORKSPACE STATE ────────────────────────────────────────────────
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    try {
      const saved = localStorage.getItem('t2_workspaces_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_WORKSPACES;
  });

  const searchParams = useSearchParams();

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('t2_active_workspace_v1') || null;
    } catch {
      return null;
    }
  });

  // Sync workspaceId from query params when navigating back from meeting
  useEffect(() => {
    const wsParam = searchParams.get('workspaceId');
    if (wsParam && workspaces.some((w) => w.id === wsParam)) {
      setActiveWorkspaceId(wsParam);
      try {
        localStorage.setItem('t2_active_workspace_v1', wsParam);
      } catch {}
    }
  }, [searchParams, workspaces]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || null,
    [workspaces, activeWorkspaceId]
  );

  const selectWorkspace = (id: string | null) => {
    setActiveWorkspaceId(id);
    setMobileNavOpen(false);
    try {
      if (id) localStorage.setItem('t2_active_workspace_v1', id);
      else localStorage.removeItem('t2_active_workspace_v1');
    } catch {}
  };

  const navigateToRoom = (roomCode: string) => {
    const targetWsId = activeWorkspaceId || (() => {
      try { return localStorage.getItem('t2_active_workspace_v1') || null; } catch { return null; }
    })();
    if (targetWsId) {
      try { sessionStorage.setItem('t2_return_workspace_id', targetWsId); } catch {}
      router.push(`/room/${roomCode}?workspaceId=${targetWsId}`);
    } else {
      router.push(`/room/${roomCode}`);
    }
  };

  // Persist workspaces
  useEffect(() => {
    try {
      localStorage.setItem('t2_workspaces_v1', JSON.stringify(workspaces));
    } catch {}
  }, [workspaces]);

  // ── NAVIGATION WITHIN WORKSPACE ────────────────────────────────────
  type WorkspaceTab = 'overview' | 'meetings' | 'chat' | 'ask-ai' | 'settings';
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Selected sub-items
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [meetingDetailTab, setMeetingDetailTab] = useState<'summary' | 'transcript'>('summary');
  const [meetingAiQuery, setMeetingAiQuery] = useState('');
  const [meetingAiResponse, setMeetingAiResponse] = useState<string | null>(null);

  const [selectedChannel, setSelectedChannel] = useState<string>('# Product');
  const [chatInputText, setChatInputText] = useState('');

  const [askAiInput, setAskAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // ── MODAL STATES ───────────────────────────────────────────────────
  const [createWsModalOpen, setCreateWsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsTopic, setNewWsTopic] = useState('');
  const [newWsEmails, setNewWsEmails] = useState(['', '']);

  const [joinWsModalOpen, setJoinWsModalOpen] = useState(false);
  const [joinWsCode, setJoinWsCode] = useState('');

  // ── USER DETAILS & GREETING ──────────────────────────────────────────
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Communicator';
  const userFirstName = userName.split(' ')[0];
  const [greetingPrefix, setGreetingPrefix] = useState('Good morning');

  useEffect(() => {
    setGreetingPrefix(getTimeGreetingPrefix());
  }, []);

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);


  if (authLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-cyan-500 dark:text-cyan-400" />
          <p className="text-sm font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">Verifying Session...</p>
        </div>
      </div>
    );
  }

  // ━━━ INSTANT MEETING LAUNCHER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleLaunchInstantMeeting = async () => {
    if (isLaunchingMeeting) return;
    setIsLaunchingMeeting(true);
    try {
      if (user) {
        const meeting = await MeetingService.createMeeting('Instant Meeting', user.id);
        navigateToRoom(meeting.room_code);
      } else {
        const roomCode = generateRoomCode();
        navigateToRoom(roomCode);
      }
    } catch (e) {
      console.error('Instant meeting creation error:', e);
      const roomCode = generateRoomCode();
      navigateToRoom(roomCode);
    }
  };

  // Create Workspace Handler
  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name: newWsName.trim(),
      topic: newWsTopic.trim() || 'General Collaboration',
      icon: 'building',
      membersCount: 1 + newWsEmails.filter((e) => e.trim()).length,
      conversationsCount: 1,
      members: [
        { name: userFirstName, email: user.email || '', role: 'Workspace Owner', avatarBg: 'bg-indigo-600' },
        ...newWsEmails
          .filter((em) => em.trim())
          .map((em, idx) => ({
            name: em.split('@')[0],
            email: em.trim(),
            role: 'Member',
            avatarBg: idx % 2 === 0 ? 'bg-cyan-600' : 'bg-emerald-600'
          }))
      ],
      channels: ['# General', '# Team-Announcements'],
      directMessages: [],
      upcomingMeetings: [],
      pastMeetings: [],
      channelMessages: {
        '# General': [
          { sender: 'Talk2Me AI', isAi: true, text: `Welcome to ${newWsName.trim()}! I am your AI companion for this workspace.`, time: 'Just now' }
        ]
      },
      aiWorkspaceChat: []
    };

    setWorkspaces((prev) => [newWs, ...prev]);
    setActiveWorkspaceId(newWs.id);
    setCreateWsModalOpen(false);
    setNewWsName('');
    setNewWsTopic('');
    setNewWsEmails(['', '']);
  };

  // Join Workspace Handler
  const handleJoinWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinWsCode.trim()) return;

    const code = joinWsCode.trim();
    const existing = workspaces.find((w) => w.id === code || w.name.toLowerCase().includes(code.toLowerCase()));

    if (existing) {
      setActiveWorkspaceId(existing.id);
    } else {
      const joinedWs: Workspace = {
        id: `ws-joined-${Date.now()}`,
        name: `Workspace (${code.slice(0, 8)})`,
        topic: 'Joined Workspace',
        icon: 'link',
        membersCount: 5,
        conversationsCount: 3,
        members: [
          { name: userFirstName, email: user.email || '', role: 'Member', avatarBg: 'bg-cyan-600' }
        ],
        channels: ['# General'],
        directMessages: [],
        upcomingMeetings: [],
        pastMeetings: [],
        channelMessages: {
          '# General': [
            { sender: 'System', text: `You joined the workspace using code ${code}.`, time: 'Just now' }
          ]
        },
        aiWorkspaceChat: []
      };
      setWorkspaces((prev) => [joinedWs, ...prev]);
      setActiveWorkspaceId(joinedWs.id);
    }

    setJoinWsModalOpen(false);
    setJoinWsCode('');
  };

  // Chat message sending with @Talk2Me trigger
  const handleSendChatMessage = () => {
    if (!chatInputText.trim() || !activeWorkspace) return;
    const text = chatInputText.trim();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updatedMessages = [
      ...(activeWorkspace.channelMessages[selectedChannel] || []),
      { sender: userFirstName, text, time: nowStr }
    ];

    let aiReply: { sender: string; isAi: boolean; text: string; time: string } | null = null;

    if (text.toLowerCase().includes('@talk2me')) {
      let replyText = `I am analyzing your workspace context regarding: "${text.replace(/@talk2me/gi, '').trim()}".`;
      if (text.toLowerCase().includes('decide') || text.toLowerCase().includes('target') || text.toLowerCase().includes('launch')) {
        replyText = "In yesterday's Product Launch meeting, the team agreed that September 5 remains the target, but the launch depends on payment integration passing QA first.";
      } else if (text.toLowerCase().includes('blocker') || text.toLowerCase().includes('status')) {
        replyText = "The main open blocker discussed in meetings is payment integration testing. Daniel owns this action item.";
      }
      aiReply = {
        sender: 'Talk2Me AI',
        isAi: true,
        text: replyText,
        time: nowStr
      };
    }

    const nextMessages = aiReply ? [...updatedMessages, aiReply] : updatedMessages;

    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === activeWorkspace.id
          ? {
              ...w,
              channelMessages: {
                ...w.channelMessages,
                [selectedChannel]: nextMessages
              }
            }
          : w
      )
    );

    setChatInputText('');
  };

  // Dedicated Ask AI Workspace Search Handler
  const handleSendAskAi = (promptText?: string) => {
    const text = (promptText || askAiInput).trim();
    if (!text || !activeWorkspace) return;

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userEntry = { sender: 'user' as const, text, time: nowStr };

    let aiResponseText = `Based on your workspace conversations and meetings for ${activeWorkspace.name}, here is what I found regarding "${text}":`;
    let sources = ['Product Launch Meeting — Aug 10', 'Engineering Chat — Aug 11'];

    const lower = text.toLowerCase();
    if (lower.includes('blocker') || lower.includes('launch')) {
      aiResponseText = `Based on your workspace conversations and meetings, I found three current blockers:\n\n1. **Payment integration**: Must complete QA testing before launch.\n2. **QA testing**: Load tests on 100 concurrent streams.\n3. **Marketing assets**: Final press release and demo video pending.\n\nDaniel owns payment integration and QA readiness.`;
      sources = ['Product Launch Meeting — Aug 10', 'Engineering Chat — Aug 11', 'Product Planning — Aug 8'];
    } else if (lower.includes('meeting') || lower.includes('summary') || lower.includes('decide')) {
      aiResponseText = `In recent workspace meetings, the key decisions were:\n\n• **Target Date**: Launch remains set for September 5.\n• **Architecture**: SFU audio worklets migrated to WebRTC high-performance mode.\n• **Action Owner**: Daniel is leading the payment integration setup.`;
      sources = ['Product Launch Meeting — Aug 10', 'Engineering Sync — Aug 9'];
    }

    const aiEntry = {
      sender: 'ai' as const,
      text: aiResponseText,
      sources,
      time: nowStr
    };

    setIsAiThinking(true);
    setAskAiInput('');

    setTimeout(() => {
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === activeWorkspace.id
            ? {
                ...w,
                aiWorkspaceChat: [...(w.aiWorkspaceChat || []), userEntry, aiEntry]
              }
            : w
        )
      );
      setIsAiThinking(false);
    }, 600);
  };

  // Meeting specific query handler
  const handleQueryMeeting = (query: string) => {
    if (!query.trim()) return;
    setMeetingAiQuery(query);
    setMeetingAiResponse("Searching meeting transcript & audio logs...");
    setTimeout(() => {
      setMeetingAiResponse(`Regarding "${query}": The main concern raised by Daniel was ensuring payment integration passes QA before the September 5 launch. Sarah confirmed marketing assets are ready.`);
    }, 500);
  };

  // ━━━ RENDER: GLOBAL HOME SCREEN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!activeWorkspace) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col relative overflow-hidden transition-colors duration-200">
        <GradientBackground />

        {/* Global Header */}
        <header className="relative z-10 w-full border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center group flex-shrink-0">
            <img
              src="/assets/logo-light.png"
              alt="Talk2Me Logo"
              className="dark:hidden block h-9 w-auto object-contain"
            />
            <img
              src="/assets/logo-dark.png"
              alt="Talk2Me Logo"
              className="hidden dark:block h-9 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <button className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all relative">
              <Bell className="size-5" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-cyan-500 dark:bg-cyan-400" />
            </button>

            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-white/10">
              <div className="size-9 rounded-xl bg-indigo-600 border border-indigo-500/30 grid place-items-center text-xs font-black text-white uppercase shadow-sm">
                {userFirstName.slice(0, 2)}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{userName}</span>
                <span className="text-[11px] text-slate-500 dark:text-muted-foreground">{user.email}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all ml-1"
                title="Sign Out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Home Dashboard Body */}
        <main className="relative z-10 flex-1 max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10 w-full flex flex-col gap-8 sm:gap-10">
          {/* Greeting Section */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              {greetingPrefix}, {userFirstName}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium">
              What would you like to do?
            </p>
          </div>

          {/* 3 Primary Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Start a Meeting */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleLaunchInstantMeeting}
              className="group cursor-pointer p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/90 transition-all duration-300 flex flex-col justify-between gap-6 shadow-md dark:shadow-xl"
            >
              <div className="flex flex-col gap-4">
                <div className="size-14 rounded-2xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 grid place-items-center group-hover:scale-110 transition-transform">
                  {isLaunchingMeeting ? <Loader2 className="size-7 animate-spin text-indigo-600 dark:text-indigo-400" /> : <Video className="size-7" />}
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    <Video className="size-5 text-blue-600 dark:text-blue-400" /> Start Meeting
                  </h3>
                  <p className="font-sans text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    Create an instant video meeting and share the room link with your team.
                  </p>
                </div>
              </div>
              <div className="font-sans flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1 group-hover:translate-x-1 transition-transform">
                {isLaunchingMeeting ? 'Launching instant room...' : 'Start Meeting'} <ArrowRight className="size-4" />
              </div>
            </motion.div>

            {/* Card 2: Create a Workspace */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setCreateWsModalOpen(true)}
              className="group cursor-pointer p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-600 dark:hover:border-blue-500 transition-all duration-200 flex flex-col justify-between gap-6 shadow-sm"
            >
              <div className="flex flex-col gap-4">
                <div className="size-12 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Building2 className="size-6" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    <Building2 className="size-5 text-blue-600 dark:text-blue-400" /> Create Workspace
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
              onClick={() => setJoinWsModalOpen(true)}
              className="group cursor-pointer p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-600 dark:hover:border-blue-500 transition-all duration-200 flex flex-col justify-between gap-6 shadow-sm"
            >
              <div className="flex flex-col gap-4">
                <div className="size-12 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Users className="size-6" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    <Users className="size-5 text-blue-600 dark:text-blue-400" /> Join Workspace
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
                {workspaces.length} Workspaces
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workspaces.map((ws) => {
                const latestMeeting = ws.pastMeetings[0];
                return (
                  <motion.div
                    key={ws.id}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => selectWorkspace(ws.id)}
                    className="group cursor-pointer p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/50 hover:bg-slate-50/80 dark:hover:bg-slate-900/90 transition-all duration-300 flex flex-col justify-between gap-6 shadow-md dark:shadow-xl relative overflow-hidden"
                  >
                    {/* Subtle top-right ambient glow */}
                    <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-indigo-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />

                    {/* Top Header: Icon + Title + Open CTA */}
                    <div className="flex items-start justify-between gap-4 relative z-10">
                      <div className="flex items-center gap-3.5">
                        <div className="size-12 rounded-xl bg-blue-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm flex-shrink-0">
                          {renderWorkspaceIcon(ws.icon)}
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight">
                            {ws.name}
                          </h3>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {ws.topic || 'Team Collaboration & AI Context'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 group-hover:bg-indigo-600 group-hover:text-white text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all shadow-sm flex-shrink-0">
                        Open <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Feature Chips showcasing Core UVP: Meetings, Chat, AI */}
                    <div className="flex flex-wrap items-center gap-2 relative z-10">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/50 dark:border-indigo-500/20 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                        <Video className="size-3 text-indigo-500" /> Meetings
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/50 dark:border-cyan-500/20 text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                        <MessageSquare className="size-3 text-cyan-500" /> Persistent Chat
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        <Sparkles className="size-3 text-emerald-500" /> AI Knowledge
                      </span>
                    </div>

                    {/* Footer: Member avatars & activity */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2 overflow-hidden">
                          {ws.members.slice(0, 3).map((m, idx) => (
                            <div
                              key={idx}
                              className={`inline-block size-6 rounded-full ${m.avatarBg} ring-2 ring-white dark:ring-slate-900 text-[9px] font-bold text-white text-center leading-6 uppercase`}
                              title={m.name}
                            >
                              {m.name.slice(0, 2)}
                            </div>
                          ))}
                        </div>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          {ws.membersCount} members
                        </span>
                      </div>

                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                        {latestMeeting ? `Last: ${latestMeeting.title}` : `${ws.conversationsCount} channels & DMs`}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </main>

        {/* MODAL 1: CREATE WORKSPACE */}
        <AnimatePresence>
          {createWsModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setCreateWsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative text-slate-900 dark:text-white"
              >
                <button
                  onClick={() => setCreateWsModalOpen(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="size-5" />
                </button>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create your workspace</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Set up a central hub for your team's meetings, chat, and AI context.
                  </p>
                </div>

                <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                      Workspace Name
                    </label>
                    <input
                      required
                      type="text"
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      placeholder="Talk2Me Product Team"
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-cyan-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                      What is your team working on?
                    </label>
                    <input
                      type="text"
                      value={newWsTopic}
                      onChange={(e) => setNewWsTopic(e.target.value)}
                      placeholder="Product development"
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-cyan-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                      Invite teammates (optional)
                    </label>
                    <div className="flex flex-col gap-2">
                      {newWsEmails.map((email, idx) => (
                        <input
                          key={idx}
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const updated = [...newWsEmails];
                            updated[idx] = e.target.value;
                            setNewWsEmails(updated);
                          }}
                          placeholder={`email${idx + 1}@example.com`}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm outline-none focus:border-cyan-500 transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-base transition-all shadow-lg active:scale-95"
                    >
                      Create Workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewWsEmails(['', '']);
                        handleCreateWorkspace({ preventDefault: () => {} } as any);
                      }}
                      className="w-full py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Skip invitations → Invite later
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL 2: JOIN WORKSPACE */}
        <AnimatePresence>
          {joinWsModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setJoinWsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative text-slate-900 dark:text-white"
              >
                <button
                  onClick={() => setJoinWsModalOpen(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="size-5" />
                </button>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Join a Workspace</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Enter an invitation link or workspace code to enter.
                  </p>
                </div>

                <form onSubmit={handleJoinWorkspace} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                      Invitation Link or Workspace Code
                    </label>
                    <input
                      required
                      type="text"
                      value={joinWsCode}
                      onChange={(e) => setJoinWsCode(e.target.value)}
                      placeholder="e.g. ws-product-team or https://talk2me.ai/join/ws-123"
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base transition-all shadow-lg active:scale-95"
                  >
                    Join Workspace
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* INSTANT MEETING LAUNCHING OVERLAY */}
        <AnimatePresence>
          {isLaunchingMeeting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-white"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="size-12 animate-spin text-cyan-400" />
                <h3 className="text-xl font-bold">Launching Instant Meeting</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Generating secure meeting room credentials...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ━━━ RENDER: WORKSPACE ENVIRONMENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const currentPastMeeting = activeWorkspace.pastMeetings.find((m) => m.id === selectedMeetingId) || null;

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col relative overflow-hidden transition-colors duration-200">
      {/* Workspace Header */}
      <header className="relative z-20 w-full border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            title="Open workspace sidebar"
          >
            <Menu className="size-5" />
          </button>

          <button
            onClick={() => selectWorkspace(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all"
            title="Return to Home Dashboard"
          >
            <ChevronLeft className="size-4" /> Home
          </button>

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0">{renderWorkspaceIcon(activeWorkspace.icon)}</span>
            <span className="font-heading font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-xs">
              {activeWorkspace.name}
            </span>
          </div>
        </div>

        {/* Global Search & User Bar */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
            <Search className="size-3.5" />
            <span>Search workspace...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px]">⌘K</kbd>
          </div>

          <ThemeToggle />

          <button className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 relative">
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-cyan-500 dark:bg-cyan-400" />
          </button>

          <div className="size-8 rounded-xl bg-indigo-600 border border-indigo-500/30 grid place-items-center text-xs font-black text-white">
            {userFirstName.slice(0, 2)}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex w-64 border-r border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl flex-col justify-between p-4 flex-shrink-0">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-3">
                Workspace Navigation
              </span>

              {/* Navigation Items */}
              <nav className="flex flex-col gap-1 mt-2 font-sans">
                {[
                  { id: 'overview', label: 'Overview', tab: 'overview', icon: Building2 },
                  { id: 'meetings', label: 'Meetings', tab: 'meetings', icon: Video },
                  { id: 'chat', label: 'Chat', tab: 'chat', icon: MessageSquare },
                  { id: 'ask-ai', label: 'Ask AI', tab: 'ask-ai', icon: Sparkles, highlight: true }
                ].map((item) => {
                  const NavIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.tab as WorkspaceTab);
                        if (item.tab !== 'meetings') setSelectedMeetingId(null);
                      }}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        activeTab === item.tab
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <NavIcon className="size-4 opacity-80" />
                        {item.label}
                      </span>
                      {item.highlight && activeTab !== item.tab && (
                        <span className="size-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Members Section */}
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-3 flex items-center justify-between">
                <span>Members ({activeWorkspace.members.length})</span>
              </span>
              <div className="flex flex-col gap-1">
                {activeWorkspace.members.map((m) => (
                  <div key={m.email} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">
                    <div className={`size-6 rounded-full ${m.avatarBg} grid place-items-center text-[10px] font-bold text-white`}>
                      {m.name.slice(0, 2)}
                    </div>
                    <span className="truncate">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Settings & Switcher */}
          <div className="flex flex-col gap-1 pt-4 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'settings'
                  ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Settings className="size-4" /> Settings
            </button>
          </div>
        </aside>

        {/* MOBILE SIDEBAR DRAWER */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md lg:hidden flex"
              onClick={() => setMobileNavOpen(false)}
            >
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-72 bg-white dark:bg-slate-900 h-full p-5 flex flex-col justify-between border-r border-slate-200 dark:border-white/10 shadow-2xl text-slate-900 dark:text-white"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{activeWorkspace.icon}</span>
                      <span className="font-bold text-base truncate">{activeWorkspace.name}</span>
                    </div>
                    <button
                      onClick={() => setMobileNavOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  {/* Navigation Items */}
                  <nav className="flex flex-col gap-1.5 font-sans">
                    {[
                      { id: 'overview', label: 'Workspace Overview', tab: 'overview', icon: Building2 },
                      { id: 'meetings', label: 'Meetings & Transcripts', tab: 'meetings', icon: Video },
                      { id: 'chat', label: 'Team Chat', tab: 'chat', icon: MessageSquare },
                      { id: 'ask-ai', label: 'Ask AI', tab: 'ask-ai', icon: Sparkles, highlight: true }
                    ].map((item) => {
                      const NavIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.tab as WorkspaceTab);
                            if (item.tab !== 'meetings') setSelectedMeetingId(null);
                            setMobileNavOpen(false);
                          }}
                          className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                            activeTab === item.tab
                              ? 'bg-blue-600 text-white font-semibold shadow-sm'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <NavIcon className="size-4 opacity-80" />
                            {item.label}
                          </span>
                          {item.highlight && activeTab !== item.tab && (
                            <span className="size-2 rounded-full bg-blue-500" />
                          )}
                        </button>
                      );
                    })}
                  </nav>

                  {/* Members Section */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-3">
                      Teammates ({activeWorkspace.members.length})
                    </span>
                    <div className="flex flex-col gap-1">
                      {activeWorkspace.members.map((m) => (
                        <div key={m.email} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                          <div className={`size-6 rounded-full ${m.avatarBg} grid place-items-center text-[10px] font-bold text-white`}>
                            {m.name.slice(0, 2)}
                          </div>
                          <span className="truncate">{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setMobileNavOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 w-full"
                  >
                    <Settings className="size-4" /> Settings
                  </button>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-white">
          {/* TAB 1: WORKSPACE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="max-w-4xl flex flex-col gap-6 sm:gap-8">
              {/* Header greeting */}
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{greetingPrefix}, {userFirstName}</h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Here is what's happening in <strong className="text-slate-900 dark:text-white">{activeWorkspace.name}</strong>.
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleLaunchInstantMeeting}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                >
                  {isLaunchingMeeting ? <Loader2 className="size-4 animate-spin" /> : '+ Start Meeting'}
                </button>

                <button
                  onClick={() => {
                    setActiveTab('chat');
                    setSelectedChannel('# General');
                  }}
                  className="px-5 py-3 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-900 dark:text-white text-sm font-bold flex items-center gap-2 border border-slate-200 dark:border-white/10 transition-all shadow-sm"
                >
                  + New Chat
                </button>

                <button
                  onClick={() => setActiveTab('ask-ai')}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-90 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg"
                >
                  ✨ Ask AI
                </button>
              </div>

              {/* Upcoming Meetings */}
              <div className="flex flex-col gap-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Upcoming Meetings</h2>
                {activeWorkspace.upcomingMeetings.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {activeWorkspace.upcomingMeetings.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-4 shadow-sm dark:shadow-md"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">{m.title}</h3>
                          <span className="text-xs text-indigo-600 dark:text-cyan-400 font-medium">{m.dateStr} · {m.participants} participants</span>
                        </div>
                        <button
                          onClick={() => navigateToRoom(m.roomCode)}
                          className="px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex-shrink-0"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 text-sm">
                    No upcoming meetings scheduled.
                  </div>
                )}
              </div>

              {/* Recent Conversations */}
              <div className="flex flex-col gap-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Recent Conversations</h2>
                <div className="flex flex-col gap-3">
                  {activeWorkspace.pastMeetings.map((pm) => (
                    <div
                      key={pm.id}
                      onClick={() => {
                        setSelectedMeetingId(pm.id);
                        setActiveTab('meetings');
                      }}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 cursor-pointer transition-all flex items-center justify-between gap-4 group shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="size-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 grid place-items-center flex-shrink-0">
                          <Video className="size-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {pm.title}
                          </h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {pm.dateStr}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="size-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-shrink-0" />
                    </div>
                  ))}

                  <div
                    onClick={() => {
                      setActiveTab('chat');
                      setSelectedChannel('# Product');
                    }}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 cursor-pointer transition-all flex items-center justify-between gap-4 group shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="size-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 grid place-items-center flex-shrink-0">
                        <MessageSquare className="size-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                          # Product Discussion
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">Yesterday · 8 messages</span>
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WORKSPACE MEETINGS */}
          {activeTab === 'meetings' && (
            <div className="max-w-4xl flex flex-col gap-6">
              {!selectedMeetingId ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Meetings</h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Recorded & transcribed workspace meeting history.</p>
                    </div>

                    <button
                      onClick={handleLaunchInstantMeeting}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2"
                    >
                      {isLaunchingMeeting ? <Loader2 className="size-4 animate-spin" /> : '+ Start Meeting'}
                    </button>
                  </div>

                  {/* Past Meetings List */}
                  <div className="flex flex-col gap-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Past Workspace Meetings</h2>

                    {activeWorkspace.pastMeetings.map((pm) => (
                      <div
                        key={pm.id}
                        onClick={() => setSelectedMeetingId(pm.id)}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/90 cursor-pointer transition-all flex items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">{pm.title}</h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{pm.dateStr}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                          <span className="hidden sm:inline">View Summary</span> <ChevronRight className="size-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* OPEN PREVIOUS MEETING DETAIL VIEW */
                currentPastMeeting && (
                  <div className="flex flex-col gap-6">
                    <button
                      onClick={() => setSelectedMeetingId(null)}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline w-fit"
                    >
                      ← Back to all meetings
                    </button>

                    <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-white/10 pb-6">
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{currentPastMeeting.title}</h1>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{currentPastMeeting.dateStr}</span>
                    </div>

                    {/* Sub-tabs: Summary / Transcript */}
                    <div className="flex border-b border-slate-200 dark:border-white/10 gap-6">
                      {(['summary', 'transcript'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setMeetingDetailTab(t)}
                          className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                            meetingDetailTab === t
                              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* SUMMARY SUB-TAB */}
                    {meetingDetailTab === 'summary' && (
                      <div className="flex flex-col gap-6">
                        <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 flex flex-col gap-4 shadow-sm">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Key Decisions</h3>
                          <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-200 space-y-2">
                            {currentPastMeeting.decisions.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 flex flex-col gap-4 shadow-sm">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Action Items</h3>
                          <div className="flex flex-col gap-2">
                            {currentPastMeeting.actionItems.map((act, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-white/10 text-xs font-bold text-indigo-700 dark:text-white border border-indigo-200 dark:border-transparent">
                                  {act.assignee}
                                </span>
                                <span>→ {act.task}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ASK ABOUT THIS MEETING */}
                        <div className="p-5 sm:p-6 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col gap-4 shadow-sm">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            Ask about this meeting
                          </h3>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={meetingAiQuery}
                              onChange={(e) => setMeetingAiQuery(e.target.value)}
                              placeholder="What were the main concerns?"
                              className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                            />
                            <button
                              onClick={() => handleQueryMeeting(meetingAiQuery || 'What were the main concerns?')}
                              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                            >
                              Ask AI
                            </button>
                          </div>

                          {meetingAiResponse && (
                            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed shadow-sm">
                              {meetingAiResponse}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TRANSCRIPT SUB-TAB */}
                    {meetingDetailTab === 'transcript' && (
                      <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 flex flex-col gap-4 shadow-sm">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Full Meeting Transcript</h3>
                        <div className="flex flex-col gap-3">
                          {currentPastMeeting.transcript.map((t, i) => (
                            <div key={i} className="flex flex-col gap-1 text-xs">
                              <span className="font-bold text-cyan-600 dark:text-cyan-400">{t.speaker} <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.time}</span></span>
                              <p className="text-slate-700 dark:text-slate-300">{t.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 3: WORKSPACE CHAT WITH @TALK2ME */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col md:flex-row rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 overflow-hidden max-h-[78vh] shadow-sm dark:shadow-xl">
              {/* Desktop Channel Sidebar */}
              <div className="hidden md:flex w-56 border-r border-slate-200 dark:border-white/10 p-4 flex-col gap-4 bg-slate-50 dark:bg-slate-900/80">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Channels</span>
                  <div className="flex flex-col gap-1 mt-2">
                    {activeWorkspace.channels.map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setSelectedChannel(ch)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                          selectedChannel === ch
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/5'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Direct Messages</span>
                  <div className="flex flex-col gap-1 mt-2">
                    {activeWorkspace.directMessages.map((dm) => (
                      <button
                        key={dm}
                        onClick={() => setSelectedChannel(dm)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors flex items-center gap-1.5 ${
                          selectedChannel === dm
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/5'
                        }`}
                      >
                        <Users className="size-3.5 text-slate-400" /> {dm}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile Channels Horizontal Pill Scroll */}
              <div className="md:hidden flex items-center gap-2 p-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 overflow-x-auto">
                {activeWorkspace.channels.concat(activeWorkspace.directMessages).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-colors ${
                      selectedChannel === ch
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {/* Messages Thread */}
              <div className="flex-1 flex flex-col justify-between font-sans">
                <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-sm text-slate-900 dark:text-white">
                  {selectedChannel}
                </div>

                <div className="flex-1 p-3 sm:p-4 overflow-y-auto flex flex-col gap-3 sm:gap-4">
                  {(activeWorkspace.channelMessages[selectedChannel] || []).map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col gap-1 p-3.5 rounded-xl max-w-xl ${
                        msg.isAi
                          ? 'bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-500/30'
                          : 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${msg.isAi ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                          {msg.sender}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{msg.time}</span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">{msg.text}</p>
                    </div>
                  ))}
                </div>

                {/* Input with @Talk2Me prompt */}
                <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="Message or type @Talk2Me..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  />
                  <button
                    onClick={handleSendChatMessage}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Send className="size-3.5" /> Send Message
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ASK AI (DEDICATED WORKSPACE SEARCH) */}
          {activeTab === 'ask-ai' && (
            <div className="max-w-4xl flex flex-col gap-6 font-sans">
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  <Sparkles className="size-6 text-blue-600 dark:text-blue-400" /> Talk2Me AI
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-normal">
                  Ask Talk2Me about your workspace — Get answers from your meetings and conversations.
                </p>
              </div>

              {/* Chat Thread */}
              <div className="flex flex-col gap-4">
                {activeWorkspace.aiWorkspaceChat.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-4 sm:p-6 rounded-2xl border ${
                      msg.sender === 'user'
                        ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'
                        : 'bg-white dark:bg-slate-900/90 border-indigo-200 dark:border-indigo-500/40 shadow-md dark:shadow-xl'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                      <span>{msg.sender === 'user' ? 'You' : 'Talk2Me AI'}</span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">{msg.text}</p>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Sources:
                        </span>
                        {msg.sources.map((src, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isAiThinking && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 className="size-4 animate-spin text-cyan-500 dark:text-cyan-400" />
                    Analyzing workspace meetings and conversations...
                  </div>
                )}
              </div>

              {/* Prompt Bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={askAiInput}
                  onChange={(e) => setAskAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendAskAi()}
                  placeholder="What are the biggest blockers for our product launch?"
                  className="flex-1 px-4 py-3.5 sm:py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 shadow-sm"
                />
                <button
                  onClick={() => handleSendAskAi()}
                  className="px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg flex-shrink-0"
                >
                  Ask AI
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: WORKSPACE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl flex flex-col gap-6">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Workspace Settings</h1>

              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 flex flex-col gap-4 shadow-sm">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={activeWorkspace.name}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Workspace ID / Invite Code
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={activeWorkspace.id}
                      readOnly
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-300 text-sm font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeWorkspace.id);
                        alert('Workspace ID copied to clipboard!');
                      }}
                      className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white text-xs font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* MOBILE STICKY BOTTOM TAB NAVIGATION BAR */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-lg font-sans">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'meetings', label: 'Meetings', icon: Video },
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'ask-ai', label: 'Ask AI', icon: Sparkles },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as WorkspaceTab);
                  if (tab.id !== 'meetings') setSelectedMeetingId(null);
                }}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TabIcon className="size-4" />
                <span className="text-[10px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-10 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">Loading Workspace...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
