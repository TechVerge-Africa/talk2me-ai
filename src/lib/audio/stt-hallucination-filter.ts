/**
 * STT Hallucination & Continuous Speech Sanitization Filter
 * ─────────────────────────────────────────────────────────────────
 * Shared utility used by useAssemblyAIRealtime, useWebSpeechSTT, and TranscriptEngine
 * to suppress Whisper / Web Speech hallucinations and seamlessly merge continuous
 * speech without stuttering, word duplication, or artificial turn fragmentation.
 */

// ─── 1. Blocklist ─────────────────────────────────────────────────

/**
 * Known Whisper / STT silent-audio hallucination artifacts.
 * Matched case-insensitively, punctuation-stripped.
 * (Note: Standalone "okay" and "thank you" are excluded so real human speech is preserved)
 */
const HALLUCINATION_EXACT: readonly string[] = [
  // YouTube / subtitle artifacts
  'thank you for watching',
  'thanks for watching',
  'thanks for listening',
  'please subscribe',
  'like and subscribe',
  'don\'t forget to subscribe',
  'subtitles by',
  'captions by',
  'translated by',
  'amara.org',
  'mbc news',
  'bbc news',
  'cnn news',
  // Loop artifacts
  'hello hello hello',
  'how are you how are you',
  'how are you doing how are you doing',
  'i hope you are doing well i hope',
  'i hope you\'re doing well i hope',
  'let\'s go let\'s go',
  // Common near-silence triggers
  'music',
  'applause',
  'laughter',
  'background noise',
];

/** Sub-strings that, if present in isolation (short text), signal hallucination */
const HALLUCINATION_CONTAINS: readonly string[] = [
  'subscribe for more',
  'don\'t forget to like',
  'hit the bell',
  'turn on notifications',
];

/**
 * Returns true when the given text is a known Whisper hallucination.
 */
export function isKnownHallucination(rawText: string): boolean {
  if (!rawText || !rawText.trim()) return true;

  const cleaned = rawText
    .toLowerCase()
    .replace(/[.,!?;:"'()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) return true;

  // Exact match
  if (HALLUCINATION_EXACT.includes(cleaned)) return true;

  // Contains match (only for very short outputs)
  if (cleaned.split(' ').length <= 10) {
    if (HALLUCINATION_CONTAINS.some(h => cleaned.includes(h))) return true;
  }

  return false;
}

// ─── 2. Repetition / Loop Detector ───────────────────────────────

/**
 * Maintains a sliding window of the last N committed transcript segments.
 * Smartly detects looping output without blocking legitimate conversational repetitions.
 */
export class RepetitionDetector {
  private readonly windowSize: number;
  private readonly history: string[] = [];

  constructor(windowSize = 6) {
    this.windowSize = windowSize;
  }

  /**
   * Returns true when `newText` appears to be an artificial STT loop.
   */
  isRepetitionLoop(newText: string): boolean {
    if (!newText.trim()) return false;

    const normalized = this.normalize(newText);
    // Ignore short conversational phrases (< 8 chars) like "Yes", "No", "Okay", "Hello"
    if (!normalized || normalized.length < 8) return false;

    // Check if identical or nearly identical to the immediate previous segment
    const last = this.history[this.history.length - 1];
    if (last && (last === normalized || this.overlapRatio(normalized, last) > 0.85)) {
      return true;
    }

    // Check if 2 of the last 3 segments have high similarity (> 0.80)
    let recentMatches = 0;
    const recentSlice = this.history.slice(-3);
    for (const past of recentSlice) {
      if (this.overlapRatio(normalized, past) > 0.80) {
        recentMatches++;
      }
    }

    return recentMatches >= 2;
  }

  /**
   * Commit a segment to history. Call this AFTER deciding to accept it.
   */
  commit(text: string): void {
    const normalized = this.normalize(text);
    if (!normalized) return;
    this.history.push(normalized);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }
  }

  reset(): void {
    this.history.length = 0;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,!?;:"'()\[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Dice coefficient for string similarity (0 = different, 1 = identical) */
  private overlapRatio(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1;

    const aBigrams = new Set(this.bigrams(a));
    const bBigrams = new Set(this.bigrams(b));

    let intersection = 0;
    for (const bg of aBigrams) {
      if (bBigrams.has(bg)) intersection++;
    }

    return (2 * intersection) / (aBigrams.size + bBigrams.size);
  }

  private bigrams(str: string): string[] {
    const result: string[] = [];
    for (let i = 0; i < str.length - 1; i++) {
      result.push(str.slice(i, i + 2));
    }
    return result;
  }
}

// ─── 3. Sentence Deduplication & Continuous Text Merger ──────────

/**
 * Removes internal repeating consecutive sentences or clauses inside a single STT transcript string.
 * Example: "Hello? Hello? How are you? How are you?" → "Hello? How are you?"
 */
export function cleanRepeatedPhrases(text: string): string {
  if (!text || !text.trim()) return '';

  const raw = text.trim();
  // Split into sentences / clauses keeping punctuation attached
  const parts = raw.match(/[^.!?]+[.!?]*|\s+/g) || [raw];
  const cleanedParts: string[] = [];

  let prevNorm = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const norm = trimmed
      .toLowerCase()
      .replace(/[.,!?;:"'()\[\]{}]/g, '')
      .replace(/\s+/g, ' ');

    if (!norm) continue;

    // Check if this clause is identical or nearly identical to the previous clause
    if (prevNorm && (norm === prevNorm || (norm.length > 5 && isSimilar(norm, prevNorm)))) {
      continue; // Skip duplicate clause
    }

    cleanedParts.push(trimmed);
    prevNorm = norm;
  }

  // Join cleaned sentences with space
  let result = cleanedParts.join(' ');

  // Fix spacing around punctuation
  result = result
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return result;
}

function isSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  const aWords = new Set(a.split(' '));
  const bWords = new Set(b.split(' '));
  let matchCount = 0;
  for (const w of aWords) {
    if (bWords.has(w)) matchCount++;
  }
  const ratio = (2 * matchCount) / (aWords.size + bWords.size);
  return ratio > 0.85;
}

/**
 * Merges new STT speech output into an existing ongoing speaker turn cleanly.
 * Deduplicates overlapping word sequences at the boundary between chunks
 * and handles proper sentence separation and capitalization.
 */
export function mergeContinuousText(existingText: string, newText: string): string {
  const existing = (existingText || '').trim();
  const cleanedNew = cleanRepeatedPhrases(newText || '');

  if (!existing) return cleanedNew;
  if (!cleanedNew) return existing;

  const normExisting = existing
    .toLowerCase()
    .replace(/[.,!?;:"'()\[\]{}]/g, '')
    .replace(/\s+/g, ' ');

  const normNew = cleanedNew
    .toLowerCase()
    .replace(/[.,!?;:"'()\[\]{}]/g, '')
    .replace(/\s+/g, ' ');

  // 1. Exact or total inclusion check
  if (normExisting === normNew) return existing;
  if (normExisting.includes(normNew)) return existing;
  if (normNew.includes(normExisting) && cleanedNew.length > existing.length) {
    return cleanedNew;
  }

  // 2. Word-level suffix/prefix overlap resolution
  const existingWords = existing.split(/\s+/);
  const newWords = cleanedNew.split(/\s+/);

  const cleanExistingWords = existingWords.map(w =>
    w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '')
  );
  const cleanNewWords = newWords.map(w =>
    w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '')
  );

  const maxOverlap = Math.min(cleanExistingWords.length, cleanNewWords.length);
  let overlapSize = 0;

  for (let len = maxOverlap; len >= 1; len--) {
    const existingTail = cleanExistingWords.slice(-len).join(' ');
    const newHead = cleanNewWords.slice(0, len).join(' ');

    if (existingTail === newHead && existingTail.length > 0) {
      overlapSize = len;
      break;
    }
  }

  if (overlapSize > 0) {
    // Append only non-overlapping words from newWords
    const nonOverlappingNewWords = newWords.slice(overlapSize);
    if (nonOverlappingNewWords.length === 0) {
      return existing;
    }
    return `${existing} ${nonOverlappingNewWords.join(' ')}`;
  }

  // 3. Clean join with sentence formatting
  let formattedNew = cleanedNew;
  const lastChar = existing.slice(-1);
  const endsWithPunctuation = ['.', '!', '?'].includes(lastChar);

  if (endsWithPunctuation) {
    // Ensure first character of new sentence is capitalized
    formattedNew = formattedNew.charAt(0).toUpperCase() + formattedNew.slice(1);
    return `${existing} ${formattedNew}`;
  } else {
    // Check if new chunk naturally starts a new sentence
    if (/^[A-Z]/.test(formattedNew) && existingWords.length >= 4) {
      return `${existing}. ${formattedNew}`;
    }
    return `${existing} ${formattedNew}`;
  }
}

// ─── 4. Physical-impossibility Guard ─────────────────────────────

/** Average maximum credible speaking rate (words per second) */
const MAX_WORDS_PER_SECOND = 4.5;

/**
 * Returns true when the word count is impossible given the audio duration.
 */
export function isPhysicallyImpossible(text: string, durationMs: number): boolean {
  if (durationMs <= 0) return false;
  const words = text.trim().split(/\s+/).length;
  const maxPossible = (durationMs / 1000) * MAX_WORDS_PER_SECOND;
  return words > maxPossible;
}

// ─── 5. RMS Energy Check ─────────────────────────────────────────

/** Minimum RMS amplitude to consider audio "audible speech" */
const MIN_SPEECH_RMS = 250;

/**
 * Returns true when the PCM Int16 audio buffer contains audible energy
 * above the speech threshold.
 */
export function hasAudibleSpeech(pcmArrayBuffer: ArrayBuffer): boolean {
  if (!pcmArrayBuffer || pcmArrayBuffer.byteLength < 2) return false;
  const samples = new Int16Array(pcmArrayBuffer);
  if (samples.length === 0) return false;

  let sumOfSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumOfSquares += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumOfSquares / samples.length);
  return rms >= MIN_SPEECH_RMS;
}

// ─── 6. Groq Anti-Hallucination Prompt ───────────────────────────

export const GROQ_ANTI_HALLUCINATION_PROMPT =
  'Verbatim voice dictation transcript. ' +
  'Output only the exact words spoken by the speaker. ' +
  'If the audio is silent or contains only background noise, output nothing at all. ' +
  'Do not complete unfinished sentences. ' +
  'Do not repeat phrases. ' +
  'Do not add punctuation, commentary, or filler text.';

// ─── 7. Minimum audible blob size ────────────────────────────────

export const MIN_AUDIBLE_BLOB_BYTES = 8_000;
