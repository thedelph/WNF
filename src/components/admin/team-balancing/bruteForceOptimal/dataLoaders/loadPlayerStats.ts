import { supabase } from '../../../../../utils/supabase';
import type { PlayerStats } from '../types';

/**
 * Load core player stats from the players table
 */
export async function loadPlayerStats(playerIds: string[]): Promise<PlayerStats[]> {
  const { data, error } = await supabase
    .from('players')
    .select('id, friendly_name, average_attack_rating, average_defense_rating, average_game_iq_rating, average_gk_rating, win_rate')
    .in('id', playerIds);

  if (error) {
    console.error('Error loading player stats:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    player_id: row.id,
    friendly_name: row.friendly_name,
    attack_rating: row.average_attack_rating,
    defense_rating: row.average_defense_rating,
    game_iq: row.average_game_iq_rating,
    gk: row.average_gk_rating,
    win_rate: row.win_rate,
  }));
}
