import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  RivalryStats,
  RivalryPairLeaderboard,
  PlayerRival,
  RivalryLeaderboardResponse,
  PlayerRivalsResponse,
  PairRivalryResponse,
  transformRivalryLeaderboard,
  transformPlayerRival,
  transformPairRivalry,
  RIVALRY_MIN_GAMES,
} from '../types/chemistry';

interface UsePlayerRivalryResult {
  /** Player's rivals (both dominant and dominated) */
  playerRivals: PlayerRival[];
  /** Rivals the player dominates */
  dominates: PlayerRival[];
  /** Rivals who dominate the player */
  dominatedBy: PlayerRival[];
  /** Rivalry stats between current user and target player (if applicable) */
  pairRivalry: RivalryStats | null;
  /** Whether the data is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Number of games until rivalry can be calculated */
  gamesUntilRivalry: number;
}

interface UsePlayerRivalryOptions {
  /** The player ID to get rivalry stats for */
  playerId: string;
  /** The current user's player ID (for pair rivalry) */
  currentPlayerId?: string | null;
  /** Number of rivals to fetch per category */
  limit?: number;
  /** Year filter (optional) */
  year?: number | null;
}

/**
 * Hook to fetch player rivalry data
 *
 * Fetches:
 * 1. Top N rivals for a player (split into dominant/dominated)
 * 2. Rivalry stats between current user and the viewed player
 */
export function usePlayerRivalry({
  playerId,
  currentPlayerId,
  limit = 3,
  year = null,
}: UsePlayerRivalryOptions): UsePlayerRivalryResult {
  const [playerRivals, setPlayerRivals] = useState<PlayerRival[]>([]);
  const [dominates, setDominates] = useState<PlayerRival[]>([]);
  const [dominatedBy, setDominatedBy] = useState<PlayerRival[]>([]);
  const [pairRivalry, setPairRivalry] = useState<RivalryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamesUntilRivalry, setGamesUntilRivalry] = useState(0);

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    const fetchRivalryData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch player's rivals
        const { data: rivalsData, error: rivalsError } = await supabase.rpc(
          'get_player_rivals',
          {
            target_player_id: playerId,
            limit_count: limit * 2, // Fetch more to split between dominant/dominated
            target_year: year,
          }
        );

        if (rivalsError) {
          console.error('Error fetching player rivals:', rivalsError);
          throw rivalsError;
        }

        const transformedRivals = (rivalsData as PlayerRivalsResponse[] || []).map(
          transformPlayerRival
        );
        setPlayerRivals(transformedRivals);

        // Split into dominates and dominated
        const dominantRivals = transformedRivals
          .filter((r) => r.dominanceType === 'dominates')
          .slice(0, limit);
        const dominatedRivals = transformedRivals
          .filter((r) => r.dominanceType === 'dominated')
          .slice(0, limit);

        setDominates(dominantRivals);
        setDominatedBy(dominatedRivals);

        // Fetch pair rivalry if current user is different from viewed player
        if (currentPlayerId && currentPlayerId !== playerId) {
          const { data: pairData, error: pairError } = await supabase.rpc(
            'get_player_pair_rivalry',
            {
              player_one_id: currentPlayerId,
              player_two_id: playerId,
            }
          );

          if (pairError) {
            console.error('Error fetching pair rivalry:', pairError);
            // Don't throw - pair rivalry is optional
          } else if (pairData && pairData.length > 0) {
            const rawPairData = pairData[0] as PairRivalryResponse;
            const transformedPair = transformPairRivalry(rawPairData);
            setPairRivalry(transformedPair);

            // Calculate games until rivalry threshold
            if (transformedPair.gamesAgainst < RIVALRY_MIN_GAMES) {
              setGamesUntilRivalry(RIVALRY_MIN_GAMES - transformedPair.gamesAgainst);
            } else {
              setGamesUntilRivalry(0);
            }
          } else {
            // No games against each other yet
            setPairRivalry(null);
            setGamesUntilRivalry(RIVALRY_MIN_GAMES);
          }
        }
      } catch (err: any) {
        console.error('Error fetching rivalry data:', err);
        setError(err.message || 'Failed to load rivalry data');
      } finally {
        setLoading(false);
      }
    };

    fetchRivalryData();
  }, [playerId, currentPlayerId, limit, year]);

  return {
    playerRivals,
    dominates,
    dominatedBy,
    pairRivalry,
    loading,
    error,
    gamesUntilRivalry,
  };
}

/**
 * Hook to fetch global rivalry leaderboard (most lopsided rivalries)
 */
export function useRivalryLeaderboard(year?: number | null, limit: number = 10) {
  const [rivalries, setRivalries] = useState<RivalryPairLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase.rpc('get_rivalry_leaderboard', {
          limit_count: limit,
          target_year: year ?? null,
        });

        if (fetchError) {
          throw fetchError;
        }

        const transformedRivalries = (data as RivalryLeaderboardResponse[] || []).map(
          transformRivalryLeaderboard
        );

        // Sort by rivalry score (confidence-weighted dominance)
        transformedRivalries.sort((a, b) => b.rivalryScore - a.rivalryScore);

        setRivalries(transformedRivalries);
      } catch (err: any) {
        console.error('Error fetching rivalry leaderboard:', err);
        setError(err.message || 'Failed to load rivalry leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [year, limit]);

  return { rivalries, loading, error };
}

export default usePlayerRivalry;
