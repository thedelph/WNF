import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

interface PlayerStats {
  id: string;
  friendlyName: string;
  caps: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  recentGames: number;
  wins: number;
  draws: number;
  losses: number;
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
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Add a timestamp to force fresh data
        const timestamp = new Date().getTime();
        
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

        // Fetch player caps (includes all games)
        const { data: playerCaps, error: capsError } = await supabase
          .rpc('get_player_caps', {
            target_year: year || null
          });

        if (capsError) throw capsError;

        // Fetch attendance streaks
        const { data: streakStats, error: streakError } = await supabase
          .rpc('get_player_attendance_streaks', { 
            target_year: year || null
          });

        if (streakError) throw streakError;

        // Create a map of player streaks
        const streakMap = new Map(
          streakStats?.map(s => [s.id, { 
            current_streak: Number(s.current_streak), 
            max_streak: Number(s.max_streak) 
          }]) || []
        );

        // Create a map of player caps
        const capsMap = new Map(
          playerCaps?.map(p => [p.id, Number(p.total_games)])
        );

        // Transform player stats to match our interface
        const transformedPlayerStats = playerStats?.map(p => ({
          id: p.id,
          friendlyName: p.friendly_name,
          caps: capsMap.get(p.id) || Number(p.total_games),
          winRate: Number(p.win_rate),
          currentStreak: streakMap.get(p.id)?.current_streak || 0,
          maxStreak: streakMap.get(p.id)?.max_streak || 0,
          recentGames: 0,
          wins: Number(p.wins),
          draws: Number(p.draws),
          losses: Number(p.losses)
        })) || [];

        // Create a list of all players with caps
        const playersWithCaps = playerCaps?.map(p => ({
          id: p.id,
          friendlyName: p.friendly_name,
          caps: Number(p.total_games),
          winRate: 0,
          currentStreak: 0,
          maxStreak: 0,
          recentGames: 0,
          wins: 0,
          draws: 0,
          losses: 0
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
        const transformedTeamColorStats = teamColorStats?.map(p => ({
          id: p.id,
          friendlyName: p.friendly_name,
          team: p.team,
          teamFrequency: Number(p.team_frequency),
          caps: Number(p.caps)
        })) || [];

        // Fetch best buddies
        const getBestBuddies = async () => {
          const { data: bestBuddies, error: bestBuddiesError } = await supabase
            .rpc('get_best_buddies')
            .select('*');

          if (bestBuddiesError) {
            console.error('Error fetching best buddies:', bestBuddiesError);
            return [];
          }

          return bestBuddies?.map(buddy => ({
            id: buddy.id,
            friendlyName: buddy.friendly_name,
            buddyId: buddy.buddy_id,
            buddyFriendlyName: buddy.buddy_friendly_name,
            gamesTogether: buddy.games_together
          })) || [];
        };

        // Process and set stats
        const bestBuddies = await getBestBuddies();
        setStats({
          luckyBibColor: {
            color: (colorStats?.[0]?.winning_color || 'blue') as 'orange' | 'blue',
            winRate: Number(colorStats?.[0]?.win_rate || 0) * 100
          },
          topAttendanceStreaks: (() => {
            const sorted = allPlayers
              .filter(p => p.maxStreak > 0)
              .sort((a, b) => b.maxStreak - a.maxStreak);
            const threshold = sorted[2]?.maxStreak || 0;
            const result = sorted.filter(p => p.maxStreak >= threshold);
            return result;
          })(),
          currentStreaks: (() => {
            // Only show current streaks for ALL TIME or latest year
            if (year !== undefined && year !== Math.max(...availableYears)) {
              return [];
            }
            
            // Filter out players with no current streak
            const sorted = allPlayers
              .filter(p => p.currentStreak > 0)
              .sort((a, b) => {
                // First sort by current streak
                const streakDiff = b.currentStreak - a.currentStreak;
                if (streakDiff !== 0) return streakDiff;
                // If streaks are equal, sort by caps as a tiebreaker
                return b.caps - a.caps;
              });

            // Get the threshold from the third highest streak (if it exists)
            const threshold = sorted.length >= 3 ? sorted[2].currentStreak : 1;
            
            // Include all players that meet or exceed the threshold
            const result = sorted.filter(p => p.currentStreak >= threshold);
            
            return result;
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
          bestBuddies,
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
  }, [year, availableYears]);

  return stats;
};
