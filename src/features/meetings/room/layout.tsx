import React from "react";

interface MeetingLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  dock?: React.ReactNode;
  isDeafMode?: boolean;
}

export function MeetingLayout({ 
  children, 
  sidebar, 
  topbar, 
  dock, 
  isDeafMode 
}: MeetingLayoutProps) {
  return (
    <main className={`fixed inset-0 flex flex-col transition-colors duration-700 ${isDeafMode ? "bg-slate-950" : "bg-slate-950 sm:bg-background"}`}>
      <div className="flex-shrink-0 z-40">
        {topbar}
      </div>
      
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden pb-[80px] sm:pb-0">
        <div className={`flex-1 transition-all duration-500 ease-in-out relative p-2 sm:p-4 lg:p-6 ${sidebar ? "lg:flex-[2]" : ""}`}>
          {children}
        </div>
        
        {sidebar && (
          <aside className="h-[45dvh] lg:h-full lg:w-[400px] flex-shrink-0 bg-background lg:bg-transparent z-20 animate-in slide-in-from-bottom lg:slide-in-from-right duration-300 shadow-[0_-20px_40px_rgba(0,0,0,0.1)] lg:shadow-none lg:py-6 lg:pr-6 rounded-t-3xl lg:rounded-none">
            {sidebar}
          </aside>
        )}
      </div>

      {dock && (
        <div className="absolute bottom-5 sm:bottom-8 left-0 right-0 px-2 flex justify-center z-30 pointer-events-none">
          <div className="pointer-events-auto max-w-full">
            {dock}
          </div>
        </div>
      )}
    </main>
  );
}
