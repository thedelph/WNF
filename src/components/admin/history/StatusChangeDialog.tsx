import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { format } from 'date-fns'

interface StatusChangeDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (date: Date, isGameDay: boolean) => void
  playerName: string
  gameDate: Date
  action: 'dropout' | 'decline' | 'accept'
}

export const StatusChangeDialog: React.FC<StatusChangeDialogProps> = ({
  open,
  onClose,
  onConfirm,
  playerName,
  gameDate,
  action
}) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const handleConfirm = () => {
    console.log('Dialog confirm clicked')
    console.log('Selected date:', selectedDate)
    const changeDate = new Date(selectedDate)
    console.log('Change date:', changeDate)
    // Check if the selected date is game day
    const isGameDay = format(changeDate, 'yyyy-MM-dd') === format(gameDate, 'yyyy-MM-dd')
    console.log('Is game day:', isGameDay)
    onConfirm(changeDate, isGameDay)
    onClose()
  }

  const getActionText = () => {
    switch (action) {
      case 'dropout':
        return 'dropped out'
      case 'decline':
        return 'declined the slot'
      case 'accept':
        return 'accepted the slot'
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-100 p-6 rounded-lg shadow-xl">
          <Dialog.Title className="text-lg font-medium mb-4">
            When did {playerName} {getActionText()}?
          </Dialog.Title>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="input w-full"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button onClick={handleConfirm} className="btn btn-primary">
              Confirm
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
