import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabaseAdmin } from '../utils/supabase';
import { balanceTeams } from '../utils/teamBalancing';

interface UseTeamAnnouncementProps {
  game?: any;
  onGameUpdated: () => Promise<void>;
}

export const useTeamAnnouncement = (props?: UseTeamAnnouncementProps) => {
  // All useState hooks first
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessingAnnouncement, setIsProcessingAnnouncement] = useState(false);
  const [hasAnnouncedTeams, setHasAnnouncedTeams] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isTeamAnnouncementTime, setIsTeamAnnouncementTime] = useState(false);
  
  const MAX_RETRIES = 3;

  // All useCallback hooks next
  const checkIsTeamAnnouncementTime = useCallback(() => {
    if (!props?.game) return false;
    
    const isAfterAnnouncementTime = currentTime > new Date(props.game.team_announcement_time);
    const isCorrectStatus = props.game.status === 'players_announced' || props.game.status === 'teams_announced';
    
    return isAfterAnnouncementTime && isCorrectStatus;
  }, [props?.game, currentTime]);

  const handleTeamAnnouncement = useCallback(async () => {
    if (!props?.game || isProcessingAnnouncement) return;

    // Check if teams are already announced to prevent duplicate processing
    const { data: currentGame } = await supabaseAdmin
      .from('games')
      .select('status')
      .eq('id', props.game.id)
      .single();

    if (currentGame?.status === 'teams_announced') {
      setHasAnnouncedTeams(true);
      return;
    }

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
      console.error('Error announcing teams:', error);
    } finally {
      setIsProcessingAnnouncement(false);
    }
  }, [props, isProcessingAnnouncement, MAX_RETRIES]);

  // All useEffect hooks last
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsTeamAnnouncementTime(checkIsTeamAnnouncementTime());
  }, [checkIsTeamAnnouncementTime]);

  useEffect(() => {
    if (!props?.game) return;

    const checkAnnouncementTime = () => {
      const shouldAnnounceTeams = 
        isTeamAnnouncementTime && 
        !isProcessingAnnouncement && 
        !hasAnnouncedTeams &&
        errorCount < MAX_RETRIES;

      if (shouldAnnounceTeams) {
        handleTeamAnnouncement();
      }
    };

    // Initial check
    checkAnnouncementTime();

    // Set up polling every 5 seconds
    const intervalId = setInterval(checkAnnouncementTime, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [props?.game, isProcessingAnnouncement, hasAnnouncedTeams, errorCount, isTeamAnnouncementTime, handleTeamAnnouncement]);

  return {
    isTeamAnnouncementTime,
    isProcessingAnnouncement,
    hasAnnouncedTeams,
    errorCount
  };
};
