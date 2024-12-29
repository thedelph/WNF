import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { calculatePlayerXP } from '../utils/xpCalculations';

interface PlayerStats {
  caps: number;
  active_bonuses: number;
  active_penalties: number;
  current_streak: number;
}

export const usePlayerStats = () => {
  const [allPlayersXP, setAllPlayersXP] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllPlayersXP = async () => {
      try {
        setLoading(true);
        // Fetch all player stats from the database
        const { data: players, error } = await supabase
          .from('players')
          .select(`
            id,
            caps,
            active_bonuses,
            active_penalties,
            current_streak
          `);

        if (error) throw error;

        // Calculate XP for each player and store in array
        const xpValues = players.map((player: PlayerStats) => 
          calculatePlayerXP({
            caps: player.caps || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0
          })
        );

        setAllPlayersXP(xpValues);
        setError(null);
      } catch (err) {
        console.error('Error fetching player stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAllPlayersXP();
  }, []); // Empty dependency array means this runs once on mount

  return { allPlayersXP, loading, error };
};
