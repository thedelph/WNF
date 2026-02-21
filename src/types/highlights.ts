/**
 * Types and constants for game highlights (timestamped video moments)
 */

export type HighlightType = 'goal' | 'save' | 'skill' | 'moment' | 'funny' | 'controversial';

export interface GameHighlight {
  id: string;
  game_id: string;
  player_id: string;
  highlight_type: HighlightType;
  timestamp_seconds: number;
  description: string;
  scorer_player_id: string | null;
  scorer_team: 'blue' | 'orange' | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  player?: {
    id: string;
    friendly_name: string;
    avatar_svg?: string;
  };
  scorer?: {
    id: string;
    friendly_name: string;
  } | null;
}

export interface CreateHighlightInput {
  game_id: string;
  highlight_type: HighlightType;
  timestamp_seconds: number;
  description: string;
  scorer_player_id?: string;
  scorer_team?: 'blue' | 'orange';
}

export interface UpdateHighlightInput {
  description?: string;
  timestamp_seconds?: number;
  scorer_player_id?: string | null;
  scorer_team?: 'blue' | 'orange' | null;
}

export const HIGHLIGHT_TYPES: {
  value: HighlightType;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { value: 'goal', label: 'Goal', emoji: '\u26BD', color: 'text-success' },
  { value: 'save', label: 'Save', emoji: '\uD83E\uDDE4', color: 'text-info' },
  { value: 'skill', label: 'Skill', emoji: '\u2728', color: 'text-warning' },
  { value: 'moment', label: 'Moment', emoji: '\uD83D\uDCF8', color: 'text-primary' },
  { value: 'funny', label: 'Funny', emoji: '\uD83D\uDE02', color: 'text-accent' },
  { value: 'controversial', label: 'Controversial', emoji: '\uD83D\uDD25', color: 'text-error' },
];

// ─── Reactions ────────────────────────────────────────────────────────────────

export type ReactionType = 'fire' | 'laugh' | 'clap' | 'mindblown' | 'skull';

export const REACTION_TYPES: { key: ReactionType; emoji: string; label: string }[] = [
  { key: 'fire', emoji: '\uD83D\uDD25', label: 'Fire' },
  { key: 'laugh', emoji: '\uD83D\uDE02', label: 'Hilarious' },
  { key: 'clap', emoji: '\uD83D\uDC4F', label: 'Well played' },
  { key: 'mindblown', emoji: '\uD83E\uDD2F', label: 'Mind blown' },
  { key: 'skull', emoji: '\uD83D\uDC80', label: 'Dead' },
];

export interface HighlightReaction {
  id: string;
  highlight_id: string;
  player_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ReactionSummary {
  counts: Record<ReactionType, number>;
  reactorNames: Record<ReactionType, string[]>;
  userReaction: ReactionType | null;
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export interface HighlightBookmark {
  id: string;
  highlight_id: string;
  player_id: string;
  created_at: string;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface HighlightComment {
  id: string;
  highlight_id: string;
  player_id: string;
  content: string;
  mentioned_player_ids: string[];
  created_at: string;
  updated_at: string;
  player?: {
    id: string;
    friendly_name: string;
    avatar_svg?: string;
  };
}

export interface CreateCommentInput {
  highlight_id: string;
  content: string;
  mentioned_player_ids?: string[];
}

export interface UpdateCommentInput {
  content: string;
  mentioned_player_ids?: string[];
}

// ─── Highlight Awards ────────────────────────────────────────────────────────

export type HighlightAwardType = 'best_goal' | 'play_of_the_match';

export const HIGHLIGHT_AWARD_TYPES: {
  key: HighlightAwardType;
  label: string;
  emoji: string;
  color: string;
  eligibleTypes: HighlightType[] | 'all';
}[] = [
  { key: 'best_goal', label: 'Best Goal', emoji: '\u26BD', color: 'text-amber-500', eligibleTypes: ['goal'] },
  { key: 'play_of_the_match', label: 'Play of the Match', emoji: '\u2B50', color: 'text-amber-500', eligibleTypes: 'all' },
];

export interface HighlightAwardVote {
  id: string;
  game_id: string;
  voter_player_id: string;
  highlight_id: string;
  award_type: string;
  created_at: string;
  updated_at: string;
}

export interface HighlightAwardWinner {
  highlightId: string;
  awardType: HighlightAwardType;
  voteCount: number;
}
