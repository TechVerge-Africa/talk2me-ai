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
    <main className={`min-h-screen transition-colors duration-700 ${isDeafMode ? "bg-slate-950" : "bg-background"}`}>
      {topbar}
      
      <div className="px-4 sm:px-6 py-5 max-w-7xl mx-auto grid lg:grid-cols-12 gap-5 pb-32">
        <div className={`${sidebar ? "lg:col-span-8" : "lg:col-span-12"} transition-all duration-500 ease-in-out`}>
          {children}
        </div>
        
        {sidebar && (
          <aside className="lg:col-span-4 lg:h-[calc(100vh-9rem)] lg:sticky lg:top-20 animate-in slide-in-from-right duration-500">
            {sidebar}
          </aside>
        )}
      </div>

      {dock && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30">
          {dock}
        </div>
      )}
    </main>
  );
}
