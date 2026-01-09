/**
 * TrophyCabinet component - displays player's trophies on their profile
 * Design: Clean gradient card style matching site aesthetics
 */

import { useState, useEffect, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePlayerTrophies } from '../../hooks/usePlayerTrophies';
import { useUser } from '../../hooks/useUser';
import { AWARD_CATEGORIES, getCategoryGradient, getCategoryShadow } from '../../constants/awards';
import { PlayerTrophy } from '../../types/awards';

interface TrophyCabinetProps {
  playerId: string;
  playerName: string;
}

interface TrophyItemProps {
  trophy: PlayerTrophy;
  index: number;
}

const medals: Record<string, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
};

const TrophyItem = forwardRef<HTMLDivElement, TrophyItemProps>(({ trophy, index }, ref) => {
  const config = AWARD_CATEGORIES[trophy.category];
  const medal = medals[trophy.medalType];
  const gradientClass = getCategoryGradient(trophy.category);
  const shadowClass = getCategoryShadow(trophy.category);

  return (
    <motion.div
      ref={ref}
      className={`relative rounded-lg bg-gradient-to-br ${gradientClass} ${shadowClass} shadow-md p-3 text-white`}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      {/* Medal & Title */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{medal}</span>
        <span className="text-xs font-medium truncate drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">
          {config.title}
        </span>
      </div>

      {/* Year/Value */}
      <div className="text-[10px] opacity-80 drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">
        {trophy.year || 'All-Time'} • {config.valueFormatter(trophy.value)}
      </div>

      {/* Partner name for pair awards */}
      {config.isPairAward && trophy.partnerName && (
        <div className="text-[10px] opacity-70 mt-0.5 drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">
          with {trophy.partnerName}
        </div>
      )}
    </motion.div>
  );
});

TrophyItem.displayName = 'TrophyItem';

// Confetti celebration for trophy achievements
const triggerTrophyConfetti = (goldCount: number) => {
  const particleCount = goldCount >= 3 ? 150 : 80;

  // Gold confetti burst from center
  confetti({
    particleCount,
    spread: 100,
    origin: { y: 0.6, x: 0.5 },
    colors: ['#FFD700', '#FFA500', '#FFEC8B', '#DAA520', '#F0E68C'],
    ticks: 200,
    gravity: 0.8,
    scalar: 1.2,
    shapes: ['circle', 'square'],
  });

  // Side bursts for extra celebration
  if (goldCount >= 2) {
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ['#C0C0C0', '#E8E8E8', '#B8B8B8', '#FFD700'],
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ['#C0C0C0', '#E8E8E8', '#B8B8B8', '#FFD700'],
      });
    }, 250);
  }
};

export const TrophyCabinet = ({ playerId, playerName }: TrophyCabinetProps) => {
  const { trophies, counts, loading, hasTrophies } = usePlayerTrophies(playerId);
  const { player: currentPlayer } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);
  const confettiTriggered = useRef(false);

  // Check if viewing own profile
  const isOwnProfile = currentPlayer?.id === playerId;

  // Trigger confetti when viewing own profile with gold trophies
  useEffect(() => {
    if (
      isOwnProfile &&
      hasTrophies &&
      counts.gold > 0 &&
      !loading &&
      !confettiTriggered.current
    ) {
      const timer = setTimeout(() => {
        triggerTrophyConfetti(counts.gold);
        confettiTriggered.current = true;
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isOwnProfile, hasTrophies, counts.gold, loading]);

  // Show first 6 trophies by default, all when expanded
  const displayTrophies = isExpanded ? trophies : trophies.slice(0, 6);
  const hasMoreTrophies = trophies.length > 6;

  if (loading) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="card-title text-lg">Trophy Cabinet</h2>
          </div>
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!hasTrophies) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="card-title text-lg">Trophy Cabinet</h2>
          </div>
          <div className="text-center py-8">
            <Trophy className="w-14 h-14 mx-auto mb-4 text-base-content/20" strokeWidth={1} />
            <p className="text-base-content/60">No trophies yet</p>
            <p className="text-xs text-base-content/40 mt-2">
              Awards are given at the end of each season
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="card bg-base-200 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary" />
            <div>
              <h2 className="card-title text-lg">Trophy Cabinet</h2>
              <div className="flex items-center gap-2 mt-1">
                {/* Medal counts */}
                {counts.gold > 0 && (
                  <span className="badge badge-sm bg-yellow-400/20 text-yellow-600 border-yellow-400/30">
                    🥇 {counts.gold}
                  </span>
                )}
                {counts.silver > 0 && (
                  <span className="badge badge-sm bg-gray-400/20 text-gray-600 dark:text-gray-300 border-gray-400/30">
                    🥈 {counts.silver}
                  </span>
                )}
                {counts.bronze > 0 && (
                  <span className="badge badge-sm bg-orange-400/20 text-orange-600 border-orange-400/30">
                    🥉 {counts.bronze}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* View all awards link */}
          <Link
            to="/leaderboards"
            className="btn btn-ghost btn-sm gap-2"
          >
            <span className="hidden sm:inline">Hall of Fame</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Trophy grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {displayTrophies.map((trophy, index) => (
              <TrophyItem key={trophy.id} trophy={trophy} index={index} />
            ))}
          </AnimatePresence>
        </div>

        {/* Expand/collapse button */}
        {hasMoreTrophies && (
          <button
            className="btn btn-ghost btn-sm w-full mt-4 gap-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                Show Less
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Show All {trophies.length} Trophies
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default TrophyCabinet;
