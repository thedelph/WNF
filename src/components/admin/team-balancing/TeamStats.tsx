import React from 'react';
import { StarRating } from './StarRating';

export interface TeamStatsProps {
  stats: {
    blue: {
      attack: number;
      defense: number;
      winRate: number;
      playerCount: number;
    };
    orange: {
      attack: number;
      defense: number;
      winRate: number;
      playerCount: number;
    };
    attackDiff: number;
    defenseDiff: number;
    winRateDiff: number;
    currentScore: number;
  };
  comparisonStats?: {
    blue: {
      attack: number;
      defense: number;
      winRate: number;
      playerCount: number;
    };
    orange: {
      attack: number;
      defense: number;
      winRate: number;
      playerCount: number;
    };
    attackDiff: number;
    defenseDiff: number;
    winRateDiff: number;
    totalDiff: number;
    improvement: number;
  } | null;
  previewSwapStats?: {
    blue: {
      attack: number;
      defense: number;
      winRate: number;
      playerCount: number;
    };
    orange: {
      attack: number;
      defense: number;
      winRate: number;
      playerCount: number;
    };
    attackDiff: number;
    defenseDiff: number;
    winRateDiff: number;
    totalDiff: number;
    improvement: number;
  } | null;
}

/**
 * TeamStats component displays the statistical information for both teams
 * Shows attack/defense ratings, win rates, and differences between teams
 */
export const TeamStats: React.FC<TeamStatsProps> = ({ stats, comparisonStats, previewSwapStats }) => {
  const formatStat = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.0';
    return value.toFixed(1);
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
            
            {/* Win Rate Row */}
            <tr>
              <td>Win Rate</td>
              <td>{formatStat(stats.blue.winRate)}%</td>
              <td>{formatStat(stats.orange.winRate)}%</td>
              <td>{formatStat(stats.winRateDiff)}%</td>
              {comparisonStats && <td>{formatStat(comparisonStats.winRateDiff)}%</td>}
              {previewSwapStats && <td>{formatStat(previewSwapStats.winRateDiff)}%</td>}
            </tr>
            
            {/* Overall Score Row */}
            <tr className="font-bold">
              <td>Balance Score</td>
              <td colSpan={2}>
                <div className="flex items-center">
                  <span className="mr-2">{formatStat(stats.currentScore)}</span>
                  <StarRating score={stats.currentScore} />
                </div>
              </td>
              <td>-</td>
              {comparisonStats && (
                <td>
                  <div className="flex items-center">
                    <span className="mr-2">{formatStat(comparisonStats.totalDiff)}</span>
                    <StarRating score={comparisonStats.totalDiff} />
                    <span className="ml-2 text-xs text-success">
                      {comparisonStats.improvement > 0 
                        ? `Improved by ${formatStat(comparisonStats.improvement)}`
                        : comparisonStats.improvement < 0
                          ? `Worsened by ${formatStat(Math.abs(comparisonStats.improvement))}`
                          : 'No change'
                      }
                    </span>
                  </div>
                </td>
              )}
              {previewSwapStats && (
                <td>
                  <div className="flex items-center">
                    <span className="mr-2">{formatStat(previewSwapStats.totalDiff)}</span>
                    <StarRating score={previewSwapStats.totalDiff} />
                    <span className="ml-2 text-xs text-success">
                      {previewSwapStats.improvement > 0 
                        ? `Improved by ${formatStat(previewSwapStats.improvement)}`
                        : previewSwapStats.improvement < 0
                          ? `Worsened by ${formatStat(Math.abs(previewSwapStats.improvement))}`
                          : 'No change'
                      }
                    </span>
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
          <div className="bg-blue-50 p-3 rounded">
            <h4 className="font-medium text-blue-700">Blue Team</h4>
            <p className="text-sm">Attack: {formatStat(stats.blue.attack)}</p>
            <p className="text-sm">Defense: {formatStat(stats.blue.defense)}</p>
            <p className="text-sm">Win Rate: {formatStat(stats.blue.winRate)}%</p>
          </div>
          
          <div className="bg-orange-50 p-3 rounded">
            <h4 className="font-medium text-orange-700">Orange Team</h4>
            <p className="text-sm">Attack: {formatStat(stats.orange.attack)}</p>
            <p className="text-sm">Defense: {formatStat(stats.orange.defense)}</p>
            <p className="text-sm">Win Rate: {formatStat(stats.orange.winRate)}%</p>
          </div>
        </div>
        
        <div className="bg-base-200 p-3 rounded">
          <h4 className="font-medium">Differences</h4>
          <p className="text-sm">Attack Diff: {formatStat(stats.attackDiff)}</p>
          <p className="text-sm">Defense Diff: {formatStat(stats.defenseDiff)}</p>
          <p className="text-sm">Win Rate Diff: {formatStat(stats.winRateDiff)}%</p>
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
          <div className="bg-green-50 p-3 rounded">
            <h4 className="font-medium text-green-700">After Swap</h4>
            <p className="text-sm">Attack Diff: {formatStat(comparisonStats.attackDiff)}</p>
            <p className="text-sm">Defense Diff: {formatStat(comparisonStats.defenseDiff)}</p>
            <p className="text-sm">Win Rate Diff: {formatStat(comparisonStats.winRateDiff)}%</p>
            <div className="mt-2 pt-2 border-t">
              <div className="flex justify-between items-center">
                <p className="font-medium">New Score:</p>
                <div className="flex items-center">
                  <span className="mr-2">{formatStat(comparisonStats.totalDiff)}</span>
                  <StarRating score={comparisonStats.totalDiff} />
                </div>
              </div>
              <p className="text-xs text-green-700 mt-1">
                {comparisonStats.improvement > 0 
                  ? `Improved by ${formatStat(comparisonStats.improvement)}`
                  : comparisonStats.improvement < 0
                    ? `Worsened by ${formatStat(Math.abs(comparisonStats.improvement))}`
                    : 'No change'
                }
              </p>
            </div>
          </div>
        )}
        
        {/* Preview stats for mobile */}
        {previewSwapStats && (
          <div className="bg-purple-500 p-3 rounded">
            <h4 className="font-medium text-white">Preview Swap</h4>
            <p className="text-sm text-white">Attack Diff: {formatStat(previewSwapStats.attackDiff)}</p>
            <p className="text-sm text-white">Defense Diff: {formatStat(previewSwapStats.defenseDiff)}</p>
            <p className="text-sm text-white">Win Rate Diff: {formatStat(previewSwapStats.winRateDiff)}%</p>
            <div className="mt-2 pt-2 border-t border-white">
              <div className="flex justify-between items-center">
                <p className="font-medium text-white">New Score:</p>
                <div className="flex items-center">
                  <span className="mr-2 text-white">{formatStat(previewSwapStats.totalDiff)}</span>
                  <StarRating score={previewSwapStats.totalDiff} />
                </div>
              </div>
              <p className="text-xs text-white mt-1">
                {previewSwapStats.improvement > 0 
                  ? `Improved by ${formatStat(previewSwapStats.improvement)}`
                  : previewSwapStats.improvement < 0
                    ? `Worsened by ${formatStat(Math.abs(previewSwapStats.improvement))}`
                    : 'No change'
                }
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-sm opacity-70">
        <p>Lower balance score is better (0 = perfect balance)</p>
        {(comparisonStats || previewSwapStats) && <p>Improvement shows how much better the balance would be after the swap</p>}
      </div>
    </div>
  );
};
