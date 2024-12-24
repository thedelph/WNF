import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'indigo' | 'teal';
  className?: string;
  stats?: any[];
}

const medals = [
  { color: 'text-yellow-300 drop-shadow-[0_0_3px_rgba(253,224,71,0.7)]', label: 'Gold' },
  { color: 'text-slate-100 drop-shadow-[0_0_3px_rgba(255,255,255,0.7)]', label: 'Silver' },
  { color: 'text-yellow-700 drop-shadow-[0_0_3px_rgba(255,255,255,0.7)] font-bold', label: 'Bronze' }
];

export const StatsCard = ({ title, value, description, icon, color = 'blue', className, stats }: StatsCardProps) => {
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

  // Determine medal positions considering ties
  const getMedalIndex = (currentIndex: number, currentValue: number, players: any[]) => {
    // Count how many players have a higher win rate
    const playersWithHigherRate = players.filter(p => p.winRate > currentValue).length;
    // Return that as the medal index - this handles ties correctly
    return playersWithHigherRate;
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
          <div>{icon}</div>
        </div>
        <div className="space-y-1 mb-4">
          {stats && stats.map((player, index) => {
            const medalIndex = getMedalIndex(index, player.winRate, stats);
            return (
              <div key={player.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Medal 
                    className={`w-5 h-5 ${medalIndex < medals.length ? medals[medalIndex].color : 'text-gray-300'}`} 
                  />
                  <span>{player.friendlyName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-14 text-right">{player.winRate.toFixed(1)}%</span>
                  <span className="text-sm opacity-70 w-24 text-right">
                    {player.wins}W/{player.draws}D/{player.losses}L
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {value && !stats && (
          <div className="flex-1 flex items-center justify-center">
            <div className={`text-3xl font-bold ${color === 'blue' ? 'text-blue-500' : 'text-orange-500'} drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] [text-shadow:_-0.5px_-0.5px_0_rgba(0,0,0,0.3),_0.5px_-0.5px_0_rgba(0,0,0,0.3),_-0.5px_0.5px_0_rgba(0,0,0,0.3),_0.5px_0.5px_0_rgba(0,0,0,0.3)]`}>
              {value}
            </div>
          </div>
        )}
        {description && (
          <p className={`text-sm opacity-80 mt-auto drop-shadow-[0_0_1px_rgba(0,0,0,0.5)] ${!stats && !value ? 'text-left' : !stats ? 'text-center' : 'text-left'}`}>
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
};
