'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { MeetingLayout } from '@/features/meetings/room/layout';
import { ControlDock } from '@/features/meetings/room/controls';
import { CameraPreview } from '@/features/meetings/room/camera-preview';
import { ParticipantGrid } from '@/features/meetings/room/grid';
import { AiSignerView } from '@/features/accessibility/sign-language';
import { useMeeting } from '@/features/meetings/hooks/useMeeting';

export default function RoomPage() {
  const params = useParams();
  const code = params.code as string;
  const { micOn, camOn, isDeafMode, toggleMic, toggleCam, toggleDeafMode } = useMeeting(code);
  
  const [transcriptOpen, setTranscriptOpen] = useState(true);

  // Mock participants for initial layout bootstrap
  const mockParticipants = [
    { id: '1', name: 'Sarah', role: 'Interpreter · ASL', isSpeaking: true },
    { id: 'me', name: 'David', role: 'You', isMe: true, isMuted: !micOn, isDeafMode: isDeafMode, isSpeaking: micOn }
  ];

  return (
    <MeetingLayout
      isDeafMode={isDeafMode}
      topbar={
        <div className="px-6 h-14 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="size-7 rounded-lg bg-primary grid place-items-center text-primary-foreground text-[10px] font-bold shadow-bridge-sm">T2</span>
            <div className="text-xs text-muted-foreground leading-none">Meeting Room <span className="text-foreground font-bold ml-1">{code}</span></div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">Connected</span>
          </div>
        </div>
      }
      sidebar={transcriptOpen && !isDeafMode ? (
        <div className="h-full glass-card rounded-[32px] p-6 flex flex-col">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Accessibility Hub</div>
          <div className="flex-1 overflow-y-auto space-y-4">
             <p className="text-sm border-l-2 border-bridge-cyan pl-3 py-1">Captions will appear here once audio is detected.</p>
          </div>
        </div>
      ) : null}
      dock={
        <ControlDock
          micOn={micOn}
          camOn={camOn}
          transcriptOn={transcriptOpen}
          deafOn={isDeafMode}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onToggleTranscript={() => setTranscriptOpen(!transcriptOpen)}
          onToggleDeaf={toggleDeafMode}
          onAi={() => {}}
          onEmergency={() => {}}
          onCaptionSize={() => {}}
          onShare={() => {}}
          onLeave={() => window.location.href = '/'}
        />
      }
    >
      <div className="aspect-video lg:aspect-auto lg:h-[calc(100vh-14rem)] min-h-[400px]">
        {isDeafMode ? (
          <AiSignerView currentCaption="Welcome to inclusion." />
        ) : (
          <CameraPreview camOn={camOn} />
        )}
      </div>

      {!isDeafMode && (
        <ParticipantGrid 
          participants={mockParticipants} 
          onInvite={() => {}} 
        />
      )}
    </MeetingLayout>
  );
}
