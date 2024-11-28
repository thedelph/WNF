import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { Player } from '../types/game';

export const useUser = () => {
  const { user } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!user) {
        setPlayer(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setPlayer(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [user]);

  return { player, loading, error };
};
