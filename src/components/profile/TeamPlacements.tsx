import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, Swords, Shuffle } from 'lucide-react';
import { TeamPlacementPartner, TEAM_PLACEMENT_MIN_GAMES } from '../../types/chemistry';
import { toUrlFriendly } from '../../utils/urlHelpers';
import { Tooltip } from '../ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface TeamPlacementsProps {
  /** Players most often on the same team */
  frequentTeammates: TeamPlacementPartner[];
  /** Players most often on the opposite team */
  frequentOpponents: TeamPlacementPartner[];
  /** The player's name (for display) */
  playerName: string;
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * Progress bar component for visual percentage display
 */
const PercentageBar: React.FC<{
  percentage: number;
  colorClass: string;
  index: number;
}> = ({ percentage, colorClass, index }) => (
  <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden mt-1">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${percentage}%` }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
      className={`h-full rounded-full ${colorClass}`}
    />
  </div>
);

/**
 * Card showing a player's frequent teammates and opponents
 */
export const TeamPlacements: React.FC<TeamPlacementsProps> = ({
  frequentTeammates,
  frequentOpponents,
  playerName,
  loading = false,
}) => {
  const medals = ['text-yellow-500', 'text-base-content/60', 'text-amber-600'];
  const medalIcons = ['1st', '2nd', '3rd'];

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Shuffle className="w-5 h-5 text-secondary" />
            <h3 className="card-title text-lg">Team Placement Patterns</h3>
          </div>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </motion.div>
    );
  }

  const hasAnyData = frequentTeammates.length > 0 || frequentOpponents.length > 0;

  if (!hasAnyData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Shuffle className="w-5 h-5 text-secondary" />
            <h3 className="card-title text-lg">Team Placement Patterns</h3>
          </div>
          <p className="text-center text-base-content/70 py-4">
            No team placement data yet. Play at least {TEAM_PLACEMENT_MIN_GAMES} games with someone to see patterns.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-2">
          <Shuffle className="w-5 h-5 text-secondary" />
          <h3 className="card-title text-lg">Team Placement Patterns</h3>
        </div>
        <p className="text-xs text-base-content/50 mb-4">
          Who {playerName} is most often placed with or against
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Frequent Teammates */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-success" />
              <h4 className="font-semibold text-sm text-success">
                Frequent Teammates
              </h4>
            </div>

            {frequentTeammates.length === 0 ? (
              <p className="text-sm text-base-content/50 py-2">
                No frequent teammates yet
              </p>
            ) : (
              <div className="space-y-3">
                {frequentTeammates.map((partner, index) => (
                  <motion.div
                    key={partner.partnerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-2 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs w-6 ${medals[index] || 'text-base-content/50'}`}>
                          {medalIcons[index] || `${index + 1}th`}
                        </span>
                        <Link
                          to={`/player/${toUrlFriendly(partner.partnerName)}`}
                          className="font-medium text-sm hover:text-primary transition-colors"
                        >
                          {partner.partnerName}
                        </Link>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-success text-sm">
                          {partner.togetherRate.toFixed(0)}%
                        </div>
                        <div className="text-xs text-base-content/50">
                          ({partner.totalGames})
                        </div>
                      </div>
                    </div>
                    <PercentageBar
                      percentage={partner.togetherRate}
                      colorClass="bg-success"
                      index={index}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Frequent Opponents */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Swords className="w-4 h-4 text-warning" />
              <h4 className="font-semibold text-sm text-warning">
                Frequent Opponents
              </h4>
            </div>

            {frequentOpponents.length === 0 ? (
              <p className="text-sm text-base-content/50 py-2">
                No frequent opponents yet
              </p>
            ) : (
              <div className="space-y-3">
                {frequentOpponents.map((partner, index) => (
                  <motion.div
                    key={partner.partnerId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-2 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs w-6 ${medals[index] || 'text-base-content/50'}`}>
                          {medalIcons[index] || `${index + 1}th`}
                        </span>
                        <Link
                          to={`/player/${toUrlFriendly(partner.partnerName)}`}
                          className="font-medium text-sm hover:text-primary transition-colors"
                        >
                          {partner.partnerName}
                        </Link>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-warning text-sm">
                          {partner.againstRate.toFixed(0)}%
                        </div>
                        <div className="text-xs text-base-content/50">
                          ({partner.totalGames})
                        </div>
                      </div>
                    </div>
                    <PercentageBar
                      percentage={partner.againstRate}
                      colorClass="bg-warning"
                      index={index}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-base-content/50 text-center">
          <TooltipPrimitive.Provider>
            <Tooltip content="Shows how often players end up on the same team or opposite teams, independent of win/loss outcomes.">
              <span className="cursor-help flex items-center justify-center gap-1">
                <Shuffle className="w-3 h-3" />
                Based on team assignments (min. {TEAM_PLACEMENT_MIN_GAMES} games)
              </span>
            </Tooltip>
          </TooltipPrimitive.Provider>
        </div>
      </div>
    </motion.div>
  );
};

export default TeamPlacements;
