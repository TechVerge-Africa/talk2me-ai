import React, { useState, useRef, useEffect, useMemo } from "react";
import { Message } from "@/types/message";
import { Send, Users, User, ChevronDown, Lock, Sparkles, Bot, Pin } from "lucide-react";
import type { Participant } from "livekit-client";
import { MentionAutocomplete, MentionCandidate } from "@/components/ui/mention-autocomplete";
import { FormattedChatMessage } from "@/components/ui/formatted-chat-message";

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
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mentionCandidates: MentionCandidate[] = useMemo(() => {
    const candidates: MentionCandidate[] = [
      {
        id: "ai-assistant",
        handle: "Talk2Me AI",
        name: "Talk2Me AI",
        description: "AI Meeting Assistant (asks questions/summaries)",
        type: "ai",
      },
      {
        id: "everyone",
        handle: "everyone",
        name: "Everyone in room",
        description: "Broadcast message to all meeting participants",
        type: "all",
      },
    ];

    participants.forEach((p) => {
      if (p.identity !== localParticipantIdentity) {
        candidates.push({
          id: p.identity,
          handle: p.identity,
          name: p.identity,
          description: "Meeting Participant",
          type: "member",
        });
      }
    });

    return candidates;
  }, [participants, localParticipantIdentity]);

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

  const insertAiMention = () => {
    if (!input.includes("@Talk2Me AI")) {
      setInput((prev) => `@Talk2Me AI ${prev.trim()}`);
    }
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      }
    } catch {}
    const now = new Date();
    const mm = String(now.getHours()).padStart(2, "0");
    const ss = String(now.getMinutes()).padStart(2, "0");
    return `${mm}.${ss}`;
  };

  return (
    <div className="h-full flex flex-col justify-between relative bg-white dark:bg-[#12151a] text-slate-900 dark:text-white p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 chat-grid-bg p-2.5 rounded-xl border border-slate-200 dark:border-white/5 no-scrollbar pb-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 space-y-3">
            <div className="size-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 grid place-items-center">
              <Sparkles className="size-5 text-indigo-600 dark:text-cyan-400" />
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 font-medium max-w-xs">
              No messages yet. Write a message or type <button onClick={insertAiMention} className="text-indigo-600 dark:text-cyan-400 font-bold underline">@Talk2Me AI</button> to ask questions!
            </p>
          </div>
        ) : (
          <>
            {/* History header */}
            <div className="flex items-center gap-2 py-2 px-1 sticky top-0 z-20 bg-white/90 dark:bg-[#12151a]/90 backdrop-blur-sm">
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
              <span className="text-[9px] uppercase font-black tracking-widest text-indigo-600 dark:text-cyan-400/90 whitespace-nowrap">Chat history</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
            </div>
            {messages.map((msg) => {
              const isAi = msg.sender_id === "Talk2Me AI" || msg.sender_id === "talk2me_ai";
              const isMe =
                !isAi &&
                (msg.sender_id === "me" ||
                  msg.sender_id === "You" ||
                  msg.sender_id === localParticipantIdentity);
              
              const isDM = msg.recipient_id && msg.recipient_id !== "everyone";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in fade-in duration-200`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1 text-[11px]">
                    <span className="font-bold flex items-center gap-1.5">
                      {isAi ? (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-extrabold flex items-center gap-1 text-[10px] shadow-xs">
                          <Sparkles className="size-3 text-cyan-500 animate-pulse" />
                          Talk2Me AI
                        </span>
                      ) : isMe ? (
                        <span className="text-indigo-600 dark:text-cyan-400 font-extrabold">You</span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 font-bold max-w-[180px] truncate">{msg.sender_id}</span>
                      )}
                      {isDM && !isAi && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-purple-700 dark:text-purple-300 font-bold bg-purple-500/15 border border-purple-500/35 px-2 py-0.5 rounded-full shadow-xs">
                          <Lock className="size-2.5 text-purple-500 dark:text-purple-300/80" />
                          {isMe ? `to ${msg.recipient_id} (Direct)` : "to You (Direct)"}
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400 dark:text-white/60 text-[10px] font-medium font-mono">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  <div className="relative max-w-[88%] group">
                    {/* Blue Pin Badge */}
                    <div className={`absolute -top-2 ${isMe ? "-left-2" : "-right-2"} z-10 size-5.5 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-md border-2 border-slate-50 dark:border-[#12151a]`}>
                      <Pin className="size-3 fill-current rotate-45" />
                    </div>

                    <div
                      className={`px-4 py-3 rounded-[20px] text-xs leading-relaxed shadow-sm font-sans font-medium ${
                        isMe
                          ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white border border-indigo-500/20"
                          : isAi
                          ? "bg-cyan-50/90 text-slate-950 dark:bg-cyan-950/40 dark:text-cyan-50 border border-cyan-300/80 dark:border-cyan-500/30 font-medium"
                          : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <FormattedChatMessage content={msg.content} />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Recipient Selector + Quick @Talk2Me AI button + Input */}
      <div className="mt-3.5 relative flex flex-col gap-2">
        {/* Quick @Talk2Me AI prompt chip */}
        <div className="flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={insertAiMention}
            className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-cyan-500/10 hover:bg-indigo-100 dark:hover:bg-cyan-500/20 border border-indigo-200 dark:border-cyan-500/30 text-indigo-600 dark:text-cyan-300 text-[10px] font-bold tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="size-3 text-indigo-500 dark:text-cyan-400" />
            <span>@Talk2Me AI</span>
          </button>
          <span className="text-[9px] text-slate-400 dark:text-white/40 font-mono">Ask questions or summary</span>
        </div>

        {/* Recipient Dropdown Option Panel */}
        {dropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full mb-2.5 left-0 w-64 bg-white/98 dark:bg-[#1e2227]/98 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/30 px-3 py-1.5 tracking-wider border-b border-slate-100 dark:border-white/5">
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
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5"
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
                      : "text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5"
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
          className="flex flex-col gap-2 bg-slate-50 dark:bg-[#1e2227]/90 rounded-2xl border border-slate-200 dark:border-white/5 p-2 shadow-xs relative"
        >
          {/* Target display pill */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all border cursor-pointer hover:brightness-105 active:scale-95 ${
                recipient === "everyone"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
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
              <ChevronDown className="size-3 text-slate-400 dark:text-white/30" />
            </button>
          </div>

          {/* Mention Autocomplete Popover */}
          <MentionAutocomplete
            inputValue={input}
            onSelectMention={(newText) => setInput(newText)}
            candidates={mentionCandidates}
            inputRef={chatInputRef}
          />

          {/* Text input area */}
          <div className="flex items-center gap-2 pl-1">
            <input
              ref={chatInputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recipient === "everyone" ? "Write a message or type @ to tag..." : `Send private message to ${selectedParticipant?.identity || recipient}...`}
              className="flex-1 bg-transparent border-0 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/35 py-1 text-sm focus:outline-none focus:ring-0 outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className={`size-9 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0 active:scale-95 cursor-pointer shadow-md ${
                recipient === "everyone"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
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
