import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/ai/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const { prompt, userQuery, canonicalTranscripts, chatHistory } = await req.json();

    const query = userQuery || prompt || '';
    if (!query.trim()) {
      return NextResponse.json({ text: "Hi! I'm Talk2Me AI. How can I help you with this meeting or project?" });
    }

    // Format canonical transcript for context
    let transcriptContext = 'No transcript recorded yet.';
    if (Array.isArray(canonicalTranscripts) && canonicalTranscripts.length > 0) {
      transcriptContext = canonicalTranscripts.map((turn: any) => {
        const seconds = Math.floor((turn.start_ms || 0) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        return `[${formattedTime}] ${turn.speaker_name || turn.speaker_id}: ${turn.content}`;
      }).join('\n');
    }

    // Format recent chat history
    let chatContext = '';
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      chatContext = chatHistory.slice(-10).map((msg: any) => `${msg.sender_id}: ${msg.content}`).join('\n');
    }

    const systemInstruction = `
You are Talk2Me AI, an intelligent, friendly, and ultra-capable AI assistant integrated directly into Talk2Me meetings and workspace chats.

Your capabilities:
1. Answer participant questions about the current meeting using the Canonical Transcript provided.
2. Provide concise summaries, action items, decision tracking, or clarification on Ghanaian or technical terminology.
3. Be friendly, accurate, and helpful. Use a professional yet warm conversational tone.

Current Meeting Transcript Context:
${transcriptContext}

Recent Meeting Chat History:
${chatContext}
`;

    const userPrompt = `User question for @Talk2Me AI: "${query}"`;

    if (GeminiService.getApiKey()) {
      try {
        const geminiResult = await GeminiService.generateContent(userPrompt, {
          model: 'gemini-1.5-flash',
          systemInstruction,
          temperature: 0.3,
        });

        if (geminiResult.text) {
          return NextResponse.json({ text: geminiResult.text });
        }
      } catch (geminiErr) {
        console.warn('[Talk2Me AI Chat Endpoint Gemini Exception]:', geminiErr);
      }
    }

    // Fallback response if no Gemini API key is configured
    return NextResponse.json({
      text: `[Talk2Me AI]: I heard your question: "${query}". (Add GEMINI_API_KEY to .env.local to enable full Gemini AI responses!)`
    });

  } catch (err) {
    console.error('[Talk2Me AI Chat Exception]:', err);
    return NextResponse.json({ text: "Sorry, I ran into an error processing your request." }, { status: 500 });
  }
}
