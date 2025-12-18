import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, Trophy, TrendingUp } from 'lucide-react';
import { ChemistryStats, ChemistryPartner, CHEMISTRY_MIN_GAMES } from '../../types/chemistry';
import { toUrlFriendly } from '../../utils/urlHelpers';
import { Tooltip } from '../ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface PairChemistryCardProps {
  /** Chemistry stats between two players */
  chemistry: ChemistryStats | null;
  /** Name of the other player */
  playerName: string;
  /** Games until chemistry threshold is met */
  gamesUntilChemistry: number;
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * Card showing chemistry between the current user and viewed player
 */
export const PairChemistryCard: React.FC<PairChemistryCardProps> = ({
  chemistry,
  playerName,
  gamesUntilChemistry,
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
            <Users className="w-5 h-5 text-primary" />
            <h3 className="card-title text-lg">Your Chemistry with {playerName}</h3>
          </div>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Not enough games together
  if (!chemistry || chemistry.gamesTogether < CHEMISTRY_MIN_GAMES) {
    const gamesPlayed = chemistry?.gamesTogether ?? 0;
    const gamesNeeded = gamesUntilChemistry > 0 ? gamesUntilChemistry : CHEMISTRY_MIN_GAMES - gamesPlayed;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="card-title text-lg">Your Chemistry with {playerName}</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-base-content/70 mb-2">
              {gamesPlayed > 0 ? (
                <>Played <strong>{gamesPlayed}</strong> game{gamesPlayed !== 1 ? 's' : ''} together on the same team</>
              ) : (
                <>You haven&apos;t played together on the same team yet</>
              )}
            </p>
            <p className="text-sm text-base-content/50">
              Play <strong>{gamesNeeded}</strong> more game{gamesNeeded !== 1 ? 's' : ''} together to unlock chemistry stats
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show chemistry stats
  const { winsTogether, drawsTogether, lossesTogether, gamesTogether, performanceRate, chemistryScore } = chemistry;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="card-title text-lg">Your Chemistry with {playerName}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Record */}
          <div className="text-center">
            <div className="text-sm text-base-content/70 mb-1">Record</div>
            <div className="font-bold text-lg">
              <span className="text-success">{winsTogether}W</span>
              {' '}
              <span className="text-warning">{drawsTogether}D</span>
              {' '}
              <span className="text-error">{lossesTogether}L</span>
            </div>
            <div className="text-xs text-base-content/50">({gamesTogether} games)</div>
          </div>

          {/* Performance Rate */}
          <TooltipPrimitive.Provider>
            <Tooltip content={`Performance rate: Points earned as % of maximum possible (W=3pts, D=1pt, L=0pts)`}>
              <div className="text-center cursor-help">
                <div className="text-sm text-base-content/70 mb-1">Performance</div>
                <div className="font-bold text-lg text-primary">{performanceRate.toFixed(1)}%</div>
                <div className="text-xs text-base-content/50">Chemistry: {chemistryScore.toFixed(1)}</div>
              </div>
            </Tooltip>
          </TooltipPrimitive.Provider>
        </div>

        {/* Performance message */}
        <div className="mt-4 text-center text-sm">
          {performanceRate >= 66.7 ? (
            <span className="text-success">You perform exceptionally well together!</span>
          ) : performanceRate >= 50 ? (
            <span className="text-info">You perform well together!</span>
          ) : (
            <span className="text-base-content/70">Keep playing to improve your chemistry!</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface TopChemistryPartnersProps {
  /** Top chemistry partners */
  partners: ChemistryPartner[];
  /** Whether data is loading */
  loading?: boolean;
  /** Title for the section */
  title?: string;
}

/**
 * Card showing top chemistry partners for a player
 */
export const TopChemistryPartners: React.FC<TopChemistryPartnersProps> = ({
  partners,
  loading = false,
  title = 'Top Chemistry Partners',
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
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="card-title text-lg">{title}</h3>
          </div>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (partners.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="card-title text-lg">{title}</h3>
          </div>
          <p className="text-center text-base-content/70 py-4">
            No chemistry partners yet. Play at least {CHEMISTRY_MIN_GAMES} games with someone to see chemistry stats.
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
          <Trophy className="w-5 h-5 text-warning" />
          <h3 className="card-title text-lg">{title}</h3>
        </div>

        {/* Column headers */}
        <div className="flex items-center justify-between p-3 text-xs text-base-content/60 border-b border-base-300 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-8"></div>
            <span>Player</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:block">Record</span>
            <span className="font-bold">Perf | Score</span>
          </div>
        </div>

        <div className="space-y-3">
          {partners.map((partner, index) => (
            <motion.div
              key={partner.partnerId}
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

                {/* Partner name */}
                <Link
                  to={`/player/${toUrlFriendly(partner.partnerName)}`}
                  className="font-medium hover:text-primary transition-colors"
                >
                  {partner.partnerName}
                </Link>
              </div>

              <div className="flex items-center gap-4 text-sm">
                {/* W/D/L Record with games count */}
                <div className="hidden sm:block">
                  <span className="text-success">{partner.winsTogether}W</span>
                  {' '}
                  <span className="text-warning">{partner.drawsTogether}D</span>
                  {' '}
                  <span className="text-error">{partner.lossesTogether}L</span>
                  {' '}
                  <span className="text-base-content/50">({partner.gamesTogether})</span>
                </div>

                {/* Performance rate and chemistry score */}
                <div className="font-bold text-primary">
                  {partner.performanceRate.toFixed(1)}% | {partner.chemistryScore.toFixed(1)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 text-xs text-base-content/50 text-center">
          <TooltipPrimitive.Provider>
            <Tooltip content="Chemistry score factors in both win rate and sample size. Larger samples carry more weight.">
              <span className="cursor-help flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Ranked by chemistry score (min. {CHEMISTRY_MIN_GAMES} games)
              </span>
            </Tooltip>
          </TooltipPrimitive.Provider>
        </div>
      </div>
    </motion.div>
  );
};

export default TopChemistryPartners;
