import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { GameDetails } from '../components/game/GameDetails';
import { Game as GameType } from '../types/game';
import { RegisteredPlayers } from '../components/game/RegisteredPlayers';
import { PlayerSelectionResults } from '../components/games/PlayerSelectionResults';
import { TeamSelectionResults } from '../components/games/TeamSelectionResults';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { handlePlayerSelection } from '../utils/playerSelection';
import { useRegistrationClose } from '../hooks/useRegistrationClose';
import { useTeamAnnouncement } from '../hooks/useTeamAnnouncement';
import { useRegistrationOpen } from '../hooks/useRegistrationOpen';

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

  // Check if current user is registered
  const [isUserRegistered, setIsUserRegistered] = useState(false);

  useEffect(() => {
    const checkUserRegistration = async () => {
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
      const isRegistered = upcomingGame.game_registrations?.some(
        reg => reg.player_id === playerProfile.id
      ) || false;
      setIsUserRegistered(isRegistered);
    };

    checkUserRegistration();
  }, [upcomingGame]);

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

      if (isUserRegistered) {
        // Unregister
        const { error } = await supabase
          .from('game_registrations')
          .delete()
          .match({ game_id: upcomingGame.id, player_id: playerProfile.id });

        if (error) throw error;
      } else {
        // Register
        const { error } = await supabase
          .from('game_registrations')
          .insert({
            game_id: upcomingGame.id,
            player_id: playerProfile.id,
            status: 'registered'
          });

        if (error) throw error;
      }

      // Refresh game data
      await fetchGameData();
    } catch (error) {
      console.error('Error handling registration:', error);
      throw error;
    }
  };

  const fetchGameData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Starting game data fetch...');
      
      // Fetch the next game that hasn't been completed
      const { data: games, error: gameError } = await supabase
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
            randomly_selected,
            player_id,
            player:players!game_registrations_player_id_fkey (
              id,
              friendly_name,
              preferred_position,
              caps,
              active_bonuses,
              active_penalties,
              current_streak,
              max_streak,
              win_rate,
              avatar_svg
            )
          ),
          game_selections (
            selected_players,
            reserve_players
          ),
          registrations_count:game_registrations(count)
        `)
        .neq('status', 'completed')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1)
        .single();

      if (gameError) {
        console.error('Game fetch error:', gameError);
        return;
      }

      if (!games) {
        setIsLoading(false);
        return;
      }

      // Transform the venue data to match the expected format
      const gameWithVenue = {
        ...games,
        venue: games.venues ? {
          name: games.venues.name,
          address: games.venues.address,
          google_maps_url: games.venues.google_maps_url
        } : null,
        registrations: games.game_registrations || [],
        registrations_count: games.registrations_count?.[0]?.count || 0
      };

      setUpcomingGame(gameWithVenue);
      setPlayerData(prev => ({
        ...prev,
        registrations: games.game_registrations || []
      }));

    } catch (error) {
      console.error('Error fetching game data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  const { isProcessingOpen } = useRegistrationOpen({
    game: upcomingGame,
    onGameUpdated: fetchGameData
  });

  const { isProcessingClose } = useRegistrationClose({
    game: upcomingGame,
    onGameUpdated: fetchGameData
  });

  const { isProcessingAnnouncement } = useTeamAnnouncement({
    game: upcomingGame,
    onGameUpdated: fetchGameData
  });

  const renderPlayerList = () => {
    if (isProcessingOpen || isProcessingClose || isProcessingAnnouncement) {
      return <LoadingSpinner />;
    }

    switch (upcomingGame?.status) {
      case 'open':
      case 'upcoming':
        return <RegisteredPlayers gameId={upcomingGame.id} />;
      case 'players_announced':
        return <PlayerSelectionResults gameId={upcomingGame.id} />;
      case 'teams_announced':
      case 'completed':
        return <TeamSelectionResults gameId={upcomingGame.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {isLoading ? (
        <LoadingSpinner />
      ) : !upcomingGame ? (
        <div className="text-center text-xl">No upcoming games found.</div>
      ) : (
        <GameDetails 
          game={upcomingGame} 
          isRegistrationClosed={isRegistrationClosed}
          isUserRegistered={isUserRegistered}
          handleRegistration={handleRegistration}
          handlePlayerSelection={handlePlayerSelection}
        >
          {renderPlayerList()}
        </GameDetails>
      )}
    </div>
  );
};

export default Game;