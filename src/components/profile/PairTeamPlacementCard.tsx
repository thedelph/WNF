import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, Users, Swords } from 'lucide-react';
import { PairTeamPlacement, TEAM_PLACEMENT_MIN_GAMES } from '../../types/chemistry';
import { Tooltip } from '../ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// Team placement messages organized by "together rate" tier
const placementMessages = {
  inseparable: [ // 70%+ together
    "You two are practically inseparable on the pitch!",
    "The algorithm really loves putting you together.",
    "Destiny keeps pairing you up. Must be fate!",
    "At this point you're basically a package deal.",
    "Team captains see you as a two-for-one special.",
  ],
  often: [ // 60-70% together
    "You're often placed on the same side!",
    "The team sheets favor your partnership.",
    "More often allies than enemies. Good vibes.",
    "You two clearly have matching energy.",
    "Frequent teammates! The algorithm approves.",
  ],
  balanced: [ // 40-60% together
    "Fairly balanced team assignments.",
    "Sometimes allies, sometimes rivals. Keeps it interesting!",
    "The universe can't decide if you're friends or foes.",
    "Perfectly balanced, as all things should be.",
    "A bit of both worlds - teammate and opponent.",
  ],
  rivals: [ // 30-40% together
    "You face each other more often than not.",
    "The algorithm seems to enjoy the drama.",
    "More rivals than teammates. Rivalry brewing?",
    "You're destined to clash. Embrace it.",
    "Frequent opponents! The battle continues.",
  ],
  nemeses: [ // <30% together
    "The algorithm keeps putting you on opposite sides!",
    "You're eternal rivals at this point.",
    "The team sheet gods have spoken: opponents forever.",
    "At least you know each other's weaknesses by now?",
    "A rivalry written in the stars.",
  ],
};

// Get tier based on together percentage
const getTier = (togetherRate: number): keyof typeof placementMessages => {
  if (togetherRate >= 70) return 'inseparable';
  if (togetherRate >= 60) return 'often';
  if (togetherRate >= 40) return 'balanced';
  if (togetherRate >= 30) return 'rivals';
  return 'nemeses';
};

// Get color class based on together rate
const getColorClass = (togetherRate: number): string => {
  if (togetherRate >= 60) return 'text-success';
  if (togetherRate >= 40) return 'text-info';
  return 'text-warning';
};

interface PairTeamPlacementCardProps {
  /** Team placement stats between two players */
  placement: PairTeamPlacement | null;
  /** Name of the other player */
  playerName: string;
  /** Games until placement threshold is met */
  gamesUntilPlacement: number;
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * Card showing team placement history between the current user and viewed player
 */
export const PairTeamPlacementCard: React.FC<PairTeamPlacementCardProps> = ({
  placement,
  playerName,
  gamesUntilPlacement,
  loading = false,
}) => {
  const message = useMemo(() => {
    if (!placement) return '';
    const tier = getTier(placement.togetherRate);
    const messages = placementMessages[tier];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [placement]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <GitCompare className="w-5 h-5 text-secondary" />
            <h3 className="card-title text-lg">Your Team History with {playerName}</h3>
          </div>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Not enough games together
  if (!placement || placement.totalGames < TEAM_PLACEMENT_MIN_GAMES) {
    const gamesPlayed = placement?.totalGames ?? 0;
    const gamesNeeded = gamesUntilPlacement > 0 ? gamesUntilPlacement : TEAM_PLACEMENT_MIN_GAMES - gamesPlayed;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <GitCompare className="w-5 h-5 text-secondary" />
            <h3 className="card-title text-lg">Your Team History with {playerName}</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-base-content/70 mb-2">
              {gamesPlayed > 0 ? (
                <>Played <strong>{gamesPlayed}</strong> game{gamesPlayed !== 1 ? 's' : ''} together</>
              ) : (
                <>You haven&apos;t played in the same game yet</>
              )}
            </p>
            <p className="text-sm text-base-content/50">
              Play <strong>{gamesNeeded}</strong> more game{gamesNeeded !== 1 ? 's' : ''} together to unlock team placement stats
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const { totalGames, gamesTogether, gamesAgainst, togetherRate } = placement;
  const againstRate = 100 - togetherRate;
  const colorClass = getColorClass(togetherRate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <GitCompare className="w-5 h-5 text-secondary" />
          <h3 className="card-title text-lg">Your Team History with {playerName}</h3>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Teammates */}
          <TooltipPrimitive.Provider>
            <Tooltip content="Games where you were on the same team">
              <div className="text-center cursor-help p-3 bg-success/10 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-4 h-4 text-success" />
                  <span className="text-sm text-success font-medium">Teammates</span>
                </div>
                <div className="font-bold text-2xl text-success">{gamesTogether}</div>
                <div className="text-sm text-success/80">{togetherRate.toFixed(0)}%</div>
              </div>
            </Tooltip>
          </TooltipPrimitive.Provider>

          {/* Opponents */}
          <TooltipPrimitive.Provider>
            <Tooltip content="Games where you were on opposite teams">
              <div className="text-center cursor-help p-3 bg-warning/10 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Swords className="w-4 h-4 text-warning" />
                  <span className="text-sm text-warning font-medium">Opponents</span>
                </div>
                <div className="font-bold text-2xl text-warning">{gamesAgainst}</div>
                <div className="text-sm text-warning/80">{againstRate.toFixed(0)}%</div>
              </div>
            </Tooltip>
          </TooltipPrimitive.Provider>
        </div>

        {/* Visual progress bar */}
        <div className="w-full h-3 bg-base-200 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${togetherRate}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-success to-success/70 rounded-full"
          />
        </div>

        {/* Placement message */}
        <div className="text-center">
          <p className={`text-sm ${colorClass}`}>{message}</p>
          <p className="text-xs text-base-content/50 mt-1">
            Based on {totalGames} games played together
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default PairTeamPlacementCard;
