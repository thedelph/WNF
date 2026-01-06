/**
 * Hook for fetching a player's trophies for the Trophy Cabinet
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  PlayerTrophy,
  PlayerTrophyFromDB,
  TrophyCounts,
  AwardCategory,
  MedalType
} from '../types/awards';

/**
 * Transform database trophy to frontend format
 */
const transformTrophy = (dbTrophy: PlayerTrophyFromDB): PlayerTrophy => ({
  id: dbTrophy.id,
  category: dbTrophy.award_category as AwardCategory,
  medalType: dbTrophy.medal_type as MedalType,
  year: dbTrophy.award_year,
  value: dbTrophy.value,
  partnerId: dbTrophy.partner_id ?? undefined,
  partnerName: dbTrophy.partner_name ?? undefined,
  partner2Id: dbTrophy.partner2_id ?? undefined,
  partner2Name: dbTrophy.partner2_name ?? undefined,
  awardedAt: dbTrophy.awarded_at,
});

/**
 * Hook to fetch all trophies for a specific player
 */
export const usePlayerTrophies = (playerId: string | undefined) => {
  const [trophies, setTrophies] = useState<PlayerTrophy[]>([]);
  const [counts, setCounts] = useState<TrophyCounts>({ total: 0, gold: 0, silver: 0, bronze: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      setTrophies([]);
      setCounts({ total: 0, gold: 0, silver: 0, bronze: 0 });
      setLoading(false);
      return;
    }

    const fetchTrophies = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch trophies
        const { data: trophyData, error: trophyError } = await supabase.rpc(
          'get_player_trophies',
          { target_player_id: playerId }
        );

        if (trophyError) throw trophyError;

        // Fetch counts
        const { data: countData, error: countError } = await supabase.rpc(
          'get_player_trophy_counts',
          { target_player_id: playerId }
        );

        if (countError) throw countError;

        const transformedTrophies = (trophyData as PlayerTrophyFromDB[]).map(transformTrophy);
        setTrophies(transformedTrophies);

        if (countData && countData.length > 0) {
          setCounts({
            total: Number(countData[0].total_count) || 0,
            gold: Number(countData[0].gold_count) || 0,
            silver: Number(countData[0].silver_count) || 0,
            bronze: Number(countData[0].bronze_count) || 0,
          });
        }
      } catch (err) {
        console.error('Error fetching player trophies:', err);
        setError('Failed to load trophies');
      } finally {
        setLoading(false);
      }
    };

    fetchTrophies();
  }, [playerId]);

  return {
    trophies,
    counts,
    loading,
    error,
    hasTrophies: trophies.length > 0,
  };
};

export default usePlayerTrophies;
