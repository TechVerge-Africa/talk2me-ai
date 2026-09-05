import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/ai/gemini-service';
import { WorkspaceMemoryService } from '@/services/supabase/memory';

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      userQuery,
      workspaceId,
      workspaceName,
      workspaceTopic,
      canonicalTranscripts,
      meetingDecisions,
      chatHistory,
      workspaceMemories: incomingMemories,
    } = await req.json();

    const query = userQuery || prompt || '';
    if (!query.trim()) {
      return NextResponse.json({ text: "Hi! I'm Talk2Me AI. How can I help you with this meeting or workspace project?" });
    }

    // Retrieve persistent long-term memories if workspaceId is provided and incomingMemories wasn't passed directly
    let memoriesList = incomingMemories || [];
    if ((!memoriesList || memoriesList.length === 0) && workspaceId) {
      try {
        memoriesList = await WorkspaceMemoryService.getWorkspaceMemories(workspaceId);
      } catch (memErr) {
        console.warn('[AI Chat Route] Memory fetch error:', memErr);
      }
    }

    // Format long-term memories context
    let memoryContext = 'No long-term workspace memories stored yet.';
    if (Array.isArray(memoriesList) && memoriesList.length > 0) {
      memoryContext = memoriesList
        .map((m: any) => `• [${(m.category || 'FACT').toUpperCase()}] ${m.title}: ${m.content} (tags: ${(m.tags || []).join(', ') || 'none'})`)
        .join('\n');
    }

    // Format canonical transcripts for context
    let transcriptContext = 'No meeting transcripts recorded yet.';
    if (Array.isArray(canonicalTranscripts) && canonicalTranscripts.length > 0) {
      transcriptContext = canonicalTranscripts.map((turn: any) => {
        const seconds = Math.floor((turn.start_ms || 0) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        return `[${formattedTime}] ${turn.speaker_name || turn.speaker_id || 'Participant'}: ${turn.content}`;
      }).join('\n');
    }

    // Format decisions context
    let decisionsContext = 'No AI decision logs yet.';
    if (Array.isArray(meetingDecisions) && meetingDecisions.length > 0) {
      decisionsContext = meetingDecisions.map((d: any) => `• [${d.category?.toUpperCase() || 'DECISION'}] ${d.text} (by ${d.evidence_speaker || 'Team'})`).join('\n');
    }

    // Format recent channel/meeting chat history
    let chatContext = '';
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      chatContext = chatHistory.slice(-12).map((msg: any) => `${msg.sender_name || msg.sender_id || msg.sender}: ${msg.content || msg.text}`).join('\n');
    }

    const systemInstruction = `
You are Talk2Me AI, an intelligent, friendly, and highly proactive AI team member and co-pilot integrated directly into Talk2Me workspaces and real-time channel chats.
${workspaceName ? `Active Workspace: ${workspaceName} (${workspaceTopic || 'General'})` : ''}

Your Role & Personality:
- Act like an active human-like teammate in workspace channel chats. Participate naturally in team discussions, brainstorming sessions, project planning, architecture design, and problem solving.
- When team members discuss ideas, ask questions, propose features, or plan next steps:
  1. Validate good ideas and provide constructive, insightful feedback.
  2. Offer concrete technical, product, or architectural suggestions.
  3. Help break down complex goals into actionable steps and planning milestones.
  4. Answer team questions directly using the Workspace Memory Bank, Meeting Transcripts, and Recent Chat History provided below.
- Maintain a warm, encouraging, smart, and collaborative tone.

RESPONSE FORMATTING & STYLING RULES:
- NEVER output long, dense walls of unbroken text.
- Always structure your responses with clean Markdown:
  • Use **bold text** for important highlights, key terms, or section headers.
  • Use bullet points (- item) or numbered lists (1. item) when presenting steps, features, or multiple items.
  • Use inline code (\`code\`) for technical names, parameters, or shell commands.
- Keep responses crisp, structured, engaging, and visually inviting.

Workspace Long-Term Memory Bank:
${memoryContext}

Workspace Meeting Transcripts Context:
${transcriptContext}

Key Decisions & Action Items:
${decisionsContext}

Recent Chat History:
${chatContext}
`;

    const userPrompt = `User Query for @Talk2Me AI: "${query}"`;

    const apiKeyConfigured = Boolean(GeminiService.getApiKey());
    let lastErrorMsg = '';

    if (apiKeyConfigured) {
      try {
        const geminiResult = await GeminiService.generateContent(userPrompt, {
          model: 'gemini-2.5-flash-lite',
          systemInstruction,
          temperature: 0.3,
        });

        if (geminiResult.text) {
          // Identify source references if available
          const sources: string[] = [];
          if (Array.isArray(memoriesList) && memoriesList.length > 0) {
            sources.push('Workspace AI Memory');
          }
          if (Array.isArray(canonicalTranscripts) && canonicalTranscripts.length > 0) {
            sources.push('Meeting Transcripts');
          }
          if (Array.isArray(meetingDecisions) && meetingDecisions.length > 0) {
            sources.push('Decisions & Action Items');
          }
          if (sources.length === 0) {
            sources.push('Talk2Me AI Knowledge Base');
          }

          return NextResponse.json({
            text: geminiResult.text,
            sources,
          });
        }
      } catch (geminiErr: any) {
        lastErrorMsg = geminiErr?.message || '';
        console.warn('[Talk2Me AI Chat Endpoint Gemini Exception]:', geminiErr);
      }
    }

    // Informative fallback response
    const statusNote = apiKeyConfigured
      ? `(AI inference temporarily unavailable: ${lastErrorMsg || 'rate limit reached'}. Please retry shortly.)`
      : `(Configure GEMINI_API_KEY in .env.local for full LLM generative capabilities)`;

    return NextResponse.json({
      text: `[Talk2Me AI]: I analyzed your query: "${query}". Based on workspace memories and records, your team has ${Array.isArray(memoriesList) ? memoriesList.length : 0} long-term memory item(s) saved! ${statusNote}`,
      sources: ['Workspace AI Memory'],
    });

  } catch (err) {
    console.error('[Talk2Me AI Chat Exception]:', err);
    return NextResponse.json({ text: "Sorry, I ran into an error processing your request." }, { status: 500 });
  }
}

