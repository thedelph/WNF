import React from 'react';
import { ExtendedPlayerData } from '../../types/playerSelection';

interface SlotOfferCountdownProps {
  player: ExtendedPlayerData;
  reservePlayers: ExtendedPlayerData[];
  gameDate: Date;
  firstDropoutTime: Date;
  hasActiveOffers: boolean;
  selectedPlayersCount: number;
  maxPlayers: number;
}

/**
 * Component to display slot offer countdown information for a player
 * Shows when a player has an active slot offer or potential offer times
 */
export const SlotOfferCountdown: React.FC<SlotOfferCountdownProps> = ({
  player,
  reservePlayers,
  gameDate,
  firstDropoutTime,
  hasActiveOffers,
  selectedPlayersCount,
  maxPlayers
}) => {
  // If player has an active slot offer, show the countdown
  if (player.hasSlotOffer && player.slotOfferExpiresAt) {
    const expiresAt = new Date(player.slotOfferExpiresAt);
    const now = new Date();
    const timeRemaining = expiresAt.getTime() - now.getTime();

    if (timeRemaining > 0) {
      const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

      return (
        <div className="text-sm text-warning">
          Slot offer expires in {hours}h {minutes}m
        </div>
      );
    }
  }

  // If player has potential offer times, show them ONLY if there are active offers (someone has dropped out)
  // We don't want to show speculative times when no dropout has occurred yet
  if (hasActiveOffers && player.potentialOfferTimes && player.slotOfferAvailableAt) {
    const availableAt = new Date(player.slotOfferAvailableAt);
    const now = new Date();

    if (availableAt > now) {
      return (
        <div className="text-sm text-info">
          Potential slot offer available at {availableAt.toLocaleTimeString()}
        </div>
      );
    }
  }

  // If there are no active offers and slots available, show reserve position
  if (!hasActiveOffers && selectedPlayersCount < maxPlayers) {
    const reservePosition = reservePlayers.findIndex(p => p.id === player.id);
    if (reservePosition >= 0) {
      return (
        <div className="text-sm text-base-content/60">
          Reserve position: {reservePosition + 1}
        </div>
      );
    }
  }

  return null;
};
