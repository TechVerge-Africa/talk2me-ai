import { Room, RoomEvent, Track, TranscriptionSegment } from 'livekit-client';

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

export const generateToken = async (roomName: string, participantName: string) => {
  try {
    const response = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, participantName }),
    });
    
    if (!response.ok) throw new Error('Failed to fetch token');
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Token generation error:', error);
    // Return a dummy token for local dev if needed, or rethrow
    throw error;
  }
};
