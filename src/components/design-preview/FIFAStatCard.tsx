import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { fifaAnimations, MEDALS, FIFA_COLORS } from '../../constants/fifaTheme';

interface Winner {
  name: string;
  value: ReactNode;
  rawValue?: number;
  id: string;
}

interface FIFAStatCardProps {
  title: string;
  icon?: ReactNode;
  color?: 'blue' | 'gold' | 'pink' | 'green' | 'purple' | 'orange';
  winners?: Winner[];
  value?: string | number;
  description?: string;
  animationDelay?: number;
}

const colorClasses = {
  blue: {
    border: 'border-fifa-electric/40',
    glow: 'shadow-fifa-glow/30',
    hoverGlow: 'hover:shadow-fifa-glow',
    text: 'text-fifa-electric',
    bg: 'from-fifa-electric/10 to-transparent',
  },
  gold: {
    border: 'border-fifa-gold/40',
    glow: 'shadow-gold-glow/30',
    hoverGlow: 'hover:shadow-gold-glow',
    text: 'text-fifa-gold',
    bg: 'from-fifa-gold/10 to-transparent',
  },
  pink: {
    border: 'border-fifa-pink/40',
    glow: 'shadow-pink-glow/30',
    hoverGlow: 'hover:shadow-pink-glow',
    text: 'text-fifa-pink',
    bg: 'from-fifa-pink/10 to-transparent',
  },
  green: {
    border: 'border-fifa-green/40',
    glow: 'shadow-[0_0_20px_rgba(0,255,136,0.3)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(0,255,136,0.5)]',
    text: 'text-fifa-green',
    bg: 'from-fifa-green/10 to-transparent',
  },
  purple: {
    border: 'border-fifa-purple/40',
    glow: 'shadow-[0_0_20px_rgba(157,78,221,0.3)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(157,78,221,0.5)]',
    text: 'text-fifa-purple',
    bg: 'from-fifa-purple/10 to-transparent',
  },
  orange: {
    border: 'border-fifa-orange/40',
    glow: 'shadow-[0_0_20px_rgba(255,107,53,0.3)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(255,107,53,0.5)]',
    text: 'text-fifa-orange',
    bg: 'from-fifa-orange/10 to-transparent',
  },
};

// Get medal index considering ties
const getMedalIndex = (index: number, currentValue: number, players: Winner[]): number => {
  if (!players || players.length === 0) return index;
  const playersWithHigherValue = players.filter(p => (p.rawValue ?? 0) > currentValue).length;
  return playersWithHigherValue;
};

export const FIFAStatCard = ({
  title,
  icon,
  color = 'blue',
  winners,
  value,
  description,
  animationDelay = 0,
}: FIFAStatCardProps) => {
  const colorClass = colorClasses[color];

  return (
    <motion.div
      className={`
        fifa-card p-5 md:p-6
        ${colorClass.border} ${colorClass.glow} ${colorClass.hoverGlow}
        transition-all duration-300
      `}
      variants={fifaAnimations.cardEntrance}
      initial="hidden"
      animate="visible"
      transition={{ delay: animationDelay }}
      whileHover={{ y: -4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-fifa-display text-lg font-bold ${colorClass.text}`}>
          {title}
        </h3>
        {icon && (
          <div className={`${colorClass.text} opacity-80`}>
            {icon}
          </div>
        )}
      </div>

      {/* Content - Winners List */}
      {winners && winners.length > 0 && (
        <div className="space-y-2">
          {winners.slice(0, 10).map((winner, index) => {
            const medalIndex = getMedalIndex(index, winner.rawValue ?? 0, winners);
            const medal = medalIndex < MEDALS.length ? MEDALS[medalIndex] : null;

            return (
              <motion.div
                key={winner.id}
                className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md
                  hover:bg-white/5 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: animationDelay + index * 0.05 }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {medal ? (
                    <span className="text-lg flex-shrink-0">{medal}</span>
                  ) : (
                    <span className="w-7 text-center text-white/40 font-fifa-body text-sm flex-shrink-0">
                      {index + 1}
                    </span>
                  )}
                  <span className="font-fifa-body text-white truncate">
                    {winner.name}
                  </span>
                </div>
                <div className="flex-shrink-0 text-right">
                  {typeof winner.value === 'string' || typeof winner.value === 'number' ? (
                    <span className={`font-fifa-display font-bold ${colorClass.text}`}>
                      {winner.value}
                    </span>
                  ) : (
                    winner.value
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Content - Single Value */}
      {value && !winners && (
        <div className="flex items-center justify-center py-4">
          <span className={`font-fifa-display text-4xl font-bold ${colorClass.text} text-glow`}>
            {value}
          </span>
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="mt-3 text-sm text-white/60 font-fifa-body">
          {description}
        </p>
      )}
    </motion.div>
  );
};
