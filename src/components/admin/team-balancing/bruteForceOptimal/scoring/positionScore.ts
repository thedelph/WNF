import type { BruteForcePlayer, PositionCategory, POSITION_CATEGORIES } from '../types';

// Re-export for convenience
const POSITION_TO_CATEGORY: Record<string, PositionCategory> = {
  // Defenders
  LB: 'DEF',
  CB: 'DEF',
  RB: 'DEF',
  // Midfielders (including wing-backs and wide mids)
  LWB: 'MID',
  RWB: 'MID',
  CDM: 'MID',
  CM: 'MID',
  CAM: 'MID',
  LW: 'MID',
  RW: 'MID',
  // Attackers
  ST: 'ATT',
};

/**
 * Get position category (DEF, MID, ATT) from specific position
 */
function getPositionCategory(position: string): PositionCategory | null {
  return POSITION_TO_CATEGORY[position] ?? null;
}

/**
 * Count players in each position category for a team
 */
function countPositionCategories(
  team: BruteForcePlayer[]
): { DEF: number; MID: number; ATT: number } {
  const counts = { DEF: 0, MID: 0, ATT: 0 };

  team.forEach((player) => {
    if (player.primaryPosition) {
      const category = getPositionCategory(player.primaryPosition);
      if (category) {
        counts[category]++;
      }
    }
  });

  return counts;
}

/**
 * Count strikers in a team
 */
function countStrikers(team: BruteForcePlayer[]): number {
  return team.filter((p) => p.primaryPosition === 'ST').length;
}

/**
 * Calculate the position balance score
 * Measures striker distribution and position category coverage
 *
 * Returns: A normalized score where 0 = perfect balance, higher = worse
 */
export function calculatePositionScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): number {
  // Striker balance - most important (all strikers on one team is bad)
  const blueST = countStrikers(blueTeam);
  const orangeST = countStrikers(orangeTeam);
  const stImbalance = Math.abs(blueST - orangeST);

  // Position category coverage
  const blueCounts = countPositionCategories(blueTeam);
  const orangeCounts = countPositionCategories(orangeTeam);

  // Calculate coverage imbalance for each category
  const defImbalance = Math.abs(blueCounts.DEF - orangeCounts.DEF);
  const midImbalance = Math.abs(blueCounts.MID - orangeCounts.MID);
  const attImbalance = Math.abs(blueCounts.ATT - orangeCounts.ATT);

  // Penalize if a team lacks players in a category entirely
  const blueMissingCategories =
    (blueCounts.DEF === 0 ? 1 : 0) +
    (blueCounts.MID === 0 ? 1 : 0) +
    (blueCounts.ATT === 0 ? 1 : 0);
  const orangeMissingCategories =
    (orangeCounts.DEF === 0 ? 1 : 0) +
    (orangeCounts.MID === 0 ? 1 : 0) +
    (orangeCounts.ATT === 0 ? 1 : 0);

  // Combine scores with weights
  // ST imbalance is heavily weighted (max ~3 strikers per team in 9v9)
  const stScore = stImbalance / 3;

  // Category imbalance (max ~9 players in a category)
  const categoryScore = (defImbalance + midImbalance + attImbalance) / (3 * 9);

  // Missing category penalty (max 3 categories)
  const missingScore = (blueMissingCategories + orangeMissingCategories) / 6;

  // Weight: 60% striker balance, 25% category balance, 15% missing categories
  return stScore * 0.6 + categoryScore * 0.25 + missingScore * 0.15;
}

/**
 * Get detailed position breakdown for debugging
 */
export function getPositionBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): {
  blue: { DEF: number; MID: number; ATT: number; strikers: number };
  orange: { DEF: number; MID: number; ATT: number; strikers: number };
  gaps: { DEF: number; MID: number; ATT: number; strikers: number };
} {
  const blueCounts = countPositionCategories(blueTeam);
  const orangeCounts = countPositionCategories(orangeTeam);
  const blueST = countStrikers(blueTeam);
  const orangeST = countStrikers(orangeTeam);

  return {
    blue: { ...blueCounts, strikers: blueST },
    orange: { ...orangeCounts, strikers: orangeST },
    gaps: {
      DEF: Math.abs(blueCounts.DEF - orangeCounts.DEF),
      MID: Math.abs(blueCounts.MID - orangeCounts.MID),
      ATT: Math.abs(blueCounts.ATT - orangeCounts.ATT),
      strikers: Math.abs(blueST - orangeST),
    },
  };
}
