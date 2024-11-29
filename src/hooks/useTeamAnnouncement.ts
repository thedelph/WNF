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

      console.log('Team announcement check:', {
        now: now.toISOString(),
        announcementTime: announcementTime.toISOString(),
        isPastAnnouncementTime: now > announcementTime,
        gameStatus: props.game!.status,
        teamsAnnounced: props.game!.teams_announced,
        shouldAnnounceTeams,
        isProcessingAnnouncement,
        hasAnnouncedTeams,
        errorCount
      });

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
      
      console.log('Starting team announcement for game:', { id });

      // Get selected players
      const { data: selections, error: selectionsError } = await supabaseAdmin
        .from('game_selections')
        .select('selected_players')
        .eq('game_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (selectionsError) throw selectionsError;

      if (!selections || !selections.selected_players || selections.selected_players.length === 0) {
        throw new Error('No selected players found');
      }

      console.log('Selected players before balancing:', selections.selected_players);

      // Convert selected players to PlayerRating format
      const playerRatings = selections.selected_players.map(player => ({
        player_id: player.id,
        attack_rating: player.stats?.caps || 0,
        defense_rating: player.stats?.caps || 0,
        win_rate: player.stats?.win_rate || 50
      }));

      console.log('Player ratings for balancing:', playerRatings);

      // Balance teams
      const teams = await balanceTeams(playerRatings);
      
      console.log('Teams after balancing:', teams);

      if (!teams) {
        throw new Error('Team balancing returned null');
      }

      if (!teams.orangeTeam || !teams.blueTeam) {
        throw new Error(`Invalid team structure: ${JSON.stringify(teams)}`);
      }

      // Update player registrations with team assignments
      for (const team of ['orange', 'blue'] as const) {
        const teamPlayers = team === 'orange' ? teams.orangeTeam : teams.blueTeam;
        if (teamPlayers && teamPlayers.length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('game_registrations')
            .update({ team })
            .eq('game_id', id)
            .in('player_id', teamPlayers.map(p => p.player_id));

          if (updateError) throw updateError;
        }
      }

      // Update game status
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
      console.error('Error in team announcement:', error);
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
