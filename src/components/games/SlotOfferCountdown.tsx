import React, { useEffect, useState } from 'react';
import { calculatePlayerXP } from '../../utils/xpCalculations';
import { ExtendedPlayerData } from '../../types/playerSelection';

interface SlotOfferCountdownProps {
  player: ExtendedPlayerData;
  reservePlayers: ExtendedPlayerData[];
  gameDate: Date;
  firstDropoutTime: Date | null;
}

export const SlotOfferCountdown: React.FC<SlotOfferCountdownProps> = ({
  player,
  reservePlayers,
  gameDate,
  firstDropoutTime
}) => {
  const [timeUntilOffer, setTimeUntilOffer] = useState<string | null>(null);

  useEffect(() => {
    const calculateTimeUntilOffer = () => {
      if (!firstDropoutTime) {
        console.log('No first dropout time');
        return null;
      }

      // Sort players by XP
      const sortedPlayers = [...reservePlayers].sort((a, b) => {
        const xpA = calculatePlayerXP(a.stats);
        const xpB = calculatePlayerXP(b.stats);
        return xpB - xpA;
      });

      // Find player's position in the sorted list
      const playerIndex = sortedPlayers.findIndex(p => p.id === player.id);
      if (playerIndex === -1) {
        console.log('Player not found in sorted list');
        return null;
      }

      console.log('Calculating offer time for:', player.friendly_name, {
        playerIndex,
        totalPlayers: sortedPlayers.length,
        gameDate: gameDate.toISOString(),
        firstDropoutTime: firstDropoutTime.toISOString(),
        now: new Date().toISOString()
      });

      const totalPlayers = sortedPlayers.length;
      const now = new Date();
      
      // Get the current player's registration
      const playerRegistration = sortedPlayers[playerIndex];
      
      // If player has declined, show that first
      if (playerRegistration?.has_declined) {
        console.log('Player has declined');
        return { text: "Offer Declined", isAvailable: false };
      }
      
      // Set gameDayStart to midnight of the game day in local timezone
      const gameDayStart = new Date(gameDate);
      gameDayStart.setHours(0, 0, 0, 0);

      // Calculate total time window for offers (from first dropout until game day)
      const totalTimeWindow = gameDayStart.getTime() - firstDropoutTime.getTime();
      
      // Calculate time per player (divide window by number of reserve players)
      const timePerPlayer = totalTimeWindow / totalPlayers;
      
      // Calculate when this player's offer should be available
      const playerOfferTime = new Date(firstDropoutTime.getTime() + (timePerPlayer * playerIndex));

      console.log('Time calculations:', {
        now: now.toISOString(),
        gameDate: gameDate.toISOString(),
        gameDayStart: gameDayStart.toISOString(),
        hoursUntilGameDay: (gameDayStart.getTime() - now.getTime()) / (1000 * 60 * 60),
        playerOfferTime: playerOfferTime.toISOString(),
        timePerPlayer: timePerPlayer / (1000 * 60 * 60) + ' hours',
        hasDeclined: playerRegistration?.has_declined,
        hasOffer: playerRegistration?.has_offer
      });

      // If it's past game day, return "Available Now"
      if (now >= gameDayStart) {
        console.log('Past game day');
        return { text: "Available Now", isAvailable: true };
      }

      // If this player has an active offer, show "Available Now"
      if (playerRegistration?.has_offer) {
        console.log('Player has offer');
        return { text: "Available Now", isAvailable: true };
      }

      // If it's past the player's offer time and they haven't declined
      if (now >= playerOfferTime && !playerRegistration?.has_declined) {
        console.log('Past player offer time');
        return { text: "Available Now", isAvailable: true };
      }

      // Calculate time remaining until this player's offer
      const timeRemaining = playerOfferTime.getTime() - now.getTime();
      const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        console.log(`Offer in ${days}d ${hours % 24}h`);
        return { 
          text: `Offer in ${days}d ${hours % 24}h`, 
          isAvailable: false 
        };
      }
      
      console.log(`Offer in ${hours}h ${minutes}m`);
      return { 
        text: `Offer in ${hours}h ${minutes}m`, 
        isAvailable: false 
      };
    };

    // Initial calculation
    const result = calculateTimeUntilOffer();
    console.log('Countdown result:', result);
    setTimeUntilOffer(result ? JSON.stringify(result) : null);

    // Update every minute
    const interval = setInterval(() => {
      const result = calculateTimeUntilOffer();
      setTimeUntilOffer(result ? JSON.stringify(result) : null);
    }, 60000);

    return () => clearInterval(interval);
  }, [player, reservePlayers, gameDate, firstDropoutTime]);

  if (!timeUntilOffer) return null;

  const { text, isAvailable } = JSON.parse(timeUntilOffer);

  return (
    <div className={`badge ${isAvailable ? 'badge-success' : 'badge-neutral'} badge-sm gap-1`}>
      {isAvailable ? (
        <>
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          {text}
        </>
      ) : (
        text
      )}
    </div>
  );
};
