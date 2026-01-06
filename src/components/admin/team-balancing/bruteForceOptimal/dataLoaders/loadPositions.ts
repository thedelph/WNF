import { supabase } from '../../../../../utils/supabase';
import type { PlayerPositionData } from '../types';

/**
 * Load position consensus data for players
 */
export async function loadPositions(playerIds: string[]): Promise<PlayerPositionData[]> {
  const { data, error } = await supabase
    .from('player_position_consensus')
    .select('player_id, position, percentage')
    .in('player_id', playerIds)
    .order('percentage', { ascending: false });

  if (error) {
    console.error('Error loading position data:', error);
    // Return empty positions on error - positions are optional
    return playerIds.map((playerId) => ({
      player_id: playerId,
      positions: [],
      primary_position: null,
    }));
  }

  // Group by player_id
  const positionsByPlayer = new Map<string, Array<{ position: string; percentage: number }>>();

  (data || []).forEach((row) => {
    const existing = positionsByPlayer.get(row.player_id) || [];
    existing.push({
      position: row.position,
      percentage: row.percentage,
    });
    positionsByPlayer.set(row.player_id, existing);
  });

  // Convert to output format
  return playerIds.map((playerId) => {
    const positions = positionsByPlayer.get(playerId) || [];
    // Primary position is the one with highest percentage
    const primaryPosition = positions.length > 0 ? positions[0].position : null;

    return {
      player_id: playerId,
      positions,
      primary_position: primaryPosition,
    };
  });
}
