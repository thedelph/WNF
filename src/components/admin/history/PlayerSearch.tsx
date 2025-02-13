import React, { useState, useEffect } from 'react'
import { Tooltip } from '../../ui/Tooltip'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'

interface Player {
  id: string
  friendly_name: string
}

interface PlayerSearchProps {
  onPlayerAdd: (player: Player, team: 'blue' | 'orange' | null, status: string) => void
  existingPlayerIds: string[]
  gameDate: Date | string
  gameId: string
}

export const PlayerSearch: React.FC<PlayerSearchProps> = ({ onPlayerAdd, existingPlayerIds, gameDate, gameId }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<'blue' | 'orange' | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('selected')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Parse gameDate to ensure it's a Date object
  const parsedGameDate = typeof gameDate === 'string' ? new Date(gameDate) : gameDate

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchPlayers()
    } else {
      setPlayers([])
    }
  }, [searchQuery])

  useEffect(() => {
    // Set initial selected date to game date when component mounts
    setSelectedDate(format(parsedGameDate, 'yyyy-MM-dd'))
  }, [parsedGameDate])

  const searchPlayers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseAdmin
        .from('players')
        .select('id, friendly_name')
        .ilike('friendly_name', `%${searchQuery}%`)
        .not('id', 'in', `(${existingPlayerIds.join(',')})`)
        .limit(10)

      if (error) throw error
      setPlayers(data || [])
    } catch (error) {
      console.error('Error searching players:', error)
      toast.error('Failed to search players')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value
    setSelectedStatus(status)
    if (status === 'reserve_declined') {
      setShowDatePicker(true)
      // Set initial date to game date when showing picker
      setSelectedDate(format(parsedGameDate, 'yyyy-MM-dd'))
    } else {
      setShowDatePicker(false)
    }
  }

  const handleAddPlayer = async () => {
    if (selectedPlayer) {
      try {
        // If it's a reserve decline, record the status change first
        if (selectedStatus === 'reserve_declined') {
          const changeDate = new Date(selectedDate)
          const isGameDay = format(changeDate, 'yyyy-MM-dd') === format(parsedGameDate, 'yyyy-MM-dd')

          // Check if a status change already exists for this player and game
          const { data: existingChanges, error: checkError } = await supabaseAdmin
            .from('player_status_changes')
            .select('*')
            .eq('game_id', gameId)
            .eq('player_id', selectedPlayer.id)
            .eq('change_type', 'slot_response')
            .eq('to_status', 'reserve_declined')

          if (checkError) throw checkError

          // Only create a new status change if one doesn't exist
          if (!existingChanges || existingChanges.length === 0) {
            // Record the status change
            const { error: statusError } = await supabaseAdmin
              .from('player_status_changes')
              .insert({
                player_id: selectedPlayer.id,
                game_id: gameId,
                from_status: 'reserve_no_offer',
                to_status: 'reserve_declined',
                change_type: 'slot_response',
                is_game_day: isGameDay,
                created_at: changeDate.toISOString()
              })

            if (statusError) {
              console.error('Error recording status change:', statusError)
              throw statusError
            }
          }
        }

        // Now add the player to the game
        onPlayerAdd(selectedPlayer, selectedTeam, selectedStatus)
        
        // Reset form
        setSearchQuery('')
        setSelectedPlayer(null)
        setSelectedTeam(null)
        setSelectedStatus('selected')
        setShowDatePicker(false)
      } catch (error) {
        console.error('Error adding player:', error)
        toast.error('Failed to add player')
      }
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-base-100">
      <h3 className="text-lg font-semibold mb-4">Add Player</h3>
      <div className="flex flex-col gap-4">
        <div className="form-control">
          <Tooltip content="Search for a player to add to the game">
            <input
              type="text"
              placeholder="Search players..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Tooltip>
        </div>

        {loading && <div className="text-gray-500">Searching...</div>}

        {players.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Select Player</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedPlayer?.id || ''}
                onChange={(e) => {
                  const player = players.find(p => p.id === e.target.value)
                  setSelectedPlayer(player || null)
                }}
              >
                <option value="">Choose a player</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.friendly_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPlayer && (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Assign To</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={selectedTeam || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setSelectedTeam(value === '' ? null : value as 'blue' | 'orange')
                      if (value) setSelectedStatus('selected')
                    }}
                  >
                    <option value="">Not Assigned</option>
                    <option value="blue">Blue Team</option>
                    <option value="orange">Orange Team</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Status</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={selectedStatus}
                    onChange={handleStatusChange}
                  >
                    {!selectedTeam ? (
                      <>
                        <option value="registered">Available</option>
                        <option value="reserve_no_offer">Reserve - No Slot Offer</option>
                        <option value="reserve_declined">Reserve - Declined Slot</option>
                      </>
                    ) : (
                      <option value="selected">Selected</option>
                    )}
                  </select>
                </div>

                {showDatePicker && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      When did they decline the slot?
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="input input-bordered w-full"
                    />
                    <p className="text-sm text-base-content/70 mt-1">
                      {format(new Date(selectedDate), 'yyyy-MM-dd') === format(parsedGameDate, 'yyyy-MM-dd')
                        ? 'This was on game day'
                        : 'This was before game day'
                      }
                    </p>
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleAddPlayer}
                >
                  Add Player
                </button>
              </>
            )}
          </div>
        )}

        {searchQuery.length >= 2 && players.length === 0 && !loading && (
          <div className="text-gray-500">No players found</div>
        )}
      </div>
    </div>
  )
}
