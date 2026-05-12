## SignBridge Live — Build Plan (v1, UI + flows, mock data)

### Goal
Mobile-first responsive web app that demonstrates the full SignBridge Live experience: create or join an AI translation room, share via QR/link/code, and run a live communication room with captions, sign-detection overlay, and floating controls. No real WebRTC, speech-to-text, or sign recognition yet — everything is mocked but feels alive.

### Design language (locked from chosen direction)
- Palette: ivory `#fcfaf7` background, ink `#1c1917` text, bridge-indigo `#312e81` primary, bridge-cyan `#0891b2` accent. Optional dark mode added later.
- Type: Inter (400/500/600). Large, high-contrast captions. Tracking-tight headings.
- Material: white cards on ivory, soft shadows tinted with indigo, 1px black/5 hairlines, generous radii (2xl–4xl).
- Motion: AI orb wave-pulse, ping dots for "live", caption fade-in, spring press on big buttons. Restrained.
- Feel: empowering, modern, premium — never medical.

### Screens & routes (TanStack file-based routing in `src/routes/`)
1. `/` — Landing. Two huge actions: Create Session, Join Session. "Signal Active" pill, hero headline, short value prop, footer.
2. `/create` — Create Session. Hero QR card with animated AI wave background, room code (e.g. `S-722-B1X`), copy link / share buttons, "Waiting for participants…" with mock host card.
3. `/join` — Join Session. Big code input (segmented), "Scan QR" mock button, recent rooms list, primary Join CTA.
4. `/room/$code` — Live Communication Room. 3-zone composition:
   - Live captions panel (transcript with speaker, timestamp, translated highlight)
   - Camera preview placeholder with sign-detection bounding box + translated phrase bubble + AI pulse orb
   - Floating control dock (mic, camera, caption size, AI assistant, emergency phrases, leave)
   Includes overlay sheets for AI Assistant and Emergency Phrases.
5. `/room/$code/summary` — Post-session summary. Transcript, key points, save/share (mocked).
6. `/settings` — Accessibility settings (caption size, contrast, reduce motion, language: English / Twi / French / ASL / GSL — UI only).

Smaller surfaces handled inline (no separate route): splash on first load, AI assistant overlay, emergency phrases sheet.

### Components (`src/components/`)
- `Logo`, `SignalPill`, `BigActionCard` (landing buttons)
- `QrBlock` (stylized SVG-grid QR), `RoomCodeDisplay`, `ShareRow`
- `AiOrb` / `AiWaveBackground`
- `CaptionStream` + `CaptionLine` (mock streaming via `setInterval`)
- `CameraPreview` with `SignDetectionOverlay` + `TranslationBubble`
- `ControlDock` (responsive: bottom on mobile, right-rail on desktop)
- `AiAssistantSheet`, `EmergencyPhrasesSheet` (shadcn Sheet)
- `ParticipantCard`, `WaitingRoomList`
- `SettingsRow`, `AccessibilitySlider`

### Mock data layer (`src/lib/mock/`)
- `transcript.ts` — scripted lines with speaker, timestamp, isSigned/isTranslated, fed by a small hook `useMockTranscript()` that pushes lines on a timer.
- `phrases.ts` — emergency phrase categories (Medical, Travel, School, General).
- `rooms.ts` — generate room codes, persist current room in `localStorage`.
- `smart-replies.ts` — AI smart-reply suggestions.

### Design tokens & global styles
- Update `src/styles.css`: replace `--background`, `--foreground`, `--primary`, `--accent`, etc. with the ivory/ink/indigo/cyan palette in oklch. Add `--bridge-indigo`, `--bridge-cyan`, gradient + shadow tokens, and register them in `@theme inline`.
- Add `wave-pulse`, `float`, `caption-in` keyframes.
- Inter via Google Fonts in `__root.tsx` head links.

### Root + meta
- `__root.tsx`: keep shell, add Inter preconnect/links, set app-wide title/description, add a thin top nav (logo + Settings) shown on non-room routes only.
- Each route defines its own `head()` with route-specific title + OG description (per project routing rules).

### Responsiveness
- Default mobile (single column, sticky bottom dock). `lg:` breakpoint upgrades:
  - Landing: 2-up action grid
  - Create: QR left / share + waiting list right
  - Room: captions left rail, camera center, dock right rail (or bottom-floating)
- Tap targets ≥ 44px, captions scale via setting, respects `prefers-reduced-motion`.

### Out of scope for v1
Real WebRTC, real STT, real sign recognition, auth, persistence beyond `localStorage`, Lovable Cloud, multi-language actual translation. All clearly mocked but visually convincing.

### Build order
1. Tokens + fonts + global styles
2. Shared components (Logo, SignalPill, AiOrb, ControlDock, CaptionStream, CameraPreview)
3. Routes: `/`, `/create`, `/join`
4. Route: `/room/$code` with mock transcript + overlays
5. Routes: `/room/$code/summary`, `/settings`
6. Polish pass: motion, reduced-motion fallbacks, dark-mode tokens, head() metadata per route
