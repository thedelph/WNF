import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, TrendingUp } from 'lucide-react';
import { PlayerTrio, TRIO_MIN_GAMES } from '../../types/chemistry';
import { toUrlFriendly } from '../../utils/urlHelpers';
import { Tooltip } from '../ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// Trio chemistry messages organized by win rate
const trioMessages = {
  dreamTeam: [ // >80% win rate
    "The holy trinity of WNF!",
    "Unstoppable trio. Just accept it.",
    "When you three play together, it's game over.",
    "Scientists call this 'the perfect storm'.",
    "Three heads, one brain. Winning brain.",
  ],
  elite: [ // 70-80% win rate
    "This trio is box office every time.",
    "A dangerous three to leave together.",
    "The opposition sees this lineup and sighs.",
    "Three musketeers energy. All for one win!",
  ],
  good: [ // 60-70% win rate
    "A reliable trio that gets results.",
    "You three know how to win together.",
    "Solid partnership - keep the band together!",
  ],
  average: [ // 50-60% win rate
    "A trio that holds its own.",
    "Decent results when you team up.",
    "Work in progress, but potential is there.",
  ],
  poor: [ // 40-50% win rate
    "Some teething problems as a trio.",
    "The chemistry is still cooking...",
    "Maybe try different combinations?",
  ],
  cursed: [ // <40% win rate
    "The anti-chemistry special.",
    "Three wrongs don't make a right.",
    "Cursed trio energy. Avoid at all costs.",
    "The opposition thanks you for grouping up.",
    "Some partnerships just aren't meant to be.",
  ],
};

// Get tier based on win rate
const getTrioTier = (winRate: number): keyof typeof trioMessages => {
  if (winRate >= 80) return 'dreamTeam';
  if (winRate >= 70) return 'elite';
  if (winRate >= 60) return 'good';
  if (winRate >= 50) return 'average';
  if (winRate >= 40) return 'poor';
  return 'cursed';
};

// Get color class based on win rate
const getTrioColorClass = (winRate: number): string => {
  if (winRate >= 70) return 'text-success';
  if (winRate >= 50) return 'text-info';
  if (winRate >= 40) return 'text-warning';
  return 'text-error';
};

interface TopTriosProps {
  /** Player's best trio combinations */
  trios: PlayerTrio[];
  /** Whether data is loading */
  loading?: boolean;
  /** Title for the section */
  title?: string;
}

/**
 * Card showing a player's best trio combinations
 */
export const TopTrios: React.FC<TopTriosProps> = ({
  trios,
  loading = false,
  title = 'Best Trio Combinations',
}) => {
  // Get a random message for the best trio (if exists)
  const topTrioMessage = useMemo(() => {
    if (trios.length === 0) return null;
    const tier = getTrioTier(trios[0].winRate);
    const messages = trioMessages[tier];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [trios]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-500" />
            <h3 className="card-title text-lg">{title}</h3>
          </div>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (trios.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-500" />
            <h3 className="card-title text-lg">{title}</h3>
          </div>
          <p className="text-center text-base-content/70 py-4">
            No trio data yet. Play at least {TRIO_MIN_GAMES} games with two other players to see trio stats.
          </p>
        </div>
      </motion.div>
    );
  }

  const medals = ['text-yellow-500', 'text-base-content/60', 'text-amber-600'];
  const medalIcons = ['1st', '2nd', '3rd'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-500" />
          <h3 className="card-title text-lg">{title}</h3>
        </div>

        {/* Column headers */}
        <div className="flex items-center justify-between p-3 text-xs text-base-content/60 border-b border-base-300 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-8"></div>
            <span>Partners</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:block">Record</span>
            <span className="font-bold">Win % | Score</span>
          </div>
        </div>

        <div className="space-y-3">
          {trios.map((trio, index) => (
            <motion.div
              key={`${trio.partner1Id}-${trio.partner2Id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                <div className={`font-bold text-sm w-8 ${medals[index] || 'text-base-content/50'}`}>
                  {medalIcons[index] || `${index + 1}th`}
                </div>

                {/* Partner names */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <Link
                    to={`/player/${toUrlFriendly(trio.partner1Name)}`}
                    className="font-medium hover:text-primary transition-colors text-sm"
                  >
                    {trio.partner1Name}
                  </Link>
                  <span className="text-base-content/50 text-xs">&</span>
                  <Link
                    to={`/player/${toUrlFriendly(trio.partner2Name)}`}
                    className="font-medium hover:text-primary transition-colors text-sm"
                  >
                    {trio.partner2Name}
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                {/* W/D/L Record with games count */}
                <div className="hidden sm:block">
                  <span className="text-success">{trio.wins}W</span>
                  {' '}
                  <span className="text-warning">{trio.draws}D</span>
                  {' '}
                  <span className="text-error">{trio.losses}L</span>
                  {' '}
                  <span className="text-base-content/50">({trio.gamesTogether})</span>
                </div>

                {/* Win rate and trio score */}
                <div className={`font-bold ${getTrioColorClass(trio.winRate)}`}>
                  {trio.winRate.toFixed(0)}% | {trio.trioScore.toFixed(1)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Top trio message */}
        {topTrioMessage && (
          <div className="mt-4 text-center text-sm">
            <span className={getTrioColorClass(trios[0].winRate)}>{topTrioMessage}</span>
          </div>
        )}

        <div className="mt-4 text-xs text-base-content/50 text-center">
          <TooltipPrimitive.Provider>
            <Tooltip content="Trio score factors in both win rate and sample size. More games = more reliable score.">
              <span className="cursor-help flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Ranked by trio score (min. {TRIO_MIN_GAMES} games)
              </span>
            </Tooltip>
          </TooltipPrimitive.Provider>
        </div>
      </div>
    </motion.div>
  );
};

export default TopTrios;
