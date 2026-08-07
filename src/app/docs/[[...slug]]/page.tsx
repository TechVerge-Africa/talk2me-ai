'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  BookOpen, 
  Menu, 
  X, 
  ChevronRight, 
  Terminal, 
  Radio, 
  ShieldCheck, 
  Code
} from 'lucide-react';
import { GradientBackground } from '@/components/ui/gradient-background';

type DocSection = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: {
    slug: string;
    title: string;
    description: string;
  }[];
};

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    items: [
      { slug: '', title: 'Introduction', description: 'Welcome to the Talk2Me AI platform and accessibility guide.' },
      { slug: 'installation', title: 'PWA Installation', description: 'Install Talk2Me as a desktop or mobile application for offline support.' },
      { slug: 'lobby-setup', title: 'Lobby & Settings', description: 'Configure your mic, camera, and captions settings before joining.' }
    ]
  },
  {
    id: 'features',
    title: 'Platform Features',
    icon: ShieldCheck,
    items: [
      { slug: 'broadcast', title: 'Live Broadcasting', description: 'Host public streams and broadcast to unlimited web viewers.' },
      { slug: 'shortcuts', title: 'Keyboard Shortcuts', description: 'Navigate and toggle controls instantly using accessibility hotkeys.' },
      { slug: 'accessibility', title: 'Deaf & Hard of Hearing Mode', description: 'Explore visual audio-indicator lights and deaf-centric layouts.' }
    ]
  },
  {
    id: 'integration',
    title: 'API & Developer',
    icon: Code,
    items: [
      { slug: 'react-sdk', title: 'React SDK Integration', description: 'Embed pre-styled video and audio components in React apps.' },
      { slug: 'authentication', title: 'API Credentials', description: 'Authenticate your backend and sign session tokens.' },
      { slug: 'webhooks', title: 'Webhooks Reference', description: 'Handle server callbacks for finished meetings and transcriptions.' }
    ]
  }
];

const DOC_CONTENTS: Record<string, React.ReactNode> = {
  '': (
    <div className="space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-foreground">Welcome to Talk2Me Docs</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Talk2Me is a secure, high-performance real-time video and audio communication platform. It is engineered to power virtual classrooms, medical consultations, corporate workspaces, live streams, and highly accessible e-learning portals. 
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Talk2Me incorporates proprietary AI translation and real-time captioning in 80+ languages, enabling participants globally to collaborate without language or accessibility barriers.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
        <Link href="/docs/react-sdk" className="p-6 rounded-2xl border border-border bg-card/30 hover:bg-card hover:border-cyan/30 transition-all group">
          <Code className="size-8 text-indigo dark:text-cyan mb-4" />
          <h3 className="font-bold text-lg text-foreground mb-1 group-hover:text-indigo dark:group-hover:text-cyan transition-colors">React SDK</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">Embed responsive video rooms in your web pages using just 3 lines of React code.</p>
        </Link>

        <Link href="/docs/broadcast" className="p-6 rounded-2xl border border-border bg-card/30 hover:bg-card hover:border-cyan/30 transition-all group">
          <Radio className="size-8 text-indigo dark:text-cyan mb-4" />
          <h3 className="font-bold text-lg text-foreground mb-1 group-hover:text-indigo dark:group-hover:text-cyan transition-colors">Live Streaming</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">Publish real-time video broadcasts with dynamic AI-translated captions overlay templates.</p>
        </Link>
      </div>
    </div>
  ),
  'installation': (
    <div className="space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-foreground">PWA Installation Guide</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Talk2Me includes native Progressive Web App (PWA) support. Installing the app provides zero-latency launch speeds, desktop notification permissions, and standalone window frames.
      </p>
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-bold">Desktop Installation</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Open Talk2Me in Google Chrome or Microsoft Edge. Look for the <strong className="text-foreground">Install app</strong> icon in the address bar (right-hand side). Click install to add Talk2Me to your desktop shortcuts.
        </p>
        
        <h3 className="text-xl font-bold">Mobile Installation</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          On iOS Safari, tap the share icon and select <strong className="text-foreground">Add to Home Screen</strong>. On Android Chrome, tap the menu dots and click <strong className="text-foreground">Install App</strong>.
        </p>
      </div>
    </div>
  ),
  'lobby-setup': (
    <div className="space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-foreground">Lobby & Device Calibration</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Before entering a live room, participants are placed in a calibration lobby. Use this space to ensure high-fidelity media inputs.
      </p>
      <ul className="space-y-4 list-disc pl-5 text-sm text-muted-foreground leading-relaxed">
        <li><strong className="text-foreground">Audio Input</strong>: Calibrate background noise cancellation filters. Recommended noise thresholds should be kept under -45dB.</li>
        <li><strong className="text-foreground">Camera Quality</strong>: For sign language recognition, position the camera to keep both hands and face fully in the frame.</li>
        <li><strong className="text-foreground">Caption Language</strong>: Choose your default target language for incoming translations.</li>
      </ul>
    </div>
  ),
  'broadcast': (
    <div className="space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-foreground">Live Broadcasting Mode</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Broadcasting mode allows host networks to stream video feeds with ultra-low latency delivery.
      </p>
      <div className="p-5 rounded-2xl bg-slate-900 border border-indigo/25 text-white/90 space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Terminal className="size-5 text-cyan" />
          Stream Pipeline Configuration
        </h3>
        <p className="text-xs text-white/70 leading-relaxed font-mono">
          Push streams to: rtmp://live.talk2me.ai/app/STREAM_KEY
        </p>
        <p className="text-xs text-white/70 leading-relaxed">
          Enable real-time AI overlay captions by subscribing to the Talk2Me Data Channels during the active session.
        </p>
      </div>
    </div>
  ),
  'shortcuts': (
    <div className="space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-foreground">Accessibility Keyboard Shortcuts</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Talk2Me features strict keyboard-first navigation mappings (WCAG 3.0 AAA standard). Use the following hotkeys inside active meeting rooms:
      </p>
      
      <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-foreground/5 font-bold border-b border-border/50">
            <tr>
              <th className="p-4">Action</th>
              <th className="p-4">Shortcut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-muted-foreground">
            <tr>
              <td className="p-4 font-bold text-foreground">Mute / Unmute Microphone</td>
              <td className="p-4 font-mono"><kbd className="px-2 py-1 bg-foreground/10 border rounded text-xs">M</kbd></td>
            </tr>
            <tr>
              <td className="p-4 font-bold text-foreground">Toggle Video Feed</td>
              <td className="p-4 font-mono"><kbd className="px-2 py-1 bg-foreground/10 border rounded text-xs">V</kbd></td>
            </tr>
            <tr>
              <td className="p-4 font-bold text-foreground">Toggle Captions Panel</td>
              <td className="p-4 font-mono"><kbd className="px-2 py-1 bg-foreground/10 border rounded text-xs">C</kbd></td>
            </tr>
            <tr>
              <td className="p-4 font-bold text-foreground">Deaf Mode (Visual Indicators)</td>
              <td className="p-4 font-mono"><kbd className="px-2 py-1 bg-foreground/10 border rounded text-xs">D</kbd></td>
            </tr>
            <tr>
              <td className="p-4 font-bold text-foreground">Raise / Lower Hand</td>
              <td className="p-4 font-mono"><kbd className="px-2 py-1 bg-foreground/10 border rounded text-xs">H</kbd></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ),
  'accessibility': (
    <div className="space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-foreground">Deaf & Hard of Hearing Settings</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Talk2Me incorporates specialized audio visualizers and sign-interpreter grids.
      </p>
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          <strong className="text-foreground">Visual Audio Rings</strong>: When the micro-pulsing speaker rings are toggled, sound input from participants is visualized as soft waves around their avatar, allowing non-hearing users to track active speakers.
        </p>
        <p>
          <strong className="text-foreground">Interpreter Auto-Pinning</strong>: Designate a participant as an interpreter to lock their video feed layout in high resolution regardless of who is speaking.
        </p>
      </div>
    </div>
  ),
  'react-sdk': (
    <div className="space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-foreground">React SDK Integration</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Talk2Me offers a high-level React SDK with pre-styled, responsive, accessibility-compliant components.
      </p>
      
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Installation</h3>
        <div className="p-4 rounded-xl bg-slate-900 border border-white/5 font-mono text-xs text-white/80">
          npm install @talk2me/react-sdk
        </div>

        <h3 className="text-xl font-bold">Usage</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Wrap your app in the <strong className="text-foreground">Talk2MeProvider</strong> and render the <strong className="text-foreground">VideoRoom</strong> component. Provide a valid session token generated from your backend:
        </p>

        <div className="p-5 rounded-2xl bg-slate-900 border border-white/5 font-mono text-xs text-white/80 space-y-2">
          <pre>{`import { Talk2MeProvider, VideoRoom } from '@talk2me/react-sdk';

function App() {
  return (
    <Talk2MeProvider token="YOUR_GENERATED_SESSION_TOKEN">
      <VideoRoom 
        layout="grid" // 'grid' | 'educational' | 'broadcast'
        theme="dark"
        features={{
          realtimeCaptions: true,
          liveTranslation: true,
          interpreterPinning: true
        }}
      />
    </Talk2MeProvider>
  );
}`}</pre>
        </div>
      </div>
    </div>
  ),
  'authentication': (
    <div className="space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-foreground">API Credentials & JWT Signatures</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        To allow clients to securely connect to video rooms, you must generate a secure JSON Web Token (JWT) session token using your server credentials.
      </p>
      <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 font-mono text-xs text-white/80 space-y-2">
        <p className="text-cyan">Example JSON payload sent to room token generator:</p>
        <pre>{`{
  "apiKey": "t2_api_key_sample",
  "roomName": "custom-room-code",
  "participant": {
    "identity": "user_id_hash",
    "name": "Sulley Latif"
  }
}`}</pre>
      </div>
    </div>
  ),
  'webhooks': (
    <div className="space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-foreground">Webhooks Reference</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Configure callback URLs in your developer panel to receive real-time updates.
      </p>
      <div className="space-y-4">
        {[
          { event: 'session.started', desc: 'Fires when the first participant enters the active meeting room.' },
          { event: 'session.ended', desc: 'Fires after all participants leave the room and session resources are cleaned.' },
          { event: 'transcript.completed', desc: 'Dispatched when the meeting transcript is fully compiled.' }
        ].map(hook => (
          <div key={hook.event} className="p-4 border rounded-xl bg-card/20 border-border/40">
            <span className="font-mono text-xs font-bold text-indigo dark:text-cyan bg-indigo/10 px-2 py-0.5 rounded">{hook.event}</span>
            <p className="text-xs text-muted-foreground mt-2">{hook.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
};

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default function DocsPage({ params }: PageProps) {
  const unwrappedParams = React.use(params);
  const slugArray = unwrappedParams?.slug || [];
  const currentSlug = slugArray[0] || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter doc items based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return DOC_SECTIONS;
    const lowerQuery = searchQuery.toLowerCase();
    
    return DOC_SECTIONS.map(sec => {
      const matchingItems = sec.items.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) || 
        item.description.toLowerCase().includes(lowerQuery)
      );
      return { ...sec, items: matchingItems };
    }).filter(sec => sec.items.length > 0);
  }, [searchQuery]);

  const activeContent = DOC_CONTENTS[currentSlug] || (
    <div className="space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-foreground">Page Not Found</h1>
      <p className="text-muted-foreground">The requested documentation page could not be located.</p>
      <Link href="/docs" className="text-indigo dark:text-cyan hover:underline text-sm font-bold">
        Return to Introduction
      </Link>
    </div>
  );

  return (
    <main className="min-h-screen w-full relative pt-[72px] flex">
      <GradientBackground />

      {/* Mobile Sidebar Toggle Button */}
      <button 
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-6 right-6 z-40 lg:hidden size-14 rounded-full bg-indigo text-white shadow-2xl grid place-items-center cursor-pointer border border-white/10 hover:scale-105 active:scale-95 transition-all"
      >
        <Menu className="size-6" />
      </button>

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[80vw] max-w-[320px] bg-background border-r border-border/50 flex flex-col p-6 lg:hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-black tracking-tight text-foreground flex items-center gap-2">
                  <BookOpen className="size-5 text-indigo" />
                  Documentation
                </span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-foreground/5">
                  <X className="size-5" />
                </button>
              </div>
              <SidebarContent 
                sections={filteredSections} 
                currentSlug={currentSlug} 
                onLinkClick={() => setSidebarOpen(false)} 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Persistent) */}
      <aside className="hidden lg:flex flex-col w-[300px] border-r border-border/50 p-8 shrink-0 select-none bg-background/30 backdrop-blur-md sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto">
        <SidebarContent 
          sections={filteredSections} 
          currentSlug={currentSlug} 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </aside>

      {/* Main Content Area */}
      <article className="flex-1 px-6 py-12 md:p-16 lg:p-20 max-w-4xl mx-auto overflow-y-auto">
        <motion.div
          key={currentSlug}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeContent}
        </motion.div>
      </article>
    </main>
  );
}

type SidebarProps = {
  sections: DocSection[];
  currentSlug: string;
  onLinkClick?: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

function SidebarContent({ sections, currentSlug, onLinkClick, searchQuery, setSearchQuery }: SidebarProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground opacity-60" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search docs..."
          className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl border border-border bg-card/30 focus:bg-card focus:outline-none focus:ring-1 focus:ring-cyan text-foreground placeholder:text-muted-foreground/60 transition-all"
        />
      </div>

      {/* Sections and items */}
      <div className="space-y-6">
        {sections.map(sec => (
          <div key={sec.id} className="space-y-2.5">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/70 px-2">
              <sec.icon className="size-3.5 text-indigo dark:text-cyan" />
              {sec.title}
            </span>
            <div className="flex flex-col gap-1 border-l border-border/50 pl-3.5 ml-2.5">
              {sec.items.map(item => {
                const isActive = currentSlug === item.slug;
                return (
                  <Link
                    key={item.slug}
                    href={`/docs/${item.slug}`}
                    onClick={onLinkClick}
                    className={`group flex items-center justify-between py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                      isActive 
                        ? 'text-indigo dark:text-cyan font-bold' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{item.title}</span>
                    <ChevronRight className={`size-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ${isActive ? 'opacity-100 text-indigo dark:text-cyan' : ''}`} />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
