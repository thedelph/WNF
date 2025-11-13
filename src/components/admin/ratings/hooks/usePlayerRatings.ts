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
          game_iq,
          average_gk_rating
        `)
        .or('attack_rating.gt.0,defense_rating.gt.0,game_iq.gt.0,average_gk_rating.gt.0');

      if (playersError) throw playersError;

      // Fetch derived attributes for all players
      const { data: derivedAttributesData, error: derivedError} = await supabaseAdmin
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

      // Fetch position consensus for all players
      const { data: positionConsensusData, error: consensusError } = await supabaseAdmin
        .from('player_position_consensus')
        .select('*')
        .gte('total_raters', 5)  // Only show if sufficient data
        .order('percentage', { ascending: false });

      if (consensusError) throw consensusError;

      // Create a map of position consensus by player_id
      const positionConsensusMap = new Map();
      positionConsensusData?.forEach(consensus => {
        const existing = positionConsensusMap.get(consensus.player_id) || [];
        positionConsensusMap.set(consensus.player_id, [...existing, {
          position: consensus.position,
          percentage: consensus.percentage,
          rating_count: consensus.rating_count,
          total_raters: consensus.total_raters,
          points: consensus.points,
          rank_1_count: consensus.rank_1_count,
          rank_2_count: consensus.rank_2_count,
          rank_3_count: consensus.rank_3_count
        }]);
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

      // Fetch all ratings for each player using supabaseAdmin
      const playersWithRatings = await Promise.all(
        (playersData || []).map(async (player) => {
          const { data: ratingsData, error: ratingsError } = await supabaseAdmin
            .from('player_ratings')
            .select(`
              id,
              rater_id,
              attack_rating,
              defense_rating,
              game_iq_rating,
              gk_rating,
              created_at,
              updated_at,
              playstyle_id,
              has_pace,
              has_shooting,
              has_passing,
              has_dribbling,
              has_defending,
              has_physical,
              rater:players!player_ratings_rater_id_fkey(
                id,
                friendly_name,
                is_admin
              )
            `)
            .eq('rated_player_id', player.id)
            .order('created_at', { ascending: false });

          if (ratingsError) throw ratingsError;

          // Fetch position ratings for each rater of this player
          const { data: positionRatingsData, error: positionRatingsError } = await supabaseAdmin
            .from('player_position_ratings')
            .select('rater_id, position, rank, created_at, updated_at')
            .eq('rated_player_id', player.id)
            .order('rater_id', { ascending: false })
            .order('rank', { ascending: true });

          if (positionRatingsError) throw positionRatingsError;

          // Group position ratings by rater_id
          const positionsByRater = new Map();
          positionRatingsData?.forEach(pr => {
            const existing = positionsByRater.get(pr.rater_id) || {};
            if (pr.rank === 1) existing.first = pr.position;
            if (pr.rank === 2) existing.second = pr.position;
            if (pr.rank === 3) existing.third = pr.position;
            positionsByRater.set(pr.rater_id, existing);
          });

          // Import functions from playstyle utils
          const { generatePlaystyleName } = await import('../../../../types/playstyle');

          // Map the playstyle data correctly for each rating
          const mappedRatings = (ratingsData || []).map(rating => {
            // Get position data for this rater
            const positions = positionsByRater.get(rating.rater_id) || {};

            // If there's a playstyle_id, use the predefined playstyle
            if (rating.playstyle_id) {
              return {
                ...rating,
                rater: rating.rater,
                playstyle: playstylesMap.get(rating.playstyle_id),
                position_1st: positions.first || null,
                position_2nd: positions.second || null,
                position_3rd: positions.third || null
              };
            }

            // If there are attribute boolean fields, generate the playstyle name
            if (rating.has_pace !== null || rating.has_shooting !== null ||
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

              return {
                ...rating,
                rater: rating.rater,
                playstyle: {
                  id: 'generated',
                  name: generatedName,
                  category: category
                },
                position_1st: positions.first || null,
                position_2nd: positions.second || null,
                position_3rd: positions.third || null
              };
            }

            // No playstyle data
            return {
              ...rating,
              rater: rating.rater,
              playstyle: null,
              position_1st: positions.first || null,
              position_2nd: positions.second || null,
              position_3rd: positions.third || null
            };
          });

          return {
            ...player,
            ratings: mappedRatings,
            derived_attributes: derivedAttributesMap.get(player.id),
            position_consensus: positionConsensusMap.get(player.id) || []
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
