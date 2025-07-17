import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { Game, TeamAssignment } from './types';
import { toast } from 'react-toastify';
import { balanceTeams } from '../../../utils/teamBalancing';

/**
 * Custom hook to handle team balancing logic and data fetching
 * Separates business logic from UI components
 */
export const useTeamBalancing = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const now = new Date().toISOString();
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*, venues(name)')
        .gte('date', now)
        .order('date')
        .limit(1);

      if (gamesError) {
        throw gamesError;
      }

      if (!gamesData || gamesData.length === 0) {
        setError('No upcoming games found. Please check back later when games are scheduled.');
        setGame(null);
        return;
      }

      const nextGame = gamesData[0];
      setGame(nextGame);

      // Always fetch fresh player data first
      const { data: registrations, error: registrationError } = await supabase
        .from('game_registrations')
        .select(`
          *,
          status,
          players!game_registrations_player_id_fkey (
            id,
            friendly_name,
            attack_rating,
            defense_rating,
            game_iq,
            average_game_iq_rating,
            caps
          )
        `)
        .eq('game_id', nextGame.id)
        .eq('status', 'selected');

      if (registrationError) {
        console.error('Error fetching registrations:', registrationError);
        toast.error('Error loading player registrations');
        return;
      }

      if (!registrations || registrations.length === 0) {
        setError('No players have been selected for this game yet.');
        return;
      }

      // Fetch player statistics including win rates and goal differentials
      const playerIds = registrations.map(reg => reg.players.id);
      
      // Initialize maps to store player stats
      let winRateMap = new Map<string, number | null>();
      let goalDiffMap = new Map<string, number | null>();
      let overallWinRateMap = new Map<string, number | null>();
      let overallGoalDiffMap = new Map<string, number | null>();
      let gamesPlayedMap = new Map<string, number | null>();
      
      try {
        // Fetch recent stats (last 10 games)
        console.log('Fetching recent player stats from get_player_recent_win_rates');
        const [recentWinRates, recentGoalDiffs] = await Promise.all([
          supabase.rpc('get_player_recent_win_rates', { games_threshold: 10 }),
          supabase.rpc('get_player_recent_goal_differentials', { games_threshold: 10 })
        ]);

        if (recentWinRates.error) {
          console.error('Error fetching recent win rates:', recentWinRates.error);
          throw recentWinRates.error;
        }
        
        if (recentGoalDiffs.error) {
          console.error('Error fetching recent goal diffs:', recentGoalDiffs.error);
          throw recentGoalDiffs.error;
        }

        // Process recent win rates
        if (recentWinRates.data) {
          recentWinRates.data.forEach((player: any) => {
            if (player.games_played >= 10) {
              winRateMap.set(player.id, player.recent_win_rate);
            } else {
              winRateMap.set(player.id, null);
            }
            gamesPlayedMap.set(player.id, player.games_played);
          });
        }

        // Process recent goal differentials
        if (recentGoalDiffs.data) {
          recentGoalDiffs.data.forEach((player: any) => {
            if (player.games_played >= 10) {
              goalDiffMap.set(player.id, player.recent_goal_differential);
            } else {
              goalDiffMap.set(player.id, null);
            }
          });
        }

        // Fetch overall stats (career)
        console.log('Fetching overall player stats');
        const [overallWinRates, overallGoalDiffs] = await Promise.all([
          supabase.rpc('get_player_win_rates'),
          supabase.rpc('get_player_goal_differentials')
        ]);

        if (overallWinRates.error) {
          console.error('Error fetching overall win rates:', overallWinRates.error);
          throw overallWinRates.error;
        }
        
        if (overallGoalDiffs.error) {
          console.error('Error fetching overall goal diffs:', overallGoalDiffs.error);
          throw overallGoalDiffs.error;
        }

        // Process overall win rates
        if (overallWinRates.data) {
          overallWinRates.data.forEach((player: any) => {
            if (player.total_games > 0) {
              overallWinRateMap.set(player.id, parseFloat(player.win_rate) / 100); // Convert percentage to decimal
            } else {
              overallWinRateMap.set(player.id, null);
            }
            // Update total games if not already set
            if (!gamesPlayedMap.has(player.id)) {
              gamesPlayedMap.set(player.id, player.total_games);
            }
          });
        }

        // Process overall goal differentials
        if (overallGoalDiffs.data) {
          overallGoalDiffs.data.forEach((player: any) => {
            if (player.caps > 0) {
              overallGoalDiffMap.set(player.id, player.goal_differential);
            } else {
              overallGoalDiffMap.set(player.id, null);
            }
          });
        }

        // Log sample data for debugging
        const samplePlayer = playerIds[0];
        console.log(`Sample player stats for ${samplePlayer}:`, {
          recentWinRate: winRateMap.get(samplePlayer),
          recentGoalDiff: goalDiffMap.get(samplePlayer),
          overallWinRate: overallWinRateMap.get(samplePlayer),
          overallGoalDiff: overallGoalDiffMap.get(samplePlayer),
          totalGames: gamesPlayedMap.get(samplePlayer)
        });

      } catch (err) {
        console.error('Error processing player stats:', err);
        // Set default values for all players if we couldn't get real data
        playerIds.forEach(id => {
          winRateMap.set(id, null);
          goalDiffMap.set(id, null);
          overallWinRateMap.set(id, null);
          overallGoalDiffMap.set(id, null);
          gamesPlayedMap.set(id, 0);
        });
      }

      // Debug log for Lewis's fresh data
      const lewisData = registrations.find(reg => reg.players.friendly_name.toLowerCase().includes('lewis'));
      if (lewisData) {
        console.log('Fresh Lewis data from database:', {
          id: lewisData.players.id,
          name: lewisData.players.friendly_name,
          attack: lewisData.players.attack_rating,
          defense: lewisData.players.defense_rating,
          caps: lewisData.players.caps,
          winRate: winRateMap.get(lewisData.players.id) || 'N/A'
        });
      }

      // Get existing team assignments if any
      const { data: assignmentData } = await supabase
        .from('balanced_team_assignments')
        .select('*')
        .eq('game_id', nextGame.id)
        .maybeSingle();

      // Create new assignments using fresh player data
      const playerRatings = registrations.map(reg => {
        const playerId = reg.players.id;
        const caps = reg.players.caps || 0; // Default to 0 if null
        
        // Get win rate and goal differential from our maps
        const winRate = winRateMap.get(playerId);
        const goalDifferential = goalDiffMap.get(playerId);
        const overallWinRate = overallWinRateMap.get(playerId);
        const overallGoalDifferential = overallGoalDiffMap.get(playerId);
        const gamesPlayed = gamesPlayedMap.get(playerId) || caps || 0;
        
        // Debug log for this player's stats
        console.log(`Player ${reg.players.friendly_name} stats:`, {
          id: playerId,
          winRate,
          goalDifferential,
          overallWinRate,
          overallGoalDifferential,
          gamesPlayed
        });
        
        return {
          player_id: playerId,
          friendly_name: reg.players.friendly_name,
          attack_rating: reg.players.attack_rating || 5,
          defense_rating: reg.players.defense_rating || 5,
          game_iq_rating: reg.players.game_iq ?? reg.players.average_game_iq_rating ?? 5,
          win_rate: winRate, 
          goal_differential: goalDifferential,
          overall_win_rate: overallWinRate,
          overall_goal_differential: overallGoalDifferential,
          total_games: gamesPlayed
        };
      });

      let finalAssignments: TeamAssignment[] = [];
      
      if (assignmentData && assignmentData.team_assignments && assignmentData.team_assignments.teams) {
        // Use existing team assignments
        const existingAssignments = assignmentData.team_assignments.teams;
        
        finalAssignments = playerRatings.map(player => {
          // Find existing assignment for this player
          const existingAssignment = existingAssignments.find((a: any) => a.player_id === player.player_id);
          
          if (existingAssignment) {
            // Use existing team assignment but with fresh player data
            return {
              player_id: player.player_id,
              friendly_name: player.friendly_name,
              attack_rating: player.attack_rating,
              defense_rating: player.defense_rating,
              game_iq_rating: player.game_iq_rating ?? 5,
              win_rate: player.win_rate,
              goal_differential: player.goal_differential,
              overall_win_rate: player.overall_win_rate,
              overall_goal_differential: player.overall_goal_differential,
              total_games: player.total_games,
              team: existingAssignment.team as 'blue' | 'orange' | null
            };
          } else {
            // New player, no existing assignment
            return {
              player_id: player.player_id,
              friendly_name: player.friendly_name,
              attack_rating: player.attack_rating,
              defense_rating: player.defense_rating,
              game_iq_rating: player.game_iq_rating ?? 5,
              win_rate: player.win_rate,
              goal_differential: player.goal_differential,
              overall_win_rate: player.overall_win_rate,
              overall_goal_differential: player.overall_goal_differential,
              total_games: player.total_games,
              team: null
            };
          }
        });
      } else {
        // Create new balanced team assignments
        const balancedTeams = balanceTeams(playerRatings);
        finalAssignments = registrations.map((reg, index) => {
          // Use blueTeam property from the balanceTeams result
          const isBlue = index < balancedTeams.blueTeam.length;
          const gamesPlayed = gamesPlayedMap.get(reg.players.id) || reg.players.caps || 0;
          // Get win rate and goal differential from maps
          const winRate = winRateMap.get(reg.players.id);
          const goalDifferential = goalDiffMap.get(reg.players.id);
          const overallWinRate = overallWinRateMap.get(reg.players.id);
          const overallGoalDifferential = overallGoalDiffMap.get(reg.players.id);
          
          return {
            player_id: reg.players.id,
            friendly_name: reg.players.friendly_name,
            attack_rating: reg.players.attack_rating,
            defense_rating: reg.players.defense_rating,
            game_iq_rating: reg.players.game_iq ?? reg.players.average_game_iq_rating ?? 5,
            win_rate: winRate,
            goal_differential: goalDifferential,
            overall_win_rate: overallWinRate,
            overall_goal_differential: overallGoalDifferential,
            total_games: gamesPlayed,
            team: isBlue ? 'blue' : 'orange'
          };
        });
      }

      console.log('Setting final assignments:', finalAssignments);
      console.log('Sample final assignment:', finalAssignments[0]);
      setAssignments(finalAssignments);
    } catch (err: any) {
      setError(`Error loading data: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAssignments = (newAssignments: TeamAssignment[]) => {
    setAssignments(newAssignments);
    setHasUnsavedChanges(true);
  };

  const saveTeamAssignments = async () => {
    // Implementation preserved from original file
    if (!game) return;
    
    try {
      setIsLoading(true);
      
      // Calculate team stats for saving
      const blueTeam = assignments.filter(p => p.team === 'blue');
      const orangeTeam = assignments.filter(p => p.team === 'orange');
      
      const blueStats = {
        avgAttack: blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / blueTeam.length,
        avgDefense: blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / blueTeam.length,
        avgGameIq: blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / blueTeam.length,
        totalAttack: blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0),
        totalDefense: blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0),
        totalGameIq: blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0),
        playerCount: blueTeam.length,
        avgRating: blueTeam.reduce((sum, p) => sum + ((p.attack_rating ?? 0) + (p.defense_rating ?? 0) + (p.game_iq_rating ?? 0))/3, 0) / blueTeam.length,
        totalRating: blueTeam.reduce((sum, p) => sum + ((p.attack_rating ?? 0) + (p.defense_rating ?? 0) + (p.game_iq_rating ?? 0))/3, 0)
      };
      
      const orangeStats = {
        avgAttack: orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / orangeTeam.length,
        avgDefense: orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / orangeTeam.length,
        avgGameIq: orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / orangeTeam.length,
        totalAttack: orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0),
        totalDefense: orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0),
        totalGameIq: orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0),
        playerCount: orangeTeam.length,
        avgRating: orangeTeam.reduce((sum, p) => sum + ((p.attack_rating ?? 0) + (p.defense_rating ?? 0) + (p.game_iq_rating ?? 0))/3, 0) / orangeTeam.length,
        totalRating: orangeTeam.reduce((sum, p) => sum + ((p.attack_rating ?? 0) + (p.defense_rating ?? 0) + (p.game_iq_rating ?? 0))/3, 0)
      };
      
      const teamAssignmentData = {
        teams: assignments,
        stats: {
          blue: blueStats,
          orange: orangeStats
        },
        selection_metadata: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          meritSlots: 0,
          randomSlots: 0,
          selectionNotes: []
        }
      };
      
      const { error } = await supabase
        .from('balanced_team_assignments')
        .upsert({
          game_id: game.id,
          team_assignments: teamAssignmentData
        });
        
      if (error) {
        console.error('Error saving team assignments:', error);
        toast.error('Failed to save team assignments');
        return;
      }
      
      toast.success('Team assignments saved successfully');
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error in saveTeamAssignments:', err);
      toast.error('An error occurred while saving team assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const autoBalanceTeams = () => {
    if (!assignments || assignments.length === 0) return;
    
    const playerRatings = assignments.map(player => ({
      player_id: player.player_id,
      attack_rating: player.attack_rating,
      defense_rating: player.defense_rating,
      game_iq_rating: player.game_iq_rating,
      win_rate: player.win_rate || 50,
      total_games: player.total_games
    }));
    
    const balancedTeams = balanceTeams(playerRatings);
    
    const newAssignments = assignments.map(player => {
      // Use blueTeam property from the balanceTeams result
      const isBlue = balancedTeams.blueTeam.some((playerId: string) => playerId === player.player_id);
      return {
        ...player,
        team: isBlue ? 'blue' : 'orange' as 'blue' | 'orange'
      };
    });
    
    updateAssignments(newAssignments);
    toast.success('Teams auto-balanced based on player ratings');
  };

  return {
    isLoading,
    error,
    game,
    assignments,
    hasUnsavedChanges,
    updateAssignments,
    saveTeamAssignments,
    autoBalanceTeams,
    fetchData
  };
};
