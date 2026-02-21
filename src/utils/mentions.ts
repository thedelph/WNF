/**
 * Utilities for @mention parsing and rendering
 * Storage format: @[friendly_name](player_id)
 */

export interface MentionSegment {
  type: 'text' | 'mention';
  text: string;
  playerId?: string;
}

/** Regex to match @[name](uuid) */
const MENTION_REGEX = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g;

/**
 * Parse mention-formatted text into segments for rendering
 */
export function segmentMentionText(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;

  const regex = new RegExp(MENTION_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before this mention
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    // The mention itself
    segments.push({
      type: 'mention',
      text: match[1], // friendly_name
      playerId: match[2], // player_id
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last mention
  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Insert a mention into text at a given cursor position,
 * replacing any partial @query at that position
 */
export function insertMention(
  text: string,
  cursorPos: number,
  playerName: string,
  playerId: string
): { newText: string; newCursorPos: number } {
  // Find the start of the @query we're completing
  let atPos = cursorPos - 1;
  while (atPos >= 0 && text[atPos] !== '@') {
    atPos--;
  }

  if (atPos < 0) {
    // No @ found, just append
    const mention = `@[${playerName}](${playerId}) `;
    const newText = text.slice(0, cursorPos) + mention + text.slice(cursorPos);
    return { newText, newCursorPos: cursorPos + mention.length };
  }

  const mention = `@[${playerName}](${playerId}) `;
  const newText = text.slice(0, atPos) + mention + text.slice(cursorPos);
  return { newText, newCursorPos: atPos + mention.length };
}

/**
 * Extract all mentioned player IDs from mention-formatted text
 */
export function extractMentionedPlayerIds(text: string): string[] {
  const ids: string[] = [];
  const regex = new RegExp(MENTION_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    ids.push(match[2]);
  }

  return [...new Set(ids)];
}

/**
 * Get the current @query being typed at the cursor position
 * Returns null if not currently typing a mention
 */
export function getCurrentMentionQuery(text: string, cursorPos: number): string | null {
  // Walk backwards from cursor to find @
  let pos = cursorPos - 1;
  while (pos >= 0) {
    const char = text[pos];
    // Stop at @ (found the mention trigger)
    if (char === '@') {
      // Check if this @ is at the start or preceded by a space/newline
      if (pos === 0 || /\s/.test(text[pos - 1])) {
        return text.slice(pos + 1, cursorPos);
      }
      return null;
    }
    // Stop at whitespace or special chars (not a valid mention query)
    if (/[\s\[\]()]/.test(char)) {
      return null;
    }
    pos--;
  }
  return null;
}
