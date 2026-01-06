import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Swords, TrendingUp, TrendingDown } from 'lucide-react';
import { PlayerRival, RIVALRY_MIN_GAMES } from '../../types/chemistry';
import { toUrlFriendly } from '../../utils/urlHelpers';
import { Tooltip } from '../ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface TopRivalsProps {
  /** Rivals the player dominates */
  dominates: PlayerRival[];
  /** Rivals who dominate the player */
  dominatedBy: PlayerRival[];
  /** The player's name (for display) */
  playerName: string;
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * Card showing a player's top rivals (both those they dominate and those who dominate them)
 */
export const TopRivals: React.FC<TopRivalsProps> = ({
  dominates,
  dominatedBy,
  playerName,
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
            <h3 className="card-title text-lg">Top Rivalries</h3>
          </div>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </motion.div>
    );
  }

  const hasAnyRivals = dominates.length > 0 || dominatedBy.length > 0;

  if (!hasAnyRivals) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Swords className="w-5 h-5 text-error" />
            <h3 className="card-title text-lg">Top Rivalries</h3>
          </div>
          <p className="text-center text-base-content/70 py-4">
            No rivalry data yet. Play at least {RIVALRY_MIN_GAMES} games against someone to build a rivalry.
          </p>
        </div>
      </motion.div>
    );
  }

  const medals = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
  const medalIcons = ['1st', '2nd', '3rd'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="w-5 h-5 text-error" />
          <h3 className="card-title text-lg">Top Rivalries</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Players they dominate */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-success" />
              <h4 className="font-semibold text-sm text-success">
                {playerName} Dominates
              </h4>
            </div>

            {dominates.length === 0 ? (
              <p className="text-sm text-base-content/50 py-2">
                No one dominated yet
              </p>
            ) : (
              <div className="space-y-2">
                {dominates.map((rival, index) => (
                  <motion.div
                    key={rival.opponentId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-2 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs w-6 ${medals[index] || 'text-base-content/50'}`}>
                        {medalIcons[index] || `${index + 1}th`}
                      </span>
                      <Link
                        to={`/player/${toUrlFriendly(rival.opponentName)}`}
                        className="font-medium text-sm hover:text-primary transition-colors"
                      >
                        {rival.opponentName}
                      </Link>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-success text-sm">
                        {rival.winPercentage.toFixed(0)}%
                      </div>
                      <div className="text-xs text-base-content/50">
                        {rival.playerWins}W {rival.draws}D {rival.opponentWins}L
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Players who dominate them */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-error" />
              <h4 className="font-semibold text-sm text-error">
                Nemeses
              </h4>
            </div>

            {dominatedBy.length === 0 ? (
              <p className="text-sm text-base-content/50 py-2">
                No nemeses yet - unstoppable!
              </p>
            ) : (
              <div className="space-y-2">
                {dominatedBy.map((rival, index) => (
                  <motion.div
                    key={rival.opponentId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-2 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs w-6 ${medals[index] || 'text-base-content/50'}`}>
                        {medalIcons[index] || `${index + 1}th`}
                      </span>
                      <Link
                        to={`/player/${toUrlFriendly(rival.opponentName)}`}
                        className="font-medium text-sm hover:text-primary transition-colors"
                      >
                        {rival.opponentName}
                      </Link>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-error text-sm">
                        {rival.winPercentage.toFixed(0)}%
                      </div>
                      <div className="text-xs text-base-content/50">
                        {rival.playerWins}W {rival.draws}D {rival.opponentWins}L
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-base-content/50 text-center">
          <TooltipPrimitive.Provider>
            <Tooltip content="Rivalry stats show head-to-head records when playing on opposite teams.">
              <span className="cursor-help flex items-center justify-center gap-1">
                <Swords className="w-3 h-3" />
                Based on games against each other (min. {RIVALRY_MIN_GAMES} games)
              </span>
            </Tooltip>
          </TooltipPrimitive.Provider>
        </div>
      </div>
    </motion.div>
  );
};

export default TopRivals;
