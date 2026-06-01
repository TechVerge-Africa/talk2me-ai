import { useState, useCallback, useEffect, useRef } from 'react';
import { Room, RoomEvent, createLocalVideoTrack, createLocalAudioTrack, TranscriptionSegment } from 'livekit-client';
import { Message } from '../../../types/message';
import { generateToken, createLiveKitRoom } from '../../../services/livekit/room';

export function useMeeting(roomCode: string) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [isDeafMode, setIsDeafMode] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [captions, setCaptions] = useState<Message[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    const room = createLiveKitRoom();
    roomRef.current = room;

    const handleTranscription = (segments: TranscriptionSegment[], participant: any, publication: any) => {
      const text = segments.map(s => s.text).join(' ');
      if (!text.trim()) return;

      setCaptions(prev => {
        const last = prev[prev.length - 1];
        // If the same participant sent a segment recently, we could merge it or add new
        return [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          meeting_id: roomCode,
          sender_id: participant.identity,
          content: text,
          type: 'caption',
          timestamp: new Date().toISOString()
        }];
      });
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    room.on(RoomEvent.ParticipantConnected, () => setParticipants([...room.remoteParticipants.values()]));
    room.on(RoomEvent.ParticipantDisconnected, () => setParticipants([...room.remoteParticipants.values()]));

    const connect = async () => {
      try {
        const token = await generateToken(roomCode, `User_${Math.floor(Math.random() * 1000)}`);
        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://talk2me.livekit.cloud', token);
        
        // Initial tracks
        const audioTrack = await createLocalAudioTrack();
        const videoTrack = await createLocalVideoTrack();
        await room.localParticipant.publishTrack(audioTrack);
        await room.localParticipant.publishTrack(videoTrack);
        
        // Sync with state
        await room.localParticipant.setMicrophoneEnabled(micOn);
        await room.localParticipant.setCameraEnabled(camOn);
        
        setParticipants([...room.remoteParticipants.values()]);
      } catch (e) {
        console.error('Failed to connect to LiveKit:', e);
      }
    };

    connect();

    return () => {
      room.disconnect();
    };
  }, [roomCode]);

  const toggleMic = useCallback(async () => {
    if (!roomRef.current?.localParticipant) return;
    try {
      const enabled = !micOn;
      await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
      setMicOn(enabled);
    } catch (e) {
      console.error('Failed to toggle microphone:', e);
    }
  }, [micOn]);

  const toggleCam = useCallback(async () => {
    if (!roomRef.current?.localParticipant) return;
    try {
      const enabled = !camOn;
      await roomRef.current.localParticipant.setCameraEnabled(enabled);
      setCamOn(enabled);
    } catch (e) {
      console.error('Failed to toggle camera:', e);
    }
  }, [camOn]);

  const toggleScreenShare = useCallback(async () => {
    if (!roomRef.current?.localParticipant) return;
    try {
      const enabled = !screenShareOn;
      await roomRef.current.localParticipant.setScreenShareEnabled(enabled);
      setScreenShareOn(enabled);
    } catch (e) {
      console.error('Failed to toggle screen share:', e);
    }
  }, [screenShareOn]);

  const toggleDeafMode = useCallback(() => setIsDeafMode(v => !v), []);

  const sendMessage = useCallback((content: string) => {
    if (!roomRef.current) return;
    // For now we just mock chat messages locally or via LiveKit Data Channel
    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      meeting_id: roomCode,
      sender_id: 'me',
      content,
      type: 'chat',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, msg]);
    // roomRef.current.localParticipant.publishData(...) would go here
  }, [roomCode]);

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
  };
}
