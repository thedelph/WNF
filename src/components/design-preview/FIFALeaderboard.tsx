import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { fifaAnimations, MEDALS, getRarityFromXP, RARITY_CLASSES } from '../../constants/fifaTheme';

interface LeaderboardPlayer {
  id: string;
  friendlyName: string;
  xp?: number;
  value: string | number | ReactNode;
  secondaryValue?: string;
}

interface FIFALeaderboardProps {
  title: string;
  icon?: ReactNode;
  players: LeaderboardPlayer[];
  maxRows?: number;
  color?: 'blue' | 'gold' | 'pink' | 'green' | 'purple';
  showRarity?: boolean;
}

const colorClasses = {
  blue: 'text-fifa-electric border-fifa-electric/30',
  gold: 'text-fifa-gold border-fifa-gold/30',
  pink: 'text-fifa-pink border-fifa-pink/30',
  green: 'text-fifa-green border-fifa-green/30',
  purple: 'text-fifa-purple border-fifa-purple/30',
};

export const FIFALeaderboard = ({
  title,
  icon,
  players,
  maxRows = 10,
  color = 'blue',
  showRarity = false,
}: FIFALeaderboardProps) => {
  const displayPlayers = players.slice(0, maxRows);

  return (
    <motion.div
      className={`
        fifa-card p-5 md:p-6
        border ${colorClasses[color].split(' ')[1]}
      `}
      variants={fifaAnimations.cardEntrance}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/10">
        {icon && (
          <div className={colorClasses[color].split(' ')[0]}>
            {icon}
          </div>
        )}
        <h3 className={`font-fifa-display text-xl font-bold ${colorClasses[color].split(' ')[0]}`}>
          {title}
        </h3>
      </div>

      {/* Leaderboard rows */}
      <div className="space-y-2">
        {displayPlayers.map((player, index) => {
          const medal = index < MEDALS.length ? MEDALS[index] : null;
          const rarity = showRarity && player.xp ? getRarityFromXP(player.xp) : null;
          const rarityClass = rarity ? RARITY_CLASSES[rarity] : '';

          return (
            <motion.div
              key={player.id}
              className={`
                fifa-row flex items-center gap-3 p-3
                ${rarityClass}
              `}
              variants={fifaAnimations.rowEntrance}
              custom={index}
              initial="hidden"
              animate="visible"
            >
              {/* Rank */}
              <div className="w-8 flex-shrink-0 text-center">
                {medal ? (
                  <span className="text-xl">{medal}</span>
                ) : (
                  <span className="font-fifa-display text-white/40">{index + 1}</span>
                )}
              </div>

              {/* Player name */}
              <div className="flex-1 min-w-0">
                <span className="font-fifa-body text-white font-medium truncate block">
                  {player.friendlyName}
                </span>
                {player.secondaryValue && (
                  <span className="text-xs text-white/50">{player.secondaryValue}</span>
                )}
              </div>

              {/* Value */}
              <div className={`flex-shrink-0 font-fifa-display font-bold ${colorClasses[color].split(' ')[0]}`}>
                {typeof player.value === 'string' || typeof player.value === 'number'
                  ? player.value
                  : player.value}
              </div>
            </motion.div>
          );
        })}

        {displayPlayers.length === 0 && (
          <div className="text-center py-8 text-white/40 font-fifa-body">
            No data available
          </div>
        )}
      </div>
    </motion.div>
  );
};
