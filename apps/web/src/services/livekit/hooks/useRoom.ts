import { useEffect, useState } from 'react';
import { Room, RoomEvent, Participant, RemoteParticipant, LocalParticipant } from 'livekit-client';

export function useLiveKitRoom(url: string, token: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (!url || !token) return;

    const r = new Room();
    
    r.on(RoomEvent.ParticipantConnected, () => {
      setParticipants(r.remoteParticipants);
    });

    r.on(RoomEvent.ParticipantDisconnected, () => {
      setParticipants(r.remoteParticipants);
    });

    async function connect() {
      await r.connect(url, token);
      setRoom(r);
      const allParticipants: Participant[] = [r.localParticipant, ...r.remoteParticipants];
      setParticipants(allParticipants);
    }

    connect();

    return () => {
      r.disconnect();
    };
  }, [url, token]);

  return { room, participants };
}
