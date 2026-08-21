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
    <main className="fixed inset-0 flex flex-col bg-[#121417] text-white overflow-hidden">

      {/* ── Topbar ── z-40 */}
      {topbar && (
        <div className="absolute top-0 left-0 right-0 z-40 pointer-events-auto">
          {topbar}
        </div>
      )}

      {/* ── Main video area — always full viewport, nothing shrinks it ── */}
      <div className={`flex-1 relative min-h-0 ${!fullBleed && topbarVisible ? 'pt-14' : ''}`}>
        <div className="w-full h-full min-h-0 relative">
          {children}
        </div>
      </div>

      {/* ── Dock ── z-40, floats over video */}
      {dock && (
        <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none pb-3 sm:pb-4">
          <div className="pointer-events-auto w-full">
            {dock}
          </div>
        </div>
      )}

      {/* ── Sidebar dialog-panel ── z-[60]: above everything (topbar, dock, captions) */}
      {sidebar && (
        <>
          {/* Scrim — visible on mobile only, tapping it closes via the sidebar's own close button */}
          <div className="
            fixed inset-0
            z-[59]
            bg-black/40 backdrop-blur-[2px]
            sm:hidden
          " />

          {/* Panel */}
          <aside className="
            fixed
            bottom-0 left-0 right-0
            h-[58dvh]
            sm:top-0 sm:bottom-0 sm:left-auto sm:right-0
            sm:h-screen sm:w-[380px]
            z-[60]
            flex flex-col
            animate-in
            slide-in-from-bottom
            sm:slide-in-from-right
            duration-300 ease-out
            rounded-t-[28px]
            sm:rounded-none
            overflow-hidden
            border-t border-white/10
            sm:border-t-0 sm:border-l sm:border-white/[0.08]
            shadow-[0_-16px_60px_rgba(0,0,0,0.6),_0_0_0_1px_rgba(255,255,255,0.04)]
            sm:shadow-[-16px_0_60px_rgba(0,0,0,0.55),_0_0_0_1px_rgba(255,255,255,0.04)]
            backdrop-blur-3xl
            bg-[#0c0f14]/82
          ">
            {sidebar}
          </aside>
        </>
      )}

    </main>
  );
}
