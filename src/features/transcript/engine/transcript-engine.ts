import { CanonicalTranscriptEntry, TranscriptService, TranscriptWord } from '@/services/supabase/transcripts';
import { cleanRepeatedPhrases, mergeContinuousText } from '@/lib/audio/stt-hallucination-filter';

export interface InterimCaptionState {
  speakerId: string;
  speakerName: string;
  text: string;
  isFinal: false;
  timestamp: string;
}

export class TranscriptEngine {
  private meetingId: string;
  private isEphemeral: boolean;
  private canonicalTurnMap: Map<string, CanonicalTranscriptEntry> = new Map();
  private activeInterimMap: Map<string, InterimCaptionState> = new Map();
  private listeners: Set<(canonical: CanonicalTranscriptEntry[], activeInterims: InterimCaptionState[]) => void> = new Set();
  private lastSpeakerTurnId: string | null = null;
  private lastSpeakerId: string | null = null;
  private turnTimeoutMs = 5000; // 5s gap creates a new conversational turn

  constructor(meetingId: string, isEphemeral: boolean = false) {
    this.meetingId = meetingId;
    this.isEphemeral = isEphemeral;
  }

  public setEphemeral(isEphemeral: boolean): void {
    this.isEphemeral = isEphemeral;
  }

  /**
   * Subscribe to Transcript Engine updates (canonical turns & interim state).
   */
  public subscribe(callback: (canonical: CanonicalTranscriptEntry[], activeInterims: InterimCaptionState[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getCanonicalList(), this.getInterimList());
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Returns current canonical transcript turns sorted chronologically.
   */
  public getCanonicalList(): CanonicalTranscriptEntry[] {
    return Array.from(this.canonicalTurnMap.values()).sort((a, b) => a.start_ms - b.start_ms);
  }

  /**
   * Returns currently active interim captions.
   */
  public getInterimList(): InterimCaptionState[] {
    return Array.from(this.activeInterimMap.values());
  }

  /**
   * Processes incoming interim transcript update from AssemblyAI Realtime.
   */
  public processInterimResult(speakerId: string, speakerName: string, text: string): void {
    const cleanedText = cleanRepeatedPhrases(text);
    if (!cleanedText) {
      this.activeInterimMap.delete(speakerId);
    } else {
      this.activeInterimMap.set(speakerId, {
        speakerId,
        speakerName,
        text: cleanedText,
        isFinal: false,
        timestamp: new Date().toISOString(),
      });
    }

    this.notify();
  }

  /**
   * Processes incoming final transcript result from AssemblyAI Realtime.
   * Reconciles interim state and groups continuous words into cohesive speaker turns.
   */
  public async processFinalResult(
    speakerId: string,
    speakerName: string,
    text: string,
    startMs: number,
    endMs: number,
    words: TranscriptWord[],
    confidence: number = 0.98
  ): Promise<CanonicalTranscriptEntry | null> {
    const cleanedText = cleanRepeatedPhrases(text);
    if (!cleanedText) return null;

    // Clear interim text for this speaker upon receiving final result
    this.activeInterimMap.delete(speakerId);

    const nowMs = Date.now();
    const currentCanonical = this.getCanonicalList();
    const lastTurn = currentCanonical.length > 0 ? currentCanonical[currentCanonical.length - 1] : null;

    // 1. Duplicate Turn Suppression: Discard if identical or subset of last turn
    if (lastTurn && lastTurn.speaker_id === speakerId) {
      const normLast = lastTurn.content.toLowerCase().replace(/[.,!?;:"'()\[\]{}]/g, '').trim();
      const normNew = cleanedText.toLowerCase().replace(/[.,!?;:"'()\[\]{}]/g, '').trim();
      if (normLast === normNew || (normLast.length > 8 && normLast.includes(normNew))) {
        return lastTurn;
      }
    }

    let targetTurn: CanonicalTranscriptEntry;

    // 2. Decide whether to group into existing turn or create a new turn
    // A new turn should start when:
    // - Speaker changes
    // - There is a natural pause (> 2000ms)
    // - The current turn has already reached a complete thought (>= 20 words or >= 7000ms duration)
    const lastWordCount = lastTurn ? lastTurn.content.trim().split(/\s+/).length : 0;
    const isLastTurnLong = lastWordCount >= 20 || (lastTurn ? (lastTurn.end_ms - lastTurn.start_ms >= 7000) : false);
    const isWithinPauseWindow = lastTurn ? (startMs - lastTurn.end_ms <= 2000) : false;

    const shouldGroup =
      lastTurn &&
      lastTurn.speaker_id === speakerId &&
      isWithinPauseWindow &&
      !isLastTurnLong;

    if (shouldGroup) {
      const updatedContent = mergeContinuousText(lastTurn.content, cleanedText);

      // If merged content is identical to existing content, skip saving duplicate chunk
      if (updatedContent === lastTurn.content) {
        return lastTurn;
      }

      const updatedWords = [...lastTurn.words, ...words];
      const updatedEndMs = Math.max(lastTurn.end_ms, endMs);

      targetTurn = {
        ...lastTurn,
        content: updatedContent,
        end_ms: updatedEndMs,
        words: updatedWords,
        confidence: Math.min(lastTurn.confidence, confidence),
      };

      this.canonicalTurnMap.set(lastTurn.id!, targetTurn);
    } else {
      // Create new clean speaker turn
      const newTurnId = `turn_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;
      targetTurn = {
        id: newTurnId,
        meeting_id: this.meetingId,
        speaker_id: speakerId,
        speaker_name: speakerName,
        content: cleanedText,
        start_ms: startMs,
        end_ms: endMs,
        words: words.length > 0 ? words : [{ text: cleanedText, start: startMs, end: endMs, confidence }],
        confidence: confidence,
        status: 'final',
        turn_id: newTurnId,
        created_at: new Date().toISOString(),
      };

      this.canonicalTurnMap.set(newTurnId, targetTurn);
      this.lastSpeakerTurnId = newTurnId;
      this.lastSpeakerId = speakerId;
    }

    this.notify();

    // Persist finalized turn to Supabase Canonical Transcripts DB (skips if ephemeral)
    try {
      await TranscriptService.saveCanonicalTurn(targetTurn, this.isEphemeral);
    } catch (err) {
      console.error('[TranscriptEngine] Failed to persist canonical turn to DB:', err);
    }

    return targetTurn;
  }

  /**
   * Pre-loads existing canonical transcripts from Supabase.
   */
  public async loadInitialTranscripts(): Promise<void> {
    try {
      const records = await TranscriptService.getCanonicalTranscripts(this.meetingId);
      records.forEach((record) => {
        const id = record.id || `turn_${record.start_ms}_${record.speaker_id}`;
        this.canonicalTurnMap.set(id, record);
      });
      this.notify();
    } catch (err) {
      console.warn('[TranscriptEngine] Error pre-loading transcripts:', err);
    }
  }

  private notify(): void {
    const canonical = this.getCanonicalList();
    const interims = this.getInterimList();
    this.listeners.forEach((listener) => listener(canonical, interims));
  }
}
