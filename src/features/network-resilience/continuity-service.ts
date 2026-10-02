/**
 * Communication Continuity Service
 *
 * Implements the CommunicationContinuity interface for seamless meeting recovery.
 * Captures state at degradation and provides "While you were away..." missed context
 * from buffered transcripts and chat messages.
 */

import { CommunicationContinuity } from './types';
import { OfflineStorage, PersistedMeetingState } from './offline-storage';


export class ContinuityService implements CommunicationContinuity {
  private roomCode: string;
  private meetingId?: string;
  private storage: OfflineStorage;

  private disconnectedAt: number | null = null;
  private participantsList: string[] = [];

  constructor(roomCode: string, meetingId?: string, storage?: OfflineStorage) {
    this.roomCode = roomCode;
    this.meetingId = meetingId;
    this.storage = storage || new OfflineStorage();
  }

  public setMeetingId(meetingId: string): void {
    this.meetingId = meetingId;
  }

  public updateParticipants(participants: string[]): void {
    this.participantsList = participants;
  }

  public onNetworkCritical(): void {
    if (!this.disconnectedAt) {
      this.disconnectedAt = Date.now();
      this.preserveMeetingState().catch(() => {});
    }
  }

  public onNetworkRecovered(): void {
    this.disconnectedAt = null;
  }

  public async preserveMeetingState(): Promise<void> {
    const state: PersistedMeetingState = {
      roomCode: this.roomCode,
      meetingId: this.meetingId,
      lastConnectedAt: Date.now(),
      participants: this.participantsList,
      lastConnectionState: 'critical',
    };
    await this.storage.saveMeetingState(state);
  }

  public async getMissedMeetingContext(
    fromTimestamp: number,
    toTimestamp: number = Date.now()
  ): Promise<{
    missedMessageCount: number;
    missedTranscripts: Array<{ speaker: string; text: string; timestamp: string }>;
    summary?: string;
  }> {
    const missedTranscripts: Array<{ speaker: string; text: string; timestamp: string }> = [];

    // 1. Try local storage buffer
    const localChunks = await this.storage.getTranscriptsSince(this.roomCode, fromTimestamp);
    for (const chunk of localChunks) {
      if (chunk.timestamp <= toTimestamp) {
        missedTranscripts.push({
          speaker: chunk.speaker,
          text: chunk.text,
          timestamp: new Date(chunk.timestamp).toISOString(),
        });
      }
    }

    // 2. If Supabase meetingId is available and local buffer is thin, fetch canonical transcripts
    if (this.meetingId && missedTranscripts.length === 0) {
      try {
        const { TranscriptService } = await import('@/services/supabase/transcripts');
        const canonical = await TranscriptService.getCanonicalTranscripts(this.meetingId);
        for (const entry of canonical) {
          const entryTime = entry.created_at ? new Date(entry.created_at).getTime() : 0;
          if (entryTime >= fromTimestamp && entryTime <= toTimestamp) {
            missedTranscripts.push({
              speaker: entry.speaker_name || entry.speaker_id || 'Participant',
              text: entry.content || '',
              timestamp: entry.created_at || new Date(entryTime).toISOString(),
            });
          }
        }
      } catch {
        // offline or unauthenticated fallback
      }
    }

    // 3. Build a lightweight catch-up summary if transcripts exist
    let summary: string | undefined;
    if (missedTranscripts.length > 0) {
      const speakers = Array.from(new Set(missedTranscripts.map(t => t.speaker))).join(', ');
      summary = `${missedTranscripts.length} dialogue turns from ${speakers}.`;
    }

    return {
      missedMessageCount: missedTranscripts.length,
      missedTranscripts,
      summary,
    };
  }
}
