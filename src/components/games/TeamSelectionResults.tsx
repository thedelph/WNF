import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaUsers, FaDice, FaTshirt } from 'react-icons/fa'
import PlayerCard from '../PlayerCard'

interface Player {
  id: string
  friendly_name: string
  xp: number
  preferred_position?: string
  caps: number
  active_bonuses: number
  active_penalties: number
  win_rate: number
  current_streak: number
  max_streak: number
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
  avatar_svg: string
}

interface TeamSelectionResultsProps {
  selectedPlayers: {
    player: Player
    selection_type: 'random' | 'xp'
    team?: 'Blue' | 'Orange'
  }[]
  reservePlayers: Player[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: (custom: { team: 'Blue' | 'Orange' }) => ({
    opacity: 0,
    x: custom.team === 'Blue' ? -100 : 100,
    y: 50
  }),
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
}

const getTeamColor = (team: 'Blue' | 'Orange') => {
  return team === 'Blue' 
    ? 'bg-gradient-to-br from-blue-300 via-blue-500 to-blue-700 shadow-lg shadow-blue-500/50'
    : 'bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 shadow-lg shadow-orange-500/50';
}

export const TeamSelectionResults: React.FC<TeamSelectionResultsProps> = ({
  selectedPlayers,
  reservePlayers
}) => {
  const blueTeam = selectedPlayers.filter(p => p.team === 'Blue')
  const orangeTeam = selectedPlayers.filter(p => p.team === 'Orange')

  return (
    <div className="space-y-8 p-4">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Blue Team */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-xl overflow-hidden"
        >
          <div className="bg-blue-600 p-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <FaTshirt className="mr-2" />
              Blue Team
            </h2>
          </div>
          <div className="bg-blue-50 p-4 space-y-4">
            <AnimatePresence mode="wait">
              {blueTeam.map((entry, index) => (
                <motion.div
                  key={entry.player.id}
                  custom={{ team: 'Blue' }}
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, x: -100 }}
                >
                  <div className={`transform transition-all duration-500 hover:scale-105 ${getTeamColor('Blue')}`}>
                    <PlayerCard
                      id={entry.player.id}
                      friendlyName={entry.player.friendly_name}
                      caps={entry.player.caps}
                      preferredPosition={entry.player.preferred_position || ''}
                      activeBonuses={entry.player.active_bonuses}
                      activePenalties={entry.player.active_penalties}
                      winRate={entry.player.win_rate}
                      currentStreak={entry.player.current_streak}
                      maxStreak={entry.player.max_streak}
                      rarity={entry.player.rarity}
                      avatarSvg={entry.player.avatar_svg}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Orange Team */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-xl overflow-hidden"
        >
          <div className="bg-orange-600 p-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <FaTshirt className="mr-2" />
              Orange Team
            </h2>
          </div>
          <div className="bg-orange-50 p-4 space-y-4">
            <AnimatePresence mode="wait">
              {orangeTeam.map((entry, index) => (
                <motion.div
                  key={entry.player.id}
                  custom={{ team: 'Orange' }}
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, x: 100 }}
                >
                  <div className={`transform transition-all duration-500 hover:scale-105 ${getTeamColor('Orange')}`}>
                    <PlayerCard
                      id={entry.player.id}
                      friendlyName={entry.player.friendly_name}
                      caps={entry.player.caps}
                      preferredPosition={entry.player.preferred_position || ''}
                      activeBonuses={entry.player.active_bonuses}
                      activePenalties={entry.player.active_penalties}
                      winRate={entry.player.win_rate}
                      currentStreak={entry.player.current_streak}
                      maxStreak={entry.player.max_streak}
                      rarity={entry.player.rarity}
                      avatarSvg={entry.player.avatar_svg}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      {/* Reserve Players */}
      {reservePlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-base-200 rounded-xl overflow-hidden"
        >
          <div className="bg-gray-600 p-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <FaUsers className="mr-2" />
              Reserve Players
            </h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="wait">
              {reservePlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PlayerCard
                    id={player.id}
                    friendlyName={player.friendly_name}
                    caps={player.caps}
                    preferredPosition={player.preferred_position || ''}
                    activeBonuses={player.active_bonuses}
                    activePenalties={player.active_penalties}
                    winRate={player.win_rate}
                    currentStreak={player.current_streak}
                    maxStreak={player.max_streak}
                    rarity={player.rarity}
                    avatarSvg={player.avatar_svg}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  )
}
