/**
 * LiveKit Media Policy Adapter
 *
 * Applies the AdaptationController's MediaPolicy to LiveKit primitives
 * without fighting WebRTC or LiveKit's internal congestion controller:
 * - Selects simulcast quality layers via `setPublishingQuality`
 * - Controls upstream pausing (`pauseUpstream` / `resumeUpstream`)
 * - Adapts remote track subscriptions (`setVideoQuality`, `setEnabled`)
 * - Respects active speaker and presentation priorities
 */

import { Room, VideoQuality, Track, LocalVideoTrack, RemoteTrackPublication } from 'livekit-client';
import { MediaPolicy, PreferredVideoQuality } from './types';

export class LiveKitAdapter {
  private lastAppliedQuality: PreferredVideoQuality | null = null;
  private isUpstreamPaused = false;

  private mapQualityToLiveKit(quality: PreferredVideoQuality): VideoQuality {
    switch (quality) {
      case 'high':
        return VideoQuality.HIGH;
      case 'medium':
        return VideoQuality.MEDIUM;
      case 'low':
      case 'minimal':
        return VideoQuality.LOW;
      default:
        return VideoQuality.LOW;
    }
  }

  /**
   * Applies the calculated media policy to the active LiveKit room
   */
  public async applyPolicy(room: Room | null, policy: MediaPolicy): Promise<void> {
    if (!room || room.state !== 'connected') {
      return;
    }

    try {
      // 1. Adapt local video publisher
      await this.applyLocalVideoPolicy(room, policy);

      // 2. Adapt remote participant subscriptions
      await this.applyRemoteSubscriptionPolicy(room, policy);
    } catch (e) {
      console.warn('[LiveKitAdapter] Failed to apply media policy:', e);
    }
  }

  private async applyLocalVideoPolicy(room: Room, policy: MediaPolicy): Promise<void> {
    const local = room.localParticipant;
    if (!local) return;

    // Find local camera track publication
    const cameraPub = Array.from(local.videoTrackPublications.values()).find(
      pub => pub.source === Track.Source.Camera
    );

    if (!cameraPub || !cameraPub.track || !(cameraPub.track instanceof LocalVideoTrack)) {
      return;
    }

    const videoTrack = cameraPub.track;
    const lkQuality = this.mapQualityToLiveKit(policy.preferredVideoQuality);

    // If critical / offline, pause upstream transmission to protect audio bandwidth
    if (!policy.videoEnabled || policy.preferredVideoQuality === 'off') {
      if (!this.isUpstreamPaused) {
        try {
          await videoTrack.pauseUpstream();
          this.isUpstreamPaused = true;
        } catch {
          // fallback
        }
      }
    } else {
      if (this.isUpstreamPaused) {
        try {
          await videoTrack.resumeUpstream();
          this.isUpstreamPaused = false;
        } catch {
          // fallback
        }
      }

      // Apply publishing quality layer if simulcast is enabled
      if (this.lastAppliedQuality !== policy.preferredVideoQuality) {
        try {
          videoTrack.setPublishingQuality(lkQuality);
          this.lastAppliedQuality = policy.preferredVideoQuality;
        } catch {
          // ignore if non-simulcast
        }
      }
    }
  }

  private async applyRemoteSubscriptionPolicy(room: Room, policy: MediaPolicy): Promise<void> {
    const participantPolicies = policy.participantPolicies;

    for (const [identity, participant] of room.remoteParticipants.entries()) {
      const pPolicy = participantPolicies?.get(identity);

      for (const pub of participant.videoTrackPublications.values()) {
        if (!pub || !(pub instanceof RemoteTrackPublication)) continue;

        // Skip screen share tracks if screen sharing is enabled
        if (pub.source === Track.Source.ScreenShare) {
          if (pub.isSubscribed && !pub.isEnabled && policy.screenShareEnabled) {
            pub.setEnabled(true);
          }
          continue;
        }

        // Camera tracks: apply individual or room-wide adaptation
        if (pPolicy) {
          const lkQuality = this.mapQualityToLiveKit(pPolicy.videoQuality);
          try {
            pub.setVideoQuality(lkQuality);
            if (pPolicy.videoEnabled !== pub.isEnabled) {
              pub.setEnabled(pPolicy.videoEnabled);
            }
          } catch {
            // ignore
          }
        } else {
          // General room-wide fallback for non-prioritized participants
          if (!policy.videoEnabled || policy.preferredVideoQuality === 'minimal') {
            // Low bandwidth: disable non-essential video decode
            if (pub.isEnabled) {
              pub.setEnabled(false);
            }
          } else {
            if (!pub.isEnabled) {
              pub.setEnabled(true);
            }
            const lkQuality = this.mapQualityToLiveKit(policy.preferredVideoQuality);
            try {
              pub.setVideoQuality(lkQuality);
            } catch {
              // ignore
            }
          }
        }
      }
    }
  }
}
