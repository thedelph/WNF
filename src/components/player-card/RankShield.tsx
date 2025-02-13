import React from 'react';
import { Shield } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { motion } from 'framer-motion';

interface RankShieldProps {
  rank: number;
  className?: string;
}

/**
 * A shield-shaped icon component that displays a player's current rank.
 * The shield includes the player's numerical rank and provides additional context via tooltip.
 * 
 * @param rank - The player's current rank based on XP
 * @param className - Optional additional CSS classes
 */
const RankShield: React.FC<RankShieldProps> = ({ rank, className = '' }) => {
  const tooltipContent = `Ranked #${rank} in XP`;

  return (
    <Tooltip content={tooltipContent}>
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`relative inline-flex items-center justify-center ${className}`}
      >
        <Shield className="w-6 h-6 text-white" />
        <span className="absolute text-[10px] font-bold text-white">
          {rank}
        </span>
      </motion.div>
    </Tooltip>
  );
};

export default RankShield;
