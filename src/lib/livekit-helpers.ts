import type { Room, Participant, LocalParticipant } from "livekit-client";

/**
 * Collect every participant (local + remote) from a LiveKit room.
 */
export function getAllParticipants(room: Room): Participant[] {
  return [
    room.localParticipant,
    ...Array.from(room.remoteParticipants.values()),
  ];
}

const encoder = new TextEncoder();

/**
 * JSON-encode a payload and publish it over the LiveKit data channel.
 */
export function publishRoomData(
  localParticipant: LocalParticipant,
  payload: Record<string, unknown>,
  options: { reliable: boolean; destinationIdentities?: string[] },
): void {
  localParticipant.publishData(
    encoder.encode(JSON.stringify(payload)),
    options,
  );
}
