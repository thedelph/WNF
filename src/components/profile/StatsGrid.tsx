/**
 * StatsGrid Component
 * 
 * Displays player statistics in a grid layout including XP, streaks, win rates, caps (games played), 
 * and highest XP achievements.
 * 
 * Comprehensive documentation for this component can be found at:
 * /docs/components/StatsGrid.md
 */

import { FC, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// Helper function to format date consistently as "12 Mar 2025"
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  
  // If the date is already in the correct format, return it
  if (/^\d{1,2} [A-Z][a-z]{2} \d{4}$/.test(dateString)) {
    return dateString;
  }
  
  // Otherwise, format it
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface StatsGridProps {
  stats: {
    id?: string;
    friendly_name?: string;
    xp?: number;
    total_xp?: number;
    highest_xp?: number;
    highest_xp_date?: string;
    current_streak?: number;
    max_streak?: number; // NOTE: This value may be inconsistent with player_streak_stats view
    max_streak_date?: string; 
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

export const StatsGrid: FC<StatsGridProps> = ({ stats }) => {
  // Debug log to see what data is being passed to the component
  console.log('StatsGrid received stats:', stats);
  console.log('Highest XP data:', { 
    highest_xp: stats.highest_xp, 
    highest_xp_date: stats.highest_xp_date 
  });
  console.log('Streak data:', {
    current_streak: stats.current_streak,
    max_streak: stats.max_streak,
    max_streak_date: stats.max_streak_date
  });

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
      value: (
        <div className="flex flex-col items-center">
          <div className="text-lg font-semibold">
            {((stats.xp ?? stats.total_xp) || 0).toLocaleString()}
          </div>
          {stats.highest_xp ? (
            <div className="mt-1">
              {stats.xp === stats.highest_xp ? (
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                  New Personal Best! 🎉
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Highest: {stats.highest_xp.toLocaleString()}
                </div>
              )}
              {stats.highest_xp_date && stats.xp !== stats.highest_xp && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {formatDate(stats.highest_xp_date)}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              No highest XP data
            </div>
          )}
        </div>
      ),
      tooltip: stats.highest_xp
        ? `Current XP: ${((stats.xp ?? stats.total_xp) || 0).toLocaleString()}\nHighest XP: ${stats.highest_xp.toLocaleString()}${stats.highest_xp_date ? ` (${formatDate(stats.highest_xp_date)})` : ''}`
        : undefined
    },
    { 
      label: 'Streak', 
      value: (
        <div className="flex flex-col items-center">
          <div className="text-lg font-semibold">
            {stats.current_streak || 0}
          </div>
          {stats.max_streak ? (
            <div className="mt-1">
              {stats.current_streak === stats.max_streak ? (
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                  New Personal Best! 🎉
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Max: {stats.max_streak}
                </div>
              )}
              {stats.max_streak_date && stats.current_streak !== stats.max_streak && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {formatDate(stats.max_streak_date)}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              No max streak data
            </div>
          )}
        </div>
      ),
      tooltip: stats.max_streak
        ? `Current Streak: ${stats.current_streak || 0}\nMax Streak: ${stats.max_streak}${stats.max_streak_date ? ` (${formatDate(stats.max_streak_date)})` : ''}`
        : undefined
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
        ? `Overall Win Rate: ${Number(stats.win_rate).toFixed(1)}%\nRecent Win Rate (last 10 games): ${Number(stats.recent_win_rate).toFixed(1)}%`
        : `Win Rate: ${Number(stats.win_rate).toFixed(1)}%`
    });
  }

  // Add caps (games played) stat if available
  if (stats.caps !== undefined && stats.caps !== null) {
    statsItems.push({
      label: 'Caps',
      value: (
        <div className="text-lg font-semibold">
          {stats.caps.toLocaleString()}
        </div>
      ),
      tooltip: `Games played: ${stats.caps.toLocaleString()}`
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
