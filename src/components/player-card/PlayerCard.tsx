import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { PlayerCardProps } from './PlayerCardTypes'
import { PlayerCardFront } from './PlayerCardFront'
import { PlayerCardBack } from './PlayerCardBack'

/**
 * A flippable card component that displays player information and statistics
 * The card can be flipped to show more detailed information on the back
 */
export const PlayerCard: React.FC<PlayerCardProps> = (props) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary':
        return 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 shadow-lg shadow-yellow-500/50 animate-gradient-xy'
      case 'World Class':
        return 'bg-gradient-to-br from-purple-300 via-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/50 animate-gradient-xy'
      case 'Professional':
        return 'bg-gradient-to-br from-blue-300 via-blue-500 to-cyan-600 shadow-lg shadow-blue-500/50 animate-gradient-xy'
      case 'Semi Pro':
        return 'bg-gradient-to-br from-green-300 via-green-500 to-emerald-600 shadow-lg shadow-green-500/50 animate-gradient-xy'
      default:
        return 'bg-gradient-to-br from-slate-300 via-slate-400 to-zinc-600 shadow-lg shadow-slate-500/50'
    }
  }

  return (
    <motion.div 
      className="card w-64 h-96 cursor-pointer perspective"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div 
        className="relative w-full h-full preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card */}
        <div 
          className={`absolute w-full h-full ${getRarityColor(props.rarity)} text-white rounded-xl p-4`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <PlayerCardFront {...props} />
        </div>

        {/* Back of card */}
        <div 
          className={`absolute w-full h-full ${getRarityColor(props.rarity)} text-white rounded-xl p-4`}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <PlayerCardBack {...props} />
        </div>
      </motion.div>
    </motion.div>
  )
}

export default PlayerCard
