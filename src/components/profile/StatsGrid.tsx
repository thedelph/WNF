import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface StatsGridProps {
  stats: {
    id?: string;
    friendly_name?: string;
    xp?: number;
    total_xp?: number;
    current_streak?: number;
    max_streak?: number;
    rarity?: string;
    win_rate?: number;
    recent_win_rate?: number;
    caps?: number;
    active_bonuses?: number;
    active_penalties?: number;
  };
}

interface StatItem {
  label: string;
  value: ReactNode;
  tooltip?: string;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
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

  // Calculate the form indicator
  const getFormIndicator = () => {
    if (!stats || stats.win_rate === undefined || stats.win_rate === null || stats.recent_win_rate === undefined || stats.recent_win_rate === null) {
      return null;
    }

    const difference = Number(stats.recent_win_rate) - Number(stats.win_rate);
    
    // Always show the indicator with the difference
    if (difference > 0) {
      return (
        <span className="text-green-500 font-bold" title="Better recent form">
          ▲ {difference.toFixed(1)}%
        </span>
      );
    } else if (difference < 0) {
      return (
        <span className="text-red-500 font-bold" title="Worse recent form">
          ▼ {Math.abs(difference).toFixed(1)}%
        </span>
      );
    } else {
      return (
        <span className="text-gray-500" title="Same recent form">
          ⟷ 0.0%
        </span>
      );
    }
  };

  const statsItems: StatItem[] = [
    { 
      label: 'Total XP', 
      value: ((stats.xp ?? stats.total_xp) || 0).toLocaleString()
    },
    { 
      label: 'Current Streak', 
      value: stats.current_streak || 0
    },
    { 
      label: 'Max Streak', 
      value: stats.max_streak || 0
    },
    { 
      label: 'Rarity', 
      value: stats.rarity || 'Amateur',
      tooltip: stats.rarity ? getRarityDescription(stats.rarity) : 'Rarity not available'
    }
  ];

  // Add win rate stats if available
  if (stats.win_rate !== undefined && stats.win_rate !== null) {
    statsItems.push({
      label: 'Win Rate',
      value: (
        <div className="flex flex-col items-center">
          <div className="text-lg font-semibold">
            {Number(stats.win_rate).toFixed(1)}%
          </div>
          {stats.recent_win_rate !== undefined && stats.recent_win_rate !== null && (
            <div className="mt-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Recent: {Number(stats.recent_win_rate).toFixed(1)}%
              </div>
              <div className="text-center">
                {getFormIndicator()}
              </div>
            </div>
          )}
        </div>
      ),
      tooltip: stats.recent_win_rate !== undefined && stats.recent_win_rate !== null
        ? `Overall win rate: ${Number(stats.win_rate).toFixed(1)}%\nRecent form (last 10 games): ${Number(stats.recent_win_rate).toFixed(1)}%` 
        : undefined
    });
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {statsItems.map((stat, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 text-center"
        >
          {stat.tooltip ? (
            <TooltipPrimitive.Provider>
              <Tooltip content={stat.tooltip}>
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{stat.label}</h3>
              </Tooltip>
            </TooltipPrimitive.Provider>
          ) : (
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{stat.label}</h3>
          )}
          <div className="mt-1 text-lg font-semibold">{stat.value}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsGrid;
