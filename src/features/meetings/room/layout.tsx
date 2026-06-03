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
    <main className={`min-h-screen flex flex-col transition-colors duration-700 ${isDeafMode ? "bg-slate-950" : "bg-background"}`}>
      {topbar}
      
      <div className="px-3 sm:px-6 py-4 sm:py-5 max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-4 sm:gap-5 pb-32 sm:pb-32">
        <div className={`${sidebar ? "lg:col-span-8" : "lg:col-span-12"} w-full transition-all duration-500 ease-in-out`}>
          {children}
        </div>
        
        {sidebar && (
          <aside className="lg:col-span-4 h-[50vh] lg:h-[calc(100vh-9rem)] lg:sticky lg:top-20 animate-in slide-in-from-right duration-500">
            {sidebar}
          </aside>
        )}
      </div>

      {dock && (
        <div className="fixed bottom-4 sm:bottom-8 left-0 right-0 px-4 flex justify-center z-30 pointer-events-none">
          <div className="pointer-events-auto max-w-full">
            {dock}
          </div>
        </div>
      )}
    </main>
  );
}
