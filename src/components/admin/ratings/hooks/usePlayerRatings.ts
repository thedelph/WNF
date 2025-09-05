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
          defense_rating,
          game_iq
        `)
        .or('attack_rating.gt.0,defense_rating.gt.0,game_iq.gt.0');
      
      if (playersError) throw playersError;
      
      // Fetch derived attributes for all players
      const { data: derivedAttributesData, error: derivedError } = await supabaseAdmin
        .from('player_derived_attributes')
        .select('*');
        
      if (derivedError) throw derivedError;
      
      // Create a map of derived attributes by player_id
      const derivedAttributesMap = new Map();
      derivedAttributesData?.forEach(attr => {
        derivedAttributesMap.set(attr.player_id, {
          pace: attr.pace_rating,
          shooting: attr.shooting_rating,
          passing: attr.passing_rating,
          dribbling: attr.dribbling_rating,
          defending: attr.defending_rating,
          physical: attr.physical_rating
        });
      });

      // Fetch all ratings for each player using supabaseAdmin
      const playersWithRatings = await Promise.all(
        (playersData || []).map(async (player) => {
          const { data: ratingsData, error: ratingsError } = await supabaseAdmin
            .from('player_ratings')
            .select(`
              id,
              attack_rating,
              defense_rating,
              game_iq_rating,
              created_at,
              updated_at,
              rater:players!player_ratings_rater_id_fkey(
                id,
                friendly_name,
                is_admin
              ),
              playstyle:playstyles(
                id,
                name,
                category
              )
            `)
            .eq('rated_player_id', player.id)
            .order('created_at', { ascending: false });

          if (ratingsError) throw ratingsError;

          // Map the playstyle data correctly for each rating
          const mappedRatings = (ratingsData || []).map(rating => ({
            ...rating,
            rater: rating.rater,
            playstyle: rating.playstyle || null
          }));
          
          return {
            ...player,
            ratings: mappedRatings,
            derived_attributes: derivedAttributesMap.get(player.id)
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
