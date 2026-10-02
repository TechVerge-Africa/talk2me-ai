/**
 * NetworkMonitor
 *
 * Coordinates periodic telemetry polling, dual-timescale smoothing,
 * stability estimation, and network quality classification.
 */

import { Room, RoomEvent, ConnectionQuality } from 'livekit-client';
import { NetworkMetrics, NetworkQuality, AdaptationConfig } from './types';
import { DEFAULT_ADAPTATION_CONFIG } from './config';
import { NetworkStatsCollector } from './network-stats-collector';
import { DualTimescaleSmoother } from './exponential-smoother';

export type NetworkMetricsListener = (metrics: NetworkMetrics) => void;

export class NetworkMonitor {
  private room: Room | null = null;
  private config: AdaptationConfig;
  private collector: NetworkStatsCollector;
  private smoother: DualTimescaleSmoother;

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<NetworkMetricsListener> = new Set();

  private latestMetrics: NetworkMetrics;
  private simulationOverride: Partial<NetworkMetrics> | null = null;

  constructor(config: AdaptationConfig = DEFAULT_ADAPTATION_CONFIG) {
    this.config = config;
    this.collector = new NetworkStatsCollector();
    this.smoother = new DualTimescaleSmoother(
      config.smoothingFastAlpha,
      config.smoothingSlowAlpha
    );

    this.latestMetrics = {
      timestamp: Date.now(),
      connectionState: 'idle',
      quality: 'excellent',
      stabilityScore: 100,
      packetLossRate: 0,
    };
  }

  public attachRoom(room: Room | null): void {
    if (this.room === room) return;
    this.detachRoom();
    this.room = room;

    if (this.room) {
      this.room.on(RoomEvent.ConnectionStateChanged, this.handleConnectionStateChange);
      this.room.on(RoomEvent.ConnectionQualityChanged, this.handleConnectionQualityChange);
    }
  }

  public detachRoom(): void {
    if (this.room) {
      try {
        this.room.off(RoomEvent.ConnectionStateChanged, this.handleConnectionStateChange);
        this.room.off(RoomEvent.ConnectionQualityChanged, this.handleConnectionQualityChange);
      } catch {
        // ignore
      }
      this.room = null;
    }
    this.collector.reset();
  }

  public start(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      this.tick();
    }, this.config.pollIntervalMs);

    // Initial tick immediately
    this.tick();
  }

  public stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public subscribe(listener: NetworkMetricsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getLatestMetrics(): NetworkMetrics {
    return this.latestMetrics;
  }

  public setSimulationOverride(override: Partial<NetworkMetrics> | null): void {
    this.simulationOverride = override;
    this.tick();
  }

  public setConfig(newConfig: Partial<AdaptationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.smoother.setAlphas(this.config.smoothingFastAlpha, this.config.smoothingSlowAlpha);
  }

  private handleConnectionStateChange = (state: string): void => {
    this.tick(state);
  };

  private handleConnectionQualityChange = (): void => {
    this.tick();
  };

  /**
   * Main polling tick: collects stats, smooths them, classifies quality, and notifies listeners.
   */
  public async tick(explicitState?: string): Promise<NetworkMetrics> {
    const raw = await this.collector.collect(this.room);

    // Determine raw connection state
    const isBrowserOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const connState = explicitState || (isBrowserOffline ? 'offline' : (this.room?.state ?? raw.connectionState));

    // Smooth measurements
    const smoothed = this.smoother.update({
      rttMs: raw.rttMs,
      packetLossRate: raw.packetLossRate,
      downlinkKbps: raw.downlinkKbps,
      jitterMs: raw.jitterMs,
    });

    const effectiveLossRate = smoothed.packetLoss ? smoothed.packetLoss.fast : raw.packetLossRate;
    const effectiveRtt = smoothed.rtt ? smoothed.rtt.fast : raw.rttMs;
    const effectiveDownlink = smoothed.downlinkKbps ? smoothed.downlinkKbps.slow : raw.downlinkKbps;
    const effectiveJitter = smoothed.jitter ? smoothed.jitter.fast : raw.jitterMs;

    // Synthesize quality classification
    let quality: NetworkQuality = 'excellent';

    if (connState === 'disconnected' || connState === 'offline' || isBrowserOffline) {
      quality = 'offline';
    } else if (connState === 'reconnecting') {
      quality = 'critical';
    } else {
      // Evaluate based on smoothed telemetry thresholds
      const t = this.config.thresholds;

      const isCriticalLoss = effectiveLossRate >= t.poorToCritical.maxPacketLoss;
      const isCriticalRtt = effectiveRtt !== undefined && effectiveRtt >= t.poorToCritical.maxRttMs;
      const isCriticalBw = effectiveDownlink !== undefined && effectiveDownlink < t.poorToCritical.minDownlinkKbps;

      const isPoorLoss = effectiveLossRate >= t.fairToPoor.maxPacketLoss;
      const isPoorRtt = effectiveRtt !== undefined && effectiveRtt >= t.fairToPoor.maxRttMs;
      const isPoorBw = effectiveDownlink !== undefined && effectiveDownlink < t.fairToPoor.minDownlinkKbps;

      const isFairLoss = effectiveLossRate >= t.goodToFair.maxPacketLoss;
      const isFairRtt = effectiveRtt !== undefined && effectiveRtt >= t.goodToFair.maxRttMs;
      const isFairBw = effectiveDownlink !== undefined && effectiveDownlink < t.goodToFair.minDownlinkKbps;

      const isGoodLoss = effectiveLossRate >= t.excellentToGood.maxPacketLoss;
      const isGoodRtt = effectiveRtt !== undefined && effectiveRtt >= t.excellentToGood.maxRttMs;
      const isGoodBw = effectiveDownlink !== undefined && effectiveDownlink < t.excellentToGood.minDownlinkKbps;

      if (isCriticalLoss || isCriticalRtt || isCriticalBw) {
        quality = 'critical';
      } else if (isPoorLoss || isPoorRtt || isPoorBw) {
        quality = 'poor';
      } else if (isFairLoss || isFairRtt || isFairBw) {
        quality = 'fair';
      } else if (isGoodLoss || isGoodRtt || isGoodBw) {
        quality = 'good';
      } else {
        quality = 'excellent';
      }

      // Supplementary check: if LiveKit reports connectionQuality as Lost or Poor
      if (this.room?.localParticipant?.connectionQuality === ConnectionQuality.Lost) {
        quality = 'critical';
      } else if (this.room?.localParticipant?.connectionQuality === ConnectionQuality.Poor && quality === 'excellent') {
        quality = 'fair';
      }
    }

    let synthesized: NetworkMetrics = {
      timestamp: raw.timestamp,
      rttMs: effectiveRtt,
      jitterMs: effectiveJitter,
      packetsLost: raw.packetsLostTotal,
      packetsReceived: raw.packetsReceivedTotal,
      packetLossRate: effectiveLossRate,
      bytesReceived: raw.downlinkKbps ? Math.round(raw.downlinkKbps * 125) : undefined,
      bytesSent: raw.uplinkKbps ? Math.round(raw.uplinkKbps * 125) : undefined,
      estimatedDownlinkKbps: effectiveDownlink,
      estimatedUplinkKbps: raw.uplinkKbps,
      framesDropped: raw.framesDroppedTotal,
      framesReceived: raw.framesReceivedTotal,
      connectionState: connState,
      quality,
      stabilityScore: smoothed.stabilityScore,
    };

    // Apply simulation override if present
    if (this.simulationOverride) {
      synthesized = {
        ...synthesized,
        ...this.simulationOverride,
      };
    }

    this.latestMetrics = synthesized;
    this.notify();
    return synthesized;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.latestMetrics);
      } catch (e) {
        console.error('[NetworkMonitor] Error in metrics listener:', e);
      }
    }
  }
}
