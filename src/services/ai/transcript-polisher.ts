/**
 * TranscriptPolisherService
 *
 * Sends raw canonical transcript turns (as captured from real-time ASR) to the
 * Gemini-powered /api/ai/polish-transcript endpoint and returns polished turns
 * with corrected punctuation, removed fillers, and natural sentence flow —
 * while keeping speaker identities and millisecond timestamps intact.
 */

import { CanonicalTranscriptEntry } from '@/services/supabase/transcripts';

export interface PolishTranscriptResult {
  polished: CanonicalTranscriptEntry[];
  /** True when the server fell back to the raw input (e.g. no Gemini key). */
  isFallback: boolean;
}

export const TranscriptPolisherService = {
  /**
   * Polish an array of raw transcript turns.
   *
   * @param turns  - Raw turns from the in-room TranscriptEngine.
   * @param signal - Optional AbortSignal for request cancellation.
   */
  async polishTranscript(
    turns: CanonicalTranscriptEntry[],
    signal?: AbortSignal,
  ): Promise<PolishTranscriptResult> {
    if (!turns || turns.length === 0) {
      return { polished: [], isFallback: false };
    }

    try {
      const res = await fetch('/api/ai/polish-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turns }),
        signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody?.error || `Polish request failed with status ${res.status}`,
        );
      }

      const data = await res.json();
      const polished: CanonicalTranscriptEntry[] = data?.polished ?? turns;
      const isFallback = !!data?.isFallback;

      return { polished, isFallback };
    } catch (err) {
      console.error('[TranscriptPolisherService] Failed to polish transcript:', err);
      // Graceful fallback — return the raw turns so the UI is never broken
      return { polished: turns, isFallback: true };
    }
  },
};

