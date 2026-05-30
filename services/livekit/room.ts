import { Room, RoomEvent, createLocalVideoTrack, createLocalAudioTrack } from 'livekit-client';

export const createLiveKitRoom = () => {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  return room;
};

export const generateToken = async (roomName: string, participantName: string) => {
  // This will call the Supabase Edge Function in production
  const response = await fetch('/api/livekit/token', {
    method: 'POST',
    body: JSON.stringify({ roomName, participantName }),
  });
  const data = await response.json();
  return data.token;
};
