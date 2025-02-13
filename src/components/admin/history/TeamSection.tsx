import React from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { TeamSectionProps, PlayerWithTeam, StatusChange } from './types'
import { Tooltip } from '../../../components/ui/Tooltip'
import { StatusChangeForm } from './StatusChangeForm'

export interface TeamSectionProps {
  players: PlayerWithTeam[]
  teamColor?: 'blue' | 'orange'
  showUnassigned?: boolean
  gameDate: Date
  onTeamChange: (playerId: string, team: 'blue' | 'orange' | null) => void
  onStatusChange: (playerId: string, status: PlayerWithTeam['status'], changeDate: Date, isGameDay: boolean, wasReserve?: boolean) => void
  onPaymentStatusChange: (playerId: string, status: 'unpaid' | 'marked_paid' | 'admin_verified') => void
  onRemovePlayer: (playerId: string) => void
}

export const TeamSection: React.FC<TeamSectionProps> = ({
  players,
  teamColor,
  onTeamChange,
  onStatusChange,
  onPaymentStatusChange,
  onRemovePlayer,
  showUnassigned,
  gameDate
}) => {
  const filteredPlayers = showUnassigned
    ? players.filter(p => !p.team)
    : players.filter(p => p.team === teamColor)

  if (filteredPlayers.length === 0) {
    return (
      <div className="text-sm opacity-70">No players</div>
    )
  }

  const getStatusChangeInfo = (player: PlayerWithTeam) => {
    if (!player.statusChanges?.length) return null

    return player.statusChanges.map((change, index) => {
      let description = ''
      if (change.changeType === 'dropout') {
        description = `Dropped out ${change.isGameDay ? 'on' : 'before'} game day`
      } else if (change.changeType === 'slot_response') {
        if (change.toStatus === 'selected') {
          description = `Accepted slot ${change.isGameDay ? 'on' : 'before'} game day`
        } else {
          description = `Declined slot ${change.isGameDay ? 'on' : 'before'} game day`
        }
      }

      return (
        <div key={index} className="mb-1">
          <span>{description}</span>
          <span className="text-sm text-gray-500 ml-2">
            {format(new Date(change.timestamp), 'MMM d, HH:mm')}
          </span>
        </div>
      )
    })
  }

  const formatStatus = (status?: string): string => {
    if (!status) return 'Registered'
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="flex flex-col gap-4">
      {filteredPlayers.map((player) => (
        <div key={player.id} className="card bg-base-200 shadow-md">
          <div className="card-body p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{player.friendly_name}</h3>
                <div className="text-sm opacity-70">Status: {formatStatus(player.status)}</div>
              </div>
              <div className="flex flex-col gap-2">
                {/* Team selection dropdown */}
                <select
                  value={player.team || ''}
                  onChange={(e) => onTeamChange(player.id, e.target.value as 'blue' | 'orange' | null)}
                  className="select select-sm"
                >
                  <option value="">Unassigned</option>
                  <option value="blue">Blue Team</option>
                  <option value="orange">Orange Team</option>
                </select>

                {/* Payment status dropdown */}
                <select
                  value={player.payment_status || 'unpaid'}
                  onChange={(e) => onPaymentStatusChange(player.id, e.target.value as 'unpaid' | 'marked_paid' | 'admin_verified')}
                  className="select select-sm"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="marked_paid">Marked Paid</option>
                  <option value="admin_verified">Admin Verified</option>
                </select>

                {/* Status change form */}
                <StatusChangeForm
                  currentStatus={player.status || 'registered'}
                  playerName={player.friendly_name}
                  gameDate={gameDate}
                  onStatusChange={(newStatus, changeDate, isGameDay, wasReserve) => 
                    onStatusChange(player.id, newStatus, changeDate, isGameDay, wasReserve)
                  }
                />

                {/* Remove button */}
                <Tooltip content="Remove player from game">
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="btn btn-error btn-sm"
                  >
                    Remove
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TeamSection
