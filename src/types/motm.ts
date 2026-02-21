/**
 * Types for Man of the Match (MOTM) voting system
 */

export interface MotmVote {
  id: string;
  game_id: string;
  voter_player_id: string;
  voted_for_player_id: string;
  created_at: string;
  updated_at: string;
  voter?: { id: string; friendly_name: string };
  voted_for?: { id: string; friendly_name: string; avatar_svg?: string };
}

export interface MotmWinner {
  playerId: string;
  playerName: string;
  avatarSvg?: string;
  voteCount: number;
}

export type MotmVoteCounts = Record<string, number>;
