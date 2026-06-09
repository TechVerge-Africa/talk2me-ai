import { useEffect, useState } from 'react';
import { Room, RoomEvent, Participant } from 'livekit-client';
import { getAllParticipants } from '@/lib/livekit-helpers';

export function useLiveKitRoom(url: string, token: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (!url || !token) return;

    const r = new Room();

    const syncParticipants = () => setParticipants(getAllParticipants(r));

    r.on(RoomEvent.ParticipantConnected, syncParticipants);
    r.on(RoomEvent.ParticipantDisconnected, syncParticipants);

    async function connect() {
      await r.connect(url, token);
      setRoom(r);
      syncParticipants();
    }

    connect();

    return () => {
      r.disconnect();
    };
  }, [url, token]);

  return { room, participants };
}
