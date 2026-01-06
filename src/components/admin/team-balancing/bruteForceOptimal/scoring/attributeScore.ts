import type { BruteForcePlayer } from '../types';

const ATTRIBUTE_NAMES = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const;
type AttributeName = (typeof ATTRIBUTE_NAMES)[number];

/**
 * Calculate the average of a numeric array
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate the attribute balance score
 * Measures the difference in derived attributes (pace, shooting, etc.) between teams
 *
 * Returns: A normalized score where 0 = perfect balance, higher = worse
 */
export function calculateAttributeScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): number {
  let totalDiff = 0;

  for (const attr of ATTRIBUTE_NAMES) {
    const blueAvg = average(blueTeam.map((p) => p.attributes[attr]));
    const orangeAvg = average(orangeTeam.map((p) => p.attributes[attr]));
    totalDiff += Math.abs(blueAvg - orangeAvg);
  }

  // Attributes are 0-1, so max diff per attribute is 1
  // Average across all attributes (already normalized)
  return totalDiff / ATTRIBUTE_NAMES.length;
}

/**
 * Get detailed attribute breakdown for debugging
 */
export function getAttributeBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): {
  blue: Record<AttributeName, number>;
  orange: Record<AttributeName, number>;
  gaps: Record<AttributeName, number>;
} {
  const blue: Record<AttributeName, number> = {
    pace: 0,
    shooting: 0,
    passing: 0,
    dribbling: 0,
    defending: 0,
    physical: 0,
  };

  const orange: Record<AttributeName, number> = {
    pace: 0,
    shooting: 0,
    passing: 0,
    dribbling: 0,
    defending: 0,
    physical: 0,
  };

  const gaps: Record<AttributeName, number> = {
    pace: 0,
    shooting: 0,
    passing: 0,
    dribbling: 0,
    defending: 0,
    physical: 0,
  };

  for (const attr of ATTRIBUTE_NAMES) {
    blue[attr] = average(blueTeam.map((p) => p.attributes[attr]));
    orange[attr] = average(orangeTeam.map((p) => p.attributes[attr]));
    gaps[attr] = Math.abs(blue[attr] - orange[attr]);
  }

  return { blue, orange, gaps };
}
