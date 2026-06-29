'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getSmartGreeting } from '@/lib/greetings';
import {
  Home,
  Video,
  Radio,
  Calendar,
  MessageSquare,
  Cpu,
  FileAudio,
  FileText,
  Accessibility,
  BarChart3,
  Building2,
  Settings,
  Search,
  Plus,
  Bell,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Loader2,
  Mic,
  MicOff,
  VideoOff,
  Shield,
  Activity,
  Sparkles,
  Maximize2,
  Minimize2,
  PlusCircle,
  LogOut,
  Share2,
  Send,
  Info,
  Lock,
  Eye,
  HeartPulse,
  Clock,
  Globe,
  Sun,
  Moon,
  Languages,
  ArrowRight,
  User,
  Sliders,
  Play,
  Volume2,
  VolumeX,
  PlusSquare,
  Trash2
} from 'lucide-react';

import { useAuth } from '@/features/auth/use-auth';
import { Meeting } from '@/types/meeting';
import { MeetingService } from '@/services/supabase/meetings';
import { ProfileService, UserProfile } from '@/services/supabase/profiles';
import { generateRoomCode, roomShareUrl } from '@/packages/shared/rooms';
import { AiWaveBackground } from '@/packages/ui/ai-effects';
import { QrBlock } from '@/packages/ui/qr-block';
import { GradientBackground } from '@/components/ui/gradient-background';

// ── TYPES ────────────────────────────────────────────────────────────
type DashboardView =
  | 'home'
  | 'meetings'
  | 'streams'
  | 'events'
  | 'messages'
  | 'ai-workspace'
  | 'recordings'
  | 'notes'
  | 'accessibility'
  | 'analytics'
  | 'organizations'
  | 'settings';

interface MetricCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<any>;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading, signOut, updatePassword, updateProfile } = useAuth();
  const router = useRouter();

  // ── LAYOUT STATE ───────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<DashboardView>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [dbMeetings, setDbMeetings] = useState<Meeting[]>([]);

  // ── QUICK ACTIONS MODAL ──────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<'meeting' | 'stream' | 'event'>('meeting');
  const [sessionName, setSessionName] = useState('');
  const [sessionCategory, setSessionCategory] = useState('General');
  const [sessionAudience, setSessionAudience] = useState('public');
  const [generatedCode, setGeneratedCode] = useState('');

  /** Auto-formats a room code to the X-NNN-XXX pattern (e.g. S-521-F7G) as the user types */
  const formatRoomCode = (raw: string): string => {
    const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7);
    if (clean.length <= 1) return clean;
    if (clean.length <= 4) return `${clean[0]}-${clean.slice(1)}`;
    return `${clean[0]}-${clean.slice(1, 4)}-${clean.slice(4)}`;
  };
  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeneratedCode(formatRoomCode(e.target.value));
  };
  const joinWithCode = () => {
    const raw = generatedCode.replace(/-/g, '').trim();
    if (raw.length >= 4) router.push(`/room/${raw.toUpperCase()}`);
    else alert('Please enter a valid room code.');
  };
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledRequireApproval, setScheduledRequireApproval] = useState(false);
  const [scheduledAllowScreenShare, setScheduledAllowScreenShare] = useState(true);

  // ── SHARE SHEET STATE ────────────────────────────────────────────
  const [shareSheetMeeting, setShareSheetMeeting] = useState<{ title: string; code: string; scheduled_at?: string } | null>(null);

  const openShareSheet = (meeting: { title: string; code: string; scheduled_at?: string }) => {
    setShareSheetMeeting(meeting);
  };

  const closeShareSheet = () => setShareSheetMeeting(null);

  // ── ACCESSIBILITY SETTINGS STATE ───────────────────────────────────
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [translationLanguage, setTranslationLanguage] = useState('en');
  const [textToSpeech, setTextToSpeech] = useState(false);
  const [speechToText, setSpeechToText] = useState(true);
  const [signLanguageMode, setSignLanguageMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState<100 | 115 | 130>(100);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [keyboardNav, setKeyboardNav] = useState(false);

  // ── DYNAMIC NOTIFICATIONS & ACTIVITY DATA ───────────────────────────
  const [unreadNotifications, setUnreadNotifications] = useState<Record<string, boolean>>({});
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [newMessageText, setNewMessageText] = useState('');
  const [chatHistories, setChatHistories] = useState<Record<string, { sender: 'me' | 'them'; text: string; time: string }[]>>({
    'bot-interpreter': [
      { sender: 'them', text: 'Hi! I am a certified ASL interpreter. You can request me for any live session!', time: '10:00 AM' }
    ],
    'bot-companion': [
      { sender: 'them', text: 'Hello! I am your Talk2Me companion. I can summarize past meetings, check action items, or answer accessibility questions.', time: '10:00 AM' }
    ],
    'sarah-jenkins': [
      { sender: 'them', text: 'Hi! I reviewed the Deaf Mode visual scales for our webinar tomorrow. They look extremely clean!', time: '12:04 PM' },
      { sender: 'me', text: 'Excellent, thank you Sarah. We will start the stream simulation soon.', time: '12:05 PM' }
    ]
  });

  const notifications = useMemo(() => {
    const ended = dbMeetings.filter(m => m.status === 'ended').slice(0, 3);
    return ended.map((m) => ({
      id: m.id,
      title: 'AI Summary Ready',
      body: `The transcription and summary for "${m.title || 'Untitled Meeting'}" is available.`,
      read: unreadNotifications[m.id] ?? false,
      time: new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
    }));
  }, [dbMeetings, unreadNotifications]);

  const markAllNotificationsRead = () => {
    const updated: Record<string, boolean> = {};
    notifications.forEach(n => {
      updated[n.id] = true;
    });
    setUnreadNotifications(prev => ({ ...prev, ...updated }));
  };

  // ── AI ASSISTANT CHAT STATE ───────────────────────────────────────
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState([
    { sender: 'ai', text: "Hello! I am your Talk2Me Companion. I can summarize past meetings, check your action items, or write emails for you. What can I do for you today?", time: 'Just now' }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // ── STREAM SIMULATOR STATE ────────────────────────────────────────
  const [streamIsLive, setStreamIsLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState('Building the Future of Digital Workspaces 🚀');
  const [streamDesc, setStreamDesc] = useState('A live broadcast exploring modern accessibility, AI integration, and next-generation UI workflows.');
  const [streamCategoryVal, setStreamCategoryVal] = useState('Tech & AI');
  const [streamAudienceVal, setStreamAudienceVal] = useState('Public');
  const [streamVolume, setStreamVolume] = useState(80);
  const [streamMuted, setStreamMuted] = useState(false);
  const [streamChat, setStreamChat] = useState([
    { user: 'Sarah K.', text: 'This translation engine is incredibly fast! 🔥', timestamp: '12:04' },
    { user: 'Michael O.', text: 'Is there a recording available after the stream?', timestamp: '12:05' },
    { user: 'Elena R.', text: 'Supporting sign language natively is such a game changer.', timestamp: '12:05' }
  ]);
  const [streamNewMessage, setStreamNewMessage] = useState('');
  const [activeCaptionText, setActiveCaptionText] = useState('Welcome back everyone! Today we are demonstrating the custom visual interpreter...');
  const [aiModLogs, setAiModLogs] = useState<string[]>([
    '[AI Engine] Speech translation overlay loaded: Swahili/French/ASL',
    '[AI Mod] Ambient audio profile adjusted for speech clarity'
  ]);
  const [pollActive, setPollActive] = useState(true);
  const [pollQuestion, setPollQuestion] = useState('How do you prefer to view translation tracks?');
  const [pollOptions, setPollOptions] = useState([
    { id: 1, text: 'Burned-in Captions', votes: 45 },
    { id: 2, text: 'Visual Sign Panel', votes: 78 },
    { id: 3, text: 'Audio Translation Track', votes: 22 }
  ]);
  const [hasVoted, setHasVoted] = useState(false);

  const streamChatRef = useRef<HTMLDivElement>(null);

  // ── AUTH CHECK ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Fetch user meetings and other workspace profiles from database
  useEffect(() => {
    if (user) {
      MeetingService.getUserMeetings(user.id)
        .then(setDbMeetings)
        .catch(console.error);

      ProfileService.getAllProfiles()
        .then(data => {
          setProfiles(data.filter(p => p.id !== user.id));
        })
        .catch(console.error);
    }
  }, [user]);

  const displaySchedule = useMemo(() => {
    return dbMeetings
      .filter(m => m.status === 'active')
      .map(m => ({
        title: m.title || 'Untitled Meeting',
        time: m.scheduled_at ? new Date(m.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Active Now',
        type: 'Meeting',
        people: 'Host: You',
        code: m.room_code
      }));
  }, [dbMeetings]);

  const displayMeetings = useMemo(() => {
    return dbMeetings.map(m => ({
      id: m.id,
      name: m.title || 'Untitled Meeting',
      code: m.room_code,
      date: new Date(m.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      status: m.status === 'active' ? 'Active' : 'Ended'
    }));
  }, [dbMeetings]);

  const recentActivity = useMemo(() => {
    return dbMeetings
      .filter(m => m.status === 'ended')
      .slice(0, 3)
      .map(m => ({
        title: m.title || 'Untitled Meeting',
        date: new Date(m.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        icon: Video,
        insights: true,
        recording: false,
        code: m.room_code
      }));
  }, [dbMeetings]);

  const displayChats = useMemo(() => {
    const dbChats = profiles.map(p => ({
      id: p.id,
      name: p.full_name || 'Workspace User',
      role: p.is_interpreter ? 'Sign Language Interpreter' : 'Workspace Member',
      isBot: false,
    }));

    if (dbChats.length > 0) return dbChats;

    return [
      { id: 'bot-interpreter', name: 'Premium Sign Language Interpreter', role: 'Sign Professional', isBot: true },
      { id: 'bot-companion', name: 'Talk2Me AI Assistant', role: 'AI Assistant', isBot: true },
      { id: 'sarah-jenkins', name: 'Sarah Jenkins', role: 'Deaf Interpreter', isBot: true }
    ];
  }, [profiles]);

  useEffect(() => {
    if (displayChats.length > 0 && !selectedChatId) {
      setSelectedChatId(displayChats[0].id);
    }
  }, [displayChats, selectedChatId]);

  const activeChat = useMemo(() => {
    return displayChats.find(c => c.id === selectedChatId) || displayChats[0];
  }, [displayChats, selectedChatId]);

  const handleSendMessage = () => {
    if (!newMessageText.trim() || !activeChat) return;

    const newMsg = {
      sender: 'me' as const,
      text: newMessageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistories(prev => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), newMsg]
    }));

    setNewMessageText('');

    if (activeChat.isBot) {
      setTimeout(() => {
        const botReply = {
          sender: 'them' as const,
          text: activeChat.id === 'bot-companion'
            ? `I received your message: "${newMessageText}". As your Talk2Me AI Assistant, I can help you summarize meetings or translate transcriptions once you join a room!`
            : activeChat.id === 'sarah-jenkins'
            ? `Hi! As a Deaf Interpreter, I can translate this session. Start a call with me or schedule a meeting!`
            : `Hello! I'm ready to assist with Sign Language translation. Start a call using the button in the top right to invite me to interpret!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatHistories(prev => ({
          ...prev,
          [activeChat.id]: [...(prev[activeChat.id] || []), botReply]
        }));
      }, 1000);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm("Are you sure you want to delete this meeting? This action cannot be undone.")) {
      return;
    }
    
    try {
      await MeetingService.deleteMeeting(meetingId);
      setDbMeetings(prev => prev.filter(m => m.id !== meetingId));
    } catch (err) {
      console.error("Failed to delete meeting:", err);
      alert("Failed to delete meeting. Please try again.");
    }
  };

  // ── RESPONSIVE WINDOW RESIZE SYNC ──────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard navigation listener (Accessibility feature)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/Ctrl + K command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      // Esc closes modals
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setCreateModalOpen(false);
        setNotificationsOpen(false);
        setShareSheetMeeting(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto scroll stream chat
  useEffect(() => {
    if (streamChatRef.current) {
      streamChatRef.current.scrollTop = streamChatRef.current.scrollHeight;
    }
  }, [streamChat]);

  // Simulate live data when streaming
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (streamIsLive) {
      const chatPool = [
        { user: 'Amina L.', text: 'The low latency makes it feel like an in-person meeting!' },
        { user: 'David W.', text: 'Just shared this link with our accessibility team.' },
        { user: 'Jessica M.', text: 'Are the transcripts automatically formatted with headers?' },
        { user: 'Tariq A.', text: 'Is the sign language transformer running in WASM locally?' },
        { user: 'Chloe B.', text: 'Amazing visual presentation and dark mode contrast.' }
      ];

      const captionPool = [
        'Our vision models parse up to 60 frames per second directly in the client.',
        'This ensures we do not send raw camera feeds back to central servers, preserving privacy.',
        'By combining LiveKit media pipes with local Edge logic, we maintain sub-100ms lag.',
        'If you look at the right AI workspace panel, the action items are updating dynamically.',
        'We believe that communication should be accessible by design, not as a bolted-on extra.'
      ];

      interval = setInterval(() => {
        // Random chat
        const randomChat = chatPool[Math.floor(Math.random() * chatPool.length)];
        const time = new Date();
        const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
        setStreamChat(prev => [...prev, { user: randomChat.user, text: randomChat.text, timestamp: timeStr }]);

        // Random caption
        const randomCaption = captionPool[Math.floor(Math.random() * captionPool.length)];
        setActiveCaptionText(randomCaption);

        // Add to AI Mod log
        const logTypes = [
          '[AI Mod] Screen layout adapted for high-readability',
          '[AI Engine] Generated dynamic keyword highlight: "LiveKit SFU"',
          '[AI Engine] Sign transformer prediction confidence: 99.4%'
        ];
        const randomLog = logTypes[Math.floor(Math.random() * logTypes.length)];
        setAiModLogs(prev => [randomLog, ...prev.slice(0, 8)]);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [streamIsLive]);

  // User details
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Communicator';
  const userInitials = (profile?.full_name || user?.email || 'US').slice(0, 2).toUpperCase();
  const smartGreeting = useMemo(() => getSmartGreeting(userName), [userName]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-cyan" />
          <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Securing Connection...</p>
        </div>
      </div>
    );
  }

  // ── QUICK SESSION GENERATOR ────────────────────────────────────────
  const triggerCreateSession = (type: 'meeting' | 'stream' | 'event') => {
    setCreateModalType(type);
    setSessionName(type === 'meeting' ? 'Instant Meeting' : type === 'stream' ? 'Live Stream Broadcast' : 'Scheduled Meeting');
    const code = generateRoomCode();
    setGeneratedCode(code);
    
    // Set a default scheduled time (1 hour from now) formatted for datetime-local input
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    const localISO = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setScheduledTime(localISO);
    setScheduledRequireApproval(false);
    setScheduledAllowScreenShare(true);
    
    setCreateModalOpen(true);
  };

  const handleLaunchSession = async () => {
    setIsCreatingSession(true);
    try {
      if (createModalType === 'meeting') {
        const meeting = await MeetingService.createMeeting(
          sessionName || 'New Meeting', 
          user.id, 
          scheduledRequireApproval, 
          undefined, 
          scheduledAllowScreenShare
        );
        router.push(`/room/${meeting.room_code}`);
      } else if (createModalType === 'stream') {
        // Stream simulated setup
        setStreamTitle(sessionName || 'Untitled Stream');
        setCurrentView('streams');
        setStreamIsLive(true);
        setCreateModalOpen(false);
      } else {
        // Scheduled meeting
        const isoTime = new Date(scheduledTime).toISOString();
        const meeting = await MeetingService.createMeeting(
          sessionName || 'Scheduled Meeting', 
          user.id, 
          scheduledRequireApproval, 
          isoTime,
          scheduledAllowScreenShare
        );
        
        // Refresh meetings
        const updated = await MeetingService.getUserMeetings(user.id);
        setDbMeetings(updated);
        setCreateModalOpen(false);
        // Open share sheet instead of alert
        openShareSheet({
          title: meeting.title || 'Scheduled Meeting',
          code: meeting.room_code,
          scheduled_at: meeting.scheduled_at,
        });
      }
    } catch (e) {
      console.error('Launch session failed:', e);
      alert('Failed to launch or schedule session. Please try again.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1500);
    } catch (_) {}
  };

  // ── AI ASSISTANT CHAT SEND ─────────────────────────────────────────
  const handleSendAiMessage = () => {
    if (!aiChatInput.trim()) return;
    const userMsg = aiChatInput.trim();
    setAiChatMessages(prev => [...prev, { sender: 'user', text: userMsg, time: 'Just now' }]);
    setAiChatInput('');
    setIsAiTyping(true);

    setTimeout(() => {
      let response = "I've processed your request. Let me know if there's anything else I can find for you!";
      const lower = userMsg.toLowerCase();

      if (lower.includes('summarize') || lower.includes('summary')) {
        response = "Here is a quick summary of your yesterday's team standup: \n\n• **LCP Optimization**: The frontend team solved the 1.2s delay in hero render.\n• **Access Controls**: The backend RLS policy updates were verified.\n• **Action Item**: Sarah to set up LiveKit auto-recording triggers.";
      } else if (lower.includes('action') || lower.includes('todo')) {
        response = "Here are your active action items:\n\n1. Review the RLS migration file (Completed)\n2. Setup LiveKit token generation route (Completed)\n3. Push local changes to staging and test Deaf Mode visual scales (Pending)";
      } else if (lower.includes('email') || lower.includes('follow-up')) {
        response = "I have drafted a follow-up email for your last session:\n\n*Subject: Talk2Me Session Follow-up: Milestones & Next Steps*\n\n*Hi team, thanks for joining. Here is what we finalized: we deployed the accessibility center toggles. Next step: configure high frame rate settings.*";
      }

      setAiChatMessages(prev => [...prev, { sender: 'ai', text: response, time: 'Just now' }]);
      setIsAiTyping(false);
    }, 1500);
  };

  // ── VOTE IN POLL ───────────────────────────────────────────────────
  const handleVote = (optionId: number) => {
    if (hasVoted) return;
    setPollOptions(prev =>
      prev.map(opt => (opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt))
    );
    setHasVoted(true);
  };

  const totalVotes = pollOptions.reduce((acc, curr) => acc + curr.votes, 0);

  // ── COMMAND PALETTE SEARCH FILTER ─────────────────────────────────
  const SEARCH_ITEMS = [
    { type: 'Meeting', title: 'Daily Sync & Backlog Review', code: 'WXP-KLS-QRT', route: '/room/WXP-KLS-QRT' },
    { type: 'Stream', title: 'Talk2Me Accessibility Product Keynote', code: 'streams', isView: true },
    { type: 'Event', title: 'Global Accessibility & Inclusion Summit', code: 'events', isView: true },
    { type: 'AI Summary', title: 'Sprint Planning and RLS policy review', code: 'ai-workspace', isView: true },
    { type: 'Note', title: 'Deaf Mode Camera layout suggestions', code: 'notes', isView: true },
    { type: 'People', title: 'Sarah Jenkins (Core Interpreter)', code: 'messages', isView: true }
  ];

  const filteredSearchItems = SEARCH_ITEMS.filter(
    item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSelect = (item: typeof SEARCH_ITEMS[0]) => {
    setCommandPaletteOpen(false);
    setSearchQuery('');
    if (item.isView) {
      setCurrentView(item.code as DashboardView);
    } else if (item.route) {
      router.push(item.route);
    }
  };

  interface NavItem {
    view: DashboardView;
    label: string;
    icon: React.ComponentType<any>;
    highlight?: boolean;
  }

  // Navigation lists
  const navItems: NavItem[] = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'meetings', label: 'Meetings', icon: Video },
    { view: 'streams', label: 'Live Streams', icon: Radio },
    { view: 'events', label: 'Events & Webinars', icon: Calendar },
    { view: 'messages', label: 'Messages', icon: MessageSquare },
    { view: 'ai-workspace', label: 'AI Workspace', icon: Cpu },
    { view: 'recordings', label: 'Recordings', icon: FileAudio },
    { view: 'notes', label: 'Notes', icon: FileText },
    { view: 'accessibility', label: 'Accessibility Center', icon: Accessibility, highlight: true },
    { view: 'analytics', label: 'Analytics', icon: BarChart3 },
    { view: 'organizations', label: 'Organizations', icon: Building2 },
    { view: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div
      className={`min-h-screen flex bg-background text-foreground transition-all duration-300 font-sans ${
        highContrast ? 'contrast-125 border-4 border-cyan' : ''
      } ${reducedMotion ? 'motion-reduce' : ''}`}
      style={{
        fontSize: fontScale === 115 ? '1.15rem' : fontScale === 130 ? '1.3rem' : '1rem'
      }}
    >
      {/* ── LEFT SIDEBAR ────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: sidebarOpen ? '280px' : '80px' }}
        className="hidden md:flex flex-col flex-shrink-0 bg-card/60 backdrop-blur-xl border-r border-border/40 relative z-30"
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-border/40">
          <div className="flex items-center gap-3 overflow-hidden">
            {sidebarOpen ? (
              <Link href="/" className="flex items-center">
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
            ) : (
              <Link href="/" className="flex items-center justify-center w-9 h-9 flex-shrink-0">
                <img
                  src="/assets/logo-symbol.png"
                  alt="Talk2Me Symbol"
                  className="h-8 w-8 object-contain"
                />
              </Link>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            {sidebarOpen ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto no-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group ${
                  isActive
                    ? 'bg-indigo text-white font-bold shadow-md shadow-indigo/20'
                    : item.highlight
                    ? 'bg-cyan/10 text-cyan font-bold hover:bg-cyan/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                <Icon className={`size-5 flex-shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-cyan' : ''}`} />
                {sidebarOpen && <span className="text-sm truncate">{item.label}</span>}
                {!sidebarOpen && (
                  <div className="absolute left-20 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Account Footer */}
        <div className="p-4 border-t border-border/40 bg-card/20">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all text-left font-semibold"
          >
            <LogOut className="size-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">Log Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* ── MAIN WORKSPACE CONTAINER ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <GradientBackground />
        {/* ── TOP NAV BAR ───────────────────────────────────────────── */}
        <header className="h-16 flex items-center justify-between px-3 md:px-6 border-b border-border/40 bg-card/40 backdrop-blur-xl relative z-20">
          {/* Left: Mobile Sidebar toggle and global Search bar */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-xl">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg bg-foreground/5 text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              {sidebarOpen ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
            </button>

            {/* Global Search palette button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center justify-center sm:justify-start gap-3 w-10 sm:w-full max-w-md h-10 px-0 sm:px-4 rounded-xl border border-transparent sm:border-border/40 bg-foreground/5 hover:bg-foreground/8 transition-all text-left text-muted-foreground text-sm flex-shrink-0 sm:flex-shrink"
            >
              <Search className="size-4 text-muted-foreground flex-shrink-0" />
              <span className="hidden sm:inline flex-1 truncate">Search meetings, events, or ask AI...</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold border rounded bg-card/60 shadow-sm uppercase tracking-wide">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right: Quick actions, notifications, status, profile */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Quick action button */}
            <div className="relative">
              <button
                onClick={() => triggerCreateSession('meeting')}
                className="size-10 sm:h-10 sm:w-auto sm:px-4 rounded-xl bg-indigo text-white font-bold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Plus className="size-4 flex-shrink-0" />
                <span className="hidden sm:inline">Quick Start</span>
              </button>
            </div>

            {/* Accessibility Status indicator */}
            <button
              onClick={() => setCurrentView('accessibility')}
              className={`p-2 rounded-xl border transition-all flex-shrink-0 ${
                captionsEnabled || signLanguageMode || highContrast
                  ? 'bg-cyan/15 border-cyan/40 text-cyan shadow-sm animate-pulse-slow'
                  : 'bg-foreground/5 border-transparent text-muted-foreground hover:text-foreground'
              }`}
              title="Accessibility Center Status"
            >
              <Accessibility className="size-5" />
            </button>

            {/* Notification system */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl bg-foreground/5 hover:bg-foreground/8 text-muted-foreground hover:text-foreground relative transition-all"
              >
                <Bell className="size-5" />
                <span className="absolute top-1 right-1 size-2 rounded-full bg-indigo ring-2 ring-background" />
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-3 w-80 rounded-2xl border border-border/40 bg-card p-4 shadow-2xl z-50"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-sm">Notifications</span>
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-xs text-indigo hover:underline font-bold cursor-pointer"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto no-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
                            No new notifications
                          </div>
                        ) : (
                          notifications.map(item => (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-xl border transition-all ${
                                item.read ? 'border-transparent bg-foreground/3' : 'border-indigo/20 bg-indigo/5'
                              }`}
                            >
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="truncate">{item.title}</span>
                                <span className="text-muted-foreground text-[10px] font-normal">{item.time}</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar */}
            <div
              onClick={() => setCurrentView('settings')}
              className="size-10 rounded-xl bg-gradient-to-tr from-cyan to-indigo grid place-items-center text-white text-xs font-black shadow-lg border border-white/20 cursor-pointer hover:scale-105 transition-transform"
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* ── MAIN SCROLLABLE CONTENT AREA ────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6 space-y-8 no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── HOME VIEW ─────────────────────────────────────────── */}
              {currentView === 'home' && (
                <div className="space-y-8 max-w-5xl mx-auto">
                  {/* Clean Greeting Header */}
                  <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl flex items-center gap-2.5">
                      {smartGreeting.greeting} <span>{smartGreeting.emoji}</span>
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                      {smartGreeting.subtitle}
                    </p>
                  </div>

                  {/* Quick Actions Grid */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold tracking-tight">Quick Actions</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Action 1: Instant Call */}
                      <div className="glass-card p-5 rounded-2xl border border-border/40 hover:border-indigo/30 transition-all flex flex-col justify-between min-h-[180px] group">
                        <div className="space-y-2">
                          <div className="size-10 rounded-xl bg-indigo/10 text-indigo flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                            <Video className="size-5" />
                          </div>
                          <h3 className="font-bold text-sm text-foreground">Instant Call</h3>
                          <p className="text-[11px] text-muted-foreground leading-normal">Start an immediate inclusive video session.</p>
                        </div>
                        <button
                          onClick={() => triggerCreateSession('meeting')}
                          className="w-full py-2 px-3 mt-4 rounded-xl bg-indigo text-white font-bold text-xs hover:shadow-md transition-all cursor-pointer"
                        >
                          Start Meeting
                        </button>
                      </div>

                      {/* Action 2: Join with Code */}
                      <div className="glass-card p-5 rounded-2xl border border-border/40 hover:border-cyan/30 transition-all flex flex-col justify-between min-h-[180px] group">
                        <div className="space-y-2">
                          <div className="size-10 rounded-xl bg-cyan/10 text-cyan flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                            <Lock className="size-5" />
                          </div>
                          <h3 className="font-bold text-sm text-foreground">Join with Code</h3>
                          <p className="text-[11px] text-muted-foreground leading-normal">Enter room credentials to join a session.</p>
                        </div>
                        <div className="flex gap-1.5 mt-4">
                          <input
                            type="text"
                            value={generatedCode}
                            placeholder="S-521-F7G"
                            maxLength={9}
                            className="w-full px-2 py-1.5 rounded-lg border border-border/40 bg-foreground/5 text-[10px] uppercase font-mono text-center outline-none focus:bg-background focus:ring-1 focus:ring-cyan"
                            onChange={handleRoomCodeChange}
                            onKeyDown={(e) => e.key === 'Enter' && joinWithCode()}
                          />
                          <button
                            onClick={joinWithCode}
                            className="px-3 py-1.5 rounded-lg bg-foreground text-background font-bold text-[10px] hover:opacity-90 cursor-pointer"
                          >
                            Join
                          </button>
                        </div>
                      </div>

                      {/* Action 3: Schedule Meeting */}
                      <div className="glass-card p-5 rounded-2xl border border-border/40 hover:border-indigo/30 transition-all flex flex-col justify-between min-h-[180px] group">
                        <div className="space-y-2">
                          <div className="size-10 rounded-xl bg-indigo/10 text-indigo flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                            <Calendar className="size-5" />
                          </div>
                          <h3 className="font-bold text-sm text-foreground">Schedule Session</h3>
                          <p className="text-[11px] text-muted-foreground leading-normal">Book a future meeting with a11y features.</p>
                        </div>
                        <button
                          onClick={() => triggerCreateSession('event')}
                          className="w-full py-2 px-3 mt-4 rounded-xl border border-border hover:bg-foreground/5 text-foreground font-bold text-xs transition-all cursor-pointer"
                        >
                          Schedule
                        </button>
                      </div>

                      {/* Action 4: Streaming Studio */}
                      <div className="glass-card p-5 rounded-2xl border border-border/40 hover:border-cyan/30 transition-all flex flex-col justify-between min-h-[180px] group">
                        <div className="space-y-2">
                          <div className="size-10 rounded-xl bg-cyan/10 text-cyan flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                            <Radio className="size-5" />
                          </div>
                          <h3 className="font-bold text-sm text-foreground">Go Live</h3>
                          <p className="text-[11px] text-muted-foreground leading-normal">Launch streaming console to broadcast.</p>
                        </div>
                        <button
                          onClick={() => {
                            setStreamTitle('Live Broadcast Studio');
                            setCurrentView('streams');
                            setStreamIsLive(true);
                          }}
                          className="w-full py-2 px-3 mt-4 rounded-xl bg-cyan text-slate-950 font-bold text-xs hover:shadow-md transition-all cursor-pointer"
                        >
                          Start Broadcast
                        </button>
                      </div>
                    </div>
                  </div>
                          {/* 3 Core Highlight Metrics */}
                  <div className="grid sm:grid-cols-3 gap-6">
                    {[
                      { title: 'Meetings this Week', value: '14', detail: '4 active sessions today', icon: Video },
                      { title: 'AI Summaries Generated', value: '23', detail: '100% automated parsing', icon: Cpu },
                      { title: 'Accessibility Usage', value: '18 hours', detail: 'Live captioning & sign translation', icon: Accessibility }
                    ].map((card, i) => {
                      const Icon = card.icon;
                      return (
                        <div
                          key={i}
                          className="glass-card p-6 rounded-2xl border border-border/40 hover:border-cyan/30 transition-all flex items-center gap-5"
                        >
                          <div className="size-12 rounded-xl bg-indigo/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="size-6 text-indigo" />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider block mb-0.5">
                              {card.title}
                            </span>
                            <div className="text-2xl font-black text-foreground">{card.value}</div>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">{card.detail}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Upcoming & Activity Split */}
                  <div className="grid lg:grid-cols-3 gap-8 pt-2">
                    {/* Left: Schedule list */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold tracking-tight">Today's Schedule</h2>
                        <button
                          onClick={() => setCurrentView('events')}
                          className="text-xs font-bold text-indigo hover:underline"
                        >
                          Full Calendar →
                        </button>
                      </div>

                      <div className="space-y-3">
                        {displaySchedule.length === 0 ? (
                          <div className="p-8 text-center border border-dashed border-border/40 rounded-2xl text-muted-foreground text-xs font-semibold bg-card/20 flex flex-col items-center justify-center gap-2">
                            <Calendar className="size-8 opacity-30 text-indigo animate-pulse" />
                            <span>No upcoming meetings scheduled. Start or schedule a session above!</span>
                          </div>
                        ) : (
                          displaySchedule.map((event, index) => (
                            <div
                              key={index}
                              className="p-4 rounded-xl border border-border/40 bg-card/40 hover:bg-card transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                    event.type === 'Meeting' ? 'bg-indigo/10 text-indigo' : 'bg-red-500/10 text-red-500'
                                  }`}>
                                    {event.type}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-medium">{event.time}</span>
                                </div>
                                <h3 className="font-bold text-sm text-foreground">{event.title}</h3>
                                <p className="text-[11px] text-muted-foreground">{event.people}</p>
                              </div>
                              <div className="flex items-center gap-2 self-start sm:self-auto">
                                <button
                                  onClick={() => openShareSheet({ title: event.title, code: event.code })}
                                  className="px-3 py-2 rounded-xl border border-border/40 text-muted-foreground hover:text-foreground hover:bg-foreground/5 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                  title="Share this meeting"
                                >
                                  <Share2 className="size-3.5" />
                                  Share
                                </button>
                                <button
                                  onClick={() => {
                                    if (event.type === 'Meeting') {
                                      router.push(`/room/${event.code.replace(/-/g, '')}`);
                                    } else {
                                      setCurrentView(event.code as DashboardView);
                                    }
                                  }}
                                  className="px-4 py-2 rounded-xl bg-indigo text-white font-bold text-xs hover:shadow transition-all cursor-pointer"
                                >
                                  Join
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right: Activity recap */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold tracking-tight">Recent Activity</h2>
                      <div className="space-y-3">
                        {recentActivity.length === 0 ? (
                          <div className="p-8 text-center border border-dashed border-border/40 rounded-2xl text-muted-foreground text-xs font-semibold bg-card/20 flex flex-col items-center justify-center gap-2">
                            <Activity className="size-8 opacity-30 text-indigo" />
                            <span>No recent activity found. Join a meeting to get started.</span>
                          </div>
                        ) : (
                          recentActivity.map((activity, idx) => {
                            const ActIcon = activity.icon;
                            return (
                              <div key={idx} className="p-4 rounded-xl border border-border/40 bg-card/45 hover:bg-card transition-all space-y-3">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-lg bg-indigo/10 grid place-items-center text-indigo flex-shrink-0">
                                    <ActIcon className="size-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-xs text-foreground truncate">{activity.title}</h4>
                                    <p className="text-[10px] text-muted-foreground">{activity.date}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {activity.insights && (
                                    <button
                                      onClick={() => setCurrentView('ai-workspace')}
                                      className="text-[9px] font-black uppercase px-2 py-1 rounded bg-indigo/15 text-indigo hover:bg-indigo/20 transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <Sparkles className="size-2.5" />
                                      AI Summary
                                    </button>
                                  )}
                                  {activity.recording && (
                                    <button
                                      onClick={() => setCurrentView('recordings')}
                                      className="text-[9px] font-black uppercase px-2 py-1 rounded bg-foreground/5 text-muted-foreground hover:bg-foreground/10 transition-all cursor-pointer"
                                    >
                                      Recording
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MEETINGS VIEW ────────────────────────────────────── */}
              {currentView === 'meetings' && (
                <div className="space-y-8 max-w-4xl">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">Meetings Portal</h1>
                    <p className="text-muted-foreground text-sm">Host instant calls, join using secure credentials, or schedule inclusive video sessions.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 rounded-2xl border border-border/40 flex flex-col justify-between min-h-[220px]">
                      <div>
                        <div className="size-12 rounded-xl bg-indigo/10 grid place-items-center text-indigo mb-4">
                          <Video className="size-6" />
                        </div>
                        <h3 className="font-black text-lg mb-1">Instant Session</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Launch an immediate 1:1 call or collaborative group workspace with auto captions.</p>
                      </div>
                      <button
                        onClick={() => triggerCreateSession('meeting')}
                        className="w-full py-3 rounded-xl bg-indigo text-white font-bold text-sm hover:shadow-lg transition-all"
                      >
                        Start Meeting
                      </button>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-border/40 flex flex-col justify-between min-h-[220px]">
                      <div>
                        <div className="size-12 rounded-xl bg-cyan/10 grid place-items-center text-cyan mb-4">
                          <Lock className="size-6" />
                        </div>
                        <h3 className="font-black text-lg mb-1">Join with Code</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Enter a 9-letter code to instantly connect to an ongoing secured meeting room.</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={generatedCode}
                          placeholder="S-521-F7G"
                          maxLength={9}
                          className="flex-1 px-3 py-2 rounded-xl border border-border/40 bg-foreground/5 text-sm uppercase tracking-wider outline-none text-center font-mono"
                          onChange={handleRoomCodeChange}
                          onKeyDown={(e) => e.key === 'Enter' && joinWithCode()}
                        />
                        <button
                          onClick={joinWithCode}
                          className="px-4 py-2 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90"
                        >
                          Join
                        </button>
                      </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-border/40 flex flex-col justify-between min-h-[220px]">
                      <div>
                        <div className="size-12 rounded-xl bg-indigo/10 grid place-items-center text-indigo mb-4">
                          <Calendar className="size-6" />
                        </div>
                        <h3 className="font-black text-lg mb-1">Schedule Meeting</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Configure date, participants, language overlays, and automatic summary policies.</p>
                      </div>
                      <button
                        onClick={() => triggerCreateSession('event')}
                        className="w-full py-3 rounded-xl border border-border text-foreground hover:bg-foreground/5 font-bold text-sm"
                      >
                        Schedule
                      </button>
                    </div>
                  </div>

                  {/* Active Rooms Table */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Active Rooms History</h3>
                    <div className="overflow-x-auto rounded-xl border border-border/40 bg-card">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-border/40 bg-foreground/3">
                            <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Room Name</th>
                            <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Room Code</th>
                            <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Created At</th>
                            <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Status</th>
                            <th className="p-4 font-bold text-xs text-muted-foreground uppercase text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayMeetings.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-muted-foreground text-xs font-semibold">
                                No meetings found. Create or schedule a meeting above to start.
                              </td>
                            </tr>
                          ) : (
                            displayMeetings.map((room, idx) => (
                              <tr key={idx} className="border-b border-border/20 last:border-0 hover:bg-foreground/2">
                                <td className="p-4 font-bold">{room.name}</td>
                                <td className="p-4 font-mono text-xs text-indigo">{room.code}</td>
                                <td className="p-4 text-muted-foreground text-xs">{room.date}</td>
                                <td className="p-4">
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    room.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-foreground/5 text-muted-foreground'
                                  }`}>
                                    {room.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => openShareSheet({ title: room.name, code: room.code })}
                                      className="p-1.5 rounded bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition cursor-pointer"
                                      title="Share Meeting Link"
                                    >
                                      <Share2 className="size-4" />
                                    </button>
                                    <button
                                      onClick={() => router.push(`/room/${room.code}`)}
                                      className="px-3 py-1.5 rounded bg-indigo text-white font-bold text-xs hover:shadow transition cursor-pointer"
                                    >
                                      Enter
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMeeting(room.id)}
                                      className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 transition cursor-pointer"
                                      title="Delete Meeting"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── LIVE STREAMS VIEW (STUDIO SIMULATOR) ───────────────── */}
              {currentView === 'streams' && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-black tracking-tight">Talk2Me Streaming Studio</h1>
                      <p className="text-muted-foreground text-sm">Simulate live interactive broadcasting with integrated AI captions and real-time overlays.</p>
                    </div>

                    {!streamIsLive ? (
                      <button
                        onClick={() => setStreamIsLive(true)}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 self-start"
                      >
                        <Radio className="size-4" />
                        Go Live Now
                      </button>
                    ) : (
                      <button
                        onClick={() => setStreamIsLive(false)}
                        className="px-6 py-3 bg-slate-900 text-white border border-border/50 hover:bg-slate-900/80 font-bold rounded-xl flex items-center gap-2 self-start"
                      >
                        <VolumeX className="size-4 text-red-500" />
                        End Stream
                      </button>
                    )}
                  </div>

                  {!streamIsLive ? (
                    /* Stream Setup Panel */
                    <div className="grid lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 glass-card p-8 rounded-3xl border border-border/40 space-y-6">
                        <h3 className="font-bold text-lg border-b border-border/40 pb-4">Stream Configuration</h3>

                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Broadcast Title</label>
                            <input
                              type="text"
                              value={streamTitle}
                              onChange={(e) => setStreamTitle(e.target.value)}
                              className="w-full h-12 px-4 rounded-xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-cyan transition-all outline-none text-sm font-semibold"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Category</label>
                            <input
                              type="text"
                              value={streamCategoryVal}
                              onChange={(e) => setStreamCategoryVal(e.target.value)}
                              className="w-full h-12 px-4 rounded-xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-cyan transition-all outline-none text-sm font-semibold"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                          <textarea
                            value={streamDesc}
                            onChange={(e) => setStreamDesc(e.target.value)}
                            rows={3}
                            className="w-full p-4 rounded-xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-cyan transition-all outline-none text-sm font-semibold resize-none"
                          />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Audience Privacy</label>
                            <select
                              value={streamAudienceVal}
                              onChange={(e) => setStreamAudienceVal(e.target.value)}
                              className="w-full h-12 px-4 rounded-xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-cyan transition-all outline-none text-sm font-semibold"
                            >
                              <option value="Public">Public (Anyone can view)</option>
                              <option value="Unlisted">Unlisted (Link holders only)</option>
                              <option value="Private">Private (Org invitees only)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Language Stream Translates To</label>
                            <select
                              value={translationLanguage}
                              onChange={(e) => setTranslationLanguage(e.target.value)}
                              className="w-full h-12 px-4 rounded-xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-cyan transition-all outline-none text-sm font-semibold"
                            >
                              <option value="en">English (US)</option>
                              <option value="fr">French (France)</option>
                              <option value="sw">Swahili (Kenya)</option>
                              <option value="de">German</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Right preview box */}
                      <div className="glass-card p-6 rounded-3xl border border-border/40 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="aspect-video w-full rounded-2xl bg-slate-950 flex items-center justify-center relative overflow-hidden border border-white/5">
                            <Radio className="size-12 text-slate-800 animate-pulse" />
                            <div className="absolute top-3 left-3 bg-black/60 px-2 py-1 rounded text-[10px] font-bold uppercase text-white border border-white/10">
                              Preview Off
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-base">{streamTitle}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{streamDesc}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setStreamIsLive(true)}
                          className="w-full py-4 mt-6 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg shadow-red-500/15 flex items-center justify-center gap-2"
                        >
                          <Radio className="size-4" />
                          Launch Live Broadcast
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Broadcaster Studio Simulator */
                    <div className="grid lg:grid-cols-4 gap-8">
                      {/* Studio Main (Left 3 columns) */}
                      <div className="lg:col-span-3 space-y-6">
                        {/* Simulated Webcam Feed */}
                        <div className="relative aspect-video rounded-3xl bg-slate-950 overflow-hidden border border-cyan/20 shadow-2xl flex items-center justify-center">
                          <AiWaveBackground className="opacity-40" />

                          {/* Top controls / badges */}
                          <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
                            <div className="flex items-center gap-2 pointer-events-auto">
                              <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1.5 animate-pulse">
                                <span className="size-1.5 rounded-full bg-white animate-ping" />
                                LIVE
                              </span>
                              <span className="bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
                                <Clock className="size-3 text-cyan" />
                                00:04:12
                              </span>
                            </div>

                            <span className="bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/10 pointer-events-auto">
                              {streamCategoryVal}
                            </span>
                          </div>

                          {/* Interactive Overlay Captions */}
                          <div className="absolute bottom-6 inset-x-6 bg-black/70 border border-white/15 p-4 rounded-2xl backdrop-blur text-center space-y-2 pointer-events-auto">
                            <div className="flex justify-between items-center px-2 border-b border-white/10 pb-1.5 mb-1.5">
                              <div className="flex items-center gap-1 text-[10px] font-black text-cyan uppercase tracking-wider">
                                <Languages className="size-3" />
                                Translated Captions ({translationLanguage.toUpperCase()})
                              </div>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold">Auto Scroll ON</span>
                            </div>
                            <p className="text-white text-sm sm:text-base font-medium leading-relaxed tracking-wide italic">
                              "{activeCaptionText}"
                            </p>
                          </div>

                          {/* Mock video source label */}
                          <div className="absolute text-white/40 font-black text-2xl tracking-tighter pointer-events-none opacity-40 select-none">
                            TALK2ME STREAM CONSOLE
                          </div>
                        </div>

                        {/* Stream Action Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/40 bg-card">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setStreamMuted(!streamMuted)}
                              className={`p-3 rounded-xl transition-all ${
                                streamMuted ? 'bg-red-500 text-white' : 'bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {streamMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                            </button>
                            <button className="p-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-all">
                              <VideoOff className="size-5" />
                            </button>
                            <div className="hidden sm:flex items-center gap-2 ml-4">
                              <Volume2 className="size-4 text-muted-foreground" />
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={streamVolume}
                                onChange={(e) => setStreamVolume(Number(e.target.value))}
                                className="w-24 accent-indigo"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button className="px-4 py-2 bg-indigo/15 text-indigo font-bold text-xs rounded-xl hover:bg-indigo/20 transition-all flex items-center gap-1.5">
                              <Share2 className="size-3.5" />
                              Invite
                            </button>
                            <button
                              onClick={() => setStreamIsLive(false)}
                              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-xl transition-all shadow shadow-red-500/10"
                            >
                              Stop Streaming
                            </button>
                          </div>
                        </div>

                        {/* Interactive poll overlay or panel */}
                        {pollActive && (
                          <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-cyan animate-pulse" />
                                <h4 className="font-bold text-sm uppercase tracking-wider text-cyan">Active Engagement Poll</h4>
                              </div>
                              <button
                                onClick={() => setPollActive(false)}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                Close Poll
                              </button>
                            </div>
                            <div className="space-y-3">
                              <p className="font-bold text-base">{pollQuestion}</p>

                              <div className="space-y-2.5">
                                {pollOptions.map((opt) => {
                                  const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                  return (
                                    <button
                                      key={opt.id}
                                      onClick={() => handleVote(opt.id)}
                                      disabled={hasVoted}
                                      className="w-full text-left relative overflow-hidden rounded-xl border border-border/40 p-4 hover:border-indigo/50 transition-all active:scale-[0.99] disabled:pointer-events-none group"
                                    >
                                      {/* Fill background */}
                                      {hasVoted && (
                                        <div
                                          className="absolute inset-y-0 left-0 bg-indigo/10 transition-all duration-1000"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      )}

                                      <div className="flex justify-between items-center relative z-10">
                                        <span className="font-semibold text-sm">{opt.text}</span>
                                        {hasVoted && (
                                          <span className="font-bold text-xs text-indigo">
                                            {opt.votes} votes ({percentage}%)
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              {hasVoted && (
                                <p className="text-[10px] text-muted-foreground text-center">
                                  Thank you for voting! Total responses: {totalVotes}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat and moderation panel (Right column) */}
                      <div className="space-y-6">
                        {/* Live Audience Chat */}
                        <div className="glass-card rounded-3xl border border-border/40 flex flex-col h-[380px]">
                          <div className="p-4 border-b border-border/40 flex justify-between items-center">
                            <span className="font-bold text-sm">Audience Chat</span>
                            <span className="text-[10px] bg-foreground/5 text-muted-foreground px-2 py-0.5 rounded font-bold uppercase">
                              120 Online
                            </span>
                          </div>

                          {/* Chat feed */}
                          <div ref={streamChatRef} className="flex-1 p-4 space-y-3 overflow-y-auto no-scrollbar">
                            {streamChat.map((chat, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-baseline">
                                  <span className="font-bold text-xs text-indigo">{chat.user}</span>
                                  <span className="text-[9px] text-muted-foreground">{chat.timestamp}</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{chat.text}</p>
                              </div>
                            ))}
                          </div>

                          {/* Chat Input */}
                          <div className="p-4 border-t border-border/40 flex gap-2">
                            <input
                              type="text"
                              placeholder="Send message to audience..."
                              value={streamNewMessage}
                              onChange={(e) => setStreamNewMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (!streamNewMessage.trim()) return;
                                  const time = new Date();
                                  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
                                  setStreamChat(prev => [...prev, { user: userName, text: streamNewMessage, timestamp: timeStr }]);
                                  setStreamNewMessage('');
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-foreground/5 border border-transparent rounded-xl outline-none focus:bg-background focus:ring-1 focus:ring-indigo text-xs font-semibold"
                            />
                            <button
                              onClick={() => {
                                if (!streamNewMessage.trim()) return;
                                const time = new Date();
                                const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
                                setStreamChat(prev => [...prev, { user: userName, text: streamNewMessage, timestamp: timeStr }]);
                                setStreamNewMessage('');
                              }}
                              className="p-2 rounded-xl bg-indigo text-white hover:opacity-90"
                            >
                              <Send className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* AI Moderation Logger */}
                        <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-3">
                          <div className="flex items-center gap-2">
                            <Shield className="size-4 text-cyan" />
                            <span className="font-bold text-xs uppercase tracking-wider text-cyan">AI Mod & Safety logs</span>
                          </div>
                          <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
                            {aiModLogs.map((log, index) => (
                              <div key={index} className="text-[10px] font-medium leading-relaxed border-b border-border/10 pb-1.5 text-muted-foreground">
                                {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── EVENTS & WEBINARS VIEW ────────────────────────────── */}
              {currentView === 'events' && (
                <div className="space-y-8 max-w-4xl">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">Events & Webinars</h1>
                    <p className="text-muted-foreground text-sm">Schedule and manage large-scale interactive webinars with accessibility settings built-in.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-4">
                      <h3 className="font-bold text-lg">Event Schedule Planner</h3>
                      <p className="text-xs text-muted-foreground">Setup registration pipelines, ticket integrations, speaker channels, and automated follow-up workflows.</p>
                      <button
                        onClick={() => triggerCreateSession('event')}
                        className="px-4 py-2.5 rounded-xl bg-indigo text-white font-bold text-xs hover:shadow"
                      >
                        Create New Event
                      </button>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-4">
                      <h3 className="font-bold text-lg">Access Pass & Invitations</h3>
                      <p className="text-xs text-muted-foreground">Review registered attendee analytics, generate invite credentials, or export RSVPs to your workspace.</p>
                      <button className="px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-foreground/5 font-bold text-xs">
                        Manage Registration
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MESSAGES HUB VIEW ─────────────────────────────────── */}
              {currentView === 'messages' && (
                <div className="space-y-8 max-w-4xl">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">Messages Hub</h1>
                    <p className="text-muted-foreground text-sm">Connect with team members or translation professionals securely.</p>
                  </div>

                  <div className="glass-card rounded-3xl border border-border/40 grid md:grid-cols-3 h-[680px] md:h-[500px] overflow-hidden">
                    {/* Channel lists */}
                    <div className="border-b md:border-b-0 md:border-r border-border/40 p-4 space-y-4 overflow-y-auto no-scrollbar h-[200px] md:h-full flex-shrink-0">
                      <input
                        type="text"
                        placeholder="Search chats..."
                        className="w-full h-10 px-3 bg-foreground/5 rounded-xl text-xs outline-none border border-transparent focus:bg-background focus:ring-1 focus:ring-indigo"
                      />
                      <div className="space-y-2">
                        {displayChats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => setSelectedChatId(chat.id)}
                            className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
                              chat.id === selectedChatId ? 'bg-indigo/10 text-indigo font-bold' : 'hover:bg-foreground/3 text-muted-foreground'
                            }`}
                          >
                            <div className="size-8 rounded-full bg-gradient-to-tr from-cyan to-indigo grid place-items-center text-white text-[10px] font-black">
                              {chat.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs text-foreground truncate">{chat.name}</h4>
                              <p className="text-[10px] text-muted-foreground truncate">{chat.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat Area */}
                    {activeChat ? (
                      <div className="md:col-span-2 flex flex-col justify-between p-4 md:p-6 overflow-hidden h-[480px] md:h-full">
                        <div className="flex justify-between items-center border-b border-border/40 pb-4">
                          <div>
                            <h3 className="font-bold text-base">{activeChat.name}</h3>
                            <p className="text-[10px] text-muted-foreground">{activeChat.role}</p>
                          </div>
                          <button
                            onClick={() => router.push('/create')}
                            className="px-3 py-1.5 rounded-lg bg-indigo text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Video className="size-3" />
                            Start Call
                          </button>
                        </div>

                        <div className="flex-1 py-4 space-y-3 overflow-y-auto no-scrollbar flex flex-col">
                          {(chatHistories[activeChat.id] || []).length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground text-xs gap-2 py-8">
                              <MessageSquare className="size-8 opacity-20 text-indigo" />
                              <span>No messages yet. Send a message to start the conversation!</span>
                            </div>
                          ) : (
                            (chatHistories[activeChat.id] || []).map((msg, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded-2xl max-w-xs md:max-w-sm ${
                                  msg.sender === 'me'
                                    ? 'bg-indigo text-white self-end ml-auto'
                                    : 'bg-foreground/5 text-foreground self-start mr-auto'
                                }`}
                              >
                                <p className="text-xs">{msg.text}</p>
                                <span className="text-[8px] opacity-60 block text-right mt-1">{msg.time}</span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendMessage();
                            }}
                            placeholder="Type your message..."
                            className="flex-1 px-4 py-3 bg-foreground/5 rounded-xl text-xs outline-none focus:bg-background focus:ring-1 focus:ring-indigo"
                          />
                          <button
                            onClick={handleSendMessage}
                            className="px-4 py-3 bg-indigo text-white font-bold text-xs rounded-xl cursor-pointer"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="md:col-span-2 flex flex-col items-center justify-center text-center text-muted-foreground p-8 gap-2">
                        <MessageSquare className="size-10 opacity-20 text-indigo" />
                        <span className="text-sm font-semibold">Select a chat to start messaging</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── AI WORKSPACE VIEW ────────────────────────────────── */}
              {currentView === 'ai-workspace' && (
                <div className="space-y-8 max-w-4xl">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">AI Intelligence Center</h1>
                    <p className="text-muted-foreground text-sm">Review action items, request summaries, or query meeting transcripts proactively.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Insights & Recommendations */}
                    <div className="space-y-6">
                      <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-4">
                        <div className="flex items-center gap-2">
                          <Shield className="size-4 text-indigo" />
                          <h4 className="font-bold text-xs uppercase tracking-wider text-indigo">Open Action Items</h4>
                        </div>
                        <ul className="space-y-2 text-xs">
                          <li className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-indigo" />
                            Review design contrast scales
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground line-through">
                            <span className="size-1.5 rounded-full bg-muted-foreground" />
                            Fix migration RLS (UUID mismatch)
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-indigo" />
                            Verify LiveKit key variables
                          </li>
                        </ul>
                      </div>

                      <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-cyan" />
                          <h4 className="font-bold text-xs uppercase tracking-wider text-cyan">Proactive Suggestions</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          "Based on the last team sync, I suggest scheduling a 15-minute verification call with Elena to approve the new layout."
                        </p>
                        <button className="text-xs font-bold text-indigo hover:underline">Draft invite →</button>
                      </div>
                    </div>

                    {/* Interactive AI Chat */}
                    <div className="md:col-span-2 glass-card rounded-2xl border border-border/40 flex flex-col h-[400px]">
                      <div className="p-4 border-b border-border/40 flex items-center gap-2">
                        <Cpu className="size-4 text-indigo" />
                        <span className="font-bold text-sm">Interactive Assistant</span>
                      </div>

                      <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
                        {aiChatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-2xl text-xs max-w-md ${
                              msg.sender === 'ai'
                                ? 'bg-foreground/5 text-foreground self-start mr-auto'
                                : 'bg-indigo text-white self-end ml-auto'
                            }`}
                          >
                            <p className="whitespace-pre-line">{msg.text}</p>
                          </div>
                        ))}
                        {isAiTyping && (
                          <div className="flex items-center gap-2 p-3 bg-foreground/5 rounded-2xl max-w-xs text-xs text-muted-foreground animate-pulse">
                            <Loader2 className="size-3.5 animate-spin" />
                            Synthesizing summary...
                          </div>
                        )}
                      </div>

                      {/* Chat Pre-prompts */}
                      <div className="p-2 border-t border-border/20 flex gap-2 flex-wrap">
                        {[
                          'Summarize last meeting',
                          'Show action items',
                          'Write follow-up email'
                        ].map((prompt, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setAiChatInput(prompt);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground text-[10px] font-bold"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>

                      <div className="p-4 border-t border-border/40 flex gap-2">
                        <input
                          type="text"
                          placeholder="Ask AI assistant..."
                          value={aiChatInput}
                          onChange={(e) => setAiChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendAiMessage();
                          }}
                          className="flex-1 px-3 py-2 bg-foreground/5 border border-transparent rounded-xl outline-none focus:bg-background focus:ring-1 focus:ring-indigo text-xs"
                        />
                        <button
                          onClick={handleSendAiMessage}
                          className="p-2 rounded-xl bg-indigo text-white hover:opacity-90"
                        >
                          <Send className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── RECORDINGS VIEW ──────────────────────────────────── */}
              {currentView === 'recordings' && (
                <div className="space-y-8 max-w-4xl">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">Recordings Vault</h1>
                    <p className="text-muted-foreground text-sm">Review high-resolution videos, transcript overlays, and AI follow-up records.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    {[
                      { title: 'Weekly Alignment Standup', date: 'Today, 10:30 AM', duration: '45 mins', size: '1.2 GB' },
                      { title: 'Accessibility Feature Demo', date: 'June 9, 2:00 PM', duration: '20 mins', size: '540 MB' }
                    ].map((rec, idx) => (
                      <div key={idx} className="glass-card p-5 rounded-2xl border border-border/40 hover:border-cyan/30 transition-all space-y-4">
                        <div className="aspect-video w-full rounded-xl bg-slate-900 flex items-center justify-center relative border border-white/5">
                          <Play className="size-8 text-white/50 hover:text-cyan transition-colors cursor-pointer" />
                          <span className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white">
                            {rec.duration}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-base">{rec.title}</h3>
                          <p className="text-xs text-muted-foreground">{rec.date} • {rec.size}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3.5 py-2 rounded-lg bg-indigo text-white font-bold text-xs">
                            Watch Playback
                          </button>
                          <button
                            onClick={() => setCurrentView('ai-workspace')}
                            className="px-3.5 py-2 rounded-lg border border-border text-foreground hover:bg-foreground/5 font-bold text-xs"
                          >
                            AI Transcript
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── NOTES VIEW ───────────────────────────────────────── */}
              {currentView === 'notes' && (
                <div className="space-y-8 max-w-4xl">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">Notes & Agendas</h1>
                    <p className="text-muted-foreground text-sm">Write real-time transcripts, compile action notes, or organize collaborative briefs.</p>
                  </div>

                  <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-6">
                    <div className="flex justify-between items-center border-b border-border/40 pb-4">
                      <input
                        type="text"
                        defaultValue="Deaf Mode Custom Scale Suggestions"
                        className="text-lg font-black bg-transparent border-0 outline-none text-foreground w-full"
                      />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap font-bold">Saved 2m ago</span>
                    </div>

                    <textarea
                      rows={10}
                      defaultValue={`### Talk2Me Design Brainstorming\n\n1. Contrast Enhancement: Ensure WCAG AAA compliance.\n2. Font Scale: We support 100%, 115%, and 130% scaling without clipping layout elements.\n3. Motion Controls: Toggle reduced-motion styles via state context.`}
                      className="w-full bg-transparent border-0 outline-none text-sm resize-none leading-relaxed text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              {/* ── ACCESSIBILITY CENTER (GLOBAL SETTINGS UPDATES) ────── */}
              {currentView === 'accessibility' && (
                <div className="space-y-8 max-w-3xl">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-cyan">Accessibility Center</h1>
                    <p className="text-muted-foreground text-sm">Customize visual scales, audio profiles, interpreter features, and cognitive aids globally.</p>
                  </div>

                  <div className="glass-card p-8 rounded-3xl border border-cyan/20 space-y-6">
                    <h3 className="font-bold text-lg border-b border-border/40 pb-4 flex items-center gap-2">
                      <Accessibility className="size-5 text-cyan" />
                      Visual & Input Adaptability
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="p-4 rounded-xl border border-border/40 bg-card/40 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-xs">Live Captions</h4>
                          <p className="text-[10px] text-muted-foreground">Generate real-time speech overlays</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={captionsEnabled}
                          onChange={(e) => setCaptionsEnabled(e.target.checked)}
                          className="size-5 accent-cyan cursor-pointer"
                        />
                      </div>

                      <div className="p-4 rounded-xl border border-border/40 bg-card/40 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-xs">High Contrast Mode</h4>
                          <p className="text-[10px] text-muted-foreground">Add extreme borders & brightness</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={highContrast}
                          onChange={(e) => setHighContrast(e.target.checked)}
                          className="size-5 accent-cyan cursor-pointer"
                        />
                      </div>

                      <div className="p-4 rounded-xl border border-border/40 bg-card/40 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-xs">Reduced Motion</h4>
                          <p className="text-[10px] text-muted-foreground">Override and stop visual shifts</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={reducedMotion}
                          onChange={(e) => setReducedMotion(e.target.checked)}
                          className="size-5 accent-cyan cursor-pointer"
                        />
                      </div>

                      <div className="p-4 rounded-xl border border-border/40 bg-card/40 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-xs">Sign Language Mode</h4>
                          <p className="text-[10px] text-muted-foreground">Prioritize visual interpreter overlays</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={signLanguageMode}
                          onChange={(e) => setSignLanguageMode(e.target.checked)}
                          className="size-5 accent-cyan cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Font Scale</h4>
                      <div className="flex gap-4">
                        {[
                          { scale: 100, label: 'Default (100%)' },
                          { scale: 115, label: 'Medium (115%)' },
                          { scale: 130, label: 'Large (130%)' }
                        ].map((item) => (
                          <button
                            key={item.scale}
                            onClick={() => setFontScale(item.scale as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              fontScale === item.scale
                                ? 'bg-cyan border-cyan text-slate-950 shadow-md'
                                : 'border-border/40 hover:bg-foreground/5'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ANALYTICS VIEW ───────────────────────────────────── */}
              {currentView === 'analytics' && (
                <div className="space-y-8 max-w-4xl">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">Analytics & Usage</h1>
                    <p className="text-muted-foreground text-sm">Track team interaction patterns, caption usage minutes, and translation outputs.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-4">
                      <h3 className="font-bold text-lg">Translation Volume</h3>
                      <p className="text-xs text-muted-foreground">English and Swahili remain the most translated tracks (cumulative 450 minutes this month).</p>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-4">
                      <h3 className="font-bold text-lg">Accessibility Performance</h3>
                      <p className="text-xs text-muted-foreground">Average caption rendering latency maintained below 150ms.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ORGANIZATIONS VIEW ───────────────────────────────── */}
              {currentView === 'organizations' && (
                <div className="space-y-8 max-w-4xl">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">Organizations</h1>
                    <p className="text-muted-foreground text-sm">Manage workspace access, invite colleagues, or view organization channels.</p>
                  </div>

                  <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-4">
                    <h3 className="font-bold text-lg">TechVerge Africa</h3>
                    <p className="text-xs text-muted-foreground">Active corporate workspace. Currently includes 14 team members.</p>
                    <button className="px-4 py-2 bg-indigo text-white font-bold text-xs rounded-xl">
                      Manage Workspace
                    </button>
                  </div>
                </div>
              )}

              {/* ── SETTINGS VIEW ────────────────────────────────────── */}
              {currentView === 'settings' && (
                <div className="space-y-8 max-w-3xl">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">System & Account Settings</h1>
                    <p className="text-muted-foreground text-sm">Configure authentication credentials, profile metadata, and accessibility preferences.</p>
                  </div>

                  {/* Profile Metadata Form */}
                  <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-6">
                    <h3 className="font-bold text-lg border-b border-border/40 pb-4">Profile Settings</h3>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const name = formData.get('fullName') as string;
                      try {
                        await updateProfile({ full_name: name });
                        alert('Profile updated successfully!');
                      } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : 'Failed to update profile.');
                      }
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Account Email</label>
                        <input
                          type="text"
                          disabled
                          defaultValue={user?.email || ''}
                          className="w-full h-12 px-4 rounded-xl bg-foreground/5 border-transparent text-sm font-semibold opacity-60 cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
                        <input
                          type="text"
                          name="fullName"
                          required
                          defaultValue={profile?.full_name || ''}
                          placeholder="Your full name"
                          className="w-full h-12 px-4 rounded-xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-indigo transition-all outline-none text-sm font-semibold"
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl bg-indigo text-white font-bold text-xs hover:opacity-90 transition-opacity"
                        >
                          Save Profile Changes
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Security & Password Update Form */}
                  <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-6">
                    <h3 className="font-bold text-lg border-b border-border/40 pb-4">Security & Password</h3>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const pass = formData.get('newPassword') as string;
                      const confirm = formData.get('confirmNewPassword') as string;
                      if (pass !== confirm) {
                        alert('Passwords do not match');
                        return;
                      }
                      if (pass.length < 6) {
                        alert('Password must be at least 6 characters');
                        return;
                      }
                      try {
                        await updatePassword(pass);
                        alert('Password updated successfully!');
                        e.currentTarget.reset();
                      } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : 'Failed to update password.');
                      }
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">New Password</label>
                        <input
                          type="password"
                          name="newPassword"
                          required
                          placeholder="••••••••"
                          className="w-full h-12 px-4 rounded-xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-indigo transition-all outline-none text-sm font-semibold"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Confirm New Password</label>
                        <input
                          type="password"
                          name="confirmNewPassword"
                          required
                          placeholder="••••••••"
                          className="w-full h-12 px-4 rounded-xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-indigo transition-all outline-none text-sm font-semibold"
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl bg-indigo text-white font-bold text-xs hover:opacity-90 transition-opacity"
                        >
                          Update Password
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── RIGHT DOCKABLE AI WORKSPACE PANEL ───────────────────────── */}
      <AnimatePresence>
        {aiSidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/15 backdrop-blur-xs z-30 pointer-events-auto"
              onClick={() => setAiSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[360px] bg-card/95 backdrop-blur-xl border-l border-border/40 z-40 flex flex-col shadow-2xl"
            >
              {/* AI Header */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-indigo animate-pulse-slow" />
                  <span className="font-bold text-sm tracking-tight">AI Workspace Assistant</span>
                </div>
                <button
                  onClick={() => setAiSidebarOpen(false)}
                  className="p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>

              {/* AI Assistant Chat Panel */}
              <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
                  {/* Insights Summary */}
                  <div className="p-3.5 rounded-2xl bg-indigo/5 border border-indigo/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo tracking-wider">
                      <Activity className="size-3.5" />
                      Live Insights
                    </div>
                    <ul className="space-y-1.5 text-[11px] font-medium leading-relaxed text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="size-1 rounded-full bg-indigo" />
                        Action: Push local RLS adjustments (Done)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="size-1 rounded-full bg-indigo" />
                        Verify LiveKit endpoints (Done)
                      </li>
                    </ul>
                  </div>

                  {/* Messages feed */}
                  <div className="space-y-3">
                    {aiChatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-2xl text-[11px] font-medium leading-relaxed ${
                          msg.sender === 'ai'
                            ? 'bg-foreground/5 text-foreground mr-8'
                            : 'bg-indigo text-white ml-8'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="flex items-center gap-2 p-3 bg-foreground/5 rounded-2xl max-w-xs text-[11px] text-muted-foreground animate-pulse">
                        <Loader2 className="size-3.5 animate-spin" />
                        AI is formulating insights...
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Send */}
                <div className="border-t border-border/40 pt-4 space-y-3">
                  {/* Pre-prompt Quick Tags */}
                  <div className="flex gap-2 flex-wrap">
                    {['Summarize', 'Action Items'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setAiChatInput(tag)}
                        className="px-2 py-0.5 rounded bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground text-[10px] font-bold"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask Talk2Me AI..."
                      value={aiChatInput}
                      onChange={(e) => setAiChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendAiMessage();
                      }}
                      className="flex-1 px-3 py-2 bg-foreground/5 border border-transparent rounded-xl outline-none focus:bg-background focus:ring-1 focus:ring-indigo text-xs font-semibold"
                    />
                    <button
                      onClick={handleSendAiMessage}
                      className="p-2 rounded-xl bg-indigo text-white hover:opacity-90"
                    >
                      <Send className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Dock toggle for AI Sidebar */}
      {!aiSidebarOpen && (
        <button
          onClick={() => setAiSidebarOpen(true)}
          className="fixed bottom-6 right-6 z-40 size-12 rounded-full bg-indigo text-white hover:scale-105 transition-all shadow-xl flex items-center justify-center border border-white/10"
          title="Open AI Companion"
        >
          <Sparkles className="size-5 animate-pulse" />
        </button>
      )}

      {/* ── GLOBAL MODALS ────────────────────────────────────────────── */}

      {/* 1. COMMAND PALETTE SEARCH MODAL */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setCommandPaletteOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl rounded-3xl border border-border/40 bg-card p-6 shadow-2xl z-50 space-y-4"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Type a query (e.g. 'Webinar', 'Sarah', 'RLS')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-xl bg-foreground/5 border-transparent focus:bg-background focus:ring-1 focus:ring-indigo outline-none text-sm font-semibold"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Search Results</div>
                <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                  {filteredSearchItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearchSelect(item)}
                      className="w-full text-left p-3 rounded-xl hover:bg-foreground/5 transition-all flex justify-between items-center group"
                    >
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo/10 text-indigo mr-2">
                          {item.type}
                        </span>
                        <span className="text-sm font-semibold text-foreground group-hover:text-indigo transition-colors">{item.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{item.code}</span>
                    </button>
                  ))}
                  {filteredSearchItems.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No results found matching your query.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 2. CREATE / LAUNCH SESSION MODAL */}
      <AnimatePresence>
        {createModalOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setCreateModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-3xl border border-border/40 bg-card p-8 shadow-2xl z-50 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-border/40 pb-4">
                <h3 className="text-xl font-black tracking-tight">
                  Launch {createModalType.charAt(0).toUpperCase() + createModalType.slice(1)}
                </h3>
                <span className="bg-cyan/15 text-cyan text-[10px] font-black uppercase px-2.5 py-1 rounded">Ready</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Session Name</label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-foreground/5 border border-transparent outline-none focus:bg-background focus:ring-1 focus:ring-indigo text-sm font-semibold"
                  />
                </div>

                {createModalType === 'stream' && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Category</label>
                      <input
                        type="text"
                        value={sessionCategory}
                        onChange={(e) => setSessionCategory(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-foreground/5 border border-transparent outline-none focus:bg-background focus:ring-1 focus:ring-indigo text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Privacy</label>
                      <select
                        value={sessionAudience}
                        onChange={(e) => setSessionAudience(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-foreground/5 border border-transparent outline-none focus:bg-background focus:ring-1 focus:ring-indigo text-sm font-semibold"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  </div>
                )}

                {createModalType === 'event' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Schedule Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-foreground/5 border border-transparent outline-none focus:bg-background focus:ring-1 focus:ring-indigo text-sm font-semibold text-foreground scheme-dark"
                    />
                  </div>
                )}

                {(createModalType === 'meeting' || createModalType === 'event') && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Room Moderation Controls</label>
                    
                    {/* Require Host Approval Toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-foreground/3 border border-border/40">
                      <div>
                        <p className="text-sm font-bold text-foreground">Require Host Approval</p>
                        <p className="text-[10px] text-muted-foreground">Guests wait in lobby until host admits them</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScheduledRequireApproval(!scheduledRequireApproval)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer ${
                          scheduledRequireApproval ? 'bg-indigo' : 'bg-foreground/10'
                        }`}
                      >
                        <motion.div 
                          layout 
                          className="size-4 rounded-full bg-white shadow-sm"
                          animate={{ x: scheduledRequireApproval ? 20 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    {/* Allow Guest Screen Share Toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-foreground/3 border border-border/40">
                      <div>
                        <p className="text-sm font-bold text-foreground">Allow Guest Screen Sharing</p>
                        <p className="text-[10px] text-muted-foreground">Permit non-host participants to share screen</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScheduledAllowScreenShare(!scheduledAllowScreenShare)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer ${
                          scheduledAllowScreenShare ? 'bg-indigo' : 'bg-foreground/10'
                        }`}
                      >
                        <motion.div 
                          layout 
                          className="size-4 rounded-full bg-white shadow-sm"
                          animate={{ x: scheduledAllowScreenShare ? 20 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl border border-border/40 bg-foreground/3 flex justify-between items-center gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Room Code</span>
                    <p className="text-lg font-black tracking-tight text-indigo">{generatedCode}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedCode)}
                    className="px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground text-xs font-bold rounded-lg flex items-center gap-1.5"
                  >
                    {copiedText === generatedCode ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    {copiedText === generatedCode ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 border-t border-border/40 pt-6">
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-3.5 border border-border rounded-xl font-bold text-sm text-foreground hover:bg-foreground/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLaunchSession}
                  disabled={isCreatingSession}
                  className="flex-1 py-3.5 bg-indigo text-white font-bold text-sm rounded-xl hover:shadow-lg hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreatingSession ? <Loader2 className="size-4 animate-spin" /> : (createModalType === 'event' ? 'Schedule Meeting' : 'Enter Session')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MOBILE MENU DRAWER OVERLAY ────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-card/95 backdrop-blur-xl border-r border-border/40 z-50 flex flex-col p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <Link href="/" className="flex items-center">
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
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-6" />
                </button>
              </div>

              {/* Navigation items */}
              <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentView === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => {
                        setCurrentView(item.view);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                        isActive
                          ? 'bg-indigo text-white font-bold'
                          : item.highlight
                          ? 'bg-cyan/10 text-cyan font-bold'
                          : 'text-muted-foreground hover:bg-foreground/5'
                      }`}
                    >
                      <Icon className="size-5" />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Footer */}
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all text-left font-semibold mt-4 border-t border-border/40 pt-4"
              >
                <LogOut className="size-5" />
                <span className="text-sm">Log Out</span>
              </button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── MOBILE BOTTOM NAVIGATION ──────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-card/90 backdrop-blur-xl border-t border-border/40 z-40 flex justify-around items-center px-2 pb-safe shadow-premium">
        {[
          { view: 'home', label: 'Home', icon: Home },
          { view: 'meetings', label: 'Meetings', icon: Video },
          { view: 'streams', label: 'Streams', icon: Radio },
          { view: 'ai-workspace', label: 'AI', icon: Cpu },
          { view: 'accessibility', label: 'A11y', icon: Accessibility }
        ].map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view as any)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all ${
                isActive ? 'text-indigo font-bold scale-105' : 'text-muted-foreground'
              }`}
            >
              <Icon className="size-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── SHARE SHEET MODAL ──────────────────────────────────────────── */}
      {/* Backdrop — rendered separately so it never overlaps the sheet's close button */}
      <AnimatePresence>
        {shareSheetMeeting && (
          <motion.div
            key="share-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={closeShareSheet}
          />
        )}
      </AnimatePresence>

      {/* Sheet — z-[61] ensures it always sits above the backdrop */}
      <AnimatePresence>
        {shareSheetMeeting && (
          <motion.div
            key={`share-sheet-${shareSheetMeeting.code}`}
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[61] w-full sm:max-w-md pointer-events-none"
          >
            {/* Outer shell — flex column, capped at 90dvh, restores pointer-events for the card itself */}
            <div className="bg-card rounded-t-3xl sm:rounded-2xl border border-border/40 shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden pointer-events-auto">

              {/* Drag handle — mobile only, always visible, not scrollable */}
              <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-border/60" />
              </div>

              {/* Header — always visible, never scrolls away */}
              <div className="px-5 pt-4 pb-4 border-b border-border/40 flex items-start justify-between gap-3 flex-shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="size-6 rounded-lg bg-indigo/10 grid place-items-center flex-shrink-0">
                      <Share2 className="size-3 text-indigo" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo">Share Meeting</span>
                  </div>
                  <h2 className="font-black text-base leading-tight truncate">{shareSheetMeeting.title}</h2>
                  {shareSheetMeeting.scheduled_at && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Clock className="size-3 flex-shrink-0" />
                      {new Date(shareSheetMeeting.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={closeShareSheet}
                  aria-label="Close share panel"
                  className="relative z-10 flex items-center justify-center size-8 rounded-xl bg-foreground/8 hover:bg-foreground/15 text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable body — flex-1 + min-h-0 are required for overflow-y-auto to activate inside a flex container */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">

                {/* QR Code — large enough to scan comfortably */}
                <div className="flex justify-center">
                  <div className="bg-white rounded-2xl p-3 shadow-inner border border-border/20">
                    <QrBlock value={roomShareUrl(shareSheetMeeting.code)} size={200} />
                  </div>
                </div>

                {/* Meeting Link */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Meeting Link</label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-foreground/5 border border-border/40">
                    <Globe className="size-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-xs font-mono truncate text-foreground/80 select-all min-w-0">
                      {roomShareUrl(shareSheetMeeting.code)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(roomShareUrl(shareSheetMeeting.code))}
                      className="flex-shrink-0 p-1.5 rounded-lg bg-foreground/5 hover:bg-indigo/10 hover:text-indigo text-muted-foreground transition-all"
                      title="Copy link"
                    >
                      {copiedText === roomShareUrl(shareSheetMeeting.code)
                        ? <Check className="size-3.5 text-emerald-500" />
                        : <Copy className="size-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Room Code */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Room Code</label>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo/5 border border-indigo/20">
                    <span className="flex-1 text-lg font-black font-mono tracking-widest text-indigo text-center">
                      {shareSheetMeeting.code}
                    </span>
                    <button
                      onClick={() => copyToClipboard(shareSheetMeeting.code)}
                      className="flex-shrink-0 p-1.5 rounded-lg bg-indigo/10 hover:bg-indigo/20 text-indigo transition-all"
                      title="Copy room code"
                    >
                      {copiedText === shareSheetMeeting.code
                        ? <Check className="size-3.5 text-emerald-500" />
                        : <Copy className="size-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={`grid gap-2.5 ${typeof navigator !== 'undefined' && !!navigator.share ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {typeof navigator !== 'undefined' && !!navigator.share && (
                    <button
                      onClick={() => {
                        navigator.share({
                          title: `Join "${shareSheetMeeting.title}" on Talk2Me`,
                          text: shareSheetMeeting.scheduled_at
                            ? `You're invited to "${shareSheetMeeting.title}" scheduled for ${new Date(shareSheetMeeting.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}. Room code: ${shareSheetMeeting.code}`
                            : `Join my Talk2Me meeting "${shareSheetMeeting.title}". Room code: ${shareSheetMeeting.code}`,
                          url: roomShareUrl(shareSheetMeeting.code),
                        }).catch(() => {});
                      }}
                      className="py-2.5 rounded-xl bg-gradient-to-r from-indigo to-cyan text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo/20 transition-all"
                    >
                      <Share2 className="size-4" />
                      Share via...
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(roomShareUrl(shareSheetMeeting.code))}
                    className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      copiedText === roomShareUrl(shareSheetMeeting.code)
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-foreground/[0.08] border border-border/40 hover:bg-foreground/[0.12] text-foreground'
                    }`}
                  >
                    {copiedText === roomShareUrl(shareSheetMeeting.code)
                      ? <><Check className="size-4" /> Copied!</>
                      : <><Copy className="size-4" /> Copy Link</>}
                  </button>
                </div>

                {/* Footer note */}
                <p className="text-center text-[11px] text-muted-foreground leading-relaxed pb-1">
                  Anyone with this link or code can join the meeting.
                  {shareSheetMeeting.scheduled_at && ' The room opens at the scheduled time.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
