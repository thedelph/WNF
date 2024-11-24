import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PlayerCard from './PlayerCard'
import { supabase } from '../utils/supabase'
import { toast } from 'react-hot-toast'
import { calculatePlayerXP } from '../utils/xpCalculations'
import { calculateRarity } from '../utils/rarityCalculations'

interface Player {
  id: string
  friendly_name: string
  xp?: number
  caps: number
  preferred_position: string | null
  active_bonuses: number
  active_penalties: number
  win_rate: number
  current_streak: number
  max_streak: number
  rarity?: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
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
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*');
      
      if (error) throw error;

      // Debug top players by caps
      const topPlayersByCaps = [...data]
        .sort((a, b) => b.caps - a.caps)
        .slice(0, 5);
      
      console.log('DEBUG: Top 5 Players by Caps:', 
        topPlayersByCaps.map(p => ({
          name: p.friendly_name,
          caps: p.caps,
          streak: p.current_streak,
          bonuses: p.active_bonuses,
          penalties: p.active_penalties
        }))
      );

      const playersWithXP = data.map(player => {
        const stats = {
          caps: player.caps || 0,
          activeBonuses: player.active_bonuses || 0,
          activePenalties: player.active_penalties || 0,
          currentStreak: player.current_streak || 0
        };

        const xp = calculatePlayerXP(stats);

        return {
          id: player.id,
          friendlyName: player.friendly_name,
          caps: player.caps || 0,
          preferredPosition: player.preferred_position || '',
          activeBonuses: player.active_bonuses || 0,
          activePenalties: player.active_penalties || 0,
          winRate: player.win_rate || 0,
          currentStreak: player.current_streak || 0,
          maxStreak: player.max_streak || 0,
          avatarSvg: player.avatar_svg || '',
          xp
        };
      });

      const allXPValues = playersWithXP.map(p => p.xp).sort((a,b) => b-a);
      
      console.log('DEBUG: XP Distribution Analysis:', {
        uniqueValues: new Set(allXPValues).size,
        top5XP: allXPValues.slice(0,5),
        bottom5XP: allXPValues.slice(-5),
        average: allXPValues.reduce((a,b) => a + b, 0) / allXPValues.length,
        median: allXPValues[Math.floor(allXPValues.length / 2)],
        nonZeroCount: allXPValues.filter(xp => xp > 0).length
      });

      const playersWithRarity = playersWithXP.map(player => {
        const rarity = calculateRarity(player.xp, allXPValues);
        
        // Debug rarity for top players
        if (player.xp > 15) {
          console.log(`DEBUG: ${player.friendly_name} Rarity:`, {
            xp: player.xp,
            position: allXPValues.indexOf(player.xp),
            rarity,
            thresholds: {
              legendary: Math.floor(allXPValues.length * 0.05),
              epic: Math.floor(allXPValues.length * 0.15),
              rare: Math.floor(allXPValues.length * 0.30)
            }
          });
        }

        return {
          ...player,
          rarity
        };
      });

      setPlayers(playersWithRarity);
    } catch (error) {
      console.error('DEBUG: Error in fetchPlayers:', error);
      toast.error('Error fetching players');
    } finally {
      setLoading(false);
    }
  };

  const sortedAndFilteredPlayers = players
    .filter(player => {
      const searchTerm = filterBy.toLowerCase();
      const name = player.friendly_name?.toLowerCase() || '';
      const position = player.preferred_position?.toLowerCase() || '';
      return name.includes(searchTerm) || position.includes(searchTerm);
    })
    .sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return 1;
      if (a[sortBy] > b[sortBy]) return -1;
      return 0;
    });

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