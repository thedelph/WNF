import React from 'react'
import { Tooltip } from '../../../ui/Tooltip'
import { Player, ReservePlayer, DropoutPlayer } from '../types'

interface Props {
  availablePlayers: Player[]
  reservePlayers: ReservePlayer[]
  dropoutPlayers: DropoutPlayer[]
  onAddReserve: (player: Player, isWhatsApp: boolean) => void
  onRemoveReserve: (playerId: string) => void
  onAddDropout: (player: Player) => void
  onRemoveDropout: (playerId: string) => void
  onDropoutReasonChange: (playerId: string, reason: string) => void
  disabledPlayerIds: string[]
}

export const PlayerStatusLists: React.FC<Props> = ({
  availablePlayers,
  reservePlayers,
  dropoutPlayers,
  onAddReserve,
  onRemoveReserve,
  onAddDropout,
  onRemoveDropout,
  onDropoutReasonChange,
  disabledPlayerIds
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center gap-2">
          Reserve Players
          <Tooltip content="Players who were available but not selected. WhatsApp members get priority in reserves list." side="right">
            <span className="cursor-help">ℹ️</span>
          </Tooltip>
        </legend>
        <div className="flex flex-col gap-2">
          <div className="join">
            <select
              className="select join-item"
              onChange={(e) => {
                const player = availablePlayers.find(p => p.id === e.target.value)
                if (player) {
                  onAddReserve(player, true)
                  e.target.value = ''
                }
              }}
            >
              <option value="">Add WhatsApp Member...</option>
              {availablePlayers
                .filter(p => !disabledPlayerIds.includes(p.id))
                .map(player => (
                  <option key={player.id} value={player.id}>
                    {player.friendly_name}
                  </option>
                ))}
            </select>
            <select
              className="select join-item"
              onChange={(e) => {
                const player = availablePlayers.find(p => p.id === e.target.value)
                if (player) {
                  onAddReserve(player, false)
                  e.target.value = ''
                }
              }}
            >
              <option value="">Add Non-WhatsApp Member...</option>
              {availablePlayers
                .filter(p => !disabledPlayerIds.includes(p.id))
                .map(player => (
                  <option key={player.id} value={player.id}>
                    {player.friendly_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            {reservePlayers.map(player => (
              <div key={player.id} className="flex items-center gap-2 bg-base-200 p-2 rounded-lg">
                <span className={`flex-1 ${player.isWhatsAppMember ? 'text-success' : ''}`}>
                  {player.name} {player.isWhatsAppMember ? '(WhatsApp)' : ''}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => onRemoveReserve(player.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center gap-2">
          Dropouts
          <Tooltip content="Players who registered but dropped out or were removed." side="right">
            <span className="cursor-help">ℹ️</span>
          </Tooltip>
        </legend>
        <div className="flex flex-col gap-2">
          <select
            className="select w-full"
            onChange={(e) => {
              const player = availablePlayers.find(p => p.id === e.target.value)
              if (player) {
                onAddDropout(player)
                e.target.value = ''
              }
            }}
          >
            <option value="">Add Dropout...</option>
            {availablePlayers
              .filter(p => !disabledPlayerIds.includes(p.id))
              .map(player => (
                <option key={player.id} value={player.id}>
                  {player.friendly_name}
                </option>
              ))}
          </select>
          <div className="flex flex-col gap-2">
            {dropoutPlayers.map(player => (
              <div key={player.id} className="flex items-center gap-2 bg-base-200 p-2 rounded-lg">
                <span className="flex-1">{player.name}</span>
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  className="input input-sm w-32"
                  value={player.reason || ''}
                  onChange={(e) => onDropoutReasonChange(player.id, e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => onRemoveDropout(player.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </fieldset>
    </div>
  )
}
