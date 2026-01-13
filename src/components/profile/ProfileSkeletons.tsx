import React from 'react';
import { motion } from 'framer-motion';
import { Users, Swords, GitCompare } from 'lucide-react';

/**
 * Skeleton placeholder for PairChemistryCard - used in LockedContent
 */
export const PairChemistryCardSkeleton: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="card-title text-lg">Your Chemistry</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Record skeleton */}
          <div className="text-center">
            <div className="text-sm text-base-content/70 mb-1">Record</div>
            <div className="flex justify-center gap-1">
              <div className="skeleton h-6 w-8"></div>
              <div className="skeleton h-6 w-8"></div>
              <div className="skeleton h-6 w-8"></div>
            </div>
            <div className="skeleton h-3 w-16 mx-auto mt-1"></div>
          </div>

          {/* Performance skeleton */}
          <div className="text-center">
            <div className="text-sm text-base-content/70 mb-1">Performance</div>
            <div className="skeleton h-6 w-12 mx-auto"></div>
            <div className="skeleton h-3 w-20 mx-auto mt-1"></div>
          </div>
        </div>

        {/* Message skeleton */}
        <div className="mt-4 text-center">
          <div className="skeleton h-4 w-48 mx-auto"></div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Skeleton placeholder for RivalryCard - used in LockedContent
 */
export const RivalryCardSkeleton: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="w-5 h-5 text-error" />
          <h3 className="card-title text-lg">Your Rivalry</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Head-to-head skeleton */}
          <div className="text-center">
            <div className="text-sm text-base-content/70 mb-1">Head-to-Head</div>
            <div className="flex justify-center gap-1">
              <div className="skeleton h-6 w-8"></div>
              <div className="skeleton h-6 w-8"></div>
              <div className="skeleton h-6 w-8"></div>
            </div>
            <div className="skeleton h-3 w-16 mx-auto mt-1"></div>
          </div>

          {/* Win rate skeleton */}
          <div className="text-center">
            <div className="text-sm text-base-content/70 mb-1">Win Rate</div>
            <div className="skeleton h-6 w-12 mx-auto"></div>
            <div className="skeleton h-3 w-16 mx-auto mt-1"></div>
          </div>
        </div>

        {/* Message skeleton */}
        <div className="mt-4 text-center">
          <div className="skeleton h-4 w-44 mx-auto"></div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Skeleton placeholder for PairTeamPlacementCard - used in LockedContent
 */
export const TeamHistorySkeleton: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <GitCompare className="w-5 h-5 text-secondary" />
          <h3 className="card-title text-lg">Your Team History</h3>
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Teammates */}
          <div className="text-center p-3 bg-success/10 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-4 h-4 text-success" />
              <span className="text-sm text-success font-medium">Teammates</span>
            </div>
            <div className="skeleton h-8 w-10 mx-auto"></div>
            <div className="skeleton h-4 w-8 mx-auto mt-1"></div>
          </div>

          {/* Opponents */}
          <div className="text-center p-3 bg-warning/10 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Swords className="w-4 h-4 text-warning" />
              <span className="text-sm text-warning font-medium">Opponents</span>
            </div>
            <div className="skeleton h-8 w-10 mx-auto"></div>
            <div className="skeleton h-4 w-8 mx-auto mt-1"></div>
          </div>
        </div>

        {/* Progress bar skeleton */}
        <div className="skeleton h-3 w-full rounded-full mb-4"></div>

        {/* Message skeleton */}
        <div className="text-center">
          <div className="skeleton h-4 w-48 mx-auto"></div>
          <div className="skeleton h-3 w-32 mx-auto mt-2"></div>
        </div>
      </div>
    </motion.div>
  );
};
