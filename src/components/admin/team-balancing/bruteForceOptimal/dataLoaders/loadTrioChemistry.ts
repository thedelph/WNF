import { supabase } from '../../../../../utils/supabase';
import type { TrioChemistry, TrioMap } from '../types';

/**
 * Generate a consistent key for a trio (sorted IDs)
 */
export function getTrioKey(id1: string, id2: string, id3: string): string {
  const sorted = [id1, id2, id3].sort();
  return `${sorted[0]}-${sorted[1]}-${sorted[2]}`;
}

/**
 * Load trio chemistry data for all player trios and build a lookup map
 * Trio chemistry = how 3 players perform when all on the SAME team
 */
export async function loadTrioChemistry(playerIds: string[]): Promise<TrioMap> {
  const { data, error } = await supabase.rpc('get_batch_trio_chemistry', {
    player_ids: playerIds,
  });

  if (error) {
    console.error('Error loading trio chemistry data:', error);
    // Return empty map on error - trio chemistry is optional
    return new Map();
  }

  const trioMap: TrioMap = new Map();

  (data || []).forEach((row: {
    player1_id: string;
    player2_id: string;
    player3_id: string;
    games_together: number;
    wins: number;
    losses: number;
    draws: number;
    win_rate: number;
    trio_score: number;
  }) => {
    const key = getTrioKey(row.player1_id, row.player2_id, row.player3_id);
    trioMap.set(key, {
      player1_id: row.player1_id,
      player2_id: row.player2_id,
      player3_id: row.player3_id,
      games_together: row.games_together,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      win_rate: row.win_rate,
      trio_score: row.trio_score,
    });
  });

  return trioMap;
}

/**
 * Get trio chemistry score for three players
 * Returns 0-100 (confidence-weighted win rate), or null if no data
 */
export function getTrioScore(
  player1Id: string,
  player2Id: string,
  player3Id: string,
  trioMap: TrioMap
): number | null {
  const key = getTrioKey(player1Id, player2Id, player3Id);
  const trio = trioMap.get(key);
  return trio?.trio_score ?? null;
}

/**
 * Generate all trio combinations from a list of players
 * Returns array of [id1, id2, id3] tuples (sorted)
 */
export function generateTrioCombinations(playerIds: string[]): [string, string, string][] {
  const trios: [string, string, string][] = [];
  const n = playerIds.length;

  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      for (let k = j + 1; k < n; k++) {
        const sorted = [playerIds[i], playerIds[j], playerIds[k]].sort() as [string, string, string];
        trios.push(sorted);
      }
    }
  }

  return trios;
}
