import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  TrioLeaderboard,
  PlayerTrio,
  TrioLeaderboardResponse,
  PlayerBestTriosResponse,
  transformTrioLeaderboard,
  transformPlayerTrio,
} from '../types/chemistry';

interface UsePlayerTriosResult {
  /** Player's best trio combinations */
  playerTrios: PlayerTrio[];
  /** Whether the data is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
}

interface UsePlayerTriosOptions {
  /** The player ID to get trio stats for */
  playerId: string;
  /** Number of trios to fetch */
  limit?: number;
  /** Year filter (optional) */
  year?: number | null;
}

/**
 * Hook to fetch a player's best trio combinations
 */
export function usePlayerTrios({
  playerId,
  limit = 3,
  year = null,
}: UsePlayerTriosOptions): UsePlayerTriosResult {
  const [playerTrios, setPlayerTrios] = useState<PlayerTrio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    const fetchTrioData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: triosData, error: triosError } = await supabase.rpc(
          'get_player_best_trios',
          {
            target_player_id: playerId,
            limit_count: limit,
            target_year: year,
          }
        );

        if (triosError) {
          console.error('Error fetching player trios:', triosError);
          throw triosError;
        }

        const transformedTrios = (triosData as PlayerBestTriosResponse[] || []).map(
          transformPlayerTrio
        );
        setPlayerTrios(transformedTrios);
      } catch (err: any) {
        console.error('Error fetching trio data:', err);
        setError(err.message || 'Failed to load trio data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrioData();
  }, [playerId, limit, year]);

  return {
    playerTrios,
    loading,
    error,
  };
}

interface UseTrioLeaderboardResult {
  /** Dream teams (best trios) */
  dreamTeams: TrioLeaderboard[];
  /** Cursed trios (worst trios) */
  cursedTrios: TrioLeaderboard[];
  /** Whether the data is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Hook to fetch global trio leaderboard (dream teams and cursed trios)
 */
export function useTrioLeaderboard(
  year?: number | null,
  limit: number = 5
): UseTrioLeaderboardResult {
  const [dreamTeams, setDreamTeams] = useState<TrioLeaderboard[]>([]);
  const [cursedTrios, setCursedTrios] = useState<TrioLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch both best and worst trios in parallel
        const [bestResult, worstResult] = await Promise.all([
          supabase.rpc('get_trio_leaderboard', {
            limit_count: limit,
            target_year: year ?? null,
            sort_order: 'best',
          }),
          supabase.rpc('get_trio_leaderboard', {
            limit_count: limit,
            target_year: year ?? null,
            sort_order: 'worst',
          }),
        ]);

        if (bestResult.error) {
          throw bestResult.error;
        }
        if (worstResult.error) {
          throw worstResult.error;
        }

        const transformedDreamTeams = (bestResult.data as TrioLeaderboardResponse[] || []).map(
          transformTrioLeaderboard
        );
        const transformedCursedTrios = (worstResult.data as TrioLeaderboardResponse[] || []).map(
          transformTrioLeaderboard
        );

        // Sort dream teams by trio score (confidence-weighted performance)
        transformedDreamTeams.sort((a, b) => b.trioScore - a.trioScore);

        // Sort cursed trios by curse score (confidence-weighted inverse performance)
        transformedCursedTrios.sort((a, b) => b.curseScore - a.curseScore);

        setDreamTeams(transformedDreamTeams);
        setCursedTrios(transformedCursedTrios);
      } catch (err: any) {
        console.error('Error fetching trio leaderboard:', err);
        setError(err.message || 'Failed to load trio leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [year, limit]);

  return { dreamTeams, cursedTrios, loading, error };
}

export default usePlayerTrios;
