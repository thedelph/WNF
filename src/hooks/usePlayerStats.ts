import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { PlayerStats } from '../types/playerSelection';

export const usePlayerStats = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [players, setPlayers] = useState<PlayerStats[]>([]);

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get all player stats from the player_stats view
        const { data: playerStats, error: statsError } = await supabase
          .from('player_stats')
          .select('*')
          .order('xp', { ascending: false });

        if (statsError) throw statsError;

        // Transform the data to match our PlayerStats interface
        const transformedStats: PlayerStats[] = playerStats.map(player => ({
          id: player.id,
          friendly_name: player.friendly_name,
          preferred_position: player.preferred_position,
          caps: player.caps || 0,
          active_bonuses: player.active_bonuses || 0,
          active_penalties: player.active_penalties || 0,
          current_streak: player.current_streak || 0,
          max_streak: player.max_streak || 0,
          win_rate: player.win_rate || 0,
          xp: player.xp || 0,
          avatar_svg: player.avatar_svg,
          game_sequences: player.game_sequences || [],
          latest_sequence: player.latest_sequence
        }));

        setPlayers(transformedStats);
      } catch (err) {
        console.error('Error fetching player stats:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch player stats'));
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, []);

  return { players, loading, error };
};
