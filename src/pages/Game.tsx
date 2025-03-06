import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { supabase } from '../utils/supabase';

import { GameHeader } from '../components/game/GameHeader';

import { GameRegistration } from '../components/game/GameRegistration';

import { RegisteredPlayers } from '../components/game/RegisteredPlayers';

import { PlayerSelectionResults } from '../components/games/PlayerSelectionResults';

import { TeamSelectionResults } from '../components/games/TeamSelectionResults';

import { LoadingSpinner } from '../components/LoadingSpinner';

import { PlayerCard } from '../components/player-card/PlayerCard';

import { useRegistrationClose } from '../hooks/useRegistrationClose';

import { useTeamAnnouncement } from '../hooks/useTeamAnnouncement';

import { useRegistrationOpen } from '../hooks/useRegistrationOpen';

import { Game as GameType } from '../types/game';

import WeatherCard from '../components/weather/WeatherCard';
import { useWeatherCard } from '../hooks/useWeatherCard';

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

  const [useToken, setUseToken] = useState(false);

  const fetchGameData = useCallback(async () => {

    try {

      setIsLoading(true);

      const baseQuery = supabase

        .from('games')

        .select(`

          *, 

          venue:venues!games_venue_id_fkey (

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
            using_token,
            player:players!game_registrations_player_id_fkey (

              id,

              friendly_name,

              caps,

              active_bonuses,

              active_penalties,

              current_streak,

              max_streak,

              avatar_svg,

              whatsapp_group_member,

              unpaid_games,

              unpaid_games_modifier

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

      // Get registration streak data for all players
      const { data: regStreakData, error: regStreakError } = await supabase
        .from('player_current_registration_streak_bonus')
        .select('friendly_name, current_streak_length, bonus_applies');

      if (regStreakError) throw regStreakError;

      // Create a map of registration streak data
      const regStreakMap = regStreakData?.reduce((acc: any, player: any) => ({
        ...acc,
        [player.friendly_name]: {
          registrationStreak: player.current_streak_length || 0,
          registrationStreakApplies: player.bonus_applies || false
        }
      }), {});

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
          player: {
            ...reg.player,
            registrationStreak: regStreakMap?.[reg.player.friendly_name]?.registrationStreak || 0,
            registrationStreakApplies: regStreakMap?.[reg.player.friendly_name]?.registrationStreakApplies || false
          },
          status: reg.status,
          using_token: reg.using_token,
          created_at: reg.created_at || new Date().toISOString()
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

  const onGameUpdated = useCallback(async () => {

    await fetchGameData();

  }, [fetchGameData]);

  const { isTeamAnnouncementTime } = useTeamAnnouncement({

    game: upcomingGame,

    onGameUpdated

  });

  const { isProcessingOpen } = useRegistrationOpen({

    game: upcomingGame,

    onGameUpdated: fetchGameData

  });

  const useWeatherCardHook = useWeatherCard({ gameId: upcomingGame?.id });

  // Determine if registration is open based on window times and game status
  const now = new Date();
  const isRegistrationOpen = upcomingGame && 
    upcomingGame.status === 'open' &&
    now >= new Date(upcomingGame.registration_window_start) &&
    now < new Date(upcomingGame.registration_window_end);

  // Set up realtime subscription for game updates

  useEffect(() => {

    if (!upcomingGame?.id) return;

    // Subscribe to game changes

    const gameSubscription = supabase

      .channel(`game-${upcomingGame.id}`)

      .on(

        'postgres_changes',

        {

          event: '*',

          schema: 'public',

          table: 'games',

          filter: `id=eq.${upcomingGame.id}`

        },

        () => {

          fetchGameData();

        }

      )

      .subscribe();

    // Subscribe to registration changes

    const registrationSubscription = supabase

      .channel(`game-registrations-${upcomingGame.id}`)

      .on(

        'postgres_changes',

        {

          event: '*',

          schema: 'public',

          table: 'game_registrations',

          filter: `game_id=eq.${upcomingGame.id}`

        },

        () => {

          fetchGameData();

        }

      )

      .subscribe();

    return () => {

      gameSubscription.unsubscribe();

      registrationSubscription.unsubscribe();

    };

  }, [upcomingGame?.id, fetchGameData]);

  useEffect(() => {

    fetchGameData();

  }, [fetchGameData]);

  useEffect(() => {

    checkUserRegistration();

  }, [checkUserRegistration, upcomingGame?.game_registrations]);

  const handleRegistration = async () => {
    try {
      if (!upcomingGame) return;

      const { data: playerProfile } = await supabase
        .from('players')
        .select('id')
        .single();

      if (!playerProfile) {
        console.error('No player profile found');
        return;
      }

      if (isUserRegistered) {
        // Unregister
        const { error } = await supabase
          .from('game_registrations')
          .delete()
          .match({ 
            game_id: upcomingGame.id,
            player_id: playerProfile.id 
          });

        if (error) throw error;
        
        // Reset token usage
        setUseToken(false);
      } else {
        // If using token, verify and reserve it
        if (useToken) {
          const { data: tokenReserved } = await supabase
            .rpc('handle_game_token', { 
              p_player_id: playerProfile.id,
              p_game_id: upcomingGame.id,
              p_action: 'reserve'
            });

          if (!tokenReserved) {
            console.error('Failed to reserve token');
            return;
          }
        }

        // Register
        const { error } = await supabase
          .from('game_registrations')
          .insert({
            game_id: upcomingGame.id,
            player_id: playerProfile.id,
            status: 'registered',
            using_token: useToken,
            selection_method: useToken ? 'token' : null
          });

        if (error) {
          // If registration failed and we reserved a token, release it
          if (useToken) {
            await supabase
              .rpc('handle_game_token', { 
                p_player_id: playerProfile.id,
                p_game_id: upcomingGame.id,
                p_action: 'return'
              });
          }
          throw error;
        }
      }

      // Refresh game data
      await fetchGameData();
      await checkUserRegistration();
    } catch (error) {
      console.error('Error handling registration:', error);
      throw error;
    }
  };

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
    <div className="container mx-auto px-4 space-y-8">
      <GameHeader
        game={upcomingGame}
        isRegistrationOpen={isRegistrationOpen}
        isRegistrationClosed={isRegistrationClosed}
        weatherCardProps={upcomingGame.venue ? {
          venueAddress: upcomingGame.venue.address || '',
          venueName: upcomingGame.venue.name || '',
          gameDateTime: upcomingGame.date,
          isVisible: useWeatherCardHook.isVisible,
          onToggle: useWeatherCardHook.toggleVisibility
        } : undefined}
      />
      
      {/* Show GameRegistration and RegisteredPlayers only during registration window */}
      {isRegistrationOpen && (
        <>
          <GameRegistration
            game={upcomingGame}
            isRegistrationOpen={isRegistrationOpen}
            isRegistrationClosed={isRegistrationClosed}
            isUserRegistered={isUserRegistered}
            isProcessingOpen={isProcessingOpen}
            isProcessingClose={isProcessingClose}
            onRegistrationChange={onGameUpdated}
            useToken={useToken}
            setUseToken={setUseToken}
          />
          <RegisteredPlayers 
            registrations={playerData.registrations} 
            maxPlayers={upcomingGame.max_players} 
            randomSlots={upcomingGame.random_slots} 
          />
        </>
      )}

      {/* Show PlayerSelectionResults after registration closes but before team announcement */}
      {upcomingGame.status === 'players_announced' && !isTeamAnnouncementTime && (
        <PlayerSelectionResults gameId={upcomingGame.id} />
      )}

      {/* Show TeamSelectionResults after team announcement */}
      {(isTeamAnnouncementTime || upcomingGame.status === 'teams_announced') && (
        <TeamSelectionResults
          key={`team-selection-${playerData.selectedPlayers.length}`}
          gameId={upcomingGame.id}
          selectedPlayers={playerData.selectedPlayers}
          reservePlayers={playerData.reservePlayers}
        />
      )}
    </div>
  );
};

export default Game;
