import React from 'react';
import { motion } from 'framer-motion';
import { ParsedDebugData } from '../../../../utils/teamBalancing/debugLogParser';

interface AnalyticsInsightsProps {
  data: ParsedDebugData;
}

export const AnalyticsInsights: React.FC<AnalyticsInsightsProps> = ({ data }) => {
  // Calculate playstyle distribution
  const getPlaystyleDistribution = () => {
    const distribution: Record<string, number> = {};

    // Count playstyles from player transformations or team data
    if (data.blueTeam && data.orangeTeam) {
      const allPlayers = [...data.blueTeam, ...data.orangeTeam];

      // Simplified playstyle categories based on attributes
      allPlayers.forEach(player => {
        if (player.derived_attributes) {
          const attrs = player.derived_attributes;
          let playstyle = 'Balanced';

          // Determine primary playstyle based on highest attributes
          const max = Math.max(attrs.pace, attrs.shooting, attrs.passing, attrs.dribbling, attrs.defending, attrs.physical);

          if (max === attrs.pace) playstyle = 'Pace-focused';
          else if (max === attrs.shooting) playstyle = 'Shooting-focused';
          else if (max === attrs.passing) playstyle = 'Passing-focused';
          else if (max === attrs.dribbling) playstyle = 'Dribbling-focused';
          else if (max === attrs.defending) playstyle = 'Defending-focused';
          else if (max === attrs.physical) playstyle = 'Physical-focused';

          distribution[playstyle] = (distribution[playstyle] || 0) + 1;
        }
      });
    }

    return distribution;
  };

  const playstyleDistribution = getPlaystyleDistribution();

  // Count performance categories
  const performanceStats = {
    hotStreaks: data.playerTransformations.filter(p => p.momentum === 'hot').length,
    coldStreaks: data.playerTransformations.filter(p => p.momentum === 'cold').length,
    steadyPlayers: data.playerTransformations.filter(p => p.momentum === 'steady').length,
    majorBoosts: data.playerTransformations.filter(p => p.change > 0.5).length,
    majorDrops: data.playerTransformations.filter(p => p.change < -0.5).length,
  };

  // Calculate additional insights
  const avgRatingChange = data.playerTransformations.length > 0
    ? data.playerTransformations.reduce((sum, p) => sum + p.change, 0) / data.playerTransformations.length
    : 0;

  const biggestGainer = data.playerTransformations.reduce((max, p) =>
    p.change > max.change ? p : max,
    { name: 'None', change: 0 } as any
  );

  const biggestLoser = data.playerTransformations.reduce((min, p) =>
    p.change < min.change ? p : min,
    { name: 'None', change: 0 } as any
  );

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
              <span className="font-medium">65/15/20</span>
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
              <span className="font-medium">{performanceStats.hotStreaks} players 🔥</span>
            </div>
            <div className="flex justify-between">
              <span>Cold Streaks:</span>
              <span className="font-medium">{performanceStats.coldStreaks} players ❄️</span>
            </div>
            <div className="flex justify-between">
              <span>Steady Form:</span>
              <span className="font-medium">{performanceStats.steadyPlayers} players ●</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Rating Change:</span>
              <span className={`font-medium ${avgRatingChange > 0 ? 'text-success' : avgRatingChange < 0 ? 'text-error' : ''}`}>
                {avgRatingChange > 0 ? '+' : ''}{avgRatingChange.toFixed(2)}
              </span>
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

        {/* Playstyle Distribution */}
        {Object.keys(playstyleDistribution).length > 0 && (
          <div className="bg-secondary bg-opacity-10 rounded-lg p-4">
            <h3 className="font-bold text-secondary mb-3">Playstyle Mix</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(playstyleDistribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([style, count], idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{style}:</span>
                    <span className="font-medium">{count} players</span>
                  </div>
                ))}
              {Object.keys(playstyleDistribution).length > 4 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                  +{Object.keys(playstyleDistribution).length - 4} more styles
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notable Transformations */}
        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-bold mb-3">Rating Impact</h3>
          <div className="space-y-2 text-sm">
            {biggestGainer.change > 0 && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Biggest Gain</div>
                <div className="flex justify-between items-center">
                  <span>{biggestGainer.name}</span>
                  <span className="text-success font-medium">+{biggestGainer.change.toFixed(2)}</span>
                </div>
              </div>
            )}
            {biggestLoser.change < 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">Biggest Drop</div>
                <div className="flex justify-between items-center">
                  <span>{biggestLoser.name}</span>
                  <span className="text-error font-medium">{biggestLoser.change.toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="mt-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Performance Impact</div>
              <div className="flex justify-between items-center">
                <span>Major Changes:</span>
                <span className="font-medium">{performanceStats.majorBoosts + performanceStats.majorDrops}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Balance */}
        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-bold mb-3">Balance Summary</h3>
          <div className="space-y-2 text-sm">
            <p className="font-medium mb-2">{data.executiveSummary.advantage}</p>
            {data.balanceBreakdown.metrics.slice(0, 5).map((metric, idx) => (
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

        {/* Algorithm Performance */}
        <div className="bg-accent bg-opacity-10 rounded-lg p-4">
          <h3 className="font-bold text-accent mb-3">Algorithm Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tiers Created:</span>
              <span className="font-medium">{data.executiveSummary.tierSizes}</span>
            </div>
            <div className="flex justify-between">
              <span>Optimization Rounds:</span>
              <span className="font-medium">{Math.max(1, Math.ceil(data.executiveSummary.optimizationSwaps / 2))}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance Method:</span>
              <span className="font-medium">3-Layer Rating</span>
            </div>
            <div className="flex justify-between">
              <span>Final Quality:</span>
              <span className={`font-medium ${
                data.executiveSummary.balanceQuality === 'Excellent' ? 'text-success' :
                data.executiveSummary.balanceQuality === 'Good' ? 'text-info' :
                data.executiveSummary.balanceQuality === 'Fair' ? 'text-warning' :
                'text-error'
              }`}>
                {data.executiveSummary.balanceQuality}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-base-200 rounded-lg">
          <h3 className="font-bold mb-2">🎯 Key Strengths</h3>
          <ul className="text-sm space-y-1">
            {data.executiveSummary.finalBalance < 0.3 && (
              <li>• Excellent balance achieved ({data.executiveSummary.finalBalance.toFixed(3)})</li>
            )}
            {data.executiveSummary.optimizationSwaps === 0 && (
              <li>• Perfect draft - no optimization needed</li>
            )}
            {performanceStats.hotStreaks > 3 && (
              <li>• {performanceStats.hotStreaks} players on hot streaks</li>
            )}
            {data.balanceBreakdown.metrics.filter(m => m.difference < 0.5).length >= 3 && (
              <li>• Well-balanced across {data.balanceBreakdown.metrics.filter(m => m.difference < 0.5).length} metrics</li>
            )}
          </ul>
        </div>

        <div className="p-4 bg-base-200 rounded-lg">
          <h3 className="font-bold mb-2">⚡ Areas of Note</h3>
          <ul className="text-sm space-y-1">
            {performanceStats.coldStreaks > 3 && (
              <li>• {performanceStats.coldStreaks} players on cold streaks may impact balance</li>
            )}
            {data.balanceBreakdown.metrics.filter(m => m.difference > 1.0).length > 0 && (
              <li>• {data.balanceBreakdown.metrics.filter(m => m.difference > 1.0).length} metric(s) showing notable difference</li>
            )}
            {data.executiveSummary.newPlayers > 4 && (
              <li>• {data.executiveSummary.newPlayers} new players add uncertainty</li>
            )}
            {avgRatingChange < -0.2 && (
              <li>• Overall ratings trending down (avg {avgRatingChange.toFixed(2)})</li>
            )}
          </ul>
        </div>
      </div>

      {/* Summary Statement */}
      <div className="mt-6 p-4 bg-base-200 rounded-lg text-center">
        <p className="text-lg">
          The tier-based snake draft algorithm
          {data.executiveSummary.optimizationSwaps === 0 ? ' perfectly balanced teams on the first try' : ' successfully optimized team balance'}
          {' '}achieving
          <span className="font-bold text-primary"> {data.executiveSummary.balanceQuality.toLowerCase()} </span>
          results with a score of
          <span className="font-bold text-primary"> {data.executiveSummary.finalBalance.toFixed(3)}</span>.
          {' '}The three-layer rating system (65% skills, 15% attributes, 20% performance)
          {performanceStats.majorBoosts + performanceStats.majorDrops > 0 && (
            <span>
              {' '}adjusted {performanceStats.majorBoosts + performanceStats.majorDrops} player ratings based on recent form,
            </span>
          )}
          {' '}ensuring fair and competitive teams.
        </p>
      </div>
    </motion.div>
  );
};