import React, { useState, useRef, useEffect } from "react";
import { Message } from "@/types/message";
import { Send, Users, User, ChevronDown, Lock } from "lucide-react";
import type { Participant } from "livekit-client";

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string, recipientId?: string) => void;
  participants?: Participant[];
  localParticipantIdentity?: string;
}

export function ChatPanel({
  messages,
  onSendMessage,
  participants = [],
  localParticipantIdentity,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [recipient, setRecipient] = useState<"everyone" | string>("everyone");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const otherParticipants = participants.filter(
    (p) => p.identity !== localParticipantIdentity
  );

  const selectedParticipant = otherParticipants.find(
    (p) => p.identity === recipient
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input, recipient === "everyone" ? undefined : recipient);
    setInput("");
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      }
    } catch (_) {}
    const now = new Date();
    const mm = String(now.getHours()).padStart(2, "0");
    const ss = String(now.getMinutes()).padStart(2, "0");
    return `${mm}.${ss}`;
  };

  return (
    <div className="h-full flex flex-col justify-between relative">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar pb-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-25 text-center px-4 py-8">
            <p className="text-xs text-white">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe =
              msg.sender_id === "me" ||
              msg.sender_id === "You" ||
              msg.sender_id === localParticipantIdentity;
            
            const isDM = msg.recipient_id && msg.recipient_id !== "everyone";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in fade-in duration-200`}
              >
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px]">
                  <span className="font-bold text-white/80 flex items-center gap-1.5">
                    {isMe ? "You" : msg.sender_id}
                    {isDM && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-purple-300 font-bold bg-purple-500/20 border border-purple-500/35 px-2 py-0.5 rounded-full shadow-sm">
                        <Lock className="size-2.5 text-purple-300/80" />
                        {isMe ? `to ${msg.recipient_id} (Direct)` : "to You (Direct)"}
                      </span>
                    )}
                  </span>
                  <span className="text-white/40 text-[10px]">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] leading-relaxed border shadow-md transition-all ${
                    isMe
                      ? `bg-[#2d3139] text-white rounded-tr-none ${
                          isDM ? "border-purple-500/40 shadow-purple-500/5" : "border-white/5"
                        }`
                      : `bg-[#1e2227] text-white rounded-tl-none ${
                          isDM ? "border-purple-500/40 shadow-purple-500/5" : "border-white/5"
                        }`
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Recipient Selector + Message Input Input */}
      <div className="mt-4 relative">
        {/* Recipient Dropdown Option Panel */}
        {dropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full mb-2.5 left-0 w-64 bg-[#1e2227]/98 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="text-[10px] uppercase font-bold text-white/30 px-3 py-1.5 tracking-wider border-b border-white/5">
              Send message to
            </div>
            <div className="max-h-48 overflow-y-auto mt-1 space-y-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setRecipient("everyone");
                  setDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  recipient === "everyone"
                    ? "bg-blue-500 text-white"
                    : "text-white/70 hover:bg-white/5"
                }`}
              >
                <Users className="size-3.5" />
                <span>Everyone</span>
              </button>
              
              {otherParticipants.map((p) => (
                <button
                  key={p.identity}
                  type="button"
                  onClick={() => {
                    setRecipient(p.identity);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 truncate ${
                    recipient === p.identity
                      ? "bg-purple-600 text-white"
                      : "text-white/70 hover:bg-white/5"
                  }`}
                >
                  <User className="size-3.5 flex-shrink-0" />
                  <span className="truncate">{p.identity} (Direct)</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 bg-[#1e2227]/90 rounded-2xl border border-white/5 p-2 shadow-lg relative"
        >
          {/* Target display pill */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all border cursor-pointer hover:brightness-105 active:scale-95 ${
                recipient === "everyone"
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : "bg-purple-500/10 text-purple-400 border-purple-500/20"
              }`}
            >
              {recipient === "everyone" ? (
                <>
                  <Users className="size-3" />
                  <span>To: Everyone</span>
                </>
              ) : (
                <>
                  <Lock className="size-3" />
                  <span className="max-w-32 truncate">To: {selectedParticipant?.identity || recipient} (Direct)</span>
                </>
              )}
              <ChevronDown className="size-3 text-white/30" />
            </button>
          </div>

          {/* Text input area */}
          <div className="flex items-center gap-2 pl-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recipient === "everyone" ? "Write a message to everyone..." : `Send private message to ${selectedParticipant?.identity || recipient}...`}
              className="flex-1 bg-transparent border-0 text-white placeholder:text-white/35 py-1 text-sm focus:outline-none focus:ring-0 outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className={`size-9 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0 active:scale-95 cursor-pointer shadow-md ${
                recipient === "everyone"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/10"
              }`}
            >
              <Send className="size-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
