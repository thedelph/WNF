import { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supabase';

export interface PlayerStats {
  id: string;
  friendlyName: string;
  caps: number;
  winRate: number;
  recentWinRate?: number;
  currentStreak?: number;
  maxStreak?: number;
  currentWinStreak: number;
  maxWinStreak: number;
  currentUnbeatenStreak: number;
  maxUnbeatenStreak: number;
  maxAttendanceStreakDate?: string;
  maxUnbeatenStreakDate?: string;
  recentGames: number;
  wins?: number;
  draws?: number;
  losses?: number;
  recentWins?: number;
  recentDraws?: number;
  recentLosses?: number;
};

// Define team color stats type
type TeamColorStats = {
  id: string;
  friendlyName: string;
  team: string;
  teamFrequency: number;
  caps: number;
};

// Define best buddies type
type BuddyStats = {
  id: string;
  friendlyName: string;
  buddyId: string;
  buddyFriendlyName: string;
  gamesTogether: number;
};

// Define player goal stats type
type GoalDifferentialStats = {
  id: string;
  friendlyName: string;
  caps: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
};

// Define comprehensive player stats type
type ComprehensivePlayerStats = {
  id: string;
  friendlyName: string;
  xp: number;
  caps: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
  winRate: number | null;
  wins: number;
  draws: number;
  losses: number;
  currentWinStreak: number;
  maxWinStreak: number;
  currentUnbeatenStreak: number;
  maxUnbeatenStreak: number;
  blueTeamPercentage: number | null;
  orangeTeamPercentage: number | null;
};

export interface Stats {
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
  bestBuddies: BuddyStats[];
  topWinStreaks: PlayerStats[];
  currentWinStreaks: PlayerStats[];
  topUnbeatenStreaks: PlayerStats[];
  currentUnbeatenStreaks: PlayerStats[];
  goalDifferentials: GoalDifferentialStats[];
  comprehensiveStats: ComprehensivePlayerStats[];
  loading: boolean;
  error: string | null;
}

export const useStats = (year?: number, availableYears?: number[]) => {
  // Track if comprehensive stats have been loaded directly
  const directFetchRef = useRef(false);
  // Preserve the last successful stats
  const lastSuccessfulStatsRef = useRef<ComprehensivePlayerStats[]>([]);
  
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
    goalDifferentials: [], 
    comprehensiveStats: [], 
    loading: true,
    error: null,
  });

  // Main effect for loading general stats (without overriding comprehensive stats)
  useEffect(() => {
    // Only run this if we haven't directly loaded comprehensive stats
    if (directFetchRef.current) {
      console.log('Using direct fetch data, skipping automatic comprehensive stats loading');
      return;
    }
    
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
        
        // Get goal differentials
        const { data: goalDifferentials, error: goalDiffError } = await supabase
          .rpc('get_player_goal_differentials', { 
            target_year: year || null 
          });

        if (goalDiffError) throw goalDiffError;
        
        // Get all players for comprehensive stats
        const { data: playersList, error: allPlayersError } = await supabase
          .from('players')
          .select('id, friendly_name')
          .order('friendly_name');
          
        if (allPlayersError) throw allPlayersError;

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
          topWinStreaks: getPlayerStatsByMaxWinStreak(allPlayers).slice(0, 10),
          currentWinStreaks: getPlayerStatsByCurrentWinStreak(allPlayers).slice(0, 10),
          topUnbeatenStreaks: getPlayerStatsByMaxUnbeatenStreak(allPlayers).slice(0, 10),
          currentUnbeatenStreaks: getPlayerStatsByCurrentUnbeatenStreak(allPlayers).slice(0, 10),
          mostCaps: getPlayerStatsByCaps(allPlayers).filter((p: PlayerStats) => p.caps >= (getPlayerStatsByCaps(allPlayers)[2]?.caps || 0)),
          // Get top 10 players by win rate
          bestWinRates: getPlayerStatsByWinRate(transformedPlayerStats).slice(0, 10),
          teamColorFrequency: {
            blue: transformedTeamColorStats.filter((p: TeamColorStats) => p.team === 'blue').sort((a: TeamColorStats, b: TeamColorStats) => b.teamFrequency - a.teamFrequency).filter((p: TeamColorStats) => p.teamFrequency >= (transformedTeamColorStats.filter((p: TeamColorStats) => p.team === 'blue').sort((a: TeamColorStats, b: TeamColorStats) => b.teamFrequency - a.teamFrequency)[2]?.teamFrequency || 0)),
            orange: transformedTeamColorStats.filter((p: TeamColorStats) => p.team === 'orange').sort((a: TeamColorStats, b: TeamColorStats) => b.teamFrequency - a.teamFrequency).filter((p: TeamColorStats) => p.teamFrequency >= (transformedTeamColorStats.filter((p: TeamColorStats) => p.team === 'orange').sort((a: TeamColorStats, b: TeamColorStats) => b.teamFrequency - a.teamFrequency)[2]?.teamFrequency || 0))
          },
          bestBuddies: transformedBuddies.sort((a: BuddyStats, b: BuddyStats) => b.gamesTogether - a.gamesTogether),
          // Transform goal differential data
          goalDifferentials: goalDifferentials?.map((player: any) => ({
            id: player.id,
            friendlyName: player.friendly_name,
            caps: Number(player.caps),
            goalsFor: Number(player.goals_for),
            goalsAgainst: Number(player.goals_against),
            goalDifferential: Number(player.goal_differential)
          })) || [],
          
          // Generate comprehensive player stats only if not already loaded directly
          comprehensiveStats: directFetchRef.current
            ? (lastSuccessfulStatsRef.current.length > 0 ? lastSuccessfulStatsRef.current : stats.comprehensiveStats) // Use preserved stats if available
            : generateComprehensivePlayerStats(
                playersList || [],
                transformedPlayerStats,
                goalDifferentials || [],
                transformedTeamColorStats
              ),
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

  /**
   * Generate comprehensive player statistics by combining data from multiple sources
   * 
   * @param allPlayers - Base player list
   * @param playerStats - Player stats with win rates and streaks
   * @param goalDifferentials - Player goal differentials
   * @param teamColorStats - Team color frequency stats
   * @returns Array of comprehensive player stats
   */
  const generateComprehensivePlayerStats = (
    allPlayers: any[],
    playerStats: PlayerStats[],
    goalDifferentials: any[],
    teamColorStats: TeamColorStats[]
  ): ComprehensivePlayerStats[] => {
    // Create a map to store combined player data
    const playerMap = new Map<string, ComprehensivePlayerStats>();
    
    // Initialize with all players who have played at least one game
    const playersWithCaps = playerStats.filter(p => p.caps > 0);
    
    // Add all players with caps
    playersWithCaps.forEach(player => {
      playerMap.set(player.id, {
        id: player.id,
        friendlyName: player.friendlyName,
        xp: player.xp || 0,
        caps: player.caps,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifferential: 0,
        winRate: player.winRate,
        wins: player.wins || 0,
        draws: player.draws || 0,
        losses: player.losses || 0,
        currentWinStreak: player.currentWinStreak || 0,
        maxWinStreak: player.maxWinStreak || 0,
        currentUnbeatenStreak: player.currentUnbeatenStreak || 0,
        maxUnbeatenStreak: player.maxUnbeatenStreak || 0,
        blueTeamPercentage: null,
        orangeTeamPercentage: null
      });
    });
    
    // Add goal differential data
    goalDifferentials.forEach((player: any) => {
      if (playerMap.has(player.id)) {
        const playerData = playerMap.get(player.id)!;
        playerData.goalsFor = Number(player.goals_for) || 0;
        playerData.goalsAgainst = Number(player.goals_against) || 0;
        playerData.goalDifferential = Number(player.goal_differential) || 0;
      } else if (player.caps > 0) {
        // Add player if they have caps but weren't in the initial list
        playerMap.set(player.id, {
          id: player.id,
          friendlyName: player.friendly_name,
          xp: 0, // We don't have XP data for this player
          caps: Number(player.caps),
          goalsFor: Number(player.goals_for) || 0,
          goalsAgainst: Number(player.goals_against) || 0,
          goalDifferential: Number(player.goal_differential) || 0,
          winRate: null,
          wins: 0,
          draws: 0,
          losses: 0,
          currentWinStreak: 0,
          maxWinStreak: 0,
          currentUnbeatenStreak: 0,
          maxUnbeatenStreak: 0,
          blueTeamPercentage: null,
          orangeTeamPercentage: null
        });
      }
    });
    
    // Add team color data
    const blueTeamStats = teamColorStats.filter(p => p.team === 'blue');
    const orangeTeamStats = teamColorStats.filter(p => p.team === 'orange');
    
    blueTeamStats.forEach(player => {
      if (playerMap.has(player.id)) {
        const playerData = playerMap.get(player.id)!;
        playerData.blueTeamPercentage = player.teamFrequency * 100;
      }
    });
    
    orangeTeamStats.forEach(player => {
      if (playerMap.has(player.id)) {
        const playerData = playerMap.get(player.id)!;
        playerData.orangeTeamPercentage = player.teamFrequency * 100;
      }
    });
    
    // Convert to array and sort by XP (descending)
    return Array.from(playerMap.values())
      .sort((a, b) => b.xp - a.xp);
  };

  // Get player stats sorted by max unbeaten streak
  const getPlayerStatsByMaxUnbeatenStreak = (players: PlayerStats[]) => {
    return [...players].sort((a, b) => (b.maxUnbeatenStreak || 0) - (a.maxUnbeatenStreak || 0));
  };

  // Get player stats sorted by current unbeaten streak
  const getPlayerStatsByCurrentUnbeatenStreak = (players: PlayerStats[]) => {
    return [...players].sort((a, b) => (b.currentUnbeatenStreak || 0) - (a.currentUnbeatenStreak || 0));
  };

  // Get player stats sorted by max win streak
  const getPlayerStatsByMaxWinStreak = (players: PlayerStats[]) => {
    return [...players].sort((a, b) => (b.maxWinStreak || 0) - (a.maxWinStreak || 0));
  };

  // Get player stats sorted by win rate
  const getPlayerStatsByWinRate = (players: PlayerStats[]) => {
    return [...players].sort((a, b) => (b.winRate || 0) - (a.winRate || 0));
  };

  // Get player stats sorted by current win streak
  const getPlayerStatsByCurrentWinStreak = (players: PlayerStats[]) => {
    return [...players].sort((a, b) => (b.currentWinStreak || 0) - (a.currentWinStreak || 0));
  };

  // Get player stats sorted by caps (used for XP calculation)
  const getPlayerStatsByCaps = (players: PlayerStats[]) => {
    return [...players].sort((a, b) => b.caps - a.caps);
  };

  /**
   * Get comprehensive player stats directly from the database
   * This ensures we get all players, not just those in award cards
   * This is the preferred method for loading comprehensive stats
   */
  const fetchComprehensivePlayerStats = async (year: string | number) => {
    // Mark that we're doing a direct fetch to prevent other effects from overriding our data
    directFetchRef.current = true;
    
    // If we already have successful stats, keep using them while loading
    if (lastSuccessfulStatsRef.current.length > 0) {
      // Pre-update with existing data to avoid flicker
      setStats(prevStats => ({
        ...prevStats,
        comprehensiveStats: lastSuccessfulStatsRef.current,
        loading: true
      }));
    }
    try {
      // Set loading state without clearing previous data
      // This prevents the flash of N/A values
      setStats(prevStats => ({ 
        ...prevStats, 
        loading: true,
        // Keep the previous comprehensive stats until new data is ready
      }));
      console.log('Fetching comprehensive player stats for year:', year);

      // Fetch comprehensive player stats directly from database function
      const { data: playerStats, error: playerStatsError } = await supabase
        .rpc('get_comprehensive_player_stats', { 
          target_year: year === 'all' ? null : Number(year) || null 
        });

      if (playerStatsError) {
        console.error('Error fetching comprehensive player stats:', playerStatsError);
        throw playerStatsError;
      }
      
      console.log('Comprehensive player stats fetched:', playerStats?.length || 0, 'players');

      // Process the data into the format we need
      console.log('Processing comprehensive player stats with XP values');
      const allStats = playerStats?.map((player: any) => {
        return {
          id: player.id,
          friendlyName: player.friendly_name,
          caps: player.caps || 0,
          // Ensure XP is always a number and never undefined
          xp: Number(player.xp) || 0,
          winRate: player.win_rate || 0,
          wins: player.wins || 0,
          draws: player.draws || 0,
          losses: player.losses || 0,
          goalsFor: player.goals_for || 0,
          goalsAgainst: player.goals_against || 0,
          goalDifferential: player.goal_differential || 0,
          currentWinStreak: player.current_win_streak || 0,
          maxWinStreak: player.max_win_streak || 0,
          currentUnbeatenStreak: player.current_unbeaten_streak || 0,
          maxUnbeatenStreak: player.max_unbeaten_streak || 0,
          // For team percentages, use null if the value is 0 (no games on that team)
          // This ensures the frontend displays the data correctly
          blueTeamPercentage: player.blue_team_percentage || null,
          orangeTeamPercentage: player.orange_team_percentage || null
        };
      }) || [];

      // Sort by caps by default
      const sortedStats = [...allStats].sort(
        (a: ComprehensivePlayerStats, b: ComprehensivePlayerStats) => b.caps - a.caps
      );

      // Preserve the successful stats for future use
      if (sortedStats.length > 0) {
        console.log(`Preserving ${sortedStats.length} player stats to prevent data loss`);
        lastSuccessfulStatsRef.current = sortedStats;
      }

      setStats(prevStats => ({
        ...prevStats,
        comprehensiveStats: sortedStats,
        loading: false
      }));
      
      return sortedStats;
    } catch (error) {
      console.error('Error fetching comprehensive player stats:', error);
      setStats(prevStats => ({
        ...prevStats,
        error: 'Error fetching comprehensive player stats',
        loading: false
      }));
      return [];
    }
  };

  return {
    ...stats,
    fetchComprehensivePlayerStats
  };
};
