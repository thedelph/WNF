import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  PairTeamPlacement,
  PairTeamPlacementResponse,
  TeamPlacementPartner,
  TeamPlacementResponse,
  TEAM_PLACEMENT_MIN_GAMES,
  transformPairTeamPlacement,
  transformTeamPlacementPartner,
} from '../types/chemistry';

interface UsePairTeamPlacementResult {
  /** Team placement stats between the two players */
  pairPlacement: PairTeamPlacement | null;
  /** Games until minimum threshold is met */
  gamesUntilPlacement: number;
  /** Whether the data is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
}

interface UsePairTeamPlacementOptions {
  /** The player being viewed */
  playerId: string;
  /** The current logged-in user's player ID */
  currentPlayerId?: string;
}

/**
 * Hook to fetch team placement stats between the current user and another player
 */
export function usePairTeamPlacement({
  playerId,
  currentPlayerId,
}: UsePairTeamPlacementOptions): UsePairTeamPlacementResult {
  const [pairPlacement, setPairPlacement] = useState<PairTeamPlacement | null>(null);
  const [gamesUntilPlacement, setGamesUntilPlacement] = useState(TEAM_PLACEMENT_MIN_GAMES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId || !currentPlayerId || playerId === currentPlayerId) {
      setLoading(false);
      return;
    }

    const fetchPairPlacement = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'get_player_pair_team_placement',
          {
            player_one_id: currentPlayerId,
            player_two_id: playerId,
          }
        );

        if (rpcError) {
          console.error('Error fetching pair team placement:', rpcError);
          throw rpcError;
        }

        // RPC returns array, get first result
        const result = Array.isArray(data) && data.length > 0 ? data[0] : null;

        if (result && result.total_games >= TEAM_PLACEMENT_MIN_GAMES) {
          setPairPlacement(transformPairTeamPlacement(result as PairTeamPlacementResponse));
          setGamesUntilPlacement(0);
        } else if (result) {
          setPairPlacement(null);
          setGamesUntilPlacement(TEAM_PLACEMENT_MIN_GAMES - result.total_games);
        } else {
          setPairPlacement(null);
          setGamesUntilPlacement(TEAM_PLACEMENT_MIN_GAMES);
        }
      } catch (err: any) {
        console.error('Error fetching pair team placement:', err);
        setError(err.message || 'Failed to load team placement data');
      } finally {
        setLoading(false);
      }
    };

    fetchPairPlacement();
  }, [playerId, currentPlayerId]);

  return {
    pairPlacement,
    gamesUntilPlacement,
    loading,
    error,
  };
}

interface UseTeamPlacementsResult {
  /** Players most often on the same team */
  frequentTeammates: TeamPlacementPartner[];
  /** Players most often on the opposite team */
  frequentOpponents: TeamPlacementPartner[];
  /** Whether the data is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
}

interface UseTeamPlacementsOptions {
  /** The player ID to get team placements for */
  playerId: string;
  /** Number of results per category */
  limit?: number;
}

/**
 * Hook to fetch a player's frequent teammates and opponents
 */
export function useTeamPlacements({
  playerId,
  limit = 5,
}: UseTeamPlacementsOptions): UseTeamPlacementsResult {
  const [frequentTeammates, setFrequentTeammates] = useState<TeamPlacementPartner[]>([]);
  const [frequentOpponents, setFrequentOpponents] = useState<TeamPlacementPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    const fetchTeamPlacements = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch both teammates and opponents in parallel
        const [teammatesResult, opponentsResult] = await Promise.all([
          supabase.rpc('get_player_team_placements', {
            target_player_id: playerId,
            limit_count: limit,
            sort_by: 'most_together',
          }),
          supabase.rpc('get_player_team_placements', {
            target_player_id: playerId,
            limit_count: limit,
            sort_by: 'most_against',
          }),
        ]);

        if (teammatesResult.error) {
          throw teammatesResult.error;
        }
        if (opponentsResult.error) {
          throw opponentsResult.error;
        }

        const teammates = (teammatesResult.data as TeamPlacementResponse[] || []).map(
          transformTeamPlacementPartner
        );
        const opponents = (opponentsResult.data as TeamPlacementResponse[] || []).map(
          transformTeamPlacementPartner
        );

        setFrequentTeammates(teammates);
        setFrequentOpponents(opponents);
      } catch (err: any) {
        console.error('Error fetching team placements:', err);
        setError(err.message || 'Failed to load team placement data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamPlacements();
  }, [playerId, limit]);

  return {
    frequentTeammates,
    frequentOpponents,
    loading,
    error,
  };
}

export default useTeamPlacements;
