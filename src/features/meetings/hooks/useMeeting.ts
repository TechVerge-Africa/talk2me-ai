import { useState, useCallback, useEffect, useRef } from 'react';
import { RoomEvent, RemoteParticipant, LocalParticipant, Participant, TranscriptionSegment, LocalAudioTrack, Track } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { RNNoiseTrackProcessor } from '@/lib/audio/rnnoise-processor';
import { Message } from '@/types/message';
import { MeetingService } from '@/services/supabase/meetings';
import { supabase } from '@/services/supabase/client';
import { generateId } from '@/lib/ids';
import { getAllParticipants, publishRoomData } from '@/lib/livekit-helpers';
import { ParticipantRole, ParticipantStatus } from '@/types/meeting';
import { useAuth } from '@/features/auth/use-auth';
import { TranscriptEngine, InterimCaptionState } from '@/features/transcript/engine/transcript-engine';
import { useAssemblyAIRealtime, AssemblyAIResult } from '@/features/transcript/hooks/useAssemblyAIRealtime';
import { CanonicalTranscriptEntry, TranscriptService } from '@/services/supabase/transcripts';
import { TranscriptAnalysisService, ExtractedDecisionItem } from '@/services/ai/transcript-analysis';

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
  const [aiNoiseShieldOn, setAiNoiseShieldOn] = useState(() => {
    try { return localStorage.getItem('t2_pref_ai_noise') === 'true'; } catch { return false; }
  });
  const [noiseReductionLevel, setNoiseReductionLevel] = useState(0);
  const [participants, setParticipants] = useState<(RemoteParticipant | LocalParticipant)[]>([]);
  const [captions, setCaptions] = useState<Message[]>([]);
  const [canonicalTranscripts, setCanonicalTranscripts] = useState<CanonicalTranscriptEntry[]>([]);
  const [activeInterims, setActiveInterims] = useState<InterimCaptionState[]>([]);
  const [decisions, setDecisions] = useState<ExtractedDecisionItem[]>([]);
  const [isAnalyzingDecisions, setIsAnalyzingDecisions] = useState(false);
  const [highlightedMs, setHighlightedMs] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<{ id: string; sender_id: string; emoji: string; timestamp: string }[]>([]);

  const transcriptEngineRef = useRef<TranscriptEngine | null>(null);

  if (!transcriptEngineRef.current) {
    transcriptEngineRef.current = new TranscriptEngine(roomCode);
  }

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
          const newRow = payload.new as Record<string, any> | null;
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

  // ─── PERSISTENT CHAT: LOAD HISTORY ON INITIAL JOIN ─────────────────────
  useEffect(() => {
    if (!isAdmitted) return;

    async function loadChatHistory() {
      // Load existing messages for this room from Supabase for late-joiners
      const history = await MeetingService.getMeetingMessages(roomCode);
      if (history.length > 0) {
        setMessages(history as unknown as Message[]);
      }
    }

    loadChatHistory();
  }, [isAdmitted, roomCode]);

  // Apply saved lobby prefs to real LiveKit tracks on room connect
  const processorRef = useRef<RNNoiseTrackProcessor | null>(null);

  // Apply/remove the processor based on aiNoiseShieldOn and local track state
  useEffect(() => {
    if (!room?.localParticipant) return;

    const updateProcessor = async () => {
      const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const track = publication?.track as LocalAudioTrack | undefined;

      if (!track) return;

      if (aiNoiseShieldOn) {
        if (!processorRef.current) {
          processorRef.current = new RNNoiseTrackProcessor((metrics) => {
            setNoiseReductionLevel(Math.round(metrics.reductionRatio * 100));
          });
        }

        // Restart track with noiseSuppression: false to avoid double processing
        const currentConstraints = track.mediaStreamTrack.getConstraints();
        if (currentConstraints.noiseSuppression !== false) {
          try {
            await track.restartTrack({
              echoCancellation: true,
              autoGainControl: true,
              noiseSuppression: false,
            });
          } catch (e) {
            console.warn('Failed to restart track with disabled noise suppression:', e);
          }
        }

        // Apply the processor if not already applied
        const trackWithProc = track as unknown as { processor?: unknown };
        if (trackWithProc.processor !== processorRef.current) {
          try {
            await track.setProcessor(processorRef.current);
          } catch (e) {
            console.error('Failed to set RNNoise processor:', e);
          }
        }
      } else {
        // Turn off processor
        const trackWithProc = track as unknown as { processor?: unknown };
        if (trackWithProc.processor) {
          try {
            await track.stopProcessor();
          } catch (e) {
            console.error('Failed to stop processor:', e);
          }
        }

        // Restore native noise suppression
        const currentConstraints = track.mediaStreamTrack.getConstraints();
        if (currentConstraints.noiseSuppression !== true) {
          try {
            await track.restartTrack({
              echoCancellation: true,
              autoGainControl: true,
              noiseSuppression: true,
            });
          } catch (e) {
            console.warn('Failed to restore native noise suppression:', e);
          }
        }
        setNoiseReductionLevel(0);
      }
    };

    updateProcessor();

    const handleTrackPublished = (pub: { source: Track.Source }) => {
      if (pub.source === Track.Source.Microphone) {
        updateProcessor();
      }
    };

    room.on(RoomEvent.LocalTrackPublished, handleTrackPublished);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, handleTrackPublished);
      // Clean up processor if unmounting hook
      if (processorRef.current) {
        processorRef.current.destroy().catch(console.error);
        processorRef.current = null;
      }
    };
  }, [room, aiNoiseShieldOn, room?.localParticipant]);

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
    }, [camOn, isAdmitted, micOn, room]);

  // Handle local participant mute state when in unadmitted lobby
  useEffect(() => {
    if (!isAdmitted && room?.localParticipant) {
      room.localParticipant.setMicrophoneEnabled(false);
      room.localParticipant.setCameraEnabled(false);
      queueMicrotask(() => {
        setMicOn(false);
        setCamOn(false);
      });
    }
  }, [isAdmitted, room]);

  // Guest lobby handshake: publish join request via LiveKit Data Channel on entry
  useEffect(() => {
    if (!isAdmitted && room?.localParticipant && room.localParticipant.identity) {
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
    }
  }, [isAdmitted, room, room?.localParticipant?.identity, meetingDbId, user?.id]);

  // Dynamic handlers reference to keep room event listeners effect stable
  const handlersRef = useRef({
    addReaction,
    meetingHostId,
    cohosts,
    onLeave,
    roomCode,
  });

  useEffect(() => {
    handlersRef.current = {
      addReaction,
      meetingHostId,
      cohosts,
      onLeave,
      roomCode,
    };
  }, [addReaction, meetingHostId, cohosts, onLeave, roomCode]);

  useEffect(() => {
    if (!room) return;

    const updateParticipants = () => {
      queueMicrotask(() => {
        if (!room) return;
        const newParticipants = getAllParticipants(room) as (RemoteParticipant | LocalParticipant)[];
        setParticipants(prev => {
          if (prev.length === newParticipants.length && prev.every((p, i) => p.identity === newParticipants[i]?.identity)) {
            return prev;
          }
          return newParticipants;
        });
      });
    };

    const handleTranscription = (segments: TranscriptionSegment[], participant?: Participant) => {
      const text = segments.map(s => s.text).join(' ');
      if (!text.trim() || !participant) return;
      const isFinal = segments.every(s => s.final);

      const newCaption: Message = {
        id: generateId('cap'),
        meeting_id: roomCode,
        sender_id: participant.identity,
        content: text,
        type: 'caption',
        timestamp: new Date().toISOString(),
        is_final: isFinal,
      };

      setCaptions(prev => {
        const last = prev[prev.length - 1];
        if (last && last.sender_id === participant.identity && !last.is_final) {
          return [...prev.slice(0, -1), newCaption];
        }
        return [...prev.slice(-50), newCaption];
      });

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
        } else if (msg.type === 'caption') {
          const newCap: Message = {
            id: msg.id || generateId('cap'),
            meeting_id: roomCode,
            sender_id: msg.sender_id,
            content: msg.content,
            type: 'caption',
            timestamp: msg.timestamp || new Date().toISOString(),
            is_final: !!msg.is_final,
          };
          setCaptions(prev => {
            const last = prev[prev.length - 1];
            if (last && last.sender_id === msg.sender_id && !last.is_final) {
              return [...prev.slice(0, -1), newCap];
            }
            return [...prev.slice(-50), newCap];
          });
        } else if (msg.type === 'raise_hand') {
          setRaisedHands(prev => ({ ...prev, [msg.sender_id]: !!msg.raised }));
        } else if (msg.type === 'reaction') {
          handlersRef.current.addReaction(msg.sender_id, msg.emoji);
        } else if (msg.type === 'mute_request') {
          const isSenderAdmin = msg.sender_id === handlersRef.current.meetingHostId || handlersRef.current.cohosts[msg.sender_id];
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
          const isSenderAdmin = msg.sender_id === handlersRef.current.meetingHostId || handlersRef.current.cohosts[msg.sender_id];
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
          const isSenderAdmin = msg.sender_id === handlersRef.current.meetingHostId || handlersRef.current.cohosts[msg.sender_id];
          if (room.localParticipant.identity === msg.target_id && isSenderAdmin) {
            alert('You have been removed from the meeting by the host.');
            room.disconnect();
            if (handlersRef.current.onLeave) handlersRef.current.onLeave();
          }
        } else if (msg.type === 'join_request') {
          const isLocalAdmin = room.localParticipant.identity === handlersRef.current.meetingHostId || handlersRef.current.cohosts[room.localParticipant.identity];
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
              if (handlersRef.current.onLeave) handlersRef.current.onLeave();
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
          const isSenderAdmin = msg.sender_id === handlersRef.current.meetingHostId || !!handlersRef.current.cohosts[msg.sender_id];
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
          const isSenderAdmin = msg.sender_id === handlersRef.current.meetingHostId || handlersRef.current.cohosts[msg.sender_id];
          if (room.localParticipant.identity === msg.target_id && isSenderAdmin) {
            room.localParticipant.setScreenShareEnabled(false);
            setScreenShareOn(false);
            alert('Your screen share was stopped by the host.');
          }
        } else if (msg.type === 'meeting_ended') {
          const isSenderHost = msg.sender_id === handlersRef.current.meetingHostId;
          if (isSenderHost) {
            alert('The host has ended this meeting.');
            room.disconnect();
            if (handlersRef.current.onLeave) handlersRef.current.onLeave();
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

    const handleDisconnected = (reason?: unknown) => {
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
  }, [room]);

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
    if (!isAdmitted) return;
    const nextState = !micOn;
    setMicOn(nextState);
    try { localStorage.setItem('t2_pref_mic', String(nextState)); } catch {}

    if (room?.localParticipant) {
      try {
        await room.localParticipant.setMicrophoneEnabled(nextState);
      } catch (e) {
        console.error('Failed to toggle microphone:', e);
      }
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

  const toggleAiNoiseShield = useCallback(() => {
    setAiNoiseShieldOn((prev) => {
      const next = !prev;
      try { localStorage.setItem('t2_pref_ai_noise', String(next)); } catch {}
      return next;
    });
  }, []);

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

    // Check if user mentioned @Talk2Me AI or @ai or @talk2me
    const isAiMentioned = /@talk2me|@ai|@assistant/i.test(content);
    if (isAiMentioned) {
      const cleanQuery = content.replace(/@talk2me\s*ai|@talk2me|@ai|@assistant/gi, '').trim();

      fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: cleanQuery || content,
          canonicalTranscripts,
          chatHistory: messages,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.text) {
            const aiMsg: Message = {
              id: generateId('ai_chat'),
              meeting_id: roomCode,
              sender_id: 'Talk2Me AI',
              recipient_id: recipientId && recipientId !== 'everyone' ? recipientId : undefined,
              content: data.text,
              type: 'chat',
              timestamp: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, aiMsg]);

            MeetingService.saveMeetingMessage({
              room_code: roomCode,
              meeting_id: meetingDbId || undefined,
              sender_id: 'Talk2Me AI',
              recipient_id: aiMsg.recipient_id,
              content: data.text,
              type: 'chat',
            }).catch((e) => console.warn('Failed to persist AI message:', e));

            if (room?.localParticipant) {
              publishRoomData(room.localParticipant, aiMsg as unknown as Record<string, unknown>, publishOptions);
            }
          }
        })
        .catch((err) => console.error('Talk2Me AI Chat error:', err));
    }
  }, [room, roomCode, meetingDbId, isAdmitted, canonicalTranscripts, messages]);


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

  // Local Groq Whisper AI STT Integration
  const handleLocalWebSpeech = useCallback((text: string, isFinal: boolean) => {
    const senderId = room?.localParticipant?.identity || 'me';

    const newCap: Message = {
      id: generateId('cap'),
      meeting_id: roomCode,
      sender_id: senderId,
      content: text,
      type: 'caption',
      timestamp: new Date().toISOString(),
      is_final: isFinal,
    };

    setCaptions(prev => {
      const last = prev[prev.length - 1];
      if (last && last.sender_id === senderId && !last.is_final) {
        return [...prev.slice(0, -1), newCap];
      }
      return [...prev.slice(-50), newCap];
    });

    if (room?.localParticipant) {
      publishRoomData(room.localParticipant, {
        type: 'caption',
        id: newCap.id,
        sender_id: senderId,
        content: text,
        is_final: isFinal,
        timestamp: newCap.timestamp,
      }, { reliable: false });
    }

    if (isFinal) {
      const targetMeetingId = meetingDbId;
      if (targetMeetingId) {
        TranscriptService.saveTranscript({
          meeting_id: targetMeetingId,
          user_id: user?.id || null,
          content: text,
          start_time: Date.now() - 3000,
          end_time: Date.now(),
        }).catch(err => console.error('Failed to save Groq transcript:', err));
      }
    }
  }, [room, roomCode, meetingDbId, user?.id]);

  const localParticipantId = room?.localParticipant?.identity || user?.id || 'local_participant';
  const localParticipantName = localStorage.getItem('t2_display_name') || user?.user_metadata?.full_name || localParticipantId.split('@')[0];

  // Subscribe to Transcript Engine updates
  useEffect(() => {
    if (!transcriptEngineRef.current) return;
    const engine = transcriptEngineRef.current;
    
    engine.loadInitialTranscripts();
    
    const unsubscribe = engine.subscribe((canonical, interims) => {
      setCanonicalTranscripts(canonical);
      setActiveInterims(interims);
    });

    return () => unsubscribe();
  }, []);

  // Pre-load saved AI decisions
  useEffect(() => {
    if (!meetingDbId) return;
    TranscriptAnalysisService.getSavedDecisions(meetingDbId).then(setDecisions).catch(console.error);
  }, [meetingDbId]);

  // AssemblyAI Realtime Callbacks
  const handleAssemblyAIInterim = useCallback((result: AssemblyAIResult) => {
    console.log('📥 [STT Debug] useMeeting received interim:', result.text);
    if (!transcriptEngineRef.current) return;
    transcriptEngineRef.current.processInterimResult(
      result.speakerId,
      result.speakerName,
      result.text
    );

    const displayName = result.speakerName || result.speakerId;
    const newCap: Message = {
      id: generateId('cap'),
      meeting_id: roomCode,
      sender_id: displayName,
      content: result.text,
      type: 'caption',
      timestamp: new Date().toISOString(),
      is_final: false,
    };

    // Update local captions state immediately for live overlay display
    setCaptions(prev => {
      const last = prev[prev.length - 1];
      if (last && last.sender_id === displayName && !last.is_final) {
        return [...prev.slice(0, -1), newCap];
      }
      return [...prev.slice(-50), newCap];
    });

    // Broadcast live interim caption to room over LiveKit Data Channel
    if (room?.localParticipant) {
      publishRoomData(room.localParticipant, {
        type: 'caption',
        id: newCap.id,
        sender_id: displayName,
        content: result.text,
        is_final: false,
        timestamp: newCap.timestamp,
      }, { reliable: false });
    }
  }, [room, roomCode]);

  const handleAssemblyAIFinal = useCallback((result: AssemblyAIResult) => {
    console.log('💾 [STT Debug] useMeeting received final:', result.text);
    if (!transcriptEngineRef.current) return;
    transcriptEngineRef.current.processFinalResult(
      result.speakerId,
      result.speakerName,
      result.text,
      result.audioStart,
      result.audioEnd,
      result.words,
      result.confidence
    );

    const displayName = result.speakerName || result.speakerId;
    const finalCap: Message = {
      id: generateId('cap'),
      meeting_id: roomCode,
      sender_id: displayName,
      content: result.text,
      type: 'caption',
      timestamp: new Date().toISOString(),
      is_final: true,
    };

    // Update local captions state immediately for final overlay display
    setCaptions(prev => {
      const last = prev[prev.length - 1];
      if (last && last.sender_id === displayName && !last.is_final) {
        return [...prev.slice(0, -1), finalCap];
      }
      return [...prev.slice(-50), finalCap];
    });

    // Broadcast final caption to room over LiveKit Data Channel
    if (room?.localParticipant) {
      publishRoomData(room.localParticipant, {
        type: 'caption',
        id: finalCap.id,
        sender_id: displayName,
        content: result.text,
        is_final: true,
        timestamp: finalCap.timestamp,
      }, { reliable: true });
    }
  }, [room, roomCode]);


  const [localMicTrack, setLocalMicTrack] = useState<MediaStreamTrack | null>(null);

  // Sync local mic track reactively whenever track is published, unpublished, or room connects
  useEffect(() => {
    if (!room?.localParticipant) return;

    const syncMicTrack = () => {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const mediaTrack = pub?.track?.mediaStreamTrack || null;
      setLocalMicTrack(mediaTrack);
    };

    syncMicTrack();

    const handleTrackPublished = (pub: { source: Track.Source }) => {
      if (pub.source === Track.Source.Microphone) {
        syncMicTrack();
      }
    };

    const handleTrackUnpublished = (pub: { source: Track.Source }) => {
      if (pub.source === Track.Source.Microphone) {
        syncMicTrack();
      }
    };

    room.on(RoomEvent.LocalTrackPublished, handleTrackPublished);
    room.on(RoomEvent.LocalTrackUnpublished, handleTrackUnpublished);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, handleTrackPublished);
      room.off(RoomEvent.LocalTrackUnpublished, handleTrackUnpublished);
    };
  }, [room, room?.localParticipant, micOn]);

  const assemblyAI = useAssemblyAIRealtime({
    enabled: isAdmitted && micOn,
    participantId: localParticipantId,
    participantName: localParticipantName,
    audioTrack: localMicTrack,
    onInterimResult: handleAssemblyAIInterim,
    onFinalResult: handleAssemblyAIFinal,
  });



  const runAiAnalysis = useCallback(async () => {
    if (!meetingDbId && !roomCode) return;
    setIsAnalyzingDecisions(true);
    try {
      const extracted = await TranscriptAnalysisService.analyzeAndExtractDecisions(
        meetingDbId || roomCode,
        canonicalTranscripts
      );
      setDecisions(extracted);
    } catch (err) {
      console.error('Failed to analyze transcript:', err);
    } finally {
      setIsAnalyzingDecisions(false);
    }
  }, [meetingDbId, roomCode, canonicalTranscripts]);

  const highlightEvidence = useCallback((timestampMs: number) => {
    setHighlightedMs(timestampMs);
    setTimeout(() => setHighlightedMs(null), 5000);
  }, []);

  return {
    roomCode,
    micOn,
    camOn,
    screenShareOn,
    isDeafMode,
    aiNoiseShieldOn,
    noiseReductionLevel,
    participants,
    captions,
    canonicalTranscripts,
    activeInterims,
    decisions,
    isAnalyzingDecisions,
    highlightedMs,
    runAiAnalysis,
    highlightEvidence,
    messages,
    sttStatus: {
      isSupported: true,
      isListening: assemblyAI.isListening,
      currentLanguage: 'en-US',
      error: assemblyAI.error,
      isMockMode: assemblyAI.isMockMode,
    },
    raisedHands,
    reactions,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    toggleDeafMode,
    toggleAiNoiseShield,
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

