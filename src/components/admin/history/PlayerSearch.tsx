import React, { useState, useEffect } from 'react'
import { Tooltip } from '../../ui/Tooltip'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'

interface Player {
  id: string
  friendly_name: string
}

interface PlayerSearchProps {
  onPlayerAdd: (player: Player, team: 'blue' | 'orange' | null, status: string) => void
  existingPlayerIds: string[]  // To filter out already added players
}

export const PlayerSearch: React.FC<PlayerSearchProps> = ({ onPlayerAdd, existingPlayerIds }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<'blue' | 'orange' | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('selected')

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchPlayers()
    } else {
      setPlayers([])
    }
  }, [searchQuery])

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

  const handleAddPlayer = () => {
    if (selectedPlayer) {
      onPlayerAdd(selectedPlayer, selectedTeam, selectedStatus)
      setSearchQuery('')
      setSelectedPlayer(null)
      setSelectedTeam(null)
      setSelectedStatus('selected')
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
                    onChange={(e) => setSelectedStatus(e.target.value)}
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
