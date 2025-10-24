import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { executeWithRetry } from '../utils/network';

export interface RecentGame {
  display: string;
  status: 'selected' | 'dropped_out';
}

export interface TokenStatus {
  status: string;
  lastUsedAt: string | null;
  nextTokenAt: string | null;
  createdAt: string;
  isEligible: boolean;
  recentGames: RecentGame[];
  hasPlayedInLastTenGames: boolean;
  hasRecentSelection: boolean;
  hasOutstandingPayments: boolean;
  outstandingPaymentsCount: number;
  whatsappGroupMember?: boolean;
}

interface GameRecord {
  status: string;
  games: {
    sequence_number: number;
  };
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
              .eq('player_id', playerId);
              // Removed .single() to avoid 406 errors when no data exists
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
        
        // Get the first record if available, otherwise null
        const tokenStatusRecord = Array.isArray(tokenStatusData) && tokenStatusData.length > 0 
          ? tokenStatusData[0] 
          : null;

        // Get player data to check WhatsApp member status
        const { data: playerData, error: playerError } = await executeWithRetry(
          async () => {
            const result = await supabase
              .from('players')
              .select('whatsapp_group_member')
              .eq('id', playerId)
              .single();
            return result;
          },
          {
            shouldToast: false,
            maxRetries: 2
          }
        );

        if (playerError) {
          console.error('Error fetching player data:', playerError);
        }

        // Check if player is a WhatsApp group member
        const whatsappGroupMember = playerData?.whatsapp_group_member === 'Yes' || 
                                    playerData?.whatsapp_group_member === 'Proxy';

        // First, get the last 10 completed game IDs
        const { data: last10Games, error: last10GamesError } = await executeWithRetry(
          async () => {
            const result = await supabase
              .from('games')
              .select('id, sequence_number')
              .eq('completed', true)
              .order('sequence_number', { ascending: false })
              .limit(10);
            return result;
          },
          {
            shouldToast: false
          }
        );

        if (last10GamesError) {
          console.error('Error fetching last 10 games:', last10GamesError);
        }

        const last10GameIds = last10Games?.map(g => g.id) || [];

        console.log('[useTokenStatus] Fetching registrations for games:', {
          last10GameIds,
          playerIdToFetch: playerId
        });

        // Now get player's registrations for those games where they were selected OR dropped out
        // We need the status field to differentiate between actual plays and dropouts
        // Only query if we have game IDs
        let recentGamesData = null;
        let recentGamesError = null;

        if (last10GameIds.length > 0) {
          const result = await executeWithRetry(
            async () => {
              const queryResult = await supabase
                .from('game_registrations')
                .select('game_id, status')
                .eq('player_id', playerId)
                .in('status', ['selected', 'dropped_out'])
                .in('game_id', last10GameIds);
              return queryResult;
            },
            {
              shouldToast: false
            }
          );
          recentGamesData = result.data;
          recentGamesError = result.error;
        }

        if (recentGamesError) {
          console.error('Error fetching recent games:', recentGamesError);
        }

        // Map game_id to sequence_number for easier processing
        const gameIdToSequence = new Map(last10Games?.map(g => [g.id, g.sequence_number]) || []);

        // Transform the data to match our GameRecord interface
        const transformedRecentGames = recentGamesData?.map(gr => ({
          status: gr.status,
          games: {
            sequence_number: gameIdToSequence.get(gr.game_id) || 0
          }
        })) || [];

        // Debug logging for query results
        console.log('[useTokenStatus] Query results:', {
          playerId,
          latestSequence,
          last10Games: last10Games?.map(g => g.sequence_number),
          recentGamesData,
          transformedRecentGames
        });

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

        // Use the transformed data
        const recentGames = transformedRecentGames as GameRecord[];

        // Debug logging
        console.log('[useTokenStatus] Sequence numbers:', {
          latestSequence,
          lastThreeSequences,
          playerGames: recentGames.map((g: GameRecord) => g.games.sequence_number)
        });

        // Check if player was selected OR dropped out in any of the last 3 games
        // Both statuses disqualify from token eligibility
        const recentSelections = recentGames.filter((g: GameRecord) =>
          lastThreeSequences.includes(g.games.sequence_number)
        );
        const hasRecentSelection = recentSelections.length > 0;

        // Check if player has ACTUALLY PLAYED in last 10 games
        // Only 'selected' counts as "played", not dropouts
        const hasPlayedInLastTenGames = recentGames.some((g: GameRecord) =>
          lastTenSequences.includes(g.games.sequence_number) && g.status === 'selected'
        );

        // Format recent games, only including those that make player ineligible
        // Keep track of the status for each game so we can display contextual messages
        const formattedRecentGames = recentSelections
          .map((g: GameRecord) => ({
            display: `WNF #${g.games.sequence_number.toString().padStart(3, '0')}`,
            status: g.status as 'selected' | 'dropped_out'
          }))
          .sort((a, b) => parseInt(b.display.split('#')[1]) - parseInt(a.display.split('#')[1]));

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
          outstandingPaymentsCount,
          whatsappGroupMember
        });

        // Construct token status object
        const publicTokenStatus = tokenStatusRecord as TokenStatusRecord | null;
        const isEligible = hasPlayedInLastTenGames && !hasRecentSelection && !hasOutstandingPayments && whatsappGroupMember;
        const status: TokenStatus = publicTokenStatus ? {
          status: isEligible ? 'AVAILABLE' : 'INELIGIBLE',
          lastUsedAt: publicTokenStatus.last_used_at,
          nextTokenAt: publicTokenStatus.next_token_at,
          createdAt: publicTokenStatus.created_at,
          isEligible,  
          recentGames: formattedRecentGames,
          hasPlayedInLastTenGames,
          hasRecentSelection,
          hasOutstandingPayments,
          outstandingPaymentsCount,
          whatsappGroupMember
        } : {
          status: 'NO_TOKEN',
          lastUsedAt: null,
          nextTokenAt: null,
          createdAt: new Date().toISOString(),
          isEligible: whatsappGroupMember && hasPlayedInLastTenGames && !hasRecentSelection && !hasOutstandingPayments,
          recentGames: formattedRecentGames,
          hasPlayedInLastTenGames,
          hasRecentSelection,
          hasOutstandingPayments,
          outstandingPaymentsCount,
          whatsappGroupMember
        };

        console.log('[useTokenStatus] Processed Data:', {
          isEligible,
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
