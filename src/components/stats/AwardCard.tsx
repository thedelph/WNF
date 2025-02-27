import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';

interface Winner {
  id: string;
  name: string;
  value: string | number;
}

interface AwardCardProps {
  title: string;
  winners: Winner[];
  description?: string;
  className?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'indigo' | 'teal';
}

const medals = [
  { color: 'text-yellow-300 drop-shadow-[0_0_3px_rgba(253,224,71,0.7)]', label: 'Gold' },
  { color: 'text-slate-100 drop-shadow-[0_0_3px_rgba(255,255,255,0.7)]', label: 'Silver' },
  { color: 'text-yellow-700 drop-shadow-[0_0_3px_rgba(255,255,255,0.7)] font-bold', label: 'Bronze' }
];

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
  const getMedalIndex = (currentIndex: number, currentValue: string | number, winners: Winner[]) => {
    // Find the first occurrence of this value
    const firstIndex = winners.findIndex(w => w.value === currentValue);
    // Return that index as the medal index
    return firstIndex;
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
            const medalIndex = getMedalIndex(index, winner.value, winners);
            return (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {medalIndex < 3 ? (
                    <Medal 
                      className={`w-5 h-5 ${medalIndex < medals.length ? medals[medalIndex].color : 'text-gray-300'}`} 
                    />
                  ) : (
                    <span className="w-5 h-5">{/* Empty space to maintain alignment */}</span>
                  )}
                  <span className="drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">{winner.name}</span>
                </div>
                <span className="font-bold drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">{winner.value}</span>
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
