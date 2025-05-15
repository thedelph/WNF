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
      let gamesPlayedMap = new Map<string, number | null>();
      
      try {
        // Fetch player stats using our custom function
        console.log('Fetching player stats from get_player_game_stats RPC function');
        const { data: playerStats, error: statsError } = await supabase
          .rpc('get_player_game_stats');

        if (statsError) {
          console.error('Error fetching player stats:', statsError);
          throw statsError;
        }

        // Log the returned data to help with debugging
        console.log('Player stats data:', playerStats);

        // Create lookup maps from the returned data
        console.log('Player stats returned from RPC:', playerStats);
        if (playerStats && playerStats.length > 0) {
          playerStats.forEach((player: { player_id: string; win_rate: number; goal_differential: number; games_played: number }) => {
            // Store the actual values from the database
            // Only set values for players with games played to avoid 0% win rates for everyone
            if (player.games_played > 0) {
              winRateMap.set(player.player_id, player.win_rate);
              goalDiffMap.set(player.player_id, player.goal_differential);
            } else {
              // For players with no games, set null to show N/A in the UI
              winRateMap.set(player.player_id, null);
              goalDiffMap.set(player.player_id, null);
            }
            
            // Always set games played count
            gamesPlayedMap.set(player.player_id, player.games_played);
            
            // Debug log for all players
            console.log(`Player ${player.player_id} stats: win_rate=${player.win_rate}, goal_diff=${player.goal_differential}, games=${player.games_played}`);
            // Debug log for specific players
            if (playerIds.includes(player.player_id)) {
              console.log(`Stats for player ${player.player_id}:`, {
                winRate: player.win_rate,
                goalDiff: player.goal_differential,
                gamesPlayed: player.games_played,
                hasGames: player.games_played > 0
              });
            }
          });
        } else {
          console.warn('No player stats returned from database');
          throw new Error('No player stats data');
        }
      } catch (err) {
        console.error('Error processing player stats:', err);
        // Set default values for all players if we couldn't get real data
        playerIds.forEach(id => {
          winRateMap.set(id, 0);
          goalDiffMap.set(id, 0);
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
        const gamesPlayed = gamesPlayedMap.get(playerId) || caps || 0;
        
        // Debug log for this player's stats
        console.log(`Player ${reg.players.friendly_name} stats:`, {
          id: playerId,
          winRate,
          goalDifferential,
          gamesPlayed
        });
        
        return {
          player_id: playerId,
          friendly_name: reg.players.friendly_name,
          attack_rating: reg.players.attack_rating || 5,
          defense_rating: reg.players.defense_rating || 5,
          win_rate: winRate, 
          goal_differential: goalDifferential,
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
              win_rate: player.win_rate,
              goal_differential: player.goal_differential,
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
              win_rate: player.win_rate,
              goal_differential: player.goal_differential,
              total_games: player.total_games,
              team: null
            };
          }
        });
      } else {
        // No existing assignments, all players start with null team
        finalAssignments = playerRatings.map(player => ({
          player_id: player.player_id,
          friendly_name: player.friendly_name,
          attack_rating: player.attack_rating,
          defense_rating: player.defense_rating,
          win_rate: player.win_rate,
          goal_differential: player.goal_differential,
          total_games: player.total_games,
          team: null
        }));
      }
      
      // Log the final assignments to verify data
      console.log('Final player assignments with stats:', finalAssignments);

      // Update existing assignments with fresh player data
      if (assignmentData?.team_assignments?.teams) {
        finalAssignments = assignmentData.team_assignments.teams.map((assignment: TeamAssignment) => {
          const freshPlayerData = registrations.find(reg => reg.players.id === assignment.player_id);
          const caps = freshPlayerData?.players.caps || 0; // Default to 0 if null
          // Set win_rate to null if player has played fewer than 10 games
          const winRate = caps >= 10 ? winRateMap.get(assignment.player_id) : null;
          const goalDifferential = goalDiffMap.get(assignment.player_id);
          const gamesPlayed = gamesPlayedMap.get(assignment.player_id) || caps || 0;
          
          return {
            ...assignment,
            friendly_name: freshPlayerData?.players.friendly_name,
            attack_rating: freshPlayerData?.players.attack_rating || assignment.attack_rating,
            defense_rating: freshPlayerData?.players.defense_rating || assignment.defense_rating,
            win_rate: winRate, // Pass null if less than 10 games
            goal_differential: goalDifferential,
            total_games: gamesPlayed
          };
        });
      } else {
        // Create new balanced team assignments
        const balancedTeams = balanceTeams(playerRatings);
        finalAssignments = registrations.map((reg, index) => {
          // Use blueTeam property from the balanceTeams result
          const isBlue = index < balancedTeams.blueTeam.length;
          const caps = reg.players.caps || 0;
          // Set win_rate to null if player has played fewer than 10 games
          const winRate = caps >= 10 ? winRateMap.get(reg.players.id) : null;
          
          return {
            player_id: reg.players.id,
            friendly_name: reg.players.friendly_name,
            attack_rating: reg.players.attack_rating,
            defense_rating: reg.players.defense_rating,
            win_rate: winRate, // Pass null if less than 10 games
            goal_differential: goalDiffMap.get(reg.players.id),
            total_games: caps,
            team: isBlue ? 'blue' : 'orange'
          };
        });
      }

      console.log('Setting final assignments:', finalAssignments);
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
        avgAttack: blueTeam.reduce((sum, p) => sum + p.attack_rating, 0) / blueTeam.length,
        avgDefense: blueTeam.reduce((sum, p) => sum + p.defense_rating, 0) / blueTeam.length,
        totalAttack: blueTeam.reduce((sum, p) => sum + p.attack_rating, 0),
        totalDefense: blueTeam.reduce((sum, p) => sum + p.defense_rating, 0),
        playerCount: blueTeam.length,
        avgRating: blueTeam.reduce((sum, p) => sum + (p.attack_rating + p.defense_rating)/2, 0) / blueTeam.length,
        totalRating: blueTeam.reduce((sum, p) => sum + (p.attack_rating + p.defense_rating)/2, 0)
      };
      
      const orangeStats = {
        avgAttack: orangeTeam.reduce((sum, p) => sum + p.attack_rating, 0) / orangeTeam.length,
        avgDefense: orangeTeam.reduce((sum, p) => sum + p.defense_rating, 0) / orangeTeam.length,
        totalAttack: orangeTeam.reduce((sum, p) => sum + p.attack_rating, 0),
        totalDefense: orangeTeam.reduce((sum, p) => sum + p.defense_rating, 0),
        playerCount: orangeTeam.length,
        avgRating: orangeTeam.reduce((sum, p) => sum + (p.attack_rating + p.defense_rating)/2, 0) / orangeTeam.length,
        totalRating: orangeTeam.reduce((sum, p) => sum + (p.attack_rating + p.defense_rating)/2, 0)
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
