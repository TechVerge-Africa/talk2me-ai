/**
 * Workspace Vocabulary System for Ghanaian speech & Talk2Me contextual domain keyterms.
 * Grouped into structured categories to prioritize transcription accuracy in AssemblyAI Realtime.
 */

export interface VocabularyCategory {
  name: string;
  description: string;
  terms: string[];
}

export interface WorkspaceVocabulary {
  people: string[];
  companies: string[];
  products: string[];
  projects: string[];
  technical_terms: string[];
  acronyms: string[];
  ghanaian_terms: string[];
}

export const DEFAULT_WORKSPACE_VOCABULARY: WorkspaceVocabulary = {
  people: [
    'Kwame',
    'Ama',
    'Kofi',
    'Abena',
    'Yaw',
    'Esi',
    'Mensa',
    'Adwoa',
    'Akua',
    'Kwadwo',
    'Afia',
    'Fiifi',
  ],
  companies: [
    'Talk2Me',
    'TechVerge',
    'TechVerge Africa',
    'Supabase',
    'Groq',
    'Vercel',
    'LiveKit',
    'AssemblyAI',
    'OpenAI',
  ],
  products: [
    'Talk2Me AI',
    'DeafMode',
    'SignShield',
    'Transcript Engine',
    'RNNoise Shield',
  ],
  projects: [
    'MVP',
    'RAGLA',
    'Canonical Transcript',
    'WebRTC Pipeline',
  ],
  technical_terms: [
    'WebRTC',
    'AssemblyAI',
    'Next.js',
    'TypeScript',
    'WebSocket',
    'PCM',
    'MediaRecorder',
    'Supabase',
    'PostgreSQL',
    'TailwindCSS',
  ],
  acronyms: [
    'STT',
    'TTS',
    'RLS',
    'API',
    'SDK',
    'UMAT',
    'KNUST',
    'UG',
    'LCP',
    'INP',
  ],
  ghanaian_terms: [
    'Chale',
    'Kraa',
    'Massa',
    'Wey',
    'Dey',
    'Akwaaba',
    'Eeeh',
    'Charlay',
    'Abi',
    'Herh',
    'Chaleee',
    'Sankofa',
    'Waakye',
    'Kente',
  ],
};

/**
 * Returns a flattened array of unique keyterms for AssemblyAI `word_boost` configuration.
 */
export function getWorkspaceWordBoost(customVocab?: Partial<WorkspaceVocabulary>): string[] {
  const merged: WorkspaceVocabulary = {
    people: Array.from(new Set([...DEFAULT_WORKSPACE_VOCABULARY.people, ...(customVocab?.people || [])])),
    companies: Array.from(new Set([...DEFAULT_WORKSPACE_VOCABULARY.companies, ...(customVocab?.companies || [])])),
    products: Array.from(new Set([...DEFAULT_WORKSPACE_VOCABULARY.products, ...(customVocab?.products || [])])),
    projects: Array.from(new Set([...DEFAULT_WORKSPACE_VOCABULARY.projects, ...(customVocab?.projects || [])])),
    technical_terms: Array.from(new Set([...DEFAULT_WORKSPACE_VOCABULARY.technical_terms, ...(customVocab?.technical_terms || [])])),
    acronyms: Array.from(new Set([...DEFAULT_WORKSPACE_VOCABULARY.acronyms, ...(customVocab?.acronyms || [])])),
    ghanaian_terms: Array.from(new Set([...DEFAULT_WORKSPACE_VOCABULARY.ghanaian_terms, ...(customVocab?.ghanaian_terms || [])])),
  };

  const allTerms = [
    ...merged.people,
    ...merged.companies,
    ...merged.products,
    ...merged.projects,
    ...merged.technical_terms,
    ...merged.acronyms,
    ...merged.ghanaian_terms,
  ];

  return Array.from(new Set(allTerms.filter(t => t && t.trim().length > 0)));
}
