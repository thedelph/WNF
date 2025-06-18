import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabase';
import { Player } from '../components/player-card/PlayerCardTypes';
import { executeBatchQueries } from '../utils/network';

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

        // Define all queries
        const queries = [
          // Players query
          () => supabase
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
              bench_warmer_streak,
              player_xp (
                xp,
                rank,
                rarity
              )
            `)
            .order('friendly_name'),

          // Win rates query
          () => supabase.rpc('get_player_win_rates'),

          // Unpaid games query
          () => supabase
            .from('player_xp_breakdown')
            .select(`
              friendly_name,
              unpaid_games_count,
              unpaid_games_modifier
            `),

          // Registration streak query
          () => supabase
            .from('player_current_registration_streak_bonus')
            .select('friendly_name, current_streak_length, bonus_applies'),
            
          // Player streak stats (for correct max streak values)
          () => supabase
            .from('player_streak_stats')
            .select('friendly_name, longest_streak, longest_streak_period')
        ];

        // Execute all queries with retry logic
        const { data: results, error: batchError } = await executeBatchQueries(queries);

        if (batchError || !results) {
          throw batchError || new Error('Failed to fetch player data');
        }

        const [
          playersData,
          winRateData,
          unpaidGamesData,
          registrationStreakData,
          streakStatsData
        ] = results;

        // Create maps for efficient lookups
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

        const unpaidGamesMap = (unpaidGamesData || []).reduce((acc, player) => {
          acc[player.friendly_name] = {
            unpaidGames: player.unpaid_games_count || 0,
            unpaidGamesModifier: player.unpaid_games_modifier || 0
          };
          return acc;
        }, {} as Record<string, { unpaidGames: number, unpaidGamesModifier: number }>);

        const registrationStreakMap = (registrationStreakData || []).reduce((acc, player) => {
          acc[player.friendly_name] = {
            registrationStreak: player.current_streak_length || 0,
            registrationStreakApplies: player.bonus_applies || false
          };
          return acc;
        }, {} as Record<string, { registrationStreak: number, registrationStreakApplies: boolean }>);
        
        // Create map for streak stats data
        const streakStatsMap = (streakStatsData || []).reduce((acc, player) => {
          acc[player.friendly_name] = {
            longestStreak: player.longest_streak || 0,
            longestStreakPeriod: player.longest_streak_period
          };
          return acc;
        }, {} as Record<string, { longestStreak: number, longestStreakPeriod: any }>);

        // Combine all data
        const combinedPlayers = (playersData || []).map(player => {
          // Use the longest_streak from player_streak_stats if available, otherwise fall back to max_streak from players table
          const correctMaxStreak = streakStatsMap[player.friendly_name]?.longestStreak || 0;
          
          // Log for debugging if there's a discrepancy
          if (streakStatsMap[player.friendly_name]?.longestStreak !== correctMaxStreak) {
            console.log(`Max streak discrepancy for ${player.friendly_name}:`, {
              from_players_table: 0,
              from_streak_stats: streakStatsMap[player.friendly_name]?.longestStreak,
              using: correctMaxStreak
            });
          }
          
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
            maxStreak: correctMaxStreak,
            benchWarmerStreak: player.bench_warmer_streak || 0,
            // Use the database rarity value which now correctly handles Academy vs Retired
            rarity: player.player_xp?.rarity || (player.player_xp?.xp === 0 ? 'Academy' : 'Amateur'),
            rank: player.player_xp?.rank || 0,
            wins: winRateMap[player.id]?.wins || 0,
            draws: winRateMap[player.id]?.draws || 0,
            losses: winRateMap[player.id]?.losses || 0,
            totalGames: winRateMap[player.id]?.totalGames || 0,
            winRate: winRateMap[player.id]?.winRate || 0,
            streakBonus: 0,
            dropoutPenalty: 0,
            bonusModifier: 0,
            penaltyModifier: 0,
            totalModifier: 0,
            unpaidGames: unpaidGamesMap[player.friendly_name]?.unpaidGames || 0,
            unpaidGamesModifier: unpaidGamesMap[player.friendly_name]?.unpaidGamesModifier || 0,
            registrationStreakBonus: registrationStreakMap[player.friendly_name]?.registrationStreak || 0,
            registrationStreakBonusApplies: registrationStreakMap[player.friendly_name]?.registrationStreakApplies || false
          };
        });

        setPlayers(combinedPlayers);
      } catch (err: any) {
        console.error('Error in usePlayerGrid:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return { players, loading, error };
};
