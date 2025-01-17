import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { supabaseAdmin } from '../utils/supabase';
import { balanceTeams } from '../utils/teamBalancing';

interface UseTeamAnnouncementProps {
  game?: any;
  onGameUpdated: () => Promise<void>;
}

export const useTeamAnnouncement = (props?: UseTeamAnnouncementProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessingAnnouncement, setIsProcessingAnnouncement] = useState(false);
  const [hasAnnouncedTeams, setHasAnnouncedTeams] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isTeamAnnouncementTime, setIsTeamAnnouncementTime] = useState(false);
  
  // Use refs for values that shouldn't trigger re-renders
  const processingRef = useRef(false);
  const errorCountRef = useRef(0);
  const MAX_RETRIES = 3;

  const acquireLock = async (gameId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabaseAdmin
        .from('team_announcement_locks')
        .insert({
          game_id: gameId,
          locked_at: new Date().toISOString(),
          locked_until: new Date(Date.now() + 30000).toISOString() // 30 second lock
        })
        .select()
        .single();

      return !error && !!data;
    } catch (error) {
      if (error.message?.includes('team_announcement_locks" does not exist')) {
        console.log('Team announcement locks table does not exist, skipping lock acquisition');
        return true;
      }
      console.error('Lock acquisition error:', error);
      return false;
    }
  };

  const releaseLock = async (gameId: string) => {
    try {
      await supabaseAdmin
        .from('team_announcement_locks')
        .delete()
        .eq('game_id', gameId);
    } catch (error) {
      if (!error.message?.includes('team_announcement_locks" does not exist')) {
        console.error('Lock release error:', error);
      }
    }
  };

  const checkIsTeamAnnouncementTime = useCallback(() => {
    if (!props?.game) return false;
    
    const isAfterAnnouncementTime = currentTime > new Date(props.game.team_announcement_time);
    const isCorrectStatus = props.game.status === 'players_announced';
    
    return isAfterAnnouncementTime && isCorrectStatus;
  }, [props?.game, currentTime]);

  const handleTeamAnnouncement = useCallback(async () => {
    // Use ref to prevent multiple simultaneous executions
    if (!props?.game || processingRef.current) return;
    
    processingRef.current = true;
    setIsProcessingAnnouncement(true);
    let lockAcquired = false;

    try {
      // Try to acquire lock
      lockAcquired = await acquireLock(props.game.id);
      if (!lockAcquired) {
        console.log('Another instance is processing team announcement');
        return;
      }

      // Check current game status
      const { data: currentGame } = await supabaseAdmin
        .from('games')
        .select('status')
        .eq('id', props.game.id)
        .single();

      if (currentGame?.status !== 'players_announced') {
        console.log('Game is no longer in players_announced status');
        setHasAnnouncedTeams(true);
        return;
      }

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

      if (!teams || !teams.blueTeam || !teams.orangeTeam) {
        throw new Error('Invalid team structure returned from balancing');
      }

      // Call the stored procedure to update everything atomically
      const { data: result, error: updateError } = await supabaseAdmin.rpc(
        'update_team_assignments',
        {
          p_game_id: id,
          p_blue_team: teams.blueTeam,
          p_orange_team: teams.orangeTeam,
          p_team_assignments: {
            teams: [
              ...teams.blueTeam.map(playerId => ({
                player_id: playerId,
                team: 'blue'
              })),
              ...teams.orangeTeam.map(playerId => ({
                player_id: playerId,
                team: 'orange'
              }))
            ],
            stats: teams.stats
          },
          p_total_differential: teams.difference,
          p_attack_differential: teams.stats.blue.attack - teams.stats.orange.attack,
          p_defense_differential: teams.stats.blue.defense - teams.stats.orange.defense
        }
      );

      if (updateError) throw updateError;

      if (!result) {
        throw new Error('Team assignment update failed');
      }

      await props.onGameUpdated();
      
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        toast.success('Teams have been announced');
        setHasAnnouncedTeams(true);
        errorCountRef.current = 0;
        setErrorCount(0);
      }, 0);

    } catch (error) {
      console.error('Error announcing teams:', error);
      
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        errorCountRef.current += 1;
        setErrorCount(prev => {
          const newCount = prev + 1;
          if (newCount >= MAX_RETRIES) {
            setHasAnnouncedTeams(true);
            toast.error('Failed to announce teams after multiple attempts. Please contact an admin.');
          } else {
            toast.error(`Failed to announce teams (attempt ${newCount}/${MAX_RETRIES})`);
          }
          return newCount;
        });
      }, 0);
    } finally {
      if (lockAcquired && props.game) {
        await releaseLock(props.game.id);
      }
      processingRef.current = false;
      setIsProcessingAnnouncement(false);
    }
  }, [props, MAX_RETRIES]);

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
        !processingRef.current && 
        !hasAnnouncedTeams &&
        errorCountRef.current < MAX_RETRIES;

      if (shouldAnnounceTeams) {
        handleTeamAnnouncement();
      }
    };

    // Initial check
    checkAnnouncementTime();

    // Set up polling with random offset to prevent thundering herd
    const randomOffset = Math.random() * 3000; // Random delay between 0-3 seconds
    const intervalId = setInterval(checkAnnouncementTime, 5000 + randomOffset);

    return () => clearInterval(intervalId);
  }, [props?.game, isTeamAnnouncementTime, hasAnnouncedTeams, handleTeamAnnouncement]);

  return {
    isTeamAnnouncementTime,
    isProcessingAnnouncement,
    hasAnnouncedTeams,
    errorCount
  };
};
