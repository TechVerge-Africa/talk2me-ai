/**
 * Talk2Me Adaptation Controller
 *
 * Evaluates NetworkMetrics + MeetingContext + CurrentMediaState
 * with hysteresis, minimum dwell times, and dual-threshold recovery
 * to produce deterministic, non-oscillating MediaPolicy decisions.
 *
 * Completely decoupled from React and browser APIs for pure unit testing.
 */

import {
  NetworkMetrics,
  NetworkQuality,
  MeetingContext,
  CurrentMediaState,
  MediaPolicy,
  ParticipantMediaPolicy,
  AdaptationConfig,
} from './types';
import { DEFAULT_ADAPTATION_CONFIG } from './config';

const QUALITY_RANKS: Record<NetworkQuality, number> = {
  offline: 0,
  critical: 1,
  poor: 2,
  fair: 3,
  good: 4,
  excellent: 5,
};

export class AdaptationController {
  private config: AdaptationConfig;

  // Hysteresis & State tracking
  private currentQuality: NetworkQuality = 'excellent';
  private stateEnteredAt: number = 0;
  private candidateQuality: NetworkQuality | null = null;
  private candidateFirstObservedAt: number = 0;

  constructor(config: AdaptationConfig = DEFAULT_ADAPTATION_CONFIG) {
    this.config = config;
  }

  public setConfig(config: Partial<AdaptationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getCurrentQuality(): NetworkQuality {
    return this.currentQuality;
  }

  public reset(initialQuality: NetworkQuality = 'excellent', initialTimestamp: number = 0): void {
    this.currentQuality = initialQuality;
    this.stateEnteredAt = initialTimestamp;
    this.candidateQuality = null;
    this.candidateFirstObservedAt = 0;
  }

  /**
   * Evaluates input state and computes the resulting MediaPolicy
   */
  public evaluate(
    metrics: NetworkMetrics,
    context: MeetingContext,
    mediaState?: Partial<CurrentMediaState>
  ): MediaPolicy {
    const now = metrics.timestamp || Date.now();

    if (this.stateEnteredAt === 0 || now < this.stateEnteredAt) {
      this.stateEnteredAt = now;
    }

    // 1. Resolve effective network quality with hysteresis & dwell times
    const effectiveQuality = this.resolveQualityWithHysteresis(metrics, now);

    // 2. Build room-wide base media policy from effective quality
    const basePolicy = this.computeBasePolicy(effectiveQuality, context);

    // 3. Build granular per-participant policies taking active-speaker and presentation into account
    const participantPolicies = this.computeParticipantPolicies(
      effectiveQuality,
      context,
      mediaState
    );

    return {
      ...basePolicy,
      participantPolicies,
    };
  }

  /**
   * Evaluates if a quality transition should occur respecting dwell times and recovery thresholds.
   */
  private resolveQualityWithHysteresis(metrics: NetworkMetrics, now: number): NetworkQuality {
    const rawTarget = metrics.quality;

    // Hard offline/disconnected overrides hysteresis immediately to prevent wasted resource attempts
    if (metrics.connectionState === 'disconnected' || metrics.connectionState === 'offline' || rawTarget === 'offline') {
      if (this.currentQuality !== 'offline') {
        this.currentQuality = 'offline';
        this.stateEnteredAt = now;
        this.candidateQuality = null;
      }
      return 'offline';
    }

    // If currently offline and network is back, transition to candidate target immediately to start reconnect
    if (this.currentQuality === 'offline') {
      this.currentQuality = rawTarget;
      this.stateEnteredAt = now;
      this.candidateQuality = null;
      return this.currentQuality;
    }

    if (rawTarget === this.currentQuality) {
      // Consistent state: reset any candidate transition
      this.candidateQuality = null;
      return this.currentQuality;
    }

    const currentRank = QUALITY_RANKS[this.currentQuality];
    const targetRank = QUALITY_RANKS[rawTarget];
    const isDowngrade = targetRank < currentRank;
    const isUpgrade = targetRank > currentRank;

    // For gradual recovery, step up one rank at a time instead of jumping straight to HD
    let candidateTarget: NetworkQuality = rawTarget;
    if (isUpgrade && targetRank > currentRank + 1) {
      const nextRank = currentRank + 1;
      const rankToQuality: NetworkQuality[] = ['offline', 'critical', 'poor', 'fair', 'good', 'excellent'];
      candidateTarget = rankToQuality[nextRank] || rawTarget;
    }

    // Additional recovery threshold check when attempting to upgrade:
    if (isUpgrade && !this.meetsRecoveryThreshold(this.currentQuality, metrics)) {
      this.candidateQuality = null;
      return this.currentQuality;
    }

    // Check dwell time requirements
    const requiredDwellTime = isDowngrade
      ? this.config.downgradeDwellTimeMs
      : this.config.upgradeDwellTimeMs;

    if (this.candidateQuality !== candidateTarget) {
      // First time observing this candidate quality
      this.candidateQuality = candidateTarget;
      this.candidateFirstObservedAt = now;
      return this.currentQuality;
    }

    // We have observed this candidate quality continuously
    const candidateDuration = now - this.candidateFirstObservedAt;

    if (candidateDuration >= requiredDwellTime) {
      // State transition confirmed!
      this.currentQuality = candidateTarget;
      this.stateEnteredAt = now;
      this.candidateQuality = null;
      return this.currentQuality;
    }

    return this.currentQuality;
  }

  /**
   * Checks whether telemetry strictly meets the recovery criteria to step up from a degraded state.
   */
  private meetsRecoveryThreshold(current: NetworkQuality, metrics: NetworkMetrics): boolean {
    const rec = this.config.thresholds.recovery;
    const loss = metrics.packetLossRate ?? 0;
    const rtt = metrics.rttMs ?? 0;
    const bw = metrics.estimatedDownlinkKbps ?? 1000;

    switch (current) {
      case 'critical':
        return loss <= rec.criticalToPoor.maxPacketLoss &&
               rtt <= rec.criticalToPoor.maxRttMs &&
               bw >= rec.criticalToPoor.minDownlinkKbps;
      case 'poor':
        return loss <= rec.poorToFair.maxPacketLoss &&
               rtt <= rec.poorToFair.maxRttMs &&
               bw >= rec.poorToFair.minDownlinkKbps;
      case 'fair':
        return loss <= rec.fairToGood.maxPacketLoss &&
               rtt <= rec.fairToGood.maxRttMs &&
               bw >= rec.fairToGood.minDownlinkKbps;
      case 'good':
        return loss <= rec.goodToExcellent.maxPacketLoss &&
               rtt <= rec.goodToExcellent.maxRttMs &&
               bw >= rec.goodToExcellent.minDownlinkKbps;
      default:
        return true;
    }
  }

  /**
   * Computes room-level base policy for a given network quality
   */
  private computeBasePolicy(
    quality: NetworkQuality,
    context: MeetingContext
  ): Omit<MediaPolicy, 'participantPolicies'> {
    const isPresentation = context.meetingMode === 'presentation' || context.screenShareActive;

    switch (quality) {
      case 'excellent':
        return {
          videoEnabled: true,
          preferredVideoQuality: 'high',
          preferredResolution: { width: 1280, height: 720 },
          preferredFps: 30,
          audioPriority: 'normal',
          screenShareEnabled: true,
          captionsRecommended: false,
          semanticFallbackRecommended: false,
        };

      case 'good':
        return {
          videoEnabled: true,
          preferredVideoQuality: 'medium',
          preferredResolution: { width: 640, height: 360 },
          preferredFps: 24,
          audioPriority: 'normal',
          screenShareEnabled: true,
          captionsRecommended: false,
          semanticFallbackRecommended: false,
        };

      case 'fair':
        return {
          videoEnabled: true,
          preferredVideoQuality: 'medium',
          preferredResolution: { width: 480, height: 270 },
          preferredFps: 20,
          audioPriority: 'high',
          // If in presentation, protect screen share; otherwise keep normal
          screenShareEnabled: true,
          captionsRecommended: false,
          semanticFallbackRecommended: false,
        };

      case 'poor':
        return {
          videoEnabled: true,
          preferredVideoQuality: 'low',
          preferredResolution: { width: 320, height: 180 },
          preferredFps: 15,
          audioPriority: 'high',
          // Screen share in presentation is prioritized over camera
          screenShareEnabled: isPresentation,
          captionsRecommended: true,
          semanticFallbackRecommended: false,
        };

      case 'critical':
        return {
          // In critical state: disable camera video to give 100% of bandwidth to Opus audio
          videoEnabled: false,
          preferredVideoQuality: 'minimal',
          preferredResolution: { width: 160, height: 90 },
          preferredFps: 10,
          audioPriority: 'critical',
          // Disable screen share unless explicitly in critical presentation
          screenShareEnabled: isPresentation,
          captionsRecommended: true,
          semanticFallbackRecommended: true,
        };

      case 'offline':
        return {
          videoEnabled: false,
          preferredVideoQuality: 'off',
          preferredFps: 0,
          audioPriority: 'critical',
          screenShareEnabled: false,
          captionsRecommended: true,
          semanticFallbackRecommended: true,
        };
    }
  }

  /**
   * Computes per-participant subscription policy:
   * - Active speaker gets prioritized video quality
   * - Screen sharer gets high subscription priority
   * - Background/non-speaking participants get downgraded or muted first
   * - Visible participants in viewport stay subscribed, hidden tiles paused
   */
  private computeParticipantPolicies(
    quality: NetworkQuality,
    context: MeetingContext,
    _mediaState?: Partial<CurrentMediaState>
  ): Map<string, ParticipantMediaPolicy> {
    const policies = new Map<string, ParticipantMediaPolicy>();
    const visibleSet = new Set(context.visibleParticipantIds ?? []);

    const isConstrained = quality === 'poor' || quality === 'critical';

    // If active speaker exists
    if (context.activeSpeakerId) {
      if (quality === 'critical') {
        policies.set(context.activeSpeakerId, {
          participantId: context.activeSpeakerId,
          videoQuality: 'low',
          videoEnabled: false, // audio priority in critical
          priority: 'high',
          reason: 'active_speaker',
        });
      } else if (quality === 'poor') {
        policies.set(context.activeSpeakerId, {
          participantId: context.activeSpeakerId,
          videoQuality: 'low',
          videoEnabled: true,
          priority: 'high',
          reason: 'active_speaker',
        });
      } else if (quality === 'fair') {
        policies.set(context.activeSpeakerId, {
          participantId: context.activeSpeakerId,
          videoQuality: 'medium',
          videoEnabled: true,
          priority: 'high',
          reason: 'active_speaker',
        });
      }
    }

    // Screen sharer priority
    if (context.screenShareOwnerId) {
      policies.set(context.screenShareOwnerId, {
        participantId: context.screenShareOwnerId,
        videoQuality: 'high',
        videoEnabled: true,
        priority: 'high',
        reason: 'screen_sharer',
      });
    }

    // If visible participants provided, mark non-visible ones for lower bandwidth
    if (context.visibleParticipantIds && context.visibleParticipantIds.length > 0) {
      for (const id of context.visibleParticipantIds) {
        if (!policies.has(id)) {
          policies.set(id, {
            participantId: id,
            videoQuality: isConstrained ? 'low' : 'medium',
            videoEnabled: quality !== 'critical',
            priority: 'normal',
            reason: 'visible',
          });
        }
      }
    }

    return policies;
  }
}
