import React from 'react'
import { motion } from 'framer-motion'
import { PlayerStats } from '../../types/player'
import { calculatePlayerXP } from '../../utils/xpCalculations'

export interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactElement
  description: string
  color: 'teal' | 'blue' | 'orange' | 'red' | 'green' | 'purple'
  stats?: PlayerStats[]
}

interface TeamColorStats {
  id: string
  friendlyName: string
  teamFrequency: number
  team: 'blue' | 'orange'
}

const colorClasses = {
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500'
} as const

const gradientColors = {
  teal: 'from-teal-300 via-teal-500 to-teal-700',
  blue: 'from-blue-300 via-blue-500 to-blue-700',
  orange: 'from-orange-300 via-orange-500 to-orange-700',
  red: 'from-red-300 via-red-500 to-red-700',
  green: 'from-emerald-300 via-emerald-500 to-emerald-700',
  purple: 'from-purple-300 via-purple-600 to-fuchsia-600'
} as const

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  description,
  color,
  stats
}) => {
  const calculateTotalXP = (stats: PlayerStats[]): number => {
    return stats.reduce((total, stat) => total + calculatePlayerXP(stat), 0)
  }

  const displayValue = stats ? calculateTotalXP(stats) : value

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`card bg-gradient-to-br ${gradientColors[color]} text-white shadow-lg`}
    >
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="card-title text-lg">{title}</h2>
            <p className="text-3xl font-bold mt-2">{displayValue}</p>
            <p className="text-sm text-gray-200 mt-1">{description}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
