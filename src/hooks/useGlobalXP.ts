import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

/**
 * Hook to fetch and cache global XP values for all players
 * Used for consistent rarity calculations across the site
 * @returns {object} Object containing:
 * - xpValues: Array of all player XP values
 * - loading: Boolean indicating if data is being fetched
 * - error: Error message if fetch failed
 */
export const useGlobalXP = () => {
  const [xpValues, setXpValues] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGlobalXP = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all player stats
        const { data: statsData, error: statsError } = await supabase
          .from('player_stats')
          .select('xp')
          .order('xp', { ascending: false });

        if (statsError) throw statsError;

        // Transform into array of XP values, defaulting to 0 for null values
        const xpArray = statsData.map(stat => stat.xp || 0);
        setXpValues(xpArray);
      } catch (err) {
        console.error('Error fetching global XP values:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching XP values');
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalXP();
  }, []); // Empty dependency array as we only need to fetch once

  return { xpValues, loading, error };
};
