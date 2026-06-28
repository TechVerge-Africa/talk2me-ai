'use client';

import React from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';
import { X, Mic, MicOff, Video, VideoOff, Users, UserX, MonitorOff, ShieldAlert, CheckCircle2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticipantVideo } from './video-track';
import { ParticipantRole } from '@/types/meeting';

interface ParticipantsPanelProps {
  participants: (LocalParticipant | RemoteParticipant)[];
  hostId?: string;
  isOpen: boolean;
  onClose: () => void;
  onMuteRequest?: (participantId: string, track: 'mic' | 'cam', action: 'mute' | 'unmute') => void;
  onKickRequest?: (participantId: string) => void;
  raisedHands?: Record<string, boolean>;

  // Admin controls
  isAdmin?: boolean;
  cohosts?: Record<string, boolean>;
  meetingHostId?: string;
  requireApproval?: boolean;
  allowScreenShare?: boolean;
  joinRequests?: { id: string; sender_id: string }[];
  localParticipantIdentity?: string;
  onUpdateSettings?: (requireApproval: boolean, allowScreenShare: boolean) => void;
  onChangeParticipantRole?: (targetId: string, role: ParticipantRole) => void;
  onStopParticipantScreenShare?: (targetId: string) => void;
  onAdmitAllRequests?: () => void;
  onMuteAllParticipants?: () => void;
}

function getRoleBadge(p: LocalParticipant | RemoteParticipant, hostId?: string, cohosts?: Record<string, boolean>) {
  if (p.identity === hostId) return { label: 'Host', color: 'bg-amber-500/20 text-amber-500' };
  if (cohosts && cohosts[p.identity]) return { label: 'Co-Host', color: 'bg-purple-500/20 text-purple-500' };
  if (p.identity.toLowerCase().includes('interpret')) return { label: 'Interpreter', color: 'bg-blue-500/20 text-blue-500' };
  return { label: 'Participant', color: 'bg-white/5 text-white/50' };
}

function ParticipantRow({
  p,
  hostId,
  cohosts,
  onMuteRequest,
  onKickRequest,
  raisedHands,
  isAdmin,
  localParticipantIdentity,
  meetingHostId,
  onChangeParticipantRole,
  onStopParticipantScreenShare,
}: {
  p: LocalParticipant | RemoteParticipant;
  hostId?: string;
  cohosts?: Record<string, boolean>;
  onMuteRequest?: (id: string, track: 'mic' | 'cam', action: 'mute' | 'unmute') => void;
  onKickRequest?: (id: string) => void;
  raisedHands?: Record<string, boolean>;
  isAdmin?: boolean;
  localParticipantIdentity?: string;
  meetingHostId?: string;
  onChangeParticipantRole?: (targetId: string, role: ParticipantRole) => void;
  onStopParticipantScreenShare?: (targetId: string) => void;
}) {
  const role = getRoleBadge(p, hostId, cohosts);
  const isRowLocal = p instanceof LocalParticipant;
  const isSpeaking = p.isSpeaking;

  const micEnabled = p.isMicrophoneEnabled;
  const camEnabled = p.isCameraEnabled;
  const screenSharing = p.isScreenShareEnabled;

  const showAdminControls = isAdmin && !isRowLocal;

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors">
      {/* Avatar with video preview */}
      <div className="size-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 relative ring-1 ring-white/5">
        <ParticipantVideo
          participant={p}
          source={Track.Source.Camera}
          className="w-full h-full rounded-xl"
          raised={!!raisedHands && !!raisedHands[p.identity]}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate text-white/95">{p.identity}</span>
          {raisedHands && raisedHands[p.identity] && (
            <span className="text-xs animate-bounce" title="Hand Raised">✋</span>
          )}
          {isRowLocal && <span className="text-[9px] text-white/45 font-bold">(You)</span>}
        </div>
        
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${role.color}`}>
            {role.label}
          </span>
          {isSpeaking && (
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" title="Speaking" />
          )}
        </div>
      </div>

      {/* Admin Action dropdown */}
      {isAdmin && !isRowLocal && onChangeParticipantRole && (
        <select
          value={p.identity === meetingHostId ? 'host' : (cohosts && cohosts[p.identity] ? 'cohost' : 'participant')}
          onChange={(e) => onChangeParticipantRole(p.identity, e.target.value as ParticipantRole)}
          className="bg-[#1e2227] text-white/80 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
        >
          <option value="participant">Participant</option>
          <option value="cohost">Co-Host</option>
          <option value="host">Make Host</option>
        </select>
      )}

      {/* Mic / Cam / Screen / Kick controls */}
      <div className="flex items-center gap-1">
        {/* Microphone mute toggle */}
        <button
          onClick={() => {
            if (onMuteRequest) {
              onMuteRequest(p.identity, 'mic', micEnabled ? 'mute' : 'unmute');
            }
          }}
          disabled={!isAdmin && isRowLocal}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            micEnabled
              ? 'text-white/60 hover:bg-white/5 hover:text-white'
              : 'bg-red-500/10 text-red-500 border border-red-500/25 shadow-sm hover:bg-red-500/20'
          }`}
          title={isAdmin ? (micEnabled ? "Mute Microphone" : "Request Unmute") : (micEnabled ? "Mic On" : "Mic Off")}
        >
          {micEnabled ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
        </button>

        {/* Camera toggle */}
        <button
          onClick={() => {
            if (onMuteRequest) {
              onMuteRequest(p.identity, 'cam', camEnabled ? 'mute' : 'unmute');
            }
          }}
          disabled={!isAdmin && isRowLocal}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            camEnabled
              ? 'text-white/60 hover:bg-white/5 hover:text-white'
              : 'bg-red-500/10 text-red-500 border border-red-500/25 shadow-sm hover:bg-red-500/20'
          }`}
          title={isAdmin ? (camEnabled ? "Turn Video Off" : "Request Video On") : (camEnabled ? "Video On" : "Video Off")}
        >
          {camEnabled ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
        </button>

        {/* Screen share stop button */}
        {screenSharing && showAdminControls && onStopParticipantScreenShare && (
          <button
            onClick={() => onStopParticipantScreenShare(p.identity)}
            className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-500 hover:bg-amber-500/20 transition-colors cursor-pointer"
            title="Stop Screen Share"
          >
            <MonitorOff className="size-3.5" />
          </button>
        )}

        {/* Kick out button */}
        {showAdminControls && onKickRequest && (
          <button
            onClick={() => {
              if (window.confirm(`Remove ${p.identity} from the meeting?`)) {
                onKickRequest(p.identity);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-500 border border-transparent hover:border-red-500/25 transition-colors cursor-pointer"
            title="Remove from meeting"
          >
            <UserX className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ParticipantsPanel({
  participants,
  hostId,
  isOpen,
  onClose,
  onMuteRequest,
  onKickRequest,
  raisedHands,
  isAdmin,
  cohosts,
  meetingHostId,
  requireApproval = false,
  allowScreenShare = true,
  joinRequests = [],
  localParticipantIdentity,
  onUpdateSettings,
  onChangeParticipantRole,
  onStopParticipantScreenShare,
  onAdmitAllRequests,
  onMuteAllParticipants,
}: ParticipantsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[360px] bg-[#181b20] border-l border-white/5 shadow-2xl flex flex-col text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-blue-500/10 text-blue-400 grid place-items-center">
                  <Users className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Participants</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wide">{participants.length} in call</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="size-8 rounded-xl hover:bg-white/5 grid place-items-center transition-colors text-white/50 hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Admin Action Bar (Batch Mute / Batch Admit) */}
            {isAdmin && (
              <div className="px-5 py-2.5 bg-[#1e2227] border-b border-white/5 flex items-center justify-between gap-2">
                <button
                  onClick={onMuteAllParticipants}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <VolumeX className="size-3.5 text-red-400" />
                  Mute All
                </button>

                {joinRequests.length > 0 && onAdmitAllRequests && (
                  <button
                    onClick={onAdmitAllRequests}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md cursor-pointer"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Admit All ({joinRequests.length})
                  </button>
                )}
              </div>
            )}

            {/* Admin/Host Settings Toggles */}
            {isAdmin && onUpdateSettings && (
              <div className="px-5 py-3 bg-[#131519]/70 border-b border-white/5 space-y-3">
                <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-white/30">
                  <ShieldAlert className="size-3 text-blue-400/80" />
                  <span>Host Moderation Controls</span>
                </div>
                
                {/* Require approval toggle */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white/70">Require approval to join</span>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings(!requireApproval, allowScreenShare)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 outline-none ${
                      requireApproval ? 'bg-blue-500' : 'bg-[#2d3139]'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-150 ${
                      requireApproval ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Allow Screen sharing toggle */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white/70">Allow guest screen sharing</span>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings(requireApproval, !allowScreenShare)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 outline-none ${
                      allowScreenShare ? 'bg-blue-500' : 'bg-[#2d3139]'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-150 ${
                      allowScreenShare ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* Participant list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar">
              {participants.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-white/30 py-16">
                  <Users className="size-8 opacity-30" />
                  <p className="text-sm">No participants yet</p>
                </div>
              ) : (
                participants.map(p => (
                  <ParticipantRow
                    key={p.sid || p.identity}
                    p={p}
                    hostId={meetingHostId || hostId}
                    cohosts={cohosts}
                    onMuteRequest={onMuteRequest}
                    onKickRequest={onKickRequest}
                    raisedHands={raisedHands}
                    isAdmin={isAdmin}
                    localParticipantIdentity={localParticipantIdentity}
                    meetingHostId={meetingHostId}
                    onChangeParticipantRole={onChangeParticipantRole}
                    onStopParticipantScreenShare={onStopParticipantScreenShare}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/5 bg-[#121417]">
              <div className="text-[10px] text-white/35 text-center uppercase tracking-widest font-bold opacity-60">
                Talk2Me AI • Moderated Session
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
