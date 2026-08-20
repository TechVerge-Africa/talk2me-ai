import React from "react";

interface MeetingLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  dock?: React.ReactNode;
  isDeafMode?: boolean;
  fullBleed?: boolean;
  topbarVisible?: boolean;
}

export function MeetingLayout({ 
  children, 
  sidebar, 
  topbar, 
  dock, 
  fullBleed = false,
  topbarVisible = true,
}: MeetingLayoutProps) {
  return (
    <main className={`fixed inset-0 flex flex-col bg-[#121417] text-white overflow-hidden ${sidebar ? 'layout-has-sidebar' : ''}`}>
      {/* Topbar — sticky at top */}
      {topbar && (
        <div className="absolute top-0 left-0 right-0 z-40 pointer-events-auto">
          {topbar}
        </div>
      )}
      
      {/* Content area — fills between topbar and dock */}
      <div className={`flex-1 flex flex-col lg:flex-row relative min-h-0 ${!fullBleed && topbarVisible ? 'pt-16' : ''} transition-all duration-300`}>
        {/* Main video / stage area — always full width, sidebar overlays it */}
        <div
          className={`flex-1 relative min-h-0 min-w-0 w-full ${
            fullBleed ? 'p-0 h-full' : ''
          }`}
        >
          {children}
        </div>
        
        {/* Sidebar — absolute glassmorphic overlay, slides in from right on desktop, bottom on mobile */}
        {sidebar && (
          <aside className="
            absolute
            bottom-0 left-0 right-0
            h-[52dvh]
            lg:top-16 lg:bottom-0 lg:left-auto lg:right-0 lg:h-auto
            lg:w-[380px]
            z-30
            animate-in slide-in-from-bottom lg:slide-in-from-right
            duration-300
            rounded-t-3xl lg:rounded-none lg:rounded-tl-2xl
            overflow-hidden
            border-t border-white/10 lg:border-t-0 lg:border-l lg:border-white/10
            shadow-[0_-8px_40px_rgba(0,0,0,0.45)] lg:shadow-[-8px_0_40px_rgba(0,0,0,0.35)]
            backdrop-blur-2xl
            bg-[#0f1116]/70
            pb-20 lg:pb-4
          ">
            {sidebar}
          </aside>
        )}
      </div>

      {/* Dock — floating over video, no background, no padding surround */}
      {dock && (
        <div
          className="
            absolute bottom-0 left-0 right-0
            z-30
            pointer-events-none
            pb-3
            sm:pb-4
          "
        >
          <div className="pointer-events-auto w-full">
            {dock}
          </div>
        </div>
      )}
    </main>
  );
}
