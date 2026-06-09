import { useEffect, useState } from 'react';
import { Room, RoomEvent, Participant } from 'livekit-client';

export function useLiveKitRoom(url: string, token: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connectionError, setConnectionError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url || !token) return;

    const r = new Room();
    let cancelled = false;
    
    r.on(RoomEvent.ParticipantConnected, () => {
      const allParticipants: Participant[] = [r.localParticipant, ...Array.from(r.remoteParticipants.values())];
      setParticipants(allParticipants);
    });

    const syncParticipants = () => setParticipants(getAllParticipants(r));

    r.on(RoomEvent.ParticipantConnected, syncParticipants);
    r.on(RoomEvent.ParticipantDisconnected, syncParticipants);

    async function connect() {
      try {
        await r.connect(url, token);
        if (cancelled) {
          r.disconnect();
          return;
        }
        setRoom(r);
        const allParticipants: Participant[] = [r.localParticipant, ...Array.from(r.remoteParticipants.values())];
        setParticipants(allParticipants);
      } catch (err) {
        if (!cancelled) {
          setConnectionError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      r.disconnect();
    };
  }, [url, token]);

  return { room, participants, connectionError };
}
