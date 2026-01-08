import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface UnpaidGame {
  game_id: string;
  sequence_number: number;
  date: string;
}

type PaymentStatusType = 'paid' | 'unpaid' | 'pending';

interface UsePaymentStatusReturn {
  status: PaymentStatusType;
  unpaidGames: UnpaidGame[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage the current user's payment status
 * Returns unpaid games and overall payment status
 */
export const usePaymentStatus = (): UsePaymentStatusReturn => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PaymentStatusType>('paid');
  const [unpaidGames, setUnpaidGames] = useState<UnpaidGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPaymentStatus = async () => {
    if (!user) {
      setStatus('paid');
      setUnpaidGames([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // First get the player ID for the current user
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (playerError) throw playerError;

      if (!playerData) {
        setStatus('paid');
        setUnpaidGames([]);
        setLoading(false);
        return;
      }

      // Fetch unpaid game registrations for this player
      const { data: registrations, error: regError } = await supabase
        .from('game_registrations')
        .select(`
          game_id,
          payment_status,
          games!inner (
            id,
            date,
            sequence_number,
            completed
          )
        `)
        .eq('player_id', playerData.id)
        .eq('status', 'selected')
        .eq('games.completed', true)
        .or('payment_status.eq.unpaid,payment_status.is.null');

      if (regError) throw regError;

      const games: UnpaidGame[] = (registrations || [])
        .filter((reg: any) => reg.games)
        .map((reg: any) => ({
          game_id: reg.game_id,
          sequence_number: reg.games.sequence_number,
          date: reg.games.date,
        }));

      setUnpaidGames(games);
      setStatus(games.length > 0 ? 'unpaid' : 'paid');
    } catch (err) {
      console.error('Error fetching payment status:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentStatus();
  }, [user]);

  return {
    status,
    unpaidGames,
    loading,
    error,
    refetch: fetchPaymentStatus,
  };
};
