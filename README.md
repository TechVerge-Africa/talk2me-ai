# Talk2Me AI

> **Inclusive Real-Time WebRTC Collaboration Platform with Dialect-Resilient Multimodal AI**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.7-blue?style=flat-square&logo=react)](https://react.dev/)
[![LiveKit](https://img.shields.io/badge/LiveKit-SFU_WebRTC-00EDBE?style=flat-square&logo=webrtc)](https://livekit.io/)
[![Groq Whisper](https://img.shields.io/badge/Groq-Whisper_Large_v3_Turbo-F05023?style=flat-square)](https://groq.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_RLS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Accessibility](https://img.shields.io/badge/WCAG_2.1-AAA_Standard-green?style=flat-square)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange?style=flat-square)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Proprietary-purple?style=flat-square)]()

---

## 📖 Executive Summary & Mission

Communication is a fundamental human right. Yet modern video conferencing solutions fail millions of users across the globe due to rigid linguistic assumptions, high latency on mobile networks, and acoustic failure in noisy environments.

**Talk2Me AI** is an inclusive, real-time collaboration platform engineered to eliminate linguistic, physical, and technical barriers in global and regional collaboration. Engineered from the ground up for low latency, acoustic resilience, and dialect inclusivity, Talk2Me AI provides deep real-time support for **African languages and dialects** (Ghanaian Pidgin, Twi, Ga, Ewe, Hausa, Swahili) and accented speech alongside **spontaneous code-switching**.

By uniting production-grade **LiveKit SFU (Selective Forwarding Unit)** WebRTC media streaming with ultra-fast **Groq LPU speech inference**, client-side **WASM noise suppression**, and **Google Gemini multimodal intelligence**, Talk2Me AI ensures every participant can lead, present, and contribute with equal power.

---

## 🌟 Comprehensive Feature Catalog

### 1. Real-Time HD WebRTC Meetings (LiveKit SFU)
- **Selective Forwarding Unit (SFU)**: Sub-100ms transport latency for multi-party video, audio, and screen sharing without server-side re-encoding overhead.
- **Adaptive Bitrates**: Dynamic resolution scaling that preserves audio and caption streams during mobile network degradation.
- **Pre-Join Lobby**:
  - Live camera preview and microphone test.
  - Active audio level meters and AI noise reduction percentage readouts.
  - **Microphone Test Drive**: 5-second voice sample recording with instant playback toggle comparing raw vs. AI noise-filtered audio.
  - Device selection for cameras, microphones, and speakers.
  - Settings persisted to browser `localStorage` (`t2_pref_cam`, `t2_pref_mic`, `t2_pref_ai_noise`).
- **Flexible Room Types**:
  - **Instant One-Click Rooms**: Fast 6-character room codes with zero signup friction.
  - **Scheduled Meetings**: Future session scheduling with live countdown timers (`HH:MM:SS`) on the workspace dashboard.
  - **Ephemeral Rooms**: Zero-retention sessions where transcripts are discarded upon room teardown for complete privacy.
  - **Persistent Workspace Rooms**: Meetings attached directly to team workspaces with automatic conversational indexing.
- **Door Portal & Knocking Controls**: Host approval/denial portal (`MeetingDoorPortal`) preventing unauthorized room intrusion.
- **In-Meeting Controls & Views**:
  - Grid view with active speaker detection and high-contrast speaker borders.
  - High-fps screen sharing (`ScreenShareView`).
  - Participant management panel (`ParticipantsPanel`) with host controls (mute all, transfer host role, eject user).
  - One-click room link sharing with QR code modal (`QRBlock`) and mobile camera scanner (`QRScanner`).

### 2. Proprietary Echo Engine & Multi-Engine STT
- **Multi-Engine Speech Architecture**:
  - **Browser WebSpeech API**: Zero-latency local interim captions (sub-50ms) for instant visual feedback.
  - **Groq API (`whisper-large-v3-turbo`)**: Sub-50ms cloud transcription on dedicated LPUs for accented speech.
  - **Google Gemini 1.5 Flash Audio**: Direct multimodal audio analysis for complex code-switching detection.
  - **AssemblyAI Realtime Engine**: Streaming WebSocket token-by-token transcription with timing.
- **Client-Side WASM Noise Suppression (`@shiguredo/rnnoise-wasm`)**:
  - Integrated via `RNNoiseTrackProcessor` conforming to LiveKit's `TrackProcessor` interface.
  - Runs in a dedicated WebAudio AudioWorklet (`/worklets/rnnoise-worklet.js`).
  - Real-time suppression of street traffic, market noise, and diesel generators common in emerging market environments.
  - Exposes live metrics: VAD (voice activity detection), reduction ratio, raw RMS, and processed RMS.
- **PCM Resampling**: Client-side `pcm-resampler.ts` downsamples 48kHz streams to 16kHz 16-bit mono PCM for optimal model throughput.
- **Multi-Layer Hallucination Guard (`stt-hallucination-filter.ts`)**:
  - Blocklist of 70+ exact Whisper silent-audio artifacts (YouTube credit strings, subtitle tags).
  - Sub-string and regex filters for Whisper prompt-echo repetitions.
  - **Dice Bigram Similarity Detector**: Identifies and drops phrase repetition loops.
  - **Physical Word-Density Filter**: Rejects transcripts where word counts exceed physically speakable rates for the audio duration.
  - Minimum audio chunk byte gate (< 8KB dropped).
- **Canonical Transcript Engine (`transcript-engine.ts`)**:
  - Reconciles continuous spoken segments within 5-second silence windows into unified speaker turns.
  - Persists canonical speaker turns with word-level timing, speaker attribution, and confidence scores to Supabase PostgreSQL.

### 3. African Languages & Code-Switching Inclusivity
- **Dialect & Accent Inclusivity**: Specialized speech models and prompt conditioning for West African accents, Twi expressions, Ghanaian Pidgin, Ga, Ewe, Hausa, and Swahili.
- **Spontaneous Code-Switching**: Dynamically processes conversations where speakers fluidly switch between native African languages and English within a single spoken turn.
- **Regional Vocabulary Conditioning (`vocabulary.ts`)**:
  - Contextual vocabulary injection for names (Kwame, Ama, Kofi, Abena, Yaw, Esi, Mensa, Adwoa, Akua, Kwadwo, Afia, Fiifi).
  - Regional expressions (Chale, Kraa, Massa, Wey, Dey, Akwaaba, Eeeh, Charlay, Abi, Herh, Sankofa, Waakye, Kente, Trotro, MoMo).
  - Institutions & tech terms (UMAT, KNUST, UG, WebRTC, LiveKit, Supabase, Groq).
  - Cuts Word Error Rate (WER) from >40% to <12%.

### 4. Real-Time Action Item Detection & Meeting Intelligence
- **Heuristic Real-Time Action Detector (`ActionDetectorService`)**:
  - Continuously analyzes canonical transcript turns during live meetings.
  - Detects commitments ("I will handle...", "I'll take care of..."), assignments ("@name please review...", "name to prepare..."), and deadlines.
  - Parses relative due dates ("tomorrow", "today EOD", "by Friday", "next week") into ISO timestamps.
  - Fuzzy-matches spoken names against active room participants.
  - Triggers in-meeting `ActionConfirmationToast` for one-click assignment to workspace Kanban boards.
- **In-Meeting Work Board Panel (`MeetingWorkBoardPanel`)**:
  - Review, add, and organize workspace action items directly inside the meeting view without switching tabs.
- **Automated Post-Meeting Summaries (`/app/room/[code]/summary/page.tsx` & `/api/ai/summarize-meeting`)**:
  - Executive summary generation via Gemini 2.5 Flash.
  - Key decisions extraction with direct speaker quotes and millisecond timestamps.
  - Action items table with assignees, priority levels, and deadlines.
  - Topic tags and sentiment metrics.
  - Downloadable and shareable meeting summaries.
- **Transcript Analysis Service (`transcript-analysis.ts`)**:
  - Categorizes dialogue evidence into proposals, questions, suggestions, decisions, and action items with persistence to Supabase.

### 5. Multi-Tenant Workspace Hub (/dashboard)
- **Workspace Organization**:
  - Multi-workspace architecture with role-based permissions (owner, admin, member).
  - Dynamic invite links and access request approval workflows.
  - Local workspace switching with state persistence (`t2_active_workspace_v1`).
- **Dashboard Workspace Tabs**:
  1. **Home**: Workspace overview, upcoming meeting countdown timers, quick room launcher, active boards, and channel feed.
  2. **Meetings**: Live meetings, scheduled sessions, past session archive, transcript downloads, and AI summary access.
  3. **Boards**: Interactive Kanban Work Boards (`WorkspaceBoardView`) with customizable columns (`todo`, `in_progress`, `review`, `done`), priority indicators (`low`, `medium`, `high`, `urgent`), assignees, and real-time syncing.
  4. **Chat**: Multi-channel persistent team messaging (`#general`, custom channels) with `@user` mention autocomplete (`MentionAutocomplete`), emoji picker (`EmojiPicker`), and formatted chat items.
  5. **Zero-Overhead Voice Notes**:
     - 45-second audio recordings captured directly in the browser via `MediaRecorder` (Opus WebM).
     - Live waveform visualization during recording (`VoiceWaveVisualizer`).
     - Sub-100ms transcription via Groq Whisper (`/api/stt/transcribe`).
     - Text-only persistence in Supabase (<200 bytes per message) keeping database usage well within the 500MB free tier cap.
  6. **Interactive Visual Whiteboard (`WorkspaceWhiteboard`)**:
     - Infinite draggable canvas with pan and smooth zoom controls.
     - Sticky notes in 6 color themes (yellow, cyan, pink, green, orange, purple).
     - Categories: general, idea, decision, action, blocker.
     - Auto-grid alignment and layout tools.
     - **AI Note Clustering**: Automatically groups scattered notes into logical themes and action categories.
     - Real-time multi-user synchronization via Supabase Realtime broadcast channels.
  7. **Ask AI (Workspace Conversational Memory)**:
     - Chat with an AI assistant grounded in historical meeting transcripts and workspace discussions.
     - Automated memory extraction (`/api/ai/memory`) categorizing facts into decisions, specifications, facts, user preferences, action items, and summaries.
  8. **Settings**: Workspace metadata, branding, member invitations, access requests, and security policies.

### 6. Universal Accessibility & Inclusion
- **Live Subtitles & Captions**:
  - Floating in-meeting caption overlay (`RealTimeCaptionOverlay`).
  - Full transcript drawer with search and history (`CaptionList`).
- **AI Sign Language Interpreter (`AiSignerView`, `SignLanguagePip`)**:
  - Dedicated Picture-in-Picture (PiP) viewport prioritized for high frame rates (up to 60fps) to track hand gestures accurately.
  - Animated 3D AI Signer avatar with ambient wave pulse and live caption integration.
- **Text-to-Speech (TTS)**: Spoken audio synthesis allowing non-vocal participants to contribute spoken dialogue.
- **Low-Bandwidth Mode**: Audio-first and caption-first streaming options optimized for low-connectivity environments.
- **WCAG 2.1 Level AAA**: Keyboard navigation, screen reader ARIA live announcements, focus traps, and accessible color contrast.

### 7. Progressive Web App (PWA) & Mobile Ready
- **PWA Capabilities**: Service worker caching (`public/sw.js`), web app manifest (`manifest.ts`), and offline fallback support (`/offline`).
- **Install Prompt**: Contextual native installation banner (`usePwaInstall`, `InstallAppPrompt`).
- **Mobile Friendly**: Touch-optimized layouts, responsive drawer navigation, and camera-based QR code room joining (`html5-qrcode`).

### 8. Database Architecture & Automated Maintenance
- **PostgreSQL on Supabase**: Complete relational schema with strict Row Level Security (RLS) policies on every table.
- **Daily Automated Cleanup**: Vercel Cron-triggered midnight cleanup (`/api/cleanup`) running `cleanup_stale_meeting_data` RPC to purge temporary data, keeping database footprint comfortably below the 500MB free-tier limit.

---

## 🏗️ System Architecture

```
                                  TALK2ME AI ARCHITECTURE
                                  
  User Audio / Video Track                     
            │                                  
            ▼                                  
┌─────────────────────────┐                    
│ LiveKit SFU (WebRTC)    │ ───► Sub-100ms Low-Latency Video / Audio Routing
└─────────────────────────┘                    
            │                                  
            ▼ (Client-Side Audio Pipeline)     
┌─────────────────────────┐                    
│ WebAudio Worklet        │ ───► WASM RNNoise Ambient Noise Suppression
│ PCM Resampler           │ ───► 16kHz Mono 16-bit PCM Stream
└─────────────────────────┘                    
            │                                  
            ▼                                  
┌──────────────────────────────────────────────────────────────┐
│                    PROPRIETARY ECHO ENGINE                   │
│                                                              │
│  ┌──────────────────┐  ┌───────────────────┐  ┌───────────┐  │
│  │ WebSpeech API    │  │ Groq Whisper LPU  │  │ Gemini AF │  │
│  │ (Interim sub-50) │  │ (sub-50ms Cloud)  │  │ (Audio MM)│  │
│  └──────────────────┘  └───────────────────┘  └───────────┘  │
│                               │                              │
│                               ▼                              │
│         ┌──────────────────────────────────────────┐         │
│         │ STT Anti-Hallucination & Artifact Guard  │         │
│         │ • Dice Bigram Repetition Detector        │         │
│         │ • Physical Word/Duration Density Checks  │         │
│         │ • Regional Dialect Prompt Conditioning   │         │
│         └──────────────────────────────────────────┘         │
│                               │                              │
│                               ▼                              │
│         ┌──────────────────────────────────────────┐         │
│         │ Canonical Transcript Reconciliation      │         │
│         │ • Speaker turn grouping (< 5s window)    │         │
│         └──────────────────────────────────────────┘         │
└───────────────────────────────┬──────────────────────────────┘
                                │                              
                                ▼                              
┌──────────────────────────────────────────────────────────────┐
│                   SUPABASE POSTGRESQL LAYER                  │
│  • Profiles & Auth             • Realtime Meeting Channels   │
│  • Transcripts & Turns         • Vector Embeddings Memory    │
│  • Work Boards & Actions       • Row Level Security (RLS)    │
│  • Visual Whiteboard State     • Multi-Channel Chat Messages │
└───────────────────────────────┬──────────────────────────────┘
                                │                              
                                ▼                              
┌──────────────────────────────────────────────────────────────┐
│                 GEMINI 2.5 FLASH INTELLIGENCE                │
│  • Real-Time Action Item Detection & Due Date Parsing        │
│  • Executive Meeting Summaries & Decision Extraction         │
│  • Dialect Code-Switching Translation & Normalization        │
│  • Historical Workspace Conversational Memory Assistant      │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Codebase Directory Structure

```
talk2me-ai/
├── docs/                         # System documentation and roadmap
│   ├── Architecture.md           # Deep-dive system architecture
│   ├── PRODUCT_PRINCIPLES.md     # Core product and accessibility principles
│   ├── STRATEGY_SESSION.md       # Strategy, data flywheel, and business models
│   └── SYSTEM_OVERVIEW.md        # Technical specification overview
├── public/                       # Static public assets
│   ├── assets/                   # Brand icons, diagrams, illustrations
│   ├── pitch-deck.html           # 9-Slide interactive investor pitch deck
│   ├── sw.js                     # PWA Service Worker
│   └── worklets/                 # WebAudio worklet processors (rnnoise-worklet.js)
├── src/
│   ├── app/                      # Next.js 16 App Router pages & API routes
│   │   ├── api/                  # Serverless API Endpoints
│   │   │   ├── ai/               # AI routes (analyze, chat, memory, summarize)
│   │   │   ├── assemblyai/       # AssemblyAI WebSocket auth tokens
│   │   │   ├── cleanup/          # Daily Vercel Cron database cleanup route
│   │   │   ├── livekit/          # LiveKit SFU JWT token generation
│   │   │   └── stt/              # Groq & Gemini Speech-to-Text handler
│   │   ├── auth/                 # Authentication & password reset flows
│   │   ├── create/               # Instant room creation
│   │   ├── dashboard/            # Workspace hub (Home, Meetings, Boards, Chat, Whiteboard, AI)
│   │   ├── developers/           # Developer documentation and API guides
│   │   ├── join/                 # Room code entry & QR code scanner
│   │   ├── offline/              # PWA offline fallback page
│   │   ├── resources/            # Accessibility guidelines & whitepapers
│   │   └── room/[code]/          # Live WebRTC meeting room interface
│   │       └── summary/          # Post-meeting AI intelligence report
│   ├── components/               # UI components
│   │   ├── theme-provider.tsx    # Theme context provider
│   │   ├── theme-toggle.tsx      # Dark/light mode switch
│   │   ├── install-app-prompt.tsx# PWA installation banner
│   │   ├── pwa-register.tsx      # Service worker registration
│   │   └── ui/                   # Visual elements (voice wave, emoji picker, mentions)
│   ├── features/                 # Modular domain features
│   │   ├── accessibility/        # AI Sign-to-Speech & high-contrast modes
│   │   ├── auth/                 # useAuth hook & Supabase session management
│   │   ├── captions/             # Real-time caption list & overlay views
│   │   ├── chat/                 # Meeting chat & voice note recording
│   │   ├── meetings/             # Room logic, WebRTC state & LiveKit hooks
│   │   │   ├── hooks/            # useMeeting hook
│   │   │   └── room/             # Controls, grid, lobby, portal, work board panel
│   │   ├── transcript/           # STT turn engine, canonical view, decisions
│   │   ├── whiteboard/           # Collaborative meeting whiteboard
│   │   └── work-boards/          # Action items & workspace Kanban boards
│   ├── hooks/                    # Reusable React hooks (usePwaInstall, useWebSpeechSTT)
│   ├── lib/                      # Core utility libraries
│   │   ├── audio/                # RNNoise WASM, PCM resampler, STT hallucination filters
│   │   ├── transcript/           # Ghanaian & domain vocabulary dictionary
│   │   ├── rate-limiter.ts       # In-memory sliding window rate limiter
│   │   └── realtime-manager.ts   # WebSocket & Supabase subscription manager
│   ├── packages/                 # Shared UI & utility packages
│   │   ├── shared/               # Room code generators & URL helpers
│   │   └── ui/                   # QR code display, QR scanner, AI visual effects
│   ├── services/                 # Backend integrations & data access layer
│   │   ├── ai/                   # Gemini client, action detector & memory extraction
│   │   ├── livekit/              # LiveKit SFU token generation & admin
│   │   └── supabase/             # PostgreSQL clients & service layer
│   └── types/                    # TypeScript interfaces & domain models
├── supabase/                     # Supabase migrations & configuration
│   ├── migrations/               # SQL schema migrations with RLS policies
│   └── config.toml               # Local Supabase configuration
└── package.json                  # Dependencies and build scripts
```

---

## 🔌 API Endpoint Specifications

| Method | Endpoint | Description | Request Payload | Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/stt/transcribe` | Transcribes audio via Groq Whisper or Gemini | `multipart/form-data` (`audio/webm`, `language`, `prompt`) | `{ text: string, duration?: number }` |
| `POST` | `/api/livekit/token` | Generates LiveKit SFU JWT room access token | `{ roomName, identity, name }` | `{ token: string }` |
| `POST` | `/api/assemblyai/token` | Generates temporary token for AssemblyAI WS | None | `{ token: string }` |
| `POST` | `/api/ai/analyze-transcript`| Extracts decisions, action items, and quotes | `{ meetingId, canonicalTranscripts }` | `{ decisions: ExtractedDecisionItem[] }` |
| `POST` | `/api/ai/summarize-meeting` | Generates executive meeting summary & actions| `{ meetingId, transcripts }` | `{ summary, decisions, actionItems }` |
| `POST` | `/api/ai/chat` | Queries workspace historical meeting memory | `{ message, workspaceId }` | Streamed text response |
| `GET` | `/api/ai/memory` | Retrieves or searches workspace memory items | `?workspace_id=...&q=...` | `{ memories: DbWorkspaceMemory[] }` |
| `POST` | `/api/ai/memory` | Extracts or creates long-term workspace memory | `{ action: "extract", text, workspace_id }` | `{ success: true, count: number }` |
| `POST` | `/api/cleanup` | Daily Vercel Cron purging stale meeting data | Protected by `CRON_SECRET` | `{ success: true, timestamp: string }` |

---

## 🗄️ Database Entity Schema (Supabase PostgreSQL)

- **`profiles`**: User identity, display name, avatar URL, preferred language, and accessibility preferences.
- **`meetings`**: Meeting ID, unique 6-character room codes, title, host ID, scheduling metadata, room settings, and lifecycle state (`active` | `ended`).
- **`meeting_participants`**: Maps users to meetings with join timestamps, role (`host` | `participant`), and media states.
- **`transcripts`**: Canonical speaker turns, meeting ID, speaker ID, speaker name, content text, start/end timestamps (ms), confidence score, language code, and word-level timings.
- **`meeting_decisions`**: Structured decisions, questions, proposals, and action items extracted from meeting transcripts with direct evidence quotes and timestamps.
- **`workspaces`**: Collaborative team workspaces with unique slugs, icons, and ownership metadata.
- **`workspace_members`**: Membership mapping with role-based access control (`owner` | `admin` | `member`).
- **`workspace_channels`**: Named communication channels within workspaces (e.g., `#general`, `#engineering`).
- **`workspace_messages`**: Persistent channel chat messages with user mentions and voice notes.
- **`workspace_boards`**: Kanban task boards linked to workspaces and channels.
- **`board_action_items`**: Tasks with statuses (`todo`, `in_progress`, `review`, `done`), priorities (`low`, `medium`, `high`, `urgent`), assignees, and due dates.
- **`workspace_sticky_notes`**: Visual whiteboard notes with positions, colors, categories, and clustering data.
- **`workspace_memories`**: Long-term indexed facts, specs, decisions, user preferences, and summaries for AI conversational retrieval.
- **`workspace_access_requests`**: Join requests and approval states for team workspaces.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm` (`v11.x`)
- **LiveKit Cloud**: Project URL, API Key, and API Secret
- **Supabase**: Project URL, Anon Key, and Service Role Key
- **Google AI Studio**: Gemini API Key
- **Groq Console**: Groq API Key

### 1. Clone the Repository

```bash
git clone https://github.com/TechVerge-Africa/talk2me-ai.git
cd talk2me-ai
```

### 2. Configure Environment Variables

Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

Populate the required environment variables:

```ini
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LiveKit SFU
LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# AI Models
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key

# Cron & Security
CRON_SECRET=your_cron_secret
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛡️ Engineering & Security Standards

1. **Accessibility is Core Infrastructure**: Every UI component satisfies **WCAG 2.1 Level AAA** standards, including complete keyboard navigation, ARIA live regions, and color contrast compliance.
2. **SFU First Architecture**: Real-time media streaming is handled strictly via managed LiveKit SFU nodes for deterministic latency.
3. **Data Sovereignty & RLS**: All Supabase database tables enforce strict **Row Level Security (RLS)** policies. Meeting transcripts and messages are strictly isolated to authorized participants.
4. **Resilience Under Network Strain**: Audio streams and live text captions take priority over video bandwidth when mobile networks degrade.
5. **Zero Secret Leakage**: API secrets are strictly restricted to serverless API routes (`server-only`) and never exposed in client bundles.
6. **Storage Efficiency**: Zero-overhead voice note capture and scheduled daily cleanups maintain the database footprint well under the 500MB free-tier threshold.

---

## 🗺️ Roadmap & Research Strategy

- **Phase 1 (Current)**: Multi-engine STT with Groq Whisper large v3 turbo and Gemini 1.5 Flash Audio for sub-50ms live captioning and African dialect glossary conditioning.
- **Phase 2 (Data Flywheel)**: Opt-in community contribution pipeline collecting anonymized real-world African code-switching audio paired with Gemini pseudo-labels.
- **Phase 3 (Proprietary Moat)**: Fine-tuned open-source Whisper models trained with QLoRA/PEFT on dedicated GPU infrastructure (Modal/RunPod) and deployed with `faster-whisper` (CTranslate2) for 4x inference speed and self-hosted privacy.

---

## 📄 License & Intellectual Property

Talk2Me AI is proprietary software developed by **TechVerge Africa**. All rights reserved.
