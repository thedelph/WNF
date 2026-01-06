import { supabase } from '../../../../../utils/supabase';
import type { PlayerPerformance } from '../types';

const RECENT_GAMES_THRESHOLD = 10;

/**
 * Load recent performance data (win rate and goal differential from last 10 games)
 */
export async function loadPerformance(playerIds: string[]): Promise<PlayerPerformance[]> {
  // Load win rates
  const { data: winRates, error: winRateError } = await supabase.rpc(
    'get_player_recent_win_rates',
    { games_threshold: RECENT_GAMES_THRESHOLD }
  );

  if (winRateError) {
    console.error('Error loading recent win rates:', winRateError);
  }

  // Load goal differentials
  const { data: goalDiffs, error: goalDiffError } = await supabase.rpc(
    'get_player_recent_goal_differentials',
    { games_threshold: RECENT_GAMES_THRESHOLD }
  );

  if (goalDiffError) {
    console.error('Error loading recent goal differentials:', goalDiffError);
  }

  // Create lookup maps
  // Note: RPC returns 'id' not 'player_id', and values are strings
  const winRateMap = new Map<string, number>();
  const goalDiffMap = new Map<string, number>();

  (winRates || []).forEach((row: { id: string; recent_win_rate: string | number }) => {
    const winRate = typeof row.recent_win_rate === 'string'
      ? parseFloat(row.recent_win_rate)
      : row.recent_win_rate;
    winRateMap.set(row.id, winRate);
  });

  (goalDiffs || []).forEach((row: { id: string; recent_goal_differential: string | number }) => {
    const goalDiff = typeof row.recent_goal_differential === 'string'
      ? parseFloat(row.recent_goal_differential)
      : row.recent_goal_differential;
    goalDiffMap.set(row.id, goalDiff);
  });

  // Map to player IDs we care about
  return playerIds.map((playerId) => ({
    player_id: playerId,
    recent_win_rate: winRateMap.get(playerId) ?? null,
    recent_goal_differential: goalDiffMap.get(playerId) ?? null,
  }));
}
