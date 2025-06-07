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
  color?: 'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'indigo' | 'teal';
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
  teal: 'from-teal-300 via-teal-500 to-teal-700'
};

const shadowColors = {
  blue: 'shadow-blue-500/50',
  orange: 'shadow-orange-500/50',
  purple: 'shadow-purple-500/50',
  green: 'shadow-emerald-500/50',
  pink: 'shadow-pink-500/50',
  indigo: 'shadow-indigo-500/50',
  teal: 'shadow-teal-500/50'
};

export const AwardCard = ({ title, winners, description, className, icon, color = 'blue' }: AwardCardProps) => {
  // Determine medal positions considering ties
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
    
    // Count how many distinct values are higher than the current one
    let position = 0;
    const seenValues = new Set<string | number>();
    
    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      const value = winner.rawValue !== undefined ? winner.rawValue : winner.value;
      
      // Skip ReactNode values in comparison
      if (typeof value !== 'string' && typeof value !== 'number') continue;
      
      // If we haven't seen this value before and it's higher than current
      if (!seenValues.has(value) && value > currentValue) {
        seenValues.add(value);
        position++;
      }
    }
    
    // Return medal position (0, 1, 2) or null if beyond medals
    return position < 3 ? position : null;
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
          {winners.map((winner, index) => {
            const medalIndex = getMedalPosition(index, winners);
            return (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div key={winner.id} className="flex justify-between items-center gap-2">
                  {/* Player name with medal - left side */}
                  <div className="flex items-center gap-2 min-w-0 flex-shrink flex-grow overflow-hidden max-w-[50%]">
                    {medalIndex !== null && medalIndex < medals.length ? (
                      <span className="w-5 h-5 flex-shrink-0">{medals[medalIndex]}</span>
                    ) : (
                      <span className="w-5 h-5 flex-shrink-0">{/* Empty space to maintain alignment */}</span>
                    )}
                    <span className="drop-shadow-[0_0_1px_rgba(0,0,0,0.5)] truncate block">{winner.name}</span>
                  </div>
                  {/* Value display - right side */}
                  <div className="flex-shrink-0 drop-shadow-[0_0_1px_rgba(0,0,0,0.5)] text-right">{winner.value}</div>
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
