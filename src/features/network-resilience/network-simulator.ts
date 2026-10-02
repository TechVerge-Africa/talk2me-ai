/**
 * Talk2Me Network Simulation Engine
 *
 * Developer tool to simulate degraded network environments,
 * sudden packet loss spikes, and recovery scenarios directly in the application.
 */

import { NetworkMetrics, NetworkQuality, NetworkSimulationConfig } from './types';
import { NetworkMonitor } from './network-monitor';

export interface SimulationPreset {
  id: string;
  name: string;
  description: string;
  quality: NetworkQuality;
  metrics: {
    downlinkKbps: number;
    uplinkKbps: number;
    rttMs: number;
    jitterMs: number;
    packetLossRate: number;
  };
}

export const SIMULATION_PRESETS: SimulationPreset[] = [
  {
    id: 'excellent_fiber',
    name: 'Excellent (Fiber / 5G)',
    description: 'Low latency, high bandwidth, 0% packet loss',
    quality: 'excellent',
    metrics: {
      downlinkKbps: 25000,
      uplinkKbps: 8000,
      rttMs: 25,
      jitterMs: 5,
      packetLossRate: 0.001,
    },
  },
  {
    id: 'good_wifi',
    name: 'Good (Home Wi-Fi / LTE)',
    description: 'Standard home broadband, minimal packet loss',
    quality: 'good',
    metrics: {
      downlinkKbps: 5000,
      uplinkKbps: 1800,
      rttMs: 65,
      jitterMs: 12,
      packetLossRate: 0.008,
    },
  },
  {
    id: 'fair_congested',
    name: 'Fair (Congested Coffee Shop / 4G)',
    description: 'Throttled bandwidth, moderate latency',
    quality: 'fair',
    metrics: {
      downlinkKbps: 800,
      uplinkKbps: 350,
      rttMs: 160,
      jitterMs: 35,
      packetLossRate: 0.03,
    },
  },
  {
    id: 'poor_lossy',
    name: 'Poor (Rural 3G / High Loss)',
    description: 'Noticeable packet loss, high RTT, low bandwidth',
    quality: 'poor',
    metrics: {
      downlinkKbps: 280,
      uplinkKbps: 120,
      rttMs: 380,
      jitterMs: 65,
      packetLossRate: 0.12,
    },
  },
  {
    id: 'critical_edge',
    name: 'Critical (Elevator / Edge of Cell)',
    description: 'Severe packet loss, audio-only priority mode',
    quality: 'critical',
    metrics: {
      downlinkKbps: 80,
      uplinkKbps: 40,
      rttMs: 680,
      jitterMs: 140,
      packetLossRate: 0.28,
    },
  },
  {
    id: 'offline_tunnel',
    name: 'Offline (Tunnel / Disconnected)',
    description: 'Complete connectivity loss, local buffer mode',
    quality: 'offline',
    metrics: {
      downlinkKbps: 0,
      uplinkKbps: 0,
      rttMs: 9999,
      jitterMs: 9999,
      packetLossRate: 1.0,
    },
  },
];

export class NetworkSimulator {
  private monitor: NetworkMonitor;
  private config: NetworkSimulationConfig = { enabled: false };

  constructor(monitor: NetworkMonitor) {
    this.monitor = monitor;
  }

  public enablePreset(presetId: string): void {
    const preset = SIMULATION_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.config = {
      enabled: true,
      forcedQuality: preset.quality,
      downlinkKbps: preset.metrics.downlinkKbps,
      rttMs: preset.metrics.rttMs,
      jitterMs: preset.metrics.jitterMs,
      packetLossRate: preset.metrics.packetLossRate,
    };

    this.applyToMonitor();
  }

  public setCustomSimulation(custom: Partial<NetworkSimulationConfig>): void {
    this.config = {
      ...this.config,
      ...custom,
      enabled: true,
    };
    this.applyToMonitor();
  }

  public disable(): void {
    this.config = { enabled: false };
    this.monitor.setSimulationOverride(null);
  }

  public getConfig(): NetworkSimulationConfig {
    return this.config;
  }

  private applyToMonitor(): void {
    if (!this.config.enabled) {
      this.monitor.setSimulationOverride(null);
      return;
    }

    const override: Partial<NetworkMetrics> = {
      quality: this.config.forcedQuality,
      estimatedDownlinkKbps: this.config.downlinkKbps,
      rttMs: this.config.rttMs,
      jitterMs: this.config.jitterMs,
      packetLossRate: this.config.packetLossRate,
      connectionState: this.config.forcedQuality === 'offline' ? 'disconnected' : 'connected',
    };

    this.monitor.setSimulationOverride(override);
  }
}
