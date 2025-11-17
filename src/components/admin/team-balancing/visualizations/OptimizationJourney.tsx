import React from 'react';
import { motion } from 'framer-motion';
import { ParsedDebugData } from '../../../../utils/teamBalancing/debugLogParser';
import { POSITION_MAP } from '../../../../constants/positions';
import { Position } from '../../../../types/positions';

interface OptimizationJourneyProps {
  data: ParsedDebugData;
}

export const OptimizationJourney: React.FC<OptimizationJourneyProps> = ({ data }) => {
  // Helper to get player position data
  const getPlayerPosition = (playerName: string) => {
    // Search both teams since players may have been swapped
    const allPlayers = [...(data.blueTeam || []), ...(data.orangeTeam || [])];
    const player = allPlayers.find(p => p.friendly_name === playerName);
    const playerWithPos = player as any;

    if (playerWithPos?.primaryPosition) {
      const posConfig = POSITION_MAP[playerWithPos.primaryPosition as Position];
      if (posConfig) {
        return {
          code: posConfig.code,
          emoji: posConfig.emoji,
          category: posConfig.category
        };
      }
    }
    return null;
  };

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
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="badge badge-sm">Tier {swap.tier}</span>
                    <div className="flex items-center gap-2 text-lg font-medium flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-blue-600">{swap.bluePlayer}</span>
                        {(() => {
                          const bluePos = getPlayerPosition(swap.bluePlayer);
                          if (bluePos) {
                            const categoryColors = {
                              goalkeeper: 'badge-warning',
                              defense: 'badge-info',
                              midfield: 'badge-secondary',
                              attack: 'badge-error'
                            };
                            return (
                              <span className={`badge badge-xs ${categoryColors[bluePos.category]}`}>
                                {bluePos.emoji} {bluePos.code}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <span>↔</span>
                      <div className="flex items-center gap-1">
                        <span className="text-orange-600">{swap.orangePlayer}</span>
                        {(() => {
                          const orangePos = getPlayerPosition(swap.orangePlayer);
                          if (orangePos) {
                            const categoryColors = {
                              goalkeeper: 'badge-warning',
                              defense: 'badge-info',
                              midfield: 'badge-secondary',
                              attack: 'badge-error'
                            };
                            return (
                              <span className={`badge badge-xs ${categoryColors[orangePos.category]}`}>
                                {orangePos.emoji} {orangePos.code}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-success font-bold">+{swap.improvement.toFixed(3)}</div>
                    <div className="text-xs text-gray-500">improvement</div>
                  </div>
                </div>
                {swap.reason && (
                  <p className="text-sm text-gray-600 mb-3">{swap.reason}</p>
                )}

                {/* Metric Changes */}
                {swap.metricChanges && Object.keys(swap.metricChanges).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-base-300">
                    {/* Plain text summary */}
                    <div className="mb-3 p-2 bg-base-300 rounded text-sm">
                      {/* Reason for swap */}
                      <div className="mb-2">
                        <p className="font-semibold text-xs uppercase text-gray-600 mb-1">📊 Reason</p>
                        <p className="text-xs">
                          {(() => {
                            const reasons: string[] = [];

                            // Identify the biggest imbalances before the swap
                            if (swap.metricChanges?.attack && swap.metricChanges.attack.before > 0.15) {
                              reasons.push(`Attack was imbalanced (${swap.metricChanges.attack.before.toFixed(2)} difference)`);
                            }
                            if (swap.metricChanges?.defense && swap.metricChanges.defense.before > 0.15) {
                              reasons.push(`Defense was imbalanced (${swap.metricChanges.defense.before.toFixed(2)} difference)`);
                            }
                            if (swap.metricChanges?.gameIq && swap.metricChanges.gameIq.before > 0.15) {
                              reasons.push(`Game IQ was imbalanced (${swap.metricChanges.gameIq.before.toFixed(2)} difference)`);
                            }

                            // Check for attribute imbalances
                            const attrImbalances: string[] = [];
                            ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'].forEach(attr => {
                              const metric = swap.metricChanges?.[attr as keyof typeof swap.metricChanges] as any;
                              if (metric && metric.before > 0.5) {
                                attrImbalances.push(attr.charAt(0).toUpperCase() + attr.slice(1));
                              }
                            });
                            if (attrImbalances.length > 0) {
                              reasons.push(`${attrImbalances.join(', ')} attributes were uneven`);
                            }

                            return reasons.length > 0 ? reasons.join('. ') : 'Teams needed better overall balance';
                          })()}
                        </p>
                      </div>

                      {/* Impact of swap */}
                      <div>
                        <p className="font-semibold text-xs uppercase text-gray-600 mb-1">✅ Impact</p>
                        <p className="text-xs">
                          {(() => {
                            const improvements: string[] = [];
                            const tradeoffs: string[] = [];

                          // Check core skills
                          if (swap.metricChanges.attack) {
                            const diff = Math.abs(swap.metricChanges.attack.after - swap.metricChanges.attack.before);
                            if (swap.metricChanges.attack.after < swap.metricChanges.attack.before) {
                              improvements.push(`Attack balance improved by ${diff.toFixed(2)}`);
                            } else {
                              tradeoffs.push(`Attack difference increased by ${diff.toFixed(2)}`);
                            }
                          }

                          if (swap.metricChanges.defense) {
                            const diff = Math.abs(swap.metricChanges.defense.after - swap.metricChanges.defense.before);
                            if (swap.metricChanges.defense.after < swap.metricChanges.defense.before) {
                              improvements.push(`Defense balance improved by ${diff.toFixed(2)}`);
                            } else {
                              tradeoffs.push(`Defense difference increased by ${diff.toFixed(2)}`);
                            }
                          }

                          if (swap.metricChanges.gameIq) {
                            const diff = Math.abs(swap.metricChanges.gameIq.after - swap.metricChanges.gameIq.before);
                            if (swap.metricChanges.gameIq.after < swap.metricChanges.gameIq.before) {
                              improvements.push(`Game IQ balance improved by ${diff.toFixed(2)}`);
                            } else {
                              tradeoffs.push(`Game IQ difference increased by ${diff.toFixed(2)}`);
                            }
                          }

                          // Check significant attribute changes
                          const attributeChanges: string[] = [];
                          const checkAttribute = (name: string, key: keyof typeof swap.metricChanges) => {
                            const attr = swap.metricChanges[key] as any;
                            if (attr) {
                              const diff = Math.abs(attr.after - attr.before);
                              if (diff > 0.05) { // Only show significant changes
                                if (attr.after < attr.before) {
                                  attributeChanges.push(`${name} (${diff.toFixed(2)} better)`);
                                }
                              }
                            }
                          };

                          checkAttribute('Pace', 'pace');
                          checkAttribute('Shooting', 'shooting');
                          checkAttribute('Passing', 'passing');
                          checkAttribute('Dribbling', 'dribbling');
                          checkAttribute('Defending', 'defending');
                          checkAttribute('Physical', 'physical');

                          // Build summary
                          let summary = '';
                          if (improvements.length > 0) {
                            summary += improvements.join(', ') + '. ';
                          }
                          if (tradeoffs.length > 0) {
                            summary += 'Trade-off: ' + tradeoffs.join(', ') + '. ';
                          }
                          if (attributeChanges.length > 0) {
                            summary += 'Attributes improved: ' + attributeChanges.join(', ') + '.';
                          }

                          // Check win rate gap
                          if (swap.metricChanges.winRateGap) {
                            const gapDiff = swap.metricChanges.winRateGap.after - swap.metricChanges.winRateGap.before;
                            if (Math.abs(gapDiff) > 1) {
                              if (gapDiff < 0) {
                                summary += ` Win rate gap reduced by ${Math.abs(gapDiff).toFixed(1)}%.`;
                              } else {
                                summary += ` Win rate gap increased by ${gapDiff.toFixed(1)}%.`;
                              }
                            }
                          }

                            return summary || 'Overall balance improvement across multiple metrics.';
                          })()}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-gray-500 mb-2">DETAILED METRICS</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {/* Core Skills */}
                      {swap.metricChanges.attack && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Attack:</span>
                          <span className="text-gray-500">{swap.metricChanges.attack.before.toFixed(2)}</span>
                          <span>→</span>
                          <span className={swap.metricChanges.attack.after < swap.metricChanges.attack.before ? 'text-success' : 'text-warning'}>
                            {swap.metricChanges.attack.after.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {swap.metricChanges.defense && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Defense:</span>
                          <span className="text-gray-500">{swap.metricChanges.defense.before.toFixed(2)}</span>
                          <span>→</span>
                          <span className={swap.metricChanges.defense.after < swap.metricChanges.defense.before ? 'text-success' : 'text-warning'}>
                            {swap.metricChanges.defense.after.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {swap.metricChanges.gameIq && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Game IQ:</span>
                          <span className="text-gray-500">{swap.metricChanges.gameIq.before.toFixed(2)}</span>
                          <span>→</span>
                          <span className={swap.metricChanges.gameIq.after < swap.metricChanges.gameIq.before ? 'text-success' : 'text-warning'}>
                            {swap.metricChanges.gameIq.after.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Attributes */}
                      {swap.metricChanges.pace && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Pace:</span>
                          <span className="text-gray-500">{swap.metricChanges.pace.before.toFixed(2)}</span>
                          <span>→</span>
                          <span className={swap.metricChanges.pace.after < swap.metricChanges.pace.before ? 'text-success' : 'text-warning'}>
                            {swap.metricChanges.pace.after.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {swap.metricChanges.shooting && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Shooting:</span>
                          <span className="text-gray-500">{swap.metricChanges.shooting.before.toFixed(2)}</span>
                          <span>→</span>
                          <span className={swap.metricChanges.shooting.after < swap.metricChanges.shooting.before ? 'text-success' : 'text-warning'}>
                            {swap.metricChanges.shooting.after.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {swap.metricChanges.passing && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Passing:</span>
                          <span className="text-gray-500">{swap.metricChanges.passing.before.toFixed(2)}</span>
                          <span>→</span>
                          <span className={swap.metricChanges.passing.after < swap.metricChanges.passing.before ? 'text-success' : 'text-warning'}>
                            {swap.metricChanges.passing.after.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {swap.metricChanges.dribbling && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Dribbling:</span>
                          <span className="text-gray-500">{swap.metricChanges.dribbling.before.toFixed(2)}</span>
                          <span>→</span>
                          <span className={swap.metricChanges.dribbling.after < swap.metricChanges.dribbling.before ? 'text-success' : 'text-warning'}>
                            {swap.metricChanges.dribbling.after.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {swap.metricChanges.defending && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Defending:</span>
                          <span className="text-gray-500">{swap.metricChanges.defending.before.toFixed(2)}</span>
                          <span>→</span>
                          <span className={swap.metricChanges.defending.after < swap.metricChanges.defending.before ? 'text-success' : 'text-warning'}>
                            {swap.metricChanges.defending.after.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {swap.metricChanges.physical && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Physical:</span>
                          <span className="text-gray-500">{swap.metricChanges.physical.before.toFixed(2)}</span>
                          <span>→</span>
                          <span className={swap.metricChanges.physical.after < swap.metricChanges.physical.before ? 'text-success' : 'text-warning'}>
                            {swap.metricChanges.physical.after.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Win Rate Gap */}
                      {swap.metricChanges.winRateGap && (
                        <div className="flex items-center gap-1 col-span-2">
                          <span className="font-medium">Win Rate Gap:</span>
                          <span className="text-gray-500">{swap.metricChanges.winRateGap.before.toFixed(1)}%</span>
                          <span>→</span>
                          <span className={swap.metricChanges.winRateGap.after < swap.metricChanges.winRateGap.before ? 'text-success' : 'text-warning'}>
                            {swap.metricChanges.winRateGap.after.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
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