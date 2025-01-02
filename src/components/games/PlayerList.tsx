import React from 'react';
import { motion } from 'framer-motion';
import PlayerCard from '../PlayerCard';
import { calculateRarity } from '../../utils/rarityCalculations';
import { ExtendedPlayerData } from '../../types/playerSelection';

interface PlayerListProps {
  players: ExtendedPlayerData[];
  isExpanded: boolean;
  allXpValues: number[];
  children?: React.ReactNode;
  renderPlayerExtra?: (player: ExtendedPlayerData) => React.ReactNode;
}

/**
 * Reusable component for displaying a grid of player cards
 * Handles animation and layout of player cards
 * Uses global XP values for rarity calculation
 */
export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  isExpanded,
  allXpValues,
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
        {sortedPlayers.map((player) => {
          // Calculate rarity for each player
          const rarity = calculateRarity(player.xp || 0, allXpValues);

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col gap-2">
                {/* Render PlayerCard with player data and rarity */}
                <PlayerCard
                  {...player}
                  friendlyName={player.friendly_name}
                  rarity={rarity}
                />
                {/* Render extra content if provided */}
                {renderPlayerExtra && renderPlayerExtra(player)}
              </div>
            </motion.div>
          );
        })}
      </div>
      {/* Render children if provided */}
      {children}
    </motion.div>
  );
};
