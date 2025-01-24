import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Registration } from '../types/playerSelection';

interface PlayerStats {
  xp: number;
  wins: number;
  draws: number;
  losses: number;
  total_games: number;
  win_rate: number;
  rarity: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary';
  caps: number;
  activeBonuses: number;
  activePenalties: number;
  currentStreak: number;
  maxStreak: number;
  benchWarmerStreak: number;
  registrationStreak: number;
  registrationStreakApplies: boolean;
  rank: number | undefined;
  unpaidGames?: number;
  unpaidGamesModifier?: number;
}

interface UseGameRegistrationStatsReturn {
  loading: boolean;
  error: string | null;
  playerStats: Record<string, PlayerStats>;
  stats: Record<string, any>;
}

/**
 * Hook to fetch and manage player stats for game registrations
 * Handles fetching player stats, registration streaks, and win rates
 * @param registrations Array of game registrations
 * @returns Object containing loading state, error state, and player stats
 */
export const useGameRegistrationStats = (
  registrations: Registration[]
): UseGameRegistrationStatsReturn => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>({});
  const [stats, setStats] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        
        // Get player IDs from registrations
        const playerIds = registrations.map(reg => reg.player.id);
        
        // Get player stats and XP data
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select(`
            id,
            caps,
            current_streak,
            max_streak,
            active_bonuses,
            active_penalties,
            win_rate,
            bench_warmer_streak,
            unpaid_games,
            unpaid_games_modifier,
            player_xp (
              xp,
              rank,
              rarity
            )
          `)
          .in('id', playerIds);

        if (playerError) throw playerError;

        // Get registration streak data
        const { data: regStreakData, error: regStreakError } = await supabase
          .from('player_current_registration_streak_bonus')
          .select('friendly_name, current_streak_length, bonus_applies');

        if (regStreakError) throw regStreakError;

        // Create a map of registration streak data for easy lookup
        const regStreakMap = regStreakData?.reduce((acc: any, player: any) => ({
          ...acc,
          [player.friendly_name]: {
            registrationStreak: player.current_streak_length || 0,
            registrationStreakApplies: player.bonus_applies || false
          }
        }), {});

        // Get win rates and game stats
        const { data: winRateData, error: winRateError } = await supabase
          .rpc('get_player_win_rates')
          .in('id', playerIds);

        if (winRateError) throw winRateError;

        // Create a map of win rate data for easy lookup
        const winRateMap = winRateData.reduce((acc: any, player: any) => ({
          ...acc,
          [player.id]: {
            wins: player.wins,
            draws: player.draws,
            losses: player.losses,
            total_games: player.total_games,
            win_rate: player.win_rate
          }
        }), {});

        // Create a map of registration statuses for easy lookup
        const registrationStatusMap = registrations.reduce((acc: any, reg: any) => ({
          ...acc,
          [reg.player.id]: reg.status
        }), {});

        // Transform into record for easy lookup
        const stats = playerData?.reduce((acc, player) => {
          // Check if player has dropped out
          const isDroppedOut = registrationStatusMap[player.id] === 'dropped_out';
          
          // Only count unpaid games if player hasn't dropped out AND the game is unpaid
          const shouldCountUnpaidGames = !isDroppedOut && player.unpaid_games > 0;

          return {
            ...acc,
            [player.id]: {
              xp: player.player_xp?.xp || 0,
              rarity: player.player_xp?.rarity || 'Amateur',
              caps: player.caps || 0,
              activeBonuses: player.active_bonuses || 0,
              activePenalties: player.active_penalties || 0,
              currentStreak: player.current_streak || 0,
              maxStreak: player.max_streak || 0,
              benchWarmerStreak: player.bench_warmer_streak || 0,
              wins: winRateMap[player.id]?.wins || 0,
              draws: winRateMap[player.id]?.draws || 0,
              losses: winRateMap[player.id]?.losses || 0,
              totalGames: winRateMap[player.id]?.total_games || 0,
              winRate: winRateMap[player.id]?.win_rate || 0,
              rank: player.player_xp?.rank || undefined,
              registrationStreak: regStreakMap[player.friendly_name]?.registrationStreak || 0,
              registrationStreakApplies: regStreakMap[player.friendly_name]?.registrationStreakApplies || false,
              unpaidGames: shouldCountUnpaidGames ? player.unpaid_games : 0,
              unpaidGamesModifier: shouldCountUnpaidGames ? player.unpaid_games_modifier : 0
            }
          };
        }, {});

        const statsMap = registrations.reduce((acc, registration) => {
          // Get player data from the main stats object
          const playerData = stats[registration.player.id] || {};
          
          const playerStats = {
            currentStreak: playerData.currentStreak || 0,
            activeBonuses: playerData.activeBonuses || 0,
            activePenalties: playerData.activePenalties || 0,
            unpaidGamesModifier: playerData.unpaidGamesModifier || 0,
            registrationStreak: regStreakMap[registration.player.friendly_name]?.registrationStreak || 0,
            registrationStreakApplies: regStreakMap[registration.player.friendly_name]?.registrationStreakApplies || false,
          };

          return {
            ...acc,
            [registration.player.id]: playerStats
          };
        }, {});

        setPlayerStats(stats);
        setStats(statsMap);
      } catch (err) {
        console.error('Error fetching player stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, [registrations]);

  return { loading, error, playerStats, stats };
};
