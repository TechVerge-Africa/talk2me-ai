import { useState, useCallback, useEffect } from 'react';
import { RoomEvent, RemoteParticipant, LocalParticipant, TranscriptionSegment } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { Message } from '@/types/message';
import { TranscriptService } from '@/services/supabase/transcripts';

export function useMeeting(roomCode: string) {
  const room = useRoomContext();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [isDeafMode, setIsDeafMode] = useState(false);
  const [participants, setParticipants] = useState<(RemoteParticipant | LocalParticipant)[]>([]);
  const [captions, setCaptions] = useState<Message[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!room) return;

    const updateParticipants = () => {
      const all = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
      setParticipants(all);
    };

    const handleTranscription = (segments: TranscriptionSegment[], participant: any) => {
      const text = segments.map(s => s.text).join(' ');
      if (!text.trim()) return;

      const newCaption: Message = {
        id: `cap-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        meeting_id: roomCode,
        sender_id: participant.identity,
        content: text,
        type: 'caption',
        timestamp: new Date().toISOString(),
      };

      setCaptions(prev => [...prev.slice(-50), newCaption]);

      if (segments.every(s => s.final)) {
        TranscriptService.saveTranscript({
          meeting_id: roomCode,
          user_id: participant.identity,
          content: text,
          start_time: segments[0].startTime,
          end_time: segments[segments.length - 1].endTime,
        });
      }
    };

    const handleData = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === 'chat') {
          setMessages(prev => [...prev, msg]);
        } else if (msg.type === 'mute_request') {
          if (room.localParticipant.identity === msg.target_id) {
            if (msg.source === 'mic') {
              room.localParticipant.setMicrophoneEnabled(false);
              setMicOn(false);
            } else if (msg.source === 'cam') {
              room.localParticipant.setCameraEnabled(false);
              setCamOn(false);
            }
          }
        }
      } catch {}
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    room.on(RoomEvent.TrackSubscribed, updateParticipants);
    room.on(RoomEvent.TrackUnsubscribed, updateParticipants);
    room.on(RoomEvent.DataReceived, handleData);

    // Sync initial state
    updateParticipants();

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
      room.off(RoomEvent.ParticipantConnected, updateParticipants);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants);
      room.off(RoomEvent.TrackSubscribed, updateParticipants);
      room.off(RoomEvent.TrackUnsubscribed, updateParticipants);
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, roomCode]);

  const toggleMic = useCallback(async () => {
    if (!room?.localParticipant) return;
    try {
      const enabled = !micOn;
      await room.localParticipant.setMicrophoneEnabled(enabled);
      setMicOn(enabled);
    } catch (e) {
      console.error('Failed to toggle microphone:', e);
    }
  }, [room, micOn]);

  const toggleCam = useCallback(async () => {
    if (!room?.localParticipant) return;
    try {
      const enabled = !camOn;
      await room.localParticipant.setCameraEnabled(enabled);
      setCamOn(enabled);
    } catch (e) {
      console.error('Failed to toggle camera:', e);
    }
  }, [room, camOn]);

  const toggleScreenShare = useCallback(async () => {
    if (!room?.localParticipant) return;
    try {
      const enabled = !screenShareOn;
      await room.localParticipant.setScreenShareEnabled(enabled);
      setScreenShareOn(enabled);
    } catch (e) {
      console.error('Failed to toggle screen share:', e);
    }
  }, [room, screenShareOn]);

  const toggleDeafMode = useCallback(() => setIsDeafMode(v => !v), []);

  const sendMessage = useCallback((content: string) => {
    if (!room?.localParticipant) return;

    const msg: Message = {
      id: `chat-${Date.now()}`,
      meeting_id: roomCode,
      sender_id: room.localParticipant.identity,
      content,
      type: 'chat',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, msg]);

    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true });
  }, [room, roomCode]);

  const requestMute = useCallback((targetId: string, source: 'mic' | 'cam') => {
    if (!room?.localParticipant) return;
    const msg = { type: 'mute_request', target_id: targetId, source };
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true });
  }, [room]);

  return {
    roomCode,
    micOn,
    camOn,
    screenShareOn,
    isDeafMode,
    participants,
    captions,
    messages,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    toggleDeafMode,
    sendMessage,
    requestMute,
  };
}
