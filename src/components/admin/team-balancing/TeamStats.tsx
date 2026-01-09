import React from 'react';
import { StarRating } from './StarRating';
import { TeamAssignment } from './types';
import { POSITION_MAP, POSITION_THRESHOLDS } from '../../../constants/positions';
import { Position } from '../../../types/positions';

export interface TeamStatsProps {
  blueTeam?: TeamAssignment[];
  orangeTeam?: TeamAssignment[];
  stats: {
    blue: {
      attack: number;
      defense: number;
      gameIq: number;
      gk: number;
      winRate: number;
      goalDifferential: number;
      playerCount: number;
    };
    orange: {
      attack: number;
      defense: number;
      gameIq: number;
      gk: number;
      winRate: number;
      goalDifferential: number;
      playerCount: number;
    };
    attackDiff: number;
    defenseDiff: number;
    gameIqDiff: number;
    gkDiff: number;
    winRateDiff: number;
    goalDifferentialDiff: number;
    currentScore: number;
    // Normalized values for visualization
    normalizedAttackDiff?: number;
    normalizedDefenseDiff?: number;
    normalizedGameIqDiff?: number;
    normalizedGkDiff?: number;
    normalizedWinRateDiff?: number;
    normalizedGoalDiffDiff?: number;
    normalizedWeightedAttackDiff?: number;
    normalizedWeightedDefenseDiff?: number;
    normalizedWeightedGameIqDiff?: number;
    normalizedWeightedGkDiff?: number;
    normalizedWeightedWinRateDiff?: number;
    normalizedWeightedGoalDiffDiff?: number;
  };
  comparisonStats?: {
    blue: {
      attack: number;
      defense: number;
      gameIq: number;
      gk: number;
      winRate: number;
      goalDifferential: number;
      playerCount: number;
    };
    orange: {
      attack: number;
      defense: number;
      gameIq: number;
      gk: number;
      winRate: number;
      goalDifferential: number;
      playerCount: number;
    };
    attackDiff: number;
    defenseDiff: number;
    gameIqDiff: number;
    gkDiff: number;
    winRateDiff: number;
    goalDifferentialDiff: number;
    totalDiff: number;
    improvement: number;
  } | null;
  previewSwapStats?: {
    blue: {
      attack: number;
      defense: number;
      gameIq: number;
      gk: number;
      winRate: number;
      goalDifferential: number;
      playerCount: number;
    };
    orange: {
      attack: number;
      defense: number;
      gameIq: number;
      gk: number;
      winRate: number;
      goalDifferential: number;
      playerCount: number;
    };
    attackDiff: number;
    defenseDiff: number;
    gameIqDiff: number;
    gkDiff: number;
    winRateDiff: number;
    goalDifferentialDiff: number;
    totalDiff: number;
    improvement: number;
  } | null;
}

/**
 * TeamStats component displays the statistical information for both teams
 * Shows attack/defense ratings, win rates, and differences between teams
 */
export const TeamStats: React.FC<TeamStatsProps> = ({ blueTeam, orangeTeam, stats, comparisonStats, previewSwapStats }) => {
  // Calculate position category distribution
  const getPositionDistribution = (team: TeamAssignment[] | undefined) => {
    if (!team) return { goalkeepers: 0, defenders: 0, midfielders: 0, attackers: 0 };

    const counts = { goalkeepers: 0, defenders: 0, midfielders: 0, attackers: 0 };

    team.forEach(player => {
      const playerWithPos = player as any;
      if (!playerWithPos.primaryPosition) return;

      const posConfig = POSITION_MAP[playerWithPos.primaryPosition as Position];
      if (!posConfig) return;

      switch (posConfig.category) {
        case 'defense':
          counts.defenders++;
          break;
        case 'midfield':
          counts.midfielders++;
          break;
        case 'attack':
          counts.attackers++;
          break;
      }
    });

    return counts;
  };

  const bluePositions = getPositionDistribution(blueTeam);
  const orangePositions = getPositionDistribution(orangeTeam);

  // Calculate position gaps
  const positionGaps = {
    goalkeepers: Math.abs(bluePositions.goalkeepers - orangePositions.goalkeepers),
    defenders: Math.abs(bluePositions.defenders - orangePositions.defenders),
    midfielders: Math.abs(bluePositions.midfielders - orangePositions.midfielders),
    attackers: Math.abs(bluePositions.attackers - orangePositions.attackers)
  };

  const maxPositionGap = Math.max(
    positionGaps.goalkeepers,
    positionGaps.defenders,
    positionGaps.midfielders,
    positionGaps.attackers
  );

  const hasPositionData = blueTeam && orangeTeam &&
    (bluePositions.goalkeepers + bluePositions.defenders + bluePositions.midfielders + bluePositions.attackers > 0 ||
     orangePositions.goalkeepers + orangePositions.defenders + orangePositions.midfielders + orangePositions.attackers > 0);

  // Format statistics for display with proper handling of null/undefined values
  const formatStat = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return '0.0';
    return value.toFixed(1);
  };
  
  // Format percentage values (like win rates)
  const formatPercentage = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return '0.0%';
    return `${value.toFixed(1)}%`;
  };
  
  // Format goal differential with +/- sign as an integer
  const formatGoalDiff = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    // Round to integer and format with +/- sign
    const intValue = Math.round(value);
    return intValue > 0 ? `+${intValue}` : `${intValue}`;
  };
  
  // Get color class for goal differential
  const getGoalDiffColorClass = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value) || value === 0) return '';
    const intValue = Math.round(value);
    return intValue > 0 ? 'text-success' : 'text-error';
  };

  // Display the stats table with comparison if available
  return (
    <div className="bg-base-100 p-4 rounded-lg border">
      <h3 className="text-lg font-bold mb-4">Team Balance Stats</h3>
      
      {/* Desktop view - full table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="text-blue-500">Blue Team</th>
              <th className="text-orange-500">Orange Team</th>
              <th>Difference</th>
              {comparisonStats && <th>After Swap</th>}
              {previewSwapStats && <th>Preview Swap</th>}
            </tr>
          </thead>
          <tbody>
            {/* Attack Row */}
            <tr>
              <td>Attack Rating</td>
              <td>{formatStat(stats.blue.attack)}</td>
              <td>{formatStat(stats.orange.attack)}</td>
              <td>{formatStat(stats.attackDiff)}</td>
              {comparisonStats && <td>{formatStat(comparisonStats.attackDiff)}</td>}
              {previewSwapStats && <td>{formatStat(previewSwapStats.attackDiff)}</td>}
            </tr>
            
            {/* Defense Row */}
            <tr>
              <td>Defense Rating</td>
              <td>{formatStat(stats.blue.defense)}</td>
              <td>{formatStat(stats.orange.defense)}</td>
              <td>{formatStat(stats.defenseDiff)}</td>
              {comparisonStats && <td>{formatStat(comparisonStats.defenseDiff)}</td>}
              {previewSwapStats && <td>{formatStat(previewSwapStats.defenseDiff)}</td>}
            </tr>
            
            {/* Game IQ Row */}
            <tr>
              <td>Game IQ Rating</td>
              <td>{formatStat(stats.blue.gameIq)}</td>
              <td>{formatStat(stats.orange.gameIq)}</td>
              <td>{formatStat(stats.gameIqDiff)}</td>
              {comparisonStats && <td>{formatStat(comparisonStats.gameIqDiff)}</td>}
              {previewSwapStats && <td>{formatStat(previewSwapStats.gameIqDiff)}</td>}
            </tr>

            {/* GK Row */}
            <tr>
              <td>GK Rating</td>
              <td>{formatStat(stats.blue.gk)}</td>
              <td>{formatStat(stats.orange.gk)}</td>
              <td>{formatStat(stats.gkDiff)}</td>
              {comparisonStats && <td>{formatStat(comparisonStats.gkDiff)}</td>}
              {previewSwapStats && <td>{formatStat(previewSwapStats.gkDiff)}</td>}
            </tr>

            {/* Position Distribution Row */}
            {hasPositionData && (
              <tr className="bg-base-200">
                <td className="font-medium">Position Balance</td>
                <td>
                  <div className="text-xs">
                    {bluePositions.goalkeepers > 0 && <div>🥅 GK: {bluePositions.goalkeepers}</div>}
                    {bluePositions.defenders > 0 && <div>🛡️ DEF: {bluePositions.defenders}</div>}
                    {bluePositions.midfielders > 0 && <div>⚙️ MID: {bluePositions.midfielders}</div>}
                    {bluePositions.attackers > 0 && <div>⚔️ ATK: {bluePositions.attackers}</div>}
                  </div>
                </td>
                <td>
                  <div className="text-xs">
                    {orangePositions.goalkeepers > 0 && <div>🥅 GK: {orangePositions.goalkeepers}</div>}
                    {orangePositions.defenders > 0 && <div>🛡️ DEF: {orangePositions.defenders}</div>}
                    {orangePositions.midfielders > 0 && <div>⚙️ MID: {orangePositions.midfielders}</div>}
                    {orangePositions.attackers > 0 && <div>⚔️ ATK: {orangePositions.attackers}</div>}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">
                      Max gap: {maxPositionGap}
                    </span>
                    {maxPositionGap <= POSITION_THRESHOLDS.MAX_POSITION_GAP ? (
                      <span className="badge badge-success badge-xs">✅ Balanced</span>
                    ) : (
                      <span className="badge badge-error badge-xs">❌ Imbalanced</span>
                    )}
                  </div>
                </td>
                {comparisonStats && <td></td>}
                {previewSwapStats && <td></td>}
              </tr>
            )}

            {/* Win Rate Row */}
            <tr>
              <td>Win Rate</td>
              <td>{formatPercentage(stats.blue.winRate)}</td>
              <td>{formatPercentage(stats.orange.winRate)}</td>
              <td>{formatPercentage(stats.winRateDiff)}</td>
              {comparisonStats && <td>{formatPercentage(comparisonStats.winRateDiff)}</td>}
              {previewSwapStats && <td>{formatPercentage(previewSwapStats.winRateDiff)}</td>}
            </tr>
            
            {/* Goal Differential Row */}
            <tr>
              <td>Goal Differential</td>
              <td className={getGoalDiffColorClass(stats.blue.goalDifferential)}>{formatGoalDiff(stats.blue.goalDifferential)}</td>
              <td className={getGoalDiffColorClass(stats.orange.goalDifferential)}>{formatGoalDiff(stats.orange.goalDifferential)}</td>
              <td>{formatGoalDiff(stats.goalDifferentialDiff)}</td>
              {comparisonStats && <td>{formatGoalDiff(comparisonStats.goalDifferentialDiff)}</td>}
              {previewSwapStats && <td>{formatGoalDiff(previewSwapStats.goalDifferentialDiff)}</td>}
            </tr>
            
            {/* Balance Score Breakdown */}
            <tr className="border-t-2">
              <td colSpan={5} className="pt-4">
                <div className="font-medium text-center mb-2">Balance Score Breakdown (Core Skills 15% each, Performance 20% each)</div>
                <div className="grid grid-cols-6 gap-2">
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-medium">Attack</div>
                    <div className="text-sm">{formatStat(stats.attackDiff * 0.15)}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (stats.normalizedWeightedAttackDiff || 0) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-medium">Defense</div>
                    <div className="text-sm">{formatStat(stats.defenseDiff * 0.15)}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (stats.normalizedWeightedDefenseDiff || 0) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-medium">Game IQ</div>
                    <div className="text-sm">{formatStat(stats.gameIqDiff * 0.15)}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (stats.normalizedWeightedGameIqDiff || 0) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-medium">GK</div>
                    <div className="text-sm">{formatStat(stats.gkDiff * 0.15)}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (stats.normalizedWeightedGkDiff || 0) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-medium">Win Rate</div>
                    <div className="text-sm">{formatStat(stats.winRateDiff * 0.20)}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (stats.normalizedWeightedWinRateDiff || 0) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-medium">Goal Diff</div>
                    <div className="text-sm">{formatStat(stats.goalDifferentialDiff * 0.20)}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (stats.normalizedWeightedGoalDiffDiff || 0) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
            
            {/* Balance Score Row */}
            <tr>
              <td>Balance Score</td>
              <td colSpan={3}>
                <div className="flex items-center">
                  <span className="mr-2 font-bold">{formatStat(stats.currentScore)}</span>
                  <StarRating score={stats.currentScore} />
                </div>
                <div className="text-xs opacity-70 mt-1">Lower is better (0 = perfect balance)</div>
              </td>
              {comparisonStats && (
                <td>
                  <div className="flex items-center">
                    <span className="mr-2 font-bold">{formatStat(comparisonStats.totalDiff)}</span>
                    <StarRating score={comparisonStats.totalDiff} />
                    {comparisonStats.improvement !== 0 && (
                      <span className={`ml-2 text-xs ${comparisonStats.improvement > 0 ? 'text-success' : 'text-error'}`}>
                        {comparisonStats.improvement > 0 
                          ? `(+${formatStat(comparisonStats.improvement)})`
                          : `(${formatStat(comparisonStats.improvement)})`
                        }
                      </span>
                    )}
                  </div>
                </td>
              )}
              {previewSwapStats && (
                <td>
                  <div className="flex items-center">
                    <span className="mr-2 font-bold">{formatStat(previewSwapStats.totalDiff)}</span>
                    <StarRating score={previewSwapStats.totalDiff} />
                    {previewSwapStats.improvement !== 0 && (
                      <span className={`ml-2 text-xs ${previewSwapStats.improvement > 0 ? 'text-success' : 'text-error'}`}>
                        {previewSwapStats.improvement > 0 
                          ? `(+${formatStat(previewSwapStats.improvement)})`
                          : `(${formatStat(previewSwapStats.improvement)})`
                        }
                      </span>
                    )}
                  </div>
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Mobile view - card-based layout */}
      <div className="md:hidden space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <h4 className="font-medium text-blue-700 dark:text-blue-300">Blue Team</h4>
            <p className="text-sm">Attack: {formatStat(stats.blue.attack)}</p>
            <p className="text-sm">Defense: {formatStat(stats.blue.defense)}</p>
            <p className="text-sm">Game IQ: {formatStat(stats.blue.gameIq)}</p>
            <p className="text-sm">GK: {formatStat(stats.blue.gk)}</p>
            <p className="text-sm">Win Rate: {formatStat(stats.blue.winRate)}%</p>
            {hasPositionData && (
              <div className="text-xs mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                <div className="font-medium">Positions:</div>
                {bluePositions.goalkeepers > 0 && <div>🥅 GK: {bluePositions.goalkeepers}</div>}
                {bluePositions.defenders > 0 && <div>🛡️ DEF: {bluePositions.defenders}</div>}
                {bluePositions.midfielders > 0 && <div>⚙️ MID: {bluePositions.midfielders}</div>}
                {bluePositions.attackers > 0 && <div>⚔️ ATK: {bluePositions.attackers}</div>}
              </div>
            )}
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
            <h4 className="font-medium text-orange-700 dark:text-orange-300">Orange Team</h4>
            <p className="text-sm">Attack: {formatStat(stats.orange.attack)}</p>
            <p className="text-sm">Defense: {formatStat(stats.orange.defense)}</p>
            <p className="text-sm">Game IQ: {formatStat(stats.orange.gameIq)}</p>
            <p className="text-sm">GK: {formatStat(stats.orange.gk)}</p>
            <p className="text-sm">Win Rate: {formatStat(stats.orange.winRate)}%</p>
            {hasPositionData && (
              <div className="text-xs mt-2 pt-2 border-t border-orange-200 dark:border-orange-700">
                <div className="font-medium">Positions:</div>
                {orangePositions.goalkeepers > 0 && <div>🥅 GK: {orangePositions.goalkeepers}</div>}
                {orangePositions.defenders > 0 && <div>🛡️ DEF: {orangePositions.defenders}</div>}
                {orangePositions.midfielders > 0 && <div>⚙️ MID: {orangePositions.midfielders}</div>}
                {orangePositions.attackers > 0 && <div>⚔️ ATK: {orangePositions.attackers}</div>}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-base-200 p-3 rounded">
          <h4 className="font-medium">Differences</h4>
          <p className="text-sm">Attack: {formatStat(stats.blue.attack)} | {formatStat(stats.orange.attack)} | Diff: {formatStat(stats.attackDiff)}</p>
          <p className="text-sm">Defense: {formatStat(stats.blue.defense)} | {formatStat(stats.orange.defense)} | Diff: {formatStat(stats.defenseDiff)}</p>
          <p className="text-sm">Game IQ: {formatStat(stats.blue.gameIq)} | {formatStat(stats.orange.gameIq)} | Diff: {formatStat(stats.gameIqDiff)}</p>
          <p className="text-sm">GK: {formatStat(stats.blue.gk)} | {formatStat(stats.orange.gk)} | Diff: {formatStat(stats.gkDiff)}</p>
          <p className="text-sm">Win Rate: {formatPercentage(stats.blue.winRate)} | {formatPercentage(stats.orange.winRate)} | Diff: {formatPercentage(stats.winRateDiff)}</p>
          <p className="text-sm">Goal Diff: {formatGoalDiff(stats.blue.goalDifferential)} | {formatGoalDiff(stats.orange.goalDifferential)} | Diff: {formatGoalDiff(stats.goalDifferentialDiff)}</p>
          {hasPositionData && (
            <div className="mt-2 pt-2 border-t">
              <p className="font-medium text-sm">Position Balance:</p>
              <div className="flex items-center justify-between text-xs mt-1">
                <span>Max gap: {maxPositionGap}</span>
                {maxPositionGap <= POSITION_THRESHOLDS.MAX_POSITION_GAP ? (
                  <span className="badge badge-success badge-xs">✅ Balanced</span>
                ) : (
                  <span className="badge badge-error badge-xs">❌ Imbalanced</span>
                )}
              </div>
            </div>
          )}
          <div className="mt-2 pt-2 border-t">
            <div className="flex justify-between items-center">
              <p className="font-medium">Balance Score:</p>
              <div className="flex items-center">
                <span className="mr-2">{formatStat(stats.currentScore)}</span>
                <StarRating score={stats.currentScore} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Comparison stats for mobile */}
        {comparisonStats && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
            <h4 className="font-medium text-green-700 dark:text-green-300">After Swap</h4>
            <p className="text-sm">Attack Diff: {formatStat(comparisonStats.attackDiff)}</p>
            <p className="text-sm">Defense Diff: {formatStat(comparisonStats.defenseDiff)}</p>
            <p className="text-sm">Game IQ Diff: {formatStat(comparisonStats.gameIqDiff)}</p>
            <p className="text-sm">GK Diff: {formatStat(comparisonStats.gkDiff)}</p>
            <p className="text-sm">Win Rate Diff: {formatStat(comparisonStats.winRateDiff)}%</p>
            <p className="text-sm">Goal Diff: {formatStat(comparisonStats.goalDifferentialDiff)}</p>
            <div className="mt-2 pt-2 border-t">
              <div className="flex justify-between items-center">
                <p className="font-medium">New Score:</p>
                <div className="flex items-center">
                  <span className="mr-2">{formatStat(comparisonStats.totalDiff)}</span>
                  <StarRating score={comparisonStats.totalDiff} />
                </div>
              </div>
              {comparisonStats.improvement !== 0 && (
                <p className={`text-xs ${comparisonStats.improvement > 0 ? 'text-success' : 'text-error'}`}>
                  {comparisonStats.improvement > 0 
                    ? `Improved by ${formatStat(comparisonStats.improvement)}`
                    : `Worsened by ${formatStat(Math.abs(comparisonStats.improvement))}`
                  }
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Preview stats for mobile */}
        {previewSwapStats && (
          <div className="bg-purple-500 p-3 rounded">
            <h4 className="font-medium text-white">Preview Swap</h4>
            <p className="text-sm text-white">Attack Diff: {formatStat(previewSwapStats.attackDiff)}</p>
            <p className="text-sm text-white">Defense Diff: {formatStat(previewSwapStats.defenseDiff)}</p>
            <p className="text-sm text-white">Game IQ Diff: {formatStat(previewSwapStats.gameIqDiff)}</p>
            <p className="text-sm text-white">GK Diff: {formatStat(previewSwapStats.gkDiff)}</p>
            <p className="text-sm text-white">Win Rate Diff: {formatStat(previewSwapStats.winRateDiff)}%</p>
            <p className="text-sm text-white">Goal Diff: {formatStat(previewSwapStats.goalDifferentialDiff)}</p>
            <div className="mt-2 pt-2 border-t border-white">
              <div className="flex justify-between items-center">
                <p className="font-medium text-white">New Score:</p>
                <div className="flex items-center">
                  <span className="mr-2 text-white">{formatStat(previewSwapStats.totalDiff)}</span>
                  <StarRating score={previewSwapStats.totalDiff} />
                </div>
              </div>
              {previewSwapStats.improvement !== 0 && (
                <p className={`text-xs text-white`}>
                  {previewSwapStats.improvement > 0 
                    ? `Improved by ${formatStat(previewSwapStats.improvement)}`
                    : `Worsened by ${formatStat(Math.abs(previewSwapStats.improvement))}`
                  }
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-sm opacity-70">
        {(comparisonStats || previewSwapStats) && <p>Improvement shows how much better the balance would be after the swap</p>}
      </div>
    </div>
  );
};
