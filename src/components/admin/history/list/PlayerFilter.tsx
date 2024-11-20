import React from 'react'
import { useEffect, useState } from 'react'
import { supabaseAdmin } from '../../../../utils/supabase'

interface Player {
  id: string
  friendly_name: string
}

interface Props {
  value: string | null
  onChange: (value: string | null) => void
}

const PlayerFilter: React.FC<Props> = ({ value, onChange }) => {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabaseAdmin
          .from('players')
          .select('id, friendly_name')
          .order('friendly_name')

        if (error) throw error
        setPlayers(data)
      } catch (error) {
        console.error('Error fetching players:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  if (loading) return null

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">Player</span>
      </label>
      <select
        className="select select-bordered w-full"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">All Players</option>
        {players.map(player => (
          <option key={player.id} value={player.id}>
            {player.friendly_name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default PlayerFilter
