/**
 * Centralized Google Gemini LLM API Client for Talk2Me AI.
 * Handles Gemini 1.5 Flash / 2.5 Flash inference for summaries, decision extraction, and meeting assistant chat.
 */

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiOptions {
  model?: string;
  temperature?: number;
  responseMimeType?: string;
  systemInstruction?: string;
}

export const GeminiService = {
  getApiKey(): string | null {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || null;
  },

  /**
   * Generates content using Google Gemini REST API
   */
  async generateContent(prompt: string | GeminiMessage[], options: GeminiOptions = {}) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured in environment variables.');
    }

    const modelName = options.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const contents = typeof prompt === 'string'
      ? [{ parts: [{ text: prompt }] }]
      : prompt;

    const payload: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.2,
      },
    };

    if (options.responseMimeType) {
      payload.generationConfig.response_mime_type = options.responseMimeType;
    }

    if (options.systemInstruction) {
      payload.system_instruction = {
        parts: [{ text: options.systemInstruction }],
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Gemini API Error ${res.status}]:`, errText);
      throw new Error(`Gemini API call failed with status ${res.status}`);
    }

    const data = await res.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    return {
      text: textResult,
      raw: data,
    };
  }
};
