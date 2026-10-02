/**
 * Exponential Moving Average (EMA) and Stability Estimator
 *
 * Implements dual-timescale smoothing:
 * - Fast EMA: reacts quickly to sudden drops and burst losses.
 * - Slow EMA: tracks sustained network performance to avoid oscillation.
 */

export interface SmoothedMetric {
  fast: number;
  slow: number;
}

export class DualTimescaleSmoother {
  private fastAlpha: number;
  private slowAlpha: number;

  private rtt: SmoothedMetric | null = null;
  private packetLoss: SmoothedMetric | null = null;
  private downlinkKbps: SmoothedMetric | null = null;
  private jitter: SmoothedMetric | null = null;

  private lossHistory: number[] = [];
  private rttHistory: number[] = [];
  private maxHistorySamples = 10;

  constructor(fastAlpha = 0.5, slowAlpha = 0.15) {
    this.fastAlpha = Math.max(0.01, Math.min(1.0, fastAlpha));
    this.slowAlpha = Math.max(0.01, Math.min(1.0, slowAlpha));
  }

  public setAlphas(fastAlpha: number, slowAlpha: number): void {
    this.fastAlpha = Math.max(0.01, Math.min(1.0, fastAlpha));
    this.slowAlpha = Math.max(0.01, Math.min(1.0, slowAlpha));
  }

  public reset(): void {
    this.rtt = null;
    this.packetLoss = null;
    this.downlinkKbps = null;
    this.jitter = null;
    this.lossHistory = [];
    this.rttHistory = [];
  }

  private stepValue(current: SmoothedMetric | null, rawValue: number | undefined): SmoothedMetric | null {
    if (rawValue === undefined || isNaN(rawValue) || rawValue < 0) {
      return current;
    }
    if (current === null) {
      return { fast: rawValue, slow: rawValue };
    }
    return {
      fast: this.fastAlpha * rawValue + (1 - this.fastAlpha) * current.fast,
      slow: this.slowAlpha * rawValue + (1 - this.slowAlpha) * current.slow,
    };
  }

  public update(raw: {
    rttMs?: number;
    packetLossRate?: number;
    downlinkKbps?: number;
    jitterMs?: number;
  }): {
    rtt: SmoothedMetric | null;
    packetLoss: SmoothedMetric | null;
    downlinkKbps: SmoothedMetric | null;
    jitter: SmoothedMetric | null;
    stabilityScore: number;
  } {
    this.rtt = this.stepValue(this.rtt, raw.rttMs);
    this.packetLoss = this.stepValue(this.packetLoss, raw.packetLossRate);
    this.downlinkKbps = this.stepValue(this.downlinkKbps, raw.downlinkKbps);
    this.jitter = this.stepValue(this.jitter, raw.jitterMs);

    if (raw.packetLossRate !== undefined) {
      this.lossHistory.push(raw.packetLossRate);
      if (this.lossHistory.length > this.maxHistorySamples) this.lossHistory.shift();
    }
    if (raw.rttMs !== undefined) {
      this.rttHistory.push(raw.rttMs);
      if (this.rttHistory.length > this.maxHistorySamples) this.rttHistory.shift();
    }

    const stabilityScore = this.computeStabilityScore();

    return {
      rtt: this.rtt,
      packetLoss: this.packetLoss,
      downlinkKbps: this.downlinkKbps,
      jitter: this.jitter,
      stabilityScore,
    };
  }

  /**
   * Computes a normalized stability score from 0 (very unstable) to 100 (rock solid).
   * Penalizes:
   * 1. Packet loss rate and sudden loss spikes.
   * 2. High variance between fast and slow signals (indicating erratic jitter).
   * 3. Excessive RTT swings.
   */
  private computeStabilityScore(): number {
    let score = 100;

    // 1. Loss penalty
    const loss = this.packetLoss ? Math.max(this.packetLoss.fast, this.packetLoss.slow) : 0;
    if (loss > 0) {
      // 0% -> 0 penalty, 5% loss -> -25 pts, 20% loss -> -80 pts
      score -= Math.min(80, loss * 400);
    }

    // 2. Fast vs Slow divergence penalty (shows sudden divergence/instability)
    if (this.rtt) {
      const rttDiff = Math.abs(this.rtt.fast - this.rtt.slow);
      const rttBaseline = Math.max(50, this.rtt.slow);
      const divergenceRatio = rttDiff / rttBaseline;
      score -= Math.min(30, divergenceRatio * 40);
    }

    // 3. Jitter penalty
    const jitter = this.jitter ? this.jitter.fast : 0;
    if (jitter > 30) {
      score -= Math.min(25, (jitter - 30) * 0.5);
    }

    // 4. Loss variance over recent history
    if (this.lossHistory.length >= 3) {
      const mean = this.lossHistory.reduce((a, b) => a + b, 0) / this.lossHistory.length;
      const variance = this.lossHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.lossHistory.length;
      if (variance > 0.001) {
        score -= Math.min(20, variance * 1000);
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  public getFastValues() {
    return {
      rttMs: this.rtt?.fast,
      packetLossRate: this.packetLoss?.fast,
      downlinkKbps: this.downlinkKbps?.fast,
      jitterMs: this.jitter?.fast,
    };
  }

  public getSlowValues() {
    return {
      rttMs: this.rtt?.slow,
      packetLossRate: this.packetLoss?.slow,
      downlinkKbps: this.downlinkKbps?.slow,
      jitterMs: this.jitter?.slow,
    };
  }
}
