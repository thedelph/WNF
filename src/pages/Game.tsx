import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { supabase } from '../utils/supabase';

import { GameHeader } from '../components/game/GameHeader';

import { GameRegistration } from '../components/game/GameRegistration';

import { RegisteredPlayers } from '../components/game/RegisteredPlayers';

import { ShieldTokenPlayers } from '../components/game/ShieldTokenPlayers';

import { PlayerSelectionResults } from '../components/games/PlayerSelectionResults';

import { TeamSelectionResults } from '../components/games/TeamSelectionResults';

import { LoadingSpinner } from '../components/LoadingSpinner';

import { useRegistrationClose } from '../hooks/useRegistrationClose';

import { useTeamAnnouncement } from '../hooks/useTeamAnnouncement';

import { useRegistrationOpen } from '../hooks/useRegistrationOpen';

import { Game as GameType, GameRegistration as GameRegistrationType } from '../types/game';
import { Player } from '../types/player';

import { useWeatherCard } from '../hooks/useWeatherCard';
import { utcToUkTime } from '../utils/dateUtils';

// Define registration status type to match expected values
type RegistrationStatus = 'registered' | 'selected' | 'reserve' | 'dropped_out' | 'absent';

// Define types for player data state to fix TypeScript errors
interface PlayerDataState {
  registrations: Array<{
    player: Player & {
      registrationStreak?: number;
      registrationStreakApplies?: boolean;
    };
    status: RegistrationStatus;
    using_token?: boolean;
    created_at: string;
  }>;
  selectedPlayers: Array<{
    player: Player;
    selection_type: string;
    team: string;
  }>;
  reservePlayers: Player[];
  selectionNotes: string[];
  shieldTokenUsers: Array<{
    player: Player;
    used_at: string;
    protected_streak_value: number;
    protected_streak_base: number;
  }>;
}

// Define type for registration streak data
interface RegStreakData {
  friendly_name: string;
  current_streak_length: number;
  bonus_applies: boolean;
}

// Define type for registration streak map
interface RegStreakMap {
  [key: string]: {
    registrationStreak: number;
    registrationStreakApplies: boolean;
  };
}

/**
 * Game component displays details for a specific game or the next upcoming game
 * Handles registration, player selection, and team announcements
 * Uses timezone-aware date handling for proper display of times
 */
const Game = () => {

  const { id } = useParams();

  const [upcomingGame, setUpcomingGame] = useState<GameType | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isUserRegistered, setIsUserRegistered] = useState(false);

  // Use the defined interface for playerData state
  const [playerData, setPlayerData] = useState<PlayerDataState>({
    registrations: [],
    selectedPlayers: [],
    reservePlayers: [],
    selectionNotes: [],
    shieldTokenUsers: []
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
            using_shield,
            using_injury,
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

      // Create a map of registration streak data with proper typing
      const regStreakMap: RegStreakMap = (regStreakData as RegStreakData[] || []).reduce((acc: RegStreakMap, player: RegStreakData) => ({
        ...acc,
        [player.friendly_name]: {
          registrationStreak: player.current_streak_length || 0,
          registrationStreakApplies: player.bonus_applies || false
        }
      }), {});

      const registrations = game.game_registrations || [];

      const allValidRegistrations = registrations.filter((reg: GameRegistrationType) => reg && reg.player);

      const selectedRegistrations = registrations.filter((reg: GameRegistrationType) => 
        reg && reg.player && reg.status === 'selected'
      );

      const transformedPlayers = selectedRegistrations.map((reg: GameRegistrationType) => ({
        player: reg.player!,
        selection_type: reg.selection_method || 'merit',
        team: reg.team?.toLowerCase() || ''
      }));

      // Create a properly typed playerData object
      setPlayerData({
        registrations: allValidRegistrations.map((reg: GameRegistrationType) => ({
          player: {
            ...reg.player!,
            // Safely access registration streak data with null checks and defaults
            registrationStreak: reg.player?.friendly_name && regStreakMap[reg.player.friendly_name]
              ? regStreakMap[reg.player.friendly_name].registrationStreak
              : 0,
            registrationStreakApplies: reg.player?.friendly_name && regStreakMap[reg.player.friendly_name]
              ? regStreakMap[reg.player.friendly_name].registrationStreakApplies
              : false
          },
          status: (reg.status || 'registered') as RegistrationStatus,
          using_token: reg.using_token,
          created_at: reg.created_at || new Date().toISOString()
        })),
        selectedPlayers: transformedPlayers,
        reservePlayers: registrations
          .filter((reg: GameRegistrationType) => reg.status === 'reserve' && reg.player)
          .map((reg: GameRegistrationType) => reg.player!),
        selectionNotes: [],
        shieldTokenUsers: []
      });

      // Fetch shield token users for this game
      if (game?.id) {
        const { data: shieldUsers, error: shieldError } = await supabase
          .from('shield_token_usage')
          .select(`
            used_at,
            protected_streak_value,
            protected_streak_base,
            player:players!shield_token_usage_player_id_fkey (
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
              unpaid_games_modifier,
              shield_active,
              protected_streak_value,
              protected_streak_base
            )
          `)
          .eq('game_id', game.id)
          .eq('is_active', true);

        if (!shieldError && shieldUsers) {
          setPlayerData(prev => ({
            ...prev,
            shieldTokenUsers: shieldUsers
              .filter(su => su.player)
              .map(su => ({
                player: su.player!,
                used_at: su.used_at || new Date().toISOString(),
                protected_streak_value: su.protected_streak_value,
                protected_streak_base: su.protected_streak_base
              }))
          }));
        }
      }

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

      (reg: GameRegistrationType) => reg.player?.id === playerProfile.id

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
  // Use timezone-aware date handling for proper comparison
  const now = new Date();
  const isRegistrationOpen = upcomingGame && 
    upcomingGame.status === 'open' &&
    now >= utcToUkTime(new Date(upcomingGame.registration_window_start)) &&
    now < utcToUkTime(new Date(upcomingGame.registration_window_end));

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

  // Extract blue and orange teams for TeamSelectionResults
  const blueTeam = playerData.selectedPlayers
    .filter(p => p.team === 'blue')
    .map(p => p.player);
  
  const orangeTeam = playerData.selectedPlayers
    .filter(p => p.team === 'orange')
    .map(p => p.player);

  return (
    <div className="container mx-auto px-4 space-y-8">
      <GameHeader
        game={upcomingGame}
        isRegistrationOpen={isRegistrationOpen}
        isRegistrationClosed={!!isRegistrationClosed}
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
            isRegistrationClosed={!!isRegistrationClosed}
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
            randomSlots={upcomingGame.random_slots || 0}
            gameId={upcomingGame.id}
          />
          <ShieldTokenPlayers
            shieldTokenUsers={playerData.shieldTokenUsers}
          />
        </>
      )}

      {/* Show PlayerSelectionResults after registration closes but before team announcement */}
      {upcomingGame.status === 'players_announced' && !isTeamAnnouncementTime && (
        <PlayerSelectionResults
          gameId={upcomingGame.id}
        />
      )}

      {/* Show TeamSelectionResults after team announcement */}
      {(isTeamAnnouncementTime || upcomingGame.status === 'teams_announced') && (
        <TeamSelectionResults
          key={`team-selection-${playerData.selectedPlayers.length}`}
          gameId={upcomingGame.id}
        />
      )}
    </div>
  );
};

export default Game;
