import { supabase } from '../../../../../utils/supabase';
import type { RivalryPair, RivalryMap } from '../types';

/**
 * Generate a consistent key for a rivalry pair (smaller ID first)
 */
export function getRivalryPairKey(id1: string, id2: string): string {
  return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
}

/**
 * Load rivalry data for all player pairs and build a lookup map
 * Rivalry = how players perform when on OPPOSITE teams
 */
export async function loadRivalry(playerIds: string[]): Promise<RivalryMap> {
  const { data, error } = await supabase.rpc('get_batch_player_rivalry', {
    player_ids: playerIds,
  });

  if (error) {
    console.error('Error loading rivalry data:', error);
    // Return empty map on error - rivalry is optional
    return new Map();
  }

  const rivalryMap: RivalryMap = new Map();

  (data || []).forEach((row: {
    player1_id: string;
    player2_id: string;
    games_against: number;
    player1_wins: number;
    player2_wins: number;
    draws: number;
    rivalry_score: number;
  }) => {
    const key = getRivalryPairKey(row.player1_id, row.player2_id);
    rivalryMap.set(key, {
      player1_id: row.player1_id,
      player2_id: row.player2_id,
      games_against: row.games_against,
      player1_wins: row.player1_wins,
      player2_wins: row.player2_wins,
      draws: row.draws,
      rivalry_score: row.rivalry_score,
    });
  });

  return rivalryMap;
}

/**
 * Get rivalry advantage for player1 over player2
 * Returns a value from -50 to +50:
 *   - Positive = player1 has advantage over player2
 *   - Negative = player2 has advantage over player1
 *   - 0 = neutral (no data or exactly even)
 *
 * Example: If player1 beats player2 80% of the time:
 *   rivalry_score = 80, advantage = 80 - 50 = +30 for player1
 */
export function getRivalryAdvantage(
  player1Id: string,
  player2Id: string,
  rivalryMap: RivalryMap
): number {
  const key = getRivalryPairKey(player1Id, player2Id);
  const pair = rivalryMap.get(key);

  if (!pair) {
    return 0; // No data = neutral
  }

  // rivalry_score is from player1's perspective (where player1 < player2 alphabetically)
  // If the requested player1Id matches the stored player1_id, return as-is
  // Otherwise, invert it (100 - score)
  const isPlayer1First = player1Id < player2Id;
  const player1Advantage = pair.rivalry_score - 50;

  return isPlayer1First ? player1Advantage : -player1Advantage;
}
