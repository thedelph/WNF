/**
 * Position Balancing Utilities for Team Balancing Algorithm
 *
 * Provides functions to check and enforce position balance between teams.
 * Prevents tactical imbalances like having multiple strikers on one team.
 */

import { Position, PositionConsensus } from '../types/positions';
import {
  classifyPositions,
  getPrimaryPosition,
  comparePositionBalance
} from './positionClassifier';
import { POSITION_THRESHOLDS } from '../constants/positions';

/**
 * Player type with position consensus data
 * Minimal interface for position balancing
 */
export interface PlayerWithPositions {
  id: string;
  friendly_name: string;
  positions?: PositionConsensus[];
  primaryPosition?: Position | null;
}

/**
 * Attach primary positions to players
 * Calculates the single highest-rated position for each player
 *
 * @param players - Array of players with position consensus data
 * @returns Same players with primaryPosition field populated
 */
export function attachPrimaryPositions<T extends PlayerWithPositions>(
  players: T[]
): T[] {
  return players.map(player => ({
    ...player,
    primaryPosition: player.positions && player.positions.length > 0
      ? getPrimaryPosition(player.positions)
      : null
  }));
}

/**
 * Check if position balance constraint is satisfied
 * Hard constraint: no more than 2 player gap in any category
 *
 * @param blueTeam - Blue team players
 * @param orangeTeam - Orange team players
 * @param debugLog - Optional debug logging reference
 * @returns True if balanced, false if gap > 2 in any category
 */
export function checkPositionBalanceConstraint(
  blueTeam: PlayerWithPositions[],
  orangeTeam: PlayerWithPositions[],
  debugLog?: { value: string }
): boolean {
  const comparison = comparePositionBalance(blueTeam, orangeTeam);

  if (!comparison.isBalanced) {
    if (debugLog) {
      debugLog.value += `\n❌ POSITION BALANCE CONSTRAINT VIOLATED:\n`;
      debugLog.value += `  Max gap: ${comparison.maxGap} (limit: ${POSITION_THRESHOLDS.MAX_POSITION_GAP})\n`;
      debugLog.value += `  Imbalanced categories: ${comparison.imbalancedCategories.join(', ')}\n`;
      debugLog.value += `  Distribution:\n`;
      debugLog.value += `    Goalkeepers: Blue ${comparison.goalkeepers.blue} vs Orange ${comparison.goalkeepers.orange} (gap: ${comparison.goalkeepers.gap})\n`;
      debugLog.value += `    Defenders: Blue ${comparison.defenders.blue} vs Orange ${comparison.defenders.orange} (gap: ${comparison.defenders.gap})\n`;
      debugLog.value += `    Midfielders: Blue ${comparison.midfielders.blue} vs Orange ${comparison.midfielders.orange} (gap: ${comparison.midfielders.gap})\n`;
      debugLog.value += `    Attackers: Blue ${comparison.attackers.blue} vs Orange ${comparison.attackers.orange} (gap: ${comparison.attackers.gap})\n`;
    }
    return false;
  }

  if (debugLog) {
    debugLog.value += `\n✅ Position balance OK (max gap: ${comparison.maxGap})\n`;
  }

  return true;
}

/**
 * Evaluate if a swap would violate position balance
 * Used in swap acceptability checking
 *
 * @param blueTeamBefore - Blue team before swap
 * @param orangeTeamBefore - Orange team before swap
 * @param blueTeamAfter - Blue team after swap
 * @param orangeTeamAfter - Orange team after swap
 * @returns Object with acceptable flag and rejection reason
 */
export function evaluateSwapPositionImpact(
  blueTeamBefore: PlayerWithPositions[],
  orangeTeamBefore: PlayerWithPositions[],
  blueTeamAfter: PlayerWithPositions[],
  orangeTeamAfter: PlayerWithPositions[]
): { acceptable: boolean; rejectReason?: string } {
  const comparisonBefore = comparePositionBalance(blueTeamBefore, orangeTeamBefore);
  const comparisonAfter = comparePositionBalance(blueTeamAfter, orangeTeamAfter);

  // HARD CONSTRAINT: Block if swap creates or worsens position imbalance
  if (!comparisonAfter.isBalanced) {
    // If position was already imbalanced, allow swap if it improves the situation
    if (!comparisonBefore.isBalanced && comparisonAfter.maxGap < comparisonBefore.maxGap) {
      return { acceptable: true };
    }

    return {
      acceptable: false,
      rejectReason: `Position imbalance: ${comparisonAfter.imbalancedCategories.join(', ')} (max gap: ${comparisonAfter.maxGap})`
    };
  }

  return { acceptable: true };
}

/**
 * Get position distribution summary for debug logging
 *
 * @param team - Team to summarize
 * @param teamName - Team name for display
 * @returns Formatted string showing position distribution
 */
export function getPositionDistributionSummary(
  team: PlayerWithPositions[],
  teamName: string
): string {
  const withPositions = team.filter(p => p.primaryPosition);
  const withoutPositions = team.length - withPositions.length;

  if (withPositions.length === 0) {
    return `${teamName}: No position data available`;
  }

  const positionCounts: Record<string, number> = {};
  withPositions.forEach(player => {
    const pos = player.primaryPosition!;
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
  });

  const positionList = Object.entries(positionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([pos, count]) => `${count}×${pos}`)
    .join(', ');

  return `${teamName}: ${positionList}${withoutPositions > 0 ? ` (${withoutPositions} unknown)` : ''}`;
}

/**
 * Check if team has sufficient position data for balancing
 * Requires at least 50% of team to have position ratings
 *
 * @param team - Team to check
 * @returns True if sufficient data exists
 */
export function hasSufficientPositionData(team: PlayerWithPositions[]): boolean {
  const withPositions = team.filter(p => p.positions && p.positions.length > 0 &&
    (p.positions[0]?.total_raters || 0) >= POSITION_THRESHOLDS.MIN_RATERS);

  return withPositions.length >= team.length * 0.5;
}

/**
 * Log position balance status for debugging
 *
 * @param blueTeam - Blue team
 * @param orangeTeam - Orange team
 * @param debugLog - Debug log reference
 */
export function logPositionBalanceStatus(
  blueTeam: PlayerWithPositions[],
  orangeTeam: PlayerWithPositions[],
  debugLog: { value: string }
): void {
  debugLog.value += `\n═══════════════════════════════════════════════════\n`;
  debugLog.value += `POSITION BALANCE STATUS\n`;
  debugLog.value += `═══════════════════════════════════════════════════\n`;

  const blueSufficient = hasSufficientPositionData(blueTeam);
  const orangeSufficient = hasSufficientPositionData(orangeTeam);

  if (!blueSufficient || !orangeSufficient) {
    debugLog.value += `⚠️  Insufficient position data for balancing\n`;
    debugLog.value += `   Blue: ${blueTeam.filter(p => p.primaryPosition).length}/${blueTeam.length} players with positions\n`;
    debugLog.value += `   Orange: ${orangeTeam.filter(p => p.primaryPosition).length}/${orangeTeam.length} players with positions\n`;
    debugLog.value += `   (Need 50% coverage to enforce constraints)\n`;
    return;
  }

  debugLog.value += `${getPositionDistributionSummary(blueTeam, 'Blue Team')}\n`;
  debugLog.value += `${getPositionDistributionSummary(orangeTeam, 'Orange Team')}\n`;

  const comparison = comparePositionBalance(blueTeam, orangeTeam);
  debugLog.value += `\nBalance Check:\n`;
  debugLog.value += `  Goalkeepers: ${comparison.goalkeepers.gap} gap ${comparison.goalkeepers.gap <= POSITION_THRESHOLDS.MAX_POSITION_GAP ? '✅' : '❌'}\n`;
  debugLog.value += `  Defenders: ${comparison.defenders.gap} gap ${comparison.defenders.gap <= POSITION_THRESHOLDS.MAX_POSITION_GAP ? '✅' : '❌'}\n`;
  debugLog.value += `  Midfielders: ${comparison.midfielders.gap} gap ${comparison.midfielders.gap <= POSITION_THRESHOLDS.MAX_POSITION_GAP ? '✅' : '❌'}\n`;
  debugLog.value += `  Attackers: ${comparison.attackers.gap} gap ${comparison.attackers.gap <= POSITION_THRESHOLDS.MAX_POSITION_GAP ? '✅' : '❌'}\n`;
  debugLog.value += `\nOverall: ${comparison.isBalanced ? '✅ BALANCED' : `❌ IMBALANCED (${comparison.imbalancedCategories.join(', ')})`}\n`;
}
