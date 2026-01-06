import { supabase } from '../../../../../utils/supabase';
import type { ChemistryPair, ChemistryMap } from '../types';

/**
 * Generate a consistent key for a player pair (smaller ID first)
 */
export function getChemistryPairKey(id1: string, id2: string): string {
  return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
}

/**
 * Load chemistry data for all player pairs and build a lookup map
 */
export async function loadChemistry(playerIds: string[]): Promise<ChemistryMap> {
  const { data, error } = await supabase.rpc('get_batch_player_chemistry', {
    player_ids: playerIds,
  });

  if (error) {
    console.error('Error loading chemistry data:', error);
    // Return empty map on error - chemistry is optional
    return new Map();
  }

  const chemistryMap: ChemistryMap = new Map();

  (data || []).forEach((row: {
    player1_id: string;
    player2_id: string;
    games_together: number;
    wins_together: number;
    losses_together: number;
    chemistry_score: number;
  }) => {
    const key = getChemistryPairKey(row.player1_id, row.player2_id);
    chemistryMap.set(key, {
      player1_id: row.player1_id,
      player2_id: row.player2_id,
      chemistry_score: row.chemistry_score,
      games_together: row.games_together,
      wins_together: row.wins_together,
      losses_together: row.losses_together,
    });
  });

  return chemistryMap;
}

/**
 * Get chemistry score between two players from the map
 * Returns 0 if no chemistry data exists (neutral)
 */
export function getChemistryScore(
  player1Id: string,
  player2Id: string,
  chemistryMap: ChemistryMap
): number {
  const key = getChemistryPairKey(player1Id, player2Id);
  const pair = chemistryMap.get(key);
  return pair?.chemistry_score ?? 0;
}
