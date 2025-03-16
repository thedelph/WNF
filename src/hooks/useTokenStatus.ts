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
  hasOutstandingPayments: boolean;
  outstandingPaymentsCount: number;
}

interface GameRecord {
  sequence_number: number;
}

interface TokenStatusRecord {
  last_used_at: string | null;
  next_token_at: string | null;
  created_at: string;
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
        const { data: latestGameData, error: latestGameError } = await executeWithRetry(
          async () => {
            const result = await supabase
              .from('games')
              .select('sequence_number')
              .eq('completed', true)
              .order('sequence_number', { ascending: false })
              .limit(1)
              .single();
            return result;
          },
          {
            shouldToast: false
          }
        );

        if (latestGameError) {
          console.error('Error fetching latest game:', latestGameError);
        }

        // Safely cast the data
        const latestGame = latestGameData as GameRecord | null;
        const latestSequence = latestGame?.sequence_number || 0;
        const lastThreeSequences = [latestSequence, latestSequence - 1, latestSequence - 2];
        const lastTenSequences = Array.from(
          { length: 10 }, 
          (_, i) => latestSequence - i
        );

        // Get token status from public view
        const { data: tokenStatusData, error: tokenStatusError } = await executeWithRetry(
          async () => {
            const result = await supabase
              .from('public_player_token_status')
              .select('*')
              .eq('player_id', playerId)
              .single();
            return result;
          },
          { 
            shouldToast: false,
            maxRetries: 2
          }
        );

        if (tokenStatusError) {
          console.error('Error fetching public token status:', tokenStatusError);
        }

        // Get recent games where player was selected, using sequence number range
        const { data: recentGamesData, error: recentGamesError } = await executeWithRetry(
          async () => {
            const result = await supabase
              .from('public_player_game_history')
              .select('sequence_number')
              .eq('player_id', playerId)
              .eq('status', 'selected')
              .gt('sequence_number', latestSequence - 10)  // Get all games in last 10 sequence numbers
              .order('sequence_number', { ascending: false });
            return result;
          },
          {
            shouldToast: false
          }
        );

        if (recentGamesError) {
          console.error('Error fetching recent games:', recentGamesError);
        }

        // Check for outstanding payments - query game_registrations directly
        const { data: unpaidRegistrations, error: unpaidRegistrationsError } = await executeWithRetry(
          async () => {
            const result = await supabase
              .from('game_registrations')
              .select('id, games!inner(id, date, is_historical, completed)')
              .eq('player_id', playerId)
              .eq('status', 'selected')
              .eq('paid', false)
              .filter('games.is_historical', 'eq', true)
              .filter('games.completed', 'eq', true)
              .filter('games.date', 'lt', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
            return result;
          },
          {
            shouldToast: false
          }
        );
        
        if (unpaidRegistrationsError) {
          console.error('Error fetching unpaid games:', unpaidRegistrationsError);
        }

        // Calculate the count of unpaid games
        const outstandingPaymentsCount = unpaidRegistrations?.length || 0;
        const hasOutstandingPayments = outstandingPaymentsCount > 0;

        // Ensure we have an array of game records even if the query failed
        const recentGames = (recentGamesData || []) as GameRecord[];

        // Debug logging
        console.log('[useTokenStatus] Sequence numbers:', {
          latestSequence,
          lastThreeSequences,
          playerGames: recentGames.map((g: GameRecord) => g.sequence_number)
        });

        // Check if player was selected in any of the last 3 games
        const recentSelections = recentGames.filter((g: GameRecord) => 
          lastThreeSequences.includes(g.sequence_number)
        );
        const hasRecentSelection = recentSelections.length > 0;

        // Check if player has played in last 10 games
        const hasPlayedInLastTenGames = recentGames.some((g: GameRecord) => 
          lastTenSequences.includes(g.sequence_number)
        );

        // Format recent games, only including those that make player ineligible
        const formattedRecentGames = recentSelections
          .map((g: GameRecord) => `WNF #${g.sequence_number.toString().padStart(3, '0')}`)
          .sort((a: string, b: string) => parseInt(b.split('#')[1]) - parseInt(a.split('#')[1]));

        // Debug logging
        console.log('[useTokenStatus] Raw Data:', {
          playerId,
          publicTokenStatus: tokenStatusData,
          recentGames,
          latestSequence,
          lastTenSequences,
          lastThreeSequences,
          hasPlayedInLastTenGames,
          hasRecentSelection,
          hasOutstandingPayments,
          outstandingPaymentsCount
        });

        // Construct token status object
        const publicTokenStatus = tokenStatusData as TokenStatusRecord | null;
        const status: TokenStatus = publicTokenStatus ? {
          status: hasPlayedInLastTenGames && !hasRecentSelection && !hasOutstandingPayments ? 'AVAILABLE' : 'INELIGIBLE',
          lastUsedAt: publicTokenStatus.last_used_at,
          nextTokenAt: publicTokenStatus.next_token_at,
          createdAt: publicTokenStatus.created_at,
          isEligible: hasPlayedInLastTenGames && !hasRecentSelection && !hasOutstandingPayments,  
          recentGames: formattedRecentGames,
          hasPlayedInLastTenGames,
          hasRecentSelection,
          hasOutstandingPayments,
          outstandingPaymentsCount
        } : {
          status: 'NO_TOKEN',
          lastUsedAt: null,
          nextTokenAt: null,
          createdAt: new Date().toISOString(),
          isEligible: false,
          recentGames: formattedRecentGames,
          hasPlayedInLastTenGames,
          hasRecentSelection,
          hasOutstandingPayments,
          outstandingPaymentsCount
        };

        console.log('[useTokenStatus] Processed Data:', {
          isEligible: hasPlayedInLastTenGames && !hasRecentSelection && !hasOutstandingPayments,
          hasPlayedInLastTenGames,
          hasRecentSelection,
          hasOutstandingPayments,
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
