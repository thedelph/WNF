import React from 'react'
import { motion } from 'framer-motion'
import { Tooltip } from '../../../ui/Tooltip'
import { TeamPlayer, Player } from '../types'

interface Props {
  label: string
  players: Player[]
  selectedPlayers: TeamPlayer[]
  otherTeamPlayers: TeamPlayer[]
  onAddPlayer: (player: Player) => void
  onRemovePlayer: (playerId: string) => void
  onSelectionTypeChange: (playerId: string, type: 'merit' | 'random') => void
}

export const TeamPlayerList: React.FC<Props> = ({
  label,
  players,
  selectedPlayers,
  otherTeamPlayers,
  onAddPlayer,
  onRemovePlayer,
  onSelectionTypeChange
}) => {
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">{label}</span>
        <Tooltip content="Select players for this team. Mark players as 'Random Pick' if they were selected through random selection." side="right">
          <span className="label-text-alt cursor-help">ℹ️</span>
        </Tooltip>
      </label>
      <div className="flex flex-col gap-2">
        <select
          className="select select-bordered w-full"
          onChange={(e) => {
            const player = players.find(p => p.id === e.target.value)
            if (player) {
              onAddPlayer(player)
              e.target.value = ''
            }
          }}
        >
          <option value="">Add player...</option>
          {players
            .filter(p => !selectedPlayers.find(sp => sp.id === p.id) && 
                        !otherTeamPlayers.find(op => op.id === p.id))
            .map(player => (
              <option key={player.id} value={player.id}>
                {player.friendly_name}
              </option>
            ))}
        </select>
        <div className="flex flex-col gap-2">
          {selectedPlayers.map(player => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 bg-base-200 p-2 rounded-lg"
            >
              <span className="flex-1">{player.name}</span>
              <select
                className="select select-bordered select-sm"
                value={player.selectionType || 'merit'}
                onChange={(e) => onSelectionTypeChange(player.id, e.target.value as 'merit' | 'random')}
              >
                <option value="merit">Merit Pick</option>
                <option value="random">Random Pick</option>
              </select>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => onRemovePlayer(player.id)}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
