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

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('balanced_team_assignments')
        .select('*')
        .eq('game_id', nextGame.id)
        .maybeSingle();

      console.log('Assignment data:', assignmentData);

      if (assignmentError) {
        console.error('Error fetching assignments:', assignmentError);
        toast.error('Error loading team assignments');
      }

      if (assignmentData?.team_assignments?.teams) {
        console.log('Setting teams:', assignmentData.team_assignments.teams);
        setAssignments(assignmentData.team_assignments.teams);
      } else {
        // Fetch all registered players if no assignments exist
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

        // Convert registrations to PlayerRating format for balanceTeams
        const playerRatings = registrations.map(reg => ({
          player_id: reg.players.id,
          attack_rating: reg.players.attack_rating || 5,
          defense_rating: reg.players.defense_rating || 5
        }));

        // Use the same balancing algorithm as team announcement
        const balancedTeams = balanceTeams(playerRatings);

        // Convert back to TeamAssignment format
        const assignments = registrations.map(reg => {
          const isBlue = balancedTeams.blueTeam.includes(reg.players.id);
          return {
            player_id: reg.players.id,
            friendly_name: reg.players.friendly_name,
            attack_rating: reg.players.attack_rating || 5,
            defense_rating: reg.players.defense_rating || 5,
            team: isBlue ? 'blue' : 'orange'
          };
        });

        setAssignments(assignments);
      }
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError('An error occurred while loading the data.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAssignments = async (newAssignments: TeamAssignment[]) => {
    if (!game) return;

    try {
      setAssignments(newAssignments);
      setHasUnsavedChanges(true);

      const teamAssignments = {
        teams: newAssignments,
        stats: {
          blue: {
            attack: newAssignments
              .filter(p => p.team === 'blue')
              .reduce((sum, p) => sum + p.attack_rating, 0),
            defense: newAssignments
              .filter(p => p.team === 'blue')
              .reduce((sum, p) => sum + p.defense_rating, 0),
            playerCount: newAssignments.filter(p => p.team === 'blue').length
          },
          orange: {
            attack: newAssignments
              .filter(p => p.team === 'orange')
              .reduce((sum, p) => sum + p.attack_rating, 0),
            defense: newAssignments
              .filter(p => p.team === 'orange')
              .reduce((sum, p) => sum + p.defense_rating, 0),
            playerCount: newAssignments.filter(p => p.team === 'orange').length
          }
        }
      };

      const { error: updateError } = await supabase
        .from('balanced_team_assignments')
        .upsert({
          game_id: game.id,
          team_assignments: teamAssignments
        });

      if (updateError) {
        throw updateError;
      }

      // Also update player registrations
      for (const team of ['blue', 'orange'] as const) {
        const teamPlayers = newAssignments
          .filter(p => p.team === team)
          .map(p => p.player_id);

        const { error: registrationError } = await supabase
          .from('game_registrations')
          .update({ team })
          .eq('game_id', game.id)
          .in('player_id', teamPlayers);

        if (registrationError) {
          throw registrationError;
        }
      }

      setHasUnsavedChanges(false);
      toast.success('Team assignments updated successfully');
    } catch (err) {
      console.error('Error updating assignments:', err);
      toast.error('Failed to update team assignments');
    }
  };

  return {
    isLoading,
    error,
    game,
    assignments,
    hasUnsavedChanges,
    updateAssignments,
  };
};
