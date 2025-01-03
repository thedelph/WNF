import React from 'react';
import { motion } from 'framer-motion';
import { supabase, supabaseAdmin } from '../../../utils/supabase';
import { calculateRarity } from '../../../utils/rarityCalculations';
import PlayerCard from '../../PlayerCard';
import { ExtendedPlayerData } from '../../../types/playerSelection';
import { Modal } from '../../common/modals/Modal';
import { SearchBar } from '../../common/inputs/SearchBar';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';
import { FaCheckSquare, FaSquare, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';

interface GameRegistrationsProps {
  gameId: string;
  onClose: () => void;
}

export const GameRegistrations: React.FC<GameRegistrationsProps> = ({
  gameId,
  onClose,
}) => {
  const { session } = useAuth();
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
      const { data: registrationData, error: registrationError } = await supabase
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
        .eq('status', 'registered');

      if (registrationError) throw registrationError;

      // Calculate rarity based on all players' XP
      const { data: allXPData, error: xpError } = await supabase
        .from('player_stats')
        .select('xp');

      if (xpError) throw xpError;

      const allXP = allXPData.map(p => p.xp || 0);

      // Transform and enrich the data
      const enrichedRegistrations = registrationData.map(registration => {
        const playerStats = registration.player_stats;
        return {
          id: playerStats.id,
          friendly_name: playerStats.friendly_name,
          xp: playerStats.xp || 0,
          caps: playerStats.caps || 0,
          preferred_position: '', // Set empty string as default since we don't use this
          active_bonuses: playerStats.active_bonuses || 0,
          active_penalties: playerStats.active_penalties || 0,
          win_rate: playerStats.win_rate || 0,
          current_streak: playerStats.current_streak || 0,
          max_streak: playerStats.max_streak || 0,
          avatar_svg: playerStats.avatar_svg || '',
          rarity: calculateRarity(playerStats.xp || 0, allXP),
          team: registration.team,
          isRandomlySelected: registration.selection_method === 'random'
        };
      });

      setRegistrations(enrichedRegistrations);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching registrations');
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
        console.error('Error fetching players:', error);
        setIsLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  React.useEffect(() => {
    // Filter available players whenever registrations or players change
    // Filter out already registered players by their IDs
    const registeredPlayerIds = registrations.map(reg => reg.id);
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
        console.error('Error checking existing registrations:', checkError);
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
      console.error('Registration error:', error);
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
      console.error('Unregistration error:', error);
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
          <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="flex-grow">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search players..."
                className="w-full"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSelectAll}
              className="btn btn-outline text-sm sm:text-base py-2 px-3 sm:py-3 sm:px-4"
            >
              {isSelectAll ? <FaCheckSquare className="mr-2" /> : <FaSquare className="mr-2" />}
              {isSelectAll ? 'Deselect All' : 'Select All'}
            </motion.button>
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
                        <span className="font-medium truncate">{player.friendly_name}</span>
                        {player.status === 'selected' && (
                          <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                            player.selection_method === 'random'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {player.selection_method === 'random' ? 'Random' : 'Merit'}
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
                    <PlayerCard key={player.id} {...player} />
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
                      <PlayerCard key={player.id} {...player} />
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
                      <PlayerCard key={player.id} {...player} />
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