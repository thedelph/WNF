import React from 'react';
import { motion } from 'framer-motion';
import PlayerCard from '../PlayerCard';
import { ExtendedPlayerData } from '../../types/playerSelection';

interface PlayerListProps {
  players: ExtendedPlayerData[];
  isExpanded: boolean;
  children?: React.ReactNode;
  renderPlayerExtra?: (player: ExtendedPlayerData) => React.ReactNode;
}

/**
 * Reusable component for displaying a grid of player cards
 * Handles animation and layout of player cards
 * Uses rarity values from the database
 */
export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  isExpanded,
  children,
  renderPlayerExtra
}) => {
  // Sort players by XP in descending order
  const sortedPlayers = [...players].sort((a, b) =>
    (b.xp || 0) - (a.xp || 0)
  );

  return (
    <motion.div
      initial={false}
      animate={{ height: isExpanded ? 'auto' : 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 p-4 justify-items-center sm:justify-items-stretch">
        {sortedPlayers.map((player) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col gap-2">
              <PlayerCard
                {...player}
                rarity={player.rarity || 'Amateur'}
              />
              {renderPlayerExtra && renderPlayerExtra(player)}
            </div>
          </motion.div>
        ))}
        {children}
      </div>
    </motion.div>
  );
};
