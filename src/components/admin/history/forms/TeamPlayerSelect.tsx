'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Player } from '../../../../types/player'

interface Props {
  players: Player[]
  selectedPlayers: {
    blue: string[]
    orange: string[]
  }
  onTeamPlayersChange: (team: 'blue' | 'orange', playerIds: string[]) => void
}

const TeamPlayerSelect: React.FC<Props> = ({
  players,
  selectedPlayers,
  onTeamPlayersChange
}) => {
  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {['blue', 'orange'].map((team) => (
        <div key={team} className="form-control">
          <label className="label">
            <span className="label-text font-semibold">{team.charAt(0).toUpperCase() + team.slice(1)} Team Players</span>
          </label>
          <select
            multiple
            value={selectedPlayers[team as 'blue' | 'orange']}
            onChange={(e) => onTeamPlayersChange(
              team as 'blue' | 'orange',
              Array.from(e.target.selectedOptions, option => option.value)
            )}
            className="select select-bordered h-48 overflow-y-auto"
          >
            {players.map(player => (
              <option 
                key={player.id} 
                value={player.id}
                disabled={selectedPlayers[team === 'blue' ? 'orange' : 'blue'].includes(player.id)}
                className={`py-2 px-4 ${selectedPlayers[team as 'blue' | 'orange'].includes(player.id) ? 'bg-primary text-primary-content' : ''}`}
              >
                {player.friendly_name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-2">
            Selected: {selectedPlayers[team as 'blue' | 'orange'].length}
          </p>
        </div>
      ))}
    </motion.div>
  )
}

export default TeamPlayerSelect