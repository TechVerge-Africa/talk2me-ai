import React, { useState } from "react";
import { Message } from "@/types/message";
import { Send } from "lucide-react";

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export function ChatPanel({ messages, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
        Meeting Chat
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-4">
             <p className="text-xs">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender_id === 'me' ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[9px] font-bold text-muted-foreground/60">
                  {msg.sender_id === 'me' ? "You" : msg.sender_id}
                </span>
              </div>
              <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] ${
                msg.sender_id === 'me' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-muted text-foreground"
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          className="w-full bg-muted/50 border border-border rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <button 
          type="submit"
          disabled={!input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-xl bg-primary text-primary-foreground grid place-items-center disabled:opacity-50 transition-opacity"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
