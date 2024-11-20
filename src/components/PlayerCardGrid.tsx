import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PlayerCard from './PlayerCard'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'react-hot-toast'

interface Player {
  id: string
  friendlyName: string
  xp: number
  caps: number
  preferredPosition: string
  activeBonuses: number
  activePenalties: number
  winRate: number
  currentStreak: number
  maxStreak: number
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
}

export default function PlayerCardGrid() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<keyof Player>('xp')
  const [filterBy, setFilterBy] = useState('')

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          friendly_name,
          xp,
          caps,
          preferred_position,
          active_bonuses,
          active_penalties,
          win_rate,
          current_streak,
          max_streak
        `)
      
      if (error) throw error

      const playersWithRarity = data.map(player => ({
        id: player.id,
        friendlyName: player.friendly_name,
        xp: player.xp || 0,
        caps: player.caps || 0,
        preferredPosition: player.preferred_position,
        activeBonuses: player.active_bonuses || 0,
        activePenalties: player.active_penalties || 0,
        winRate: player.win_rate || 0,
        currentStreak: Number(player.current_streak) || 0,
        maxStreak: Number(player.max_streak) || 0,
        rarity: calculateRarity(player.xp, data.map(p => p.xp))
      }))

      console.log('Fetched players with streaks:', playersWithRarity)
      setPlayers(playersWithRarity)
    } catch (error) {
      toast.error('Error fetching players')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateRarity = (xp: number, allPlayers: number[]): 'Legendary' | 'Epic' | 'Rare' | 'Uncommon' | 'Common' => {
    // Sort XP values in descending order
    const sortedXP = [...allPlayers].sort((a, b) => b - a)
    const totalPlayers = sortedXP.length
    
    console.log('Total Players:', totalPlayers)
    console.log('Sorted XP Values:', sortedXP)
    console.log('Current XP:', xp)
    
    // Calculate exact cutoff positions
    const legendaryCount = Math.max(1, Math.round(totalPlayers * 0.01))
    const epicCount = Math.max(2, Math.round(totalPlayers * 0.04))
    const rareCount = Math.max(7, Math.round(totalPlayers * 0.15))
    const uncommonCount = Math.round(totalPlayers * 0.33)
    
    console.log('Distribution:', {
      legendary: legendaryCount,
      epic: epicCount,
      rare: rareCount,
      uncommon: uncommonCount,
      common: totalPlayers - (legendaryCount + epicCount + rareCount + uncommonCount)
    })
    
    const position = sortedXP.indexOf(xp)
    
    if (position < legendaryCount) return 'Legendary'
    if (position < (legendaryCount + epicCount)) return 'Epic'
    if (position < (legendaryCount + epicCount + rareCount)) return 'Rare'
    if (position < (legendaryCount + epicCount + rareCount + uncommonCount)) return 'Uncommon'
    return 'Common'
  }

  const sortedAndFilteredPlayers = players
    .filter(player => 
      player.friendlyName.toLowerCase().includes(filterBy.toLowerCase()) ||
      player.preferredPosition.toLowerCase().includes(filterBy.toLowerCase())
    )
    .sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return 1
      if (a[sortBy] > b[sortBy]) return -1
      return 0
    })

  return (
    <div className="container mx-auto px-4">
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Filter players..."
          className="input input-bordered w-full sm:w-64"
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
        />
        <select
          className="select select-bordered w-full sm:w-64"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as keyof Player)}
        >
          <option value="xp">Sort by XP</option>
          <option value="caps">Sort by Caps</option>
          <option value="winRate">Sort by Win Rate</option>
          <option value="friendlyName">Sort by Name</option>
        </select>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          layout
        >
          <AnimatePresence>
            {sortedAndFilteredPlayers.map((player) => (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                <PlayerCard {...player} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}