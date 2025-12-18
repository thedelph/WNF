import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  ChemistryStats,
  ChemistryPartner,
  TopPartnerResponse,
  PairChemistryResponse,
  transformChemistryStats,
  transformChemistryPartner,
  CHEMISTRY_MIN_GAMES,
} from '../types/chemistry';

interface UsePlayerChemistryResult {
  /** Top chemistry partners for the target player */
  topPartners: ChemistryPartner[];
  /** Chemistry stats between current user and target player (if applicable) */
  pairChemistry: ChemistryStats | null;
  /** Whether the data is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Number of games until chemistry can be calculated */
  gamesUntilChemistry: number;
}

interface UsePlayerChemistryOptions {
  /** The player ID to get chemistry stats for */
  playerId: string;
  /** The current user's player ID (for pair chemistry) */
  currentPlayerId?: string | null;
  /** Number of top partners to fetch */
  limit?: number;
  /** Year filter (optional) */
  year?: number | null;
}

/**
 * Hook to fetch player chemistry data
 *
 * Fetches:
 * 1. Top N chemistry partners for a player
 * 2. Chemistry stats between current user and the viewed player
 */
export function usePlayerChemistry({
  playerId,
  currentPlayerId,
  limit = 3,
  year = null,
}: UsePlayerChemistryOptions): UsePlayerChemistryResult {
  const [topPartners, setTopPartners] = useState<ChemistryPartner[]>([]);
  const [pairChemistry, setPairChemistry] = useState<ChemistryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamesUntilChemistry, setGamesUntilChemistry] = useState(0);

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    const fetchChemistryData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch top chemistry partners
        const { data: partnersData, error: partnersError } = await supabase.rpc(
          'get_player_top_chemistry_partners',
          {
            target_player_id: playerId,
            limit_count: limit,
            target_year: year,
          }
        );

        if (partnersError) {
          console.error('Error fetching top chemistry partners:', partnersError);
          throw partnersError;
        }

        const transformedPartners = (partnersData as TopPartnerResponse[] || []).map(
          transformChemistryPartner
        );
        setTopPartners(transformedPartners);

        // Fetch pair chemistry if current user is different from viewed player
        if (currentPlayerId && currentPlayerId !== playerId) {
          const { data: pairData, error: pairError } = await supabase.rpc(
            'get_player_pair_chemistry',
            {
              player_one_id: currentPlayerId,
              player_two_id: playerId,
            }
          );

          if (pairError) {
            console.error('Error fetching pair chemistry:', pairError);
            // Don't throw - pair chemistry is optional
          } else if (pairData && pairData.length > 0) {
            const rawPairData = pairData[0] as PairChemistryResponse;
            const transformedPair = transformChemistryStats(rawPairData);
            setPairChemistry(transformedPair);

            // Calculate games until chemistry threshold
            if (transformedPair.gamesTogether < CHEMISTRY_MIN_GAMES) {
              setGamesUntilChemistry(CHEMISTRY_MIN_GAMES - transformedPair.gamesTogether);
            } else {
              setGamesUntilChemistry(0);
            }
          } else {
            // No games together yet
            setPairChemistry(null);
            setGamesUntilChemistry(CHEMISTRY_MIN_GAMES);
          }
        }
      } catch (err: any) {
        console.error('Error fetching chemistry data:', err);
        setError(err.message || 'Failed to load chemistry data');
      } finally {
        setLoading(false);
      }
    };

    fetchChemistryData();
  }, [playerId, currentPlayerId, limit, year]);

  return {
    topPartners,
    pairChemistry,
    loading,
    error,
    gamesUntilChemistry,
  };
}

/**
 * Hook to fetch global chemistry leaderboard
 */
export function useChemistryLeaderboard(year?: number | null) {
  const [pairs, setPairs] = useState<ChemistryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase.rpc('get_player_chemistry', {
          target_player_id: null,
          target_year: year ?? null,
        });

        if (fetchError) {
          throw fetchError;
        }

        // Transform the data - for leaderboard we need ChemistryPair format
        // but present it as top pairs
        const transformedPairs = (data || []).slice(0, 10).map((raw: any) => ({
          partnerId: raw.player2_id,
          partnerName: `${raw.player1_name} & ${raw.player2_name}`,
          gamesTogether: Number(raw.games_together),
          winsTogether: Number(raw.wins_together),
          drawsTogether: Number(raw.draws_together),
          lossesTogether: Number(raw.losses_together),
          performanceRate: Number(raw.performance_rate),
          chemistryScore: Number(raw.chemistry_score),
          // Include both player IDs for linking
          player1Id: raw.player1_id,
          player1Name: raw.player1_name,
          player2Id: raw.player2_id,
          player2Name: raw.player2_name,
        }));

        setPairs(transformedPairs);
      } catch (err: any) {
        console.error('Error fetching chemistry leaderboard:', err);
        setError(err.message || 'Failed to load chemistry leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [year]);

  return { pairs, loading, error };
}

export default usePlayerChemistry;
