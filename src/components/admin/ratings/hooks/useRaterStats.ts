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

      // Fetch all playstyles separately to avoid join issues
      const { data: playstyles, error: playstylesError } = await supabaseAdmin
        .from('playstyles')
        .select('id, name, category');

      if (playstylesError) throw playstylesError;

      // Create a map of playstyles by id
      const playstylesMap = new Map();
      playstyles?.forEach(ps => {
        playstylesMap.set(ps.id, {
          id: ps.id,
          name: ps.name,
          category: ps.category
        });
      });

      // Import functions from playstyle utils
      const { generatePlaystyleName } = await import('../../../../types/playstyle');

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
              has_pace,
              has_shooting,
              has_passing,
              has_dribbling,
              has_defending,
              has_physical,
              rated_player:players!player_ratings_rated_player_id_fkey(
                id,
                friendly_name
              )
            `)
            .eq('rater_id', player.id)
            .order('created_at', { ascending: false });

          if (ratingsError) throw ratingsError;

          // Map the playstyle data correctly
          const mappedRatings = (ratingsData || []).map(rating => {
            let playstyle = null;

            // If there's a playstyle_id, use the predefined playstyle
            if (rating.playstyle_id) {
              playstyle = playstylesMap.get(rating.playstyle_id);
            }
            // If there are attribute boolean fields, generate the playstyle name
            else if (rating.has_pace !== null || rating.has_shooting !== null ||
                     rating.has_passing !== null || rating.has_dribbling !== null ||
                     rating.has_defending !== null || rating.has_physical !== null) {
              const attributes = {
                has_pace: rating.has_pace || false,
                has_shooting: rating.has_shooting || false,
                has_passing: rating.has_passing || false,
                has_dribbling: rating.has_dribbling || false,
                has_defending: rating.has_defending || false,
                has_physical: rating.has_physical || false
              };

              const generatedName = generatePlaystyleName(attributes);

              // Determine category based on attributes
              let category: 'attacking' | 'midfield' | 'defensive' = 'midfield';
              if ((attributes.has_shooting || attributes.has_pace) && !attributes.has_defending) {
                category = 'attacking';
              } else if (attributes.has_defending && !attributes.has_shooting) {
                category = 'defensive';
              }

              playstyle = {
                id: 'generated',
                name: generatedName,
                category: category
              };
            }

            return {
              ...rating,
              rated_player: rating.rated_player,
              playstyle: playstyle,
              rater: {
                id: player.id,
                friendly_name: player.friendly_name,
                is_admin: false // This would need to be fetched if needed
              }
            };
          });

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
