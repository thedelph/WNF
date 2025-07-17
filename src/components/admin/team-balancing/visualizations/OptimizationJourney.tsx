import React from 'react';
import { motion } from 'framer-motion';
import { ParsedDebugData } from '../../../../utils/teamBalancing/debugLogParser';

interface OptimizationJourneyProps {
  data: ParsedDebugData;
}

export const OptimizationJourney: React.FC<OptimizationJourneyProps> = ({ data }) => {
  if (data.optimizationSwaps.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-base-100 rounded-lg shadow-lg p-6 text-center"
      >
        <h2 className="text-xl font-bold mb-4">Optimization Journey</h2>
        <div className="py-12">
          <div className="text-6xl mb-4">✨</div>
          <p className="text-lg font-medium">Perfect Balance Achieved!</p>
          <p className="text-gray-500 mt-2">No optimization was needed - the snake draft produced well-balanced teams.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-100 rounded-lg shadow-lg p-6"
    >
      <h2 className="text-xl font-bold mb-6">Optimization Journey</h2>

      {/* Timeline of swaps */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-base-300" />

        {data.optimizationSwaps.map((swap, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex items-start mb-8"
          >
            {/* Timeline node */}
            <div className="absolute left-4 w-8 h-8 bg-success rounded-full flex items-center justify-center text-white font-bold text-sm">
              {index + 1}
            </div>

            {/* Swap content */}
            <div className="ml-16 flex-1">
              <div className="bg-base-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="badge badge-sm">Tier {swap.tier}</span>
                    <div className="flex items-center gap-2 text-lg font-medium">
                      <span className="text-blue-600">{swap.bluePlayer}</span>
                      <span>↔</span>
                      <span className="text-orange-600">{swap.orangePlayer}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-success font-bold">+{swap.improvement.toFixed(3)}</div>
                    <div className="text-xs text-gray-500">improvement</div>
                  </div>
                </div>
                {swap.reason && (
                  <p className="text-sm text-gray-600">{swap.reason}</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Total Swaps</div>
          <div className="stat-value">{data.optimizationSwaps.length}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Total Improvement</div>
          <div className="stat-value text-success">
            +{data.optimizationSwaps.reduce((sum, swap) => sum + swap.improvement, 0).toFixed(3)}
          </div>
        </div>
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Final Quality</div>
          <div className="stat-value">{data.executiveSummary.balanceQuality}</div>
        </div>
      </div>
    </motion.div>
  );
};