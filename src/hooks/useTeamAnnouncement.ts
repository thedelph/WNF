import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabaseAdmin } from '../utils/supabase';
import { balanceTeams } from '../utils/teamBalancing';

interface UseTeamAnnouncementProps {
  game?: any;
  onGameUpdated: () => Promise<void>;
}

export const useTeamAnnouncement = (props?: UseTeamAnnouncementProps) => {
  const [isProcessingAnnouncement, setIsProcessingAnnouncement] = useState(false);
  const [hasAnnouncedTeams, setHasAnnouncedTeams] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (!props?.game) return;

    const checkAnnouncementTime = () => {
      const now = new Date();
      const announcementTime = new Date(props.game!.team_announcement_time);
      
      // Check if we need to process team announcement
      const shouldAnnounceTeams = 
        now > announcementTime && 
        props.game!.status === 'players_announced' &&
        !props.game!.teams_announced &&
        !isProcessingAnnouncement && 
        !hasAnnouncedTeams &&
        errorCount < MAX_RETRIES;

      if (shouldAnnounceTeams) {
        handleTeamAnnouncement();
      }
    };

    // Initial check
    checkAnnouncementTime();

    // Set up polling every 10 seconds
    const intervalId = setInterval(checkAnnouncementTime, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [props?.game, isProcessingAnnouncement, hasAnnouncedTeams, errorCount]);

  const handleTeamAnnouncement = async () => {
    if (!props?.game) return;

    setIsProcessingAnnouncement(true);
    
    try {
      const { id } = props.game;

      // Get selected players
      const { data: registrations, error: registrationsError } = await supabaseAdmin
        .from('game_registrations')
        .select(`
          id,
          players!game_registrations_player_id_fkey (
            id,
            friendly_name,
            attack_rating,
            defense_rating,
            win_rate
          )
        `)
        .eq('game_id', id)
        .eq('status', 'selected');

      if (registrationsError) throw registrationsError;

      if (!registrations || registrations.length === 0) {
        throw new Error('No selected players found');
      }

      // Convert registrations to PlayerRating format
      const playerRatings = registrations.map(reg => ({
        player_id: reg.players.id,
        attack_rating: reg.players.attack_rating || 0,
        defense_rating: reg.players.defense_rating || 0,
        win_rate: reg.players.win_rate || 50
      }));

      // Balance teams
      const teams = await balanceTeams(playerRatings);

      if (!teams) {
        throw new Error('Team balancing returned null');
      }

      if (!teams.blueTeam || !teams.orangeTeam) {
        throw new Error(`Invalid team structure: ${JSON.stringify(teams)}`);
      }

      // Transform the balanced teams back into the expected format
      const transformedPlayers = registrations.map(reg => {
        const isBlueTeam = teams.blueTeam.includes(reg.players.id);
        const isOrangeTeam = teams.orangeTeam.includes(reg.players.id);
        return {
          player: reg.players,
          selection_type: 'selected',
          team: isBlueTeam ? 'blue' : isOrangeTeam ? 'orange' : undefined
        };
      });

      // Update player registrations with team assignments
      for (const team of ['orange', 'blue'] as const) {
        const teamPlayers = team === 'orange' ? teams.orangeTeam : teams.blueTeam;
        if (teamPlayers && teamPlayers.length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('game_registrations')
            .update({ 
              team,
              status: 'selected'
            })
            .eq('game_id', id)
            .in('player_id', teamPlayers);

          if (updateError) throw updateError;
        }
      }

      // Get player details for team assignments
      const { data: playerDetails, error: playerError } = await supabaseAdmin
        .from('players')
        .select('id, friendly_name, attack_rating, defense_rating')
        .in('id', [...teams.blueTeam, ...teams.orangeTeam]);

      if (playerError) throw playerError;

      const playerMap = new Map(playerDetails.map(player => [player.id, player]));

      // Save balanced team assignments
      const teamAssignments = {
        teams: [
          ...teams.blueTeam.map(playerId => ({
            player_id: playerId,
            friendly_name: playerMap.get(playerId)?.friendly_name,
            attack_rating: playerMap.get(playerId)?.attack_rating,
            defense_rating: playerMap.get(playerId)?.defense_rating,
            team: 'blue'
          })),
          ...teams.orangeTeam.map(playerId => ({
            player_id: playerId,
            friendly_name: playerMap.get(playerId)?.friendly_name,
            attack_rating: playerMap.get(playerId)?.attack_rating,
            defense_rating: playerMap.get(playerId)?.defense_rating,
            team: 'orange'
          }))
        ],
        stats: teams.stats
      };

      const { error: balancedTeamError } = await supabaseAdmin
        .from('balanced_team_assignments')
        .upsert({
          game_id: id,
          team_assignments: teamAssignments,
          total_differential: teams.difference,
          attack_differential: teams.stats.blue.attack - teams.stats.orange.attack,
          defense_differential: teams.stats.blue.defense - teams.stats.orange.defense
        });

      if (balancedTeamError) throw balancedTeamError;

      const { error: statusError } = await supabaseAdmin
        .from('games')
        .update({ 
          status: 'teams_announced',
          teams_announced: true
        })
        .eq('id', id);

      if (statusError) throw statusError;
      
      await props.onGameUpdated();
      toast.success('Teams have been announced');
      setHasAnnouncedTeams(true);
      setErrorCount(0); // Reset error count on success
    } catch (error) {
      setErrorCount(prev => {
        const newCount = prev + 1;
        if (newCount >= MAX_RETRIES) {
          setHasAnnouncedTeams(true); // Stop retrying after max retries
          toast.error('Failed to announce teams after multiple attempts. Please contact an admin.');
        } else {
          toast.error(`Failed to announce teams (attempt ${newCount}/${MAX_RETRIES})`);
        }
        return newCount;
      });
    } finally {
      setIsProcessingAnnouncement(false);
    }
  };

  return {
    isProcessingAnnouncement,
    hasAnnouncedTeams,
    handleTeamAnnouncement
  };
};
