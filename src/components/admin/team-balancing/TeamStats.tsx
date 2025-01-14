import React from 'react';

interface TeamStatsProps {
  stats: {
    blue: {
      attackTotal: number;
      defenseTotal: number;
      playerCount: number;
    };
    orange: {
      attackTotal: number;
      defenseTotal: number;
      playerCount: number;
    };
    attackDiff: number;
    defenseDiff: number;
  };
}

/**
 * TeamStats component displays the statistical information for both teams
 * Shows attack/defense ratings and differences between teams
 */
export const TeamStats: React.FC<TeamStatsProps> = ({ stats }) => {
  const formatStat = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.0';
    return value.toFixed(1);
  };

  const calculateAverage = (total: number, count: number) => {
    if (count === 0) return 0;
    return total / count;
  };

  const renderDiffIndicator = (diff: number) => {
    if (diff === 0) return null;
    const color = diff < 5 ? 'text-success' : diff < 10 ? 'text-warning' : 'text-error';
    return <span className={`${color} ml-2`}>Diff: {formatStat(diff)}</span>;
  };

  return (
    <div className="bg-base-200 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Team Comparison</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blue Team Stats */}
        <div className="space-y-2">
          <h4 className="font-medium">Blue Team ({stats.blue.playerCount} Players)</h4>
          <div>
            <p className="text-sm">
              Attack: {formatStat(stats.blue.attackTotal)} 
              (Avg: {formatStat(calculateAverage(stats.blue.attackTotal, stats.blue.playerCount))})
            </p>
            <p className="text-sm">
              Defense: {formatStat(stats.blue.defenseTotal)}
              (Avg: {formatStat(calculateAverage(stats.blue.defenseTotal, stats.blue.playerCount))})
            </p>
          </div>
        </div>

        {/* Orange Team Stats */}
        <div className="space-y-2">
          <h4 className="font-medium">Orange Team ({stats.orange.playerCount} Players)</h4>
          <div>
            <p className="text-sm">
              Attack: {formatStat(stats.orange.attackTotal)}
              (Avg: {formatStat(calculateAverage(stats.orange.attackTotal, stats.orange.playerCount))})
            </p>
            <p className="text-sm">
              Defense: {formatStat(stats.orange.defenseTotal)}
              (Avg: {formatStat(calculateAverage(stats.orange.defenseTotal, stats.orange.playerCount))})
            </p>
          </div>
        </div>

        {/* Differences */}
        <div className="md:col-span-2 mt-4 p-3 bg-base-300 rounded">
          <h4 className="font-medium mb-2">Team Balance</h4>
          <div className="space-y-1">
            <p className="text-sm">
              Attack Balance {renderDiffIndicator(stats.attackDiff)}
            </p>
            <p className="text-sm">
              Defense Balance {renderDiffIndicator(stats.defenseDiff)}
            </p>
            <p className="text-sm">
              Size Difference: {Math.abs(stats.blue.playerCount - stats.orange.playerCount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
