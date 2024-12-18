import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { GameDetails } from '../components/game/GameDetails';
import { GameHeader } from '../components/game/GameHeader';
import { Game as GameType } from '../types/game';
import { RegisteredPlayers } from '../components/game/RegisteredPlayers';
import { PlayerSelectionResults } from '../components/games/PlayerSelectionResults';
import { TeamSelectionResults } from '../components/games/TeamSelectionResults';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { handlePlayerSelection } from '../utils/playerSelection';
import { useRegistrationClose } from '../hooks/useRegistrationClose';
import { useTeamAnnouncement } from '../hooks/useTeamAnnouncement';
import { useRegistrationOpen } from '../hooks/useRegistrationOpen';
import { format } from 'date-fns';

const Game = () => {
  const [upcomingGame, setUpcomingGame] = useState<GameType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerData, setPlayerData] = useState({
    registrations: [],
    selectedPlayers: [],
    reservePlayers: [],
    selectionNotes: [] as string[]
  });

  const { isRegistrationClosed } = useRegistrationClose(upcomingGame?.date);
  const { isTeamAnnouncementTime, handleTeamAnnouncement } = useTeamAnnouncement({
    game: upcomingGame,
    onGameUpdated: async () => {
      await fetchGameData();
    }
  });
  const { isRegistrationOpen } = useRegistrationOpen(upcomingGame?.date);

  // Check if current user is registered
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [currentRegistration, setCurrentRegistration] = useState<any>(null);

  const checkUserRegistration = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !upcomingGame) return;

    // Get player profile first
    const { data: playerProfile } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!playerProfile) return;

    // Check registration using player ID
    const registration = upcomingGame.game_registrations?.find(
      reg => reg.player?.id === playerProfile.id
    );

    setCurrentRegistration(registration);
    setIsUserRegistered(!!registration);
  }, [upcomingGame]);

  useEffect(() => {
    checkUserRegistration();
  }, [checkUserRegistration, upcomingGame?.game_registrations]);

  const handleRegistration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !upcomingGame) return;

      // First get the player profile
      const { data: playerProfile, error: profileError } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching player profile:', profileError);
        throw profileError;
      }

      if (!playerProfile) {
        console.error('No player profile found');
        return;
      }

      // Check current registration status first
      const { data: existingReg } = await supabase
        .from('game_registrations')
        .select('id, status')
        .eq('game_id', upcomingGame.id)
        .eq('player_id', playerProfile.id)
        .single();

      if (existingReg) {
        // Already registered, so unregister
        const { error } = await supabase
          .from('game_registrations')
          .delete()
          .eq('game_id', upcomingGame.id)
          .eq('player_id', playerProfile.id);

        if (error) throw error;
        setIsUserRegistered(false);
        setCurrentRegistration(null);
      } else {
        // Not registered, so register
        const { data: newReg, error } = await supabase
          .from('game_registrations')
          .insert({
            game_id: upcomingGame.id,
            player_id: playerProfile.id,
            status: 'registered',
            selection_method: 'none'
          })
          .select('*')
          .single();

        if (error) throw error;
        setIsUserRegistered(true);
        setCurrentRegistration(newReg);
      }

      // Refresh game data
      await fetchGameData();
    } catch (error) {
      console.error('Error handling registration:', error);
      throw error;
    }
  };

  const { id } = useParams();

  const fetchGameData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Base query with all required relations
      const baseQuery = supabase
        .from('games')
        .select(`
          *,
          venues (
            id,
            name,
            address,
            google_maps_url
          ),
          game_registrations (
            id,
            status,
            team,
            selection_method,
            player:players!game_registrations_player_id_fkey (
              id,
              friendly_name,
              caps,
              active_bonuses,
              active_penalties,
              current_streak,
              win_rate,
              max_streak,
              avatar_svg
            )
          )
        `);

      // Execute different queries based on whether we have an ID
      const { data: game, error } = id 
        ? await baseQuery
            .eq('id', id)
            .single()
        : await baseQuery
            .gte('date', new Date().toISOString())
            .order('date', { ascending: true })
            .limit(1)
            .maybeSingle();

      if (error) {
        console.error('Error fetching game data:', error);
        throw error;
      }

      if (!game) {
        setUpcomingGame(null);
        setIsLoading(false);
        return;
      }

      setUpcomingGame(game);

      const registrations = game.game_registrations || [];
      
      // Get all valid registrations (must have player data)
      const allValidRegistrations = registrations.filter(reg => 
        reg && reg.player
      );

      // Transform selected players for team display - include both merit and random selections
      const selectedRegistrations = registrations.filter(reg => 
        reg && reg.player && reg.status === 'selected'
      );

      const transformedPlayers = selectedRegistrations.map(reg => ({
        player: reg.player,
        selection_type: reg.selection_method || 'merit',
        team: reg.team?.toLowerCase()
      }));

      // Update player data state
      const newPlayerData = {
        registrations: allValidRegistrations.map(reg => ({
          ...reg,
          player: {
            ...reg.player,
            processed: true
          }
        })),
        selectedPlayers: transformedPlayers,
        reservePlayers: registrations
          .filter(reg => reg.status === 'reserve' && reg.player)
          .map(reg => reg.player),
        selectionNotes: []
      };

      setPlayerData(newPlayerData);
    } catch (error) {
      console.error('Error fetching game data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  useEffect(() => {
    if (upcomingGame?.status === 'teams_announced' || upcomingGame?.status === 'completed') {
      fetchGameData();
    }
  }, [upcomingGame?.status, fetchGameData]);

  const { isProcessingOpen } = useRegistrationOpen({
    game: upcomingGame,
    onGameUpdated: fetchGameData
  });

  const { isProcessingClose } = useRegistrationClose({
    game: upcomingGame,
    onGameUpdated: fetchGameData
  });

  const teamSelectionComponent = useMemo(() => {
    if (upcomingGame?.status !== 'teams_announced' && upcomingGame?.status !== 'completed') {
      return null;
    }

    return (
      <TeamSelectionResults 
        key={`team-selection-${playerData.selectedPlayers.length}`}
        gameId={upcomingGame.id}
        selectedPlayers={playerData.selectedPlayers}
        reservePlayers={playerData.reservePlayers}
      />
    );
  }, [upcomingGame?.status, upcomingGame?.id, playerData.selectedPlayers, playerData.reservePlayers]);

  const renderPlayerList = () => {
    if (isProcessingOpen || isProcessingClose || isTeamAnnouncementTime || isLoading) {
      return <LoadingSpinner />;
    }

    if (!upcomingGame) {
      return null;
    }

    switch (upcomingGame.status) {
      case 'open':
      case 'upcoming':
        return <RegisteredPlayers registrations={playerData.registrations} />;
      case 'players_announced':
        return <PlayerSelectionResults gameId={upcomingGame.id} />;
      case 'teams_announced':
      case 'completed':
        return teamSelectionComponent;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : upcomingGame ? (
        <>
          <GameHeader
            gameNumber={upcomingGame.sequence_number || 0}
            date={upcomingGame.date}
            time={format(new Date(upcomingGame.date), 'HH:mm')}
            totalPlayers={upcomingGame.max_players || 0}
            xpSlots={upcomingGame.max_players - (upcomingGame.random_slots || 0)}
            randomSlots={upcomingGame.random_slots || 0}
            currentlyRegistered={upcomingGame.game_registrations?.length || 0}
          />
          {renderPlayerList()}
        </>
      ) : (
        <div className="text-center text-xl">No upcoming games found.</div>
      )}
    </div>
  );
};

export default Game;