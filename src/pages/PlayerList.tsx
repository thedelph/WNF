// src/pages/PlayerList.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import PlayerCard from '../components/PlayerCard'
import { toast } from 'react-hot-toast'
import { calculatePlayerXP } from '../utils/xpCalculations'
import { calculateRarity } from '../utils/rarityCalculations'

interface Player {
  id: string
  friendly_name: string
  caps: number
  preferred_position: string
  active_bonuses: number
  active_penalties: number
  win_rate: number
  current_streak: number
  max_streak: number
  avatar_svg: string
}

const PlayerList = () => {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('xp')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          friendly_name,
          caps,
          preferred_position,
          active_bonuses,
          active_penalties,
          win_rate,
          current_streak,
          max_streak,
          avatar_svg
        `)
      
      if (error) throw error
      
      console.log('Fetched players data:', data)
      
      setPlayers(data || [])
    } catch (error) {
      console.error('Error fetching players:', error)
      toast.error('Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = players
    .filter(player => 
      player.friendly_name.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const xpA = calculatePlayerXP(a.caps, a.current_streak, a.active_bonuses, a.active_penalties)
      const xpB = calculatePlayerXP(b.caps, b.current_streak, b.active_bonuses, b.active_penalties)
      return sortBy === 'xp' ? xpB - xpA : a.friendly_name.localeCompare(b.friendly_name)
    })

  // Get all XP values for rarity calculation
  const allXPValues = players.map(player => 
    calculatePlayerXP(player.caps, player.current_streak, player.active_bonuses, player.active_penalties)
  )

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Player List</h1>
      <p>This is the Player List page.</p>
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Search by Friendly Name"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input input-bordered w-full max-w-xs mr-2"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="select select-bordered"
        >
          <option value="xp">Sort by XP</option>
          <option value="friendly_name">Sort by Friendly Name</option>
        </select>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPlayers.map((player) => {
            const calculatedXP = calculatePlayerXP(
              player.caps,
              player.current_streak,
              player.active_bonuses,
              player.active_penalties
            )
            
            return (
              <PlayerCard
                key={player.id}
                id={player.id}
                friendlyName={player.friendly_name}
                caps={player.caps}
                preferredPosition={player.preferred_position}
                activeBonuses={player.active_bonuses}
                activePenalties={player.active_penalties}
                winRate={player.win_rate}
                currentStreak={player.current_streak}
                maxStreak={player.max_streak}
                rarity={calculateRarity(calculatedXP, allXPValues)}
                avatarSvg={player.avatar_svg}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PlayerList