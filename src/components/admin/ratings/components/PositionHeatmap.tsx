/**
 * PositionHeatmap Component
 *
 * Displays a comprehensive heatmap visualization of position consensus across all players.
 * Shows which positions each player is rated for and the strength of the consensus.
 *
 * Features:
 * - Rows: Players (sorted by name)
 * - Columns: All 12 positions grouped by category
 * - Cell colors: Gradient based on consensus percentage (0-100%)
 * - Tooltips: Show detailed breakdown (rating count, total raters, rank counts)
 * - Responsive design with horizontal scroll for large datasets
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types';
import { POSITION_CONFIGS } from '../../../../constants/positions';
import { Position, PositionCategory } from '../../../../types/positions';

interface PositionHeatmapProps {
  players: Player[];
  onPlayerSelect?: (playerId: string) => void;
  selectedPlayerId?: string | null;
}

export const PositionHeatmap: React.FC<PositionHeatmapProps> = ({
  players,
  onPlayerSelect,
  selectedPlayerId
}) => {
  // Group positions by category for better organization
  const positionsByCategory = useMemo(() => {
    const grouped = new Map<PositionCategory, Position[]>();
    POSITION_CONFIGS.forEach(config => {
      const existing = grouped.get(config.category) || [];
      grouped.set(config.category, [...existing, config.code]);
    });
    return grouped;
  }, []);

  // Get category display info
  const categoryInfo = {
    goalkeeper: { emoji: '🥅', label: 'GK' },
    defense: { emoji: '🛡️', label: 'Defense' },
    midfield: { emoji: '⚙️', label: 'Midfield' },
    attack: { emoji: '⚔️', label: 'Attack' }
  };

  // Get color based on consensus percentage
  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 75) return 'bg-success text-success-content';
    if (percentage >= 50) return 'bg-primary text-primary-content';
    if (percentage >= 25) return 'bg-warning text-warning-content';
    if (percentage > 0) return 'bg-info text-info-content';
    return 'bg-base-300 text-base-content/30';
  };

  // Get opacity based on percentage for subtle gradient
  const getOpacity = (percentage: number): number => {
    if (percentage === 0) return 0.2;
    return 0.3 + (percentage / 100) * 0.7; // Range from 0.3 to 1.0
  };

  // Sort players alphabetically
  const sortedPlayers = useMemo(() =>
    [...players].sort((a, b) => a.friendly_name.localeCompare(b.friendly_name)),
    [players]
  );

  // Get consensus percentage for a player at a specific position
  const getConsensusPercentage = (player: Player, position: Position): number => {
    const consensus = player.position_consensus?.find(pc => pc.position === position);
    return consensus?.percentage ?? 0;
  };

  // Get consensus data for tooltip
  const getConsensusData = (player: Player, position: Position) => {
    return player.position_consensus?.find(pc => pc.position === position);
  };

  if (sortedPlayers.length === 0) {
    return (
      <div className="bg-base-200 rounded-lg p-6 text-center">
        <p className="text-base-content/70">No players with position data to display</p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Position Consensus Heatmap</h3>
        <p className="text-sm text-base-content/70 mt-1">
          Shows position consensus strength for all players. Darker colors indicate stronger consensus.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-xs w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-base-200">Player</th>
              {Array.from(positionsByCategory.entries()).map(([category, positions]) => (
                <React.Fragment key={category}>
                  <th colSpan={positions.length} className="text-center bg-base-300">
                    {categoryInfo[category].emoji} {categoryInfo[category].label}
                  </th>
                </React.Fragment>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-base-200"></th>
              {Array.from(positionsByCategory.values()).flatMap(positions =>
                positions.map(pos => (
                  <th key={pos} className="text-center text-xs">
                    {pos}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => {
              const hasSufficientData = player.position_consensus && player.position_consensus.length > 0 &&
                                        player.position_consensus[0].total_raters >= 5;

              return (
                <motion.tr
                  key={player.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`hover cursor-pointer ${
                    selectedPlayerId === player.id ? 'bg-primary/20' : ''
                  }`}
                  onClick={() => onPlayerSelect?.(player.id)}
                >
                  <td className="sticky left-0 z-10 bg-base-200 font-medium">
                    {player.friendly_name}
                    {!hasSufficientData && (
                      <span className="ml-2 text-xs text-base-content/50">
                        (need {player.position_consensus?.[0]?.total_raters
                          ? 5 - player.position_consensus[0].total_raters
                          : 5} more)
                      </span>
                    )}
                  </td>
                  {Array.from(positionsByCategory.values()).flatMap(positions =>
                    positions.map(pos => {
                      const percentage = getConsensusPercentage(player, pos);
                      const consensusData = getConsensusData(player, pos);

                      return (
                        <td
                          key={pos}
                          className={`text-center text-xs font-medium ${getPercentageColor(percentage)}`}
                          style={{ opacity: getOpacity(percentage) }}
                          title={
                            consensusData
                              ? `${pos}: ${percentage.toFixed(0)}% consensus\n` +
                                `${consensusData.rating_count}/${consensusData.total_raters} raters\n` +
                                `🥇 ${consensusData.rank_1_count} | 🥈 ${consensusData.rank_2_count} | 🥉 ${consensusData.rank_3_count}`
                              : hasSufficientData
                              ? `${pos}: No ratings`
                              : 'Insufficient data (<5 raters)'
                          }
                        >
                          {percentage > 0 ? `${percentage.toFixed(0)}%` : '-'}
                        </td>
                      );
                    })
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-success"></div>
          <span>75%+ Primary</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-primary"></div>
          <span>50-74% Primary</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-warning"></div>
          <span>25-49% Secondary</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-info"></div>
          <span>&lt;25% Mentioned</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-base-300"></div>
          <span>Not rated</span>
        </div>
      </div>
    </div>
  );
};
