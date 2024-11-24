import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { GameDetails } from '../components/game/GameDetails';
import { Game as GameType, GAME_STATUSES } from '../types/game';
import { PlayerSelectionResults } from '../components/games/PlayerSelectionResults';
import { useRegistrationClose } from '../hooks/useRegistrationClose';
import { calculatePlayerXP } from '../utils/playerUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { RegisteredPlayers } from '../components/game/RegisteredPlayers';

const Game = () => {
  const [upcomingGame, setUpcomingGame] = useState<GameType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerData, setPlayerData] = useState({
    registrations: [],
    selectedPlayers: [],
    reservePlayers: []
  });

  const fetchGameData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch the next game that hasn't been completed
      const { data: games, error: gameError } = await supabase
        .from('games')
        .select('*')
        .neq('status', 'completed')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1);

      if (gameError) throw gameError;
      if (!games || games.length === 0) {
        setIsLoading(false);
        return;
      }

      const currentGame = games[0];

      // Fetch registrations with player details using the correct foreign key
      const { data: registrations, error: regError } = await supabase
        .from('game_registrations')
        .select(`
          id,
          status,
          randomly_selected,
          player:players!game_registrations_player_id_fkey (
            id,
            friendly_name,
            caps,
            active_bonuses,
            active_penalties,
            current_streak
          )
        `)
        .eq('game_id', currentGame.id);

      if (regError) {
        console.error('Registration fetch error:', regError);
        throw regError;
      }

      // Process registrations with proper XP calculation
      const processedPlayers = (registrations || []).map(reg => ({
        id: reg.id,
        friendly_name: reg.player.friendly_name,
        xp: calculatePlayerXP({
          caps: reg.player.caps,
          activeBonuses: reg.player.active_bonuses,
          activePenalties: reg.player.active_penalties,
          currentStreak: reg.player.current_streak
        }),
        stats: {
          caps: reg.player.caps,
          activeBonuses: reg.player.active_bonuses,
          activePenalties: reg.player.active_penalties,
          currentStreak: reg.player.current_streak
        },
        isRandomlySelected: reg.randomly_selected
      }));

      // Split into selected and reserve players
      const selectedPlayers = processedPlayers.filter(p => 
        registrations.find(r => r.id === p.id)?.status === 'selected' ||
        registrations.find(r => r.id === p.id)?.status === 'confirmed'
      );
      const reservePlayers = processedPlayers.filter(p => 
        registrations.find(r => r.id === p.id)?.status === 'reserve'
      );

      setUpcomingGame(currentGame);
      setPlayerData({
        registrations: processedPlayers.map(p => ({
          id: p.id,
          players: {
            friendly_name: p.friendly_name
          }
        })),
        selectedPlayers,
        reservePlayers
      });

      if (currentGame.status === 'players_announced') {
        const { data: selectionResults, error: selectionError } = await supabase
          .from('game_selections')
          .select('*')
          .eq('game_id', currentGame.id)
          .single();

        if (!selectionError && selectionResults) {
          setPlayerData({
            ...playerData,
            selectedPlayers: selectionResults.selectedPlayers,
            reservePlayers: selectionResults.reservePlayers
          });
        }
      }
    } catch (error) {
      console.error('Error fetching game data:', error);
      toast.error('Failed to load game data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Use the registration close hook
  const { isProcessingClose } = useRegistrationClose({
    upcomingGame,
    onGameUpdated: fetchGameData
  });

  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  const isRegistrationOpen = (game: GameType) => {
    const now = new Date();
    const regStart = new Date(game.registration_window_start);
    const regEnd = new Date(game.registration_window_end);
    return now >= regStart && now <= regEnd;
  };

  const isBeforeRegistration = (game: GameType) => {
    const now = new Date();
    const regStart = new Date(game.registration_window_start);
    return now < regStart;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <GameDetails game={upcomingGame} />
      
      {isLoading || isProcessingClose ? (
        <LoadingSpinner />
      ) : upcomingGame && (
        <>
          {/* Before registration opens */}
          {isBeforeRegistration(upcomingGame) && (
            <div className="mt-8 text-center text-gray-600">
              Registration opens at {new Date(upcomingGame.registration_window_start).toLocaleString()}
            </div>
          )}

          {/* During registration window */}
          {isRegistrationOpen(upcomingGame) && (
            <>
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Currently Registered Players</h2>
                <RegisteredPlayers registrations={playerData.registrations} />
              </div>
            </>
          )}

          {/* After registration closes */}
          {upcomingGame.status === 'players_announced' && (
            <PlayerSelectionResults 
              selectedPlayers={playerData.selectedPlayers}
              reservePlayers={playerData.reservePlayers}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Game;