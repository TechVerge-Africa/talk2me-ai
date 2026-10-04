import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AdaptationController } from '../adaptation-controller';
import { NetworkMetrics, MeetingContext } from '../types';
import { DualTimescaleSmoother } from '../exponential-smoother';
import { OfflineQueue } from '../offline-queue';
import { OfflineStorage } from '../offline-storage';
import { ContinuityService } from '../continuity-service';

describe('Talk2Me Adaptive Network Resilience Engine', () => {
  const defaultContext: MeetingContext = {
    screenShareActive: false,
    totalParticipants: 4,
    visibleParticipantIds: ['p1', 'p2', 'p3'],
    activeSpeakerId: 'p1',
    meetingMode: 'normal',
  };

  it('Scenario A: High bandwidth, low loss, low RTT -> High-quality video, normal audio', () => {
    const controller = new AdaptationController();
    const metrics: NetworkMetrics = {
      timestamp: 10000,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 5000,
      rttMs: 30,
      jitterMs: 5,
      packetLossRate: 0.001,
      stabilityScore: 98,
    };

    const policy = controller.evaluate(metrics, defaultContext);

    assert.equal(policy.videoEnabled, true);
    assert.equal(policy.preferredVideoQuality, 'high');
    assert.equal(policy.audioPriority, 'normal');
    assert.equal(policy.captionsRecommended, false);
    assert.equal(policy.screenShareEnabled, true);
  });

  it('Scenario B: Bandwidth decreases gradually -> High -> medium -> low video without oscillation', () => {
    const controller = new AdaptationController();

    // 1. Initial Excellent
    const step1 = controller.evaluate({
      timestamp: 10000,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 5000,
      rttMs: 30,
      packetLossRate: 0.001,
      stabilityScore: 98,
    }, defaultContext);
    assert.equal(step1.preferredVideoQuality, 'high');

    // 2. Bandwidth drops to Good
    // First observation: candidate entered, still in excellent until dwell time
    controller.evaluate({
      timestamp: 10500,
      quality: 'good',
      connectionState: 'connected',
      estimatedDownlinkKbps: 1200,
      rttMs: 90,
      packetLossRate: 0.01,
      stabilityScore: 85,
    }, defaultContext);

    // After downgrade dwell time (1500ms)
    const step2 = controller.evaluate({
      timestamp: 12100,
      quality: 'good',
      connectionState: 'connected',
      estimatedDownlinkKbps: 1200,
      rttMs: 90,
      packetLossRate: 0.01,
      stabilityScore: 85,
    }, defaultContext);
    assert.equal(step2.preferredVideoQuality, 'medium');

    // 3. Bandwidth drops further to Fair
    controller.evaluate({
      timestamp: 13700,
      quality: 'fair',
      connectionState: 'connected',
      estimatedDownlinkKbps: 600,
      rttMs: 160,
      packetLossRate: 0.025,
      stabilityScore: 75,
    }, defaultContext);
    const step3 = controller.evaluate({
      timestamp: 15300,
      quality: 'fair',
      connectionState: 'connected',
      estimatedDownlinkKbps: 600,
      rttMs: 160,
      packetLossRate: 0.025,
      stabilityScore: 75,
    }, defaultContext);
    assert.equal(step3.preferredVideoQuality, 'medium');
    assert.equal(step3.audioPriority, 'high'); // audio prioritized in fair

    // 4. Bandwidth drops to Poor
    controller.evaluate({
      timestamp: 16900,
      quality: 'poor',
      connectionState: 'connected',
      estimatedDownlinkKbps: 250,
      rttMs: 310,
      packetLossRate: 0.09,
      stabilityScore: 60,
    }, defaultContext);
    const step4 = controller.evaluate({
      timestamp: 18500,
      quality: 'poor',
      connectionState: 'connected',
      estimatedDownlinkKbps: 250,
      rttMs: 310,
      packetLossRate: 0.09,
      stabilityScore: 60,
    }, defaultContext);
    assert.equal(step4.preferredVideoQuality, 'low');
    assert.equal(step4.audioPriority, 'high');
    assert.equal(step4.captionsRecommended, true);
  });

  it('Scenario C: High packet loss -> Video decreases, audio remains prioritized', () => {
    const controller = new AdaptationController();
    // Simulate high packet loss (22% loss, critical condition)
    controller.evaluate({
      timestamp: 10000,
      quality: 'critical',
      connectionState: 'connected',
      estimatedDownlinkKbps: 100,
      rttMs: 550,
      packetLossRate: 0.22,
      stabilityScore: 25,
    }, defaultContext);

    // After downgrade dwell time
    const policy = controller.evaluate({
      timestamp: 12000,
      quality: 'critical',
      connectionState: 'connected',
      estimatedDownlinkKbps: 100,
      rttMs: 550,
      packetLossRate: 0.22,
      stabilityScore: 25,
    }, defaultContext);

    // Video is disabled or minimal to prioritize 100% of bandwidth for audio
    assert.equal(policy.videoEnabled, false);
    assert.equal(policy.preferredVideoQuality, 'minimal');
    assert.equal(policy.audioPriority, 'critical');
    assert.equal(policy.captionsRecommended, true);
  });

  it('Scenario D: Temporary network spike -> No immediate drastic mode change', () => {
    const controller = new AdaptationController();
    controller.reset('excellent');

    // Single instantaneous spike with high packet loss
    const policyDuringSpike = controller.evaluate({
      timestamp: 10000,
      quality: 'poor',
      connectionState: 'connected',
      estimatedDownlinkKbps: 200,
      rttMs: 400,
      packetLossRate: 0.15,
      stabilityScore: 40,
    }, defaultContext);

    // Because dwell time (1500ms) has not elapsed, mode remains excellent
    assert.equal(controller.getCurrentQuality(), 'excellent');
    assert.equal(policyDuringSpike.preferredVideoQuality, 'high');

    // Next tick: spike is gone, network is back to excellent
    const policyAfterSpike = controller.evaluate({
      timestamp: 10800,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 4500,
      rttMs: 35,
      packetLossRate: 0.002,
      stabilityScore: 95,
    }, defaultContext);

    assert.equal(controller.getCurrentQuality(), 'excellent');
    assert.equal(policyAfterSpike.preferredVideoQuality, 'high');
  });

  it('Scenario E: Sustained poor network -> Transitions to poor mode', () => {
    const controller = new AdaptationController();
    controller.reset('excellent');

    // First poor tick at t = 10000ms
    controller.evaluate({
      timestamp: 10000,
      quality: 'poor',
      connectionState: 'connected',
      estimatedDownlinkKbps: 250,
      rttMs: 340,
      packetLossRate: 0.09,
      stabilityScore: 50,
    }, defaultContext);

    // Sustained poor tick at t = 12000ms (> 1500ms downgrade dwell time)
    const policy = controller.evaluate({
      timestamp: 12000,
      quality: 'poor',
      connectionState: 'connected',
      estimatedDownlinkKbps: 250,
      rttMs: 340,
      packetLossRate: 0.09,
      stabilityScore: 50,
    }, defaultContext);

    assert.equal(controller.getCurrentQuality(), 'poor');
    assert.equal(policy.preferredVideoQuality, 'low');
    assert.equal(policy.captionsRecommended, true);
  });

  it('Scenario F: Network recovers -> Gradual recovery, not instant HD', () => {
    const controller = new AdaptationController();
    controller.reset('poor');

    // First recovery tick: telemetry says excellent
    controller.evaluate({
      timestamp: 10000,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 5000,
      rttMs: 30,
      packetLossRate: 0.001,
      stabilityScore: 95,
    }, defaultContext);

    // At t = 12000ms (only 2s elapsed, less than 6s upgrade dwell time): remains in poor
    const interimPolicy = controller.evaluate({
      timestamp: 12000,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 5000,
      rttMs: 30,
      packetLossRate: 0.001,
      stabilityScore: 95,
    }, defaultContext);
    assert.equal(controller.getCurrentQuality(), 'poor');
    assert.equal(interimPolicy.preferredVideoQuality, 'low');

    // At t = 16500ms (> 6s sustained upgrade dwell time): recovers gradually (steps to fair, not directly to excellent HD!)
    const stepUpFairPolicy = controller.evaluate({
      timestamp: 16500,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 5000,
      rttMs: 30,
      packetLossRate: 0.001,
      stabilityScore: 95,
    }, defaultContext);
    assert.equal(controller.getCurrentQuality(), 'fair'); // gradual step up!
    assert.equal(stepUpFairPolicy.preferredVideoQuality, 'medium');

    // And after another dwell time at t = 23000ms (> 6s): steps up to good
    controller.evaluate({
      timestamp: 17000,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 5000,
      rttMs: 30,
      packetLossRate: 0.001,
      stabilityScore: 95,
    }, defaultContext);
    const stepUpGoodPolicy = controller.evaluate({
      timestamp: 23500,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 5000,
      rttMs: 30,
      packetLossRate: 0.001,
      stabilityScore: 95,
    }, defaultContext);
    assert.equal(controller.getCurrentQuality(), 'good');
    assert.equal(stepUpGoodPolicy.preferredVideoQuality, 'medium');

    // And finally after another dwell time at t = 30000ms: reaches excellent HD
    controller.evaluate({
      timestamp: 24000,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 5000,
      rttMs: 30,
      packetLossRate: 0.001,
      stabilityScore: 95,
    }, defaultContext);
    const recoveredPolicy = controller.evaluate({
      timestamp: 30500,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 5000,
      rttMs: 30,
      packetLossRate: 0.001,
      stabilityScore: 95,
    }, defaultContext);
    assert.equal(controller.getCurrentQuality(), 'excellent');
    assert.equal(recoveredPolicy.preferredVideoQuality, 'high');
  });

  it('Scenario G: Network disappears -> Offline state and local state preserved', async () => {
    const controller = new AdaptationController();
    const storage = new OfflineStorage();
    const continuity = new ContinuityService('test-room-1', 'meeting-123', storage);

    // Network disconnects
    const policy = controller.evaluate({
      timestamp: 10000,
      quality: 'offline',
      connectionState: 'disconnected',
      stabilityScore: 0,
    }, defaultContext);

    assert.equal(controller.getCurrentQuality(), 'offline');
    assert.equal(policy.videoEnabled, false);
    assert.equal(policy.preferredVideoQuality, 'off');
    assert.equal(policy.screenShareEnabled, false);
    assert.equal(policy.captionsRecommended, true);
    assert.equal(policy.semanticFallbackRecommended, true);

    // Preserve local state
    continuity.onNetworkCritical();
    await continuity.preserveMeetingState();

    const savedState = await storage.getMeetingState('test-room-1');
    assert.ok(savedState);
    assert.equal(savedState?.roomCode, 'test-room-1');
    assert.equal(savedState?.meetingId, 'meeting-123');
  });

  it('Scenario H: Network returns -> Reconnection and state synchronization', async () => {
    const storage = new OfflineStorage();
    const queue = new OfflineQueue(storage);
    const continuity = new ContinuityService('test-room-1', 'meeting-123', storage);

    // 1. Buffer transcript and offline action while disconnected
    await storage.saveTranscriptChunk({
      id: 'chunk-1',
      roomCode: 'test-room-1',
      speaker: 'Alex',
      text: 'We agreed to proceed with the release.',
      timestamp: 10500,
    });

    let syncExecuted = false;
    queue.registerHandler('chat_message', async (item) => {
      const p = item.payload as { text: string };
      if (p.text === 'Hello team') {
        syncExecuted = true;
        return true;
      }
      return false;
    });

    await queue.enqueue('chat_message', { text: 'Hello team' }, 'msg-idem-1');

    // 2. Network returns
    continuity.onNetworkRecovered();
    const syncResult = await queue.flush();

    assert.equal(syncExecuted, true);
    assert.equal(syncResult.synced, 1);
    assert.equal(syncResult.failed, 0);

    // 3. Query missed context
    const missed = await continuity.getMissedMeetingContext(10000, 11000);
    assert.equal(missed.missedTranscripts.length, 1);
    assert.equal(missed.missedTranscripts[0].speaker, 'Alex');
    assert.ok(missed.summary?.includes('Alex'));
  });

  it('Smoothing: Dual-timescale exponential smoother resists noise', () => {
    const smoother = new DualTimescaleSmoother(0.5, 0.15);

    // Baseline 100ms
    smoother.update({ rttMs: 100, packetLossRate: 0 });
    smoother.update({ rttMs: 100, packetLossRate: 0 });

    // Sudden 1-sample spike to 600ms
    const res = smoother.update({ rttMs: 600, packetLossRate: 0.1 });

    // Fast signal reacts, but slow baseline remains anchored
    assert.ok(res.rtt !== null);
    assert.ok(res.rtt.fast > 200, 'Fast signal should react to spike');
    assert.ok(res.rtt.slow < 200, 'Slow signal should dampen spike');
    assert.ok(res.stabilityScore < 100, 'Stability score should reflect spike');
  });

  it('Active speaker priority: Active speaker retains video while others are downgraded', () => {
    const controller = new AdaptationController();
    controller.reset('poor');

    const contextWithSpeaker: MeetingContext = {
      activeSpeakerId: 'speaker-bob',
      screenShareActive: false,
      visibleParticipantIds: ['speaker-bob', 'participant-alice', 'participant-carol'],
      totalParticipants: 3,
    };

    const policy = controller.evaluate({
      timestamp: 15000,
      quality: 'poor',
      connectionState: 'connected',
      estimatedDownlinkKbps: 280,
      rttMs: 330,
      packetLossRate: 0.08,
      stabilityScore: 55,
    }, contextWithSpeaker);

    const bobPolicy = policy.participantPolicies?.get('speaker-bob');
    const alicePolicy = policy.participantPolicies?.get('participant-alice');

    assert.ok(bobPolicy);
    assert.equal(bobPolicy?.videoEnabled, true);
    assert.equal(bobPolicy?.priority, 'high');
    assert.equal(bobPolicy?.reason, 'active_speaker');

    assert.ok(alicePolicy);
    assert.equal(alicePolicy?.priority, 'normal');
  });

  it('Scenario I: Background tab switching -> Preserves high-priority audio and continuous camera/video without cutoffs', () => {
    const controller = new AdaptationController();
    controller.reset('excellent', 0);

    const backgroundContext: MeetingContext = {
      activeSpeakerId: 'speaker-bob',
      screenShareActive: false,
      visibleParticipantIds: ['speaker-bob', 'participant-alice'],
      totalParticipants: 2,
      isBackgrounded: true,
    };

    const policy = controller.evaluate({
      timestamp: 1000,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 3500,
      rttMs: 40,
      packetLossRate: 0,
      stabilityScore: 98,
    }, backgroundContext);

    // Audio priority is elevated to high to protect against OS background throttling,
    // while video remains continuously enabled and streaming (Zoom/Meet standard)
    assert.equal(policy.videoEnabled, true);
    assert.equal(policy.preferredVideoQuality, 'high');
    assert.equal(policy.audioPriority, 'high');
    assert.equal(policy.captionsRecommended, false);

    const bobPolicy = policy.participantPolicies?.get('speaker-bob');
    assert.ok(bobPolicy);
    // Active speaker video remains enabled to power Picture-in-Picture window
    assert.equal(bobPolicy?.videoEnabled, true);
    assert.equal(bobPolicy?.priority, 'high');
  });

  it('Scenario J: Foreground return -> Restores target video smoothly without oscillation', () => {
    const controller = new AdaptationController();
    controller.reset('excellent', 0);

    const foregroundContext: MeetingContext = {
      activeSpeakerId: 'speaker-bob',
      screenShareActive: false,
      visibleParticipantIds: ['speaker-bob', 'participant-alice'],
      totalParticipants: 2,
      isBackgrounded: false,
    };

    const policy = controller.evaluate({
      timestamp: 3000,
      quality: 'excellent',
      connectionState: 'connected',
      estimatedDownlinkKbps: 1800,
      rttMs: 42,
      packetLossRate: 0,
      stabilityScore: 97,
    }, foregroundContext);

    assert.equal(policy.videoEnabled, true);
    assert.equal(policy.preferredVideoQuality, 'high');
    assert.equal(policy.audioPriority, 'normal');
  });
});
