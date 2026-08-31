# Talk2Me AI System Architecture

Talk2Me AI is an inclusive, real-time communication platform engineered to eliminate linguistic, physical, and technical barriers in global and regional collaboration. The architecture is designed for low latency, high availability, acoustic resilience in low-resource mobile environments, and deep support for African languages (Twi, Ghanaian Pidgin, Hausa, Swahili) and accented speech.

---

## 1. Application Structure

The codebase is organized as a modular Next.js App Router application with feature-based domain separation:

```
talk2me-ai/
├── src/
│   ├── app/                      # Next.js 16 App Router pages & API routes
│   │   ├── api/                  # Serverless API Endpoints (STT, LiveKit, Gemini, AssemblyAI)
│   │   ├── room/[code]/          # Live WebRTC Meeting Room interface
│   │   ├── dashboard/            # Meeting workspace, history & context search
│   │   └── auth/                 # Authentication flows
│   ├── features/                 # Modular application features
│   │   ├── accessibility/        # AI Sign-to-Speech & visual accessibility controls
│   │   ├── ai-assistant/         # Live meeting assistant & workspace context chat
│   │   ├── captions/             # Real-time caption list & subtitle rendering
│   │   ├── chat/                 # Meeting chat & persistent messaging
│   │   ├── meetings/             # Room logic, WebRTC state, LiveKit hook integration
│   │   ├── transcript/           # AssemblyAI realtime WS, transcript turn engine
│   │   └── whiteboard/           # Collaborative meeting canvas
│   ├── services/                 # Backend integrations & data access layer
│   │   ├── ai/                   # Gemini LLM client, transcript analysis & memory index
│   │   ├── livekit/              # SFU token generation & room administration
│   │   └── supabase/             # PostgreSQL clients, Auth & RLS data access
│   ├── lib/                      # Shared utility core
│   │   ├── audio/                # RNNoise WASM, PCM resampler, STT hallucination filters
│   │   ├── nlp/                  # Dialect & regional language helper utilities
│   │   └── realtime-manager.ts   # WebSocket & Supabase realtime subscription manager
│   ├── hooks/                    # Reusable React hooks (useWebSpeechSTT, useAuth, etc.)
│   └── components/               # Design system & reusable glassmorphic UI components
├── public/
│   └── worklets/                 # WebAudio worklet processors (rnnoise.js WASM)
├── supabase/                     # Database migrations, RLS policies & configuration
└── docs/                         # Technical system documentation
```

---

## 2. Real-Time Media Architecture (LiveKit SFU)

To handle real-time multi-party video, high-frequency audio, and screen sharing across variable network conditions, Talk2Me AI employs **LiveKit SFU (Selective Forwarding Unit)**.

- **Selective Forwarding**: Media streams are forwarded without expensive server-side re-encoding, preserving sub-100ms media transport latency globally.
- **Sign Language Stream Optimization**: Video tracks assigned to sign language streams are prioritized for higher frame rates (up to 60fps) to capture rapid hand gestures accurately.
- **Network Resilience**: Adaptive bitrates automatically adjust video resolution when network throughput degrades, ensuring audio and real-time caption streams remain uninterrupted.

---

## 3. Client-Side Audio Pre-Processing (WASM Noise Filtering)

Before audio feeds are sent to Speech-to-Text (STT) inference engines, raw microphone input passes through a client-side WebAudio processing pipeline:

1. **WASM RNNoise Processing**: `@shiguredo/rnnoise-wasm` runs in a dedicated AudioWorklet (`public/worklets/rnnoise.js`), stripping ambient background noise (generators, street traffic, market noise) common in low-resource mobile environments.
2. **PCM Resampling**: `pcm-resampler.ts` downsamples 48kHz audio streams to 16kHz 16-bit mono PCM, optimizing bandwidth and matching speech model input specifications.

---

## 4. Proprietary Echo Engine & Speech-to-Text (STT) Pipeline

The **Echo Engine** coordinates multi-engine speech recognition, hallucination defense, and conversational turn reconciliation:

```
Microphone Audio Track
        │
        ▼
[AudioWorklet: WASM RNNoise Filter]
        │
        ▼
[PCM Resampler (16kHz Mono)]
        │
  ┌─────┴─────────────────────────────┐
  ▼                                   ▼
[WebSpeech API]            [Multi-Engine Router]
(Native browser,            ├─ Groq (Whisper-large-v3-turbo)
 sub-50ms captions)         ├─ Google Gemini 1.5 Flash Audio
                            └─ AssemblyAI Realtime WebSocket
                                      │
                                      ▼
                      [STT Anti-Hallucination Guard]
                      ├─ Known artifact blocklist
                      ├─ Dice bigram repetition loop detector
                      └─ Physical word/duration density check
                                      │
                                      ▼
                      [Canonical Transcript Engine]
                      ├─ Turn grouping (< 5s gap)
                      └─ Supabase PostgreSQL Persistence
```

### Multi-Engine Router & Fallback Strategy

- **Browser WebSpeech API**: Provides immediate zero-latency local interim captions in supported browsers.
- **Groq API (`whisper-large-v3-turbo`)**: Ultra-fast cloud STT for high-accuracy multilingual transcription and accented speech recognition.
- **Google Gemini 1.5 Flash**: Processes raw multimodal audio blobs directly for context-rich transcription and code-switching detection.
- **AssemblyAI Realtime Engine**: Provides streaming WebSocket-based token-by-token captions with turn timestamps.

### Multi-Layer Hallucination & Repetition Guard (`stt-hallucination-filter.ts`)

To prevent LLM hallucination loops during silent or low-volume audio segments:

- **Dice Bigram Similarity**: Detects and discards repeating phrase loops.
- **Density Filter**: Blocks transcripts where word count exceeds physically speakable limits for the audio chunk duration.
- **Minimum Blob Gate**: Drops sub-audible audio chunks (< 8 KB) before API dispatch.

---

## 5. AI Intelligence, Context Switching & African Languages

The AI intelligence layer is powered by **Google Gemini 2.5 Flash / 1.5 Flash**:

- **African Dialect & Code-Switching Translation**: Recognizes dynamic code-switching between English, Ghanaian Pidgin, Twi, Ga, Ewe, Hausa, and Swahili within single spoken turns, normalizing text into target languages without losing cultural nuances.
- **Automated Meeting Intelligence**: Generates executive summaries, key decisions, sentiment metrics, and structured action items upon meeting conclusion.
- **Workspace Conversational Memory (`memory-service.ts`)**: Indexes past meeting transcripts in Supabase with vector embeddings, enabling team members to query meeting context across historical conversations.

---

## 6. Data & Identity Layer (Supabase)

Supabase provides identity management, relational storage, and real-time state synchronization:

- **PostgreSQL Schema**: Manages `profiles`, `meetings`, `meeting_participants`, `transcripts`, `notes`, and `messages`.
- **Row Level Security (RLS)**: Enforces strict data access rules ensuring participants can only access transcripts and messages for meetings they are authorized to attend.
- **Realtime Subscriptions**: Synchronizes participant state changes, live chat messages, and collaborative whiteboard updates instantly across users.
- **Serverless Edge Functions**: Manages secure token creation and offloads asynchronous summary generation.

---

## 7. Global Deployment Architecture

- **Application Frontend & API**: Vercel Global Edge Network.
- **Media Transport**: LiveKit Cloud / Distributed Anycast SFU nodes.
- **Database & Edge Compute**: Supabase Managed Cloud Engine.
- **Inference Pipeline**: Groq LPU infrastructure & Google Gemini Edge endpoints.
