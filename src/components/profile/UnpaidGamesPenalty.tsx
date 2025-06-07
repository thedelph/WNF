import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';
import clsx from 'clsx';

interface UnpaidGamesPenaltyProps {
  unpaidGames: number;
  penaltyPercentage: number;
}

/**
 * Component to display the XP penalty for unpaid games
 * Shows the number of unpaid games and the total penalty percentage
 * Includes a tooltip explaining the penalty system
 */
const UnpaidGamesPenalty: React.FC<UnpaidGamesPenaltyProps> = ({ 
  unpaidGames, 
  penaltyPercentage 
}) => {
  if (!unpaidGames) return null;

  return (
    <div className="space-y-4 mb-6">
      <h4 className="font-medium text-primary border-b border-base-300 pb-2">
        Unpaid Games Penalty
      </h4>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx(
          "card shadow-sm bg-base-100",
          unpaidGames > 0 && "bg-error/10" // Highlight in red if there are unpaid games
        )}
      >
        <div className="card-body p-3">
          <div className="flex justify-between items-center">
            <div>
              <Tooltip content="You have past games that are unpaid and over 24 hours old. Each unpaid past game results in a 50% XP penalty. Future games do not affect this penalty.">
                <h5 className="font-medium text-base-content flex items-center gap-2">
                  <span>Unpaid Games</span>
                  <span className="text-sm opacity-70">ℹ️</span>
                </h5>
              </Tooltip>
              <p className="text-sm opacity-70 text-base-content/70">
                -{penaltyPercentage}% XP per unpaid game
              </p>
            </div>
            <div className="text-right">
              <div className={clsx(
                "font-mono text-lg font-bold",
                unpaidGames > 0 ? "text-error" : "text-base-content"
              )}>
                -{penaltyPercentage * unpaidGames}% XP
              </div>
              <div className="text-xs opacity-70 text-base-content/70">
                {unpaidGames} game{unpaidGames !== 1 ? 's' : ''} unpaid
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UnpaidGamesPenalty;
