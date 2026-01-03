import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../../../utils/supabase';
import { Rating } from '../types';
import toast from 'react-hot-toast';

export const useRecentRatings = (isSuperAdmin: boolean, limit: number = 10, raterId?: string) => {
  const [recentRatings, setRecentRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchRecentRatings();
    } else {
      setRecentRatings([]);
      setLoading(false);
    }
  }, [isSuperAdmin, limit, raterId]);

  const fetchRecentRatings = async () => {
    try {
      setLoading(true);

      // Fetch all playstyles first
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

      // Build query with optional rater filter
      let query = supabaseAdmin
        .from('player_ratings')
        .select(`
          id,
          attack_rating,
          defense_rating,
          game_iq_rating,
          gk_rating,
          created_at,
          updated_at,
          rater_id,
          rated_player_id,
          playstyle_id,
          has_pace,
          has_shooting,
          has_passing,
          has_dribbling,
          has_defending,
          has_physical
        `);

      if (raterId) {
        query = query.eq('rater_id', raterId);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!data || data.length === 0) {
        setRecentRatings([]);
        return;
      }

      // Fetch current position ratings for all these player ratings
      const ratingIds = data.map(r => r.id);
      const { data: currentPositionsData, error: currentPositionsError } = await supabaseAdmin
        .from('player_position_ratings')
        .select('rated_player_id, rater_id, position, rank')
        .in('rater_id', data.map(r => r.rater_id))
        .in('rated_player_id', data.map(r => r.rated_player_id));

      if (currentPositionsError) throw currentPositionsError;

      // Group current positions by rater-player pair
      const currentPositionsMap = new Map();
      currentPositionsData?.forEach(pr => {
        const key = `${pr.rater_id}-${pr.rated_player_id}`;
        const existing = currentPositionsMap.get(key) || {};
        if (pr.rank === 1) existing.first = pr.position;
        if (pr.rank === 2) existing.second = pr.position;
        if (pr.rank === 3) existing.third = pr.position;
        currentPositionsMap.set(key, existing);
      });

      // Fetch player details for all unique player IDs
      const playerIds = [...new Set([
        ...data.map(r => r.rater_id),
        ...data.map(r => r.rated_player_id)
      ])].filter(Boolean);

      const { data: playersData, error: playersError } = await supabaseAdmin
        .from('players')
        .select('id, friendly_name, is_admin')
        .in('id', playerIds);

      if (playersError) throw playersError;

      // Create a map for quick lookup
      const playersMap = new Map(
        (playersData || []).map(p => [p.id, p])
      );

      // Fetch previous values from history for each rating
      // Note: Position history is NOT tracked in player_ratings_history - positions are in player_position_ratings
      const ratingsWithHistory = await Promise.all(
        data.map(async (rating) => {
          // Get the most recent history entry before the current update
          const { data: historyData } = await supabaseAdmin
            .from('player_ratings_history')
            .select('attack_rating, defense_rating, game_iq_rating, gk_rating, playstyle_id')
            .eq('rating_id', rating.id)
            .lt('changed_at', rating.updated_at || rating.created_at)
            .order('changed_at', { ascending: false })
            .limit(1);

          const previousRating = historyData?.[0] || null;

          // Get previous playstyle from the map if it exists
          let previousPlaystyle = null;
          if (previousRating?.playstyle_id) {
            previousPlaystyle = playstylesMap.get(previousRating.playstyle_id) || null;
          }

          // Get current positions for this rater-player pair
          const positionKey = `${rating.rater_id}-${rating.rated_player_id}`;
          const currentPositions = currentPositionsMap.get(positionKey) || {};

          return {
            ...rating,
            previous_attack_rating: previousRating?.attack_rating ?? null,
            previous_defense_rating: previousRating?.defense_rating ?? null,
            previous_game_iq_rating: previousRating?.game_iq_rating ?? null,
            previous_gk_rating: previousRating?.gk_rating ?? null,
            previous_playstyle_id: previousRating?.playstyle_id ?? null,
            previous_playstyle: previousPlaystyle,
            position_1st: currentPositions.first ?? null,
            position_2nd: currentPositions.second ?? null,
            position_3rd: currentPositions.third ?? null,
            // Position history not tracked - previous positions not available
            previous_position_1st: null,
            previous_position_2nd: null,
            previous_position_3rd: null
          };
        })
      );

      // Import functions from playstyle utils
      const { generatePlaystyleName } = await import('../../../../types/playstyle');

      // Map the data to match the Rating type
      const formattedData = ratingsWithHistory.map(item => {
        let playstyle = null;

        // If there's a playstyle_id, use the predefined playstyle
        if (item.playstyle_id) {
          playstyle = playstylesMap.get(item.playstyle_id);
        }
        // If there are attribute boolean fields, generate the playstyle name
        else if (item.has_pace !== null || item.has_shooting !== null ||
                 item.has_passing !== null || item.has_dribbling !== null ||
                 item.has_defending !== null || item.has_physical !== null) {
          const attributes = {
            has_pace: item.has_pace || false,
            has_shooting: item.has_shooting || false,
            has_passing: item.has_passing || false,
            has_dribbling: item.has_dribbling || false,
            has_defending: item.has_defending || false,
            has_physical: item.has_physical || false
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
          ...item,
          rater: playersMap.get(item.rater_id) || null,
          rated_player: playersMap.get(item.rated_player_id) || null,
          playstyle: playstyle
        };
      }).filter(item => item.rater && item.rated_player);

      setRecentRatings(formattedData);
    } catch (error) {
      toast.error('Error fetching recent ratings');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { recentRatings, loading, fetchRecentRatings };
};