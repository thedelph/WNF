import React from 'react'
import { Tooltip } from '../../ui/Tooltip'
import { TeamSectionProps } from './types'

export const TeamSection: React.FC<TeamSectionProps> = ({
  players,
  teamColor,
  onTeamChange,
  onStatusChange,
  onPaymentStatusChange,
  showUnassigned
}) => {
  // Filter players based on team and status
  const teamPlayers = players.filter(p => p.team === teamColor)
  const reservePlayers = players.filter(p => p.status?.startsWith('reserve_'))
  const unassignedPlayers = players.filter(p => !p.team && !p.status?.startsWith('reserve_'))

  const handleTeamStatusChange = (playerId: string, value: string) => {
    if (value === 'reserve_no_offer' || value === 'reserve_declined') {
      onTeamChange(playerId, null)
      onStatusChange(playerId, value)
    } else if (value === '') {
      onTeamChange(playerId, null)
      onStatusChange(playerId, 'registered')
    } else {
      onTeamChange(playerId, value as 'blue' | 'orange')
      onStatusChange(playerId, 'selected')
    }
  }

  const renderPlayerRow = (player: any) => (
    <div key={player.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
      <div className="w-32">
        <span>{player.friendly_name}</span>
      </div>
      <div className="w-40">
        <Tooltip content={
          player.status === 'reserve_no_offer' ? "Player is on reserve list - no slot offered yet" :
          player.status === 'reserve_declined' ? "Player was offered a slot but declined" :
          player.team ? `Playing on ${player.team} team` :
          "Assign player to a team or set reserve status"
        }>
          <select
            value={player.status?.startsWith('reserve_') ? player.status : player.team || ''}
            onChange={(e) => handleTeamStatusChange(player.id, e.target.value)}
            className={`select select-bordered select-sm w-full ${
              player.team === teamColor ? 'select-primary' : ''
            }`}
          >
            <option value="">Not Playing</option>
            <option value="blue">Blue Team</option>
            <option value="orange">Orange Team</option>
            <option value="reserve_no_offer">Reserve - No Slot Offer</option>
            <option value="reserve_declined">Reserve - Declined Slot</option>
          </select>
        </Tooltip>
      </div>
      <div className="w-40">
        <Tooltip content="Player's payment status">
          <select
            value={player.payment_status}
            onChange={(e) => onPaymentStatusChange(player.id, e.target.value as 'unpaid' | 'marked_paid' | 'admin_verified')}
            className="select select-bordered select-sm w-full"
          >
            <option value="unpaid">Unpaid</option>
            <option value="marked_paid">Marked Paid</option>
            <option value="admin_verified">Admin Verified</option>
          </select>
        </Tooltip>
      </div>
    </div>
  )

  if (showUnassigned) {
    return (
      <div className="flex flex-col gap-4">
        {/* Unassigned Players */}
        {unassignedPlayers.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-600">Available Players</h4>
            {unassignedPlayers.map(renderPlayerRow)}
          </div>
        )}

        {/* Reserve Players */}
        {reservePlayers.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-600">Reserve Players</h4>
            {reservePlayers.map(renderPlayerRow)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <h3 className={`text-lg font-semibold ${teamColor === 'blue' ? 'text-blue-500' : 'text-orange-500'}`}>
        {teamColor === 'blue' ? 'Blue Team' : 'Orange Team'} ({teamPlayers.length})
      </h3>
      
      <div className="flex flex-col gap-4">
        {/* Team Players */}
        {teamPlayers.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Players</h4>
            {teamPlayers.map(renderPlayerRow)}
          </div>
        )}
      </div>
    </div>
  )
}
