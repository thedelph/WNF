import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../../../utils/supabase';
import { Player } from '../types';
import toast from 'react-hot-toast';

export const useRaterStats = (isSuperAdmin: boolean) => {
  const [raters, setRaters] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchRaters();
    } else {
      setRaters([]);
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const fetchRaters = async () => {
    try {
      setLoading(true);
      const { data: playersData, error: playersError } = await supabaseAdmin
        .from('players')
        .select(`
          id,
          friendly_name
        `);

      if (playersError) throw playersError;

      // Fetch all ratings given by each player
      const ratersWithRatings = await Promise.all(
        (playersData || []).map(async (player) => {
          const { data: ratingsData, error: ratingsError } = await supabaseAdmin
            .from('player_ratings')
            .select(`
              id,
              attack_rating,
              defense_rating,
              created_at,
              rated_player:players!player_ratings_rated_player_id_fkey(
                id,
                friendly_name
              )
            `)
            .eq('rater_id', player.id)
            .order('created_at', { ascending: false });

          if (ratingsError) throw ratingsError;

          return {
            ...player,
            ratings_given: ratingsData || []
          };
        })
      );

      // Only include players who have given ratings
      setRaters(ratersWithRatings.filter(rater => rater.ratings_given.length > 0));
    } catch (error) {
      toast.error('Error fetching raters');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { raters, loading, fetchRaters };
};
