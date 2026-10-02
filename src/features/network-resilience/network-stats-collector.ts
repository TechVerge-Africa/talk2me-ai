/**
 * WebRTC and LiveKit Statistics Collector
 *
 * Gathers low-level telemetry directly from LiveKit's peer connections:
 * - Candidate-pair metrics (RTT, transport state)
 * - Inbound-RTP metrics (packet loss, jitter, bytes received, frames dropped)
 * - Outbound-RTP metrics (bytes sent, packets sent)
 * - Computes deltas over sampling intervals to calculate throughput and loss rates.
 */

import { Room } from 'livekit-client';

export interface RawTelemetrySnapshot {
  timestamp: number;
  rttMs?: number;
  jitterMs?: number;
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  bytesSent: number;
  framesDropped: number;
  framesReceived: number;
  connectionState: string;
}

export interface ComputedIntervalMetrics {
  timestamp: number;
  rttMs?: number;
  jitterMs?: number;
  packetLossRate: number;
  packetsLostTotal: number;
  packetsReceivedTotal: number;
  downlinkKbps?: number;
  uplinkKbps?: number;
  framesDroppedTotal: number;
  framesReceivedTotal: number;
  connectionState: string;
}

export class NetworkStatsCollector {
  private previousSnapshot: RawTelemetrySnapshot | null = null;

  public reset(): void {
    this.previousSnapshot = null;
  }

  /**
   * Reads raw RTCStatsReports from subscriber and publisher peer connections
   */
  public async collect(room: Room | null): Promise<ComputedIntervalMetrics> {
    const now = Date.now();
    const connectionState = room ? room.state : (typeof navigator !== 'undefined' && !navigator.onLine ? 'disconnected' : 'offline');

    // Default snapshot baseline
    const snapshot: RawTelemetrySnapshot = {
      timestamp: now,
      packetsLost: 0,
      packetsReceived: 0,
      bytesReceived: 0,
      bytesSent: 0,
      framesDropped: 0,
      framesReceived: 0,
      connectionState,
    };

    if (!room || connectionState === 'disconnected') {
      return this.deriveMetrics(snapshot);
    }

    try {
      // Access peer connections via LiveKit engine
      // LiveKit engine exposes pcManager with publisher and subscriber PCTransport
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine = (room as any).engine;
      const pcManager = engine?.pcManager;

      const reports: RTCStatsReport[] = [];

      if (pcManager) {
        if (typeof pcManager.subscriber?.getStats === 'function') {
          try {
            const subStats = await pcManager.subscriber.getStats();
            if (subStats) reports.push(subStats);
          } catch {
            // peer connection may not be connected yet
          }
        }
        if (typeof pcManager.publisher?.getStats === 'function') {
          try {
            const pubStats = await pcManager.publisher.getStats();
            if (pubStats) reports.push(pubStats);
          } catch {
            // peer connection may not be connected yet
          }
        }
      }

      // Parse reports for candidate-pair, inbound-rtp, outbound-rtp
      let candidatePairRtt: number | undefined;
      let totalJitter = 0;
      let jitterCount = 0;

      for (const report of reports) {
        report.forEach((stat) => {
          // 1. Candidate pair RTT
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.nominated) {
            if (typeof stat.currentRoundTripTime === 'number') {
              candidatePairRtt = stat.currentRoundTripTime * 1000;
            } else if (typeof stat.roundTripTime === 'number') {
              candidatePairRtt = stat.roundTripTime * 1000;
            }
          }

          // 2. Inbound RTP (subscriber / remote media)
          if (stat.type === 'inbound-rtp') {
            if (typeof stat.packetsLost === 'number') {
              snapshot.packetsLost += Math.max(0, stat.packetsLost);
            }
            if (typeof stat.packetsReceived === 'number') {
              snapshot.packetsReceived += stat.packetsReceived;
            }
            if (typeof stat.bytesReceived === 'number') {
              snapshot.bytesReceived += stat.bytesReceived;
            }
            if (typeof stat.jitter === 'number') {
              totalJitter += stat.jitter * 1000;
              jitterCount++;
            }
            if (typeof stat.framesDropped === 'number') {
              snapshot.framesDropped += stat.framesDropped;
            }
            if (typeof stat.framesReceived === 'number') {
              snapshot.framesReceived += stat.framesReceived;
            }
          }

          // 3. Outbound RTP (publisher / local media)
          if (stat.type === 'outbound-rtp') {
            if (typeof stat.bytesSent === 'number') {
              snapshot.bytesSent += stat.bytesSent;
            }
            // Outbound RTT fallback from remote-inbound-rtp or roundTripTime
            if (candidatePairRtt === undefined && typeof stat.roundTripTime === 'number') {
              candidatePairRtt = stat.roundTripTime * 1000;
            }
          }

          // 4. Remote inbound RTP for outbound tracks
          if (stat.type === 'remote-inbound-rtp') {
            if (candidatePairRtt === undefined && typeof stat.roundTripTime === 'number') {
              candidatePairRtt = stat.roundTripTime * 1000;
            }
          }
        });
      }

      if (candidatePairRtt !== undefined) {
        snapshot.rttMs = Math.round(candidatePairRtt);
      }
      if (jitterCount > 0) {
        snapshot.jitterMs = Math.round(totalJitter / jitterCount);
      }

      // Supplementary fallback from navigator.connection if WebRTC is initializing
      if (snapshot.rttMs === undefined && typeof navigator !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = (navigator as any).connection;
        if (conn && typeof conn.rtt === 'number') {
          snapshot.rttMs = conn.rtt;
        }
      }
    } catch (e) {
      console.warn('[NetworkStatsCollector] Failed to collect stats:', e);
    }

    return this.deriveMetrics(snapshot);
  }

  private deriveMetrics(snapshot: RawTelemetrySnapshot): ComputedIntervalMetrics {
    const prev = this.previousSnapshot;
    this.previousSnapshot = snapshot;

    if (!prev) {
      return {
        timestamp: snapshot.timestamp,
        rttMs: snapshot.rttMs,
        jitterMs: snapshot.jitterMs,
        packetLossRate: 0,
        packetsLostTotal: snapshot.packetsLost,
        packetsReceivedTotal: snapshot.packetsReceived,
        framesDroppedTotal: snapshot.framesDropped,
        framesReceivedTotal: snapshot.framesReceived,
        connectionState: snapshot.connectionState,
      };
    }

    const elapsedSec = Math.max(0.2, (snapshot.timestamp - prev.timestamp) / 1000);

    // Delta packets
    const deltaLost = Math.max(0, snapshot.packetsLost - prev.packetsLost);
    const deltaReceived = Math.max(0, snapshot.packetsReceived - prev.packetsReceived);
    const totalDeltaPackets = deltaLost + deltaReceived;
    const packetLossRate = totalDeltaPackets > 0 ? deltaLost / totalDeltaPackets : 0;

    // Delta bytes -> kbps
    const deltaBytesReceived = Math.max(0, snapshot.bytesReceived - prev.bytesReceived);
    const deltaBytesSent = Math.max(0, snapshot.bytesSent - prev.bytesSent);

    const downlinkKbps = Math.round((deltaBytesReceived * 8) / (elapsedSec * 1000));
    const uplinkKbps = Math.round((deltaBytesSent * 8) / (elapsedSec * 1000));

    return {
      timestamp: snapshot.timestamp,
      rttMs: snapshot.rttMs,
      jitterMs: snapshot.jitterMs,
      packetLossRate: Math.min(1.0, Math.max(0, packetLossRate)),
      packetsLostTotal: snapshot.packetsLost,
      packetsReceivedTotal: snapshot.packetsReceived,
      downlinkKbps: downlinkKbps > 0 ? downlinkKbps : undefined,
      uplinkKbps: uplinkKbps > 0 ? uplinkKbps : undefined,
      framesDroppedTotal: snapshot.framesDropped,
      framesReceivedTotal: snapshot.framesReceived,
      connectionState: snapshot.connectionState,
    };
  }
}
