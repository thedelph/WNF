import React from 'react';
import { motion } from 'framer-motion';
import { PlayerCard } from '../player-card/PlayerCard';
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
  return (
    <motion.div
      initial={false}
      animate={{ height: isExpanded ? 'auto' : 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 p-4 justify-items-center sm:justify-items-stretch">
        {players.map((player) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col gap-2">
              <PlayerCard
                id={player.id}
                friendlyName={player.friendlyName}
                caps={player.caps}
                activeBonuses={player.activeBonuses}
                activePenalties={player.activePenalties}
                winRate={player.winRate}
                currentStreak={player.currentStreak}
                maxStreak={player.maxStreak}
                avatarSvg={player.avatarSvg}
                rarity={player.rarity}
                wins={player.wins}
                draws={player.draws}
                losses={player.losses}
                whatsapp_group_member={player.whatsapp_group_member}
                isRandomlySelected={player.isRandomlySelected}
                rank={player.rank}
                xp={player.xp}
                totalGames={player.totalGames}
                hasSlotOffer={player.hasSlotOffer}
                slotOfferStatus={player.slotOfferStatus}
                slotOfferExpiresAt={player.slotOfferExpiresAt}
                slotOfferAvailableAt={player.slotOfferAvailableAt}
                potentialOfferTimes={player.potentialOfferTimes}
                hasActiveSlotOffers={player.hasActiveSlotOffers}
                status={player.status}
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
