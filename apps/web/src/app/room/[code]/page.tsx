'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MeetingLayout } from '@/features/meetings/room/layout';
import { ControlDock } from '@/features/meetings/room/controls';
import { CameraPreview } from '@/features/meetings/room/camera-preview';
import { ParticipantGrid } from '@/features/meetings/room/grid';
import { AiSignerView } from '@/features/accessibility/sign-language';
import { CaptionList } from '@/features/captions/caption-list';
import { ChatPanel } from '@/features/chat/chat-panel';
import { useMeeting } from '@/features/meetings/hooks/useMeeting';

export default function RoomPage() {
  const params = useParams();
  const code = params.code as string;
  const { 
    micOn, camOn, screenShareOn, isDeafMode, 
    captions, messages, 
    toggleMic, toggleCam, toggleScreenShare, toggleDeafMode, sendMessage 
  } = useMeeting(code);
  
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'captions' | 'chat'>('captions');
  const [captionSize, setCaptionSize] = useState<'sm' | 'md' | 'lg'>('md');

  const shareRoom = useCallback(() => {
    navigator.clipboard.writeText(code);
    alert(`Meeting code ${code} copied to clipboard!`);
  }, [code]);

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
          <div className="flex items-center gap-4 mb-6 p-1 bg-muted/50 rounded-2xl">
             <button 
               onClick={() => setActiveTab('captions')}
               className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === 'captions' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
             >
               Captions
             </button>
             <button 
               onClick={() => setActiveTab('chat')}
               className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === 'chat' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
             >
               Chat
             </button>
          </div>
          <div className="flex-1 overflow-hidden">
             {activeTab === 'captions' ? (
               <CaptionList captions={captions} size={captionSize} />
             ) : (
               <ChatPanel messages={messages} onSendMessage={sendMessage} />
             )}
          </div>
        </div>
      ) : null}
      dock={
        <ControlDock
          micOn={micOn}
          camOn={camOn}
          screenShareOn={screenShareOn}
          transcriptOn={transcriptOpen}
          deafOn={isDeafMode}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onToggleScreenShare={toggleScreenShare}
          onToggleTranscript={() => setTranscriptOpen(!transcriptOpen)}
          onToggleDeaf={toggleDeafMode}
          onAi={() => setActiveTab('chat')} // For now, focus chat as AI entry
          onEmergency={() => alert("Emergency alert sent to participants.")}
          onCaptionSize={() => setCaptionSize(s => s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'sm')}
          onShare={shareRoom}
          onLeave={() => window.location.href = '/'}
        />
      }
    >
      <div className="aspect-video lg:aspect-auto lg:h-[calc(100vh-14rem)] min-h-[400px]">
        {isDeafMode ? (
          <AiSignerView currentCaption={captions[captions.length - 1]?.content} />
        ) : (
          <CameraPreview camOn={camOn} />
        )}
      </div>

      {!isDeafMode && (
        <ParticipantGrid 
          participants={mockParticipants} 
          onInvite={shareRoom} 
        />
      )}
    </MeetingLayout>
  );
}
