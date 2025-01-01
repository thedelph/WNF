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
        
        // Get latest game sequence
        const latestSequenceResponse = await supabase
          .from('games')
          .select('sequence_number')
          .order('sequence_number', { ascending: false })
          .limit(1);

        if (latestSequenceResponse.error) throw latestSequenceResponse.error;
        const latestSequence = Number(latestSequenceResponse.data[0]?.sequence_number || 0);

        // Get game registrations with sequences
        const gameRegsResponse = await supabase
          .from('game_registrations')
          .select(`
            player_id,
            games!inner (
              outcome,
              sequence_number
            )
          `)
          .order('games(sequence_number)', { ascending: false });

        if (gameRegsResponse.error) throw gameRegsResponse.error;

        // Group game sequences by player
        const playerSequences: { [key: string]: number[] } = {};
        gameRegsResponse.data.forEach(reg => {
          if (!reg.games?.sequence_number) return;
          
          if (!playerSequences[reg.player_id]) {
            playerSequences[reg.player_id] = [];
          }
          playerSequences[reg.player_id].push(Number(reg.games.sequence_number));
        });

        // Get all player stats
        const statsResponse = await supabase
          .from('players')
          .select(`
            id,
            caps,
            active_bonuses,
            active_penalties,
            current_streak
          `);

        if (statsResponse.error) throw statsResponse.error;

        // Calculate XP for each player
        const xpValues = statsResponse.data.map(player => {
          const stats = {
            caps: player.caps || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0,
            gameSequences: playerSequences[player.id] || [],
            latestSequence
          };

          return calculatePlayerXP(stats);
        });

        setAllPlayersXP(xpValues);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching player stats:', err);
        setError(err.message);
        setAllPlayersXP([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPlayersXP();
  }, []);

  return { allPlayersXP, loading, error };
};
