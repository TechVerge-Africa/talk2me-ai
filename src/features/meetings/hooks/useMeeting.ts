import { useState, useCallback, useEffect } from 'react';
import { RoomEvent, RemoteParticipant, LocalParticipant, TranscriptionSegment } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { Message } from '@/types/message';
import { TranscriptService } from '@/services/supabase/transcripts';
import { MeetingService } from '@/services/supabase/meetings';
import { supabase } from '@/services/supabase/client';
import { generateId } from '@/lib/ids';
import { getAllParticipants, publishRoomData } from '@/lib/livekit-helpers';
import { ParticipantRole, ParticipantStatus } from '@/types/meeting';
import { useAuth } from '@/features/auth/use-auth';

export function useMeeting(roomCode: string, hostId?: string, onLeave?: () => void, isAppAdmin?: boolean) {
  const room = useRoomContext();
  const { user } = useAuth();

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
  const [meetingDbId, setMeetingDbId] = useState<string | null>(null);
  const [requireApproval, setRequireApproval] = useState(false);
  const [isAdmitted, setIsAdmitted] = useState(true);
  const [joinRequests, setJoinRequests] = useState<{ id: string; sender_id: string }[]>([]);
  const [cohosts, setCohosts] = useState<Record<string, boolean>>({});
  const [meetingHostId, setMeetingHostId] = useState<string>(hostId || '');
  const [allowScreenShare, setAllowScreenShare] = useState(true);

  const isAdmin = room?.localParticipant?.identity === meetingHostId || !!cohosts[room?.localParticipant?.identity || ''] || !!isAppAdmin;

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

  // Sync initial meeting settings & register participant in Supabase
  useEffect(() => {
    async function loadSettingsAndRegister() {
      try {
        const meeting = await MeetingService.getMeetingByCode(roomCode);
        if (meeting) {
          setMeetingDbId(meeting.id);
          setMeetingHostId(meeting.host_id);
          if (meeting.settings) {
            const reqApproval = !!meeting.settings.require_approval;
            setRequireApproval(reqApproval);
            if (typeof meeting.settings.allow_screen_share === 'boolean') {
              setAllowScreenShare(meeting.settings.allow_screen_share);
            }
            
            // Check if local participant is host
            const isLocalHost = room?.localParticipant?.identity === meeting.host_id;
            const initialStatus: ParticipantStatus = (isLocalHost || isAppAdmin || !reqApproval) ? 'admitted' : 'waiting';
            
            if (!isLocalHost && !isAppAdmin && reqApproval) {
              setIsAdmitted(false);
            } else {
              setIsAdmitted(true);
            }

            if (room?.localParticipant && room.localParticipant.identity) {
              const localIdentity = room.localParticipant.identity;
              const displayName = localStorage.getItem('t2_display_name') || localIdentity;
              const role: ParticipantRole = isLocalHost ? 'host' : 'participant';

              await MeetingService.joinMeetingParticipant({
                meeting_id: meeting.id,
                identity: localIdentity,
                display_name: displayName,
                role,
                status: initialStatus,
                user_id: user?.id || undefined,
              }).catch(e => console.warn('Supabase join participant fallback:', e));
            }
          }
        }
      } catch (e) {
        console.error('Failed to load meeting settings:', e);
      }
    }
    if (room) loadSettingsAndRegister();
  }, [room, roomCode, room?.localParticipant?.identity, user?.id, isAppAdmin]);

  // ─── SUPABASE REALTIME SUBSCRIPTION FOR PARTICIPANTS ────────────────────
  useEffect(() => {
    if (!meetingDbId || !room?.localParticipant || !room.localParticipant.identity) return;

    const channel = supabase
      .channel(`meeting_participants_${meetingDbId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_participants',
          filter: `meeting_id=eq.${meetingDbId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (!newRow) return;

          const localIdentity = room.localParticipant.identity;

          // If change affects local participant
          if (newRow.identity === localIdentity) {
            if (newRow.status === 'admitted' && !isAdmitted) {
              setIsAdmitted(true);
            } else if (newRow.status === 'rejected') {
              alert('The host has denied your request to join the meeting.');
              room.disconnect();
              if (onLeave) onLeave();
            }

            if (newRow.role === 'host') {
              setMeetingHostId(localIdentity);
            } else if (newRow.role === 'cohost') {
              setCohosts(prev => ({ ...prev, [localIdentity]: true }));
            }
          } else {
            // Check host/cohost role updates for others
            if (newRow.role === 'host') {
              setMeetingHostId(newRow.identity);
              setCohosts(prev => ({ ...prev, [newRow.identity]: false }));
            } else if (newRow.role === 'cohost') {
              setCohosts(prev => ({ ...prev, [newRow.identity]: true }));
            } else if (newRow.role === 'participant') {
              setCohosts(prev => ({ ...prev, [newRow.identity]: false }));
            }

            // Waiting list updates for admins
            if (newRow.status === 'waiting') {
              setJoinRequests(prev => {
                if (prev.some(r => r.sender_id === newRow.identity)) return prev;
                return [...prev, { id: generateId('jr'), sender_id: newRow.identity }];
              });
            } else {
              setJoinRequests(prev => prev.filter(r => r.sender_id !== newRow.identity));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingDbId, room, room?.localParticipant?.identity, isAdmitted, onLeave]);

  // ─── PERSISTENT CHAT: LOAD HISTORY + REALTIME SUBSCRIPTION ─────────────
  useEffect(() => {
    if (!isAdmitted) return;

    let chatChannel: ReturnType<typeof supabase.channel> | null = null;

    async function loadAndSubscribeChatHistory() {
      // 1) Load all existing messages for this room from Supabase
      const history = await MeetingService.getMeetingMessages(roomCode);
      if (history.length > 0) {
        setMessages(() => history);
      }

      // 2) Subscribe to Supabase Realtime for new messages written by others
      chatChannel = supabase
        .channel(`meeting_messages_${roomCode}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'meeting_messages',
            filter: `room_code=eq.${roomCode}`,
          },
          (payload) => {
            const row = payload.new as any;
            // Avoid duplicates if the message was sent by the local participant
            // (those are already in state from setMessages in sendMessage)
            setMessages(prev => {
              if (prev.some(m => m.id === row.id)) return prev;
              return [...prev, {
                id: row.id,
                meeting_id: row.room_code,
                sender_id: row.sender_id,
                recipient_id: row.recipient_id || undefined,
                content: row.content,
                type: row.type || 'chat',
                timestamp: row.created_at,
              }];
            });
          }
        )
        .subscribe();
    }

    loadAndSubscribeChatHistory();

    return () => {
      if (chatChannel) supabase.removeChannel(chatChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmitted, roomCode]);

  // Apply saved lobby prefs to real LiveKit tracks on room connect
  useEffect(() => {
    if (!room?.localParticipant) return;
    const onConnected = () => {
      if (!isAdmitted) return;
      room.localParticipant.setMicrophoneEnabled(micOn);
      room.localParticipant.setCameraEnabled(camOn);
    };
    room.once('connected', onConnected);
    if (room.state === 'connected') {
      if (isAdmitted) {
        room.localParticipant.setMicrophoneEnabled(micOn).catch(() => {});
        room.localParticipant.setCameraEnabled(camOn).catch(() => {});
      }
    }
    return () => { room.off('connected', onConnected); };
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
  }, [isAdmitted, room, room?.localParticipant]);

  // Guest lobby polling: periodically re-publish join requests to host
  useEffect(() => {
    if (!isAdmitted && room?.localParticipant && room.localParticipant.identity) {
      const sendJoinRequest = () => {
        publishRoomData(room.localParticipant, {
          type: 'join_request',
          sender_id: room.localParticipant.identity,
        }, { reliable: true });

        if (meetingDbId) {
          MeetingService.joinMeetingParticipant({
            meeting_id: meetingDbId,
            identity: room.localParticipant.identity,
            display_name: localStorage.getItem('t2_display_name') || room.localParticipant.identity,
            status: 'waiting',
            user_id: user?.id || undefined,
          }).catch(() => {});
        }
      };

      sendJoinRequest();
      const interval = setInterval(sendJoinRequest, 5000);
      return () => clearInterval(interval);
    }
  }, [isAdmitted, room, room?.localParticipant?.identity, meetingDbId, user?.id]);

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
          const isSenderAdmin = msg.sender_id === meetingHostId || !!cohosts[msg.sender_id];
          if (isSenderAdmin) {
            if (msg.role === 'host') {
              setMeetingHostId(msg.target_id);
              setCohosts(prev => ({ ...prev, [msg.target_id]: false }));
            } else if (msg.role === 'cohost') {
              setCohosts(prev => ({ ...prev, [msg.target_id]: true }));
            } else if (msg.role === 'participant') {
              setCohosts(prev => ({ ...prev, [msg.target_id]: false }));
            }
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
  }, [room, roomCode, addReaction, meetingHostId, cohosts, onLeave]);

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

    // Add to local state immediately (optimistic)
    setMessages(prev => [...prev, msg]);

    // Persist to Supabase for late-joiners & rejoiners
    MeetingService.saveMeetingMessage({
      room_code: roomCode,
      meeting_id: meetingDbId || undefined,
      sender_id: room.localParticipant.identity,
      recipient_id: msg.recipient_id,
      content,
      type: 'chat',
    }).catch(e => console.warn('Failed to persist chat message:', e));

    const publishOptions: { reliable: boolean; destinationIdentities?: string[] } = { reliable: true };
    if (recipientId && recipientId !== 'everyone') {
      publishOptions.destinationIdentities = [recipientId];
    }

    publishRoomData(room.localParticipant, msg as unknown as Record<string, unknown>, publishOptions);
  }, [room, roomCode, meetingDbId, isAdmitted]);

  const requestMute = useCallback((targetId: string, source: 'mic' | 'cam', action: 'mute' | 'unmute' = 'mute') => {
    if (!room?.localParticipant) return;
    const type = action === 'mute' ? 'mute_request' : 'unmute_request';
    publishRoomData(room.localParticipant, { type, target_id: targetId, source, sender_id: room.localParticipant.identity }, { reliable: true });
  }, [room]);

  const requestKick = useCallback((targetId: string) => {
    if (!room?.localParticipant) return;
    publishRoomData(room.localParticipant, { type: 'kick_request', target_id: targetId, sender_id: room.localParticipant.identity }, { reliable: true });
    if (meetingDbId) {
      MeetingService.updateParticipantStatus(meetingDbId, [targetId], 'rejected').catch(() => {});
    }
  }, [room, meetingDbId]);

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

    if (meetingDbId) {
      MeetingService.updateParticipantStatus(meetingDbId, [senderId], 'admitted').catch(() => {});
    }
  }, [room, meetingDbId]);

  const denyJoinRequest = useCallback((senderId: string) => {
    if (!room?.localParticipant) return;
    publishRoomData(room.localParticipant, {
      type: 'join_response',
      target_id: senderId,
      approved: false,
      sender_id: room.localParticipant.identity,
    }, { reliable: true });
    setJoinRequests(prev => prev.filter(r => r.sender_id !== senderId));

    if (meetingDbId) {
      MeetingService.updateParticipantStatus(meetingDbId, [senderId], 'rejected').catch(() => {});
    }
  }, [room, meetingDbId]);

  const admitAllJoinRequests = useCallback(() => {
    if (!room?.localParticipant || joinRequests.length === 0) return;
    const identities = joinRequests.map(r => r.sender_id);
    identities.forEach(id => approveJoinRequest(id));
  }, [room, joinRequests, approveJoinRequest]);

  const muteAllParticipants = useCallback(() => {
    if (!room?.localParticipant) return;
    const remotes = participants.filter(p => p instanceof RemoteParticipant);
    remotes.forEach(p => {
      requestMute(p.identity, 'mic', 'mute');
    });
  }, [room, participants, requestMute]);

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

  const changeParticipantRole = useCallback((targetId: string, role: ParticipantRole) => {
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

    if (meetingDbId) {
      MeetingService.updateParticipantRole(meetingDbId, targetId, role).catch(() => {});
    }
  }, [room, meetingDbId]);

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
    admitAllJoinRequests,
    muteAllParticipants,
    updateSettings,
    changeParticipantRole,
    stopParticipantScreenShare,
  };
}
