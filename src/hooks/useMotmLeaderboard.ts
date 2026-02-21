/**
 * Hook to fetch MOTM leaderboard for LiveStatsTab
 * Calls get_motm_leaderboard RPC
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

interface MotmLeaderEntry {
  playerId: string;
  playerName: string;
  motmCount: number;
}

export const useMotmLeaderboard = (limit: number = 5) => {
  const [leaders, setLeaders] = useState<MotmLeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_motm_leaderboard', {
          p_limit: limit,
        });

        if (error) throw error;

        setLeaders(
          (data || []).map((row: { player_id: string; friendly_name: string; motm_count: number }) => ({
            playerId: row.player_id,
            playerName: row.friendly_name,
            motmCount: Number(row.motm_count),
          }))
        );
      } catch (err) {
        console.error('Error fetching MOTM leaderboard:', err);
        setLeaders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit]);

  return { leaders, loading };
};

export default useMotmLeaderboard;
