# Talk2Me AI System Specification & Overview

## Platform Mission

Talk2Me AI is an inclusive communication platform designed to ensure that every participant can communicate effectively regardless of language, accent, hearing ability, speech capability, literacy level, device capability, or internet quality.

Instead of building another generic video conferencing app, Talk2Me AI focuses on solving real-world communication barriers while leveraging production-grade WebRTC Selective Forwarding Units (LiveKit SFU) and state-of-the-art multimodal AI engines (Google Gemini & Groq Whisper).

---

## Key Core Capabilities

### 1. Real-Time HD Meetings

- **Selective Forwarding Unit (LiveKit SFU)**: Multi-party video, high-fidelity audio, and screen sharing with sub-100ms transport latency.
- **Instant Room Creation & Joining**: One-click room creation with unique short codes and QR code joining for mobile convenience.
- **Participant & Host Controls**: Role-based permissions, mute controls, screen share toggles, and participant status monitoring.

### 2. Echo Engine & Speech Recognition

- **Multi-Engine STT Architecture**: Seamless integration of browser-native WebSpeech API (zero latency local captions), Groq API (`whisper-large-v3-turbo`), and Gemini 1.5 Flash Multimodal Audio transcription.
- **WASM Noise Suppression**: Real-time `@shiguredo/rnnoise-wasm` WebAudio worklet processing to remove heavy ambient noise (traffic, outdoor markets, generators) common in mobile environments.
- **Multi-Layer Hallucination Guard**: Custom filtering engine featuring Dice bigram similarity repetition detection, density impossibility checks, and artifact suppression.
- **Turn Reconciliation Engine**: Groups continuous spoken words within 5-second silence windows into cohesive canonical speaker turns persisted to Supabase.

### 3. African Languages & Context Switching

- **Dialect & Accent Inclusivity**: Tailored speech recognition and translation models for West African accents, Twi expressions, Ghanaian Pidgin, Ga, Ewe, Hausa, and Swahili.
- **Code-Switching Support**: Dynamically processes conversations where speakers alternate between native African languages and English within a single sentence, preserving conversational intent.

### 4. AI Meeting Assistant & Workspace Memory

- **Automated Meeting Intelligence**: Generates executive summaries, key decisions, sentiment metrics, and structured action items upon meeting conclusion via Gemini 2.5 Flash.
- **Workspace Conversational Memory**: Indexes historical meeting transcripts into Supabase with vector embeddings, allowing team members to query past meeting knowledge via the AI Assistant chat interface.

### 5. Universal Accessibility

- **Live Subtitles & Captions**: Real-time speaker identification, font sizing, and subtitle customization.
- **AI Sign Language Mode**: Visual Picture-in-Picture (PiP) and avatar sign language support.
- **Text-to-Speech (TTS)**: Spoken audio synthesis for non-vocal participants.
- **Low-Bandwidth Mode**: Audio-only and caption-first streaming options optimized for low-connectivity environments.

---

## API Endpoint Specification

### 1. Speech-to-Text (`POST /api/stt/transcribe`)

- **Request**: `multipart/form-data` containing an audio Blob (`audio/webm`), target language code, and sampling parameters.
- **Pipeline**: Passes audio through Groq Whisper large v3 turbo or Gemini 1.5 Flash. Applies anti-hallucination prompts and returns JSON transcript `{ text: string }`.

### 2. LiveKit SFU Token Generator (`POST /api/livekit`)

- **Request**: JSON containing `{ roomName: string, identity: string, name: string }`.
- **Output**: Returns signed LiveKit JWT access token with grant permissions for audio, video, and data channels.

### 3. AssemblyAI Realtime WebSocket (`POST /api/assemblyai/token`)

- **Output**: Issues temporary authentication tokens for browser-side WebSocket connections to AssemblyAI's streaming caption service.

### 4. AI Summary Generation (`POST /api/ai/summarize-meeting`)

- **Request**: JSON payload with `meetingId` and transcript array.
- **Output**: Returns structured JSON containing executive summary, decisions list, action items with assignees, and key takeaways.

### 5. Workspace Memory Chat (`POST /api/ai/chat`)

- **Request**: User query text and active `workspaceId`.
- **Output**: Queries Supabase historical vector transcripts and streams LLM response grounded in team meeting data.

---

## Database Entity Schema (Supabase PostgreSQL)

- `profiles`: User identity, display name, avatar URL, preferred language, and accessibility preferences.
- `meetings`: Meeting ID, room code, title, host user ID, scheduling metadata, settings (sign language enabled, caption language), and status (`active` | `ended`).
- `meeting_participants`: Maps users to meetings with join timestamps, role (`host` | `participant`), and audio/video state.
- `transcripts`: Canonical turn ID, meeting ID, speaker ID, speaker name, content text, start/end timestamps (ms), confidence score, language code, and word-level timing array.
- `messages`: Meeting chat messages attached to rooms and workspace channels.
- `notes`: Collaborative workspace notes and auto-saved meeting decisions.

---

## Engineering Rules & Quality Guidelines

1. **Accessibility is Core Infrastructure**: Every new UI component must satisfy WCAG 2.1 Level AAA guidelines, keyboard focus traps, and screen reader ARIA standards.
2. **SFU First**: Use managed LiveKit SFU infrastructure for media streams; do not build custom signaling transport.
3. **Resilience under Network Strain**: Prioritize audio quality and text captions over high-res video when throughput degrades.
4. **Data Sovereignty & RLS**: All database tables must enforce Supabase Row Level Security (RLS) policies to prevent unauthorized access to room transcripts.
