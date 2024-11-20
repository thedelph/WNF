import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaUsers, FaDice, FaTshirt } from 'react-icons/fa'

interface Player {
  id: string
  friendly_name: string
  xp: number
  preferred_position?: string
}

interface TeamSelectionResultsProps {
  selectedPlayers: {
    player: Player
    selection_type: 'random' | 'xp'
    team?: 'Blue' | 'Orange'
  }[]
  reservePlayers: Player[]
}

export const TeamSelectionResults: React.FC<TeamSelectionResultsProps> = ({
  selectedPlayers,
  reservePlayers
}) => {
  const blueTeam = selectedPlayers.filter(p => p.team === 'Blue')
  const orangeTeam = selectedPlayers.filter(p => p.team === 'Orange')

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Blue Team */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-100 p-6 rounded-lg shadow-lg"
        >
          <h2 className="text-2xl font-bold mb-4 text-blue-800 flex items-center">
            <FaTshirt className="mr-2" />
            Blue Team
          </h2>
          <div className="space-y-3">
            <AnimatePresence>
              {blueTeam.map((entry, index) => (
                <motion.div
                  key={entry.player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-4 rounded-lg shadow flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{entry.player.friendly_name}</span>
                    <span className="text-sm text-gray-600">
                      {entry.player.preferred_position || 'No position set'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm">XP: {entry.player.xp}</span>
                    <span className={`badge ${
                      entry.selection_type === 'random' 
                        ? 'badge-secondary' 
                        : 'badge-primary'
                    }`}>
                      {entry.selection_type === 'random' ? '🎲' : '📈'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Orange Team */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-orange-100 p-6 rounded-lg shadow-lg"
        >
          <h2 className="text-2xl font-bold mb-4 text-orange-800 flex items-center">
            <FaTshirt className="mr-2" />
            Orange Team
          </h2>
          <div className="space-y-3">
            <AnimatePresence>
              {orangeTeam.map((entry, index) => (
                <motion.div
                  key={entry.player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-4 rounded-lg shadow flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{entry.player.friendly_name}</span>
                    <span className="text-sm text-gray-600">
                      {entry.player.preferred_position || 'No position set'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm">XP: {entry.player.xp}</span>
                    <span className={`badge ${
                      entry.selection_type === 'random' 
                        ? 'badge-secondary' 
                        : 'badge-primary'
                    }`}>
                      {entry.selection_type === 'random' ? '🎲' : '📈'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Reserves Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-base-200 p-6 rounded-lg shadow-lg"
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <FaUsers className="mr-2" />
          Reserve List
        </h2>
        <div className="space-y-3">
          <AnimatePresence>
            {reservePlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-4 rounded-lg shadow flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{player.friendly_name}</span>
                  <span className="text-sm text-gray-600">
                    {player.preferred_position || 'No position set'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm">XP: {player.xp}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
