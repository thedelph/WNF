/**
 * Hook to fetch a player's MOTM stats for their profile
 * Calls get_player_motm_stats RPC
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

interface PlayerMotmStats {
  motmWins: number;
  totalVotesReceived: number;
  gamesVotedIn: number;
}

export const usePlayerMotmStats = (playerId: string | null) => {
  const [stats, setStats] = useState<PlayerMotmStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!playerId) {
        setStats(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_player_motm_stats', {
          p_player_id: playerId,
        });

        if (error) throw error;

        if (data && data.length > 0) {
          setStats({
            motmWins: Number(data[0].motm_wins) || 0,
            totalVotesReceived: Number(data[0].total_votes_received) || 0,
            gamesVotedIn: Number(data[0].games_voted_in) || 0,
          });
        } else {
          setStats({ motmWins: 0, totalVotesReceived: 0, gamesVotedIn: 0 });
        }
      } catch (err) {
        console.error('Error fetching player MOTM stats:', err);
        setStats({ motmWins: 0, totalVotesReceived: 0, gamesVotedIn: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [playerId]);

  return { stats, loading };
};

export default usePlayerMotmStats;
