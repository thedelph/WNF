import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { GameDetails } from '../components/game/GameDetails';
import { RegisteredPlayers } from '../components/game/RegisteredPlayers';
import { PlayerSelectionResults } from '../components/games/PlayerSelectionResults';
import { useRegistrationClose } from '../hooks/useRegistrationClose';
import { useGameRegistration } from '../hooks/useGameRegistration';
import { DebugInfo } from '../components/DebugInfo';
import { Game as GameType } from '../types/game';

const Game = () => {
  const [upcomingGame, setUpcomingGame] = useState<GameType | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUpcomingGame = async () => {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          venue:venues(*),
          game_registrations(
            id,
            status,
            player_id,
            randomly_selected,
            players(
              id,
              friendly_name,
              caps,
              active_bonuses,
              active_penalties,
              current_streak
            )
          )
        `)
        .gte('date', now)
        .in('status', ['open', 'upcoming', 'pending_teams', 'teams_announced'])
        .order('date', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Game fetch error:', error);
        return;
      }

      if (!data || data.length === 0) {
        setUpcomingGame(null);
        return;
      }

      setUpcomingGame(data[0]);
    } catch (error) {
      console.error('Error fetching upcoming game:', error);
    }
  };

  // Fetch current player ID
  useEffect(() => {
    const getPlayerId = async () => {
      if (!user?.id) return;
      
      try {
        const { data: player, error } = await supabase
          .from('players')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching player:', error);
          return;
        }

        console.log('Found player:', player);
        if (player) {
          setCurrentPlayerId(player.id);
        }
      } catch (error) {
        console.error('Error in getPlayerId:', error);
      }
    };

    getPlayerId();
  }, [user]);

  // Fetch game data on mount and when user changes
  useEffect(() => {
    fetchUpcomingGame();
  }, []);

  const {
    isRegistered,
    handleRegister,
    handleUnregister
  } = useGameRegistration(upcomingGame?.id, currentPlayerId, fetchUpcomingGame);

  const {
    isProcessingClose,
    hasPassedWindowEnd,
    handleRegistrationWindowClose
  } = useRegistrationClose({
    upcomingGame,
    onGameUpdated: fetchUpcomingGame
  });

  const handleClose = async () => {
    console.log('Starting registration close process...');
    if (!upcomingGame) {
      console.error('No game found');
      return;
    }
    
    try {
      await handleRegistrationWindowClose();
      console.log('Registration close completed');
    } catch (error) {
      console.error('Failed to close registration:', error);
    }
  };

  if (!upcomingGame) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-600">No upcoming games scheduled</p>
      </div>
    );
  }

  const registeredPlayers = upcomingGame.game_registrations || [];
  const now = new Date();
  const registrationEnd = new Date(upcomingGame.registration_window_end);
  const isRegistrationWindowOpen = now <= registrationEnd;

  // Calculate selected and reserve players
  const selectedPlayers = registeredPlayers
    .filter(reg => reg.status === 'selected')
    .map(reg => ({
      id: reg.player_id,
      friendly_name: reg.players?.friendly_name || 'Unknown Player',
      isRandomlySelected: reg.randomly_selected || false
    }));

  const reservePlayers = registeredPlayers
    .filter(reg => reg.status === 'reserve')
    .map(reg => ({
      id: reg.player_id,
      friendly_name: reg.players?.friendly_name || 'Unknown Player'
    }));

  return (
    <div className="container mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={upcomingGame.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-8"
        >
          <GameDetails
            date={upcomingGame.date}
            registeredCount={registeredPlayers.length}
            maxPlayers={upcomingGame.max_players}
            isRegistered={isRegistered}
            isRegistrationWindowOpen={isRegistrationWindowOpen}
            onRegister={handleRegister}
            onUnregister={handleUnregister}
            onClose={handleClose}
            isProcessingClose={isProcessingClose}
          />

          {!isRegistrationWindowOpen && (
            <PlayerSelectionResults
              selectedPlayers={selectedPlayers}
              reservePlayers={reservePlayers}
            />
          )}

          <RegisteredPlayers
            registrations={registeredPlayers}
          />

          <DebugInfo
            upcomingGame={upcomingGame}
            isProcessingClose={isProcessingClose}
            hasPassedWindowEnd={hasPassedWindowEnd}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Game;