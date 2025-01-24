import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabase';
import { Player } from '../components/player-card/PlayerCardTypes';

/**
 * Custom hook for managing player grid data and state
 * Handles fetching players, their latest game status, and related stats
 */
export const usePlayerGrid = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get all player data in a single query
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select(`
            id,
            friendly_name,
            avatar_svg,
            whatsapp_group_member,
            caps,
            active_bonuses,
            active_penalties,
            current_streak,
            max_streak,
            bench_warmer_streak,
            player_xp (
              xp,
              rank,
              rarity
            )
          `)
          .order('friendly_name');

        if (playersError) {
          toast.error('Error fetching players');
          console.error('Error fetching players:', playersError);
          return;
        }

        // Get unpaid games
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data: unpaidGamesData, error: unpaidError } = await supabase
          .from('game_registrations')
          .select('player_id')
          .eq('paid', false)
          .gt('created_at', twentyFourHoursAgo.toISOString())
          .not('status', 'eq', 'reserve')
          .not('status', 'eq', 'dropped_out');

        if (unpaidError) {
          toast.error('Error fetching unpaid games');
          console.error('Error fetching unpaid games:', unpaidError);
          return;
        }

        // Count unpaid games per player
        const unpaidGamesMap = (unpaidGamesData || []).reduce((acc, reg) => {
          acc[reg.player_id] = (acc[reg.player_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        if (players) {
          setPlayers(players.map((player) => ({
            id: player.id,
            friendlyName: player.friendly_name,
            avatarSvg: player.avatar_svg,
            whatsapp_group_member: player.whatsapp_group_member,
            caps: player.caps || 0,
            xp: player.player_xp?.xp || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0,
            maxStreak: player.max_streak || 0,
            benchWarmerStreak: player.bench_warmer_streak || 0,
            rarity: player.player_xp?.rarity || 'Amateur',
            rank: player.player_xp?.rank || 0,
            wins: 0,
            draws: 0,
            losses: 0,
            totalGames: 0,
            winRate: 0,
            streakBonus: 0,
            dropoutPenalty: 0,
            bonusModifier: 0,
            penaltyModifier: 0,
            totalModifier: 0,
            unpaidGames: unpaidGamesMap[player.id] || 0,
            unpaidGamesModifier: (unpaidGamesMap[player.id] || 0) * -0.5, // -50% per unpaid game
            registrationStreakBonus: 0,
            registrationStreakBonusApplies: false
          })));
        }
      } catch (error) {
        console.error('Error in fetchPlayers:', error);
        toast.error('Error loading player data');
        setError(error as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return {
    players,
    loading,
    error,
    setPlayers
  };
};
