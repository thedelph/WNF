import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { ReactNode } from 'react';

interface Winner {
  id: string;
  name: string;
  value: string | number | ReactNode;
  rawValue?: number | string; // Optional raw value for medal calculation
}

interface AwardCardProps {
  title: string;
  winners: Winner[];
  description?: string;
  className?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'indigo' | 'teal' | 'red' | 'rose' | 'amber' | 'yellow' | 'slate';
  valueHeader?: string; // Optional header label for the value column
  isMultiPlayer?: boolean; // For pair/trio awards - enables responsive name wrapping
}

// Emoji medals for top three positions
const medals = ['🥇', '🥈', '🥉'];

const gradientColors = {
  blue: 'from-blue-300 via-blue-500 to-blue-700',
  orange: 'from-orange-300 via-orange-500 to-orange-700',
  purple: 'from-purple-300 via-purple-600 to-fuchsia-600',
  green: 'from-emerald-300 via-emerald-500 to-emerald-700',
  pink: 'from-pink-300 via-pink-500 to-pink-700',
  indigo: 'from-indigo-300 via-indigo-500 to-indigo-700',
  teal: 'from-teal-300 via-teal-500 to-teal-700',
  red: 'from-red-400 via-red-600 to-red-800',
  rose: 'from-rose-400 via-rose-600 to-rose-800',
  amber: 'from-amber-600 via-amber-700 to-amber-900',
  yellow: 'from-yellow-600 via-yellow-700 to-yellow-900',
  slate: 'from-slate-500 via-slate-600 to-slate-800'  // For cursed/negative stats
};

const shadowColors = {
  blue: 'shadow-blue-500/50',
  orange: 'shadow-orange-500/50',
  purple: 'shadow-purple-500/50',
  green: 'shadow-emerald-500/50',
  pink: 'shadow-pink-500/50',
  indigo: 'shadow-indigo-500/50',
  teal: 'shadow-teal-500/50',
  red: 'shadow-red-600/50',
  rose: 'shadow-rose-600/50',
  amber: 'shadow-amber-700/50',
  yellow: 'shadow-amber-700/50',
  slate: 'shadow-slate-600/50'  // For cursed/negative stats
};

export const AwardCard = ({ title, winners, description, className, icon, color = 'blue', valueHeader, isMultiPlayer = false }: AwardCardProps) => {
  // Determine medal positions using Olympic-style ranking with ties
  // e.g., if two players tie for gold, next player gets bronze (skips silver)
  const getMedalPosition = (currentIndex: number, winners: Winner[]) => {
    const currentWinner = winners[currentIndex];

    // Use rawValue if available, otherwise fall back to value
    const currentValue = currentWinner.rawValue !== undefined
      ? currentWinner.rawValue
      : currentWinner.value;

    // For ReactNode values without rawValue, we need to use a different approach
    if (typeof currentValue !== 'string' && typeof currentValue !== 'number') {
      // For React elements, we can't compare values directly, so use index-based logic
      return currentIndex < 3 ? currentIndex : null;
    }

    // Olympic-style ranking: count how many players are ahead of this one
    // (i.e., how many players have a HIGHER value than the current player)
    let playersAhead = 0;

    for (let i = 0; i < winners.length; i++) {
      if (i === currentIndex) continue; // Skip self

      const winner = winners[i];
      const value = winner.rawValue !== undefined ? winner.rawValue : winner.value;

      // Skip ReactNode values in comparison
      if (typeof value !== 'string' && typeof value !== 'number') continue;

      // Count players with higher values
      if (value > currentValue) {
        playersAhead++;
      }
    }

    // Return medal position (0, 1, 2) or null if beyond medals
    // Position is based on how many players are ahead
    return playersAhead < 3 ? playersAhead : null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`card bg-gradient-to-br ${gradientColors[color]} text-white shadow-lg ${shadowColors[color]} animate-gradient-xy ${className}`}
    >
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title text-lg font-bold">{title}</h2>
          <div>{icon || <Trophy className="w-6 h-6" />}</div>
        </div>
        <div className="space-y-1 mb-4">
          {/* Optional column header */}
          {valueHeader && (
            <div className="flex justify-between items-center gap-2 text-xs opacity-70 border-b border-white/20 pb-1 mb-1">
              <span className="pl-7">Player</span>
              <span>{valueHeader}</span>
            </div>
          )}
          {winners.map((winner, index) => {
            const medalIndex = getMedalPosition(index, winners);
            return (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="py-0.5"
              >
                {/* Responsive layout: stack on mobile for multi-player awards, horizontal on desktop */}
                <div className={`flex ${isMultiPlayer ? 'flex-col sm:flex-row sm:justify-between sm:items-center' : 'justify-between items-center'} gap-1 sm:gap-2`}>
                  {/* Player name with medal - left side */}
                  <div className={`flex items-start sm:items-center gap-2 min-w-0 ${isMultiPlayer ? 'w-full sm:max-w-[65%]' : 'flex-shrink flex-grow overflow-hidden max-w-[50%]'}`}>
                    {medalIndex !== null && medalIndex < medals.length ? (
                      <span className="w-5 h-5 flex-shrink-0">{medals[medalIndex]}</span>
                    ) : (
                      <span className="w-5 h-5 flex-shrink-0">{/* Empty space to maintain alignment */}</span>
                    )}
                    <span className={`drop-shadow-[0_0_1px_rgba(0,0,0,0.5)] leading-tight ${isMultiPlayer ? 'break-words' : 'truncate block'}`}>{winner.name}</span>
                  </div>
                  {/* Value display - indented on mobile for multi-player, right-aligned on desktop */}
                  <div className={`flex flex-col ${isMultiPlayer ? 'items-start pl-8 sm:pl-0 sm:items-end' : 'items-end'} flex-shrink-0 drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]`}>{winner.value}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {description && (
          <p className="text-sm opacity-80 mt-auto drop-shadow-[0_0_1px_rgba(0,0,0,0.5)] text-left">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
};
