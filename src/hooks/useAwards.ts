/**
 * Hook for fetching awards data for the Awards page
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  Award,
  AwardFromDB,
  AwardsByCategory,
  AwardYearFilter,
  AwardCategory
} from '../types/awards';
import { AWARD_CATEGORIES, AWARD_CATEGORY_ORDER } from '../constants/awards';

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
  awardedAt: dbAward.awarded_at,
});

/**
 * Group awards by category for display
 */
const groupAwardsByCategory = (awards: Award[]): AwardsByCategory[] => {
  const grouped: AwardsByCategory[] = [];

  for (const categoryId of AWARD_CATEGORY_ORDER) {
    const categoryAwards = awards.filter(a => a.category === categoryId);
    if (categoryAwards.length > 0) {
      grouped.push({
        category: categoryId,
        config: AWARD_CATEGORIES[categoryId],
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
 */
export const useAwards = (yearFilter: AwardYearFilter) => {
  const [awards, setAwards] = useState<Award[]>([]);
  const [awardsByCategory, setAwardsByCategory] = useState<AwardsByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAwards = async () => {
      try {
        setLoading(true);
        setError(null);

        const targetYear = yearFilter === 'all' ? null : yearFilter;

        const { data, error: fetchError } = await supabase.rpc('get_awards_by_year', {
          target_year: targetYear,
        });

        if (fetchError) throw fetchError;

        const transformedAwards = (data as AwardFromDB[]).map(transformAward);
        setAwards(transformedAwards);
        setAwardsByCategory(groupAwardsByCategory(transformedAwards));
      } catch (err) {
        console.error('Error fetching awards:', err);
        setError('Failed to load awards');
      } finally {
        setLoading(false);
      }
    };

    fetchAwards();
  }, [yearFilter]);

  return {
    awards,
    awardsByCategory,
    loading,
    error,
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
