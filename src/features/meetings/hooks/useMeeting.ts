import { useState, useCallback, useEffect } from 'react';
import { RoomEvent, RemoteParticipant, LocalParticipant, TranscriptionSegment } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { Message } from '@/types/message';
import { TranscriptService } from '@/services/supabase/transcripts';
import { MeetingService } from '@/services/supabase/meetings';
import { generateId } from '@/lib/ids';
import { getAllParticipants, publishRoomData } from '@/lib/livekit-helpers';

export function useMeeting(roomCode: string, hostId?: string, onLeave?: () => void) {
  const room = useRoomContext();

  // Read initial mic/cam preferences saved by the pre-join lobby
  const [micOn, setMicOn] = useState(() => {
    try { return localStorage.getItem('t2_pref_mic') !== 'false'; } catch { return true; }
  });
  const [camOn, setCamOn] = useState(() => {
    try { return localStorage.getItem('t2_pref_cam') !== 'false'; } catch { return true; }
  });
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [isDeafMode, setIsDeafMode] = useState(false);
  const [participants, setParticipants] = useState<(RemoteParticipant | LocalParticipant)[]>([]);
  const [captions, setCaptions] = useState<Message[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<{ id: string; sender_id: string; emoji: string; timestamp: string }[]>([]);

  // ─── ADMIN & SECURITY STATES ──────────────────────────────────────────
  const [requireApproval, setRequireApproval] = useState(false);
  const [isAdmitted, setIsAdmitted] = useState(true);
  const [joinRequests, setJoinRequests] = useState<{ id: string; sender_id: string }[]>([]);
  const [cohosts, setCohosts] = useState<Record<string, boolean>>({});
  const [meetingHostId, setMeetingHostId] = useState<string>(hostId || '');
  const [allowScreenShare, setAllowScreenShare] = useState(true);

  const isAdmin = room?.localParticipant?.identity === meetingHostId || !!cohosts[room?.localParticipant?.identity || ''];

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

  // Sync initial meeting settings from Supabase
  useEffect(() => {
    async function loadSettings() {
      try {
        const meeting = await MeetingService.getMeetingByCode(roomCode);
        if (meeting) {
          setMeetingHostId(meeting.host_id);
          if (meeting.settings) {
            const reqApproval = !!meeting.settings.require_approval;
            setRequireApproval(reqApproval);
            
            // Check if local participant is the creator/host
            const isLocalHost = room?.localParticipant?.identity === meeting.host_id;
            if (!isLocalHost && reqApproval) {
              setIsAdmitted(false);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load meeting settings:', e);
      }
    }
    if (room) loadSettings();
  }, [room, roomCode]);

  // ─── Apply saved lobby prefs to real LiveKit tracks on room connect ─────
  // This is the critical bridge: without this the track state doesn't match
  // the UI preference that was set in the pre-join lobby.
  useEffect(() => {
    if (!room?.localParticipant) return;
    // Only apply once — when the participant first connects
    const onConnected = () => {
      // Don't override if participant is unadmitted (that handler runs separately)
      if (!isAdmitted) return;
      room.localParticipant.setMicrophoneEnabled(micOn);
      room.localParticipant.setCameraEnabled(camOn);
    };
    room.once('connected', onConnected);
    // If already connected (e.g. on refresh), apply immediately
    if (room.state === 'connected') {
      if (isAdmitted) {
        room.localParticipant.setMicrophoneEnabled(micOn).catch(() => {});
        room.localParticipant.setCameraEnabled(camOn).catch(() => {});
      }
    }
    return () => { room.off('connected', onConnected); };
    // Only run once on room mount — intentionally exclude micOn/camOn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Handle local participant mute state when in unadmitted lobby
  useEffect(() => {
    if (!isAdmitted && room?.localParticipant) {
      room.localParticipant.setMicrophoneEnabled(false);
      room.localParticipant.setCameraEnabled(false);
      setMicOn(false);
      setCamOn(false);
    }
  }, [isAdmitted, room]);

  // Guest lobby polling: periodically re-publish join requests to host
  useEffect(() => {
    if (!isAdmitted && room?.localParticipant) {
      const sendJoinRequest = () => {
        publishRoomData(room.localParticipant, {
          type: 'join_request',
          sender_id: room.localParticipant.identity,
        }, { reliable: true });
      };

      sendJoinRequest();
      const interval = setInterval(sendJoinRequest, 5000);
      return () => clearInterval(interval);
    }
  }, [isAdmitted, room]);

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
          setRaisedHands(prev => ({ ...prev, [msg.sender_id]: !!msg.raised }));
        } else if (msg.type === 'reaction') {
          addReaction(msg.sender_id, msg.emoji);
        } else if (msg.type === 'mute_request') {
          const isSenderAdmin = msg.sender_id === meetingHostId || cohosts[msg.sender_id];
          if (room.localParticipant.identity === msg.target_id && isSenderAdmin) {
            if (msg.source === 'mic') {
              room.localParticipant.setMicrophoneEnabled(false);
              setMicOn(false);
            } else if (msg.source === 'cam') {
              room.localParticipant.setCameraEnabled(false);
              setCamOn(false);
            }
          }
        } else if (msg.type === 'unmute_request') {
          const isSenderAdmin = msg.sender_id === meetingHostId || cohosts[msg.sender_id];
          if (room.localParticipant.identity === msg.target_id && isSenderAdmin) {
            if (window.confirm(`The host/co-host is requesting you to unmute your ${msg.source === 'mic' ? 'microphone' : 'camera'}. Allow?`)) {
              if (msg.source === 'mic') {
                room.localParticipant.setMicrophoneEnabled(true);
                setMicOn(true);
              } else if (msg.source === 'cam') {
                room.localParticipant.setCameraEnabled(true);
                setCamOn(true);
              }
            }
          }
        } else if (msg.type === 'kick_request') {
          const isSenderAdmin = msg.sender_id === meetingHostId || cohosts[msg.sender_id];
          if (room.localParticipant.identity === msg.target_id && isSenderAdmin) {
            alert('You have been removed from the meeting by the host.');
            room.disconnect();
            if (onLeave) onLeave();
          }
        } else if (msg.type === 'join_request') {
          const isLocalAdmin = room.localParticipant.identity === meetingHostId || cohosts[room.localParticipant.identity];
          if (isLocalAdmin) {
            setJoinRequests(prev => {
              if (prev.some(r => r.sender_id === msg.sender_id)) return prev;
              return [...prev, { id: generateId('jr'), sender_id: msg.sender_id }];
            });
          }
        } else if (msg.type === 'join_response') {
          if (room.localParticipant.identity === msg.target_id) {
            if (msg.approved) {
              setIsAdmitted(true);
            } else {
              alert('The host has denied your request to join the meeting.');
              room.disconnect();
              if (onLeave) onLeave();
            }
          }
        } else if (msg.type === 'settings_update') {
          if (typeof msg.require_approval === 'boolean') {
            setRequireApproval(msg.require_approval);
            if (!msg.require_approval) {
              setIsAdmitted(true);
            }
          }
          if (typeof msg.allow_screen_share === 'boolean') {
            setAllowScreenShare(msg.allow_screen_share);
          }
        } else if (msg.type === 'role_update') {
          if (msg.role === 'host') {
            setMeetingHostId(msg.target_id);
            // Clear their cohost state if they became host
            setCohosts(prev => ({ ...prev, [msg.target_id]: false }));
          } else if (msg.role === 'cohost') {
            setCohosts(prev => ({ ...prev, [msg.target_id]: true }));
          } else if (msg.role === 'participant') {
            setCohosts(prev => ({ ...prev, [msg.target_id]: false }));
          }
        } else if (msg.type === 'stop_screenshare_request') {
          const isSenderAdmin = msg.sender_id === meetingHostId || cohosts[msg.sender_id];
          if (room.localParticipant.identity === msg.target_id && isSenderAdmin) {
            room.localParticipant.setScreenShareEnabled(false);
            setScreenShareOn(false);
            alert('Your screen share was stopped by the host.');
          }
        } else if (msg.type === 'meeting_ended') {
          const isSenderHost = msg.sender_id === meetingHostId;
          if (isSenderHost) {
            alert('The host has ended this meeting.');
            room.disconnect();
            if (onLeave) onLeave();
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
      // ignore
    }

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
  }, [room, roomCode, addReaction, meetingHostId, cohosts]);

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
    if (!isAdmitted) return;
    try {
      const enabled = !micOn;
      await room.localParticipant.setMicrophoneEnabled(enabled);
      setMicOn(enabled);
      try { localStorage.setItem('t2_pref_mic', String(enabled)); } catch {}
    } catch (e) {
      console.error('Failed to toggle microphone:', e);
    }
  }, [room, micOn, isAdmitted]);

  const toggleCam = useCallback(async () => {
    if (!room?.localParticipant) return;
    if (!isAdmitted) return;
    try {
      const enabled = !camOn;
      await room.localParticipant.setCameraEnabled(enabled);
      setCamOn(enabled);
      try { localStorage.setItem('t2_pref_cam', String(enabled)); } catch {}
    } catch (e) {
      console.error('Failed to toggle camera:', e);
    }
  }, [room, camOn, isAdmitted]);

  const toggleScreenShare = useCallback(async () => {
    if (!room?.localParticipant) return;
    if (!isAdmitted) return;

    const isLocalAdmin = room.localParticipant.identity === meetingHostId || !!cohosts[room.localParticipant.identity];
    if (!allowScreenShare && !isLocalAdmin) {
      alert("Screen sharing has been disabled by the host.");
      return;
    }

    try {
      const enabled = !screenShareOn;
      await room.localParticipant.setScreenShareEnabled(enabled);
      setScreenShareOn(enabled);
    } catch (e) {
      console.error('Failed to toggle screen share:', e);
    }
  }, [room, screenShareOn, isAdmitted, allowScreenShare, meetingHostId, cohosts]);

  const toggleDeafMode = useCallback(() => setIsDeafMode(v => !v), []);

  const sendMessage = useCallback((content: string, recipientId?: string) => {
    if (!room?.localParticipant) return;
    if (!isAdmitted) return;

    const msg: Message = {
      id: generateId('chat'),
      meeting_id: roomCode,
      sender_id: room.localParticipant.identity,
      recipient_id: recipientId && recipientId !== 'everyone' ? recipientId : undefined,
      content,
      type: 'chat',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, msg]);

    const publishOptions: { reliable: boolean; destinationIdentities?: string[] } = { reliable: true };
    if (recipientId && recipientId !== 'everyone') {
      publishOptions.destinationIdentities = [recipientId];
    }

    publishRoomData(room.localParticipant, msg as unknown as Record<string, unknown>, publishOptions);
  }, [room, roomCode, isAdmitted]);

  const requestMute = useCallback((targetId: string, source: 'mic' | 'cam', action: 'mute' | 'unmute' = 'mute') => {
    if (!room?.localParticipant) return;
    const type = action === 'mute' ? 'mute_request' : 'unmute_request';
    publishRoomData(room.localParticipant, { type, target_id: targetId, source, sender_id: room.localParticipant.identity }, { reliable: true });
  }, [room]);

  const requestKick = useCallback((targetId: string) => {
    if (!room?.localParticipant) return;
    publishRoomData(room.localParticipant, { type: 'kick_request', target_id: targetId, sender_id: room.localParticipant.identity }, { reliable: true });
  }, [room]);

  // ─── ADMIN CONTROLLERS ──────────────────────────────────────────────
  const approveJoinRequest = useCallback((senderId: string) => {
    if (!room?.localParticipant) return;
    publishRoomData(room.localParticipant, {
      type: 'join_response',
      target_id: senderId,
      approved: true,
      sender_id: room.localParticipant.identity,
    }, { reliable: true });
    setJoinRequests(prev => prev.filter(r => r.sender_id !== senderId));
  }, [room]);

  const denyJoinRequest = useCallback((senderId: string) => {
    if (!room?.localParticipant) return;
    publishRoomData(room.localParticipant, {
      type: 'join_response',
      target_id: senderId,
      approved: false,
      sender_id: room.localParticipant.identity,
    }, { reliable: true });
    setJoinRequests(prev => prev.filter(r => r.sender_id !== senderId));
  }, [room]);

  const updateSettings = useCallback(async (requireApp: boolean, allowShare: boolean) => {
    if (!room?.localParticipant) return;
    try {
      const meeting = await MeetingService.getMeetingByCode(roomCode);
      if (meeting) {
        await MeetingService.updateMeetingSettings(meeting.id, {
          require_approval: requireApp,
          sign_language_enabled: true,
        });
        setRequireApproval(requireApp);
        setAllowScreenShare(allowShare);

        // Broadcast settings update to everyone
        publishRoomData(room.localParticipant, {
          type: 'settings_update',
          require_approval: requireApp,
          allow_screen_share: allowShare,
          sender_id: room.localParticipant.identity,
        }, { reliable: true });
      }
    } catch (e) {
      console.error('Failed to update meeting settings:', e);
    }
  }, [room, roomCode]);

  const changeParticipantRole = useCallback((targetId: string, role: 'host' | 'cohost' | 'participant') => {
    if (!room?.localParticipant) return;

    publishRoomData(room.localParticipant, {
      type: 'role_update',
      target_id: targetId,
      role,
      sender_id: room.localParticipant.identity,
    }, { reliable: true });

    if (role === 'host') {
      setMeetingHostId(targetId);
      setCohosts(prev => ({ ...prev, [targetId]: false }));
    } else if (role === 'cohost') {
      setCohosts(prev => ({ ...prev, [targetId]: true }));
    } else if (role === 'participant') {
      setCohosts(prev => ({ ...prev, [targetId]: false }));
    }
  }, [room]);

  const stopParticipantScreenShare = useCallback((targetId: string) => {
    if (!room?.localParticipant) return;
    publishRoomData(room.localParticipant, {
      type: 'stop_screenshare_request',
      target_id: targetId,
      sender_id: room.localParticipant.identity,
    }, { reliable: true });
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
    requestKick,

    // Admin properties
    requireApproval,
    isAdmitted,
    joinRequests,
    cohosts,
    meetingHostId,
    allowScreenShare,
    isAdmin,
    approveJoinRequest,
    denyJoinRequest,
    updateSettings,
    changeParticipantRole,
    stopParticipantScreenShare,
  };
}
