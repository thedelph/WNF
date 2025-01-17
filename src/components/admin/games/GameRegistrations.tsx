import React from 'react';
import { motion } from 'framer-motion';
import { supabase, supabaseAdmin } from '../../../utils/supabase';
import { getRarity } from '../../../utils/rarityCalculations';
import { PlayerCard } from '../../player-card/PlayerCard';
import { ExtendedPlayerData } from '../../../types/playerSelection';
import { Modal } from '../../common/modals/Modal';
import { SearchBar } from '../../common/inputs/SearchBar';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';
import { FaCheckSquare, FaSquare, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { useAdmin } from '../../../hooks/useAdmin';

interface GameRegistrationsProps {
  gameId: string;
  onClose: () => void;
}

export const GameRegistrations: React.FC<GameRegistrationsProps> = ({
  gameId,
  onClose,
}) => {
  const { session } = useAuth();
  const { isAdmin } = useAdmin();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [registrations, setRegistrations] = React.useState<ExtendedPlayerData[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSelectAll, setIsSelectAll] = React.useState(false);
  const [filteredPlayers, setFilteredPlayers] = React.useState<Array<{ id: string; friendly_name: string }>>([]);
  const [isOpen, setIsOpen] = React.useState(true);
  const [players, setPlayers] = React.useState<Array<{ id: string; friendly_name: string }>>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Function to fetch registrations
  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the registrations for this game
      const { data: registrations, error } = await supabase
        .from('game_registrations')
        .select(`
          id,
          game_id,
          player_id,
          status,
          selection_method,
          team,
          player_stats!game_registrations_player_id_fkey (
            id,
            friendly_name,
            xp,
            caps,
            active_bonuses,
            active_penalties,
            win_rate,
            current_streak,
            max_streak,
            avatar_svg
          )
        `)
        .eq('game_id', gameId)
        .order('status', { ascending: false });

      if (error) throw error;

      // Get rarity data from player_xp
      const playerIds = registrations?.map(reg => reg.player_stats.id) || [];
      const { data: xpData, error: xpError } = await supabase
        .from('player_xp')
        .select('player_id, rarity')
        .in('player_id', playerIds);

      if (xpError) throw xpError;

      // Create a map of player IDs to rarity
      const rarityMap = xpData?.reduce((acc, xp) => ({
        ...acc,
        [xp.player_id]: xp.rarity
      }), {});

      // Transform the registrations data
      const transformedRegistrations = registrations?.map(reg => ({
        id: reg.id,
        gameId: reg.game_id,
        playerId: reg.player_id,
        status: reg.status,
        selectionMethod: reg.selection_method,
        team: reg.team,
        player: {
          id: reg.player_stats.id,
          friendlyName: reg.player_stats.friendly_name,
          xp: reg.player_stats.xp || 0,
          caps: reg.player_stats.caps || 0,
          activeBonuses: reg.player_stats.active_bonuses || 0,
          activePenalties: reg.player_stats.active_penalties || 0,
          winRate: reg.player_stats.win_rate || 0,
          currentStreak: reg.player_stats.current_streak || 0,
          maxStreak: reg.player_stats.max_streak || 0,
          avatarSvg: reg.player_stats.avatar_svg || '',
          rarity: rarityMap?.[reg.player_stats.id] || 'Amateur'
        }
      }));

      setRegistrations(transformedRegistrations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching registrations');
    } finally {
      setLoading(false);
    }
  };

  // Function to generate random test game registrations
  const generateRandomTestGame = async () => {
    const toastId = toast.loading('Selecting random players...');
    try {
      setLoading(true);

      // SQL query to get random players with weighted probabilities
      const { data: randomPlayers, error: randomError } = await supabaseAdmin.rpc('get_random_weighted_players');

      if (randomError) throw randomError;

      // Get the IDs of players that are available (not already registered)
      const registeredPlayerIds = registrations.map(reg => reg.playerId);
      const availableRandomPlayers = randomPlayers.filter(player => !registeredPlayerIds.includes(player.id));

      if (availableRandomPlayers.length === 0) {
        toast.error('No available players to select', { id: toastId });
        return;
      }

      // Select these players in the UI
      setSelectedPlayerIds(availableRandomPlayers.map(player => player.id));
      setIsSelectAll(false); // Reset select all state since we're selecting specific players

      toast.success(`${availableRandomPlayers.length} players selected randomly!`, { id: toastId });
    } catch (err) {
      toast.error('Failed to select random players', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (gameId) {
      fetchRegistrations();
      // Refresh registrations every 30 seconds
      const interval = setInterval(fetchRegistrations, 30000);
      return () => clearInterval(interval);
    }
  }, [gameId]);

  React.useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('players')
          .select('id, friendly_name')
          .order('friendly_name');

        if (error) throw error;
        setPlayers(data || []);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  React.useEffect(() => {
    // Filter available players whenever registrations or players change
    // Filter out already registered players by their IDs
    const registeredPlayerIds = registrations.map(reg => reg.playerId);
    const availablePlayers = players.filter(player =>
      !registeredPlayerIds.includes(player.id)
    );

    // Apply search filter if there's a search term
    const searchFiltered = searchTerm
      ? availablePlayers.filter(player =>
          player.friendly_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : availablePlayers;

    setFilteredPlayers(searchFiltered);
  }, [players, registrations, searchTerm]);

  const handlePlayerSelect = (id: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(playerId => playerId !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedPlayerIds([])
    } else {
      setSelectedPlayerIds(filteredPlayers.map(player => player.id))
    }
    setIsSelectAll(!isSelectAll)
  }

  const handleRegister = async () => {
    try {
      if (!session) {
        toast.error('You must be logged in to register players');
        return;
      }

      if (selectedPlayerIds.length === 0) {
        toast.error('No players selected');
        return;
      }

      // First check for existing registrations
      const { data: existingRegistrations, error: checkError } = await supabaseAdmin
        .from('game_registrations')
        .select('player_id')
        .eq('game_id', gameId)
        .in('player_id', selectedPlayerIds);

      if (checkError) {
        toast.error(`Failed to check existing registrations: ${checkError.message}`);
        return;
      }

      // Filter out already registered players
      const existingPlayerIds = existingRegistrations?.map(reg => reg.player_id) || [];
      const newPlayerIds = selectedPlayerIds.filter(id => !existingPlayerIds.includes(id));

      if (newPlayerIds.length === 0) {
        toast.warning('Selected players are already registered');
        return;
      }

      if (existingPlayerIds.length > 0) {
        toast.warning(`${existingPlayerIds.length} player(s) are already registered for the game.`);
        return;
      }

      // Insert only new registrations using admin client
      const { error: insertError } = await supabaseAdmin
        .from('game_registrations')
        .insert(
          newPlayerIds.map(playerId => ({
            game_id: gameId,
            player_id: playerId,
            status: 'registered',
            selection_method: 'none',
            team: null,
            created_at: new Date().toISOString()
          }))
        );

      if (insertError) throw insertError;

      toast.success(`${newPlayerIds.length} player(s) registered successfully!`);
      fetchRegistrations(); // Refresh registrations
      setSelectedPlayerIds([]);
      setIsSelectAll(false);
    } catch (error) {
      toast.error(`Failed to register players: ${error.message}`);
    }
  }

  const handleUnregister = async (registrationId: string) => {
    try {
      if (!session) {
        toast.error('You must be logged in to unregister players');
        return;
      }

      const { error } = await supabaseAdmin
        .from('game_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      toast.success('Player unregistered successfully');
      fetchRegistrations(); // Refresh registrations
    } catch (error) {
      toast.error(`Failed to unregister player: ${error.message}`);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        onClose();
      }}
      title="Game Registrations"
      className="w-full max-w-[95vw] md:max-w-4xl mx-auto"
    >
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      )}

      {error && (
        <div className="text-center text-error p-4">
          <p>{error}</p>
        </div>
      )}

      {!session && (
        <div className="text-center text-error p-4">
          <p>You must be logged in to manage registrations</p>
        </div>
      )}

      {!loading && !error && session && (
        <div className="space-y-6">
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={generateRandomTestGame}
                className="btn btn-secondary"
                disabled={loading}
              >
                Generate Test Game
              </motion.button>
            </div>
          )}

          <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="flex-grow">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search players..."
                className="w-full"
              />
            </div>
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSelectAll}
                className="btn btn-outline btn-sm"
              >
                {isSelectAll ? <FaCheckSquare className="mr-2" /> : <FaSquare className="mr-2" />}
                {isSelectAll ? 'Deselect All' : 'Select All'}
              </motion.button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <PlayerSelectionPanel
              title="Available Players"
              players={filteredPlayers}
              selectedPlayerIds={selectedPlayerIds}
              onPlayerSelect={handlePlayerSelect}
              className="h-[40vh] sm:h-[50vh] lg:h-80"
            />
            <div>
              <h3 className="font-bold mb-2 text-base sm:text-lg">Registered Players</h3>
              <div className="h-[40vh] sm:h-[50vh] lg:h-80 overflow-y-auto border border-base-300 rounded-lg p-2">
                <div className="space-y-1">
                  {registrations.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-2 sm:p-3 rounded text-sm sm:text-base ${
                        player.status === 'selected' ? 'bg-base-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2 flex-grow mr-2">
                        <span className="font-medium truncate">{player.player.friendlyName}</span>
                        {player.status === 'selected' && (
                          <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                            player.selectionMethod === 'random'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {player.selectionMethod === 'random' ? 'Random' : 'Merit'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnregister(player.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                        aria-label="Unregister player"
                      >
                        <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRegister}
              className="btn btn-primary w-full sm:w-auto text-sm sm:text-base py-2 px-3 sm:py-3 sm:px-4"
              disabled={selectedPlayerIds.length === 0}
            >
              Register Selected ({selectedPlayerIds.length})
            </motion.button>
          </div>

          <div className="space-y-8">
            {/* Unassigned Players */}
            {registrations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-bold">Unassigned Players ({registrations.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {registrations.map(player => (
                    <PlayerCard key={player.id} {...player.player} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Teams */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Blue Team */}
              {registrations.filter(player => player.team === 'blue').length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="space-y-4"
                >
                  <h3 className="text-xl font-bold text-blue-500">Blue Team ({registrations.filter(player => player.team === 'blue').length})</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {registrations.filter(player => player.team === 'blue').map(player => (
                      <PlayerCard key={player.id} {...player.player} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Orange Team */}
              {registrations.filter(player => player.team === 'orange').length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="space-y-4"
                >
                  <h3 className="text-xl font-bold text-orange-500">Orange Team ({registrations.filter(player => player.team === 'orange').length})</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {registrations.filter(player => player.team === 'orange').map(player => (
                      <PlayerCard key={player.id} {...player.player} />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {registrations.length === 0 && (
            <div className="col-span-3 text-center py-8">
              <p className="text-gray-500">No registrations found</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};