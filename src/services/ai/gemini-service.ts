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

    const primaryModel = options.model || 'gemini-2.5-flash-lite';
    const candidateModels = Array.from(
      new Set([primaryModel, 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'])
    );

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

    let lastError: Error | null = null;

    for (const modelName of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[Gemini API Warning - Model ${modelName} returned status ${res.status}]:`, errText.slice(0, 200));
          lastError = new Error(`Gemini API call to ${modelName} failed with status ${res.status}`);
          // If quota exceeded (429) or model not found (404), continue to next candidate model
          if (res.status === 429 || res.status === 404 || res.status === 503) {
            continue;
          }
          throw lastError;
        }

        const data = await res.json();
        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        return {
          model: modelName,
          text: textResult,
          raw: data,
        };
      } catch (err: any) {
        lastError = err;
        // Continue to fallback if not at end of candidate list
      }
    }

    throw lastError || new Error('All Gemini candidate models failed to respond.');
  }
};
