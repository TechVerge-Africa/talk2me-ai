import { useState, useCallback, useEffect } from 'react';
import { RoomEvent, RemoteParticipant, LocalParticipant, TranscriptionSegment } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { Message } from '@/types/message';
import { TranscriptService } from '@/services/supabase/transcripts';
import { generateId } from '@/lib/ids';
import { getAllParticipants, publishRoomData } from '@/lib/livekit-helpers';

export function useMeeting(roomCode: string, hostId?: string) {
  const room = useRoomContext();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [isDeafMode, setIsDeafMode] = useState(false);
  const [participants, setParticipants] = useState<(RemoteParticipant | LocalParticipant)[]>([]);
  const [captions, setCaptions] = useState<Message[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<{ id: string; sender_id: string; emoji: string; timestamp: string }[]>([]);

  const addReaction = useCallback((senderId: string, emoji: string) => {
    const reaction = {
      id: generateId('r'),
      sender_id: senderId,
      emoji,
      timestamp: new Date().toISOString(),
    };
    setReactions(prev => [...prev.slice(-50), reaction]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== reaction.id)), 6000);
  }, []);

  useEffect(() => {
    if (!room) return;

    const updateParticipants = () => {
      setParticipants(getAllParticipants(room) as (RemoteParticipant | LocalParticipant)[]);
    };

    const handleTranscription = (segments: TranscriptionSegment[], participant: any) => {
      const text = segments.map(s => s.text).join(' ');
      if (!text.trim()) return;

      const newCaption: Message = {
        id: generateId('cap'),
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
        }).catch((err) => {
          console.error('Failed to persist transcript segment:', err);
        });
      }
    };

    const handleData = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === 'chat') {
          setMessages(prev => [...prev, msg]);
        } else if (msg.type === 'raise_hand') {
          // msg: { type: 'raise_hand', sender_id, raised }
          setRaisedHands(prev => ({ ...prev, [msg.sender_id]: !!msg.raised }));
        } else if (msg.type === 'reaction') {
          addReaction(msg.sender_id, msg.emoji);
        } else if (msg.type === 'mute_request') {
          if (
            room.localParticipant.identity === msg.target_id &&
            typeof msg.sender_id === 'string' &&
            msg.sender_id === hostId
          ) {
            if (msg.source === 'mic') {
              room.localParticipant.setMicrophoneEnabled(false);
              setMicOn(false);
            } else if (msg.source === 'cam') {
              room.localParticipant.setCameraEnabled(false);
              setCamOn(false);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse data message:', e);
      }
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    room.on(RoomEvent.TrackSubscribed, updateParticipants);
    room.on(RoomEvent.TrackUnsubscribed, updateParticipants);
    room.on(RoomEvent.DataReceived, handleData);

    // Connection lifecycle handlers — update network indicator and surface logs
    const handleDisconnected = (reason?: any) => {
      console.warn('LiveKit room disconnected', reason);
    };
    const handleReconnecting = () => {
      console.warn('LiveKit reconnecting');
    };
    const handleConnected = () => {
      console.info('LiveKit connected');
    };
    try {
      room.on(RoomEvent.Disconnected, handleDisconnected);
      room.on(RoomEvent.Reconnecting, handleReconnecting);
      room.on(RoomEvent.Connected, handleConnected);
    } catch {
      // Some runtimes / versions may not expose all events — safe to ignore
    }

    // Sync initial state
    updateParticipants();

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
      room.off(RoomEvent.ParticipantConnected, updateParticipants);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants);
      room.off(RoomEvent.TrackSubscribed, updateParticipants);
      room.off(RoomEvent.TrackUnsubscribed, updateParticipants);
      room.off(RoomEvent.DataReceived, handleData);
      try {
        room.off(RoomEvent.Disconnected, handleDisconnected);
        room.off(RoomEvent.Reconnecting, handleReconnecting);
        room.off(RoomEvent.Connected, handleConnected);
      } catch (e) {
        console.warn('Error removing room event listeners:', e);
      }
    };
  }, [room, roomCode, addReaction, hostId]);

  const toggleRaiseHand = useCallback((senderId?: string) => {
    if (!room?.localParticipant) return;
    const id = senderId || room.localParticipant.identity;
    const currentlyRaised = !!raisedHands[id];
    try {
      publishRoomData(room.localParticipant, { type: 'raise_hand', sender_id: id, raised: !currentlyRaised }, { reliable: true });
      setRaisedHands(prev => ({ ...prev, [id]: !currentlyRaised }));
    } catch (e) {
      console.error('Failed to publish raise_hand:', e);
    }
  }, [room, raisedHands]);

  const sendReaction = useCallback((emoji: string) => {
    if (!room?.localParticipant) return;
    try {
      publishRoomData(room.localParticipant, { type: 'reaction', sender_id: room.localParticipant.identity, emoji }, { reliable: false });
      addReaction(room.localParticipant.identity, emoji);
    } catch (e) {
      console.error('Failed to publish reaction:', e);
    }
  }, [room, addReaction]);

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
      id: generateId('chat'),
      meeting_id: roomCode,
      sender_id: room.localParticipant.identity,
      content,
      type: 'chat',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, msg]);
    publishRoomData(room.localParticipant, msg as unknown as Record<string, unknown>, { reliable: true });
  }, [room, roomCode]);

  const requestMute = useCallback((targetId: string, source: 'mic' | 'cam') => {
    if (!room?.localParticipant) return;
    publishRoomData(room.localParticipant, { type: 'mute_request', target_id: targetId, source, sender_id: room.localParticipant.identity }, { reliable: true });
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
    raisedHands,
    reactions,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    toggleDeafMode,
    toggleRaiseHand,
    sendReaction,
    sendMessage,
    requestMute,
  };
}
