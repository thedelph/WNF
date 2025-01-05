import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

/**
 * Hook to fetch and cache global XP values for all players
 * Used for consistent rarity calculations across the site
 * @returns {object} Object containing:
 * - xpValues: Array of all player XP values
 * - rarityValues: Array of all player rarity values
 * - totalPlayers: Total number of players in the database
 * - loading: Boolean indicating if data is being fetched
 * - error: Error message if fetch failed
 */
export const useGlobalXP = () => {
  const [xpValues, setXpValues] = useState<number[]>([]);
  const [rarityValues, setRarityValues] = useState<string[]>([]);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const CACHE_KEY = 'global_xp_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  useEffect(() => {
    const fetchGlobalXP = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { xpArray, rarityArray, timestamp, count } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setXpValues(xpArray);
            setRarityValues(rarityArray);
            setTotalPlayers(count);
            setLoading(false);
            return;
          }
        }

        // Fetch all player XP values
        const { data: playerXPData, error: xpError } = await supabase
          .from('player_xp')
          .select('player_id, xp, rarity')
          .order('xp', { ascending: false });

        if (xpError) throw xpError;

        // Transform into array of XP values, defaulting to 0 for null values
        const xpArray = playerXPData.map(stat => stat.xp || 0);
        const rarityArray = playerXPData.map(stat => stat.rarity || '');
        
        // Cache the results
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          xpArray,
          rarityArray,
          count: xpArray.length,
          timestamp: Date.now()
        }));

        setXpValues(xpArray);
        setRarityValues(rarityArray);
        setTotalPlayers(xpArray.length);
      } catch (err) {
        console.error('Error fetching global XP values:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching XP values');
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalXP();
  }, []); // Empty dependency array as we only need to fetch once

  return { xpValues, rarityValues, totalPlayers, loading, error };
};
