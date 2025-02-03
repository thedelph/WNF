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

        // Get win rates and game stats
        const { data: winRateData, error: winRateError } = await supabase
          .rpc('get_player_win_rates');

        if (winRateError) {
          toast.error('Error fetching win rates');
          console.error('Error fetching win rates:', winRateError);
          return;
        }

        // Create a map of win rate data for easy lookup
        const winRateMap = (winRateData || []).reduce((acc, player) => {
          acc[player.id] = {
            wins: player.wins || 0,
            draws: player.draws || 0,
            losses: player.losses || 0,
            totalGames: player.total_games || 0,
            winRate: player.win_rate || 0
          };
          return acc;
        }, {} as Record<string, { wins: number, draws: number, losses: number, totalGames: number, winRate: number }>);

        // Get unpaid games from completed games only
        const { data: unpaidGamesData, error: unpaidError } = await supabase
          .from('player_xp_breakdown')
          .select(`
            friendly_name,
            unpaid_games_count,
            unpaid_games_modifier
          `);

        if (unpaidError) {
          toast.error('Error fetching unpaid games');
          console.error('Error fetching unpaid games:', unpaidError);
          return;
        }

        // Create map of unpaid games data by friendly name
        const unpaidGamesMap = (unpaidGamesData || []).reduce((acc, player) => {
          acc[player.friendly_name] = {
            unpaidGames: player.unpaid_games_count || 0,
            unpaidGamesModifier: player.unpaid_games_modifier || 0
          };
          return acc;
        }, {} as Record<string, { unpaidGames: number, unpaidGamesModifier: number }>);

        // Get registration streak data
        const { data: registrationStreakData, error: registrationStreakError } = await supabase
          .from('player_current_registration_streak_bonus')
          .select('friendly_name, current_streak_length, bonus_applies');

        if (registrationStreakError) {
          toast.error('Error fetching registration streak data');
          console.error('Error fetching registration streak data:', registrationStreakError);
          return;
        }

        // Create a map of registration streak data using friendly names
        const registrationStreakMap = (registrationStreakData || []).reduce((acc, streak) => {
          acc[streak.friendly_name] = {
            bonus: streak.current_streak_length || 0,
            applies: streak.bonus_applies || false
          };
          return acc;
        }, {} as Record<string, { bonus: number, applies: boolean }>);

        if (players) {
          setPlayers(players.map((player) => {
            const streakData = registrationStreakMap[player.friendly_name] || { bonus: 0, applies: false };
            const winStats = winRateMap[player.id] || { wins: 0, draws: 0, losses: 0, totalGames: 0, winRate: 0 };
            const unpaidStats = unpaidGamesMap[player.friendly_name] || { unpaidGames: 0, unpaidGamesModifier: 0 };
            return {
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
              wins: winStats.wins,
              draws: winStats.draws,
              losses: winStats.losses,
              totalGames: winStats.totalGames,
              winRate: winStats.winRate,
              streakBonus: 0,
              dropoutPenalty: 0,
              bonusModifier: 0,
              penaltyModifier: 0,
              totalModifier: 0,
              unpaidGames: unpaidStats.unpaidGames,
              unpaidGamesModifier: unpaidStats.unpaidGamesModifier,
              registrationStreakBonus: streakData.bonus,
              registrationStreakBonusApplies: streakData.applies
            };
          }));
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
