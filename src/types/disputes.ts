/**
 * Types for the goal dispute system
 * Allows game participants to challenge goal attributions
 */

export type DisputeType = 'wrong_scorer' | 'not_a_goal';
export type DisputeStatus = 'open' | 'upheld' | 'rejected';

export interface GoalDisputeVote {
  id: string;
  dispute_id: string;
  voter_player_id: string;
  vote: 'agree' | 'disagree';
  created_at: string;
  updated_at: string;
  voter?: {
    id: string;
    friendly_name: string;
  };
}

export interface GoalDispute {
  id: string;
  highlight_id: string;
  game_id: string;
  disputer_player_id: string;
  dispute_type: DisputeType;
  proposed_scorer_id: string | null;
  proposed_scorer_team: 'blue' | 'orange' | null;
  reason: string | null;
  status: DisputeStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  disputer?: {
    id: string;
    friendly_name: string;
  };
  proposed_scorer?: {
    id: string;
    friendly_name: string;
  } | null;
  resolved_by_player?: {
    id: string;
    friendly_name: string;
  } | null;
  votes: GoalDisputeVote[];
}

export interface CreateDisputeInput {
  highlight_id: string;
  game_id: string;
  dispute_type: DisputeType;
  proposed_scorer_id?: string;
  proposed_scorer_team?: 'blue' | 'orange';
  reason?: string;
}

export interface VoteTally {
  agree: number;
  disagree: number;
  total: number;
  agreePercent: number;
  disagreePercent: number;
  hasQuorum: boolean;
  isDecisive: boolean;
}

/** Map of highlight_id → active (open) dispute */
export type DisputesByHighlight = Record<string, GoalDispute>;
