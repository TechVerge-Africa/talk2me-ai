/**
 * Talk2Me Adaptive Network Resilience Engine
 * Core Type Definitions & Interfaces
 */

export type NetworkQuality =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'critical'
  | 'offline';

export interface NetworkMetrics {
  timestamp: number;

  /** Estimated downlink throughput in kbps */
  estimatedDownlinkKbps?: number;
  /** Estimated uplink throughput in kbps */
  estimatedUplinkKbps?: number;

  /** Round-trip time in milliseconds */
  rttMs?: number;
  /** Jitter in milliseconds */
  jitterMs?: number;

  /** Cumulative packets lost */
  packetsLost?: number;
  /** Cumulative packets received */
  packetsReceived?: number;
  /** Instantaneous / interval packet loss rate (0.0 to 1.0) */
  packetLossRate?: number;

  /** Total bytes received */
  bytesReceived?: number;
  /** Total bytes sent */
  bytesSent?: number;

  /** Video frames dropped */
  framesDropped?: number;
  /** Video frames received */
  framesReceived?: number;

  /** LiveKit/WebRTC connection state */
  connectionState: string;

  /** Synthesized network quality evaluation */
  quality: NetworkQuality;

  /** Stability score (0 - 100) indicating connection variance and predictability */
  stabilityScore: number;
}

export type PreferredVideoQuality = 'high' | 'medium' | 'low' | 'minimal' | 'off';
export type AudioPriority = 'normal' | 'high' | 'critical';

export interface ParticipantMediaPolicy {
  participantId: string;
  videoQuality: 'high' | 'medium' | 'low' | 'off';
  videoEnabled: boolean;
  priority: 'high' | 'normal' | 'low';
  reason: 'active_speaker' | 'screen_sharer' | 'visible' | 'background' | 'audio_priority' | 'bandwidth_saver';
}

export interface MediaPolicy {
  /** Should local camera remain actively transmitting */
  videoEnabled: boolean;

  /** Target local publishing and remote subscription tier */
  preferredVideoQuality: PreferredVideoQuality;

  /** Desired target resolution constraints */
  preferredResolution?: {
    width: number;
    height: number;
  };

  /** Preferred target frame rate */
  preferredFps?: number;

  /** Audio protection tier */
  audioPriority: AudioPriority;

  /** Whether local or remote screen sharing is enabled/recommended */
  screenShareEnabled: boolean;

  /** Whether captions/subtitles are recommended due to low-bandwidth/audio-only mode */
  captionsRecommended: boolean;

  /** Whether semantic fallback/catch-up summaries are recommended */
  semanticFallbackRecommended: boolean;

  /** Per-participant subscription policies */
  participantPolicies?: Map<string, ParticipantMediaPolicy>;
}

export interface MeetingContext {
  activeSpeakerId?: string;
  screenShareActive: boolean;
  screenShareOwnerId?: string;
  visibleParticipantIds?: string[];
  totalParticipants: number;
  meetingMode?: 'normal' | 'presentation' | 'onthego';
  userQualityPreference?: 'auto' | 'conserve_data' | 'high_quality';
}

export interface CurrentMediaState {
  localCamOn: boolean;
  localMicOn: boolean;
  localScreenShareOn: boolean;
  activeRemoteVideoCount: number;
}

/** Configurable adaptation and hysteresis thresholds */
export interface AdaptationConfig {
  /** Measurement intervals (ms) */
  pollIntervalMs: number;

  /** Exponential smoothing factors (0.0 < alpha <= 1.0) */
  smoothingFastAlpha: number; // e.g. 0.5 (fast deterioration reaction)
  smoothingSlowAlpha: number; // e.g. 0.15 (sustained baseline)

  /** Dwell times (ms) before allowing state transitions */
  upgradeDwellTimeMs: number;   // e.g. 6000ms: must sustain good conditions before upgrading
  downgradeDwellTimeMs: number; // e.g. 1500ms: faster downgrade to protect conversation

  /** Thresholds for entering qualities (hysteresis: downgrade thresholds) */
  thresholds: {
    poorToCritical: {
      maxPacketLoss: number; // e.g. 0.18 (18%)
      maxRttMs: number;      // e.g. 500ms
      minDownlinkKbps: number; // e.g. 150 kbps
    };
    fairToPoor: {
      maxPacketLoss: number; // e.g. 0.08 (8%)
      maxRttMs: number;      // e.g. 320ms
      minDownlinkKbps: number; // e.g. 350 kbps
    };
    goodToFair: {
      maxPacketLoss: number; // e.g. 0.035 (3.5%)
      maxRttMs: number;      // e.g. 200ms
      minDownlinkKbps: number; // e.g. 700 kbps
    };
    excellentToGood: {
      maxPacketLoss: number; // e.g. 0.015 (1.5%)
      maxRttMs: number;      // e.g. 120ms
      minDownlinkKbps: number; // e.g. 1400 kbps
    };

    /** Recovery thresholds (higher bar to upgrade back) */
    recovery: {
      criticalToPoor: {
        maxPacketLoss: number; // 0.10
        maxRttMs: number;      // 350ms
        minDownlinkKbps: number; // 250 kbps
      };
      poorToFair: {
        maxPacketLoss: number; // 0.05
        maxRttMs: number;      // 220ms
        minDownlinkKbps: number; // 500 kbps
      };
      fairToGood: {
        maxPacketLoss: number; // 0.02
        maxRttMs: number;      // 150ms
        minDownlinkKbps: number; // 1000 kbps
      };
      goodToExcellent: {
        maxPacketLoss: number; // 0.008
        maxRttMs: number;      // 80ms
        minDownlinkKbps: number; // 1800 kbps
      };
    };
  };
}

export interface PendingSyncItem {
  id: string;
  type: string;
  createdAt: number;
  payload: unknown;
  retryCount: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  idempotencyKey: string;
}

export interface CommunicationContinuity {
  onNetworkCritical(): void;
  onNetworkRecovered(): void;
  preserveMeetingState(): Promise<void>;
  getMissedMeetingContext(
    fromTimestamp: number,
    toTimestamp: number
  ): Promise<{
    missedMessageCount: number;
    missedTranscripts: Array<{ speaker: string; text: string; timestamp: string }>;
    summary?: string;
  }>;
}

export interface NetworkSimulationConfig {
  enabled: boolean;
  forcedQuality?: NetworkQuality;
  downlinkKbps?: number;
  rttMs?: number;
  jitterMs?: number;
  packetLossRate?: number;
}
