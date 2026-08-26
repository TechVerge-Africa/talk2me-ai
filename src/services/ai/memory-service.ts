import { GeminiService } from './gemini-service';
import { MemoryCategory } from '../supabase/memory';

export interface ExtractedMemoryItem {
  category: MemoryCategory;
  title: string;
  content: string;
  tags: string[];
}

export const AiMemoryService = {
  /**
   * Extract long-term workspace memories from meeting transcripts or chat messages.
   */
  async extractMemoriesFromText(text: string, contextType: 'transcript' | 'chat'): Promise<ExtractedMemoryItem[]> {
    if (!text || !text.trim()) return [];

    const prompt = `
You are Talk2Me AI's Memory Synthesis Engine.
Analyze the following ${contextType === 'transcript' ? 'Meeting Transcript' : 'Workspace Discussion'} and extract long-term memory items that should be remembered by the team's AI assistant across future meetings and chats.

Extract ONLY important long-term facts, technical specs, architectural decisions, user preferences, project guidelines, or major action items. Ignore trivial small talk.

Categorize each extracted memory item into EXACTLY one of:
- "decision": Technical, architectural, product, or organizational decisions agreed upon by the team.
- "spec": System specifications, API requirements, tech stack details, or project standards.
- "fact": Key project background info, timeline dates, or team roles.
- "user_preference": Explicit preferences or workflows stated by team members.
- "action_item": Critical tasks or responsibilities assigned to specific team members.
- "summary": Broad summary of key milestone or discussion outcome.

Output ONLY valid JSON matching this schema:
{
  "memories": [
    {
      "category": "decision" | "spec" | "fact" | "user_preference" | "action_item" | "summary",
      "title": "Short descriptive title (3-8 words)",
      "content": "Detailed clear memory statement to retain long-term",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Content to analyze:
${text}
`;

    if (!GeminiService.getApiKey()) {
      return [];
    }

    try {
      const result = await GeminiService.generateContent(prompt, {
        model: 'gemini-2.5-flash',
        responseMimeType: 'application/json',
        temperature: 0.2,
      });

      if (!result.text) return [];

      const parsed = JSON.parse(result.text);
      return Array.isArray(parsed.memories) ? parsed.memories : [];
    } catch (err) {
      console.error('[AiMemoryService.extractMemoriesFromText] Exception:', err);
      return [];
    }
  },
};
