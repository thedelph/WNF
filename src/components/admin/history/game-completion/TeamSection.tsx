import React from 'react'
import { TeamSectionProps } from './types'

export const TeamSection: React.FC<TeamSectionProps> = ({
  players,
  teamColor,
  onTeamChange,
  onPlayerSelection,
  onPaymentStatusChange
}) => {
  const bgColor = teamColor === 'blue' ? 'bg-blue-50' : 'bg-orange-50'
  const textColor = teamColor === 'blue' ? 'text-blue-700' : 'text-orange-700'

  return (
    <div className={`${bgColor} p-4 rounded-lg`}>
      <h5 className={`font-medium ${textColor} mb-3`}>
        {teamColor.charAt(0).toUpperCase() + teamColor.slice(1)} Team (
        {players.filter(p => p.team === teamColor).length})
      </h5>
      <div className="space-y-2">
        {players
          .filter(p => p.team === teamColor || !p.team)
          .map(player => (
            <div key={player.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={player.selected}
                  onChange={e => onPlayerSelection(player.id, e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                <span>{player.friendly_name}</span>
              </div>
              <select
                value={player.team || ''}
                onChange={e => onTeamChange(player.id, e.target.value as 'blue' | 'orange' | null)}
                className="select select-sm"
              >
                <option value="">No Team</option>
                <option value="blue">Blue</option>
                <option value="orange">Orange</option>
              </select>
              <select
                value={player.payment_status || 'unpaid'}
                onChange={e => onPaymentStatusChange(player.id, e.target.value as 'unpaid' | 'marked_paid' | 'admin_verified')}
                className="select select-sm"
              >
                <option value="unpaid">Unpaid</option>
                <option value="marked_paid">Marked Paid</option>
                <option value="admin_verified">Admin Verified</option>
              </select>
            </div>
          ))}
      </div>
    </div>
  )
}
