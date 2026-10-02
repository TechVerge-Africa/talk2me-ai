import { AdaptationConfig } from './types';

export const DEFAULT_ADAPTATION_CONFIG: AdaptationConfig = {
  pollIntervalMs: 1500, // 1.5s sampling interval
  smoothingFastAlpha: 0.5,  // Fast EMA (reacts in ~2 steps to sudden drops)
  smoothingSlowAlpha: 0.15, // Slow EMA (baseline tracking, smooths fluctuations)

  upgradeDwellTimeMs: 6000,   // Must sustain improved conditions for 6s before stepping up
  downgradeDwellTimeMs: 1500, // Can downgrade in 1.5s if severe degradation detected

  thresholds: {
    poorToCritical: {
      maxPacketLoss: 0.18,      // > 18% packet loss
      maxRttMs: 500,            // > 500ms RTT
      minDownlinkKbps: 150,     // < 150 kbps
    },
    fairToPoor: {
      maxPacketLoss: 0.08,      // > 8% packet loss
      maxRttMs: 320,            // > 320ms RTT
      minDownlinkKbps: 350,     // < 350 kbps
    },
    goodToFair: {
      maxPacketLoss: 0.035,     // > 3.5% packet loss
      maxRttMs: 200,            // > 200ms RTT
      minDownlinkKbps: 700,     // < 700 kbps
    },
    excellentToGood: {
      maxPacketLoss: 0.015,     // > 1.5% packet loss
      maxRttMs: 120,            // > 120ms RTT
      minDownlinkKbps: 1400,    // < 1.4 Mbps
    },

    recovery: {
      criticalToPoor: {
        maxPacketLoss: 0.10,     // <= 10% packet loss
        maxRttMs: 350,           // <= 350ms RTT
        minDownlinkKbps: 250,    // >= 250 kbps
      },
      poorToFair: {
        maxPacketLoss: 0.05,     // <= 5% packet loss
        maxRttMs: 220,           // <= 220ms RTT
        minDownlinkKbps: 500,    // >= 500 kbps
      },
      fairToGood: {
        maxPacketLoss: 0.02,     // <= 2% packet loss
        maxRttMs: 150,           // <= 150ms RTT
        minDownlinkKbps: 1000,   // >= 1 Mbps
      },
      goodToExcellent: {
        maxPacketLoss: 0.008,    // <= 0.8% packet loss
        maxRttMs: 80,            // <= 80ms RTT
        minDownlinkKbps: 1800,   // >= 1.8 Mbps
      },
    },
  },
};
