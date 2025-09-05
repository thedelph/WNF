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

      // Fetch all ratings given by each player
      const ratersWithRatings = await Promise.all(
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
              playstyle_id,
              playstyles (
                id,
                name,
                category
              ),
              rated_player:players!player_ratings_rated_player_id_fkey(
                id,
                friendly_name
              )
            `)
            .eq('rater_id', player.id)
            .order('created_at', { ascending: false });

          if (ratingsError) throw ratingsError;

          // Map the playstyle data correctly
          const mappedRatings = (ratingsData || []).map(rating => ({
            ...rating,
            rated_player: rating.rated_player,
            playstyle: rating.playstyles || null,
            rater: {
              id: player.id,
              friendly_name: player.friendly_name,
              is_admin: false // This would need to be fetched if needed
            }
          }));
          
          return {
            ...player,
            ratings_given: mappedRatings,
            derived_attributes: derivedAttributesMap.get(player.id)
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
