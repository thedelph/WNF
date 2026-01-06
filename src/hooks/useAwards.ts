/**
 * Hook for fetching awards data for the Awards page
 *
 * For "All Time" view: Uses live data from RPCs (real-time leaderboards)
 * For specific years: Uses stored award snapshots from player_awards table
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  Award,
  AwardFromDB,
  AwardsByCategory,
  AwardYearFilter,
  AwardCategory,
  LiveAward
} from '../types/awards';
import { AWARD_CATEGORIES, AWARD_CATEGORY_ORDER } from '../constants/awards';
import { useLiveAwards } from './useLiveAwards';

/**
 * Transform database award to frontend format
 */
const transformAward = (dbAward: AwardFromDB): Award => ({
  id: dbAward.id,
  playerId: dbAward.player_id,
  playerName: dbAward.player_name,
  category: dbAward.award_category as AwardCategory,
  medalType: dbAward.medal_type as 'gold' | 'silver' | 'bronze',
  year: dbAward.award_year,
  value: dbAward.value,
  partnerId: dbAward.partner_id ?? undefined,
  partnerName: dbAward.partner_name ?? undefined,
  partner2Id: dbAward.partner2_id ?? undefined,
  partner2Name: dbAward.partner2_name ?? undefined,
  awardedAt: dbAward.awarded_at,
});

/**
 * Group awards by category for display
 * Deduplicates pair/trio awards (each player gets their own DB record,
 * but we only want to show one entry per unique pair/trio in the Hall of Fame)
 */
const groupAwardsByCategory = (awards: Award[]): AwardsByCategory[] => {
  const grouped: AwardsByCategory[] = [];

  for (const categoryId of AWARD_CATEGORY_ORDER) {
    let categoryAwards = awards.filter(a => a.category === categoryId);
    const config = AWARD_CATEGORIES[categoryId];

    // Deduplicate pair awards (keep one entry per unique pair per medal)
    if (config.isPairAward) {
      const seen = new Set<string>();
      categoryAwards = categoryAwards.filter(award => {
        const ids = [award.playerId, award.partnerId].sort();
        const key = `${award.medalType}_${ids.join('_')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Deduplicate trio awards (keep one entry per unique trio per medal)
    if (config.isTrioAward) {
      const seen = new Set<string>();
      categoryAwards = categoryAwards.filter(award => {
        const ids = [award.playerId, award.partnerId, award.partner2Id].sort();
        const key = `${award.medalType}_${ids.join('_')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (categoryAwards.length > 0) {
      grouped.push({
        category: categoryId,
        config: config,
        awards: categoryAwards.sort((a, b) => {
          // Sort by medal: gold, silver, bronze
          const medalOrder = { gold: 0, silver: 1, bronze: 2 };
          return medalOrder[a.medalType] - medalOrder[b.medalType];
        }),
      });
    }
  }

  return grouped;
};

/**
 * Hook to fetch awards for a specific year or all-time
 *
 * Uses live data from RPCs for both "All Time" and specific years
 * This provides real-time leaderboards with W/D/L details for all views
 */
export const useAwards = (yearFilter: AwardYearFilter) => {
  // Convert year filter to format expected by useLiveAwards
  const liveYearFilter = yearFilter === 'all' ? 'all' : yearFilter;

  // Use live awards for all years (live calculation with W/D/L details)
  const liveAwards = useLiveAwards(liveYearFilter);

  return {
    awards: liveAwards.awards,
    awardsByCategory: liveAwards.awardsByCategory,
    loading: liveAwards.loading,
    error: liveAwards.error,
  };
};

/**
 * Hook to get available years that have awards
 */
export const useAwardYears = () => {
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const { data, error } = await supabase
          .from('player_awards')
          .select('award_year')
          .not('award_year', 'is', null);

        if (error) throw error;

        // Get unique years
        const yearValues: number[] = data.map(d => d.award_year as number);
        const uniqueYears: number[] = Array.from(new Set<number>(yearValues));
        setYears(uniqueYears.sort((a, b) => b - a)); // Sort descending
      } catch (err) {
        console.error('Error fetching award years:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchYears();
  }, []);

  return { years, loading };
};

export default useAwards;
