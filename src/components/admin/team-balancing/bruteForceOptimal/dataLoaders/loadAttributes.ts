import { supabase } from '../../../../../utils/supabase';
import type { PlayerAttributes } from '../types';

/**
 * Load derived attributes from player ratings
 * Aggregates has_* boolean fields across all raters
 */
export async function loadAttributes(playerIds: string[]): Promise<PlayerAttributes[]> {
  const { data, error } = await supabase
    .from('player_ratings')
    .select(
      'rated_player_id, has_pace, has_shooting, has_passing, has_dribbling, has_defending, has_physical'
    )
    .in('rated_player_id', playerIds);

  if (error) {
    console.error('Error loading attribute data:', error);
    // Return default attributes on error
    return playerIds.map((playerId) => ({
      player_id: playerId,
      pace: 0,
      shooting: 0,
      passing: 0,
      dribbling: 0,
      defending: 0,
      physical: 0,
    }));
  }

  // Group by player and calculate percentages
  const attributesByPlayer = new Map<
    string,
    {
      pace: number;
      shooting: number;
      passing: number;
      dribbling: number;
      defending: number;
      physical: number;
      count: number;
    }
  >();

  (data || []).forEach((row) => {
    const existing = attributesByPlayer.get(row.rated_player_id) || {
      pace: 0,
      shooting: 0,
      passing: 0,
      dribbling: 0,
      defending: 0,
      physical: 0,
      count: 0,
    };

    existing.pace += row.has_pace ? 1 : 0;
    existing.shooting += row.has_shooting ? 1 : 0;
    existing.passing += row.has_passing ? 1 : 0;
    existing.dribbling += row.has_dribbling ? 1 : 0;
    existing.defending += row.has_defending ? 1 : 0;
    existing.physical += row.has_physical ? 1 : 0;
    existing.count += 1;

    attributesByPlayer.set(row.rated_player_id, existing);
  });

  // Convert to percentages (0-1)
  return playerIds.map((playerId) => {
    const attrs = attributesByPlayer.get(playerId);
    if (!attrs || attrs.count === 0) {
      return {
        player_id: playerId,
        pace: 0,
        shooting: 0,
        passing: 0,
        dribbling: 0,
        defending: 0,
        physical: 0,
      };
    }

    return {
      player_id: playerId,
      pace: attrs.pace / attrs.count,
      shooting: attrs.shooting / attrs.count,
      passing: attrs.passing / attrs.count,
      dribbling: attrs.dribbling / attrs.count,
      defending: attrs.defending / attrs.count,
      physical: attrs.physical / attrs.count,
    };
  });
}
