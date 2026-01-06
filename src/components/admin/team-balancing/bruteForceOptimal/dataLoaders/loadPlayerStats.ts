import { supabase } from '../../../../../utils/supabase';
import type { PlayerStats } from '../types';

/**
 * Load core player stats from the players table
 */
export async function loadPlayerStats(playerIds: string[]): Promise<PlayerStats[]> {
  const { data, error } = await supabase
    .from('players')
    .select('id, friendly_name, attack_rating, defense_rating, game_iq, gk, win_rate')
    .in('id', playerIds);

  if (error) {
    console.error('Error loading player stats:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    player_id: row.id,
    friendly_name: row.friendly_name,
    attack_rating: row.attack_rating,
    defense_rating: row.defense_rating,
    game_iq: row.game_iq,
    gk: row.gk,
    win_rate: row.win_rate,
  }));
}
