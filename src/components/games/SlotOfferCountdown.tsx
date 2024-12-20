import React, { useEffect, useState } from 'react';
import { calculatePlayerXP } from '../../utils/calculatePlayerXP';
import { ExtendedPlayerData, PlayerXPStats } from '../../types/player';
import { CheckCircle } from 'lucide-react';

interface SlotOfferCountdownProps {
  player: ExtendedPlayerData;
  reservePlayers: ExtendedPlayerData[];
  gameDate: Date | null;
  firstDropoutTime: Date | null;
  hasActiveOffers: boolean;
  selectedPlayersCount: number;
  maxPlayers: number;
}

export const SlotOfferCountdown: React.FC<SlotOfferCountdownProps> = ({
  player,
  reservePlayers,
  gameDate,
  firstDropoutTime,
  hasActiveOffers,
  selectedPlayersCount,
  maxPlayers
}) => {
  const [timeUntilOffer, setTimeUntilOffer] = useState<string | null>(null);

  const playerIndex = reservePlayers.findIndex(p => p.id === player.id);
  const isFirstReserve = playerIndex === 0;
  const slotsAvailable = maxPlayers > selectedPlayersCount;

  // Don't show anything if player has declined
  if (player.hasDeclined) {
    return null;
  }

  // If there are no active offers and slots are available, show "Available Now" for first reserve
  if (isFirstReserve && !hasActiveOffers && slotsAvailable) {
    return (
      <div className="badge badge-success gap-2">
        <div className="flex items-center">
          <span className="mr-1">Available Now</span>
          <CheckCircle className="h-4 w-4" />
        </div>
      </div>
    );
  }

  // Don't show any countdown if there are no active offers
  if (!hasActiveOffers) {
    return null;
  }

  useEffect(() => {
    const calculateTimeUntilOffer = () => {
      // If there are no active offers and all slots are filled, don't show countdown
      if (!hasActiveOffers && selectedPlayersCount >= maxPlayers) {
        console.log('No active offers and all slots filled');
        return null;
      }

      if (!firstDropoutTime) {
        console.log('No first dropout time');
        return null;
      }

      // Sort players by XP
      const sortedPlayers = [...reservePlayers].sort((a, b) => {
        const xpStatsA: PlayerXPStats = {
          caps: a.stats?.caps || 0,
          activeBonuses: a.stats?.activeBonuses || 0,
          activePenalties: a.stats?.activePenalties || 0,
          currentStreak: a.stats?.currentStreak || 0,
          dropoutPenalties: a.stats?.dropoutPenalties || 0
        };
        const xpStatsB: PlayerXPStats = {
          caps: b.stats?.caps || 0,
          activeBonuses: b.stats?.activeBonuses || 0,
          activePenalties: b.stats?.activePenalties || 0,
          currentStreak: b.stats?.currentStreak || 0,
          dropoutPenalties: b.stats?.dropoutPenalties || 0
        };
        return calculatePlayerXP(xpStatsB) - calculatePlayerXP(xpStatsA);
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
        gameDate: gameDate?.toISOString(),
        firstDropoutTime: firstDropoutTime.toISOString(),
        now: new Date().toISOString()
      });

      const totalPlayers = sortedPlayers.length;
      const now = new Date();
      
      // Get the current player's registration
      const playerRegistration = sortedPlayers[playerIndex];
      
      // If player has declined, show that first
      if (playerRegistration?.hasDeclined) {
        console.log('Player has declined');
        return { text: "Offer Declined", isAvailable: false };
      }
      
      // Set gameDayStart to midnight of the game day in local timezone
      const gameDayStart = new Date(gameDate || new Date());
      gameDayStart.setHours(0, 0, 0, 0);

      // Calculate total time window for offers (from first dropout until game day)
      const totalTimeWindow = gameDayStart.getTime() - firstDropoutTime.getTime();
      
      // Get active reserve players (excluding declined offers)
      const activeReservePlayers = sortedPlayers.filter(p => !p.hasDeclined);
      const totalActivePlayers = activeReservePlayers.length;
      
      // Calculate time per player (divide window by number of ACTIVE reserve players)
      const timePerPlayer = totalTimeWindow / totalActivePlayers;
      
      // Find player's position in active players list
      const activePlayerIndex = activeReservePlayers.findIndex(p => p.id === player.id);
      if (activePlayerIndex === -1) {
        console.log('Player not found in active players list');
        return null;
      }
      
      // Calculate when this player's offer should be available
      const playerOfferTime = new Date(firstDropoutTime.getTime() + (timePerPlayer * activePlayerIndex));

      console.log('Time calculations:', {
        now: now.toISOString(),
        gameDate: gameDate?.toISOString(),
        gameDayStart: gameDayStart.toISOString(),
        hoursUntilGameDay: (gameDayStart.getTime() - now.getTime()) / (1000 * 60 * 60),
        playerOfferTime: playerOfferTime.toISOString(),
        timePerPlayer: timePerPlayer / (1000 * 60 * 60) + ' hours',
        totalActivePlayers,
        activePlayerIndex,
        hasDeclined: playerRegistration?.hasDeclined,
        hasOffer: playerRegistration?.hasSlotOffer
      });

      // If it's past game day, return "Available Now"
      if (now >= gameDayStart) {
        console.log('Past game day');
        return { text: "Available Now", isAvailable: true };
      }

      // If this player has an active offer, show "Available Now"
      if (playerRegistration?.hasSlotOffer) {
        console.log('Player has offer');
        return { text: "Available Now", isAvailable: true };
      }

      // If it's past the player's offer time and they haven't declined
      if (now >= playerOfferTime && !playerRegistration?.hasDeclined) {
        console.log('Past player offer time');
        return { text: "Available Now", isAvailable: true };
      }

      // Calculate time until offer
      const timeUntilOffer = playerOfferTime.getTime() - now.getTime();
      const hours = Math.floor(timeUntilOffer / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilOffer % (1000 * 60 * 60)) / (1000 * 60));

      // Return formatted time string
      return {
        text: `${hours}h ${minutes}m`,
        isAvailable: false
      };
    };

    // Update countdown every minute
    const interval = setInterval(() => {
      const result = calculateTimeUntilOffer();
      if (result) {
        setTimeUntilOffer(result.text);
      }
    }, 60000);

    // Initial calculation
    const result = calculateTimeUntilOffer();
    if (result) {
      setTimeUntilOffer(result.text);
    }

    return () => clearInterval(interval);
  }, [player, reservePlayers, gameDate, firstDropoutTime, hasActiveOffers, selectedPlayersCount, maxPlayers]);

  if (!timeUntilOffer) {
    return null;
  }

  return (
    <div className="badge badge-info gap-2">
      <div className="flex items-center">
        <span className="mr-1">{timeUntilOffer}</span>
      </div>
    </div>
  );
};
