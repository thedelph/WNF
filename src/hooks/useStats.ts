import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

interface PlayerStats {
  id: string;
  friendlyName: string;
  caps: number;
  winRate: number;
  recentWinRate?: number;
  currentStreak: number;
  maxStreak: number;
  currentWinStreak: number;
  maxWinStreak: number;
  currentUnbeatenStreak: number;
  maxUnbeatenStreak: number;
  maxStreakDate?: string;
  maxAttendanceStreakDate?: string;
  maxUnbeatenStreakDate?: string;
  recentGames: number;
  wins: number;
  draws: number;
  losses: number;
  recentWins?: number;
  recentDraws?: number;
  recentLosses?: number;
}

interface TeamColorStats {
  id: string;
  friendlyName: string;
  team: string;
  teamFrequency: number;
  caps: number;
}

interface BestBuddies {
  id: string;
  friendlyName: string;
  buddyId: string;
  buddyFriendlyName: string;
  gamesTogether: number;
}

/**
 * Interface for player goal differential statistics
 * Tracks goals for, goals against, and overall goal differential
 */
interface PlayerGoalStats {
  id: string;
  friendlyName: string;
  caps: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
}

interface Stats {
  luckyBibColor: {
    color: 'orange' | 'blue';
    winRate: number;
  };
  topAttendanceStreaks: PlayerStats[];
  currentStreaks: PlayerStats[];
  mostCaps: PlayerStats[];
  bestWinRates: PlayerStats[];
  teamColorFrequency: {
    blue: TeamColorStats[];
    orange: TeamColorStats[];
  };
  bestBuddies: BestBuddies[];
  topWinStreaks: PlayerStats[];
  currentWinStreaks: PlayerStats[];
  topUnbeatenStreaks: PlayerStats[];
  currentUnbeatenStreaks: PlayerStats[];
  // New goal differential stats
  goalDifferentials: PlayerGoalStats[];
  loading: boolean;
  error: string | null;
}

export const useStats = (year?: number, availableYears?: number[]) => {
  const [stats, setStats] = useState<Stats>({
    luckyBibColor: { color: 'blue', winRate: 0 },
    topAttendanceStreaks: [],
    currentStreaks: [],
    mostCaps: [],
    bestWinRates: [],
    teamColorFrequency: {
      blue: [],
      orange: []
    },
    bestBuddies: [],
    topWinStreaks: [],
    currentWinStreaks: [],
    topUnbeatenStreaks: [],
    currentUnbeatenStreaks: [],
    goalDifferentials: [], // Initialize the goal differentials array
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      setStats(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        // Add a timestamp to force fresh data - for cache busting if needed
        
        // Fetch lucky bib color stats
        const { data: colorStats, error: colorError } = await supabase
          .rpc('get_team_color_stats', { 
            target_year: year || null 
          });

        if (colorError) throw colorError;

        // Fetch player stats for win rates
        const { data: playerStats, error: statsError } = await supabase
          .rpc('get_player_win_rates', { 
            target_year: year || null 
          });

        if (statsError) throw statsError;

        // Fetch recent win rates (last 10 games)
        const { data: recentWinRates, error: recentWinRatesError } = await supabase
          .rpc('get_player_recent_win_rates');

        if (recentWinRatesError) throw recentWinRatesError;

        // Create a map of recent win rates
        const recentWinRateMap = new Map<string, { 
          recent_win_rate: number, 
          recent_wins: number, 
          recent_draws: number, 
          recent_losses: number 
        }>(
          recentWinRates?.map((r: { 
            id: string, 
            recent_win_rate: number, 
            recent_wins: number, 
            recent_draws: number, 
            recent_losses: number 
          }) => [r.id, { 
            recent_win_rate: Number(r.recent_win_rate), 
            recent_wins: Number(r.recent_wins),
            recent_draws: Number(r.recent_draws),
            recent_losses: Number(r.recent_losses)
          }]) || []
        );

        // Fetch player caps (includes all games)
        const { data: playerCaps, error: capsError } = await supabase
          .rpc('get_player_caps', {
            target_year: year || null
          });

        if (capsError) throw capsError;

        // Create a map of player caps
        const capsMap = new Map<string, number>(
          playerCaps?.map(p => [p.id, Number(p.total_games)])
        );
        
        // Fetch goal differential stats
        const { data: goalDifferentials, error: goalDiffError } = await supabase
          .rpc('get_player_goal_differentials', {
            target_year: year || null
          });
          
        if (goalDiffError) throw goalDiffError;

        // Fetch attendance streaks
        const { data: streakStats, error: streakError } = await supabase
          .rpc('get_player_attendance_streaks', { 
            target_year: year || null
          });

        if (streakError) throw streakError;

        // Create a map of player streaks
        const streakMap = new Map<string, { current_streak: number, max_streak: number }>(
          streakStats?.map((s: { id: string, current_streak: number, max_streak: number }) => [s.id, { 
            current_streak: Number(s.current_streak), 
            max_streak: Number(s.max_streak) 
          }]) || []
        );

        // Fetch winning streaks
        const { data: winStreakStats, error: winStreakError } = await supabase
          .rpc('get_player_winning_streaks', { 
            target_year: year || null
          });

        if (winStreakError) throw winStreakError;

        // Create a map of player winning streaks
        const winStreakMap = new Map<string, { current_win_streak: number, max_win_streak: number, max_streak_date?: string }>(
          winStreakStats?.map((s: { id: string, current_win_streak: number, max_win_streak: number, max_streak_date?: string }) => [s.id, { 
            current_win_streak: Number(s.current_win_streak), 
            max_win_streak: Number(s.max_win_streak),
            max_streak_date: s.max_streak_date
          }]) || []
        );
        
        // Fetch unbeaten streaks (only broken by losses, not draws)
        const { data: unbeatenStreakStats, error: unbeatenStreakError } = await supabase
          .rpc('get_player_unbeaten_streaks', { 
            target_year: year || null
          });

        if (unbeatenStreakError) throw unbeatenStreakError;

        // Create a map of player unbeaten streaks
        const unbeatenStreakMap = new Map<string, { current_unbeaten_streak: number, max_unbeaten_streak: number, max_streak_date?: string }>(
          unbeatenStreakStats?.map((s: { id: string, current_unbeaten_streak: number, max_unbeaten_streak: number, max_streak_date?: string }) => [s.id, { 
            current_unbeaten_streak: Number(s.current_unbeaten_streak), 
            max_unbeaten_streak: Number(s.max_unbeaten_streak),
            max_streak_date: s.max_streak_date
          }]) || []
        );
        
        // Fetch player streak stats for attendance streak dates
        const { data: playerStreakStats, error: playerStreakStatsError } = await supabase
          .from('player_streak_stats')
          .select('friendly_name, longest_streak, longest_streak_period');
        
        if (playerStreakStatsError) {
          console.error('Error fetching player streak stats:', playerStreakStatsError);
          // Continue without streak dates rather than failing completely
        }

        // Create a map of player streak periods
        const streakPeriodMap = new Map<string, { end_date: string }>();
        if (playerStreakStats) {
          playerStreakStats.forEach((stat: { friendly_name: string, longest_streak_period: { end_date: string } }) => {
            streakPeriodMap.set(stat.friendly_name, { 
              end_date: stat.longest_streak_period.end_date 
            });
          });
        }

        // Transform player stats to match our interface
        const transformedPlayerStats = playerStats?.map((p) => ({
          id: p.id,
          friendlyName: p.friendly_name,
          caps: capsMap.get(p.id) || Number(p.total_games),
          winRate: Number(p.win_rate),
          currentStreak: streakMap.get(p.id)?.current_streak || 0,
          maxStreak: streakMap.get(p.id)?.max_streak || 0,
          currentWinStreak: winStreakMap.get(p.id)?.current_win_streak || 0,
          maxWinStreak: winStreakMap.get(p.id)?.max_win_streak || 0,
          currentUnbeatenStreak: unbeatenStreakMap.get(p.id)?.current_unbeaten_streak || 0,
          maxUnbeatenStreak: unbeatenStreakMap.get(p.id)?.max_unbeaten_streak || 0,
          maxStreakDate: winStreakMap.get(p.id)?.max_streak_date ? winStreakMap.get(p.id)?.max_streak_date : undefined,
          maxUnbeatenStreakDate: unbeatenStreakMap.get(p.id)?.max_streak_date ? unbeatenStreakMap.get(p.id)?.max_streak_date : undefined,
          maxAttendanceStreakDate: streakPeriodMap.get(p.friendly_name)?.end_date,
          recentGames: 0,
          wins: Number(p.wins),
          draws: Number(p.draws),
          losses: Number(p.losses),
          recentWins: recentWinRateMap.get(p.id)?.recent_wins,
          recentDraws: recentWinRateMap.get(p.id)?.recent_draws,
          recentLosses: recentWinRateMap.get(p.id)?.recent_losses,
          recentWinRate: recentWinRateMap.get(p.id)?.recent_win_rate
        })) || [];

        // Create a list of all players with caps
        const playersWithCaps = playerCaps?.map((p) => ({
          id: p.id,
          friendlyName: p.friendly_name,
          caps: Number(p.total_games),
          winRate: 0,
          currentStreak: streakMap.get(p.id)?.current_streak || 0,
          maxStreak: streakMap.get(p.id)?.max_streak || 0,
          currentWinStreak: winStreakMap.get(p.id)?.current_win_streak || 0,
          maxWinStreak: winStreakMap.get(p.id)?.max_win_streak || 0,
          currentUnbeatenStreak: unbeatenStreakMap.get(p.id)?.current_unbeaten_streak || 0,
          maxUnbeatenStreak: unbeatenStreakMap.get(p.id)?.max_unbeaten_streak || 0,
          maxStreakDate: winStreakMap.get(p.id)?.max_streak_date ? winStreakMap.get(p.id)?.max_streak_date : undefined,
          maxUnbeatenStreakDate: unbeatenStreakMap.get(p.id)?.max_streak_date ? unbeatenStreakMap.get(p.id)?.max_streak_date : undefined,
          maxAttendanceStreakDate: streakPeriodMap.get(p.friendly_name)?.end_date,
          recentGames: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          recentWins: recentWinRateMap.get(p.id)?.recent_wins,
          recentDraws: recentWinRateMap.get(p.id)?.recent_draws,
          recentLosses: recentWinRateMap.get(p.id)?.recent_losses,
          recentWinRate: recentWinRateMap.get(p.id)?.recent_win_rate
        })) || [];

        // Combine the lists, preferring win rate data when available
        const allPlayers = [...playersWithCaps];
        transformedPlayerStats.forEach(p => {
          const index = allPlayers.findIndex(ap => ap.id === p.id);
          if (index >= 0) {
            allPlayers[index] = {...allPlayers[index], ...p};
          } else {
            allPlayers.push(p);
          }
        });

        // Fetch team color frequency stats
        const { data: teamColorStats, error: teamColorError } = await supabase
          .rpc('get_player_team_colors', { 
            target_year: year || null 
          });

        if (teamColorError) throw teamColorError;

        // Transform team color stats
        const transformedTeamColorStats = teamColorStats?.map((p) => ({
          id: p.id,
          friendlyName: p.friendly_name,
          team: p.team,
          teamFrequency: Number(p.team_frequency),
          caps: Number(p.caps)
        })) || [];

        // Fetch best buddies
        const { data: bestBuddies, error: bestBuddiesError } = await supabase
          .rpc('get_best_buddies', {
            target_year: year || null
          });

        if (bestBuddiesError) {
          console.error('Error fetching best buddies:', bestBuddiesError);
          throw bestBuddiesError;
        }

        const transformedBuddies = bestBuddies?.map((buddy) => ({
          id: buddy.id,
          friendlyName: buddy.friendly_name,
          buddyId: buddy.buddy_id,
          buddyFriendlyName: buddy.buddy_friendly_name,
          gamesTogether: Number(buddy.games_together)
        })) || [];

        // Process and set stats
        setStats({
          luckyBibColor: {
            color: (colorStats?.[0]?.winning_color || 'blue') as 'orange' | 'blue',
            winRate: Number(colorStats?.[0]?.win_rate || 0) * 100
          },
          topAttendanceStreaks: (() => {
            const sorted = allPlayers
              .filter((p: PlayerStats) => p.maxStreak > 0)
              .sort((a: PlayerStats, b: PlayerStats) => b.maxStreak - a.maxStreak);
            return sorted.slice(0, 10);
          })(),
          currentStreaks: (() => {
            // Only show current streaks for ALL TIME or latest year
            if (year !== undefined && availableYears && year !== Math.max(...availableYears)) {
              return [];
            }
            
            // Filter out players with no current streak
            const sorted = allPlayers
              .filter((p: PlayerStats) => p.currentStreak > 0)
              .sort((a: PlayerStats, b: PlayerStats) => {
                // First sort by current streak
                const streakDiff = b.currentStreak - a.currentStreak;
                if (streakDiff !== 0) return streakDiff;
                // If streaks are equal, sort by caps as a tiebreaker
                return b.caps - a.caps;
              });

            return sorted.slice(0, 10);
          })(),
          topWinStreaks: (() => {
            const sorted = allPlayers
              .filter((p: PlayerStats) => p.maxWinStreak > 0)
              .sort((a: PlayerStats, b: PlayerStats) => b.maxWinStreak - a.maxWinStreak);
            return sorted.slice(0, 10);
          })(),
          currentWinStreaks: (() => {
            // Only show current streaks for ALL TIME or latest year
            if (year !== undefined && availableYears && year !== Math.max(...availableYears)) {
              return [];
            }
            
            // Filter out players with no current streak
            const sorted = allPlayers
              .filter((p: PlayerStats) => p.currentWinStreak > 0)
              .sort((a: PlayerStats, b: PlayerStats) => {
                // First sort by current streak
                const streakDiff = b.currentWinStreak - a.currentWinStreak;
                if (streakDiff !== 0) return streakDiff;
                // If streaks are equal, sort by caps as a tiebreaker
                return b.caps - a.caps;
              });

            return sorted.slice(0, 10);
          })(),
          topUnbeatenStreaks: (() => {
            const sorted = allPlayers
              .filter((p: PlayerStats) => p.maxUnbeatenStreak > 0)
              .sort((a: PlayerStats, b: PlayerStats) => b.maxUnbeatenStreak - a.maxUnbeatenStreak);
            return sorted.slice(0, 10);
          })(),
          currentUnbeatenStreaks: (() => {
            // Only show current streaks for ALL TIME or latest year
            if (year !== undefined && availableYears && year !== Math.max(...availableYears)) {
              return [];
            }
            
            // Filter out players with no current streak
            const sorted = allPlayers
              .filter((p: PlayerStats) => p.currentUnbeatenStreak > 0)
              .sort((a: PlayerStats, b: PlayerStats) => {
                // First sort by current streak
                const streakDiff = b.currentUnbeatenStreak - a.currentUnbeatenStreak;
                if (streakDiff !== 0) return streakDiff;
                // If streaks are equal, sort by caps as a tiebreaker
                return b.caps - a.caps;
              });

            return sorted.slice(0, 10);
          })(),
          mostCaps: (() => {
            const sorted = allPlayers
              .sort((a, b) => b.caps - a.caps);
            const threshold = sorted[2]?.caps || 0;
            return sorted.filter(p => p.caps >= threshold);
          })(),
          bestWinRates: (() => {
            const eligible = transformedPlayerStats
              .filter(p => p.caps >= 10)
              .sort((a, b) => b.winRate - a.winRate);
            const threshold = eligible[2]?.winRate || 0;
            return eligible.filter(p => p.winRate >= threshold);
          })(),
          teamColorFrequency: {
            blue: (() => {
              const sorted = transformedTeamColorStats
                .filter(p => p.team === 'blue')
                .sort((a, b) => b.teamFrequency - a.teamFrequency);
              const threshold = sorted[2]?.teamFrequency || 0;
              return sorted.filter(p => p.teamFrequency >= threshold);
            })(),
            orange: (() => {
              const sorted = transformedTeamColorStats
                .filter(p => p.team === 'orange')
                .sort((a, b) => b.teamFrequency - a.teamFrequency);
              const threshold = sorted[2]?.teamFrequency || 0;
              return sorted.filter(p => p.teamFrequency >= threshold);
            })()
          },
          bestBuddies: transformedBuddies.sort((a, b) => b.gamesTogether - a.gamesTogether),
          // Transform goal differential data
          goalDifferentials: goalDifferentials?.map((player: any) => ({
            id: player.id,
            friendlyName: player.friendly_name,
            caps: Number(player.caps),
            goalsFor: Number(player.goals_for),
            goalsAgainst: Number(player.goals_against),
            goalDifferential: Number(player.goal_differential)
          })) || [],
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch stats'
        }));
      }
    };

    fetchStats();
  }, [year]);

  return stats;
};
