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
        
        // Get current token status
        const { data: tokenData, error: tokenError } = await executeWithRetry(
          () => supabase
            .from('player_tokens')
            .select('*')
            .eq('player_id', playerId)
            .order('issued_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          { 
            shouldToast: false,
            maxRetries: 2
          }
        );

        if (tokenError && !tokenError.message?.includes('404')) {
          console.error('Error fetching token data:', tokenError);
        }

        // Check token eligibility using database function
        const { data: isEligible, error: eligibilityError } = await executeWithRetry(
          () => supabase.rpc('check_token_eligibility', { player_uuid: playerId })
        );

        if (eligibilityError) {
          console.error('Error checking eligibility:', eligibilityError);
        }

        // Get recent games where player was selected (for display only)
        const { data: recentGames, error: recentGamesError } = await executeWithRetry(
          () => supabase
            .from('games')
            .select(`
              id,
              sequence_number,
              date,
              game_registrations!inner(
                status,
                player_id
              )
            `)
            .eq('completed', true)
            .eq('game_registrations.player_id', playerId)
            .eq('game_registrations.status', 'selected')
            .order('sequence_number', { ascending: false })
            .limit(3),
          {
            shouldToast: false
          }
        );

        if (recentGamesError) {
          console.error('Error fetching recent games:', recentGamesError);
        }

        // Get latest sequence number to determine last 3 games
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

        // Check if player was selected in any of the last 3 games
        const recentSelections = recentGames?.filter(g => 
          lastThreeSequences.includes(g.sequence_number)
        ) || [];
        const hasRecentSelection = recentSelections.length > 0;

        // Format recent games, only including those that make player ineligible
        const formattedRecentGames = recentSelections
          .map(g => `WNF #${g.sequence_number}`)
          .sort((a, b) => parseInt(b.split('#')[1]) - parseInt(a.split('#')[1]));

        // Check if player has played in last 10 games
        const { data: recentParticipation, error: participationError } = await executeWithRetry(
          () => supabase
            .from('games')
            .select(`
              id,
              sequence_number,
              date,
              game_registrations!inner(
                status,
                player_id
              )
            `)
            .eq('completed', true)
            .eq('game_registrations.player_id', playerId)
            .eq('game_registrations.status', 'selected')
            .in('sequence_number', lastTenSequences)
            .order('sequence_number', { ascending: false }),
          {
            shouldToast: false
          }
        );

        if (participationError) {
          console.error('Error fetching participation:', participationError);
        }

        // Debug logging
        console.log('[useTokenStatus] Raw Data:', {
          playerId,
          tokenData,
          isEligible,
          recentGames,
          recentParticipation,
          latestSequence,
          lastTenSequences
        });

        const hasPlayedInLastTenGames = (recentParticipation?.length ?? 0) > 0;

        console.log('[useTokenStatus] Processed Data:', {
          isEligible,
          hasPlayedInLastTenGames,
          hasRecentSelection,
          recentGamesCount: recentGames?.length ?? 0,
          recentParticipationCount: recentParticipation?.length ?? 0,
          recentGames: formattedRecentGames,
          recentParticipation: recentParticipation?.map(g => `WNF #${g.sequence_number}`)
        });

        // Construct token status object
        const status = tokenData ? {
          status: tokenData.used_at ? 'USED' : 'AVAILABLE',
          lastUsedAt: tokenData.used_at,
          nextTokenAt: tokenData.used_at ? new Date(new Date(tokenData.used_at).getTime() + (22 * 24 * 60 * 60 * 1000)).toISOString() : null,
          createdAt: tokenData.issued_at,
          isEligible: isEligible || false,
          recentGames: formattedRecentGames,
          hasPlayedInLastTenGames,
          hasRecentSelection
        } : {
          status: 'NO_TOKEN',
          lastUsedAt: null,
          nextTokenAt: null,
          createdAt: new Date().toISOString(),
          isEligible: isEligible || false,
          recentGames: formattedRecentGames,
          hasPlayedInLastTenGames,
          hasRecentSelection
        };

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
