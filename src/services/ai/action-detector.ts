import { CanonicalTranscriptEntry } from '@/services/supabase/transcripts';
import { BoardActionCategory, BoardActionPriority } from '@/types/work-board';

export interface DetectedActionCandidate {
  id: string; // ephemeral client ID
  title: string;
  category: BoardActionCategory;
  assignee_name: string;
  assignee_id?: string | null;
  due_date_text?: string;
  due_date?: string | null;
  priority: BoardActionPriority;
  evidence_quote: string;
  evidence_timestamp_ms: number;
  evidence_speaker: string;
  confidence: number;
}

interface ParticipantInfo {
  id: string;
  name: string;
}

/**
 * Normalizes relative date phrases (e.g. "by Friday", "by tomorrow") into an ISO date string
 */
function parseRelativeDueDate(text: string): { due_date_text?: string; due_date?: string } {
  const lower = text.toLowerCase();
  const now = new Date();

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Check for "by tomorrow" or "tomorrow"
  if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0); // 5 PM
    return { due_date_text: 'Tomorrow (5:00 PM)', due_date: d.toISOString() };
  }

  // Check for "by end of day" or "today"
  if (lower.includes('end of day') || lower.includes('eod') || lower.includes('by today')) {
    const d = new Date(now);
    d.setHours(18, 0, 0, 0);
    return { due_date_text: 'Today (EOD)', due_date: d.toISOString() };
  }

  // Check for day of week e.g. "by Friday" or "on Friday"
  for (let i = 0; i < daysOfWeek.length; i++) {
    const day = daysOfWeek[i];
    if (new RegExp(`\\b(by|before|on|until)\\s+${day}\\b`, 'i').test(lower)) {
      const currentDay = now.getDay();
      let diff = i - currentDay;
      if (diff <= 0) diff += 7; // Next occurrence
      const target = new Date(now);
      target.setDate(target.getDate() + diff);
      target.setHours(17, 0, 0, 0);
      const capDay = day.charAt(0).toUpperCase() + day.slice(1);
      return { due_date_text: `${capDay} (5:00 PM)`, due_date: target.toISOString() };
    }
  }

  // Check for "next week"
  if (lower.includes('next week')) {
    const target = new Date(now);
    target.setDate(target.getDate() + 7);
    target.setHours(17, 0, 0, 0);
    return { due_date_text: 'Next Week', due_date: target.toISOString() };
  }

  return {};
}

/**
 * Searches participant list to find best match for a spoken name
 */
function matchParticipant(nameQuery: string, participants: ParticipantInfo[]): ParticipantInfo | null {
  if (!nameQuery || !participants.length) return null;
  const q = nameQuery.toLowerCase().trim();

  for (const p of participants) {
    const pName = p.name.toLowerCase();
    if (pName === q || pName.startsWith(q) || q.startsWith(pName)) {
      return p;
    }
    const parts = pName.split(/\s+/);
    if (parts.some(part => part === q)) {
      return p;
    }
  }
  return null;
}

export const ActionDetectorService = {
  /**
   * Fast real-time heuristic analyzer for canonical transcript turns.
   * Returns a candidate action item if the turn contains assignment or commitment patterns.
   */
  detectActionCandidate(
    turn: CanonicalTranscriptEntry,
    participants: ParticipantInfo[] = []
  ): DetectedActionCandidate | null {
    if (!turn || !turn.content || turn.content.trim().length < 8) return null;

    const content = turn.content.trim();
    const speaker = turn.speaker_name || turn.speaker_id || 'Speaker';
    const lower = content.toLowerCase();

    // 1. Milestone / Goal pattern
    if (/(\bmilestone\b|\bgoal\b|\btarget\s+launch\b|\brelease\s+date\b)/i.test(lower)) {
      const parsedDate = parseRelativeDueDate(content);
      let title = content.replace(/^(our\s+)?(milestone|goal|target)(\s+is)?[:\s]*/i, '').trim();
      if (title.length > 80) title = title.slice(0, 80) + '...';

      return {
        id: `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: title || 'Key Milestone',
        category: 'milestone',
        assignee_name: 'Team',
        assignee_id: null,
        due_date_text: parsedDate.due_date_text,
        due_date: parsedDate.due_date,
        priority: 'high',
        evidence_quote: content,
        evidence_timestamp_ms: turn.start_ms || 0,
        evidence_speaker: speaker,
        confidence: 0.9,
      };
    }

    // 2. Direct assignment to a participant: "Kwame, can you..." or "Can Kwame handle..."
    const directAssignmentRegex = /\b([a-z]+)[,\s]+(can you|please|could you|will you|take care of|handle|work on|deploy|review|prepare|finish)\b\s+(.*)/i;
    const match = content.match(directAssignmentRegex);

    if (match) {
      const potentialName = match[1];
      const matched = matchParticipant(potentialName, participants);
      const actionRest = match[3] || content;

      const parsedDate = parseRelativeDueDate(content);
      let cleanTitle = actionRest.replace(/[.?!]+$/, '').trim();
      if (cleanTitle.length > 90) cleanTitle = cleanTitle.slice(0, 90) + '...';

      const assigneeName = matched ? matched.name : potentialName.charAt(0).toUpperCase() + potentialName.slice(1);

      return {
        id: `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
        category: 'action_item',
        assignee_name: assigneeName,
        assignee_id: matched?.id || null,
        due_date_text: parsedDate.due_date_text,
        due_date: parsedDate.due_date,
        priority: /urgent|asap|critical|blocking/i.test(lower) ? 'urgent' : 'medium',
        evidence_quote: content,
        evidence_timestamp_ms: turn.start_ms || 0,
        evidence_speaker: speaker,
        confidence: matched ? 0.95 : 0.82,
      };
    }

    // 3. Self-commitment: "I will handle...", "I'll do...", "I can take care of..."
    const selfCommitmentRegex = /\b(i will|i'll|i can|i'm going to)\s+(handle|take care of|prepare|deploy|fix|update|implement|write|send|check|review|finish|schedule)\b\s+(.*)/i;
    const selfMatch = content.match(selfCommitmentRegex);

    if (selfMatch) {
      const verb = selfMatch[2];
      const rest = selfMatch[3] || '';
      let cleanTitle = `${verb} ${rest}`.replace(/[.?!]+$/, '').trim();
      if (cleanTitle.length > 90) cleanTitle = cleanTitle.slice(0, 90) + '...';

      const parsedDate = parseRelativeDueDate(content);

      // Match speaker against participants to find assignee_id
      const matchedSpeaker = matchParticipant(speaker, participants);

      return {
        id: `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
        category: 'action_item',
        assignee_name: speaker,
        assignee_id: matchedSpeaker?.id || turn.user_id || null,
        due_date_text: parsedDate.due_date_text,
        due_date: parsedDate.due_date,
        priority: /urgent|asap|today|immediately/i.test(lower) ? 'urgent' : 'medium',
        evidence_quote: content,
        evidence_timestamp_ms: turn.start_ms || 0,
        evidence_speaker: speaker,
        confidence: 0.88,
      };
    }

    // 4. Group agreement / Decision action: "Let's make sure we..." or "Action item: ..."
    if (/(\baction\s+item\b|\blet's\s+make\s+sure\b|\bwe\s+need\s+to\b)/i.test(lower)) {
      let title = content.replace(/^(action item:?|let's make sure|we need to)\s*/i, '').trim();
      if (title.length > 90) title = title.slice(0, 90) + '...';

      const parsedDate = parseRelativeDueDate(content);

      return {
        id: `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        category: 'action_item',
        assignee_name: 'Unassigned',
        assignee_id: null,
        due_date_text: parsedDate.due_date_text,
        due_date: parsedDate.due_date,
        priority: 'medium',
        evidence_quote: content,
        evidence_timestamp_ms: turn.start_ms || 0,
        evidence_speaker: speaker,
        confidence: 0.78,
      };
    }

    return null;
  }
};

