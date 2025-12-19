import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import {
  ChemistryLookup,
  BatchChemistryResponse,
  buildChemistryLookup,
} from '../types/chemistry';

interface UseTeamBalancingChemistryResult {
  /** Current chemistry lookup data */
  chemistryLookup: ChemistryLookup;
  /** Function to fetch chemistry for a list of players */
  fetchChemistryForPlayers: (playerIds: string[]) => Promise<ChemistryLookup>;
  /** Whether data is currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

/**
 * Hook to fetch and cache chemistry data for team balancing
 *
 * Returns a lookup Map for efficient pairwise queries during optimization.
 * Call fetchChemistryForPlayers() with the list of player IDs before
 * running the team balancing algorithm.
 *
 * @example
 * ```tsx
 * const { fetchChemistryForPlayers, loading } = useTeamBalancingChemistry();
 *
 * const handleGenerateTeams = async () => {
 *   const playerIds = players.map(p => p.player_id);
 *   const chemistryLookup = await fetchChemistryForPlayers(playerIds);
 *
 *   const result = findTierBasedTeamBalance(players, {
 *     chemistryLookup: chemistryLookup.pairs,
 *   });
 * };
 * ```
 */
export function useTeamBalancingChemistry(): UseTeamBalancingChemistryResult {
  const [chemistryLookup, setChemistryLookup] = useState<ChemistryLookup>({
    pairs: new Map(),
    pairCount: 0,
    isLoaded: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChemistryForPlayers = useCallback(
    async (playerIds: string[]): Promise<ChemistryLookup> => {
      // Need at least 2 players to have pairs
      if (playerIds.length < 2) {
        const emptyLookup: ChemistryLookup = {
          pairs: new Map(),
          pairCount: 0,
          isLoaded: true,
        };
        setChemistryLookup(emptyLookup);
        return emptyLookup;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase.rpc(
          'get_batch_player_chemistry',
          { player_ids: playerIds }
        );

        if (fetchError) {
          throw fetchError;
        }

        // Build the lookup map from response data
        const lookup = buildChemistryLookup(data as BatchChemistryResponse[] || []);

        setChemistryLookup(lookup);
        return lookup;
      } catch (err: any) {
        console.error('Error fetching chemistry data for team balancing:', err);
        const errorMessage = err.message || 'Failed to load chemistry data';
        setError(errorMessage);

        // Return empty lookup on error (algorithm will use defaults)
        const emptyLookup: ChemistryLookup = {
          pairs: new Map(),
          pairCount: 0,
          isLoaded: false,
        };
        setChemistryLookup(emptyLookup);
        return emptyLookup;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    chemistryLookup,
    fetchChemistryForPlayers,
    loading,
    error,
  };
}

export default useTeamBalancingChemistry;
