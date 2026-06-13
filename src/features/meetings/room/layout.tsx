import React from "react";

interface MeetingLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  dock?: React.ReactNode;
  isDeafMode?: boolean;
  fullBleed?: boolean;
}

export function MeetingLayout({ 
  children, 
  sidebar, 
  topbar, 
  dock, 
  isDeafMode,
  fullBleed = false
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
      <div className={`flex-1 flex flex-col lg:flex-row relative min-h-0 ${fullBleed ? '' : 'pt-16'}`}>
        {/* Main video / stage area */}
        <div
          className={`flex-1 relative min-h-0 min-w-0 ${
            fullBleed ? 'p-0 w-full h-full' : ''
          } ${sidebar ? 'lg:flex-[2.5]' : ''}`}
          /* Leave bottom space for dock — mobile dock is ~108px, desktop ~72px */
          style={{ paddingBottom: 'var(--dock-h, 108px)' }}
        >
          {children}
        </div>
        
        {/* Sidebar — slides up from bottom on mobile, in from right on desktop */}
        {sidebar && (
          <aside className="
            h-[44dvh] lg:h-full
            lg:w-[420px]
            flex-shrink-0
            bg-[#1c1f24]
            z-20
            animate-in slide-in-from-bottom lg:slide-in-from-right
            duration-300
            lg:pt-16
            rounded-t-3xl lg:rounded-none
            border-t border-white/5 lg:border-t-0 lg:border-l lg:border-white/5
            /* On mobile, sidebar sits on top of the dock zone */
            pb-28 lg:pb-4
          ">
            {sidebar}
          </aside>
        )}
      </div>

      {/* Dock — always pinned at bottom */}
      {dock && (
        <div
          className="
            absolute bottom-0 left-0 right-0
            z-30
            pointer-events-none
            px-3 pb-3 pt-2
            sm:px-5 sm:pb-4
            bg-gradient-to-t from-[#0d0f12]/95 via-[#0d0f12]/60 to-transparent
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
