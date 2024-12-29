import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExtendedPlayerData } from '../../types/playerSelection';
import PlayerCard from '../PlayerCard';
import { calculatePlayerXP } from '../../utils/xpCalculations';
import { calculateRarity } from '../../utils/rarityCalculations';
import { usePlayerStats } from '../../hooks/usePlayerStats';

interface PlayerListProps {
  players: ExtendedPlayerData[];
  isExpanded: boolean;
  children?: (player: ExtendedPlayerData) => React.ReactNode;
}

/**
 * Reusable component for displaying a grid of player cards
 * Handles animation and layout of player cards
 * Uses global XP values for rarity calculation
 */
export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  isExpanded,
  children
}) => {
  const { allPlayersXP, loading } = usePlayerStats();

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                id={player.id}
                friendlyName={player.friendly_name}
                caps={player.stats.caps}
                preferredPosition={player.preferredPosition}
                activeBonuses={player.stats.activeBonuses}
                activePenalties={player.stats.activePenalties}
                winRate={player.win_rate}
                currentStreak={player.stats.currentStreak}
                maxStreak={player.max_streak}
                rarity={!loading ? calculateRarity(calculatePlayerXP(player.stats), allPlayersXP) : 'Common'}
                avatarSvg={player.avatar_svg}
                isRandomlySelected={player.isRandomlySelected}
                hasSlotOffer={player.slotOffers?.some(offer => offer.status === 'pending')}
                slotOfferStatus={player.has_declined ? 'declined' : player.slotOffers?.find(offer => offer.status === 'pending') ? 'pending' : undefined}
              >
                {children?.(player)}
              </PlayerCard>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
