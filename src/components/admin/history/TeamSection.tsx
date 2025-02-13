import React from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { TeamSectionProps, PlayerWithTeam, StatusChange } from './types'
import { Tooltip } from '../../../components/ui/Tooltip'

export const TeamSection: React.FC<TeamSectionProps> = ({
  players,
  teamColor,
  onTeamChange,
  onStatusChange,
  onPaymentStatusChange,
  showUnassigned
}) => {
  const filteredPlayers = showUnassigned
    ? players.filter(p => !p.team)
    : players.filter(p => p.team === teamColor)

  const handleStatusChange = (player: PlayerWithTeam, newStatus: PlayerWithTeam['status']) => {
    const now = new Date().toISOString()
    const isGameDay = true // This will be determined by comparing with game date

    // Create status change object if needed
    let statusChange: StatusChange | undefined

    if (player.status === 'selected' && newStatus === 'reserve_declined') {
      statusChange = {
        playerId: player.id,
        fromStatus: 'selected',
        toStatus: 'dropped_out',
        changeType: 'dropout',
        timestamp: now,
        isGameDay
      }
    } else if (player.status === 'reserve_no_offer') {
      if (newStatus === 'selected') {
        statusChange = {
          playerId: player.id,
          fromStatus: 'reserve',
          toStatus: 'selected',
          changeType: 'slot_response',
          timestamp: now,
          isGameDay
        }
      } else if (newStatus === 'reserve_declined') {
        statusChange = {
          playerId: player.id,
          fromStatus: 'reserve',
          toStatus: 'rejected',
          changeType: 'slot_response',
          timestamp: now,
          isGameDay
        }
      }
    }

    onStatusChange(player.id, newStatus, statusChange)
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

  return (
    <div className="space-y-4">
      {filteredPlayers.map(player => (
        <motion.div
          key={player.id}
          className="bg-white rounded-lg shadow p-4"
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center justify-between">
            <Tooltip content={getStatusChangeInfo(player)}>
              <div className="font-medium">{player.friendly_name}</div>
            </Tooltip>

            <div className="flex space-x-2">
              {/* Team Selection */}
              <select
                value={player.team || ''}
                onChange={(e) => onTeamChange(player.id, e.target.value as 'blue' | 'orange' | null)}
                className="rounded border p-1"
              >
                <option value="">No Team</option>
                <option value="blue">Blue</option>
                <option value="orange">Orange</option>
              </select>

              {/* Status Selection */}
              <select
                value={player.status}
                onChange={(e) => handleStatusChange(player, e.target.value as PlayerWithTeam['status'])}
                className="rounded border p-1"
              >
                <option value="selected">Selected</option>
                <option value="reserve_no_offer">Reserve - No Slot Offer</option>
                <option value="reserve_declined">Reserve - Declined Slot</option>
              </select>

              {/* Payment Status */}
              <select
                value={player.payment_status}
                onChange={(e) => onPaymentStatusChange(player.id, e.target.value as 'unpaid' | 'marked_paid' | 'admin_verified')}
                className="rounded border p-1"
              >
                <option value="unpaid">Unpaid</option>
                <option value="marked_paid">Marked Paid</option>
                <option value="admin_verified">Admin Verified</option>
              </select>
            </div>
          </div>

          {/* Status Change History */}
          {player.statusChanges?.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              <div className="font-medium mb-1">Status Changes:</div>
              {getStatusChangeInfo(player)}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
