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
      
      // Build query with optional rater filter
      let query = supabaseAdmin
        .from('player_ratings')
        .select(`
          id,
          attack_rating,
          defense_rating,
          game_iq_rating,
          created_at,
          updated_at,
          rater_id,
          rated_player_id,
          playstyle_id,
          playstyles (
            id,
            name,
            category
          )
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
      const ratingsWithHistory = await Promise.all(
        data.map(async (rating) => {
          // Get the most recent history entry before the current update
          const { data: historyData } = await supabaseAdmin
            .from('player_ratings_history')
            .select('attack_rating, defense_rating, game_iq_rating, playstyle_id')
            .eq('rating_id', rating.id)
            .lt('changed_at', rating.updated_at || rating.created_at)
            .order('changed_at', { ascending: false })
            .limit(1);
            
          const previousRating = historyData?.[0] || null;
          
          // Fetch previous playstyle details if there was a previous playstyle
          let previousPlaystyle = null;
          if (previousRating?.playstyle_id) {
            const { data: playstyleData } = await supabaseAdmin
              .from('playstyles')
              .select('id, name, category')
              .eq('id', previousRating.playstyle_id)
              .single();
            previousPlaystyle = playstyleData;
          }
            
          return {
            ...rating,
            previous_attack_rating: previousRating?.attack_rating ?? null,
            previous_defense_rating: previousRating?.defense_rating ?? null,
            previous_game_iq_rating: previousRating?.game_iq_rating ?? null,
            previous_playstyle_id: previousRating?.playstyle_id ?? null,
            previous_playstyle: previousPlaystyle
          };
        })
      );
      
      // Map the data to match the Rating type
      const formattedData = ratingsWithHistory.map(item => ({
        ...item,
        rater: playersMap.get(item.rater_id) || null,
        rated_player: playersMap.get(item.rated_player_id) || null,
        playstyle: item.playstyles || null
      })).filter(item => item.rater && item.rated_player);
      

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