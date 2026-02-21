/**
 * Client-side content moderation for user-submitted text
 * Simple banned word filtering with word-boundary matching
 */

const BANNED_WORDS = [
  'fuck', 'shit', 'cunt', 'dick', 'cock', 'pussy', 'bitch', 'asshole',
  'bastard', 'wanker', 'twat', 'bollocks', 'prick', 'slut', 'whore',
  'nigger', 'nigga', 'faggot', 'retard', 'spastic',
];

export function containsBannedWords(text: string): { hasBanned: boolean; word?: string } {
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      return { hasBanned: true, word };
    }
  }
  return { hasBanned: false };
}
