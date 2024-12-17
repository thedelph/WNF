import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

interface PlayerPenalty {
  id: string;
  player_id: string;
  game_id: string;
  penalty_type: string;
  created_at: string;
  expires_after_games: number;
  games_remaining: number;
}

export const usePlayerPenalties = (playerId: string) => {
  const [penalties, setPenalties] = useState<PlayerPenalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPenalties = async () => {
      try {
        const { data, error } = await supabase
          .from('player_penalties')
          .select('*')
          .eq('player_id', playerId)
          .gt('games_remaining', 0);

        if (error) throw error;
        setPenalties(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (playerId) {
      fetchPenalties();
    }
  }, [playerId]);

  const dropoutPenalties = penalties.filter(p => p.penalty_type === 'SAME_DAY_DROPOUT').length;

  return {
    penalties,
    dropoutPenalties,
    loading,
    error
  };
};
