import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GameRegistration } from '../../../types/game'
import { FaUserPlus, FaUserMinus, FaTimes, FaCheckSquare, FaSquare } from 'react-icons/fa'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { calculatePlayerXP } from '../../../utils/xpCalculations'
import { Modal } from '../../common/modals/Modal'
import { SearchBar } from '../../common/inputs/SearchBar'
import { PlayerSelectionPanel } from './PlayerSelectionPanel'

interface Props {
  gameId: string
  onClose: () => void
}

interface PlayerWithXP extends GameRegistration {
  xp: number;
  friendly_name: string;
  isRandomlySelected?: boolean;
}

/**
 * Component for managing game registrations
 * Allows adding and removing players from a game
 */
export const GameRegistrations: React.FC<Props> = ({
  gameId,
  onClose,
}) => {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [filteredPlayers, setFilteredPlayers] = useState<Array<{ id: string; friendly_name: string }>>([])
  const [isOpen, setIsOpen] = useState(true)
  const [registrations, setRegistrations] = useState<GameRegistration[]>([])
  const [players, setPlayers] = useState<Array<{ id: string; friendly_name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch registrations and players when component mounts
  useEffect(() => {
    fetchRegistrations()
    fetchPlayers()
  }, [gameId])

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('game_registrations')
        .select(`
          id,
          game_id,
          player:players!game_registrations_player_id_fkey(
            id,
            friendly_name,
            caps,
            active_bonuses,
            active_penalties,
            current_streak
          ),
          status,
          selection_method,
          team
        `)
        .eq('game_id', gameId)

      if (error) throw error
      setRegistrations(data || [])
    } catch (error) {
      console.error('Error fetching registrations:', error)
      toast.error('Failed to fetch registrations')
    }
  }

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('players')
        .select('id, friendly_name')
        .order('friendly_name')

      if (error) throw error
      setPlayers(data || [])
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching players:', error)
      toast.error('Failed to fetch players')
      setIsLoading(false)
    }
  }

  // Filter available players whenever registrations or players change
  useEffect(() => {
    // Filter out already registered players by their IDs
    const registeredPlayerIds = registrations.map(reg => reg.player?.id);
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

      // Insert only new registrations
      const { data, error } = await supabaseAdmin
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
        )
        .select();

      if (error) throw error;

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

  // Calculate XP for registered players
  const registeredPlayers = registrations.map(reg => ({
    id: reg.id,
    friendly_name: reg.player?.friendly_name || '',
    xp: calculatePlayerXP({
      caps: reg.player?.caps || 0,
      activeBonuses: reg.player?.active_bonuses || 0,
      activePenalties: reg.player?.active_penalties || 0,
      currentStreak: reg.player?.current_streak || 0
    }),
    status: reg.status,
    selection_method: reg.selection_method
  })).sort((a, b) => b.xp - a.xp);

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Game Registrations">
        <div className="flex justify-center items-center p-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        onClose();
      }}
      title="Game Registrations"
    >
      <div className="mb-4 flex items-center space-x-2">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search players..."
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSelectAll}
          className="btn btn-outline"
        >
          {isSelectAll ? <FaCheckSquare className="mr-2" /> : <FaSquare className="mr-2" />}
          {isSelectAll ? 'Deselect All' : 'Select All'}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <PlayerSelectionPanel
          title="Available Players"
          players={filteredPlayers}
          selectedPlayerIds={selectedPlayerIds}
          onPlayerSelect={handlePlayerSelect}
        />
        <div>
          <h3 className="font-bold mb-2">Registered Players</h3>
          <div className="h-80 overflow-y-auto border border-base-300 rounded-lg p-2">
            <div className="space-y-1">
              {registeredPlayers.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded ${
                    player.status === 'selected' ? 'bg-base-200' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{player.friendly_name}</span>
                    {player.status === 'selected' && (
                      <span className={`text-xs px-2 py-1 rounded ${
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
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTimes />
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
          className="btn btn-primary"
          disabled={selectedPlayerIds.length === 0}
        >
          Register Selected Players ({selectedPlayerIds.length})
        </motion.button>
      </div>
    </Modal>
  )
}