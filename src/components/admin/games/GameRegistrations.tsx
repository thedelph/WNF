import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameRegistration } from '../../../types/game'
import { FaUserPlus, FaUserMinus, FaTimes, FaSearch, FaCheckSquare, FaSquare } from 'react-icons/fa'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { calculatePlayerXP } from '../../../utils/xpCalculations'

interface Props {
  registrations: GameRegistration[]
  players: Array<{ id: string; friendly_name: string }>
  onRegister: (gameId: string, playerIds: string[]) => void
  onUnregister: (registrationId: string) => void
  onClose: () => void
  gameId: string
}

interface PlayerWithXP extends GameRegistration {
  xp: number;
  friendly_name: string;
  isRandomlySelected?: boolean;
}

export const GameRegistrations: React.FC<Props> = ({
  registrations,
  players,
  onRegister,
  onUnregister,
  onClose,
  gameId
}) => {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [filteredPlayers, setFilteredPlayers] = useState<Array<{ id: string; friendly_name: string }>>([])

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('Escape key pressed, calling onClose')
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [onClose])

  useEffect(() => {
    // Refresh the available players list by filtering out already registered players
    const availablePlayers = players.filter(player => 
      !registrations.some(reg => reg.player_id === player.id)
    );
    setFilteredPlayers(availablePlayers);
  }, [players, registrations]);

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
        toast.error('Failed to check existing registrations');
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
        .insert(newPlayerIds.map(playerId => ({
          game_id: gameId,
          player_id: playerId,
          status: 'registered',
          team: null,
          created_at: new Date().toISOString()
        })))
        .select()

      if (error) throw error

      toast.success(`${newPlayerIds.length} player(s) registered successfully!`)
      onRegister(gameId, newPlayerIds)
      setSelectedPlayerIds([])
      setIsSelectAll(false)
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Failed to register players')
    }
  }

  const handleUnregister = async (registrationId: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('game_registrations')
        .delete()
        .eq('id', registrationId)

      if (error) throw error

      toast.success('Player unregistered successfully')
      onUnregister(registrationId)
    } catch (error) {
      console.error('Unregistration error:', error)
      toast.error('Failed to unregister player')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Game Registrations</h2>
          <motion.button 
            onClick={() => {
              console.log('Close button clicked')
              onClose()
            }}
            className="btn btn-ghost"
          >
            <FaTimes />
          </motion.button>
        </div>

        <div className="mb-4 flex items-center space-x-2">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
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
          <div>
            <h3 className="font-bold mb-2">Available Players</h3>
            <div className="h-80 overflow-y-auto border border-base-300 rounded-lg">
              <AnimatePresence>
                {filteredPlayers.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-center justify-between p-2 hover:bg-base-200 cursor-pointer ${
                      selectedPlayerIds.includes(player.id) ? 'bg-primary text-primary-content' : ''
                    }`}
                    onClick={() => handlePlayerSelect(player.id)}
                  >
                    <span>{player.friendly_name}</span>
                    {selectedPlayerIds.includes(player.id) ? (
                      <FaCheckSquare className="text-primary-content" />
                    ) : (
                      <FaSquare className="text-base-content" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">Selected Players</h3>
            <div className="h-80 overflow-y-auto border border-base-300 rounded-lg">
              <AnimatePresence>
                {registrations
                  .filter(reg => reg.status === 'selected')
                  .sort((a, b) => {
                    const aXP = calculatePlayerXP(players.find(p => p.id === a.player_id));
                    const bXP = calculatePlayerXP(players.find(p => p.id === b.player_id));
                    return bXP - aXP; // Sort by XP descending
                  })
                  .map((reg, index) => {
                    const player = players.find(p => p.id === reg.player_id);
                    const xp = calculatePlayerXP(player);
                    
                    return (
                      <motion.div
                        key={reg.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`flex justify-between items-center p-2 ${
                          reg.randomly_selected 
                            ? 'bg-secondary bg-opacity-20 border-l-4 border-secondary' 
                            : 'hover:bg-base-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-mono w-6">{index + 1}.</span>
                          <span>{player?.friendly_name}</span>
                          {reg.randomly_selected && (
                            <span className="px-2 py-1 text-xs bg-secondary text-secondary-content rounded-full">
                              Random Pick
                            </span>
                          )}
                          <span className="text-sm text-base-content/70">
                            XP: {xp.toFixed(1)}
                          </span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleUnregister(reg.id)}
                          className="btn btn-ghost btn-xs"
                        >
                          <FaUserMinus className="text-error" />
                        </motion.button>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
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
      </motion.div>
    </motion.div>
  )
}