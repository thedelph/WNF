import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { RivalryStats, RIVALRY_MIN_GAMES } from '../../types/chemistry';
import { Tooltip } from '../ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// Rivalry messages organized by dominance level
const rivalryMessages = {
  dominant: [ // >70% win rate vs opponent
    "Complete ownership! They see you on the other team and panic.",
    "You've got their number. Every. Single. Time.",
    "They're basically your weekly donation to the win column.",
    "You vs them? That's not a rivalry, that's a clinic.",
    "They probably check the team sheets just to avoid you.",
    "Main character energy when you face them.",
  ],
  advantage: [ // 60-70% win rate
    "You've got the upper hand in this matchup.",
    "The head-to-head favours you nicely here.",
    "They make you work for it, but you usually win out.",
    "A rivalry you're quietly winning.",
    "You're their bogey player and they know it.",
  ],
  slight: [ // 55-60% win rate
    "You edge this rivalry, but only just.",
    "Close battles, but you come out on top more often.",
    "The margins are thin, but you have the edge.",
    "A competitive rivalry that tilts your way.",
  ],
  even: [ // 45-55% win rate
    "Perfectly matched rivals. This is what it's all about.",
    "Neither of you can claim bragging rights here.",
    "Every time you meet, it could go either way.",
    "The definition of a 50/50 battle.",
    "Respect the rivalry - it's as even as they come.",
    "This matchup is box office every single time.",
  ],
  disadvantage: [ // 40-45% win rate
    "They've got a slight edge on you... for now.",
    "The rivalry tilts their way, but it's close.",
    "You're competitive, but they edge it more often.",
    "A rivalry you're narrowly losing. Time to turn it around.",
  ],
  struggle: [ // 30-40% win rate
    "They've got your number at the moment.",
    "This is a rivalry you want to flip around.",
    "The head-to-head isn't kind to you here.",
    "Study their game - there's a pattern to break.",
  ],
  dominated: [ // <30% win rate
    "Time to avoid eye contact on the pitch.",
    "They're your nemesis. Pure and simple.",
    "Maybe stick to the same team as them?",
    "Some rivalries are just... cruel.",
    "Plot twist: you're their favourite opponent.",
  ],
};

// Get tier based on win percentage
const getRivalryTier = (winPct: number): keyof typeof rivalryMessages => {
  if (winPct >= 70) return 'dominant';
  if (winPct >= 60) return 'advantage';
  if (winPct >= 55) return 'slight';
  if (winPct >= 45) return 'even';
  if (winPct >= 40) return 'disadvantage';
  if (winPct >= 30) return 'struggle';
  return 'dominated';
};

// Get color class based on win percentage
const getRivalryColorClass = (winPct: number): string => {
  if (winPct >= 60) return 'text-success';
  if (winPct >= 45) return 'text-info';
  if (winPct >= 35) return 'text-warning';
  return 'text-error';
};

// Component to display rivalry message
const RivalryMessage: React.FC<{ winPercentage: number }> = ({ winPercentage }) => {
  const message = useMemo(() => {
    const tier = getRivalryTier(winPercentage);
    const messages = rivalryMessages[tier];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [winPercentage]);

  const colorClass = getRivalryColorClass(winPercentage);

  return <span className={colorClass}>{message}</span>;
};

interface RivalryCardProps {
  /** Rivalry stats between two players */
  rivalry: RivalryStats | null;
  /** Name of the other player */
  playerName: string;
  /** Games until rivalry threshold is met */
  gamesUntilRivalry: number;
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * Card showing rivalry (head-to-head) between the current user and viewed player
 */
export const RivalryCard: React.FC<RivalryCardProps> = ({
  rivalry,
  playerName,
  gamesUntilRivalry,
  loading = false,
}) => {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Swords className="w-5 h-5 text-error" />
            <h3 className="card-title text-lg">Your Rivalry with {playerName}</h3>
          </div>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Not enough games against each other
  if (!rivalry || rivalry.gamesAgainst < RIVALRY_MIN_GAMES) {
    const gamesPlayed = rivalry?.gamesAgainst ?? 0;
    const gamesNeeded = gamesUntilRivalry > 0 ? gamesUntilRivalry : RIVALRY_MIN_GAMES - gamesPlayed;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Swords className="w-5 h-5 text-error" />
            <h3 className="card-title text-lg">Your Rivalry with {playerName}</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-base-content/70 mb-2">
              {gamesPlayed > 0 ? (
                <>Faced each other <strong>{gamesPlayed}</strong> time{gamesPlayed !== 1 ? 's' : ''} on opposite teams</>
              ) : (
                <>You haven&apos;t faced each other on opposite teams yet</>
              )}
            </p>
            <p className="text-sm text-base-content/50">
              Face off <strong>{gamesNeeded}</strong> more time{gamesNeeded !== 1 ? 's' : ''} to unlock rivalry stats
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show rivalry stats
  const { playerWins, opponentWins, draws, gamesAgainst, winPercentage } = rivalry;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="w-5 h-5 text-error" />
          <h3 className="card-title text-lg">Your Rivalry with {playerName}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Head-to-head record */}
          <div className="text-center">
            <div className="text-sm text-base-content/70 mb-1">Head-to-Head</div>
            <div className="font-bold text-lg">
              <span className="text-success">{playerWins}W</span>
              {' '}
              <span className="text-warning">{draws}D</span>
              {' '}
              <span className="text-error">{opponentWins}L</span>
            </div>
            <div className="text-xs text-base-content/50">({gamesAgainst} games)</div>
          </div>

          {/* Win percentage */}
          <TooltipPrimitive.Provider>
            <Tooltip content="Your win rate when playing against this player (on opposite teams)">
              <div className="text-center cursor-help">
                <div className="text-sm text-base-content/70 mb-1">Win Rate</div>
                <div className={`font-bold text-lg ${getRivalryColorClass(winPercentage)}`}>
                  {winPercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-base-content/50">
                  vs {(100 - winPercentage).toFixed(1)}%
                </div>
              </div>
            </Tooltip>
          </TooltipPrimitive.Provider>
        </div>

        {/* Rivalry message */}
        <div className="mt-4 text-center text-sm">
          <RivalryMessage winPercentage={winPercentage} />
        </div>
      </div>
    </motion.div>
  );
};

export default RivalryCard;
