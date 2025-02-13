import React from 'react'
import { format } from 'date-fns'
import { Tooltip } from '../../ui/Tooltip'

interface StatusChange {
  id: string
  player_id: string
  game_id: string
  from_status: string
  to_status: string
  change_type: 'dropout' | 'slot_response'
  is_game_day: boolean
  created_at: string
  player: {
    id: string
    friendly_name: string
  }
}

interface StatusChangeHistoryProps {
  changes: StatusChange[]
}

export const StatusChangeHistory: React.FC<StatusChangeHistoryProps> = ({ changes = [] }) => {
  // Group changes by type
  const dropouts = (changes || []).filter(c => c.change_type === 'dropout')
  const slotResponses = (changes || []).filter(c => c.change_type === 'slot_response')

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (!changes?.length) {
    return (
      <div className="text-sm text-base-content/70">
        No status changes recorded yet
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dropouts */}
      {dropouts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Dropouts</h3>
          <div className="space-y-2">
            {dropouts.map((change) => (
              <div key={change.id} className="flex items-center justify-between bg-base-100 p-2 rounded">
                <div>
                  <span className="font-medium">{change.player?.friendly_name || 'Unknown Player'}</span>
                  <span className="text-sm text-base-content/70 ml-2">
                    dropped out on {format(new Date(change.created_at), 'MMM d, yyyy')}
                  </span>
                  <Tooltip content={`Dropout recorded ${change.is_game_day ? 'on' : 'before'} game day`}>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                      change.is_game_day 
                        ? 'bg-error/20 text-error' 
                        : 'bg-warning/20 text-warning'
                    }`}>
                      {change.is_game_day ? 'Game Day Dropout' : 'Pre-Game Dropout'}
                    </span>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slot Responses */}
      {slotResponses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Reserve Responses</h3>
          <div className="space-y-2">
            {slotResponses.map((change) => (
              <div key={change.id} className="flex items-center justify-between bg-base-100 p-2 rounded">
                <div className="flex-1">
                  <span className="font-medium">{change.player?.friendly_name || 'Unknown Player'}</span>
                  <span className="text-sm text-base-content/70 ml-2">
                    {change.to_status === 'selected' ? 'accepted' : 'declined'} slot on{' '}
                    {format(new Date(change.created_at), 'MMM d, yyyy')}
                  </span>
                  <Tooltip content={`Response received ${change.is_game_day ? 'on' : 'before'} game day`}>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                      change.is_game_day 
                        ? 'bg-error/20 text-error' 
                        : 'bg-warning/20 text-warning'
                    }`}>
                      {change.is_game_day ? 'Game Day Response' : 'Pre-Game Response'}
                    </span>
                  </Tooltip>
                </div>
                <div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    change.to_status === 'selected'
                      ? 'bg-success/20 text-success'
                      : 'bg-error/20 text-error'
                  }`}>
                    {change.to_status === 'selected' ? 'Accepted' : 'Declined'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
