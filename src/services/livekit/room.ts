import { Room } from 'livekit-client';

export interface TranscriptionEvent {
  participantId: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export const createLiveKitRoom = () => {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  return room;
};

export const generateToken = async (
  roomName: string,
  participantName: string,
  accessToken?: string,
) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch('/api/livekit/token', {
    method: 'POST',
    headers,
    body: JSON.stringify({ roomName, participantName }),
  });

  if (!response.ok) throw new Error('Failed to fetch token');

  const data = await response.json();
  return data.token;
};
