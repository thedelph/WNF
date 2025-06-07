import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../../../utils/supabase';
import { Player } from '../types';
import toast from 'react-hot-toast';

export const usePlayerRatings = (isSuperAdmin: boolean) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPlayers();
    } else {
      setPlayers([]);
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      // Use supabaseAdmin to bypass RLS
      const { data: playersData, error: playersError } = await supabaseAdmin
        .from('players')
        .select(`
          id,
          friendly_name,
          attack_rating,
          defense_rating
        `)
        .not('attack_rating', 'eq', 0)
        .not('defense_rating', 'eq', 0);

      if (playersError) throw playersError;

      // Fetch all ratings for each player using supabaseAdmin
      const playersWithRatings = await Promise.all(
        (playersData || []).map(async (player) => {
          const { data: ratingsData, error: ratingsError } = await supabaseAdmin
            .from('player_ratings')
            .select(`
              id,
              attack_rating,
              defense_rating,
              created_at,
              rater:players!player_ratings_rater_id_fkey(
                id,
                friendly_name,
                is_admin
              )
            `)
            .eq('rated_player_id', player.id)
            .order('created_at', { ascending: false });

          if (ratingsError) throw ratingsError;

          return {
            ...player,
            ratings: ratingsData || []
          };
        })
      );

      setPlayers(playersWithRatings);
    } catch (error) {
      toast.error('Error fetching players');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { players, loading, fetchPlayers };
};
