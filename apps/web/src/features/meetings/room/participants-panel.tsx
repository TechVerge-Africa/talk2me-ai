'use client';

import React from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';
import { useTracks } from '@livekit/components-react';
import { X, Mic, MicOff, Video, VideoOff, Crown, Users, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticipantVideo } from './video-track';

interface ParticipantsPanelProps {
  participants: (LocalParticipant | RemoteParticipant)[];
  hostId?: string;
  isOpen: boolean;
  onClose: () => void;
}

function getRoleBadge(p: LocalParticipant | RemoteParticipant, hostId?: string) {
  if (p instanceof LocalParticipant) return { label: 'You', color: 'bg-bridge-cyan/20 text-bridge-cyan' };
  if (p.identity === hostId) return { label: 'Host', color: 'bg-amber-500/20 text-amber-500' };
  if (p.identity.toLowerCase().includes('interpret')) return { label: 'Interpreter', color: 'bg-bridge-indigo/20 text-bridge-indigo' };
  return { label: 'Participant', color: 'bg-muted text-muted-foreground' };
}

function ParticipantRow({ p, hostId }: { p: LocalParticipant | RemoteParticipant; hostId?: string }) {
  const role = getRoleBadge(p, hostId);
  const initials = p.identity.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors">
      {/* Avatar with video preview */}
      <div className="size-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 relative">
        <ParticipantVideo
          participant={p}
          source={Track.Source.Camera}
          className="w-full h-full rounded-xl"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate">{p.identity}</span>
          {p instanceof LocalParticipant && <span className="text-[9px] text-muted-foreground">(You)</span>}
        </div>
        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${role.color}`}>
          {role.label}
        </span>
      </div>

      {/* Mic / Cam status icons */}
      <div className="flex items-center gap-1.5">
        {p.isMicrophoneEnabled ? (
          <Mic className="size-3.5 text-muted-foreground" />
        ) : (
          <MicOff className="size-3.5 text-destructive" />
        )}
        {p.isCameraEnabled ? (
          <Video className="size-3.5 text-muted-foreground" />
        ) : (
          <VideoOff className="size-3.5 text-destructive" />
        )}
        {p.isSpeaking && (
          <div className="flex items-end gap-px h-4">
            {[3, 6, 4, 7, 3].map((h, i) => (
              <div
                key={i}
                className="w-0.5 bg-bridge-cyan rounded-full animate-pulse"
                style={{ height: h, animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ParticipantsPanel({ participants, hostId, isOpen, onClose }: ParticipantsPanelProps) {
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
            className="fixed right-0 top-0 bottom-0 z-50 w-[320px] bg-card border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <Users className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">Participants</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{participants.length} in call</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="size-8 rounded-xl hover:bg-muted grid place-items-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Participant list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {participants.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-muted-foreground py-16">
                  <Users className="size-8 opacity-30" />
                  <p className="text-sm">No participants yet</p>
                </div>
              ) : (
                participants.map(p => (
                  <ParticipantRow key={p.sid || p.identity} p={p} hostId={hostId} />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border">
              <div className="text-[10px] text-muted-foreground text-center uppercase tracking-widest font-bold opacity-60">
                Talk2Me AI • Inclusive Calls
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
