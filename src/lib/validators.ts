/**
 * Centralized input validation and sanitization.
 * Applied at both the UI layer (immediate feedback) and service layer (defense in depth).
 * Prevents XSS, injection, and data integrity issues.
 */

// ── Dangerous patterns ────────────────────────────────────────
const HTML_TAG_RE = /<[^>]*>/g;
const NULL_BYTE_RE = /\0/g;
const SCRIPT_RE = /javascript\s*:/gi;
const SQL_INJECT_RE = /(['";\\]|--|\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|EXEC|XP_)\b)/gi;
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/g;

/** Strip all HTML tags from a string */
function stripHtml(value: string): string {
  return value.replace(HTML_TAG_RE, '').replace(NULL_BYTE_RE, '');
}

/** Strip control characters that don't belong in user text */
function stripControlChars(value: string): string {
  // Keep newlines (\n, \r) for multi-line messages, strip everything else
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
}

export interface ValidationResult<T = string> {
  ok: boolean;
  value: T;
  error?: string;
}

// ── Room Code ─────────────────────────────────────────────────
const ROOM_CODE_RE = /^[A-Z0-9]{6,10}$/;

export function validateRoomCode(input: unknown): ValidationResult {
  if (typeof input !== 'string') return { ok: false, value: '', error: 'Room code must be a string' };
  const code = input.trim().toUpperCase();
  if (!ROOM_CODE_RE.test(code)) {
    return { ok: false, value: code, error: 'Room code must be 6–10 uppercase letters/numbers' };
  }
  return { ok: true, value: code };
}

// ── Display Name ──────────────────────────────────────────────
export function validateDisplayName(input: unknown): ValidationResult {
  if (typeof input !== 'string') return { ok: false, value: '', error: 'Name must be a string' };
  const name = stripHtml(stripControlChars(input)).trim();
  if (name.length === 0) return { ok: false, value: name, error: 'Name cannot be empty' };
  if (name.length > 50) return { ok: false, value: name.slice(0, 50), error: 'Name must be 50 characters or fewer' };
  if (SCRIPT_RE.test(name)) return { ok: false, value: '', error: 'Invalid characters in name' };
  return { ok: true, value: name };
}

// ── Meeting Title ─────────────────────────────────────────────
export function validateMeetingTitle(input: unknown): ValidationResult {
  if (typeof input !== 'string') return { ok: false, value: '', error: 'Title must be a string' };
  const title = stripHtml(stripControlChars(input)).trim();
  if (title.length === 0) return { ok: false, value: title, error: 'Meeting title cannot be empty' };
  if (title.length > 100) return { ok: false, value: title.slice(0, 100), error: 'Title must be 100 characters or fewer' };
  return { ok: true, value: title };
}

// ── Chat Message ──────────────────────────────────────────────
export function validateChatMessage(input: unknown): ValidationResult {
  if (typeof input !== 'string') return { ok: false, value: '', error: 'Message must be a string' };
  // Strip null bytes and control chars, but KEEP HTML (it will be escaped by the renderer)
  const msg = stripControlChars(input.replace(NULL_BYTE_RE, '')).trim();
  if (msg.length === 0) return { ok: false, value: msg, error: 'Message cannot be empty' };
  if (msg.length > 2000) return { ok: false, value: msg.slice(0, 2000), error: 'Message must be 2000 characters or fewer' };
  return { ok: true, value: msg };
}

// ── Transcript Content ────────────────────────────────────────
export function validateTranscriptContent(input: unknown): ValidationResult {
  if (typeof input !== 'string') return { ok: false, value: '', error: 'Transcript must be a string' };
  const content = stripControlChars(input.replace(NULL_BYTE_RE, '')).trim();
  if (content.length === 0) return { ok: false, value: content, error: 'Transcript content cannot be empty' };
  // Transcripts can be longer — cap at 5000 chars per chunk
  return { ok: true, value: content.slice(0, 5000) };
}

// ── LiveKit Room Name ─────────────────────────────────────────
const LIVEKIT_ROOM_RE = /^[a-zA-Z0-9_-]{1,128}$/;

export function validateLiveKitRoomName(input: unknown): ValidationResult {
  if (typeof input !== 'string') return { ok: false, value: '', error: 'Room name must be a string' };
  const name = input.trim();
  if (!LIVEKIT_ROOM_RE.test(name)) {
    return { ok: false, value: '', error: 'Invalid room name format' };
  }
  return { ok: true, value: name };
}

// ── Participant Identity ───────────────────────────────────────
export function validateParticipantIdentity(input: unknown): ValidationResult {
  if (typeof input !== 'string') return { ok: false, value: '', error: 'Identity must be a string' };
  const identity = input.trim().slice(0, 60);
  if (identity.length === 0) return { ok: false, value: '', error: 'Identity cannot be empty' };
  // No HTML injection in identity fields
  if (HTML_TAG_RE.test(identity) || SCRIPT_RE.test(identity)) {
    return { ok: false, value: '', error: 'Invalid characters in identity' };
  }
  return { ok: true, value: identity };
}

// ── Generic sanitize (for any user-provided string) ───────────
export function sanitizeText(input: string, maxLength = 500): string {
  return stripHtml(stripControlChars(input.replace(NULL_BYTE_RE, '')))
    .trim()
    .slice(0, maxLength);
}
