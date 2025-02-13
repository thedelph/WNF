import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

interface TokenInfo {
  hasToken: boolean;
  isEligible: boolean;
  expiresAt: string | null;
}

/**
 * Hook to check if a player has an available token and is eligible to use it
 * A token is available if:
 * 1. The player has a token
 * 2. The token hasn't been used yet
 * 3. The player meets eligibility criteria:
 *    - Is a WhatsApp group member
 *    - Has played in at least one of the last 10 games
 *    - Hasn't been selected in any of the last 3 games
 */
export const usePlayerToken = (playerId: string | undefined) => {
  return useQuery({
    queryKey: ['playerToken', playerId],
    queryFn: async () => {
      if (!playerId) {
        return { hasToken: false, isEligible: false, expiresAt: null };
      }

      // First check if they have a token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('check_player_token', { p_player_id: playerId });

      if (tokenError) {
        console.error('Error checking token:', tokenError);
        throw new Error('Failed to check token availability');
      }

      // Then check if they're eligible to use it
      const { data: eligibilityData, error: eligibilityError } = await supabase
        .rpc('check_token_eligibility', { player_uuid: playerId });

      if (eligibilityError) {
        console.error('Error checking eligibility:', eligibilityError);
        throw new Error('Failed to check token eligibility');
      }

      return {
        hasToken: !!tokenData?.[0]?.has_token,
        isEligible: !!eligibilityData,
        expiresAt: tokenData?.[0]?.expires_at || null
      };
    },
    enabled: !!playerId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: true // Always refetch when component mounts
  });
};
