import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { executeWithRetry } from '../utils/network';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ShieldStatus {
  tokensAvailable: number;
  gamesPlayedSinceLaunch: number;
  shieldActive: boolean;
  frozenStreakValue: number | null;
  frozenStreakModifier: number | null;
  currentStreak: number;
  gamesTowardNextToken: number;
  gamesUntilNextToken: number;
  activeShields: Array<{
    game_id: string;
    used_at: string;
    frozen_streak: number;
  }> | null;
  recentHistory: Array<{
    action: string;
    game_id: string | null;
    created_at: string;
    notes: string | null;
  }> | null;
}

interface ShieldStatusRecord {
  player_id: string;
  friendly_name: string;
  shield_tokens_available: number;
  games_played_since_shield_launch: number;
  shield_active: boolean;
  frozen_streak_value: number | null;
  frozen_streak_modifier: number | null;
  current_streak: number;
  games_toward_next_token: number;
  games_until_next_token: number;
  active_shields: any[] | null;
  recent_history: any[] | null;
}

/**
 * Custom hook to manage shield token status for a player
 * Handles fetching shield data, eligibility, and usage history
 * Includes real-time subscription for live updates
 * @param playerId - UUID of the player to check
 * @returns ShieldStatus object containing all shield-related information
 */
export function useShieldStatus(playerId: string | undefined) {
  const [shieldStatus, setShieldStatus] = useState<ShieldStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchShieldStatus = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch from materialized view for optimal performance
      const { data: statusData, error: statusError } = await executeWithRetry(
        async () => {
          const result = await supabase
            .from('player_shield_status')
            .select('*')
            .eq('player_id', playerId)
            .maybeSingle();
          return result;
        },
        {
          shouldToast: false,
          maxRetries: 2
        }
      );

      if (statusError) {
        throw statusError;
      }

      // If no data in materialized view, fetch directly from players table
      if (!statusData) {
        const { data: playerData, error: playerError } = await executeWithRetry(
          async () => {
            const result = await supabase
              .from('players')
              .select(`
                id,
                friendly_name,
                shield_tokens_available,
                games_played_since_shield_launch,
                shield_active,
                frozen_streak_value,
                frozen_streak_modifier,
                current_streak
              `)
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
          throw playerError;
        }

        // Calculate progress manually
        const gamesPlayed = playerData?.games_played_since_shield_launch || 0;
        const status: ShieldStatus = {
          tokensAvailable: playerData?.shield_tokens_available || 0,
          gamesPlayedSinceLaunch: gamesPlayed,
          shieldActive: playerData?.shield_active || false,
          frozenStreakValue: playerData?.frozen_streak_value || null,
          frozenStreakModifier: playerData?.frozen_streak_modifier || null,
          currentStreak: playerData?.current_streak || 0,
          gamesTowardNextToken: gamesPlayed % 10,
          gamesUntilNextToken: 10 - (gamesPlayed % 10),
          activeShields: null,
          recentHistory: null
        };

        setShieldStatus(status);
        setError(null);
        return;
      }

      // Process materialized view data
      const record = statusData as ShieldStatusRecord;
      const status: ShieldStatus = {
        tokensAvailable: record.shield_tokens_available,
        gamesPlayedSinceLaunch: record.games_played_since_shield_launch,
        shieldActive: record.shield_active,
        frozenStreakValue: record.frozen_streak_value,
        frozenStreakModifier: record.frozen_streak_modifier,
        currentStreak: record.current_streak,
        gamesTowardNextToken: record.games_toward_next_token,
        gamesUntilNextToken: record.games_until_next_token,
        activeShields: record.active_shields,
        recentHistory: record.recent_history
      };

      console.log('[useShieldStatus] Processed Data:', {
        playerId,
        tokensAvailable: status.tokensAvailable,
        shieldActive: status.shieldActive,
        frozenStreak: status.frozenStreakValue,
        progress: `${status.gamesTowardNextToken}/10 games`
      });

      setShieldStatus(status);
      setError(null);
    } catch (err) {
      console.error('[useShieldStatus] Error:', err);
      setError(err as Error);
      // Don't clear existing shield status on error
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchShieldStatus();
  }, [fetchShieldStatus]);

  // Refetch shield status when page becomes visible (e.g., returning from admin panel)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useShieldStatus] Page visible - refetching shield status');
        fetchShieldStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchShieldStatus]);

  // Set up real-time subscription for shield status updates
  useEffect(() => {
    if (!playerId) return;

    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      // Subscribe to changes in players table for this specific player
      channel = supabase
        .channel(`shield-status-${playerId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `id=eq.${playerId}`
          },
          (payload) => {
            console.log('[useShieldStatus] Real-time update received:', payload);
            // Refetch shield status when player data changes
            fetchShieldStatus();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shield_token_usage',
            filter: `player_id=eq.${playerId}`
          },
          (payload) => {
            console.log('[useShieldStatus] Shield usage updated:', payload);
            // Refetch when shield usage changes
            fetchShieldStatus();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'shield_token_history',
            filter: `player_id=eq.${playerId}`
          },
          (payload) => {
            console.log('[useShieldStatus] Shield history updated:', payload);
            // Refetch when history is added
            fetchShieldStatus();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [playerId, fetchShieldStatus]);

  return {
    shieldStatus,
    loading,
    error,
    refreshShieldStatus: fetchShieldStatus
  };
}

/**
 * Hook to check shield eligibility for a specific game
 * @param playerId - UUID of the player
 * @param gameId - UUID of the game
 */
export function useShieldEligibility(playerId: string | undefined, gameId: string | undefined) {
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    reason: string;
    tokensAvailable: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkEligibility = useCallback(async () => {
    if (!playerId || !gameId) {
      setEligibility(null);
      return;
    }

    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('check_shield_eligibility', {
        p_player_id: playerId,
        p_game_id: gameId
      });

      if (rpcError) {
        throw rpcError;
      }

      // RPC returns array with single object
      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      setEligibility({
        eligible: result?.eligible || false,
        reason: result?.reason || 'Unknown',
        tokensAvailable: result?.tokens_available || 0
      });
      setError(null);
    } catch (err) {
      console.error('[useShieldEligibility] Error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [playerId, gameId]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  return {
    eligibility,
    loading,
    error,
    recheckEligibility: checkEligibility
  };
}

/**
 * Hook to use a shield token for a specific game
 * @param playerId - UUID of the player
 * @param gameId - UUID of the game
 */
export function useShieldToken(playerId: string | undefined, gameId: string | undefined) {
  const [isUsing, setIsUsing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const useShield = useCallback(async () => {
    if (!playerId || !gameId) {
      throw new Error('Player ID and Game ID are required');
    }

    try {
      setIsUsing(true);
      setError(null);

      // Get current user for logging
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: rpcError } = await supabase.rpc('use_shield_token', {
        p_player_id: playerId,
        p_game_id: gameId,
        p_user_id: user?.id || null
      });

      if (rpcError) {
        throw rpcError;
      }

      // RPC returns array with single object
      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to use shield token');
      }

      return {
        success: true,
        message: result.message,
        tokensRemaining: result.tokens_remaining
      };
    } catch (err) {
      console.error('[useShieldToken] Error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsUsing(false);
    }
  }, [playerId, gameId]);

  const returnShield = useCallback(async () => {
    if (!playerId || !gameId) {
      throw new Error('Player ID and Game ID are required');
    }

    try {
      setIsUsing(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('return_shield_token', {
        p_player_id: playerId,
        p_game_id: gameId,
        p_reason: 'Player cancelled shield usage'
      });

      if (rpcError) {
        throw rpcError;
      }

      // RPC returns array with single object
      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to return shield token');
      }

      return {
        success: true,
        message: result.message,
        tokensNow: result.tokens_now
      };
    } catch (err) {
      console.error('[returnShield] Error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsUsing(false);
    }
  }, [playerId, gameId]);

  return {
    useShield,
    returnShield,
    isUsing,
    error
  };
}
