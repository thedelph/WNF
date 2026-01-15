/**
 * ScoreHero - Sky Sports style large score display
 * Shows final score with team colors and winner indication
 */

import React from 'react';
import { motion } from 'framer-motion';

interface ScoreHeroProps {
  scoreBlue: number | null;
  scoreOrange: number | null;
  outcome: 'blue_win' | 'orange_win' | 'draw' | null;
}

export const ScoreHero: React.FC<ScoreHeroProps> = ({
  scoreBlue,
  scoreOrange,
  outcome,
}) => {
  const hasScore = scoreBlue !== null && scoreOrange !== null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-base-200 to-base-300 rounded-2xl p-6 md:p-8"
    >
      {hasScore ? (
        <div className="flex items-center justify-center gap-4 md:gap-8">
          {/* Blue Team */}
          <div className="flex-1 text-center">
            <div className="text-sm md:text-base font-semibold text-blue-500 mb-2">
              Blue
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-5xl md:text-7xl lg:text-8xl font-bold ${
                outcome === 'blue_win'
                  ? 'text-blue-500'
                  : 'text-base-content/70'
              }`}
            >
              {scoreBlue}
            </motion.div>
            {outcome === 'blue_win' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-2"
              >
                <span className="badge badge-sm bg-blue-500/20 text-blue-500 border-blue-500/30">
                  Winner
                </span>
              </motion.div>
            )}
          </div>

          {/* Divider */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl md:text-4xl font-light text-base-content/30">
              -
            </div>
            <div className="text-xs text-base-content/50 uppercase tracking-wider">
              Full Time
            </div>
          </div>

          {/* Orange Team */}
          <div className="flex-1 text-center">
            <div className="text-sm md:text-base font-semibold text-orange-500 mb-2">
              Orange
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`text-5xl md:text-7xl lg:text-8xl font-bold ${
                outcome === 'orange_win'
                  ? 'text-orange-500'
                  : 'text-base-content/70'
              }`}
            >
              {scoreOrange}
            </motion.div>
            {outcome === 'orange_win' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-2"
              >
                <span className="badge badge-sm bg-orange-500/20 text-orange-500 border-orange-500/30">
                  Winner
                </span>
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-base-content/50">
          <div className="text-lg">Score not recorded</div>
        </div>
      )}

      {/* Draw indicator */}
      {outcome === 'draw' && hasScore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-4"
        >
          <span className="badge badge-neutral">Draw</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ScoreHero;
