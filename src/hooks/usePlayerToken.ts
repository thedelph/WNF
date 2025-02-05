import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

interface TokenInfo {
  hasToken: boolean;
  expiresAt: string | null;
}

/**
 * Hook to check if a player has an available token
 * A token is available if:
 * 1. The player has a token
 * 2. The token hasn't been used yet
 * Note: Tokens don't expire until they're used
 */
export const usePlayerToken = (playerId: string | undefined) => {
  return useQuery({
    queryKey: ['playerToken', playerId],
    queryFn: async () => {
      if (!playerId) {
        return { hasToken: false, expiresAt: null };
      }

      const { data } = await supabase
        .rpc('check_player_token', { p_player_id: playerId });

      return {
        hasToken: !!data?.[0]?.has_token,
        expiresAt: data?.[0]?.expires_at || null
      };
    },
    enabled: !!playerId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: true // Always refetch when component mounts
  });
};
