import { PlayerStats } from '../utils/xpCalculations';

export interface Player {
  id: string;
  friendly_name: string;
  isRandomlySelected?: boolean;
  selectionMethod?: string;
  stats?: PlayerStats;
}

export interface ExtendedPlayerData {
  id: string;
  friendly_name: string;
  win_rate: number;
  max_streak: number;
  avatar_svg: string;
  stats: PlayerStats;
  isRandomlySelected: boolean;
  selectionMethod: string;
}

export interface PlayerSelectionResultsProps {
  gameId: string;
}

export interface ReservePlayer {
  player_id: string;
  status: string;
  created_at: string;
  players: {
    id: string;
    friendly_name: string;
    caps: number;
    active_bonuses: number;
    active_penalties: number;
    current_streak: number;
  };
}
