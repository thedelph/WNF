import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExtendedPlayerData } from '../../types/playerSelection';
import PlayerCard from '../PlayerCard';
import { calculatePlayerXP } from '../../utils/xpCalculations';
import { calculateRarity } from '../../utils/rarityCalculations';
import { supabase } from '../../utils/supabase';

interface PlayerListProps {
  players: ExtendedPlayerData[];
  isExpanded: boolean;
  allXpValues: number[];
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
  allXpValues,
  children
}) => {
  const [latestSequence, setLatestSequence] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get latest historical game sequence
  useEffect(() => {
    const fetchLatestSequence = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('sequence_number')
        .eq('is_historical', true)
        .order('sequence_number', { ascending: false })
        .limit(1);

      if (!error && data?.length) {
        setLatestSequence(Number(data[0].sequence_number));
      }
      setIsLoading(false);
    };

    fetchLatestSequence();
  }, []);

  // Don't render until we have the latest sequence
  if (isLoading || latestSequence === null) {
    return null;
  }

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
            {players.map((player) => {
              // Calculate XP once for both rarity and display
              const playerXP = calculatePlayerXP({
                caps: player.stats.caps,
                activeBonuses: player.stats.activeBonuses,
                activePenalties: player.stats.activePenalties,
                currentStreak: player.stats.currentStreak,
                gameSequences: player.stats.gameSequences,
                latestSequence
              });

              // Use allXpValues prop for rarity calculation
              const rarity = calculateRarity(playerXP, allXpValues);

              return (
                <PlayerCard
                  key={player.id}
                  id={player.id}
                  friendlyName={player.friendly_name}
                  caps={player.stats.caps}
                  preferredPosition={player.preferredPosition}
                  activeBonuses={player.stats.activeBonuses}
                  activePenalties={player.stats.activePenalties}
                  winRate={player.win_rate || 0}
                  currentStreak={player.stats.currentStreak}
                  maxStreak={player.max_streak}
                  rarity={rarity}
                  xp={playerXP}
                  avatarSvg={player.avatar_svg}
                  isRandomlySelected={player.isRandomlySelected}
                  hasSlotOffer={player.slotOffers?.some(offer => offer.status === 'pending')}
                  slotOfferStatus={player.has_declined ? 'declined' : player.slotOffers?.find(offer => offer.status === 'pending') ? 'pending' : undefined}
                  gameSequences={player.stats.gameSequences}
                >
                  {children?.(player)}
                </PlayerCard>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
