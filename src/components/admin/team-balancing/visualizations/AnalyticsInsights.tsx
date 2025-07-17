import React from 'react';
import { motion } from 'framer-motion';
import { ParsedDebugData } from '../../../../utils/teamBalancing/debugLogParser';

interface AnalyticsInsightsProps {
  data: ParsedDebugData;
}

export const AnalyticsInsights: React.FC<AnalyticsInsightsProps> = ({ data }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-100 rounded-lg shadow-lg p-6"
    >
      <h2 className="text-xl font-bold mb-6">Analytics & Insights</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Key Metrics */}
        <div className="bg-primary bg-opacity-10 rounded-lg p-4">
          <h3 className="font-bold text-primary mb-3">Key Metrics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Algorithm Type:</span>
              <span className="font-medium">Tier-Based Snake Draft</span>
            </div>
            <div className="flex justify-between">
              <span>Weight Distribution:</span>
              <span className="font-medium">70/20/10</span>
            </div>
            <div className="flex justify-between">
              <span>Final Balance Score:</span>
              <span className="font-medium">{data.executiveSummary.finalBalance.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Quality Rating:</span>
              <span className="font-medium">{data.executiveSummary.balanceQuality}</span>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-success bg-opacity-10 rounded-lg p-4">
          <h3 className="font-bold text-success mb-3">Performance Insights</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Hot Streaks:</span>
              <span className="font-medium">{data.keyInsights.hotStreaks.length} players 🔥</span>
            </div>
            <div className="flex justify-between">
              <span>Cold Streaks:</span>
              <span className="font-medium">{data.keyInsights.coldStreaks.length} players ❄️</span>
            </div>
            <div className="flex justify-between">
              <span>Major Boosts:</span>
              <span className="font-medium">{data.keyInsights.majorBoosts.length} players</span>
            </div>
            <div className="flex justify-between">
              <span>Major Drops:</span>
              <span className="font-medium">{data.keyInsights.majorDrops.length} players</span>
            </div>
          </div>
        </div>

        {/* Draft Efficiency */}
        <div className="bg-info bg-opacity-10 rounded-lg p-4">
          <h3 className="font-bold text-info mb-3">Draft Efficiency</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Value Picks:</span>
              <span className="font-medium">{data.draftAnalysis.bestValuePicks.length} steals</span>
            </div>
            <div className="flex justify-between">
              <span>Potential Reaches:</span>
              <span className="font-medium">{data.draftAnalysis.potentialReaches.length} players</span>
            </div>
            <div className="flex justify-between">
              <span>Optimization Swaps:</span>
              <span className="font-medium">{data.executiveSummary.optimizationSwaps} swaps</span>
            </div>
            <div className="flex justify-between">
              <span>Balance Achieved:</span>
              <span className="font-medium">
                {data.executiveSummary.optimizationSwaps === 0 ? 'First Try ✨' : 'After Optimization'}
              </span>
            </div>
          </div>
        </div>

        {/* Team Composition */}
        <div className="bg-warning bg-opacity-10 rounded-lg p-4">
          <h3 className="font-bold text-warning mb-3">Team Composition</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Players:</span>
              <span className="font-medium">{data.executiveSummary.totalPlayers}</span>
            </div>
            <div className="flex justify-between">
              <span>Rated Players:</span>
              <span className="font-medium">{data.executiveSummary.ratedPlayers} ({Math.round((data.executiveSummary.ratedPlayers / data.executiveSummary.totalPlayers) * 100)}%)</span>
            </div>
            <div className="flex justify-between">
              <span>New Players:</span>
              <span className="font-medium">{data.executiveSummary.newPlayers} ({Math.round((data.executiveSummary.newPlayers / data.executiveSummary.totalPlayers) * 100)}%)</span>
            </div>
            <div className="flex justify-between">
              <span>Tier Count:</span>
              <span className="font-medium">{data.executiveSummary.tierCount} tiers</span>
            </div>
          </div>
        </div>

        {/* Notable Players */}
        {data.keyInsights.majorBoosts.length > 0 && (
          <div className="bg-base-200 rounded-lg p-4">
            <h3 className="font-bold mb-3">Biggest Rating Gains</h3>
            <div className="space-y-2">
              {data.keyInsights.majorBoosts.slice(0, 3).map((boost, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm">{boost.player}</span>
                  <span className="text-success font-medium">+{boost.boost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Balance */}
        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-bold mb-3">Balance Summary</h3>
          <div className="space-y-2 text-sm">
            <p className="font-medium">{data.executiveSummary.advantage}</p>
            {data.balanceBreakdown.metrics.map((metric, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{metric.name}:</span>
                <span className={`font-medium ${
                  metric.difference < 0.5 ? 'text-success' : 
                  metric.difference < 1.0 ? 'text-warning' : 
                  'text-error'
                }`}>
                  {metric.difference.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Statement */}
      <div className="mt-6 p-4 bg-base-200 rounded-lg text-center">
        <p className="text-lg">
          The tier-based snake draft algorithm successfully created 
          <span className="font-bold text-primary"> {data.executiveSummary.balanceQuality.toLowerCase()} </span>
          team balance with a final score of
          <span className="font-bold text-primary"> {data.executiveSummary.finalBalance.toFixed(3)}</span>.
          {data.executiveSummary.optimizationSwaps > 0 && (
            <span>
              {' '}After <span className="font-bold">{data.executiveSummary.optimizationSwaps}</span> optimization
              {data.executiveSummary.optimizationSwaps === 1 ? ' swap' : ' swaps'}, 
            </span>
          )}
          {' '}the teams are well-matched across all key metrics.
        </p>
      </div>
    </motion.div>
  );
};