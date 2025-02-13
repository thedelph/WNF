import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { executeWithRetry } from '../utils/network';

interface TokenStatus {
  status: string;
  lastUsedAt: string | null;
  nextTokenAt: string | null;
  createdAt: string;
  isEligible: boolean;
  recentGames: string[];
  hasPlayedInLastTenGames: boolean;
  hasRecentSelection: boolean;
}

/**
 * Custom hook to manage token status for a player
 * Handles fetching token data, eligibility, and recent games
 * @param playerId - UUID of the player to check
 * @returns TokenStatus object containing all token-related information
 */
export function useTokenStatus(playerId: string) {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTokenStatus = async () => {
      if (!playerId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get latest sequence number first
        const { data: latestGame } = await executeWithRetry(
          () => supabase
            .from('games')
            .select('sequence_number')
            .eq('completed', true)
            .order('sequence_number', { ascending: false })
            .limit(1)
            .single(),
          {
            shouldToast: false
          }
        );

        const latestSequence = latestGame?.sequence_number || 0;
        const lastThreeSequences = [latestSequence, latestSequence - 1, latestSequence - 2];
        const lastTenSequences = Array.from(
          { length: 10 }, 
          (_, i) => latestSequence - i
        );

        // Get token status from public view
        const { data: publicTokenStatus, error: publicTokenError } = await executeWithRetry(
          () => supabase
            .from('public_player_token_status')
            .select('*')
            .eq('player_id', playerId)
            .single(),
          { 
            shouldToast: false,
            maxRetries: 2
          }
        );

        if (publicTokenError) {
          console.error('Error fetching public token status:', publicTokenError);
        }

        // Get recent games where player was selected, using sequence number range
        const { data: recentGames, error: recentGamesError } = await executeWithRetry(
          () => supabase
            .from('public_player_game_history')
            .select('sequence_number')
            .eq('player_id', playerId)
            .eq('status', 'selected')
            .gt('sequence_number', latestSequence - 10)  // Get all games in last 10 sequence numbers
            .order('sequence_number', { ascending: false }),
          {
            shouldToast: false
          }
        );

        if (recentGamesError) {
          console.error('Error fetching recent games:', recentGamesError);
        }

        // Debug logging
        console.log('[useTokenStatus] Sequence numbers:', {
          latestSequence,
          lastThreeSequences,
          playerGames: recentGames?.map(g => g.sequence_number)
        });

        // Check if player was selected in any of the last 3 games
        const recentSelections = recentGames?.filter(g => 
          lastThreeSequences.includes(g.sequence_number)
        ) || [];
        const hasRecentSelection = recentSelections.length > 0;

        // Check if player has played in last 10 games
        const hasPlayedInLastTenGames = recentGames?.some(g => 
          lastTenSequences.includes(g.sequence_number)
        ) || false;

        // Format recent games, only including those that make player ineligible
        const formattedRecentGames = recentSelections
          .map(g => `WNF #${g.sequence_number}`)
          .sort((a, b) => parseInt(b.split('#')[1]) - parseInt(a.split('#')[1]));

        // Debug logging
        console.log('[useTokenStatus] Raw Data:', {
          playerId,
          publicTokenStatus,
          recentGames,
          latestSequence,
          lastTenSequences,
          lastThreeSequences,
          hasPlayedInLastTenGames,
          hasRecentSelection
        });

        // Construct token status object
        const status = publicTokenStatus ? {
          status: hasPlayedInLastTenGames && !hasRecentSelection ? 'AVAILABLE' : 'INELIGIBLE',
          lastUsedAt: publicTokenStatus.last_used_at,
          nextTokenAt: publicTokenStatus.next_token_at,
          createdAt: publicTokenStatus.created_at,
          isEligible: hasPlayedInLastTenGames && !hasRecentSelection,  
          recentGames: formattedRecentGames,
          hasPlayedInLastTenGames,
          hasRecentSelection
        } : {
          status: 'NO_TOKEN',
          lastUsedAt: null,
          nextTokenAt: null,
          createdAt: new Date().toISOString(),
          isEligible: false,
          recentGames: formattedRecentGames,
          hasPlayedInLastTenGames,
          hasRecentSelection
        };

        console.log('[useTokenStatus] Processed Data:', {
          isEligible: hasPlayedInLastTenGames && !hasRecentSelection,
          hasPlayedInLastTenGames,
          hasRecentSelection,
          recentGames: formattedRecentGames
        });

        setTokenStatus(status);
        setError(null);
      } catch (err) {
        console.error('[useTokenStatus] Error:', err);
        setError(err as Error);
        // Don't clear existing token status on error
      } finally {
        setLoading(false);
      }
    };

    fetchTokenStatus();
  }, [playerId]);

  return { tokenStatus, loading, error };
}
