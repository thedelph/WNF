import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface StatsGridProps {
  profile: {
    total_xp: number;
    current_streak: number;
    max_streak: number;
    rarity?: string;
  };
}

const StatsGrid: React.FC<StatsGridProps> = ({ profile }) => {
  const getRarityDescription = (rarity: string) => {
    switch (rarity) {
      case 'Legendary':
        return 'Top 2% of players (98th percentile)';
      case 'World Class':
        return 'Top 7% of players (93rd percentile)';
      case 'Professional':
        return 'Top 20% of players (80th percentile)';
      case 'Semi Pro':
        return 'Top 40% of players (60th percentile)';
      case 'Amateur':
        return 'Still climbing the ranks!';
      default:
        return 'Rarity not available';
    }
  };

  const stats = [
    { 
      label: 'Total XP', 
      value: profile.total_xp.toLocaleString()
    },
    { 
      label: 'Current Streak', 
      value: profile.current_streak
    },
    { 
      label: 'Max Streak', 
      value: profile.max_streak
    },
    { 
      label: 'Rarity', 
      value: profile.rarity || 'N/A',
      tooltip: profile.rarity ? getRarityDescription(profile.rarity) : 'Rarity not available'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
    >
      {stats.map((stat, index) => (
        <TooltipPrimitive.Provider key={index}>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-3">
              {stat.tooltip ? (
                <Tooltip content={stat.tooltip}>
                  <div>
                    <h3 className="text-sm opacity-70">{stat.label}</h3>
                    <p className="font-mono text-lg font-bold">{stat.value}</p>
                  </div>
                </Tooltip>
              ) : (
                <div>
                  <h3 className="text-sm opacity-70">{stat.label}</h3>
                  <p className="font-mono text-lg font-bold">{stat.value}</p>
                </div>
              )}
            </div>
          </div>
        </TooltipPrimitive.Provider>
      ))}
    </motion.div>
  );
};

export default StatsGrid;
