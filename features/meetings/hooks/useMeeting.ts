import { useState, useCallback } from 'react';

export function useMeeting(roomCode: string) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isDeafMode, setIsDeafMode] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  const toggleMic = useCallback(() => setMicOn(v => !v), []);
  const toggleCam = useCallback(() => setCamOn(v => !v), []);
  const toggleDeafMode = useCallback(() => setIsDeafMode(v => !v), []);

  return {
    roomCode,
    micOn,
    camOn,
    isDeafMode,
    participants,
    toggleMic,
    toggleCam,
    toggleDeafMode,
  };
}
