import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { GameDetails } from '../components/game/GameDetails';
import { GameHeader } from '../components/game/GameHeader';
import { GameRegistration } from '../components/game/GameRegistration';
import { GameStatus } from '../components/game/GameStatus';
import { Game as GameType } from '../types/game';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useRegistrationClose } from '../hooks/useRegistrationClose';
import { useTeamAnnouncement } from '../hooks/useTeamAnnouncement';
import { useRegistrationOpen } from '../hooks/useRegistrationOpen';

const Game = () => {
  const { id } = useParams();
  const [upcomingGame, setUpcomingGame] = useState<GameType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [playerData, setPlayerData] = useState({
    registrations: [],
    selectedPlayers: [],
    reservePlayers: [],
    selectionNotes: [] as string[]
  });

  const fetchGameData = useCallback(async () => {
    try {
      setIsLoading(true);
      
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
          ),
          sequence_number
        `);

      const { data: game, error } = id 
        ? await baseQuery.eq('id', id).single()
        : await baseQuery
            .gte('date', new Date().toISOString())
            .order('date', { ascending: true })
            .limit(1)
            .maybeSingle();

      if (error) throw error;

      setUpcomingGame(game || null);

      if (!game) {
        setIsLoading(false);
        return;
      }

      const registrations = game.game_registrations || [];
      const allValidRegistrations = registrations.filter(reg => reg && reg.player);
      const selectedRegistrations = registrations.filter(reg => 
        reg && reg.player && reg.status === 'selected'
      );

      const transformedPlayers = selectedRegistrations.map(reg => ({
        player: reg.player,
        selection_type: reg.selection_method || 'merit',
        team: reg.team?.toLowerCase()
      }));

      setPlayerData({
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
      });
    } catch (error) {
      console.error('Error fetching game data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const checkUserRegistration = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !upcomingGame) return;

    const { data: playerProfile } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!playerProfile) return;

    const registration = upcomingGame.game_registrations?.find(
      reg => reg.player?.id === playerProfile.id
    );

    setIsUserRegistered(!!registration);
  }, [upcomingGame]);

  const { isRegistrationClosed, isProcessingClose } = useRegistrationClose({
    game: upcomingGame,
    onGameUpdated: fetchGameData
  });

  const { isTeamAnnouncementTime } = useTeamAnnouncement({
    game: upcomingGame,
    onGameUpdated: fetchGameData
  });

  const { isRegistrationOpen, isProcessingOpen } = useRegistrationOpen({
    game: upcomingGame,
    onGameUpdated: fetchGameData
  });

  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  useEffect(() => {
    checkUserRegistration();
  }, [checkUserRegistration, upcomingGame?.game_registrations]);

  useEffect(() => {
    if (upcomingGame?.status === 'teams_announced' || upcomingGame?.status === 'completed') {
      fetchGameData();
    }
  }, [upcomingGame?.status, fetchGameData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!upcomingGame) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold">No upcoming games found</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <GameHeader
        game={upcomingGame}
        isRegistrationOpen={isRegistrationOpen}
        isRegistrationClosed={isRegistrationClosed}
      />
      
      <GameRegistration
        game={upcomingGame}
        isRegistrationOpen={isRegistrationOpen}
        isRegistrationClosed={isRegistrationClosed}
        isUserRegistered={isUserRegistered}
        isProcessingOpen={isProcessingOpen}
        isProcessingClose={isProcessingClose}
        onRegistrationChange={fetchGameData}
      />

      <GameStatus
        game={upcomingGame}
        isLoading={isLoading}
        isProcessingOpen={isProcessingOpen}
        isProcessingClose={isProcessingClose}
        isTeamAnnouncementTime={isTeamAnnouncementTime}
        registrations={playerData.registrations}
        selectedPlayers={playerData.selectedPlayers}
        reservePlayers={playerData.reservePlayers}
      />
    </div>
  );
};

export default Game;
