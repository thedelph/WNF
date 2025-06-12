import React, { useState } from 'react'
import { PlayerStatus } from './types'
import { Tooltip } from '../../ui/Tooltip'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { StatusChangeDialog } from './StatusChangeDialog'

interface StatusChangeFormProps {
  currentStatus: PlayerStatus
  playerName: string
  gameDate: Date
  onStatusChange: (newStatus: PlayerStatus, changeDate: Date, isGameDay: boolean, wasReserve?: boolean) => void
}

// Component to handle player status changes including dropouts and reserve responses
export const StatusChangeForm: React.FC<StatusChangeFormProps> = ({
  currentStatus,
  playerName,
  gameDate,
  onStatusChange,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<PlayerStatus | null>(null)
  const [wasReserve, setWasReserve] = useState(false)

  // Helper function to determine which status options to show based on current status
  const getAvailableStatuses = (): { value: PlayerStatus; label: string; tooltip: string; isReserveAction?: boolean }[] => {
    const baseStatuses: { value: PlayerStatus; label: string; tooltip: string; isReserveAction?: boolean }[] = []

    if (currentStatus === 'selected') {
      baseStatuses.push({
        value: 'dropped_out',
        label: 'Dropped Out',
        tooltip: 'Mark this player as having dropped out'
      })
      baseStatuses.push({
        value: 'selected',
        label: 'Accepted Dropout Slot',
        tooltip: 'Mark this player as having accepted a dropout slot',
        isReserveAction: true
      })
    }
    else if (currentStatus === 'reserve') {
      baseStatuses.push({
        value: 'reserve_declined',
        label: 'Decline Slot',
        tooltip: 'Mark this player as having declined a slot',
        isReserveAction: true
      })
    }

    return baseStatuses
  }

  const handleStatusClick = (status: PlayerStatus, isReserveAction?: boolean) => {
    console.log('Status clicked:', status)
    console.log('Is reserve action:', isReserveAction)
    setPendingStatus(status)
    setWasReserve(!!isReserveAction)
    setDialogOpen(true)
  }

  const handleDialogConfirm = (changeDate: Date, isGameDay: boolean) => {
    console.log('Dialog confirmed')
    console.log('Change date:', changeDate)
    console.log('Is game day:', isGameDay)
    console.log('Pending status:', pendingStatus)
    console.log('Was reserve:', wasReserve)
    if (pendingStatus) {
      onStatusChange(pendingStatus, changeDate, isGameDay, wasReserve)
      setPendingStatus(null)
      setWasReserve(false)
    }
  }

  const availableStatuses = getAvailableStatuses()

  if (availableStatuses.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {availableStatuses.map(({ value, label, tooltip, isReserveAction }) => (
        <Tooltip key={value} content={tooltip}>
          <button
            onClick={() => handleStatusClick(value, isReserveAction)}
            className={`btn btn-sm ${
              value === 'dropped_out' || value === 'reserve_declined' 
                ? 'btn-error' 
                : value === 'selected' && isReserveAction 
                  ? 'btn-success'
                  : 'btn-primary'
            }`}
          >
            {label}
          </button>
        </Tooltip>
      ))}

      <StatusChangeDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setPendingStatus(null)
          setWasReserve(false)
        }}
        onConfirm={handleDialogConfirm}
        playerName={playerName}
        gameDate={gameDate}
        action={pendingStatus === 'dropped_out' ? 'dropout' : 
               pendingStatus === 'reserve_declined' ? 'decline' : 'accept'}
      />
    </div>
  )
}
