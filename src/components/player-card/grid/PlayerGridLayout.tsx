import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerCardProps } from '../PlayerCardTypes';
import { PlayerCard } from '../PlayerCard';

interface LayoutProps {
  players: PlayerCardProps[];
}

/**
 * Component for laying out player cards in a responsive grid
 * Handles animations and responsive layout of player cards
 * Mobile: 1 card per row, centered
 * Tablet: 2 cards per row
 * Laptop: 3 cards per row
 * Desktop: 4 cards per row
 * Large Desktop: 5 cards per row
 * Extra Large Desktop: 6 cards per row
 */
export const PlayerGridLayout: React.FC<LayoutProps> = ({ players }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6 place-items-center">
      <AnimatePresence>
        {players.map((player) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[320px]"
          >
            <PlayerCard
              id={player.id}
              friendlyName={player.friendlyName}
              caps={player.caps}
              activeBonuses={player.activeBonuses}
              activePenalties={player.activePenalties}
              winRate={player.winRate}
              currentStreak={player.currentStreak}
              maxStreak={player.maxStreak}
              benchWarmerStreak={player.benchWarmerStreak}
              avatarSvg={player.avatarSvg}
              rarity={player.rarity}
              wins={player.wins}
              draws={player.draws}
              losses={player.losses}
              whatsapp_group_member={player.whatsapp_group_member}
              isRandomlySelected={player.isRandomlySelected}
              // Only pass rank if player has XP > 0 (not Retired)
              rank={player.xp > 0 ? player.rank : undefined}
              xp={player.xp}
              totalGames={player.totalGames}
              hasSlotOffer={player.hasSlotOffer}
              slotOfferStatus={player.slotOfferStatus}
              slotOfferExpiresAt={player.slotOfferExpiresAt}
              slotOfferAvailableAt={player.slotOfferAvailableAt}
              potentialOfferTimes={player.potentialOfferTimes}
              hasActiveSlotOffers={player.hasActiveSlotOffers}
              status={player.status}
              registrationStreakBonus={player.registrationStreakBonus}
              registrationStreakBonusApplies={player.registrationStreakBonusApplies}
              unpaidGames={player.unpaidGames}
              unpaidGamesModifier={player.unpaidGamesModifier}
              averagedPlaystyle={player.averagedPlaystyle}
              playstyleMatchDistance={player.playstyleMatchDistance}
              playstyleCategory={player.playstyleCategory}
              playstyleRatingsCount={player.playstyleRatingsCount}
              shieldActive={player.shieldActive}
              frozenStreakValue={player.frozenStreakValue}
              injuryTokenActive={player.injuryTokenActive}
              injuryOriginalStreak={player.injuryOriginalStreak}
              injuryReturnStreak={player.injuryReturnStreak}
              injuryStreakBonus={player.injuryStreakBonus}
              recentGames={player.recentGames}
              gameParticipation={player.gameParticipation}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
