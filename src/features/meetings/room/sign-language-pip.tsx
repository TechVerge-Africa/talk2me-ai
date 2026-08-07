'use client';

import React from 'react';
import { RemoteParticipant, Track } from 'livekit-client';
import { ParticipantVideo } from './video-track';
import { Maximize2 } from 'lucide-react';

interface Props {
  interpreter?: RemoteParticipant;
  isVisible: boolean;
}

export function SignLanguagePiP({ interpreter, isVisible }: Props) {
  if (!isVisible || !interpreter) return null;

  return (
    <div className="absolute bottom-24 right-8 z-50 group">
      <div className="relative w-48 sm:w-64 aspect-[3/4] rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-white/20 bg-slate-900 group-hover:scale-105 transition-all duration-500">
        <ParticipantVideo 
          participant={interpreter} 
          source={Track.Source.Camera} 
          className="w-full h-full object-cover"
        />
        
        {/* Overlay Labels */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
             <div className="size-2 rounded-full bg-bridge-cyan animate-pulse" />
             <span className="text-[9px] font-bold uppercase tracking-wider text-white">Interpreter</span>
          </div>
          <button className="size-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 grid place-items-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
             <Maximize2 className="size-3" />
          </button>
        </div>

        {/* Name Tag */}
        <div className="absolute bottom-4 left-4 right-4 text-center">
           <div className="inline-block px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white">
              {interpreter.identity}
           </div>
        </div>
      </div>
    </div>
  );
}
