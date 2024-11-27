import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { GameDetails } from '../components/game/GameDetails';
import { Game as GameType, GAME_STATUSES } from '../types/game';
import { PlayerSelectionResults } from '../components/games/PlayerSelectionResults';
import { useRegistrationClose } from '../hooks/useRegistrationClose';
import { calculatePlayerXP } from '../utils/playerUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { RegisteredPlayers } from '../components/game/RegisteredPlayers';
import { motion } from 'framer-motion';

const Game = () => {
  const [upcomingGame, setUpcomingGame] = useState<GameType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerData, setPlayerData] = useState({
    registrations: [],
    selectedPlayers: [],
    reservePlayers: [],
    selectionNotes: [] as string[]
  });

  const fetchGameData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Starting game data fetch...');
      
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
        isRandomlySelected: reg.randomly_selected,
        status: reg.status
      }));

      setUpcomingGame(currentGame);

      // If players have been announced, fetch the selection results
      if (currentGame.status === 'players_announced') {
        const { data: selectionResults, error: selectionError } = await supabase
          .from('game_selections')
          .select('*')
          .eq('game_id', currentGame.id)
          .single();

        if (!selectionError && selectionResults) {
          console.log('Selection results:', selectionResults);
          console.log('Selection metadata:', selectionResults.selection_metadata);
          console.log('Selection notes:', selectionResults.selection_metadata?.selectionNotes);
          
          const notes = selectionResults.selection_metadata?.selectionNotes || [];
          console.log('Extracted notes:', notes);
          
          setPlayerData({
            registrations: processedPlayers,
            selectedPlayers: selectionResults.selected_players || [],
            reservePlayers: selectionResults.reserve_players || [],
            selectionNotes: notes
          });

          console.log('Updated player data with notes:', notes);
        } else {
          console.log('No selection results found or error:', selectionError);
          // Split into selected and reserve players based on status
          const selectedPlayers = processedPlayers.filter(p => 
            p.status === 'selected' || p.status === 'confirmed'
          );
          const reservePlayers = processedPlayers.filter(p => 
            p.status === 'reserve'
          );
          
          setPlayerData({
            registrations: processedPlayers,
            selectedPlayers,
            reservePlayers,
            selectionNotes: []
          });
        }
      } else {
        setPlayerData({
          registrations: processedPlayers,
          selectedPlayers: [],
          reservePlayers: [],
          selectionNotes: []
        });
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

  const handleDebugDownload = () => {
    if (!upcomingGame || !playerData.selectedPlayers.length) return;

    const debugData = {
      gameSettings: {
        maxPlayers: upcomingGame.max_players,
        randomSlots: upcomingGame.random_slots,
        date: upcomingGame.date,
        registrationWindow: {
          start: upcomingGame.registration_window_start,
          end: upcomingGame.registration_window_end
        }
      },
      selectionResults: {
        selectedPlayers: playerData.selectedPlayers.map((player, index) => ({
          position: index + 1,
          name: player.friendly_name,
          xp: player.xp,
          stats: player.stats,
          selectionReason: player.isRandomlySelected ? 'Random Selection' : 'Merit Selection (XP)',
          explanation: player.isRandomlySelected 
            ? `Selected randomly from remaining players after merit selection`
            : `Selected by merit with ${player.xp.toFixed(1)} XP`
        })),
        reservePlayers: playerData.reservePlayers.map(player => ({
          name: player.friendly_name,
          xp: player.xp,
          stats: player.stats,
          xpNeededForMerit: Math.max(0, 14 - player.xp).toFixed(1),
          explanation: `Reserve - Needs ${Math.max(0, 14 - player.xp).toFixed(1)} more XP for merit selection`
        })),
        selectionProcess: {
          meritThreshold: 14.0,
          totalPlayers: playerData.registrations.length,
          meritSlots: 16,
          randomSlots: 2,
          adjustedRandomSlots: playerData.selectionNotes?.some(note => note.includes('Random slots reduced')) ? 1 : 2,
          tiedPlayers: playerData.selectedPlayers
            .filter(p => Math.abs(p.xp - 15.0) < 0.01)
            .map(p => p.friendly_name),
          notes: playerData.selectionNotes || []
        }
      }
    };

    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-selection-debug-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {isLoading ? (
        <div className="text-center">Loading...</div>
      ) : upcomingGame ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GameDetails game={upcomingGame} />

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
                <RegisteredPlayers 
                  registrations={playerData.registrations} 
                  selectionNotes={playerData.selectionNotes}
                />
              </div>
            </>
          )}

          {/* After registration closes */}
          {upcomingGame.status === 'players_announced' && playerData?.selectedPlayers?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Player Selection Results</h2>
              <div className="space-y-8">
                <div className="flex justify-end">
                  <button
                    onClick={handleDebugDownload}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center space-x-2"
                  >
                    <span>Download Debug Data</span>
                  </button>
                </div>
                {playerData.selectionNotes && playerData.selectionNotes.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Selection Notes:</h3>
                    <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                      {playerData.selectionNotes.map((note, i) => {
                        console.log('Rendering note:', note);
                        return <li key={i}>{note}</li>;
                      })}
                    </ul>
                  </div>
                )}
                <PlayerSelectionResults 
                  selectedPlayers={playerData.selectedPlayers}
                  reservePlayers={playerData.reservePlayers}
                />
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="text-center text-xl">No upcoming games found.</div>
      )}
    </div>
  );
};

export default Game;