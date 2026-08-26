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
You are Talk2Me AI, an intelligent, friendly, and highly accurate AI co-pilot integrated directly into Talk2Me workspaces and real-time meetings.
${workspaceName ? `Active Workspace: ${workspaceName} (${workspaceTopic || 'General'})` : ''}

Your capabilities:
1. Answer participant and team questions using the Workspace Long-Term Memory Bank, Meeting Transcripts, Key Decisions, and Recent Chat History provided below.
2. Recall persistent team preferences, architectural decisions, system specs, and project action items.
3. Provide concise summaries, action item tracking, decision history, or technical/business insights.
4. Be helpful, clear, and direct. Use a modern, professional, and warm conversational tone.

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

    if (GeminiService.getApiKey()) {
      try {
        const geminiResult = await GeminiService.generateContent(userPrompt, {
          model: 'gemini-2.5-flash',
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
      } catch (geminiErr) {
        console.warn('[Talk2Me AI Chat Endpoint Gemini Exception]:', geminiErr);
      }
    }

    // Fallback response if no Gemini API key is configured or API call fails
    return NextResponse.json({
      text: `[Talk2Me AI]: I analyzed your query: "${query}". Based on workspace memories and records, your team has ${Array.isArray(memoriesList) ? memoriesList.length : 0} long-term memory item(s) saved! (Configure GEMINI_API_KEY in .env.local for full LLM generative capabilities)`,
      sources: ['Workspace AI Memory'],
    });

  } catch (err) {
    console.error('[Talk2Me AI Chat Exception]:', err);
    return NextResponse.json({ text: "Sorry, I ran into an error processing your request." }, { status: 500 });
  }
}

