/**
 * ScoreHero - Sky Sports style large score display
 * Shows final score with team colors and winner indication
 * Displays goalscorers with minutes below each team's score
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface GoalInfo {
  scorerName: string | null;
  scorerTeam: 'blue' | 'orange' | null;
  timestampSeconds: number;
  isOwnGoal: boolean;
}

interface ScoreHeroProps {
  scoreBlue: number | null;
  scoreOrange: number | null;
  outcome: 'blue_win' | 'orange_win' | 'draw' | null;
  goals?: GoalInfo[];
}

export const ScoreHero: React.FC<ScoreHeroProps> = ({
  scoreBlue,
  scoreOrange,
  outcome,
  goals = [],
}) => {
  const hasScore = scoreBlue !== null && scoreOrange !== null;

  const blueGoals = useMemo(() =>
    goals
      .filter(g => g.scorerTeam === 'blue')
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds),
    [goals]
  );

  const orangeGoals = useMemo(() =>
    goals
      .filter(g => g.scorerTeam === 'orange')
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds),
    [goals]
  );

  const blueTbcCount = Math.max(0, (scoreBlue ?? 0) - blueGoals.length);
  const orangeTbcCount = Math.max(0, (scoreOrange ?? 0) - orangeGoals.length);

  const formatMinute = (seconds: number) => `${Math.floor(seconds / 60)}'`;

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
            {(scoreBlue ?? 0) > 0 && (
              <div className="mt-2 space-y-0.5">
                {blueGoals.map((g, i) => (
                  <div key={i} className={`text-xs ${g.isOwnGoal ? 'text-red-400' : 'text-base-content/50'}`}>
                    {g.scorerName ?? 'TBC'} {g.isOwnGoal && <span className="text-red-400">(OG)</span>} {formatMinute(g.timestampSeconds)}
                  </div>
                ))}
                {Array.from({ length: blueTbcCount }).map((_, i) => (
                  <div key={`tbc-${i}`} className="text-xs text-base-content/30 italic">
                    TBC
                  </div>
                ))}
              </div>
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
            {(scoreOrange ?? 0) > 0 && (
              <div className="mt-2 space-y-0.5">
                {orangeGoals.map((g, i) => (
                  <div key={i} className={`text-xs ${g.isOwnGoal ? 'text-red-400' : 'text-base-content/50'}`}>
                    {g.scorerName ?? 'TBC'} {g.isOwnGoal && <span className="text-red-400">(OG)</span>} {formatMinute(g.timestampSeconds)}
                  </div>
                ))}
                {Array.from({ length: orangeTbcCount }).map((_, i) => (
                  <div key={`tbc-${i}`} className="text-xs text-base-content/30 italic">
                    TBC
                  </div>
                ))}
              </div>
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
