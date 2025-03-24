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
            defense_rating
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

      // Fetch recent win rates for all players
      const playerIds = registrations.map(reg => reg.players.id);
      const { data: winRateData, error: winRateError } = await supabase
        .rpc('get_player_recent_win_rates')
        .in('id', playerIds);

      if (winRateError) {
        console.error('Error fetching win rates:', winRateError);
        // Continue without win rates rather than failing completely
      }

      // Create win rate lookup map
      const winRateMap = new Map<string, number>();
      if (winRateData) {
        winRateData.forEach((player: { id: string; recent_win_rate: number | null }) => {
          winRateMap.set(player.id, player.recent_win_rate || 50);
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
      const playerRatings = registrations.map(reg => ({
        player_id: reg.players.id,
        attack_rating: reg.players.attack_rating || 5,
        defense_rating: reg.players.defense_rating || 5,
        win_rate: winRateMap.get(reg.players.id) || 50 // Add win rate data
      }));

      let finalAssignments;
      if (assignmentData?.team_assignments?.teams) {
        // Update existing assignments with fresh player data
        finalAssignments = assignmentData.team_assignments.teams.map((assignment: TeamAssignment) => {
          const freshPlayerData = registrations.find(reg => reg.players.id === assignment.player_id);
          return {
            ...assignment,
            friendly_name: freshPlayerData?.players.friendly_name,
            attack_rating: freshPlayerData?.players.attack_rating || assignment.attack_rating,
            defense_rating: freshPlayerData?.players.defense_rating || assignment.defense_rating,
            win_rate: winRateMap.get(assignment.player_id) || 50 // Add win rate data
          };
        });
      } else {
        // Create new balanced team assignments
        const balancedTeams = balanceTeams(playerRatings);
        finalAssignments = registrations.map((reg, index) => {
          // Use blueTeam property from the balanceTeams result
          const isBlue = index < balancedTeams.blueTeam.length;
          return {
            player_id: reg.players.id,
            friendly_name: reg.players.friendly_name,
            attack_rating: reg.players.attack_rating || 5,
            defense_rating: reg.players.defense_rating || 5,
            win_rate: winRateMap.get(reg.players.id) || 50, // Add win rate data
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
      win_rate: player.win_rate || 50
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
