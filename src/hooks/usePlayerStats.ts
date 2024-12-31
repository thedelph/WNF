import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { calculatePlayerXP } from '../utils/xpCalculations';

interface PlayerStats {
  caps: number;
  active_bonuses: number;
  active_penalties: number;
  current_streak: number;
  game_sequences?: number[];
}

interface PlayerGameSequences {
  player_id: string;
  game_sequences: number[];
}

export const usePlayerStats = () => {
  const [allPlayersXP, setAllPlayersXP] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllPlayersXP = async () => {
      try {
        setLoading(true);
        
        // Fetch player stats and game sequences in parallel
        const [statsResponse] = await Promise.all([
          supabase
            .from('players')
            .select(`
              id,
              caps,
              active_bonuses,
              active_penalties,
              current_streak
            `)
        ]);

        if (statsResponse.error) throw statsResponse.error;

        // Try to get game sequences, but don't fail if the function doesn't exist yet
        let gameSequences = [];
        try {
          const { data: sequences, error: seqError } = await supabase.rpc('get_player_game_sequences');
          if (!seqError) {
            gameSequences = sequences;
          } else {
            console.warn('Game sequences not available:', seqError);
          }
        } catch (err) {
          console.warn('Game sequences not available:', err);
        }

        // Merge the data
        const playersWithSequences = statsResponse.data.map(player => ({
          ...player,
          game_sequences: gameSequences.find(
            seq => seq?.player_id === player.id
          )?.game_sequences || []
        }));

        // Calculate XP for each player with the new game sequences data
        const xpValues = playersWithSequences.map((player) => 
          calculatePlayerXP({
            caps: player.caps || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0,
            gameSequences: player.game_sequences
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
