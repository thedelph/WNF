import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { executeWithRetry } from '../utils/network';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  InjuryTokenStatusData,
  InjuryTokenEligibility,
  EligibleInjuryGame,
  InjuryTokenStats,
  InjuryTokenClaim
} from '../types/tokens';

/**
 * Custom hook to manage injury token status for a player
 * Handles fetching injury data and real-time updates
 * @param playerId - UUID of the player to check
 */
export function useInjuryTokenStatus(playerId: string | undefined) {
  const [injuryStatus, setInjuryStatus] = useState<InjuryTokenStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInjuryStatus = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch injury token status using RPC function
      const { data, error: rpcError } = await executeWithRetry(
        async () => {
          const result = await supabase.rpc('get_injury_token_status', {
            p_player_id: playerId
          });
          return result;
        },
        {
          shouldToast: false,
          maxRetries: 2
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      // RPC returns single object or null
      const statusData = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (!statusData) {
        // Player has no injury token active
        setInjuryStatus({
          isActive: false,
          originalStreak: null,
          returnStreak: null,
          activatedAt: null,
          injuryGameId: null,
          injuryGameDate: null,
          injuryGameNumber: null,
          gamesMissed: null
        });
      } else {
        setInjuryStatus({
          isActive: statusData.is_active ?? false,
          originalStreak: statusData.original_streak ?? null,
          returnStreak: statusData.return_streak ?? null,
          activatedAt: statusData.activated_at ?? null,
          injuryGameId: statusData.injury_game_id ?? null,
          injuryGameDate: statusData.injury_game_date ?? null,
          injuryGameNumber: statusData.injury_game_number ?? null,
          gamesMissed: statusData.games_missed ?? null
        });
      }

      setError(null);
    } catch (err) {
      console.error('[useInjuryTokenStatus] Error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchInjuryStatus();
  }, [fetchInjuryStatus]);

  // Refetch when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useInjuryTokenStatus] Page visible - refetching');
        fetchInjuryStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchInjuryStatus]);

  // Set up real-time subscription
  useEffect(() => {
    if (!playerId) return;

    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      channel = supabase
        .channel(`injury-status-${playerId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `id=eq.${playerId}`
          },
          (payload) => {
            console.log('[useInjuryTokenStatus] Player update:', payload);
            fetchInjuryStatus();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'injury_token_usage',
            filter: `player_id=eq.${playerId}`
          },
          (payload) => {
            console.log('[useInjuryTokenStatus] Injury usage update:', payload);
            fetchInjuryStatus();
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
  }, [playerId, fetchInjuryStatus]);

  return {
    injuryStatus,
    loading,
    error,
    refreshInjuryStatus: fetchInjuryStatus
  };
}

/**
 * Hook to check injury token eligibility for a specific game
 * @param playerId - UUID of the player
 * @param gameId - UUID of the game where injury occurred
 */
export function useInjuryTokenEligibility(playerId: string | undefined, gameId: string | undefined) {
  const [eligibility, setEligibility] = useState<InjuryTokenEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkEligibility = useCallback(async () => {
    if (!playerId || !gameId) {
      setEligibility(null);
      return;
    }

    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('check_injury_token_eligibility', {
        p_player_id: playerId,
        p_game_id: gameId
      });

      if (rpcError) {
        throw rpcError;
      }

      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      setEligibility({
        eligible: result?.eligible ?? false,
        reason: result?.reason ?? 'Unknown',
        currentStreak: result?.current_streak ?? 0,
        effectiveStreak: result?.effective_streak ?? 0,
        returnStreak: result?.return_streak ?? 0,
        hasActiveShield: result?.has_active_shield ?? false
      });
      setError(null);
    } catch (err) {
      console.error('[useInjuryTokenEligibility] Error:', err);
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
 * Hook to get eligible games for injury token claim
 * @param playerId - UUID of the player
 */
export function useEligibleInjuryGames(playerId: string | undefined) {
  const [games, setGames] = useState<EligibleInjuryGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEligibleGames = useCallback(async () => {
    if (!playerId) {
      setGames([]);
      return;
    }

    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('get_eligible_injury_games', {
        p_player_id: playerId
      });

      if (rpcError) {
        throw rpcError;
      }

      const eligibleGames: EligibleInjuryGame[] = (data || []).map((g: {
        game_id: string;
        game_date: string;
        sequence_number: number;
        eligible: boolean;
        reason: string;
      }) => ({
        gameId: g.game_id,
        gameDate: g.game_date,
        sequenceNumber: g.sequence_number,
        eligible: g.eligible,
        reason: g.reason
      }));

      setGames(eligibleGames);
      setError(null);
    } catch (err) {
      console.error('[useEligibleInjuryGames] Error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchEligibleGames();
  }, [fetchEligibleGames]);

  return {
    games,
    loading,
    error,
    refreshGames: fetchEligibleGames
  };
}

/**
 * Hook to perform injury token actions (activate, deny)
 */
export function useInjuryToken() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Player self-serve activation
   */
  const activateInjuryToken = useCallback(async (
    playerId: string,
    injuryGameId: string,
    notes?: string
  ) => {
    try {
      setIsProcessing(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('activate_injury_token', {
        p_player_id: playerId,
        p_injury_game_id: injuryGameId,
        p_notes: notes || null
      });

      if (rpcError) {
        throw rpcError;
      }

      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to activate injury token');
      }

      // Recalculate and update player XP after successful activation
      try {
        const { data: newXp } = await supabase.rpc('calculate_player_xp_v2', {
          p_player_id: playerId
        });

        if (newXp !== null) {
          // Update player_xp table
          await supabase
            .from('player_xp')
            .update({ xp: newXp, last_calculated: new Date().toISOString() })
            .eq('player_id', playerId);

          // Recalculate all ranks
          await supabase.rpc('update_player_ranks');
        }
      } catch (xpErr) {
        // Log but don't fail the activation - XP update is secondary
        console.error('[activateInjuryToken] XP update error:', xpErr);
      }

      return {
        success: true,
        message: result.message,
        originalStreak: result.original_streak,
        returnStreak: result.return_streak
      };
    } catch (err) {
      console.error('[activateInjuryToken] Error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Admin activation on behalf of player
   */
  const adminActivateInjuryToken = useCallback(async (
    playerId: string,
    injuryGameId: string,
    adminId: string,
    notes?: string
  ) => {
    try {
      setIsProcessing(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_activate_injury_token', {
        p_player_id: playerId,
        p_injury_game_id: injuryGameId,
        p_notes: notes || null,
        p_admin_id: adminId
      });

      if (rpcError) {
        throw rpcError;
      }

      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to activate injury token');
      }

      // Recalculate and update player XP after successful activation
      try {
        const { data: newXp } = await supabase.rpc('calculate_player_xp_v2', {
          p_player_id: playerId
        });

        if (newXp !== null) {
          // Update player_xp table
          await supabase
            .from('player_xp')
            .update({ xp: newXp, last_calculated: new Date().toISOString() })
            .eq('player_id', playerId);

          // Recalculate all ranks
          await supabase.rpc('update_player_ranks');
        }
      } catch (xpErr) {
        // Log but don't fail the activation - XP update is secondary
        console.error('[adminActivateInjuryToken] XP update error:', xpErr);
      }

      return {
        success: true,
        message: result.message,
        originalStreak: result.original_streak,
        returnStreak: result.return_streak
      };
    } catch (err) {
      console.error('[adminActivateInjuryToken] Error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Admin denial of injury token claim
   */
  const denyInjuryToken = useCallback(async (
    playerId: string,
    injuryGameId: string,
    adminId: string,
    reason: string
  ) => {
    try {
      setIsProcessing(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('deny_injury_token', {
        p_player_id: playerId,
        p_injury_game_id: injuryGameId,
        p_reason: reason,
        p_admin_id: adminId
      });

      if (rpcError) {
        throw rpcError;
      }

      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to deny injury token');
      }

      return {
        success: true,
        message: result.message
      };
    } catch (err) {
      console.error('[denyInjuryToken] Error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    activateInjuryToken,
    adminActivateInjuryToken,
    denyInjuryToken,
    isProcessing,
    error
  };
}

/**
 * Hook to get injury token statistics for admin dashboard
 */
export function useInjuryTokenStats() {
  const [stats, setStats] = useState<InjuryTokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('get_injury_token_stats');

      if (rpcError) {
        throw rpcError;
      }

      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      setStats({
        activeCount: result?.active_count ?? 0,
        thisMonthCount: result?.this_month_count ?? 0,
        totalReturned: result?.total_returned ?? 0,
        totalDenied: result?.total_denied ?? 0,
        avgGamesMissed: result?.avg_games_missed ?? 0
      });
      setError(null);
    } catch (err) {
      console.error('[useInjuryTokenStats] Error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats
  };
}

/**
 * Hook to get all injury token claims for admin management
 */
export function useInjuryTokenClaims(statusFilter?: string) {
  const [claims, setClaims] = useState<InjuryTokenClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);

      // Query the injury claims view
      let query = supabase
        .from('injury_token_claims_view')
        .select('*')
        .order('activated_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      const mappedClaims: InjuryTokenClaim[] = (data || []).map((c: {
        id: string;
        player_id: string;
        player_name: string;
        injury_game_id: string;
        injury_game_date: string;
        injury_game_number: number;
        original_streak: number;
        return_streak: number;
        status: 'active' | 'returned' | 'denied' | 'expired';
        activated_at: string;
        returned_at: string | null;
        games_missed: number;
      }) => ({
        id: c.id,
        playerId: c.player_id,
        playerName: c.player_name,
        injuryGameId: c.injury_game_id,
        injuryGameDate: c.injury_game_date,
        injuryGameNumber: c.injury_game_number,
        originalStreak: c.original_streak,
        returnStreak: c.return_streak,
        status: c.status,
        activatedAt: c.activated_at,
        returnedAt: c.returned_at,
        gamesMissed: c.games_missed
      }));

      setClaims(mappedClaims);
      setError(null);
    } catch (err) {
      console.error('[useInjuryTokenClaims] Error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // Set up real-time subscription for claims updates
  useEffect(() => {
    const channel = supabase
      .channel('injury-claims-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'injury_token_usage'
        },
        () => {
          console.log('[useInjuryTokenClaims] Claims updated');
          fetchClaims();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClaims]);

  return {
    claims,
    loading,
    error,
    refreshClaims: fetchClaims
  };
}
